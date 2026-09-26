import Foundation
import XCTest
@testable import GalaxySportsEdge

/// A scriptable `SportsService` for tests.
///
/// Tests that reach for a real network fail for reasons that have nothing to do
/// with the thing under test. This stub records what it was asked and replays
/// what it was told, so a test asserts on *behaviour* — what the caller did
/// with the answer — not on whether a server was up.
final class StubSportsService: SportsService, @unchecked Sendable {

    // Recorded calls, for asserting a filter actually reached the wire.
    private(set) var slateCalls: [(sport: Sport?, date: Date)] = []
    private(set) var gameCalls: [(sport: Sport?, date: Date)] = []
    private(set) var articleCalls: [(page: Int, limit: Int)] = []
    private(set) var followWrites: [(kind: FollowedEntity.Kind, id: String, followed: Bool)] = []
    private(set) var deviceTokens: [(token: String, subscribing: Bool)] = []
    private(set) var explainQuestions: [String] = []
    private(set) var deleteAccountCalls = 0

    // Canned answers
    var slateResult: SlatePage = .empty
    var slateError: Error?
    var gamesResult: [Game] = []
    var gamesError: Error?
    var articlesResult: [Article] = []
    var articlesError: Error?
    var articleResult: Article?
    var articleError: Error?
    var profileResult: UserProfile = Fixtures.freeProfile
    var profileError: Error?
    var followlistResult: [FollowedEntity] = []
    var explanationResult = Explanation(id: "p1",
                                       text: "Because the line is soft.",
                                       modelName: "test",
                                       register: "test")
    var explanationError: Error?
    var deleteAccountError: Error?

    // MARK: - SportsService

    func slate(sport: Sport?, date: Date) async throws -> SlatePage {
        slateCalls.append((sport, date))
        if let slateError { throw slateError }
        return slateResult
    }

    func games(sport: Sport?, date: Date) async throws -> [Game] {
        gameCalls.append((sport, date))
        if let gamesError { throw gamesError }
        return gamesResult
    }

    func articles(page: Int, limit: Int) async throws -> [Article] {
        articleCalls.append((page, limit))
        if let articlesError { throw articlesError }
        let start = max(0, (page - 1) * limit)
        guard start < articlesResult.count else { return [] }
        return Array(articlesResult[start..<min(articlesResult.count, start + limit)])
    }

    func article(slug: String) async throws -> Article {
        if let articleError { throw articleError }
        guard let articleResult else { throw APIError.notFound }
        return articleResult
    }

    func profile() async throws -> UserProfile {
        if let profileError { throw profileError }
        return profileResult
    }

    func followlist() async throws -> [FollowedEntity] {
        followlistResult
    }

    func setFollowed(kind: FollowedEntity.Kind, entityId: String, followed: Bool) async throws {
        followWrites.append((kind, entityId, followed))
    }

    func explain(pickID: String, question: String) async throws -> Explanation {
        explainQuestions.append(question)
        if let explanationError { throw explanationError }
        return explanationResult
    }

    func registerDeviceToken(_ token: String, subscribing: Bool) async throws {
        deviceTokens.append((token, subscribing))
    }

    func deleteAccount() async throws {
        deleteAccountCalls += 1
        if let deleteAccountError { throw deleteAccountError }
    }

    func checkoutURL(tier: UserProfile.Tier, interval: BillingInterval) async throws -> URL {
        URL(string: "https://checkout.example/\(tier.rawValue)")!
    }

    func billingPortalURL() async throws -> URL {
        URL(string: "https://billing.example/portal")!
    }
}

// MARK: - Fixtures

enum Fixtures {

    static func makePick(id: String = "p1",
                         sport: Sport = .nfl,
                         selection: String = "Chiefs -3.5",
                         grade: PickGrade = .strongPlay,
                         result: PickResult? = nil,
                         hasBookPrice: Bool = true,
                         confidence: Int? = 82) -> Pick {
        Pick(
            id: id,
            sport: sport,
            league: sport.display,
            eventName: "Kansas City Chiefs @ Buffalo Bills",
            homeTeam: "Buffalo Bills",
            awayTeam: "Kansas City Chiefs",
            homeAbbr: "BUF",
            awayAbbr: "KC",
            selection: selection,
            pickType: .spread,
            line: -3.5,
            odds: hasBookPrice ? -110 : 0,
            hasBookPrice: hasBookPrice,
            units: 1.0,
            analyst: .desk,
            confidence: confidence,
            edgeScore: 5.0,
            dataQualityScore: 90,
            tier: .premium,
            grade: grade,
            risk: .moderate,
            reasoning: "The line is soft.",
            reasoningShort: "Soft line.",
            consensusPct: 52,
            bookmakerCount: 9,
            marketImpliedProb: 0.523,
            winProbability: 0.58,
            lineMovement: nil,
            factors: [],
            isFeatured: false,
            isAuditAvailable: true,
            commenceTime: Date(timeIntervalSince1970: 1_789_000_000),
            generatedAt: Date(timeIntervalSince1970: 1_788_900_000),
            dataFreshnessAt: nil,
            result: result,
            receiptHash: "sha256:test")
    }

    static func makeBet(odds: Int = -110,
                        stake: Double = 100,
                        status: BetStatus = .won) -> UserBet {
        UserBet(
            eventName: "Chiefs @ Bills",
            selection: "Chiefs -3.5",
            odds: odds,
            stake: stake,
            sportsbook: "Test",
            placedAt: Date(timeIntervalSince1970: 1_789_000_000),
            status: status)
    }

    static let freeProfile = UserProfile(
        id: "u1", displayName: "Sam Reader", email: "[EMAIL]",
        tier: .free, memberSince: Date(timeIntervalSince1970: 1_700_000_000),
        avatarURL: nil)

    static let proProfile = UserProfile(
        id: "u1", displayName: "Sam Reader", email: "[EMAIL]",
        tier: .pro, memberSince: Date(timeIntervalSince1970: 1_700_000_000),
        avatarURL: nil)

    /// A scratch directory per test, so persistence tests cannot see each
    /// other's files or the simulator's real data.
    static func scratchDirectory(_ name: String = UUID().uuidString) -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("gse-tests-\(name)", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
}
