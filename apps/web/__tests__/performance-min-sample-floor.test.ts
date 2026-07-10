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
 * Mirrors the executed-handler + vi.mock("@sports/db") pattern from
 * picks-stale-kill-switch.test.ts.
 */

const mocks = vi.hoisted(() => ({
  minSettledPicksForLearning: 100,
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany },
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

/** Build `count` settled picks for a single sport with `wins` wins. */
function settledPicks(count: number, wins: number, sportName = "NFL"): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      result: i < wins ? "WIN" : "LOSS",
      game: { sport: { name: sportName } },
    });
  }
  return out;
}

function pick(result: "WIN" | "LOSS" | "PUSH", sportName: string): unknown {
  return { result, game: { sport: { name: sportName } } };
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
    mocks.pickFindMany.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("below floor: withholds the win rate (null) and flags insufficientSample", async () => {
    // 3 settled picks, 2 wins — would otherwise read "66.7%".
    mocks.pickFindMany.mockResolvedValue(settledPicks(3, 2));

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
    mocks.pickFindMany.mockResolvedValue(settledPicks(100, 60));

    const { status, body } = await callPerformance();
    expect(status).toBe(200);

    const data = body["data"] as PerfData;
    expect(data.insufficientSample).toBe(false);
    expect(data.overall.winRate).toBe(60);
    expect(data.bySport[0]?.winRate).toBe(60);
  });

  it("above the floor: publishes the win rate normally", async () => {
    // 150 settled picks, 81 wins → 54.0%.
    mocks.pickFindMany.mockResolvedValue(settledPicks(150, 81));

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
    const rows = [
      ...Array.from({ length: 120 }, (_, i) => pick(i < 66 ? "WIN" : "LOSS", "MLB")),
      ...Array.from({ length: 7 }, () => pick("LOSS", "NBA")),
    ];
    mocks.pickFindMany.mockResolvedValue(rows);

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
    mocks.pickFindMany.mockResolvedValue([]);

    const { status, body } = await callPerformance();
    expect(status).toBe(200);

    const data = body["data"] as PerfData;
    expect(data.overall.winRate).toBeNull();
    expect(data.insufficientSample).toBe(true);
  });
});
