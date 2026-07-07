/**
 * Team scoring rates → an INDEPENDENT Poisson fair value (the #11 unlock).
 *
 * THE PROBLEM IT SOLVES
 * The Poisson model (poisson.ts) needs team scoring rates λ, and the engine's
 * whole credibility rests on never fabricating them. But the platform ALREADY
 * stores the raw material: real final scores in TeamGameLog.teamScore /
 * opponentScore, sourced from The Odds API /scores. So we COMPUTE λ from real
 * results — no new provider, no synthesized stats — and Poisson becomes a
 * genuine SECOND independent estimator for the edge engine (edge-engine.ts),
 * alongside the Kalshi exchange. Two independents that can referee each other is
 * what stops the engine grading itself.
 *
 * HONESTY GUARDRAILS (baked in, not optional)
 *   - Small-sample gating: below MIN_GAMES_FOR_RATES real completed games we
 *     return null (no opinion) rather than a noisy rate.
 *   - Sport validity: an independent-Poisson-on-team-rates model is only
 *     defensible for low-count scoring sports — soccer & hockey (goals), baseball
 *     (runs). For basketball / American football we return null; we do not voice
 *     a Poisson opinion where the model does not hold.
 *   - bootstrapShare is surfaced so a caller never mistakes thin early-platform
 *     data for a mature record.
 *   - moneylineProbabilities() still calls assertTeamRatesAvailable(): the founder
 *     master switch (TEAM_RATES_AVAILABLE=true) gates production use end-to-end.
 *
 * The honest default is null — and a null Poisson estimate simply means the edge
 * engine has one fewer independent, which it already handles by passing.
 *
 * Pure: no I/O. The DB query that supplies records lives in data-ingestion; the
 * ingestion-cron wiring and the gated MODEL_VERSION bump are a separate,
 * founder-gated step (mirroring the Kalshi fair-value boundary).
 */

import { moneylineProbabilities } from "./poisson.js";

/** Below this many real, completed games we have no defensible rate. */
export const MIN_GAMES_FOR_RATES = 5;

/**
 * Modest home scoring multiplier. Conservative and a PARAMETER, because we do
 * not yet claim a calibrated home-field advantage — calibration (engine roadmap
 * step 2: optimize on CLV) tunes this. ~1.10 is the low end of widely-reported
 * soccer/hockey home scoring lift.
 */
export const DEFAULT_HOME_ADVANTAGE = 1.1;

/** Sport-key prefixes (The Odds API style) where independent Poisson is valid. */
const POISSON_VALID_PREFIXES = ["soccer", "icehockey", "baseball"] as const;

/** One real, completed game from a single team's perspective. */
export interface TeamGameRecord {
  readonly teamScore: number; // points / goals / runs the team scored
  readonly opponentScore: number; // and conceded
  readonly isBootstrap?: boolean; // drawn from bootstrap-era logs?
}

export interface TeamScoringRates {
  readonly gamesUsed: number;
  readonly scoredPerGame: number;
  readonly allowedPerGame: number;
  /** Share of the sample from bootstrap-era logs, 0–1 (a trust signal). */
  readonly bootstrapShare: number;
}

export interface MatchupLambdas {
  readonly lambdaHome: number;
  readonly lambdaAway: number;
}

export interface PoissonFairValueInput {
  readonly sportKey: string;
  readonly homeRecords: readonly TeamGameRecord[];
  readonly awayRecords: readonly TeamGameRecord[];
  /** Average goals/runs a single team scores per game across the league (real). */
  readonly leagueAvgScored: number;
  readonly minGames?: number;
  readonly homeAdvantage?: number;
}

export interface PoissonFairValue {
  readonly homeFairProb: number; // 2-way (draw removed), 0–1
  readonly awayFairProb: number;
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly homeGames: number;
  readonly awayGames: number;
  /** max of the two teams' bootstrap share — the weaker-provenance side. */
  readonly bootstrapShare: number;
}

function round(v: number, d = 4): number {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

export function isPoissonValidSport(sportKey: string): boolean {
  const k = sportKey.toLowerCase();
  return POISSON_VALID_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * Average a team's real scored/allowed per game. Returns null below `minGames`
 * usable records — we never publish a rate off a handful of games.
 */
export function computeTeamScoringRates(
  records: readonly TeamGameRecord[],
  minGames: number = MIN_GAMES_FOR_RATES,
): TeamScoringRates | null {
  const valid = records.filter(
    (r) =>
      Number.isFinite(r.teamScore) &&
      Number.isFinite(r.opponentScore) &&
      r.teamScore >= 0 &&
      r.opponentScore >= 0,
  );
  // Floor the required sample at 1 real game: a minGames <= 0 (or NaN) must
  // never let an empty / all-invalid sample slip through to a 0/0 = NaN rate.
  // `!(length >= floor)` also fails closed when floor is NaN.
  const floor = Math.max(1, Math.trunc(minGames));
  if (!(valid.length >= floor)) return null;

  const n = valid.length;
  const scored = valid.reduce((s, r) => s + r.teamScore, 0) / n;
  const allowed = valid.reduce((s, r) => s + r.opponentScore, 0) / n;
  const bootstrapCount = valid.filter((r) => r.isBootstrap === true).length;

  return {
    gamesUsed: n,
    scoredPerGame: round(scored),
    allowedPerGame: round(allowed),
    bootstrapShare: round(bootstrapCount / n),
  };
}

/**
 * Maher-style attack/defense λ relative to the league average:
 *   attack  = team scored  / leagueAvg
 *   defense = team allowed / leagueAvg
 *   λhome = leagueAvg · homeAttack · awayDefense · HFA
 *   λaway = leagueAvg · awayAttack · homeDefense
 * Returns null for a degenerate league anchor.
 */
export function estimateMatchupLambdas(
  homeRates: TeamScoringRates,
  awayRates: TeamScoringRates,
  leagueAvgScored: number,
  homeAdvantage: number = DEFAULT_HOME_ADVANTAGE,
): MatchupLambdas | null {
  if (!(leagueAvgScored > 0)) return null;

  const homeAttack = homeRates.scoredPerGame / leagueAvgScored;
  const homeDefense = homeRates.allowedPerGame / leagueAvgScored;
  const awayAttack = awayRates.scoredPerGame / leagueAvgScored;
  const awayDefense = awayRates.allowedPerGame / leagueAvgScored;

  const lambdaHome = leagueAvgScored * homeAttack * awayDefense * homeAdvantage;
  const lambdaAway = leagueAvgScored * awayAttack * homeDefense;

  if (!(lambdaHome > 0) || !(lambdaAway > 0)) return null;
  return { lambdaHome, lambdaAway };
}

/**
 * Independent 2-way moneyline fair value from Poisson team rates. Returns null —
 * the edge engine's honest default of no opinion — whenever the model is not
 * defensible: wrong sport, too few real games, or degenerate λ. Draw mass is
 * removed and the two sides renormalised, so the output is directly comparable
 * to the sportsbook's de-vigged 2-way H2H fair probability and drops straight
 * into `context.independentFairValues` as a `{ source: "poisson" }` estimate.
 */
export function poissonIndependentFairValue(
  input: PoissonFairValueInput,
): PoissonFairValue | null {
  if (!isPoissonValidSport(input.sportKey)) return null;

  const homeRates = computeTeamScoringRates(input.homeRecords, input.minGames);
  const awayRates = computeTeamScoringRates(input.awayRecords, input.minGames);
  if (!homeRates || !awayRates) return null;

  const lambdas = estimateMatchupLambdas(
    homeRates,
    awayRates,
    input.leagueAvgScored,
    input.homeAdvantage,
  );
  if (!lambdas) return null;

  // assertTeamRatesAvailable() fires inside here — the production master switch.
  const { home, away } = moneylineProbabilities(lambdas.lambdaHome, lambdas.lambdaAway);
  const twoWay = home + away;
  if (!(twoWay > 0)) return null;

  return {
    homeFairProb: round(home / twoWay),
    awayFairProb: round(away / twoWay),
    lambdaHome: round(lambdas.lambdaHome),
    lambdaAway: round(lambdas.lambdaAway),
    homeGames: homeRates.gamesUsed,
    awayGames: awayRates.gamesUsed,
    bootstrapShare: Math.max(homeRates.bootstrapShare, awayRates.bootstrapShare),
  };
}
