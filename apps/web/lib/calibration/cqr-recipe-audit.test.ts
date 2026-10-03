import { describe, it, expect } from "vitest";
import {
  auditFiniteSampleRank,
  auditNonconformityRecipe,
  auditFailClosedSmallN,
  auditCqrRecipe,
} from "@/lib/calibration/cqr-recipe-audit";

// ============================================================
// arXiv 1905.03222 — CQR recipe audit of the existing cqr.ts.
// Additive: verifies, never modifies, the existing module.
// ============================================================

describe("CQR recipe audit — 1905.03222", () => {
  it("finite-sample rank matches the paper's order statistic", () => {
    const scores = [3, 1, 2, 5, 4, 6, 7, 8, 9, 10];
    const check = auditFiniteSampleRank(scores, 0.1);
    expect(check.passed).toBe(true);
    // Independent hand computation: ceil(0.9*11)-1 = 9 -> sorted[9] = 10.
    expect(check.detail).toContain("10");
  });

  it("unclamped rank fail-closes to +Infinity", () => {
    const check = auditFiniteSampleRank([1, 2, 3], 0.1);
    expect(check.passed).toBe(true);
    expect(check.detail).toContain("+Infinity");
  });

  it("nonconformity recipe check passes", () => {
    expect(auditNonconformityRecipe(0.1).passed).toBe(true);
  });

  it("fail-closed small-n check passes", () => {
    expect(auditFailClosedSmallN(0.1).passed).toBe(true);
  });

  it("full audit passes: the existing cqr.ts already implements the recipe", () => {
    const report = auditCqrRecipe(0.1);
    expect(report.passed).toBe(true);
    expect(report.checks.length).toBe(3);
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });
});
