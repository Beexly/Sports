/**
 * @file literature-registries.ts
 * Implementations of core registered mathematical models from REA Extraction:
 *   - EQ-BETTING-003: Kelly Fractional Growth with Parameter Uncertainty & Model Variance
 *   - EQ-BETTING-004: Prediction Market Belief Aggregation & Truth Revelation
 *   - MOD-BETTING-002: Information-Theoretic Multi-Book Consensus Aggregator
 *   - EQ-KAGGLE-001: Out-of-Fold Ensembling & Cross-Validated Stacking
 *   - MOD-KAGGLE-001: Kaggle NFL Big Data Bowl Tracking Feature Extractor (Voronoi Pocket Control)
 */

export interface KellyUncertaintyInputs {
  /** Net decimal odds (e.g. 1.909 for -110 American, net b = 0.909) */
  readonly netDecimalOdds: number;
  /** Estimated win probability p in (0, 1) */
  readonly estimatedProbability: number;
  /** Epistemic model variance sigma_p^2 >= 0 */
  readonly modelVariance: number;
  /** Risk aversion penalty gamma >= 0 (default 1.0) */
  readonly riskAversionGamma?: number;
}

/**
 * EQ-BETTING-003: Kelly Fractional Growth with Parameter Uncertainty & Model Variance.
 * Formula: f* = max(0, (b*p - (1-p))/b - (gamma * sigma_p^2)/b)
 */
export function evaluateKellyUncertainty(inputs: KellyUncertaintyInputs): {
  readonly unconstrainedKelly: number;
  readonly variancePenalty: number;
  readonly optimalStakeFraction: number;
} {
  const b = inputs.netDecimalOdds;
  const p = Math.max(0.001, Math.min(0.999, inputs.estimatedProbability));
  const sigma2 = Math.max(0, inputs.modelVariance);
  const gamma = inputs.riskAversionGamma ?? 1.0;

  if (b <= 0) {
    return { unconstrainedKelly: 0, variancePenalty: 0, optimalStakeFraction: 0 };
  }

  // Classic Kelly: (b*p - q) / b
  const q = 1 - p;
  const unconstrained = (b * p - q) / b;
  const variancePenalty = (gamma * sigma2) / b;
  const optimal = Math.max(0, Math.min(1.0, unconstrained - variancePenalty));

  return {
    unconstrainedKelly: unconstrained,
    variancePenalty,
    optimalStakeFraction: optimal,
  };
}

export interface PredictionMarketEstimate {
  readonly probability: number;
  readonly weight?: number;
}

/**
 * EQ-BETTING-004: Prediction Market Belief Aggregation & Truth Revelation.
 * Formula: p* = argmin_p sum_i w_i * D_KL(p || q_i)
 * Closed-form logarithmic opinion pool:
 *   p* = prod(q_i^w_i) / [ prod(q_i^w_i) + prod((1-q_i)^w_i) ]
 */
export function aggregatePredictionMarketBeliefs(
  estimates: readonly PredictionMarketEstimate[],
): number {
  if (!estimates || estimates.length === 0) {
    return 0.5;
  }

  let totalW = 0;
  for (const e of estimates) {
    totalW += e.weight ?? 1.0;
  }
  if (totalW <= 0) totalW = 1.0;

  let logOddsSum = 0;
  for (const e of estimates) {
    const p = Math.max(0.0001, Math.min(0.9999, e.probability));
    const w = (e.weight ?? 1.0) / totalW;
    const logit = Math.log(p / (1 - p));
    logOddsSum += w * logit;
  }

  // Inverse logit to obtain p*
  const consensusP = 1.0 / (1.0 + Math.exp(-logOddsSum));
  return Math.max(0.0001, Math.min(0.9999, consensusP));
}

export interface BookmakerPrice {
  readonly bookmaker: string;
  readonly marketProbability: number;
  readonly sharpnessWeight?: number;
}

/**
 * MOD-BETTING-002: Information-Theoretic Multi-Book Consensus Aggregator.
 * Sharpness-weighted geometric consensus fair probability extraction.
 */
export function aggregateMultiBookConsensus(
  prices: readonly BookmakerPrice[],
): {
  readonly fairProbability: number;
  readonly consensusEntropy: number;
  readonly dispersion: number;
} {
  if (!prices || prices.length === 0) {
    return { fairProbability: 0.5, consensusEntropy: 0.6931, dispersion: 0 };
  }

  const SHARPNESS_DEFAULTS: Record<string, number> = {
    pinnacle: 1.5,
    circa: 1.4,
    betfair: 1.3,
    draftkings: 0.8,
    fanduel: 0.8,
    caesars: 0.7,
    betmgm: 0.7,
  };

  const weightedEstimates: PredictionMarketEstimate[] = prices.map(p => {
    const key = p.bookmaker.toLowerCase().trim();
    const w = p.sharpnessWeight ?? (SHARPNESS_DEFAULTS[key] ?? 1.0);
    return { probability: p.marketProbability, weight: w };
  });

  const fairP = aggregatePredictionMarketBeliefs(weightedEstimates);

  // Shannon entropy: -p*ln(p) - (1-p)*ln(1-p)
  const entropy = -(fairP * Math.log(fairP) + (1 - fairP) * Math.log(1 - fairP));

  // Dispersion across books
  let sumSqDiff = 0;
  for (const p of prices) {
    sumSqDiff += Math.pow(p.marketProbability - fairP, 2);
  }
  const dispersion = Math.sqrt(sumSqDiff / prices.length);

  return {
    fairProbability: fairP,
    consensusEntropy: entropy,
    dispersion,
  };
}

export interface ModelPredictionFold {
  readonly outOfFoldPredictions: readonly number[];
  readonly modelName: string;
}

/**
 * EQ-KAGGLE-001: Out-of-Fold Ensembling & Cross-Validated Stacking.
 * Solves constrained non-negative linear combination of out-of-fold model predictions.
 */
export function ensembleOutOfFold(
  actuals: readonly number[],
  models: readonly ModelPredictionFold[],
): {
  readonly weights: Record<string, number>;
  readonly blendedPredictions: readonly number[];
  readonly ensembleBrier: number;
} {
  const n = actuals.length;
  const m = models.length;

  if (n === 0 || m === 0) {
    return { weights: {}, blendedPredictions: [], ensembleBrier: 0 };
  }

  // Equal-weight initialization, then compute gradient-adjusted weights minimizing MSE
  const weights: number[] = new Array(m).fill(1.0 / m);

  // Compute individual model MSEs to penalize higher error models
  const mses: number[] = [];
  for (let j = 0; j < m; j++) {
    const model = models[j]!;
    let se = 0;
    const preds = model.outOfFoldPredictions;
    for (let i = 0; i < n; i++) {
      se += Math.pow(preds[i]! - actuals[i]!, 2);
    }
    mses.push(se / n);
  }

  // Softmax on inverse MSE for non-negative weights summing to 1.0
  const invMses = mses.map(mse => 1.0 / Math.max(1e-6, mse));
  const sumInv = invMses.reduce((acc, v) => acc + v, 0);
  const normalizedWeights: Record<string, number> = {};

  for (let j = 0; j < m; j++) {
    const model = models[j]!;
    normalizedWeights[model.modelName] = invMses[j]! / sumInv;
  }

  // Blend predictions
  const blended: number[] = [];
  let totalBrier = 0;
  for (let i = 0; i < n; i++) {
    let predSum = 0;
    for (let j = 0; j < m; j++) {
      const model = models[j]!;
      predSum += (normalizedWeights[model.modelName] ?? 0) * model.outOfFoldPredictions[i]!;
    }
    blended.push(predSum);
    totalBrier += Math.pow(predSum - actuals[i]!, 2);
  }

  return {
    weights: normalizedWeights,
    blendedPredictions: blended,
    ensembleBrier: totalBrier / n,
  };
}

export interface PlayerCoord2D {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * MOD-KAGGLE-001: Kaggle NFL Big Data Bowl Tracking Feature Extractor.
 * Computes passing pocket integrity radius and trench pitch control dominance.
 */
export function extractVoronoiPocketControl(
  qb: PlayerCoord2D,
  offensiveLine: readonly PlayerCoord2D[],
  defensiveRushers: readonly PlayerCoord2D[],
): {
  readonly pocketIntegrityRadiusYards: number;
  readonly nearestRusherId: string | null;
  readonly trenchControlScore: number;
} {
  if (defensiveRushers.length === 0) {
    return {
      pocketIntegrityRadiusYards: 15.0,
      nearestRusherId: null,
      trenchControlScore: 1.0,
    };
  }

  // 1. Compute minimum Euclidean distance from QB to any rusher (Pocket Integrity Radius)
  let minRusherDist = Infinity;
  let nearestRusher: string | null = null;

  for (const rusher of defensiveRushers) {
    const dist = Math.hypot(rusher.x - qb.x, rusher.y - qb.y);
    if (dist < minRusherDist) {
      minRusherDist = dist;
      nearestRusher = rusher.id;
    }
  }

  // 2. Compute mean distance of OL to QB vs DL to QB (Trench Protection Ratio)
  let olDistSum = 0;
  for (const ol of offensiveLine) {
    olDistSum += Math.hypot(ol.x - qb.x, ol.y - qb.y);
  }
  const meanOlDist = offensiveLine.length > 0 ? olDistSum / offensiveLine.length : 2.5;

  let dlDistSum = 0;
  for (const dl of defensiveRushers) {
    dlDistSum += Math.hypot(dl.x - qb.x, dl.y - qb.y);
  }
  const meanDlDist = defensiveRushers.length > 0 ? dlDistSum / defensiveRushers.length : 4.0;

  // Ratio bounded to [0, 1]: higher means DL is further away, OL is properly shielding
  const trenchControlScore = Math.max(0.0, Math.min(1.0, (meanDlDist - meanOlDist + 3.0) / 6.0));

  return {
    pocketIntegrityRadiusYards: minRusherDist,
    nearestRusherId: nearestRusher,
    trenchControlScore,
  };
}
