import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadNflversePlayerLab,
  resetNflversePlayerLabCacheForTests,
} from "@/lib/nflverse/player-lab";

const STATS_HEADER = [
  "player_id",
  "player_name",
  "player_display_name",
  "position",
  "headshot_url",
  "recent_team",
  "season",
  "week",
  "season_type",
  "opponent_team",
  "attempts",
  "carries",
  "rushing_yards",
  "receptions",
  "targets",
  "receiving_yards",
  "receiving_air_yards",
  "target_share",
  "air_yards_share",
  "wopr",
  "fantasy_points_ppr",
].join(",");

interface PlayerSeed {
  readonly id: string;
  readonly name: string;
  readonly position: "RB" | "WR" | "TE";
  readonly ppr: readonly number[]; // weeks 1..6
  readonly targets: number;
  readonly carries: number;
  readonly receptions: number;
  readonly receivingYards: number;
  readonly rushingYards: number;
  readonly targetShare: number;
  readonly wopr: number;
}

// Weeks 1-3 are played vs CIN, weeks 4-6 vs BAL, so both defenses qualify (>=3 games).
const OPPONENT_BY_WEEK = ["CIN", "CIN", "CIN", "BAL", "BAL", "BAL"];

const SEEDS: readonly PlayerSeed[] = [
  // WR1 starts cold then surges -> positive last-5 delta.
  { id: "00-wr1", name: "George Pickens", position: "WR", ppr: [5, 25, 25, 25, 25, 25], targets: 11, carries: 0, receptions: 7, receivingYards: 90, rushingYards: 0, targetShare: 0.34, wopr: 0.72 },
  // WR2 flat -> ranks below WR1.
  { id: "00-wr2", name: "Calvin Austin", position: "WR", ppr: [10, 10, 10, 10, 10, 10], targets: 5, carries: 0, receptions: 3, receivingYards: 40, rushingYards: 0, targetShare: 0.15, wopr: 0.30 },
  { id: "00-rb1", name: "Jaylen Warren", position: "RB", ppr: [18, 18, 18, 18, 18, 18], targets: 4, carries: 15, receptions: 3, receivingYards: 25, rushingYards: 80, targetShare: 0.1, wopr: 0.21 },
  { id: "00-te1", name: "Pat Freiermuth", position: "TE", ppr: [9, 9, 9, 9, 9, 9], targets: 6, carries: 0, receptions: 4, receivingYards: 45, rushingYards: 0, targetShare: 0.18, wopr: 0.4 },
];

function buildStatsCsv(): string {
  const rows: string[] = [STATS_HEADER];
  for (const seed of SEEDS) {
    for (let week = 1; week <= 6; week++) {
      rows.push(
        [
          seed.id,
          "",
          seed.name,
          seed.position,
          "",
          "PIT",
          "2025",
          String(week),
          "REG",
          OPPONENT_BY_WEEK[week - 1],
          "0",
          String(seed.carries),
          String(seed.rushingYards),
          String(seed.receptions),
          String(seed.targets),
          String(seed.receivingYards),
          "0",
          String(seed.targetShare),
          "0",
          String(seed.wopr),
          String(seed.ppr[week - 1]),
        ].join(","),
      );
    }
  }
  return rows.join("\n");
}

const ROSTERS_CSV = [
  "season,team,position,full_name,birth_date,gsis_id,headshot_url",
  "2025,PIT,WR,George Pickens,2001-03-04,00-wr1,https://example.com/wr1.png",
  "2025,PIT,WR,Calvin Austin,1999-09-08,00-wr2,",
  "2025,PIT,RB,Jaylen Warren,1998-11-01,00-rb1,",
  "2025,PIT,TE,Pat Freiermuth,1998-09-02,00-te1,",
].join("\n");

function gzResponse(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
}

function csvResponse(csv: string): Response {
  return new Response(csv, { status: 200, headers: { "content-length": String(Buffer.byteLength(csv)) } });
}

function mockNflverseFetch(): ReturnType<typeof vi.fn> {
  const stats = buildStatsCsv();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("player_stats.csv.gz")) return gzResponse(stats);
    if (url.includes("roster_2025.csv")) return csvResponse(ROSTERS_CSV);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse player lab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNflversePlayerLabCacheForTests();
  });

  it("computes season leaders, last-5 form, and defense ranks from real-shaped rows", async () => {
    const lab = await loadNflversePlayerLab({ season: 2025, fetcher: mockNflverseFetch(), cacheTtlMs: 0 });

    expect(lab.status).toBe("live");
    expect(lab.season).toBe(2025);
    expect(lab.throughWeek).toBe(6);
    expect(lab.sourceRows).toBe(24);
    expect(lab.seasonRows).toBe(24);
    expect(lab.canPublishProjections).toBe(false);

    // WR leaders: surging Pickens ranks above flat Austin.
    expect(lab.leaders.WR.map((r) => r.playerName)).toEqual(["George Pickens", "Calvin Austin"]);
    const pickens = lab.leaders.WR[0]!;
    expect(pickens.games).toBe(6);
    expect(pickens.pprPerGame).toBeCloseTo(21.7, 1);
    expect(pickens.last5PprPerGame).toBe(25);
    expect(pickens.last5PprDelta).toBeGreaterThan(1.5); // heating up
    expect(pickens.headshotUrl).toBe("https://example.com/wr1.png");

    expect(lab.leaders.RB[0]?.playerName).toBe("Jaylen Warren");
    expect(lab.leaders.TE[0]?.playerName).toBe("Pat Freiermuth");

    // Defense vs WR: BAL (weeks 4-6, post-surge) allows more than CIN -> rank 1.
    expect(lab.defenseVsPosition.WR).toHaveLength(2);
    expect(lab.defenseVsPosition.WR[0]).toMatchObject({ team: "BAL", rank: 1, games: 3 });
    expect(lab.defenseVsPosition.WR[1]).toMatchObject({ team: "CIN", rank: 2, games: 3 });
    expect(lab.defenseVsPosition.WR[0]!.pprAllowedPerGame).toBeGreaterThan(
      lab.defenseVsPosition.WR[1]!.pprAllowedPerGame,
    );
  });

  it("returns an explicit empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const lab = await loadNflversePlayerLab({ season: 2025, fetcher, cacheTtlMs: 0 });

    expect(lab.status).toBe("source-error");
    expect(lab.leaders.RB).toHaveLength(0);
    expect(lab.leaders.WR).toHaveLength(0);
    expect(lab.leaders.TE).toHaveLength(0);
    expect(lab.canPublishProjections).toBe(false);
    expect(lab.blockReason).toContain("empty state");
  });

  it("serves the player-lab API without fabricating projections", async () => {
    vi.stubGlobal("fetch", mockNflverseFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/player-lab/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    const data = body["data"] as Record<string, unknown>;
    expect(data["status"]).toBe("live");
    expect(data["canPublishProjections"]).toBe(false);
    expect(data["sourceRows"]).toBe(24);
  });
});
