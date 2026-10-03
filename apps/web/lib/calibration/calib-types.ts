/**
 * Shared calibration R&D types. Apply path OFF until holdout floors + flag.
 * Eligibility stays frequentist on probabilities actually shown.
 */

/** One training pair for binary calibration (pushes excluded). */
export type CalibPair = {
  /** Raw p in (0,1) or logit — see scoreSpace on map. */
  readonly score: number;
  readonly outcome: 0 | 1;
  readonly weight?: number;
};

/** Sorted, pooled block after PAVA. */
export type PavaBlock = {
  readonly scoreMin: number;
  readonly scoreMax: number;
  /** Calibrated p in (0,1). */
  readonly mean: number;
  readonly n: number;
  readonly wins: number;
};

export type PavaMap = {
  readonly method: "isotonic_pava" | "isotonic_cir";
  readonly blocks: readonly PavaBlock[];
  readonly scoreSpace: "probability" | "logit";
  readonly nTrain: number;
  readonly dateRange: { readonly from: string; readonly to: string };
  readonly modelVersion: string;
};

export type PavaFitResult = {
  readonly map: PavaMap;
  /** Calibrated value aligned to each training row (debug). */
  readonly fitted: readonly number[];
};

export type PlattMap = {
  readonly method: "platt_map_irls";
  readonly A: number;
  readonly B: number;
  readonly scoreSpace: "logit";
  readonly prior: {
    readonly aMean: number;
    readonly aVar: number;
    readonly bMean: number;
    readonly bVar: number;
  };
  readonly nTrain: number;
  readonly dateRange: { readonly from: string; readonly to: string };
  readonly modelVersion: string;
};

export type TemperatureMap = {
  readonly method: "temperature";
  readonly T: number;
  readonly scoreSpace: "logit";
  readonly nTrain: number;
  readonly dateRange: { readonly from: string; readonly to: string };
  readonly modelVersion: string;
};

export type CalibPredictFn = (score: number) => number;

/** Optional internal-only uncertainty — not for public claims / ROI. */
export type BlockInterval = {
  readonly scoreMin: number;
  readonly scoreMax: number;
  readonly mean: number;
  readonly lower: number;
  readonly upper: number;
  readonly n: number;
};

export type BootstrapBand = {
  readonly scoreGrid: readonly number[];
  readonly lower: readonly number[];
  readonly upper: readonly number[];
  readonly nBootstrap: number;
  readonly note: string;
};
