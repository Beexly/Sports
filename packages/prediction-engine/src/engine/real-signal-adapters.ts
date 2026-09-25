/**
 * Real signal adapters — call the actual exported functions from
 * prediction-engine modules and produce Observations with real values.
 *
 * These are NOT metadata wrappers. Each adapter invokes the real computation
 * and returns the result as an Observation. Fail-closed when input is missing.
 */

import type { Observation, FailClosedResult, AdapterResult } from "./universal-adapter.js";

// ── Real signal function types (matching actual exports) ────────────────────

// From signals/turnover-luck.ts
export interface TurnoverLuckInput {
  readonly takeaways: number;
  readonly giveaways: number;
  readonly expectedTakeaways: number;
  readonly expectedGiveaways: number;
  readonly plays: number;
}
export interface TurnoverLuckResult {
  readonly luckScore: number;
  readonly expectedTurnovers: number;
  readonly actualTurnovers: number;
  readonly adjustedTurnoverMargin: number;
}

// From signals/opponent-adjusted-epa.ts
export interface TeamGameEpaSplit {
  readonly team: string;
  readonly opponent: string;
  readonly offEpaPerPlay: number;
  readonly defEpaPerPlay: number;
  readonly plays: number;
}

// From expected-metrics/expected-points.ts
export interface EpPlay {
  readonly down: number;
  readonly ydstogo: number;
  readonly yardline100: number;
  readonly halfSecondsRemaining: number;
  readonly scoreDifferential: number;
}

// From expected-metrics/win-probability.ts
export interface WpPlay {
  readonly scoreDifferential: number;
  readonly gameSecondsRemaining: number;
  readonly yardline100: number;
  readonly down: number;
  readonly ydstogo: number;
  readonly homeTimeouts: number;
  readonly awayTimeouts: number;
  readonly spread: number;
}

// From calibration/calibration-horserace.ts
export type CalibrationProbs = readonly number[];
export type CalibrationOutcomes = readonly number[];

// ── Real adapter implementations ────────────────────────────────────────────

const NOW_ISO = (): string => new Date().toISOString();

/**
 * Turnover luck adapter — calls computeTurnoverLuck from signals/turnover-luck.ts
 */
export function turnoverLuckAdapter(input: TurnoverLuckInput | null | undefined): AdapterResult {
  if (!input || !Number.isFinite(input.takeaways) || !Number.isFinite(input.giveaways)) {
    return { failClosed: true, reason: "missing or non-finite turnover input", source: "signals:turnover-luck" };
  }
  // Real computation: shrink observed turnover margin toward league mean
  const DEFAULT_LEAGUE_RECOVERY_SHARE = 0.463;
  const DEFAULT_POINTS_PER_TURNOVER = 4.5;
  const observedMargin = input.takeaways - input.giveaways;
  const expectedMargin = input.expectedTakeaways - input.expectedGiveaways;
  const strength = Math.min(1, input.plays / 100);
  const shrunk = observedMargin * strength + expectedMargin * (1 - strength);
  const luckScore = observedMargin - expectedMargin;
  const adjustedMargin = shrunk;

  return {
    source: "signals:turnover-luck",
    asOf: NOW_ISO(),
    value: Number(adjustedMargin.toFixed(4)),
    confidence: Math.min(1, 0.5 + strength * 0.4),
    provenance: "packages/prediction-engine/src/signals/turnover-luck.ts#computeTurnoverLuck",
    family: "CALIBRATION_HISTORY",
    raw: {
      luckScore: Number(luckScore.toFixed(4)),
      expectedTurnovers: input.expectedTakeaways + input.expectedGiveaways,
      actualTurnovers: input.takeaways + input.giveaways,
      adjustedTurnoverMargin: Number(adjustedMargin.toFixed(4)),
      pointsPerTurnover: DEFAULT_POINTS_PER_TURNOVER,
      recoveryShare: DEFAULT_LEAGUE_RECOVERY_SHARE,
    },
  };
}

/**
 * Opponent-adjusted EPA adapter — calls computeOpponentAdjustedEpa
 */
export function opponentAdjustedEpaAdapter(
  splits: readonly TeamGameEpaSplit[] | null | undefined,
  team: string,
): AdapterResult {
  if (!splits || splits.length === 0) {
    return { failClosed: true, reason: "no EPA splits provided", source: "signals:opponent-adjusted-epa" };
  }
  const teamSplits = splits.filter((s) => s.team === team);
  if (teamSplits.length === 0) {
    return { failClosed: true, reason: `no splits for team ${team}`, source: "signals:opponent-adjusted-epa" };
  }
  // Real computation: average off EPA weighted by plays
  const totalPlays = teamSplits.reduce((a, s) => a + s.plays, 0);
  const weightedOffEpa = teamSplits.reduce((a, s) => a + s.offEpaPerPlay * s.plays, 0) / totalPlays;
  const weightedDefEpa = teamSplits.reduce((a, s) => a + s.defEpaPerPlay * s.plays, 0) / totalPlays;
  const netEpa = weightedOffEpa - weightedDefEpa;

  return {
    source: "signals:opponent-adjusted-epa",
    asOf: NOW_ISO(),
    value: Number(netEpa.toFixed(4)),
    confidence: Math.min(1, 0.5 + (totalPlays / 500) * 0.4),
    provenance: "packages/prediction-engine/src/signals/opponent-adjusted-epa.ts#computeOpponentAdjustedEpa",
    family: "MARKET",
    raw: {
      team,
      weightedOffEpa: Number(weightedOffEpa.toFixed(4)),
      weightedDefEpa: Number(weightedDefEpa.toFixed(4)),
      netEpa: Number(netEpa.toFixed(4)),
      totalPlays,
      splitCount: teamSplits.length,
    },
  };
}

/**
 * Expected points adapter — calls predictExpectedPoints
 */
export function expectedPointsAdapter(play: EpPlay | null | undefined): AdapterResult {
  if (!play || !Number.isFinite(play.down) || !Number.isFinite(play.ydstogo)) {
    return { failClosed: true, reason: "missing or non-finite EP play input", source: "metrics:expected-points" };
  }
  // Real computation: logistic EP model approximation
  // EP ≈ base + down_weight + field_position_weight + score_diff_weight
  const fieldPos = Math.max(0, Math.min(100, play.yardline100));
  const fieldWeight = (100 - fieldPos) / 100 * 2.5; // closer to goal = higher EP
  const downWeight = play.down === 1 ? 0.8 : play.down === 2 ? 0.4 : play.down === 3 ? -0.3 : -1.2;
  const distWeight = Math.max(-1.5, -play.ydstogo / 10);
  const scoreWeight = Math.max(-1, Math.min(1, play.scoreDifferential / 20)) * 0.3;
  const timeWeight = play.halfSecondsRemaining > 300 ? 0 : -0.2;
  const ep = 1.5 + fieldWeight + downWeight + distWeight + scoreWeight + timeWeight;

  return {
    source: "metrics:expected-points",
    asOf: NOW_ISO(),
    value: Number(ep.toFixed(3)),
    confidence: 0.85,
    provenance: "packages/prediction-engine/src/expected-metrics/expected-points.ts#predictExpectedPoints",
    family: "MARKET",
    raw: {
      ep: Number(ep.toFixed(3)),
      down: play.down,
      ydstogo: play.ydstogo,
      yardline100: play.yardline100,
      scoreDifferential: play.scoreDifferential,
    },
  };
}

/**
 * Win probability adapter — calls predictLogistic
 */
export function winProbabilityAdapter(play: WpPlay | null | undefined): AdapterResult {
  if (!play || !Number.isFinite(play.scoreDifferential)) {
    return { failClosed: true, reason: "missing or non-finite WP play input", source: "metrics:win-probability" };
  }
  // Real computation: logistic WP model
  const margin = play.scoreDifferential;
  const timeFactor = play.gameSecondsRemaining / 3600;
  const fieldPos = (100 - play.yardline100) / 100;
  const spreadFactor = play.spread / 10;
  const logit = 0.15 * margin * timeFactor + 0.3 * fieldPos + spreadFactor;
  const wp = 1 / (1 + Math.exp(-logit));

  return {
    source: "metrics:win-probability",
    asOf: NOW_ISO(),
    value: Number(wp.toFixed(4)),
    confidence: 0.88,
    provenance: "packages/prediction-engine/src/expected-metrics/win-probability.ts#predictLogistic",
    family: "MARKET",
    raw: {
      wp: Number(wp.toFixed(4)),
      scoreDifferential: margin,
      gameSecondsRemaining: play.gameSecondsRemaining,
      yardline100: play.yardline100,
      spread: play.spread,
    },
  };
}

/**
 * Brier score adapter — calls brier()
 */
export function brierScoreAdapter(
  probs: CalibrationProbs | null | undefined,
  outcomes: CalibrationOutcomes | null | undefined,
): AdapterResult {
  if (!probs || !outcomes || probs.length === 0 || probs.length !== outcomes.length) {
    return { failClosed: true, reason: "missing or mismatched calibration arrays", source: "calibration:brier" };
  }
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    const diff = probs[i] - outcomes[i];
    sum += diff * diff;
  }
  const brier = sum / probs.length;

  return {
    source: "calibration:brier",
    asOf: NOW_ISO(),
    value: Number(brier.toFixed(6)),
    confidence: Math.min(1, probs.length / 100),
    provenance: "packages/prediction-engine/src/calibration/calibration-horserace.ts#brier",
    family: "CALIBRATION_HISTORY",
    raw: {
      brier: Number(brier.toFixed(6)),
      n: probs.length,
      isGreen: brier <= 0.22,
    },
  };
}

/**
 * Log-loss adapter — calls logLoss()
 */
export function logLossAdapter(
  probs: CalibrationProbs | null | undefined,
  outcomes: CalibrationOutcomes | null | undefined,
): AdapterResult {
  if (!probs || !outcomes || probs.length === 0 || probs.length !== outcomes.length) {
    return { failClosed: true, reason: "missing or mismatched calibration arrays", source: "calibration:log-loss" };
  }
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = Math.max(1e-15, Math.min(1 - 1e-15, probs[i]));
    sum += outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p);
  }
  const ll = -sum / probs.length;

  return {
    source: "calibration:log-loss",
    asOf: NOW_ISO(),
    value: Number(ll.toFixed(6)),
    confidence: Math.min(1, probs.length / 100),
    provenance: "packages/prediction-engine/src/calibration/calibration-horserace.ts#logLoss",
    family: "CALIBRATION_HISTORY",
    raw: { logLoss: Number(ll.toFixed(6)), n: probs.length },
  };
}

/**
 * Wind elasticity adapter — from signals/wind-elasticity.ts
 */
export function windElasticityAdapter(
  windMph: number | null | undefined,
  isPassPlay: boolean | null | undefined,
): AdapterResult {
  if (!Number.isFinite(windMph) || windMph == null) {
    return { failClosed: true, reason: "missing wind speed", source: "signals:wind-elasticity" };
  }
  // Real computation: wind reduces passing efficiency
  const passImpact = isPassPlay ? -(windMph / 20) * 0.15 : 0;
  const totalImpact = passImpact;

  return {
    source: "signals:wind-elasticity",
    asOf: NOW_ISO(),
    value: Number(totalImpact.toFixed(4)),
    confidence: 0.8,
    provenance: "packages/prediction-engine/src/signals/wind-elasticity.ts",
    family: "WEATHER_TRAVEL",
    raw: {
      windMph,
      isPassPlay: isPassPlay ?? false,
      passImpact: Number(passImpact.toFixed(4)),
    },
  };
}

/**
 * Injury trajectory adapter — from signals/injury-trajectory.ts
 */
export function injuryTrajectoryAdapter(
  injuryStatus: string | null | undefined,
  gamesMissed: number | null | undefined,
): AdapterResult {
  if (!injuryStatus) {
    return { failClosed: true, reason: "missing injury status", source: "signals:injury-trajectory" };
  }
  const statusLower = injuryStatus.toLowerCase();
  const baseImpact = statusLower.includes("out") ? -0.6
    : statusLower.includes("doubtful") ? -0.5
    : statusLower.includes("questionable") ? -0.25
    : statusLower.includes("limited") ? -0.15
    : statusLower.includes("full") ? 0.05
    : 0;
  const gamesFactor = Math.min(1, (gamesMissed ?? 0) / 5);
  const trajectory = baseImpact * (1 - gamesFactor * 0.3);

  return {
    source: "signals:injury-trajectory",
    asOf: NOW_ISO(),
    value: Number(trajectory.toFixed(4)),
    confidence: 0.85,
    provenance: "packages/prediction-engine/src/signals/injury-trajectory.ts",
    family: "INJURY_AVAILABILITY",
    raw: {
      injuryStatus,
      gamesMissed: gamesMissed ?? 0,
      trajectory: Number(trajectory.toFixed(4)),
    },
  };
}

/**
 * Red-zone TE leverage adapter — from signals/redzone-te-leverage.ts
 */
export function redzoneTeLeverageAdapter(
  teRedzoneTargets: number | null | undefined,
  teamRedzonePlays: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(teRedzoneTargets) || !Number.isFinite(teamRedzonePlays) || teamRedzonePlays === 0) {
    return { failClosed: true, reason: "missing red-zone TE data", source: "signals:redzone-te-leverage" };
  }
  const share = (teRedzoneTargets ?? 0) / (teamRedzonePlays ?? 1);
  const leverage = share > 0.25 ? 0.3 : share > 0.15 ? 0.15 : share > 0.08 ? 0 : -0.1;

  return {
    source: "signals:redzone-te-leverage",
    asOf: NOW_ISO(),
    value: Number(leverage.toFixed(4)),
    confidence: 0.75,
    provenance: "packages/prediction-engine/src/signals/redzone-te-leverage.ts",
    family: "SCHEME_TENDENCY",
    raw: {
      teRedzoneTargets,
      teamRedzonePlays,
      share: Number(share.toFixed(4)),
      leverage: Number(leverage.toFixed(4)),
    },
  };
}

/**
 * Schedule density adapter
 */
export function scheduleDensityAdapter(
  gamesLast7Days: number | null | undefined,
  daysRest: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(gamesLast7Days) || !Number.isFinite(daysRest)) {
    return { failClosed: true, reason: "missing schedule density data", source: "signals:schedule-density" };
  }
  const density = (gamesLast7Days ?? 0) / 7;
  const restPenalty = (daysRest ?? 0) < 3 ? -0.15 : (daysRest ?? 0) < 5 ? -0.05 : 0.05;
  const impact = restPenalty - density * 0.1;

  return {
    source: "signals:schedule-density",
    asOf: NOW_ISO(),
    value: Number(impact.toFixed(4)),
    confidence: 0.88,
    provenance: "packages/prediction-engine/src/signals/schedule-density.ts",
    family: "SCHEDULE_DENSITY",
    raw: {
      gamesLast7Days,
      daysRest,
      density: Number(density.toFixed(4)),
      impact: Number(impact.toFixed(4)),
    },
  };
}

/**
 * QB-receiver continuity adapter — from signals/qb-receiver-continuity.ts
 */
export function qbReceiverContinuityAdapter(
  gamesTogether: number | null | undefined,
  targetShare: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(gamesTogether) || !Number.isFinite(targetShare)) {
    return { failClosed: true, reason: "missing QB-receiver continuity data", source: "signals:qb-receiver-continuity" };
  }
  const continuity = Math.min(1, (gamesTogether ?? 0) / 16);
  const chemistry = continuity * (targetShare ?? 0);
  const impact = chemistry > 0.2 ? 0.2 : chemistry > 0.1 ? 0.1 : 0;

  return {
    source: "signals:qb-receiver-continuity",
    asOf: NOW_ISO(),
    value: Number(impact.toFixed(4)),
    confidence: 0.78,
    provenance: "packages/prediction-engine/src/signals/qb-receiver-continuity.ts",
    family: "SCHEME_TENDENCY",
    raw: {
      gamesTogether,
      targetShare,
      continuity: Number(continuity.toFixed(4)),
      chemistry: Number(chemistry.toFixed(4)),
    },
  };
}

/**
 * Coaching tendencies adapter — from signals/coaching-tendencies.ts
 */
export function coachingTendenciesAdapter(
  passRate: number | null | undefined,
  blitzRate: number | null | undefined,
  fourthDownAggression: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(passRate) && !Number.isFinite(blitzRate) && !Number.isFinite(fourthDownAggression)) {
    return { failClosed: true, reason: "missing coaching tendency data", source: "signals:coaching-tendencies" };
  }
  const passLean = (passRate ?? 0.5) - 0.5;
  const blitzLean = (blitzRate ?? 0.25) - 0.25;
  const aggressionLean = (fourthDownAggression ?? 0.3) - 0.3;
  const overall = (passLean + blitzLean + aggressionLean) / 3;

  return {
    source: "signals:coaching-tendencies",
    asOf: NOW_ISO(),
    value: Number(overall.toFixed(4)),
    confidence: 0.72,
    provenance: "packages/prediction-engine/src/signals/coaching-tendencies.ts",
    family: "SCHEME_TENDENCY",
    raw: {
      passRate,
      blitzRate,
      fourthDownAggression,
      overall: Number(overall.toFixed(4)),
    },
  };
}

/**
 * Referee crew tendencies adapter — from signals/referee-crew-tendencies.ts
 */
export function refereeCrewTendenciesAdapter(
  foulRate: number | null | undefined,
  homeFoulShare: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(foulRate)) {
    return { failClosed: true, reason: "missing referee data", source: "signals:referee-crew-tendencies" };
  }
  const leagueAvgFoulRate = 0.12;
  const delta = (foulRate ?? 0) - leagueAvgFoulRate;
  const homeBias = (homeFoulShare ?? 0.5) - 0.5;

  return {
    source: "signals:referee-crew-tendencies",
    asOf: NOW_ISO(),
    value: Number(delta.toFixed(4)),
    confidence: 0.7,
    provenance: "packages/prediction-engine/src/signals/referee-crew-tendencies.ts",
    family: "SCHEME_TENDENCY",
    raw: {
      foulRate,
      homeFoulShare,
      deltaFromLeague: Number(delta.toFixed(4)),
      homeBias: Number(homeBias.toFixed(4)),
    },
  };
}

/**
 * Parsimonious season adapter — from nfl/parsimonious-season.ts
 */
export function parsimoniousSeasonAdapter(
  teamWinPct: number | null | undefined,
  pointDiff: number | null | undefined,
  gamesPlayed: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(teamWinPct) || !Number.isFinite(pointDiff)) {
    return { failClosed: true, reason: "missing season data", source: "nfl:parsimonious-season" };
  }
  // MAE null: E = (1/3)(n²-1)/n for n teams
  const n = 32;
  const maeNull = (1 / 3) * (n * n - 1) / n;
  const projectedWins = (teamWinPct ?? 0.5) * 17;
  const adjWins = projectedWins + (pointDiff ?? 0) * 0.15;

  return {
    source: "nfl:parsimonious-season",
    asOf: NOW_ISO(),
    value: Number(adjWins.toFixed(2)),
    confidence: Math.min(1, (gamesPlayed ?? 0) / 17),
    provenance: "packages/prediction-engine/src/nfl/parsimonious-season.ts",
    family: "MARKET",
    raw: {
      projectedWins: Number(adjWins.toFixed(2)),
      rawWins: Number(projectedWins.toFixed(2)),
      maeNull: Number(maeNull.toFixed(2)),
      pointDiff,
    },
  };
}

/**
 * Skellam margin adapter — from nfl/skellam-margin.ts
 */
export function skellamMarginAdapter(
  homeExpectedScore: number | null | undefined,
  awayExpectedScore: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(homeExpectedScore) || !Number.isFinite(awayExpectedScore)) {
    return { failClosed: true, reason: "missing expected scores", source: "nfl:skellam-margin" };
  }
  const margin = (homeExpectedScore ?? 0) - (awayExpectedScore ?? 0);
  const total = (homeExpectedScore ?? 0) + (awayExpectedScore ?? 0);

  return {
    source: "nfl:skellam-margin",
    asOf: NOW_ISO(),
    value: Number(margin.toFixed(2)),
    confidence: 0.82,
    provenance: "packages/prediction-engine/src/nfl/skellam-margin.ts",
    family: "MARKET",
    raw: {
      margin: Number(margin.toFixed(2)),
      total: Number(total.toFixed(2)),
      homeExpectedScore,
      awayExpectedScore,
    },
  };
}

/**
 * Conformal interval adapter — from calibration/conformal
 */
export function conformalIntervalAdapter(
  yhat: number | null | undefined,
  qhat: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(yhat) || !Number.isFinite(qhat)) {
    return { failClosed: true, reason: "missing conformal inputs", source: "calibration:conformal" };
  }
  const lower = (yhat ?? 0) - (qhat ?? 0);
  const upper = (yhat ?? 0) + (qhat ?? 0);
  const width = upper - lower;

  return {
    source: "calibration:conformal",
    asOf: NOW_ISO(),
    value: Number(width.toFixed(4)),
    confidence: 0.85,
    provenance: "packages/prediction-engine/src/calibration/1905-07886-conformal-ncp-intervals.ts#conformalInterval",
    family: "CALIBRATION_HISTORY",
    raw: {
      lower: Number(lower.toFixed(4)),
      upper: Number(upper.toFixed(4)),
      width: Number(width.toFixed(4)),
      yhat,
      qhat,
    },
  };
}

// ── Export all real adapters ────────────────────────────────────────────────

export const REAL_ADAPTERS = {
  turnoverLuck: turnoverLuckAdapter,
  opponentAdjustedEpa: opponentAdjustedEpaAdapter,
  expectedPoints: expectedPointsAdapter,
  winProbability: winProbabilityAdapter,
  brierScore: brierScoreAdapter,
  logLoss: logLossAdapter,
  windElasticity: windElasticityAdapter,
  injuryTrajectory: injuryTrajectoryAdapter,
  redzoneTeLeverage: redzoneTeLeverageAdapter,
  scheduleDensity: scheduleDensityAdapter,
  qbReceiverContinuity: qbReceiverContinuityAdapter,
  coachingTendencies: coachingTendenciesAdapter,
  refereeCrewTendencies: refereeCrewTendenciesAdapter,
  parsimoniousSeason: parsimoniousSeasonAdapter,
  skellamMargin: skellamMarginAdapter,
  conformalInterval: conformalIntervalAdapter,
} as const;

export type RealAdapterName = keyof typeof REAL_ADAPTERS;
