/**
 * Combining Distribution-Based Neural Networks to Predict Weather Forecast Probabilities
 *
 * arXiv:2103.14430 · lane:weather · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multiplicative weather discount factors for game projections: wind penalizes passing efficiency
 * (0.8% per mph, floored), extreme cold below 32F and heat above 90F penalize overall efficiency, and
 * precipitation scales at 5% per inch - combined as a product so each channel stays interpretable.
 *
 * Improvement (wiring record): For game totals (and optionally margins), add a binned-softmax distribution head to an existing
 * tabular/NN model: e.g., 60 bins over total in [20, 80]; train with cross-entropy or CRPS-on-CDF loss
 * on 2015-2024 games; train 2-4 small variants on different feature subsets (market-implied features
 * vs pure stats) and combine with a shallow stacking network (2x36 ReLU + softmax) trained on a later
 * season slice, minimizing CRPS; derive win/spread/total probabilities by integration; improvement:
 * bin-adaptive resolution -- quantile-spaced bins concentrated where betting value lives (near key
 * numbers 41/44/47/51 for totals, 3/7/10 for spreads).
 *
 * ACCEPTANCE GATE: ADOPT the distribution-head pattern if it beats the Gaussian baseline on 2024 CRPS with no
 * degradation in calibration (PIT histogram uniformity); REJECT if the binning produces worse CRPS
 * than the simple Gaussian or if the stacking layer overfits the single stack-training season (check
 * 2022-as-stack-train sensitivity).
 *
 * Ingest role: weather adjustment factors (wind, temperature, precipitation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2103.14430" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the distribution-head pattern if it beats the Gaussian baseline on 2024 CRPS with no degradation in calibration (PIT histogram uniformity); REJECT if the binning produces worse CRPS than the simple Gaussian or if the stacking layer overfits the single stack-training season (check 2022-as-stack-train sensitivity).`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "multiplicative weather discount factors",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Passing-efficiency factor vs wind: 0.8% per mph, floored at 0.5. */
export function windPassingFactor(windMph: number): number | null {
  if (!isFiniteNumber(windMph) || windMph < 0) return null;
  return Math.max(0.5, 1 - windMph * 0.008);
}

/** Temperature factor: penalties below 32F (cold) and above 90F (heat). */
export function tempFactor(tempF: number): number | null {
  if (!isFiniteNumber(tempF)) return null;
  const cold = Math.max(0, 32 - tempF) * 0.002;
  const heat = Math.max(0, tempF - 90) * 0.002;
  return Math.max(0.5, 1 - cold - heat);
}

/** Precipitation factor: 5% per inch, capped at 2 inches, floored at 0.5. */
export function precipFactor(inches: number): number | null {
  if (!isFiniteNumber(inches) || inches < 0) return null;
  return Math.max(0.5, 1 - Math.min(inches, 2) * 0.05);
}

export interface WeatherInputs {
  windMph: number;
  tempF: number;
  precipInches: number;
}

/** Combined multiplicative weather factor across the three channels. */
export function combinedWeatherFactor(w: WeatherInputs): number | null {
  if (typeof w !== "object" || w === null) return null;
  const wf = windPassingFactor(w.windMph);
  const tf = tempFactor(w.tempF);
  const pf = precipFactor(w.precipInches);
  if (wf === null || tf === null || pf === null) return null;
  return wf * tf * pf;
}
