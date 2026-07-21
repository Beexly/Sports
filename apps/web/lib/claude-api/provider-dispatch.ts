/**
 * Provider dispatch for Claude message calls.
 *
 * `callClaude` is a drop-in for `callClaudeMessages` with one addition: when the
 * operator has deliberately selected Bedrock (`CLAUDE_PROVIDER=bedrock` + AWS
 * creds) or Vertex, the call is routed there so the spend hits cloud-program
 * credits instead of the Anthropic bill.
 *
 * Fallback behavior is governed by LLM_COST_MODE (see cost-policy.ts):
 *   normal        provider errors fall back to direct Anthropic (reliability-first)
 *   credits-only  provider errors FAIL CLOSED — no silent cash billing
 *   zero-cash     same dispatch rule as credits-only; call sites should prefer
 *                 the free lane before reaching this dispatcher at all
 *
 * With no provider selected and no cost mode set (the default), this is a
 * byte-for-byte pass-through to `callClaudeMessages`. Adoption is the same
 * deliberate, per-surface flip pattern the rest of claude-api uses: a call site
 * swaps `callClaudeMessages(req)` for `callClaude(req)` when it's ready.
 */
import { callClaudeMessages, type ClaudeMessagesRequest, type ClaudeMessagesResult } from "./messages";
import { pickModelForSurface } from "./model-router";
import {
  billableFallbackAllowed,
  CostPolicyBlockedError,
  resolveLlmCostMode,
  type DispatchProvider,
  type LlmDispatchRecord,
} from "./cost-policy";
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

export interface CallClaudeOptions {
  /** Receives one telemetry record per dispatch (including blocked dispatches). */
  readonly onDispatch?: (record: LlmDispatchRecord) => void;
}

/**
 * Provider-aware, cost-policy-aware Claude call. Routes to Bedrock or Vertex when
 * that provider is explicitly selected and configured. In "normal" mode a provider
 * error falls back to the direct Anthropic API; in "credits-only"/"zero-cash" mode
 * it throws CostPolicyBlockedError instead — cash billing never happens silently.
 */
export async function callClaude(
  request: ClaudeMessagesRequest,
  env: Env = process.env,
  options: CallClaudeOptions = {},
): Promise<ClaudeMessagesResult> {
  const costMode = resolveLlmCostMode(env);
  const modelRequested = resolveAnthropicModelId(request);
  const surface = request.surface ?? null;

  const emit = (record: LlmDispatchRecord) => {
    options.onDispatch?.(record);
  };
  const record = (
    providerRequested: DispatchProvider,
    providerUsed: LlmDispatchRecord["providerUsed"],
    billingPool: LlmDispatchRecord["billingPool"],
    modelUsed: string | null,
    fallbackReason: string | null,
  ): LlmDispatchRecord => ({
    costMode,
    providerRequested,
    providerUsed,
    modelRequested,
    modelUsed,
    fallbackReason,
    billingPool,
    surface,
  });

  const providerRequest = {
    anthropicModelId: modelRequested,
    system: request.system,
    user: request.user,
    maxTokens: request.maxTokens,
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.fetchImpl ? { fetchImpl: request.fetchImpl } : {}),
    ...(request.cache ? { cache: request.cache } : {}),
  };

  let providerRequested: DispatchProvider = "anthropic";
  let fallbackReason: string | null = null;

  if (isBedrockProviderSelected(env)) {
    providerRequested = "bedrock";
    try {
      const result = await callBedrockClaudeMessages(providerRequest, env);
      emit(record("bedrock", "bedrock", "aws_activate", result.modelName ?? null, null));
      return result;
    } catch (error) {
      if (!(error instanceof BedrockMessagesError) && !(error instanceof BedrockConfigError)) {
        throw error;
      }
      fallbackReason = `bedrock: ${error.message}`;
    }
  } else if (isVertexProviderSelected(env)) {
    providerRequested = "vertex";
    try {
      const result = await callVertexClaudeMessages(providerRequest, env);
      emit(record("vertex", "vertex", "vertex_partner", result.modelName ?? null, null));
      return result;
    } catch (error) {
      if (!(error instanceof VertexMessagesError) && !(error instanceof VertexConfigError)) {
        throw error;
      }
      fallbackReason = `vertex: ${error.message}`;
    }
  }

  if (!billableFallbackAllowed(costMode)) {
    const reason =
      fallbackReason ??
      "no credit provider selected — set CLAUDE_PROVIDER=bedrock or vertex with credentials, or use the free lane";
    emit(record(providerRequested, "blocked", "blocked", null, reason));
    throw new CostPolicyBlockedError(costMode, reason);
  }

  const result = await callClaudeMessages(request);
  emit(record(providerRequested, "anthropic", "anthropic_direct", result.modelName ?? modelRequested, fallbackReason));
  return result;
}
