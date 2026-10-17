import XCTest
@testable import PTPROCore

final class PTPROCoreTests: XCTestCase {
    func testOutboxDeduplicatesEvents() async throws {
        let eventID = UUID()
        let payload = ["ok": true]
        let event = try SyncEnvelope(
            eventID: eventID, athleteID: UUID(), sessionID: UUID(),
            eventType: .sessionStarted, payload: payload
        )
        let outbox = SyncOutbox()
        await outbox.enqueue(event)
        await outbox.enqueue(event)
        let pending = await outbox.all()
        XCTAssertEqual(pending.count, 1)
        XCTAssertEqual(pending.first?.eventID, eventID)
    }

    func testMotionEstimateIsAlwaysMarkedExperimental() {
        var samples: [MotionSample] = []
        for rep in 0..<6 {
            let start = Double(rep)
            samples.append(.init(timestamp: start, userAcceleration: .init(x: 0.1, y: 0, z: 0), rotationRate: .init(x: 0, y: 0, z: 0)))
            samples.append(.init(timestamp: start + 0.25, userAcceleration: .init(x: 0.8, y: 0, z: 0), rotationRate: .init(x: 0, y: 0, z: 0)))
            samples.append(.init(timestamp: start + 0.55, userAcceleration: .init(x: 0.1, y: 0, z: 0), rotationRate: .init(x: 0, y: 0, z: 0)))
        }
        let result = WristCycleAnalyzer().analyze(samples)
        XCTAssertEqual(result.repetitions, 6)
        XCTAssertTrue(result.isExperimental)
        XCTAssertGreaterThan(result.confidence, 0)
        XCTAssertLessThanOrEqual(result.confidence, 1)
    }
}
