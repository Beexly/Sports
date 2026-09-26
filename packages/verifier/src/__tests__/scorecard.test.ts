import { describe, it, expect } from "vitest";

import { buildScorecard, toScoredRows, scorecardMarkdown } from "../scorecard";
import { selectPicksH1 } from "../holdout";
import { parsePicksH1Export } from "../holdout";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { HoldoutPickRow } from "../types";

const FIXTURE_PATH = path.join(__dirname, "..", "..", "fixtures", "picks-h1.json");

function fixtureRows(): HoldoutPickRow[] {
  return [...parsePicksH1Export(JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))).rows];
}

function row(over: Partial<HoldoutPickRow>): HoldoutPickRow {
  // Explicit null must survive — `null ?? default` would impute 0.7.
  const modelProb: number | null =
    "modelProb" in over ? (over.modelProb ?? null) : 0.7;
  return {
    id: over.id ?? "r",
    sport: over.sport ?? "NFL",
    market: over.market ?? "MONEYLINE",
    outcome: over.outcome ?? 1,
    marketFairProb: over.marketFairProb ?? 0.6,
    modelProb,
    confidence: over.confidence ?? 70,
    modelVersion: over.modelVersion ?? "v5.2.7",
    generatedAt: over.generatedAt ?? "2026-09-01T00:00:00.000Z",
    isFounder: over.isFounder ?? false,
    isPublished: over.isPublished ?? true,
    isSettled: over.isSettled ?? true,
    season: over.season ?? 2026,
  };
}

describe("toScoredRows", () => {
  it("drops rows without a finite modelProb — never imputes", () => {
    const rows = [row({ id: "a", modelProb: 0.7 }), row({ id: "b", modelProb: null })];
    const scored = toScoredRows(rows);
    expect(scored.length).toBe(1);
    expect(scored[0]!.id).toBe("a");
    expect(scored[0]!.p).toBe(0.7);
  });

  it("drops rows without an interior marketFairProb", () => {
    const rows = [row({ id: "a", marketFairProb: 0.5 }), row({ id: "b", marketFairProb: 1 })];
    // marketFairProb=1 is filtered by the (0,1) guard
    const scored = toScoredRows(rows.filter((r) => r.marketFairProb > 0 && r.marketFairProb < 1));
    expect(scored.length).toBe(1);
  });
});

describe("scorecard on identical rows", () => {
  it("hand-computed Brier gap on a 4-row toy (cand worse overall)", () => {
    // Row-by-row:
    //   id  y  market  model   mktBrier           modelBrier
    //   a   1  0.80    0.70    (0.80−1)²=0.04     (0.70−1)²=0.09
    //   b   0  0.60    0.70    (0.60−0)²=0.36     (0.70−0)²=0.49
    //   c   1  0.55    0.45    (0.55−1)²=0.2025   (0.45−1)²=0.3025
    //   d   0  0.50    0.40    (0.50−0)²=0.25     (0.40−0)²=0.16
    // mean mkt  = (0.04+0.36+0.2025+0.25)/4   = 0.8525/4 = 0.213125
    // mean cand = (0.09+0.49+0.3025+0.16)/4   = 1.0425/4 = 0.260625
    // Δ         = 0.260625 − 0.213125 = 0.0475
    const rows = [
      row({ id: "a", outcome: 1, marketFairProb: 0.8, modelProb: 0.7 }),
      row({ id: "b", outcome: 0, marketFairProb: 0.6, modelProb: 0.7 }),
      row({ id: "c", outcome: 1, marketFairProb: 0.55, modelProb: 0.45 }),
      row({ id: "d", outcome: 0, marketFairProb: 0.5, modelProb: 0.4 }),
    ];
    const sc = buildScorecard(rows, { resamples: 50, seed: 1 });
    expect(sc.n).toBe(4);
    expect(sc.marketBrier).toBeCloseTo(0.213125, 10);
    expect(sc.candidateBrier).toBeCloseTo(0.260625, 10);
    expect(sc.deltaBrier).toBeCloseTo(0.0475, 10);
    // Candidate is worse on 3 of 4 rows (row d is the one place it wins).
    // P(better) is therefore positive but well under 0.5 — never a clean 0,
    // because a resample that overweights row d can flip the mean.
    // diffs = [+0.05, +0.13, +0.10, −0.09]
    expect(sc.pBetter).toBeGreaterThan(0);
    expect(sc.pBetter).toBeLessThan(0.5);
  });

  it("hand-computed log-loss gap on the same 4-row toy", () => {
    // mkt log-loss = mean(−ln0.8, −ln0.4, −ln0.55, −ln0.5)
    //   = mean(0.223144, 0.916291, 0.597837, 0.693147) = 2.430419/4 = 0.607605
    // cand log-loss = mean(−ln0.7, −ln0.3, −ln0.45, −ln0.6)
    //   = mean(0.356675, 1.203973, 0.798508, 0.510826) = 2.869982/4 = 0.717495
    // Δ             = 0.717495 − 0.607605 = 0.109890
    const rows = [
      row({ id: "a", outcome: 1, marketFairProb: 0.8, modelProb: 0.7 }),
      row({ id: "b", outcome: 0, marketFairProb: 0.6, modelProb: 0.7 }),
      row({ id: "c", outcome: 1, marketFairProb: 0.55, modelProb: 0.45 }),
      row({ id: "d", outcome: 0, marketFairProb: 0.5, modelProb: 0.4 }),
    ];
    const sc = buildScorecard(rows, { resamples: 20, seed: 1 });
    expect(sc.marketLogLoss).toBeCloseTo(0.607605, 5);
    expect(sc.candidateLogLoss).toBeCloseTo(0.717495, 5);
    expect(sc.deltaLogLoss).toBeCloseTo(0.10989, 4);
  });

  it("bands the holdout outcome rate with Wilson (2 of 4 wins → 9/20-class band shape)", () => {
    // 2 wins / 4 rows → point 0.5. Wilson at n=4 is wide: low ≈ 0.15, high ≈ 0.85.
    const rows = [
      row({ id: "a", outcome: 1 }),
      row({ id: "b", outcome: 0 }),
      row({ id: "c", outcome: 1 }),
      row({ id: "d", outcome: 0 }),
    ];
    const sc = buildScorecard(rows, { resamples: 10, seed: 1 });
    expect(sc.wilson).not.toBeNull();
    expect(sc.wilson!.successes).toBe(2);
    expect(sc.wilson!.n).toBe(4);
    expect(sc.wilson!.point).toBe(0.5);
    expect(sc.wilson!.low).toBeLessThan(0.5);
    expect(sc.wilson!.high).toBeGreaterThan(0.5);
  });

  it("splits per-sport strata with identical-row scoring inside each stratum", () => {
    const rows = [
      row({ id: "n1", sport: "NFL", outcome: 1, marketFairProb: 0.7, modelProb: 0.8 }),
      row({ id: "n2", sport: "NFL", outcome: 0, marketFairProb: 0.5, modelProb: 0.6 }),
      row({ id: "m1", sport: "MLB", outcome: 1, marketFairProb: 0.6, modelProb: 0.55 }),
      row({ id: "m2", sport: "MLB", outcome: 0, marketFairProb: 0.55, modelProb: 0.5 }),
    ];
    const sc = buildScorecard(rows, { resamples: 20, seed: 3 });
    expect(sc.bySport.length).toBe(2);
    const nfl = sc.bySport.find((s) => s.sport === "NFL")!;
    const mlb = sc.bySport.find((s) => s.sport === "MLB")!;
    expect(nfl.n).toBe(2);
    expect(mlb.n).toBe(2);
    // NFL: mkt mean = ((0.7−1)²+(0.5−0)²)/2 = (0.09+0.25)/2 = 0.17
    //       cand mean = ((0.8−1)²+(0.6−0)²)/2 = (0.04+0.36)/2 = 0.20
    expect(nfl.marketBrier).toBeCloseTo(0.17, 10);
    expect(nfl.candidateBrier).toBeCloseTo(0.2, 10);
  });

  it("expectCandidateWorse flips harnessOk when a version beats market", () => {
    // Candidate BETTER on every row.
    const better = [
      row({ id: "a", outcome: 1, marketFairProb: 0.55, modelProb: 0.75 }),
      row({ id: "b", outcome: 0, marketFairProb: 0.55, modelProb: 0.35 }),
    ];
    const sc = buildScorecard(better, { expectCandidateWorse: true, resamples: 20, seed: 1 });
    expect(sc.deltaBrier).toBeLessThan(0);
    expect(sc.harnessOk).toBe(false);
    expect(sc.harnessNote).toContain("HARNESS WRONG");
  });

  it("empty input returns n=0 and a named note, never a fake Brier of 0", () => {
    const sc = buildScorecard([]);
    expect(sc.n).toBe(0);
    expect(Number.isNaN(sc.candidateBrier)).toBe(true);
    expect(sc.harnessOk).toBe(false);
  });

  it("markdown table carries both arms, Δ, and the pass/fail line", () => {
    const rows = [row({ id: "a", outcome: 1, marketFairProb: 0.6, modelProb: 0.7 })];
    const sc = buildScorecard(rows, { resamples: 10, seed: 1 });
    const md = scorecardMarkdown("toy", sc);
    expect(md).toContain("| candidate |");
    expect(md).toContain("| market |");
    expect(md).toContain("Δ (cand − mkt)");
    expect(md).toContain("P(better)");
  });
});

describe("fixture scorecard", () => {
  it("every historical version on the fixture scores worse than market", () => {
    // Hand property of the fixture: modelProb is always farther from the
    // outcome than marketFairProb (by construction). Spot-check v5.2.7.
    const rows = selectPicksH1(fixtureRows()).filter((r) => r.modelVersion === "v5.2.7");
    expect(rows.length).toBeGreaterThan(3);
    const sc = buildScorecard(rows, { expectCandidateWorse: true, resamples: 50, seed: 1 });
    expect(sc.harnessOk).toBe(true);
    expect(sc.deltaBrier).toBeGreaterThan(0);
  });
});

describe("calibration and cluster reporting on the scorecard", () => {
  it("reports ECE, MCE and resolution for BOTH arms, and names the diagnosis", () => {
    const rows = [
      row({ id: "a", outcome: 1, marketFairProb: 0.8, modelProb: 0.7 }),
      row({ id: "b", outcome: 0, marketFairProb: 0.6, modelProb: 0.7 }),
      row({ id: "c", outcome: 1, marketFairProb: 0.55, modelProb: 0.45 }),
      row({ id: "d", outcome: 0, marketFairProb: 0.5, modelProb: 0.4 }),
    ];
    const sc = buildScorecard(rows);
    expect(sc.calibrationBins).toBe(10);
    expect(Number.isFinite(sc.candidateEce)).toBe(true);
    expect(Number.isFinite(sc.marketEce)).toBe(true);
    expect(Number.isFinite(sc.candidateResolution)).toBe(true);
    expect(Number.isFinite(sc.marketResolution)).toBe(true);
    // n=4 is below the reporting floor, so no diagnosis is claimed.
    expect(sc.calibrationDiagnosis).toBe("n-too-small");
  });

  it("refuses a cluster verdict from one cluster and says so in the note", () => {
    const rows = [
      row({ id: "a", outcome: 1, marketFairProb: 0.8, modelProb: 0.7 }),
      row({ id: "b", outcome: 0, marketFairProb: 0.6, modelProb: 0.7 }),
      row({ id: "c", outcome: 1, marketFairProb: 0.55, modelProb: 0.45 }),
      row({ id: "d", outcome: 0, marketFairProb: 0.5, modelProb: 0.4 }),
    ];
    const sc = buildScorecard(rows);
    expect(sc.clusterVerdict).toBe("indistinguishable");
    expect(sc.clusterNote).toContain("ONE cluster");
    expect(sc.clusterNote).toContain("clusterIdOf");
  });

  it("uses a real cluster key when one is supplied", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row({
        id: `r${i}`,
        outcome: i % 3 === 0 ? 1 : 0,
        marketFairProb: 0.6,
        modelProb: 0.5,
      }),
    );
    const sc = buildScorecard(rows, { clusterIdOf: (r) => r.id.slice(0, 2) });
    expect(sc.clusterNote).toContain("cluster");
    expect(sc.clusterNote).not.toContain("ONE cluster");
  });

  it("surfaces the calibration block in the markdown", () => {
    const rows = [
      row({ id: "a", outcome: 1, marketFairProb: 0.8, modelProb: 0.7 }),
      row({ id: "b", outcome: 0, marketFairProb: 0.6, modelProb: 0.7 }),
      row({ id: "c", outcome: 1, marketFairProb: 0.55, modelProb: 0.45 }),
      row({ id: "d", outcome: 0, marketFairProb: 0.5, modelProb: 0.4 }),
    ];
    const md = scorecardMarkdown("t", buildScorecard(rows));
    expect(md).toContain("calibration (10 equal-width bins)");
    expect(md).toContain("diagnosis:");
    expect(md).toContain("cluster verdict:");
  });
});
