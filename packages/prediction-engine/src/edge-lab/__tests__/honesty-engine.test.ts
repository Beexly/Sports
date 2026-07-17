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
  GateSetOverlapError,
  tuneTau,
  vennAbersInterval,
  type GateDecisionRow,
} from "../selective-gate.js";
import { regularizedIncompleteBeta } from "../stats.js";

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

  // ── FIX 1: pairwise-disjointness assertion ──────────────────────────────
  describe("pairwise-disjointness assertion (FIX 1)", () => {
    it("applySelectiveGate throws GateSetOverlapError naming the offending rowId(s) when calibration and eval overlap", () => {
      const cal = makeRows(60, 150, true);
      // Deliberately reuse one calibration rowId in the eval set.
      const evalRows: GateDecisionRow[] = [{ ...cal[0]! }, ...makeRows(61, 50, true)];
      expect(() => applySelectiveGate(cal, evalRows, 0)).toThrow(GateSetOverlapError);
      try {
        applySelectiveGate(cal, evalRows, 0);
        expect.unreachable("expected GateSetOverlapError");
      } catch (e) {
        expect(e).toBeInstanceOf(GateSetOverlapError);
        const err = e as GateSetOverlapError;
        expect(err.offendingIds).toEqual([cal[0]!.rowId]);
        expect(err.message).toContain(cal[0]!.rowId);
      }
    });

    it("tuneTau throws GateSetOverlapError when calibration and tuning overlap", () => {
      const cal = makeRows(62, 150, true);
      const tuning: GateDecisionRow[] = [{ ...cal[5]! }, ...makeRows(63, 100, true)];
      expect(() => tuneTau(cal, tuning, {})).toThrow(GateSetOverlapError);
    });

    it("disjoint calibration/eval and calibration/tuning sets pass without throwing", () => {
      const cal = makeRows(64, 400, true);
      const evalRows = makeRows(65, 200, true);
      const tuning = makeRows(66, 200, true);
      expect(() => applySelectiveGate(cal, evalRows, 0)).not.toThrow();
      expect(() => tuneTau(cal, tuning, { minFired: 40 })).not.toThrow();
    });
  });

  // ── FIX 3 + FIX 4: fixed-sequence exact-binomial tuneTau, per-row breakeven ──
  describe("tuneTau — fixed-sequence exact-binomial Learn-then-Test (FIX 3)", () => {
    // A well-calibrated stratum where Venn-Abers lower(score) tracks score
    // closely, letting the tests below place rows at chosen (score, q) pairs
    // to get a KNOWN, controllable lcbEdge = lower(score) - q, and thereby a
    // fully deterministic fired-set / win-rate at each tau.
    const buildWellCalibratedStratum = (seed: number, n: number): GateDecisionRow[] => {
      const rng = mulberry32(seed);
      return Array.from({ length: n }, (_, i) => {
        const s = i / n;
        return { rowId: `wc${seed}-${i}`, score: s, q: 0.5, stratum: "wc", y: (rng() < s ? 1 : 0) as 0 | 1 };
      });
    };

    it("fixed-sequence stop: a failing conservative candidate blocks a looser candidate even though the looser one's OWN p-value is tiny", () => {
      const cal = buildWellCalibratedStratum(70, 600);
      // Conservative regime (score 0.58 -> lcbEdge ~0.06, clears tau=0.05 but
      // not much beyond): borderline win rate, no real edge (fails alone).
      const consN = 60;
      const consWins = 34; // rate 0.567 vs breakeven 0.5 -> p > 0.05 alone
      const conservative: GateDecisionRow[] = Array.from({ length: consN }, (_, i) => ({
        rowId: `cons${i}`,
        score: 0.58,
        q: 0.5,
        stratum: "wc",
        y: (i < consWins ? 1 : 0) as 0 | 1,
      }));
      // Looser regime (score 0.56 -> lcbEdge ~0.04, clears tau=0.01 but NOT
      // tau=0.05): strong, unambiguous real edge — trivially significant if
      // ever tested on its own.
      const looseN = 400;
      const looseWins = 260; // rate 0.65 vs breakeven 0.5
      const loose: GateDecisionRow[] = Array.from({ length: looseN }, (_, i) => ({
        rowId: `loose${i}`,
        score: 0.56,
        q: 0.5,
        stratum: "wc",
        y: (i < looseWins ? 1 : 0) as 0 | 1,
      }));

      // Precondition sanity: the looser regime's OWN exact-binomial p-value
      // (were it tested standalone, outside the fixed sequence) is minuscule.
      const looseAloneP = regularizedIncompleteBeta(0.5, looseWins, looseN - looseWins + 1);
      expect(looseAloneP).toBeLessThan(1e-6);
      // And the conservative regime alone does NOT clear delta=0.05.
      const consAloneP = regularizedIncompleteBeta(0.5, consWins, consN - consWins + 1);
      expect(consAloneP).toBeGreaterThan(0.05);

      const tuning = [...conservative, ...loose];
      const sel = tuneTau(cal, tuning, { taus: [0.05, 0.01], minFired: 40 });

      // The fixed sequence tests tau=0.05 (most conservative) FIRST, fails
      // there (fired=60, p=consAloneP > delta), and STOPS — tau=0.01 (whose
      // combined fired set is dominated by the loose regime's tiny p) is
      // never reached, so the honest answer is fire nothing.
      expect(sel.tau).toBeNull();
      expect(sel.reason).toMatch(/fire nothing/i);
    });

    it("a strong, consistent fired set is accepted (loosest surviving tau returned)", () => {
      const cal = buildWellCalibratedStratum(71, 600);
      // Uniform strong edge across the whole tuning set: score 0.62 clears
      // both tau candidates in the grid, with a win rate well above breakeven.
      const n = 300;
      const wins = 195; // rate 0.65 vs breakeven 0.5
      const strong: GateDecisionRow[] = Array.from({ length: n }, (_, i) => ({
        rowId: `strong${i}`,
        score: 0.62,
        q: 0.5,
        stratum: "wc",
        y: (i < wins ? 1 : 0) as 0 | 1,
      }));

      const sel = tuneTau(cal, strong, { taus: [0.03, 0.01], minFired: 40 });
      expect(sel.tau).not.toBeNull();
      // Both candidates in this grid are accepted; the LOOSEST (smallest)
      // surviving tau is returned.
      expect(sel.tau).toBe(0.01);
      expect(sel.reason).toMatch(/accepted/i);
    });

    it("degenerate grids (empty taus, or minFired impossible to reach) return tau: null", () => {
      const cal = buildWellCalibratedStratum(72, 600);
      const n = 300;
      const wins = 195;
      const strong: GateDecisionRow[] = Array.from({ length: n }, (_, i) => ({
        rowId: `deg${i}`,
        score: 0.62,
        q: 0.5,
        stratum: "wc",
        y: (i < wins ? 1 : 0) as 0 | 1,
      }));

      const emptyTaus = tuneTau(cal, strong, { taus: [], minFired: 40 });
      expect(emptyTaus.tau).toBeNull();
      expect(emptyTaus.curve).toEqual([]);

      const impossibleMinFired = tuneTau(cal, strong, { taus: [0.03, 0.01], minFired: 10_000 });
      expect(impossibleMinFired.tau).toBeNull();
    });
  });

  // ── FIX 4: obtainableDecimalPrice-aware breakeven ────────────────────────
  describe("coverageEdgeCurve — per-row obtainable-price breakeven (FIX 4)", () => {
    it("meanBreakeven mixes 1/obtainableDecimalPrice (when present) with devigged q (when absent)", () => {
      const cal = makeRows(80, 400, true);
      const mixedEval: GateDecisionRow[] = [
        { rowId: "m1", score: 0.95, q: 0.4, stratum: "nfl|ML", y: 1, obtainableDecimalPrice: 2.5 }, // breakeven 1/2.5 = 0.4
        { rowId: "m2", score: 0.95, q: 0.35, stratum: "nfl|ML", y: 1 }, // no price -> breakeven = q = 0.35
      ];
      const curve = coverageEdgeCurve(cal, mixedEval, [0]);
      const point = curve[0]!;
      expect(point.fired).toBe(2);
      expect(point.meanBreakeven).not.toBeNull();
      expect(point.meanBreakeven!).toBeCloseTo((0.4 + 0.35) / 2, 10);
    });

    it("strictObtainable throws, naming the fired row(s) missing a real price", () => {
      const cal = makeRows(81, 400, true);
      const mixedEval: GateDecisionRow[] = [
        { rowId: "m1", score: 0.95, q: 0.4, stratum: "nfl|ML", y: 1, obtainableDecimalPrice: 2.5 },
        { rowId: "m2", score: 0.95, q: 0.35, stratum: "nfl|ML", y: 1 }, // missing obtainableDecimalPrice
      ];
      expect(() => coverageEdgeCurve(cal, mixedEval, [0], { strictObtainable: true })).toThrow(/m2/);
    });

    it("strictObtainable does not throw when every fired row carries a real price", () => {
      const cal = makeRows(82, 400, true);
      const fullyPriced: GateDecisionRow[] = [
        { rowId: "p1", score: 0.95, q: 0.4, stratum: "nfl|ML", y: 1, obtainableDecimalPrice: 2.5 },
        { rowId: "p2", score: 0.95, q: 0.35, stratum: "nfl|ML", y: 0, obtainableDecimalPrice: 2.8 },
      ];
      expect(() => coverageEdgeCurve(cal, fullyPriced, [0], { strictObtainable: true })).not.toThrow();
    });
  });
});
