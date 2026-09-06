/**
 * Free-lane policy (pure) — shared by free-lane dispatcher and Jynx planner.
 *
 * Enablement is disjunctive (any of the $0 hosts flips the lane on):
 *   - OpenRouter free (`OPENROUTER_API_KEY`) — first attempt
 *   - Cerebras (`CEREBRAS_API_KEY`) — second attempt
 *   - Secondary free OpenAI-compat host (`FREE_LANE_SECONDARY_*`) — third
 */
import type { ClaudeSurface } from "./model-router";
import { isOpenRouterConfigured } from "./provider-config";

type Env = Record<string, string | undefined>;

export const FREE_LANE_SURFACES: ReadonlySet<ClaudeSurface> = new Set<ClaudeSurface>([
  "brief",
  "content",
]);

/** True when content free lane can attempt at least one $0 host. */
export function isFreeLaneEnabled(env: Env = process.env): boolean {
  if (env["CONTENT_FREE_LANE_ENABLED"] !== "true") return false;
  if (isOpenRouterConfigured(env)) return true;
  if (env["CEREBRAS_API_KEY"]?.trim()) return true;
  if (env["FREE_LANE_SECONDARY_BASE_URL"]?.trim() && env["FREE_LANE_SECONDARY_MODEL"]?.trim()) {
    return true;
  }
  return false;
}

export function shouldUseFreeLane(surface: ClaudeSurface | undefined, env: Env = process.env): boolean {
  if (surface === undefined || !FREE_LANE_SURFACES.has(surface)) return false;
  return isFreeLaneEnabled(env);
}
