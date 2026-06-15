import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Keep DATASET_MIN_SEASON real; stub the orchestrator.
vi.mock("@/lib/ingestion/backfill-player-data", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/backfill-player-data")>();
  return { ...actual, backfillPlayerData: vi.fn() };
});
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

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
});
