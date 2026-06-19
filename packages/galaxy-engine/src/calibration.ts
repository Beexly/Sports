/**
 * THE CALIBRATION ENGINE (bible §4.1) — "calibration as power".
 *
 * Sports IQ levels through real graded outcomes scored for CALIBRATION, not just
 * accuracy. Every Signal Check is a prediction + a stated confidence; the engine
 * (settlement) decides correctness; this module scores *how well-calibrated* the
 * stated confidence was, via the Brier score, and converts that into XP/Credits.
 *
 * Brier score for one binary forecast: B = (p - y)^2, where
 *   p = stated confidence as a probability in [0,1]
 *   y = realized outcome (1 = correct, 0 = wrong)
 * Lower is better. A perfectly confident, correct call → 0. A perfectly
 * confident, WRONG call → 1 (the worst — overconfidence is punished). A humble,
 * correctly-doubting call (low confidence on a loss) earns calibration credit:
 * the player *knew they were unsure*. This is exactly "knowing how right you are".
 */

import {
  SIGNAL_CHECK_BASE_XP,
  SIGNAL_CHECK_FLOOR_XP,
  SIGNAL_CHECK_PUSH_XP,
  SHARP_CALL_BONUS_XP,
  SIGNAL_CHECK_BASE_CREDITS,
  SIGNAL_CHECK_FLOOR_CREDITS,
  CONVICTION_CONFIDENCE,
} from "./constants.js";

export type BinaryOutcome = 0 | 1;

/** Clamp a 0–100 confidence to a probability in [0.01, 0.99] (never absolute). */
export function confidenceToProbability(confidence0to100: number): number {
  const p = confidence0to100 / 100;
  if (!Number.isFinite(p)) return 0.5;
  // No certainty allowed — the Language Law forbids "guaranteed"/"lock"; the math
  // mirrors that ethos by refusing 0 or 1.
  return Math.max(0.01, Math.min(0.99, p));
}

/** Brier score for a single forecast. Range [0,1]; lower is better. */
export function brierScore(confidence0to100: number, outcome: BinaryOutcome): number {
  const p = confidenceToProbability(confidence0to100);
  const diff = p - outcome;
  return Math.round(diff * diff * 10000) / 10000;
}

/**
 * Calibration quality in [0,1], where 1 = perfectly calibrated for this forecast.
 * Defined as 1 - Brier, so it scales XP/Credits directly. (For a single forecast
 * "calibration" and "skill" co-mingle; over many forecasts the Brier decomposition
 * separates them — that's the public Calibration Report, not this per-attempt score.)
 */
export function calibrationQuality(confidence0to100: number, outcome: BinaryOutcome): number {
  return Math.round((1 - brierScore(confidence0to100, outcome)) * 10000) / 10000;
}

export interface CalibrationReward {
  /** "WIN" | "LOSS" map to a binary outcome; "PUSH" carries no calibration signal. */
  readonly settledOutcome: "WIN" | "LOSS" | "PUSH";
  readonly brier: number | null;
  /** 0–100 presentation of calibration quality (null for PUSH). */
  readonly calibrationScore: number | null;
  readonly xp: number;
  readonly credits: number;
  /** Whether this counted as a sharp call (correct + conviction). */
  readonly sharpCall: boolean;
  /** Plain-language, glass-box explanation of the grade (bible §4.3 transparency). */
  readonly explanation: string;
}

/**
 * Convert a settled Signal Check into XP/Credits, rewarding calibration.
 *
 * @param settledOutcome  WIN | LOSS | PUSH from the grading engine.
 * @param confidence0to100 the user's stated confidence at lock time.
 * @param multiplier optional surface multiplier (e.g. Blacktop vs War Room).
 */
export function rewardForSignalCheck(
  settledOutcome: "WIN" | "LOSS" | "PUSH",
  confidence0to100: number,
  multiplier = 1,
): CalibrationReward {
  if (settledOutcome === "PUSH") {
    return {
      settledOutcome,
      brier: null,
      calibrationScore: null,
      xp: Math.round(SIGNAL_CHECK_PUSH_XP * multiplier),
      credits: Math.round(SIGNAL_CHECK_FLOOR_CREDITS * multiplier),
      sharpCall: false,
      explanation:
        "Push — no win/loss signal to grade calibration against. Flat reps reward.",
    };
  }

  const outcome: BinaryOutcome = settledOutcome === "WIN" ? 1 : 0;
  const brier = brierScore(confidence0to100, outcome);
  const quality = 1 - brier; // [0,1]
  const calibrationScore = Math.round(quality * 100);

  // XP scales with calibration quality, with a participation floor.
  let xp = Math.round(
    (SIGNAL_CHECK_FLOOR_XP + (SIGNAL_CHECK_BASE_XP - SIGNAL_CHECK_FLOOR_XP) * quality) *
      multiplier,
  );

  // Sharp call: correct AND made with genuine conviction.
  const sharpCall = outcome === 1 && confidence0to100 >= CONVICTION_CONFIDENCE;
  if (sharpCall) xp += Math.round(SHARP_CALL_BONUS_XP * multiplier);

  const credits = Math.round(
    (SIGNAL_CHECK_FLOOR_CREDITS +
      (SIGNAL_CHECK_BASE_CREDITS - SIGNAL_CHECK_FLOOR_CREDITS) * quality) *
      multiplier,
  );

  const explanation = buildExplanation(settledOutcome, confidence0to100, brier, sharpCall);

  return {
    settledOutcome,
    brier,
    calibrationScore,
    xp,
    credits,
    sharpCall,
    explanation,
  };
}

function buildExplanation(
  outcome: "WIN" | "LOSS",
  confidence: number,
  brier: number,
  sharpCall: boolean,
): string {
  const conf = Math.round(confidence);
  if (outcome === "WIN") {
    if (sharpCall) {
      return `Correct at ${conf}% conviction — a sharp call. Low Brier (${brier}) means your confidence matched the result. Full calibration reward.`;
    }
    return `Correct, but you only committed ${conf}%. Right read, under-rated conviction (Brier ${brier}). Trust your signal more next time.`;
  }
  // LOSS
  if (confidence >= CONVICTION_CONFIDENCE) {
    return `Missed at ${conf}% conviction — overconfidence is the most expensive error (Brier ${brier}). Calibration reward is small. This is the Public Trap's lesson.`;
  }
  return `Missed, but you flagged the uncertainty at ${conf}% (Brier ${brier}). You knew it was a lean — calibration credit for honesty.`;
}
