/**
 * Opponent-adjusted EPA/play rating, split dropback vs designed rush
 * (offense and defense-allowed, both sides).
 *
 * WHY THIS EXISTS
 * ----------------
 * The engine's core rating is Elo, which sees only final score margins: a
 * 3-yard run and a 30-yard pass that both end a drive the same way look
 * identical to it. Every independent read of this codebase's own analytics
 * research (docs/2026-09-17-advanced-analytics-landscape.md §3 "Gap
 * analysis", corroborated in the v2 pass) names opponent-adjusted EPA/play
 * as the single biggest STRUCTURAL upgrade available on free data, and the
 * number that drives this file's shape is the same research's headline
 * correlation gap: passing efficiency correlates with wins at roughly
 * 0.53-0.61, rushing at roughly 0.13-0.19. A rating that pools dropback and
 * rush EPA into one number throws that gap away. This module keeps them
 * split all the way through: raw, opponent-adjusted, and shrunk, and
 * never recombines them into a single scalar (see "NOT WIRED IN" below).
 *
 * RELATION TO packages/prediction-engine/src/opponent-adjusted.ts
 * ------------------------------------------------------------------
 * `opponent-adjusted.ts` (`opponentAdjustedRatings`) already does iterative
 * opponent netting and is live today under `nfl-epa-fair-value.ts` for the
 * NFL independent-fair-value path. Read before building this: it is NOT
 * replaced or edited by this file, for two reasons this module's own
 * requirements force:
 *
 *   1. It carries one offense/defense pair per game (`offValue`/`defValue`),
 *      unweighted by play count, and cannot represent a dropback/rush split
 *      without either two independent call sites (losing a single shared
 *      convergence diagnostic) or a breaking signature change to a module
 *      three other files already import.
 *   2. It runs a fixed, unconditional 25-iteration loop with no tolerance
 *      check and no returned iteration count, and applies no shrinkage. This
 *      module's brief requires both, which is a return-shape change, not a
 *      parameter.
 *
 * Verdict, stated plainly: this module EXTENDS the same mathematical family
 * (simultaneous iterative opponent netting toward a fixed point) but is a
 * standalone, parallel implementation generalized to four coupled series
 * (offense x {dropback, rush}, defense x {dropback, rush}) with an explicit
 * convergence contract and post-convergence shrinkage. `opponent-adjusted.ts`
 * and `nfl-epa-fair-value.ts` are untouched and remain the live path;
 * whether this module eventually REPLACES that pathway (it is a strict
 * superset of what it measures) is an intake-contract decision left to
 * whoever owns that wiring. See "NOT WIRED IN" below.
 *
 * METHOD
 * ------
 * 1. Iterative opponent adjustment (fixed point): a team's adjusted offense
 *    in a split is its play-count-weighted raw output in that split, minus
 *    each opponent's adjusted defense-allowed in that split (relative to the
 *    league mean), averaged across the team's games; symmetric for defense.
 *    Iterate offense <-> defense, per split, to a stated tolerance or a
 *    stated iteration cap, and RETURN which one stopped the loop
 *    (`converged`, `iterations`) so a caller can tell a converged solve from
 *    a capped one apart rather than silently trusting a truncated fit.
 * 2. Early-season shrinkage toward a prior, weight decaying as the team's
 *    own sample (games played) accumulates. SHRINKAGE SCHEME, cited:
 *      - Decay SHAPE: HB Analytics coverage-grade blend (Brian Nemhauser,
 *        @hawkblogger, "HB ANALYTICS", verified, sourced 2026-09-17 per this
 *        repo's own research log): 2026 blended with the prior year at a
 *        fixed starting weight that fades LINEARLY TO ZERO BY WEEK 6. This
 *        is the one of the three published schemes this repo has logged
 *        with a fully specified, non-proprietary decay curve; DAVE's own
 *        decay schedule past week 1 is proprietary and UNVERIFIED per this
 *        repo's research notes, so it cannot honestly be reproduced here.
 *      - Starting WEIGHTS (week 1) and the offense/defense ASYMMETRY: FTN's
 *        DAVE, verified live Week 1 2026 per this repo's research log: 83%
 *        prior weight on OFFENSE, 98% on DEFENSE/special teams at week 1.
 *        Defense is shrunk far harder than offense early. A second,
 *        independent source corroborates that asymmetry rather than just
 *        restating it: this repo's own methods-literature pass (v2 dossier
 *        §3) found non-scripted EPA is far more stable than scripted EPA and
 *        that EPA-family variables carry outsized model importance early,
 *        and read that as independent corroboration that defensive EPA
 *        specifically needs harder early shrinkage than offensive EPA. Both
 *        sources point the same direction; this module follows DAVE's
 *        numbers for the starting split and the v2 literature reading for
 *        why the asymmetry is directionally trustworthy, not just one firm's
 *        proprietary choice.
 *    Both the decay-shape parameter (`shrinkageFadeGames`) and the two
 *    starting weights (`week1OffensePriorWeight`, `week1DefensePriorWeight`)
 *    are explicit, overridable options, not buried constants.
 * 3. "Games played" stands in for "week" in the decay curve (games played
 *    this season, not the calendar week number), which is exact except
 *    across a bye week. Stated here so nobody mistakes it for the calendar
 *    convention the cited sources use.
 * 4. Under-relaxation (damping): a naive simultaneous (Jacobi) update of
 *    four coupled series can OSCILLATE forever on a sparse, symmetric
 *    schedule instead of settling. Verified here on a star schedule where
 *    every opponent has exactly one game: the undamped update cycles
 *    between two states with period 2 and never satisfies any tolerance,
 *    for any iteration cap. Each iteration instead moves only a fraction
 *    `dampingFactor` of the way from the previous value to the raw
 *    simultaneous update (standard successive-under-relaxation for a fixed
 *    point iteration). Default 0.5 was chosen because it collapses the
 *    period-2 cycle above to convergence in two iterations; it is an
 *    explicit, overridable option, not a hidden stability hack.
 *
 * PRE-REGISTERED KILL LINE (before any backtest, none has been run; this
 * file carries zero fitted parameters and zero measured results)
 * ------------------------------------------------------------------------
 * On held-out, out-of-sample settled games, this design should be discarded
 * (collapsed back to a single pooled EPA/play rating, or dropped entirely)
 * if EITHER of the following holds:
 *   (a) the dropback split's correlation with next-game outcome (point
 *       margin or win) is NOT meaningfully higher than the rush split's,
 *       i.e., the ~0.53-0.61 vs ~0.13-0.19 gap this design is built on does
 *       not reproduce, even in rank order, on our own data; or
 *   (b) the opponent-adjusted, shrunk rating does not beat a same-day Elo
 *       margin baseline on next-game point-margin prediction (lower MAE)
 *       by a non-trivial margin.
 * Either failure means the added complexity (the split, the opponent
 * netting, the shrinkage) is not earning its keep over what the engine
 * already has, and the honest move is to cut it, not to keep tuning it.
 * NOT RUN. No production or backtest data has touched this module.
 *
 * NOT WIRED IN
 * ------------
 * Pure, offline, zero I/O. Not imported by scoring.ts or any live pick path.
 * MODEL_VERSION is untouched. Admissibility for future wiring: a caller
 * needs the four RATED split fields (`ratedOffDropbackEpaPerPlay`,
 * `ratedOffRushEpaPerPlay`, `ratedDefDropbackEpaPerPlayAllowed`,
 * `ratedDefRushEpaPerPlayAllowed`) per team, the `games` count, and the
 * `converged`/`iterations` diagnostics to decide whether to trust a given
 * week's solve. This module deliberately does NOT combine the four rated
 * splits into one scalar the way `nfl-epa-fair-value.ts`'s
 * `overall = adjOff - adjDef` does. A dropback/rush combining WEIGHT is a
 * calibration decision (see the correlation gap above) this module has not
 * fit and will not invent. Whoever wires this in owns that combination and
 * the MODEL_VERSION bump it would require.
 */

/** One team's per-game EPA aggregate, split dropback vs designed rush. */
export interface TeamGameEpaSplit {
  readonly team: string;
  readonly opponent: string;
  /** Dropback plays this team's OFFENSE ran (pass attempts + sacks + scrambles, per convention). */
  readonly offDropbackPlays: number;
  readonly offDropbackEpaPerPlay: number;
  /** Designed-rush plays this team's OFFENSE ran. */
  readonly offRushPlays: number;
  readonly offRushEpaPerPlay: number;
  /** Dropback plays this team's DEFENSE faced. */
  readonly defDropbackPlays: number;
  readonly defDropbackEpaPerPlayAllowed: number;
  /** Designed-rush plays this team's DEFENSE faced. */
  readonly defRushPlays: number;
  readonly defRushEpaPerPlayAllowed: number;
}

/**
 * Optional external prior for one team (e.g. a prior-season rating). Any
 * field left out defaults to 0.0 (league-neutral). This module does not
 * yet claim a calibrated non-zero prior of its own, matching the posture
 * already used elsewhere in this package (see team-rates.ts
 * DEFAULT_HOME_ADVANTAGE's comment on the same honesty rule).
 */
export interface TeamEpaPrior {
  readonly offDropbackEpaPerPlay?: number;
  readonly offRushEpaPerPlay?: number;
  readonly defDropbackEpaPerPlayAllowed?: number;
  readonly defRushEpaPerPlayAllowed?: number;
}

export interface OpponentAdjustedEpaOptions {
  /** Max absolute per-iteration change (EPA/play units) that counts as converged. Default 1e-4. */
  readonly tolerance?: number;
  /** Hard iteration cap. Default 100. */
  readonly maxIterations?: number;
  /**
   * Under-relaxation factor in (0, 1]. Each iteration moves this fraction
   * of the way from the previous value to the raw simultaneous update.
   * Default 0.5 (see "Under-relaxation" in the module header: 1.0 can
   * oscillate forever on a sparse, symmetric schedule and never converge).
   */
  readonly dampingFactor?: number;
  /**
   * Minimum games played before a team gets a non-null rating. Default 4,
   * the same threshold `nfl-epa-fair-value.ts`'s `NFL_EPA_MIN_GAMES` already
   * uses for this engine's NFL independent-fair-value gate (precedent
   * cited, not imported, to keep this module dependency-free).
   */
  readonly minGames?: number;
  /** Week-1 shrinkage weight toward the prior, OFFENSE splits. Default 0.83 (DAVE, FTN, Week 1 2026). */
  readonly week1OffensePriorWeight?: number;
  /** Week-1 shrinkage weight toward the prior, DEFENSE splits. Default 0.98 (DAVE, FTN, Week 1 2026). */
  readonly week1DefensePriorWeight?: number;
  /** Games played at which the prior weight reaches zero (linear fade). Default 6 (HB Analytics). */
  readonly shrinkageFadeGames?: number;
  /** Optional per-team external priors. Missing team or missing field defaults to 0.0. */
  readonly priors?: ReadonlyMap<string, TeamEpaPrior>;
}

/** League-wide play-count-weighted means, for transparency/debugging. */
export interface LeagueEpaAverages {
  readonly offDropbackEpaPerPlay: number;
  readonly offRushEpaPerPlay: number;
  readonly defDropbackEpaPerPlayAllowed: number;
  readonly defRushEpaPerPlayAllowed: number;
}

export interface OpponentAdjustedEpaRating {
  // Raw (play-count-weighted, NOT opponent-adjusted), for transparency.
  readonly rawOffDropbackEpaPerPlay: number;
  readonly rawOffRushEpaPerPlay: number;
  readonly rawDefDropbackEpaPerPlayAllowed: number;
  readonly rawDefRushEpaPerPlayAllowed: number;
  // Opponent-adjusted (post-convergence, PRE-shrinkage).
  readonly adjOffDropbackEpaPerPlay: number;
  readonly adjOffRushEpaPerPlay: number;
  readonly adjDefDropbackEpaPerPlayAllowed: number;
  readonly adjDefRushEpaPerPlayAllowed: number;
  // Opponent-adjusted AND shrunk toward the prior: the headline output.
  readonly ratedOffDropbackEpaPerPlay: number;
  readonly ratedOffRushEpaPerPlay: number;
  readonly ratedDefDropbackEpaPerPlayAllowed: number;
  readonly ratedDefRushEpaPerPlayAllowed: number;
  /** Prior weight actually applied this solve, OFFENSE splits (0..week1OffensePriorWeight). */
  readonly priorWeightOffense: number;
  /** Prior weight actually applied this solve, DEFENSE splits (0..week1DefensePriorWeight). */
  readonly priorWeightDefense: number;
}

export interface OpponentAdjustedEpaTeamResult {
  readonly team: string;
  readonly games: number;
  /** NULL, never a neutral zero, when `games` is below the minimum. */
  readonly rating: OpponentAdjustedEpaRating | null;
}

export interface OpponentAdjustedEpaSolve {
  readonly results: readonly OpponentAdjustedEpaTeamResult[];
  /** How many netting iterations actually ran (0 if the input was empty or maxIterations was 0). */
  readonly iterations: number;
  /** True iff the last iteration's max change was below `tolerance` before the cap was hit. */
  readonly converged: boolean;
  readonly leagueAverages: LeagueEpaAverages | null;
}

const DEFAULT_TOLERANCE = 1e-4;
const DEFAULT_MAX_ITERATIONS = 100;
/** Successive-under-relaxation factor; see "Under-relaxation" in the module header. */
const DEFAULT_DAMPING_FACTOR = 0.5;
/** Precedent: nfl-epa-fair-value.ts NFL_EPA_MIN_GAMES. */
const DEFAULT_MIN_GAMES = 4;
/** DAVE (FTN), verified Week 1 2026: offense prior weight at week 1. */
const DEFAULT_WEEK1_OFFENSE_PRIOR_WEIGHT = 0.83;
/** DAVE (FTN), verified Week 1 2026: defense/ST prior weight at week 1. */
const DEFAULT_WEEK1_DEFENSE_PRIOR_WEIGHT = 0.98;
/** HB Analytics coverage-grade blend: linear fade to zero by week 6. */
const DEFAULT_SHRINKAGE_FADE_GAMES = 6;

type Split = "offDropback" | "offRush" | "defDropback" | "defRush";
const SPLITS: readonly Split[] = ["offDropback", "offRush", "defDropback", "defRush"];

function playsAndEpaFor(split: Split, g: TeamGameEpaSplit): readonly [epa: number, plays: number] {
  switch (split) {
    case "offDropback":
      return [g.offDropbackEpaPerPlay, g.offDropbackPlays];
    case "offRush":
      return [g.offRushEpaPerPlay, g.offRushPlays];
    case "defDropback":
      return [g.defDropbackEpaPerPlayAllowed, g.defDropbackPlays];
    case "defRush":
      return [g.defRushEpaPerPlayAllowed, g.defRushPlays];
  }
}

/** The split whose value nets AGAINST this one (offense nets against the opponent's same-type defense, and vice versa). */
function pairedSplit(split: Split): Split {
  switch (split) {
    case "offDropback":
      return "defDropback";
    case "offRush":
      return "defRush";
    case "defDropback":
      return "offDropback";
    case "defRush":
      return "offRush";
  }
}

function playWeightedMean(pairs: ReadonlyArray<readonly [value: number, weight: number]>): number {
  let sumW = 0;
  let sumWV = 0;
  for (const [v, w] of pairs) {
    if (!Number.isFinite(v) || !Number.isFinite(w) || w <= 0) continue;
    sumW += w;
    sumWV += w * v;
  }
  return sumW > 0 ? sumWV / sumW : 0;
}

/**
 * Linear fade from `week1Weight` (at gamesPlayed === 1) to 0 (at
 * gamesPlayed === fadeGames or beyond). Clamped to [0, week1Weight].
 */
function priorWeightForGames(gamesPlayed: number, week1Weight: number, fadeGames: number): number {
  if (fadeGames <= 1) return 0;
  const raw = (week1Weight * (fadeGames - gamesPlayed)) / (fadeGames - 1);
  return Math.min(week1Weight, Math.max(0, raw));
}

export function computeOpponentAdjustedEpa(
  games: readonly TeamGameEpaSplit[],
  options: OpponentAdjustedEpaOptions = {},
): OpponentAdjustedEpaSolve {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const dampingFactor = options.dampingFactor ?? DEFAULT_DAMPING_FACTOR;
  const minGames = options.minGames ?? DEFAULT_MIN_GAMES;
  const week1OffensePriorWeight = options.week1OffensePriorWeight ?? DEFAULT_WEEK1_OFFENSE_PRIOR_WEIGHT;
  const week1DefensePriorWeight = options.week1DefensePriorWeight ?? DEFAULT_WEEK1_DEFENSE_PRIOR_WEIGHT;
  const shrinkageFadeGames = options.shrinkageFadeGames ?? DEFAULT_SHRINKAGE_FADE_GAMES;

  if (games.length === 0) {
    return { results: [], iterations: 0, converged: true, leagueAverages: null };
  }

  const teams = new Set<string>();
  const byTeam = new Map<string, TeamGameEpaSplit[]>();
  for (const g of games) {
    teams.add(g.team);
    const list = byTeam.get(g.team) ?? [];
    list.push(g);
    byTeam.set(g.team, list);
  }

  const leagueAvg: Record<Split, number> = {
    offDropback: playWeightedMean(games.map((g) => playsAndEpaFor("offDropback", g))),
    offRush: playWeightedMean(games.map((g) => playsAndEpaFor("offRush", g))),
    defDropback: playWeightedMean(games.map((g) => playsAndEpaFor("defDropback", g))),
    defRush: playWeightedMean(games.map((g) => playsAndEpaFor("defRush", g))),
  };

  // adj[split].get(team): the fixed-point state, one map per split.
  const adj: Record<Split, Map<string, number>> = {
    offDropback: new Map(),
    offRush: new Map(),
    defDropback: new Map(),
    defRush: new Map(),
  };
  for (const split of SPLITS) {
    for (const t of teams) {
      const gs = byTeam.get(t)!;
      adj[split].set(t, playWeightedMean(gs.map((g) => playsAndEpaFor(split, g))));
    }
  }

  let iterations = 0;
  let converged = false;
  for (let iter = 0; iter < maxIterations; iter++) {
    const next: Record<Split, Map<string, number>> = {
      offDropback: new Map(),
      offRush: new Map(),
      defDropback: new Map(),
      defRush: new Map(),
    };
    for (const split of SPLITS) {
      const opponentSplit = pairedSplit(split);
      const opponentLeagueAvg = leagueAvg[opponentSplit];
      for (const t of teams) {
        const gs = byTeam.get(t)!;
        next[split].set(
          t,
          playWeightedMean(
            gs.map((g) => {
              const [epa, plays] = playsAndEpaFor(split, g);
              const opponentAdj = adj[opponentSplit].get(g.opponent) ?? opponentLeagueAvg;
              return [epa - (opponentAdj - opponentLeagueAvg), plays] as const;
            }),
          ),
        );
      }
    }

    let maxDelta = 0;
    for (const split of SPLITS) {
      for (const t of teams) {
        const before = adj[split].get(t)!;
        const rawNext = next[split].get(t)!;
        // Under-relaxation: move only `dampingFactor` of the way toward the
        // raw simultaneous update (see "Under-relaxation" in the module header).
        const after = before + dampingFactor * (rawNext - before);
        const delta = Math.abs(after - before);
        if (delta > maxDelta) maxDelta = delta;
        adj[split].set(t, after);
      }
    }
    iterations++;
    if (maxDelta < tolerance) {
      converged = true;
      break;
    }
  }

  const results: OpponentAdjustedEpaTeamResult[] = [...teams].map((t) => {
    const gs = byTeam.get(t)!;
    const n = gs.length;
    if (n < minGames) {
      return { team: t, games: n, rating: null };
    }

    const priorWeightOffense = priorWeightForGames(n, week1OffensePriorWeight, shrinkageFadeGames);
    const priorWeightDefense = priorWeightForGames(n, week1DefensePriorWeight, shrinkageFadeGames);
    const prior = options.priors?.get(t);

    const rawOffDropback = playWeightedMean(gs.map((g) => playsAndEpaFor("offDropback", g)));
    const rawOffRush = playWeightedMean(gs.map((g) => playsAndEpaFor("offRush", g)));
    const rawDefDropback = playWeightedMean(gs.map((g) => playsAndEpaFor("defDropback", g)));
    const rawDefRush = playWeightedMean(gs.map((g) => playsAndEpaFor("defRush", g)));

    const adjOffDropback = adj.offDropback.get(t)!;
    const adjOffRush = adj.offRush.get(t)!;
    const adjDefDropback = adj.defDropback.get(t)!;
    const adjDefRush = adj.defRush.get(t)!;

    const rating: OpponentAdjustedEpaRating = {
      rawOffDropbackEpaPerPlay: rawOffDropback,
      rawOffRushEpaPerPlay: rawOffRush,
      rawDefDropbackEpaPerPlayAllowed: rawDefDropback,
      rawDefRushEpaPerPlayAllowed: rawDefRush,
      adjOffDropbackEpaPerPlay: adjOffDropback,
      adjOffRushEpaPerPlay: adjOffRush,
      adjDefDropbackEpaPerPlayAllowed: adjDefDropback,
      adjDefRushEpaPerPlayAllowed: adjDefRush,
      ratedOffDropbackEpaPerPlay:
        priorWeightOffense * (prior?.offDropbackEpaPerPlay ?? 0) + (1 - priorWeightOffense) * adjOffDropback,
      ratedOffRushEpaPerPlay:
        priorWeightOffense * (prior?.offRushEpaPerPlay ?? 0) + (1 - priorWeightOffense) * adjOffRush,
      ratedDefDropbackEpaPerPlayAllowed:
        priorWeightDefense * (prior?.defDropbackEpaPerPlayAllowed ?? 0) +
        (1 - priorWeightDefense) * adjDefDropback,
      ratedDefRushEpaPerPlayAllowed:
        priorWeightDefense * (prior?.defRushEpaPerPlayAllowed ?? 0) + (1 - priorWeightDefense) * adjDefRush,
      priorWeightOffense,
      priorWeightDefense,
    };

    return { team: t, games: n, rating };
  });

  return {
    results,
    iterations,
    converged,
    leagueAverages: {
      offDropbackEpaPerPlay: leagueAvg.offDropback,
      offRushEpaPerPlay: leagueAvg.offRush,
      defDropbackEpaPerPlayAllowed: leagueAvg.defDropback,
      defRushEpaPerPlayAllowed: leagueAvg.defRush,
    },
  };
}

export {
  DEFAULT_TOLERANCE as OPPONENT_ADJUSTED_EPA_DEFAULT_TOLERANCE,
  DEFAULT_MAX_ITERATIONS as OPPONENT_ADJUSTED_EPA_DEFAULT_MAX_ITERATIONS,
  DEFAULT_DAMPING_FACTOR as OPPONENT_ADJUSTED_EPA_DEFAULT_DAMPING_FACTOR,
  DEFAULT_MIN_GAMES as OPPONENT_ADJUSTED_EPA_DEFAULT_MIN_GAMES,
  DEFAULT_WEEK1_OFFENSE_PRIOR_WEIGHT as OPPONENT_ADJUSTED_EPA_WEEK1_OFFENSE_PRIOR_WEIGHT,
  DEFAULT_WEEK1_DEFENSE_PRIOR_WEIGHT as OPPONENT_ADJUSTED_EPA_WEEK1_DEFENSE_PRIOR_WEIGHT,
  DEFAULT_SHRINKAGE_FADE_GAMES as OPPONENT_ADJUSTED_EPA_SHRINKAGE_FADE_GAMES,
};
