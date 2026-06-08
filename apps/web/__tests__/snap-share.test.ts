import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNflverseSnapShare, resetSnapShareCacheForTests } from "@/lib/nflverse/snap-share";

const HEADER =
  "game_id,pfr_game_id,season,game_type,week,player,pfr_player_id,position,team,opponent,offense_snaps,offense_pct,defense_snaps,defense_pct,st_snaps,st_pct";

interface Seed {
  id: string;
  name: string;
  position: string;
  team: string;
  // offense snaps/pct
  pct: number;
  snaps: number;
  // defense snaps/pct
  defPct?: number;
  defSnaps?: number;
  // special-teams snaps/pct
  stPct?: number;
  stSnaps?: number;
  games: number;
  gameType?: string;
}

const SEEDS: readonly Seed[] = [
  { id: "s1", name: "Snappy Sam", position: "WR", team: "KC", pct: 0.9, snaps: 60, games: 4 },
  { id: "r1", name: "Rotational Rob", position: "RB", team: "BUF", pct: 0.5, snaps: 30, games: 4 },
  { id: "t1", name: "Tightend Tim", position: "TE", team: "SF", pct: 0.7, snaps: 45, games: 4 },
  { id: "b1", name: "Bench Bill", position: "WR", team: "NYJ", pct: 0.95, snaps: 62, games: 2 }, // < MIN_GAMES -> excluded
  // Defensive starters: real defense snaps/pct, zero offense -> excluded from offense, present in defense.
  { id: "d1", name: "Corner Carl", position: "CB", team: "KC", pct: 0, snaps: 0, defPct: 0.98, defSnaps: 65, games: 4 },
  { id: "e1", name: "Edge Ed", position: "DE", team: "BUF", pct: 0, snaps: 0, defPct: 0.85, defSnaps: 55, games: 4 }, // -> DL group
  { id: "l1", name: "Linebacker Lou", position: "ILB", team: "SF", pct: 0, snaps: 0, defPct: 0.9, defSnaps: 60, games: 4 }, // -> LB group
  { id: "f1", name: "Free Fred", position: "FS", team: "DAL", pct: 0, snaps: 0, defPct: 0.92, defSnaps: 62, games: 4 }, // -> S group
  // Special-teams ace: real ST snaps, no offense/defense -> only in specialTeams.
  { id: "g1", name: "Gunner Gus", position: "CB", team: "MIA", pct: 0, snaps: 0, defPct: 0, defSnaps: 0, stPct: 0.8, stSnaps: 20, games: 4 },
];

function buildCsv(): string {
  const rows: string[] = [HEADER];
  for (const seed of SEEDS) {
    for (let week = 1; week <= seed.games; week++) {
      rows.push(
        [
          `g${week}`,
          `pg${week}`,
          "2024",
          seed.gameType ?? "REG",
          String(week),
          seed.name,
          seed.id,
          seed.position,
          seed.team,
          "OPP",
          String(seed.snaps),
          String(seed.pct),
          String(seed.defSnaps ?? 0),
          String(seed.defPct ?? 0),
          String(seed.stSnaps ?? 0),
          String(seed.stPct ?? 0),
        ].join(","),
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
    expect(snap.leaders.WR[0]?.positionGroup).toBe("offense");
    expect(snap.leaders.RB[0]?.playerName).toBe("Rotational Rob");
    expect(snap.leaders.TE[0]?.playerName).toBe("Tightend Tim");
    // Defensive starters appear ONLY on the defense side (zero offense snaps).
    expect(snap.leaders.WR.map((r) => r.playerName)).not.toContain("Corner Carl");
  });

  it("exposes defensive snap share grouped DL / LB / CB / S from the real columns", async () => {
    const snap = await loadNflverseSnapShare({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(snap.defense.CB.map((r) => r.playerName)).toEqual(["Corner Carl"]);
    expect(snap.defense.DL.map((r) => r.playerName)).toEqual(["Edge Ed"]); // DE -> DL
    expect(snap.defense.LB.map((r) => r.playerName)).toEqual(["Linebacker Lou"]); // ILB -> LB
    expect(snap.defense.S.map((r) => r.playerName)).toEqual(["Free Fred"]); // FS -> S

    const carl = snap.defense.CB[0];
    expect(carl?.snapSharePct).toBe(0.98);
    expect(carl?.totalDefenseSnaps).toBe(65 * 4);
    expect(carl?.snapsPerGame).toBe(65);
    expect(carl?.games).toBe(4);
    expect(carl?.group).toBe("CB");
    expect(carl?.positionGroup).toBe("defense");
    expect(carl?.position).toBe("CB");
  });

  it("exposes special-teams snap share from st_snaps / st_pct", async () => {
    const snap = await loadNflverseSnapShare({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(snap.specialTeams.map((r) => r.playerName)).toEqual(["Gunner Gus"]);
    const gus = snap.specialTeams[0];
    expect(gus?.snapSharePct).toBe(0.8);
    expect(gus?.totalStSnaps).toBe(20 * 4);
    expect(gus?.positionGroup).toBe("specialTeams");
    // Gunner Gus has no defense snaps -> must NOT appear on the defense side.
    expect(snap.defense.CB.map((r) => r.playerName)).not.toContain("Gunner Gus");
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const snap = await loadNflverseSnapShare({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(snap.status).toBe("source-error");
    expect(snap.leaders.WR).toHaveLength(0);
    expect(snap.defense.CB).toHaveLength(0);
    expect(snap.specialTeams).toHaveLength(0);
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
