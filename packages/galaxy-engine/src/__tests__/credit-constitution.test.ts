import { describe, it, expect } from "vitest";
import {
  CASH_OUT_SUPPORTED,
  CREDIT_EARN_REASONS,
  awardCredits,
  validateLedger,
  assertNoCashOut,
  isCreditEarnReason,
  type CreditLedgerEntry,
} from "../credit-constitution.js";

describe("Credit Constitution (bible §4.2)", () => {
  it("cash-out is a compile-time false constant", () => {
    expect(CASH_OUT_SUPPORTED).toBe(false);
  });

  it("there is no cash-out path — assertNoCashOut always throws", () => {
    expect(() => assertNoCashOut()).toThrow(/cash-out is not supported/i);
  });

  it("awards credits and advances the running balance", () => {
    const e = awardCredits(100, 40, "SIGNAL_CHECK_REWARD");
    expect(e.amount).toBe(40);
    expect(e.balanceAfter).toBe(140);
    expect(e.reason).toBe("SIGNAL_CHECK_REWARD");
  });

  it("rejects non-positive amounts (earn-only — no disguised debit)", () => {
    expect(() => awardCredits(100, 0, "QUEST_REWARD")).toThrow(/earn-only/i);
    expect(() => awardCredits(100, -5, "QUEST_REWARD")).toThrow(/earn-only/i);
    expect(() => awardCredits(100, 4.5, "QUEST_REWARD")).toThrow(/positive integer/i);
  });

  it("rejects unknown earn reasons", () => {
    // @ts-expect-error — intentionally invalid reason
    expect(() => awardCredits(0, 10, "CASH_OUT")).toThrow(/unknown earn reason/i);
  });

  it("every defined reason is an earn reason; none implies spend/redeem/withdraw", () => {
    for (const r of CREDIT_EARN_REASONS) {
      expect(isCreditEarnReason(r)).toBe(true);
      expect(r.toLowerCase()).not.toMatch(/cash|redeem|withdraw|spend|debit|payout/);
    }
  });

  it("validateLedger proves a monotonic, consistent, earn-only ledger", () => {
    let balance = 0;
    const entries: CreditLedgerEntry[] = [];
    for (const amt of [250, 40, 60, 150]) {
      const e = awardCredits(balance, amt, "SIGNAL_CHECK_REWARD");
      balance = e.balanceAfter;
      entries.push(e);
    }
    const v = validateLedger(entries);
    expect(v.ok).toBe(true);
    expect(v.balance).toBe(500);
    expect(v.violations).toEqual([]);
  });

  it("validateLedger flags a tampered (non-monotonic) ledger", () => {
    const tampered: CreditLedgerEntry[] = [
      { amount: 100, reason: "ONBOARDING_GRANT", balanceAfter: 100 },
      // someone tried to cash out: balance went DOWN
      { amount: 50, reason: "QUEST_REWARD", balanceAfter: 80 },
    ];
    const v = validateLedger(tampered);
    expect(v.ok).toBe(false);
    expect(v.violations.length).toBeGreaterThan(0);
  });
});
