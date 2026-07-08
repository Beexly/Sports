/**
 * Provider dispatch for Claude message calls.
 *
 * `callClaude` is a drop-in for `callClaudeMessages` with one addition: when the
 * operator has deliberately selected Bedrock (`CLAUDE_PROVIDER=bedrock` + AWS
 * creds), the call is routed to AWS Bedrock so the spend hits AWS Activate GenAI
 * credits instead of the Anthropic bill. On ANY Bedrock error — misconfiguration
 * or a runtime API failure — it transparently falls back to the direct Anthropic
 * API, so reliability and output governance never regress.
 *
 * With no provider selected (the default), this is a byte-for-byte pass-through to
 * `callClaudeMessages`. Adoption is the same deliberate, per-surface flip pattern
 * the rest of claude-api uses (model-router, free-lane): a call site swaps
 * `callClaudeMessages(req)` for `callClaude(req)` when it's ready to be credit-routable.
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

type Env = Record<string, string | undefined>;

const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Resolve the Anthropic model id a request targets (explicit id > surface > default). */
export function resolveAnthropicModelId(request: ClaudeMessagesRequest): string {
  if (request.model) return request.model;
  if (request.surface) return pickModelForSurface(request.surface);
  return DEFAULT_MODEL;
}

/**
 * Provider-aware Claude call. Routes to Bedrock or Vertex only when that provider
 * is explicitly selected (single `CLAUDE_PROVIDER` value) and configured; otherwise
 * — and on ANY provider error (config or runtime) — uses the direct Anthropic API,
 * so a credits-routing problem never takes a surface down.
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
  }
  return callClaudeMessages(request);
}
