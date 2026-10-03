import { describe, it, expect } from "vitest";
import {
  auditCells,
  fitPatchesForFailures,
  applyPatches,
  runAuditAndPatch,
  type AuditSample,
} from "../calibration/multicalib-audit-patch.js";

/**
 * Group "A": score always 0.1 (the model's predicted probability), but the
 * observed label is 1 far more often than that — a systematic miscalibration
 * an aggregate reliability plot would hide if another group cancels it out.
 */
function badGroupA(n = 30, onesFraction = 25 / 30): AuditSample[] {
  const ones = Math.round(n * onesFraction);
  const out: AuditSample[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ score: 0.1, label: i < ones ? 1 : 0, group: "A" });
  }
  return out;
}

/** Group "B": score 0.5, exactly half the labels are 1 — well-calibrated. */
function goodGroupB(n = 30): AuditSample[] {
  const out: AuditSample[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ score: 0.5, label: i < n / 2 ? 1 : 0, group: "B" });
  }
  return out;
}

describe("auditCells", () => {
  it("returns an empty array for empty input", () => {
    expect(auditCells([])).toEqual([]);
  });

  it("flags a group with a systematic predicted-vs-observed gap as failed", () => {
    const cells = auditCells(badGroupA(), { bins: 1 });
    const aCell = cells.find((c) => c.group === "A")!;
    expect(aCell).toBeDefined();
    expect(aCell.failed).toBe(true);
    expect(aCell.gap).toBeGreaterThan(0.05);
    expect(aCell.meanPredicted).toBeCloseTo(0.1, 10);
  });

  it("does not flag a well-calibrated group", () => {
    const cells = auditCells(goodGroupB(), { bins: 1 });
    const bCell = cells.find((c) => c.group === "B")!;
    expect(bCell.failed).toBe(false);
    expect(bCell.gap).toBeCloseTo(0, 6);
  });

  it("never flags a cell below minSamples, however large the gap", () => {
    const cells = auditCells(badGroupA(5, 1), { bins: 1, minSamples: 20 });
    const aCell = cells.find((c) => c.group === "A")!;
    expect(aCell.sampleSize).toBe(5);
    expect(aCell.failed).toBe(false);
  });

  it("drops unusable samples (non-finite score, bad label, bad weight) rather than crashing", () => {
    const samples: AuditSample[] = [
      { score: NaN, label: 1, group: "A" },
      { score: 0.5, label: 1 as 0 | 1, group: "A" },
      { score: 0.5, label: 0, group: "A", weight: -1 },
      { score: 0.5, label: 1, group: "A", weight: 2 },
    ];
    expect(() => auditCells(samples)).not.toThrow();
  });

  it("output is sorted by group then bin index", () => {
    const cells = auditCells([...badGroupA(), ...goodGroupB()], { bins: 1 });
    const groups = cells.map((c) => c.group);
    expect(groups).toEqual([...groups].sort());
  });
});

describe("fitPatchesForFailures", () => {
  it("produces no patches when no cell failed", () => {
    const cells = auditCells(goodGroupB(), { bins: 1 });
    const patches = fitPatchesForFailures(goodGroupB(), cells, { bins: 1 });
    expect(patches.size).toBe(0);
  });

  it("produces a patch for each failed cell with enough samples", () => {
    const samples = badGroupA();
    const cells = auditCells(samples, { bins: 1 });
    const patches = fitPatchesForFailures(samples, cells, { bins: 1 });
    expect(patches.size).toBe(1);
    expect(patches.has("A#0")).toBe(true);
  });
});

describe("applyPatches", () => {
  it("returns the clamped base probability when there are no patches", () => {
    expect(applyPatches(0.42, 0.1, "A", [], new Map())).toBe(0.42);
  });

  it("returns the clamped base probability for an unknown group", () => {
    const samples = badGroupA();
    const cells = auditCells(samples, { bins: 1 });
    const patches = fitPatchesForFailures(samples, cells, { bins: 1 });
    expect(applyPatches(0.42, 0.1, "unknown-group", cells, patches)).toBe(0.42);
  });

  it("moves the base probability toward the observed rate for the failing group/score", () => {
    const samples = badGroupA();
    const cells = auditCells(samples, { bins: 1, patchLambda: 1 });
    const patches = fitPatchesForFailures(samples, cells, { bins: 1, patchLambda: 1 });
    const patched = applyPatches(0.1, 0.1, "A", cells, patches);
    // With patchLambda=1 (full correction) the patched value should sit much
    // closer to the observed ~0.83 than the naive predicted 0.1.
    expect(patched).toBeGreaterThan(0.5);
  });
});

describe("runAuditAndPatch", () => {
  it("converges and eliminates the failure when a group is systematically miscalibrated in isolation", () => {
    const result = runAuditAndPatch(badGroupA(), { bins: 1, patchLambda: 1 });
    expect(result.converged).toBe(true);
    expect(result.remainingFailures).toBe(0);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it("does nothing (0 iterations, converged) when every group is already calibrated", () => {
    const result = runAuditAndPatch(goodGroupB(), { bins: 1 });
    expect(result.iterations).toBe(0);
    expect(result.converged).toBe(true);
    expect(result.patches.size).toBe(0);
  });

  it("respects the maxIterations budget and reports non-convergence honestly rather than looping forever", () => {
    const result = runAuditAndPatch(badGroupA(), { bins: 1, maxIterations: 0 });
    expect(result.iterations).toBe(0);
    expect(result.converged).toBe(false);
    expect(result.remainingFailures).toBeGreaterThan(0);
  });

  it("handles a mix of a bad group and a good group without cross-contaminating either", () => {
    const result = runAuditAndPatch([...badGroupA(), ...goodGroupB()], { bins: 1, patchLambda: 1 });
    expect(result.converged).toBe(true);
    // Only group A should ever have been patched.
    for (const key of result.patches.keys()) {
      expect(key.startsWith("A#")).toBe(true);
    }
  });
});
