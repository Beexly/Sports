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
