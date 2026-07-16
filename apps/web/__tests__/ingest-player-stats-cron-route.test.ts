import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Self-driving player-stats ingestion cron (/api/cron/ingest-player-stats):
 * CRON_SECRET auth, manual season override, and the data-derived backfill
 * cursor — each run ingests exactly one season (newest missing first) until
 * the trend window is populated, then settles into a current-season refresh.
 * DB and ingestion are mocked; the planner logic runs for real.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<{ season: number }[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: { playerGameStat: { findMany: mocks.findMany } },
}));

vi.mock("@/lib/ingestion/player-stats", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/player-stats")>();
  return { ...actual, ingestPlayerWeeklyStats: vi.fn() };
});

import { GET } from "@/app/api/cron/ingest-player-stats/route";
import { ingestPlayerWeeklyStats, currentNflSeason } from "@/lib/ingestion/player-stats";
import { TREND_BACKFILL_SEASONS } from "@/lib/ingestion/player-stats-backfill";

const CURRENT = currentNflSeason(new Date());
const WINDOW: number[] = [];
for (let s = CURRENT - TREND_BACKFILL_SEASONS + 1; s <= CURRENT; s++) WINDOW.push(s);

function req(url: string, auth?: string): Request {
  return new Request(url, auth ? { headers: { authorization: auth } } : undefined);
}

function okResult(season: number): Record<string, unknown> {
  return { status: "ok", season, playersUpserted: 2, statsUpserted: 4 };
}

interface CronBody {
  success: boolean;
  mode: string;
  season: number;
  backfill?: { targetSeasons: number[]; missingSeasons: number[]; complete: boolean };
}

describe("GET /api/cron/ingest-player-stats", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue([]);
    (ingestPlayerWeeklyStats as Mock).mockReset();
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => okResult(season));
    vi.stubEnv("CRON_SECRET", "secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("401s without the bearer secret and never touches the DB or ingestion", async () => {
    const res = await GET(req("http://x/api/cron/ingest-player-stats"));
    expect(res.status).toBe(401);
    expect(ingestPlayerWeeklyStats).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("500s when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(500);
  });

  it("200s with the bearer secret", async () => {
    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
  });

  it("400s on an invalid manual season override", async () => {
    const res = await GET(req("http://x/api/cron/ingest-player-stats?season=1850", "Bearer secret"));
    expect(res.status).toBe(400);
    expect(ingestPlayerWeeklyStats).not.toHaveBeenCalled();
  });

  it("honors a manual ?season override without consulting the cursor", async () => {
    const res = await GET(req("http://x/api/cron/ingest-player-stats?season=2019", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.mode).toBe("manual");
    expect(body.season).toBe(2019);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(2019);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("backfills the newest missing season when the trend window has gaps", async () => {
    // Current season already ingested; everything older in the window missing.
    mocks.findMany.mockResolvedValue([{ season: CURRENT }]);
    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.mode).toBe("backfill");
    expect(body.season).toBe(CURRENT - 1);
    expect(body.backfill?.complete).toBe(false);
    expect(body.backfill?.missingSeasons).toEqual(WINDOW.filter((s) => s !== CURRENT));
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(CURRENT - 1);
  });

  it("switches to a steady-state current-season refresh once the window is full", async () => {
    mocks.findMany.mockResolvedValue(WINDOW.map((season) => ({ season })));
    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.mode).toBe("steady-state");
    expect(body.season).toBe(CURRENT);
    expect(body.backfill?.complete).toBe(true);
    expect(body.backfill?.missingSeasons).toEqual([]);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(CURRENT);
  });

  it("502s when the ingestion reports a non-ok status", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "source-error", season: CURRENT, playersUpserted: 0, statsUpserted: 0, error: "down",
    });
    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(502);
    const body = (await res.json()) as CronBody;
    expect(body.success).toBe(false);
  });
});
