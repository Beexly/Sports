import { describe, expect, it } from "vitest";
import {
  blendAnalystView,
  cumulativeProbitPredict,
  fitPriorRegression,
  rollForwardPriors,
} from "./match-prior-discipline";

describe("match-prior-discipline", () => {
  it("ordered buckets sum to 1 and favor the stronger team", () => {
    const p = cumulativeProbitPredict(1.5, 0.3, [-1, 1]); // P(fail), P(push), P(cover)
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p[2]!).toBeGreaterThan(p[0]!); // cover > fail for the favorite
    const dog = cumulativeProbitPredict(-1.5, -0.3, [-1, 1]);
    expect(dog[0]!).toBeGreaterThan(dog[2]!);
  });

  it("prior regression recovers the linear map", () => {
    const ext = [1, 2, 3, 4, 5];
    const post = ext.map((x) => 2 * x + 1);
    const { a, b } = fitPriorRegression(ext, post);
    expect(a).toBeCloseTo(1, 10);
    expect(b).toBeCloseTo(2, 10);
    expect(() => fitPriorRegression([1], [1])).toThrow("≥2");
  });

  it("analyst blending interpolates between prior and view", () => {
    const prior = [50, 30, 20];
    const view = [0.1, 0.2, 0.7];
    const zero = blendAnalystView(prior, view, 100, 0);
    expect(zero[0]).toBeCloseTo(0.5, 10); // pure prior
    const full = blendAnalystView([0, 0, 0], view, 100, 1);
    expect(full[2]).toBeCloseTo(0.7, 10); // pure view
  });

  it("roll-forward shrinks toward the league mean", () => {
    const next = rollForwardPriors({ A: 10, B: 0 }, 0.5);
    expect(next["A"]).toBeCloseTo(7.5, 10); // 0.5*10 + 0.5*5
    expect(next["B"]).toBeCloseTo(2.5, 10);
    expect(rollForwardPriors({})).toEqual({});
  });
});
