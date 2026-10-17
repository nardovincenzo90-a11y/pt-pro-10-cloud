import Foundation
import WatchConnectivity
import PTPROCore

final class WatchConnectivityCoordinator: NSObject, WCSessionDelegate {
    var onSnapshot: ((WorkoutSnapshot) -> Void)?
    var onAcknowledgement: ((UUID) -> Void)?
    private let session: WCSession? = WCSession.isSupported() ? .default : nil
    private let outboxKey = "ptpro.watch.sync.outbox.v1"
    private let lock = NSLock()

    func activate() {
        session?.delegate = self
        session?.activate()
    }

    func requestSnapshot() {
        guard let data = try? JSONEncoder.ptpro.encode(WatchMessage(kind: .requestSnapshot)) else { return }
        session?.sendMessageData(data, replyHandler: nil)
    }

    func send(envelope: SyncEnvelope) throws {
        persist(envelope)
        try transmit(envelope)
    }

    func flushOutbox() {
        for envelope in pendingEvents() {
            try? transmit(envelope)
        }
    }

    private func transmit(_ envelope: SyncEnvelope) throws {
        let message = try WatchMessage(kind: .syncEnvelope, value: envelope)
        let data = try JSONEncoder.ptpro.encode(message)
        if session?.isReachable == true {
            session?.sendMessageData(data, replyHandler: nil)
        } else {
            session?.transferUserInfo(["message": data])
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            requestSnapshot()
            flushOutbox()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if session.isReachable { flushOutbox() }
    }

    func session(_ session: WCSession, didReceiveMessageData messageData: Data) { receive(messageData) }
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        guard let data = userInfo["message"] as? Data else { return }
        receive(data)
    }

    private func receive(_ data: Data) {
        guard let message = try? JSONDecoder.ptpro.decode(WatchMessage.self, from: data) else { return }
        switch message.kind {
        case .workoutSnapshot:
            if let snapshot = try? message.decode(WorkoutSnapshot.self) { onSnapshot?(snapshot) }
        case .syncAcknowledgement:
            guard let acknowledgement = try? message.decode(SyncAcknowledgement.self) else { return }
            acknowledge(acknowledgement.eventID)
            onAcknowledgement?(acknowledgement.eventID)
        default:
            break
        }
    }

    private func persist(_ envelope: SyncEnvelope) {
        lock.lock()
        defer { lock.unlock() }
        var events = loadPendingUnlocked()
        guard !events.contains(where: { $0.eventID == envelope.eventID }) else { return }
        events.append(envelope)
        events.sort { $0.occurredAt < $1.occurredAt }
        if let data = try? JSONEncoder.ptpro.encode(events) {
            UserDefaults.standard.set(data, forKey: outboxKey)
        }
    }

    private func acknowledge(_ eventID: UUID) {
        lock.lock()
        defer { lock.unlock() }
        let events = loadPendingUnlocked().filter { $0.eventID != eventID }
        if events.isEmpty {
            UserDefaults.standard.removeObject(forKey: outboxKey)
        } else if let data = try? JSONEncoder.ptpro.encode(events) {
            UserDefaults.standard.set(data, forKey: outboxKey)
        }
    }

    private func pendingEvents() -> [SyncEnvelope] {
        lock.lock()
        defer { lock.unlock() }
        return loadPendingUnlocked()
    }

    private func loadPendingUnlocked() -> [SyncEnvelope] {
        guard let data = UserDefaults.standard.data(forKey: outboxKey),
              let events = try? JSONDecoder.ptpro.decode([SyncEnvelope].self, from: data) else { return [] }
        var seen = Set<UUID>()
        return events.sorted { $0.occurredAt < $1.occurredAt }
            .filter { seen.insert($0.eventID).inserted }
    }
}
