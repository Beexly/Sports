// ============================================================
// Bet-cadence policy (Kelly bet frequency) (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the
 * held-out net-growth gate to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1801.06737 — "At What Frequency Should the Kelly Bettor Bet?"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the paper's sufficient-attractiveness test
 * E[1/(1+X)] <= 1 tells when a betting opportunity is already
 * frequency-optimal (no gain from re-staking more often); the optimal
 * re-stake cadence maximizes the per-period growth rate g_n net of
 * transaction costs, with bankroll resetting to cash each period
 * (discretely-settling, no let-it-ride).
 *
 * IMPROVEMENT (from ledger): Add a bet-cadence policy to sizing: (1)
 * implement the sufficient-attractiveness test E[1/(1+X)] <= 1 on GSE's
 * per-pick edge distribution as a 'stale-edge' screen -- when it holds, do
 * not chase more frequent re-staking, since sizing is already
 * frequency-optimal; (2) build a bet-cadence optimizer: given GSE edge
 * estimates, vig (effective epsilon), and line-move volatility, choose
 * re-stake cadence n by maximizing g_n net of costs (discretely-settling
 * adaptation -- bankroll resets to cash each slate, no let-it-ride); (3)
 * surface a 'not worth betting yet' state in the staking UI when
 * transaction-cost-adjusted growth is negative at all cadences.
 *
 * ACCEPTANCE GATE: ADOPT the cadence optimizer if it beats baseline
 * realized net log growth by >= 3% on the held-out season with no increase
 * in realized max drawdown. REJECT otherwise.
 */

export interface CadenceInputs {
  /** Mean net return per unit staked per bet (after vig). */
  edgeMean: number;
  /** Variance of net return per unit staked. */
  edgeVar: number;
  /** Transaction cost per re-stake event, as a fraction of bankroll. */
  costPerRestake: number;
  /** Max cadence (re-stakes per slate window) to consider. */
  maxCadence: number;
}

export type CadenceDecision =
  | { state: "BET"; cadence: number; netGrowth: number; staleEdgeScreen: boolean }
  | { state: "NOT_WORTH_BETTING"; cadence: 0; netGrowth: number; staleEdgeScreen: boolean };

/**
 * Sufficient-attractiveness ('stale-edge') screen: E[1/(1+X)] <= 1 on the
 * per-pick edge distribution. When it holds, the sizing is already
 * frequency-optimal — do not chase more frequent re-staking.
 * Approximated on a normal(edgeMean, edgeVar) edge distribution via
 * Gauss-Hermite-free Monte Carlo over a fixed grid (deterministic).
 */
export function sufficientAttractiveness(edgeMean: number, edgeVar: number): boolean {
  if (edgeVar <= 0) return edgeMean > 0;
  const sd = Math.sqrt(edgeVar);
  // Deterministic 21-point Gauss-Legendre-ish grid over [-4, 4] sd.
  let acc = 0;
  let norm = 0;
  const N = 41;
  for (let i = 0; i < N; i++) {
    const z = -4 + (8 * i) / (N - 1);
    const w = Math.exp(-0.5 * z * z);
    const x = edgeMean + sd * z;
    if (1 + x > 0) {
      acc += w / (1 + x);
      norm += w;
    }
  }
  return norm > 0 && acc / norm <= 1;
}

/**
 * Net per-window log growth at re-stake cadence n (discretely-settling:
 * bankroll resets to cash each slate, no let-it-ride). Growth scales
 * sub-linearly with cadence (diminishing re-staking benefit) while costs
 * scale linearly — the paper's core tradeoff.
 */
export function netGrowthAtCadence(inputs: CadenceInputs, cadence: number): number {
  const { edgeMean, edgeVar, costPerRestake } = inputs;
  if (cadence <= 0) return 0;
  // Per-bet log-growth proxy: mu - var/2 (second-order Kelly growth rate).
  const perBetGrowth = edgeMean - 0.5 * edgeVar;
  // Diminishing returns to re-staking frequency: 1 - exp(-n / n0), n0 = 4.
  const frequencyBenefit = 1 - Math.exp(-cadence / 4);
  return perBetGrowth * frequencyBenefit - costPerRestake * cadence;
}

/** Choose the re-stake cadence maximizing net growth; NOT_WORTH_BETTING when all cadences are negative. */
export function chooseCadence(inputs: CadenceInputs): CadenceDecision {
  const staleEdgeScreen = sufficientAttractiveness(inputs.edgeMean, inputs.edgeVar);
  let best = { cadence: 0, netGrowth: 0 };
  for (let n = 1; n <= Math.max(1, inputs.maxCadence); n++) {
    const g = netGrowthAtCadence(inputs, n);
    if (g > best.netGrowth) best = { cadence: n, netGrowth: g };
  }
  if (best.cadence === 0 || best.netGrowth <= 0) {
    return { state: "NOT_WORTH_BETTING", cadence: 0, netGrowth: best.netGrowth, staleEdgeScreen };
  }
  return { state: "BET", cadence: best.cadence, netGrowth: best.netGrowth, staleEdgeScreen };
}

/** Gate helper: net log growth beats baseline by >= 3% with no worse max drawdown. */
export function cadenceGatePasses(
  candidateNetGrowth: number,
  baselineNetGrowth: number,
  candidateMaxDd: number,
  baselineMaxDd: number,
): boolean {
  return candidateNetGrowth >= 1.03 * baselineNetGrowth && candidateMaxDd <= baselineMaxDd;
}
