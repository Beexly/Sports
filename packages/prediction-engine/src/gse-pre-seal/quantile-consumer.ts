/**
 * Quantile adjustment table consumer (pre-seal only).
 *
 * The table is a SEALED CONFIG DELTA. Applying it never changes tau and never
 * changes the coach mindset hash — it only shifts the projected total by the
 * published coefficients. Any injury component must route through
 * injury_realloc, not through this module.
 *
 * Coefficients (given, not invented):
 *   intercept    -2.25
 *   roof         -0.39   (per roofed venue)
 *   wind/10mph   +0.33   (per 10 mph of wind)
 *   precip       +0.05   (per inch)
 *   division     +0.64   (divisional game)
 *   tauLow/High   0.1 / 0.9  band quantiles
 */

import type { QuantileTable } from "./types.js";

export const SEALED_QUANTILE_TABLE: QuantileTable = {
  intercept: -2.25,
  roof: -0.39,
  windPer10Mph: 0.33,
  precip: 0.05,
  division: 0.64,
  tauLow: 0.1,
  tauHigh: 0.9,
};

export interface QuantileInputs {
  /** Model's base projected total, before any table adjustment. */
  baseTotal: number;
  /** Venue has a roof. */
  roofed: boolean;
  /** Forecast wind at kickoff, mph. */
  windMph: number;
  /** Forecast precipitation, inches. */
  precipIn: number;
  /** Divisional matchup. */
  divisional: boolean;
}

export interface QuantileResult {
  baseTotal: number;
  adjustedTotal: number;
  delta: number;
  /** Applied coefficients, so the adjustment is auditable. */
  applied: {
    intercept: number;
    roof: number;
    wind: number;
    precip: number;
    division: number;
  };
  /** tau band quantiles, carried through unchanged. */
  band: { tauLow: number; tauHigh: number };
}

/**
 * Apply the sealed quantile table to a base total.
 *
 * Pure function: no I/O, no seal() call, no tau mutation. The caller writes the
 * result into the candidate baseline.
 */
export function applyQuantileTable(
  inputs: QuantileInputs,
  table: QuantileTable = SEALED_QUANTILE_TABLE,
): QuantileResult {
  const roof = inputs.roofed ? table.roof : 0;
  const wind = (inputs.windMph / 10) * table.windPer10Mph;
  const precip = inputs.precipIn * table.precip;
  const division = inputs.divisional ? table.division : 0;

  const delta = table.intercept + roof + wind + precip + division;
  const adjustedTotal = inputs.baseTotal + delta;

  return {
    baseTotal: Number(inputs.baseTotal.toFixed(4)),
    adjustedTotal: Number(adjustedTotal.toFixed(4)),
    delta: Number(delta.toFixed(4)),
    applied: {
      intercept: table.intercept,
      roof: Number(roof.toFixed(4)),
      wind: Number(wind.toFixed(4)),
      precip: Number(precip.toFixed(4)),
      division: Number(division.toFixed(4)),
    },
    band: { tauLow: table.tauLow, tauHigh: table.tauHigh },
  };
}
