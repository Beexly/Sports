import { describe, expect, it } from "vitest";
import {
  cloudAttemptOrder,
  listConfiguredClouds,
  loadJynxPublicSnapshot,
  parseCloudOrder,
  planJynx,
} from "./jynx";

const BEDROCK = {
  AWS_ACCESS_KEY_ID: "AKIA",
  AWS_SECRET_ACCESS_KEY: "secret",
  AWS_BEDROCK_REGION: "us-east-1",
  BEDROCK_MODEL_MAP: '{"claude-sonnet-4-6":"anthropic.claude-x"}',
} as const;

const AZURE = {
  AZURE_FOUNDRY_RESOURCE: "gse",
  AZURE_FOUNDRY_API_KEY: "k",
  AZURE_FOUNDRY_MODEL_MAP: '{"claude-sonnet-4-6":"claude-sonnet-4-6"}',
} as const;

describe("Jynx planner", () => {
  it("defaults free-lane first for content when enabled", () => {
    const plan = planJynx(
      { surface: "content" },
      {
        CONTENT_FREE_LANE_ENABLED: "true",
        CEREBRAS_API_KEY: "cb",
        CLAUDE_PROVIDER: "bedrock",
        ...BEDROCK,
      },
    );
    expect(plan.primaryLane).toBe("cerebras_free");
    expect(plan.freeLaneWillTry).toBe(true);
    expect(plan.cloudAttempts[0]).toBe("bedrock");
    expect(plan.tier).toBe("sonnet");
  });

  it("auto mode tries configured clouds in order without free-lane", () => {
    const plan = planJynx(
      { surface: "studio" },
      {
        CLAUDE_PROVIDER: "auto",
        ...BEDROCK,
        ...AZURE,
      },
    );
    expect(plan.primaryLane).toBe("bedrock");
    expect(plan.cloudAttempts).toEqual(["bedrock", "azure"]);
    expect(plan.freeLaneWillTry).toBe(false);
  });

  it("forced azure still failovers to bedrock when failover on", () => {
    const order = cloudAttemptOrder({
      CLAUDE_PROVIDER: "azure",
      JYNX_CLOUD_FAILOVER: "true",
      ...BEDROCK,
      ...AZURE,
    });
    expect(order[0]).toBe("azure");
    expect(order).toContain("bedrock");
  });

  it("inert anthropic mode yields empty cloud attempts", () => {
    expect(cloudAttemptOrder({ ...BEDROCK })).toEqual([]);
    expect(planJynx({ surface: "studio" }, { ...BEDROCK }).primaryLane).toBe("anthropic_direct");
  });

  it("parses custom cloud order", () => {
    expect(parseCloudOrder({ JYNX_CLOUD_ORDER: "azure,vertex,bedrock" })[0]).toBe("azure");
  });

  it("public snapshot never embeds secrets", () => {
    const snap = loadJynxPublicSnapshot({
      CLAUDE_PROVIDER: "auto",
      CEREBRAS_API_KEY: "secret-key",
      CONTENT_FREE_LANE_ENABLED: "true",
      ...BEDROCK,
    });
    expect(JSON.stringify(snap)).not.toContain("secret-key");
    expect(snap.freeLaneEnabled).toBe(true);
    expect(snap.contentPlanPrimary).toBe("cerebras_free");
    expect(snap.configuredClouds).toContain("bedrock");
  });

  it("lists only fully config-shaped clouds", () => {
    expect(listConfiguredClouds(BEDROCK)).toEqual(["bedrock"]);
    expect(listConfiguredClouds({ ...BEDROCK, ...AZURE })).toEqual(["bedrock", "azure"]);
  });
});
