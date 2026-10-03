/**
 * arXiv 2012.11717v3: Social NCE: Contrastive Learning of Socially-aware Motion Representations
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Train GSE's trajectory forecaster with Social-NCE on NFL 10Hz tracking (primary agent = ball-carrier; neighbors = 11 defenders + nearby blockers): positive key = ball-carrier's true future location (+noise); negatives = 8 angular samples around each defender's future location at radius rho ~= 0.5-1.0 yd (tuned), horizons delta-t in {1,...,4} frames, tau = 0.1, lambda tuned from 0.1; exclude tackle frames from negative sampling (contact is the positive event there) or invert the prior on labeled tackle frames.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Train GSE's trajectory forecaster with Social-NCE on NFL 10Hz tracking (primary agent = ball-carrier; neighbors = 11 defenders + nearby blockers): positive key = ball-carrier's true future location (+noise); negatives = 8 angular samples around each defender's future location at radius rho ~= 0.5-1.0 yd (tuned), horizons delta-t in {1,...,4} frames, tau = 0.1, lambda tuned from 0.1; exclude tackle frames from negative sampling (contact is the positive event there) or invert the prior on labeled tackle frames.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if: (a) impossible-trajectory rate reduced >= 25% vs vanilla with FDE no worse than +2%, AND (b) random negatives do not beat Social-NCE (sanity check that the prior, not just contrast, drives the gain). REJECT if (a) fails.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: selfsupervised_tracking | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Cosine similarity. */
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

/** InfoNCE loss for one anchor. */
export function infoNCELoss(anchor: number[], pos: number[], negs: number[][], tau: number): number {
  const sPos = cosineSim(anchor, pos) / tau;
  let denom = Math.exp(sPos);
  for (const neg of negs) denom += Math.exp(cosineSim(anchor, neg) / tau);
  return -sPos + Math.log(denom);
}

/** Angular negatives around each neighbor's future location (Social-NCE style). */
export function angularNegatives(
  center: [number, number],
  rho: number,
  n: number,
  rand: () => number,
): [number, number][] {
  return Array.from({ length: n }, (_, k) => {
    const ang = (2 * Math.PI * k) / n + (rand() - 0.5) * 0.2;
    return [center[0] + rho * Math.cos(ang), center[1] + rho * Math.sin(ang)] as [number, number];
  });
}

/** Social-NCE loss: positives = true future, negatives = angular samples. */
export function socialNCELoss(
  anchor: number[],
  trueFuture: [number, number],
  defenderFutures: [number, number][],
  rho: number,
  tau: number,
  rand: () => number,
): number {
  const pos = [trueFuture[0] / 10, trueFuture[1] / 10];
  const negs: number[][] = [];
  for (const df of defenderFutures) {
    for (const [x, y] of angularNegatives(df, rho, 8, rand)) negs.push([x / 10, y / 10]);
  }
  return infoNCELoss(anchor, pos, negs, tau);
}
