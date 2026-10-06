import { describe, expect, it } from "vitest";
import {
  blockBootstrapCoverage,
  conformalQc,
  type CalibrationRecord,
} from "./conformal-qc-2512.js";

function records(n: number, coverRate: number, blocks: number): CalibrationRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    block: i % blocks,
    nominal: 0.9,
    covered: (i * 0.61803398875) % 1 < coverRate,
  }));
}

describe("conformal qc", () => {
  it("block bootstrap is deterministic and flags undercoverage", () => {
    const recs = records(200, 0.8, 20); // true 80% < 90% nominal
    const a = blockBootstrapCoverage(recs, 50, 7);
    const b = blockBootstrapCoverage(recs, 50, 7);
    expect(a).toEqual(b);
    expect(a.length).toBe(50);
    const flagged = a.filter((r) => r.flagged).length;
    expect(flagged).toBeGreaterThan(40); // 80% << 85% threshold
  });

  it("well-calibrated intervals are not flagged", () => {
    const recs = records(400, 0.92, 40);
    const a = blockBootstrapCoverage(recs, 50, 7);
    const flagged = a.filter((r) => r.flagged).length;
    expect(flagged).toBeLessThan(10);
  });

  it("qc verdict detects the small-window hazard", () => {
    const recs = records(200, 0.8, 20);
    const spreads = recs.map((_, i) => (i % 11) - 5);
    const v = conformalQc(recs, spreads, 50);
    expect(v.smallWindowHazard).toBe(true);
    expect(v.minWindow).toBeGreaterThan(0);
    expect(v.bins.length).toBe(5);
    const total = v.bins.reduce((s, b) => s + b.n, 0);
    expect(total).toBe(200);
  });

  it("conditional bins route spreads to the right bucket", () => {
    const recs = records(10, 1, 2);
    const spreads = [-10, -5, 0, 5, 10, -10, -5, 0, 5, 10];
    const v = conformalQc(recs, spreads, 10);
    expect(v.bins[0]?.n).toBe(2); // <= -7
    expect(v.bins[2]?.n).toBe(2); // -3..3
    expect(v.bins[4]?.n).toBe(2); // > 7
  });

  it("handles empty input", () => {
    expect(blockBootstrapCoverage([], 10)).toEqual([]);
    const v = conformalQc([], [], 10);
    expect(v.smallWindowHazard).toBe(false);
    expect(v.resamples).toBe(0);
  });
});
