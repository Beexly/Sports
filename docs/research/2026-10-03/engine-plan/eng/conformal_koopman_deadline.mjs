/**
 * Conformal Koopman deadline from Dey, Marchetti (arXiv:2610.28285v1).
 * Printed page https://arxiv.org/html/2610.28285v1 eq (2):
 *   T(ε) := min { k ∈ ℕ : d_k ≤ ε d_0 }
 * Fail closed: no deadline invented when inputs unusable or never converges.
 * Picks settled stay 0; this does not score picks.
 */
export function conformalKoopmanDeadline(disagreements, epsilon) {
  if (!Array.isArray(disagreements) || disagreements.length === 0) {
    return { ok: false, reason: "empty_disagreements" };
  }
  if (typeof epsilon !== "number" || !(epsilon > 0) || !(epsilon < 1)) {
    return { ok: false, reason: "epsilon_out_of_unit_interval" };
  }
  const n = disagreements.length;
  for (let i = 0; i < n; i++) {
    if (typeof disagreements[i] !== "number" || !Number.isFinite(disagreements[i]) || disagreements[i] < 0) {
      return { ok: false, reason: "non_finite_or_negative_disagreement" };
    }
  }
  const d0 = disagreements[0];
  if (!(d0 > 0)) {
    return { ok: false, reason: "non_positive_initial_disagreement" };
  }
  const threshold = epsilon * d0;
  for (let k = 0; k < n; k++) {
    if (disagreements[k] <= threshold) {
      return { ok: true, deadline: k, threshold, d0, epsilon };
    }
  }
  return { ok: false, reason: "never_converged", n, threshold };
}
