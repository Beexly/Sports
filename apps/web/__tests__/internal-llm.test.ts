import { describe, it, expect } from "vitest";
import {
  internalLlmConfig,
  isInternalLlmConfigured,
  callInternalLlm,
  InternalLlmError,
} from "@/lib/claude-api/internal-llm";

const ENV = { INTERNAL_LLM_BASE_URL: "https://api.groq.com/openai/v1/", INTERNAL_LLM_MODEL: "llama-3.3-70b-versatile", INTERNAL_LLM_API_KEY: "k" };

const okResponse = (content: string) =>
  ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }], usage: { prompt_tokens: 12, completion_tokens: 7 } }) }) as unknown as Response;

describe("internal-LLM tier", () => {
  it("is off by default (no behavior change until configured)", () => {
    expect(isInternalLlmConfigured({})).toBe(false);
    expect(internalLlmConfig({})).toBeNull();
    expect(internalLlmConfig({ INTERNAL_LLM_BASE_URL: "x" })).toBeNull(); // model required too
  });

  it("parses config and strips a trailing slash", () => {
    expect(internalLlmConfig(ENV)).toEqual({
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
      apiKey: "k",
    });
  });

  it("calls the OpenAI-compatible endpoint and returns normalized result", async () => {
    let capturedUrl = "";
    let capturedBody: { model: string; messages: { role: string; content: string }[] } = { model: "", messages: [] };
    const fetchImpl = (async (url: string, init: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init.body));
      return okResponse("CLASSIFIED: injury-news");
    }) as unknown as typeof fetch;

    const res = await callInternalLlm({ system: "classify", user: "text", maxTokens: 64, env: ENV, fetchImpl });
    expect(capturedUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(capturedBody.model).toBe("llama-3.3-70b-versatile");
    expect(capturedBody.messages[0]).toEqual({ role: "system", content: "classify" });
    expect(res.text).toBe("CLASSIFIED: injury-news");
    expect(res.inputTokens).toBe(12);
    expect(res.outputTokens).toBe(7);
  });

  it("throws when not configured", async () => {
    await expect(callInternalLlm({ system: "s", user: "u", maxTokens: 10, env: {} })).rejects.toBeInstanceOf(InternalLlmError);
  });

  it("throws on a non-200 from the endpoint", async () => {
    const fetchImpl = (async () => ({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as Response) as typeof fetch;
    await expect(callInternalLlm({ system: "s", user: "u", maxTokens: 10, env: ENV, fetchImpl })).rejects.toMatchObject({ status: 429 });
  });

  it("falls back to Alibaba DashScope Qwen credits when ALIBABA_API_KEY or DASHSCOPE_API_KEY is set", async () => {
    const aliCfg = internalLlmConfig({ ALIBABA_API_KEY: "ali-key" });
    expect(aliCfg).toEqual({
      baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      apiKey: "ali-key",
    });
    const dashCfg = internalLlmConfig({
      DASHSCOPE_API_KEY: "ds-key",
      ALIBABA_INTERNAL_MODEL: "qwen2.5-coder-32b-instruct",
    });
    expect(dashCfg?.model).toBe("qwen2.5-coder-32b-instruct");
    expect(isInternalLlmConfigured({ ALIBABA_API_KEY: "ali-key" })).toBe(true);
  });

  it("uses free Nous Portal qwen/qwen4-max:free promo when enabled and blocks PAYG models", () => {
    const cfg = internalLlmConfig({
      NOUS_API_KEY: "nous-test-key",
      NOUS_QWEN4_MAX_FREE_PROMO_ENABLED: "true",
      NOUS_MODEL: "qwen4-max",
    });
    expect(cfg).toEqual({
      baseUrl: "https://inference-api.nousresearch.com/v1",
      model: "qwen/qwen4-max:free",
      apiKey: "nous-test-key",
    });
    expect(
      internalLlmConfig({
        NOUS_API_KEY: "nous-test-key",
        NOUS_QWEN4_MAX_FREE_PROMO_ENABLED: "true",
        NOUS_MODEL: "nousresearch/hermes-4-405b",
      }),
    ).toBeNull();
  });
});
