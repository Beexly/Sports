import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stale-Data Kill Switch — executed behavior for /api/picks.
 *
 * The gate defaults ON. With an explicit FORCE_NO_BET_IF_STALE=false override,
 * the route serves picks without a freshness query:
 * the freshness query must never even run. With the gate on, a "stale" latest
 * successful ingestion (per the shared 240m Refresh SLA) must collapse the
 * public surface to the same dark/collecting 503 the bootstrap gate returns,
 * while a fresh run serves normally.
 *
 * Follows the executed-handler + vi.mock("@sports/db") pattern from
 * health-route.test.ts and the auth/entitlements mock pattern from
 * board-state-confidence-gate.test.ts.
 */

const mocks = vi.hoisted(() => ({
  forceNoBetIfStale: false,
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickCount: vi.fn<(args?: unknown) => Promise<number>>(),
  ingestionRunFindFirst:
    vi.fn<(args: unknown) => Promise<{ completedAt: Date | null } | null>>(),
  ingestionRunFindMany: vi.fn(),
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Record<string, unknown>>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany, count: mocks.pickCount },
    ingestionRun: {
      findFirst: mocks.ingestionRunFindFirst,
      findMany: mocks.ingestionRunFindMany,
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

// Keep bootstrapGateResponse real so the 503 body shape is the genuine one;
// only the readiness gates are controllable per test.
vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePublicPicks: true,
      forceNoBetIfStale: mocks.forceNoBetIfStale,
    }),
  };
});

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

async function callPicks(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/route");
  const req = new Request("http://localhost/api/picks");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/picks — stale-data kill switch", () => {
  beforeEach(() => {
    mocks.forceNoBetIfStale = false;
    mocks.pickFindMany.mockReset().mockResolvedValue([]);
    mocks.pickCount.mockReset().mockResolvedValue(0);
    mocks.ingestionRunFindFirst.mockReset();
    mocks.ingestionRunFindMany.mockReset().mockResolvedValue([
      { sport: "americanfootball_nfl", completedAt: minutesAgo(10) },
    ]);
    // Anonymous viewer keeps the path simple (no entitlements lookup).
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flag OFF: serves picks and never queries ingestion freshness", async () => {
    mocks.forceNoBetIfStale = false;
    // Even a wildly stale ingestion is irrelevant when the flag is off.
    mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10_000) });

    const { status, body } = await callPicks();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    // The freshness query must not run when the kill switch is off — this is
    // the byte-for-byte "no behavior change" guarantee.
    expect(mocks.ingestionRunFindFirst).not.toHaveBeenCalled();
  });

  it("flag ON + stale: goes dark with a DISTINCT stale_data 503 (not the bootstrap body)", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(241) });

    const { status, body } = await callPicks();

    expect(status).toBe(503);
    // 2026-07-10 incident lesson: the stale branch used to reuse the bootstrap
    // body, making "env flags regressed" and "awaiting fresh data" externally
    // indistinguishable. The discriminator is part of the contract now.
    expect(body["reason"]).toBe("stale_data");
    expect(body["bootstrapMode"]).toBe(false);
    expect(body["error"]).toContain("awaiting fresh odds data");
    // Suppressed: the picks query never ran.
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
  });

  it("flag ON + never-succeeded ingestion is treated as stale (503)", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.ingestionRunFindFirst.mockResolvedValue(null);

    const { status, body } = await callPicks();

    expect(status).toBe(503);
    expect(body["reason"]).toBe("stale_data");
    expect(body["bootstrapMode"]).toBe(false);
  });

  it("flag ON + fresh: serves picks normally", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10) });

    const { status, body } = await callPicks();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    expect(mocks.ingestionRunFindFirst).toHaveBeenCalledOnce();
    // G4: freshness only counts a run that actually inserted odds, so an
    // empty-but-200 SUCCESS run (oddsInserted=0) can never mask staleness.
    expect(mocks.ingestionRunFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "SUCCESS", oddsInserted: { gt: 0 } }),
      }),
    );
    expect(mocks.pickFindMany).toHaveBeenCalled();
    expect(mocks.pickFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          game: expect.objectContaining({
            sport: { key: expect.objectContaining({ in: ["americanfootball_nfl"] }) },
          }),
        }),
      }),
    );
  });

  it("flag ON + DB error on freshness query: fails CLOSED (suppresses picks)", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.ingestionRunFindFirst.mockRejectedValue(new Error("db down"));

    const { status, body } = await callPicks();

    expect(status).toBe(503);
    expect(body["reason"]).toBe("stale_data");
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
  });
});
