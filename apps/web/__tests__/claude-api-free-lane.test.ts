import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateContentMessages, shouldUseFreeLane, isFreePoolAvailable } from "@/lib/claude-api/free-lane";
import { __resetPoolStateForTests } from "@/lib/claude-api/provider-pool";

const anthropicResponse = () =>
  new Response(
    JSON.stringify({
      content: [{ type: "text", text: "Anthropic text" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200 }
  );

const openAiResponse = (text: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 8, completion_tokens: 4 },
    }),
    { status: 200 }
  );

// Cerebras key present so the pool prefers Cerebras (after keyless) in rotation.
const FREE_ON = { CONTENT_FREE_LANE_ENABLED: "true", CEREBRAS_API_KEY: "cb-key" } as const;

const base = { apiKey: "an-key", maxTokens: 100, system: "S", user: "U" } as const;

const urls = (fetchImpl: ReturnType<typeof vi.fn>) =>
  (fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>).map((c) => c[0]);

describe("content free-lane dispatcher (multi-provider free pool)", () => {
  beforeEach(() => __resetPoolStateForTests());
  afterEach(() => __resetPoolStateForTests());

  it("routes to the keyless free pool by default (ZERO paid key needed)", async () => {
    // Empty env → only the keyless provider is available, so the pool serves it.
    const fetchImpl = vi.fn(async () => openAiResponse("Keyless text"));
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, {});
    expect(result.text).toBe("Keyless text");
    // Keyless Pollinations, NOT Anthropic.
    expect(urls(fetchImpl)[0]).toBe("https://text.pollinations.ai/openai/chat/completions");
  });

  it("uses a keyed free provider (Cerebras) when its key is configured", async () => {
    // First rotation slot is keyless; force it to fail so we exercise the keyed
    // provider and confirm its endpoint is reached.
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("keyless down", { status: 503 }))
      .mockResolvedValueOnce(openAiResponse("Cerebras text"));
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, FREE_ON);
    expect(result.text).toBe("Cerebras text");
    expect(urls(fetchImpl)).toContain("https://api.cerebras.ai/v1/chat/completions");
  });

  it("fails over across the pool on a provider error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("first down", { status: 500 }))
      .mockResolvedValueOnce(openAiResponse("Recovered text"));
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, FREE_ON);
    expect(result.text).toBe("Recovered text");
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to Anthropic when ALL free providers fail and a key is set", async () => {
    // Every free-pool call fails; Anthropic succeeds. With only the keyless
    // provider available, the pool tries it then falls back to Anthropic.
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("anthropic.com")) return anthropicResponse();
      return new Response("provider down", { status: 500 });
    }) as unknown as ReturnType<typeof vi.fn>;
    const result = await generateContentMessages(
      { ...base, fetchImpl: fetchImpl as unknown as typeof fetch, surface: "brief" },
      { ANTHROPIC_API_KEY: "an-key" }
    );
    expect(result.text).toBe("Anthropic text");
    expect(urls(fetchImpl)).toContain("https://api.anthropic.com/v1/messages");
  });

  it("the free pool is always available (keyless default) regardless of surface", () => {
    expect(isFreePoolAvailable({})).toBe(true);
    expect(isFreePoolAvailable(FREE_ON)).toBe(true);
  });

  it("legacy shouldUseFreeLane keeps its surface-gated semantics", () => {
    expect(shouldUseFreeLane("brief", FREE_ON)).toBe(true);
    expect(shouldUseFreeLane("studio", FREE_ON)).toBe(false);
    expect(shouldUseFreeLane("brief", {})).toBe(false);
  });
});
