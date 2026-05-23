import { beforeEach, describe, expect, it, vi } from "vitest";

async function callRoute(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  const mod = await import(path);
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("Phase 2 board APIs", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["PERFORMANCE_STATS_ENABLED"] = "false";
  });

  it("/api/board/state returns live strip and Gate Cam lanes in demo mode", async () => {
    const { status, body } = await callRoute("@/app/api/board/state/route");
    expect(status).toBe(200);
    expect(body["success"]).toBe(true);

    const data = body["data"] as Record<string, unknown>;
    expect(data["sportsWatched"]).toBeGreaterThan(0);
    expect(data["booksPolled"]).toBe(14);
    expect(Array.isArray(data["scoringNow"])).toBe(true);
    expect(Array.isArray(data["publishedToday"])).toBe(true);
    expect(Array.isArray(data["gatedTodayRows"])).toBe(true);
  }, 15_000);

  it("/api/board/passes returns pass reasons without publishing fake picks", async () => {
    const { body } = await callRoute("@/app/api/board/passes/route");
    const data = body["data"] as Record<string, unknown>;
    const passes = data["passes"] as Array<Record<string, unknown>>;
    expect(passes.length).toBeGreaterThan(0);
    expect(passes.every((row) => typeof row["reason"] === "string")).toBe(true);
  });
});

describe("Phase 2 public calibration API", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["PERFORMANCE_STATS_ENABLED"] = "false";
  });

  it("returns a collecting state while public performance is gated", async () => {
    const { status, body } = await callRoute("@/app/api/calibration/route");
    expect(status).toBe(200);
    expect(body["success"]).toBe(true);

    const data = body["data"] as Record<string, unknown>;
    const meta = body["meta"] as Record<string, unknown>;
    expect(meta["gated"]).toBe(true);
    expect(data["sampleSize"]).toBe(0);
    expect(data["isCollecting"]).toBe(true);
    expect(data["publicMessage"]).toMatch(/Building calibration history/);
  });
});
