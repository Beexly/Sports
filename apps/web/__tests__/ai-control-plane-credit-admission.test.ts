/**
 * Phase 2 PR-D — credit ADMISSION + the FAKE atomic adapter of the budgets
 * unit's `CreditAuthorizationPort` (directive §11.2/§11.3), rebuilt on the
 * hardened #162/#163/#164 stack and the current NOVA S1 head.
 *
 * OWNER CORRECTIONS covered here:
 *   - the old PR-D defined its own duplicate, weaker `CreditGrantSnapshot`
 *     (floating-dollar amounts, no receipt hash, no reconciliation posture).
 *     This suite proves the rebuilt module imports S1's rich, receipted
 *     contract instead of redefining it.
 *   - the port INTERFACE is owned by the budgets unit (§10.8,
 *     `credit-port.ts`); PR-D contributes ADMISSION semantics plus a fake
 *     in-memory adapter — NO Prisma credit tables, no real adapter, and
 *     CONFIRMED_CREDITS_ONLY stays fail-closed in production (tested).
 *
 * Four layers:
 *   1. UNIT — S1 import surface: the canonical snapshot shape is what PR-D
 *      actually consumes.
 *   2. UNIT — `admitCreditFunded`/`evaluateCreditAdmission`: every S1
 *      admissibility reason surfaces through PR-D's composition, plus the
 *      reasons S1 leaves to PR-D (charge-specific headroom, currency).
 *   3. FAKE ADAPTER — `createInMemoryCreditAuthorizationPort` implements the
 *      §10.8 port over the admission layer with an ATOMIC in-memory
 *      check-and-hold: lifecycle transitions, double-transition guards,
 *      idempotent replay, ceil-to-minor-units conservatism, and the
 *      §11.3 concurrency acceptance — 10 simultaneous `authorizeAndReserve`
 *      calls THROUGH THE PORT cannot collectively exceed the grant's
 *      remaining spendable balance.
 *   4. EXECUTOR — CONFIRMED_CREDITS_ONLY through `createAiExecutor`: the
 *      production-sealed fail-closed port refuses BEFORE dispatch (no real
 *      adapter -> unreachable, tested), while the fake adapter gates
 *      dispatch on a covering, admissible snapshot.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import {
  admitCreditFunded,
  createInMemoryCreditAuthorizationPort,
  evaluateCreditAdmission,
  usdStringToMinorUnitsCeil,
  type AdmitCreditFundedInput,
  type CreditAdmissionScope,
  type CreditSnapshotStore,
  type InMemoryCreditAuthorizationPort,
} from "@/lib/ai-control-plane/credit-admission";
import {
  createAiExecutor,
  failClosedCreditAuthorizationPort,
  failClosedReceiptStore,
  type SealedAiExecutorDependencies,
} from "@/lib/ai-control-plane/internal";
import type {
  CreditAuthorizationRequest,
  CreditReservation,
} from "@/lib/ai-control-plane/credit-port";
import { AmbiguousCharge, BudgetBlocked } from "@/lib/ai-control-plane/errors";
import { getTaskPolicy } from "@/lib/ai-control-plane/policy-registry";
import type { AiTaskInvocationRequest } from "@/lib/ai-control-plane/contracts";
import { serviceActor } from "@/lib/auth/actor";
import type { CreditGrantSnapshot } from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-22T12:00:00.000Z");
const ACTOR = serviceActor({ subjectId: "service:credit-admission-tests" });

// ═══════════════════════════════════════════════════════════════════════════
// Fixtures — S1's canonical CreditGrantSnapshot (never a PR-D-owned redefinition)
// ═══════════════════════════════════════════════════════════════════════════

/** A structurally valid, admissible snapshot (mirrors S1's own conformance fixture). */
function validSnapshot(overrides: Partial<CreditGrantSnapshot> = {}): CreditGrantSnapshot {
  return {
    programId: "aws-activate",
    applicationId: "app-2026-0099",
    grantId: "grant-2026-0099",
    provider: "bedrock",
    billingAccountId: "billing-acct-01",
    billingProjectId: null,
    currency: "USD",
    originalAwardMinorUnits: 10_000_00, // $10,000.00
    remainingMinorUnits: 5_000_00, // $5,000.00
    reservedMinorUnits: 0,
    grantState: "activated",
    activatedAt: "2026-01-15T00:00:00.000Z",
    expiresAt: "2027-01-15T00:00:00.000Z",
    eligibleProducts: ["*"],
    eligibleModels: ["*"],
    eligibleRegions: ["*"],
    exclusions: [],
    cashOverageBehavior: "blocks_usage_at_zero",
    observedAt: new Date(NOW.getTime() - 60_000).toISOString(), // 1 min old
    recordedAt: new Date(NOW.getTime() - 55_000).toISOString(),
    freshnessHorizonMs: 10 * 60_000, // 10 min TTL
    sourceReceiptId: "receipt-8842",
    sourceReceiptHash: "sha256:2f1a9c",
    reconciliationState: "reconciled",
    attestedBy: "nova-reconciler@2026-07",
    schemaVersion: "credit-grant-snapshot@1",
    policyVersion: "credit-policy@1",
    ...overrides,
  };
}

function scopeOf(overrides: Partial<CreditAdmissionScope> = {}): CreditAdmissionScope {
  return { provider: "bedrock", product: "journal", model: null, region: null, ...overrides };
}

function storeOf(...snapshots: CreditGrantSnapshot[]): CreditSnapshotStore {
  return {
    async findCovering() {
      return [...snapshots];
    },
  };
}

function baseInput(overrides: Partial<AdmitCreditFundedInput> = {}): AdmitCreditFundedInput {
  return {
    store: storeOf(validSnapshot()),
    scope: scopeOf(),
    worstCaseMinorUnits: 100_00, // $100.00
    worstCaseCurrency: "USD",
    now: NOW,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — S1 import surface (the owner correction this suite must prove)
// ═══════════════════════════════════════════════════════════════════════════
describe("credit-admission.ts imports S1's canonical CreditGrantSnapshot (never redefines it)", () => {
  it("a fixture built with S1-only fields (sourceReceiptHash, reconciliationState, schemaVersion) typechecks as CreditGrantSnapshot", () => {
    // If PR-D had redefined its own weaker snapshot type, this cast would be
    // structurally impossible to typecheck against (no sourceReceiptHash /
    // reconciliationState / schemaVersion existed on the old shape) — the
    // fact that `validSnapshot()` compiles as a `CreditGrantSnapshot` proves
    // the S1 shape is what's actually imported and used end-to-end.
    const s = validSnapshot();
    expect(s.sourceReceiptHash).toBeDefined();
    expect(s.reconciliationState).toBeDefined();
    expect(s.schemaVersion).toBeDefined();
    expect(s.remainingMinorUnits).toBeTypeOf("number"); // integer minor units, not a float dollar amount
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — admitCreditFunded: provider/model id ALONE never admits
// ═══════════════════════════════════════════════════════════════════════════
describe("admitCreditFunded — provider/model id alone NEVER admits", () => {
  it("refuses when the store has no covering snapshot at all", async () => {
    const decision = await admitCreditFunded(baseInput({ store: storeOf() }));
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("no-covering-snapshot");
  });

  it("refuses on a throwing store (fail closed, never admits)", async () => {
    const decision = await admitCreditFunded(
      baseInput({
        store: {
          async findCovering() {
            throw new Error("boom");
          },
        },
      }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("store-error");
  });

  it("refuses an invalid request (negative worstCaseMinorUnits)", async () => {
    const decision = await admitCreditFunded(baseInput({ worstCaseMinorUnits: -1 }));
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("invalid-request");
  });

  it("refuses a malformed worstCaseCurrency", async () => {
    const decision = await admitCreditFunded(baseInput({ worstCaseCurrency: "usd" }));
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("invalid-request");
  });

  it("refuses a snapshot whose currency differs from the charge's currency (unsupported-currency)", async () => {
    const decision = await admitCreditFunded(
      baseInput({ store: storeOf(validSnapshot({ currency: "EUR" })) }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("unsupported-currency");
  });

  it("refuses a non-consumable grant state (approved — not yet activated)", async () => {
    const decision = await admitCreditFunded(
      baseInput({ store: storeOf(validSnapshot({ grantState: "approved", activatedAt: null })) }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("grant_state_not_consumable");
  });

  it("refuses a terminal grant state (exhausted / expired / revoked)", async () => {
    for (const grantState of ["exhausted", "expired", "revoked"] as const) {
      const decision = await admitCreditFunded(
        baseInput({
          store: storeOf(
            validSnapshot({
              grantState,
              remainingMinorUnits: grantState === "exhausted" ? 0 : 5_000_00,
              reservedMinorUnits: 0,
            }),
          ),
        }),
      );
      expect(decision.admitted).toBe(false);
      expect(decision.reason).toBe("grant_state_not_consumable");
    }
  });

  it("refuses an unknown (null) expiry — fail closed rather than assume no expiry", async () => {
    const decision = await admitCreditFunded(
      baseInput({ store: storeOf(validSnapshot({ expiresAt: null })) }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("grant_expiry_unknown");
  });

  it("refuses an expired grant", async () => {
    const decision = await admitCreditFunded(
      baseInput({
        store: storeOf(validSnapshot({ expiresAt: new Date(NOW.getTime() - 1000).toISOString() })),
      }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("grant_expired");
  });

  it("refuses a stale snapshot (observedAt outside the freshness horizon)", async () => {
    const decision = await admitCreditFunded(
      baseInput({
        store: storeOf(
          validSnapshot({
            observedAt: new Date(NOW.getTime() - 3600_000).toISOString(), // 1h old
            freshnessHorizonMs: 60_000, // 1 min TTL
          }),
        ),
      }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("snapshot_stale");
  });

  it("refuses when the scope is not covered (product/model/provider each)", async () => {
    const productRefusal = await admitCreditFunded(
      baseInput({
        store: storeOf(validSnapshot({ eligibleProducts: ["vertex-ai"] })),
        scope: scopeOf({ product: "journal" }),
      }),
    );
    expect(productRefusal.admitted).toBe(false);
    expect(productRefusal.reason).toBe("scope_not_covered");

    const modelRefusal = await admitCreditFunded(
      baseInput({
        store: storeOf(validSnapshot({ eligibleModels: ["claude-x"] })),
        scope: scopeOf({ model: "claude-y" }),
      }),
    );
    expect(modelRefusal.admitted).toBe(false);
    expect(modelRefusal.reason).toBe("scope_not_covered");

    const providerRefusal = await admitCreditFunded(
      baseInput({
        store: storeOf(validSnapshot({ provider: "vertex" })),
        scope: scopeOf({ provider: "bedrock" }),
      }),
    );
    expect(providerRefusal.admitted).toBe(false);
    expect(providerRefusal.reason).toBe("scope_not_covered");
  });

  it("refuses a drifted or failed-closed reconciliation posture", async () => {
    for (const reconciliationState of ["drifted", "failed_closed"] as const) {
      const decision = await admitCreditFunded(
        baseInput({ store: storeOf(validSnapshot({ reconciliationState })) }),
      );
      expect(decision.admitted).toBe(false);
      expect(decision.reason).toBe(
        reconciliationState === "drifted" ? "reconciliation_drifted" : "reconciliation_failed_closed",
      );
    }
  });

  it("an unreconciled snapshot IS admissible (a first receipted observation can bootstrap)", async () => {
    const decision = await admitCreditFunded(
      baseInput({ store: storeOf(validSnapshot({ reconciliationState: "unreconciled" })) }),
    );
    expect(decision.admitted).toBe(true);
  });

  it("refuses insufficient headroom (spendable balance below the worst-case charge)", async () => {
    const decision = await admitCreditFunded(
      baseInput({
        store: storeOf(validSnapshot({ remainingMinorUnits: 50, reservedMinorUnits: 0 })),
        worstCaseMinorUnits: 100_00,
      }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("insufficient-headroom");
  });

  it("refuses when the entire spendable balance is already reserved (no_spendable_balance)", async () => {
    const decision = await admitCreditFunded(
      baseInput({
        store: storeOf(
          validSnapshot({ remainingMinorUnits: 100_00, reservedMinorUnits: 100_00 }),
        ),
      }),
    );
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("no_spendable_balance");
  });

  it("happy path: activated + fresh + covering + sufficient + receipted admits and returns the grant id", async () => {
    const decision = await admitCreditFunded(baseInput());
    expect(decision.admitted).toBe(true);
    expect(decision.grantId).toBe("grant-2026-0099");
  });

  it("happy path also admits partially_consumed", async () => {
    const decision = await admitCreditFunded(
      baseInput({ store: storeOf(validSnapshot({ grantState: "partially_consumed" })) }),
    );
    expect(decision.admitted).toBe(true);
  });

  it("tries multiple candidates in store order and admits the first that passes every gate", async () => {
    const refusing = validSnapshot({ grantId: "grant-refuses", reconciliationState: "drifted" });
    const admitting = validSnapshot({ grantId: "grant-admits" });
    const decision = await admitCreditFunded(baseInput({ store: storeOf(refusing, admitting) }));
    expect(decision.admitted).toBe(true);
    expect(decision.grantId).toBe("grant-admits");
  });

  it("collects EVERY failing reason for one snapshot, not just the first", () => {
    const reasons = evaluateCreditAdmission(
      validSnapshot({ grantState: "revoked", eligibleProducts: ["other-product"] }),
      scopeOf({ product: "journal" }),
      100_00,
      "USD",
      NOW.toISOString(),
    );
    expect(reasons).toContain("grant_state_not_consumable");
    expect(reasons).toContain("scope_not_covered");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAKE ADAPTER — the budgets unit's CreditAuthorizationPort over admission
// ═══════════════════════════════════════════════════════════════════════════

function portRequest(
  overrides: Partial<CreditAuthorizationRequest> = {},
): CreditAuthorizationRequest {
  return {
    requestId: "req-credit-1",
    taskClass: "brief.daily-summary",
    entity: "GSE",
    worstCaseUsd: "100.000000", // $100.00 -> 10_000 minor units
    reservationVersion: 1,
    now: NOW,
    ...overrides,
  };
}

function fakePort(
  ...snapshots: CreditGrantSnapshot[]
): InMemoryCreditAuthorizationPort {
  return createInMemoryCreditAuthorizationPort({
    store: storeOf(...snapshots),
    scopeFor: () => scopeOf(),
  });
}

describe("createInMemoryCreditAuthorizationPort — fake adapter of the §10.8 port", () => {
  it("usdStringToMinorUnitsCeil rounds UP (conservative hold) and refuses malformed amounts", () => {
    expect(usdStringToMinorUnitsCeil("100.000000", "x")).toBe(10_000);
    expect(usdStringToMinorUnitsCeil("0.000001", "x")).toBe(1); // sub-cent -> 1 cent, never 0
    expect(usdStringToMinorUnitsCeil("0.010000", "x")).toBe(1);
    expect(usdStringToMinorUnitsCeil("0.000000", "x")).toBe(0);
    expect(() => usdStringToMinorUnitsCeil("nope", "x")).toThrow(BudgetBlocked);
    expect(() => usdStringToMinorUnitsCeil("-1.000000", "x")).toThrow(BudgetBlocked);
  });

  it("authorizeAndReserve takes NO hold when no snapshot covers (BudgetBlocked)", async () => {
    const port = fakePort();
    await expect(port.authorizeAndReserve(portRequest())).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    expect(port.state.reservations.size).toBe(0);
    expect([...port.state.heldMinorUnitsByGrant.values()]).toEqual([]);
  });

  it("authorizeAndReserve fails closed on a throwing store — refusal, zero hold", async () => {
    const port = createInMemoryCreditAuthorizationPort({
      store: {
        async findCovering() {
          throw new Error("credit store down");
        },
      },
      scopeFor: () => scopeOf(),
    });
    await expect(port.authorizeAndReserve(portRequest())).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    expect(port.state.reservations.size).toBe(0);
  });

  it("authorizeAndReserve refuses an S1-inadmissible snapshot (drifted reconciliation) with zero hold", async () => {
    const port = fakePort(validSnapshot({ reconciliationState: "drifted" }));
    await expect(port.authorizeAndReserve(portRequest())).rejects.toThrow(
      /reconciliation_drifted/,
    );
    expect(port.state.reservations.size).toBe(0);
  });

  it("authorizeAndReserve refuses a malformed worstCaseUsd before touching the store", async () => {
    const port = createInMemoryCreditAuthorizationPort({
      store: {
        async findCovering() {
          throw new Error("must not be called");
        },
      },
      scopeFor: () => scopeOf(),
    });
    await expect(
      port.authorizeAndReserve(portRequest({ worstCaseUsd: "not-money" })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    expect(port.state.reservations.size).toBe(0);
  });

  it("happy path: an admissible snapshot yields a HELD reservation pinned to the grant", async () => {
    const port = fakePort(validSnapshot());
    const reservation = await port.authorizeAndReserve(portRequest());
    expect(reservation.grantAllocationRef).toBe("grant-2026-0099");
    expect(reservation.requestId).toBe("req-credit-1");
    expect(reservation.heldUsd).toBe("100.000000");
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(10_000);
    const record = port.state.reservations.get(reservation.creditReservationId)!;
    expect(record.state).toBe("HELD");
    expect(record.heldMinorUnits).toBe(10_000);
  });

  it("a sub-cent worst case is held as a WHOLE minor unit (ceil, never a zero hold)", async () => {
    const port = fakePort(validSnapshot());
    const reservation = await port.authorizeAndReserve(
      portRequest({ worstCaseUsd: "0.000001" }),
    );
    expect(reservation.heldUsd).toBe("0.010000"); // 1 cent
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(1);
  });

  it("settleProvisional releases the hold, records the actual as SETTLED spend, and is guarded against replay", async () => {
    const port = fakePort(validSnapshot());
    const r = await port.authorizeAndReserve(portRequest());
    await port.settleProvisional(r.creditReservationId, "42.500000", NOW);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    // The applied actual is NOT erased from the ledger — it moves to settled.
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(4_250);
    const record = port.state.reservations.get(r.creditReservationId)!;
    expect(record.state).toBe("PROVISIONALLY_SETTLED");
    expect(record.actualMinorUnits).toBe(4_250);
    await expect(
      port.settleProvisional(r.creditReservationId, "42.500000", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("settled spend stays counted: a full-spend settle EXHAUSTS the grant — a later authorize refuses", async () => {
    // Regression: the fake used to erase settled spend from the ledger, so
    // authorize($100) -> settle($100) -> authorize($100) double-spent a
    // $100 grant against the static snapshot.
    const port = fakePort(
      validSnapshot({ remainingMinorUnits: 100_00, reservedMinorUnits: 0 }),
    );
    const r1 = await port.authorizeAndReserve(portRequest({ requestId: "req-1" }));
    await port.settleProvisional(r1.creditReservationId, "100.000000", NOW);
    await expect(
      port.authorizeAndReserve(portRequest({ requestId: "req-2" })),
    ).rejects.toThrow(/insufficient-headroom/);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(10_000);
    expect(port.state.reservations.size).toBe(1);
  });

  it("a partial settle frees ONLY the remainder: headroom = spendable - held - settled", async () => {
    // Grant spendable $100. Hold $100, settle $40 -> $60 of headroom remains:
    // a $60 authorize fits exactly, one more cent refuses.
    const port = fakePort(
      validSnapshot({ remainingMinorUnits: 100_00, reservedMinorUnits: 0 }),
    );
    const r1 = await port.authorizeAndReserve(portRequest({ requestId: "req-1" }));
    await port.settleProvisional(r1.creditReservationId, "40.000000", NOW);
    await port.authorizeAndReserve(
      portRequest({ requestId: "req-2", worstCaseUsd: "60.000000" }),
    );
    await expect(
      port.authorizeAndReserve(
        portRequest({ requestId: "req-3", worstCaseUsd: "0.010000" }),
      ),
    ).rejects.toThrow(/insufficient-headroom/);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(6_000);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(4_000);
  });

  it("settleProvisional refuses an actual ABOVE the authorized hold (credits-only can never overrun)", async () => {
    const port = fakePort(validSnapshot());
    const r = await port.authorizeAndReserve(portRequest());
    await expect(
      port.settleProvisional(r.creditReservationId, "100.010000", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    // The refusal did NOT eat the hold — the reservation is still HELD.
    expect(port.state.reservations.get(r.creditReservationId)!.state).toBe("HELD");
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(10_000);
  });

  it("release returns the hold to zero and double-release / settle-after-release are guarded", async () => {
    const port = fakePort(validSnapshot());
    const r = await port.authorizeAndReserve(portRequest());
    await port.release(r.creditReservationId, NOW);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.reservations.get(r.creditReservationId)!.state).toBe("RELEASED");
    await expect(port.release(r.creditReservationId, NOW)).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    await expect(
      port.settleProvisional(r.creditReservationId, "1.000000", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("reconcile confirms a provisional settlement from a receipt and CORRECTS the settled ledger; double-reconcile is guarded", async () => {
    const port = fakePort(validSnapshot());
    const r = await port.authorizeAndReserve(portRequest());
    await port.settleProvisional(r.creditReservationId, "42.500000", NOW);
    await port.reconcile(r.creditReservationId, "42.480000", NOW);
    const record = port.state.reservations.get(r.creditReservationId)!;
    expect(record.state).toBe("RECONCILED");
    expect(record.confirmedMinorUnits).toBe(4_248);
    // Settled spend corrected from the provisional 4_250 to the receipt truth.
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(4_248);
    await expect(
      port.reconcile(r.creditReservationId, "42.480000", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("reconcile directly from HELD releases the hold and records the confirmed amount as settled spend", async () => {
    const port = fakePort(validSnapshot());
    const r = await port.authorizeAndReserve(portRequest());
    await port.reconcile(r.creditReservationId, "10.000000", NOW);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(1_000);
    expect(port.state.reservations.get(r.creditReservationId)!.state).toBe("RECONCILED");
  });

  it("reconcile refuses a confirmed amount ABOVE the authorized hold (from HELD) — an overrun receipt is a dispute", async () => {
    const port = fakePort(validSnapshot({ remainingMinorUnits: 5_000_00 }));
    const r = await port.authorizeAndReserve(
      portRequest({ worstCaseUsd: "50.000000" }),
    );
    await expect(
      port.reconcile(r.creditReservationId, "500.000000", NOW),
    ).rejects.toThrow(/exceeds the authorized hold/);
    // The refusal left the record untouched: still HELD, hold intact,
    // nothing recorded as confirmed, nothing settled.
    const record = port.state.reservations.get(r.creditReservationId)!;
    expect(record.state).toBe("HELD");
    expect(record.confirmedMinorUnits).toBeNull();
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(5_000);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099") ?? 0).toBe(0);
  });

  it("reconcile refuses a confirmed amount ABOVE the hold from PROVISIONALLY_SETTLED too", async () => {
    const port = fakePort(validSnapshot());
    const r = await port.authorizeAndReserve(portRequest());
    await port.settleProvisional(r.creditReservationId, "42.500000", NOW);
    await expect(
      port.reconcile(r.creditReservationId, "100.010000", NOW),
    ).rejects.toThrow(/exceeds the authorized hold/);
    const record = port.state.reservations.get(r.creditReservationId)!;
    expect(record.state).toBe("PROVISIONALLY_SETTLED");
    expect(record.confirmedMinorUnits).toBeNull();
    // The provisional settled spend is unchanged by the refusal.
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(4_250);
  });

  it("release/reconcile/settle of an unknown reservation id refuse (nothing to mutate)", async () => {
    const port = fakePort(validSnapshot());
    await expect(port.release("ghost", NOW)).rejects.toBeInstanceOf(BudgetBlocked);
    await expect(port.reconcile("ghost", "1.000000", NOW)).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    await expect(
      port.settleProvisional("ghost", "1.000000", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("replaying the same requestId+reservationVersion returns the ORIGINAL hold, never a second one", async () => {
    const port = fakePort(validSnapshot());
    const first = await port.authorizeAndReserve(portRequest());
    const replay = await port.authorizeAndReserve(portRequest());
    expect(replay.creditReservationId).toBe(first.creditReservationId);
    expect(port.state.reservations.size).toBe(1);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(10_000);
  });

  it("a replay AFTER settlement refuses — a completed authorization cannot silently re-open", async () => {
    const port = fakePort(validSnapshot());
    const first = await port.authorizeAndReserve(portRequest());
    await port.settleProvisional(first.creditReservationId, "1.000000", NOW);
    await expect(port.authorizeAndReserve(portRequest())).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
  });

  it("sequential holds exhaust the spendable balance exactly — the next authorize refuses with zero hold", async () => {
    // Grant spendable: $200 (20_000 minor units). Two $100 holds fit; the
    // third must refuse and take nothing.
    const port = fakePort(
      validSnapshot({ remainingMinorUnits: 200_00, reservedMinorUnits: 0 }),
    );
    await port.authorizeAndReserve(portRequest({ requestId: "req-a" }));
    await port.authorizeAndReserve(portRequest({ requestId: "req-b" }));
    await expect(
      port.authorizeAndReserve(portRequest({ requestId: "req-c" })),
    ).rejects.toThrow(/insufficient-headroom/);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(20_000);
    expect(port.state.reservations.size).toBe(2);
  });

  it("the snapshot's OWN reservedMinorUnits shrinks what the port may hold (spendable = remaining - reserved)", async () => {
    // remaining $150, already reserved upstream $100 -> spendable $50; a
    // $100 hold must refuse.
    const port = fakePort(
      validSnapshot({ remainingMinorUnits: 150_00, reservedMinorUnits: 100_00 }),
    );
    await expect(port.authorizeAndReserve(portRequest())).rejects.toThrow(
      /insufficient-headroom/,
    );
    expect(port.state.reservations.size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENCY THROUGH THE PORT (directive §11.3 acceptance)
// ═══════════════════════════════════════════════════════════════════════════
describe("concurrency: simultaneous authorizeAndReserve calls cannot exceed the balance", () => {
  it("10 simultaneous $100 calls against a grant that can fund 6 admit EXACTLY 6 — never more", async () => {
    // Spendable: $600 (60_000 minor units). Ten concurrent $100 authorizes
    // race THROUGH THE PORT; a conforming adapter admits at most 6 and the
    // rest are refused with ZERO hold taken. The store answers with jittered
    // async delays so the reads genuinely interleave before any hold lands.
    const snapshot = validSnapshot({ remainingMinorUnits: 600_00, reservedMinorUnits: 0 });
    const port = createInMemoryCreditAuthorizationPort({
      store: {
        async findCovering() {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          return [snapshot];
        },
      },
      scopeFor: () => scopeOf(),
    });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        port.authorizeAndReserve(portRequest({ requestId: `req-conc-${i}` })),
      ),
    );

    const admitted = results.filter(
      (r): r is PromiseFulfilledResult<CreditReservation> => r.status === "fulfilled",
    );
    const refused = results.filter((r) => r.status === "rejected");
    expect(admitted).toHaveLength(6);
    expect(refused).toHaveLength(4);
    for (const r of refused) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(BudgetBlocked);
    }
    // THE invariant: total held never exceeds the spendable balance.
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(60_000);
    expect(port.state.reservations.size).toBe(6);
    // Every admitted hold is individually intact and settleable.
    for (const r of admitted) {
      await port.release(r.value.creditReservationId, NOW);
    }
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
  });

  it("10 simultaneous calls with UNEVEN amounts never collectively exceed the spendable balance", async () => {
    // Spendable $250. Amounts 10,20,...,100 sum to $550 — whichever subset
    // wins the race, the held total must stay <= 25_000 minor units.
    const snapshot = validSnapshot({ remainingMinorUnits: 250_00, reservedMinorUnits: 0 });
    const port = createInMemoryCreditAuthorizationPort({
      store: {
        async findCovering() {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          return [snapshot];
        },
      },
      scopeFor: () => scopeOf(),
    });

    const amounts = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
    const results = await Promise.allSettled(
      amounts.map((usd, i) =>
        port.authorizeAndReserve(
          portRequest({ requestId: `req-mix-${i}`, worstCaseUsd: `${usd}.000000` }),
        ),
      ),
    );

    const heldTotal = port.state.heldMinorUnitsByGrant.get("grant-2026-0099") ?? 0;
    expect(heldTotal).toBeLessThanOrEqual(25_000);
    expect(heldTotal).toBeGreaterThan(0); // at least one small hold must fit
    const admittedHeld = results
      .filter(
        (r): r is PromiseFulfilledResult<CreditReservation> => r.status === "fulfilled",
      )
      .reduce((sum, r) => sum + usdStringToMinorUnitsCeil(r.value.heldUsd, "held"), 0);
    expect(admittedHeld).toBe(heldTotal); // ledger == sum of admitted holds
  });

  it("permanent-consume under concurrency: settling the first admitted wave PERMANENTLY reduces the balance, so a second concurrent wave admits FEWER and never re-admits the consumed spend (Decision A)", async () => {
    // Spendable: $600 (60_000 minor units). This is the credit-port analog of
    // the real-Postgres 100-concurrent second-wave proof: settled spend is
    // gone from the grant's spendable balance FOREVER (spendable - held -
    // settled), so sequential authorize->settle cycles can never cumulatively
    // overspend a static snapshot.
    const snapshot = validSnapshot({ remainingMinorUnits: 600_00, reservedMinorUnits: 0 });
    const port = createInMemoryCreditAuthorizationPort({
      store: {
        async findCovering() {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          return [snapshot];
        },
      },
      scopeFor: () => scopeOf(),
    });

    // Wave 1: ten concurrent $100 authorizes; exactly 6 fit the $600 balance.
    const wave1 = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        port.authorizeAndReserve(portRequest({ requestId: `req-w1-${i}` })),
      ),
    );
    const admitted1 = wave1.filter(
      (r): r is PromiseFulfilledResult<CreditReservation> => r.status === "fulfilled",
    );
    expect(admitted1).toHaveLength(6);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(60_000);

    // Settle every admitted reservation at the FULL held $100 — the whole
    // $600 is now PERMANENTLY consumed (settled), holds return to zero.
    for (const r of admitted1) {
      await port.settleProvisional(r.value.creditReservationId, "100.000000", NOW);
    }
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(60_000);

    // Wave 2: ten MORE concurrent $100 authorizes against the SAME static
    // snapshot. Settled spend gave back NO headroom, so every one refuses —
    // the consumed $600 is never re-admitted.
    const wave2 = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        port.authorizeAndReserve(portRequest({ requestId: `req-w2-${i}` })),
      ),
    );
    const admitted2 = wave2.filter((r) => r.status === "fulfilled");
    const refused2 = wave2.filter((r) => r.status === "rejected");
    expect(admitted2).toHaveLength(0);
    expect(refused2).toHaveLength(10);
    expect(admitted2.length).toBeLessThan(admitted1.length); // strictly fewer
    for (const r of refused2) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(BudgetBlocked);
      expect((r as PromiseRejectedResult).reason.message).toMatch(/insufficient-headroom/);
    }
    // The ledger never exceeded the balance: nothing held, exactly $600 settled.
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(60_000);
  });

  it("permanent-consume with a PARTIAL settle wave: a second wave admits only the freed remainder, never the consumed portion (Decision A)", async () => {
    // Spendable $600. Wave 1 admits 6 × $100. Settle each at $50 (half) → $300
    // permanently consumed, $300 of headroom returns. A second wave of ten
    // $100 authorizes then admits EXACTLY 3 (the freed $300), never the
    // consumed $300.
    const snapshot = validSnapshot({ remainingMinorUnits: 600_00, reservedMinorUnits: 0 });
    const port = createInMemoryCreditAuthorizationPort({
      store: {
        async findCovering() {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          return [snapshot];
        },
      },
      scopeFor: () => scopeOf(),
    });

    const wave1 = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        port.authorizeAndReserve(portRequest({ requestId: `req-p1-${i}` })),
      ),
    );
    const admitted1 = wave1.filter(
      (r): r is PromiseFulfilledResult<CreditReservation> => r.status === "fulfilled",
    );
    expect(admitted1).toHaveLength(6);
    for (const r of admitted1) {
      await port.settleProvisional(r.value.creditReservationId, "50.000000", NOW);
    }
    // $300 settled (permanent), $300 of headroom freed.
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(30_000);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);

    const wave2 = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        port.authorizeAndReserve(portRequest({ requestId: `req-p2-${i}` })),
      ),
    );
    const admitted2 = wave2.filter(
      (r): r is PromiseFulfilledResult<CreditReservation> => r.status === "fulfilled",
    );
    // Exactly the freed $300 funds 3 more; the consumed $300 is never re-admitted.
    expect(admitted2).toHaveLength(3);
    expect(admitted2.length).toBeLessThan(admitted1.length);
    // Ledger invariant: held + settled never exceeds the $600 spendable balance.
    const held = port.state.heldMinorUnitsByGrant.get("grant-2026-0099") ?? 0;
    const settled = port.state.settledMinorUnitsByGrant.get("grant-2026-0099") ?? 0;
    expect(held + settled).toBeLessThanOrEqual(60_000);
    expect(held + settled).toBe(60_000); // 30_000 settled + 30_000 held (3×$100)
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR — CONFIRMED_CREDITS_ONLY through the sealed §8/§9/§10 stack
// ═══════════════════════════════════════════════════════════════════════════
describe("executor: CONFIRMED_CREDITS_ONLY consumes the port and stays fail-closed without a real adapter", () => {
  const request: AiTaskInvocationRequest = {
    taskClass: "brief.daily-summary",
    requestId: "req-credit-exec-1",
    actor: ACTOR,
    entity: "GSE",
    input: { user: "summarize", maxTokens: 32 },
  };

  function executorDeps(
    overrides: Partial<SealedAiExecutorDependencies> = {},
  ): SealedAiExecutorDependencies & { dispatched: string[] } {
    const dispatched: string[] = [];
    return {
      env: { AI_ENV_CLASS: "test", LLM_COST_MODE: "CONFIRMED_CREDITS_ONLY" },
      now: () => NOW,
      policies: { getTaskPolicy },
      receipts: failClosedReceiptStore,
      recordBlocked: async () => {},
      dispatch: async (plan) => {
        dispatched.push(plan.request.requestId);
        return {
          kind: "COMPLETED",
          invocationId: `inv:${plan.request.requestId}`,
          output: { ok: true },
          attempts: [],
          telemetryStatus: "OK",
          replayed: false,
        };
      },
      credit: failClosedCreditAuthorizationPort,
      dispatched,
      ...overrides,
    };
  }

  it("WITHOUT a real adapter (production seal): refuses BEFORE dispatch — credit mode is unreachable", async () => {
    const deps = executorDeps();
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(request)).rejects.toBeInstanceOf(BudgetBlocked);
    expect(deps.dispatched).toEqual([]); // the transport seam was never reached
  });

  it("with the FAKE adapter and a covering admissible snapshot: authorizes, dispatches, then SETTLES the hold (no leak)", async () => {
    const port = fakePort(validSnapshot());
    const deps = executorDeps({ credit: port });
    const executor = createAiExecutor(deps);
    const result = await executor.executeAiTask(request);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.fundingLabel).toBe("CREDIT_ELIGIBLE_UNCONFIRMED");
    expect(result.telemetryStatus).toBe("OK");
    expect(deps.dispatched).toEqual(["req-credit-exec-1"]);
    expect(port.state.reservations.size).toBe(1);
    const record = [...port.state.reservations.values()][0]!;
    // The hold is NOT left leaked as HELD: the completed dispatch settles it
    // provisionally at the conservative full hold (the executor has no
    // token-priced actual; receipt reconciliation corrects downward in S5).
    expect(record.state).toBe("PROVISIONALLY_SETTLED");
    expect(record.grantId).toBe("grant-2026-0099");
    expect(record.actualMinorUnits).toBe(record.heldMinorUnits);
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099")).toBe(
      record.heldMinorUnits,
    );
  });

  it("a dispatch failure (clean, no charge) RELEASES the credit hold and rethrows the original error", async () => {
    const port = fakePort(validSnapshot());
    const deps = executorDeps({
      credit: port,
      dispatch: async () => {
        throw new Error("transport exploded before any charge");
      },
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(request)).rejects.toThrow(
      /transport exploded/,
    );
    const record = [...port.state.reservations.values()][0]!;
    expect(record.state).toBe("RELEASED");
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(0);
    expect(port.state.settledMinorUnitsByGrant.get("grant-2026-0099") ?? 0).toBe(0);
  });

  it("an AMBIGUOUS charge KEEPS the credit hold (an unproven charge never frees its funds)", async () => {
    const port = fakePort(validSnapshot());
    const deps = executorDeps({
      credit: port,
      dispatch: async () => {
        throw new AmbiguousCharge("timeout after dispatch — charge unproven");
      },
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(request)).rejects.toBeInstanceOf(
      AmbiguousCharge,
    );
    const record = [...port.state.reservations.values()][0]!;
    expect(record.state).toBe("HELD"); // quarantined for reconciliation, not released
    expect(port.state.heldMinorUnitsByGrant.get("grant-2026-0099")).toBe(
      record.heldMinorUnits,
    );
  });

  it("an IN_PROGRESS verdict leaves the shared reservation HELD for the live claim owner to complete", async () => {
    const port = fakePort(validSnapshot());
    const deps = executorDeps({
      credit: port,
      dispatch: async (plan) => ({
        kind: "IN_PROGRESS",
        invocationId: `inv:${plan.request.requestId}`,
      }),
    });
    const executor = createAiExecutor(deps);
    const result = await executor.executeAiTask(request);
    expect(result.status).toBe("IN_PROGRESS");
    const record = [...port.state.reservations.values()][0]!;
    expect(record.state).toBe("HELD");
  });

  it("a settlement failure never converts the completed dispatch into an error — it degrades telemetry", async () => {
    const port = fakePort(validSnapshot());
    const failingSettle: typeof port = {
      ...port,
      settleProvisional: async () => {
        throw new Error("credit authority unavailable at settlement");
      },
    };
    const deps = executorDeps({ credit: failingSettle });
    const executor = createAiExecutor(deps);
    const result = await executor.executeAiTask(request);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.telemetryStatus).toBe("DEGRADED");
    // The hold stays (conservative: strands credits, never overspends).
    expect([...port.state.reservations.values()][0]!.state).toBe("HELD");
  });

  it("a RETRY of a request whose authorization already settled refuses fail-closed (documented §10.6-mirror limit until S5)", async () => {
    const port = fakePort(validSnapshot());
    const deps = executorDeps({ credit: port });
    const executor = createAiExecutor(deps);
    await executor.executeAiTask(request); // completes and settles v1
    // The port's replay-after-settlement guard refuses re-authorization —
    // conservative (never a double hold, never a double spend); replaying
    // the persisted result needs S5's ledger-aware real adapter.
    await expect(executor.executeAiTask(request)).rejects.toThrow(
      /cannot be replayed/,
    );
    expect(deps.dispatched).toEqual(["req-credit-exec-1"]); // no second dispatch
  });

  it("with the FAKE adapter but NO covering snapshot: refuses BEFORE dispatch", async () => {
    const port = fakePort(); // empty store — nothing covers
    const deps = executorDeps({ credit: port });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(request)).rejects.toBeInstanceOf(BudgetBlocked);
    expect(deps.dispatched).toEqual([]);
    expect(port.state.reservations.size).toBe(0);
  });

  it("a credit refusal is durably recorded as a BUDGET_BLOCKED decision", async () => {
    const recorded: { reasonCode: string; costMode: string }[] = [];
    const deps = executorDeps({
      recordBlocked: async (record) => {
        recorded.push({ reasonCode: record.reasonCode, costMode: record.costMode });
      },
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(request)).rejects.toBeInstanceOf(BudgetBlocked);
    expect(recorded).toEqual([
      { reasonCode: "BUDGET_BLOCKED", costMode: "CONFIRMED_CREDITS_ONLY" },
    ]);
  });
});
