/**
 * Affiliate payout ledger — pure, double-entry, I/O-free.
 *
 * The one genuinely net-new monetization primitive surfaced by the external-repo
 * evaluation (see docs/monetization/EXTERNAL_REPO_EVALUATION.md). The promo-desk /
 * "Bobby" surface already manages sportsbook offers, but there is no correct,
 * auditable accounting for what the platform OWES referrers — one that survives
 * refunds and chargebacks. This module provides exactly that, as standard
 * double-entry bookkeeping, built and unit-tested ahead of activation (the same
 * pattern as kelly.ts / poisson.ts / calibration-apply.ts — "exported for future
 * work", wired at a deliberate later step).
 *
 * Deliberately excluded (trust / compliance posture): crypto / USDT cashout and
 * ad-pixel attribution from the boilerplate this pattern was adapted from. Payouts
 * here are pure accounting; rails and a Prisma model are a separate, owner-gated step.
 *
 * Accounting model (four accounts):
 *   AFFILIATE_PAYABLE  — liability: what we owe affiliates
 *   COMMISSION_EXPENSE — expense:  cost of the referral program
 *   CLAWBACK_RECOVERY  — contra-expense: commission reversed on refund/chargeback
 *   CASH               — asset:    reduced when we actually pay an affiliate
 *
 * Postings (each balances one debit against one equal credit, so the ledger is
 * balanced by construction):
 *   COMMISSION_ACCRUED  debit COMMISSION_EXPENSE  credit AFFILIATE_PAYABLE
 *   COMMISSION_CLAWBACK debit AFFILIATE_PAYABLE   credit CLAWBACK_RECOVERY
 *   PAYOUT              debit AFFILIATE_PAYABLE   credit CASH
 *
 * Hold period: an accrual is "pending" until `holdUntil` passes (covering the
 * refund window). Only "cleared" commission — past hold and not clawed back — is
 * payable. This prevents paying out money that may still be refunded.
 */

export type LedgerAccount =
  | "AFFILIATE_PAYABLE"
  | "COMMISSION_EXPENSE"
  | "CLAWBACK_RECOVERY"
  | "CASH";

export type PostingType = "COMMISSION_ACCRUED" | "COMMISSION_CLAWBACK" | "PAYOUT";

/** One immutable double-entry posting. Amounts are integer cents, always positive. */
export interface LedgerPosting {
  readonly id: string;
  readonly affiliateId: string;
  /** The referral/conversion this relates to (null for payouts). */
  readonly referralId: string | null;
  readonly type: PostingType;
  readonly debit: LedgerAccount;
  readonly credit: LedgerAccount;
  readonly amountCents: number;
  readonly occurredAt: string; // ISO-8601
  /** Commission clears (becomes payable) once now >= holdUntil. Null for clawbacks/payouts. */
  readonly holdUntil: string | null;
  /** For a clawback: the COMMISSION_ACCRUED posting it reverses. */
  readonly reversesPostingId: string | null;
  readonly memo: string;
}

export interface AffiliateBalance {
  readonly affiliateId: string;
  /** Total commission ever accrued. */
  readonly accruedCents: number;
  /** Commission reversed by clawbacks. */
  readonly clawedBackCents: number;
  /** Accrued, not clawed back, still inside the hold window. */
  readonly pendingCents: number;
  /** Accrued, not clawed back, past the hold window. */
  readonly clearedCents: number;
  /** Already paid out. */
  readonly paidCents: number;
  /** Owed and ready to pay now: cleared − paid (never negative). */
  readonly payableCents: number;
}

const VALID_ACCOUNTS: ReadonlySet<LedgerAccount> = new Set<LedgerAccount>([
  "AFFILIATE_PAYABLE",
  "COMMISSION_EXPENSE",
  "CLAWBACK_RECOVERY",
  "CASH",
]);

function assertCents(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(
      `affiliate ledger: amountCents must be a positive integer (got ${amountCents})`
    );
  }
}

function assertNonEmpty(label: string, value: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`affiliate ledger: ${label} must be a non-empty string`);
  }
}

function assertIso(label: string, value: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`affiliate ledger: ${label} must be an ISO-8601 date (got ${value})`);
  }
}

/**
 * Record commission earned when a referred user converts. The amount is held
 * (un-payable) until `holdDays` after `occurredAt`, covering the refund window.
 */
export function accrueCommission(input: {
  id: string;
  affiliateId: string;
  referralId: string;
  amountCents: number;
  occurredAt: string;
  holdDays: number;
  memo?: string;
}): LedgerPosting {
  assertNonEmpty("id", input.id);
  assertNonEmpty("affiliateId", input.affiliateId);
  assertNonEmpty("referralId", input.referralId);
  assertCents(input.amountCents);
  assertIso("occurredAt", input.occurredAt);
  if (!Number.isInteger(input.holdDays) || input.holdDays < 0) {
    throw new Error(`affiliate ledger: holdDays must be a non-negative integer (got ${input.holdDays})`);
  }
  const holdUntil = new Date(
    Date.parse(input.occurredAt) + input.holdDays * 24 * 60 * 60 * 1000
  ).toISOString();
  return {
    id: input.id,
    affiliateId: input.affiliateId,
    referralId: input.referralId,
    type: "COMMISSION_ACCRUED",
    debit: "COMMISSION_EXPENSE",
    credit: "AFFILIATE_PAYABLE",
    amountCents: input.amountCents,
    occurredAt: input.occurredAt,
    holdUntil,
    reversesPostingId: null,
    memo: input.memo ?? `Commission accrued for referral ${input.referralId}`,
  };
}

/**
 * Reverse a previously accrued commission (refund or chargeback). Reverses the
 * full original amount; partial clawbacks are not supported (a refund voids the
 * conversion). Throws if `accrual` is not a COMMISSION_ACCRUED posting.
 */
export function clawbackCommission(input: {
  id: string;
  accrual: LedgerPosting;
  occurredAt: string;
  /** If supplied, guards against clawing back the same accrual twice. */
  priorPostings?: readonly LedgerPosting[];
  memo?: string;
}): LedgerPosting {
  assertNonEmpty("id", input.id);
  if (input.accrual.type !== "COMMISSION_ACCRUED") {
    throw new Error(
      `affiliate ledger: can only clawback a COMMISSION_ACCRUED posting (got ${input.accrual.type})`
    );
  }
  assertIso("occurredAt", input.occurredAt);
  // A refund cannot precede the conversion it reverses.
  if (Date.parse(input.occurredAt) < Date.parse(input.accrual.occurredAt)) {
    throw new Error(
      `affiliate ledger: clawback occurredAt ${input.occurredAt} precedes accrual ${input.accrual.occurredAt}`
    );
  }
  // Defense in depth: refuse a second clawback of the same accrual.
  if (input.priorPostings) {
    const already = input.priorPostings.some(
      (p) => p.type === "COMMISSION_CLAWBACK" && p.reversesPostingId === input.accrual.id
    );
    if (already) {
      throw new Error(
        `affiliate ledger: accrual ${input.accrual.id} has already been clawed back`
      );
    }
  }
  return {
    id: input.id,
    affiliateId: input.accrual.affiliateId,
    referralId: input.accrual.referralId,
    type: "COMMISSION_CLAWBACK",
    debit: "AFFILIATE_PAYABLE",
    credit: "CLAWBACK_RECOVERY",
    amountCents: input.accrual.amountCents,
    occurredAt: input.occurredAt,
    holdUntil: null,
    reversesPostingId: input.accrual.id,
    memo: input.memo ?? `Clawback of accrual ${input.accrual.id} (refund/chargeback)`,
  };
}

/**
 * Record a payout to an affiliate. Validates against the cleared payable balance
 * so we never pay out pending or already-paid commission.
 */
export function recordPayout(input: {
  id: string;
  affiliateId: string;
  amountCents: number;
  occurredAt: string;
  priorPostings: readonly LedgerPosting[];
  memo?: string;
}): LedgerPosting {
  assertNonEmpty("id", input.id);
  assertNonEmpty("affiliateId", input.affiliateId);
  assertCents(input.amountCents);
  assertIso("occurredAt", input.occurredAt);
  const balance = summarizeAffiliate(input.priorPostings, input.affiliateId, input.occurredAt);
  if (input.amountCents > balance.payableCents) {
    throw new Error(
      `affiliate ledger: payout ${input.amountCents}¢ exceeds payable balance ${balance.payableCents}¢ for ${input.affiliateId}`
    );
  }
  return {
    id: input.id,
    affiliateId: input.affiliateId,
    referralId: null,
    type: "PAYOUT",
    debit: "AFFILIATE_PAYABLE",
    credit: "CASH",
    amountCents: input.amountCents,
    occurredAt: input.occurredAt,
    holdUntil: null,
    reversesPostingId: null,
    memo: input.memo ?? `Payout to ${input.affiliateId}`,
  };
}

/** Compute an affiliate's balance as of `now` (ISO). Pure over the posting list. */
export function summarizeAffiliate(
  postings: readonly LedgerPosting[],
  affiliateId: string,
  now: string
): AffiliateBalance {
  assertIso("now", now);
  const nowMs = Date.parse(now);
  const mine = postings.filter((p) => p.affiliateId === affiliateId);

  // Index accruals so clawbacks can only count against a REAL accrual. This makes
  // the rollup robust to malformed input: a duplicate clawback collapses in the
  // Set (counted once), and an orphan clawback (referencing no known accrual) is
  // ignored here — auditLedger() is what surfaces those as structural problems.
  const accrualsById = new Map<string, LedgerPosting>();
  for (const p of mine) {
    if (p.type === "COMMISSION_ACCRUED") accrualsById.set(p.id, p);
  }
  const clawedBackAccrualIds = new Set<string>();
  for (const p of mine) {
    if (
      p.type === "COMMISSION_CLAWBACK" &&
      p.reversesPostingId &&
      accrualsById.has(p.reversesPostingId)
    ) {
      clawedBackAccrualIds.add(p.reversesPostingId);
    }
  }

  let accruedCents = 0;
  let pendingCents = 0;
  let clearedCents = 0;
  let paidCents = 0;

  for (const p of mine) {
    if (p.type === "COMMISSION_ACCRUED") {
      accruedCents += p.amountCents;
      if (clawedBackAccrualIds.has(p.id)) continue; // reversed → neither pending nor cleared
      const cleared = p.holdUntil !== null && nowMs >= Date.parse(p.holdUntil);
      if (cleared) clearedCents += p.amountCents;
      else pendingCents += p.amountCents;
    } else if (p.type === "PAYOUT") {
      paidCents += p.amountCents;
    }
  }

  // Each clawed-back accrual counts once, at the accrual's own amount — never the
  // (possibly duplicated) clawback-posting amounts.
  let clawedBackCents = 0;
  for (const id of clawedBackAccrualIds) {
    clawedBackCents += accrualsById.get(id)?.amountCents ?? 0;
  }

  const payableCents = Math.max(0, clearedCents - paidCents);

  return {
    affiliateId,
    accruedCents,
    clawedBackCents,
    pendingCents,
    clearedCents,
    paidCents,
    payableCents,
  };
}

/**
 * Double-entry invariant: across the whole ledger, total debits equal total
 * credits, every posting names two distinct valid accounts, and amounts are
 * positive integers. Returns the imbalances rather than throwing, so a caller
 * can surface them in an audit view.
 */
export function auditLedger(postings: readonly LedgerPosting[]): {
  balanced: boolean;
  debitsByAccount: Record<LedgerAccount, number>;
  creditsByAccount: Record<LedgerAccount, number>;
  problems: string[];
} {
  const debitsByAccount = blankAccountMap();
  const creditsByAccount = blankAccountMap();
  const problems: string[] = [];

  // Structural integrity: unique ids, and clawbacks that reference a real accrual
  // exactly once. (Every posting is individually balanced, so the global debit ==
  // credit total is always true; these checks are what actually catch corruption
  // like a double clawback over-debiting AFFILIATE_PAYABLE.)
  const seenIds = new Set<string>();
  const accrualIds = new Set<string>();
  for (const p of postings) {
    if (seenIds.has(p.id)) problems.push(`${p.id}: duplicate posting id`);
    else seenIds.add(p.id);
    if (p.type === "COMMISSION_ACCRUED") accrualIds.add(p.id);
  }
  const clawbackCounts = new Map<string, number>();
  for (const p of postings) {
    if (p.type !== "COMMISSION_CLAWBACK") continue;
    if (!p.reversesPostingId || !accrualIds.has(p.reversesPostingId)) {
      problems.push(`${p.id}: clawback references unknown accrual ${p.reversesPostingId ?? "(none)"}`);
    } else {
      clawbackCounts.set(p.reversesPostingId, (clawbackCounts.get(p.reversesPostingId) ?? 0) + 1);
    }
  }
  for (const [accrualId, count] of clawbackCounts) {
    if (count > 1) problems.push(`accrual ${accrualId}: clawed back ${count} times`);
  }

  for (const p of postings) {
    if (!VALID_ACCOUNTS.has(p.debit)) problems.push(`${p.id}: invalid debit account ${p.debit}`);
    if (!VALID_ACCOUNTS.has(p.credit)) problems.push(`${p.id}: invalid credit account ${p.credit}`);
    if (p.debit === p.credit) problems.push(`${p.id}: debit and credit are the same account (${p.debit})`);
    if (!Number.isInteger(p.amountCents) || p.amountCents <= 0) {
      problems.push(`${p.id}: amountCents must be a positive integer (got ${p.amountCents})`);
      continue;
    }
    if (VALID_ACCOUNTS.has(p.debit)) debitsByAccount[p.debit] += p.amountCents;
    if (VALID_ACCOUNTS.has(p.credit)) creditsByAccount[p.credit] += p.amountCents;
  }

  const totalDebits = sumValues(debitsByAccount);
  const totalCredits = sumValues(creditsByAccount);
  if (totalDebits !== totalCredits) {
    problems.push(`ledger not balanced: debits ${totalDebits}¢ vs credits ${totalCredits}¢`);
  }

  return {
    balanced: problems.length === 0,
    debitsByAccount,
    creditsByAccount,
    problems,
  };
}

function blankAccountMap(): Record<LedgerAccount, number> {
  return {
    AFFILIATE_PAYABLE: 0,
    COMMISSION_EXPENSE: 0,
    CLAWBACK_RECOVERY: 0,
    CASH: 0,
  };
}

function sumValues(map: Record<LedgerAccount, number>): number {
  return Object.values(map).reduce((a, b) => a + b, 0);
}
