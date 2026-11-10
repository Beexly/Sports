import Foundation
import Observation

/// The composition root.
///
/// Everything the app is built from is assembled here, once, and handed to the
/// view tree through the environment. Screens never construct a service, a
/// store or a client, which is what makes them testable: a test builds an
/// `AppEnvironment` with stubs and the whole app runs against them.
@MainActor
@Observable
final class AppEnvironment {

    let service: SportsService
    let bets: BetStore
    let saved: SavedPicksStore
    let auth: AuthSession
    let subscription: SubscriptionStore
    let push: PushNotificationManager
    let router: AppRouter

    /// NOTE (isolation): default arguments are evaluated at the *call site*,
    /// which is a nonisolated context — so a `bets: BetStore = BetStore()`
    /// default fails to compile with "call to main actor-isolated initializer
    /// in a synchronous nonisolated context". Taking optionals and building in
    /// the (main-actor-isolated) body is the only form that type-checks, and
    /// it keeps every seam injectable for tests.
    init(service: SportsService? = nil,
         bets: BetStore? = nil,
         saved: SavedPicksStore? = nil,
         auth: AuthSession? = nil,
         subscription: SubscriptionStore? = nil,
         push: PushNotificationManager? = nil,
         router: AppRouter? = nil) {
        let resolvedService = service ?? AppEnvironment.makeService()
        self.service = resolvedService
        self.bets = bets ?? BetStore()
        self.saved = saved ?? SavedPicksStore()
        self.auth = auth ?? AuthSession(service: resolvedService)
        self.subscription = subscription ?? SubscriptionStore(service: resolvedService)
        self.push = push ?? PushNotificationManager(service: resolvedService)
        self.router = router ?? .shared
    }

    static func makeService() -> SportsService {
        AppConfiguration.useMockData ? MockSportsService() : LiveSportsService()
    }

    // MARK: - Lifecycle

    /// Runs once at launch: restore the session, warm the entitlement, start
    /// the StoreKit listener. Deliberately does *not* ask for notification
    /// permission — a permission prompt before the reader has seen anything is
    /// the fastest way to get a denial, and a denial is permanent.
    func start() async {
        await auth.restore()
        await subscription.load()
        subscription.startListeningForTransactions()
    }
}
