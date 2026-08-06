/**
 * Model routing — the single, auditable place that decides which Claude tier
 * handles each Claude API "surface".
 *
 * Cost ascending: Haiku (cheap/structured) < Sonnet (default) < Opus (deep).
 * Market-cap "hot" models (Opus 5, Fable, GPT-5.5, Gemini 3.1) do NOT auto-wire —
 * see docs/ops/JYNX_MARKET_TIER_MAP.md. Promote only via env + credit model maps.
 *
 * Env overrides (optional — default behavior unchanged when unset):
 *   MODEL_PRIMARY / CLAUDE_MODEL_PRIMARY  — sonnet-tier id
 *   MODEL_CHEAP / CLAUDE_MODEL_CHEAP      — haiku-tier id
 *   MODEL_OPUS / CLAUDE_MODEL_OPUS        — opus-tier id (e.g. after map verified)
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
 * ACTIVE routing. Haiku flips validated for calibration-insight + brief.
 * model-court stays sonnet until opus quality+cost validated (recommended = opus).
 */
const SURFACE_TIER: Record<ClaudeSurface, ModelTier> = {
  studio: "sonnet",
  journal: "sonnet",
  "calibration-insight": "haiku",
  "model-court": "sonnet",
  content: "sonnet",
  brief: "haiku",
};

/** Recommended targets for cost analysis only — does not change runtime. */
export const SURFACE_RECOMMENDED: Record<ClaudeSurface, ModelTier> = {
  studio: "sonnet",
  journal: "sonnet",
  "calibration-insight": "haiku",
  "model-court": "opus",
  content: "sonnet",
  brief: "haiku",
};

/**
 * Resolved catalog: defaults from MODELS, optional env overrides for all tiers.
 * Unset env → byte-identical to MODELS.
 */
export function resolveModelCatalog(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Record<ModelTier, string> {
  const primary =
    env["MODEL_PRIMARY"]?.trim() ||
    env["CLAUDE_MODEL_PRIMARY"]?.trim() ||
    MODELS.sonnet;
  const cheap =
    env["MODEL_CHEAP"]?.trim() ||
    env["CLAUDE_MODEL_CHEAP"]?.trim() ||
    MODELS.haiku;
  const opus =
    env["MODEL_OPUS"]?.trim() ||
    env["CLAUDE_MODEL_OPUS"]?.trim() ||
    MODELS.opus;
  return {
    haiku: cheap || MODELS.haiku,
    sonnet: primary || MODELS.sonnet,
    opus: opus || MODELS.opus,
  };
}

/** Resolve the model id for a surface. Unknown surfaces fall back to Sonnet/primary. */
export function pickModelForSurface(
  surface: ClaudeSurface,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const tier = SURFACE_TIER[surface] ?? "sonnet";
  return resolveModelCatalog(env)[tier];
}

/** The currently-active tier for a surface. */
export function activeTierForSurface(surface: ClaudeSurface): ModelTier {
  return SURFACE_TIER[surface] ?? "sonnet";
}

export const ALL_SURFACES = Object.keys(SURFACE_TIER) as ClaudeSurface[];
