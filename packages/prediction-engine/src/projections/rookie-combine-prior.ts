/**
 * Combine negative prior for rookie projections (arXiv 2303.05774v1).
 *
 * The combine paper is a NEGATIVE prior in the rookie model: combine
 * testing predicts matriculation (0.78-0.88 accuracy) but not snaps
 * (R^2 < 0.25). Cap combine-feature weights in rookie-season
 * projections: blend = alpha*college production + beta*draft position +
 * gamma*combine with gamma <= 0.1, 3-cone excluded or signed near-zero
 * for RB/WR/TE, broad jump allowed a small positive weight (the only
 * drill with any success signal).
 *
 * Draft-market angle: fade rookies whose draft slot was driven by
 * combine testing over college production for rookie-season props
 * (rookie of the year, season-long yardage props); favor productive
 * college players with mediocre testing.
 *
 * ACCEPTANCE GATE: ADAPT iff Test 1 replicates (combine predicts
 * matriculation at 0.78-0.88 but snaps R^2 < 0.25); REJECT only if
 * combine metrics strongly predict success on modern classes (R^2 >=
 * 0.35 without production features). Judged as a modeling constraint,
 * not a predictor.
 *
 * Research-only module. Not wired into any live projection path.
 */

export interface RookieBlendWeights {
  /** College production weight. */
  alpha: number;
  /** Draft position weight. */
  beta: number;
  /** Combine weight — capped at 0.1. */
  gamma: number;
}

export const MAX_COMBINE_WEIGHT = 0.1;

/** Enforce the negative prior: gamma <= 0.1, weights non-negative. */
export function capCombineWeight(w: RookieBlendWeights): RookieBlendWeights {
  if (w.alpha < 0 || w.beta < 0 || w.gamma < 0) {
    throw new Error("capCombineWeight: weights must be non-negative");
  }
  return { ...w, gamma: Math.min(w.gamma, MAX_COMBINE_WEIGHT) };
}

export interface RookieSignals {
  /** Standardized college production score. */
  production: number;
  /** Standardized draft-slot value (higher = earlier pick). */
  draftValue: number;
  /** Standardized combine testing score. */
  combine: number;
}

/** Rookie projection from the capped blend. */
export function rookieProjection(
  signals: RookieSignals,
  weights: RookieBlendWeights,
): number {
  const w = capCombineWeight(weights);
  return w.alpha * signals.production + w.beta * signals.draftValue + w.gamma * signals.combine;
}

export interface DrillWeights {
  fortyYd: number;
  threeCone: number;
  broadJump: number;
  vertical: number;
}

/**
 * Position-group drill constraints: 3-cone excluded (near-zero) for
 * RB/WR/TE; broad jump keeps a small positive allowance (only drill
 * with any success signal).
 */
export function constrainDrills(
  positionGroup: "RB" | "WR" | "TE" | "QB" | "OL" | "DEF",
  raw: DrillWeights,
): DrillWeights {
  const skill = positionGroup === "RB" || positionGroup === "WR" || positionGroup === "TE";
  return {
    fortyYd: raw.fortyYd,
    threeCone: skill ? 0 : raw.threeCone,
    broadJump: Math.min(Math.max(0, raw.broadJump), MAX_COMBINE_WEIGHT),
    vertical: raw.vertical,
  };
}

/**
 * Combine-trap score: how much of a rookie's draft slot looks driven
 * by testing over production. Positive = testing-driven (fade for
 * rookie-season props); negative = production-driven (favor).
 */
export function combineTrapScore(signals: RookieSignals): number {
  return signals.combine - signals.production;
}

/** Fade/favor verdict for rookie-season prop markets. */
export function rookiePropVerdict(
  signals: RookieSignals,
  fadeThreshold = 1.0,
): "fade" | "favor" | "neutral" {
  const trap = combineTrapScore(signals);
  if (trap >= fadeThreshold) return "fade";
  if (trap <= -fadeThreshold) return "favor";
  return "neutral";
}
