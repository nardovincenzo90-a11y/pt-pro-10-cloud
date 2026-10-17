import Foundation

public struct MotionVector: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var z: Double

    public init(x: Double, y: Double, z: Double) {
        self.x = x
        self.y = y
        self.z = z
    }

    public var magnitude: Double { sqrt(x * x + y * y + z * z) }
}

public struct MotionSample: Codable, Equatable, Sendable {
    public var timestamp: TimeInterval
    public var userAcceleration: MotionVector
    public var rotationRate: MotionVector

    public init(timestamp: TimeInterval, userAcceleration: MotionVector, rotationRate: MotionVector) {
        self.timestamp = timestamp
        self.userAcceleration = userAcceleration
        self.rotationRate = rotationRate
    }
}

public struct MotionEstimate: Codable, Equatable, Sendable {
    public var repetitions: Int
    public var averageRepSeconds: Double?
    public var cadenceVariationPercent: Double?
    public var performanceDriftPercent: Double?
    public var confidence: Double
    public var algorithmKey: String
    public var algorithmVersion: String
    public var isExperimental: Bool

    public init(
        repetitions: Int, averageRepSeconds: Double?, cadenceVariationPercent: Double?,
        performanceDriftPercent: Double?, confidence: Double,
        algorithmKey: String = "wrist_cycle_hysteresis",
        algorithmVersion: String = "0.1.0", isExperimental: Bool = true
    ) {
        self.repetitions = repetitions
        self.averageRepSeconds = averageRepSeconds
        self.cadenceVariationPercent = cadenceVariationPercent
        self.performanceDriftPercent = performanceDriftPercent
        self.confidence = min(max(confidence, 0), 1)
        self.algorithmKey = algorithmKey
        self.algorithmVersion = algorithmVersion
        self.isExperimental = isExperimental
    }
}

/// Collega una stima sperimentale del polso alla serie realmente eseguita.
/// La stima non sostituisce mai le ripetizioni confermate dall'utente.
public struct MotionSetEstimate: Codable, Equatable, Sendable {
    public var workoutItemID: UUID
    public var exerciseID: UUID
    public var setIndex: Int
    public var estimate: MotionEstimate

    public init(workoutItemID: UUID, exerciseID: UUID, setIndex: Int, estimate: MotionEstimate) {
        self.workoutItemID = workoutItemID
        self.exerciseID = exerciseID
        self.setIndex = setIndex
        self.estimate = estimate
    }
}

/// Baseline euristica per Motion Lab. Non valuta tecnica, ROM o rischio clinico.
public struct WristCycleAnalyzer: Sendable {
    public var highThreshold: Double
    public var lowThreshold: Double
    public var minimumRepSeconds: Double
    public var maximumRepSeconds: Double

    public init(
        highThreshold: Double = 0.55, lowThreshold: Double = 0.22,
        minimumRepSeconds: Double = 0.45, maximumRepSeconds: Double = 8
    ) {
        self.highThreshold = highThreshold
        self.lowThreshold = lowThreshold
        self.minimumRepSeconds = minimumRepSeconds
        self.maximumRepSeconds = maximumRepSeconds
    }

    public func analyze(_ samples: [MotionSample]) -> MotionEstimate {
        guard samples.count >= 8 else {
            return MotionEstimate(repetitions: 0, averageRepSeconds: nil,
                                  cadenceVariationPercent: nil, performanceDriftPercent: nil,
                                  confidence: 0)
        }

        var armed = true
        var peaks: [TimeInterval] = []
        var lastPeak: TimeInterval?
        for sample in samples.sorted(by: { $0.timestamp < $1.timestamp }) {
            let signal = sample.userAcceleration.magnitude + sample.rotationRate.magnitude * 0.12
            if armed, signal >= highThreshold {
                if let lastPeak {
                    let interval = sample.timestamp - lastPeak
                    if interval >= minimumRepSeconds, interval <= maximumRepSeconds {
                        peaks.append(sample.timestamp)
                    }
                } else {
                    peaks.append(sample.timestamp)
                }
                lastPeak = sample.timestamp
                armed = false
            } else if !armed, signal <= lowThreshold {
                armed = true
            }
        }

        let intervals = zip(peaks.dropFirst(), peaks).map { pair in pair.0 - pair.1 }
        guard !intervals.isEmpty else {
            return MotionEstimate(repetitions: peaks.count, averageRepSeconds: nil,
                                  cadenceVariationPercent: nil, performanceDriftPercent: nil,
                                  confidence: peaks.isEmpty ? 0 : 0.25)
        }
        let average = intervals.reduce(0, +) / Double(intervals.count)
        let variance = intervals.map { pow($0 - average, 2) }.reduce(0, +) / Double(intervals.count)
        let coefficient = average > 0 ? sqrt(variance) / average * 100 : nil
        let split = max(1, intervals.count / 2)
        let first = Array(intervals.prefix(split))
        let last = Array(intervals.suffix(split))
        let firstMean = first.reduce(0, +) / Double(first.count)
        let lastMean = last.reduce(0, +) / Double(last.count)
        let drift = firstMean > 0 ? (lastMean - firstMean) / firstMean * 100 : nil
        let sampleFactor = min(Double(peaks.count) / 8, 1)
        let regularityFactor = max(0, 1 - (coefficient ?? 100) / 100)
        let confidence = 0.25 + 0.45 * sampleFactor + 0.30 * regularityFactor

        return MotionEstimate(
            repetitions: peaks.count,
            averageRepSeconds: average,
            cadenceVariationPercent: coefficient,
            performanceDriftPercent: drift,
            confidence: confidence
        )
    }
}
