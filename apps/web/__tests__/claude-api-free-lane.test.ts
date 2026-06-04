import { describe, expect, it, vi } from "vitest";
import { generateContentMessages, shouldUseFreeLane } from "@/lib/claude-api/free-lane";

const anthropicResponse = () =>
  new Response(
    JSON.stringify({
      content: [{ type: "text", text: "Anthropic text" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200 }
  );

const cerebrasResponse = () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: "Cerebras text" } }],
      usage: { prompt_tokens: 8, completion_tokens: 4 },
    }),
    { status: 200 }
  );

const FREE_ON = { CONTENT_FREE_LANE_ENABLED: "true", CEREBRAS_API_KEY: "cb-key" } as const;

const base = { apiKey: "an-key", maxTokens: 100, system: "S", user: "U" } as const;

const urls = (fetchImpl: ReturnType<typeof vi.fn>) =>
  (fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>).map((c) => c[0]);

describe("content free-lane dispatcher", () => {
  it("defaults to Anthropic when the lane is disabled", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, {});
    expect(result.text).toBe("Anthropic text");
    expect(urls(fetchImpl)[0]).toBe("https://api.anthropic.com/v1/messages");
  });

  it("uses Cerebras for an allow-listed surface when enabled", async () => {
    const fetchImpl = vi.fn(async () => cerebrasResponse());
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, FREE_ON);
    expect(result.text).toBe("Cerebras text");
    expect(urls(fetchImpl)[0]).toBe("https://api.cerebras.ai/v1/chat/completions");
  });

  it("stays on Anthropic for non-allow-listed surfaces even when enabled", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    await generateContentMessages({ ...base, fetchImpl, surface: "studio" }, FREE_ON);
    expect(urls(fetchImpl)[0]).toBe("https://api.anthropic.com/v1/messages");
  });

  it("falls back to Anthropic when Cerebras errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("cerebras down", { status: 500 }))
      .mockResolvedValueOnce(anthropicResponse());
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, FREE_ON);
    expect(result.text).toBe("Anthropic text");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(urls(fetchImpl)).toEqual([
      "https://api.cerebras.ai/v1/chat/completions",
      "https://api.anthropic.com/v1/messages",
    ]);
  });

  it("shouldUseFreeLane is true only for an allow-listed surface with the lane enabled", () => {
    expect(shouldUseFreeLane("brief", FREE_ON)).toBe(true);
    expect(shouldUseFreeLane("studio", FREE_ON)).toBe(false);
    expect(shouldUseFreeLane("brief", {})).toBe(false);
  });
});
