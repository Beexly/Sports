import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Stub Prisma client invariants.
 *
 * The stub kicks in when DATABASE_URL is unset or sentinel. When
 * DEMO_PICKS_ENABLED=true the pick model returns the deterministic
 * 10-pick sample slate; otherwise everything is empty.
 */

async function freshDb(): Promise<typeof import("@sports/db")> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  return await import("@sports/db");
}

describe("stub Prisma — pick model with DEMO_PICKS_ENABLED=true", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["FORCE_REAL_PRISMA"] = "";
  });

  it("findMany returns the full sample slate when no filter is applied", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({});
    expect(rows.length).toBeGreaterThanOrEqual(8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((rows[0] as any).result).toBe("PENDING");
  });

  it("findMany returns empty when isBootstrap=true (samples are non-bootstrap)", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({ where: { isBootstrap: true } });
    expect(rows).toEqual([]);
  });

  it("count returns the sample count when result is PENDING / unspecified", async () => {
    const mod = await freshDb();
    const a = await mod.db.pick.count({ where: { result: "PENDING", isPublished: true } });
    expect(a).toBe(mod.SAMPLE_PICK_COUNT);
    const b = await mod.db.pick.count({ where: { isPublished: true } });
    expect(b).toBe(mod.SAMPLE_PICK_COUNT);
  });

  it("count returns 0 for settled results (samples never settle)", async () => {
    const { db } = await freshDb();
    for (const r of ["WIN", "LOSS", "PUSH", "VOID"] as const) {
      const n = await db.pick.count({ where: { result: r, isPublished: true } });
      expect(n).toBe(0);
    }
  });

  it("count returns 0 for bootstrap picks", async () => {
    const { db } = await freshDb();
    const n = await db.pick.count({ where: { isBootstrap: true } });
    expect(n).toBe(0);
  });

  it("isStubMode() is true after first DB call", async () => {
    const mod = await freshDb();
    await mod.db.pick.count({});
    expect(mod.isStubMode()).toBe(true);
    expect(mod.isDemoPicksEnabled()).toBe(true);
  });
});

describe("stub Prisma — pick model with DEMO_PICKS_ENABLED=false", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "false";
    process.env["FORCE_REAL_PRISMA"] = "";
  });

  it("findMany returns empty", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({});
    expect(rows).toEqual([]);
  });

  it("count returns 0", async () => {
    const { db } = await freshDb();
    const n = await db.pick.count({ where: { isPublished: true } });
    expect(n).toBe(0);
  });
});

describe("stub Prisma — non-pick models always empty", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["FORCE_REAL_PRISMA"] = "";
  });

  it("game.aggregate returns shape-correct empty", async () => {
    const { db } = await freshDb();
    const out = await db.game.aggregate({ _avg: { dataQualityScore: true } });
    expect(out).toEqual({ _avg: {}, _sum: {}, _min: {}, _max: {}, _count: 0 });
  });

  it("ingestionRun.findFirst returns null", async () => {
    const { db } = await freshDb();
    const out = await db.ingestionRun.findFirst({});
    expect(out).toBeNull();
  });

  it("cockpitTask.groupBy returns []", async () => {
    const { db } = await freshDb();
    const out = await db.cockpitTask.groupBy({ by: ["status"], _count: { _all: true } });
    expect(out).toEqual([]);
  });
});
