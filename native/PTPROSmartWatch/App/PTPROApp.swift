import SwiftUI
import PTPROCore

@main
struct PTPROApp: App {
    @StateObject private var model = PhoneAppModel()

    var body: some Scene {
        WindowGroup {
            PhoneRootView()
                .environmentObject(model)
                .task { await model.start() }
        }
    }
}

@MainActor
final class PhoneAppModel: ObservableObject {
    @Published var connectionLabel = "Ricerca Apple Watch…"
    @Published var activeWorkout: WorkoutSnapshot?
    @Published var latestHeartRate: Double?
    @Published var lastError: String?
    @Published var isAuthenticated = false
    @Published var isBusy = false

    let connectivity = PhoneConnectivityCoordinator()
    private var gateway: SupabaseGateway?

    func start() async {
        do {
            let gateway = try SupabaseGateway(configuration: AppConfiguration.load())
            self.gateway = gateway
            isAuthenticated = try await gateway.restoreSession()
            if isAuthenticated { try await reloadWorkout() }
        } catch {
            lastError = error.localizedDescription
        }
        connectivity.onReachability = { [weak self] reachable in
            Task { @MainActor in
                self?.connectionLabel = reachable ? "Apple Watch connesso" : "Sincronizzazione in background"
            }
        }
        connectivity.onEnvelope = { [weak self] envelope in
            Task { await self?.ingest(envelope) }
        }
        connectivity.onSnapshotRequest = { [weak self] in
            Task { @MainActor in self?.sendSnapshotToWatch() }
        }
        connectivity.activate()
    }

    func signIn(email: String, password: String) async {
        guard let gateway else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            try await gateway.signIn(email: email, password: password)
            isAuthenticated = true
            try await reloadWorkout()
        } catch { lastError = error.localizedDescription }
    }

    func reloadWorkout() async throws {
        guard let gateway else { return }
        activeWorkout = try await gateway.loadActiveWorkout()
        sendSnapshotToWatch()
    }

    func signOut() async {
        await gateway?.signOut()
        isAuthenticated = false
        activeWorkout = nil
    }

    private func ingest(_ envelope: SyncEnvelope) async {
        guard let gateway else { return }
        do {
            try await gateway.ingest(envelope)
            try connectivity.acknowledge(eventID: envelope.eventID)
            if envelope.eventType == .sessionEnded {
                try? await reloadWorkout()
            }
        }
        catch { await MainActor.run { lastError = error.localizedDescription } }
    }

    private func sendSnapshotToWatch() {
        guard let activeWorkout else { return }
        do { try connectivity.send(snapshot: activeWorkout) }
        catch { lastError = error.localizedDescription }
    }
}

struct PhoneRootView: View {
    @EnvironmentObject private var model: PhoneAppModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        Group {
            if model.isAuthenticated { dashboard }
            else { login }
        }
        .alert("PT-PRO", isPresented: .constant(model.lastError != nil)) {
            Button("OK") { model.lastError = nil }
        } message: { Text(model.lastError ?? "") }
    }

    private var dashboard: some View {
        NavigationStack {
            List {
                Section("PT-PRO Smart Watch") {
                    Label(model.connectionLabel, systemImage: "applewatch")
                    Label("HealthKit con consenso esplicito", systemImage: "heart.fill")
                    Label("Serie sincronizzate senza duplicati", systemImage: "checkmark.icloud")
                }
                Section("V-Shape") {
                    if let workout = model.activeWorkout {
                        Text(workout.dayTitle).font(.headline)
                        Text([workout.phase, workout.week.map { "Settimana \($0)" }].compactMap { $0 }.joined(separator: " · "))
                    } else {
                        ContentUnavailableView("Nessun allenamento attivo", systemImage: "figure.strengthtraining.traditional", description: Text("Avvia una giornata V-Shape da PT-PRO."))
                    }
                }
                Section("Trasparenza dati") {
                    Text("Battito e durata: misurati")
                    Text("Calorie: stima Apple")
                    Text("Carico e RIR: inseriti dall’utente")
                    Text("Ripetizioni automatiche: stima sperimentale")
                }
            }
            .navigationTitle("PT-PRO")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Aggiorna") { Task { try? await model.reloadWorkout() } }
                }
            }
        }
    }

    private var login: some View {
        NavigationStack {
            Form {
                Section("Stesso account PT-PRO") {
                    TextField("Email", text: $email).textContentType(.emailAddress).textInputAutocapitalization(.never)
                    SecureField("Password", text: $password).textContentType(.password)
                    Button(model.isBusy ? "Accesso…" : "Accedi") {
                        Task { await model.signIn(email: email, password: password) }
                    }
                    .disabled(model.isBusy || email.isEmpty || password.isEmpty)
                }
                Section {
                    Text("Le credenziali restano nel Portachiavi dell’iPhone. Apple Watch riceve solo i dati necessari alla sessione attiva.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("PT-PRO Smart Watch")
        }
    }
}
