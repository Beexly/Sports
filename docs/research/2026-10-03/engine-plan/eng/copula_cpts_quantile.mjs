// Guarded implementation of the empirical quantile for nonconformity scores
// from CopulaCPTS (Sun & Yu, arXiv:2212.03281), eq. (3)
// Fail-closed: throws on invalid inputs

export function copulaCptsQuantile(alpha, scores) {
  if (typeof alpha !== 'number' || alpha <= 0 || alpha >= 1) {
    throw new Error('alpha must be in (0,1)');
  }
  if (!Array.isArray(scores) || scores.length === 0) {
    throw new Error('scores must be non-empty array');
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  const target = 1 - alpha;
  for (let i = 0; i < n; i++) {
    if ((i + 1) / n >= target) {
      return sorted[i];
    }
  }
  return sorted[n - 1];
}
