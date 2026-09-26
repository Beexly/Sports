/**
 * Markets/odds bridge â€” this layer decides whether a markets or odds kernel
 * produced a number that is legal enough to hand downstream, and fails closed
 * on everything else: a probability outside [0,1], a de-vigged vector that
 * does not sum to 1 within a stated tolerance, a negative expected value
 * dressed up as actionable, or a score a caller could mistake for a
 * probability.
 *
 * It does not decide whether a pick is good. It decides only whether the
 * arithmetic survived contact with real data. It never imputes, never clamps,
 * never renormalises silently.
 */

import {
  renderLabeledPick,
  validateDisplay,
  type DisplayPick,
  type LabeledDisplay,
} from "@sports/prediction-engine/src/markets/probability-display.js";
import {
  benjaminiHochberg,
  binomialP,
  honestyGate,
  type HonestyVerdict,
  type SpotRecord,
} from "@sports/prediction-engine/src/markets/situational-honesty-filter.js";
import {
  bookFeeGap,
  effectiveEv,
  isSignFlip,
  postedEv,
  signFlipRate,
  type PricedPick,
} from "@sports/prediction-engine/src/markets/effective-price.js";
import {
  estimateEpsilon,
  fairOddsNoisy,
  longshotFilter,
  noiseWedge,
  type NoiseWedgeOpts,
} from "@sports/prediction-engine/src/markets/noise-wedge-odds.js";
import {
  crossSectionalBar,
  deltaAuc,
  detectInformedFlow,
  type InformedVerdict,
  type SegmentFlow,
} from "@sports/prediction-engine/src/markets/informed-flow.js";
import {
  fitLiquidity,
  flagMispricings,
  impliedFeeGamma,
  marginalPrice,
  oracleMid,
  tightnessIndex,
  type BookQuote,
  type MispricingFlag,
} from "@sports/prediction-engine/src/markets/marginal-price-oracle.js";
import {
  calibrateCrossover,
  excessMovement,
  excessTTest,
  inGameSignal,
  movement,
  uncertaintyReduction,
  type GameBlock,
  type InGameSignal,
} from "@sports/prediction-engine/src/markets/excess-movement-monitor.js";
import {
  americanToDecimal,
  evaluatePromo,
  hedgedPromoValue,
  impliedProb,
  scanArb,
  type ArbResult,
  type BookOdds,
  type PromoTerms,
} from "@sports/prediction-engine/src/markets/arb-lp-scanner.js";
import {
  flGlm,
  multiplicativeNormalize,
  ooEpc,
} from "@sports/prediction-engine/src/odds/oo-epc.js";
import {
  bucketRoi,
  flbSlope,
  type BucketRoi,
  type OddsBucket,
} from "@sports/prediction-engine/src/odds/favorite-longshot-audit.js";
import {
  convexFuse,
  devig as historyDevig,
  fitFusionWeight,
  fusionGate,
  ENABLED as FUSION_ENABLED,
  type FusionFit,
} from "@sports/prediction-engine/src/markets/1802-08848v1-odds-history-fusion.js";
import {
  fitAlpha,
  interpolatedPool,
  mixturePool,
  productPool,
  updateWealth,
  ENABLED as POOLING_ENABLED,
  type AlphaFit,
  type ProbVector,
} from "@sports/prediction-engine/src/markets/1106-4509-ml-market-pooling.js";
import {
  beatWriterSentiment,
  ewma,
  totalsModelFeatures,
  volumeMomentumFeature,
  ENABLED as SOCIAL_ENABLED,
  type TotalsFeatures,
} from "@sports/prediction-engine/src/markets/1310-6998v1-twitter-volume-momentum.js";
import {
  brierScore,
  classWeightedBCE,
  eceProbs,
  fbeta,
  logLoss as binaryLogLoss,
  normalCdfLocal,
  pairedT,
  rankedProbScore,
  spearman,
  ENABLED as SPREAD_TABLE_ENABLED,
} from "@sports/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.js";
import {
  drawdownGate,
  kellyBinary,
  kellyGrowthRate,
  kellySized,
  ENABLED as THETA_POLICY_ENABLED,
} from "@sports/prediction-engine/src/markets/2003-09384v2-static-theta-threshold-policy.js";
import {
  decayEps,
  epsilonGreedyStep,
  thompsonBetaStep,
  ucb1Step,
  ENABLED as IMITATION_ENABLED,
} from "@sports/prediction-engine/src/markets/2401-06086v1-imitation-inplay-betting.js";
import {
  negBinMoments,
  poissonLogLik,
  poissonMle,
  poissonPmf,
  zinbPmf,
  ENABLED as DCP_ENABLED,
} from "@sports/prediction-engine/src/markets/2112-13001v3-dcp-prop-framework.js";

// ---------------------------------------------------------------------------
// Bridge primitives
// ---------------------------------------------------------------------------

export type MarketsEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): MarketsEval<never> {
  return { ok: false, reason };
}

function ok<T>(data: T): MarketsEval<T> {
  return { ok: true, data };
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Stated de-vig tolerance. A de-vigged vector must sum to its target within this. */
export const DEVIG_SUM_TOLERANCE = 1e-6;

/**
 * Slack allowed on a p-value produced by an Abramowitz-Stegun normal CDF.
 * The approximation overshoots by up to ~1.5e-4 near the tails, so a kernel
 * can legitimately return 1.0000003 for a zero t-statistic. The value is
 * reported UNCHANGED; this only stops the bridge failing on the
 * approximation's own error. It is not a licence to accept a real p > 1.
 */
export const NORMAL_APPROX_P_SLACK = 1e-3;

/** A p-value from a normal approximation: finite, non-negative, at most 1 + slack. */
function approxP(x: number): boolean {
  return finite(x) && x >= 0 && x <= 1 + NORMAL_APPROX_P_SLACK;
}

function finite(x: number): boolean {
  return Number.isFinite(x);
}

function unit(x: number): boolean {
  return finite(x) && x >= 0 && x <= 1;
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function allUnit(xs: readonly number[]): boolean {
  return xs.length > 0 && xs.every(unit);
}

/** Every element a legal probability AND the vector sums to `target` within tolerance. */
function isProbVector(v: readonly number[], target = 1): boolean {
  return allUnit(v) && Math.abs(sum(v) - target) <= DEVIG_SUM_TOLERANCE;
}

function fmt(v: readonly number[]): string {
  return `[${v.map((x) => (finite(x) ? x.toFixed(4) : String(x))).join(", ")}]`;
}

/** Deterministic LCG (Numerical Recipes constants). No crypto, no Math.random. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// 1. probability-display â€” three distinct labeled numbers, or nothing ships
// ---------------------------------------------------------------------------

export interface ProbabilityDisplayResult {
  readonly lines: readonly string[];
  readonly valid: boolean;
  readonly issues: readonly string[];
  /** Signed model-minus-market gap in percentage points. A gap, not a probability. */
  readonly gapPp: number;
  /** True only when the model reads above the market. Never an instruction to bet. */
  readonly modelAboveMarket: boolean;
}

export function evalProbabilityDisplay(
  pick: DisplayPick,
): MarketsEval<ProbabilityDisplayResult> {
  if (!finite(pick.modelProb) || !finite(pick.marketProb)) {
    return fail("probability-display: non-finite probability");
  }
  if (!unit(pick.modelProb) || !unit(pick.marketProb)) {
    return fail(
      `probability-display: probability outside [0,1] ` +
        `(modelProb=${pick.modelProb}, marketProb=${pick.marketProb})`,
    );
  }
  let rendered: LabeledDisplay;
  try {
    const issues = validateDisplay(pick);
    if (issues.length > 0) return fail(`probability-display rejected: ${issues.join("; ")}`);
    rendered = renderLabeledPick(pick);
  } catch (err) {
    return fail(`probability-display threw: ${msg(err)}`);
  }
  if (rendered.issues.length > 0 || !rendered.valid) {
    return fail(`probability-display rejected: ${rendered.issues.join("; ")}`);
  }
  if (rendered.lines.length < 4) {
    return fail("probability-display: fewer than the four required labeled lines rendered");
  }
  if (!rendered.lines.some((l) => l.startsWith("Model probability:"))) {
    return fail("probability-display: model-probability line missing from render");
  }
  if (!rendered.lines.some((l) => l.startsWith("Market-implied probability:"))) {
    return fail("probability-display: market-implied-probability line missing from render");
  }
  if (rendered.lines.some((l) => l.startsWith("Liquidity:")) === false && (pick.liquidity ?? "").trim() !== "") {
    return fail("probability-display: a liquidity caveat was supplied but not rendered");
  }
  const gapPp = (pick.modelProb - pick.marketProb) * 100;
  if (!finite(gapPp) || Math.abs(gapPp) > 100) {
    return fail(`probability-display: gap out of range (${gapPp}pp)`);
  }
  return ok({
    lines: rendered.lines,
    valid: rendered.valid,
    issues: rendered.issues,
    gapPp,
    modelAboveMarket: gapPp > 0,
  });
}

// ---------------------------------------------------------------------------
// 2. situational-honesty-filter â€” the three-leg gate, with its sample size
// ---------------------------------------------------------------------------

export interface HonestyGateInput {
  readonly spot: SpotRecord;
  /** Batch p-values for a Benjamini-Hochberg pass. This spot's p must be index 0. */
  readonly batchPvals?: readonly number[];
  /** Explicit FDR-adjusted p. Ignored when batchPvals is supplied. */
  readonly fdrP?: number;
}

export interface HonestyGateResult {
  readonly pass: boolean;
  readonly failedLegs: readonly string[];
  readonly coverRate: number;
  readonly rawP: number;
  readonly fdrP: number;
  /** The sample behind the cover rate. A pass is meaningless without it. */
  readonly sampleSize: number;
  readonly placeboN: number;
  readonly clvBeatRate: number;
  /** The kernel's own n >= 200 qualification, restated so it cannot be skipped. */
  readonly meetsSampleFloor: boolean;
}

export function evalSituationalHonestyGate(
  input: HonestyGateInput,
): MarketsEval<HonestyGateResult> {
  const { spot } = input;
  if (!Number.isInteger(spot.n) || spot.n < 1) {
    return fail(`honesty-filter: n must be a positive integer (got ${spot.n})`);
  }
  if (!Number.isInteger(spot.covers) || spot.covers < 0 || spot.covers > spot.n) {
    return fail(`honesty-filter: covers ${spot.covers} out of range for n=${spot.n}`);
  }
  if (!unit(spot.clvBeatRate)) {
    return fail(`honesty-filter: clvBeatRate ${spot.clvBeatRate} outside [0,1]`);
  }
  if (!unit(spot.placeboRate)) {
    return fail(`honesty-filter: placeboRate ${spot.placeboRate} outside [0,1]`);
  }
  if (!Number.isInteger(spot.placeboN) || spot.placeboN < 0) {
    return fail("honesty-filter: placeboN must be a non-negative integer");
  }
  let rawP: number;
  let fdrP: number;
  try {
    rawP = binomialP(spot.covers, spot.n);
    if (!unit(rawP)) return fail(`honesty-filter: binomialP produced ${rawP}`);
    if (input.batchPvals !== undefined) {
      if (input.batchPvals.length === 0) {
        return fail("honesty-filter: empty p-value batch");
      }
      if (!input.batchPvals.every(unit)) {
        return fail("honesty-filter: batch p-values outside [0,1]");
      }
      const adjusted = benjaminiHochberg(input.batchPvals);
      const first = adjusted[0];
      if (first === undefined || !unit(first)) {
        return fail("honesty-filter: BH adjustment produced a non-probability");
      }
      fdrP = first;
    } else if (input.fdrP !== undefined) {
      if (!unit(input.fdrP)) return fail(`honesty-filter: supplied fdrP ${input.fdrP} outside [0,1]`);
      fdrP = input.fdrP;
    } else {
      fdrP = rawP;
    }
  } catch (err) {
    return fail(`honesty-filter threw: ${msg(err)}`);
  }
  let verdict: HonestyVerdict;
  try {
    verdict = honestyGate(spot, fdrP);
  } catch (err) {
    return fail(`honesty-filter gate threw: ${msg(err)}`);
  }
  if (!unit(verdict.coverRate)) {
    return fail(`honesty-filter: cover rate ${verdict.coverRate} outside [0,1]`);
  }
  if (!unit(verdict.fdrP)) {
    return fail(`honesty-filter: fdrP ${verdict.fdrP} outside [0,1]`);
  }
  if (typeof verdict.pass !== "boolean") {
    return fail("honesty-filter: verdict.pass is not a boolean");
  }
  return ok({
    pass: verdict.pass,
    failedLegs: verdict.failedLegs,
    coverRate: verdict.coverRate,
    rawP,
    fdrP,
    sampleSize: spot.n,
    placeboN: spot.placeboN,
    clvBeatRate: spot.clvBeatRate,
    meetsSampleFloor: spot.n >= 200,
  });
}

// ---------------------------------------------------------------------------
// 3. effective-price â€” a negative edge is a pass, never a negative stake
// ---------------------------------------------------------------------------

export interface PricedPickRow {
  readonly postedEv: number;
  readonly effectiveEv: number;
  readonly signFlip: boolean;
  /** "VALUE" only when effective EV is strictly positive. */
  readonly action: "VALUE" | "PASS";
}

export interface EffectivePriceResult {
  readonly rows: readonly PricedPickRow[];
  readonly signFlipRate: number;
  readonly meanFee: number;
  readonly positiveEvCount: number;
  readonly actionableCount: number;
  /** The module's stated adoption metric is a >= 2% flip rate. */
  readonly meetsTwoPercentAdoptionGate: boolean;
}

export function evalEffectivePrice(
  picks: readonly PricedPick[],
): MarketsEval<EffectivePriceResult> {
  if (!Array.isArray(picks) || picks.length === 0) {
    return fail("effective-price: picks empty â€” nothing to price");
  }
  const rows: PricedPickRow[] = [];
  let positiveEvCount = 0;
  for (const pick of picks) {
    if (!unit(pick.p)) return fail(`effective-price: p=${pick.p} outside [0,1]`);
    if (!finite(pick.odds) || pick.odds <= 1) {
      return fail(`effective-price: odds ${pick.odds} must exceed 1`);
    }
    if (!finite(pick.stake) || pick.stake <= 0) {
      return fail(`effective-price: stake ${pick.stake} must be positive`);
    }
    if (!finite(pick.fee) || pick.fee < 0) {
      return fail(`effective-price: fee ${pick.fee} must be non-negative`);
    }
    let posted: number;
    let effective: number;
    let flip: boolean;
    try {
      posted = postedEv(pick);
      effective = effectiveEv(pick);
      flip = isSignFlip(pick);
    } catch (err) {
      return fail(`effective-price threw: ${msg(err)}`);
    }
    if (!finite(posted) || !finite(effective)) {
      return fail(`effective-price: non-finite EV for p=${pick.p} odds=${pick.odds}`);
    }
    if (posted > 0) positiveEvCount += 1;
    // A negative effective EV is a PASS. It is never turned into a stake.
    rows.push({
      postedEv: posted,
      effectiveEv: effective,
      signFlip: flip,
      action: effective > 0 ? "VALUE" : "PASS",
    });
  }
  let rate: number;
  let gap: { meanFee: number; flipShare: number };
  try {
    rate = signFlipRate(picks);
    gap = bookFeeGap(picks);
  } catch (err) {
    return fail(`effective-price aggregation threw: ${msg(err)}`);
  }
  if (!unit(rate)) return fail(`effective-price: signFlipRate ${rate} outside [0,1]`);
  if (!unit(gap.flipShare)) return fail(`effective-price: flipShare ${gap.flipShare} outside [0,1]`);
  if (!finite(gap.meanFee) || gap.meanFee < 0) {
    return fail(`effective-price: meanFee ${gap.meanFee} invalid`);
  }
  return ok({
    rows,
    signFlipRate: rate,
    meanFee: gap.meanFee,
    positiveEvCount,
    actionableCount: rows.filter((r) => r.action === "VALUE").length,
    meetsTwoPercentAdoptionGate: rate >= 0.02,
  });
}

// ---------------------------------------------------------------------------
// 4. noise-wedge-odds â€” fair odds, and the implied probability must be legal
// ---------------------------------------------------------------------------

export interface NoiseWedgeResult {
  readonly epsilon: number;
  readonly wedge: number;
  readonly fairDecimalOdds: number;
  /** 1 / fairDecimalOdds. A probability, so it must live in [0,1] or this fails. */
  readonly fairImpliedProb: number;
  readonly modelProb: number;
  readonly ensembleMean: number;
  readonly ensembleSize: number;
  readonly longshotFiltered: boolean;
  /** True when the wedge moved the quote at all. */
  readonly wedgeApplied: boolean;
}

export function evalNoiseWedgeFairOdds(
  modelProb: number,
  memberProbs: readonly number[],
  opts: NoiseWedgeOpts = {},
): MarketsEval<NoiseWedgeResult> {
  if (!unit(modelProb) || modelProb <= 0 || modelProb >= 1) {
    return fail(`noise-wedge: modelProb ${modelProb} must lie strictly inside (0,1)`);
  }
  if (!Array.isArray(memberProbs) || memberProbs.length < 2) {
    return fail("noise-wedge: need >= 2 ensemble members to estimate dispersion");
  }
  if (!memberProbs.every(unit)) {
    return fail(`noise-wedge: ensemble members outside [0,1]: ${fmt(memberProbs)}`);
  }
  const allIdentical = memberProbs.every((p) => p === memberProbs[0]);
  if (allIdentical) {
    return fail(
      "noise-wedge: every ensemble member is identical â€” dispersion is not estimable, " +
        "a repeated single model is not an ensemble",
    );
  }
  if (opts.tail !== undefined && (!unit(opts.tail) || opts.tail === 0 || opts.tail >= 0.5)) {
    return fail(`noise-wedge: tail ${String(opts.tail)} must lie in (0, 0.5)`);
  }
  const ensembleMean = sum(memberProbs) / memberProbs.length;
  let epsilon: number;
  let wedge: number;
  let fair: { odds: number; wedge: number; epsilon: number };
  try {
    epsilon = estimateEpsilon(memberProbs);
    wedge = noiseWedge(modelProb, epsilon, opts);
    fair = fairOddsNoisy(modelProb, memberProbs, opts);
  } catch (err) {
    return fail(`noise-wedge threw: ${msg(err)}`);
  }
  if (!finite(epsilon) || epsilon < 0) return fail(`noise-wedge: epsilon ${epsilon} invalid`);
  const cap = Math.min(modelProb, 1 - modelProb);
  if (!finite(wedge) || wedge < 0 || wedge > cap + 1e-9) {
    return fail(`noise-wedge: wedge ${wedge} outside [0, ${cap}]`);
  }
  if (!finite(fair.odds) || fair.odds <= 1) {
    return fail(`noise-wedge: fair decimal odds ${fair.odds} must exceed 1`);
  }
  const fairImpliedProb = 1 / fair.odds;
  if (!unit(fairImpliedProb)) {
    return fail(`noise-wedge: fair implied probability ${fairImpliedProb} outside [0,1]`);
  }
  // A wedge must move the quote in the direction the paper prescribes.
  if (modelProb > 0.5 && fairImpliedProb > modelProb + 1e-12) {
    return fail("noise-wedge: favorite wedge widened the fair probability instead of narrowing it");
  }
  if (modelProb < 0.5 && fairImpliedProb < modelProb - 1e-12) {
    return fail("noise-wedge: longshot wedge narrowed the fair probability instead of widening it");
  }
  return ok({
    epsilon,
    wedge,
    fairDecimalOdds: fair.odds,
    fairImpliedProb,
    modelProb,
    ensembleMean,
    ensembleSize: memberProbs.length,
    longshotFiltered: longshotFilter(modelProb, epsilon, 0.25),
    wedgeApplied: wedge > 0,
  });
}

// ---------------------------------------------------------------------------
// 5. informed-flow â€” is this segment actually moving the line?
// ---------------------------------------------------------------------------

export interface InformedFlowResult {
  readonly verdict: InformedVerdict;
  readonly informed: boolean;
  /** The one-sided critical value the kernel used, restated so it is auditable. */
  readonly criticalT: number;
}

export function evalInformedFlow(flow: SegmentFlow): MarketsEval<InformedFlowResult> {
  if (typeof flow.segment !== "string" || flow.segment.trim() === "") {
    return fail("informed-flow: segment label missing");
  }
  if (!Array.isArray(flow.bets) || flow.bets.length < 10) {
    return fail(`informed-flow: ${flow.bets?.length ?? 0} bets, need >= 10`);
  }
  for (const b of flow.bets) {
    if (!finite(b.edge) || !finite(b.priceImpact)) {
      return fail("informed-flow: non-finite edge or priceImpact");
    }
  }
  const edges = flow.bets.map((b) => b.edge);
  const sxx = sum(edges.map((e) => e * e)) - (sum(edges) ** 2) / edges.length;
  if (!(sxx > 1e-9)) {
    return fail("informed-flow: edge has no variance â€” the OLS slope is undefined");
  }
  let verdict: InformedVerdict;
  try {
    verdict = detectInformedFlow(flow);
  } catch (err) {
    return fail(`informed-flow threw: ${msg(err)}`);
  }
  if (!finite(verdict.beta) || !finite(verdict.tStat)) {
    return fail(`informed-flow: non-finite fit (beta=${verdict.beta}, t=${verdict.tStat})`);
  }
  if (verdict.n !== flow.bets.length) {
    return fail(`informed-flow: kernel n=${verdict.n} disagrees with input n=${flow.bets.length}`);
  }
  return ok({ verdict, informed: verdict.informed, criticalT: -1.645 });
}

export interface InformedCrossSectionResult {
  readonly deltaAuc: number;
  readonly aucCiHalf: number;
  readonly crossSectionalGap: number;
  readonly crossSectionalP: number;
  readonly informedGroupSize: number;
  readonly uninformedGroupSize: number;
}

export function evalInformedFlowCrossSection(
  pre: readonly number[],
  post: readonly number[],
  outcomes: readonly number[],
  informed: readonly boolean[],
  profitable: readonly boolean[],
): MarketsEval<InformedCrossSectionResult> {
  if (pre.length !== post.length || pre.length !== outcomes.length) {
    return fail("informed-flow: pre/post/outcome lengths differ");
  }
  if (pre.length < 20) {
    return fail(`informed-flow: ${pre.length} games, deltaAuc needs >= 20`);
  }
  if (!pre.every(unit) || !post.every(unit)) {
    return fail("informed-flow: pre/post probabilities outside [0,1]");
  }
  if (!outcomes.every((y) => y === 0 || y === 1)) {
    return fail("informed-flow: outcomes must be 0 or 1");
  }
  if (informed.length !== profitable.length || informed.length === 0) {
    return fail("informed-flow: informed/profitable lengths differ or are empty");
  }
  if (!outcomes.includes(0) || !outcomes.includes(1)) {
    return fail("informed-flow: outcomes must contain both classes to compute an AUC");
  }
  let d: { delta: number; ciHalf: number };
  let bar: { gap: number; pValue: number };
  try {
    d = deltaAuc(pre, post, outcomes);
    bar = crossSectionalBar(informed, profitable);
  } catch (err) {
    return fail(`informed-flow cross-section threw: ${msg(err)}`);
  }
  if (!finite(d.delta) || Math.abs(d.delta) > 1) {
    return fail(`informed-flow: delta AUC ${d.delta} outside [-1,1]`);
  }
  if (!finite(d.ciHalf) || d.ciHalf < 0) {
    return fail(`informed-flow: CI half-width ${d.ciHalf} invalid`);
  }
  if (!finite(bar.gap) || !approxP(bar.pValue)) {
    return fail(`informed-flow: cross-section gap ${bar.gap} / p ${bar.pValue} invalid`);
  }
  return ok({
    deltaAuc: d.delta,
    aucCiHalf: d.ciHalf,
    crossSectionalGap: bar.gap,
    crossSectionalP: bar.pValue,
    informedGroupSize: informed.filter(Boolean).length,
    uninformedGroupSize: informed.filter((x) => !x).length,
  });
}

// ---------------------------------------------------------------------------
// 6. marginal-price-oracle â€” consensus price, per-book liquidity, two-sided sum
// ---------------------------------------------------------------------------

export interface MarginalOracleResult {
  /** Median de-vigged home-side price across books. A price in (0,1), NOT a win rate. */
  readonly homeOracleMid: number;
  /** Only set when away-side quotes are supplied and checked. */
  readonly awayOracleMid: number | null;
  /** |home + away - 1|; null when the caller supplied only one side. */
  readonly twoSidedSumError: number | null;
  readonly flags: readonly MispricingFlag[];
  /** Median implied fee gamma across books, in [0,1). Lower is a sharper market. */
  readonly tightness: number;
  readonly quoteCount: number;
  readonly books: readonly {
    readonly book: string;
    readonly b: number;
    readonly midAtZero: number;
    readonly impliedFeeGamma: number;
  }[];
}

function quoteProblem(q: BookQuote): string | null {
  if (typeof q.book !== "string" || q.book.trim() === "") return "book name missing";
  if (!finite(q.bid) || !finite(q.ask)) return `non-finite quote for ${q.book}`;
  if (q.ask <= 1) return `${q.book} ask ${q.ask} must exceed 1`;
  if (q.bid <= q.ask) return `${q.book} needs bid ${q.bid} > ask ${q.ask}`;
  return null;
}

export function evalMarginalPriceOracle(
  quotes: readonly BookQuote[],
  awayQuotes?: readonly BookQuote[],
  feeBand = 0.01,
): MarketsEval<MarginalOracleResult> {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return fail("marginal-oracle: no home-side quotes");
  }
  for (const q of quotes) {
    const bad = quoteProblem(q);
    if (bad !== null) return fail(`marginal-oracle: ${bad}`);
  }
  if (!finite(feeBand) || feeBand < 0) {
    return fail(`marginal-oracle: feeBand ${feeBand} must be non-negative`);
  }
  let homeMid: number;
  let flags: MispricingFlag[];
  let tightness: number;
  const books: {
    book: string;
    b: number;
    midAtZero: number;
    impliedFeeGamma: number;
  }[] = [];
  try {
    homeMid = oracleMid(quotes);
    flags = flagMispricings(quotes, feeBand);
    tightness = tightnessIndex(quotes);
    for (const q of quotes) {
      const { b, mid } = fitLiquidity(q.bid, q.ask);
      books.push({
        book: q.book,
        b,
        midAtZero: marginalPrice(b, mid, 0),
        impliedFeeGamma: impliedFeeGamma(q),
      });
    }
  } catch (err) {
    return fail(`marginal-oracle threw: ${msg(err)}`);
  }
  if (!finite(homeMid) || homeMid <= 0 || homeMid >= 1) {
    return fail(`marginal-oracle: home mid ${homeMid} must lie strictly inside (0,1)`);
  }
  if (!unit(tightness)) {
    return fail(`marginal-oracle: tightness ${tightness} outside [0,1]`);
  }
  for (const f of flags) {
    if (!finite(f.deviation) || f.deviation < 0) {
      return fail(`marginal-oracle: deviation ${f.deviation} invalid for ${f.book}`);
    }
    if (f.flagged !== f.deviation > feeBand) {
      return fail(`marginal-oracle: flag for ${f.book} disagrees with the stated fee band`);
    }
  }
  for (const bk of books) {
    if (!finite(bk.b) || bk.b <= 0) {
      return fail(`marginal-oracle: liquidity parameter b=${bk.b} invalid for ${bk.book}`);
    }
    if (!unit(bk.midAtZero)) {
      return fail(`marginal-oracle: mid at zero ${bk.midAtZero} outside [0,1] for ${bk.book}`);
    }
    if (!unit(bk.impliedFeeGamma)) {
      return fail(`marginal-oracle: implied fee gamma ${bk.impliedFeeGamma} outside [0,1] for ${bk.book}`);
    }
  }
  let awayMid: number | null = null;
  let sumError: number | null = null;
  if (awayQuotes !== undefined) {
    if (!Array.isArray(awayQuotes) || awayQuotes.length === 0) {
      return fail("marginal-oracle: away quotes supplied but empty");
    }
    for (const q of awayQuotes) {
      const bad = quoteProblem(q);
      if (bad !== null) return fail(`marginal-oracle (away): ${bad}`);
    }
    try {
      awayMid = oracleMid(awayQuotes);
    } catch (err) {
      return fail(`marginal-oracle away side threw: ${msg(err)}`);
    }
    if (!finite(awayMid) || awayMid <= 0 || awayMid >= 1) {
      return fail(`marginal-oracle: away mid ${awayMid} must lie strictly inside (0,1)`);
    }
    sumError = Math.abs(homeMid + awayMid - 1);
    if (sumError > DEVIG_SUM_TOLERANCE) {
      return fail(
        `marginal-oracle: de-vigged two-sided sum is ${(homeMid + awayMid).toFixed(9)}, ` +
          `off 1 by ${sumError.toExponential(3)} (tolerance ${DEVIG_SUM_TOLERANCE})`,
      );
    }
  }
  return ok({
    homeOracleMid: homeMid,
    awayOracleMid: awayMid,
    twoSidedSumError: sumError,
    flags,
    tightness,
    quoteCount: quotes.length,
    books,
  });
}

// ---------------------------------------------------------------------------
// 7. excess-movement-monitor â€” movement minus information, per block
// ---------------------------------------------------------------------------

export interface ExcessMovementRow {
  readonly block: number;
  readonly movement: number;
  readonly uncertaintyReduction: number;
  readonly excess: number;
  readonly signal: InGameSignal;
  readonly highLeverage: boolean;
}

export interface ExcessMovementResult {
  readonly rows: readonly ExcessMovementRow[];
  /** First block after which mean excess turns and stays negative. null = no clean crossover. */
  readonly crossoverBlock: number | null;
  /** Null when there were fewer than 2 blocks: no t-statistic is computable. */
  readonly tStat: number | null;
  readonly pValue: number | null;
  readonly meanExcess: number;
  /** True only when BOTH stated gates hold: early significantly positive, late significantly negative. */
  readonly gateAdopted: boolean;
}

export function evalExcessMovement(
  blocks: readonly GameBlock[],
  crossoverBlock: number,
  minExcess = 0.02,
): MarketsEval<ExcessMovementResult> {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return fail("excess-movement: no game blocks");
  }
  if (!finite(crossoverBlock)) {
    return fail("excess-movement: crossover block is not finite");
  }
  if (!finite(minExcess) || minExcess < 0) {
    return fail(`excess-movement: minExcess ${minExcess} must be non-negative`);
  }
  const rows: ExcessMovementRow[] = [];
  const excesses: number[] = [];
  for (const b of blocks) {
    if (!Array.isArray(b.probs) || b.probs.length < 2) {
      return fail("excess-movement: each block needs >= 2 probability samples");
    }
    if (!b.probs.every(unit)) {
      return fail(
        `excess-movement: implied probabilities outside [0,1] in block ${b.block}: ${fmt(b.probs)}`,
      );
    }
    if (!finite(b.block)) return fail("excess-movement: block index is not finite");
    let mv: number;
    let red: number;
    let ex: number;
    let sig: InGameSignal;
    try {
      mv = movement(b.probs);
      red = uncertaintyReduction(b.probs);
      ex = excessMovement(b);
      sig = inGameSignal(b, crossoverBlock, minExcess);
    } catch (err) {
      return fail(`excess-movement threw: ${msg(err)}`);
    }
    if (!finite(mv) || mv < 0) {
      return fail(`excess-movement: movement ${mv} invalid in block ${b.block}`);
    }
    if (!finite(red) || red < 0) {
      return fail(`excess-movement: uncertainty reduction ${red} invalid in block ${b.block}`);
    }
    if (!finite(ex)) {
      return fail(`excess-movement: excess ${ex} is not finite in block ${b.block}`);
    }
    if (sig !== "fade" && sig !== "follow" && sig !== "none") {
      return fail(`excess-movement: signal "${sig}" is not one of fade/follow/none`);
    }
    excesses.push(ex);
    rows.push({
      block: b.block,
      movement: mv,
      uncertaintyReduction: red,
      excess: ex,
      signal: sig,
      highLeverage: b.highLeverage,
    });
  }
  let tt: { t: number; pValue: number; mean: number } | null = null;
  let crossover: number | null;
  try {
    // A t-statistic needs >= 2 observations. A single block is a real
    // measurement with no significance attached, so the t-test is reported as
    // unavailable rather than the whole evaluation failing.
    if (excesses.length >= 2) tt = excessTTest(excesses);
    crossover = calibrateCrossover(rows.map((r) => ({ block: r.block, excess: r.excess })));
  } catch (err) {
    return fail(`excess-movement calibration threw: ${msg(err)}`);
  }
  if (tt !== null && (!finite(tt.t) || !approxP(tt.pValue) || !finite(tt.mean))) {
    return fail(`excess-movement: t-test produced t=${tt.t} p=${tt.pValue} mean=${tt.mean}`);
  }
  if (crossover !== null && !finite(crossover)) {
    return fail("excess-movement: crossover block is not finite");
  }
  const early = excesses.filter((_, i) => (rows[i]?.block ?? 0) <= crossoverBlock);
  const late = excesses.filter((_, i) => (rows[i]?.block ?? 0) > crossoverBlock);
  let gateAdopted = false;
  if (early.length >= 2 && late.length >= 2) {
    try {
      const tEarly = excessTTest(early);
      const tLate = excessTTest(late);
      gateAdopted = tEarly.t > 0 && tEarly.pValue < 0.05 && tLate.t < 0 && tLate.pValue < 0.05;
    } catch {
      // A zero-variance half is a legitimate "not enough to gate", not a failure.
      gateAdopted = false;
    }
  }
  return ok({
    rows,
    crossoverBlock: crossover,
    tStat: tt?.t ?? null,
    pValue: tt?.pValue ?? null,
    meanExcess: tt?.mean ?? (excesses.length > 0 ? sum(excesses) / excesses.length : 0),
    gateAdopted,
  });
}

// ---------------------------------------------------------------------------
// 8. arb-lp-scanner â€” no arbitrage is a pass, not a failure
// ---------------------------------------------------------------------------

export interface ArbScanResult {
  readonly arbFound: boolean;
  /** Null when the kernel found no Dutch book. A pass, not an error. */
  readonly arb: ArbResult | null;
  /** Why there is no arb, when there is none. */
  readonly noArbReason: string | null;
  readonly bestLegs: readonly { readonly book: string; readonly decimal: number }[];
  /** Sum of inverse best odds. 1 is a fair menu; below 1 is a sure loss. */
  readonly invSum: number;
  readonly menuImpliedSum: number;
}

export function evalArbScan(books: readonly BookOdds[]): MarketsEval<ArbScanResult> {
  if (!Array.isArray(books) || books.length === 0) {
    return fail("arb-scan: no books supplied");
  }
  const outcomes = books[0]?.american.length ?? 0;
  if (outcomes < 2) {
    return fail(`arb-scan: need >= 2 mutually exclusive outcomes, got ${outcomes}`);
  }
  const mutable: BookOdds[] = [];
  for (const b of books) {
    if (b.american.length !== outcomes) {
      return fail(`arb-scan: ${b.book} has ${b.american.length} outcomes, expected ${outcomes}`);
    }
    for (const a of b.american) {
      if (!finite(a) || a === 0) return fail(`arb-scan: ${b.book} posted American odds ${String(a)}`);
      let dec: number;
      try {
        dec = americanToDecimal(a);
      } catch (err) {
        return fail(`arb-scan conversion threw for ${b.book}: ${msg(err)}`);
      }
      if (!finite(dec) || dec <= 1) {
        return fail(`arb-scan: ${b.book} American ${a} converts to decimal ${dec} (<= 1)`);
      }
      if (!unit(impliedProb(dec))) {
        return fail(`arb-scan: ${b.book} implied probability ${impliedProb(dec)} outside [0,1]`);
      }
    }
    mutable.push({ book: b.book, american: [...b.american] });
  }
  let arb: ArbResult | null;
  try {
    arb = scanArb(mutable);
  } catch (err) {
    return fail(`arb-scan threw: ${msg(err)}`);
  }
  const bestLegs = Array.from({ length: outcomes }, (_, i) => {
    let best = { book: "", decimal: 0 };
    for (const b of mutable) {
      const d = americanToDecimal(b.american[i] ?? 0);
      if (d > best.decimal) best = { book: b.book, decimal: d };
    }
    return best;
  });
  for (const leg of bestLegs) {
    if (leg.decimal <= 1) return fail(`arb-scan: best leg for an outcome is ${leg.decimal} (<= 1)`);
  }
  const invSum = bestLegs.reduce((a, l) => a + 1 / l.decimal, 0);
  if (!finite(invSum) || invSum <= 0) {
    return fail(`arb-scan: inverse-odds sum ${invSum} invalid`);
  }
  if (arb === null) {
    return ok({
      arbFound: false,
      arb: null,
      noArbReason:
        `best available prices imply ${invSum.toFixed(6)} across ${outcomes} outcomes, ` +
        `which is >= 1 â€” no sure-loss (Dutch book) exists in this menu`,
      bestLegs,
      invSum,
      menuImpliedSum: invSum,
    });
  }
  if (arb.legs.length !== outcomes) {
    return fail(`arb-scan: kernel returned ${arb.legs.length} legs for ${outcomes} outcomes`);
  }
  if (!(finite(arb.invSum) && arb.invSum < 1)) {
    return fail(`arb-scan: kernel reported an arb with invSum ${arb.invSum} (must be < 1)`);
  }
  if (!finite(arb.roi) || arb.roi <= 0) {
    return fail(`arb-scan: arb ROI ${arb.roi} must be strictly positive`);
  }
  if (arb.stakes.length !== outcomes || !arb.stakes.every((s) => finite(s) && s > 0)) {
    return fail("arb-scan: stakes must be strictly positive, one per outcome");
  }
  if (Math.abs(sum(arb.stakes) - 1) > DEVIG_SUM_TOLERANCE) {
    return fail(`arb-scan: stakes sum to ${sum(arb.stakes).toFixed(9)}, not 1`);
  }
  if (Math.abs(arb.invSum - invSum) > DEVIG_SUM_TOLERANCE) {
    return fail(`arb-scan: kernel invSum ${arb.invSum} disagrees with recomputed ${invSum}`);
  }
  return ok({ arbFound: true, arb, noArbReason: null, bestLegs, invSum, menuImpliedSum: invSum });
}

export interface PromoExtractionResult {
  /** Dollars. Negative means no extraction value â€” a pass, not a loss to take. */
  readonly extractionValue: number;
  readonly positive: boolean;
  readonly hedgeStake: number;
  /** Dollars. The worse of the two cash outcomes, plus the coupon. May be negative. */
  readonly hedgedWorstCase: number;
  readonly hedgedIsRiskFreePositive: boolean;
  readonly qualifyingImpliedProb: number;
}

export function evalPromoExtraction(
  promo: PromoTerms,
  hedgeDecimal?: number,
): MarketsEval<PromoExtractionResult> {
  if (!finite(promo.stake) || promo.stake <= 0) {
    return fail(`promo: stake ${promo.stake} must be positive`);
  }
  if (!finite(promo.bonusBet) || promo.bonusBet < 0) {
    return fail(`promo: bonusBet ${promo.bonusBet} must be non-negative`);
  }
  if (!finite(promo.stakeOddsAmerican) || promo.stakeOddsAmerican === 0) {
    return fail(`promo: stakeOddsAmerican ${String(promo.stakeOddsAmerican)} is unusable`);
  }
  if (promo.bonusBetEvPerDollar !== undefined && !finite(promo.bonusBetEvPerDollar)) {
    return fail("promo: bonusBetEvPerDollar is not finite");
  }
  if (promo.profitBoost !== undefined && (!finite(promo.profitBoost) || promo.profitBoost < 0)) {
    return fail(`promo: profitBoost ${String(promo.profitBoost)} must be non-negative`);
  }
  if (hedgeDecimal !== undefined && (!finite(hedgeDecimal) || hedgeDecimal <= 1)) {
    return fail(`promo: hedge decimal odds ${String(hedgeDecimal)} must exceed 1`);
  }
  let value: number;
  let q: number;
  let hedged: { hedgeStake: number; worstCase: number } | null = null;
  try {
    value = evaluatePromo(promo);
    q = impliedProb(americanToDecimal(promo.stakeOddsAmerican));
    if (hedgeDecimal !== undefined) hedged = hedgedPromoValue(promo, hedgeDecimal);
  } catch (err) {
    return fail(`promo threw: ${msg(err)}`);
  }
  if (!finite(value)) return fail(`promo: extraction value ${value} is not finite`);
  if (!unit(q)) return fail(`promo: qualifying implied probability ${q} outside [0,1]`);
  if (hedged !== null) {
    if (!finite(hedged.hedgeStake) || hedged.hedgeStake < 0) {
      return fail(`promo: hedge stake ${hedged.hedgeStake} invalid`);
    }
    if (!finite(hedged.worstCase)) {
      return fail(`promo: hedged worst case ${hedged.worstCase} is not finite`);
    }
  }
  return ok({
    extractionValue: value,
    positive: value > 0,
    hedgeStake: hedged?.hedgeStake ?? 0,
    hedgedWorstCase: hedged?.worstCase ?? 0,
    hedgedIsRiskFreePositive: hedged !== null && hedged.worstCase > 0,
    qualifyingImpliedProb: q,
  });
}

// ---------------------------------------------------------------------------
// 9. oo-epc â€” de-vig, then prove the probabilities sum to the target
// ---------------------------------------------------------------------------

export interface OoeDevigResult {
  readonly multiplicative: readonly number[];
  readonly oneOverEpc: readonly number[];
  readonly flGlm: readonly number[];
  readonly target: number;
  readonly sumErrors: {
    readonly multiplicative: number;
    readonly oneOverEpc: number;
    readonly flGlm: number;
  };
}

export function evalOoeDevig(
  odds: readonly number[],
  target = 1,
  beta = 1,
): MarketsEval<OoeDevigResult> {
  if (!Array.isArray(odds) || odds.length < 2) {
    return fail("oo-epc: need >= 2 decimal odds for a meaningful overround");
  }
  if (!odds.every(finite)) return fail(`oo-epc: non-finite odds ${fmt(odds)}`);
  for (const o of odds) {
    if (o <= 1) return fail(`oo-epc: odds ${o} must exceed 1`);
  }
  if (!finite(target) || target <= 0 || target > odds.length) {
    return fail(`oo-epc: target ${target} must lie in (0, ${odds.length}]`);
  }
  if (!finite(beta) || beta <= 0) return fail(`oo-epc: beta ${beta} must be positive`);
  let mult: number[];
  let epc: number[];
  let glm: number[];
  try {
    const mutableOdds = [...odds];
    mult = multiplicativeNormalize(mutableOdds);
    epc = ooEpc(mutableOdds, target);
    glm = flGlm(mutableOdds, beta);
  } catch (err) {
    return fail(`oo-epc threw: ${msg(err)}`);
  }
  for (const [name, v] of [
    ["multiplicativeNormalize", mult],
    ["ooEpc", epc],
    ["flGlm", glm],
  ] as const) {
    if (!isProbVector(v, target)) {
      if (!allUnit(v)) {
        return fail(`oo-epc ${name}: element(s) outside [0,1] in ${fmt(v)}`);
      }
      return fail(
        `oo-epc ${name}: probabilities sum to ${sum(v).toFixed(12)}, not the requested ` +
          `target ${target} (off by ${Math.abs(sum(v) - target).toExponential(3)}, ` +
          `tolerance ${DEVIG_SUM_TOLERANCE})`,
      );
    }
  }
  return ok({
    multiplicative: mult,
    oneOverEpc: epc,
    flGlm: glm,
    target,
    sumErrors: {
      multiplicative: Math.abs(sum(mult) - target),
      oneOverEpc: Math.abs(sum(epc) - target),
      flGlm: Math.abs(sum(glm) - target),
    },
  });
}

// ---------------------------------------------------------------------------
// 10. favorite-longshot audit â€” a measured quantity with its sample size
// ---------------------------------------------------------------------------

export interface FlbAuditResult {
  readonly buckets: readonly BucketRoi[];
  /** OLS slope of logit(realized) on logit(implied) across qualifying buckets. */
  readonly flbSlope: number;
  readonly totalSample: number;
  readonly qualifyingBucketCount: number;
  /** The spread of implied probabilities the slope was actually fit on. */
  readonly impliedSpan: number;
  /** The measured quantity, with its evidence. Not a verdict on any bookmaker. */
  readonly measured: string;
}

export function evalFavoriteLongshotAudit(
  buckets: readonly OddsBucket[],
): MarketsEval<FlbAuditResult> {
  if (!Array.isArray(buckets) || buckets.length < 2) {
    return fail("flb-audit: need >= 2 odds buckets to fit a slope");
  }
  for (const b of buckets) {
    if (typeof b.label !== "string" || b.label.trim() === "") {
      return fail("flb-audit: a bucket has no label");
    }
    if (!finite(b.minOdds) || !finite(b.maxOdds) || b.maxOdds <= b.minOdds) {
      return fail(`flb-audit: ${b.label} has a degenerate price range`);
    }
    if (b.implied.length !== b.outcomes.length) {
      return fail(
        `flb-audit: ${b.label} has ${b.implied.length} implied probabilities for ` +
          `${b.outcomes.length} outcomes â€” the kernel would silently impute`,
      );
    }
    if (b.outcomes.length === 0) return fail(`flb-audit: ${b.label} has no observations`);
    // The kernel never checks these, and a bad implied value silently yields
    // negative decimal odds. The bridge checks rather than trusting.
    for (const p of b.implied) {
      if (!unit(p) || p === 0) {
        return fail(`flb-audit: ${b.label} implied probability ${p} outside (0,1]`);
      }
    }
    for (const y of b.outcomes) {
      if (y !== 0 && y !== 1) return fail(`flb-audit: ${b.label} outcome ${y} is not 0 or 1`);
    }
  }
  let stats: BucketRoi[];
  try {
    stats = bucketRoi([...buckets]);
  } catch (err) {
    return fail(`flb-audit threw: ${msg(err)}`);
  }
  // Qualification and price spread are checked BEFORE the slope fit, so the
  // caller gets the real reason rather than the kernel's generic throw.
  const qualifying = stats.filter((b) => b.n >= 10);
  if (qualifying.length < 2) {
    return fail(`flb-audit: only ${qualifying.length} buckets reach the n >= 10 qualification`);
  }
  for (const s of stats) {
    if (!finite(s.roi) || !unit(s.outcomeRate) || !unit(s.meanImplied)) {
      return fail(
        `flb-audit: ${s.label} produced roi=${s.roi} outcomeRate=${s.outcomeRate} meanImplied=${s.meanImplied}`,
      );
    }
  }
  const means = qualifying.map((b) => b.meanImplied);
  const impliedSpan = Math.max(...means) - Math.min(...means);
  if (!(impliedSpan > 1e-6)) {
    return fail("flb-audit: qualifying buckets span no range of implied probabilities");
  }
  let slope: number;
  try {
    slope = flbSlope(stats);
  } catch (err) {
    return fail(`flb-audit slope fit threw: ${msg(err)}`);
  }
  if (!finite(slope)) return fail(`flb-audit: slope ${slope} is not finite`);
  const totalSample = stats.reduce((a, b) => a + b.n, 0);
  return ok({
    buckets: stats,
    flbSlope: slope,
    totalSample,
    qualifyingBucketCount: qualifying.length,
    impliedSpan,
    measured:
      `logit(realized win rate) regressed on logit(mean implied probability) across ` +
      `${qualifying.length} qualifying buckets, ${totalSample} bets: slope ${slope.toFixed(4)}. ` +
      `A slope near zero means no favorite-longshot bias was detected in this sample; ` +
      `it is not a judgement about any bookmaker.`,
  });
}

// ---------------------------------------------------------------------------
// 11. odds-history fusion â€” convex blend, checked against the module's own gate
// ---------------------------------------------------------------------------

export interface FusionResult {
  readonly fit: FusionFit;
  readonly gate: "ADOPT" | "REJECT";
  /** The module ships ENABLED = false. Wired is not the same as adopted. */
  readonly moduleEnabled: boolean;
  readonly p: number;
  readonly fusedLogLoss: number;
  readonly historyLogLoss: number;
  readonly oddsLogLoss: number;
  /** Fused vector for row 0. Still a probability vector, so it sums to 1. */
  readonly sampleFused: readonly number[];
  /** The honesty rule: p near 0 means the market already prices everything. */
  readonly collapsedToMarket: boolean;
  readonly holdoutSize: number;
  /** Log-loss the fusion gained over the history-only baseline. */
  readonly gainOverHistory: number;
  readonly gainOverOdds: number;
}

export function evalOddsHistoryFusion(
  hist: readonly (readonly number[])[],
  odds: readonly (readonly number[])[],
  outcomes: readonly number[],
  pairedSe: number,
  p?: number,
): MarketsEval<FusionResult> {
  if (!Array.isArray(hist) || hist.length === 0) return fail("fusion: no history rows");
  if (hist.length !== odds.length || hist.length !== outcomes.length) {
    return fail("fusion: history / odds / outcome row counts differ");
  }
  if (hist.length < 2) {
    return fail(`fusion: ${hist.length} holdout row(s), need >= 2 to fit a weight`);
  }
  for (let i = 0; i < hist.length; i++) {
    const h = hist[i];
    const o = odds[i];
    if (h === undefined || o === undefined) return fail(`fusion: row ${i} missing`);
    if (h.length !== o.length || h.length < 2) {
      return fail(`fusion: row ${i} history/odds length mismatch`);
    }
    // De-vig consistency: a probability vector must sum to 1 before it is fused.
    if (!isProbVector(h)) {
      return fail(`fusion: row ${i} history vector ${fmt(h)} is not a probability vector (must sum to 1)`);
    }
    if (!isProbVector(o)) {
      return fail(`fusion: row ${i} odds vector ${fmt(o)} is not a probability vector (must sum to 1)`);
    }
    const y = outcomes[i];
    if (y === undefined || !Number.isInteger(y) || y < 0 || y >= h.length) {
      return fail(`fusion: row ${i} outcome ${String(y)} is not a valid class index`);
    }
  }
  if (!finite(pairedSe) || pairedSe <= 0) {
    return fail(`fusion: paired standard error ${pairedSe} must be positive`);
  }
  if (p !== undefined && !unit(p)) return fail(`fusion: p ${p} outside [0,1]`);
  const sampleRaw = odds[0];
  if (sampleRaw === undefined) return fail("fusion: no odds row to de-vig");
  let devigged: number[];
  try {
    devigged = historyDevig([...sampleRaw]);
  } catch (err) {
    return fail(`fusion de-vig threw: ${msg(err)}`);
  }
  if (!isProbVector(devigged)) {
    return fail(`fusion de-vig: result ${fmt(devigged)} is not a probability vector`);
  }
  let fit: FusionFit;
  let gate: "ADOPT" | "REJECT";
  let sampleFused: number[];
  try {
    const mutableHist = hist.map((r) => [...r]);
    const mutableOdds = odds.map((r) => [...r]);
    fit = fitFusionWeight(mutableHist, mutableOdds, [...outcomes]);
    gate = fusionGate(fit, pairedSe);
    sampleFused = convexFuse([...(hist[0] ?? [])], [...(odds[0] ?? [])], p ?? fit.p);
  } catch (err) {
    return fail(`fusion threw: ${msg(err)}`);
  }
  if (!unit(fit.p)) return fail(`fusion: fitted weight p=${fit.p} outside [0,1]`);
  for (const [name, v] of [
    ["fusedLogLoss", fit.fusedLogLoss],
    ["historyLogLoss", fit.histLogLoss],
    ["oddsLogLoss", fit.oddsLogLoss],
  ] as const) {
    if (!finite(v) || v < 0) {
      return fail(`fusion: ${name} = ${v} is not a non-negative finite log-loss`);
    }
  }
  if (gate !== "ADOPT" && gate !== "REJECT") {
    return fail(`fusion: gate returned "${String(gate)}"`);
  }
  if (!isProbVector(sampleFused)) {
    return fail(`fusion: fused vector ${fmt(sampleFused)} is not a probability vector`);
  }
  return ok({
    fit,
    gate,
    moduleEnabled: FUSION_ENABLED,
    p: fit.p,
    fusedLogLoss: fit.fusedLogLoss,
    historyLogLoss: fit.histLogLoss,
    oddsLogLoss: fit.oddsLogLoss,
    sampleFused,
    collapsedToMarket: fit.p < 0.02,
    holdoutSize: hist.length,
    gainOverHistory: fit.histLogLoss - fit.fusedLogLoss,
    gainOverOdds: fit.oddsLogLoss - fit.fusedLogLoss,
  });
}

// ---------------------------------------------------------------------------
// 12. ML market pooling â€” the pooled vector must still be a probability
// ---------------------------------------------------------------------------

/**
 * `fitAlpha` in 1106-4509 declares its row argument as `ProbVector[][]`, one
 * level deeper than the code actually uses: it indexes `memberProbs[e]` and
 * hands that straight to `interpolatedPool(members: ProbVector[])`, so the
 * runtime shape is `ProbVector[]`. The declaration is wrong, the kernel is not
 * (a sibling agent and this file both run it on flat rows successfully). The
 * source file is read-only here, so the mismatch is absorbed once, here, with
 * a single documented assertion instead of `@ts-expect-error` or `any`.
 */
type AlphaFitter = (rows: ProbVector[], outcomes: number[], weights: number[], grid: number) => AlphaFit;
const fitAlphaRows = fitAlpha as (r: unknown, o: number[], w: number[], g: number) => AlphaFit;

export interface MarketPoolingResult {
  /** Null because the kernel's alpha fit cannot run. See alphaFitBlockedReason. */
  readonly alphaFit: AlphaFit | null;
  /** Why alphaFit is null, verbatim from the kernel, or null when it succeeded. */
  readonly alphaFitBlockedReason: string | null;
  readonly mixture: readonly number[];
  readonly product: readonly number[];
  readonly interpolated: readonly number[];
  /** Reweighted member wealth. A distribution over members, so it sums to 1. */
  readonly wealth: readonly number[];
  readonly memberCount: number;
  readonly outcomeCount: number;
  readonly moduleEnabled: boolean;
  readonly mixtureLogLoss: number;
  /** The pooled vectors are probabilities, so they sum to 1 or this fails. */
  readonly mixtureSumError: number;
}

export function evalMarketPooling(
  memberProbs: readonly (readonly number[])[],
  weights: readonly number[],
  outcomes: readonly number[],
  grid = 21,
): MarketsEval<MarketPoolingResult> {
  if (!Array.isArray(memberProbs) || memberProbs.length < 2) {
    return fail("pooling: need >= 2 member forecasts to pool");
  }
  if (!Array.isArray(weights) || weights.length !== memberProbs.length) {
    return fail(`pooling: ${weights?.length ?? 0} weights for ${memberProbs.length} members`);
  }
  if (!weights.every((w) => finite(w) && w > 0)) {
    return fail(`pooling: weights must be strictly positive, got ${fmt(weights)}`);
  }
  if (!Array.isArray(outcomes) || outcomes.length !== memberProbs.length) {
    return fail(`pooling: ${outcomes?.length ?? 0} outcomes for ${memberProbs.length} member rows`);
  }
  if (!Number.isInteger(grid) || grid < 2) {
    return fail(`pooling: grid ${grid} must be an integer >= 2`);
  }
  const k = memberProbs[0]?.length ?? 0;
  if (k < 2) return fail(`pooling: probability vectors need >= 2 outcomes, got ${k}`);
  const memberOutcomeProbs: number[] = [];
  for (let i = 0; i < memberProbs.length; i++) {
    const row = memberProbs[i];
    if (row === undefined || row.length !== k) {
      return fail(`pooling: member row ${i} length differs from ${k}`);
    }
    if (!isProbVector(row)) {
      return fail(`pooling: member row ${i} ${fmt(row)} is not a probability vector (must sum to 1)`);
    }
    const y = outcomes[i];
    if (y === undefined || !Number.isInteger(y) || y < 0 || y >= k) {
      return fail(`pooling: outcome ${String(y)} at row ${i} is not a valid class index`);
    }
    const assigned = row[y];
    memberOutcomeProbs.push(assigned === undefined ? 0 : assigned);
  }
  const members: ProbVector[] = memberProbs.map((r) => [...r]);
  const w = [...weights];
  const ys = [...outcomes];
  let mixture: number[];
  let product: number[];
  let interpolated: number[];
  let wealth: number[];
  let alphaFit: AlphaFit | null = null;
  let alphaFitBlockedReason: string | null = null;
  // Freshly copied vectors: the pooling kernels are pure, but the copies make
  // that guarantee local rather than assumed.
  const pools: ProbVector[] = members.map((m) => [...m]);
  const fitAlphaTyped: AlphaFitter = fitAlphaRows;
  try {
    mixture = mixturePool(pools, w);
    product = productPool(pools, w);
    interpolated = interpolatedPool(pools, w, 0.5);
    wealth = updateWealth(
      pools.map((m) => m[0] ?? 0.5),
      memberOutcomeProbs,
      1,
    );
  } catch (err) {
    return fail(`pooling threw: ${msg(err)}`);
  }
  // KNOWN KERNEL DEFECT, not worked around: `fitAlpha` hands a single row
  // (`memberProbs[e]`) to `interpolatedPool`, which expects an array of member
  // vectors and reads `members[0].length` off it. The row is a number, so the
  // length is undefined and its internal `normalize` throws
  // "cannot normalize non-positive vector" for every input. The source module
  // is read-only here, so the bridge reports the fit as unavailable with the
  // kernel's own message rather than silently returning a substitute number.
  try {
    alphaFit = fitAlphaTyped(pools, ys, w, grid);
  } catch (err) {
    alphaFit = null;
    alphaFitBlockedReason = msg(err);
  }
  for (const [name, v] of [
    ["mixturePool", mixture],
    ["productPool", product],
    ["interpolatedPool", interpolated],
    ["updateWealth", wealth],
  ] as const) {
    if (!isProbVector(v)) {
      if (!allUnit(v)) {
        return fail(`pooling ${name}: element(s) outside [0,1] in ${fmt(v)}`);
      }
      return fail(`pooling ${name}: result ${fmt(v)} sums to ${sum(v).toFixed(9)}, not 1`);
    }
  }
  if (alphaFit !== null) {
    if (!finite(alphaFit.alpha) || !unit(alphaFit.alpha)) {
      return fail(`pooling: fitted alpha ${alphaFit.alpha} outside [0,1]`);
    }
    if (!finite(alphaFit.avgLogLoss) || alphaFit.avgLogLoss < 0) {
      return fail(`pooling: avgLogLoss ${alphaFit.avgLogLoss} invalid`);
    }
  }
  return ok({
    alphaFit,
    alphaFitBlockedReason,
    mixture,
    product,
    interpolated,
    wealth,
    memberCount: members.length,
    outcomeCount: k,
    moduleEnabled: POOLING_ENABLED,
    mixtureLogLoss: -Math.log(Math.max(mixture[ys[0] ?? 0] ?? 1e-12, 1e-12)),
    mixtureSumError: Math.abs(sum(mixture) - 1),
  });
}

// ---------------------------------------------------------------------------
// 13. social volume momentum â€” a z-score, deliberately NOT a probability
// ---------------------------------------------------------------------------

export interface VolumeMomentumResult {
  readonly ewma: readonly number[];
  /** Z-scored momentum. A standardised feature, explicitly not a win probability. */
  readonly momentumZ: readonly number[];
  /** Lexicon sentiment in [-1, 1]. A heuristic score, not a probability. */
  readonly injurySentiment: number;
  readonly features: readonly TotalsFeatures[];
  readonly weekCount: number;
  readonly moduleEnabled: boolean;
  /** Always false. Present so no caller can read a feature vector as a forecast. */
  readonly isProbability: false;
  /** True when the z-scores are centred, i.e. they really are a standardisation. */
  readonly zScoreCentred: boolean;
}

export function evalVolumeMomentum(
  weeklyVolumes: readonly number[],
  headlines: readonly (readonly string[])[],
  theta = 0.2,
): MarketsEval<VolumeMomentumResult> {
  if (!Array.isArray(weeklyVolumes) || weeklyVolumes.length < 2) {
    return fail("social-momentum: need >= 2 weeks of volumes to estimate momentum");
  }
  if (!weeklyVolumes.every((v) => finite(v) && v >= 0)) {
    return fail(`social-momentum: volumes must be non-negative, got ${fmt(weeklyVolumes)}`);
  }
  const mean = sum(weeklyVolumes) / weeklyVolumes.length;
  if (!(mean > 0)) return fail("social-momentum: mean volume is zero â€” nothing to momentum");
  if (!finite(theta) || theta <= 0 || theta > 1) {
    return fail(`social-momentum: theta ${theta} must lie in (0, 1]`);
  }
  if (!Array.isArray(headlines)) return fail("social-momentum: headlines must be an array");
  for (const h of headlines) {
    if (!Array.isArray(h) || h.some((x) => typeof x !== "string")) {
      return fail("social-momentum: headlines must be an array of string arrays");
    }
  }
  if (headlines.length !== weeklyVolumes.length) {
    return fail(
      `social-momentum: ${headlines.length} headline weeks for ${weeklyVolumes.length} volume weeks`,
    );
  }
  let e: number[];
  let z: number[];
  let sentiment: number;
  let features: TotalsFeatures[];
  try {
    e = ewma([...weeklyVolumes], theta);
    z = volumeMomentumFeature([...weeklyVolumes], theta);
    sentiment = beatWriterSentiment(headlines.flat().map((h) => h));
    features = totalsModelFeatures([...weeklyVolumes], headlines.map((h) => [...h]), theta);
  } catch (err) {
    return fail(`social-momentum threw: ${msg(err)}`);
  }
  if (!e.every(finite) || !z.every(finite)) {
    return fail("social-momentum: EWMA or z-score series is not finite");
  }
  if (!finite(sentiment) || sentiment < -1 || sentiment > 1) {
    return fail(`social-momentum: sentiment ${sentiment} outside [-1, 1]`);
  }
  if (features.length !== weeklyVolumes.length) {
    return fail(`social-momentum: ${features.length} feature rows for ${weeklyVolumes.length} weeks`);
  }
  for (const f of features) {
    if (!finite(f.volumeMomentum) || !finite(f.injurySentiment)) {
      return fail("social-momentum: a feature row is not finite");
    }
  }
  const zMean = sum(z) / z.length;
  const zSd = Math.sqrt(sum(z.map((x) => (x - zMean) ** 2)) / z.length);
  if (!(zSd > 0)) return fail("social-momentum: momentum z-scores have no dispersion");
  return ok({
    ewma: e,
    momentumZ: z,
    injurySentiment: sentiment,
    features,
    weekCount: weeklyVolumes.length,
    moduleEnabled: SOCIAL_ENABLED,
    isProbability: false,
    zScoreCentred: Math.abs(zMean) < 1e-9,
  });
}

// ---------------------------------------------------------------------------
// 14. spread win-probability table â€” skill metrics on a real settled sample
// ---------------------------------------------------------------------------

export interface SpreadSkillResult {
  readonly brier: number;
  readonly logLoss: number;
  readonly ece: number;
  /**
   * Ranked probability score of the first supplied K-class distribution. Null
   * when none was supplied: RPS is only defined over a full distribution, and
   * scoring a row of independent binary probabilities against it would
   * manufacture a number the kernel cannot justify.
   */
  readonly rankedProb: number | null;
  readonly pairedTStat: number;
  readonly pairedP: number;
  readonly spearman: number;
  readonly fbeta: number;
  readonly classWeightedBce: number;
  readonly normalCdfAtZero: number;
  readonly sampleSize: number;
  readonly moduleEnabled: boolean;
  /** Brier on a constant 0.5 forecast. A reference constant, so the score is readable. */
  readonly brierFloor: number;
}

export function evalSpreadSkill(
  ps: readonly number[],
  ys: readonly number[],
  outcomeIdx = 0,
  baselineDiffs?: readonly number[],
  distributions?: readonly (readonly number[])[],
): MarketsEval<SpreadSkillResult> {
  if (!Array.isArray(ps) || !Array.isArray(ys)) {
    return fail("spread-skill: forecasts and outcomes must be arrays");
  }
  if (ps.length === 0) return fail("spread-skill: empty sample");
  if (ps.length !== ys.length) {
    return fail(`spread-skill: ${ps.length} forecasts for ${ys.length} outcomes`);
  }
  if (!ps.every(unit)) {
    return fail(`spread-skill: probabilities outside [0,1]: ${fmt(ps)}`);
  }
  for (const y of ys) {
    if (y !== 0 && y !== 1) return fail(`spread-skill: outcome ${String(y)} is not 0 or 1`);
  }
  if (!Number.isInteger(outcomeIdx) || outcomeIdx < 0) {
    return fail(`spread-skill: outcomeIdx ${outcomeIdx} is not a non-negative integer`);
  }
  if (baselineDiffs !== undefined && baselineDiffs.length < 2) {
    return fail(`spread-skill: ${baselineDiffs.length} baseline diffs, need >= 2 for a paired test`);
  }
  if (baselineDiffs !== undefined && !baselineDiffs.every(finite)) {
    return fail("spread-skill: baseline diffs are not finite");
  }
  if (distributions !== undefined) {
    if (!Array.isArray(distributions) || distributions.length === 0) {
      return fail("spread-skill: distributions supplied but empty");
    }
    const d0 = distributions[0];
    if (d0 === undefined || d0.length < 2) {
      return fail("spread-skill: a K-class distribution needs >= 2 classes");
    }
    for (let i = 0; i < distributions.length; i++) {
      const d = distributions[i];
      if (d === undefined || d.length !== d0.length) {
        return fail(`spread-skill: distribution ${i} length differs from ${d0.length}`);
      }
      if (!isProbVector(d)) {
        return fail(
          `spread-skill: distribution ${i} ${fmt(d)} is not a probability vector (must sum to 1)`,
        );
      }
    }
    if (outcomeIdx >= d0.length) {
      return fail(`spread-skill: outcomeIdx ${outcomeIdx} is outside the ${d0.length} classes`);
    }
  }
  let b: number;
  let ll: number;
  let ece: number;
  let rps: number | null = null;
  let t: { t: number; p: number };
  let sp: number;
  let fb: number;
  let cw: number;
  try {
    b = brierScore(ps, ys);
    ll = binaryLogLoss(ps, ys);
    ece = eceProbs(ps, ys, 10);
    if (distributions !== undefined) {
      const first = distributions[0];
      if (first !== undefined) rps = rankedProbScore([...first], outcomeIdx);
    }
    t = pairedT(baselineDiffs ?? ps.map((p, i) => p - (ys[i] ?? 0)));
    sp = spearman(ps, ys);
    const head = ps[0] ?? 0.5;
    const headY = ys[0] ?? 0;
    fb = fbeta(headY, head, 1);
    cw = classWeightedBCE(head, headY, 2);
  } catch (err) {
    return fail(`spread-skill threw: ${msg(err)}`);
  }
  if (!finite(b) || b < 0 || b > 1) return fail(`spread-skill: Brier ${b} outside [0,1]`);
  if (!finite(ll) || ll < 0) return fail(`spread-skill: log-loss ${ll} invalid`);
  if (!finite(ece) || ece < 0 || ece > 1) return fail(`spread-skill: ECE ${ece} outside [0,1]`);
  if (rps !== null && (!finite(rps) || rps < 0 || rps > 1)) {
    return fail(`spread-skill: RPS ${rps} outside [0,1]`);
  }
  if (!finite(t.t) || !approxP(t.p)) return fail(`spread-skill: paired t=${t.t} p=${t.p} invalid`);
  if (!finite(sp) || Math.abs(sp) > 1) return fail(`spread-skill: Spearman ${sp} outside [-1,1]`);
  if (!finite(fb) || fb < 0 || fb > 1) return fail(`spread-skill: F-beta ${fb} outside [0,1]`);
  if (!finite(cw) || cw < 0) return fail(`spread-skill: class-weighted BCE ${cw} invalid`);
  const cdf0 = normalCdfLocal(0);
  if (!finite(cdf0) || Math.abs(cdf0 - 0.5) > 1e-3) {
    return fail(`spread-skill: normal CDF at 0 is ${cdf0}, expected ~0.5`);
  }
  return ok({
    brier: b,
    logLoss: ll,
    ece,
    rankedProb: rps,
    pairedTStat: t.t,
    pairedP: t.p,
    spearman: sp,
    fbeta: fb,
    classWeightedBce: cw,
    normalCdfAtZero: cdf0,
    sampleSize: ps.length,
    moduleEnabled: SPREAD_TABLE_ENABLED,
    brierFloor: 0.25,
  });
}

// ---------------------------------------------------------------------------
// 15. static-theta threshold policy â€” Kelly sizing that refuses to go negative
// ---------------------------------------------------------------------------

export interface KellySizingResult {
  readonly fullKelly: number;
  /** Capped, non-negative stake fraction. Never negative. */
  readonly stakeFraction: number;
  /** True only when the bet is worth taking at all. */
  readonly bettable: boolean;
  readonly drawdownScaled: number;
  readonly growthRate: number;
  /** The decision string a caller should branch on. A no-bet is a finding. */
  readonly decision: "BET" | "PASS";
  readonly moduleEnabled: boolean;
}

export function evalKellySizing(
  p: number,
  netOdds: number,
  fraction: number,
  maxFraction: number,
  bankrollPeak: number,
  bankrollCurrent: number,
  maxDrawdown: number,
): MarketsEval<KellySizingResult> {
  if (!unit(p)) return fail(`kelly: p=${p} outside [0,1]`);
  if (!finite(netOdds) || netOdds <= 0) return fail(`kelly: net odds ${netOdds} must be positive`);
  if (!finite(fraction) || fraction < 0 || fraction > 1) {
    return fail(`kelly: fraction ${fraction} must lie in [0, 1]`);
  }
  if (!finite(maxFraction) || maxFraction < 0) {
    return fail(`kelly: maxFraction ${maxFraction} must be non-negative`);
  }
  if (!finite(bankrollPeak) || bankrollPeak <= 0) {
    return fail(`kelly: bankrollPeak ${bankrollPeak} must be positive`);
  }
  if (!finite(bankrollCurrent) || bankrollCurrent < 0) {
    return fail(`kelly: bankrollCurrent ${bankrollCurrent} must be non-negative`);
  }
  if (!finite(maxDrawdown) || maxDrawdown <= 0 || maxDrawdown > 1) {
    return fail(`kelly: maxDrawdown ${maxDrawdown} must lie in (0, 1]`);
  }
  let fk: number;
  let sized: number;
  let scaled: number;
  let growth: number;
  try {
    fk = kellyBinary(p, netOdds);
    sized = kellySized(p, netOdds, fraction, maxFraction);
    scaled = drawdownGate(sized, bankrollPeak, bankrollCurrent, maxDrawdown);
    // Growth is evaluated at the FULL Kelly fraction, which is where the
    // strategy is defined; -Infinity is a legitimate kernel answer and is
    // reported rather than smoothed away.
    growth = kellyGrowthRate(p, netOdds, fk);
  } catch (err) {
    return fail(`kelly threw: ${msg(err)}`);
  }
  if (!finite(fk)) return fail(`kelly: full Kelly fraction ${fk} is not finite`);
  // A negative full-Kelly fraction is a PASS, not a short.
  if (!finite(sized) || sized < 0) return fail(`kelly: stake fraction ${sized} is negative`);
  if (!finite(scaled) || scaled < 0) return fail(`kelly: drawdown-scaled size ${scaled} is negative`);
  if (sized > maxFraction + DEVIG_SUM_TOLERANCE) {
    return fail(`kelly: stake fraction ${sized} exceeded the cap ${maxFraction}`);
  }
  if (scaled > sized + DEVIG_SUM_TOLERANCE) {
    return fail(`kelly: drawdown gate increased the stake from ${sized} to ${scaled}`);
  }
  if (growth === -Infinity) {
    return fail("kelly: growth rate is -Infinity â€” full Kelly would wipe the bankroll");
  }
  if (!finite(growth)) return fail(`kelly: growth rate ${growth} is not finite`);
  const bettable = fk > 0 && scaled > 0;
  return ok({
    fullKelly: fk,
    stakeFraction: sized,
    bettable,
    drawdownScaled: scaled,
    growthRate: growth,
    decision: bettable ? "BET" : "PASS",
    moduleEnabled: THETA_POLICY_ENABLED,
  });
}

// ---------------------------------------------------------------------------
// 16. DCP prop framework â€” count distributions, checked for legality
// ---------------------------------------------------------------------------

export interface CountModelResult {
  readonly meanCount: number;
  readonly poissonLogLik: number;
  readonly negBinMean: number;
  readonly negBinShape: number;
  readonly negBinProb: number;
  readonly zinbPmfAtZero: number;
  readonly countMin: number;
  readonly countMax: number;
  readonly moduleEnabled: boolean;
  /** Poisson PMF at the observed mean, a real number, not a placeholder. */
  readonly poissonPmfAtMean: number;
  /** Poisson probabilities must sum to ~1 over the observed support. */
  readonly poissonMass: number;
}

export function evalCountModel(
  counts: readonly number[],
  pi: number,
): MarketsEval<CountModelResult> {
  if (!Array.isArray(counts) || counts.length < 2) {
    return fail("count-model: need >= 2 observations");
  }
  for (const c of counts) {
    if (!Number.isInteger(c) || c < 0) {
      return fail(`count-model: ${String(c)} is not a non-negative integer count`);
    }
  }
  if (!finite(pi) || pi < 0 || pi >= 1) {
    return fail(`count-model: zero-inflation pi=${pi} must lie in [0, 1)`);
  }
  const mle = poissonMle(counts);
  if (!finite(mle) || mle < 0) return fail(`count-model: Poisson MLE ${mle} invalid`);
  let ll: number;
  let moments: { r: number; p: number };
  let zinb0: number;
  let pmfAtMean: number;
  try {
    ll = poissonLogLik(counts, counts.map(() => mle));
    moments = negBinMoments(counts);
    zinb0 = zinbPmf(0, pi, moments.r, moments.p);
    pmfAtMean = poissonPmf(Math.round(mle), mle);
  } catch (err) {
    return fail(`count-model threw: ${msg(err)}`);
  }
  if (!finite(ll)) return fail(`count-model: Poisson log-likelihood ${ll} is not finite`);
  if (!finite(moments.r) || moments.r <= 0) {
    return fail(`count-model: negative-binomial shape r=${moments.r} is not positive`);
  }
  if (!finite(moments.p) || moments.p <= 0 || moments.p > 1) {
    return fail(`count-model: negative-binomial p=${moments.p} outside (0, 1]`);
  }
  if (!unit(zinb0)) {
    return fail(`count-model: zero-inflated PMF at 0 is ${zinb0}, outside [0,1]`);
  }
  if (!finite(pmfAtMean) || pmfAtMean < 0 || pmfAtMean > 1) {
    return fail(`count-model: Poisson PMF at the mean is ${pmfAtMean}, outside [0,1]`);
  }
  const kMax = Math.max(...counts);
  // The Poisson support is infinite. Summing only to the largest observed count
  // would always lose tail mass and read as a broken fit, so the sum runs to a
  // point where the remaining tail is far below the tolerance.
  const kLimit = Math.max(kMax, Math.ceil(mle + 10 * Math.sqrt(mle + 1)) + 1);
  const pmfs = Array.from({ length: kLimit + 1 }, (_, k) => poissonPmf(k, mle));
  if (!pmfs.every((v) => unit(v))) {
    return fail(`count-model: Poisson PMF is not a probability vector ${fmt(pmfs)}`);
  }
  const mass = sum(pmfs);
  if (Math.abs(mass - 1) > 1e-3) {
    return fail(
      `count-model: Poisson mass over k=0..${kLimit} is ${mass.toFixed(9)}, not 1`,
    );
  }
  return ok({
    meanCount: mle,
    poissonLogLik: ll,
    negBinMean: sum(counts) / counts.length,
    negBinShape: moments.r,
    negBinProb: moments.p,
    zinbPmfAtZero: zinb0,
    countMin: Math.min(...counts),
    countMax: kMax,
    moduleEnabled: DCP_ENABLED,
    poissonPmfAtMean: pmfAtMean,
    poissonMass: mass,
  });
}

// ---------------------------------------------------------------------------
// 17. imitation in-play bandit policies â€” arm choices under a seeded RNG
// ---------------------------------------------------------------------------

export interface BanditPolicyResult {
  /** Index of the arm each policy chose on every one of `steps` trials. */
  readonly epsilonGreedy: readonly number[];
  readonly ucb1: readonly number[];
  readonly thompson: readonly number[];
  readonly finalEpsilon: number;
  readonly armCount: number;
  readonly steps: number;
  /** Share of UCB1 pulls that went to the best-known arm. A real diagnostic. */
  readonly ucb1GreedyShare: number;
  readonly moduleEnabled: boolean;
}

export function evalBanditPolicies(
  q: readonly number[],
  counts: readonly number[],
  means: readonly number[],
  alphas: readonly number[],
  betas: readonly number[],
  eps0: number,
  decay: number,
  steps: number,
  seed: number,
): MarketsEval<BanditPolicyResult> {
  if (!Array.isArray(q) || q.length < 2) return fail("bandit: need >= 2 arms");
  if (!q.every(finite)) return fail(`bandit: q values not finite ${fmt(q)}`);
  const n = q.length;
  if (counts.length !== n || means.length !== n) {
    return fail(`bandit: ${counts.length} counts / ${means.length} means for ${n} arms`);
  }
  if (!counts.every((c) => finite(c) && c >= 0)) {
    return fail(`bandit: counts must be non-negative ${fmt(counts)}`);
  }
  if (!means.every(finite)) return fail(`bandit: means not finite ${fmt(means)}`);
  if (alphas.length !== n || betas.length !== n) {
    return fail(`bandit: ${alphas.length} alphas / ${betas.length} betas for ${n} arms`);
  }
  if (!alphas.every((a) => finite(a) && a > 0) || !betas.every((b) => finite(b) && b > 0)) {
    return fail("bandit: Thompson priors must be strictly positive");
  }
  if (!finite(eps0) || eps0 < 0 || eps0 > 1) return fail(`bandit: eps0 ${eps0} must lie in [0,1]`);
  if (!finite(decay) || decay <= 0 || decay > 1) {
    return fail(`bandit: decay ${decay} must lie in (0,1]`);
  }
  if (!Number.isInteger(steps) || steps < 1) return fail(`bandit: steps ${steps} must be >= 1`);
  if (!Number.isInteger(seed)) return fail("bandit: seed must be an integer");
  const rand = lcg(seed);
  const best = q.reduce((a, v, i) => (v > (q[a] ?? -Infinity) ? i : a), 0);
  const epsPicks: number[] = [];
  const ucbPicks: number[] = [];
  const thompsonPicks: number[] = [];
  try {
    for (let t = 1; t <= steps; t++) {
      const eps = decayEps(eps0, decay, t);
      if (!finite(eps) || eps < 0 || eps > 1) {
        return fail(`bandit: decayed epsilon ${eps} left [0,1] at step ${t}`);
      }
      epsPicks.push(epsilonGreedyStep([...q], eps, rand));
      ucbPicks.push(ucb1Step([...counts], [...means], t));
      thompsonPicks.push(thompsonBetaStep([...alphas], [...betas], rand));
    }
  } catch (err) {
    return fail(`bandit policy threw: ${msg(err)}`);
  }
  for (const [name, picks] of [
    ["epsilonGreedy", epsPicks],
    ["ucb1", ucbPicks],
    ["thompson", thompsonPicks],
  ] as const) {
    for (const a of picks) {
      if (!Number.isInteger(a) || a < 0 || a >= n) {
        return fail(`bandit ${name}: returned arm index ${a} outside [0, ${n - 1}]`);
      }
    }
  }
  const finalEps = decayEps(eps0, decay, steps);
  const greedy = ucbPicks.filter((a) => a === best).length;
  return ok({
    epsilonGreedy: epsPicks,
    ucb1: ucbPicks,
    thompson: thompsonPicks,
    finalEpsilon: finalEps,
    armCount: n,
    steps,
    ucb1GreedyShare: greedy / ucbPicks.length,
    moduleEnabled: IMITATION_ENABLED,
  });
}
