import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Cron route for nflverse player-data ingestion: CRON_SECRET auth, season
 * validation, the season helper, and aggregation across the three ingestions
 * (weekly stats, snap counts, injuries). The ingestions are mocked (covered by
 * their own tests) so this never touches the network or DB.
 */

vi.mock("@/lib/ingestion/player-stats", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/player-stats")>();
  return { ...actual, ingestPlayerWeeklyStats: vi.fn() };
});
vi.mock("@/lib/ingestion/snap-counts", () => ({ ingestSnapCounts: vi.fn() }));
vi.mock("@/lib/ingestion/injuries", () => ({ ingestInjuries: vi.fn() }));
vi.mock("@/lib/ingestion/depth-charts", () => ({ ingestDepthCharts: vi.fn() }));
vi.mock("@/lib/ingestion/next-gen-stats", () => ({ ingestNextGenStats: vi.fn() }));

import { GET } from "@/app/api/cron/refresh-player-stats/route";
import { ingestPlayerWeeklyStats, currentNflSeason } from "@/lib/ingestion/player-stats";
import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";

function req(url: string, auth?: string): Request {
  return new Request(url, auth ? { headers: { authorization: auth } } : undefined);
}

describe("currentNflSeason", () => {
  it("uses the calendar year from September onward", () => {
    expect(currentNflSeason(new Date("2025-09-10T00:00:00Z"))).toBe(2025);
    expect(currentNflSeason(new Date("2025-12-31T00:00:00Z"))).toBe(2025);
  });
  it("uses the prior year before September", () => {
    expect(currentNflSeason(new Date("2027-03-01T00:00:00Z"))).toBe(2026);
    expect(currentNflSeason(new Date("2027-08-31T00:00:00Z"))).toBe(2026);
  });
});

describe("GET /api/cron/refresh-player-stats", () => {
  beforeEach(() => {
    (ingestPlayerWeeklyStats as Mock).mockReset();
    (ingestSnapCounts as Mock).mockReset();
    (ingestInjuries as Mock).mockReset();
    (ingestDepthCharts as Mock).mockReset();
    (ingestSnapCounts as Mock).mockResolvedValue({ status: "ok", season: 2024, rowsWritten: 2 });
    (ingestInjuries as Mock).mockResolvedValue({ status: "ok", season: 2024, rowsWritten: 1 });
    (ingestDepthCharts as Mock).mockResolvedValue({ status: "ok", season: 2024, rowsWritten: 3 });
    (ingestNextGenStats as Mock).mockReset();
    (ingestNextGenStats as Mock).mockImplementation((season: number, statType: string) =>
      Promise.resolve({ status: "ok", season, statType, rowsWritten: 5 }),
    );
    vi.stubEnv("CRON_SECRET", "secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("401s without the bearer secret", async () => {
    const res = await GET(req("http://x/api/cron/refresh-player-stats"));
    expect(res.status).toBe(401);
    expect(ingestPlayerWeeklyStats).not.toHaveBeenCalled();
  });

  it("500s when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
    expect(res.status).toBe(500);
  });

  it("400s on an invalid season override", async () => {
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=1850", "Bearer secret"));
    expect(res.status).toBe(400);
    expect(ingestPlayerWeeklyStats).not.toHaveBeenCalled();
  });

  it("runs all three player-data ingestions and aggregates the summary", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok", season: 2024, playersUpserted: 2, statsUpserted: 4,
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      stats: { statsUpserted: number };
      snaps: { rowsWritten: number };
      injuries: { rowsWritten: number };
      depth: { rowsWritten: number };
    };
    expect(body.success).toBe(true);
    expect(body.stats.statsUpserted).toBe(4);
    expect(body.snaps.rowsWritten).toBe(2);
    expect(body.injuries.rowsWritten).toBe(1);
    expect(body.depth.rowsWritten).toBe(3);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(2024);
    expect(ingestSnapCounts).toHaveBeenCalledWith(2024);
    expect(ingestInjuries).toHaveBeenCalledWith(2024);
    expect(ingestDepthCharts).toHaveBeenCalledWith(2024);
    // Next Gen Stats persist for all three variants.
    expect(ingestNextGenStats).toHaveBeenCalledWith(2024, "passing");
    expect(ingestNextGenStats).toHaveBeenCalledWith(2024, "receiving");
    expect(ingestNextGenStats).toHaveBeenCalledWith(2024, "rushing");
    const ngsBody = body as unknown as { ngs: { passing: { rowsWritten: number } } };
    expect(ngsBody.ngs.passing.rowsWritten).toBe(5);
  });

  it("502s when any ingestion reports a non-ok status", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "source-error", season: 2024, playersUpserted: 0, statsUpserted: 0, error: "down",
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"));
    expect(res.status).toBe(502);
  });

  it("502s when an NGS variant reports a non-ok status", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok", season: 2024, playersUpserted: 2, statsUpserted: 4,
    });
    (ingestNextGenStats as Mock).mockImplementation((season: number, statType: string) =>
      Promise.resolve(
        statType === "rushing"
          ? { status: "source-error", season, statType, rowsWritten: 0, error: "down" }
          : { status: "ok", season, statType, rowsWritten: 5 },
      ),
    );
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"));
    expect(res.status).toBe(502);
  });
});
