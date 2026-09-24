import { describe, expect, it } from "vitest";

import {
  collapseSubstitutes,
  correlationMatrix,
  forwardSelectCore,
  pearson,
  spearman,
  substitutePairs,
} from "@/lib/calibration/2608-25940v2-metric-redundancy-audit";

describe("metric redundancy audit", () => {
  it("spearman detects monotone substitutes", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(spearman(a, a.map((x) => x * 2 + 1))).toBeCloseTo(1, 10);
    expect(spearman(a, [...a].reverse())).toBeCloseTo(-1, 10);
    expect(Math.abs(pearson(a, a))).toBeCloseTo(1, 10);
  });

  it("finds substitute pairs above rho 0.8", () => {
    const base = Array.from({ length: 32 }, (_, i) => i);
    const dup = base.map((x) => x + (x % 3) * 0.01); // near-duplicate
    const indep = base.map((_, i) => (i * 7) % 32);
    const pairs = substitutePairs([base, dup, indep], ["epa", "epa_clone", "luck"], 0.8);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(pairs[0].a).toBe("epa");
    expect(pairs[0].b).toBe("epa_clone");
    const m = correlationMatrix([base, dup]);
    expect(m[0][1]).toBeGreaterThan(0.99);
  });

  it("collapsing substitutes removes the duplicate", () => {
    const kept = collapseSubstitutes(
      ["epa", "epa_clone", "luck"],
      [{ a: "epa", b: "epa_clone", rho: 0.99 }],
    );
    expect(kept).toEqual(["epa", "luck"]);
  });

  it("forward selection builds a <=6 metric core", () => {
    let s = 9;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const n = 32;
    const target = Array.from({ length: n }, () => rnd());
    const cols = [
      target.map((t) => t + rnd() * 0.1), // strong signal
      target.map((t) => t + rnd() * 0.5),
      Array.from({ length: n }, () => rnd()), // noise
      target.map((t) => -t + rnd() * 0.3),
    ];
    const { core, predictiveCorr } = forwardSelectCore(cols, ["m1", "m2", "m3", "m4"], target, 6);
    expect(core.length).toBeLessThanOrEqual(6);
    expect(core.length).toBeGreaterThan(0);
    expect(core[0]).toBe("m1"); // strongest signal picked first
    expect(predictiveCorr).toBeGreaterThan(0.8);
  });
});
