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
    // OBSERVED (n=800, shrink=0.5, seed=12345): a=0.600795, b=0.422376, c=0.065154, in-sample ECE≈0.0211.
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

  it("returns null on too-few or single-class samples", () => {
    expect(betaCalibration([{ p: 0.5, y: 1 }, { p: 0.6, y: 0 }])).toBeNull(); // n<3
    expect(betaCalibration([{ p: 0.2, y: 0 }, { p: 0.5, y: 0 }, { p: 0.8, y: 0 }])).toBeNull(); // single class
  });
});

describe("equalMassEce", () => {
  it("computes the mass-weighted gap over equal-count bins", () => {
    // Two singleton bins: |0.2-0|·½ + |0.8-1|·½ = 0.1 + 0.1 = 0.2 (OBSERVED 0.2).
    expect(equalMassEce([{ p: 0.2, y: 0 }, { p: 0.8, y: 1 }], 2)).toBeCloseTo(0.2, 6);
  });
  it("is 0 on an empty sample", () => {
    expect(equalMassEce([], 10)).toBe(0);
  });
});

describe("selectCalibrator (cross-validated, out-of-sample)", () => {
  it("picks the parametric map over overfit isotonic on a smooth miscalibration", () => {
    // OBSERVED (n=800, shrink=0.5, seed 12345 data, fold seed 7):
    //   rawOofEce=0.1  scores: isotonic=0.0574, platt=0.021021, beta=0.029394  → recommended=platt.
    // The point of the module: isotonic OVERFITS out-of-sample (0.057) where the
    // parametric Platt (0.021) generalizes — so Platt is chosen, not isotonic-by-fiat.
    const over = genOverconfident(800, 0.5, 12345);
    const sel = selectCalibrator(over, { seed: 7 })!;
    expect(sel).not.toBeNull();
    expect(sel.recommended).toBe("platt");
    expect(sel.rawOofEce).toBeGreaterThan(0.08); // raw is badly miscalibrated
    const iso = sel.scores.find((s) => s.method === "isotonic")!.oofEce!;
    const platt = sel.scores.find((s) => s.method === "platt")!.oofEce!;
    expect(platt).toBeLessThan(iso); // parametric generalizes better than non-parametric here
    expect(platt).toBeLessThan(sel.rawOofEce); // and beats raw
    expect(sel.model).not.toBeNull();
    expect(sel.model!.method).toBe("platt");
  });

  it("reports raw ECE already-small on well-calibrated data", () => {
    // OBSERVED (n=800, seed 999 data, fold seed 7): rawOofEce=0.037 — already small.
    const cal = genCalibrated(800, 999);
    const sel = selectCalibrator(cal, { seed: 7 })!;
    expect(sel.rawOofEce).toBeLessThan(0.06);
  });

  it("recommends identity when no family clears the required ECE margin", () => {
    // With a large minEceGain, no marginal win counts → identity, model null.
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
    expect(a.rawOofEce).toBe(b.rawOofEce);
  });

  it("returns null below the CV floor", () => {
    expect(selectCalibrator([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }], {})).toBeNull();
  });
});
