import Foundation
import XCTest
@testable import GalaxySportsEdge

/// Persistence, statistics and the local bet log.
@MainActor
final class BetStoreTests: XCTestCase {

    private var directory: URL!

    override func setUp() {
        super.setUp()
        directory = Fixtures.scratchDirectory()
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: directory)
        super.tearDown()
    }

    private func makeStore(unitSize: Double = 100) -> BetStore {
        BetStore(directory: directory, unitSize: unitSize)
    }

    // MARK: - Payouts

    func testWinReturnsStakePlusProfit() {
        let bet = Fixtures.makeBet(odds: -110, stake: 100, status: .won)
        XCTAssertEqual(bet.payout(), [PHONE], accuracy: 0.0001)
        XCTAssertEqual(bet.profit(), 90.9090909, accuracy: 0.0001)
    }

    func testPositivePriceWin() {
        let bet = Fixtures.makeBet(odds: 145, stake: 100, status: .won)
        XCTAssertEqual(bet.payout(), 245, accuracy: 0.0001)
        XCTAssertEqual(bet.profit(), 145, accuracy: 0.0001)
    }

    func testPushAndVoidReturnTheStake() {
        for status in [BetStatus.push, .void] {
            let bet = Fixtures.makeBet(odds: -110, stake: 100, status: status)
            XCTAssertEqual(bet.payout(), 100, accuracy: 0.0001, "\(status)")
            XCTAssertEqual(bet.profit(), 0, accuracy: 0.0001, "\(status)")
        }
    }

    func testPendingAndLostReturnNothing() {
        for status in [BetStatus.pending, .lost] {
            let bet = Fixtures.makeBet(odds: -110, stake: 100, status: status)
            XCTAssertEqual(bet.payout(), 0, "\(status)")
        }
    }

    func testAPriceOfZeroIsNotAPricedWin() {
        // A pick with no book price logged at 0 must not report a payout
        // derived from a division by zero.
        let bet = Fixtures.makeBet(odds: 0, stake: 100, status: .won)
        XCTAssertEqual(bet.payout(), 0)
        XCTAssertNil(bet.breakEvenWinRate)
    }

    // MARK: - Break-even

    func testBreakEvenWinRateMatchesThePrice() {
        XCTAssertEqual(Fixtures.makeBet(odds: -110).breakEvenWinRate ?? 0, 52.38, accuracy: 0.01)
        XCTAssertEqual(Fixtures.makeBet(odds: 145).breakEvenWinRate ?? 0, 40.82, accuracy: 0.01)
    }

    // MARK: - Aggregate stats

    func testRecordIncludesPushesRatherThanHidingThem() {
        let store = makeStore()
        store.add(Fixtures.makeBet(odds: -110, status: .won))
        store.add(Fixtures.makeBet(odds: -110, status: .won))
        store.add(Fixtures.makeBet(odds: -110, status: .lost))
        store.add(Fixtures.makeBet(odds: -110, status: .push))

        XCTAssertEqual(store.wins, 2)
        XCTAssertEqual(store.losses, 1)
        XCTAssertEqual(store.pushes, 1)
        // "2-1" for a 2-1-1 log reads as a 66% record when it is 50%.
        XCTAssertEqual(store.recordLabel, "2-1-1")
    }

    func testWinRateExcludesPushesFromTheDenominator() {
        let store = makeStore()
        store.add(Fixtures.makeBet(odds: -110, status: .won))
        store.add(Fixtures.makeBet(odds: -110, status: .won))
        store.add(Fixtures.makeBet(odds: -110, status: .lost))
        store.add(Fixtures.makeBet(odds: -110, status: .push))

        // 2 wins out of 3 decided, not 2 out of 4.
        XCTAssertEqual(store.winRate, 66.6666666, accuracy: 0.0001)
    }

    func testNetProfitAndUnits() {
        let store = makeStore(unitSize: 100)
        store.add(Fixtures.makeBet(odds: -110, stake: 100, status: .won))   // +90.91
        store.add(Fixtures.makeBet(odds: -110, stake: 100, status: .lost))  // -100
        XCTAssertEqual(store.netProfit, -9.0909091, accuracy: 0.0001)
        XCTAssertEqual(store.netUnits, -0.090909091, accuracy: 0.0001)
    }

    func testROIExcludesPendingStakeFromTheDenominator() {
        let store = makeStore()
        store.add(Fixtures.makeBet(odds: -110, stake: 100, status: .won))
        store.add(Fixtures.makeBet(odds: -110, stake: 500, status: .pending))
        // Turnover is $100, not $600. Counting the pending bet would make a
        // 90% ROI look like 15%.
        XCTAssertEqual(store.totalWagered, 100, accuracy: 0.0001)
        XCTAssertEqual(store.roi, 90.9090909, accuracy: 0.0001)
        XCTAssertEqual(store.pendingStake, 500, accuracy: 0.0001)
    }

    func testEmptyStoreReportsNothingRatherThanFalsePrecision() {
        let store = makeStore()
        XCTAssertTrue(store.isEmpty)
        XCTAssertEqual(store.netProfit, 0)
        XCTAssertEqual(store.roi, 0)
        XCTAssertNil(store.averageUnits)
        XCTAssertNil(store.portfolioBreakEven)
        XCTAssertEqual(store.recordLabel, "0-0")
    }

    func testPortfolioBreakEvenIsStakeWeighted() {
        // One $100 bet at -110 (52.38% needed) and one $300 bet at -200
        // (66.67% needed). Unweighted the average is 59.5%; stake-weighted it
        // is 63.1%, and the stake-weighted one is the one that actually
        // describes this log.
        let store = makeStore()
        store.add(Fixtures.makeBet(odds: -110, stake: 100, status: .won))
        store.add(Fixtures.makeBet(odds: -200, stake: 300, status: .lost))

        let expected = (100 * 52.3809523 + 300 * 66.6666666) / 400
        XCTAssertEqual(store.portfolioBreakEven ?? 0, expected, accuracy: 0.01)
    }

    func testAPricelessLogHasNoBreakEven() {
        let store = makeStore()
        store.add(Fixtures.makeBet(odds: 0, stake: 100, status: .won))
        XCTAssertNil(store.portfolioBreakEven)
    }

    // MARK: - Persistence

    func testBetsSurviveAStoreRoundTrip() {
        let first = makeStore()
        first.add(Fixtures.makeBet(odds: -110, status: .won))
        first.add(Fixtures.makeBet(odds: 145, status: .lost))
        XCTAssertEqual(first.all.count, 2)

        // A second store over the same directory is what a relaunch looks like.
        let second = makeStore()
        XCTAssertEqual(second.all.count, 2)
        XCTAssertEqual(second.recordLabel, "1-1")
        XCTAssertEqual(second.netProfit, 45, accuracy: 0.0001)  // +145 then -100
    }

    func testUpdateReplacesRatherThanDuplicates() {
        let store = makeStore()
        var bet = Fixtures.makeBet(odds: -110, status: .pending)
        store.add(bet)
        bet.status = .won
        store.update(bet)
        XCTAssertEqual(store.all.count, 1)
        XCTAssertEqual(store.wins, 1)
    }

    func testDeleteRemoves() {
        let store = makeStore()
        let bet = Fixtures.makeBet(status: .pending)
        store.add(bet)
        store.delete(bet)
        XCTAssertTrue(store.isEmpty)
    }

    func testACorruptFileReadsAsEmptyRatherThanCrashing() {
        let file = directory.appendingPathComponent("user_bets.json")
        try? Data("{ this is not json".utf8).write(to: file)
        let store = makeStore()
        // Unreadable means "no data yet". A reader should never see a crash
        // because a file was truncated by a crash.
        XCTAssertTrue(store.isEmpty)
    }

    // MARK: - Saved picks

    func testSavedPicksToggleAndPersist() {
        let store = SavedPicksStore(directory: directory)
        XCTAssertFalse(store.isSaved("p1"))
        store.toggle("p1")
        XCTAssertTrue(store.isSaved("p1"))
        store.toggle("p1")
        XCTAssertFalse(store.isSaved("p1"))
    }

    func testSavedPicksAreCapped() {
        let store = SavedPicksStore(directory: directory)
        for index in 0..<(SavedPicksStore.capacity + 25) {
            store.toggle("pick-\(index)")
        }
        XCTAssertEqual(store.count, SavedPicksStore.capacity)
        // The trim keeps the newest, so the last one saved is still there.
        XCTAssertTrue(store.isSaved("pick-\(SavedPicksStore.capacity + 24)"))
    }

    func testSavedPicksPersistAcrossStores() {
        let first = SavedPicksStore(directory: directory)
        first.toggle("p1")
        first.toggle("p2")

        let second = SavedPicksStore(directory: directory)
        XCTAssertEqual(second.ids, ["p1", "p2"])
    }
}
