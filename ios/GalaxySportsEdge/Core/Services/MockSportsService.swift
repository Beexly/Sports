import Foundation

/// The offline implementation.
///
/// It exists for three reasons and only three: Xcode previews, a simulator with
/// no network, and tests that need deterministic fixtures. It is **not** the
/// product's data path — `AppConfiguration.useMockData` defaults to `false`, and
/// `LiveSportsService` is what a real build talks to.
///
/// Every value here is labelled as synthetic. A reader must never be able to
/// mistake a fixture for a model output, which is why `meta.containsSeedData`
/// is set: the UI shows a "sample data" banner when it is true.
struct MockSportsService: SportsService {

    /// Small artificial delay so loading states are actually exercised instead
    /// of flashing past in previews.
    var latency: Duration = .milliseconds(250)

    private let fixtures: MockFixtures

    init(fixtures: MockFixtures = MockFixtures()) {
        self.fixtures = fixtures
    }

    private func wait() async throws {
        guard latency > .zero else { return }
        try? await Task.sleep(for: latency)
    }

    // MARK: - Picks

    func slate(sport: Sport?, date: Date) async throws -> SlatePage {
        try await wait()
        let all = fixtures.picks(on: date)
        let filtered = sport.map { target in all.filter { $0.sport == target } } ?? all
        return SlatePage(
            picks: filtered,
            meta: SlateMeta(
                tier: .pro,
                total: filtered.count,
                totalAvailableToday: max(filtered.count, all.count),
                hitDailyLimit: filtered.count < all.count,
                dayKey: LiveSportsService.dayKey(for: date),
                canSeeConfidence: true,
                canSeeFactorBreakdown: true,
                containsSeedData: true))
    }

    // MARK: - Games

    func games(sport: Sport?, date: Date) async throws -> [Game] {
        try await wait()
        let all = fixtures.games(on: date)
        return sport.map { target in all.filter { $0.sport == target } } ?? all
    }

    // MARK: - Articles

    func articles(page: Int, limit: Int) async throws -> [Article] {
        try await wait()
        let all = fixtures.articles
        let start = max(0, (page - 1) * limit)
        guard start < all.count else { return [] }
        return Array(all[start..<min(all.count, start + limit)])
    }

    func article(slug: String) async throws -> Article {
        try await wait()
        guard let article = fixtures.articles.first(where: { $0.slug == slug }) else {
            throw APIError.notFound
        }
        return article
    }

    // MARK: - Account

    func profile() async throws -> UserProfile {
        try await wait()
        return fixtures.profile
    }

    func deleteAccount() async throws {
        try await wait()
    }

    // MARK: - Watchlist

    func followlist() async throws -> [FollowedEntity] {
        try await wait()
        return fixtures.follows
    }

    func setFollowed(kind: FollowedEntity.Kind, entityId: String, followed: Bool) async throws {
        try await wait()
    }

    func registerDeviceToken(_ token: String, subscribing: Bool) async throws {
        try await wait()
    }

    // MARK: - Ask the model

    func explain(pickID: String, question: String) async throws -> Explanation {
        try await wait()
        return Explanation(
            id: pickID,
            text: """
            This is a sample answer, not model output. The live app sends this \
            question to \(AppConfiguration.Route.pickExplain(pickID)) and returns \
            whatever the explainer returns — including a refusal, which it shows \
            as-is rather than substituting a canned paragraph.
            """,
            modelName: "sample",
            register: "sample")
    }

    // MARK: - Billing

    func checkoutURL(tier: UserProfile.Tier, interval: BillingInterval) async throws -> URL {
        try await wait()
        guard let url = URL(string: "\(AppConfiguration.webOrigin.absoluteString)/subscribe?tier=\(tier.rawValue)&interval=\(interval.rawValue)") else {
            throw APIError.invalidURL
        }
        return url
    }

    func billingPortalURL() async throws -> URL {
        try await wait()
        AppConfiguration.webOrigin
    }
}
