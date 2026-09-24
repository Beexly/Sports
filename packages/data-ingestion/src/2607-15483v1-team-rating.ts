/**
 * Risk-Aware Preference Learning for Stochastic Outcomes
 *
 * arXiv:2607.15483v1 · lane:team_ratings · verdict:ADAPT · owner:Mimo · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Pairwise-comparison rating machinery: Elo expected scores with zero-sum updates, log-scaled margin-of-victory K adjustment, and one minorization-maximization Bradley-Terry iteration from a wins matrix.
 *
 * Improvement (record):
 * Fit the Prelec probability-distortion curve w(p)=exp(-(-ln p)^gamma) from GSE engine probabilities to market-implied probabilities per market segment and switch the EV pipeline's edge selector to the CPT-adjusted edge when the fitted gamma sits significantly below 1.
 *
 * ACCEPTANCE GATE:
 * ADAPT into the EV pipeline if: (a) fitted gamma < 1 with 95% CI excluding 1 on the training window AND (b) the CPT-adjusted edge selector beats the naive edge selector by >=2pp ROI on the 2024-2025 holdout. REJECT if gamma ~= 1 or the CPT adjustment adds no ROI — the distortion must be measured, never assumed.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: rating updater / ranking builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2607.15483v1" as const;
export const LANE = "team_ratings" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT into the EV pipeline if: (a) fitted gamma < 1 with 95% CI excluding 1 on the training window AND (b) the CPT-adjusted edge selector beats the naive edge selector by >=2pp ROI on the 2024-2025 holdout. REJECT if gamma ~= 1 or the CPT adjustment adds no ROI — the distortion must be measured, never assumed.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Bradley-Terry/Elo expected score for A vs B. */
export function eloExpectedScore(rA: number, rB: number): number | null {
  if (!isFiniteNumber(rA) || !isFiniteNumber(rB)) return null;
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

/** Zero-sum Elo update; scoreA in [0,1]. */
export function eloUpdate(rA: number, rB: number, scoreA: number, k = 32): { a: number; b: number } | null {
  const e = eloExpectedScore(rA, rB);
  if (e === null) return null;
  if (!isFiniteNumber(scoreA) || scoreA < 0 || scoreA > 1) return null;
  if (!isFiniteNumber(k) || k <= 0) return null;
  const delta = k * (scoreA - e);
  return { a: rA + delta, b: rB - delta };
}

/** Margin-of-victory adjusted K factor (log-scaled blowout dampening). */
export function marginAdjustedK(baseK: number, margin: number): number | null {
  if (!isFiniteNumber(baseK) || baseK <= 0 || !isFiniteNumber(margin)) return null;
  return baseK * Math.log(1 + Math.abs(margin));
}

/**
 * One minorization-maximization iteration of Bradley-Terry strength estimation
 * from a pairwise wins matrix (wins[i][j] = times i beat j).
 */
export function bradleyTerryIteration(wins: number[][], ratings: number[]): number[] | null {
  const n = ratings.length;
  if (n === 0 || wins.length !== n) return null;
  if (!ratings.every((r) => isFiniteNumber(r) && r > 0)) return null;
  for (const row of wins) {
    if (!Array.isArray(row) || row.length !== n || !row.every((v) => isFiniteNumber(v) && v >= 0)) return null;
  }
  const totalWins = wins.map((row) => row.reduce((s, v) => s + v, 0));
  return ratings.map((ri, i) => {
    let denom = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const rowI = wins[i] as number[];
      const rowJ = wins[j] as number[];
      const rj = ratings[j] as number;
      const nij = (rowI[j] as number) + (rowJ[i] as number);
      if (nij > 0) denom += nij / (ri + rj);
    }
    const wi = totalWins[i] as number;
    if (denom === 0 || wi === 0) return ri;
    return wi / denom;
  });
}

/** Indices of ratings sorted strongest-first. */
export function rankingOrder(ratings: number[]): number[] | null {
  if (ratings.length === 0 || !ratings.every(isFiniteNumber)) return null;
  return ratings
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.i);
}
