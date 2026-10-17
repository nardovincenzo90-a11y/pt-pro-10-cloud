import Foundation
import WatchConnectivity
import PTPROCore

final class PhoneConnectivityCoordinator: NSObject, WCSessionDelegate {
    var onReachability: ((Bool) -> Void)?
    var onEnvelope: ((SyncEnvelope) -> Void)?
    var onSnapshotRequest: (() -> Void)?
    private let session: WCSession? = WCSession.isSupported() ? .default : nil

    func activate() {
        session?.delegate = self
        session?.activate()
    }

    func send(snapshot: WorkoutSnapshot) throws {
        let message = try WatchMessage(kind: .workoutSnapshot, value: snapshot)
        let data = try JSONEncoder.ptpro.encode(message)
        if session?.isReachable == true {
            session?.sendMessageData(data, replyHandler: nil)
        } else {
            session?.transferUserInfo(["message": data])
        }
    }

    func acknowledge(eventID: UUID) throws {
        let message = try WatchMessage(
            kind: .syncAcknowledgement,
            value: SyncAcknowledgement(eventID: eventID)
        )
        let data = try JSONEncoder.ptpro.encode(message)
        if session?.isReachable == true {
            session?.sendMessageData(data, replyHandler: nil)
        } else {
            session?.transferUserInfo(["message": data])
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        onReachability?(activationState == .activated && session.isReachable)
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    func sessionReachabilityDidChange(_ session: WCSession) { onReachability?(session.isReachable) }

    func session(_ session: WCSession, didReceiveMessageData messageData: Data) {
        receive(messageData)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        guard let data = userInfo["message"] as? Data else { return }
        receive(data)
    }

    private func receive(_ data: Data) {
        guard let message = try? JSONDecoder.ptpro.decode(WatchMessage.self, from: data) else { return }
        switch message.kind {
        case .syncEnvelope:
            if let envelope = try? message.decode(SyncEnvelope.self) { onEnvelope?(envelope) }
        case .requestSnapshot:
            onSnapshotRequest?()
        default:
            break
        }
    }
}
