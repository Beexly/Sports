import { describe, expect, it } from "vitest";

import {
  BETAS,
  ENABLED,
  N_STATES,
  STAKE_TIERS,
  cvarCost,
  distributionalEvaluation,
  restartSpread,
  riskSensitiveObjective,
  solveRiskSensitiveMDP,
  stateIndex,
} from "@/lib/calibration/2210-08740v1-risk-sensitive-staking-mdp";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("risk-sensitive staking MDP", () => {
  it("is disabled by default; 20 states x 5 tiers x 3 betas", () => {
    expect(ENABLED).toBe(false);
    expect(N_STATES).toBe(20);
    expect(stateIndex(9, 1)).toBe(19);
    expect(STAKE_TIERS).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(BETAS).toEqual([0.1, 0.22, 0.4]);
  });

  it("cvarCost takes the worst quartile of costs", () => {
    expect(cvarCost([1, 1, 1, -10])).toBe(10); // worst 25% = the -10 profit
    expect(cvarCost([2, 2, 2, 2])).toBe(-2);
  });

  it("riskSensitiveObjective penalizes tail risk beyond the mean", () => {
    const safe = [1, 1, 1, 1, 1, 1, 1, 1];
    const risky = [2, 2, 2, 2, 2, 2, 2, -6]; // same mean, worse tail
    expect(riskSensitiveObjective(risky, 0.22)).toBeGreaterThan(
      riskSensitiveObjective(safe, 0.22),
    );
  });

  it("solver returns three valid policy tables", () => {
    const rand = mulberry(3);
    const history = [];
    for (let i = 0; i < 800; i++) {
      const b = Math.floor(rand() * 10);
      const e = (rand() < 0.5 ? 0 : 1) as 0 | 1;
      const t = Math.floor(rand() * 5);
      // higher tiers have higher mean but much worse tails
      const profit = (rand() - 0.45) * 2 * STAKE_TIERS[t] - (rand() < 0.05 ? 8 * STAKE_TIERS[t] : 0);
      history.push({ bankrollBucket: b, edgeBucket: e, tierIdx: t, profit });
    }
    const { tables, betas } = solveRiskSensitiveMDP(history, 5);
    expect(tables.length).toBe(3);
    expect(betas).toEqual(BETAS);
    for (const table of tables) {
      expect(table.length).toBe(N_STATES);
      expect(table.every((t) => t >= 0 && t < 5)).toBe(true);
    }
    // conservative beta should not stake more aggressively than aggressive beta on average
    const avg = (tbl: number[]) => tbl.reduce((a, b) => a + b, 0) / tbl.length;
    expect(avg(tables[0])).toBeLessThanOrEqual(avg(tables[2]) + 1e-9);
  });

  it("distributional evaluation exposes success sacrifice", () => {
    const ev = distributionalEvaluation([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    expect(ev.p95Profit).toBeGreaterThan(ev.mean);
    expect(ev.successSacrifice).toBeGreaterThan(0);
  });

  it("restartSpread measures landscape stability", () => {
    expect(restartSpread([1, 1, 1])).toBe(0);
    expect(restartSpread([1, 1.5])).toBeCloseTo(0.4, 10);
  });
});
