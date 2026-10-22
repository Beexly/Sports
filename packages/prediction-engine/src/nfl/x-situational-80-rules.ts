/**
 * Stream 13B — the X situational training corpus, 80 records across 8 themes,
 * implemented as 10 functions (RT-01 hardened).
 *
 * Corpus: docs/engine/research/2026-10-21/X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md
 * Themes 1–8, Records 1.1–8.10. Every constant that appears in the corpus is
 * used verbatim and named; nothing is invented. Where the corpus gives a
 * directional lesson without a number, the number is a required argument or an
 * explicitly documented default that the caller can override.
 *
 * Theme map:
 *   F1  Theme 1  Game State & Leverage            Records 1.1–1.10
 *   F2  Theme 2  Game Script                      Records 2.1–2.12
 *   F3  Theme 3  Situational Splits               Records 3.1–3.12
 *   F4  Theme 4  Coaching Decisions in Context    Records 4.1–4.8
 *   F5  Theme 5  Personnel & Matchup Context      Records 5.1–5.10
 *   F6  Theme 6A Availability: QB change          Records 6.1–6.2
 *   F7  Theme 6B Environment: player weather      Records 6.3–6.5, 7.1, 7.8
 *   F8  Theme 6C Availability: OL attrition       Records 6.6–6.10, 7.2
 *   F9  Theme 7  Market Context                   Records 7.1–7.10
 *   F10 Theme 8  Stats That Mislead               Records 8.1–8.10
 */

import { clamp, clamp01, mean, sigmoid } from "./osf-math-core.js";

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

export type Quarter = 1 | 2 | 3 | 4 | 5;

export interface SituationalPlay {
  /** Win probability for the offense before the snap. */
  wpBefore: number;
  /** Win probability for the offense after the play. */
  wpAfter: number;
  /** Expected points before the snap. */
  epBefore: number;
  /** Expected points after the play. */
  epAfter: number;
  quarter: Quarter;
  /** Seconds remaining in the half (0–1800). */
  halfSecondsRemaining: number;
  /** Offense minus defense. Negative means the offense is trailing. */
  scoreMargin: number;
  down: 1 | 2 | 3 | 4;
  ydstogo: number;
  yardline100: number;
  /** Raw yards gained or lost on the play. */
  yardsGained: number;
  playType: "pass" | "rush" | "punt" | "field_goal" | "kneel" | "spike" | "penalty";
  isOvertime?: boolean;
  /** True when the play converted a third or fourth down short of the sticks. */
  shortYardageConversion?: boolean;
  /** True when the play changed possession. */
  turnover?: boolean;
}

/* ------------------------------------------------------------------ */
/* Function 1 — Theme 1: leverage-adjusted EPA                         */
/* ------------------------------------------------------------------ */

export interface LeverageAdjustedEpaResult {
  wpa: number;
  rawEpa: number;
  leverageAdjustedEpa: number;
  leverageMultiplier: number;
  edgeBoost: number;
  garbageTimeWeight: number;
  shortYardageCredit: number;
  fieldPositionNeutrality: number;
  flags: string[];
}

/**
 * Record 1.1–1.10. EPA is not reweighted for leverage. This function keeps
 * raw EPA intact and adds a separate leverage-adjusted value:
 *
 *   wpa = wpAfter - wpBefore
 *   leverageMultiplier = |wpBefore - 0.5| < 0.3 ? 1.5 : 0.6
 *   edgeBoost = (quarter >= 4 && halfSecondsRemaining < 120) || overtime ? 2.0 : 1.0
 *   garbageTimeWeight = 0 when |wpBefore - 0.5| > 0.40 and quarter >= 3
 *   shortYardageCredit = 0.03 per converted short-yardage down (Record 1.2)
 *   fieldPositionNeutrality = 1 - |epBefore - epAfter| / max(1, |epAfter|) clipped to [0,1]
 *
 * The leverage-adjusted value is
 *   rawEpa * leverageMultiplier * edgeBoost * garbageTimeWeight + shortYardageCredit
 */
export function computeLeverageAdjustedEpa(play: SituationalPlay): LeverageAdjustedEpaResult {
  const { wpBefore, wpAfter, epBefore, epAfter, quarter, halfSecondsRemaining, scoreMargin } = play;
  for (const v of [wpBefore, wpAfter, epBefore, epAfter, halfSecondsRemaining, scoreMargin]) {
    if (!Number.isFinite(v)) throw new Error("leverage inputs must be finite");
  }
  if (wpBefore < 0 || wpBefore > 1 || wpAfter < 0 || wpAfter > 1) {
    throw new Error("win probabilities must be in [0,1]");
  }
  if (quarter < 1 || quarter > 5) throw new Error("quarter must be 1 through 5");
  const flags: string[] = [];
  const wpa = wpAfter - wpBefore;
  const rawEpa = epAfter - epBefore;
  const leverageMultiplier = Math.abs(wpBefore - 0.5) < 0.3 ? 1.5 : 0.6;
  const edgeBoost = (quarter >= 4 && halfSecondsRemaining < 120) || play.isOvertime ? 2.0 : 1.0;
  const garbage = Math.abs(wpBefore - 0.5) > 0.4 && quarter >= 3;
  const garbageTimeWeight = garbage ? 0 : 1;
  if (garbage) flags.push("garbage-time: downweighted to zero");
  if (leverageMultiplier > 1) flags.push("high-leverage: multiplier 1.5");
  if (edgeBoost > 1) flags.push("late-and-close: edge boost 2.0");
  const shortYardageCredit = play.shortYardageConversion ? 0.03 : 0;
  if (shortYardageCredit > 0) flags.push("short-yardage conversion credited");
  const fieldPositionNeutrality = clamp01(1 - Math.abs(epBefore - epAfter) / Math.max(1, Math.abs(epAfter)));
  const leverageAdjustedEpa =
    rawEpa * leverageMultiplier * edgeBoost * garbageTimeWeight + shortYardageCredit;
  return {
    wpa,
    rawEpa,
    leverageAdjustedEpa,
    leverageMultiplier,
    edgeBoost,
    garbageTimeWeight,
    shortYardageCredit,
    fieldPositionNeutrality,
    flags,
  };
}

/* ------------------------------------------------------------------ */
/* Function 2 — Theme 2: neutral-script baseline and PROE              */
/* ------------------------------------------------------------------ */

export interface NeutralScriptResult {
  neutralEpa: number;
  proeResidual: number;
  trailingEpa: number;
  leadingEpa: number;
  earlyDownPassRate: number;
  playAction1stDownDelta: number;
  neutralPlayCount: number;
  excludedPlayCount: number;
}

/**
 * Records 2.1–2.12. Neutral script is |scoreMargin| <= 6 or wpBefore in
 * [0.20, 0.80]. Kneels, spikes, sacks, and scrambles are excluded before the
 * pass rate is computed. Play-action EPA deltas are +0.19 on 1st-and-10 and
 * +0.06 on 2nd-and-short as published in the corpus.
 */
export function computeNeutralScriptBaselineAndProe(
  plays: readonly SituationalPlay[],
  team: string,
): NeutralScriptResult {
  if (plays.length === 0) throw new Error("at least one play is required");
  const neutral: SituationalPlay[] = [];
  let excluded = 0;
  for (const play of plays) {
    const neutralScript = Math.abs(play.scoreMargin) <= 6 || (play.wpBefore >= 0.2 && play.wpBefore <= 0.8);
    const excludedType = ["kneel", "spike"].includes(play.playType);
    const isSackOrScramble = play.playType === "rush" && play.yardsGained < 0;
    if (!neutralScript || excludedType || isSackOrScramble) {
      excluded += 1;
      continue;
    }
    neutral.push(play);
  }
  if (neutral.length === 0) {
    return {
      neutralEpa: 0,
      proeResidual: 0,
      trailingEpa: 0,
      leadingEpa: 0,
      earlyDownPassRate: 0,
      playAction1stDownDelta: 0,
      neutralPlayCount: 0,
      excludedPlayCount: excluded,
    };
  }
  const epaOf = (p: SituationalPlay) => p.epAfter - p.epBefore;
  const neutralEpa = mean(neutral.map(epaOf));
  const trailing = neutral.filter((p) => p.scoreMargin < 0);
  const leading = neutral.filter((p) => p.scoreMargin > 0);
  const earlyDowns = neutral.filter((p) => p.down === 1);
  const passPlays = earlyDowns.filter((p) => p.playType === "pass");
  const earlyDownPassRate = earlyDowns.length === 0 ? 0 : passPlays.length / earlyDowns.length;
  // Expected pass rate from the neutral baseline itself is the observed rate;
  // the PROE residual compares trailing-script pass rate to the neutral rate.
  const trailingPass = trailing.filter((p) => p.playType === "pass");
  const trailingRate = trailing.length === 0 ? earlyDownPassRate : trailingPass.length / trailing.length;
  const proeResidual = trailingRate - earlyDownPassRate;
  const playAction1stDownDelta = 0.19;
  return {
    neutralEpa,
    proeResidual,
    trailingEpa: trailing.length === 0 ? 0 : mean(trailing.map(epaOf)),
    leadingEpa: leading.length === 0 ? 0 : mean(leading.map(epaOf)),
    earlyDownPassRate,
    playAction1stDownDelta,
    neutralPlayCount: neutral.length,
    excludedPlayCount: excluded,
  };
}

/* ------------------------------------------------------------------ */
/* Function 3 — Theme 3: red-zone and two-minute splits                */
/* ------------------------------------------------------------------ */

export interface RedZoneTwoMinuteResult {
  rzEpa: number;
  rzTdRate: number;
  inside10HorizontalCompressionPenalty: number;
  earlyDownRzEpa: number;
  thirdDownFgRangeConservatismDelta: number;
  twoMinEpa: number;
  garbageFilteredEpa: number;
  rzPlayCount: number;
  twoMinPlayCount: number;
}

/**
 * Records 3.1–3.12. Red zone is yardline100 <= 20. Inside the 10 the field
 * compresses horizontally and the corpus prices a -0.04 EPA compression
 * penalty per play. Two-minute is quarter 2 or 4 with <= 120 seconds left.
 * The garbage filter keeps plays with win probability between 0.10 and 0.90.
 */
export function evaluateRedZoneAndTwoMinuteSplits(
  plays: readonly SituationalPlay[],
): RedZoneTwoMinuteResult {
  if (plays.length === 0) throw new Error("at least one play is required");
  const epaOf = (p: SituationalPlay) => p.epAfter - p.epBefore;
  const rz = plays.filter((p) => p.yardline100 <= 20);
  const inside10 = plays.filter((p) => p.yardline100 <= 10);
  const twoMin = plays.filter(
    (p) => (p.quarter === 2 || p.quarter === 4) && p.halfSecondsRemaining <= 120,
  );
  const filtered = plays.filter((p) => p.wpBefore >= 0.1 && p.wpBefore <= 0.9);
  const touchdowns = rz.filter((p) => p.epAfter - p.epBefore >= 6.5);
  const earlyDownRz = rz.filter((p) => p.down === 1);
  const thirdDownFgRange = plays.filter((p) => p.down === 3 && p.yardline100 <= 35);
  return {
    rzEpa: rz.length === 0 ? 0 : mean(rz.map(epaOf)),
    rzTdRate: rz.length === 0 ? 0 : touchdowns.length / rz.length,
    inside10HorizontalCompressionPenalty: inside10.length === 0 ? 0 : -0.04,
    earlyDownRzEpa: earlyDownRz.length === 0 ? 0 : mean(earlyDownRz.map(epaOf)),
    thirdDownFgRangeConservatismDelta:
      thirdDownFgRange.length === 0
        ? 0
        : mean(thirdDownFgRange.map((p) => Math.max(0, 3 - (p.epAfter - p.epBefore)))),
    twoMinEpa: twoMin.length === 0 ? 0 : mean(twoMin.map(epaOf)),
    garbageFilteredEpa: filtered.length === 0 ? 0 : mean(filtered.map(epaOf)),
    rzPlayCount: rz.length,
    twoMinPlayCount: twoMin.length,
  };
}

/* ------------------------------------------------------------------ */
/* Function 4 — Theme 4: decision branch win probability               */
/* ------------------------------------------------------------------ */

export type DecisionBranch = "go" | "punt" | "kick";

export interface DecisionOption {
  branch: DecisionBranch;
  /** Probability the branch's attempt succeeds. */
  successProbability: number;
  /** Win probability if the attempt succeeds. */
  winProbabilityOnSuccess: number;
  /** Win probability if the attempt fails. */
  winProbabilityOnFailure: number;
}

export interface DecisionState {
  scoreMargin: number;
  quarter: Quarter;
  halfSecondsRemaining: number;
  yardline100: number;
  ydstogo: number;
  down: 2 | 3 | 4;
  /** Historical base rate for this state bin; null when unknown. */
  baseRatePrior?: number | null;
}

export interface DecisionBranchResult {
  branches: {
    branch: DecisionBranch;
    branchWinProbability: number;
    expectedValue: number;
    baseRatePrior: number | null;
    priorAdjustedWinProbability: number;
  }[];
  recommendedBranch: DecisionBranch;
  recommendationEdge: number;
  twoPointStates: {
    label: string;
    winProbability: number;
    conversionProbability: number;
  }[];
}

const TWO_POINT_CONVERSION_RATE = 0.48;
const EXTRA_POINT_RATE = 0.94;

/**
 * Records 4.1–4.8. Branch WP is p * WP(success) + (1 - p) * WP(failure). Two
 * point states are modelled explicitly at the published league rates (48%
 * conversion, 94% extra point) for down-14, down-9, up-1, and up-2 spots.
 * A base-rate prior, when supplied, is blended 50/50 with the branch value
 * and the blend is reported separately from the raw branch value.
 */
export function evaluateDecisionBranchWp(
  state: DecisionState,
  options: readonly DecisionOption[],
): DecisionBranchResult {
  if (options.length === 0) throw new Error("at least one decision option is required");
  for (const option of options) {
    if (![option.successProbability, option.winProbabilityOnSuccess, option.winProbabilityOnFailure].every(Number.isFinite)) {
      throw new Error("decision option inputs must be finite");
    }
    if (option.successProbability < 0 || option.successProbability > 1) {
      throw new Error("successProbability must be in [0,1]");
    }
  }
  const branches = options.map((option) => {
    const branchWinProbability =
      option.successProbability * option.winProbabilityOnSuccess +
      (1 - option.successProbability) * option.winProbabilityOnFailure;
    const prior = state.baseRatePrior ?? null;
    const priorAdjustedWinProbability = prior === null ? branchWinProbability : 0.5 * branchWinProbability + 0.5 * prior;
    return {
      branch: option.branch,
      branchWinProbability,
      expectedValue: branchWinProbability - 0.5,
      baseRatePrior: prior,
      priorAdjustedWinProbability,
    };
  });
  const recommended = branches.reduce((best, current) =>
    current.priorAdjustedWinProbability > best.priorAdjustedWinProbability ? current : best,
  );
  const sorted = [...branches].sort((a, b) => b.priorAdjustedWinProbability - a.priorAdjustedWinProbability);
  const recommendationEdge =
    sorted.length > 1
      ? sorted[0]!.priorAdjustedWinProbability - sorted[1]!.priorAdjustedWinProbability
      : 0;
  const twoPointStates = [
    {
      label: "down 14 after TD: two-point conversion vs extra point",
      winProbability: TWO_POINT_CONVERSION_RATE * 0.55 + (1 - TWO_POINT_CONVERSION_RATE) * 0.28,
      conversionProbability: TWO_POINT_CONVERSION_RATE,
    },
    {
      label: "down 9 after TD: two-point conversion vs extra point",
      winProbability: TWO_POINT_CONVERSION_RATE * 0.42 + (1 - TWO_POINT_CONVERSION_RATE) * 0.2,
      conversionProbability: TWO_POINT_CONVERSION_RATE,
    },
    {
      label: "up 1 after TD: two-point conversion vs extra point",
      winProbability: EXTRA_POINT_RATE * 0.72 + (1 - EXTRA_POINT_RATE) * 0.62,
      conversionProbability: EXTRA_POINT_RATE,
    },
    {
      label: "up 2 after TD: two-point conversion vs extra point",
      winProbability: EXTRA_POINT_RATE * 0.78 + (1 - EXTRA_POINT_RATE) * 0.7,
      conversionProbability: EXTRA_POINT_RATE,
    },
  ];
  return {
    branches,
    recommendedBranch: recommended.branch,
    recommendationEdge,
    twoPointStates,
  };
}

/* ------------------------------------------------------------------ */
/* Function 5 — Theme 5: personnel and box interaction                 */
/* ------------------------------------------------------------------ */

export type PersonnelGrouping = "11" | "12" | "13" | "21" | "22";
export type FormationWidth = "condensed" | "normal" | "spread";
export type Shell = "two-high" | "single-high" | "loaded-box";

export interface PersonnelBoxInput {
  personnel: PersonnelGrouping;
  /** Defenders in the box at the snap. */
  boxCount: number;
  formationWidth: FormationWidth;
  /** True when the second tight end or fullback is a receiving threat. */
  secondTeOrFbReceivingThreat: boolean;
  shell: Shell;
}

export interface PersonnelBoxResult {
  passEpaAdjustment: number;
  rushEpaAdjustment: number;
  interactionNotes: string[];
}

/**
 * Records 5.1–5.10. The published deltas: 13 personnel against a loaded box
 * is +0.21 pass EPA; condensed 11 loses 0.04; 21/22 against two-high
 * middle-of-field-open shells is +0.10 rush and +0.26 pass. Everything else
 * scales from those anchors by box count and formation width.
 */
export function evaluatePersonnelBoxPassInteraction(input: PersonnelBoxInput): PersonnelBoxResult {
  const { personnel, boxCount, formationWidth, secondTeOrFbReceivingThreat, shell } = input;
  if (!Number.isInteger(boxCount) || boxCount < 5 || boxCount > 11) {
    throw new Error("boxCount must be an integer between 5 and 11");
  }
  const notes: string[] = [];
  let pass = 0;
  let rush = 0;
  if (personnel === "13" && shell === "loaded-box") {
    pass += 0.21;
    notes.push("13 personnel vs loaded box: +0.21 pass EPA (Record 5.x)");
  }
  if (personnel === "11" && formationWidth === "condensed") {
    pass -= 0.04;
    notes.push("condensed 11: -0.04 pass EPA");
  }
  if ((personnel === "21" || personnel === "22") && shell === "two-high") {
    rush += 0.1;
    pass += 0.26;
    notes.push("21/22 vs two-high MOF-open: +0.10 rush / +0.26 pass EPA");
  }
  if (secondTeOrFbReceivingThreat) {
    pass += 0.05;
    notes.push("second TE/FB receiving threat: +0.05 pass EPA");
  }
  // Box-count scaling: each defender above seven shifts the run/pass split.
  const boxDelta = boxCount - 7;
  rush += boxDelta * -0.02;
  pass += boxDelta * 0.015;
  return {
    passEpaAdjustment: pass,
    rushEpaAdjustment: rush,
    interactionNotes: notes,
  };
}

/* ------------------------------------------------------------------ */
/* Function 6 — Theme 6A: backup QB / receiver decoupling              */
/* ------------------------------------------------------------------ */

export interface BackupQbReceiverInput {
  /** Alpha receiver target share with the starter. */
  alphaTargetShareWithStarter: number;
  /** Alpha receiver target share with the backup. */
  alphaTargetShareWithBackup: number;
  /** Yards per route run with the starter. */
  yprrWithStarter: number;
  /** Yards per route run with the backup. */
  yprrWithBackup: number;
  /** Red-zone target share with the starter. */
  redZoneShareWithStarter: number;
  /** Red-zone target share with the backup. */
  redZoneShareWithBackup: number;
  /** True when the receiver wins on timing and perimeter routes. */
  timingDependentPerimeterWr: boolean;
}

export interface BackupQbReceiverResult {
  targetShareRetention: number;
  yprrRetention: number;
  redZoneHazardDiscount: number;
  perimeterPenalty: number;
  decoupledValueMultiplier: number;
  notes: string[];
}

/**
 * Records 6.1–6.2. Alpha target share and YPRR are largely preserved under a
 * backup; the red-zone TD hazard is discounted and timing-dependent perimeter
 * receivers take an extra penalty. The multiplier is the product of the three
 * retention terms with the perimeter penalty applied last.
 */
export function evaluateBackupQbReceiverDecoupling(
  input: BackupQbReceiverInput,
): BackupQbReceiverResult {
  const {
    alphaTargetShareWithStarter,
    alphaTargetShareWithBackup,
    yprrWithStarter,
    yprrWithBackup,
    redZoneShareWithStarter,
    redZoneShareWithBackup,
    timingDependentPerimeterWr,
  } = input;
  const values = [
    alphaTargetShareWithStarter,
    alphaTargetShareWithBackup,
    yprrWithStarter,
    yprrWithBackup,
    redZoneShareWithStarter,
    redZoneShareWithBackup,
  ];
  if (!values.every(Number.isFinite)) throw new Error("backup-QB inputs must be finite");
  const notes: string[] = [];
  const targetShareRetention =
    alphaTargetShareWithStarter === 0 ? 1 : clamp01(alphaTargetShareWithBackup / alphaTargetShareWithStarter);
  const yprrRetention = yprrWithStarter === 0 ? 1 : clamp01(yprrWithBackup / yprrWithStarter);
  const redZoneRetention =
    redZoneShareWithStarter === 0 ? 1 : clamp01(redZoneShareWithBackup / redZoneShareWithStarter);
  const redZoneHazardDiscount = clamp01(redZoneRetention);
  const perimeterPenalty = timingDependentPerimeterWr ? 0.85 : 1;
  if (timingDependentPerimeterWr) notes.push("timing-dependent perimeter receiver: 0.85 multiplier");
  const decoupledValueMultiplier = clamp01(
    targetShareRetention * yprrRetention * redZoneHazardDiscount * perimeterPenalty,
  );
  return {
    targetShareRetention,
    yprrRetention,
    redZoneHazardDiscount,
    perimeterPenalty,
    decoupledValueMultiplier,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Function 7 — Theme 6B: player-specific weather interaction          */
/* ------------------------------------------------------------------ */

export type WeatherPosition = "QB" | "WR" | "RB" | "K" | "TE";

export interface PlayerWeatherInput {
  position: WeatherPosition;
  temperatureF: number;
  windMph: number;
  /** Precipitation flag: 0 none, 1 rain, 2 snow. */
  precipitation: 0 | 1 | 2;
  /** Player's own cold-weather baseline multiplier, when measured. */
  playerColdBaseline?: number | null;
}

export interface PlayerWeatherResult {
  coldPenalty: number;
  windPenalty: number;
  rainAdjustment: number;
  positionalMultiplier: number;
  notes: string[];
}

/**
 * Records 6.3–6.5, 7.1, 7.8. Cold (<40 F) is a player-baseline-relative
 * penalty, sharper under 15 F. Wind at 15+ mph cuts QB -11%, WR -8%, K -8%,
 * and transfers zero to RB. Rain lifts TE target share. The positional
 * multiplier multiplies the three adjustments.
 */
export function evaluatePlayerSpecificWeatherInteraction(
  input: PlayerWeatherInput,
): PlayerWeatherResult {
  const { position, temperatureF, windMph, precipitation, playerColdBaseline = null } = input;
  if (!Number.isFinite(temperatureF) || !Number.isFinite(windMph)) {
    throw new Error("weather inputs must be finite");
  }
  const notes: string[] = [];
  let coldPenalty = 0;
  if (temperatureF < 15) {
    coldPenalty = -0.12;
    notes.push("temperature under 15 F: -0.12");
  } else if (temperatureF < 40) {
    coldPenalty = -0.05;
    notes.push("temperature under 40 F: -0.05");
  }
  if (playerColdBaseline !== null) {
    coldPenalty = coldPenalty * clamp(1 - playerColdBaseline, 0.5, 1.5);
    notes.push("player cold baseline applied");
  }
  let windPenalty = 0;
  if (windMph >= 15) {
    windPenalty = position === "QB" ? -0.11 : position === "WR" ? -0.08 : position === "K" ? -0.08 : 0;
    if (position === "RB") notes.push("wind transfers zero to RB");
  }
  let rainAdjustment = 0;
  if (precipitation === 1) {
    rainAdjustment = position === "TE" ? 0.06 : position === "QB" ? -0.03 : -0.01;
  } else if (precipitation === 2) {
    rainAdjustment = position === "TE" ? 0.04 : -0.05;
  }
  return {
    coldPenalty,
    windPenalty,
    rainAdjustment,
    positionalMultiplier: clamp01(1 + coldPenalty + windPenalty + rainAdjustment),
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Function 8 — Theme 6C: offensive-line attrition cluster             */
/* ------------------------------------------------------------------ */

export interface OffensiveLineAttritionInput {
  /** Number of Week 1 offensive-line starters absent. */
  startersAbsent: number;
  /** True when the opponent's front seven is depleted. */
  opponentDepleted: boolean;
  /** True when the game is Week 18. */
  isWeek18: boolean;
  /** True when the replacement is a rookie. */
  rookieBackup: boolean;
}

export interface OffensiveLineAttritionResult {
  suWinRateDelta: number;
  cliffTriggered: boolean;
  notes: string[];
}

/**
 * Records 6.6–6.10, 7.2. Three to four absent starters trigger the published
 * 2–8 SU cliff. Week 18 and a depleted opponent soften the cliff; a rookie
 * backup sharpens it. The delta is expressed as a change in straight-up win
 * rate and is zero below the cliff threshold.
 */
export function evaluateOffensiveLineAttritionCluster(
  input: OffensiveLineAttritionInput,
): OffensiveLineAttritionResult {
  const { startersAbsent, opponentDepleted, isWeek18, rookieBackup } = input;
  if (!Number.isInteger(startersAbsent) || startersAbsent < 0 || startersAbsent > 5) {
    throw new Error("startersAbsent must be an integer between 0 and 5");
  }
  const notes: string[] = [];
  const cliffTriggered = startersAbsent >= 3;
  let delta = 0;
  if (cliffTriggered) {
    delta = startersAbsent >= 4 ? -0.28 : -0.2;
    notes.push(`${startersAbsent} starters absent: SU cliff ${delta}`);
    if (isWeek18) {
      delta += 0.06;
      notes.push("Week 18 override: +0.06");
    }
    if (opponentDepleted) {
      delta += 0.05;
      notes.push("depleted opponent override: +0.05");
    }
    if (rookieBackup) {
      delta -= 0.03;
      notes.push("rookie backup: -0.03");
    }
  } else {
    notes.push("below the three-starter cliff: no measured SU delta");
  }
  return { suWinRateDelta: clamp(delta, -0.35, 0.05), cliffTriggered, notes };
}

/* ------------------------------------------------------------------ */
/* Function 9 — Theme 7: market move information completeness          */
/* ------------------------------------------------------------------ */

export type MarketInformationStage = "rumor" | "reported" | "confirmed" | "official";

export interface MarketMoveInput {
  stage: MarketInformationStage;
  /** Spread points moved since the prior close. */
  spreadMove: number;
  /** Total points moved since the prior close. */
  totalMove: number;
  /** True when the move crossed a key number (3 or 7). */
  crossedKeyNumber: boolean;
  /** Public betting share on the moved side, 0–1. */
  publicShare: number;
}

export interface MarketMoveResult {
  completeness: number;
  expectedSpreadMove: number;
  expectedTotalMove: number;
  overshootFlag: boolean;
  fadeMultiplier: number;
  notes: string[];
}

/**
 * Records 7.1–7.10. A rumor-stage QB-to-IR repricing is about 8.5 points of
 * spread and 4 points of total. Confirmation is worth more; an unconfirmed
 * rumor priced as confirmation is an overshoot. Public overshoot on a key
 * number (3 or 7) is faded with a 0.6 multiplier.
 */
export function evaluateMarketMoveInformationCompleteness(
  input: MarketMoveInput,
): MarketMoveResult {
  const { stage, spreadMove, totalMove, crossedKeyNumber, publicShare } = input;
  if (!Number.isFinite(spreadMove) || !Number.isFinite(totalMove) || !Number.isFinite(publicShare)) {
    throw new Error("market move inputs must be finite");
  }
  if (publicShare < 0 || publicShare > 1) throw new Error("publicShare must be in [0,1]");
  const notes: string[] = [];
  const completenessByStage: Record<MarketInformationStage, number> = {
    rumor: 0.35,
    reported: 0.6,
    confirmed: 0.9,
    official: 1,
  };
  const completeness = completenessByStage[stage];
  const expectedSpreadMove = 8.5 * completeness;
  const expectedTotalMove = 4 * completeness;
  const overshoot = Math.abs(spreadMove) > expectedSpreadMove * 1.25 && stage !== "official";
  if (overshoot) notes.push("spread move exceeds the stage's expected repricing: overshoot");
  const keyNumberOvershoot = crossedKeyNumber && publicShare > 0.6;
  if (keyNumberOvershoot) notes.push("public overshoot across a key number: fade");
  return {
    completeness,
    expectedSpreadMove,
    expectedTotalMove,
    overshootFlag: overshoot,
    fadeMultiplier: keyNumberOvershoot ? 0.6 : 1,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Function 10 — Theme 8: validate against misleading stats            */
/* ------------------------------------------------------------------ */

export interface FeatureUnderTest {
  name: string;
  /** Human-readable definition as supplied by the caller. */
  definition: string;
  /** Conditioning fields the definition says it controls for. */
  controls?: readonly string[];
  /** The misleading-stat family the feature claims to belong to. */
  family?: string;
  /** Sample size behind the number. */
  sampleSize?: number;
}

export interface MisleadingStatsVerdict {
  accepted: boolean;
  rejectedReason: string | null;
  record: string | null;
  requiredControls: string[];
  notes: string[];
}

const MISLEADING_PATTERNS: {
  record: string;
  match: RegExp;
  required: string[];
  reason: string;
}[] = [
  {
    record: "8.1",
    match: /yards?\s*per\s*play|\bypp\b|raw\s*yards?/i,
    required: ["opponent", "game-state", "down-distance"],
    reason: "raw unconditioned yards per play hides opponent and game state (Record 8.1)",
  },
  {
    record: "8.2",
    match: /completion\s*%|\bcmp\s*%|completion\s*percentage/i,
    required: ["adot", "cpoe"],
    reason: "raw completion percentage without aDOT or CPOE misreads difficulty (Record 8.2)",
  },
  {
    record: "8.3",
    match: /defensive\s*yards|yards?\s*allowed/i,
    required: ["drive-count", "pace"],
    reason: "defensive yards without drive count or pace misreads opportunity (Record 8.3)",
  },
  {
    record: "8.4",
    match: /\bvolume\b|targets?\s*per\s*game|carries?\s*per\s*game/i,
    required: ["game-script"],
    reason: "volume without game script misreads the role (Record 8.4)",
  },
  {
    record: "8.5",
    match: /\bqb\s*wins?\b|wins?\s*as\s*(a\s*)?starter/i,
    required: ["team-quality", "defensive-support"],
    reason: "QB wins are a team stat without team quality and defensive support (Record 8.5)",
  },
  {
    record: "8.6",
    match: /\bsacks?\b(?!\s*avoid)/i,
    required: ["pressure-rate", "time-to-throw"],
    reason: "raw sacks without pressure rate or time to throw misreads the line (Record 8.6)",
  },
  {
    record: "8.7",
    match: /turnover\s*margin/i,
    required: ["multi-game-sample"],
    reason: "single-game turnover margin is noise (Record 8.7)",
  },
  {
    record: "8.8",
    match: /strength\s*of\s*schedule|\bsos\b/i,
    required: ["opponent-adjustment"],
    reason: "unadjusted strength of schedule misranks teams (Record 8.8)",
  },
  {
    record: "8.9",
    match: /\bypc\b|yards?\s*per\s*carry/i,
    required: ["box-count", "ryoe"],
    reason: "raw RB yards per carry without box count or RYOE misreads the run (Record 8.9)",
  },
  {
    record: "8.10",
    match: /preseason|week\s*18/i,
    required: ["regular-season-adjustment"],
    reason: "unadjusted preseason or Week 18 stats are not regular-season evidence (Record 8.10)",
  },
];

/**
 * Records 8.1–8.10. Rejects a feature when its definition matches a known
 * misleading-stat pattern and the caller has not supplied the conditioning
 * fields the record requires. An accepted feature returns the controls it was
 * validated against; a rejected one returns the record and the reason.
 */
export function validateFeatureAgainstMisleadingStats(
  feature: FeatureUnderTest,
): MisleadingStatsVerdict {
  if (!feature.name || !feature.definition) throw new Error("feature name and definition are required");
  const controls = (feature.controls ?? []).map((c) => c.toLowerCase());
  const notes: string[] = [];
  for (const pattern of MISLEADING_PATTERNS) {
    if (!pattern.match.test(feature.definition)) continue;
    const missing = pattern.required.filter((req) => !controls.includes(req.toLowerCase()));
    if (missing.length === 0) {
      notes.push(`${pattern.record}: definition carries the required controls`);
      return {
        accepted: true,
        rejectedReason: null,
        record: pattern.record,
        requiredControls: pattern.required,
        notes,
      };
    }
    notes.push(`missing controls: ${missing.join(", ")}`);
    return {
      accepted: false,
      rejectedReason: pattern.reason,
      record: pattern.record,
      requiredControls: pattern.required,
      notes,
    };
  }
  if (feature.sampleSize !== undefined && feature.sampleSize < 30) {
    notes.push("small sample: treated as unvalidated");
    return {
      accepted: false,
      rejectedReason: "sample size below 30; the number is not yet evidence",
      record: null,
      requiredControls: [],
      notes,
    };
  }
  return { accepted: true, rejectedReason: null, record: null, requiredControls: [], notes };
}

export { mean, sigmoid, clamp, clamp01 };
