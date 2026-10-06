/**
 * Anytime-valid model screening via betting e-processes — arXiv 2603.19551v2
 * ("Learning to Bet for Horizon-Aware Anytime-Valid Testing").
 *
 * ADDITIVE utility. Not wired into any promotion path (wiring changes
 * which model version serves production traffic and is a NEEDS HUMAN CALL
 * — see tracking report).
 *
 * Paper mechanism: screen model-version upgrades with an anytime-valid
 * betting e-process over per-pick scores. Wealth E_t = prod_{i<=t}
 * (1 + lambda_i * (score_i - breakeven)); a challenger is promoted the
 * moment E_t >= 1/alpha (statistically valid edge over breakeven) instead
 * of waiting for a fixed-sample test. Betting fractions lambda_i from
 * empirical Kelly or Online Newton Step (ONS); the paper's gate compares
 * deadline rejection probability of a DQN-learned betting strategy vs
 * empirical Kelly at N=100, alpha=0.05 on the Beta-mixture setting.
 *
 * ACCEPTANCE GATE (improvement-ledger): pre-GSE validation — at N=100,
 * alpha=0.05 on the paper's Beta-mixture setting (m=0.45, mu_X=0.40),
 * DQN's deadline rejection probability must exceed empirical Kelly's by
 * >=5pp and match-or-beat the hedge baseline.
 */

/**
 * Empirical-Kelly betting fraction: mean(excess) / mean(excess^2),
 * truncated to [0, 1] (long-only; no betting against the challenger).
 */
export function empiricalKellyLambda(
  excessScores: readonly number[],
): number {
  const n = excessScores.length;
  if (n === 0) return 0;
  let m1 = 0;
  let m2 = 0;
  for (const x of excessScores) {
    m1 += x;
    m2 += x * x;
  }
  m1 /= n;
  m2 /= n;
  if (!(m2 > 0)) return 0;
  return Math.min(Math.max(m1 / m2, 0), 1);
}

/**
 * ONS-style betting fraction: 1/2 truncated Newton step on the log-wealth,
 * lambda_t = clamp(0.5 * A_{t-1}^{-1} * b_{t-1}) with diagonal
 * second-moment accumulator. Simplified scalar version.
 */
export function onsLambda(excessScores: readonly number[]): number {
  const n = excessScores.length;
  if (n === 0) return 0;
  let b = 0;
  let a = 1; // regularized second-moment accumulator
  for (const x of excessScores) {
    const capped = Math.min(Math.max(x, -1), 1);
    a += capped * capped;
    b += capped;
  }
  return Math.min(Math.max(0.5 * (b / a), 0), 1);
}

/**
 * One e-process step: E_t = E_{t-1} * (1 + lambda * (score - breakeven)).
 * Floors at 0 (a bankrupt skeptic stays bankrupt).
 */
export function eProcessUpdate(
  ePrev: number,
  score: number,
  breakeven: number,
  lambda: number,
): number {
  return Math.max(ePrev * (1 + lambda * (score - breakeven)), 0);
}

/**
 * Run the e-process over a score stream with per-step betting fractions
 * from `lambdaFn` (fit on history before each step). Returns the wealth
 * path and the first rejection time (null = never).
 */
export function runEProcess(
  scores: readonly number[],
  breakeven: number,
  alpha: number,
  lambdaFn: (history: readonly number[]) => number = empiricalKellyLambda,
): { readonly wealthPath: number[]; readonly rejectionTime: number | null } {
  const wealthPath: number[] = [];
  let e = 1;
  let rejectionTime: number | null = null;
  const excess: number[] = [];
  for (let t = 0; t < scores.length; t++) {
    const lambda = lambdaFn(excess);
    e = eProcessUpdate(e, scores[t]!, breakeven, lambda);
    wealthPath.push(e);
    excess.push(scores[t]! - breakeven);
    if (rejectionTime === null && e >= 1 / Math.max(alpha, 1e-12)) {
      rejectionTime = t + 1;
    }
  }
  return { wealthPath, rejectionTime };
}

/** Anytime rejection: promote the challenger once wealth >= 1/alpha. */
export function anytimeReject(wealth: number, alpha: number): boolean {
  return wealth >= 1 / Math.max(alpha, 1e-12);
}
