/**
 * Galaxy Dynasty — economy & progression constants.
 *
 * Single source of truth for reward sizing, XP curve, and skill levels. Tuned so
 * the core loop (bible §7) feels good: a first session yields visible progress on
 * every axis without inflation.
 *
 * The Credit Constitution (§4.2) is enforced in `credit-constitution.ts`; these
 * are only the EARN-side magnitudes.
 */

/** Sports IQ skills span 1–99 like a classic RPG skill (bible §3/§4.1). */
export const SKILL_MIN_LEVEL = 1;
export const SKILL_MAX_LEVEL = 99;

/** Character level ceiling for the slice. */
export const CHARACTER_MIN_LEVEL = 1;
export const CHARACTER_MAX_LEVEL = 50;

/** Credits granted once when a profile finishes onboarding. */
export const ONBOARDING_CREDIT_GRANT = 250;

/**
 * Base XP for a graded Signal Check before the calibration multiplier. The
 * calibration multiplier (0..1, from the Brier score) scales this so that
 * *knowing how sure you are* is what pays — not just being right. See
 * `calibration.ts`.
 */
export const SIGNAL_CHECK_BASE_XP = 100;

/** Floor XP for participating in a graded check, even on a poorly-calibrated miss. */
export const SIGNAL_CHECK_FLOOR_XP = 10;

/** XP for a PUSH — no calibration signal, so a flat, modest amount. */
export const SIGNAL_CHECK_PUSH_XP = 25;

/** Extra XP when a call is correct AND was made with genuine conviction. */
export const SHARP_CALL_BONUS_XP = 40;

/** Base Credits for a graded Signal Check, scaled by calibration like XP. */
export const SIGNAL_CHECK_BASE_CREDITS = 40;
export const SIGNAL_CHECK_FLOOR_CREDITS = 5;

/** Reward for clearing a PvM boss (e.g. The Public Trap). */
export const BOSS_CLEAR_CREDITS = 150;
export const BOSS_CLEAR_XP = 200;

/** Reward for winning an async Signal Duel. */
export const DUEL_WIN_CREDITS = 80;
export const DUEL_WIN_XP = 120;

/** Daily streak reward (flat; streak insurance handled separately — no dark patterns). */
export const DAILY_STREAK_CREDITS = 30;
export const DAILY_STREAK_XP = 50;

/** Blacktop mini-game reward, scaled by calibration. */
export const BLACKTOP_BASE_CREDITS = 25;
export const BLACKTOP_BASE_XP = 60;

/** Quest completion rewards (used when a quest has no explicit reward set). */
export const QUEST_DEFAULT_CREDITS = 60;
export const QUEST_DEFAULT_XP = 90;

/**
 * XP required to advance a Sports IQ skill from level L to L+1.
 * A gentle quadratic so early levels feel quick (engagement) and high levels are
 * earned proof (bible §4.1 "unbuyable, unfakeable"). Level 1→2 = 100 XP.
 */
export function skillXpToNextLevel(level: number): number {
  const l = Math.max(SKILL_MIN_LEVEL, Math.floor(level));
  return Math.round(100 + (l - 1) * (l - 1) * 8);
}

/** XP required to advance the overall character from level L to L+1. */
export function characterXpToNextLevel(level: number): number {
  const l = Math.max(CHARACTER_MIN_LEVEL, Math.floor(level));
  return Math.round(300 + (l - 1) * 120);
}

/**
 * Confidence at or above this is treated as "conviction" for the sharp-call
 * bonus and for boss/duel process scoring. Deliberately not framed as certainty.
 */
export const CONVICTION_CONFIDENCE = 70;

/** Below this confidence a prediction reads as "lean / uncertain". */
export const LEAN_CONFIDENCE = 55;
