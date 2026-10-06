/**
 * Improving Probabilistic Forecasts of Extreme Wind Speeds by Training Statistical Post-Processing Models with Weighted Scoring Rules
 *
 * arXiv:2407.15900 · lane:weather · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multiplicative weather discount factors for game projections: wind penalizes passing efficiency
 * (0.8% per mph, floored), extreme cold below 32F and heat above 90F penalize overall efficiency, and
 * precipitation scales at 5% per inch - combined as a product so each channel stays interpretable.
 *
 * Improvement (wiring record): Train GSE's weather post-processing models with tail-weighted twCRPS plus pooled EMOS-style
 * combination, but set the weight threshold at value-weighted points (totals near key numbers, regions
 * of historically largest GSE edge) rather than climatological quantiles, so the tail focus lands
 * where the money is.
 *
 * ACCEPTANCE GATE: ADOPT the twCRPS + pooling pipeline if the 90th-percentile twCRPS skill gain is ≥1% with body
 * degradation ≤0.5% on the 2024–2025 test; REJECT pure-twCRPS training (no pooling) if body CRPS
 * degrades >1%.
 *
 * Ingest role: weather adjustment factors (wind, temperature, precipitation).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2407.15900" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the twCRPS + pooling pipeline if the 90th-percentile twCRPS skill gain is ≥1% with body degradation ≤0.5% on the 2024–2025 test; REJECT pure-twCRPS training (no pooling) if body CRPS degrades >1%.`;

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
