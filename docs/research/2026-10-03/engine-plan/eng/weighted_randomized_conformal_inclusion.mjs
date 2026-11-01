/**
 * Weighted randomized conformal prediction inclusion from Li (arXiv:2610.37866v1).
 * Printed page https://arxiv.org/html/2610.37866v1 eq (5):
 *   C_s(T, x, U) = { y : (A_s(T, x, y) + U * B_s(T, x, y)) / W_x > alpha }
 * Fail closed: no inclusion decision when inputs are unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function weightedRandomizedConformalInclusion(A, B, W, alpha, U) {
  if (typeof A !== "number" || !Number.isFinite(A) || A < 0) {
    return { ok: false, reason: "invalid_A" };
  }
  if (typeof B !== "number" || !Number.isFinite(B) || B < 0) {
    return { ok: false, reason: "invalid_B" };
  }
  if (typeof W !== "number" || !Number.isFinite(W) || W <= 0) {
    return { ok: false, reason: "invalid_W" };
  }
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    return { ok: false, reason: "invalid_alpha" };
  }
  if (typeof U !== "number" || !Number.isFinite(U) || U < 0 || U > 1) {
    return { ok: false, reason: "invalid_U" };
  }
  const ratio = (A + U * B) / W;
  const included = ratio > alpha;
  return { ok: true, included, ratio, A, B, W, alpha, U };
}
