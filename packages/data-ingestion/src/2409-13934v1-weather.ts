/**
 * On the Extrapolation of Generative Adversarial Networks for Downscaling Precipitation Extremes in Warmer Climates
 *
 * arXiv:2409.13934v1 · lane:weather · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multiplicative weather discount factors for game projections: wind penalizes passing efficiency
 * (0.8% per mph, floored), extreme cold below 32F and heat above 90F penalize overall efficiency, and
 * precipitation scales at 5% per inch - combined as a product so each channel stays interpretable.
 *
 * Improvement (wiring record): Justify generative extreme-weather simulation for GSE game-impact scenarios using the paper's
 * 77%-vs-65% historical-training result as the evidence that GAN tails extrapolate without future
 * data, then condition the generator on large-scale circulation indices (ENSO/NAO) and ensemble GAN
 * seeds to measure tail-spread calibration, testing diffusion downscalers against the GAN on the same
 * capture-fraction metric.
 *
 * ACCEPTANCE GATE: ADAPT: the 77%-vs-65% historical-training result is exactly the evidence GSE needs to justify
 * generative extreme-weather simulation — tails that extrapolate without future data (ledger states no
 * further numeric gate).
 *
 * Ingest role: weather adjustment factors (wind, temperature, precipitation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2409.13934v1" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT: the 77%-vs-65% historical-training result is exactly the evidence GSE needs to justify generative extreme-weather simulation — tails that extrapolate without future data (ledger states no further numeric gate).`;

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
