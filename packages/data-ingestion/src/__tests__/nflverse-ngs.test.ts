import { describe, it, expect } from "vitest";
import { parseCsv } from "../nflverse-source.js";
import {
  parseNgsReceiving,
  parseNgsRushing,
  parseNgsPassing,
  filterNgs,
  ngsReceivingToSeparationTruth,
  ngsPassingToCpoeTruth,
} from "../nflverse-ngs.js";

// Passing fixture — exact header + verified live values (Stafford 2025 wk0
// matches nextgenstats.nfl.com: TT 2.8, xCOMP% 63.5, CPOE +1.5, RATE 109.2).
const PASSING_CSV = [
  "season,season_type,week,player_display_name,player_position,team_abbr,avg_time_to_throw,avg_completed_air_yards,avg_intended_air_yards,avg_air_yards_differential,aggressiveness,max_completed_air_distance,avg_air_yards_to_sticks,attempts,pass_yards,pass_touchdowns,interceptions,passer_rating,completions,completion_percentage,expected_completion_percentage,completion_percentage_above_expectation,avg_air_distance,max_air_distance,player_gsis_id,player_first_name,player_last_name,player_jersey_number,player_short_name",
  "2025,REG,0,Matthew Stafford,QB,LAR,2.79925252525253,7.3,9.1,-1.8,18.6,58.4,1,597,4707,46,8,109.195281965382,388,65,63.5154773869347,1.47614740368508,29,62,00-0026498,Matthew,Stafford,9,M.Stafford",
  "2025,REG,0,Drake Maye,QB,NE,2.97,7.4,9.1,-1.7,17.3,56.4,0.2,492,4394,31,8,113.5,354,72,62.8,9.1,30,60,00-0039163,Drake,Maye,10,D.Maye",
  "2025,REG,0,Low Volume QB,QB,XXX,2.8,5,7,-2,15,50,-1,100,700,4,2,90,60,60,63,-3,25,55,00-0000001,Low,QB,1,L.QB",
].join("\n");

// Fixtures use the EXACT header + values verified live against the real nflverse
// release assets on 2026-07-03 (values match nextgenstats.nfl.com to the decimal).
const RECEIVING_CSV = [
  "season,season_type,week,player_display_name,player_position,team_abbr,avg_cushion,avg_separation,avg_intended_air_yards,percent_share_of_intended_air_yards,receptions,targets,catch_percentage,yards,rec_touchdowns,avg_yac,avg_expected_yac,avg_yac_above_expectation,player_gsis_id,player_first_name,player_last_name,player_jersey_number,player_short_name",
  "2025,REG,0,Jaxon Smith-Njigba,WR,SEA,6.29564935064935,3.01756823312639,11.3,48.64,119,163,73.01,1793,10,4.8,4,0.8,00-0038543,Jaxon,Smith-Njigba,11,J.Smith-Njigba",
  "2025,REG,0,Low Volume Guy,WR,XXX,5,2.5,8,10,3,4,75,40,0,3,3,0,00-9999999,Low,Guy,88,L.Guy",
  "2025,REG,0,No Sep Guy,WR,YYY,5,,8,10,50,70,71,600,4,3,3,0,00-8888888,No,Sep,80,N.Sep",
].join("\n");

const RUSHING_CSV = [
  "season,season_type,week,player_display_name,player_position,team_abbr,efficiency,percent_attempts_gte_eight_defenders,avg_time_to_los,rush_attempts,rush_yards,avg_rush_yards,rush_touchdowns,player_gsis_id,player_first_name,player_last_name,player_jersey_number,player_short_name,expected_rush_yards,rush_yards_over_expected,rush_yards_over_expected_per_att,rush_pct_over_expected",
  "2025,REG,0,James Cook,RB,BUF,3.24,30.42,2.58,309,1621,5.2,12,00-0037237,James,Cook,4,J.Cook,1262.83722948628,358.162770513716,1.17,46.9",
].join("\n");

describe("parseNgsReceiving", () => {
  it("parses the separation/cushion/xYAC metrics with the real column names", () => {
    const rows = parseNgsReceiving(parseCsv(RECEIVING_CSV));
    expect(rows).toHaveLength(3);
    const jsn = rows.find((r) => r.player === "Jaxon Smith-Njigba")!;
    expect(jsn.avgSeparation).toBeCloseTo(3.0176, 4); // matches the scraped site's rounded 3.0
    expect(jsn.avgCushion).toBeCloseTo(6.2956, 4);
    expect(jsn.yards).toBe(1793);
    expect(jsn.receptions).toBe(119);
    expect(jsn.gsisId).toBe("00-0038543");
    expect(jsn.airYardsShare).toBeCloseTo(48.64, 2);
  });

  it("coerces an empty separation cell to null, not 0", () => {
    const rows = parseNgsReceiving(parseCsv(RECEIVING_CSV));
    expect(rows.find((r) => r.player === "No Sep Guy")!.avgSeparation).toBeNull();
  });
});

describe("parseNgsRushing", () => {
  it("parses RYOE and expected rush yards (the rushing moat metrics)", () => {
    const rows = parseNgsRushing(parseCsv(RUSHING_CSV));
    const cook = rows[0]!;
    expect(cook.ryoe).toBeCloseTo(358.1628, 3); // matches nextgenstats.nfl.com's 358
    expect(cook.expectedRushYards).toBeCloseTo(1262.84, 2);
    expect(cook.rushYards).toBe(1621);
    expect(cook.eightPlusBoxPct).toBeCloseTo(30.42, 2);
    expect(cook.ryoePerAtt).toBeCloseTo(1.17, 2);
  });
});

describe("parseNgsPassing", () => {
  it("parses xCOMP% and CPOE (the QB moat metrics) with real column names", () => {
    const rows = parseNgsPassing(parseCsv(PASSING_CSV));
    const st = rows.find((r) => r.player === "Matthew Stafford")!;
    expect(st.cpoe).toBeCloseTo(1.4761, 4); // matches site's +1.5
    expect(st.expectedCompletionPct).toBeCloseTo(63.5155, 4);
    expect(st.avgTimeToThrow).toBeCloseTo(2.7993, 4);
    expect(st.passYards).toBe(4707);
    expect(st.passerRating).toBeCloseTo(109.2, 1);
    const maye = rows.find((r) => r.player === "Drake Maye")!;
    expect(maye.cpoe).toBeCloseTo(9.1, 2); // the season's best CPOE
  });
});

describe("ngsPassingToCpoeTruth", () => {
  it("keeps volume QBs, drops the sub-135-attempt row", () => {
    const rows = parseNgsPassing(parseCsv(PASSING_CSV));
    const truth = ngsPassingToCpoeTruth(rows, 135);
    expect(truth.map((t) => t.player).sort()).toEqual(["Drake Maye", "Matthew Stafford"]);
    expect(truth.find((t) => t.player === "Drake Maye")!.cpoe).toBeCloseTo(9.1, 2);
  });
});

describe("filterNgs + ngsReceivingToSeparationTruth", () => {
  it("filters to season/week and drops low-volume + null-separation rows for calibration", () => {
    const rows = parseNgsReceiving(parseCsv(RECEIVING_CSV));
    expect(filterNgs(rows, 2025, 0)).toHaveLength(3);
    expect(filterNgs(rows, 2024, 0)).toHaveLength(0);

    const truth = ngsReceivingToSeparationTruth(rows, 20);
    // JSN (163 targets, sep present) kept; Low Volume (4 targets) dropped; No Sep (null) dropped.
    expect(truth).toHaveLength(1);
    expect(truth[0]!.player).toBe("Jaxon Smith-Njigba");
    expect(truth[0]!.actualSeparation).toBeCloseTo(3.0176, 4);
  });
});
