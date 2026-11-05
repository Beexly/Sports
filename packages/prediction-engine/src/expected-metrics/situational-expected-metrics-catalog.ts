/**
 * situational-expected-metrics-catalog.ts — Consolidated catalogue and pure calculators
 * for the Q1–Q51 Expected-Metrics signals mapped to the 288-bit context mask (bits 220..278).
 */

export interface ExpectedMetricDescriptor {
  readonly code: string;
  readonly name: string;
  readonly bitIndex: number;
  readonly description: string;
  readonly targetType: "RATE" | "COUNT" | "EPA" | "PROBABILITY";
  readonly sampleHurdle: number;
}

export const SITUATIONAL_EXPECTED_METRICS_CATALOG: readonly ExpectedMetricDescriptor[] = [
  { code: "Q10", name: "Down-of-Conversion Distribution", bitIndex: 224, description: "Calculates conversion distribution across downs 1..4", targetType: "PROBABILITY", sampleHurdle: 20 },
  { code: "Q11", name: "Drive-Outcome Distribution", bitIndex: 225, description: "Categorical probability of TD / FG / Punt / Turnover per drive", targetType: "PROBABILITY", sampleHurdle: 15 },
  { code: "Q12", name: "Play-Caller Script Fingerprint", bitIndex: 226, description: "Pass/run ratio divergence under early-game script stress", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q14", name: "QB Pressure-Behavior Divergence", bitIndex: 227, description: "Time-to-throw change and bail rate when pressured", targetType: "RATE", sampleHurdle: 15 },
  { code: "Q15R", name: "Defensive Regressed FPTS Allowed", bitIndex: 228, description: "Opponent-adjusted fantasy points allowed by position", targetType: "RATE", sampleHurdle: 30 },
  { code: "Q17", name: "QB-Conditioned Receiver Efficiency", bitIndex: 229, description: "Receiver YPRR conditioned on specific QB dropback profile", targetType: "RATE", sampleHurdle: 20 },
  { code: "Q19", name: "Shotgun vs Under-Center EPA Split", bitIndex: 230, description: "Efficiency differential between shotgun and under-center snaps", targetType: "EPA", sampleHurdle: 30 },
  { code: "Q20", name: "Drive Sequencing Volatility", bitIndex: 231, description: "Markovian stall probability following explosive plays", targetType: "PROBABILITY", sampleHurdle: 20 },
  { code: "Q38", name: "Target Success Rate & EPA per Target", bitIndex: 232, description: "Positive EPA play rate on targets to specific receiver", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q41", name: "Scripted vs Non-Scripted EPA", bitIndex: 233, description: "First 15 plays EPA versus remaining regulation dropbacks", targetType: "EPA", sampleHurdle: 30 },
  { code: "Q42", name: "Play-Action vs Straight Dropback Split", bitIndex: 234, description: "Play-action EPA boost over standard pocket dropbacks", targetType: "EPA", sampleHurdle: 25 },
  { code: "Q43", name: "QB EPA on Defensive Penalties", bitIndex: 235, description: "EPA generated through drawn defensive pass interference / holding", targetType: "EPA", sampleHurdle: 20 },
  { code: "Q44", name: "Neutral-Script Game State EPA", bitIndex: 236, description: "EPA per dropback when score margin is within 7 points", targetType: "EPA", sampleHurdle: 35 },
  { code: "Q45", name: "Manageable 3rd Down Creation Rate", bitIndex: 237, description: "Rate of creating 3rd down with 4 or fewer yards to go", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q46", name: "Adjusted Scramble EPA", bitIndex: 238, description: "Scramble yards EPA over expected throwaway baseline", targetType: "EPA", sampleHurdle: 15 },
  { code: "Q47", name: "Pass-Rush Strength of Schedule Faced", bitIndex: 239, description: "Opponent PRWR weighted schedule adjustment", targetType: "RATE", sampleHurdle: 30 },
  { code: "Q48", name: "QB Multi-Dimensional Z-Score", bitIndex: 240, description: "Composite standard score across CPOE, EPA, PBWR-delta, and blitz answer", targetType: "RATE", sampleHurdle: 30 },
  { code: "Q49", name: "Toxic Differential", bitIndex: 241, description: "+20-yard explosive play margin minus turnover margin", targetType: "COUNT", sampleHurdle: 20 },
  { code: "Q50", name: "WR Target Depth After Leader (Gini)", bitIndex: 242, description: "Target share inequality across WR2 through WR4", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q51", name: "Red-Zone Target Success Rate", bitIndex: 243, description: "Inside-the-20 target completion and TD rate by alignment", targetType: "RATE", sampleHurdle: 15 },
  // Wednesday Evening Dossiers (W1-W14, F1-F6)
  { code: "W1", name: "Clean vs Pressured Bad Throw Split", bitIndex: 244, description: "PFR Bad Throw % clean-pocket sticky truth vs pressured noise", targetType: "RATE", sampleHurdle: 20 },
  { code: "W2", name: "WR Target Success Alpha Interaction", bitIndex: 245, description: "Super-additive WR1 alpha score conditioned on target volume threshold", targetType: "RATE", sampleHurdle: 25 },
  { code: "W3", name: "RYOE Independent vs Line Split", bitIndex: 246, description: "RB independent yards creation share vs offensive line blocking share", targetType: "RATE", sampleHurdle: 20 },
  { code: "W4", name: "Read-Out Blitzer & 2-Man Robber Fit", bitIndex: 247, description: "Defender adaptation to protection slide and red-zone robber bracket", targetType: "RATE", sampleHurdle: 15 },
  { code: "W5", name: "Dropback Outcome Composition", bitIndex: 248, description: "Decomposition into completion, incompletion, scramble, sack, and interception shares", targetType: "PROBABILITY", sampleHurdle: 25 },
  { code: "W6", name: "Blitz Behind Coverage Counter Fit", bitIndex: 249, description: "Flores zone-behind-blitz counter fit score against protection adjustments", targetType: "RATE", sampleHurdle: 20 },
  { code: "W7", name: "Catchable Deep vs Contested Catch", bitIndex: 250, description: "Separation of QB deep placement from receiver contested-catch efficiency", targetType: "RATE", sampleHurdle: 15 },
  { code: "W8", name: "QB-WR MOF Zone Overlap", bitIndex: 251, description: "Middle-of-field zone synergy delta between QB targeting and WR route profile", targetType: "RATE", sampleHurdle: 20 },
  { code: "W9", name: "Safety B-Gap Pressure Index", bitIndex: 252, description: "Steelers Sand Deuce safety B-gap rush creating edge one-on-ones", targetType: "RATE", sampleHurdle: 15 },
  { code: "W10", name: "ILB Dog Pressure Index", bitIndex: 253, description: "Dennard Wilson interior linebacker dog pressure occupying pass protection", targetType: "RATE", sampleHurdle: 15 },
  { code: "W11", name: "Power Kickout Spill Defense Fit", bitIndex: 254, description: "Defensive end wrong-arm spill fit against offensive Power kick-out blocks", targetType: "RATE", sampleHurdle: 15 },
  { code: "W12", name: "Neutral Early Down Under-Center EPA", bitIndex: 255, description: "Neutral-script early-down under-center EPA advantage over shotgun", targetType: "EPA", sampleHurdle: 25 },
  { code: "W13", name: "Playoff Leverage Motivation Delta", bitIndex: 256, description: "Week 9+ playoff leverage swing differential between competing teams", targetType: "PROBABILITY", sampleHurdle: 10 },
  { code: "W14", name: "WR Alignment Side aDOT Tilt", bitIndex: 257, description: "Target depth aDOT tilt into vulnerable cornerback alignment boundary", targetType: "RATE", sampleHurdle: 20 },
  { code: "W15", name: "Explosive vs Stuffed Run Creation", bitIndex: 258, description: "Differential between 12+ yard breakaway runs and zero-or-loss stuffed runs", targetType: "RATE", sampleHurdle: 20 },
  { code: "W16", name: "DPI Drawn Field Position Equity", bitIndex: 259, description: "DPI flags drawn per target converted into hidden field-position value", targetType: "COUNT", sampleHurdle: 15 },
  { code: "F1", name: "Neutral Pace Tempo Mismatch", bitIndex: 260, description: "Offensive seconds-per-play differential against defensive pace allowed", targetType: "RATE", sampleHurdle: 20 },
  { code: "F2", name: "Defensive Personnel Matching Pass Exploit", bitIndex: 261, description: "Opponent pass EPA exploit against base personnel in obvious pass downs", targetType: "EPA", sampleHurdle: 20 },
  { code: "F3", name: "Clean Pocket Passing Success Split", bitIndex: 262, description: "Clean-pocket passing success weighted projection conditioned on pressure rate", targetType: "RATE", sampleHurdle: 25 },
  { code: "F4", name: "Double-Mug A-Gap Slide Exploit", bitIndex: 263, description: "Protection slide exploit against double-mug pressure looks", targetType: "RATE", sampleHurdle: 15 },
];

/**
 * Compute manageable 3rd down creation rate: (3rd & <= 4) / total 3rd down plays.
 */
export function computeManageableThirdDownRate(thirdDownDistances: readonly number[]): number {
  if (thirdDownDistances.length === 0) return 0;
  const manageable = thirdDownDistances.filter((d) => d <= 4).length;
  return Number((manageable / thirdDownDistances.length).toFixed(4));
}

/**
 * Compute toxic differential: Explosive plays (passes >= 20 yds + rushes >= 10 yds) minus turnovers.
 */
export function computeToxicDifferential(explosives: number, turnovers: number): number {
  return explosives - turnovers;
}

/**
 * Compute Gini coefficient of target distribution across receiving corps.
 */
export function computeTargetShareGini(shares: readonly number[]): number {
  if (shares.length === 0) return 0;
  const sorted = [...shares].sort((a, b) => a - b);
  const n = sorted.length;
  let num = 0;
  for (let i = 0; i < n; i++) {
    num += (2 * (i + 1) - n - 1) * sorted[i]!;
  }
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) return 0;
  return Number((num / (n * n * mean)).toFixed(4));
}

export interface CleanVsPressuredBadThrowResult {
  readonly cleanBadThrowRate: number;
  readonly pressuredBadThrowRate: number;
  readonly stickyAccuracyDelta: number;
}

/**
 * W1: PFR Bad Throw % clean-pocket sticky truth vs pressured noise.
 */
export function computeCleanVsPressuredBadThrowSplit(
  cleanBadThrows: number,
  cleanAttempts: number,
  pressuredBadThrows: number,
  pressuredAttempts: number,
): CleanVsPressuredBadThrowResult {
  const cleanBadThrowRate = cleanAttempts > 0 ? cleanBadThrows / cleanAttempts : 0;
  const pressuredBadThrowRate = pressuredAttempts > 0 ? pressuredBadThrows / pressuredAttempts : 0;
  const stickyAccuracyDelta = pressuredBadThrowRate - cleanBadThrowRate;
  return {
    cleanBadThrowRate: Number(cleanBadThrowRate.toFixed(4)),
    pressuredBadThrowRate: Number(pressuredBadThrowRate.toFixed(4)),
    stickyAccuracyDelta: Number(stickyAccuracyDelta.toFixed(4)),
  };
}

/**
 * W2: Super-additive WR1 alpha interaction score:
 * targetSuccessRate * targetShare * (1 + max(0, targetShare - 0.22) * 2.5)
 */
export function computeWrTargetSuccessAlphaInteraction(
  targetSuccessRate: number,
  targetShare: number,
): number {
  const alphaMultiplier = 1 + Math.max(0, targetShare - 0.22) * 2.5;
  const alpha = targetSuccessRate * targetShare * alphaMultiplier;
  return Number(alpha.toFixed(4));
}

export interface RyoeIndependentVsLineSplitResult {
  readonly independentCreationShare: number;
  readonly lineDrivenShare: number;
  readonly netRyoeRatio: number;
}

/**
 * W3: RB independent creation share vs offensive line-driven share.
 */
export function computeRyoeIndependentVsLineSplit(
  ryoePerCarry: number,
  yardsBeforeContactPerCarry: number,
): RyoeIndependentVsLineSplitResult {
  const safeYbc = Math.max(0.1, yardsBeforeContactPerCarry);
  const totalYpcProxy = Math.max(0.1, safeYbc + ryoePerCarry);
  const independentCreationShare = Math.max(0, Math.min(1, Math.max(0, ryoePerCarry) / totalYpcProxy));
  const lineDrivenShare = Math.max(0, Math.min(1, 1 - independentCreationShare));
  const netRyoeRatio = ryoePerCarry / safeYbc;
  return {
    independentCreationShare: Number(independentCreationShare.toFixed(4)),
    lineDrivenShare: Number(lineDrivenShare.toFixed(4)),
    netRyoeRatio: Number(netRyoeRatio.toFixed(4)),
  };
}

/**
 * W4: Read-out blitzer & 2-man robber bracket conversion fit.
 */
export function computeReadOutBlitzerAdaptation(
  blitzerReadRate: number,
  protectionSlideRate: number,
  interiorPickEffectiveness: number,
): number {
  return Number((blitzerReadRate * protectionSlideRate * interiorPickEffectiveness).toFixed(4));
}

export interface DropbackOutcomeCompositionResult {
  readonly completionShare: number;
  readonly incompletionShare: number;
  readonly scrambleShare: number;
  readonly sackShare: number;
  readonly interceptionShare: number;
}

/**
 * W5: Dropback outcome composition across 5 terminal states.
 */
export function computeDropbackOutcomeComposition(
  completions: number,
  incompletions: number,
  scrambles: number,
  sacks: number,
  interceptions: number,
): DropbackOutcomeCompositionResult {
  const total = completions + incompletions + scrambles + sacks + interceptions;
  if (total <= 0) {
    return {
      completionShare: 0,
      incompletionShare: 0,
      scrambleShare: 0,
      sackShare: 0,
      interceptionShare: 0,
    };
  }
  return {
    completionShare: Number((completions / total).toFixed(4)),
    incompletionShare: Number((incompletions / total).toFixed(4)),
    scrambleShare: Number((scrambles / total).toFixed(4)),
    sackShare: Number((sacks / total).toFixed(4)),
    interceptionShare: Number((interceptions / total).toFixed(4)),
  };
}

/**
 * W6: Flores 87% zone-behind-blitz counter fit score.
 */
export function evaluateBlitzBehindCoverageCounterFit(
  defBlitzRate: number,
  defZoneBehindBlitzRate: number,
  offCondensedRate: number,
  offTempoRate: number,
  offMaxProtectRate: number,
  offEmptyQuickRate: number,
): number {
  const zoneBlitzIntensity = defBlitzRate * defZoneBehindBlitzRate;
  const offensiveCounterWeight =
    offMaxProtectRate * 0.4 + offTempoRate * 0.3 + offCondensedRate * 0.3 - offEmptyQuickRate * 0.5;
  const fitScore = zoneBlitzIntensity * offensiveCounterWeight;
  return Number(fitScore.toFixed(4));
}

/**
 * W7: Catchable deep pass vs contested catch efficiency differential.
 */
export function computeCatchableDeepVsContestedEfficiency(
  catchableDeepRate: number,
  contestedCatchRate: number,
): number {
  return Number((catchableDeepRate * 0.6 + contestedCatchRate * 0.4).toFixed(4));
}

/**
 * W8: Brissett/Flowers-style middle-of-field zone synergy delta.
 */
export function computeQbWrMofZoneOverlap(
  qbMofCompletionRate: number,
  wrMofTargetShare: number,
  defZoneRate: number,
): number {
  const synergy = qbMofCompletionRate * wrMofTargetShare * defZoneRate * 1.5;
  return Number(synergy.toFixed(4));
}

/**
 * W9 & W10: Interior linebacker dog and safety B-gap pressure freeing edge rushers.
 */
export function computeInteriorLinebackerDogAndSafetyBgapPressure(
  safetyBgapBlitzRate: number,
  ilbDogPressureRate: number,
  edgeOneOnOneWinRate: number,
): number {
  const interiorThreat = safetyBgapBlitzRate * 0.5 + ilbDogPressureRate * 0.5;
  const edgeMultiplier = 1.0 + Math.max(0, edgeOneOnOneWinRate);
  const totalPressureIndex = interiorThreat * edgeMultiplier;
  return Number(totalPressureIndex.toFixed(4));
}

/**
 * W11: Spilling Power kick-out block: DE wrong-arm forcing RB to bounce to scraping LB.
 */
export function computePowerKickoutSpillDefenseFit(
  offGapPowerRate: number,
  defEdgeSpillRate: number,
  lbOverlapTacklingEfficiency: number,
): number {
  const fit = offGapPowerRate * defEdgeSpillRate * lbOverlapTacklingEfficiency;
  return Number(fit.toFixed(4));
}

/**
 * W12: Neutral-script early-down under-center EPA advantage over shotgun.
 */
export function computeNeutralScriptEarlyDownUnderCenterEpa(
  underCenterEpa: number,
  shotgunEpa: number,
  neutralSnapShare: number,
): number {
  const advantage = (underCenterEpa - shotgunEpa) * neutralSnapShare;
  return Number(advantage.toFixed(4));
}

/**
 * W13: Week 9+ playoff-leverage swing differential between competing teams.
 */
export function computePlayoffLeverageMotivationDelta(
  winPlayoffProb: number,
  lossPlayoffProb: number,
  opponentWinPlayoffSwing: number,
): number {
  const teamSwing = Math.abs(winPlayoffProb - lossPlayoffProb);
  const delta = teamSwing - opponentWinPlayoffSwing;
  return Number(delta.toFixed(4));
}

/**
 * W14: Route-depth aDOT tilt into vulnerable corner alignment.
 */
export function computeWrAlignmentSideAdotTilt(
  leftAdot: number,
  slotAdot: number,
  rightAdot: number,
  weakCornerSide: "LEFT" | "SLOT" | "RIGHT",
): number {
  let targetAdot = slotAdot;
  let otherMeanAdot = (leftAdot + rightAdot) / 2;
  if (weakCornerSide === "LEFT") {
    targetAdot = leftAdot;
    otherMeanAdot = (slotAdot + rightAdot) / 2;
  } else if (weakCornerSide === "RIGHT") {
    targetAdot = rightAdot;
    otherMeanAdot = (leftAdot + slotAdot) / 2;
  }
  const tilt = targetAdot - otherMeanAdot;
  return Number(tilt.toFixed(4));
}

/**
 * W15: Explosive vs stuffed run creation differential.
 */
export function computeExplosiveVsStuffedRunDifferential(
  explosiveRunRate: number,
  stuffedRunRate: number,
): number {
  return Number((explosiveRunRate - stuffedRunRate).toFixed(4));
}

/**
 * W16: DPI drawn field-position equity per target.
 */
export function computeDpiDrawnFieldPositionEquity(
  dpiPenaltiesDrawn: number,
  dpiYardsDrawn: number,
  totalTargets: number,
): number {
  if (totalTargets <= 0) return 0;
  const penaltyRate = dpiPenaltiesDrawn / totalTargets;
  const yardPerTarget = dpiYardsDrawn / totalTargets;
  return Number((penaltyRate * 10 + yardPerTarget).toFixed(4));
}

/**
 * F1: Neutral pace tempo differential (sec/play delta).
 */
export function computeNeutralPaceTempoDifferential(
  offSecondsPerPlay: number,
  defSecondsPerPlayAllowed: number,
): number {
  return Number((defSecondsPerPlayAllowed - offSecondsPerPlay).toFixed(4));
}

/**
 * F2: @SamHoppen defensive personnel-matching exploit score.
 */
export function computeDefensivePersonnelMatchingInExpectedPass(
  baseInExpectedPassRate: number,
  opponentPassEpaVsBase: number,
): number {
  const exploit = baseInExpectedPassRate * opponentPassEpaVsBase;
  return Number(exploit.toFixed(4));
}

/**
 * F3: @HoodieRamey clean-pocket passing success weighted projection.
 */
export function computeCleanPocketPassingSuccessSplit(
  cleanSuccessRate: number,
  pressuredSuccessRate: number,
  projectedPressureRate: number,
): number {
  const safePressureRate = Math.max(0, Math.min(1, projectedPressureRate));
  const weighted = cleanSuccessRate * (1 - safePressureRate) + pressuredSuccessRate * safePressureRate;
  return Number(weighted.toFixed(4));
}

/**
 * F4: Double-mug A-gap protection slide exploit.
 */
export function computeDoubleMugSlideExploitScore(
  doubleMugLookRate: number,
  slideProtectionRate: number,
  hotRouteReadiness: number,
): number {
  return Number((doubleMugLookRate * slideProtectionRate * hotRouteReadiness).toFixed(4));
}
