/**
 * Expected Points (EP) → our own EPA, from first principles on public play-by-play.
 *
 * nflverse ships `ep`/`epa` columns from ITS next-score model. We do NOT re-serve
 * those numbers. Instead we fit our OWN expected-points surface from public
 * situation columns (down, distance, field position, its curvature, goal-to-go,
 * time) as a set of one-vs-rest binary logistics over the next scoring event, then
 * define
 *
 *     EP(state) = Σ_k P(next-score = k) · value(k)
 *     EPA       = EP(after) − EP(before)     (possession-frame corrected)
 *
 * The model is fit at load time on the real season (fit-on-load), so the served
 * metric is always our computation on current public data — never hardcoded and
 * never nflverse's figure. We then PROVE the metric by correlating our per-play EP
 * against nflverse `ep` (and our EPA against `epa`) as REFEREE only (validation.ts)
 * — same season, same season type, same `game_id`+`play_id` join, non-terminal
 * plays only.
 *
 * Honest limitation: nflverse uses more history and heavier smoothing than a
 * six-feature situation model; our per-play EP differs. The claim we can defend is
 * reproduction of the situational EP surface, measured by correlation — not
 * identity of the model.
 */

import { fitLogistic, predictLogistic, type LogisticModel } from "./logistic.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One play state, mapped from an nflverse play-by-play row. */
export interface EpPlay {
  /** `game_id`+"-"+`play_id` — join/audit key, not a feature. */
  readonly playId: string;
  /** `down` 1–4. */
  readonly down: number;
  /** `ydstogo`. */
  readonly ydstogo: number;
  /** `yardline_100` 1–99, yards to THIS possession team's target end zone. */
  readonly yardline100: number;
  /** `half_seconds_remaining`; null → imputed to EP_DEFAULT_HALF_SECONDS. */
  readonly halfSecondsRemaining: number | null;
  /** `goal_to_go`, 0/1. */
  readonly goalToGo: 0 | 1;
  /** §next-score label; null = unlabelled (excluded from the fit). */
  readonly nextScore: NextScoreOutcome | null;
}

/** The seven mutually-exclusive next-score outcomes, from the possession frame. */
export type NextScoreOutcome =
  | "TD"
  | "FG"
  | "SAFETY"
  | "NONE"
  | "OPP_SAFETY"
  | "OPP_FG"
  | "OPP_TD";

/** FIXES the column order: index === class. */
export const EP_OUTCOMES = ["TD", "FG", "SAFETY", "NONE", "OPP_SAFETY", "OPP_FG", "OPP_TD"] as const;

/**
 * Point value per outcome from the possession team's frame (opponent scores are
 * negative). `TD = +7` is the task-mandated v1 simplification (touchdown modeled
 * inclusive of the expected PAT); a future `gse-ep-v2` may adopt the PAT-adjusted
 * ~6.95 value. `SAFETY = ±2` matches the standard nflfastR next-score convention.
 */
export const EP_OUTCOME_VALUES: Readonly<Record<NextScoreOutcome, number>> = {
  TD: 7,
  FG: 3,
  SAFETY: 2,
  NONE: 0,
  OPP_SAFETY: -2,
  OPP_FG: -3,
  OPP_TD: -7,
} as const;

/**
 * Common heads that MUST fit or the surface is not served. Rare safety heads may
 * be null (their raw probability is treated as 0 before renormalization), because
 * positives in a ~0.1% class are not guaranteed even at the fit floor.
 */
export const EP_REQUIRED_OUTCOMES = ["TD", "FG", "NONE", "OPP_FG", "OPP_TD"] as const;

/** Canonical, ordered feature contract for the expected-points model. */
export const EXPECTED_POINTS_FEATURE_KEYS = [
  "down",
  "ydstogo",
  "yardline100",
  "yardline100Squared",
  "goalToGo",
  "halfSecondsRemaining",
] as const;

export const EXPECTED_POINTS_MODEL_VERSION = "gse-ep-v1";

/** Minimum usable plays required to fit — below this the surface is noise. */
export const MIN_EP_PLAYS_TO_FIT = 1000;

/** Imputed value for a missing `half_seconds_remaining` (mid-half default). */
export const EP_DEFAULT_HALF_SECONDS = 900;

export interface ExpectedPointsModel {
  /**
   * Index-aligned with EP_OUTCOMES (length 7). A null entry = that class had no
   * positives at fit time (only permitted for SAFETY / OPP_SAFETY); it contributes
   * raw probability 0 before renormalization.
   */
  readonly perOutcome: readonly (LogisticModel | null)[];
  readonly provenance: ExpectedMetricProvenance;
}

function featureRow(play: EpPlay): number[] {
  const yl = play.yardline100;
  return [
    play.down,
    play.ydstogo,
    yl,
    yl * yl,
    play.goalToGo,
    play.halfSecondsRemaining ?? EP_DEFAULT_HALF_SECONDS,
  ];
}

/** A play qualifies for fitting when it is labelled and its features are finite. */
function isUsableForFit(play: EpPlay): boolean {
  return (
    play.nextScore !== null &&
    Number.isFinite(play.down) &&
    play.down >= 1 &&
    play.down <= 4 &&
    Number.isFinite(play.ydstogo) &&
    Number.isFinite(play.yardline100) &&
    (play.goalToGo === 0 || play.goalToGo === 1)
  );
}

/**
 * Fit the expected-points surface as one-vs-rest binary logistics over the seven
 * next-score outcomes. Returns null when fewer than `minSample` usable plays are
 * present, or when a REQUIRED head is degenerate. Rare safety heads that fail to
 * fit remain null and contribute raw probability 0 (graceful degradation) — EP is
 * still provably bounded because the retained outcomes' values are in [−7, 7].
 */
export function fitExpectedPointsModel(
  plays: readonly EpPlay[],
  options: { readonly minSample?: number } = {},
): ExpectedPointsModel | null {
  const minSample = options.minSample ?? MIN_EP_PLAYS_TO_FIT;
  const usable = plays.filter(isUsableForFit);
  if (usable.length < minSample) return null;

  const rows = usable.map(featureRow);
  const required = EP_REQUIRED_OUTCOMES as readonly NextScoreOutcome[];
  const perOutcome: (LogisticModel | null)[] = [];
  for (const outcome of EP_OUTCOMES) {
    const labels = usable.map((p) => (p.nextScore === outcome ? 1 : 0));
    const model = fitLogistic(rows, labels); // null on degenerate (all-0) class
    if (model === null && required.includes(outcome)) return null; // required head missing
    perOutcome.push(model); // rare head may remain null
  }

  return {
    perOutcome,
    provenance: {
      modelVersion: EXPECTED_POINTS_MODEL_VERSION,
      method: "multinomial-ovr-logistic",
      featureKeys: [...EXPECTED_POINTS_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(EXPECTED_POINTS_FEATURE_KEYS),
      sampleSize: usable.length,
    },
  };
}

/**
 * Renormalized next-score distribution for one play, index-aligned with
 * EP_OUTCOMES and summing to 1. Null heads contribute raw 0. A fully degenerate
 * row (all raw probabilities ≤ 0) falls back to the uniform distribution, which
 * yields EP = 0 (the honest "no information" answer).
 */
export function predictScoreDistribution(model: ExpectedPointsModel, play: EpPlay): number[] {
  const row = featureRow(play);
  const raw = model.perOutcome.map((m) => (m === null ? 0 : predictLogistic(m, row)));
  let sum = 0;
  for (const p of raw) sum += p;
  if (sum <= 0) return EP_OUTCOMES.map(() => 1 / EP_OUTCOMES.length);
  return raw.map((p) => p / sum);
}

/**
 * Expected points for one play state: Σ P(outcome) · value(outcome). Provably in
 * [−7, 7] — a convex combination of outcome values that themselves lie in [−7, 7].
 */
export function predictExpectedPoints(model: ExpectedPointsModel, play: EpPlay): number {
  const dist = predictScoreDistribution(model, play);
  let ep = 0;
  for (let k = 0; k < EP_OUTCOMES.length; k++) {
    ep += (dist[k] ?? 0) * EP_OUTCOME_VALUES[EP_OUTCOMES[k]!];
  }
  return ep;
}

/**
 * EPA from the frame of the team that had the ball BEFORE the play.
 *
 * CALLER CONTRACT: `after` MUST be expressed from the AFTER-play possession team's
 * frame (its `yardline100` to ITS target end zone). When possession changes,
 * EP(after) is in the opponent's frame, so we NEGATE it to return to the
 * before-team's frame. (Contrast win-probability.ts, where a possession flip is a
 * COMPLEMENT `1 − p`, not a negation — see the sign-convention hazard note there.)
 *
 * v1 covers non-terminal down-to-down transitions only; terminal scoring plays are
 * out of scope and are excluded from the validation join.
 */
export function expectedPointsAdded(
  model: ExpectedPointsModel,
  before: EpPlay,
  after: EpPlay,
  possessionChanged: boolean,
): number {
  const epBefore = predictExpectedPoints(model, before);
  const epAfterOwn = predictExpectedPoints(model, after);
  const epAfter = possessionChanged ? -epAfterOwn : epAfterOwn;
  return epAfter - epBefore;
}

/**
 * Per-play scoring context the loader maps from pbp rows. EXPORTED because it is a
 * parameter type of an exported function and `declaration: true` requires every
 * referenced type to be nameable.
 */
export interface RawScoringContext {
  /** 1 | 2 (+ OT bucket) — the half a scoring forward-scan is confined to. */
  readonly half: number;
  /** Possession team on this play. */
  readonly posteam: string;
  /** Team that scored ON this play, else null. */
  readonly scoringTeam: string | null;
  /** The scoring event type on this play, else null. */
  readonly scoreType: "TD" | "FG" | "SAFETY" | null;
}

/**
 * Given a single game's plays IN ORDER, stamp each play's next-score outcome by a
 * forward scan to the next scoring event WITHIN THE SAME HALF, mapped to that
 * play's possession frame (scoringTeam === posteam → TD/FG/SAFETY; else OPP_*).
 * Plays after the last scoring event in a half get "NONE" (a real outcome, value
 * 0 — NOT null). Pure and deterministic.
 */
export function deriveNextScore(orderedPlays: readonly RawScoringContext[]): NextScoreOutcome[] {
  const out: NextScoreOutcome[] = new Array(orderedPlays.length);
  for (let i = 0; i < orderedPlays.length; i++) {
    const cur = orderedPlays[i]!;
    let label: NextScoreOutcome = "NONE";
    for (let j = i; j < orderedPlays.length; j++) {
      const fwd = orderedPlays[j]!;
      if (fwd.half !== cur.half) break; // half boundary → NONE
      if (fwd.scoreType !== null && fwd.scoringTeam !== null) {
        const ownScore = fwd.scoringTeam === cur.posteam;
        label = ownScore
          ? fwd.scoreType
          : fwd.scoreType === "TD"
            ? "OPP_TD"
            : fwd.scoreType === "FG"
              ? "OPP_FG"
              : "OPP_SAFETY";
        break;
      }
    }
    out[i] = label;
  }
  return out;
}
