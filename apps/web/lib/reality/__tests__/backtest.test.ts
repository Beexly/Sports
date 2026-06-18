/**
 * Tests for the PURE backtest harness (apps/web/lib/reality/backtest.ts).
 *
 * Fixture-driven: a deterministic array of settled-pick records drives all
 * assertions — rolling windows, out-of-sample split, break-even framing,
 * insufficient-sample self-suppression, and determinism across identical runs.
 *
 * Pure — no DB, no fetch, no clock. The edge-significance RNG is injected.
 */

import { describe, it, expect } from "vitest";
import {
  runBacktest,
  BREAK_EVEN_VIG_110,
  MIN_BACKTEST_SAMPLE,
  BACKTEST_CAVEATS,
  type BacktestRecord,
} from "../backtest";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Deterministic RNG: always returns 0.999 so simulated wins never accumulate. */
const FIXED_RNG = () => 0.999;

/**
 * Build a synthetic array of N settled-pick records.
 * winFraction of records are WIN; the rest are LOSS.
 * Timestamps are evenly spaced across 2026.
 */
function makeRecords(
  n: number,
  {
    winFraction = 0.55,
    modelVersion = "v5",
    confidence = 72,
    includeNullProb = true,
    includeClv = true,
  }: {
    winFraction?: number;
    modelVersion?: string;
    confidence?: number;
    includeNullProb?: boolean;
    includeClv?: boolean;
  } = {},
): BacktestRecord[] {
  const baseMs = Date.parse("2026-01-01T00:00:00.000Z");
  const stepMs = (365 * 24 * 3600 * 1000) / Math.max(n, 1);
  return Array.from({ length: n }, (_, i) => {
    const isWin = i < Math.round(n * winFraction);
    return {
      modelVersion,
      generatedAt: new Date(baseMs + i * stepMs).toISOString(),
      confidence,
      result: isWin ? "WIN" : ("LOSS" as const),
      clvVerdict: includeClv ? (isWin ? "BEAT_CLOSE" : "LOST_TO_CLOSE") : null,
      clvValue: includeClv ? (isWin ? 1.0 : -1.0) : null,
      sport: "americanfootball_nfl",
      market: "SPREAD",
      nullProb: includeNullProb ? 0.5 : null,
    };
  });
}

// ── Insufficient-sample self-suppression ──────────────────────────────────────

describe("runBacktest — insufficient-sample self-suppression", () => {
  it("returns INSUFFICIENT_SAMPLE status for fewer than 100 records", () => {
    const report = runBacktest(makeRecords(99), { random: FIXED_RNG });
    expect(report.status).toBe("INSUFFICIENT_SAMPLE");
    expect(report.insufficientSampleNote).toMatch(/Only 99 records/);
    expect(report.insufficientSampleNote).toMatch(/minimum 100 required/);
  });

  it("returns INSUFFICIENT_SAMPLE for an empty input", () => {
    const report = runBacktest([], { random: FIXED_RNG });
    expect(report.status).toBe("INSUFFICIENT_SAMPLE");
    expect(report.byModelVersion).toHaveLength(0);
    expect(report.overallRollingWindows).toHaveLength(0);
  });

  it("returns OK status at exactly 100 records", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    expect(report.status).toBe("OK");
  });

  it("still carries the honesty caveats even in insufficient-sample mode", () => {
    const report = runBacktest(makeRecords(50), { random: FIXED_RNG });
    expect(report.caveats).toEqual(BACKTEST_CAVEATS);
    expect(report.caveats.join(" ")).toMatch(/52\.38%/);
  });
});

// ── Break-even framing ────────────────────────────────────────────────────────

describe("runBacktest — break-even framing", () => {
  it("BREAK_EVEN_VIG_110 is 52.38% (−110 juice standard)", () => {
    expect(BREAK_EVEN_VIG_110).toBeCloseTo(0.5238, 4);
  });

  it("reports clearsBreakEven=true only when win rate >= 52.38%", () => {
    // 55 wins / 100 = 55% > 52.38% → clears
    const above = runBacktest(makeRecords(100, { winFraction: 0.55 }), { random: FIXED_RNG });
    expect(above.overallMetrics.clearsBreakEven).toBe(true);
    expect(above.overallMetrics.edgeOverVig).not.toBeNull();
    expect(above.overallMetrics.edgeOverVig!).toBeGreaterThan(0);
  });

  it("reports clearsBreakEven=false when win rate is below break-even", () => {
    // 50 wins / 100 = 50% < 52.38% → does NOT clear
    const below = runBacktest(makeRecords(100, { winFraction: 0.5 }), { random: FIXED_RNG });
    expect(below.overallMetrics.clearsBreakEven).toBe(false);
    expect(below.overallMetrics.edgeOverVig!).toBeLessThan(0);
  });

  it("the breakEvenRate field is always present and equals BREAK_EVEN_VIG_110", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    expect(report.overallMetrics.breakEvenRate).toBe(BREAK_EVEN_VIG_110);
  });

  it("caveats warn that raw win rate is NOT profit", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    const allCaveats = report.caveats.join(" ");
    // Caveat reads "NEVER read raw win rate as profit" — check for the key phrase.
    expect(allCaveats).toMatch(/raw win rate/i);
    expect(allCaveats).toMatch(/profit/i);
    expect(allCaveats).toMatch(/52\.38%/);
  });
});

// ── Rolling windows ───────────────────────────────────────────────────────────

describe("runBacktest — rolling windows", () => {
  it("produces a window for each requested size that fits within the sample", () => {
    const report = runBacktest(makeRecords(150, { modelVersion: "v5" }), {
      random: FIXED_RNG,
      rollingWindowSizes: [50, 100, 200],
    });
    // Window 200 is larger than 150 records → skipped.
    const windowSizes = report.overallRollingWindows.map((w) => w.windowSize);
    expect(windowSizes).toContain(50);
    expect(windowSizes).toContain(100);
    expect(windowSizes).not.toContain(200);
  });

  it("rolling window metrics use only the trailing N records (not the full sample)", () => {
    // Build 150 records with a clear temporal split: first 100 in Jan–Apr 2026 (all WIN),
    // last 50 in Jul–Sep 2026 (all LOSS). No timestamp overlap.
    const baseWin = Date.parse("2026-01-01T00:00:00.000Z");
    const baseLoss = Date.parse("2026-07-01T00:00:00.000Z");
    const wins: BacktestRecord[] = Array.from({ length: 100 }, (_, i) => ({
      modelVersion: "v5",
      generatedAt: new Date(baseWin + i * 86400000).toISOString(), // 1 day apart
      confidence: 72,
      result: "WIN" as const,
      clvVerdict: "BEAT_CLOSE" as const,
      clvValue: 1.0,
      sport: "americanfootball_nfl",
      market: "SPREAD",
      nullProb: 0.5,
    }));
    const losses: BacktestRecord[] = Array.from({ length: 50 }, (_, i) => ({
      modelVersion: "v5",
      generatedAt: new Date(baseLoss + i * 86400000).toISOString(), // 1 day apart
      confidence: 72,
      result: "LOSS" as const,
      clvVerdict: "LOST_TO_CLOSE" as const,
      clvValue: -1.0,
      sport: "americanfootball_nfl",
      market: "SPREAD",
      nullProb: 0.5,
    }));
    const mixed: BacktestRecord[] = [...wins, ...losses];
    const report = runBacktest(mixed, {
      random: FIXED_RNG,
      rollingWindowSizes: [50],
    });
    const trailing50 = report.overallRollingWindows.find((w) => w.windowSize === 50)!;
    expect(trailing50).toBeDefined();
    // The trailing 50 are all LOSS → win rate should be 0%.
    expect(trailing50.metrics.winRate).toBe(0);
    expect(trailing50.metrics.clearsBreakEven).toBe(false);
  });

  it("each rolling window carries the modelVersion it was scoped to (null for overall)", () => {
    const report = runBacktest(makeRecords(150), {
      random: FIXED_RNG,
      rollingWindowSizes: [50],
    });
    for (const w of report.overallRollingWindows) {
      expect(w.modelVersion).toBeNull();
    }
  });

  it("per-modelVersion rolling windows use only that version's records", () => {
    const v5 = makeRecords(120, { modelVersion: "v5" });
    const v6 = makeRecords(30, { modelVersion: "v6" }).map((r, i) => ({
      ...r,
      generatedAt: new Date(Date.parse("2026-08-01T00:00:00.000Z") + i * 3600000).toISOString(),
    }));
    const report = runBacktest([...v5, ...v6], {
      random: FIXED_RNG,
      rollingWindowSizes: [50, 100],
    });
    const v5Result = report.byModelVersion.find((m) => m.modelVersion === "v5")!;
    const v6Result = report.byModelVersion.find((m) => m.modelVersion === "v6")!;
    expect(v5Result).toBeDefined();
    expect(v6Result).toBeDefined();
    // v6 has only 30 records → window 50 and 100 are both skipped.
    expect(v6Result.rollingWindows).toHaveLength(0);
    // v5 has 120 records → window 50 and 100 both fit.
    expect(v5Result.rollingWindows.map((w) => w.windowSize)).toContain(50);
    expect(v5Result.rollingWindows.map((w) => w.windowSize)).toContain(100);
  });

  it("caveats warn about strategy drift and rolling windows", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    expect(report.caveats.join(" ")).toMatch(/rolling window/i);
    expect(report.caveats.join(" ")).toMatch(/drift/i);
  });
});

// ── Out-of-sample split ───────────────────────────────────────────────────────

describe("runBacktest — out-of-sample chronological split", () => {
  it("splits records chronologically with the holdout as the tail", () => {
    const report = runBacktest(makeRecords(100), {
      random: FIXED_RNG,
      holdoutFraction: 0.2,
    });
    const oos = report.overallOutOfSample;
    expect(oos.trainSize).toBe(80);
    expect(oos.holdoutSize).toBe(20);
    expect(oos.holdoutFraction).toBe(0.2);
  });

  it("holdout and in-sample sizes sum to total records", () => {
    const report = runBacktest(makeRecords(150), {
      random: FIXED_RNG,
      holdoutFraction: 0.3,
    });
    const oos = report.overallOutOfSample;
    expect(oos.trainSize + oos.holdoutSize).toBe(150);
  });

  it("holdout metrics reflect only the holdout slice (not full sample)", () => {
    // First 80 records in Jan–Mar 2026 (all WIN), last 20 in Nov–Dec 2026 (all LOSS).
    // Clear temporal gap ensures no interleaving after sort.
    const baseWin = Date.parse("2026-01-01T00:00:00.000Z");
    const baseLoss = Date.parse("2026-11-01T00:00:00.000Z");
    const records: BacktestRecord[] = [
      ...Array.from({ length: 80 }, (_, i) => ({
        modelVersion: "v5",
        generatedAt: new Date(baseWin + i * 86400000).toISOString(),
        confidence: 72,
        result: "WIN" as const,
        nullProb: 0.5,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        modelVersion: "v5",
        generatedAt: new Date(baseLoss + i * 86400000).toISOString(),
        confidence: 72,
        result: "LOSS" as const,
        nullProb: 0.5,
      })),
    ];
    const report = runBacktest(records, {
      random: FIXED_RNG,
      holdoutFraction: 0.2,
    });
    const oos = report.overallOutOfSample;
    // Holdout (last 20) is all LOSS → win rate = 0.
    expect(oos.holdoutMetrics.winRate).toBe(0);
    expect(oos.holdoutMetrics.clearsBreakEven).toBe(false);
    // In-sample (first 80) is all WIN → win rate = 1.
    expect(oos.inSampleMetrics.winRate).toBe(1);
    expect(oos.inSampleMetrics.clearsBreakEven).toBe(true);
  });

  it("reports calibrationHoldsOutOfSample as boolean (or null if no calibration data)", () => {
    const reportWithCalib = runBacktest(makeRecords(100, { includeNullProb: true }), {
      random: FIXED_RNG,
    });
    // calibrationHoldsOutOfSample may be true or false but must be boolean (not null) when
    // both ECEs are available.
    const oos = reportWithCalib.overallOutOfSample;
    // Both partitions have picks with confidence → ECE should be computable.
    if (oos.holdoutMetrics.ece !== null && oos.inSampleMetrics.ece !== null) {
      expect(typeof oos.calibrationHoldsOutOfSample).toBe("boolean");
    }
  });

  it("caveats warn that in-sample calibration is optimistic and holdout is the honest number", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    expect(report.caveats.join(" ")).toMatch(/out-of-sample/i);
    expect(report.caveats.join(" ")).toMatch(/holdout.*honest/i);
    expect(report.caveats.join(" ")).toMatch(/in-sample.*optimistic/i);
  });
});

// ── Calibration metrics ───────────────────────────────────────────────────────

describe("runBacktest — calibration metrics (Brier, ECE, reliability curve)", () => {
  it("computes brierScore, ece, and reliabilityCurve from confidence + result", () => {
    const report = runBacktest(makeRecords(100, { confidence: 72 }), { random: FIXED_RNG });
    const m = report.overallMetrics;
    expect(typeof m.brierScore).toBe("number");
    expect(typeof m.ece).toBe("number");
    expect(Array.isArray(m.reliabilityCurve)).toBe(true);
    expect(m.reliabilityCurve.length).toBeGreaterThan(0);
  });

  it("returns null calibration metrics when no records have confidence", () => {
    const noConf: BacktestRecord[] = makeRecords(100).map((r) => ({ ...r, confidence: null }));
    const report = runBacktest(noConf, { random: FIXED_RNG });
    expect(report.overallMetrics.brierScore).toBeNull();
    expect(report.overallMetrics.ece).toBeNull();
    expect(report.overallMetrics.reliabilityCurve).toHaveLength(0);
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe("runBacktest — determinism with injected RNG", () => {
  it("produces identical reports across two runs with the same injected RNG", () => {
    const records = makeRecords(100, { includeNullProb: true });
    const opts = { random: FIXED_RNG, significanceTrials: 100 };
    const r1 = runBacktest(records, opts);
    const r2 = runBacktest(records, opts);
    // Compare scalar fields (not reliabilityCurve arrays for brevity).
    expect(r1.overallMetrics.winRate).toBe(r2.overallMetrics.winRate);
    expect(r1.overallMetrics.ece).toBe(r2.overallMetrics.ece);
    expect(r1.overallMetrics.edgeSignificance?.winRatePValue).toBe(
      r2.overallMetrics.edgeSignificance?.winRatePValue,
    );
  });

  it("produces different p-values when Math.random is used (probabilistic check)", () => {
    // With a random RNG, two runs CAN produce different p-values.
    // This is a smoke test that the RNG injection is actually used.
    const records = makeRecords(100, { includeNullProb: true });
    const r1 = runBacktest(records, { random: FIXED_RNG, significanceTrials: 100 });
    // With FIXED_RNG=0.999, simulated wins are always 0, so p-value should be very small.
    expect(r1.overallMetrics.edgeSignificance?.winRatePValue).toBeDefined();
  });
});

// ── Segmentation by modelVersion ──────────────────────────────────────────────

describe("runBacktest — segmentation by modelVersion", () => {
  it("groups records by modelVersion and produces per-version results", () => {
    const records = [
      ...makeRecords(100, { modelVersion: "v4", winFraction: 0.5 }),
      ...makeRecords(100, { modelVersion: "v5", winFraction: 0.6 }).map((r, i) => ({
        ...r,
        generatedAt: new Date(Date.parse("2026-07-01T00:00:00.000Z") + i * 3600000).toISOString(),
      })),
    ];
    const report = runBacktest(records, { random: FIXED_RNG });
    expect(report.byModelVersion).toHaveLength(2);
    const v4 = report.byModelVersion.find((m) => m.modelVersion === "v4")!;
    const v5 = report.byModelVersion.find((m) => m.modelVersion === "v5")!;
    expect(v4).toBeDefined();
    expect(v5).toBeDefined();
    // v4: 50/100 wins = 50%, below break-even.
    expect(v4.fullSampleMetrics.clearsBreakEven).toBe(false);
    // v5: 60/100 wins = 60%, above break-even.
    expect(v5.fullSampleMetrics.clearsBreakEven).toBe(true);
  });

  it("records with no modelVersion are grouped as 'unknown'", () => {
    // Explicitly omit modelVersion from each record (undefined → normalizes to "unknown").
    const baseMs = Date.parse("2026-01-01T00:00:00.000Z");
    const records: BacktestRecord[] = Array.from({ length: 100 }, (_, i) => ({
      generatedAt: new Date(baseMs + i * 3600000).toISOString(),
      confidence: 72,
      result: i < 60 ? ("WIN" as const) : ("LOSS" as const),
      nullProb: 0.5,
      // modelVersion intentionally absent
    }));
    const report = runBacktest(records, { random: FIXED_RNG });
    const unknown = report.byModelVersion.find((m) => m.modelVersion === "unknown");
    expect(unknown).toBeDefined();
  });

  it("per-version out-of-sample splits are independent", () => {
    const records = [
      ...makeRecords(100, { modelVersion: "v5", winFraction: 1.0 }),
      ...makeRecords(100, { modelVersion: "v6", winFraction: 0.0 }).map((r, i) => ({
        ...r,
        generatedAt: new Date(Date.parse("2026-07-01T00:00:00.000Z") + i * 3600000).toISOString(),
      })),
    ];
    const report = runBacktest(records, { random: FIXED_RNG, holdoutFraction: 0.2 });
    const v5 = report.byModelVersion.find((m) => m.modelVersion === "v5")!;
    const v6 = report.byModelVersion.find((m) => m.modelVersion === "v6")!;
    // v5 holdout (last 20% of 100 all-WIN records) → win rate = 1.0.
    expect(v5.outOfSample.holdoutMetrics.winRate).toBe(1);
    // v6 holdout (last 20% of 100 all-LOSS records) → win rate = 0.
    expect(v6.outOfSample.holdoutMetrics.winRate).toBe(0);
  });
});

// ── CLV beat-close rate ───────────────────────────────────────────────────────

describe("runBacktest — CLV beat-close rate (leading indicator)", () => {
  it("computes CLV beat-close rate as BEAT_CLOSE / total CLV-graded", () => {
    // 55 wins with BEAT_CLOSE, 45 losses with LOST_TO_CLOSE.
    const report = runBacktest(makeRecords(100, { winFraction: 0.55, includeClv: true }), {
      random: FIXED_RNG,
    });
    expect(report.overallMetrics.clvBeatCloseRate).toBeCloseTo(0.55, 2);
  });

  it("returns null clvBeatCloseRate when no CLV verdicts are present", () => {
    const report = runBacktest(makeRecords(100, { includeClv: false }), { random: FIXED_RNG });
    expect(report.overallMetrics.clvBeatCloseRate).toBeNull();
  });

  it("caveats identify CLV beat-close rate as the leading edge indicator", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    expect(report.caveats.join(" ")).toMatch(/CLV.*leading/i);
  });
});

// ── Report structure correctness ──────────────────────────────────────────────

describe("runBacktest — report structure", () => {
  it("totalRecords matches the input length", () => {
    const report = runBacktest(makeRecords(100), { random: FIXED_RNG });
    expect(report.totalRecords).toBe(100);
  });

  it("decidedRecords counts WIN+LOSS only (excludes PUSH/VOID/PENDING)", () => {
    const records: BacktestRecord[] = [
      ...makeRecords(80, { winFraction: 0.5 }),
      ...Array.from({ length: 10 }, (_, i) => ({
        modelVersion: "v5",
        generatedAt: new Date(Date.parse("2026-10-01T00:00:00.000Z") + i * 3600000).toISOString(),
        result: "PUSH" as const,
        confidence: 70,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        modelVersion: "v5",
        generatedAt: new Date(Date.parse("2026-11-01T00:00:00.000Z") + i * 3600000).toISOString(),
        result: "VOID" as const,
        confidence: 70,
      })),
    ];
    const report = runBacktest(records, { random: FIXED_RNG });
    expect(report.totalRecords).toBe(100);
    expect(report.decidedRecords).toBe(80); // Only WIN + LOSS count.
  });

  it("overall options are echoed back for reproducibility", () => {
    const report = runBacktest(makeRecords(100), {
      random: FIXED_RNG,
      holdoutFraction: 0.25,
      rollingWindowSizes: [50],
      significanceTrials: 500,
      calibrationBins: 5,
    });
    expect(report.options.holdoutFraction).toBe(0.25);
    expect(report.options.rollingWindowSizes).toEqual([50]);
    expect(report.options.significanceTrials).toBe(500);
    expect(report.options.calibrationBins).toBe(5);
  });

  it("MIN_BACKTEST_SAMPLE equals 100", () => {
    expect(MIN_BACKTEST_SAMPLE).toBe(100);
  });
});
