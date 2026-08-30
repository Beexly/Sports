/**
 * EXACT per-provider dispatch adapters (directive §9.3).
 *
 * One provider route = one adapter = one sanctioned transport module. The
 * legacy `callClaude` wrapper routes/falls back INTERNALLY (Bedrock error →
 * silent direct-Anthropic retry), which lets an attempt row lie about which
 * provider served a request and moves fallback authority into transport. It
 * is therefore NOT used here.
 *
 *   dispatchAnthropicDirect → lib/claude-api/messages.callClaudeMessages
 *   dispatchBedrock         → lib/claude-api/providers/bedrock.callBedrockClaudeMessages
 *   dispatchVertex          → lib/claude-api/providers/vertex.callVertexClaudeMessages
 *   dispatchCerebras        → lib/claude-api/providers/cerebras.callCerebrasMessages
 *   dispatchLocal           → lib/claude-api/internal-llm.callInternalLlm
 *
 * NO adapter ever calls another provider's transport — an adapter failure is
 * reported as a discriminated outcome and the CONTROL PLANE alone decides
 * whether another route is tried (invocation-pipeline.ts walks
 * `authority.permittedProviderRoutes` in owner-defined order). Nested
 * fallback is structurally impossible: each adapter closure holds exactly one
 * transport function.
 *
 * Outcome taxonomy (§9.4 exact error taxonomy, honest about dispatch state):
 *   - config missing (detected BEFORE any network send) → FAILED,
 *     dispatched=false, providerUsed stays null;
 *   - provider returned an HTTP error (we provably reached it, it provably
 *     rejected) → FAILED, dispatched=true, errorCode HTTP_<status>;
 *   - abort/timeout after send → TIMEOUT, dispatched=true;
 *   - any other post-send failure (network drop, malformed body) → AMBIGUOUS,
 *     dispatched=true — we cannot prove the vendor did not charge.
 */

import { callClaudeMessages, ClaudeMessagesError, type ClaudeMessagesResult } from "@/lib/claude-api/messages";
import {
  callBedrockClaudeMessages,
  isBedrockConfigured,
  BedrockConfigError,
  BedrockMessagesError,
} from "@/lib/claude-api/providers/bedrock";
import {
  callVertexClaudeMessages,
  isVertexConfigured,
  VertexConfigError,
  VertexMessagesError,
} from "@/lib/claude-api/providers/vertex";
import {
  callCerebrasMessages,
  CerebrasMessagesError,
} from "@/lib/claude-api/providers/cerebras";
import {
  callInternalLlm,
  isInternalLlmConfigured,
  InternalLlmError,
  type InternalLlmResult,
} from "@/lib/claude-api/internal-llm";
import type { ProviderRouteId } from "./contracts";

type Env = Record<string, string | undefined>;

/** What one exact provider attempt is given. No policy, no fallback plan. */
export interface ProviderDispatchPayload {
  readonly modelRequested: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  /** Test seam threaded into the sanctioned transports. */
  readonly fetchImpl?: typeof fetch;
}

/** Discriminated outcome of ONE exact provider attempt. */
export type ProviderDispatchOutcome =
  | {
      readonly kind: "SUCCEEDED";
      readonly providerUsed: ProviderRouteId;
      readonly modelResolved: string;
      readonly output: { readonly text: string };
      readonly inputTokens: number | null;
      readonly outputTokens: number | null;
      readonly providerRequestId: string | null;
    }
  | {
      readonly kind: "FAILED" | "TIMEOUT" | "AMBIGUOUS";
      /** TRUE only when transport for this attempt actually began. */
      readonly dispatched: boolean;
      readonly errorCode: string;
    };

export type ProviderDispatchFn = (
  payload: ProviderDispatchPayload,
) => Promise<ProviderDispatchOutcome>;

// ─── Shared outcome helpers ───────────────────────────────────────────────────

function notConfigured(detail: string): ProviderDispatchOutcome {
  return { kind: "FAILED", dispatched: false, errorCode: `PROVIDER_CONFIG:${detail}` };
}

function success(
  route: ProviderRouteId,
  result: ClaudeMessagesResult,
): ProviderDispatchOutcome {
  return {
    kind: "SUCCEEDED",
    providerUsed: route,
    modelResolved: result.modelName,
    output: { text: result.text },
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    providerRequestId: null,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Map one thrown transport error to the honest §9.4 taxonomy. */
function mapTransportError(error: unknown): ProviderDispatchOutcome {
  if (
    error instanceof BedrockConfigError ||
    error instanceof VertexConfigError ||
    (error instanceof InternalLlmError && error.status === 0)
  ) {
    // Config problems are detected before any network send.
    return notConfigured(error.name);
  }
  if (
    error instanceof ClaudeMessagesError ||
    error instanceof CerebrasMessagesError ||
    error instanceof BedrockMessagesError ||
    error instanceof VertexMessagesError ||
    error instanceof InternalLlmError
  ) {
    const status = (error as { status?: number }).status ?? 0;
    if (status > 0) {
      // The provider answered with an HTTP error: dispatch provably happened
      // and the request was provably rejected — a clean, no-charge failure.
      return { kind: "FAILED", dispatched: true, errorCode: `HTTP_${status}` };
    }
    return { kind: "AMBIGUOUS", dispatched: true, errorCode: error.name };
  }
  if (isAbortError(error)) {
    return { kind: "TIMEOUT", dispatched: true, errorCode: "TIMEOUT" };
  }
  // Unknown post-send failure: we cannot prove the vendor did not charge.
  return {
    kind: "AMBIGUOUS",
    dispatched: true,
    errorCode: error instanceof Error ? error.name : "UNKNOWN",
  };
}

// ─── The five exact adapters (§9.3) ───────────────────────────────────────────

export function dispatchAnthropicDirect(env: Env = process.env): ProviderDispatchFn {
  return async (payload) => {
    const apiKey = env["ANTHROPIC_API_KEY"];
    if (!apiKey) return notConfigured("ANTHROPIC_API_KEY missing");
    try {
      const result = await callClaudeMessages({
        apiKey,
        model: payload.modelRequested,
        system: payload.system,
        user: payload.user,
        maxTokens: payload.maxTokens,
        ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
        ...(payload.fetchImpl ? { fetchImpl: payload.fetchImpl } : {}),
      });
      return success("anthropic-direct", result);
    } catch (error) {
      return mapTransportError(error);
    }
  };
}

export function dispatchBedrock(env: Env = process.env): ProviderDispatchFn {
  return async (payload) => {
    if (!isBedrockConfigured(env)) return notConfigured("bedrock env missing");
    try {
      const result = await callBedrockClaudeMessages(
        {
          anthropicModelId: payload.modelRequested,
          system: payload.system,
          user: payload.user,
          maxTokens: payload.maxTokens,
          ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
          ...(payload.fetchImpl ? { fetchImpl: payload.fetchImpl } : {}),
        },
        env,
      );
      return success("bedrock", result);
    } catch (error) {
      return mapTransportError(error);
    }
  };
}

export function dispatchVertex(env: Env = process.env): ProviderDispatchFn {
  return async (payload) => {
    if (!isVertexConfigured(env)) return notConfigured("vertex env missing");
    try {
      const result = await callVertexClaudeMessages(
        {
          anthropicModelId: payload.modelRequested,
          system: payload.system,
          user: payload.user,
          maxTokens: payload.maxTokens,
          ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
          ...(payload.fetchImpl ? { fetchImpl: payload.fetchImpl } : {}),
        },
        env,
      );
      return success("vertex", result);
    } catch (error) {
      return mapTransportError(error);
    }
  };
}

export function dispatchCerebras(env: Env = process.env): ProviderDispatchFn {
  return async (payload) => {
    const apiKey = env["CEREBRAS_API_KEY"];
    if (!apiKey) return notConfigured("CEREBRAS_API_KEY missing");
    try {
      const result = await callCerebrasMessages({
        apiKey,
        system: payload.system,
        user: payload.user,
        maxTokens: payload.maxTokens,
        ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
        ...(payload.fetchImpl ? { fetchImpl: payload.fetchImpl } : {}),
      });
      return success("cerebras", result);
    } catch (error) {
      return mapTransportError(error);
    }
  };
}

export function dispatchLocal(env: Env = process.env): ProviderDispatchFn {
  return async (payload) => {
    if (!isInternalLlmConfigured(env)) return notConfigured("internal LLM env missing");
    try {
      const result: InternalLlmResult = await callInternalLlm({
        system: payload.system,
        user: payload.user,
        maxTokens: payload.maxTokens,
        ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
        ...(payload.fetchImpl ? { fetchImpl: payload.fetchImpl } : {}),
        env,
      });
      return {
        kind: "SUCCEEDED",
        providerUsed: "local",
        modelResolved: result.model,
        output: { text: result.text },
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        providerRequestId: null,
      };
    } catch (error) {
      return mapTransportError(error);
    }
  };
}

/**
 * The complete route→adapter table. `Record<ProviderRouteId, …>` makes a
 * missing adapter a compile error — every registered route has exactly one
 * exact adapter, and nothing else is reachable from the pipeline.
 */
export function createProviderDispatchers(
  env: Env = process.env,
): Record<ProviderRouteId, ProviderDispatchFn> {
  return {
    "anthropic-direct": dispatchAnthropicDirect(env),
    bedrock: dispatchBedrock(env),
    vertex: dispatchVertex(env),
    cerebras: dispatchCerebras(env),
    local: dispatchLocal(env),
  };
}
