/**
 * DISCOVERY LAYER — Inverse Bookmaker Mind (Invention 28).
 *
 * Book DNA asks "what does this book tend to do?" This asks "what objective is it optimizing RIGHT
 * NOW?" A sportsbook is not trying to perfectly predict truth — it balances hold, liability, public
 * demand, sharp exposure, copycat safety, and limits. Inferring the hidden objective prevents the
 * most dangerous false edge: mistaking bookmaker POLICY for bookmaker IGNORANCE. A bad-looking price
 * behind tiny limits is policy, not a gift.
 *
 *   BookPolicy ≈ argmax_price  hold − liability_risk − sharp_exposure − stale_risk
 *                              + public_demand_capture + copycat_safety − correction_cost
 *
 * Pure + deterministic.
 */

export interface BookBehavior {
  /** Book price minus independent fair value (implied prob points); + = book is higher than fair. */
  readonly fairDeviation: number;
  /** How far the deviation leans toward the public side [0,1] (1 = fully toward public). */
  readonly publicSideLean: number;
  /** Lag behind sharp/consensus moves (ms); high = slow to follow. */
  readonly sharpFollowLagMs: number;
  /** Limit proxy 0 (tiny) → 1 (full). */
  readonly limitProxy: number;
  /** How much the book simply mirrors consensus [0,1]. */
  readonly copycatScore: number;
}

export type BookMotive =
  | "protecting_liability"
  | "shading_public_demand"
  | "trapping_public_with_low_limits"
  | "slow_to_follow"
  | "copying_consensus"
  | "possibly_genuinely_mispriced";

export interface BookPolicyInference {
  readonly dominantMotive: BookMotive;
  /** True ONLY when the off-fair price is plausibly real ignorance (the rare genuine edge). */
  readonly possiblyExploitable: boolean;
  readonly confidence: number;
  readonly interpretation: string;
}

/** Infer the book's dominant current objective from its behavior. */
export function inferBookPolicy(b: BookBehavior): BookPolicyInference {
  const offFair = Math.abs(b.fairDeviation) > 0.02;

  // Off fair, toward public, behind tiny limits → trapping demand (policy, not ignorance).
  if (offFair && b.publicSideLean > 0.6 && b.limitProxy <= 0.3) {
    return mk("trapping_public_with_low_limits", false, 0.8, "Off-fair toward the public side behind small limits — demand capture, not a gift.");
  }
  if (offFair && b.publicSideLean > 0.6) {
    return mk("shading_public_demand", false, 0.7, "Shading the line toward public money to balance liability.");
  }
  if (b.sharpFollowLagMs >= 5 * 60_000 && b.copycatScore < 0.5) {
    return mk("slow_to_follow", b.limitProxy > 0.5, 0.6, "Lagging sharp/consensus moves — a latency window only if limits allow.");
  }
  if (b.copycatScore >= 0.7) {
    return mk("copying_consensus", false, 0.65, "Mirroring consensus — its price carries little independent information.");
  }
  if (offFair && b.limitProxy > 0.6 && b.publicSideLean < 0.4) {
    return mk("possibly_genuinely_mispriced", true, 0.45, "Off fair, NOT toward public, at real limits — the rare candidate for genuine misprice (still verify).");
  }
  return mk("protecting_liability", false, 0.5, "Behavior consistent with routine liability management — no clear ignorance.");
}

function mk(dominantMotive: BookMotive, possiblyExploitable: boolean, confidence: number, interpretation: string): BookPolicyInference {
  return { dominantMotive, possiblyExploitable, confidence, interpretation };
}
