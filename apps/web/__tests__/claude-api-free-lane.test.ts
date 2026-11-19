import { describe, expect, it, vi } from "vitest";
import {
  FREE_LANE_SURFACES,
  alibabaCreditLaneConfig,
  generateContentMessages,
  nousPromoFreeLaneChain,
  nousPromoFreeLaneConfig,
  shouldUseFreeLane,
} from "@/lib/claude-api/free-lane";
import { creditPoolForModel } from "@/lib/claude-api/credit-pool";

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
  it("allow-lists brief and content only", () => {
    expect(FREE_LANE_SURFACES.has("brief")).toBe(true);
    expect(FREE_LANE_SURFACES.has("content")).toBe(true);
    expect(FREE_LANE_SURFACES.has("studio")).toBe(false);
  });

  it("defaults to Anthropic when the lane is disabled", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, {});
    expect(result.text).toBe("Anthropic text");
    expect(urls(fetchImpl)[0]).toBe("https://api.anthropic.com/v1/messages");
  });

  it("uses Cerebras for brief when enabled", async () => {
    const fetchImpl = vi.fn(async () => cerebrasResponse());
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, FREE_ON);
    expect(result.text).toBe("Cerebras text");
    expect(urls(fetchImpl)[0]).toBe("https://api.cerebras.ai/v1/chat/completions");
  });

  it("uses Cerebras for content when enabled", async () => {
    const fetchImpl = vi.fn(async () => cerebrasResponse());
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "content" }, FREE_ON);
    expect(result.text).toBe("Cerebras text");
    expect(result.modelName).toBe("gpt-oss-120b");
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
    const result = await generateContentMessages({ ...base, fetchImpl, surface: "content" }, FREE_ON);
    expect(result.text).toBe("Anthropic text");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(urls(fetchImpl)).toEqual([
      "https://api.cerebras.ai/v1/chat/completions",
      "https://api.anthropic.com/v1/messages",
    ]);
  });

  it("shouldUseFreeLane is true only for allow-listed surfaces with the lane enabled", () => {
    expect(shouldUseFreeLane("brief", FREE_ON)).toBe(true);
    expect(shouldUseFreeLane("content", FREE_ON)).toBe(true);
    expect(shouldUseFreeLane("studio", FREE_ON)).toBe(false);
    expect(shouldUseFreeLane("content", {})).toBe(false);
  });

  /** Image-task smoke (operator checklist): free-lane policy for content surface */
  it("routes content to free-lane when enabled", () => {
    expect(
      shouldUseFreeLane("content", {
        CONTENT_FREE_LANE_ENABLED: "true",
        CEREBRAS_API_KEY: "test",
      }),
    ).toBe(true);
  });

  it("routes brief/content through Alibaba DashScope Qwen credits before Anthropic and attributes alibaba_credits", async () => {
    const aliEnv = {
      CONTENT_FREE_LANE_ENABLED: "true",
      ALIBABA_API_KEY: "ali-credit-key",
    } as const;
    expect(shouldUseFreeLane("content", aliEnv)).toBe(true);
    expect(alibabaCreditLaneConfig(aliEnv)?.ledgerPrefix).toBe("alibaba-qwen/");
    expect(creditPoolForModel("alibaba-qwen/qwen-plus")).toBe("alibaba_credits");

    const fetchImpl = vi.fn(async () => cerebrasResponse());
    const res = await generateContentMessages({ ...base, fetchImpl, surface: "content" }, aliEnv);
    expect(res.modelName).toBe("alibaba-qwen/qwen-plus");
    expect(urls(fetchImpl)[0]).toBe(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    );

    const failFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("dashscope quota", { status: 429 }))
      .mockResolvedValueOnce(anthropicResponse());
    const fallbackRes = await generateContentMessages(
      { ...base, fetchImpl: failFetch, surface: "brief" },
      aliEnv,
    );
    expect(fallbackRes.text).toBe("Anthropic text");
    expect(failFetch).toHaveBeenCalledTimes(2);
  });

  it("routes free qwen/qwen4-max:free promo on Nous Portal at $0 and fail-closes non-free PAYG models", async () => {
    const nousEnv = {
      CONTENT_FREE_LANE_ENABLED: "true",
      NOUS_API_KEY: "nous-test-key",
      NOUS_MODEL: "qwen4-max",
      NOUS_QWEN4_MAX_FREE_PROMO_ENABLED: "true",
      NOUS_ALLOW_PAYG: "false",
    } as const;
    const cfg = nousPromoFreeLaneConfig(nousEnv);
    expect(cfg?.model).toBe("qwen/qwen4-max:free");
    expect(creditPoolForModel("nous-free/qwen/qwen4-max:free")).toBe("content_free");

    const fetchImpl = vi.fn(async () => cerebrasResponse());
    const res = await generateContentMessages({ ...base, fetchImpl, surface: "content" }, nousEnv);
    expect(res.modelName).toBe("nous-free/qwen/qwen4-max:free");
    expect(urls(fetchImpl)[0]).toBe("https://inference-api.nousresearch.com/v1/chat/completions");

    // Non-free PAYG model must be blocked when NOUS_ALLOW_PAYG is false
    expect(
      nousPromoFreeLaneConfig({
        ...nousEnv,
        NOUS_MODEL: "nousresearch/hermes-4-405b",
      }),
    ).toBeNull();
    // Expired promo fail-closes to null and empty chain
    expect(
      nousPromoFreeLaneConfig(
        {
          ...nousEnv,
          NOUS_PROMO_EXPIRES_AT: "2026-11-18T00:00:00Z",
        },
        Date.parse("2026-11-19T00:00:00Z"),
      ),
    ).toBeNull();
    expect(
      nousPromoFreeLaneChain(
        {
          ...nousEnv,
          NOUS_MODEL: "nousresearch/hermes-4-405b",
        },
      ),
    ).toEqual([]);
  });

  it("cascades across 3 free Nous promo models (qwen4-max:free -> longcat-2.5:free -> step-3.7-flash:free) before Alibaba/Anthropic", async () => {
    const chainEnv = {
      CONTENT_FREE_LANE_ENABLED: "true",
      NOUS_API_KEY: "nous-test-key",
      NOUS_MODEL: "qwen/qwen4-max:free",
      NOUS_QWEN4_MAX_FREE_PROMO_ENABLED: "true",
      NOUS_ALLOW_PAYG: "false",
      ALIBABA_API_KEY: "ali-test-key",
    } as const;
    const chain = nousPromoFreeLaneChain(chainEnv);
    expect(chain.map((c) => c.model)).toEqual([
      "qwen/qwen4-max:free",
      "meituan/longcat-2.5:free",
      "stepfun/step-3.7-flash:free",
    ]);

    const seenModels: string[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      seenModels.push(`${url}#${parsed.model ?? ""}`);
      if (seenModels.length <= 2) {
        return new Response("rate limit on nous free model", { status: 429 });
      }
      return cerebrasResponse();
    });
    const res = await generateContentMessages({ ...base, fetchImpl, surface: "brief" }, chainEnv);
    expect(res.modelName).toBe("nous-free/stepfun/step-3.7-flash:free");
    expect(seenModels).toEqual([
      "https://inference-api.nousresearch.com/v1/chat/completions#qwen/qwen4-max:free",
      "https://inference-api.nousresearch.com/v1/chat/completions#meituan/longcat-2.5:free",
      "https://inference-api.nousresearch.com/v1/chat/completions#stepfun/step-3.7-flash:free",
    ]);

    // When all 3 Nous :free hops return 429, it fails over cleanly to Alibaba DashScope before Anthropic
    const fetchToAli = vi.fn(async (_url: string, _init?: RequestInit) => {
      if (fetchToAli.mock.calls.length <= 3) {
        return new Response("nous free rate limit", { status: 429 });
      }
      return cerebrasResponse();
    });
    const aliFallback = await generateContentMessages(
      { ...base, fetchImpl: fetchToAli, surface: "content" },
      chainEnv,
    );
    expect(aliFallback.modelName).toBe("alibaba-qwen/qwen-plus");
    expect(urls(fetchToAli)).toEqual([
      "https://inference-api.nousresearch.com/v1/chat/completions",
      "https://inference-api.nousresearch.com/v1/chat/completions",
      "https://inference-api.nousresearch.com/v1/chat/completions",
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    ]);
  });
});
