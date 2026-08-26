import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  fieldPercentile,
  randomFeasibleLineups,
  settleLineupFpts,
} from "./percentile-benchmark";
import { DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";

const mk = (id: string, pos: DfsPos, salary: number): DfsPlayer => ({
  id, name: `Player ${id}`, pos, team: "AAA", opp: "BBB", salary, proj: 10, floor: 4, ceiling: 18, own: 0.1,
});

describe("fieldPercentile", () => {
  it("computes a straightforward percentile rank", () => {
    const field = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = fieldPercentile(55, field, { seed: 1, resamples: 500 });
    // 5 values strictly below 55 (10..50), none equal -> 50th percentile
    expect(result.percentile).toBeCloseTo(50, 6);
    expect(result.n).toBe(10);
  });

  it("returns 100 when the lineup beats the entire field", () => {
    const field = [1, 2, 3, 4, 5];
    const result = fieldPercentile(1000, field, { seed: 1, resamples: 200 });
    expect(result.percentile).toBe(100);
  });

  it("returns 0 when the lineup loses to the entire field", () => {
    const field = [100, 200, 300];
    const result = fieldPercentile(1, field, { seed: 1, resamples: 200 });
    expect(result.percentile).toBe(0);
  });

  it("splits ties evenly (mean-rank convention)", () => {
    const field = [10, 20, 20, 20, 30];
    // value 20: 1 below, 3 equal, n=5 -> 100*(1 + 1.5)/5 = 50
    const result = fieldPercentile(20, field, { seed: 1, resamples: 200 });
    expect(result.percentile).toBeCloseTo(50, 6);
  });

  it("produces a well-ordered CI containing the point estimate direction sanely", () => {
    const field = Array.from({ length: 200 }, (_, i) => i);
    const result = fieldPercentile(100, field, { seed: 7, resamples: 2000 });
    expect(result.ci95[0]).toBeLessThanOrEqual(result.ci95[1]);
    expect(result.ci95[0]).toBeGreaterThanOrEqual(0);
    expect(result.ci95[1]).toBeLessThanOrEqual(100);
  });

  it("is deterministic for a fixed seed", () => {
    const field = [12, 45, 33, 78, 21, 90, 5, 66];
    const a = fieldPercentile(40, field, { seed: 42, resamples: 500 });
    const b = fieldPercentile(40, field, { seed: 42, resamples: 500 });
    expect(a).toEqual(b);
  });

  it("throws on an empty field", () => {
    expect(() => fieldPercentile(50, [], { seed: 1 })).toThrow(RangeError);
  });

  it("throws on a non-positive or non-integer resamples", () => {
    expect(() => fieldPercentile(50, [1, 2], { seed: 1, resamples: 0 })).toThrow(RangeError);
    expect(() => fieldPercentile(50, [1, 2], { seed: 1, resamples: 1.5 })).toThrow(RangeError);
  });
});

describe("randomFeasibleLineups", () => {
  const FLEX_OK = new Set(["RB", "WR", "TE"]);
  function slotsValid(lu: readonly { pos: string }[]): boolean {
    return DFS_SLOTS.every((slot, i) => (slot === ("FLEX" as string) ? FLEX_OK.has(lu[i]!.pos) : lu[i]!.pos === slot));
  }

  // Every player priced identically at 5000: any complete 9-slot lineup sums
  // to exactly 45000 (== 0.9 * SALARY_CAP), so feasibility is deterministic —
  // no flakiness or slow retries needed to exercise the core logic.
  const FLAT_POOL: DfsPlayer[] = [
    mk("q1", "QB", 5000), mk("q2", "QB", 5000),
    mk("r1", "RB", 5000), mk("r2", "RB", 5000), mk("r3", "RB", 5000),
    mk("w1", "WR", 5000), mk("w2", "WR", 5000), mk("w3", "WR", 5000), mk("w4", "WR", 5000),
    mk("t1", "TE", 5000), mk("t2", "TE", 5000),
    mk("d1", "DST", 5000), mk("d2", "DST", 5000),
  ];

  it("generates the requested count of roster-legal, cap-respecting lineups", () => {
    const result = randomFeasibleLineups(FLAT_POOL, { count: 10, seed: 1 });
    expect(result.partial).toBe(false);
    expect(result.lineups).toHaveLength(10);
    for (const lu of result.lineups) {
      expect(lu).toHaveLength(DFS_SLOTS.length);
      expect(slotsValid(lu)).toBe(true);
      expect(new Set(lu.map((p) => p.id)).size).toBe(lu.length); // no duplicate players
      const salary = lu.reduce((s, p) => s + p.salary, 0);
      expect(salary).toBe(45000);
      expect(salary).toBeGreaterThanOrEqual(0.9 * SALARY_CAP);
      expect(salary).toBeLessThanOrEqual(SALARY_CAP);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = randomFeasibleLineups(FLAT_POOL, { count: 5, seed: 99 });
    const b = randomFeasibleLineups(FLAT_POOL, { count: 5, seed: 99 });
    expect(a.lineups.map((lu) => lu.map((p) => p.id))).toEqual(b.lineups.map((lu) => lu.map((p) => p.id)));
  });

  it("draws from every eligible candidate over enough lineups, not just one", () => {
    // Two equally-priced QBs; over 20 draws both should appear at least once
    // (independent p=0.5 each draw; chance of a false failure ~2e-6).
    const result = randomFeasibleLineups(FLAT_POOL, { count: 20, seed: 3 });
    const qbIds = new Set(result.lineups.map((lu) => lu.find((p) => p.pos === "QB")!.id));
    expect(qbIds.has("q1")).toBe(true);
    expect(qbIds.has("q2")).toBe(true);
  });

  it("throws when a required position has zero eligible candidates", () => {
    const noDst = FLAT_POOL.filter((p) => p.pos !== "DST");
    expect(() => randomFeasibleLineups(noDst, { count: 1, seed: 1 })).toThrow(RangeError);
  });

  it("reports partial when the salary floor is unreachable within the attempt budget", () => {
    const result = randomFeasibleLineups(FLAT_POOL, {
      count: 5,
      seed: 1,
      minSalary: 45001, // every lineup sums to exactly 45000 -> always infeasible
      maxAttemptsPerLineup: 3,
    });
    expect(result.partial).toBe(true);
    expect(result.lineups).toHaveLength(0);
    expect(result.requested).toBe(5);
  });

  it("throws on a negative or non-integer count", () => {
    expect(() => randomFeasibleLineups(FLAT_POOL, { count: -1, seed: 1 })).toThrow(RangeError);
    expect(() => randomFeasibleLineups(FLAT_POOL, { count: 1.5, seed: 1 })).toThrow(RangeError);
  });

  it("contains no Math.random anywhere — the module is fully deterministic", () => {
    const src = readFileSync(join(__dirname, "percentile-benchmark.ts"), "utf8");
    expect(src).not.toMatch(/Math\.random/);
  });
});

describe("settleLineupFpts", () => {
  it("sums actual FPTS for every player in the lineup", () => {
    const lineup = [mk("a", "QB", 5000), mk("b", "RB", 5000), mk("c", "WR", 5000)];
    const actuals = new Map([["a", 20.4], ["b", 8.1], ["c", 15.0]]);
    expect(settleLineupFpts(lineup, actuals)).toBeCloseTo(43.5, 6);
  });

  it("throws when a player is missing from the actuals map (a scratch, not a silent zero)", () => {
    const lineup = [mk("a", "QB", 5000), mk("b", "RB", 5000)];
    const actuals = new Map([["a", 20.4]]);
    expect(() => settleLineupFpts(lineup, actuals)).toThrow(RangeError);
  });
});
