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

  it("reports auto as auto (not unknown) when CLAUDE_PROVIDER=auto", () => {
    const p = loadCreditStackPosture({ CLAUDE_PROVIDER: "auto" });
    expect(p.claudeProvider).toBe("auto");
    expect(p.jynx.mode).toBe("auto");
    expect(p.jynx.auto).toBe(true);
  });

  it("reports auto when JYNX_MODE=auto with CLAUDE_PROVIDER unset", () => {
    const p = loadCreditStackPosture({ JYNX_MODE: "auto" });
    expect(p.claudeProvider).toBe("auto");
    expect(p.jynx.auto).toBe(true);
  });

  it("auto + configured cloud routes credits and says so", () => {
    const p = loadCreditStackPosture({
      CLAUDE_PROVIDER: "auto",
      AWS_ACCESS_KEY_ID: "AKIA",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_BEDROCK_REGION: "us-east-1",
      BEDROCK_MODEL_MAP: '{"claude-sonnet-4-6":"anthropic.claude-x"}',
    });
    expect(p.claudeProvider).toBe("auto");
    expect(p.bedrockConfigured).toBe(true);
    expect(p.anyCreditLaneReady).toBe(true);
    expect(p.jynx.attemptOrder).toEqual(["bedrock"]);
    // Must NOT claim the provider is unselected — auto IS a selection.
    expect(p.operatorHint).not.toMatch(/not selected/i);
    expect(p.operatorHint).toMatch(/bedrock/i);
  });

  it("auto with no cloud configured is honest that cash is still the path", () => {
    const p = loadCreditStackPosture({ CLAUDE_PROVIDER: "auto" });
    expect(p.claudeProvider).toBe("auto");
    expect(p.jynx.attemptOrder).toEqual([]);
    expect(p.jynx.contentPlanPrimary).toBe("anthropic_direct");
    expect(p.operatorHint).toMatch(/no cloud/i);
  });

  it("free-lane + auto + cloud reports the full $0 posture", () => {
    const p = loadCreditStackPosture({
      CONTENT_FREE_LANE_ENABLED: "true",
      CEREBRAS_API_KEY: "cb-x",
      CLAUDE_PROVIDER: "auto",
      AZURE_FOUNDRY_RESOURCE: "gse",
      AZURE_FOUNDRY_API_KEY: "k",
      AZURE_FOUNDRY_MODEL_MAP: '{"claude-sonnet-4-6":"claude-sonnet-4-6"}',
    });
    expect(p.freeLaneConfigured).toBe(true);
    expect(p.claudeProvider).toBe("auto");
    expect(p.anyCreditLaneReady).toBe(true);
    expect(p.jynx.attemptOrder).toEqual(["azure"]);
    expect(p.jynx.contentPlanPrimary).toBe("cerebras_free");
    expect(p.operatorHint).toMatch(/free-lane/i);
  });

  it("secondary free-lane host counts as configured without Cerebras", () => {
    const p = loadCreditStackPosture({
      CONTENT_FREE_LANE_ENABLED: "true",
      FREE_LANE_SECONDARY_BASE_URL: "https://api.groq.com/openai/v1",
      FREE_LANE_SECONDARY_MODEL: "llama-3.3-70b-versatile",
    });
    expect(p.freeLaneConfigured).toBe(true);
    expect(p.anyCreditLaneReady).toBe(true);
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
