import Foundation
import PTPROCore

struct AuthSession: Codable, Sendable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
    var user: AuthUser

    enum CodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
        case expiresIn
        case expiresAt
        case user
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try values.decode(String.self, forKey: .accessToken)
        refreshToken = try values.decode(String.self, forKey: .refreshToken)
        if let epoch = try values.decodeIfPresent(Double.self, forKey: .expiresAt) {
            expiresAt = Date(timeIntervalSince1970: epoch)
        } else {
            let expiresIn = try values.decode(Double.self, forKey: .expiresIn)
            expiresAt = Date().addingTimeInterval(expiresIn)
        }
        user = try values.decode(AuthUser.self, forKey: .user)
    }

    func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(accessToken, forKey: .accessToken)
        try values.encode(refreshToken, forKey: .refreshToken)
        try values.encode(expiresAt.timeIntervalSince1970, forKey: .expiresAt)
        try values.encode(user, forKey: .user)
    }
}

struct AuthUser: Codable, Sendable { var id: UUID; var email: String? }

actor SupabaseGateway {
    private let configuration: AppConfiguration
    private let keychain = KeychainStore(service: "it.ptpro.mobile.auth")
    private var authSession: AuthSession?

    init(configuration: AppConfiguration) { self.configuration = configuration }

    var userID: UUID? { authSession?.user.id }

    func restoreSession() throws -> Bool {
        guard let data = try keychain.read(account: "session") else { return false }
        authSession = try JSONDecoder.ptpro.decode(AuthSession.self, from: data)
        return true
    }

    func signIn(email: String, password: String) async throws {
        let body = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])
        let session: AuthSession = try await request(
            path: "/auth/v1/token", query: [URLQueryItem(name: "grant_type", value: "password")],
            method: "POST", body: body, authenticated: false
        )
        authSession = session
        try keychain.save(JSONEncoder.ptpro.encode(session), account: "session")
    }

    func signOut() {
        authSession = nil
        keychain.delete(account: "session")
    }

    func ingest(_ envelope: SyncEnvelope) async throws {
        guard let sessionID = envelope.sessionID else {
            throw GatewayError.requestFailed("Evento Watch privo della sessione PT-PRO.")
        }
        let payloadObject = try JSONSerialization.jsonObject(with: envelope.payload)
        let object: [String: Any] = [
            "p_event_id": envelope.eventID.uuidString.lowercased(),
            "p_session_id": sessionID.uuidString.lowercased(),
            "p_event_type": envelope.eventType.rawValue,
            "p_occurred_at": ISO8601DateFormatter().string(from: envelope.occurredAt),
            "p_payload": payloadObject
        ]
        let body = try JSONSerialization.data(withJSONObject: object)
        let _: IngestResponse = try await request(path: "/rest/v1/rpc/ptpro_ingest_watch_event", method: "POST", body: body)
    }

    func loadActiveWorkout() async throws -> WorkoutSnapshot? {
        guard let athleteID = authSession?.user.id else { throw GatewayError.notAuthenticated }
        let openSessions: [SessionDTO] = try await table("workout_sessions", query: [
            .init(name: "select", value: "id,athlete_id,plan_id,day_id,started_at"),
            .init(name: "athlete_id", value: "eq.\(athleteID.uuidString.lowercased())"),
            .init(name: "ended_at", value: "is.null"),
            .init(name: "order", value: "started_at.desc"), .init(name: "limit", value: "1")
        ])
        let session: SessionDTO
        let day: DayDTO
        let plan: PlanDTO?

        if let open = openSessions.first, let dayID = open.dayID {
            let days: [DayDTO] = try await table("workout_days", query: [
                .init(name: "select", value: "id,plan_id,name,focus,sort_order"),
                .init(name: "id", value: "eq.\(dayID.uuidString.lowercased())"), .init(name: "limit", value: "1")
            ])
            guard let selectedDay = days.first else { return nil }
            let plans: [PlanDTO] = try await table("workout_plans", query: [
                .init(name: "select", value: "id,title,phase,current_week"),
                .init(name: "id", value: "eq.\(selectedDay.planID.uuidString.lowercased())"), .init(name: "limit", value: "1")
            ])
            session = open
            day = selectedDay
            plan = plans.first
        } else {
            let activePlans: [PlanDTO] = try await table("workout_plans", query: [
                .init(name: "select", value: "id,title,phase,current_week"),
                .init(name: "athlete_id", value: "eq.\(athleteID.uuidString.lowercased())"),
                .init(name: "active", value: "eq.true"), .init(name: "archived_at", value: "is.null"),
                .init(name: "order", value: "updated_at.desc"), .init(name: "limit", value: "1")
            ])
            guard let activePlan = activePlans.first else { return nil }
            let planDays: [DayDTO] = try await table("workout_days", query: [
                .init(name: "select", value: "id,plan_id,name,focus,sort_order"),
                .init(name: "plan_id", value: "eq.\(activePlan.id.uuidString.lowercased())"),
                .init(name: "archived_at", value: "is.null"), .init(name: "order", value: "sort_order.asc")
            ])
            guard !planDays.isEmpty else { return nil }
            let completed: [SessionDTO] = try await table("workout_sessions", query: [
                .init(name: "select", value: "id,athlete_id,plan_id,day_id,started_at"),
                .init(name: "athlete_id", value: "eq.\(athleteID.uuidString.lowercased())"),
                .init(name: "plan_id", value: "eq.\(activePlan.id.uuidString.lowercased())"),
                .init(name: "ended_at", value: "not.is.null"),
                .init(name: "order", value: "ended_at.desc"), .init(name: "limit", value: "1")
            ])
            let nextIndex: Int
            if let previousDayID = completed.first?.dayID,
               let previousIndex = planDays.firstIndex(where: { $0.id == previousDayID }) {
                nextIndex = (previousIndex + 1) % planDays.count
            } else { nextIndex = 0 }
            let selectedDay = planDays[nextIndex]
            session = SessionDTO(
                id: UUID(), athleteID: athleteID, planID: activePlan.id,
                dayID: selectedDay.id, startedAt: nil
            )
            day = selectedDay
            plan = activePlan
        }

        let dayID = day.id
        let items: [ItemDTO] = try await table("workout_items", query: [
            .init(name: "select", value: "id,exercise_id,sets,reps_text,target_load,rest_seconds,tempo,target_rir,target_rpe,sort_order"),
            .init(name: "day_id", value: "eq.\(dayID.uuidString.lowercased())"), .init(name: "archived_at", value: "is.null"), .init(name: "order", value: "sort_order.asc")
        ])
        let exerciseIDs = items.map(\.exerciseID)
        let exercises: [ExerciseDTO] = exerciseIDs.isEmpty ? [] : try await table("exercises", query: [
            .init(name: "select", value: "id,name,description,technique,image_url,tags"),
            .init(name: "id", value: "in.(\(exerciseIDs.map { $0.uuidString.lowercased() }.joined(separator: ",")))")
        ])
        let itemIDs = items.map(\.id)
        let targets: [SetTargetDTO] = itemIDs.isEmpty ? [] : try await table("workout_item_set_targets", query: [
            .init(name: "select", value: "workout_item_id,set_index,target_load,reps_min,reps_max,target_rir,target_rpe"),
            .init(name: "workout_item_id", value: "in.(\(itemIDs.map { $0.uuidString.lowercased() }.joined(separator: ",")))"), .init(name: "order", value: "set_index.asc")
        ])
        let exerciseByID = Dictionary(uniqueKeysWithValues: exercises.map { ($0.id, $0) })
        let targetsByItem = Dictionary(grouping: targets, by: \.workoutItemID)
        let snapshots = items.compactMap { item -> ExerciseSnapshot? in
            guard let exercise = exerciseByID[item.exerciseID] else { return nil }
            let targetSets = targetsByItem[item.id] ?? []
            let prescriptions: [SetPrescription] = targetSets.isEmpty
                ? (1...max(1, item.sets)).map { SetPrescription(index: $0, repetitions: item.repsText ?? "—", load: item.targetLoad, targetRIR: item.targetRIR, targetRPE: item.targetRPE, restSeconds: item.restSeconds ?? 90, tempo: item.tempo) }
                : targetSets.map { SetPrescription(index: $0.setIndex, repetitions: $0.repetitions, load: $0.targetLoad, targetRIR: $0.targetRIR, targetRPE: $0.targetRPE, restSeconds: item.restSeconds ?? 90, tempo: item.tempo) }
            let profile = exercise.tags?.first(where: { $0.hasPrefix("motion:") })?.replacingOccurrences(of: "motion:", with: "")
            return ExerciseSnapshot(id: exercise.id, workoutItemID: item.id, name: exercise.name, imageURL: exercise.imageURL.flatMap(URL.init(string:)), instructions: exercise.technique ?? exercise.description, prescriptions: prescriptions, motionProfile: profile)
        }
        return WorkoutSnapshot(
            sessionID: session.id, athleteID: athleteID, planID: session.planID,
            dayID: dayID, programTitle: plan?.title ?? "PT-PRO",
            phase: plan?.phase, week: plan?.currentWeek,
            dayTitle: day.name, exercises: snapshots,
            startedAt: session.startedAt
        )
    }

    private func table<T: Decodable>(_ name: String, query: [URLQueryItem]) async throws -> T {
        try await request(path: "/rest/v1/\(name)", query: query)
    }

    private func request<T: Decodable>(
        path: String, query: [URLQueryItem] = [], method: String = "GET",
        body: Data? = nil, authenticated: Bool = true
    ) async throws -> T {
        if authenticated { try await refreshIfNeeded() }
        var components = URLComponents(url: configuration.supabaseURL.appending(path: path), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.httpBody = body
        request.setValue(configuration.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if authenticated {
            guard let token = authSession?.accessToken else { throw GatewayError.notAuthenticated }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw GatewayError.requestFailed(String(data: data, encoding: .utf8) ?? "Errore Cloud")
        }
        return try JSONDecoder.ptpro.decode(T.self, from: data)
    }

    private func refreshIfNeeded() async throws {
        guard let current = authSession else { throw GatewayError.notAuthenticated }
        guard current.expiresAt.timeIntervalSinceNow < 300 else { return }
        let body = try JSONSerialization.data(withJSONObject: ["refresh_token": current.refreshToken])
        let refreshed: AuthSession = try await request(
            path: "/auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "refresh_token")],
            method: "POST", body: body, authenticated: false
        )
        authSession = refreshed
        try keychain.save(JSONEncoder.ptpro.encode(refreshed), account: "session")
    }
}

private struct IngestResponse: Decodable { var ok: Bool; var duplicate: Bool }
private struct SessionDTO: Decodable { var id: UUID; var athleteID: UUID; var planID: UUID?; var dayID: UUID?; var startedAt: Date? }
private struct DayDTO: Decodable { var id: UUID; var planID: UUID; var name: String; var focus: String?; var sortOrder: Int }
private struct PlanDTO: Decodable { var id: UUID; var title: String; var phase: String?; var currentWeek: Int }
private struct ItemDTO: Decodable { var id: UUID; var exerciseID: UUID; var sets: Int; var repsText: String?; var targetLoad: Double?; var restSeconds: Int?; var tempo: String?; var targetRIR: Double?; var targetRPE: Double?; var sortOrder: Int }
private struct ExerciseDTO: Decodable { var id: UUID; var name: String; var description: String?; var technique: String?; var imageURL: String?; var tags: [String]? }
private struct SetTargetDTO: Decodable {
    var workoutItemID: UUID; var setIndex: Int; var targetLoad: Double?; var repsMin: Int?; var repsMax: Int?; var targetRIR: Double?; var targetRPE: Double?
    var repetitions: String {
        switch (repsMin, repsMax) {
        case let (min?, max?) where min != max: "\(min)-\(max)"
        case let (min?, _): "\(min)"
        case let (_, max?): "\(max)"
        default: "—"
        }
    }
}

enum GatewayError: LocalizedError {
    case notAuthenticated
    case requestFailed(String)
    var errorDescription: String? {
        switch self {
        case .notAuthenticated: "Accedi a PT-PRO per continuare."
        case let .requestFailed(message): message
        }
    }
}
