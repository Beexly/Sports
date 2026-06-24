/**
 * KnowabilityKernel — the constitutional "was this knowable at the time?" primitive.
 *
 * Decision Genome build step C. Every fact that feeds a decision carries a knowability
 * stamp: when it was observed, when it became available to us, when we ingested and
 * trusted it, and the lock/event/settle/correction boundaries. A decision may ONLY rely
 * on facts whose `availableAt <= decisionLockedAt`. Anything that became knowable after
 * the lock is leakage — the same failure mode that turns a backtest into fiction.
 *
 * This module is pure (no I/O, no clock). Timestamps are epoch milliseconds so they are
 * directly comparable; callers convert from ISO/Date at the edge. Fail-safe: a missing
 * `availableAt` is treated as NOT knowable (you cannot prove it was available in time).
 *
 * North star: make "future data" a type-level and runtime-checkable violation, not a
 * code-review hope.
 */

/** Epoch milliseconds. Use `Date.parse(iso)` / `date.getTime()` to produce one. */
export type EpochMs = number;

/**
 * The point-in-time lifecycle of a single fact. All optional except `availableAt`,
 * because availability is the one stamp the leakage check cannot do without.
 */
export interface KnowabilityStamps {
  /** When the underlying event/measurement actually happened in the world. */
  readonly observedAt?: EpochMs;
  /** When the fact first became available to us (publishable/fetchable). REQUIRED for leakage checks. */
  readonly availableAt: EpochMs;
  /** When we ingested it into our system. */
  readonly ingestedAt?: EpochMs;
  /** When it cleared trust/clearance and was allowed to influence a decision. */
  readonly trustedAt?: EpochMs;
}

/** Use-permission flags travelling with a fact (rights posture is point-in-time too). */
export interface UsePermissions {
  /** Cleared for decision/modelling use. */
  readonly decisionUse: boolean;
  /** Cleared to appear in a public-facing claim. */
  readonly publicUse: boolean;
}

/** A fact plus its knowability + permissions — the atom the kernel reasons over. */
export interface KnowableFact<T = unknown> {
  readonly id: string;
  readonly value: T;
  readonly stamps: KnowabilityStamps;
  readonly permissions?: UsePermissions;
}

/** The decision-time boundaries a fact is judged against. */
export interface DecisionWindow {
  /** The instant the decision was (or will be) locked. Facts must predate this. */
  readonly decisionLockedAt: EpochMs;
  /** When the underlying event starts (kickoff/first pitch). Optional. */
  readonly eventStartedAt?: EpochMs;
  /** When the result settled. Optional. */
  readonly settledAt?: EpochMs;
  /** When a post-result correction window applies. Optional. */
  readonly correctedAt?: EpochMs;
}

export type LeakageReason =
  | "missing-available-at"
  | "available-after-lock"
  | "trusted-after-lock"
  | "not-cleared-for-decision-use";

export interface LeakageViolation {
  readonly factId: string;
  readonly reason: LeakageReason;
  /** Milliseconds the fact post-dates the lock by (when applicable; else 0). */
  readonly lateByMs: number;
}

/**
 * Is a single fact knowable at the decision lock? Fail-safe: false unless we can prove
 * `availableAt <= lock` (and, when present, `trustedAt <= lock`). Permissions, when
 * supplied, must clear `decisionUse`.
 */
export function isKnowableAtLock(fact: KnowableFact, window: DecisionWindow): boolean {
  return checkFact(fact, window) === null;
}

/** Returns the single most important leakage reason for a fact, or null if clean. */
export function checkFact(fact: KnowableFact, window: DecisionWindow): LeakageViolation | null {
  const { stamps } = fact;
  const lock = window.decisionLockedAt;

  if (stamps.availableAt == null || !Number.isFinite(stamps.availableAt)) {
    return { factId: fact.id, reason: "missing-available-at", lateByMs: 0 };
  }
  if (stamps.availableAt > lock) {
    return { factId: fact.id, reason: "available-after-lock", lateByMs: stamps.availableAt - lock };
  }
  if (stamps.trustedAt != null && stamps.trustedAt > lock) {
    return { factId: fact.id, reason: "trusted-after-lock", lateByMs: stamps.trustedAt - lock };
  }
  if (fact.permissions && !fact.permissions.decisionUse) {
    return { factId: fact.id, reason: "not-cleared-for-decision-use", lateByMs: 0 };
  }
  return null;
}

/**
 * Assert a whole evidence set is leakage-free against a decision window. Returns every
 * violation (empty array = clean). Use this as a hard gate before locking a decision.
 */
export function assertNoLeakage(facts: readonly KnowableFact[], window: DecisionWindow): LeakageViolation[] {
  const violations: LeakageViolation[] = [];
  for (const fact of facts) {
    const v = checkFact(fact, window);
    if (v) violations.push(v);
  }
  return violations;
}

/** Convenience: only the facts that were legitimately knowable at lock. */
export function knowableFactsOnly<T>(
  facts: readonly KnowableFact<T>[],
  window: DecisionWindow,
): KnowableFact<T>[] {
  return facts.filter((f) => checkFact(f, window) === null);
}

/** True only if every required ordering holds for the window itself (lock <= event <= settle). */
export function isWindowCoherent(window: DecisionWindow): boolean {
  const { decisionLockedAt, eventStartedAt, settledAt } = window;
  if (eventStartedAt != null && eventStartedAt < decisionLockedAt) return false;
  if (settledAt != null && eventStartedAt != null && settledAt < eventStartedAt) return false;
  if (settledAt != null && settledAt < decisionLockedAt) return false;
  return true;
}
