// Tests for decision/human-deferral.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  competenceMapAudit,
  deferralBudgetThreshold,
  aspestAcquisition,
  researchBudgetAllocate,
  updateRTilde,
  formatAbstentionCopy,
} from "./human-deferral.js";

describe("competenceMapAudit (1711.06664)", () => {
  it("flags subgroups the human systematically degrades", () => {
    const triples = Array.from({ length: 12 }, () => ({
      subgroup: "primetime-favorite",
      modelUnits: 0.5,
      editedUnits: -0.5,
    }));
    const { subgroupLift, deferLess } = competenceMapAudit(triples);
    expect(subgroupLift["primetime-favorite"]).toBeCloseTo(-1, 10);
    expect(deferLess).toContain("primetime-favorite");
  });
  it("flags high-noise subgroups for in-house handling", () => {
    const triples = Array.from({ length: 12 }, (_, i) => ({
      subgroup: "noisy",
      modelUnits: 0,
      editedUnits: i % 2 === 0 ? 0.5 : -0.5,
    }));
    const { keepInHouse } = competenceMapAudit(triples);
    expect(keepInHouse).toContain("noisy");
  });
  it("handles empty input", () => {
    const res = competenceMapAudit([]);
    expect(res.deferLess).toEqual([]);
    expect(res.keepInHouse).toEqual([]);
  });
});

describe("deferralBudgetThreshold (2112.06751)", () => {
  it("defers the lowest scores within the budget", () => {
    const { deferred, accuracy } = deferralBudgetThreshold(
      [0.9, 0.51, 0.8, 0.52],
      [true, false, true, false],
      0.5,
    );
    expect(deferred.filter(Boolean).length).toBe(2);
    expect(deferred[1]).toBe(true);
    expect(deferred[3]).toBe(true);
    expect(accuracy).toBeCloseTo(1, 10);
  });
  it("respects a zero budget", () => {
    const { deferred } = deferralBudgetThreshold([0.5], [true], 0);
    expect(deferred).toEqual([false]);
  });
  it("handles empty input", () => {
    expect(deferralBudgetThreshold([], [], 0.2).accuracy).toBe(0);
  });
});

describe("aspestAcquisition (2304.03870)", () => {
  it("prioritizes low margin, boosted by market disagreement", () => {
    const idx = aspestAcquisition(
      [
        { margin: 0.5, marketDisagrees: false },
        { margin: 0.4, marketDisagrees: true }, // key -0.6, top
        { margin: 0.1, marketDisagrees: false }, // key 0.1
      ],
      2,
    );
    expect(idx).toEqual([1, 2]);
  });
  it("respects the budget", () => {
    const idx = aspestAcquisition(
      [
        { margin: 0.1, marketDisagrees: false },
        { margin: 0.2, marketDisagrees: false },
      ],
      5,
    );
    expect(idx.length).toBe(2);
  });
});

describe("researchBudgetAllocate (1906.02179v2)", () => {
  it("greedily picks high uncertainty, low no-answer probability", () => {
    const idx = researchBudgetAllocate(
      [
        { uncertainty: 0.9, rTilde: 0.9 }, // score 0.09
        { uncertainty: 0.8, rTilde: 0.1 }, // score 0.72, top
        { uncertainty: 0.5, rTilde: 0.1 }, // score 0.45
      ],
      2,
    );
    expect(idx).toEqual([1, 2]);
  });
});

describe("updateRTilde", () => {
  it("moves toward 0 on answers and 1 on no-answers", () => {
    expect(updateRTilde(0.5, true, 0.5)).toBeCloseTo(0.25, 10);
    expect(updateRTilde(0.5, false, 0.5)).toBeCloseTo(0.75, 10);
  });
  it("stays in [0, 1]", () => {
    expect(updateRTilde(0, true, 2)).toBeGreaterThanOrEqual(0);
    expect(updateRTilde(1, false, 2)).toBeLessThanOrEqual(1);
  });
});

describe("formatAbstentionCopy (2508.07617)", () => {
  it("frames the pass as +EV, never a bare no-play", () => {
    const copy = formatAbstentionCopy("Chiefs vs Bills");
    expect(copy).toContain("Chiefs vs Bills");
    expect(copy).toContain("coin flip, not a fade");
  });
  it("supports the silent variant", () => {
    expect(formatAbstentionCopy("Chiefs vs Bills", "silent")).toBe("");
  });
});
