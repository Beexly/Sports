/**
 * CausalStock: Deep End-to-end Causal Discovery for News-driven Stock Movement Prediction
 *
 * arXiv:2411.06391v1 · lane:nlp · verdict:ADAPT · owner:Motif-lab · doctrine:SITUATIONAL
 *
 * Mechanism: Denoised-news 5-dimension scoring rubric (relevance, sentiment, novelty, credibility, impact) with exponential half-life aggregation over article age, lag-dependent decay weights, and directed steam-propagation edges across books for incremental graph updates.
 *
 * Improvement (record):
 * Port the denoised-news 5-dimension scoring rubric to NFL news features and use lag-dependent temporal causal discovery to build directed steam-propagation graphs across books, with online/incremental graph updating so steam-leadership can shift within a season (e.g., a book changes its risk desk).
 *
 * ACCEPTANCE GATE:
 * w/o-TCD ablation: 63.42% → 51.08% ACC on ACL18 (MCC 0.2172 → 0.0102). The causal module must prove a comparable ablation gap on GSE line data, or it stays out.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: news/steam feature builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2411.06391v1" as const;
export const LANE = "nlp" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `w/o-TCD ablation: 63.42% → 51.08% ACC on ACL18 (MCC 0.2172 → 0.0102). The causal module must prove a comparable ablation gap on GSE line data, or it stays out.`;

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

/** The five denoised-news scoring dimensions, each in [0,1]. */
export interface NewsDimensions {
  relevance: number;
  sentiment: number;
  novelty: number;
  credibility: number;
  impact: number;
}

const DIM_KEYS: Array<keyof NewsDimensions> = ["relevance", "sentiment", "novelty", "credibility", "impact"];

/**
 * Score one article on the 5-dimension rubric. Clamps to [0,1];
 * fail-closed (null) when any dimension is missing or non-finite.
 */
export function scoreNewsDimensions(raw: Partial<Record<keyof NewsDimensions, number>>): NewsDimensions | null {
  const out = {} as NewsDimensions;
  for (const k of DIM_KEYS) {
    const v = raw[k];
    if (!isFiniteNumber(v)) return null;
    out[k] = Math.min(1, Math.max(0, v));
  }
  return out;
}

/**
 * Aggregate article scores with exponential half-life decay over article age
 * (agesHours[i] = age of scores[i] in hours). Recent articles dominate.
 */
export function aggregateNewsScores(
  scores: NewsDimensions[],
  agesHours: number[],
  halfLifeHours: number,
): NewsDimensions | null {
  if (scores.length !== agesHours.length || scores.length === 0) return null;
  if (!isFiniteNumber(halfLifeHours) || halfLifeHours <= 0) return null;
  const lambda = Math.LN2 / halfLifeHours;
  const acc: NewsDimensions = { relevance: 0, sentiment: 0, novelty: 0, credibility: 0, impact: 0 };
  let wSum = 0;
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i] as NewsDimensions;
    const age = agesHours[i] as number;
    if (!isFiniteNumber(age) || age < 0) return null;
    for (const k of DIM_KEYS) {
      if (!isFiniteNumber(s[k])) return null;
    }
    const w = Math.exp(-lambda * age);
    wSum += w;
    for (const k of DIM_KEYS) acc[k] += w * (s[k] as number);
  }
  if (wSum === 0) return null;
  for (const k of DIM_KEYS) acc[k] /= wSum;
  return acc;
}

/** Lag-dependent temporal decay weight: exp(-decay * lagSteps); 1 at lag 0. */
export function lagDecayWeight(lagSteps: number, decay: number): number | null {
  if (!Number.isInteger(lagSteps) || lagSteps < 0) return null;
  if (!isFiniteNumber(decay) || decay < 0) return null;
  return Math.exp(-decay * lagSteps);
}

/**
 * Directed steam-propagation edge weight from one book's line move to another's:
 * sign-preserving move ratio decayed by the lag half-life. Positive when both
 * books move the same direction.
 */
export function steamPropagationEdge(
  fromMove: number,
  toMove: number,
  lagH: number,
  halfLifeH = 6,
): number | null {
  if (!isFiniteNumber(fromMove) || !isFiniteNumber(toMove)) return null;
  if (!isFiniteNumber(lagH) || lagH < 0) return null;
  if (!isFiniteNumber(halfLifeH) || halfLifeH <= 0) return null;
  if (fromMove === 0) return null;
  const direction = Math.sign(toMove) === Math.sign(fromMove) ? 1 : -1;
  return direction * Math.abs(toMove / fromMove) * Math.exp((-Math.LN2 * lagH) / halfLifeH);
}
