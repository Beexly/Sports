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
  if (!baseUrl || !model) return null;
  const apiKey = env["FREE_LANE_SECONDARY_API_KEY"]?.trim();
  const ledgerPrefix = env["FREE_LANE_SECONDARY_LEDGER_PREFIX"]?.trim() || "free-secondary/";
  return {
    baseUrl,
    model,
    ...(apiKey ? { apiKey } : {}),
    ledgerPrefix: ledgerPrefix.endsWith("/") ? ledgerPrefix : `${ledgerPrefix}/`,
  };
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
    }

    return callClaude(request, env);
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
      call,
    });
    return {
      ...outcome.result,
      durationMs: 0,
    };
  }

  return call();
}

export type { ClaudeSurface };
