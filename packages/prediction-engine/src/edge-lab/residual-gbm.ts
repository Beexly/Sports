/**
 * Market-residual gradient-boosted stumps (handoff §2 P3, third edge
 * source): boosts on the RESIDUAL r = y − line, never on the line itself.
 *
 * THE STRUCTURAL RULE. The market line enters `predict()` only as a
 * fixed-coefficient additive offset — `predict(x, line) = line + f(x)` —
 * and it may NEVER appear inside the learned feature vector. A model that
 * were free to re-weight the line as a feature could "rediscover" it and
 * report spurious in-sample skill (fit a big coefficient on the line and
 * come away looking 65% accurate for having copied the market back at
 * itself). Forcing the line out of feature space and into a fixed additive
 * offset structurally forecloses that failure mode, independent of
 * training discipline: `f(x)` is fit purely against `r = y − line`, so it
 * can only ever express what the residual actually contains. The guard
 * below throws if any feature key looks market-derived, and the anti-
 * rediscovery pin in the test file trains on `y = line + noise` (line
 * correlated with the features, residual is not) and checks the fitted
 * `f(x)` stays tiny rather than absorbing the line's correlation.
 *
 * BOOSTING MECHANICS. Depth-1 regression stumps (a single greedy split),
 * fit each round to the negative gradient of the pinball/quantile loss at
 * `opts.quantile`:
 *
 *     g_i = quantile − 1{r_i < pred_i}
 *
 * via exact greedy search over every feature's sorted unique values,
 * minimizing squared error of the resulting two leaf means (standard
 * functional-gradient boosting: the stump approximates the gradient
 * field, and shrunk repetition over many rounds converges it toward the
 * true conditional quantile — this is the same mechanism as LAD/quantile
 * boosting, simplified to depth-1 trees for compactness and auditability).
 * Optional monotone constraints project a leaf pair that violates the
 * required order to their shared midpoint, which keeps every constrained
 * stump — and therefore their shrunk sum — non-decreasing (or
 * non-increasing) in that feature. Early stopping watches pinball loss on
 * a time-ordered LAST slice (never a random sample — leakage discipline)
 * and the returned model is truncated to the best-scoring round, not
 * whichever round the loop happened to stop on.
 */

import { mulberry32, shuffled } from "./rng.js";

export interface ResidualGbmRow {
  /** Feature vector. The market line must NEVER appear as a key here. */
  readonly features: ReadonlyMap<string, number>;
  /** The market line for this row (the fixed additive offset). */
  readonly line: number;
  /** Realized outcome. The model fits the residual r = y − line. */
  readonly y: number;
}

export interface ResidualGbmOptions {
  /** Learning rate / shrinkage applied to every stump. Default 0.1. */
  readonly eta?: number;
  /** Maximum boosting rounds. Default 200. */
  readonly rounds?: number;
  /** Quantile of the pinball loss to fit; 0.5 = median. Default 0.5. */
  readonly quantile?: number;
  /** Seed for the deterministic per-round subsample draw. Default 1. */
  readonly seed?: number;
  /** Fraction of training rows sampled (without replacement) per round. Default 0.8. */
  readonly subsample?: number;
  /** Fraction of rows — the time-ordered LAST slice — held out for early stopping. Default 0.2. */
  readonly validationFraction?: number;
  /** Per-feature monotonicity: +1 non-decreasing, −1 non-increasing. */
  readonly monotone?: ReadonlyMap<string, 1 | -1>;
  /**
   * Escape hatch for feature keys that trip the market-word guard
   * (/line|spread|total|price|odds/i) but are genuinely not market data
   * (e.g. a "baseline_rest" schedule feature that happens to contain none
   * of those words would never need this — this is for the rare key that
   * DOES match the pattern yet is legitimately non-market). Default
   * false: the guard forbids by default.
   */
  readonly allowMarketFeatures?: boolean;
}

export interface ResidualGbmLossPoint {
  readonly round: number;
  readonly trainPinballLoss: number;
  readonly valPinballLoss: number | null;
}

export interface ResidualGbmDiagnostics {
  /** Number of stumps retained in the returned (best-round) model. */
  readonly roundsUsed: number;
  /** Total boosting rounds actually executed before stopping (>= roundsUsed). */
  readonly roundsRun: number;
  readonly quantile: number;
  /** Train/val pinball loss sampled every 10 rounds. */
  readonly lossCurve: readonly ResidualGbmLossPoint[];
  /** How many times each feature was chosen as a split, in the RETAINED (best-round) model — glass-box attribution. */
  readonly featureSplitCounts: ReadonlyMap<string, number>;
  /** Best validation pinball loss observed (null when there is no validation slice). */
  readonly bestValPinballLoss: number | null;
  /** Validation pinball loss at the LAST executed round (>= bestValPinballLoss by construction). */
  readonly finalRoundValPinballLoss: number | null;
}

export interface ResidualGbmModel {
  /** line + f(x): the line enters prediction only as this fixed additive offset. */
  predict(features: ReadonlyMap<string, number>, line: number): number;
  readonly diagnostics: ResidualGbmDiagnostics;
}

const FORBIDDEN_FEATURE_KEY = /line|spread|total|price|odds/i;
const EARLY_STOP_PATIENCE = 25;
const LOSS_CURVE_STRIDE = 10;

function assertNoMarketFeatureKeys(
  features: ReadonlyMap<string, number>,
  allowMarketFeatures: boolean | undefined,
): void {
  if (allowMarketFeatures) return;
  for (const key of features.keys()) {
    if (FORBIDDEN_FEATURE_KEY.test(key)) {
      throw new RangeError(
        `residual-gbm: feature key "${key}" looks market-derived (matches /line|spread|total|price|odds/i). ` +
          `The market line is a fixed additive offset, never a learnable feature. Pass ` +
          `opts.allowMarketFeatures: true only if this key is genuinely not market data.`,
      );
    }
  }
}

function pinballLoss(actual: number, predicted: number, quantile: number): number {
  const diff = actual - predicted;
  return diff >= 0 ? quantile * diff : (quantile - 1) * diff;
}

function meanPinballLoss(
  actuals: readonly number[],
  predicted: readonly number[],
  quantile: number,
): number {
  if (actuals.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) sum += pinballLoss(actuals[i]!, predicted[i]!, quantile);
  return sum / actuals.length;
}

/** The pinball-loss-minimizing constant for a sample: its empirical quantile. */
function empiricalQuantile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(quantile * sorted.length)));
  return sorted[idx]!;
}

function collectFeatureKeys(rows: readonly ResidualGbmRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) for (const key of row.features.keys()) set.add(key);
  return [...set].sort();
}

/** Per-feature training-fold means, used to impute missing (absent-key) values. */
function computeMeans(rows: readonly ResidualGbmRow[], keys: readonly string[]): number[] {
  const sums = new Array<number>(keys.length).fill(0);
  const counts = new Array<number>(keys.length).fill(0);
  for (const row of rows) {
    keys.forEach((key, j) => {
      const v = row.features.get(key);
      if (v !== undefined && Number.isFinite(v)) {
        sums[j] = sums[j]! + v;
        counts[j] = counts[j]! + 1;
      }
    });
  }
  return keys.map((_, j) => (counts[j]! > 0 ? sums[j]! / counts[j]! : 0));
}

function encodeRow(
  features: ReadonlyMap<string, number>,
  keys: readonly string[],
  means: readonly number[],
): number[] {
  return keys.map((key, j) => {
    const v = features.get(key);
    if (v === undefined || !Number.isFinite(v)) return means[j]!; // impute to training-fold mean
    return v;
  });
}

interface Stump {
  readonly featureIndex: number;
  readonly threshold: number;
  readonly leftValue: number;
  readonly rightValue: number;
}

function evalStump(stump: Stump, x: readonly number[]): number {
  return x[stump.featureIndex]! <= stump.threshold ? stump.leftValue : stump.rightValue;
}

/**
 * Fit one depth-1 stump to `g` (the pseudo-residual / negative gradient)
 * over `indices`, via exact greedy search over each feature's sorted
 * unique values — minimizing squared error of the two leaf means. Ties on
 * score keep the earliest (feature, threshold) found, so the result is
 * deterministic for a given (X, g, indices) triple.
 */
function fitStump(
  X: readonly (readonly number[])[],
  g: readonly number[],
  indices: readonly number[],
  numFeatures: number,
  monotone: ReadonlyMap<number, 1 | -1> | undefined,
): Stump | null {
  let totalSum = 0;
  for (const i of indices) totalSum += g[i]!;

  let bestScore = -Infinity;
  let best: Stump | null = null;

  for (let f = 0; f < numFeatures; f++) {
    const sorted = [...indices].sort((a, b) => X[a]![f]! - X[b]![f]! || a - b);
    const n = sorted.length;
    let leftSum = 0;
    let leftCount = 0;
    let i = 0;
    while (i < n) {
      // Advance past a full run of ties so the threshold only lands on a
      // genuine boundary between distinct sorted unique values.
      const v = X[sorted[i]!]![f]!;
      let j = i;
      while (j < n && X[sorted[j]!]![f]! === v) {
        leftSum += g[sorted[j]!]!;
        leftCount += 1;
        j += 1;
      }
      i = j;
      if (i >= n) break; // last unique value: no room for a non-empty right leaf

      const rightCount = n - leftCount;
      const rightSum = totalSum - leftSum;
      // leftSum^2/leftCount + rightSum^2/rightCount is maximized exactly
      // when within-leaf squared error (relative to Σg^2, fixed per round)
      // is minimized — the standard two-group SSE-splitting identity.
      const score = (leftSum * leftSum) / leftCount + (rightSum * rightSum) / rightCount;
      if (score > bestScore + 1e-12) {
        let leftValue = leftSum / leftCount;
        let rightValue = rightSum / rightCount;
        const sign = monotone?.get(f);
        if (sign === 1 && leftValue > rightValue) {
          const mid = (leftValue + rightValue) / 2;
          leftValue = mid;
          rightValue = mid;
        } else if (sign === -1 && leftValue < rightValue) {
          const mid = (leftValue + rightValue) / 2;
          leftValue = mid;
          rightValue = mid;
        }
        bestScore = score;
        best = { featureIndex: f, threshold: v, leftValue, rightValue };
      }
    }
  }
  return best;
}

/**
 * Fit a deterministic, boosted-stumps quantile regressor on the RESIDUAL
 * r = y − line. Returns a model whose `predict(features, line)` always
 * evaluates as `line + f(x)` — see the module doc for why the line is
 * structurally excluded from the learned feature space.
 */
export function trainResidualGbm(
  rows: readonly ResidualGbmRow[],
  opts: ResidualGbmOptions = {},
): ResidualGbmModel {
  const eta = opts.eta ?? 0.1;
  const maxRounds = opts.rounds ?? 200;
  const quantile = opts.quantile ?? 0.5;
  const seed = opts.seed ?? 1;
  const subsampleFrac = opts.subsample ?? 0.8;
  const validationFraction = opts.validationFraction ?? 0.2;
  const allowMarketFeatures = opts.allowMarketFeatures ?? false;

  if (!(quantile > 0 && quantile < 1)) {
    throw new RangeError(`quantile must be in (0,1), got ${quantile}`);
  }
  if (!(eta > 0)) throw new RangeError(`eta must be > 0, got ${eta}`);
  if (!Number.isInteger(maxRounds) || maxRounds < 1) {
    throw new RangeError(`rounds must be a positive integer, got ${maxRounds}`);
  }
  if (!(subsampleFrac > 0 && subsampleFrac <= 1)) {
    throw new RangeError(`subsample must be in (0,1], got ${subsampleFrac}`);
  }
  if (!(validationFraction >= 0 && validationFraction < 1)) {
    throw new RangeError(`validationFraction must be in [0,1), got ${validationFraction}`);
  }

  for (const row of rows) assertNoMarketFeatureKeys(row.features, allowMarketFeatures);

  if (rows.length === 0) {
    return {
      predict: (features: ReadonlyMap<string, number>, line: number): number => {
        assertNoMarketFeatureKeys(features, allowMarketFeatures);
        return line;
      },
      diagnostics: {
        roundsUsed: 0,
        roundsRun: 0,
        quantile,
        lossCurve: [],
        featureSplitCounts: new Map(),
        bestValPinballLoss: null,
        finalRoundValPinballLoss: null,
      },
    };
  }

  // Time-ordered split: validation is the LAST slice, never a random
  // sample — peeking at a randomly-drawn future/past mix is a leak class.
  const n = rows.length;
  const nVal = n >= 2 ? Math.max(0, Math.min(n - 1, Math.round(n * validationFraction))) : 0;
  const nTrain = n - nVal;
  const trainRows = rows.slice(0, nTrain);
  const valRows = rows.slice(nTrain);

  // Feature keys and imputation means come from the TRAINING fold only.
  const keys = collectFeatureKeys(trainRows);
  const means = computeMeans(trainRows, keys);

  const monotoneByIndex = new Map<number, 1 | -1>();
  if (opts.monotone) {
    for (const [key, sign] of opts.monotone) {
      const idx = keys.indexOf(key);
      if (idx >= 0) monotoneByIndex.set(idx, sign);
    }
  }

  const trainX = trainRows.map((r) => encodeRow(r.features, keys, means));
  const trainR = trainRows.map((r) => r.y - r.line);
  const valX = valRows.map((r) => encodeRow(r.features, keys, means));
  const valR = valRows.map((r) => r.y - r.line);

  const baseValue = empiricalQuantile(trainR, quantile);
  const trainPred = new Array<number>(trainRows.length).fill(baseValue);
  const valPred = new Array<number>(valRows.length).fill(baseValue);

  const rng = mulberry32(seed);
  const allTrainIndices = trainRows.map((_, i) => i);
  const subsampleCount = Math.max(1, Math.round(subsampleFrac * trainRows.length));

  const stumps: Stump[] = [];
  const roundFeatureKey: string[] = [];
  const lossCurve: ResidualGbmLossPoint[] = [];

  let bestValLoss: number | null = null;
  let lastValLoss: number | null = null;
  let bestRound = 0; // number of stumps retained in the best-scoring model so far
  let roundsRun = 0;

  for (let round = 1; round <= maxRounds; round++) {
    roundsRun = round;

    // Pseudo-residual / negative gradient of the pinball loss at the
    // CURRENT prediction (handoff formula: quantile − 1{r < pred}).
    const g = trainR.map((r, i) => quantile - (r < trainPred[i]! ? 1 : 0));

    const sampleIndices =
      subsampleFrac >= 1 ? allTrainIndices : shuffled(allTrainIndices, rng).slice(0, subsampleCount);

    const stump = fitStump(trainX, g, sampleIndices, keys.length, monotoneByIndex);
    if (!stump) break; // no valid split anywhere (e.g. every feature constant) — nothing left to fit

    stumps.push(stump);
    roundFeatureKey.push(keys[stump.featureIndex]!);

    for (let i = 0; i < trainX.length; i++) trainPred[i] = trainPred[i]! + eta * evalStump(stump, trainX[i]!);
    for (let i = 0; i < valX.length; i++) valPred[i] = valPred[i]! + eta * evalStump(stump, valX[i]!);

    let valLoss: number | null = null;
    if (valRows.length > 0) {
      valLoss = meanPinballLoss(valR, valPred, quantile);
      lastValLoss = valLoss;
      if (bestValLoss === null || valLoss < bestValLoss) {
        bestValLoss = valLoss;
        bestRound = round;
      }
    } else {
      bestRound = round; // no validation slice: nothing to early-stop against, keep every round
    }

    if (round % LOSS_CURVE_STRIDE === 0) {
      lossCurve.push({
        round,
        trainPinballLoss: meanPinballLoss(trainR, trainPred, quantile),
        valPinballLoss: valLoss,
      });
    }

    if (valRows.length > 0 && round - bestRound >= EARLY_STOP_PATIENCE) break;
  }

  const keptStumps = stumps.slice(0, bestRound);
  const featureSplitCounts = new Map<string, number>();
  for (const key of roundFeatureKey.slice(0, bestRound)) {
    featureSplitCounts.set(key, (featureSplitCounts.get(key) ?? 0) + 1);
  }

  const diagnostics: ResidualGbmDiagnostics = {
    roundsUsed: bestRound,
    roundsRun,
    quantile,
    lossCurve,
    featureSplitCounts,
    bestValPinballLoss: bestValLoss,
    finalRoundValPinballLoss: lastValLoss,
  };

  const predict = (features: ReadonlyMap<string, number>, line: number): number => {
    assertNoMarketFeatureKeys(features, allowMarketFeatures);
    const x = encodeRow(features, keys, means);
    let f = baseValue;
    for (const stump of keptStumps) f += eta * evalStump(stump, x);
    return line + f;
  };

  return { predict, diagnostics };
}
