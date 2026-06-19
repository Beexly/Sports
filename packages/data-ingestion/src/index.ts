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
} from "./context-enrichment.js";
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
  fetchWithFailover,
  withMirrors,
  nflverseMirror,
  type FailoverResult,
} from "./fetch-failover.js";
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
export {
  fetchScoresWithPool,
  DEFAULT_SCORE_PROVIDERS,
  SCORE_POOL_COOLDOWN_MS,
  __resetScorePoolStateForTests,
  type ScorePoolResult,
  type ScorePoolOptions,
  type ScorePoolAttempt,
} from "./score-provider-pool.js";
export {
  type ScoreProvider,
  type ScoreProviderOptions,
  type NormalizedScore,
  type NormalizedScoreResult,
  type CheckClearanceFn,
  type ScoreClearanceRequest,
  type ScoreClearanceResult,
  type ScoreRightsSnapshot,
} from "./score-provider.js";
export {
  resolveFreeSettlementScores,
  normalizeTeamForMatch,
  COMMENCE_TOLERANCE_MS,
  type PendingGameForMatch,
  type ResolvedSettlementScore,
} from "./settlement-score-resolver.js";
export * from "./config.js";
