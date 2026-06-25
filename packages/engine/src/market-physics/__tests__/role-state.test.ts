import { describe, it, expect } from "vitest";
import {
  generateRoleCandidates,
  roleVolatility,
  roleShiftScore,
  type PlayerRoleState,
} from "../role-state.js";

function state(over: Partial<PlayerRoleState> = {}): PlayerRoleState {
  return {
    player: "Player",
    team: "KC",
    position: "RB",
    isBackup: false,
    projectedSnapShare: 0.4,
    recentSnapShare: 0.4,
    routeShare: 0.3,
    targetShare: 0.12,
    carryShare: 0.5,
    redZoneShare: 0.4,
    thirdDownRole: 0.3,
    twoMinuteRole: 0.3,
    backupAvailable: true,
    starterInjuryStatus: "healthy",
    olInjuryContext: 0,
    defenseMatchupContext: 0.5,
    spreadShift: 0,
    teamTotalContext: 24,
    teammateWr1Out: false,
    weatherContext: 0,
    ...over,
  };
}

describe("generateRoleCandidates", () => {
  it("flags a backup RB inheriting passing-down work after a starter limitation", () => {
    const c = generateRoleCandidates(
      state({ position: "RB", isBackup: true, starterInjuryStatus: "out", recentSnapShare: 0.7, projectedSnapShare: 0.3, thirdDownRole: 0.6 }),
    );
    expect(c.some((x) => x.market === "player_reception_yds" && x.side === "OVER")).toBe(true);
    expect(c.some((x) => x.market === "player_receptions" && x.side === "OVER")).toBe(true);
    expect(c[0]!.structuralReason.length).toBeGreaterThan(10);
  });

  it("flags WR2/slot/TE receptions rising with WR1 out", () => {
    const c = generateRoleCandidates(state({ position: "WR", teammateWr1Out: true, targetShare: 0.22 }));
    expect(c.some((x) => x.market === "player_receptions" && x.side === "OVER")).toBe(true);
  });

  it("flags RB rush UNDER when the team loses favorite status", () => {
    const c = generateRoleCandidates(state({ position: "RB", spreadShift: 4 }));
    expect(c.some((x) => x.market === "player_rush_yds" && x.side === "UNDER")).toBe(true);
  });

  it("flags QB rush OVER behind a compromised OL", () => {
    const c = generateRoleCandidates(state({ position: "QB", olInjuryContext: 0.7 }));
    expect(c.some((x) => x.market === "player_rush_yds" && x.side === "OVER")).toBe(true);
  });

  it("generates nothing for a stable healthy starter in a neutral spot", () => {
    expect(generateRoleCandidates(state())).toHaveLength(0);
  });
});

describe("role scores", () => {
  it("roleShiftScore rises with snap-share divergence and stays bounded", () => {
    expect(roleShiftScore(state({ recentSnapShare: 0.8, projectedSnapShare: 0.3 }))).toBeGreaterThan(0.4);
    expect(roleVolatility(state({ isBackup: true, recentSnapShare: 0.9, projectedSnapShare: 0.2, spreadShift: 6 }))).toBeLessThanOrEqual(1);
  });
});
