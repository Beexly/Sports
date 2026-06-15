import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApi: async () => null }));
import { loadNflverseSnapShare, resetSnapShareCacheForTests } from "@/lib/nflverse/snap-share";

const HEADER =
  "game_id,pfr_game_id,season,game_type,week,player,pfr_player_id,position,team,opponent,offense_snaps,offense_pct,defense_snaps,defense_pct,st_snaps,st_pct";

interface Seed {
  id: string;
  name: string;
  position: string;
  team: string;
  pct: number;
  snaps: number;
  games: number;
  gameType?: string;
}

const SEEDS: readonly Seed[] = [
  { id: "s1", name: "Snappy Sam", position: "WR", team: "KC", pct: 0.9, snaps: 60, games: 4 },
  { id: "r1", name: "Rotational Rob", position: "RB", team: "BUF", pct: 0.5, snaps: 30, games: 4 },
  { id: "t1", name: "Tightend Tim", position: "TE", team: "SF", pct: 0.7, snaps: 45, games: 4 },
  { id: "b1", name: "Bench Bill", position: "WR", team: "NYJ", pct: 0.95, snaps: 62, games: 2 }, // < MIN_GAMES -> excluded
  { id: "d1", name: "Corner Carl", position: "CB", team: "KC", pct: 0, snaps: 0, games: 4 }, // not skill / no off snaps
];

function buildCsv(): string {
  const rows: string[] = [HEADER];
  for (const seed of SEEDS) {
    for (let week = 1; week <= seed.games; week++) {
      rows.push(
        [`g${week}`, `pg${week}`, "2024", seed.gameType ?? "REG", String(week), seed.name, seed.id, seed.position, seed.team, "OPP", String(seed.snaps), String(seed.pct), "0", "0", "0", "0"].join(","),
      );
    }
  }
  // one POST game for Snappy Sam that must be excluded
  rows.push(["gp", "pgp", "2024", "POST", "19", "Snappy Sam", "s1", "WR", "KC", "OPP", "60", "0.10", "0", "0", "0", "0"].join(","));
  return rows.join("\n");
}

function csv(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  const body = buildCsv();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("snap_counts_2024.csv")) return csv(body);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse snap share", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetSnapShareCacheForTests();
  });

  it("ranks REG snap-share leaders by position, excluding short samples and non-offense rows", async () => {
    const snap = await loadNflverseSnapShare({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(snap.status).toBe("live");
    expect(snap.season).toBe(2024);
    expect(snap.canPublishProjections).toBe(false);

    expect(snap.leaders.WR.map((r) => r.playerName)).toEqual(["Snappy Sam"]); // Bench Bill (2 games) excluded
    expect(snap.leaders.WR[0]?.snapSharePct).toBe(0.9); // POST game excluded -> avg stays 0.9
    expect(snap.leaders.WR[0]?.games).toBe(4);
    expect(snap.leaders.RB[0]?.playerName).toBe("Rotational Rob");
    expect(snap.leaders.TE[0]?.playerName).toBe("Tightend Tim");
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const snap = await loadNflverseSnapShare({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(snap.status).toBe("source-error");
    expect(snap.leaders.WR).toHaveLength(0);
  });

  it("serves the snap-share API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/snap-share/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
