/**
 * V6 — Generalized Poisson TD model.
 *
 * Trailing Bayesian-blended team ratings → generalized Poisson touchdown
 * counts (under-dispersed) → rare-event scoring (FG Poisson, safety Bernoulli,
 * XP conditional, OT separate) → matchup simulation.
 *
 * Home-field is an explicit fit parameter (never hardcoded 10%).
 *
 * COMPOSES WITH: nflverse-cache (game inputs), V4 deterministic-replay
 * (seeded RNG, replay of simulated games).
 */

import { seededRng } from "../backtest/deterministic-replay.js";
import { poissonPmf } from "../poisson.js";

export interface TeamGame {
  readonly teamId: string;
  readonly opponentId: string;
  /** TDs scored by `teamId` in this game. Null → missing, never imputed. */
  readonly touchdowns: number | null;
  /** TDs allowed by `teamId` in this game. Null → missing, never imputed. */
  readonly touchdownsAllowed: number | null;
  /** Offensive drives (or plays) used for rate denominators. */
  readonly drives: number | null;
  readonly kickoff: string;
  readonly home: boolean;
}

export interface TeamRating {
  readonly teamId: string;
  /** Bayesian posterior mean TDs scored per game. */
  readonly tdForRate: number;
  /** Bayesian posterior mean TDs allowed per game. */
  readonly tdAgainstRate: number;
  /** Posterior SD of tdForRate (larger with less evidence). */
  readonly tdForUncertainty: number;
  readonly tdAgainstUncertainty: number;
  readonly gamesUsed: number;
  readonly window: number;
}

export interface MatchupParams {
  readonly home: TeamRating;
  readonly away: TeamRating;
  /** Home-field TD rate multiplier — fit externally, never hardcoded. */
  readonly homeFieldMultiplier: number;
  /** FG rate per game (league prior used when team-specific data missing). */
  readonly homeFgRate: number;
  readonly awayFgRate: number;
  readonly homeSafetyRate: number;
  readonly awaySafetyRate: number;
  /** P(successful XP | TD) — conditional on TD having scored. */
  readonly xpSuccessRate: number;
  /** P(home wins in OT | regulation tied). */
  readonly homeOtWinProb: number;
  /** Total-points line for pOver; null → pOver is null (never imputed). */
  readonly totalLine: number | null;
  /** Home spread (negative = home favored). */
  readonly spread: number;
}

export interface SimulateResult {
  readonly pHomeWin: number;
  readonly pCover: number | null;
  readonly pOver: number | null;
  readonly scoreDist: readonly {
    readonly homeScore: number;
    readonly awayScore: number;
    readonly probability: number;
  }[];
  readonly n: number;
  readonly homeFieldMultiplier: number;
}

// ── Generalized Poisson ─────────────────────────────────────────────────────

/**
 * Generalized Poisson PMF (Consul-Jain) for under-dispersed counts.
 * `lambda` is the mean shift parameter; `theta` in (-1, 1] controls dispersion.
 * theta = 0 recovers the ordinary Poisson.
 */
export function generalizedPoisson(k: number, theta: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  if (!Number.isFinite(lambda) || lambda <= 0) return 0;
  if (!Number.isFinite(theta) || theta <= -1 || theta > 1) return 0;

  // Ordinary Poisson limit
  if (Math.abs(theta) < 1e-12) return poissonPmf(k, lambda);

  const mean = lambda / (1 - theta);
  // Support: k = 0, 1, ... when theta >= 0; k <= floor(lambda / |theta|) when theta < 0
  if (theta < 0 && k > Math.floor(lambda / -theta + 1e-9)) return 0;

  const inner = lambda + k * theta;
  if (inner <= 0) return 0;

  const logP =
    Math.log(lambda) +
    (k - 1) * Math.log(inner) -
    inner -
    logFactorial(k);
  return Math.exp(logP);
}

function logFactorial(n: number): number {
  if (n <= 1) return 0;
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

// ── Trailing ratings with Bayesian blending ─────────────────────────────────

/**
 * Trailing team ratings over `window` most recent games, blended toward a
 * league prior with strength proportional to evidence. Missing TD counts are
 * excluded from the rate (never imputed).
 */
export function trailingRatings(
  teamId: string,
  games: readonly TeamGame[],
  window = 12,
): TeamRating {
  const teamGames = games
    .filter((g) => g.teamId === teamId)
    .slice()
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
    .slice(-Math.max(1, window));

  // League prior: mild TD rates, large uncertainty
  const priorFor = 1.5;
  const priorAgainst = 1.5;
  const priorStrength = 4; // pseudo-games

  let forSum = 0;
  let forN = 0;
  let againstSum = 0;
  let againstN = 0;

  for (const g of teamGames) {
    if (g.touchdowns !== null && Number.isFinite(g.touchdowns) && g.touchdowns >= 0) {
      forSum += g.touchdowns;
      forN += 1;
    }
    if (
      g.touchdownsAllowed !== null &&
      Number.isFinite(g.touchdownsAllowed) &&
      g.touchdownsAllowed >= 0
    ) {
      againstSum += g.touchdownsAllowed;
      againstN += 1;
    }
  }

  const tdForRate =
    forN === 0 ? priorFor : (priorFor * priorStrength + forSum) / (priorStrength + forN);
  const tdAgainstRate =
    againstN === 0
      ? priorAgainst
      : (priorAgainst * priorStrength + againstSum) / (priorStrength + againstN);

  const tdForUncertainty = Math.sqrt(tdForRate / (priorStrength + forN + 1));
  const tdAgainstUncertainty = Math.sqrt(tdAgainstRate / (priorStrength + againstN + 1));

  return {
    teamId,
    tdForRate: round4(tdForRate),
    tdAgainstRate: round4(tdAgainstRate),
    tdForUncertainty: round4(tdForUncertainty),
    tdAgainstUncertainty: round4(tdAgainstUncertainty),
    gamesUsed: teamGames.length,
    window,
  };
}

/**
 * Fit home-field multiplier from observed home/away TD rates.
 * Returns null when there is insufficient data — never invents 10%.
 */
export function fitHomeFieldMultiplier(games: readonly TeamGame[]): number | null {
  let homeTd = 0;
  let homeN = 0;
  let awayTd = 0;
  let awayN = 0;
  for (const g of games) {
    if (g.touchdowns === null || !Number.isFinite(g.touchdowns)) continue;
    if (g.home) {
      homeTd += g.touchdowns;
      homeN += 1;
    } else {
      awayTd += g.touchdowns;
      awayN += 1;
    }
  }
  if (homeN < 3 || awayN < 3) return null;
  const homeRate = homeTd / homeN;
  const awayRate = awayTd / awayN;
  if (awayRate <= 0) return null;
  return round4(homeRate / awayRate);
}

// ── Rare events ─────────────────────────────────────────────────────────────

export interface RareEventRates {
  /** FG per game (Poisson). */
  readonly fgRate: number;
  /** Safety per game (Bernoulli). */
  readonly safetyRate: number;
  /** P(XP good | TD). */
  readonly xpSuccess: number;
  /** P(home wins | OT). */
  readonly homeOtWin: number;
}

export interface RareEventSample {
  readonly fgs: number;
  readonly safety: boolean;
  readonly xpsMade: number;
  readonly xpsAttempted: number;
}

/**
 * Sample rare scoring events. FG ~ Poisson(fgRate); safety ~ Bernoulli;
 * XP is conditional on TDs scored (passed in); OT handled separately.
 */
export function sampleRareEvents(
  rates: RareEventRates,
  tdCount: number,
  rng: () => number,
): RareEventSample {
  const fgs = samplePoisson(Math.max(0, rates.fgRate), rng);
  const safety = rng() < Math.min(1, Math.max(0, rates.safetyRate));
  let xpsMade = 0;
  for (let i = 0; i < tdCount; i++) {
    if (rng() < Math.min(1, Math.max(0, rates.xpSuccess))) xpsMade += 1;
  }
  return { fgs, safety, xpsMade, xpsAttempted: tdCount };
}

function samplePoisson(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

// ── Matchup simulation ──────────────────────────────────────────────────────

export interface TeamSimInput {
  readonly rating: TeamRating;
  readonly fgRate: number | null;
  readonly safetyRate: number | null;
}

/**
 * Build matchup parameters from two team ratings.
 * `homeFieldMultiplier` must be supplied (from fitHomeFieldMultiplier or a
 * held-out GSE fit). If null, fail-closed — caller must decide.
 */
export function buildMatchup(
  home: TeamRating,
  away: TeamRating,
  opts: {
    readonly homeFieldMultiplier: number | null;
    readonly spread: number;
    readonly totalLine: number | null;
    readonly homeFgRate?: number | null;
    readonly awayFgRate?: number | null;
    readonly homeSafetyRate?: number | null;
    readonly awaySafetyRate?: number | null;
    readonly xpSuccessRate?: number;
    readonly homeOtWinProb?: number;
  },
): MatchupParams | null {
  if (
    opts.homeFieldMultiplier === null ||
    !Number.isFinite(opts.homeFieldMultiplier) ||
    opts.homeFieldMultiplier <= 0
  ) {
    return null;
  }
  return {
    home,
    away,
    homeFieldMultiplier: opts.homeFieldMultiplier,
    spread: opts.spread,
    totalLine: opts.totalLine,
    homeFgRate: opts.homeFgRate ?? 1.8,
    awayFgRate: opts.awayFgRate ?? 1.8,
    homeSafetyRate: opts.homeSafetyRate ?? 0.08,
    awaySafetyRate: opts.awaySafetyRate ?? 0.08,
    xpSuccessRate: opts.xpSuccessRate ?? 0.94,
    homeOtWinProb: opts.homeOtWinProb ?? 0.5,
  };
}

/**
 * Simulate a matchup n times. Returns moneyline, cover, over/under, and the
 * empirical score distribution. Deterministic when `seed` is supplied.
 */
export function simulateMatchup(
  params: MatchupParams,
  n = 5000,
  seed?: number,
): SimulateResult {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("simulateMatchup: n must be a positive integer");
  }
  const rng = seed === undefined ? Math.random : seededRng(seed);

  // Expected TDs: blend offensive rate against defensive rate, apply home field
  const homeTdMean = Math.max(
    0.15,
    0.5 * (params.home.tdForRate + params.away.tdAgainstRate) * params.homeFieldMultiplier,
  );
  const awayTdMean = Math.max(
    0.15,
    0.5 * (params.away.tdForRate + params.home.tdAgainstRate) / params.homeFieldMultiplier,
  );

  // Under-dispersion for TD counts (Consul-Jain theta near 0.1)
  const theta = 0.1;
  // Convert mean to generalized-Poisson lambda: mean = lambda / (1 - theta)
  const homeLambda = homeTdMean * (1 - theta);
  const awayLambda = awayTdMean * (1 - theta);

  let homeWins = 0;
  let covers = 0;
  let coverN = 0;
  let overs = 0;
  let overN = 0;
  const scoreCounts = new Map<string, { homeScore: number; awayScore: number; count: number }>();

  for (let i = 0; i < n; i++) {
    const homeTd = sampleGeneralizedPoisson(homeLambda, theta, rng);
    const awayTd = sampleGeneralizedPoisson(awayLambda, theta, rng);

    const homeRare = sampleRareEvents(
      {
        fgRate: params.homeFgRate,
        safetyRate: params.homeSafetyRate,
        xpSuccess: params.xpSuccessRate,
        homeOtWin: params.homeOtWinProb,
      },
      homeTd,
      rng,
    );
    const awayRare = sampleRareEvents(
      {
        fgRate: params.awayFgRate,
        safetyRate: params.awaySafetyRate,
        xpSuccess: params.xpSuccessRate,
        homeOtWin: 1 - params.homeOtWinProb,
      },
      awayTd,
      rng,
    );

    let homeScore = homeTd * 7 + homeRare.fgs * 3 + homeRare.xpsMade;
    // XP already counted in xpsMade; TD base 7 includes 6 + 1. Subtract missing XPs:
    homeScore = homeTd * 6 + homeRare.xpsMade + homeRare.fgs * 3;
    if (homeRare.safety) homeScore += 2;

    let awayScore = awayTd * 6 + awayRare.xpsMade + awayRare.fgs * 3;
    if (awayRare.safety) awayScore += 2;

    // OT: only if regulation tied
    if (homeScore === awayScore) {
      if (rng() < params.homeOtWinProb) homeScore += 3;
      else awayScore += 3;
    }

    if (homeScore > awayScore) homeWins += 1;

    const margin = homeScore - awayScore;
    // Cover: home covers if margin > -spread (spread negative means home favored)
    coverN += 1;
    if (margin > -params.spread) covers += 1;

    if (params.totalLine !== null && Number.isFinite(params.totalLine)) {
      overN += 1;
      if (homeScore + awayScore > params.totalLine) overs += 1;
    }

    const key = `${homeScore}:${awayScore}`;
    const entry = scoreCounts.get(key);
    if (entry) entry.count += 1;
    else scoreCounts.set(key, { homeScore, awayScore, count: 1 });
  }

  const scoreDist = [...scoreCounts.values()]
    .map((e) => ({
      homeScore: e.homeScore,
      awayScore: e.awayScore,
      probability: round4(e.count / n),
    }))
    .sort((a, b) => b.probability - a.probability);

  return {
    pHomeWin: round4(homeWins / n),
    pCover: coverN > 0 ? round4(covers / coverN) : null,
    pOver: overN > 0 ? round4(overs / overN) : null,
    scoreDist,
    n,
    homeFieldMultiplier: params.homeFieldMultiplier,
  };
}

function sampleGeneralizedPoisson(lambda: number, theta: number, rng: () => number): number {
  // Inverse-CDF sampling via PMF search (support is small for TD counts)
  let cum = 0;
  const u = rng();
  for (let k = 0; k <= 12; k++) {
    cum += generalizedPoisson(k, theta, lambda);
    if (u <= cum) return k;
  }
  return 12;
}

function round4(x: number): number {
  return Number(x.toFixed(4));
}
