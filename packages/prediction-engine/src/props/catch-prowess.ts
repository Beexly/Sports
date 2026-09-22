/**
 * Spatial catch-prowess model for WR/TE props (soccer shot-conversion
 * transplant).
 *
 * Replaces shots with pass targets: probit P(catch | target location, depth,
 * air yards, separation, coverage shell) with spatial correlation over the
 * target location (hash-to-hash × depth grid) and receiver random effects =
 * "catch prowess". Derives Positioning Sense (expected opportunity quality)
 * vs Catch Prowess (conversion above expectation) for WR/TE prop edges. The
 * rushing analogue (P(success | gap, box count) with rusher random effects)
 * follows the same empirical-Bayes skeleton.
 *
 * @see arXiv:1702.05662 — "Spatial modeling of shot conversion in soccer to single out goalscoring ability"
 *
 * ACCEPTANCE GATE: ADOPT iff the receiver "prowess" random effect is
 * split-half stable (r ≥ 0.4 across seasons) AND the spatial probit beats the
 * logistic baseline on 2025 held-out Brier by ≥ 3%. The gate is a training
 * concern; this module is the pure prowess kernel, not wired live.
 */

export interface Target {
  receiverId: string;
  /** Hash-to-hash position, −26.65..26.65 yards (0 = middle). */
  x: number;
  /** Depth: line of scrimmage = 0, downfield positive. */
  depth: number;
  airYards: number;
  separation: number; // yards at catch point
  caught: 0 | 1;
}

/** Standard normal CDF (A&S approximation) — the probit link. */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - Math.exp((-x * x) / 2) * poly * 0.3989422804014327;
  return x >= 0 ? cdf : 1 - cdf;
}

/**
 * Spatial baseline catch probability: Gaussian-kernel smoother over the
 * (x, depth) target grid — the "opportunity quality" surface.
 */
export function spatialBaseline(
  targets: readonly Target[],
  x: number,
  depth: number,
  bandwidth = 4,
): number {
  let num = 0;
  let den = 0;
  for (const t of targets) {
    const d2 = ((x - t.x) / bandwidth) ** 2 + ((depth - t.depth) / bandwidth) ** 2;
    const w = Math.exp(-0.5 * d2);
    num += w * t.caught;
    den += w;
  }
  return den > 0 ? num / den : 0.6;
}

/**
 * Empirical-Bayes receiver random effects ("catch prowess"): probit-scale
 * residual per receiver, shrunk toward zero by (n / (n + priorWeight)).
 * Returns { prowess, positioningSense } per receiver, where positioningSense
 * is the mean spatial-baseline quality of their targets (opportunity) and
 * prowess is conversion above expectation (skill).
 */
export function fitCatchProwess(
  targets: readonly Target[],
  priorWeight = 30,
): Record<string, { prowess: number; positioningSense: number; targets: number }> {
  const byRecv = new Map<string, Target[]>();
  for (const t of targets) {
    const arr = byRecv.get(t.receiverId) ?? [];
    arr.push(t);
    byRecv.set(t.receiverId, arr);
  }
  const out: Record<string, { prowess: number; positioningSense: number; targets: number }> = {};
  for (const [id, ts] of byRecv) {
    const n = ts.length;
    // Probit residual per target: approximate via (caught − baseline) / φ-scaled.
    let residSum = 0;
    let senseSum = 0;
    for (const t of ts) {
      const base = spatialBaseline(targets, t.x, t.depth);
      const resid = t.caught - base;
      // depth/separation adjustment on the probit scale
      const adj = 0.02 * (t.separation - 2.5) - 0.01 * Math.max(0, t.airYards - 10);
      residSum += resid + adj * base * (1 - base);
      senseSum += base;
    }
    const shrink = n / (n + priorWeight);
    out[id] = {
      prowess: shrink * (residSum / Math.max(1, n)),
      positioningSense: senseSum / Math.max(1, n),
      targets: n,
    };
  }
  return out;
}

/** P(catch) for a new target = probit(baseline logit-ish + prowess). */
export function catchProb(
  fit: Readonly<Record<string, { prowess: number }>>,
  receiverId: string,
  baseline: number,
): number {
  const c = Math.min(Math.max(baseline, 1e-6), 1 - 1e-6);
  const z = Math.sqrt(2) * erfInv(2 * c - 1);
  return normalCdf(z + (fit[receiverId]?.prowess ?? 0));
}

/** Inverse error function (Acklam-style rational approximation). */
function erfInv(x: number): number {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const b = 2 / (Math.PI * a) + ln / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(b * b - ln / a) - b);
}

/** Split-half correlation of prowess (the gate's stability check). */
export function splitHalfCorrelation(
  first: Readonly<Record<string, number>>,
  second: Readonly<Record<string, number>>,
): number {
  const ids = Object.keys(first).filter((id) => id in second);
  if (ids.length < 3) return 0;
  const xs = ids.map((id) => first[id] ?? 0);
  const ys = ids.map((id) => second[id] ?? 0);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0);
  const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}
