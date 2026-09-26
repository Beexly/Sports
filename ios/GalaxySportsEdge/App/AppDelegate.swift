import SwiftUI
import UIKit
import UserNotifications

/// The app delegate exists for exactly three reasons, all of them things
/// SwiftUI's `App` lifecycle does not surface:
///
/// 1. APNs delivers its token and its failures to the app delegate, not to a
///    SwiftUI type.
/// 2. `UNUserNotificationCenterDelegate` is a class-bound ObjC protocol, so
///    foreground presentation has to be implemented on a class.
/// 3. A graded pick that arrives while the app is open should still be shown;
///    the default behaviour drops it silently.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    /// Set by the composition root once the environment exists. Weak, so the
    /// delegate never keeps the environment alive.
    static weak var environment: AppEnvironment?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // MARK: - APNs

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        guard let push = Self.environment?.push else { return }
        Task { @MainActor in await push.didRegister(deviceToken: deviceToken) }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        guard let push = Self.environment?.push else { return }
        Task { @MainActor in push.didFailToRegister(error: error) }
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler:
                                @escaping (UNNotificationPresentationOptions) -> Void) {
        // Without this, a pick graded while the reader is looking at the slate
        // is dropped, and the only way to learn about it is a manual refresh.
        completionHandler([.banner, .sound, .badge])
    }

    /// A reader tapping a graded-pick notification lands on that pick, not on
    /// whatever tab they happened to leave open.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        defer { completionHandler() }
        let info = response.notification.request.content.userInfo
        guard let pickID = info["pickId"] as? String, !pickID.isEmpty else { return }
        Task { @MainActor in AppRouter.shared.pendingPickID = pickID }
    }
}

/// A one-slot mailbox for "the app was opened for this pick".
///
/// Notification taps and deep links both need to hand a pick to a tab that may
/// not be mounted yet. A shared observable box is the smallest thing that
/// solves it without threading a router through every view.
@MainActor
@Observable
final class AppRouter {
    static let shared = AppRouter()

    enum Tab: Hashable {
        case edge, scores, reads, myBets, profile
    }

    var pendingPickID: String?
    var selectedTab: Tab = .edge

    /// Consumes the pending pick exactly once, so coming back to The Edge later
    /// does not re-navigate to it.
    func takePendingPickID() -> String? {
        defer { pendingPickID = nil }
        return pendingPickID
    }
}
