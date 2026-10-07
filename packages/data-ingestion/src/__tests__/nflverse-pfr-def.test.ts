import { describe, expect, it } from "vitest";

import {
  parsePfrDef,
  pfrDefToCovariateRows,
  type PfrDefCovariateRow,
  type PfrDefRow,
} from "../nflverse-pfr-def.js";
import { buildIdCrosswalk, type IdCrosswalk } from "../nflverse-id-crosswalk.js";
import type { CsvTable } from "../nflverse-source.js";

// ── fixtures ──────────────────────────────────────────────────────────

/**
 * Realistic sample of the nflverse `advstats_week_def_<season>.csv` release
 * (verified against the live URL 2026-07). 29 columns, 3 data rows.
 */
const HEADER = [
  "game_id", "pfr_game_id", "season", "week", "game_type", "team", "opponent",
  "pfr_player_name", "player_position", "pfr_player_id",
  "def_ints", "def_targets", "def_completions_allowed", "def_completion_pct",
  "def_yards_allowed", "def_yards_allowed_per_cmp", "def_yards_allowed_per_tgt",
  "def_receiving_td_allowed", "def_passer_rating_allowed", "def_adot",
  "def_air_yards_completed", "def_yards_after_catch",
  "def_times_blitzed", "def_times_hurried", "def_times_hitqb", "def_sacks",
  "def_pressures", "def_tackles_combined", "def_missed_tackles",
  "def_missed_tackle_pct",
];

function rec(obj: Record<string, string>): Record<string, string> {
  return obj;
}

function makeTable(rows: Record<string, string>[]): CsvTable {
  return { header: HEADER, records: rows };
}

// Crosswalk rows that map pfr_player_id → gsis_id.
const CROSSWALK_ROWS = [
  { gsis_id: "00-0036497-1", pfr_id: "BrowLe00", full_name: "Nick Bolton" },
  { gsis_id: "00-0036497-2", pfr_id: "HillTy00", full_name: "Tyrann Mathieu" },
] as const;

function makeCrosswalk(): IdCrosswalk {
  return buildIdCrosswalk(2024, [{ season: 2024, rows: CROSSWALK_ROWS as unknown as ReadonlyArray<Record<string, string>> }]);
}

// Real PFR def data sample (from live CSV, 2024 week 1):
//   Nick Bolton, KC @ BAL — 0 pressures on 5 targets, 7 combined tackles.
const BOLTON_W1 = rec({
  game_id: "2024_01_BAL_KC", pfr_game_id: "202409050kan", season: "2024",
  week: "1", game_type: "REG", team: "KC", opponent: "BAL",
  pfr_player_name: "Nick Bolton", player_position: "LB", pfr_player_id: "BrowLe00",
  def_ints: "0", def_targets: "5", def_completions_allowed: "5", def_completion_pct: "1.000",
  def_yards_allowed: "85", def_yards_allowed_per_cmp: "17.0", def_yards_allowed_per_tgt: "17.0",
  def_receiving_td_allowed: "1", def_passer_rating_allowed: "158.3", def_adot: "3.4",
  def_air_yards_completed: "17", def_yards_after_catch: "68",
  def_times_blitzed: "3", def_times_hurried: "0", def_times_hitqb: "0", def_sacks: "0",
  def_pressures: "0", def_tackles_combined: "7", def_missed_tackles: "2",
  def_missed_tackle_pct: "0.222",
});

// A pass-rusher with pressure volume (synthetic but realistic):
//   4 pressures on 6 targets → pressureRate = 0.6667
//   2 targets, 1 completion allowed, 15 yards allowed
const RUSHER_W3 = rec({
  game_id: "2024_03_BUF_MIA", pfr_game_id: "20240922mi",
  season: "2024", week: "3", game_type: "REG", team: "BUF", opponent: "MIA",
  pfr_player_name: "Maurice Hurst", player_position: "DT", pfr_player_id: "HursMo01",
  def_ints: "0", def_targets: "6", def_completions_allowed: "3", def_completion_pct: "0.500",
  def_yards_allowed: "30", def_yards_allowed_per_cmp: "10.0", def_yards_allowed_per_tgt: "5.0",
  def_receiving_td_allowed: "0", def_passer_rating_allowed: "67.2", def_adot: "2.1",
  def_air_yards_completed: "12", def_yards_after_catch: "18",
  def_times_blitzed: "8", def_times_hurried: "2", def_times_hitqb: "1", def_sacks: "1",
  def_pressures: "4", def_tackles_combined: "3", def_missed_tackles: "1",
  def_missed_tackle_pct: "0.333",
});

// A row with def_tackles_for_loss and def_pass_deflections (simulating a future
// CSV schema upgrade — tests forward-compatibility).
const FUTURE_W5 = rec({
  game_id: "2024_05_GB_CHI", pfr_game_id: "20241006gb",
  season: "2024", week: "5", game_type: "REG", team: "GB", opponent: "CHI",
  pfr_player_name: "Jaire Alexander", player_position: "CB", pfr_player_id: "AlexJa02",
  def_ints: "1", def_targets: "8", def_completions_allowed: "4", def_completion_pct: "0.500",
  def_yards_allowed: "45", def_yards_allowed_per_cmp: "11.25", def_yards_allowed_per_tgt: "5.625",
  def_receiving_td_allowed: "0", def_passer_rating_allowed: "48.8", def_adot: "6.8",
  def_air_yards_completed: "18", def_yards_after_catch: "27",
  def_times_blitzed: "2", def_times_hurried: "1", def_times_hitqb: "2", def_sacks: "0",
  def_pressures: "3", def_tackles_combined: "4", def_missed_tackles: "0",
  def_missed_tackle_pct: "0.000",
  // Future columns not in the current nflverse release header:
  def_tackles_for_loss: "2",
  def_pass_deflections: "3",
});

// Crosswalk row for the future-schema player.
const FUTURE_CW = [
  { gsis_id: "00-0034520-2", pfr_id: "AlexJa02", full_name: "Jaire Alexander" },
] as const;

function makeFutureCrosswalk(): IdCrosswalk {
  return buildIdCrosswalk(2024, [{ season: 2024, rows: FUTURE_CW as unknown as ReadonlyArray<Record<string, string>> }]);
}

// ── parsePfrDef ──────────────────────────────────────────────────────

describe("parsePfrDef", () => {
  it("parses the raw PFR def CSV columns into typed rows", () => {
    const rows = parsePfrDef(makeTable([BOLTON_W1, RUSHER_W3]));
    expect(rows).toHaveLength(2);

    const bolton = rows[0]!;
    expect(bolton.season).toBe(2024);
    expect(bolton.week).toBe(1);
    expect(bolton.team).toBe("KC");
    expect(bolton.opponent).toBe("BAL");
    expect(bolton.pfrPlayerId).toBe("BrowLe00");
    expect(bolton.player).toBe("Nick Bolton");
    expect(bolton.position).toBe("LB");
    expect(bolton.gameKey).toBe("2024_01_BAL_KC");
    expect(bolton.seasonType).toBe("REG");

    // pressure components
    expect(bolton.pressures).toBe(0);
    expect(bolton.timesHurried).toBe(0);
    expect(bolton.timesHitQb).toBe(0);
    expect(bolton.sacks).toBe(0);
    expect(bolton.timesBlitzed).toBe(3);

    // TFL context
    expect(bolton.tacklesCombined).toBe(7);
    expect(bolton.tacklesForLoss).toBeNull(); // column absent
    expect(bolton.missedTackles).toBe(2);
    expect(bolton.missedTacklePct).toBeCloseTo(0.222, 3);

    // coverage context
    expect(bolton.targets).toBe(5);
    expect(bolton.completionsAllowed).toBe(5);
    expect(bolton.yardsAllowed).toBe(85);
    expect(bolton.ints).toBe(0);
    expect(bolton.passerRatingAllowed).toBeCloseTo(158.3, 1);
  });

  it("computes pressureRate = pressures / targets", () => {
    const rows = parsePfrDef(makeTable([BOLTON_W1, RUSHER_W3]));
    // Bolton: 0 pressures / 5 targets = 0.0 (valid zero rate)
    expect(rows[0]!.pressureRate).toBe(0.0);
    // Rusher: 4 pressures / 6 targets
    expect(rows[1]!.pressureRate).toBeCloseTo(4 / 6, 4);
  });

  it("yields null pressureRate when targets=0 (fail-closed, never divide by zero)", () => {
    const row = rec({
      game_id: "2024_06_NYJ_NE", pfr_game_id: "g", season: "2024", week: "6",
      game_type: "REG", team: "NYJ", opponent: "NE",
      pfr_player_name: "Q", player_position: "DE", pfr_player_id: "Test01",
      def_targets: "0", def_pressures: "5",
      def_times_hurried: "2", def_times_hitqb: "1", def_sacks: "2",
      def_times_blitzed: "0",
      def_tackles_combined: "4",
    });
    const rows = parsePfrDef(makeTable([row]));
    expect(rows[0]!.pressureRate).toBeNull(); // 5/0 → null
    expect(rows[0]!.pressures).toBe(5); // raw count still available
  });

  it("yields null pressureRate when def_pressures column is absent", () => {
    const headerNoPressures = HEADER.filter((h) => h !== "def_pressures");
    const table: CsvTable = { header: headerNoPressures, records: [BOLTON_W1] };
    const rows = parsePfrDef(table);
    expect(rows[0]!.pressures).toBeNull();
    expect(rows[0]!.pressureRate).toBeNull();
  });

  it("yields null pressureRate when def_targets column is absent", () => {
    const headerNoTargets = HEADER.filter((h) => h !== "def_targets");
    const table: CsvTable = { header: headerNoTargets, records: [BOLTON_W1] };
    const rows = parsePfrDef(table);
    expect(rows[0]!.targets).toBeNull();
    expect(rows[0]!.pressureRate).toBeNull();
  });

  it("resolves gsisId via crosswalk when pfr_player_id is present in the map", () => {
    const cw = makeCrosswalk();
    const rows = parsePfrDef(makeTable([BOLTON_W1]), cw);
    expect(rows[0]!.gsisId).toBe("00-0036497-1");
  });

  it("leaves gsisId empty when no crosswalk is provided (never fabricates)", () => {
    const rows = parsePfrDef(makeTable([BOLTON_W1]));
    expect(rows[0]!.gsisId).toBe("");
    expect(rows[0]!.pfrPlayerId).toBe("BrowLe00"); // still available
  });

  it("resolves gsisId to empty when pfr_player_id is not in the crosswalk", () => {
    const cw = makeCrosswalk();
    const rows = parsePfrDef(makeTable([RUSHER_W3]), cw);
    expect(rows[0]!.gsisId).toBe(""); // "HursMo01" not in crosswalk
  });

  it("forward-compatible: reads def_tackles_for_loss and def_pass_deflections when present", () => {
    const cw = makeFutureCrosswalk();
    // Build a table whose header includes the future columns.
    const header = [...HEADER, "def_tackles_for_loss", "def_pass_deflections"];
    const table: CsvTable = { header, records: [FUTURE_W5] };
    const rows = parsePfrDef(table, cw);
    expect(rows[0]!.tacklesForLoss).toBe(2);
    expect(rows[0]!.passDeflections).toBe(3);
    expect(rows[0]!.tflRate).toBeCloseTo(2 / 8, 4); // 0.25
    expect(rows[0]!.pdRate).toBeCloseTo(3 / 8, 4); // 0.375
    expect(rows[0]!.pressureRate).toBeCloseTo(3 / 8, 4); // 0.375
  });

  it("yields null tflRate and pdRate when the column is absent (current release)", () => {
    const cw = makeFutureCrosswalk();
    const rows = parsePfrDef(makeTable([FUTURE_W5]), cw);
    // FUTURE_W5 has def_tackles_for_loss/def_pass_deflections values but the
    // HEADER doesn't include those columns, so resolveCol returns null → null.
    expect(rows[0]!.tflRate).toBeNull();
    expect(rows[0]!.pdRate).toBeNull();
  });

  it("skips rows with blank season or pfr_player_id", () => {
    const rows = parsePfrDef(makeTable([
      rec({ ...BOLTON_W1, season: "" }),     // no season → skipped
      rec({ ...BOLTON_W1, pfr_player_id: "" }), // no player id → skipped
      BOLTON_W1,                              // valid
    ]));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.pfrPlayerId).toBe("BrowLe00");
  });

  it("preserves week=0 (season aggregate) if the CSV carries it", () => {
    const row = rec({ ...BOLTON_W1, week: "0" });
    const rows = parsePfrDef(makeTable([row]));
    expect(rows[0]!.week).toBe(0);
  });

  it("falls back to PFR primary column names when present in header order", () => {
    const rows = parsePfrDef(makeTable([RUSHER_W3]));
    expect(rows[0]!.timesHurried).toBe(2);
    expect(rows[0]!.timesHitQb).toBe(1);
    expect(rows[0]!.sacks).toBe(1);
    expect(rows[0]!.timesBlitzed).toBe(8);
  });
});

// ── pfrDefToCovariateRows ────────────────────────────────────────────

describe("pfrDefToCovariateRows", () => {
  it("bridges to CovariateRow-compatible rows with statType='defense'", () => {
    const cw = makeCrosswalk();
    const parsed = parsePfrDef(makeTable([BOLTON_W1, RUSHER_W3]), cw);
    const cov = pfrDefToCovariateRows(parsed);
    expect(cov).toHaveLength(2);

    const c = cov[1]!; // Rusher W3: 4 pressures / 6 targets
    expect(c.statType).toBe("defense");
    expect(c.gsisId).toBe(""); // HursMo01 not in crosswalk
    expect(c.season).toBe(2024);
    expect(c.week).toBe(3);

    // Defense fields populated
    expect(c.pressureRate).toBeCloseTo(4 / 6, 4);
    expect(c.tflRate).toBeNull(); // TFL column absent
    expect(c.pdRate).toBeNull();  // PD column absent
    expect(c.snapShare).toBeNull(); // sourced separately

    // Non-defense fields are null
    expect(c.avgSeparation).toBeNull();
    expect(c.avgCushion).toBeNull();
    expect(c.airYardsShare).toBeNull();
    expect(c.avgTimeToThrow).toBeNull();
    expect(c.aggressiveness).toBeNull();
    expect(c.avgIntendedAirYards).toBeNull();
    expect(c.avgCompletedAirYards).toBeNull();
    expect(c.avgAirYardsDifferential).toBeNull();
    expect(c.pctAttemptsGte8Defenders).toBeNull();
    expect(c.avgTimeToLos).toBeNull();
    expect(c.avgYac).toBeNull();
    expect(c.avgExpectedYac).toBeNull();
    expect(c.expectedRushYards).toBeNull();
  });

  it("all rows carry statType='defense' (never offense/passing/receiving/rushing)", () => {
    const cw = makeFutureCrosswalk();
    const header = [...HEADER, "def_tackles_for_loss", "def_pass_deflections"];
    const table: CsvTable = { header, records: [FUTURE_W5] };
    const cov = pfrDefToCovariateRows(parsePfrDef(table, cw));
    expect(cov).toHaveLength(1);
    expect(cov[0]!.statType).toBe("defense");
  });

  it("passes through null pressureRate when targets=0 (fail-closed at bind layer)", () => {
    const row = rec({
      ...BOLTON_W1,
      def_targets: "0",
    });
    const cov = pfrDefToCovariateRows(parsePfrDef(makeTable([row])));
    expect(cov[0]!.pressureRate).toBeNull();
  });

  it("passes through 0.0 pressureRate when pressures=0 and targets>0 (valid rate)", () => {
    const cov = pfrDefToCovariateRows(parsePfrDef(makeTable([BOLTON_W1])));
    expect(cov[0]!.pressureRate).toBe(0.0);
    expect(cov[0]!.week).toBe(1); // week preserved for latestPriorRow filtering
  });

  it("produces structurally identical rows to the CovariateRow contract shape", () => {
    const cov = pfrDefToCovariateRows(parsePfrDef(makeTable([RUSHER_W3])));
    const expectedKeys = [
      "gsisId", "season", "week", "statType",
      "avgSeparation", "avgCushion", "airYardsShare",
      "avgTimeToThrow", "aggressiveness", "avgIntendedAirYards",
      "avgCompletedAirYards", "avgAirYardsDifferential",
      "pctAttemptsGte8Defenders", "avgTimeToLos",
      "avgYac",
      "pressureRate", "snapShare", "tflRate", "pdRate",
      "avgExpectedYac", "expectedRushYards",
    ];
    expect(Object.keys(cov[0]!).sort()).toEqual([...expectedKeys].sort());
  });

  // ── leak-safety: the bridge carries week=0 rows, but latestPriorRow
  //    (in covariate-bus.ts) filters them out. Verify they survive the bridge.
  it("leak-safety boundary: week=0 rows survive the bridge (bus filters them)", () => {
    const row = rec({ ...BOLTON_W1, week: "0" });
    const cov = pfrDefToCovariateRows(parsePfrDef(makeTable([row])));
    expect(cov).toHaveLength(1);
    expect(cov[0]!.week).toBe(0);
    // The value flows through; the bus's latestPriorRow rejects week=0.
    expect(cov[0]!.pressureRate).toBe(0.0);
  });
});

describe("parsePfrDef → pfrDefToCovariateRows integration with latestPriorRow semantics", () => {
  it("simulates the bus leak-safety contract: week=0 and same-week excluded", () => {
    const cw = makeCrosswalk();
    const parsed = parsePfrDef(
      makeTable([
        rec({ ...BOLTON_W1, week: "0", def_pressures: "10", def_targets: "1" }), // aggregate: poison
        rec({ ...BOLTON_W1, week: "2", def_targets: "5" }),                          // prior: 0 pressures → 0.0
        rec({ ...BOLTON_W1, week: "3", def_pressures: "9", def_targets: "3" }),    // same-week at kickoff=3
      ]),
      cw,
    );
    const cov = pfrDefToCovariateRows(parsed);

    // Find the row the bus would select for kickoffWeek=3 (latest prior, week < 3):
    const selected = cov
      .filter((r) => r.gsisId === "00-0036497-1" && r.season === 2024 && r.statType === "defense")
      .filter((r) => r.week > 0 && r.week < 3) // mirrors latestPriorRow filter
      .reduce((best, r) => (best === null || r.week > best.week ? r : best), null as PfrDefCovariateRow | null);

    expect(selected).not.toBeNull();
    expect(selected!.week).toBe(2); // not week=0, not week=3
    expect(selected!.pressureRate).toBe(0.0); // Bolton W2 had 0 pressures
  });

  it("simulates latestPriorRow: no prior per-game row → null (fail-closed)", () => {
    const cw = makeCrosswalk();
    const parsed = parsePfrDef(
      makeTable([
        rec({ ...BOLTON_W1, week: "0", def_pressures: "10", def_targets: "1" }), // only aggregate
      ]),
      cw,
    );
    const cov = pfrDefToCovariateRows(parsed);
    // kickoffWeek=1 → no per-game week < 1 → fail closed
    const selected = cov.find((r) => r.gsisId === "00-0036497-1" && r.week > 0 && r.week < 1);
    expect(selected).toBeUndefined();
  });
});
