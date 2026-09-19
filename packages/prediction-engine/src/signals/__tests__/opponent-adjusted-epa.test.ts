import { describe, it, expect } from "vitest";
import {
  computeOpponentAdjustedEpa,
  type TeamGameEpaSplit,
  type TeamEpaPrior,
} from "../opponent-adjusted-epa.js";

interface SplitOffense {
  readonly db: number;
  readonly dbPlays?: number;
  readonly rush: number;
  readonly rushPlays?: number;
}

/**
 * Both perspectives of one game, split dropback vs rush, offense vs defense.
 * `teamOff`/`oppOff` are each side's OWN offensive output that game; each
 * side's defense-allowed is mirrored from the other side's offense, exactly
 * as `opponent-adjusted.ts`'s own `matchup()` test helper does for the
 * single-split case.
 */
function matchup(team: string, opponent: string, teamOff: SplitOffense, oppOff: SplitOffense): TeamGameEpaSplit[] {
  const teamDbPlays = teamOff.dbPlays ?? 30;
  const teamRushPlays = teamOff.rushPlays ?? 25;
  const oppDbPlays = oppOff.dbPlays ?? 30;
  const oppRushPlays = oppOff.rushPlays ?? 25;
  return [
    {
      team,
      opponent,
      offDropbackPlays: teamDbPlays,
      offDropbackEpaPerPlay: teamOff.db,
      offRushPlays: teamRushPlays,
      offRushEpaPerPlay: teamOff.rush,
      defDropbackPlays: oppDbPlays,
      defDropbackEpaPerPlayAllowed: oppOff.db,
      defRushPlays: oppRushPlays,
      defRushEpaPerPlayAllowed: oppOff.rush,
    },
    {
      team: opponent,
      opponent: team,
      offDropbackPlays: oppDbPlays,
      offDropbackEpaPerPlay: oppOff.db,
      offRushPlays: oppRushPlays,
      offRushEpaPerPlay: oppOff.rush,
      defDropbackPlays: teamDbPlays,
      defDropbackEpaPerPlayAllowed: teamOff.db,
      defRushPlays: teamRushPlays,
      defRushEpaPerPlayAllowed: teamOff.rush,
    },
  ];
}

describe("computeOpponentAdjustedEpa", () => {
  it("returns nothing for no games", () => {
    const solve = computeOpponentAdjustedEpa([]);
    expect(solve.results).toEqual([]);
    expect(solve.iterations).toBe(0);
    expect(solve.converged).toBe(true);
    expect(solve.leagueAverages).toBeNull();
  });

  describe("opponent adjustment direction, and dropback/rush independence", () => {
    // Mirrors opponent-adjusted.ts's own "credits the same raw output more
    // against a tougher defense" fixture, but on the dropback split only.
    // Rush is held at an identical constant EPA/play for every offense and
    // every defense in every game, so a difference in the rush rating
    // between A and B would mean the two splits are leaking into each
    // other; equality proves they are computed independently.
    const games: TeamGameEpaSplit[] = [
      ...matchup("X", "T", { db: 0.0, rush: 0.05 }, { db: 0.1, rush: 0.05 }),
      ...matchup("Y", "T", { db: 0.0, rush: 0.05 }, { db: 0.1, rush: 0.05 }),
      ...matchup("X", "W", { db: 0.4, rush: 0.05 }, { db: 0.1, rush: 0.05 }),
      ...matchup("Y", "W", { db: 0.4, rush: 0.05 }, { db: 0.1, rush: 0.05 }),
      ...matchup("A", "W", { db: 0.2, rush: 0.05 }, { db: 0.1, rush: 0.05 }), // A vs weak D
      ...matchup("B", "T", { db: 0.2, rush: 0.05 }, { db: 0.1, rush: 0.05 }), // B vs strong D
    ];
    const solve = computeOpponentAdjustedEpa(games, { minGames: 1 });
    const A = solve.results.find((r) => r.team === "A")!.rating!;
    const B = solve.results.find((r) => r.team === "B")!.rating!;

    it("same raw dropback output, same raw as each other", () => {
      expect(A.rawOffDropbackEpaPerPlay).toBeCloseTo(0.2, 6);
      expect(B.rawOffDropbackEpaPerPlay).toBeCloseTo(0.2, 6);
    });

    it("boosts the team that faced the tougher defense, penalizes the one that faced the weaker one", () => {
      expect(B.adjOffDropbackEpaPerPlay).toBeGreaterThan(B.rawOffDropbackEpaPerPlay);
      expect(A.adjOffDropbackEpaPerPlay).toBeLessThan(A.rawOffDropbackEpaPerPlay);
      expect(B.adjOffDropbackEpaPerPlay).toBeGreaterThan(A.adjOffDropbackEpaPerPlay);
    });

    it("leaves the rush split untouched by a dropback-only opponent-strength difference", () => {
      // Rush inputs were identical constants for every team in every game,
      // so the two teams' opponent-adjusted rush ratings must match even
      // though their dropback ratings diverge.
      expect(A.adjOffRushEpaPerPlay).toBeCloseTo(B.adjOffRushEpaPerPlay, 6);
    });
  });

  it("rates a league of identical teams identically (uniform schedule -> uniform ratings)", () => {
    const teams = ["P", "Q", "R", "S", "U"]; // round robin -> 4 games each, hits the default min
    const games: TeamGameEpaSplit[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        games.push(
          ...matchup(
            teams[i]!,
            teams[j]!,
            { db: 0.15, dbPlays: 30, rush: 0.02, rushPlays: 22 },
            { db: 0.15, dbPlays: 30, rush: 0.02, rushPlays: 22 },
          ),
        );
      }
    }
    const solve = computeOpponentAdjustedEpa(games); // default minGames = 4
    expect(solve.results).toHaveLength(teams.length);
    for (const result of solve.results) {
      expect(result.games).toBe(4);
      const r = result.rating;
      expect(r).not.toBeNull();
      expect(r!.adjOffDropbackEpaPerPlay).toBeCloseTo(0.15, 6);
      expect(r!.adjOffRushEpaPerPlay).toBeCloseTo(0.02, 6);
      expect(r!.adjDefDropbackEpaPerPlayAllowed).toBeCloseTo(0.15, 6);
      expect(r!.adjDefRushEpaPerPlayAllowed).toBeCloseTo(0.02, 6);
    }
  });

  describe("minimum-games gating (never a neutral zero)", () => {
    it("returns rating: null, not zero, below the default minimum of 4 games", () => {
      const games: TeamGameEpaSplit[] = [
        ...matchup("A", "B", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
        ...matchup("A", "C", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
        ...matchup("A", "D", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
      ];
      const solve = computeOpponentAdjustedEpa(games);
      const a = solve.results.find((r) => r.team === "A")!;
      expect(a.games).toBe(3);
      expect(a.rating).toBeNull();
      const b = solve.results.find((r) => r.team === "B")!;
      expect(b.games).toBe(1);
      expect(b.rating).toBeNull();
      // The below-threshold opponents still fed the netting math -- the solve
      // still ran to completion rather than refusing outright.
      expect(solve.leagueAverages).not.toBeNull();
      expect(solve.converged).toBe(true);
    });

    it("rates a team once it clears exactly the default minimum of 4 games", () => {
      const games: TeamGameEpaSplit[] = [
        ...matchup("A", "B", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
        ...matchup("A", "C", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
        ...matchup("A", "D", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
        ...matchup("A", "E", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 }),
      ];
      const solve = computeOpponentAdjustedEpa(games);
      const a = solve.results.find((r) => r.team === "A")!;
      expect(a.games).toBe(4);
      expect(a.rating).not.toBeNull();
    });

    it("minGames is an explicit, overridable option", () => {
      const games = matchup("A", "B", { db: 0.1, rush: 0.05 }, { db: -0.05, rush: 0.0 });
      expect(computeOpponentAdjustedEpa(games, { minGames: 2 }).results[0]!.rating).toBeNull();
      expect(computeOpponentAdjustedEpa(games, { minGames: 1 }).results[0]!.rating).not.toBeNull();
    });
  });

  describe("shrinkage toward a prior (DAVE week-1 split, HB linear fade)", () => {
    const teamOff: SplitOffense = { db: 0.3, rush: 0.1 };
    const oppOff: SplitOffense = { db: -0.1, rush: -0.05 };

    function buildGames(n: number): TeamGameEpaSplit[] {
      const gs: TeamGameEpaSplit[] = [];
      for (let i = 0; i < n; i++) {
        gs.push(...matchup("A", `OPP${i}`, teamOff, oppOff));
      }
      return gs;
    }

    it("defaults: defense is shrunk harder than offense at one game (DAVE asymmetry)", () => {
      const solve = computeOpponentAdjustedEpa(buildGames(1), { minGames: 1 });
      const a = solve.results.find((r) => r.team === "A")!.rating!;
      expect(a.priorWeightOffense).toBeCloseTo(0.83, 6);
      expect(a.priorWeightDefense).toBeCloseTo(0.98, 6);
      expect(a.priorWeightDefense).toBeGreaterThan(a.priorWeightOffense);
    });

    it("prior weight fades to exactly zero at the default 6-game horizon", () => {
      const solve = computeOpponentAdjustedEpa(buildGames(6), { minGames: 1 });
      const a = solve.results.find((r) => r.team === "A")!.rating!;
      expect(a.priorWeightOffense).toBe(0);
      expect(a.priorWeightDefense).toBe(0);
      expect(a.ratedOffDropbackEpaPerPlay).toBeCloseTo(a.adjOffDropbackEpaPerPlay, 9);
      expect(a.ratedDefDropbackEpaPerPlayAllowed).toBeCloseTo(a.adjDefDropbackEpaPerPlayAllowed, 9);
    });

    it("prior weight decreases monotonically as games accumulate", () => {
      const weights = [1, 2, 3, 4, 5].map(
        (n) => computeOpponentAdjustedEpa(buildGames(n), { minGames: 1 }).results[0]!.rating!.priorWeightOffense,
      );
      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]!).toBeLessThan(weights[i - 1]!);
      }
    });

    it("blends toward a supplied prior, more strongly at low sample size than at the fade horizon", () => {
      const priors: ReadonlyMap<string, TeamEpaPrior> = new Map([["A", { offDropbackEpaPerPlay: -0.5 }]]);
      const early = computeOpponentAdjustedEpa(buildGames(1), { minGames: 1, priors }).results[0]!.rating!;
      const late = computeOpponentAdjustedEpa(buildGames(6), { minGames: 1, priors }).results[0]!.rating!;
      // A is a well-above-average offense here (0.3 vs a ~0.1 league mean), so its
      // opponent-adjusted value sits well above the -0.5 prior; heavy early shrinkage
      // must therefore pull the early rating below the fully-faded late rating.
      expect(early.ratedOffDropbackEpaPerPlay).toBeLessThan(late.ratedOffDropbackEpaPerPlay);
      // No prior weight left at the fade horizon -> rated equals opponent-adjusted exactly.
      expect(late.ratedOffDropbackEpaPerPlay).toBeCloseTo(late.adjOffDropbackEpaPerPlay, 9);
    });

    it("an unsupplied prior defaults to 0.0 (league-neutral), never an invented non-zero", () => {
      const solve = computeOpponentAdjustedEpa(buildGames(1), { minGames: 1 });
      const a = solve.results.find((r) => r.team === "A")!.rating!;
      const expectedRated = a.priorWeightOffense * 0 + (1 - a.priorWeightOffense) * a.adjOffDropbackEpaPerPlay;
      expect(a.ratedOffDropbackEpaPerPlay).toBeCloseTo(expectedRated, 9);
    });

    it("the decay shape and starting weights are explicit, overridable parameters", () => {
      const solve = computeOpponentAdjustedEpa(buildGames(2), {
        minGames: 1,
        shrinkageFadeGames: 2,
        week1OffensePriorWeight: 0.5,
        week1DefensePriorWeight: 0.5,
      });
      const a = solve.results.find((r) => r.team === "A")!.rating!;
      expect(a.priorWeightOffense).toBe(0);
      expect(a.priorWeightDefense).toBe(0);
    });
  });

  describe("convergence diagnostics", () => {
    it("converges within the default cap on a normal, well-connected schedule", () => {
      const games: TeamGameEpaSplit[] = [
        ...matchup("A", "B", { db: 0.2, rush: 0.05 }, { db: 0.0, rush: 0.0 }),
        ...matchup("B", "C", { db: 0.1, rush: 0.02 }, { db: 0.1, rush: 0.02 }),
        ...matchup("C", "A", { db: 0.0, rush: 0.0 }, { db: 0.2, rush: 0.05 }),
        ...matchup("A", "D", { db: 0.15, rush: 0.03 }, { db: 0.05, rush: 0.01 }),
      ];
      const solve = computeOpponentAdjustedEpa(games, { minGames: 1 });
      expect(solve.converged).toBe(true);
      expect(solve.iterations).toBeGreaterThan(0);
      expect(solve.iterations).toBeLessThan(100);
    });

    it("reports converged=false and iterations=0 when the cap is zero, and leaves values un-netted", () => {
      const games = matchup("A", "B", { db: 0.2, rush: 0.05 }, { db: 0.0, rush: 0.0 });
      const solve = computeOpponentAdjustedEpa(games, { minGames: 1, maxIterations: 0 });
      expect(solve.converged).toBe(false);
      expect(solve.iterations).toBe(0);
      const a = solve.results.find((r) => r.team === "A")!.rating!;
      expect(a.adjOffDropbackEpaPerPlay).toBeCloseTo(a.rawOffDropbackEpaPerPlay, 9);
    });

    it("a looser tolerance stops in no more iterations than a tighter one on the same data", () => {
      const games: TeamGameEpaSplit[] = [
        ...matchup("A", "B", { db: 0.25, rush: 0.05 }, { db: -0.05, rush: -0.02 }),
        ...matchup("B", "C", { db: 0.1, rush: 0.02 }, { db: 0.05, rush: 0.0 }),
        ...matchup("C", "D", { db: 0.15, rush: 0.03 }, { db: 0.0, rush: 0.0 }),
        ...matchup("D", "A", { db: 0.05, rush: 0.0 }, { db: 0.2, rush: 0.04 }),
      ];
      const loose = computeOpponentAdjustedEpa(games, { minGames: 1, tolerance: 1e-1 });
      const tight = computeOpponentAdjustedEpa(games, { minGames: 1, tolerance: 1e-8 });
      expect(loose.converged).toBe(true);
      expect(tight.converged).toBe(true);
      expect(loose.iterations).toBeLessThanOrEqual(tight.iterations);
    });
  });
});
