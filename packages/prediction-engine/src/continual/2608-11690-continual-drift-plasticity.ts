/**
 * Stream 8:
 * - Layer-Wise Information-Theoretic Bounds for Replay-Based Continual Learning (arXiv:2608.11690)
 * - Sample Weight Decay (SWD) for Mitigating NTK Plasticity Loss in RL (arXiv:2604.01913)
 * - Heteroskedastic Quantile Smoothing & Limits of Global Early Stopping (arXiv:2610.13909)
 * - Closing the Long-Short View Gap via Angular Similarity + Bias/LayerNorm (arXiv:2609.06219)
 * - Test-Time Collective Action (TTCA, arXiv:2605.27689) & Genre Domain Transfer (arXiv:2311.16083)
 */

export function computeLayerWiseWassersteinDriftBound(
  layerLipschitzConstants: readonly number[],
  layerParameterDrifts: readonly number[],
): {
  readonly cumulativeDriftBound: number;
  readonly dominantLayerIndex: number;
} {
  const n = Math.min(layerLipschitzConstants.length, layerParameterDrifts.length);
  if (n === 0) return { cumulativeDriftBound: 0, dominantLayerIndex: -1 };
  let bound = 0;
  let domIdx = 0;
  let maxContrib = -1;
  for (let l = 0; l < n; l++) {
    let downstreamProd = 1;
    for (let k = l + 1; k < n; k++) {
      downstreamProd *= Math.max(0, layerLipschitzConstants[k] ?? 0);
    }
    const contrib = Math.max(0, layerParameterDrifts[l] ?? 0) * downstreamProd;
    bound += contrib;
    if (contrib > maxContrib) {
      maxContrib = contrib;
      domIdx = l;
    }
  }
  return {
    cumulativeDriftBound: Number(bound.toFixed(6)),
    dominantLayerIndex: domIdx,
  };
}

export function alignGradientWithReplayCurvature(
  liveGrad: readonly number[],
  replayCurvatureGrad: readonly number[],
): {
  readonly alignedGrad: readonly number[];
  readonly destructiveInterferenceDetected: boolean;
} {
  const n = Math.min(liveGrad.length, replayCurvatureGrad.length);
  let dot = 0;
  let normSq = 0;
  for (let i = 0; i < n; i++) {
    const lg = liveGrad[i] ?? 0;
    const rc = replayCurvatureGrad[i] ?? 0;
    dot += lg * rc;
    normSq += rc * rc;
  }
  if (dot >= 0 || normSq <= 1e-12) {
    return {
      alignedGrad: liveGrad.slice(0, n).map((g) => Number(g.toFixed(6))),
      destructiveInterferenceDetected: false,
    };
  }
  const scale = dot / normSq;
  const alignedGrad = [];
  for (let i = 0; i < n; i++) {
    alignedGrad.push(Number(((liveGrad[i] ?? 0) - scale * (replayCurvatureGrad[i] ?? 0)).toFixed(6)));
  }
  return {
    alignedGrad,
    destructiveInterferenceDetected: true,
  };
}

export function computeNtkSampleWeightDecay(input: {
  readonly sampleAgeSteps: number;
  readonly decayRateGamma: number;
  readonly empiricalNtkEffectiveRank: number;
  readonly nominalDimensionD: number;
}): {
  readonly sampleWeight: number;
  readonly rankCollapseSeverity: number;
  readonly plasticityResetRecommended: boolean;
} {
  const d = Math.max(1, input.nominalDimensionD);
  const rankRatio = Math.min(1, Math.max(0, input.empiricalNtkEffectiveRank / d));
  const rankCollapseSeverity = Number((1 - rankRatio).toFixed(4));
  const acceleratedDecay = input.decayRateGamma * (1 + 1.5 * rankCollapseSeverity);
  const sampleWeight = Number(Math.exp(-acceleratedDecay * Math.max(0, input.sampleAgeSteps)).toFixed(6));
  return {
    sampleWeight,
    rankCollapseSeverity,
    plasticityResetRecommended: rankCollapseSeverity >= 0.72,
  };
}

export function computeHeteroskedasticQuantileSmoothLoss(input: {
  readonly targetY: number;
  readonly predictedQuantiles: readonly number[];
  readonly quantileLevelsTau: readonly number[];
  readonly localAleatoricScaleSigma: number;
}): {
  readonly pinballLossNormalized: number;
  readonly nonCrossingPenalty: number;
  readonly totalLoss: number;
} {
  const sigma = Math.max(input.localAleatoricScaleSigma, 1e-4);
  const k = Math.min(input.predictedQuantiles.length, input.quantileLevelsTau.length);
  if (k === 0) return { pinballLossNormalized: 0, nonCrossingPenalty: 0, totalLoss: 0 };
  let pinball = 0;
  for (let i = 0; i < k; i++) {
    const q = input.predictedQuantiles[i] ?? 0;
    const u = (input.targetY - q) / sigma;
    const tau = input.quantileLevelsTau[i] ?? 0.5;
    pinball += u >= 0 ? tau * u : (tau - 1) * u;
  }
  pinball /= k;
  let crossing = 0;
  for (let i = 0; i < k - 1; i++) {
    crossing += Math.max(0, (input.predictedQuantiles[i] ?? 0) - (input.predictedQuantiles[i + 1] ?? 0));
  }
  const totalLoss = Number((pinball + 2.0 * crossing).toFixed(6));
  return {
    pinballLossNormalized: Number(pinball.toFixed(6)),
    nonCrossingPenalty: Number(crossing.toFixed(6)),
    totalLoss,
  };
}

export function fuseLongShortViewsAngular(
  longViewEmbedding: readonly number[],
  shortViewEmbedding: readonly number[],
  biasOffset = 0,
): {
  readonly fusedEmbedding: readonly number[];
  readonly cosineSimilarity: number;
} {
  const n = Math.min(longViewEmbedding.length, shortViewEmbedding.length);
  if (n === 0) return { fusedEmbedding: [], cosineSimilarity: 0 };
  let dot = 0;
  let nL = 0;
  let nS = 0;
  for (let i = 0; i < n; i++) {
    const lv = longViewEmbedding[i] ?? 0;
    const sv = shortViewEmbedding[i] ?? 0;
    dot += lv * sv;
    nL += lv * lv;
    nS += sv * sv;
  }
  const cos = nL > 0 && nS > 0 ? dot / (Math.sqrt(nL) * Math.sqrt(nS)) : 0;
  const gate = Math.min(1, Math.max(0, 0.5 * (cos + 1)));
  const raw = [];
  for (let i = 0; i < n; i++) {
    raw.push(gate * (longViewEmbedding[i] ?? 0) + (1 - gate) * (shortViewEmbedding[i] ?? 0) + biasOffset);
  }
  const mean = raw.reduce((a, b) => a + b, 0) / n;
  const variance = raw.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
  const std = Math.sqrt(variance + 1e-6);
  return {
    fusedEmbedding: raw.map((x) => Number(((x - mean) / std).toFixed(6))),
    cosineSimilarity: Number(cos.toFixed(4)),
  };
}
