import Foundation
import XCTest
@testable import GalaxySportsEdge

/// Decoding of the real `GET /api/picks` envelope.
///
/// The JSON in these tests is the shape `apps/web/app/api/picks/route.ts`
/// actually emits, not a convenient shape. A fixture written to match the
/// decoder instead of the server is the single most common reason a
/// "passing" contract test proves nothing.
final class PickDecodingTests: XCTestCase {

    private func decodeSlate(_ json: String) throws -> SlatePage {
        let envelope = try APIClient.makeDecoder().decode(Envelope<[PickDTO]>.self, from: Data(json.utf8))
        let payload = try envelope.payload()
        return SlatePage(picks: payload.map { $0.toDomain() },
                         meta: envelope.meta?.toSlateMeta() ?? SlateMeta())
    }

    // MARK: - The full-fat payload

    private var fullSlateJSON: String {
        """
        {
          "success": true,
          "data": [
            {
              "id": "clx8f2k9p0001",
              "game": {
                "homeTeam": "Buffalo Bills",
                "awayTeam": "Kansas City Chiefs",
                "commenceTime": "2026-09-27T18:00:00.000Z",
                "sport": "NFL"
              },
              "pickType": "SPREAD",
              "selection": "Kansas City Chiefs -3.5",
              "line": -3.5,
              "hasBookPrice": true,
              "marketImplied": { "prob": 0.611, "bookmakerCount": 11 },
              "winProbability": {
                "value": 0.642,
                "basis": "market_devig",
                "books": 11,
                "method": "proportional"
              },
              "lineMovement": { "opening": -2.5, "current": -3.5 },
              "confidence": 82,
              "confidenceCalibrated": 0.7934,
              "edgeScore": 8.4,
              "factorBreakdown": {
                "consensusScore": 24,
                "marketDepthScore": 16,
                "edgeScore": 8.4,
                "lineMovementScore": 5,
                "volatilityPenalty": -3,
                "headToHeadScore": 1.5,
                "uncertaintyPenalty": -2
              },
              "dataQualityScore": 91.4,
              "tier": "PREMIUM",
              "pickGrade": "ELITE_PLAY",
              "riskLevel": "LOW_RISK",
              "reasoning": "The market has this at -3 and our independent read is -6.5.",
              "reasoningShort": "Our read is 3 points sharper than the market.",
              "consensusPct": 58.1,
              "bookmakerCount": 11,
              "consensusProvider": "consensus_aggregator_v3",
              "consensusEvidence": "11 books, snapshot captured 90 minutes before kickoff.",
              "isFeatured": true,
              "isAuditAvailable": true,
              "generatedAt": "2026-09-27T14:00:00.000Z",
              "dataFreshnessAt": "2026-09-27T16:30:00.000Z",
              "result": null,
              "receiptHash": "sha256:9f2b1c8eaa77d4b0",
              "intelligence": { "observationCount": 4 }
            }
          ],
          "meta": {
            "tier": "PRO",
            "total": 1,
            "totalAvailableToday": 4,
            "hitDailyLimit": true,
            "date": "2026-09-27",
            "canSeeConfidence": true,
            "canSeeFactorBreakdown": true,
            "containsSeedData": false
          }
        }
        """
    }

    func testDecodesAFullyPopulatedPick() throws {
        let page = try decodeSlate(fullSlateJSON)
        XCTAssertEqual(page.picks.count, 1)

        let pick = try XCTUnwrap(page.picks.first)
        XCTAssertEqual(pick.id, "clx8f2k9p0001")
        XCTAssertEqual(pick.sport, .nfl)
        XCTAssertEqual(pick.pickType, .spread)
        XCTAssertEqual(pick.selection, "Kansas City Chiefs -3.5")
        XCTAssertEqual(pick.line, -3.5)
        XCTAssertEqual(pick.eventName, "Kansas City Chiefs @ Buffalo Bills")
        XCTAssertEqual(pick.awayAbbr, "KC")
        XCTAssertEqual(pick.homeAbbr, "BUF")
        XCTAssertEqual(pick.grade, .elitePlay)
        XCTAssertEqual(pick.risk, .lowRisk)
        XCTAssertEqual(pick.tier, .premium)
        XCTAssertTrue(pick.isPremium)
        XCTAssertTrue(pick.isFeatured)
        XCTAssertTrue(pick.isAuditAvailable)
        XCTAssertEqual(pick.confidence, 82)
        XCTAssertEqual(pick.edgeScore, 8.4)
        XCTAssertEqual(pick.bookmakerCount, 11)
    }

    func testPrefersWinProbabilityOverTheDeprecatedAlias() throws {
        // Both fields are resolved from one server-side function, so they agree
        // in practice. When they do not, the current field wins — the
        // disagreement is a server regression, not a reason to show neither.
        let page = try decodeSlate(fullSlateJSON)
        let pick = try XCTUnwrap(page.picks.first)
        XCTAssertEqual(pick.winProbability ?? 0, 0.642, accuracy: 0.000001)
        XCTAssertEqual(pick.marketImpliedProb ?? 0, 0.611, accuracy: 0.000001)
    }

    func testDerivesAReferencePriceOnlyWhenTheRowHasABookPrice() throws {
        let page = try decodeSlate(fullSlateJSON)
        let pick = try XCTUnwrap(page.picks.first)
        XCTAssertTrue(pick.hasBookPrice)
        // 0.642 -> decimal 1.5576 -> -179.3 -> nearest 5-point increment.
        // -180 is the price that breaks even at 64.29%, which is this row's
        // probability; -145 would break even at 59.18% and is a different bet.
        XCTAssertEqual(pick.odds, -180)
        XCTAssertEqual(pick.displayOdds, "-180")
    }

    func testFlattensTheFactorBreakdownAndDropsAbsentMembers() throws {
        let page = try decodeSlate(fullSlateJSON)
        let pick = try XCTUnwrap(page.picks.first)
        let keys = Set(pick.factors.map(\.key))
        XCTAssertTrue(keys.contains("edge"))
        XCTAssertTrue(keys.contains("volatility"))
        // `marketPriceShapeScore` was not in the payload, so it must not appear
        // as a zero-valued row — a 0.0 score and a missing score are different
        // claims.
        XCTAssertFalse(keys.contains("shape"))
        XCTAssertTrue(pick.factors.allSatisfy { !$0.detail.isEmpty })
    }

    func testKeepsAPenaltyNegative() throws {
        let page = try decodeSlate(fullSlateJSON)
        let pick = try XCTUnwrap(page.picks.first)
        let volatility = try XCTUnwrap(pick.factors.first { $0.key == "volatility" })
        XCTAssertEqual(volatility.value, -3)
        XCTAssertLessThan(volatility.value, 0)
    }

    func testLineMovementDeltaIsSigned() throws {
        let page = try decodeSlate(fullSlateJSON)
        let pick = try XCTUnwrap(page.picks.first)
        let movement = try XCTUnwrap(pick.lineMovement)
        XCTAssertEqual(movement.opening, -2.5)
        XCTAssertEqual(movement.current, -3.5)
        XCTAssertEqual(movement.delta, -1.0, accuracy: 0.0001)
    }

    // MARK: - Meta

    func testMetaExplainsTheFreeTierCap() throws {
        let page = try decodeSlate(fullSlateJSON)
        XCTAssertEqual(page.meta.total, 1)
        XCTAssertEqual(page.meta.totalAvailableToday, 4)
        XCTAssertTrue(page.meta.hitDailyLimit)
        XCTAssertEqual(page.meta.withheldCount, 3)
        XCTAssertFalse(page.meta.containsSeedData)
    }

    func testWithheldCountNeverGoesNegative() throws {
        // A server reporting totalAvailableToday < total (a race between the
        // count and the rows) must not render a negative "more picks".
        var meta = SlateMeta()
        meta.total = 5
        meta.totalAvailableToday = 2
        XCTAssertEqual(meta.withheldCount, 0)
    }

    // MARK: - Gated and absent fields

    func testAFreeViewerRowDecodesAndStaysHonest() throws {
        // A FREE viewer gets nulls for every gated field. The row must still
        // render, with the gated values absent rather than zeroed.
        let json = """
        {
          "success": true,
          "data": [{
            "id": "p1",
            "game": { "homeTeam": "Boston Celtics", "awayTeam": "Denver Nuggets",
                      "commenceTime": "2026-09-27T19:30:00.000Z", "sport": "NBA" },
            "pickType": "MONEYLINE",
            "selection": "Boston Celtics ML",
            "line": null,
            "hasBookPrice": false,
            "marketImplied": null,
            "winProbability": null,
            "lineMovement": null,
            "confidence": null,
            "edgeScore": null,
            "factorBreakdown": null,
            "dataQualityScore": 0,
            "tier": "FREE",
            "pickGrade": "LEAN",
            "riskLevel": "MODERATE",
            "reasoning": null,
            "reasoningShort": "A one-line teaser.",
            "consensusPct": null,
            "bookmakerCount": null,
            "isFeatured": false,
            "isAuditAvailable": false,
            "generatedAt": "2026-09-27T14:00:00.000Z",
            "dataFreshnessAt": null,
            "result": null,
            "receiptHash": null
          }],
          "meta": { "tier": "FREE", "total": 1, "totalAvailableToday": 1,
                    "hitDailyLimit": false, "date": "2026-09-27",
                    "canSeeConfidence": false, "canSeeFactorBreakdown": false,
                    "containsSeedData": false }
        }
        """
        let page = try decodeSlate(json)
        let pick = try XCTUnwrap(page.picks.first)

        XCTAssertNil(pick.confidence)
        XCTAssertEqual(pick.displayConfidence, "—")
        XCTAssertNil(pick.edgeScore)
        XCTAssertNil(pick.bookmakerCount)
        XCTAssertTrue(pick.factors.isEmpty)
        XCTAssertNil(pick.lineMovement)
        XCTAssertFalse(pick.isPremium)
    }

    func testARowWithNoBookPriceStaysPriceless() throws {
        // The important one: a model-signal row has no quote. Inventing a price
        // from the model's own probability and rendering it as a market price
        // would be the app quoting itself.
        let json = """
        {
          "success": true,
          "data": [{
            "id": "p2",
            "game": { "homeTeam": "Buffalo Bills", "awayTeam": "Kansas City Chiefs",
                      "commenceTime": "2026-09-27T18:00:00.000Z", "sport": "NFL" },
            "pickType": "TOTAL",
            "selection": "Over 44.5",
            "line": 44.5,
            "hasBookPrice": false,
            "winProbability": { "value": 0.571, "books": 9, "basis": "market_devig" },
            "confidence": 71,
            "dataQualityScore": 88,
            "tier": "PREMIUM",
            "pickGrade": "STRONG_PLAY",
            "riskLevel": "MODERATE",
            "generatedAt": "2026-09-27T14:00:00.000Z"
          }],
          "meta": { "tier": "PRO" }
        }
        """
        let page = try decodeSlate(json)
        let pick = try XCTUnwrap(page.picks.first)
        XCTAssertFalse(pick.hasBookPrice)
        XCTAssertEqual(pick.odds, 0)
        XCTAssertEqual(pick.displayOdds, "—")
        // The model probability is still there — it is just not a price.
        XCTAssertEqual(pick.winProbability ?? 0, 0.571, accuracy: 0.000001)
    }

    // MARK: - Forward compatibility

    func testAnUnknownEnumMemberDegradesInsteadOfFailing() throws {
        // The engine adds grades and risk levels. An app that throws on an
        // unrecognised member shows a red screen for a whole slate because of
        // one row, so unknown members fall back to the conservative default.
        let json = """
        {
          "success": true,
          "data": [{
            "id": "p3",
            "game": { "homeTeam": "A", "awayTeam": "B",
                      "commenceTime": "2026-09-27T18:00:00.000Z", "sport": "WNBA" },
            "pickType": "PROP",
            "selection": "Over 10.5 points",
            "line": 10.5,
            "hasBookPrice": true,
            "winProbability": { "value": 0.6 },
            "confidence": 60,
            "dataQualityScore": 70,
            "tier": "PREMIUM",
            "pickGrade": "SUPREME_PLAY",
            "riskLevel": "WEATHER",
            "generatedAt": "2026-09-27T14:00:00.000Z"
          }],
          "meta": { "tier": "PRO" }
        }
        """
        let page = try decodeSlate(json)
        let pick = try XCTUnwrap(page.picks.first)
        XCTAssertEqual(pick.grade, .lean)
        XCTAssertEqual(pick.risk, .moderate)
        XCTAssertEqual(pick.pickType, .spread)
        // An unrecognised sport name must not drop the row either.
        XCTAssertEqual(pick.sport, .nfl)
    }

    func testAFieldTheServerAddedLaterDoesNotBreakDecoding() throws {
        let json = """
        {
          "success": true,
          "data": [{
            "id": "p4",
            "game": { "homeTeam": "A", "awayTeam": "B",
                      "commenceTime": "2026-09-27T18:00:00.000Z", "sport": "NFL" },
            "pickType": "SPREAD", "selection": "A -1", "line": -1,
            "hasBookPrice": true, "confidence": 60, "dataQualityScore": 70,
            "tier": "FREE", "pickGrade": "LEAN", "riskLevel": "MODERATE",
            "generatedAt": "2026-09-27T14:00:00.000Z",
            "someBrandNewField": { "nested": [1, 2, 3] },
            "anotherOne": "value"
          }],
          "meta": { "tier": "FREE", "brandNewMetaField": 42 }
        }
        """
        let page = try decodeSlate(json)
        XCTAssertEqual(page.picks.count, 1)
        XCTAssertEqual(page.meta.tier, .free)
    }

    // MARK: - Refusals

    func testASuccessfulFlagWithAnErrorIsStillAnError() throws {
        // HTTP 200 with `success: false` is a refusal. Treating the payload as
        // empty is how a refusal becomes "no edge today".
        let json = """
        { "success": false, "data": null,
          "error": "Too many requests. Please wait and try again.",
          "code": "rate_limited" }
        """
        let envelope = try APIClient.makeDecoder().decode(Envelope<[PickDTO]>.self, from: Data(json.utf8))
        XCTAssertThrowsError(try envelope.payload())
    }

    func testAMissingDataKeyIsADecodingFailureNotAnEmptySlate() throws {
        let json = #"{ "success": true, "meta": { "tier": "PRO" } }"#
        let envelope = try APIClient.makeDecoder().decode(Envelope<[PickDTO]>.self, from: Data(json.utf8))
        XCTAssertThrowsError(try envelope.payload())
    }

    func testAnEmptySlateIsAValidEmptySlate() throws {
        let json = """
        { "success": true, "data": [],
          "meta": { "tier": "FREE", "total": 0, "totalAvailableToday": 0,
                    "hitDailyLimit": false, "date": "2026-09-27",
                    "canSeeConfidence": false, "canSeeFactorBreakdown": false,
                    "containsSeedData": false } }
        """
        let page = try decodeSlate(json)
        XCTAssertTrue(page.picks.isEmpty)
        XCTAssertEqual(page.meta.withheldCount, 0)
    }
}
