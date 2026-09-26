import Foundation
import Observation
import UIKit
import UserNotifications

/// APNs registration and delivery bookkeeping.
///
/// Two honest rules, both learned the hard way in this space:
///
/// 1. **A token is not a subscription.** APNs hands out a device token the
///    moment `registerForRemoteNotifications` returns, long before the reader
///    has answered the permission prompt. Registering the token with the server
///    at that point produces a row the server will try to push to for someone
///    who has never been asked. Registration is therefore gated on granted
///    authorization.
/// 2. **A denied prompt is a settled answer.** `UNAuthorizationStatus.denied`
///    means stop asking. Re-prompting a reader who said no is how an app gets
///    deleted.
@MainActor
@Observable
final class PushNotificationManager: NSObject {

    enum Status: Equatable {
        case unknown
        /// Notifications are unavailable here (iPad simulator, restricted
        /// environment). Not an error worth showing.
        case unsupported
        case notDetermined
        case denied
        case authorized(deviceToken: String?)
        case failed(String)

        var isAuthorized: Bool {
            if case .authorized = self { return true }
            return false
        }
    }

    private(set) var status: Status = .unknown
    private(set) var deviceToken: String?
    private(set) var lastRegistrationError: String?

    private let service: SportsService
    private let center: UNUserNotificationCenter
    private let registerForRemoteNotifications: () -> Void

    /// The injection point exists so registration can be tested without a real
    /// APNs handshake, which a unit test cannot produce.
    init(service: SportsService,
         center: UNUserNotificationCenter = .current(),
         registerForRemoteNotifications: @escaping () -> Void = {
             UIApplication.shared.registerForRemoteNotifications()
         }) {
        self.service = service
        self.center = center
        self.registerForRemoteNotifications = registerForRemoteNotifications
        super.init()
    }

    // MARK: - Authorization

    /// Asks for permission the first time, and quietly does nothing after.
    ///
    /// There is no "can this device register for remote notifications" query to
    /// ask first. APNs answers that question by refusing, and the refusal
    /// arrives at `didFailToRegister`.
    func requestAuthorization() async {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            await register()
        case .denied:
            status = .denied
        case .notDetermined:
            do {
                let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
                if granted {
                    await register()
                } else {
                    status = .denied
                }
            } catch {
                status = .failed(error.localizedDescription)
            }
        @unknown default:
            // A status this build has not been taught. Treat it as "not asked"
            // rather than guessing at a permission.
            status = .notDetermined
        }
    }

    /// Registers with APNs. The token arrives later, via the app delegate.
    func register() async {
        status = .authorized(deviceToken: deviceToken)
        registerForRemoteNotifications()
    }

    /// Called by the app delegate when APNs issues a token. Hex-encodes it and
    /// registers it server-side — but only once the reader has actually
    /// granted permission, per rule 1 above.
    func didRegister(deviceToken data: Data) async {
        let hex = data.map { String(format: "%02x", $0) }.joined()
        deviceToken = hex
        status = .authorized(deviceToken: hex)

        guard await isAuthorizedBySystem() else { return }
        await sendToBackend(token: hex, subscribing: true)
    }

    /// APNs has no capability query, so the only way to learn that this device
    /// cannot register is for registration to fail. That is what
    /// `.unsupported` documents -- "unavailable here, not an error worth
    /// showing" -- so the refusal lands there and the detail is kept for the
    /// log rather than shown to a reader who cannot act on it.
    func didFailToRegister(error: Error) {
        lastRegistrationError = error.localizedDescription
        status = .unsupported
    }

    // MARK: - Backend

    private func isAuthorizedBySystem() async -> Bool {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral: return true
        case .denied, .notDetermined: return false
        @unknown default: return false
        }
    }

    private func sendToBackend(token: String, subscribing: Bool) async {
        do {
            try await service.registerDeviceToken(token, subscribing: subscribing)
            lastRegistrationError = nil
        } catch {
            // Losing a push registration is not worth interrupting the reader
            // for. It is surfaced for the next launch to retry.
            lastRegistrationError = (error as? APIError)?.errorDescription
                ?? error.localizedDescription
        }
    }

    /// Removes this device from the server's push list. Called on sign-out and
    /// before account deletion, so a sold device stops receiving another
    /// person's graded picks.
    func unregister() async {
        guard let token = deviceToken else { return }
        await sendToBackend(token: token, subscribing: false)
        deviceToken = nil
    }
}
