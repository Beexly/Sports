export {
  HFA,
  K,
  REVERT,
  REVERT_MEAN,
  REVERSIONS,
  winProb,
  movMultiplier,
  absDeltaMultiplier,
  replay,
  publicPrior,
} from "./elo538.js"
export type { EloGame, ReplayRow } from "./elo538.js"
export { positivePartJamesStein } from "./jamesStein.js"
export { SHIFT_FLOOR, situationalShift, shouldWithhold } from "./withhold.js"
export {
  ANCHOR_MOTION_PA_SINGLE,
  ANCHOR_PRESSURE_HELD_TAX,
  cellEpa,
  computeGseSii,
  computeGseQptsr,
  computeGseRls,
  computeGseSpese,
  computeGseTor,
  computeGseSva,
  computeGseDwp,
  shannonBits,
} from "./metrics.js"
export type { Cell } from "./metrics.js"
export { CoachFenceError, assertCoachInputs } from "./fence.js"
export { KILLED_EDGES, mayReopen } from "./killed.js"
export type { KilledEdge } from "./killed.js"
export { SOURCE_REGISTRY } from "./registry.js"
export type { SourceRow, SourceStatus } from "./registry.js"
export { SHOWDOWN_CAP, SHOWDOWN_SLOTS, CAPTAIN_MULT, captainSalary, captainPoints, underCap, withinTeamLimit } from "./lineup.js"
export {
  SCORES365_ORIGIN,
  SPORT_AMERICAN_FOOTBALL,
  NFL_COMPETITION_ID,
  currentGamesUrl,
  fixturesUrl,
  parseScores365,
  fixturesWindow,
  homeVsAway,
  homeAwayScore,
} from "./scores365.js"
export type { LiveGame, LiveSide, ScoresBoard } from "./scores365.js"
export {
  additiveDevig,
  americanImplied,
  compareDevig,
  multiplicativeDevig,
  powerDevig,
  powerExponent,
  shinDevig,
  shinInsiderShare,
} from "./devig.js"
export type { DevigBook } from "./devig.js"
export { ESPN_NFL_SCOREBOARD, parseEspnScoreboard } from "./espn.js"
export type { EspnBoard } from "./espn.js"
export { brierScore, reliabilityBins, pageCusum, seriesWinProb, bestTeamTitleRate } from "./research.js"
export type { ReliabilityBin, SeasonGame } from "./research.js"
export {
  parseXPull,
  availabilityFromPosts,
  measurementsFromPosts,
  expectedEpaPerDropback,
  readCoachBrief,
  loadCoachCorpus,
  requireCorpus,
  personnelOnField,
  advanceWithCorpus,
} from "./x-corpus.js"
export type { CoachPost, CoachBrief, Availability, Measurement } from "./x-corpus.js"
export {
  scanNumbers,
  publishFromCorpus,
  markApplied,
  correctShowdownOwnership,
} from "./corpus-ledger.js"
export type { NumberToken, NumberUse, CoachPublished, OwnershipPosition } from "./corpus-ledger.js"
export { callSheet } from "./call-sheet.js"
export type { Call } from "./call-sheet.js"
export {
  WP_GARBAGE_HI,
  WP_GARBAGE_LO,
  feedDest,
  isKneelOrSpike,
  isGarbageWp,
  gradeRealizedPlays,
  FeedWriter,
  settleAndWrite,
} from "./realized-settlement.js"
export type { RealizedPlay, TrainerRecord } from "./realized-settlement.js"
export {
  CADENCE,
  T_MINUS_MINUTES,
  FIVE_MIN_SLOTS,
  XOR_WORDS,
  chicagoParts,
  dueVersion,
  tMinus90,
  sealLock,
  emptyMask,
  slotIndex,
  setBit,
  xorMasks,
} from "./cadence.js"
export type { CadenceVersion, WallClock, SnapshotLock } from "./cadence.js"
export { findBookImports, assertNoBookInCoachSource } from "./no-book-fence.js"
export { NE_CHI_GAME_ID, NE_CHI_FINAL, rejectNarrative } from "./narrative-rejections.js"
export type { PublicFacts, NarrativeClaim, NarrativeRejection } from "./narrative-rejections.js"
export { marchenkoPasturEdges, flagOutsideBulk } from "./marchenko.js"
export {
  gaussSolve,
  bradleyTerryProb,
  bradleyTerryMle,
  colleyRatings,
  masseyRatings,
  srsRatings,
  spPlusEfficiencyRatings,
  fpiDecomposition,
  pffStyleUnitGrades,
  kalmanRatings,
  hmm2RegimeFit,
  invertCompetitorRatingDeltas,
  marketStrengthsLeastSquares,
  stackWithMarket,
  publicHypeValuationCheck,
  deflatedSharpe,
  shinDevigClosedForm,
  normCdf,
  invNorm,
  erf,
} from "./rankings.js"
export type {
  TeamGame,
  RatingMap,
  KalmanRating,
  EpaSplit,
  PffSplits,
  CompetitorRatingDelta,
  MarketSlateRow,
} from "./rankings.js"
