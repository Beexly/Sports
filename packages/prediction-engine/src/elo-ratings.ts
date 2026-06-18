/**
 * Live team-Elo ratings — the results-only, market-INDEPENDENT estimator that
 * finally feeds the edge engine.
 *
 * The scorer already reads `context.independentFairValues` and the edge engine
 * (edge-engine.ts) already prices an edge as `trueProb − marketFairProb`. What
 * was missing is the thing that actually PRODUCES `trueProb` from something the
 * market doesn't already contain. A team Elo, trained on game OUTCOMES (never on
 * the betting line), is exactly that: a genuinely independent probability.
 *
 * This module runs a sequential Elo over a sport's settled games (chronological,
 * with an offseason regression toward the mean) to get each team's CURRENT
 * rating, then turns a fixture's two ratings into an `IndependentMarketFairValue`
 * the scorer can ingest. Pure, no I/O — the pipeline loads the games and decides
 * (behind a flag) whether to attach the output.
 *
 * DISCIPLINE: producing this estimate does NOT make a public claim. It is
 * surfaced in the glass box at weight 0 (scoring.ts). Pricing it INTO confidence
 * (letting it move picks) requires the Elo to first prove it beats the closing
 * line — see elo-clv-backtest.ts. Honest default everywhere: a team with no
 * rating yields NO estimate (we decline rather than guess).
 */
import { updateEloRatings, toEloFairValue, type EloOptions } from "./elo-estimator.js";
import type { IndependentMarketFairValue } from "@sports/types";

export interface RatedGame {
  /** Settled final scores — the only inputs (no market data). */
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number;
  readonly awayScore: number;
  /** Season for offseason regression boundaries. */
  readonly season: number;
  /** Kickoff epoch ms — the chronological sort key (ratings must update in order). */
  readonly kickoff: number;
}

export interface EloRatingsOptions extends EloOptions {
  /** Elo K-factor (update step). Default 20. */
  readonly k?: number;
  /** Seed rating for an unseen team. Default 1500. */
  readonly initialRating?: number;
  /** Fraction of (rating − mean) kept across a season boundary. Default 0.75. */
  readonly seasonCarryover?: number;
}

export interface EloRatings {
  readonly ratings: ReadonlyMap<string, number>;
  readonly gamesRated: number;
  readonly initialRating: number;
  readonly options: Required<Pick<EloRatingsOptions, "k" | "initialRating" | "seasonCarryover">>;
}

/**
 * Run a sequential Elo over settled games and return the CURRENT ratings.
 * Games are sorted by (season, kickoff). Tied games nudge both ratings toward
 * the expectation (updateEloRatings treats a tie's homeWon=false the same as a
 * loss, so we skip pushes — a draw carries no rating signal here).
 */
export function computeEloRatings(
  games: readonly RatedGame[],
  options: EloRatingsOptions = {},
): EloRatings {
  const k = options.k ?? 20;
  const init = options.initialRating ?? 1500;
  const carry = options.seasonCarryover ?? 0.75;
  const eloOpts: EloOptions = { homeAdvantage: options.homeAdvantage, scale: options.scale };

  const ordered = [...games].sort((a, b) => a.season - b.season || a.kickoff - b.kickoff);
  const ratings = new Map<string, number>();
  const ratingOf = (team: string): number => ratings.get(team) ?? init;

  let gamesRated = 0;
  let prevSeason: number | null = null;

  for (const g of ordered) {
    if (g.homeScore === g.awayScore) continue; // a draw carries no rating signal
    if (!Number.isFinite(g.homeScore) || !Number.isFinite(g.awayScore)) continue;

    // Offseason: regress every rating toward the mean when the season advances.
    if (prevSeason !== null && g.season !== prevSeason) {
      for (const [team, r] of ratings) ratings.set(team, init + carry * (r - init));
    }
    prevSeason = g.season;

    const home = ratingOf(g.homeTeam);
    const away = ratingOf(g.awayTeam);
    const update = updateEloRatings(home, away, g.homeScore > g.awayScore, k, eloOpts);
    ratings.set(g.homeTeam, update.home);
    ratings.set(g.awayTeam, update.away);
    gamesRated += 1;
  }

  return {
    ratings,
    gamesRated,
    initialRating: init,
    options: { k, initialRating: init, seasonCarryover: carry },
  };
}

/**
 * Turn a fixture into the engine's independent fair-value shape — or an EMPTY
 * array when either team is unrated (honest silence beats a guessed estimate).
 * The returned value is what the pipeline assigns to
 * `OddsInput.context.independentFairValues`.
 */
export function eloFairValuesForGame(
  elo: EloRatings,
  homeTeam: string,
  awayTeam: string,
  options: EloOptions & { readonly now?: () => Date } = {},
): IndependentMarketFairValue[] {
  const home = elo.ratings.get(homeTeam);
  const away = elo.ratings.get(awayTeam);
  if (home == null || away == null) return [];
  return [toEloFairValue(home, away, options)];
}
