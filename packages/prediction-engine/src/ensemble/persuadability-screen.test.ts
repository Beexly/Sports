/**
 * Model-market persuadability screen — tests (arXiv 2008.05203).
 *
 * ACCEPTANCE GATE: beta ~ 1 for a market-parroting model, beta ~ 0 for an
 * orthogonal model; orthogonal weights punish the parrot; aggregation
 * weights sum to 1; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  logistic,
  logit,
  marketBeta,
  orthogonalWeights,
  persuadabilityAggregate,
} from "./persuadability-screen";

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

describe("marketBeta", () => {
  it("detects a market-parroting model (beta ~ 1) vs an orthogonal model (beta ~ 0)", () => {
    const rand = mulberry32(111);
    const n = 120;
    const market = Array.from({ length: n }, () => 0.25 + rand() * 0.5);
    const parrot = market.map((p) => logistic(logit(p) + (rand() - 0.5) * 0.05));
    const orthoSignal = Array.from({ length: n }, () => 0.25 + rand() * 0.5);
    const ortho = orthoSignal.map((p) => logistic(logit(p) + (rand() - 0.5) * 0.05));
    const bParrot = marketBeta(parrot, market);
    const bOrtho = marketBeta(ortho, market);
    expect(bParrot.beta).toBeGreaterThan(0.9);
    expect(bParrot.beta).toBeLessThan(1.1);
    expect(bParrot.r2).toBeGreaterThan(0.95);
    expect(Math.abs(bOrtho.beta)).toBeLessThan(0.3);
    // The parrot's variation is ~fully explained by the market: its
    // orthogonal share is near 0; the orthogonal model's is near 1.
    expect(bParrot.orthogonalShare).toBeLessThan(0.05);
    expect(bOrtho.orthogonalShare).toBeGreaterThan(0.9);
  });

  it("throws on degenerate input", () => {
    expect(() => marketBeta([0.5, 0.6], [0.5])).toThrow();
    expect(() => marketBeta([0.5, 0.6], [0.5, 0.6])).toThrow();
    expect(() => marketBeta([0.5, 0.6, 0.7], [0.5, 0.5, 0.5])).toThrow();
  });
});

describe("orthogonalWeights + persuadabilityAggregate", () => {
  it("downweights the market parrot in aggregation", () => {
    const rand = mulberry32(113);
    const n = 120;
    const market = Array.from({ length: n }, () => 0.25 + rand() * 0.5);
    const parrot = market.map((p) => logistic(logit(p) + (rand() - 0.5) * 0.05));
    const ortho = Array.from({ length: n }, () => 0.25 + rand() * 0.5);
    const betas = [marketBeta(parrot, market), marketBeta(ortho, market)];
    const w = orthogonalWeights(betas);
    expect(w.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 12);
    expect(w[1]).toBeGreaterThan(w[0] as number);
    // Tempering moves weights toward equality.
    const wt = orthogonalWeights(betas, 1);
    expect(Math.abs((wt[0] as number) - 0.5)).toBeLessThan(1e-12);
    // Aggregation is a weighted average inside (0, 1).
    const agg = persuadabilityAggregate([0.8, 0.4], betas);
    expect(agg).toBeGreaterThan(0.4);
    expect(agg).toBeLessThan(0.8);
    expect(() => orthogonalWeights([])).toThrow();
    expect(() => orthogonalWeights(betas, 2)).toThrow();
    expect(() => persuadabilityAggregate([0.5], betas)).toThrow();
  });
});
