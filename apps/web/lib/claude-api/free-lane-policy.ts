/**
 * Free-lane policy (pure) — shared by free-lane dispatcher and Jynx planner.
 * Kept separate to avoid circular imports (jynx ↔ free-lane ↔ provider-dispatch).
 */
import type { ClaudeSurface } from "./model-router";

type Env = Record<string, string | undefined>;

export const FREE_LANE_SURFACES: ReadonlySet<ClaudeSurface> = new Set<ClaudeSurface>([
  "brief",
  "content",
]);

export function isFreeLaneEnabled(env: Env = process.env): boolean {
  return env["CONTENT_FREE_LANE_ENABLED"] === "true" && Boolean(env["CEREBRAS_API_KEY"]?.trim());
}

export function shouldUseFreeLane(surface: ClaudeSurface | undefined, env: Env = process.env): boolean {
  if (surface === undefined || !FREE_LANE_SURFACES.has(surface)) return false;
  return isFreeLaneEnabled(env);
}
