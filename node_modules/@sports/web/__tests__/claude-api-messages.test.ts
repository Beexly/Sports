import { describe, expect, it, vi } from "vitest";
import { callClaudeMessages, ClaudeMessagesError } from "@/lib/claude-api/messages";

describe("Claude messages client", () => {
  it("sends a single budget-wrapper approved Anthropic messages request", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Draft text" }],
          usage: { input_tokens: 100, output_tokens: 25 },
        }),
        { status: 200 }
      )
    );

    const result = await callClaudeMessages({
      apiKey: "test-key",
      fetchImpl,
      model: "claude-test",
      maxTokens: 500,
      temperature: 0.2,
      system: "System",
      user: "User",
    });

    expect(result).toMatchObject({
      text: "Draft text",
      modelName: "claude-test",
      inputTokens: 100,
      outputTokens: 25,
    });
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]?.[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(calls[0]?.[1].headers).toMatchObject({
      "x-api-key": "test-key",
      "anthropic-version": "2023-06-01",
    });
  });

  it("throws a typed error for non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));

    await expect(
      callClaudeMessages({
        apiKey: "test-key",
        fetchImpl,
        maxTokens: 100,
        system: "System",
        user: "User",
      })
    ).rejects.toBeInstanceOf(ClaudeMessagesError);
  });
});
