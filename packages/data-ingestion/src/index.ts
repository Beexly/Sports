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
// Rights-gated MLB fantasy data plane (fetchers REQUIRE a SourceClearanceProof
// from the app-side clearance gate; compute-and-discard, never persist raw MLB
// payloads — see source-rights registry entries mlb-statsapi / baseball-savant).
export { assertCleared, type SourceClearanceProof } from "./source-clearance.js";
export {
  SAVANT_SOURCE_ID,
  SAVANT_BASE,
  SAVANT_SMASH_SELECTIONS,
  SavantError,
  buildSavantCustomUrl,
  parseSavantCustomCsv,
  toHitterSkillInputs,
  toPitcherSkillInputs,
  buildTeamStatcastAllowed,
  fetchSavantSmashLeaderboard,
  type SavantLeaderboardType,
  type SavantCustomRow,
  type SavantSkillRow,
  type TeamStatcastAllowed,
} from "./baseball-savant-source.js";
export {
  MLB_STATSAPI_SOURCE_ID,
  MLB_STATSAPI_BASE,
  MlbStatsApiError,
  ipToInnings,
  parseMlbPitchingStats,
  consolidateByPlayer,
  isReliever,
  relieverFipConstant,
  buildRelieverSeasons,
  buildTeamBullpenCategories,
  relieverPidToTeam,
  fetchMlbPitcherSeasons,
  type MlbPitcherSeasonLine,
  type ConsolidatedPitcherLine,
  type AdapterRelieverRow,
} from "./mlb-statsapi-source.js";
// nflverse → fantasy-engine NFL input mappers (CC-BY-4.0; fail-closed header
// assertions pin the verified-by-execution schema — drift throws, never misparses).
export {
  VALID_NFL_TEAMS,
  assertColumns,
  parsePlayerSeasonRows,
  toQbSeasons,
  parseAdvPassRows,
  parseAdvRushRows,
  parseAdvRecRows,
  parseAdvDefRows,
  buildTeamOffensiveLines,
  buildTeamDefensiveLines,
  buildReceiverSeasons,
  parsePbpFantasyPlays,
  buildTeamSchemeTendencies,
  buildTeamDefenseCategories,
  buildTeamWindowAggregates,
  topShare,
  PLAYER_SEASON_COLUMNS,
  ADV_PASS_COLUMNS,
  ADV_RUSH_COLUMNS,
  ADV_REC_COLUMNS,
  ADV_DEF_COLUMNS,
  PBP_FANTASY_COLUMNS,
  type NflPlayerSeasonRow,
  type AdvPassRow,
  type AdvRushRow,
  type AdvRecRow,
  type AdvDefRow,
  type PbpFantasyPlay,
} from "./nflverse-fantasy-source.js";
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
export * from "./config.js";
export {
  freshnessMode,
  dynamicFreshnessThresholdMs,
  resolveFreshnessThresholdMs,
  type FreshnessMode,
} from "./freshness-schedule.js";
