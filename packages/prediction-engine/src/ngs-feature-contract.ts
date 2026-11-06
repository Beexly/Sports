/**
 * Prediction-engine facade for the shared NGS feature contract.
 * The implementation lives in @sports/types so ingestion, prediction, and
 * web consumers cannot drift into separate weight/normalization policies.
 */
export {
  NGS_FEATURE_SOURCE,
  NGS_FEATURE_CATEGORY,
  NGS_FEATURE_WEIGHTS,
  NGS_FEATURE_CONFIDENCE,
  NGS_FEATURE_KEYS,
  NGS_TEAM_SIGNAL_KEY,
  NGS_SIGNAL_WEEK,
  NGS_TEAM_WEIGHT,
  NGS_TEAM_CONFIDENCE,
  NGS_TEAM_MAX_SCORE,
  NGS_TEAM_MIN_CONTRIBUTION,
  canonicalizeNgsTeamKey,
  ngsTeamKeyAliases,
  normalizeNgsFeatures,
  ngsFeaturesToLedgerSignals,
  ngsTeamScore,
  ngsTeamComparisonToLedgerSignal,
  compareNgsTeams,
  isUsableNgsContextSignal,
  ngsReferenceAtMs,
  ngsEffectiveWeight,
  ngsTeamContributionScore,
  isUsableNgsContextPair,
  hasNgsTeamValue,
} from "@sports/types";
export type {
  NgsFeatureKey,
  NgsFeatureInput,
  NgsFeature,
  NgsLedgerSignalRow,
  NgsTeamFeatureInput,
  NgsTeamComparison,
} from "@sports/types";
