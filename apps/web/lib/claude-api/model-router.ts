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
  studio: "sonnet", // recommended: sonnet (brand-voice creative — quality-sensitive)
  journal: "sonnet", // recommended: sonnet (public accountability writing)
  "calibration-insight": "sonnet", // recommended: haiku (short, structured read of stats)
  "model-court": "sonnet", // recommended: opus (adversarial deep reasoning)
  content: "sonnet", // recommended: sonnet (editorial drafts)
  brief: "sonnet", // recommended: haiku (templated daily summary)
};

/**
 * RECOMMENDED routing — the validated target tier per surface (the intent captured in
 * the SURFACE_TIER comments, made machine-readable). ACTIVE routing stays all-Sonnet
 * until each flip is validated; this map drives the cost-savings analysis in
 * `model-economics.ts` so the deliberate flip is data-informed. Editing this map does
 * NOT change runtime behavior — only `SURFACE_TIER` (ACTIVE) does.
 */
export const SURFACE_RECOMMENDED: Record<ClaudeSurface, ModelTier> = {
  studio: "sonnet",
  journal: "sonnet",
  "calibration-insight": "haiku",
  "model-court": "opus",
  content: "sonnet",
  brief: "haiku",
};

/** Resolve the model id for a surface. Unknown surfaces fall back to Sonnet. */
export function pickModelForSurface(surface: ClaudeSurface): string {
  const tier = SURFACE_TIER[surface] ?? "sonnet";
  return MODELS[tier];
}

/** The currently-active tier for a surface (Sonnet today). */
export function activeTierForSurface(surface: ClaudeSurface): ModelTier {
  return SURFACE_TIER[surface] ?? "sonnet";
}

export const ALL_SURFACES = Object.keys(SURFACE_TIER) as ClaudeSurface[];
