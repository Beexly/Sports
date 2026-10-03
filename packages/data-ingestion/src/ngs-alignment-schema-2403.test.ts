import { describe, expect, it } from "vitest";
import { validateAlignedPlay, wasserstein1, yardageGatePasses, GSE_NGS_SIM_ENABLED } from "./ngs-alignment-schema-2403.js";

const ents = () => Array.from({ length: 23 }, () => ({ x: 10, y: 20 }));
const good = {
  playId: "p1", gameId: "g1",
  frames: [
    { frameId: 1, t: 0, entities: ents() },
    { frameId: 2, t: 0.1, entities: ents() },
  ],
  epa: 0.5, wpa: 0.02,
};

describe("ngs alignment schema", () => {
  it("accepts a well-formed 10 Hz play", () => {
    expect(validateAlignedPlay(good)).toEqual([]);
  });
  it("flags wrong entity counts and cadence breaks", () => {
    const bad = { ...good, frames: [{ frameId: 1, t: 0, entities: ents().slice(0, 10) }, { frameId: 2, t: 0.3, entities: ents() }] };
    const issues = validateAlignedPlay(bad);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
  it("flags empty frame lists", () => {
    expect(validateAlignedPlay({ ...good, frames: [] }).length).toBe(1);
  });
  it("wasserstein1 is 0 on identical samples", () => {
    expect(wasserstein1([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    expect(wasserstein1([], [1])).toBe(Infinity);
  });
  it("yardage gate uses the 0.5 threshold", () => {
    expect(yardageGatePasses([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(yardageGatePasses([100, 200], [1, 2])).toBe(false);
  });
  it("stays off until the W1 + calibration gates clear", () => {
    expect(GSE_NGS_SIM_ENABLED).toBe(false);
  });
});

