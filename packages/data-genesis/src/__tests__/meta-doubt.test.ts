import { describe, it, expect } from "vitest";
import { runMetaDoubt, DEFAULT_REQUIRED_DOUBT_CATEGORIES } from "../meta-doubt.js";
import { buildStructuredDoubt, type DoubtCaseInput } from "../doubt.js";
import { toSignalId } from "../brands.js";

const at = "2026-06-26T00:00:00.000Z";
const sid = toSignalId("test");

/** Non-blocking cases covering every required category (licensing + model_leakage mitigated). */
function fullCoverageCases(): DoubtCaseInput[] {
  return DEFAULT_REQUIRED_DOUBT_CATEGORIES.map((category) => ({
    category,
    severity: "low",
    claim: `doubt about ${category}`,
    evidence: "reviewed",
    ...(category === "licensing" || category === "model_leakage" ? { mitigation: "addressed" } : {}),
  }));
}

describe("MetaDoubt — did we doubt well enough?", () => {
  it("full coverage of required categories scores 1 and passes adversarial review", () => {
    const doubt = buildStructuredDoubt({ signalId: sid }, fullCoverageCases(), at);
    const report = runMetaDoubt({ signalId: sid, confidence: 0.55 }, doubt);
    expect(report.doubtCoverageScore).toBe(1);
    expect(report.missingDoubtCategories).toHaveLength(0);
    expect(report.adversarialReviewPassed).toBe(true);
    expect(report.metaDoubtApplied).toBe(true);
  });

  it("missing required categories lower the coverage score and list the gaps", () => {
    const doubt = buildStructuredDoubt(
      { signalId: sid },
      [{ category: "data_quality", severity: "low", claim: "c", evidence: "e" }],
      at,
    );
    const report = runMetaDoubt({ signalId: sid, confidence: 0.5 }, doubt);
    expect(report.doubtCoverageScore).toBeLessThan(1);
    expect(report.missingDoubtCategories).toContain("calibration");
    expect(report.adversarialReviewPassed).toBe(false);
  });

  it("high confidence with weak coverage trips the overconfidence flag", () => {
    const doubt = buildStructuredDoubt(
      { signalId: sid },
      [{ category: "data_quality", severity: "low", claim: "c", evidence: "e" }],
      at,
    );
    const report = runMetaDoubt({ signalId: sid, confidence: 0.95 }, doubt);
    expect(report.overconfidenceFlag).toBe(true);
    expect(report.adversarialReviewPassed).toBe(false);
    expect(report.unresolvedBlindSpots.some((s) => s.includes("high confidence"))).toBe(true);
  });

  it("an unresolved critical doubt fails adversarial review even at full coverage", () => {
    const cases = fullCoverageCases();
    cases[0] = { category: "data_quality", severity: "critical", claim: "c", evidence: "e" };
    const doubt = buildStructuredDoubt({ signalId: sid }, cases, at);
    const report = runMetaDoubt({ signalId: sid, confidence: 0.5 }, doubt);
    expect(report.adversarialReviewPassed).toBe(false);
    expect(report.unresolvedBlindSpots.some((s) => s.includes("critical"))).toBe(true);
  });
});
