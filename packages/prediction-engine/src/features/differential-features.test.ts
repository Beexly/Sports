/**
 * Differential features — tests (arXiv 2303.16776v1).
 *
 * ACCEPTANCE GATE: differentials compute per-pair gaps; BALANCE is the
 * mean absolute differential; the RANKDIFF saturation is odd, bounded,
 * and monotone; LOO aggregates exclude exactly the target game; the
 * leakage audit passes when the drop is <= 5 pp and flags larger drops.
 */
import { describe, expect, it } from "vitest";
import {
  balanceMetric,
  differentials,
  leakageAudit,
  looAggregate,
  rankdiffSaturation,
} from "./differential-features";

describe("differentials + balanceMetric", () => {
  it("computes per-pair gaps and the BALANCE metric", () => {
    const diffs = differentials({
      pass_run_epa: { a: 0.12, b: 0.02 },
      short_long_down: { a: 0.05, b: -0.03 },
      home_road: { a: 0.08, b: 0.08 },
    });
    expect(diffs["pass_run_epa_diff"]).toBeCloseTo(0.1, 12);
    expect(diffs["short_long_down_diff"]).toBeCloseTo(0.08, 12);
    expect(diffs["home_road_diff"]).toBeCloseTo(0, 12);
    // BALANCE = mean(|0.1|, |0.08|, |0|) = 0.06.
    expect(balanceMetric(diffs)).toBeCloseTo(0.06, 12);
    // A perfectly balanced team scores 0.
    expect(balanceMetric({ x: 0, y: 0 })).toBe(0);
    expect(() => balanceMetric({})).toThrow();
  });
});

describe("rankdiffSaturation", () => {
  it("saturates large rating gaps", () => {
    expect(rankdiffSaturation(0)).toBe(0);
    expect(rankdiffSaturation(5)).toBeGreaterThan(0);
    expect(rankdiffSaturation(-5)).toBe(-rankdiffSaturation(5));
    // Diminishing returns: doubling a large gap barely moves it.
    const big = rankdiffSaturation(40);
    const bigger = rankdiffSaturation(80);
    expect(bigger - big).toBeLessThan(0.05);
    expect(big).toBeLessThan(1);
    expect(() => rankdiffSaturation(5, 0)).toThrow();
  });
});

describe("looAggregate", () => {
  it("excludes exactly the target game", () => {
    const vals = [1, 2, 3, 4];
    expect(looAggregate(vals, 0)).toBeCloseTo((2 + 3 + 4) / 3, 12);
    expect(looAggregate(vals, 3)).toBeCloseTo((1 + 2 + 3) / 3, 12);
    expect(looAggregate([5, 7], 1)).toBe(5);
    expect(() => looAggregate([1], 0)).toThrow();
    expect(() => looAggregate(vals, 4)).toThrow();
  });
});

describe("leakageAudit", () => {
  it("passes small drops and flags leakage", () => {
    const ok = leakageAudit(700, 1000, 690, 1000);
    expect(ok.leakyAcc).toBeCloseTo(0.7, 12);
    expect(ok.looAcc).toBeCloseTo(0.69, 12);
    expect(ok.dropPp).toBeCloseTo(1, 12);
    expect(ok.pass).toBe(true);
    const bad = leakageAudit(800, 1000, 690, 1000);
    expect(bad.dropPp).toBeCloseTo(11, 12);
    expect(bad.pass).toBe(false);
    expect(() => leakageAudit(1, 0, 1, 1)).toThrow();
  });
});
