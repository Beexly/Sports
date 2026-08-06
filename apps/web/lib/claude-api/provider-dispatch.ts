/**
 * Provider dispatch for Claude message calls.
 *
 * Routes by CLAUDE_PROVIDER (single selection) when fully configured:
 *   bedrock       → AWS Bedrock InvokeModel (Activate GenAI credits)
 *   vertex        → Google Vertex Model Garden (partner credits)
 *   azure|azure-foundry → Microsoft Foundry Anthropic Messages API (Azure bill/credits)
 *
 * On ANY provider error (config or runtime) → direct Anthropic API so reliability
 * and governance never regress. Default (unset) is Anthropic-only.
 *
 * Free-lane Cerebras is a separate path (free-lane.ts), not CLAUDE_PROVIDER.
 */
import { callClaudeMessages, type ClaudeMessagesRequest, type ClaudeMessagesResult } from "./messages";
import { pickModelForSurface } from "./model-router";
import {
  callBedrockClaudeMessages,
  isBedrockProviderSelected,
  BedrockConfigError,
  BedrockMessagesError,
} from "./providers/bedrock";
import {
  callVertexClaudeMessages,
  isVertexProviderSelected,
  VertexConfigError,
  VertexMessagesError,
} from "./providers/vertex";
import {
  callAzureFoundryClaudeMessages,
  isAzureFoundryProviderSelected,
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

/**
 * Provider-aware Claude call. One credit cloud at a time via CLAUDE_PROVIDER.
 * Failures always fall through to direct Anthropic (cash) rather than taking
 * the surface down.
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

  if (isBedrockProviderSelected(env)) {
    try {
      return await callBedrockClaudeMessages(providerRequest, env);
    } catch (error) {
      if (!(error instanceof BedrockMessagesError) && !(error instanceof BedrockConfigError)) {
        throw error;
      }
    }
  } else if (isVertexProviderSelected(env)) {
    try {
      return await callVertexClaudeMessages(providerRequest, env);
    } catch (error) {
      if (!(error instanceof VertexMessagesError) && !(error instanceof VertexConfigError)) {
        throw error;
      }
    }
  } else if (isAzureFoundryProviderSelected(env)) {
    try {
      return await callAzureFoundryClaudeMessages(providerRequest, env);
    } catch (error) {
      if (
        !(error instanceof AzureFoundryMessagesError) &&
        !(error instanceof AzureFoundryConfigError)
      ) {
        throw error;
      }
    }
  }
  return callClaudeMessages(request);
}
