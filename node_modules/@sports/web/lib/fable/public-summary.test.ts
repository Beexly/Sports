import { describe, expect, it } from "vitest";
import { loadFablePublicSummary } from "./public-summary";

describe("FABLE public summary", () => {
  it("summarizes the checked-in claim ledger and source registry", () => {
    const summary = loadFablePublicSummary();
    const countedClaims = summary.claimStatusCounts.reduce((total, row) => total + row.count, 0);
    const countedSources = summary.sourceRiskCounts.reduce((total, row) => total + row.count, 0);

    expect(summary.claimCount).toBeGreaterThan(0);
    expect(countedClaims).toBe(summary.claimCount);
    expect(summary.highRiskClaimCount).toBeGreaterThan(0);
    expect(summary.guardedClaimCount).toBeGreaterThan(0);
    expect(summary.sourceCount).toBeGreaterThan(0);
    expect(countedSources).toBe(summary.sourceCount);
  });

  it("keeps public AWS claims grounded in blocked-by-default gates", () => {
    const summary = loadFablePublicSummary();

    expect(summary.evidenceValidationOk).toBe(true);
    expect(summary.validationIssueCount).toBe(0);
    expect(summary.awsDeployDefaultAllowed).toBe(false);
    expect(summary.awsPaidDefaultAllowed).toBe(false);
    expect(summary.awsDecisionDefaultAllowed).toBe(false);
  });

  it("exposes only fixture-demo output for the public forensic snapshot", () => {
    const summary = loadFablePublicSummary();

    expect(summary.forensicDemo.fixture_id).toBe("fixture-nfl-public-001");
    expect(summary.forensicDemo.uncertainty_flag).toBe(true);
    expect(summary.forensicDemo.would_not_claim).toContain("betting edge");
  });
});
