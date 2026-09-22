/**
 * Meta-analytics QA pipeline for sports metrics — arXiv 1609.09830v1
 * ("Meta-Analytics: Tools for Understanding the Statistical Properties
 * of Sports Metrics").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Not wired into any engine input path (wiring changes model inputs and
 * is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: for each metric family compute D (discrimination —
 * bootstrap over games within a season for sampling variance), S
 * (stability — across 2015-2025 seasons), and I (independence —
 * Gaussian-copula PCA across the metric set). Publish a metric
 * reliability report ranking all engine inputs; flag metrics with D < 0.5
 * (chance-dominated) or I < 0.2 (redundant) for shrinkage/removal; apply
 * empirical-Bayes shrinkage to flagged noisy rate metrics; re-run
 * annually.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT the meta-metric audit as a
 * standing annual QA step if (a) it identifies >=3 chance-dominated or
 * redundant metrics in the current engine input set, AND (b) acting on the
 * findings (shrinkage/removal) improves 2025 walk-forward log-loss by
 * >=0.002 vs the un-audited input set.
 */

/** Mean of values. */
function mean(xs: readonly number[]): number {
  return xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample variance. */
function variance(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (n - 1);
}

/**
 * D — discrimination: 1 - E[sampling variance] / Var(team means).
 * teamGameValues[t] = per-game metric values for team t within a season.
 * Sampling variance per team comes from bootstrap resampling of that
 * team's games. D near 1 = signal; D < 0.5 = chance-dominated.
 */
export function discriminationIndex(
  teamGameValues: ReadonlyArray<readonly number[]>,
  resamples = 200,
  rand: () => number = Math.random,
): number {
  const teamMeans = teamGameValues.map(mean).filter((m) => Number.isFinite(m));
  if (teamMeans.length < 2) return Number.NaN;
  const totalVar = variance(teamMeans);
  if (!(totalVar > 0)) return 0;
  let samplingVar = 0;
  let teams = 0;
  for (const games of teamGameValues) {
    if (games.length < 2) continue;
    const bootMeans: number[] = [];
    for (let r = 0; r < resamples; r++) {
      let s = 0;
      for (let i = 0; i < games.length; i++) {
        s += games[Math.floor(rand() * games.length)]!;
      }
      bootMeans.push(s / games.length);
    }
    samplingVar += variance(bootMeans);
    teams++;
  }
  if (teams === 0) return Number.NaN;
  return Math.max(0, 1 - samplingVar / teams / totalVar);
}

/**
 * S — stability across seasons: 1 / (1 + CV), CV = std/|mean| of the
 * team's season-level metric values. Near 1 = stable across 2015-2025.
 */
export function stabilityIndex(seasonValues: readonly number[]): number {
  const n = seasonValues.length;
  if (n < 2) return Number.NaN;
  const m = mean(seasonValues);
  if (!(Math.abs(m) > 0)) return 0;
  const cv = Math.sqrt(variance(seasonValues)) / Math.abs(m);
  return 1 / (1 + cv);
}

/** Inverse standard normal CDF (Acklam). */
function normalQuantile(p: number): number {
  const pc = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  let r: number;
  if (pc < plow) {
    q = Math.sqrt(-2 * Math.log(pc));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (pc > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - pc));
    return -((((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
  }
  q = pc - 0.5;
  r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** Rank -> Gaussian-copula normal scores. */
function toNormalScores(xs: readonly number[]): number[] {
  const n = xs.length;
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const out = new Array<number>(n);
  for (let r = 0; r < n; r++) {
    out[order[r]!.i] = normalQuantile((r + 0.5) / n);
  }
  return out;
}

/**
 * I — independence per metric via the Gaussian copula: rank-transform each
 * metric to normal scores, build the correlation matrix, and set
 * I_i = 1 - max_{j != i} corr(i,j)^2 (conservative redundancy proxy:
 * a metric is only as independent as its strongest copula link).
 * I < 0.2 = redundant.
 * columns[j] = observations of metric j.
 */
export function independenceIndices(columns: ReadonlyArray<readonly number[]>): number[] {
  const k = columns.length;
  if (k === 0) return [];
  const n = columns[0]!.length;
  if (k === 1 || n < 2) return columns.map(() => 1);
  const z = columns.map(toNormalScores);
  // Correlation matrix of normal scores.
  const corr: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      const zi = z[i]!;
      const zj = z[j]!;
      const mi = mean(zi);
      const mj = mean(zj);
      let sxy = 0;
      let sxx = 0;
      let syy = 0;
      for (let t = 0; t < n; t++) {
        sxy += (zi[t]! - mi) * (zj[t]! - mj);
        sxx += (zi[t]! - mi) * (zi[t]! - mi);
        syy += (zj[t]! - mj) * (zj[t]! - mj);
      }
      const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
      corr[i]![j] = r;
      corr[j]![i] = r;
    }
  }
  // Per-metric independence: 1 - (largest squared correlation with any
  // other metric), a conservative redundancy proxy from the copula.
  return columns.map((_, i) => {
    let maxR2 = 0;
    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      const r = corr[i]![j]!;
      if (r * r > maxR2) maxR2 = r * r;
    }
    return 1 - maxR2;
  });
}

/**
 * Empirical-Bayes shrinkage for noisy rate metrics: shrunk_i =
 * w_i * x_i + (1 - w_i) * grandMean, w_i = tau^2 / (tau^2 + s_i^2),
 * tau^2 = between-metric variance (DerSimonian-Laird floor at 0).
 */
export function ebShrink(
  values: readonly number[],
  samplingVars: readonly number[],
): number[] {
  const n = values.length;
  if (n === 0) return [];
  const mu = mean(values);
  const q = values.reduce((a, x, i) => a + Math.pow(x - mu, 2) / Math.max(samplingVars[i]!, 1e-12), 0);
  const c = values.reduce((a, _, i) => a + 1 / Math.max(samplingVars[i]!, 1e-12), 0) -
    values.reduce((a, _, i) => a + 1 / Math.pow(Math.max(samplingVars[i]!, 1e-12), 2), 0) /
    Math.max(values.reduce((a, _, i) => a + 1 / Math.max(samplingVars[i]!, 1e-12), 0), 1e-12);
  const tau2 = Math.max(0, (q - (n - 1)) / Math.max(c, 1e-12));
  return values.map((x, i) => {
    const w = tau2 / (tau2 + Math.max(samplingVars[i]!, 1e-12));
    return w * x + (1 - w) * mu;
  });
}

export interface MetricAudit {
  readonly name: string;
  readonly D: number;
  readonly S: number;
  readonly I: number;
  readonly flagged: boolean;
  readonly flagReason: string;
}

/**
 * Metric reliability report: rank by min(D, S, I); flag D < 0.5
 * (chance-dominated) or I < 0.2 (redundant) for shrinkage/removal.
 */
export function reliabilityReport(
  metrics: ReadonlyArray<{ readonly name: string; readonly D: number; readonly S: number; readonly I: number }>,
): MetricAudit[] {
  return metrics
    .map((m) => {
      const reasons: string[] = [];
      if (m.D < 0.5) reasons.push("chance-dominated (D<0.5)");
      if (m.I < 0.2) reasons.push("redundant (I<0.2)");
      return {
        name: m.name,
        D: m.D,
        S: m.S,
        I: m.I,
        flagged: reasons.length > 0,
        flagReason: reasons.join("; "),
      };
    })
    .sort((a, b) => Math.min(a.D, a.S, a.I) - Math.min(b.D, b.S, b.I));
}
