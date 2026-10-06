import { describe, expect, it } from "vitest";
import { regretMatrix, maxRegret, averageRank, mmrDisagrees } from "./minimax-regret-2403.js";

const M = {
  engines: ["champion", "challenger"],
  states: [
    { trainEra: "2019-2022", predictEra: "2023", stressed: false },
    { trainEra: "2019-2023", predictEra: "2024", stressed: false },
    { trainEra: "2019-2022", predictEra: "2024", stressed: true },
  ],
  scores: [
    [0.95, 0.9, 0.3], // champion: great normally, collapses under stress
    [0.7, 0.7, 0.7], // challenger: steady
  ],
};

describe("minimax regret", () => {
  it("regret is zero for the state-best engine", () => {
    const R = regretMatrix(M);
    expect(R[0]?.[0]).toBeCloseTo(0, 10); // champion best in state 0
    expect(R[0]?.[1]).toBeCloseTo(0, 10); // champion best in state 1
    expect(R[1]?.[2]).toBeCloseTo(0, 10); // challenger best in the stressed state
  });
  it("max-regret ranking prefers the robust challenger", () => {
    expect(maxRegret(M)[0]?.engine).toBe("challenger");
  });
  it("average ranking prefers the champion", () => {
    expect(averageRank(M)[0]?.engine).toBe("champion");
  });
  it("detects the disagreement that triggers the gate", () => {
    expect(mmrDisagrees(M)).toBe(true);
    const agree = { ...M, scores: [[0.9, 0.8], [0.7, 0.6]] };
    expect(mmrDisagrees(agree)).toBe(false);
  });
  it("handles empty input", () => {
    const empty = { engines: [], states: [], scores: [] as number[][] };
    expect(regretMatrix(empty)).toEqual([]);
    expect(averageRank(empty)).toEqual([]);
    expect(mmrDisagrees(empty)).toBe(false);
  });
  it("handles edge inputs", () => {
    // single engine has zero regret everywhere
    const solo = { engines: ["a"], states: [{ trainEra: "x", predictEra: "y", stressed: false }], scores: [[0.7]] };
    expect(regretMatrix(solo)).toEqual([[0]]);
    expect(maxRegret(solo)).toEqual([{ engine: "a", maxRegret: 0 }]);
  });
});

