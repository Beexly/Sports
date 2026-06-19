/**
 * Bankroll management utilities — pure math, zero dependencies.
 *
 * Unit sizing, Kelly variants, drawdown analysis, stop-loss,
 * and risk-of-ruin calculations for sports betting bankroll management.
 * All functions are pure and work on explicit inputs — no global state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankrollSnapshot {
  readonly balance: number;
  readonly stake: number;
  readonly outcome: "win" | "loss" | "push";
  readonly profitLoss: number;
  readonly runningBalance: number;
}

export interface DrawdownAnalysis {
  readonly maxDrawdown: number;       // maximum peak-to-trough
  readonly maxDrawdownPct: number;    // as fraction of peak
  readonly currentDrawdown: number;   // from current peak to current value
  readonly currentDrawdownPct: number;
  readonly peakBalance: number;
  readonly worstStreak: number;       // longest losing streak
}

export interface RiskProfile {
  readonly kellyFull: number;         // full Kelly fraction
  readonly kellyHalf: number;         // half Kelly
  readonly kellyQuarter: number;      // quarter Kelly
  readonly unitPct: number;           // recommended unit as % of bankroll
  readonly unitsCount: number;        // integer units to bet given bankroll
  readonly dollarsPerUnit: number;
}

// ---------------------------------------------------------------------------
// Kelly criterion
// ---------------------------------------------------------------------------

/**
 * Kelly criterion stake in dollars.
 * k = (b * winProb - (1-winProb)) / b  where b = decimalOdds - 1
 * stake = max(0, k * fraction) * bankroll
 * Returns 0 if edge is negative.
 */
export function kellyStake(
  bankroll: number,
  winProb: number,
  decimalOdds: number,
  fraction = 1.0,
): number {
  const b = decimalOdds - 1;
  if (b <= 0 || winProb <= 0 || winProb >= 1) return 0;
  const k = (b * winProb - (1 - winProb)) / b;
  return Math.max(0, k * fraction) * bankroll;
}

/**
 * Kelly fraction (not dollars) — same as k * fraction, clamped to [0, 1].
 * Returns 0 if there is no edge.
 */
export function kellyUnits(
  winProb: number,
  decimalOdds: number,
  fraction = 1.0,
): number {
  const b = decimalOdds - 1;
  if (b <= 0 || winProb <= 0 || winProb >= 1) return 0;
  const k = (b * winProb - (1 - winProb)) / b;
  return Math.min(1, Math.max(0, k * fraction));
}

// ---------------------------------------------------------------------------
// Flat / unit staking
// ---------------------------------------------------------------------------

/**
 * Unit stake as a percentage of bankroll.
 * bankroll * (unitPct / 100)
 */
export function unitStake(bankroll: number, unitPct: number): number {
  return bankroll * (unitPct / 100);
}

/**
 * Fixed flat-unit stake — returns unitSize as-is (for clarity in pipelines).
 */
export function flatStake(bankroll: number, unitSize: number): number {
  void bankroll; // parameter kept for consistent call-site signature
  return unitSize;
}

// ---------------------------------------------------------------------------
// Risk of ruin
// ---------------------------------------------------------------------------

/**
 * Gambler's ruin formula: ((1-winRate)/winRate)^maxLosses
 * winRate   = probability of winning each bet
 * maxLosses = number of units at risk (bankroll / unitSize)
 * Returns probability of ruin [0, 1].
 * Returns 1 if winRate <= 0.5 in the general (unfavorable) case.
 */
export function riskOfRuin(
  winRate: number,
  unitSize: number,
  maxLosses: number,
): number {
  if (winRate <= 0) return 1;
  if (winRate >= 1) return 0;
  // Number of unit-sized bets the bankroll can absorb
  const units = unitSize > 0 ? maxLosses : 0;
  if (winRate <= 0.5) return 1;
  const ratio = (1 - winRate) / winRate;
  return Math.min(1, Math.max(0, Math.pow(ratio, units)));
}

// ---------------------------------------------------------------------------
// Expected growth
// ---------------------------------------------------------------------------

/**
 * Expected logarithmic bankroll growth per bet (Kelly-growth formula).
 * G = p * log(1 + f * b) + (1-p) * log(1 - f)
 * where b = decimalOdds - 1, f = betFraction
 * Returns G (negative means expected to lose money over time).
 */
export function expectedGrowth(
  winProb: number,
  decimalOdds: number,
  betFraction: number,
): number {
  const b = decimalOdds - 1;
  const lossArg = 1 - betFraction;
  const winArg = 1 + betFraction * b;
  if (lossArg <= 0 || winArg <= 0) return -Infinity;
  return winProb * Math.log(winArg) + (1 - winProb) * Math.log(lossArg);
}

/**
 * Simulate deterministic (expected-value) bankroll growth over N bets.
 * Each step: newBalance = balance * (1 + EV * betFraction)
 * where EV = winProb*(decimalOdds-1) - (1-winProb)
 * Returns array of balances (length = bets + 1, first element is initial bankroll).
 */
export function simulateGrowth(
  bankroll: number,
  winProb: number,
  decimalOdds: number,
  betFraction: number,
  bets: number,
): number[] {
  const b = decimalOdds - 1;
  const ev = winProb * b - (1 - winProb);
  const growthFactor = 1 + ev * betFraction;
  const balances: number[] = [bankroll];
  let current = bankroll;
  for (let i = 0; i < bets; i++) {
    current = current * growthFactor;
    balances.push(current);
  }
  return balances;
}

// ---------------------------------------------------------------------------
// Drawdown analysis
// ---------------------------------------------------------------------------

/**
 * Calculate peak-to-trough drawdown metrics from a series of balances.
 * - Peak = running maximum
 * - maxDrawdown = largest (peak - trough) observed
 * - currentDrawdown = peakBalance - last balance
 */
export function analyzeDrawdown(balances: readonly number[]): DrawdownAnalysis {
  if (balances.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      currentDrawdown: 0,
      currentDrawdownPct: 0,
      peakBalance: 0,
      worstStreak: 0,
    };
  }

  let peak = balances[0];
  let peakBalance = balances[0];
  let maxDrawdown = 0;
  let maxDrawdownPctPeak = balances[0]; // the peak at which the max DD occurred

  // Track losing streaks to report worstStreak
  // We approximate a "loss" as each step where balance decreases
  let worstStreak = 0;
  let currentStreak = 0;

  for (let i = 1; i < balances.length; i++) {
    const bal = balances[i];
    const prev = balances[i - 1];

    if (bal < prev) {
      currentStreak++;
      if (currentStreak > worstStreak) worstStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    if (bal > peak) {
      peak = bal;
      if (peak > peakBalance) peakBalance = peak;
    } else {
      const dd = peak - bal;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownPctPeak = peak;
      }
    }
  }

  const currentBalance = balances[balances.length - 1];
  const currentDrawdown = Math.max(0, peakBalance - currentBalance);
  const maxDrawdownPct = maxDrawdownPctPeak > 0 ? maxDrawdown / maxDrawdownPctPeak : 0;
  const currentDrawdownPct = peakBalance > 0 ? currentDrawdown / peakBalance : 0;

  return {
    maxDrawdown,
    maxDrawdownPct,
    currentDrawdown,
    currentDrawdownPct,
    peakBalance,
    worstStreak,
  };
}

// ---------------------------------------------------------------------------
// Streak analysis
// ---------------------------------------------------------------------------

/**
 * Count longest win/loss streaks and the current streak.
 */
export function streakAnalysis(
  outcomes: readonly ("win" | "loss" | "push")[],
): {
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  currentStreakType: "win" | "loss" | "push" | "none";
} {
  if (outcomes.length === 0) {
    return {
      longestWinStreak: 0,
      longestLossStreak: 0,
      currentStreak: 0,
      currentStreakType: "none",
    };
  }

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let winRun = 0;
  let lossRun = 0;

  for (const o of outcomes) {
    if (o === "win") {
      winRun++;
      lossRun = 0;
    } else if (o === "loss") {
      lossRun++;
      winRun = 0;
    } else {
      winRun = 0;
      lossRun = 0;
    }
    if (winRun > longestWinStreak) longestWinStreak = winRun;
    if (lossRun > longestLossStreak) longestLossStreak = lossRun;
  }

  const last = outcomes[outcomes.length - 1];
  // Re-count current streak length from the end
  let currentStreak = 0;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (outcomes[i] === last) currentStreak++;
    else break;
  }

  return {
    longestWinStreak,
    longestLossStreak,
    currentStreak,
    currentStreakType: last,
  };
}

// ---------------------------------------------------------------------------
// Stop-loss
// ---------------------------------------------------------------------------

/**
 * Returns true if the drawdown from startBalance exceeds stopLossPct.
 * e.g. startBalance=1000, currentBalance=700, stopLossPct=25 → true (30% drawdown)
 */
export function stopLossCheck(
  currentBalance: number,
  startBalance: number,
  stopLossPct: number,
): boolean {
  if (startBalance <= 0) return false;
  const drawdownPct = ((startBalance - currentBalance) / startBalance) * 100;
  return drawdownPct > stopLossPct;
}

// ---------------------------------------------------------------------------
// Risk profile
// ---------------------------------------------------------------------------

/**
 * Compute a full risk profile for a given edge.
 * unitPct = 1.0 (1 unit = 1% of bankroll — standard sports betting unit)
 * unitsCount = unitCount (default 100)
 * dollarsPerUnit = bankroll / unitCount
 */
export function buildRiskProfile(
  bankroll: number,
  winProb: number,
  decimalOdds: number,
  unitCount = 100,
): RiskProfile {
  return {
    kellyFull: kellyUnits(winProb, decimalOdds, 1.0),
    kellyHalf: kellyUnits(winProb, decimalOdds, 0.5),
    kellyQuarter: kellyUnits(winProb, decimalOdds, 0.25),
    unitPct: 1.0,
    unitsCount: unitCount,
    dollarsPerUnit: unitCount > 0 ? bankroll / unitCount : 0,
  };
}

// ---------------------------------------------------------------------------
// Payout helpers
// ---------------------------------------------------------------------------

/**
 * Total payout (stake * decimalOdds).
 */
export function payoutFromStake(stake: number, decimalOdds: number): number {
  return stake * decimalOdds;
}

/**
 * Profit only (stake * (decimalOdds - 1)).
 */
export function profitFromStake(stake: number, decimalOdds: number): number {
  return stake * (decimalOdds - 1);
}

/**
 * Stake required to achieve a target profit at given decimal odds.
 * stake = targetProfit / (decimalOdds - 1)
 */
export function stakeForTargetProfit(
  targetProfit: number,
  decimalOdds: number,
): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  return targetProfit / b;
}

// ---------------------------------------------------------------------------
// Cumulative P/L
// ---------------------------------------------------------------------------

/**
 * Calculate running cumulative P/L given parallel arrays of stakes, outcomes,
 * and decimal odds.
 * win:  +profit (stake * (odds-1))
 * loss: -stake
 * push: 0
 * Returns array of cumulative P/L values (same length as stakes).
 */
export function cumulativeProfitLoss(
  stakes: readonly number[],
  outcomes: readonly ("win" | "loss" | "push")[],
  decimalOdds: readonly number[],
): number[] {
  const result: number[] = [];
  let running = 0;
  const len = Math.min(stakes.length, outcomes.length, decimalOdds.length);
  for (let i = 0; i < len; i++) {
    const stake = stakes[i];
    const odds = decimalOdds[i];
    const outcome = outcomes[i];
    if (outcome === "win") {
      running += profitFromStake(stake, odds);
    } else if (outcome === "loss") {
      running -= stake;
    }
    // push: no change
    result.push(running);
  }
  return result;
}
