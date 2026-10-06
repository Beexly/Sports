import { describe, expect, it } from "vitest";
import {
  evaluateVennWidths,
  computeWidthDistribution,
  categorizeBookCountTier,
  type SettledPickRecord,
} from "../venn-width-harness.js";

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

    it("computes exact quantiles and veto thresholds on known distribution", () => {
      // 100 values evenly spaced from 0.01 to 1.00
      const values = Array.from({ length: 100 }, (_, i) => (i + 1) / 100);
      const dist = computeWidthDistribution(values);

      expect(dist.count).toBe(100);
      expect(dist.min).toBeCloseTo(0.01);
      expect(dist.max).toBeCloseTo(1.0);
      expect(dist.p50).toBeCloseTo(0.505, 2);
      expect(dist.mean).toBeCloseTo(0.505, 2);

      // Values > 0.20 are 0.21..1.00 (80 values)
      expect(dist.shareAbove020).toBeCloseTo(0.80, 2);

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
      const report = evaluateVennWidths([]);
      expect(report.totalSettled).toBe(0);
      expect(report.overall.count).toBe(0);
    });

    it("evaluates simulated realistic settled slate across sports and book counts", () => {
      // Generate 200 synthetic settled picks with realistic sports and book tiers
      const sports = ["americanfootball_nfl", "americanfootball_ncaaf", "baseball_mlb", "basketball_nba"];
      const testPicks: SettledPickRecord[] = [];

      let idCounter = 1;
      for (const sport of sports) {
        for (let i = 0; i < 50; i++) {
          const isModelSignal = i < 10;
          const bookCount = isModelSignal ? 0 : (i % 10) + 1;
          // Generate predicted win probability between 0.40 and 0.80
          const predictedProb = 0.40 + ((i * 7) % 41) / 100;
          // Outcome correlated with probability
          const actualOutcome = Math.random() < predictedProb ? 1 : 0;
          const isPublished = i % 2 === 0;

          testPicks.push({
            rowId: `pick-${sport}-${idCounter++}`,
            sport,
            bookCount,
            predictedProb,
            actualOutcome,
            isPublished,
          });
        }
      }

      const reportCvap = evaluateVennWidths(testPicks, { mode: "cvap", cvapFolds: 5 });

      expect(reportCvap.totalSettled).toBe(200);
      expect(reportCvap.overall.count).toBe(200);
      expect(reportCvap.overall.mean).toBeGreaterThan(0);
      expect(reportCvap.overall.mean).toBeLessThan(1);

      // Check that all 4 sports exist in the breakdown
      for (const sport of sports) {
        expect(reportCvap.bySport[sport]).toBeDefined();
        expect(reportCvap.bySport[sport]!.count).toBe(50);
      }

      // Check that all book tiers exist
      expect(reportCvap.byBookTier["0_books_model_signal"].count).toBeGreaterThan(0);
      expect(reportCvap.byBookTier["1_to_2_books"].count).toBeGreaterThan(0);
      expect(reportCvap.byBookTier["3_to_5_books"].count).toBeGreaterThan(0);
      expect(reportCvap.byBookTier["6_plus_books"].count).toBeGreaterThan(0);

      // Check that scored rows match count
      expect(reportCvap.scoredRows.length).toBe(200);
      for (const row of reportCvap.scoredRows) {
        expect(row.width).toBeGreaterThanOrEqual(0);
        expect(row.width).toBeLessThanOrEqual(1.0);
        expect(row.p0).toBeLessThanOrEqual(row.p1 + 1e-9);
      }
    });

    it("evaluates IVAP mode and returns valid multiprobability intervals", () => {
      const picks: SettledPickRecord[] = Array.from({ length: 40 }, (_, i) => ({
        rowId: `row-${i}`,
        sport: "americanfootball_nfl",
        bookCount: (i % 8) + 1,
        predictedProb: 0.45 + (i % 25) / 100,
        actualOutcome: (i % 2 === 0 ? 1 : 0) as 0 | 1,
        isPublished: true,
      }));

      const report = evaluateVennWidths(picks, { mode: "ivap", minCalibrationSize: 5 });

      expect(report.totalSettled).toBe(40);
      expect(report.mode).toBe("ivap");
      expect(report.overall.count).toBe(40);
      expect(report.overall.min).toBeGreaterThanOrEqual(0);
      expect(report.overall.max).toBeLessThanOrEqual(1);
    });

    it("fails closed with width 1.0 when calibration pool is below minCalibrationSize", () => {
      const smallPool: SettledPickRecord[] = [
        {
          rowId: "row-1",
          sport: "cricket",
          bookCount: 1,
          predictedProb: 0.6,
          actualOutcome: 1,
          isPublished: true,
        },
        {
          rowId: "row-2",
          sport: "cricket",
          bookCount: 1,
          predictedProb: 0.7,
          actualOutcome: 0,
          isPublished: true,
        },
      ];

      const report = evaluateVennWidths(smallPool, { minCalibrationSize: 5 });
      expect(report.totalSettled).toBe(2);
      expect(report.overall.mean).toBe(1.0);
      expect(report.overall.shareAbove020).toBe(1.0);
      expect(report.scoredRows[0]!.width).toBe(1.0);
      expect(report.scoredRows[0]!.p0).toBe(0.0);
      expect(report.scoredRows[0]!.p1).toBe(1.0);
    });
  });
});
