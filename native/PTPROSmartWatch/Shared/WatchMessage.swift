import Foundation
import PTPROCore

enum WatchMessageKind: String, Codable {
    case workoutSnapshot
    case command
    case syncEnvelope
    case syncAcknowledgement
    case requestSnapshot
}

struct SyncAcknowledgement: Codable {
    var eventID: UUID
}

struct WatchMessage: Codable {
    var kind: WatchMessageKind
    var payload: Data?

    init<T: Encodable>(kind: WatchMessageKind, value: T) throws {
        self.kind = kind
        self.payload = try JSONEncoder.ptpro.encode(value)
    }

    init(kind: WatchMessageKind) { self.kind = kind; self.payload = nil }

    func decode<T: Decodable>(_ type: T.Type) throws -> T {
        guard let payload else { throw WatchMessageError.missingPayload }
        return try JSONDecoder.ptpro.decode(type, from: payload)
    }
}

enum WatchMessageError: Error { case missingPayload }
