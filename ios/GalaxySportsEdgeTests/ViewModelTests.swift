import Foundation
import XCTest
@testable import GalaxySportsEdge

/// View-model behaviour: filters, sorting, paging, and the difference between
/// an expected state and a failure.
@MainActor
final class ViewModelTests: XCTestCase {

    private var service: StubSportsService!
    private var directory: URL!

    override func setUp() {
        super.setUp()
        service = StubSportsService()
        directory = Fixtures.scratchDirectory()
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: directory)
        super.tearDown()
    }

    private func makePicksVM() -> PicksViewModel {
        PicksViewModel(service: service, saved: SavedPicksStore(directory: directory))
    }

    // MARK: - The slate

    func testLoadPopulatesTheSlate() async {
        service.slateResult = SlatePage(
            picks: [Fixtures.makePick(id: "a"), Fixtures.makePick(id: "b")],
            meta: SlateMeta(tier: .pro, total: 2, totalAvailableToday: 2))
        let vm = makePicksVM()
        await vm.load()

        XCTAssertEqual(vm.picks.count, 2)
        XCTAssertEqual(vm.meta.tier, .pro)
        guard case .loaded = vm.state else {
            return XCTFail("expected a loaded state")
        }
    }

    func testTheSelectedSportReachesTheService() async {
        let vm = makePicksVM()
        await vm.load()
        await vm.select(sport: .nba)
        XCTAssertEqual(service.slateCalls.last?.sport, .nba)
    }

    func testReSelectingTheActiveFilterDoesNotRefetch() async {
        // Tapping the chip that is already active used to fire a request that
        // returned identical rows, which reads as a refresh that did nothing.
        let vm = makePicksVM()
        await vm.load()
        await vm.select(sport: .nfl)
        let afterFirst = service.slateCalls.count
        await vm.select(sport: .nfl)
        XCTAssertEqual(service.slateCalls.count, afterFirst)
    }

    func testSelectingADifferentDayRefetches() async {
        let vm = makePicksVM()
        await vm.load()
        let before = service.slateCalls.count
        await vm.select(date: Date.now.adding(days: -1))
        XCTAssertEqual(service.slateCalls.count, before + 1)
    }

    func testReselectingTheSameDayDoesNotRefetch() async {
        let vm = makePicksVM()
        await vm.load()
        let before = service.slateCalls.count
        await vm.select(date: vm.selectedDate)
        XCTAssertEqual(service.slateCalls.count, before)
    }

    // MARK: - Ordering

    func testGradedPicksFloatToTheTop() async {
        // A settled pick is worth more to a reader than a marginally
        // higher-ranked unsettled one.
        service.slateResult = SlatePage(picks: [
            Fixtures.makePick(id: "unsettled", grade: .elitePlay, result: nil),
            Fixtures.makePick(id: "graded", grade: .lean, result: .win)
        ], meta: SlateMeta())
        let vm = makePicksVM()
        await vm.load()
        XCTAssertEqual(vm.gradedFirst.first?.id, "graded")
    }

    func testAnUngradedSlateKeepsTheServersOrder() async {
        // Re-sorting every refresh makes the slate jump under a reader's thumb.
        service.slateResult = SlatePage(picks: [
            Fixtures.makePick(id: "a", grade: .lean),
            Fixtures.makePick(id: "b", grade: .elitePlay)
        ], meta: SlateMeta())
        let vm = makePicksVM()
        await vm.load()
        XCTAssertEqual(vm.gradedFirst.map(\.id), ["a", "b"])
    }

    func testWithinAGroupTheBetterGradeComesFirst() async {
        service.slateResult = SlatePage(picks: [
            Fixtures.makePick(id: "lean", grade: .lean, result: .win),
            Fixtures.makePick(id: "elite", grade: .elitePlay, result: .win)
        ], meta: SlateMeta())
        let vm = makePicksVM()
        await vm.load()
        XCTAssertEqual(vm.gradedFirst.map(\.id), ["elite", "lean"])
    }

    // MARK: - Bookmarks

    func testToggleSaveIsLocalAndImmediate() async {
        service.slateResult = SlatePage(picks: [Fixtures.makePick(id: "a")], meta: SlateMeta())
        let vm = makePicksVM()
        await vm.load()
        XCTAssertFalse(vm.isSaved(Fixtures.makePick(id: "a")))
        vm.toggleSave(Fixtures.makePick(id: "a"))
        XCTAssertTrue(vm.isSaved(Fixtures.makePick(id: "a")))
        XCTAssertEqual(vm.savedCount, 1)
    }

    // MARK: - Failure vs expected state

    func testAnErrorBecomesAFailedStateWithTheServersReason() async {
        service.slateError = APIError.gated(reason: "Engine is still collecting data.")
        let vm = makePicksVM()
        await vm.load()
        guard case .failed(let message) = vm.state else {
            return XCTFail("expected a failed state")
        }
        XCTAssertEqual(message, "Engine is still collecting data.")
    }

    func testA404IsSurfacedWithItsOwnMessage() async {
        service.slateError = APIError.notFound
        let vm = makePicksVM()
        await vm.load()
        guard case .failed(let message) = vm.state else {
            return XCTFail("expected a failed state")
        }
        XCTAssertEqual(message, "We couldn't find what you were looking for.")
    }

    func testANonAPIErrorStillProducesAMessage() async {
        service.slateError = NSError(domain: "test", code: 1)
        let vm = makePicksVM()
        await vm.load()
        guard case .failed(let message) = vm.state, !message.isEmpty else {
            return XCTFail("expected a non-empty failure message")
        }
    }

    // MARK: - Scoreboard grouping

    func testScoreboardGroupsLiveFirstThenUpcomingThenFinal() async {
        let now = Date(timeIntervalSince1970: 1_789_000_000)
        service.gamesResult = [
            Fixtures.game(status: .final, commence: now.addingTimeInterval(-7200)),
            Fixtures.game(status: .upcomingScheduled, commence: now.addingTimeInterval(7200)),
            Fixtures.game(status: .live, commence: now)
        ]
        let vm = ScoresViewModel(service: service)
        await vm.load()
        XCTAssertEqual(vm.sections, [.live, .upcoming, .final])
        XCTAssertEqual(vm.liveCount, 1)
    }

    func testScoreboardHidesEmptySections() async {
        service.gamesResult = [Fixtures.game(status: .live, commence: .now)]
        let vm = ScoresViewModel(service: service)
        await vm.load()
        XCTAssertEqual(vm.sections, [.live])
    }

    func testLiveOnlyFiltersServerSideRowsToo() async {
        service.gamesResult = [
            Fixtures.game(id: "live", status: .live, commence: .now),
            Fixtures.game(id: "done", status: .final, commence: .now)
        ]
        let vm = ScoresViewModel(service: service)
        vm.liveOnly = true
        await vm.load()
        XCTAssertEqual(vm.sections, [.live])
        XCTAssertEqual(vm.games(in: .live).map(\.id), ["live"])
    }

    // MARK: - Articles paging

    func testArticlesStopPagingOnAShortPage() async {
        // Guessing a total is how a feed loops forever on a page boundary.
        service.articlesResult = (0..<20).map { Fixtures.article(id: "a\($0)") }
        let vm = ArticlesViewModel(service: service, pageSize: 20)
        await vm.load()
        XCTAssertFalse(vm.reachedEnd)
        XCTAssertTrue(vm.hasMore)
    }

    func testAShortFirstPageMeansTheEnd() async {
        service.articlesResult = (0..<3).map { Fixtures.article(id: "a\($0)") }
        let vm = ArticlesViewModel(service: service, pageSize: 20)
        await vm.load()
        XCTAssertTrue(vm.reachedEnd)
        XCTAssertFalse(vm.hasMore)
    }

    func testLoadMoreAppendsRatherThanReplaces() async {
        service.articlesResult = (0..<30).map { Fixtures.article(id: "a\($0)") }
        let vm = ArticlesViewModel(service: service, pageSize: 20)
        await vm.load()
        XCTAssertEqual(vm.stateCount, 20)
        await vm.loadMore()
        XCTAssertEqual(vm.stateCount, 30)
    }

    func testAFailedLoadMoreKeepsWhatIsOnScreen() async {
        // A reader who is mid-article must not lose the list to a failed
        // "load more".
        service.articlesResult = (0..<30).map { Fixtures.article(id: "a\($0)") }
        let vm = ArticlesViewModel(service: service, pageSize: 20)
        await vm.load()
        service.articlesError = APIError.rateLimited(retryAfter: 30)
        await vm.loadMore()
        XCTAssertEqual(vm.stateCount, 20)
    }

    func testAnEmptyFirstPageIsNotAPagingError() async {
        service.articlesResult = []
        let vm = ArticlesViewModel(service: service, pageSize: 20)
        await vm.load()
        XCTAssertEqual(vm.stateCount, 0)
        XCTAssertFalse(vm.hasMore)
    }

    // MARK: - Ask the model

    func testTheQuestionBoxRefusesTrivialInput() async {
        let vm = AskTheEdgeViewModel(pick: Fixtures.makePick(), service: service)
        vm.pickID = "p1"
        XCTAssertFalse(vm.canSubmit)
        vm.question = "why?"
        XCTAssertFalse(vm.canSubmit)
        vm.question = "What is the biggest factor here?"
        XCTAssertTrue(vm.canSubmit)
    }

    func testSubmittingSendsTheTrimmedQuestion() async {
        let vm = AskTheEdgeViewModel(pick: Fixtures.makePick(), service: service)
        vm.pickID = "p1"
        vm.question = "  What is the biggest factor behind this pick?  "
        await vm.submit()
        XCTAssertEqual(service.explainQuestions, ["What is the biggest factor behind this pick?"])
    }

    func testARefusedExplanationIsShownAsARefusal() async {
        // The route can refuse (budget, upstream, bad question). A canned
        // paragraph in place of a refusal is a fabricated answer.
        service.explanationError = APIError.gated(reason: "The explainer is at its budget.")
        let vm = AskTheEdgeViewModel(pick: Fixtures.makePick(), service: service)
        vm.pickID = "p1"
        vm.question = "What is the biggest factor behind this pick?"
        await vm.submit()
        guard case .failed(let message) = vm.state else {
            return XCTFail("expected a refusal, not an answer")
        }
        XCTAssertEqual(message, "The explainer is at its budget.")
    }

    func testSuggestionsChangeForAnInjuryRiskPick() {
        let ordinary = AskTheEdgeViewModel.suggestions(for: Fixtures.makePick())
        let risky = AskTheEdgeViewModel.suggestions(
            for: Fixtures.makePickWithRisk(.injuryRisk))
        XCTAssertTrue(risky.contains { $0.lowercased().contains("injur") })
        XCTAssertFalse(ordinary.contains { $0.lowercased().contains("injur") })
    }
}

// MARK: - Small conveniences so the tests read as behaviour

private extension LoadState where Value == [Article] {
    var stateCount: Int {
        if case .loaded(let rows) = self { return rows.count }
        return 0
    }
}

extension Fixtures {
    static func article(id: String) -> Article {
        Article(id: id, slug: id, title: "Title \(id)", dek: "Dek", body: "Body",
                author: .desk, publishedAt: .now, heroImageURL: nil, tags: [],
                sport: nil, readMinutes: 3, isPremium: false)
    }

    static func game(id: String = "g1",
                     status: GameStatus,
                     commence: Date) -> Game {
        Game(id: id, sport: .nfl, league: "NFL",
             away: Team(id: "\(id)a", name: "Away"),
             home: Team(id: "\(id)h", name: "Home"),
             awayScore: nil, homeScore: nil,
             status: status, commenceTime: commence,
             awaySpread: 3.5, total: 45.5, edgeIndex: 70,
             restDaysHome: 3, restDaysAway: 3,
             isBackToBackHome: false, isBackToBackAway: false)
    }

    static func makePickWithRisk(_ risk: RiskLevel) -> Pick {
        let base = makePick()
        return Pick(
            id: base.id, sport: base.sport, league: base.league,
            eventName: base.eventName, homeTeam: base.homeTeam,
            awayTeam: base.awayTeam, homeAbbr: base.homeAbbr, awayAbbr: base.awayAbbr,
            selection: base.selection, pickType: base.pickType, line: base.line,
            odds: base.odds, hasBookPrice: base.hasBookPrice, units: base.units,
            analyst: base.analyst, confidence: base.confidence, edgeScore: base.edgeScore,
            dataQualityScore: base.dataQualityScore, tier: base.tier, grade: base.grade,
            risk: risk, reasoning: base.reasoning, reasoningShort: base.reasoningShort,
            consensusPct: base.consensusPct, bookmakerCount: base.bookmakerCount,
            marketImpliedProb: base.marketImpliedProb, winProbability: base.winProbability,
            lineMovement: base.lineMovement, factors: base.factors,
            isFeatured: base.isFeatured, isAuditAvailable: base.isAuditAvailable,
            commenceTime: base.commenceTime, generatedAt: base.generatedAt,
            dataFreshnessAt: base.dataFreshnessAt, result: base.result,
            receiptHash: base.receiptHash)
    }
}

private extension GameStatus {
    /// `.scheduled` shares a name with the test helper parameter, so this
    /// alias keeps the fixtures readable.
    static var upcomingScheduled: GameStatus { .scheduled }
}
