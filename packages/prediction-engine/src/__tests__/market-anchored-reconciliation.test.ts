import { describe, expect, it } from "vitest";
import {
  decomposeMarketAnchor,
  reconcileMarketAnchoredPlayers,
  type MarketAnchoredPlayerInput,
} from "../market-anchored-reconciliation.js";

// Realistic rosters: each team has a QB (passing), RB (rush + receiving), WR + TE (receiving).
const players: readonly MarketAnchoredPlayerInput[] = [
  { playerId: "home-qb1", teamSide: "home", position: "QB", usagePosteriorMean: 0.95, efficiencyPosteriorMean: 0.8, baselineFantasyPoints: 18 },
  { playerId: "home-rb1", teamSide: "home", position: "RB", usagePosteriorMean: 0.5, efficiencyPosteriorMean: 1.1, baselineFantasyPoints: 14 },
  { playerId: "home-wr1", teamSide: "home", position: "WR", usagePosteriorMean: 0.32, efficiencyPosteriorMean: 1.4, baselineFantasyPoints: 12 },
  { playerId: "home-te1", teamSide: "home", position: "TE", usagePosteriorMean: 0.18, efficiencyPosteriorMean: 0.9, baselineFantasyPoints: 32 },
  { playerId: "away-qb1", teamSide: "away", position: "QB", usagePosteriorMean: 0.9, efficiencyPosteriorMean: 0.7, baselineFantasyPoints: 15 },
  { playerId: "away-rb1", teamSide: "away", position: "RB", usagePosteriorMean: 0.38, efficiencyPosteriorMean: 1.1, baselineFantasyPoints: 14 },
  { playerId: "away-wr1", teamSide: "away", position: "WR", usagePosteriorMean: 0.3, efficiencyPosteriorMean: 1.2, baselineFantasyPoints: 11 },
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

  it("splits each team's pools into passing and rushing using the game-script pass rate", () => {
    const [home] = decomposeMarketAnchor({ gameId: "game-1", totalPoints: 48, homeSpread: -3 });

    expect(home.expectedPassRate).toBeGreaterThan(0);
    expect(home.expectedPassRate).toBeLessThan(1);
    // Pools sum back to the team total (coherence), and the receiving pool equals the passing pool.
    expect(home.passYards + home.rushYards).toBeCloseTo(home.projectedYards, 8);
    expect(home.passTouchdowns + home.rushTouchdowns).toBeCloseTo(home.projectedTouchdowns, 8);
  });
});

describe("reconcileMarketAnchoredPlayers", () => {
  const result = reconcileMarketAnchoredPlayers(
    { gameId: "game-1", totalPoints: 48, homeSpread: -3, assumptions: { yardsPerPoint: 15, pointsPerTouchdown: 6 } },
    players,
  );
  const [homeAnchor] = result.teamAnchors;
  const homePlayers = result.players.filter((player) => player.teamSide === "home");
  const sum = (selector: (p: (typeof homePlayers)[number]) => number) =>
    homePlayers.reduce((total, p) => total + selector(p), 0);

  it("conserves the passing, rushing, and receiving pools SEPARATELY", () => {
    // Each pool conserves on its own — NOT "player total yards == team total" (the old incoherent model).
    expect(sum((p) => p.passingYards)).toBeCloseTo(homeAnchor.passYards, 8);
    expect(sum((p) => p.rushingYards)).toBeCloseTo(homeAnchor.rushYards, 8);
    expect(sum((p) => p.receivingYards)).toBeCloseTo(homeAnchor.passYards, 8); // rec pool == pass pool
    expect(sum((p) => p.passingTouchdowns)).toBeCloseTo(homeAnchor.passTouchdowns, 8);
    expect(sum((p) => p.rushingTouchdowns)).toBeCloseTo(homeAnchor.rushTouchdowns, 8);
    expect(sum((p) => p.receivingTouchdowns)).toBeCloseTo(homeAnchor.passTouchdowns, 8);
    expect(result.conservation.every((c) => c.yardsConserved && c.touchdownsConserved)).toBe(true);
  });

  it("does NOT conserve player-total yards to the team total (proves pools are distinct)", () => {
    // sum(player totals) = passing(QB) + receiving(catchers) + rushing = 2*passYards + rushYards.
    expect(sum((p) => p.projectedYards)).toBeCloseTo(2 * homeAnchor.passYards + homeAnchor.rushYards, 6);
    expect(sum((p) => p.projectedYards)).toBeGreaterThan(homeAnchor.projectedYards);
  });

  it("routes passing volume to the QB and receiving volume to pass-catchers", () => {
    const qb = result.players.find((p) => p.playerId === "home-qb1");
    const wr = result.players.find((p) => p.playerId === "home-wr1");

    expect(qb?.passingYards ?? 0).toBeGreaterThan(0);
    expect(wr?.passingYards ?? 0).toBe(0); // a WR earns no passing yards
    expect(wr?.receivingYards ?? 0).toBeGreaterThan(0);
    // Derived fantasy points use the correct divisors (passing /25, receiving /10).
    expect(result.players.reduce((s, p) => s + p.fantasyPoints, 0)).not.toBe(48);
    expect(result.priced).toBe(false);
  });

  it("allocates more receiving volume to stronger usage times efficiency posteriors", () => {
    const wr = result.players.find((p) => p.playerId === "home-wr1");
    const te = result.players.find((p) => p.playerId === "home-te1");

    expect(wr?.receivingYards).toBeGreaterThan(te?.receivingYards ?? 0);
    expect(wr?.receivingTouchdowns).toBeGreaterThan(te?.receivingTouchdowns ?? 0);
  });

  it("emits divergence with the expected sign", () => {
    const wr = result.players.find((p) => p.playerId === "home-wr1");
    const te = result.players.find((p) => p.playerId === "home-te1");

    expect(wr?.divergence).toBeGreaterThan(0); // gets more volume than its low baseline
    expect(te?.divergence).toBeLessThan(0); // gets less volume than its high baseline
  });
});
