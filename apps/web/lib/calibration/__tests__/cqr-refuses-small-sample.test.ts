import { describe, expect, it } from "vitest";
import {
  conformalQuantile,
  conformalQuantileForStratum,
  conformalRank,
  cqrInterval,
} from "../cqr";

describe("conformalQuantile refuses when the finite-sample rank exceeds n-1", () => {
  it("n=5 alpha=0.1: rank is 5, which is > n-1, quantile is +Infinity", () => {
    const scores = [0.1, 0.2, 0.3, 0.5, 0.8];
    const n = scores.length;
    const rank = conformalRank(n, 0.1);
    expect(rank).toBe(5);
    expect(rank).toBeGreaterThan(n - 1);
    expect(conformalQuantile(scores, 0.1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns the ceil((n+1)(1-alpha)) order statistic when n supports it", () => {
    const scores = Array.from({ length: 20 }, (_, i) => (i + 1) / 20);
    const rank = conformalRank(20, 0.2);
    expect(rank).toBe(16);
    expect(conformalQuantile(scores, 0.2)).toBe(scores[16]);
  });

  it("existing caller cqrInterval handles an infinite width without throwing", () => {
    const yCal = [1, 2, 3, 4, 5];
    const qLoCal = [0.5, 1.5, 2.5, 3.5, 4.5];
    const qHiCal = [1.5, 2.5, 3.5, 4.5, 5.5];
    let result: ReturnType<typeof cqrInterval> | undefined;
    expect(() => {
      result = cqrInterval([10, 20], [12, 22], yCal, qLoCal, qHiCal, 0.1);
    }).not.toThrow();
    expect(result?.qhat).toBe(Number.POSITIVE_INFINITY);
    expect(result?.licensed).toBe(false);
    expect(result?.lo[0]).toBe(Number.NEGATIVE_INFINITY);
    expect(result?.hi[0]).toBe(Number.POSITIVE_INFINITY);
  });

  it("empty calibration is unlicensed, not qhat 0", () => {
    const result = cqrInterval([3], [5], [], [], []);
    expect(result.licensed).toBe(false);
    expect(result.qhat).toBe(Number.POSITIVE_INFINITY);
    expect(result.lo).not.toEqual([3]);
    expect(result.hi).not.toEqual([5]);
  });

  it("each stratum carries its own quantile (existing 3-part stratumKey format)", () => {
    const small = "NFL|SPREAD|v5.2.1";
    const large = "NFL|MONEYLINE|v5.2.1";
    const map = conformalQuantileForStratum(
      new Map([
        [small, [0.1, 0.2, 0.3, 0.5, 0.8]],
        [large, Array.from({ length: 20 }, (_, i) => (i + 1) / 20)],
      ]),
      0.1,
    );
    expect(map.get(small)).toBe(Number.POSITIVE_INFINITY);
    expect(map.get(large)).not.toBe(Number.POSITIVE_INFINITY);
    expect(map.get(small)).not.toBe(map.get(large));
  });
});
