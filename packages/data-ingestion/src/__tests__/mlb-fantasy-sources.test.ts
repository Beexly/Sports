/**
 * MLB fantasy data plane — adapter tests.
 *
 * Fixtures are excerpts of the LIVE responses captured 2026-07-11 (the same
 * verification pass recorded in the source-rights registry entries), so the
 * parsers are pinned to the real wire formats: Savant's BOM + quoted-decimal
 * xwoba, statsapi's string era/whip/goAo and thirds-notation innings. Math
 * expectations are hand-computed on the reference-engine formulas.
 */
import { describe, expect, it } from "vitest";
import { computeBurr, computeRvs } from "@sports/fantasy-engine";
import {
  buildSavantCustomUrl,
  buildTeamStatcastAllowed,
  fetchSavantSmashLeaderboard,
  parseSavantCustomCsv,
  toHitterSkillInputs,
  SAVANT_SMASH_SELECTIONS,
} from "../baseball-savant-source.js";
import {
  buildRelieverSeasons,
  buildTeamBullpenCategories,
  consolidateByPlayer,
  fetchMlbPitcherSeasons,
  ipToInnings,
  isReliever,
  parseMlbPitchingStats,
  relieverFipConstant,
  relieverPidToTeam,
  type MlbPitcherSeasonLine,
} from "../mlb-statsapi-source.js";
import type { SourceClearanceProof } from "../source-clearance.js";

// ── Clearance proofs (what the app-side gate mints from a granted result) ─────

const savantProof: SourceClearanceProof = {
  sourceId: "baseball-savant",
  allowed: true,
  checkedAt: "2026-07-11T00:00:00.000Z",
  attributionText: "Statcast data via Baseball Savant (baseballsavant.mlb.com)",
};
const statsApiProof: SourceClearanceProof = {
  sourceId: "mlb-statsapi",
  allowed: true,
  checkedAt: "2026-07-11T00:00:00.000Z",
  attributionText: "Source statistics via MLB Stats API (statsapi.mlb.com)",
};

// ── ipToInnings ───────────────────────────────────────────────────────────────

describe("ipToInnings (baseball thirds notation)", () => {
  it("resolves the fractional digit as thirds, not tenths", () => {
    expect(ipToInnings("609.1")).toBeCloseTo(609 + 1 / 3, 10);
    expect(ipToInnings("10.2")).toBeCloseTo(10 + 2 / 3, 10);
    expect(ipToInnings("1443.0")).toBe(1443);
    expect(ipToInnings("7")).toBe(7);
  });

  it("returns NaN on malformed input instead of misreading it", () => {
    expect(ipToInnings("10.5")).toBeNaN(); // .5 is not a legal thirds digit
    expect(ipToInnings(".1")).toBeNaN();
    expect(ipToInnings("")).toBeNaN();
    expect(ipToInnings("abc")).toBeNaN();
  });
});

// ── Savant CSV (live excerpt, 2026-07-11) ─────────────────────────────────────

const SAVANT_CSV =
  '﻿"last_name, first_name","player_id","year","pa","xwoba","k_percent","bb_percent","barrel_batted_rate","hard_hit_percent","whiff_percent"\n' +
  '"Meidroth, Chase",805367,2025,500,".300",14.3,8.9,1.6,36.1,13\n' +
  '"Perez, Salvador",521692,2025,600,".357",19.5,4.4,14.8,46.7,26.9\n' +
  '"Schwarber, Kyle",656941,2025,700,".401",27.2,14.9,20.8,59.6,33.1\n';

describe("parseSavantCustomCsv", () => {
  it("parses the live wire format: BOM, quoted comma names, dot-decimal strings", () => {
    const rows = parseSavantCustomCsv(SAVANT_CSV);
    expect(rows).toHaveLength(3);
    const meidroth = rows[0]!;
    expect(meidroth.playerId).toBe(805367);
    expect(meidroth.name).toBe("Meidroth, Chase");
    expect(meidroth.year).toBe(2025);
    expect(meidroth.pa).toBe(500);
    expect(meidroth.xwoba).toBeCloseTo(0.3, 10); // ".300" string decimal
    expect(meidroth.kPercent).toBeCloseTo(14.3, 10); // percent units preserved
    expect(rows[2]!.barrelBattedRate).toBeCloseTo(20.8, 10);
  });

  it("drops rows without a player_id and preserves gaps as NaN", () => {
    const rows = parseSavantCustomCsv(
      SAVANT_CSV + '"Ghost, Row",,2025,,,,,,,\n',
    );
    expect(rows).toHaveLength(3);
    const sparse = parseSavantCustomCsv(
      '﻿"last_name, first_name","player_id","year","pa","xwoba","k_percent","bb_percent","barrel_batted_rate","hard_hit_percent","whiff_percent"\n' +
        '"Sparse, Sam",1,2025,,,,,,,\n',
    );
    expect(sparse[0]!.xwoba).toBeNaN();
    expect(sparse[0]!.pa).toBeNaN();
  });

  it("maps to HitterSkillInput with identity preserved in order", () => {
    const inputs = toHitterSkillInputs(parseSavantCustomCsv(SAVANT_CSV));
    expect(inputs[1]!.name).toBe("Perez, Salvador");
    expect(inputs[1]!.input).toEqual({
      xwoba: 0.357,
      barrelBattedRate: 14.8,
      hardHitPercent: 46.7,
      kPercent: 19.5,
      bbPercent: 4.4,
      whiffPercent: 26.9,
    });
  });
});

describe("buildSavantCustomUrl", () => {
  it("pins the exact live-verified parameter shape", () => {
    const url = buildSavantCustomUrl({ year: 2025, type: "pitcher" });
    expect(url).toBe(
      "https://baseballsavant.mlb.com/leaderboard/custom?year=2025&type=pitcher&filter=&min=q" +
        `&selections=${encodeURIComponent(SAVANT_SMASH_SELECTIONS.join(","))}` +
        "&chart=false&x=xwoba&y=xwoba&r=no&chartType=beeswarm&sort=xwoba&sortDir=desc&csv=true",
    );
  });

  it("supports a numeric PA floor", () => {
    expect(buildSavantCustomUrl({ year: 2025, type: "batter", min: 10 })).toContain("min=10");
  });
});

describe("buildTeamStatcastAllowed", () => {
  // Live pitcher rows 2026-07-11: Feltner pa=135 xwoba .284 brl 4.1 hh 35.7;
  // Erceg pa=249 xwoba .305 brl 7.3 hh 37.4.
  const pitcherCsv =
    '﻿"last_name, first_name","player_id","year","pa","xwoba","k_percent","bb_percent","barrel_batted_rate","hard_hit_percent","whiff_percent"\n' +
    '"Feltner, Ryan",663372,2025,135,".284",20,8,4.1,35.7,22\n' +
    '"Erceg, Lucas",668674,2025,249,".305",25,7,7.3,37.4,28\n' +
    '"Unknown, Pitcher",999999,2025,100,".400",10,10,10,50,10\n';

  it("PA-weights per team and skips pids outside the reliever map", () => {
    const rows = parseSavantCustomCsv(pitcherCsv);
    const pidToTeam = new Map<number, string>([
      [663372, "Test Team"],
      [668674, "Test Team"],
    ]);
    const byTeam = buildTeamStatcastAllowed(rows, pidToTeam);
    expect(byTeam.size).toBe(1);
    const t = byTeam.get("Test Team")!;
    // (0.284·135 + 0.305·249) / 384
    expect(t.xwobaAllowed).toBeCloseTo(114.285 / 384, 10);
    expect(t.barrelAllowed).toBeCloseTo(2371.2 / 384, 10);
    expect(t.hardHitAllowed).toBeCloseTo(14132.1 / 384, 10);
  });
});

// ── statsapi parsing (live excerpt, 2026-07-11) ───────────────────────────────

const STATSAPI_FIXTURE = {
  copyright: "Copyright 2026 MLB Advanced Media, L.P.",
  stats: [
    {
      type: { displayName: "season" },
      group: { displayName: "pitching" },
      totalSplits: 2,
      splits: [
        {
          season: "2025",
          stat: {
            gamesPlayed: 1,
            gamesStarted: 0,
            strikeOuts: 0,
            baseOnBalls: 2,
            hits: 0,
            hitByPitch: 0,
            era: "0.00",
            inningsPitched: "1.0",
            saves: 0,
            saveOpportunities: 0,
            holds: 0,
            blownSaves: 0,
            earnedRuns: 0,
            runs: 0,
            whip: "2.00",
            battersFaced: 5,
            gamesPitched: 1,
            homeRuns: 0,
            inheritedRunners: 0,
            inheritedRunnersScored: 0,
            groundOutsToAirouts: "0.00",
          },
          team: { id: 139, name: "Tampa Bay Rays" },
          player: { id: 670183, fullName: "Garrett Acton" },
        },
        {
          season: "2025",
          stat: {
            gamesPitched: 60,
            gamesStarted: 0,
            inningsPitched: "60.1",
            strikeOuts: 70,
            baseOnBalls: 20,
            battersFaced: 240,
            saves: 30,
            holds: 5,
            blownSaves: 4,
            saveOpportunities: 34,
            earnedRuns: 18,
            runs: 20,
            hits: 45,
            hitByPitch: 2,
            homeRuns: 5,
            inheritedRunners: 12,
            inheritedRunnersScored: 3,
            groundOutsToAirouts: "1.10",
          },
          team: { id: 135, name: "San Diego Padres" },
          player: { id: 111111, fullName: "Test Closer" },
        },
      ],
    },
  ],
};

describe("parseMlbPitchingStats", () => {
  it("parses the live wire format: string decimals, thirds innings, team names", () => {
    const { lines, totalSplits } = parseMlbPitchingStats(STATSAPI_FIXTURE);
    expect(totalSplits).toBe(2);
    expect(lines).toHaveLength(2);
    const acton = lines[0]!;
    expect(acton.playerId).toBe(670183);
    expect(acton.playerName).toBe("Garrett Acton");
    expect(acton.teamName).toBe("Tampa Bay Rays");
    expect(acton.inningsPitched).toBe(1);
    expect(acton.goAo).toBe(0);
    const closer = lines[1]!;
    expect(closer.inningsPitched).toBeCloseTo(60 + 1 / 3, 10);
    expect(closer.inheritedRunners).toBe(12);
  });

  it("returns empty on unknown shapes instead of throwing", () => {
    expect(parseMlbPitchingStats(null).lines).toEqual([]);
    expect(parseMlbPitchingStats({}).lines).toEqual([]);
    expect(parseMlbPitchingStats({ stats: [{}] }).lines).toEqual([]);
  });

  it("defaults a missing goAo to the neutral 1.0 (reference convention)", () => {
    const fixture = {
      stats: [
        {
          totalSplits: 1,
          splits: [
            {
              stat: { gamesPitched: 1, gamesStarted: 0, inningsPitched: "2.0" },
              player: { id: 5, fullName: "No GoAo" },
            },
          ],
        },
      ],
    };
    expect(parseMlbPitchingStats(fixture).lines[0]!.goAo).toBe(1.0);
  });
});

// ── Consolidation ─────────────────────────────────────────────────────────────

function line(partial: Partial<MlbPitcherSeasonLine> & { playerId: number }): MlbPitcherSeasonLine {
  return {
    playerName: `P${partial.playerId}`,
    teamName: null,
    gamesPitched: 0,
    gamesStarted: 0,
    inningsPitched: 0,
    saves: 0,
    holds: 0,
    blownSaves: 0,
    saveOpportunities: 0,
    earnedRuns: 0,
    runs: 0,
    hits: 0,
    baseOnBalls: 0,
    hitByPitch: 0,
    strikeOuts: 0,
    homeRuns: 0,
    battersFaced: 0,
    inheritedRunners: 0,
    inheritedRunnersScored: 0,
    goAo: 1.0,
    ...partial,
  };
}

describe("consolidateByPlayer", () => {
  it("sums per-team stints and IGNORES a no-team totals row (no double count)", () => {
    const rows = [
      line({ playerId: 1, teamName: "A", gamesPitched: 10, inningsPitched: 12, strikeOuts: 15, goAo: 1.0 }),
      line({ playerId: 1, teamName: "B", gamesPitched: 20, inningsPitched: 24, strikeOuts: 30, goAo: 0.7 }),
      // Combined totals row (team absent) — must NOT be added on top.
      line({ playerId: 1, teamName: null, gamesPitched: 30, inningsPitched: 36, strikeOuts: 45 }),
    ];
    const [p] = consolidateByPlayer(rows);
    expect(p!.gamesPitched).toBe(30);
    expect(p!.inningsPitched).toBe(36);
    expect(p!.strikeOuts).toBe(45);
    expect(p!.teamName).toBe("B"); // largest stint's team
    // IP-weighted goAo: (1.0·12 + 0.7·24)/36
    expect(p!.goAo).toBeCloseTo((12 + 16.8) / 36, 10);
  });

  it("uses a no-team row when it is the player's only row", () => {
    const [p] = consolidateByPlayer([line({ playerId: 2, gamesPitched: 3, inningsPitched: 4 })]);
    expect(p!.gamesPitched).toBe(3);
    expect(p!.teamName).toBeNull();
  });
});

// ── Reliever pool math (hand-computed on the reference formulas) ──────────────

const R1 = line({
  playerId: 10,
  teamName: "Test Team",
  gamesPitched: 20,
  gamesStarted: 0,
  inningsPitched: 30,
  saves: 5,
  holds: 3,
  blownSaves: 1,
  saveOpportunities: 6,
  earnedRuns: 10,
  runs: 12,
  hits: 20,
  baseOnBalls: 10,
  hitByPitch: 1,
  strikeOuts: 30,
  homeRuns: 2,
  battersFaced: 120,
  inheritedRunners: 10,
  inheritedRunnersScored: 2,
  goAo: 1.2,
});
const R2 = line({
  playerId: 11,
  teamName: "Test Team",
  gamesPitched: 30,
  gamesStarted: 0,
  inningsPitched: 45,
  saves: 0,
  holds: 10,
  blownSaves: 2,
  saveOpportunities: 1,
  earnedRuns: 25,
  runs: 30,
  hits: 50,
  baseOnBalls: 20,
  hitByPitch: 3,
  strikeOuts: 40,
  homeRuns: 4,
  battersFaced: 200,
  inheritedRunners: 8,
  inheritedRunnersScored: 4,
  goAo: 0.8,
});
const STARTER = line({
  playerId: 12,
  teamName: "Test Team",
  gamesPitched: 30,
  gamesStarted: 30,
  inningsPitched: 180,
  strikeOuts: 200,
  battersFaced: 700,
});

describe("reliever pool math", () => {
  it("isReliever = pure relief appearances (GS 0, GP ≥ 1)", () => {
    expect(isReliever(R1)).toBe(true);
    expect(isReliever(STARTER)).toBe(false);
    expect(isReliever(line({ playerId: 9, gamesPitched: 0 }))).toBe(false);
  });

  it("computes the league FIP constant over the reliever pool", () => {
    const pool = consolidateByPlayer([R1, R2]);
    // lgERA = 9·35/75 = 4.2; components = (13·6 + 3·34 − 2·70)/75 = 40/75
    expect(relieverFipConstant(pool)).toBeCloseTo(4.2 - 40 / 75, 10);
  });

  it("builds RelieverSeason rows on the reference formulas, with an IP floor", () => {
    const consolidated = consolidateByPlayer([R1, R2, STARTER]);
    const { relievers, fipConstant } = buildRelieverSeasons(consolidated);
    expect(relievers).toHaveLength(2); // starter excluded
    const r1 = relievers.find((r) => r.playerId === 10)!;
    // kMinusBb = 30/120 − 10/120
    expect(r1.season.kMinusBb).toBeCloseTo(20 / 120, 10);
    // FIP = (26 + 33 − 60)/30 + cFIP
    expect(r1.season.fip).toBeCloseTo(-1 / 30 + fipConstant, 10);
    expect(r1.season.saveOpportunities).toBe(6);

    // The population feeds computeRvs directly (closer outranks middle relief).
    const scores = computeRvs(relievers.map((r) => r.season));
    expect(scores).toHaveLength(2);
    expect(scores[0]!.role).toBe("Closer");
  });

  it("applies the minimum-innings floor to the RVS pool but not the constant", () => {
    const tiny = line({
      playerId: 13,
      gamesPitched: 2,
      gamesStarted: 0,
      inningsPitched: 2,
      earnedRuns: 1,
      battersFaced: 9,
    });
    const consolidated = consolidateByPlayer([R1, R2, tiny]);
    const withFloor = buildRelieverSeasons(consolidated);
    expect(withFloor.relievers.map((r) => r.playerId)).toEqual([10, 11]);
    // The constant covers the FULL pool (tiny included) — reference convention.
    expect(withFloor.fipConstant).not.toBeCloseTo(
      relieverFipConstant(consolidateByPlayer([R1, R2])),
      12,
    );
  });
});

// ── Team bullpen categories (BURR input) ──────────────────────────────────────

describe("buildTeamBullpenCategories", () => {
  const consolidated = consolidateByPlayer([R1, R2]);
  const fipConstant = relieverFipConstant(consolidated);
  const statcast = new Map([
    ["Test Team", { xwobaAllowed: 0.31, barrelAllowed: 7.5, hardHitAllowed: 39.2 }],
  ]);

  it("aggregates on the reference formulas (hand-computed)", () => {
    const [t] = buildTeamBullpenCategories([R1, R2, STARTER], fipConstant, statcast);
    expect(t!.team).toBe("Test Team");
    expect(t!.era).toBeCloseTo(4.2, 10); // 9·35/75
    expect(t!.fip).toBeCloseTo(40 / 75 + fipConstant, 10);
    expect(t!.kPct).toBeCloseTo(70 / 320, 10);
    expect(t!.bbPct).toBeCloseTo(30 / 320, 10);
    expect(t!.kMinusBb).toBeCloseTo(40 / 320, 10);
    expect(t!.hrPer9).toBeCloseTo(0.72, 10); // 9·6/75
    expect(t!.whip).toBeCloseTo(100 / 75, 10);
    expect(t!.lob).toBeCloseTo(62 / 95.6, 10); // (104−42)/(104−8.4)
    expect(t!.inheritedStrandRate).toBeCloseTo(1 - 6 / 18, 10);
    expect(t!.saveConversion).toBeCloseTo(5 / 8, 10);
    expect(t!.goAo).toBeCloseTo(0.96, 10); // (1.2·30 + 0.8·45)/75
    expect(t!.xwobaAllowed).toBeCloseTo(0.31, 10);
  });

  it("nulls the no-chance rates and NaNs missing Statcast (never fabricates)", () => {
    const quiet = line({
      playerId: 14,
      teamName: "Quiet Team",
      gamesPitched: 5,
      gamesStarted: 0,
      inningsPitched: 6,
      earnedRuns: 2,
      hits: 5,
      baseOnBalls: 2,
      strikeOuts: 7,
      battersFaced: 25,
    });
    const [t] = buildTeamBullpenCategories([quiet], fipConstant, new Map());
    expect(t!.inheritedStrandRate).toBeNull(); // IR = 0
    expect(t!.saveConversion).toBeNull(); // SV+BS = 0
    expect(t!.xwobaAllowed).toBeNaN();
    // computeBurr treats the NaN columns as neutral instead of crashing.
    const scores = computeBurr([t!]);
    expect(scores[0]!.burr).toBeGreaterThan(0);
  });

  it("exposes the pid→team map for the Savant join (relievers only)", () => {
    const map = relieverPidToTeam(consolidateByPlayer([R1, R2, STARTER]));
    expect(map.get(10)).toBe("Test Team");
    expect(map.has(12)).toBe(false); // starter excluded
  });
});

// ── Clearance enforcement + fetch pagination ──────────────────────────────────

describe("clearance enforcement", () => {
  it("refuses a proof granted for a different source", async () => {
    await expect(
      fetchSavantSmashLeaderboard({ year: 2025, type: "batter" }, statsApiProof),
    ).rejects.toThrow(/refusing to fetch/);
    await expect(fetchMlbPitcherSeasons(2025, savantProof)).rejects.toThrow(
      /refusing to fetch/,
    );
  });

  it("fetches and parses with a valid proof (no network — mocked transport)", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response(SAVANT_CSV, { status: 200 });
    }) as typeof globalThis.fetch;
    const rows = await fetchSavantSmashLeaderboard(
      { year: 2025, type: "batter" },
      savantProof,
      fetchImpl,
    );
    expect(rows).toHaveLength(3);
    expect(urls[0]).toContain("csv=true");
  });

  it("throws on non-200 instead of returning fabricated emptiness", async () => {
    const fetchImpl = (async () => new Response("nope", { status: 503 })) as typeof globalThis.fetch;
    await expect(
      fetchSavantSmashLeaderboard({ year: 2025, type: "batter" }, savantProof, fetchImpl),
    ).rejects.toThrow(/HTTP 503/);
  });

  it("paginates statsapi on totalSplits", async () => {
    const page = (count: number, totalSplits: number) => ({
      stats: [
        {
          totalSplits,
          splits: Array.from({ length: count }, (_, i) => ({
            stat: { gamesPitched: 1, gamesStarted: 0, inningsPitched: "1.0" },
            player: { id: i + 1, fullName: `P${i + 1}` },
            team: { id: 1, name: "T" },
          })),
        },
      ],
    });
    const responses = [page(500, 600), page(100, 600)];
    const urls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response(JSON.stringify(responses.shift()), { status: 200 });
    }) as typeof globalThis.fetch;
    const lines = await fetchMlbPitcherSeasons(2025, statsApiProof, fetchImpl);
    expect(lines).toHaveLength(600);
    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("offset=500");
  });
});
