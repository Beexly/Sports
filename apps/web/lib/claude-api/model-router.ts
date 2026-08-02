/**
 * Model routing — the single, auditable place that decides which Claude tier
 * handles each Claude API "surface".
 *
 * 2026 lineup (cost ascending): Haiku (cheap, fast, structured) < Sonnet
 * (default reasoning) < Opus (deep reasoning).
 *
 * Env overrides (optional — default behavior unchanged when unset):
 *   MODEL_PRIMARY  — model id used for sonnet-tier (and default quality) surfaces
 *   MODEL_CHEAP    — model id used for haiku-tier surfaces
 * Optional aliases: CLAUDE_MODEL_PRIMARY / CLAUDE_MODEL_CHEAP
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
 * Resolved catalog: defaults from MODELS, optional env overrides for primary/cheap.
 * Unset env → byte-identical to MODELS.
 */
export function resolveModelCatalog(
  // Only two string keys are read, so accept any env-shaped bag. NodeJS.ProcessEnv
  // requires NODE_ENV under this repo's types, which made plain `{}` test fixtures
  // (and even a direct cast) fail to typecheck.
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
  return {
    haiku: cheap || MODELS.haiku,
    sonnet: primary || MODELS.sonnet,
    opus: MODELS.opus,
  };
}

/** Resolve the model id for a surface. Unknown surfaces fall back to Sonnet/primary. */
export function pickModelForSurface(surface: ClaudeSurface): string {
  const tier = SURFACE_TIER[surface] ?? "sonnet";
  return resolveModelCatalog()[tier];
}

/** The currently-active tier for a surface. */
export function activeTierForSurface(surface: ClaudeSurface): ModelTier {
  return SURFACE_TIER[surface] ?? "sonnet";
}

export const ALL_SURFACES = Object.keys(SURFACE_TIER) as ClaudeSurface[];
