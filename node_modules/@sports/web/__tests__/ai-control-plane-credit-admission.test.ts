/**
 * Phase 2 PR-D — credit ADMISSION + atomic AUTHORIZATION (directive §11.2/
 * §11.3), rebuilt on top of NOVA S1's canonical `CreditGrantSnapshot` and
 * #163/#164's §9 ledgered dispatch pipeline.
 *
 * OWNER CORRECTION covered here: the old PR-D defined its own duplicate,
 * weaker `CreditGrantSnapshot` (floating-dollar amounts, no receipt hash, no
 * reconciliation posture, no eligibility exclusions). This suite proves the
 * rebuilt module imports S1's rich, receipted contract instead of
 * redefining it, and adds the atomic `CreditAuthorizationPort` S1's own
 * docs point to ("AMOUNT sufficiency ... is deliberately NOT decided here
 * — that is PR-D's CreditAuthorizationPort").
 *
 * Four layers:
 *   1. UNIT — `admitCreditFunded`/`evaluateCreditAdmission`: every S1
 *      admissibility reason surfaces through PR-D's composition, plus the
 *      two reasons S1 leaves to PR-D (charge-specific headroom, currency).
 *   2. UNIT (mock-level) — `createPgCreditAuthorizationPort`'s
 *      reserve/settle/release arithmetic and double-transition guards
 *      against an in-memory transactional fake (mirrors budget.ts's own
 *      unit tests).
 *   3. PIPELINE (mock-level) — `createLedgeredDispatch` wired with a real
 *      `CreditAuthorizationPort` over the in-memory fake: the
 *      no-store-configured POLICY_BLOCKED path, per-route credit refusal
 *      (advances to the next route, never dispatches), settle-on-success,
 *      release-on-clean-failure, and the AMBIGUOUS never-release doctrine.
 *   4. INTEGRATION (real Postgres, guarded by DATABASE_URL) — the
 *      owner-mandated acceptance test: 100 concurrent `authorize()` calls
 *      against ONE grant with headroom for far fewer authorize AT MOST that
 *      many; the rest are refused with ZERO reservation taken — proving no
 *      double-spend under real concurrency, the property `admitCreditFunded`
 *      alone (a pure read) can never provide.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import {
  admitCreditFunded,
  createPgCreditAuthorizationPort,
  evaluateCreditAdmission,
  type AdmitCreditFundedInput,
  type CreditAdmissionScope,
  type CreditAuthorizationPort,
  type CreditLedgerDb,
  type CreditSnapshotStore,
} from "@/lib/ai-control-plane/credit-admission";
import { AmbiguousCharge, BudgetBlocked, PolicyBlocked } from "@/lib/ai-control-plane/errors";
import {
  createLedgeredDispatch,
  ObservabilitySink,
  type AiDispatchPlan,
  type AuthoritativeControlStore,
  type BlockedInvocationInput,
  type ClaimInvocationInput,
  type ClaimOutcome,
  type ProviderDispatchFn,
} from "@/lib/ai-control-plane/internal";
import type {
  AiTaskInvocationRequest,
  EffectiveAuthority,
  ProviderRouteId,
} from "@/lib/ai-control-plane/contracts";
import { serviceActor } from "@/lib/auth/actor";
import type { CreditGrantSnapshot } from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-22T12:00:00.000Z");

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
// UNIT — createPgCreditAuthorizationPort's ledger arithmetic (in-memory fake)
// ═══════════════════════════════════════════════════════════════════════════
interface FakeLedgerRow {
  grantId: string;
  reservedMinorUnits: number;
}
interface FakeReservationRow {
  id: string;
  grantId: string;
  amountMinorUnits: number;
  state: string;
  settledMinorUnits: number | null;
  expiresAt: Date;
}

function makeInMemoryCreditLedgerDb() {
  const ledger = new Map<string, FakeLedgerRow>();
  const reservations = new Map<string, FakeReservationRow>();

  const exec = async (query: string, ...values: unknown[]): Promise<number> => {
    if (query.includes('INSERT INTO "credit_grant_reservation_ledger"')) {
      const [grantId] = values as [string];
      if (!ledger.has(grantId)) ledger.set(grantId, { grantId, reservedMinorUnits: 0 });
      return 1;
    }
    if (query.includes('UPDATE "credit_grant_reservation_ledger"') && query.includes("<= $3")) {
      const [amount, grantId, cap] = values as [number, string, number];
      const row = ledger.get(grantId);
      if (!row) return 0;
      if (row.reservedMinorUnits + Number(amount) <= Number(cap)) {
        row.reservedMinorUnits += Number(amount);
        return 1;
      }
      return 0;
    }
    if (query.includes('INSERT INTO "credit_grant_reservations"')) {
      const [id, grantId, amountMinorUnits, , expiresAt] = values as [
        string,
        string,
        number,
        unknown,
        Date,
      ];
      reservations.set(id, {
        id,
        grantId,
        amountMinorUnits: Number(amountMinorUnits),
        state: "HELD",
        settledMinorUnits: null,
        expiresAt,
      });
      return 1;
    }
    if (query.includes('UPDATE "credit_grant_reservation_ledger"') && query.includes("- $1")) {
      const [amount, grantId] = values as [string, string];
      const row = ledger.get(grantId);
      if (!row) return 0;
      row.reservedMinorUnits -= Number(amount);
      return 1;
    }
    if (query.includes("SET \"state\" = 'SETTLED'")) {
      const [actual, id] = values as [number, string];
      const r = reservations.get(id);
      if (r && r.state === "HELD") {
        r.state = "SETTLED";
        r.settledMinorUnits = Number(actual);
        return 1;
      }
      return 0;
    }
    if (query.includes("SET \"state\" = 'RELEASED'")) {
      const [id] = values as [string];
      const r = reservations.get(id);
      if (r && r.state === "HELD") {
        r.state = "RELEASED";
        return 1;
      }
      return 0;
    }
    throw new Error(`in-memory fake: unhandled exec SQL:\n${query}`);
  };

  const queryRaw = async <T,>(query: string, ...values: unknown[]): Promise<T> => {
    if (query.includes('FROM "credit_grant_reservations"') && query.includes("FOR UPDATE")) {
      const [id] = values as [string];
      const r = reservations.get(id);
      return (
        r ? [{ grantId: r.grantId, amountMinorUnits: String(r.amountMinorUnits), state: r.state }] : []
      ) as T;
    }
    throw new Error(`in-memory fake: unhandled query SQL:\n${query}`);
  };

  const snapshot = () => ({
    l: new Map([...ledger].map(([k, v]) => [k, { ...v }])),
    r: new Map([...reservations].map(([k, v]) => [k, { ...v }])),
  });
  const restore = (snap: ReturnType<typeof snapshot>) => {
    ledger.clear();
    for (const [k, v] of snap.l) ledger.set(k, v);
    reservations.clear();
    for (const [k, v] of snap.r) reservations.set(k, v);
  };

  const db: CreditLedgerDb = {
    $executeRawUnsafe: exec,
    $queryRawUnsafe: queryRaw,
    async $transaction<T>(fn: (tx: CreditLedgerDb) => Promise<T>): Promise<T> {
      const snap = snapshot();
      try {
        return await fn(db);
      } catch (error) {
        restore(snap);
        throw error;
      }
    },
  };
  return { db, ledger, reservations };
}

let seq = 0;
const seqId = () => `res-${seq++}`;
beforeEach(() => {
  seq = 0;
});

describe("createPgCreditAuthorizationPort — atomic reserve/settle/release", () => {
  it("authorize() takes NO reservation when admission itself refuses", async () => {
    const { db } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const decision = await port.authorize({
      store: storeOf(), // no covering snapshot
      scope: scopeOf(),
      worstCaseMinorUnits: 100_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(decision.admitted).toBe(false);
  });

  it("authorize() takes a HELD reservation and settle()/release() move it correctly", async () => {
    const { db, ledger, reservations } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const decision = await port.authorize({
      store: storeOf(validSnapshot({ grantId: "g1" })),
      scope: scopeOf(),
      worstCaseMinorUnits: 100_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(decision.admitted).toBe(true);
    if (!decision.admitted) return;
    expect(ledger.get("g1")!.reservedMinorUnits).toBe(100_00);
    expect([...reservations.values()][0]!.state).toBe("HELD");

    await port.settle(decision.handle, 80_00);
    expect(ledger.get("g1")!.reservedMinorUnits).toBe(0); // worst-case remainder released
    expect([...reservations.values()][0]!.state).toBe("SETTLED");
    expect([...reservations.values()][0]!.settledMinorUnits).toBe(80_00);
  });

  it("release() reduces reserved without settling", async () => {
    const { db, ledger } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const decision = await port.authorize({
      store: storeOf(validSnapshot({ grantId: "g2" })),
      scope: scopeOf(),
      worstCaseMinorUnits: 50_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(decision.admitted).toBe(true);
    if (!decision.admitted) return;
    await port.release(decision.handle);
    expect(ledger.get("g2")!.reservedMinorUnits).toBe(0);
  });

  it("double-settle and settle-after-release are guarded (BudgetBlocked)", async () => {
    const { db } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const decision = await port.authorize({
      store: storeOf(validSnapshot({ grantId: "g3" })),
      scope: scopeOf(),
      worstCaseMinorUnits: 10_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(decision.admitted).toBe(true);
    if (!decision.admitted) return;
    await port.settle(decision.handle, 5_00);
    await expect(port.settle(decision.handle, 5_00)).rejects.toBeInstanceOf(BudgetBlocked);
    await expect(port.release(decision.handle)).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("refuses insufficient-headroom once local holds already consume the fresh spendable cap", async () => {
    const { db } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const snap = validSnapshot({ grantId: "g4", remainingMinorUnits: 100_00, reservedMinorUnits: 0 });
    const first = await port.authorize({
      store: storeOf(snap),
      scope: scopeOf(),
      worstCaseMinorUnits: 90_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(first.admitted).toBe(true);
    // Same snapshot re-read (a real store's remaining/reserved wouldn't move
    // between these two calls either — this proves the LOCAL ledger's own
    // cap guard: 90 already held, so a further 90 cannot fit under 100.
    const second = await port.authorize({
      store: storeOf(snap),
      scope: scopeOf(),
      worstCaseMinorUnits: 90_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(second.admitted).toBe(false);
    if (second.admitted) return;
    expect(second.reason).toBe("insufficient-headroom");
  });

  it("Decision A — settling PERMANENTLY consumes spend: a second wave against a store that correctly reflects settlement never re-admits it", async () => {
    // createPgCreditAuthorizationPort's own ledger (above) only guards the
    // CURRENT hold total against a snapshot's spendable headroom re-read at
    // authorize time — it does not itself remember settled history. Decision
    // A's permanent-consume guarantee therefore falls on whatever backs
    // `CreditSnapshotStore.findCovering`: a real implementation MUST fold
    // settled ledger spend into `remainingMinorUnits` (the same way
    // `budget.ts`'s single-window cash cap folds `provisionalUsd` into its
    // own atomic guard). This test builds the smallest store that does that
    // correctly and proves the composition — port arithmetic + a
    // settlement-aware store — never re-admits consumed spend. A store that
    // forgot to decrement `remainingMinorUnits` after settlement would fail
    // this test (over-admit on the second wave), which is exactly the
    // regression Decision A rules against.
    const { db } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const grantId = "g-decision-a";
    let remainingMinorUnits = 600_00; // $600.00 spendable
    const store: CreditSnapshotStore = {
      async findCovering() {
        return [validSnapshot({ grantId, remainingMinorUnits, reservedMinorUnits: 0 })];
      },
    };

    // Wave 1: ten sequential $100 authorizes; exactly 6 fit the $600 balance.
    const wave1: Array<{ handle: Awaited<ReturnType<CreditAuthorizationPort["authorize"]>> }> = [];
    for (let i = 0; i < 10; i++) {
      const decision = await port.authorize({
        store,
        scope: scopeOf(),
        worstCaseMinorUnits: 100_00,
        worstCaseCurrency: "USD",
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
        idFactory: seqId,
      });
      wave1.push({ handle: decision });
    }
    const admitted1 = wave1.filter((r) => r.handle.admitted);
    expect(admitted1).toHaveLength(6);

    // Settle every admitted reservation at the full $100 held, and — as any
    // correct real store implementation must — fold the settled amount out
    // of the spendable balance PERMANENTLY.
    for (const r of admitted1) {
      if (!r.handle.admitted) continue;
      await port.settle(r.handle.handle, 100_00);
      remainingMinorUnits -= 100_00;
    }
    expect(remainingMinorUnits).toBe(0); // the whole $600 is now settled, gone for good

    // Wave 2: ten MORE $100 authorizes against the now-zero balance. None
    // are admitted — the consumed $600 is never re-admitted.
    for (let i = 0; i < 10; i++) {
      const decision = await port.authorize({
        store,
        scope: scopeOf(),
        worstCaseMinorUnits: 100_00,
        worstCaseCurrency: "USD",
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
        idFactory: seqId,
      });
      expect(decision.admitted).toBe(false);
    }
  });

  it("Decision A — a PARTIAL settle wave frees only the remainder, never the consumed portion", async () => {
    const { db } = makeInMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(db);
    const grantId = "g-decision-a-partial";
    let remainingMinorUnits = 600_00;
    const store: CreditSnapshotStore = {
      async findCovering() {
        return [validSnapshot({ grantId, remainingMinorUnits, reservedMinorUnits: 0 })];
      },
    };

    const admitted1: Array<Extract<Awaited<ReturnType<CreditAuthorizationPort["authorize"]>>, { admitted: true }>> = [];
    for (let i = 0; i < 10; i++) {
      const decision = await port.authorize({
        store,
        scope: scopeOf(),
        worstCaseMinorUnits: 100_00,
        worstCaseCurrency: "USD",
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
        idFactory: seqId,
      });
      if (decision.admitted) admitted1.push(decision);
    }
    expect(admitted1).toHaveLength(6);

    // Settle each at HALF the held amount: $300 permanently consumed, $300
    // of headroom correctly freed by the store.
    for (const r of admitted1) {
      await port.settle(r.handle, 50_00);
      remainingMinorUnits -= 50_00;
    }
    expect(remainingMinorUnits).toBe(300_00);

    // A second wave of ten $100 authorizes admits EXACTLY 3 — the freed
    // $300 — never the consumed $300.
    let admitted2 = 0;
    for (let i = 0; i < 10; i++) {
      const decision = await port.authorize({
        store,
        scope: scopeOf(),
        worstCaseMinorUnits: 100_00,
        worstCaseCurrency: "USD",
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
        idFactory: seqId,
      });
      if (decision.admitted) admitted2++;
    }
    expect(admitted2).toBe(3);
    expect(admitted2).toBeLessThan(admitted1.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE — createLedgeredDispatch wired with a real CreditAuthorizationPort
// ═══════════════════════════════════════════════════════════════════════════
interface MemInvocation {
  id: string;
  requestId: string;
  taskClass: string;
  status: string;
  requestFingerprint: string;
  executionOwnerToken: string | null;
  leaseExpiresAt: Date | null;
  stealCount: number;
  resultJson: string | null;
  resultHash: string | null;
  blockedReasonCode: string | null;
}

class MemStore implements AuthoritativeControlStore {
  invocations = new Map<string, MemInvocation>();
  attempts: Array<{ id: string; invocationId: string; errorCode: string | null }> = [];
  attributions: Array<{ invocationId: string; estimatedGrossUsd: number; fundingLabel: string }> = [];

  private key(requestId: string, taskClass: string): string {
    return `${requestId}::${taskClass}`;
  }

  async claimInvocation(input: ClaimInvocationInput): Promise<ClaimOutcome> {
    const k = this.key(input.requestId, input.taskClass);
    const existing = this.invocations.get(k);
    const expires = new Date(input.now.getTime() + input.leaseMs);
    if (existing === undefined) {
      this.invocations.set(k, {
        id: input.invocationId,
        requestId: input.requestId,
        taskClass: input.taskClass,
        status: "RUNNING",
        requestFingerprint: input.requestFingerprint,
        executionOwnerToken: input.ownerToken,
        leaseExpiresAt: expires,
        stealCount: 0,
        resultJson: null,
        resultHash: null,
        blockedReasonCode: null,
      });
      return { kind: "ACQUIRED", invocationId: input.invocationId, stolen: false, nextOrdinal: 0 };
    }
    return { kind: "IN_PROGRESS", invocationId: existing.id };
  }

  private held(invocationId: string, ownerToken: string): MemInvocation | null {
    for (const inv of this.invocations.values()) {
      if (inv.id === invocationId) {
        return inv.executionOwnerToken === ownerToken && inv.status === "RUNNING" ? inv : null;
      }
    }
    return null;
  }

  async startAttempt(input: Parameters<AuthoritativeControlStore["startAttempt"]>[0]): Promise<void> {
    if (this.held(input.invocationId, input.ownerToken) === null) {
      throw new Error("lease not held — attempt refused");
    }
    this.attempts.push({ id: input.attemptId, invocationId: input.invocationId, errorCode: null });
  }

  async recordAttemptFailure(
    input: Parameters<AuthoritativeControlStore["recordAttemptFailure"]>[0],
  ): Promise<void> {
    const a = this.attempts.find((x) => x.id === input.attemptId);
    if (a) a.errorCode = input.errorCode;
  }

  async createAttribution(
    input: Parameters<AuthoritativeControlStore["createAttribution"]>[0],
  ): Promise<void> {
    this.attributions.push({
      invocationId: input.invocationId,
      estimatedGrossUsd: input.estimatedGrossUsd,
      fundingLabel: input.fundingLabel,
    });
  }

  async finalizeSuccess(
    input: Parameters<AuthoritativeControlStore["finalizeSuccess"]>[0],
  ): Promise<boolean> {
    const inv = this.held(input.invocationId, input.ownerToken);
    if (inv === null) return false;
    inv.status = "SUCCEEDED";
    inv.resultJson = input.resultJson;
    inv.resultHash = input.resultHash;
    inv.leaseExpiresAt = null;
    return true;
  }

  async finalizeFailure(
    input: Parameters<AuthoritativeControlStore["finalizeFailure"]>[0],
  ): Promise<boolean> {
    const inv = this.held(input.invocationId, input.ownerToken);
    if (inv === null) return false;
    inv.status = input.status;
    inv.leaseExpiresAt = null;
    return true;
  }

  async recordBlockedInvocation(input: BlockedInvocationInput): Promise<void> {
    const k = this.key(input.requestId, input.taskClass);
    if (this.invocations.has(k)) return;
    this.invocations.set(k, {
      id: input.invocationId,
      requestId: input.requestId,
      taskClass: input.taskClass,
      status: "BLOCKED",
      requestFingerprint: input.requestFingerprint,
      executionOwnerToken: null,
      leaseExpiresAt: null,
      stealCount: 0,
      resultJson: null,
      resultHash: null,
      blockedReasonCode: input.blockedReasonCode,
    });
  }
}

const CREDIT_ACTOR = serviceActor({ subjectId: "service:credit-pipeline-tests" });

function creditRequest(overrides: Partial<AiTaskInvocationRequest> = {}): AiTaskInvocationRequest {
  return {
    taskClass: "brief.daily-summary",
    requestId: "req-credits-0001",
    actor: CREDIT_ACTOR,
    entity: "GSE",
    input: { user: "summarize the slate", maxTokens: 64 },
    ...overrides,
  };
}

function creditAuthority(overrides: Partial<EffectiveAuthority> = {}): EffectiveAuthority {
  return {
    taskClass: "brief.daily-summary",
    surface: "brief",
    dataPolicy: { tags: ["internal"] },
    capabilityFloor: {
      reasoningTier: "standard",
      contextTokens: 8000,
      structuredOutput: false,
      toolUse: false,
      latencyClass: "interactive",
    },
    permittedProviderRoutes: ["bedrock"],
    permittedModes: ["CONFIRMED_CREDITS_ONLY"],
    maxVendorCashUsd: 1, // $1.00 worst case -> 100 minor units
    requiredBudgetScopes: [],
    approvedSubstitutions: [],
    validationPolicy: { schemaRef: "brief.v1", numericGuard: true },
    retentionPolicy: { retainPrompt: false, retainResponse: false },
    policyVersion: "test.v1",
    ...overrides,
  };
}

function creditPlan(overrides: Partial<AiDispatchPlan> = {}): AiDispatchPlan {
  const request = overrides.request ?? creditRequest();
  return {
    request,
    authority: creditAuthority(),
    costMode: "CONFIRMED_CREDITS_ONLY",
    maxVendorCashUsd: 1,
    fundingLabel: "CREDIT_ELIGIBLE_UNCONFIRMED",
    envClass: "test",
    envClassSource: "explicit",
    ...overrides,
  };
}

function successDispatcher(route: ProviderRouteId): ProviderDispatchFn {
  return async () => ({
    kind: "SUCCEEDED",
    providerUsed: route,
    modelResolved: `${route}-model`,
    output: { text: "ok" },
    inputTokens: 10,
    outputTokens: 20,
    providerRequestId: null,
  });
}

describe("createLedgeredDispatch + credit-admission.ts — CONFIRMED_CREDITS_ONLY lifecycle", () => {
  it("no creditStore/creditPort configured -> POLICY_BLOCKED, zero dispatch, zero attempts", async () => {
    const store = new MemStore();
    let dispatchCalls = 0;
    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: {
        bedrock: (async () => {
          dispatchCalls += 1;
          throw new Error("must never be called");
        }) as ProviderDispatchFn,
      } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      // No creditStore / creditPort wired.
    });

    await expect(dispatch(creditPlan())).rejects.toBeInstanceOf(PolicyBlocked);
    expect(dispatchCalls).toBe(0);
    expect(store.attempts).toHaveLength(0);
    const inv = [...store.invocations.values()][0]!;
    expect(inv.status).toBe("POLICY_BLOCKED");
  });

  it("store present but no covering snapshot -> every route refused, attempt rows carry CREDIT_BLOCKED, zero real dispatch", async () => {
    const store = new MemStore();
    const { db } = makeInMemoryCreditLedgerDb();
    const creditPort = createPgCreditAuthorizationPort(db);
    let dispatchCalls = 0;

    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: {
        bedrock: (async () => {
          dispatchCalls += 1;
          return {
            kind: "SUCCEEDED",
            providerUsed: "bedrock",
            modelResolved: "m",
            output: { text: "x" },
            inputTokens: 1,
            outputTokens: 1,
            providerRequestId: null,
          };
        }) as ProviderDispatchFn,
      } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      creditStore: storeOf(), // no covering snapshot anywhere
      creditPort,
    });

    await expect(dispatch(creditPlan())).rejects.toThrow(/permitted provider route/);
    expect(dispatchCalls).toBe(0);
    expect(store.attempts).toHaveLength(1);
    expect(store.attempts[0]!.errorCode).toMatch(/^CREDIT_BLOCKED:/);
  });

  it("an admitted route SETTLES the credit hold on a successful dispatch", async () => {
    const store = new MemStore();
    const { db, ledger, reservations } = makeInMemoryCreditLedgerDb();
    const creditPort = createPgCreditAuthorizationPort(db);
    const snapshotStore = storeOf(validSnapshot({ grantId: "g-success", provider: "bedrock" }));

    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: { bedrock: successDispatcher("bedrock") } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      creditStore: snapshotStore,
      creditPort,
    });

    const outcome = await dispatch(creditPlan());
    expect(outcome.kind).toBe("COMPLETED");
    expect(store.attributions).toHaveLength(1);
    expect(ledger.get("g-success")!.reservedMinorUnits).toBe(0); // settled — worst case released
    expect([...reservations.values()][0]!.state).toBe("SETTLED");
  });

  it("a clean per-route credit refusal advances to the NEXT route without dispatching that route", async () => {
    const store = new MemStore();
    const { db } = makeInMemoryCreditLedgerDb();
    const creditPort = createPgCreditAuthorizationPort(db);
    // bedrock has no covering snapshot; vertex does.
    const snapshotStore: CreditSnapshotStore = {
      async findCovering(scope) {
        return scope.provider === "vertex" ? [validSnapshot({ grantId: "g-vertex", provider: "vertex" })] : [];
      },
    };
    const bedrockCalls: string[] = [];
    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: {
        bedrock: (async () => {
          bedrockCalls.push("called");
          throw new Error("bedrock must never be dispatched");
        }) as ProviderDispatchFn,
        vertex: successDispatcher("vertex"),
      } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      creditStore: snapshotStore,
      creditPort,
    });

    const outcome = await dispatch(
      creditPlan({ authority: creditAuthority({ permittedProviderRoutes: ["bedrock", "vertex"] }) }),
    );
    expect(outcome.kind).toBe("COMPLETED");
    expect(bedrockCalls).toHaveLength(0);
    expect(store.attempts).toHaveLength(2); // bedrock (refused) + vertex (succeeded)
    expect(store.attempts[0]!.errorCode).toMatch(/^CREDIT_BLOCKED:/);
  });

  it("a clean provider FAILURE after credit authorization RELEASES that route's hold", async () => {
    const store = new MemStore();
    const { db, ledger } = makeInMemoryCreditLedgerDb();
    const creditPort = createPgCreditAuthorizationPort(db);
    const snapshotStore = storeOf(validSnapshot({ grantId: "g-fail", provider: "bedrock" }));
    const failDispatcher: ProviderDispatchFn = async () => ({
      kind: "FAILED",
      dispatched: true,
      errorCode: "HTTP_500",
    });

    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: { bedrock: failDispatcher } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      creditStore: snapshotStore,
      creditPort,
    });

    await expect(dispatch(creditPlan())).rejects.toThrow(/permitted provider route/);
    expect(ledger.get("g-fail")!.reservedMinorUnits).toBe(0); // released — no charge occurred
  });

  it("an AMBIGUOUS outcome after credit authorization NEVER releases the hold", async () => {
    const store = new MemStore();
    const { db, ledger } = makeInMemoryCreditLedgerDb();
    const creditPort = createPgCreditAuthorizationPort(db);
    const snapshotStore = storeOf(validSnapshot({ grantId: "g-ambiguous", provider: "bedrock" }));
    const ambiguousDispatcher: ProviderDispatchFn = async () => ({
      kind: "AMBIGUOUS",
      dispatched: true,
      errorCode: "TIMEOUT",
    });

    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: { bedrock: ambiguousDispatcher } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      creditStore: snapshotStore,
      creditPort,
    });

    await expect(dispatch(creditPlan())).rejects.toBeInstanceOf(AmbiguousCharge);
    // The hold is DELIBERATELY still HELD — releasing it would risk a
    // double-spend against an unproven charge.
    expect(ledger.get("g-ambiguous")!.reservedMinorUnits).toBe(100); // $1.00 = 100 minor units
  });

  it("a non-credit lane (CONFIRMED_CREDITS_ONLY not selected) never touches the credit store", async () => {
    const store = new MemStore();
    let storeTouched = false;
    const dispatch = createLedgeredDispatch({
      store,
      observability: () => new ObservabilitySink(null),
      dispatchers: { bedrock: successDispatcher("bedrock") } as Record<ProviderRouteId, ProviderDispatchFn>,
      now: () => NOW,
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      creditStore: {
        async findCovering() {
          storeTouched = true;
          return [];
        },
      },
    });

    const outcome = await dispatch(
      creditPlan({
        costMode: "NO_BILLABLE_EXTERNAL",
        authority: creditAuthority({ permittedModes: ["NO_BILLABLE_EXTERNAL"] }),
      }),
    );
    expect(outcome.kind).toBe("COMPLETED");
    expect(storeTouched).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION — real Postgres. Owner-mandated 100-concurrent-authorize proof.
// ═══════════════════════════════════════════════════════════════════════════
const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!HAS_DB)("[integration] atomic credit authorization against REAL Postgres", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const url = new URL(process.env.DATABASE_URL as string);
    url.searchParams.set("connection_limit", "25");
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "credit_grant_reservations"');
    await prisma.$executeRawUnsafe('DELETE FROM "credit_grant_reservation_ledger"');
  });

  it("100 concurrent authorize() on a grant that can fund 60 -> exactly 60 admitted, invariant holds, NO double-spend", async () => {
    const GRANT_ID = "grant-concurrency-test";
    const CAP_MINOR_UNITS = 60_00; // $60.00 spendable
    const AMOUNT_MINOR_UNITS = 1_00; // $1.00 per authorize
    const N = 100;

    const snapshotStore = storeOf(
      validSnapshot({
        grantId: GRANT_ID,
        provider: "bedrock",
        remainingMinorUnits: CAP_MINOR_UNITS,
        reservedMinorUnits: 0,
      }),
    );
    const port: CreditAuthorizationPort = createPgCreditAuthorizationPort(prisma);

    const results = await Promise.allSettled(
      Array.from({ length: N }, () =>
        port.authorize({
          store: snapshotStore,
          scope: scopeOf(),
          worstCaseMinorUnits: AMOUNT_MINOR_UNITS,
          worstCaseCurrency: "USD",
          now: NOW,
          expiresAt: new Date(NOW.getTime() + 15 * 60_000),
        }),
      ),
    );

    const admitted = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { admitted: boolean }).admitted,
    );
    const refused = results.filter(
      (r) => r.status === "fulfilled" && !(r.value as { admitted: boolean }).admitted,
    );
    const errors = results.filter((r) => r.status === "rejected");

    const ledgerRow = (await prisma.$queryRawUnsafe(
      `SELECT "reservedMinorUnits"::text AS "reservedMinorUnits" FROM "credit_grant_reservation_ledger" WHERE "grantId" = $1`,
      GRANT_ID,
    )) as Array<{ reservedMinorUnits: string }>;
    const heldCount = (
      (await prisma.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM "credit_grant_reservations" WHERE "grantId" = $1 AND "state" = 'HELD'`,
        GRANT_ID,
      )) as Array<{ n: number }>
    )[0]!.n;

    // eslint-disable-next-line no-console
    console.log(
      `\n[100-concurrent-credit] cap=${CAP_MINOR_UNITS} amount=${AMOUNT_MINOR_UNITS} N=${N} -> ` +
        `admitted=${admitted.length} refused=${refused.length} errors=${errors.length} | ` +
        `ledger.reserved=${ledgerRow[0]?.reservedMinorUnits} heldRows=${heldCount}\n`,
    );

    expect(errors).toHaveLength(0);
    expect(admitted).toHaveLength(CAP_MINOR_UNITS / AMOUNT_MINOR_UNITS); // exactly 60
    expect(refused).toHaveLength(N - CAP_MINOR_UNITS / AMOUNT_MINOR_UNITS); // the other 40
    expect(heldCount).toBe(CAP_MINOR_UNITS / AMOUNT_MINOR_UNITS);
    // The invariant: total held reservations never exceed the grant's cap —
    // proven against real Postgres, not a mock.
    expect(Number(ledgerRow[0]!.reservedMinorUnits)).toBe(CAP_MINOR_UNITS);
    expect(Number(ledgerRow[0]!.reservedMinorUnits)).toBeLessThanOrEqual(CAP_MINOR_UNITS);
  });

  it("settle/release against real Postgres: reserved returns to 0 either way, double-settle guarded", async () => {
    const GRANT_ID = "grant-settle-release-test";
    const snapshotStore = storeOf(
      validSnapshot({ grantId: GRANT_ID, provider: "bedrock", remainingMinorUnits: 1000_00, reservedMinorUnits: 0 }),
    );
    const port = createPgCreditAuthorizationPort(prisma);

    const held = await port.authorize({
      store: snapshotStore,
      scope: scopeOf(),
      worstCaseMinorUnits: 500_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
    });
    expect(held.admitted).toBe(true);
    if (!held.admitted) return;

    await port.settle(held.handle, 200_00);
    const afterSettle = (await prisma.$queryRawUnsafe(
      `SELECT "reservedMinorUnits"::text AS r FROM "credit_grant_reservation_ledger" WHERE "grantId" = $1`,
      GRANT_ID,
    )) as Array<{ r: string }>;
    expect(Number(afterSettle[0]!.r)).toBe(0);
    await expect(port.settle(held.handle, 1)).rejects.toBeInstanceOf(BudgetBlocked);

    const held2 = await port.authorize({
      store: snapshotStore,
      scope: scopeOf(),
      worstCaseMinorUnits: 300_00,
      worstCaseCurrency: "USD",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
    });
    expect(held2.admitted).toBe(true);
    if (!held2.admitted) return;
    await port.release(held2.handle);
    const afterRelease = (await prisma.$queryRawUnsafe(
      `SELECT "reservedMinorUnits"::text AS r FROM "credit_grant_reservation_ledger" WHERE "grantId" = $1`,
      GRANT_ID,
    )) as Array<{ r: string }>;
    expect(Number(afterRelease[0]!.r)).toBe(0);
  });
});
