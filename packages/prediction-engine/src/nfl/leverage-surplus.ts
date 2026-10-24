/**
 * Leverage surplus — separation a receiver gains BEYOND what his route and the
 * coverage normally produce.
 *
 * PARTIAL, measured 2026-10-23 on 45,032 targets: the residual is stable
 * (split-half r=0.589 over 94 receivers) but predicts catching at NOTHING once
 * raw separation is in the model — coefficient -0.0834, p=.228. Reading, not
 * ranking: high surplus marks HARDER ASSIGNMENTS (the extra separation is bought
 * with lower-percentage targets), so use it to explain a low catch rate rather
 * than to raise a projection.
 *
 * Shrinkage note that matters: the James-Stein weight collapsed to 0 because
 * between-receiver spread (SD ~0.02 yd) is a fifth of sampling error (~0.10 at
 * 500 routes). Use the RAW mean residual; a shrunk version is indistinguishable
 * from zero.
 */

/** Routes below this are too few for a usable residual. */
export const MIN_ROUTES_FOR_SURPLUS = 100;

export interface LeverageInput {
  /** Receiver's mean separation residual vs expectation, yards. */
  readonly meanResidual: number | null | undefined;
  readonly routes: number;
}

/**
 * Surplus for one receiver. Unshrunk by design; null when the sample is short so
 * callers can tell "not measured" from "zero".
 */
export function leverageSurplus(input: LeverageInput): number | null {
  const r = input.meanResidual;
  if (typeof r !== "number" || !Number.isFinite(r)) return null;
  if (!Number.isFinite(input.routes) || input.routes < MIN_ROUTES_FOR_SURPLUS) return null;
  return r;
}

export type LeverageBand = "difficulty_taker" | "neutral" | "clean_release";

/** Bands are descriptive only — never a probability input. */
export function leverageBand(surplus: number | null): LeverageBand | null {
  if (surplus === null) return null;
  if (surplus >= 0.05) return "difficulty_taker";
  if (surplus <= -0.05) return "clean_release";
  return "neutral";
}

/**
 * Sentence for the reasoning layer. Explains a low catch rate without implying
 * the player is playing badly.
 */
export function leverageNote(surplus: number | null): string | null {
  const band = leverageBand(surplus);
  if (band === null) return null;
  switch (band) {
    case "difficulty_taker":
      return "Wins separation on hard assignments; expect a lower catch rate than the separation implies.";
    case "clean_release":
      return "Scheme gives clean releases; separation flatters the catch rate.";
    case "neutral":
      return "Route difficulty in line with expectation.";
  }
}
