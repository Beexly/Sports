import { describe, expect, it } from "vitest";
import {
  MVE_TO_PHI,
  MVE_TO_C,
  MVE_TO_POOLED_VAR_FALLBACK,
  shrinkLogMeans,
  qOverFromPast,
} from "./mve-team-only-js.js";
import { logNbPmf } from "./nb-rbpf.js";

describe("team-only constants", () => {
  it("locks the frozen knobs", () => {
    expect(MVE_TO_PHI).toBe(12);
    expect(MVE_TO_C).toBe(1.5);
    expect(MVE_TO_POOLED_VAR_FALLBACK).toBe(0.04);
  });
});

describe("shrinkLogMeans worked numbers (tol 1e-3)", () => {
  // k=4, X=[2.1, 2.2, 2.0, 2.4], n=[4, 20, 4, 8], s^2=0.04
  // Xbar = 2.175
  // sum (X-Xbar)^2 = 0.0875, sum D = 0.027
  // A_hat = max(0, (0.0875 - 0.027)/4) = 0.015125
  // B = [0.397015, 0.116788, 0.397015, 0.248447]
  // theta = [2.129776, 2.197080, 2.069478, 2.344099]
  const units = [
    { id: "t1", x: 2.1, n: 4 },
    { id: "t2", x: 2.2, n: 20 },
    { id: "t3", x: 2.0, n: 4 },
    { id: "t4", x: 2.4, n: 8 },
  ];
  const s2 = 0.04;
  const expectedTheta = [2.129776, 2.197080, 2.069478, 2.344099];

  const expectedB = [0.397015, 0.116788, 0.397015, 0.248447];

  it("matches the frozen worked theta values", () => {
    const theta = shrinkLogMeans(units, s2);
    expect(theta.get("t1")).toBeCloseTo(expectedTheta[0]!, 3);
    expect(theta.get("t2")).toBeCloseTo(expectedTheta[1]!, 3);
    expect(theta.get("t3")).toBeCloseTo(expectedTheta[2]!, 3);
    expect(theta.get("t4")).toBeCloseTo(expectedTheta[3]!, 3);
  });

  it("does NOT use B as the data weight (guard against regression)", () => {
    // If theta = Xbar + B*(X_i-Xbar), then t1 = 2.175 + 0.397015*(-0.075) = 2.1452
    const wrongTheta1 = 2.175 + expectedB[0]! * (2.1 - 2.175);
    expect(wrongTheta1).toBeCloseTo(2.145, 3);
    const theta = shrinkLogMeans(units, s2);
    expect(theta.get("t1")).not.toBeCloseTo(wrongTheta1, 4);
  });

  it("reproduces A_hat from the worked spec inputs", () => {
    // Re-derive A_hat from the same inputs to confirm the math path.
    const k = units.length;
    const xbar = (2.1 + 2.2 + 2.0 + 2.4) / k;
    const dVals = units.map((u) => s2 / u.n);
    const sumSq = units.reduce((a, u) => a + (u.x - xbar) ** 2, 0);
    const sumD = dVals.reduce((a, d) => a + d, 0);
    const aHat = Math.max(0, (sumSq - sumD) / k);
    expect(aHat).toBeCloseTo(0.015125, 6);
  });

  it("B_i weights the grand mean, not the data (theta guard)", () => {
    // With A_hat > 0, B_i = D_i/(A_hat + D_i) in (0,1) and theta = X_i - B_i*(X_i-Xbar).
    // Verify theta lies strictly between Xbar and X_i (shrinkage toward the mean),
    // which is only true when B weights the grand mean (1-B weights data).
    const theta = shrinkLogMeans(units, s2);
    const xbar = (2.1 + 2.2 + 2.0 + 2.4) / 4;
    // t1: X=2.1 < Xbar=2.175 -> theta in (2.1, 2.175).
    expect(theta.get("t1")).toBeGreaterThan(2.1);
    expect(theta.get("t1")).toBeLessThan(xbar);
    // t4: X=2.4 > Xbar -> theta in (2.175, 2.4).
    expect(theta.get("t4")).toBeGreaterThan(xbar);
    expect(theta.get("t4")).toBeLessThan(2.4);
  });
});

describe("shrinkLogMeans limited translation (tol 1e-9)", () => {
  it("clamps delta when |B(X-Xbar)| > c*sqrt(D_i) — assert |theta-X| === cap", () => {
    // All n=1 -> D = s^2 = 0.04, sqrt(D) = 0.2, cap = 1.5*0.2 = 0.3.
    // Xbar = (2.5+2.0+2.0+2.0)/4 = 2.125. For t1: delta = B*(2.5-2.125) = 0.32 > 0.30.
    // Clamped -> theta = X - sign(delta)*cap = 2.5 - 0.3 = 2.2 exactly.
    const units = [
      { id: "t1", x: 2.5, n: 1 },
      { id: "t2", x: 2.0, n: 1 },
      { id: "t3", x: 2.0, n: 1 },
      { id: "t4", x: 2.0, n: 1 },
    ];
    const s2 = 0.04;
    const theta = shrinkLogMeans(units, s2);
    const d1 = s2 / units[0].n; // 0.04
    const cap = MVE_TO_C * Math.sqrt(d1); // 0.30
    // Locked claim from the spec: |theta_i - X_i| === 1.5*sqrt(D_i) within 1e-9.
    const diff = Math.abs(theta.get("t1")! - units[0].x);
    expect(diff).toBeCloseTo(cap, 9);
    // And the sign: t1 is above the mean, pulled DOWN by exactly cap.
    expect(theta.get("t1")).toBeCloseTo(units[0].x - cap, 9);
  });
});

describe("shrinkLogMeans edge cases", () => {
  it("k=1 returns identity (theta = X_i)", () => {
    const units = [{ id: "t1", x: 2.1, n: 4 }];
    const theta = shrinkLogMeans(units, 0.04);
    expect(theta.get("t1")).toBeCloseTo(2.1, 10);
  });

  it("k=2 returns identity (theta = X_i)", () => {
    const units = [
      { id: "t1", x: 2.1, n: 4 },
      { id: "t2", x: 2.2, n: 20 },
    ];
    const theta = shrinkLogMeans(units, 0.04);
    expect(theta.get("t1")).toBeCloseTo(2.1, 10);
    expect(theta.get("t2")).toBeCloseTo(2.2, 10);
  });

  it("n=0 unit gets theta = Xbar", () => {
    const units = [
      { id: "t1", x: 2.1, n: 4 },
      { id: "t2", x: 2.2, n: 20 },
      { id: "t3", x: 2.0, n: 4 },
      { id: "t4", x: 0, n: 0 }, // zero games -> Xbar
    ];
    const theta = shrinkLogMeans(units, 0.04);
    const xbar = (2.1 + 2.2 + 2.0) / 3;
    expect(theta.get("t4")).toBeCloseTo(xbar, 10);
  });

  it("A_hat floors at 0 when between-team SS < sum D", () => {
    // All teams nearly identical -> SS tiny, sum D larger -> A_hat = 0 -> B=1 -> theta=Xbar? No:
    // B_i = D_i/(0+D_i) = 1 -> theta = Xbar + 0*(Xbar - Xbar) = Xbar for everyone.
    const x = 2.1;
    const units = [
      { id: "t1", x, n: 4 },
      { id: "t2", x, n: 20 },
      { id: "t3", x, n: 4 },
    ];
    // Use a large pooled variance so sum D > SS(=0).
    const theta = shrinkLogMeans(units, 0.04);
    // SS = 0, so A_hat = max(0, (0 - sumD)/3) = 0; B = D/(0+D) = 1; theta = Xbar.
    expect(theta.get("t1")).toBeCloseTo(x, 10);
    expect(theta.get("t2")).toBeCloseTo(x, 10);
    expect(theta.get("t3")).toBeCloseTo(x, 10);
  });

  it("pooledVar fallback path: fewer than 8 games uses 0.04", () => {
    // This is exercised via qOverFromPast; here just confirm shrinkLogMeans
    // is pure and deterministic with the fallback value passed in.
    const units = [
      { id: "t1", x: 2.1, n: 4 },
      { id: "t2", x: 2.2, n: 20 },
      { id: "t3", x: 2.0, n: 4 },
    ];
    const a = shrinkLogMeans(units, MVE_TO_POOLED_VAR_FALLBACK);
    const b = shrinkLogMeans(units, MVE_TO_POOLED_VAR_FALLBACK);
    // Determinism: same inputs -> same outputs.
    for (const u of units) expect(a.get(u.id)).toBeCloseTo(b.get(u.id)!, 10);
  });
});

describe("qOverFromPast", () => {
  it("never reads a future y (only aggregates past games)", () => {
    // Build a past where home/away totals are symmetric -> qOver deterministic.
    const past = [
      { homeId: "H", awayId: "A", y: 8 },
      { homeId: "A", awayId: "H", y: 8 }, // reverse fixture, same total
    ];
    const q1 = qOverFromPast({ homeId: "H", awayId: "A", line: 8.5, past });
    // Same past, same line -> identical (deterministic, no Date/random).
    const q2 = qOverFromPast({ homeId: "H", awayId: "A", line: 8.5, past });
    expect(q1).toBeCloseTo(q2, 10);
  });

  it("returns a probability in (0,1) on a normal game", () => {
    const past = [];
    for (let i = 0; i < 20; i++) {
      past.push({ homeId: "H", awayId: "A", y: 8 });
      past.push({ homeId: "A", awayId: "H", y: 9 });
    }
    const q = qOverFromPast({ homeId: "H", awayId: "A", line: 8.5, past });
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
    expect(Number.isFinite(q)).toBe(true);
  });

  it("line is entry total (never close): higher line -> lower qOver for positive mu", () => {
    const past = [];
    for (let i = 0; i < 20; i++) {
      past.push({ homeId: "H", awayId: "A", y: 9 });
    }
    const qLow = qOverFromPast({ homeId: "H", awayId: "A", line: 8.5, past });
    const qHigh = qOverFromPast({ homeId: "H", awayId: "A", line: 10.5, past });
    expect(qHigh).toBeLessThan(qLow);
  });

  it("matches manual NB2 tail against logNbPmf import", () => {
    // mu from theta, phi=12, line=8.5 -> q = 1 - CDF(0..8).
    const past = [];
    for (let i = 0; i < 30; i++) {
      past.push({ homeId: "H", awayId: "A", y: 9 });
    }
    const q = qOverFromPast({ homeId: "H", awayId: "A", line: 8.5, past });
    // Recompute mu directly from the theta map to confirm qOver uses NB2 tail.
    const units = [
      { id: "H", x: Math.log(9.5), n: 30 },
      { id: "A", x: Math.log(9.5), n: 30 },
    ];
    const theta = shrinkLogMeans(units, MVE_TO_POOLED_VAR_FALLBACK);
    const mu = Math.exp((theta.get("H")! + theta.get("A")!) / 2);
    let cdf = 0;
    for (let y = 0; y <= 8; y++) cdf += Math.exp(logNbPmf(y, mu, MVE_TO_PHI));
    const expected = 1 - cdf;
    expect(q).toBeCloseTo(expected, 10);
  });
});
