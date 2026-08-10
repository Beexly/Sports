/**
 * Sliding-window Online Beta OGD — non-stationary tracking (shadow).
 *
 * Re-runs OGD on the last `window` chronological samples so recent regimes
 * dominate θ. Compares full-series vs window metrics for ops diagnostics.
 *
 * Does NOT flip CALIBRATION_ADJUSTMENTS or live eligibility.
 */

import type { CalibrationSample } from "./probability-calibration.js";
import {
  runOnlineBetaRecalibration,
  type OnlineBetaOptions,
  type OnlineBetaReport,
} from "./online-beta-recalibration.js";

export type SlidingWindowBetaOptions = OnlineBetaOptions & {
  /** Trailing sample count (default 120). */
  readonly window?: number;
};

export type SlidingWindowOgdMetrics = {
  readonly window: number;
  readonly nFull: number;
  readonly nWindow: number;
  readonly full: {
    readonly a: number;
    readonly b: number;
    readonly meanBrierOnline: number;
    readonly meanBrierRaw: number;
    readonly varCalP: number;
    readonly varRawP: number;
    readonly beatsRawBrier: boolean;
  };
  readonly sliding: {
    readonly a: number;
    readonly b: number;
    readonly meanBrierOnline: number;
    readonly meanBrierRaw: number;
    readonly varCalP: number;
    readonly varRawP: number;
    readonly beatsRawBrier: boolean;
  };
  /** a_window − a_full — positive ⇒ recent regime wants more expansion. */
  readonly deltaA: number;
  /** varCal window − varCal full. */
  readonly deltaVarCal: number;
  /** meanBrierOnline window − full (negative is better on recent regime). */
  readonly deltaBrierOnline: number;
  readonly expansionPreferred: "full" | "window" | "neither";
  readonly operatorHint: string;
  readonly priced: false;
  readonly status: "shadow";
};

function orderSamples(
  samples: readonly (CalibrationSample & {
    readonly sampleId?: string;
    readonly t?: string | number;
  })[],
) {
  return [...samples].sort((x, y) => {
    const tx = x.t ?? x.sampleId ?? 0;
    const ty = y.t ?? y.sampleId ?? 0;
    if (typeof tx === "number" && typeof ty === "number") return tx - ty;
    return String(tx).localeCompare(String(ty));
  });
}

/**
 * Re-fit Online Beta OGD on the trailing window only.
 */
export function runOnlineBetaSlidingWindow(
  samples: readonly (CalibrationSample & {
    readonly sampleId?: string;
    readonly t?: string | number;
  })[],
  options: SlidingWindowBetaOptions = {},
): OnlineBetaReport {
  const window = options.window ?? 120;
  const ordered = orderSamples(samples);
  const tail = ordered.slice(Math.max(0, ordered.length - window));
  const rep = runOnlineBetaRecalibration(tail, options);
  return {
    ...rep,
    note:
      `Sliding-window Online Beta OGD (window=${window}, n=${rep.n}). ` +
      "Tracks non-stationary regimes; shadow only; live eligibility map-free.",
  };
}

/**
 * Full vs sliding-window OGD metrics for bake-off / ops analysis.
 */
export function analyzeSlidingWindowOgd(
  samples: readonly (CalibrationSample & {
    readonly sampleId?: string;
    readonly t?: string | number;
  })[],
  options: SlidingWindowBetaOptions = {},
): SlidingWindowOgdMetrics {
  const window = options.window ?? 120;
  const ordered = orderSamples(samples);
  const fullRep = runOnlineBetaRecalibration(ordered, options);
  const slidingRep = runOnlineBetaSlidingWindow(ordered, { ...options, window });

  const deltaA = slidingRep.finalParams.a - fullRep.finalParams.a;
  const deltaVarCal = slidingRep.varCalP - fullRep.varCalP;
  const deltaBrierOnline = slidingRep.meanBrierOnline - fullRep.meanBrierOnline;

  let expansionPreferred: SlidingWindowOgdMetrics["expansionPreferred"] = "neither";
  if (
    slidingRep.beatsRawBrier &&
    slidingRep.varCalP > fullRep.varCalP + 1e-6 &&
    slidingRep.meanBrierOnline <= fullRep.meanBrierOnline + 1e-4
  ) {
    expansionPreferred = "window";
  } else if (
    fullRep.beatsRawBrier &&
    fullRep.varCalP > slidingRep.varCalP + 1e-6
  ) {
    expansionPreferred = "full";
  }

  const operatorHint =
    expansionPreferred === "window"
      ? `Recent window (n=${slidingRep.n}) wants stronger expansion (a=${slidingRep.finalParams.a.toFixed(3)} vs full ${fullRep.finalParams.a.toFixed(3)}). Shadow only — do not apply.`
      : expansionPreferred === "full"
        ? `Full-series OGD more stable (a=${fullRep.finalParams.a.toFixed(3)}). Window is noisier or weaker. Shadow only.`
        : `Neither full nor window OGD clearly beats raw Brier with real Var[P] lift. Raise independent RES first. Shadow only.`;

  return {
    window,
    nFull: fullRep.n,
    nWindow: slidingRep.n,
    full: {
      a: fullRep.finalParams.a,
      b: fullRep.finalParams.b,
      meanBrierOnline: fullRep.meanBrierOnline,
      meanBrierRaw: fullRep.meanBrierRaw,
      varCalP: fullRep.varCalP,
      varRawP: fullRep.varRawP,
      beatsRawBrier: fullRep.beatsRawBrier,
    },
    sliding: {
      a: slidingRep.finalParams.a,
      b: slidingRep.finalParams.b,
      meanBrierOnline: slidingRep.meanBrierOnline,
      meanBrierRaw: slidingRep.meanBrierRaw,
      varCalP: slidingRep.varCalP,
      varRawP: slidingRep.varRawP,
      beatsRawBrier: slidingRep.beatsRawBrier,
    },
    deltaA,
    deltaVarCal,
    deltaBrierOnline,
    expansionPreferred,
    operatorHint,
    priced: false,
    status: "shadow",
  };
}
