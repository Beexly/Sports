import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadNflversePressureCoverage,
  resetPressureCoverageCacheForTests,
} from "@/lib/nflverse/pressure-coverage";

const PASS_HEADER =
  "game_id,pfr_game_id,season,week,game_type,team,opponent,pfr_player_name,pfr_player_id,times_sacked,times_blitzed,times_pressured_pct,passing_bad_throw_pct,pocket_time,times_hurried,times_hit,on_tgt_pct,rpo_plays,rpo_yards,pa_pass_att,pa_pass_yards,batted_balls,throwaways";
const DEF_HEADER =
  "game_id,pfr_game_id,season,week,game_type,team,opponent,pfr_player_name,pfr_player_id,def_targets,def_completions_allowed,def_yards_allowed,def_passer_rating_allowed,def_missed_tackle_pct,def_adot,def_blitzes,def_hurries,def_qbkd,def_pressures,def_sacks";
const REC_HEADER =
  "game_id,pfr_game_id,season,week,game_type,team,opponent,pfr_player_name,pfr_player_id,tgt,rec,ybc,yac,brk_tkl,drop,adot,drop_pct,rat";

function passRows(): string {
  const rows = [PASS_HEADER];
  const qbs = [
    { id: "qb1", name: "Pressured Pete", press: 0.4, weeks: 4 },
    { id: "qb2", name: "Clean Carl", press: 0.2, weeks: 4 },
    { id: "qb3", name: "Backup Bob", press: 0.5, weeks: 2 }, // < MIN_QB_GAMES
  ];
  for (const q of qbs) {
    for (let w = 1; w <= q.weeks; w++) {
      // ...,pocket_time,times_hurried,times_hit,on_tgt_pct,rpo_plays,rpo_yards,pa_pass_att,pa_pass_yards,batted_balls,throwaways
      rows.push(`g${w},pg${w},2024,${w},REG,KC,OPP,${q.name},${q.id},3,5,${q.press},0.1,2.5,2,1,0.78,4,30,10,85,1,2`);
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
      // ...,def_missed_tackle_pct,def_adot,def_blitzes,def_hurries,def_qbkd,def_pressures,def_sacks
      rows.push(`g${w},pg${w},2024,${w},REG,BUF,OPP,${d.name},${d.id},8,3,30,${d.pr},0.1,9.5,1,2,1,3,1`);
    }
  }
  return rows.join("\n");
}

function recRows(): string {
  const rows = [REC_HEADER];
  const wrs = [
    { id: "r1", name: "Deep Dan", adot: 14.0, weeks: 4 },
    { id: "r2", name: "Shallow Sam", adot: 5.0, weeks: 4 },
    { id: "r3", name: "Few Looks Fred", adot: 12.0, weeks: 1 }, // total targets < 25
  ];
  for (const r of wrs) {
    for (let w = 1; w <= r.weeks; w++) {
      // ...,tgt,rec,ybc,yac,brk_tkl,drop,adot,drop_pct,rat
      rows.push(`g${w},pg${w},2024,${w},REG,MIA,OPP,${r.name},${r.id},8,5,40,20,1,1,${r.adot},0.05,110.2`);
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
  const rec = recRows();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("advstats_week_pass_2024.csv")) return csv(pass);
    if (url.includes("advstats_week_def_2024.csv")) return csv(def);
    if (url.includes("advstats_week_rec_2024.csv")) return csv(rec);
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

    // New PFR advanced PASS columns: pocket_time means per game, count columns sum.
    expect(pc.qbPressure[0]?.pocketTime).toBe(2.5); // mean of identical 2.5s
    expect(pc.qbPressure[0]?.onTgtPct).toBe(0.78); // carried as a 0..1 fraction
    expect(pc.qbPressure[0]?.timesHurried).toBe(8); // 2 * 4 weeks
    expect(pc.qbPressure[0]?.rpoPlays).toBe(16); // 4 * 4 weeks
    expect(pc.qbPressure[0]?.paPassYards).toBe(340); // 85 * 4 weeks
    expect(pc.qbPressure[0]?.throwaways).toBe(8); // 2 * 4 weeks

    // Coverage sorted lockdown-first; the low-volume defender is excluded.
    expect(pc.coverage.map((c) => c.name)).toEqual(["Lockdown Larry", "Torched Tom"]);
    expect(pc.coverage[0]?.passerRatingAllowed).toBe(50);
    expect(pc.coverage[0]?.targets).toBe(32);

    // New PFR advanced DEF pass-rush columns: def_adot mean, pressure counts sum.
    expect(pc.coverage[0]?.adotAllowed).toBe(9.5);
    expect(pc.coverage[0]?.blitzes).toBe(4); // 1 * 4 weeks
    expect(pc.coverage[0]?.pressures).toBe(12); // 3 * 4 weeks
    expect(pc.coverage[0]?.qbKnockdowns).toBe(4); // 1 * 4 weeks
    expect(pc.coverage[0]?.sacks).toBe(4); // 1 * 4 weeks

    // Receiver charting (rec variant): sorted deepest ADOT first, low-volume dropped.
    expect(pc.receivingAdvanced.map((r) => r.name)).toEqual(["Deep Dan", "Shallow Sam"]);
    expect(pc.receivingAdvanced[0]?.adot).toBe(14);
    expect(pc.receivingAdvanced[0]?.targets).toBe(32); // 8 * 4 weeks
    expect(pc.receivingAdvanced[0]?.dropPct).toBe(0.05);
    expect(pc.receivingAdvanced[0]?.brokenTackles).toBe(4); // 1 * 4 weeks
    expect(pc.receivingAdvanced[0]?.passerRatingWhenTargeted).toBe(110.2);
    expect(pc.receivingAdvanced[0]?.yacPerRec).toBe(4); // (20*4) / (5*4)
  });

  it("degrades gracefully when the rec variant 404s but pass/def load", async () => {
    const pass = passRows();
    const def = defRows();
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("advstats_week_pass_2024.csv")) return csv(pass);
      if (url.includes("advstats_week_def_2024.csv")) return csv(def);
      return new Response("missing", { status: 404 }); // rec (and all else) 404
    });
    const pc = await loadNflversePressureCoverage({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(pc.status).toBe("live"); // pass/def still gate a live load
    expect(pc.qbPressure.length).toBeGreaterThan(0);
    expect(pc.receivingAdvanced).toHaveLength(0); // honest empty, not fabricated
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
