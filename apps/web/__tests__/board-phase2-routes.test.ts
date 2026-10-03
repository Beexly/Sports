import { beforeEach, describe, expect, it, vi } from "vitest";

// The board/state route checks the session to gate confidence values.
// These tests exercise the anonymous path, so auth resolves to null.
vi.mock("@/lib/auth", () => ({ auth: async () => null }));

async function callRoute(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  const mod = await import(path);
  const req = new Request("http://localhost/");
  const res = (await mod.GET(req as unknown as Parameters<typeof mod.GET>[0])) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("Phase 2 board APIs", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["PERFORMANCE_STATS_ENABLED"] = "false";
  });

  it("/api/board/state suppresses demo rows in public demo mode", async () => {
    const { status, body } = await callRoute("@/app/api/board/state/route");
    expect(status).toBe(200);
    expect(body["success"]).toBe(true);

    const data = body["data"] as Record<string, unknown>;
    const meta = body["meta"] as Record<string, unknown>;
    expect(meta["suppressedDemoData"]).toBe(true);
    expect(data["sportsWatched"]).toBe(0);
    expect(data["booksPolled"]).toBe(0);
    expect(data["openPicks"]).toBe(0);
    expect(data["gatedToday"]).toBe(0);
    expect(data["scoringNow"]).toEqual([]);
    expect(data["publishedToday"]).toEqual([]);
    expect(data["gatedTodayRows"]).toEqual([]);
  }, 15_000);

  it("/api/board/passes suppresses fake pass reasons in public demo mode", async () => {
    const { body } = await callRoute("@/app/api/board/passes/route");
    const data = body["data"] as Record<string, unknown>;
    const meta = body["meta"] as Record<string, unknown>;
    const passes = data["passes"] as Array<Record<string, unknown>>;
    expect(meta["suppressedDemoData"]).toBe(true);
    expect(passes).toEqual([]);
  });
});

describe("Phase 2 public calibration API", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["PERFORMANCE_STATS_ENABLED"] = "false";
    delete process.env["CALIBRATION_JSON_PUBLIC"];
  });

  // The public/private surface doctrine (2026-09-28) moved /api/calibration
  // behind the internal-surface fence, so the route is dark by DEFAULT. The
  // intent this test originally protected is unchanged and still holds a
  // fortiori: no calibration number can reach an unauthenticated caller,
  // whether the route 404s (default) or 200s (founder opt-in).
  //
  // The asserting style is preserved deliberately — a 404 body that leaked
  // "sampleSize: 0" would still be a leak, and this catches that.
  it("never exposes a calibration number to an anonymous caller while gated", async () => {
    const { status, body } = await callRoute("@/app/api/calibration/route");
    expect([200, 404]).toContain(status);

    // Nothing numeric survives in either shape.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/sampleSize"?\s*:\s*[1-9]/);
    expect(serialized).not.toMatch(/"(ece|brier|logLoss)"\s*:\s*[0-9.]/);
    expect(serialized).not.toMatch(/"(winningBins|binCounts)"\s*:/);
  });

  it("stays dark by default; the founder opt-in restores the collecting state", async () => {
    const dark = await callRoute("@/app/api/calibration/route");
    expect(dark.status).toBe(404);
    expect(dark.body["reason"]).toBe("internal_surface");

    process.env["CALIBRATION_JSON_PUBLIC"] = "true";
    const lit = await callRoute("@/app/api/calibration/route");
    expect(lit.status).toBe(200);
    expect(lit.body["success"]).toBe(true);

    const data = lit.body["data"] as Record<string, unknown>;
    const meta = lit.body["meta"] as Record<string, unknown>;
    expect(meta["gated"]).toBe(true);
    expect(data["sampleSize"]).toBe(0);
    expect(data["isCollecting"]).toBe(true);
    expect(data["publicMessage"]).toMatch(/Building calibration history/);
  });
});
