import { describe, expect, it, vi } from "vitest";
import {
  callOpenAICompatible,
  OpenAICompatibleError,
} from "@/lib/claude-api/providers/openai-compatible";

const okResponse = () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: "  hello world  " } }],
      usage: { prompt_tokens: 12, completion_tokens: 7 },
    }),
    { status: 200 }
  );

describe("openai-compatible adapter", () => {
  it("POSTs to {baseUrl}/chat/completions in OpenAI format and maps the result", async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    const result = await callOpenAICompatible({
      baseUrl: "https://api.example.com/v1",
      model: "free-model",
      apiKey: "k",
      system: "S",
      user: "U",
      maxTokens: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]?.[0]).toBe("https://api.example.com/v1/chat/completions");
    const body = JSON.parse(calls[0]![1].body as string);
    expect(body.model).toBe("free-model");
    expect(body.messages).toEqual([
      { role: "system", content: "S" },
      { role: "user", content: "U" },
    ]);
    expect(result).toMatchObject({
      text: "hello world",
      modelName: "free-model",
      inputTokens: 12,
      outputTokens: 7,
    });
  });

  it("sends NO Authorization header when keyless (apiKey absent)", async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    await callOpenAICompatible({
      baseUrl: "https://text.pollinations.ai/openai",
      model: "openai",
      system: "S",
      user: "U",
      maxTokens: 50,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const headers = calls[0]![1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sends a bearer Authorization header when a key is present", async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    await callOpenAICompatible({
      baseUrl: "https://api.example.com/v1",
      model: "m",
      apiKey: "secret-key",
      system: "S",
      user: "U",
      maxTokens: 50,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const headers = calls[0]![1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer secret-key");
  });

  it("throws a typed OpenAICompatibleError on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    await expect(
      callOpenAICompatible({
        baseUrl: "https://api.example.com/v1",
        model: "m",
        system: "S",
        user: "U",
        maxTokens: 50,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(OpenAICompatibleError);
  });

  it("throws a typed error (not an empty reply) when the body has no text", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 })
    );
    await expect(
      callOpenAICompatible({
        baseUrl: "https://api.example.com/v1",
        model: "m",
        system: "S",
        user: "U",
        maxTokens: 50,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(OpenAICompatibleError);
  });

  it("surfaces a network/timeout failure as a typed error so the pool can fail over", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    });
    await expect(
      callOpenAICompatible({
        baseUrl: "https://api.example.com/v1",
        model: "m",
        system: "S",
        user: "U",
        maxTokens: 50,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(OpenAICompatibleError);
  });
});
