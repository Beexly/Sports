import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mocks = vi.hoisted(() => ({
  pickCount: vi.fn<(args?: unknown) => Promise<number>>(),
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  promotionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  ingestionRunFindFirst: vi.fn<(args: unknown) => Promise<unknown>>(),
  isStubMode: vi.fn<() => boolean>(),
  isDemoPicksEnabled: vi.fn<() => boolean>(),
  getSamplePicks: vi.fn<() => unknown[]>(),
  canExposePerformanceStats: true,
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { count: mocks.pickCount, findMany: mocks.pickFindMany },
    promotion: { findMany: mocks.promotionFindMany },
    game: { findUnique: mocks.gameFindUnique },
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
  },
  isStubMode: mocks.isStubMode,
  isDemoPicksEnabled: mocks.isDemoPicksEnabled,
  getSamplePicks: mocks.getSamplePicks,
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: mocks.canExposePerformanceStats,
      forceNoBetIfStale: false,
    }),
  };
});

function repoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("public outage states", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
    }
    mocks.canExposePerformanceStats = true;
    mocks.isStubMode.mockReturnValue(false);
    mocks.isDemoPicksEnabled.mockReturnValue(false);
    mocks.getSamplePicks.mockReturnValue([]);
  });

  it("daily slate returns an uncached outage instead of a fresh empty slate", async () => {
    mocks.pickCount.mockRejectedValue(new Error("connection refused"));
    vi.resetModules();
    const { GET } = await import("@/app/api/picks/daily-slate/route");
    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body["reason"]).toBe("backend_outage");
    expect(String(body["error"])).not.toContain("connection refused");
  });

  it("daily slate serves real counts when primary reads succeed", async () => {
    mocks.pickCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    mocks.pickFindMany.mockResolvedValue([
      { gameId: "g1", game: { sport: { name: "NFL" } } },
    ]);
    vi.resetModules();
    const { GET } = await import("@/app/api/picks/daily-slate/route");
    const response = await GET();
    const body = (await response.json()) as { data: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.data["totalPicks"]).toBe(3);
    expect(body.data["totalGames"]).toBe(1);
  });

  it("calibration distinguishes a failed read from deliberate collecting", async () => {
    mocks.pickFindMany.mockRejectedValue(new Error("db down"));
    vi.resetModules();
    const route = await import("@/app/api/calibration/route");
    const outage = await route.GET();
    expect(outage.status).toBe(503);
    expect((await outage.json()).reason).toBe("backend_outage");

    mocks.canExposePerformanceStats = false;
    vi.resetModules();
    const gatedRoute = await import("@/app/api/calibration/route");
    const gated = await gatedRoute.GET();
    const gatedBody = await gated.json();
    expect(gated.status).toBe(200);
    expect(gatedBody.data.isCollecting).toBe(true);
    expect(gatedBody.data.readFailed).toBeUndefined();
  });

  it("calibration loader remains render-safe with a failure discriminator", async () => {
    mocks.pickFindMany.mockRejectedValue(new Error("db down"));
    vi.resetModules();
    const { loadPublicCalibrationReport } = await import("@/lib/calibration/report");
    const payload = await loadPublicCalibrationReport();

    expect(payload.data.readFailed).toBe(true);
    expect(payload.data.isCollecting).toBe(true);
  });

  it("promotions returns an uncached outage instead of cacheable empty offers", async () => {
    mocks.promotionFindMany.mockRejectedValue(new Error("db down"));
    vi.resetModules();
    const route = await import("@/app/api/promotions/route");
    const response = await route.GET(
      new Request("http://localhost/api/promotions") as unknown as Parameters<typeof route.GET>[0],
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.reason).toBe("backend_outage");
  });

  it("promotions preserves the genuine empty-list response", async () => {
    mocks.promotionFindMany.mockResolvedValue([]);
    vi.resetModules();
    const route = await import("@/app/api/promotions/route");
    const response = await route.GET(
      new Request("http://localhost/api/promotions") as unknown as Parameters<typeof route.GET>[0],
    );
    expect(response.status).toBe(200);
  });

  it("game-room loader throws on outage but returns null for a missing game", async () => {
    mocks.gameFindUnique.mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce(null);
    vi.resetModules();
    const { loadGameRoom } = await import("@/lib/game-room/load");

    await expect(loadGameRoom("game-1")).rejects.toThrow("db down");
    await expect(loadGameRoom("missing")).resolves.toBeNull();
  });

  it("model court maps loader failure to the named outage response", () => {
    const source = repoFile("apps/web/app/api/room/[gameId]/model-court/route.ts");
    expect(source).toMatch(/catch[\s\S]{0,250}backendOutageResponse\("Model Court"\)/);
  });

  it("proof ledger retains its existing unreachable-state contract", async () => {
    mocks.pickFindMany.mockRejectedValue(new Error("db down"));
    vi.resetModules();
    const { loadProofOfRecord } = await import("@/lib/proof/load-proof-of-record");
    const payload = await loadProofOfRecord();

    expect(payload.ledgerUnreachable).toBe(true);
    expect(payload.generatedAt).toBe("");
    expect(payload.merkleRoot).toBe("");
  });

  it("production probe classifies calibration outages by name", () => {
    const source = repoFile("scripts/prod-probe.mjs");
    expect(source).toContain("validateCalibrationGate");
    expect(source).toMatch(/validateCalibrationGate[\s\S]{0,500}backend_outage/);
  });
});
