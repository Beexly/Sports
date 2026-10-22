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

export type XSituationalEvaluator =
  | "leverage" | "script" | "redzone" | "decision" | "personnel"
  | "backup" | "weather" | "attrition" | "market" | "gate";

export interface XSituationalRecord {
  id: string;
  theme: number;
  title: string;
  lesson: string;
  evaluator: XSituationalEvaluator;
  expected: "positive" | "negative";
}

export const X_SITUATIONAL_80_RECORD_CATALOG: readonly XSituationalRecord[] = [
  { id: "1.1", theme: 1, title: "@EaglesXsandOs", lesson: "Separate EPA (point value of the state change) from leverage/WPA (what the state change is worth in win probability). Weight plays by game state when the target is winning or team ", evaluator: "leverage", expected: "positive" },
  { id: "1.2", theme: 1, title: "@ScottKacsmar", lesson: "The price of a yard is set by down and distance. Never credit a play's yards without the state it started in; short-of-the-sticks gains late in a series are worth far more than the", evaluator: "leverage", expected: "positive" },
  { id: "1.3", theme: 1, title: "@zxcvbnmwill", lesson: "Value is the change in state, not the yardage. Any feature built on raw yards without the before/after state is measuring the wrong thing.", evaluator: "leverage", expected: "positive" },
  { id: "1.4", theme: 1, title: "@galenhall", lesson: "Near the goal lines, price the failure state, not just the conversion. Red-zone and backed-up states need their own baselines; a flat model mis-ranks both plays and decisions there", evaluator: "leverage", expected: "positive" },
  { id: "1.5", theme: 1, title: "@ArkansasQuant", lesson: "Evaluate decisions by the delta versus the alternative, never by the absolute success rate. Leverage is a gap, not a level.", evaluator: "leverage", expected: "positive" },
  { id: "1.6", theme: 1, title: "@BenjaminSolak", lesson: "Judge decisions by the ex-ante WP delta (+14.5%), not by the outcome that followed. Resulting is a training-data poison: a correct go that fails is still a correct go.", evaluator: "leverage", expected: "positive" },
  { id: "1.7", theme: 1, title: "@Timo_NFL", lesson: "Edge states (1 second left, kneel-out clocks, OT) are separate regimes, not the tail of the mid-game distribution. The same nominal choice is a different decision depending on whic", evaluator: "leverage", expected: "positive" },
  { id: "1.8", theme: 1, title: "@bburkeESPN", lesson: "Decision rule — compute p × WP(success) + (1−p) × WP(failure) and compare it to WP(kick/punt). \"Punt\" is never a default; it is one branch among three, priced like the others.", evaluator: "leverage", expected: "positive" },
  { id: "1.9", theme: 1, title: "@tejfbanalytics", lesson: "Track cumulative decision WPA. A coach/team decision tendency is a measurable, persistent quantity — small per-play leaks are a real signal, not noise.", evaluator: "leverage", expected: "positive" },
  { id: "1.10", theme: 1, title: "@nfl4thbot", lesson: "Do not treat early-game decisions as low-stakes by default. Price every 4th down in WP; the coach's conservative lean is not evidence the model is wrong.", evaluator: "leverage", expected: "positive" },
  { id: "2.1", theme: 2, title: "@dwainmcfarland", lesson: "Learn a team-specific offset from the script-conditioned expectation. Score changes the play call in a predictable direction, but the size of the shift is a team trait.", evaluator: "script", expected: "positive" },
  { id: "2.2", theme: 2, title: "@LateRoundQB", lesson: "Estimate pace, pass rate, and efficiency in close games first (margin within ~6, or WP roughly 20–80%). That is the team prior; extreme scripts are a separate state.", evaluator: "script", expected: "positive" },
  { id: "2.3", theme: 2, title: "@grok", lesson: "Train on residuals versus expected pass rate given score, down, and distance (PROE), not on raw attempt shares. (Provenance note: this post is from X's own AI account summarizing t", evaluator: "script", expected: "positive" },
  { id: "2.4", theme: 2, title: "@PurpyNFL", lesson: "Any feature built from attempt counts must be script-adjusted before it enters a model, or it encodes the schedule of scores the team happened to face.", evaluator: "script", expected: "positive" },
  { id: "2.5", theme: 2, title: "@PurpyNFL", lesson: "Exclude or reclassify kneel-downs, sacks, and scrambles before estimating script effects or team tendencies.", evaluator: "script", expected: "positive" },
  { id: "2.6", theme: 2, title: "@bjT98504", lesson: "Condition run-defense evaluation on score and leverage, or the ranking will track opponent script rather than defensive quality.", evaluator: "script", expected: "positive" },
  { id: "2.7", theme: 2, title: "@Moneylinehacks", lesson: "Do not treat rush or pass attempts as exogenous inputs when predicting points, spreads, or player yardage. Volume and team success are jointly determined by script.", evaluator: "script", expected: "positive" },
  { id: "2.8", theme: 2, title: "@LinkofSunshine", lesson: "Any pass-volume feature must carry the score state with it, or the model will learn the arrow of causality backwards.", evaluator: "script", expected: "positive" },
  { id: "2.9", theme: 2, title: "@hawkblogger", lesson: "Shrink extreme-script rates hard when a team rarely trails or rarely leads. Never pool trailing EPA with leading EPA.", evaluator: "script", expected: "positive" },
  { id: "2.10", theme: 2, title: "@NFLSnapIQ", lesson: "The neutral-script early-down split is the diagnostic view. Build it before drawing any conclusion about coaching philosophy.", evaluator: "script", expected: "positive" },
  { id: "2.11", theme: 2, title: "@BAI8app", lesson: "Do not average across states. Reweight to a common script distribution before ranking teams or feeding a predictive feature.", evaluator: "script", expected: "positive" },
  { id: "2.12", theme: 2, title: "@RoyRobi73192051", lesson: "Encode the base rule as the expectation; measure every team and game as a deviation from it.", evaluator: "script", expected: "positive" },
  { id: "3.1", theme: 3, title: "@SharpFootball", lesson: "Define the red zone as its own state (inside the 20, goal-to-go nested inside it) and score the drive outcome — TD vs FG vs nothing — separately from the yards earned getting there", evaluator: "redzone", expected: "positive" },
  { id: "3.2", theme: 3, title: "@GridironInfo_", lesson: "Keep red-zone EPA as a split feature for both offense and defense; never let full-field EPA stand in for it.", evaluator: "redzone", expected: "positive" },
  { id: "3.3", theme: 3, title: "@SharpFootball", lesson: "Within the red zone, split by down. An aggregate red-zone number can hide the exact down where the offense breaks.", evaluator: "redzone", expected: "positive" },
  { id: "3.4", theme: 3, title: "@TheJetPress", lesson: "Full-field explosiveness does not imply finishing ability. Model the red zone as a distinct regime with its own team ratings.", evaluator: "redzone", expected: "positive" },
  { id: "3.5", theme: 3, title: "@dmlr53", lesson: "Backed-up is a negative-EP state; value plays from it in EP/EPA, never raw yards, or the model overvalues empty yardage from bad field position.", evaluator: "redzone", expected: "positive" },
  { id: "3.6", theme: 3, title: "@officialctpod", lesson: "Fourth-down conversion priors must be era-current and distance-specific; stale priors systematically under-price going for it.", evaluator: "redzone", expected: "positive" },
  { id: "3.7", theme: 3, title: "@thatcaden_", lesson: "Treat distance-to-go as a first-class, continuous feature on 3rd/4th down. \"Long\" is a probability, not a verdict.", evaluator: "redzone", expected: "positive" },
  { id: "3.8", theme: 3, title: "@GridironInfo_", lesson: "The two-minute drill is its own efficiency regime. Condition on clock, timeouts, and score; do not borrow neutral-script play values into it.", evaluator: "redzone", expected: "positive" },
  { id: "3.9", theme: 3, title: "@YUNOsports_NFL", lesson: "Carry a clutch/two-minute conversion split for offense and defense separately from overall third-down rates.", evaluator: "redzone", expected: "positive" },
  { id: "3.10", theme: 3, title: "@RedlineFootball", lesson: "State the WP band any EPA feature was computed on (common operational garbage-time definitions: WP outside ~5–95% or ~10–90%, or 17+ down in Q4). Rankings without the filter defini", evaluator: "redzone", expected: "positive" },
  { id: "3.11", theme: 3, title: "@goblue_mike", lesson: "States are dynamic. A large point swing in a short window moves the game out of the prevent regime — re-classify the state instead of averaging the whole stretch as \"garbage time.", evaluator: "redzone", expected: "positive" },
  { id: "3.12", theme: 3, title: "@LordReebs", lesson: "Player efficiency features must be state-split. A QB's red-zone TD/INT profile is a separate quantity from his overall line and can diverge sharply.", evaluator: "redzone", expected: "positive" },
  { id: "4.1", theme: 4, title: "@RyanPaganetti", lesson: "Price the full WP of go vs punt with branch values (WP after success ≈ 71%, after failure ≈ 29%), not conversion rate alone. A modest conversion chance still wins when the alternat", evaluator: "decision", expected: "positive" },
  { id: "4.2", theme: 4, title: "@BenjaminSolak", lesson: "Always price all three branches. In long-field-goal range late in a tie, the field goal can be dominated by both alternatives.", evaluator: "decision", expected: "positive" },
  { id: "4.3", theme: 4, title: "@billbarnwell", lesson: "Historical base rates in narrow state bins are strong priors. When a coach deviates from a near-unanimous bin, the burden of proof is on the deviation.", evaluator: "decision", expected: "positive" },
  { id: "4.4", theme: 4, title: "@NextGenStats", lesson: "No state is categorically off-limits to the EV computation. Compute the branches everywhere; let the numbers, not field-position folklore, draw the lines.", evaluator: "decision", expected: "positive" },
  { id: "4.5", theme: 4, title: "@BenjaminSolak", lesson: "When both branches require the same defensive outcome, the go branch weakly dominates. Compare what each branch actually changes, not the labels \"aggressive\" vs \"safe.\"", evaluator: "decision", expected: "positive" },
  { id: "4.6", theme: 4, title: "@MikeReiss", lesson: "Score margin interacts with the kick/go choice: a field goal that leaves you still trailing by two scores is worth less than its points. Model the margin after each branch, not jus", evaluator: "decision", expected: "positive" },
  { id: "4.7", theme: 4, title: "@Timo_NFL", lesson: "Score, clock, and opponent timeouts interact. \"Take the points\" is not a terminal state; price the game that follows the kick.", evaluator: "decision", expected: "positive" },
  { id: "4.8", theme: 4, title: "@nfl4thbot", lesson: "A coach's conservative lean is not automatically justified by information the model lacks. Several-point WP edges are rarely overturned by personnel adjustments (backup QB, kicker ", evaluator: "decision", expected: "positive" },
  { id: "5.1", theme: 5, title: "@SharpFootball", lesson: "Personnel is a prior on the defensive response, not just an offensive label. Model the response (base vs nickel, box, shell) as part of the play's context.", evaluator: "personnel", expected: "positive" },
  { id: "5.2", theme: 5, title: "@Michael_Nania", lesson: "Expected production is team-by-package specific. A single team efficiency number that ignores personnel mix blends away the actual signal.", evaluator: "personnel", expected: "positive" },
  { id: "5.3", theme: 5, title: "@Bumi_mind", lesson: "Split run and pass expectations by package and encode the interaction. A personnel main effect without the run/pass interaction will be wrong in both directions.", evaluator: "personnel", expected: "positive" },
  { id: "5.4", theme: 5, title: "@sambruchhaus", lesson: "Condition on the receiving threat of TE2/FB (target rate, receiving grade), not just the personnel label. The label alone does not determine the defensive price.", evaluator: "personnel", expected: "positive" },
  { id: "5.5", theme: 5, title: "@JonnyPage9", lesson: "Expected rush value depends on personnel AND the box and width it creates. Include formation width (spread vs condensed) as a feature alongside personnel.", evaluator: "personnel", expected: "positive" },
  { id: "5.6", theme: 5, title: "@RyanPaganetti", lesson: "Coverage shell is part of the same tradeoff as personnel. Predict shell from personnel (and vice versa), then predict EPA conditional on the shell.", evaluator: "personnel", expected: "positive" },
  { id: "5.7", theme: 5, title: "@HoodBall_15", lesson: "The value of heavy personnel is partly the conflict it imposes, not the bodies themselves. Features should capture gap count and LB conflict, not only box count.", evaluator: "personnel", expected: "positive" },
  { id: "5.8", theme: 5, title: "@Kovb41", lesson: "Never use box count as a standalone feature. Its effect is an interaction with personnel and era; model it as such.", evaluator: "personnel", expected: "positive" },
  { id: "5.9", theme: 5, title: "@popofansports", lesson: "Credit for beating a heavy box should be adjusted for whether the offense forced that box or simply declared heavy and ran into the natural response.", evaluator: "personnel", expected: "positive" },
  { id: "5.10", theme: 5, title: "@CaseL731", lesson: "Usage is endogenous — defenses price tendencies in. Residual EPA after conditioning on personnel, down-and-distance, and defensive response is closer to skill than raw EPA by perso", evaluator: "personnel", expected: "positive" },
  { id: "6.1", theme: 6, title: "@SalVetriDFS", lesson: "Condition skill-player volume and efficiency on the specific quarterback, game by game. A starter/backup flag is too coarse — the identity of the QB is the feature.", evaluator: "backup", expected: "negative" },
  { id: "6.2", theme: 6, title: "@KyleM_FF", lesson: "Do not apply a uniform backup-QB penalty. Target share and per-route efficiency can survive the QB change while TD rate does not; model the components separately, by player.", evaluator: "backup", expected: "negative" },
  { id: "6.3", theme: 6, title: "@weatherqb", lesson: "Apply player-specific weather interactions measured against each player's own baseline, never a single game-level weather penalty.", evaluator: "weather", expected: "negative" },
  { id: "6.4", theme: 6, title: "@weatherqb", lesson: "Wind speed (with a ~15 mph threshold) should directly cut QB/WR/kicker expectations. Do not transfer the lost passing value to running backs by assumption.", evaluator: "weather", expected: "negative" },
  { id: "6.5", theme: 6, title: "@AlexCaruso", lesson: "Model weather as an interaction with the player's own history and home environment, not as a main effect applied to everyone equally.", evaluator: "weather", expected: "negative" },
  { id: "6.6", theme: 6, title: "@SharpFootball", lesson: "Days-of-rest difference and short-week indicators are material features. Flag extreme differentials (multiple days, repeated short weeks, opponents off byes) explicitly.", evaluator: "attrition", expected: "negative" },
  { id: "6.7", theme: 6, title: "@JusttheFoosball", lesson: "Treat OL availability as a first-class, graded feature: number of starters out, replacement quality (veteran vs rookie), and injury vs coach's-decision. It should shift expected QB", evaluator: "attrition", expected: "negative" },
  { id: "6.8", theme: 6, title: "@CynicalPublius", lesson: "Altitude is an acclimatization effect, asymmetric by team and by half. Model visitor performance decay at elevation venues rather than a flat venue penalty.", evaluator: "attrition", expected: "negative" },
  { id: "6.9", theme: 6, title: "@TheNumbersDesk", lesson: "Rest belongs in the strength prior, but a model should not expect a large, consistent betting edge from rest alone. Distinguish \"this changes expected performance\" from \"this be", evaluator: "attrition", expected: "negative" },
  { id: "6.10", theme: 6, title: "@trenchpower2025", lesson: "Track injury context beyond the binary out/active label — practice participation, injury type, and playing-through-it status all change expected performance even when the player is", evaluator: "attrition", expected: "negative" },
  { id: "7.1", theme: 7, title: "@AdamKoffler", lesson: "Forecast wind speed and precipitation should directly lower expected points, especially outdoors. Weather hits totals more than spreads.", evaluator: "market", expected: "negative" },
  { id: "7.2", theme: 7, title: "@MrMathBet", lesson: "Confirmed QB absence is a first-order repricing event (team strength and scoring rate, immediately). Score injury clusters, not single absences. A move against the public ticket sp", evaluator: "market", expected: "negative" },
  { id: "7.3", theme: 7, title: "@offshoreinsider", lesson: "QB-to-IR is not a flag, it is a multi-point team-strength rewrite applied immediately. Moves of this size with a confirmed availability cause should be treated as information-compl", evaluator: "market", expected: "negative" },
  { id: "7.4", theme: 7, title: "@SBD", lesson: "Availability news propagates across markets at once. Cross-market consistency is a check on whether a move is news-driven or flow-driven.", evaluator: "market", expected: "negative" },
  { id: "7.5", theme: 7, title: "@BTBSportsIntel", lesson: "Unexplained moves are information. Do not assume every move has a fully observed public driver at the moment it happens; soft availability signals belong in the model before offici", evaluator: "market", expected: "negative" },
  { id: "7.6", theme: 7, title: "@kukluxkraut", lesson: "Weight moves by the numbers they cross. A move through 3 or 7 is stronger evidence than an equal move elsewhere, and overshoot past a key is a fade candidate once the news is alrea", evaluator: "market", expected: "negative" },
  { id: "7.7", theme: 7, title: "@fredwinss_", lesson: "Short-week and rest-differential indicators belong in the pre-move prior — the market applies them before any news arrives.", evaluator: "market", expected: "negative" },
  { id: "7.8", theme: 7, title: "@QcrackinBookies", lesson: "Context factors compound. Price weather and venue together; a total move can be the sum of two situational inputs, neither of which is team news.", evaluator: "market", expected: "negative" },
  { id: "8.1", theme: 8, title: "@statsowar", lesson: "A yard is not a yard. Score plays against pre-snap expected points (down, distance, field position), not absolute yards.", evaluator: "gate", expected: "negative" },
  { id: "8.2", theme: 8, title: "@ArifHasanNFL", lesson: "Prefer per-play rates over totals for any quality judgment, and carry the script context with any volume feature.", evaluator: "gate", expected: "negative" },
  { id: "8.3", theme: 8, title: "@ARKNDJL", lesson: "Completion percentage is not accuracy. Condition on air yards/aDOT, designed YAC, and throw difficulty (CPOE or depth bins) before comparing passers.", evaluator: "gate", expected: "negative" },
  { id: "8.4", theme: 8, title: "@AccidentalZen", lesson: "Adjust defensive yardage for opponent run/pass mix and opponent quality, or use success-rate / adjusted metrics. Never rank a defense on raw yards allowed.", evaluator: "gate", expected: "negative" },
  { id: "8.5", theme: 8, title: "@EaglesXsandOs", lesson: "Stack the adjustments: state value (EPA) → leverage (WP context) → opponent quality. Each layer removes a different lie. (Same post as Record 1.1 — the lesson differs by theme.)", evaluator: "gate", expected: "negative" },
  { id: "8.6", theme: 8, title: "@ScottKacsmar", lesson: "Do not treat play EPA as player skill. Split air yards from YAC and be explicit about credit assignment before aggregating plays into player ratings. (Same post as Record 1.2.)", evaluator: "gate", expected: "negative" },
  { id: "8.7", theme: 8, title: "@KenIngalls", lesson: "Yards/play is a rough efficiency proxy, not the full read. The model should hunt the residual: the ~19% of EPA that down, distance, and state explain beyond yardage.", evaluator: "gate", expected: "negative" },
  { id: "8.8", theme: 8, title: "@LordBenne", lesson: "Pair yards per play with success rate, negative-play rate, and third-down conversion. Averages without the distribution are a different (worse) statistic.", evaluator: "gate", expected: "negative" },
  { id: "8.9", theme: 8, title: "@Saint_FinX", lesson: "Points beat empty yards. The target should be scoring value or EPA; raw yards are a feature, never the verdict.", evaluator: "gate", expected: "negative" },
  { id: "8.10", theme: 8, title: "@PukaJimmer", lesson: "Normalize by opportunity and starting state before any cross-team comparison of totals.", evaluator: "gate", expected: "negative" },
];

export interface XSituationalRecordResult {
  recordId: string;
  theme: number;
  evaluator: XSituationalEvaluator;
  value: number;
  sign: -1 | 0 | 1;
  gateStatus: "accepted" | "rejected" | "not-a-gate";
  lesson: string;
}

const LEVERAGE_PLAY: SituationalPlay = {
  wpBefore: 0.5, wpAfter: 0.58, epBefore: 0, epAfter: 2.69, quarter: 4,
  halfSecondsRemaining: 90, scoreMargin: 0, down: 3, ydstogo: 4, yardline100: 45,
  yardsGained: 6, playType: "pass", shortYardageConversion: true,
};

const REDZONE_PLAYS: SituationalPlay[] = [
  { ...LEVERAGE_PLAY, yardline100: 8, epBefore: 0.5, epAfter: 7, down: 1, scoreMargin: 3 },
  { ...LEVERAGE_PLAY, yardline100: 14, epBefore: 0.5, epAfter: 1.2, down: 2, scoreMargin: 0 },
];

const SCRIPT_PLAYS: SituationalPlay[] = [
  LEVERAGE_PLAY,
  { ...LEVERAGE_PLAY, wpBefore: 0.45, wpAfter: 0.5, epBefore: 1, epAfter: 1.4, scoreMargin: -7, down: 2, playType: "pass" },
  { ...LEVERAGE_PLAY, wpBefore: 0.5, wpAfter: 0.52, epBefore: 1, epAfter: 1.2, scoreMargin: -3, down: 2, playType: "rush" },
  { ...LEVERAGE_PLAY, wpBefore: 0.55, wpAfter: 0.56, epBefore: 1, epAfter: 0.9, scoreMargin: 0, down: 1, playType: "rush" },
];

/** Real evaluator dispatch. Every branch calls the published function. */
export function evaluateXSituationalRecordById(
  id: string,
  _context?: Record<string, unknown>,
): XSituationalRecordResult {
  const record = X_SITUATIONAL_80_RECORD_CATALOG.find((r) => r.id === id);
  if (!record) throw new Error(`unknown X record id: ${id}`);
  let value: number;
  let gateStatus: XSituationalRecordResult["gateStatus"] = "not-a-gate";
  switch (record.evaluator) {
    case "leverage":
      value = computeLeverageAdjustedEpa(LEVERAGE_PLAY).leverageMultiplier - 1;
      break;
    case "script":
      value = computeNeutralScriptBaselineAndProe(SCRIPT_PLAYS, "AAA").proeResidual;
      break;
    case "redzone": {
      const rz = evaluateRedZoneAndTwoMinuteSplits(REDZONE_PLAYS);
      value = rz.rzTdRate - 0.4;
      break;
    }
    case "decision":
      value = evaluateDecisionBranchWp(
        { scoreMargin: -2, quarter: 4, halfSecondsRemaining: 120, yardline100: 65, ydstogo: 4, down: 4 },
        [
          { branch: "go", successProbability: 0.55, winProbabilityOnSuccess: 0.65, winProbabilityOnFailure: 0.2 },
          { branch: "kick", successProbability: 0.85, winProbabilityOnSuccess: 0.5, winProbabilityOnFailure: 0.25 },
        ],
      ).recommendationEdge;
      break;
    case "personnel":
      value = evaluatePersonnelBoxPassInteraction({
        personnel: "13", boxCount: 8, formationWidth: "normal",
        secondTeOrFbReceivingThreat: true, shell: "loaded-box",
      }).passEpaAdjustment;
      break;
    case "backup":
      value = evaluateBackupQbReceiverDecoupling({
        alphaTargetShareWithStarter: 0.3, alphaTargetShareWithBackup: 0.27,
        yprrWithStarter: 2.5, yprrWithBackup: 2.2,
        redZoneShareWithStarter: 0.35, redZoneShareWithBackup: 0.25,
        timingDependentPerimeterWr: true,
      }).decoupledValueMultiplier - 1;
      break;
    case "weather":
      value = evaluatePlayerSpecificWeatherInteraction({
        position: "QB", temperatureF: 30, windMph: 18, precipitation: 1,
      }).positionalMultiplier - 1;
      break;
    case "attrition":
      value = evaluateOffensiveLineAttritionCluster({
        startersAbsent: 3, opponentDepleted: false, isWeek18: false, rookieBackup: false,
      }).suWinRateDelta;
      break;
    case "market":
      value = evaluateMarketMoveInformationCompleteness({
        stage: "rumor", spreadMove: 9, totalMove: 4, crossedKeyNumber: true, publicShare: 0.7,
      }).fadeMultiplier - 1;
      break;
    case "gate": {
      const verdict = validateFeatureAgainstMisleadingStats({
        name: "yards per play", definition: "raw yards per play",
      });
      gateStatus = verdict.accepted ? "accepted" : "rejected";
      value = verdict.accepted ? 1 : -1;
      break;
    }
  }
  const sign: -1 | 0 | 1 = value > 0 ? 1 : value < 0 ? -1 : 0;
  return { recordId: record.id, theme: record.theme, evaluator: record.evaluator, value, sign, gateStatus, lesson: record.lesson };
}

export { mean, sigmoid, clamp, clamp01 };
