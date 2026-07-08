import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * /api/picks/daily-slate — behavioural tests.
 *
 * Verifies the daily-slate API returns demo-aware counts and never
 * leaks recentRecord while the performance gate is closed.
 */

async function callGet(): Promise<{
  status: number;
  body: {
    success: boolean;
    data: Record<string, unknown>;
    meta: Record<string, unknown>;
  };
}> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  const mod = await import("@/app/api/picks/daily-slate/route");
  const res = (await mod.GET()) as unknown as Response;
  return {
    status: res.status,
    body: (await res.json()) as {
      success: boolean;
      data: Record<string, unknown>;
      meta: Record<string, unknown>;
    },
  };
}

describe("/api/picks/daily-slate", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
  });

  it("returns 10 total pick count under stub+demo mode", async () => {
    const { status, body } = await callGet();
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data["totalPicks"]).toBe(10);
    expect(body.data["isSampleData"]).toBe(true);
  });

  it("free + premium count adds to total", async () => {
    const { body } = await callGet();
    const total = body.data["totalPicks"] as number;
    const free = body.data["freePickCount"] as number;
    const premium = body.data["premiumPickCount"] as number;
    expect(free + premium).toBe(total);
    expect(free).toBeGreaterThan(0);
    expect(premium).toBeGreaterThanOrEqual(0);
  });

  it("omits recentRecord when performance stats gate is closed", async () => {
    process.env["PERFORMANCE_STATS_ENABLED"] = "false";
    const { body } = await callGet();
    expect(body.data["recentRecord"]).toBeNull();
  });

  it("returns zero counts when demo is off", async () => {
    process.env["DEMO_PICKS_ENABLED"] = "false";
    const { body } = await callGet();
    expect(body.data["totalPicks"]).toBe(0);
    expect(body.data["freePickCount"]).toBe(0);
    expect(body.data["premiumPickCount"]).toBe(0);
    expect(body.data["isSampleData"]).toBe(false);
  });

  it("sportBreakdown counts real picks per sport (not just demo samples), sorted by count", async () => {
    process.env["DEMO_PICKS_ENABLED"] = "false";
    const { body } = await callGet();
    // Stub DB returns no picks → honest-empty breakdown, same shape as demo mode.
    expect(body.data["sportBreakdown"]).toEqual([]);

    // Demo mode still counts the sample picks by sport.
    process.env["DEMO_PICKS_ENABLED"] = "true";
    const demo = await callGet();
    const breakdown = demo.body.data["sportBreakdown"] as { sport: string; pickCount: number }[];
    expect(breakdown.length).toBeGreaterThan(0);
    const totalFromBreakdown = breakdown.reduce((sum, s) => sum + s.pickCount, 0);
    expect(totalFromBreakdown).toBe(demo.body.data["totalPicks"]);
    // Sorted by descending pickCount.
    for (let i = 1; i < breakdown.length; i++) {
      expect(breakdown[i - 1]!.pickCount).toBeGreaterThanOrEqual(breakdown[i]!.pickCount);
    }
  });
});
