import { describe, expect, it } from "vitest";
import {
  DEFAULT_ABSTAIN_BAND,
  DEFAULT_THRESHOLD,
  DISAGREEMENT_SCALE,
  SIM_TAIL_FLOOR,
  evaluateEmissionGate,
  isEmission,
  marketPriorFrom,
  stackingProb,
} from "../emission-gate.js";
import {
  BOOTSTRAP_SEED,
  FROZEN_BARS,
  applyFrozenBars,
  auc,
  brierScore,
  clusterBootstrapCi,
  duplicationRate,
  eceWithReliability,
  fitStackingWeights,
  logLoss,
  runEdgeThresholdArm,
  runEnsembleArm,
  runGateArm,
  runMarketOnlyArm,
  runPassAllArm,
  scoreArm,
  walkForwardBlocks,
  type ArmResult,
  type ArmMetrics,
  type HarnessRow,
} from "../emission-gate-harness.js";

// ---------------------------------------------------------------------------
// emission-gate.ts
// ---------------------------------------------------------------------------

const baseWeights = { a: 2.0 };

function gateInputs(over: {
  signals?: Record<string, unknown>;
  /** Default 0.5. Pass explicit `null` to remove the prior entirely. */
  marketCloseProb?: number | null;
  threshold?: number;
}) {
  const { signals, marketCloseProb, ...rest } = over;
  return {
    gameKey: "2026_06_SEA_DEN",
    market: "MONEYLINE",
    selection: "SEA",
    signals: {
      baseSignals: { a: 0.65 },
      calibratedWeights: baseWeights,
      marketCloseProb: marketCloseProb ?? 0.5,
      ...signals,
    },
    ...rest,
  } as Parameters<typeof evaluateEmissionGate>[0];
}

describe("stackingProb", () => {
  it("logistic-stacks centered signals under weights", () => {
    // z = 2*(0.65-0.5) = 0.3 -> p = 0.57444...
    const p = stackingProb({ a: 0.65 }, baseWeights);
    expect(p).toBeCloseTo(0.574442516811659, 10);
  });

  it("is NaN without weights and with zero-vote weights", () => {
    expect(Number.isNaN(stackingProb({ a: 0.65 }, undefined))).toBe(true);
    expect(Number.isNaN(stackingProb({ a: 0.65 }, { b: 2.0 }))).toBe(true);
    expect(Number.isNaN(stackingProb({ a: 0.65 }, { a: 0 }))).toBe(true);
  });
});

describe("evaluateEmissionGate — selective risk ladder", () => {
  it("emits when calibrated edge clears threshold + band", () => {
    const r = evaluateEmissionGate(gateInputs({}));
    expect(r.decision).toBe("emit");
    expect(r.rule).toBe("selective_risk_emit");
    // p_model 0.574442 - prior 0.5 = 0.074442 > 0.03 + 0.01
    expect(r.selectiveRisk).toBeCloseTo(0.074442516811659, 10);
    expect(isEmission(r)).toBe(true);
    expect(r.status).toBe("emitted");
  });

  it("abstains inside the band", () => {
    const r = evaluateEmissionGate(gateInputs({ marketCloseProb: 0.55 }));
    // risk = 0.024442, band [0.02, 0.04]
    expect(r.decision).toBe("abstain");
    expect(r.rule).toBe("abstain_band");
  });

  it("withholds below the band as a soft no", () => {
    const r = evaluateEmissionGate(gateInputs({ marketCloseProb: 0.62 }));
    expect(r.decision).toBe("withhold");
    expect(r.rule).toBe("withhold_below_threshold");
    expect(r.status).toBe("withheld");
  });

  it("honors a custom threshold", () => {
    // risk 0.0744; threshold 0.10 with band 0.01 -> below the band -> withhold
    const r = evaluateEmissionGate(gateInputs({ threshold: 0.10 }));
    expect(r.decision).toBe("withhold");
  });
});

describe("evaluateEmissionGate — evidence-absent and hard blocks", () => {
  it("abstains (never emits) when no calibrated weights exist", () => {
    const r = evaluateEmissionGate({
      ...gateInputs({}),
      signals: { baseSignals: { a: 0.9 }, marketCloseProb: 0.5 },
    });
    expect(r.decision).toBe("abstain");
    expect(r.rule).toBe("abstain_missing_evidence");
    expect(Number.isNaN(r.selectiveRisk)).toBe(true);
  });

  it("abstains when the market book is crossed (devig refuses)", () => {
    const r = evaluateEmissionGate(
      gateInputs({ signals: { baseSignals: { a: 0.65 }, decimalPrices: [2.2, 2.2], selectedOutcomeIndex: 0, marketCloseProb: null } }),
    );
    expect(r.decision).toBe("abstain");
    expect(r.rule).toBe("abstain_missing_evidence");
    expect(r.trail.some((t) => t.step === "market_prior" && t.detail.includes("refused"))).toBe(true);
  });

  it("withholds on duplication even with a huge edge (hard block first)", () => {
    const r = evaluateEmissionGate(
      gateInputs({ signals: { baseSignals: { a: 0.95 }, calibratedWeights: { a: 10 }, marketCloseProb: 0.1, duplicateOf: "row-xyz" } }),
    );
    expect(r.decision).toBe("withhold");
    expect(r.rule).toBe("withhold_duplicate");
    expect(r.duplicate).toBe(true);
    expect(Number.isNaN(r.selectiveRisk)).toBe(true);
    // Duplication is the FIRST check — no stacking/risk work recorded after it.
    const steps = r.trail.map((t) => t.step);
    expect(steps.indexOf("duplication")).toBe(steps.length - 1);
  });

  it("withholds on simulation tail breach even with a passing edge", () => {
    const r = evaluateEmissionGate(
      gateInputs({
        signals: {
          baseSignals: { a: 0.65 },
          marketCloseProb: 0.5,
          simulation: { p90: 0.2, p99: 0.05, ceilingEv: SIM_TAIL_FLOOR - 0.01 },
        },
      }),
    );
    expect(r.decision).toBe("withhold");
    expect(r.rule).toBe("withhold_simulation_tail");
    expect(r.tailVerdict).toBe("breach");
  });

  it("passes through when the simulation tail is inside the bands", () => {
    const r = evaluateEmissionGate(
      gateInputs({
        signals: {
          baseSignals: { a: 0.65 },
          marketCloseProb: 0.5,
          simulation: { p90: 0.3, p99: 0.1, ceilingEv: 0.05 },
        },
      }),
    );
    expect(r.tailVerdict).toBe("ok");
    expect(r.decision).toBe("emit");
  });

  it("treats a missing simulation layer as not_run (not a block)", () => {
    const r = evaluateEmissionGate(gateInputs({}));
    expect(r.tailVerdict).toBe("not_run");
    expect(r.decision).toBe("emit");
  });
});

describe("evaluateEmissionGate — market prior and disagreement term", () => {
  it("devigs supplied decimal prices (proportional by default)", () => {
    const r = evaluateEmissionGate(
      gateInputs({ signals: { baseSignals: { a: 0.65 }, decimalPrices: [1.87, 1.95], selectedOutcomeIndex: 0, marketCloseProb: null } }),
    );
    const expected = 1 / 1.87 / (1 / 1.87 + 1 / 1.95);
    expect(r.marketPrior).toBeCloseTo(expected, 10);
  });

  it("supports the Shin routine and logs it", () => {
    const p = marketPriorFrom([1.5, 2.5], 0, "shin");
    const pProp = marketPriorFrom([1.5, 2.5], 0, "proportional");
    expect(p).not.toBeNull();
    expect(pProp).not.toBeNull();
    // Shin pulls mass off the longshot -> favourite probability rises.
    expect(p!).toBeGreaterThan(pProp!);
  });

  it("applies the CLV disagreement term to the effective prior", () => {
    // Without disagreement: risk = 0.0744 -> emit. With 1.0u disagreement the
    // effective prior gains DISAGREEMENT_SCALE -> risk = 0.0744-0.05 = 0.0244
    // -> inside the band -> abstain.
    const r = evaluateEmissionGate(
      gateInputs({ signals: { baseSignals: { a: 0.65 }, marketCloseProb: 0.5, clvDisagreement: 1.0 } }),
    );
    expect(r.disagreementTerm).toBeCloseTo(DISAGREEMENT_SCALE, 12);
    expect(r.decision).toBe("abstain");
    expect(r.rule).toBe("abstain_band");
  });

  it("treats absent CLV disagreement as zero (logged, not assumed)", () => {
    const r = evaluateEmissionGate(gateInputs({}));
    expect(r.disagreementTerm).toBe(0);
    expect(r.trail.some((t) => t.step === "disagreement" && t.detail.includes("clvDisagreement=0.0000"))).toBe(true);
  });
});

describe("evaluateEmissionGate — auditability", () => {
  it("is deterministic: identical inputs produce an identical trail", () => {
    const a = evaluateEmissionGate(gateInputs({}));
    const b = evaluateEmissionGate(gateInputs({}));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("records every decision step in order", () => {
    const r = evaluateEmissionGate(gateInputs({}));
    const steps = r.trail.map((t) => t.step);
    expect(steps).toEqual([
      "identity",
      "duplication",
      "stacking",
      "market_prior",
      "disagreement",
      "simulation_tail",
      "selective_risk",
      "rule",
    ]);
    expect(r.trail[0]!.detail).toContain("2026_06_SEA_DEN");
  });

  it("uses the pre-registered defaults", () => {
    expect(DEFAULT_THRESHOLD).toBe(0.03);
    expect(DEFAULT_ABSTAIN_BAND).toBe(0.01);
    expect(SIM_TAIL_FLOOR).toBe(-0.05);
  });
});

// ---------------------------------------------------------------------------
// emission-gate-harness.ts
// ---------------------------------------------------------------------------

/** Deterministic synthetic set: 60 winners (signal a high), 40 losers (a low),
 * plus 6 noisy rows in each direction so the fit stays non-separable. */
function syntheticRows(): HarnessRow[] {
  const rows: HarnessRow[] = [];
  let id = 0;
  const push = (gameIdx: number, a: number, outcome: number, units: number) => {
    rows.push({
      rowId: `r${id++}`,
      gameKey: `g${gameIdx}`,
      market: "MONEYLINE",
      baseSignals: { a },
      marketPrior: 0.55,
      outcome,
      units,
      period: Math.floor(gameIdx / 10) + 1,
      tier: "A",
    });
  };
  for (let i = 0; i < 60; i++) {
    const a = i % 3 === 0 ? 0.48 : [0.68, 0.7, 0.72][i % 3]!;
    push(i, a, 1, 0.9);
  }
  for (let i = 0; i < 40; i++) {
    const a = i % 6 === 0 ? 0.66 : [0.42, 0.44, 0.46][i % 3]!;
    push(100 + i, a, 0, -1);
  }
  return rows;
}

describe("fitStackingWeights", () => {
  it("fits a positive weight on the informative signal on the calibration split", () => {
    const rows = syntheticRows();
    const calib = rows.slice(0, 50); // calibration split ONLY (protocol rule)
    const w = fitStackingWeights(calib, { splitLabel: "calibration" });
    expect(w.harnessArtifact).toBe(true);
    expect(w.fittedOn).toBe("calibration");
    expect(w.nRows).toBe(50);
    expect(w.weights.a).toBeGreaterThan(0.5);
  });

  it("returns an empty unconverged fit on label-free rows", () => {
    const w = fitStackingWeights([{ rowId: "x", gameKey: "g", market: "M", baseSignals: { a: 0.5 } }]);
    expect(w.converged).toBe(false);
    expect(w.nRows).toBe(0);
    // Zero weights: an empty fit contributes no logits, matching the gate's
    // zero-vote rule (a signal with zero weight contributes zero logits).
    expect(w.weights).toEqual({ a: 0 });
  });
});

describe("clusterBootstrapCi", () => {
  it("is deterministic under the fixed protocol seed", () => {
    const rows = syntheticRows();
    const emitted = new Set(rows.map((r) => r.rowId));
    const ci1 = clusterBootstrapCi(rows, emitted);
    const ci2 = clusterBootstrapCi(rows, emitted);
    expect(ci1).toEqual(ci2);
  });

  it("collapses to the point value when every cluster has identical units", () => {
    const rows: HarnessRow[] = Array.from({ length: 10 }, (_, i) => ({
      rowId: `r${i}`,
      gameKey: `g${i}`,
      market: "MONEYLINE",
      baseSignals: { a: 0.6 },
      units: 0.2,
    }));
    const ci = clusterBootstrapCi(rows, new Set(rows.map((r) => r.rowId)));
    expect(ci).not.toBeNull();
    expect(ci![0]).toBeCloseTo(0.2, 12);
    expect(ci![1]).toBeCloseTo(0.2, 12);
  });

  it("uses the frozen protocol seed", () => {
    expect(BOOTSTRAP_SEED).toBe(20261015);
  });
});

describe("scoreArm — hand-computed metrics", () => {
  const rows: HarnessRow[] = [
    { rowId: "r1", gameKey: "g1", market: "MONEYLINE", baseSignals: { a: 0.6 }, outcome: 1, units: 1 },
    { rowId: "r2", gameKey: "g1", market: "MONEYLINE", baseSignals: { a: 0.6 }, outcome: 0, units: -1 },
    { rowId: "r3", gameKey: "g2", market: "MONEYLINE", baseSignals: { a: 0.6 }, outcome: 1, units: 1 },
  ];
  const emitted = new Set(["r1", "r2", "r3"]);
  const m = scoreArm(rows, emitted, () => 0.6);

  it("computes coverage, mean units, win rate, false pass", () => {
    expect(m.n).toBe(3);
    expect(m.coverage).toBeCloseTo(1, 12);
    expect(m.meanUnits).toBeCloseTo(1 / 3, 12);
    expect(m.winRate).toBeCloseTo(2 / 3, 12);
    expect(m.falsePass).toBeCloseTo(1 / 3, 12);
  });

  it("computes Brier by hand: two wins (0.16 each) + one loss (0.64), /3", () => {
    // p=0.6 constant: (0.6-1)^2=0.16 twice, (0.6-0)^2=0.36 once -> 0.68/3.
    expect(m.brier).toBeCloseTo(0.68 / 3, 12);
  });

  it("computes log loss by hand", () => {
    const expected = (2 * -(Math.log(0.6)) + -(Math.log(0.4))) / 3;
    expect(m.logLoss).toBeCloseTo(expected, 10);
  });

  it("computes ECE from a single populated bin", () => {
    // All probs 0.6 land in bin [0.6,0.7): meanP 0.6, winRate 2/3, gap 1/15.
    expect(m.ece).toBeCloseTo(1 / 15, 6);
    expect(m.reliability).toHaveLength(1);
    expect(m.reliability![0]!.n).toBe(3);
  });

  it("flags the duplicated (game, market) rows", () => {
    expect(m.duplicationRate).toBeCloseTo(2 / 3, 12);
  });

  it("gives AUC 0.5 on constant probabilities (all ties)", () => {
    expect(m.auc).toBeCloseTo(0.5, 12);
  });
});

describe("metric primitives", () => {
  it("brierScore / logLoss are null on empty input", () => {
    expect(brierScore([])).toBeNull();
    expect(logLoss([])).toBeNull();
  });

  it("eceWithReliability is 0 for perfectly calibrated constant probs", () => {
    const pairs: (readonly [number, number])[] = [
      [0.5, 1],
      [0.5, 0],
    ];
    const { ece } = eceWithReliability(pairs);
    expect(ece).toBeCloseTo(0, 12);
  });

  it("auc ranks perfectly at 1.0 and inverted at 0.0", () => {
    const perfect: (readonly [number, number])[] = [
      [0.9, 1],
      [0.8, 1],
      [0.2, 0],
      [0.1, 0],
    ];
    expect(auc(perfect)).toBe(1);
    expect(auc(perfect.map(([p, y]) => [1 - p, y] as const))).toBe(0);
  });

  it("auc is null when only one class is present", () => {
    expect(auc([[0.9, 1], [0.8, 1]])).toBeNull();
  });

  it("duplicationRate is 0 on an empty emitted set", () => {
    expect(duplicationRate([], new Set())).toBe(0);
  });
});

describe("walkForwardBlocks", () => {
  it("blocks by period in sorted order with drawdown math", () => {
    const rows: HarnessRow[] = [
      { rowId: "a", gameKey: "g1", market: "M", baseSignals: {}, period: 2, units: 1 },
      { rowId: "b", gameKey: "g2", market: "M", baseSignals: {}, period: 2, units: -2 },
      { rowId: "c", gameKey: "g3", market: "M", baseSignals: {}, period: 1, units: 0.5 },
    ];
    const blocks = walkForwardBlocks(rows, new Set(["a", "b", "c"]));
    expect(blocks).not.toBeNull();
    expect(blocks!.map((b) => b.period)).toEqual(["1", "2"]);
    const p2 = blocks![1]!;
    expect(p2.meanUnits).toBeCloseTo(-0.5, 12);
    expect(p2.profitFactor).toBeCloseTo(0.5, 12);
    // Sequence [+1, -2]: peak 1, trough -1 -> max drawdown 2.
    expect(p2.maxDrawdown).toBeCloseTo(2, 12);
  });

  it("is null when no emitted row carries a period", () => {
    const rows: HarnessRow[] = [{ rowId: "a", gameKey: "g1", market: "M", baseSignals: {} }];
    expect(walkForwardBlocks(rows, new Set(["a"]))).toBeNull();
  });
});

describe("arms on the synthetic set", () => {
  const rows = syntheticRows();
  const calib = rows.slice(0, 50);
  const weights = fitStackingWeights(calib, { splitLabel: "calibration" });
  const gate = runGateArm(rows, weights);
  const market = runMarketOnlyArm(rows);
  const ensemble = runEnsembleArm(rows);
  const edgeRule = runEdgeThresholdArm(rows, 0);
  const passAll = runPassAllArm(rows);

  it("market-only emits every priced row", () => {
    expect(market.metrics.n).toBe(rows.length);
    expect(market.metrics.coverage).toBe(1);
  });

  it("the gate is selective and beats market-only on emitted mean units", () => {
    expect(gate.metrics.coverage).toBeGreaterThan(0.1);
    expect(gate.metrics.coverage).toBeLessThan(0.95);
    expect(gate.metrics.meanUnits!).toBeGreaterThan(market.metrics.meanUnits!);
    expect(gate.metrics.falsePass!).toBeLessThanOrEqual(FROZEN_BARS.falsePassMax);
    // Gate Brier must beat the market floor on the emitted labeled rows.
    expect(gate.metrics.brier!).toBeLessThan(market.metrics.brier!);
  });

  it("arms are deterministic across reruns", () => {
    const gate2 = runGateArm(rows, weights);
    expect([...gate.emitted].sort()).toEqual([...gate2.emitted].sort());
    expect(JSON.stringify(gate2.metrics.brier)).toBe(JSON.stringify(gate.metrics.brier));
  });

  it("records the proxy-CLV and simulation-not-run notes on the gate arm", () => {
    expect(gate.notes.some((n) => n.includes("PROXY-CLV"))).toBe(true);
    expect(gate.notes.some((n) => n.includes("not_run"))).toBe(true);
  });

  it("pass-all matches the design's coverage-1 reference shape", () => {
    expect(passAll.metrics.coverage).toBe(1);
    expect(passAll.metrics.n).toBe(rows.length);
  });

  it("edge-threshold rule exists as the known worse-than-pass-all reference", () => {
    expect(edgeRule.metrics.n).toBeGreaterThan(0);
  });

  it("ensemble arm blends the market prior and emits on positive edge", () => {
    expect(ensemble.metrics.n).toBeGreaterThan(0);
    expect(ensemble.metrics.n).toBeLessThanOrEqual(rows.length);
  });
});

describe("applyFrozenBars — verdicts", () => {
  const passingMetrics = (over: Partial<ArmMetrics>): ArmMetrics => ({
    n: 100,
    coverage: 0.3,
    meanUnits: 0.03,
    nNoUnits: 0,
    meanUnitsCi95: [0.01, 0.05],
    winRate: 0.55,
    nLabeled: 100,
    beatClose: 0.55,
    falsePass: 0.35,
    falseReject: 0.5,
    brier: 0.2,
    logLoss: 0.65,
    ece: 0.05,
    reliability: [],
    auc: 0.6,
    duplicationRate: 0,
    walkForward: null,
    riskCoverage: null,
    ...over,
  });
  const armOf = (metrics: ArmMetrics, decisions?: Record<string, "emit" | "abstain" | "withhold">): ArmResult => ({
    arm: "test",
    decisions,
    emitted: new Set(),
    metrics,
    notes: [],
  });
  const marketArm = armOf(passingMetrics({ brier: 0.23 }));

  it("SHADOW_SEAT when every bar passes", () => {
    const v = applyFrozenBars(armOf(passingMetrics({})), marketArm.metrics, { games: 285 });
    expect(v.verdict).toBe("SHADOW_SEAT");
    expect(v.lines.every((l) => l.pass === true)).toBe(true);
    expect(v.kills).toHaveLength(0);
  });

  it("KILLED on inverted confidence (AUC < 0.50) regardless of other bars", () => {
    const v = applyFrozenBars(armOf(passingMetrics({ auc: 0.45 })), marketArm.metrics, {});
    expect(v.verdict).toBe("KILLED");
    expect(v.kills.some((k) => k.includes("inverted"))).toBe(true);
  });

  it("KILLED when a bar fails without a kill criterion", () => {
    const v = applyFrozenBars(armOf(passingMetrics({ meanUnits: -0.05 })), marketArm.metrics, {});
    expect(v.verdict).toBe("KILLED");
    expect(v.kills[0]).toContain("bars failed");
    expect(v.kills[0]).toContain("emitted mean");
  });

  it("INCONCLUSIVE when a bar is unmeasurable (honest nulls)", () => {
    const v = applyFrozenBars(armOf(passingMetrics({ brier: null, auc: null, ece: null, beatClose: null, falsePass: null })), marketArm.metrics, {});
    expect(v.verdict).toBe("INCONCLUSIVE");
    expect(v.lines.some((l) => l.pass === null)).toBe(true);
  });

  it("KILLED when Brier does not beat the market floor by the frozen margin", () => {
    const v = applyFrozenBars(armOf(passingMetrics({ brier: 0.228 })), marketArm.metrics, {});
    expect(v.verdict).toBe("KILLED");
  });

  it("KILLED when coverage leaves the 15-85% emit-rate window", () => {
    const low = applyFrozenBars(armOf(passingMetrics({ coverage: 0.05, n: 5 })), marketArm.metrics, {});
    expect(low.verdict).toBe("KILLED");
    const high = applyFrozenBars(armOf(passingMetrics({ coverage: 0.95 })), marketArm.metrics, {});
    expect(high.verdict).toBe("KILLED");
  });

  it("freezes the bar constants exactly as pre-registered", () => {
    expect(FROZEN_BARS).toEqual({
      meanUnitsMin: 0.02,
      ciLbMin: -0.02,
      beatCloseMin: 0.524,
      brierMax: 0.24,
      brierMarginVsMarket: 0.005,
      eceMax: 0.07,
      aucMin: 0.58,
      falsePassMax: 0.4,
      emitRateMin: 0.15,
      emitRateMax: 0.85,
      aucInvertedKill: 0.5,
    });
  });
});
