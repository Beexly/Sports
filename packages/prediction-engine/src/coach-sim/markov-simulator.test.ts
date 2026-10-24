import { describe, expect, it } from "vitest";
import { simulateCoachGame, type CoachSimInput } from "./markov-simulator";

const base: CoachSimInput = {
  homeTeam: "BAL", awayTeam: "CIN", week: 7, coachSupport: 6,
  staffAggression: 0.75,
  shadows: [{ wr: "J.Chase", shadowRate: 0.62 }],
};

describe("marginMean responds to measured inputs", () => {
  it("moves when injuryDropOff changes (half the drop lands on the margin)", () => {
    const healthy = simulateCoachGame(base, 2000).marginMean;
    const hurt = simulateCoachGame({ ...base, injuryDropOff: 4 }, 2000).marginMean;
    expect(hurt).toBeCloseTo(healthy - 2, 5);
  });

  it("stays off the stub: nonzero injuryDropOff changes the margin from the constant 3", () => {
    const r = simulateCoachGame({ ...base, injuryDropOff: 2 }, 2000);
    expect(r.marginMean).not.toBe(3);
  });
});
