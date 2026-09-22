
import { describe, expect, it } from "vitest";
import { lineupAdjustment, roleFeatures } from "./lineup-roles";

describe("lineup-roles", () => {
  it("emits role indicators and signed pair effects", () => {
    const f = roleFeatures(["shooter", "rim-runner", "playmaker"], {
      "playmaker+shooter": 0.42,
      "rim-runner+shooter": -0.31,
    });
    expect(f.indicators).toEqual({ shooter: 1, "rim-runner": 1, playmaker: 1 });
    expect(lineupAdjustment(f)).toBeCloseTo(0.11, 10);
  });
  it("unknown pairs contribute zero and effects clamp to +-0.5", () => {
    const f = roleFeatures(["a", "b"], { "a+b": 2.0 });
    expect(f.pairAdjustments[0]!.effect).toBe(0.5);
    const g = roleFeatures(["a", "b"], {});
    expect(g.pairAdjustments).toEqual([]);
  });
  it("empty lineup yields empty features", () => {
    const f = roleFeatures([], {});
    expect(f.indicators).toEqual({});
    expect(lineupAdjustment(f)).toBe(0);
  });
});
