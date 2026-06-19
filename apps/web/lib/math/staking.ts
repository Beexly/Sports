/**
 * Staking plan calculators — pure math, zero dependencies.
 *
 * Common staking systems used in sports betting analysis:
 * - Level stakes (flat betting)
 * - Percentage of bankroll (Kelly-fraction aligned)
 * - Fibonacci staking (chase recovery — documented for analysis, NOT recommended)
 * - Proportional Kelly staking
 *
 * These are ANALYTICAL tools for understanding bet sizing mathematics,
 * not recommendations. Never auto-applies; always requires user action.
 */

export interface StakingResult {
  readonly stake: number;       // recommended stake amount
  readonly rationale: string;   // human-readable explanation
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
}

/** Level stakes: always bet the same fixed amount. */
export function levelStake(amount: number): StakingResult {
  if (amount < 0) throw new RangeError("amount must be non-negative");
  return {
    stake: amount,
    rationale: `Flat stake of ${amount} per bet regardless of bankroll size.`,
    riskLevel: "LOW",
  };
}

/** Percentage bankroll: stake a fixed % of current bankroll. */
export function percentageBankroll(bankroll: number, pct: number): StakingResult {
  if (bankroll < 0) throw new RangeError("bankroll must be non-negative");
  if (pct < 0 || pct > 100) throw new RangeError("pct must be between 0 and 100");

  const stake = (bankroll * pct) / 100;
  let riskLevel: StakingResult["riskLevel"];
  if (pct <= 2) {
    riskLevel = "LOW";
  } else if (pct <= 5) {
    riskLevel = "MEDIUM";
  } else if (pct <= 10) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "VERY_HIGH";
  }

  return {
    stake,
    rationale: `${pct}% of ${bankroll} bankroll = ${stake} stake.`,
    riskLevel,
  };
}

/**
 * Kelly staking: optimal stake from edge and odds.
 * Fraction of bankroll = (bp - q) / b where:
 *   b = decimal odds - 1
 *   p = your estimated win probability
 *   q = 1 - p
 *
 * Returns 0 stake (no bet) when edge is negative.
 */
export function kellyStake(params: {
  bankroll: number;
  winProb: number;       // 0–1, your estimated probability
  decimalOdds: number;
  fraction?: number;     // Kelly fraction to use (default 0.25 = quarter Kelly)
}): StakingResult {
  const { bankroll, winProb, decimalOdds } = params;
  const fraction = params.fraction ?? 0.25;

  if (bankroll < 0) throw new RangeError("bankroll must be non-negative");
  if (winProb < 0 || winProb > 1) throw new RangeError("winProb must be between 0 and 1");
  if (decimalOdds <= 1) throw new RangeError("decimalOdds must be greater than 1");
  if (fraction < 0 || fraction > 1) throw new RangeError("fraction must be between 0 and 1");

  const b = decimalOdds - 1;
  const q = 1 - winProb;
  const fullKelly = (b * winProb - q) / b;

  if (fullKelly <= 0) {
    return {
      stake: 0,
      rationale: `Negative or zero edge (full Kelly = ${fullKelly.toFixed(4)}). No bet recommended.`,
      riskLevel: "LOW",
    };
  }

  const appliedFraction = fullKelly * fraction;
  const stake = bankroll * appliedFraction;

  let riskLevel: StakingResult["riskLevel"];
  if (appliedFraction <= 0.02) {
    riskLevel = "LOW";
  } else if (appliedFraction <= 0.05) {
    riskLevel = "MEDIUM";
  } else if (appliedFraction <= 0.1) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "VERY_HIGH";
  }

  return {
    stake,
    rationale: `${(fraction * 100).toFixed(0)}% Kelly (full Kelly = ${(fullKelly * 100).toFixed(2)}%) on ${bankroll} bankroll = ${stake.toFixed(2)} stake.`,
    riskLevel,
  };
}

/**
 * Get the Nth Fibonacci number (0-indexed) using the staking sequence convention.
 *
 * Staking Fibonacci sequence: 1, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...
 * index:                       0  1  2  3  4  5  6   7   8   9
 *
 * This mirrors the classic sports-betting staking plan where you start at 1 unit
 * and only begin accumulating from position 3 onward. The first three positions
 * all yield 1 unit (the base stake), making the initial risk symmetric.
 *
 * Standard recurrence: fib(n) = fib(n-1) + fib(n-2) for n >= 3,
 * with fib(0) = fib(1) = fib(2) = 1.
 */
export function fibonacciAt(n: number): number {
  if (n < 0) throw new RangeError("n must be non-negative");
  // Staking sequence: 1, 1, 1, 2, 3, 5, 8, 13, 21, ...
  // index:             0  1  2  3  4  5  6   7   8
  if (n <= 2) return 1;
  let a = 1; // fib(n-2)
  let b = 1; // fib(n-1)
  for (let i = 3; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

/**
 * Fibonacci staking: increase stake to next Fibonacci number after a loss,
 * reset to start after a win. This is a martingale-style system — VERY HIGH risk.
 *
 * Returns the stake for position N in the Fibonacci sequence (0-indexed).
 * Unit multiplied by fibonacciAt(lossStreak).
 *
 * @warning Fibonacci/martingale systems do not overcome house edge and carry
 * exponential risk of ruin. Documented for analysis purposes only.
 */
export function fibonacciStake(params: {
  unit: number;         // base unit size
  lossStreak: number;   // number of consecutive losses (0 = starting position)
  maxN?: number;        // safety cap, default 8 (value: 21 units max)
}): StakingResult {
  const { unit, lossStreak } = params;
  const maxN = params.maxN ?? 8;

  if (unit <= 0) throw new RangeError("unit must be positive");
  if (lossStreak < 0) throw new RangeError("lossStreak must be non-negative");
  if (maxN < 0) throw new RangeError("maxN must be non-negative");

  const effectiveN = Math.min(lossStreak, maxN);
  const fibValue = fibonacciAt(effectiveN);
  const stake = unit * fibValue;
  const capped = lossStreak > maxN;

  return {
    stake,
    rationale: `Fibonacci position ${effectiveN}${capped ? ` (capped from ${lossStreak})` : ""}: ${fibValue} × ${unit} unit = ${stake}.`,
    riskLevel: "VERY_HIGH",
  };
}

/** Compute expected value of a bet. */
export function expectedValue(params: {
  stake: number;
  winProb: number;
  decimalOdds: number;
}): number {
  const { stake, winProb, decimalOdds } = params;
  const profit = stake * (decimalOdds - 1);
  return winProb * profit - (1 - winProb) * stake;
}

/** Compute break-even probability for given decimal odds. */
export function breakEvenProb(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0;
  return 1 / decimalOdds;
}

/** Compute return on investment given stakes and returns. */
export function roi(totalReturns: number, totalStaked: number): number {
  if (totalStaked === 0) return 0;
  return (totalReturns - totalStaked) / totalStaked;
}

export interface BankrollStats {
  readonly currentBankroll: number;
  readonly startingBankroll: number;
  readonly pnl: number;
  readonly pnlPct: number;
  readonly roi: number;
}

/** Compute bankroll statistics over a series of bets. */
export function bankrollStats(
  startingBankroll: number,
  betResults: readonly { stake: number; returns: number }[]
): BankrollStats {
  let totalStaked = 0;
  let totalReturns = 0;

  for (const bet of betResults) {
    totalStaked += bet.stake;
    totalReturns += bet.returns;
  }

  const pnl = totalReturns - totalStaked;
  const currentBankroll = startingBankroll + pnl;
  const pnlPct = startingBankroll === 0 ? 0 : pnl / startingBankroll;
  const roiValue = roi(totalReturns, totalStaked);

  return {
    currentBankroll,
    startingBankroll,
    pnl,
    pnlPct,
    roi: roiValue,
  };
}
