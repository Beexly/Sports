import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Edge cases for the stub Prisma pick model.
 *
 * The samples are designed to never produce a misleading record state.
 * These tests lock down the "what if" cases — empty filters, mixed
 * status, take/skip, orderBy ignored.
 */

async function freshDb(): Promise<typeof import("@sports/db")> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  return await import("@sports/db");
}

describe("stub Prisma pick — edge cases", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
  });

  it("findMany with take: 0 returns []", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({ take: 0 });
    expect(rows).toEqual([]);
  });

  it("findMany with take: 3 returns exactly 3 picks", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({ take: 3 });
    expect(rows).toHaveLength(3);
  });

  it("findMany with isFeatured filter narrows to featured picks only", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({ where: { isFeatured: true } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(rows.every((r: any) => r.isFeatured === true)).toBe(true);
  });

  it("count with result.in containing PENDING still returns sample count", async () => {
    const { db, SAMPLE_PICK_COUNT } = await freshDb();
    const n = await db.pick.count({
      where: { result: { in: ["PENDING", "WIN"] } },
    });
    expect(n).toBe(SAMPLE_PICK_COUNT);
  });

  it("count with result.in only settled statuses returns 0", async () => {
    const { db } = await freshDb();
    const n = await db.pick.count({
      where: { result: { in: ["WIN", "LOSS", "PUSH"] } },
    });
    expect(n).toBe(0);
  });

  it("findMany with result.in only settled statuses returns []", async () => {
    const { db } = await freshDb();
    const rows = await db.pick.findMany({
      where: { result: { in: ["WIN", "LOSS", "PUSH"] } },
    });
    expect(rows).toEqual([]);
  });

  it("count with isPublished: false returns 0 (samples are published)", async () => {
    const { db } = await freshDb();
    const n = await db.pick.count({ where: { isPublished: false } });
    expect(n).toBe(0);
  });

  it("count with no where clause returns sample count", async () => {
    const { db, SAMPLE_PICK_COUNT } = await freshDb();
    const n = await db.pick.count();
    expect(n).toBe(SAMPLE_PICK_COUNT);
  });

  it("aggregate returns shape-correct zeros even with sample data", async () => {
    const { db } = await freshDb();
    const out = await db.pick.aggregate({ _avg: { confidence: true } });
    expect(out).toEqual({ _avg: {}, _sum: {}, _min: {}, _max: {}, _count: 0 });
  });

  it("groupBy returns [] (no per-status groupings in stub mode)", async () => {
    const { db } = await freshDb();
    const out = await db.pick.groupBy({ by: ["pickGrade"] });
    expect(out).toEqual([]);
  });

  it("create returns { id: 'stub' } — write is a no-op", async () => {
    const { db } = await freshDb();
    const r = await db.pick.create({ data: {} as never });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((r as any).id).toBe("stub");
  });

  it("deleteMany returns { count: 0 }", async () => {
    const { db } = await freshDb();
    const r = await db.pick.deleteMany({ where: {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((r as any).count).toBe(0);
  });

  it("returns picks consistently on multiple calls (deterministic)", async () => {
    const { db } = await freshDb();
    const a = await db.pick.findMany({});
    const b = await db.pick.findMany({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((a as any[]).map((p) => p.id)).toEqual((b as any[]).map((p) => p.id));
  });
});

describe("sample-picks integrity", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
  });

  it("every pick has a unique id within the slate", async () => {
    const { getSamplePicks } = await freshDb();
    const picks = getSamplePicks();
    const ids = picks.map((p) => p.id);
    expect(new Set(ids).size).toBe(picks.length);
  });

  it("every pick has a unique gameId within the slate (no two picks on the same game)", async () => {
    const { getSamplePicks } = await freshDb();
    const picks = getSamplePicks();
    const gids = picks.map((p) => p.gameId);
    expect(new Set(gids).size).toBe(picks.length);
  });

  it("commenceTime is always in the future relative to generatedAt", async () => {
    const { getSamplePicks } = await freshDb();
    for (const p of getSamplePicks()) {
      expect(p.game.commenceTime.getTime()).toBeGreaterThan(p.generatedAt.getTime());
    }
  });

  it("confidence is always between 50 and 100 (no negative / null edge cases)", async () => {
    const { getSamplePicks } = await freshDb();
    for (const p of getSamplePicks()) {
      expect(p.confidence).toBeGreaterThanOrEqual(50);
      expect(p.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("dataQualityScore stays in 0–100", async () => {
    const { getSamplePicks } = await freshDb();
    for (const p of getSamplePicks()) {
      expect(p.dataQualityScore).toBeGreaterThanOrEqual(0);
      expect(p.dataQualityScore).toBeLessThanOrEqual(100);
    }
  });
});
