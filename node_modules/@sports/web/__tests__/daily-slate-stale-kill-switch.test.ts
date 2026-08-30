import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stale-Data Kill Switch — executed behavior for /api/picks/daily-slate.
 *
 * Additive, env-gated, DEFAULT OFF. The /picks page fetches this slate
 * alongside /api/picks, so it gets the SAME kill switch: with
 * FORCE_NO_BET_IF_STALE off (forceNoBetIfStale = false) the route counts
 * picks and stamps a fresh lastUpdatedAt exactly as before — the freshness
 * query must never even run. With the gate ON, a "stale" latest successful
 * ingestion (per the shared 240m Refresh SLA) must collapse the slate to
 * zeroed counts with lastUpdatedAt: null (no fake "updated now"), while a
 * fresh run serves normally. A DB blip on the freshness query fails OPEN.
 *
 * Mirrors picks-stale-kill-switch.test.ts and the daily-slate-route.test.ts
 * vi.mock("@sports/db") + readiness-gates patterns.
 */

const mocks = vi.hoisted(() => ({
  forceNoBetIfStale: false,
  pickCount: vi.fn<(args?: unknown) => Promise<number>>(),
  // The route's non-demo path also derives totalGames via
  // db.pick.findMany({ distinct: ["gameId"] }); the mock must be shape-complete
  // or the route throws synchronously ("findMany is not a function") before its
  // own .catch() can engage.
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  // `isSignalBoardSlateStale` (lib/data-reliability/public-freshness-gate.ts:108)
  // makes two `db.pick.findFirst` calls. Without this, it throws, and the route's
  // deliberate `.catch(() => false)` fail-open swallows the throw into "fresh" —
  // so the kill switch silently did nothing and the surface returned 200.
  // Default null = no recent published pick and no upcoming one = signal slate
  // stale, which is the state these tests intend.
  pickFindFirst: vi.fn<(args?: unknown) => Promise<unknown>>(),
  ingestionRunFindFirst:
    vi.fn<(args: unknown) => Promise<{ completedAt: Date | null } | null>>(),
  isPublicPicksSurfaceStale: vi.fn<() => Promise<boolean>>(),
  isStubMode: vi.fn<() => boolean>(),
  isDemoPicksEnabled: vi.fn<() => boolean>(),
  getSamplePicks: vi.fn<() => unknown[]>(),
}));

// This file's subject is not rate limiting, and its @sports/db mock has no
// $queryRawUnsafe / isStubMode surface for the durable limiter. Allow-all so
// the code under test decides the response; the limiter itself is covered by
// api-p9-04 / api-p9-05 / b2b-rate-limit.
vi.mock("@/lib/api/public-form-rate-limit", () => ({
  consumePublicFormRateLimit: vi.fn(async () => ({ ok: true, backend: "memory" })),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { count: mocks.pickCount, findMany: mocks.pickFindMany, findFirst: mocks.pickFindFirst },
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
  },
  isStubMode: mocks.isStubMode,
  isDemoPicksEnabled: mocks.isDemoPicksEnabled,
  getSamplePicks: mocks.getSamplePicks,
}));

// isPublicPicksSurfaceStale is the freshness gate the route calls directly.
// Mock it per board-no-bet-detail.test.ts:34-36 precedent: the real
// implementation now routes through resolveBoardSurface dual-mode logic and
// may call db.pick.findFirst (unmocked shape here), causing false non-stale
// resolution. Drive staleness through the gate directly instead.
vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: () => mocks.isPublicPicksSurfaceStale(),
}));

// Keep readiness real except for the two gates this route reads, so the
// canExposePerformanceStats path stays genuine and only staleness is steered.
vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: false,
      // These cases isolate the STALE kill switch, so the public-picks gate
      // must be open — otherwise the route short-circuits to its 503 and the
      // staleness behaviour under test never runs. This was previously
      // absent (and harmless) only because daily-slate never checked
      // canExposePublicPicks; that omission was the bug. Gate-closed
      // behaviour lives in public-picks-gate-parity.test.ts.
      canExposePublicPicks: true,
      forceNoBetIfStale: mocks.forceNoBetIfStale,
    }),
  };
});

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

async function callSlate(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/daily-slate/route");
  const req = new Request("http://localhost/api/picks/daily-slate");
  const res = (await mod.GET(req as unknown as Parameters<typeof mod.GET>[0])) as unknown as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/picks/daily-slate — stale-data kill switch", () => {
  beforeEach(() => {
    mocks.forceNoBetIfStale = false;
    // Non-demo, non-stub: the route's normal \"real data\" path. The count is the
    // only DB read; give it a non-zero value so suppression is observable.
    mocks.pickCount.mockReset().mockResolvedValue(3);
    mocks.pickFindMany.mockReset().mockResolvedValue([]);
    mocks.pickFindFirst.mockReset().mockResolvedValue(null);
    mocks.ingestionRunFindFirst.mockReset();
    mocks.isPublicPicksSurfaceStale.mockReset();
    mocks.isStubMode.mockReset().mockReturnValue(false);
    mocks.isDemoPicksEnabled.mockReset().mockReturnValue(false);
    mocks.getSamplePicks.mockReset().mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flag OFF: serves the slate and never queries ingestion freshness", async () => {
    mocks.forceNoBetIfStale = false;
    // Even a wildly stale ingestion is irrelevant when the flag is off.
    mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesAgo(10_000) });

    const { status, body } = await callSlate();
    const data = body["data"] as Record<string, unknown>;

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    expect(data["totalPicks"]).toBe(3);
    // A fresh timestamp is stamped on the normal path.
    expect(data["lastUpdatedAt"]).not.toBeNull();
    // The freshness query must not run when the kill switch is off — this is
    // the byte-for-byte "no behavior change" guarantee.
    expect(mocks.isPublicPicksSurfaceStale).not.toHaveBeenCalled();
    expect(mocks.pickCount).toHaveBeenCalled();
  });

  it("flag ON + stale: returns a zeroed slate with no fresh timestamp", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.isPublicPicksSurfaceStale.mockResolvedValue(true);

    const { status, body } = await callSlate();
    const data = body["data"] as Record<string, unknown>;

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    expect(data["totalPicks"]).toBe(0);
    expect(data["freePickCount"]).toBe(0);
    expect(data["premiumPickCount"]).toBe(0);
    expect(data["sportBreakdown"]).toEqual([]);
    // No fake "updated now" while suppressed.
    expect(data["lastUpdatedAt"]).toBeNull();
    // Suppressed: the pick-count query never ran.
    expect(mocks.pickCount).not.toHaveBeenCalled();
  });

  it("flag ON + never-succeeded ingestion is treated as stale (zeroed slate)", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.isPublicPicksSurfaceStale.mockResolvedValue(true);

    const { status, body } = await callSlate();
    const data = body["data"] as Record<string, unknown>;

    expect(status).toBe(200);
    expect(data["totalPicks"]).toBe(0);
    expect(data["lastUpdatedAt"]).toBeNull();
    expect(mocks.pickCount).not.toHaveBeenCalled();
  });

  it("flag ON + fresh: serves the slate normally", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);

    const { status, body } = await callSlate();
    const data = body["data"] as Record<string, unknown>;

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    expect(data["totalPicks"]).toBe(3);
    expect(data["lastUpdatedAt"]).not.toBeNull();
    expect(mocks.isPublicPicksSurfaceStale).toHaveBeenCalledOnce();
    expect(mocks.pickCount).toHaveBeenCalled();
  });

  it("flag ON + DB error on freshness query: fails OPEN (serves the slate)", async () => {
    mocks.forceNoBetIfStale = true;
    mocks.isPublicPicksSurfaceStale.mockRejectedValue(new Error("db down"));

    const { status, body } = await callSlate();
    const data = body["data"] as Record<string, unknown>;

    // A transient freshness-query blip must not black out a surface — health
    // enforces staleness separately.
    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    expect(data["totalPicks"]).toBe(3);
    expect(data["lastUpdatedAt"]).not.toBeNull();
    expect(mocks.pickCount).toHaveBeenCalled();
  });
});
