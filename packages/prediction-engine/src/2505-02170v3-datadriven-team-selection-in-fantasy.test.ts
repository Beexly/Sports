/**
 * Vitest suite for arXiv:2505.02170v3 (Data-Driven Team Selection in Fantasy Premier League Using Integer Programming and Predictive Modeling Approach).
 * Gate: ADOPT the IP optimizer into the weekly DFS packet iff it beats the greedy baseline's realized score in ≥ 60% of 2022–2025 slates AND the weighted-average-vs-current-projection bake-off winner is documented with a ≥ 3% mean-score edge. Otherwise REJECT.
 */
import { describe, it, expect } from "vitest";
import { optimizeSquad, bakeOffWinRate, SquadPlayer } from "./2505-02170v3-datadriven-team-selection-in-fantasy";

describe("2505-02170v3 IP optimizer with stacking", () => {
  const players: SquadPlayer[] = [
    { id: "qb", salary: 90, proj: 12, stackWith: { wr1: 3 } },
    { id: "wr1", salary: 85, proj: 10, stackWith: {} },
    { id: "wr2", salary: 80, proj: 9.5, stackWith: {} },
    { id: "rb", salary: 95, proj: 11, stackWith: {} },
    { id: "te", salary: 60, proj: 7, stackWith: {} },
  ];
  it("picks the stacking pair when the bonus justifies it", () => {
    const sq = optimizeSquad(players, 3, 260);
    expect(sq).toHaveLength(3);
    expect(sq.reduce((s, p) => s + p.salary, 0)).toBeLessThanOrEqual(260);
    const ids = new Set(sq.map((p) => p.id));
    expect(ids.has("qb") && ids.has("wr1")).toBe(true); // 3-pt stack bonus wins
    expect(() => optimizeSquad(players, 9, 260)).toThrow();
  });
  it("bake-off win rate is the IP-beats-greedy fraction", () => {
    expect(bakeOffWinRate([10, 12, 9], [9, 12, 10])).toBeCloseTo(1 / 3, 10);
    expect(() => bakeOffWinRate([1], [])).toThrow();
  });
});
