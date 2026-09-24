// ============================================================
// Two-stage rejector heads (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed. The rejector model training
// itself (gradient boosting / small MLP) is offline work; these
// modules implement the deployable heads: scoring, threshold
// calibration, and the deferral cascade.
// ============================================================

/**
 * Fit a 2-parameter logistic model on two scores by batch gradient
 * descent (deterministic, fixed iterations). Used to learn the
 * (a, b) combination weights for the double-score gate rather than
 * hand-tuning them.
 */
export function fitLogistic2D(
  scoreA: number[],
  scoreB: number[],
  labels: (0 | 1)[],
  iterations = 500,
  lr = 0.1,
): { a: number; b: number; intercept: number } {
  const n = Math.min(scoreA.length, scoreB.length, labels.length);
  let a = 0;
  let b = 0;
  let c = 0;
  for (let it = 0; it < iterations; it++) {
    let ga = 0;
    let gb = 0;
    let gc = 0;
    for (let i = 0; i < n; i++) {
      const z = a * scoreA[i]! + b * scoreB[i]! + c;
      const p = 1 / (1 + Math.exp(-z));
      const err = p - labels[i]!;
      ga += err * scoreA[i]!;
      gb += err * scoreB[i]!;
      gc += err;
    }
    a -= (lr * ga) / Math.max(n, 1);
    b -= (lr * gb) / Math.max(n, 1);
    c -= (lr * gc) / Math.max(n, 1);
  }
  return { a, b, intercept: c };
}

/**
 * Double-score no-bet gate (2307.05199v1, "Reject Option Models
 * Comprising Out-of-Distribution Detection").
 *
 * score_A = misclassification detector: calibrated P(engine's pick
 * is wrong | features) from a meta-model on past engine errors.
 * score_B = OOD discriminator: distance of the game's feature
 * vector from the training distribution (Mahalanobis / kNN /
 * isolation-forest score). No-bet rule: skip if
 * a*score_A + b*score_B > tau, with (a, b, tau) tuned on 2024 -
 * the (a, b) weights learned by direct optimization of selective
 * risk at target coverage (fitLogistic2D above) rather than
 * hand-tuned. Supports a third variance-estimate score
 * (triple-score).
 *
 * ACCEPTANCE GATE (needs 2024 time-ordered backtest): ADOPT if the
 * double-score gate cuts selective risk by >= 25% relative to the
 * better of the two single-score gates at the SAME coverage
 * (+-2pp); otherwise REJECT.
 */
export function doubleScoreGate(
  scoreA: number,
  scoreB: number,
  a: number,
  b: number,
  tau: number,
  scoreC?: number,
  cWeight?: number,
): boolean {
  const combined = a * scoreA + b * scoreB + (scoreC !== undefined ? (cWeight ?? 0) * scoreC : 0);
  return combined > tau; // true = no-bet
}

/**
 * Calibrate tau to a target no-bet rate on a calibration window.
 */
export function calibrateTau(
  combinedScores: number[],
  targetNoBetRate: number,
): number {
  const n = combinedScores.length;
  if (n === 0) return Infinity;
  // Reject exactly k = round(rate*n) of the highest scores. tau is
  // the midpoint between the smallest rejected and largest accepted
  // score, so strict > (reject) and <= (accept) both hit the count
  // without boundary errors.
  const k = Math.min(n, Math.max(0, Math.round(targetNoBetRate * n)));
  if (k === 0) return Infinity;
  if (k === n) return -Infinity;
  const sorted = [...combinedScores].sort((a, b) => b - a); // descending
  return (sorted[k - 1]! + sorted[k]!) / 2;
}

/**
 * Abstention loss for a rejector: mean over the slate of
 * [wrong and accepted] * 1 + [abstained] * c.
 */
export function abstentionLoss(
  accepted: boolean[],
  wrong: boolean[],
  abstentionCost: number,
): number {
  const n = Math.min(accepted.length, wrong.length);
  if (n === 0) return 0;
  let loss = 0;
  for (let i = 0; i < n; i++) {
    loss += accepted[i] ? (wrong[i] ? 1 : 0) : abstentionCost;
  }
  return loss / n;
}

/**
 * Two-stage score-based no-bet head (2310.14770v2, "Theoretically
 * Grounded Loss Functions and Algorithms for Score-Based
 * Multi-Class Abstention").
 *
 * Stage 1 = the current engine (frozen). Stage 2 = a rejector score
 * per game (from the offline-trained model on historical engine
 * outputs + game features, exponential loss Phi(t) = exp(-t) per the
 * paper, subsuming the confidence-threshold, kNN-reject, and
 * double-score gate scores as inputs). This module calibrates the
 * accept/reject threshold to a target no-bet rate and evaluates the
 * abstention loss; the multi-class extension trains a SHARED
 * rejector with class-specific abstention costs (spread, total,
 * moneyline), testing whether the paper's multi-class machinery
 * beats three independent binary rejectors.
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if the two-stage
 * rejector beats the confidence-threshold baseline on abstention
 * loss by >= 15% relative (paired test p < 0.05) AND beats it on
 * profit; otherwise REJECT.
 */
export function twoStageRejector(
  rejectorScores: number[],
  targetNoBetRate: number,
): { accepted: boolean[]; threshold: number } {
  const threshold = calibrateTau(rejectorScores, targetNoBetRate);
  // Higher rejector score = more likely wrong = reject first.
  const accepted = rejectorScores.map((s) => s <= threshold);
  return { accepted, threshold };
}

/**
 * Shared multi-class rejector with class-specific abstention
 * costs: accept per class against its own cost-calibrated
 * threshold.
 */
export function sharedMultiClassRejector(
  rejectorScores: number[],
  classes: ("spread" | "total" | "moneyline")[],
  abstentionCosts: Record<"spread" | "total" | "moneyline", number>,
  targetNoBetRate: number,
): { accepted: boolean[]; thresholds: Record<string, number> } {
  const thresholds: Record<string, number> = {};
  const accepted = new Array(rejectorScores.length).fill(false);
  for (const cls of ["spread", "total", "moneyline"] as const) {
    const idx = classes
      .map((c, i) => (c === cls ? i : -1))
      .filter((i) => i >= 0);
    const scores = idx.map((i) => rejectorScores[i]!);
    // Higher abstention cost -> more lenient threshold (fewer rejects).
    const rate = targetNoBetRate * Math.min(abstentionCosts[cls]!, 1);
    const t = calibrateTau(scores, rate);
    thresholds[cls] = t;
    for (const i of idx) accepted[i] = rejectorScores[i]! <= t;
  }
  return { accepted, thresholds };
}

/** Deferral cascade tiers (2310.14772v2). */
export type DeferralTier = "publish" | "human-review" | "hard-no-bet";

/**
 * Predictor-rejector head with deferral cascade (2310.14772v2,
 * "Predictor-Rejector Multi-Class Abstention: Theoretical Analysis
 * and Algorithms").
 *
 * Predictor h frozen; rejector r trained on a DIFFERENT feature
 * set: line-move magnitude/timing, reverse-line-movement flags,
 * CQR interval width, ensemble disagreement, OOD distance,
 * news-volume anomaly; surrogate = exponential loss on the rejector
 * per the paper's two-stage family; abstention cost c mapped from
 * the sportsbook vig (a wrong pick costs ~1.1 units of a 1-unit bet;
 * abstention costs 0). Instead of binary abstain, routes into THREE
 * tiers: publish (engine confident), human review (the "defer to
 * human" special case the paper's framing explicitly supports), and
 * hard no-bet.
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if two-stage P-R beats
 * two-stage score-based on abstention loss by >= 5% relative
 * (paired p < 0.05) OR beats the confidence baseline by >= 15%
 * relative with rejection ratio <= 30%; otherwise REJECT.
 */
export function predictorRejectorCascade(
  rejectorScores: number[],
  reviewFraction: number,
  noBetFraction: number,
): { tiers: DeferralTier[]; publishCut: number; reviewCut: number } {
  const n = rejectorScores.length;
  if (n === 0) return { tiers: [], publishCut: 0, reviewCut: 0 };
  // Exact counts by sorted rank (highest score = most uncertain):
  // top kNoBet -> hard-no-bet, next kReview -> human-review, rest ->
  // publish. Tie-broken by slate order for determinism.
  const kNoBet = Math.min(n, Math.max(0, Math.round(noBetFraction * n)));
  const kReview = Math.min(
    n - kNoBet,
    Math.max(0, Math.round(reviewFraction * n)),
  );
  const order = rejectorScores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const tiers: DeferralTier[] = new Array(n).fill("publish");
  for (let r = 0; r < kNoBet; r++) tiers[order[r]!.i] = "hard-no-bet";
  for (let r = kNoBet; r < kNoBet + kReview; r++)
    tiers[order[r]!.i] = "human-review";
  // Cuts as midpoints between adjacent tiers (for reporting).
  const sNoBet = kNoBet > 0 ? order[kNoBet - 1]!.s : Infinity;
  const sRevHi = kNoBet < n ? order[kNoBet]!.s : -Infinity;
  const sRevLo = kNoBet + kReview > 0 ? order[kNoBet + kReview - 1]!.s : Infinity;
  const sPub = kNoBet + kReview < n ? order[kNoBet + kReview]!.s : -Infinity;
  const publishCut =
    kNoBet === 0
      ? Infinity
      : kNoBet === n
        ? -Infinity
        : (sNoBet + sRevHi) / 2;
  const reviewCut =
    kReview === 0
      ? publishCut
      : kNoBet + kReview === n
        ? -Infinity
        : (sRevLo + sPub) / 2;
  return { tiers, publishCut, reviewCut };
}
