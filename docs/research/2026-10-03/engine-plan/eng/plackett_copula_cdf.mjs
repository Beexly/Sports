/**
 * Plackett copula CDF printed as C_\Theta(u,v) = [1+(\Theta-1)(u+v)] - sqrt{[1+(\Theta-1)(u+v)]^2 - 4uv\Theta(\Theta-1)} / [2(\Theta-1)]
 * page https://examples.rpkg.net/packages/copBasic/reference/PLACKETTcop.ob (Nelsen 2006 pp. 89–92):
 *   C(u, v) = (1 + (theta-1)*(u+v) - sqrt( (1+(theta-1)*(u+v))**2 - 4*u*v*theta*(theta-1) )) / (2*(theta-1))
 * theta > 0, theta != 1; for theta=1 reduces to independence uv. (u, v) in (0, 1].
 * Fail closed when the arguments are outside that domain or the expression is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function plackettCopulaCdf(u, v, theta) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u > 1) {
    return { ok: false, reason: "u_outside_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 1) {
    return { ok: false, reason: "v_outside_unit_interval" };
  }
  if (typeof theta !== "number" || !Number.isFinite(theta) || theta <= 0) {
    return { ok: false, reason: "theta_outside_plackett_domain" };
  }
  if (theta === 1) {
    const c = u * v;
    return { ok: true, c, theta, eq: "independence_special_case" };
  }
  const s = 1 + (theta - 1) * (u + v);
  const disc = s * s - 4 * u * v * theta * (theta - 1);
  if (!Number.isFinite(disc) || disc < 0) {
    return { ok: false, reason: "negative_discriminant" };
  }
  const sqrtDisc = Math.sqrt(disc);
  const numer = s - sqrtDisc;
  const denom = 2 * (theta - 1);
  if (!Number.isFinite(denom) || denom === 0) {
    return { ok: false, reason: "zero_denominator" };
  }
  const c = numer / denom;
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, theta, eq: "plackett_cdf" };
}
