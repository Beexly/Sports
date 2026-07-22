/**
 * Directive §10 — budget holds and cap invariants (PR #164).
 *
 * Structure:
 *   1. Money exactness (§10.6)      — micro-USD bigint round-trips, no floats.
 *   2. Lane rule + worst case (§10.4) — the ENTIRE attempt plan is reserved;
 *                                     pricing fails closed.
 *   3. Scope resolution (§10.5)     — registry templates only; missing
 *                                     context fails closed.
 *   4. Reserve (§10.2/§10.3/§10.6)  — atomic cap guard, all-or-nothing,
 *                                     idempotent duplicates, zero-dollar
 *                                     refusal, OVERAGE_LOCKED circuit breaker.
 *   5. Settle/release/reconcile (§10.1/§10.2/§10.7) — provisional vs
 *                                     confirmed, overage preserves the real
 *                                     charge + locks + owner incident.
 *   6. Sweeper (§10.1)              — queries AUTHORITATIVE attempt state;
 *                                     ambiguous holds are unreleasable; crash
 *                                     recovery (§10.9).
 *   7. Pipeline integration (§10)   — reserve-before-dispatch, BUDGET_BLOCKED
 *                                     with no attempt, success settles
 *                                     provisionally, ambiguous retains holds.
 *   8. Credit port (§10.8)          — CONFIRMED_CREDITS_ONLY unreachable in
 *                                     production (fail-closed port), reachable
 *                                     only via an injected S5-style adapter.
 *
 * The DB-level cap CHECK + 100-concurrent + crash-recovery acceptance runs
 * against REAL Postgres in ai-control-plane-budget-pg.test.ts (atomicity is a
 * DB property a mock cannot prove; the in-memory fake here mirrors the
 * semantics, including the CHECK constraints, to pin the app-level logic).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import {
  requiresCashReservation,
  estimateAttemptPlanWorstCaseUsd,
  resolveRequiredBudgetWindows,
  usdToMicros,
  microsToUsd,
  toUsdString,
  CONTROL_PLANE_PRICING_VERSION,
  CONTROL_PLANE_PROVIDER_MINIMUM_USD,
  type AttemptActualPricer,
} from "@/lib/ai-control-plane/budget";
import {
  reserve,
  settleProvisional,
  release,
  holdForReconciliation,
  confirmSettlement,
  sweepExpired,
  createAiExecutor,
  createLedgeredDispatch,
  failClosedCreditAuthorizationPort,
  failClosedReceiptStore,
  ObservabilitySink,
  type AuthoritativeControlStore,
  type AiDispatchPlan,
  type BudgetDb,
  type ClaimOutcome,
  type ControlSqlClient,
  type SealedAiExecutorDependencies,
} from "@/lib/ai-control-plane/internal";
import type { BudgetOverageIncident } from "@/lib/ai-control-plane/budget";
import type { CreditAuthorizationPort } from "@/lib/ai-control-plane/credit-port";
import type {
  AiTaskInvocationRequest,
  AiTaskPolicyDefinition,
  EffectiveAuthority,
} from "@/lib/ai-control-plane/contracts";
import {
  BudgetBlocked,
  AmbiguousCharge,
  ProviderUnavailable,
  PolicyBlocked,
} from "@/lib/ai-control-plane/errors";
import { getTaskPolicy } from "@/lib/ai-control-plane/policy-registry";
import { resolveEffectiveAuthority } from "@/lib/ai-control-plane/validation";
import { serviceActor } from "@/lib/auth/actor";

const NOW = new Date("2026-07-22T12:00:00.000Z");
const LATER = new Date("2026-07-22T13:00:00.000Z");
const ACTOR = serviceActor({ subjectId: "service:budget-tests" });

// ───────────────────────────────────────────────────────────────────────────
// In-memory transactional fake of the budget schema. It interprets the exact
// statements budget.ts issues AND emulates the migration's CHECK constraints
// (nonnegativity + the §10.2 cap CHECK with its OVERAGE_LOCKED escape), with
// snapshot/restore in $transaction so a throw ROLLS BACK like Postgres.
// It also carries `ai_invocations` / `ai_attempts` mirrors so the sweeper's
// authoritative attempt-state query (§10.1) is honestly exercised.
// ───────────────────────────────────────────────────────────────────────────
interface FakeWindow {
  id: string;
  scopeKind: string;
  state: string;
  capUsd: bigint;
  reservedUsd: bigint;
  provisionalUsd: bigint;
  confirmedBilledUsd: bigint;
  confirmedCreditUsd: bigint;
  releasedUsd: bigint;
  disputedUsd: bigint;
}
interface FakeReservation {
  id: string;
  invocationId: string;
  windowId: string;
  reservationVersion: number;
  amountUsd: bigint;
  state: string;
  provisionalUsd: bigint | null;
  confirmedUsd: bigint | null;
  confirmedKind: string | null;
  overage: boolean;
  expiresAt: Date;
}
interface FakeInvocation {
  id: string;
  status: string;
}
interface FakeAttempt {
  invocationId: string;
  status: string;
}

function makeFakeBudgetDb() {
  const state = {
    windows: new Map<string, FakeWindow>(),
    reservations: new Map<string, FakeReservation>(),
    invocations: new Map<string, FakeInvocation>(),
    attempts: [] as FakeAttempt[],
  };

  const seedWindow = (
    id: string,
    capUsd: string,
    partial: Partial<FakeWindow> = {},
  ) => {
    state.windows.set(id, {
      id,
      scopeKind: "DAILY",
      state: "ACTIVE",
      capUsd: usdToMicros(capUsd),
      reservedUsd: 0n,
      provisionalUsd: 0n,
      confirmedBilledUsd: 0n,
      confirmedCreditUsd: 0n,
      releasedUsd: 0n,
      disputedUsd: 0n,
      ...partial,
    });
  };
  const seedInvocation = (id: string, status = "RUNNING") => {
    state.invocations.set(id, { id, status });
  };

  const checkConstraints = (w: FakeWindow) => {
    for (const [label, v] of [
      ["capUsd", w.capUsd],
      ["reservedUsd", w.reservedUsd],
      ["provisionalUsd", w.provisionalUsd],
      ["confirmedBilledUsd", w.confirmedBilledUsd],
      ["confirmedCreditUsd", w.confirmedCreditUsd],
      ["releasedUsd", w.releasedUsd],
      ["disputedUsd", w.disputedUsd],
    ] as const) {
      if (v < 0n) throw new Error(`CHECK violation: ${label} < 0 on ${w.id}`);
    }
    // §10.2 cap CHECK with the OVERAGE_LOCKED escape — mirrors the migration.
    if (
      w.reservedUsd + w.provisionalUsd + w.confirmedBilledUsd > w.capUsd &&
      w.state !== "OVERAGE_LOCKED"
    ) {
      throw new Error(`CHECK violation: cap exceeded on ACTIVE window ${w.id}`);
    }
  };

  const snapshot = () => ({
    windows: new Map([...state.windows].map(([k, v]) => [k, { ...v }] as const)),
    reservations: new Map(
      [...state.reservations].map(([k, v]) => [k, { ...v }] as const),
    ),
    invocations: new Map(
      [...state.invocations].map(([k, v]) => [k, { ...v }] as const),
    ),
    attempts: state.attempts.map((a) => ({ ...a })),
  });

  const findByKey = (inv: string, win: string, ver: number) =>
    [...state.reservations.values()].find(
      (r) =>
        r.invocationId === inv &&
        r.windowId === win &&
        r.reservationVersion === ver,
    );

  const db: BudgetDb = {
    async $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> {
      if (query.includes('INSERT INTO "ai_budget_reservations"')) {
        const [id, invocationId, windowId, version, amount, , expiresAt] =
          values as [string, string, string, number, string, Date, Date];
        if (!state.windows.has(windowId)) {
          throw new Error(
            `insert on "ai_budget_reservations" violates foreign key ` +
              `"ai_budget_reservations_windowId_fkey" (${windowId})`,
          );
        }
        if (!state.invocations.has(invocationId)) {
          throw new Error(
            `insert on "ai_budget_reservations" violates foreign key ` +
              `"ai_budget_reservations_invocationId_fkey" (${invocationId})`,
          );
        }
        if (findByKey(invocationId, windowId, version)) return 0; // ON CONFLICT DO NOTHING
        state.reservations.set(id, {
          id,
          invocationId,
          windowId,
          reservationVersion: version,
          amountUsd: usdToMicros(amount),
          state: "HELD",
          provisionalUsd: null,
          confirmedUsd: null,
          confirmedKind: null,
          overage: false,
          expiresAt,
        });
        return 1;
      }

      if (query.includes('UPDATE "ai_budget_windows"')) {
        // reserve: conditional cap guard on an ACTIVE window
        if (query.includes('"reservedUsd" = "reservedUsd" + $1::numeric')) {
          const [amount, windowId] = values as [string, string];
          const w = state.windows.get(windowId);
          if (!w) return 0;
          const add = usdToMicros(amount);
          if (w.state !== "ACTIVE") return 0;
          if (
            w.reservedUsd + w.provisionalUsd + w.confirmedBilledUsd + add >
            w.capUsd
          )
            return 0;
          w.reservedUsd += add;
          checkConstraints(w);
          return 1;
        }
        // settle: reserved -= held, provisional += actual, maybe lock
        if (query.includes('"provisionalUsd" = "provisionalUsd" + $2::numeric')) {
          const [held, actual, overage, windowId] = values as [
            string,
            string,
            boolean,
            string,
          ];
          const w = state.windows.get(windowId);
          if (!w) return 0;
          const heldM = usdToMicros(held);
          if (w.reservedUsd < heldM) return 0;
          w.reservedUsd -= heldM;
          w.provisionalUsd += usdToMicros(actual);
          if (overage) w.state = "OVERAGE_LOCKED";
          checkConstraints(w);
          return 1;
        }
        // release / sweep-expire: reserved -= amount, released += amount
        if (query.includes('"releasedUsd" = "releasedUsd" + $1::numeric')) {
          const [amount, windowId] = values as [string, string];
          const w = state.windows.get(windowId);
          if (!w) return 0;
          const m = usdToMicros(amount);
          if (w.reservedUsd < m) return 0;
          w.reservedUsd -= m;
          w.releasedUsd += m;
          checkConstraints(w);
          return 1;
        }
        // reconciliation hold: disputed += amount (reserved unchanged)
        if (query.includes('"disputedUsd" = "disputedUsd" + $1::numeric')) {
          const [amount, windowId] = values as [string, string];
          const w = state.windows.get(windowId);
          if (!w) return 0;
          w.disputedUsd += usdToMicros(amount);
          checkConstraints(w);
          return 1;
        }
        // confirm from PROVISIONALLY_SETTLED
        if (query.includes('"provisionalUsd" = "provisionalUsd" - $1::numeric')) {
          const [prov, confirmed, windowId] = values as [string, string, string];
          const w = state.windows.get(windowId);
          if (!w) return 0;
          const provM = usdToMicros(prov);
          if (w.provisionalUsd < provM) return 0;
          w.provisionalUsd -= provM;
          const confM = usdToMicros(confirmed);
          if (query.includes('"confirmedBilledUsd"')) w.confirmedBilledUsd += confM;
          else w.confirmedCreditUsd += confM;
          checkConstraints(w);
          return 1;
        }
        // confirm from RECONCILIATION_HOLD
        if (query.includes('"disputedUsd" = "disputedUsd" - $1::numeric')) {
          const [held, confirmed, windowId] = values as [string, string, string];
          const w = state.windows.get(windowId);
          if (!w) return 0;
          const heldM = usdToMicros(held);
          if (w.reservedUsd < heldM || w.disputedUsd < heldM) return 0;
          w.reservedUsd -= heldM;
          w.disputedUsd -= heldM;
          const confM = usdToMicros(confirmed);
          if (query.includes('"confirmedBilledUsd"')) w.confirmedBilledUsd += confM;
          else w.confirmedCreditUsd += confM;
          checkConstraints(w);
          return 1;
        }
        throw new Error(`fake budget db: unrecognized window UPDATE: ${query}`);
      }

      if (query.includes('UPDATE "ai_budget_reservations"')) {
        // NOTE: check CONFIRMED_SETTLED first — its WHERE clause contains the
        // 'PROVISIONALLY_SETTLED' literal too.
        if (query.includes("'CONFIRMED_SETTLED'")) {
          const [confirmed, kind, , id] = values as [string, string, Date, string];
          const r = state.reservations.get(id);
          if (
            !r ||
            (r.state !== "PROVISIONALLY_SETTLED" &&
              r.state !== "RECONCILIATION_HOLD")
          )
            return 0;
          r.state = "CONFIRMED_SETTLED";
          r.confirmedUsd = usdToMicros(confirmed);
          r.confirmedKind = kind;
          return 1;
        }
        if (query.includes("'PROVISIONALLY_SETTLED'")) {
          const [actual, overage, , id] = values as [string, boolean, Date, string];
          const r = state.reservations.get(id);
          if (!r || r.state !== "HELD") return 0;
          r.state = "PROVISIONALLY_SETTLED";
          r.provisionalUsd = usdToMicros(actual);
          r.overage = overage;
          return 1;
        }
        if (query.includes("'RELEASED'")) {
          const [, id] = values as [Date, string];
          const r = state.reservations.get(id);
          if (!r || r.state !== "HELD") return 0;
          r.state = "RELEASED";
          return 1;
        }
        if (query.includes("'RECONCILIATION_HOLD'")) {
          const [, id] = values as [Date, string];
          const r = state.reservations.get(id);
          if (!r || r.state !== "HELD") return 0;
          r.state = "RECONCILIATION_HOLD";
          return 1;
        }
        if (query.includes("'EXPIRED'")) {
          const [, id] = values as [Date, string];
          const r = state.reservations.get(id);
          if (!r || r.state !== "HELD") return 0;
          r.state = "EXPIRED";
          return 1;
        }
        throw new Error(
          `fake budget db: unrecognized reservation UPDATE: ${query}`,
        );
      }
      throw new Error(`fake budget db: unrecognized statement: ${query}`);
    },

    async $queryRawUnsafe<T = unknown>(
      query: string,
      ...values: unknown[]
    ): Promise<T> {
      // sweep evidence: authoritative attempt-state query (§10.1)
      if (query.includes("possiblyCharged")) {
        const [invocationId] = values as [string];
        const inv = state.invocations.get(invocationId);
        const possiblyCharged = state.attempts.some(
          (a) =>
            a.invocationId === invocationId &&
            ["DISPATCHED", "SUCCEEDED", "TIMEOUT", "AMBIGUOUS"].includes(
              a.status,
            ),
        );
        return [
          { invocationStatus: inv?.status ?? null, possiblyCharged },
        ] as T;
      }
      // sweep stale scan
      if (query.includes('"expiresAt" <= $1')) {
        const [now] = values as [Date];
        return [...state.reservations.values()]
          .filter((r) => r.state === "HELD" && r.expiresAt <= now)
          .sort((a, b) => (a.windowId < b.windowId ? -1 : 1))
          .map((r) => ({
            id: r.id,
            windowId: r.windowId,
            invocationId: r.invocationId,
            amountUsd: microsToUsd(r.amountUsd),
          })) as T;
      }
      // loadInvocationReservations
      if (query.includes('"provisionalUsd"::text')) {
        const [invocationId, version] = values as [string, number];
        return [...state.reservations.values()]
          .filter(
            (r) =>
              r.invocationId === invocationId &&
              r.reservationVersion === version,
          )
          .sort((a, b) => (a.windowId < b.windowId ? -1 : 1))
          .map((r) => ({
            id: r.id,
            windowId: r.windowId,
            amountUsd: microsToUsd(r.amountUsd),
            provisionalUsd:
              r.provisionalUsd === null ? null : microsToUsd(r.provisionalUsd),
            confirmedUsd:
              r.confirmedUsd === null ? null : microsToUsd(r.confirmedUsd),
            confirmedKind: r.confirmedKind,
            state: r.state,
          })) as T;
      }
      // reserve idempotency probe
      if (
        query.includes('SELECT "id", "amountUsd"::text AS "amountUsd", "state"')
      ) {
        const [invocationId, windowId, version] = values as [
          string,
          string,
          number,
        ];
        const r = findByKey(invocationId, windowId, version);
        return (r
          ? [{ id: r.id, amountUsd: microsToUsd(r.amountUsd), state: r.state }]
          : []) as T;
      }
      throw new Error(`fake budget db: unrecognized query: ${query}`);
    },

    async $transaction<T>(fn: (tx: BudgetDb) => Promise<T>): Promise<T> {
      const saved = snapshot();
      try {
        return await fn(db);
      } catch (error) {
        state.windows = saved.windows;
        state.reservations = saved.reservations;
        state.invocations = saved.invocations;
        state.attempts = saved.attempts;
        throw error;
      }
    },
  };

  return { db, state, seedWindow, seedInvocation };
}

let idCounter = 0;
const nextId = () => `res-${(idCounter += 1).toString().padStart(4, "0")}`;

function reserveInput(
  overrides: Partial<Parameters<typeof reserve>[1]> = {},
): Parameters<typeof reserve>[1] {
  return {
    windowIds: ["entity:GSE:daily:2026-07-22"],
    amountUsd: "0.100000",
    invocationId: "inv-1",
    now: NOW,
    expiresAt: new Date(NOW.getTime() + 60_000),
    idFactory: nextId,
    ...overrides,
  };
}

// ─── 1. Money exactness (§10.6) ──────────────────────────────────────────────

describe("§10.6 exact Decimal handling", () => {
  it("round-trips micro-USD exactly (no float arithmetic)", () => {
    expect(usdToMicros("0.000001")).toBe(1n);
    expect(usdToMicros("1")).toBe(1_000_000n);
    expect(usdToMicros("12.345678")).toBe(12_345_678n);
    expect(microsToUsd(12_345_678n)).toBe("12.345678");
    expect(toUsdString(0.1)).toBe("0.100000");
    // The classic float trap: 0.1 + 0.2 never touches money here.
    expect(usdToMicros("0.1") + usdToMicros("0.2")).toBe(usdToMicros("0.3"));
  });

  it("refuses negatives, non-decimals, and >6dp amounts", () => {
    expect(() => usdToMicros("-1")).toThrow(BudgetBlocked);
    expect(() => usdToMicros("1.2345678")).toThrow(BudgetBlocked);
    expect(() => usdToMicros("abc")).toThrow(BudgetBlocked);
    expect(() => usdToMicros(Number.NaN)).toThrow(BudgetBlocked);
    expect(() => usdToMicros(-0.5)).toThrow(BudgetBlocked);
    expect(() => microsToUsd(-1n)).toThrow(BudgetBlocked);
  });
});

// ─── 2. Lane rule + worst case of the ENTIRE plan (§10.4) ────────────────────

describe("§10.4 worst case covers the entire attempt plan", () => {
  it("only the two billable modes require a cash reservation", () => {
    expect(requiresCashReservation("BUDGETED_CASH")).toBe(true);
    expect(requiresCashReservation("EMERGENCY_RELIABILITY")).toBe(true);
    expect(requiresCashReservation("NO_BILLABLE_EXTERNAL")).toBe(false);
    expect(requiresCashReservation("CONFIRMED_CREDITS_ONLY")).toBe(false);
  });

  it("sums EVERY permitted billable attempt (retry/fallback count included)", () => {
    // Ambiguous-then-successful-fallback is covered: both routes are in the sum.
    expect(
      estimateAttemptPlanWorstCaseUsd({
        routes: ["anthropic-direct", "bedrock"],
        perAttemptCeilingUsd: "0.050000",
        pricingVersion: CONTROL_PLANE_PRICING_VERSION,
      }),
    ).toBe("0.100000");
  });

  it("local routes carry no vendor cash; provider minimums floor an attempt", () => {
    expect(
      estimateAttemptPlanWorstCaseUsd({
        routes: ["local", "anthropic-direct", "bedrock"],
        perAttemptCeilingUsd: "0.010000",
        pricingVersion: CONTROL_PLANE_PRICING_VERSION,
        providerMinimumUsd: { bedrock: "0.025000" },
      }),
    ).toBe("0.035000"); // 0.01 (anthropic) + max(0.01, 0.025) (bedrock)
  });

  it("fails closed on a missing or unknown pricing version", () => {
    expect(() =>
      estimateAttemptPlanWorstCaseUsd({
        routes: ["anthropic-direct"],
        perAttemptCeilingUsd: "1",
      }),
    ).toThrow(BudgetBlocked);
    expect(() =>
      estimateAttemptPlanWorstCaseUsd({
        routes: ["anthropic-direct"],
        perAttemptCeilingUsd: "1",
        pricingVersion: "1999-01-01.9",
      }),
    ).toThrow(BudgetBlocked);
  });
});

// ─── 3. Required scopes come from policy (§10.5) ─────────────────────────────

describe("§10.5 budget scopes resolve from registry templates only", () => {
  const ctx = {
    entity: "GSE",
    surface: "brief",
    requestId: "req-1",
    now: NOW,
  };

  it("resolves entity daily/monthly templates with deterministic UTC keys", () => {
    expect(
      resolveRequiredBudgetWindows(
        ["entity:{entity}:daily", "surface:{surface}:monthly"],
        ctx,
      ),
    ).toEqual([
      { windowId: "entity:GSE:daily:2026-07-22", scopeKind: "DAILY" },
      { windowId: "surface:brief:monthly:2026-07", scopeKind: "MONTHLY" },
    ]);
  });

  it("fails closed on a placeholder with no context value", () => {
    expect(() =>
      resolveRequiredBudgetWindows(
        ["provider-account:{providerAccount}:daily"],
        ctx,
      ),
    ).toThrow(BudgetBlocked);
    expect(() =>
      resolveRequiredBudgetWindows(["entity:{unknownThing}:daily"], ctx),
    ).toThrow(BudgetBlocked);
  });

  it("fails closed on an unclassifiable scope kind", () => {
    expect(() =>
      resolveRequiredBudgetWindows(["mystery:{entity}"], ctx),
    ).toThrow(BudgetBlocked);
  });

  it("deduplicates identical resolved windows", () => {
    expect(
      resolveRequiredBudgetWindows(
        ["entity:{entity}:daily", "entity:{entity}:daily"],
        ctx,
      ),
    ).toHaveLength(1);
  });
});

// ─── 4. Reserve (§10.2/§10.3/§10.6) ──────────────────────────────────────────

describe("§10.2 reserve: the atomic cap guard", () => {
  it("holds within cap; refuses beyond cap; never partially", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "0.150000");
    f.seedInvocation("inv-1");
    await reserve(f.db, reserveInput({ windowIds: ["w-a"] }));
    expect(f.state.windows.get("w-a")!.reservedUsd).toBe(usdToMicros("0.1"));
    f.seedInvocation("inv-2");
    await expect(
      reserve(f.db, reserveInput({ windowIds: ["w-a"], invocationId: "inv-2" })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    // The refused reserve left nothing behind.
    expect(f.state.windows.get("w-a")!.reservedUsd).toBe(usdToMicros("0.1"));
    expect(
      [...f.state.reservations.values()].filter(
        (r) => r.invocationId === "inv-2",
      ),
    ).toHaveLength(0);
  });

  it("multi-window acquisition is all-or-nothing (no partial holds leak)", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("a-roomy", "10");
    f.seedWindow("b-tight", "0.010000"); // cannot fit 0.1
    f.seedInvocation("inv-1");
    await expect(
      reserve(f.db, reserveInput({ windowIds: ["b-tight", "a-roomy"] })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    expect(f.state.windows.get("a-roomy")!.reservedUsd).toBe(0n);
    expect(f.state.windows.get("b-tight")!.reservedUsd).toBe(0n);
    expect(f.state.reservations.size).toBe(0);
  });

  it("§10.3: a zero-dollar amount authorizes nothing billable", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10");
    f.seedInvocation("inv-1");
    await expect(
      reserve(f.db, reserveInput({ amountUsd: "0" })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    expect(f.state.reservations.size).toBe(0);
  });

  it("§10.6: duplicate reserve is idempotent — same key returns the existing hold, window charged once", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("entity:GSE:daily:2026-07-22", "10");
    f.seedInvocation("inv-1");
    const first = await reserve(f.db, reserveInput());
    const second = await reserve(f.db, reserveInput());
    expect(second.reservations[0]!.reservationId).toBe(
      first.reservations[0]!.reservationId,
    );
    expect(second.reservations[0]!.reused).toBe(true);
    expect(
      f.state.windows.get("entity:GSE:daily:2026-07-22")!.reservedUsd,
    ).toBe(usdToMicros("0.1"));
    expect(f.state.reservations.size).toBe(1);
  });

  it("§10.6: a same-key duplicate with a DIFFERENT amount is a hard conflict", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10");
    f.seedInvocation("inv-1");
    await reserve(f.db, reserveInput({ windowIds: ["w-a"] }));
    await expect(
      reserve(f.db, reserveInput({ windowIds: ["w-a"], amountUsd: "0.200000" })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("§10.5/§10.6: a missing window or invocation row fails closed (FK)", async () => {
    const f = makeFakeBudgetDb();
    f.seedInvocation("inv-1");
    await expect(
      reserve(f.db, reserveInput({ windowIds: ["never-provisioned"] })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    f.seedWindow("w-a", "10");
    await expect(
      reserve(f.db, reserveInput({ windowIds: ["w-a"], invocationId: "ghost" })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("an empty window list is refused (no unscoped cash spend)", async () => {
    const f = makeFakeBudgetDb();
    await expect(
      reserve(f.db, reserveInput({ windowIds: [] })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("§10.2: an OVERAGE_LOCKED window admits NO further holds (circuit breaker)", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10", { state: "OVERAGE_LOCKED" });
    f.seedInvocation("inv-1");
    await expect(
      reserve(f.db, reserveInput({ windowIds: ["w-a"] })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });
});

// ─── 5. Settle / release / reconcile (§10.1/§10.2/§10.7) ─────────────────────

describe("§10.7 provisional vs confirmed settlement", () => {
  async function held(capUsd = "10") {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", capUsd);
    f.seedInvocation("inv-1");
    await reserve(f.db, reserveInput({ windowIds: ["w-a"] })); // holds 0.1
    return f;
  }

  it("settles the ACTUAL provisionally and releases the held remainder", async () => {
    const f = await held();
    await settleProvisional(f.db, {
      invocationId: "inv-1",
      actualUsd: "0.030000",
      now: LATER,
    });
    const w = f.state.windows.get("w-a")!;
    expect(w.reservedUsd).toBe(0n);
    expect(w.provisionalUsd).toBe(usdToMicros("0.03"));
    expect(w.confirmedBilledUsd).toBe(0n); // §10.7: NOT confirmed
    const r = [...f.state.reservations.values()][0]!;
    expect(r.state).toBe("PROVISIONALLY_SETTLED");
    expect(r.provisionalUsd).toBe(usdToMicros("0.03"));
  });

  it("is idempotent on the same actual; conflicts on a different actual", async () => {
    const f = await held();
    const input = { invocationId: "inv-1", actualUsd: "0.030000", now: LATER };
    await settleProvisional(f.db, input);
    await settleProvisional(f.db, input); // no-op replay
    expect(f.state.windows.get("w-a")!.provisionalUsd).toBe(
      usdToMicros("0.03"),
    );
    await expect(
      settleProvisional(f.db, { ...input, actualUsd: "0.040000" }),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("§10.2: actual > hold PRESERVES the real charge, locks the window, fires the owner incident", async () => {
    const f = await held("0.100000"); // cap exactly the hold
    const incidents: BudgetOverageIncident[] = [];
    const result = await settleProvisional(f.db, {
      invocationId: "inv-1",
      actualUsd: "0.250000", // exceeds both hold and cap
      now: LATER,
      incidents: async (i) => {
        incidents.push(i);
      },
    });
    expect(result.overage).toBe(true);
    const w = f.state.windows.get("w-a")!;
    // The REAL charge is preserved — never truncated to fit the cap…
    expect(w.provisionalUsd).toBe(usdToMicros("0.25"));
    // …and the over-cap state exists ONLY together with the circuit breaker.
    expect(w.state).toBe("OVERAGE_LOCKED");
    expect(incidents).toEqual([
      expect.objectContaining({
        kind: "BUDGET_OVERAGE_LOCKED",
        windowId: "w-a",
        heldUsd: "0.100000",
        actualUsd: "0.250000",
      }),
    ]);
    // Circuit breaker: further spend on the locked window is refused.
    f.seedInvocation("inv-2");
    await expect(
      reserve(
        f.db,
        reserveInput({
          windowIds: ["w-a"],
          invocationId: "inv-2",
          amountUsd: "0.000001",
        }),
      ),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("an incident-sink failure never un-settles the charge", async () => {
    const f = await held("0.100000");
    await expect(
      settleProvisional(f.db, {
        invocationId: "inv-1",
        actualUsd: "0.200000",
        now: LATER,
        incidents: async () => {
          throw new Error("incident pipe broken");
        },
      }),
    ).resolves.toMatchObject({ overage: true });
    expect(f.state.windows.get("w-a")!.state).toBe("OVERAGE_LOCKED");
  });

  it("release frees a hold, is idempotent, and refuses settled/reconciliation holds", async () => {
    const f = await held();
    await release(f.db, { invocationId: "inv-1", now: LATER });
    await release(f.db, { invocationId: "inv-1", now: LATER }); // idempotent
    const w = f.state.windows.get("w-a")!;
    expect(w.reservedUsd).toBe(0n);
    expect(w.releasedUsd).toBe(usdToMicros("0.1"));

    const g = await held();
    await settleProvisional(g.db, {
      invocationId: "inv-1",
      actualUsd: "0.010000",
      now: LATER,
    });
    await expect(
      release(g.db, { invocationId: "inv-1", now: LATER }),
    ).rejects.toBeInstanceOf(BudgetBlocked);

    const h = await held();
    await holdForReconciliation(h.db, { invocationId: "inv-1", now: LATER });
    await expect(
      release(h.db, { invocationId: "inv-1", now: LATER }),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("holdForReconciliation keeps the money reserved and mirrors it as disputed", async () => {
    const f = await held();
    await holdForReconciliation(f.db, { invocationId: "inv-1", now: LATER });
    await holdForReconciliation(f.db, { invocationId: "inv-1", now: LATER }); // idempotent
    const w = f.state.windows.get("w-a")!;
    expect(w.reservedUsd).toBe(usdToMicros("0.1")); // cap still counts it
    expect(w.disputedUsd).toBe(usdToMicros("0.1"));
  });

  it("confirmSettlement moves provisional → confirmed BILLED", async () => {
    const f = await held();
    await settleProvisional(f.db, {
      invocationId: "inv-1",
      actualUsd: "0.030000",
      now: LATER,
    });
    await confirmSettlement(f.db, {
      invocationId: "inv-1",
      confirmedUsd: "0.030000",
      kind: "BILLED",
      now: LATER,
    });
    const w = f.state.windows.get("w-a")!;
    expect(w.provisionalUsd).toBe(0n);
    expect(w.confirmedBilledUsd).toBe(usdToMicros("0.03"));
    const r = [...f.state.reservations.values()][0]!;
    expect(r.state).toBe("CONFIRMED_SETTLED");
    expect(r.confirmedKind).toBe("BILLED");
    // Idempotent replay; conflicting confirm refused.
    await confirmSettlement(f.db, {
      invocationId: "inv-1",
      confirmedUsd: "0.030000",
      kind: "BILLED",
      now: LATER,
    });
    await expect(
      confirmSettlement(f.db, {
        invocationId: "inv-1",
        confirmedUsd: "0.990000",
        kind: "BILLED",
        now: LATER,
      }),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("confirmSettlement resolves a RECONCILIATION_HOLD (credit-covered)", async () => {
    const f = await held();
    await holdForReconciliation(f.db, { invocationId: "inv-1", now: LATER });
    await confirmSettlement(f.db, {
      invocationId: "inv-1",
      confirmedUsd: "0.080000",
      kind: "CREDIT",
      now: LATER,
    });
    const w = f.state.windows.get("w-a")!;
    expect(w.reservedUsd).toBe(0n);
    expect(w.disputedUsd).toBe(0n);
    expect(w.confirmedCreditUsd).toBe(usdToMicros("0.08"));
    expect(w.confirmedBilledUsd).toBe(0n); // §10.7: credit tracked separately
  });
});

// ─── 6. The sweeper queries authoritative attempt state (§10.1/§10.9) ────────

describe("§10.1 sweeper: ambiguous holds are unreleasable", () => {
  const STALE = new Date(NOW.getTime() - 1); // expiresAt before "now"

  async function staleHold(
    f: ReturnType<typeof makeFakeBudgetDb>,
    invocationId: string,
    windowId = "w-a",
  ) {
    await reserve(
      f.db,
      reserveInput({
        windowIds: [windowId],
        invocationId,
        expiresAt: STALE,
        now: new Date(NOW.getTime() - 60_000),
      }),
    );
  }

  it("has NO caller-provided exclusion parameter at all", () => {
    expect(sweepExpired.length).toBe(2); // (db, now) — nothing else
  });

  it("releases a stale hold ONLY when the ledger proves no dispatch happened (§10.9 crash between reserve and dispatch)", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10");
    f.seedInvocation("inv-clean", "RUNNING"); // crashed before any attempt
    await staleHold(f, "inv-clean");
    const result = await sweepExpired(f.db, NOW);
    expect(result.expiredReservationIds).toHaveLength(1);
    expect(result.movedToReconciliationIds).toHaveLength(0);
    expect(f.state.windows.get("w-a")!.reservedUsd).toBe(0n);
  });

  it("converts a stale hold to RECONCILIATION_HOLD when the invocation is AMBIGUOUS", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10");
    f.seedInvocation("inv-amb", "AMBIGUOUS");
    await staleHold(f, "inv-amb");
    const result = await sweepExpired(f.db, NOW);
    expect(result.expiredReservationIds).toHaveLength(0);
    expect(result.movedToReconciliationIds).toHaveLength(1);
    const w = f.state.windows.get("w-a")!;
    expect(w.reservedUsd).toBe(usdToMicros("0.1")); // money NOT freed
    expect(w.disputedUsd).toBe(usdToMicros("0.1"));
    // A second sweep cannot touch it (state gate) — it is unreleasable.
    const again = await sweepExpired(f.db, NOW);
    expect(again.expiredReservationIds).toHaveLength(0);
    expect(again.movedToReconciliationIds).toHaveLength(0);
    expect(f.state.windows.get("w-a")!.reservedUsd).toBe(usdToMicros("0.1"));
  });

  it("§10.9 crash between dispatch and settle: a possibly-charged attempt keeps the money locked", async () => {
    for (const attemptStatus of [
      "DISPATCHED",
      "SUCCEEDED",
      "TIMEOUT",
      "AMBIGUOUS",
    ]) {
      const f = makeFakeBudgetDb();
      f.seedWindow("w-a", "10");
      f.seedInvocation("inv-x", "RUNNING");
      f.state.attempts.push({ invocationId: "inv-x", status: attemptStatus });
      await staleHold(f, "inv-x");
      const result = await sweepExpired(f.db, NOW);
      expect(result.movedToReconciliationIds, attemptStatus).toHaveLength(1);
      expect(f.state.windows.get("w-a")!.reservedUsd).toBe(usdToMicros("0.1"));
    }
  });

  it("a cleanly FAILED attempt walk releases (no charge was possible)", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10");
    f.seedInvocation("inv-f", "FAILED");
    f.state.attempts.push({ invocationId: "inv-f", status: "FAILED" });
    await staleHold(f, "inv-f");
    const result = await sweepExpired(f.db, NOW);
    expect(result.expiredReservationIds).toHaveLength(1);
    expect(f.state.windows.get("w-a")!.reservedUsd).toBe(0n);
  });

  it("missing invocation evidence fails closed to a reconciliation hold", async () => {
    const f = makeFakeBudgetDb();
    f.seedWindow("w-a", "10");
    f.seedInvocation("inv-tmp", "RUNNING");
    await staleHold(f, "inv-tmp");
    f.state.invocations.delete("inv-tmp"); // evidence gone
    const result = await sweepExpired(f.db, NOW);
    expect(result.movedToReconciliationIds).toHaveLength(1);
  });
});

// ─── 7. Pipeline integration (§10) ───────────────────────────────────────────

type DispatchOutcomeShape =
  | {
      kind: "SUCCEEDED";
      providerUsed: "anthropic-direct";
      modelResolved: string;
      providerRequestId: string;
      inputTokens: number;
      outputTokens: number;
      output: unknown;
    }
  | { kind: "FAILED" | "TIMEOUT" | "AMBIGUOUS"; dispatched: boolean; errorCode: string };

function pipelineHarness(opts: {
  outcomes: DispatchOutcomeShape[];
  capUsd?: string;
  seedWindows?: boolean;
  /** §10.7 token pricer wired into the budget seam (composition-root seam). */
  priceActual?: AttemptActualPricer;
  /** §10.4 provider minimums wired into the budget seam. */
  providerMinimumUsd?: Readonly<Record<string, string | number>>;
}) {
  const f = makeFakeBudgetDb();
  if (opts.seedWindows !== false) {
    f.seedWindow("entity:GSE:daily:2026-07-22", opts.capUsd ?? "10");
  }
  let outcomeIx = 0;

  const store: AuthoritativeControlStore = {
    async claimInvocation(input): Promise<ClaimOutcome> {
      f.seedInvocation(input.invocationId, "RUNNING");
      return {
        kind: "ACQUIRED",
        invocationId: input.invocationId,
        stolen: false,
        nextOrdinal: 0,
      };
    },
    async startAttempt(input) {
      f.state.attempts.push({
        invocationId: input.invocationId,
        status: "DISPATCHED",
      });
    },
    async recordAttemptFailure(input) {
      const attempt = f.state.attempts.find(
        (a) =>
          a.invocationId === input.invocationId && a.status === "DISPATCHED",
      );
      if (attempt) attempt.status = input.status;
    },
    async createAttribution() {},
    async finalizeSuccess(input) {
      const inv = f.state.invocations.get(input.invocationId);
      if (inv) inv.status = "SUCCEEDED";
      const attempt = f.state.attempts.find(
        (a) =>
          a.invocationId === input.invocationId && a.status === "DISPATCHED",
      );
      if (attempt) attempt.status = "SUCCEEDED";
      return true;
    },
    async finalizeFailure(input) {
      const inv = f.state.invocations.get(input.invocationId);
      if (inv) inv.status = input.status;
      return true;
    },
    async recordBlockedInvocation() {},
  };

  const noopSql: ControlSqlClient = { query: async () => [] };
  const incidents: BudgetOverageIncident[] = [];
  const dispatched: string[] = [];

  const takeOutcome = () => {
    const o = opts.outcomes[Math.min(outcomeIx, opts.outcomes.length - 1)]!;
    outcomeIx += 1;
    return o as never;
  };

  const dispatch = createLedgeredDispatch({
    store,
    observability: () => new ObservabilitySink(noopSql),
    dispatchers: {
      "anthropic-direct": async () => {
        dispatched.push("anthropic-direct");
        return takeOutcome();
      },
      bedrock: async () => {
        dispatched.push("bedrock");
        return takeOutcome();
      },
      vertex: async () => {
        throw new Error("unused");
      },
      cerebras: async () => {
        throw new Error("unused");
      },
      local: async () => {
        throw new Error("unused");
      },
    },
    now: () => NOW,
    budget: {
      db: f.db,
      incidents: async (i) => {
        incidents.push(i);
      },
      ...(opts.priceActual !== undefined
        ? { priceActual: opts.priceActual }
        : {}),
      ...(opts.providerMinimumUsd !== undefined
        ? { providerMinimumUsd: opts.providerMinimumUsd }
        : {}),
    },
  });

  return { f, dispatch, dispatched, incidents };
}

function billablePlan(overrides: Partial<AiDispatchPlan> = {}): AiDispatchPlan {
  const request: AiTaskInvocationRequest = {
    taskClass: "brief.daily-summary",
    requestId: "req-budget-0001",
    actor: ACTOR,
    entity: "GSE",
    input: { user: "summarize", maxTokens: 32 },
  };
  const authority: EffectiveAuthority = resolveEffectiveAuthority(
    getTaskPolicy(request.taskClass),
    undefined,
  );
  return {
    request,
    authority,
    costMode: "BUDGETED_CASH",
    maxVendorCashUsd: 0.05,
    fundingLabel: "CASH_EXPECTED",
    envClass: "test",
    envClassSource: "explicit",
    ...overrides,
  };
}

const OK: DispatchOutcomeShape = {
  kind: "SUCCEEDED",
  providerUsed: "anthropic-direct",
  modelResolved: "test-model",
  providerRequestId: "prov-1",
  inputTokens: 10,
  outputTokens: 10,
  output: { ok: true },
};

describe("§10 pipeline: reserve before dispatch, settle after", () => {
  it("a billable success reserves the FULL plan, then provisionally settles the attempt actual", async () => {
    const h = pipelineHarness({ outcomes: [OK] });
    const outcome = await h.dispatch(billablePlan());
    expect(outcome.kind).toBe("COMPLETED");
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    // Plan worst case: 2 billable routes × 0.05 = 0.10 reserved, then the
    // successful attempt's 0.05 settles provisionally, remainder released.
    expect(w.reservedUsd).toBe(0n);
    expect(w.provisionalUsd).toBe(usdToMicros("0.05"));
    expect(w.confirmedBilledUsd).toBe(0n); // §10.7
    const r = [...h.f.state.reservations.values()][0]!;
    expect(r.amountUsd).toBe(usdToMicros("0.10"));
    expect(r.state).toBe("PROVISIONALLY_SETTLED");
  });

  it("cap too small → BUDGET_BLOCKED, NO attempt dispatched, invocation finalized", async () => {
    const h = pipelineHarness({ outcomes: [OK], capUsd: "0.050000" }); // plan needs 0.10
    await expect(h.dispatch(billablePlan())).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    expect(h.dispatched).toEqual([]);
    expect([...h.f.state.invocations.values()][0]!.status).toBe(
      "BUDGET_BLOCKED",
    );
    expect(h.f.state.reservations.size).toBe(0);
  });

  it("§10.3: a zero-dollar cap authorizes no billable call", async () => {
    const h = pipelineHarness({ outcomes: [OK] });
    await expect(
      h.dispatch(billablePlan({ maxVendorCashUsd: 0 })),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    expect(h.dispatched).toEqual([]);
  });

  it("a missing required window fails closed (never dispatches)", async () => {
    const h = pipelineHarness({ outcomes: [OK], seedWindows: false });
    await expect(h.dispatch(billablePlan())).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    expect(h.dispatched).toEqual([]);
  });

  it("a billable plan with NO budget seam wired fails closed", async () => {
    const bare = createLedgeredDispatch({
      store: {
        async claimInvocation(input): Promise<ClaimOutcome> {
          return {
            kind: "ACQUIRED",
            invocationId: input.invocationId,
            stolen: false,
            nextOrdinal: 0,
          };
        },
        async startAttempt() {},
        async recordAttemptFailure() {},
        async createAttribution() {},
        async finalizeSuccess() {
          return true;
        },
        async finalizeFailure() {
          return true;
        },
        async recordBlockedInvocation() {},
      },
      observability: () => new ObservabilitySink({ query: async () => [] }),
      dispatchers: {
        "anthropic-direct": async () => {
          throw new Error("must not dispatch");
        },
        bedrock: async () => {
          throw new Error("must not dispatch");
        },
        vertex: async () => {
          throw new Error("must not dispatch");
        },
        cerebras: async () => {
          throw new Error("must not dispatch");
        },
        local: async () => {
          throw new Error("must not dispatch");
        },
      },
      now: () => NOW,
      // no budget seam
    });
    await expect(bare(billablePlan())).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("§10.1: AMBIGUOUS after dispatch RETAINS the hold as a RECONCILIATION_HOLD", async () => {
    const h = pipelineHarness({
      outcomes: [
        { kind: "AMBIGUOUS", dispatched: true, errorCode: "socket-drop" },
      ],
    });
    await expect(h.dispatch(billablePlan())).rejects.toBeInstanceOf(
      AmbiguousCharge,
    );
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    expect(w.reservedUsd).toBe(usdToMicros("0.10")); // money still locked
    expect(w.disputedUsd).toBe(usdToMicros("0.10"));
    const r = [...h.f.state.reservations.values()][0]!;
    expect(r.state).toBe("RECONCILIATION_HOLD");
    // And the sweeper can never free it, even long after expiry.
    const sweep = await sweepExpired(
      h.f.db,
      new Date(NOW.getTime() + 86_400_000),
    );
    expect(sweep.expiredReservationIds).toHaveLength(0);
    expect(
      h.f.state.windows.get("entity:GSE:daily:2026-07-22")!.reservedUsd,
    ).toBe(usdToMicros("0.10"));
  });

  it("§10.1: every route failing CLEANLY releases the whole hold", async () => {
    const h = pipelineHarness({
      outcomes: [
        { kind: "FAILED", dispatched: true, errorCode: "http-500" },
        { kind: "FAILED", dispatched: true, errorCode: "http-500" },
      ],
    });
    await expect(h.dispatch(billablePlan())).rejects.toBeInstanceOf(
      ProviderUnavailable,
    );
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    expect(w.reservedUsd).toBe(0n);
    expect(w.releasedUsd).toBe(usdToMicros("0.10"));
    expect([...h.f.state.reservations.values()][0]!.state).toBe("RELEASED");
  });

  it("non-billable modes never touch the budget store", async () => {
    const h = pipelineHarness({ outcomes: [OK] });
    // CONFIRMED_CREDITS_ONLY doesn't reserve against the CASH budget store —
    // but with directive §11.3's credit admission (PR #166) now merged, this
    // harness's `deps.creditStore`/`deps.creditPort` are unset, so the
    // pipeline fails closed with PolicyBlocked BEFORE ever reaching a budget
    // reservation. Either way the assertion this test exists to prove holds:
    // the budget store is never touched for this mode.
    await expect(
      h.dispatch(
        billablePlan({
          costMode: "CONFIRMED_CREDITS_ONLY",
          fundingLabel: "CREDIT_ELIGIBLE_UNCONFIRMED",
          maxVendorCashUsd: 0,
        }),
      ),
    ).rejects.toThrow(PolicyBlocked);
    expect(h.f.state.reservations.size).toBe(0);
  });

  it("§10.7: a wired token pricer settles the REAL actual, not the ceiling", async () => {
    const seen: Parameters<AttemptActualPricer>[0][] = [];
    const h = pipelineHarness({
      outcomes: [OK],
      priceActual: (usage) => {
        seen.push(usage);
        return "0.012345";
      },
    });
    const outcome = await h.dispatch(billablePlan());
    expect(outcome.kind).toBe("COMPLETED");
    // The pricer saw the attempt's REAL usage.
    expect(seen).toEqual([
      {
        providerUsed: "anthropic-direct",
        modelResolved: "test-model",
        inputTokens: 10,
        outputTokens: 10,
      },
    ]);
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    expect(w.reservedUsd).toBe(0n);
    expect(w.provisionalUsd).toBe(usdToMicros("0.012345")); // token-priced
    expect(h.incidents).toHaveLength(0);
    const r = [...h.f.state.reservations.values()][0]!;
    expect(r.state).toBe("PROVISIONALLY_SETTLED");
  });

  it("§10.2: a token-priced actual ABOVE the hold trips OVERAGE_LOCKED through the PRODUCTION pipeline", async () => {
    const h = pipelineHarness({
      outcomes: [OK],
      priceActual: () => "0.250000", // hold is 0.10 (2 routes × 0.05)
    });
    const outcome = await h.dispatch(billablePlan());
    // The paid success is never converted into an error by the overage.
    expect(outcome.kind).toBe("COMPLETED");
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    expect(w.state).toBe("OVERAGE_LOCKED"); // circuit breaker
    expect(w.provisionalUsd).toBe(usdToMicros("0.25")); // REAL charge preserved
    expect(h.incidents).toHaveLength(1);
    expect(h.incidents[0]!.kind).toBe("BUDGET_OVERAGE_LOCKED");
  });

  it("§10.7: a pricer that cannot price (null) falls back to the CONSERVATIVE ceiling", async () => {
    const h = pipelineHarness({ outcomes: [OK], priceActual: () => null });
    const outcome = await h.dispatch(billablePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind === "COMPLETED") {
      expect(outcome.telemetryStatus).toBe("OK");
    }
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    expect(w.provisionalUsd).toBe(usdToMicros("0.05")); // per-attempt ceiling
  });

  it("§10.7: a THROWING pricer degrades telemetry and settles the ceiling — never an error, never an under-count", async () => {
    const h = pipelineHarness({
      outcomes: [OK],
      priceActual: () => {
        throw new Error("pricing table unavailable");
      },
    });
    const outcome = await h.dispatch(billablePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind === "COMPLETED") {
      expect(outcome.telemetryStatus).toBe("DEGRADED");
    }
    const w = h.f.state.windows.get("entity:GSE:daily:2026-07-22")!;
    expect(w.provisionalUsd).toBe(usdToMicros("0.05")); // conservative fallback
  });

  it("§10.4: provider per-attempt minimums RAISE the reserved worst case at the pipeline call site", async () => {
    const h = pipelineHarness({
      outcomes: [OK],
      providerMinimumUsd: { "anthropic-direct": "0.300000" },
    });
    await h.dispatch(billablePlan());
    const r = [...h.f.state.reservations.values()][0]!;
    // max(0.05, 0.30) + 0.05 for the second billable route.
    expect(r.amountUsd).toBe(usdToMicros("0.35"));
  });

  it("§10.4: the control-plane minimum registry is wired by DEFAULT and honestly empty (no invented prices)", () => {
    expect(Object.isFrozen(CONTROL_PLANE_PROVIDER_MINIMUM_USD)).toBe(true);
    expect(Object.keys(CONTROL_PLANE_PROVIDER_MINIMUM_USD)).toHaveLength(0);
    // With the registry as-is, the estimate equals the plain per-route sum —
    // the moment a real vendor minimum lands in the registry, both production
    // call sites pick it up with no further wiring.
    expect(
      estimateAttemptPlanWorstCaseUsd({
        routes: ["anthropic-direct", "bedrock"],
        perAttemptCeilingUsd: "0.05",
        pricingVersion: CONTROL_PLANE_PRICING_VERSION,
        providerMinimumUsd: CONTROL_PLANE_PROVIDER_MINIMUM_USD,
      }),
    ).toBe("0.100000");
  });
});

// ─── 8. §10.8 credit port ────────────────────────────────────────────────────

describe("§10.8 CONFIRMED_CREDITS_ONLY requires a real credit adapter", () => {
  function executorDeps(
    overrides: Partial<SealedAiExecutorDependencies> = {},
  ): SealedAiExecutorDependencies {
    return {
      env: { AI_ENV_CLASS: "test", LLM_COST_MODE: "CONFIRMED_CREDITS_ONLY" },
      now: () => NOW,
      policies: { getTaskPolicy },
      receipts: failClosedReceiptStore,
      recordBlocked: async () => {},
      dispatch: async (plan) => ({
        kind: "COMPLETED",
        invocationId: `inv:${plan.request.requestId}`,
        output: { ok: true },
        attempts: [],
        telemetryStatus: "OK",
        replayed: false,
      }),
      // What PRODUCTION seals: the fail-closed port.
      credit: failClosedCreditAuthorizationPort,
      ...overrides,
    };
  }

  const request: AiTaskInvocationRequest = {
    taskClass: "brief.daily-summary",
    requestId: "req-credit-0001",
    actor: ACTOR,
    entity: "GSE",
    input: { user: "summarize", maxTokens: 32 },
  };

  it("is UNREACHABLE with the production fail-closed port — every method refuses", async () => {
    const executor = createAiExecutor(executorDeps());
    await expect(executor.executeAiTask(request)).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
    await expect(
      failClosedCreditAuthorizationPort.settleProvisional("x", "1", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    await expect(
      failClosedCreditAuthorizationPort.reconcile("x", "1", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    await expect(
      failClosedCreditAuthorizationPort.release("x", NOW),
    ).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("consumes an injected adapter (S5 seam): authorizeAndReserve gates dispatch", async () => {
    const authorized: string[] = [];
    const port: CreditAuthorizationPort = {
      authorizeAndReserve: async (req) => {
        authorized.push(req.requestId);
        return {
          creditReservationId: "credit-1",
          requestId: req.requestId,
          grantAllocationRef: "grant:test",
          heldUsd: req.worstCaseUsd,
        };
      },
      settleProvisional: async () => {},
      reconcile: async () => {},
      release: async () => {},
    };
    const executor = createAiExecutor(executorDeps({ credit: port }));
    const result = await executor.executeAiTask(request);
    expect(result.status).toBe("SUCCEEDED");
    expect(authorized).toEqual(["req-credit-0001"]);
    // A refusing adapter blocks BEFORE the dispatch seam.
    const refusing = createAiExecutor(
      executorDeps({
        credit: {
          ...port,
          authorizeAndReserve: async () => {
            throw new BudgetBlocked("insufficient confirmed credits");
          },
        },
        dispatch: async () => {
          throw new Error("must not dispatch");
        },
      }),
    );
    await expect(refusing.executeAiTask(request)).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
  });

  it("§10.3 executor gate: a billable mode with a zero cap is refused before dispatch", async () => {
    const cashPolicy: AiTaskPolicyDefinition = {
      ...getTaskPolicy("brief.daily-summary"),
      permittedModes: ["BUDGETED_CASH"],
      maxVendorCashUsd: 0,
    };
    const executor = createAiExecutor(
      executorDeps({
        env: { AI_ENV_CLASS: "test", LLM_COST_MODE: "BUDGETED_CASH" },
        policies: { getTaskPolicy: () => cashPolicy },
        dispatch: async () => {
          throw new Error("must not dispatch");
        },
      }),
    );
    await expect(executor.executeAiTask(request)).rejects.toBeInstanceOf(
      BudgetBlocked,
    );
  });
});
