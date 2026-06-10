import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

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
  // R-12 gave the route a NextRequest param (per-IP rate limiting).
  const res = (await mod.GET(
    new NextRequest("http://localhost/api/picks/daily-slate")
  )) as unknown as Response;
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
});
