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

  const attempts = cloudAttemptOrder(env);
  for (const cloud of attempts) {
    try {
      return await invokeCloud(cloud, providerRequest, env);
    } catch (error) {
      if (!isCloudTransportError(error)) throw error;
      // try next cloud / cash
    }
  }

  return callClaudeMessages(request);
}
