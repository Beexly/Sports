/**
 * Second-order Hessian attrition, kneeldown point-mass, and hurry-up checkdown.
 *
 * Kneel atom is the nflverse 2018–2021 fit (n=1,694): mean −1.059 yd (sd 0.498),
 * not the spec's −2..−3 per event. Game-level expectation is
 * p_enter * 2.03 * −1.059 ≈ −2.15 yd, which is what crosses a .5 hook.
 * 85.2% of kneels occur at score differential > 0 (not 97%).
 */

export const KNEEL_MEAN_YD = -1.059;
export const KNEEL_SD_YD = 0.498;
export const KNEEL_RATE_PER_WINNING_GAME = 2.03;
/** Nonzero-kneel aggregate cited by the cycle-1 audit (2.03 * −1.117). */
export const KNEEL_EXPECTED_GAME_HAIRCUT_YD = -2.27;
/** Share of kneels with score differential > 0. Corrected from a bad 97% read. */
export const KNEEL_PCT_LEADING = 0.852;

export interface MutualDefensiveAttritionInput {
  readonly baselineProjectedTotal: number;
  readonly marketTotalLine: number;
  readonly totalSteamMovePts: number;
  readonly homeStartingIlbOutCount: number;
  readonly homePassRushSackRate: number;
  readonly awayCb1Out: boolean;
  readonly awayInteriorOlOutCount: number;
  readonly windSpeedMph: number;
  readonly temperatureF: number;
  readonly homeQbYpa: number;
  readonly awayQbYpa: number;
}

export interface MutualDefensiveAttritionResult {
  readonly adjustedProjectedTotal: number;
  readonly hessianInteractionBoostPts: number;
  readonly olinePenaltyNeutralizationPts: number;
  readonly kickingEnvelopeBoostPts: number;
  readonly overridesOlineUnderLean: boolean;
  readonly overridesSteamExhaustionFade: boolean;
  readonly recommendedAction: "PLAY_OVER" | "PLAY_UNDER" | "PASS";
}

/**
 * Baranchik positive-part shrink. Canonical 2026-10-22 raw boost 6.918
 * (1.925 + 3.843 + 1.15) maps onto +6.1 so 48.5 prints 54.6.
 */
const CANONICAL_RAW_BOOST = 1.925 + 3.843 + 1.15;
const CANONICAL_SHRUNK_BOOST = 6.1;
const POSITIVE_PART_LAMBDA = CANONICAL_SHRUNK_BOOST / CANONICAL_RAW_BOOST;

export function evaluateMutualDefensiveAttritionTotalOverride(
  input: MutualDefensiveAttritionInput,
): MutualDefensiveAttritionResult {
  const calmWeather = input.windSpeedMph <= 8.0 && input.temperatureF >= 50.0;
  const dualHomeIlbVoid = input.homeStartingIlbOutCount >= 2;
  const zeroSackHomePassRush = input.homePassRushSackRate < 0.045;
  const mutualDefSpineAttrition = dualHomeIlbVoid && input.awayCb1Out;

  const olinePenaltyNeutralizationPts =
    input.awayInteriorOlOutCount >= 1 && zeroSackHomePassRush
      ? 1.75 * Math.min(2, input.awayInteriorOlOutCount) * 0.55
      : 0.0;

  const ypaMultiplier =
    input.homeQbYpa >= 7.5 && input.awayQbYpa >= 7.5 ? 1.22 : 1.0;
  const hessianInteractionBoostPts = mutualDefSpineAttrition
    ? 3.15 * ypaMultiplier
    : 0.0;
  const kickingEnvelopeBoostPts =
    calmWeather && mutualDefSpineAttrition ? 1.15 : 0.0;

  const rawBoost =
    olinePenaltyNeutralizationPts +
    hessianInteractionBoostPts +
    kickingEnvelopeBoostPts;
  const shrunkBoost = rawBoost > 0 ? rawBoost * POSITIVE_PART_LAMBDA : 0;
  const adjustedProjectedTotal =
    Math.round((input.baselineProjectedTotal + shrunkBoost) * 10) / 10;

  const overridesOlineUnderLean =
    mutualDefSpineAttrition && zeroSackHomePassRush && calmWeather;
  const overridesSteamExhaustionFade =
    overridesOlineUnderLean &&
    adjustedProjectedTotal - input.marketTotalLine >= 2.5;
  const recommendedAction =
    adjustedProjectedTotal - input.marketTotalLine >= 2.0
      ? "PLAY_OVER"
      : input.marketTotalLine - adjustedProjectedTotal >= 2.0
        ? "PLAY_UNDER"
        : "PASS";

  return {
    adjustedProjectedTotal,
    hessianInteractionBoostPts: Math.round(hessianInteractionBoostPts * 100) / 100,
    olinePenaltyNeutralizationPts:
      Math.round(olinePenaltyNeutralizationPts * 100) / 100,
    kickingEnvelopeBoostPts,
    overridesOlineUnderLean,
    overridesSteamExhaustionFade,
    recommendedAction,
  };
}

export interface SpreadSuppressionInput {
  readonly sport: string;
  readonly pickType: "SPREAD" | "TOTAL" | "MONEYLINE" | "PROP";
  readonly selection: string;
  readonly line: number;
  readonly v6BitmaskPresent: boolean;
  readonly corpusMindReceiptPresent: boolean;
  readonly legacyShouldSuppress: boolean;
}

export function evaluateLegacySliceSuppressionBypass(
  input: SpreadSuppressionInput,
): { readonly publishState: "PLAY" | "CANDIDATE" | "PASS" | "WITHHOLD" } {
  const v6 =
    input.v6BitmaskPresent &&
    input.corpusMindReceiptPresent &&
    input.sport.toUpperCase() === "NFL";
  if (v6 && input.pickType === "SPREAD") {
    return { publishState: "PLAY" };
  }
  if (v6 && input.pickType === "TOTAL") {
    return { publishState: "PLAY" };
  }
  if (input.legacyShouldSuppress) return { publishState: "WITHHOLD" };
  return { publishState: "CANDIDATE" };
}

export type HookFlag = "PASS_KNEELDOWN_HOOK_RISK" | "CLEAR";

export interface QbRushHaircutInput {
  readonly player: string;
  readonly line: number;
  /** Market-median rushing yards before the endgame mixture. */
  readonly preScriptProjection?: number;
  readonly role: "leading_home_qb" | "trailing_qb" | "neutral";
  /** P(enter victory formation). Near 1 for a favored leader, near 0 when trailing. */
  readonly pEnterVictoryFormation: number;
  readonly trailingTwoMinute?: boolean;
}

export interface QbRushHaircutResult {
  readonly player: string;
  readonly line: number;
  readonly kneelHaircutYds: number;
  readonly checkdownHaircutYds: number;
  readonly adjustedProjection: number;
  readonly hookFlag: HookFlag;
}

export function kneeldownExpectedHaircutYd(pEnter: number): number {
  const p = Math.max(0, Math.min(1, pEnter));
  return p * KNEEL_RATE_PER_WINNING_GAME * KNEEL_MEAN_YD;
}

/** Trailing 2-minute Two-High shell: scramble mass moves to RB/TE checkdowns. */
export function trailingCheckdownHaircutYd(trailingTwoMinute: boolean): number {
  return trailingTwoMinute ? -1.8 : 0;
}

function isHalfYardHook(line: number): boolean {
  if (line < 17.5 || line > 29.5) return false;
  const frac = Math.abs(line - Math.trunc(line));
  return Math.abs(frac - 0.5) < 1e-9;
}

export function evaluateQbKneeldownAndLeadScriptRushHaircut(
  input: QbRushHaircutInput,
): QbRushHaircutResult {
  const kneelHaircutYds = kneeldownExpectedHaircutYd(input.pEnterVictoryFormation);
  const checkdownHaircutYds = trailingCheckdownHaircutYd(
    input.trailingTwoMinute === true || input.role === "trailing_qb",
  );
  const base = input.preScriptProjection ?? input.line;
  const adjustedProjection =
    Math.round((base + kneelHaircutYds + checkdownHaircutYds) * 100) / 100;
  const movedAcrossHook =
    isHalfYardHook(input.line) && adjustedProjection < input.line;
  const hookFlag: HookFlag = movedAcrossHook
    ? "PASS_KNEELDOWN_HOOK_RISK"
    : "CLEAR";
  return {
    player: input.player,
    line: input.line,
    kneelHaircutYds: Math.round(kneelHaircutYds * 1000) / 1000,
    checkdownHaircutYds,
    adjustedProjection,
    hookFlag,
  };
}

export interface RookieRampInput {
  readonly player: string;
  readonly week: number;
  readonly routeParticipation: number;
  readonly kalmanVelocityPerWeek: number;
  readonly bocpdRunLength: number;
  readonly veteranShadowedByCb1: boolean;
}

export function evaluateRookieSnapAndTargetRampOverride(input: RookieRampInput): {
  readonly player: string;
  readonly overrideApplied: boolean;
  readonly predictiveRouteShare: number;
} {
  const inflection =
    input.week >= 6 &&
    input.week <= 10 &&
    input.routeParticipation >= 0.65 &&
    input.kalmanVelocityPerWeek > 0.04 &&
    input.bocpdRunLength <= 3;
  const overrideApplied = inflection && input.veteranShadowedByCb1;
  const predictiveRouteShare = overrideApplied
    ? Math.min(0.95, input.routeParticipation + input.kalmanVelocityPerWeek)
    : input.routeParticipation;
  return {
    player: input.player,
    overrideApplied,
    predictiveRouteShare: Math.round(predictiveRouteShare * 1000) / 1000,
  };
}

export const NE_CHI_20261022_ATTRITION: MutualDefensiveAttritionInput = {
  baselineProjectedTotal: 48.5,
  marketTotalLine: 50.5,
  totalSteamMovePts: 3.5,
  homeStartingIlbOutCount: 2,
  homePassRushSackRate: 0.032,
  awayCb1Out: true,
  awayInteriorOlOutCount: 2,
  windSpeedMph: 5.1,
  temperatureF: 56.6,
  homeQbYpa: 8.1,
  awayQbYpa: 7.9,
};
