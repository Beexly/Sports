/**
 * DISCOVERY LAYER — Market Law Miner (Invention 25).
 *
 * Galileo found lawful structure inside noisy observation; this searches for the EQUATIONS. Given
 * calibrated replay samples, it fits candidate SYMBOLIC forms (linear, inverse, log, sqrt, and a
 * full multi-feature linear) for quantities like absorption half-life, book lag, attention
 * distortion, and tradability survival — and prefers the simplest form that explains the most.
 *
 *   τ_absorb ≈ α + β/liquidity + γ·salience + δ/time_to_event
 *
 * The point is not to pretend these are final equations — it is a machine that proposes
 * interpretable equations and then prosecutes them. No black-box-only law may graduate; every
 * candidate carries an explicit expression. Pure + deterministic.
 */

export interface LawSample {
  readonly features: Readonly<Record<string, number>>;
  readonly target: number;
}

export type LawForm = "linear" | "inverse" | "log" | "sqrt" | "multilinear";

export interface CandidateLaw {
  readonly target: string;
  readonly form: LawForm;
  readonly feature: string | null; // null for multilinear
  readonly expression: string;
  readonly params: Readonly<Record<string, number>>;
  readonly r2: number;
  readonly complexity: number;
  readonly score: number;
}

function transform(form: LawForm, x: number): number {
  switch (form) {
    case "inverse": return x === 0 ? NaN : 1 / x;
    case "log": return x > 0 ? Math.log(x) : NaN;
    case "sqrt": return x >= 0 ? Math.sqrt(x) : NaN;
    default: return x;
  }
}

/** 1-variable OLS y = a + b·g(x); returns {a, b, r2}. */
function ols1(xs: number[], ys: number[]): { a: number; b: number; r2: number } | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i]! - mx) ** 2; sxy += (xs[i]! - mx) * (ys[i]! - my); syy += (ys[i]! - my) ** 2; }
  if (sxx === 0 || syy === 0) return null;
  const b = sxy / sxx;
  const a = my - b * mx;
  const r2 = (sxy * sxy) / (sxx * syy);
  return { a, b, r2: Math.max(0, Math.min(1, r2)) };
}

// Minimal Gaussian-elimination solver for the multilinear normal equations.
function solve(A: number[][], y: number[]): number[] | null {
  const n = y.length;
  const M = A.map((r, i) => [...r, y[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-12) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = c + 1; r < n; r++) { const f = M[r]![c]! / M[c]![c]!; for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let acc = M[r]![n]!; for (let k = r + 1; k < n; k++) acc -= M[r]![k]! * x[k]!; x[r] = acc / M[r]![r]!; }
  return x;
}

function multilinear(samples: readonly LawSample[], feats: string[]): { params: Record<string, number>; r2: number } | null {
  const n = samples.length;
  const p = feats.length + 1;
  if (n <= p) return null;
  const X = samples.map((s) => [1, ...feats.map((f) => s.features[f] ?? 0)]);
  const y = samples.map((s) => s.target);
  const A: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const rhs = new Array<number>(p).fill(0);
  for (let i = 0; i < p; i++) { for (let j = 0; j < p; j++) { let acc = 0; for (let r = 0; r < n; r++) acc += X[r]![i]! * X[r]![j]!; A[i]![j] = acc; } let racc = 0; for (let r = 0; r < n; r++) racc += X[r]![i]! * y[r]!; rhs[i] = racc; }
  const w = solve(A, rhs);
  if (!w) return null;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (let r = 0; r < n; r++) { const pred = X[r]!.reduce((s, xv, i) => s + xv * w[i]!, 0); ssRes += (y[r]! - pred) ** 2; ssTot += (y[r]! - my) ** 2; }
  if (ssTot === 0) return null;
  const params: Record<string, number> = { intercept: w[0]! };
  feats.forEach((f, i) => (params[f] = w[i + 1]!));
  return { params, r2: Math.max(0, Math.min(1, 1 - ssRes / ssTot)) };
}

const FORM_COMPLEXITY: Record<LawForm, number> = { linear: 2, inverse: 2.5, log: 2.5, sqrt: 2.5, multilinear: 0 };

/**
 * Mine candidate symbolic laws for `targetName` from samples. Tries each 1-variable form per
 * feature plus a full multilinear fit; ranks by R² minus a complexity penalty (Occam). Returns
 * the candidates best-first — the law miner proposes; the tournament/prosecutors dispose.
 */
export function mineLaws(
  targetName: string,
  samples: readonly LawSample[],
  featureNames: readonly string[],
  options: { complexityWeight?: number } = {},
): CandidateLaw[] {
  const cw = options.complexityWeight ?? 0.05;
  const out: CandidateLaw[] = [];

  for (const f of featureNames) {
    for (const form of ["linear", "inverse", "log", "sqrt"] as const) {
      const pairs = samples
        .map((s) => ({ x: transform(form, s.features[f] ?? NaN), y: s.target }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      const fit = ols1(pairs.map((p) => p.x), pairs.map((p) => p.y));
      if (!fit) continue;
      const g = form === "linear" ? f : form === "inverse" ? `1/${f}` : `${form}(${f})`;
      const complexity = FORM_COMPLEXITY[form];
      out.push({
        target: targetName, form, feature: f,
        expression: `${targetName} ≈ ${fit.a.toFixed(3)} + ${fit.b.toFixed(3)}·${g}`,
        params: { a: fit.a, b: fit.b }, r2: fit.r2, complexity, score: fit.r2 - cw * complexity,
      });
    }
  }

  const ml = multilinear(samples, [...featureNames]);
  if (ml) {
    const complexity = featureNames.length + 1;
    const terms = featureNames.map((f) => `${ml.params[f]!.toFixed(3)}·${f}`).join(" + ");
    out.push({
      target: targetName, form: "multilinear", feature: null,
      expression: `${targetName} ≈ ${ml.params["intercept"]!.toFixed(3)} + ${terms}`,
      params: ml.params, r2: ml.r2, complexity, score: ml.r2 - cw * complexity,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}
