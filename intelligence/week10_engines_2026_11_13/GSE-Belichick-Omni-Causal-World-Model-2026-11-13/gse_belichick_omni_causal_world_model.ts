/**
 * GSE Omni-Cognitive World Model — Strict TypeScript Reference Implementation
 * (`strictNullChecks: true`, `noUncheckedIndexedAccess: true`, TS2532-safe).
 *
 * Drop-in targets in `Beexly/Sports`:
 * 1. `packages/prediction-engine/src/nfl/coordinator-psychology-tensor.ts`
 * 2. `packages/mcp-equations-server/src/mcp-cognitive-router.ts`
 * 3. `packages/prediction-engine/src/causal/do-calculus-id.ts`
 * 4. `workers/airwave-listener/src/siriusxm-veracity-updater.ts`
 */

import { createHash } from "node:crypto";

export const MAX_LOG_ODDS_DELTA = 0.35;
export const MIN_E_VALUE_POINT = 1.35;
export const MIN_E_VALUE_CI_LOW = 1.10;
export const MIN_SAMPLE_PER_ARM = 30;
export const BITMASK_TOTAL_BITS = 288;
export const BITMASK_WORD_COUNT = 9;

export const FORBIDDEN_CLASS_A_BOOK_TOKENS: readonly string[] = [
  "OddsInput",
  "spread_line",
  "total_line",
  "marketFairProb",
  "bookmaker",
  "americanOdds",
  "deVig",
];

export class DataGapError extends Error {
  public readonly fieldName: string;
  public readonly reason: string;

  constructor(fieldName: string, reason: string) {
    super(`[DATA_GAP_REFUSAL:${fieldName}] ${reason}`);
    this.name = "DataGapError";
    this.fieldName = fieldName;
    this.reason = reason;
  }
}

export class ClassAFirewallViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassAFirewallViolationError";
  }
}

/** `noUncheckedIndexedAccess`-safe indexed accessor (TS2532-impossible). */
export function atOrThrow<T>(arr: ArrayLike<T>, idx: number, label = "array"): T {
  if (idx < 0 || idx >= arr.length) {
    throw new DataGapError(label, `Index ${idx} out of bounds [0, ${arr.length - 1}].`);
  }
  const val = arr[idx];
  if (val === undefined) {
    throw new DataGapError(label, `Undefined element at index ${idx}.`);
  }
  return val;
}

export function at2DOrThrow<T>(mat: readonly (readonly T[])[], r: number, c: number, label = "matrix"): T {
  const row = atOrThrow(mat, r, `${label}.row`);
  return atOrThrow(row, c, `${label}.col`);
}

export function recordGetOrThrow<V>(rec: Readonly<Record<string, V>>, key: string, label = "record"): V {
  if (!Object.prototype.hasOwnProperty.call(rec, key)) {
    throw new DataGapError(label, `Missing required key '${key}'.`);
  }
  const val = rec[key];
  if (val === undefined) {
    throw new DataGapError(label, `Key '${key}' mapped to undefined.`);
  }
  return val;
}

export function requireFiniteNumber(
  value: unknown,
  fieldName: string,
  bounds?: { readonly lo?: number; readonly hi?: number }
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DataGapError(fieldName, `Expected finite number, got ${String(value)}; zero fallbacks permitted.`);
  }
  if (bounds?.lo !== undefined && value < bounds.lo) {
    throw new DataGapError(fieldName, `Value ${value} violates lower bound ${bounds.lo}.`);
  }
  if (bounds?.hi !== undefined && value > bounds.hi) {
    throw new DataGapError(fieldName, `Value ${value} violates upper bound ${bounds.hi}.`);
  }
  return value;
}

export function requireOpenProb(value: unknown, fieldName: string): number {
  const p = requireFiniteNumber(value, fieldName);
  if (!(p > 0.0 && p < 1.0)) {
    throw new DataGapError(fieldName, `Probability ${p} must lie strictly in (0, 1).`);
  }
  return p;
}

export function logit(p: number): number {
  const pv = requireOpenProb(p, "logit_p");
  return Math.log(pv / (1.0 - pv));
}

export function expit(eta: number): number {
  const x = requireFiniteNumber(eta, "expit_eta");
  if (x >= 0.0) {
    const z = Math.exp(-x);
    return 1.0 / (1.0 + z);
  }
  const z = Math.exp(x);
  return z / (1.0 + z);
}

export function clampLogOddsDelta(delta: number, cap = MAX_LOG_ODDS_DELTA): number {
  const d = requireFiniteNumber(delta, "delta_log_odds");
  return Math.max(-cap, Math.min(cap, d));
}

export function assertNoBookInCoachEngine(payloadOrSource: Readonly<Record<string, unknown>> | string): void {
  if (typeof payloadOrSource === "string") {
    for (const tok of FORBIDDEN_CLASS_A_BOOK_TOKENS) {
      const re = new RegExp(`\\b${tok}\\b`);
      if (re.test(payloadOrSource)) {
        throw new ClassAFirewallViolationError(
          `Zone 1 Class-A Coach Engine contaminated by forbidden bookmaker token: ${tok}`
        );
      }
    }
    return;
  }
  for (const key of Object.keys(payloadOrSource)) {
    for (const tok of FORBIDDEN_CLASS_A_BOOK_TOKENS) {
      if (key.toLowerCase().includes(tok.toLowerCase())) {
        throw new ClassAFirewallViolationError(
          `Zone 1 Class-A Coach Engine input contains forbidden market key: ${key}`
        );
      }
    }
  }
}

// ============================================================================
// SUBSYSTEM 1: THE "BELICHICK" RECURSIVE LEVEL-K COORDINATOR MIND
// ============================================================================

export const OFFENSIVE_ACTIONS = [
  "UNDER_CENTER_PA_SHOT",
  "QUICK_GAME_SIGHT_ADJUST",
  "SPREAD_INTERMEDIATE_DAGGER",
  "CONDENSED_OUTSIDE_ZONE_RUN",
  "SCREEN_DELAY_DRAW",
] as const;

export type OffensiveConcept = (typeof OFFENSIVE_ACTIONS)[number];

export const DEFENSIVE_ACTIONS = [
  "BASE_SINGLE_HIGH_COVER_1_3",
  "NICKEL_SPLIT_SAFETY_QUARTERS",
  "SIMULATED_PRESSURE_CREEPER",
  "ZERO_ALL_OUT_BLITZ",
  "BELICHICK_OPTION1_BRACKET",
] as const;

export type DefensiveCall = (typeof DEFENSIVE_ACTIONS)[number];

export interface CoordinatorScriptProfile {
  readonly coordinatorId: string;
  readonly scriptedEpaPerPlay: number;
  readonly unscriptedEpaPerPlay: number;
  readonly scriptedPlaysSample: number;
  readonly unscriptedPlaysSample: number;
  readonly halftimeRescriptEpaBoost: number;
  readonly treePriorCliffDelta: number;
  readonly rolling3WkTopTendencyRate: number;
  readonly isPostByeOrDivisional: boolean;
}

export interface CoordinatorGameState {
  readonly playNumberInGame: number;
  readonly quarter: number;
  readonly quarterPlayIndex: number;
  readonly secondsRemainingHalf: number;
  readonly secondsRemainingGame: number;
  readonly scoreDiffOffense: number;
  readonly down: number;
  readonly yardsToGo: number;
  readonly yardline100: number;
  readonly offenseTimeouts: number;
  readonly defenseTimeouts: number;
  readonly offenseReceivesQ3Kickoff: boolean;
  readonly probQuickPressureSub2s: number;
  readonly acousticCrowdSplDb: number;
  readonly playClockRemainingSec: number;
  readonly motionRate: number;
  readonly tightSplitRate: number;
  readonly coachAggressionIndex: number;
  readonly coachAnimusScore: number;
}

export interface FourthDownContext {
  readonly conversionProb: number;
  readonly wpIfConvert: number;
  readonly wpIfFail: number;
  readonly wpIfPunt: number;
  readonly wpIfFieldGoal: number | null;
  readonly fgMakeProb: number | null;
  readonly coachAggressionIndex: number;
  readonly coachAnimusScore: number;
}

export interface ClockLeverageDecision {
  readonly twoMinuteWarningActive: boolean;
  readonly doubleDipBridgeActive: boolean;
  readonly victoryKneeldownDeterministic: boolean;
  readonly intentionalScrambleBurnRecommended: boolean;
  readonly expectedKneeldownQbRushDeltaYds: number;
  readonly trailingHurryupCheckdownBoost: number;
  readonly timeoutPreservationWpValue: number;
}

export interface FourthDownPolicyResult {
  readonly optimalAction: "GO" | "FIELD_GOAL" | "PUNT";
  readonly deltaWpGoVsAlt: number;
  readonly expectedWpGo: number;
  readonly expectedWpBestAlt: number;
  readonly realizedCoachGoProb: number;
  readonly expectedCoachingWpBleed: number;
}

export interface BelichickCoordinatorEquilibrium {
  readonly ocLevelK: 0 | 1 | 2;
  readonly dcLevelK: 0 | 1 | 2;
  readonly jamesHabitRegressionWeightOc: number;
  readonly jamesHabitRegressionWeightDc: number;
  readonly effectiveOcPrecision: number;
  readonly effectiveDcPrecision: number;
  readonly ocPolicy: Record<OffensiveConcept, number>;
  readonly dcPolicy: Record<DefensiveCall, number>;
  readonly equilibriumExpectedEpa: number;
  readonly coordinatorScriptCliffDelta: number;
  readonly activeScriptAdjustmentEpa: number;
  readonly qptsrSackExpected: number;
  readonly qptsrCheckdownBoost: number;
  readonly tendencyBreakerActive: boolean;
  readonly clockLeverage: ClockLeverageDecision;
  readonly fourthDownEval: FourthDownPolicyResult | null;
}

function round6(x: number): number {
  return Math.round(x * 1_000_000) / 1_000_000;
}

export function computeCoordinatorScriptCliffDelta(
  profile: CoordinatorScriptProfile
): { readonly rawCliffDelta: number; readonly shrunkCliffDelta: number } {
  const sEpa = requireFiniteNumber(profile.scriptedEpaPerPlay, "scriptedEpaPerPlay", { lo: -3.0, hi: 3.0 });
  const uEpa = requireFiniteNumber(profile.unscriptedEpaPerPlay, "unscriptedEpaPerPlay", { lo: -3.0, hi: 3.0 });
  const prior = requireFiniteNumber(profile.treePriorCliffDelta, "treePriorCliffDelta", { lo: -1.5, hi: 1.5 });

  if (profile.scriptedPlaysSample < 30) {
    throw new DataGapError("scriptedPlaysSample", `Scripted sample ${profile.scriptedPlaysSample} < 30 floor.`);
  }
  if (profile.unscriptedPlaysSample < 60) {
    throw new DataGapError("unscriptedPlaysSample", `Unscripted sample ${profile.unscriptedPlaysSample} < 60 floor.`);
  }

  const rawCliffDelta = uEpa - sEpa;
  const obsVar = 1.65 * (1.0 / profile.scriptedPlaysSample + 1.0 / profile.unscriptedPlaysSample);
  const priorVar = 0.025;
  const w = priorVar / (priorVar + obsVar);
  const shrunkCliffDelta = w * rawCliffDelta + (1.0 - w) * prior;
  return { rawCliffDelta, shrunkCliffDelta };
}

export function computeWilliamJamesHabitRegression(
  probQuickPressureSub2s: number,
  playClockRemainingSec: number,
  acousticCrowdSplDb: number,
  timeoutsRemaining: number,
  trailingLatePressure: boolean,
  kappaJames = 1.65
): number {
  const pQuick = requireFiniteNumber(probQuickPressureSub2s, "probQuickPressureSub2s", { lo: 0.0, hi: 1.0 });
  const pClock = requireFiniteNumber(playClockRemainingSec, "playClockRemainingSec", { lo: 0.0, hi: 40.0 });
  const splDb = requireFiniteNumber(acousticCrowdSplDb, "acousticCrowdSplDb", { lo: 50.0, hi: 130.0 });
  if (timeoutsRemaining < 0 || timeoutsRemaining > 3) {
    throw new DataGapError("timeoutsRemaining", `Invalid timeout count ${timeoutsRemaining}.`);
  }

  const pressureStress = Math.min(1.0, pQuick / 0.45);
  const clockStress = pClock < 8.0 ? Math.max(0.0, (8.0 - pClock) / 8.0) : 0.0;
  const acousticStress = Math.max(0.0, Math.min(1.0, (splDb - 90.0) / 25.0));
  const timeoutScarcity = trailingLatePressure
    ? (3 - timeoutsRemaining) / 3.0
    : (0.10 * (3 - timeoutsRemaining)) / 3.0;

  const stressIndex = Math.max(
    0.0,
    Math.min(1.0, 0.42 * pressureStress + 0.28 * clockStress + 0.18 * acousticStress + 0.12 * timeoutScarcity)
  );
  return stressIndex <= 1e-9 ? 0.0 : 1.0 - Math.exp(-kappaJames * stressIndex);
}

export function computeGseQptsr(
  probQuickPressureSub2s: number,
  qbSackGivenQuickPress = 0.158,
  leagueSackGivenLatePress = 0.101,
  checkdownSubRate = 0.22
): { readonly sackExpected: number; readonly qptsrResidual: number; readonly checkdownBoost: number } {
  const pq = requireFiniteNumber(probQuickPressureSub2s, "probQuickPressureSub2s", { lo: 0.0, hi: 1.0 });
  return {
    sackExpected: pq * qbSackGivenQuickPress + (1.0 - pq) * leagueSackGivenLatePress,
    qptsrResidual: pq * (qbSackGivenQuickPress - leagueSackGivenLatePress),
    checkdownBoost: pq * checkdownSubRate,
  };
}

export function evaluateRulebookClockLeverage(state: CoordinatorGameState): ClockLeverageDecision {
  const tHalf = requireFiniteNumber(state.secondsRemainingHalf, "secondsRemainingHalf", { lo: 0.0, hi: 1800.0 });
  const tGame = requireFiniteNumber(state.secondsRemainingGame, "secondsRemainingGame", { lo: 0.0, hi: 3600.0 });

  const twoMinuteWarningActive =
    (state.quarter === 2 || state.quarter === 4) && ((tHalf >= 115.0 && tHalf <= 165.0) || tHalf <= 120.0);
  const doubleDipBridgeActive =
    state.quarter === 2 && tHalf <= 180.0 && state.offenseReceivesQ3Kickoff && state.scoreDiffOffense >= -7;

  const kneelDownsAvailable = Math.max(0, 4 - state.down);
  const unstoppableDowns = Math.max(0, kneelDownsAvailable - state.defenseTimeouts);
  const maxKneelBleedSec = unstoppableDowns * 40.0;
  const leadingOneScoreQ4 =
    state.quarter === 4 && state.scoreDiffOffense >= 1 && state.scoreDiffOffense <= 8 && tGame <= 240.0;
  const victoryKneeldownDeterministic = leadingOneScoreQ4 && maxKneelBleedSec >= tGame && tGame > 0.0;

  const shortfallSec = tGame - maxKneelBleedSec;
  const intentionalScrambleBurnRecommended =
    leadingOneScoreQ4 && !victoryKneeldownDeterministic && shortfallSec > 0.0 && shortfallSec <= 18.0 && kneelDownsAvailable >= 1;

  const expectedKneels = victoryKneeldownDeterministic
    ? Math.min(3, unstoppableDowns)
    : state.quarter === 4 && state.scoreDiffOffense >= 1 && state.scoreDiffOffense <= 8 && tGame <= 180.0
      ? 0.44 * 2.1
      : 0.0;
  const expectedKneeldownQbRushDeltaYds = Math.round(-1.35 * expectedKneels * 10000) / 10000;

  const trailingHurryup =
    state.quarter === 4 && state.scoreDiffOffense >= -10 && state.scoreDiffOffense <= -3 && tGame <= 180.0;
  const closeSecondHalf = (state.quarter === 3 || state.quarter === 4) && Math.abs(state.scoreDiffOffense) <= 8;

  return {
    twoMinuteWarningActive,
    doubleDipBridgeActive,
    victoryKneeldownDeterministic,
    intentionalScrambleBurnRecommended,
    expectedKneeldownQbRushDeltaYds,
    trailingHurryupCheckdownBoost: trailingHurryup ? 0.145 : 0.0,
    timeoutPreservationWpValue: Math.round(state.offenseTimeouts * (closeSecondHalf ? 0.031 : 0.012) * 10000) / 10000,
  };
}

export function evaluateFourthDownCausalWpa(ctx: FourthDownContext): FourthDownPolicyResult {
  const pConv = requireFiniteNumber(ctx.conversionProb, "conversionProb", { lo: 0.0, hi: 1.0 });
  const wpSucc = requireFiniteNumber(ctx.wpIfConvert, "wpIfConvert", { lo: 0.0, hi: 1.0 });
  const wpFail = requireFiniteNumber(ctx.wpIfFail, "wpIfFail", { lo: 0.0, hi: 1.0 });
  const wpPunt = requireFiniteNumber(ctx.wpIfPunt, "wpIfPunt", { lo: 0.0, hi: 1.0 });
  const aggr = requireFiniteNumber(ctx.coachAggressionIndex, "coachAggressionIndex", { lo: 0.0, hi: 1.0 });
  const animus = requireFiniteNumber(ctx.coachAnimusScore, "coachAnimusScore", { lo: 0.0, hi: 1.0 });

  const wpGo = pConv * wpSucc + (1.0 - pConv) * wpFail;
  let bestAltName: "FIELD_GOAL" | "PUNT" = "PUNT";
  let wpBestAlt = wpPunt;

  if (ctx.wpIfFieldGoal !== null) {
    const wpFgMade = requireFiniteNumber(ctx.wpIfFieldGoal, "wpIfFieldGoal", { lo: 0.0, hi: 1.0 });
    const pFg = requireFiniteNumber(ctx.fgMakeProb, "fgMakeProb", { lo: 0.0, hi: 1.0 });
    const wpFg = pFg * wpFgMade + (1.0 - pFg) * wpFail;
    if (wpFg > wpBestAlt) {
      wpBestAlt = wpFg;
      bestAltName = "FIELD_GOAL";
    }
  }

  const deltaWp = wpGo - wpBestAlt;
  const optimalAction: "GO" | "FIELD_GOAL" | "PUNT" = deltaWp > 0.0 ? "GO" : bestAltName;
  const effAggr = Math.min(0.99, aggr + (animus >= 0.75 ? 0.10 : 0.0));
  const coachGoProb = expit(18.0 * deltaWp + 2.4 * (effAggr - 0.65));
  const realizedWp = coachGoProb * wpGo + (1.0 - coachGoProb) * wpBestAlt;
  const wpBleed = realizedWp - Math.max(wpGo, wpBestAlt);

  return {
    optimalAction,
    deltaWpGoVsAlt: round6(deltaWp),
    expectedWpGo: round6(wpGo),
    expectedWpBestAlt: round6(wpBestAlt),
    realizedCoachGoProb: round6(coachGoProb),
    expectedCoachingWpBleed: round6(wpBleed),
  };
}

function softmax(values: readonly number[], precision: number): number[] {
  let maxScaled = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = precision * atOrThrow(values, i, "softmax");
    if (v > maxScaled) maxScaled = v;
  }
  const exps: number[] = [];
  let sum = 0.0;
  for (let i = 0; i < values.length; i++) {
    const e = Math.exp(precision * atOrThrow(values, i, "softmax") - maxScaled);
    exps.push(e);
    sum += e;
  }
  return exps.map((e) => e / sum);
}

function buildTacticalPayoffMatrix(state: CoordinatorGameState): number[][] {
  const pQuick = requireFiniteNumber(state.probQuickPressureSub2s, "probQuickPressureSub2s", { lo: 0.0, hi: 1.0 });
  const motion = requireFiniteNumber(state.motionRate, "motionRate", { lo: 0.0, hi: 1.0 });
  const tight = requireFiniteNumber(state.tightSplitRate, "tightSplitRate", { lo: 0.0, hi: 1.0 });

  const motionLift = 0.167 * motion + 0.05 * tight;
  const blindTurnPen = 0.52 * pQuick;
  const dropbackPressPen = 0.38 * pQuick;
  const quickHotBonus = 0.34 * pQuick;

  const u: number[][] = [
    [
      0.35 + motionLift - blindTurnPen,
      -0.01 - 0.50 * blindTurnPen,
      -0.14 - blindTurnPen,
      0.22 - 1.25 * blindTurnPen,
      0.08 - 0.60 * blindTurnPen,
    ],
    [
      0.06 + 0.30 * quickHotBonus,
      0.04 + 0.25 * quickHotBonus,
      0.11 + 0.65 * quickHotBonus,
      0.38 + quickHotBonus,
      0.09 + 0.40 * quickHotBonus,
    ],
    [
      0.12 - dropbackPressPen,
      0.19 - 0.70 * dropbackPressPen,
      -0.18 - dropbackPressPen,
      -0.09 - 1.15 * dropbackPressPen,
      -0.15 - 0.85 * dropbackPressPen,
    ],
    [
      -0.06 + 0.06 * tight,
      0.16 + 0.08 * tight,
      0.05 + 0.04 * tight,
      -0.12,
      0.18 + 0.07 * tight,
    ],
    [
      -0.04,
      0.03,
      0.15 + 0.25 * pQuick,
      0.31 + 0.40 * pQuick,
      0.07,
    ],
  ];

  if (state.down >= 3 && state.yardsToGo >= 5) {
    const runRow = atOrThrow(u, 3, "u.runRow");
    for (let j = 0; j < runRow.length; j++) {
      runRow[j] = atOrThrow(runRow, j) - 0.18;
    }
    const daggerRow = atOrThrow(u, 2, "u.daggerRow");
    daggerRow[4] = atOrThrow(daggerRow, 4) - 0.09;
  }
  return u;
}

function matVec(mat: readonly (readonly number[])[], vec: readonly number[]): number[] {
  return mat.map((row) => row.reduce((acc, val, j) => acc + val * atOrThrow(vec, j, "vec"), 0.0));
}

function vecMatNeg(vec: readonly number[], mat: readonly (readonly number[])[]): number[] {
  const cols = atOrThrow(mat, 0, "mat").length;
  const out: number[] = [];
  for (let j = 0; j < cols; j++) {
    let s = 0.0;
    for (let i = 0; i < vec.length; i++) {
      s += atOrThrow(vec, i, "vec") * at2DOrThrow(mat, i, j, "mat");
    }
    out.push(-s);
  }
  return out;
}

export class BelichickCoordinatorMind {
  private readonly tauCh: number;
  private readonly baseLambda: number;

  constructor(tauCognitiveHierarchy = 1.5, baseQuantalPrecision = 6.5) {
    this.tauCh = requireFiniteNumber(tauCognitiveHierarchy, "tauCognitiveHierarchy", { lo: 0.1, hi: 10.0 });
    this.baseLambda = requireFiniteNumber(baseQuantalPrecision, "baseQuantalPrecision", { lo: 0.1, hi: 50.0 });
  }

  public solveMatchup(params: {
    readonly ocLevelK: 0 | 1 | 2;
    readonly dcLevelK: 0 | 1 | 2;
    readonly ocHabitPrior: Readonly<Record<string, number>>;
    readonly dcHabitPrior: Readonly<Record<string, number>>;
    readonly ocScriptProfile: CoordinatorScriptProfile;
    readonly state: CoordinatorGameState;
    readonly fourthDownCtx?: FourthDownContext;
    readonly classAEnvelopeGuard?: Readonly<Record<string, unknown>>;
  }): BelichickCoordinatorEquilibrium {
    if (params.classAEnvelopeGuard !== undefined) {
      assertNoBookInCoachEngine(params.classAEnvelopeGuard);
    }

    const piOc0 = OFFENSIVE_ACTIONS.map((a) =>
      requireFiniteNumber(recordGetOrThrow(params.ocHabitPrior, a, "ocHabitPrior"), `ocHabitPrior.${a}`, { lo: 0, hi: 1 })
    );
    const piDc0 = DEFENSIVE_ACTIONS.map((d) =>
      requireFiniteNumber(recordGetOrThrow(params.dcHabitPrior, d, "dcHabitPrior"), `dcHabitPrior.${d}`, { lo: 0, hi: 1 })
    );
    const sumOc = piOc0.reduce((a, b) => a + b, 0.0);
    const sumDc = piDc0.reduce((a, b) => a + b, 0.0);
    if (Math.abs(sumOc - 1.0) > 0.05 || Math.abs(sumDc - 1.0) > 0.05) {
      throw new DataGapError("habitPriors", "Habit priors must sum to ~1.0.");
    }
    const oc0 = piOc0.map((v) => v / sumOc);
    const dc0 = piDc0.map((v) => v / sumDc);

    const tendencyRate = requireFiniteNumber(
      params.ocScriptProfile.rolling3WkTopTendencyRate,
      "rolling3WkTopTendencyRate",
      { lo: 0, hi: 1 }
    );
    const tendencyBreaker = tendencyRate > 0.78 && params.ocScriptProfile.isPostByeOrDivisional;
    const { shrunkCliffDelta } = computeCoordinatorScriptCliffDelta(params.ocScriptProfile);

    const st = params.state;
    const activeScriptAdj =
      st.playNumberInGame <= 15
        ? 0.0
        : st.quarter === 3 && st.quarterPlayIndex <= 6
          ? 0.35 * shrunkCliffDelta + params.ocScriptProfile.halftimeRescriptEpaBoost
          : shrunkCliffDelta;

    const trailingLate = st.quarter === 4 && st.scoreDiffOffense < 0 && st.secondsRemainingGame <= 300.0;
    const wHabitOc = computeWilliamJamesHabitRegression(
      st.probQuickPressureSub2s,
      st.playClockRemainingSec,
      st.acousticCrowdSplDb,
      st.offenseTimeouts,
      trailingLate
    );
    const dcClockPressure = Math.max(0.0, 22.0 - st.playClockRemainingSec);
    const wHabitDc = computeWilliamJamesHabitRegression(
      0.15 * (1.0 - st.probQuickPressureSub2s),
      Math.max(2.0, 40.0 - 1.6 * dcClockPressure),
      65.0,
      st.defenseTimeouts,
      st.quarter === 4 && st.scoreDiffOffense > 0 && st.secondsRemainingGame <= 300.0
    );

    const lamOc = this.baseLambda * (1.0 - 0.65 * wHabitOc);
    const lamDc = this.baseLambda * (1.0 - 0.65 * wHabitDc);

    const uMat = buildTacticalPayoffMatrix(st);
    if (tendencyBreaker) {
      let domIdx = 0;
      for (let i = 1; i < oc0.length; i++) {
        if (atOrThrow(oc0, i) > atOrThrow(oc0, domIdx)) domIdx = i;
      }
      for (let i = 0; i < uMat.length; i++) {
        if (i !== domIdx) {
          const row = atOrThrow(uMat, i);
          for (let j = 0; j < row.length; j++) {
            row[j] = atOrThrow(row, j) + 0.065;
          }
        }
      }
    }

    const oc1 = softmax(matVec(uMat, dc0), lamOc);
    const dc1 = softmax(vecMatNeg(oc0, uMat), lamDc);

    const g20 = 1.0 / (1.0 + this.tauCh);
    const g21 = this.tauCh / (1.0 + this.tauCh);

    const dcMix = dc0.map((v, j) => g20 * v + g21 * atOrThrow(dc1, j));
    const oc2 = softmax(matVec(uMat, dcMix), lamOc);

    const ocMix = oc0.map((v, i) => g20 * v + g21 * atOrThrow(oc1, i));
    const dc2 = softmax(vecMatNeg(ocMix, uMat), lamDc);

    const ocLevels: readonly (readonly number[])[] = [oc0, oc1, oc2];
    const dcLevels: readonly (readonly number[])[] = [dc0, dc1, dc2];

    const ocChosen = atOrThrow(ocLevels, params.ocLevelK);
    const dcChosen = atOrThrow(dcLevels, params.dcLevelK);

    const piOcEff = ocChosen.map((v, i) => (1.0 - wHabitOc) * v + wHabitOc * atOrThrow(oc0, i));
    const piDcEff = dcChosen.map((v, j) => (1.0 - wHabitDc) * v + wHabitDc * atOrThrow(dc0, j));

    let eqEpa = activeScriptAdj;
    for (let i = 0; i < OFFENSIVE_ACTIONS.length; i++) {
      for (let j = 0; j < DEFENSIVE_ACTIONS.length; j++) {
        eqEpa += atOrThrow(piOcEff, i) * at2DOrThrow(uMat, i, j) * atOrThrow(piDcEff, j);
      }
    }

    const qptsr = computeGseQptsr(st.probQuickPressureSub2s);
    const realizedCheckdownBoost = qptsr.checkdownBoost * (1.0 + 0.50 * atOrThrow(piOcEff, 1));

    const ocPolicy = {
      UNDER_CENTER_PA_SHOT: round6(atOrThrow(piOcEff, 0)),
      QUICK_GAME_SIGHT_ADJUST: round6(atOrThrow(piOcEff, 1)),
      SPREAD_INTERMEDIATE_DAGGER: round6(atOrThrow(piOcEff, 2)),
      CONDENSED_OUTSIDE_ZONE_RUN: round6(atOrThrow(piOcEff, 3)),
      SCREEN_DELAY_DRAW: round6(atOrThrow(piOcEff, 4)),
    };
    const dcPolicy = {
      BASE_SINGLE_HIGH_COVER_1_3: round6(atOrThrow(piDcEff, 0)),
      NICKEL_SPLIT_SAFETY_QUARTERS: round6(atOrThrow(piDcEff, 1)),
      SIMULATED_PRESSURE_CREEPER: round6(atOrThrow(piDcEff, 2)),
      ZERO_ALL_OUT_BLITZ: round6(atOrThrow(piDcEff, 3)),
      BELICHICK_OPTION1_BRACKET: round6(atOrThrow(piDcEff, 4)),
    };

    return {
      ocLevelK: params.ocLevelK,
      dcLevelK: params.dcLevelK,
      jamesHabitRegressionWeightOc: round6(wHabitOc),
      jamesHabitRegressionWeightDc: round6(wHabitDc),
      effectiveOcPrecision: round6(lamOc),
      effectiveDcPrecision: round6(lamDc),
      ocPolicy,
      dcPolicy,
      equilibriumExpectedEpa: round6(eqEpa),
      coordinatorScriptCliffDelta: round6(shrunkCliffDelta),
      activeScriptAdjustmentEpa: round6(activeScriptAdj),
      qptsrSackExpected: round6(qptsr.sackExpected),
      qptsrCheckdownBoost: round6(realizedCheckdownBoost),
      tendencyBreakerActive: tendencyBreaker,
      clockLeverage: evaluateRulebookClockLeverage(st),
      fourthDownEval: params.fourthDownCtx ? evaluateFourthDownCausalWpa(params.fourthDownCtx) : null,
    };
  }
}

// ============================================================================
// SUBSYSTEM 2: 4-STAGE NEURO-SYMBOLIC & CAUSAL 50K-SIGNAL ROUTER
// ============================================================================

export type LeagueTag = "NFL" | "NBA" | "NHL" | "CFB";

export interface SituationalContextInput288 {
  readonly gameId: string;
  readonly league: LeagueTag;
  readonly validTimeUnix: number;
  readonly txTimeUnix: number;
  readonly decisionTimeUnix: number;
  readonly kickoffTimeUnix: number;
  readonly temperatureF: number;
  readonly windSpeedMph: number;
  readonly precipitationRateMmHr: number;
  readonly altitudeFt: number;
  readonly surfaceTractionCoeff: number;
  readonly isDome: boolean;
  readonly daysRestHome: number;
  readonly daysRestAway: number;
  readonly timezoneShiftHours: number;
  readonly homeInteriorOlOutCount: number;
  readonly awayInteriorOlOutCount: number;
  readonly homeIlb1Out: boolean;
  readonly homeIlb2Out: boolean;
  readonly awayIlb1Out: boolean;
  readonly awayIlb2Out: boolean;
  readonly homeProjectedSackRate: number;
  readonly awayProjectedSackRate: number;
  readonly homeCb1Out: boolean;
  readonly awayCb1Out: boolean;
  readonly homeNickelCbActive: boolean;
  readonly awayNickelCbActive: boolean;
  readonly homeTwoHighShellRate: number;
  readonly awayTwoHighShellRate: number;
  readonly totalSteamMovePts: number;
  readonly spreadLineAbs: number;
  readonly offensivePaceSec: number;
  readonly combinedProe: number;
  readonly coachAggressivenessDelta: number;
  readonly officiatingPenaltyRate: number;
  readonly homeQbYpa: number;
  readonly awayQbYpa: number;
  readonly homeAcwr: number;
  readonly awayAcwr: number;
  readonly crowdDecibels: number;
  readonly homeRookieRouteRampInflection: boolean;
  readonly awayRookieRouteRampInflection: boolean;
  readonly qbRushPropHookInDangerZone: boolean;
}

export interface ContextualBitmask288Receipt {
  readonly words: Uint32Array;
  readonly packedBigInt288: bigint;
  readonly hexString: string;
  readonly sha256Digest: string;
  readonly activeBitIndices: readonly number[];
  readonly secondOrderFlags: {
    readonly mutualDefSpineVoid: boolean;
    readonly olAttritionNeutralizedByZeroRush: boolean;
    readonly ilbVoidNickelActiveTeRbFunnel: boolean;
    readonly calmWeatherExtendedFgYacRegime: boolean;
    readonly qbKneeldownHookHazard: boolean;
    readonly rookieRampVsDepletedCb1: boolean;
  };
}

function setBit(words: Uint32Array, bitIndex: number): void {
  const wIdx = Math.floor(bitIndex / 32);
  const offset = bitIndex % 32;
  const cur = atOrThrow(words, wIdx, "bitmask.words");
  words[wIdx] = (cur | (1 << offset)) >>> 0;
}

function getBit(words: Uint32Array, bitIndex: number): boolean {
  const wIdx = Math.floor(bitIndex / 32);
  const offset = bitIndex % 32;
  const cur = atOrThrow(words, wIdx, "bitmask.words");
  return ((cur >>> offset) & 1) === 1;
}

export function wordsToBigInt288(words: Uint32Array): bigint {
  let acc = 0n;
  for (let i = 0; i < words.length; i++) {
    acc |= BigInt(atOrThrow(words, i) >>> 0) << BigInt(32 * i);
  }
  return acc;
}

export function buildContextualBitmask288(ctx: SituationalContextInput288): ContextualBitmask288Receipt {
  if (!ctx.gameId) throw new DataGapError("gameId", "Missing gameId.");
  const tVal = requireFiniteNumber(ctx.validTimeUnix, "validTimeUnix");
  const tTx = requireFiniteNumber(ctx.txTimeUnix, "txTimeUnix");
  const tDec = requireFiniteNumber(ctx.decisionTimeUnix, "decisionTimeUnix");
  const tKick = requireFiniteNumber(ctx.kickoffTimeUnix, "kickoffTimeUnix");
  if (!(tVal <= tTx && tTx <= tDec && tDec <= tKick)) {
    throw new DataGapError("bitemporal_watermark", "Bitemporal leakage detected.");
  }

  const tempF = requireFiniteNumber(ctx.temperatureF, "temperatureF", { lo: -30, hi: 135 });
  const windMph = requireFiniteNumber(ctx.windSpeedMph, "windSpeedMph", { lo: 0, hi: 90 });
  const precip = requireFiniteNumber(ctx.precipitationRateMmHr, "precipitationRateMmHr", { lo: 0, hi: 200 });
  const altFt = requireFiniteNumber(ctx.altitudeFt, "altitudeFt", { lo: -200, hi: 15000 });
  const traction = requireFiniteNumber(ctx.surfaceTractionCoeff, "surfaceTractionCoeff", { lo: 0.1, hi: 1.5 });
  const tz = requireFiniteNumber(ctx.timezoneShiftHours, "timezoneShiftHours", { lo: -12, hi: 12 });
  const homeSack = requireFiniteNumber(ctx.homeProjectedSackRate, "homeProjectedSackRate", { lo: 0, hi: 0.35 });
  const awaySack = requireFiniteNumber(ctx.awayProjectedSackRate, "awayProjectedSackRate", { lo: 0, hi: 0.35 });
  const home2h = requireFiniteNumber(ctx.homeTwoHighShellRate, "homeTwoHighShellRate", { lo: 0, hi: 1 });
  const away2h = requireFiniteNumber(ctx.awayTwoHighShellRate, "awayTwoHighShellRate", { lo: 0, hi: 1 });
  const steam = requireFiniteNumber(ctx.totalSteamMovePts, "totalSteamMovePts", { lo: -25, hi: 25 });
  const spreadAbs = requireFiniteNumber(ctx.spreadLineAbs, "spreadLineAbs", { lo: 0, hi: 45 });
  const pace = requireFiniteNumber(ctx.offensivePaceSec, "offensivePaceSec", { lo: 15, hi: 45 });
  const proe = requireFiniteNumber(ctx.combinedProe, "combinedProe", { lo: -0.5, hi: 0.5 });
  const aggrD = requireFiniteNumber(ctx.coachAggressivenessDelta, "coachAggressivenessDelta", { lo: -1, hi: 1 });
  const penRate = requireFiniteNumber(ctx.officiatingPenaltyRate, "officiatingPenaltyRate", { lo: 0, hi: 30 });
  const homeYpa = requireFiniteNumber(ctx.homeQbYpa, "homeQbYpa", { lo: 2, hi: 15 });
  const awayYpa = requireFiniteNumber(ctx.awayQbYpa, "awayQbYpa", { lo: 2, hi: 15 });
  const homeAcwr = requireFiniteNumber(ctx.homeAcwr, "homeAcwr", { lo: 0.2, hi: 3.5 });
  const awayAcwr = requireFiniteNumber(ctx.awayAcwr, "awayAcwr", { lo: 0.2, hi: 3.5 });
  const crowdDb = requireFiniteNumber(ctx.crowdDecibels, "crowdDecibels", { lo: 40, hi: 130 });

  const words = new Uint32Array(BITMASK_WORD_COUNT);

  if (tempF < 32) setBit(words, 0);
  else if (tempF < 50) setBit(words, 1);
  else if (tempF <= 70) setBit(words, 2);
  else setBit(words, 3);

  if (windMph <= 8.0) setBit(words, 4);
  else if (windMph <= 15.0) setBit(words, 5);
  else if (windMph <= 22.0) setBit(words, 6);
  else setBit(words, 7);

  if (precip > 0.1) setBit(words, 10);
  if (altFt > 4000) setBit(words, 13);
  if (traction < 0.75) setBit(words, 14);
  if (ctx.isDome) setBit(words, 15);
  if (ctx.daysRestHome <= 4 || ctx.daysRestAway <= 4) setBit(words, 16);
  if (ctx.daysRestHome >= 13 || ctx.daysRestAway >= 13) setBit(words, 17);
  if (Math.abs(tz) >= 1.0) setBit(words, 22);

  if (ctx.homeInteriorOlOutCount >= 2) setBit(words, 41);
  if (ctx.awayInteriorOlOutCount >= 2) setBit(words, 57);

  if (ctx.homeIlb1Out) setBit(words, 72);
  if (ctx.homeIlb2Out) setBit(words, 73);
  if (homeSack < 0.045) setBit(words, 76);
  if (ctx.awayIlb1Out) setBit(words, 88);
  if (ctx.awayIlb2Out) setBit(words, 89);
  if (awaySack < 0.045) setBit(words, 92);

  if (ctx.homeCb1Out) setBit(words, 96);
  if (ctx.homeNickelCbActive) setBit(words, 100);
  if (home2h >= 0.55) setBit(words, 106);
  if (ctx.awayCb1Out) setBit(words, 112);
  if (ctx.awayNickelCbActive) setBit(words, 116);
  if (away2h >= 0.55) setBit(words, 122);

  if (Math.abs(steam) >= 3.0) setBit(words, 140);
  if (Math.abs(spreadAbs - 3.0) < 0.01) setBit(words, 152);

  if (pace < 26.5) setBit(words, 160);
  if (proe > 0.03) setBit(words, 166);
  if (aggrD > 0.10) setBit(words, 178);
  if (penRate >= 13.0) setBit(words, 184);
  if (homeYpa >= 7.5 && awayYpa >= 7.5) setBit(words, 188);

  if (homeAcwr > 1.35 || awayAcwr > 1.35) setBit(words, 192);
  if (crowdDb > 100.0) setBit(words, 204);
  if (ctx.homeRookieRouteRampInflection) setBit(words, 216);
  if (ctx.awayRookieRouteRampInflection) setBit(words, 220);

  const mutualDefSpineVoid =
    getBit(words, 72) && getBit(words, 73) && (getBit(words, 112) || (getBit(words, 88) && getBit(words, 89)));
  if (mutualDefSpineVoid) setBit(words, 224);

  const olAttritionNeutralizedByZeroRush = getBit(words, 57) && getBit(words, 76);
  if (olAttritionNeutralizedByZeroRush) setBit(words, 225);

  const ilbVoidNickelActiveTeRbFunnel =
    (getBit(words, 72) && getBit(words, 73) && getBit(words, 100)) ||
    (getBit(words, 88) && getBit(words, 89) && getBit(words, 116));
  if (ilbVoidNickelActiveTeRbFunnel) setBit(words, 226);

  const calmWeatherExtendedFgYacRegime =
    getBit(words, 2) && getBit(words, 4) && !getBit(words, 10) && mutualDefSpineVoid;
  if (calmWeatherExtendedFgYacRegime) setBit(words, 228);

  const qbKneeldownHookHazard = getBit(words, 152) && ctx.qbRushPropHookInDangerZone;
  if (qbKneeldownHookHazard) setBit(words, 230);

  const rookieRampVsDepletedCb1 =
    (getBit(words, 216) && getBit(words, 112)) || (getBit(words, 220) && getBit(words, 96));
  if (rookieRampVsDepletedCb1) setBit(words, 234);

  const leagueCodes: Record<LeagueTag, number> = { NFL: 1, NBA: 2, NHL: 3, CFB: 4 };
  const lCode = leagueCodes[ctx.league];
  if (lCode & 1) setBit(words, 256);
  if (lCode & 2) setBit(words, 257);
  if (lCode & 4) setBit(words, 258);

  const activeBitIndices: number[] = [];
  for (let i = 0; i < BITMASK_TOTAL_BITS; i++) {
    if (getBit(words, i)) activeBitIndices.push(i);
  }

  const hexString = Array.from(words, (w) => w.toString(16).padStart(8, "0")).join(":");
  const byteBuf = Buffer.alloc(36);
  for (let i = 0; i < 9; i++) {
    byteBuf.writeUInt32LE(atOrThrow(words, i) >>> 0, i * 4);
  }
  const sha256Digest = createHash("sha256").update(byteBuf).digest("hex");

  return {
    words,
    packedBigInt288: wordsToBigInt288(words),
    hexString,
    sha256Digest,
    activeBitIndices,
    secondOrderFlags: {
      mutualDefSpineVoid,
      olAttritionNeutralizedByZeroRush,
      ilbVoidNickelActiveTeRbFunnel,
      calmWeatherExtendedFgYacRegime,
      qbKneeldownHookHazard,
      rookieRampVsDepletedCb1,
    },
  };
}

// --- Stage B: Shpitser-Pearl ID, HCID Mediator & VanderWeele E-Value ---

export interface CausalADMG {
  readonly nodes: readonly string[];
  readonly directed: readonly (readonly [string, string])[];
  readonly bidirected: readonly (readonly [string, string])[];
}

export interface SymbolicFactor {
  readonly kind: "OBSERVATIONAL_COND" | "PRODUCT" | "MARGINAL_SUM" | "RATIO";
  readonly target?: string;
  readonly given?: readonly string[];
  readonly factors?: readonly SymbolicFactor[];
  readonly sumOut?: readonly string[];
  readonly body?: SymbolicFactor;
  readonly numerator?: SymbolicFactor;
  readonly denominator?: SymbolicFactor;
}

export interface ShpitserPearlIDResult {
  readonly identifiable: boolean;
  readonly formulaClass: string;
  readonly formula?: SymbolicFactor;
  readonly enablingEdges?: readonly (readonly [string, string])[];
}

function induceSubgraph(g: CausalADMG, keep: ReadonlySet<string>): CausalADMG {
  return {
    nodes: g.nodes.filter((n) => keep.has(n)),
    directed: g.directed.filter(([u, v]) => keep.has(u) && keep.has(v)),
    bidirected: g.bidirected.filter(([u, v]) => keep.has(u) && keep.has(v)),
  };
}

function mutilateIncoming(g: CausalADMG, xSet: ReadonlySet<string>): CausalADMG {
  return {
    nodes: g.nodes,
    directed: g.directed.filter(([, v]) => !xSet.has(v)),
    bidirected: g.bidirected.filter(([u, v]) => !xSet.has(u) && !xSet.has(v)),
  };
}

function ancestorsOf(g: CausalADMG, targets: ReadonlySet<string>): Set<string> {
  const rev = new Map<string, string[]>();
  for (const n of g.nodes) rev.set(n, []);
  for (const [u, v] of g.directed) rev.get(v)?.push(u);
  const visited = new Set<string>();
  const stack: string[] = [];
  for (const t of targets) {
    if (rev.has(t)) {
      visited.add(t);
      stack.push(t);
    }
  }
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined) break;
    for (const p of rev.get(cur) ?? []) {
      if (!visited.has(p)) {
        visited.add(p);
        stack.push(p);
      }
    }
  }
  return visited;
}

function maximalCComponents(g: CausalADMG): Set<string>[] {
  const adj = new Map<string, string[]>();
  for (const n of g.nodes) adj.set(n, []);
  for (const [u, v] of g.bidirected) {
    adj.get(u)?.push(v);
    adj.get(v)?.push(u);
  }
  const seen = new Set<string>();
  const comps: Set<string>[] = [];
  for (const n of g.nodes) {
    if (!seen.has(n)) {
      const comp = new Set<string>();
      const q: string[] = [n];
      seen.add(n);
      while (q.length > 0) {
        const cur = q.pop();
        if (cur === undefined) break;
        comp.add(cur);
        for (const nb of adj.get(cur) ?? []) {
          if (!seen.has(nb)) {
            seen.add(nb);
            q.push(nb);
          }
        }
      }
      comps.push(comp);
    }
  }
  return comps;
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function expandEdgeWithHcidMediator(
  g: CausalADMG,
  edge: readonly [string, string],
  mediatorNode: string
): CausalADMG {
  const [u, v] = edge;
  const vIdx = g.nodes.indexOf(v);
  if (vIdx <= 0) throw new DataGapError("hcid_edge", "Invalid target node for mediator expansion.");
  const newNodes = [...g.nodes.slice(0, vIdx), mediatorNode, ...g.nodes.slice(vIdx)];
  const newDir: (readonly [string, string])[] = [
    ...g.directed.filter(([a, b]) => !(a === u && b === v)),
    [u, mediatorNode],
    [mediatorNode, v],
  ];
  return { nodes: newNodes, directed: newDir, bidirected: g.bidirected };
}

export function runShpitserPearlID(
  ySet: ReadonlySet<string>,
  xSet: ReadonlySet<string>,
  g: CausalADMG,
  activeQFactor?: SymbolicFactor,
  isMarginalizedCFactor = false,
  fullTopoNodes?: readonly string[]
): ShpitserPearlIDResult {
  const topo = fullTopoNodes ?? g.nodes;
  const vSet = new Set(g.nodes);
  const currentDist: SymbolicFactor =
    activeQFactor ?? {
      kind: "PRODUCT",
      factors: g.nodes.map((n) => ({
        kind: "OBSERVATIONAL_COND",
        target: n,
        given: topo.slice(0, topo.indexOf(n)),
      })),
    };

  if (xSet.size === 0) {
    const sumOut = g.nodes.filter((n) => !ySet.has(n));
    return {
      identifiable: true,
      formulaClass: "OBSERVATIONAL_MARGINAL",
      formula: sumOut.length > 0 ? { kind: "MARGINAL_SUM", sumOut, body: currentDist } : currentDist,
    };
  }

  const anY = ancestorsOf(g, ySet);
  if (anY.size < vSet.size) {
    const gAn = induceSubgraph(g, anY);
    const xAn = new Set([...xSet].filter((x) => anY.has(x)));
    const pruned = g.nodes.filter((n) => !anY.has(n));
    const marg: SymbolicFactor = { kind: "MARGINAL_SUM", sumOut: pruned, body: currentDist };
    return runShpitserPearlID(
      ySet,
      xAn,
      gAn,
      marg,
      activeQFactor !== undefined || isMarginalizedCFactor,
      topo
    );
  }

  const gOverX = mutilateIncoming(g, xSet);
  const anYOverX = ancestorsOf(gOverX, ySet);
  const wNodes = g.nodes.filter((n) => !xSet.has(n) && !anYOverX.has(n));
  if (wNodes.length > 0) {
    return runShpitserPearlID(ySet, new Set([...xSet, ...wNodes]), g, activeQFactor, isMarginalizedCFactor, topo);
  }

  const vMinusX = new Set(g.nodes.filter((n) => !xSet.has(n)));
  const cComps = maximalCComponents(induceSubgraph(g, vMinusX));
  if (cComps.length >= 2) {
    const childFactors: SymbolicFactor[] = [];
    for (const sComp of cComps) {
      const vMinusSi = new Set(g.nodes.filter((n) => !sComp.has(n)));
      const sub = runShpitserPearlID(sComp, vMinusSi, g, activeQFactor, isMarginalizedCFactor, topo);
      if (!sub.identifiable || !sub.formula) return sub;
      childFactors.push(sub.formula);
    }
    const sumOut = g.nodes.filter((n) => !ySet.has(n) && !xSet.has(n));
    const prod: SymbolicFactor = { kind: "PRODUCT", factors: childFactors };
    return {
      identifiable: true,
      formulaClass: "FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION",
      formula: sumOut.length > 0 ? { kind: "MARGINAL_SUM", sumOut, body: prod } : prod,
    };
  }

  const sComp = atOrThrow(cComps, 0, "cComps");
  const topCComps = maximalCComponents(g);
  if (topCComps.length === 1 && atOrThrow(topCComps, 0).size === vSet.size) {
    const enablingEdges = g.directed.filter(([u, v]) => vSet.has(u) && vSet.has(v) && !(sComp.has(u) && sComp.has(v)));
    return { identifiable: false, formulaClass: "FAIL_HEDGE", enablingEdges };
  }

  if (topCComps.some((c) => setsEqual(c, sComp))) {
    const sOrdered = g.nodes.filter((n) => sComp.has(n));
    const sumOutSMinusY = sOrdered.filter((n) => !ySet.has(n));
    if (isMarginalizedCFactor && activeQFactor !== undefined) {
      const numerator: SymbolicFactor =
        sumOutSMinusY.length > 0 ? { kind: "MARGINAL_SUM", sumOut: sumOutSMinusY, body: currentDist } : currentDist;
      const denominator: SymbolicFactor = { kind: "MARGINAL_SUM", sumOut: sOrdered, body: currentDist };
      return {
        identifiable: true,
        formulaClass: "TIAN_C_FACTOR_RATIO",
        formula: { kind: "RATIO", numerator, denominator },
      };
    }
    const sFactors: SymbolicFactor[] = sOrdered.map((n) => ({
      kind: "OBSERVATIONAL_COND",
      target: n,
      given: topo.slice(0, topo.indexOf(n)),
    }));
    const body: SymbolicFactor =
      sFactors.length === 1 ? atOrThrow(sFactors, 0) : { kind: "PRODUCT", factors: sFactors };
    return {
      identifiable: true,
      formulaClass: "BACK_DOOR_OR_DIRECT_C_FACTOR",
      formula: sumOutSMinusY.length > 0 ? { kind: "MARGINAL_SUM", sumOut: sumOutSMinusY, body } : body,
    };
  }

  const superComp = topCComps.find((c) => c.size > sComp.size && [...sComp].every((n) => c.has(n)));
  if (!superComp) throw new DataGapError("shpitser_pearl", "Super C-component invariant failed.");
  const gSuper = induceSubgraph(g, superComp);
  const xSuper = new Set([...xSet].filter((x) => superComp.has(x)));
  const superOrdered = g.nodes.filter((n) => superComp.has(n));
  const qSuper: SymbolicFactor = {
    kind: "PRODUCT",
    factors: superOrdered.map((n) => ({
      kind: "OBSERVATIONAL_COND",
      target: n,
      given: topo.slice(0, topo.indexOf(n)),
    })),
  };
  return runShpitserPearlID(ySet, xSuper, gSuper, qSuper, isMarginalizedCFactor, topo);
}

export function computeVanderWeeleEValue(
  treatedResiduals: readonly number[],
  controlResiduals: readonly number[],
  minEPoint = MIN_E_VALUE_POINT,
  minECi = MIN_E_VALUE_CI_LOW,
  minN = MIN_SAMPLE_PER_ARM
): {
  readonly passed: boolean;
  readonly standardizedMeanDiff: number;
  readonly eValuePoint: number;
  readonly eValueCiLow: number;
  readonly refusalCode: string | null;
} {
  const n1 = treatedResiduals.length;
  const n0 = controlResiduals.length;
  if (n1 < minN || n0 < minN) {
    throw new DataGapError("residual_arm_sample", `Sample floor violated: n1=${n1}, n0=${n0}.`);
  }
  const m1 = treatedResiduals.reduce((a, b) => a + requireFiniteNumber(b, "t_res"), 0.0) / n1;
  const m0 = controlResiduals.reduce((a, b) => a + requireFiniteNumber(b, "c_res"), 0.0) / n0;
  const v1 = treatedResiduals.reduce((a, b) => a + (b - m1) ** 2, 0.0) / (n1 - 1);
  const v0 = controlResiduals.reduce((a, b) => a + (b - m0) ** 2, 0.0) / (n0 - 1);
  const pooledSd = Math.sqrt(((n1 - 1) * v1 + (n0 - 1) * v0) / (n1 + n0 - 2));
  if (pooledSd <= 1e-12) throw new DataGapError("pooledSd", "Zero pooled variance.");

  const d = Math.abs(m1 - m0) / pooledSd;
  const seD = Math.sqrt((n1 + n0) / (n1 * n0) + (d * d) / (2.0 * (n1 + n0)));
  const dCi = Math.max(0.0, d - 1.96 * seD);

  const rrPoint = Math.exp(0.91 * d);
  const rrCi = Math.exp(0.91 * dCi);
  const ePoint = rrPoint > 1.0 ? rrPoint + Math.sqrt(rrPoint * (rrPoint - 1.0)) : 1.0;
  const eCi = rrCi > 1.0 ? rrCi + Math.sqrt(rrCi * (rrCi - 1.0)) : 1.0;
  const passed = ePoint >= minEPoint && eCi >= minECi;

  return {
    passed,
    standardizedMeanDiff: round6(d),
    eValuePoint: round6(ePoint),
    eValueCiLow: round6(eCi),
    refusalCode: passed ? null : "REFUSED_G4_FRAGILE_E_VALUE",
  };
}

// --- Stage C & D: FWL Orthogonalization, Baranchik JS+ & Murphy Brier ---

function qrLeastSquares(aMat: readonly (readonly number[])[], bVec: readonly number[]): number[] {
  const m = aMat.length;
  const n = atOrThrow(aMat, 0, "aMat").length;
  // Modified Gram-Schmidt QR decomposition A = Q R
  const qCols: number[][] = [];
  const rMat: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0.0));

  for (let j = 0; j < n; j++) {
    const v: number[] = [];
    for (let i = 0; i < m; i++) v.push(at2DOrThrow(aMat, i, j, "aMat"));
    for (let k = 0; k < j; k++) {
      const qk = atOrThrow(qCols, k, "qCols");
      let dot = 0.0;
      for (let i = 0; i < m; i++) dot += atOrThrow(qk, i) * atOrThrow(v, i);
      atOrThrow(rMat, k)[j] = dot;
      for (let i = 0; i < m; i++) v[i] = atOrThrow(v, i) - dot * atOrThrow(qk, i);
    }
    let norm = 0.0;
    for (let i = 0; i < m; i++) norm += atOrThrow(v, i) ** 2;
    norm = Math.sqrt(norm);
    if (norm <= 1e-12) throw new DataGapError("qrLeastSquares", "Rank-deficient design matrix in FWL.");
    atOrThrow(rMat, j)[j] = norm;
    qCols.push(v.map((vi) => vi / norm));
  }

  const qtB: number[] = [];
  for (let j = 0; j < n; j++) {
    const qj = atOrThrow(qCols, j);
    let dot = 0.0;
    for (let i = 0; i < m; i++) dot += atOrThrow(qj, i) * atOrThrow(bVec, i, "bVec");
    qtB.push(dot);
  }

  const x = new Array<number>(n).fill(0.0);
  for (let j = n - 1; j >= 0; j--) {
    let rhs = atOrThrow(qtB, j);
    for (let k = j + 1; k < n; k++) {
      rhs -= at2DOrThrow(rMat, j, k, "rMat") * atOrThrow(x, k);
    }
    x[j] = rhs / at2DOrThrow(rMat, j, j, "rMat");
  }
  return x;
}

export function frischWaughLovellOrthogonalize(
  signalsX: readonly (readonly number[])[],
  marketAnchorsM: readonly (readonly number[])[],
  outcomeY: readonly number[]
): { readonly tauHat: readonly number[]; readonly maxAnchorOrthogonalityError: number } {
  const nObs = outcomeY.length;
  const pSig = atOrThrow(signalsX, 0, "signalsX").length;
  const mAug = marketAnchorsM.map((row) => [1.0, ...row]);

  const xTildeCols: number[][] = [];
  for (let j = 0; j < pSig; j++) {
    const xCol = signalsX.map((r) => atOrThrow(r, j, "signalsX.col"));
    const coef = qrLeastSquares(mAug, xCol);
    const res = xCol.map((val, i) => {
      const pred = atOrThrow(mAug, i).reduce((acc, mij, k) => acc + mij * atOrThrow(coef, k), 0.0);
      return val - pred;
    });
    xTildeCols.push(res);
  }

  const xTilde: number[][] = [];
  for (let i = 0; i < nObs; i++) {
    xTilde.push(xTildeCols.map((col) => atOrThrow(col, i)));
  }

  const coefMy = qrLeastSquares(mAug, outcomeY);
  const yTilde = outcomeY.map((val, i) => {
    const pred = atOrThrow(mAug, i).reduce((acc, mij, k) => acc + mij * atOrThrow(coefMy, k), 0.0);
    return val - pred;
  });

  const tauHat = qrLeastSquares(xTilde, yTilde);

  let maxOrthoErr = 0.0;
  const qDim = atOrThrow(mAug, 0).length;
  for (let k = 0; k < qDim; k++) {
    for (let j = 0; j < pSig; j++) {
      let dot = 0.0;
      for (let i = 0; i < nObs; i++) {
        dot += at2DOrThrow(mAug, i, k) * at2DOrThrow(xTilde, i, j);
      }
      if (Math.abs(dot) > maxOrthoErr) maxOrthoErr = Math.abs(dot);
    }
  }
  return { tauHat, maxAnchorOrthogonalityError: maxOrthoErr };
}

export function positivePartJamesStein(
  rawDeltas: readonly number[],
  diagonalVariances?: readonly number[]
): { readonly shrunk: readonly number[]; readonly shrinkageFactor: number } {
  const m = rawDeltas.length;
  if (m === 0) throw new DataGapError("rawDeltas", "Empty delta vector.");
  for (const v of rawDeltas) requireFiniteNumber(v, "rawDeltas");
  if (m < 3) return { shrunk: [...rawDeltas], shrinkageFactor: 1.0 };

  let quadForm = 0.0;
  for (let i = 0; i < m; i++) {
    const xi = atOrThrow(rawDeltas, i);
    const vi = diagonalVariances ? requireFiniteNumber(atOrThrow(diagonalVariances, i), "var", { lo: 1e-12 }) : 1.0;
    quadForm += (xi * xi) / vi;
  }
  if (quadForm <= 1e-12) {
    return { shrunk: new Array<number>(m).fill(0.0), shrinkageFactor: 0.0 };
  }
  const factor = Math.max(0.0, 1.0 - (m - 2) / quadForm);
  return { shrunk: rawDeltas.map((x) => factor * x), shrinkageFactor: round6(factor) };
}

export function murphyBrierDecomposition(
  probs: readonly number[],
  outcomes: readonly number[],
  nBins = 10
): {
  readonly brierScoreExact: number;
  readonly brierScoreBinned: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly partitionIdentityError: number;
} {
  if (probs.length === 0 || probs.length !== outcomes.length) {
    throw new DataGapError("brier_inputs", "Mismatched or empty arrays.");
  }
  const nTotal = probs.length;
  let bsExact = 0.0;
  let ySum = 0.0;
  for (let i = 0; i < nTotal; i++) {
    const p = requireFiniteNumber(atOrThrow(probs, i), "prob", { lo: 0, hi: 1 });
    const y = requireFiniteNumber(atOrThrow(outcomes, i), "outcome", { lo: 0, hi: 1 });
    bsExact += (p - y) ** 2;
    ySum += y;
  }
  bsExact /= nTotal;
  const yBar = ySum / nTotal;
  const unc = yBar * (1.0 - yBar);

  let rel = 0.0;
  let res = 0.0;
  let bsBinned = 0.0;
  for (let k = 0; k < nBins; k++) {
    const idxInBin: number[] = [];
    for (let i = 0; i < nTotal; i++) {
      const b = Math.min(nBins - 1, Math.floor(atOrThrow(probs, i) * nBins));
      if (b === k) idxInBin.push(i);
    }
    const nk = idxInBin.length;
    if (nk === 0) continue;
    const pBarK = idxInBin.reduce((a, idx) => a + atOrThrow(probs, idx), 0.0) / nk;
    const yBarK = idxInBin.reduce((a, idx) => a + atOrThrow(outcomes, idx), 0.0) / nk;
    const wk = nk / nTotal;
    rel += wk * (pBarK - yBarK) ** 2;
    res += wk * (yBarK - yBar) ** 2;
    for (const idx of idxInBin) {
      bsBinned += (pBarK - atOrThrow(outcomes, idx)) ** 2 / nTotal;
    }
  }
  const partitionIdentityError = Math.abs(rel - res + unc - bsBinned);
  return {
    brierScoreExact: bsExact,
    brierScoreBinned: bsBinned,
    reliability: rel,
    resolution: res,
    uncertainty: unc,
    partitionIdentityError,
  };
}

// ============================================================================
// SUBSYSTEM 3: SIRIUSXM CHANNEL 87 AUDIO CLAIM VERACITY BAYESIAN UPDATER
// ============================================================================

export type AudioClaimCategory = "INJURY_AVAILABILITY" | "SCHEME_WORKLOAD_REVEAL";
export type StructuredClaimPolarity =
  | "POSITIVE_ACTIVE_OR_BOOST"
  | "NEGATIVE_OUT_OR_LIMIT"
  | "AMBIGUOUS_COACHSPEAK";

export interface DeepgramNova2Utterance {
  readonly utteranceId: string;
  readonly channelId: number;
  readonly showOrSource: string;
  readonly speakerId: string;
  readonly speakerRole: "HEAD_COACH" | "BEAT_REPORTER" | "RADIO_ANALYST";
  readonly subjectPlayerId: string;
  readonly transcriptText: string;
  readonly deepgramModel: string;
  readonly wordConfidenceMean: number;
  readonly validTimeUnix: number;
  readonly txTimeUnix: number;
  readonly sidelinePodiumCmaDeceptionScore?: number;
}

export interface CoachBetaBinomialPrior {
  readonly speakerId: string;
  readonly injuryAlpha: number;
  readonly injuryBeta: number;
  readonly schemeAlpha: number;
  readonly schemeBeta: number;
}

const COACHSPEAK_PATTERNS: readonly RegExp[] = [
  /\bhopeful\b/i,
  /\bworking\s+through\s+it\b/i,
  /\bday[\s-]+to[\s-]+day\b/i,
  /\bwe['’]?ll\s+see\b/i,
  /\bone\s+day\s+at\s+a\s+time\b/i,
  /\bgame[\s-]+time\s+decision\b/i,
];

const SCHEME_PATTERNS: readonly RegExp[] = [
  /\b(?:right|left)\s+(?:guard|tackle)\b/i,
  /\bsnap\s+(?:count|share)\b/i,
  /\b\d+\s*\+?\s*(?:carries|touches|targets|snaps)\b/i,
  /\bthree[\s-]+down\s+role\b/i,
  /\bgoal[\s-]+line\s+back\b/i,
  /\bcall(?:ing)?\s+plays\b/i,
  /\bslot\s+rep/i,
];

const POS_PATTERNS: readonly RegExp[] = [
  /\bpractic(?:ed|ing)\s+in\s+full\b/i,
  /\bfull\s+participant\b/i,
  /\bgood\s+to\s+go\b/i,
  /\b100\s*%\b|\bhundred\s+percent\b/i,
  /\blead\s+back\b|\bthree[\s-]+down\s+role\b|\bfeed\s+him\b/i,
  /\bmov(?:e|ing)\s+\w+\s+to\s+(?:his\s+)?natural\s+position\b/i,
  /\b25\s+carries\b|\b30\s*\+\s*touches\b/i,
];

const NEG_PATTERNS: readonly RegExp[] = [
  /\binjured\s+reserve\b|\bshort[\s-]+term\s+ir\b|\bon\s+ir\b/i,
  /\bsurgery\b/i,
  /\bmiss\s+the\s+rest\s+of\s+the\s+season\b|\bseason\s+over\b/i,
  /\bdnp\b|\bnot\s+practicing\b|\bruled\s+out\b/i,
  /\blimited\s+snap\b|\bpitch\s+count\b|\berr\s+on\s+the\s+side\s+of\s+caution\b/i,
];

export function evaluateSiriusXMAudioClaims(params: {
  readonly subjectPlayerId: string;
  readonly priorAvailabilityProb: number;
  readonly utterances: readonly DeepgramNova2Utterance[];
  readonly speakerPriors: Readonly<Record<string, CoachBetaBinomialPrior>>;
  readonly decisionTimeUnix: number;
  readonly minDeepgramConfidence?: number;
  readonly conflictDivergenceThreshold?: number;
}): {
  readonly subjectPlayerId: string;
  readonly priorProb: number;
  readonly posteriorProb: number;
  readonly appliedLogOddsDelta: number;
  readonly conflictOnRecord: boolean;
  readonly governanceAction: "UPDATED_ACTIVE" | "COACHSPEAK_MUTED" | "HOLD_SURVEILLANCE_CONFLICT";
} {
  const p0 = requireOpenProb(params.priorAvailabilityProb, "priorAvailabilityProb");
  const tDec = requireFiniteNumber(params.decisionTimeUnix, "decisionTimeUnix");
  const minConf = params.minDeepgramConfidence ?? 0.70;
  const conflictThresh = params.conflictDivergenceThreshold ?? 0.45;
  if (params.utterances.length === 0) throw new DataGapError("utterances", "Empty utterance list.");

  const baseLogit = logit(p0);
  const signedShifts: number[] = [];
  let anyMuted = false;
  let matched = 0;

  for (const utt of params.utterances) {
    if (utt.subjectPlayerId !== params.subjectPlayerId) continue;
    matched++;
    if (!utt.deepgramModel.startsWith("nova-2")) {
      throw new DataGapError("deepgramModel", `Expected nova-2 model, got ${utt.deepgramModel}.`);
    }
    const dgConf = requireFiniteNumber(utt.wordConfidenceMean, "wordConfidenceMean", { lo: 0, hi: 1 });
    if (dgConf < minConf) {
      throw new DataGapError("wordConfidenceMean", `Deepgram confidence ${dgConf} < ${minConf}.`);
    }
    if (!(utt.validTimeUnix <= utt.txTimeUnix && utt.txTimeUnix <= tDec)) {
      throw new DataGapError("audio_bitemporal_watermark", "Audio bitemporal violation.");
    }
    const ledger = recordGetOrThrow(params.speakerPriors, utt.speakerId, "speakerPriors");

    const text = utt.transcriptText.trim();
    if (!text) throw new DataGapError("transcriptText", "Empty transcript.");

    const hedgeHits = COACHSPEAK_PATTERNS.filter((r) => r.test(text)).length;
    const schemeHits = SCHEME_PATTERNS.filter((r) => r.test(text)).length;
    const posHits = POS_PATTERNS.filter((r) => r.test(text)).length;
    const negHits = NEG_PATTERNS.filter((r) => r.test(text)).length;

    const category: AudioClaimCategory =
      schemeHits > 0 && negHits === 0 ? "SCHEME_WORKLOAD_REVEAL" : "INJURY_AVAILABILITY";

    let polarity: StructuredClaimPolarity = "AMBIGUOUS_COACHSPEAK";
    let specificity = 0.15;
    if (hedgeHits > 0 && posHits === 0 && negHits === 0) {
      polarity = "AMBIGUOUS_COACHSPEAK";
    } else if (hedgeHits >= 2 && Math.abs(posHits - negHits) <= 1) {
      polarity = "AMBIGUOUS_COACHSPEAK";
      specificity = 0.20;
    } else if (negHits > posHits) {
      polarity = "NEGATIVE_OUT_OR_LIMIT";
      specificity = Math.max(0.20, Math.min(1.0, 0.55 + 0.20 * negHits - 0.15 * hedgeHits));
    } else if (posHits > negHits) {
      polarity = "POSITIVE_ACTIVE_OR_BOOST";
      specificity = Math.max(0.20, Math.min(1.0, 0.55 + 0.20 * posHits + 0.12 * schemeHits - 0.20 * hedgeHits));
    }

    const a = category === "INJURY_AVAILABILITY" ? ledger.injuryAlpha : ledger.schemeAlpha;
    const b = category === "INJURY_AVAILABILITY" ? ledger.injuryBeta : ledger.schemeBeta;
    const thetaMean = a / (a + b);
    const thetaVar = (a * b) / ((a + b) ** 2 * (a + b + 1.0));

    const cmaMuted =
      utt.sidelinePodiumCmaDeceptionScore !== undefined && utt.sidelinePodiumCmaDeceptionScore >= 0.65;

    if (cmaMuted || polarity === "AMBIGUOUS_COACHSPEAK") {
      anyMuted = true;
      signedShifts.push(0.0);
    } else {
      const effAcc = Math.min(0.92, Math.max(0.50, 0.50 + Math.max(0.0, thetaMean - 0.50) * specificity));
      const lrMag = effAcc / (1.0 - effAcc);
      const dir = polarity === "POSITIVE_ACTIVE_OR_BOOST" ? 1.0 : -1.0;
      const precDisc = 1.0 / (1.0 + 8.0 * thetaVar);
      signedShifts.push(dir * dgConf * precDisc * Math.log(lrMag));
    }
  }

  if (matched === 0) throw new DataGapError("subjectPlayerId", "No matching utterances.");

  let posMax = 0.0;
  let negMin = 0.0;
  for (const s of signedShifts) {
    if (s > posMax) posMax = s;
    if (s < negMin) negMin = s;
  }
  const conflictOnRecord = posMax > 0.12 && Math.abs(negMin) > 0.12 && posMax - negMin >= conflictThresh;
  if (conflictOnRecord) {
    return {
      subjectPlayerId: params.subjectPlayerId,
      priorProb: round6(p0),
      posteriorProb: round6(p0),
      appliedLogOddsDelta: 0.0,
      conflictOnRecord: true,
      governanceAction: "HOLD_SURVEILLANCE_CONFLICT",
    };
  }

  const totalShift = clampLogOddsDelta(signedShifts.reduce((a, b) => a + b, 0.0), MAX_LOG_ODDS_DELTA);
  const pPost = expit(baseLogit + totalShift);
  return {
    subjectPlayerId: params.subjectPlayerId,
    priorProb: round6(p0),
    posteriorProb: round6(pPost),
    appliedLogOddsDelta: round6(totalShift),
    conflictOnRecord: false,
    governanceAction: Math.abs(totalShift) < 1e-6 && anyMuted ? "COACHSPEAK_MUTED" : "UPDATED_ACTIVE",
  };
}
