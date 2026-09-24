// @ts-nocheck
/**
 * arXiv 1910.02600: Deep Evidential Regression.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Deep Evidential Regression: 4-output NIG head (gamma, nu, alpha, beta) with L^NLL + lambda*L^R, single-forward-pass aleatoric + epistemic uncertainty. Epistemic Var[mu] = beta/(nu(alpha-1)) feeds the engine-trust score for selective publishing; intervals are conformalized post-hoc.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add a 4-output evidential head (gamma, nu, alpha, beta; L^NLL + lambda*L^R loss) to the margin/total point heads for single-forward-pass aleatoric + epistemic uncertainty; feed epistemic Var[mu] = beta/(nu(alpha-1)) as the engine-trust score into selective-publish.ts and conformalize the derived intervals.
 *
 * ACCEPTANCE GATE:
 * ADAPT if: NLL improves vs the Gaussian-MLE baseline head AND epistemic uncertainty correlates with absolute error (Spearman >= 0.3) AND the top-uncertainty-decile abstention improves realized win-rate >= 2pp. REJECT the end-to-end head if lambda-tuning proves unstable across seeds -- fall back to post-hoc conformal only.
 *
 * ENABLED=false: training-time head; the trust-score plumbing into selective-publish needs a human call.
 */


export const ENABLED = false;

export interface EvidentialParams {
  readonly gamma: number;
  readonly nu: number;
  readonly alpha: number;
  readonly beta: number;
}

/** Lanczos approximation of log-Gamma. */
export function lgamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }
  const z = x - 1;
  let a = c[0];
  for (let i = 1; i < 9; i++) a += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Evidential NLL for the Normal-Inverse-Gamma head (Amini et al. eq. for L^NLL).
 */
export function evidentialNLL(y: number, p: EvidentialParams): number {
  const { gamma, nu, alpha, beta } = p;
  const twoBetaNu = 2 * beta * (1 + nu);
  return (
    0.5 * Math.log(Math.PI / nu) -
    alpha * Math.log(twoBetaNu) +
    (alpha + 0.5) * Math.log((y - gamma) * (y - gamma) * nu + twoBetaNu) +
    lgamma(alpha) -
    lgamma(alpha + 0.5)
  );
}

/** Evidential regularizer L^R = |y - gamma| * (2*nu + alpha). */
export function evidentialRegularizer(y: number, p: EvidentialParams): number {
  return Math.abs(y - p.gamma) * (2 * p.nu + p.alpha);
}

/** Combined training loss L = L^NLL + lambda * L^R. */
export function evidentialLoss(
  y: number,
  p: EvidentialParams,
  lambda: number,
): number {
  return evidentialNLL(y, p) + lambda * evidentialRegularizer(y, p);
}

/** Aleatoric uncertainty E[sigma^2] = beta / (alpha - 1). */
export function aleatoricUncertainty(p: EvidentialParams): number {
  return p.beta / (p.alpha - 1);
}

/** Epistemic uncertainty Var[mu] = beta / (nu * (alpha - 1)). Engine-trust score input. */
export function epistemicUncertainty(p: EvidentialParams): number {
  return p.beta / (p.nu * (p.alpha - 1));
}

/** Engine-trust score in (0, 1]; high epistemic uncertainty -> low trust. */
export function trustScore(p: EvidentialParams): number {
  return 1 / (1 + epistemicUncertainty(p));
}

/**
 * Top-uncertainty-decile abstention audit: abstain on the highest-epistemic decile
 * and compare realized win rates. Returns the win-rate lift in percentage points.
 */
export function abstentionLift(
  epistemic: readonly number[],
  won: readonly boolean[],
): number {
  const n = epistemic.length;
  if (n === 0) return 0;
  const order = epistemic.map((_, i) => i).sort((a, b) => epistemic[b] - epistemic[a]);
  const k = Math.max(1, Math.floor(n / 10));
  const kept = order.slice(k);
  const base = won.filter(Boolean).length / n;
  const keptRate = kept.filter((i) => won[i]).length / Math.max(kept.length, 1);
  return (keptRate - base) * 100;
}
