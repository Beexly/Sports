import { describe, expect, it } from "vitest";
import {
  bookCountKey,
  categorizeBookCountTier,
  computeWidthDistribution,
  evaluateVennWidths,
  type SettledPickRecord,
} from "../venn-width-harness.js";
import { ivapPredict } from "../ivap.js";

/** Every call states its floor — the harness refuses to default one. */
const TEST_FLOOR = 20;

function mk(
  rowId: string,
  sport: string,
  bookCount: number,
  predictedProb: number | null,
  actualOutcome: 0 | 1,
  isPublished = true,
  market?: string,
): SettledPickRecord {
  return { rowId, sport, bookCount, predictedProb, actualOutcome, isPublished, market };
}

describe("venn-width-harness", () => {
  describe("categorizeBookCountTier", () => {
    it("categorizes book counts into canonical tiers", () => {
      expect(categorizeBookCountTier(0)).toBe("0_books_model_signal");
      expect(categorizeBookCountTier(-1)).toBe("0_books_model_signal");
      expect(categorizeBookCountTier(1)).toBe("1_to_2_books");
      expect(categorizeBookCountTier(2)).toBe("1_to_2_books");
      expect(categorizeBookCountTier(3)).toBe("3_to_5_books");
      expect(categorizeBookCountTier(5)).toBe("3_to_5_books");
      expect(categorizeBookCountTier(6)).toBe("6_plus_books");
      expect(categorizeBookCountTier(12)).toBe("6_plus_books");
    });
  });

  describe("bookCountKey", () => {
    it("keeps exact counts and tails 11+", () => {
      expect(bookCountKey(0)).toBe("0");
      expect(bookCountKey(-3)).toBe("0");
      expect(bookCountKey(1)).toBe("1");
      expect(bookCountKey(10)).toBe("10");
      expect(bookCountKey(11)).toBe("11+");
      expect(bookCountKey(14)).toBe("11+");
    });
  });

  describe("computeWidthDistribution", () => {
    it("handles empty array cleanly", () => {
      const dist = computeWidthDistribution([]);
      expect(dist.count).toBe(0);
      expect(dist.min).toBe(0);
      expect(dist.max).toBe(0);
      expect(dist.mean).toBe(0);
      expect(dist.shareAbove020).toBe(0);
      expect(dist.thresholdForVeto5Pct).toBe(0);
    });

    it("computes deciles, veto thresholds and share above 0.20", () => {
      // 100 values evenly spaced from 0.01 to 1.00
      const values = Array.from({ length: 100 }, (_, i) => (i + 1) / 100);
      const dist = computeWidthDistribution(values);

      expect(dist.count).toBe(100);
      expect(dist.min).toBeCloseTo(0.01);
      expect(dist.max).toBeCloseTo(1.0);
      expect(dist.p10).toBeCloseTo(0.109, 3);
      expect(dist.p50).toBeCloseTo(0.505, 2);
      expect(dist.p90).toBeCloseTo(0.901, 2);
      expect(dist.mean).toBeCloseTo(0.505, 2);

      // Values > 0.20 are 0.21..1.00 (80 values)
      expect(dist.shareAbove020).toBeCloseTo(0.8, 2);

      // 95th percentile = veto top 5%
      expect(dist.thresholdForVeto5Pct).toBeCloseTo(0.9505, 2);
      // 90th percentile = veto top 10%
      expect(dist.thresholdForVeto10Pct).toBeCloseTo(0.901, 2);
      // 80th percentile = veto top 20%
      expect(dist.thresholdForVeto20Pct).toBeCloseTo(0.802, 2);
    });
  });

  describe("evaluateVennWidths", () => {
    it("handles empty pick array", () => {
      const report = evaluateVennWidths([], { stratumCalibrationFloor: TEST_FLOOR });
      expect(report.totalRows).toBe(0);
      expect(report.overall.rows).toBe(0);
      expect(report.overall.width.count).toBe(0);
      expect(report.bySport).toEqual({});
      expect(report.scoredRows).toEqual([]);
    });

    it("refuses to run without an explicit floor (no invented default)", () => {
      expect(() =>
        evaluateVennWidths([], { stratumCalibrationFloor: 0 }),
      ).toThrow(RangeError);
      expect(() =>
        evaluateVennWidths([], { stratumCalibrationFloor: Number.NaN }),
      ).toThrow(RangeError);
    });

    it("counts empty-calibration rows separately — never as width-1 refusals", () => {
      // One row alone in its sport: its leave-one-out calibration set is empty.
      const picks: SettledPickRecord[] = [mk("solo-1", "cricket", 0, 0.61, 1)];
      const report = evaluateVennWidths(picks, { mode: "ivap", stratumCalibrationFloor: TEST_FLOOR });

      expect(report.overall.rows).toBe(1);
      expect(report.overall.emptyCalibration).toBe(1);
      expect(report.overall.scored).toBe(0);
      expect(report.overall.scoredAboveFloor).toBe(0);
      // A refusal state must not masquerade as a measured width.
      expect(report.overall.width.count).toBe(0);
      expect(report.overall.width.mean).toBe(0);
      expect(report.overall.width.shareAbove020).toBe(0);
      expect(report.scoredRows).toHaveLength(0);

      // The engine's fail-close contract, stated for contrast: ivap on an
      // empty set returns [0,1] width 1. The census counts that state as
      // `emptyCalibration` and keeps it OUT of every width distribution —
      // folding it in would read as a genuinely wide interval.
      const engineOnEmpty = ivapPredict([], 0.61);
      expect(engineOnEmpty.width).toBe(1);
      expect(report.overall.width.count).toBe(0);
    });

    it("counts rows without a model probability separately and never scores them", () => {
      const picks: SettledPickRecord[] = [
        mk("a", "sport_x", 1, null, 1),
        mk("b", "sport_x", 1, 0.55, 1),
        mk("c", "sport_x", 1, 0.7, 0),
      ];
      const report = evaluateVennWidths(picks, { mode: "ivap", stratumCalibrationFloor: TEST_FLOOR });

      expect(report.overall.rows).toBe(3);
      expect(report.overall.noModelProbability).toBe(1);
      expect(report.overall.emptyCalibration).toBe(0);
      expect(report.overall.scored).toBe(2);
      expect(report.scoredRows).toHaveLength(2);
      expect(report.scoredRows.every((r) => Number.isFinite(r.predictedProb))).toBe(true);
    });

    it("splits scored rows by the explicit floor", () => {
      const picks: SettledPickRecord[] = [];
      for (let i = 0; i < 25; i++) picks.push(mk(`a-${i}`, "sport_a", i % 3, 0.5 + (i % 10) / 50, i % 2 as 0 | 1));
      for (let i = 0; i < 5; i++) picks.push(mk(`b-${i}`, "sport_b", i, 0.4 + (i % 10) / 50, (i + 1) % 2 as 0 | 1));

      const report = evaluateVennWidths(picks, { mode: "ivap", stratumCalibrationFloor: TEST_FLOOR });

      expect(report.bySport["sport_a"]!.scored).toBe(25);
      expect(report.bySport["sport_a"]!.scoredAboveFloor).toBe(25);
      expect(report.bySport["sport_b"]!.scored).toBe(5);
      expect(report.bySport["sport_b"]!.scoredAboveFloor).toBe(0);
      expect(report.overall.scored).toBe(30);
      expect(report.overall.scoredAboveFloor).toBe(25);
      // The above-floor distribution covers only sport_a's rows.
      expect(report.overall.widthAboveFloor.count).toBe(25);
    });

    it("is deterministic under the documented seed and returns sane intervals", () => {
      const picks: SettledPickRecord[] = [];
      for (let i = 0; i < 60; i++) {
        picks.push(mk(`r-${i}`, "americanfootball_nfl", i % 8, 0.45 + (i % 25) / 100, (i % 2) as 0 | 1, true, i % 3 === 0 ? "SPREAD" : "TOTAL"));
      }
      const a = evaluateVennWidths(picks, { mode: "cvap", cvapFolds: 5, stratumCalibrationFloor: TEST_FLOOR });
      const b = evaluateVennWidths(picks, { mode: "cvap", cvapFolds: 5, stratumCalibrationFloor: TEST_FLOOR });

      expect(a.overall.scored).toBe(60);
      expect(a.scoredRows.map((r) => r.width)).toEqual(b.scoredRows.map((r) => r.width));
      for (const row of a.scoredRows) {
        expect(row.width).toBeGreaterThanOrEqual(0);
        expect(row.width).toBeLessThanOrEqual(1.0);
        expect(row.p0).toBeLessThanOrEqual(row.p1 + 1e-9);
        expect(row.calibrationN).toBe(59);
      }
      // Stratum keys exist for the dimensions the founder asked for.
      expect(Object.keys(a.byBookCount).length).toBeGreaterThan(0);
      expect(a.bySportBookCount["americanfootball_nfl|0"]).toBeDefined();
      expect(a.bySportMarket["americanfootball_nfl|SPREAD"]).toBeDefined();
      expect(a.bySportMarket["americanfootball_nfl|TOTAL"]).toBeDefined();
    });

    it("scores a realistic multi-sport slate with counts that add up", () => {
      const sports = ["americanfootball_nfl", "americanfootball_ncaaf", "baseball_mlb", "basketball_nba"];
      const testPicks: SettledPickRecord[] = [];
      let idCounter = 1;
      for (const sport of sports) {
        for (let i = 0; i < 30; i++) {
          const bookCount = i < 10 ? 0 : (i % 10) + 1;
          const predictedProb = 0.4 + ((i * 7) % 41) / 100;
          const actualOutcome = (i % 3 === 0 ? 1 : 0) as 0 | 1;
          testPicks.push(mk(`pick-${sport}-${idCounter++}`, sport, bookCount, predictedProb, actualOutcome, i % 2 === 0));
        }
      }

      const report = evaluateVennWidths(testPicks, { mode: "cvap", cvapFolds: 5, stratumCalibrationFloor: TEST_FLOOR });

      expect(report.totalRows).toBe(120);
      expect(report.overall.rows).toBe(120);
      expect(report.overall.scored).toBe(120);
      expect(report.overall.emptyCalibration).toBe(0);
      expect(report.overall.noModelProbability).toBe(0);
      expect(report.overall.width.count).toBe(120);
      expect(report.overall.width.mean).toBeGreaterThan(0);
      expect(report.overall.width.mean).toBeLessThan(1);

      for (const sport of sports) {
        expect(report.bySport[sport]!.rows).toBe(30);
        expect(report.bySport[sport]!.scored).toBe(30);
      }
      // Counts reconcile: rows = scored + emptyCalibration + noModelProbability.
      for (const card of Object.values(report.bySport)) {
        expect(card.rows).toBe(card.scored + card.emptyCalibration + card.noModelProbability);
      }
    });
  });
});
