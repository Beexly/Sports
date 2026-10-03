// ============================================================
// CRRA stake MDP with distilled linear staking rule (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2505.00724 — "Optimal Blackjack Betting Strategies Through Dynamic Programming and Expected Utility Theory"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the per-hand (here per-pick) stake is chosen by solving a
 * finite-horizon dynamic program that maximizes expected CRRA utility of
 * terminal wealth; the paper's α-dial interpolates between aggressive and
 * conservative policies, and the DP-optimal policy is then distilled into a
 * simple linear-in-edge staking rule. Internalizing edge uncertainty inside
 * the DP flattens the distilled policy the same way raising α does.
 *
 * IMPROVEMENT (from ledger): Solve a per-pick stake MDP per season (CRRA utility) and distill linear-in-edge staking rules for GSE's per-pick stakes, then re-solve the DP on expected utility under the engine's posterior over edge — testing whether internalizing edge uncertainty flattens the policy the way the paper's α-dial does, yielding a single calibration-driven staking rule instead of a hand-picked α.
 *
 * ACCEPTANCE GATE: ADOPT the DP-distilled linear staking rule if it beats half-Kelly on terminal log growth with max drawdown ≤ half-Kelly's across the 2023–2025 second-half windows, and the distilled slope m is within 25% of the Kelly slope; REJECT otherwise.
 */

/** CRRA utility of wealth: (w^{1−γ} − 1)/(1−γ); γ → 1 is log utility. */
export function crraUtility(wealth: number, gamma: number): number {
  const w = Math.max(wealth, 1e-12);
  if (Math.abs(gamma - 1) < 1e-9) return Math.log(w);
  return (Math.pow(w, 1 - gamma) - 1) / (1 - gamma);
}

/** Inverse CRRA utility (certainty equivalent of a utility value). */
export function crraInverseUtility(u: number, gamma: number): number {
  if (Math.abs(gamma - 1) < 1e-9) return Math.exp(u);
  return Math.pow(Math.max(u * (1 - gamma) + 1, 1e-12), 1 / (1 - gamma));
}

export interface StakeDPConfig {
  /** Discretized bankroll grid (ascending, > 0). */
  wealthGrid: number[];
  /** Candidate stake fractions of bankroll. */
  stakeGrid: number[];
  /** CRRA risk aversion γ (paper's α-dial analog: higher γ = flatter policy). */
  gamma: number;
  /** Edge posterior: possible per-pick edges with probabilities. */
  edgeSupport: number[];
  edgeProbs: number[];
  /** Net return per unit staked on a win / loss (even-money default 1 / -1). */
  winPayoff?: number;
}

/**
 * One-step DP backup: optimal stake fraction at each wealth level for a
 * single remaining pick, maximizing expected CRRA utility of wealth after
 * the pick under the edge posterior.
 */
export function solveStakeDP(config: StakeDPConfig): number[] {
  const winPayoff = config.winPayoff ?? 1;
  const { wealthGrid, stakeGrid, gamma, edgeSupport, edgeProbs } = config;
  return wealthGrid.map((w) => {
    let bestStake = 0;
    let bestEU = -Infinity;
    for (const s of stakeGrid) {
      let eu = 0;
      for (let e = 0; e < edgeSupport.length; e++) {
        const edge = edgeSupport[e]!;
        const pe = edgeProbs[e]!;
        // Win prob implied by edge under even-money-ish payoff: edge = p*(1+win) - (1-p)*1 ...
        // Use the simple map p = (edge + 1) / (winPayoff + 1), clipped.
        const pWin = Math.min(Math.max((edge + 1) / (winPayoff + 1), 0), 1);
        const wWin = w * (1 + s * winPayoff);
        const wLose = w * (1 - s);
        eu += pe * (pWin * crraUtility(wWin, gamma) + (1 - pWin) * crraUtility(wLose, gamma));
      }
      if (eu > bestEU) {
        bestEU = eu;
        bestStake = s;
      }
    }
    return bestStake;
  });
}

/** Least-squares linear-in-edge distillation of a DP stake policy. */
export function distillLinearRule(
  edges: number[],
  stakes: number[],
): { slope: number; intercept: number } {
  const n = edges.length;
  const meanE = edges.reduce((a, b) => a + b, 0) / n;
  const meanS = stakes.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (edges[i]! - meanE) * (stakes[i]! - meanS);
    den += (edges[i]! - meanE) * (edges[i]! - meanE);
  }
  const slope = den > 0 ? num / den : 0;
  return { slope, intercept: meanS - slope * meanE };
}

/** Apply a distilled linear staking rule, floored at zero. */
export function linearStake(slope: number, intercept: number, edge: number): number {
  return Math.max(0, slope * edge + intercept);
}

/**
 * Classical Kelly slope reference: f* = edge / winPayoff, so the slope of
 * the Kelly stake in edge is 1 / winPayoff (1.0 for even money).
 */
export function kellySlopeReference(winPayoff = 1): number {
  return 1 / winPayoff;
}

/** Gate helper: distilled slope within 25% of the Kelly slope. */
export function slopeWithinKelly(slope: number, winPayoff = 1, tol = 0.25): boolean {
  const ref = kellySlopeReference(winPayoff);
  return Math.abs(slope - ref) / ref <= tol;
}
