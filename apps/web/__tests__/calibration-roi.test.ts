/**
 * C63 — ROI Tracking math tests.
 *
 * Validates pure-function math without DB/network. Confirms ROI is
 * opt-in to eligible rows (non-null units, settled, risked > 0).
 */

import { describe, it, expect } from "vitest";
import {
  pickRoi,
  aggregateRoi,
  computeRoiSummary,
  type RoiInput,
} from "@/lib/calibration/roi";

const SETTLED_WIN: RoiInput = {
  id: "p1",
  confidence: 72,
  result: "WIN",
  unitsRisked: 1.0,
  unitsReturned: 1.91, // -110 odds, won 0.91 net
};

const SETTLED_LOSS: RoiInput = {
  id: "p2",
  confidence: 65,
  result: "LOSS",
  unitsRisked: 1.0,
  unitsReturned: 0,
};

const SETTLED_PUSH: RoiInput = {
  id: "p3",
  confidence: 58,
  result: "PUSH",
  unitsRisked: 1.0,
  unitsReturned: 1.0,
};

const PENDING: RoiInput = {
  id: "p4",
  confidence: 75,
  result: "PENDING",
  unitsRisked: 1.0,
  unitsReturned: 0,
};

const NULL_UNITS: RoiInput = {
  id: "p5",
  confidence: 80,
  result: "WIN",
  unitsRisked: null,
  unitsReturned: null,
};

describe("pickRoi", () => {
  it("computes -1 when the pick lost full stake", () => {
    expect(pickRoi(1.0, 0)).toBe(-1);
  });

  it("computes 0 on a push", () => {
    expect(pickRoi(1.0, 1.0)).toBe(0);
  });

  it("computes 0.91 on a winning -110 pick", () => {
    expect(pickRoi(1.0, 1.91)).toBeCloseTo(0.91, 5);
  });

  it("throws on zero stake", () => {
    expect(() => pickRoi(0, 0)).toThrow(/cannot be zero/);
  });
});

describe("aggregateRoi", () => {
  it("returns null for empty input", () => {
    expect(aggregateRoi([])).toBeNull();
  });

  it("returns null when no row has units", () => {
    expect(aggregateRoi([NULL_UNITS, PENDING])).toBeNull();
  });

  it("filters PENDING and rows with null units before aggregating", () => {
    const result = aggregateRoi([SETTLED_WIN, SETTLED_LOSS, NULL_UNITS, PENDING]);
    // 1 win at +0.91 net, 1 loss at -1 net → (1.91 + 0) - (1 + 1) = -0.09 over 2 units risked = -0.045
    expect(result).toBeCloseTo(-0.045, 5);
  });

  it("includes PUSH rows in aggregation (zero contribution)", () => {
    const result = aggregateRoi([SETTLED_WIN, SETTLED_PUSH]);
    // (1.91 + 1.0) - (1 + 1) = 0.91 over 2 risked = 0.455
    expect(result).toBeCloseTo(0.455, 5);
  });
});

describe("computeRoiSummary", () => {
  it("returns empty buckets for empty input", () => {
    const summary = computeRoiSummary([]);
    expect(summary.sampleSize).toBe(0);
    expect(summary.roi).toBeNull();
    expect(summary.buckets).toHaveLength(5);
    for (const b of summary.buckets) {
      expect(b.sampleSize).toBe(0);
      expect(b.roi).toBeNull();
    }
  });

  it("buckets a winning 72-confidence pick into 70-79", () => {
    const summary = computeRoiSummary([SETTLED_WIN]);
    const bucket = summary.buckets.find((b) => b.label === "70-79")!;
    expect(bucket.sampleSize).toBe(1);
    expect(bucket.roi).toBeCloseTo(0.91, 5);
    for (const b of summary.buckets) {
      if (b.label !== "70-79") {
        expect(b.sampleSize).toBe(0);
        expect(b.roi).toBeNull();
      }
    }
  });

  it("excludes PENDING and null-units rows from sample sizes", () => {
    const summary = computeRoiSummary([NULL_UNITS, PENDING, SETTLED_WIN]);
    expect(summary.sampleSize).toBe(1); // only SETTLED_WIN counts
    const bucket = summary.buckets.find((b) => b.label === "70-79")!;
    expect(bucket.sampleSize).toBe(1);
  });

  it("aggregate ROI matches individual bucket math", () => {
    const summary = computeRoiSummary([SETTLED_WIN, SETTLED_LOSS, SETTLED_PUSH]);
    const totalRisked = summary.unitsRisked;
    const totalReturned = summary.unitsReturned;
    expect(totalRisked).toBe(3);
    expect(totalReturned).toBeCloseTo(1.91 + 0 + 1.0, 5);
    expect(summary.roi).toBeCloseTo((totalReturned - totalRisked) / totalRisked, 5);
  });

  it("rejects unitsRisked <= 0", () => {
    const bad: RoiInput = {
      id: "p-bad",
      confidence: 70,
      result: "WIN",
      unitsRisked: 0,
      unitsReturned: 0,
    };
    const summary = computeRoiSummary([bad, SETTLED_WIN]);
    expect(summary.sampleSize).toBe(1);
  });
});
