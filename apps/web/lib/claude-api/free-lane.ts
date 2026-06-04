/**
 * Content free-lane dispatcher.
 *
 * Default behavior is byte-identical to calling callClaudeMessages directly
 * (Anthropic). The free lane (Cerebras) is used ONLY when ALL of:
 *   - CONTENT_FREE_LANE_ENABLED === "true"
 *   - CEREBRAS_API_KEY is present
 *   - the surface is on FREE_LANE_SURFACES (a conservative allow-list)
 * and even then any Cerebras error falls back to Anthropic, so output governance
 * and reliability never regress.
 *
 * This mirrors model-router.ts: introduce the capability inert, flip it on
 * deliberately and per-surface once output quality is validated. AI output stays
 * Tier 6 / content-only regardless of provider (docs/models/local-model-lane.md).
 */
import { callClaudeMessages, type ClaudeMessagesRequest, type ClaudeMessagesResult } from "./messages";
import { callCerebrasMessages, CerebrasMessagesError } from "./providers/cerebras";
import type { ClaudeSurface } from "./model-router";

type Env = Record<string, string | undefined>;

/**
 * Surfaces eligible for the free lane. Deliberately conservative: only low-stakes
 * templated drafting. Quality- / trust-sensitive surfaces (studio, journal,
 * model-court) stay on Anthropic until per-surface output is validated.
 */
export const FREE_LANE_SURFACES: ReadonlySet<ClaudeSurface> = new Set<ClaudeSurface>(["brief"]);

export function isFreeLaneEnabled(env: Env = process.env): boolean {
  return env["CONTENT_FREE_LANE_ENABLED"] === "true" && Boolean(env["CEREBRAS_API_KEY"]);
}

export function shouldUseFreeLane(surface: ClaudeSurface | undefined, env: Env = process.env): boolean {
  if (surface === undefined || !FREE_LANE_SURFACES.has(surface)) return false;
  return isFreeLaneEnabled(env);
}

export interface ContentMessagesRequest extends ClaudeMessagesRequest {
  /** Optional Cerebras model override for the free lane. */
  readonly cerebrasModel?: string;
}

/**
 * Provider-aware content generation. See file header for the exact activation
 * conditions; outside them this is a transparent pass-through to Anthropic.
 */
export async function generateContentMessages(
  request: ContentMessagesRequest,
  env: Env = process.env
): Promise<ClaudeMessagesResult> {
  const cerebrasKey = env["CEREBRAS_API_KEY"];
  if (cerebrasKey && shouldUseFreeLane(request.surface, env)) {
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
      // Free lane is best-effort: fall back to Anthropic on a provider error so
      // reliability never regresses. Re-throw anything that isn't a Cerebras error.
      if (!(error instanceof CerebrasMessagesError)) throw error;
    }
  }
  return callClaudeMessages(request);
}
