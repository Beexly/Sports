/**
 * Expected Completion Probability → our own CPOE (completion % over expected).
 *
 * NGS publishes a `completion_percentage_above_expectation` per passer, computed
 * from its private tracking-based expected-completion model. We do NOT re-serve
 * that number. Instead we fit OUR OWN expected-completion model on public
 * play-by-play features — pass depth (air yards, and its curvature), pressure
 * (QB hit), throw location, and down/distance/field position — and define
 *
 *     GSE-CPOE(passer) = 100 × mean(complete − P̂(complete))
 *
 * over the passer's qualifying dropbacks. The model is fit at load time on the
 * real season of dropbacks (fit-on-load), so the served metric is always our
 * computation on current public data, never hardcoded and never NGS's figure.
 * We then PROVE the metric by correlating GSE-CPOE against NGS CPOE as ground
 * truth (see validation.ts) — same player, same season, same qualifier.
 *
 * Honest limitation: NGS's expected-completion model also sees receiver
 * separation and defender proximity (tracking data we do not have), so our
 * per-play probabilities differ. The claim we can defend is reproduction of the
 * per-passer RANKING/level, measured by correlation — not identity of the model.
 */

import { fitLogistic, predictLogistic, type LogisticModel } from "./logistic.js";
import { rollupByPlayer, type PlayerPlayOutcome } from "./rollup.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance, type PlayerExpectedMetric } from "./types.js";

/** One dropback pass attempt, mapped from an nflverse play-by-play row. */
export interface DropbackPlay {
  /** Passer gsis id (`passer_player_id`). */
  readonly passerId: string;
  /** Outcome: 1 if the pass was completed (`complete_pass`), else 0. */
  readonly complete: 0 | 1;
  /** Intended air yards (`air_yards`); negative for throws behind the line. */
  readonly airYards: number;
  /** Field position, yards to opponent goal (`yardline_100`), 1–99. */
  readonly yardline100: number;
  /** Down (`down`), 1–4. */
  readonly down: number;
  /** Yards to go (`ydstogo`). */
  readonly ydstogo: number;
  /** Shotgun snap (`shotgun`), 0/1. */
  readonly shotgun: 0 | 1;
  /** No-huddle (`no_huddle`), 0/1. */
  readonly noHuddle: 0 | 1;
  /** QB was hit on the play (`qb_hit`), 0/1 — our public pressure proxy. */
  readonly qbHit: 0 | 1;
  /** Throw location (`pass_location`): left/middle/right, or null if uncharted. */
  readonly passLocation: "left" | "middle" | "right" | null;
}

/** Canonical, ordered feature contract for the expected-completion model. */
export const EXPECTED_COMPLETION_FEATURE_KEYS = [
  "airYards",
  "airYardsSquared",
  "qbHit",
  "isMiddle",
  "isLeft",
  "down",
  "ydstogo",
  "yardline100",
  "shotgun",
  "noHuddle",
] as const;

export const EXPECTED_COMPLETION_MODEL_VERSION = "gse-xcomp-v1";

/** Minimum dropbacks required to fit — below this the coefficients are noise. */
export const MIN_DROPBACKS_TO_FIT = 200;

/** Default per-passer attempt qualifier for the rollup (matches NGS passing grain). */
export const DEFAULT_MIN_PASSER_ATTEMPTS = 100;

export interface ExpectedCompletionModel {
  readonly logistic: LogisticModel;
  readonly provenance: ExpectedMetricProvenance;
}

function featureRow(play: DropbackPlay): number[] {
  const ay = play.airYards;
  return [
    ay,
    ay * ay,
    play.qbHit,
    play.passLocation === "middle" ? 1 : 0,
    play.passLocation === "left" ? 1 : 0,
    play.down,
    play.ydstogo,
    play.yardline100,
    play.shotgun,
    play.noHuddle,
  ];
}

/**
 * A play qualifies for fitting/scoring when it has a passer id, a binary
 * completion label, and finite continuous features.
 *
 * Note: the 0/1 flag features (`qbHit`, `shotgun`, `noHuddle`) are assumed to be
 * already conforming to {0, 1} from the upstream nflverse mapping and are NOT
 * finite-guarded here — only the continuous fields are. A non-finite flag on a
 * qualifying play would therefore pass this filter and, via `featureRow`,
 * propagate NaN into the fit. That never happens on clean 0/1 flag data; guard
 * the flags at the mapping boundary if a source can emit non-conforming flags.
 */
function isUsable(play: DropbackPlay): boolean {
  return (
    play.passerId.length > 0 &&
    (play.complete === 0 || play.complete === 1) &&
    Number.isFinite(play.airYards) &&
    Number.isFinite(play.yardline100) &&
    Number.isFinite(play.down) &&
    Number.isFinite(play.ydstogo)
  );
}

/**
 * Fit the expected-completion model on a season of dropbacks. Returns null when
 * fewer than `MIN_DROPBACKS_TO_FIT` usable plays are present or the labels are
 * degenerate — we never serve a metric from an unfit model.
 */
export function fitExpectedCompletionModel(
  plays: readonly DropbackPlay[],
  options: { readonly minSample?: number } = {},
): ExpectedCompletionModel | null {
  const minSample = options.minSample ?? MIN_DROPBACKS_TO_FIT;
  const usable = plays.filter(isUsable);
  if (usable.length < minSample) return null;

  const rows = usable.map(featureRow);
  const labels = usable.map((p) => p.complete);
  const logistic = fitLogistic(rows, labels);
  if (logistic === null) return null;

  return {
    logistic,
    provenance: {
      modelVersion: EXPECTED_COMPLETION_MODEL_VERSION,
      method: "logistic-regression",
      featureKeys: [...EXPECTED_COMPLETION_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(EXPECTED_COMPLETION_FEATURE_KEYS),
      sampleSize: logistic.sampleSize,
    },
  };
}

/** Predict P(complete) for one dropback under a fitted model. */
export function predictCompletionProbability(model: ExpectedCompletionModel, play: DropbackPlay): number {
  return predictLogistic(model.logistic, featureRow(play));
}

/**
 * Compute GSE-CPOE per passer. `overExpected` is CPOE in completion-percentage
 * points; `overExpectedTotal` is completions above expectation (a counting stat).
 * Only passers with at least `minAttempts` qualifying dropbacks are returned.
 */
export function computeCpoe(
  plays: readonly DropbackPlay[],
  model: ExpectedCompletionModel,
  options: { readonly minAttempts?: number } = {},
): PlayerExpectedMetric[] {
  const minAttempts = options.minAttempts ?? DEFAULT_MIN_PASSER_ATTEMPTS;
  const outcomes: PlayerPlayOutcome[] = [];
  for (const play of plays) {
    if (!isUsable(play)) continue;
    outcomes.push({
      playerId: play.passerId,
      actual: play.complete,
      expected: predictCompletionProbability(model, play),
    });
  }
  return rollupByPlayer(outcomes, { minPlays: minAttempts, reportScale: 100, decimals: 3 });
}
