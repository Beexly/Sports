/**
 * Provider dispatch for Claude message calls — Jynx cloud execution layer.
 *
 * Attempt order comes from `jynx.cloudAttemptOrder`:
 *   explicit CLAUDE_PROVIDER | auto preference → configured clouds with failover
 *   → direct Anthropic cash last.
 *
 * Free-lane Cerebras is handled by free-lane / jynxComplete (before this).
 * Failures on a cloud try the next cloud before cash so AWS/Azure/Google cooperate.
 */
import { callClaudeMessages, type ClaudeMessagesRequest, type ClaudeMessagesResult } from "./messages";
import { pickModelForSurface } from "./model-router";
import { cloudAttemptOrder, type JynxCloud } from "./jynx";
import { recordLatitudeGenAiSpan } from "./latitude-otlp";
import {
  callBedrockClaudeMessages,
  BedrockConfigError,
  BedrockMessagesError,
} from "./providers/bedrock";
import {
  callVertexClaudeMessages,
  VertexConfigError,
  VertexMessagesError,
} from "./providers/vertex";
import {
  callAzureFoundryClaudeMessages,
  AzureFoundryConfigError,
  AzureFoundryMessagesError,
} from "./providers/azure-foundry";

type Env = Record<string, string | undefined>;

const DEFAULT_MODEL = "claude-sonnet-4-6";
export const PAID_OVERFLOW_CIRCUIT_DEFAULTS = {
  maxPaidRetries: 1,
  maxJobEstimatedUsd: 0.05,
} as const;

/** Resolve the Anthropic model id a request targets (explicit id > surface > default). */
export function resolveAnthropicModelId(request: ClaudeMessagesRequest): string {
  if (request.model) return request.model;
  if (request.surface) return pickModelForSurface(request.surface);
  return DEFAULT_MODEL;
}

function isCloudTransportError(error: unknown): boolean {
  return (
    error instanceof BedrockMessagesError ||
    error instanceof BedrockConfigError ||
    error instanceof VertexMessagesError ||
    error instanceof VertexConfigError ||
    error instanceof AzureFoundryMessagesError ||
    error instanceof AzureFoundryConfigError
  );
}

async function invokeCloud(
  cloud: JynxCloud,
  providerRequest: {
    anthropicModelId: string;
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
    fetchImpl?: typeof fetch;
    cache?: { readonly system?: boolean };
  },
  env: Env,
): Promise<ClaudeMessagesResult> {
  if (cloud === "bedrock") return callBedrockClaudeMessages(providerRequest, env);
  if (cloud === "azure") return callAzureFoundryClaudeMessages(providerRequest, env);
  return callVertexClaudeMessages(providerRequest, env);
}

/**
 * Provider-aware Claude call. Clouds from Jynx order; cash Anthropic last.
 */
export async function callClaude(
  request: ClaudeMessagesRequest,
  env: Env = process.env,
): Promise<ClaudeMessagesResult> {
  const providerRequest = {
    anthropicModelId: resolveAnthropicModelId(request),
    system: request.system,
    user: request.user,
    maxTokens: request.maxTokens,
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.fetchImpl ? { fetchImpl: request.fetchImpl } : {}),
    ...(request.cache ? { cache: request.cache } : {}),
  };

  const startedAtMs = Date.now();
  const attempts = cloudAttemptOrder(env);
  for (const cloud of attempts) {
    try {
      const result = await invokeCloud(cloud, providerRequest, env);
      void recordLatitudeGenAiSpan(
        {
          model: providerRequest.anthropicModelId,
          responseModel: result.modelName,
          provider: cloud,
          surface: request.surface,
          systemPrompt: request.system,
          userPrompt: request.user,
          completionText: result.text,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          durationMs: result.durationMs,
          startedAtMs,
        },
        env,
      );
      return result;
    } catch (error) {
      if (!isCloudTransportError(error)) {
        void recordLatitudeGenAiSpan(
          {
            model: providerRequest.anthropicModelId,
            provider: cloud,
            surface: request.surface,
            systemPrompt: request.system,
            userPrompt: request.user,
            inputTokens: 0,
            outputTokens: 0,
            durationMs: Date.now() - startedAtMs,
            errorMessage: error instanceof Error ? error.message : String(error),
            startedAtMs,
          },
          env,
        );
        throw error;
      }
      // try next cloud / cash
    }
  }

  try {
    const result = await callClaudeMessages(request);
    void recordLatitudeGenAiSpan(
      {
        model: providerRequest.anthropicModelId,
        responseModel: result.modelName,
        provider: "anthropic",
        surface: request.surface,
        systemPrompt: request.system,
        userPrompt: request.user,
        completionText: result.text,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        startedAtMs,
      },
      env,
    );
    return result;
  } catch (error) {
    void recordLatitudeGenAiSpan(
      {
        model: providerRequest.anthropicModelId,
        provider: "anthropic",
        surface: request.surface,
        systemPrompt: request.system,
        userPrompt: request.user,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: Date.now() - startedAtMs,
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAtMs,
      },
      env,
    );
    throw error;
  }
}
