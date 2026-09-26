import Foundation
import XCTest
@testable import GalaxySportsEdge

/// American-odds arithmetic.
///
/// These are the numbers a reader makes decisions on, and the ones most easily
/// wrong in a way that still *looks* plausible. Each test pins a case where a
/// plausible-looking wrong formula gives a different answer.
final class OddsMathTests: XCTestCase {

    // MARK: - Implied probability

    func testImpliedProbabilityOfNegativePrice() {
        // -110 → 110 / 210. A bettor must win 52.38% to break even.
        let p = OddsMath.impliedProbability(american: -110)
        XCTAssertEqual(p ?? 0, 0.5238095238, accuracy: 0.0000001)
    }

    func testImpliedProbabilityOfPositivePrice() {
        // +145 → 145 / 245 = 0.59184.
        let p = OddsMath.impliedProbability(american: 145)
        XCTAssertEqual(p ?? 0, 0.5918367347, accuracy: 0.0000001)
    }

    func testZeroLineIsNotAPrice() {
        // A pick with no book price arrives as 0. Dividing by it is how a
        // "0% edge" gets printed on a slate that simply had no quote.
        XCTAssertNil(OddsMath.impliedProbability(american: 0))
        XCTAssertNil(OddsMath.breakEvenWinRate(american: 0))
        XCTAssertNil(OddsMath.overround(american: 0))
    }

    // MARK: - Profit vs implied probability

    func testProfitOnPositivePriceIsThePriceNotTheProbability() {
        // +145 on $100 profits $145, not $59.18. The implied probability of
        // +145 is 0.5918, and multiplying the stake by that is the classic
        // conflation — it understates every positive-price bet by its own
        // margin while leaving negative prices looking correct.
        XCTAssertEqual(OddsMath.profit(stake: 100, american: 145), 145.0, accuracy: 0.0001)
        XCTAssertEqual(OddsMath.payout(stake: 100, american: 145), 245.0, accuracy: 0.0001)
    }

    func testProfitOnNegativePrice() {
        // -110 on $100 profits $90.91 and returns $190.91.
        XCTAssertEqual(OddsMath.profit(stake: 100, american: -110), 90.9090909, accuracy: 0.0001)
        XCTAssertEqual(OddsMath.payout(stake: 100, american: -110), 190.9090909, accuracy: 0.0001)
    }

    func testEvenMoneyRoundTrips() {
        XCTAssertEqual(OddsMath.profit(stake: 50, american: 100), 50.0, accuracy: 0.0001)
        XCTAssertEqual(OddsMath.impliedProbability(american: 100) ?? 0, 0.5, accuracy: 0.0001)
    }

    func testProfitAtZeroIsZeroNotInfinity() {
        XCTAssertEqual(OddsMath.profit(stake: 100, american: 0), 0)
        XCTAssertEqual(OddsMath.payout(stake: 100, american: 0), 100)
    }

    // MARK: - Overround

    func testOverroundGrowsWithPriceDistance() {
        // -110 carries 4.76% of vig; -200 carries 33.3%. A reader choosing
        // between them needs to see that, and it is invisible in the price.
        let short = OddsMath.overround(american: -110) ?? 0
        let long = OddsMath.overround(american: -200) ?? 0
        XCTAssertEqual(short, 0.0476190476, accuracy: 0.0001)
        XCTAssertEqual(long, 0.3333333333, accuracy: 0.0001)
        XCTAssertGreaterThan(long, short)
    }

    // MARK: - Conversion round trip

    func testAmericanFromProbabilityRoundsToTheRetailIncrement() {
        // Retail quotes at 5-point increments; 0.60 comes back as -150.
        XCTAssertEqual(OddsMath.americanFromProbability(0.60), -150)
        XCTAssertEqual(OddsMath.americanFromProbability(0.50), 100)
        XCTAssertEqual(OddsMath.americanFromProbability(0.64), -110)
    }

    func testAmericanFromProbabilityRejectsOutOfRange() {
        XCTAssertNil(OddsMath.americanFromProbability(0))
        XCTAssertNil(OddsMath.americanFromProbability(1))
        XCTAssertNil(OddsMath.americanFromProbability(-0.2))
        XCTAssertNil(OddsMath.americanFromProbability(1.2))
    }

    func testProbabilityRoundTripIsStableToTheRoundingIncrement() {
        // Converting to a price and back must land within half a retail step.
        for price in [-300, -150, -110, -105, 100, 115, 145, 200] {
            let implied = OddsMath.impliedProbability(american: price) ?? 0
            let round = OddsMath.americanFromProbability(implied) ?? 0
            let backAgain = OddsMath.impliedProbability(american: round) ?? 0
            XCTAssertEqual(implied, backAgain, accuracy: 0.025,
                           "round trip drifted for \(price)")
        }
    }

    // MARK: - De-vig

    func testProportionalDevigRemovesTheMargin() {
        // A market quoted at -110 / -110 implies 0.5238 + 0.5238 = 1.0476.
        // The proportional de-vig the backend uses divides both by that sum,
        // giving 0.5 / 0.5.
        let fair = OddsMath.devigTwoWay(probabilityA: 0.5238095238,
                                       probabilityB: 0.5238095238)
        XCTAssertEqual(fair ?? 0, 0.5, accuracy: 0.0000001)
    }

    func testProportionalDevigPreservesRelativeSize() {
        // -150 / -120: 0.60 and 0.5454. De-vigged, the favourite keeps its
        // larger share of the *relative* probability.
        let fair = OddsMath.devigTwoWay(probabilityA: 0.6, probabilityB: 0.5454545455)
        XCTAssertEqual(fair ?? 0, 0.5238095238, accuracy: 0.0001)
    }

    func testDevigRejectsNonPositive() {
        XCTAssertNil(OddsMath.devigTwoWay(probabilityA: 0, probabilityB: 0.5))
        XCTAssertNil(OddsMath.devigTwoWay(probabilityA: 0.5, probabilityB: 0))
    }

    // MARK: - EV vs edge points

    func testEdgePointsIgnoresTheVig() {
        // A 55% model read at -110 looks +2.6 points of "edge", but the real
        // EV is 55% × 1.909 − 1 = +5.0% per unit. The two are different
        // claims, which is why the UI labels one "vs market".
        let points = OddsMath.edgePoints(fairProbability: 0.55, american: -110)
        let ev = OddsMath.expectedValue(fairProbability: 0.55, american: -110)
        XCTAssertEqual(points ?? 0, 2.6190476, accuracy: 0.0001)
        XCTAssertEqual(ev ?? 0, 0.05, accuracy: 0.0001)
    }

    func testEdgePointsCanReadPositiveOnANegativeEVBet() {
        // The whole reason the UI does not call this "edge": beating the
        // implied probability is not the same as being positive-EV once the
        // vig has been paid.
        let price = -200
        let ev = OddsMath.expectedValue(fairProbability: 0.34, american: price) ?? 0
        let points = OddsMath.edgePoints(fairProbability: 0.34, american: price) ?? 0
        XCTAssertGreaterThan(points, 0)
        XCTAssertLessThan(ev, 0, "0.34 x 1.5 - 1 is -49%; the 'edge' is a mirage")
    }

    func testBreakEvenWinRateMatchesThePrice() {
        XCTAssertEqual(OddsMath.breakEvenWinRate(american: -110) ?? 0, 52.3809523, accuracy: 0.0001)
        XCTAssertEqual(OddsMath.breakEvenWinRate(american: 145) ?? 0, 40.8163265, accuracy: 0.0001)
    }
}
