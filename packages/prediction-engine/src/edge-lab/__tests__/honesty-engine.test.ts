/**
 * Phase-1 statistical core: OOF calibration blend (selected by Brier
 * decomposition), the logit-pool β truth test (CI includes 0 ⇒ FIRE
 * NOTHING), and the Venn–Abers selective gate with disjoint-fold τ tuning.
 */
import { describe, expect, it } from "vitest";

import { fitOofCalibration } from "../calibration-blend.js";
import { logitPoolTest } from "../logit-pool.js";
import { mulberry32 } from "../rng.js";
import {
  applySelectiveGate,
  coverageEdgeCurve,
  tuneTau,
  vennAbersInterval,
  type GateDecisionRow,
} from "../selective-gate.js";

const logit = (p: number): number => Math.log(p / (1 - p));
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

describe("fitOofCalibration", () => {
  it("fixes an overconfident forecaster and stays monotone (ranking preserved)", () => {
    const rng = mulberry32(21);
    const n = 3000;
    const samples = Array.from({ length: n }, () => {
      const trueP = 0.05 + rng() * 0.9;
      const overconfident = sigmoid(1.8 * logit(trueP)); // stretched toward extremes
      return { p: overconfident, y: (rng() < trueP ? 1 : 0) as 0 | 1 };
    });
    const fit = fitOofCalibration(samples, { seed: 5 });
    expect(fit.selected).not.toBe("identity");
    // Monotone on a grid — calibration must never change ranking.
    let prev = -1;
    for (let g = 1; g < 100; g++) {
      const v = fit.map(g / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    // It actually de-stretches: an extreme overconfident reading pulls inward.
    expect(fit.map(0.97)).toBeLessThan(0.97);
    expect(fit.map(0.03)).toBeGreaterThan(0.03);
    // Held-out Brier scores exist for every candidate that fit.
    expect(fit.scores.length).toBeGreaterThanOrEqual(2);
  });

  it("returns a safe identity on thin data", () => {
    const fit = fitOofCalibration([{ p: 0.5, y: 1 }], {});
    expect(fit.selected).toBe("identity");
    expect(fit.map(0.42)).toBe(0.42);
  });
});

describe("logitPoolTest — the falsifiable edge test", () => {
  const build = (modelInformative: boolean) => {
    const rng = mulberry32(modelInformative ? 31 : 32);
    const n = 2000;
    const q: number[] = [];
    const p: number[] = [];
    const y: (0 | 1)[] = [];
    for (let i = 0; i < n; i++) {
      const base = 0.2 + rng() * 0.6;
      const orthogonal = (rng() - 0.5) * 1.2; // signal q does NOT see
      const trueP = sigmoid(logit(base) + orthogonal);
      q.push(base);
      p.push(modelInformative ? sigmoid(logit(base) + orthogonal * 0.8 + (rng() - 0.5) * 0.2) : rng());
      y.push(rng() < trueP ? 1 : 0);
    }
    return { q, p, y };
  };

  it("noise model -> CI includes 0 -> FIRE_NOTHING", () => {
    const { q, p, y } = build(false);
    const r = logitPoolTest({ modelProbs: p, marketProbs: q, outcomes: y });
    expect(r.converged).toBe(true);
    expect(r.includesZero).toBe(true);
    expect(r.verdict).toBe("FIRE_NOTHING");
  });

  it("genuinely informative model -> beta CI excludes 0 -> MODEL_ADDS_INFORMATION", () => {
    const { q, p, y } = build(true);
    const r = logitPoolTest({ modelProbs: p, marketProbs: q, outcomes: y });
    expect(r.converged).toBe(true);
    expect(r.beta).toBeGreaterThan(0);
    expect(r.includesZero).toBe(false);
    expect(r.verdict).toBe("MODEL_ADDS_INFORMATION");
  });

  it("tiny samples refuse to certify anything", () => {
    const r = logitPoolTest({ modelProbs: [0.5, 0.6], marketProbs: [0.5, 0.5], outcomes: [1, 0] });
    expect(r.verdict).toBe("FIRE_NOTHING");
  });
});

describe("Venn–Abers selective gate", () => {
  const makeRows = (seed: number, n: number, informative: boolean): GateDecisionRow[] => {
    const rng = mulberry32(seed);
    return Array.from({ length: n }, (_, i) => {
      const trueP = 0.25 + rng() * 0.5;
      const q = sigmoid(logit(trueP) + (rng() - 0.5) * 0.08); // near-efficient close
      const score = informative
        ? sigmoid(logit(trueP) + (rng() - 0.5) * 0.35) // sees truth better than q sometimes
        : rng();
      return {
        rowId: `r${seed}-${i}`,
        score,
        q,
        stratum: i % 2 === 0 ? "nfl|ML" : "mlb|ML",
        y: (rng() < trueP ? 1 : 0) as 0 | 1,
      };
    });
  };

  it("interval is ordered and inside [0,1]; thin strata never fire", () => {
    const cal = makeRows(41, 300, true);
    const iv = vennAbersInterval(
      cal.map((r) => ({ p: r.score, y: r.y })),
      0.62,
    );
    expect(iv.lower).toBeLessThanOrEqual(iv.upper);
    expect(iv.lower).toBeGreaterThanOrEqual(0);
    expect(iv.upper).toBeLessThanOrEqual(1);

    const thinCal = makeRows(42, 60, true); // < MIN_STRATUM_CALIBRATION per stratum
    const report = applySelectiveGate(thinCal, makeRows(43, 200, true), 0);
    expect(report.fired).toBe(0);
  });

  it("coverage falls as tau rises (the risk-coverage curve is monotone)", () => {
    const cal = makeRows(44, 1200, true);
    const evalRows = makeRows(45, 600, true);
    const curve = coverageEdgeCurve(cal, evalRows, [0, 0.01, 0.03, 0.06]);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]!.fired).toBeLessThanOrEqual(curve[i - 1]!.fired);
    }
  });

  it("tuneTau fires nothing for a noise model, and reports the full curve", () => {
    const cal = makeRows(46, 1200, false);
    const tune = makeRows(47, 800, false);
    const sel = tuneTau(cal, tune, { minFired: 40 });
    expect(sel.tau).toBeNull();
    expect(sel.reason).toMatch(/fire nothing/i);
    expect(sel.curve.length).toBeGreaterThan(0);
  });

  it("per-stratum reporting carries the coverage + Wilson quartet fields", () => {
    const cal = makeRows(48, 1400, true);
    const evalRows = makeRows(49, 700, true);
    const report = applySelectiveGate(cal, evalRows, 0);
    expect(report.eligible).toBe(700);
    for (const s of report.perStratum) {
      expect(s.eligible).toBeGreaterThan(0);
      if (s.fired > 0) {
        expect(s.wilsonLcb).not.toBeNull();
        expect(s.wilsonLcb!).toBeLessThanOrEqual(s.realizedRate!);
      }
    }
  });
});
