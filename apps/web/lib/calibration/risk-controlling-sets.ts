/**
 * Distribution-free risk-controlling prediction sets — arXiv 2101.02703
 * ("Distribution-Free, Risk-Controlling Prediction Sets").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes the
 * published slate and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism (Learn-Then-Test): T_lambda = {games with model |edge| >=
 * lambda}; loss = fraction of posted picks that lose (bounded [0,1],
 * monotone decreasing in lambda); calibration = trailing posted picks;
 * choose lambda-hat via the Hoeffding-Bentkus UCB at (alpha=0.45, delta=0.1)
 * and publish only T_lambda-hat. Drawdown variant uses slate max-drawdown
 * as the loss. Waudby-Smith-Ramdas empirical-Bernstein UCB is the tighter
 * fallback when the Hoeffding UCB strangles volume.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT if >= (1-delta) - 0.05 of
 * windows satisfy realized risk <= alpha AND posted volume >= 50% of
 * unfiltered. REJECT the Hoeffding UCB for the WSR empirical-Bernstein UCB
 * if volume collapses (the paper's own Section 6 remedy).
 */

export type UcbFn = (losses: readonly number[], delta: number) => number;

/** Empirical risk: mean of bounded [0,1] losses. */
export function empiricalRisk(losses: readonly number[]): number {
  if (losses.length === 0) return 0;
  return losses.reduce((a, b) => a + b, 0) / losses.length;
}

function bernoulliKl(p: number, q: number): number {
  const pc = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  const qc = Math.min(Math.max(q, 1e-12), 1 - 1e-12);
  return (
    pc * Math.log(pc / qc) + (1 - pc) * Math.log((1 - pc) / (1 - qc))
  );
}

/**
 * Hoeffding-Bentkus style UCB for a [0,1]-bounded mean: the smallest u >=
 * rhat with KL(rhat || u) >= log(1/delta)/n (Chernoff/Bentkus inversion),
 * found by bisection. Upper-bounds the true risk with probability >= 1-delta.
 */
export function hoeffdingBentkusUcb(
  losses: readonly number[],
  delta: number,
): number {
  const n = losses.length;
  if (n === 0) return 1;
  const rhat = empiricalRisk(losses);
  const target = Math.log(1 / Math.max(delta, 1e-12)) / n;
  let lo = rhat;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bernoulliKl(rhat, mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * Waudby-Smith-Ramdas empirical-Bernstein UCB (tighter when variance is
 * small): rhat + sqrt(2 V log(3/delta)/n) + 3 log(3/delta)/n, capped at 1.
 */
export function empiricalBernsteinUcb(
  losses: readonly number[],
  delta: number,
): number {
  const n = losses.length;
  if (n === 0) return 1;
  const rhat = empiricalRisk(losses);
  const mean = rhat;
  let v = 0;
  for (const l of losses) v += (l - mean) * (l - mean);
  v = n > 1 ? v / (n - 1) : 0;
  const c = Math.log(3 / Math.max(delta, 1e-12));
  return Math.min(1, rhat + Math.sqrt((2 * v * c) / n) + (3 * c) / n);
}

export interface LambdaSelection {
  readonly lambdaHat: number | null;
  /** Per-candidate diagnostics, ascending lambda. */
  readonly table: ReadonlyArray<{
    readonly lambda: number;
    readonly volume: number;
    readonly risk: number;
    readonly ucb: number;
  }>;
}

/**
 * RCPS lambda-hat: the smallest lambda such that every larger lambda's UCB
 * is <= alpha (publish T_lambda-hat). Returns null when no candidate
 * controls risk at level alpha.
 */
export function selectLambdaHat(
  candidateLambdas: readonly number[],
  absEdges: readonly number[],
  lost: readonly boolean[],
  alpha: number,
  delta: number,
  ucb: UcbFn = hoeffdingBentkusUcb,
): LambdaSelection {
  const lambdas = [...candidateLambdas].sort((a, b) => a - b);
  const table = lambdas.map((lambda) => {
    const losses: number[] = [];
    for (let i = 0; i < absEdges.length && i < lost.length; i++) {
      if (absEdges[i]! >= lambda) losses.push(lost[i]! ? 1 : 0);
    }
    return {
      lambda,
      volume: losses.length,
      risk: empiricalRisk(losses),
      ucb: ucb(losses, delta),
    };
  });
  let lambdaHat: number | null = null;
  for (let i = 0; i < table.length; i++) {
    const ok = table.slice(i).every((row) => row.ucb <= alpha);
    if (ok) {
      lambdaHat = table[i]!.lambda;
      break;
    }
  }
  return { lambdaHat, table };
}

/**
 * Realized-risk audit: fraction of evaluation windows whose realized loss
 * rate is <= alpha. Gate requires >= (1-delta) - 0.05.
 */
export function realizedRiskAudit(
  windowLossRates: readonly number[],
  alpha: number,
): number {
  if (windowLossRates.length === 0) return 0;
  const ok = windowLossRates.filter((r) => r <= alpha).length;
  return ok / windowLossRates.length;
}

/** Max drawdown of a profit sequence (drawdown variant loss). */
export function maxDrawdown(profits: readonly number[]): number {
  let peak = 0;
  let running = 0;
  let maxDd = 0;
  for (const p of profits) {
    running += p;
    if (running > peak) peak = running;
    maxDd = Math.max(maxDd, peak - running);
  }
  return maxDd;
}
