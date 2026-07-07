export const UNCERTAINTY_STRATEGIES = ["least_confidence", "margin", "entropy"] as const;

export type UncertaintyStrategy = (typeof UNCERTAINTY_STRATEGIES)[number];

export type CandidatePrediction = {
  readonly id: string;
  readonly probabilities: readonly number[];
  readonly label?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
};

export type RankedUncertaintyCandidate = CandidatePrediction & {
  readonly rank: number;
  readonly strategy: UncertaintyStrategy;
  readonly score: number;
  readonly leastConfidence: number;
  readonly margin: number;
  readonly entropy: number;
  readonly normalizedProbabilities: readonly number[];
};

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeProbabilities(probabilities: readonly number[]): readonly number[] {
  if (probabilities.length < 2) return [];
  if (!probabilities.every((probability) => Number.isFinite(probability) && probability >= 0)) {
    return [];
  }

  const total = probabilities.reduce((sum, probability) => sum + probability, 0);
  if (total <= 0) return [];

  return probabilities.map((probability) => probability / total);
}

function entropyScore(probabilities: readonly number[]): number {
  if (probabilities.length < 2) return 0;

  const entropy = probabilities.reduce((sum, probability) => {
    if (probability <= 0) return sum;
    return sum - probability * Math.log(probability);
  }, 0);

  return entropy / Math.log(probabilities.length);
}

function scoreCandidate(
  candidate: CandidatePrediction,
  strategy: UncertaintyStrategy
): RankedUncertaintyCandidate | null {
  const normalizedProbabilities = normalizeProbabilities(candidate.probabilities);
  if (normalizedProbabilities.length < 2) return null;

  const sorted = [...normalizedProbabilities].sort((a, b) => b - a);
  const top = sorted[0] ?? 0;
  const second = sorted[1] ?? 0;
  const margin = top - second;
  const leastConfidence = 1 - top;
  const entropy = entropyScore(normalizedProbabilities);

  const score =
    strategy === "least_confidence"
      ? leastConfidence
      : strategy === "margin"
        ? 1 - margin
        : entropy;

  return {
    ...candidate,
    entropy: round(entropy),
    leastConfidence: round(leastConfidence),
    margin: round(margin),
    normalizedProbabilities: normalizedProbabilities.map((probability) => round(probability)),
    rank: 0,
    score: round(score),
    strategy,
  };
}

export function rankUncertainCandidates(
  candidates: readonly CandidatePrediction[],
  strategy: UncertaintyStrategy,
  limit = candidates.length
): readonly RankedUncertaintyCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, strategy))
    .filter((candidate): candidate is RankedUncertaintyCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
