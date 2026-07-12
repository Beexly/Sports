/**
 * Win Probability (WP) → our own WPA, from first principles on public play-by-play.
 *
 * nflverse ships `wp`/`wpa` columns from ITS win-probability model. We do NOT
 * re-serve those numbers. Instead we fit OUR OWN single binary logistic of
 * P(possession team ultimately wins | score margin, time, field position,
 * down/distance, timeouts, market spread), and define
 *
 *     WP(state) = σ(β · features)      (already in the open interval (0, 1))
 *     WPA       = WP(after) − WP(before)   (possession-frame corrected)
 *
 * Fit-on-load on the real season; the served metric is always our computation on
 * current public data. We PROVE it by correlating our per-play WP against nflverse
 * `wp` as REFEREE only (validation.ts) — same season, same season type, same
 * `game_id`+`play_id` join, at play grain.
 *
 * SIGN-CONVENTION HAZARD: EP is a signed point expectation, so a possession flip
 * NEGATES it (−EP). WP is a probability in [0, 1], so the opponent's win
 * probability is the COMPLEMENT (1 − WP). These are different operations; treating
 * a WP flip as a negation is the classic win-probability bug. See
 * `winProbabilityAdded` below.
 */

import { fitLogistic, predictLogistic, type LogisticModel } from "./logistic.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One play state, mapped from an nflverse play-by-play row. */
export interface WpPlay {
  /** `game_id`+"-"+`play_id` — join/audit key, not a feature. */
  readonly playId: string;
  /** `score_differential` (posteam − defteam), possession frame. */
  readonly scoreDifferential: number;
  /** `game_seconds_remaining`. */
  readonly gameSecondsRemaining: number;
  /** `yardline_100`, possession frame. */
  readonly yardline100: number;
  /** `down`. */
  readonly down: number;
  /** `ydstogo`. */
  readonly ydstogo: number;
  /** `posteam_timeouts_remaining`. */
  readonly posteamTimeouts: number;
  /** `defteam_timeouts_remaining`. */
  readonly defteamTimeouts: number;
  /** `spread_line`, possession frame; null → 0 (missing treated as pick'em, v1). */
  readonly spreadLine: number | null;
  /** Fit label: 1 if the possession team ultimately won, else 0. */
  readonly posteamWon: 0 | 1;
}

/** Canonical, ordered feature contract for the win-probability model. */
export const WIN_PROBABILITY_FEATURE_KEYS = [
  "scoreDifferential",
  "gameSecondsRemaining",
  "scoreDiffPerSqrtTime",
  "yardline100",
  "down",
  "ydstogo",
  "timeoutDifferential",
  "spreadLine",
] as const;

export const WIN_PROBABILITY_MODEL_VERSION = "gse-wp-v1";

/** Minimum usable plays required to fit — below this the coefficients are noise. */
export const MIN_WP_PLAYS_TO_FIT = 1000;

export interface WinProbabilityModel {
  readonly logistic: LogisticModel;
  readonly provenance: ExpectedMetricProvenance;
}

/**
 * Documented NEUTRAL defaults for a non-finite feature at PREDICT time. WP has no
 * output clamp (it is "always a sigmoid"), so a single NaN feature would make
 * WP = σ(NaN) = NaN and break the exported "WP always in (0, 1)" contract. The fit
 * path drops non-finite rows via `isUsable`, but predict-time rows (e.g. an
 * end/non-play row where `game_seconds_remaining` is NaN) are NOT filtered — so we
 * coerce every feature to a finite, football-neutral value before it reaches the
 * scaler. These are NOT served as truth; they only keep a degraded row on-surface.
 */
const WP_NEUTRAL_SCORE_DIFFERENTIAL = 0; // tied game
const WP_NEUTRAL_GAME_SECONDS = 1800; // mid-game (half of a 3600s regulation game)
const WP_NEUTRAL_YARDLINE_100 = 50; // midfield
const WP_NEUTRAL_DOWN = 1; // first down
const WP_NEUTRAL_YDSTOGO = 10; // standard first-and-10

function coerceFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function featureRow(play: WpPlay): number[] {
  // Coerce EVERY feature to a finite value BEFORE it enters the scaler. `applyScaler`
  // uses `?? 0`, which does NOT catch NaN (NaN is not null/undefined), so an unguarded
  // non-finite feature would poison the logit and yield WP = σ(NaN) = NaN. On the fit
  // path these coercions are no-ops (`isUsable` already dropped non-finite rows); they
  // only matter at predict time, so the fitted surface is unchanged.
  const scoreDifferential = coerceFinite(play.scoreDifferential, WP_NEUTRAL_SCORE_DIFFERENTIAL);
  const gameSecondsRemaining = coerceFinite(play.gameSecondsRemaining, WP_NEUTRAL_GAME_SECONDS);
  const yardline100 = coerceFinite(play.yardline100, WP_NEUTRAL_YARDLINE_100);
  const down = coerceFinite(play.down, WP_NEUTRAL_DOWN);
  const ydstogo = coerceFinite(play.ydstogo, WP_NEUTRAL_YDSTOGO);
  const t = Math.max(gameSecondsRemaining, 0);
  const diffPerSqrtTime = scoreDifferential / Math.sqrt(t + 1); // +1 avoids /0 at t=0
  const timeoutDiff = play.posteamTimeouts - play.defteamTimeouts;
  const safeTimeoutDiff = Number.isFinite(timeoutDiff) ? timeoutDiff : 0;
  const spread = play.spreadLine !== null && Number.isFinite(play.spreadLine) ? play.spreadLine : 0;
  return [
    scoreDifferential,
    gameSecondsRemaining,
    diffPerSqrtTime,
    yardline100,
    down,
    ydstogo,
    safeTimeoutDiff,
    spread,
  ];
}

/** A play qualifies when the continuous features are finite and the label binary. */
function isUsable(play: WpPlay): boolean {
  return (
    Number.isFinite(play.scoreDifferential) &&
    Number.isFinite(play.gameSecondsRemaining) &&
    Number.isFinite(play.yardline100) &&
    Number.isFinite(play.down) &&
    Number.isFinite(play.ydstogo) &&
    // Timeouts and spread also feed featureRow; a non-finite one would NaN-poison
    // the fitted surface. null spread is the documented pick'em sentinel (→ 0).
    Number.isFinite(play.posteamTimeouts) &&
    Number.isFinite(play.defteamTimeouts) &&
    (play.spreadLine === null || Number.isFinite(play.spreadLine)) &&
    (play.posteamWon === 0 || play.posteamWon === 1)
  );
}

/**
 * Fit the win-probability model on a season of plays. Returns null when fewer than
 * `minSample` usable plays are present or the labels are degenerate — we never
 * serve a metric from an unfit model.
 */
export function fitWinProbabilityModel(
  plays: readonly WpPlay[],
  options: { readonly minSample?: number } = {},
): WinProbabilityModel | null {
  const minSample = options.minSample ?? MIN_WP_PLAYS_TO_FIT;
  const usable = plays.filter(isUsable);
  if (usable.length < minSample) return null;

  const rows = usable.map(featureRow);
  const labels = usable.map((p) => p.posteamWon);
  const logistic = fitLogistic(rows, labels);
  if (logistic === null) return null;

  return {
    logistic,
    provenance: {
      modelVersion: WIN_PROBABILITY_MODEL_VERSION,
      method: "logistic-regression",
      featureKeys: [...WIN_PROBABILITY_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(WIN_PROBABILITY_FEATURE_KEYS),
      sampleSize: usable.length,
    },
  };
}

/** Documented neutral win probability for a fully-degenerate/unusable situation. */
export const WP_NEUTRAL_PROBABILITY = 0.5;

/**
 * Win probability for the possession team in one state. GUARANTEED finite and in the
 * open interval (0, 1). `featureRow` coerces every feature to a finite neutral, so
 * `predictLogistic` sees a finite row and returns a sigmoid already in (0, 1); the
 * final guard is belt-and-suspenders — any residual non-finite/out-of-range value
 * (a fully-degenerate situation) collapses to the documented neutral 0.5 rather than
 * leaking NaN, honoring the exported "WP always in (0, 1)" contract for ALL inputs.
 */
export function predictWinProbability(model: WinProbabilityModel, play: WpPlay): number {
  const wp = predictLogistic(model.logistic, featureRow(play));
  if (!Number.isFinite(wp) || wp <= 0 || wp >= 1) return WP_NEUTRAL_PROBABILITY;
  return wp;
}

/**
 * WPA from the frame of the team that had the ball BEFORE the play.
 *
 * CALLER CONTRACT: `after` MUST be expressed from the AFTER-play possession team's
 * frame. When possession changes, WP(after) is the opponent's win probability, so
 * we take the COMPLEMENT `1 − WP(after)` to return to the before-team's frame — NOT
 * a negation. (Contrast expected-points.ts, where a possession flip negates EP.)
 */
export function winProbabilityAdded(
  model: WinProbabilityModel,
  before: WpPlay,
  after: WpPlay,
  possessionChanged: boolean,
): number {
  const wpBefore = predictWinProbability(model, before);
  const wpAfterOwn = predictWinProbability(model, after);
  const wpAfter = possessionChanged ? 1 - wpAfterOwn : wpAfterOwn; // complement, NOT negation
  return wpAfter - wpBefore;
}
