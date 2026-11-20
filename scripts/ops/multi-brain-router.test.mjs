#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NANOGPT_SUBSCRIPTION_CUTOFF_MS,
  NOUS_PROMO_CUTOFF_MS,
  assertSafeNanoGptEndpoint,
  assertSafeNousModel,
  buildCandidateLanes,
  dispatchBatchParallel,
  dispatchMultiBrain,
  parseOpenAiCompatibleResponseText,
} from "./multi-brain-router.mjs";

test("assertSafeNousModel rejects non-:free slug and NOUS_ALLOW_PAYG=true", () => {
  assert.throws(() => assertSafeNousModel("qwen/qwen4-max", {}), /PAYG_BLOCKED/);
  assert.throws(() => assertSafeNousModel("", {}), /PAYG_BLOCKED/);
  assert.throws(
    () => assertSafeNousModel("qwen/qwen4-max:free", { NOUS_ALLOW_PAYG: "true" }),
    /PAYG_BLOCKED/
  );
  assert.doesNotThrow(() => assertSafeNousModel("qwen/qwen4-max:free", { NOUS_ALLOW_PAYG: "false" }));
});

test("buildCandidateLanes auto-skips Nous promo on/after Nov 23 cutoff and hands off to Alibaba TokenPlan", () => {
  const env = {
    NOUS_API_KEY: "test-nous",
    ALIYUN_TOKENPLAN_KEY: "test-aliyun",
    NVIDIA_API_KEY: "test-nim",
  };
  const duringPromo = buildCandidateLanes("reasoning", env, NOUS_PROMO_CUTOFF_MS - 60_000);
  assert.equal(duringPromo[0].provider, "nous-portal-free-promo");
  assert.equal(duringPromo[0].model, "qwen/qwen4-max:free");

  const afterPromo = buildCandidateLanes("reasoning", env, NOUS_PROMO_CUTOFF_MS);
  assert.equal(afterPromo.some((l) => l.provider === "nous-portal-free-promo"), false);
  assert.equal(afterPromo[0].provider, "aliyun-tokenplan");
  assert.equal(afterPromo[0].model, "qwen4-max");
});

test("dispatchMultiBrain enforces max_tokens >= 4096 on qwen/qwen4-max:free and falls back to reasoning_content if content empty", async () => {
  const tmpReports = mkdtempSync(join(tmpdir(), "mbr-test-"));
  const seenPayloads = [];
  let calls = 0;

  const mockFetch = async (_url, init) => {
    calls++;
    seenPayloads.push(JSON.parse(init.body));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: null, reasoning_content: "Verified via reasoning fallback." } }],
        usage: { prompt_tokens: 10, completion_tokens: 12 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const res = await dispatchMultiBrain({
      messages: [{ role: "user", content: "Ping" }],
      maxTokens: 128,
      nowMs: NOUS_PROMO_CUTOFF_MS - 3600_000,
      retryDelayMs: 0,
      allowCliFallback: false,
      reportsDir: tmpReports,
      env: { NOUS_API_KEY: "k", NOUS_ALLOW_PAYG: "false" },
      fetchImpl: mockFetch,
    });
    assert.equal(calls, 2); // 1 initial + 1 retry before reasoning_content fallback
    assert.equal(seenPayloads[0].max_tokens, 4096);
    assert.equal(res.usedReasoningFallback, true);
    assert.equal(res.text, "Verified via reasoning fallback.");
  } finally {
    rmSync(tmpReports, { recursive: true, force: true });
  }
});

test("dispatchMultiBrain cascades across HTTP 429 and 503 failures to healthy fallback lane", async () => {
  const tmpReports = mkdtempSync(join(tmpdir(), "mbr-cascade-"));
  const attempted = [];

  const mockFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    attempted.push(`${url}::${body.model}`);
    if (url.includes("nousresearch")) {
      return new Response("rate limited", { status: 429 });
    }
    if (url.includes("aliyuncs")) {
      return new Response("upstream unavailable", { status: 503 });
    }
    if (url.includes("nvidia")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "NIM ultra ok" } }],
          usage: { prompt_tokens: 12, completion_tokens: 4 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("unexpected", { status: 500 });
  };

  try {
    const res = await dispatchMultiBrain({
      messages: [{ role: "user", content: "Cascade check" }],
      nowMs: NOUS_PROMO_CUTOFF_MS - 3600_000,
      retryDelayMs: 0,
      allowCliFallback: false,
      reportsDir: tmpReports,
      env: {
        NOUS_API_KEY: "k1",
        NOUS_ALLOW_PAYG: "false",
        ALIYUN_TOKENPLAN_KEY: "k2",
        NVIDIA_API_KEY: "k3",
      },
      fetchImpl: mockFetch,
    });
    assert.equal(res.provider, "nvidia-nim");
    assert.equal(res.model, "nvidia/nemotron-3-ultra-550b-a55b");
    assert.equal(res.fallbackHopCount >= 3, true);
    assert.equal(res.text, "NIM ultra ok");
    assert.equal(attempted.some((a) => a.includes("nousresearch")), true);
    assert.equal(attempted.some((a) => a.includes("aliyuncs")), true);
    assert.equal(attempted.some((a) => a.includes("nvidia")), true);
  } finally {
    rmSync(tmpReports, { recursive: true, force: true });
  }
});

test("parseOpenAiCompatibleResponseText parses Nous SSE stream chunks and dispatchMultiBrain sets stream+reasoning_effort=low", async () => {
  const sseBody = [
    'data: {"choices":[{"delta":{"reasoning_content":"think..."}}]}',
    'data: {"choices":[{"delta":{"content":"Hello "}}]}',
    'data: {"choices":[{"delta":{"content":"SSE!"}}],"usage":{"prompt_tokens":9,"completion_tokens":4}}',
    "data: [DONE]",
  ].join("\n\n");
  const parsed = parseOpenAiCompatibleResponseText(sseBody);
  assert.equal(parsed.content, "Hello SSE!");
  assert.equal(parsed.streamChunks, 3);

  const tmpReports = mkdtempSync(join(tmpdir(), "mbr-sse-"));
  let sentBody = null;
  try {
    const res = await dispatchMultiBrain({
      messages: [{ role: "user", content: "Stream check" }],
      nowMs: NOUS_PROMO_CUTOFF_MS - 10_000,
      allowCliFallback: false,
      reportsDir: tmpReports,
      env: { NOUS_API_KEY: "k", NOUS_ALLOW_PAYG: "false" },
      fetchImpl: async (_url, init) => {
        sentBody = JSON.parse(init.body);
        return new Response(sseBody, { status: 200, headers: { "Content-Type": "text/event-stream" } });
      },
    });
    assert.equal(sentBody.stream, true);
    assert.equal(sentBody.reasoning_effort, "low");
    assert.equal(res.text, "Hello SSE!");
    assert.equal(res.streamChunks, 3);
  } finally {
    rmSync(tmpReports, { recursive: true, force: true });
  }
});

test("paid overflow circuit breaker blocks oversized cost and disables multi-retry loops", async () => {
  const tmpReports = mkdtempSync(join(tmpdir(), "mbr-paid-"));
  let paidCalls = 0;
  try {
    await assert.rejects(
      () =>
        dispatchMultiBrain({
          messages: [{ role: "user", content: "hi" }],
          maxTokens: 16384, // exceeds $0.05 ceiling on paid overflow
          allowCliFallback: false,
          reportsDir: tmpReports,
          env: { XAI_API_KEY: "xai-test" },
          fetchImpl: async () => {
            paidCalls++;
            return new Response("should not run", { status: 500 });
          },
        }),
      /ALL_MULTI_BRAIN_LANES_FAILED/,
    );
    assert.equal(paidCalls, 0);

    // Within ceiling, maxPaidRetries=1 prevents retry loops on 429
    let retryCalls = 0;
    await assert.rejects(
      () =>
        dispatchMultiBrain({
          messages: [{ role: "user", content: "hi" }],
          maxTokens: 200,
          allowCliFallback: false,
          reportsDir: tmpReports,
          env: { XAI_API_KEY: "xai-test" },
          fetchImpl: async () => {
            retryCalls++;
            return new Response("rate limit", { status: 429 });
          },
        }),
      /ALL_MULTI_BRAIN_LANES_FAILED/,
    );
    assert.equal(retryCalls, 1);
  } finally {
    rmSync(tmpReports, { recursive: true, force: true });
  }
});

test("dispatchBatchParallel runs bounded parallel pool and includes Priority 1/2 Workers AI + HF Pro", async () => {
  const lanes = buildCandidateLanes("reasoning", {
    CLOUDFLARE_API_TOKEN: "cf-tok",
    HF_TOKEN: "hf-tok",
  });
  assert.equal(lanes.some((l) => l.provider === "cloudflare-workers-ai"), true);
  assert.equal(lanes.some((l) => l.provider === "huggingface-pro"), true);

  const tmpReports = mkdtempSync(join(tmpdir(), "mbr-batch-"));
  try {
    const jobs = Array.from({ length: 6 }, (_, i) => ({
      messages: [{ role: "user", content: `job-${i}` }],
      env: { CLOUDFLARE_API_TOKEN: "cf-tok" },
      fetchImpl: async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: `ok-${i}` } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    }));
    const out = await dispatchBatchParallel(jobs, { concurrency: 6, allowCliFallback: false, reportsDir: tmpReports });
    assert.equal(out.length, 6);
    assert.equal(out.every((r) => r.ok && r.result.text.startsWith("ok-")), true);
  } finally {
    rmSync(tmpReports, { recursive: true, force: true });
  }
});

test("assertSafeNanoGptEndpoint locks NanoGPT Pro to /api/subscription/v1 until Dec 5 cutoff", () => {
  assert.throws(
    () => assertSafeNanoGptEndpoint("https://nano-gpt.com/api/v1", {}, NANOGPT_SUBSCRIPTION_CUTOFF_MS - 3600_000),
    /NANOGPT_PAYG_BLOCKED/,
  );
  assert.throws(
    () => assertSafeNanoGptEndpoint("https://nano-gpt.com/api/subscription/v1", {}, NANOGPT_SUBSCRIPTION_CUTOFF_MS),
    /NANOGPT_EXPIRED/,
  );
  assert.throws(
    () =>
      assertSafeNanoGptEndpoint(
        "https://nano-gpt.com/api/subscription/v1",
        { NANOGPT_DISABLED: "true" },
        NANOGPT_SUBSCRIPTION_CUTOFF_MS - 3600_000,
      ),
    /NANOGPT_DISABLED/,
  );
  assert.doesNotThrow(() =>
    assertSafeNanoGptEndpoint(
      "https://nano-gpt.com/api/subscription/v1",
      { NANOGPT_DISABLED: "false" },
      NANOGPT_SUBSCRIPTION_CUTOFF_MS - 3600_000,
    ),
  );

  const afterNousBeforeDec5 = buildCandidateLanes(
    "reasoning",
    { NANOGPT_API_KEY: "nano-sub-key", ALIYUN_TOKENPLAN_KEY: "ali-key" },
    NOUS_PROMO_CUTOFF_MS + 60_000,
  );
  assert.equal(afterNousBeforeDec5[0].provider, "nanogpt-pro-sub");
  assert.equal(afterNousBeforeDec5[0].baseUrl, "https://nano-gpt.com/api/subscription/v1");

  const afterDec5 = buildCandidateLanes(
    "reasoning",
    { NANOGPT_API_KEY: "nano-sub-key", ALIYUN_TOKENPLAN_KEY: "ali-key" },
    NANOGPT_SUBSCRIPTION_CUTOFF_MS,
  );
  assert.equal(afterDec5.some((l) => l.provider === "nanogpt-pro-sub"), false);
  assert.equal(afterDec5[0].provider, "aliyun-tokenplan");
});
