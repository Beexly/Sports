import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Cron route for player-stats ingestion: CRON_SECRET auth, season validation,
 * and the NFL-season helper. The ingestion itself is mocked (covered by
 * ingest-player-stats.test.ts) so this never touches the network or DB.
 */

vi.mock("@/lib/ingestion/player-stats", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/player-stats")>();
  return { ...actual, ingestPlayerWeeklyStats: vi.fn() };
});

import { GET } from "@/app/api/cron/refresh-player-stats/route";
import { ingestPlayerWeeklyStats, currentNflSeason } from "@/lib/ingestion/player-stats";

function req(url: string, auth?: string): Request {
  return new Request(url, auth ? { headers: { authorization: auth } } : undefined);
}

describe("currentNflSeason", () => {
  it("uses the calendar year from September onward", () => {
    expect(currentNflSeason(new Date("2025-09-10T00:00:00Z"))).toBe(2025);
    expect(currentNflSeason(new Date("2025-12-31T00:00:00Z"))).toBe(2025);
  });
  it("uses the prior year before September", () => {
    expect(currentNflSeason(new Date("2025-03-01T00:00:00Z"))).toBe(2024);
    expect(currentNflSeason(new Date("2025-08-31T00:00:00Z"))).toBe(2024);
  });
});

describe("GET /api/cron/refresh-player-stats", () => {
  beforeEach(() => {
    (ingestPlayerWeeklyStats as Mock).mockReset();
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

  it("runs the ingestion and returns its summary when authorized", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok", season: 2024, playersUpserted: 2, statsUpserted: 4,
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; statsUpserted: number };
    expect(body.success).toBe(true);
    expect(body.statsUpserted).toBe(4);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(2024);
  });

  it("502s when the ingestion reports a non-ok status", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "source-error", season: 2024, playersUpserted: 0, statsUpserted: 0, error: "down",
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"));
    expect(res.status).toBe(502);
  });
});
