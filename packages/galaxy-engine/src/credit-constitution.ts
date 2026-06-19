/**
 * THE CREDIT CONSTITUTION (bible §4.2) — enforced in code, not just policy.
 *
 *   1. No Galaxy currency ever converts to cash.
 *   2. No currency is ever the stake in a real-money wager.
 *   3. The line is enforced ARCHITECTURALLY — crossing it must be technically hard.
 *   4. Real-money monetization is cosmetics / subscription / merch only this build.
 *
 * How this file makes the line hard to cross:
 *   - `CASH_OUT_SUPPORTED` is a compile-time `false` constant. There is no
 *     function in this module that converts a balance to money or decrements a
 *     balance toward a payout. The *only* mutation is an EARN (append a positive
 *     entry). A debit/redeem/withdraw/cash-out path does not exist to call.
 *   - `awardCredits` rejects non-positive amounts and unknown reasons, so the
 *     ledger can only ever grow, and only for defined in-world achievements.
 *   - `validateLedger` proves the running balance is monotonic non-decreasing and
 *     internally consistent — a tamper / cash-out check the tests assert.
 *
 * Galaxy Credits are EARN-ONLY this build (DECISION D-006). Cosmetics use Nova
 * (Stripe test mode); achievement-gated merch is an entitlement unlock. Neither
 * touches this ledger, and neither has a cash-out path either.
 */

/**
 * The constitution's first article, as a type-level fact. Anything that tries to
 * branch on a `true` here will be statically unreachable.
 */
export const CASH_OUT_SUPPORTED = false as const;

/**
 * Every reason a Galaxy Credit can be EARNED. There is no "spend", "redeem",
 * "withdraw", or "cashout" reason — by construction.
 */
export const CREDIT_EARN_REASONS = [
  "ONBOARDING_GRANT",
  "SIGNAL_CHECK_REWARD",
  "QUEST_REWARD",
  "BOSS_REWARD",
  "DUEL_REWARD",
  "DAILY_STREAK",
  "BLACKTOP_REWARD",
] as const;

export type CreditEarnReason = (typeof CREDIT_EARN_REASONS)[number];

export interface CreditLedgerEntry {
  /** Always strictly positive — credits are earn-only. */
  readonly amount: number;
  readonly reason: CreditEarnReason;
  /** Running balance AFTER this entry is applied. */
  readonly balanceAfter: number;
  /** Optional reference to the achievement that earned it (e.g. attempt id). */
  readonly refType?: string;
  readonly refId?: string;
}

export function isCreditEarnReason(value: string): value is CreditEarnReason {
  return (CREDIT_EARN_REASONS as readonly string[]).includes(value);
}

/**
 * Award credits. The ONLY way the balance changes. Returns the new entry; the
 * caller persists it (the DB ledger is the source of truth; `balanceAfter` is the
 * authoritative running total).
 *
 * @throws if amount is not a positive integer, or reason is not an earn reason.
 */
export function awardCredits(
  currentBalance: number,
  amount: number,
  reason: CreditEarnReason,
  ref?: { type: string; id: string },
): CreditLedgerEntry {
  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    throw new Error(`Credit Constitution: invalid current balance ${currentBalance}`);
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    // Earn-only: a zero or negative "award" would be a disguised debit.
    throw new Error(
      `Credit Constitution violation: credits are earn-only; amount must be a positive integer (got ${amount})`,
    );
  }
  if (!isCreditEarnReason(reason)) {
    throw new Error(`Credit Constitution violation: unknown earn reason "${reason}"`);
  }

  const entry: CreditLedgerEntry = {
    amount,
    reason,
    balanceAfter: currentBalance + amount,
    ...(ref ? { refType: ref.type, refId: ref.id } : {}),
  };
  return entry;
}

/**
 * Validate a full ledger: balances must be monotonic non-decreasing, every entry
 * positive, and the final `balanceAfter` must equal the sum of amounts. Used by
 * tests and by any reconciliation job to prove the closed loop held.
 */
export function validateLedger(entries: readonly CreditLedgerEntry[]): {
  ok: boolean;
  balance: number;
  violations: string[];
} {
  const violations: string[] = [];
  let running = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (!Number.isInteger(e.amount) || e.amount <= 0) {
      violations.push(`entry ${i}: non-positive amount ${e.amount}`);
    }
    running += e.amount;
    if (e.balanceAfter !== running) {
      violations.push(
        `entry ${i}: balanceAfter ${e.balanceAfter} != running sum ${running}`,
      );
    }
  }
  return { ok: violations.length === 0, balance: running, violations };
}

/**
 * The constitutional guard. There is intentionally no implementation that
 * succeeds — calling this always throws, documenting that cash-out is impossible
 * by design. It exists so any future code that *reaches for* a cash-out path
 * fails loudly instead of silently shipping one.
 */
export function assertNoCashOut(): never {
  throw new Error(
    "Credit Constitution: cash-out is not supported and never will be in this build. " +
      "Galaxy currency has no cash value (bible §4.2).",
  );
}
