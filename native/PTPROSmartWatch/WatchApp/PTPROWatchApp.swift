import SwiftUI
import WatchKit

extension Notification.Name {
    static let ptproRecoverActiveWorkout = Notification.Name("ptpro.recover-active-workout")
}

final class PTPROWatchDelegate: NSObject, WKApplicationDelegate {
    func handleActiveWorkoutRecovery() {
        NotificationCenter.default.post(name: .ptproRecoverActiveWorkout, object: nil)
    }
}

@main
struct PTPROWatchApp: App {
    @WKApplicationDelegateAdaptor(PTPROWatchDelegate.self) private var appDelegate
    @StateObject private var model = WatchAppModel()

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environmentObject(model)
                .task { await model.prepare() }
        }
    }
}
