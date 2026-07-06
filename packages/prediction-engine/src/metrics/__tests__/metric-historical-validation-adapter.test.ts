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
      "historical_role_sleeper_manual_review",
      "historical_market_mirage_permission_blocked",
    ]);
  });

  it("adapts only source-rights-cleared historical-shaped records", () => {
    const results = runHistoricalValidationAdapterFixtures();
    const role = resultFor(results, "historical_role_nflverse_adapted");
    const decision = resultFor(results, "historical_decision_window_market_adapted");
    const mirage = resultFor(results, "historical_market_mirage_odds_adapted");

    for (const result of [role, decision, mirage]) {
      expect(result.status).toBe("ADAPTED");
      expect(result.lifecycleStatus).toBe("SHADOW");
      expect(result.apiExposure).toBe("INTERNAL");
      expect(result.licensingStatus).toBe("NOT_READY");
      expect(result.publicApiAllowed).toBe(false);
      expect(result.score).not.toBeNull();
      expect(result.observedBand).not.toBeNull();
      expect(result.notes).toContain("Source-rights-reviewed historical-shaped input adapted locally for shadow validation.");
    }
  });

  it("does not adapt manual-review or blocked historical-shaped records", () => {
    const results = runHistoricalValidationAdapterFixtures();
    const manual = resultFor(results, "historical_role_sleeper_manual_review");
    const blocked = resultFor(results, "historical_market_mirage_permission_blocked");

    expect(manual.status).toBe("NEEDS_MANUAL_REVIEW");
    expect(manual.score).toBeNull();
    expect(manual.observedBand).toBeNull();
    expect(manual.allowed).toBe(false);

    expect(blocked.status).toBe("BLOCKED_BY_SOURCE_RIGHTS");
    expect(blocked.sourceReview.violations).toContain("scores24-live blocks validation");
    expect(blocked.score).toBeNull();
    expect(blocked.observedBand).toBeNull();
    expect(blocked.allowed).toBe(false);
  });

  it("summarizes adaptation without opening public API exposure", () => {
    const summary = summarizeHistoricalValidationAdapterResults(runHistoricalValidationAdapterFixtures());

    expect(summary).toEqual({
      adapted: 3,
      blocked: 1,
      manualReview: 1,
      publicApiAllowedCount: 0,
      total: 5,
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
