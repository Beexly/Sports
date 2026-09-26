// @ts-nocheck
/**
 * arXiv 2501.02087v2: Beyond CVaR: Leveraging Static Spectral Risk Measures for Enhanced Decision-Making in Distributional Reinforcement Learning.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Seasonal bet selection under a static spectral risk measure (Mean-CVaR): the risk spectrum (alpha, w) is learned from Garrett's actual historical override decisions by fitting the weights that maximize correlation between the policy's implied weekly risk posture and his overrides — grounding risk tolerance in demonstrated operator behavior, not an arbitrary choice.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Run seasonal bet selection under a Mean-CVaR / static spectral risk measure policy, and learn the risk spectrum from Garrett's actual historical override decisions (fit the (α,w) weights that maximize correlation between the policy's implied weekly risk posture and his overrides) so the risk measure is grounded in demonstrated operator risk tolerance, not an arbitrary choice.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if: on 10k bootstrapped seasons, the Mean-CVaR policy achieves CVaR_{0.2}(season profit) ≥ 1.15 × CVaR_{0.2} of the fixed-threshold baseline AND E[season profit] ≥ 0.95 × baseline expectation (tail protection must cost ≤5% of expectation) AND P(season loss) ≤ 0.8 × baseline.
 *
 * ENABLED=false: seasonal bet-selection policy; needs a human call.
 */


export const ENABLED = false;

/** Mean of losses. */
function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

/** CVaR_alpha of losses: mean of the worst (1-alpha) tail. */
export function cvarLosses(losses: readonly number[], alpha: number): number {
  if (losses.length === 0) return 0;
  const sorted = [...losses].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil((1 - alpha) * sorted.length));
  const tail = sorted.slice(0, k);
  return mean(tail);
}

/**
 * Static spectral risk measure: integral of CVaR over a discrete spectrum.
 * weights sum to 1; alphas in (0, 1).
 */
export function spectralRisk(
  losses: readonly number[],
  alphas: readonly number[],
  weights: readonly number[],
): number {
  return alphas.reduce((a, alpha, i) => a + weights[i]! * cvarLosses(losses, alpha), 0);
}

/** Mean-CVaR: lambda * mean + (1 - lambda) * CVaR_alpha. */
export function meanCvar(
  losses: readonly number[],
  alpha: number,
  lambda: number,
): number {
  return meanCvarClean(losses, alpha, lambda);
}

export function meanCvarClean(
  losses: readonly number[],
  alpha: number,
  lambda: number,
): number {
  return lambda * mean(losses) + (1 - lambda) * cvarLosses(losses, alpha);
}

/**
 * Implied weekly risk posture of a policy: the spectral-risk value of that
 * week's candidate slate losses under the candidate spectrum.
 */
export function impliedRiskPosture(
  weeklySlateLosses: readonly (readonly number[])[],
  alphas: readonly number[],
  weights: readonly number[],
): number[] {
  return weeklySlateLosses.map((losses) => spectralRisk(losses, alphas, weights));
}

function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
num += (a[i]! - ma) * (b[i]! - mb);
da += (a[i]! - ma) * (a[i]! - ma);
db += (b[i]! - mb) * (b[i]! - mb);
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/**
 * Learn the risk spectrum from operator overrides: grid-search (alpha, w)
 * maximizing the correlation between the policy's implied weekly risk posture
 * and the operator's historical override intensity (0 = no override, higher =
 * stronger de-risking override).
 */
export function learnSpectrumFromOverrides(
  weeklySlateLosses: readonly (readonly number[])[],
  overrideIntensity: readonly number[],
  alphaGrid = [0.5, 0.75, 0.8, 0.9, 0.95],
  wGrid = [0, 0.25, 0.5, 0.75, 1],
): { alpha: number; w: number; correlation: number } {
  let best = { alpha: 0.8, w: 0.5, correlation: -Infinity };
  for (const alpha of alphaGrid) {
    for (const w of wGrid) {
      const posture = weeklySlateLosses.map((losses) =>
        w * mean(losses) + (1 - w) * cvarLosses(losses, alpha),
      );
      const corr = pearson(posture, overrideIntensity);
      if (corr > best.correlation) best = { alpha, w, correlation: corr };
    }
  }
  return best;
}

/** Tail-protection gate helpers (10k bootstrapped seasons, evaluated offline). */
export function tailProtectionGates(
  policySeasonProfits: readonly number[],
  baselineSeasonProfits: readonly number[],
): {
  cvarRatio: number;
  expectationRatio: number;
  lossProbRatio: number;
  pass: boolean;
} {
  // Worst-20% tail CVaR: under this module's confidence-level convention
  // (cvarLosses(losses, alpha) = mean of the worst (1-alpha) fraction),
  // the 0.2-tail is cvarLosses(., 0.8).
  const cvarP = cvarLosses(policySeasonProfits.map((p) => -p), 0.8);
  const cvarB = cvarLosses(baselineSeasonProfits.map((p) => -p), 0.8);
  const cvarRatio = cvarB !== 0 ? cvarP / cvarB : 1;
  const expectationRatio = mean(policySeasonProfits) / mean(baselineSeasonProfits);
  const lossProb = (xs: readonly number[]) => xs.filter((x) => x < 0).length / xs.length;
  const lossProbRatio = lossProb(policySeasonProfits) / Math.max(lossProb(baselineSeasonProfits), 1e-9);
  // Gate: CVaR_0.2 >= 1.15x baseline (as profit; lower cost), E >= 0.95x, P(loss) <= 0.8x.
  // Here ratios are on costs, so invert the CVaR comparison.
  const pass = cvarRatio <= 1 / 1.15 && expectationRatio >= 0.95 && lossProbRatio <= 0.8;
  return { cvarRatio, expectationRatio, lossProbRatio, pass };
}
