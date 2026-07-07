import { describe, it, expect } from "vitest";
import {
  plattScaling,
  betaCalibration,
  equalMassEce,
  selectCalibrator,
} from "../calibration-map.js";
import { expectedCalibrationError, type CalibrationSample } from "../probability-calibration.js";

// Deterministic data generators (seeded) — no Math.random anywhere.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
const logit = (p: number) => Math.log(p / (1 - p));

/**
 * Overconfident forecasts with a KNOWN generating truth: q = sigmoid(shrink·logit(p)),
 * shrink < 1 means forecasts are too extreme. A correct Platt fit must recover a ≈ shrink.
 */
function genOverconfident(n: number, shrink: number, seed: number): CalibrationSample[] {
  const rand = mulberry32(seed);
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.05 + 0.9 * ((i + 0.5) / n);
    const q = sigmoid(shrink * logit(p));
    out.push({ p, y: rand() < q ? 1 : 0 });
  }
  return out;
}
function genCalibrated(n: number, seed: number): CalibrationSample[] {
  const rand = mulberry32(seed);
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.05 + 0.9 * ((i + 0.5) / n);
    out.push({ p, y: rand() < p ? 1 : 0 });
  }
  return out;
}

describe("plattScaling", () => {
  it("recovers a known overconfidence slope (a ≈ shrink=0.5)", () => {
    // OBSERVED (n=800, shrink=0.5, seed=12345): a=0.507368, b=-0.088726.
    const over = genOverconfident(800, 0.5, 12345);
    const platt = plattScaling(over)!;
    expect(platt).not.toBeNull();
    expect(platt.a).toBeGreaterThan(0.4);
    expect(platt.a).toBeLessThan(0.6); // recovered the 0.5 shrink
    // and it materially reduces in-sample ECE (raw 0.1 → ~0.026).
    const cal = over.map((s) => ({ p: platt.predict(s.p), y: s.y }));
    expect(expectedCalibrationError(cal)).toBeLessThan(expectedCalibrationError(over));
  });

  it("returns null when a slope cannot be fit (single-class outcomes)", () => {
    expect(plattScaling([{ p: 0.6, y: 1 }, { p: 0.7, y: 1 }])).toBeNull();
    expect(plattScaling([{ p: 0.6, y: 0 }])).toBeNull();
  });

  it("stays sane on perfectly separated data (Platt target smoothing bounds the optimum)", () => {
    // Hostile-review cross-check: separation blows up unsmoothed logistic fits;
    // Platt's (N±+1)/(N±+2) targets keep the optimum finite. OBSERVED a=4.409775.
    const sep: CalibrationSample[] = [];
    for (let i = 0; i < 100; i++) {
      const p = 0.05 + 0.9 * (i / 99);
      sep.push({ p, y: p > 0.5 ? 1 : 0 });
    }
    const platt = plattScaling(sep)!;
    expect(platt).not.toBeNull();
    expect(Math.abs(platt.a)).toBeLessThan(10);
  });

  it("is monotone non-decreasing when a ≥ 0", () => {
    const over = genOverconfident(400, 0.6, 5);
    const platt = plattScaling(over)!;
    let prev = -1;
    for (let p = 0.02; p < 0.99; p += 0.03) {
      const v = platt.predict(p);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});

describe("betaCalibration", () => {
  it("reduces ECE on overconfident data and stays in [0,1]", () => {
    // OBSERVED (n=800, shrink=0.5, seed=12345): a=0.600795, b=0.422376, c=0.065154.
    const over = genOverconfident(800, 0.5, 12345);
    const beta = betaCalibration(over)!;
    expect(beta.a).toBeGreaterThanOrEqual(0);
    expect(beta.b).toBeGreaterThanOrEqual(0);
    const cal = over.map((s) => ({ p: beta.predict(s.p), y: s.y }));
    for (const s of cal) {
      expect(s.p).toBeGreaterThanOrEqual(0);
      expect(s.p).toBeLessThanOrEqual(1);
    }
    expect(expectedCalibrationError(cal)).toBeLessThan(expectedCalibrationError(over));
  });

  it("HOSTILE REGRESSION: a non-monotone truth collapses to the intercept-only map, never a decreasing one", () => {
    // Flat-then-decreasing truth (g=0.5 below p=0.55, falling above): the joint fit
    // goes b<0 and the single-feature refit ALSO goes negative — pre-fix this
    // returned a strictly DECREASING "calibration" (a=-0.546). Post-fix it must
    // fall back to intercept-only. OBSERVED: a=0, b=0, c=-0.486013 (constant 0.380833).
    const rand = mulberry32(777);
    const nm: CalibrationSample[] = [];
    for (let i = 0; i < 1200; i++) {
      const p = 0.05 + 0.9 * ((i + 0.5) / 1200);
      const q = p < 0.55 ? 0.5 : Math.max(0.05, 0.5 - (p - 0.55) * 1.125);
      nm.push({ p, y: rand() < q ? 1 : 0 });
    }
    const beta = betaCalibration(nm)!;
    expect(beta).not.toBeNull();
    expect(beta.a).toBe(0);
    expect(beta.b).toBe(0);
    let prev = -1;
    for (let p = 0.02; p < 0.99; p += 0.01) {
      const v = beta.predict(p);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9); // monotone (constant)
      prev = v;
    }
  });

  it("HOSTILE REGRESSION: refuses (near-)separated data instead of returning a huge-coefficient step", () => {
    // Pre-fix this returned a=b=229.87 ("converged" saturation) and, with one
    // flipped outlier, coefficients of magnitude ~1e7 with no signal. Post-fix the
    // IRLS refuses via non-convergence + the MAX_COEF=50 saturation guard.
    const sep: CalibrationSample[] = [];
    for (let i = 0; i < 100; i++) {
      const p = 0.05 + 0.9 * (i / 99);
      sep.push({ p, y: p > 0.5 ? 1 : 0 });
    }
    expect(betaCalibration(sep)).toBeNull();
    const nearSep = sep.map((s, i) => (i === 0 ? { p: s.p, y: 1 as const } : s));
    expect(betaCalibration(nearSep)).toBeNull();
  });

  it("returns null on too-few or single-class samples", () => {
    expect(betaCalibration([{ p: 0.5, y: 1 }, { p: 0.6, y: 0 }])).toBeNull(); // n<3
    expect(betaCalibration([{ p: 0.2, y: 0 }, { p: 0.5, y: 0 }, { p: 0.8, y: 0 }])).toBeNull(); // single class
  });
});

describe("equalMassEce (order-invariant, tie-pooled)", () => {
  it("HOSTILE REGRESSION: identical multisets score identically regardless of input order", () => {
    // Pre-fix a stable sort leaked input order through tie groups: the block
    // ordering scored 0.5 while the interleaved ordering of the SAME multiset
    // scored 0. Post-fix both score 0 — which is also the CORRECT value (all
    // forecasts 0.5, half win: perfectly calibrated). OBSERVED: 0 and 0.
    const block: CalibrationSample[] = [
      ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 1 as const })),
      ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 0 as const })),
    ];
    const inter: CalibrationSample[] = [];
    for (let i = 0; i < 10; i++) inter.push({ p: 0.5, y: 1 }, { p: 0.5, y: 0 });
    expect(equalMassEce(block, 2)).toBe(0);
    expect(equalMassEce(inter, 2)).toBe(0);
    expect(equalMassEce(block, 10)).toBe(equalMassEce(inter, 10));
  });

  it("collapses to the overall mean gap at tiny n instead of singleton bins", () => {
    // 4 samples at p=0.5, 2 wins: a sharp, perfectly calibrated forecaster.
    // Pre-fix singleton bins scored this 0.5 (maximal punishment); post-fix the
    // MIN_PER_BIN floor collapses to k=1 → |0.5 − 0.5| = 0. OBSERVED: 0.
    expect(
      equalMassEce([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }, { p: 0.5, y: 1 }, { p: 0.5, y: 0 }], 10),
    ).toBe(0);
  });

  it("still measures real miscalibration", () => {
    // 10 samples all forecast 0.9, all lose: |0.9 − 0| = 0.9.
    const bad: CalibrationSample[] = Array.from({ length: 10 }, () => ({ p: 0.9, y: 0 as const }));
    expect(equalMassEce(bad, 10)).toBeCloseTo(0.9, 6);
  });

  it("is 0 on an empty sample", () => {
    expect(equalMassEce([], 10)).toBe(0);
  });
});

describe("selectCalibrator (cross-validated, out-of-sample, noise-calibrated bar)", () => {
  it("picks the parametric map over overfit isotonic on a smooth miscalibration", () => {
    // OBSERVED (n=800, shrink=0.5, seed 12345 data, fold seed 7, post tie-pooling):
    //   rawOofEce=0.1  scores: isotonic=0.065139, platt=0.021021, beta=0.029394
    //   nullGainMargin=0.015326 → gain 0.079 clears it → recommended=platt.
    // The point of the module: isotonic OVERFITS out-of-sample (0.065) where the
    // parametric Platt (0.021) generalizes — so Platt is chosen, not isotonic-by-fiat.
    const over = genOverconfident(800, 0.5, 12345);
    const sel = selectCalibrator(over, { seed: 7 })!;
    expect(sel).not.toBeNull();
    expect(sel.recommended).toBe("platt");
    expect(sel.rawOofEce).toBeGreaterThan(0.08); // raw is badly miscalibrated
    const iso = sel.scores.find((s) => s.method === "isotonic")!.oofEce!;
    const platt = sel.scores.find((s) => s.method === "platt")!.oofEce!;
    expect(platt).toBeLessThan(iso); // parametric generalizes better than non-parametric here
    expect(platt).toBeLessThan(sel.rawOofEce - sel.nullGainMargin); // beats raw BEYOND the noise bar
    expect(sel.model).not.toBeNull();
    expect(sel.model!.method).toBe("platt");
  });

  it("HOSTILE REGRESSION: rarely recommends a map on PERFECTLY calibrated data (the noise bar works)", () => {
    // Pre-fix (zero margin) the best family "won" on calibrated data 70-88% of the
    // time across n=40..200 — pure selection noise. Post-fix, the parametric-
    // bootstrap noise bar (90th pct of null gains) drops the false-recommendation
    // rate to its ~10% design level. OBSERVED (40 datasets each): n=40 → 1/40,
    // n=80 → 5/40, n=200 → 7/40. Assert < 15/40 (0.375): the observed worst 0.175
    // has SE ~ sqrt(.175*.825/40) ~ 0.06, so 0.375 is ~3.3 SE above it — no flake
    // on a correct bar, fails loudly if the bar regresses toward the old 70-88%.
    let worst = 0;
    for (const n of [40, 200]) {
      let falseRec = 0;
      for (let d = 0; d < 40; d++) {
        const cal = genCalibrated(n, 3000 + d);
        const s = selectCalibrator(cal, { seed: 7 });
        if (s && s.recommended !== "identity") falseRec += 1;
      }
      worst = Math.max(worst, falseRec);
    }
    expect(worst).toBeLessThan(15);
  }, 60_000);

  it("recommends identity when no family clears an explicit large margin", () => {
    const cal = genCalibrated(800, 999);
    const sel = selectCalibrator(cal, { seed: 7, minEceGain: 1 })!;
    expect(sel.recommended).toBe("identity");
    expect(sel.model).toBeNull();
  });

  it("is fully deterministic given a seed", () => {
    const over = genOverconfident(800, 0.5, 12345);
    const a = selectCalibrator(over, { seed: 7 })!;
    const b = selectCalibrator(over, { seed: 7 })!;
    expect(JSON.stringify(a.scores)).toBe(JSON.stringify(b.scores));
    expect(a.recommended).toBe(b.recommended);
    expect(a.nullGainMargin).toBe(b.nullGainMargin);
  });

  it("HOSTILE REGRESSION: refuses invalid folds instead of silently degrading", () => {
    // folds=0 made fold ids NaN (all families null, 'identity' dressed as measured);
    // fractional folds silently dropped samples from the family pools only.
    const cal = genCalibrated(100, 5);
    expect(selectCalibrator(cal, { folds: 0 })).toBeNull();
    expect(selectCalibrator(cal, { folds: 1 })).toBeNull();
    expect(selectCalibrator(cal, { folds: 2.5 as never })).toBeNull();
    expect(selectCalibrator(cal, { nullSims: -1 })).toBeNull();
  });

  it("returns null below the CV floor", () => {
    expect(selectCalibrator([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }], {})).toBeNull();
  });
});
