import { describe, expect, it } from "vitest";
import { loadCreditStackPosture } from "@/lib/ops/credit-stack-posture";

describe("loadCreditStackPosture", () => {
  it("reports all lanes off when env empty", () => {
    const p = loadCreditStackPosture({});
    expect(p.freeLaneConfigured).toBe(false);
    expect(p.bedrockConfigured).toBe(false);
    expect(p.vertexConfigured).toBe(false);
    expect(p.anyCreditLaneReady).toBe(false);
    expect(p.claudeProvider).toBe("anthropic");
    expect(p.operatorHint).toMatch(/No free\/credit lane/i);
  });

  it("detects free-lane when both flag and key set", () => {
    const p = loadCreditStackPosture({
      CONTENT_FREE_LANE_ENABLED: "true",
      CEREBRAS_API_KEY: "cb-x",
    });
    expect(p.freeLaneConfigured).toBe(true);
    expect(p.anyCreditLaneReady).toBe(true);
    expect(p.freeLaneSurfaces).toEqual(["brief", "content"]);
    expect(p.operatorHint).toMatch(/Cerebras free-lane ready/i);
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
    expect(p.anyCreditLaneReady).toBe(true);
    expect(p.operatorHint).toMatch(/Bedrock selected/i);
  });

  it("never embeds secret values", () => {
    const p = loadCreditStackPosture({
      CONTENT_FREE_LANE_ENABLED: "true",
      CEREBRAS_API_KEY: "super-secret-key",
      AWS_SECRET_ACCESS_KEY: "also-secret",
    });
    const json = JSON.stringify(p);
    expect(json).not.toContain("super-secret");
    expect(json).not.toContain("also-secret");
  });
});
