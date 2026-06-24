import { describe, expect, it } from "vitest";
import {
  decomposeMarketAnchor,
  reconcileMarketAnchoredPlayers,
  type MarketAnchoredPlayerInput,
} from "../market-anchored-reconciliation.js";

const players: readonly MarketAnchoredPlayerInput[] = [
  {
    playerId: "home-wr1",
    teamSide: "home",
    position: "WR",
    usagePosteriorMean: 0.32,
    efficiencyPosteriorMean: 1.4,
    baselineFantasyPoints: 12,
  },
  {
    playerId: "home-te1",
    teamSide: "home",
    position: "TE",
    usagePosteriorMean: 0.18,
    efficiencyPosteriorMean: 0.9,
    baselineFantasyPoints: 32,
  },
  {
    playerId: "away-qb1",
    teamSide: "away",
    position: "QB",
    usagePosteriorMean: 0.9,
    efficiencyPosteriorMean: 0.7,
    baselineFantasyPoints: 15,
  },
  {
    playerId: "away-rb1",
    teamSide: "away",
    position: "RB",
    usagePosteriorMean: 0.38,
    efficiencyPosteriorMean: 1.1,
    baselineFantasyPoints: 14,
  },
];

describe("decomposeMarketAnchor", () => {
  it("decomposes total and home spread into team yards and touchdowns", () => {
    const [home, away] = decomposeMarketAnchor({
      gameId: "game-1",
      totalPoints: 48,
      homeSpread: -3,
      assumptions: { yardsPerPoint: 15, pointsPerTouchdown: 6 },
    });

    expect(home.projectedPoints).toBe(25.5);
    expect(away.projectedPoints).toBe(22.5);
    expect(home.projectedYards).toBe(382.5);
    expect(away.projectedYards).toBe(337.5);
    expect(home.projectedTouchdowns).toBe(4.25);
    expect(away.projectedTouchdowns).toBe(3.75);
  });
});

describe("reconcileMarketAnchoredPlayers", () => {
  it("conserves team yards and touchdowns before deriving fantasy points", () => {
    const result = reconcileMarketAnchoredPlayers(
      {
        gameId: "game-1",
        totalPoints: 48,
        homeSpread: -3,
        assumptions: { yardsPerPoint: 15, pointsPerTouchdown: 6 },
      },
      players,
    );
    const [homeAnchor, awayAnchor] = result.teamAnchors;
    const homePlayers = result.players.filter((player) => player.teamSide === "home");
    const awayPlayers = result.players.filter((player) => player.teamSide === "away");

    expect(homePlayers.reduce((sum, player) => sum + player.projectedYards, 0)).toBeCloseTo(
      homeAnchor.projectedYards,
      8,
    );
    expect(homePlayers.reduce((sum, player) => sum + player.projectedTouchdowns, 0)).toBeCloseTo(
      homeAnchor.projectedTouchdowns,
      8,
    );
    expect(awayPlayers.reduce((sum, player) => sum + player.projectedYards, 0)).toBeCloseTo(
      awayAnchor.projectedYards,
      8,
    );
    expect(awayPlayers.reduce((sum, player) => sum + player.projectedTouchdowns, 0)).toBeCloseTo(
      awayAnchor.projectedTouchdowns,
      8,
    );
    expect(result.conservation.every((check) => check.yardsConserved)).toBe(true);
    expect(result.conservation.every((check) => check.touchdownsConserved)).toBe(true);
    expect(result.players.reduce((sum, player) => sum + player.fantasyPoints, 0)).not.toBe(48);
    expect(result.priced).toBe(false);
  });

  it("allocates more market volume to stronger usage times efficiency posteriors", () => {
    const result = reconcileMarketAnchoredPlayers(
      { gameId: "game-1", totalPoints: 48, homeSpread: -3 },
      players,
    );
    const wr = result.players.find((player) => player.playerId === "home-wr1");
    const te = result.players.find((player) => player.playerId === "home-te1");

    expect(wr?.projectedYards).toBeGreaterThan(te?.projectedYards ?? 0);
    expect(wr?.projectedTouchdowns).toBeGreaterThan(te?.projectedTouchdowns ?? 0);
  });

  it("emits divergence with the expected sign", () => {
    const result = reconcileMarketAnchoredPlayers(
      { gameId: "game-1", totalPoints: 48, homeSpread: -3 },
      players,
    );
    const wr = result.players.find((player) => player.playerId === "home-wr1");
    const te = result.players.find((player) => player.playerId === "home-te1");

    expect(wr?.divergence).toBeGreaterThan(0);
    expect(te?.divergence).toBeLessThan(0);
  });
});
