import { describe, it, expect } from "vitest";
import { simulate } from "../engine";
import type { SimulationInput } from "../engine";

/** Build a simple simulation input: 9 players, 3 lineups */
function buildInput(): SimulationInput {
  const players = [
    { id: "p1", name: "Patrick Mahomes", projection: 28, floor: 18, ceiling: 45, ownership: 0.32 },
    { id: "p2", name: "Travis Kelce", projection: 18, floor: 10, ceiling: 32, ownership: 0.28 },
    { id: "p3", name: "Tyreek Hill", projection: 20, floor: 12, ceiling: 38, ownership: 0.24 },
    { id: "p4", name: "Justin Jefferson", projection: 22, floor: 14, ceiling: 40, ownership: 0.21 },
    { id: "p5", name: "Christian McCaffrey", projection: 24, floor: 14, ceiling: 42, ownership: 0.19 },
    { id: "p6", name: "Jamarr Chase", projection: 19, floor: 11, ceiling: 36, ownership: 0.16 },
    { id: "p7", name: "Tony Pollard", projection: 16, floor: 8, ceiling: 30, ownership: 0.14 },
    { id: "p8", name: "Cooper Kupp", projection: 17, floor: 9, ceiling: 32, ownership: 0.12 },
    { id: "p9", name: "Eagles DST", projection: 10, floor: 4, ceiling: 22, ownership: 0.10 },
  ];

  const lineups = [
    { players: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"] },
    { players: ["p1", "p2", "p4", "p5", "p6", "p7", "p8", "p9", "p3"] },
    { players: ["p1", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p2"] },
  ];

  return { players, lineups, iterations: 2000 };
}

describe("simulate()", () => {
  it("runs without error and returns the correct top-level structure", () => {
    const result = simulate(buildInput());
    expect(result).toHaveProperty("playerResults");
    expect(result).toHaveProperty("lineupResults");
    expect(result).toHaveProperty("portfolioResults");
    expect(result).toHaveProperty("durationMs");
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("playerResults count matches players count", () => {
    const input = buildInput();
    const result = simulate(input);
    expect(result.playerResults).toHaveLength(input.players.length);
  });

  it("p10 < p50 < p90 for all players", () => {
    const result = simulate(buildInput());
    for (const pr of result.playerResults) {
      expect(pr.p10).toBeLessThanOrEqual(pr.p50);
      expect(pr.p50).toBeLessThanOrEqual(pr.p90);
    }
  });

  it("portfolioResults.probAtLeastOneTop10Pct is between 0 and 1", () => {
    const result = simulate(buildInput());
    expect(result.portfolioResults.probAtLeastOneTop10Pct).toBeGreaterThanOrEqual(0);
    expect(result.portfolioResults.probAtLeastOneTop10Pct).toBeLessThanOrEqual(1);
  });

  it("portfolioResults.probAtLeastOneTop1Pct is between 0 and 1", () => {
    const result = simulate(buildInput());
    expect(result.portfolioResults.probAtLeastOneTop1Pct).toBeGreaterThanOrEqual(0);
    expect(result.portfolioResults.probAtLeastOneTop1Pct).toBeLessThanOrEqual(1);
  });

  it("lineupResults has one entry per lineup", () => {
    const input = buildInput();
    const result = simulate(input);
    expect(result.lineupResults).toHaveLength(input.lineups.length);
  });

  it("player p90 is less than ceiling * 1.5 (sanity clamp check)", () => {
    const input = buildInput();
    const result = simulate(input);
    for (const pr of result.playerResults) {
      const player = input.players.find((p) => p.id === pr.id);
      if (!player) continue;
      expect(pr.p90).toBeLessThan(player.ceiling * 1.5 + 0.001);
    }
  });

  it("bust probability is between 0 and 1 for all players", () => {
    const result = simulate(buildInput());
    for (const pr of result.playerResults) {
      expect(pr.bustProbability).toBeGreaterThanOrEqual(0);
      expect(pr.bustProbability).toBeLessThanOrEqual(1);
    }
  });
});
