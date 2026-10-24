/**
 * Stream 12 — nflverse/open-source-football receiving xFP and spatial
 * surface modules (Posts #20, #15, #22, #23). RT-06 hardened.
 *
 * Post #20: xFP = CP * (w_ppr + 0.1 * (airYards + E[YAC | catch])
 *   + 6 * P(TD | catch)) + 0.1 * xRushYards + 6 * P(rushTD), with
 *   FPOE = actualFP - xFP and a buy-low/sell-high regression delta.
 * Post #15: positional WR/TE/RB air-yard, CP, and YAC expectation curves.
 * Post #22: bivariate Gaussian KDE over target coordinates and an overlap
 *   integral against defensive zone weak spots.
 * Post #23: continuous spatial completion probability surface and CPOE.
 *
 * The PPR weight and the target/TD probabilities are arguments. The
 * spatial surfaces are fit from supplied observations; no bandwidth or
 * smoothing constant is hidden.
 */

import {
  clamp01,
  gaussianKernel2d,
  mean,
  silvermanBandwidth,
  solveLinearSystem,
  variance,
} from "./osf-math-core.js";

export interface ReceiverXfpInput {
  /** Probability the target is caught. */
  catchProbability: number;
  /** Air yards on the target. */
  airYards: number;
  /** Expected yards after catch conditional on a catch. */
  expectedYac: number;
  /** Probability of a receiving touchdown conditional on a catch. */
  touchdownProbabilityGivenCatch: number;
  /** Expected rushing yards in the same game. */
  expectedRushYards: number;
  /** Probability of a rushing touchdown. */
  rushTouchdownProbability: number;
  /** Actual fantasy points scored. */
  actualFantasyPoints: number;
  /** PPR reception weight: 1 for PPR, 0.5 half-PPR, 0 standard. */
  pprWeight: number;
}

export interface ReceiverXfpResult {
  expectedFantasyPoints: number;
  fantasyPointsOverExpected: number;
  regressionDelta: number;
  signal: "buy-low" | "sell-high" | "neutral";
}

/**
 * Post #20. The coefficients 0.1 (yards per point) and 6 (touchdown points)
 * are the published scoring constants. The PPR reception weight is a
 * league-format argument. The regression delta is simply -FPOE: positive
 * FPOE means the player scored above expectation and is a sell-high
 * candidate; negative FPOE is a buy-low candidate.
 */
export function computeReceiverExpectedFantasyPoints(input: ReceiverXfpInput): ReceiverXfpResult {
  const {
    catchProbability,
    airYards,
    expectedYac,
    touchdownProbabilityGivenCatch,
    expectedRushYards,
    rushTouchdownProbability,
    actualFantasyPoints,
    pprWeight,
  } = input;
  const values = [
    catchProbability,
    airYards,
    expectedYac,
    touchdownProbabilityGivenCatch,
    expectedRushYards,
    rushTouchdownProbability,
    actualFantasyPoints,
    pprWeight,
  ];
  if (!values.every(Number.isFinite)) throw new Error("xFP inputs must be finite");
  if (!(catchProbability >= 0 && catchProbability <= 1)) throw new Error("catchProbability must be in [0,1]");
  if (!(touchdownProbabilityGivenCatch >= 0 && touchdownProbabilityGivenCatch <= 1)) {
    throw new Error("touchdownProbabilityGivenCatch must be in [0,1]");
  }
  if (!(rushTouchdownProbability >= 0 && rushTouchdownProbability <= 1)) {
    throw new Error("rushTouchdownProbability must be in [0,1]");
  }
  if (pprWeight < 0) throw new Error("pprWeight must be non-negative");
  const expectedFantasyPoints =
    catchProbability *
      (pprWeight + 0.1 * (airYards + expectedYac) + 6 * touchdownProbabilityGivenCatch) +
    0.1 * expectedRushYards +
    6 * rushTouchdownProbability;
  const fantasyPointsOverExpected = actualFantasyPoints - expectedFantasyPoints;
  const regressionDelta = -fantasyPointsOverExpected;
  const signal: ReceiverXfpResult["signal"] =
    fantasyPointsOverExpected > 2 ? "sell-high" : fantasyPointsOverExpected < -2 ? "buy-low" : "neutral";
  return { expectedFantasyPoints, fantasyPointsOverExpected, regressionDelta, signal };
}

export type ReceivingPosition = "WR" | "TE" | "RB";

export interface ReceivingObservation {
  position: ReceivingPosition;
  airYards: number;
  catchProbability: number;
  yac: number;
}

export interface PositionCurve {
  position: ReceivingPosition;
  n: number;
  cpIntercept: number;
  cpSlopePerAirYard: number;
  meanAirYards: number;
  meanYac: number;
  meanCatchProbability: number;
}

export interface PositionCurveResult {
  curves: PositionCurve[];
  expected: { position: ReceivingPosition; airYards: number; expectedCatchProbability: number; expectedYac: number }[];
}

/**
 * Post #15. For each position, fits CP = intercept + slope * airYards by
 * ordinary least squares and reports the sample means. Expected values at
 * a requested air-yard depth are the fitted CP and the mean YAC. A
 * position with fewer than two observations returns its sample means and
 * a zero slope rather than a fabricated fit.
 */
export function evaluateReceivingByPositionCurve(
  observations: readonly ReceivingObservation[],
  atAirYards = 10,
): PositionCurveResult {
  if (observations.length === 0) throw new Error("receiving observations are required");
  if (!Number.isFinite(atAirYards)) throw new Error("atAirYards must be finite");
  const positions: ReceivingPosition[] = ["WR", "TE", "RB"];
  const curves: PositionCurve[] = [];
  const expected: PositionCurveResult["expected"] = [];
  for (const position of positions) {
    const rows = observations.filter((o) => o.position === position);
    if (rows.length === 0) continue;
    const xs = rows.map((r) => r.airYards);
    const ys = rows.map((r) => r.catchProbability);
    const meanX = mean(xs);
    const meanY = mean(ys);
    let slope = 0;
    if (rows.length >= 2 && variance(xs) > 0) {
      let cov = 0;
      for (let i = 0; i < rows.length; i += 1) cov += (xs[i]! - meanX) * (ys[i]! - meanY);
      slope = cov / ((rows.length - 1) * variance(xs));
    }
    const intercept = meanY - slope * meanX;
    curves.push({
      position,
      n: rows.length,
      cpIntercept: intercept,
      cpSlopePerAirYard: slope,
      meanAirYards: meanX,
      meanYac: mean(rows.map((r) => r.yac)),
      meanCatchProbability: meanY,
    });
    expected.push({
      position,
      airYards: atAirYards,
      expectedCatchProbability: clamp01(intercept + slope * atAirYards),
      expectedYac: mean(rows.map((r) => r.yac)),
    });
  }
  return { curves, expected };
}

export interface TargetPoint {
  x: number;
  y: number;
}

export interface ZoneWeakSpot {
  x: number;
  y: number;
  radiusYards: number;
  weight: number;
}

export interface HeatmapKdeInput {
  targets: readonly TargetPoint[];
  weakSpots?: readonly ZoneWeakSpot[];
  gridStepYards?: number;
}

export interface HeatmapKdeResult {
  bandwidth: { x: number; y: number };
  densityAtTargets: number[];
  grid: { x: number; y: number; density: number }[];
  overlapIntegral: number;
}

/**
 * Post #22. Bivariate Gaussian KDE with Silverman bandwidth per axis. The
 * overlap integral is the mean density of the target distribution over
 * the union of the supplied defensive weak spots, weighted by spot weight.
 * Coordinates are in yards on the field; the caller supplies the frame.
 */
export function evaluateBivariateTargetHeatmapKde(input: HeatmapKdeInput): HeatmapKdeResult {
  const { targets, weakSpots = [], gridStepYards = 2 } = input;
  if (targets.length === 0) throw new Error("targets are required");
  if (targets.some((t) => !Number.isFinite(t.x) || !Number.isFinite(t.y))) {
    throw new Error("target coordinates must be finite");
  }
  if (!(gridStepYards > 0)) throw new Error("gridStepYards must be positive");
  const bwX = silvermanBandwidth(targets.map((t) => t.x));
  const bwY = silvermanBandwidth(targets.map((t) => t.y));
  const density = (x: number, y: number): number =>
    targets.reduce((sum, t) => sum + gaussianKernel2d(x, y, t.x, t.y, bwX, bwY), 0) / targets.length;
  const densityAtTargets = targets.map((t) => density(t.x, t.y));
  const xs = targets.map((t) => t.x);
  const ys = targets.map((t) => t.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const grid: HeatmapKdeResult["grid"] = [];
  for (let x = minX; x <= maxX; x += gridStepYards) {
    for (let y = minY; y <= maxY; y += gridStepYards) {
      grid.push({ x, y, density: density(x, y) });
    }
  }
  let overlapIntegral = 0;
  if (weakSpots.length > 0) {
    let weightSum = 0;
    for (const spot of weakSpots) {
      if (!Number.isFinite(spot.radiusYards) || spot.radiusYards <= 0) {
        throw new Error("weak spot radius must be positive");
      }
      const points: number[] = [];
      const steps = Math.max(4, Math.ceil((2 * spot.radiusYards) / gridStepYards));
      for (let i = 0; i <= steps; i += 1) {
        for (let j = 0; j <= steps; j += 1) {
          const x = spot.x - spot.radiusYards + (2 * spot.radiusYards * i) / steps;
          const y = spot.y - spot.radiusYards + (2 * spot.radiusYards * j) / steps;
          if ((x - spot.x) ** 2 + (y - spot.y) ** 2 <= spot.radiusYards ** 2) points.push(density(x, y));
        }
      }
      overlapIntegral += spot.weight * mean(points);
      weightSum += spot.weight;
    }
    overlapIntegral = weightSum > 0 ? overlapIntegral / weightSum : 0;
  }
  return { bandwidth: { x: bwX, y: bwY }, densityAtTargets, grid, overlapIntegral };
}

export interface SpatialCompletionObservation {
  x: number;
  y: number;
  separation: number;
  sidelineDistance: number;
  completed: 0 | 1;
}

export interface CompletionSurfaceCoefficients {
  intercept: number;
  x: number;
  y: number;
  separation: number;
  sidelineDistance: number;
  xSquared: number;
  ySquared: number;
  separationSquared: number;
}

export interface SpatialCompletionResult {
  coefficients: CompletionSurfaceCoefficients;
  logLikelihood: number;
  predictions: number[];
  cpoe: number;
  converged: boolean;
}

/**
 * Post #23. Tensor-product logistic GAM fit by Newton-Raphson on the
 * supplied completions. Features are x, y, separation, sideline distance,
 * and their squares. CPOE is the mean predicted probability minus the
 * observed completion rate. If the Hessian is singular the function
 * returns converged:false and the last finite coefficients rather than
 * pretending the fit succeeded.
 */
export function evaluateSpatialCompletionSurfaceGam(
  observations: readonly SpatialCompletionObservation[],
  iterations = 25,
  ridgeLambda = 1e-3,
): SpatialCompletionResult {
  if (observations.length < 5) throw new Error("spatial completion fit requires at least five observations");
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be a positive integer");
  if (!Number.isFinite(ridgeLambda) || ridgeLambda < 0) throw new Error("ridgeLambda must be non-negative");
  const design = observations.map((o) => [
    1,
    o.x,
    o.y,
    o.separation,
    o.sidelineDistance,
    o.x * o.x,
    o.y * o.y,
    o.separation * o.separation,
  ]);
  const y = observations.map((o) => o.completed);
  let beta = new Array<number>(8).fill(0);
  let converged = false;
  let logLikelihood = -Infinity;
  for (let iter = 0; iter < iterations; iter += 1) {
    const p = design.map((row) => sigmoidRow(row, beta));
    const gradient = new Array<number>(8).fill(0);
    const hessian: number[][] = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
    for (let i = 0; i < design.length; i += 1) {
      const pi = p[i]!;
      const wi = Math.max(pi * (1 - pi), 1e-9);
      const residual = y[i]! - pi;
      for (let a = 0; a < 8; a += 1) {
        gradient[a] = gradient[a]! + design[i]![a]! * residual;
        for (let b = 0; b < 8; b += 1) hessian[a]![b] = hessian[a]![b]! + design[i]![a]! * wi * design[i]![b]!;
      }
    }
    for (let a = 1; a < 8; a += 1) hessian[a]![a] = hessian[a]![a]! + ridgeLambda;
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
    logLikelihood = design.reduce((sum, row, i) => {
      const pi = clamp01(sigmoidRow(row, beta));
      return sum + (y[i] === 1 ? Math.log(Math.max(pi, 1e-12)) : Math.log(Math.max(1 - pi, 1e-12)));
    }, 0);
    if (maxStep < 1e-7) {
      converged = true;
      break;
    }
  }
  const predictions = design.map((row) => clamp01(sigmoidRow(row, beta)));
  const observedRate = mean(y);
  const cpoe = mean(predictions) - observedRate;
  const coefficients: CompletionSurfaceCoefficients = {
    intercept: beta[0]!,
    x: beta[1]!,
    y: beta[2]!,
    separation: beta[3]!,
    sidelineDistance: beta[4]!,
    xSquared: beta[5]!,
    ySquared: beta[6]!,
    separationSquared: beta[7]!,
  };
  return { coefficients, logLikelihood, predictions, cpoe, converged };
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

export { mean, variance, gaussianKernel2d };
