export { OddsApiClient, OddsApiError } from "./odds-api-client.js";
export {
  KalshiClient,
  KalshiError,
  toKalshiEventTicker,
  impliedYesProbability,
  devigTwoSided,
  toIndependentFairValue,
  type KalshiLeague,
  type KalshiGameRef,
  type KalshiSideFairValue,
  type KalshiFairValue,
} from "./kalshi-client.js";
export { DataNormalizer } from "./normalizer.js";
export {
  enrichGameContext,
  trackOpeningLines,
  computeRestDays,
  computeScheduleDensity,
  getAtsForm,
  getHeadToHeadForm,
  settleGameLogs,
  gradeAtsCover,
} from "./context-enrichment.js";
export type { AtsCover } from "./context-enrichment.js";
export {
  getTeamScoringRecords,
  getLeagueAverageScored,
  type TeamScoringRecord,
} from "./team-rates-source.js";
export {
  NFLVERSE_CATALOG,
  NFLVERSE_BASE,
  nflverseUrl,
  parseCsv,
  decodeDatasetText,
  fetchNflverseText,
  fetchNflverse,
  type CsvTable,
  type NflverseDataset,
  type NflverseDatasetKey,
  type NflverseGrain,
} from "./nflverse-source.js";
// Next Gen Stats typed access (SEP/CUSH/xYAC receiving, RYOE/efficiency rushing) —
// CC-BY-4.0 via nflverse; dark/additive; avg_separation is the reconstruction
// engine's calibration ground truth. See docs/data/ngs-legal-leverage.md.
export {
  parseNgsReceiving,
  parseNgsRushing,
  parseNgsPassing,
  filterNgs,
  ngsReceivingToSeparationTruth,
  ngsPassingToCpoeTruth,
  NGS_FULL_SEASON_WEEK,
  type NgsReceivingRow,
  type NgsRushingRow,
  type NgsPassingRow,
  type SeparationTruth,
  type CpoeTruth,
} from "./nflverse-ngs.js";
export {
  NFLVERSE_TREND_PLANS,
  getNflverseTrendPlan,
  datasetsForTrendPlans,
  type NflverseJoinStep,
  type NflverseTrendPlan,
  type TrendPlanKey,
} from "./nflverse-trend-plan.js";
export {
  mergeNormalizedOdds,
  bookmakerCoverage,
  gamesBelowThreshold,
  resolveOddsWithFailover,
  type OddsProvider,
  type OddsProviderResult,
  type FailoverInput,
  type FailoverOutcome,
  type FailoverReason,
} from "./odds-failover.js";
export {
  OfflineStatsProvider,
  RegistryStatsProvider,
  createStatsProviders,
  mergeStatsFeatures,
  isCertifiableStatsProvider,
  type DataPlaneRole,
  type StatsProviderId,
  type StatsProviderCapabilities,
  type StatsProviderHealth,
  type StatsFeature,
  type StatsFetchQuery,
  type StatsProviderResult,
  type StatsProvider,
  type CreateStatsProvidersOptions,
} from "./stats-provider.js";
export {
  fetchWithFailover,
  withMirrors,
  nflverseMirror,
  type FetchLike,
  type FailoverResult,
} from "./fetch-failover.js";
export {
  fetchNflverseTableCached,
  resetNflverseTableCacheForTests,
  nflverseTableCacheStats,
  NflverseArtifactTooLargeError,
  NFLVERSE_MAX_RAW_BYTES,
  NFLVERSE_MAX_TEXT_BYTES,
  NFLVERSE_PROJECTIONS,
  NFLVERSE_TABLE_TTLS,
  type NflverseTableRequest,
  type NflverseTableResult,
} from "./nflverse-cache.js";
export {
  SOURCE_REGISTRY,
  getSource,
  isIngestible,
  assertIngestible,
  attributionFor,
  allSources,
  clearedSources,
  forbiddenSources,
  type LegalVerdict,
  type SourceLicense,
  type LegalSource,
} from "./source-registry.js";
export * from "./config.js";
export {
  freshnessMode,
  dynamicFreshnessThresholdMs,
  resolveFreshnessThresholdMs,
  type FreshnessMode,
} from "./freshness-schedule.js";
