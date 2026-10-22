/**
 * Stream 12 — nflverse/open-source-football special teams, EP/WP, and
 * field-goal modules (Posts #7, #8, #16, #18). RT-06 hardened.
 *
 * Post #8: seven-outcome multinomial next-score Expected Points
 *   (TD +7, FG +3, Safety +2, NoScore 0, OppSafety -2, OppFG -3, OppTD -7)
 *   and a spread-adjusted Win Probability.
 * Post #7: monotone gradient-boosted win probability with sign constraints
 *   dWP/dScoreDiff >= 0, dWP/dYardline100 <= 0, dWP/dYdstogo <= 0.
 * Post #16: the exact quadratic long-kick kink
 *   xFG = sigmoid(b0 - b1*d - b2*max(0, d-50)^2 - b3*wind
 *                 + b4*dome + b5*altitudeKm)
 *   and FGOE = sum(made - xFG).
 * Post #18: Brookner's RERUN, E[ReturnYards | hangtime, grossYards,
 *   sidelineDirection, gunnerSeparation], and net over expected.
 *
 * Every coefficient is fit from supplied observations or passed in. The
 * seven outcome points are published scoring values and are fixed.
 */

import { clamp01, mean, sigmoid, solveLinearSystem } from "./osf-math-core.js";

export const SEVEN_OUTCOMES = [
  { outcome: "TD", points: 7 },
  { outcome: "FG", points: 3 },
  { outcome: "Safety", points: 2 },
  { outcome: "NoScore", points: 0 },
  { outcome: "OppSafety", points: -2 },
  { outcome: "OppFG", points: -3 },
  { outcome: "OppTD", points: -7 },
] as const;

export type SevenOutcome = (typeof SEVEN_OUTCOMES)[number]["outcome"];

export interface SevenOutcomeEpInput {
  probabilities: Readonly<Record<SevenOutcome, number>>;
  /** Spread from the perspective of the team with the ball; negative = favored. */
  spread?: number;
  /** Published spread-to-WP logistic slope. Required when spread is supplied. */
  spreadSlope?: number;
}

export interface SevenOutcomeEpResult {
  expectedPoints: number;
  winProbability: number;
  probabilitiesSum: number;
  outcomePoints: Record<SevenOutcome, number>;
}

/**
 * Post #8. EP is the probability-weighted sum of the seven next-score
 * outcomes. WP treats EP as a margin and applies a logistic with the
 * supplied spread slope; without a spread it reports the EP-only logistic
 * with a zero spread term.
 */
export function computeNflfastrSevenOutcomeEp(input: SevenOutcomeEpInput): SevenOutcomeEpResult {
  const { probabilities, spread = 0, spreadSlope = 0 } = input;
  const outcomePoints: Record<SevenOutcome, number> = {
    TD: 7,
    FG: 3,
    Safety: 2,
    NoScore: 0,
    OppSafety: -2,
    OppFG: -3,
    OppTD: -7,
  };
  let expectedPoints = 0;
  let probabilitiesSum = 0;
  for (const { outcome, points } of SEVEN_OUTCOMES) {
    const p = probabilities[outcome];
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new Error(`probability for ${outcome} must be in [0,1]`);
    }
    expectedPoints += p * points;
    probabilitiesSum += p;
  }
  if (Math.abs(probabilitiesSum - 1) > 1e-6) {
    throw new Error(`seven-outcome probabilities must sum to 1 (got ${probabilitiesSum})`);
  }
  if (!Number.isFinite(spread) || !Number.isFinite(spreadSlope)) throw new Error("spread inputs must be finite");
  const winProbability = sigmoid(expectedPoints + spreadSlope * spread);
  return { expectedPoints, winProbability, probabilitiesSum, outcomePoints };
}

export interface WinProbRow {
  scoreDifferential: number;
  yardline100: number;
  ydstogo: number;
  win: 0 | 1;
}

export interface MonotonicGbdtOptions {
  iterations?: number;
  learningRate?: number;
  minLeafSamples?: number;
}

export interface MonotonicGbdtResult {
  winProbability: number;
  iterations: number;
  trees: {
    feature: "scoreDifferential" | "yardline100" | "ydstogo";
    threshold: number;
    leftValue: number;
    rightValue: number;
  }[];
  monotonicity: {
    scoreDifferential: number;
    yardline100: number;
    ydstogo: number;
    allHold: boolean;
  };
  trainingLogLoss: number;
}

const CONSTRAINED_FEATURES = ["scoreDifferential", "yardline100", "ydstogo"] as const;
const MONOTONE_DIRECTION: Record<(typeof CONSTRAINED_FEATURES)[number], 1 | -1> = {
  scoreDifferential: 1,
  yardline100: -1,
  ydstogo: -1,
};

function fitMonotoneStump(
  rows: readonly WinProbRow[],
  gradients: readonly number[],
  feature: (typeof CONSTRAINED_FEATURES)[number],
  minLeafSamples: number,
): { threshold: number; leftValue: number; rightValue: number; gain: number } | null {
  const values = rows.map((r) => r[feature]);
  const unique = [...new Set(values)].sort((a, b) => a - b);
  let best: { threshold: number; leftValue: number; rightValue: number; gain: number } | null = null;
  let parentSum = 0;
  for (const g of gradients) parentSum += g;
  const parentScore = (parentSum * parentSum) / Math.max(rows.length, 1);
  for (let i = 0; i < unique.length - 1; i += 1) {
    const threshold = unique[i]!;
    let leftSum = 0;
    let leftCount = 0;
    for (let r = 0; r < rows.length; r += 1) {
      if (values[r]! <= threshold) {
        leftSum += gradients[r]!;
        leftCount += 1;
      }
    }
    const rightCount = rows.length - leftCount;
    if (leftCount < minLeafSamples || rightCount < minLeafSamples) continue;
    const rightSum = parentSum - leftSum;
    let leftValue = leftSum / leftCount;
    let rightValue = rightSum / rightCount;
    const direction = MONOTONE_DIRECTION[feature];
    if (direction === 1 && leftValue > rightValue) {
      const pooled = (leftSum + rightSum) / rows.length;
      leftValue = pooled;
      rightValue = pooled;
    }
    if (direction === -1 && leftValue < rightValue) {
      const pooled = (leftSum + rightSum) / rows.length;
      leftValue = pooled;
      rightValue = pooled;
    }
    const score = (leftSum * leftValue + rightSum * rightValue) / rows.length;
    const gain = score - parentScore / rows.length;
    if (best === null || gain > best.gain) best = { threshold, leftValue, rightValue, gain };
  }
  return best;
}

/**
 * Post #7. Depth-1 gradient boosting with monotone leaf projection. Each
 * stump is fitted on one constrained feature and its two leaf values are
 * pooled when the raw fit violates the published sign. Because the model
 * is an additive sum of monotone stumps, the fitted function is monotone
 * in each constrained feature by construction. The returned monotonicity
 * object is a finite-difference check at the prediction point, not a
 * claim about every point in the space.
 */
export function computeMonotonicGbdtWinProb(
  rows: readonly WinProbRow[],
  predictAt: { scoreDifferential: number; yardline100: number; ydstogo: number },
  options: MonotonicGbdtOptions = {},
): MonotonicGbdtResult {
  if (rows.length < 10) throw new Error("monotonic GBDT requires at least ten training rows");
  const { iterations = 40, learningRate = 0.08, minLeafSamples = 5 } = options;
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be a positive integer");
  if (!(learningRate > 0 && learningRate <= 1)) throw new Error("learningRate must be in (0,1]");
  if (!Number.isInteger(minLeafSamples) || minLeafSamples < 1) throw new Error("minLeafSamples must be a positive integer");
  if (rows.some((r) => ![r.scoreDifferential, r.yardline100, r.ydstogo].every(Number.isFinite))) {
    throw new Error("training rows must be finite");
  }
  let base = 0;
  const positives = rows.reduce((s, r) => s + r.win, 0);
  const p0 = clamp01((positives + 0.5) / (rows.length + 1));
  base = Math.log(p0 / (1 - p0));
  let logits = rows.map(() => base);
  const trees: MonotonicGbdtResult["trees"] = [];
  for (let iter = 0; iter < iterations; iter += 1) {
    const p = logits.map((z) => sigmoid(z));
    const gradients = rows.map((r, i) => r.win - p[i]!);
    let bestTree: MonotonicGbdtResult["trees"][number] | null = null;
    let bestGain = -Infinity;
    for (const feature of CONSTRAINED_FEATURES) {
      const candidate = fitMonotoneStump(rows, gradients, feature, minLeafSamples);
      if (candidate && candidate.gain > bestGain) {
        bestGain = candidate.gain;
        bestTree = {
          feature,
          threshold: candidate.threshold,
          leftValue: candidate.leftValue,
          rightValue: candidate.rightValue,
        };
      }
    }
    if (!bestTree) break;
    trees.push(bestTree);
    logits = logits.map((z, i) => {
      const row = rows[i]!;
      const leaf = row[bestTree!.feature] <= bestTree!.threshold ? bestTree!.leftValue : bestTree!.rightValue;
      return z + learningRate * leaf;
    });
  }
  const predict = (row: { scoreDifferential: number; yardline100: number; ydstogo: number }): number => {
    let z = base;
    for (const tree of trees) {
      z += learningRate * (row[tree.feature] <= tree.threshold ? tree.leftValue : tree.rightValue);
    }
    return sigmoid(z);
  };
  const p = predict(predictAt);
  const eps = 0.5;
  const dScore = (predict({ ...predictAt, scoreDifferential: predictAt.scoreDifferential + eps }) - p) / eps;
  const dYard = (predict({ ...predictAt, yardline100: predictAt.yardline100 - eps }) - p) / -eps;
  const dDown = (predict({ ...predictAt, ydstogo: predictAt.ydstogo - eps }) - p) / -eps;
  const trainingLogLoss = -mean(
    rows.map((r, i) => {
      const pi = clamp01(sigmoid(logits[i]!));
      return r.win === 1 ? Math.log(Math.max(pi, 1e-12)) : Math.log(Math.max(1 - pi, 1e-12));
    }),
  );
  return {
    winProbability: p,
    iterations: trees.length,
    trees,
    monotonicity: {
      scoreDifferential: dScore,
      yardline100: dYard,
      ydstogo: dDown,
      allHold: dScore >= -1e-9 && dYard <= 1e-9 && dDown <= 1e-9,
    },
    trainingLogLoss,
  };
}

export interface FieldGoalAttempt {
  distance: number;
  windMph: number;
  dome: 0 | 1;
  altitudeKm: number;
  made: 0 | 1;
}

export interface FieldGoalCoefficients {
  b0: number;
  b1: number;
  b2: number;
  b3: number;
  b4: number;
  b5: number;
}

export interface FieldGoalMetricResult {
  coefficients: FieldGoalCoefficients;
  xfgByAttempt: number[];
  fgoe: number;
  madeRate: number;
  converged: boolean;
  n: number;
}

/**
 * Post #16. Fits the exact quadratic-kink logistic by Newton-Raphson.
 * The distance kink is max(0, d - 50)^2. Returns converged:false when the
 * Hessian cannot be solved; callers should not treat an unconverged fit
 * as a measured model. At least 20 attempts are required.
 */
export function computeExpectedFieldGoalMetric(
  attempts: readonly FieldGoalAttempt[],
  suppliedCoefficients?: FieldGoalCoefficients,
  ridgeLambda = 1e-3,
): FieldGoalMetricResult {
  if (attempts.length < 20) throw new Error("field-goal fit requires at least twenty attempts");
  if (!Number.isFinite(ridgeLambda) || ridgeLambda < 0) throw new Error("ridgeLambda must be non-negative");
  const design = attempts.map((a) => [
    1,
    -a.distance,
    -(Math.max(0, a.distance - 50) ** 2),
    -a.windMph,
    a.dome,
    a.altitudeKm,
  ]);
  const y = attempts.map((a) => a.made);
  let beta: number[] = suppliedCoefficients
    ? [suppliedCoefficients.b0, suppliedCoefficients.b1, suppliedCoefficients.b2, suppliedCoefficients.b3, suppliedCoefficients.b4, suppliedCoefficients.b5]
    : new Array<number>(6).fill(0);
  let converged = Boolean(suppliedCoefficients);
  if (!suppliedCoefficients) {
    for (let iter = 0; iter < 40; iter += 1) {
      const p = design.map((row) => sigmoidRow(row, beta));
      const gradient = new Array<number>(6).fill(0);
      const hessian: number[][] = Array.from({ length: 6 }, () => new Array<number>(6).fill(0));
      for (let i = 0; i < design.length; i += 1) {
        const pi = p[i]!;
        const wi = Math.max(pi * (1 - pi), 1e-9);
        const residual = y[i]! - pi;
        for (let a = 0; a < 6; a += 1) {
          gradient[a] = gradient[a]! + design[i]![a]! * residual;
          for (let b = 0; b < 6; b += 1) hessian[a]![b] = hessian[a]![b]! + design[i]![a]! * wi * design[i]![b]!;
        }
      }
      for (let a = 1; a < 6; a += 1) hessian[a]![a] = hessian[a]![a]! + ridgeLambda;
      let step: number[];
      try {
        step = solveLinearSystem(hessian, gradient);
      } catch {
        converged = false;
        break;
      }
      let maxStep = 0;
      beta = beta.map((b, i) => {
        const next = b + step[i]!;
        maxStep = Math.max(maxStep, Math.abs(step[i]!));
        return next;
      });
      if (maxStep < 1e-7) {
        converged = true;
        break;
      }
    }
  }
  const coefficients: FieldGoalCoefficients = {
    b0: beta[0]!,
    b1: beta[1]!,
    b2: beta[2]!,
    b3: beta[3]!,
    b4: beta[4]!,
    b5: beta[5]!,
  };
  const xfgByAttempt = design.map((row) => clamp01(sigmoidRow(row, beta)));
  let fgoe = 0;
  for (let i = 0; i < attempts.length; i += 1) fgoe += y[i]! - xfgByAttempt[i]!;
  return {
    coefficients,
    xfgByAttempt,
    fgoe,
    madeRate: mean(y),
    converged,
    n: attempts.length,
  };
}

export interface PuntObservation {
  hangtimeSec: number;
  grossYards: number;
  /** -1 = left sideline, 0 = middle, 1 = right sideline. */
  sidelineDirection: -1 | 0 | 1;
  gunnerSeparationYards: number;
  returnYards: number;
}

export interface RerunCoefficients {
  intercept: number;
  hangtime: number;
  grossYards: number;
  sidelineDirection: number;
  gunnerSeparation: number;
}

export interface RerunResult {
  coefficients: RerunCoefficients;
  expectedReturnYards: number[];
  rerunNetOverExpected: number[];
  aggregateNetOverExpected: number;
  n: number;
}

/**
 * Post #18. Fits E[ReturnYards | hangtime, grossYards, sidelineDirection,
 * gunnerSeparation] by ordinary least squares. Net over expected is
 * expected minus actual return yards, so a positive value is good punt
 * coverage. At least ten punts are required. A singular design throws
 * rather than returning a fabricated fit.
 */
export function computeRerunPunterMetric(punts: readonly PuntObservation[]): RerunResult {
  if (punts.length < 10) throw new Error("RERUN requires at least ten punts");
  const design = punts.map((p) => [1, p.hangtimeSec, p.grossYards, p.sidelineDirection, p.gunnerSeparationYards]);
  const y = punts.map((p) => p.returnYards);
  const p = 5;
  const xtx: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const xty = new Array<number>(p).fill(0);
  for (let r = 0; r < design.length; r += 1) {
    for (let i = 0; i < p; i += 1) {
      xty[i] = xty[i]! + design[r]![i]! * y[r]!;
      for (let j = 0; j < p; j += 1) xtx[i]![j] = xtx[i]![j]! + design[r]![i]! * design[r]![j]!;
    }
  }
  for (let i = 1; i < p; i += 1) xtx[i]![i] = xtx[i]![i]! + 1e-6;
  const beta = solveLinearSystem(xtx, xty);
  const expectedReturnYards = design.map((row) => row.reduce((s, v, i) => s + v * beta[i]!, 0));
  const rerunNetOverExpected = expectedReturnYards.map((e, i) => e - y[i]!);
  return {
    coefficients: {
      intercept: beta[0]!,
      hangtime: beta[1]!,
      grossYards: beta[2]!,
      sidelineDirection: beta[3]!,
      gunnerSeparation: beta[4]!,
    },
    expectedReturnYards,
    rerunNetOverExpected,
    aggregateNetOverExpected: mean(rerunNetOverExpected),
    n: punts.length,
  };
}

function sigmoidRow(row: readonly number[], beta: readonly number[]): number {
  let z = 0;
  for (let i = 0; i < row.length; i += 1) z += row[i]! * beta[i]!;
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export { sigmoid, mean };
