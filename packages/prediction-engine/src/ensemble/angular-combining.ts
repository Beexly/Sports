/**
 * Angular combining of predictive CDFs (arXiv 2305.16735).
 *
 * Combined CDFs over margin (and total) via angular averaging: for
 * each game collect predictive CDFs from the engine (bootstrapped
 * historical margin errors), the de-vigged market distribution
 * (spread/total + historical line-error distribution), and the Elo
 * margin model; optimize theta per market by minimizing trailing
 * 8-week CRPS on an expanding window (re-estimated weekly), with a
 * weighted variant (weights proportional to 1/CRPS per expert) and
 * fallback theta = 67.5 deg (the paper's best fixed angle).
 *
 * The angular average interpolates between vertical averaging
 * (theta = 90 deg: average CDF ordinates) and horizontal averaging
 * (theta -> 0 deg: average quantiles); the angle is the dispersion
 * controller (high disagreement -> horizontal-like low theta).
 *
 * ACCEPTANCE GATE: ADOPT iff optimized-theta angular averaging beats
 * the linear opinion pool by >= 1% mean CRPS over the two-season
 * window AND 95% interval coverage stays within [0.92, 0.97]; REJECT
 * if theta optimization is unstable (bouncing < 10 deg / > 80 deg
 * week-to-week).
 *
 * Research-only module. Not wired into any live combination path.
 */

/** A predictive CDF evaluated on a shared grid. */
export interface Cdf {
  /** Grid points (ascending). */
  xs: number[];
  /** CDF values at the grid points. */
  fs: number[];
}

export const FALLBACK_THETA_DEG = 67.5;

/** Vertical average: mean of CDF ordinates. */
export function verticalAverage(cdfs: readonly Cdf[]): Cdf {
  return averageOnGrid(cdfs, (vals) => vals.reduce((s, x) => s + x, 0) / vals.length);
}

/** Horizontal average: mean of quantiles, inverted back to a CDF. */
export function horizontalAverage(cdfs: readonly Cdf[]): Cdf {
  if (cdfs.length === 0) throw new Error("horizontalAverage: no CDFs");
  const base = cdfs[0] as Cdf;
  const probs = base.fs;
  const quantiles = probs.map((p) => {
    const qs = cdfs.map((c) => quantile(c, p));
    return qs.reduce((s, x) => s + x, 0) / qs.length;
  });
  // Invert: for each grid x, F(x) = largest p with quantile <= x.
  const fs = base.xs.map((x) => {
    let f = 0;
    for (let i = 0; i < probs.length; i++) {
      if ((quantiles[i] as number) <= x) f = probs[i] as number;
    }
    return f;
  });
  return { xs: [...base.xs], fs };
}

/**
 * Angular average at theta (degrees): w(theta) blends vertical and
 * horizontal averages, w = sin/cos normalized so theta=90 -> vertical,
 * theta -> 0 -> horizontal.
 */
export function angularAverage(cdfs: readonly Cdf[], thetaDeg: number): Cdf {
  if (cdfs.length === 0) throw new Error("angularAverage: no CDFs");
  if (thetaDeg <= 0 || thetaDeg > 90) throw new Error("angularAverage: theta in (0, 90]");
  const theta = (thetaDeg * Math.PI) / 180;
  const w = Math.sin(theta) / (Math.sin(theta) + Math.cos(theta));
  const v = verticalAverage(cdfs);
  const h = horizontalAverage(cdfs);
  return {
    xs: [...v.xs],
    fs: v.fs.map((fv, i) => w * fv + (1 - w) * (h.fs[i] as number)),
  };
}

/** Weighted angular average: expert weights proportional to 1/CRPS. */
export function weightedAngularAverage(
  cdfs: readonly Cdf[],
  crps: readonly number[],
  thetaDeg: number,
): Cdf {
  if (cdfs.length !== crps.length || cdfs.length === 0) {
    throw new Error("weightedAngularAverage: mismatched inputs");
  }
  const inv = crps.map((c) => 1 / Math.max(1e-9, c));
  const sum = inv.reduce((s, x) => s + x, 0);
  const weights = inv.map((x) => x / sum);
  // Weighted vertical average, then angular blend with the weighted
  // horizontal average.
  const v = averageOnGrid(cdfs, (vals) =>
    vals.reduce((s, x, j) => s + x * (weights[j] as number), 0),
  );
  const theta = (thetaDeg * Math.PI) / 180;
  const w = Math.sin(theta) / (Math.sin(theta) + Math.cos(theta));
  const base = cdfs[0] as Cdf;
  const probs = base.fs;
  const quantiles = probs.map((p) => {
    const qs = cdfs.map((c) => quantile(c, p));
    return qs.reduce((s, x, j) => s + x * (weights[j] as number), 0);
  });
  const hfs = base.xs.map((x) => {
    let f = 0;
    for (let i = 0; i < probs.length; i++) {
      if ((quantiles[i] as number) <= x) f = probs[i] as number;
    }
    return f;
  });
  return { xs: [...v.xs], fs: v.fs.map((fv, i) => w * fv + (1 - w) * (hfs[i] as number)) };
}

/** CRPS of a CDF against an observed outcome (grid approximation). */
export function crps(cdf: Cdf, outcome: number): number {
  let sum = 0;
  for (let i = 1; i < cdf.xs.length; i++) {
    const dx = (cdf.xs[i] as number) - (cdf.xs[i - 1] as number);
    const f = cdf.fs[i] as number;
    const ind = outcome <= (cdf.xs[i] as number) ? 1 : 0;
    sum += (f - ind) ** 2 * dx;
  }
  return sum;
}

/**
 * Optimize theta on trailing CRPS via grid search. Returns the best
 * theta and a stability flag (unstable if the weekly optima bounce
 * between < 10 and > 80 deg).
 */
export function optimizeTheta(
  weeklyCdfs: ReadonlyArray<readonly Cdf[]>, // per-week expert CDFs
  weeklyOutcomes: readonly number[],
  thetas: readonly number[] = [15, 30, 45, 60, 67.5, 75, 90],
): { theta: number; meanCrps: number; stable: boolean } {
  if (weeklyCdfs.length !== weeklyOutcomes.length || weeklyCdfs.length === 0) {
    throw new Error("optimizeTheta: mismatched/empty weeks");
  }
  let bestTheta = thetas[0] as number;
  let bestCrps = Infinity;
  for (const t of thetas) {
    let sum = 0;
    for (let w = 0; w < weeklyCdfs.length; w++) {
      sum += crps(
        angularAverage(weeklyCdfs[w] as Cdf[], t),
        weeklyOutcomes[w] as number,
      );
    }
    const mean = sum / weeklyCdfs.length;
    if (mean < bestCrps) {
      bestCrps = mean;
      bestTheta = t;
    }
  }
  // Stability: per-week optima range.
  const perWeekOpt = weeklyCdfs.map((cdfs, w) => {
    let bt = thetas[0] as number;
    let bc = Infinity;
    for (const t of thetas) {
      const c = crps(angularAverage(cdfs as Cdf[], t), weeklyOutcomes[w] as number);
      if (c < bc) {
        bc = c;
        bt = t;
      }
    }
    return bt;
  });
  const lo = Math.min(...perWeekOpt);
  const hi = Math.max(...perWeekOpt);
  return { theta: bestTheta, meanCrps: bestCrps, stable: !(lo < 10 && hi > 80) };
}

/** 95% interval coverage of combined CDFs (for the [0.92, 0.97] gate). */
export function intervalCoverage(
  cdfs: readonly Cdf[],
  outcomes: readonly number[],
  level = 0.95,
): number {
  if (cdfs.length !== outcomes.length || cdfs.length === 0) {
    throw new Error("intervalCoverage: mismatched/empty");
  }
  const tail = (1 - level) / 2;
  let inside = 0;
  for (let i = 0; i < cdfs.length; i++) {
    const lo = quantile(cdfs[i] as Cdf, tail);
    const hi = quantile(cdfs[i] as Cdf, 1 - tail);
    if ((outcomes[i] as number) >= lo && (outcomes[i] as number) <= hi) inside++;
  }
  return inside / cdfs.length;
}

function quantile(cdf: Cdf, p: number): number {
  for (let i = 0; i < cdf.fs.length; i++) {
    if ((cdf.fs[i] as number) >= p) return cdf.xs[i] as number;
  }
  return cdf.xs[cdf.xs.length - 1] as number;
}

function averageOnGrid(
  cdfs: readonly Cdf[],
  combine: (vals: number[]) => number,
): Cdf {
  if (cdfs.length === 0) throw new Error("averageOnGrid: no CDFs");
  const base = cdfs[0] as Cdf;
  return {
    xs: [...base.xs],
    fs: base.xs.map((_, i) => combine(cdfs.map((c) => c.fs[i] as number))),
  };
}
