import Foundation

/// The real backend. Every path here is a route that exists in
/// `apps/web/app/api/**` on `feat/ios-swiftui`.
struct LiveSportsService: SportsService {

    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    // MARK: - Day keys

    /// The picks route resolves `?date=` against **Eastern** time
    /// (`resolveSlateWindow`), so the app must send an Eastern day key. Sending
    /// a device-local key silently returns the wrong slate for anyone west of
    /// New York in the evening.
    static let eastern = TimeZone(identifier: "America/New_York") ?? .gmt

    static let dayKeyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = eastern
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    static func dayKey(for date: Date) -> String {
        dayKeyFormatter.string(from: date)
    }

    // MARK: - Picks

    func slate(sport: Sport?, date: Date) async throws -> SlatePage {
        var query = ["date": Self.dayKey(for: date)]
        // Omitted when the reader wants everything, so the server decides what
        // the full slate is rather than the app hard-coding "NFL". When a
        // sport IS chosen the app sends the sport's key token: the route
        // matches it case-insensitively as a substring of `Sport.key`
        // ("americanfootball_nfl" contains "nfl").
        if let sport { query["sport"] = sport.rawValue }
        let endpoint = Endpoint(path: AppConfiguration.Route.picks, query: query)
        let envelope: Envelope<[PickDTO]> = try await client.getEnvelope(endpoint, as: [PickDTO].self)
        let payload = try envelope.payload()
        let meta = envelope.meta?.toSlateMeta() ?? SlateMeta()
        return SlatePage(picks: payload.map { $0.toDomain() }, meta: meta)
    }

    // MARK: - Games

    func games(sport: Sport?, date: Date) async throws -> [Game] {
        var query = ["date": Self.dayKey(for: date)]
        if let sport { query["sport"] = sport.rawValue }
        let endpoint = Endpoint(path: AppConfiguration.Route.games, query: query)
        let envelope: Envelope<[GameDTO]> = try await client.getEnvelope(endpoint, as: [GameDTO].self)
        return try envelope.payload().map { $0.toDomain() }
    }

    // MARK: - Articles

    func articles(page: Int, limit: Int) async throws -> [Article] {
        let endpoint = Endpoint(path: AppConfiguration.Route.articles,
                                query: ["page": "\(page)", "limit": "\(limit)"])
        let envelope: Envelope<[ArticleDTO]> = try await client.getEnvelope(endpoint, as: [ArticleDTO].self)
        return try envelope.payload().map { $0.toDomain() }
    }

    func article(slug: String) async throws -> Article {
        // The blog route keys detail on `slug` in the query, not the path.
        let endpoint = Endpoint(path: AppConfiguration.Route.articles, query: ["slug": slug])
        let envelope: Envelope<ArticleDTO> = try await client.getEnvelope(endpoint, as: ArticleDTO.self)
        return try envelope.payload().toDomain()
    }

    // MARK: - Account

    func profile() async throws -> UserProfile {
        let endpoint = Endpoint(path: AppConfiguration.Route.me, requiresAuth: true)
        let envelope: Envelope<MeDTO> = try await client.getEnvelope(endpoint, as: MeDTO.self)
        return try envelope.payload().toDomain()
    }

    /// App Store guideline 5.1.1(v): in-app account deletion. The server
    /// cascades every child row (sessions, watchlist, subscription, push
    /// tokens) off the user, so a successful 200 really is a deleted account.
    func deleteAccount() async throws {
        let endpoint = Endpoint(path: AppConfiguration.Route.me, method: .delete, requiresAuth: true)
        try await client.deleteVoid(endpoint)
    }

    // MARK: - Watchlist

    func followlist() async throws -> [FollowedEntity] {
        let endpoint = Endpoint(path: AppConfiguration.Route.watchlist, requiresAuth: true)
        let envelope: Envelope<[WatchlistEntryDTO]> =
            try await client.getEnvelope(endpoint, as: [WatchlistEntryDTO].self)
        return try envelope.payload().compactMap { dto in
            guard let kind = FollowedEntity.Kind(rawValue: dto.entityType) else { return nil }
            return FollowedEntity(id: dto.id,
                                  kind: kind,
                                  entityId: dto.entityId,
                                  createdAt: dto.createdAt ?? .distantPast)
        }
    }

    func setFollowed(kind: FollowedEntity.Kind, entityId: String, followed: Bool) async throws {
        struct Body: Encodable {
            let entityType: String
            let entityId: String
        }
        let route = followed
            ? AppConfiguration.Route.watchlistFollow
            : AppConfiguration.Route.watchlistUnfollow
        let endpoint = Endpoint(path: route, method: .post, requiresAuth: true)
        try await client.postVoid(endpoint,
                                  body: Body(entityType: kind.rawValue, entityId: entityId))
    }

    // MARK: - Ask the model

    func explain(pickID: String, question: String) async throws -> Explanation {
        struct Body: Encodable { let question: String }
        let endpoint = Endpoint(path: AppConfiguration.Route.pickExplain(pickID),
                                method: .post,
                                requiresAuth: true)
        let envelope: Envelope<ExplanationDTO> =
            try await client.post(endpoint, body: Body(question: question), as: Envelope<ExplanationDTO>.self)
        let payload = try envelope.payload()
        return Explanation(id: pickID,
                           text: payload.explanation,
                           modelName: payload.modelName,
                           register: payload.register)
    }

    // MARK: - Push

    /// APNs device tokens are registered against a **server-to-server** route
    /// (`/api/push/apns`), not the browser Web Push route. That distinction
    /// matters: `/api/push/subscribe` enforces a browser-origin CSRF check,
    /// because Web Push only exists in a browser. A native app has no Origin
    /// header and would be rejected by a check that is correct for the web and
    /// wrong for it.
    func registerDeviceToken(_ token: String, subscribing: Bool) async throws {
        struct Body: Encodable {
            let token: String
            let platform: String
        }
        // Register and unregister are the SAME path with different methods.
        // The web `/api/push/unsubscribe` is deliberately not used: it enforces
        // a browser-origin CSRF check, which is right for Web Push and would
        // reject every native caller.
        let endpoint = Endpoint(path: AppConfiguration.Route.pushAPNs,
                                method: subscribing ? .post : .delete,
                                requiresAuth: true)
        try await client.postVoid(endpoint, body: Body(token: token, platform: "ios"))
    }

    // MARK: - Billing

    struct CheckoutRequest: Encodable {
        let tier: String
        let interval: String
        let clientIntentId: String
    }

    private struct CheckoutResponse: Decodable, Sendable { let url: String? }

    /// Returns a Stripe-hosted checkout URL. The app opens it in an
    /// `ASWebAuthenticationSession` — it is a web surface, not an API response.
    func checkoutURL(tier: UserProfile.Tier, interval: BillingInterval) async throws -> URL {
        struct Body: Encodable {
            let tier: String
            let interval: String
            let clientIntentId: String
        }
        let endpoint = Endpoint(path: AppConfiguration.Route.subscriptionCheckout,
                                method: .post,
                                requiresAuth: true)
        let response: CheckoutResponse = try await client.post(
            endpoint,
            body: Body(tier: tier.rawValue,
                       interval: interval.rawValue,
                       clientIntentId: UUID().uuidString),
            as: CheckoutResponse.self)
        guard let raw = response.url, let url = URL(string: raw) else {
            throw APIError.decoding("checkout url missing")
        }
        return url
    }

    func billingPortalURL() async throws -> URL {
        let endpoint = Endpoint(path: AppConfiguration.Route.subscriptionPortal,
                                method: .post,
                                requiresAuth: true)
        let response: CheckoutResponse = try await client.post(
            endpoint, body: CheckoutRequest(tier: "PRO", interval: "month", clientIntentId: UUID().uuidString),
            as: CheckoutResponse.self)
        guard let raw = response.url, let url = URL(string: raw) else {
            throw APIError.decoding("portal url missing")
        }
        return url
    }
}
