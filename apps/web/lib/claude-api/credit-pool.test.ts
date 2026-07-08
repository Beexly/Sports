import { describe, expect, it } from "vitest";
import { creditPoolForModel, rollupByCreditPool, CREDIT_POOL_META } from "./credit-pool";

describe("creditPoolForModel", () => {
  it("attributes Bedrock ids (incl. cross-region inference profiles) to AWS Activate", () => {
    expect(creditPoolForModel("anthropic.claude-3-5-sonnet-20241022-v2:0")).toBe("aws_activate");
    expect(creditPoolForModel("us.anthropic.claude-3-5-sonnet-20241022-v2:0")).toBe("aws_activate");
    expect(creditPoolForModel("eu.anthropic.claude-3-haiku-20240307-v1:0")).toBe("aws_activate");
    expect(creditPoolForModel("apac.anthropic.claude-3-sonnet-20240229-v1:0")).toBe("aws_activate");
  });

  it("attributes Vertex Model Garden ids (with @version) to the Vertex partner credit", () => {
    expect(creditPoolForModel("claude-3-5-sonnet-v2@20241022")).toBe("vertex_partner");
  });

  it("attributes plain claude-* ids to the direct Anthropic (cash) pool, and defaults unknowns there", () => {
    expect(creditPoolForModel("claude-sonnet-4-6")).toBe("anthropic_direct");
    expect(creditPoolForModel("claude-haiku-4-5-20251001")).toBe("anthropic_direct");
    expect(creditPoolForModel("something-unexpected")).toBe("anthropic_direct");
  });

  it("only the credit-eligible pools are flagged creditEligible", () => {
    expect(CREDIT_POOL_META.aws_activate.creditEligible).toBe(true);
    expect(CREDIT_POOL_META.vertex_partner.creditEligible).toBe(true);
    expect(CREDIT_POOL_META.anthropic_direct.creditEligible).toBe(false);
  });
});

describe("rollupByCreditPool", () => {
  it("groups spend by pool, coerces Decimal-like costs, and sorts by biggest burn first", () => {
    const rows = rollupByCreditPool([
      { modelName: "anthropic.claude-3-5-sonnet-20241022-v2:0", estimatedCostUsd: 1.5, inputTokens: 100, outputTokens: 50 },
      { modelName: "anthropic.claude-3-5-sonnet-20241022-v2:0", estimatedCostUsd: "0.5", inputTokens: 10, outputTokens: 5 },
      { modelName: "claude-sonnet-4-6", estimatedCostUsd: { toString: () => "3.25" }, inputTokens: 200, outputTokens: 80 },
      { modelName: "claude-3-5-sonnet-v2@20241022", estimatedCostUsd: 0.25 },
    ]);

    // anthropic_direct (3.25) > aws_activate (2.0) > vertex_partner (0.25)
    expect(rows.map((r) => r.pool)).toEqual(["anthropic_direct", "aws_activate", "vertex_partner"]);

    const aws = rows.find((r) => r.pool === "aws_activate")!;
    expect(aws.calls).toBe(2);
    expect(aws.estimatedCostUsd).toBe(2);
    expect(aws.inputTokens).toBe(110);
    expect(aws.outputTokens).toBe(55);
    expect(aws.creditEligible).toBe(true);

    const anthropic = rows.find((r) => r.pool === "anthropic_direct")!;
    expect(anthropic.estimatedCostUsd).toBe(3.25);
    expect(anthropic.creditEligible).toBe(false);
  });

  it("omits pools with no spend and returns [] for no records", () => {
    expect(rollupByCreditPool([])).toEqual([]);
    const onlyBedrock = rollupByCreditPool([
      { modelName: "anthropic.claude-3-5-sonnet-20241022-v2:0", estimatedCostUsd: 1 },
    ]);
    expect(onlyBedrock).toHaveLength(1);
    expect(onlyBedrock[0]?.pool).toBe("aws_activate");
  });

  it("ignores non-finite costs (coerces to 0) rather than propagating NaN", () => {
    const rows = rollupByCreditPool([
      { modelName: "claude-sonnet-4-6", estimatedCostUsd: "not-a-number", inputTokens: 5, outputTokens: 5 },
    ]);
    expect(rows[0]?.estimatedCostUsd).toBe(0);
  });
});
