/**
 * Segmented CLV — Phase 2 of the proven-edge program: not just "do we beat the
 * close?" but "WHERE do we beat it?". Slicing beat-close rate by sport, market, and
 * confidence band is how we find the pockets of real edge (and the pockets where the
 * model is fooling itself) instead of hiding both inside one blended number.
 *
 * Integrity rule, enforced here: NEVER average CLV across units. Spread/total CLV is
 * in points; moneyline CLV is in probability. A segment that mixes both reports a
 * null meanClv and kind "MIXED" — only the beat-close RATE (unit-free) is comparable
 * across kinds. This mirrors public-clv-policy.ts, which deliberately publishes the
 * rate and not a blended average.
 *
 * Pure and deterministic — operates on already-graded pick rows, counts only.
 */

export type ClvKind = "POINTS" | "PROBABILITY";
export type ClvVerdict = "BEAT_CLOSE" | "MATCHED_CLOSE" | "LOST_TO_CLOSE";
export type SegmentDimension = "sport" | "pickType" | "confidenceBand" | "modelVersion";

export interface ClvGradedItem {
  readonly sport: string;
  readonly pickType: string; // SPREAD | TOTAL | MONEYLINE
  readonly clvKind: ClvKind;
  readonly clvValue: number;
  readonly verdict: ClvVerdict;
  readonly confidence: number; // 0–100
  readonly modelVersion: string;
}

export interface ClvSegment {
  readonly key: string;
  readonly n: number;
  readonly beatCloseCount: number;
  readonly lostCloseCount: number;
  /** Unit-free, always comparable: share of the segment that beat the close (one decimal). */
  readonly beatCloseRatePct: number;
  /** Mean CLV — only meaningful within a single unit. Null when the segment mixes kinds. */
  readonly meanClv: number | null;
  readonly kind: ClvKind | "MIXED";
}

/**
 * Bucket a 0–100 confidence score into a display band. Picks at/over 90 are the
 * highest-conviction tier; anything under 50 collapses into one low band.
 */
export function confidenceBand(confidence: number): string {
  if (!Number.isFinite(confidence)) return "unknown";
  if (confidence >= 90) return "90-100";
  if (confidence >= 80) return "80-89";
  if (confidence >= 70) return "70-79";
  if (confidence >= 60) return "60-69";
  if (confidence >= 50) return "50-59";
  return "<50";
}

function keyOf(item: ClvGradedItem, dimension: SegmentDimension): string {
  switch (dimension) {
    case "sport":
      return item.sport || "unknown";
    case "pickType":
      return item.pickType || "unknown";
    case "confidenceBand":
      return confidenceBand(item.confidence);
    case "modelVersion":
      return item.modelVersion || "unknown";
  }
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Group graded CLV items by a dimension and summarize each segment. Segments are
 * sorted by sample size (desc) then key, so the most-evidenced pockets lead.
 */
export function segmentClv(
  items: readonly ClvGradedItem[],
  dimension: SegmentDimension
): ClvSegment[] {
  const groups = new Map<string, ClvGradedItem[]>();
  for (const item of items) {
    const key = keyOf(item, dimension);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const segments: ClvSegment[] = [];
  for (const [key, bucket] of groups) {
    const n = bucket.length;
    const beatCloseCount = bucket.filter((i) => i.verdict === "BEAT_CLOSE").length;
    const lostCloseCount = bucket.filter((i) => i.verdict === "LOST_TO_CLOSE").length;

    const kinds = new Set(bucket.map((i) => i.clvKind));
    const kind: ClvKind | "MIXED" = kinds.size === 1 ? (bucket[0]!.clvKind) : "MIXED";
    const meanClv =
      kind === "MIXED" ? null : round(bucket.reduce((s, i) => s + i.clvValue, 0) / n, 4);

    segments.push({
      key,
      n,
      beatCloseCount,
      lostCloseCount,
      beatCloseRatePct: round((beatCloseCount / n) * 100, 1),
      meanClv,
      kind,
    });
  }

  segments.sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  return segments;
}
