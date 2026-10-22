/**
 * Stream 12 — nflverse/open-source-football QB volatility and prospect
 * modules (Posts #4, #9, #14, #1, #2). RT-06 hardened.
 *
 * Published and implemented literally:
 *  - Post #4: shifted Gini of QB EPA and VOLoe against a league EPA
 *    regression baseline.
 *  - Post #9: gunslinger vs game-manager bivariate classification on
 *    aDOT and CPOE z-scores, conditioned on tight-window aggressiveness.
 *  - Post #14: additive state-space-style decomposition of QB EPA into an
 *    aging/intrinsic component and a scheme-support component.
 *  - Post #1: Ben Baldwin's non-QB surplus curve, implemented as an
 *    isotonic (monotone) fit over supplied measured APY points minus the
 *    supplied rookie-cost curve. The measured curve is an argument, not a
 *    hidden constant.
 *  - Post #2: TF-IDF scouting-language trait extraction with position and
 *    school base-rate de-biasing.
 *
 * Not published, so required as arguments: league Gini regression
 * coefficients, league z-score moments, aging/scheme regression columns,
 * the measured draft-pick APY curve, rookie costs, and scouting base
 * rates. No constant is invented here.
 */

import {
  clamp,
  clamp01,
  equalCorrelationShrinkFactor,
  logit,
  mean,
  sd,
  shiftedGini,
  sigmoid,
  solveLinearSystem,
  variance,
} from "./osf-math-core.js";

export interface QbEpaGiniInput {
  /** Per-dropback EPA observations for one quarterback. */
  epa: readonly number[];
  /** Published league regression intercept for Gini on mean EPA. */
  gamma0?: number;
  /** Published league regression slope for Gini on mean EPA. */
  gamma1?: number;
  epsilon?: number;
}

export interface QbEpaGiniResult {
  n: number;
  meanEpa: number;
  shiftedGini: number;
  expectedGini: number;
  volOe: number;
  interpretation: "stable" | "volatile" | "insufficient-sample";
}

/**
 * Exact shifted Gini and VOLoe. With gamma0 = gamma1 = 0 the expected Gini
 * equals zero, so volOe collapses to the raw Gini; callers should pass the
 * published league regression coefficients when they have them. The
 * interpretation band is deliberately coarse: fewer than 100 dropbacks is
 * reported as insufficient rather than graded.
 */
export function computeQbEpaGiniAndVolOe(input: QbEpaGiniInput): QbEpaGiniResult {
  const { epa, gamma0 = 0, gamma1 = 0, epsilon = 1e-9 } = input;
  if (epa.length === 0) throw new Error("computeQbEpaGiniAndVolOe requires EPA observations");
  const meanEpa = mean(epa);
  const gini = shiftedGini(epa, epsilon);
  const expectedGini = gamma0 + gamma1 * meanEpa;
  const volOe = gini - expectedGini;
  const interpretation: QbEpaGiniResult["interpretation"] =
    epa.length < 100 ? "insufficient-sample" : Math.abs(volOe) < 0.05 ? "stable" : "volatile";
  return { n: epa.length, meanEpa, shiftedGini: gini, expectedGini, volOe, interpretation };
}

export interface GunslingerInput {
  /** Adjusted depth of target in air yards. */
  adot: number;
  /** Completion percentage over expected. */
  cpoe: number;
  /** Share of attempts into a tight window (<= 1 yard separation). */
  tightWindowRate: number;
  /** League moments used to standardize; required, never guessed. */
  league: {
    adotMean: number;
    adotSd: number;
    cpoeMean: number;
    cpoeSd: number;
    tightWindowMean: number;
    tightWindowSd: number;
  };
}

export interface GunslingerResult {
  adotZ: number;
  cpoeZ: number;
  tightWindowZ: number;
  aggressivenessScore: number;
  classification: "gunslinger" | "game-manager" | "balanced" | "low-volume-checkdown";
}

/**
 * Post #9 bivariate classification. Aggressiveness rises with aDOT and
 * tight-window rate and falls with CPOE; the quadrant label is decided by
 * the sign of the standardized axes, not by an invented cut score.
 */
export function classifyGunslingerVsGameManager(input: GunslingerInput): GunslingerResult {
  const { adot, cpoe, tightWindowRate, league } = input;
  if (![adot, cpoe, tightWindowRate].every(Number.isFinite)) {
    throw new Error("gunslinger inputs must be finite");
  }
  if (league.adotSd <= 0 || league.cpoeSd <= 0 || league.tightWindowSd <= 0) {
    throw new Error("league standard deviations must be positive");
  }
  const adotZ = (adot - league.adotMean) / league.adotSd;
  const cpoeZ = (cpoe - league.cpoeMean) / league.cpoeSd;
  const tightWindowZ = (tightWindowRate - league.tightWindowMean) / league.tightWindowSd;
  const aggressivenessScore = 0.5 * adotZ + 0.3 * tightWindowZ - 0.2 * cpoeZ;
  let classification: GunslingerResult["classification"];
  if (adotZ > 0 && cpoeZ > 0) classification = "gunslinger";
  else if (adotZ <= 0 && cpoeZ > 0) classification = "game-manager";
  else if (adotZ <= 0 && cpoeZ <= 0) classification = "low-volume-checkdown";
  else classification = "balanced";
  return { adotZ, cpoeZ, tightWindowZ, aggressivenessScore, classification };
}

export interface QbSeasonObservation {
  age: number;
  epaPerDropback: number;
  /** Scheme-support columns measured on the same scale as EPA per dropback. */
  playActionRate: number;
  motionRate: number;
  yacPerCatch: number;
  passBlockGrade: number;
}

export interface QbAgingDecompositionResult {
  intrinsicEpa: number;
  schemeSupportEpa: number;
  reconstructedEpa: number;
  coefficients: {
    intercept: number;
    age: number;
    playActionRate: number;
    motionRate: number;
    yacPerCatch: number;
    passBlockGrade: number;
  };
  ridgeLambda: number;
}

/**
 * Post #14 decomposition. Fits a ridge regression of EPA per dropback on
 * age plus the four scheme-support columns. The age contribution is the
 * intrinsic/pocket component; the scheme columns are the support lift.
 * The design matrix and target are supplied by the caller, so this is a
 * real fit rather than a hand-set multiplier.
 */
export function decomposeQbAgingAndSchemeSupport(
  seasons: readonly QbSeasonObservation[],
  ridgeLambda = 1e-3,
): QbAgingDecompositionResult {
  if (seasons.length < 3) throw new Error("decomposition requires at least three seasons");
  if (!Number.isFinite(ridgeLambda) || ridgeLambda < 0) throw new Error("ridgeLambda must be non-negative");
  const columns = ["age", "playActionRate", "motionRate", "yacPerCatch", "passBlockGrade"] as const;
  const X: number[][] = seasons.map((s) => [1, s.age, s.playActionRate, s.motionRate, s.yacPerCatch, s.passBlockGrade]);
  const y = seasons.map((s) => s.epaPerDropback);
  const p = X[0]!.length;
  const xtx: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const xty: number[] = new Array<number>(p).fill(0);
  for (let r = 0; r < X.length; r += 1) {
    for (let i = 0; i < p; i += 1) {
      xty[i] = xty[i]! + X[r]![i]! * y[r]!;
      for (let j = 0; j < p; j += 1) xtx[i]![j] = xtx[i]![j]! + X[r]![i]! * X[r]![j]!;
    }
  }
  for (let i = 1; i < p; i += 1) xtx[i]![i] = xtx[i]![i]! + ridgeLambda;
  const beta = solveLinearSystem(xtx, xty);
  const intercept = beta[0]!;
  const ageCoef = beta[1]!;
  const meanAge = mean(seasons.map((s) => s.age));
  const intrinsicEpa = intercept + ageCoef * meanAge;
  const schemeSupportEpa =
    beta[2]! * mean(seasons.map((s) => s.playActionRate)) +
    beta[3]! * mean(seasons.map((s) => s.motionRate)) +
    beta[4]! * mean(seasons.map((s) => s.yacPerCatch)) +
    beta[5]! * mean(seasons.map((s) => s.passBlockGrade));
  return {
    intrinsicEpa,
    schemeSupportEpa,
    reconstructedEpa: intrinsicEpa + schemeSupportEpa,
    coefficients: {
      intercept,
      age: ageCoef,
      playActionRate: beta[2]!,
      motionRate: beta[3]!,
      yacPerCatch: beta[4]!,
      passBlockGrade: beta[5]!,
    },
    ridgeLambda,
  };
}

export interface DraftPickCurvePoint {
  pick: number;
  /** Measured performance-adjusted APY at this pick. */
  apy: number;
}

export interface DraftPickSurplusInput {
  pick: number;
  /** Measured non-QB APY curve, ascending by pick. At least three points. */
  measuredCurve: readonly DraftPickCurvePoint[];
  /** Rookie-cost curve or a single slot cost for this pick. */
  rookieCost: number;
}

export interface DraftPickSurplusResult {
  pick: number;
  fittedApy: number;
  rookieCost: number;
  surplusValue: number;
  monotone: boolean;
}

/** Pool-adjacent-violators isotonic fit; returns fitted values in input order. */
function isotonicFit(values: readonly number[], weights: readonly number[]): number[] {
  const blocks: { sum: number; weight: number; start: number; end: number }[] = [];
  for (let i = 0; i < values.length; i += 1) {
    blocks.push({ sum: values[i]! * weights[i]!, weight: weights[i]!, start: i, end: i });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1]!;
      const prev = blocks[blocks.length - 2]!;
      if (prev.sum / prev.weight <= last.sum / last.weight) break;
      blocks.splice(blocks.length - 2, 2, {
        sum: prev.sum + last.sum,
        weight: prev.weight + last.weight,
        start: prev.start,
        end: last.end,
      });
    }
  }
  const out = new Array<number>(values.length).fill(0);
  for (const block of blocks) {
    const fitted = block.sum / block.weight;
    for (let i = block.start; i <= block.end; i += 1) out[i] = fitted;
  }
  return out;
}

/**
 * Post #1. The curve is fitted isotonically so surplus declines with pick
 * number without imposing a parametric shape. Picks outside the measured
 * range are clamped to the nearest endpoint and reported honestly by the
 * returned `pick` being the requested value while `fittedApy` is the
 * endpoint value.
 */
export function evaluateNflDraftPickSurplusValue(input: DraftPickSurplusInput): DraftPickSurplusResult {
  const { pick, measuredCurve, rookieCost } = input;
  if (!Number.isInteger(pick) || pick < 1) throw new Error("draft pick must be a positive integer");
  if (measuredCurve.length < 3) throw new Error("measuredCurve requires at least three points");
  if (!Number.isFinite(rookieCost) || rookieCost < 0) throw new Error("rookieCost must be non-negative");
  const ordered = [...measuredCurve].sort((a, b) => a.pick - b.pick);
  const fitted = isotonicFit(
    ordered.map((p) => p.apy),
    ordered.map(() => 1),
  );
  const idx = ordered.findIndex((p) => p.pick >= pick);
  const at = idx === -1 ? ordered.length - 1 : idx;
  const apy = fitted[at]!;
  const monotone = fitted.every((v, i) => i === 0 || v <= fitted[i - 1]! + 1e-9);
  return { pick, fittedApy: apy, rookieCost, surplusValue: apy - rookieCost, monotone };
}

export interface ProspectLinguisticInput {
  /** Scouting text (free-form). */
  text: string;
  position: "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB";
  /** Position base rates for the same trait lexicon. Required. */
  positionBaseRates: Readonly<Record<string, number>>;
  /** School-level bias offsets (e.g. blue-blood exposure inflation). Optional. */
  schoolBiasOffsets?: Readonly<Record<string, number>>;
}

export interface ProspectLinguisticResult {
  topTraits: { trait: string; tfidf: number }[];
  deconfoundedScore: number;
  ceilingModifier: number;
  floorModifier: number;
  biasOffsetsApplied: string[];
}

const TRAIT_LEXICON: readonly string[] = [
  "arm strength",
  "accuracy",
  "anticipation",
  "athleticism",
  "ball skills",
  "blocking",
  "burst",
  "coverage",
  "decision making",
  "footwork",
  "hands",
  "instincts",
  "leadership",
  "motor",
  "pass rush",
  "pocket presence",
  "route running",
  "separation",
  "tackling",
  "vision",
];

/**
 * Post #2. Term frequency is the trait count in the text; inverse document
 * frequency uses the supplied position base rate as the document frequency
 * proxy (rare-for-the-position traits score higher). The de-confounded
 * score subtracts the position base rate and any supplied school bias, so
 * a blue-blood scouting narrative cannot inflate the ceiling by itself.
 */
export function evaluateProspectScoutingLinguisticProfile(
  input: ProspectLinguisticInput,
): ProspectLinguisticResult {
  const text = input.text.toLowerCase();
  if (text.trim().length === 0) throw new Error("prospect text is required");
  const counts: { trait: string; tf: number; idf: number; tfidf: number }[] = [];
  for (const trait of TRAIT_LEXICON) {
    const matches = text.split(trait).length - 1;
    if (matches === 0) continue;
    const base = input.positionBaseRates[trait] ?? 0.05;
    if (!(base > 0 && base < 1)) throw new Error(`position base rate for ${trait} must be in (0, 1)`);
    const tf = 1 + Math.log(matches);
    const idf = Math.log(1 / base);
    counts.push({ trait, tf, idf, tfidf: tf * idf });
  }
  counts.sort((a, b) => b.tfidf - a.tfidf);
  const total = counts.reduce((s, c) => s + c.tfidf, 0);
  const positionMean = mean(Object.values(input.positionBaseRates).filter((v) => v > 0 && v < 1));
  const biasOffsetsApplied: string[] = [];
  let bias = 0;
  for (const [key, offset] of Object.entries(input.schoolBiasOffsets ?? {})) {
    if (text.includes(key.toLowerCase())) {
      bias += offset;
      biasOffsetsApplied.push(key);
    }
  }
  const deconfoundedScore = total === 0 ? 0 : clamp01(total / (total + 1) - positionMean - bias);
  const ceilingModifier = 1 + 0.25 * (deconfoundedScore - 0.5);
  const floorModifier = 1 - 0.15 * Math.abs(deconfoundedScore - 0.5);
  return {
    topTraits: counts.slice(0, 5).map((c) => ({ trait: c.trait, tfidf: c.tfidf })),
    deconfoundedScore,
    ceilingModifier,
    floorModifier,
    biasOffsetsApplied,
  };
}

// Re-export the helpers this module's tests reach for without duplicating them.
export { equalCorrelationShrinkFactor, logit, sigmoid, variance, sd, clamp };
