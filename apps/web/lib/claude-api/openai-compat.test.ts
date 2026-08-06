import { describe, expect, it, vi } from "vitest";
import { callOpenAiCompatMessages } from "./openai-compat";
import { freeContentCandidates, RECOMMENDED_SECONDARY_FREE_MODELS } from "./open-weight-catalog";
import { secondaryFreeLaneConfig } from "./free-lane";
import { isFreeLaneEnabled } from "./free-lane-policy";
import { creditPoolForModel } from "./credit-pool";

describe("open-weight free map", () => {
  it("catalog has free content candidates including gemma/nemotron/gpt-oss", () => {
    const ids = freeContentCandidates().map((e) => e.id).join(" ");
    expect(ids).toMatch(/gemma/);
    expect(ids).toMatch(/nemotron/);
    expect(ids).toMatch(/gpt-oss/);
    expect(RECOMMENDED_SECONDARY_FREE_MODELS.length).toBeGreaterThan(2);
  });

  it("enables free-lane with secondary host only (no Cerebras)", () => {
    expect(
      isFreeLaneEnabled({
        CONTENT_FREE_LANE_ENABLED: "true",
        FREE_LANE_SECONDARY_BASE_URL: "https://api.example.com/v1",
        FREE_LANE_SECONDARY_MODEL: "gemma-4-31b",
      }),
    ).toBe(true);
    expect(isFreeLaneEnabled({ CONTENT_FREE_LANE_ENABLED: "true" })).toBe(false);
  });

  it("secondary config is null without enable flag", () => {
    expect(
      secondaryFreeLaneConfig({
        FREE_LANE_SECONDARY_BASE_URL: "https://x/v1",
        FREE_LANE_SECONDARY_MODEL: "m",
      }),
    ).toBeNull();
  });

  it("openai-compat prefixes ledger model for free pool", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "hello free" } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
    }));
    const result = await callOpenAiCompatMessages({
      baseUrl: "https://api.example.com/v1",
      model: "gemma-4-31b",
      system: "s",
      user: "u",
      maxTokens: 16,
      ledgerPrefix: "free-secondary/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.text).toBe("hello free");
    expect(result.modelName).toBe("free-secondary/gemma-4-31b");
    expect(creditPoolForModel(result.modelName)).toBe("cerebras_free");
  });
});
