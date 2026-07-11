/**
 * nflverse → fantasy-engine NFL mappers — aggregation math pinned by hand.
 *
 * Column names mirror the reference engine's verified-by-execution reads
 * (2026-07-11). The fail-closed header assertion is tested explicitly: a
 * drifted schema must throw, never misparse into an empty or fabricated table.
 */
import { describe, expect, it } from "vitest";
import { computeQbTypes } from "@sports/fantasy-engine";
import { parseCsv } from "../nflverse-source.js";
import {
  assertColumns,
  buildReceiverSeasons,
  buildTeamDefenseCategories,
  buildTeamDefensiveLines,
  buildTeamOffensiveLines,
  buildTeamSchemeTendencies,
  buildTeamWindowAggregates,
  parseAdvDefRows,
  parseAdvPassRows,
  parseAdvRushRows,
  parseAdvRecRows,
  parsePbpFantasyPlays,
  parsePlayerSeasonRows,
  topShare,
  toQbSeasons,
} from "../nflverse-fantasy-source.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAYER_CSV = [
  "player_display_name,recent_team,position,games,attempts,carries,rushing_yards,rushing_tds,fantasy_points,sacks_suffered,targets,receiving_yards,receiving_epa,target_share",
  "Mobile QB,KC,QB,17,500,110,600,5,320,30,0,0,0,",
  "Pocket QB,KC,QB,10,100,10,20,0,150,10,0,0,0,",
  "Backup QB,KC,QB,3,40,5,10,0,20,5,0,0,0,",
  "Lead RB,KC,RB,17,0,200,900,7,180,0,40,250,10,0.08",
  "Change RB,KC,RB,16,0,100,420,2,90,0,20,120,4,0.04",
  "Alpha WR,KC,WR,16,0,0,0,0,220,0,90,1200,45,0.28",
  "Beta WR,KC,WR,17,0,0,0,0,140,0,60,800,20,",
  "Gamma TE,KC,TE,14,0,0,0,0,90,0,30,350,8,0.09",
  "Thin WR,KC,WR,15,0,0,0,0,30,0,20,150,2,0.05",
  "Bad Team WR,XXX,WR,16,0,0,0,0,100,0,80,900,30,0.2",
].join("\n");

const ADV_PASS_CSV = [
  "season,team,pass_attempts,pressure_pct,pocket_time",
  "2025,KC,300,20,2.5",
  "2025,KC,100,28,2.1",
  "2024,KC,400,35,2.0",
].join("\n");

const ADV_RUSH_CSV = [
  "season,tm,att,ybc_att",
  "2025,KC,200,2.4",
  "2025,KC,50,3.0",
].join("\n");

const ADV_REC_CSV = [
  "season,player,tm,adot,yac_r,brk_tkl,drop_percent,rat",
  "2025,Alpha WR,KC,11.2,5.4,8,3.1,110.5",
].join("\n");

const ADV_DEF_CSV = [
  "season,tm,tgt,cmp_percent,rat,prss,sk,qbkd,hrry",
  "2025,SF,60,65,95,30,6,10,14",
  "2025,SF,40,55,80,20,4,6,10",
].join("\n");

// pbp: KC offense over 2 games (10 scrimmage plays), SF defense on the other side.
const PBP_CSV = [
  "game_id,week,posteam,defteam,pass,rush,pass_oe,epa",
  // game 1, week 1 — 6 plays
  "g1,1,KC,SF,1,0,5,0.5",
  "g1,1,KC,SF,1,0,3,-0.2",
  "g1,1,KC,SF,0,1,,-0.1",
  "g1,1,KC,SF,0,1,,0.3",
  "g1,1,KC,SF,1,0,-1,0.1",
  "g1,1,KC,SF,0,1,,-0.4",
  // game 2, week 10 — 4 plays
  "g2,10,KC,SF,1,0,7,0.6",
  "g2,10,KC,SF,0,1,,0.2",
  "g2,10,KC,SF,1,0,2,-0.3",
  "g2,10,KC,SF,0,1,,0.0",
  // dropped rows: postseason week + non-scrimmage play
  "g3,19,KC,SF,1,0,4,0.9",
  "g1,1,KC,SF,0,0,,0.0",
].join("\n");

const players = parsePlayerSeasonRows(parseCsv(PLAYER_CSV));
const plays = parsePbpFantasyPlays(parseCsv(PBP_CSV));

// ── Fail-closed schema assertion ──────────────────────────────────────────────

describe("assertColumns (fail-closed schema pin)", () => {
  it("throws naming the missing columns instead of misparsing", () => {
    const drifted = parseCsv("player_display_name,team_abbr\nX,KC\n");
    expect(() => parsePlayerSeasonRows(drifted)).toThrow(/missing expected columns/);
    expect(() => parsePlayerSeasonRows(drifted)).toThrow(/recent_team/);
  });

  it("passes when every required column exists", () => {
    expect(() =>
      assertColumns(parseCsv(PLAYER_CSV), ["games", "targets"], "x"),
    ).not.toThrow();
  });
});

// ── Season stats + QB population ──────────────────────────────────────────────

describe("player season rows → QbSeason", () => {
  it("filters to valid teams and preserves NaN for empty cells", () => {
    expect(players.find((p) => p.playerName === "Bad Team WR")).toBeUndefined();
    const beta = players.find((p) => p.playerName === "Beta WR")!;
    expect(beta.targetShare).toBeNaN(); // empty cell stays NaN, never 0
  });

  it("applies the reference ≥100-attempt floor and feeds computeQbTypes", () => {
    const qbs = toQbSeasons(players);
    expect(qbs.map((q) => q.row.playerName)).toEqual(["Mobile QB", "Pocket QB"]);
    const scores = computeQbTypes(qbs.map((q) => q.season));
    // 110 carries / 17 g = 6.47/g ≥ 6 → Very Mobile; 10/10 = 1/g → Pocket.
    expect(scores[0]!.type).toBe("Very Mobile/Running");
    expect(scores[1]!.type).toBe("Pocket");
  });
});

// ── Trench ────────────────────────────────────────────────────────────────────

describe("trench mappers", () => {
  const advPass = parseAdvPassRows(parseCsv(ADV_PASS_CSV), 2025);
  const advRush = parseAdvRushRows(parseCsv(ADV_RUSH_CSV), 2025);

  it("filters PFR season rows to the requested season", () => {
    expect(advPass).toHaveLength(2); // the 2024 row is excluded
  });

  it("builds TeamOffensiveLine on the reference weighted formulas", () => {
    const [ol] = buildTeamOffensiveLines(advPass, advRush, players);
    expect(ol!.team).toBe("KC");
    // (20·300 + 28·100)/400
    expect(ol!.pressurePct).toBeCloseTo(22.0, 10);
    // (2.5·300 + 2.1·100)/400
    expect(ol!.pocketTime).toBeCloseTo(2.4, 10);
    // QB room: sacks 30+10+5, attempts 500+100+40 → 45/(640+45)
    expect(ol!.sackRate).toBeCloseTo(45 / 685, 10);
    // (2.4·200 + 3.0·50)/250
    expect(ol!.yardsBeforeContactPerAtt).toBeCloseTo(2.52, 10);
  });

  it("builds TeamDefensiveLine by summing the pass-rush counting stats", () => {
    const [dl] = buildTeamDefensiveLines(parseAdvDefRows(parseCsv(ADV_DEF_CSV), 2025));
    expect(dl!).toEqual({ team: "SF", pressures: 50, sacks: 10, qbKnockdowns: 16, hurries: 24 });
  });
});

// ── Receivers ─────────────────────────────────────────────────────────────────

describe("buildReceiverSeasons", () => {
  const advRec = parseAdvRecRows(parseCsv(ADV_REC_CSV), 2025);
  const receivers = buildReceiverSeasons(players, advRec);

  it("applies the ≥30-target floor to WR/TE only", () => {
    expect(receivers.map((r) => r.row.playerName)).toEqual([
      "Lead RB",
      "Change RB",
      "Alpha WR",
      "Beta WR",
      "Gamma TE",
    ].filter((n) => n.includes("WR") || n.includes("TE")));
  });

  it("merges PFR fields by (player, team) and leaves unmatched rows NaN", () => {
    const alpha = receivers.find((r) => r.row.playerName === "Alpha WR")!;
    expect(alpha.season.recYardsPerGame).toBeCloseTo(1200 / 16, 10);
    expect(alpha.season.adot).toBeCloseTo(11.2, 10);
    expect(alpha.season.dropPercent).toBeCloseTo(3.1, 10);
    const gamma = receivers.find((r) => r.row.playerName === "Gamma TE")!;
    expect(gamma.season.adot).toBeNaN(); // no PFR match → NaN, engine tiers null
  });

  it("falls back to targets/games/35 when target_share is absent", () => {
    const beta = receivers.find((r) => r.row.playerName === "Beta WR")!;
    expect(beta.season.targetShare).toBeCloseTo(60 / 17 / 35, 10);
  });
});

// ── pbp aggregates ────────────────────────────────────────────────────────────

describe("pbp parsing and aggregates", () => {
  it("keeps regular-season scrimmage plays only", () => {
    expect(plays).toHaveLength(10); // week-19 and pass=0/rush=0 rows dropped
  });

  it("builds TeamSchemeTendencies (pace, PROE, concentration)", () => {
    const [kc] = buildTeamSchemeTendencies(plays, players);
    expect(kc!.team).toBe("KC");
    expect(kc!.playsPerGame).toBeCloseTo(5, 10); // 10 plays / 2 games
    // PROE over finite pass_oe: (5+3-1+7+2)/5
    expect(kc!.proe).toBeCloseTo(3.2, 10);
    // RB carries 200/100 → 200/300; WR/TE targets 90/60/30/20 → 90/200
    expect(kc!.rbBellcowShare).toBeCloseTo(200 / 300, 10);
    expect(kc!.wr1TargetShare).toBeCloseTo(90 / 200, 10);
  });

  it("builds TeamDefenseCategories (EPA splits + weighted coverage)", () => {
    const advDef = parseAdvDefRows(parseCsv(ADV_DEF_CSV), 2025);
    const [sf] = buildTeamDefenseCategories(plays, advDef);
    expect(sf!.team).toBe("SF");
    // pass EPA allowed: (0.5 −0.2 +0.1 +0.6 −0.3)/5
    expect(sf!.passEpaAllowed).toBeCloseTo(0.7 / 5, 10);
    // rush EPA allowed: (−0.1 +0.3 −0.4 +0.2 +0.0)/5
    expect(sf!.rushEpaAllowed).toBeCloseTo(0.0, 10);
    // rush success (epa>0): 2 of 5
    expect(sf!.rushSuccessRateAllowed).toBeCloseTo(0.4, 10);
    // overall: sum(all 10)/10 = 0.7/10
    expect(sf!.epaPerPlayAllowed).toBeCloseTo(0.07, 10);
    // coverage tgt-weighted: cmp (65·60+55·40)/100, rat (95·60+80·40)/100
    expect(sf!.coverageCompletionPct).toBeCloseTo(61, 10);
    expect(sf!.coverageRating).toBeCloseTo(89, 10);
    expect(sf!.pressures).toBe(50);
  });

  it("builds season vs recent windows (last 4 weeks of the sample)", () => {
    const [kc] = buildTeamWindowAggregates(plays);
    expect(kc!.season.playsPerGame).toBeCloseTo(5, 10);
    // Recent window: max week 10 → weeks ≥ 7 → game 2 only (4 plays).
    expect(kc!.recent.playsPerGame).toBeCloseTo(4, 10);
    expect(kc!.recent.proe).toBeCloseTo((7 + 2) / 2, 10);
    expect(kc!.recent.offEpaPerPlay).toBeCloseTo((0.6 + 0.2 - 0.3 + 0.0) / 4, 10);
    // Delta feed: recent PROE 4.5 vs season 3.2 → the rolling module's input.
    expect(kc!.recent.proe - kc!.season.proe).toBeCloseTo(1.3, 10);
  });

  it("topShare is NaN on a zero total (never a fabricated share)", () => {
    expect(topShare([0, 0])).toBeNaN();
    expect(topShare([])).toBeNaN();
  });
});
