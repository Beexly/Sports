import { describe, it, expect } from "vitest";
import {
  N_ATOMS,
  atomSupport,
  projectBellman,
  categoricalCrossEntropy,
  distMean,
  distStd,
  cvar,
  greedyStakeIndex,
} from "./1707-06887v1-distributional-slate-rl.js";

const VMIN = -50;
const VMAX = 50;

function pointMass(value: number, n = N_ATOMS): number[] {
  const z = atomSupport(VMIN, VMAX, n);
  let best = 0;
  let bd = Infinity;
  z.forEach((zi, i) => {
    const d = Math.abs(zi - value);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return z.map((_, i) => (i === best ? 1 : 0));
}

describe("projectBellman", () => {
  it("preserves total probability mass", () => {
    const p = pointMass(10);
    const proj = projectBellman(p, 5, 0.9, VMIN, VMAX);
    expect(proj.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
  });
  it("shifts a point mass by the reward when gamma=0", () => {
    const proj = projectBellman(pointMass(0), 10, 0, VMIN, VMAX);
    expect(distMean(proj, VMIN, VMAX)).toBeCloseTo(10, 6);
  });
  it("contracts toward the reward under discounting", () => {
    const proj = projectBellman(pointMass(20), 0, 0.5, VMIN, VMAX);
    expect(distMean(proj, VMIN, VMAX)).toBeCloseTo(10, 6);
  });
});

describe("risk statistics", () => {
  it("CVaR is below the mean for a risky distribution", () => {
    // bimodal: 50% at -40, 50% at +40
    const z = atomSupport(VMIN, VMAX);
    const p: number[] = z.map((zi) => (Math.abs(Math.abs(zi) - 40) < 1.01 ? 0.5 : 0));
    const s = p.reduce((a, b) => a + b, 0);
    const pn = p.map((x) => x / s);
    expect(cvar(pn, VMIN, VMAX, 0.2)).toBeLessThan(distMean(pn, VMIN, VMAX));
    expect(distStd(pn, VMIN, VMAX)).toBeGreaterThan(30);
  });
  it("cross-entropy is minimized at the target itself", () => {
    const t = pointMass(5);
    const q = pointMass(-5);
    expect(categoricalCrossEntropy(t, t)).toBeLessThan(categoricalCrossEntropy(t, q));
    expect(categoricalCrossEntropy(t, t)).toBeGreaterThanOrEqual(0);
  });
});

describe("greedyStakeIndex", () => {
  it("picks the higher risk-adjusted stake bucket", () => {
    const safe = pointMass(2); // certain +2u
    const risky = (() => {
      const z = atomSupport(VMIN, VMAX);
      const p: number[] = z.map((zi) => (Math.abs(Math.abs(zi) - 30) < 1.01 ? 0.5 : 0));
      const s = p.reduce((a, b) => a + b, 0);
      return p.map((x) => x / s);
    })(); // mean 0, huge variance
    expect(greedyStakeIndex([risky, safe], VMIN, VMAX, "cvar")).toBe(1);
    expect(greedyStakeIndex([risky, safe], VMIN, VMAX, "mean-minus-std", 1)).toBe(1);
  });
});
