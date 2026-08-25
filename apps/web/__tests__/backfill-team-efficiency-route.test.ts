import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/ingestion/team-efficiency", () => ({ ingestTeamEfficiency: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/cron/backfill-team-efficiency/route";
import { ingestTeamEfficiency } from "@/lib/ingestion/team-efficiency";

function req(qs = "", auth?: string): Request {
  return new Request(`http://x/api/cron/backfill-team-efficiency${qs}`, auth ? { headers: { authorization: auth } } : undefined);
}

beforeEach(() => {
  (ingestTeamEfficiency as Mock).mockReset().mockResolvedValue({ status: "ok", season: 0, rowsWritten: 1, games: 1 });
  vi.stubEnv("CRON_SECRET", "secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/backfill-team-efficiency", () => {
  it("401s without the bearer secret", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(ingestTeamEfficiency).not.toHaveBeenCalled();
  });

  it("400s on an invalid range", async () => {
    expect((await GET(req("?from=1990", "Bearer secret"))).status).toBe(400);
    expect((await GET(req("?from=2024&to=2020", "Bearer secret"))).status).toBe(400);
  });

  it("caps each call to 2 heavy PBP seasons and returns nextFrom", async () => {
    const res = await GET(req("?from=1999&to=2005", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(ingestTeamEfficiency).toHaveBeenCalledTimes(2); // 1999, 2000
    expect(ingestTeamEfficiency).toHaveBeenCalledWith(1999);
    expect(ingestTeamEfficiency).toHaveBeenCalledWith(2000);
    const body = (await res.json()) as { nextFrom: number | null };
    expect(body.nextFrom).toBe(2001);
  });

  it("returns nextFrom=null when the range fits", async () => {
    const res = await GET(req("?from=2024&to=2025", "Bearer secret"));
    const body = (await res.json()) as { nextFrom: number | null };
    expect(body.nextFrom).toBeNull();
  });

  it("defaults to the current NFL season so a cron hit fills the live EPA path", async () => {
    const res = await GET(req("", "Bearer secret"));
    expect(res.status).toBe(200);
    expect(ingestTeamEfficiency).toHaveBeenCalledTimes(1);
    expect(ingestTeamEfficiency).toHaveBeenCalledWith(2025);
  });
});
