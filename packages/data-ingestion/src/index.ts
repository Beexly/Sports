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
  KALSHI_LISTING_METHOD_TAG,
  DEFAULT_LISTING_MAX_SPREAD,
  kalshiPriceToUnit,
  yesAskFromNoBid,
  gateKalshiListing,
  gateKalshiLastOrCandle,
} from "./kalshi-listing-quote.js";
export type { ListingRefuse, ListingSource, ListingQuote } from "./kalshi-listing-quote.js";
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
  ingestionTargetNflSeason,
  latestCompletedNflSeasonFloor,
  resolveFootballStatsSeason,
  resolveFootballStatsSeasonAsync,
  type RegRowsProbe,
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
  KALSHI_TAKER_FEE_RATE,
  kalshiTakerFeeDollars,
  kalshiEffectiveAskPrice,
  americanToImpliedPrice,
  applyKalshiTakerFeeToAmericanPrice,
  applyKalshiTakerFeeToBookmakers,
} from "./kalshi-fee.js";
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
  GalaxySportsApiOddsProvider,
  createOddsQuoteProvider,
  isCertifiableOddsProvider,
  type OddsProviderId,
  type OddsProviderCapabilities,
  type OddsProviderHealth,
  type OddsQuoteProvider,
  type TheOddsApiOddsProviderOptions,
  type CreateOddsQuoteProviderOptions,
  OddsPapiOddsProvider,
  createSecondaryOddsProvider,
  fetchDualProviderOdds,
  type OddsPapiOddsProviderOptions,
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
export {
  PredExonClient,
  PredExonError,
  isPredExonIngestEnabled,
  PREDEXON_BASE,
  PREDEXON_KEY_HEADER,
  PREDEXON_SOURCE_ID,
  type PredExonKalshiMarket,
  type PredExonKalshiMarketsPage,
} from "./predexon-client.js";
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
export {
  DFS_ODDS_BOOKS,
  fetchDfsOddsIfEnabled,
  isDfsOddsEnabled,
} from "./dfs-odds.js";
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
  composeRundownTeamName,
  RUNDOWN_SPORT_IDS,
  RUNDOWN_AFFILIATE_BOOK_KEYS,
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
  resolveOddsPapiKey,
  oddsPapiKeyPresence,
  ODDSPAPI_KEY_ENV_NAMES,
} from "./oddspapi-key.js";
export type { OddsPapiKeyEnvName } from "./oddspapi-key.js";

export {
  OddsPapiClient,
  OddsPapiError,
  ODDSPAPI_BASE_URL,
  ODDSPAPI_TIMEOUT_MS,
  ODDSPAPI_NFL_SPORT_ID,
  ODDSPAPI_NFL_TOURNAMENT_ID,
  ODDSPAPI_NCAA_TOURNAMENT_ID,
  ODDSPAPI_NFL_PROP_FAMILIES,
  ODDSPAPI_COOLDOWNS_MS,
  parseRetryMs,
  parseAmericanPrice,
  dedupeHeartbeatSnapshots,
  deriveClosingSnapshot,
  resolveMarketIdsByName,
  classifyGameLineMarket,
} from "./oddspapi-client.js";
export type {
  OddsPapiFetchResult,
  OddsPapiFixture,
  OddsPapiPrice,
  OddsPapiMarket,
  OddsPapiOutcome,
  OddsPapiBookmakerOdds,
  OddsPapiOddsResponse,
  OddsPapiHistoricalSnapshot,
  OddsPapiHistoricalResponse,
  OddsPapiSettlement,
  OddsPapiSettlementResult,
  OddsPapiMarketCatalogEntry,
  OddsPapiAccount,
  OddsPapiFixturesParams,
  OddsPapiOddsParams,
  OddsPapiHistoricalParams,
  OddsPapiSettlementsParams,
} from "./oddspapi-client.js";

export {
  normalizeOddsPapiOdds,
  buildOddsPapiCatalog,
  resolveOutcomeSide,
  isInternalOddsPapiFeed,
} from "./oddspapi-normalizer.js";
export type { OddsPapiCatalog, OutcomeSide } from "./oddspapi-normalizer.js";

export {
  decideOddsPapiCall,
  hoursToOddsPapiMonthEnd,
  oddsPapiReservePaceOk,
  oddsPapiZeroObservationIsStale,
  ODDSPAPI_MONTHLY_CREDITS,
  ODDSPAPI_DAILY_BUDGET,
  ODDSPAPI_HOURLY_BUDGET,
  ODDSPAPI_BILLABLE_MIN_INTERVAL_MS,
} from "./oddspapi-credit-governor.js";
export type {
  OddsPapiCallPurpose,
  OddsPapiCallDecisionInput,
  OddsPapiCallDecision,
} from "./oddspapi-credit-governor.js";

export { americanToDecimal, deVigFairProbs } from "./galaxy-devig.js";
export {
  KALSHI_BOOK_KEY,
  KALSHI_BOOK_TITLE,
  KALSHI_LINE_SERIES,
  probToAmerican,
  kalshiH2hBookmaker,
  predexonTwoWay,
  parseKalshiSpreadLine,
  parseKalshiTotalLine,
  PredExonKalshiCatalog,
  createGalaxySecondBook,
} from "./galaxy-kalshi-book.js";
export type {
  KalshiSpreadLine,
  PredExonTwoWay,
  PredExonCatalogSeries,
  PredExonKalshiCatalogOptions,
} from "./galaxy-kalshi-book.js";

export {
  fetchEspnOddsForSport,
  GALAXY_ESPN_INLINE_SOURCE_ID,
  ESPN_ODDS_SPORT_MAP,
} from "./espn-odds-client.js";
export type {
  EspnOddsFetchResult,
  GalaxySecondBook,
  GalaxySecondBookGameRef,
} from "./espn-odds-client.js";
export {
  getOddsPaymentCircuitBreaker,
  type OddsCircuitState,
} from "./odds-api-circuit-breaker.js";

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
  ESPN_SCOREBOARD_LIMIT,
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

export {
  SPORTSDB_NFL_LEAGUE_ID,
  fetchSportsDbNflTeams,
  fetchSportsDbNflSeasonEvents,
  fetchSportsDbTeamPlayers,
  buildSportsDbTeamLookup,
  lookupSportsDbTeam,
  currentSportsDbSeason,
  resetSportsDbThrottleForTests,
} from "./thesportsdb-client.js";
export type {
  SportsDbTeam,
  SportsDbEvent,
  SportsDbPlayer,
  SportsDbOptions,
} from "./thesportsdb-client.js";

export {
  MONTHLY_CREDITS,
  DAILY_BUDGET,
  HOURLY_BUDGET,
  EVENT_HORIZON_HOURS,
  PAID_CALL_MIN_INTERVAL_MS,
  PAID_CALL_PURPOSES,
  hoursToMonthEnd,
  reservePaceOk,
  zeroObservationIsStale,
  decidePaidOddsCall,
  evaluatePaidOddsCall,
  projectCreditExhaustion,
  emptyOddsCreditTruth,
  buildOddsCreditTruth,
} from "./odds-credit-governor.js";
export type {
  PaidCallPurpose,
  PaidCallDecisionInput,
  PaidCallDecision,
  PaidCallEvaluation,
  HourlySlot,
  OddsCreditObservation,
  OddsCreditTruth,
} from "./odds-credit-governor.js";
export {
  ODDS_CREDITS_SCOPE,
  ODDS_PAID_CALL_SCOPE,
  CREDIT_OBSERVATION_WINDOW_LIMIT,
  recordCreditObservation,
  loadLatestCreditObservation,
  loadCreditObservationsSince,
  recordPaidCall,
  loadLatestPaidCallAt,
  loadLatestPaidCallAnyPurposeAt,
  reservePaidCallSlot,
  paidCallMutexKey,
  resetPaidCallReservationWarning,
  loadOddsCreditTruth,
} from "./odds-credit-ledger.js";
export type {
  OddsCreditLedgerDb,
  OddsCreditLedgerRows,
  OddsCreditLedgerTx,
  PaidCallMarker,
  ReservePaidCallSlotInput,
  PaidCallSlotReservation,
} from "./odds-credit-ledger.js";
export {
  ODDS_KEY_TO_ESPN_SHORT,
  STARTED_GRACE_HOURS,
  ESPN_GOVERNOR_GROUPS,
  espnGovernorGroups,
  espnScoreboardDateRange,
  hasEventWithinHorizon,
  sportHasEventWithin48h,
  buildPaidOddsGovernor,
} from "./paid-odds-governor.js";
export type { PaidOddsGovernor, PaidOddsGovernorDeps } from "./paid-odds-governor.js";
// ── WIRE-40 (2026-09-18): 40 verified new inputs, CATALOG tier ──────────────
export {
  FTN_STATSIQ_CATALOG_ID,
  FTN_STATSIQ_HOME_ID,
  FTN_STATSIQ_BASE,
  FTN_STATSIQ_ATTRIBUTION,
  isFtnStatsIqIngestEnabled,
  FtnStatsIqError,
  type StatsIqColumn,
  type StatsIqTable,
  type StatsIqCatalog,
  type StatsIqCardRow,
  type StatsIqCard,
  type StatsIqHome,
  FtnStatsIqClient,
} from "./ftn-statsiq-client.js";
export {
  PFF_SOURCE_ID,
  PFF_BASE,
  PFF_ATTRIBUTION,
  isPffGradesIngestEnabled,
  PffGradesError,
  type PffGrade,
  type PffPlayerGrades,
  PffGradesClient,
} from "./pff-grades-client.js";
export {
  SHARP_FOOTBALL_BASE,
  SHARP_FOOTBALL_ATTRIBUTION,
  PAGE_PATHS,
  type SharpFootballSourceId,
  isSharpFootballIngestEnabled,
  SharpFootballError,
  type SharpFootballRow,
  type SharpFootballPage,
  SharpFootballClient,
} from "./sharp-football-client.js";
export {
  PREGAME_BASE,
  PREGAME_SOCKET_BASE,
  PREGAME_ATTRIBUTION,
  isPregameIngestEnabled,
  PregameError,
  type ConsensusTick,
  type ConsensusHistory,
  type OddsTick,
  type OddsHistory,
  type Sportsbook,
  type PregameConsensusMeta,
  type PregameOddsMeta,
  type PregameEvent,
  type EventListing,
  PregameClient,
} from "./pregame-client.js";
export {
  ACTION_NETWORK_SOURCE_ID,
  ACTION_NETWORK_BASE,
  ACTION_NETWORK_ATTRIBUTION,
  isActionNetworkIngestEnabled,
  ActionNetworkError,
  type ActionNetworkSplit,
  type ActionNetworkBetInfo,
  type ActionNetworkMarket,
  type ActionNetworkGame,
  type ActionNetworkPublicBetting,
  ActionNetworkClient,
} from "./action-network-client.js";
export {
  COVERS_ODDS_HISTORY_SOURCE_ID,
  COVERS_LIVE_ODDS_SOURCE_ID,
  COVERS_BASE,
  COVERS_ODDS_HISTORY_ATTRIBUTION,
  COVERS_LIVE_ODDS_ATTRIBUTION,
  isCoversIngestEnabled,
  CoversError,
  type CoversSeasonHistoryRow,
  type CoversLiveBookOdds,
  type CoversLiveGame,
  CoversClient,
} from "./covers-client.js";
export {
  VSIN_SOURCE_ID,
  VSIN_BASE,
  VSIN_ATTRIBUTION,
  isVsinIngestEnabled,
  VsinError,
  type VsinSplitsTable,
  type VsinSplitsArticle,
  VsinClient,
} from "./vsin-client.js";
export {
  DKN_SOURCE_ID,
  DKN_BASE,
  DKN_ATTRIBUTION,
  isDknSplitsIngestEnabled,
  DknSplitsError,
  type DknSplitSide,
  type DknGameSplits,
  DknNetworkClient,
} from "./dknetwork-client.js";
export {
  DRAFTKINGS_DFS_CONTESTS_SOURCE_ID,
  DRAFTKINGS_DFS_PLAYERS_SOURCE_ID,
  DRAFTKINGS_DFS_BASE,
  DRAFTKINGS_DFS_ATTRIBUTION,
  isDraftKingsDfsIngestEnabled,
  DraftKingsDfsError,
  type DkContest,
  type DkAvailablePlayer,
  DraftKingsDfsClient,
} from "./draftkings-dfs-client.js";
export {
  KEEPTRADECUT_SOURCE_ID,
  KEEPTRADECUT_BASE,
  KEEPTRADECUT_ATTRIBUTION,
  KeepTradeCutError,
  type KtcValueEntry,
  type KtcTePremiumEntry,
  type KtcPlayer,
  type KtcDynastyRankings,
  KeepTradeCutClient,
} from "./keeptradecut-client.js";
export {
  FANTASYPROS_ECR_SOURCE_ID,
  FANTASYPROS_ECR_BASE,
  FANTASYPROS_ECR_ATTRIBUTION,
  FantasyProsEcrError,
  type EcrPlayer,
  type EcrMeta,
  type EcrPprResult,
  FantasyProsEcrClient,
} from "./fantasypros-ecr-client.js";
export {
  FOURFORFOUR_SOURCE_ID,
  FOURFORFOUR_BASE,
  FOURFORFOUR_ATTRIBUTION,
  type CheatsheetVariant,
  FourforFourError,
  type CheatsheetEntry,
  type CheatsheetSection,
  type CheatsheetResult,
  FourforFourClient,
} from "./fourforfour-client.js";
export {
  DYNASTYPROCESS_SOURCE_ID,
  DYNASTYPROCESS_BASE,
  DYNASTYPROCESS_ATTRIBUTION,
  DynastyProcessError,
  type DpPlayerValue,
  type DpPlayerValues,
  type DpPickValue,
  type DpPickValues,
  DynastyProcessClient,
} from "./dynastyprocess-client.js";
export {
  UNDERDOG_STATS_SOURCE_ID,
  UNDERDOG_PROJECTIONS_SOURCE_ID,
  UNDERDOG_BASE,
  UNDERDOG_ATTRIBUTION,
  UNDERDOG_PROJECTIONS_ATTRIBUTION,
  isUnderdogIngestEnabled,
  UnderdogError,
  type UnderdogSport,
  type UnderdogScoringType,
  type UnderdogSlate,
  type UnderdogAppearance,
  UnderdogClient,
} from "./underdog-client.js";
export {
  SLEEPER_STATE_SOURCE_ID,
  SLEEPER_PLAYERS_SOURCE_ID,
  SLEEPER_TRENDING_SOURCE_ID,
  SLEEPER_BASE,
  SLEEPER_STATE_ATTRIBUTION,
  SLEEPER_PLAYERS_ATTRIBUTION,
  SLEEPER_TRENDING_ATTRIBUTION,
  isSleeperFeedsIngestEnabled,
  SleeperError,
  type SleeperNflState,
  type SleeperPlayerIds,
  type SleeperPlayer,
  type SleeperPlayersResult,
  type SleeperTrendingEntry,
  SleeperFeedsClient,
} from "./sleeper-feeds-client.js";
export {
  SPREADSPOKE_SCORES_SOURCE_ID,
  SPREADSPOKE_BASE,
  SPREADSPOKE_ATTRIBUTION,
  isSpreadSpokeIngestEnabled,
  SpreadSpokeError,
  type SpreadSpokeGame,
  SpreadSpokeClient,
} from "./spreadspoke-client.js";
export {
  TEAMRANKINGS_RATINGS_SOURCE_ID,
  TEAMRANKINGS_TRENDS_SOURCE_ID,
  TEAMRANKINGS_BASE,
  TEAMRANKINGS_RATINGS_ATTRIBUTION,
  TEAMRANKINGS_TRENDS_ATTRIBUTION,
  TeamRankingsError,
  type TrRating,
  type TrTrendRow,
  TeamRankingsClient,
} from "./teamrankings-client.js";
export {
  ROTOWIRE_RSS_SOURCE_ID,
  ROTOWIRE_BASE,
  ROTOWIRE_RSS_ATTRIBUTION,
  RotoWireError,
  type RwNewsItem,
  RotoWireClient,
} from "./rotowire-rss-client.js";
export {
  DVOA_TIMESERIES_LOCAL_SOURCE_ID,
  DVOA_HISTORICAL_LOCAL_SOURCE_ID,
  DVOA_FO_FINALS_LOCAL_SOURCE_ID,
  FO_WAYBACK_DVOA_1983_SOURCE_ID,
  DVOA_TIMESERIES_ATTRIBUTION,
  DVOA_HISTORICAL_ATTRIBUTION,
  DVOA_FO_FINALS_ATTRIBUTION,
  FO_WAYBACK_DVOA_1983_ATTRIBUTION,
  DVOA_LOCAL_CSV_DIR,
  FO_WAYBACK_DVOA_1983_URL,
  DvoaArchiveError,
  type DvoaRow,
  type Dvoa1983Row,
  DvoaArchiveClient,
} from "./dvoa-archive-client.js";
export {
  FTN_CHARTING_SPEC_SOURCE_ID,
  FTN_CHARTING_BASE,
  FTN_CHARTING_SPEC_ATTRIBUTION,
  FtnChartingSpecError,
  type FtnChartingOpenApiSummary,
  isFtnChartingSpecIngestEnabled,
  FtnChartingSpecClient,
} from "./ftn-charting-spec-client.js";

// Source Atlas Harvester — Access 1,500+ sources by league, team, and signal family
export {
  loadSourceAtlas,
  getSourcesByLeague,
  getSourcesByTeam,
  getSourcesByFamily,
  mapSourceToSignalFamily,
  type SourceAtlasEntry,
  type SourceAtlasRegistryData,
} from "./source-atlas-harvester.js";

// Calibration weights — empirical P(WIN) recalibration + signal weights from 2,826 graded picks
export {
  CONFIDENCE_RECALIBRATION,
  WEIGHT_BY_PICK_TYPE,
  WEIGHT_BY_SPORT,
  WEIGHT_BY_GRADE,
  WEIGHT_BY_MODEL_VERSION,
  PUBLISH_ACTIONS,
  SIGNAL_COVERAGE_LIVE,
  calibratedWinProb,
  combinedSignalWeight,
  shouldSuppress,
  type ConfidenceRecalibration,
  type SignalWeight,
  type PublishAction,
} from "./calibration-weights.js";

