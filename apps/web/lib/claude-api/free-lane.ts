/**
 * Content free-lane dispatcher.
 *
 * Chain (max free reward, same governance):
 *   1) OpenRouter free (OPENROUTER_API_KEY) — first $0 attempt, best free quality
 *   2) Cerebras (gpt-oss-120b) when CONTENT_FREE_LANE_ENABLED + CEREBRAS_API_KEY
 *   3) Secondary OpenAI-compat free host (Gemma / Nemotron / etc.) when
 *      FREE_LANE_SECONDARY_BASE_URL + FREE_LANE_SECONDARY_MODEL set
 *   4) callClaude → Jynx multi-cloud credits → Anthropic cash
 *
 * Surfaces: free-lane-policy allow-list only (content, brief).
 */
import { callClaude } from "./provider-dispatch";
import type { ClaudeMessagesRequest, ClaudeMessagesResult } from "./messages";
import { callCerebrasMessages, CerebrasMessagesError } from "./providers/cerebras";
import { callOpenAiCompatMessages, OpenAiCompatError } from "./openai-compat";
import { OPENROUTER_BASE_URL, openRouterConfig } from "./provider-config";
import type { ClaudeSurface } from "./model-router";
import {
  FREE_LANE_SURFACES,
  isFreeLaneEnabled,
  shouldUseFreeLane,
} from "./free-lane-policy";

export { FREE_LANE_SURFACES, isFreeLaneEnabled, shouldUseFreeLane };

type Env = Record<string, string | undefined>;

export interface ContentMessagesRequest extends ClaudeMessagesRequest {
  readonly cerebrasModel?: string;
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
  if (shouldUseFreeLane(request.surface, env)) {
    const or = openRouterConfig(env);
    if (or) {
      for (const model of or.models) {
        try {
          return await callOpenAiCompatMessages({
            baseUrl: OPENROUTER_BASE_URL,
            apiKey: or.apiKey,
            model,
            system: request.system,
            user: request.user,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            fetchImpl: request.fetchImpl,
            ledgerPrefix: "free-openrouter/",
          });
        } catch (error) {
          if (!(error instanceof OpenAiCompatError)) throw error;
        }
      }
    }

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
}

export type { ClaudeSurface };
