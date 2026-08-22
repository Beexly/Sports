export {
  OddsApiClient,
  OddsApiError,
  type OddsApiHistoricalSnapshot,
  type OddsApiParticipant,
} from "./odds-api-client.js";
export {
  KalshiClient,
  KalshiError,
  toKalshiEventTicker,
  impliedYesProbability,
  devigTwoSided,
  toIndependentFairValue,
  eventTickerMatchesGame,
  type KalshiLeague,
  type KalshiGameRef,
  type KalshiSideFairValue,
  type KalshiFairValue,
  type KalshiLeagueCode,
  sportKeyToKalshiLeagueCode,
  gameSeriesForLeague,
} from "./kalshi-client.js";
export {
  KALSHI_SERIES,
  KALSHI_GAME_SERIES,
  leagueToSportCode,
  constructedEventSeriesStem,
  toKalshiDateFragment,
  toKalshiTimeFragment,
  MAX_MARKET_START_SKEW_MS,
  KALSHI_TICKER_TZ,
  parseKalshiEventTail,
  type KalshiSportCode,
} from "./kalshi-series.js";
export {
  ClubEloClient,
  ClubEloError,
  isClubEloSport,
  normalizeClubName,
  clubEloLookupName,
  fixtureRowToTwoWay,
  ratingsToTwoWay,
  getSharedClubEloClient,
  resetClubEloClientForTests,
} from "./clubelo-client.js";
export {
  PolymarketIndependentClient,
  PolymarketIndependentError,
  isPolymarketIndependentEnabled,
  gammaMarketToIndependent,
  teamMatchTokens,
  POLYMARKET_GAMMA_BASE,
} from "./polymarket-independent-client.js";
export {
  sportKeyToPowerIndexLeague,
  fetchEspnPowerIndexPage,
  fetchEspnTeamMetaMap,
  loadEspnPowerIndexMap,
  lookupTeamFpi,
  getCachedEspnPowerIndexMap,
  defaultPowerIndexSeason,
  EspnPowerIndexError,
  type EspnPowerIndexLeague,
} from "./espn-powerindex-client.js";
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
  buildIdCrosswalk,
  resolveGsisId,
  resolveGsisFromRow,
  type IdVendor,
  type CrosswalkRow,
  type IdCrosswalk,
} from "./nflverse-id-crosswalk.js";
export {
  currentNflSeasonLabel,
  latestCompletedNflSeasonFloor,
  resolveFootballStatsSeason,
  type StatsSeasonResolution,
} from "./nflverse-season.js";
export {
  probeNflverseSourceCurrency,
  type NflverseCurrencyAssetResult,
  type NflverseCurrencyProbeResult,
  type NflverseCurrencyProbeOptions,
} from "./nflverse-currency-probe.js";
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
  THIN_FILL_MIN_BOOKMAKERS,
  THIN_FILL_COMMENCE_MATCH_MS,
  eventBookmakerCount,
  eventsBelowBookmakerThreshold,
  eventTeamsMatch,
  matchSecondaryEventToPrimary,
  mergeBookmakersIntoPrimary,
  type ThinFillMergeResult,
} from "./odds-event-merge.js";
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
  OfflineOddsProvider,
  TheOddsApiOddsProvider,
  createOddsQuoteProvider,
  isCertifiableOddsProvider,
  type OddsProviderId,
  type OddsProviderCapabilities,
  type OddsProviderHealth,
  type OddsQuoteProvider,
  type TheOddsApiOddsProviderOptions,
  type CreateOddsQuoteProviderOptions,
} from "./odds-provider-adapter.js";
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
export { SharpApiClient, SharpApiError, isSharpApiIngestEnabled, SHARP_API_BASE, SHARP_API_SOURCE_ID } from "./sharp-api-client.js";
export {
  ProphetXMarketDataClient,
  ProphetXError,
  isProphetXMarketDataEnabled,
  PROPHETX_MARKET_DATA_BASE,
  PROPHETX_SOURCE_ID,
} from "./prophetx-client.js";
export {
  NovigRestClient,
  NovigPublicCsvClient,
  NovigError,
  isNovigRestEnabled,
  isNovigPublicCsvEnabled,
  NOVIG_REST_BASE,
  NOVIG_CSV_BASE,
  NOVIG_REST_SOURCE_ID,
  NOVIG_CSV_SOURCE_ID,
  type NovigPublicCsvIndex,
} from "./novig-client.js";
export * from "./config.js";
export {
  freshnessMode,
  dynamicFreshnessThresholdMs,
  resolveFreshnessThresholdMs,
  type FreshnessMode,
} from "./freshness-schedule.js";

export {
  normalizeComparableText,
  findMatchingTeamInText,
  parseSportsScore,
} from "./team-text-match.js";

export {
  resolveRundownApiKey,
  rundownApiKeyPresence,
  fetchRundownEventsForSport,
  rundownEventToOddsApiEvent,
  RUNDOWN_SPORT_IDS,
  RUNDOWN_API_KEY_ENV_NAMES,
} from "./rundown-client.js";
export type { RundownFetchResult, RundownApiKeyEnvName } from "./rundown-client.js";

export {
  resolveOddsApiKey,
  oddsApiKeyPresence,
  ODDS_API_KEY_ENV_NAMES,
} from "./odds-api-key.js";
export type { OddsApiKeyEnvName } from "./odds-api-key.js";

export {
  fetchEspnOddsForSport,
  ESPN_ODDS_SPORT_MAP,
} from "./espn-odds-client.js";
export type { EspnOddsFetchResult } from "./espn-odds-client.js";

export {
  NFL_PRESEASON_ODDS_KEY,
  NFL_CANONICAL_SPORT_KEY,
  NFL_PRESEASON_COMMENCE_MATCH_MS,
  isNflPreseasonFetchWindow,
  nflTeamsMatch,
  matchPreseasonRowToExistingGame,
  remapPreseasonRows,
  mergeFeedRowsById,
} from "./nfl-preseason-map.js";
export type {
  OddsIngestKey,
  ExistingGameMatch,
  PreseasonFeedRow,
} from "./nfl-preseason-map.js";

export {
  parseEspnScoreboardForSeed,
  fetchEspnSeedGamesForSport,
  fetchAllEspnSeedGames,
  SHORT_TO_ODDS_SPORT,
  sportMetaForKey,
} from "./espn-schedule-seed.js";
export type { ShortSportKey, EspnSeedGame } from "./espn-schedule-seed.js";

export {
  fetchMlbStandings,
  buildMlbWinPctLookup,
  lookupMlbWinPct,
  fetchMlbCompletedGamesForDate,
  fetchMlbRecentCompletedGames,
} from "./mlb-statsapi-client.js";
export type { MlbStandingRow, MlbCompletedGame } from "./mlb-statsapi-client.js";
