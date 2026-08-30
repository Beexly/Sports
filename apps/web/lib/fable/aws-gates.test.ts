import { describe, expect, it } from "vitest";
import { validateAwsCostAndDeployGates } from "./aws-gates";

describe("FABLE AWS cost and deploy gates", () => {
  it("defaults all AWS actions off", () => {
    const validation = validateAwsCostAndDeployGates({ intent: "deploy", mutatesAwsAccount: true });

    expect(validation.allowed).toBe(false);
    expect(validation.experimentsAllowed).toBe(false);
    expect(validation.deployAllowed).toBe(false);
    expect(validation.paidResourcesAllowed).toBe(false);
    expect(validation.blockers).toEqual(
      expect.arrayContaining([
        "FABLE_AWS_ALLOW_EXPERIMENTS is not enabled.",
        "FABLE_AWS_ALLOW_DEPLOY is not enabled.",
      ])
    );
  });

  it("allows a zero-cost local experiment only when experiment gate is explicit", () => {
    const validation = validateAwsCostAndDeployGates(
      { intent: "experiment" },
      { FABLE_AWS_ALLOW_EXPERIMENTS: "true" }
    );

    expect(validation.allowed).toBe(true);
    expect(validation.blockers).toHaveLength(0);
  });

  it("blocks paid resource estimates above the configured cap", () => {
    const validation = validateAwsCostAndDeployGates(
      { estimatedMonthlyCostUsd: 75, intent: "paid_resource" },
      {
        FABLE_AWS_ALLOW_EXPERIMENTS: "true",
        FABLE_AWS_ALLOW_PAID_RESOURCES: "true",
        FABLE_AWS_MAX_MONTHLY_COST_USD: "25",
      }
    );

    expect(validation.allowed).toBe(false);
    expect(validation.blockers).toContain("Estimated monthly cost exceeds FABLE_AWS_MAX_MONTHLY_COST_USD.");
  });
});
