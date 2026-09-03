import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Keep DATASET_MIN_SEASON real; stub the orchestrator.
vi.mock("@/lib/ingestion/backfill-player-data", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/backfill-player-data")>();
  return { ...actual, backfillPlayerData: vi.fn() };
});
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025, ingestionTargetNflSeason: () => 2026 }));

import { GET } from "@/app/api/cron/backfill-player-data/route";
import { backfillPlayerData } from "@/lib/ingestion/backfill-player-data";

function req(qs = "", auth?: string): Request {
  return new Request(`http://x/api/cron/backfill-player-data${qs}`, auth ? { headers: { authorization: auth } } : undefined);
}

beforeEach(() => {
  (backfillPlayerData as Mock).mockReset().mockResolvedValue({ from: 0, to: 0, seasonsProcessed: 0, allOk: true, results: [] });
  vi.stubEnv("CRON_SECRET", "secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/backfill-player-data", () => {
  it("401s without the bearer secret", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(backfillPlayerData).not.toHaveBeenCalled();
  });

  it("400s on an invalid season range", async () => {
    expect((await GET(req("?from=1800", "Bearer secret"))).status).toBe(400);
    expect((await GET(req("?from=2024&to=2020", "Bearer secret"))).status).toBe(400); // from > to
    expect(backfillPlayerData).not.toHaveBeenCalled();
  });

  it("caps the call to MAX_SEASONS_PER_CALL and returns nextFrom", async () => {
    const res = await GET(req("?from=1999&to=2010", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenCalledWith(1999, 2002); // 4 seasons
    const body = (await res.json()) as { nextFrom: number | null };
    expect(body.nextFrom).toBe(2003);
  });

  it("returns nextFrom=null when the range fits in one call", async () => {
    const res = await GET(req("?from=2022&to=2024", "Bearer secret"));
    expect(backfillPlayerData).toHaveBeenCalledWith(2022, 2024);
    const body = (await res.json()) as { nextFrom: number | null };
    expect(body.nextFrom).toBeNull();
  });

  // currentNflSeason mocked to 2025 (floor), ingestionTargetNflSeason mocked to 2026 (labelled).
  it("the bare default (no from/to) targets only the labelled season, not a historical crawl from 1999", async () => {
    const res = await GET(req("", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenCalledTimes(1);
    expect(backfillPlayerData).toHaveBeenCalledWith(2026, 2026);
    const body = (await res.json()) as { nextFrom: number | null; floorFallback: unknown };
    expect(body.nextFrom).toBeNull();
    expect(body.floorFallback).toBeNull();
  });

  it("falls back to the completed floor on the bare default when the labelled season source-errors (unpublished)", async () => {
    (backfillPlayerData as Mock).mockImplementation(async (from: number, to: number) => {
      if (from === 2026 && to === 2026) {
        return {
          from, to, seasonsProcessed: 1, allOk: false,
          results: [{
            season: 2026,
            stats: { status: "source-error", season: 2026, playersUpserted: 0, statsUpserted: 0, error: "HTTP 404" },
            snaps: "skipped", injuries: "skipped", depth: "skipped",
          }],
        };
      }
      return { from, to, seasonsProcessed: 1, allOk: true, results: [{ season: from, stats: "skipped", snaps: "skipped", injuries: "skipped", depth: "skipped" }] };
    });
    const res = await GET(req("", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenNthCalledWith(1, 2026, 2026);
    expect(backfillPlayerData).toHaveBeenNthCalledWith(2, 2025, 2025);
    const body = (await res.json()) as { success: boolean; floorFallback: { allOk: boolean; from: number; to: number } | null };
    expect(body.success).toBe(true);
    expect(body.floorFallback).not.toBeNull();
    expect(body.floorFallback!.from).toBe(2025);
    expect(body.floorFallback!.to).toBe(2025);
  });

  it("does NOT retry the floor on the bare default when the labelled season fails transiently (5xx): the run reports the outage", async () => {
    (backfillPlayerData as Mock).mockImplementation(async (from: number, to: number) => ({
      from, to, seasonsProcessed: 1, allOk: false,
      results: [{
        season: from,
        stats: { status: "source-error", season: from, playersUpserted: 0, statsUpserted: 0, error: "nflverse fetch failed (503) for https://example.invalid" },
        snaps: "skipped", injuries: "skipped", depth: "skipped",
      }],
    }));
    const res = await GET(req("", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenCalledTimes(1);
    expect(backfillPlayerData).toHaveBeenCalledWith(2026, 2026);
    const body = (await res.json()) as { success: boolean; floorFallback: unknown };
    expect(body.success).toBe(false);
    expect(body.floorFallback).toBeNull();
  });

  it("falls back to the completed floor on the bare default when the labelled season is ok with zero rows (combined asset)", async () => {
    (backfillPlayerData as Mock).mockImplementation(async (from: number, to: number) => {
      if (from === 2026 && to === 2026) {
        return {
          from, to, seasonsProcessed: 1, allOk: true,
          results: [{
            season: 2026,
            stats: { status: "ok", season: 2026, playersUpserted: 0, statsUpserted: 0 },
            snaps: "skipped", injuries: "skipped", depth: "skipped",
          }],
        };
      }
      return { from, to, seasonsProcessed: 1, allOk: true, results: [{ season: from, stats: { status: "ok", season: from, playersUpserted: 5, statsUpserted: 20 }, snaps: "skipped", injuries: "skipped", depth: "skipped" }] };
    });
    const res = await GET(req("", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenNthCalledWith(2, 2025, 2025);
    const body = (await res.json()) as { success: boolean; floorFallback: { allOk: boolean } | null };
    expect(body.success).toBe(true);
    expect(body.floorFallback).not.toBeNull();
  });

  it("does NOT retry the floor on the bare default when clearance-denied — that is a rights stop, not an unpublished signal", async () => {
    (backfillPlayerData as Mock).mockResolvedValue({
      from: 2026, to: 2026, seasonsProcessed: 1, allOk: false,
      results: [{
        season: 2026,
        stats: { status: "clearance-denied", season: 2026, playersUpserted: 0, statsUpserted: 0, blocks: ["rights"] },
        snaps: "skipped", injuries: "skipped", depth: "skipped",
      }],
    });
    const res = await GET(req("", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as { success: boolean; floorFallback: unknown };
    expect(body.success).toBe(false);
    expect(body.floorFallback).toBeNull();
  });

  it("never retries the floor on an explicit range, even when it source-errors", async () => {
    (backfillPlayerData as Mock).mockResolvedValue({
      from: 2026, to: 2026, seasonsProcessed: 1, allOk: false,
      results: [{
        season: 2026,
        stats: { status: "source-error", season: 2026, playersUpserted: 0, statsUpserted: 0, error: "HTTP 404" },
        snaps: "skipped", injuries: "skipped", depth: "skipped",
      }],
    });
    const res = await GET(req("?from=2026&to=2026", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(backfillPlayerData).toHaveBeenCalledTimes(1);
    const body = (await res.json()) as { success: boolean; floorFallback: unknown };
    expect(body.success).toBe(false);
    expect(body.floorFallback).toBeNull();
  });
});
