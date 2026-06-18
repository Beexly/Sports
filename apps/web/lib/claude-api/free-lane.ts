/**
 * Content free-lane dispatcher — now backed by the multi-provider free pool.
 *
 * Routing policy:
 *   - If ANY free provider is available (the keyless Pollinations provider always
 *     is, plus any keyed-free provider whose env key is set), route through the
 *     provider pool (provider-pool.ts): health-aware round-robin + failover so no
 *     single free provider is exhausted. The pool falls back to Anthropic if all
 *     free providers fail and ANTHROPIC_API_KEY is set, else throws
 *     PoolExhaustedError (caller degrades honestly — never fabricates).
 *   - If NO free provider is available (only possible if the registry is emptied)
 *     this is a transparent pass-through to Anthropic via callClaudeMessages.
 *
 * Because the keyless provider is always available, the platform runs with ZERO
 * paid key by default. CONTENT_FREE_LANE_ENABLED is therefore no longer required
 * for the free lane to engage; it is retained only as a back-compat signal for
 * the legacy Cerebras-direct shouldUseFreeLane() helper.
 *
 * The result carries the REAL provider/model used so the cost ledger records
 * what actually answered. AI output stays Tier 6 / content-only regardless of
 * provider (docs/models/local-model-lane.md).
 */
import { callClaudeMessages, type ClaudeMessagesRequest, type ClaudeMessagesResult } from "./messages";
import { callViaPool } from "./provider-pool";
import { availableProviders } from "./providers/registry";
import type { ClaudeSurface } from "./model-router";

type Env = Record<string, string | undefined>;

/**
 * Surfaces eligible for the LEGACY Cerebras-direct free lane (shouldUseFreeLane).
 * Retained for back-compat; the pool itself is surface-agnostic.
 */
export const FREE_LANE_SURFACES: ReadonlySet<ClaudeSurface> = new Set<ClaudeSurface>(["brief"]);

/** Legacy flag check: the explicit Cerebras opt-in lane. */
export function isFreeLaneEnabled(env: Env = process.env): boolean {
  return env["CONTENT_FREE_LANE_ENABLED"] === "true" && Boolean(env["CEREBRAS_API_KEY"]);
}

/** Legacy helper: was the explicit per-surface Cerebras lane requested? */
export function shouldUseFreeLane(surface: ClaudeSurface | undefined, env: Env = process.env): boolean {
  if (surface === undefined || !FREE_LANE_SURFACES.has(surface)) return false;
  return isFreeLaneEnabled(env);
}

/** True when the multi-provider free pool can serve a request (keyless ⇒ always true). */
export function isFreePoolAvailable(env: Env = process.env): boolean {
  return availableProviders(env).length > 0;
}

export interface ContentMessagesRequest extends ClaudeMessagesRequest {
  /** Optional model override (legacy free-lane field; pool uses registry models). */
  readonly cerebrasModel?: string;
}

/**
 * Provider-aware content generation. Routes through the free provider pool
 * whenever any free provider is available (the default — keyless Pollinations is
 * always present), otherwise passes through to Anthropic.
 */
export async function generateContentMessages(
  request: ContentMessagesRequest,
  env: Env = process.env
): Promise<ClaudeMessagesResult> {
  if (isFreePoolAvailable(env)) {
    return callViaPool(
      {
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      },
      { env, fetchImpl: request.fetchImpl }
    );
  }
  return callClaudeMessages(request);
}
