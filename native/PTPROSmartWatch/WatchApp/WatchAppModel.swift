import Foundation
import HealthKit
import WatchKit
import PTPROCore

@MainActor
final class WatchAppModel: ObservableObject {
    @Published var snapshot: WorkoutSnapshot?
    @Published var exerciseIndex = 0
    @Published var setIndex = 0
    @Published var load = 0.0
    @Published var repetitions = 0
    @Published var rir: Double?
    @Published var restRemaining = 0
    @Published var lastMessage: String?
    @Published var errorMessage: String?

    let health = WatchHealthWorkoutManager()
    let motion = WatchMotionLab()
    let connectivity = WatchConnectivityCoordinator()
    private var restTask: Task<Void, Never>?
    private var observers: [NSObjectProtocol] = []
    private let stateKey = "ptpro.watch.active-state.v1"

    private struct PersistedState: Codable {
        var snapshot: WorkoutSnapshot
        var exerciseIndex: Int
        var setIndex: Int
        var load: Double
        var repetitions: Int
        var rir: Double?
        var active: Bool
    }

    var currentExercise: ExerciseSnapshot? {
        guard let exercises = snapshot?.exercises, exercises.indices.contains(exerciseIndex) else { return nil }
        return exercises[exerciseIndex]
    }

    var currentPrescription: SetPrescription? {
        guard let sets = currentExercise?.prescriptions, sets.indices.contains(setIndex) else { return nil }
        return sets[setIndex]
    }

    func prepare() async {
        connectivity.onSnapshot = { [weak self] snapshot in
            Task { @MainActor in self?.load(snapshot) }
        }
        connectivity.activate()
        restoreState()
        observers.append(NotificationCenter.default.addObserver(
            forName: .ptproRecoverActiveWorkout, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in await self?.recoverActiveWorkout() }
        })
        do { try await health.requestAuthorization() }
        catch { errorMessage = "Autorizzazione Salute non disponibile: \(error.localizedDescription)" }
        await recoverActiveWorkout()
    }

    func load(_ newSnapshot: WorkoutSnapshot) {
        if health.isRunning, snapshot?.sessionID == newSnapshot.sessionID { return }
        snapshot = newSnapshot
        exerciseIndex = 0
        setIndex = 0
        applyPrescription()
        persistState(active: health.isRunning)
    }

    func startWorkout() async {
        guard let snapshot else { return }
        do {
            let started = try SyncEnvelope(
                athleteID: snapshot.athleteID,
                sessionID: snapshot.sessionID,
                eventType: .sessionStarted,
                payload: SessionStartedPayload(
                    planID: snapshot.planID,
                    dayID: snapshot.dayID,
                    plannedExercises: snapshot.exercises.count
                )
            )
            try connectivity.send(envelope: started)
            try await health.startStrengthWorkout()
            motion.start(profile: currentExercise?.motionProfile)
            persistState(active: true)
            lastMessage = "Allenamento avviato"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func pauseOrResume() {
        health.isPaused ? health.resume() : health.pause()
    }

    func completeCurrentSet() async {
        guard let snapshot, let exercise = currentExercise else { return }
        let completed = CompletedSet(
            sessionID: snapshot.sessionID,
            planID: snapshot.planID,
            dayID: snapshot.dayID,
            workoutItemID: exercise.workoutItemID,
            exerciseID: exercise.id,
            exerciseName: exercise.name,
            setIndex: setIndex + 1,
            load: load,
            repetitions: repetitions,
            rir: rir,
            restSeconds: currentPrescription?.restSeconds
        )
        do {
            let envelope = try SyncEnvelope(
                eventID: completed.eventID,
                athleteID: snapshot.athleteID,
                sessionID: snapshot.sessionID,
                eventType: .setCompleted,
                payload: completed
            )
            try connectivity.send(envelope: envelope)
            if let estimate = motion.finishEstimate(), estimate.confidence >= 0.55 {
                let linkedEstimate = MotionSetEstimate(
                    workoutItemID: exercise.workoutItemID,
                    exerciseID: exercise.id,
                    setIndex: setIndex + 1,
                    estimate: estimate
                )
                let motionEnvelope = try SyncEnvelope(
                    athleteID: snapshot.athleteID,
                    sessionID: snapshot.sessionID,
                    eventType: .motionEstimate,
                    payload: linkedEstimate
                )
                try connectivity.send(envelope: motionEnvelope)
            }
            advanceSet()
            persistState(active: true)
        } catch {
            errorMessage = "Serie conservata sul Watch, sincronizzazione in attesa."
        }
    }

    func endWorkout() async {
        do {
            guard let snapshot else { return }
            let summary = try await health.end(sessionID: snapshot.sessionID)
            if let summary {
                let envelope = try SyncEnvelope(
                    athleteID: snapshot.athleteID,
                    sessionID: snapshot.sessionID,
                    eventType: .healthSummary,
                    payload: summary
                )
                try connectivity.send(envelope: envelope)
                let ended = try SyncEnvelope(
                    athleteID: snapshot.athleteID,
                    sessionID: snapshot.sessionID,
                    eventType: .sessionEnded,
                    payload: SessionEndedPayload(durationSeconds: summary.durationSeconds)
                )
                try connectivity.send(envelope: ended)
            }
            restTask?.cancel()
            UserDefaults.standard.removeObject(forKey: stateKey)
            lastMessage = "Allenamento terminato e sincronizzato"
        } catch {
            errorMessage = "Chiusura salvata localmente: \(error.localizedDescription)"
        }
    }

    private func advanceSet() {
        startRest(seconds: currentPrescription?.restSeconds ?? 90)
        if let sets = currentExercise?.prescriptions, setIndex + 1 < sets.count {
            setIndex += 1
        } else if let exercises = snapshot?.exercises, exerciseIndex + 1 < exercises.count {
            exerciseIndex += 1
            setIndex = 0
        }
        applyPrescription()
        motion.start(profile: currentExercise?.motionProfile)
    }

    private func recoverActiveWorkout() async {
        guard let persisted = persistedState(), persisted.active else { return }
        do {
            try await health.recoverActiveWorkout()
            snapshot = persisted.snapshot
            exerciseIndex = persisted.exerciseIndex
            setIndex = persisted.setIndex
            load = persisted.load
            repetitions = persisted.repetitions
            rir = persisted.rir
            motion.start(profile: currentExercise?.motionProfile)
            lastMessage = "Allenamento ripristinato"
        } catch {
            errorMessage = "Recupero allenamento: \(error.localizedDescription)"
        }
    }

    private func persistState(active: Bool) {
        guard let snapshot else { return }
        let value = PersistedState(
            snapshot: snapshot, exerciseIndex: exerciseIndex, setIndex: setIndex,
            load: load, repetitions: repetitions, rir: rir, active: active
        )
        if let data = try? JSONEncoder.ptpro.encode(value) {
            UserDefaults.standard.set(data, forKey: stateKey)
        }
    }

    private func restoreState() {
        guard let state = persistedState() else { return }
        snapshot = state.snapshot
        exerciseIndex = state.exerciseIndex
        setIndex = state.setIndex
        load = state.load
        repetitions = state.repetitions
        rir = state.rir
    }

    private func persistedState() -> PersistedState? {
        guard let data = UserDefaults.standard.data(forKey: stateKey) else { return nil }
        return try? JSONDecoder.ptpro.decode(PersistedState.self, from: data)
    }

    private func applyPrescription() {
        guard let prescription = currentPrescription else { return }
        load = prescription.load ?? load
        repetitions = Int(prescription.repetitions.split(separator: "-").first ?? "0") ?? 0
        rir = prescription.targetRIR
    }

    private func startRest(seconds: Int) {
        restTask?.cancel()
        restRemaining = seconds
        restTask = Task {
            while !Task.isCancelled, restRemaining > 0 {
                try? await Task.sleep(for: .seconds(1))
                if !Task.isCancelled { restRemaining -= 1 }
            }
            if !Task.isCancelled { WKInterfaceDevice.current().play(.notification) }
        }
    }
}
