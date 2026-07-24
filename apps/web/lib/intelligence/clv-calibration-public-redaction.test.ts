import { describe, it, expect } from "vitest";
import {
  redactThinClvRollup,
  redactUnpublishedClvBacktest,
} from "./clv-calibration-public-redaction";
import type { ClvBacktest, ClvRollup } from "./clv-calibration";
import { MIN_HIT_RATE_SAMPLE } from "./hit-rate-display";

function rollup(overrides: Partial<ClvRollup> = {}): ClvRollup {
  return {
    count: 1,
    meanClv: 0.05,
    beatCloseCount: 1,
    beatCloseRate: 1,
    calibration: { meanModelProb: 0.55, meanClosingProb: 0.5, stdevClv: 0 },
    note: "Model beat the close on average. Positive CLV is the cleanest evidence of real edge. Self-grade, not a pick.",
    ...overrides,
  };
}

describe("redactThinClvRollup", () => {
  it("nulls meanClv and beatCloseRate below the sample floor", () => {
    const redacted = redactThinClvRollup(rollup({ count: 1, beatCloseRate: 1 }));
    expect(redacted.meanClv).toBeNull();
    expect(redacted.beatCloseRate).toBeNull();
  });

  it("replaces the directional note with an honest insufficient-sample message below the floor", () => {
    const redacted = redactThinClvRollup(rollup({ count: 1 }));
    expect(redacted.note).toMatch(/too few/i);
    expect(redacted.note).not.toMatch(/beat the close on average/i);
  });

  it("passes an at-or-above-floor rollup through unredacted, note included", () => {
    const original = rollup({ count: MIN_HIT_RATE_SAMPLE, beatCloseRate: 0.58, meanClv: 0.6 });
    const redacted = redactThinClvRollup(original);
    expect(redacted.meanClv).toBe(0.6);
    expect(redacted.beatCloseRate).toBe(0.58);
    expect(redacted.note).toBe(original.note);
  });

  it("does not touch beatCloseCount, count, or calibration fields", () => {
    const redacted = redactThinClvRollup(rollup({ count: 2, beatCloseCount: 2 }));
    expect(redacted.count).toBe(2);
    expect(redacted.beatCloseCount).toBe(2);
    expect(redacted.calibration).toEqual({ meanModelProb: 0.55, meanClosingProb: 0.5, stdevClv: 0 });
  });

  it("handles the zero-count empty rollup without throwing", () => {
    const redacted = redactThinClvRollup(
      rollup({ count: 0, beatCloseCount: 0, beatCloseRate: 0, meanClv: 0, note: "No gradeable pairs: empty self-grade rather than a fabricated CLV." }),
    );
    expect(redacted.meanClv).toBeNull();
    expect(redacted.beatCloseRate).toBeNull();
  });
});

describe("redactUnpublishedClvBacktest", () => {
  function backtest(overrides: Partial<ClvBacktest> = {}): ClvBacktest {
    return {
      generatedAt: "2026-07-24T00:00:00.000Z",
      mode: "backtest",
      status: "live",
      seasonFrom: 2024,
      seasonTo: 2025,
      gamesGraded: 1,
      sourceRows: 10,
      spread: rollup({ count: 1 }),
      total: rollup({ count: 1 }),
      rows: [],
      canPublishProjections: false,
      note: "top-level note",
      sourceUrl: "https://example.test/source.csv",
      error: null,
      ...overrides,
    };
  }

  it("redacts both spread and total rollups independently", () => {
    const redacted = redactUnpublishedClvBacktest(
      backtest({ spread: rollup({ count: 1 }), total: rollup({ count: MIN_HIT_RATE_SAMPLE, beatCloseRate: 0.6 }) }),
    );
    expect(redacted.spread.beatCloseRate).toBeNull();
    expect(redacted.total.beatCloseRate).toBe(0.6);
  });

  it("leaves top-level backtest fields (provenance, rows) untouched", () => {
    const redacted = redactUnpublishedClvBacktest(backtest());
    expect(redacted.sourceUrl).toBe("https://example.test/source.csv");
    expect(redacted.generatedAt).toBe("2026-07-24T00:00:00.000Z");
    expect(redacted.rows).toEqual([]);
  });
});
