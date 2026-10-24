import { describe, expect, it } from "vitest";
import { simulateCoachGame, type CoachSimInput } from "./markov-simulator";

const base: CoachSimInput = {
  homeTeam: "BAL",
  awayTeam: "CIN",
  week: 7,
  coachSupport: 6,
  staffAggression: 0.75,
  shadows: [{ wr: "J.Chase", shadowRate: 0.62 }],
};

describe("marginMean responds to measured inputs", () => {
  it("moves when injuryDropOff changes (half the drop lands on the margin)", () => {
    const healthy = simulateCoachGame(base, 400).marginMean;
    const hurt = simulateCoachGame({ ...base, injuryDropOff: 4 }, 400).marginMean;
    expect(hurt).toBeCloseTo(healthy - 2, 5);
  });

  it("stays off the stub: nonzero injuryDropOff changes the margin from the constant 3", () => {
    const r = simulateCoachGame({ ...base, injuryDropOff: 2 }, 400);
    expect(r.marginMean).not.toBe(3);
  });

  it("moves the margin when the home staff is more passive than the PHI default", () => {
    const passive = simulateCoachGame({ ...base, staffAggression: 0.51 }, 500);
    const eagle = simulateCoachGame({ ...base, staffAggression: 0.94 }, 500);
    expect(passive.marginMean).not.toBeCloseTo(eagle.marginMean, 2);
  });

  it("changes the total band when n changes", () => {
    const small = simulateCoachGame(base, 8);
    const large = simulateCoachGame(base, 800);
    const narrow = small.totalP90 - small.totalP10;
    const wide = large.totalP90 - large.totalP10;
    expect(Math.abs(narrow - wide)).toBeGreaterThan(0.05);
    expect(wide).not.toBe(14);
    expect(wide).toBeGreaterThan(10);
  });

  it("cuts WR1's target share when that receiver is the shadowed name", () => {
    const open = simulateCoachGame({ ...base, shadows: [] }, 20);
    const covered = simulateCoachGame(
      { ...base, shadows: [{ wr: "WR1", shadowRate: 0.9 }] },
      20,
    );
    const share = (id: string, rows: { playerId: string; share: number }[] | undefined) =>
      rows?.find((r) => r.playerId === id)?.share ?? 0;
    expect(share("WR1", covered.targetShares)).toBeLessThan(share("WR1", open.targetShares));
  });
});
