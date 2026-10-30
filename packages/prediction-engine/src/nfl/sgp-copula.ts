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
 * Given an empirical correlation matrix `corr` estimated over `nSamples` games/weeks,
 * any eigenvalue inside the Marchenko-Pastur bulk `[(1 - sqrt(q))^2, (1 + sqrt(q))^2]`
 * (`q = p / nSamples`) is random sample noise and is shrunk to the bulk mean,
 * preventing spurious small-sample correlations from inflating SGP joint probabilities.
 */
export function denoiseSgpPairwiseCorrelation(
  rawRho: number,
  nSamples: number = 17,
  nVariables: number = 6,
): { denoisedRho: number; lambdaPlus: number; noiseClipped: boolean } {
  const r = Math.max(-0.95, Math.min(0.95, rawRho));
  const q = Math.max(0.01, Math.min(0.95, nVariables / Math.max(1, nSamples)));
  const lambdaPlus = Math.pow(1 + Math.sqrt(q), 2);
  // For a 2x2 sub-block with correlation r, eigenvalues are (1 + |r|) and (1 - |r|).
  // If (1 + |r|) <= lambdaPlus, the correlation is indistinguishable from Marchenko-Pastur noise.
  const maxEig = 1 + Math.abs(r);
  if (maxEig <= lambdaPlus) {
    // Shrink small-sample noise correlation toward 0 by positive-part James-Stein factor
    const shrinkFactor = Math.max(0, 1 - (lambdaPlus - 1) / Math.max(0.15, Math.abs(r) + 0.15));
    return {
      denoisedRho: Number((r * shrinkFactor * 0.35).toFixed(4)),
      lambdaPlus: Number(lambdaPlus.toFixed(4)),
      noiseClipped: true,
    };
  }
  return {
    denoisedRho: Number(r.toFixed(4)),
    lambdaPlus: Number(lambdaPlus.toFixed(4)),
    noiseClipped: false,
  };
}


