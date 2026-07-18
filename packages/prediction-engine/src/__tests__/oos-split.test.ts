import { describe, it, expect, beforeEach } from "vitest";
import { computeOosSplit, segmentOosSplit } from "../oos-split.js";
import type { SettledPickRecord } from "../oos-split.js";

describe("OOS Split Harness", () => {
  let now: Date;
  let boundary: Date;

  beforeEach(() => {
    now = new Date("2025-06-22T00:00:00Z");
    boundary = new Date("2025-05-23T00:00:00Z"); // 30 days back
  });

  describe("computeOosSplit", () => {
    it("splits picks by boundary date into in-sample and out-of-sample cohorts", () => {
      const picks: SettledPickRecord[] = [
        {
          id: "pick1",
          modelProb: 0.65,
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "pick2",
          modelProb: 0.60,
          won: false,
          createdAt: new Date("2025-05-10"),
          settledAt: new Date("2025-05-11"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "pick3",
          modelProb: 0.70,
          won: true,
          createdAt: new Date("2025-06-01"),
          settledAt: new Date("2025-06-02"),
          line: 2.5,
          pickType: "SPREAD",
        },
        {
          id: "pick4",
          modelProb: 0.55,
          won: false,
          createdAt: new Date("2025-06-10"),
          settledAt: new Date("2025-06-11"),
          line: 2.5,
          pickType: "SPREAD",
        },
      ];

      const result = computeOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 2,
      });

      // Picks 1–2 before boundary: IS, picks 3–4 after: OOS
      expect(result.inSample.n).toBe(2);
      expect(result.outOfSample.n).toBe(2);

      // IS: [true@0.65, false@0.60]
      // Brier = ((0.65-1)² + (0.60-0)²) / 2 = (0.1225 + 0.36) / 2 ≈ 0.2412
      expect(result.inSample.brier).toBeCloseTo(0.2412, 2);
      expect(result.inSample.accuracy).toBe(0.5);

      // OOS: [true@0.70, false@0.55]
      // Brier = ((0.70-1)² + (0.55-0)²) / 2 = (0.09 + 0.3025) / 2 ≈ 0.1962
      expect(result.outOfSample.brier).toBeCloseTo(0.1962, 2);
      expect(result.outOfSample.accuracy).toBe(0.5);

      // OOS is healthier (lower Brier)
      expect(result.oosIsHealthy).toBe(true);
      expect(result.brierDelta).toBeCloseTo(-0.045, 2);
      expect(result.isValid).toBe(true);
    });

    it("reports an even health summary when OOS and in-sample Brier match", () => {
      // Identical in-sample and out-of-sample cohorts -> brierDelta === 0.
      const picks: SettledPickRecord[] = [
        {
          id: "is1",
          modelProb: 0.65,
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "is2",
          modelProb: 0.6,
          won: false,
          createdAt: new Date("2025-05-10"),
          settledAt: new Date("2025-05-11"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "oos1",
          modelProb: 0.65,
          won: true,
          createdAt: new Date("2025-06-01"),
          settledAt: new Date("2025-06-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "oos2",
          modelProb: 0.6,
          won: false,
          createdAt: new Date("2025-06-10"),
          settledAt: new Date("2025-06-11"),
          line: 3.5,
          pickType: "SPREAD",
        },
      ];

      const result = computeOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 2,
      });

      expect(result.brierDelta).toBe(0);
      expect(result.oosIsHealthy).toBe(true);
      expect(result.healthSummary).toBe("OOS is even than in-sample");
    });

    it("marks as invalid when sample sizes below minimum", () => {
      const picks: SettledPickRecord[] = [
        {
          id: "pick1",
          modelProb: 0.65,
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
      ];

      const result = computeOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 20,
      });

      expect(result.isValid).toBe(false);
      expect(result.oosIsHealthy).toBe(false);
      expect(result.healthSummary).toContain("Insufficient");
    });

    it("detects overfit when OOS Brier > IS Brier + tolerance", () => {
      const picks: SettledPickRecord[] = [
        // In-sample: perfectly calibrated
        {
          id: "is1",
          modelProb: 0.8,
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "is2",
          modelProb: 0.8,
          won: true,
          createdAt: new Date("2025-05-02"),
          settledAt: new Date("2025-05-03"),
          line: 3.5,
          pickType: "SPREAD",
        },
        // OOS: model degrades (overfit)
        {
          id: "oos1",
          modelProb: 0.9,
          won: false,
          createdAt: new Date("2025-06-01"),
          settledAt: new Date("2025-06-02"),
          line: 2.5,
          pickType: "SPREAD",
        },
        {
          id: "oos2",
          modelProb: 0.9,
          won: false,
          createdAt: new Date("2025-06-02"),
          settledAt: new Date("2025-06-03"),
          line: 2.5,
          pickType: "SPREAD",
        },
      ];

      const result = computeOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 2,
      });

      expect(result.isValid).toBe(true);
      // OOS Brier >> IS Brier
      expect(result.oosIsHealthy).toBe(false);
      expect(result.brierDelta).toBeGreaterThan(0.03);
      expect(result.healthSummary).toContain("WORSE");
    });

    it("handles edge case of empty picks", () => {
      const result = computeOosSplit([], {
        boundaryDate: boundary,
        minSamplePerCohort: 20,
      });

      expect(result.isValid).toBe(false);
      expect(result.inSample.n).toBe(0);
      expect(result.outOfSample.n).toBe(0);
    });

    it("clamps probabilities to [0, 1]", () => {
      const picks: SettledPickRecord[] = [
        {
          id: "bad1",
          modelProb: 1.5, // out of range
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "bad2",
          modelProb: -0.3, // out of range
          won: false,
          createdAt: new Date("2025-05-02"),
          settledAt: new Date("2025-05-03"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "good1",
          modelProb: 0.6,
          won: true,
          createdAt: new Date("2025-06-01"),
          settledAt: new Date("2025-06-02"),
          line: 2.5,
          pickType: "SPREAD",
        },
        {
          id: "good2",
          modelProb: 0.4,
          won: false,
          createdAt: new Date("2025-06-02"),
          settledAt: new Date("2025-06-03"),
          line: 2.5,
          pickType: "SPREAD",
        },
      ];

      const result = computeOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 2,
      });

      // Should not throw; probabilities clamped
      expect(result.isValid).toBe(true);
      expect(result.inSample.n).toBe(2);
      expect(result.outOfSample.n).toBe(2);
    });
  });

  describe("segmentOosSplit", () => {
    it("segments OOS picks by pick type", () => {
      const picks: SettledPickRecord[] = [
        // In-sample
        {
          id: "is1",
          modelProb: 0.65,
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "is2",
          modelProb: 0.60,
          won: false,
          createdAt: new Date("2025-05-02"),
          settledAt: new Date("2025-05-03"),
          line: 110,
          pickType: "MONEYLINE",
        },
        // Out-of-sample
        {
          id: "oos1",
          modelProb: 0.70,
          won: true,
          createdAt: new Date("2025-06-01"),
          settledAt: new Date("2025-06-02"),
          line: 2.5,
          pickType: "SPREAD",
        },
        {
          id: "oos2",
          modelProb: 0.55,
          won: false,
          createdAt: new Date("2025-06-02"),
          settledAt: new Date("2025-06-03"),
          line: 105,
          pickType: "MONEYLINE",
        },
      ];

      const result = segmentOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 1,
      });

      expect(result.segments).toHaveLength(2);
      expect(result.segments.some((s) => s.label.includes("SPREAD"))).toBe(true);
      expect(result.segments.some((s) => s.label.includes("MONEYLINE"))).toBe(true);

      // Each segment should have n=1 (single OOS pick per type)
      for (const seg of result.segments) {
        expect(seg.calibration.n).toBe(1);
      }
    });

    it("inherits base split result", () => {
      const picks: SettledPickRecord[] = [
        {
          id: "is1",
          modelProb: 0.65,
          won: true,
          createdAt: new Date("2025-05-01"),
          settledAt: new Date("2025-05-02"),
          line: 3.5,
          pickType: "SPREAD",
        },
        {
          id: "oos1",
          modelProb: 0.70,
          won: true,
          createdAt: new Date("2025-06-01"),
          settledAt: new Date("2025-06-02"),
          line: 2.5,
          pickType: "SPREAD",
        },
      ];

      const result = segmentOosSplit(picks, {
        boundaryDate: boundary,
        minSamplePerCohort: 1,
      });

      expect(result.isValid).toBe(true);
      expect(result.inSample).toBeDefined();
      expect(result.outOfSample).toBeDefined();
      expect(result.healthSummary).toBeDefined();
    });
  });
});
