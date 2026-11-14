import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCandidateCatalog,
  getInferenceCircuitBreakerSnapshot,
  resetInferenceCircuitBreakers,
  resolveInferenceLane,
  routeInferenceWithFallback,
  selectInferenceChain,
} from "@/lib/inference/multi-provider-router";

describe("multi-provider-router", () => {
  beforeEach(() => {
    resetInferenceCircuitBreakers();
  });

  it("defaults to hybrid_auto with zero-cost Dual-Cloud Alibaba QwenCloud + NVIDIA NIM first", () => {
    expect(resolveInferenceLane(undefined, {})).toBe("hybrid_auto");
    const catalog = buildCandidateCatalog({
      DASHSCOPE_API_KEY: "dash-key",
      NVIDIA_GSE_API_KEY: "nv-key",
      MODELSCOPE_API_KEY: "ms-key",
      OPENROUTER_API_KEY: "or-key",
      GSE_ENABLE_PAID_DEEPSEEK_1017: "true",
    });
    const chain = selectInferenceChain("hybrid_auto", catalog);
    expect(chain.map((c) => c.id)).toEqual([
      "alibaba-qwencloud-free",
      "nvidia-nim-free",
      "modelscope-free",
      "openrouter-free",
      "gcp-vertex-gemini",
      "openrouter-deepseek-1017",
      "bedrock-deepseek-v32",
    ]);
    expect(chain[0]?.model).toBe("deepseek-v4-flash-0731");
    expect(chain[0]?.zeroCostDefault).toBe(true);
    expect(chain[1]?.model).toBe("nvidia/nemotron-3-ultra-550b-a55b");
    expect(chain[1]?.zeroCostDefault).toBe(true);
  });

  it("enforces hard cost ceiling on paid candidates and falls back to free or deterministic offline", async () => {
    const result = await routeInferenceWithFallback({
      taskType: "calibration-audit",
      seatId: "audit",
      lane: "deepseek_1017",
      system: "sys",
      user: "usr",
      maxCostUsdPerRun: 0.5,
      spentUsdThisRun: 0.5,
      allowOfflineFallback: true,
      env: {
        DASHSCOPE_API_KEY: "dash-test",
        OPENROUTER_API_KEY: "or-test",
        GSE_ENABLE_PAID_DEEPSEEK_1017: "true",
      },
      customDispatch: vi.fn(async (candidate) => {
        if (candidate.lane === "free") {
          return { text: '{"ok":true,"lane":"free"}', inputTokens: 100, outputTokens: 50, costUsd: 0 };
        }
        throw new Error("Should not call paid candidate at ceiling");
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.providerUsed).toBe("alibaba-qwencloud-free");
    expect(result.costUsd).toBe(0);
    expect(result.attempts[0]?.skippedReason).toBe("COST_CEILING_REACHED");
    expect(result.attempts[1]?.skippedReason).toBe("COST_CEILING_REACHED");
  });

  it("opens circuit breaker after repeated failures and falls over to secondary free provider", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("rate limit", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "NVIDIA NIM responded cleanly" } }],
            usage: { prompt_tokens: 120, completion_tokens: 40 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const env = {
      DASHSCOPE_API_KEY: "dash-key",
      NVIDIA_GSE_API_KEY: "nv-key",
    };

    const res = await routeInferenceWithFallback(
      {
        taskType: "routing",
        seatId: "jarvis",
        lane: "free",
        system: "system",
        user: "user",
        nowMs: 1_000_000,
        fetchImpl: fetchMock,
        env,
      },
      { failureThreshold: 1, cooldownMs: 60_000 },
    );

    expect(res.ok).toBe(true);
    expect(res.mode).toBe("LIVE_PROVIDER");
    expect(res.providerUsed).toBe("nvidia-nim-free");
    expect(res.costUsd).toBe(0);
    expect(res.text).toBe("NVIDIA NIM responded cleanly");
    const snap = getInferenceCircuitBreakerSnapshot();
    expect(snap["alibaba-qwencloud-free"]?.openedUntilMs).toBe(1_060_000);
  });

  it("routes alibaba-qwencloud-free at $0 cost with DASHSCOPE_API_KEY fallback to QWEN_GSE_API_KEY", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"qwencloud":true}' } }],
          usage: { prompt_tokens: 80, completion_tokens: 20 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await routeInferenceWithFallback({
      taskType: "corpus-synth",
      seatId: "prism",
      lane: "free",
      system: "sys",
      user: "usr",
      fetchImpl: fetchMock,
      env: { QWEN_GSE_API_KEY: "qwen-gse-key" },
    });

    expect(res.ok).toBe(true);
    expect(res.providerUsed).toBe("alibaba-qwencloud-free");
    expect(res.modelUsed).toBe("deepseek-v4-flash-0731");
    expect(res.costUsd).toBe(0);
  });

  it("returns clean deterministic fallback in CI / offline environments when no keys exist", async () => {
    const res = await routeInferenceWithFallback({
      taskType: "platform-assessment",
      seatId: "jarvis",
      system: "sys",
      user: "usr",
      env: {},
    });
    expect(res.ok).toBe(true);
    expect(res.mode).toBe("OFFLINE_DETERMINISTIC_FALLBACK");
    expect(res.costUsd).toBe(0);
    expect(JSON.parse(res.text)).toMatchObject({
      deterministicFallback: true,
      seatId: "jarvis",
    });
  });
});
