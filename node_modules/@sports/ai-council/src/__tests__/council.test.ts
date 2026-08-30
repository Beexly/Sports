import { describe, expect, it } from "vitest";
import {
  ATTACK_CORPUS,
  FTC_CIVIL_PENALTY_MAX_2025,
  FTC_PENALTY_EXAMPLES,
  LIVE_PRODUCT_CORPUS,
  NAD_COMPARATIVE_STANDARDS,
  assessComparativeClaim,
  buildCouncilSeats,
  formatDestroyReport,
  ftcPenaltyBrief,
  remediationPlan,
  runCouncilCi,
  runDestroyPass,
} from "../index";

describe("AI Council", () => {
  it("has 10 seats", () => {
    expect(buildCouncilSeats()).toHaveLength(10);
  });

  it("DESTROYs attack corpus with CRITICAL ship-blockers", () => {
    const r = runDestroyPass(ATTACK_CORPUS);
    expect(r.counts.CRITICAL).toBeGreaterThanOrEqual(8);
    expect(r.shipBlocked).toBe(true);
    expect(r.criticalHigh.some((f) => f.seat === "crypto_honesty")).toBe(true);
    expect(r.criticalHigh.some((f) => f.seat === "endorsement_predator")).toBe(
      true,
    );
    expect(r.criticalHigh.some((f) => f.seat === "classification_auditor")).toBe(
      true,
    );
  });

  it("passes CI on live product corpus after remediation language", () => {
    const ci = runCouncilCi(LIVE_PRODUCT_CORPUS);
    expect(ci.ok).toBe(true);
    expect(ci.exitCode).toBe(0);
  });

  it("flags more-stats-than-anyone as comparative", () => {
    const a = assessComparativeClaim(
      "More stats than anyone else in the world",
    );
    expect(a.requireStudy || a.hardRefuse).toBe(true);
    expect(a.hits.some((h) => h.id === "more_than_anyone")).toBe(true);
  });

  it("documents FTC penalty max and examples", () => {
    expect(FTC_CIVIL_PENALTY_MAX_2025).toBe(53088);
    expect(FTC_PENALTY_EXAMPLES.length).toBeGreaterThanOrEqual(6);
    expect(ftcPenaltyBrief().neverDo.length).toBeGreaterThan(0);
  });

  it("has NAD comparative standards library", () => {
    expect(NAD_COMPARATIVE_STANDARDS.length).toBeGreaterThanOrEqual(6);
  });

  it("formats destroy report and remediation plan", () => {
    const r = runDestroyPass(ATTACK_CORPUS);
    const text = formatDestroyReport(r);
    expect(text).toContain("DESTROY REPORT");
    expect(remediationPlan(r).actions.length).toBeGreaterThan(0);
  });
});
