import Foundation
@preconcurrency import HealthKit
import PTPROCore

@MainActor
final class WatchHealthWorkoutManager: NSObject, ObservableObject {
    @Published private(set) var isRunning = false
    @Published private(set) var isPaused = false
    @Published private(set) var heartRate: Double?
    @Published private(set) var activeEnergy = 0.0
    @Published private(set) var elapsedSeconds = 0

    private let store = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var startedAt: Date?
    private var ticker: Task<Void, Never>?
    private var maximumHeartRate: Double?
    private var heartRateSamples = 0
    private var stoppedContinuation: CheckedContinuation<Void, Never>?
    private let persistedStartKey = "ptpro.watch.health-started-at.v1"

    var elapsedText: String {
        String(format: "%02d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    }

    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable(),
              let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate),
              let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            throw WatchHealthError.healthDataUnavailable
        }
        try await store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: [heartRate, energy, HKObjectType.workoutType()])
    }

    func startStrengthWorkout() async throws {
        guard workoutSession == nil else { return }
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        configuration.locationType = .indoor

        let session = try HKWorkoutSession(healthStore: store, configuration: configuration)
        let builder = session.associatedWorkoutBuilder()
        builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: configuration)
        session.delegate = self
        builder.delegate = self

        let start = Date()
        workoutSession = session
        self.builder = builder
        startedAt = start
        UserDefaults.standard.set(start.timeIntervalSince1970, forKey: persistedStartKey)
        heartRate = nil
        maximumHeartRate = nil
        heartRateSamples = 0
        activeEnergy = 0
        elapsedSeconds = 0

        session.startActivity(with: start)
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            builder.beginCollection(withStart: start) { success, error in
                if let error { continuation.resume(throwing: error) }
                else if success { continuation.resume() }
                else { continuation.resume(throwing: WatchHealthError.collectionFailed) }
            }
        }
        session.startMirroringToCompanionDevice { _, _ in }
        isRunning = true
        isPaused = false
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard let self else { continue }
                if let builder = self.builder {
                    self.elapsedSeconds = max(0, Int(builder.elapsedTime(at: Date())))
                }
            }
        }
    }

    func pause() { workoutSession?.pause() }
    func resume() { workoutSession?.resume() }

    func recoverActiveWorkout() async throws {
        if workoutSession != nil { return }
        let recovered = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<HKWorkoutSession, Error>) in
            store.recoverActiveWorkoutSession { session, error in
                if let error { continuation.resume(throwing: error) }
                else if let session { continuation.resume(returning: session) }
                else { continuation.resume(throwing: WatchHealthError.noRecoverableWorkout) }
            }
        }
        let recoveredBuilder = recovered.associatedWorkoutBuilder()
        recovered.delegate = self
        recoveredBuilder.delegate = self
        workoutSession = recovered
        builder = recoveredBuilder
        let storedStart = UserDefaults.standard.double(forKey: persistedStartKey)
        startedAt = storedStart > 0 ? Date(timeIntervalSince1970: storedStart) : Date()
        isRunning = recovered.state != .ended && recovered.state != .notStarted
        isPaused = recovered.state == .paused
        startTicker()
    }

    func end(sessionID: UUID) async throws -> HealthSummary? {
        guard let session = workoutSession, let builder, let startedAt else { return nil }
        let end = Date()
        session.stopActivity(with: end)
        if session.state != .stopped {
            await withCheckedContinuation { continuation in
                stoppedContinuation = continuation
            }
        }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            builder.endCollection(withEnd: end) { success, error in
                if let error { continuation.resume(throwing: error) }
                else if success { continuation.resume() }
                else { continuation.resume(throwing: WatchHealthError.collectionFailed) }
            }
        }
        let workout = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<HKWorkout?, Error>) in
            builder.finishWorkout { workout, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: workout) }
            }
        }
        session.end()
        ticker?.cancel()
        isRunning = false
        isPaused = false
        workoutSession = nil
        self.builder = nil
        self.startedAt = nil
        UserDefaults.standard.removeObject(forKey: persistedStartKey)

        let bpmUnit = HKUnit.count().unitDivided(by: .minute())
        let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        let average = builder.statistics(for: heartRateType)?.averageQuantity()?.doubleValue(for: bpmUnit)
        return HealthSummary(
            sessionID: sessionID,
            healthKitWorkoutID: workout?.uuid,
            startedAt: startedAt,
            endedAt: end,
            durationSeconds: Int(end.timeIntervalSince(startedAt)),
            activeEnergyKcal: NumericMetric(value: activeEnergy, unit: "kcal", provenance: .appleEstimated),
            averageHeartRate: average.map { NumericMetric(value: $0, unit: "bpm", provenance: .measured) },
            maximumHeartRate: maximumHeartRate.map { NumericMetric(value: $0, unit: "bpm", provenance: .measured) },
            sampleCount: heartRateSamples
        )
    }

    private func startTicker() {
        ticker?.cancel()
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard let self else { continue }
                if let builder = self.builder {
                    self.elapsedSeconds = max(0, Int(builder.elapsedTime(at: Date())))
                }
            }
        }
    }
}

extension WatchHealthWorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        Task { @MainActor in
            self.isPaused = toState == .paused
            self.isRunning = ![.notStarted, .ended].contains(toState)
            if toState == .stopped {
                self.stoppedContinuation?.resume()
                self.stoppedContinuation = nil
            }
        }
    }

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        Task { @MainActor in
            self.ticker?.cancel()
            self.isRunning = false
        }
    }
}

extension WatchHealthWorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        Task { @MainActor in
            let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
            let activeEnergyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
            if collectedTypes.contains(heartRateType),
               let statistics = workoutBuilder.statistics(for: heartRateType),
               let quantity = statistics.mostRecentQuantity() {
                let value = quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                self.heartRate = value
                self.maximumHeartRate = max(self.maximumHeartRate ?? value, value)
                self.heartRateSamples += 1
            }
            if collectedTypes.contains(activeEnergyType),
               let statistics = workoutBuilder.statistics(for: activeEnergyType),
               let quantity = statistics.sumQuantity() {
                self.activeEnergy = quantity.doubleValue(for: .kilocalorie())
            }
        }
    }
}

enum WatchHealthError: LocalizedError {
    case healthDataUnavailable
    case collectionFailed
    case noRecoverableWorkout
    var errorDescription: String? {
        switch self {
        case .healthDataUnavailable: "HealthKit non è disponibile su questo dispositivo."
        case .collectionFailed: "La raccolta dati dell’allenamento non è partita."
        case .noRecoverableWorkout: "Non c’è una sessione HealthKit attiva da recuperare."
        }
    }
}
