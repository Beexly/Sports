/**
 * Adaptive normalized non-conformity on Grassmann from Loukrezis, Grey, Giovanis (arXiv:2610.23508).
 * Printed page https://arxiv.org/html/2610.23508 equation (16):
 *   s_j^n = d_Gr(Y^{(j)}, mu-hat(x^{(j)})) / eta-hat(x^{(j)})
 * Fail closed: requires finite distance >= 0 and finite eta > 0.
 * Picks settled stay 0; this does not score picks.
 */
export function grassmannAdaptiveNonconformity(distance, eta) {
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) {
    return { ok: false, reason: "bad_distance" };
  }
  if (typeof eta !== "number" || !Number.isFinite(eta) || !(eta > 0)) {
    return { ok: false, reason: "bad_eta" };
  }
  const score = distance / eta;
  return { ok: true, score };
}
