/**
 * Spatial Modeling of Heavy Precipitation by Coupling Weather Station Recordings and Ensemble Forecasts with Max-Stable Processes
 *
 * arXiv:2003.05854v1 · lane:weather · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multiplicative weather discount factors for game projections: wind penalizes passing efficiency
 * (0.8% per mph, floored), extreme cold below 32F and heat above 90F penalize overall efficiency, and
 * precipitation scales at 5% per inch - combined as a product so each channel stays interpretable.
 *
 * Improvement (wiring record): Adapt the data-driven max-stable recipe to NFL stadium networks: ensemble forecast fields over
 * stadium locations as spectral functions, fit pairwise extremal coefficients of game-day wind/gust
 * maxima, and simulate joint extreme-weather scenarios across all stadiums in a slate week to feed
 * correlated tail weather into Monte Carlo totals/projection simulations; adopt the bootstrap-band
 * diagnostic (2.5-97.5% bands on implied extremal coefficients) as the acceptance test for any
 * spatial-extremes model.
 *
 * ACCEPTANCE GATE: ADAPT: one-parameter models beating a five-parameter classical process on out-of-fit triplewise
 * dependence is a strong, portable result -- spatial tail-dependence modeling is a genuine gap in
 * GSE's weather lane.
 *
 * Ingest role: weather adjustment factors (wind, temperature, precipitation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2003.05854v1" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT: one-parameter models beating a five-parameter classical process on out-of-fit triplewise dependence is a strong, portable result -- spatial tail-dependence modeling is a genuine gap in GSE's weather lane.`;

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
