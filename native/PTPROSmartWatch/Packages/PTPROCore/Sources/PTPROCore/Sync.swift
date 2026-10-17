import Foundation

public enum SyncEventType: String, Codable, Sendable {
    case sessionStarted = "session_started"
    case sessionPaused = "session_paused"
    case sessionResumed = "session_resumed"
    case sessionEnded = "session_ended"
    case setCompleted = "set_completed"
    case healthSummary = "health_summary"
    case motionEstimate = "motion_estimate"
}

public struct SyncEnvelope: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID { eventID }
    public var eventID: UUID
    public var athleteID: UUID
    public var sessionID: UUID?
    public var eventType: SyncEventType
    public var version: Int
    public var occurredAt: Date
    public var payload: Data

    public init<T: Encodable>(
        eventID: UUID = UUID(), athleteID: UUID, sessionID: UUID?,
        eventType: SyncEventType, version: Int = 1, occurredAt: Date = Date(),
        payload: T, encoder: JSONEncoder = .ptpro
    ) throws {
        self.eventID = eventID
        self.athleteID = athleteID
        self.sessionID = sessionID
        self.eventType = eventType
        self.version = version
        self.occurredAt = occurredAt
        self.payload = try encoder.encode(payload)
    }
}

public actor SyncOutbox {
    private var pending: [SyncEnvelope]

    public init(pending: [SyncEnvelope] = []) {
        self.pending = Self.deduplicated(pending)
    }

    public func enqueue(_ event: SyncEnvelope) {
        guard !pending.contains(where: { $0.eventID == event.eventID }) else { return }
        pending.append(event)
        pending.sort { $0.occurredAt < $1.occurredAt }
    }

    public func acknowledge(eventID: UUID) {
        pending.removeAll { $0.eventID == eventID }
    }

    public func all() -> [SyncEnvelope] { pending }

    public func encodeForPersistence(encoder: JSONEncoder = .ptpro) throws -> Data {
        try encoder.encode(pending)
    }

    public static func restore(from data: Data, decoder: JSONDecoder = .ptpro) throws -> SyncOutbox {
        let events = try decoder.decode([SyncEnvelope].self, from: data)
        return SyncOutbox(pending: events)
    }

    private static func deduplicated(_ events: [SyncEnvelope]) -> [SyncEnvelope] {
        var seen = Set<UUID>()
        return events.sorted { $0.occurredAt < $1.occurredAt }.filter { seen.insert($0.eventID).inserted }
    }
}

public extension JSONEncoder {
    static var ptpro: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }
}

public extension JSONDecoder {
    static var ptpro: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            let fractional = ISO8601DateFormatter()
            fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = fractional.date(from: raw) { return date }
            let standard = ISO8601DateFormatter()
            if let date = standard.date(from: raw) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO-8601 date: \(raw)")
        }
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}
