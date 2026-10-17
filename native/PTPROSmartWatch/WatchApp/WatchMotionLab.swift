import Foundation
@preconcurrency import CoreMotion
import PTPROCore

final class WatchMotionLab {
    private let manager = CMMotionManager()
    private let queue: OperationQueue = {
        let queue = OperationQueue()
        queue.name = "it.ptpro.motion-lab"
        queue.qualityOfService = .userInitiated
        return queue
    }()
    private let lock = NSLock()
    private var samples: [MotionSample] = []
    private var enabled = false

    func start(profile: String?) {
        stopUpdates()
        lock.withLock { samples.removeAll(keepingCapacity: true) }
        guard profile != nil, manager.isDeviceMotionAvailable else { enabled = false; return }
        enabled = true
        manager.deviceMotionUpdateInterval = 1.0 / 25.0
        manager.startDeviceMotionUpdates(to: queue) { [weak self] motion, _ in
            guard let self, let motion else { return }
            let sample = MotionSample(
                timestamp: motion.timestamp,
                userAcceleration: .init(x: motion.userAcceleration.x, y: motion.userAcceleration.y, z: motion.userAcceleration.z),
                rotationRate: .init(x: motion.rotationRate.x, y: motion.rotationRate.y, z: motion.rotationRate.z)
            )
            self.lock.withLock { self.samples.append(sample) }
        }
    }

    func finishEstimate() -> MotionEstimate? {
        guard enabled else { return nil }
        stopUpdates()
        let captured = lock.withLock { samples }
        return WristCycleAnalyzer().analyze(captured)
    }

    private func stopUpdates() {
        manager.stopDeviceMotionUpdates()
        enabled = false
    }
}
