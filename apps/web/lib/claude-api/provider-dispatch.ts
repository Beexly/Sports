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
import { logClaudeCallToHelicone } from "./helicone-logger";
import { traceClaudeCallToLangfuse } from "./langfuse-tracing";
import { estimateClaudeCostUsd } from "./cost-monitor";
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
 * Log a completed call to Helicone (Async mode — see helicone-logger.ts). Awaited
 * with its own short internal timeout so a slow/down Helicone endpoint adds bounded
 * latency at most; never throws, so it can never turn a successful Claude call into
 * a failed one.
 */
async function logResult(
  result: ClaudeMessagesResult,
  request: ClaudeMessagesRequest,
  startedAtMs: number,
  env: Env,
): Promise<void> {
  await Promise.all([
    logClaudeCallToHelicone(
      {
        modelName: result.modelName,
        system: request.system,
        user: request.user,
        responseText: result.text,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        startedAtMs,
        completedAtMs: startedAtMs + result.durationMs,
        status: 200,
      },
      env,
    ),
    traceClaudeCallToLangfuse(
      {
        surfaceName: request.surface ?? "claude-call",
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: estimateClaudeCostUsd(result.inputTokens, result.outputTokens),
        durationMs: result.durationMs,
      },
      env,
    ),
  ]);
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
      await logResult(result, request, startedAtMs, env);
      return result;
    } catch (error) {
      if (!isCloudTransportError(error)) throw error;
      // try next cloud / cash
    }
  }

  const result = await callClaudeMessages(request);
  await logResult(result, request, startedAtMs, env);
  return result;
}
