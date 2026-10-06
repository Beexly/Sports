import { describe, it, expect } from "vitest";
import {
  fitCumulativeLogit,
  fitNonPO,
  predictProbs,
  selectStructure,
  checkStochasticOrdering,
} from "./1503-07642-ordinal-structure-select.js";

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

function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** Simulate PO data: single beta, K=4 classes. */
function simPO(n: number, seed: number) {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const beta = [1.2, -0.8];
  const T = [-0.5, 0.5, 1.5];
  for (let i = 0; i < n; i++) {
    const x = [randn(rand), randn(rand)];
    X.push(x);
    const eta = beta[0]! * x[0]! + beta[1]! * x[1]!;
    const u = rand();
    let cls = 3;
    for (let c = 0; c < 3; c++) {
      if (u < sig(T[c]! - eta)) {
        cls = c;
        break;
      }
    }
    y.push(cls);
  }
  return { X, y };
}

/** Simulate non-PO data: effect of x0 flips sign across cuts. */
function simNonPO(n: number, seed: number) {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const betas = [
    [1.5, 0.2],
    [0.2, 0.2],
    [-1.2, 0.2],
  ];
  const T = [-0.5, 0.5, 1.5];
  for (let i = 0; i < n; i++) {
    const x = [randn(rand), randn(rand)];
    X.push(x);
    const u = rand();
    let cls = 3;
    for (let c = 0; c < 3; c++) {
      const eta = betas[c]![0]! * x[0]! + betas[c]![1]! * x[1]!;
      if (u < sig(T[c]! - eta)) {
        cls = c;
        break;
      }
    }
    y.push(cls);
  }
  return { X, y };
}

describe("fitCumulativeLogit", () => {
  it("improves log-likelihood over the null and keeps thresholds ordered", () => {
    const { X, y } = simPO(300, 21);
    const fit = fitCumulativeLogit(X, y, 4);
    // null log-lik: uniform class probs
    const nullLL = -300 * Math.log(4);
    expect(fit.logLik).toBeGreaterThan(nullLL);
    for (let c = 1; c < fit.thresholds.length; c++) {
      expect(fit.thresholds[c]!).toBeGreaterThan(fit.thresholds[c - 1]!);
    }
  });
  it("predicted probabilities are valid and sum to 1", () => {
    const { X, y } = simPO(300, 22);
    const fit = fitCumulativeLogit(X, y, 4);
    for (const x of X.slice(0, 20)) {
      const p = predictProbs(fit, x);
      expect(p.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 8);
      expect(p.every((v) => v >= 0 && v <= 1)).toBe(true);
    }
  });
});

describe("selectStructure", () => {
  it("keeps PO when the DGP is proportional-odds", () => {
    const tr = simPO(400, 31);
    const te = simPO(400, 32);
    const choice = selectStructure(tr.X, tr.y, te.X, te.y, 4);
    expect(choice.chosen).toBe("PO");
  });
  it("selects nonPO when cut effects genuinely differ", () => {
    const tr = simNonPO(600, 41);
    const te = simNonPO(600, 42);
    const choice = selectStructure(tr.X, tr.y, te.X, te.y, 4);
    expect(choice.chosen).toBe("nonPO");
  });
});

describe("checkStochasticOrdering", () => {
  it("passes on fitted models over a covariate grid", () => {
    const { X, y } = simPO(300, 51);
    const fit = fitCumulativeLogit(X, y, 4);
    const grid: number[][] = [];
    for (let a = -2; a <= 2; a += 1) for (let b = -2; b <= 2; b += 1) grid.push([a, b]);
    expect(checkStochasticOrdering(fit, grid)).toBe(true);
    const npo = fitNonPO(X, y, 4);
    expect(checkStochasticOrdering(npo, grid)).toBe(true);
  });
});
