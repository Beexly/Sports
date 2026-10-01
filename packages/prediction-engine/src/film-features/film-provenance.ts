/**
 * Film provenance + calibration-state labeling for the CV-to-engine bridge.
 *
 * HARD RULES (Garrett):
 *   - Every film-derived feature carries provenance and is labeled
 *     UNCALIBRATED until the calibrate step of the loop runs.
 *   - weight is typed as the literal 0. The type system — not convention —
 *     enforces that no film signal influences a published output until
 *     validation explicitly widens this type.
 *   - Public surface shows projections and rankings ONLY. Film internals,
 *     metric names, and methodology never leak to public routes.
 *
 * Engine order: research → wire → weight → calibrate → test → polish.
 * This module is the WIRE step. Weight/calibrate/test/polish are later
 * streams and must not be attempted here.
 *
 * Original implementation for GSE.
 */

/** Calibration state of any film-derived value. */
export type CalibrationState = "UNCALIBRATED" | "SHADOW" | "CALIBRATED";

/**
 * Provenance stamped on every film feature vector and every shadow row.
 * source is always the literal 'film' so downstream code can never
 * mistake a film prior for a box-score stat.
 */
export interface FilmProvenance {
  readonly source: "film";
  /** Plays that contributed to this feature. */
  readonly plays: number;
  /** Aggregate perception confidence, 0..1 (mean of play confidences). */
  readonly confidence: number;
  /**
   * Engine weight of this signal. Literal 0 until the validate step.
   * Widen only via an explicit, reviewed calibration commit.
   */
  readonly weight: 0;
  readonly calibration: "UNCALIBRATED";
  /** ISO-8601 timestamp of feature computation. */
  readonly computedAt: string;
}

/** Stamp provenance on a feature bundle. n=0 yields confidence 0. */
export function filmProvenance(
  plays: number,
  confidence: number,
): FilmProvenance {
  return {
    source: "film",
    plays: Math.max(0, Math.floor(plays)),
    confidence: Math.max(0, Math.min(1, confidence)),
    weight: 0,
    calibration: "UNCALIBRATED",
    computedAt: new Date().toISOString(),
  };
}

/** Type-level assertion: a value is safe to publish only when calibrated. */
export function assertPublishable(
  calibration: CalibrationState,
): asserts calibration is "CALIBRATED" {
  if (calibration !== "CALIBRATED") {
    throw new Error(
      `film feature is ${calibration}: not publishable until calibrated`,
    );
  }
}
