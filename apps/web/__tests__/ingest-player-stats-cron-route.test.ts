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

/** "ok" but nothing persisted — the source has no rows for the season yet. */
function emptyOkResult(season: number): Record<string, unknown> {
  return { status: "ok", season, playersUpserted: 0, statsUpserted: 0 };
}

function sourceErrorResult(season: number): Record<string, unknown> {
  return { status: "source-error", season, playersUpserted: 0, statsUpserted: 0, error: "HTTP 404" };
}

interface CronBody {
  success: boolean;
  mode: string;
  season: number;
  result?: { status: string; statsUpserted: number };
  firstAttempt: { season: number; result: { status: string; statsUpserted: number } } | null;
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
    expect(body.firstAttempt).toBeNull(); // rows persisted → no fallback ran
    expect(body.backfill?.complete).toBe(false);
    expect(body.backfill?.missingSeasons).toEqual(WINDOW.filter((s) => s !== CURRENT));
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(CURRENT - 1);
  });

  it("falls back to the next-newest missing season when the newest yields zero rows (rollover guard)", async () => {
    // Rollover shape: the newest missing season has no published rows yet,
    // while an older season still needs backfilling. Missing = [C-3, C].
    mocks.findMany.mockResolvedValue(
      WINDOW.filter((s) => s !== CURRENT && s !== CURRENT - 3).map((season) => ({ season })),
    );
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) =>
      season === CURRENT ? emptyOkResult(season) : okResult(season),
    );

    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.mode).toBe("backfill");
    // Honest reporting of BOTH attempts: the zero-yield first pick is
    // preserved, and season/result describe the attempt the run stands on.
    expect(body.firstAttempt?.season).toBe(CURRENT);
    expect(body.firstAttempt?.result.statsUpserted).toBe(0);
    expect(body.season).toBe(CURRENT - 3);
    expect(body.result?.status).toBe("ok");
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(2);
    expect(ingestPlayerWeeklyStats).toHaveBeenNthCalledWith(1, CURRENT);
    expect(ingestPlayerWeeklyStats).toHaveBeenNthCalledWith(2, CURRENT - 3);
  });

  it("falls back when the newest missing season source-errors", async () => {
    mocks.findMany.mockResolvedValue(
      WINDOW.filter((s) => s !== CURRENT && s !== CURRENT - 3).map((season) => ({ season })),
    );
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) =>
      season === CURRENT ? sourceErrorResult(season) : okResult(season),
    );

    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200); // the run advanced the backfill
    const body = (await res.json()) as CronBody;
    expect(body.success).toBe(true);
    expect(body.firstAttempt?.season).toBe(CURRENT);
    expect(body.firstAttempt?.result.status).toBe("source-error");
    expect(body.season).toBe(CURRENT - 3);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(2);
  });

  it("caps at exactly ONE fallback per run even when it also yields nothing", async () => {
    // Three missing seasons; the two newest both come up empty. The third
    // (oldest) must NOT be attempted — one fallback is the budget cap.
    mocks.findMany.mockResolvedValue(
      WINDOW.filter((s) => s !== CURRENT && s !== CURRENT - 2 && s !== CURRENT - 4).map((season) => ({ season })),
    );
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => emptyOkResult(season));

    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.season).toBe(CURRENT - 2);
    expect(body.firstAttempt?.season).toBe(CURRENT);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(2);
    expect(ingestPlayerWeeklyStats).not.toHaveBeenCalledWith(CURRENT - 4);
  });

  it("does not fall back when the sole missing season yields nothing (pure rollover, nothing to starve)", async () => {
    mocks.findMany.mockResolvedValue(WINDOW.filter((s) => s !== CURRENT).map((season) => ({ season })));
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => emptyOkResult(season));

    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.season).toBe(CURRENT);
    expect(body.firstAttempt).toBeNull();
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
  });

  it("never falls back on a clearance denial — the gate is global", async () => {
    mocks.findMany.mockResolvedValue([]);
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "clearance-denied", season: CURRENT, playersUpserted: 0, statsUpserted: 0, blocks: ["SOURCE_BLOCKED"],
    });

    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(502);
    const body = (await res.json()) as CronBody;
    expect(body.success).toBe(false);
    expect(body.firstAttempt).toBeNull();
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
  });

  it("502s honestly when the fallback attempt also source-errors", async () => {
    mocks.findMany.mockResolvedValue([]);
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => sourceErrorResult(season));

    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(502);
    const body = (await res.json()) as CronBody;
    expect(body.success).toBe(false);
    expect(body.firstAttempt?.season).toBe(CURRENT);
    expect(body.season).toBe(CURRENT - 1);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(2);
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

  it("steady-state never falls back, even on a zero-row refresh (early-week is normal)", async () => {
    mocks.findMany.mockResolvedValue(WINDOW.map((season) => ({ season })));
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => emptyOkResult(season));
    const res = await GET(req("http://x/api/cron/ingest-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronBody;
    expect(body.mode).toBe("steady-state");
    expect(body.season).toBe(CURRENT);
    expect(body.firstAttempt).toBeNull();
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
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
