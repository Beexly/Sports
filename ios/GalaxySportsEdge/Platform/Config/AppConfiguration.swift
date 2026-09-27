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

    // MARK: - Overrides
    //
    // Everything below can be changed without editing this file, so one built
    // binary can be pointed at a different dataset. Precedence, highest first:
    //
    //   1. A launch argument: `-GSEBaseURL https://staging.example.com`
    //      This is the one that makes the build reusable. Running against
    //      another dataset is a launch option, not a source edit and a rebuild.
    //   2. A value in Info.plist, editable per build configuration.
    //   3. The compiled-in default.
    //
    // An override that is present but unusable falls back to the default and
    // says so, rather than being ignored: a typo in a base URL would otherwise
    // be indistinguishable from a backend outage.

    private static let arguments = CommandLine.arguments

    /// Resolves one configuration key. Internal rather than private so the
    /// precedence can be tested without launching a process.
    static func override(_ key: String, in arguments: [String] = CommandLine.arguments) -> String? {
        let flag = "-\(key)"
        if let index = arguments.firstIndex(of: flag), index + 1 < arguments.count {
            return arguments[index + 1]
        }
        return Bundle.main.object(forInfoDictionaryKey: key) as? String
    }

    static func booleanOverride(_ key: String, in arguments: [String] = CommandLine.arguments) -> Bool? {
        guard let raw = override(key, in: arguments) else { return nil }
        switch raw.lowercased() {
        case "1", "true", "yes", "on": return true
        case "0", "false", "no", "off": return false
        default: return nil
        }
    }

    /// An override has to be a real absolute URL. A relative string or a typo
    /// is rejected here rather than becoming a request that looks exactly like
    /// a backend outage.
    static func url(from raw: String) -> URL? {
        guard let parsed = URL(string: raw), parsed.scheme != nil, parsed.host != nil else {
            return nil
        }
        return parsed
    }

    private static func url(_ key: String, default fallback: URL) -> URL {
        guard let raw = override(key) else { return fallback }
        guard let parsed = url(from: raw) else {
            assertionFailure("\(key) is \"\(raw)\", which is not an absolute URL; using \(fallback).")
            return fallback
        }
        return parsed
    }

    // MARK: - Origins

    private static let defaultOrigin = URL(string: "https://galaxysportsedge.com")!

    /// The GSE web origin. Used for the NextAuth sign-in page and the
    /// Stripe-hosted checkout/portal pages, both opened in a web session
    /// because they are web surfaces, not API calls.
    static let webOrigin = url("GSEWebOrigin", default: defaultOrigin)

    /// API root. `Endpoint` appends `api/` to it.
    static let baseURL = url("GSEBaseURL", default: defaultOrigin)

    static let apiPrefix = "api"

    // MARK: - Feature switches

    /// `false` sends the app at the real backend. This is the product's data
    /// path; the mock service exists for previews, offline and tests.
    ///
    /// Launch with `-GSEUseMockData true` to run the whole app against the
    /// bundled sample slate, with no backend at all.
    static var useMockData: Bool { booleanOverride("GSEUseMockData") ?? false }

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
