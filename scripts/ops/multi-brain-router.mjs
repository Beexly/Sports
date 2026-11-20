#!/usr/bin/env node
/**
 * multi-brain-router.mjs
 * Zero-dependency Node ESM multi-provider failover dispatcher for Sports OS.
 *
 * Enforces:
 * - Priority 0..3 cost-first routing:
 *   P0: Nous Portal :free promo (`qwen/qwen4-max:free`, SSE stream + reasoning_effort=low -> ~5.5s, cutoff 2026-11-23T15:00:00Z)
 *   P1: $0 Permanent / Prepaid / Included (NVIDIA NIM 40 RPM, Alibaba TokenPlan qwen4-max, DashScope, OpenCode Zen, ExpLabs, CommandCode, Cloudflare Workers AI 10K neurons/day)
 *   P2: Active Credits (Hugging Face PRO router, GEMINI_OPENAI_BASE_URL if configured)
 *   P3: Overflow OpenRouter (:free unlimited; paid overflow / xAI gated by maxJobCostUsd=$0.05 & maxPaidRetries=1)
 * - Bounded 6x parallel batch worker pool (`dispatchBatchParallel`)
 * - Hard Nous Portal :free billing guard (PAYG slugs blocked, NOUS_ALLOW_PAYG=true blocked)
 * - Automatic Nov 23 Nous promo sunset handoff -> Alibaba TokenPlan qwen4-max
 * - Reasoning token floor (max_tokens >= 4096 for qwen4-max)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import os from "node:os";

export const NOUS_PROMO_CUTOFF_ISO = "2026-11-23T15:00:00Z";
export const NOUS_PROMO_CUTOFF_MS = Date.parse(NOUS_PROMO_CUTOFF_ISO);
export const NANOGPT_SUBSCRIPTION_CUTOFF_ISO = "2026-12-05T00:00:00Z";
export const NANOGPT_SUBSCRIPTION_CUTOFF_MS = Date.parse(NANOGPT_SUBSCRIPTION_CUTOFF_ISO);
export const DEFAULT_PAID_JOB_COST_CEILING_USD = 0.05;
export const DEFAULT_PAID_MAX_RETRIES = 1;
export const DEFAULT_PARALLEL_CONCURRENCY = 6;

const DEFAULT_REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const DEFAULT_CLOUDFLARE_ACCOUNT_ID = "46f1c1d1c65d19f3f983713b3a8ab67c";

const SECRET_KEY_NAMES = new Set([
  "NOUS_API_KEY",
  "NOUS_PORTAL_API_KEY",
  "NVIDIA_GSE_API_KEY",
  "NVIDIA_API_KEY",
  "ALIYUN_TOKENPLAN_KEY",
  "ALIBABA_API_KEY",
  "DASHSCOPE_API_KEY",
  "EXPLABS_API_KEY",
  "OPENCODE_ZEN_API_KEY",
  "COMMANDCODE_API_KEY",
  "COMMANDCODE_BASE_URL",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "HF_TOKEN",
  "XAI_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENROUTER_API_KEY2",
  "OPENROUTER_API_KEY3",
  "OPENROUTER_ALLOW_PAID_OVERFLOW",
  "GEMINI_OPENAI_BASE_URL",
  "GEMINI_API_KEY",
  "NOUS_ALLOW_PAYG",
  "NOUS_BASE_URL",
  "NOUS_MODEL",
  "NANOGPT_API_KEY",
  "NANOGPT_DISABLED",
  "NANOGPT_SUB_BASE_URL",
  "NANOGPT_SUB_MODEL",
  "NANOGPT_SUBSCRIPTION_CUTOFF",
  "ALIBABA_BASE_URL",
  "FISH_API_KEY",
  "FISH_AUDIO_API_KEY",
  "FISH_AUDIO_TTS_MODEL",
  "SENTRY_ORG_SLUG",
  "SENTRY_AUTH_TOKEN",
  "LATITUDE_API_KEY",
]);

/** Load non-empty env keys from .env files without logging or mutating unrelated vars. */
export function loadEnvFromDisk(repoRoot = DEFAULT_REPO_ROOT) {
  const merged = { ...process.env };
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || resolve(home, "AppData/Local");
  const candidates = [
    resolve(repoRoot, ".env.local"),
    resolve(repoRoot, ".env"),
    resolve(home, ".hermes/.env"),
    resolve(localAppData, "hermes/.env"),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    let raw = "";
    try {
      raw = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!SECRET_KEY_NAMES.has(key)) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!merged[key] && val) {
        merged[key] = val;
      }
    }
  }
  return merged;
}

/** Fail-closed billing guard for Nous Portal free promo lane. */
export function assertSafeNousModel(model, env = process.env) {
  if (String(env.NOUS_ALLOW_PAYG ?? "false").toLowerCase() === "true") {
    throw new Error("PAYG_BLOCKED: NOUS_ALLOW_PAYG=true is forbidden; keeping billing locked to :free only.");
  }
  if (!model || typeof model !== "string" || !model.endsWith(":free")) {
    throw new Error(`PAYG_BLOCKED: Nous Portal model must end with ':free', received '${String(model)}'.`);
  }
}

/** Fail-closed subscription-only guard for NanoGPT Pro (Cancels 2026-12-05; never hit PAYG /api/v1). */
export function assertSafeNanoGptEndpoint(baseUrl, env = process.env, nowMs = Date.now()) {
  if (String(env.NANOGPT_DISABLED ?? "false").toLowerCase() === "true") {
    throw new Error("NANOGPT_DISABLED: NanoGPT Pro lane is disabled by configuration.");
  }
  const cutoffMs = env.NANOGPT_SUBSCRIPTION_CUTOFF
    ? Date.parse(env.NANOGPT_SUBSCRIPTION_CUTOFF)
    : NANOGPT_SUBSCRIPTION_CUTOFF_MS;
  if (nowMs >= cutoffMs) {
    throw new Error(`NANOGPT_EXPIRED: Subscription ended at ${new Date(cutoffMs).toISOString()}; blocked.`);
  }
  if (!baseUrl || typeof baseUrl !== "string" || !baseUrl.includes("/api/subscription/v1")) {
    throw new Error(`NANOGPT_PAYG_BLOCKED: Must use '/api/subscription/v1' endpoint only, received '${String(baseUrl)}'.`);
  }
}

export function estimatePaidCostUsd({ inputChars = 0, maxTokens = 1024, inputPerM = 1.0, outputPerM = 3.0 }) {
  const estInputTokens = Math.ceil(Math.max(0, inputChars) / 4);
  const estOutputTokens = Math.max(0, maxTokens);
  return (estInputTokens / 1_000_000) * inputPerM + (estOutputTokens / 1_000_000) * outputPerM;
}

export function buildCandidateLanes(taskType = "reasoning", env = process.env, nowMs = Date.now()) {
  const nousActive = nowMs < NOUS_PROMO_CUTOFF_MS;
  const nanoCutoffMs = env.NANOGPT_SUBSCRIPTION_CUTOFF
    ? Date.parse(env.NANOGPT_SUBSCRIPTION_CUTOFF)
    : NANOGPT_SUBSCRIPTION_CUTOFF_MS;
  const nanoSubActive =
    nowMs < nanoCutoffMs && String(env.NANOGPT_DISABLED ?? "false").toLowerCase() !== "true";
  const openRouterKeys = [
    { keyName: "OPENROUTER_API_KEY", key: env.OPENROUTER_API_KEY },
    { keyName: "OPENROUTER_API_KEY2", key: env.OPENROUTER_API_KEY2 },
    { keyName: "OPENROUTER_API_KEY3", key: env.OPENROUTER_API_KEY3 },
  ].filter((x) => Boolean(x.key));

  const alibabaKey = env.ALIBABA_API_KEY || env.DASHSCOPE_API_KEY || "";
  const nvidiaKey = env.NVIDIA_GSE_API_KEY || env.NVIDIA_API_KEY || "";
  const nvidiaKeyLabel = env.NVIDIA_GSE_API_KEY ? "NVIDIA_GSE_API_KEY" : "NVIDIA_API_KEY";
  const cfToken = env.CLOUDFLARE_API_TOKEN || "";
  const cfAccount = env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_CLOUDFLARE_ACCOUNT_ID;

  const makeLane = (provider, model, baseUrl, apiKey, keyLabel, opts = {}) => ({
    provider,
    model,
    baseUrl,
    apiKey,
    keyLabel,
    priority: opts.priority ?? 1,
    isPaidOverflow: opts.isPaidOverflow ?? false,
    streamDefault: opts.streamDefault ?? false,
    reasoningEffort: opts.reasoningEffort ?? null,
    inputPerMUsd: opts.inputPerMUsd ?? 0,
    outputPerMUsd: opts.outputPerMUsd ?? 0,
  });

  // Priority 0: Time-limited free/prepaid windows
  const nousPrimary = makeLane(
    "nous-portal-free-promo",
    "qwen/qwen4-max:free",
    env.NOUS_BASE_URL || "https://inference-api.nousresearch.com/v1",
    env.NOUS_API_KEY || env.NOUS_PORTAL_API_KEY || "",
    "NOUS_API_KEY",
    { priority: 0, streamDefault: true, reasoningEffort: "low" }
  );
  const nanogptProSub = makeLane(
    "nanogpt-pro-sub",
    env.NANOGPT_SUB_MODEL || "Qwen/Qwen3-235B-A22B-Instruct-2507",
    env.NANOGPT_SUB_BASE_URL || "https://nano-gpt.com/api/subscription/v1",
    env.NANOGPT_API_KEY || "",
    "NANOGPT_API_KEY",
    { priority: 0 }
  );

  // Priority 1: $0 Permanent / Prepaid / Included Subscriptions
  const aliyunQwen4 = makeLane(
    "aliyun-tokenplan",
    "qwen4-max",
    "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    env.ALIYUN_TOKENPLAN_KEY || "",
    "ALIYUN_TOKENPLAN_KEY",
    { priority: 1 }
  );
  const aliyunDeepseek = makeLane(
    "aliyun-tokenplan",
    "deepseek-v4-pro",
    "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    env.ALIYUN_TOKENPLAN_KEY || "",
    "ALIYUN_TOKENPLAN_KEY",
    { priority: 1 }
  );
  const aliyunFlash = makeLane(
    "aliyun-tokenplan",
    "deepseek-v4.1-flash",
    "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    env.ALIYUN_TOKENPLAN_KEY || "",
    "ALIYUN_TOKENPLAN_KEY",
    { priority: 1 }
  );
  const dashscopeQwen4 = makeLane(
    "alibaba-dashscope",
    "qwen4-max",
    env.ALIBABA_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    alibabaKey,
    "ALIBABA_API_KEY",
    { priority: 1 }
  );
  const dashscopeQwenPlus = makeLane(
    "alibaba-dashscope",
    "qwen-plus",
    env.ALIBABA_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    alibabaKey,
    "ALIBABA_API_KEY",
    { priority: 1 }
  );
  const nimUltra = makeLane(
    "nvidia-nim",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "https://integrate.api.nvidia.com/v1",
    nvidiaKey,
    nvidiaKeyLabel,
    { priority: 1 }
  );
  const nimIsing = makeLane(
    "nvidia-nim",
    "nvidia/ising-calibration-1.5-31b",
    "https://integrate.api.nvidia.com/v1",
    nvidiaKey,
    nvidiaKeyLabel,
    { priority: 1 }
  );
  const nimLightning = makeLane(
    "nvidia-nim",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "https://integrate.api.nvidia.com/v1",
    nvidiaKey,
    nvidiaKeyLabel,
    { priority: 1 }
  );
  const nimSuperVl = makeLane(
    "nvidia-nim",
    "nvidia/nemotron-3.5-super-vl-120b-a12b",
    "https://integrate.api.nvidia.com/v1",
    nvidiaKey,
    nvidiaKeyLabel,
    { priority: 1 }
  );
  const workersAiLlama = makeLane(
    "cloudflare-workers-ai",
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/v1`,
    cfToken,
    "CLOUDFLARE_API_TOKEN",
    { priority: 1 }
  );
  const explabsArgon = makeLane(
    "experientiallabs",
    "gemini-4-argon",
    "https://api.experientiallabs.ai/v1",
    env.EXPLABS_API_KEY || "",
    "EXPLABS_API_KEY",
    { priority: 1 }
  );
  const explabsDeepseek = makeLane(
    "experientiallabs",
    "deepseek-v4-pro",
    "https://api.experientiallabs.ai/v1",
    env.EXPLABS_API_KEY || "",
    "EXPLABS_API_KEY",
    { priority: 1 }
  );
  const zenFlash = makeLane(
    "opencode-zen",
    "deepseek-v4.1-flash-free",
    "https://opencode.ai/zen/v1",
    env.OPENCODE_ZEN_API_KEY || "",
    "OPENCODE_ZEN_API_KEY",
    { priority: 1 }
  );
  const zenJev = makeLane(
    "opencode-zen",
    "jev-1.13-free",
    "https://opencode.ai/zen/v1",
    env.OPENCODE_ZEN_API_KEY || "",
    "OPENCODE_ZEN_API_KEY",
    { priority: 1 }
  );
  const zenMimo = makeLane(
    "opencode-zen",
    "mimo-v2.6-flash-free",
    "https://opencode.ai/zen/v1",
    env.OPENCODE_ZEN_API_KEY || "",
    "OPENCODE_ZEN_API_KEY",
    { priority: 1 }
  );
  const commandCodeLane = makeLane(
    "commandcode-api",
    env.COMMANDCODE_MODEL || "commandcode-free",
    env.COMMANDCODE_BASE_URL || "",
    env.COMMANDCODE_API_KEY || "",
    "COMMANDCODE_API_KEY",
    { priority: 1 }
  );

  // Priority 2: Active Credited / Pro Subscriptions
  const hfProQwen = makeLane(
    "huggingface-pro",
    "Qwen/Qwen3-235B-A22B-Instruct-2507",
    "https://router.huggingface.co/v1",
    env.HF_TOKEN || "",
    "HF_TOKEN",
    { priority: 2 }
  );
  const geminiCompat = makeLane(
    "google-gemini-compat",
    env.GEMINI_COMPAT_MODEL || "gemini-2.5-flash",
    env.GEMINI_OPENAI_BASE_URL || "",
    env.GEMINI_API_KEY || "",
    "GEMINI_API_KEY",
    { priority: 2 }
  );

  // Priority 3: Free OpenRouter (:free) + Guarded Paid Overflow
  const openRouterUltraLanes = openRouterKeys.map((k) =>
    makeLane(
      "openrouter",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "https://openrouter.ai/api/v1",
      k.key,
      k.keyName,
      { priority: 3 }
    )
  );
  const openRouterGemmaLanes = openRouterKeys.map((k) =>
    makeLane(
      "openrouter",
      "google/gemma-4-31b-it:free",
      "https://openrouter.ai/api/v1",
      k.key,
      k.keyName,
      { priority: 3 }
    )
  );
  const paidOverflowLanes = [];
  if (String(env.OPENROUTER_ALLOW_PAID_OVERFLOW ?? "false").toLowerCase() === "true" && openRouterKeys[0]) {
    paidOverflowLanes.push(
      makeLane(
        "openrouter-paid-overflow",
        "qwen/qwen-max",
        "https://openrouter.ai/api/v1",
        openRouterKeys[0].key,
        openRouterKeys[0].keyName,
        { priority: 3, isPaidOverflow: true, inputPerMUsd: 1.6, outputPerMUsd: 6.4 }
      )
    );
  }
  if (env.XAI_API_KEY) {
    paidOverflowLanes.push(
      makeLane(
        "xai-credits",
        "grok-3-mini-fast",
        "https://api.x.ai/v1",
        env.XAI_API_KEY,
        "XAI_API_KEY",
        { priority: 3, isPaidOverflow: true, inputPerMUsd: 0.6, outputPerMUsd: 4.0 }
      )
    );
  }

  let ordered;
  if (taskType === "adversarial_audit") {
    ordered = [
      nimIsing,
      nimUltra,
      nimSuperVl,
      explabsArgon,
      aliyunDeepseek,
      zenJev,
      ...(nousActive ? [nousPrimary] : []),
      aliyunQwen4,
      explabsDeepseek,
      workersAiLlama,
      hfProQwen,
      geminiCompat,
      ...openRouterUltraLanes,
      ...openRouterGemmaLanes,
      ...paidOverflowLanes,
    ];
  } else if (taskType === "fast_watchdog") {
    ordered = [
      nimLightning,
      zenMimo,
      zenFlash,
      workersAiLlama,
      ...(nousActive ? [nousPrimary] : []),
      aliyunFlash,
      commandCodeLane,
      hfProQwen,
      geminiCompat,
      ...openRouterGemmaLanes,
      ...paidOverflowLanes,
    ];
  } else {
    // deep_corpus / reasoning default
    ordered = [
      ...(nousActive ? [nousPrimary] : []),
      ...(nanoSubActive ? [nanogptProSub] : []),
      aliyunQwen4,
      aliyunDeepseek,
      dashscopeQwen4,
      dashscopeQwenPlus,
      nimUltra,
      nimSuperVl,
      nimIsing,
      explabsArgon,
      explabsDeepseek,
      zenFlash,
      zenJev,
      workersAiLlama,
      commandCodeLane,
      hfProQwen,
      geminiCompat,
      ...openRouterUltraLanes,
      ...openRouterGemmaLanes,
      ...paidOverflowLanes,
    ];
  }

  return ordered.filter((lane) => Boolean(lane.apiKey) && Boolean(lane.baseUrl));
}

function readCircuitBreaker(cbPath) {
  if (!cbPath || !existsSync(cbPath)) return {};
  try {
    return JSON.parse(readFileSync(cbPath, "utf8"));
  } catch {
    return {};
  }
}

function writeCircuitBreaker(cbPath, state) {
  if (!cbPath) return;
  mkdirSync(dirname(cbPath), { recursive: true });
  writeFileSync(cbPath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function appendLedger(ledgerPath, entry) {
  if (!ledgerPath) return;
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, JSON.stringify(entry) + "\n", "utf8");
}

function sleep(ms) {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

export function parseOpenAiCompatibleResponseText(rawText) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) {
    return { content: "", reasoningContent: "", usage: null, streamChunks: 0 };
  }
  if (trimmed.startsWith("{")) {
    const data = JSON.parse(trimmed);
    const choice = data?.choices?.[0];
    const msg = choice?.message || {};
    return {
      content: typeof msg.content === "string" ? msg.content.trim() : "",
      reasoningContent: typeof msg.reasoning_content === "string" ? msg.reasoning_content.trim() : "",
      usage: data?.usage || null,
      streamChunks: 0,
    };
  }

  // SSE parsing (data: {...}\n\n)
  let content = "";
  let reasoningContent = "";
  let usage = null;
  let streamChunks = 0;
  for (const line of trimmed.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean.startsWith("data:")) continue;
    const payload = clean.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const evt = JSON.parse(payload);
      streamChunks++;
      const delta = evt?.choices?.[0]?.delta || evt?.choices?.[0]?.message || {};
      if (typeof delta.content === "string") content += delta.content;
      if (typeof delta.reasoning_content === "string") reasoningContent += delta.reasoning_content;
      if (evt?.usage) usage = evt.usage;
    } catch {
      // Ignore partial SSE comment/keepalive chunk
    }
  }
  return {
    content: content.trim(),
    reasoningContent: reasoningContent.trim(),
    usage,
    streamChunks,
  };
}

async function callOpenAiCompatLane({
  lane,
  messages,
  maxTokens,
  temperature,
  timeoutMs,
  fetchImpl,
  retryDelayMs,
  stream,
  reasoningEffort,
  maxPaidRetries = DEFAULT_PAID_MAX_RETRIES,
}) {
  if (lane.provider === "nous-portal-free-promo") {
    assertSafeNousModel(lane.model);
  }
  const effectiveMaxTokens =
    lane.provider === "nous-portal-free-promo" || lane.model.includes("qwen4-max")
      ? Math.max(4096, maxTokens)
      : maxTokens;

  const useStream = typeof stream === "boolean" ? stream : Boolean(lane.streamDefault);
  const effReasoning = reasoningEffort ?? lane.reasoningEffort ?? undefined;

  const endpoint = `${lane.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const maxAttempts = lane.isPaidOverflow ? Math.max(1, maxPaidRetries) : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = Date.now();
    try {
      const reqBody = {
        model: lane.model,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature,
        ...(useStream ? { stream: true } : {}),
        ...(effReasoning ? { reasoning_effort: effReasoning } : {}),
      };
      const resp = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lane.apiKey}`,
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - t0;
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        const retriable = !lane.isPaidOverflow && (resp.status === 429 || resp.status >= 500);
        const msg = `HTTP ${resp.status} from ${lane.provider}/${lane.model}: ${errBody.slice(0, 160)}`;
        if (retriable && attempt < maxAttempts) {
          await sleep(retryDelayMs);
          continue;
        }
        throw new Error(msg);
      }

      const rawText = await resp.text();
      const parsed = parseOpenAiCompatibleResponseText(rawText);

      if (parsed.content) {
        return {
          text: parsed.content,
          usedReasoningFallback: false,
          latencyMs,
          effectiveMaxTokens,
          usage: parsed.usage,
          streamChunks: parsed.streamChunks,
        };
      }
      if (!lane.isPaidOverflow && attempt < maxAttempts) {
        await sleep(retryDelayMs);
        continue;
      }
      if (parsed.reasoningContent) {
        return {
          text: parsed.reasoningContent,
          usedReasoningFallback: true,
          latencyMs,
          effectiveMaxTokens,
          usage: parsed.usage,
          streamChunks: parsed.streamChunks,
        };
      }
      throw new Error(`EMPTY_CONTENT from ${lane.provider}/${lane.model} (max_tokens=${effectiveMaxTokens})`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`EXHAUSTED_RETRIES on ${lane.provider}/${lane.model}`);
}

function tryCliFallback(messages) {
  const prompt = messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n");
  const candidates = [
    { cmd: "opencode", args: ["run", prompt], provider: "opencode-cli", model: "opencode-default" },
    { cmd: "commandcode", args: ["-p", prompt, "-t", "--no-session", "--max-turns", "1"], provider: "commandcode-cli", model: "commandcode-free" },
  ];
  for (const c of candidates) {
    const t0 = Date.now();
    try {
      const res = spawnSync(c.cmd, c.args, {
        encoding: "utf8",
        timeout: 45000,
        windowsHide: true,
      });
      const out = (res.stdout || "").trim();
      if (res.status === 0 && out.length > 0 && !/not logged in|expired/i.test(out)) {
        return {
          provider: c.provider,
          model: c.model,
          text: out,
          latencyMs: Date.now() - t0,
          usedReasoningFallback: false,
          usage: null,
        };
      }
    } catch {
      // Ignore CLI fallback failures so next runner or caller handles cleanly
    }
  }
  return null;
}

export async function dispatchMultiBrain({
  messages,
  taskType = "reasoning",
  maxTokens = 8192,
  temperature = 0.2,
  allowCliFallback = true,
  preferredLanes = null,
  stream = undefined,
  reasoningEffort = undefined,
  maxJobCostUsd = DEFAULT_PAID_JOB_COST_CEILING_USD,
  maxPaidRetries = DEFAULT_PAID_MAX_RETRIES,
  nowMs = Date.now(),
  timeoutMs = 120000,
  retryDelayMs = 800,
  cooldownMs = 120000,
  env = null,
  fetchImpl = globalThis.fetch,
  repoRoot = DEFAULT_REPO_ROOT,
  reportsDir = null,
} = {}) {
  const resolvedEnv = env || loadEnvFromDisk(repoRoot);
  const outReports = reportsDir === false ? null : reportsDir || resolve(repoRoot, "reports/autonomous");
  const cbPath = outReports ? resolve(outReports, "circuit-breaker-state.json") : null;
  const ledgerPath = outReports ? resolve(outReports, "dispatch-ledger.jsonl") : null;

  const cbState = readCircuitBreaker(cbPath);
  const candidates = preferredLanes || buildCandidateLanes(taskType, resolvedEnv, nowMs);
  const errors = [];
  let hop = 0;
  const inputChars = (messages || []).reduce((acc, m) => acc + String(m?.content || "").length, 0);

  for (const lane of candidates) {
    const laneKey = `${lane.provider}:${lane.model}:${lane.keyLabel || "default"}`;
    const openUntil = cbState[laneKey]?.openUntilMs || 0;
    if (openUntil > nowMs) {
      errors.push(`${laneKey} skipped (circuit open until ${new Date(openUntil).toISOString()})`);
      continue;
    }

    if (lane.provider === "nous-portal-free-promo") {
      try {
        assertSafeNousModel(lane.model, resolvedEnv);
      } catch (guardErr) {
        errors.push(`${laneKey} blocked: ${guardErr.message}`);
        continue;
      }
    }

    if (lane.provider === "nanogpt-pro-sub") {
      try {
        assertSafeNanoGptEndpoint(lane.baseUrl, resolvedEnv, nowMs);
      } catch (guardErr) {
        errors.push(`${laneKey} blocked: ${guardErr.message}`);
        continue;
      }
    }

    if (lane.isPaidOverflow) {
      const estCostUsd = estimatePaidCostUsd({
        inputChars,
        maxTokens,
        inputPerM: lane.inputPerMUsd ?? 1.0,
        outputPerM: lane.outputPerMUsd ?? 4.0,
      });
      if (estCostUsd > maxJobCostUsd) {
        errors.push(`${laneKey} blocked: estimated paid overflow cost $${estCostUsd.toFixed(4)} > $${maxJobCostUsd.toFixed(4)} ceiling`);
        continue;
      }
    }

    try {
      const res = await callOpenAiCompatLane({
        lane,
        messages,
        maxTokens,
        temperature,
        timeoutMs,
        fetchImpl,
        retryDelayMs,
        stream,
        reasoningEffort,
        maxPaidRetries,
      });

      if (cbState[laneKey]) {
        delete cbState[laneKey];
        writeCircuitBreaker(cbPath, cbState);
      }

      const estimatedCostUsd = lane.isPaidOverflow
        ? estimatePaidCostUsd({
            inputChars,
            maxTokens: res.usage?.completion_tokens ?? maxTokens,
            inputPerM: lane.inputPerMUsd ?? 1.0,
            outputPerM: lane.outputPerMUsd ?? 4.0,
          })
        : 0;

      const receipt = {
        timestamp: new Date(nowMs).toISOString(),
        taskType,
        provider: lane.provider,
        model: lane.model,
        priority: lane.priority ?? 1,
        latencyMs: res.latencyMs,
        fallbackHopCount: hop,
        effectiveMaxTokens: res.effectiveMaxTokens,
        usedReasoningFallback: res.usedReasoningFallback,
        streamChunks: res.streamChunks ?? 0,
        estimatedCostUsd,
        tokens: res.usage || null,
        status: "ok",
      };
      appendLedger(ledgerPath, receipt);
      return { ...receipt, text: res.text, errors };
    } catch (err) {
      hop++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${laneKey}: ${msg}`);
      cbState[laneKey] = {
        openUntilMs: nowMs + cooldownMs,
        lastError: msg.slice(0, 180),
        updatedAt: new Date(nowMs).toISOString(),
      };
      writeCircuitBreaker(cbPath, cbState);
    }
  }

  if (allowCliFallback) {
    const cliRes = tryCliFallback(messages);
    if (cliRes) {
      const receipt = {
        timestamp: new Date(nowMs).toISOString(),
        taskType,
        provider: cliRes.provider,
        model: cliRes.model,
        priority: 1,
        latencyMs: cliRes.latencyMs,
        fallbackHopCount: hop,
        usedReasoningFallback: false,
        estimatedCostUsd: 0,
        tokens: null,
        status: "ok_cli_fallback",
      };
      appendLedger(ledgerPath, receipt);
      return { ...receipt, text: cliRes.text, errors };
    }
  }

  const failReceipt = {
    timestamp: new Date(nowMs).toISOString(),
    taskType,
    provider: "none",
    model: "none",
    latencyMs: 0,
    fallbackHopCount: hop,
    tokens: null,
    status: "all_lanes_failed",
    errorSummary: errors.slice(0, 5),
  };
  appendLedger(ledgerPath, failReceipt);
  throw new Error(`ALL_MULTI_BRAIN_LANES_FAILED (${errors.length} attempts): ${errors.join(" | ")}`);
}

/**
 * Execute multiple multi-brain jobs concurrently (default 6x parallel pool)
 * without failing the batch on single-item errors.
 */
export async function dispatchBatchParallel(
  jobs,
  { concurrency = DEFAULT_PARALLEL_CONCURRENCY, ...sharedOptions } = {},
) {
  const items = Array.isArray(jobs) ? jobs : [];
  const results = new Array(items.length);
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const job = items[index];
      try {
        const result = await dispatchMultiBrain({ ...sharedOptions, ...job });
        results[index] = { index, ok: true, result };
      } catch (err) {
        results[index] = {
          index,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
