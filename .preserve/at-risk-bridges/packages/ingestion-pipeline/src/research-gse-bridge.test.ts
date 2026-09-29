import { describe, expect, it } from "vitest";
import {
  evalCapitalNullSuite,
  evalCapitalPlantedComparison,
  evalCalibrationContract,
  evalDmlPanelFixture,
  evalDmlQbOutAtt,
  evalFeatureContract,
  evalGameSettledHeartbeat,
  evalGseActionScore,
  evalModelParliament,
  evalNbLogPmf,
  evalNbRbpfPredictOver,
  evalNbSnapshotRestore,
  evalNoBetStrength,
  evalOrchestratorGame,
  evalReduceLadder,
  evalRunCapital,
} from "./research-gse-bridge.js";
import type { DmlGameRow } from "@sports/prediction-engine/src/research/dml-panel.js";
import { drawNb, type SyntheticDesign } from "@sports/prediction-engine/src/research/synthetic-nb.js";
import { DEFAULT_PANEL } from "@sports/prediction-engine/src/research/dml-panel.js";
import { RUNG_REQUIREMENTS } from "@sports/types";
import type {
  BettingProofRecordedEvent,
  CalibrationPublishedEvent,
  GameSettledEvent,
  LadderEvent,
  SettledSampleReachedEvent,
} from "@sports/types";

/**
 * Deterministic LCG. Never Math.random: every number in this suite must be
 * reproducible from a seed so a failure is diagnosable.
 */
function lcg(seed: number): () => number {
  const modulus = 2 ** 32;
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + modulus) % modulus;
    return state / modulus;
  };
}

const SYNTHETIC_DESIGN: SyntheticDesign = {
  nTeams: 8,
  nPitchers: 4,
  nParks: 2,
  nUmpires: 2,
  nGames: 60,
  intercept: Math.log(8.5),
  phi: 12,
  planted: true,
};

function expectOk<T>(result: { ok: true; data: T } | { ok: false; reason: string }): T {
  if (!result.ok) {
    throw new Error(`expected ok:true, received refusal: ${result.reason}`);
  }
  return result.data;
}

describe("research-gse-bridge :: research/synthetic-nb + nb-rbpf", () => {
  it("logNbPmf reproduces the closed-form NB2 log mass at reference points", () => {
    // log P(y) = logΓ(φ+y) − logΓ(φ) − logΓ(y+1) + φ·log p + y·log(1−p), p = φ/(φ+μ).
    // Independently evaluated for μ = 8.5, φ = 12: p = 12/20.5.
    const y0 = expectOk(evalNbLogPmf({ y: 0, mu: 8.5, phi: 12 }));
    expect(y0.logPmf).toBeCloseTo(-6.42621883627635, 10);
    expect(y0.pmf).toBeCloseTo(0.00161855931639547, 12);
    expect(y0.varianceToMeanRatio).toBeCloseTo(1.7083333333333333, 12);

    const y5 = expectOk(evalNbLogPmf({ y: 5, mu: 8.5, phi: 12 }));
    expect(y5.logPmf).toBeCloseTo(-2.44595193209206, 10);

    const y12 = expectOk(evalNbLogPmf({ y: 12, mu: 8.5, phi: 12 }));
    expect(y12.logPmf).toBeCloseTo(-2.87337028182486, 10);

    const other = expectOk(evalNbLogPmf({ y: 3, mu: 4, phi: 6 }));
    expect(other.logPmf).toBeCloseTo(-1.78847424748326, 10);
    expect(other.varianceToMeanRatio).toBeCloseTo(1.6666666666666667, 12);
  });

  it("drawNb samples satisfy the NB2 moment identity var/mean = 1 + mu/phi", () => {
    const mu = 8.5;
    const phi = 12;
    const n = 20000;
    const rng = { state: 20260924 };
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const y = drawNb(rng, mu, phi);
      expect(Number.isInteger(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(40);
      sum += y;
      sumSq += y * y;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(Math.abs(mean - mu)).toBeLessThan(0.15);
    expect(Math.abs(variance / mean - (1 + mu / phi))).toBeLessThan(0.15);
  });

  it("fail-closes logNbPmf on an out-of-domain y, mu or phi", () => {
    expect(evalNbLogPmf({ y: -1, mu: 8.5, phi: 12 }).ok).toBe(false);
    expect(evalNbLogPmf({ y: 1.5, mu: 8.5, phi: 12 }).ok).toBe(false);
    expect(evalNbLogPmf({ y: 3, mu: 0, phi: 12 }).ok).toBe(false);
    expect(evalNbLogPmf({ y: 3, mu: 8.5, phi: -2 }).ok).toBe(false);
    expect(evalNbLogPmf({ y: 3, mu: Number.NaN, phi: 12 }).ok).toBe(false);
  });

  it("predicts P(total > line) on a planted design and is bit-deterministic per seed", () => {
    const input = {
      seed: 4242,
      design: SYNTHETIC_DESIGN,
      nParticles: 24,
      essThreshold: 0.5,
      liuWestDelta: 0.99,
    };
    const a = expectOk(evalNbRbpfPredictOver(input));
    const b = expectOk(evalNbRbpfPredictOver(input));

    // Same seed, same particles, same answers — down to the last bit.
    expect(a.games.map((g) => g.predictedOver)).toEqual(b.games.map((g) => g.predictedOver));
    expect(a.games).toHaveLength(SYNTHETIC_DESIGN.nGames);
    for (const game of a.games) {
      expect(game.predictedOver).toBeGreaterThan(0);
      expect(game.predictedOver).toBeLessThan(1);
      expect(game.line).toBeCloseTo(Math.exp(SYNTHETIC_DESIGN.intercept), 12);
    }
    expect(a.diagnostics.weightsFinite).toBe(true);
    expect(a.diagnostics.weightSum).toBeCloseTo(1, 10);
    expect(a.diagnostics.observations).toBe(SYNTHETIC_DESIGN.nGames);
    expect(a.diagnostics.ess).toBeGreaterThan(0);
    expect(a.diagnostics.ess).toBeLessThanOrEqual(input.nParticles);
    expect(a.priced).toBe(false);
    expect(a.status).toBe("shadow");
    expect(a.brierScore).toBeGreaterThan(0);
    expect(a.brierScore).toBeLessThan(1);
    expect(a.realisedOverMean).toBeGreaterThan(0);
    expect(a.realisedOverMean).toBeLessThan(1);

    // A different seed must produce a different realisation, otherwise the
    // design is not actually seeded per-run.
    const c = expectOk(evalNbRbpfPredictOver({ ...input, seed: 4243 }));
    expect(c.games.map((g) => g.y)).not.toEqual(a.games.map((g) => g.y));
  });

  it("fail-closes the RBPF on a degenerate particle count, unit range and ESS threshold", () => {
    const base = {
      seed: 1,
      design: SYNTHETIC_DESIGN,
      nParticles: 24,
      essThreshold: 0.5,
      liuWestDelta: 0.99,
    };
    expect(evalNbRbpfPredictOver({ ...base, nParticles: 0 }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, nParticles: 1_000_000 }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, essThreshold: 0 }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, essThreshold: 1.5 }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, liuWestDelta: 2 }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, design: { ...SYNTHETIC_DESIGN, nTeams: 1 } }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, design: { ...SYNTHETIC_DESIGN, nGames: 0 } }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, predictOnly: [999] }).ok).toBe(false);
    expect(evalNbRbpfPredictOver({ ...base, seed: Number.NaN }).ok).toBe(false);
  });

  it("restores a snapshot into a bit-identical filter, not an approximating one", () => {
    const result = expectOk(
      evalNbSnapshotRestore({
        seed: 77,
        design: SYNTHETIC_DESIGN,
        nParticles: 16,
        gamesBeforeSnapshot: 20,
        gamesAfterSnapshot: 15,
      }),
    );
    expect(result.bitIdentical).toBe(true);
    expect(result.predictedOverRestored).toBe(result.predictedOverOriginal);
    expect(result.snapshot.observations).toBe(20);
    expect(result.diagnosticsOriginal.ess).toBe(result.diagnosticsRestored.ess);
    expect(result.diagnosticsOriginal.resampleCount).toBe(result.diagnosticsRestored.resampleCount);
    expect(result.diagnosticsOriginal.observations).toBe(35);
    expect(result.snapshot.version).toBe(1);
  });

  it("fail-closes the snapshot path when the run is longer than the design", () => {
    const base = {
      seed: 77,
      design: SYNTHETIC_DESIGN,
      nParticles: 16,
      gamesBeforeSnapshot: 20,
      gamesAfterSnapshot: 15,
    };
    expect(evalNbSnapshotRestore({ ...base, gamesBeforeSnapshot: 0 }).ok).toBe(false);
    expect(evalNbSnapshotRestore({ ...base, gamesAfterSnapshot: 100 }).ok).toBe(false);
    expect(evalNbSnapshotRestore({ ...base, nParticles: 0 }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: research/dml-panel + dml-qb-out", () => {
  /**
   * The shipped DEFAULT_PANEL (8 teams x 18 weeks x 2 seasons = 288 rows) cannot
   * resolve a win-probability ATT: measured over 8 seeds its per-seed estimates
   * are [0.003, 0.036, -0.081, 0.097, -0.180, -0.201, -0.024, -0.001] — the sign
   * flips, and the per-seed standard error is ~0.09. The 32-team x 4-season
   * panel below recovers the direction and the magnitude of the planted effect
   * (att -0.0749, se 0.0439, n 1843 scored) but its 95% interval is
   * [-0.1610, +0.0112] and therefore does NOT separate the effect from zero.
   * The bridge reports that honestly; this suite does not pretend otherwise.
   */
  const POWERED_DESIGN = { nTeams: 32, nWeeks: 18, nSeasons: 4, plantedAtt: -0.08 };
  const fixture = expectOk(evalDmlPanelFixture({ seed: 7, design: POWERED_DESIGN, defaultDesign: DEFAULT_PANEL }));
  const att = expectOk(evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 5, minScoredRows: 500, placeboSeed: 7 }));

  it("recovers a negative ATT with the sign of the planted effect and a bounded CI", () => {
    expect(fixture.rows).toHaveLength(2304);
    expect(att.att).toBeLessThan(0);
    expect(att.att).toBeGreaterThan(-0.5);
    // The kernel plants a 4 x -0.08 logit shift, i.e. ~ -0.08 on the
    // win-probability scale at the base rate; the estimate lands there.
    expect(att.att).toBeCloseTo(-0.075, 2);
    expect(att.impliedLogitShift).toBeLessThan(0);
    expect(att.uncertainty.standardError).toBeGreaterThan(0);
    expect(att.uncertainty.quantified).toBe(true);
    expect(att.uncertainty.ciBoundsPoint).toBe(true);
    expect(att.uncertainty.ciLow).toBeLessThanOrEqual(att.att);
    expect(att.uncertainty.ciHigh).toBeGreaterThanOrEqual(att.att);
    expect(att.uncertainty.halfWidth).toBeCloseTo(1.96 * att.uncertainty.standardError, 12);
    // Honest, not flattering: at n = 1843 scored rows this design recovers the
    // planted effect at ~1.7 standard errors, which is NOT a separation from
    // zero. The bridge must say so rather than let a reader infer it.
    expect(att.uncertainty.separatesFromZero).toBe(false);
    expect(att.uncertainty.ciHigh).toBeGreaterThan(0);
    expect(att.uncertainty.ciLow).toBeLessThan(0);
    expect(att.nTreated).toBeGreaterThan(0);
    expect(att.nTrimmed).toBeGreaterThanOrEqual(0);
    expect(att.overlap.allPropensitiesInsideHardClamp).toBe(true);
  });

  it("reads ~0 on the same design with no planted effect", () => {
    const nullPanel = expectOk(
      evalDmlPanelFixture({ seed: 7, design: { ...POWERED_DESIGN, plantedAtt: 0 }, defaultDesign: DEFAULT_PANEL }),
    );
    const nullAtt = expectOk(
      evalDmlQbOutAtt({ rows: nullPanel.rows, nFolds: 5, minScoredRows: 500, placeboSeed: 7 }),
    );
    expect(Math.abs(nullAtt.att)).toBeLessThan(0.05);
    expect(nullAtt.uncertainty.ciLow).toBeLessThanOrEqual(0);
    expect(nullAtt.uncertainty.ciHigh).toBeGreaterThanOrEqual(0);
  });

  it("reports the DEFAULT_PANEL design's own width instead of implying a sign", () => {
    const small = expectOk(evalDmlPanelFixture({ seed: 2026, defaultDesign: DEFAULT_PANEL }));
    expect(small.rows).toHaveLength(288);
    const smallAtt = expectOk(evalDmlQbOutAtt({ rows: small.rows, nFolds: 5, placeboSeed: 11 }));
    // Honest, not flattering: at n = 230 the interval is ~0.2 wide on the
    // win-probability scale, wider than any usable edge threshold.
    expect(smallAtt.uncertainty.standardError).toBeGreaterThan(0.02);
    expect(smallAtt.uncertainty.halfWidth).toBeGreaterThan(0.04);
    expect(smallAtt.uncertainty.ciBoundsPoint).toBe(true);
    expect(smallAtt.uncertainty.quantified).toBe(true);
  });

  it("surfaces the cross-fitting structure instead of a bare number", () => {
    expect(att.folds.requestedFolds).toBe(5);
    expect(att.folds.foldsUsed).toBe(5);
    expect(att.folds.foldSizes).toHaveLength(5);
    expect(att.folds.foldSizes.reduce((a, b) => a + b, 0)).toBe(fixture.rows.length);
    // Fold 0 is train-only: it is never scored, so scored rows are strictly fewer.
    expect(att.folds.scoredFoldIndices).toEqual([1, 2, 3, 4]);
    expect(att.folds.rowsScored).toBe(fixture.rows.length - (att.folds.foldSizes[0] ?? 0));
    expect(att.folds.rowsScored).toBeLessThan(fixture.rows.length);
    expect(att.folds.trainSizesBeforeEachScoredFold[0]).toBe(att.folds.foldSizes[0]);
    expect(att.folds.minTrainRows).toBe(20);
    expect(att.folds.callerAssignmentsMatched).toBeNull();
    expect(att.priced).toBe(false);
    expect(att.status).toBe("shadow");
    expect(att.sutvaNote).toContain("SUTVA");
  });

  it("reproduces the fold assignment the caller supplies, or refuses", () => {
    const sorted = [...fixture.rows].sort(
      (a, b) => (a.season * 100 + a.week) - (b.season * 100 + a.week) || a.team - b.team,
    );
    const assignments = sorted.map((_, i) => Math.min(4, Math.floor((i * 5) / sorted.length)));
    const matched = expectOk(
      evalDmlQbOutAtt({
        rows: fixture.rows,
        nFolds: 5,
        minScoredRows: 500,
        foldAssignments: assignments,
        placeboSeed: 7,
      }),
    );
    expect(matched.folds.callerAssignmentsMatched).toBe(true);
    expect(matched.att).toBe(att.att);

    // Same total per fold, but assigned to the wrong fold: caught, not accepted.
    const skewed = assignments.map((fold, i) => (i % 5 === 0 ? 0 : fold));
    const refused = evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 5, foldAssignments: skewed });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toContain("disagree with the kernel's time-ordered blocking");

    expect(evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 5, foldAssignments: [0, 1] }).ok).toBe(false);
  });

  it("produces a placebo whose interval contains zero and a wider sensitivity envelope", () => {
    expect(att.placebo.seed).toBe(7);
    expect(att.placebo.containsZero).toBe(true);
    expect(att.placebo.ciLow).toBeLessThanOrEqual(0);
    expect(att.placebo.ciHigh).toBeGreaterThanOrEqual(0);
    // Gamma = 2 must be strictly wider than the Gamma = 1 CI it is built on.
    expect(att.sensitivity.gamma).toBe(2);
    expect(att.sensitivity.interval[0]).toBeLessThan(att.uncertainty.ciLow);
    expect(att.sensitivity.interval[1]).toBeGreaterThan(att.uncertainty.ciHigh);
    expect(att.sensitivity.boundsPoint).toBe(true);
  });

  it("fails closed on a fold count the kernel does not use, or too few scored rows", () => {
    const wrongFolds = evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 10 });
    expect(wrongFolds.ok).toBe(false);
    if (!wrongFolds.ok) expect(wrongFolds.reason).toContain("N_FOLDS");

    const tooFew = evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 5, minScoredRows: 100_000 });
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.reason).toContain("minScoredRows");

    expect(evalDmlQbOutAtt({ rows: [], nFolds: 5 }).ok).toBe(false);
    expect(evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 0 }).ok).toBe(false);
    expect(evalDmlQbOutAtt({ rows: fixture.rows, nFolds: 5, sensitivityGamma: 0.5 }).ok).toBe(false);
    const badRow = { ...fixture.rows[0]!, win: 3 as unknown as 0 };
    expect(evalDmlQbOutAtt({ rows: [badRow], nFolds: 5 }).ok).toBe(false);
  });

  it("fails closed when the ATT is so large the implied-logit conversion is undefined", () => {
    // The kernel computes log((0.5 + att) / (1 - (0.5 + att))) and coerces a
    // non-finite result to 0, so |att| >= 0.5 would report "no shift" for a
    // maximal effect. The bridge refuses rather than laundering that as 0.0.
    const rows: DmlGameRow[] = [];
    const rand = lcg(99);
    for (let i = 0; i < 400; i++) {
      const treated = i % 2 === 0;
      rows.push({
        season: Math.floor(i / 144) + 1,
        week: (i % 18) + 1,
        team: i % 8,
        opponent: (i + 1) % 8,
        treatment: treated ? 1 : 0,
        qbStatus: treated ? "out" : "active",
        win: treated ? 0 : 1,
        restDays: 4 + Math.floor(rand() * 5),
        travelKm: rand() * 3000,
        strengthMean: (rand() - 0.5) * 0.8,
        strengthVar: 0.05 + rand() * 0.1,
        opponentStrength: (rand() - 0.5) * 0.8,
      });
    }
    // Perfect separation drives the AIPW score to att = -1.0014, which is
    // outside the [-1, 1] win-probability scale an ATT can occupy: the
    // inverse-propensity term (1/e, with e clamped at 0.001) is unbounded, so
    // the mean contrast can leave the probability range. The range guard fires
    // first; the implied-logit guard is the backstop for |att| in [0.5, 1].
    const result = evalDmlQbOutAtt({ rows, nFolds: 5, minScoredRows: 20, placeboSeed: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("win-probability scale");
  });
});

describe("research-gse-bridge :: research/capital", () => {
  it("holds the open-loop arm at exactly 1 and moves the engine arm", () => {
    const open = expectOk(evalRunCapital({ seed: 7, planted: true, openLoop: true }));
    expect(open.path.terminal).toBe(1);
    expect(open.path.maxCapital).toBe(1);
    expect(open.path.exceeded20).toBe(false);
    expect(open.path.n).toBe(SYNTHETIC_DESIGN.nGames === 60 ? 80 : 80);
    expect(open.openLoopCapitalIsExactlyOne).toBe(true);
    expect(open.lambdaMode).toBe("fixed");

    const engine = expectOk(evalRunCapital({ seed: 7, planted: true }));
    expect(engine.path.terminal).toBeGreaterThan(0);
    expect(Number.isFinite(engine.path.terminal)).toBe(true);
    expect(engine.path.maxCapital).toBeGreaterThanOrEqual(engine.path.terminal);
    expect(engine.path.n).toBeGreaterThan(0);
    expect(engine.path.exceeded20).toBe(engine.path.maxCapital > 20);

    // The adaptive lambda arm is a different estimator, not the same one.
    const adaptive = expectOk(evalRunCapital({ seed: 7, planted: true, adaptiveLambda: true }));
    expect(adaptive.lambdaMode).toBe("adaptive");
    expect(adaptive.path.n).toBe(engine.path.n);
  });

  it("fails closed on a non-finite seed or an out-of-range particle count", () => {
    expect(evalRunCapital({ seed: Number.NaN, planted: false }).ok).toBe(false);
    expect(evalRunCapital({ seed: 1.5, planted: false }).ok).toBe(false);
    expect(evalRunCapital({ seed: 1, planted: false, filter: { nParticles: 0 } }).ok).toBe(false);
    expect(evalRunCapital({ seed: 1, planted: false, design: { nTeams: 1 } }).ok).toBe(false);
    expect(evalRunCapital({ seed: 1, planted: false, design: { phi: 0 } }).ok).toBe(false);
  });

  it("derives the null-suite violation rate from the count and honours alpha = 0.05", () => {
    const suite = expectOk(evalCapitalNullSuite({ seeds: 12, startSeed: 1 }));
    expect(suite.rateMatchesCount).toBe(true);
    expect(suite.passMatchesAlpha).toBe(true);
    expect(suite.report.rate).toBe(suite.report.exceeded20 / 12);
    expect(suite.report.alpha).toBe(0.05);
    expect(suite.report.pass).toBe(suite.report.rate <= 0.05);
    // Deterministic: the same seed window produces the same count.
    const repeat = expectOk(evalCapitalNullSuite({ seeds: 12, startSeed: 1 }));
    expect(repeat.report.exceeded20).toBe(suite.report.exceeded20);
    expect(suite.typeOneClaim).toContain("martingale");
  });

  it("fail-closes the null suite on an out-of-range seed count", () => {
    expect(evalCapitalNullSuite({ seeds: 0 }).ok).toBe(false);
    expect(evalCapitalNullSuite({ seeds: 5000 }).ok).toBe(false);
    expect(evalCapitalNullSuite({ seeds: 3.5 }).ok).toBe(false);
  });

  it("reports the planted comparison WITH a paired standard error", () => {
    const result = expectOk(evalCapitalPlantedComparison({ seeds: 12, startSeed: 10_000 }));
    // The kernel's own medians are re-aggregated independently inside the bridge.
    expect(result.report.openLoopMedianMax).toBe(1);
    expect(result.report.beatsOpenLoop).toBe(result.report.engineMedianMax > 1);
    expect(result.uncertainty.pairedSd).toBeGreaterThan(0);
    expect(result.uncertainty.pairedSe).toBeGreaterThan(0);
    expect(result.uncertainty.pairedSe).toBeCloseTo(
      result.uncertainty.pairedSd / Math.sqrt(12),
      12,
    );
    expect(result.uncertainty.ciBoundsMean).toBe(true);
    expect(result.uncertainty.ciLow).toBeLessThanOrEqual(result.uncertainty.pairedMeanDifference);
    expect(result.uncertainty.ciHigh).toBeGreaterThanOrEqual(result.uncertainty.pairedMeanDifference);
    expect(result.uncertainty.ciHigh - result.uncertainty.ciLow).toBeCloseTo(2 * 1.96 * result.uncertainty.pairedSe, 9);
    // The open-loop arm is structurally flat, so its dispersion is exactly zero.
    expect(result.uncertainty.openLoopMaxMean).toBe(1);
    expect(result.uncertainty.openLoopMaxSd).toBe(0);
    expect(result.uncertainty.engineMaxMean).toBeGreaterThanOrEqual(1);
    expect(result.priced).toBe(false);
  });

  it("fail-closes the planted comparison on an out-of-range seed count", () => {
    expect(evalCapitalPlantedComparison({ seeds: 0 }).ok).toBe(false);
    expect(evalCapitalPlantedComparison({ seeds: 500 }).ok).toBe(false);
    expect(evalCapitalPlantedComparison({ seeds: 5, startSeed: 1.5 }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: gse-score/model-parliament", () => {
  it("collapses unanimous votes to their exact probability and score", () => {
    const result = expectOk(
      evalModelParliament({
        votes: [
          { modelId: "elo", probability: 0.6, confidence: 0.8 },
          { modelId: "epa", probability: 0.6, confidence: 0.8 },
          { modelId: "xgb", probability: 0.6, confidence: 0.8 },
        ],
      }),
    );
    expect(result.status).toBe("OK");
    expect(result.weightedModelProbability).toBe(0.6);
    expect(result.disagreement).toBe(0);
    // 0.8 average confidence → 80, no disagreement penalty.
    expect(result.decisionConfidenceScore).toBe(80);
    expect(result.confidenceIsProbability).toBe(false);
    expect(result.weightedModelProbabilityIsCalibrated).toBe(false);
    expect(result.votesUsed).toBe(3);
    expect(result.votesRejected).toBe(0);
    expect(result.declined).toBe(false);
  });

  it("prices the disagreement penalty exactly and never reaches a probability field", () => {
    const result = expectOk(
      evalModelParliament({
        votes: [
          { modelId: "a", probability: 0.6, confidence: 0.8 },
          { modelId: "b", probability: 0.4, confidence: 0.8 },
        ],
      }),
    );
    // weighted mean 0.5, weighted mean absolute deviation 0.1, penalty 0.1/0.12 × 35.
    expect(result.weightedModelProbability).toBe(0.5);
    expect(result.disagreement).toBe(0.1);
    expect(result.decisionConfidenceScore).toBeCloseTo(80 - (0.1 / 0.12) * 35, 2);
    expect(result.decisionConfidenceScore).toBe(50.83);
    expect(result.status).toBe("OK");
    expect(result.weightedModelProbabilityIsCalibrated).toBe(false);
  });

  it("treats a refusal to model as a declined answer, not an error", () => {
    const result = expectOk(
      evalModelParliament({ votes: [{ modelId: "a", probability: 0.6, confidence: 0.8, stale: true }] }),
    );
    expect(result.status).toBe("OK");
    expect(result.weightedModelProbability).toBe(0.6);

    // All votes carry zero effective weight: the kernel BLOCKs, which is an answer.
    const blocked = expectOk(
      evalModelParliament({ votes: [{ modelId: "a", probability: 0.6, confidence: 0.8, evidenceWeight: 0 }] }),
    );
    expect(blocked.status).toBe("BLOCK");
    expect(blocked.declined).toBe(true);
    expect(blocked.weightedModelProbability).toBeNull();
    expect(blocked.votesUsed).toBe(0);
  });

  it("fail-closes on an empty parliament or a malformed vote", () => {
    expect(evalModelParliament({ votes: [] }).ok).toBe(false);
    expect(evalModelParliament({ votes: [{ modelId: "", probability: 0.5, confidence: 0.5 }] }).ok).toBe(false);
    expect(evalModelParliament({ votes: [{ modelId: "a", probability: 1.4, confidence: 0.5 }] }).ok).toBe(false);
    expect(evalModelParliament({ votes: [{ modelId: "a", probability: 0.5, confidence: 0 }] }).ok).toBe(false);
    expect(evalModelParliament({ votes: [{ modelId: "a", probability: 0.5, confidence: -1 }] }).ok).toBe(false);
    expect(evalModelParliament({ votes: [{ modelId: "a", probability: 0.5, confidence: 0.5, evidenceWeight: -2 }] }).ok).toBe(false);
    expect(evalModelParliament({ votes: [{ modelId: "a", probability: 0.5, confidence: 0.5 }], maxDisagreement: 0 }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: gse-score/no-bet-strength", () => {
  it("converts each risk into its exact refusal pressure and decision", () => {
    const clear = expectOk(
      evalNoBetStrength({ risks: [{ factor: "STALE_DATA", severity: 0.5, reason: "half the slate is stale" }] }),
    );
    expect(clear.refusalPressureScore).toBe(12);
    expect(clear.decision).toBe("CLEAR");
    expect(clear.decisionReDerived).toBe("CLEAR");
    expect(clear.declined).toBe(false);
    expect(clear.hardRefusal).toBe(false);

    const soft = expectOk(
      evalNoBetStrength({
        risks: [
          { factor: "MISSING_REQUIRED_DATA", severity: 1, reason: "no injury report" },
          { factor: "STALE_DATA", severity: 1, reason: "line is four hours old" },
        ],
      }),
    );
    expect(soft.refusalPressureScore).toBe(69);
    expect(soft.decision).toBe("SOFT_PASS");
    expect(soft.declined).toBe(true);
    // Declined without being a hard refusal — the distinction the shape must keep.
    expect(soft.hardRefusal).toBe(false);
    expect(soft.hardPassReasons).toHaveLength(0);
  });

  it("hard-refuses responsible-gaming and source-rights blocks", () => {
    const rg = expectOk(
      evalNoBetStrength({ risks: [{ factor: "RESPONSIBLE_GAMING", severity: 1, reason: "limit reached" }] }),
    );
    expect(rg.refusalPressureScore).toBe(100);
    expect(rg.decision).toBe("HARD_PASS");
    expect(rg.hardRefusal).toBe(true);
    expect(rg.hardPassReasons).toEqual(["limit reached"]);

    const rights = expectOk(
      evalNoBetStrength({
        risks: [{ factor: "SOURCE_RIGHTS_BLOCKED", severity: 0.5, reason: "PFF grades are not licensed" }],
      }),
    );
    expect(rights.refusalPressureScore).toBe(35);
    expect(rights.decision).toBe("HARD_PASS");
    expect(rights.refusalPressureIsProbability).toBe(false);
  });

  it("fail-closes on an unknown factor, an out-of-range severity, or bad evidence health", () => {
    const unknown = { factor: "BAD_LUCK", severity: 1, reason: "x" } as unknown as {
      factor: "STALE_DATA";
      severity: number;
      reason: string;
    };
    expect(evalNoBetStrength({ risks: [unknown] }).ok).toBe(false);
    expect(evalNoBetStrength({ risks: [{ factor: "STALE_DATA", severity: 2, reason: "x" }] }).ok).toBe(false);
    expect(evalNoBetStrength({ risks: [{ factor: "STALE_DATA", severity: 1, reason: "" }] }).ok).toBe(false);
    expect(evalNoBetStrength({ risks: [], evidenceHealth: 101 }).ok).toBe(false);
    expect(evalNoBetStrength({ risks: [], evidenceHealth: -1 }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: gse-score/calibration-contract", () => {
  it("maps each calibration state onto its exact action cap and risk severity", () => {
    const validated = expectOk(
      evalCalibrationContract({
        sampleCount: 400,
        expectedCalibrationError: 0.02,
        driftScore: 0.01,
        brierScore: 0.2,
        baselineBrierScore: 0.21,
      }),
    );
    expect(validated.status).toBe("VALIDATED");
    expect(validated.probabilityClaimsAllowed).toBe(true);
    expect(validated.scoreModifier).toBe(8);
    expect(validated.policy.actionScoreCap).toBe(100);
    expect(validated.policy.requiresHardPass).toBe(false);
    expect(validated.policy.riskSeverity).toBe(0);
    expect(validated.resolved.minSampleCount).toBe(250);
    expect(validated.resolved.maxExpectedCalibrationError).toBe(0.06);
    expect(validated.resolved.maxDriftScore).toBe(0.1);

    const thin = expectOk(evalCalibrationContract({ sampleCount: 100 }));
    expect(thin.status).toBe("INSUFFICIENT_SAMPLE");
    expect(thin.probabilityClaimsAllowed).toBe(false);
    expect(thin.scoreModifier).toBe(-18);
    expect(thin.policy.actionScoreCap).toBe(54);
    expect(thin.policy.requiresHardPass).toBe(false);
    expect(thin.policy.riskSeverity).toBe(0.8);
    expect(thin.statusReDerived).toBe("INSUFFICIENT_SAMPLE");

    const missing = expectOk(evalCalibrationContract({ sampleCount: 400 }));
    expect(missing.status).toBe("BLOCKED");
    expect(missing.scoreModifier).toBe(-25);
    expect(missing.policy.actionScoreCap).toBe(24);
    expect(missing.policy.requiresHardPass).toBe(true);
    expect(missing.policy.riskSeverity).toBe(1);

    const drifting = expectOk(
      evalCalibrationContract({ sampleCount: 400, expectedCalibrationError: 0.02, driftScore: 0.2 }),
    );
    expect(drifting.status).toBe("DRIFTING");
    expect(drifting.scoreModifier).toBe(-22);
    expect(drifting.policy.requiresHardPass).toBe(true);

    const loose = expectOk(evalCalibrationContract({ sampleCount: 400, expectedCalibrationError: 0.09 }));
    expect(loose.status).toBe("WATCH");
    expect(loose.scoreModifier).toBe(-12);
    expect(loose.policy.actionScoreCap).toBe(54);
    expect(loose.policy.riskSeverity).toBe(0.65);

    const worseThanBaseline = expectOk(
      evalCalibrationContract({
        sampleCount: 400,
        expectedCalibrationError: 0.02,
        brierScore: 0.25,
        baselineBrierScore: 0.2,
      }),
    );
    expect(worseThanBaseline.status).toBe("WATCH");
    expect(worseThanBaseline.scoreModifier).toBe(-10);
  });

  it("fail-closes on an impossible sample count or an out-of-range metric", () => {
    expect(evalCalibrationContract({ sampleCount: -1 }).ok).toBe(false);
    expect(evalCalibrationContract({ sampleCount: 1.5 }).ok).toBe(false);
    expect(evalCalibrationContract({ sampleCount: 400, minSampleCount: 0 }).ok).toBe(false);
    expect(evalCalibrationContract({ sampleCount: 400, expectedCalibrationError: 1.4 }).ok).toBe(false);
    expect(evalCalibrationContract({ sampleCount: 400, brierScore: 1.2 }).ok).toBe(false);
    expect(evalCalibrationContract({ sampleCount: 400, driftScore: -0.1 }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: gse-score/feature-contract", () => {
  const healthy = [
    { key: "epaDiff", value: 0.1, quality: 1, ageMinutes: 10, required: true },
    { key: "qbStatus", value: 1, quality: 1, ageMinutes: 10 },
  ];

  it("scores a clean slate at exactly 100 health and OK status", () => {
    const result = expectOk(evalFeatureContract({ features: healthy }));
    expect(result.featureHealth).toBe(100);
    expect(result.status).toBe("OK");
    expect(result.statusReDerived).toBe("OK");
    expect(result.missingRequired).toEqual([]);
    expect(result.staleFeatures).toEqual([]);
    expect(result.blockedSources).toEqual([]);
    expect(result.resolved.maxAgeMinutes).toBe(120);
    expect(result.resolved.requiredKeys).toEqual(["epaDiff"]);
    expect(result.featureHealthIsProbability).toBe(false);
  });

  it("penalises staleness and rights-blocks to their exact health values", () => {
    const stale = expectOk(
      evalFeatureContract({
        features: [
          { key: "epaDiff", value: 0.1, quality: 1, ageMinutes: 10, required: true },
          { key: "qbStatus", value: 1, quality: 1, ageMinutes: 500 },
        ],
      }),
    );
    expect(stale.staleFeatures).toEqual(["qbStatus"]);
    expect(stale.staleFeaturesReDerived).toEqual(["qbStatus"]);
    expect(stale.staleRequired).toEqual([]);
    // 100 average quality − 12 per stale feature.
    expect(stale.featureHealth).toBe(88);
    expect(stale.status).toBe("WARN");

    const staleRequired = expectOk(
      evalFeatureContract({
        features: [
          { key: "epaDiff", value: 0.1, quality: 1, ageMinutes: 500, required: true },
          { key: "qbStatus", value: 1, quality: 1, ageMinutes: 10 },
        ],
      }),
    );
    expect(staleRequired.staleRequired).toEqual(["epaDiff"]);
    expect(staleRequired.status).toBe("BLOCK");
    expect(staleRequired.featureHealth).toBe(88);

    const missing = expectOk(
      evalFeatureContract({ features: [healthy[1]!], requiredFeatureKeys: ["epaDiff"] }),
    );
    expect(missing.missingRequired).toEqual(["epaDiff"]);
    expect(missing.featureHealth).toBe(65);
    expect(missing.status).toBe("BLOCK");

    const blocked = expectOk(
      evalFeatureContract({
        features: [
          healthy[0]!,
          {
            key: "pffGrade",
            value: 80,
            quality: 1,
            ageMinutes: 10,
            sourcePolicy: { sourceId: "pff", status: "restricted", allowedForModeling: false },
          },
        ],
      }),
    );
    expect(blocked.blockedSources).toEqual(["pffGrade"]);
    expect(blocked.blockedSourcesReDerived).toEqual(["pffGrade"]);
    expect(blocked.featureHealth).toBe(55);
    expect(blocked.status).toBe("BLOCK");
  });

  it("fail-closes on an empty slate, a duplicate key, or a contradictory source policy", () => {
    expect(evalFeatureContract({ features: [] }).ok).toBe(false);
    expect(
      evalFeatureContract({ features: [healthy[0]!, { ...healthy[0]! }] }).ok,
    ).toBe(false);
    expect(
      evalFeatureContract({
        features: [
          {
            key: "pffGrade",
            value: 80,
            sourcePolicy: { sourceId: "pff", status: "restricted", allowedForModeling: true },
          },
        ],
      }).ok,
    ).toBe(false);
    expect(evalFeatureContract({ features: [{ key: "a", value: Number.NaN }] }).ok).toBe(false);
    expect(evalFeatureContract({ features: [{ key: "a", value: 1, quality: 4 }] }).ok).toBe(false);
    expect(evalFeatureContract({ features: healthy, maxAgeMinutes: 0 }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: gse-score/gse-action-score", () => {
  const validatedCalibration = {
    sampleCount: 400,
    expectedCalibrationError: 0.02,
    driftScore: 0.01,
    brierScore: 0.2,
    baselineBrierScore: 0.21,
  };
  const goodFeatures = [
    { key: "epaDiff", value: 0.1, quality: 1, ageMinutes: 10, required: true },
    { key: "qbStatus", value: 1, quality: 1, ageMinutes: 10 },
  ];

  it("reaches PLAY at a validated calibration and a positive edge, with the exact score", () => {
    const result = expectOk(
      evalGseActionScore({
        marketProbability: 0.5,
        modelParliament: {
          votes: [
            { modelId: "a", probability: 0.6, confidence: 0.8 },
            { modelId: "b", probability: 0.6, confidence: 0.8 },
          ],
        },
        featureContract: { features: goodFeatures },
        calibration: validatedCalibration,
      }),
    );
    expect(result.probabilityEdge).toBeCloseTo(0.1, 10);
    expect(result.weightedModelProbability).toBe(0.6);
    expect(result.parliamentDecisionConfidenceScore).toBe(80);
    expect(result.featureHealth).toBe(100);
    expect(result.calibrationStatus).toBe("VALIDATED");
    expect(result.probabilityClaimsAllowed).toBe(true);
    expect(result.noBetDecision).toBe("CLEAR");
    expect(result.forcedHardPass).toBe(false);
    // 18 + 40 (edge) + 17.6 (parliament) + 18 (features) + 8 (calibration) = 101.6 → capped at 100.
    expect(result.actionScore).toBe(100);
    expect(result.decision).toBe("PLAY");
    expect(result.actionScoreIsProbability).toBe(false);
    expect(result.parliamentConfidenceIsProbability).toBe(false);
  });

  it("never reaches an action tier above WATCH on a non-positive edge", () => {
    const result = expectOk(
      evalGseActionScore({
        marketProbability: 0.7,
        modelParliament: {
          votes: [
            { modelId: "a", probability: 0.6, confidence: 0.8 },
            { modelId: "b", probability: 0.6, confidence: 0.8 },
          ],
        },
        featureContract: { features: goodFeatures },
        calibration: validatedCalibration,
      }),
    );
    expect(result.probabilityEdge).toBeCloseTo(-0.1, 10);
    expect(result.decision).toBe("WATCH");
    // 18 + 0 (no positive edge) + 17.6 + 18 + 8 = 61.6.
    expect(result.actionScore).toBeCloseTo(61.6, 6);
    expect(result.honestyGates.positiveEdgeRequiredForAction).toBe(true);
  });

  it("hard-passes and caps at 24 while calibration claims are unearned", () => {
    const result = expectOk(
      evalGseActionScore({
        marketProbability: 0.5,
        modelParliament: {
          votes: [
            { modelId: "a", probability: 0.6, confidence: 0.8 },
            { modelId: "b", probability: 0.6, confidence: 0.8 },
          ],
        },
        featureContract: { features: goodFeatures },
        calibration: { sampleCount: 400 },
      }),
    );
    expect(result.calibrationStatus).toBe("BLOCKED");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.forcedHardPass).toBe(true);
    expect(result.actionScore).toBe(24);
    expect(result.decision).toBe("HARD_PASS");
    expect(result.honestyGates.claimsGateActionTiers).toBe(true);
    expect(result.honestyGates.hardPassCappedAt).toBe(24);
  });

  it("hard-passes on a missing required feature even with a positive edge", () => {
    const result = expectOk(
      evalGseActionScore({
        marketProbability: 0.5,
        modelParliament: { votes: [{ modelId: "a", probability: 0.75, confidence: 0.9 }] },
        featureContract: { features: [goodFeatures[1]!], requiredFeatureKeys: ["epaDiff"] },
        calibration: validatedCalibration,
      }),
    );
    expect(result.forcedHardPass).toBe(true);
    expect(result.decision).toBe("HARD_PASS");
    expect(result.probabilityEdge).toBeCloseTo(0.25, 10);
  });

  it("fail-closes on a bad market probability, an empty parliament, or a bad contract", () => {
    const base = {
      modelParliament: { votes: [{ modelId: "a", probability: 0.6, confidence: 0.8 }] },
      featureContract: { features: goodFeatures },
      calibration: validatedCalibration,
    };
    expect(evalGseActionScore({ ...base, marketProbability: 1.2 }).ok).toBe(false);
    expect(evalGseActionScore({ ...base, marketProbability: Number.NaN }).ok).toBe(false);
    expect(
      evalGseActionScore({ ...base, marketProbability: 0.5, modelParliament: { votes: [] } }).ok,
    ).toBe(false);
    expect(evalGseActionScore({ ...base, marketProbability: 0.5, featureContract: { features: [] } }).ok).toBe(false);
    expect(
      evalGseActionScore({ ...base, marketProbability: 0.5, calibration: { sampleCount: -3 } }).ok,
    ).toBe(false);
    expect(
      evalGseActionScore({
        ...base,
        marketProbability: 0.5,
        additionalNoBetRisks: [{ factor: "MARKET_VOLATILITY", severity: 0.9, reason: "line moved" }],
      }).ok,
    ).toBe(true);
  });
});

describe("research-gse-bridge :: ladder/reduce", () => {
  const provenSamples = RUNG_REQUIREMENTS.betting.PROVEN.settledSamples;
  const modelVersion = "v5.2.7";

  const settled = (count: number): SettledSampleReachedEvent => ({
    id: "e-settled-betting",
    type: "SETTLED_SAMPLE_REACHED",
    occurredAt: "2026-09-01T00:00:00.000Z",
    modelVersion,
    payload: { track: "betting", sample: "canonical", settledCount: count, threshold: provenSamples },
  });

  const proof = (clvBeatRate: number, sampleSize: number): BettingProofRecordedEvent => ({
    id: "e-proof-betting",
    type: "BETTING_PROOF_RECORDED",
    occurredAt: "2026-09-02T00:00:00.000Z",
    modelVersion,
    payload: {
      track: "betting",
      estimatorKey: "clv_beat",
      proofWindow: "2026-09-01/2026-09-02",
      sampleSize,
      clvBeatRate,
      brierScore: 0.2,
      logLoss: 0.6,
    },
  });

  const calibration = (implemented: boolean): CalibrationPublishedEvent => ({
    id: "e-calibration-betting",
    type: "CALIBRATION_PUBLISHED",
    occurredAt: "2026-09-03T00:00:00.000Z",
    modelVersion,
    payload: {
      track: "betting",
      proposalStatus: implemented ? "IMPLEMENTED" : "DRAFT",
      calibrationProposalId: "CAL-1",
      frozenModelVersion: modelVersion,
    },
  });

  it("earns the betting PROVEN rung only with samples, a passing proof and a frozen calibration", () => {
    const earned = expectOk(
      evalReduceLadder({
        events: [settled(150), proof(0.6, 150), calibration(true)] as readonly LadderEvent[],
      }),
    );
    expect(earned.trackRungs.betting).toBe("PROVEN");
    expect(earned.trackRungs.fantasy).toBe("FOUNDING");
    expect(earned.currentRung).toBe("FOUNDING");
    expect(earned.pricedEstimators).toEqual(["clv_beat"]);
    expect(earned.validCalibration.betting).toBe(true);
    expect(earned.surfaceEligibility.performanceStatsEnabled).toBe(true);
    expect(earned.surfaceEligibility.canPublishProjections).toBe(false);
    expect(earned.surfaceEligibilityReDerived).toEqual(earned.surfaceEligibility);
    expect(earned.provenanceComplete).toBe(true);
    expect(earned.derivations.map((d) => d.type)).toContain("PERFORMANCE_STATS_ENABLED");
    expect(earned.derivations.map((d) => d.type)).toContain("ESTIMATOR_PRICED");

    // The same proof at the ESTABLISHED sample floor earns the higher rung; the
    // ladder takes the HIGHEST satisfied rung, not the first.
    const established = expectOk(
      evalReduceLadder({
        events: [settled(500), proof(0.6, 500), calibration(true)] as readonly LadderEvent[],
      }),
    );
    expect(established.trackRungs.betting).toBe("ESTABLISHED");
  });

  it("refuses to advance on a missing frozen calibration or a sub-threshold CLV rate", () => {
    const noCalibration = expectOk(
      evalReduceLadder({ events: [settled(500), proof(0.6, 500)] as readonly LadderEvent[] }),
    );
    expect(noCalibration.trackRungs.betting).toBe("FOUNDING");
    expect(noCalibration.pricedEstimators).toEqual([]);
    expect(noCalibration.surfaceEligibility.performanceStatsEnabled).toBe(false);
    expect(noCalibration.derivations).toHaveLength(0);

    const thinProof = expectOk(
      evalReduceLadder({
        events: [settled(500), proof(0.5, 500), calibration(true)] as readonly LadderEvent[],
      }),
    );
    // 0.50 is below the 0.524 PROVEN floor.
    expect(thinProof.trackRungs.betting).toBe("FOUNDING");
    expect(thinProof.pricedEstimators).toEqual([]);

    const fewSamples = expectOk(
      evalReduceLadder({
        events: [settled(10), proof(0.6, 500), calibration(true)] as readonly LadderEvent[],
      }),
    );
    expect(fewSamples.trackRungs.betting).toBe("FOUNDING");
  });

  it("fail-closes on an empty ledger, a duplicate id, or an unparseable payload", () => {
    expect(evalReduceLadder({ events: [] }).ok).toBe(false);
    expect(
      evalReduceLadder({ events: [settled(1), settled(2)] as readonly LadderEvent[] }).ok,
    ).toBe(false);
    const badTime = { ...settled(1), occurredAt: "not-a-date" };
    expect(evalReduceLadder({ events: [badTime] as readonly LadderEvent[] }).ok).toBe(false);
    const badCount = { ...settled(1), payload: { track: "betting", sample: "canonical", settledCount: 1.5, threshold: 100 } };
    expect(evalReduceLadder({ events: [badCount] as readonly LadderEvent[] }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: ladder/heartbeat", () => {
  const event: GameSettledEvent = {
    id: "evt-1",
    type: "GAME_SETTLED",
    idempotencyKey: "cmtg0001",
    occurredAt: "2026-09-24T03:00:00.000Z",
    gameId: "g-1",
    league: "NFL",
    season: 2026,
    week: 2,
    scoreline: { homeTeamId: "BUF", awayTeamId: "DET", homePoints: 41, awayPoints: 31 },
    modelVersion: "v5.2.7",
    completedStages: [],
  };

  it("fans one game out to four ledger stages and two settled-sample events, idempotently", () => {
    const first = expectOk(evalGameSettledHeartbeat({ event }));
    expect(first.newEntriesAdded).toBe(4);
    expect(first.ledger.map((entry) => entry.stage)).toEqual(["DATA", "FORECAST", "PROOF", "UNLOCK"]);
    expect(first.newLadderEvents).toHaveLength(2);
    expect(first.ladderState.settledSamples.canonical).toEqual({ fantasy: 1, betting: 1 });
    expect(first.ladderState.currentRung).toBe("FOUNDING");
    expect(first.idempotent).toBe(true);
    expect(first.ladderStateReDerived.currentRung).toBe(first.ladderState.currentRung);
    expect(new Set(first.ledger.map((e) => e.idempotencyKey)).size).toBe(4);

    // Feeding the result back in must add nothing at all.
    const second = expectOk(
      evalGameSettledHeartbeat({
        event,
        priorLedger: first.ledger,
        priorLadderEvents: first.ladderEvents,
      }),
    );
    expect(second.newEntriesAdded).toBe(0);
    expect(second.newLadderEvents).toHaveLength(0);
    expect(second.ledger).toHaveLength(4);
    expect(second.ladderState.settledSamples.canonical).toEqual({ fantasy: 1, betting: 1 });
  });

  it("accumulates a second, distinct game onto the same ledger", () => {
    const first = expectOk(evalGameSettledHeartbeat({ event }));
    const secondEvent: GameSettledEvent = { ...event, id: "evt-2", idempotencyKey: "cmtg0002", gameId: "g-2" };
    const second = expectOk(
      evalGameSettledHeartbeat({
        event: secondEvent,
        priorLedger: first.ledger,
        priorLadderEvents: first.ladderEvents,
      }),
    );
    expect(second.newEntriesAdded).toBe(4);
    expect(second.ledger).toHaveLength(8);
    expect(second.ladderState.settledSamples.canonical).toEqual({ fantasy: 2, betting: 2 });
  });

  it("fail-closes on a malformed settled event", () => {
    expect(evalGameSettledHeartbeat({ event: { ...event, type: "NOT_SETTLED" as "GAME_SETTLED" } }).ok).toBe(false);
    expect(evalGameSettledHeartbeat({ event: { ...event, occurredAt: "nope" } }).ok).toBe(false);
    expect(
      evalGameSettledHeartbeat({
        event: { ...event, scoreline: { homeTeamId: "BUF", awayTeamId: "BUF", homePoints: 1, awayPoints: 2 } },
      }).ok,
    ).toBe(false);
    expect(evalGameSettledHeartbeat({ event: { ...event, scoreline: { ...event.scoreline, homePoints: 1.5 } } }).ok).toBe(false);
  });
});

describe("research-gse-bridge :: pipeline/live-orchestrator", () => {
  const filter = { nTeams: 8, seed: 4242, nParticles: 200 };
  const context = {
    gameId: "g-1",
    homeTeamIdx: 0,
    awayTeamIdx: 1,
    marketHomeProb: 0.52,
    decimalOddsHome: 1.9,
  };

  it("evaluates a shadow observation and folds one settled pick into the E-process", async () => {
    const result = expectOk(await evalOrchestratorGame({ filter, context, settle: { outcome: 1 } }));
    expect(result.priced).toBe(false);
    expect(result.status).toBe("shadow");
    expect(result.remoteEndpointsConfigured).toBe(0);
    // No remote endpoints: the ensemble is the particle filter alone.
    expect(result.modelProbs).toHaveLength(1);
    expect(result.modelProbs[0]).toBe(result.particleFilterProb);
    expect(result.blendedProb).toBeGreaterThan(0);
    expect(result.blendedProb).toBeLessThan(1);
    expect(result.blendedProbIsCalibrated).toBe(false);
    expect(result.marketDisagreement).toBeCloseTo(result.blendedProb - 0.52, 12);
    expect(result.kelly.confidenceSet.lower).toBeLessThanOrEqual(result.kelly.confidenceSet.upper);
    expect(result.kelly.confidenceSet.width).toBeCloseTo(
      result.kelly.confidenceSet.upper - result.kelly.confidenceSet.lower,
      12,
    );
    expect(result.kelly.priced).toBe(false);
    expect(result.kelly.status).toBe("shadow");
    expect(result.kelly.uncertaintyHaircut).toBeCloseTo(
      result.kelly.centralKellyFraction - result.kelly.robustFraction,
      12,
    );
    expect(result.kelly.breakEvenProbability).toBeCloseTo(1 / 1.9, 12);
    // A cold-started filter has zero observations, so the honest robust stake is 0.
    expect(result.filterDiagnostics.observations).toBe(0);
    expect(result.kelly.effectiveSampleSize).toBe(0);
    expect(result.kelly.robustFraction).toBe(0);
    expect(result.kelly.hasRobustEdge).toBe(false);
    expect(result.forecastSkill).not.toBeNull();
    expect(result.forecastSkill?.n).toBe(1);
    expect(result.forecastSkill?.realisedRate).toBe(1);
    expect(result.forecastSkill?.ourMeanProbability).toBeCloseTo(result.blendedProb, 12);
    expect(result.forecastSkill?.marketMeanProbability).toBeCloseTo(0.52, 12);
    expect(result.forecastSkill?.eligible).toBe(false);
    expect(result.forecastSkill?.verdict).toBe("insufficient");
  });

  it("is bit-deterministic for a given filter seed", async () => {
    const a = expectOk(await evalOrchestratorGame({ filter, context }));
    const b = expectOk(await evalOrchestratorGame({ filter, context }));
    expect(a.blendedProb).toBe(b.blendedProb);
    expect(a.particleFilterProb).toBe(b.particleFilterProb);
    expect(a.kelly.robustFraction).toBe(b.kelly.robustFraction);
    expect(a.edgeBitsVsBaseRate).toBe(b.edgeBitsVsBaseRate);
  });

  it("fail-closes on an out-of-range team index, price, or odds", async () => {
    expect((await evalOrchestratorGame({ filter, context: { ...context, homeTeamIdx: 99 } })).ok).toBe(false);
    expect((await evalOrchestratorGame({ filter, context: { ...context, awayTeamIdx: 0 } })).ok).toBe(false);
    expect((await evalOrchestratorGame({ filter, context: { ...context, marketHomeProb: 1.4 } })).ok).toBe(false);
    expect((await evalOrchestratorGame({ filter, context: { ...context, decimalOddsHome: 1.0 } })).ok).toBe(false);
    expect((await evalOrchestratorGame({ filter, context: { ...context, gameId: "" } })).ok).toBe(false);
    expect(
      (await evalOrchestratorGame({ filter: { ...filter, nTeams: 1 }, context })).ok,
    ).toBe(false);
    expect((await evalOrchestratorGame({ filter: { ...filter, seed: Number.NaN }, context })).ok).toBe(false);
    expect(
      (
        await evalOrchestratorGame({
          filter,
          context: { ...context, oddsEvents: [{ time: Number.NaN, side: "home" as const, impliedProbDelta: 0.01 }] },
        })
      ).ok,
    ).toBe(false);
  });
});
