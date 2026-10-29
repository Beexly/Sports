/**
 * Stream 6: Extracting Probabilistic Knowledge from LLMs for Bayesian Network Parameterization (arXiv:2505.15918),
 * Bidirectional Bayes Reverse Neuro-Tokenization (llm-probability/gpt2-medium_scratch_neuro_tokenizer_bayes_rev_seed3),
 * and LLM Superforecasting Aggregation (NeurIPS 96085 / arXiv:2402.18563 / arXiv:2402.10835).
 */

export interface LlmDirichletPriorInput {
  readonly llmPriorProbs: readonly number[];
  readonly pseudoCountStrengthN0: number;
  readonly empiricalCounts: readonly number[];
  readonly baseSmoothingAlpha0?: number;
}

export interface LlmDirichletPosteriorResult {
  readonly alphaPrior: readonly number[];
  readonly alphaPosterior: readonly number[];
  readonly posteriorMeanProbs: readonly number[];
  readonly priorWeightShare: number;
}

export function computeLlmDirichletPosterior(input: LlmDirichletPriorInput): LlmDirichletPosteriorResult {
  const k = input.llmPriorProbs.length;
  if (k === 0 || input.empiricalCounts.length !== k || !(input.pseudoCountStrengthN0 >= 0)) {
    throw new Error("computeLlmDirichletPosterior: invalid dimensions or negative N0");
  }
  const alpha0 = input.baseSmoothingAlpha0 ?? 1e-3;
  const pSum = input.llmPriorProbs.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const alphaPrior = input.llmPriorProbs.map((p) => alpha0 + input.pseudoCountStrengthN0 * (Math.max(0, p) / pSum));
  const alphaPosterior = alphaPrior.map((a, i) => a + Math.max(0, input.empiricalCounts[i] ?? 0));
  const totalPost = alphaPosterior.reduce((a, b) => a + b, 0) || 1;
  const totalPrior = alphaPrior.reduce((a, b) => a + b, 0);
  return {
    alphaPrior: alphaPrior.map((x) => Number(x.toFixed(6))),
    alphaPosterior: alphaPosterior.map((x) => Number(x.toFixed(6))),
    posteriorMeanProbs: alphaPosterior.map((x) => Number((x / totalPost).toFixed(6))),
    priorWeightShare: Number((totalPrior / totalPost).toFixed(4)),
  };
}

/**
 * Bidirectional Bayes reverse neuro-tokenization coherence gate:
 * verifies P(token_t | token_{t+1}) * P(token_t) / P(token_{t+1}) consistency against forward conditionals.
 */
export function evaluateBidirectionalBayesTokenCoherence(
  forwardCondProbs: readonly number[],
  reverseCondProbs: readonly number[],
  marginalPriorRatio: readonly number[],
): {
  readonly meanBayesDiscrepancy: number;
  readonly coherent: boolean;
} {
  const n = Math.min(forwardCondProbs.length, reverseCondProbs.length, marginalPriorRatio.length);
  if (n === 0) return { meanBayesDiscrepancy: 1, coherent: false };
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    const impliedForward = Math.min(1, Math.max(0, (reverseCondProbs[i] ?? 0) * (marginalPriorRatio[i] ?? 0)));
    sumDiff += Math.abs((forwardCondProbs[i] ?? 0) - impliedForward);
  }
  const meanBayesDiscrepancy = Number((sumDiff / n).toFixed(6));
  return {
    meanBayesDiscrepancy,
    coherent: meanBayesDiscrepancy <= 0.08,
  };
}

/**
 * NeurIPS 2024 Poster 96085 / arXiv:2402.18563 + arXiv:2402.10835:
 * Extremized log-odds superforecasting pool gated by periodicity-paraphrase JSD coherence.
 */
export function aggregateSuperforecastProbability(
  memberForecasts: readonly number[],
  extremizingExponentD = 1.35,
  paraphraseProbs?: readonly [number, number],
): {
  readonly trimmedMeanProb: number;
  readonly extremizedProb: number;
  readonly paraphraseCoherence: number;
} {
  const clean = memberForecasts
    .filter((p) => Number.isFinite(p))
    .map((p) => Math.min(0.995, Math.max(0.005, p)))
    .sort((a, b) => a - b);
  if (clean.length === 0) {
    return { trimmedMeanProb: 0.5, extremizedProb: 0.5, paraphraseCoherence: 0 };
  }
  const slice = clean.length >= 5 ? clean.slice(1, clean.length - 1) : clean;
  const pBar = slice.reduce((a, b) => a + b, 0) / slice.length;
  let paraphraseCoherence = 1.0;
  if (paraphraseProbs) {
    const [p1, p2] = paraphraseProbs;
    paraphraseCoherence = Number(Math.max(0, 1 - Math.abs(p1 - p2)).toFixed(4));
  }
  const dEff = 1 + (Math.max(1, extremizingExponentD) - 1) * paraphraseCoherence;
  const num = Math.pow(pBar, dEff);
  const den = num + Math.pow(1 - pBar, dEff);
  const extremizedProb = Number((num / den).toFixed(4));
  return {
    trimmedMeanProb: Number(pBar.toFixed(4)),
    extremizedProb,
    paraphraseCoherence,
  };
}
