/**
 * Bridge: research evidence -> projection parameters.
 *
 * This is the wiring point the doctrine asks for. It resolves the model's named
 * slots from the corpus and hands back a complete, frozen parameter set. A caller
 * that passes no evidence gets byte-identical behaviour to the pre-research engine.
 */
import {
  DEFAULT_PROJECTION_PARAMETERS,
  type ProjectionParameters,
} from "../player-projection.js";
import { resolveParameter } from "./registry.js";
import { filterByDimension } from "./dimensions.js";
import type { ResearchEvidence } from "./types.js";

/** Canonical slot names. Evidence must use these exact names to be counted. */
export const PARAM_NAMES = Object.freeze({
  regressionGames: "regression_games",
  leaguePriorPpr: "league_prior_ppr",
});

export interface ResolvedProjectionWiring {
  readonly parameters: ProjectionParameters;
  readonly contributors: { readonly regressionGames: number; readonly leaguePriorPpr: number };
  readonly moved: boolean;
}

/**
 * Resolve both wired slots.
 *
 * `strength` is deliberately partial by default: the corpus is broad, but a paper
 * rarely speaks to this exact model's slot, so adopting its value outright would
 * overstate the evidence. 0 reproduces the defaults exactly; 1 adopts the
 * evidence value outright.
 */
export function resolveProjectionWiring(
  evidence: readonly ResearchEvidence[],
  strength = 0.5,
): ResolvedProjectionWiring {
  // Dimension gate BEFORE any arithmetic. A verified quote proves the sentence exists;
  // it does not prove the number is measured in the units this model uses. Evidence
  // outside a slot's declared dimension (e.g. a 390-DAY half-life offered to a
  // games-based slot) is dropped rather than rescaled or silently accepted.
  const gated = evidence.map((e) => ({
    ...e,
    parameters: filterByDimension(e.parameters).kept,
  }));

  const rg = resolveParameter(
    gated,
    PARAM_NAMES.regressionGames,
    DEFAULT_PROJECTION_PARAMETERS.regressionGames,
    strength,
  );
  const lp = resolveParameter(
    gated,
    PARAM_NAMES.leaguePriorPpr,
    DEFAULT_PROJECTION_PARAMETERS.leaguePriorPpr,
    strength,
  );
  const moved = rg.contributors > 0 || lp.contributors > 0;
  return {
    parameters: {
      recencyWeights: DEFAULT_PROJECTION_PARAMETERS.recencyWeights,
      regressionGames: rg.value,
      leaguePriorPpr: lp.value,
      source: moved ? `research(${rg.contributors + lp.contributors})` : "default",
    },
    contributors: { regressionGames: rg.contributors, leaguePriorPpr: lp.contributors },
    moved,
  };
}
