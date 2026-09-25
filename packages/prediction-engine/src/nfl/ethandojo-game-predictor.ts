/**
 * @ethandojo game-outcome model — additive, fail-closed, and deliberately isolated.
 *
 * The implementation follows ml-estimator.ts: ordered nullable feature vectors,
 * depth-one stumps, a logistic link, explicit provenance, and null whenever any
 * input is absent or non-finite. It does not mutate MODEL_VERSION and no live
 * scoring path imports it.
 *
 * The seven features are the handoff's exact team-minus-opponent differentials.
 * Training and inference are kept here rather than in a hidden caller so the
 * walk-forward boundary is auditable: a game is fitted only from completed games
 * whose season/week is strictly earlier than the target week.
 */

import {
  computeFeatureSchemaHash,
  type DecisionStump,
  type MlModelObject,
  type MlModelProvenance,
} from "../ml-estimator.js";
import { simulateSeasonWinTotals } from "../market/spread-winprob-map.js";

export const ETHANDOJO_FEATURE_KEYS = [
  "qbEPA",
  "explosiveRate",
  "turnoverMargin",
  "passRush",
  "pointDiff",
  "availability",
  "rosterCarryover",
] as const;

export type EthandojoFeatureKey = (typeof ETHANDOJO_FEATURE_KEYS)[number];
export const ETHANDOJO_FEATURE_SCHEMA_HASH = computeFeatureSchemaHash(ETHANDOJO_FEATURE_KEYS);
export const ETHANDOJO_MIN_SAMPLE_SIZE = 200;
export const ETHANDOJO_MAX_AGE_DAYS = 180;

export type EthandojoFeatureVector = Readonly<Record<EthandojoFeatureKey, number | null>>;
export type EthandojoTrainingSample = Readonly<{ features: EthandojoFeatureVector; outcome: 0 | 1 }>;

export interface NflversePlay {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly passerPlayerId?: string | null;
  readonly qbDropback?: number | null;
  readonly epa?: number | null;
  readonly playType?: string | null;
  readonly yardsGained?: number | null;
  readonly pressure?: number | null;
  readonly qbHit?: number | null;
  readonly sack?: number | null;
  readonly turnover?: number | null;
  readonly takeaway?: number | null;
  readonly points?: number | null;
  readonly offensiveSnaps?: number | null;
  readonly projectedStarterSnaps?: number | null;
  readonly priorSeasonProduction?: number | null;
  readonly currentSeasonProduction?: number | null;
}

export interface TeamGameInput {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeWon: 0 | 1;
  readonly homePoints: number;
  readonly awayPoints: number;
  /** Trailing-four values supplied by the ingestion layer for this game. */
  readonly homeFeatures: Readonly<Record<EthandojoFeatureKey, number | null>>;
  readonly awayFeatures: Readonly<Record<EthandojoFeatureKey, number | null>>;
  /** Expected-metrics scoring output, already in points. */
  readonly projectedScoreHome?: number | null;
  readonly projectedScoreAway?: number | null;
}

export interface TeamFeatureAggregate {
  readonly qbEPA: number | null;
  readonly explosiveRate: number;
  readonly turnoverMargin: number;
  readonly passRush: number;
  readonly pointDiff: number;
  readonly availability: number | null;
  readonly rosterCarryover: number | null;
}

export interface GameFeatureDifferentials extends EthandojoFeatureVector {
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export interface EthandojoGameOutput {
  readonly winProb: number;
  readonly projectedScoreHome: number;
  readonly projectedScoreAway: number;
}

export interface WalkForwardGame {
  readonly game: TeamGameInput;
  readonly model: MlModelObject | null;
  readonly prediction: EthandojoGameOutput | null;
}

const TRAILING_GAMES = 4;

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function addSum(target: Record<string, number>, key: string, value: number): void {
  target[key] = (target[key] ?? 0) + value;
}

/** Aggregate one team's raw nflverse rows into the seven handoff features. */
export function aggregateTeamFeatures(plays: readonly NflversePlay[]): TeamFeatureAggregate {
  let qbEpa = 0;
  let qbDropbacks = 0;
  let offensivePlays = 0;
  let explosivePlays = 0;
  let pressures = 0;
  let opponentDropbacks = 0;
  let takeaways = 0;
  let giveaways = 0;
  let pointDiff = 0;
  let offensiveSnaps = 0;
  let projectedStarterSnaps = 0;
  let priorProduction = 0;
  let currentProduction = 0;

  for (const play of plays) {
    const playType = play.playType ?? "";
    if (playType === "run" || playType === "pass") {
      offensivePlays += 1;
      const gained = finite(play.yardsGained) ?? 0;
      if ((playType === "run" && gained >= 10) || (playType === "pass" && gained >= 20)) {
        explosivePlays += 1;
      }
    }
    if (play.qbDropback === 1) {
      opponentDropbacks += 1;
      if (play.pressure === 1 || play.qbHit === 1 || play.sack === 1) pressures += 1;
    }
    if (play.passerPlayerId != null && play.qbDropback === 1 && finite(play.epa) !== null) {
      qbEpa += play.epa ?? 0;
      qbDropbacks += 1;
    }
    if (play.takeaway === 1) takeaways += 1;
    if (play.turnover === 1 && play.takeaway !== 1) giveaways += 1;
    if (finite(play.points) !== null) pointDiff += play.points ?? 0;
    if (finite(play.offensiveSnaps) !== null) {
      offensiveSnaps += play.offensiveSnaps ?? 0;
      projectedStarterSnaps += play.projectedStarterSnaps ?? 0;
    }
    if (finite(play.priorSeasonProduction) !== null) priorProduction += play.priorSeasonProduction ?? 0;
    if (finite(play.currentSeasonProduction) !== null) currentProduction += play.currentSeasonProduction ?? 0;
  }

  return {
    qbEPA: qbDropbacks === 0 ? null : qbEpa / qbDropbacks,
    explosiveRate: safeRatio(explosivePlays, offensivePlays),
    turnoverMargin: takeaways - giveaways,
    passRush: safeRatio(pressures, opponentDropbacks),
    pointDiff,
    availability: offensiveSnaps === 0 ? null : projectedStarterSnaps / offensiveSnaps,
    rosterCarryover: priorProduction === 0 ? null : Math.min(1, currentProduction / priorProduction),
  };
}

/** Build a trailing-four team feature row from already grouped team-game rows. */
export function buildTrailingFourFeatures(
  teamGames: ReadonlyArray<{
    readonly season: number;
    readonly week: number;
    readonly features: EthandojoFeatureVector;
  }>,
  targetSeason: number,
  targetWeek: number,
): EthandojoFeatureVector {
  const prior = teamGames
    .filter((row) => row.season < targetSeason || (row.season === targetSeason && row.week < targetWeek))
    .sort((a, b) => a.season - b.season || a.week - b.week)
    .slice(-TRAILING_GAMES);
  const out: Record<EthandojoFeatureKey, number | null> = {
    qbEPA: null,
    explosiveRate: 0,
    turnoverMargin: 0,
    passRush: 0,
    pointDiff: 0,
    availability: null,
    rosterCarryover: null,
  };
  for (const key of ETHANDOJO_FEATURE_KEYS) {
    const values = prior.map((row) => finite(row.features[key])).filter((v): v is number => v !== null);
    out[key] = values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return out;
}

/** Convert team values to the exact seven home-minus-away differentials. */
export function buildGameFeatureDifferentials(input: TeamGameInput): GameFeatureDifferentials {
  const features = {} as Record<EthandojoFeatureKey, number | null>;
  for (const key of ETHANDOJO_FEATURE_KEYS) {
    const home = finite(input.homeFeatures[key]);
    const away = finite(input.awayFeatures[key]);
    features[key] = home === null || away === null ? null : home - away;
  }
  return { ...features, homeTeam: input.homeTeam, awayTeam: input.awayTeam };
}

function featureValues(features: EthandojoFeatureVector): readonly number[] | null {
  const values: number[] = [];
  for (const key of ETHANDOJO_FEATURE_KEYS) {
    const value = finite(features[key]);
    if (value === null) return null;
    values.push(value);
  }
  return values;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function logit(probability: number): number {
  const p = Math.max(1e-9, Math.min(1 - 1e-9, probability));
  return Math.log(p / (1 - p));
}

/** Fit the handoff's seven-feature additive-stump model using the existing GBM pattern. */
export function fitEthandojoModel(
  samples: readonly EthandojoTrainingSample[],
  trainedAt: string,
  rounds = 8,
  learningRate = 0.3,
): MlModelObject | null {
  const usable = samples.filter((sample) => featureValues(sample.features) !== null);
  if (usable.length < 2) return null;
  const rows = usable.map((sample) => featureValues(sample.features) as readonly number[]);
  const labels = usable.map((sample) => sample.outcome);
  const prior = labels.filter((value) => value === 1).length / labels.length;
  if (prior <= 0 || prior >= 1) return null;
  const intercept = logit(prior);
  const logits = new Float64Array(rows.length).fill(intercept);
  const stumps: DecisionStump[] = [];
  for (let round = 0; round < rounds; round += 1) {
    let bestSse = Infinity;
    let best: { featureIndex: number; threshold: number; left: number; right: number } | null = null;
    for (let featureIndex = 0; featureIndex < ETHANDOJO_FEATURE_KEYS.length; featureIndex += 1) {
      const values = rows.map((row) => row[featureIndex] ?? 0);
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const threshold = ((sorted[i] ?? 0) + (sorted[i + 1] ?? 0)) / 2;
        const residuals = labels.map((label, index) => label - sigmoid(logits[index] ?? intercept));
        const leftValues = residuals.filter((_, index) => (values[index] ?? 0) <= threshold);
        const rightValues = residuals.filter((_, index) => (values[index] ?? 0) > threshold);
        if (leftValues.length === 0 || rightValues.length === 0) continue;
        const left = leftValues.reduce((sum, value) => sum + value, 0) / leftValues.length;
        const right = rightValues.reduce((sum, value) => sum + value, 0) / rightValues.length;
        const sse = residuals.reduce((sum, residual, index) => {
          const predicted = (values[index] ?? 0) <= threshold ? left : right;
          return sum + (residual - predicted) ** 2;
        }, 0);
        if (sse < bestSse) {
          bestSse = sse;
          best = { featureIndex, threshold, left, right };
        }
      }
    }
    if (best === null || !Number.isFinite(bestSse)) break;
    const stump: DecisionStump = {
      featureIndex: best.featureIndex,
      threshold: best.threshold,
      leftLeafLogit: learningRate * best.left,
      rightLeafLogit: learningRate * best.right,
    };
    stumps.push(stump);
    rows.forEach((row, index) => {
      const leaf = (row[best.featureIndex] ?? 0) <= best.threshold ? stump.leftLeafLogit : stump.rightLeafLogit;
      logits[index] = (logits[index] ?? intercept) + leaf;
    });
  }
  if (stumps.length === 0) return null;
  const provenance: MlModelProvenance = {
    trainedAt,
    sampleSize: usable.length,
    featureSchemaHash: ETHANDOJO_FEATURE_SCHEMA_HASH,
    trainingSports: ["NFL"],
    modelVersion: "ethandojo-gbm-v1",
  };
  return { intercept, stumps, provenance };
}

/** Inference is fail-closed for any absent/non-finite differential. */
export function predictWinProb(
  model: MlModelObject | null | undefined,
  features: EthandojoFeatureVector,
  options: { readonly now?: () => Date } = {},
): number | null {
  if (model == null || model.stumps.length === 0) return null;
  if (model.provenance.featureSchemaHash !== ETHANDOJO_FEATURE_SCHEMA_HASH) return null;
  if (model.provenance.sampleSize < ETHANDOJO_MIN_SAMPLE_SIZE) return null;
  const trainedAt = Date.parse(model.provenance.trainedAt);
  if (!Number.isFinite(trainedAt)) return null;
  const now = (options.now ?? (() => new Date()))();
  if ((now.getTime() - trainedAt) / 86_400_000 > ETHANDOJO_MAX_AGE_DAYS) return null;
  const values = featureValues(features);
  if (values === null) return null;
  let logitValue = model.intercept;
  for (const stump of model.stumps) {
    const value = values[stump.featureIndex];
    if (value === undefined) return null;
    logitValue += value <= stump.threshold ? stump.leftLeafLogit : stump.rightLeafLogit;
  }
  const probability = sigmoid(logitValue);
  return Number.isFinite(probability) && probability > 0 && probability < 1 ? probability : null;
}

/** Project a game using a fitted model plus expected-metrics score projections. */
export function predictGameOutcome(
  model: MlModelObject | null,
  input: TeamGameInput,
): EthandojoGameOutput | null {
  const features = buildGameFeatureDifferentials(input);
  const winProb = predictWinProb(model, features, { now: () => new Date("2026-09-25T00:00:00.000Z") });
  const homeScore = finite(input.projectedScoreHome);
  const awayScore = finite(input.projectedScoreAway);
  if (winProb === null || homeScore === null || awayScore === null) return null;
  return { winProb, projectedScoreHome: homeScore, projectedScoreAway: awayScore };
}

function toTrainingSample(game: TeamGameInput): EthandojoTrainingSample {
  return {
    features: buildGameFeatureDifferentials(game),
    outcome: game.homeWon,
  };
}

function isEarlier(left: TeamGameInput, right: TeamGameInput): boolean {
  return left.season < right.season || (left.season === right.season && left.week < right.week);
}

/** Walk-forward harness: each target week is fit only on strictly earlier weeks. */
export function runWalkForward(
  games: readonly TeamGameInput[],
  trainedAt = "2026-09-25T00:00:00.000Z",
): readonly WalkForwardGame[] {
  const sorted = [...games].sort((a, b) => a.season - b.season || a.week - b.week);
  return sorted.map((game) => {
    const training = sorted.filter((candidate) => isEarlier(candidate, game)).map(toTrainingSample);
    const model = fitEthandojoModel(training, trainedAt);
    return { game, model, prediction: predictGameOutcome(model, game) };
  });
}

/** Exact handoff season simulation: 10,000 seeded replications per team. */
export function simulateEthandojoSeason(
  teams: Readonly<Record<string, readonly number[]>>,
  simulations = 10_000,
  seed = 20260925,
): Readonly<Record<string, { projectedWins: number; playoffOdds: number }>> {
  let state = seed >>> 0;
  const rand = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const output: Record<string, { projectedWins: number; playoffOdds: number }> = {};
  for (const [team, probabilities] of Object.entries(teams)) {
    if (probabilities.length === 0) continue;
    const distribution = simulateSeasonWinTotals(probabilities, simulations, rand);
    let weightedWins = 0;
    for (const [wins, count] of distribution) weightedWins += wins * count;
    output[team] = {
      projectedWins: weightedWins / simulations,
      playoffOdds: 0,
    };
  }
  if (Object.keys(output).length > 1) {
    const top = Math.max(1, Math.floor(Object.keys(output).length / 2));
    const ranked = Object.entries(output).sort((a, b) => b[1].projectedWins - a[1].projectedWins);
    for (let i = 0; i < ranked.length; i += 1) {
      const [team, result] = ranked[i]!;
      output[team] = { ...result, playoffOdds: i < top ? 1 : 0 };
    }
  }
  return output;
}
