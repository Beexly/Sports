/**
 * CNN-based Surface Temperature Forecasts with Ensemble Numerical Weather Prediction
 *
 * arXiv:2507.18937 · lane:weather · verdict:ADAPT · owner:Mimo · doctrine:SITUATIONAL
 *
 * Mechanism: Game-time weather features: ideal-gas air density from temperature and station pressure, linear wind total-points drag (zeroed for domes), and precipitation classification for totals/spread adjustments.
 *
 * Improvement (record):
 * GSE builds a CNN temperature downscaler: GEFS/HRRR channels trained against NOAA RTMA over NFL stadium neighborhoods, applied member-wise to all 31 ensemble members and combined with the conformal layer.
 *
 * ACCEPTANCE GATE:
 * ADOPT if the CNN beats the lapse-rate baseline by >=20% RMSE on 2023 stadium data AND the FI/NE check confirms maintained frequency of improvements; REJECT if gain <20% and rely on the LGBM temperature recipe.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: weather feature builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2507.18937" as const;
export const LANE = "weather" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if the CNN beats the lapse-rate baseline by >=20% RMSE on 2023 stadium data AND the FI/NE check confirms maintained frequency of improvements; REJECT if gain <20% and rely on the LGBM temperature recipe.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Precipitation classes for game impact. */
export type PrecipClass = "dry" | "damp" | "wet";

/** Game-time weather feature bundle. */
export interface GameWeatherFeature {
  rho: number | null;
  windAdjPts: number | null;
  precip: PrecipClass | null;
  dome: boolean;
}

/** Air density rho (kg/m^3) via the ideal gas law for dry air. */
export function airDensity(tempC: number, pressureHpa: number): number | null {
  if (!isFiniteNumber(tempC) || !isFiniteNumber(pressureHpa)) return null;
  const tK = tempC + 273.15;
  if (tK <= 0 || pressureHpa <= 0) return null;
  return (pressureHpa * 100) / (287.058 * tK);
}

/**
 * Expected total-points drag from wind (points suppressed). Linear rule of
 * thumb; pass windMph = 0 for domes (handled by gameWeatherFeature).
 */
export function windTotalAdjustment(windMph: number, crosswindFactor = 1): number | null {
  if (!isFiniteNumber(windMph) || windMph < 0) return null;
  if (!isFiniteNumber(crosswindFactor) || crosswindFactor < 0) return null;
  return -0.12 * windMph * crosswindFactor;
}

/** Classify precipitation depth into game-impact classes. */
export function precipitationClass(precipMm: number): PrecipClass | null {
  if (!isFiniteNumber(precipMm) || precipMm < 0) return null;
  if (precipMm === 0) return "dry";
  if (precipMm < 2.5) return "damp";
  return "wet";
}

/** Build the full game-time weather feature bundle (dome zeroes wind). */
export function gameWeatherFeature(
  tempC: number,
  pressureHpa: number,
  windMph: number,
  precipMm: number,
  dome: boolean,
): GameWeatherFeature {
  const wind = dome ? 0 : windMph;
  return {
    rho: airDensity(tempC, pressureHpa),
    windAdjPts: windTotalAdjustment(wind),
    precip: precipitationClass(precipMm),
    dome,
  };
}
