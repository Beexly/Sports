/**
 * Risk-seeking drawdown-recovery MDP — arXiv 2312.01586v1
 * ("On the Maximization of Long-Run Reward CVaR for Markov Decision
 * Processes").
 *
 * ADDITIVE utility. Not wired into any staking path (wiring changes real
 * stakes and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: loss frame = bankroll below its trailing peak by >= 8%
 * (drawdown >= 8%); outside the frame the risk-averse stack governs. Small
 * tabular MDP: states = {normal, hot, cold} bankroll-momentum x {high, low}
 * edge-availability (6 states); actions = stake tiers {0.5u, 1u, 2u, 3u};
 * transitions estimated from historical weekly P&L sequences; reward =
 * weekly profit. The paper solves two LPs for max CVaR_alpha (alpha=0.7,
 * right tail) + beta*mean with beta tuned so mean is not sacrificed; the
 * stationary randomized policy has <= 1 randomization (Theorem 2), e.g. "in
 * (drawdown, high-edge): post 1u with p=0.8, 3u with p=0.2". Extensions:
 * depth-conditioned alpha/beta (re-solve per drawdown-depth bucket) and a
 * distributionally robust MDP variant (uncertainty set on transitions).
 *
 * This module implements the state classification, the randomized policy
 * table serving (precomputed monthly, weekly lookup), and the walk-forward
 * gate metrics (recovery time, final bankroll, max drawdown). LP solving
 * stays offline; the policy table is the auditable artifact.
 *
 * ACCEPTANCE GATE (improvement-ledger): ACCEPT if walk-forward 2024-2025:
 * recovery time from >=8% drawdown <= 0.75x best baseline's AND final
 * bankroll >= best baseline's AND max drawdown <= 1.2x the freeze
 * baseline's.
 */

export type Momentum = "normal" | "hot" | "cold";
export type EdgeAvailability = "high" | "low";
export type MdpState = `${Momentum}:${EdgeAvailability}`;
export type StakeTier = 0.5 | 1 | 2 | 3;

export interface PolicyEntry {
  readonly action: StakeTier;
  /** Probability of sampling this action (sums to 1 per state). */
  readonly prob: number;
}

export type PolicyTable = Readonly<Record<MdpState, ReadonlyArray<PolicyEntry>>>;

/** Drawdown as a fraction of the trailing peak. */
export function drawdownFraction(bankroll: number, peak: number): number {
  if (!(peak > 0)) return 0;
  return Math.max(0, (peak - bankroll) / peak);
}

/**
 * Momentum classification: "cold" when drawdown >= 8% (the paper's loss
 * frame), "hot" when bankroll exceeds the trailing peak, else "normal".
 */
export function classifyMomentum(bankroll: number, trailingPeak: number): Momentum {
  if (bankroll > trailingPeak) return "hot";
  if (drawdownFraction(bankroll, trailingPeak) >= 0.08) return "cold";
  return "normal";
}

/** Full 6-state classification from bankroll state + edge availability. */
export function classifyMdpState(
  bankroll: number,
  trailingPeak: number,
  edgeAvailability: EdgeAvailability,
): MdpState {
  return `${classifyMomentum(bankroll, trailingPeak)}:${edgeAvailability}`;
}

/**
 * Sample an action from the state's randomized policy. The paper's
 * Theorem 2: at most one randomization per state in the optimal policy.
 */
export function samplePolicyAction(
  table: PolicyTable,
  state: MdpState,
  rand: () => number,
): StakeTier {
  const entries = table[state] ?? [{ action: 1 as StakeTier, prob: 1 }];
  let u = rand();
  for (const e of entries) {
    u -= e.prob;
    if (u <= 0) return e.action;
  }
  return entries[entries.length - 1]!.action;
}

/** Validate a policy table: probabilities sum to 1 per state, actions valid. */
export function validatePolicyTable(table: PolicyTable): boolean {
  const tiers: ReadonlyArray<number> = [0.5, 1, 2, 3];
  const states: MdpState[] = [
    "normal:high", "normal:low", "hot:high", "hot:low", "cold:high", "cold:low",
  ];
  for (const s of states) {
    const entries = table[s];
    if (!entries || entries.length === 0) return false;
    let sum = 0;
    for (const e of entries) {
      if (!tiers.includes(e.action) || e.prob < 0 || e.prob > 1) return false;
      sum += e.prob;
    }
    if (Math.abs(sum - 1) > 1e-9) return false;
  }
  return true;
}

export interface WalkForwardMetrics {
  /** Weeks from first >=8% drawdown to full recovery (peak re-attained). */
  readonly recoveryWeeks: number;
  readonly finalBankroll: number;
  readonly maxDrawdown: number;
}

/**
 * Gate metrics from a weekly P&L sequence under a fixed stake policy.
 * Recovery = weeks from the first >=8% drawdown until bankroll re-attains
 * its prior peak; Infinity when never recovered.
 */
export function walkForwardMetrics(
  weeklyProfits: readonly number[],
  startBankroll: number,
): WalkForwardMetrics {
  let bankroll = startBankroll;
  let peak = startBankroll;
  let maxDd = 0;
  let drawdownStart: number | null = null;
  let recoveryWeeks = 0;
  for (let w = 0; w < weeklyProfits.length; w++) {
    bankroll += weeklyProfits[w]!;
    if (bankroll > peak) {
      if (drawdownStart !== null && drawdownFraction(bankroll, peak) < 0.08) {
        recoveryWeeks = w - drawdownStart;
        drawdownStart = null;
      }
      peak = bankroll;
    }
    const dd = drawdownFraction(bankroll, peak);
    maxDd = Math.max(maxDd, dd);
    if (dd >= 0.08 && drawdownStart === null) drawdownStart = w;
  }
  if (drawdownStart !== null) recoveryWeeks = Number.POSITIVE_INFINITY;
  return { recoveryWeeks, finalBankroll: bankroll, maxDrawdown: maxDd };
}
