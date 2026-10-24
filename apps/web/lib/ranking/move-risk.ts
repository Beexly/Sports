/**
 * Move-risk: how far the market is likely to move TOWARD a pick, which is a
 * different question from how likely the pick is to win.
 *
 * WHY (measured 2026-10-23, prod `picks`, n=1,009 with CLV verdicts):
 *   - `confidence` predicts BEATING THE CLOSE: Spearman +0.1528, beat rate
 *     40.2% in the bottom tercile -> 53.9% in the top (+13.7 pp).
 *   - `marketFairProb` predicts WINNING (n=1,697: +0.1845 vs -0.0171, Brier
 *     0.2364 vs 0.2744).
 *   - Both together are NOT additive per objective: in a joint logistic on CLV,
 *     mfp's coefficient is -0.011 (CI [-0.143, +0.112]) once confidence is in,
 *     and the blended score's Brier (0.2510) is WORSE than mfp alone (0.2410).
 *     So the build is: rank by mfp (see sort-key.ts), TAG by confidence here,
 *     and never average them into one number.
 *
 * Publishing order follows the tag, because a high-move-risk pick loses value
 * the longer it sits: the number you would have taken is gone by kickoff.
 * This is a TIMING signal only — movement does not predict results
 * (n=193, r=+0.005, p=.948), so the tag never argues for a side by itself.
 */

/** Confidence terciles resolved against the live board, low to high. */
export type MoveRisk = "high" | "mid" | "low" | "unknown";

/** A pick with confidence 0-100, as stored. Non-finite reads as unknown. */
export interface MoveRiskInput {
  readonly confidence: number | null | undefined;
}

/**
 * Tercile cut points. Deliberately coarse and fixed rather than fitted: the
 * measured relationship is monotone in thirds, so the tag only needs to be
 * ordered, and stable cuts keep the board's publish order explainable.
 */
export const MOVE_RISK_HIGH_MIN = 70;
export const MOVE_RISK_LOW_MAX = 55;

/**
 * Tag one pick. `unknown` is a real answer for rows with no usable confidence
 * and sorts between high and low — never coerced to `low`, because that would
 * demote rows the engine simply failed to score.
 */
export function moveRisk(pick: MoveRiskInput): MoveRisk {
  const c = pick.confidence;
  if (typeof c !== "number" || !Number.isFinite(c)) return "unknown";
  if (c >= MOVE_RISK_HIGH_MIN) return "high";
  if (c <= MOVE_RISK_LOW_MAX) return "low";
  return "mid";
}

/** Sort weight: publish high first. */
export const MOVE_RISK_WEIGHT: Readonly<Record<MoveRisk, number>> = {
  high: 0,
  unknown: 1,
  mid: 2,
  low: 3,
};

/**
 * Publish-order comparator. Ties fall through to generatedAt descending so the
 * order is total and reproducible, which the board's snapshot tests rely on.
 */
export function compareByMoveRisk(
  a: MoveRiskInput & { readonly generatedAt?: Date | string | null },
  b: MoveRiskInput & { readonly generatedAt?: Date | string | null },
): number {
  const wa = MOVE_RISK_WEIGHT[moveRisk(a)];
  const wb = MOVE_RISK_WEIGHT[moveRisk(b)];
  if (wa !== wb) return wa - wb;
  const ta = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
  const tb = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
  return tb - ta;
}

/** Human-facing label. Kept here so API and UI cannot drift apart. */
export function moveRiskLabel(risk: MoveRisk): string {
  switch (risk) {
    case "high":
      return "Likely to move — take early";
    case "mid":
      return "May move";
    case "low":
      return "Unlikely to move — take anytime";
    case "unknown":
      return "Move risk unscored";
  }
}
