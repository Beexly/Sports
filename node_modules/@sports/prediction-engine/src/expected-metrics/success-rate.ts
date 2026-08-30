/**
 * Success rate — a deterministic, closed-form play-quality metric (no fit).
 *
 * A play is "successful" on the standard down-conditioned yardage rule: gain at
 * least 40% of yards-to-go on 1st down, 60% on 2nd, 100% on 3rd or 4th. A
 * touchdown is a forced success; a turnover is a forced failure and DOMINATES a
 * touchdown flag (a defensive-score turnover — the offense lost the ball — is an
 * offensive failure). Plays with an unratable down (kickoff, two-point try, etc.)
 * OR a non-finite `yardsGained`/`ydstogo` return null and are dropped from every
 * count — never silently scored as a failure.
 *
 * This is a definitional metric: there is no model, no correlation gate, only
 * determinism. It deliberately does not reuse `fitLogistic`/`fitRidge`/
 * `rollupByPlayer` — those aggregate (actual, expected) pairs, whereas this counts
 * a boolean over ratable plays; genuinely a different metric. There is no
 * "over expected" here (an expected-success surface is out of scope for v1).
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One scrimmage play, mapped from an nflverse play-by-play row. */
export interface SuccessPlay {
  /** `game_id`+"-"+`play_id` — join/audit key, not a feature. */
  readonly playId: string;
  /** `posteam`. */
  readonly teamId: string;
  /** `rusher_player_id` ?? `receiver_player_id`, or "" when neither applies. */
  readonly playerId: string;
  /** `down`. */
  readonly down: number;
  /** `ydstogo`. */
  readonly ydstogo: number;
  /** `yards_gained`. */
  readonly yardsGained: number;
  /** `touchdown` → forced success. */
  readonly touchdown: 0 | 1;
  /** `interception` | `fumble_lost` → forced failure (dominates a touchdown). */
  readonly turnover: 0 | 1;
}

export const SUCCESS_RATE_MODEL_VERSION = "gse-success-v1";

/** Fraction of yards-to-go that counts as success, keyed by down. */
export const SUCCESS_YARDAGE_FRACTION: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 0.4,
  2: 0.6,
  3: 1.0,
  4: 1.0,
} as const;

const SUCCESS_FEATURE_KEYS = ["down", "ydstogo", "yardsGained", "touchdown", "turnover"] as const;

/**
 * Success = scored a TD (forced) OR (not a turnover AND yardsGained ≥
 * fraction(down)·ydstogo). Turnover dominates a TD (a pick-six is a turnover →
 * offensive failure).
 *
 * Returns null (UNRATABLE → callers drop it from every count) when the play is not
 * well-formed: down ∉ {1,2,3,4}, OR `yardsGained`/`ydstogo` is non-finite. A NaN
 * `yardsGained`/`ydstogo` must NOT be scored as a failure — the `>=` comparison is
 * false for NaN, which would silently count the play as a FAILED attempt and depress
 * team/player/down success rates. Excluding it from BOTH numerator and denominator
 * is the honest treatment. TD-forced-success / turnover-forced-failure semantics
 * apply only to well-formed rows. The down is range-guarded BEFORE indexing the
 * finite-key fraction table, so the lookup is always a real `number`.
 */
export function isSuccessfulPlay(play: SuccessPlay): boolean | null {
  if (!Number.isInteger(play.down) || play.down < 1 || play.down > 4) return null;
  if (!Number.isFinite(play.yardsGained) || !Number.isFinite(play.ydstogo)) return null; // unratable, not a failure
  if (play.turnover === 1) return false; // dominates
  if (play.touchdown === 1) return true;
  const frac = SUCCESS_YARDAGE_FRACTION[play.down as 1 | 2 | 3 | 4];
  return play.yardsGained >= frac * play.ydstogo;
}

/** One success-rate split for a grouping key. */
export interface SuccessRateSplit {
  /** Team id / player id / "down:3" / "situation:early_short", etc. */
  readonly key: string;
  /** Ratable plays in the group. */
  readonly plays: number;
  /** Successful plays in the group. */
  readonly successes: number;
  /** successes / plays, rounded to 4 decimals. */
  readonly successRate: number;
  readonly provenance: ExpectedMetricProvenance;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: SUCCESS_RATE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...SUCCESS_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(SUCCESS_FEATURE_KEYS),
    sampleSize,
  };
}

/** Distance band for the situation split. */
function distanceBand(ydstogo: number): "short" | "medium" | "long" {
  if (ydstogo <= 3) return "short";
  if (ydstogo <= 7) return "medium";
  return "long";
}

/** Situation bucket: early (1st/2nd) vs late (3rd/4th) down × distance band. */
function situationKey(play: SuccessPlay): string {
  const phase = play.down <= 2 ? "early" : "late";
  return `situation:${phase}_${distanceBand(play.ydstogo)}`;
}

/**
 * Group ratable plays by `keyOf`, drop groups below `minPlays`, and compute the
 * success rate for each. Plays where `isSuccessfulPlay` returns null are skipped
 * entirely (they count toward neither the numerator nor the denominator, and never
 * hit the fraction table). Output is sorted by success rate descending, key
 * ascending — deterministic, mirroring `rollupByPlayer`.
 */
function successRateBy(
  plays: readonly SuccessPlay[],
  keyOf: (play: SuccessPlay) => string,
  minPlays: number,
): SuccessRateSplit[] {
  const groups = new Map<string, { plays: number; successes: number }>();
  let ratableTotal = 0;
  for (const play of plays) {
    const success = isSuccessfulPlay(play);
    if (success === null) continue;
    const key = keyOf(play);
    if (!key) continue;
    ratableTotal += 1;
    const g = groups.get(key) ?? { plays: 0, successes: 0 };
    g.plays += 1;
    g.successes += success ? 1 : 0;
    groups.set(key, g);
  }

  const provenance = buildProvenance(ratableTotal);
  const rows: SuccessRateSplit[] = [];
  for (const [key, g] of groups) {
    if (g.plays < minPlays) continue;
    rows.push({
      key,
      plays: g.plays,
      successes: g.successes,
      successRate: round(g.successes / g.plays, 4),
      provenance,
    });
  }
  rows.sort((a, b) => b.successRate - a.successRate || (a.key < b.key ? -1 : 1));
  return rows;
}

/** Success rate per possession team (`posteam`). */
export function successRateByTeam(plays: readonly SuccessPlay[], minPlays = 1): SuccessRateSplit[] {
  return successRateBy(plays, (p) => p.teamId, minPlays);
}

/** Success rate per ball-carrier / receiver (`playerId`). */
export function successRateByPlayer(plays: readonly SuccessPlay[], minPlays = 20): SuccessRateSplit[] {
  return successRateBy(plays, (p) => p.playerId, minPlays);
}

/** Success rate per down. */
export function successRateByDown(plays: readonly SuccessPlay[], minPlays = 1): SuccessRateSplit[] {
  return successRateBy(plays, (p) => `down:${p.down}`, minPlays);
}

/** Success rate per early/late × distance-band situation bucket. */
export function successRateBySituation(plays: readonly SuccessPlay[], minPlays = 1): SuccessRateSplit[] {
  return successRateBy(plays, situationKey, minPlays);
}
