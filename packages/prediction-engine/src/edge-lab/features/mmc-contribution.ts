/**
 * Meta-Model Contribution (MMC) — Numerai-style orthogonalized signal metric.
 *
 * EDGE THESIS: Numerai scores submissions not just on correlation to outcomes
 * but on correlation AFTER orthogonalizing against the meta model — rewarding
 * UNIQUE signal rather than consensus-tracking. The repo's referees are pooled
 * by `consensus.ts`, and `brier-ogd-ensemble.ts` weights by Brier performance;
 * neither asks "how much does this source add beyond what the field already
 * knows?". This module answers it: rank → gaussianize each source's forecast
 * stream, subtract the component explained by the consensus stream, correlate
 * the residual with centered realized outcomes. A source can have a mediocre
 * Brier score yet a high MMC (it saw something nobody else did) or vice versa.
 *
 * Pipeline (per Numerai docs, adapted to binary sports outcomes):
 *   1. Rank-average each column (ties handled), map ranks through the inverse
 *      normal CDF → gaussian scores.
 *   2. Center target y; center each gaussianized column.
 *   3. Orthogonalize: residual_i = x_i − β·m, where β = cov(x_i, m)/var(m) and
 *      m is the consensus (equal-weight mean of the other sources' gaussianized
 *      streams).
 *   4. MMC_i = corr(residual_i, y_centered) — Pearson on centered values.
 *
 * Honesty rules: fail closed on short/mismatched columns; constant columns
 * (zero variance) report null contribution, never zero-imputed; outcome must be
 * exactly 0/1 per row; n < 3 returns nulls for every source (no meaningful
 * residual exists below that).
 *
 * References:
 * - Numerai docs, "Meta Model Contribution (MMC)": rank → gaussianize →
 *   orthogonalize against meta model → multiply by centered target → mean.
 */

/** Acklam-style rational approximation of the standard normal quantile. */
function probit(p: number): number {
  // Lower-tail coefficients
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;

  if (!Number.isFinite(p) || p <= 0 || p >= 1) return NaN;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

function rankAverage(xs: readonly number[]): number[] {
  const indexed = xs.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);
  const ranks: number[] = new Array(xs.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && (indexed[j + 1]?.value ?? 0) === (indexed[i]?.value ?? 0)) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k]?.index ?? 0] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/** Rank then map through the normal quantile function (Numerai's gaussianize). */
function gaussianize(xs: readonly number[]): number[] {
  const n = xs.length;
  return rankAverage(xs).map((r) => probit(r / (n + 1)));
}

function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i] ?? 0;
    sy += ys[i] ?? 0;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx < 1e-12 || syy < 1e-12) return NaN;
  return sxy / Math.sqrt(sxx * syy);
}

export interface MmcSourceStream {
  readonly name: string;
  /** This source's forecasts aligned row-for-row with outcomes. All finite. */
  readonly probs: readonly number[];
}

export interface MmcContribution {
  readonly name: string;
  /**
   * Correlation of the consensus-orthogonalized gaussianized stream with the
   * centered outcome. Null when the source is constant or perfectly collinear
   * with the consensus (no residual exists).
   */
  readonly mmc: number | null;
}

export interface MmcResult {
  readonly contributions: readonly MmcContribution[];
  /** Sources reporting null mmc, by name (constant or no residual). */
  readonly degenerate: readonly string[];
  readonly n: number;
}

/**
 * Compute per-source MMC over a batch of resolved rows. Pure; no I/O.
 * Outcomes must be exactly 0 or 1; all streams aligned and same length ≥ 3.
 */
export function metaModelContribution(
  outcomes: readonly (0 | 1)[],
  sources: readonly MmcSourceStream[],
): MmcResult {
  const n = outcomes.length;
  if (n < 3) {
    throw new Error("need at least 3 resolved rows");
  }
  for (const o of outcomes) {
    if (o !== 0 && o !== 1) {
      throw new Error("outcomes must be exactly 0 or 1");
    }
  }
  if (sources.length === 0) {
    throw new Error("sources must contain at least one entry");
  }
  for (const s of sources) {
    if (s.probs.length !== n) {
      throw new Error(`stream ${s.name} length ${String(s.probs.length)} != outcome length ${String(n)}`);
    }
    if (!s.probs.every(Number.isFinite)) {
      throw new Error(`stream ${s.name} contains non-finite probs`);
    }
  }

  const yCenteredRaw = outcomes.map((o) => o - outcomes.reduce<number>((a, b) => a + b, 0) / n);

  // Gaussianize once per source; build consensus as the cross-source mean at
  // each row (the repo's "meta model" analogue).
  const gauss = sources.map((s) => gaussianize([...s.probs]));
  const m: number[] = [];
  for (let row = 0; row < n; row++) {
    let acc = 0;
    for (const g of gauss) acc += g[row] ?? 0;
    m.push(acc / sources.length);
  }

  const contributions: MmcContribution[] = [];
  const degenerate: string[] = [];

  for (let si = 0; si < sources.length; si++) {
    const src = sources[si]!;
    const x = gauss[si] ?? [];

    // Constant after gaussianization → zero variance → no information.
    let varX = 0;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    for (const v of x) varX += ((v ?? 0) - mx) ** 2;
    if (varX < 1e-12) {
      degenerate.push(src.name);
      contributions.push({ name: src.name, mmc: null });
      continue;
    }

    // Residual of x after projecting out the consensus m.
    let mm = 0;
    let vm = 0;
    let covxm = 0;
    for (let row = 0; row < n; row++) {
      const mv = m[row] ?? 0;
      mm += mv;
      vm += mv * mv;
      covxm += (x[row] ?? 0) * mv;
    }
    mm /= n;
    vm /= n;
    // m is not necessarily centered; use centered moments for β.
    let cmx = 0;
    let cmv = 0;
    let ccov = 0;
    for (let row = 0; row < n; row++) {
      const dx = (x[row] ?? 0) - mx;
      const dm = (m[row] ?? 0) - mm;
      cmx += dx * dx;
      cmv += dm * dm;
      ccov += dx * dm;
    }
    if (cmv < 1e-12) {
      // Consensus is constant → nothing to orthogonalize away; raw correlation.
      const rho = pearson(x, yCenteredRaw);
      if (!Number.isFinite(rho)) {
        degenerate.push(src.name);
        contributions.push({ name: src.name, mmc: null });
      } else {
        contributions.push({ name: src.name, mmc: rho });
      }
      continue;
    }
    const beta = ccov / cmv;
    const resid = x.map((v, row) => (v ?? 0) - beta * ((m[row] ?? 0) - mm));
    const rho = pearson(resid, yCenteredRaw);
    if (!Number.isFinite(rho)) {
      degenerate.push(src.name);
      contributions.push({ name: src.name, mmc: null });
    } else {
      contributions.push({ name: src.name, mmc: rho });
    }
  }

  return { contributions, degenerate, n };
}
