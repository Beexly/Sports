/**
 * Market consensus q — and why Kaggle 3rd-place March Mania is not an edge.
 *
 * kevin1000's 2026 Mania writeup (Brier 0.116, #3/3485) won by publishing
 *   published = (1 − α) · p_LR + α · q_market
 * with α = 0.90 (men's R1) / 0.75 (women's R1). That is a **forecast**
 * product: markets already price injuries/travel, so Brier vs the outcome
 * drops. Residual edge vs the same market is
 *   (published − q) = (1 − α)(p − q)
 * so α = 0.90 leaves 10% of the independent gap. GSE fires on e = p − q,
 * never on a re-anchored published probability.
 *
 * What we do take, closed-form:
 *  1. Bradley-Terry pairwise from championship/futures strengths
 *     P(A beats B) = s_A / (s_A + s_B) when no game-specific board exists.
 *  2. Logit-weighted consensus of labeled q sources (their 60% Vegas /
 *     40% BPI mix) — as q, never as p.
 *  3. The residual-edge identity above, as a glass-box diagnostic.
 *
 * ESPN HTML scrape and sportsbook HTML scrape stay out. Callers supply
 * already-cleared probabilities.
 */

export interface LabeledQ {
  readonly id: string;
  readonly q: number;
  readonly weight: number;
}

export interface ConsensusQ {
  readonly q: number;
  readonly sourceIds: readonly string[];
  readonly n: number;
}

export interface ReanchorResidual {
  readonly independentEdge: number;
  readonly publishedP: number;
  readonly residualEdge: number;
  readonly marketWeight: number;
}

function assertUnit(p: number, label: string): void {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new RangeError(`${label} must be in (0, 1) (got ${p})`);
  }
}

function logit(p: number): number {
  const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(pc / (1 - pc));
}

function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Bradley-Terry pairwise win probability from positive strengths
 * (championship implied probs, Elo-as-strength, etc.).
 */
export function bradleyTerryPair(strengthA: number, strengthB: number): number {
  if (!Number.isFinite(strengthA) || !Number.isFinite(strengthB) || strengthA <= 0 || strengthB <= 0) {
    throw new RangeError(
      `bradleyTerryPair: strengths must be finite and > 0 (got ${strengthA}, ${strengthB})`,
    );
  }
  return strengthA / (strengthA + strengthB);
}

/**
 * Logit-weighted consensus of labeled market/model quotes. Fail closed
 * (null) when no positive-weight finite q remains. This is q, not p.
 */
export function consensusMarketQ(sources: readonly LabeledQ[]): ConsensusQ | null {
  if (sources.length === 0) return null;
  let num = 0;
  let den = 0;
  const ids: string[] = [];
  for (const s of sources) {
    if (typeof s.id !== "string" || s.id.length === 0) {
      throw new RangeError("consensusMarketQ: id must be a non-empty string");
    }
    if (!Number.isFinite(s.weight) || s.weight < 0) {
      throw new RangeError(`consensusMarketQ: weight must be finite and >= 0 (got ${s.weight})`);
    }
    if (s.weight === 0) continue;
    assertUnit(s.q, `consensusMarketQ[${s.id}].q`);
    num += s.weight * logit(s.q);
    den += s.weight;
    ids.push(s.id);
  }
  if (!(den > 0) || ids.length === 0) return null;
  return { q: sigmoid(num / den), sourceIds: ids, n: ids.length };
}

/**
 * Identity: blending p toward q with weight α shrinks edge by (1 − α).
 * The Mania 3rd-place R1 men's α = 0.90 → residual = 0.10 × (p − q).
 */
export function marketReanchorResidual(p: number, q: number, marketWeight: number): ReanchorResidual {
  assertUnit(p, "p");
  assertUnit(q, "q");
  if (!Number.isFinite(marketWeight) || marketWeight < 0 || marketWeight > 1) {
    throw new RangeError(`marketWeight must be in [0, 1] (got ${marketWeight})`);
  }
  const independentEdge = p - q;
  const publishedP = (1 - marketWeight) * p + marketWeight * q;
  return {
    independentEdge,
    publishedP,
    residualEdge: publishedP - q,
    marketWeight,
  };
}
