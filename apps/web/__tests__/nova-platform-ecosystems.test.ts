import { describe, expect, it } from "vitest";
import {
  AI_PLATFORM_OPPORTUNITIES,
  getAiPlatformOpportunity,
  summarizeAiPlatformEcosystem,
  validateAiPlatformEcosystem,
} from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-21T12:30:00-07:00");

describe("NOVA AI platform ecosystem map", () => {
  it("covers a broad platform economy with structurally valid evidence", () => {
    expect(AI_PLATFORM_OPPORTUNITIES.length).toBeGreaterThanOrEqual(20);
    expect(validateAiPlatformEcosystem()).toEqual([]);
  });

  it("separates ChatGPT distribution from native digital-app payment", () => {
    const opportunity = getAiPlatformOpportunity("openai-plugin-directory");
    expect(opportunity?.state).toBe("ANNOUNCED_LIMITED");
    expect(opportunity?.nativePaymentAvailable).toBe(false);
    expect(opportunity?.currentTruth).toMatch(/monetization details remain forthcoming/i);
  });

  it("recognizes Poe as a current direct bot-payment route", () => {
    const opportunity = getAiPlatformOpportunity("poe-creator-monetization");
    expect(opportunity?.state).toBe("LIVE_DIRECT_PAYOUT");
    expect(opportunity?.nativePaymentAvailable).toBe(true);
    expect(opportunity?.codingDeliverables).toContain("Poe server bot");
  });

  it("treats content licenses as negotiated rather than self-service", () => {
    expect(getAiPlatformOpportunity("openai-content-licensing")?.state).toBe("NEGOTIATED_ONLY");
    expect(getAiPlatformOpportunity("perplexity-publisher-program")?.state).toBe("NEGOTIATED_ONLY");
  });

  it("keeps model-provider revenue behind a proprietary model requirement", () => {
    const opportunity = getAiPlatformOpportunity("openrouter-provider");
    expect(opportunity?.blockers.join(" ")).toMatch(/proprietary model/i);
    expect(opportunity?.priority).toBe("WATCH");
  });

  it("surfaces current transactional agent, app, and data marketplaces", () => {
    for (const id of [
      "gemini-agent-marketplace",
      "microsoft-agent-marketplace",
      "aws-marketplace",
      "github-marketplace",
      "snowflake-native-app",
      "databricks-marketplace",
    ]) {
      expect(getAiPlatformOpportunity(id)?.state, id).toBe("LIVE_TRANSACTIONAL");
    }
  });

  it("keeps credits distinct from cash income", () => {
    for (const id of ["aws-activate-bedrock", "codex-open-source-fund", "together-startup-accelerator"]) {
      const opportunity = getAiPlatformOpportunity(id)!;
      expect(opportunity.valueTypes).toContain("CREDITS");
      expect(opportunity.nativePaymentAvailable).toBe(false);
    }
  });

  it("marks Build Week as an urgent owner-controlled deadline", () => {
    const summary = summarizeAiPlatformEcosystem(AI_PLATFORM_OPPORTUNITIES, NOW);
    const challenge = getAiPlatformOpportunity("openai-build-week-2026");
    expect(summary.urgent).toBeGreaterThanOrEqual(1);
    expect(challenge?.priority).toBe("P0");
    expect(challenge?.ownerActions).toEqual(expect.arrayContaining([
      "Run the qualifying work in Codex and capture /feedback session ID",
      "Record and publish the demo video",
    ]));
  });
});
