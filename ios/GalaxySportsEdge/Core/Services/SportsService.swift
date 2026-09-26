import Foundation

/// One day of picks plus the entitlement metadata that explains it.
struct SlatePage: Sendable, Hashable {
    let picks: [Pick]
    let meta: SlateMeta

    static let empty = SlatePage(picks: [], meta: SlateMeta())
}

/// The model's answer to a question about one pick.
struct Explanation: Sendable, Hashable, Identifiable {
    let id: String
    let text: String
    let modelName: String?
    let register: String?
}

/// A team or player the reader follows. This is the real watchlist: the backend
/// gates it to `TEAM` / `PLAYER` entity ids, not to picks.
struct FollowedEntity: Identifiable, Sendable, Hashable {
    enum Kind: String, Sendable, CaseIterable {
        case team = "TEAM"
        case player = "PLAYER"

        var display: String { self == .team ? "Teams" : "Players" }
    }

    let id: String
    let kind: Kind
    let entityId: String
    let createdAt: Date

    /// `FollowedEntity.id` is the watchlist row id; two rows can never share an
    /// entity, so this is stable for a given follow.
    var displayKey: String { "\(kind.rawValue):\(entityId)" }
}

/// Everything the app can ask the backend. One protocol, two implementations:
/// `LiveSportsService` (real routes) and `MockSportsService` (offline).
///
/// The protocol is the only thing views know about, which is what makes the
/// app testable without a network and swappable without touching a screen.
protocol SportsService: Sendable {
    func slate(sport: Sport?, date: Date) async throws -> SlatePage
    func games(sport: Sport?, date: Date) async throws -> [Game]
    func articles(page: Int, limit: Int) async throws -> [Article]
    func article(slug: String) async throws -> Article
    func profile() async throws -> UserProfile
    func followlist() async throws -> [FollowedEntity]
    func setFollowed(kind: FollowedEntity.Kind, entityId: String, followed: Bool) async throws
    func explain(pickID: String, question: String) async throws -> Explanation
    func registerDeviceToken(_ token: String, subscribing: Bool) async throws
    func deleteAccount() async throws
    func checkoutURL(tier: UserProfile.Tier, interval: BillingInterval) async throws -> URL
    func billingPortalURL() async throws -> URL
}

enum BillingInterval: String, Sendable, CaseIterable, Identifiable {
    case month, year
    var id: String { rawValue }
    var display: String { self == .month ? "Monthly" : "Yearly" }
}
