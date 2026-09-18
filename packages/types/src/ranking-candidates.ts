/**
 * Candidate board orderings, as pure comparators.
 *
 * WHY THIS EXISTS. The live board is ordered, in part and sometimes entirely, on
 * `confidence`, which is measurably ANTI-PREDICTIVE at the top: over settled published
 * non-bootstrap picks with pushes excluded, confidence 80+ (n 2,385) claims 0.8663 and
 * realizes 0.5191, a gap of -0.3472 at z = -10.7, and realized win rate PEAKS at 75-79
 * then FALLS to 0.4643 by 90-94, below the lowest band. On one measured slate the
 * top-ranked pick carried `expectedClv` +0.0217, the SMALLEST positive edge on the board,
 * while confidence 85 carried +0.2257, the largest.
 *
 * Nothing here is wired. These are candidates for a shadow report that shows what each
 * ordering WOULD have done on settled slates, so the founder's decision is evidence-led.
 * Wiring one is a separate, founder-gated step.
 *
 * DESIGN NOTES that must survive future edits:
 *
 * 1. ABSENCE IS NEVER ZERO. A row with no finite edge estimate trails as a block; it never
 *    sorts as 0.0. This matters because a CONTRADICTS row carries `expectedClv` 0.0 BY
 *    CONSTRUCTION, so zero is a real, meaningful value that must not absorb absent ones.
 *
 * 2. EVERY COMPARATOR IS TOTAL AND STABLE. Equal rows return 0 and keep their input order,
 *    so a comparison never reports a difference that is really sort instability.
 *
 * 3. THE FEATURED PIN IS DELIBERATELY EXCLUDED from the candidates and present only in
 *    `orderingCurrent`, which must reproduce the live comparator. Applying a pin to one
 *    candidate and not the others would confound the comparison; applying it identically
 *    to all of them adds nothing. It is layered back at wire time.
 */

/** Source tag the engine persists beside `rankingP` (see ranking-prob.ts). */
export type RankingSource =
  | "confidence"
  | "independent_trueProb"
  | "blend_indep_conf";

/**
 * The minimal row every candidate ordering reads.
 *
 * Fields are optional because the real rows genuinely lack them: a model-signal pick has
 * no `marketFairProb`, a pre-v5.2.1 row has no `rankingSource`, and a row whose factor
 * breakdown will not parse has none of them. Optionality here is honesty, not laziness.
 */
export interface RankingRow {
  /** 0-100 heuristic factor sum. Never a probability. */
  readonly confidence: number;
  /** Engine's own expectation of beating the close, in probability points. */
  readonly expectedClv?: number | null;
  /** Independent blended estimate of P(side), 0-1. */
  readonly trueProb?: number | null;
  /** De-vigged book fair value for the side, 0-1. Null when no real book priced it. */
  readonly marketFairProb?: number | null;
  /** Persisted ranking probability, 0-1. */
  readonly rankingP?: number | null;
  /** Persisted 0-100 scale of rankingP. */
  readonly rankingScore?: number | null;
  /** Which path produced rankingP. Absent on pre-v5.2.1 rows. */
  readonly rankingSource?: RankingSource | null;
  /** Live board pins featured rows first. Only `orderingCurrent` reads it. */
  readonly isFeatured?: boolean;
  /** Recency stamp, milliseconds since epoch. Newer first on ties. */
  readonly generatedAtMs?: number | null;
}

export type RankingComparator = (a: RankingRow, b: RankingRow) => number;

function finite(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function recency(a: RankingRow, b: RankingRow): number {
  const ta = finite(a.generatedAtMs) ?? 0;
  const tb = finite(b.generatedAtMs) ?? 0;
  return tb - ta;
}

/** trueProb minus marketFairProb, or null when either side is missing. */
export function modelMinusMarket(row: RankingRow): number | null {
  const t = finite(row.trueProb);
  const m = finite(row.marketFairProb);
  return t === null || m === null ? null : t - m;
}

/**
 * True when the engine priced this row rather than falling back to confidence.
 *
 * An ABSENT `rankingSource` reads as unpriced, which is correct for two real populations:
 * the TOTAL path never calls `deriveRankingProbability` and writes `rankingP` straight from
 * confidence, and any row minted before v5.2.1 carries no source at all.
 */
export function isPricedRow(row: RankingRow): boolean {
  return (
    row.rankingSource === "independent_trueProb" ||
    row.rankingSource === "blend_indep_conf"
  );
}

/**
 * Today's live ordering, reproduced exactly: featured pin, then rankingP, then
 * rankingScore/100, then confidence/100, then newer first.
 *
 * This is the baseline the shadow report measures every candidate against, so it must
 * match `apps/web/lib/ranking/sort-key.ts` including its clamps and its fallback chain.
 */
export const orderingCurrent: RankingComparator = (a, b) => {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;

  const key = (r: RankingRow): number => {
    const p = finite(r.rankingP);
    if (p !== null) return clamp01(p);
    const s = finite(r.rankingScore);
    if (s !== null) return clamp01(s / 100);
    const c = finite(r.confidence);
    return c === null ? 0 : c / 100;
  };
  const ka = key(a);
  const kb = key(b);
  if (ka !== kb) return kb - ka;
  return recency(a, b);
};

/**
 * Shared trailing rule: a row with no finite positive edge estimate sorts BELOW every row
 * that has one, and keeps its input order among the other trailing rows.
 *
 * Returns null when both rows carry a value and the caller should compare them.
 */
function trailingBlock(av: number | null, bv: number | null): number | null {
  const ah = av !== null;
  const bh = bv !== null;
  if (ah && bh) return null;
  if (!ah && !bh) return 0;
  return ah ? -1 : 1;
}

/** Descending `expectedClv`; ties by model minus market, then newer first. */
export const orderingEdgeFirst: RankingComparator = (a, b) => {
  const ea = finite(a.expectedClv);
  const eb = finite(b.expectedClv);
  const trail = trailingBlock(ea, eb);
  if (trail !== null) return trail;
  if (ea !== eb) return (eb as number) - (ea as number);

  const ma = modelMinusMarket(a);
  const mb = modelMinusMarket(b);
  const mTrail = trailingBlock(ma, mb);
  if (mTrail !== null && mTrail !== 0) return mTrail;
  if (ma !== null && mb !== null && ma !== mb) return mb - ma;

  return recency(a, b);
};

/** Descending `trueProb` minus `marketFairProb`; same trailing rule, then newer first. */
export const orderingModelMinusMarket: RankingComparator = (a, b) => {
  const ma = modelMinusMarket(a);
  const mb = modelMinusMarket(b);
  const trail = trailingBlock(ma, mb);
  if (trail !== null) return trail;
  if (ma !== mb) return (mb as number) - (ma as number);
  return recency(a, b);
};

/**
 * Two tiers, so a PRICED row is never compared against an UNPRICED one on a single scalar.
 *
 * That collision is the mechanism behind the measured inversion: a confidence 91 row no
 * independent model ever looked at outranks a trueProb 0.62 row that one did, because both
 * land on the same 0-1 scale. Tier 1 always precedes tier 2.
 *
 * WITHIN TIER 1, ORDER BY EDGE. Founder decision, 2026-09-18. Ranking by P(side) and
 * ranking by edge are genuinely different orderings on the same slate, and the founder
 * chose edge.
 *
 * Tier 2 keeps its input order: these rows have no trustworthy basis for an ordering, and
 * inventing one would be the same error one level down.
 *
 * This is the only candidate that needs no engine edit and no MODEL_VERSION bump, because
 * `rankingSource` is already persisted on every row the engine mints.
 */
export const orderingPricedTierFirst: RankingComparator = (a, b) => {
  const pa = isPricedRow(a) ? 1 : 0;
  const pb = isPricedRow(b) ? 1 : 0;
  if (pa !== pb) return pb - pa;
  if (pa === 0) return 0;
  return orderingEdgeFirst(a, b);
};

/** Every candidate, by name, for the shadow report to iterate. */
export const RANKING_CANDIDATES: Readonly<Record<string, RankingComparator>> = {
  current: orderingCurrent,
  pricedTierFirst: orderingPricedTierFirst,
  edgeFirst: orderingEdgeFirst,
  modelMinusMarket: orderingModelMinusMarket,
};
