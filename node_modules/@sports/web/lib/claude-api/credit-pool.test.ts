import { describe, expect, it } from "vitest";
import { creditPoolForModel, rollupByCreditPool, CREDIT_POOL_META } from "./credit-pool";

describe("creditPoolForModel", () => {
  it("attributes Bedrock ids to AWS Activate", () => {
    expect(creditPoolForModel("anthropic.claude-3-5-sonnet-20241022-v2:0")).toBe("aws_activate");
    expect(creditPoolForModel("us.anthropic.claude-3-5-sonnet-20241022-v2:0")).toBe("aws_activate");
  });

  it("attributes Vertex @version ids to vertex_partner", () => {
    expect(creditPoolForModel("claude-3-5-sonnet-v2@20241022")).toBe("vertex_partner");
  });

  it("attributes azure-foundry/ prefix to azure_foundry", () => {
    expect(creditPoolForModel("azure-foundry/claude-sonnet-4-6")).toBe("azure_foundry");
  });

  it("attributes Cerebras free-lane ids to cerebras_free", () => {
    expect(creditPoolForModel("gpt-oss-120b")).toBe("cerebras_free");
  });

  it("attributes plain claude-* to anthropic_direct", () => {
    expect(creditPoolForModel("claude-sonnet-4-6")).toBe("anthropic_direct");
    expect(creditPoolForModel("something-unexpected")).toBe("anthropic_direct");
  });

  it("flags credit-eligible pools correctly", () => {
    expect(CREDIT_POOL_META.aws_activate.creditEligible).toBe(true);
    expect(CREDIT_POOL_META.vertex_partner.creditEligible).toBe(true);
    expect(CREDIT_POOL_META.azure_foundry.creditEligible).toBe(true);
    expect(CREDIT_POOL_META.cerebras_free.creditEligible).toBe(true);
    expect(CREDIT_POOL_META.anthropic_direct.creditEligible).toBe(false);
  });
});

describe("rollupByCreditPool", () => {
  it("groups spend by pool and sorts by biggest burn first", () => {
    const rows = rollupByCreditPool([
      { modelName: "anthropic.claude-x", estimatedCostUsd: 2, inputTokens: 10, outputTokens: 5 },
      { modelName: "claude-sonnet-4-6", estimatedCostUsd: 3, inputTokens: 20, outputTokens: 8 },
      { modelName: "azure-foundry/claude-sonnet-4-6", estimatedCostUsd: 1, inputTokens: 5, outputTokens: 2 },
      { modelName: "gpt-oss-120b", estimatedCostUsd: 0, inputTokens: 4, outputTokens: 1 },
    ]);
    expect(rows.map((r) => r.pool)).toEqual([
      "anthropic_direct",
      "aws_activate",
      "azure_foundry",
      "cerebras_free",
    ]);
  });

  it("returns [] for no records", () => {
    expect(rollupByCreditPool([])).toEqual([]);
  });
});
