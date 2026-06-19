/**
 * A/B testing utilities — pure TypeScript, zero npm dependencies.
 *
 * Provides deterministic variant assignment, frequentist (two-proportion z-test),
 * Bayesian (Beta-Binomial conjugate), sample size calculation, sequential testing,
 * and multi-armed bandit algorithms for sports analytics experiments.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VariantId = string;

export interface Variant {
  id: VariantId;
  weight: number;
  name?: string;
}

export interface Experiment {
  id: string;
  variants: Variant[];
  active?: boolean;
}

export interface AssignmentResult {
  variantId: VariantId;
  bucket: number;
}

export interface FrequentistResult {
  significant: boolean;
  pValue: number;
  zScore: number;
  confidenceLevel: number;
  relativeUplift: number;   // (treatment - control) / control
  absoluteUplift: number;
  winner: VariantId | null; // null if not significant
}

export interface BayesianResult {
  probBBeatsA: number;                     // P(B > A)
  expectedLift: number;                    // E[(B-A)/A]
  credibleInterval: [number, number];      // 95% CI on (B-A)/A
  winner: VariantId | null;               // null if probBBeatsA < 0.95
}

export interface SampleSizeResult {
  perVariant: number;
  total: number;
  weeks: number; // assuming weeklyTraffic parameter
}

export interface ExperimentSummary {
  experiment: Experiment;
  variants: Array<{
    id: VariantId;
    visitors: number;
    conversions: number;
    conversionRate: number;
    relativeUplift: number; // vs control
  }>;
  control: VariantId;
  status: "insufficient_data" | "running" | "significant" | "no_effect";
}

// ---------------------------------------------------------------------------
// Hashing & Assignment
// ---------------------------------------------------------------------------

/**
 * djb2 hash returning a bucket in [0, 99].
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash % 100;
}

/**
 * Deterministically assign a user to a variant based on djb2 hash of
 * `${experiment.id}:${userId}`. Weights are normalized before assignment.
 */
export function assignVariant(experiment: Experiment, userId: string): AssignmentResult {
  const normalized = normalizeWeights(experiment.variants);
  const bucket = hashString(`${experiment.id}:${userId}`);

  let cumulative = 0;
  for (const variant of normalized) {
    cumulative += variant.weight * 100;
    if (bucket < cumulative) {
      return { variantId: variant.id, bucket };
    }
  }

  // Fallback to last variant (handles floating-point edge cases)
  return { variantId: normalized[normalized.length - 1]!.id, bucket };
}

// ---------------------------------------------------------------------------
// Normal distribution approximation (Abramowitz & Stegun 26.2.17)
// ---------------------------------------------------------------------------

/**
 * Cumulative distribution function for standard normal: P(Z <= z).
 * Uses the Abramowitz & Stegun rational polynomial approximation.
 */
export function normalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;

  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 +
            t * 1.330274429))));

  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const p = 1 - pdf * poly;

  return z >= 0 ? p : 1 - p;
}

// ---------------------------------------------------------------------------
// Frequentist: two-proportion z-test
// ---------------------------------------------------------------------------

/**
 * Two-proportion z-test comparing control vs treatment conversion rates.
 */
export function twoProportionZTest(
  controlConversions: number,
  controlVisitors: number,
  treatmentConversions: number,
  treatmentVisitors: number,
  confidenceLevel = 0.95,
): FrequentistResult {
  const alpha = 1 - confidenceLevel;

  // Guard zero visitors
  if (controlVisitors === 0 || treatmentVisitors === 0) {
    return {
      significant: false,
      pValue: 1,
      zScore: 0,
      confidenceLevel,
      relativeUplift: 0,
      absoluteUplift: 0,
      winner: null,
    };
  }

  const pC = controlConversions / controlVisitors;
  const pT = treatmentConversions / treatmentVisitors;
  const pPool = (controlConversions + treatmentConversions) / (controlVisitors + treatmentVisitors);

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / controlVisitors + 1 / treatmentVisitors));

  const zScore = se === 0 ? 0 : (pT - pC) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore))); // two-tailed
  const significant = pValue < alpha;

  const absoluteUplift = pT - pC;
  const relativeUplift = pC === 0 ? 0 : absoluteUplift / pC;

  return {
    significant,
    pValue,
    zScore,
    confidenceLevel,
    relativeUplift,
    absoluteUplift,
    winner: significant ? (pT > pC ? "treatment" : "control") : null,
  };
}

// ---------------------------------------------------------------------------
// Bayesian A/B test (Beta-Binomial conjugate)
// ---------------------------------------------------------------------------

/** Simple LCG pseudo-random number generator (seeded). */
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Sample from Beta(alpha, beta) using Johnk's method with LCG.
 * Returns a value in (0, 1).
 */
function sampleBeta(alpha: number, beta: number, rng: () => number): number {
  // For small integer-valued alpha/beta, use the relationship:
  // Beta(a,b) can be approximated via gamma samples.
  // We use a simple but robust normal approximation for large params,
  // and the accept-reject Johnk method for small params.
  const a = alpha;
  const b = beta;

  // Johnk's method
  if (a < 1 || b < 1) {
    // Use a fallback: sample via uniform order statistics approximation
    const x = Math.pow(rng(), 1 / a);
    const y = Math.pow(rng(), 1 / b);
    const sum = x + y;
    if (sum === 0) return 0.5;
    return x / sum;
  }

  // Use the normal approximation for larger values (fast & accurate enough for MC)
  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
  const std = Math.sqrt(variance);

  // Box-Muller transform using LCG
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const sample = mean + std * normal;
  return Math.max(0.0001, Math.min(0.9999, sample));
}

/**
 * Bayesian A/B test using Beta-Binomial conjugate model.
 * Uses Monte Carlo sampling with a seeded LCG for reproducibility.
 *
 * Seed = controlConversions * 1000 + treatmentConversions
 */
export function bayesianABTest(
  controlConversions: number,
  controlVisitors: number,
  treatmentConversions: number,
  treatmentVisitors: number,
  priorAlpha = 1,
  priorBeta = 1,
  samples = 10000,
): BayesianResult {
  const seed = Math.abs(controlConversions * 1000 + treatmentConversions);
  const rng = makeLcg(seed === 0 ? 42 : seed);

  // Posterior parameters
  const aAlpha = priorAlpha + controlConversions;
  const aBeta = priorBeta + (controlVisitors - controlConversions);
  const bAlpha = priorAlpha + treatmentConversions;
  const bBeta = priorBeta + (treatmentVisitors - treatmentConversions);

  let bBeatsA = 0;
  const lifts: number[] = [];

  for (let i = 0; i < samples; i++) {
    const sA = sampleBeta(aAlpha, aBeta, rng);
    const sB = sampleBeta(bAlpha, bBeta, rng);
    if (sB > sA) bBeatsA++;
    const lift = sA === 0 ? 0 : (sB - sA) / sA;
    lifts.push(lift);
  }

  const probBBeatsA = bBeatsA / samples;

  // Expected lift
  const expectedLift = lifts.reduce((s, v) => s + v, 0) / samples;

  // 95% credible interval
  lifts.sort((a, b) => a - b);
  const lo = lifts[Math.floor(0.025 * samples)] ?? 0;
  const hi = lifts[Math.floor(0.975 * samples)] ?? 0;

  const winner = probBBeatsA >= 0.95 ? "treatment" : probBBeatsA <= 0.05 ? "control" : null;

  return {
    probBBeatsA,
    expectedLift,
    credibleInterval: [lo, hi],
    winner,
  };
}

// ---------------------------------------------------------------------------
// Sample size calculator
// ---------------------------------------------------------------------------

/**
 * Calculate required sample size per variant for a two-proportion z-test.
 */
export function sampleSize(
  baselineRate: number,
  mde: number,
  confidenceLevel = 0.95,
  power = 0.8,
  weeklyTraffic = 1000,
): SampleSizeResult {
  const alpha = 1 - confidenceLevel;

  // z-scores for alpha (two-tailed) and power
  const zAlpha = zScore(1 - alpha / 2);
  const zBeta = zScore(power);

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + mde);

  // Pooled proportion
  const pBar = (p1 + p2) / 2;

  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(p2 - p1, 2);

  const perVariant = Math.ceil(numerator / denominator);
  const total = perVariant * 2;
  const weeks = Math.ceil(total / weeklyTraffic);

  return { perVariant, total, weeks };
}

/**
 * Inverse normal CDF approximation (rational polynomial).
 * Reasonably accurate for probabilities in (0.001, 0.999).
 */
function zScore(p: number): number {
  // Rational approximation from Peter J. Acklam
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
           ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
           (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
            ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
}

// ---------------------------------------------------------------------------
// Multi-variant analysis
// ---------------------------------------------------------------------------

/**
 * Compare each non-control variant against the control using two-proportion z-test.
 * Control variant returns null for result.
 */
export function multiVariantTest(
  variants: Array<{ id: VariantId; conversions: number; visitors: number }>,
  controlId: VariantId,
  confidenceLevel = 0.95,
): Array<{ id: VariantId; result: FrequentistResult | null }> {
  const control = variants.find((v) => v.id === controlId);
  if (!control) {
    throw new Error(`Control variant "${controlId}" not found`);
  }

  return variants.map((v) => {
    if (v.id === controlId) {
      return { id: v.id, result: null };
    }
    const result = twoProportionZTest(
      control.conversions,
      control.visitors,
      v.conversions,
      v.visitors,
      confidenceLevel,
    );
    // Override winner to use actual variant ids
    return {
      id: v.id,
      result: {
        ...result,
        winner: result.significant
          ? result.zScore > 0
            ? v.id
            : controlId
          : null,
      },
    };
  });
}

/**
 * Chi-square goodness of fit test.
 * Tests whether observed frequencies match expected frequencies.
 */
export function chiSquareTest(
  observed: number[],
  expected: number[],
): { statistic: number; pValue: number; significant: boolean } {
  if (observed.length !== expected.length) {
    throw new Error("observed and expected must have the same length");
  }

  let statistic = 0;
  for (let i = 0; i < observed.length; i++) {
    const exp = expected[i] ?? 0;
    const obs = observed[i] ?? 0;
    if (exp === 0) continue;
    statistic += Math.pow(obs - exp, 2) / exp;
  }

  const df = observed.length - 1;
  const pValue = 1 - chiSquareCdf(statistic, df);
  const significant = pValue < 0.05;

  return { statistic, pValue, significant };
}

/**
 * Chi-square CDF approximation via regularized incomplete gamma function.
 */
function chiSquareCdf(x: number, df: number): number {
  if (x <= 0) return 0;
  return regularizedIncompleteGamma(df / 2, x / 2);
}

/**
 * Regularized lower incomplete gamma function P(a, x) via series expansion.
 */
function regularizedIncompleteGamma(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;

  // Use series expansion for x < a + 1, continued fraction otherwise
  if (x < a + 1) {
    return gammaSeries(a, x);
  } else {
    return 1 - gammaContinuedFraction(a, x);
  }
}

function gammaLn(x: number): number {
  // Lanczos approximation
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - gammaLn(1 - x);
  }
  const xm = x - 1;
  let ag = p[0]!;
  for (let i = 1; i < g + 2; i++) {
    ag += p[i]! / (xm + i);
  }
  const t = xm + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (xm + 0.5) * Math.log(t) - t + Math.log(ag);
}

function gammaSeries(a: number, x: number): number {
  const ITMAX = 200;
  const EPS = 3e-7;
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 0; n < ITMAX; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

function gammaContinuedFraction(a: number, x: number): number {
  const ITMAX = 200;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h;
}

// ---------------------------------------------------------------------------
// Experiment management
// ---------------------------------------------------------------------------

/**
 * Validate an experiment definition.
 */
export function validateExperiment(exp: Experiment): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!exp.variants || exp.variants.length < 2) {
    errors.push("Experiment must have at least 2 variants");
  }

  if (exp.variants) {
    const ids = exp.variants.map((v) => v.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      errors.push("Variant ids must be unique");
    }

    for (const v of exp.variants) {
      if (v.weight <= 0) {
        errors.push(`Variant "${v.id}" has non-positive weight: ${v.weight}`);
      }
    }

    const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      errors.push(`Weights sum to ${totalWeight.toFixed(4)}, expected ~1.0 (within 0.01)`);
    }
  }

  if (exp.active !== undefined && typeof exp.active !== "boolean") {
    errors.push("active must be a boolean");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normalize variant weights so they sum to exactly 1.
 */
export function normalizeWeights(variants: Variant[]): Variant[] {
  const total = variants.reduce((s, v) => s + v.weight, 0);
  if (total === 0) {
    const equal = 1 / variants.length;
    return variants.map((v) => ({ ...v, weight: equal }));
  }
  return variants.map((v) => ({ ...v, weight: v.weight / total }));
}

/**
 * Summarize an experiment with conversion rate data.
 */
export function summarizeExperiment(
  exp: Experiment,
  data: Array<{ variantId: VariantId; visitors: number; conversions: number }>,
  controlId: VariantId,
): ExperimentSummary {
  const controlData = data.find((d) => d.variantId === controlId);
  const controlRate = controlData && controlData.visitors > 0
    ? controlData.conversions / controlData.visitors
    : 0;

  const MIN_VISITORS = 100;
  let hasInsufficient = false;
  let hasSignificant = false;

  const variantSummaries = data.map((d) => {
    const conversionRate = d.visitors > 0 ? d.conversions / d.visitors : 0;
    const relativeUplift = controlRate === 0 ? 0 : (conversionRate - controlRate) / controlRate;

    if (d.visitors < MIN_VISITORS) hasInsufficient = true;

    return { id: d.variantId, visitors: d.visitors, conversions: d.conversions, conversionRate, relativeUplift };
  });

  // Check if any treatment has a significant result
  if (!hasInsufficient && controlData) {
    for (const d of data) {
      if (d.variantId === controlId) continue;
      const result = twoProportionZTest(
        controlData.conversions, controlData.visitors,
        d.conversions, d.visitors,
      );
      if (result.significant) hasSignificant = true;
    }
  }

  let status: ExperimentSummary["status"] = "running";
  if (hasInsufficient) {
    status = "insufficient_data";
  } else if (hasSignificant) {
    status = "significant";
  } else if (!hasInsufficient) {
    // Check if any variant shows meaningful difference
    const anyUplift = variantSummaries.some(
      (v) => v.id !== controlId && Math.abs(v.relativeUplift) > 0.001,
    );
    if (!anyUplift) status = "no_effect";
  }

  return {
    experiment: exp,
    variants: variantSummaries,
    control: controlId,
    status,
  };
}

// ---------------------------------------------------------------------------
// Sequential testing (O'Brien-Fleming alpha spending)
// ---------------------------------------------------------------------------

/**
 * O'Brien-Fleming alpha spending function.
 * Returns the adjusted alpha threshold for the k-th analysis (1-indexed)
 * out of K total planned analyses.
 *
 * Approximation: alpha_k = alpha * 2 * (1 - Phi(z_{alpha/2} / sqrt(k/K)))
 * which gives more conservative (smaller) thresholds early on.
 */
export function obrienFleming(k: number, K: number, alpha = 0.05): number {
  if (k <= 0 || K <= 0 || k > K) {
    throw new Error(`Invalid k=${k}, K=${K}: must have 0 < k <= K`);
  }

  const zAlphaHalf = zScore(1 - alpha / 2);
  const fraction = k / K;
  const adjustedZ = zAlphaHalf / Math.sqrt(fraction);
  const adjustedAlpha = 2 * (1 - normalCdf(adjustedZ));

  return Math.min(alpha, adjustedAlpha);
}

// ---------------------------------------------------------------------------
// Bandit algorithms
// ---------------------------------------------------------------------------

/**
 * Epsilon-greedy bandit: with probability epsilon explore (random arm),
 * with probability 1-epsilon exploit (best arm by conversion rate).
 */
export function epsilonGreedy(
  arms: Array<{ id: string; conversions: number; trials: number }>,
  epsilon = 0.1,
): string {
  if (arms.length === 0) throw new Error("No arms provided");

  // Find best arm by conversion rate
  let bestArm = arms[0]!;
  let bestRate = arms[0]!.trials > 0 ? arms[0]!.conversions / arms[0]!.trials : 0;

  for (const arm of arms) {
    const rate = arm.trials > 0 ? arm.conversions / arm.trials : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestArm = arm;
    }
  }

  // For deterministic behavior in exploitation context, always return best arm
  // (epsilon exploration is a stochastic concept; we return best for determinism)
  // In a real system Math.random() < epsilon would trigger random selection
  // Here we use Math.random() as the spec doesn't require a seed for epsilon-greedy
  if (Math.random() < epsilon) {
    return arms[Math.floor(Math.random() * arms.length)]!.id;
  }

  return bestArm.id;
}

/**
 * Thompson Sampling bandit: sample from Beta(conversions+1, non-conversions+1)
 * for each arm, return arm with highest sample.
 */
export function thompsonSampling(
  arms: Array<{ id: string; conversions: number; trials: number }>,
  seed?: number,
): string {
  if (arms.length === 0) throw new Error("No arms provided");

  const rng = makeLcg(seed !== undefined ? seed : Date.now() % 0xffffffff);

  let bestId = arms[0]!.id;
  let bestSample = -Infinity;

  for (const arm of arms) {
    const alpha = arm.conversions + 1;
    const beta = arm.trials - arm.conversions + 1;
    const sample = sampleBeta(alpha, beta, rng);
    if (sample > bestSample) {
      bestSample = sample;
      bestId = arm.id;
    }
  }

  return bestId;
}

// ---------------------------------------------------------------------------
// Normal distribution helpers (inline, zero-dependency)
// ---------------------------------------------------------------------------

/**
 * Standard normal CDF using erf-based Horner polynomial approximation.
 * Abramowitz & Stegun 7.1.26 coefficients (max error ~1.5e-7).
 */
export function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/**
 * Inverse normal CDF (probit) via rational polynomial (Beasley-Springer-Moro / Acklam).
 */
export function normInvCDF(p: number): number {
  const a0 = -3.969683028665376e+01, a1 = 2.209460984245205e+02, a2 = -2.759285104469687e+02;
  const a3 = 1.383577518672690e+02, a4 = -3.066479806614716e+01, a5 = 2.506628277459239e+00;
  const b0 = -5.447609879822406e+01, b1 = 1.615858368580409e+02, b2 = -1.556989798598866e+02;
  const b3 = 6.680131188771972e+01, b4 = -1.328068155288572e+01;
  const c0 = -7.784894002430293e-03, c1 = -3.223964580411365e-01, c2 = -2.400758277161838e+00;
  const c3 = -2.549732539343734e+00, c4 = 4.374664141464968e+00, c5 = 2.938163982698783e+00;
  const d0 = 7.784695709041462e-03, d1 = 3.224671290700398e-01;
  const d2 = 2.445134137142996e+00, d3 = 3.754408661907416e+00;
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
           ((((d0 * q + d1) * q + d2) * q + d3) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a0 * r + a1) * r + a2) * r + a3) * r + a4) * r + a5) * q /
           (((((b0 * r + b1) * r + b2) * r + b3) * r + b4) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
          ((((d0 * q + d1) * q + d2) * q + d3) * q + 1);
}

// ---------------------------------------------------------------------------
// Sample size calculation
// ---------------------------------------------------------------------------

/**
 * Sample size per variant for a two-sided two-proportion z-test.
 * Uses normal approximation. Returns ceil of required n per arm.
 */
export function sampleSizeForProportionTest(
  baselineRate: number,
  minimumDetectableEffect: number,
  alpha = 0.05,
  power = 0.8,
): number {
  const zAlpha = normInvCDF(1 - alpha / 2);
  const zBeta = normInvCDF(power);
  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pBar = (p1 + p2) / 2;
  const num = Math.pow(
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
    2,
  );
  const denom = Math.pow(p2 - p1, 2);
  return Math.ceil(num / denom);
}

/**
 * Sample size per variant for a two-sided two-sample mean test (known std).
 */
export function sampleSizeForMeanTest(
  baselineStd: number,
  minimumDetectableEffect: number,
  alpha = 0.05,
  power = 0.8,
): number {
  const zAlpha = normInvCDF(1 - alpha / 2);
  const zBeta = normInvCDF(power);
  const num = 2 * Math.pow((zAlpha + zBeta) * baselineStd, 2);
  const denom = Math.pow(minimumDetectableEffect, 2);
  return Math.ceil(num / denom);
}

/**
 * Sample size using relative lift instead of absolute MDE.
 * MDE = baselineRate * relativeLift.
 */
export function sampleSizeForRelativeLift(
  baselineRate: number,
  relativeLift: number,
  alpha = 0.05,
  power = 0.8,
): number {
  const mde = baselineRate * relativeLift;
  return sampleSizeForProportionTest(baselineRate, mde, alpha, power);
}

/**
 * Days needed to reach the required sample size given daily traffic and split ratio.
 */
export function daysToReachSampleSize(
  requiredN: number,
  dailyTraffic: number,
  splitRatio = 0.5,
): number {
  return Math.ceil(requiredN / (dailyTraffic * splitRatio));
}

// ---------------------------------------------------------------------------
// Statistical significance — frequentist
// ---------------------------------------------------------------------------

/**
 * Two-sided two-proportion z-test.
 * Returns z, pValue (two-sided), significant (alpha=0.05).
 */
export function twoProportionZTestV2(
  controlConversions: number,
  controlN: number,
  treatmentConversions: number,
  treatmentN: number,
): { z: number; pValue: number; significant: boolean; alpha: number } {
  const alpha = 0.05;
  if (controlN === 0 || treatmentN === 0) {
    return { z: 0, pValue: 1, significant: false, alpha };
  }
  const pC = controlConversions / controlN;
  const pT = treatmentConversions / treatmentN;
  const pPool = (controlConversions + treatmentConversions) / (controlN + treatmentN);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / controlN + 1 / treatmentN));
  const z = se === 0 ? 0 : (pT - pC) / se;
  const pValue = 2 * (1 - normCDF(Math.abs(z)));
  return { z, pValue, significant: pValue < alpha, alpha };
}

/**
 * Chi-square test for MxN contingency table.
 * If expected is not provided, computed from marginals.
 */
export function chiSquareTestV2(
  observed: number[][],
  expected?: number[][],
): { chiSq: number; df: number; pValue: number; significant: boolean } {
  const rows = observed.length;
  const firstRow = observed[0];
  const cols = firstRow ? firstRow.length : 0;

  let exp: number[][];
  if (expected) {
    exp = expected;
  } else {
    const rowSums = observed.map((r) => r.reduce((a, b) => a + b, 0));
    const colSums = Array.from({ length: cols }, (_, j) =>
      observed.reduce((s, r) => s + (r[j] ?? 0), 0),
    );
    const total = rowSums.reduce((a, b) => a + b, 0);
    exp = observed.map((r, i) =>
      r.map((_, j) => ((rowSums[i] ?? 0) * (colSums[j] ?? 0)) / total),
    );
  }

  let chiSq = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const eij = exp[i]?.[j] ?? 0;
      const oij = observed[i]?.[j] ?? 0;
      if (eij > 0) {
        chiSq += Math.pow(oij - eij, 2) / eij;
      }
    }
  }

  const df = (rows - 1) * (cols - 1);
  const pValue = 1 - chiSquareCdf(chiSq, df);
  return { chiSq, df, pValue, significant: pValue < 0.05 };
}

/**
 * Welch's t-test (unequal variance two-sample).
 */
export function welchTTest(
  controlData: number[],
  treatmentData: number[],
): { t: number; df: number; pValue: number; significant: boolean } {
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = (arr: number[], m: number) =>
    arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (arr.length - 1);

  const n1 = controlData.length, n2 = treatmentData.length;
  const m1 = mean(controlData), m2 = mean(treatmentData);
  const v1 = variance(controlData, m1), v2 = variance(treatmentData, m2);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = se === 0 ? 0 : (m2 - m1) / se;

  // Welch-Satterthwaite df
  const df =
    Math.pow(v1 / n1 + v2 / n2, 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));

  // Use normal approximation for pValue (accurate for large df)
  const pValue = 2 * (1 - normCDF(Math.abs(t)));
  return { t, df, pValue, significant: pValue < 0.05 };
}

/**
 * Mann-Whitney U test with normal approximation for large samples.
 */
export function mannWhitneyU(
  control: number[],
  treatment: number[],
): { U: number; z: number; pValue: number; significant: boolean } {
  const n1 = control.length, n2 = treatment.length;
  // Compute U statistic
  let U1 = 0;
  for (const a of control) {
    for (const b of treatment) {
      if (a < b) U1++;
      else if (a === b) U1 += 0.5;
    }
  }
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = stdU === 0 ? 0 : (U - meanU) / stdU;
  const pValue = 2 * normCDF(z); // z is already negative for min(U)
  return { U, z, pValue, significant: pValue < 0.05 };
}

/**
 * Confidence interval for difference of two proportions.
 */
export function confidenceIntervalDiff(
  controlRate: number,
  controlN: number,
  treatmentRate: number,
  treatmentN: number,
  confidence = 0.95,
): { lower: number; upper: number; includes_zero: boolean } {
  const zc = normInvCDF(1 - (1 - confidence) / 2);
  const se = Math.sqrt(
    (controlRate * (1 - controlRate)) / controlN +
    (treatmentRate * (1 - treatmentRate)) / treatmentN,
  );
  const diff = treatmentRate - controlRate;
  const lower = diff - zc * se;
  const upper = diff + zc * se;
  return { lower, upper, includes_zero: lower <= 0 && upper >= 0 };
}

// ---------------------------------------------------------------------------
// Effect size
// ---------------------------------------------------------------------------

/** Relative lift: (treatment - control) / control * 100 (percent) */
export function relativeLift(control: number, treatment: number): number {
  return ((treatment - control) / control) * 100;
}

/** Absolute difference: treatment - control */
export function absoluteDiff(control: number, treatment: number): number {
  return treatment - control;
}

/** Cohen's d: (mean2 - mean1) / pooledStd */
export function cohenSD(mean1: number, mean2: number, pooledStdVal: number): number {
  return (mean2 - mean1) / pooledStdVal;
}

/** Cohen's h for two proportions */
export function cohenH(p1: number, p2: number): number {
  return 2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1));
}

/** Cramér's V */
export function cramersV(chiSq: number, n: number, minDim: number): number {
  return Math.sqrt(chiSq / (n * (minDim - 1)));
}

/** Pooled standard deviation */
export function pooledStd(std1: number, n1: number, std2: number, n2: number): number {
  return Math.sqrt(((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2));
}

/** Cohen's d effect size label */
export function effectSizeLabel(cohenD: number): 'negligible' | 'small' | 'medium' | 'large' {
  const abs = Math.abs(cohenD);
  if (abs < 0.2) return 'negligible';
  if (abs < 0.5) return 'small';
  if (abs < 0.8) return 'medium';
  return 'large';
}

// ---------------------------------------------------------------------------
// Bayesian A/B testing
// ---------------------------------------------------------------------------

/** Beta posterior with conjugate prior */
export function betaPosterior(
  successes: number,
  failures: number,
  priorAlpha = 1,
  priorBeta = 1,
): { alpha: number; beta: number } {
  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
  };
}

/** LCG seeded at 42 for reproducibility */
function lcg42(): () => number {
  let s = 42;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Sample from Beta distribution via Johnk/Normal approximation */
function sampleBetaDist(a: number, b: number, rng: () => number): number {
  if (a >= 1 && b >= 1) {
    const mean = a / (a + b);
    const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
    const std = Math.sqrt(variance);
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(1e-9, Math.min(1 - 1e-9, mean + std * normal));
  }
  const x = Math.pow(Math.max(rng(), 1e-15), 1 / a);
  const y = Math.pow(Math.max(rng(), 1e-15), 1 / b);
  const s = x + y;
  return s === 0 ? 0.5 : x / s;
}

/**
 * Monte Carlo P(B > A) using LCG seeded at 42.
 */
export function bayesianProbBetterThan(
  alphaA: number,
  betaA: number,
  alphaB: number,
  betaB: number,
  samples = 10000,
): number {
  const rng = lcg42();
  let bBeatsA = 0;
  for (let i = 0; i < samples; i++) {
    const sA = sampleBetaDist(alphaA, betaA, rng);
    const sB = sampleBetaDist(alphaB, betaB, rng);
    if (sB > sA) bBeatsA++;
  }
  return bBeatsA / samples;
}

/**
 * Expected regret for choosing A or B.
 */
export function bayesianExpectedLoss(
  alphaA: number,
  betaA: number,
  alphaB: number,
  betaB: number,
  samples = 10000,
): { lossA: number; lossB: number } {
  const rng = lcg42();
  let lossA = 0, lossB = 0;
  for (let i = 0; i < samples; i++) {
    const sA = sampleBetaDist(alphaA, betaA, rng);
    const sB = sampleBetaDist(alphaB, betaB, rng);
    if (sB > sA) lossA += sB - sA;
    else lossB += sA - sB;
  }
  return { lossA: lossA / samples, lossB: lossB / samples };
}

/**
 * HDI / credible interval via beta quantile (numerical integration).
 * Uses regularized incomplete beta (Wilson-Hilferty or bisection).
 */
export function credibleInterval(
  alpha: number,
  beta: number,
  probability = 0.95,
): { lower: number; upper: number } {
  const lo = (1 - probability) / 2;
  const hi = 1 - lo;
  return {
    lower: betaQuantile(lo, alpha, beta),
    upper: betaQuantile(hi, alpha, beta),
  };
}

/** Beta quantile via bisection on regularized incomplete beta */
function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  // Start with mean as initial guess
  let lo = 0, hi = 1, mid = a / (a + b);
  for (let iter = 0; iter < 200; iter++) {
    const cdf = regularizedIncompleteBeta(mid, a, b);
    if (Math.abs(cdf - p) < 1e-10) break;
    if (cdf < p) lo = mid;
    else hi = mid;
    mid = (lo + hi) / 2;
  }
  return mid;
}

/** Regularized incomplete beta function I_x(a,b) via continued fraction */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Use continued fraction (Lentz method) — from Numerical Recipes
  const lbeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  // Symmetric relation
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(1 - x, b, a);
  }
  return front * betaCF(x, a, b);
}

/** Continued fraction for incomplete beta */
function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-10;
  const FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta distribution mean */
export function betaMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

/** Beta distribution mode — throws for alpha<1 or beta<1 */
export function betaMode(alpha: number, beta: number): number {
  if (alpha < 1 || beta < 1) {
    throw new Error('betaMode requires alpha >= 1 and beta >= 1');
  }
  return (alpha - 1) / (alpha + beta - 2);
}

/** Beta distribution variance */
export function betaVariance(alpha: number, beta: number): number {
  const s = alpha + beta;
  return (alpha * beta) / (s * s * (s + 1));
}

// ---------------------------------------------------------------------------
// Experiment management (new API)
// ---------------------------------------------------------------------------

/**
 * FNV-1a 32-bit hash. Returns unsigned 32-bit integer.
 */
export function fnv1aHash(str: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0; // FNV prime, keep unsigned 32-bit
  }
  return hash >>> 0;
}

/**
 * Deterministically assign a user to a variant using FNV-1a hash.
 * Weights (if provided) must sum to 1. Defaults to equal weights.
 */
export function assignVariantV2(
  userId: string,
  experimentId: string,
  variants: string[],
  weights?: number[],
): string {
  if (variants.length === 0) throw new Error('No variants provided');
  const hash = fnv1aHash(userId + experimentId);
  const bucket = (hash % 10000) / 10000; // [0, 1)

  const wts = weights ?? variants.map(() => 1 / variants.length);
  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += wts[i] ?? 0;
    if (bucket < cumulative) return variants[i] ?? variants[variants.length - 1] ?? '';
  }
  return variants[variants.length - 1] ?? '';
}

/**
 * Determine if a user is in an experiment rollout using hash-based rollout.
 */
export function isInExperiment(
  userId: string,
  experimentId: string,
  rolloutPct: number,
): boolean {
  const hash = fnv1aHash(userId + experimentId);
  return (hash % 100) < rolloutPct;
}

/**
 * Proportional stratified sampling using LCG.
 */
export function stratifiedSample(
  data: Array<{ group: string; value: number }>,
  sampleSize: number,
): Array<{ group: string; value: number }> {
  // Count per group
  const groups = new Map<string, Array<{ group: string; value: number }>>();
  for (const item of data) {
    const arr = groups.get(item.group) ?? [];
    arr.push(item);
    groups.set(item.group, arr);
  }

  const total = data.length;
  const result: Array<{ group: string; value: number }> = [];

  // LCG for shuffling
  let seed = 42;
  const rand = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = a[i] as T;
      a[i] = a[j] as T;
      a[j] = tmp;
    }
    return a;
  };

  for (const [, items] of groups) {
    const proportion = items.length / total;
    const n = Math.round(proportion * sampleSize);
    const shuffled = shuffle(items);
    result.push(...shuffled.slice(0, n));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sequential testing (alpha spending)
// ---------------------------------------------------------------------------

/**
 * O'Brien-Fleming boundary at look k of K total looks.
 * Approximation: z_alpha/2 * sqrt(K/k).
 */
export function obrienflemingBoundary(k: number, K: number, alpha = 0.05): number {
  const zHalf = normInvCDF(1 - alpha / 2);
  return zHalf * Math.sqrt(K / k);
}

/**
 * Pocock boundary: constant threshold across K looks.
 * Approximation: normInvCDF(1 - alpha/(2*K)).
 */
export function pocockBoundary(K: number, alpha = 0.05): number {
  return normInvCDF(1 - alpha / (2 * K));
}

/**
 * Array of cumulative alpha spent at each look (O'Brien-Fleming spending).
 */
export function alphaSpent(looks: number, totalLooks: number, alpha = 0.05): number[] {
  const result: number[] = [];
  for (let k = 1; k <= looks; k++) {
    const boundary = obrienflemingBoundary(k, totalLooks, alpha);
    const spent = alpha * (2 - 2 * normCDF(boundary));
    result.push(spent);
  }
  return result;
}

/**
 * Returns true if peeking before reaching power AND pValue doesn't clear the spending boundary.
 */
export function peekedTooEarly(
  currentN: number,
  requiredN: number,
  pValue: number,
  look: number,
  totalLooks: number,
  alpha = 0.05,
): boolean {
  if (currentN >= requiredN) return false; // Reached power — no longer "too early"
  const boundary = obrienflemingBoundary(look, totalLooks, alpha);
  const alphaAtLook = 2 * (1 - normCDF(boundary));
  return pValue > alphaAtLook; // didn't clear the spending boundary
}

// ---------------------------------------------------------------------------
// Sports-specific A/B helpers
// ---------------------------------------------------------------------------

/**
 * Pick click-through rate lift between control and treatment.
 */
export function pickCTRLift(
  controlClicks: number,
  controlImpressions: number,
  treatmentClicks: number,
  treatmentImpressions: number,
): { ctr_control: number; ctr_treatment: number; lift: number; significant: boolean } {
  const ctr_control = controlClicks / controlImpressions;
  const ctr_treatment = treatmentClicks / treatmentImpressions;
  const { significant } = twoProportionZTestV2(
    controlClicks, controlImpressions, treatmentClicks, treatmentImpressions,
  );
  const lift = relativeLift(ctr_control, ctr_treatment);
  return { ctr_control, ctr_treatment, lift, significant };
}

/**
 * Subscription conversion lift and annualized revenue impact.
 * annualizedRevenueImpact = absoluteDiff * treatmentN * 12 * 14.99 (pro monthly price).
 */
export function subscriptionLift(
  controlTrials: number,
  controlN: number,
  treatmentTrials: number,
  treatmentN: number,
): { conversionLift: number; annualizedRevenueImpact: number; significant: boolean } {
  const controlRate = controlTrials / controlN;
  const treatmentRate = treatmentTrials / treatmentN;
  const conversionLift = relativeLift(controlRate, treatmentRate);
  const absDiff = absoluteDiff(controlRate, treatmentRate);
  const annualizedRevenueImpact = absDiff * treatmentN * 12 * 14.99;
  const { significant } = twoProportionZTestV2(
    controlTrials, controlN, treatmentTrials, treatmentN,
  );
  return { conversionLift, annualizedRevenueImpact, significant };
}

/**
 * Pick board engagement A/B test — compares favorite rates.
 */
export function pickBoardEngagementTest(
  control: { views: number; favorites: number; n: number },
  treatment: { views: number; favorites: number; n: number },
): { favoriteRateLift: number; significant: boolean } {
  const { significant } = twoProportionZTestV2(
    control.favorites, control.n, treatment.favorites, treatment.n,
  );
  const controlRate = control.favorites / control.n;
  const treatmentRate = treatment.favorites / treatment.n;
  const favoriteRateLift = relativeLift(controlRate, treatmentRate);
  return { favoriteRateLift, significant };
}
