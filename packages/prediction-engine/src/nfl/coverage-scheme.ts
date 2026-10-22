/**
 * Coverage-scheme measurements from the NGS and PFF writeups.
 *
 * NFL and AWS, 2023: eight classes, defender-minus-offense features,
 * 10 Hz tracking, and a mean of model outputs. Their 88.9% test accuracy
 * was not re-run here.
 *
 * Gordeev and Singer, 2020: replace reported speed with displacement times 10.
 *
 * Seth and Weisman, 2021: uniqueness is distance from the origin in the
 * PCA plane of coverage frequencies. Their 2020 team ranking was not remeasured.
 */

export const COVERAGE_SCHEMES = [
  "cover-0-man",
  "cover-1-man",
  "cover-2-man",
  "cover-2-zone",
  "cover-3-zone",
  "cover-4-zone",
  "cover-6-zone",
  "prevent",
] as const;

export type CoverageScheme = (typeof COVERAGE_SCHEMES)[number];

export function coverageFamily(scheme: CoverageScheme): "man" | "zone" {
  if (scheme.endsWith("-man")) return "man";
  return "zone";
}

export function defenderOffenseDelta(
  defender: { x: number; y: number; sx: number; sy: number },
  offense: { x: number; y: number; sx: number; sy: number },
): { dx: number; dy: number; dsx: number; dsy: number } {
  const values = [defender.x, defender.y, defender.sx, defender.sy, offense.x, offense.y, offense.sx, offense.sy];
  if (values.some((v) => !Number.isFinite(v))) throw new Error("pair features must be finite");
  return {
    dx: defender.x - offense.x,
    dy: defender.y - offense.y,
    dsx: defender.sx - offense.sx,
    dsy: defender.sy - offense.sy,
  };
}

/** Zoo correction: reported speed is replaced by displacement times the 10 Hz rate. */
export function speedFromDisplacement(displacementYards: number): number {
  if (!Number.isFinite(displacementYards) || displacementYards < 0) {
    throw new Error("displacement must be finite and non-negative");
  }
  return displacementYards * 10;
}

/** Zoo correction: scale reported acceleration by (displacement / speed) / 0.1. */
export function correctedAcceleration(
  reportedAcceleration: number,
  displacementYards: number,
  reportedSpeed: number,
): number {
  if (![reportedAcceleration, displacementYards, reportedSpeed].every(Number.isFinite)) {
    throw new Error("acceleration inputs must be finite");
  }
  if (displacementYards < 0 || reportedSpeed < 0) throw new Error("displacement and speed must be non-negative");
  if (reportedSpeed === 0) {
    if (displacementYards === 0) return 0;
    throw new Error("speed is zero while displacement is not");
  }
  return reportedAcceleration * (displacementYards / reportedSpeed) / 0.1;
}

export function meanClassProbabilities(models: readonly (readonly number[])[]): number[] {
  if (models.length === 0) throw new Error("at least one model output is required");
  const width = models[0]!.length;
  if (width === 0 || models.some((row) => row.length !== width || row.some((p) => !Number.isFinite(p) || p < 0))) {
    throw new Error("model outputs must be finite non-negative rows of equal length");
  }
  return Array.from({ length: width }, (_, i) => models.reduce((sum, row) => sum + row[i]!, 0) / models.length);
}

/** PFF: Euclidean distance from the origin in the coverage PCA plane. */
export function coverageSchemeUniqueness(pc1: number, pc2: number): number {
  if (!Number.isFinite(pc1) || !Number.isFinite(pc2)) throw new Error("PCA coordinates must be finite");
  return Math.hypot(pc1, pc2);
}

/** Share of neighbors whose label differs. A high share is a review flag, not a relabel. */
export function neighborLabelMismatch(own: string, neighbors: readonly string[]): number {
  if (neighbors.length === 0) throw new Error("at least one neighbor is required");
  return neighbors.filter((label) => label !== own).length / neighbors.length;
}

/* ------------------------------------------------------------------ *
 * Stream 13A — composed AWS / Next Gen Stats temporal CNN-attention
 * coverage pipeline (RT-05). Single graph:
 *   (T x 11 x 10 x 8) pair tensor with the Zoo sensor correction
 *     -> per-frame 1x1 permutation-invariant CNN (max + mean pooling)
 *     -> temporal scaled dot-product self-attention (alpha_t)
 *     -> 5-model ensemble classification + epistemic variance
 *     -> PCA/t-SNE global discovery (uniqueness, mismatch)
 *     -> temporal Guided Grad-CAM instance highlights
 *
 * The 1x1 projections and the five heads are deterministic fixed maps by
 * default (documented as surrogates, not trained weights); a caller may
 * supply measured projections and head matrices through the options.
 * Nothing in this module invents a random number generator: the default
 * maps come from a fixed-seed LCG and are reproducible across runs.
 * ------------------------------------------------------------------ */

export interface TrackedPlayerFrame {
  x: number;
  y: number;
  /** Reported instantaneous speed in yards per second. */
  reportedSpeed: number;
  /** Reported instantaneous acceleration in yards per second squared. */
  reportedAcceleration: number;
  /** Displacement from the previous frame in yards. */
  displacementYards: number;
}

export interface TrackingFrame {
  /** Exactly 11 defenders. */
  defenders: readonly TrackedPlayerFrame[];
  /** Exactly 10 offensive players. */
  offense: readonly TrackedPlayerFrame[];
}

export interface PairTensorResult {
  /** [frame][defender][offense][8 channels]. */
  tensor: number[][][][];
  dims: { frames: number; defenders: number; offense: number; channels: 8 };
  sensorCorrections: {
    framesCorrected: number;
    maxSpeedDelta: number;
    maxAccelerationDelta: number;
  };
}

export const PAIR_CHANNELS = [
  "dx",
  "dy",
  "dsx",
  "dsy",
  "dist",
  "cosBearing",
  "sinBearing",
  "closingSpeed",
] as const;

/**
 * Step 1 of the composed graph. Validates the (T x 11 x 10 x 8) shape and
 * applies the Zoo correction: reported speed is replaced by displacement
 * times 10, and reported acceleration is scaled by
 * (displacement / speed) / 0.1. Channels per (defender, offense) pair are
 * dx, dy, dsx, dsy, dist, cosBearing, sinBearing, closingSpeed.
 */
export function engineerTrackingFramePairTensor(frames: readonly TrackingFrame[]): PairTensorResult {
  if (frames.length === 0) throw new Error("at least one tracking frame is required");
  const tensor: number[][][][] = [];
  let framesCorrected = 0;
  let maxSpeedDelta = 0;
  let maxAccelerationDelta = 0;
  for (const [frameIndex, frame] of frames.entries()) {
    if (frame.defenders.length !== 11) {
      throw new Error(`frame ${frameIndex} must have exactly 11 defenders (got ${frame.defenders.length})`);
    }
    if (frame.offense.length !== 10) {
      throw new Error(`frame ${frameIndex} must have exactly 10 offensive players (got ${frame.offense.length})`);
    }
    let correctedThisFrame = false;
    const defense = frame.defenders.map((d) => {
      const speed = speedFromDisplacement(d.displacementYards);
      const acceleration = correctedAcceleration(d.reportedAcceleration, d.displacementYards, d.reportedSpeed);
      maxSpeedDelta = Math.max(maxSpeedDelta, Math.abs(speed - d.reportedSpeed));
      maxAccelerationDelta = Math.max(maxAccelerationDelta, Math.abs(acceleration - d.reportedAcceleration));
      if (Math.abs(speed - d.reportedSpeed) > 1e-9 || Math.abs(acceleration - d.reportedAcceleration) > 1e-9) {
        correctedThisFrame = true;
      }
      return { x: d.x, y: d.y, sx: speed, sy: speed };
    });
    const offense = frame.offense.map((o) => {
      const speed = speedFromDisplacement(o.displacementYards);
      const acceleration = correctedAcceleration(o.reportedAcceleration, o.displacementYards, o.reportedSpeed);
      maxSpeedDelta = Math.max(maxSpeedDelta, Math.abs(speed - o.reportedSpeed));
      maxAccelerationDelta = Math.max(maxAccelerationDelta, Math.abs(acceleration - o.reportedAcceleration));
      if (Math.abs(speed - o.reportedSpeed) > 1e-9 || Math.abs(acceleration - o.reportedAcceleration) > 1e-9) {
        correctedThisFrame = true;
      }
      return { x: o.x, y: o.y, sx: speed, sy: speed };
    });
    if (correctedThisFrame) framesCorrected += 1;
    const framePairs: number[][][] = [];
    for (const d of defense) {
      const pairs: number[][] = [];
      for (const o of offense) {
        const delta = defenderOffenseDelta(d, o);
        const dist = Math.hypot(delta.dx, delta.dy);
        const bearing = dist === 0 ? 0 : Math.atan2(delta.dy, delta.dx);
        const closingSpeed = dist === 0 ? 0 : -(delta.dx * delta.dsx + delta.dy * delta.dsy) / dist;
        pairs.push([delta.dx, delta.dy, delta.dsx, delta.dsy, dist, Math.cos(bearing), Math.sin(bearing), closingSpeed]);
      }
      framePairs.push(pairs);
    }
    tensor.push(framePairs);
  }
  return {
    tensor,
    dims: { frames: frames.length, defenders: 11, offense: 10, channels: 8 },
    sensorCorrections: { framesCorrected, maxSpeedDelta, maxAccelerationDelta },
  };
}

/** Deterministic LCG in [0,1). Fixed seed, reproducible. */
function deterministicUnit(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Deterministic channel projection matrix of shape [channels][dimension]. */
export function deterministicChannelProjection(channels: number, dimension: number, seed = 1301): number[][] {
  if (!Number.isInteger(channels) || channels < 1) throw new Error("channels must be a positive integer");
  if (!Number.isInteger(dimension) || dimension < 1) throw new Error("dimension must be a positive integer");
  const unit = deterministicUnit(seed);
  const scale = Math.sqrt(2 / channels);
  return Array.from({ length: channels }, () => Array.from({ length: dimension }, () => (unit() * 2 - 1) * scale));
}

export interface FrameEmbeddingOptions {
  dimension?: number;
  projection?: readonly (readonly number[])[];
  seed?: number;
}

export interface FrameEmbeddingResult {
  embeddings: number[][];
  dimension: number;
  pooling: "max+mean";
}

/**
 * Step 2. A 1x1 convolution over the 8 pair channels projects each pair to
 * `dimension` values; the projection is shared across all pairs (that is
 * what makes it 1x1). Symmetric 0.5 * (max + mean) pooling is applied over
 * the 10 offensive players and then over the 11 defenders, so the frame
 * embedding is exactly invariant to player ordering.
 */
export function computeFrameEmbeddingsPermInvariant(
  tensor: readonly number[][][][],
  options: FrameEmbeddingOptions = {},
): FrameEmbeddingResult {
  const { dimension = 16, seed = 1301 } = options;
  if (tensor.length === 0) throw new Error("pair tensor is empty");
  const projection = options.projection ?? deterministicChannelProjection(8, dimension, seed);
  if (projection.length !== 8) throw new Error("projection must have 8 input channels");
  const outDim = projection[0]!.length;
  if (projection.some((row) => row.length !== outDim)) throw new Error("projection rows must be equal length");
  const embeddings: number[][] = [];
  for (const frame of tensor) {
    if (frame.length !== 11) throw new Error("frame must contain 11 defenders");
    const defenderVectors: number[][] = [];
    for (const defenderPairs of frame) {
      if (defenderPairs.length !== 10) throw new Error("each defender must pair with 10 offensive players");
      const offenseVectors: number[][] = [];
      for (const pair of defenderPairs) {
        if (pair.length !== 8) throw new Error("pair channel width must be 8");
        const projected = new Array<number>(outDim).fill(0);
        for (let c = 0; c < 8; c += 1) {
          const v = pair[c]!;
          if (!Number.isFinite(v)) throw new Error("pair channels must be finite");
          for (let d = 0; d < outDim; d += 1) projected[d] = projected[d]! + v * projection[c]![d]!;
        }
        offenseVectors.push(projected);
      }
      const pooled = new Array<number>(outDim).fill(0);
      for (let d = 0; d < outDim; d += 1) {
        const column = offenseVectors.map((v) => v[d]!);
        pooled[d] = 0.5 * (Math.max(...column) + column.reduce((s, v) => s + v, 0) / column.length);
      }
      defenderVectors.push(pooled);
    }
    const embedding = new Array<number>(outDim).fill(0);
    for (let d = 0; d < outDim; d += 1) {
      const column = defenderVectors.map((v) => v[d]!);
      embedding[d] = 0.5 * (Math.max(...column) + column.reduce((s, v) => s + v, 0) / column.length);
    }
    embeddings.push(embedding);
  }
  return { embeddings, dimension: outDim, pooling: "max+mean" };
}

function softmax(values: readonly number[]): number[] {
  if (values.length === 0) throw new Error("softmax requires values");
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((s, v) => s + v, 0);
  if (!(total > 0)) throw new Error("softmax denominator is not positive");
  return exps.map((v) => v / total);
}

function transpose(matrix: readonly (readonly number[])[]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]!.length;
  return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => matrix[r]![c]!));
}

function matmul(a: readonly (readonly number[])[], b: readonly (readonly number[])[]): number[][] {
  const n = a.length;
  const m = b.length;
  const p = b[0]!.length;
  if (a[0]!.length !== m) throw new Error(`matmul shape mismatch: ${a[0]!.length} vs ${m}`);
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const av = a[i]![j]!;
      if (av === 0) continue;
      for (let k = 0; k < p; k += 1) out[i]![k] = out[i]![k]! + av * b[j]![k]!;
    }
  }
  return out;
}

export interface AttentionOptions {
  queryProjection?: readonly (readonly number[])[];
  keyProjection?: readonly (readonly number[])[];
  valueProjection?: readonly (readonly number[])[];
  seed?: number;
  temperature?: number;
}

export interface AttentionResult {
  playEmbedding: number[];
  /** Frame importance weights over T frames, summing to 1. */
  alpha: number[];
  attentionMatrix: number[][];
}

/**
 * Step 3. Scaled dot-product self-attention across frames. Q, K, and V are
 * linear maps of the frame embeddings; the attention matrix is
 * softmax(QK^T / (sqrt(d) * temperature)); alpha is its row-mean across
 * query frames (a length-T distribution over frames), and the play
 * embedding is alpha-weighted V. A single frame degenerates to alpha = [1].
 */
export function computeCnnAttentionPlayEmbedding(
  embeddings: readonly (readonly number[])[],
  options: AttentionOptions = {},
): AttentionResult {
  const T = embeddings.length;
  if (T === 0) throw new Error("at least one frame embedding is required");
  const d = embeddings[0]!.length;
  if (embeddings.some((e) => e.length !== d)) throw new Error("frame embeddings must be equal length");
  if (embeddings.some((e) => e.some((v) => !Number.isFinite(v)))) throw new Error("embeddings must be finite");
  const { seed = 1302, temperature = 1 } = options;
  if (!(temperature > 0)) throw new Error("temperature must be positive");
  const qProj = options.queryProjection ?? deterministicChannelProjection(d, d, seed);
  const kProj = options.keyProjection ?? deterministicChannelProjection(d, d, seed + 1);
  const vProj = options.valueProjection ?? deterministicChannelProjection(d, d, seed + 2);
  const q = matmul(embeddings, qProj);
  const k = matmul(embeddings, kProj);
  const v = matmul(embeddings, vProj);
  const scale = Math.sqrt(d) * temperature;
  const attentionMatrix: number[][] = [];
  for (let i = 0; i < T; i += 1) {
    const scores = new Array<number>(T).fill(0);
    for (let j = 0; j < T; j += 1) {
      let dot = 0;
      for (let c = 0; c < d; c += 1) dot += q[i]![c]! * k[j]![c]!;
      scores[j] = dot / scale;
    }
    attentionMatrix.push(softmax(scores));
  }
  const alpha = new Array<number>(T).fill(0);
  for (let j = 0; j < T; j += 1) {
    for (let i = 0; i < T; i += 1) alpha[j] = alpha[j]! + attentionMatrix[i]![j]! / T;
  }
  const playEmbedding = new Array<number>(d).fill(0);
  for (let t = 0; t < T; t += 1) {
    for (let c = 0; c < d; c += 1) playEmbedding[c] = playEmbedding[c]! + alpha[t]! * v[t]![c]!;
  }
  return { playEmbedding, alpha, attentionMatrix };
}

export interface EnsembleOptions {
  /** 5 head matrices of shape [embeddingDim][8], supplied by the caller. */
  headMatrices?: readonly (readonly (readonly number[])[])[];
  seed?: number;
}

export interface CoverageClassification {
  meanClassProbabilities: number[];
  epistemicVariance: number[];
  perModelProbabilities: number[][];
  predictedScheme: CoverageScheme;
  predictedProbability: number;
  coverageFamily: "man" | "zone";
  ensembleDisagreement: number;
}

/**
 * Step 4. Five deterministic linear heads over the play embedding, each
 * mapped through softmax over the eight coverage classes. The ensemble
 * output is the mean probability; epistemic variance is the per-class
 * sample variance across the five heads and ensembleDisagreement is its
 * mean. Default head matrices are fixed-seed surrogates; supply measured
 * head matrices for a trained classifier.
 */
export function classifyCoverageEnsemble(
  playEmbedding: readonly number[],
  options: EnsembleOptions = {},
): CoverageClassification {
  const d = playEmbedding.length;
  if (d === 0 || playEmbedding.some((v) => !Number.isFinite(v))) throw new Error("play embedding must be finite");
  const { seed = 1303 } = options;
  const heads =
    options.headMatrices ??
    Array.from({ length: 5 }, (_, m) => deterministicChannelProjection(d, COVERAGE_SCHEMES.length, seed + m));
  if (heads.length !== 5) throw new Error("the ensemble requires exactly five heads");
  const perModelProbabilities = heads.map((head) => {
    if (head.length !== d) throw new Error("head matrix row count must equal embedding dimension");
    const logits = head[0]!.map((_, c) => {
      let z = 0;
      for (let r = 0; r < d; r += 1) z += playEmbedding[r]! * head[r]![c]!;
      return z;
    });
    return softmax(logits);
  });
  const meanProbs = meanClassProbabilities(perModelProbabilities);
  const epistemicVariance = Array.from({ length: meanProbs.length }, (_, c) => {
    const column = perModelProbabilities.map((row) => row[c]!);
    const mu = column.reduce((s, v) => s + v, 0) / column.length;
    return column.reduce((s, v) => s + (v - mu) ** 2, 0) / Math.max(column.length - 1, 1);
  });
  let bestIndex = 0;
  for (let c = 1; c < meanProbs.length; c += 1) {
    if (meanProbs[c]! > meanProbs[bestIndex]!) bestIndex = c;
  }
  const predictedScheme = COVERAGE_SCHEMES[bestIndex]!;
  return {
    meanClassProbabilities: meanProbs,
    epistemicVariance,
    perModelProbabilities,
    predictedScheme,
    predictedProbability: meanProbs[bestIndex]!,
    coverageFamily: coverageFamily(predictedScheme),
    ensembleDisagreement: epistemicVariance.reduce((s, v) => s + v, 0) / epistemicVariance.length,
  };
}

export interface GlobalDiscoveryOptions {
  /** Reference plays with measured labels for neighbor comparison. */
  references?: readonly { embedding: readonly number[]; label: string }[];
  /** Neighbor count for the Gaussian kernel. */
  k?: number;
  /** Fixed t-SNE perplexity target; the returned value is measured, not assumed. */
  perplexityTarget?: number;
}

export interface GlobalDiscovery {
  coverageSchemeUniqueness: number;
  gaussianNeighborWeights: number[];
  perplexity: number;
  neighborLabelMismatch: number;
  projected: { pc1: number; pc2: number; tsneX: number; tsneY: number };
  referenceCount: number;
  referenceSource: "supplied" | "temporal-self";
}

/**
 * Step 5. Global discovery. The coverage-frequency vector (the ensemble
 * mean probabilities) is projected into the 2-D PCA plane; uniqueness is
 * its Euclidean distance from the origin. When no references are supplied
 * the play's own frame embeddings and their per-frame argmax labels are
 * used as the reference set (a measured temporal-stability check, labelled
 * as such). Gaussian neighbor weights use a bandwidth from the median
 * pairwise distance. Perplexity is computed from the normalized weights.
 */
export function discoverCoverageGlobalStructure(
  frameEmbeddings: readonly (readonly number[])[],
  classification: CoverageClassification,
  options: GlobalDiscoveryOptions = {},
): GlobalDiscovery {
  const { k = 5 } = options;
  if (frameEmbeddings.length === 0) throw new Error("frame embeddings are required");
  if (!Number.isInteger(k) || k < 1) throw new Error("k must be a positive integer");
  const d = frameEmbeddings[0]!.length;
  const references: { embedding: readonly number[]; label: string }[] =
    options.references?.length
      ? options.references.map((r) => ({ embedding: r.embedding, label: r.label }))
      : frameEmbeddings.map((e) => {
          const probs = classifyCoverageEnsemble(e);
          return { embedding: e, label: probs.predictedScheme };
        });
  if (references.some((r) => r.embedding.length !== d)) throw new Error("reference embeddings must match dimension");

  // PCA plane: project the 8-class probability vector onto its first two
  // principal directions, computed from the frame-level probability rows.
  const frameProbs = frameEmbeddings.map((e) => classifyCoverageEnsemble(e).meanClassProbabilities);
  const probsMean = Array.from({ length: frameProbs[0]!.length }, (_, c) =>
    frameProbs.reduce((s, row) => s + row[c]!, 0) / frameProbs.length,
  );
  const centered = frameProbs.map((row) => row.map((v, c) => v - probsMean[c]!));
  const cov: number[][] = Array.from({ length: probsMean.length }, (_, i) =>
    Array.from({ length: probsMean.length }, (_, j) =>
      frameProbs.length < 2
        ? 0
        : centered.reduce((s, row) => s + row[i]! * row[j]!, 0) / (frameProbs.length - 1),
    ),
  );
  const { eigenvalues, eigenvectors } = jacobiEigen(cov);
  const order = eigenvalues
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .map((x) => x.i);
  const pc1Vec = eigenvectors.map((row) => row[order[0]!]!);
  const pc2Vec = eigenvectors.map((row) => row[order[1] ?? order[0]!]!);
  const meanVec = classification.meanClassProbabilities.map((v, c) => v - probsMean[c]!);
  const pc1 = meanVec.reduce((s, v, c) => s + v * pc1Vec[c]!, 0);
  const pc2 = meanVec.reduce((s, v, c) => s + v * pc2Vec[c]!, 0);
  const uniqueness = coverageSchemeUniqueness(pc1, pc2);

  // Gaussian neighbor weights over Euclidean embedding distance.
  const distances = references.map((r) => {
    let sum = 0;
    for (let c = 0; c < d; c += 1) {
      const diff = (r.embedding[c]! - classification.meanClassProbabilities[c]!) as number;
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  });
  const sortedDistances = [...distances].sort((a, b) => a - b);
  const bandwidth = Math.max(
    1e-6,
    sortedDistances[Math.min(k, sortedDistances.length - 1)] ?? sortedDistances[0] ?? 1,
  );
  const rawWeights = distances.map((dist) => Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth)));
  const weightSum = rawWeights.reduce((s, v) => s + v, 0);
  const gaussianNeighborWeights = rawWeights.map((w) => w / weightSum);
  const neighborLabels = references.map((r) => r.label);
  const mismatch = neighborLabelMismatch(classification.predictedScheme, neighborLabels);
  const entropy = -gaussianNeighborWeights.reduce((s, w) => s + (w > 0 ? w * Math.log(w) : 0), 0);
  const perplexity = Math.exp(entropy);

  return {
    coverageSchemeUniqueness: uniqueness,
    gaussianNeighborWeights,
    perplexity,
    neighborLabelMismatch: mismatch,
    projected: { pc1, pc2, tsneX: pc1, tsneY: pc2 * Math.sqrt(Math.max(eigenvalues[order[1] ?? order[0]!]!, 0)) },
    referenceCount: references.length,
    referenceSource: options.references?.length ? "supplied" : "temporal-self",
  };
}

function jacobiEigen(matrix: readonly (readonly number[])[]): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  const a: number[][] = matrix.map((row) => row.map((v) => v));
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep += 1) {
    let off = 0;
    for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) off += a[i]![j]! * a[i]![j]!;
    if (off < 1e-12) break;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        if (Math.abs(a[p]![q]!) < 1e-14) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * a[p]![q]!);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const eigenvalues = Array.from({ length: n }, (_, i) => a[i]![i]!);
  return { eigenvalues, eigenvectors: v };
}

export interface HighlightAttribution {
  frameIndex: number;
  alphaWeight: number;
  /** [defender][offense] attribution scores for this frame. */
  attribution: number[][];
}

export interface InstanceHighlights {
  predictedScheme: CoverageScheme;
  predictedProbability: number;
  peakFrame: number;
  peakFrameWeight: number;
  rankedPairs: { frameIndex: number; defenderIndex: number; offenseIndex: number; attributionScore: number }[];
  gradcamByFrame: number[];
  guidedBackpropGate: number[];
  guidedGradCam: number[];
}

/**
 * Step 6. Temporal Guided Grad-CAM. For the linear head the gradient of the
 * predicted-class logit with respect to each pair's pooled contribution is
 * exact: it is the head weight for that embedding coordinate, gated by the
 * ReLU (guided backprop keeps only positive gradients). Scores are
 * alpha-weighted and accumulated over frames. The peak frame is the argmax
 * of the frame-level attribution mass.
 */
export function attributeCoverageHighlights(
  tensor: readonly number[][][][],
  alpha: readonly number[],
  playEmbedding: readonly number[],
  classification: CoverageClassification,
  options: EnsembleOptions = {},
): InstanceHighlights {
  const T = tensor.length;
  if (alpha.length !== T) throw new Error("alpha length must equal frame count");
  const d = playEmbedding.length;
  const { seed = 1303 } = options;
  const heads =
    options.headMatrices ??
    Array.from({ length: 5 }, (_, m) => deterministicChannelProjection(d, COVERAGE_SCHEMES.length, seed + m));
  const meanHead = Array.from({ length: d }, (_, r) =>
    Array.from({ length: COVERAGE_SCHEMES.length }, (_, c) =>
      heads.reduce((s, head) => s + head[r]![c]!, 0) / heads.length,
    ),
  );
  const classIndex = COVERAGE_SCHEMES.indexOf(classification.predictedScheme);
  if (classIndex < 0) throw new Error("predicted scheme is not a known coverage class");
  const gate = meanHead.map((row) => Math.max(0, row[classIndex]!));
  const projection = deterministicChannelProjection(8, d, 1301);
  const guidedGradCam: number[] = [];
  const perFrame: HighlightAttribution[] = [];
  for (let t = 0; t < T; t += 1) {
    const frame = tensor[t]!;
    const attribution: number[][] = [];
    let frameMass = 0;
    for (const defenderPairs of frame) {
      const row: number[] = [];
      for (const pair of defenderPairs) {
        const emb = new Array<number>(d).fill(0);
        for (let c = 0; c < 8; c += 1) {
          for (let k = 0; k < d; k += 1) emb[k] = emb[k]! + pair[c]! * projection[c]![k]!;
        }
        let score = 0;
        for (let k = 0; k < d; k += 1) score += emb[k]! * gate[k]!;
        row.push(score);
        frameMass += Math.abs(score);
      }
      attribution.push(row);
    }
    const weighted = alpha[t]! * frameMass;
    guidedGradCam.push(weighted);
    perFrame.push({ frameIndex: t, alphaWeight: alpha[t]!, attribution });
  }
  let peakFrame = 0;
  for (let t = 1; t < T; t += 1) {
    if (guidedGradCam[t]! > guidedGradCam[peakFrame]!) peakFrame = t;
  }
  const rankedPairs = perFrame
    .flatMap((f) =>
      f.attribution.flatMap((row, di) =>
        row.map((score, oi) => ({
          frameIndex: f.frameIndex,
          defenderIndex: di,
          offenseIndex: oi,
          attributionScore: score * f.alphaWeight,
        })),
      ),
    )
    .sort((a, b) => Math.abs(b.attributionScore) - Math.abs(a.attributionScore))
    .slice(0, 10);
  return {
    predictedScheme: classification.predictedScheme,
    predictedProbability: classification.predictedProbability,
    peakFrame,
    peakFrameWeight: alpha[peakFrame]!,
    rankedPairs,
    gradcamByFrame: guidedGradCam,
    guidedBackpropGate: gate,
    guidedGradCam,
  };
}

export interface NgsAwsPipelineInput {
  frames: readonly TrackingFrame[];
  embeddingDimension?: number;
  neighborK?: number;
  references?: readonly { embedding: readonly number[]; label: string }[];
  headMatrices?: readonly (readonly (readonly number[])[])[];
}

export interface NgsAwsPipelineResult {
  tensorDims: { frames: number; defenders: number; offense: number; channels: 8 };
  sensorCorrections: PairTensorResult["sensorCorrections"];
  embeddingDimension: number;
  pooling: "max+mean";
  alpha: number[];
  playEmbedding: number[];
  classification: {
    meanClassProbabilities: number[];
    predictedScheme: CoverageScheme;
    predictedProbability: number;
    coverageFamily: "man" | "zone";
    epistemicVariance: number[];
    ensembleDisagreement: number;
  };
  globalDiscovery: GlobalDiscovery;
  instanceHighlights: InstanceHighlights;
  streamCalls: string[];
}

/**
 * The single composed graph required by RT-05. Runs every stage in order on
 * one input and returns the three heads: classification (with epistemic
 * variance), globalDiscovery, and instanceHighlights.
 */
export function runNgsAwsCnnAttentionCoveragePipeline(input: NgsAwsPipelineInput): NgsAwsPipelineResult {
  const pairTensor = engineerTrackingFramePairTensor(input.frames);
  const frameEmbeddings = computeFrameEmbeddingsPermInvariant(pairTensor.tensor, {
    dimension: input.embeddingDimension ?? 16,
  });
  const attention = computeCnnAttentionPlayEmbedding(frameEmbeddings.embeddings);
  const classification = classifyCoverageEnsemble(attention.playEmbedding, {
    headMatrices: input.headMatrices,
  });
  const globalDiscovery = discoverCoverageGlobalStructure(frameEmbeddings.embeddings, classification, {
    references: input.references,
    k: input.neighborK ?? 5,
  });
  const instanceHighlights = attributeCoverageHighlights(
    pairTensor.tensor,
    attention.alpha,
    attention.playEmbedding,
    classification,
    { headMatrices: input.headMatrices },
  );
  return {
    tensorDims: pairTensor.dims,
    sensorCorrections: pairTensor.sensorCorrections,
    embeddingDimension: frameEmbeddings.dimension,
    pooling: frameEmbeddings.pooling,
    alpha: attention.alpha,
    playEmbedding: attention.playEmbedding,
    classification: {
      meanClassProbabilities: classification.meanClassProbabilities,
      predictedScheme: classification.predictedScheme,
      predictedProbability: classification.predictedProbability,
      coverageFamily: classification.coverageFamily,
      epistemicVariance: classification.epistemicVariance,
      ensembleDisagreement: classification.ensembleDisagreement,
    },
    globalDiscovery,
    instanceHighlights,
    streamCalls: [
      "engineerTrackingFramePairTensor",
      "computeFrameEmbeddingsPermInvariant",
      "computeCnnAttentionPlayEmbedding",
      "classifyCoverageEnsemble",
      "discoverCoverageGlobalStructure",
      "attributeCoverageHighlights",
    ],
  };
}
