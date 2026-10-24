/**
 * @sports/ranking — clean-room competitor ranking kernels.
 *
 * This package is the integration layer for the public-baseline ranking
 * modules. It re-exports the kernels from `@sports/prediction-engine` and
 * provides one composite builder so call sites do not have to know which
 * module a given kernel lives in.
 *
 * Doctrine:
 * - Nothing here reads a book price unless the function name says so.
 * - Every market-touching kernel is explicit: `marketStrengthsLeastSquares`,
 *   `stackWithMarket`, `publicHypeValuationCheck`, `shinDevigClosedForm`.
 * - The pre-lock coach path uses only the odds-free kernels.
 */

export {
  // small linear algebra
  gaussSolve,
  // head-to-head ratings
  bradleyTerryProb,
  bradleyTerryMle,
  colleyRatings,
  masseyRatings,
  srsRatings,
  // efficiency composites
  spPlusEfficiencyRatings,
  fpiDecomposition,
  pffStyleUnitGrades,
  // state-space
  kalmanRatings,
  hmm2RegimeFit,
  // market inversion and stacking
  invertCompetitorRatingDeltas,
  marketStrengthsLeastSquares,
  stackWithMarket,
  publicHypeValuationCheck,
  // verification science
  deflatedSharpe,
  // de-vig
  shinDevigClosedForm,
  // helpers
  normCdf,
  invNorm,
  erf,
} from "@sports/prediction-engine"

export type {
  TeamGame,
  RatingMap,
  KalmanRating,
  EpaSplit,
  PffSplits,
  CompetitorRatingDelta,
  MarketSlateRow,
} from "@sports/prediction-engine"

export {
  // Belichick ten metrics
  shrinkSituational,
  defensiveEfficiencyByFormation,
  qbPressureRateByRushPackage,
  runGameEfficiencyByGap,
  thirdDownConversionByCoverage,
  redZoneScoringByPlayType,
  specialTeamsFieldPositionIndex,
  injuryImpactAdjustment,
  coachFourthDownTendency,
  gameScriptingPace,
  situationSpecificEvOptimization,
  evaluateBelichickTenMetrics,
  INJURY_DROPS,
  QUICK_PRESSURE_SACK_RATE,
  SLOW_PRESSURE_SACK_RATE,
  COACH_AGGRESSION_RANGE,
  FOURTH_DOWN_HELD_OUT_EDGE_PP,
  KNEELDOWN_YARDS,
} from "@sports/prediction-engine"

export type {
  FormationSnap,
  FormationEfficiency,
  PressureSnap,
  PressurePackage,
  RunSnap,
  RunGapEfficiency,
  ThirdDownSnap,
  ThirdDownConversion,
  RedZoneSnap,
  RedZoneEfficiency,
  SpecialTeamsPlay,
  FieldPositionIndex,
  InjuryInput,
  InjuryImpact,
  CoachTendencyInput,
  CoachTendency,
  PaceInput,
  PaceAdjustment,
  SituationInput,
  EvDecision,
  BelichickMetricInputs,
  BelichickMetricBundle,
} from "@sports/prediction-engine"

// ── composite builder ────────────────────────────────────────────────────────

import type {
  TeamGame,
  EpaSplit,
  PffSplits,
  CompetitorRatingDelta,
  MarketSlateRow,
  RatingMap,
  KalmanRating,
} from "@sports/prediction-engine"

import {
  bradleyTerryMle,
  colleyRatings,
  masseyRatings,
  srsRatings,
  spPlusEfficiencyRatings,
  fpiDecomposition,
  pffStyleUnitGrades,
  kalmanRatings,
  invertCompetitorRatingDeltas,
  marketStrengthsLeastSquares,
  evaluateBelichickTenMetrics,
  type BelichickMetricInputs,
  type BelichickMetricBundle,
} from "@sports/prediction-engine"

export type RankingBundleInputs = {
  /** Settled games, from the home team's perspective. */
  games: readonly TeamGame[]
  /** Efficiency splits for SP+ and FPI. */
  epaSplits?: readonly EpaSplit[]
  /** PFF-style unit splits. */
  pffSplits?: readonly PffSplits[]
  /** Competitor published deltas for inversion. */
  competitorDeltas?: readonly CompetitorRatingDelta[]
  /** Closing spreads for market inversion. */
  slate?: readonly MarketSlateRow[]
  /** Belichick metric inputs. */
  belichick?: BelichickMetricInputs
}

export type RankingBundle = {
  bradleyTerry: RatingMap
  colley: RatingMap
  massey: RatingMap
  srs: RatingMap
  spPlus: RatingMap
  fpi: ReturnType<typeof fpiDecomposition>
  pff: ReturnType<typeof pffStyleUnitGrades>
  kalman: Record<string, KalmanRating>
  competitorDeltas: RatingMap | null
  marketStrengths: ReturnType<typeof marketStrengthsLeastSquares> | null
  belichick: BelichickMetricBundle
}

/**
 * Build every pre-lock ranking read in one call. Market inversion only runs
 * when a slate is supplied, because the coach path is odds-free by default.
 */
export function buildRankingBundle(inputs: RankingBundleInputs): RankingBundle {
  return {
    bradleyTerry: bradleyTerryMle(
      inputs.games.map((g) => [g.homeScore > g.awayScore ? g.home : g.away, g.homeScore > g.awayScore ? g.away : g.home] as [string, string]),
    ),
    colley: colleyRatings(inputs.games),
    massey: masseyRatings(inputs.games),
    srs: srsRatings(inputs.games),
    spPlus: spPlusEfficiencyRatings(inputs.epaSplits ?? []),
    fpi: fpiDecomposition(inputs.epaSplits ?? []),
    pff: pffStyleUnitGrades(inputs.pffSplits ?? []),
    kalman: kalmanRatings(inputs.games),
    competitorDeltas: inputs.competitorDeltas?.length
      ? invertCompetitorRatingDeltas(inputs.competitorDeltas, inputs.games)
      : null,
    marketStrengths: inputs.slate?.length
      ? marketStrengthsLeastSquares(inputs.slate)
      : null,
    belichick: evaluateBelichickTenMetrics(inputs.belichick ?? {}),
  }
}
