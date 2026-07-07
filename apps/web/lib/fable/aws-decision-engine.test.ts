import { describe, expect, it } from "vitest";
import { evaluateAwsDecision } from "./aws-decision-engine";

describe("FABLE AWS decision engine", () => {
  it("allows a local docs-only change by default", () => {
    const decision = evaluateAwsDecision({ action: "local_docs" });

    expect(decision.allowed).toBe(true);
    expect(decision.allowedByDefault).toBe(true);
    expect(decision.actionTier).toBe("tier0_local_only");
  });

  it("allows an Amplify docs-only spike with local validation", () => {
    const decision = evaluateAwsDecision({ action: "amplify_preview", hasDryRunCommand: true });

    expect(decision.allowed).toBe(true);
    expect(decision.actionTier).toBe("tier1_local_validation");
  });

  it("blocks AWS deploys by default", () => {
    const decision = evaluateAwsDecision({ action: "deploy", mutatesAwsAccount: true });

    expect(decision.allowed).toBe(false);
    expect(decision.approvalRequired).toBe(true);
    expect(decision.blockers).toContain("AWS change requires owner approval.");
  });

  it("blocks paid Bedrock calls by default", () => {
    const decision = evaluateAwsDecision({ action: "paid_model_call", usesPaidService: true });

    expect(decision.allowed).toBe(false);
    expect(decision.costRisk).toBe("high");
    expect(decision.blockers).toContain("Paid AWS usage is blocked by default.");
  });

  it("blocks SageMaker training jobs by default", () => {
    const decision = evaluateAwsDecision({ action: "sagemaker_training", estimatedMonthlyCostUsd: 25 });

    expect(decision.allowed).toBe(false);
    expect(decision.actionTier).toBe("tier4_cost_impacting_change");
    expect(decision.requiredOwnerDecision).toBe(true);
  });

  it("allows read-only discovery only when profile and region are explicit", () => {
    const blocked = evaluateAwsDecision({ action: "read_only_discovery", userNeedClear: true });
    const allowed = evaluateAwsDecision({
      action: "read_only_discovery",
      awsProfile: "read-only",
      awsRegion: "us-east-1",
      hasDryRunCommand: true,
      userNeedClear: true,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.blockers).toContain("Read-only AWS discovery requires an explicit AWS profile.");
    expect(allowed.allowed).toBe(true);
  });

  it("requires approval, rollback, account, region, profile, and cost summary for destructive change", () => {
    const decision = evaluateAwsDecision({ action: "destructive_change", destructive: true });

    expect(decision.allowed).toBe(false);
    expect(decision.reversibility).toBe("destructive");
    expect(decision.requiredRollbackField).toBe(true);
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        "AWS change requires an account id.",
        "AWS change requires a profile.",
        "AWS change requires a region.",
        "AWS change requires a cost summary.",
        "AWS change requires a rollback plan.",
      ])
    );
  });

  it("blocks storage and partner-sharing recommendations when data rights are missing", () => {
    const decision = evaluateAwsDecision({
      action: "storage_or_partner_share",
      sharesPartnerData: true,
      storesDataInAws: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.dataRightsRisk).toBe("critical");
    expect(decision.blockers).toContain("AWS data storage requires known data rights.");
  });

  it("raises IAM risk on wildcard policy signals", () => {
    const decision = evaluateAwsDecision({
      action: "iam_change",
      iam: { wildcardActions: true, wildcardResources: true },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.iamRisk).toBe("high");
    expect(decision.blockers).toContain("IAM policy requires least-privilege review.");
  });

  it("marks production DNS changes as critical and blocked", () => {
    const decision = evaluateAwsDecision({ action: "dns_or_production_change", touchesDns: true });

    expect(decision.allowed).toBe(false);
    expect(decision.blastRadius).toBe("critical");
    expect(decision.blockers).toContain("Production or DNS change is critical and blocked by default.");
  });
});
