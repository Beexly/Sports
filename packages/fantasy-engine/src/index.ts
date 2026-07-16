/**
 * @sports/fantasy-engine — GSE's glass-box fantasy analytics engine.
 *
 * Posture: the DELIBERATE opposite of the betting engine's method opacity.
 * Every formula, weight, and threshold here is public, documented, and pinned
 * by tests — including golden-file verification against the validated
 * clean-room reference implementation's live-season outputs. The incumbents
 * sell sealed numbers; GSE ships the same class of metric with the reasoning,
 * the inputs, and a reproducible back-test attached.
 *
 * Pure computation only: no data fetching, no persistence, no environment
 * reads. Data adapters live in @sports/data-ingestion behind the source-
 * rights registry.
 */

// Core statistics
export { mean, populationStd, zscores, to100, percentileRanks, round } from "./core/stats";

// MLB — Matchup Skill Index (MSI) + Log5 Advantage
export {
  computeHitterMsi,
  computePitcherMsi,
  msiTier,
  HITTER_COMPONENTS,
  PITCHER_COMPONENTS,
  type HitterSkillInput,
  type PitcherSkillInput,
  type MsiComponent,
  type MsiScore,
  type MsiTier,
} from "./mlb/matchup-skill";
export {
  matchupXwoba,
  staffXwobaAllowed,
  platoonAdjustedMatchup,
  matchupEdge,
  type StaffPitcher,
  type MatchupEdge,
} from "./mlb/advantage";

// MLB — Bullpen Strength Index (BSI) + Reliever Value Score
export {
  computeBsi,
  BSI_CATEGORIES,
  type TeamBullpenCategories,
  type BsiCategory,
  type BsiScore,
} from "./mlb/bullpen-strength";
export {
  computeRvs,
  relieverRole,
  type RelieverSeason,
  type RelieverRole,
  type RvsScore,
} from "./mlb/rvs";

// NFL — QB Mobility Profiles (with receipts), Trench Matchup Index, WR/TE Matchup Index
export {
  classifyQb,
  computeQbTypes,
  mobilityReceipts,
  type QbSeason,
  type QbType,
  type QbTypeScore,
  type MobilityReceipts,
} from "./nfl/qb-types";
export {
  computeOffensiveLineIndex,
  computeDefensiveLineIndex,
  trenchMatchup,
  type TeamOffensiveLine,
  type TeamDefensiveLine,
  type TrenchIndex,
} from "./nfl/trench";
export { computeWrMatchup, type ReceiverSeason, type WrMatchupScore } from "./nfl/wr-matchup";

// NFL — Coaching/Scheme engine, team defense, rolling form
export {
  schemeLabel,
  topShare,
  SCHEME_THRESHOLDS,
  type TeamSchemeTendencies,
} from "./nfl/scheme";
export {
  computeTeamDefense,
  type TeamDefenseCategories,
  type TeamDefenseIndices,
} from "./nfl/defense";
export {
  computeFormDeltas,
  proeShiftRead,
  type TeamWindowAggregates,
  type TeamFormDelta,
} from "./nfl/rolling";

// Accuracy — proper scoring rules, the honest leaderboard, weighted consensus
export {
  brierScore,
  logLoss,
  brierSkillScore,
  calibrationBins,
  expectedCalibrationError,
  type ScoredForecast,
  type CalibrationBin,
} from "./accuracy/scoring";
export {
  buildLeaderboard,
  accuracyWeightedConsensus,
  type ForecasterRecord,
  type LeaderboardEntry,
  type LeaderboardOptions,
} from "./accuracy/leaderboard";
