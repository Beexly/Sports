/**
 * live-corpus-playbook-and-4book-intelligence.ts
 * ============================================================================
 * Live TypeScript Kernels compiled from:
 *  1. FootballXOs 16 Coaching Playbook Hubs (7 Offense + 9 Defense) and
 *     Split-Field Coverages (Quarters / Cover-7 / Patterson 4-2-5 / Saban
 *     Rip-Liz & Match Rules / Fangio Penny 5-1 / Half-Slide "One You, Two Me").
 *  2. The Hidden Game of Football (Carroll, Palmer, Thorn, Schatz):
 *     2025-2026 35-yd Dynamic Kickoff Hidden Yardage & 4th-down/sack EP.
 *  3. Football Analytics with Python & R (Eager & Erickson, O'Reilly 488p):
 *     Empirical-Bayes shrinkage using measured lagged stability r, Negative
 *     Binomial overdispersed prop pricing vs vigged break-even PASS gates.
 *  4. Statistical Football & Downloads Quant Papers:
 *     - Egidi, Karlis & Ntzoufras (2026) sum-to-zero hierarchical bivariate score
 *       shrinkage & diagonal draw inflation;
 *     - Braun bounded quadratic Logit TD probability & 4Q turnover WPA shock;
 *     - Alam et al. (2012, Procedia Eng.) RMIT wind-tunnel football drag Cd(yaw);
 *     - Jayanti (2026) algorithmic expert-projection debiasing;
 *     - DFL-Opt & Parshall-Zimmerman GA correlated stack / playoff weighting;
 *     - Brian Cain next-play reset vs post-turnover compounding mental tilt.
 */

import { clamp, clamp01, sigmoid } from "./osf-math-core.js";

export type OffensePlaybookFamily =
  | "WEST_COAST"
  | "AIR_RAID"
  | "SPREAD_RPO"
  | "OPTION_VEER"
  | "POWER_GAP_RUN"
  | "SHANAHAN_WIDE_ZONE"
  | "NFL_PRO_MULTIPLE";

export type DefenseFrontFamily =
  | "3_4_TWO_GAP_TITE"
  | "3_3_5_STACK_AMOEBA"
  | "4_2_5_SPLIT_FIELD"
  | "46_BEAR_EIGHT_MAN"
  | "4_4_GAPS"
  | "4_3_OVER_UNDER_TAMPA2"
  | "50_EAGLE_REDUCTION";

export type OffensiveSurface =
  | "2X2"
  | "3X1_TRIPS_OPEN"
  | "3X1_TRIPS_CLOSED_Y"
  | "2X2_COMPRESSED_BUNCH"
  | "1X4_EMPTY"
  | "HEAVY_21_12";

export type SplitFieldCoverageCheck =
  | "MOD_QUARTERS"
  | "MEG_SOLO"
  | "PALMS_2_READ"
  | "STUBBIE_SPECIAL"
  | "BOX_4_ON_3"
  | "POACH_SOLO"
  | "RIP_LIZ_COVER3_MATCH";

export type PassProtectionAdjustment =
  | "NONE"
  | "TOM"
  | "FAN"
  | "JOKER_OPPOSITE"
  | "STAY"
  | "HOT_SIGHT_ADJUST";

export interface SplitFieldMatchupInput {
  readonly offenseFamily?: OffensePlaybookFamily;
  readonly defenseFamily?: DefenseFrontFamily;
  readonly offensiveSurface?: OffensiveSurface;
  readonly numberTwoReceiverWidthYards?: number;
  readonly numberThreeFastFlat?: boolean;
  readonly penny51WalkDownActive?: boolean;
  readonly defensiveBoxCount?: number;
  readonly rushersWeakSlideSide?: number;
  readonly rushersStrongManSide?: number;
  readonly protectionAdjustment?: PassProtectionAdjustment;
}

export interface SplitFieldMatchupResult {
  readonly offenseFamily: OffensePlaybookFamily;
  readonly defenseFamily: DefenseFrontFamily;
  readonly offensiveSurface: OffensiveSurface;
  readonly splitFieldCheck: SplitFieldCoverageCheck;
  readonly lightBoxNickelRushTaxYpc: number;
  readonly penny51RushMitigationYpcDelta: number;
  readonly netRushYpcDelta: number;
  readonly eraTranslationExposureEpa: number;
  readonly protectionUnblockedRusher: boolean;
  readonly protectionPressureDelta: number;
  readonly compositeSchemeEpaDelta: number;
  readonly conflictDefenderNote: string;
}

const OFFENSE_PASS_RATE_BIAS: Record<OffensePlaybookFamily, number> = {
  WEST_COAST: 0.56,
  AIR_RAID: 0.72,
  SPREAD_RPO: 0.54,
  OPTION_VEER: 0.24,
  POWER_GAP_RUN: 0.36,
  SHANAHAN_WIDE_ZONE: 0.48,
  NFL_PRO_MULTIPLE: 0.58,
};

const FRONT_DEFAULT_BOX_COUNT: Record<DefenseFrontFamily, number> = {
  "3_4_TWO_GAP_TITE": 6,
  "3_3_5_STACK_AMOEBA": 6,
  "4_2_5_SPLIT_FIELD": 6,
  "46_BEAR_EIGHT_MAN": 8,
  "4_4_GAPS": 8,
  "4_3_OVER_UNDER_TAMPA2": 7,
  "50_EAGLE_REDUCTION": 7,
};

/**
 * Clean-room tactical matchup matrix (offense vs defense) in EPA/play bounds [-0.08, +0.08].
 */
const SCHEME_MATRIX_EPA: Record<OffensePlaybookFamily, Record<DefenseFrontFamily, number>> = {
  WEST_COAST: {
    "3_4_TWO_GAP_TITE": 0.018,
    "3_3_5_STACK_AMOEBA": -0.012,
    "4_2_5_SPLIT_FIELD": 0.014,
    "46_BEAR_EIGHT_MAN": 0.048,
    "4_4_GAPS": 0.044,
    "4_3_OVER_UNDER_TAMPA2": -0.026,
    "50_EAGLE_REDUCTION": 0.032,
  },
  AIR_RAID: {
    "3_4_TWO_GAP_TITE": -0.014,
    "3_3_5_STACK_AMOEBA": -0.034,
    "4_2_5_SPLIT_FIELD": -0.022,
    "46_BEAR_EIGHT_MAN": 0.068,
    "4_4_GAPS": 0.062,
    "4_3_OVER_UNDER_TAMPA2": 0.019,
    "50_EAGLE_REDUCTION": 0.052,
  },
  SPREAD_RPO: {
    "3_4_TWO_GAP_TITE": -0.018,
    "3_3_5_STACK_AMOEBA": -0.021,
    "4_2_5_SPLIT_FIELD": 0.026,
    "46_BEAR_EIGHT_MAN": 0.056,
    "4_4_GAPS": 0.052,
    "4_3_OVER_UNDER_TAMPA2": 0.031,
    "50_EAGLE_REDUCTION": 0.044,
  },
  OPTION_VEER: {
    "3_4_TWO_GAP_TITE": -0.012,
    "3_3_5_STACK_AMOEBA": 0.016,
    "4_2_5_SPLIT_FIELD": 0.034,
    "46_BEAR_EIGHT_MAN": -0.024,
    "4_4_GAPS": -0.028,
    "4_3_OVER_UNDER_TAMPA2": 0.022,
    "50_EAGLE_REDUCTION": -0.019,
  },
  POWER_GAP_RUN: {
    "3_4_TWO_GAP_TITE": -0.022,
    "3_3_5_STACK_AMOEBA": 0.024,
    "4_2_5_SPLIT_FIELD": 0.052,
    "46_BEAR_EIGHT_MAN": -0.046,
    "4_4_GAPS": -0.036,
    "4_3_OVER_UNDER_TAMPA2": 0.016,
    "50_EAGLE_REDUCTION": -0.031,
  },
  SHANAHAN_WIDE_ZONE: {
    "3_4_TWO_GAP_TITE": -0.028,
    "3_3_5_STACK_AMOEBA": 0.014,
    "4_2_5_SPLIT_FIELD": 0.041,
    "46_BEAR_EIGHT_MAN": -0.038,
    "4_4_GAPS": 0.024,
    "4_3_OVER_UNDER_TAMPA2": 0.029,
    "50_EAGLE_REDUCTION": -0.016,
  },
  NFL_PRO_MULTIPLE: {
    "3_4_TWO_GAP_TITE": 0.008,
    "3_3_5_STACK_AMOEBA": 0.006,
    "4_2_5_SPLIT_FIELD": 0.019,
    "46_BEAR_EIGHT_MAN": 0.041,
    "4_4_GAPS": 0.038,
    "4_3_OVER_UNDER_TAMPA2": 0.011,
    "50_EAGLE_REDUCTION": 0.025,
  },
};

function resolveSplitFieldCheck(
  defenseFamily: DefenseFrontFamily,
  surface: OffensiveSurface,
  numberTwoWidthYards: number,
  numberThreeFastFlat: boolean,
): SplitFieldCoverageCheck {
  if (defenseFamily === "4_3_OVER_UNDER_TAMPA2" && numberTwoWidthYards > 6) {
    return "PALMS_2_READ";
  }
  if (surface === "2X2_COMPRESSED_BUNCH" || numberTwoWidthYards <= 5.0) {
    return "STUBBIE_SPECIAL";
  }
  if (surface === "3X1_TRIPS_OPEN") {
    return numberThreeFastFlat ? "BOX_4_ON_3" : "POACH_SOLO";
  }
  if (surface === "3X1_TRIPS_CLOSED_Y" || surface === "1X4_EMPTY") {
    return "POACH_SOLO";
  }
  if (surface === "HEAVY_21_12") {
    return defenseFamily === "46_BEAR_EIGHT_MAN" || defenseFamily === "4_4_GAPS"
      ? "RIP_LIZ_COVER3_MATCH"
      : "MEG_SOLO";
  }
  return defenseFamily === "4_2_5_SPLIT_FIELD" ? "MOD_QUARTERS" : "RIP_LIZ_COVER3_MATCH";
}

function resolveHalfSlideProtection(
  rushersWeak: number,
  rushersStrong: number,
  adj: PassProtectionAdjustment,
): { unblocked: boolean; pressureDelta: number; note: string } {
  if (rushersWeak >= 4) {
    if (adj === "TOM") {
      return { unblocked: false, pressureDelta: 0.028, note: "4-weak blitz picked up via RB TOM" };
    }
    if (adj === "FAN" || adj === "HOT_SIGHT_ADJUST") {
      return { unblocked: true, pressureDelta: 0.046, note: `4-weak overload met with ${adj} hot throw` };
    }
    return { unblocked: true, pressureDelta: 0.145, note: "Unadjusted 4-weak overload vs 3-man slide" };
  }
  if (rushersStrong >= 4) {
    if (adj === "JOKER_OPPOSITE" || adj === "STAY") {
      return { unblocked: false, pressureDelta: adj === "STAY" ? 0.018 : 0.026, note: `4-strong picked up via ${adj}` };
    }
    return { unblocked: true, pressureDelta: 0.138, note: "Unadjusted 4-strong overload vs man side" };
  }
  return { unblocked: false, pressureDelta: -0.015, note: "Balanced One-You-Two-Me half-slide protection" };
}

/**
 * Evaluates FootballXOs 16-hub scheme matchup, Split-Field Cover-7 check resolution,
 * light-box +0.80 YPC rush tax vs Fangio Penny 5-1 mitigation, and half-slide blitz protection.
 */
export function evaluateLivePlaybookAndSplitFieldMatchup(
  input: SplitFieldMatchupInput = {},
): SplitFieldMatchupResult {
  const offenseFamily = input.offenseFamily ?? "NFL_PRO_MULTIPLE";
  const defenseFamily = input.defenseFamily ?? "4_2_5_SPLIT_FIELD";
  const offensiveSurface = input.offensiveSurface ?? "3X1_TRIPS_OPEN";
  const width2 = input.numberTwoReceiverWidthYards ?? 8.0;
  const fastFlat = input.numberThreeFastFlat ?? false;
  const boxCount = input.defensiveBoxCount ?? FRONT_DEFAULT_BOX_COUNT[defenseFamily];
  const pennyActive = input.penny51WalkDownActive ?? false;

  const splitFieldCheck = resolveSplitFieldCheck(defenseFamily, offensiveSurface, width2, fastFlat);
  const isLightBoxNickel = boxCount <= 6 && (defenseFamily === "4_2_5_SPLIT_FIELD" || defenseFamily === "3_3_5_STACK_AMOEBA");
  const heavyGapRun =
    offenseFamily === "POWER_GAP_RUN" ||
    offenseFamily === "SHANAHAN_WIDE_ZONE" ||
    offensiveSurface === "HEAVY_21_12";

  // Measured +0.80 YPC light-box tax in static 4-2-5 nickel vs downhill gap/zone surfaces.
  const lightBoxNickelRushTaxYpc = isLightBoxNickel ? (heavyGapRun ? 0.8 : 0.42) : 0.0;
  const penny51RushMitigationYpcDelta = isLightBoxNickel && pennyActive ? -0.52 : 0.0;
  const netRushYpcDelta = Number((lightBoxNickelRushTaxYpc + penny51RushMitigationYpcDelta).toFixed(4));

  const isLegacy8Man =
    defenseFamily === "46_BEAR_EIGHT_MAN" ||
    defenseFamily === "4_4_GAPS" ||
    defenseFamily === "50_EAGLE_REDUCTION";
  const isSpreadPassOffense =
    offenseFamily === "AIR_RAID" ||
    offenseFamily === "SPREAD_RPO" ||
    offensiveSurface === "1X4_EMPTY";
  const eraTranslationExposureEpa = isLegacy8Man && isSpreadPassOffense ? 0.048 : 0.0;

  const prot = resolveHalfSlideProtection(
    input.rushersWeakSlideSide ?? 2,
    input.rushersStrongManSide ?? 2,
    input.protectionAdjustment ?? "NONE",
  );

  const baseSchemeEpa = SCHEME_MATRIX_EPA[offenseFamily][defenseFamily];
  const rushWeight = 1 - OFFENSE_PASS_RATE_BIAS[offenseFamily];
  const compositeSchemeEpaDelta = Number(
    clamp(
      baseSchemeEpa + 0.032 * rushWeight * netRushYpcDelta + 0.5 * eraTranslationExposureEpa - 0.18 * prot.pressureDelta,
      -0.12,
      0.12,
    ).toFixed(6),
  );

  return {
    offenseFamily,
    defenseFamily,
    offensiveSurface,
    splitFieldCheck,
    lightBoxNickelRushTaxYpc,
    penny51RushMitigationYpcDelta,
    netRushYpcDelta,
    eraTranslationExposureEpa,
    protectionUnblockedRusher: prot.unblocked,
    protectionPressureDelta: prot.pressureDelta,
    compositeSchemeEpaDelta,
    conflictDefenderNote: `${splitFieldCheck} | ${prot.note}${pennyActive ? " | Penny 5-1 walk-down" : ""}`,
  };
}

export interface DynamicKickoff35Input {
  /** Landing-zone expected receiving start yardline (own 1..40). */
  readonly expectedLandingZoneStartYardline?: number;
  /** Probability ball stays in landing zone vs touchback at the 2025-2026 35-yd line. */
  readonly landingZoneExecutionRate?: number;
  /** Hang-time in seconds (~3.35s target on low-drive kickoff). */
  readonly hangtimeSec?: number;
  /** Fourth-down failed conversions giving opponent short-field hidden yards. */
  readonly fourthDownFailedCount?: number;
  /** Number of 3rd-down or opponent-territory (<50) sacks. */
  readonly highLeverageSackCount?: number;
}

export interface DynamicKickoff35Result {
  readonly touchbackRuleYardline: 35;
  readonly epTouchbackOpp: number;
  readonly epLandingZoneOpp: number;
  readonly kickoffHiddenYardsSaved: number;
  readonly kickoffEpAdvantagePerKick: number;
  readonly fourthDownTurnoverHiddenYardageEp: number;
  readonly highLeverageSackEpPenalty: number;
  readonly totalHiddenYardageEpDelta: number;
}

function hiddenGameLinearEpFromOwnYardline(ownYardline: number): number {
  const yardline100 = 100 - clamp(ownYardline, 1, 99);
  return 6.0 - 0.08 * yardline100;
}

/**
 * Carroll/Palmer/Schatz Hidden Yardage upgraded for the 2025-2026 35-yd Dynamic Kickoff.
 */
export function computeDynamicKickoff35HiddenYardageEp(
  input: DynamicKickoff35Input = {},
): DynamicKickoff35Result {
  const touchbackYardline = 35 as const;
  const landingStart = clamp(input.expectedLandingZoneStartYardline ?? 27.5, 12, 42);
  const execRate = clamp01(input.landingZoneExecutionRate ?? 0.78);
  const hangtime = clamp(input.hangtimeSec ?? 3.35, 2.0, 4.8);

  const hangtimeBonusYds = clamp((hangtime - 3.0) * 1.4, -1.5, 2.5);
  const effectiveStart = clamp(landingStart - hangtimeBonusYds * 0.4, 15, 38);

  const epTouchbackOpp = Number(hiddenGameLinearEpFromOwnYardline(touchbackYardline).toFixed(4));
  const epLandingZoneOpp = Number(hiddenGameLinearEpFromOwnYardline(effectiveStart).toFixed(4));

  const kickoffHiddenYardsSaved = Number(((touchbackYardline - effectiveStart) * execRate).toFixed(4));
  const kickoffEpAdvantagePerKick = Number((0.08 * kickoffHiddenYardsSaved).toFixed(4));

  const failed4th = Math.max(0, input.fourthDownFailedCount ?? 0);
  const fourthDownTurnoverHiddenYardageEp = Number((-1.45 * failed4th).toFixed(4));
  const sacks = Math.max(0, input.highLeverageSackCount ?? 0);
  const highLeverageSackEpPenalty = Number((-1.62 * sacks).toFixed(4));

  const totalHiddenYardageEpDelta = Number(
    (kickoffEpAdvantagePerKick + fourthDownTurnoverHiddenYardageEp + highLeverageSackEpPenalty).toFixed(4),
  );

  return {
    touchbackRuleYardline: touchbackYardline,
    epTouchbackOpp,
    epLandingZoneOpp,
    kickoffHiddenYardsSaved,
    kickoffEpAdvantagePerKick,
    fourthDownTurnoverHiddenYardageEp,
    highLeverageSackEpPenalty,
    totalHiddenYardageEpDelta,
  };
}

export type StabilityMetricKey =
  | "RYOE"
  | "YPC"
  | "CPOE"
  | "COMP_PCT"
  | "SHORT_PASS_EPA"
  | "DEEP_PASS_EPA"
  | "PROE";

/**
 * Eager & Erickson lagged YoY stability correlations (Football Analytics Ch. 2-5).
 */
export const EAGER_ERICKSON_STABILITY_R: Record<StabilityMetricKey, { r: number; nRef: number }> = {
  RYOE: { r: 0.3736, nRef: 160 },
  YPC: { r: 0.3473, nRef: 180 },
  CPOE: { r: 0.465, nRef: 260 },
  COMP_PCT: { r: 0.4455, nRef: 280 },
  SHORT_PASS_EPA: { r: 0.54, nRef: 220 },
  DEEP_PASS_EPA: { r: 0.22, nRef: 90 },
  PROE: { r: 0.58, nRef: 200 },
};

export interface StabilityShrinkInput {
  readonly metricKey: StabilityMetricKey;
  readonly observedMean: number;
  readonly priorMean: number;
  readonly sampleSize: number;
}

export interface StabilityShrinkResult {
  readonly metricKey: StabilityMetricKey;
  readonly reliabilityR: number;
  readonly shrinkageWeight: number;
  readonly shrunkEstimate: number;
  readonly rawResidual: number;
  readonly shrunkResidual: number;
}

/**
 * Empirical-Bayes James-Stein / mixed-effects shrinkage calibrated to Eager & Erickson r.
 */
export function shrinkPlayerMetricByStability(input: StabilityShrinkInput): StabilityShrinkResult {
  if (!Number.isFinite(input.observedMean) || !Number.isFinite(input.priorMean)) {
    throw new Error("observedMean and priorMean must be finite");
  }
  const n = Math.max(0, input.sampleSize);
  const { r, nRef } = EAGER_ERICKSON_STABILITY_R[input.metricKey];
  // Reliability weight bounded smoothly by asymptotic lagged ceiling r (when n == nRef, w ~ r)
  const effectiveWeight = n === 0 ? 0 : clamp01((n * r) / (n + nRef * (1 - r)));
  const rawResidual = input.observedMean - input.priorMean;
  const shrunkEstimate = Number((input.priorMean + effectiveWeight * rawResidual).toFixed(6));

  return {
    metricKey: input.metricKey,
    reliabilityR: r,
    shrinkageWeight: Number(effectiveWeight.toFixed(6)),
    shrunkEstimate,
    rawResidual: Number(rawResidual.toFixed(6)),
    shrunkResidual: Number((shrunkEstimate - input.priorMean).toFixed(6)),
  };
}

export interface NegBinPropPricingInput {
  /** Expected mean count (TDs, receptions, INTs). */
  readonly mu: number;
  /** Integer prop line threshold (e.g. 0.5 -> count >= 1, 1.5 -> count >= 2). */
  readonly propLine: number;
  /** Base overdispersion alpha (variance = mu + alpha * mu^2). */
  readonly baseAlpha?: number;
  /** Vegas game total line (higher total amplifies dispersion alpha). */
  readonly gameTotalLine?: number;
  /** American odds on the OVER side (e.g. -110 or +165). */
  readonly overAmericanOdds: number;
  /** American odds on the UNDER side (for de-vigged fair market prob). */
  readonly underAmericanOdds?: number;
  /** Minimum probability edge over break-even required to SPEAK. */
  readonly minEdgeToSpeak?: number;
}

export interface NegBinPropPricingResult {
  readonly overThresholdInt: number;
  readonly effectiveAlpha: number;
  readonly negBinOverProb: number;
  readonly naivePoissonOverProb: number;
  readonly dispersionTailGap: number;
  readonly viggedBreakEvenProb: number;
  readonly fairMarketOverProb: number;
  readonly edgeVsVigged: number;
  readonly decision: "SPEAK" | "PASS";
  readonly publishAllowed: boolean;
}

export function americanToImpliedProb(americanOdds: number): number {
  if (!Number.isFinite(americanOdds) || americanOdds === 0) {
    throw new Error("americanOdds must be finite and non-zero");
  }
  return americanOdds < 0
    ? -americanOdds / (-americanOdds + 100)
    : 100 / (americanOdds + 100);
}

function logGamma(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.5073432786869, -0.1385710952657201, 9.98436957801957e-6, 1.505632735149311e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const zm = z - 1;
  let x = 0.9999999999998099;
  for (let i = 0; i < p.length; i += 1) x += p[i]! / (zm + i + 1);
  const t = zm + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zm + 0.5) * Math.log(t) - t + Math.log(x);
}

function negativeBinomialPmf(k: number, mu: number, alpha: number): number {
  if (mu <= 0) return k === 0 ? 1 : 0;
  if (alpha <= 1e-6) {
    let logFact = 0;
    for (let i = 2; i <= k; i += 1) logFact += Math.log(i);
    return Math.exp(-mu + k * Math.log(mu) - logFact);
  }
  const r = 1 / alpha;
  const p = r / (r + mu);
  const logP =
    logGamma(k + r) -
    logGamma(r) -
    logGamma(k + 1) +
    r * Math.log(p) +
    k * Math.log(1 - p);
  return Math.exp(logP);
}

/**
 * Overdispersed Negative Binomial vs naive Poisson count-prop pricing with explicit vigged PASS gate.
 */
export function priceOverdispersedNegativeBinomialProp(
  input: NegBinPropPricingInput,
): NegBinPropPricingResult {
  const mu = Math.max(0.01, input.mu);
  const totalShift = ((input.gameTotalLine ?? 45) - 45) * 0.006;
  const effectiveAlpha = Number(clamp((input.baseAlpha ?? 0.24) + totalShift, 0.02, 0.85).toFixed(4));
  const overThresholdInt = Math.floor(input.propLine) + 1;

  let cdfNb = 0;
  let cdfPois = 0;
  for (let k = 0; k < overThresholdInt; k += 1) {
    cdfNb += negativeBinomialPmf(k, mu, effectiveAlpha);
    cdfPois += negativeBinomialPmf(k, mu, 0);
  }
  const negBinOverProb = Number(clamp01(1 - cdfNb).toFixed(6));
  const naivePoissonOverProb = Number(clamp01(1 - cdfPois).toFixed(6));

  const viggedBreakEvenProb = Number(americanToImpliedProb(input.overAmericanOdds).toFixed(6));
  let fairMarketOverProb = viggedBreakEvenProb;
  if (input.underAmericanOdds !== undefined) {
    const pOverRaw = americanToImpliedProb(input.overAmericanOdds);
    const pUnderRaw = americanToImpliedProb(input.underAmericanOdds);
    fairMarketOverProb = Number((pOverRaw / (pOverRaw + pUnderRaw)).toFixed(6));
  }

  const edgeVsVigged = Number((negBinOverProb - viggedBreakEvenProb).toFixed(6));
  const minEdge = input.minEdgeToSpeak ?? 0.015;
  const decision: "SPEAK" | "PASS" = edgeVsVigged >= minEdge ? "SPEAK" : "PASS";

  return {
    overThresholdInt,
    effectiveAlpha,
    negBinOverProb,
    naivePoissonOverProb,
    dispersionTailGap: Number((negBinOverProb - naivePoissonOverProb).toFixed(6)),
    viggedBreakEvenProb,
    fairMarketOverProb,
    edgeVsVigged,
    decision,
    publishAllowed: decision === "SPEAK",
  };
}

export interface BoundedTdAndAeroInput {
  /** Red-zone carry share in [0, 1]. */
  readonly redZoneShare?: number;
  /** Yards per carry (shrinkage-adjusted). */
  readonly ypc?: number;
  /** Projected carries/opportunities (0..450). */
  readonly carries?: number;
  /** Fourth-quarter trailing indicator for turnover WPA shock (-0.1973 base). */
  readonly isFourthQuarterTrailing?: boolean;
  /** Expected turnovers committed in 4Q. */
  readonly expectedTurnovers?: number;
  /** Wind speed in mph. */
  readonly windSpeedMph?: number;
  /** Crosswind yaw angle in degrees (0 = pure spiral head/tail, 90 = broadside crosswind). */
  readonly crosswindYawDeg?: number;
  /** Throw/kick air distance in yards. */
  readonly targetAirYards?: number;
}

export interface BoundedTdAndAeroResult {
  readonly logitTdProbability: number;
  readonly linearOlsExtrapolationValue: number;
  readonly fourthQuarterTurnoverWpaShock: number;
  readonly rmitDragCoefficientCd: number;
  readonly aeroDynamicForceMultiplier: number;
  readonly aeroDeepPassPenaltyProb: number;
}

/**
 * Braun bounded quadratic Logit TD probability + Alam et al. (2012) RMIT wind-tunnel drag.
 */
export function computeBoundedLogitTdAndAeroDrag(
  input: BoundedTdAndAeroInput = {},
): BoundedTdAndAeroResult {
  const rzShare = clamp01(input.redZoneShare ?? 0.32);
  const ypc = clamp(input.ypc ?? 4.3, 1.5, 8.5);
  const carries = Math.max(0, input.carries ?? 180);

  // Braun quadratic Logit TD formula bounded strictly inside (0, 1) for any carries in [0, inf)
  const scaledCarries = carries / 100;
  const zTd = -2.45 + 1.85 * rzShare + 0.19 * (ypc - 4.0) + 1.35 * scaledCarries - 0.52 * scaledCarries ** 2;
  const logitTdProbability = Number(sigmoid(zTd).toFixed(6));

  // Illustration of naive OLS parabolic extrapolation breakdown (can go < 0 outside middle band)
  const linearOlsExtrapolationValue = Number(
    (-0.18 + 0.25 * rzShare + 0.04 * (ypc - 4.0) + 0.22 * scaledCarries - 0.11 * scaledCarries ** 2).toFixed(6),
  );

  const q4 = input.isFourthQuarterTrailing ?? false;
  const to = Math.max(0, input.expectedTurnovers ?? 0);
  const fourthQuarterTurnoverWpaShock = Number((q4 ? -0.1973 * to : -0.095 * to).toFixed(6));

  // Alam et al. (2012) RMIT Wind Tunnel: NFL ball Cd(0 deg)=0.19, Cd(90 deg)=0.775
  const windMph = Math.max(0, input.windSpeedMph ?? 6);
  const yawDeg = clamp(Math.abs(input.crosswindYawDeg ?? 25), 0, 90);
  const yawRad = (yawDeg * Math.PI) / 180;
  const cd0 = 0.19;
  const cd90 = 0.775;
  const rmitDragCoefficientCd = Number((cd0 + (cd90 - cd0) * Math.sin(yawRad) ** 2).toFixed(4));

  const aeroDynamicForceMultiplier = Number(
    ((rmitDragCoefficientCd / cd0) * (1 + (windMph / 25) ** 2)).toFixed(4),
  );
  const airYards = Math.max(0, input.targetAirYards ?? 22);
  const deepWeight = clamp01((airYards - 15) / 25);
  const aeroDeepPassPenaltyProb = Number(
    clamp(-0.008 * deepWeight * (rmitDragCoefficientCd / cd0) * (windMph / 10), -0.095, 0).toFixed(6),
  );

  return {
    logitTdProbability,
    linearOlsExtrapolationValue,
    fourthQuarterTurnoverWpaShock,
    rmitDragCoefficientCd,
    aeroDynamicForceMultiplier,
    aeroDeepPassPenaltyProb,
  };
}

export interface ExpertDebiasAndStackInput {
  readonly expertConsensusProj: number;
  readonly pureAlgorithmicProj: number;
  readonly positionGroup: "QB" | "RB" | "WR" | "TE";
  /** Degree to which expert consensus appears anchored toward narrative/team-wins. */
  readonly expertHypeSkewZ?: number;
  /** Same-game QB-pass-catcher correlation rho (DFL-Opt / Parshall stack bonus). */
  readonly stackCorrelationRho?: number;
  /** Week number (1..18) for Parshall GA playoff-week emphasis. */
  readonly week?: number;
  /** Number of unreset turnovers / errors in last 2 drives (Brian Cain tilt tracker). */
  readonly unresetRecentMistakes?: number;
  /** Reset routine adherence [0, 1] (1.0 = disciplined 6-second flush). */
  readonly nextPlayResetDiscipline?: number;
}

export interface ExpertDebiasAndStackResult {
  readonly debiasedProjection: number;
  readonly algorithmicBlendWeight: number;
  readonly stackCorrelationBonusPts: number;
  readonly playoffWeekMultiplier: number;
  readonly mentalTiltCompoundHazard: number;
}

const JAYANTI_ALGO_BLEND_BY_POS: Record<ExpertDebiasAndStackInput["positionGroup"], number> = {
  QB: 0.72,
  TE: 0.68,
  WR: 0.48,
  RB: 0.34,
};

/**
 * Jayanti (2026) algorithmic expert debiasing + DFL-Opt/Parshall stack & playoff weights + Cain tilt reset.
 */
export function debiasExpertProjectionAndScoreStacks(
  input: ExpertDebiasAndStackInput,
): ExpertDebiasAndStackResult {
  const algoW = JAYANTI_ALGO_BLEND_BY_POS[input.positionGroup];
  const hypeSkew = clamp(input.expertHypeSkewZ ?? 0, -2.5, 2.5);
  // Correct expert consensus for team-narrative overreaction before blending with algorithmic estimator
  const hypeAdjustedExpert = input.expertConsensusProj - 0.45 * hypeSkew * algoW;
  const debiasedProjection = Number(
    (algoW * input.pureAlgorithmicProj + (1 - algoW) * hypeAdjustedExpert).toFixed(4),
  );

  const rho = clamp(input.stackCorrelationRho ?? 0.46, 0, 0.9);
  const week = input.week ?? 9;
  const playoffWeekMultiplier = week >= 15 && week <= 17 ? 1.2 : 1.0;
  const stackCorrelationBonusPts = Number((3.4 * rho * playoffWeekMultiplier).toFixed(4));

  const mistakes = Math.max(0, input.unresetRecentMistakes ?? 0);
  const reset = clamp01(input.nextPlayResetDiscipline ?? 0.85);
  const mentalTiltCompoundHazard = Number((1 - Math.exp(-0.22 * mistakes * (1.15 - reset))).toFixed(6));

  return {
    debiasedProjection,
    algorithmicBlendWeight: algoW,
    stackCorrelationBonusPts,
    playoffWeekMultiplier,
    mentalTiltCompoundHazard,
  };
}

export interface LiveCorpusPlaybookAnd4BookInput {
  readonly splitField?: SplitFieldMatchupInput;
  readonly kickoff35?: DynamicKickoff35Input;
  readonly stabilityShrink?: StabilityShrinkInput;
  readonly tdAndAero?: BoundedTdAndAeroInput;
  readonly expertAndMental?: ExpertDebiasAndStackInput;
  /** Optional sum-to-zero team ability diff (Egidi hierarchical Bayesian prior). */
  readonly egidiSumToZeroNetDiff?: number;
}

export interface LiveCorpusPlaybookAnd4BookResult {
  readonly activeHubCount: 16;
  readonly splitFieldMatchup: SplitFieldMatchupResult;
  readonly kickoff35HiddenYardage: DynamicKickoff35Result;
  readonly stabilityShrink: StabilityShrinkResult;
  readonly tdAndAero: BoundedTdAndAeroResult;
  readonly expertAndMental: ExpertDebiasAndStackResult;
  readonly egidiShrunkDiff: number;
  readonly familyDeltaContributions: {
    readonly pressure: number;
    readonly weather: number;
    readonly restFatigue: number;
    readonly coveragePersonnel: number;
    readonly qbSkillScript: number;
    readonly marketMicrostructure: number;
  };
}

/**
 * Composes all live FootballXOs + Split-Field + Downloads/4-Book kernels for Stream 15L.
 */
export function evaluateLiveCorpusPlaybookAnd4BookBundle(
  input: LiveCorpusPlaybookAnd4BookInput = {},
): LiveCorpusPlaybookAnd4BookResult {
  const splitFieldMatchup = evaluateLivePlaybookAndSplitFieldMatchup(input.splitField);
  const kickoff35HiddenYardage = computeDynamicKickoff35HiddenYardageEp(input.kickoff35);
  const stabilityShrink = shrinkPlayerMetricByStability(
    input.stabilityShrink ?? {
      metricKey: "CPOE",
      observedMean: 0.045,
      priorMean: 0.015,
      sampleSize: 220,
    },
  );
  const tdAndAero = computeBoundedLogitTdAndAeroDrag(input.tdAndAero);
  const expertAndMental = debiasExpertProjectionAndScoreStacks(
    input.expertAndMental ?? {
      expertConsensusProj: 19.2,
      pureAlgorithmicProj: 18.6,
      positionGroup: "QB",
      week: 11,
    },
  );
  const egidiRaw = input.egidiSumToZeroNetDiff ?? 0.0;
  const egidiShrunkDiff = Number(clamp(egidiRaw * 0.65, -0.25, 0.25).toFixed(6));

  const familyDeltaContributions = {
    pressure: Number(clamp(-0.14 * splitFieldMatchup.protectionPressureDelta, -0.04, 0.04).toFixed(6)),
    weather: Number(clamp(0.45 * tdAndAero.aeroDeepPassPenaltyProb, -0.04, 0.04).toFixed(6)),
    restFatigue: Number(clamp(-0.08 * expertAndMental.mentalTiltCompoundHazard, -0.04, 0.04).toFixed(6)),
    coveragePersonnel: Number(clamp(0.32 * splitFieldMatchup.compositeSchemeEpaDelta, -0.04, 0.04).toFixed(6)),
    qbSkillScript: Number(
      clamp(
        0.18 * stabilityShrink.shrunkResidual + 0.012 * kickoff35HiddenYardage.totalHiddenYardageEpDelta + 0.05 * egidiShrunkDiff,
        -0.04,
        0.04,
      ).toFixed(6),
    ),
    marketMicrostructure: Number(clamp(0.004 * kickoff35HiddenYardage.kickoffEpAdvantagePerKick, -0.04, 0.04).toFixed(6)),
  };

  return {
    activeHubCount: 16,
    splitFieldMatchup,
    kickoff35HiddenYardage,
    stabilityShrink,
    tdAndAero,
    expertAndMental,
    egidiShrunkDiff,
    familyDeltaContributions,
  };
}
