/**
 * AI control-plane credit ADMISSION layer (Phase 2 PR-D, rebuilt on the
 * hardened #162/#163/#164 chain + NOVA S1's canonical `CreditGrantSnapshot`).
 *
 * Governing docs:
 *   - docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md §3.1 (consumption
 *     contract), §5.2 (CreditGrantState binding), §8 (PR-D unblocked as the
 *     admission layer; table materialization deferred to S5).
 *   - directive §11.2 (canonical snapshot, S1's
 *     `lib/opportunity-engine/credit-snapshot.ts`) / §11.3 (this module:
 *     snapshot validation, coverage matching, freshness, sufficiency,
 *     fail-closed admission, tests against a fake adapter, NO Prisma credit
 *     tables, no reachable production credit mode).
 *
 * OWNERSHIP (freeze §2/§3.1): NOVA owns the credit-program lifecycle, its
 * state vocabulary, AND the canonical snapshot contract. This module IMPORTS
 * `CreditGrantSnapshot` and its S1 validators from `@/lib/opportunity-engine`
 * — it does NOT redefine, re-declare, or structurally clone them (directive
 * §11.2: S1's module doc names this branch as the contract's sole known
 * consumer and requires exactly that). Likewise the atomic authorization
 * seam: the `CreditAuthorizationPort` INTERFACE is owned by the budgets unit
 * (`./credit-port.ts`, §10.8) and S5 implements it against NOVA-owned
 * persistence — this module only CONSUMES it, contributing the admission
 * semantics a conforming adapter must run before reserving, plus a FAKE
 * in-memory adapter for tests. There are NO Prisma credit tables in PR-D
 * (§11.3) and no migration; the fake adapter's ledger is process-memory.
 *
 * THE ONE INVARIANT: a provider/model id alone can NEVER produce credit
 * admission. `CONFIRMED_CREDITS_ONLY` admits a provider only through a
 * fresh, covering, sufficient, receipted snapshot in a consumable grant
 * state, AND only after an ATOMIC reservation through the
 * `CreditAuthorizationPort` proves the grant's spendable balance actually
 * has room (S1 stops short of amount sufficiency deliberately: "AMOUNT
 * sufficiency versus a specific charge estimate is deliberately NOT decided
 * here — that is PR-D's CreditAuthorizationPort"). EVERYTHING else fails
 * closed: no store, no snapshot, any S1 admissibility refusal (invalid
 * snapshot, non-consumable state, unknown/past expiry, stale observation,
 * uncovered scope, drifted/failed-closed reconciliation, no spendable
 * balance), insufficient headroom for THIS charge, a throwing store, or a
 * reservation race loss — all refuse. In production nothing here is
 * reachable at all: the sealed executor wires the budgets unit's
 * `failClosedCreditAuthorizationPort`, so CONFIRMED_CREDITS_ONLY refuses
 * before any dispatch until S5 lands a real adapter (tested).
 *
 * `admitCreditFunded` and the fake adapter are deterministic (injected
 * `now`, injected id factory); there is no clock read and no env read.
 */

import {
  creditScopeCovers,
  evaluateCreditSnapshotAdmissibility,
  isCreditGrantSnapshotExpired,
  isCreditGrantSnapshotFresh,
  validateCreditGrantSnapshot,
  type CreditAdmissibilityReason,
  type CreditGrantSnapshot,
  type CreditScopeRequest,
} from "@/lib/opportunity-engine";
import type { ProviderRouteId } from "./contracts";
import type {
  CreditAuthorizationPort,
  CreditAuthorizationRequest,
  CreditReservation,
} from "./credit-port";
import { microsToUsd, usdToMicros } from "./budget";
import { BudgetBlocked } from "./errors";

// ─────────────────────────────────────────────────────────────────────────────
// Scope + store (read-only lookup of NOVA's canonical snapshot)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The scope one provider attempt asks a grant to cover. `product`/`model`/
 * `region` map directly onto S1's `CreditScopeRequest` (never redefined);
 * `provider` additionally filters candidate snapshots to the route actually
 * being dispatched — a dimension S1's scope contract deliberately does not
 * carry (a snapshot's `provider` field is the grant's OWN provider, matched
 * here, not a scope-coverage dimension).
 */
export interface CreditAdmissionScope extends CreditScopeRequest {
  readonly provider: ProviderRouteId;
}

/**
 * Read-only snapshot store. S5 (NOVA persistence) materializes the real
 * Prisma-backed implementation; this module codes against the interface
 * only. Implementations may pre-filter by scope, but every check here
 * re-verifies coverage itself — a sloppy store can widen the candidate set,
 * never the admission.
 */
export interface CreditSnapshotStore {
  findCovering(
    scope: CreditAdmissionScope,
    now: Date,
  ): Promise<readonly CreditGrantSnapshot[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admission decision types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reason codes for a fail-closed refusal. Every S1 admissibility reason is
 * representable, plus the reasons S1 deliberately leaves undecided:
 * charge-specific headroom, currency, and the store/request-level failures.
 */
export type CreditAdmissionRefusalReason =
  | "no-credit-store"
  | "store-error"
  | "no-covering-snapshot"
  | "insufficient-headroom"
  | "unsupported-currency"
  | "invalid-request"
  | CreditAdmissibilityReason;

export interface CreditAdmissionDecision {
  readonly admitted: boolean;
  /** Primary reason (the first snapshot's failure, or the store-level cause). */
  readonly reason: CreditAdmissionRefusalReason | null;
  readonly detail: string;
  /**
   * The admitting snapshot's grant id, returned to the CALLER. PR-D persists
   * nothing (§11.3: no Prisma credit tables); durable attribution of the
   * admitting grant onto the invocation ledger is S5 scope — no such
   * attribution field exists yet.
   */
  readonly grantId: string | null;
  /** Per-candidate-snapshot refusal reasons, in store order. */
  readonly snapshotRefusals: readonly {
    readonly grantId: string;
    readonly reasons: readonly CreditAdmissionRefusalReason[];
  }[];
}

export interface AdmitCreditFundedInput {
  /** Injected store; absence is handled by the CALLER as fail-closed. */
  readonly store: CreditSnapshotStore;
  readonly scope: CreditAdmissionScope;
  /** Worst-case gross estimate the grant must have headroom for, in minor units of `worstCaseCurrency`. */
  readonly worstCaseMinorUnits: number;
  /**
   * Uppercase ISO-4217 code the worst-case estimate is denominated in. The
   * AI control plane's policy caps (`maxVendorCashUsd`) are USD-only today —
   * a snapshot whose OWN `currency` differs is refused `unsupported-currency`
   * rather than silently cross-converted (no FX-rate source exists here;
   * fail closed rather than guess one).
   */
  readonly worstCaseCurrency: string;
  /** Injected clock value — this function never reads a real clock. */
  readonly now: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admission (S1 admissibility + PR-D's charge-specific headroom)
// ─────────────────────────────────────────────────────────────────────────────

function isoOf(date: Date): string {
  return date.toISOString();
}

/**
 * Evaluate ONE snapshot for ONE scope + charge at ONE evaluation instant.
 * Composes S1's `evaluateCreditSnapshotAdmissibility` (structural validity,
 * consumable state, expiry, freshness, scope coverage, reconciliation
 * posture, ANY spendable balance) with the charge-specific check S1
 * deliberately leaves to PR-D: does the spendable balance cover THIS
 * worst-case estimate. Returns every failing reason (not just the first).
 */
export function evaluateCreditAdmission(
  snapshot: CreditGrantSnapshot,
  scope: CreditAdmissionScope,
  worstCaseMinorUnits: number,
  worstCaseCurrency: string,
  evaluationAtIso: string,
): readonly CreditAdmissionRefusalReason[] {
  const reasons: CreditAdmissionRefusalReason[] = [];

  if (snapshot.provider !== scope.provider) {
    reasons.push("scope_not_covered");
  }
  if (snapshot.currency !== worstCaseCurrency) {
    reasons.push("unsupported-currency");
  }

  const s1 = evaluateCreditSnapshotAdmissibility(snapshot, scope, evaluationAtIso);
  for (const r of s1.reasons) {
    if (!reasons.includes(r)) reasons.push(r);
  }

  const spendable = snapshot.remainingMinorUnits - snapshot.reservedMinorUnits;
  if (!Number.isSafeInteger(spendable) || spendable < worstCaseMinorUnits) {
    reasons.push("insufficient-headroom");
  }

  return reasons;
}

/**
 * Admit (or refuse) credit funding for one provider attempt — eligibility
 * only; this does NOT reserve anything (a conforming
 * `CreditAuthorizationPort` adapter must still take an atomic hold before
 * dispatch — see `createInMemoryCreditAuthorizationPort` for the reference
 * composition). Pure and deterministic: same inputs -> same decision.
 * Fail-closed: any store error, missing/invalid input, or S1/PR-D gate
 * failure refuses — the ONLY admitting path is a snapshot that passes every
 * gate. On success the admitting snapshot's grant id is returned.
 */
export async function admitCreditFunded(
  input: AdmitCreditFundedInput,
): Promise<CreditAdmissionDecision> {
  if (
    !Number.isSafeInteger(input.worstCaseMinorUnits) ||
    input.worstCaseMinorUnits < 0
  ) {
    return {
      admitted: false,
      reason: "invalid-request",
      detail: "worstCaseMinorUnits must be a safe non-negative integer",
      grantId: null,
      snapshotRefusals: [],
    };
  }
  if (!/^[A-Z]{3}$/.test(input.worstCaseCurrency)) {
    return {
      admitted: false,
      reason: "invalid-request",
      detail: 'worstCaseCurrency must be an uppercase ISO-4217 code, e.g. "USD"',
      grantId: null,
      snapshotRefusals: [],
    };
  }

  let candidates: readonly CreditGrantSnapshot[];
  try {
    candidates = await input.store.findCovering(input.scope, input.now);
  } catch (error) {
    return {
      admitted: false,
      reason: "store-error",
      detail: `credit snapshot store failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      grantId: null,
      snapshotRefusals: [],
    };
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      admitted: false,
      reason: "no-covering-snapshot",
      detail: `no credit-grant snapshot covers provider "${input.scope.provider}"`,
      grantId: null,
      snapshotRefusals: [],
    };
  }

  const evaluationAtIso = isoOf(input.now);
  const refusals: { grantId: string; reasons: readonly CreditAdmissionRefusalReason[] }[] = [];
  for (const snapshot of candidates) {
    const reasons = evaluateCreditAdmission(
      snapshot,
      input.scope,
      input.worstCaseMinorUnits,
      input.worstCaseCurrency,
      evaluationAtIso,
    );
    if (reasons.length === 0) {
      return {
        admitted: true,
        reason: null,
        detail: `admitted by grant "${snapshot.grantId}"`,
        grantId: snapshot.grantId,
        snapshotRefusals: [],
      };
    }
    refusals.push({ grantId: snapshot.grantId, reasons });
  }

  return {
    admitted: false,
    reason: refusals[0]!.reasons[0]!,
    detail:
      `all ${refusals.length} covering snapshot(s) refused for provider ` +
      `"${input.scope.provider}": ${refusals
        .map((r) => `${r.grantId}=[${r.reasons.join(",")}]`)
        .join("; ")}`,
    grantId: null,
    snapshotRefusals: refusals,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAKE in-memory CreditAuthorizationPort adapter (directive §11.3: "tests
// against a fake adapter") — the reference composition of admission +
// atomic reservation. NEVER wired into production (the sealed executor
// seals the budgets unit's failClosedCreditAuthorizationPort; there is no
// production parameter through which to inject this). NO Prisma tables.
// ─────────────────────────────────────────────────────────────────────────────

/** Lifecycle of one in-memory hold, mirroring the port's method surface. */
export type InMemoryCreditReservationState =
  | "HELD"
  | "PROVISIONALLY_SETTLED"
  | "RECONCILED"
  | "RELEASED";

export interface InMemoryCreditReservationRecord {
  readonly creditReservationId: string;
  readonly requestId: string;
  readonly reservationVersion: number;
  readonly grantId: string;
  /** The hold, in integer minor units of the grant's currency (USD cents). */
  readonly heldMinorUnits: number;
  state: InMemoryCreditReservationState;
  /** Provisional actual applied by settleProvisional (minor units). */
  actualMinorUnits: number | null;
  /** Receipt-confirmed amount applied by reconcile (minor units). */
  confirmedMinorUnits: number | null;
}

/** Inspectable state surface for tests (never a production API). */
export interface InMemoryCreditPortState {
  readonly reservations: ReadonlyMap<string, InMemoryCreditReservationRecord>;
  /** Sum of currently-HELD minor units per grant — the atomic ledger. */
  readonly heldMinorUnitsByGrant: ReadonlyMap<string, number>;
  /**
   * Sum of SETTLED spend (provisional actuals, corrected by reconciled
   * confirmations) per grant. The snapshot store in this fake is static, so
   * settled spend must stay counted against the snapshot's spendable balance
   * on every later `authorizeAndReserve` — otherwise sequential
   * authorize -> settle cycles could cumulatively overspend a grant. A real
   * S5 adapter reproduces this by decrementing the grant's authoritative
   * remaining balance transactionally at settlement.
   */
  readonly settledMinorUnitsByGrant: ReadonlyMap<string, number>;
}

export interface InMemoryCreditAuthorizationPortConfig {
  readonly store: CreditSnapshotStore;
  /**
   * Maps the budgets unit's port request (task class + entity; NO scope
   * fields — the port contract is deliberately scope-free) to the admission
   * scope the snapshot must cover. A real S5 adapter derives this from
   * NOVA-owned task-class -> product/model/region policy; tests inject it.
   */
  readonly scopeFor: (request: CreditAuthorizationRequest) => CreditAdmissionScope;
  /** Deterministic id factory (tests inject). Defaults to a counter. */
  readonly idFactory?: () => string;
}

export interface InMemoryCreditAuthorizationPort extends CreditAuthorizationPort {
  /** Test-only inspection of the fake's ledger. */
  readonly state: InMemoryCreditPortState;
}

/**
 * Convert the port's exact 6-dp USD decimal string into integer USD minor
 * units (cents), rounding UP — a conservative hold can only over-reserve,
 * never under-reserve, so the credits-only guarantee survives the precision
 * change. Throws `BudgetBlocked` on a malformed amount (fail closed).
 */
export function usdStringToMinorUnitsCeil(usd: string, label: string): number {
  let micros: bigint;
  try {
    micros = usdToMicros(usd, label);
  } catch (error) {
    throw new BudgetBlocked(
      `${label} "${usd}" is not a valid USD amount: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const cents = (micros + 9_999n) / 10_000n; // ceil(micros / 10_000)
  const asNumber = Number(cents);
  if (!Number.isSafeInteger(asNumber)) {
    throw new BudgetBlocked(`${label} "${usd}" exceeds the representable range.`);
  }
  return asNumber;
}

/**
 * FAKE atomic in-memory adapter for the budgets unit's
 * `CreditAuthorizationPort` (§10.8 interface, §11.3 fake). Composition per
 * §11.3: snapshot validation + coverage + freshness + sufficiency (the
 * fail-closed admission above) and THEN an ATOMIC check-and-hold against an
 * in-memory per-grant ledger — the check and the mutation happen in one
 * synchronous critical section AFTER the last `await`, so N concurrent
 * `authorizeAndReserve` calls against a grant whose spendable balance funds
 * only M admit AT MOST M; the rest are refused with ZERO hold taken. A
 * snapshot read alone is a non-conforming implementation (the port's own
 * doc), and this fake exists precisely to prove the composed semantics a
 * real S5 adapter must reproduce transactionally.
 *
 * The ledger counts BOTH outstanding holds AND settled spend against the
 * static snapshot's spendable balance, so the no-collective-overspend
 * invariant survives settlement: sequential authorize -> settle cycles can
 * never re-spend a settled balance (an S5 adapter reproduces this by
 * decrementing the authoritative remaining balance at settlement). Both
 * settlement paths are capped by the authorization: `settleProvisional`
 * refuses an actual above the hold, and `reconcile` refuses a
 * receipt-confirmed amount above the hold (an overrun receipt is a dispute
 * for S5's dispute path, never silently recordable truth).
 *
 * Refusals THROW `BudgetBlocked` (the port's fail-closed contract — the
 * executor maps it to a recorded BUDGET_BLOCKED decision, and dispatch
 * never happens).
 *
 * Idempotency (§10.6 mirror): a replayed `authorizeAndReserve` with the same
 * `requestId` + `reservationVersion` returns the ORIGINAL reservation while
 * it is still HELD — never a second hold. A replay after settlement/release
 * refuses (a completed authorization cannot be silently re-opened).
 */
export function createInMemoryCreditAuthorizationPort(
  config: InMemoryCreditAuthorizationPortConfig,
): InMemoryCreditAuthorizationPort {
  const reservations = new Map<string, InMemoryCreditReservationRecord>();
  const heldByGrant = new Map<string, number>();
  const settledByGrant = new Map<string, number>();
  const byIdempotencyKey = new Map<string, string>();
  let counter = 0;
  const idFactory = config.idFactory ?? (() => `credres-${++counter}`);

  function requireReservation(
    creditReservationId: string,
    op: string,
  ): InMemoryCreditReservationRecord {
    const record = reservations.get(creditReservationId);
    if (!record) {
      throw new BudgetBlocked(
        `${op}: credit reservation "${creditReservationId}" does not exist.`,
      );
    }
    return record;
  }

  function releaseHold(record: InMemoryCreditReservationRecord): void {
    const held = heldByGrant.get(record.grantId) ?? 0;
    heldByGrant.set(record.grantId, held - record.heldMinorUnits);
  }

  /**
   * Move settled spend on/off the grant's consumed ledger. Settled spend is
   * PERMANENT against the static snapshot (only a reconcile correction may
   * adjust it), which is what keeps sequential authorize -> settle cycles
   * from re-spending the same balance.
   */
  function addSettled(grantId: string, deltaMinorUnits: number): void {
    const settled = settledByGrant.get(grantId) ?? 0;
    settledByGrant.set(grantId, settled + deltaMinorUnits);
  }

  return {
    state: {
      reservations,
      heldMinorUnitsByGrant: heldByGrant,
      settledMinorUnitsByGrant: settledByGrant,
    },

    async authorizeAndReserve(
      request: CreditAuthorizationRequest,
    ): Promise<CreditReservation> {
      const worstCaseMinorUnits = usdStringToMinorUnitsCeil(
        request.worstCaseUsd,
        "worstCaseUsd",
      );

      const idempotencyKey = `${request.requestId}#${request.reservationVersion}`;
      const existingId = byIdempotencyKey.get(idempotencyKey);
      if (existingId !== undefined) {
        const existing = requireReservation(existingId, "authorizeAndReserve");
        if (existing.state !== "HELD") {
          throw new BudgetBlocked(
            `authorizeAndReserve: reservation for request "${request.requestId}" ` +
              `v${request.reservationVersion} is already ${existing.state}; a ` +
              "completed authorization cannot be replayed.",
          );
        }
        return {
          creditReservationId: existing.creditReservationId,
          requestId: existing.requestId,
          grantAllocationRef: existing.grantId,
          // The ORIGINAL hold, not the replay's amount — idempotent replay
          // returns the reservation as it was taken.
          heldUsd: microsToUsd(BigInt(existing.heldMinorUnits) * 10_000n),
        };
      }

      const scope = config.scopeFor(request);

      // The ONLY await before the critical section: read the candidate
      // snapshots. Everything after this line is synchronous, which is what
      // makes the check-and-hold atomic in this single-threaded fake (the
      // real S5 adapter must achieve the same with a conditional UPDATE).
      let candidates: readonly CreditGrantSnapshot[];
      try {
        candidates = await config.store.findCovering(scope, request.now);
      } catch (error) {
        throw new BudgetBlocked(
          `credit snapshot store failed: ${
            error instanceof Error ? error.message : String(error)
          } — refusing credit-funded dispatch (fail closed).`,
        );
      }

      if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new BudgetBlocked(
          `no credit-grant snapshot covers provider "${scope.provider}" — ` +
            "refusing credit-funded dispatch (no covering snapshot).",
        );
      }

      // ── Atomic critical section (no await) ─────────────────────────────
      const evaluationAtIso = isoOf(request.now);
      const refusals: string[] = [];
      for (const snapshot of candidates) {
        const reasons = evaluateCreditAdmission(
          snapshot,
          scope,
          worstCaseMinorUnits,
          "USD",
          evaluationAtIso,
        );
        if (reasons.length > 0) {
          refusals.push(`${snapshot.grantId}=[${reasons.join(",")}]`);
          continue;
        }
        const spendable =
          snapshot.remainingMinorUnits - snapshot.reservedMinorUnits;
        const alreadyHeld = heldByGrant.get(snapshot.grantId) ?? 0;
        // Settled spend stays counted: the static snapshot never learns about
        // this fake's settlements, so the ledger must subtract them itself or
        // sequential authorize -> settle cycles would overspend the grant.
        const alreadySettled = settledByGrant.get(snapshot.grantId) ?? 0;
        if (alreadyHeld + alreadySettled + worstCaseMinorUnits > spendable) {
          refusals.push(
            `${snapshot.grantId}=[insufficient-headroom: ${alreadyHeld} already ` +
              `held + ${alreadySettled} already settled + ${worstCaseMinorUnits} ` +
              `> spendable ${spendable}]`,
          );
          continue;
        }
        // Check passed — take the hold in the SAME synchronous step.
        heldByGrant.set(snapshot.grantId, alreadyHeld + worstCaseMinorUnits);
        const creditReservationId = idFactory();
        const record: InMemoryCreditReservationRecord = {
          creditReservationId,
          requestId: request.requestId,
          reservationVersion: request.reservationVersion,
          grantId: snapshot.grantId,
          heldMinorUnits: worstCaseMinorUnits,
          state: "HELD",
          actualMinorUnits: null,
          confirmedMinorUnits: null,
        };
        reservations.set(creditReservationId, record);
        byIdempotencyKey.set(idempotencyKey, creditReservationId);
        return {
          creditReservationId,
          requestId: request.requestId,
          grantAllocationRef: snapshot.grantId,
          // What is actually HELD: the worst case rounded UP to whole minor
          // units (never less than requested).
          heldUsd: microsToUsd(BigInt(worstCaseMinorUnits) * 10_000n),
        };
      }

      throw new BudgetBlocked(
        `credit admission refused for provider "${scope.provider}": ` +
          `${refusals.join("; ")} — refusing credit-funded dispatch.`,
      );
    },

    async settleProvisional(
      creditReservationId: string,
      actualUsd: string,
      _now: Date,
    ): Promise<void> {
      const actualMinorUnits = usdStringToMinorUnitsCeil(actualUsd, "actualUsd");
      const record = requireReservation(creditReservationId, "settleProvisional");
      if (record.state !== "HELD") {
        throw new BudgetBlocked(
          `settleProvisional: credit reservation "${creditReservationId}" is ` +
            `${record.state}, not HELD; refusing a second settlement.`,
        );
      }
      if (actualMinorUnits > record.heldMinorUnits) {
        throw new BudgetBlocked(
          `settleProvisional: actual ${actualMinorUnits} minor units exceeds ` +
            `the authorized hold of ${record.heldMinorUnits} — a credits-only ` +
            "charge may never exceed its authorization.",
        );
      }
      // Release the FULL hold, then record the applied actual as SETTLED
      // spend — the remainder is freed, the actual stays consumed. Without
      // the settled entry the ledger would forget the spend entirely and a
      // later authorize could re-spend the same balance.
      releaseHold(record);
      addSettled(record.grantId, actualMinorUnits);
      record.state = "PROVISIONALLY_SETTLED";
      record.actualMinorUnits = actualMinorUnits;
    },

    async reconcile(
      creditReservationId: string,
      confirmedUsd: string,
      _now: Date,
    ): Promise<void> {
      const confirmedMinorUnits = usdStringToMinorUnitsCeil(
        confirmedUsd,
        "confirmedUsd",
      );
      const record = requireReservation(creditReservationId, "reconcile");
      if (record.state === "RECONCILED" || record.state === "RELEASED") {
        throw new BudgetBlocked(
          `reconcile: credit reservation "${creditReservationId}" is ` +
            `${record.state}; refusing to reconcile it again.`,
        );
      }
      // The same cap that guards settleProvisional guards reconciliation:
      // a credits-only charge may never exceed its authorization, and a
      // receipt claiming it did is a DISPUTE, not a silently recordable
      // truth. Refuse and leave the record untouched — dispute handling
      // (CreditAllocationState DISPUTED) is S5 scope against real
      // persistence; this fake must never absorb an overrun as reconciled.
      if (confirmedMinorUnits > record.heldMinorUnits) {
        throw new BudgetBlocked(
          `reconcile: confirmed ${confirmedMinorUnits} minor units exceeds ` +
            `the authorized hold of ${record.heldMinorUnits} — a credits-only ` +
            "charge may never exceed its authorization; this receipt is a " +
            "dispute, not a reconcilable truth.",
        );
      }
      if (record.state === "HELD") {
        // Receipt arrived before a provisional settlement: the confirmed
        // amount replaces the hold outright and becomes settled spend.
        releaseHold(record);
        addSettled(record.grantId, confirmedMinorUnits);
      } else {
        // PROVISIONALLY_SETTLED: correct the settled ledger from the
        // provisional actual to the receipt-confirmed amount.
        addSettled(
          record.grantId,
          confirmedMinorUnits - (record.actualMinorUnits ?? 0),
        );
      }
      record.state = "RECONCILED";
      record.confirmedMinorUnits = confirmedMinorUnits;
    },

    async release(creditReservationId: string, _now: Date): Promise<void> {
      const record = requireReservation(creditReservationId, "release");
      if (record.state !== "HELD") {
        throw new BudgetBlocked(
          `release: credit reservation "${creditReservationId}" is ` +
            `${record.state}, not HELD; refusing to release it twice.`,
        );
      }
      releaseHold(record);
      record.state = "RELEASED";
    },
  };
}

// Re-export the pure S1 primitives this module composes, so callers never
// need a second import path to check freshness/expiry/coverage directly.
export {
  creditScopeCovers,
  evaluateCreditSnapshotAdmissibility,
  isCreditGrantSnapshotExpired,
  isCreditGrantSnapshotFresh,
  validateCreditGrantSnapshot,
};
export type { CreditGrantSnapshot, CreditScopeRequest };
