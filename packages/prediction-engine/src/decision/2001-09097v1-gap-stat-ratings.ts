// ============================================================
// GAP-for-NFL: 4-way team ratings on intermediate stats (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (walk-forward Brier -0.005, CLV +0.3, ROI CI excludes zero) to pass, plus
 * a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2001.09097v1 — "Forecasting football matches by predicting match statistics"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism (GAP rating): each team carries attacking and defensive
 * ratings split by venue (home/away); ratings update exponentially from the
 * gap between observed and expected intermediate match statistics
 * (paper Eq. 7-8 analogues); predicted stat differentials then feed
 * logistic models for match outcomes.
 *
 * IMPROVEMENT (from ledger): Build GAP-for-NFL: per-team 4-way ratings
 * (home/away offense/defense) on intermediate measures (EPA/play, pressure
 * rate, first-down rate, explosive-play rate) updated via Eq. 7-8 analogues,
 * feeding predicted stat differentials into logistic models for win, spread
 * cover, and total.
 *
 * ACCEPTANCE GATE: Adopt if, on 2019-2024 walk-forward, the GAP-featured
 * model beats the market-only baseline by >=0.005 Brier points AND shows
 * positive CLV (mean line move in our favour >= +0.3 points) AND realised
 * ROI CI excludes zero under Level Stakes.
 */

export type Venue = "home" | "away";

/** One team's 4-way rating for a single intermediate stat: offense/defense × venue. */
export interface GapEntry {
  offHome: number;
  offAway: number;
  defHome: number;
  defAway: number;
}

/** GAP table for one intermediate stat: team -> 4-way ratings. */
export type GapTable = Record<string, GapEntry>;

/** Intermediate measures tracked by GAP-for-NFL. */
export const GAP_STATS = ["epaPerPlay", "pressureRate", "firstDownRate", "explosiveRate"] as const;
export type GapStat = (typeof GAP_STATS)[number];

const blankEntry = (): GapEntry => ({ offHome: 0, offAway: 0, defHome: 0, defAway: 0 });

export function createGapTable(teams: string[]): GapTable {
  const t: GapTable = {};
  for (const team of teams) t[team] = blankEntry();
  return t;
}

export interface GapGameStat {
  homeTeam: string;
  awayTeam: string;
  /** Observed intermediate stat for the home team (e.g. EPA/play). */
  homeObserved: number;
  /** Observed intermediate stat for the away team. */
  awayObserved: number;
}

/**
 * Eq. 7-8 analogues: exponential update of the 4-way ratings from the
 * observed-vs-expected gap. Expected home stat = (homeOff_home +
 * awayDef_away)/2; each side updates its venue-specific offense/defense
 * toward the observation with learning rate k.
 */
export function updateGapTable(table: GapTable, game: GapGameStat, k = 0.08): GapTable {
  const next: GapTable = {};
  for (const [team, e] of Object.entries(table)) next[team] = { ...e };
  const h = next[game.homeTeam] ?? blankEntry();
  const a = next[game.awayTeam] ?? blankEntry();
  const expHome = (h.offHome + a.defAway) / 2;
  const expAway = (a.offAway + h.defHome) / 2;
  h.offHome += k * (game.homeObserved - expHome);
  a.defAway += k * (game.homeObserved - expHome);
  a.offAway += k * (game.awayObserved - expAway);
  h.defHome += k * (game.awayObserved - expAway);
  next[game.homeTeam] = h;
  next[game.awayTeam] = a;
  return next;
}

/**
 * Predicted stat differential for a matchup: expected home stat minus
 * expected away stat, from the 4-way ratings.
 */
export function predictStatDifferential(table: GapTable, homeTeam: string, awayTeam: string): number {
  const h = table[homeTeam] ?? blankEntry();
  const a = table[awayTeam] ?? blankEntry();
  const expHome = (h.offHome + a.defAway) / 2;
  const expAway = (a.offAway + h.defHome) / 2;
  return expHome - expAway;
}

/** Logistic link from a stat differential to a probability. */
export function logisticProb(differential: number, intercept: number, slope: number): number {
  return 1 / (1 + Math.exp(-(intercept + slope * differential)));
}

export interface GapOutcomeProbs {
  winProb: number;
  coverProb: number;
  overProb: number;
}

/**
 * Feed predicted stat differentials into logistic models for win, spread
 * cover, and total (over). Coefficients are fit offline on walk-forward
 * data; defaults are neutral placeholders (human call to fit).
 */
export function gapOutcomeProbs(
  statDiff: number,
  coefs = {
    win: { intercept: 0, slope: 1 },
    cover: { intercept: 0, slope: 1 },
    over: { intercept: 0, slope: 1 },
  },
): GapOutcomeProbs {
  return {
    winProb: logisticProb(statDiff, coefs.win.intercept, coefs.win.slope),
    coverProb: logisticProb(statDiff, coefs.cover.intercept, coefs.cover.slope),
    overProb: logisticProb(statDiff, coefs.over.intercept, coefs.over.slope),
  };
}

/** Gate helper: Brier gain >= 0.005 AND CLV >= +0.3 AND ROI CI excludes zero. */
export function gapGatePasses(brierGain: number, meanClv: number, roiCiLo: number, roiCiHi: number): boolean {
  return brierGain >= 0.005 && meanClv >= 0.3 && roiCiLo > 0 && roiCiHi > roiCiLo;
}
