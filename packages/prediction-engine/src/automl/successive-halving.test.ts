
import { describe, expect, it } from "vitest";
import { halvingPromote, halvingSchedule, warmStartConfigs, withinTolerance } from "./successive-halving";

describe("successive-halving", () => {
  it("promotes the top 1/eta configs", () => {
    const scores = [0.5, 0.1, 0.4, 0.3, 0.2, 0.6].map((s, i) => ({ configId: "c" + i, score: s }));
    expect(halvingPromote(scores, 2)).toEqual(["c1", "c4", "c3"]);
  });
  it("schedule shrinks geometrically to 1", () => {
    expect(halvingSchedule(27, 3)).toEqual([27, 9, 3, 1]);
  });
  it("warm-starts from the previous trace", () => {
    const trace = [{ configId: "a", score: 0.5 }, { configId: "b", score: 0.2 }, { configId: "c", score: 0.3 }];
    expect(warmStartConfigs(trace, 2)).toEqual(["b", "c"]);
  });
  it("withinTolerance implements the 2% gate", () => {
    expect(withinTolerance(0.51, 0.5)).toBe(true);
    expect(withinTolerance(0.53, 0.5)).toBe(false);
  });
  it("edge cases: empty scores, bad eta", () => {
    expect(halvingPromote([], 2)).toEqual([]);
    expect(() => halvingPromote([{ configId: "x", score: 1 }], 1)).toThrow();
  });
});
