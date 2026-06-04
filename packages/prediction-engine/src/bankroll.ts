/**
 * Bankroll / responsible-sizing tools — turn a fair win probability + odds + a
 * user's bankroll into a SUGGESTED stake using fractional Kelly, with hard caps.
 *
 * IMPORTANT (inherits kelly.ts's doctrine): this is NOT a recommendation to bet.
 * It is a money-management lens for someone who has already decided to, and it is
 * deliberately conservative (quarter-Kelly default + a hard per-pick cap + a
 * portfolio over-exposure flag) to PROTECT bankrolls, not maximize action. The
 * platform takes no wagers. Pure, no I/O.
 */
import { fullKellyFraction } from "./kelly.js";

export type KellyMode = "quarter" | "half" | "full" | "flat";

export interface BankrollOptions {
  /** Kelly aggressiveness. Default "quarter" (our conservative house default). */
  readonly mode?: KellyMode;
  /** Hard cap on any single stake, as % of bankroll. Default 5. */
  readonly maxPercentPerPick?: number;
  /** Flat-stake percent when mode = "flat". Default 1. */
  readonly flatPercent?: number;
}

export interface BankrollStake {
  readonly amount: number; // in the user's currency units
  readonly percentOfBankroll: number;
  readonly kellyFraction: number; // 0 for flat staking
  readonly capped: boolean; // was the per-pick cap binding?
}

const MODE_FRACTION: Record<"quarter" | "half" | "full", number> = { quarter: 0.25, half: 0.5, full: 1 };

export function recommendStake(
  bankroll: number,
  winProb: number,
  decimalOdds: number,
  options: BankrollOptions = {},
): BankrollStake {
  const maxPct = options.maxPercentPerPick ?? 5;
  if (!(bankroll > 0)) return { amount: 0, percentOfBankroll: 0, kellyFraction: 0, capped: false };

  let pct: number;
  let kellyFraction = 0;
  if (options.mode === "flat") {
    pct = Math.max(0, options.flatPercent ?? 1);
  } else {
    const mode = options.mode ?? "quarter";
    kellyFraction = MODE_FRACTION[mode];
    const fullKelly = Math.max(0, fullKellyFraction(winProb, decimalOdds)); // fraction of bankroll
    pct = fullKelly * kellyFraction * 100;
  }

  const capped = pct > maxPct;
  const finalPct = Math.max(0, Math.min(pct, maxPct));
  return {
    amount: round2((finalPct / 100) * bankroll),
    percentOfBankroll: round2(finalPct),
    kellyFraction,
    capped,
  };
}

export interface PortfolioSummary {
  readonly totalStake: number;
  readonly percentOfBankroll: number;
  readonly pickCount: number;
  /** True if today's total exposure exceeds a healthy share of bankroll. */
  readonly overexposed: boolean;
}

/** Aggregate today's stakes and flag over-exposure (default healthy cap 15%). */
export function summarizePortfolio(
  bankroll: number,
  stakes: readonly number[],
  maxTotalPercent = 15,
): PortfolioSummary {
  const totalStake = round2(stakes.reduce((a, b) => a + Math.max(0, b), 0));
  const percentOfBankroll = bankroll > 0 ? round2((totalStake / bankroll) * 100) : 0;
  return {
    totalStake,
    percentOfBankroll,
    pickCount: stakes.length,
    overexposed: percentOfBankroll > maxTotalPercent,
  };
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
