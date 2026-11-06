/** Empirical-Bayes shrink of a premise weight toward 1 after a verifiable reward. */
export function shrinkPremiseWeight(input: {
  readonly priorWeight: number;
  readonly realizedAdvantage: number;
  readonly n: number;
}): number {
  const k = Math.max(1, input.n);
  const target = 1 + Math.max(-0.5, Math.min(0.5, input.realizedAdvantage));
  const shrunk = (input.priorWeight * 4 + target * k) / (4 + k);
  return Math.round(Math.max(0.1, Math.min(3, shrunk)) * 1000) / 1000;
}

/** Mroueh fixed-point success amplification for a binary verifiable reward. */
export function amplifySuccessRate(oldSuccess: number): number {
  const p = Math.max(0.01, Math.min(0.99, oldSuccess));
  const next = p + p * (1 - p);
  return Math.round(Math.min(0.99, next) * 1000) / 1000;
}
