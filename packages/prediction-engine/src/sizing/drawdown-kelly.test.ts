/**
 * Drawdown-constrained Bayesian Kelly staking — tests (arXiv 2010.15779v2).
 *
 * ACCEPTANCE GATE: the posterior learns toward the true win rate; the
 * Kelly fraction is positive with edge and zero without; uncertainty
 * shrinkage tightens as evidence accumulates; the drawdown cap and the
 * new-category reduction engage; maxDrawdown is correct; degenerate
 * inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  kellyStake,
  maxDrawdown,
  newCategory,
  posteriorMean,
  posteriorVar,
  updatePosterior,
} from "./drawdown-kelly";

describe("posterior learning", () => {
  it("learns toward the true win rate and tightens with evidence", () => {
    let post = newCategory("spread:nfl");
    expect(posteriorMean(post)).toBeCloseTo(0.5, 12);
    // 70 wins out of 100.
    for (let i = 0; i < 100; i++) post = updatePosterior(post, i < 70);
    expect(posteriorMean(post)).toBeCloseTo(71 / 102, 6);
    const varEarly = posteriorVar(newCategory("x"));
    const varLate = posteriorVar(post);
    expect(varLate).toBeLessThan(varEarly);
    expect(post.n).toBe(100);
  });
});

describe("kellyStake", () => {
  const base = { bankroll: 10000, peakBankroll: 10000 };

  it("stakes positive with edge, zero without", () => {
    let edge = newCategory("ml:nfl");
    for (let i = 0; i < 200; i++) edge = updatePosterior(edge, i < 120); // 60% win rate
    const q = kellyStake(edge, 2.0, { ...base, warmupPicks: 0 });
    expect(q.frac).toBeGreaterThan(0);
    expect(q.drawdownScaled).toBe(false);
    let noEdge = newCategory("ml:nfl");
    for (let i = 0; i < 200; i++) noEdge = updatePosterior(noEdge, i < 100); // 50% at fair odds
    const q0 = kellyStake(noEdge, 2.0, { ...base, warmupPicks: 0 });
    expect(q0.frac).toBe(0);
  });

  it("engages the drawdown cap past q", () => {
    let post = newCategory("spread:nfl");
    for (let i = 0; i < 200; i++) post = updatePosterior(post, i < 120);
    const q = kellyStake(post, 2.0, {
      bankroll: 6000,
      peakBankroll: 10000,
      drawdownQ: 0.3,
      minStakeFrac: 0.001,
      warmupPicks: 0,
    });
    expect(q.drawdownScaled).toBe(true);
    expect(q.frac).toBeCloseTo(0.001, 12);
  });

  it("reduces stakes for new categories until the warmup fills", () => {
    let post = newCategory("total:nfl");
    for (let i = 0; i < 200; i++) post = updatePosterior(post, i < 120);
    let freshPost = newCategory("total:ncaaf");
    for (let i = 0; i < 5; i++) freshPost = updatePosterior(freshPost, true);
    const qWarm = kellyStake(post, 2.0, { ...base, warmupPicks: 0 });
    const qNew = kellyStake(freshPost, 2.0, { ...base, warmupPicks: 20, newCatFrac: 0.25 });
    expect(qNew.frac).toBeLessThan(qWarm.frac);
  });

  it("throws on degenerate input", () => {
    const post = newCategory("x");
    expect(() => kellyStake(post, 1.0, base)).toThrow();
    expect(() => kellyStake(post, 2.0, { bankroll: 0, peakBankroll: 100 })).toThrow();
  });
});

describe("maxDrawdown", () => {
  it("computes worst peak-to-trough decline", () => {
    expect(maxDrawdown([100, 120, 90, 110, 80])).toBeCloseTo(1 - 80 / 120, 12);
    expect(maxDrawdown([100, 110, 120])).toBe(0);
    expect(() => maxDrawdown([])).toThrow();
  });
});
