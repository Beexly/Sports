import { describe, expect, it, vi } from "vitest";
import {
  callVercelGatewayMessages,
  isVercelGatewayConfigured,
  resolveVercelGatewayConfig,
  VercelGatewayConfigError,
  VercelGatewayMessagesError,
} from "@/lib/claude-api/providers/vercel-gateway";
import { dispatchVercelGateway } from "@/lib/ai-control-plane/dispatch";

describe("Vercel AI Gateway adapter (isolated inside control plane)", () => {
  it("fails closed without AI_GATEWAY_API_KEY and normalizes bare Anthropic model IDs", async () => {
    expect(isVercelGatewayConfigured({})).toBe(false);
    expect(resolveVercelGatewayConfig({ AI_GATEWAY_API_KEY: "vck_unit_test" })).toEqual({
      apiKey: "vck_unit_test",
      baseUrl: "https://ai-gateway.vercel.sh/v1",
    });

    await expect(
      callVercelGatewayMessages({ system: "sys", user: "usr", maxTokens: 64 }, {}),
    ).rejects.toBeInstanceOf(VercelGatewayConfigError);

    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          model: "anthropic/claude-sonnet-4-6",
          choices: [{ message: { content: "gateway ok" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    });

    const out = await callVercelGatewayMessages(
      {
        model: "claude-sonnet-4-6",
        system: "sys",
        user: "usr",
        maxTokens: 64,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
      { AI_GATEWAY_API_KEY: "vck_unit_test" },
    );

    expect(out.text).toBe("gateway ok");
    expect(out.modelName).toBe("anthropic/claude-sonnet-4-6");
    const [calledUrl, calledInit] = fetchImpl.mock.calls[0]!;
    expect(String(calledUrl)).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
    const body = JSON.parse(String(calledInit?.body));
    expect(body.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("maps HTTP errors cleanly via dispatchVercelGateway without network retry leakage", async () => {
    const missing = await dispatchVercelGateway({})({
      modelRequested: "anthropic/claude-sonnet-4-6",
      system: "sys",
      user: "usr",
      maxTokens: 64,
    });
    expect(missing).toEqual({
      kind: "FAILED",
      dispatched: false,
      errorCode: "PROVIDER_CONFIG:AI_GATEWAY_API_KEY missing",
    });

    const fetchErr = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const errOutcome = await dispatchVercelGateway({ AI_GATEWAY_API_KEY: "vck_unit_test" })({
      modelRequested: "anthropic/claude-sonnet-4-6",
      system: "sys",
      user: "usr",
      maxTokens: 64,
      fetchImpl: fetchErr as unknown as typeof fetch,
    });
    expect(errOutcome).toEqual({
      kind: "FAILED",
      dispatched: true,
      errorCode: "HTTP_429",
    });

    await expect(
      callVercelGatewayMessages(
        {
          system: "sys",
          user: "usr",
          maxTokens: 64,
          fetchImpl: fetchErr as unknown as typeof fetch,
        },
        { AI_GATEWAY_API_KEY: "vck_unit_test" },
      ),
    ).rejects.toBeInstanceOf(VercelGatewayMessagesError);
  });
});
