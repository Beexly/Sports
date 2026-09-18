/**
 * Candidate board orderings for the ranking shadow report.
 *
 * Pure. No I/O. None of these is live until the founder moves
 * RANKING_ORDERING_SWITCH off "current". orderingCurrent includes
 * the isFeatured pin (sort-key.ts:36,42,46) so a baseline missing
 * that pin is not the live comparator.
 *
 * Reciprocal with mainline queue task 3: that task pins the scalar
 * rankingSortKey paths; this module reproduces the FULL comparator.
 */

export type RankingSourceName =
  | "confidence"
  | "independent_trueProb"
  | "blend_indep_conf"
  | string
  | null;

export interface RankingCandidateRow {
  readonly id: string;
  /** Original input position — used so equal keys keep input order. */
  readonly inputIndex: number;
  readonly expectedClv: number | null;
  readonly trueProb: number | null;
  readonly marketFairProb: number | null;
  readonly rankingP: number | null;
  readonly rankingScore: number | null;
  readonly confidence: number;
  readonly generatedAt: string | Date | null;
  readonly isFeatured: boolean;
  readonly rankingSource: RankingSourceName;
}

export type RankingOrderingName =
  | "current"
  | "edge-first"
  | "model-minus-market"
  | "priced-tier-first";

/**
 * Committed switch. Default is today's board. Founder-only to move.
 * Not an env flag. Greppable. Needs a real commit to change.
 */
export const RANKING_ORDERING_SWITCH: RankingOrderingName = "current";

function recencyMs(row: RankingCandidateRow): number {
  if (row.generatedAt == null) return 0;
  const t = new Date(row.generatedAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

function finiteNumber(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Live scalar from sort-key.ts rankingSortKey — current-not-desired. */
export function currentRankingScalar(row: RankingCandidateRow): number {
  if (finiteNumber(row.rankingP)) return Math.min(1, Math.max(0, row.rankingP));
  if (finiteNumber(row.rankingScore)) {
    return Math.min(1, Math.max(0, row.rankingScore / 100));
  }
  const conf = finiteNumber(row.confidence) ? row.confidence / 100 : 0;
  return conf;
}

function modelMinusMarket(row: RankingCandidateRow): number | null {
  if (!finiteNumber(row.trueProb) || !finiteNumber(row.marketFairProb)) return null;
  return row.trueProb - row.marketFairProb;
}

function hasPositiveEdge(row: RankingCandidateRow): boolean {
  return finiteNumber(row.expectedClv) && row.expectedClv > 0;
}

function isPriced(row: RankingCandidateRow): boolean {
  return (
    row.rankingSource === "independent_trueProb" ||
    row.rankingSource === "blend_indep_conf"
  );
}

function cmpNumberDesc(a: number, b: number): number {
  if (a === b) return 0;
  return b - a;
}

function stableTail(a: RankingCandidateRow, b: RankingCandidateRow): number {
  return a.inputIndex - b.inputIndex;
}

function edgeThenModelThenRecency(
  a: RankingCandidateRow,
  b: RankingCandidateRow,
): number {
  const ea = finiteNumber(a.expectedClv) ? a.expectedClv : Number.NEGATIVE_INFINITY;
  const eb = finiteNumber(b.expectedClv) ? b.expectedClv : Number.NEGATIVE_INFINITY;
  const e = cmpNumberDesc(ea, eb);
  if (e !== 0) return e;
  const da = modelMinusMarket(a) ?? Number.NEGATIVE_INFINITY;
  const db = modelMinusMarket(b) ?? Number.NEGATIVE_INFINITY;
  const d = cmpNumberDesc(da, db);
  if (d !== 0) return d;
  const r = cmpNumberDesc(recencyMs(a), recencyMs(b));
  if (r !== 0) return r;
  return stableTail(a, b);
}

/**
 * Reproduces comparePicksByRanking in apps/web/lib/ranking/sort-key.ts:
 * featured pin first, then rankingP / rankingScore/100 / confidence/100
 * descending, then newer generatedAt, then input order.
 */
export function orderingCurrent(
  a: RankingCandidateRow,
  b: RankingCandidateRow,
): number {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;
  const ra = currentRankingScalar(a);
  const rb = currentRankingScalar(b);
  if (ra !== rb) return rb - ra;
  const ta = recencyMs(a);
  const tb = recencyMs(b);
  if (ta !== tb) return tb - ta;
  return stableTail(a, b);
}

/**
 * Finite positive expectedClv first, descending; missing/non-positive
 * rows trail as a block in their current relative order. Zero is a real
 * CONTRADICTS value and must not absorb absent ones.
 */
export function orderingEdgeFirst(
  a: RankingCandidateRow,
  b: RankingCandidateRow,
): number {
  const pa = hasPositiveEdge(a);
  const pb = hasPositiveEdge(b);
  if (pa !== pb) return pa ? -1 : 1;
  if (!pa && !pb) return stableTail(a, b);
  return edgeThenModelThenRecency(a, b);
}

/**
 * Descending trueProb - marketFairProb. Rows missing either trail as a
 * block in input order.
 */
export function orderingModelMinusMarket(
  a: RankingCandidateRow,
  b: RankingCandidateRow,
): number {
  const da = modelMinusMarket(a);
  const db = modelMinusMarket(b);
  const ha = da != null;
  const hb = db != null;
  if (ha !== hb) return ha ? -1 : 1;
  if (!ha && !hb) return stableTail(a, b);
  const d = cmpNumberDesc(da as number, db as number);
  if (d !== 0) return d;
  const r = cmpNumberDesc(recencyMs(a), recencyMs(b));
  if (r !== 0) return r;
  return stableTail(a, b);
}

/**
 * Two-tier: priced (independent_trueProb | blend_indep_conf) always above
 * unpriced. Within priced, edge-first. Unpriced keep relative order.
 * Founder call 2026-09-18: within tier 1, order by EDGE not rankingP.
 */
export function orderingPricedTierFirst(
  a: RankingCandidateRow,
  b: RankingCandidateRow,
): number {
  const pa = isPriced(a);
  const pb = isPriced(b);
  if (pa !== pb) return pa ? -1 : 1;
  if (!pa && !pb) return stableTail(a, b);
  const ea = hasPositiveEdge(a);
  const eb = hasPositiveEdge(b);
  if (ea !== eb) return ea ? -1 : 1;
  if (!ea && !eb) return stableTail(a, b);
  return edgeThenModelThenRecency(a, b);
}

export const ORDERING_BY_NAME: Record<
  RankingOrderingName,
  (a: RankingCandidateRow, b: RankingCandidateRow) => number
> = {
  current: orderingCurrent,
  "edge-first": orderingEdgeFirst,
  "model-minus-market": orderingModelMinusMarket,
  "priced-tier-first": orderingPricedTierFirst,
};

export function compareByOrdering(
  name: RankingOrderingName,
  a: RankingCandidateRow,
  b: RankingCandidateRow,
): number {
  switch (name) {
    case "current":
      return orderingCurrent(a, b);
    case "edge-first":
      return orderingEdgeFirst(a, b);
    case "model-minus-market":
      return orderingModelMinusMarket(a, b);
    case "priced-tier-first":
      return orderingPricedTierFirst(a, b);
  }
}

export function sortByOrdering(
  rows: readonly RankingCandidateRow[],
  name: RankingOrderingName,
): RankingCandidateRow[] {
  return [...rows].sort((a, b) => compareByOrdering(name, a, b));
}

/** Total + stable: every pair has a sign, equals keep inputIndex order. */
export function isTotalAndStable(
  cmp: (a: RankingCandidateRow, b: RankingCandidateRow) => number,
  rows: readonly RankingCandidateRow[],
): boolean {
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i]!;
    if (cmp(a, a) !== 0) return false;
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j]!;
      const ab = cmp(a, b);
      const ba = cmp(b, a);
      if (ab === 0 && ba === 0) continue;
      if (ab === 0 || ba === 0) return false;
      if (Math.sign(ab) !== -Math.sign(ba)) return false;
    }
  }
  return true;
}
