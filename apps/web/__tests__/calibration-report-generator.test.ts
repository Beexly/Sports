/**
 * B-04 calibration-report generator — tests for the pure pieces.
 *
 * PARITY PIN: scripts/generate-calibration-report.mjs cannot import the app's
 * TS calibration lib at runtime (plain-node script), so it mirrors the math.
 * The parity suite below locks that mirror to apps/web/lib/calibration/compute.ts
 * on a shared fixture — change either side and this fails until both agree.
 */
import { describe, it, expect } from "vitest";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";
import {
  CALIBRATION_GATE_MIN_SAMPLE,
  BREAK_EVEN_HIT_RATE,
  MAX_ACCEPTABLE_BRIER,
  MIN_BUCKET_SAMPLE,
  BUCKET_DRIFT_BLOCK,
  computeBuckets,
  wilsonInterval,
  americanToImpliedProb,
  tallyResults,
  sportBreakdown,
  windowBreakdown,
  clvSummary,
  buildVerdict,
  buildReport,
} from "../../../scripts/generate-calibration-report.mjs";

/** Fixture spanning every bucket, the out-of-range fallback, PUSH, and unsettled results. */
const PARITY_FIXTURE: CalibrationPickInput[] = [
  { id: "p01", confidence: 45, result: "WIN" }, // below 50 → falls back to the 50-59 bucket
  { id: "p02", confidence: 50, result: "LOSS" },
  { id: "p03", confidence: 59, result: "WIN" },
  { id: "p04", confidence: 60, result: "PUSH" },
  { id: "p05", confidence: 65, result: "WIN" },
  { id: "p06", confidence: 69, result: "LOSS" },
  { id: "p07", confidence: 72, result: "WIN" },
  { id: "p08", confidence: 74, result: "LOSS" },
  { id: "p09", confidence: 76, result: "PUSH" },
  { id: "p10", confidence: 83, result: "WIN" },
  { id: "p11", confidence: 89, result: "WIN" },
  { id: "p12", confidence: 90, result: "LOSS" },
  { id: "p13", confidence: 100, result: "WIN" }, // expected prob clamps at 0.99
  { id: "p14", confidence: 77, result: "PENDING" }, // excluded by both implementations
  { id: "p15", confidence: 81, result: "VOID" }, // excluded by both implementations
];

describe("parity: generator mirror vs apps/web/lib/calibration/compute.ts", () => {
  it("produces identical buckets, sample size, and overall Brier on the fixture", () => {
    const lib = computeCalibration(PARITY_FIXTURE);
    const mirror = computeBuckets(PARITY_FIXTURE);

    expect(mirror.sampleSize).toBe(lib.sampleSize);
    expect(mirror.brierScore).toBe(lib.brierScore);
    expect(mirror.buckets).toEqual(lib.buckets);
  });

  it("matches the lib on the empty input (zero-sample honesty)", () => {
    const lib = computeCalibration([]);
    const mirror = computeBuckets([]);

    expect(mirror.sampleSize).toBe(0);
    expect(mirror.brierScore).toBeNull();
    expect(mirror.buckets).toEqual(lib.buckets);
  });
});

describe("gate policy constants", () => {
  it("pins the launch-gate thresholds", () => {
    expect(CALIBRATION_GATE_MIN_SAMPLE).toBe(150);
    expect(BREAK_EVEN_HIT_RATE).toBeCloseTo(110 / 210, 10);
    expect(MAX_ACCEPTABLE_BRIER).toBe(0.25);
    // Bucket judgment thresholds mirror compute.ts (MIN_BUCKET_SAMPLE / PROPOSAL_DELTA)
    expect(MIN_BUCKET_SAMPLE).toBe(30);
    expect(BUCKET_DRIFT_BLOCK).toBe(0.12);
  });
});

describe("wilsonInterval", () => {
  it("returns null on an empty sample instead of fabricating an interval", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
  });

  it("matches the known Wilson interval for 50/100 at z=1.96", () => {
    const ci = wilsonInterval(50, 100);
    expect(ci).not.toBeNull();
    expect(ci!.point).toBeCloseTo(0.5, 10);
    expect(ci!.lower).toBeCloseTo(0.4038, 3);
    expect(ci!.upper).toBeCloseTo(0.5962, 3);
  });

  it("stays within [0,1] and narrows as the sample grows", () => {
    const small = wilsonInterval(9, 10)!;
    const large = wilsonInterval(900, 1000)!;
    expect(small.lower).toBeGreaterThanOrEqual(0);
    expect(small.upper).toBeLessThanOrEqual(1);
    expect(large.upper - large.lower).toBeLessThan(small.upper - small.lower);
  });
});

describe("americanToImpliedProb", () => {
  it("converts negative and positive American odds", () => {
    expect(americanToImpliedProb(-110)).toBeCloseTo(110 / 210, 10);
    expect(americanToImpliedProb(150)).toBeCloseTo(0.4, 10);
  });

  it("degrades to null on missing or nonsensical prices", () => {
    expect(americanToImpliedProb(null)).toBeNull();
    expect(americanToImpliedProb(undefined)).toBeNull();
    expect(americanToImpliedProb(0)).toBeNull();
    expect(americanToImpliedProb(Number.NaN)).toBeNull();
  });
});

describe("tallyResults / breakdowns", () => {
  const picks = [
    { confidence: 70, result: "WIN", sport: "NFL", settledAt: new Date("2026-06-01T00:00:00Z") },
    { confidence: 70, result: "LOSS", sport: "NFL", settledAt: new Date("2026-03-01T00:00:00Z") },
    { confidence: 70, result: "PUSH", sport: "NBA", settledAt: null },
  ];

  it("computes the decisive hit rate with pushes excluded", () => {
    const tally = tallyResults(picks);
    expect(tally).toMatchObject({ wins: 1, losses: 1, pushes: 1, decisive: 2 });
    expect(tally.hitRate).toBeCloseTo(0.5, 10);
  });

  it("groups per sport with per-group Brier", () => {
    const rows = sportBreakdown(picks);
    expect(rows.map((row) => row.sport)).toEqual(["NFL", "NBA"]);
    expect(rows[0]!.sampleSize).toBe(2);
    expect(rows[0]!.brierScore).not.toBeNull();
  });

  it("buckets time windows by settledAt and keeps unstamped picks in all-time only", () => {
    const rows = windowBreakdown(picks, new Date("2026-06-10T00:00:00Z"));
    const byLabel = new Map(rows.map((row) => [row.label, row]));
    expect(byLabel.get("All time")!.sampleSize).toBe(3); // includes the null-settledAt push
    expect(byLabel.get("Last 90 days")!.sampleSize).toBe(1);
    expect(byLabel.get("Last 14 days")!.sampleSize).toBe(1);
  });
});

describe("clvSummary", () => {
  it("degrades honestly when no CLV/closing data exists", () => {
    const summary = clvSummary([{ confidence: 70, result: "WIN", pickType: "SPREAD", clvPositive: null, closingPrice: null }]);
    expect(summary.clvSampleSize).toBe(0);
    expect(summary.clvPositiveRate).toBeNull();
    expect(summary.moneylineComparisonSample).toBe(0);
    expect(summary.moneylineModelBrier).toBeNull();
  });

  it("computes CLV-positive rate and the moneyline model-vs-close Brier pair", () => {
    const summary = clvSummary([
      { confidence: 60, result: "WIN", pickType: "MONEYLINE", clvPositive: true, closingPrice: -120 },
      { confidence: 60, result: "LOSS", pickType: "MONEYLINE", clvPositive: false, closingPrice: 110 },
      { confidence: 70, result: "WIN", pickType: "SPREAD", clvPositive: true, closingPrice: null },
    ]);
    expect(summary.clvSampleSize).toBe(3);
    expect(summary.clvPositiveRate).toBeCloseTo(2 / 3, 10);
    expect(summary.moneylineComparisonSample).toBe(2);
    expect(summary.moneylineModelBrier).not.toBeNull();
    expect(summary.moneylineCloseBrier).not.toBeNull();
  });
});

describe("buildVerdict — never softened", () => {
  const cleanBuckets = [{ label: "70-79", sampleSize: 160, delta: 0.02 }];
  const goodCi = { lower: 0.55, upper: 0.65, point: 0.6 };

  it("stub mode: says exactly that the sample is 0 and lists GA-01/GA-02", () => {
    const verdict = buildVerdict({
      dataStatus: "stub",
      dbErrorMessage: null,
      sampleSize: 0,
      brierScore: null,
      hitRateCi: null,
      buckets: [],
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("Not yet");
    expect(verdict.line).toContain("0 graded picks");
    expect(verdict.unblockedBy.join("\n")).toContain("GA-01");
    expect(verdict.unblockedBy.join("\n")).toContain("GA-02");
  });

  it("unreachable DB: refuses to claim a zero sample as truth", () => {
    const verdict = buildVerdict({
      dataStatus: "unreachable",
      dbErrorMessage: "ECONNREFUSED 127.0.0.1:5433",
      sampleSize: 0,
      brierScore: null,
      hitRateCi: null,
      buckets: [],
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("cannot be read");
    expect(verdict.line).toContain("ECONNREFUSED");
  });

  it("live with zero rows: honest 0-graded-picks verdict", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 0,
      brierScore: null,
      hitRateCi: null,
      buckets: [],
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("0 graded picks");
  });

  it("under-sample: names the exact shortfall against the 150 gate", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 80,
      brierScore: 0.2,
      hitRateCi: goodCi,
      buckets: cleanBuckets,
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("80 of the 150");
  });

  it("CI lower bound below -110 break-even blocks even with a big sample", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 200,
      brierScore: 0.2,
      hitRateCi: { lower: 0.5, upper: 0.6, point: 0.55 },
      buckets: cleanBuckets,
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("break-even");
  });

  it("Brier at/above 0.25 blocks", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 200,
      brierScore: 0.25,
      hitRateCi: goodCi,
      buckets: cleanBuckets,
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("Brier");
  });

  it("a materially drifting bucket (n>=30, |delta|>=0.12) blocks and is named", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 200,
      brierScore: 0.2,
      hitRateCi: goodCi,
      buckets: [{ label: "80-89", sampleSize: 40, delta: -0.15 }],
    });
    expect(verdict.ready).toBe(false);
    expect(verdict.line).toContain("80-89");
  });

  it("small drifting buckets (n<30) do NOT block — noise is not evidence", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 200,
      brierScore: 0.2,
      hitRateCi: goodCi,
      buckets: [{ label: "80-89", sampleSize: 12, delta: -0.3 }],
    });
    expect(verdict.ready).toBe(true);
  });

  it("all gates green → an unhedged Yes", () => {
    const verdict = buildVerdict({
      dataStatus: "live",
      dbErrorMessage: null,
      sampleSize: 200,
      brierScore: 0.21,
      hitRateCi: goodCi,
      buckets: cleanBuckets,
    });
    expect(verdict.ready).toBe(true);
    expect(verdict.line).toContain("Good enough to charge money? Yes.");
    expect(verdict.unblockedBy).toEqual([]);
  });
});

describe("buildReport — empty-state markdown (today's reality)", () => {
  it("stub mode renders the honest zero-sample report with the unblock list", () => {
    const { markdown, verdict } = buildReport({
      picks: [],
      dataStatus: "stub",
      dbErrorMessage: null,
      now: new Date("2026-06-10T12:00:00Z"),
    });
    expect(verdict.ready).toBe(false);
    expect(markdown).toContain("Good enough to charge money? Not yet");
    expect(markdown).toContain("0 graded picks");
    expect(markdown).toContain("GA-01");
    expect(markdown).toContain("GA-02");
    expect(markdown).toContain("STUB");
    expect(markdown).toContain("| Graded canonical picks | >= 150 | 0 | NOT MET |");
    expect(markdown).toContain("No closing-line data exists yet.");
    expect(markdown).toContain("AUTO-GENERATED");
  });

  it("a graded sample renders curves, trend, and per-sport tables", () => {
    const { markdown } = buildReport({
      picks: PARITY_FIXTURE.map((pick) => ({
        ...pick,
        sport: "NFL",
        pickType: "SPREAD",
        settledAt: new Date("2026-06-08T00:00:00Z"),
        clvPositive: null,
        closingPrice: null,
      })),
      dataStatus: "live",
      dbErrorMessage: null,
      now: new Date("2026-06-10T12:00:00Z"),
    });
    expect(markdown).toContain("| NFL |");
    expect(markdown).toContain("| Last 14 days |");
    expect(markdown).toContain("| 70-79 |");
    // 13 graded < 150 → still an honest Not yet
    expect(markdown).toContain("Not yet");
    expect(markdown).toContain("13 of the 150");
  });
});
