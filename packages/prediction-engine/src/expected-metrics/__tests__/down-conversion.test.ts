import { describe, it, expect } from "vitest";
import {
  computeDownConversionMetrics,
  extractDownConversionSeries,
  MIN_SERIES_TO_REPORT
} from "../down-conversion.js";
import type { PbpRow } from "../nflverse-pbp-mapper.js";

function makeRow(
  overrides: Record<string, string | number>,
): PbpRow {
  const row: Record<string, string> = {
    game_id: "2026_01_AWAY_HOME",
    play_id: "1",
    posteam: "HOME",
    fixed_drive: "1",
    play_type: "pass",
    down: "1",
    ydstogo: "10",
    yards_gained: "0",
    touchdown: "0",
    interception: "0",
    fumble_lost: "0",
  };
  for (const [k, v] of Object.entries(overrides)) {
    row[k] = String(v);
  }
  return row as unknown as PbpRow;
}

describe("Down Conversion Expected Metric", () => {

  describe("extractDownConversionSeries", () => {
    it("closes series correctly on 1st down play gaining >= ydstogo", () => {
      const rows = [
        makeRow({ play_id: 1, down: 1, ydstogo: 10, yards_gained: 11 }),
      ];
      const series = extractDownConversionSeries(rows);
      expect(series).toHaveLength(1);
      expect(series[0]!.conversionDown).toBe(1);
    });

    it("converts on any down if TD, even if yards_gained < ydstogo", () => {
      const rows = [
        makeRow({ play_id: 1, down: 3, ydstogo: 10, yards_gained: 5, touchdown: 1 }),
      ];
      const series = extractDownConversionSeries(rows);
      expect(series).toHaveLength(1);
      expect(series[0]!.conversionDown).toBe(3);
    });

    it("does NOT convert on turnover even if yards_gained >= ydstogo", () => {
      const rows = [
        makeRow({ play_id: 1, down: 2, ydstogo: 10, yards_gained: 15, fumble_lost: 1 }),
      ];
      const series = extractDownConversionSeries(rows);
      expect(series).toHaveLength(1);
      expect(series[0]!.conversionDown).toBeNull();
    });

    it("excludes unratable plays", () => {
      const rows = [
        makeRow({ play_id: 1, play_type: "kickoff", down: 1 }), // bad play_type
        makeRow({ play_id: 2, down: 5 }), // bad down
        makeRow({ play_id: 3, yards_gained: "NaN" }), // non-finite
        makeRow({ play_id: 4, play_type: "run", down: 1, ydstogo: 10, yards_gained: 10 }), // valid
      ];
      const series = extractDownConversionSeries(rows);
      expect(series).toHaveLength(1);
      expect(series[0]!.conversionDown).toBe(1);
    });

    it("yields exactly one NO_CONVERSION series when drive ends without conversion", () => {
      const rows = [
        makeRow({ play_id: 1, down: 1, yards_gained: 0 }),
        makeRow({ play_id: 2, down: 2, yards_gained: 0 }),
        makeRow({ play_id: 3, down: 3, yards_gained: 0 }),
      ];
      const series = extractDownConversionSeries(rows);
      expect(series).toHaveLength(1);
      expect(series[0]!.conversionDown).toBeNull();
    });

    it("two conversions in drive yields 2 converted and 1 NO_CONVERSION if trailing plays remain", () => {
      const rows = [
        makeRow({ play_id: 1, down: 1, yards_gained: 10, ydstogo: 10 }), // Conv 1st
        makeRow({ play_id: 2, down: 1, yards_gained: 0, ydstogo: 10 }),
        makeRow({ play_id: 3, down: 2, yards_gained: 10, ydstogo: 10 }), // Conv 2nd
        makeRow({ play_id: 4, down: 1, yards_gained: 5, ydstogo: 10 }), // Open trailing
      ];
      const series = extractDownConversionSeries(rows);
      expect(series).toHaveLength(3);
      expect(series[0]!.conversionDown).toBe(1);
      expect(series[1]!.conversionDown).toBe(2);
      expect(series[2]!.conversionDown).toBeNull();
    });

    it("enforces partition invariant", () => {
      const rows = [
        makeRow({ play_id: 1, fixed_drive: 1, down: 1, yards_gained: 10, ydstogo: 10 }), // conv 1
        makeRow({ play_id: 2, fixed_drive: 1, down: 1, yards_gained: 1 }),
        makeRow({ play_id: 3, fixed_drive: 1, down: 2, yards_gained: 9, ydstogo: 9 }), // conv 2

        makeRow({ play_id: 4, fixed_drive: 2, down: 1, yards_gained: 0 }),
        makeRow({ play_id: 5, fixed_drive: 2, down: 2, yards_gained: 0 }), // no conv
      ];

      const series = extractDownConversionSeries(rows);
      const converted = series.filter(s => s.conversionDown !== null).length;
      const noConv = series.filter(s => s.conversionDown === null).length;

      expect(series.length).toBe(converted + noConv);
      expect(series.length).toBe(3); // 2 converted + 1 trailing from drive 1 (doesn't exist) => wait, drive 1 ended on conv!

      // Since drive 1 ends with a conversion and no trailing plays, it should yield exactly 2 series.
      // Drive 2 has 2 plays, neither convert, yielding exactly 1 NO_CONVERSION series.
      // Total series should be 3.
    });
  });

  describe("computeDownConversionMetrics", () => {
    it("handles sample floor and shares summing to 1", () => {
      const rows: PbpRow[] = [];
      for(let i = 0; i < MIN_SERIES_TO_REPORT; i++) {
        // Drive with 1 conversion
        rows.push(makeRow({ play_id: i * 2, fixed_drive: i, down: (i % 4) + 1, yards_gained: 10, ydstogo: 10 }));
      }

      const metrics = computeDownConversionMetrics(rows, 2026, 2);
      expect(metrics).toHaveLength(1);

      const team = metrics[0]!;
      expect(team.seasonWindow.series).toBe(20);

      const sum =
        team.seasonWindow.shareOn1st! +
        team.seasonWindow.shareOn2nd! +
        team.seasonWindow.shareOn3rd! +
        team.seasonWindow.shareOn4th! +
        team.seasonWindow.shareNoConversion!;

      expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
      expect(team.seasonWindow.earlyDownShare).toBeCloseTo(team.seasonWindow.shareOn1st! + team.seasonWindow.shareOn2nd!);
    });

    it("shares are null below sample floor", () => {
      const rows = [
        makeRow({ fixed_drive: 1, down: 1, yards_gained: 10, ydstogo: 10 }),
      ];

      const metrics = computeDownConversionMetrics(rows, 2026, 2);
      expect(metrics).toHaveLength(1);

      const team = metrics[0]!;
      expect(team.seasonWindow.series).toBe(1);
      expect(team.seasonWindow.shareOn1st).toBeNull();
      expect(team.seasonWindow.earlyDownShare).toBeNull();
      expect(team.seasonWindow.conversionsOn1st).toBe(1); // counts still correct
    });

    it("respects point-in-time filtering", () => {
      const rows = [
        makeRow({ game_id: "2026_01_A_B", fixed_drive: 1, down: 1, yards_gained: 10, ydstogo: 10 }), // IN
        makeRow({ game_id: "2026_02_A_B", fixed_drive: 2, down: 1, yards_gained: 10, ydstogo: 10 }), // OUT (target week)
        makeRow({ game_id: "2026_03_A_B", fixed_drive: 3, down: 1, yards_gained: 10, ydstogo: 10 }), // OUT (future)
        makeRow({ game_id: "2025_01_A_B", fixed_drive: 4, down: 1, yards_gained: 10, ydstogo: 10 }), // OUT (wrong season)
      ];

      const metrics = computeDownConversionMetrics(rows, 2026, 2);
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.seasonWindow.series).toBe(1);
    });

    it("computes roll4 and roll8 windows using distinct PIT games", () => {
      const rows: PbpRow[] = [];
      // Generate 5 distinct games
      for (let w = 1; w <= 5; w++) {
        // game 1: 1 series
        // game 2: 1 series
        // ...
        rows.push(makeRow({ game_id: `2026_0${w}_A_B`, fixed_drive: w, down: 1, yards_gained: 10, ydstogo: 10 }));
      }

      const metrics = computeDownConversionMetrics(rows, 2026, 6);
      expect(metrics).toHaveLength(1);

      const team = metrics[0]!;
      expect(team.seasonWindow.series).toBe(5); // games 1..5
      expect(team.roll4.series).toBe(4); // games 2..5
      expect(team.roll8.series).toBe(5); // all 5 games
    });

    it("returns empty result on empty input", () => {
      const metrics = computeDownConversionMetrics([], 2026, 1);
      expect(metrics).toEqual([]);
    });

  });
});
