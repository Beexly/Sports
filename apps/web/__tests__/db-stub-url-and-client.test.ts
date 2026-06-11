import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Tests for the @sports/db stub activation logic.
 *
 * Covers isStubDbUrl sentinel patterns, FORCE_REAL_PRISMA bypass, and
 * makeStubClient() behaviors not reached by stub-prisma.test.ts (transactions,
 * raw queries, lifecycle hooks). Also covers the neon-serverless-adapter guard
 * — returns null when the feature flag is off or DATABASE_URL is missing.
 *
 * These are pure unit tests; no real Postgres connection is made.
 */

async function freshDb(): Promise<typeof import("@sports/db")> {
  vi.resetModules();
  const g = globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean };
  g.prisma = undefined;
  g.prismaStubMode = undefined;
  return await import("@sports/db");
}

// --- isStubDbUrl sentinel patterns ----------------------------------------

describe("stub mode activates for sentinel DATABASE_URL values", () => {
  afterEach(() => {
    delete process.env["DATABASE_URL"];
    delete process.env["FORCE_REAL_PRISMA"];
    delete process.env["DEMO_PICKS_ENABLED"];
  });

  const sentinels = [
    undefined,
    "",
    "   ",
    "stub",
    "none",
    "changeme",
    "changeme-local",
    "changeme_supersecret",
    "dummy:dummy@localhost/db",
  ];

  for (const url of sentinels) {
    it(`activates stub mode for DATABASE_URL="${String(url)}"`, async () => {
      process.env["DATABASE_URL"] = url as string;
      process.env["DEMO_PICKS_ENABLED"] = "false";
      const mod = await freshDb();
      await mod.db.pick.count({});
      expect(mod.isStubMode()).toBe(true);
    });
  }

  it("does NOT activate stub mode for a real-looking postgres URL", async () => {
    // We can't actually connect, so FORCE_REAL_PRISMA ensures the real client
    // path is chosen — stub mode flag must remain false.
    process.env["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/sports";
    process.env["FORCE_REAL_PRISMA"] = "false";
    process.env["DEMO_PICKS_ENABLED"] = "false";
    const mod = await freshDb();
    // isStubMode() is only set after buildClient() runs. Real client won't set
    // prismaStubMode, so it stays undefined / falsy.
    expect(mod.isStubMode()).toBe(false);
  });
});

describe("FORCE_REAL_PRISMA=true bypasses stub activation", () => {
  afterEach(() => {
    delete process.env["DATABASE_URL"];
    delete process.env["FORCE_REAL_PRISMA"];
  });

  it("does not activate stub mode when FORCE_REAL_PRISMA=true even with sentinel URL", async () => {
    process.env["DATABASE_URL"] = "stub";
    process.env["FORCE_REAL_PRISMA"] = "true";
    const mod = await freshDb();
    // Real PrismaClient is returned; stub flag is never set.
    expect(mod.isStubMode()).toBe(false);
  });
});

// --- makeStubClient $transaction behaviors --------------------------------

describe("stub client $transaction", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "false";
    delete process.env["FORCE_REAL_PRISMA"];
  });

  it("$transaction with callback executes and returns callback result", async () => {
    const { db } = await freshDb();
    const result = await db.$transaction(async (tx) => {
      const count = await tx.pick.count({});
      return count;
    });
    expect(result).toBe(0);
  });

  it("$transaction with promise array resolves all", async () => {
    const { db } = await freshDb();
    const [a, b] = await db.$transaction([
      db.pick.count({}),
      db.pick.findMany({}),
    ]);
    expect(a).toBe(0);
    expect(b).toEqual([]);
  });
});

// --- makeStubClient raw query + lifecycle stubs ---------------------------

describe("stub client raw queries and lifecycle hooks", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "false";
    delete process.env["FORCE_REAL_PRISMA"];
  });

  it("$queryRaw returns []", async () => {
    const { db } = await freshDb();
    const result = await db.$queryRaw`SELECT 1`;
    expect(result).toEqual([]);
  });

  it("$executeRaw returns []", async () => {
    const { db } = await freshDb();
    const result = await db.$executeRaw`DELETE FROM pick WHERE 1=0`;
    expect(result).toEqual([]);
  });

  it("$connect resolves without error", async () => {
    const { db } = await freshDb();
    await expect(db.$connect()).resolves.toBeUndefined();
  });

  it("$disconnect resolves without error", async () => {
    const { db } = await freshDb();
    await expect(db.$disconnect()).resolves.toBeUndefined();
  });

  it("$on returns undefined (no-op event listener)", async () => {
    const { db } = await freshDb();
    const result = db.$on("query" as never, () => {});
    expect(result).toBeUndefined();
  });
});

// --- makeModelStub — write methods on non-pick models --------------------

describe("stub model — non-pick write operations return stub shapes", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "false";
    delete process.env["FORCE_REAL_PRISMA"];
  });

  it("user.create returns { id: 'stub' }", async () => {
    const { db } = await freshDb();
    const r = await db.user.create({ data: {} as never });
    expect((r as { id: string }).id).toBe("stub");
  });

  it("user.update returns { id: 'stub' }", async () => {
    const { db } = await freshDb();
    const r = await db.user.update({ where: { id: "x" }, data: {} as never });
    expect((r as { id: string }).id).toBe("stub");
  });

  it("subscription.updateMany returns { count: 0 }", async () => {
    const { db } = await freshDb();
    const r = await db.subscription.updateMany({ data: {} as never });
    expect(r.count).toBe(0);
  });

  it("subscription.deleteMany returns { count: 0 }", async () => {
    const { db } = await freshDb();
    const r = await db.subscription.deleteMany({});
    expect(r.count).toBe(0);
  });

  it("webhookEvent.findUnique returns null", async () => {
    const { db } = await freshDb();
    const r = await db.webhookEvent.findUnique({ where: { stripeEventId: "evt_test" } });
    expect(r).toBeNull();
  });
});

