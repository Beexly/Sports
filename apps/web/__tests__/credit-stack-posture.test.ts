import { describe, expect, it } from "vitest";
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";

describe("loadCreditStackPosture", () => {
  it("reports lanes off when env empty", () => {
    const p = loadCreditStackPosture({});
    expect(p.freeLaneConfigured).toBe(false);
    expect(p.bedrockConfigured).toBe(false);
    expect(p.vertexConfigured).toBe(false);
    expect(p.azureFoundryConfigured).toBe(false);
    expect(p.claudeProvider).toBe("anthropic");
    expect(p.jynx).toBeDefined();
    expect(p.jynx.mode).toBe("anthropic");
  });

  it("detects free-lane", () => {
    const p = loadCreditStackPosture({
      CONTENT_FREE_LANE_ENABLED: "true",
      CEREBRAS_API_KEY: "cb-x",
    });
    expect(p.freeLaneConfigured).toBe(true);
    expect(p.anyCreditLaneReady).toBe(true);
  });

  it("detects azure foundry configured", () => {
    const p = loadCreditStackPosture({
      CLAUDE_PROVIDER: "azure",
      AZURE_FOUNDRY_RESOURCE: "gse",
      AZURE_FOUNDRY_API_KEY: "k",
      AZURE_FOUNDRY_MODEL_MAP: '{"claude-sonnet-4-6":"claude-sonnet-4-6"}',
    });
    expect(p.claudeProvider).toBe("azure");
    expect(p.azureFoundryConfigured).toBe(true);
    expect(p.anyCreditLaneReady).toBe(true);
    expect(p.operatorHint).toMatch(/Azure Foundry/i);
  });

  it("detects bedrock configured + selected", () => {
    const p = loadCreditStackPosture({
      CLAUDE_PROVIDER: "bedrock",
      AWS_ACCESS_KEY_ID: "AKIA",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_BEDROCK_REGION: "us-east-1",
      BEDROCK_MODEL_MAP: '{"claude-sonnet-4-6":"anthropic.claude-x"}',
    });
    expect(p.claudeProvider).toBe("bedrock");
    expect(p.bedrockConfigured).toBe(true);
  });

  it("never embeds secrets", () => {
    const p = loadCreditStackPosture({
      AZURE_FOUNDRY_API_KEY: "super-secret-az",
      CEREBRAS_API_KEY: "super-secret-cb",
      CONTENT_FREE_LANE_ENABLED: "true",
      AZURE_FOUNDRY_RESOURCE: "r",
      AZURE_FOUNDRY_MODEL_MAP: "{}",
    });
    const json = JSON.stringify(p);
    expect(json).not.toContain("super-secret");
  });
});
