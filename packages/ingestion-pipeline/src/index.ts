export { processSport } from "./process-sport.js";
export type { SportConfig, ProcessSportResult } from "./process-sport.js";
export {
  settleSport,
  SCORELESS_COMPLETED_ANOMALY,
  SCORELESS_REVIEW_THRESHOLD,
} from "./settle-sport.js";
export type { SettleSportConfig, SettleSportResult, SettleSportOptions } from "./settle-sport.js";
export {
  recordScorelessCompletedEvidence,
  fingerprintScorePayload,
  countCorroboratingRuns,
  MIN_CORROBORATION_SEPARATION_MINUTES,
  OWNER_DECISION_KINDS,
  SYSTEM_DECISION_KINDS,
} from "./settlement-evidence.js";
export type {
  ScorelessEvidenceInput,
  ScorelessEvidenceOutcome,
  SettlementEvidenceDb,
  SettlementEvidenceTx,
  OwnerDecisionKind,
  CorroborationObservation,
} from "./settlement-evidence.js";
export {
  computeScheduledWindow,
  fingerprintSourceSnapshot,
  getOrCreateSettlementRun,
  settlementRunIdempotencyKey,
} from "./settlement-run.js";
export type {
  SettlementRunDb,
  SettlementRunIdentity,
  ResolvedSettlementRun,
} from "./settlement-run.js";
export { recordOwnerSettlementDecision } from "./settlement-decisions.js";
export type {
  OwnerActorReceipt,
  OwnerDecisionOutcome,
  SettlementDecisionDb,
} from "./settlement-decisions.js";
export {
  enqueuePostSettlementWork,
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
  POST_SETTLEMENT_WORK_KINDS,
} from "./post-settlement-work.js";
export type {
  PostSettlementWorkKind,
  PostSettlementWorkDelegate,
} from "./post-settlement-work.js";
export { drainPendingTeamGameLogs } from "./team-game-log-repair.js";
export type {
  TeamGameLogRepairDb,
  TeamGameLogRepairGame,
  TeamGameLogRepairGates,
} from "./team-game-log-repair.js";
export { recordPickSettlementSnapshot } from "./settlement-snapshots.js";
export type {
  RecordSettlementSnapshotInput,
  SettlementSnapshotDb,
  SettlementSnapshotPick,
  SettledPickResult,
  SettlementSnapshotWriteStatus,
} from "./settlement-snapshots.js";
export { recordSourceSnapshot } from "./source-snapshot.js";
export type { SourceSnapshotInput } from "./source-snapshot.js";
export { refreshOdds, UnsupportedSportError } from "./refresh-odds.js";
export type {
  RefreshOddsResult,
  RefreshOddsSportResult,
  RefreshOddsOptions,
} from "./refresh-odds.js";
export { notifyOwner, ownerAlertsConfigured } from "./owner-alert.js";
export {
  isQuietBoard,
  quietBoardHorizonHours,
  DEFAULT_QUIET_BOARD_HORIZON_HOURS,
} from "./quiet-board.js";
export { bookLineDispersion } from "./book-dispersion.js";
export type { DispersionPickType, BookOddsRow } from "./book-dispersion.js";
export { freezeSlateCommitments, mintSlatePedersenAggregate } from "./freeze-slate-commitments.js";
export type { SlateFreezeResult } from "./freeze-slate-commitments.js";
export { planSlateOpeningFromDb } from "./slate-opening-reader.js";
export {
  planSlateOpeningFromSql,
  createMemoryTryOpenPort,
} from "./open-via-sql.js";
export type {
  TryOpenSlateRow,
  TryOpenSlatePort,
} from "./open-via-sql.js";

export {
  buildIndependentFairValues,
  getOrFitEloRatings,
  loadSportResultGamesForElo,
  sportKeyToKalshiLeague,
  guessKalshiTeamAbbr,
} from "./build-independent-fair-values.js";
export type {
  IndependentFairValueBuildInput,
  EloRatingsCache,
} from "./build-independent-fair-values.js";
export {
  resolveKalshiTeamAbbr,
  normalizeTeamKey,
} from "./kalshi-team-abbr.js";

export { generateSignalSlate, blendIndependentHomeFair } from "./generate-signal-slate.js";
export type { SignalSlateResult } from "./generate-signal-slate.js";

export { runBoardFillPipeline } from "./board-fill.js";
export type { BoardFillResult } from "./board-fill.js";

export { seedGamesFromEspn } from "./seed-games-from-espn.js";
export type { SeedGamesFromEspnResult } from "./seed-games-from-espn.js";
