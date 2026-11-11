/**
 * Shipped projection parameters — the resolved output of the research evidence.
 *
 * Generated from `research-evidence.json` via `resolveProjectionWiring(registry, 0.5)`.
 * Baked as literals rather than importing the JSON because this package does not enable
 * `resolveJsonModule`, and a barrel import of raw evidence would leak 35 records into
 * every consumer's bundle.
 *
 * Drift guard: `src/__tests__/research/shipped-params.test.ts` re-resolves the evidence at
 * test time and fails if these literals no longer match. Regenerate with
 * `scripts/build-shipped-params.mjs` (or update by hand and let the test confirm).
 */
import type { ProjectionParameters } from "../player-projection.js";

/**
 * Evidence behind these values: 35 quote-verified parameters from 32 papers.
 * - regression_games: 3 contributors (tau 2, tau 10, hierarchical EB 25) -> weighted 8 -> 13.33
 * - league_prior_ppr: 0 contributors, so it stays at the shipped default of 6
 * - Recency weights are NOT research-derived; they remain the engine default.
 */
export const SHIPPED_PROJECTION_PARAMETERS: ProjectionParameters = Object.freeze({
  recencyWeights: [0.6, 0.3, 0.1] as const,
  regressionGames: 13.333333333333332,
  leaguePriorPpr: 6,
  source: "research(3)",
});

/** True when at least one slot was moved by evidence rather than left at default. */
export const SHIPPED_PARAMETERS_RESEARCH_DERIVED = true;
