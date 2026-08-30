import { describe, expect, it, vi } from "vitest";
import { callCerebrasMessages, CerebrasMessagesError } from "@/lib/claude-api/providers/cerebras";

describe("Cerebras messages client", () => {
  it("calls the OpenAI-compatible Cerebras endpoint and maps usage", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Draft text" } }],
          usage: { prompt_tokens: 80, completion_tokens: 20 },
        }),
        { status: 200 }
      )
    );

    const result = await callCerebrasMessages({
      apiKey: "cb-key",
      fetchImpl,
      maxTokens: 500,
      temperature: 0.2,
      system: "System",
      user: "User",
    });

    expect(result).toMatchObject({
      text: "Draft text",
      modelName: "gpt-oss-120b",
      inputTokens: 80,
      outputTokens: 20,
    });
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]?.[0]).toBe("https://api.cerebras.ai/v1/chat/completions");
    expect(calls[0]?.[1].headers).toMatchObject({ Authorization: "Bearer cb-key" });
  });

  it("throws a typed error for non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));

    await expect(
      callCerebrasMessages({ apiKey: "cb-key", fetchImpl, maxTokens: 100, system: "S", user: "U" })
    ).rejects.toBeInstanceOf(CerebrasMessagesError);
  });
});
