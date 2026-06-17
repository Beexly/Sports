import { describe, it, expect } from "vitest";
import {
  accrueCommission,
  clawbackCommission,
  recordPayout,
  summarizeAffiliate,
  auditLedger,
  type LedgerPosting,
} from "@/lib/affiliate/ledger";

const T0 = "2026-06-01T00:00:00.000Z";
const AFTER_HOLD = "2026-06-20T00:00:00.000Z"; // > 14 days after T0
const WITHIN_HOLD = "2026-06-10T00:00:00.000Z"; // < 14 days after T0

function accrual(id: string, amountCents: number, opts: { affiliateId?: string; referralId?: string } = {}) {
  return accrueCommission({
    id,
    affiliateId: opts.affiliateId ?? "aff_1",
    referralId: opts.referralId ?? `ref_${id}`,
    amountCents,
    occurredAt: T0,
    holdDays: 14,
  });
}

describe("accrueCommission", () => {
  it("creates a balanced COMMISSION_ACCRUED posting with a hold window", () => {
    const p = accrual("a1", 1500);
    expect(p.type).toBe("COMMISSION_ACCRUED");
    expect(p.debit).toBe("COMMISSION_EXPENSE");
    expect(p.credit).toBe("AFFILIATE_PAYABLE");
    expect(p.amountCents).toBe(1500);
    expect(p.holdUntil).toBe("2026-06-15T00:00:00.000Z"); // T0 + 14d
  });

  it("rejects non-positive or non-integer amounts", () => {
    expect(() => accrual("a", 0)).toThrow(/positive integer/);
    expect(() => accrual("a", -5)).toThrow(/positive integer/);
    expect(() => accrual("a", 10.5)).toThrow(/positive integer/);
  });

  it("rejects negative hold days and bad dates", () => {
    expect(() =>
      accrueCommission({ id: "a", affiliateId: "aff_1", referralId: "r", amountCents: 100, occurredAt: T0, holdDays: -1 })
    ).toThrow(/holdDays/);
    expect(() =>
      accrueCommission({ id: "a", affiliateId: "aff_1", referralId: "r", amountCents: 100, occurredAt: "not-a-date", holdDays: 14 })
    ).toThrow(/ISO-8601/);
  });
});

describe("summarizeAffiliate", () => {
  it("counts a fresh accrual as pending (inside hold), not payable", () => {
    const b = summarizeAffiliate([accrual("a1", 2000)], "aff_1", WITHIN_HOLD);
    expect(b.accruedCents).toBe(2000);
    expect(b.pendingCents).toBe(2000);
    expect(b.clearedCents).toBe(0);
    expect(b.payableCents).toBe(0);
  });

  it("moves an accrual to cleared/payable once the hold passes", () => {
    const b = summarizeAffiliate([accrual("a1", 2000)], "aff_1", AFTER_HOLD);
    expect(b.pendingCents).toBe(0);
    expect(b.clearedCents).toBe(2000);
    expect(b.payableCents).toBe(2000);
  });

  it("a clawed-back accrual is neither pending nor payable, even after hold", () => {
    const a1 = accrual("a1", 2000);
    const cb = clawbackCommission({ id: "c1", accrual: a1, occurredAt: WITHIN_HOLD });
    const b = summarizeAffiliate([a1, cb], "aff_1", AFTER_HOLD);
    expect(b.accruedCents).toBe(2000);
    expect(b.clawedBackCents).toBe(2000);
    expect(b.clearedCents).toBe(0);
    expect(b.payableCents).toBe(0);
  });

  it("clears exactly at the hold boundary (now == holdUntil)", () => {
    const a1 = accrual("a1", 1000); // holdUntil = 2026-06-15T00:00:00.000Z
    const atBoundary = summarizeAffiliate([a1], "aff_1", "2026-06-15T00:00:00.000Z");
    expect(atBoundary.clearedCents).toBe(1000);
    expect(atBoundary.payableCents).toBe(1000);
  });

  it("holdDays:0 clears immediately", () => {
    const a1 = accrueCommission({ id: "a1", affiliateId: "aff_1", referralId: "r", amountCents: 500, occurredAt: T0, holdDays: 0 });
    expect(summarizeAffiliate([a1], "aff_1", T0).payableCents).toBe(500);
  });

  it("a duplicate clawback of one accrual still only reverses it once (robust rollup)", () => {
    const a1 = accrual("a1", 1000);
    const cb1 = clawbackCommission({ id: "c1", accrual: a1, occurredAt: WITHIN_HOLD });
    const cb2 = { ...cb1, id: "c2" }; // hand-forged duplicate
    const b = summarizeAffiliate([a1, cb1, cb2], "aff_1", AFTER_HOLD);
    expect(b.clawedBackCents).toBe(1000); // counted once, at the accrual amount
    expect(b.payableCents).toBe(0);
  });

  it("an orphan clawback (no matching accrual) is ignored by the rollup", () => {
    const a1 = accrual("a1", 1000);
    const orphan = clawbackCommission({ id: "c1", accrual: { ...a1, id: "ghost" }, occurredAt: WITHIN_HOLD });
    const b = summarizeAffiliate([a1, orphan], "aff_1", AFTER_HOLD);
    expect(b.clawedBackCents).toBe(0);
    expect(b.payableCents).toBe(1000); // a1 unaffected
  });

  it("payout then clawback clamps payable at zero (never negative)", () => {
    const a1 = accrual("a1", 1000);
    const payout = recordPayout({ id: "p1", affiliateId: "aff_1", amountCents: 1000, occurredAt: AFTER_HOLD, priorPostings: [a1] });
    const cb = clawbackCommission({ id: "c1", accrual: a1, occurredAt: AFTER_HOLD });
    const b = summarizeAffiliate([a1, payout, cb], "aff_1", AFTER_HOLD);
    expect(b.payableCents).toBe(0);
  });

  it("isolates affiliates from each other", () => {
    const a = accrual("a1", 1000, { affiliateId: "aff_1" });
    const b = accrual("a2", 5000, { affiliateId: "aff_2" });
    expect(summarizeAffiliate([a, b], "aff_1", AFTER_HOLD).payableCents).toBe(1000);
    expect(summarizeAffiliate([a, b], "aff_2", AFTER_HOLD).payableCents).toBe(5000);
  });

  it("subtracts payouts from the payable balance", () => {
    const a1 = accrual("a1", 3000);
    const payout = recordPayout({ id: "p1", affiliateId: "aff_1", amountCents: 1000, occurredAt: AFTER_HOLD, priorPostings: [a1] });
    const b = summarizeAffiliate([a1, payout], "aff_1", AFTER_HOLD);
    expect(b.clearedCents).toBe(3000);
    expect(b.paidCents).toBe(1000);
    expect(b.payableCents).toBe(2000);
  });
});

describe("clawbackCommission", () => {
  it("reverses the full original amount and links to the accrual", () => {
    const a1 = accrual("a1", 2500);
    const cb = clawbackCommission({ id: "c1", accrual: a1, occurredAt: WITHIN_HOLD });
    expect(cb.type).toBe("COMMISSION_CLAWBACK");
    expect(cb.debit).toBe("AFFILIATE_PAYABLE");
    expect(cb.credit).toBe("CLAWBACK_RECOVERY");
    expect(cb.amountCents).toBe(2500);
    expect(cb.reversesPostingId).toBe("a1");
  });

  it("refuses to clawback anything but an accrual", () => {
    const a1 = accrual("a1", 1000);
    const payout = recordPayout({ id: "p1", affiliateId: "aff_1", amountCents: 1000, occurredAt: AFTER_HOLD, priorPostings: [a1] });
    expect(() => clawbackCommission({ id: "c1", accrual: payout, occurredAt: AFTER_HOLD })).toThrow(/COMMISSION_ACCRUED/);
  });

  it("refuses a refund timestamped before the conversion", () => {
    const a1 = accrual("a1", 1000); // occurredAt T0 = 2026-06-01
    expect(() =>
      clawbackCommission({ id: "c1", accrual: a1, occurredAt: "2026-05-01T00:00:00.000Z" })
    ).toThrow(/precedes accrual/);
  });

  it("refuses a second clawback of the same accrual when prior postings are supplied", () => {
    const a1 = accrual("a1", 1000);
    const cb1 = clawbackCommission({ id: "c1", accrual: a1, occurredAt: WITHIN_HOLD });
    expect(() =>
      clawbackCommission({ id: "c2", accrual: a1, occurredAt: WITHIN_HOLD, priorPostings: [a1, cb1] })
    ).toThrow(/already been clawed back/);
  });
});

describe("recordPayout", () => {
  it("refuses to pay out more than the cleared payable balance", () => {
    const a1 = accrual("a1", 1000);
    expect(() =>
      recordPayout({ id: "p1", affiliateId: "aff_1", amountCents: 5000, occurredAt: AFTER_HOLD, priorPostings: [a1] })
    ).toThrow(/exceeds payable balance/);
  });

  it("refuses to pay out commission still inside the hold window", () => {
    const a1 = accrual("a1", 1000);
    expect(() =>
      recordPayout({ id: "p1", affiliateId: "aff_1", amountCents: 1000, occurredAt: WITHIN_HOLD, priorPostings: [a1] })
    ).toThrow(/exceeds payable balance/);
  });
});

describe("auditLedger (double-entry invariant)", () => {
  it("reports a well-formed ledger as balanced", () => {
    const a1 = accrual("a1", 3000);
    const a2 = accrual("a2", 2000, { affiliateId: "aff_2" });
    const cb = clawbackCommission({ id: "c1", accrual: a2, occurredAt: WITHIN_HOLD });
    const payout = recordPayout({ id: "p1", affiliateId: "aff_1", amountCents: 1000, occurredAt: AFTER_HOLD, priorPostings: [a1] });
    const audit = auditLedger([a1, a2, cb, payout]);
    expect(audit.balanced).toBe(true);
    expect(audit.problems).toEqual([]);
    // Every posting contributes equal debit and credit, so totals match.
    const totalDebits = Object.values(audit.debitsByAccount).reduce((x, y) => x + y, 0);
    const totalCredits = Object.values(audit.creditsByAccount).reduce((x, y) => x + y, 0);
    expect(totalDebits).toBe(totalCredits);
  });

  it("flags a duplicate clawback as a structural problem (over-debited liability)", () => {
    const a1 = accrual("a1", 1000);
    const cb1 = clawbackCommission({ id: "c1", accrual: a1, occurredAt: WITHIN_HOLD });
    const cb2 = { ...cb1, id: "c2" };
    const audit = auditLedger([a1, cb1, cb2]);
    expect(audit.balanced).toBe(false);
    expect(audit.problems.some((p) => /clawed back 2 times/.test(p))).toBe(true);
  });

  it("flags an orphan clawback and a duplicate posting id", () => {
    const a1 = accrual("a1", 1000);
    const orphan = clawbackCommission({ id: "c1", accrual: { ...a1, id: "ghost" }, occurredAt: WITHIN_HOLD });
    const dupId = { ...a1 }; // same id "a1" again
    const audit = auditLedger([a1, dupId, orphan]);
    expect(audit.balanced).toBe(false);
    expect(audit.problems.some((p) => /unknown accrual/.test(p))).toBe(true);
    expect(audit.problems.some((p) => /duplicate posting id/.test(p))).toBe(true);
  });

  it("flags a hand-crafted unbalanced/invalid posting", () => {
    const bad: LedgerPosting = {
      id: "x1",
      affiliateId: "aff_1",
      referralId: null,
      type: "PAYOUT",
      debit: "AFFILIATE_PAYABLE",
      credit: "AFFILIATE_PAYABLE", // same account — invalid
      amountCents: 100,
      occurredAt: T0,
      holdUntil: null,
      reversesPostingId: null,
      memo: "bad",
    };
    const audit = auditLedger([bad]);
    expect(audit.balanced).toBe(false);
    expect(audit.problems.some((p) => /same account/.test(p))).toBe(true);
  });
});
