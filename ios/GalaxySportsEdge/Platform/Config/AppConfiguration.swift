import Foundation

/// Environment-dependent constants, and the one place that names a backend
/// route.
///
/// The public surface is not versioned by a header or a path prefix: the
/// Next.js app mounts everything at `/api/*`, and the separate `/api/v1/*`
/// namespace holds the raw engine signals. `Endpoint` therefore joins
/// `baseURL + "api" + path`, and a path opts into the v1 namespace itself by
/// starting with `"v1/"`.
enum AppConfiguration {

    // MARK: - Origins

    /// The GSE web origin. Used for the NextAuth sign-in page and the
    /// Stripe-hosted checkout/portal pages, both opened in a web session
    /// because they are web surfaces, not API calls.
    static let webOrigin = URL(string: "https://galaxysportsedge.com")!

    /// API root. `Endpoint` appends `api/` to it.
    static let baseURL = URL(string: "https://galaxysportsedge.com")!

    static let apiPrefix = "api"

    // MARK: - Feature switches

    /// `false` sends the app at the real backend. This is the product's data
    /// path; the mock service exists for previews, offline and tests.
    static let useMockData = false

    /// App Store IAP is the eventual billing path, but the backend's live
    /// billing today is Stripe — `/api/subscriptions/checkout` returns a hosted
    /// checkout URL that works with zero App Store Connect setup. Turning this
    /// on before the products exist AND `/api/subscriptions/verify` can redeem
    /// a signed transaction would sell subscriptions the server cannot honour.
    static let usesAppStoreIAP = false

    /// Empty until the products are created in App Store Connect.
    /// `SubscriptionStore` reports "not configured" rather than pretending an
    /// empty list is an error.
    static let storeKitProductIDs: [String] = []

    // MARK: - Networking

    static let timeout: TimeInterval = 20

    /// How many retryable failures are retried before the UI sees one.
    static let maxRetries = 2

    /// First backoff between retries; doubles each attempt.
    static let retryBaseDelay: TimeInterval = 0.6

    // MARK: - Routes

    enum Route {
        static let picks = "picks"
        static func pickExplain(_ id: String) -> String { "picks/\(id)/explain" }
        static let games = "games"
        static let articles = "blog"
        static let me = "me"
        static let watchlist = "watchlist"
        static let watchlistFollow = "watchlist/follow"
        static let watchlistUnfollow = "watchlist/unfollow"
        static let pushAPNs = "push/apns"
        static let subscriptionCheckout = "subscriptions/checkout"
        static let subscriptionPortal = "subscriptions/portal"
        static let signals = "v1/signals"
        static let probabilities = "v1/probabilities"
    }
}
