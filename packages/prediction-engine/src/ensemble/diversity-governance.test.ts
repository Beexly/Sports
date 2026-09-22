/**
 * Ensemble-diversity governance — tests (arXiv 2007.15508).
 *
 * ACCEPTANCE GATE: alpha_proxy detects herding vs independence; the rot
 * test flags a decaying delta^2 series; the registry audit catches
 * violations; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  alphaProxy,
  auditIndependenceRegistry,
  betaProxy,
  diversityRotTest,
  logOddsVarianceSeries,
} from "./diversity-governance";

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

describe("alphaProxy", () => {
  it("is high when models move together, low when independent", () => {
    const rand = mulberry32(71);
    const T = 60;
    const common = Array.from({ length: T }, () => rand() - 0.5);
    const herd = [0, 1, 2].map(() => common.map((c) => c + (rand() - 0.5) * 0.05));
    const indep = [0, 1, 2].map(() => Array.from({ length: T }, () => rand() - 0.5));
    expect(alphaProxy(herd)).toBeGreaterThan(0.9);
    expect(Math.abs(alphaProxy(indep))).toBeLessThan(0.35);
  });

  it("throws with fewer than 2 models", () => {
    expect(() => alphaProxy([[0.1, 0.2]])).toThrow();
  });
});

describe("betaProxy", () => {
  it("a healthy model tracks its signal more than the ensemble mean", () => {
    const rand = mulberry32(73);
    const T = 80;
    const signal = Array.from({ length: T }, () => rand());
    const model = signal.map((s) => Math.min(0.99, Math.max(0.01, s + (rand() - 0.5) * 0.1)));
    const ensemble = signal.map((s) => Math.min(0.99, Math.max(0.01, 1 - s + (rand() - 0.5) * 0.1)));
    const b = betaProxy(model, signal, ensemble);
    expect(b.withSignal).toBeGreaterThan(0.9);
    expect(b.withEnsemble).toBeLessThan(0);
  });
});

describe("logOddsVarianceSeries + diversityRotTest", () => {
  it("flags rot on a decaying delta^2 series, not on a stable one", () => {
    const rand = mulberry32(75);
    const T = 40;
    // Decaying cross-model variance: models converge onto the same data.
    const decaying: number[][] = [];
    for (let m = 0; m < 4; m++) {
      decaying.push(
        Array.from({ length: T }, (_, t) => {
          const p = 0.5 + (rand() - 0.5) * 0.5 * Math.exp(-t / 12) + m * 0.001;
          return Math.min(0.99, Math.max(0.01, p));
        }),
      );
    }
    const d2decay = logOddsVarianceSeries(decaying);
    const rot = diversityRotTest(d2decay);
    expect(rot.slope).toBeLessThan(0);
    expect(rot.rot).toBe(true);
    // Stable variance: no rot.
    const stable: number[][] = [];
    for (let m = 0; m < 4; m++) {
      stable.push(Array.from({ length: T }, () => Math.min(0.99, Math.max(0.01, rand()))));
    }
    const d2stable = logOddsVarianceSeries(stable);
    expect(diversityRotTest(d2stable).rot).toBe(false);
  });

  it("throws on degenerate input", () => {
    expect(() => logOddsVarianceSeries([[0.5, 0.6]])).toThrow();
    expect(() => diversityRotTest([0.1, 0.2, 0.3])).toThrow();
  });
});

describe("auditIndependenceRegistry", () => {
  it("catches models with no unshared family or training on ensemble output", () => {
    const violations = auditIndependenceRegistry([
      { model: "a", unsharedFamilies: ["tracking"], trainsOnEnsembleOutput: false },
      { model: "b", unsharedFamilies: [], trainsOnEnsembleOutput: false },
      { model: "c", unsharedFamilies: ["weather"], trainsOnEnsembleOutput: true },
    ]);
    expect(violations.map((v) => v.model).sort()).toEqual(["b", "c"]);
    expect(
      auditIndependenceRegistry([
        { model: "a", unsharedFamilies: ["tracking"], trainsOnEnsembleOutput: false },
      ]),
    ).toEqual([]);
  });
});
