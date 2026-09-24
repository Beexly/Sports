/**
 * Censored shifted gamma (CSG) EMOS for weather — arXiv 2212.12504v1
 * ("Parametric Post-Processing of Dual-Resolution Precipitation Forecasts").
 *
 * ADDITIVE utility. Not wired into any totals-model path (wiring changes
 * priced weather features and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: take raw stadium precipitation/wind ensemble forecasts,
 * fit CSG EMOS with CRPS-minimizing rolling windows and semi-local
 * clustering across NFL stadiums (cluster by climate regime and ensemble
 * spread characteristics) to share parameters where single-stadium history
 * is thin; feed calibrated predictive distributions into the totals model
 * as uncertainty-aware weather features, tracking CRPSS per stadium.
 *
 * CSG: Y = max(0, Z - delta), Z ~ Gamma(k, theta). Point mass at zero =
 * P(Z <= delta); continuous part is the shifted gamma tail.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT if the BQN/EMOS achieves >=10%
 * relative CRPS improvement over the naive probabilistic baseline on a
 * holdout season AND rank histograms are flatter (central-bin deviation
 * from uniformity reduced by >=30%); otherwise fall back to EMOS.
 */

/** Regularized lower incomplete gamma P(a, x) via series expansion. */
export function gammaP(a: number, x: number): number {
  if (a <= 0 || x < 0) return Number.NaN;
  if (x === 0) return 0;
  if (x > a + 1) {
    // Continued-fraction upper tail Q(a, x); P = 1 - Q (series diverges here).
    return 1 - gammaQcf(a, x);
  }
  // Series representation (good for x <= a + 1).
  let sum = 1 / a;
  let term = sum;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
  }
  const logFactor = -x + a * Math.log(x) - logGamma(a);
  return sum * Math.exp(logFactor);
}

/** Regularized upper incomplete gamma Q(a, x) via Lentz continued fraction. */
function gammaQcf(a: number, x: number): number {
  const fpmin = 1e-300;
  const eps = 1e-12;
  let b = x + 1 - a;
  let c = 1 / fpmin;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = b + an / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  const logFactor = -x + a * Math.log(x) - logGamma(a);
  return Math.exp(logFactor) * h;
}

/** Lanczos log-gamma. */
export function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < g + 2; i++) x += c[i]! / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export interface CsgParams {
  readonly k: number;
  readonly theta: number;
  readonly delta: number;
}

/** CSG CDF at y >= 0 (censored at zero with point mass). */
export function csgCdf(y: number, p: CsgParams): number {
  if (y < 0) return 0;
  return gammaP(p.k, (y + p.delta) / p.theta);
}

/** Point mass at exactly zero. */
export function csgPointMassZero(p: CsgParams): number {
  return gammaP(p.k, p.delta / p.theta);
}

/** CSG quantile by bisection on the CDF. */
export function csgQuantile(q: number, p: CsgParams, hi = 1e4): number {
  const qc = Math.min(Math.max(q, 0), 1);
  if (qc <= csgPointMassZero(p)) return 0;
  let lo = 0;
  let h = hi;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + h) / 2;
    if (csgCdf(mid, p) < qc) lo = mid;
    else h = mid;
  }
  return (lo + h) / 2;
}

/**
 * CRPS of the CSG forecast at observation y, via numerical integration of
 * (F(z) - 1{z >= y})^2 over z. Grid upper bound adapts to the distribution.
 */
export function csgCrps(y: number, p: CsgParams, gridN = 400): number {
  const mean = p.k * p.theta - p.delta;
  const sd = Math.sqrt(p.k) * p.theta;
  const upper = Math.max(y * 1.5, mean + 6 * sd, 1);
  const dz = upper / gridN;
  let s = 0;
  for (let i = 0; i <= gridN; i++) {
    const z = i * dz;
    const f = csgCdf(z, p);
    const ind = z >= y ? 1 : 0;
    const d = f - ind;
    s += (i === 0 || i === gridN ? 0.5 : 1) * d * d;
  }
  return s * dz;
}

export interface EmosCoefficients {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly delta: number;
}

/**
 * EMOS link: ensemble mean/variance -> CSG parameters.
 * m = a + b * ensMean; v = c + d * ensVar; k = m^2/v; theta = v/m.
 */
export function csgParamsFromEnsemble(
  ensMean: number,
  ensVar: number,
  coefs: EmosCoefficients,
): CsgParams {
  const m = Math.max(coefs.a + coefs.b * ensMean, 1e-6);
  const v = Math.max(coefs.c + coefs.d * Math.max(ensVar, 0), 1e-9);
  return { k: (m * m) / v, theta: v / m, delta: Math.max(coefs.delta, 0) };
}

/**
 * Semi-local cluster key: climate regime + ensemble-spread bucket. Stadiums
 * sharing a key share EMOS coefficients where single-stadium history is thin.
 */
export function semiLocalClusterKey(
  climateRegime: string,
  ensembleSpread: number,
  spreadBuckets = 3,
): string {
  const b = Math.min(spreadBuckets - 1, Math.max(0, Math.floor(ensembleSpread * spreadBuckets)));
  return climateRegime + "|spread-bucket-" + b;
}

/** CRPSS = 1 - CRPS_model / CRPS_reference. Positive = skill. */
export function crpss(crpsModel: number, crpsReference: number): number {
  if (!(crpsReference > 0)) return 0;
  return 1 - crpsModel / crpsReference;
}
