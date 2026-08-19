import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/performance — minimum-sample floor (honesty guard).
 *
 * The route publishes a real win rate over settled (non-bootstrap, non-seed)
 * picks. Publishing "66.7%" off 3 settled picks is misleading, so an additive,
 * default-SAFE floor withholds the rate until the settled count reaches
 * MIN_SETTLED_PICKS_FOR_LEARNING (default 100, read via getReadinessGates()).
 *
 *   - Below the floor: overall.winRate === null, every bySport[].winRate ===
 *     null, and meta insufficientSample === true. Counts stay visible (facts);
 *     only the derived rate is withheld. This is the SAME null-winRate shape
 *     the route already emits for an empty sample, so the policy-only-winrate
 *     contract (which allow-lists this route) is unaffected.
 *   - At/above the floor: behavior is unchanged — the rate is present.
 *
 * GSE-SEC-031: the route now uses a server-side SQL aggregation
 * (db.$queryRaw with GROUP BY) instead of findMany loading every pick row.
 * The mock returns pre-aggregated (sport, result, count) rows — exactly what
 * the production query produces.
 *
 * Mirrors the executed-handler + vi.mock("@sports/db") pattern from
 * picks-stale-kill-switch.test.ts.
 */

const mocks = vi.hoisted(() => ({
  minSettledPicksForLearning: 100,
  queryRaw: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    $queryRaw: mocks.queryRaw,
  },
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: mocks.minSettledPicksForLearning,
    }),
  };
});

/**
 * Build pre-aggregated rows for one sport with the given win/loss/push
 * counts. This is the shape the SQL GROUP BY query returns.
 */
function aggRows(
  wins: number,
  losses: number,
  pushes: number,
  sportName = "NFL"
): Array<{ sport: string; result: string; count: number }> {
  const rows: Array<{ sport: string; result: string; count: number }> = [];
  if (wins > 0) rows.push({ sport: sportName, result: "WIN", count: wins });
  if (losses > 0) rows.push({ sport: sportName, result: "LOSS", count: losses });
  if (pushes > 0) rows.push({ sport: sportName, result: "PUSH", count: pushes });
  return rows;
}

/** Multi-sport fixture: 120 MLB picks (66 win/54 loss) + 7 NBA picks (0 win/7 loss). */
function multiSportRows(): Array<{ sport: string; result: string; count: number }> {
  return [
    { sport: "MLB", result: "WIN", count: 66 },
    { sport: "MLB", result: "LOSS", count: 54 },
    { sport: "NBA", result: "LOSS", count: 7 },
  ];
}

async function callPerformance(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/performance/route");
  const req = new Request("http://localhost/api/performance");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

type PerfData = {
  overall: { wins: number; losses: number; pushes: number; total: number; winRate: number | null };
  bySport: Array<{ sport: string; winRate: number | null; total: number }>;
  insufficientSample: boolean;
};

describe("/api/performance — minimum-sample floor", () => {
  beforeEach(() => {
    mocks.minSettledPicksForLearning = 100;
    mocks.queryRaw.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("below floor: withholds the win rate (null) and flags insufficientSample", async () => {
    // 3 settled picks, 2 wins — would otherwise read "66.7%".
    mocks.queryRaw.mockResolvedValue(aggRows(2, 1, 0));

    const { status, body } = await callPerformance();
    expect(status).toBe(200);

    const data = body["data"] as PerfData;
    expect(data.insufficientSample).toBe(true);
    expect(data.overall.winRate).toBeNull();
    // Counts remain visible — only the rate is withheld.
    expect(data.overall.wins).toBe(2);
    expect(data.overall.losses).toBe(1);
    // Per-sport rates suppressed too.
    for (const s of data.bySport) {
      expect(s.winRate).toBeNull();
    }
  });

  it("at the floor: publishes the win rate normally", async () => {
    // Exactly 100 settled picks, 60 wins → 60.0%.
    mocks.queryRaw.mockResolvedValue(aggRows(60, 40, 0));

    const { status, body } = await callPerformance();
    expect(status).toBe(200);

    const data = body["data"] as PerfData;
    expect(data.insufficientSample).toBe(false);
    expect(data.overall.winRate).toBe(60);
    expect(data.bySport[0]?.winRate).toBe(60);
  });

  it("above the floor: publishes the win rate normally", async () => {
    // 150 settled picks, 81 wins → 54.0%.
    mocks.queryRaw.mockResolvedValue(aggRows(81, 69, 0));

    const { status, body } = await callPerformance();
    expect(status).toBe(200);

    const data = body["data"] as PerfData;
    expect(data.insufficientSample).toBe(false);
    expect(data.overall.winRate).toBe(54);
  });

  it("per-sport: withholds a thin slice's rate even when the GLOBAL sample clears the floor", async () => {
    // 120 MLB (over the floor) + 7 NBA (below it). Global = 127 >= 100, so
    // insufficientSample is false and MLB shows a rate — but NBA's "0% on 7"
    // must NOT publish; its count stays visible.
    mocks.queryRaw.mockResolvedValue(multiSportRows());

    const { body } = await callPerformance();
    const data = body["data"] as PerfData;

    expect(data.insufficientSample).toBe(false);
    const mlb = data.bySport.find((s) => s.sport === "MLB")!;
    const nba = data.bySport.find((s) => s.sport === "NBA")!;
    expect(mlb.winRate).toBe(55); // 66/120
    expect(nba.total).toBe(7); // count still shown (factual)
    expect(nba.winRate).toBeNull(); // rate withheld — 7 is below the floor
  });

  it("empty sample stays null (unchanged) and is flagged insufficient", async () => {
    mocks.queryRaw.mockResolvedValue([]);

    const { status, body } = await callPerformance();
    expect(status).toBe(200);

    const data = body["data"] as PerfData;
    expect(data.overall.winRate).toBeNull();
    expect(data.insufficientSample).toBe(true);
  });

  it("GSE-SEC-031: query uses SQL GROUP BY (not findMany) — one row per sport+result, not one per pick", async () => {
    mocks.queryRaw.mockResolvedValue(aggRows(2, 1, 0));

    await callPerformance();

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    // The raw SQL query must contain a GROUP BY clause — the hallmark of the
    // server-side aggregation that replaced the unbounded findMany.
    const callArg = mocks.queryRaw.mock.calls[0][0];
    const sqlString = typeof callArg === "string" ? callArg : String(callArg);
    expect(sqlString).toMatch(/GROUP BY/i);
    expect(sqlString).toMatch(/s\.name/i); // groups by sport name
    expect(sqlString).toMatch(/p\.result/i); // and by result
  });
});
