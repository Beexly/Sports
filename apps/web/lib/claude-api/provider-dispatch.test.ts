import { describe, expect, it, vi } from "vitest";
import { callClaude, resolveAnthropicModelId } from "./provider-dispatch";
import { CostPolicyBlockedError, CostPolicyConfigError, resolveLlmCostMode } from "./cost-policy";
import type { LlmDispatchRecord } from "./cost-policy";
import type { ClaudeMessagesRequest } from "./messages";

const CREDS = {
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "AKIDEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  BEDROCK_MODEL_MAP: JSON.stringify({ "claude-sonnet-4-6": "anthropic.claude-3-5-sonnet-20241022-v2:0" }),
  CLAUDE_PROVIDER: "bedrock",
} as const;

function anthropicResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text: "anthropic-direct" }], usage: { input_tokens: 1, output_tokens: 1 } }),
    text: async () => "",
  } as unknown as Response;
}
function bedrockResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text: "via-bedrock" }], usage: { input_tokens: 2, output_tokens: 2 } }),
    text: async () => "",
  } as unknown as Response;
}

const baseReq = (fetchImpl: typeof fetch): ClaudeMessagesRequest => ({
  apiKey: "sk-ant-test",
  system: "S",
  user: "U",
  maxTokens: 128,
  model: "claude-sonnet-4-6",
  fetchImpl,
});

describe("resolveAnthropicModelId", () => {
  it("prefers explicit model, then surface, then default sonnet", () => {
    expect(resolveAnthropicModelId({ apiKey: "", system: "", user: "", maxTokens: 1, model: "claude-opus-4-8" })).toBe(
      "claude-opus-4-8",
    );
    expect(resolveAnthropicModelId({ apiKey: "", system: "", user: "", maxTokens: 1, surface: "brief" })).toBe(
      "claude-haiku-4-5-20251001",
    );
    expect(resolveAnthropicModelId({ apiKey: "", system: "", user: "", maxTokens: 1 })).toBe("claude-sonnet-4-6");
  });
});

describe("callClaude — provider routing", () => {
  it("defaults to the direct Anthropic API when no provider is selected (byte-identical)", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await callClaude(baseReq(fetchImpl as unknown as typeof fetch), {});
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(result.text).toBe("anthropic-direct");
  });

  it("routes to Bedrock when CLAUDE_PROVIDER=bedrock and creds are present", async () => {
    const fetchImpl = vi.fn(async () => bedrockResponse());
    const result = await callClaude(baseReq(fetchImpl as unknown as typeof fetch), CREDS);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toContain("bedrock-runtime.us-east-1.amazonaws.com");
    expect(result.text).toBe("via-bedrock");
    expect(result.modelName).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
  });

  it("falls back to Anthropic when Bedrock is selected but the model map is missing (config error)", async () => {
    // First call would be Bedrock resolution (throws BedrockConfigError before fetch);
    // dispatcher must then call Anthropic. Only the Anthropic fetch should fire.
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const envNoMap = { ...CREDS, BEDROCK_MODEL_MAP: "" };
    const result = await callClaude(baseReq(fetchImpl as unknown as typeof fetch), envNoMap);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(result.text).toBe("anthropic-direct");
  });

  it("stays on Anthropic when CLAUDE_PROVIDER=vertex but Vertex is not configured", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await callClaude(baseReq(fetchImpl as unknown as typeof fetch), { CLAUDE_PROVIDER: "vertex" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(result.text).toBe("anthropic-direct");
  });

  it("falls back to Anthropic when the Bedrock API errors at runtime", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => "boom" }) as unknown as Response)
      .mockImplementationOnce(async () => anthropicResponse());
    const result = await callClaude(baseReq(fetchImpl as unknown as typeof fetch), CREDS);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect((fetchImpl.mock.calls[1] as unknown as [string])[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(result.text).toBe("anthropic-direct");
  });
});

describe("resolveLlmCostMode", () => {
  it("defaults to normal and accepts aliases", () => {
    expect(resolveLlmCostMode({})).toBe("normal");
    expect(resolveLlmCostMode({ LLM_COST_MODE: "credits-only" })).toBe("credits-only");
    expect(resolveLlmCostMode({ LLM_COST_MODE: "credits_only" })).toBe("credits-only");
    expect(resolveLlmCostMode({ LLM_COST_MODE: "ZERO_CASH" })).toBe("zero-cash");
  });

  it("throws on unrecognized values instead of silently enabling cash billing", () => {
    expect(() => resolveLlmCostMode({ LLM_COST_MODE: "free-please" })).toThrow(CostPolicyConfigError);
  });
});

describe("callClaude — cost policy enforcement", () => {
  it("credits-only: Bedrock success routes normally and records the aws_activate pool", async () => {
    const fetchImpl = vi.fn(async () => bedrockResponse());
    const records: LlmDispatchRecord[] = [];
    const result = await callClaude(
      baseReq(fetchImpl as unknown as typeof fetch),
      { ...CREDS, LLM_COST_MODE: "credits-only" },
      { onDispatch: (r) => records.push(r) },
    );
    expect(result.text).toBe("via-bedrock");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      costMode: "credits-only",
      providerRequested: "bedrock",
      providerUsed: "bedrock",
      billingPool: "aws_activate",
      fallbackReason: null,
    });
  });

  it("credits-only: a Bedrock runtime failure FAILS CLOSED — no billable Anthropic call is made", async () => {
    const fetchImpl = vi.fn(
      async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => "boom" }) as unknown as Response,
    );
    const records: LlmDispatchRecord[] = [];
    await expect(
      callClaude(
        baseReq(fetchImpl as unknown as typeof fetch),
        { ...CREDS, LLM_COST_MODE: "credits-only" },
        { onDispatch: (r) => records.push(r) },
      ),
    ).rejects.toThrow(CostPolicyBlockedError);
    // Only the (failed) Bedrock fetch fired — the Anthropic endpoint was never touched.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toContain("bedrock-runtime");
    expect(records[0]).toMatchObject({ providerUsed: "blocked", billingPool: "blocked" });
    expect(records[0]?.fallbackReason).toContain("bedrock");
  });

  it("zero-cash: with no credit provider selected, the call is blocked before any fetch", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    await expect(
      callClaude(baseReq(fetchImpl as unknown as typeof fetch), { LLM_COST_MODE: "zero-cash" }),
    ).rejects.toThrow(CostPolicyBlockedError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normal: fallback still works and the dispatch record captures the fallback reason", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => "boom" }) as unknown as Response)
      .mockImplementationOnce(async () => anthropicResponse());
    const records: LlmDispatchRecord[] = [];
    const result = await callClaude(
      baseReq(fetchImpl as unknown as typeof fetch),
      { ...CREDS, LLM_COST_MODE: "normal" },
      { onDispatch: (r) => records.push(r) },
    );
    expect(result.text).toBe("anthropic-direct");
    expect(records[0]).toMatchObject({ providerUsed: "anthropic", billingPool: "anthropic_direct" });
    expect(records[0]?.fallbackReason).toContain("bedrock");
  });

  it("emits a dispatch record even when the direct Anthropic call itself throws", async () => {
    // Bedrock fails (config error, no fetch), then the Anthropic fallback ALSO fails —
    // a caller catching the thrown ClaudeMessagesError must still see a dispatch record,
    // not lose it because the final call errored after passing the emit() point.
    const fetchImpl = vi.fn(
      async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => "anthropic down" }) as unknown as Response,
    );
    const envNoMap = { ...CREDS, BEDROCK_MODEL_MAP: "" };
    const records: LlmDispatchRecord[] = [];
    await expect(
      callClaude(baseReq(fetchImpl as unknown as typeof fetch), envNoMap, { onDispatch: (r) => records.push(r) }),
    ).rejects.toThrow();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ providerUsed: "anthropic", billingPool: "anthropic_direct" });
  });
});
