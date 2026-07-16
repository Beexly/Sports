/**
 * The market-blend truth test (handoff §2 P1) — the falsifiable "do we
 * actually have edge" test: fit  Y ~ sigmoid(w0 + w1·logit(q) + w2·logit(p))
 * by maximum likelihood and read the Wald CI of w2 (β, the model's weight
 * ON TOP of the market). If the CI includes 0, the model adds nothing
 * beyond the market — FIRE NOTHING, SELL NOTHING. That verdict is a
 * first-class output, not an error state.
 *
 * Newton–Raphson MLE with standard errors from the observed information
 * matrix. Inputs must be OUT-OF-FOLD model probabilities and de-vigged
 * market probabilities — feeding in-sample fits here would make β
 * optimistically wrong, which is exactly the self-deception this test
 * exists to prevent.
 */

export interface LogitPoolResult {
  readonly beta: number;
  readonly se: number;
  readonly ci95: readonly [number, number];
  readonly includesZero: boolean;
  /** FIRE_NOTHING when β's CI includes 0 (or the fit failed). */
  readonly verdict: "FIRE_NOTHING" | "MODEL_ADDS_INFORMATION";
  readonly marketCoef: number;
  readonly intercept: number;
  readonly n: number;
  readonly converged: boolean;
}

const logit = (p: number): number => {
  const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(pc / (1 - pc));
};

const sigmoid = (z: number): number => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

/** Solve A x = b for small dense symmetric A (Gaussian elimination, partial pivot). */
function solve(aIn: number[][], bIn: number[]): number[] | null {
  const k = bIn.length;
  const a = aIn.map((row) => [...row]);
  const b = [...bIn];
  for (let col = 0; col < k; col++) {
    let piv = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[piv]![col]!)) piv = r;
    }
    if (Math.abs(a[piv]![col]!) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv]!, a[col]!];
    [b[col], b[piv]] = [b[piv]!, b[col]!];
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = a[r]![col]! / a[col]![col]!;
      for (let c = col; c < k; c++) a[r]![c]! -= f * a[col]![c]!;
      b[r]! -= f * b[col]!;
    }
  }
  return b.map((v, i) => v / a[i]![i]!);
}

/** Invert a small symmetric positive-definite matrix via solves against I. */
function invert(a: number[][]): number[][] | null {
  const k = a.length;
  const out: number[][] = [];
  for (let i = 0; i < k; i++) {
    const e = new Array(k).fill(0);
    e[i] = 1;
    const col = solve(a, e);
    if (!col) return null;
    out.push(col);
  }
  // out is column-major of the inverse; transpose (symmetric anyway).
  return out[0]!.map((_, i) => out.map((row) => row[i]!));
}

export function logitPoolTest(args: {
  readonly modelProbs: readonly number[]; // OUT-OF-FOLD p
  readonly marketProbs: readonly number[]; // de-vigged q
  readonly outcomes: readonly (0 | 1)[];
}): LogitPoolResult {
  const { modelProbs, marketProbs, outcomes } = args;
  const n = outcomes.length;
  if (modelProbs.length !== n || marketProbs.length !== n) {
    throw new RangeError("logitPoolTest: input lengths differ");
  }
  const fail = (converged: boolean): LogitPoolResult => ({
    beta: 0,
    se: Number.POSITIVE_INFINITY,
    ci95: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
    includesZero: true,
    verdict: "FIRE_NOTHING",
    marketCoef: 0,
    intercept: 0,
    n,
    converged,
  });
  if (n < 50) return fail(false);

  const X = Array.from({ length: n }, (_, i) => [1, logit(marketProbs[i]!), logit(modelProbs[i]!)]);
  let w = [0, 1, 0]; // start at "market is right, model adds nothing"
  let converged = false;
  for (let it = 0; it < 100; it++) {
    const grad = [0, 0, 0];
    const hess = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      const z = w[0]! * xi[0]! + w[1]! * xi[1]! + w[2]! * xi[2]!;
      const mu = sigmoid(z);
      const err = (outcomes[i]! as number) - mu;
      const wgt = Math.max(mu * (1 - mu), 1e-10);
      for (let a = 0; a < 3; a++) {
        grad[a]! += err * xi[a]!;
        for (let b = 0; b < 3; b++) hess[a]![b]! += wgt * xi[a]! * xi[b]!;
      }
    }
    const step = solve(hess, grad);
    if (!step) return fail(false);
    w = w.map((v, i) => v + step[i]!);
    const stepNorm = Math.sqrt(step.reduce((acc, s) => acc + s * s, 0));
    if (stepNorm < 1e-9) {
      converged = true;
      break;
    }
    if (!Number.isFinite(stepNorm) || stepNorm > 1e6) return fail(false);
  }
  if (!converged) return fail(false);

  // Observed information at the MLE for standard errors.
  const info = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < n; i++) {
    const xi = X[i]!;
    const z = w[0]! * xi[0]! + w[1]! * xi[1]! + w[2]! * xi[2]!;
    const mu = sigmoid(z);
    const wgt = Math.max(mu * (1 - mu), 1e-10);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) info[a]![b]! += wgt * xi[a]! * xi[b]!;
  }
  const cov = invert(info);
  if (!cov || !(cov[2]![2]! > 0)) return fail(true);

  const beta = w[2]!;
  const se = Math.sqrt(cov[2]![2]!);
  const ci95: [number, number] = [beta - 1.96 * se, beta + 1.96 * se];
  const includesZero = ci95[0] <= 0 && ci95[1] >= 0;
  return {
    beta,
    se,
    ci95,
    includesZero,
    verdict: includesZero ? "FIRE_NOTHING" : "MODEL_ADDS_INFORMATION",
    marketCoef: w[1]!,
    intercept: w[0]!,
    n,
    converged,
  };
}
