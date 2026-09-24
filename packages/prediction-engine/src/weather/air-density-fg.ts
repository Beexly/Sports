/**
 * Air-density effective-distance adjustment for the NFL FG kicking model.
 *
 * From the humidor-aerodynamics paper's drag-decomposition framework: air
 * density ρ drives drag acceleration on the ball, so the same kick travels
 * farther in thin air (Denver ρ implies ~15% less drag acceleration).
 * This module computes ρ from stadium altitude + game-time temperature and
 * pressure, then scales effective kick distance relative to a sea-level
 * reference — plus a before/after-vs-league venue-effect estimator for any
 * venue change (surface, roof, altitude move).
 *
 * @see arXiv:0712.0380 — "Influence of a Humidor on the Aerodynamics of Baseballs"
 *
 * ACCEPTANCE GATE: ADOPT the altitude feature iff the ρ-adjusted model improves
 * log-loss by ≥ 0.002 on the 2024–2025 holdout AND the Denver coefficient is
 * directionally correct (distance premium). The gate is a backtest concern;
 * this module is the pure physics kernel, not wired into any live path.
 */

const R_DRY_AIR = 287.05; // J/(kg·K), specific gas constant for dry air
const RHO_SEA_LEVEL = 1.225; // kg/m³ at 15 °C, 1013.25 hPa

/** Convert °F to Kelvin. */
export function fahrenheitToKelvin(tempF: number): number {
  return ((tempF - 32) * 5) / 9 + 273.15;
}

/**
 * Air density (kg/m³) from stadium altitude, game-time temperature and
 * station pressure. Pressure defaults to a standard barometric lapse model
 * when the game-time reading is unavailable.
 */
export function airDensityKgM3(
  altitudeFeet: number,
  tempF: number,
  pressureInHg?: number,
): number {
  const altitudeM = altitudeFeet * 0.3048;
  const pInHg =
    pressureInHg ?? 29.92 * Math.exp(-altitudeM / 8434.5); // barometric formula
  const pressurePa = pInHg * 3386.39;
  const tempK = fahrenheitToKelvin(tempF);
  if (!(tempK > 0) || !(pressurePa > 0)) {
    throw new Error("airDensityKgM3: non-physical temperature/pressure");
  }
  return pressurePa / (R_DRY_AIR * tempK);
}

/**
 * Effective-distance scale factor: how far a kick travels relative to the
 * sea-level reference. Drag acceleration ∝ ρ, so thinner air stretches range.
 * Denver (ρ ≈ 1.05) yields ≈ 1.08–1.15 depending on the drag exponent.
 */
export function kickDistanceScale(
  rho: number,
  dragExponent = 1,
  rhoRef = RHO_SEA_LEVEL,
): number {
  if (!(rho > 0)) throw new Error("kickDistanceScale: rho must be positive");
  return Math.pow(rhoRef / rho, dragExponent);
}

/**
 * Effective (air-adjusted) kick distance in yards: nominal distance divided
 * by the density scale, i.e. the sea-level-equivalent difficulty of the kick.
 */
export function effectiveKickDistance(
  nominalYards: number,
  altitudeFeet: number,
  tempF: number,
  pressureInHg?: number,
): number {
  const rho = airDensityKgM3(altitudeFeet, tempF, pressureInHg);
  return nominalYards / kickDistanceScale(rho);
}

/**
 * Venue-effect estimator: difference-in-differences of a make-rate metric
 * (e.g. FG make% from 50+) before vs after a venue change, net of the
 * league-wide change over the same window.
 */
export function venueEffectEstimate(
  venueBefore: number,
  venueAfter: number,
  leagueBefore: number,
  leagueAfter: number,
): number {
  return venueAfter - venueBefore - (leagueAfter - leagueBefore);
}

/** Reference sea-level density, exported for tests/docs. */
export const SEA_LEVEL_RHO = RHO_SEA_LEVEL;
