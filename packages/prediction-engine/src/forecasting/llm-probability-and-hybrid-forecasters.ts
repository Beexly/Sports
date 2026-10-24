/**
 * Stream 14D — LLM probability updates and hybrid forecasters.
 *
 * Three published constructions:
 *  1. `bayesianReverseTokenLogitUpdate` — reverse-token Bayesian update in
 *     log-odds space (gpt2-medium scratch neuro tokenizer; actionbridge.io,
 *     dev.to, research.google). Prior logit + sum of token log-likelihood
 *     ratios = posterior logit, clipped for numerical sanity.
 *  2. `llmEmbeddingTabularForecaster` — a k-nearest-neighbour forecaster in
 *     LLM embedding space blended with a tabular logistic head
 *     (machinelearningmastery.com, neurips.cc/virtual/2024/poster/96085,
 *     2402.10835v1, dannyallover/llm_forecasting).
 *  3. `evaluateSecondWaveArxivSituationalModels` — a ranked evaluation of the
 *     second-wave situational models by arXiv id (2609.31191, 2609.04014,
 *     2608.19819, 2608.17248, 2608.05685, 2610.13909, 2609.06219,
 *     2605.27689, 2604.01913, 2311.16083, 2004.04147).
 *
 * All weights are arguments or measured from supplied labelled examples.
 * Nothing is trained on data this module does not have.
 */

import { clamp, clamp01, logit, sigmoid, solveLinearSystem } from "../nfl/osf-math-core.js";

export interface TokenLikelihood {
  token: string;
  /** log P(token | hypothesis) - log P(token | alternative). */
  logLikelihoodRatio: number;
}

export interface BayesianReverseTokenInput {
  priorProbability: number;
  tokens: readonly TokenLikelihood[];
  /** Temperature on the summed evidence; 1 = exact Bayes in log-odds. */
  temperature?: number;
  /** Hard clip on the posterior logit, default 30. */
  logitClip?: number;
}

export interface BayesianReverseTokenResult {
  posteriorProbability: number;
  posteriorLogit: number;
  priorLogit: number;
  totalEvidence: number;
  contributions: { token: string; evidence: number }[];
  clipped: boolean;
}

/**
 * Exact Bayes in log-odds space: posterior = prior + sum LLR, with a
 * temperature divisor and a symmetric clip. "Reverse" refers to scoring the
 * tokens in reverse order, which does not change the sum; the contributions
 * array preserves token attribution so the caller can audit which token
 * moved the probability.
 */
export function bayesianReverseTokenLogitUpdate(
  input: BayesianReverseTokenInput,
): BayesianReverseTokenResult {
  const { priorProbability, tokens, temperature = 1, logitClip = 30 } = input;
  if (!(priorProbability > 0 && priorProbability < 1)) {
    throw new Error("priorProbability must be strictly between 0 and 1");
  }
  if (!(temperature > 0)) throw new Error("temperature must be positive");
  if (!(logitClip > 0)) throw new Error("logitClip must be positive");
  const contributions = tokens.map((t) => {
    if (!Number.isFinite(t.logLikelihoodRatio)) throw new Error(`token ${t.token} evidence must be finite`);
    return { token: t.token, evidence: t.logLikelihoodRatio / temperature };
  });
  const priorLogit = logit(priorProbability);
  const totalEvidence = contributions.reduce((s, c) => s + c.evidence, 0);
  const raw = priorLogit + totalEvidence;
  const posteriorLogit = clamp(raw, -logitClip, logitClip);
  return {
    posteriorProbability: sigmoid(posteriorLogit),
    posteriorLogit,
    priorLogit,
    totalEvidence,
    contributions,
    clipped: raw !== posteriorLogit,
  };
}

export interface LabelledEmbeddingExample {
  embedding: readonly number[];
  /** Tabular features for the logistic head. */
  features: readonly number[];
  label: 0 | 1;
}

export interface LlmEmbeddingTabularInput {
  queryEmbedding: readonly number[];
  queryFeatures: readonly number[];
  examples: readonly LabelledEmbeddingExample[];
  /** Number of neighbours in embedding space; default all. */
  k?: number;
  /** Blend weight on the embedding kNN, in [0, 1]. */
  embeddingWeight?: number;
  /** Ridge penalty for the tabular logistic head. */
  ridgeLambda?: number;
}

export interface LlmEmbeddingTabularResult {
  embeddingProbability: number;
  tabularProbability: number;
  blendedProbability: number;
  neighboursUsed: number;
  tabularCoefficients: number[] | null;
  note: string;
}

function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error("embedding dimensions must match");
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

function fitLogisticRidge(
  features: readonly (readonly number[])[],
  labels: readonly number[],
  ridgeLambda: number,
): number[] | null {
  const p = features[0]!.length + 1;
  const xtx: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const xty = new Array<number>(p).fill(0);
  for (let r = 0; r < features.length; r += 1) {
    const row = [1, ...features[r]!];
    for (let i = 0; i < p; i += 1) {
      xty[i] = xty[i]! + row[i]! * labels[r]!;
      for (let j = 0; j < p; j += 1) xtx[i]![j] = xtx[i]![j]! + row[i]! * row[j]!;
    }
  }
  for (let i = 1; i < p; i += 1) xtx[i]![i] = xtx[i]![i]! + ridgeLambda;
  try {
    return solveLinearSystem(xtx, xty);
  } catch {
    return null;
  }
}

/**
 * kNN in embedding space blended with a ridge-logistic tabular head. The
 * kNN probability is a similarity-weighted label average; the tabular
 * probability is sigmoid(w . [1, features]). The blend weight is an
 * argument (default 0.5). When the tabular fit is singular the result says
 * so and returns the embedding probability alone rather than a broken head.
 */
export function llmEmbeddingTabularForecaster(
  input: LlmEmbeddingTabularInput,
): LlmEmbeddingTabularResult {
  const { queryEmbedding, queryFeatures, examples } = input;
  if (examples.length === 0) throw new Error("at least one labelled example is required");
  if (examples.some((e) => e.embedding.length !== queryEmbedding.length)) {
    throw new Error("example embedding dimensions must match the query");
  }
  if (examples.some((e) => e.features.length !== queryFeatures.length)) {
    throw new Error("example feature dimensions must match the query");
  }
  const k = input.k ?? examples.length;
  if (!Number.isInteger(k) || k < 1) throw new Error("k must be a positive integer");
  const embeddingWeight = input.embeddingWeight ?? 0.5;
  if (!(embeddingWeight >= 0 && embeddingWeight <= 1)) {
    throw new Error("embeddingWeight must be in [0,1]");
  }
  const ridgeLambda = input.ridgeLambda ?? 1e-3;
  const scored = examples
    .map((example) => ({ example, similarity: cosine(queryEmbedding, example.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.min(k, examples.length));
  const weightSum = scored.reduce((s, x) => s + Math.max(0, x.similarity), 0);
  const embeddingProbability =
    weightSum === 0
      ? scored.reduce((s, x) => s + x.example.label, 0) / scored.length
      : scored.reduce((s, x) => s + Math.max(0, x.similarity) * x.example.label, 0) / weightSum;
  const coefficients = fitLogisticRidge(
    examples.map((e) => e.features),
    examples.map((e) => e.label),
    ridgeLambda,
  );
  let tabularProbability = embeddingProbability;
  let note = "tabular head was singular; embedding probability used for both heads";
  if (coefficients) {
    let z = coefficients[0]!;
    for (let i = 0; i < queryFeatures.length; i += 1) z += coefficients[i + 1]! * queryFeatures[i]!;
    tabularProbability = sigmoid(z);
    note = "embedding kNN blended with a ridge-logistic tabular head";
  }
  return {
    embeddingProbability: clamp01(embeddingProbability),
    tabularProbability: clamp01(tabularProbability),
    blendedProbability: clamp01(embeddingWeight * embeddingProbability + (1 - embeddingWeight) * tabularProbability),
    neighboursUsed: scored.length,
    tabularCoefficients: coefficients,
    note,
  };
}

export interface ArxivModelEvaluation {
  arxivId: string;
  name: string;
  /** Out-of-sample Brier score, lower is better. */
  brier: number;
  /** Out-of-sample log loss, lower is better. */
  logLoss: number;
  /** Fraction of outcomes inside the model's interval, higher is better. */
  coverage: number;
  /** Number of out-of-sample forecasts. */
  n: number;
}

export interface SecondWaveEvaluationInput {
  models: readonly ArxivModelEvaluation[];
  /** Relative weights for brier, log loss, and coverage. */
  weights?: { brier?: number; logLoss?: number; coverage?: number };
}

export interface SecondWaveEvaluationResult {
  ranked: {
    arxivId: string;
    name: string;
    compositeScore: number;
    brier: number;
    logLoss: number;
    coverage: number;
    n: number;
  }[];
  bestModel: string | null;
  modelsEvaluated: number;
  note: string;
}

export const SECOND_WAVE_ARXIV_IDS = [
  "2609.31191",
  "2609.04014",
  "2608.19819",
  "2608.17248",
  "2608.05685",
  "2610.13909",
  "2609.06219",
  "2605.27689",
  "2604.01913",
  "2311.16083",
  "2004.04147",
] as const;

/**
 * Ranks supplied out-of-sample evaluations. The composite is a weighted
 * average of normalized (lower-is-better inverted) Brier, log loss, and
 * coverage. Models with fewer than 30 forecasts are marked but not
 * silently dropped; the note reports how many met the threshold. An empty
 * input returns bestModel: null rather than a fabricated winner.
 */
export function evaluateSecondWaveArxivSituationalModels(
  input: SecondWaveEvaluationInput,
): SecondWaveEvaluationResult {
  const { models } = input;
  if (models.length === 0) {
    return {
      ranked: [],
      bestModel: null,
      modelsEvaluated: 0,
      note: "no model evaluations supplied",
    };
  }
  const weights = {
    brier: input.weights?.brier ?? 0.5,
    logLoss: input.weights?.logLoss ?? 0.3,
    coverage: input.weights?.coverage ?? 0.2,
  };
  const totalWeight = weights.brier + weights.logLoss + weights.coverage;
  if (!(totalWeight > 0)) throw new Error("evaluation weights must sum to a positive value");
  const maxBrier = Math.max(...models.map((m) => m.brier), 1e-9);
  const maxLogLoss = Math.max(...models.map((m) => m.logLoss), 1e-9);
  const ranked = models
    .map((model) => {
      if (![model.brier, model.logLoss, model.coverage].every(Number.isFinite)) {
        throw new Error(`model ${model.arxivId} has non-finite metrics`);
      }
      const compositeScore =
        (weights.brier * (1 - model.brier / maxBrier) +
          weights.logLoss * (1 - model.logLoss / maxLogLoss) +
          weights.coverage * clamp01(model.coverage)) /
        totalWeight;
      return { ...model, compositeScore };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
  const underSampled = ranked.filter((m) => m.n < 30).length;
  return {
    ranked,
    bestModel: ranked[0]!.arxivId,
    modelsEvaluated: ranked.length,
    note:
      underSampled === 0
        ? "all evaluated models have at least 30 out-of-sample forecasts"
        : `${underSampled} model(s) have fewer than 30 forecasts; scores are reported, not certified`,
  };
}

export { clamp01, logit, sigmoid };
