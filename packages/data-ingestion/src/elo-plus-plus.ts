/**
 * Understanding and Pushing the Limits of the Elo Rating Algorithm
 *
 * arXiv:1910.06081v1 · lane:team_ratings · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt canonical GSE Elo (all 32 teams theta=0 init, logistic sigma=600, K~ = 0.06-0.125 tuned on
 * 2020-2025, home shift eta ~ 0.1-0.3, proper pre-game win probabilities Phi(Delta)) as the
 * standard online rater feeding the spread/ML engine, plus an Elo-vs-market diagnostic flagging
 * games where GSE's signal stack disagrees with market-implied strength.
 *
 * ACCEPTANCE GATE: ADAPT if, on the 2023-2025 holdout, the canonical Elo's log-loss <= naive Elo's AND the
 * calibration curve shows no bin with |observed - predicted| > 5% at n>=50 games per bin.
 *
 * Ingest role: feature builder (Elo++: HFA-by-team + MOV multiplier + offseason regression).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1910.06081v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if, on the 2023-2025 holdout, the canonical Elo's log-loss <= naive Elo's AND the
 * calibration curve shows no bin with |observed - predicted| > 5% at n>=50 games per bin.`;

export const CONFIG = {
  enabled: false,
  kBase: 20,
  movCap: 28,
  regressToMean: 0.33,
  teamHfa: true,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface EloPlusState {
  readonly ratings: Readonly<Record<string, number>>;
  readonly homeAdv: Readonly<Record<string, number>>;
  readonly gamesPlayed: Readonly<Record<string, number>>;
}

/** MOV multiplier: diminishing returns, capped (paper's raw-margin log form). */
export function movMultiplier(margin: number, eloDiff: number, cap = 28): number | null {
  if (![margin, eloDiff, cap].every(isFiniteNumber) || cap <= 0) return null;
  const m = Math.min(Math.abs(margin), cap);
  const denom = 0.001 * Math.max(1, Math.abs(eloDiff)) + 2.2;
  return Math.log(m + 1) * 2.2 / denom;
}

/** Expected score with team-specific home advantage. */
export function expectedScorePlus(ratingA: number, ratingB: number, hfaA: number, scale = 400): number | null {
  if (![ratingA, ratingB, hfaA, scale].every(isFiniteNumber) || scale <= 0) return null;
  return 1 / (1 + Math.pow(10, (ratingB - ratingA - hfaA) / scale));
}

/** Update home advantage estimate toward observed home overperformance. */
export function updateHomeAdv(
  hfa: number,
  expected: number,
  actual: number,
  kHfa = 2,
): number | null {
  if (![hfa, expected, actual, kHfa].every(isFiniteNumber) || kHfa <= 0) return null;
  if (expected < 0 || expected > 1 || actual < 0 || actual > 1) return null;
  return hfa + kHfa * (actual - expected);
}

/** Offseason regression toward the mean (1/3 of the way, per the paper's recipe). */
export function regressToMean(ratings: Readonly<Record<string, number>>, frac = 1 / 3, mean = 1500): Record<string, number> | null {
  if (!isFiniteNumber(frac) || frac < 0 || frac > 1 || !isFiniteNumber(mean)) return null;
  const out: Record<string, number> = {};
  for (const [t, r] of Object.entries(ratings)) {
    if (!isFiniteNumber(r)) return null;
    out[t] = r - frac * (r - mean);
  }
  return out;
}

/** Full Elo++ game update (pure). */
export function applyGamePlus(
  state: EloPlusState,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
  k = 20,
): EloPlusState | null {
  if (typeof home !== "string" || typeof away !== "string" || home === away) return null;
  if (![homeScore, awayScore, k].every(isFiniteNumber) || k <= 0) return null;
  const rh = state.ratings[home] ?? 1500;
  const ra = state.ratings[away] ?? 1500;
  const hfa = state.homeAdv[home] ?? 65;
  const expH = expectedScorePlus(rh, ra, hfa);
  if (expH === null) return null;
  const actualH = homeScore > awayScore ? 1 : homeScore < awayScore ? 0 : 0.5;
  const mov = movMultiplier(homeScore - awayScore, rh - ra);
  if (mov === null) return null;
  const nh = rh + k * mov * (actualH - expH);
  const na = ra + k * mov * ((1 - actualH) - (1 - expH));
  const nhfa = updateHomeAdv(hfa, expH, actualH);
  if (![nh, na, nhfa].every(isFiniteNumber) || nhfa === null) return null;
  return {
    ratings: { ...state.ratings, [home]: nh, [away]: na },
    homeAdv: { ...state.homeAdv, [home]: nhfa },
    gamesPlayed: {
      ...state.gamesPlayed,
      [home]: (state.gamesPlayed[home] ?? 0) + 1,
      [away]: (state.gamesPlayed[away] ?? 0) + 1,
    },
  };
}
