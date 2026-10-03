/**
 * Multi Scale Graph Wavenet for Wind Speed Forecasting
 *
 * arXiv:2109.15239v1 · lane:weather · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multiplicative weather discount factors for game projections: wind penalizes passing efficiency
 * (0.8% per mph, floored), extreme cold below 32F and heat above 90F penalize overall efficiency, and
 * precipitation scales at 5% per inch - combined as a product so each channel stays interpretable.
 *
 * Improvement (wiring record): Reimplement Multi-Scale Graph Wavenet with NFL stadiums (or nearby mesonet stations) as graph nodes:
 * initialize node embeddings from geographic/terrain features and let the adjacency learn; train on
 * hourly wind speed/gust histories; forecast 6/12/18/24-hour horizons scored against persistence and a
 * per-stadium AR baseline; feed the 24-hour-ahead stadium wind distributions into the totals model's
 * weather features, inspecting the learned adjacency for physically sensible structure (coastal vs
 * inland clusters) — then add exogenous NWP grid features as node inputs, learn a time-varying
 * adjacency (frontal passage vs calm regimes), and extend the target to gust maxima and wind direction
 * for kick-trajectory modeling.
 *
 * ACCEPTANCE GATE: ADAPT: a learnable-adjacency spatiotemporal forecaster with a documented 4-5% SOTA margin is exactly
 * the weather-forecasting asset GSE's totals lane is missing (acceptance = reproducing the margin on
 * the Danish five-city data AND on 10+ US stadium-adjacent stations before engine integration).
 *
 * Ingest role: weather adjustment factors (wind, temperature, precipitation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2109.15239v1" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT: a learnable-adjacency spatiotemporal forecaster with a documented 4-5% SOTA margin is exactly the weather-forecasting asset GSE's totals lane is missing (acceptance = reproducing the margin on the Danish five-city data AND on 10+ US stadium-adjacent stations before engine integration).`;

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
