/**
 * AI control-plane credit ADMISSION + AUTHORIZATION layer (Phase 2 PR-D,
 * rebuilt on the corrected #162/#163/#164 chain + NOVA S1's canonical
 * `CreditGrantSnapshot`).
 *
 * Governing docs:
 *   - docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md §3.1 (consumption
 *     contract), §5.2 (CreditGrantState binding), §8 (PR-D unblocked as the
 *     admission layer; table materialization deferred to S5).
 *   - docs/ai/phase0/AI_CONTROL_PLANE_DESIGN_2026-07-22.md §PR D / directive
 *     §11.2 (canonical snapshot, `lib/opportunity-engine/credit-snapshot.ts`)
 *     / §11.3 (this module's atomic `CreditAuthorizationPort`).
 *
 * OWNERSHIP (freeze §2/§3.1): NOVA owns the credit-program lifecycle, its
 * state vocabulary, AND the canonical snapshot contract. This module
 * IMPORTS `CreditGrantSnapshot` and its S1 validators from
 * `@/lib/opportunity-engine` — it does NOT redefine, re-declare, or
 * structurally clone them (directive §11.2: "feat/ai-control-plane-credit-
 * admission ... must IMPORT this type ... and must never redefine"). The
 * Prisma table BEHIND the snapshot read model is materialized in NOVA's S5
 * persistence unit; this module codes against the read-only
 * `CreditSnapshotStore` interface for snapshot lookup.
 *
 * THE ONE INVARIANT: a provider/model id alone can NEVER produce credit
 * admission. `CONFIRMED_CREDITS_ONLY` admits a provider only through a
 * fresh, covering, sufficient, receipted snapshot in a consumable grant
 * state, AND only after an ATOMIC authorization reservation proves the
 * grant's spendable balance actually has room (directive §11.3 — S1
 * deliberately stops short of amount sufficiency against a specific charge:
 * "AMOUNT sufficiency versus a specific charge estimate is deliberately NOT
 * decided here — that is PR-D's CreditAuthorizationPort"). EVERYTHING else
 * fails closed: no store, no snapshot, any S1 admissibility refusal
 * (invalid snapshot, non-consumable state, unknown/past expiry, stale
 * observation, uncovered scope, drifted/failed-closed reconciliation, no
 * spendable balance), insufficient headroom for THIS charge, a throwing
 * store, or a reservation race loss — all refuse.
 *
 * AUTHORIZATION IS ATOMIC (directive §11.3, new correction): unlike the old
 * PR-D, admission alone was never enough to prevent a double-spend across
 * concurrent attempts against the SAME grant — two callers could both read
 * "sufficient remaining" and both admit. `CreditAuthorizationPort.authorize`
 * closes that gap the same way `budget.ts` closes it for cash: ONE atomic
 * conditional UPDATE against a per-grant reservation ledger
 * (`credit_grant_reservation_ledger`), never a read-then-write. The ledger's
 * cap is refreshed from the admitting snapshot's CURRENT spendable balance
 * on every authorize call, so N concurrent authorizers against a grant that
 * can fund M can authorize AT MOST M; the rest are refused
 * `insufficient-headroom` with zero reservation taken. Proven against real
 * Postgres — see the "100 concurrent authorize()" acceptance test.
 *
 * `admitCreditFunded`/`authorize` are otherwise deterministic (injected
 * `now`/TTL); there is no clock read and no env read beyond the injected
 * store and ledger. The caller (`invocation-pipeline.ts`) maps a refusal to
 * `PolicyBlocked`.
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
 * Reason codes for a fail-closed refusal (mapped to `PolicyBlocked`
 * upstream). Every S1 admissibility reason is representable, plus the two
 * PR-D-owned reasons S1 deliberately leaves undecided: charge-specific
 * headroom and the store/request-level failures.
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
  /** The admitting snapshot's grant id — recorded as attribution.creditGrantSnapshotId. */
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
 * only; this does NOT reserve anything (see `CreditAuthorizationPort` below
 * for the atomic reservation this decision must still pass through before
 * dispatch). Pure and deterministic: same inputs -> same decision.
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
// CreditAuthorizationPort (directive §11.3) — atomic reservation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal parameterized-SQL seam the atomic reservation ledger depends on.
 * Any object with these raw-query methods works, including the real Prisma
 * client (see `prismaCreditLedgerClient` in control-store.ts's sibling
 * pattern) — mirrors `budget.ts`'s `BudgetDb` seam exactly.
 */
export interface CreditLedgerDb {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $transaction<T>(fn: (tx: CreditLedgerDb) => Promise<T>): Promise<T>;
}

/** Lifecycle of one atomic authorization hold. */
export type CreditAuthorizationState = "HELD" | "SETTLED" | "RELEASED" | "EXPIRED";

export interface CreditAuthorizationHandle {
  readonly reservationId: string;
  readonly grantId: string;
}

export type CreditAuthorizationDecision =
  | ({ readonly admitted: true; readonly handle: CreditAuthorizationHandle } & Pick<
      CreditAdmissionDecision,
      "detail"
    >)
  | CreditAdmissionDecision & { readonly admitted: false };

export interface AuthorizeCreditInput {
  readonly store: CreditSnapshotStore;
  readonly scope: CreditAdmissionScope;
  readonly worstCaseMinorUnits: number;
  readonly worstCaseCurrency: string;
  readonly now: Date;
  /** Auto-release safety-net deadline for the hold. */
  readonly expiresAt: Date;
  /** Deterministic id factory (tests inject). Defaults to a random id. */
  readonly idFactory?: () => string;
}

/**
 * Atomic credit-authorization port (directive §11.3): composes admission
 * (S1 admissibility + PR-D headroom) with a reservation that ACTUALLY
 * PREVENTS a double-spend across concurrent authorizers of the same grant —
 * a property `admitCreditFunded` alone cannot provide (it only reads, never
 * holds).
 */
export interface CreditAuthorizationPort {
  authorize(input: AuthorizeCreditInput): Promise<CreditAuthorizationDecision>;
  /** Settle a HELD reservation with the actual spend (minor units). */
  settle(handle: CreditAuthorizationHandle, actualMinorUnits: number): Promise<void>;
  /** Release a HELD reservation without a charge (invocation never spent). */
  release(handle: CreditAuthorizationHandle): Promise<void>;
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `credauth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

async function loadHeldReservation(
  tx: CreditLedgerDb,
  reservationId: string,
  op: "settle" | "release",
): Promise<{ grantId: string; amount: string }> {
  const rows = await tx.$queryRawUnsafe<
    Array<{ grantId: string; amountMinorUnits: string | number; state: string }>
  >(
    `SELECT "grantId", "amountMinorUnits"::text AS "amountMinorUnits", "state"
       FROM "credit_grant_reservations"
      WHERE "id" = $1
      FOR UPDATE`,
    reservationId,
  );
  const row = rows[0];
  if (!row) {
    throw new BudgetBlocked(`${op}: credit reservation "${reservationId}" does not exist.`);
  }
  if (row.state !== "HELD") {
    throw new BudgetBlocked(
      `${op}: credit reservation "${reservationId}" is ${row.state}, not HELD; ` +
        `refusing to ${op} it twice.`,
    );
  }
  return { grantId: row.grantId, amount: String(row.amountMinorUnits) };
}

/**
 * Postgres-backed `CreditAuthorizationPort`. THE ATOMIC GUARD (mirrors
 * budget.ts's `reserve`): one conditional UPDATE against a per-grant ledger
 * row, refreshed to the admitting snapshot's CURRENT spendable balance on
 * every call —
 *
 *   INSERT INTO credit_grant_reservation_ledger (grantId, reservedMinorUnits)
 *     VALUES ($grantId, 0) ON CONFLICT ("grantId") DO NOTHING;
 *   UPDATE credit_grant_reservation_ledger
 *      SET "reservedMinorUnits" = "reservedMinorUnits" + $amount
 *    WHERE "grantId" = $grantId
 *      AND "reservedMinorUnits" + $amount <= $spendableAtAuthTime
 *   RETURNING "grantId";
 *
 * — never a read-then-write. Postgres row locking serializes concurrent
 * authorizers of the SAME grant, and the WHERE guard admits exactly the set
 * of holds that still fit the grant's spendable balance AS OBSERVED AT THIS
 * CALL. N concurrent authorize() calls against a grant that can fund M
 * authorize at most M; the rest see zero rows updated and are refused
 * `insufficient-headroom` with NO reservation taken.
 */
export function createPgCreditAuthorizationPort(db: unknown): CreditAuthorizationPort {
  const ledgerDb = db as CreditLedgerDb;

  return {
    async authorize(input: AuthorizeCreditInput): Promise<CreditAuthorizationDecision> {
      const decision = await admitCreditFunded({
        store: input.store,
        scope: input.scope,
        worstCaseMinorUnits: input.worstCaseMinorUnits,
        worstCaseCurrency: input.worstCaseCurrency,
        now: input.now,
      });
      if (!decision.admitted || decision.grantId === null) {
        return {
          admitted: false,
          reason: decision.reason,
          detail: decision.detail,
          grantId: null,
          snapshotRefusals: decision.snapshotRefusals,
        };
      }
      const grantId = decision.grantId;
      const idFactory = input.idFactory ?? randomId;
      const reservationId = idFactory();

      // Re-derive the CURRENT spendable balance for the guard (a fresh read,
      // not the possibly-stale candidate used for admission above — the
      // admission pass already proved coverage/eligibility; only the amount
      // gate needs the freshest number the atomic UPDATE can be guarded on).
      let spendableAtAuthTime = 0;
      try {
        const fresh = await input.store.findCovering(input.scope, input.now);
        const match = fresh.find((s) => s.grantId === grantId);
        spendableAtAuthTime = match
          ? match.remainingMinorUnits - match.reservedMinorUnits
          : 0;
      } catch (error) {
        return {
          admitted: false,
          reason: "store-error",
          detail: `credit snapshot store failed on re-read: ${
            error instanceof Error ? error.message : String(error)
          }`,
          grantId: null,
          snapshotRefusals: [],
        };
      }

      const acquired = await ledgerDb.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO "credit_grant_reservation_ledger" ("grantId", "reservedMinorUnits", "updatedAt")
           VALUES ($1, 0, now())
           ON CONFLICT ("grantId") DO NOTHING`,
          grantId,
        );
        const affected = await tx.$executeRawUnsafe(
          `UPDATE "credit_grant_reservation_ledger"
              SET "reservedMinorUnits" = "reservedMinorUnits" + $1::bigint,
                  "updatedAt" = now()
            WHERE "grantId" = $2
              AND "reservedMinorUnits" + $1::bigint <= $3::bigint`,
          input.worstCaseMinorUnits,
          grantId,
          spendableAtAuthTime,
        );
        if (affected !== 1) return false;
        await tx.$executeRawUnsafe(
          `INSERT INTO "credit_grant_reservations"
             ("id", "grantId", "amountMinorUnits", "state", "createdAt", "expiresAt")
           VALUES ($1, $2, $3::bigint, 'HELD', $4, $5)`,
          reservationId,
          grantId,
          input.worstCaseMinorUnits,
          input.now,
          input.expiresAt,
        );
        return true;
      });

      if (!acquired) {
        return {
          admitted: false,
          reason: "insufficient-headroom",
          detail:
            `grant "${grantId}" cannot admit a hold of ${input.worstCaseMinorUnits} ` +
            "minor units (concurrent authorization exhausted the spendable balance).",
          grantId: null,
          snapshotRefusals: [],
        };
      }
      return { admitted: true, handle: { reservationId, grantId }, detail: decision.detail };
    },

    async settle(handle: CreditAuthorizationHandle, actualMinorUnits: number): Promise<void> {
      if (!Number.isSafeInteger(actualMinorUnits) || actualMinorUnits < 0) {
        throw new BudgetBlocked("settle: actualMinorUnits must be a safe non-negative integer.");
      }
      await ledgerDb.$transaction(async (tx) => {
        const { grantId, amount } = await loadHeldReservation(tx, handle.reservationId, "settle");
        await tx.$executeRawUnsafe(
          `UPDATE "credit_grant_reservation_ledger"
              SET "reservedMinorUnits" = "reservedMinorUnits" - $1::bigint,
                  "updatedAt" = now()
            WHERE "grantId" = $2`,
          amount,
          grantId,
        );
        await tx.$executeRawUnsafe(
          `UPDATE "credit_grant_reservations"
              SET "state" = 'SETTLED', "settledMinorUnits" = $1::bigint
            WHERE "id" = $2 AND "state" = 'HELD'`,
          actualMinorUnits,
          handle.reservationId,
        );
      });
    },

    async release(handle: CreditAuthorizationHandle): Promise<void> {
      await ledgerDb.$transaction(async (tx) => {
        const { grantId, amount } = await loadHeldReservation(tx, handle.reservationId, "release");
        await tx.$executeRawUnsafe(
          `UPDATE "credit_grant_reservation_ledger"
              SET "reservedMinorUnits" = "reservedMinorUnits" - $1::bigint,
                  "updatedAt" = now()
            WHERE "grantId" = $2`,
          amount,
          grantId,
        );
        await tx.$executeRawUnsafe(
          `UPDATE "credit_grant_reservations"
              SET "state" = 'RELEASED'
            WHERE "id" = $1 AND "state" = 'HELD'`,
          handle.reservationId,
        );
      });
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
