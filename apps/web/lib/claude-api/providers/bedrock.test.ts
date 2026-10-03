import { describe, expect, it, vi } from "vitest";
import {
  bedrockConfig,
  isBedrockConfigured,
  isBedrockProviderSelected,
  resolveBedrockModelId,
  callBedrockClaudeMessages,
  BedrockConfigError,
  BedrockMessagesError,
} from "./bedrock";

const CREDS = {
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "AKIDEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
} as const;

const MAP = { BEDROCK_MODEL_MAP: JSON.stringify({ "claude-sonnet-4-6": "anthropic.claude-3-5-sonnet-20241022-v2:0" }) };

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("bedrockConfig / gating", () => {
  it("reads region + creds, and prefers AWS_BEDROCK_REGION over AWS_REGION", () => {
    expect(bedrockConfig({ ...CREDS })).toEqual({
      region: "us-east-1",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    });
    expect(bedrockConfig({ ...CREDS, AWS_BEDROCK_REGION: "us-west-2" })?.region).toBe("us-west-2");
  });

  it("returns null when any credential piece is missing", () => {
    expect(bedrockConfig({})).toBeNull();
    expect(bedrockConfig({ AWS_REGION: "us-east-1", AWS_ACCESS_KEY_ID: "x" })).toBeNull();
    expect(isBedrockConfigured({})).toBe(false);
    expect(isBedrockConfigured(CREDS)).toBe(true);
  });

  it("selects Bedrock only when the flag AND creds are both present", () => {
    expect(isBedrockProviderSelected({ ...CREDS })).toBe(false); // no flag
    expect(isBedrockProviderSelected({ CLAUDE_PROVIDER: "bedrock" })).toBe(false); // no creds
    expect(isBedrockProviderSelected({ ...CREDS, CLAUDE_PROVIDER: "bedrock" })).toBe(true);
    expect(isBedrockProviderSelected({ ...CREDS, CLAUDE_PROVIDER: "anthropic" })).toBe(false);
  });
});

describe("resolveBedrockModelId — no fabricated ids", () => {
  it("maps a known id from BEDROCK_MODEL_MAP", () => {
    expect(resolveBedrockModelId("claude-sonnet-4-6", MAP)).toBe(
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
    );
  });

  it("throws (never guesses) when the model is unmapped or the map is absent", () => {
    expect(() => resolveBedrockModelId("claude-opus-4-8", MAP)).toThrow(BedrockConfigError);
    expect(() => resolveBedrockModelId("claude-sonnet-4-6", {})).toThrow(BedrockConfigError);
  });

  it("throws on invalid JSON in the map", () => {
    expect(() => resolveBedrockModelId("claude-sonnet-4-6", { BEDROCK_MODEL_MAP: "{not json" })).toThrow(
      BedrockConfigError,
    );
  });
});

describe("callBedrockClaudeMessages", () => {
  const env = { ...CREDS, ...MAP };
  const baseReq = {
    anthropicModelId: "claude-sonnet-4-6",
    system: "You are a helpful assistant.",
    user: "Summarize the slate.",
    maxTokens: 256,
    now: new Date("2015-08-30T12:36:00Z"),
  };

  it("signs and posts InvokeModel with the percent-encoded model path and anthropic body", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ content: [{ type: "text", text: " picks ready " }], usage: { input_tokens: 12, output_tokens: 8 } }),
    );
    const result = await callBedrockClaudeMessages({ ...baseReq, fetchImpl: fetchImpl as unknown as typeof fetch }, env);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-3-5-sonnet-20241022-v2%3A0/invoke",
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\//);
    expect(headers["X-Amz-Date"]).toBe("20150830T123600Z");

    const sent = JSON.parse(init.body as string);
    expect(sent.anthropic_version).toBe("bedrock-2023-05-31");
    expect(sent).not.toHaveProperty("model"); // Bedrock carries the model in the URL, not the body
    expect(sent.max_tokens).toBe(256);
    expect(sent.system).toBe("You are a helpful assistant.");
    expect(sent.messages).toEqual([{ role: "user", content: "Summarize the slate." }]);

    // Result carries the Bedrock id so the cost ledger shows spend hit credits.
    expect(result.modelName).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    expect(result.text).toBe("picks ready");
    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(8);
  });

  it("wraps the system prompt as a cache_control block when cache.system is set", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ content: [{ type: "text", text: "ok" }], usage: {} }),
    );
    await callBedrockClaudeMessages(
      { ...baseReq, cache: { system: true }, fetchImpl: fetchImpl as unknown as typeof fetch },
      env,
    );
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.system).toEqual([
      { type: "text", text: "You are a helpful assistant.", cache_control: { type: "ephemeral" } },
    ]);
  });

  it("throws BedrockMessagesError on a non-OK response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "throttled" }, { ok: false, status: 429 }));
    await expect(
      callBedrockClaudeMessages({ ...baseReq, fetchImpl: fetchImpl as unknown as typeof fetch }, env),
    ).rejects.toBeInstanceOf(BedrockMessagesError);
  });

  it("throws BedrockConfigError when creds are absent", async () => {
    await expect(
      callBedrockClaudeMessages({ ...baseReq }, MAP),
    ).rejects.toBeInstanceOf(BedrockConfigError);
  });
});
