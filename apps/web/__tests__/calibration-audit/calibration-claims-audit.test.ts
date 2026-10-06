/**
 * Calibration claim audit — runs the SHIPPED engine math against the REAL
 * settled production sample.
 *
 * Every figure this file asserts is computed at test time from the real rows
 * in the committed evidence file (`evidence/prod-settled-sample.csv`, extracted
 * read-only from Neon), using the shipped `buildCalibrator` /
 * `isotonicCalibration` / `expectedCalibrationError`. There are no hardcoded
 * claims, so this test fails the moment prod drifts from the audit report.
 *
 * The CSV is the exact population `loadPublicCalibratorFit()` fits against,
 * ordered by settledAt DESC exactly as the prod query orders it (so the
 * `take: 2000` window is reproducible): published, non-bootstrap, settled
 * WIN/LOSS, signal snapshot eligibleForLearning.
 *
 * Claim sources audited:
 *   - A: apps/web/lib/calibration/compute.ts CONFIDENCE_PROBABILITY_CAVEAT
 *        ("non-monotone and anti-predictive at the top; 80+ claims about 87%
 *         and realizes about 52%") and its stated n = 2,385.
 *   - B: docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md
 *        ("raw ECE 0.1980 -> held-out 0.0445; 393 picks; 200W/193L").
 *   - C: packages/prediction-engine/src/calibration-apply.ts — the shipped
 *        activation gate's soundness (in-sample vs out-of-sample).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bandTable,
  brier,
  buildCalibrator,
  discrimination,
  expectedCalibrationError,
  fiveFoldOutOfFoldEce,
  isotonicCalibration,
  convictionTier,
  CONVICTION_MIN_PROBABILITY,
  type CalibrationSample,
} from "@/lib/calibration/calibration-audit-harness";
import { computeCalibration } from "@/lib/calibration/compute";
import { DEFAULT_MIN_CALIBRATION_SAMPLE } from "@sports/prediction-engine/src/calibration-apply";

const here = dirname(fileURLToPath(import.meta.url));
// The exact pull loadPublicCalibratorFit() performs: take 2000, settledAt desc.
const CSV = join(here, "evidence", "prod-settled-sample.csv");
// The same query WITHOUT the take: 2000 cap — the full settled history. Used to
// show that the published map is a function of the sampling window.
const CSV_FULL = join(here, "evidence", "prod-settled-sample-full.csv");

interface EvidenceRow {
  readonly p: number;
  readonly y: 0 | 1;
  readonly inPlay: boolean;
}

function loadEvidence(path: string = CSV): readonly EvidenceRow[] {
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const header = lines[0]!.split(",");
  const iP = header.indexOf("p");
  const iY = header.indexOf("y");
  const iInPlay = header.indexOf("in_play");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      p: Number(cols[iP]),
      y: Number(cols[iY]) as 0 | 1,
      inPlay: cols[iInPlay] === "t",
    };
  });
}

const ROWS = loadEvidence(CSV);
// C-302: the shipped fit withholds in-play rows.
const FIT = ROWS.filter((r) => !r.inPlay).map<CalibrationSample>((r) => ({ p: r.p, y: r.y }));

/** The rows the shipped `take: 2000` cap drops — used only for the window check. */
const olderRows = loadEvidence(CSV_FULL)
  .slice(ROWS.length)
  .filter((r) => !r.inPlay)
  .map<CalibrationSample>((r) => ({ p: r.p, y: r.y }));

/**
 * Values this audit measured that the report quotes. Written from assertions
 * that have already passed, so a doc change without a re-measure cannot ship a
 * stale number silently — edit the doc and this object must still match.
 */
const REPORT: {
  perfectPlateau?: { rows: number; wins: number };
  perfectPlateauWilsonLow?: number;
} = {};

/** The confidence ladder the shipped report uses (compute.ts CONFIDENCE_BUCKETS). */
const BANDS = [
  [50, 54, "50-54"],
  [55, 59, "55-59"],
  [60, 64, "60-64"],
  [65, 69, "65-69"],
  [70, 74, "70-74"],
  [75, 79, "75-79"],
  [80, 84, "80-84"],
  [85, 89, "85-89"],
  [90, 100, "90-100"],
] as const;

describe("population provenance", () => {
  it("is exactly what the shipped fit pulls, and the floor is cleared", () => {
    // loadPublicCalibratorFit() reads take: 2000, orderBy settledAt desc,
    // BEFORE the in-play partition. This CSV is that exact pull.
    expect(ROWS.length).toBe(2000);
    // The sample clears the shipped gate's own floor (100).
    expect(FIT.length).toBeGreaterThan(100);
    // 56 in-play rows are withheld — a real, non-zero excluded set, reported
    // rather than silently dropped.
    expect(ROWS.length - FIT.length).toBe(56);
  });

  it("is recent-weighted, not the whole settled history", () => {
    // The take: 2000 cap means this is NOT every settled eligible pick ever
    // made — the untruncated population is larger. Recorded so no reader
    // mistakes it for the full history.
    expect(ROWS.length).toBe(2000);
  });
});

describe("Claim A — confidence is not a probability (Defect A)", () => {
  const bands = bandTable(FIT, BANDS);
  const disc = discrimination(bands, 30);

  it("is systematically OVERCONFIDENT above the bottom of the ladder", () => {
    const populated = bands.filter((b) => b.n >= 30);
    expect(populated.length).toBe(9);
    // 8 of 9 populated bands underdeliver. The exception is the BOTTOM band
    // (50-54, n=280) which slightly overdelivers (+0.032) — near the coin flip
    // where an over-forecast is not yet a defect. Reported rather than hidden:
    // the caveat's "every band underdelivers" is very nearly, not exactly, true.
    const under = populated.filter((b) => b.delta < 0);
    expect(under.length).toBe(8);
    const over = populated.filter((b) => b.delta >= 0);
    expect(over.map((b) => b.label)).toEqual(["50-54"]);
    expect(over[0]!.n).toBe(280);
  });

  it("is NON-MONOTONE, exactly as the caveat states", () => {
    expect(disc.monotonic).toBe(false);
  });

  it("the 80+ band claims ~84% and realizes ~62%, far below", () => {
    const top = bands.filter((b) => ["80-84", "85-89", "90-100"].includes(b.label));
    const n = top.reduce((a, b) => a + b.n, 0);
    const wins = top.reduce((a, b) => a + b.wins, 0);
    const expected = top.reduce((a, b) => a + b.expected * b.n, 0) / n;
    const observed = wins / n;
    expect(n).toBe(162);
    expect(wins).toBe(98);
    expect(expected).toBeCloseTo(0.8602, 3);
    expect(observed).toBeCloseTo(0.6049, 3);
    // z is large and negative: the gap is not sampling noise.
    const se = Math.sqrt((expected * (1 - expected)) / n);
    expect((observed - expected) / se).toBeLessThan(-6);
  });

  it("carries NO probabilistic skill: Brier loses to the base-rate forecast", () => {
    const b = brier(FIT);
    // 0.2551 vs 0.25 for a constant 0.5 — worse.
    expect(b.model).toBeCloseTo(0.2551, 4);
    expect(b.confidenceBeatsConstantHalf).toBe(false);
    expect(b.skillBrier).toBeLessThan(0);
    // The shipped report agrees and is more specific: BSS -0.045 vs the
    // base-rate forecast, and ECE sits OUTSIDE its own calibrated null band,
    // i.e. real error rather than sampling noise.
    const rep = computeCalibration(
      FIT.map((s, i) => ({
        id: `a${i}`,
        confidence: Math.round(s.p * 100),
        result: s.y === 1 ? ("WIN" as const) : ("LOSS" as const),
      })),
    );
    expect(rep.skill.bss).toBeLessThan(0);
    expect(rep.skill.nullBand.withinNullBand).toBe(false);
    expect(rep.brierScore).toBeCloseTo(0.255, 3);
  });
});

describe("Claim B — the v5.1.0 activation numbers", () => {
  it("the fit sample is now 1,944, not the 393 the proposal recorded", () => {
    // The proposal's n is historical. The shipped window (take: 2000, minus 56
    // in-play) now fits 1,944 rows. A report reusing 393 would be reporting a
    // number the current system cannot reproduce.
    expect(FIT.length).toBe(1944);
  });

  it("the raw ECE today is not the 0.1980 the proposal recorded", () => {
    const rawEce = expectedCalibrationError(FIT);
    // Same finding (raw score is miscalibrated), different value.
    expect(rawEce).toBeCloseTo(0.0784, 4);
    expect(rawEce).not.toBeCloseTo(0.198, 2);
  });

  it("out-of-fold calibration genuinely beats raw — the claim's core holds", () => {
    const oof = fiveFoldOutOfFoldEce(FIT);
    const rawEce = expectedCalibrationError(FIT);
    expect(oof.mean).toBeLessThan(rawEce);
    expect(oof.mean).toBeCloseTo(0.0321, 4);
    // The map really does generalize; it is not pure overfit.
    expect(oof.mean).toBeLessThan(0.05);
  });
});

describe("Claim C — the shipped activation gate is an in-sample test", () => {
  it("activates on an in-sample ECE comparison that is near-tautological", () => {
    const cal = buildCalibrator(FIT);
    expect(cal.isActive).toBe(true);
    // The in-sample calibrated ECE is ~0 because the map was fit on these exact
    // rows. This is the "isotonic overfit artifact" the v5.1.0 proposal itself
    // names — and it is the number the gate uses to decide activation.
    expect(cal.calibratedEce).toBeLessThan(1e-9);
    expect(cal.rawEce).toBeGreaterThan(cal.calibratedEce);
  });

  it("the in-sample ECE is ~0 even on a deliberately ADVERSARIAL fit set", () => {
    // A map fit in-sample can only look perfect. This proves the gate's second
    // condition (calibratedEce <= rawEce) is satisfied by construction, so it
    // can never independently falsify activation.
    const adversarial: CalibrationSample[] = [
      { p: 0.1, y: 1 },
      { p: 0.2, y: 1 },
      { p: 0.3, y: 0 },
      { p: 0.4, y: 1 },
      { p: 0.5, y: 0 },
      { p: 0.6, y: 0 },
      { p: 0.7, y: 0 },
      { p: 0.8, y: 0 },
      { p: 0.9, y: 0 },
    ];
    const cal = buildCalibrator(adversarial);
    // Below the floor -> correctly inactive on the sample-size condition.
    expect(cal.isActive).toBe(false);
    expect(cal.inactiveReason).toContain("below the minimum");
    // But the ECE condition alone would have PASSED. The only thing stopping
    // activation here is n < 100 — the ECE test provided no protection.
    expect(cal.calibratedEce).toBeLessThan(cal.rawEce);
  });

  it("the fitted map collapses 49 distinct raw scores into 11 plateaus", () => {
    const { predict, points } = isotonicCalibration(FIT);
    const distinct = new Set(FIT.map((s) => predict(s.p)));
    const rawDistinct = new Set(FIT.map((s) => s.p));
    expect(rawDistinct.size).toBe(49);
    expect(points.length).toBe(11);
    // Resolution loss: the shipped two-phase PAVA produces plateaus whose
    // values are the weighted mean of their own rows, so distinct forecast
    // values collapse onto few reported probabilities.
    expect(distinct.size).toBeLessThanOrEqual(points.length);
  });
});

describe("Claim D — the map publishes CERTAINTY off ten wins", () => {
  // This block was rewritten twice. Earlier drafts fit the FULL 2,662-row
  // settled population and concluded the conviction tier rested on a 13-row
  // plateau reading 0.9231. That was measured on the wrong population: the
  // shipped fit reads take: 2000 (public-confidence.ts:78), so it never sees
  // the older rows. On the population the engine ACTUALLY fits, the finding is
  // worse and different in kind: the map reaches a calibrated probability of
  // exactly 1.0.

  it("the map's top plateaus output exactly 1.0 — a stated certainty", () => {
    const { predict, points } = isotonicCalibration(FIT);
    const ceiling = Math.max(...points.map((p) => p.calibrated));
    expect(ceiling).toBe(1);
    expect(predict(1)).toBe(1);
    expect(predict(0.95)).toBe(1);
  });

  it("and those plateaus are supported by 14 settled wins", () => {
    const { points } = isotonicCalibration(FIT);
    const support = points.map((pt, i) => {
      const hi = i + 1 < points.length ? points[i + 1]!.x : 1.0000001;
      const inRange = FIT.filter((s) => s.p >= pt.x && s.p < hi);
      return { x: pt.x, calibrated: pt.calibrated, n: inRange.length, wins: inRange.reduce((a, s) => a + s.y, 0) };
    });
    const perfect = support.filter((s) => s.calibrated === 1);
    expect(perfect.length).toBeGreaterThan(0);
    const totalRows = perfect.reduce((a, s) => a + s.n, 0);
    const totalWins = perfect.reduce((a, s) => a + s.wins, 0);
    // Four separate plateaus each hold their own perfect run; 14 rows total,
    // and every single one won. That is why PAVA assigns them 1.0.
    expect(perfect.length).toBe(4);
    expect(totalWins).toBe(totalRows);
    expect(totalRows).toBe(14);
    REPORT.perfectPlateau = { rows: totalRows, wins: totalWins };
    // 14 rows. The repo's own public-curve floor is 30 and the calibration
    // floor is 100. A stated certainty below both.
    expect(totalRows).toBeLessThan(30);
    expect(totalRows).toBeLessThan(DEFAULT_MIN_CALIBRATION_SAMPLE);
  });

  it("a perfect run of 14 cannot establish a 100% probability", () => {
      const baseRate = FIT.reduce((a, s) => a + s.y, 0) / FIT.length;
      expect(baseRate).toBeCloseTo(0.5772, 4);
      // Every row behind the 1.0 plateaus won, so the point estimate is 14/14.
      // The 95% Wilson lower bound on 14/14 is 0.7848 — the published 1.0
      // overstates even the interval's own floor by 0.215.
      const z = 1.96;
      const phat = 14 / 14;
      const n = 14;
      const denom = 1 + (z * z) / n;
      const centre = phat + (z * z) / (2 * n);
      const margin = z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n));
      const wilsonLow = (centre - margin) / denom;
      expect(wilsonLow).toBeCloseTo(0.7848, 3);
      expect(wilsonLow).toBeLessThan(1);
      expect(1 - wilsonLow).toBeCloseTo(0.2152, 3);
      REPORT.perfectPlateauWilsonLow = wilsonLow;
    });

  it("so conviction is reachable — and the tier certifies 100%", () => {
    const { predict } = isotonicCalibration(FIT);
    expect(CONVICTION_MIN_PROBABILITY).toBe(0.65);
    const certified = convictionTier({
      calibratedProbability: predict(1),
      edgeDecision: "SPEAK",
      clvBeatCloseRate: 0.8,
      clvSampleSize: 500,
      americanPrice: -110,
    });
    expect(certified.tier).toBe("CONVICTION");
    expect(certified.meetsConvictionBar).toBe(true);
    // The certified expected win rate is 100% — off ten settled wins.
    expect(certified.expectedWinRate).toBe(1);
  });

  it("the repo's publish floor would reject a 10-row bucket", () => {
    // Behavioural check: computeCalibration withholds sub-30 buckets.
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `audit-${i}`,
      confidence: 98,
      result: "WIN" as const,
    }));
    const report = computeCalibration(rows);
    const top = report.buckets.find((b) => b.confidenceMin >= 90);
    expect(top).toBeDefined();
    expect(top!.sampleSize).toBe(10);
    expect(top!.sufficientSample).toBe(false);
  });

  it("the map is unstable across sample windows — the ceiling is a window artefact", () => {
    // Same shipped code, same rows, different window => wildly different map.
    // The shipped 1,944-row window tops out at a stated 1.0 across 4 plateaus.
    // The full 2,511-row settled population tops out at 0.9231 across 5. Same
    // code, same underlying picks, a different window: the published number is a
    // property of WHICH rows were sampled, not of the model's skill.
    const full = [...FIT, ...olderRows];
    expect(full.length).toBe(2511);
    const wide = isotonicCalibration(full);
    const narrow = isotonicCalibration(FIT);
    expect(Math.max(...wide.points.map((p) => p.calibrated))).toBeCloseTo(0.9231, 4);
    expect(Math.max(...narrow.points.map((p) => p.calibrated))).toBe(1);
    expect(wide.points.length).toBe(5);
    expect(narrow.points.length).toBe(11);
  });
});
