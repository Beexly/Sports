/**
 * Ranking candidate comparators for board and picks ordering.
 *
 * Four candidate total stable comparators:
 *   - orderingCurrent: reproduces the legacy sort-key fallback chain exactly
 *   - orderingEdgeFirst: descending expectedClv with fallback to current
 *   - orderingModelMinusMarket: descending (trueProb - marketFairProb)
 *   - orderingPricedTierFirst: two-tier sort (priced tier by edge, unpriced tier trailing)
 */

export interface RankingCandidateRow {
  readonly id?: string;
  readonly confidence: number;
  readonly factorBreakdown?: unknown;
  readonly expectedClv?: number | null;
  readonly trueProb?: number | null;
  readonly marketFairProb?: number | null;
  readonly rankingP?: number | null;
  readonly rankingScore?: number | null;
  readonly rankingSource?: string | null;
  readonly isFeatured?: boolean;
  readonly generatedAt?: Date | string | null;
}

export type RankingOrderingName =
  | "current"
  | "edge_first"
  | "model_minus_market"
  | "priced_tier_first";

export function extractRankingSortKey(pick: RankingCandidateRow): number {
  const conf = Number.isFinite(pick.confidence) ? pick.confidence / 100 : 0;
  if (typeof pick.rankingP === "number" && Number.isFinite(pick.rankingP)) {
    return Math.min(1, Math.max(0, pick.rankingP));
  }
  const fb = pick.factorBreakdown;
  if (fb && typeof fb === "object") {
    const rec = fb as Record<string, unknown>;
    const rP = rec["rankingP"];
    if (typeof rP === "number" && Number.isFinite(rP)) {
      return Math.min(1, Math.max(0, rP));
    }
    const rScore = rec["rankingScore"];
    if (typeof rScore === "number" && Number.isFinite(rScore)) {
      return Math.min(1, Math.max(0, rScore / 100));
    }
  }
  if (typeof pick.rankingScore === "number" && Number.isFinite(pick.rankingScore)) {
    return Math.min(1, Math.max(0, pick.rankingScore / 100));
  }
  return conf;
}

export function extractExpectedClv(row: RankingCandidateRow): number | null {
  if (typeof row.expectedClv === "number" && Number.isFinite(row.expectedClv)) {
    return row.expectedClv;
  }
  const fb = row.factorBreakdown;
  if (fb && typeof fb === "object") {
    const rec = fb as Record<string, unknown>;
    if (typeof rec["expectedClv"] === "number" && Number.isFinite(rec["expectedClv"])) {
      return rec["expectedClv"] as number;
    }
    const ie = rec["independentEdge"];
    if (ie && typeof ie === "object") {
      const ieRec = ie as Record<string, unknown>;
      if (typeof ieRec["expectedClv"] === "number" && Number.isFinite(ieRec["expectedClv"])) {
        return ieRec["expectedClv"] as number;
      }
    }
  }
  return null;
}

export function extractTrueProb(row: RankingCandidateRow): number | null {
  if (typeof row.trueProb === "number" && Number.isFinite(row.trueProb)) {
    return row.trueProb;
  }
  const fb = row.factorBreakdown;
  if (fb && typeof fb === "object") {
    const rec = fb as Record<string, unknown>;
    if (typeof rec["trueProb"] === "number" && Number.isFinite(rec["trueProb"])) {
      return rec["trueProb"] as number;
    }
    const ie = rec["independentEdge"];
    if (ie && typeof ie === "object") {
      const ieRec = ie as Record<string, unknown>;
      if (typeof ieRec["trueProb"] === "number" && Number.isFinite(ieRec["trueProb"])) {
        return ieRec["trueProb"] as number;
      }
    }
  }
  return null;
}

export function extractMarketFairProb(row: RankingCandidateRow): number | null {
  if (typeof row.marketFairProb === "number" && Number.isFinite(row.marketFairProb)) {
    return row.marketFairProb;
  }
  const fb = row.factorBreakdown;
  if (fb && typeof fb === "object") {
    const rec = fb as Record<string, unknown>;
    if (typeof rec["marketFairProb"] === "number" && Number.isFinite(rec["marketFairProb"])) {
      return rec["marketFairProb"] as number;
    }
    const ie = rec["independentEdge"];
    if (ie && typeof ie === "object") {
      const ieRec = ie as Record<string, unknown>;
      if (typeof ieRec["marketFairProb"] === "number" && Number.isFinite(ieRec["marketFairProb"])) {
        return ieRec["marketFairProb"] as number;
      }
    }
  }
  return null;
}

export function extractRankingSource(row: RankingCandidateRow): string | null {
  if (typeof row.rankingSource === "string") return row.rankingSource;
  const fb = row.factorBreakdown;
  if (fb && typeof fb === "object") {
    const rec = fb as Record<string, unknown>;
    if (typeof rec["rankingSource"] === "string") return rec["rankingSource"] as string;
  }
  return null;
}

export function extractModelMinusMarket(row: RankingCandidateRow): number | null {
  const tp = extractTrueProb(row);
  const mfp = extractMarketFairProb(row);
  if (tp != null && mfp != null) return tp - mfp;
  return null;
}

function getRecencyTime(row: RankingCandidateRow): number {
  if (!row.generatedAt) return 0;
  const t = new Date(row.generatedAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Ordering 1: Current legacy ordering.
 * Featured first, then rankingSortKey descending, then generatedAt descending.
 */
export function orderingCurrent(a: RankingCandidateRow, b: RankingCandidateRow): number {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;

  const ra = extractRankingSortKey(a);
  const rb = extractRankingSortKey(b);
  if (ra !== rb) return rb - ra;

  const ta = getRecencyTime(a);
  const tb = getRecencyTime(b);
  if (ta !== tb) return tb - ta;

  return 0;
}

/**
 * Ordering 2: Edge-first.
 * Featured first. Rows with positive finite expectedClv sorted descending;
 * ties broken by (trueProb - marketFairProb), then recency.
 * Rows without positive finite expectedClv trail in current order.
 */
export function orderingEdgeFirst(a: RankingCandidateRow, b: RankingCandidateRow): number {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;

  const eA = extractExpectedClv(a);
  const eB = extractExpectedClv(b);
  const posA = eA != null && eA > 0;
  const posB = eB != null && eB > 0;

  if (posA && !posB) return -1;
  if (!posA && posB) return 1;

  if (posA && posB) {
    if (eB! !== eA!) return eB! - eA!;
    const diffA = extractModelMinusMarket(a) ?? -Infinity;
    const diffB = extractModelMinusMarket(b) ?? -Infinity;
    if (diffB !== diffA) return diffB - diffA;
    const ta = getRecencyTime(a);
    const tb = getRecencyTime(b);
    if (ta !== tb) return tb - ta;
    return 0;
  }

  return orderingCurrent(a, b);
}

/**
 * Ordering 3: Model-minus-market edge.
 * Featured first. Rows with positive finite (trueProb - marketFairProb) sorted descending;
 * ties broken by expectedClv, then recency.
 * Non-positive or absent rows trail in current order.
 */
export function orderingModelMinusMarket(a: RankingCandidateRow, b: RankingCandidateRow): number {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;

  const diffA = extractModelMinusMarket(a);
  const diffB = extractModelMinusMarket(b);
  const posA = diffA != null && diffA > 0;
  const posB = diffB != null && diffB > 0;

  if (posA && !posB) return -1;
  if (!posA && posB) return 1;

  if (posA && posB) {
    if (diffB! !== diffA!) return diffB! - diffA!;
    const eA = extractExpectedClv(a) ?? -Infinity;
    const eB = extractExpectedClv(b) ?? -Infinity;
    if (eB !== eA) return eB - eA;
    const ta = getRecencyTime(a);
    const tb = getRecencyTime(b);
    if (ta !== tb) return tb - ta;
    return 0;
  }

  return orderingCurrent(a, b);
}

export function isPricedTierRow(row: RankingCandidateRow): boolean {
  const src = extractRankingSource(row);
  return src === "independent_trueProb" || src === "blend_indep_conf";
}

/**
 * Ordering 4: Priced-tier first (Founder direction 2026-09-18).
 * Featured first.
 * Tier 1 (rankingSource = independent_trueProb | blend_indep_conf) precedes Tier 2.
 * Within Tier 1: ordered by edge (descending expectedClv, ties broken by trueProb - marketFairProb, then recency).
 * Tier-1 rows with absent expectedClv trail inside Tier 1.
 * Tier 2 rows (unpriced / confidence-only) trail as a block in current relative order.
 */
export function orderingPricedTierFirst(a: RankingCandidateRow, b: RankingCandidateRow): number {
  const fa = a.isFeatured ? 1 : 0;
  const fb = b.isFeatured ? 1 : 0;
  if (fa !== fb) return fb - fa;

  const isT1_A = isPricedTierRow(a);
  const isT1_B = isPricedTierRow(b);

  if (isT1_A && !isT1_B) return -1;
  if (!isT1_A && isT1_B) return 1;

  if (isT1_A && isT1_B) {
    const eA = extractExpectedClv(a);
    const eB = extractExpectedClv(b);
    const hasEA = eA != null && Number.isFinite(eA);
    const hasEB = eB != null && Number.isFinite(eB);

    if (hasEA && !hasEB) return -1;
    if (!hasEA && hasEB) return 1;

    if (hasEA && hasEB) {
      if (eB! !== eA!) return eB! - eA!;
      const diffA = extractModelMinusMarket(a) ?? -Infinity;
      const diffB = extractModelMinusMarket(b) ?? -Infinity;
      if (diffB !== diffA) return diffB - diffA;
      const ta = getRecencyTime(a);
      const tb = getRecencyTime(b);
      if (ta !== tb) return tb - ta;
      return 0;
    }

    const diffA = extractModelMinusMarket(a) ?? -Infinity;
    const diffB = extractModelMinusMarket(b) ?? -Infinity;
    if (diffB !== diffA) return diffB - diffA;
    return orderingCurrent(a, b);
  }

  return orderingCurrent(a, b);
}

export function getRankingComparator(
  name: RankingOrderingName,
): (a: RankingCandidateRow, b: RankingCandidateRow) => number {
  switch (name) {
    case "current":
      return orderingCurrent;
    case "edge_first":
      return orderingEdgeFirst;
    case "model_minus_market":
      return orderingModelMinusMarket;
    case "priced_tier_first":
      return orderingPricedTierFirst;
    default:
      return orderingCurrent;
  }
}
