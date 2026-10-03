
export interface EpProbitOptions {
  readonly damping?: number;
  readonly maxIter?: number;
  readonly tol?: number;
  readonly priorVar?: number;
}

export interface EpProbitResult {
  readonly mean: number[];
  readonly cov: number[][];
  readonly converged: boolean;
  readonly iters: number;
}

function erfApprox(x: number): number {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return s * y;
}
const phi = (z: number): number => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
const bigPhi = (z: number): number => 0.5 * (1 + erfApprox(z / Math.SQRT2));

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
}
function matVec(A: readonly (readonly number[])[], x: readonly number[]): number[] {
  return A.map((row) => dot(row, x));
}
function invert(A: readonly (readonly number[])[]): number[][] {
  const n = A.length;
  const m = A.map((row, i) => [...row.map((v) => v), ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    if (Math.abs(m[piv]![col]!) < 1e-12) throw new Error("ep-probit: singular precision");
    const tmp = m[col]!;
    m[col] = m[piv]!;
    m[piv] = tmp;
    const d = m[col]![col] ?? 1;
    for (let c = 0; c < 2 * n; c++) m[col]![c] = (m[col]![c] ?? 0) / d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col] ?? 0;
      for (let c = 0; c < 2 * n; c++) m[r]![c] = (m[r]![c] ?? 0) - f * (m[col]![c] ?? 0);
    }
  }
  return m.map((row) => row.slice(n));
}

/** EP for binary probit regression: site updates with damping, probit tilted moments. */
export function epProbitFit(X: readonly (readonly number[])[], y: readonly number[], opts: EpProbitOptions = {}): EpProbitResult {
  const n = X.length;
  const d = n === 0 ? 0 : (X[0]?.length ?? 0);
  if (n === 0 || d === 0) throw new Error("ep-probit: need non-empty X");
  if (y.length !== n) throw new Error("ep-probit: X/y length mismatch");
  const damping = opts.damping ?? 0.8;
  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-6;
  const priorVar = opts.priorVar ?? 1;

  const tauTilde = new Array<number>(n).fill(0);
  const nuTilde = new Array<number>(n).fill(0);
  let converged = false;
  let iters = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iters = iter + 1;
    // Posterior from sites: P = I/priorVar + sum tauTilde_i x_i x_i', h = sum nuTilde_i x_i
    const P: number[][] = Array.from({ length: d }, (_, r) =>
      Array.from({ length: d }, (_, c) => (r === c ? 1 / priorVar : 0)),
    );
    const h = new Array<number>(d).fill(0);
    for (let i = 0; i < n; i++) {
      const xi = X[i] ?? [];
      for (let r = 0; r < d; r++) {
        h[r] = (h[r] ?? 0) + (nuTilde[i] ?? 0) * (xi[r] ?? 0);
        for (let c = 0; c < d; c++) P[r]![c] = (P[r]![c] ?? 0) + (tauTilde[i] ?? 0) * (xi[r] ?? 0) * (xi[c] ?? 0);
      }
    }
    const Sigma = invert(P);
    const mu = matVec(Sigma, h);
    let maxChange = 0;

    for (let i = 0; i < n; i++) {
      const xi = X[i] ?? [];
      const yi = y[i] ?? 1;
      const scx = matVec(Sigma, xi);
      const v = dot(xi, scx);
      const tauTi = tauTilde[i] ?? 0;
      const nuTi = nuTilde[i] ?? 0;
      // Cavity via rank-1 downdate (falls back to full posterior when site is empty).
      let sigmaCav = Sigma;
      let muCav = mu;
      if (tauTi > 0) {
        const denom = 1 / tauTi - v;
        if (denom > 1e-12) {
          sigmaCav = Sigma.map((row, r) => row.map((sval, c) => sval + ((scx[r] ?? 0) * (scx[c] ?? 0)) / denom));
          const hCav = h.map((hval, r) => hval - nuTi * (xi[r] ?? 0));
          muCav = matVec(sigmaCav, hCav);
        }
      }
      const scxCav = matVec(sigmaCav, xi);
      const muCavXi = dot(muCav, xi);
      const vCav = Math.max(dot(xi, scxCav), 1e-12);
      const z = (yi * muCavXi) / Math.sqrt(1 + vCav);
      const alphaTilt = phi(z) / Math.max(bigPhi(z), 1e-12);
      const muHat = muCav.map((m, r) => m + ((yi * alphaTilt * (scxCav[r] ?? 0)) / Math.sqrt(1 + vCav)));
      const beta = (alphaTilt * (alphaTilt + z)) / (1 + vCav);
      const sigmaHat = sigmaCav.map((row, r) => row.map((sval, c) => sval - beta * (scxCav[r] ?? 0) * (scxCav[c] ?? 0)));
      const vHat = Math.max(dot(xi, matVec(sigmaHat, xi)), 1e-12);
      const muHatXi = dot(muHat, xi);
      const tauNew = Math.max(0, 1 / vHat - 1 / vCav);
      const nuNew = muHatXi / vHat - muCavXi / vCav;
      const tauUpd = damping * tauNew + (1 - damping) * tauTi;
      const nuUpd = damping * nuNew + (1 - damping) * nuTi;
      maxChange = Math.max(maxChange, Math.abs(tauUpd - tauTi), Math.abs(nuUpd - nuTi));
      tauTilde[i] = tauUpd;
      nuTilde[i] = nuUpd;
    }
    if (maxChange < tol) {
      converged = true;
      break;
    }
  }

  const P: number[][] = Array.from({ length: d }, (_, r) =>
    Array.from({ length: d }, (_, c) => (r === c ? 1 / priorVar : 0)),
  );
  const h = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i] ?? [];
    for (let r = 0; r < d; r++) {
      h[r] = (h[r] ?? 0) + (nuTilde[i] ?? 0) * (xi[r] ?? 0);
      for (let c = 0; c < d; c++) P[r]![c] = (P[r]![c] ?? 0) + (tauTilde[i] ?? 0) * (xi[r] ?? 0) * (xi[c] ?? 0);
    }
  }
  const cov = invert(P);
  return { mean: matVec(cov, h), cov, converged, iters };
}

/** Posterior predictive P(y=1|x) under the EP Gaussian via probit integral. */
export function epProbitPredict(mean: readonly number[], cov: readonly (readonly number[])[], x: readonly number[]): number {
  const m = dot(mean, x);
  const v = dot(x, matVec(cov, x));
  return bigPhi(m / Math.sqrt(1 + Math.max(v, 0)));
}
