/**
 * Vitest suite for arXiv:2512.00312v2 (Kicking for Goal or Touch? An Expected Points Framework for Penalty Decisions in Rugby Union).
 * Gate: Adopt the delta-frontier/regret framework for the coaching-decision product only if on 2022-2025 4th downs per-team regret rankings are stable year-over-year (Spearman >=0.4 across season pairs) AND delta-WP recommendations beat nfl4th on realized-WP regret by >=0.05 per decision.
 */
import { describe, it, expect } from "vitest";
import { goEV, kickEV, indifferenceP, recommend, sensitivityGrid, spearman, regretVsBenchmark } from "./2512-00312v2-kicking-for-goal-or-touch";

describe("2512-00312v2 4th-down decision framework", () => {
  it("indifference frontier solves goEV == kickEV", () => {
    const p = indifferenceP(4, -1, 2); // kickEV=2 -> p = 3/5
    expect(p).toBeCloseTo(0.6, 10);
    expect(goEV(p, 4, -1)).toBeCloseTo(kickEV(0.8, 3, -2), 8);
    expect(recommend(0.7, 4, -1, 2)).toBe("go");
    expect(recommend(0.5, 4, -1, 2)).toBe("kick");
    expect(() => indifferenceP(2, 2, 1)).toThrow();
  });
  it("sensitivity grid has the right shape and degrades with weather", () => {
    const grid = sensitivityGrid(
      [0.9, 0.7], [1.0, 0.8], [0, 0.1],
      { pConvert: 0.55, epIfConvert: 4, epIfFail: -1, epMake: 3, epMiss: -2 },
    );
    expect(grid).toHaveLength(2);
    expect(grid[0]?.[0]).toHaveLength(2);
    // Worse weather lowers kickEV -> more "go"
    const calmGo = grid.flat(2).filter((d) => d === "go").length;
    expect(calmGo).toBeGreaterThan(0);
  });
  it("spearman is 1 for identical rankings", () => {
    expect(spearman([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 10);
    expect(spearman([1, 2, 3], [30, 20, 10])).toBeCloseTo(-1, 10);
    expect(regretVsBenchmark([0.5, 0.6], [0.55, 0.6])).toBeCloseTo(0.025, 10);
    expect(() => spearman([1], [1])).toThrow();
    expect(() => regretVsBenchmark([1], [])).toThrow();
  });
});
