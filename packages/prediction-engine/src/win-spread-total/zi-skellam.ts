
/** Log-gamma via the Lanczos approximation (for the Bessel series). */
function lgamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  const z = x - 1;
  let a = c[0] ?? 0;
  for (let i = 1; i < 9; i++) a += (c[i] ?? 0) / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Modified Bessel function of the first kind, I_nu(x).
 * Log-space power series with log-sum-exp: robust for large x AND large nu,
 * where the leading large-x asymptotic exp(x)/sqrt(2 pi x) (nu-blind) fails.
 */
export function besselI(nu: number, x: number): number {
  if (x < 0) throw new Error("zi-skellam: x must be nonnegative");
  const n = Math.round(nu);
  if (n < 0) throw new Error("zi-skellam: nu must be nonnegative");
  if (x === 0) return n === 0 ? 1 : 0;
  const logHalf = Math.log(x / 2);
  let maxLog = -Infinity;
  const logTerms: number[] = [];
  for (let k = 0; k < 2000; k++) {
    const lt = (2 * k + n) * logHalf - lgamma(k + 1) - lgamma(k + n + 1);
    logTerms.push(lt);
    if (lt > maxLog) maxLog = lt;
    // Terms are unimodal in k; stop once far past the peak.
    if (k > n + 10 && lt < maxLog - 60) break;
  }
  const sum = logTerms.reduce((s, lt) => s + Math.exp(lt - maxLog), 0);
  return Math.exp(maxLog) * sum;
}

/** Skellam PMF parameterized by (mu, sigma^2): mu1 = (sigma2+mu)/2, mu2 = (sigma2-mu)/2. */
export function skellamPmf(k: number, mu: number, sigma2: number): number {
  const mu1 = (sigma2 + mu) / 2;
  const mu2 = (sigma2 - mu) / 2;
  if (!(mu1 > 0 && mu2 > 0)) throw new Error("zi-skellam: need sigma2 > |mu|");
  const kk = Math.round(k);
  return (
    Math.exp(-(mu1 + mu2)) *
    Math.pow(mu1 / mu2, kk / 2) *
    besselI(Math.abs(kk), 2 * Math.sqrt(mu1 * mu2))
  );
}

/**
 * ZI-Skellam2 PMF for the recentered margin Z' = Z - spread: excess mass p at 0
 * (the push), (1-p) on the Skellam otherwise.
 */
export function ziSkellamPmf(k: number, mu: number, sigma2: number, p: number): number {
  if (!(p >= 0 && p <= 1)) throw new Error("zi-skellam: p in [0,1] required");
  const kk = Math.round(k);
  const base = skellamPmf(kk, mu, sigma2);
  return kk === 0 ? p + (1 - p) * base : (1 - p) * base;
}

/** Push probability under the recentered model: P(Z' == 0). */
export function pushProbability(mu: number, sigma2: number, p: number): number {
  return ziSkellamPmf(0, mu, sigma2, p);
}

/** P(home covers spread s): P(Z' > 0) + 0.5 * P(push)? No — push is its own mass; cover = P(Z'>0). */
export function coverProbability(mu: number, sigma2: number, p: number, range = 12): number {
  let cover = 0;
  let total = 0;
  for (let k = -range; k <= range; k++) {
    const pk = ziSkellamPmf(k, mu, sigma2, p);
    total += pk;
    if (k > 0) cover += pk;
  }
  return total > 0 ? cover / total : 0;
}

/** AIC for the AIC>=10 model comparison in the gate. */
export function aic(logLik: number, nParams: number): number {
  return 2 * nParams - 2 * logLik;
}
