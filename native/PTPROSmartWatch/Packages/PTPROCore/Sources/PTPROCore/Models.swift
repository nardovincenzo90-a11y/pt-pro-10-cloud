import Foundation

public enum MetricProvenance: String, Codable, Sendable {
    case measured
    case appleEstimated = "apple_estimated"
    case userEntered = "user_entered"
    case ptproEstimated = "ptpro_estimated"
}

public struct NumericMetric: Codable, Equatable, Sendable {
    public var value: Double
    public var unit: String
    public var provenance: MetricProvenance

    public init(value: Double, unit: String, provenance: MetricProvenance) {
        self.value = value
        self.unit = unit
        self.provenance = provenance
    }
}

public struct SetPrescription: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var index: Int
    public var repetitions: String
    public var load: Double?
    public var targetRIR: Double?
    public var targetRPE: Double?
    public var restSeconds: Int
    public var tempo: String?

    public init(
        id: UUID = UUID(), index: Int, repetitions: String, load: Double? = nil,
        targetRIR: Double? = nil, targetRPE: Double? = nil,
        restSeconds: Int, tempo: String? = nil
    ) {
        self.id = id
        self.index = index
        self.repetitions = repetitions
        self.load = load
        self.targetRIR = targetRIR
        self.targetRPE = targetRPE
        self.restSeconds = restSeconds
        self.tempo = tempo
    }
}

public struct ExerciseSnapshot: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var workoutItemID: UUID
    public var name: String
    public var imageURL: URL?
    public var instructions: String?
    public var prescriptions: [SetPrescription]
    public var motionProfile: String?

    public init(
        id: UUID, workoutItemID: UUID, name: String, imageURL: URL? = nil,
        instructions: String? = nil, prescriptions: [SetPrescription],
        motionProfile: String? = nil
    ) {
        self.id = id
        self.workoutItemID = workoutItemID
        self.name = name
        self.imageURL = imageURL
        self.instructions = instructions
        self.prescriptions = prescriptions
        self.motionProfile = motionProfile
    }
}

public struct WorkoutSnapshot: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID { sessionID }
    public var sessionID: UUID
    public var athleteID: UUID
    public var planID: UUID?
    public var dayID: UUID?
    public var programTitle: String
    public var phase: String?
    public var week: Int?
    public var dayTitle: String
    public var exercises: [ExerciseSnapshot]
    public var startedAt: Date?

    public init(
        sessionID: UUID, athleteID: UUID, planID: UUID? = nil, dayID: UUID? = nil,
        programTitle: String, phase: String? = nil, week: Int? = nil,
        dayTitle: String, exercises: [ExerciseSnapshot], startedAt: Date? = nil
    ) {
        self.sessionID = sessionID
        self.athleteID = athleteID
        self.planID = planID
        self.dayID = dayID
        self.programTitle = programTitle
        self.phase = phase
        self.week = week
        self.dayTitle = dayTitle
        self.exercises = exercises
        self.startedAt = startedAt
    }
}

public struct CompletedSet: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID { eventID }
    public var eventID: UUID
    public var sessionID: UUID
    public var planID: UUID?
    public var dayID: UUID?
    public var workoutItemID: UUID
    public var exerciseID: UUID
    public var exerciseName: String
    public var setIndex: Int
    public var load: Double
    public var repetitions: Int
    public var rir: Double?
    public var rpe: Double?
    public var restSeconds: Int?
    public var completedAt: Date

    public init(
        eventID: UUID = UUID(), sessionID: UUID, planID: UUID? = nil,
        dayID: UUID? = nil, workoutItemID: UUID, exerciseID: UUID,
        exerciseName: String, setIndex: Int, load: Double, repetitions: Int,
        rir: Double? = nil, rpe: Double? = nil, restSeconds: Int? = nil,
        completedAt: Date = Date()
    ) {
        self.eventID = eventID
        self.sessionID = sessionID
        self.planID = planID
        self.dayID = dayID
        self.workoutItemID = workoutItemID
        self.exerciseID = exerciseID
        self.exerciseName = exerciseName
        self.setIndex = setIndex
        self.load = load
        self.repetitions = repetitions
        self.rir = rir
        self.rpe = rpe
        self.restSeconds = restSeconds
        self.completedAt = completedAt
    }
}

public struct HealthSummary: Codable, Equatable, Sendable {
    public var sessionID: UUID
    public var healthKitWorkoutID: UUID?
    public var startedAt: Date
    public var endedAt: Date?
    public var durationSeconds: Int
    public var activeEnergyKcal: NumericMetric?
    public var averageHeartRate: NumericMetric?
    public var maximumHeartRate: NumericMetric?
    public var sampleCount: Int

    public init(
        sessionID: UUID, healthKitWorkoutID: UUID? = nil, startedAt: Date,
        endedAt: Date? = nil, durationSeconds: Int,
        activeEnergyKcal: NumericMetric? = nil,
        averageHeartRate: NumericMetric? = nil,
        maximumHeartRate: NumericMetric? = nil,
        sampleCount: Int = 0
    ) {
        self.sessionID = sessionID
        self.healthKitWorkoutID = healthKitWorkoutID
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.durationSeconds = durationSeconds
        self.activeEnergyKcal = activeEnergyKcal
        self.averageHeartRate = averageHeartRate
        self.maximumHeartRate = maximumHeartRate
        self.sampleCount = sampleCount
    }
}

public enum WorkoutCommand: String, Codable, Sendable {
    case start
    case pause
    case resume
    case end
    case completeSet = "complete_set"
}

public struct SessionStartedPayload: Codable, Equatable, Sendable {
    public var planID: UUID?
    public var dayID: UUID?
    public var plannedExercises: Int
    public init(planID: UUID?, dayID: UUID?, plannedExercises: Int) {
        self.planID = planID
        self.dayID = dayID
        self.plannedExercises = plannedExercises
    }
}

public struct SessionEndedPayload: Codable, Equatable, Sendable {
    public var durationSeconds: Int
    public init(durationSeconds: Int) { self.durationSeconds = durationSeconds }
}
