/**
 * lopez-second-and-ten-tendency.ts — In-play play-calling tendency on 2nd-and-10.
 *
 * Grounded in empirical nflverse research (GROK-1 verified on 27,032 plays 2019-2025):
 *  - Immediate next snap on 2nd-and-10:
 *      * After 1st-down pass: 8,210 / 21,760 = 37.73% [37.09, 38.38] pass probability.
 *      * After 1st-down run:  1,443 /  5,272 = 27.37% [26.18, 28.59] pass probability.
 *      * Disjoint Wilson 95% CIs, gap = +10.36 percentage points.
 *  - Critical condition: Immediate next snap only (REG season, no penalty / kneel / spike / PAT).
 *  - Elasticity applies to in-play drive success, live spread/total updates, and in-game prop distributions.
 */

export interface LopezSecondAndTenContext {
  readonly priorFirstDownPlayType: "PASS" | "RUSH";
  readonly offensivePlayCallerTendencyBias?: number; // coordinator pass-rate over expected on 2nd-and-long
  readonly scoreDifferential: number; // offense lead (+) or deficit (-)
  readonly quarter: 1 | 2 | 3 | 4 | 5;
  readonly timeRemainingSeconds: number;
}

export interface LopezSecondAndTenResult {
  readonly expectedPassProbability: number;
  readonly expectedRunProbability: number;
  readonly tendencyShiftOverBaselinePercentagePoints: number;
  readonly playCallingRegime: "PASS_HEAVY_SEQUENTIAL" | "BALANCED" | "RUN_ESTABLISHMENT";
  readonly passOverExpectedModifier: number;
}

/**
 * Evaluates the immediate 2nd-and-10 pass/run play-calling distribution.
 */
export function evaluateLopezSecondAndTenTendency(
  context: LopezSecondAndTenContext
): LopezSecondAndTenResult {
  // Baseline empirical pass rates from GROK-1 on immediate 2nd-and-10
  const BASE_AFTER_PASS = 0.3773; // 37.73%
  const BASE_AFTER_RUN = 0.2737;  // 27.37%
  const LEAGUE_MEDIAN_2ND_10 = 0.352;

  let baseRate = context.priorFirstDownPlayType === "PASS" ? BASE_AFTER_PASS : BASE_AFTER_RUN;

  // Game script adjustments: trailing teams in 4th quarter have urgency to pass
  let gameScriptAdjustment = 0;
  if (context.scoreDifferential <= -9 && context.quarter >= 3) {
    // 2-score deficit late forces pass rate up
    gameScriptAdjustment += 0.12;
  } else if (context.scoreDifferential >= 10 && context.quarter === 4) {
    // Large 4th quarter lead forces clock bleed
    gameScriptAdjustment -= 0.14;
  }

  // Play caller tendency adjustment (optional coordinator PROE)
  const coordinatorBias = context.offensivePlayCallerTendencyBias || 0;

  const adjustedPassProb = Math.max(
    0.10,
    Math.min(0.85, baseRate + gameScriptAdjustment + coordinatorBias)
  );

  const expectedPassProbability = Number(adjustedPassProb.toFixed(4));
  const expectedRunProbability = Number((1.0 - expectedPassProbability).toFixed(4));

  const tendencyShift = Number(
    ((expectedPassProbability - LEAGUE_MEDIAN_2ND_10) * 100).toFixed(2)
  );

  let playCallingRegime: "PASS_HEAVY_SEQUENTIAL" | "BALANCED" | "RUN_ESTABLISHMENT" = "BALANCED";
  if (expectedPassProbability >= 0.40) {
    playCallingRegime = "PASS_HEAVY_SEQUENTIAL";
  } else if (expectedPassProbability <= 0.30) {
    playCallingRegime = "RUN_ESTABLISHMENT";
  }

  return {
    expectedPassProbability,
    expectedRunProbability,
    tendencyShiftOverBaselinePercentagePoints: tendencyShift,
    playCallingRegime,
    passOverExpectedModifier: Number((expectedPassProbability - baseRate).toFixed(4)),
  };
}
