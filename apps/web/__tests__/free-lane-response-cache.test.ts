import { describe, expect, it, vi } from "vitest";
import {
  generateContentMessages,
  type ContentMessagesRequest,
} from "@/lib/claude-api/free-lane";
import {
  createMemoryResponseCacheStore,
  type ResponseCacheStore,
} from "@/lib/claude-api/response-cache";

const anthropicResponse = () =>
  new Response(
    JSON.stringify({
      content: [{ type: "text", text: "Anthropic text" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200 },
  );

const base = {
  apiKey: "test-key",
  system: "S",
  user: "U",
  maxTokens: 100,
  surface: "brief",
} as const;

const cacheOn = { LLM_RESPONSE_CACHE_ENABLED: "true" } as const;

describe("free-lane response cache integration", () => {
  it("is byte-identical to the un-cached path when no env or store is supplied", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await generateContentMessages({ ...base, fetchImpl }, {});

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      text: "Anthropic text",
      modelName: "claude-haiku-4-5-20251001",
      inputTokens: 10,
      outputTokens: 5,
      durationMs: expect.any(Number),
    });
  });

  it("serves an identical eligible request from the store on the second call", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const cacheStore = createMemoryResponseCacheStore();
    const request: ContentMessagesRequest = { ...base, fetchImpl, cacheStore };

    const first = await generateContentMessages(request, cacheOn);
    const second = await generateContentMessages(request, cacheOn);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(first.text).toBe("Anthropic text");
    expect(second.text).toBe(first.text);

    expect(second.inputTokens).toBe(first.inputTokens);
    expect(second.outputTokens).toBe(first.outputTokens);
  });

  it("does not cache a non-cacheable surface", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const cacheStore = createMemoryResponseCacheStore();
    const request: ContentMessagesRequest = { ...base, surface: "studio", fetchImpl, cacheStore };

    await generateContentMessages(request, cacheOn);
    await generateContentMessages(request, cacheOn);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not cache sampled output when temperature is positive", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const cacheStore = createMemoryResponseCacheStore();
    const request: ContentMessagesRequest = { ...base, temperature: 0.7, fetchImpl, cacheStore };

    await generateContentMessages(request, cacheOn);
    await generateContentMessages(request, cacheOn);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falls back to the live path when the store read fails", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const cacheStore: ResponseCacheStore = {
      get: vi.fn(async () => {
        throw new Error("store unavailable");
      }),
      set: vi.fn(async () => undefined),
    };

    const result = await generateContentMessages({ ...base, fetchImpl, cacheStore }, cacheOn);

    expect(result.text).toBe("Anthropic text");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("uses a different cache entry when the user text changes", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const cacheStore = createMemoryResponseCacheStore();

    await generateContentMessages({ ...base, user: "first", fetchImpl, cacheStore }, cacheOn);
    await generateContentMessages({ ...base, user: "second", fetchImpl, cacheStore }, cacheOn);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
