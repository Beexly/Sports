import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  requiresCashReservation,
  estimateWorstCaseUsd,
  reserve,
  settle,
  release,
  sweepExpired,
  type BudgetDb,
} from "@/lib/ai-control-plane/budget";
import { BudgetBlocked } from "@/lib/ai-control-plane/errors";
import { executeAiTask, type DispatchFn, type ExecuteAiTaskOptions } from "@/lib/ai-control-plane/execute";
import type { AiTaskRequest } from "@/lib/ai-control-plane/contracts";

/**
 * Phase 2 PR-C — atomic budget reservations.
 *
 * Two layers:
 *   1. UNIT (mock-level): the lane rule (which modes reserve vs skip), the
 *      fail-closed pricing gate, the settle/release arithmetic, multi-scope
 *      all-or-nothing rollback, sweepExpired's AMBIGUOUS exclusion, and the
 *      executeAiTask BUDGET_BLOCKED-with-no-dispatch path — all against an
 *      in-memory transactional fake.
 *   2. INTEGRATION (real Postgres, guarded by DATABASE_URL): the blueprint's
 *      named acceptance test — 100 concurrent reserve() against a cap that fits
 *      ~60 authorizes exactly the set that fits, refuses the rest, and the
 *      post-storm invariant reservedUsd + settledUsd <= capUsd holds. Atomicity
 *      is a DB property, so this MUST run against real Postgres.
 */

const NOW = new Date("2026-07-22T12:00:00.000Z");

// ───────────────────────────────────────────────────────────────────────────
// In-memory transactional fake for the BudgetDb raw-query surface. It models
// the two tables and interprets the exact statements budget.ts issues, with
// snapshot/restore in $transaction so a throw ROLLS BACK (matching Postgres) —
// which is what proves multi-scope all-or-nothing without a live DB.
// ───────────────────────────────────────────────────────────────────────────
interface FakeWindow {
  id: string;
  capUsd: number;
  reservedUsd: number;
  settledUsd: number;
}
interface FakeReservation {
  id: string;
  invocationId: string;
  windowId: string;
  amountUsd: number;
  state: string;
  settledUsd: number | null;
  expiresAt: Date;
}

function makeInMemoryBudgetDb() {
  const windows = new Map<string, FakeWindow>();
  const reservations = new Map<string, FakeReservation>();

  const seedWindow = (id: string, capUsd: number, reservedUsd = 0, settledUsd = 0) => {
    windows.set(id, { id, capUsd, reservedUsd, settledUsd });
  };

  const exec = async (query: string, ...values: unknown[]): Promise<number> => {
    const q = query;
    if (q.includes('INSERT INTO "ai_budget_reservations"')) {
      const [id, invocationId, windowId, amountUsd, , expiresAt] = values as [
        string,
        string,
        string,
        number,
        unknown,
        Date,
      ];
      reservations.set(id, {
        id,
        invocationId,
        windowId,
        amountUsd: Number(amountUsd),
        state: "HELD",
        settledUsd: null,
        expiresAt,
      });
      return 1;
    }
    if (q.includes('<= "capUsd"')) {
      // reserve conditional add: reservedUsd + settledUsd + amount <= capUsd
      const [amount, windowId] = values as [number, string];
      const w = windows.get(windowId);
      if (!w) return 0;
      if (w.reservedUsd + w.settledUsd + Number(amount) <= w.capUsd) {
        w.reservedUsd += Number(amount);
        return 1;
      }
      return 0;
    }
    if (q.includes('UPDATE "ai_budget_windows"') && q.includes('"settledUsd"')) {
      // settle window: reserved - $1, settled + $2, where id=$3
      const [amount, actual, windowId] = values as [number, number, string];
      const w = windows.get(windowId);
      if (!w) return 0;
      w.reservedUsd -= Number(amount);
      w.settledUsd += Number(actual);
      return 1;
    }
    if (q.includes('UPDATE "ai_budget_windows"') && q.includes('"reservedUsd" - $1::numeric')) {
      // release / sweep window subtract: reserved - $1 where id=$2
      const [amount, windowId] = values as [number, string];
      const w = windows.get(windowId);
      if (!w) return 0;
      w.reservedUsd -= Number(amount);
      return 1;
    }
    if (q.includes("SET \"state\" = 'SETTLED'")) {
      const [actual, id] = values as [number, string];
      const r = reservations.get(id);
      if (r && r.state === "HELD") {
        r.state = "SETTLED";
        r.settledUsd = Number(actual);
        return 1;
      }
      return 0;
    }
    if (q.includes("SET \"state\" = 'RELEASED'")) {
      const [id] = values as [string];
      const r = reservations.get(id);
      if (r && r.state === "HELD") {
        r.state = "RELEASED";
        return 1;
      }
      return 0;
    }
    if (q.includes("SET \"state\" = 'EXPIRED'")) {
      const [id] = values as [string];
      const r = reservations.get(id);
      if (r && r.state === "HELD") {
        r.state = "EXPIRED";
        return 1;
      }
      return 0;
    }
    throw new Error(`in-memory fake: unhandled exec SQL:\n${q}`);
  };

  const queryRaw = async <T,>(query: string, ...values: unknown[]): Promise<T> => {
    const q = query;
    if (
      q.includes('FROM "ai_budget_reservations"') &&
      q.includes('"id" = $1') &&
      q.includes("FOR UPDATE")
    ) {
      const [id] = values as [string];
      const r = reservations.get(id);
      return (r ? [{ windowId: r.windowId, amountUsd: String(r.amountUsd), state: r.state }] : []) as T;
    }
    if (q.includes("\"state\" = 'HELD'") && q.includes('"expiresAt" <= $1')) {
      const [now] = values as [Date];
      const out: Array<{ id: string; windowId: string; amountUsd: string; invocationId: string }> = [];
      for (const r of reservations.values()) {
        if (r.state === "HELD" && r.expiresAt <= now) {
          out.push({
            id: r.id,
            windowId: r.windowId,
            amountUsd: String(r.amountUsd),
            invocationId: r.invocationId,
          });
        }
      }
      return out as T;
    }
    throw new Error(`in-memory fake: unhandled query SQL:\n${q}`);
  };

  const snapshot = () => ({
    w: new Map([...windows].map(([k, v]) => [k, { ...v }])),
    r: new Map([...reservations].map(([k, v]) => [k, { ...v }])),
  });
  const restore = (snap: ReturnType<typeof snapshot>) => {
    windows.clear();
    for (const [k, v] of snap.w) windows.set(k, v);
    reservations.clear();
    for (const [k, v] of snap.r) reservations.set(k, v);
  };

  const db: BudgetDb = {
    $executeRawUnsafe: exec,
    $queryRawUnsafe: queryRaw,
    async $transaction<T>(fn: (tx: BudgetDb) => Promise<T>): Promise<T> {
      const snap = snapshot();
      try {
        return await fn(db);
      } catch (error) {
        restore(snap); // model Postgres ROLLBACK on throw
        throw error;
      }
    },
  };

  return { db, windows, reservations, seedWindow };
}

let seq = 0;
const seqId = () => `res-${seq++}`;
beforeEach(() => {
  seq = 0;
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — lane rule (which modes reserve vs skip)
// ═══════════════════════════════════════════════════════════════════════════
describe("lane rule — only billable modes reserve cash", () => {
  it("BUDGETED_CASH and EMERGENCY_RELIABILITY require a cash reservation", () => {
    expect(requiresCashReservation("BUDGETED_CASH")).toBe(true);
    expect(requiresCashReservation("EMERGENCY_RELIABILITY")).toBe(true);
  });
  it("NO_BILLABLE_EXTERNAL and CONFIRMED_CREDITS_ONLY skip reservation entirely", () => {
    expect(requiresCashReservation("NO_BILLABLE_EXTERNAL")).toBe(false);
    expect(requiresCashReservation("CONFIRMED_CREDITS_ONLY")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — fail-closed pricing gate
// ═══════════════════════════════════════════════════════════════════════════
describe("estimateWorstCaseUsd — fail closed on unknown pricing (billable modes)", () => {
  it("missing pricing version → BudgetBlocked", () => {
    expect(() => estimateWorstCaseUsd({ maxVendorCashUsd: 0.5 })).toThrow(BudgetBlocked);
    expect(() => estimateWorstCaseUsd({ maxVendorCashUsd: 0.5, pricingVersion: "  " })).toThrow(
      BudgetBlocked,
    );
  });
  it("unknown pricing version (against a known set) → BudgetBlocked", () => {
    expect(() =>
      estimateWorstCaseUsd({
        maxVendorCashUsd: 0.5,
        pricingVersion: "v9",
        knownPricingVersions: new Set(["v1"]),
      }),
    ).toThrow(BudgetBlocked);
  });
  it("recognized pricing version → returns the worst-case (maxVendorCashUsd) cap", () => {
    expect(
      estimateWorstCaseUsd({
        maxVendorCashUsd: 0.5,
        pricingVersion: "v1",
        knownPricingVersions: new Set(["v1"]),
      }),
    ).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — settle / release arithmetic + guards (in-memory transactional fake)
// ═══════════════════════════════════════════════════════════════════════════
describe("settle / release arithmetic and double-transition guards", () => {
  it("settle reduces reserved by the hold and adds the actual to settled", async () => {
    const { db, windows, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:a", 10);
    const r = await reserve(db, {
      windowIds: ["w:a"],
      amountUsd: 4,
      invocationId: "inv-1",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(windows.get("w:a")!.reservedUsd).toBe(4);

    await settle(db, r.reservations[0]!.reservationId, 1.5);
    const w = windows.get("w:a")!;
    expect(w.reservedUsd).toBe(0); // worst-case remainder released
    expect(w.settledUsd).toBe(1.5); // actual recorded
    expect(w.reservedUsd + w.settledUsd).toBeLessThanOrEqual(w.capUsd);
  });

  it("release reduces reserved and takes no settled", async () => {
    const { db, windows, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:a", 10);
    const r = await reserve(db, {
      windowIds: ["w:a"],
      amountUsd: 3,
      invocationId: "inv-1",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    await release(db, r.reservations[0]!.reservationId);
    const w = windows.get("w:a")!;
    expect(w.reservedUsd).toBe(0);
    expect(w.settledUsd).toBe(0);
  });

  it("double-settle and settle-after-release are guarded (BudgetBlocked)", async () => {
    const { db, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:a", 10);
    const r = await reserve(db, {
      windowIds: ["w:a"],
      amountUsd: 2,
      invocationId: "inv-1",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    const id = r.reservations[0]!.reservationId;
    await settle(db, id, 1);
    await expect(settle(db, id, 1)).rejects.toBeInstanceOf(BudgetBlocked);
    await expect(release(db, id)).rejects.toBeInstanceOf(BudgetBlocked);
  });

  it("settling an unknown reservation → BudgetBlocked", async () => {
    const { db } = makeInMemoryBudgetDb();
    await expect(settle(db, "nope", 1)).rejects.toBeInstanceOf(BudgetBlocked);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — multi-scope all-or-nothing rollback
// ═══════════════════════════════════════════════════════════════════════════
describe("multi-scope reserve — all-or-nothing (no partial holds)", () => {
  it("if the 2nd window is full, the 1st is rolled back and no reservation rows exist", async () => {
    const { db, windows, reservations, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:daily", 10); // room
    seedWindow("w:monthly", 1, 1); // already full (reserved 1 of cap 1)

    await expect(
      reserve(db, {
        windowIds: ["w:monthly", "w:daily"], // engine sorts → [w:daily, w:monthly]
        amountUsd: 1,
        invocationId: "inv-1",
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 60_000),
        idFactory: seqId,
      }),
    ).rejects.toBeInstanceOf(BudgetBlocked);

    // The first (daily) window's hold was rolled back.
    expect(windows.get("w:daily")!.reservedUsd).toBe(0);
    expect(windows.get("w:monthly")!.reservedUsd).toBe(1); // unchanged
    // No reservation rows leaked.
    expect(reservations.size).toBe(0);
  });

  it("when all windows fit, one HELD reservation exists per window", async () => {
    const { db, windows, reservations, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:daily", 10);
    seedWindow("w:monthly", 10);
    const r = await reserve(db, {
      windowIds: ["w:daily", "w:monthly"],
      amountUsd: 2,
      invocationId: "inv-1",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 60_000),
      idFactory: seqId,
    });
    expect(r.reservations).toHaveLength(2);
    expect(windows.get("w:daily")!.reservedUsd).toBe(2);
    expect(windows.get("w:monthly")!.reservedUsd).toBe(2);
    expect([...reservations.values()].every((x) => x.state === "HELD")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — sweepExpired: releases stale HELD, excludes AMBIGUOUS-linked
// ═══════════════════════════════════════════════════════════════════════════
describe("sweepExpired — safety net releases stale HELD but never an AMBIGUOUS one", () => {
  it("releases an expired HELD reservation and reclaims its window budget", async () => {
    const { db, windows, reservations, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:a", 10);
    await reserve(db, {
      windowIds: ["w:a"],
      amountUsd: 3,
      invocationId: "inv-stale",
      now: NOW,
      expiresAt: new Date(NOW.getTime() - 1_000), // already expired
      idFactory: seqId,
    });
    expect(windows.get("w:a")!.reservedUsd).toBe(3);

    const swept = await sweepExpired(db, NOW);
    expect(swept.releasedReservationIds).toHaveLength(1);
    expect(windows.get("w:a")!.reservedUsd).toBe(0);
    expect([...reservations.values()][0]!.state).toBe("EXPIRED");
  });

  it("excludes an AMBIGUOUS-linked invocation's reservation from the sweep", async () => {
    const { db, windows, reservations, seedWindow } = makeInMemoryBudgetDb();
    seedWindow("w:a", 10);
    await reserve(db, {
      windowIds: ["w:a"],
      amountUsd: 3,
      invocationId: "inv-ambiguous",
      now: NOW,
      expiresAt: new Date(NOW.getTime() - 1_000),
      idFactory: seqId,
    });

    const swept = await sweepExpired(db, NOW, { excludeInvocationIds: ["inv-ambiguous"] });
    expect(swept.releasedReservationIds).toHaveLength(0);
    // The hold is retained (an ambiguous charge holds until a receipt).
    expect(windows.get("w:a")!.reservedUsd).toBe(3);
    expect([...reservations.values()][0]!.state).toBe("HELD");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT — executeAiTask in a billable mode with an exhausted window
// ═══════════════════════════════════════════════════════════════════════════
function makeFakeLedgerDb() {
  const invocations = new Map<string, Record<string, unknown>>();
  const byKey = new Map<string, string>();
  const attempts = new Map<string, Record<string, unknown>>();
  const attributions: Array<Record<string, unknown>> = [];
  const key = (r: string, t: string) => `${r}::${t}`;
  const db = {
    aiInvocation: {
      async findUnique(a: { where: { requestId_taskClass: { requestId: string; taskClass: string } } }) {
        const { requestId, taskClass } = a.where.requestId_taskClass;
        const id = byKey.get(key(requestId, taskClass));
        return id ? { ...(invocations.get(id) as object) } : null;
      },
      async create(a: { data: Record<string, unknown> }) {
        const data: Record<string, unknown> = { telemetryStatus: "OK", ...a.data };
        invocations.set(data.id as string, data);
        byKey.set(key(data.requestId as string, data.taskClass as string), data.id as string);
        return { ...data };
      },
      async update(a: { where: { id: string }; data: Record<string, unknown> }) {
        const cur = invocations.get(a.where.id) ?? {};
        const next = { ...cur, ...a.data };
        invocations.set(a.where.id, next);
        return { ...next };
      },
    },
    aiAttempt: {
      async create(a: { data: Record<string, unknown> }) {
        attempts.set(a.data.id as string, { ...a.data });
        return { id: a.data.id as string };
      },
      async update(a: { where: { id: string }; data: Record<string, unknown> }) {
        attempts.set(a.where.id, { ...(attempts.get(a.where.id) ?? {}), ...a.data });
        return { id: a.where.id };
      },
    },
    aiFinancialAttribution: {
      async create(a: { data: Record<string, unknown> }) {
        attributions.push({ ...a.data });
        return { id: a.data.id as string };
      },
    },
  };
  return { db, invocations, attempts, attributions };
}

function billableTask(overrides: Partial<AiTaskRequest> = {}): AiTaskRequest {
  return {
    taskClass: "pick-explainer",
    surface: "journal",
    entity: "GSE",
    dataClassification: "PUBLIC",
    capabilityFloor: {
      reasoningTier: "standard",
      contextTokens: 8000,
      structuredOutput: false,
      toolUse: false,
      latencyClass: "interactive",
    },
    permittedProviders: ["anthropic-direct"],
    permittedModes: ["BUDGETED_CASH"],
    maxVendorCashUsd: 0.5,
    approvedSubstitutions: [],
    validation: { schemaRef: "pick-explainer.v1", numericGuard: true },
    retention: { retainPrompt: false, retainResponse: false },
    requestId: "req-billable-1",
    actor: { type: "SERVICE", subjectId: "worker:pick-explainer" },
    ...overrides,
  };
}

describe("executeAiTask (billable mode) — exhausted window ⇒ BUDGET_BLOCKED, no dispatch", () => {
  it("throws BudgetBlocked, never dispatches, and records status BUDGET_BLOCKED", async () => {
    const ledger = makeFakeLedgerDb();
    const budget = makeInMemoryBudgetDb();
    budget.seedWindow("w:full", 1, 1); // full: reserved 1 of cap 1

    let dispatchCalls = 0;
    const dispatch: DispatchFn = async (ctx) => {
      dispatchCalls += 1;
      return { kind: "SUCCEEDED", providerUsed: ctx.provider, modelResolved: "m", output: {} };
    };

    const opts: ExecuteAiTaskOptions = {
      db: ledger.db,
      now: () => NOW,
      // Test-injected env only — this does NOT enable BUDGETED_CASH in any deployment.
      env: { AI_ENV_CLASS: "production", LLM_COST_MODE: "BUDGETED_CASH" } as ExecuteAiTaskOptions["env"],
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      policyVersion: "test.v1",
      logger: () => {},
      dispatch,
      budgetDb: budget.db,
      budgetWindowIds: ["w:full"],
      pricingVersion: "v1",
      knownPricingVersions: new Set(["v1"]),
    };

    await expect(executeAiTask(billableTask(), opts)).rejects.toBeInstanceOf(BudgetBlocked);
    expect(dispatchCalls).toBe(0);
    const inv = [...ledger.invocations.values()][0]!;
    expect(inv.status).toBe("BUDGET_BLOCKED");
    // The window was never touched (the conditional update refused the hold).
    expect(budget.windows.get("w:full")!.reservedUsd).toBe(1);
  });

  it("missing pricing version fails closed for a billable mode (no dispatch)", async () => {
    const ledger = makeFakeLedgerDb();
    const budget = makeInMemoryBudgetDb();
    budget.seedWindow("w:ok", 100);
    let dispatchCalls = 0;
    const dispatch: DispatchFn = async (ctx) => {
      dispatchCalls += 1;
      return { kind: "SUCCEEDED", providerUsed: ctx.provider, modelResolved: "m", output: {} };
    };
    const opts: ExecuteAiTaskOptions = {
      db: ledger.db,
      now: () => NOW,
      env: { AI_ENV_CLASS: "production", LLM_COST_MODE: "BUDGETED_CASH" } as ExecuteAiTaskOptions["env"],
      idFactory: (() => {
        let n = 0;
        return () => `id-${n++}`;
      })(),
      logger: () => {},
      dispatch,
      budgetDb: budget.db,
      budgetWindowIds: ["w:ok"],
      // pricingVersion deliberately omitted → fail closed.
    };
    await expect(executeAiTask(billableTask(), opts)).rejects.toBeInstanceOf(BudgetBlocked);
    expect(dispatchCalls).toBe(0);
  });

  it("a non-billable lane (NO_BILLABLE_EXTERNAL) dispatches WITHOUT any reservation", async () => {
    const ledger = makeFakeLedgerDb();
    let dispatchCalls = 0;
    const dispatch: DispatchFn = async (ctx) => {
      dispatchCalls += 1;
      return { kind: "SUCCEEDED", providerUsed: ctx.provider, modelResolved: "m", output: { ok: true } };
    };
    const result = await executeAiTask(
      billableTask({ permittedModes: ["NO_BILLABLE_EXTERNAL"], permittedProviders: ["local"] }),
      {
        db: ledger.db,
        now: () => NOW,
        env: { AI_ENV_CLASS: "test" } as ExecuteAiTaskOptions["env"],
        idFactory: (() => {
          let n = 0;
          return () => `id-${n++}`;
        })(),
        logger: () => {},
        dispatch,
        // No budgetDb / budgetWindowIds needed — the lane skips reservation.
      },
    );
    expect(dispatchCalls).toBe(1);
    expect(result.status).toBe("SUCCEEDED");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION — real Postgres. The blueprint's named acceptance test.
// Skipped when DATABASE_URL is unset; run against the disposable Postgres.
// ═══════════════════════════════════════════════════════════════════════════
// The vitest setup forces DATABASE_URL="stub" for hermetic local runs unless
// FORCE_REAL_PRISMA=true. Only treat a real postgres URL as "has DB".
const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!HAS_DB)("[integration] atomic reservation against REAL Postgres", () => {
  // Lazily required so a DB-less unit run never loads @prisma/client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const url = new URL(process.env.DATABASE_URL as string);
    // Widen the pool so the 100-way storm exercises genuine concurrency.
    url.searchParams.set("connection_limit", "25");
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean the two tables (stale rows from prior sessions must not interfere).
    await prisma.$executeRawUnsafe('DELETE FROM "ai_budget_reservations"');
    await prisma.$executeRawUnsafe('DELETE FROM "ai_budget_windows"');
  });

  const seedWindow = async (id: string, capUsd: number, scopeKind = "SURFACE") => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ai_budget_windows" ("id","scopeKind","capUsd","reservedUsd","settledUsd","updatedAt")
       VALUES ($1,$2,$3::numeric,0,0,now())`,
      id,
      scopeKind,
      capUsd,
    );
  };
  const readWindow = async (id: string) => {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "capUsd"::text AS cap, "reservedUsd"::text AS reserved, "settledUsd"::text AS settled
         FROM "ai_budget_windows" WHERE "id" = $1`,
      id,
    )) as Array<{ cap: string; reserved: string; settled: string }>;
    const r = rows[0]!;
    return { cap: Number(r.cap), reserved: Number(r.reserved), settled: Number(r.settled) };
  };

  it("100 concurrent reserve() on a cap that fits 60 → exactly 60 authorized, invariant holds", async () => {
    const WINDOW = "monthly:2026-07:surface:pick-explainer";
    const CAP = 60;
    const AMOUNT = 1;
    const N = 100;
    await seedWindow(WINDOW, CAP);

    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        reserve(prisma, {
          windowIds: [WINDOW],
          amountUsd: AMOUNT,
          invocationId: `inv-${i}`,
          now: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        }),
      ),
    );

    const authorized = results.filter((r) => r.status === "fulfilled").length;
    const blocked = results.filter(
      (r) => r.status === "rejected" && (r.reason as Error) instanceof BudgetBlocked,
    ).length;
    const otherErrors = results.filter(
      (r) => r.status === "rejected" && !((r.reason as Error) instanceof BudgetBlocked),
    );

    const w = await readWindow(WINDOW);
    const heldCount = (
      (await prisma.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM "ai_budget_reservations" WHERE "windowId" = $1 AND "state" = 'HELD'`,
        WINDOW,
      )) as Array<{ n: number }>
    )[0]!.n;

    // eslint-disable-next-line no-console
    console.log(
      `\n[100-concurrent] cap=${CAP} amount=${AMOUNT} N=${N} → authorized=${authorized} ` +
        `blocked=${blocked} otherErrors=${otherErrors.length} | window.reserved=${w.reserved} ` +
        `settled=${w.settled} cap=${w.cap} heldRows=${heldCount} | invariant(reserved+settled<=cap)=${
          w.reserved + w.settled <= w.cap
        }\n`,
    );

    expect(otherErrors).toHaveLength(0);
    expect(authorized).toBe(CAP / AMOUNT); // exactly 60
    expect(blocked).toBe(N - CAP / AMOUNT); // the other 40
    expect(heldCount).toBe(CAP / AMOUNT);
    // The blueprint's post-storm invariant — proven against real Postgres.
    expect(w.reserved + w.settled).toBeLessThanOrEqual(w.cap);
    expect(w.reserved).toBe(CAP);
  });

  it("multi-scope all-or-nothing: 2nd window full ⇒ neither is held (1st rolls back)", async () => {
    await seedWindow("daily:2026-07-22:surface:pe", 10, "DAILY");
    // monthly is capacity 1 and we pre-fill it via a prior hold.
    await seedWindow("monthly:2026-07:surface:pe", 1, "MONTHLY");
    await reserve(prisma, {
      windowIds: ["monthly:2026-07:surface:pe"],
      amountUsd: 1,
      invocationId: "inv-prefill",
      now: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      reserve(prisma, {
        windowIds: ["monthly:2026-07:surface:pe", "daily:2026-07-22:surface:pe"],
        amountUsd: 1,
        invocationId: "inv-multi",
        now: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toBeInstanceOf(BudgetBlocked);

    const daily = await readWindow("daily:2026-07-22:surface:pe");
    expect(daily.reserved).toBe(0); // rolled back — no partial hold
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "ai_budget_reservations" WHERE "invocationId" = 'inv-multi'`,
    )) as Array<{ n: number }>;
    expect(rows[0]!.n).toBe(0);
  });

  it("settle reduces reserved + adds settled; release reduces reserved; double-settle guarded", async () => {
    await seedWindow("w:s", 100);
    const held = await reserve(prisma, {
      windowIds: ["w:s"],
      amountUsd: 5,
      invocationId: "inv-settle",
      now: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const id = held.reservations[0]!.reservationId;
    await settle(prisma, id, 2);
    let w = await readWindow("w:s");
    expect(w.reserved).toBe(0);
    expect(w.settled).toBe(2);
    expect(w.reserved + w.settled).toBeLessThanOrEqual(w.cap);
    await expect(settle(prisma, id, 2)).rejects.toBeInstanceOf(BudgetBlocked);

    const rel = await reserve(prisma, {
      windowIds: ["w:s"],
      amountUsd: 7,
      invocationId: "inv-release",
      now: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await release(prisma, rel.reservations[0]!.reservationId);
    w = await readWindow("w:s");
    expect(w.reserved).toBe(0); // released
    expect(w.settled).toBe(2); // unchanged by release
  });

  it("sweepExpired releases a stale HELD but not an AMBIGUOUS-excluded one", async () => {
    await seedWindow("w:sweep", 100);
    await reserve(prisma, {
      windowIds: ["w:sweep"],
      amountUsd: 3,
      invocationId: "inv-stale",
      now: new Date(),
      expiresAt: new Date(Date.now() - 1_000), // expired
    });
    await reserve(prisma, {
      windowIds: ["w:sweep"],
      amountUsd: 4,
      invocationId: "inv-ambiguous",
      now: new Date(),
      expiresAt: new Date(Date.now() - 1_000), // expired too
    });

    const swept = await sweepExpired(prisma, new Date(), {
      excludeInvocationIds: ["inv-ambiguous"],
    });
    expect(swept.releasedReservationIds).toHaveLength(1);
    const w = await readWindow("w:sweep");
    // Only the stale (3) was reclaimed; the ambiguous hold (4) stays reserved.
    expect(w.reserved).toBe(4);
  });
});
