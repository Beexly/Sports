/**
 * arXiv:2604.01318v1 — ViTs for Action Classification in Videos: An Approach to Risky Tackle Detection in American Football Practice Videos
 *
 * ViViT-B training recipe for NFL penalty-event video classification: binary focal loss for the class
 * imbalance, a Taguchi L4 orthogonal-array augmentation schedule, and event-recall evaluation on untouched
 * validation folds.
 *
 * Improvement: Adapt the ViViT-B + focal-loss + Taguchi-augmentation training recipe to NFL penalty-event video classification (roughing-the-passer, horse-collar, facemask, targeting) on broadcast clips mined around officiating events, feeding penalty-prediction content and officiating-crew tendency analysis.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the training recipe (not the dataset) if, on an NFL penalty-event pilot (≥300 labeled clips, ≥30% positive class), the ViViT + focal-loss + Taguchi-augmentation protocol achieves event recall ≥ 0.65 with untouched validation folds.
 */

/** Binary focal loss (also used by the composite-loss lane). */
export function focalLossB(p: number, y: 0 | 1, gamma: number, alpha: number): number {
  if (p <= 0 || p >= 1) throw new Error("focalLossB: p in (0,1)");
  if (gamma < 0 || alpha < 0 || alpha > 1) throw new Error("focalLossB: bad gamma/alpha");
  const pt = y === 1 ? p : 1 - p;
  return -alpha * Math.pow(1 - pt, gamma) * Math.log(Math.max(1e-12, pt));
}

/**
 * Taguchi L4 orthogonal array: 3 augmentation factors x 2 levels ->
 * 4 experimental runs. Levels map to augmentation strengths.
 */
export const TAGUCHI_L4: ReadonlyArray<readonly [0 | 1, 0 | 1, 0 | 1]> = [
  [0, 0, 0],
  [0, 1, 1],
  [1, 0, 1],
  [1, 1, 0],
];

/** Augmentation config for one Taguchi run (factors: crop, flip, jitter). */
export function taguchiConfig(
  run: 0 | 1 | 2 | 3,
  strengths: readonly [number, number], // [low, high] per factor
): { crop: number; flip: number; jitter: number } {
  const row = TAGUCHI_L4[run];
  if (!row) throw new Error("taguchiConfig: run in 0..3");
  const pick = (lvl: 0 | 1): number => (lvl === 0 ? strengths[0]! : strengths[1]!);
  return { crop: pick(row[0]), flip: pick(row[1]), jitter: pick(row[2]) };
}

/** Event recall on the positive class. */
export function eventRecall(
  scores: readonly number[],
  labels: readonly (0 | 1)[],
  thresh: number,
): number {
  if (scores.length !== labels.length || scores.length === 0) {
    throw new Error("eventRecall: length mismatch or empty");
  }
  let tp = 0;
  let pos = 0;
  labels.forEach((y, i) => {
    if (y === 1) {
      pos++;
      if ((scores[i] ?? 0) >= thresh) tp++;
    }
  });
  return pos === 0 ? 0 : tp / pos;
}

/** Best Taguchi run by validation recall. */
export function bestTaguchiRun(recalls: readonly [number, number, number, number]): 0 | 1 | 2 | 3 {
  if (recalls.length !== 4) throw new Error("bestTaguchiRun: need 4 recalls");
  let best: 0 | 1 | 2 | 3 = 0;
  recalls.forEach((r, i) => {
    if (r > (recalls[best] ?? 0)) best = i as 0 | 1 | 2 | 3;
  });
  return best;
}
