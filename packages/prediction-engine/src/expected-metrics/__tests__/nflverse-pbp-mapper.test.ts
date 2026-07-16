/**
 * Unit tests for the nflverse pbp → expected-metrics mapper.
 *
 * The fixture is one synthetic REG game covering every mapping hazard: the
 * point-delta-not-`sp` rule, possession-frame transition pairs, next-score
 * labelling (incl. defensive TD via td_team and safety via defteam), referee
 * index-alignment with NaN terminal masking, FTN/`sp` structural exclusion,
 * grain enforcement, drive partition + terminalOutcome mapping, and
 * determinism under input permutation.
 */

import { describe, expect, it } from "vitest";
import {
  attachOwnEpa,
  mapNflversePbpToExpectedMetrics,
  NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS,
  type PbpRow,
} from "../nflverse-pbp-mapper.js";
import { buildDrives, type DrivePlay } from "../drives.js";
import { buildEpCalibration } from "../validation.js";

const G1 = "2025_01_AAA_BBB";

/** Build one fixture row; unspecified columns default to "". */
function row(overrides: Record<string, string>): PbpRow {
  const base: Record<string, string> = {
    game_id: G1,
    season: "2025",
    season_type: "REG",
    home_team: "BBB",
    away_team: "AAA",
    posteam: "AAA",
    defteam: "BBB",
    game_half: "Half1",
    half_seconds_remaining: "900",
    game_seconds_remaining: "2700",
    down: "",
    ydstogo: "",
    yardline_100: "",
    goal_to_go: "0",
    touchdown: "0",
    td_team: "",
    field_goal_result: "",
    safety: "0",
    posteam_score: "0",
    defteam_score: "0",
    posteam_score_post: "0",
    defteam_score_post: "0",
    score_differential: "0",
    posteam_timeouts_remaining: "3",
    defteam_timeouts_remaining: "3",
    spread_line: "3",
    result: "-20", // home(BBB) − away(AAA): away win in the base game
    play_type: "",
    yards_gained: "",
    interception: "0",
    fumble_lost: "0",
    rusher_player_id: "",
    receiver_player_id: "",
    fixed_drive: "",
    fixed_drive_result: "",
    ep: "",
    epa: "",
    wp: "",
    wpa: "",
  };
  return { ...base, ...overrides };
}

/**
 * The shared fixture: one REG game (ascending play_id) + one POST row, one
 * off-season row, one no-play_id row, one garbage row. Every scoring row also
 * sets `sp: "1"` even though `sp` is unread (poison pill — a regression that
 * starts reading `sp` changes drive points and fails T1).
 */
function fixture(): PbpRow[] {
  return [
    // ── Half 1 ──
    // 10: kickoff (down-less; receiving team AAA), drive 1.
    row({ play_id: "10", play_type: "kickoff", fixed_drive: "1", fixed_drive_result: "Punt", half_seconds_remaining: "1800", game_seconds_remaining: "3600" }),
    // 20: AAA 1st-down run.
    row({ play_id: "20", down: "1", ydstogo: "10", yardline_100: "75", half_seconds_remaining: "1700", game_seconds_remaining: "3500", play_type: "run", yards_gained: "5", rusher_player_id: "R1", fixed_drive: "1", fixed_drive_result: "Punt", ep: "0.9", epa: "0.10", wp: "0.45", wpa: "0.01" }),
    // 30: AAA 2nd-down pass. half_seconds "" → null sentinel.
    row({ play_id: "30", down: "2", ydstogo: "5", yardline_100: "70", half_seconds_remaining: "", game_seconds_remaining: "3460", play_type: "pass", yards_gained: "3", receiver_player_id: "W1", fixed_drive: "1", fixed_drive_result: "Punt", ep: "1.1", epa: "-0.20", wp: "0.46", wpa: "-0.02" }),
    // 40: AAA punt on 4th. half_seconds "abc" → NaN retained (corrupt-drop path).
    row({ play_id: "40", down: "4", ydstogo: "2", yardline_100: "67", half_seconds_remaining: "abc", game_seconds_remaining: "3400", play_type: "punt", yards_gained: "0", fixed_drive: "1", fixed_drive_result: "Punt", ep: "0.4", epa: "-0.50", wp: "0.44", wpa: "-0.03" }),
    // 50: BBB 1st down (possession changed after the punt), drive 2.
    row({ play_id: "50", posteam: "BBB", defteam: "AAA", down: "1", ydstogo: "10", yardline_100: "60", half_seconds_remaining: "1500", game_seconds_remaining: "3300", play_type: "run", yards_gained: "4", rusher_player_id: "R2", fixed_drive: "2", fixed_drive_result: "Field goal", ep: "1.5", epa: "0.30", wp: "0.55", wpa: "0.01" }),
    // 60: BBB FG made — scoring row (terminal; epRef NaN mask), sp poison pill.
    row({ play_id: "60", posteam: "BBB", defteam: "AAA", down: "4", ydstogo: "5", yardline_100: "20", half_seconds_remaining: "1400", game_seconds_remaining: "3200", play_type: "field_goal", field_goal_result: "made", posteam_score: "0", posteam_score_post: "3", defteam_score: "0", defteam_score_post: "0", sp: "1", fixed_drive: "2", fixed_drive_result: "Field goal", ep: "2.5", epa: "0.40", wp: "0.58", wpa: "0.03" }),
    // 70: kickoff to AAA, drive 3.
    row({ play_id: "70", play_type: "kickoff", fixed_drive: "3", fixed_drive_result: "Touchdown", score_differential: "-3" }),
    // 80: AAA TD pass — scoring row, sp poison pill.
    row({ play_id: "80", down: "1", ydstogo: "10", yardline_100: "30", half_seconds_remaining: "1200", game_seconds_remaining: "3000", play_type: "pass", yards_gained: "30", touchdown: "1", td_team: "AAA", receiver_player_id: "W1", posteam_score: "0", posteam_score_post: "6", defteam_score: "3", defteam_score_post: "3", sp: "1", score_differential: "-3", fixed_drive: "3", fixed_drive_result: "Touchdown", ep: "2.0", epa: "4.9", wp: "0.47", wpa: "0.20" }),
    // 85: AAA kneel BETWEEN the TD and the PAT — proves the PAT is not a
    // scoring event (its label must be NONE, not TD/FG) and provides the
    // half-crossing pair candidate (85 → 100 is blocked). spread_line "" → null.
    row({ play_id: "85", down: "1", ydstogo: "10", yardline_100: "50", half_seconds_remaining: "60", game_seconds_remaining: "1860", play_type: "qb_kneel", yards_gained: "-1", spread_line: "", score_differential: "3", fixed_drive: "4", fixed_drive_result: "End of half", ep: "0.2", epa: "0.00", wp: "0.70", wpa: "0.00" }),
    // 90: PAT (XP good) — 1 real point via delta; NOT a scoring event for labels.
    row({ play_id: "90", play_type: "extra_point", posteam_score: "6", posteam_score_post: "7", defteam_score: "3", defteam_score_post: "3", sp: "1", fixed_drive: "3", fixed_drive_result: "Touchdown" }),
    // ── Half 2 ──
    // 100: BBB 1st down, drive 5.
    row({ play_id: "100", game_half: "Half2", posteam: "BBB", defteam: "AAA", down: "1", ydstogo: "10", yardline_100: "80", half_seconds_remaining: "1750", game_seconds_remaining: "1750", play_type: "run", yards_gained: "12", rusher_player_id: "R2", posteam_score: "3", defteam_score: "7", posteam_score_post: "3", defteam_score_post: "7", score_differential: "-4", fixed_drive: "5", fixed_drive_result: "Safety", ep: "0.5", epa: "0.25", wp: "0.35", wpa: "0.02" }),
    // 110: BBB concedes a safety — scoring row FOR THE DEFENSE (AAA).
    row({ play_id: "110", game_half: "Half2", posteam: "BBB", defteam: "AAA", down: "2", ydstogo: "12", yardline_100: "98", half_seconds_remaining: "1700", game_seconds_remaining: "1700", play_type: "run", yards_gained: "-3", safety: "1", posteam_score: "3", posteam_score_post: "3", defteam_score: "7", defteam_score_post: "9", sp: "1", score_differential: "-4", fixed_drive: "5", fixed_drive_result: "Safety", ep: "-1.2", epa: "-2.1", wp: "0.33", wpa: "-0.05" }),
    // 120: free kick to AAA after the safety, drive 6.
    row({ play_id: "120", game_half: "Half2", play_type: "kickoff", score_differential: "6", fixed_drive: "6", fixed_drive_result: "Touchdown" }),
    // 130: AAA TD run — scoring row.
    row({ play_id: "130", game_half: "Half2", down: "1", ydstogo: "10", yardline_100: "40", half_seconds_remaining: "1500", game_seconds_remaining: "1500", play_type: "run", yards_gained: "40", touchdown: "1", td_team: "AAA", rusher_player_id: "R1", posteam_score: "9", posteam_score_post: "15", defteam_score: "3", defteam_score_post: "3", sp: "1", score_differential: "6", fixed_drive: "6", fixed_drive_result: "Touchdown", ep: "1.8", epa: "5.2", wp: "0.80", wpa: "0.10" }),
    // 140: two-point conversion (down is NA in nflverse) — 2 real points.
    row({ play_id: "140", game_half: "Half2", play_type: "pass", yards_gained: "2", yardline_100: "2", receiver_player_id: "W1", posteam_score: "15", posteam_score_post: "17", defteam_score: "3", defteam_score_post: "3", sp: "1", fixed_drive: "6", fixed_drive_result: "Touchdown" }),
    // 150: kickoff to BBB, drive 7.
    row({ play_id: "150", game_half: "Half2", posteam: "BBB", defteam: "AAA", play_type: "kickoff", score_differential: "-14", fixed_drive: "7", fixed_drive_result: "Opp touchdown" }),
    // 160: pick-six — BBB throws, AAA scores (td_team); opponent's 6 points → 0.
    row({ play_id: "160", game_half: "Half2", posteam: "BBB", defteam: "AAA", down: "1", ydstogo: "10", yardline_100: "75", half_seconds_remaining: "900", game_seconds_remaining: "900", play_type: "pass", yards_gained: "0", interception: "1", touchdown: "1", td_team: "AAA", posteam_score: "3", posteam_score_post: "3", defteam_score: "17", defteam_score_post: "23", sp: "1", score_differential: "-14", fixed_drive: "7", fixed_drive_result: "Opp touchdown", ep: "0.8", epa: "-6.5", wp: "0.10", wpa: "-0.08" }),
    // 170: garbage row — down "NA", empty ydstogo/yardline, no fixed_drive.
    row({ play_id: "170", game_half: "Half2", posteam: "BBB", defteam: "AAA", down: "NA", ydstogo: "", yardline_100: "", play_type: "run", yards_gained: "abc", rusher_player_id: "R2" }),
    // ── Grain violations ──
    // 180: POST row → droppedNonReg.
    row({ play_id: "10", game_id: "2025_19_AAA_BBB", season_type: "POST", down: "1", ydstogo: "10", yardline_100: "50" }),
    // 190: off-season row → droppedOffSeason.
    row({ play_id: "10", game_id: "2024_01_AAA_BBB", season: "2024", down: "1", ydstogo: "10", yardline_100: "50" }),
    // 200: no play_id → droppedNoPlayId.
    row({ play_id: "", down: "1", ydstogo: "10", yardline_100: "50" }),
  ];
}

const map = () => mapNflversePbpToExpectedMetrics(fixture());

const pid = (playId: string) => `${G1}-${playId}`;

describe("T1 — point-delta rule, never `sp`", () => {
  it("derives real point values from score deltas", () => {
    const { drivePlays } = map();
    const points = new Map(drivePlays.map((p) => [p.playId, p.pointsScored]));
    expect(points.get(pid("80"))).toBe(6); // TD
    expect(points.get(pid("90"))).toBe(1); // PAT
    expect(points.get(pid("60"))).toBe(3); // FG
    expect(points.get(pid("140"))).toBe(2); // two-point conversion
    expect(points.get(pid("110"))).toBe(2); // safety (defDelta 2 + safety flag)
    expect(points.get(pid("160"))).toBe(0); // pick-six: opponent's points NEVER enter
    expect(points.get(pid("130"))).toBe(6); // TD
  });

  it("classifies the TD+PAT drive as 7-point TD (both fallback and authoritative paths)", () => {
    const { drivePlays } = map();
    const drive3 = drivePlays.filter((p) => p.driveId === 3);
    expect(drive3.map((p) => p.playId)).toEqual([pid("70"), pid("80"), pid("90")]);

    // Authoritative path (terminalOutcome from fixed_drive_result).
    const withOutcome = buildDrives(drive3);
    expect(withOutcome).toHaveLength(1);
    expect(withOutcome[0]?.points).toBe(7);
    expect(withOutcome[0]?.result).toBe("TD");

    // Fallback path (terminalOutcome stripped): 6 + 1 = 7 ≥ 6 → TD.
    const stripped: DrivePlay[] = drive3.map((p) => {
      const { terminalOutcome: _ignored, ...rest } = p;
      return rest;
    });
    const fallback = buildDrives(stripped);
    expect(fallback[0]?.points).toBe(7);
    expect(fallback[0]?.result).toBe("TD");

    // sp-mapped control: mapping the binary `sp` indicator would total the
    // TD+PAT drive as 1 + 1 = 2 and misclassify it. Assert that is NOT what
    // the mapper produced.
    const spMapped = stripped.map((p) => ({
      ...p,
      pointsScored: p.playId === pid("80") || p.playId === pid("90") ? 1 : 0,
    }));
    const spDrives = buildDrives(spMapped);
    expect(spDrives[0]?.points).toBe(2);
    expect(spDrives[0]?.result).not.toBe("TD"); // the documented sp failure
    expect(fallback[0]?.points).not.toBe(spDrives[0]?.points);
  });
});

describe("T2 — possession frame of transition pairs", () => {
  it("builds after-frame pairs with correct possessionChanged and no re-framing", () => {
    const { epPlays, epaPairs } = map();
    const byBefore = new Map(epaPairs.map((p) => [epPlays[p.beforeIndex]!.playId, p]));

    // Punt → opponent's next 1st down: possession changed.
    const puntPair = byBefore.get(pid("40"));
    expect(puntPair).toBeDefined();
    expect(puntPair!.possessionChanged).toBe(true);
    const after = epPlays[puntPair!.afterIndex]!;
    // The after state is row 50's OWN frame — no re-framing arithmetic.
    expect(after.playId).toBe(pid("50"));
    expect(after.down).toBe(1);
    expect(after.ydstogo).toBe(10);
    expect(after.yardline100).toBe(60);

    // Same-team down-to-down pair.
    const samePair = byBefore.get(pid("20"));
    expect(samePair).toBeDefined();
    expect(samePair!.possessionChanged).toBe(false);
    expect(epPlays[samePair!.afterIndex]!.playId).toBe(pid("30"));

    // No pair crosses game_half: 85 (Half1) → 100 (Half2) must NOT pair.
    expect(byBefore.has(pid("85"))).toBe(false);

    // No pair originates on a scoring row (60 FG, 80 TD, 110 safety, 130 TD, 160 pick-six).
    for (const scoringId of ["60", "80", "110", "130", "160"]) {
      expect(byBefore.has(pid(scoringId))).toBe(false);
    }

    // Exactly the expected pair set survives.
    const pairKeys = epaPairs.map(
      (p) => `${epPlays[p.beforeIndex]!.playId}->${epPlays[p.afterIndex]!.playId}`,
    );
    expect(pairKeys).toEqual([
      `${pid("20")}->${pid("30")}`,
      `${pid("30")}->${pid("40")}`,
      `${pid("40")}->${pid("50")}`,
      `${pid("50")}->${pid("60")}`,
      `${pid("100")}->${pid("110")}`,
    ]);
  });
});

describe("T3 — deriveNextScore labelling", () => {
  it("labels each play from its own possession frame", () => {
    const { epPlays } = map();
    const label = new Map(epPlays.map((p) => [p.playId, p.nextScore]));

    // Half 1: next score is BBB's FG → kicking team FG, defending team OPP_FG.
    expect(label.get(pid("20"))).toBe("OPP_FG");
    expect(label.get(pid("30"))).toBe("OPP_FG");
    expect(label.get(pid("40"))).toBe("OPP_FG");
    expect(label.get(pid("50"))).toBe("FG");

    // The TD row labels itself TD.
    expect(label.get(pid("80"))).toBe("TD");

    // The kneel sits BETWEEN the TD and the PAT: the PAT is NOT a scoring
    // event, so nothing scores after the TD in half 1 → NONE.
    expect(label.get(pid("85"))).toBe("NONE");

    // Safety: scoringTeam = defteam (AAA); the conceding possession team
    // (BBB) labels OPP_SAFETY on both the prior play and the safety play.
    expect(label.get(pid("100"))).toBe("OPP_SAFETY");
    expect(label.get(pid("110"))).toBe("OPP_SAFETY");

    // Pick-six: td_team is the DEFENSE (AAA) → the offense's play labels OPP_TD.
    expect(label.get(pid("160"))).toBe("OPP_TD");
  });
});

describe("T4 — non-finite guards", () => {
  it("maps sentinels and corrupt values per the engine contracts", () => {
    const { epPlays, wpPlays, successPlays, drivePlays } = map();

    // Garbage row (170): not EP/WP eligible.
    expect(epPlays.some((p) => p.playId === pid("170"))).toBe(false);
    expect(wpPlays.some((p) => p.playId === pid("170"))).toBe(false);

    // ...but present in successPlays with NaN fields → unratable (null).
    const garbageSuccess = successPlays.find((p) => p.playId === pid("170"));
    expect(garbageSuccess).toBeDefined();
    expect(Number.isNaN(garbageSuccess!.down)).toBe(true);
    expect(Number.isNaN(garbageSuccess!.ydstogo)).toBe(true);
    const garbageDrive = drivePlays.find((p) => p.playId === pid("170"));
    expect(garbageDrive?.isSuccess).toBeNull();

    // half_seconds_remaining: "" → null (impute sentinel); "abc" → NaN retained.
    const p30 = epPlays.find((p) => p.playId === pid("30"));
    expect(p30?.halfSecondsRemaining).toBeNull();
    const p40 = epPlays.find((p) => p.playId === pid("40"));
    expect(p40?.halfSecondsRemaining).toBeTypeOf("number");
    expect(Number.isNaN(p40?.halfSecondsRemaining)).toBe(true);

    // spread_line: "" → null (pick'em sentinel).
    const wp85 = wpPlays.find((p) => p.playId === pid("85"));
    expect(wp85?.spreadLine).toBeNull();
  });
});

describe("T5 — FTN + `sp` structural exclusion", () => {
  it("keeps the projection allowlist free of FTN/participation columns and `sp`", () => {
    const denylist =
      /^ftn_|participation|defenders_in_box|(offense|defense)_personnel|^n_(offense|defense)|was_pressure|^route$|time_to_throw|ngs_/;
    for (const column of NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS) {
      expect(column).not.toMatch(denylist);
    }
    expect(NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS).not.toContain("sp");
  });

  it("never reads non-allowlisted keys (FTN poison pill is inert)", () => {
    const plain = mapNflversePbpToExpectedMetrics(fixture());
    const poisoned = fixture().map((r) => ({ ...r, ftn_is_screen: "1" }));
    expect(mapNflversePbpToExpectedMetrics(poisoned)).toEqual(plain);
  });
});

describe("T6 — REG same-season grain", () => {
  it("drops non-REG / off-season / no-play_id rows and counts them", () => {
    const mapped = map();
    const allIds = [
      ...mapped.epPlays.map((p) => p.playId),
      ...mapped.wpPlays.map((p) => p.playId),
      ...mapped.successPlays.map((p) => p.playId),
      ...mapped.drivePlays.map((p) => p.playId),
    ];
    expect(allIds.some((id) => id.startsWith("2025_19_AAA_BBB"))).toBe(false); // POST
    expect(allIds.some((id) => id.startsWith("2024_01_AAA_BBB"))).toBe(false); // off-season
    expect(mapped.season).toBe(2025);
    expect(mapped.counts.sourceRows).toBe(21);
    expect(mapped.counts.droppedNonReg).toBe(1);
    expect(mapped.counts.droppedOffSeason).toBe(1);
    expect(mapped.counts.droppedNoPlayId).toBe(1);
    expect(mapped.counts.regRows).toBe(18);
    expect(mapped.counts.epEligible).toBe(11);
    expect(mapped.counts.wpEligible).toBe(11);
    expect(mapped.counts.tieGamesExcludedFromWp).toBe(0);
  });
});

describe("T7 — referee index-alignment", () => {
  it("keeps epRef/wpRef equal-length with NaN terminal masking", () => {
    const { epPlays, epRef, wpPlays, wpRef, epaPairs } = map();
    expect(epRef.length).toBe(epPlays.length);
    expect(wpRef.length).toBe(wpPlays.length);

    const refByPlay = new Map(epPlays.map((p, i) => [p.playId, epRef[i]!]));
    // Terminal scoring rows are NaN-masked.
    for (const scoringId of ["60", "80", "110", "130", "160"]) {
      expect(Number.isNaN(refByPlay.get(pid(scoringId)))).toBe(true);
    }
    // Non-terminal rows carry the fixture's `ep` referee value.
    expect(refByPlay.get(pid("20"))).toBe(0.9);
    expect(refByPlay.get(pid("30"))).toBe(1.1);
    expect(refByPlay.get(pid("40"))).toBe(0.4);
    expect(refByPlay.get(pid("50"))).toBe(1.5);
    expect(refByPlay.get(pid("85"))).toBe(0.2);
    expect(refByPlay.get(pid("100"))).toBe(0.5);

    // Equal-length join does not throw (NaN pairs dropped inside).
    expect(() => buildEpCalibration(epPlays.map(() => 1), [...epRef])).not.toThrow();

    // Pair refDelta = the BEFORE row's nflverse epa.
    expect(epaPairs.map((p) => p.refDelta)).toEqual([0.1, -0.2, -0.5, 0.3, 0.25]);
  });
});

describe("T8 — WP labelling and spread frame", () => {
  const miniGame = (opts: { gameId: string; result: string; spread: string }): PbpRow[] => [
    row({ game_id: opts.gameId, home_team: "HHH", away_team: "VVV", posteam: "HHH", defteam: "VVV", play_id: "10", down: "1", ydstogo: "10", yardline_100: "50", result: opts.result, spread_line: opts.spread, wp: "0.5" }),
    row({ game_id: opts.gameId, home_team: "HHH", away_team: "VVV", posteam: "VVV", defteam: "HHH", play_id: "20", down: "1", ydstogo: "10", yardline_100: "50", result: opts.result, spread_line: opts.spread, wp: "0.5" }),
  ];

  it("labels posteamWon from the home-framed result and flips the spread frame", () => {
    const homeWin = mapNflversePbpToExpectedMetrics(miniGame({ gameId: "2025_02_VVV_HHH", result: "7", spread: "3.5" }));
    const byTeam = new Map(homeWin.wpPlays.map((p) => [p.playId.endsWith("-10") ? "HHH" : "VVV", p]));
    expect(byTeam.get("HHH")?.posteamWon).toBe(1);
    expect(byTeam.get("VVV")?.posteamWon).toBe(0);
    expect(byTeam.get("HHH")?.spreadLine).toBe(3.5); // home frame kept
    expect(byTeam.get("VVV")?.spreadLine).toBe(-3.5); // away frame negated

    const awayWin = mapNflversePbpToExpectedMetrics(miniGame({ gameId: "2025_02_VVV_HHH", result: "-7", spread: "3.5" }));
    const byTeam2 = new Map(awayWin.wpPlays.map((p) => [p.playId.endsWith("-10") ? "HHH" : "VVV", p]));
    expect(byTeam2.get("HHH")?.posteamWon).toBe(0);
    expect(byTeam2.get("VVV")?.posteamWon).toBe(1);
  });

  it("excludes tie games from wpPlays entirely (unlabellable outcome)", () => {
    const tie = mapNflversePbpToExpectedMetrics(miniGame({ gameId: "2025_02_VVV_HHH", result: "0", spread: "3.5" }));
    expect(tie.wpPlays).toHaveLength(0);
    expect(tie.wpRef).toHaveLength(0);
    expect(tie.counts.tieGamesExcludedFromWp).toBe(1);
    expect(tie.epPlays).toHaveLength(2); // EP is unaffected by the tie exclusion
  });
});

describe("T9 — drive partition, terminalOutcome, yardline fill", () => {
  it("puts every usable row in exactly one DrivePlay with strictly increasing playIndex", () => {
    const { drivePlays, counts } = map();
    expect(drivePlays).toHaveLength(counts.regRows);
    const expectedIds = ["10", "20", "30", "40", "50", "60", "70", "80", "85", "90", "100", "110", "120", "130", "140", "150", "160", "170"].map(pid).sort();
    expect(drivePlays.map((p) => p.playId).sort()).toEqual(expectedIds);
    const indices = drivePlays.filter((p) => p.gameId === G1).map((p) => p.playIndex);
    for (let i = 1; i < indices.length; i++) expect(indices[i]!).toBeGreaterThan(indices[i - 1]!);

    // buildDrives partition invariant holds on the mapped plays.
    const drives = buildDrives([...drivePlays]);
    expect(drives.reduce((s, d) => s + d.playCount, 0)).toBe(drivePlays.length);
    expect(drives.flatMap((d) => [...d.playIds]).sort()).toEqual(expectedIds);
  });

  it("maps fixed_drive_result to DriveResult (Opp touchdown disambiguation)", () => {
    const { drivePlays } = map();
    const outcome = new Map(drivePlays.map((p) => [p.playId, p.terminalOutcome]));
    expect(outcome.get(pid("20"))).toBe("PUNT");
    expect(outcome.get(pid("60"))).toBe("FG");
    expect(outcome.get(pid("90"))).toBe("TD");
    expect(outcome.get(pid("85"))).toBe("END_OF_HALF");
    expect(outcome.get(pid("110"))).toBe("SAFETY");
    // Pick-six drive has no punt row → TURNOVER.
    expect(outcome.get(pid("160"))).toBe("TURNOVER");
    // Missing fixed_drive_result → undefined (engine point fallback runs).
    expect(outcome.get(pid("170"))).toBeUndefined();

    // "Opp touchdown" with a punt row in the drive → PUNT (punt returned for TD).
    const puntReturnTd: PbpRow[] = [
      row({ game_id: "2025_03_AAA_BBB", play_id: "10", down: "4", ydstogo: "8", yardline_100: "60", play_type: "punt", fixed_drive: "1", fixed_drive_result: "Opp touchdown" }),
      row({ game_id: "2025_03_AAA_BBB", play_id: "20", play_type: "kickoff", fixed_drive: "1", fixed_drive_result: "Opp touchdown" }),
    ];
    const mapped = mapNflversePbpToExpectedMetrics(puntReturnTd);
    expect(mapped.drivePlays[0]?.terminalOutcome).toBe("PUNT");
  });

  it("fills drive yardlines from the nearest same-drive finite value and counts fills", () => {
    const { drivePlays, counts } = map();
    const yl = new Map(drivePlays.map((p) => [p.playId, p.yardline100]));
    expect(yl.get(pid("10"))).toBe(75); // backward-filled from row 20 (same drive 1)
    expect(yl.get(pid("90"))).toBe(30); // forward-filled from row 80 (same drive 3)
    expect(yl.get(pid("120"))).toBe(40); // backward-filled from row 130 (drive 6)
    expect(yl.get(pid("150"))).toBe(75); // backward-filled from row 160 (drive 7)
    expect(yl.get(pid("170"))).toBe(0); // lone null-drive row, no finite value → 0
    // Fills: rows 10, 70, 90, 120, 150, 170.
    expect(counts.yardlineFilled).toBe(6);
  });

  it("attachOwnEpa returns a new array with epa set only for mapped ids", () => {
    const { drivePlays } = map();
    const epaMap = new Map<string, number>([[pid("20"), 0.42]]);
    const attached = attachOwnEpa(drivePlays, epaMap);
    expect(attached).not.toBe(drivePlays);
    expect(attached.find((p) => p.playId === pid("20"))?.epa).toBe(0.42);
    expect(attached.find((p) => p.playId === pid("30"))?.epa).toBeNull();
    expect(drivePlays.find((p) => p.playId === pid("20"))?.epa).toBeNull(); // input untouched
  });
});

describe("T10 — determinism under permutation", () => {
  it("produces identical output on a shuffled copy", () => {
    const rows = fixture();
    // Deterministic permutation (reverse + interleave) — no randomness in tests.
    const shuffled = [...rows.filter((_, i) => i % 2 === 1).reverse(), ...rows.filter((_, i) => i % 2 === 0)];
    // Explicit season: auto-resolution reads the first finite season in INPUT
    // order, which a permutation may legitimately change on mixed-season input.
    const a = mapNflversePbpToExpectedMetrics(rows, { season: 2025 });
    const b = mapNflversePbpToExpectedMetrics(shuffled, { season: 2025 });
    expect(b).toEqual(a);
  });
});
