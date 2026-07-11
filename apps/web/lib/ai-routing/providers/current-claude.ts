/**
 * The ONLY registered endpoint in this wave: the Claude configuration
 * production already uses. No new provider, no new credential, no invented
 * model ids — the model comes from the same env/config the call sites read.
 *
 * trainsOnData: false — Anthropic API traffic is not used for training under
 * GSE's commercial terms; this field exists so the policy can structurally
 * refuse any future endpoint where that is not true.
 */

import type { ModelEndpoint } from "../types";

export const CURRENT_CLAUDE_ENDPOINT: ModelEndpoint = {
  id: "anthropic-current-production",
  provider: "anthropic",
  modelEnvVar: "ANTHROPIC_MODEL (falls back to the lib/claude-api default)",
  trainsOnData: false,
  approvedLanes: [
    "PLAN_FRONTIER",
    "EXECUTE_BOUNDED",
    "EXTRACT_STRUCTURED",
    "VERIFY_INDEPENDENT",
    "PUBLIC_HIGH_STAKES",
  ],
  isCurrentProduction: true,
};

/** Endpoint registry — additions require an owner-approved adoption dossier. */
export const ENDPOINT_REGISTRY: readonly ModelEndpoint[] = [CURRENT_CLAUDE_ENDPOINT];

export function getEndpoint(id: string): ModelEndpoint | undefined {
  return ENDPOINT_REGISTRY.find((e) => e.id === id);
}
