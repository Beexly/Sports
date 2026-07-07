/**
 * Shared contracts for the expected-metrics engine.
 *
 * This engine computes our OWN expected-value metrics from public play-by-play —
 * expected completion probability (→ our CPOE), expected rush yards (→ our RYOE),
 * and expected YAC (→ our YAC-over-expected) — rather than re-serving Next Gen
 * Stats' figures. Every fitted model carries provenance (model version, method,
 * feature schema hash, sample size) so a served number is always traceable to the
 * exact feature contract and data volume it was fit on, mirroring the honesty
 * discipline in ml-estimator.ts.
 */

/** How a model was fit and against what feature contract. Surfaced for audit. */
export interface ExpectedMetricProvenance {
  /** Stable version tag for the metric definition (bump when features change). */
  readonly modelVersion: string;
  /** The estimator family used. */
  readonly method: "logistic-regression" | "ridge-linear";
  /** Canonical ordered feature-key list the model was fit on. */
  readonly featureKeys: readonly string[];
  /** Deterministic hash of `featureKeys` — detects silent feature-contract drift. */
  readonly featureSchemaHash: string;
  /** Number of qualifying plays the fit consumed. */
  readonly sampleSize: number;
}

/**
 * A per-player rollup of actual vs expected for one metric. `overExpected` is the
 * headline number (per-play actual minus expected); `overExpectedTotal` is the
 * season-cumulative version for volume-aware views.
 */
export interface PlayerExpectedMetric {
  /** nflverse gsis player id — the join key to Next Gen Stats. */
  readonly playerId: string;
  /** Qualifying plays for this player. */
  readonly plays: number;
  /** Mean actual outcome across the player's qualifying plays. */
  readonly actualMean: number;
  /** Mean model-expected outcome across the same plays. */
  readonly expectedMean: number;
  /** actualMean − expectedMean. The player's over-expected rate. */
  readonly overExpected: number;
  /** Sum of (actual − expected) across the player's plays. */
  readonly overExpectedTotal: number;
}

/**
 * Deterministic, collision-resistant hash of an ordered feature-key list
 * (djb2). Baked into each model's provenance; a changed feature list changes the
 * hash, so a downstream consumer can detect that a served metric was produced by
 * a different feature contract than it expects. Not cryptographic — a drift
 * detector, matching computeFeatureSchemaHash in ml-estimator.ts.
 */
export function computeFeatureSchemaHash(keys: readonly string[]): string {
  const joined = keys.join("|");
  let h = 5381;
  for (let i = 0; i < joined.length; i++) {
    h = ((h << 5) + h) ^ (joined.charCodeAt(i) & 0xff);
    h = h | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
