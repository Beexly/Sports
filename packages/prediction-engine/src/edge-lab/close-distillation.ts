/**
 * CLV-native closing-line distillation (handoff §2 Phase 3, second edge
 * source): train AS-OF decision-time features to predict the DE-VIGGED
 * CLOSE — not the box score. Distilling a Var≈0.04 target instead of a
 * Var≈0.25 Bernoulli is ~10x more sample-efficient and t-detectable in
 * ~50 plays; all edge is the pre-close residual.
 *
 * HONEST DATA BOUNDARY (recorded in BUILD_LOG): the historical corpus
 * carries closing lines only (nflverse, licensed) — no decision-time
 * prices until the line archive accumulates. So this module ships the
 * distiller + its walk-forward quality report (close predicted from
 * as-of features vs a train-mean baseline), and the "select on
 * predicted-favorable move" consumer is built INERT: `predictedMoveEdge`
 * needs a real decision-time price and simply cannot run without one.
 *
 * Model: closed-form ridge regression on logit(q_close) — deterministic,
 * exactly reproducible, honest about its capacity. Feature keys matching
 * closing-line patterns are refused (the target must never be a feature).
 */

export interface CloseRow {
  readonly features: ReadonlyMap<string, number>;
  /** De-vigged closing probability of the modeled side, in (0,1). */
  readonly qClose: number;
}

export interface CloseDistiller {
  readonly predict: (features: ReadonlyMap<string, number>) => number; // predicted q_close
  readonly coefficients: ReadonlyMap<string, number>;
  readonly intercept: number;
}

const logit = (p: number): number => {
  const pc = Math.min(1 - 1e-6, Math.max(1e-6, p));
  return Math.log(pc / (1 - pc));
};
const sigmoid = (z: number): number => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

const CLOSING_KEY_PATTERN = /clos|final_line|settle/i;

/** Solve the (k+1)x(k+1) ridge normal equations by Gaussian elimination. */
function solveSym(a: number[][], b: number[]): number[] | null {
  const k = b.length;
  const m = a.map((r) => [...r]);
  const v = [...b];
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[piv]![c]!)) piv = r;
    if (Math.abs(m[piv]![c]!) < 1e-12) return null;
    [m[c], m[piv]] = [m[piv]!, m[c]!];
    [v[c], v[piv]] = [v[piv]!, v[c]!];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = m[r]![c]! / m[c]![c]!;
      for (let cc = c; cc < k; cc++) m[r]![cc]! -= f * m[c]![cc]!;
      v[r]! -= f * v[c]!;
    }
  }
  return v.map((x, i) => x / m[i]![i]!);
}

export function trainCloseDistiller(
  rows: readonly CloseRow[],
  opts: { readonly featureKeys: readonly string[]; readonly lambda?: number },
): CloseDistiller | null {
  const lambda = opts.lambda ?? 1e-2;
  const keys = [...opts.featureKeys];
  for (const k of keys) {
    if (CLOSING_KEY_PATTERN.test(k)) {
      throw new RangeError(`feature key "${k}" matches the closing-line pattern — the target must never be a feature`);
    }
  }
  const n = rows.length;
  if (n < keys.length * 10 + 10) return null; // refuse under-determined fits

  // Standardize on the training rows (mean-impute missing).
  const mean = keys.map((k) => {
    let s = 0;
    let c = 0;
    for (const r of rows) {
      const v = r.features.get(k);
      if (v !== undefined && Number.isFinite(v)) {
        s += v;
        c += 1;
      }
    }
    return c > 0 ? s / c : 0;
  });
  const sd = keys.map((k, j) => {
    let s = 0;
    let c = 0;
    for (const r of rows) {
      const v = r.features.get(k);
      if (v !== undefined && Number.isFinite(v)) {
        s += (v - mean[j]!) ** 2;
        c += 1;
      }
    }
    const out = c > 1 ? Math.sqrt(s / (c - 1)) : 1;
    return out > 1e-12 ? out : 1;
  });
  const enc = (features: ReadonlyMap<string, number>): number[] =>
    keys.map((k, j) => {
      const v = features.get(k);
      return v === undefined || !Number.isFinite(v) ? 0 : (v - mean[j]!) / sd[j]!;
    });

  // Ridge normal equations on [1, x] -> logit(q). Intercept unpenalized.
  const dim = keys.length + 1;
  const xtx = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  const xty = new Array<number>(dim).fill(0);
  for (const r of rows) {
    const x = [1, ...enc(r.features)];
    const t = logit(r.qClose);
    for (let a = 0; a < dim; a++) {
      xty[a]! += x[a]! * t;
      for (let b = 0; b < dim; b++) xtx[a]![b]! += x[a]! * x[b]!;
    }
  }
  for (let j = 1; j < dim; j++) xtx[j]![j]! += lambda * n;
  const w = solveSym(xtx, xty);
  if (!w) return null;

  const coefficients = new Map(keys.map((k, j) => [k, w[j + 1]!]));
  return {
    predict: (features) => {
      const x = enc(features);
      let z = w[0]!;
      for (let j = 0; j < keys.length; j++) z += x[j]! * w[j + 1]!;
      return sigmoid(z);
    },
    coefficients,
    intercept: w[0]!,
  };
}

export interface DistillationFoldScore {
  readonly fold: number;
  readonly n: number;
  readonly maeModel: number;
  readonly maeBaseline: number; // train-mean-of-logit baseline
  readonly r2VsBaseline: number; // 1 - SSE_model/SSE_baseline (in probability space)
}

/** Score a fitted distiller on held-out rows against the train-mean baseline. */
export function scoreDistillation(
  distiller: CloseDistiller,
  trainRows: readonly CloseRow[],
  testRows: readonly CloseRow[],
  fold: number,
): DistillationFoldScore {
  const baseQ = sigmoid(trainRows.reduce((a, r) => a + logit(r.qClose), 0) / Math.max(1, trainRows.length));
  let aeM = 0;
  let aeB = 0;
  let sseM = 0;
  let sseB = 0;
  for (const r of testRows) {
    const pred = distiller.predict(r.features);
    aeM += Math.abs(pred - r.qClose);
    aeB += Math.abs(baseQ - r.qClose);
    sseM += (pred - r.qClose) ** 2;
    sseB += (baseQ - r.qClose) ** 2;
  }
  const n = Math.max(1, testRows.length);
  return {
    fold,
    n: testRows.length,
    maeModel: aeM / n,
    maeBaseline: aeB / n,
    r2VsBaseline: sseB > 0 ? 1 - sseM / sseB : 0,
  };
}

/**
 * The CLV-selection consumer — INERT BY CONSTRUCTION. Firing on predicted
 * close movement requires a real decision-time price from the line
 * archive; without one there is nothing to compare against and this
 * throws rather than inventing a baseline (handoff §1: no fabricated
 * inputs, the edge IS the pre-close residual).
 */
export function predictedMoveEdge(args: {
  readonly predictedClose: number;
  readonly decisionPrice: number | null;
}): number {
  if (args.decisionPrice === null || !Number.isFinite(args.decisionPrice)) {
    throw new RangeError(
      "predictedMoveEdge requires a real decision-time price (line archive). " +
        "It must never run against a fabricated or assumed price.",
    );
  }
  if (!(args.decisionPrice > 1)) throw new RangeError("decisionPrice must be decimal odds > 1");
  const qDecision = 1 / args.decisionPrice;
  return args.predictedClose - qDecision; // >0: the close should move toward us
}
