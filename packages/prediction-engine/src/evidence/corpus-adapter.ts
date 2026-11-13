/**
 * Bridge between the corpus loader's records and the Stage-2 shrink function.
 *
 * `applyCorpusGroundingToFamilyDeltas` was written against `GameGrounding`, the
 * rich object `groundGame` returns. The evidence bundle carries the flattened
 * `CorpusGroundingRecord[]` instead, because that is what survives a seal. This
 * module rebuilds the shape the shrink function needs, and applies it to the
 * measured family deviations.
 *
 * What the shrink does, and does not, do: corpus support may only SHRINK a
 * family toward zero. It never grows, flips or creates a delta. A family with
 * no corpus counterpart is left untouched, because absence of a facet is not
 * evidence against the mechanism.
 *
 * The emission weight stays zero. The shrink changes the diagnostic deviation,
 * not the posterior.
 */

import type {
  FacetGrounding,
  GameGrounding,
  SituationalFamily,
} from "../literature/corpus-grounding.js";
import {
  applyCorpusGroundingToFamilyDeltas,
  UNSUPPORTED_FAMILY_FLOOR,
  type FamilyGroundingAdjustment,
} from "../literature/corpus-grounding.js";
import type { CorpusGroundingRecord } from "./types.js";
import type { FamilyDiagnostic } from "./family-diagnostics.js";

/**
 * Which diagnostic family corresponds to which corpus family.
 *
 * Only the two unambiguous pairs are mapped. `formEpa`, `injuries`, `coaching`,
 * `corpusTactical`, `premisesAndEquations` and `nflFarmPriors` have no facet in
 * the current library, so they are left untouched rather than forced onto a
 * family that measures something else. Adding a pair here is a claim that the
 * two measure the same mechanism, and it should be argued for, not assumed.
 */
export const DEFAULT_FAMILY_MAP: Readonly<Record<string, SituationalFamily>> = {
  rest: "restFatigue",
  weather: "weather",
};

/**
 * Rebuild a `GameGrounding` from the flattened records.
 *
 * The records do not carry the original facet weight, so every facet is given
 * equal weight here and `overallSupport` is the unweighted mean. That is stated
 * rather than hidden: a weighted mean would need a weight the record does not
 * have, and inventing one would be the exact defect this work exists to remove.
 */
export function toGameGrounding(
  records: readonly CorpusGroundingRecord[],
  gameId: string | null,
): GameGrounding {
  const facets: FacetGrounding[] = records.map((r) => ({
    family: r.family as SituationalFamily,
    query: r.facet,
    // Equal weight: the record does not carry the original facet weight.
    facetWeight: 1,
    support: r.support,
    // Citations are carried on the record, not as GroundingEvidence. The shrink
    // reads `support` and `layerErrors` only, so an empty evidence array here
    // changes nothing it computes.
    evidence: [],
    chunkMode: "none",
    layerErrors: [],
  }));
  const n = facets.length;
  const overall = n === 0 ? 0 : facets.reduce((s, f) => s + f.support, 0) / n;
  const covered = records.filter((r) => r.citations.length > 0).length;
  return {
    gameId,
    facets,
    overallSupport: Number(overall.toFixed(6)),
    coverage: n === 0 ? 0 : Number((covered / n).toFixed(6)),
    latencyMs: 0,
  };
}

export interface CorpusShrinkResult {
  readonly diagnostics: readonly FamilyDiagnostic[];
  readonly adjustments: readonly FamilyGroundingAdjustment[];
  /** Diagnostic families that had a corpus counterpart and were shrunk. */
  readonly appliedFamilies: readonly string[];
  /** Diagnostic families with no corpus counterpart, left untouched. */
  readonly unmappedFamilies: readonly string[];
  /** True when a grounding object was supplied at all. */
  readonly groundingPresent: boolean;
  /** Diagnostic families that mapped to a corpus family already taken. */
  readonly collisions: readonly string[];
}

/**
 * Apply the corpus shrink to the measured deviations.
 *
 * Only families with a non-null deviation and a mapped corpus family are
 * touched. Everything else keeps multiplier 1 and its measured deviation.
 */
export function applyCorpusShrink(
  diagnostics: readonly FamilyDiagnostic[],
  grounding: GameGrounding | null | undefined,
  familyMap: Readonly<Record<string, SituationalFamily>> = DEFAULT_FAMILY_MAP,
): CorpusShrinkResult {
  if (grounding === null || grounding === undefined) {
    return {
      diagnostics,
      adjustments: [],
      appliedFamilies: [],
      unmappedFamilies: diagnostics.map((d) => d.family),
      groundingPresent: false,
      collisions: [],
    };
  }

  // The shrink function keys its deltas by CORPUS family name, not by our
  // diagnostic name. Build the record under the corpus key, apply, then map the
  // result back. Two diagnostic families mapping to one corpus family would
  // collide, so the first wins and the collision is reported.
  const deltas: Record<string, number> = {};
  const mapped: string[] = [];
  const unmapped: string[] = [];
  const collisions: string[] = [];
  const corpusKeyFor = new Map<string, string>();
  for (const d of diagnostics) {
    const corpusFamily = familyMap[d.family];
    if (corpusFamily === undefined || d.deviation === null) {
      unmapped.push(d.family);
      continue;
    }
    if (deltas[corpusFamily] !== undefined) {
      collisions.push(`${d.family}->${corpusFamily}`);
      unmapped.push(d.family);
      continue;
    }
    deltas[corpusFamily] = d.deviation;
    corpusKeyFor.set(d.family, corpusFamily);
    mapped.push(d.family);
  }

  const { deltas: shrunk, adjustments } = applyCorpusGroundingToFamilyDeltas(deltas, grounding);

  const byCorpusFamily = new Map<string, FamilyGroundingAdjustment>();
  for (const a of adjustments) byCorpusFamily.set(a.family, a);

  const next = diagnostics.map((d) => {
    const corpusFamily = corpusKeyFor.get(d.family);
    if (corpusFamily === undefined) return d;
    const adj = byCorpusFamily.get(corpusFamily);
    if (adj === undefined) return d;
    const value = shrunk[corpusFamily];
    const shrunkDeviation = typeof value === "number" ? value : d.deviation;
    return {
      ...d,
      corpusSupport: adj.support,
      corpusMultiplier: adj.multiplier,
      shrunkDeviation,
    };
  });

  return {
    diagnostics: next,
    adjustments,
    appliedFamilies: mapped,
    unmappedFamilies: unmapped,
    groundingPresent: true,
    collisions,
  };
}

/** The floor the shrink can never go below. Re-exported for the trace. */
export const CORPUS_SHRINK_FLOOR = UNSUPPORTED_FAMILY_FLOOR;
