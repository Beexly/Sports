/**
 * DATA INTELLIGENCE MESH — Source Quality Score.
 *
 *   SourceReliability = historical_accuracy × schema_stability × freshness_sla_hit_rate
 *                     × entity_mapping_confidence × correction_transparency
 *
 * A multiplicative score: any one weak dimension (a flaky schema, poor entity keys) drags the whole
 * source down, because a single broken link poisons the fact graph. Pure + deterministic.
 */

import type { SourceGenome } from "./source-genome.js";

export interface SourceQualityInputs {
  readonly historicalAccuracy: number;     // 0..1
  readonly schemaStability: number;        // 0..1
  readonly freshnessSlaHitRate: number;    // 0..1
  readonly entityMappingConfidence: number;// 0..1
  readonly correctionTransparency: number; // 0..1
}

export type QualityTier = "high" | "medium" | "low";

export interface SourceQualityResult {
  readonly reliability: number;
  readonly tier: QualityTier;
  readonly weakestDimension: keyof SourceQualityInputs;
  readonly note: string;
}

/** Compute source reliability as the product of its five quality dimensions. */
export function sourceReliability(i: SourceQualityInputs): SourceQualityResult {
  const dims: Array<[keyof SourceQualityInputs, number]> = [
    ["historicalAccuracy", i.historicalAccuracy],
    ["schemaStability", i.schemaStability],
    ["freshnessSlaHitRate", i.freshnessSlaHitRate],
    ["entityMappingConfidence", i.entityMappingConfidence],
    ["correctionTransparency", i.correctionTransparency],
  ];
  const reliability = Number(dims.reduce((p, [, v]) => p * v, 1).toFixed(4));
  const weakest = dims.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  const tier: QualityTier = reliability >= 0.5 ? "high" : reliability >= 0.2 ? "medium" : "low";
  return {
    reliability,
    tier,
    weakestDimension: weakest,
    note: `Reliability ${reliability} (${tier}); weakest dimension: ${weakest}.`,
  };
}

/** Derive a reliability estimate from a SourceGenome's measurable quality fields. */
export function reliabilityFromGenome(g: SourceGenome, historicalAccuracy = 0.8, freshnessSlaHitRate = 0.9, correctionTransparency = 0.7): SourceQualityResult {
  return sourceReliability({
    historicalAccuracy,
    schemaStability: g.schemaStability,
    freshnessSlaHitRate,
    entityMappingConfidence: g.entityKeyQuality,
    correctionTransparency,
  });
}
