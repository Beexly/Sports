/**
 * Same-game parlay dependence, per pairing type.
 *
 * FITTED 2026-10-23. Dependence is PAIRING-DEPENDENT, which the spec under
 * review missed by choosing one copula family per game script:
 *
 *   QB pass x WR1 : joint .295 vs .218 independence, upper tail dependence
 *                   +0.157 (CI .135-.179, n=2,009) — genuinely complementary.
 *   QB pass x TE1 : same sign, +0.307 tau (CI .166-.433, n=73), weaker sample.
 *   QB pass x RB1 : .221 vs .231 independence, lambda_U -.020 (p=.084) — flat
 *                   to mildly substitutive. They compete for the same snaps.
 *
 * Clayton theta is 0.788 (WR) and 0.570 (TE) by IFM on pseudo-observations. The
 * FAMILY barely matters: holdout PIT calibration showed no winner (KS .024 v
 * .027 and .035 v .0348) while theta itself was stable out-of-sample. So: one
 * positive copula, sign by pairing, no family branching.
 *
 * Fréchet bounds never bind here (joint .295 v upper bound .445), verified over
 * 4,018 leg pairs — marginals near .49 cannot reach the bound. Do not add a
 * bound clamp and imagine it does something.
 */

export type SgpPairing = "QB-WR" | "QB-TE" | "QB-RB" | "OTHER";

export const THETA_BY_PAIRING: Readonly<Record<SgpPairing, number>> = {
  "QB-WR": 0.788,
  "QB-TE": 0.57,
  "QB-RB": 0.1, // ~independent; kept small and positive rather than 0 to avoid a discontinuity
  OTHER: 0.1,
};

/** Observed joint probability by pairing, at both marginals near 0.5. */
export const OBSERVED_JOINT_AT_HALF: Readonly<Record<SgpPairing, number>> = {
  "QB-WR": 0.295,
  "QB-TE": 0.29,
  "QB-RB": 0.221,
  OTHER: 0.23,
};

/**
 * Clayton survival copula: P(both legs EXCEED their lines) given the marginal
 * exceedance probabilities and theta.
 *
 * u,v are non-exceedance probabilities by construction (1 - p), and the joint is
 * 1 - u - v + C(u,v), which is the survival form. theta -> 0 reduces exactly to
 * p1 * p2.
 */
export function jointExceedance(p1: number, p2: number, theta: number): number {
  const a = Math.min(1, Math.max(0, p1));
  const b = Math.min(1, Math.max(0, p2));
  const independent = a * b;
  if (!Number.isFinite(theta) || theta <= 1e-6) return independent;

  const u = 1 - a;
  const v = 1 - b;
  if (u <= 0 || v <= 0) return Math.min(a, b); // a leg already certain
  const c = Math.pow(Math.pow(u, -theta) + Math.pow(v, -theta) - 1, -1 / theta);
  const joint = 1 - u - v + c;
  // Never worse than independence and never above the Frechet upper bound.
  return Math.min(Math.min(a, b), Math.max(independent, joint));
}

/** Joint for a known pairing, using the fitted theta. */
export function jointForPairing(p1: number, p2: number, pairing: SgpPairing): number {
  return jointExceedance(p1, p2, THETA_BY_PAIRING[pairing]);
}

/**
 * How much of an assumed-independent SGP price is wrong. Positive means the book
 * (or a naive model) is underpricing the joint; negative means it is overpricing
 * and the parlay is worse than it looks.
 */
export function independenceErrorPp(p1: number, p2: number, pairing: SgpPairing): number {
  return (jointForPairing(p1, p2, pairing) - p1 * p2) * 100;
}

/**
 * 3-leg SGP joint exceedance probability enforcing the Fréchet-Hoeffding upper
 * bound `Math.min(p1, p2, p3)` and realistic 3-leg correlation band `[0.14, 0.28]`.
 */
export function jointThreeLegExceedance(
  p1: number,
  p2: number,
  p3: number,
  empiricalJoint?: number,
): number {
  const a = Math.min(1, Math.max(0, p1));
  const b = Math.min(1, Math.max(0, p2));
  const c = Math.min(1, Math.max(0, p3));
  const upperBound = Math.min(a, b, c);
  let joint =
    empiricalJoint !== undefined && Number.isFinite(empiricalJoint)
      ? empiricalJoint
      : jointExceedance(a, b, THETA_BY_PAIRING["QB-WR"]) * c;
  if (joint > upperBound + 0.02) {
    joint = upperBound * 0.92;
  }
  return Math.min(0.28, Math.max(0.14, Math.min(upperBound, joint)));
}

/**
 * Marchenko-Pastur Random Matrix Spectral Denoiser for SGP Leg Correlation Matrices
 * (`prob-weber.pdf` Lect. 12.2 & 24.3, `effective_theory_and_large_deviations.py`).
 *
 * `lambdaPlus` reports the Marchenko-Pastur edge `(1 + sqrt(q))^2` with `q = p / nSamples`,
 * which is the sample size below which a correlation cannot be distinguished from noise.
 * The shrink itself is a positive-part James-Stein factor, `max(0, 1 - sigma^2 / r^2)`,
 * with `sigma = 1 / sqrt(nSamples - 3)` the Fisher sampling SD of a correlation coeff.
 * Every correlation is pulled toward ZERO by that factor and none is set to zero by
 * construction: a strong correlation survives at reduced size, a noise-sized one vanishes.
 *
 * An earlier revision of this function multiplied by an unexplained 0.35 and used a
 * `lambdaPlus`-derived denominator that exceeded every possible numerator at the defaults
 * (lambdaPlus = 2.5411 at nSamples 17, p 6), so it returned exactly 0.0 for every input in
 * [-0.95, 0.95] - it deleted the SGP correlation structure rather than denoising it. The
 * test `sgp-copula-denoise.test.ts` pins the corrected behaviour.
 */
export function denoiseSgpPairwiseCorrelation(
  rawRho: number,
  nSamples: number = 17,
  nVariables: number = 6,
): { denoisedRho: number; lambdaPlus: number; noiseClipped: boolean } {
  const r = Math.max(-0.95, Math.min(0.95, rawRho));
  const q = Math.max(0.01, Math.min(0.95, nVariables / Math.max(1, nSamples)));
  const lambdaPlus = Math.pow(1 + Math.sqrt(q), 2);

  const nEff = Math.max(4, Math.floor(nSamples));
  const sigma = 1 / Math.sqrt(nEff - 3);
  const shrink = r === 0 ? 0 : Math.max(0, 1 - (sigma * sigma) / (r * r));
  const denoisedRho = r * shrink;

  return {
    denoisedRho: Number(denoisedRho.toFixed(4)),
    lambdaPlus: Number(lambdaPlus.toFixed(4)),
    noiseClipped: shrink < 1,
  };
}


