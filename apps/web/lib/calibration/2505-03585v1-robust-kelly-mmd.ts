/**
 * arXiv 2505.03585v1: Decision Making under Model Misspecification: DRO with Robust Bayesian Ambiguity Sets.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Robust Kelly under MMD-ball ambiguity sets (DRO with robust Bayesian ambiguity): adaptive epsilon per game from a misspecification detector (high MMD distance -> larger ambiguity ball) and a learned deep kernel on game features so the ball respects football similarity (divisional games near each other in kernel space) instead of a fixed Gaussian on outcomes.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace standard Kelly with robust Kelly under MMD-ball ambiguity sets, using an adaptive ε per game from the misspecification detector (high MMD distance → larger ambiguity ball) and a learned deep kernel on game features so the ball respects football-relevant similarity (divisional games near each other in kernel space) instead of a fixed Gaussian on outcomes.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if walk-forward: final bankroll ≥ 1.1 × best baseline AND max drawdown ≤ 0.85 × best baseline's AND the predicted-vs-realized edge gap is ≤ 0.7 × the standard-Kelly baseline's. REJECT if robust Kelly posts <50% of the baseline's bet volume (degenerate conservatism).
 *
 * ENABLED=false: replaces Kelly sizing; needs a human call.
 */


export const ENABLED = false;

function rbfKernel(a: readonly number[], b: readonly number[], gamma: number): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return Math.exp(-gamma * s);
}

/**
 * MMD^2 between the engine's outcome distribution samples and the empirical
 * outcome samples, under an RBF kernel on game features (the learned deep
 * kernel is training-time; gamma is fit offline and passed in).
 */
export function mmdSquared(
  engineFeatures: readonly (readonly number[])[],
  empiricalFeatures: readonly (readonly number[])[],
  gamma: number,
): number {
  const kxx = meanKernel(engineFeatures, engineFeatures, gamma);
  const kyy = meanKernel(empiricalFeatures, empiricalFeatures, gamma);
  const kxy = meanKernel(engineFeatures, empiricalFeatures, gamma);
  return Math.max(kxx + kyy - 2 * kxy, 0);
}

function meanKernel(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
  gamma: number,
): number {
  let s = 0;
  let n = 0;
  for (const x of a) {
    for (const y of b) {
      s += rbfKernel(x, y, gamma);
      n++;
    }
  }
  return n > 0 ? s / n : 0;
}

/**
 * Adaptive ambiguity radius: epsilon grows with the MMD misspecification
 * distance (high MMD -> larger ball -> more conservative).
 */
export function adaptiveEpsilon(mmdDist: number, epsScale = 1.0, epsMax = 0.25): number {
  return Math.min(epsScale * mmdDist, epsMax);
}

/** Robust edge: worst-case edge inside the ambiguity ball. */
export function robustEdge(edge: number, mmdDist: number, epsScale = 1.0): number {
  return edge - adaptiveEpsilon(mmdDist, epsScale);
}

/**
 * Robust Kelly fraction: Kelly on the robust edge, clamped to [0,1].
 * Degenerate conservatism guard: caller must check posted volume >= 50% of baseline.
 */
export function robustKellyFraction(
  p: number,
  decimalOdds: number,
  mmdDist: number,
  kellyMultiplier = 0.5,
  epsScale = 1.0,
): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const marketImplied = 1 / decimalOdds;
  const edge = p - marketImplied;
  const rEdge = robustEdge(edge, mmdDist, epsScale);
  const f = kellyMultiplier * ((marketImplied + rEdge) * b - (1 - (marketImplied + rEdge))) / b;
  return Math.min(Math.max(f, 0), 1);
}

/** Volume guard: robust Kelly must post >= 50% of baseline bet volume. */
export function volumeGuardOk(robustVolume: number, baselineVolume: number): boolean {
  return baselineVolume > 0 && robustVolume / baselineVolume >= 0.5;
}
