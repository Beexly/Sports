/**
 * Model Portfolio Router — SHADOW recommendation (structurally no-op).
 *
 * This is the only entry point consumers touch in this wave. It:
 *   - never performs, retries, or falls back a model call;
 *   - never mutates anything;
 *   - returns a serializable recommendation with a reason;
 *   - is gated by AI_MODEL_ROUTER_SHADOW_ENABLED (default off) — and even
 *     when enabled, the return value is advisory logging material only.
 *
 * The current production call path stays authoritative until the owner
 * promotes the router (a separate, explicitly-gated future change).
 */

import type { RouteRecommendation, RouteTaskProfile } from "./types";
import { recommendRoute } from "./router";

export function isRouterShadowEnabled(): boolean {
  return process.env["AI_MODEL_ROUTER_SHADOW_ENABLED"] === "true";
}

/**
 * Shadow recommendation, or null when the flag is off. Callers log it next
 * to the call they were already making; they must not branch on it.
 */
export function shadowRecommend(profile: RouteTaskProfile): RouteRecommendation | null {
  if (!isRouterShadowEnabled()) return null;
  return recommendRoute(profile);
}
