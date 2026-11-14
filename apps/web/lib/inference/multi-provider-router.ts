/**
 * Pluggable Multi-Provider Inference Router (Track 1 — Zero-Waste Leverage)
 *
 * Defaults every agent seat and workflow to zero-cost / credit-backed lanes
 * (`free` via ModelScope DeepSeek-V4.1-Flash-1017, NVIDIA NIM, OpenRouter `:free`,
 * or GCP Gemini Vertex free/credit tier) while preserving explicit pluggable
 * opt-in for DeepSeek V4.1-Flash-1017 paid OpenRouter/Bedrock (`deepseek_1017`)
 * with hard per-run cost caps (`maxCostUsdPerRun`, default $0.50) and Google
 * Jules async task orchestration (`jules`).
 *
 * Designed to respect `scripts/guardrails/ai-transport-import-boundary.mjs`:
 * imports no vendor SDKs and no restricted Claude transport modules.
 */

import {
  callOpenAiCompatMessages,
  OpenAiCompatError,
} from "@/lib/claude-api/openai-compat";
import type { ClaudeMessagesResult } from "@/lib/claude-api/messages";

export type InferenceLaneId =
  | "free"
  | "deepseek_1017"
  | "gcp_credit"
  | "jules"
  | "hybrid_auto";

export type ProviderCandidateId =
  | "alibaba-qwencloud-free"
  | "nvidia-nim-free"
  | "modelscope-free"
  | "openrouter-free"
  | "openrouter-deepseek-1017"
  | "bedrock-deepseek-v32"
  | "gcp-vertex-gemini"
  | "google-jules";

export interface InferenceCandidate {
  readonly id: ProviderCandidateId;
  readonly lane: Exclude<InferenceLaneId, "hybrid_auto">;
  readonly providerLabel: string;
  readonly model: string;
  readonly endpointKind: "openai_compat" | "vertex_openai_compat" | "jules_rest" | "bedrock_bridge";
  readonly baseUrl: string;
  readonly envKeyName: string;
  readonly zeroCostDefault: boolean;
  readonly estimatedCostUsdPer1MTokens: number;
  readonly configured: boolean;
}

export interface CircuitBreakerEntry {
  failures: number;
  openedUntilMs: number | null;
  lastError: string | null;
}

export interface CircuitBreakerOptions {
  readonly failureThreshold?: number;
  readonly cooldownMs?: number;
}

export interface RoutedInferenceRequest {
  readonly taskType: string;
  readonly seatId?: string;
  readonly lane?: InferenceLaneId;
  readonly modelOverride?: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly maxCostUsdPerRun?: number;
  readonly spentUsdThisRun?: number;
  readonly allowOfflineFallback?: boolean;
  readonly nowMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly customDispatch?: (
    candidate: InferenceCandidate,
    req: RoutedInferenceRequest,
  ) => Promise<{
    readonly text: string;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly costUsd?: number;
    readonly modelResolved?: string;
  }>;
}

export interface RoutedInferenceAttempt {
  readonly candidateId: ProviderCandidateId;
  readonly model: string;
  readonly ok: boolean;
  readonly skippedReason?: string;
  readonly error?: string;
  readonly durationMs: number;
  readonly costUsd: number;
}

export interface RoutedInferenceResult {
  readonly ok: boolean;
  readonly mode: "LIVE_PROVIDER" | "OFFLINE_DETERMINISTIC_FALLBACK" | "NO_PROVIDER_CONFIGURED";
  readonly laneRequested: InferenceLaneId;
  readonly providerUsed: ProviderCandidateId | "deterministic-offline";
  readonly modelUsed: string;
  readonly text: string;
  readonly costUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly budgetRemainingUsd: number;
  readonly attempts: readonly RoutedInferenceAttempt[];
}

export const DEFAULT_MAX_COST_USD_PER_RUN = 0.5;
export const DEFAULT_GCP_CREDIT_BALANCE_USD = 103.11;

const CIRCUIT_STATE = new Map<ProviderCandidateId, CircuitBreakerEntry>();

export function resetInferenceCircuitBreakers(): void {
  CIRCUIT_STATE.clear();
}

export function getInferenceCircuitBreakerSnapshot(): Readonly<
  Record<string, CircuitBreakerEntry>
> {
  const out: Record<string, CircuitBreakerEntry> = {};
  for (const [key, val] of CIRCUIT_STATE.entries()) {
    out[key] = { ...val };
  }
  return out;
}

export function resolveInferenceLane(
  explicitLane?: InferenceLaneId | string | null,
  env: Readonly<Record<string, string | undefined>> = process.env,
): InferenceLaneId {
  const raw = (explicitLane ?? env["GSE_INFERENCE_LANE"] ?? "hybrid_auto")
    .trim()
    .toLowerCase();
  if (
    raw === "free" ||
    raw === "deepseek_1017" ||
    raw === "gcp_credit" ||
    raw === "jules" ||
    raw === "hybrid_auto"
  ) {
    return raw;
  }
  return "hybrid_auto";
}

function truthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function buildCandidateCatalog(
  env: Readonly<Record<string, string | undefined>> = process.env,
  modelOverride?: string,
): readonly InferenceCandidate[] {
  const qwencloudModel =
    modelOverride ||
    env["QWENCLOUD_FREE_MODEL"]?.trim() ||
    "deepseek-v4-flash-0731";
  const qwencloudKey =
    env["DASHSCOPE_API_KEY"]?.trim() ||
    env["QWEN_GSE_API_KEY"]?.trim() ||
    "";
  const modelscopeModel =
    modelOverride ||
    env["MODELSCOPE_DEEPSEEK_MODEL"]?.trim() ||
    "deepseek-ai/DeepSeek-V4.1-Flash-1017";
  const nimModel =
    modelOverride ||
    env["NVIDIA_NIM_DEEPSEEK_MODEL"]?.trim() ||
    "nvidia/nemotron-3-ultra-550b-a55b";
  const nimKey =
    env["NVIDIA_GSE_API_KEY"]?.trim() ||
    env["NVIDIA_API_KEY"]?.trim() ||
    "";
  const openrouterFreeModel =
    modelOverride ||
    env["OPENROUTER_FREE_MODEL"]?.trim() ||
    "cohere/north-mini-code:free";
  const openrouterPaidModel =
    modelOverride ||
    env["OPENROUTER_DEEPSEEK_1017_MODEL"]?.trim() ||
    "deepseek/deepseek-v4.1-flash-1017";
  const bedrockModel =
    modelOverride ||
    env["BEDROCK_DEEPSEEK_MODEL"]?.trim() ||
    "deepseek.v3.2";
  const gcpProject = env["GOOGLE_CLOUD_PROJECT"]?.trim() || "galaxysportsedge";
  const vertexLocation = env["GCP_VERTEX_LOCATION"]?.trim() || "us-central1";
  const vertexModel =
    modelOverride ||
    env["GCP_VERTEX_GEMINI_MODEL"]?.trim() ||
    "google/gemini-2.5-flash";

  const paid1017OptIn = truthyFlag(env["GSE_ENABLE_PAID_DEEPSEEK_1017"]);
  const bedrockOptIn = truthyFlag(env["GSE_ENABLE_BEDROCK_DEEPSEEK"]);
  const gcpOptIn =
    Boolean(env["VERTEX_COMPAT_BASE_URL"]?.trim()) ||
    (Boolean(env["GCP_VERTEX_ACCESS_TOKEN"]?.trim()) && truthyFlag(env["GSE_ENABLE_GCP_CREDIT_LANE"]));

  return [
    {
      id: "alibaba-qwencloud-free",
      lane: "free",
      providerLabel: "Alibaba QwenCloud Model Studio Free Pool",
      model: qwencloudModel,
      endpointKind: "openai_compat",
      baseUrl:
        env["DASHSCOPE_BASE_URL"]?.trim() ||
        "https://ws-aag60zrmf64la4ue.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
      envKeyName: "DASHSCOPE_API_KEY",
      zeroCostDefault: true,
      estimatedCostUsdPer1MTokens: 0,
      configured: Boolean(qwencloudKey),
    },
    {
      id: "nvidia-nim-free",
      lane: "free",
      providerLabel: "NVIDIA NIM Free Developer Tier",
      model: nimModel,
      endpointKind: "openai_compat",
      baseUrl: env["NVIDIA_NIM_BASE_URL"]?.trim() || "https://integrate.api.nvidia.com/v1",
      envKeyName: "NVIDIA_GSE_API_KEY",
      zeroCostDefault: true,
      estimatedCostUsdPer1MTokens: 0,
      configured: Boolean(nimKey),
    },
    {
      id: "modelscope-free",
      lane: "free",
      providerLabel: "ModelScope Free Inference",
      model: modelscopeModel,
      endpointKind: "openai_compat",
      baseUrl: env["MODELSCOPE_BASE_URL"]?.trim() || "https://api-inference.modelscope.cn/v1",
      envKeyName: "MODELSCOPE_API_KEY",
      zeroCostDefault: true,
      estimatedCostUsdPer1MTokens: 0,
      configured: Boolean(env["MODELSCOPE_API_KEY"]?.trim()),
    },
    {
      id: "openrouter-free",
      lane: "free",
      providerLabel: "OpenRouter Free Lane",
      model: openrouterFreeModel,
      endpointKind: "openai_compat",
      baseUrl: env["OPENROUTER_BASE_URL"]?.trim() || "https://openrouter.ai/api/v1",
      envKeyName: "OPENROUTER_API_KEY",
      zeroCostDefault: true,
      estimatedCostUsdPer1MTokens: 0,
      configured: Boolean(env["OPENROUTER_API_KEY"]?.trim()),
    },
    {
      id: "gcp-vertex-gemini",
      lane: "gcp_credit",
      providerLabel: "GCP Vertex Gemini ($103.11 Credit Pool)",
      model: vertexModel,
      endpointKind: "vertex_openai_compat",
      baseUrl:
        env["VERTEX_COMPAT_BASE_URL"]?.trim() ||
        `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${gcpProject}/locations/${vertexLocation}/endpoints/openapi`,
      envKeyName: "GCP_VERTEX_ACCESS_TOKEN",
      zeroCostDefault: false,
      estimatedCostUsdPer1MTokens: 0.3,
      configured: gcpOptIn,
    },
    {
      id: "openrouter-deepseek-1017",
      lane: "deepseek_1017",
      providerLabel: "OpenRouter DeepSeek V4.1-Flash-1017 (Capped Paid)",
      model: openrouterPaidModel,
      endpointKind: "openai_compat",
      baseUrl: env["OPENROUTER_BASE_URL"]?.trim() || "https://openrouter.ai/api/v1",
      envKeyName: "OPENROUTER_API_KEY",
      zeroCostDefault: false,
      estimatedCostUsdPer1MTokens: 0.25,
      configured: Boolean(env["OPENROUTER_API_KEY"]?.trim()) && paid1017OptIn,
    },
    {
      id: "bedrock-deepseek-v32",
      lane: "deepseek_1017",
      providerLabel: "AWS Bedrock DeepSeek V3.2 (Credit/Paid Bridge)",
      model: bedrockModel,
      endpointKind: "bedrock_bridge",
      baseUrl: env["BEDROCK_PROXY_BASE_URL"]?.trim() || "",
      envKeyName: "BEDROCK_PROXY_BASE_URL",
      zeroCostDefault: false,
      estimatedCostUsdPer1MTokens: 0.28,
      configured: Boolean(env["BEDROCK_PROXY_BASE_URL"]?.trim()) && bedrockOptIn,
    },
    {
      id: "google-jules",
      lane: "jules",
      providerLabel: "Google Jules Async Engineering API",
      model: "jules-v1alpha",
      endpointKind: "jules_rest",
      baseUrl: env["JULES_API_BASE"]?.trim() || "https://jules.googleapis.com/v1alpha",
      envKeyName: "JULES_API_KEY",
      zeroCostDefault: true,
      estimatedCostUsdPer1MTokens: 0,
      configured: Boolean(env["JULES_API_KEY"]?.trim()),
    },
  ];
}

export function selectInferenceChain(
  lane: InferenceLaneId,
  catalog: readonly InferenceCandidate[],
): readonly InferenceCandidate[] {
  if (lane === "free") {
    return catalog.filter((c) => c.lane === "free");
  }
  if (lane === "deepseek_1017") {
    const primary = catalog.filter((c) => c.lane === "deepseek_1017");
    const freeFallback = catalog.filter((c) => c.lane === "free");
    return [...primary, ...freeFallback];
  }
  if (lane === "gcp_credit") {
    const primary = catalog.filter((c) => c.lane === "gcp_credit");
    const freeFallback = catalog.filter((c) => c.lane === "free");
    return [...primary, ...freeFallback];
  }
  if (lane === "jules") {
    return catalog.filter((c) => c.lane === "jules");
  }
  // hybrid_auto: verified Dual-Cloud free lanes first (Alibaba QwenCloud -> NVIDIA NIM -> ModelScope -> OpenRouter free),
  // then credit-backed Vertex, then capped DeepSeek-1017 paid fallback.
  const order: ProviderCandidateId[] = [
    "alibaba-qwencloud-free",
    "nvidia-nim-free",
    "modelscope-free",
    "openrouter-free",
    "gcp-vertex-gemini",
    "openrouter-deepseek-1017",
    "bedrock-deepseek-v32",
  ];
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return order
    .map((id) => byId.get(id))
    .filter((c): c is InferenceCandidate => c !== undefined);
}

function resolveCandidateApiKey(
  candidate: InferenceCandidate,
  env: Readonly<Record<string, string | undefined>>,
): string {
  const direct = env[candidate.envKeyName]?.trim();
  if (direct) return direct;
  if (candidate.id === "alibaba-qwencloud-free") {
    return env["QWEN_GSE_API_KEY"]?.trim() ?? "";
  }
  if (candidate.id === "nvidia-nim-free") {
    return env["NVIDIA_API_KEY"]?.trim() ?? "";
  }
  return "";
}

function isCircuitOpen(id: ProviderCandidateId, nowMs: number): boolean {
  const entry = CIRCUIT_STATE.get(id);
  if (!entry || entry.openedUntilMs === null) return false;
  if (nowMs >= entry.openedUntilMs) {
    entry.openedUntilMs = null;
    entry.failures = 0;
    return false;
  }
  return true;
}

function recordCircuitSuccess(id: ProviderCandidateId): void {
  CIRCUIT_STATE.set(id, { failures: 0, openedUntilMs: null, lastError: null });
}

function recordCircuitFailure(
  id: ProviderCandidateId,
  error: string,
  nowMs: number,
  opts?: CircuitBreakerOptions,
): void {
  const threshold = opts?.failureThreshold ?? 2;
  const cooldownMs = opts?.cooldownMs ?? 5 * 60 * 1000;
  const prev = CIRCUIT_STATE.get(id) ?? { failures: 0, openedUntilMs: null, lastError: null };
  const failures = prev.failures + 1;
  const openedUntilMs = failures >= threshold ? nowMs + cooldownMs : null;
  CIRCUIT_STATE.set(id, { failures, openedUntilMs, lastError: error });
}

function estimateCostUsd(
  candidate: InferenceCandidate,
  inputTokens: number,
  outputTokens: number,
  explicitCostUsd?: number,
): number {
  if (typeof explicitCostUsd === "number" && Number.isFinite(explicitCostUsd) && explicitCostUsd >= 0) {
    return Number(explicitCostUsd.toFixed(6));
  }
  if (candidate.zeroCostDefault) return 0;
  const totalTokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
  return Number(((totalTokens / 1_000_000) * candidate.estimatedCostUsdPer1MTokens).toFixed(6));
}

async function callOpenRouterWithCostTracking(
  candidate: InferenceCandidate,
  apiKey: string,
  req: RoutedInferenceRequest,
): Promise<{
  readonly text: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
  readonly modelResolved: string;
}> {
  // For free OpenRouter candidates or when no custom fetch cost probe is needed,
  // we can use the shared OpenAI-compat client for clean parity, and extract
  // `usage.cost` directly when using OpenRouter paid 1017.
  if (candidate.id === "openrouter-deepseek-1017" && !req.fetchImpl) {
    const url = `${candidate.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: candidate.model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.2,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenRouter HTTP ${res.status}: ${txt.slice(0, 240)}`);
    }
    const payload = (await res.json()) as {
      readonly choices?: readonly { readonly message?: { readonly content?: string } }[];
      readonly usage?: {
        readonly prompt_tokens?: number;
        readonly completion_tokens?: number;
        readonly cost?: number;
      };
    };
    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("OpenRouter returned empty content");
    const inputTokens = payload.usage?.prompt_tokens ?? 0;
    const outputTokens = payload.usage?.completion_tokens ?? 0;
    const costUsd = estimateCostUsd(candidate, inputTokens, outputTokens, payload.usage?.cost);
    return { text, inputTokens, outputTokens, costUsd, modelResolved: candidate.model };
  }

  const res: ClaudeMessagesResult = await callOpenAiCompatMessages({
    baseUrl: candidate.baseUrl,
    apiKey,
    model: candidate.model,
    system: req.system,
    user: req.user,
    maxTokens: req.maxTokens ?? 1024,
    temperature: req.temperature ?? 0.2,
    fetchImpl: req.fetchImpl,
    ledgerPrefix: `${candidate.id}/`,
  });
  const inputTokens = res.inputTokens ?? 0;
  const outputTokens = res.outputTokens ?? 0;
  const costUsd = estimateCostUsd(candidate, inputTokens, outputTokens);
  return {
    text: res.text,
    inputTokens,
    outputTokens,
    costUsd,
    modelResolved: res.modelName ? res.modelName.replace(`${candidate.id}/`, "") : candidate.model,
  };
}

async function callJulesSourcesProbe(
  candidate: InferenceCandidate,
  apiKey: string,
  req: RoutedInferenceRequest,
): Promise<{
  readonly text: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
  readonly modelResolved: string;
}> {
  const fetchImpl = req.fetchImpl ?? fetch;
  const url = `${candidate.baseUrl.replace(/\/+$/, "")}/sources?pageSize=20`;
  const res = await fetchImpl(url, {
    method: "GET",
    headers: { "X-Goog-Api-Key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jules API HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { readonly sources?: readonly unknown[] };
  const sourceCount = Array.isArray(data.sources) ? data.sources.length : 0;
  return {
    text: JSON.stringify({
      julesConnected: true,
      sourceCount,
      taskType: req.taskType,
      seatId: req.seatId ?? "jarvis",
    }),
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    modelResolved: candidate.model,
  };
}

export async function routeInferenceWithFallback(
  req: RoutedInferenceRequest,
  circuitOpts?: CircuitBreakerOptions,
): Promise<RoutedInferenceResult> {
  const env = req.env ?? process.env;
  const nowMs = req.nowMs ?? Date.now();
  const maxCostUsd = req.maxCostUsdPerRun ?? DEFAULT_MAX_COST_USD_PER_RUN;
  const spentSoFar = req.spentUsdThisRun ?? 0;
  const laneRequested = resolveInferenceLane(req.lane, env);
  const catalog = buildCandidateCatalog(env, req.modelOverride);
  const chain = selectInferenceChain(laneRequested, catalog);

  const attempts: RoutedInferenceAttempt[] = [];

  for (const candidate of chain) {
    const budgetRemaining = Math.max(0, Number((maxCostUsd - spentSoFar).toFixed(6)));
    if (!candidate.zeroCostDefault && budgetRemaining <= 0) {
      attempts.push({
        candidateId: candidate.id,
        model: candidate.model,
        ok: false,
        skippedReason: "COST_CEILING_REACHED",
        durationMs: 0,
        costUsd: 0,
      });
      continue;
    }

    if (isCircuitOpen(candidate.id, nowMs)) {
      attempts.push({
        candidateId: candidate.id,
        model: candidate.model,
        ok: false,
        skippedReason: "CIRCUIT_OPEN",
        durationMs: 0,
        costUsd: 0,
      });
      continue;
    }

    if (!candidate.configured && !req.customDispatch) {
      attempts.push({
        candidateId: candidate.id,
        model: candidate.model,
        ok: false,
        skippedReason: `UNCONFIGURED:${candidate.envKeyName}`,
        durationMs: 0,
        costUsd: 0,
      });
      continue;
    }

    const startedAt = Date.now();
    try {
      if (req.customDispatch) {
        const out = await req.customDispatch(candidate, req);
        const costUsd = estimateCostUsd(
          candidate,
          out.inputTokens ?? 0,
          out.outputTokens ?? 0,
          out.costUsd,
        );
        if (!candidate.zeroCostDefault && spentSoFar + costUsd > maxCostUsd + 1e-9) {
          recordCircuitFailure(candidate.id, "COST_CEILING_EXCEEDED", nowMs, circuitOpts);
          attempts.push({
            candidateId: candidate.id,
            model: candidate.model,
            ok: false,
            error: "COST_CEILING_EXCEEDED",
            durationMs: Date.now() - startedAt,
            costUsd,
          });
          continue;
        }
        recordCircuitSuccess(candidate.id);
        attempts.push({
          candidateId: candidate.id,
          model: out.modelResolved ?? candidate.model,
          ok: true,
          durationMs: Date.now() - startedAt,
          costUsd,
        });
        return {
          ok: true,
          mode: "LIVE_PROVIDER",
          laneRequested,
          providerUsed: candidate.id,
          modelUsed: out.modelResolved ?? candidate.model,
          text: out.text,
          costUsd,
          inputTokens: out.inputTokens ?? 0,
          outputTokens: out.outputTokens ?? 0,
          budgetRemainingUsd: Math.max(0, Number((maxCostUsd - spentSoFar - costUsd).toFixed(6))),
          attempts,
        };
      }

      const apiKey = resolveCandidateApiKey(candidate, env);
      const response =
        candidate.endpointKind === "jules_rest"
          ? await callJulesSourcesProbe(candidate, apiKey, req)
          : await callOpenRouterWithCostTracking(candidate, apiKey, req);

      recordCircuitSuccess(candidate.id);
      attempts.push({
        candidateId: candidate.id,
        model: response.modelResolved,
        ok: true,
        durationMs: Date.now() - startedAt,
        costUsd: response.costUsd,
      });
      return {
        ok: true,
        mode: "LIVE_PROVIDER",
        laneRequested,
        providerUsed: candidate.id,
        modelUsed: response.modelResolved,
        text: response.text,
        costUsd: response.costUsd,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        budgetRemainingUsd: Math.max(
          0,
          Number((maxCostUsd - spentSoFar - response.costUsd).toFixed(6)),
        ),
        attempts,
      };
    } catch (err) {
      const msg =
        err instanceof OpenAiCompatError
          ? `HTTP_${err.status}:${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      recordCircuitFailure(candidate.id, msg, nowMs, circuitOpts);
      attempts.push({
        candidateId: candidate.id,
        model: candidate.model,
        ok: false,
        error: msg,
        durationMs: Date.now() - startedAt,
        costUsd: 0,
      });
    }
  }

  const allowOffline = req.allowOfflineFallback ?? true;
  if (allowOffline) {
    return {
      ok: true,
      mode: "OFFLINE_DETERMINISTIC_FALLBACK",
      laneRequested,
      providerUsed: "deterministic-offline",
      modelUsed: "deterministic-governance-v1",
      text: JSON.stringify({
        deterministicFallback: true,
        taskType: req.taskType,
        seatId: req.seatId ?? "jarvis",
        summary: "Executed deterministic governance evaluation without live paid LLM spend.",
      }),
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      budgetRemainingUsd: Math.max(0, Number((maxCostUsd - spentSoFar).toFixed(6))),
      attempts,
    };
  }

  return {
    ok: false,
    mode: "NO_PROVIDER_CONFIGURED",
    laneRequested,
    providerUsed: "deterministic-offline",
    modelUsed: "none",
    text: "",
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    budgetRemainingUsd: Math.max(0, Number((maxCostUsd - spentSoFar).toFixed(6))),
    attempts,
  };
}
