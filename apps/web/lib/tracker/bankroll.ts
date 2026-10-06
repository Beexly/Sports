/**
 * Bankroll ledger — append-only local-first record (Wave4 #3).
 *
 * The Kelly calculator (./staking) sizes one bet; this ledger remembers all
 * of them: running bankroll from a starting roll, peak tracking, and a
 * drawdown guard. Pure (no storage I/O here — the caller persists the array).
 * Educational record-keeping, not betting advice.
 */

export type LedgerResult = "win" | "loss" | "push" | "pending";

export type BankrollEntry = {
  readonly id: string;
  /** units risked */
  readonly stake: number;
  readonly result: LedgerResult;
  /** units returned INCLUDING stake (e.g. +110 win on 10 = 19.09); 0 for loss */
  readonly returned?: number;
  readonly note?: string;
};

export type BankrollSummary = {
  readonly start: number;
  readonly current: number;
  readonly peak: number;
  /** peak-to-current drawdown in units (>= 0) */
  readonly drawdown: number;
  readonly settled: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly pending: number;
  /** true when drawdown exceeds maxDrawdownUnits */
  readonly guardTripped: boolean;
};

const r2 = (n: number): number => Math.round(n * 100) / 100;

export function summarizeLedger(
  start: number,
  entries: readonly BankrollEntry[],
  maxDrawdownUnits = start * 0.5,
): BankrollSummary {
  let current = start;
  let peak = start;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;
  for (const e of entries) {
    if (e.result === "pending") {
      pending += 1;
      continue;
    }
    if (e.result === "win") {
      wins += 1;
      current += (e.returned ?? 0) - e.stake;
    } else if (e.result === "loss") {
      losses += 1;
      current -= e.stake;
    } else {
      pushes += 1;
    }
    if (current > peak) peak = current;
  }
  current = r2(current);
  peak = r2(peak);
  const drawdown = r2(Math.max(0, peak - current));
  return {
    start,
    current,
    peak,
    drawdown,
    settled: wins + losses + pushes,
    wins,
    losses,
    pushes,
    pending,
    guardTripped: drawdown > maxDrawdownUnits,
  };
}
