/**
 * Performance considerations on execution of large scale workflow applications on cloud functions
 *
 * arXiv:1909.03555v1 · lane:data_infra · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt a trigger-based serverless burst playbook: when a GSE batch job exceeds 2 hours wall-clock
 * or 8 vCPU-hours, run the ported benchmark harness (achieved-parallelism curve, wall-clock
 * mean/SD, cold-start rate, cost per unit work) and burst serverless only if it beats the VM on
 * wall-clock at <=1.5x cost; never quote the paper's 2019 figures as current.
 *
 * ACCEPTANCE GATE: ADAPT the benchmark methodology (not the 2019 numbers) if a GSE batch job is identified that
 * exceeds the 2-hour/8-vCPU-hour trigger; additionally benchmark cold-start-aware inference cost
 * (serialized XGBoost/ONNX payload, p50/p99 latency vs provisioned-concurrency cost) for live
 * endpoints.
 *
 * Ingest role: feature builder (canonical Elo rating store + win probability).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1909.03555v1" as const;
export const LANE = "data_infra" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the benchmark methodology (not the 2019 numbers) if a GSE batch job is identified that
 * exceeds the 2-hour/8-vCPU-hour trigger; additionally benchmark cold-start-aware inference cost
 * (serialized XGBoost/ONNX payload, p50/p99 latency vs provisioned-concurrency cost) for live
 * endpoints.`;

export const CONFIG = {
  enabled: false,
  kFactor: 20,
  homeAdvantage: 65,
  scale: 400,
  initRating: 1500,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface EloTable {
  readonly ratings: Readonly<Record<string, number>>;
  readonly gamesPlayed: Readonly<Record<string, number>>;
}

/** Expected score for A vs B. */
export function expectedScore(ratingA: number, ratingB: number, scale = 400): number | null {
  if (![ratingA, ratingB, scale].every(isFiniteNumber) || scale <= 0) return null;
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / scale));
}

/** Win probability with home advantage added to the home rating. */
export function winProb(homeRating: number, awayRating: number, homeAdv = 65, scale = 400): number | null {
  return expectedScore(homeRating + homeAdv, awayRating, scale);
}

/** Elo update for one game. Margin-of-victory multiplier optional. */
export function eloUpdate(
  rating: number,
  expected: number,
  actual: number,
  k = 20,
  movMult = 1,
): number | null {
  if (![rating, expected, actual, k, movMult].every(isFiniteNumber)) return null;
  if (expected < 0 || expected > 1 || actual < 0 || actual > 1 || k <= 0 || movMult <= 0) return null;
  return rating + k * movMult * (actual - expected);
}

/** Apply one game result to a rating table (pure: returns a new table). */
export function applyGame(
  table: EloTable,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
  k = 20,
  homeAdv = 65,
): EloTable | null {
  if (typeof home !== "string" || typeof away !== "string" || home === away) return null;
  if (![homeScore, awayScore, k, homeAdv].every(isFiniteNumber)) return null;
  const rh = table.ratings[home] ?? 1500;
  const ra = table.ratings[away] ?? 1500;
  const expH = winProb(rh, ra, homeAdv);
  if (expH === null) return null;
  const actualH = homeScore > awayScore ? 1 : homeScore < awayScore ? 0 : 0.5;
  const nh = eloUpdate(rh, expH, actualH, k);
  const na = eloUpdate(ra, 1 - expH, 1 - actualH, k);
  if (nh === null || na === null) return null;
  return {
    ratings: { ...table.ratings, [home]: nh, [away]: na },
    gamesPlayed: {
      ...table.gamesPlayed,
      [home]: (table.gamesPlayed[home] ?? 0) + 1,
      [away]: (table.gamesPlayed[away] ?? 0) + 1,
    },
  };
}

/** Empty table. */
export function emptyTable(): EloTable {
  return { ratings: {}, gamesPlayed: {} };
}
