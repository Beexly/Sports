/**
 * DeepSeek DeepInfer DSpark Speculative Decoder & FlashMLA Memory Compressor
 *
 * Mathematical port and algorithmic implementation of `deepseek-ai/DeepInfer`
 * (FlashMLA, EPLB, and DSpark confidence-scheduled speculative decoding).
 *
 * Accelerates Monte Carlo play-by-play rollouts, live betting quote simulations,
 * and high-throughput agent inference on game days.
 */

export interface FlashMlaConfig {
  originalDim: number;
  latentDim: number;
  numLayers: number;
  seqLength: number;
  bytesPerElement: number;
}

export interface FlashMlaCompressionSummary {
  rawKvBytes: number;
  compressedKvBytes: number;
  compressionRatio: number;
  bytesSaved: number;
}

export interface EplbRoutingSummary {
  expertWeights: number[];
  entropy: number;
  normalizedEntropy: number;
  isBalanced: boolean;
  stragglerPenaltyFactor: number;
}

export interface SpeculativeDraftEvaluation<T> {
  draftProposals: T[];
  acceptedProposals: T[];
  acceptedCount: number;
  acceptanceRate: number;
  dynamicDraftHorizon: number;
  effectiveSpeedup: number;
}

/**
 * Calculates FlashMLA (Multi-head Latent Attention) memory savings.
 * FlashMLA projects Key and Value heads into a low-rank compressed latent vector.
 */
export function computeFlashMlaCompression(config: FlashMlaConfig): FlashMlaCompressionSummary {
  const { originalDim, latentDim, numLayers, seqLength, bytesPerElement } = config;

  // Standard KV cache: 2 * numLayers * seqLength * originalDim * bytesPerElement
  const rawKvBytes = 2 * numLayers * seqLength * originalDim * bytesPerElement;

  // FlashMLA: compressed latent vector c_t_kv + decoupled positional vector (0.25 * originalDim)
  const compressedDim = latentDim + 0.25 * originalDim;
  const compressedKvBytes = numLayers * seqLength * compressedDim * bytesPerElement;

  const compressionRatio = rawKvBytes / Math.max(1, compressedKvBytes);
  const bytesSaved = rawKvBytes - compressedKvBytes;

  return {
    rawKvBytes,
    compressedKvBytes,
    compressionRatio: Number(compressionRatio.toFixed(2)),
    bytesSaved,
  };
}

/**
 * Evaluates Expert Parallelism Load Balancing (EPLB) across routed MoE experts.
 * EPLB computes routing entropy to quantify worker rank load balance.
 */
export function evaluateEplbRouting(expertWeights: number[]): EplbRoutingSummary {
  if (expertWeights.length === 0) {
    throw new Error('Expert weights vector cannot be empty');
  }

  const sum = expertWeights.reduce((a, b) => a + b, 0);
  const normalized = expertWeights.map((w) => (sum > 0 ? w / sum : 1 / expertWeights.length));

  let entropy = 0;
  for (const p of normalized) {
    if (p > 1e-9) {
      entropy -= p * Math.log2(p);
    }
  }

  const maxEntropy = Math.log2(expertWeights.length);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 1.0;
  const isBalanced = normalizedEntropy >= 0.85;

  // Straggler penalty increases as entropy drops (one expert bottlenecking the rank)
  const stragglerPenaltyFactor = Number((1.0 + (1.0 - normalizedEntropy) * 1.5).toFixed(3));

  return {
    expertWeights: normalized.map((p) => Number(p.toFixed(4))),
    entropy: Number(entropy.toFixed(3)),
    normalizedEntropy: Number(normalizedEntropy.toFixed(3)),
    isBalanced,
    stragglerPenaltyFactor,
  };
}

/**
 * Calculates dynamic speculative draft length (DSpark).
 * When target entropy is low (high confidence / deterministic execution),
 * draft length expands up to maxDraftLength. When entropy is high, it contracts.
 */
export function calculateDynamicDraftLength(
  targetEntropyBits: number,
  maxEntropyBits = 3.0,
  maxDraftLength = 6
): number {
  const normalizedEntropy = Math.max(0, Math.min(1.0, targetEntropyBits / maxEntropyBits));
  const rawDraftLength = Math.round(maxDraftLength * (1.0 - normalizedEntropy));
  return Math.max(1, Math.min(maxDraftLength, rawDraftLength));
}

/**
 * Executes DSpark speculative decoding acceptance check across draft proposals.
 * Uses Leviathan-style acceptance probability: alpha = min(1, p(x) / q(x)).
 */
export function evaluateDSparkSpeculation<T>(
  draftProposals: T[],
  draftProbs: number[],
  targetProbs: number[],
  randomUniformSequence?: number[]
): SpeculativeDraftEvaluation<T> {
  const n = draftProposals.length;
  if (n === 0) {
    return {
      draftProposals: [],
      acceptedProposals: [],
      acceptedCount: 0,
      acceptanceRate: 0,
      dynamicDraftHorizon: 0,
      effectiveSpeedup: 1.0,
    };
  }

  const accepted: T[] = [];
  let acceptedCount = 0;

  for (let i = 0; i < n; i++) {
    const q_x = Math.max(1e-6, draftProbs[i] || 0.5);
    const p_x = Math.max(1e-6, targetProbs[i] || 0.5);
    const alpha = Math.min(1.0, p_x / q_x);

    const randVal = randomUniformSequence && randomUniformSequence[i] !== undefined
      ? (randomUniformSequence[i] ?? 0.1)
      : 0.1; // Default acceptance threshold for deterministic verification

    const proposal = draftProposals[i];
    if (proposal !== undefined && randVal <= alpha) {
      accepted.push(proposal);
      acceptedCount++;
    } else {
      // Rejection halts speculative block
      break;
    }
  }

  const acceptanceRate = acceptedCount / n;
  // Theoretical speedup: (1 + acceptedCount) / (1 + (n * cost_draft_ratio))
  const costDraftRatio = 0.15; // Draft model runs in ~15% time of target model
  const effectiveSpeedup = (1 + acceptedCount) / (1 + n * costDraftRatio);

  return {
    draftProposals,
    acceptedProposals: accepted,
    acceptedCount,
    acceptanceRate: Number(acceptanceRate.toFixed(3)),
    dynamicDraftHorizon: n,
    effectiveSpeedup: Number(effectiveSpeedup.toFixed(2)),
  };
}
