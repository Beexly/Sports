import { describe, it, expect, vi } from "vitest";
import {
  internalLlmConfig,
  isInternalLlmConfigured,
  callInternalLlm,
  InternalLlmError,
} from "./internal-llm";

// ─── config helpers ──────────────────────────────────────────────────────────

describe("internalLlmConfig", () => {
  it("returns null when no env vars are set", () => {
    expect(internalLlmConfig({})).toBeNull();
  });

  it("returns null when only BASE_URL is set", () => {
    expect(internalLlmConfig({ INTERNAL_LLM_BASE_URL: "http://localhost:11434/v1" })).toBeNull();
  });

  it("returns null when only MODEL is set", () => {
    expect(internalLlmConfig({ INTERNAL_LLM_MODEL: "llama3.2" })).toBeNull();
  });

  it("returns config with both required vars", () => {
    const cfg = internalLlmConfig({
      INTERNAL_LLM_BASE_URL: "http://localhost:11434/v1",
      INTERNAL_LLM_MODEL: "llama3.2",
    });
    expect(cfg).not.toBeNull();
    expect(cfg!.baseUrl).toBe("http://localhost:11434/v1");
    expect(cfg!.model).toBe("llama3.2");
    expect(cfg!.apiKey).toBeUndefined();
  });

  it("strips trailing slash from baseUrl", () => {
    const cfg = internalLlmConfig({
      INTERNAL_LLM_BASE_URL: "https://api.groq.com/openai/v1/",
      INTERNAL_LLM_MODEL: "llama-3.3-70b-versatile",
    });
    expect(cfg!.baseUrl).toBe("https://api.groq.com/openai/v1");
  });

  it("includes apiKey when provided", () => {
    const cfg = internalLlmConfig({
      INTERNAL_LLM_BASE_URL: "https://api.groq.com/openai/v1",
      INTERNAL_LLM_MODEL: "llama-3.3-70b-versatile",
      INTERNAL_LLM_API_KEY: "gsk_test_key",
    });
    expect(cfg!.apiKey).toBe("gsk_test_key");
  });

  it("omits apiKey when empty string", () => {
    const cfg = internalLlmConfig({
      INTERNAL_LLM_BASE_URL: "http://localhost:11434/v1",
      INTERNAL_LLM_MODEL: "llama3.2",
      INTERNAL_LLM_API_KEY: "  ",
    });
    expect(cfg!.apiKey).toBeUndefined();
  });
});

describe("isInternalLlmConfigured", () => {
  it("returns false with no env", () => {
    expect(isInternalLlmConfigured({})).toBe(false);
  });

  it("returns true when both required vars are present", () => {
    expect(
      isInternalLlmConfigured({
        INTERNAL_LLM_BASE_URL: "http://localhost:11434/v1",
        INTERNAL_LLM_MODEL: "llama3.2",
      })
    ).toBe(true);
  });
});

// ─── callInternalLlm ─────────────────────────────────────────────────────────

const BASE_ENV = {
  INTERNAL_LLM_BASE_URL: "http://fake-llm.test/v1",
  INTERNAL_LLM_MODEL: "test-model",
};

function makeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("callInternalLlm", () => {
  it("throws InternalLlmError when not configured", async () => {
    await expect(
      callInternalLlm({
        system: "sys",
        user: "prompt",
        maxTokens: 100,
        env: {},
        fetchImpl: makeFetch(200, {}),
      })
    ).rejects.toThrow(InternalLlmError);
  });

  it("calls the correct endpoint with Authorization header when apiKey provided", async () => {
    const mockFetch = makeFetch(200, {
      choices: [{ message: { content: "hello" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });

    await callInternalLlm({
      system: "sys",
      user: "prompt",
      maxTokens: 50,
      env: { ...BASE_ENV, INTERNAL_LLM_API_KEY: "gsk_test" },
      fetchImpl: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://fake-llm.test/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer gsk_test");
  });

  it("does NOT include Authorization when no apiKey", async () => {
    const mockFetch = makeFetch(200, {
      choices: [{ message: { content: "result" } }],
      usage: { prompt_tokens: 5, completion_tokens: 3 },
    });

    await callInternalLlm({
      system: "sys",
      user: "prompt",
      maxTokens: 50,
      env: BASE_ENV,
      fetchImpl: mockFetch,
    });

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("returns structured result on success", async () => {
    const result = await callInternalLlm({
      system: "classify",
      user: "is this spam?",
      maxTokens: 10,
      env: BASE_ENV,
      fetchImpl: makeFetch(200, {
        choices: [{ message: { content: "  not spam  " } }],
        usage: { prompt_tokens: 8, completion_tokens: 2 },
      }),
    });

    expect(result.text).toBe("not spam"); // trimmed
    expect(result.model).toBe("test-model");
    expect(result.inputTokens).toBe(8);
    expect(result.outputTokens).toBe(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("uses model override when provided", async () => {
    const mockFetch = makeFetch(200, {
      choices: [{ message: { content: "ok" } }],
      usage: {},
    });

    await callInternalLlm({
      system: "s",
      user: "u",
      maxTokens: 10,
      model: "tiny-model",
      env: BASE_ENV,
      fetchImpl: mockFetch,
    });

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string) as { model: string };
    expect(body.model).toBe("tiny-model");
  });

  it("throws InternalLlmError on non-2xx status", async () => {
    await expect(
      callInternalLlm({
        system: "s",
        user: "u",
        maxTokens: 10,
        env: BASE_ENV,
        fetchImpl: makeFetch(429, "rate limited"),
      })
    ).rejects.toMatchObject({ status: 429 });
  });

  it("throws InternalLlmError when choices is empty", async () => {
    await expect(
      callInternalLlm({
        system: "s",
        user: "u",
        maxTokens: 10,
        env: BASE_ENV,
        fetchImpl: makeFetch(200, { choices: [] }),
      })
    ).rejects.toThrow(InternalLlmError);
  });

  it("throws InternalLlmError when content is null/empty", async () => {
    await expect(
      callInternalLlm({
        system: "s",
        user: "u",
        maxTokens: 10,
        env: BASE_ENV,
        fetchImpl: makeFetch(200, { choices: [{ message: { content: "" } }] }),
      })
    ).rejects.toThrow(InternalLlmError);
  });
});
