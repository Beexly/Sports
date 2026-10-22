/**
 * Label smoothing from Müller, Kornblith, and Hinton, 2019.
 *
 * y_k = y_k * (1 - epsilon) + epsilon / K.
 * The NGS coverage model uses this against noisy charting labels.
 * They did not publish their epsilon. The caller supplies it.
 */

export function smoothLabel(classIndex: number, classCount: number, epsilon: number): number[] {
  if (!Number.isInteger(classCount) || classCount < 2) throw new Error("class count must be at least 2");
  if (!Number.isInteger(classIndex) || classIndex < 0 || classIndex >= classCount) {
    throw new Error("class index is outside the class count");
  }
  if (!Number.isFinite(epsilon) || epsilon < 0 || epsilon > 1) {
    throw new Error("epsilon must be in [0, 1]");
  }
  const share = epsilon / classCount;
  return Array.from({ length: classCount }, (_, i) => (i === classIndex ? 1 - epsilon + share : share));
}
