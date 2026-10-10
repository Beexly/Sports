import { describe, expect, it } from "vitest";
import {
  computeReceiverUsage,
  computeMetricsForWindow,
  applyShrinkage,
  filterPointInTime,
  MIN_TARGETS_FLOOR,
  type ReceiverTarget
} from "../receiver-usage.js";
import { isTargetInRedZone } from "../../signals/efficiency/redzone-te-leverage.js";

describe("receiver-usage", () => {
  describe("computeMetricsForWindow", () => {
    it("returns nulls if targets < MIN_TARGETS_FLOOR", () => {
      const metrics = computeMetricsForWindow([], MIN_TARGETS_FLOOR - 1, 0, 0);
      expect(metrics.targetShare).toBeNull();
      expect(metrics.targetDominance).toBeNull();
    });

    it("matches hand-calculated target share, deep target share, and RZ target share", () => {
      const playerTargets: ReceiverTarget[] = [];
      for (let i = 0; i < 5; i++) {
        playerTargets.push({ passAirYards: 20, yardline100: 50, receiverPlayerName: "J.Jefferson", down: 1, playType: "pass", season: 2023, week: 1 });
      }
      for (let i = 0; i < 3; i++) {
        playerTargets.push({ passAirYards: 5, yardline100: 10, receiverPlayerName: "J.Jefferson", down: 1, playType: "pass", season: 2023, week: 1 });
      }
      for (let i = 0; i < 2; i++) {
        playerTargets.push({ passAirYards: 5, yardline100: 50, receiverPlayerName: "J.Jefferson", down: 1, playType: "pass", season: 2023, week: 1 });
      }

      const metrics = computeMetricsForWindow(playerTargets, 40, 10, 10);

      expect(metrics.targetShare).toBeCloseTo(10 / 40);
      expect(metrics.deepTargetShare).toBeCloseTo(5 / 10);
      expect(metrics.redZoneTargetShare).toBeCloseTo(3 / 10);
      expect(metrics.targetDominance).toBeCloseTo(0.325);
    });

    it("applies shrinkage for small samples correctly", () => {
      const teamTotal = 20;
      const playerTargets: ReceiverTarget[] = Array(10).fill({ passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2023, week: 1 });

      const metrics = computeMetricsForWindow(playerTargets, teamTotal, 10, 10);
      expect(metrics.targetShare).toBeCloseTo((0.50 * (1/3)) + (0.15 * (2/3)));
    });
  });

  describe("filterPointInTime", () => {
    it("excludes targets from the current or future weeks", () => {
      const targets: ReceiverTarget[] = [
        { passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2023, week: 1 },
        { passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2023, week: 2 },
        { passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2023, week: 3 },
      ];

      const valid = filterPointInTime(targets, 2023, 2);
      expect(valid.length).toBe(1);
      expect(valid[0]!.week).toBe(1);
    });

    it("caps lag at 2 prior seasons", () => {
      const targets: ReceiverTarget[] = [
        { passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2020, week: 17 },
        { passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2021, week: 1 },
        { passAirYards: 5, yardline100: 50, receiverPlayerName: "A", down: 1, playType: "pass", season: 2022, week: 1 },
      ];

      const valid = filterPointInTime(targets, 2023, 1);
      expect(valid.length).toBe(2);
      expect(valid.map(t => t.season)).toEqual(expect.arrayContaining([2021, 2022]));
    });
  });

  describe("reuse of redzone-te-leverage logic", () => {
    it("verifies RZ target count relies on isTargetInRedZone", () => {
      expect(isTargetInRedZone(20)).toBe(true);
      expect(isTargetInRedZone(21)).toBe(false);

      const playerTargets: ReceiverTarget[] = [
        { passAirYards: 5, yardline100: 20, receiverPlayerName: "A", down: 1, playType: "pass", season: 2023, week: 1 },
        { passAirYards: 5, yardline100: 21, receiverPlayerName: "A", down: 1, playType: "pass", season: 2023, week: 1 },
      ];

      const metrics = computeMetricsForWindow(playerTargets, 40, 0, 10);
      expect(metrics.redZoneTargetShare).toBeCloseTo(0.10);
    });
  });

  describe("computeReceiverUsage integration", () => {
    it("parses PbpRow array and computes windows properly", () => {
      const rows = [
        { play_type: "pass", receiver_player_name: "J.Chase", posteam: "CIN", air_yards: "10", yardline_100: "50", down: "1", season: "2023", game_id: "2023_01_CIN_CLE" },
      ];

      for (let i = 0; i < 40; i++) {
        rows.push({ play_type: "pass", receiver_player_name: "J.Chase", posteam: "CIN", air_yards: "10", yardline_100: "50", down: "1", season: "2023", game_id: "2023_01_CIN_CLE" });
      }

      rows.push({ play_type: "pass", receiver_player_name: "J.Chase", posteam: "CIN", air_yards: "10", yardline_100: "50", down: "1", season: "2023", game_id: "2023_02_CIN_BAL" });

      const records = computeReceiverUsage(rows as any[]);

      const week2Record = records.find(r => r.week === 2);
      expect(week2Record).toBeDefined();
      expect(week2Record!.windowSeason.targetShare).not.toBeNull();
      expect(week2Record!.windowSeason.targetShare).toBe(1.0);
    });
  });
});
