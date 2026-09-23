/**
 * arXiv:2507.02827v2 — USAD: End-to-End Human Activity Recognition via Diffusion Model with Spatiotemporal Attention
 *
 * Statistics-guided diffusion augmentation for rare NFL events: per-play kinematic stats condition a
 * label-conditioned generator that produces class-balanced synthetic plays to pretrain the event
 * classifier, trained with an adaptive composite loss (BCE + focal).
 *
 * Improvement: GSE ports statistics-guided diffusion augmentation for rare NFL events (broken-tackle runs, coverage busts): per-play kinematic stats condition a label-conditioned DDPM that generates class-balanced synthetic plays to pretrain the event classifier.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Accept as evidence that statistics-guided diffusion augmentation + adaptive composite loss improves imbalanced time-series classification; port only the augmentation recipe and composite loss, skipping the network.
 */

/** Normalize per-play kinematic stats into a conditioning vector. */
export function conditioningVector(
  stats: Record<string, number>,
  means: ReadonlyMap<string, number>,
  sds: ReadonlyMap<string, number>,
): number[] {
  const keys = [...means.keys()].sort();
  return keys.map((k) => {
    const sd = sds.get(k) ?? 1;
    if (sd <= 0) throw new Error("conditioningVector: sd > 0");
    return ((stats[k] ?? 0) - (means.get(k) ?? 0)) / sd;
  });
}

/**
 * Class-balanced synthetic counts: how many synthetic plays per class to
 * reach the target count.
 */
export function classBalancedCounts(
  classCounts: ReadonlyMap<string, number>,
  target: number,
): Map<string, number> {
  if (target <= 0) throw new Error("classBalancedCounts: target > 0");
  const out = new Map<string, number>();
  for (const [cls, n] of classCounts) {
    if (n < 0) throw new Error("classBalancedCounts: counts >= 0");
    out.set(cls, Math.max(0, target - n));
  }
  return out;
}

/** Binary focal loss. */
export function focalLoss(p: number, y: 0 | 1, gamma: number, alpha: number): number {
  if (p <= 0 || p >= 1) throw new Error("focalLoss: p in (0,1)");
  if (gamma < 0 || alpha < 0 || alpha > 1) throw new Error("focalLoss: bad gamma/alpha");
  const pt = y === 1 ? p : 1 - p;
  return -alpha * Math.pow(1 - pt, gamma) * Math.log(Math.max(1e-12, pt));
}

/**
 * Adaptive composite loss: wBCE * BCE + wFocal * focal, weights adapted by
 * the class-imbalance ratio.
 */
export function adaptiveCompositeLoss(
  p: number,
  y: 0 | 1,
  posRate: number,
  gamma: number,
): number {
  if (posRate <= 0 || posRate >= 1) throw new Error("adaptiveCompositeLoss: posRate in (0,1)");
  const bce = -(y * Math.log(Math.max(1e-12, p)) + (1 - y) * Math.log(Math.max(1e-12, 1 - p)));
  const wBCE = 1 - posRate; // rare positives -> BCE dominates (upweights the rare class)
  const wFocal = posRate;
  return wBCE * bce + wFocal * focalLoss(p, y, gamma, 0.5);
}
