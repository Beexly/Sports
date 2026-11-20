/**
 * Content free-lane dispatcher.
 *
 * Chain (max free reward, same governance):
 *   1) Cerebras (gpt-oss-120b) when CONTENT_FREE_LANE_ENABLED + CEREBRAS_API_KEY
 *   2) Secondary OpenAI-compat free host (Gemma / Nemotron / etc.) when
 *      FREE_LANE_SECONDARY_BASE_URL + FREE_LANE_SECONDARY_MODEL set
 *   3) callClaude → Jynx multi-cloud credits → Anthropic cash
 *
 * Surfaces: free-lane-policy allow-list only (content, brief).
 */
import { callClaude } from "./provider-dispatch";
import type { ClaudeMessagesRequest, ClaudeMessagesResult } from "./messages";
import { callCerebrasMessages, CerebrasMessagesError } from "./providers/cerebras";
import { callOpenAiCompatMessages, OpenAiCompatError } from "./openai-compat";
import { pickModelForSurface, type ClaudeSurface } from "./model-router";
import { capturePostHogAiGeneration } from "@/lib/observability/posthog-grant-governor";
import {
  withResponseCache,
  type ResponseCacheStore,
} from "./response-cache";
import {
  FREE_LANE_SURFACES,
  isFreeLaneEnabled,
  shouldUseFreeLane,
} from "./free-lane-policy";

export { FREE_LANE_SURFACES, isFreeLaneEnabled, shouldUseFreeLane };

type Env = Record<string, string | undefined>;

export interface ContentMessagesRequest extends ClaudeMessagesRequest {
  readonly cerebrasModel?: string;
  readonly cacheStore?: ResponseCacheStore;
}

export const ALIBABA_DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
export const ALIBABA_DEFAULT_MODEL = "qwen-plus";

export interface AlibabaCreditLaneConfig {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly ledgerPrefix: string;
}

/** Resolve Alibaba Cloud Model Studio / DashScope OpenAI-compatible lane when enabled. */
export function alibabaCreditLaneConfig(env: Env = process.env): AlibabaCreditLaneConfig | null {
  if (env["CONTENT_FREE_LANE_ENABLED"] !== "true") return null;
  const apiKey = env["ALIBABA_API_KEY"]?.trim() || env["DASHSCOPE_API_KEY"]?.trim();
  if (!apiKey) return null;
  const baseUrl = (
    env["ALIBABA_BASE_URL"]?.trim() ||
    env["DASHSCOPE_BASE_URL"]?.trim() ||
    ALIBABA_DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  const model =
    env["ALIBABA_MODEL"]?.trim() || env["DASHSCOPE_MODEL"]?.trim() || ALIBABA_DEFAULT_MODEL;
  return {
    baseUrl,
    model,
    apiKey,
    ledgerPrefix: "alibaba-qwen/",
  };
}

export function secondaryFreeLaneConfig(env: Env = process.env): {
  baseUrl: string;
  model: string;
  apiKey?: string;
  ledgerPrefix: string;
} | null {
  if (env["CONTENT_FREE_LANE_ENABLED"] !== "true") return null;
  const baseUrl = env["FREE_LANE_SECONDARY_BASE_URL"]?.trim();
  const model = env["FREE_LANE_SECONDARY_MODEL"]?.trim();
  if (baseUrl && model) {
    const apiKey = env["FREE_LANE_SECONDARY_API_KEY"]?.trim();
    const ledgerPrefix = env["FREE_LANE_SECONDARY_LEDGER_PREFIX"]?.trim() || "free-secondary/";
    return {
      baseUrl,
      model,
      ...(apiKey ? { apiKey } : {}),
      ledgerPrefix: ledgerPrefix.endsWith("/") ? ledgerPrefix : `${ledgerPrefix}/`,
    };
  }
  return null;
}

/**
 * Priority 0-1 $0 failover candidates used ONLY when CONTENT_FREE_LANE_ENABLED=true
 * and after explicit Cerebras / secondary Free-Lane slots have been attempted or omitted.
 */
export function resolvePriorityZeroFreeLanes(
  env: Env = process.env,
  nowMs: number = Date.now(),
): ReadonlyArray<{
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly ledgerPrefix: string;
}> {
  if (env["CONTENT_FREE_LANE_ENABLED"] !== "true") return [];
  const lanes: Array<{ baseUrl: string; model: string; apiKey: string; ledgerPrefix: string }> = [];

  const nousKey = (env["NOUS_API_KEY"] ?? env["NOUS_PORTAL_API_KEY"])?.trim();
  const nousPayg = String(env["NOUS_ALLOW_PAYG"] ?? "false").toLowerCase() === "true";
  const nousCutoffMs = Date.parse("2026-11-23T15:00:00Z");
  if (nousKey && !nousPayg && nowMs < nousCutoffMs) {
    lanes.push({
      baseUrl: (env["NOUS_BASE_URL"] ?? "https://inference-api.nousresearch.com/v1").trim(),
      model: "qwen/qwen4-max:free",
      apiKey: nousKey,
      ledgerPrefix: "free-nous/",
    });
  }

  const nimKey = (env["NVIDIA_GSE_API_KEY"] ?? env["NVIDIA_API_KEY"])?.trim();
  if (nimKey) {
    lanes.push({
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "nvidia/nemotron-3.5-lightning-30b-a3b",
      apiKey: nimKey,
      ledgerPrefix: "free-nim/",
    });
  }

  const deepinfraKey = (env["DEEPINFRA_API_KEY"] ?? env["DEEPINFRA_TOKEN"])?.trim();
  if (deepinfraKey) {
    lanes.push({
      baseUrl: (env["DEEPINFRA_BASE_URL"] ?? "https://api.deepinfra.com/v1/openai").trim().replace(/\/+$/, ""),
      model: (env["DEEPINFRA_MODEL"] ?? "meta-llama/Llama-3.3-70B-Instruct").trim(),
      apiKey: deepinfraKey,
      ledgerPrefix: "free-deepinfra/",
    });
  }

  const aliyunKey = env["ALIYUN_TOKENPLAN_KEY"]?.trim();
  if (aliyunKey) {
    lanes.push({
      baseUrl: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
      model: "qwen4-max",
      apiKey: aliyunKey,
      ledgerPrefix: "free-aliyun/",
    });
  }

  const cfToken = env["CLOUDFLARE_API_TOKEN"]?.trim();
  const cfAccount = (env["CLOUDFLARE_ACCOUNT_ID"] ?? "46f1c1d1c65d19f3f983713b3a8ab67c").trim();
  if (cfToken && cfAccount) {
    lanes.push({
      baseUrl: `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/v1`,
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      apiKey: cfToken,
      ledgerPrefix: "free-cf-ai/",
    });
  }

  const nanoKey = env["NANOGPT_API_KEY"]?.trim();
  const nanoDisabled = String(env["NANOGPT_DISABLED"] ?? "false").toLowerCase() === "true";
  const nanoCutoffMs = Date.parse(env["NANOGPT_SUBSCRIPTION_CUTOFF"] ?? "2026-12-05T00:00:00Z");
  if (nanoKey && !nanoDisabled && nowMs < nanoCutoffMs) {
    lanes.push({
      baseUrl: "https://nano-gpt.com/api/subscription/v1",
      model: (env["NANOGPT_SUB_MODEL"] ?? "Qwen/Qwen3-235B-A22B-Instruct-2507").trim(),
      apiKey: nanoKey,
      ledgerPrefix: "free-nanogpt-sub/",
    });
  }

  return lanes;
}

export function isSecondaryFreeLaneConfigured(env: Env = process.env): boolean {
  return secondaryFreeLaneConfig(env) !== null;
}

export async function generateContentMessages(
  request: ContentMessagesRequest,
  env: Env = process.env
): Promise<ClaudeMessagesResult> {
  const call = async (): Promise<ClaudeMessagesResult> => {
    if (shouldUseFreeLane(request.surface, env)) {
      const cerebrasKey = env["CEREBRAS_API_KEY"]?.trim();
      if (cerebrasKey) {
        try {
          return await callCerebrasMessages({
            apiKey: cerebrasKey,
            system: request.system,
            user: request.user,
            maxTokens: request.maxTokens,
            model: request.cerebrasModel,
            temperature: request.temperature,
            fetchImpl: request.fetchImpl,
          });
        } catch (error) {
          if (!(error instanceof CerebrasMessagesError)) throw error;
        }
      }

      const alibaba = alibabaCreditLaneConfig(env);
      if (alibaba) {
        try {
          return await callOpenAiCompatMessages({
            baseUrl: alibaba.baseUrl,
            apiKey: alibaba.apiKey,
            model: alibaba.model,
            system: request.system,
            user: request.user,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            fetchImpl: request.fetchImpl,
            ledgerPrefix: alibaba.ledgerPrefix,
          });
        } catch (error) {
          if (!(error instanceof OpenAiCompatError)) throw error;
        }
      }

      const secondary = secondaryFreeLaneConfig(env);
      if (secondary) {
        try {
          return await callOpenAiCompatMessages({
            baseUrl: secondary.baseUrl,
            apiKey: secondary.apiKey,
            model: secondary.model,
            system: request.system,
            user: request.user,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            fetchImpl: request.fetchImpl,
            ledgerPrefix: secondary.ledgerPrefix,
          });
        } catch (error) {
          if (!(error instanceof OpenAiCompatError)) throw error;
        }
      }

      for (const lane of resolvePriorityZeroFreeLanes(env)) {
        try {
          return await callOpenAiCompatMessages({
            baseUrl: lane.baseUrl,
            apiKey: lane.apiKey,
            model: lane.model,
            system: request.system,
            user: request.user,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            fetchImpl: request.fetchImpl,
            ledgerPrefix: lane.ledgerPrefix,
          });
        } catch (error) {
          if (!(error instanceof OpenAiCompatError)) throw error;
        }
      }
    }

    return callClaude(request, env);
  };

  const dispatchAndRecord = async (): Promise<ClaudeMessagesResult> => {
    const result = await call();
    const posthogKey = (env["POSTHOG_PROJECT_API_KEY"] ?? env["NEXT_PUBLIC_POSTHOG_KEY"])?.trim();
    if (posthogKey) {
      void capturePostHogAiGeneration(
        {
          traceId: `free-lane-${Date.now()}`,
          spanName: `free_lane_${request.surface ?? "content"}`,
          model: result.modelName,
          provider: result.modelName.includes("/") ? result.modelName.split("/")[0] : "free-lane",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencySeconds: Math.max(0, result.durationMs / 1000),
          pathname: `/api/internal/free-lane/${request.surface ?? "content"}`,
        },
        {
          apiKey: posthogKey,
          host: env["NEXT_PUBLIC_POSTHOG_HOST"],
        },
      ).catch(() => {});
    }
    return result;
  };

  if (
    env["LLM_RESPONSE_CACHE_ENABLED"] === "true" &&
    request.cacheStore !== undefined &&
    request.surface !== undefined
  ) {
    const outcome = await withResponseCache({
      store: request.cacheStore,
      enabled: true,
      request: {
        model: pickModelForSurface(request.surface, env),
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        surface: request.surface,
      },
      call: dispatchAndRecord,
    });
    return {
      ...outcome.result,
      durationMs: 0,
    };
  }

  return dispatchAndRecord();
}

export type { ClaudeSurface };
