import { describe, expect, it } from "vitest";
import {
  buildMatchupRows,
  buildOpponentDefense,
  buildOpponentMap,
  buildTeamDefenseFromCoverage,
  computeMatchupDelta,
} from "@/lib/intelligence/matchup";
import type { ScheduleContext, ScheduleContextRow } from "@/lib/nflverse/schedule-context";
import type { TeamEnvironment, TeamEnvironmentRow } from "@/lib/intelligence/team-environment";
import type {
  CoverageRow,
  NflversePressureCoverage,
  TeamPassRushRow,
} from "@/lib/nflverse/pressure-coverage";
import type { PlayerModel, PlayerProfile } from "@/lib/intelligence/player-model";

// ── Minimal, real-shaped factories (no fabricated grades; just test scaffolding) ──

function scheduleRow(home: string, away: string): ScheduleContextRow {
  return {
    gameId: `2025_01_${away}_${home}`,
    season: 2025,
    week: 1,
    gameType: "REG",
    gameday: "2025-09-07",
    awayTeam: away,
    homeTeam: home,
    game: `${away} @ ${home}`,
    homeRest: 7,
    awayRest: 7,
    restEdge: 0,
    roof: "outdoors",
    surface: "grass",
    divGame: false,
    temp: null,
    wind: null,
    spreadLine: null,
    totalLine: null,
  };
}

function schedule(rows: ScheduleContextRow[]): ScheduleContext {
  return {
    generatedAt: "t",
    status: "live",
    season: 2025,
    week: 1,
    sourceRows: rows.length,
    rows,
    canPublishProjections: false,
    note: "",
    sourceUrl: "",
    error: null,
  };
}

function envRow(team: string, overrides: Partial<TeamEnvironmentRow> = {}): TeamEnvironmentRow {
  return {
    team,
    offPlays: 100,
    defPlays: 100,
    offEpaPerPlay: 0,
    defEpaPerPlay: 0,
    offSuccessRate: 0.45,
    defSuccessRate: 0.45,
    proe: 0,
    noHuddleRate: 0.04,
    offEpaPct: 50,
    defEpaPct: 50,
    offScrimmagePlays: 100,
    successRate: 0.45,
    explosiveRate: 0.1,
    earlyDownPassRate: 0.5,
    neutralProe: 0,
    neutralEpaPerPlay: 0,
    shotgunRate: 0.6,
    cpoe: 0,
    thirdDownConvRate: 0.4,
    redZoneEpaPerPlay: 0,
    redZonePlays: 10,
    driveScoreRate: 0.4,
    ...overrides,
  };
}

function environment(rows: TeamEnvironmentRow[]): TeamEnvironment {
  return {
    generatedAt: "t",
    status: "live",
    season: 2025,
    sourceRows: rows.length,
    rows,
    canPublishProjections: false,
    note: "",
    sourceUrl: "",
    error: null,
  };
}

function coverageRow(team: string, overrides: Partial<CoverageRow> = {}): CoverageRow {
  return {
    playerId: `cov-${team}-${Math.random()}`,
    name: "Cover Defender",
    team,
    games: 8,
    targets: 60,
    completionsAllowed: 35,
    completionPct: 0.58,
    yardsPerTarget: 7,
    passerRatingAllowed: 92,
    missedTacklePct: 0.1,
    adotAllowed: 9,
    blitzes: 0,
    hurries: 0,
    qbKnockdowns: 0,
    pressures: 0,
    sacks: 0,
    ...overrides,
  };
}

function rushRow(team: string, overrides: Partial<TeamPassRushRow> = {}): TeamPassRushRow {
  return {
    team,
    defenders: 12,
    pressures: 100,
    blitzes: 80,
    sacks: 30,
    qbKnockdowns: 25,
    hurries: 60,
    ...overrides,
  };
}

function pressureCoverage(
  coverage: CoverageRow[],
  teamPassRush: TeamPassRushRow[],
): NflversePressureCoverage {
  return {
    generatedAt: "t",
    status: "live",
    season: 2025,
    seasonType: "REG",
    sourceRows: coverage.length + teamPassRush.length,
    qbPressure: [],
    coverage,
    teamPassRush,
    receivingAdvanced: [],
    canPublishProjections: false,
    blockReason: "",
    sourceUrls: { pass: "", def: "", rec: "" },
    error: null,
  };
}

function profile(team: string, overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    playerId: `p-${team}`,
    name: `Player ${team}`,
    team,
    position: "WR",
    games: 10,
    plays: 400,
    fantasyPpr: 150,
    fppg: 15,
    epaPerPlay: 0.1,
    touches: 80,
    wopr: 0.5,
    targetShare: 0.25,
    dakota: null,
    pacr: null,
    processGrade: 70,
    productionPct: 60,
    signal: "in-line",
    note: "",
    ...overrides,
  };
}

function model(profiles: PlayerProfile[]): PlayerModel {
  return {
    generatedAt: "t",
    status: "live",
    season: 2025,
    throughWeek: 18,
    sourceRows: profiles.length,
    metricsPerPlayer: 6,
    profiles,
    canPublishProjections: false,
    note: "",
    sourceUrl: "",
    error: null,
  };
}

describe("matchup engine — team-code alias normalization (M7)", () => {
  it("collapses relocation/spelling variants to one key in the opponent map", () => {
    // Each game uses a DIFFERENT variant code for the same franchise; after
    // normalization both sides must resolve to the canonical key.
    const sched = schedule([
      scheduleRow("WAS", "OAK"), // WAS->WSH home, OAK->LV away
      scheduleRow("SD", "STL"), // SD->LAC home, STL->LA away
    ]);
    const map = buildOpponentMap(sched);

    // Canonical keys present; variant keys absent (folded, not duplicated).
    expect(map.has("WSH")).toBe(true);
    expect(map.has("WAS")).toBe(false);
    expect(map.has("LV")).toBe(true);
    expect(map.has("OAK")).toBe(false);
    expect(map.has("LAC")).toBe(true);
    expect(map.has("SD")).toBe(false);
    expect(map.has("LA")).toBe(true);
    expect(map.has("STL")).toBe(false);

    // Opponent codes are also normalized to canonical form.
    expect(map.get("WSH")).toEqual({ opponent: "LV", isHome: true });
    expect(map.get("LV")).toEqual({ opponent: "WSH", isHome: false });
    expect(map.get("LAC")).toEqual({ opponent: "LA", isHome: true });
    expect(map.get("LA")).toEqual({ opponent: "LAC", isHome: false });
  });

  it("joins schedule, environment and defense across mismatched team codes", () => {
    // Schedule says the opponent is WAS; env/def are keyed WSH; LV vs OAK; SD/LAC.
    // Schedule away team = WAS; defense charted under WSH; env keyed under WSH too.
    // Every code path must fold to one canonical key so the join lands.
    const sched = schedule([scheduleRow("DAL", "WAS")]);
    const pc = pressureCoverage([coverageRow("WSH", { targets: 80, passerRatingAllowed: 70 })], [
      rushRow("WSH"),
    ]);

    const opponentMap = buildOpponentMap(sched);
    const defIndex = buildTeamDefenseFromCoverage(pc);
    // buildOpponentDefense applies the same normalizer to the opponent code AND to
    // the index keys, so a "WSH"-keyed index resolves a "WAS" opponent lookup.
    const envIndex = new Map<string, TeamEnvironmentRow>([
      ["WSH", envRow("WSH", { defEpaPct: 90 })],
    ]);

    const dalGame = opponentMap.get("DAL");
    expect(dalGame?.opponent).toBe("WSH"); // WAS folded to WSH in the schedule join

    // The def index keyed the coverage/rush rows under the canonical WSH key.
    expect(defIndex.has("WSH")).toBe(true);

    // Look the opponent up with the RAW schedule variant ("WAS") to prove the
    // normalizer bridges it to the WSH-keyed env/def indexes.
    const opp = buildOpponentDefense("WAS", envIndex, defIndex);
    expect(opp).not.toBeNull();
    expect(opp?.team).toBe("WSH"); // canonicalized
    expect(opp?.defEpaPct).toBe(90); // env joined across WAS->WSH
    expect(opp?.coveragePasserRatingAllowed).toBe(70); // coverage joined across WAS->WSH
  });

  it("folds two variant codes for one franchise into a single defense rollup", () => {
    // Same franchise charted under both OAK and LV across the (synthetic) feed.
    const pc = pressureCoverage(
      [coverageRow("OAK", { targets: 40, passerRatingAllowed: 80 }), coverageRow("LV", { targets: 40, passerRatingAllowed: 100 })],
      [rushRow("OAK", { pressures: 50, blitzes: 30 }), rushRow("LV", { pressures: 60, blitzes: 40 })],
    );
    const defIndex = buildTeamDefenseFromCoverage(pc);

    // One canonical key, not two.
    expect(defIndex.has("LV")).toBe(true);
    expect(defIndex.has("OAK")).toBe(false);
    const lv = defIndex.get("LV")!;
    expect(lv.defenders).toBe(2); // both coverage rows counted under one key
    expect(lv.pressures).toBe(110); // 50 + 60 rush rows summed under one key
    expect(lv.blitzes).toBe(70); // 30 + 40
  });
});

describe("matchup engine — uncapped team pass-rush (M6)", () => {
  it("sources pressures/blitzes from teamPassRush, not the capped coverage list", () => {
    // KC has NO defender in the coverage leaderboard (its DBs didn't make the
    // top-30), but it DOES have a real team pass-rush total. Under the old code
    // KC summed 0 pressures from coverage and read as "generates no rush"; now it
    // reflects the uncapped rollup.
    const pc = pressureCoverage(
      [coverageRow("BUF", { targets: 80, passerRatingAllowed: 85 })], // only BUF in coverage
      [rushRow("KC", { pressures: 130, blitzes: 90 }), rushRow("BUF", { pressures: 70, blitzes: 40 })],
    );
    const defIndex = buildTeamDefenseFromCoverage(pc);

    const kc = defIndex.get("KC");
    expect(kc).toBeDefined();
    expect(kc?.pressures).toBe(130); // from teamPassRush, NOT 0 from coverage
    expect(kc?.blitzes).toBe(90);
    expect(kc?.covTargets).toBe(0); // no coverage row -> coverage stays an honest dash
    expect(kc?.defenders).toBe(0); // no coverage defenders backing the coverage read

    const buf = defIndex.get("BUF");
    expect(buf?.pressures).toBe(70); // rush from teamPassRush
    expect(buf?.covTargets).toBe(80); // coverage from the coverage list
    expect(buf?.defenders).toBe(1);
  });

  it("does not inflate a coverage-only team's rush when it has no rush rollup", () => {
    // A team present only in coverage (no teamPassRush row) reports 0 pressures —
    // honest, not borrowed from coverage's per-player pressure columns.
    const pc = pressureCoverage(
      [coverageRow("NYJ", { targets: 50, passerRatingAllowed: 88, pressures: 25, blitzes: 15 })],
      [],
    );
    const defIndex = buildTeamDefenseFromCoverage(pc);
    const nyj = defIndex.get("NYJ")!;
    expect(nyj.pressures).toBe(0); // coverage.pressures (25) is NOT summed into the rush read
    expect(nyj.blitzes).toBe(0);
    expect(nyj.covTargets).toBe(50);
  });
});

describe("matchup engine — buildMatchupRows end to end", () => {
  it("pairs a player with his opponent's defense across mismatched codes and adjusts", () => {
    // DAL WR faces WAS (folds to WSH). WSH defense is soft (low EPA pct, leaky
    // coverage) -> a favorable adjustment above the base rating.
    const sched = schedule([scheduleRow("DAL", "WAS")]);
    const env = environment([
      envRow("WSH", { defEpaPct: 15, defSuccessRate: 0.5 }), // soft defense
      envRow("DAL", { defEpaPct: 80 }),
    ]);
    const pc = pressureCoverage(
      [coverageRow("WSH", { targets: 80, passerRatingAllowed: 108 })], // leaky coverage
      [rushRow("WSH", { pressures: 40, blitzes: 30 }), rushRow("DAL", { pressures: 110, blitzes: 90 })],
    );
    const m = model([profile("DAL", { position: "WR", processGrade: 70 })]);

    const rows = buildMatchupRows(m, sched, env, pc);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.team).toBe("DAL");
    expect(row.opponent).toBe("vs WSH"); // WAS normalized, home game
    expect(row.opponentDefense).not.toBeNull();
    expect(row.opponentDefense?.team).toBe("WSH");
    expect(row.matchupDelta).not.toBeNull();
    expect(row.matchupDelta!).toBeGreaterThan(0); // soft + leaky => favorable
    expect(row.grade).toBe("favorable");
    expect(row.baseRating).toBe(70); // base carried through unchanged
    expect(row.adjustedRating).toBeGreaterThan(70);
  });

  it("shows an honest no-context note when the opponent has no defensive rows", () => {
    const sched = schedule([scheduleRow("DAL", "PHI")]);
    const env = environment([]); // no env rows
    const pc = pressureCoverage([], []); // no charting
    const m = model([profile("DAL", { position: "WR", processGrade: 70 })]);

    const rows = buildMatchupRows(m, sched, env, pc);
    const row = rows[0]!;
    expect(row.matchupDelta).toBeNull();
    expect(row.adjustedRating).toBe(70); // unchanged when no context
    expect(row.grade).toBe("unknown");
    expect(row.note).toContain("PHI");
  });
});

describe("matchup engine — computeMatchupDelta guards", () => {
  it("returns a null delta and unknown grade with no opponent", () => {
    const r = computeMatchupDelta("WR", null);
    expect(r.delta).toBeNull();
    expect(r.grade).toBe("unknown");
  });
});
