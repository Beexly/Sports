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
import { ingestPlayerWeeklyStats, currentNflSeason, ingestionTargetNflSeason } from "@/lib/ingestion/player-stats";
import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";
import { CRON_MANIFEST } from "@/lib/ops/cron-schedule-manifest";
import { SATELLITE_DAILY_HOUR_UTC } from "@/lib/ingestion/satellite-window";

function req(url: string, auth?: string): Request {
  return new Request(url, auth ? { headers: { authorization: auth } } : undefined);
}

describe("currentNflSeason", () => {
  it("defaults to the completed REG floor, not a calendar rollover", () => {
    // currentNflSeason → resolveFootballStatsSeason with no hasRegRows probe.
    // latestCompletedNflSeasonFloor is max(2025, candidate), so pre-2026
    // dates never drop below 2025 (same contract as nflverse-readiness).
    expect(currentNflSeason(new Date("2025-03-01T00:00:00Z"))).toBe(2025);
    expect(currentNflSeason(new Date("2025-08-31T00:00:00Z"))).toBe(2025);
    expect(currentNflSeason(new Date("2025-09-10T00:00:00Z"))).toBe(2025);
    expect(currentNflSeason(new Date("2026-09-15T00:00:00Z"))).toBe(2025);
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

  /**
   * These three replace the C-198 CHARACTERIZATION test, which pinned the gap
   * rather than the fix and said in its own comment: "WHEN THIS IS FIXED THIS
   * TEST WILL FAIL. That is intended: delete it and say so in the ledger. Do
   * not 'fix' it by loosening the assertion." C-244 fixed it from inside the
   * route, so it is deleted here as instructed and replaced with assertions
   * that are strictly stronger - it could only ever prove satellites DON'T
   * run; these prove when they do and when they don't, and pin the schedule
   * the window was derived from.
   *
   * It also had to go for a second reason: the old test called the route on
   * the WALL CLOCK, so once the daily window existed it would have passed
   * every hour of the day except one. A test that fails for thirty minutes a
   * day is worse than no test.
   */
  it("a scheduled run outside the daily window still ingests no satellites", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok",
      season: 2024,
      statsUpserted: 7,
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2026, 8, 8, 3, 0, 0)));
    try {
      const res = await GET(
        req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"),
      );
      const body = await res.json();

      expect(body.mode).toBe("primary");
      expect(body.satelliteReason).toBe("primary-only");
      expect(ingestInjuries).not.toHaveBeenCalled();
      expect(ingestDepthCharts).not.toHaveBeenCalled();
      expect(ingestSnapCounts).not.toHaveBeenCalled();
      expect(ingestNextGenStats).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("the daily-window run ingests all four satellites with no query string (C-244)", async () => {
    // The gap in one assertion. Every OTHER satellite test in this file passes
    // ?mode=full, so the suite proved the satellites work in a mode nothing
    // invoked them in; measured on production 2026-09-08,
    // depth_chart_entries held zero rows as a result. This is the scheduled
    // caller - a bare path, exactly what vercel.json fires.
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok",
      season: 2024,
      statsUpserted: 7,
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2026, 8, 8, SATELLITE_DAILY_HOUR_UTC, 0, 0)));
    try {
      const res = await GET(
        req("http://x/api/cron/refresh-player-stats?season=2024", "Bearer secret"),
      );
      const body = await res.json();

      expect(body.mode).toBe("full");
      expect(body.satelliteReason).toBe("daily-window");
      expect(ingestInjuries).toHaveBeenCalled();
      expect(ingestDepthCharts).toHaveBeenCalled();
      expect(ingestSnapCounts).toHaveBeenCalled();
      // All three NGS families, not just one.
      expect((ingestNextGenStats as Mock).mock.calls.map((c) => c[1]).sort()).toEqual([
        "passing",
        "receiving",
        "rushing",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the daily window refuses a season it did not ask for (C-198 second-order risk)", async () => {
    // The unpublished-season fallback silently moves `season` to the last
    // completed one, and `season` is what the satellites are ingested FOR. An
    // unattended full run today would therefore write 2025 depth charts - the
    // newest from the Super Bowl - as the newest depth-chart rows in the
    // database. That is worse than the empty table it fills: empty reads as
    // "no data", stale reads as a lineup. So the window stands down while the
    // primary is on a fallback season.
    const clock = new Date(Date.UTC(2026, 8, 8, SATELLITE_DAILY_HOUR_UTC, 0, 0));
    const labelled = ingestionTargetNflSeason(clock);
    const floor = currentNflSeason(clock);
    expect(labelled, "no rollover window on this date - the test proves nothing").not.toBe(floor);

    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) =>
      season === labelled
        ? { status: "source-error", season, playersUpserted: 0, statsUpserted: 0, error: "HTTP 404" }
        : { status: "ok", season, playersUpserted: 1, statsUpserted: 9 },
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(clock);
    try {
      const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
      const body = await res.json();

      expect(body.season).toBe(floor); // the fallback did happen
      expect(body.mode).toBe("primary");
      expect(body.satelliteReason).toBe("skipped-prior-season");
      expect(ingestDepthCharts).not.toHaveBeenCalled();
      expect(ingestInjuries).not.toHaveBeenCalled();
      expect(ingestSnapCounts).not.toHaveBeenCalled();
      expect(ingestNextGenStats).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("an explicit mode=full is still the operator's to aim, fallback or not", async () => {
    // The stand-down above applies to the UNATTENDED run only. An operator who
    // names the mode gets the mode, and ?season is theirs to point wherever
    // they need - that is how the 2025 satellites get backfilled at all.
    const clock = new Date(Date.UTC(2026, 8, 8, SATELLITE_DAILY_HOUR_UTC, 0, 0));
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok",
      season: 2025,
      statsUpserted: 4,
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(clock);
    try {
      const res = await GET(
        req("http://x/api/cron/refresh-player-stats?season=2025&mode=full", "Bearer secret"),
      );
      const body = await res.json();
      expect(body.satelliteReason).toBe("requested");
      expect(ingestDepthCharts).toHaveBeenCalledWith(2025);
    } finally {
      vi.useRealTimers();
    }
  });

  it("pins the schedule the daily window was derived from", () => {
    // The window is `hour === 10 && minute < 30`, and "minute < 30" is only a
    // once-a-day rule while the cron fires at :00 and :30. Change the cadence
    // to */10 and one heavy run silently becomes three; change it to a
    // different hour-of-day expression and it becomes zero. Either way
    // satellite-window.ts has to be revisited, so pin the assumption where it
    // is made rather than leaving it implied.
    const entries = CRON_MANIFEST.filter((e) => e.path.includes("refresh-player-stats"));
    expect(entries.length, "refresh-player-stats missing from the cron manifest").toBeGreaterThan(0);
    entries.forEach((e) =>
      expect(
        e.schedule,
        `${e.path} no longer fires at :00/:30 - re-derive the window in lib/ingestion/satellite-window.ts`,
      ).toBe("0,30 * * * *"),
    );
  });

  it("asks the source for the labelled season on a scheduled run and stands on it when published", async () => {
    const labelled = ingestionTargetNflSeason(new Date());
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => ({
      status: "ok", season, playersUpserted: 1, statsUpserted: 9,
    }));
    const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(labelled);
    const body = (await res.json()) as { season: number; labelledAttempt: unknown; seasonResolution: { ingestionTarget: number } };
    expect(body.season).toBe(labelled);
    expect(body.labelledAttempt).toBeNull();
    expect(body.seasonResolution.ingestionTarget).toBe(labelled);
  });

  it("falls back to the completed floor when the labelled season is not published yet, and reports the attempt", async () => {
    const now = new Date();
    const labelled = ingestionTargetNflSeason(now);
    const floor = currentNflSeason(now);
    if (labelled === floor) return; // outside the rollover window there is nothing to fall back to
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) =>
      season === labelled
        ? { status: "source-error", season, playersUpserted: 0, statsUpserted: 0, error: "HTTP 404" }
        : { status: "ok", season, playersUpserted: 1, statsUpserted: 9 },
    );
    const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(ingestPlayerWeeklyStats).toHaveBeenNthCalledWith(1, labelled);
    expect(ingestPlayerWeeklyStats).toHaveBeenNthCalledWith(2, floor);
    const body = (await res.json()) as {
      success: boolean;
      season: number;
      labelledAttempt: { season: number; status: string; error: string | null } | null;
    };
    expect(body.success).toBe(true);
    expect(body.season).toBe(floor);
    expect(body.labelledAttempt).toEqual({ season: labelled, status: "source-error", error: "HTTP 404" });
  });

  it("does NOT retry the floor on a transient source error (5xx/timeout): the run fails instead of masking an outage", async () => {
    // Tripwire (2026-09-03 automated review): only a 404 (or ok with zero
    // rows) means "not published yet". A 503 or a timeout on the labelled
    // season is an outage; retrying the floor and answering 200 would hide it.
    const now = new Date();
    const labelled = ingestionTargetNflSeason(now);
    const floor = currentNflSeason(now);
    if (labelled === floor) return; // outside the rollover window there is nothing to fall back to
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) => ({
      status: "source-error", season, playersUpserted: 0, statsUpserted: 0,
      error: `nflverse fetch failed (503) for https://example.invalid/${season}`,
    }));
    const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(labelled);
    expect(res.status).not.toBe(200);
    const body = (await res.json()) as { success: boolean; season: number; labelledAttempt: unknown };
    expect(body.success).toBe(false);
    expect(body.season).toBe(labelled);
    expect(body.labelledAttempt).toBeNull();
  });

  it("falls back to the completed floor when the labelled season returns ok with zero rows (unpublished, combined asset)", async () => {
    // Tripwire (2026-09-02 automated review): nflverse can return the older
    // combined asset with status "ok" and zero upserted rows for a not-yet-
    // published labelled season — an empty labelled-season run must not be
    // recorded as success on a scheduled run.
    const now = new Date();
    const labelled = ingestionTargetNflSeason(now);
    const floor = currentNflSeason(now);
    if (labelled === floor) return; // outside the rollover window there is nothing to fall back to
    (ingestPlayerWeeklyStats as Mock).mockImplementation(async (season: number) =>
      season === labelled
        ? { status: "ok", season, playersUpserted: 0, statsUpserted: 0 }
        : { status: "ok", season, playersUpserted: 1, statsUpserted: 9 },
    );
    const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(ingestPlayerWeeklyStats).toHaveBeenNthCalledWith(1, labelled);
    expect(ingestPlayerWeeklyStats).toHaveBeenNthCalledWith(2, floor);
    const body = (await res.json()) as {
      success: boolean;
      season: number;
      labelledAttempt: { season: number; status: string; error: string | null } | null;
    };
    expect(body.success).toBe(true);
    expect(body.season).toBe(floor);
    expect(body.labelledAttempt).toEqual({ season: labelled, status: "ok", error: null });
  });

  it("does NOT retry the floor when clearance-denied — that is a rights stop, not an unpublished signal", async () => {
    const now = new Date();
    const labelled = ingestionTargetNflSeason(now);
    const floor = currentNflSeason(now);
    if (labelled === floor) return; // outside the rollover window there is nothing to fall back to
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "clearance-denied", season: labelled, playersUpserted: 0, statsUpserted: 0, blocks: ["rights"],
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats", "Bearer secret"));
    expect(res.status).toBe(502);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledWith(labelled);
  });

  it("does NOT retry an ok result with zero rows on an explicit ?season override", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "ok", season: 2026, playersUpserted: 0, statsUpserted: 0,
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2026", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
  });

  it("never falls back on an explicit ?season override", async () => {
    (ingestPlayerWeeklyStats as Mock).mockResolvedValue({
      status: "source-error", season: 2026, playersUpserted: 0, statsUpserted: 0, error: "HTTP 404",
    });
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2026", "Bearer secret"));
    expect(res.status).toBe(502);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(1);
  });

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
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024&mode=full", "Bearer secret"));
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
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024&mode=full", "Bearer secret"));
    expect(res.status).toBe(502);
  });

  it("keeps HTTP 200 when only a satellite fails (primary stamp is the SLA)", async () => {
    // Route status is primaryOk ? 200 : 502. Satellite failure flips
    // body.success to false but must not withhold the primary IngestionRun.
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
    const res = await GET(req("http://x/api/cron/refresh-player-stats?season=2024&mode=full", "Bearer secret"));
    // Deliberate contract: the HTTP status mirrors the PRIMARY ingestion only
    // (a failed satellite must not 502-and-retry the whole cron); the body
    // carries success=false and the failing satellite's status.
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      ngs: { rushing: { status: string } };
    };
    expect(body.success).toBe(false);
    expect(body.ngs.rushing.status).toBe("source-error");
  });
});
