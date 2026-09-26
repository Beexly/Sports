import Foundation
import Observation

/// Who is reading, and what they are entitled to.
///
/// The cookie jar is the credential. The profile is a cache of what the server
/// says about the session holder — the app never decides a tier locally,
/// because a locally-decided tier is a locally-forgeable paywall.
@MainActor
@Observable
final class AuthSession {

    enum Status: Equatable {
        /// A credential was on disk but the server has not confirmed it yet.
        case unknown
        case signedOut
        case signedIn(UserProfile)
        case deletingAccount

        var profile: UserProfile? {
            if case .signedIn(let profile) = self { return profile }
            return nil
        }

        var isSignedIn: Bool { profile != nil }
    }

    private(set) var status: Status = .unknown
    private(set) var lastError: String?

    private let service: SportsService
    private let client: APIClient
    private var store: SessionCookieStore

    init(service: SportsService, client: APIClient = .shared) {
        self.service = service
        self.client = client
        self.store = .restore()
    }

    var tier: UserProfile.Tier { status.profile?.tier ?? .free }

    /// True when a credential is on disk. Not proof of a valid session — the
    /// cookie could have expired or been revoked — which is why launch calls
    /// `restore()` and downgrades to signed-out when the server says so.
    var hasStoredSession: Bool { store.hasSessionCookie }

    // MARK: - Launch

    /// Restores the cookie and confirms it. A rejected cookie clears the jar;
    /// it is not left on disk to fail every subsequent request.
    func restore() async {
        guard store.hasSessionCookie else {
            status = .signedOut
            return
        }
        await client.adopt(cookies: store.cookies)
        await refreshProfile()
    }

    // MARK: - Sign in / out

    /// Adopts the cookies the web flow produced and loads the profile.
    /// Returns false when the flow handed back nothing usable, so the caller
    /// stays on the sign-in screen instead of pretending it worked.
    @discardableResult
    func adopt(jar: [HTTPCookie]) async -> Bool {
        let session = SessionCookieStore.sessionCookies(from: jar)
        guard !session.isEmpty else {
            status = .signedOut
            lastError = "Sign-in finished without a session. Please try again."
            return false
        }
        store.absorb(session)
        store.persist()
        await client.adopt(cookies: store.cookies)
        await refreshProfile()
        return status.isSignedIn
    }

    func signOut() async {
        await client.clearSession()
        store.clear()
        status = .signedOut
        lastError = nil
    }

    // MARK: - Profile

    func refreshProfile() async {
        guard hasStoredSession else {
            status = .signedOut
            return
        }
        do {
            let profile = try await service.profile()
            status = .signedIn(profile)
            lastError = nil
        } catch let error as APIError {
            switch error {
            case .unauthorized:
                // The credential is dead. Wipe it rather than retrying with it.
                await signOut()
            default:
                // A network blip is not a de-authentication. Keep the session
                // and surface the failure instead of logging the reader out
                // because their train went through a tunnel.
                if status == .unknown { status = .signedOut }
                lastError = error.errorDescription
            }
        } catch {
            lastError = error.localizedDescription
            if status == .unknown { status = .signedOut }
        }
    }

    // MARK: - Account deletion

    /// Why the failure is a type and not a bare `String`: `Result`'s second
    /// parameter is constrained to `Error`, so `Result<Void, String>` does not
    /// compile. Wrapping the sentence keeps the one call site a one-word
    /// change and gives the reason somewhere to live.
    struct Failure: LocalizedError, Sendable {
        let message: String
        var errorDescription: String? { message }
    }

    /// App Store guideline 5.1.1(v). Deletes server-side — which cascades
    /// sessions, watchlist, subscription and push tokens off the user — and
    /// then wipes every local trace. Returns the reason on failure so the
    /// sheet can explain itself instead of just closing.
    func deleteAccount() async -> Result<Void, Failure> {
        guard hasStoredSession else {
            return .failure(Failure(message: "You're not signed in."))
        }
        status = .deletingAccount
        do {
            try await service.deleteAccount()
            await signOut()
            return .success(())
        } catch {
            status = .signedOut
            let reason = (error as? APIError)?.errorDescription ?? error.localizedDescription
            lastError = reason
            return .failure(Failure(message: reason))
        }
    }
}
