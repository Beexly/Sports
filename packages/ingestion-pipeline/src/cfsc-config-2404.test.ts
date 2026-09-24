import { describe, expect, it } from "vitest";
import { uniformCfsc, normalizeLambda, fuseCascade, cfscGatePasses } from "./cfsc-config-2404.js";

describe("cfsc config", () => {
  it("uniform config sums to 1", () => {
    const c = uniformCfsc(4);
    expect(c.lambdaV.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("normalizes arbitrary weights", () => {
    const c = normalizeLambda([2, 1, 1]);
    expect(c.lambdaV[0]).toBeCloseTo(0.5, 10);
    expect(c.lambdaV.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("fuses per-level logits as a convex combination", () => {
    const out = fuseCascade([[1, 0], [0, 1]], { lambdaV: [0.75, 0.25], levels: 2 });
    expect(out[0]).toBeCloseTo(0.75, 10);
    expect(out[1]).toBeCloseTo(0.25, 10);
    expect(fuseCascade([], { lambdaV: [], levels: 0 })).toEqual([]);
  });
  it("gate needs >=1.5pp lift and <=10% cost", () => {
    expect(cfscGatePasses(1.6, 0.05)).toBe(true);
    expect(cfscGatePasses(1.4, 0.05)).toBe(false);
    expect(cfscGatePasses(2.0, 0.2)).toBe(false);
  });
});

