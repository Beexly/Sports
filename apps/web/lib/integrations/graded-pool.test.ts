import { describe, it, expect, afterEach } from "vitest";
import { buildGradedPool, buildGradedProvider, loadGradedPool } from "./graded-pool";
import { registerProjectionsProvider, activePlayerPool } from "./projections";
import { PLAYERS } from "../fantasy/players";
import type { PlayerProfile, ProcessSignal } from "../intelligence/player-model";
import type { ExpectedPointsRow } from "../intelligence/expected-points";
import type { TeamEnvironmentRow } from "../intelligence/team-environment";
import type { QbForwardRow } from "../intelligence/qb-forward";

function prof(name: string, position: string, fppg: number, signal: ProcessSignal, touches = 80, games = 8, team = "KC"): PlayerProfile {
  return {
    playerId: name, name, team, position: position as PlayerProfile["position"], games, plays: 200,
    fantasyPpr: fppg * games, fppg, epaPerPlay: 0.1, touches, wopr: 0.5, targetShare: 0.2, dakota: null, pacr: null,
    processGrade: 70, productionPct: 50, signal, note: "n",
  };
}
function xfp(name: string, xfpPerGame: number): ExpectedPointsRow {
  return { playerId: name, name, team: "KC", position: "WR", games: 8, xfpTotal: xfpPerGame * 8, xfpPerGame, actualTotal: 0, diff: 0, xfpPct: 50, prodPct: 50, signal: "in-line", note: "n" };
}
function tenv(team: string, offEpaPerPlay: number, offSuccessRate: number): TeamEnvironmentRow {
  return {
    team, offPlays: 100, defPlays: 100, offEpaPerPlay, defEpaPerPlay: 0,
    offSuccessRate, defSuccessRate: 0.45, proe: 0, noHuddleRate: 0,
    offEpaPct: 50, defEpaPct: 50,
    // A1 situational fields — not exercised by these scheme-fit tests.
    offScrimmagePlays: 0, successRate: null, explosiveRate: null,
    earlyDownPassRate: null, neutralProe: null, neutralEpaPerPlay: null,
    shotgunRate: null, cpoe: null, thirdDownConvRate: null,
    redZoneEpaPerPlay: null, redZonePlays: 0, driveScoreRate: null,
  };
}
function qbf(team: string, forwardGrade: number, name = `${team} QB`): QbForwardRow {
  return {
    playerId: `${team}-qb`, name, team, games: 10, attempts: 300, dakota: 0.1, anyA: 7,
    dakotaPct: forwardGrade, anyaPct: forwardGrade, forwardGrade, agreement: 1, note: "n",
  };
}

afterEach(() => registerProjectionsProvider(null));

describe("buildGradedPool", () => {
  const profiles = [prof("Star WR", "WR", 12, "buy-low"), prof("No XFP RB", "RB", 10, "in-line"), prof("Zero Guy", "WR", 0, "in-line")];
  const pool = buildGradedPool(profiles, [xfp("Star WR", 15)]);

  it("projects from xFP when present, else actual per-game; excludes no-input players", () => {
    expect(pool.map((p) => p.name)).toEqual(["Star WR", "No XFP RB"]); // Zero Guy excluded, sorted by proj
    expect(pool.find((p) => p.name === "Star WR")!.proj).toBe(255); // xFP 15 * 17
    expect(pool.find((p) => p.name === "No XFP RB")!.proj).toBe(170); // fppg 10 * 17 (no xFP)
  });

  it("maps the buy/sell signal to a trend and keeps a real band", () => {
    const star = pool.find((p) => p.name === "Star WR")!;
    expect(star.trend).toBe("up");
    expect(star.floor).toBeLessThan(star.proj);
    expect(star.ceiling).toBeGreaterThan(star.proj);
  });

  it("with no teamEnv/qbForward, schemeFit stays the neutral 0.6 and the band is the model default (back-compat)", () => {
    const star = pool.find((p) => p.name === "Star WR")!;
    expect(star.schemeFit).toBe(0.6);
    expect(star.proj).toBe(255);
    expect(star.ceiling).toBe(Math.round(star.proj * 1.4)); // ceiling un-nudged
    expect(star.floor).toBe(Math.round(star.proj * 0.75));
  });
});

describe("buildGradedPool — team-environment schemeFit", () => {
  const profiles = [
    prof("Strong Off WR", "WR", 12, "in-line", 80, 8, "BUF"),
    prof("Weak Off WR", "WR", 12, "in-line", 80, 8, "CAR"),
    prof("No Env WR", "WR", 12, "in-line", 80, 8, "ZZZ"),
  ];
  // BUF clearly best offense, CAR clearly worst, plus filler teams to make a real ranking.
  const teamEnv: TeamEnvironmentRow[] = [
    tenv("BUF", 0.18, 0.55),
    tenv("KC", 0.12, 0.52),
    tenv("DAL", 0.05, 0.48),
    tenv("NYG", -0.02, 0.44),
    tenv("CAR", -0.15, 0.40),
  ];
  const pool = buildGradedPool(profiles, [], teamEnv);

  it("schemeFit rises for a strong-offense team vs a weak-offense team", () => {
    const strong = pool.find((p) => p.name === "Strong Off WR")!;
    const weak = pool.find((p) => p.name === "Weak Off WR")!;
    expect(strong.schemeFit).toBeGreaterThan(weak.schemeFit);
    expect(strong.schemeFit).toBeGreaterThan(0.6); // top offense reads above neutral
    expect(weak.schemeFit).toBeLessThan(0.6); // bottom offense reads below neutral
  });

  it("falls back to the neutral 0.6 when the player's team has no environment row", () => {
    const missing = pool.find((p) => p.name === "No Env WR")!;
    expect(missing.schemeFit).toBe(0.6);
    expect(missing.role).not.toContain("off env"); // no fabricated env context
  });

  it("normalizes team abbreviations so historical/spelling variants still join (OAK -> LV)", () => {
    const env: TeamEnvironmentRow[] = [tenv("LV", 0.2, 0.56), tenv("CAR", -0.2, 0.4)];
    const p = buildGradedPool([prof("Raider WR", "WR", 12, "in-line", 80, 8, "OAK")], [], env);
    const raider = p.find((x) => x.name === "Raider WR")!;
    expect(raider.schemeFit).not.toBe(0.6); // joined via OAK->LV alias, not the fallback
  });
});

describe("buildGradedPool — QB forward passing-environment nudge", () => {
  it("nudges an elite-forward QB's ceiling up (floor unchanged), and reflects it in role", () => {
    const profQb = prof("Elite QB", "QB", 20, "in-line", 0, 10, "BUF");
    const base = buildGradedPool([profQb], []);
    const nudged = buildGradedPool([profQb], [], [], [qbf("BUF", 95)]);
    const b = base[0]!;
    const n = nudged[0]!;
    expect(n.ceiling).toBeGreaterThan(b.ceiling); // ceiling nudged up
    expect(n.floor).toBe(b.floor); // floor never nudged
    expect(n.proj).toBe(b.proj); // projection basis unchanged
    expect(n.role).toContain("elite forward prior");
  });

  it("applies a smaller team-passing nudge to pass-catchers on a team with an elite QB", () => {
    const profWr = prof("Stacked WR", "WR", 12, "in-line", 80, 8, "BUF");
    const base = buildGradedPool([profWr], []);
    const nudged = buildGradedPool([profWr], [], [], [qbf("BUF", 95)]);
    const b = base[0]!;
    const n = nudged[0]!;
    expect(n.ceiling).toBeGreaterThan(b.ceiling);
    expect(n.role).toContain("elite passing env");
    // WR nudge (<=5%) is strictly smaller than the QB nudge (<=8%) at the same grade.
    const wrLift = n.ceiling / b.ceiling;
    const qbProf = prof("Elite QB", "QB", 12, "in-line", 0, 10, "BUF");
    const qbLift = buildGradedPool([qbProf], [], [], [qbf("BUF", 95)])[0]!.ceiling / buildGradedPool([qbProf], [])[0]!.ceiling;
    expect(wrLift).toBeLessThan(qbLift);
  });

  it("a non-elite QB forward grade produces no nudge", () => {
    const profQb = prof("Mid QB", "QB", 20, "in-line", 0, 10, "BUF");
    const base = buildGradedPool([profQb], []);
    const same = buildGradedPool([profQb], [], [], [qbf("BUF", 60)]); // below the elite threshold
    expect(same[0]!.ceiling).toBe(base[0]!.ceiling);
    expect(same[0]!.role).not.toContain("elite");
  });
});

describe("buildGradedProvider + the founder gate", () => {
  const pool = buildGradedPool([prof("Live Guy", "WR", 14, "buy-low")], [xfp("Live Guy", 16)]);

  it("is a live provider whose projections are tagged live", () => {
    const provider = buildGradedProvider(pool);
    expect(provider.live).toBe(true);
    expect(provider.players!()).toBe(pool);
    expect(provider.list()[0]!.source).toBe("live");
  });

  it("only drives activePlayerPool when registered AND keyed", () => {
    registerProjectionsProvider(buildGradedProvider(pool));
    expect(activePlayerPool({})).toBe(PLAYERS); // env not set -> gate holds, illustrative
    expect(activePlayerPool({ PROJECTIONS_PROVIDER: "graded" })).toBe(pool); // keyed -> real graded pool
  });
});

describe("loadGradedPool", () => {
  it("degrades to source-error when the model can't load (no fabrication)", async () => {
    const r = await loadGradedPool({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.players).toEqual([]);
  });

  // A minimal player_stats CSV (decodeDatasetText passes plain text through) with
  // one WR over the 25-play threshold, season 2024.
  const statsCsv = [
    "season,season_type,week,position,player_id,player_display_name,recent_team,attempts,carries,targets,passing_epa,rushing_epa,receiving_epa,wopr,target_share,dakota,pacr,fantasy_points_ppr",
    "2024,REG,1,WR,WR1,Real Wideout,KC,0,0,14,0,0,6,0.5,0.25,,,10",
    "2024,REG,2,WR,WR1,Real Wideout,KC,0,0,14,0,0,6,0.5,0.25,,,10",
  ].join("\n");
  const xfpCsv = (season: number) => [
    "season,week,position,player_id,full_name,posteam,total_fantasy_points_exp,total_fantasy_points_diff",
    `${season},1,WR,WR1,Real Wideout,KC,18,0`,
    `${season},2,WR,WR1,Real Wideout,KC,18,0`,
  ].join("\n");

  // A neutral-script play_by_play fixture: KC is a strong offense, CHI a weak one,
  // with >= 30 qualifying early-down neutral-script plays for each so both teams
  // clear team-environment's minPlays. KC carries the WR ("Real Wideout") whose
  // schemeFit we assert against.
  function pbpCsv(): string {
    const header = "down,wp,qtr,posteam,defteam,pass,rush,epa,success,pass_oe,no_huddle";
    const rows: string[] = [];
    for (let i = 0; i < 36; i++) {
      // KC offense vs CHI defense — high EPA / high success.
      rows.push(`1,0.5,2,KC,CHI,1,0,0.4,1,2,0`);
      // CHI offense vs KC defense — negative EPA / low success.
      rows.push(`1,0.5,2,CHI,KC,1,0,-0.3,0,-2,0`);
    }
    return [header, ...rows].join("\n");
  }

  // Routes by URL: nflverse player_stats -> 2024 model; ffverse ep_weekly_{xfp} ->
  // xFP; play_by_play_{pbp} -> team environment. `pbpSeasonServed === null` serves
  // no pbp (team environment degrades to source-error).
  type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
  function route(xfpSeasonServed: number, pbpSeasonServed: number | null = null): FetchLike {
    return async (url) => {
      if (url.includes("player_stats")) return new Response(statsCsv);
      if (url.includes(`ep_weekly_${xfpSeasonServed}.csv`)) return new Response(xfpCsv(xfpSeasonServed));
      if (pbpSeasonServed != null && url.includes(`play_by_play_${pbpSeasonServed}.csv`)) return new Response(pbpCsv());
      return new Response("not found", { status: 404 });
    };
  }

  it("pins xFP to the model's season so the projection basis is xFP, not actual", async () => {
    const r = await loadGradedPool({ fetcher: route(2024) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    const wr = r.players.find((p) => p.id === "WR1")!;
    expect(wr).toBeTruthy();
    // basis = xFP/g 18 * 17 = 306 (NOT actual fppg 10/g -> 170)
    expect(wr.proj).toBe(306);
  });

  it("falls back to the model's per-game when xFP for the model's season is missing (no cross-season basis)", async () => {
    // Only 2025 xFP is served; the 2024 model must NOT borrow it.
    const r = await loadGradedPool({ fetcher: route(2025) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    const wr = r.players.find((p) => p.id === "WR1")!;
    // basis = actual fppg 10/g * 17 = 170 (2025 xFP rejected as off-season)
    expect(wr.proj).toBe(170);
  });

  it("does NOT load team-environment on the live path — schemeFit stays neutral (cold-start budget)", async () => {
    // Even with a season-matched play-by-play available, the runtime path skips it
    // (pbp is ~40MB — too heavy for a serverless cold start; it 500s in prod). The
    // pure buildGradedPool still composes team-environment when given rows (tested
    // above); loadGradedPool just doesn't fetch it. schemeFit -> documented neutral.
    const r = await loadGradedPool({ fetcher: route(2024, 2024) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    const wr = r.players.find((p) => p.id === "WR1")!;
    expect(wr.schemeFit).toBe(0.6); // neutral — team environment not loaded on the hot path
    expect(wr.role).not.toContain("off env");
  });
});
