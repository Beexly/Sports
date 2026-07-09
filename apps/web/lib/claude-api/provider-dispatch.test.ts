import { describe, expect, it, vi } from "vitest";
import { callClaude, resolveAnthropicModelId } from "./provider-dispatch";
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
