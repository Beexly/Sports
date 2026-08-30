/**
 * Platt MAP IRLS — two-parameter logistic recalibration on logit-scores.
 *
 *   p_cal = σ(A·s + B),  s = logit(clip(p_raw, ε, 1−ε))
 *   Prior A~N(1,1), B~N(0,1); Newton: g = X\'(p−y)+Σ⁻¹(θ−θ₀), H = X\'WX+Σ⁻¹
 *
 * Job = REL (calibration), not RES (ranking). Apply OFF while Res≈0.
 * Fit: Node cron / offline only. Never Edge middleware. Never per-request IRLS.
 * Data: canonical WIN/LOSS, time-ordered train, holdout metrics only.
 *
 * @see docs/ops/PLATT_HIERARCHICAL_FULL_POSTURE.md
 */


export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export function logit(p: number): number {
  const x = Math.min(1 - 1e-6, Math.max(1e-6, p));
  return Math.log(x / (1 - x));
}

export function fitPlattIrlS(
  samples: readonly { score: number; outcome: 0 | 1 }[],
  maxIter = 25,
): { A: number; B: number } {
  let A = 1;
  let B = 0;
  const precA = 1;
  const precB = 1;
  for (let iter = 0; iter < maxIter; iter++) {
    let gA = precA * (A - 1);
    let gB = precB * B;
    let hAA = precA;
    let hBB = precB;
    let hAB = 0;
    for (const { score, outcome } of samples) {
      const p = sigmoid(A * score + B);
      const w = Math.max(p * (1 - p), 1e-12);
      const err = p - outcome;
      gA += err * score;
      gB += err;
      hAA += w * score * score;
      hBB += w;
      hAB += w * score;
    }
    const det = hAA * hBB - hAB * hAB;
    if (Math.abs(det) < 1e-18) break;
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (hAA * gB - hAB * gA) / det;
    A -= dA;
    B -= dB;
    if (dA * dA + dB * dB < 1e-12) break;
  }
  return { A, B };
}

export function plattPredict(logitScore: number, A: number, B: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, sigmoid(A * logitScore + B)));
}

/** Fit from raw probabilities (converts to logit scores). */
export function fitPlattFromProbs(
  samples: readonly { p: number; y: 0 | 1 }[],
): { A: number; B: number } {
  return fitPlattIrlS(
    samples.map((s) => ({ score: logit(s.p), outcome: s.y })),
  );
}

export function applyPlattToProb(p: number, A: number, B: number): number {
  return plattPredict(logit(p), A, B);
}
