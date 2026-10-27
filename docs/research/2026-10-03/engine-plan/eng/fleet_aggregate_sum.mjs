/**
 * Fleet-level aggregate sum from Moradi et al. (arXiv:2602.02583v1).
 * Printed page https://arxiv.org/html/2602.02583v1 eq (2):
 *   x_{0,t} = sum_{i=1}^N x_{i,t}
 * Fail closed: non-array, empty, or any non-finite input returns not-ok. Picks settled stay 0.
 */
export function fleetAggregateSum(xs) {
  if (!Array.isArray(xs) || xs.length === 0) {
    return { ok: false, reason: "empty_or_non_array" };
  }
  let sum = 0;
  for (const x of xs) {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      return { ok: false, reason: "non_finite_component" };
    }
    sum += x;
  }
  return { ok: true, sum };
}
