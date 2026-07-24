import { describe, it, expect } from "vitest";
import {
  redactThinHitRates,
  redactUnpublishedPredictiveness,
} from "@/app/api/intelligence/predictiveness/route";
import type { PredictivenessProof, PredictivenessSplit } from "./predictiveness";
import { MIN_HIT_RATE_SAMPLE } from "./hit-rate-display";

function split(overrides: Partial<PredictivenessSplit> = {}): PredictivenessSplit {
  return {
    position: "WR",
    n: 40,
    gradeCorr: 0.4,
    baselineCorr: 0.1,
    lift: 0.3,
    buyLowN: 3,
    buyLowHitRate: 1, // a thin, lucky 100% — the exact fabrication-by-omission shape
    sellHighN: 3,
    sellHighHitRate: 1,
    ...overrides,
  };
}

describe("redactThinHitRates", () => {
  it("nulls a below-floor buy-low/sell-high hit rate", () => {
    const redacted = redactThinHitRates(split({ buyLowN: 3, sellHighN: 3 }));
    expect(redacted.buyLowHitRate).toBeNull();
    expect(redacted.sellHighHitRate).toBeNull();
  });

  it("passes an at-or-above-floor hit rate through unredacted", () => {
    const redacted = redactThinHitRates(
      split({ buyLowN: MIN_HIT_RATE_SAMPLE, sellHighN: MIN_HIT_RATE_SAMPLE, buyLowHitRate: 0.6, sellHighHitRate: 0.55 }),
    );
    expect(redacted.buyLowHitRate).toBe(0.6);
    expect(redacted.sellHighHitRate).toBe(0.55);
  });

  it("gates buy-low and sell-high independently", () => {
    const redacted = redactThinHitRates(
      split({ buyLowN: MIN_HIT_RATE_SAMPLE, buyLowHitRate: 0.6, sellHighN: 2, sellHighHitRate: 1 }),
    );
    expect(redacted.buyLowHitRate).toBe(0.6);
    expect(redacted.sellHighHitRate).toBeNull();
  });

  it("leaves gradeCorr/baselineCorr/lift/n untouched (already null-gated internally by MIN_PAIRS)", () => {
    const redacted = redactThinHitRates(split({ gradeCorr: 0.42, n: 40 }));
    expect(redacted.gradeCorr).toBe(0.42);
    expect(redacted.n).toBe(40);
  });
});

describe("redactUnpublishedPredictiveness", () => {
  function proof(overrides: Partial<PredictivenessProof> = {}): PredictivenessProof {
    return {
      generatedAt: "2026-07-24T00:00:00.000Z",
      status: "live",
      season: 2025,
      trainWeeks: [1, 2, 3],
      testWeeks: [4, 5, 6],
      sampleSize: 40,
      overall: split({ buyLowN: 2, buyLowHitRate: 1 }),
      byPosition: [split({ position: "QB", buyLowN: 2, buyLowHitRate: 1 })],
      verdict: "verdict text",
      priorSeason: 2024,
      yearOverYear: split({ buyLowN: 2, buyLowHitRate: 1 }),
      yearOverYearByPosition: [split({ position: "RB", buyLowN: 2, buyLowHitRate: 1 })],
      yearOverYearVerdict: "yoy verdict",
      stacked: split({ buyLowN: 2, buyLowHitRate: 1 }),
      stackedByPosition: [split({ position: "TE", buyLowN: 2, buyLowHitRate: 1 })],
      stackedPairs: [[2023, 2024]],
      stackedVerdict: "stacked verdict",
      canPublishProjections: false,
      note: "note",
      sourceUrl: "https://example.test/source.csv",
      error: null,
      ...overrides,
    };
  }

  it("redacts overall, byPosition, yearOverYear*, and stacked* alike", () => {
    const redacted = redactUnpublishedPredictiveness(proof());
    expect(redacted.overall.buyLowHitRate).toBeNull();
    expect(redacted.byPosition[0]?.buyLowHitRate).toBeNull();
    expect(redacted.yearOverYear?.buyLowHitRate).toBeNull();
    expect(redacted.yearOverYearByPosition[0]?.buyLowHitRate).toBeNull();
    expect(redacted.stacked?.buyLowHitRate).toBeNull();
    expect(redacted.stackedByPosition[0]?.buyLowHitRate).toBeNull();
  });

  it("passes through null yearOverYear/stacked without crashing", () => {
    const redacted = redactUnpublishedPredictiveness(
      proof({ yearOverYear: null, yearOverYearByPosition: [], stacked: null, stackedByPosition: [] }),
    );
    expect(redacted.yearOverYear).toBeNull();
    expect(redacted.stacked).toBeNull();
  });

  it("does not touch non-split fields (verdict text, provenance)", () => {
    const redacted = redactUnpublishedPredictiveness(proof());
    expect(redacted.verdict).toBe("verdict text");
    expect(redacted.sourceUrl).toBe("https://example.test/source.csv");
    expect(redacted.generatedAt).toBe("2026-07-24T00:00:00.000Z");
  });
});
