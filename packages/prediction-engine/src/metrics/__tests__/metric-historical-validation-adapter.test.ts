import { describe, expect, it } from "vitest";
import {
  HISTORICAL_VALIDATION_ADAPTER_FIXTURES,
  reviewHistoricalValidationSources,
  runHistoricalValidationAdapterFixtures,
  summarizeHistoricalValidationAdapterResults,
} from "../core/index.js";

describe("metric historical validation adapter", () => {
  it("keeps fixture coverage explicit and local", () => {
    expect(HISTORICAL_VALIDATION_ADAPTER_FIXTURES.map((fixture) => fixture.splitId)).toEqual([
      "historical_role_nflverse_adapted",
      "historical_decision_window_market_adapted",
      "historical_market_mirage_odds_adapted",
      "historical_no_bet_pressure_safe_adapted",
      "historical_no_bet_pressure_raw_payload_blocked",
      "historical_no_bet_pressure_permission_blocked",
      "historical_role_sleeper_manual_review",
      "historical_market_mirage_permission_blocked",
    ]);
  });

  it("adapts only source-rights-cleared historical-shaped records", () => {
    const results = runHistoricalValidationAdapterFixtures();
    const role = resultFor(results, "historical_role_nflverse_adapted");
    const decision = resultFor(results, "historical_decision_window_market_adapted");
    const mirage = resultFor(results, "historical_market_mirage_odds_adapted");
    const noBet = resultFor(results, "historical_no_bet_pressure_safe_adapted");

    for (const result of [role, decision, mirage, noBet]) {
      expect(result.status).toBe("ADAPTED");
      expect(result.lifecycleStatus).toBe("SHADOW");
      expect(result.apiExposure).toBe("INTERNAL");
      expect(result.licensingStatus).toBe("NOT_READY");
      expect(result.publicApiAllowed).toBe(false);
      expect(result.score).not.toBeNull();
      expect(result.observedBand).not.toBeNull();
      expect(result.notes).toContain("Source-rights-reviewed historical-shaped input adapted locally for shadow validation.");
    }
    expect(noBet.payloadRights?.allowed).toBe(true);
    expect(noBet.payloadRights?.approvedFields).toContain("no-bet-pressure.score");
    expect(noBet.observedBand).toBe("CLEAR");
  });

  it("does not adapt manual-review or blocked historical-shaped records", () => {
    const results = runHistoricalValidationAdapterFixtures();
    const manual = resultFor(results, "historical_role_sleeper_manual_review");
    const blocked = resultFor(results, "historical_market_mirage_permission_blocked");
    const noBetBlocked = resultFor(results, "historical_no_bet_pressure_permission_blocked");

    expect(manual.status).toBe("NEEDS_MANUAL_REVIEW");
    expect(manual.score).toBeNull();
    expect(manual.observedBand).toBeNull();
    expect(manual.allowed).toBe(false);

    expect(blocked.status).toBe("BLOCKED_BY_SOURCE_RIGHTS");
    expect(blocked.sourceReview.violations).toContain("scores24-live blocks validation");
    expect(blocked.score).toBeNull();
    expect(blocked.observedBand).toBeNull();
    expect(blocked.allowed).toBe(false);

    expect(noBetBlocked.status).toBe("BLOCKED_BY_SOURCE_RIGHTS");
    expect(noBetBlocked.payloadRights).toBeNull();
    expect(noBetBlocked.score).toBeNull();
    expect(noBetBlocked.observedBand).toBeNull();
    expect(noBetBlocked.allowed).toBe(false);
  });

  it("blocks unsafe no-bet pressure payload exposure after source rights pass", () => {
    const results = runHistoricalValidationAdapterFixtures();
    const rawPayload = resultFor(results, "historical_no_bet_pressure_raw_payload_blocked");

    expect(rawPayload.sourceReview.status).toBe("ADAPTED");
    expect(rawPayload.status).toBe("BLOCKED_BY_PAYLOAD_RIGHTS");
    expect(rawPayload.payloadRights?.allowed).toBe(false);
    expect(rawPayload.payloadRights?.blockedFields).toContain("no-bet-pressure.raw_input_snapshot");
    expect(rawPayload.score).toBeNull();
    expect(rawPayload.observedBand).toBeNull();
    expect(rawPayload.allowed).toBe(false);
  });

  it("summarizes adaptation without opening public API exposure", () => {
    const summary = summarizeHistoricalValidationAdapterResults(runHistoricalValidationAdapterFixtures());

    expect(summary).toEqual({
      adapted: 4,
      manualReview: 1,
      payloadBlocked: 1,
      publicApiAllowedCount: 0,
      sourceBlocked: 2,
      total: 8,
    });
  });

  it("reviews unknown sources as blocked before adaptation", () => {
    const review = reviewHistoricalValidationSources(["unknown-source"]);

    expect(review.status).toBe("BLOCKED_BY_SOURCE_RIGHTS");
    expect(review.violations).toContain("unknown-source missing source-rights policy");
  });
});

function resultFor(results: ReturnType<typeof runHistoricalValidationAdapterFixtures>, splitId: string) {
  const result = results.find((candidate) => candidate.splitId === splitId);
  if (!result) throw new Error(`Missing historical adapter result for ${splitId}`);
  return result;
}
