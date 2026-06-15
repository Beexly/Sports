import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApi: async () => null }));
import { loadNflverseQbr, resetQbrCacheForTests } from "@/lib/nflverse/qbr";

const HEADER = "season,season_type,game_week,team_abb,player_id,qbr_total,qb_plays,epa_total,pts_added,name_display";

function rows(): string {
  const out = [HEADER];
  const qbs = [
    { id: "1", name: "Elite Eli", team: "KC", qbr: 80, weeks: 6 },
    { id: "2", name: "Mid Mike", team: "NYG", qbr: 55, weeks: 6 },
    { id: "3", name: "Backup Bart", team: "CLE", qbr: 90, weeks: 3 }, // < MIN_GAMES
  ];
  for (const q of qbs) {
    for (let w = 1; w <= q.weeks; w++) {
      out.push(`2025,Regular,${w},${q.team},${q.id},${q.qbr},60,8,10,${q.name}`);
    }
  }
  out.push("2024,Regular,1,KC,1,99,60,8,10,Elite Eli"); // old season -> excluded
  out.push("2025,Postseason,20,KC,1,99,60,8,10,Elite Eli"); // postseason -> excluded
  return out.join("\n");
}

function csv(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  const body = rows();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("qbr_week_level.csv")) return csv(body);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse ESPN QBR", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetQbrCacheForTests();
  });

  it("play-weights QBR for the latest regular season and ranks leaders", async () => {
    const q = await loadNflverseQbr({ fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(q.status).toBe("live");
    expect(q.season).toBe(2025);
    expect(q.canPublishProjections).toBe(false);
    // Backup Bart (<6 g) excluded; old season + postseason rows ignored.
    expect(q.leaders.map((r) => r.name)).toEqual(["Elite Eli", "Mid Mike"]);
    expect(q.leaders[0]?.qbr).toBe(80);
    expect(q.leaders[0]?.games).toBe(6);
  });

  it("returns an empty boundary state when the source fails", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const q = await loadNflverseQbr({ fetcher, cacheTtlMs: 0 });
    expect(q.status).toBe("source-error");
    expect(q.leaders).toHaveLength(0);
  });

  it("serves the QBR API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/qbr/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
