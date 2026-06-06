import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadNflversePressureCoverage,
  resetPressureCoverageCacheForTests,
} from "@/lib/nflverse/pressure-coverage";

const PASS_HEADER =
  "game_id,pfr_game_id,season,week,game_type,team,opponent,pfr_player_name,pfr_player_id,times_sacked,times_blitzed,times_pressured_pct,passing_bad_throw_pct";
const DEF_HEADER =
  "game_id,pfr_game_id,season,week,game_type,team,opponent,pfr_player_name,pfr_player_id,def_targets,def_completions_allowed,def_yards_allowed,def_passer_rating_allowed,def_missed_tackle_pct";

function passRows(): string {
  const rows = [PASS_HEADER];
  const qbs = [
    { id: "qb1", name: "Pressured Pete", press: 0.4, weeks: 4 },
    { id: "qb2", name: "Clean Carl", press: 0.2, weeks: 4 },
    { id: "qb3", name: "Backup Bob", press: 0.5, weeks: 2 }, // < MIN_QB_GAMES
  ];
  for (const q of qbs) {
    for (let w = 1; w <= q.weeks; w++) {
      rows.push(`g${w},pg${w},2024,${w},REG,KC,OPP,${q.name},${q.id},3,5,${q.press},0.1`);
    }
  }
  return rows.join("\n");
}

function defRows(): string {
  const rows = [DEF_HEADER];
  const defs = [
    { id: "d1", name: "Lockdown Larry", pr: 50, weeks: 4 },
    { id: "d2", name: "Torched Tom", pr: 120, weeks: 4 },
    { id: "d3", name: "Few Targets Fred", pr: 30, weeks: 1 }, // total targets < 25
  ];
  for (const d of defs) {
    for (let w = 1; w <= d.weeks; w++) {
      rows.push(`g${w},pg${w},2024,${w},REG,BUF,OPP,${d.name},${d.id},8,3,30,${d.pr},0.1`);
    }
  }
  return rows.join("\n");
}

function csv(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  const pass = passRows();
  const def = defRows();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("advstats_week_pass_2024.csv")) return csv(pass);
    if (url.includes("advstats_week_def_2024.csv")) return csv(def);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse pressure & coverage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetPressureCoverageCacheForTests();
  });

  it("ranks QB pressure and lockdown coverage from PFR advanced rows", async () => {
    const pc = await loadNflversePressureCoverage({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(pc.status).toBe("live");
    expect(pc.season).toBe(2024);
    expect(pc.canPublishProjections).toBe(false);

    // QB sorted by pressure faced; the 2-game backup is excluded.
    expect(pc.qbPressure.map((q) => q.name)).toEqual(["Pressured Pete", "Clean Carl"]);
    expect(pc.qbPressure[0]?.pressurePct).toBe(0.4);
    expect(pc.qbPressure[0]?.sacks).toBe(12); // 3 * 4 weeks

    // Coverage sorted lockdown-first; the low-volume defender is excluded.
    expect(pc.coverage.map((c) => c.name)).toEqual(["Lockdown Larry", "Torched Tom"]);
    expect(pc.coverage[0]?.passerRatingAllowed).toBe(50);
    expect(pc.coverage[0]?.targets).toBe(32);
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const pc = await loadNflversePressureCoverage({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(pc.status).toBe("source-error");
    expect(pc.qbPressure).toHaveLength(0);
    expect(pc.coverage).toHaveLength(0);
  });

  it("serves the pressure-coverage API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/pressure-coverage/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
