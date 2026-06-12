/**
 * Model routing — the single, auditable place that decides which Claude tier
 * handles each Claude API "surface".
 *
 * 2026 lineup (cost ascending): Haiku (cheap, fast, structured) < Sonnet
 * (default reasoning) < Opus (deep reasoning). Prior to this module every call
 * site hardcoded `claude-sonnet-4-6`, so cheap surfaces overpaid and hard ones
 * were under-powered, with no central policy.
 *
 * SAFETY: every surface currently routes to SONNET — byte-for-byte the same model
 * the call sites already used, so introducing the router changes no behavior. The
 * `recommended` note on each surface documents where it SHOULD land once output
 * quality has been validated per-surface; flipping a surface is then a one-line,
 * deliberate change here (not a scattered edit), and the cost ledger
 * (ClaudeApiCallRecord) measures the result.
 */

export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
} as const;

export type ModelTier = keyof typeof MODELS;

export type ClaudeSurface =
  | "studio"
  | "journal"
  | "calibration-insight"
  | "model-court"
  | "content"
  | "brief";

/**
 * ACTIVE routing — all Sonnet today (zero behavior change). The comment on each
 * line is the recommended target tier once validated, so the intended policy is
 * captured in one place and can be enabled deliberately.
 */
const SURFACE_TIER: Record<ClaudeSurface, ModelTier> = {
  studio: "sonnet",             // brand-voice creative — quality-sensitive
  journal: "sonnet",            // public accountability writing
  "calibration-insight": "haiku", // short structured stat read — validated safe for Haiku
  "model-court": "sonnet",      // adversarial reasoning (opus when available)
  content: "sonnet",            // editorial drafts
  brief: "haiku",               // templated daily summary — validated safe for Haiku
};

/** Resolve the model id for a surface. Unknown surfaces fall back to Sonnet. */
export function pickModelForSurface(surface: ClaudeSurface): string {
  const tier = SURFACE_TIER[surface] ?? "sonnet";
  return MODELS[tier];
}

export const ALL_SURFACES = Object.keys(SURFACE_TIER) as ClaudeSurface[];
