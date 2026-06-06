import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNflverseCombine, resetCombineCacheForTests } from "@/lib/nflverse/combine";

const HEADER =
  "season,draft_year,draft_team,draft_round,draft_ovr,pfr_id,cfb_id,player_name,pos,school,ht,wt,forty,bench,vertical,broad_jump,cone,shuttle";

const ROWS = [
  HEADER,
  "2025,2025,,,,,,Fast Freddy,WR,Bama,71,190,4.28,12,38,125,6.8,4.1",
  "2025,2025,,,,,,Speedy Sam,WR,Ohio,70,185,4.35,10,36,122,6.9,4.2",
  "2025,2025,,,,,,Slow Sloane,TE,LSU,77,250,4.95,22,32,115,7.4,4.5",
  "2025,2025,,,,,,No Forty Ned,G,Iowa,78,310,,30,28,105,,", // no forty -> excluded from latest class
  "2010,2010,,,,,,Old Timer,CB,Miami,70,180,4.22,,40,128,6.7,4.0", // all-time fastest, not latest class
].join("\n");

function csv(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("combine.csv")) return csv(ROWS);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse combine", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetCombineCacheForTests();
  });

  it("builds the latest class (by 40) and an all-time fastest-40 board", async () => {
    const c = await loadNflverseCombine({ fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(c.status).toBe("live");
    expect(c.latestYear).toBe(2025);
    expect(c.canPublishProjections).toBe(false);

    // Latest class: forty-sorted, excludes the no-forty interior lineman and the 2010 player.
    expect(c.latestClass.map((r) => r.name)).toEqual(["Fast Freddy", "Speedy Sam", "Slow Sloane"]);
    expect(c.latestClass[0]?.forty).toBe(4.28);
    expect(c.latestClass[0]?.vertical).toBe(38);

    // All-time fastest 40 includes the 2010 burner first.
    expect(c.fastestForty[0]?.name).toBe("Old Timer");
    expect(c.fastestForty[0]?.forty).toBe(4.22);
  });

  it("returns an empty boundary state when the source fails", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const c = await loadNflverseCombine({ fetcher, cacheTtlMs: 0 });
    expect(c.status).toBe("source-error");
    expect(c.latestClass).toHaveLength(0);
  });

  it("serves the combine API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/combine/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
