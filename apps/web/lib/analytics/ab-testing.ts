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
  return { variantId: normalized[normalized.length - 1].id, bucket };
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
  const lo = lifts[Math.floor(0.025 * samples)];
  const hi = lifts[Math.floor(0.975 * samples)];

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
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
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
    if (expected[i] === 0) continue;
    statistic += Math.pow(observed[i] - expected[i], 2) / expected[i];
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
  let ag = p[0];
  for (let i = 1; i < g + 2; i++) {
    ag += p[i] / (xm + i);
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
  let bestArm = arms[0];
  let bestRate = arms[0].trials > 0 ? arms[0].conversions / arms[0].trials : 0;

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
    return arms[Math.floor(Math.random() * arms.length)].id;
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

  let bestId = arms[0].id;
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
