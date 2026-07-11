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

// MLB — SMASH skill index + Log5 Advantage
export {
  computeHitterSmash,
  computePitcherSmash,
  smashTier,
  HITTER_COMPONENTS,
  PITCHER_COMPONENTS,
  type HitterSkillInput,
  type PitcherSkillInput,
  type SmashComponent,
  type SmashScore,
  type SmashTier,
} from "./mlb/smash";
export {
  matchupXwoba,
  staffXwobaAllowed,
  platoonAdjustedMatchup,
  matchupEdge,
  type StaffPitcher,
  type MatchupEdge,
} from "./mlb/advantage";

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
