export interface SpatialQualityScoreInput {
  readonly visualQuality: number;
  readonly brandFit: number;
  readonly interactionClarity: number;
  readonly performance: number;
  readonly fallback: number;
  readonly ipSafety: number;
  readonly complianceSafety: number;
  readonly notGrayBox: number;
}

export interface SpatialQualityScore {
  readonly total: number;
  readonly passed: boolean;
  readonly blockers: readonly string[];
}

export function scoreSpatialQuality(input: SpatialQualityScoreInput): SpatialQualityScore {
  const entries = Object.entries(input);
  const blockers = entries.filter(([, value]) => value < 4).map(([key]) => key);
  const total = Math.round((entries.reduce((sum, [, value]) => sum + value, 0) / entries.length) * 10) / 10;
  return { total, passed: blockers.length === 0 && total >= 4, blockers };
}
