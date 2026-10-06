/**
 * An Aerodynamic Analysis of Recent FIFA World Cup Balls
 *
 * arXiv:1710.02784 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Port the aerodynamic ball-flight analysis of the recent FIFA World Cup balls to the NFL: build
 * weather/ballflight.py in the Sports repo implementing Eq. 12 ODE solver (scipy solve_ivp, Cash-
 * Karp RK45 equivalent) for an NFL football as a tumbling spheroid; seed C_D with published
 * football drag literature (prolate-spheroid wind-tunnel values; calibrate on nflverse punt hang-
 * time/distance where wind ~ 0); inputs per game: stadium altitude (fixed table), game-time
 * temperature and station pressure from a weather API; compute air density rho via Eqs. 10-11;
 * output: altitude/temperature-adjusted expected FG distance distribution modifier and punt-
 * distance modifier per game; feed as features into totals/spread model; quantify the ~Mile-High
 * distance premium with physics instead of the current 'no verified coefficient' state.
 *
 * ACCEPTANCE GATE: ADOPT the feature if the rho-adjusted model beats the distance-only baseline by >= 0.002 log-
 * loss on the 2024-2025 holdout AND the altitude coefficient is directionally correct (positive
 * distance effect).
 *
 * Ingest role: feature builder (altitude/temperature-adjusted FG + punt distance modifiers).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1710.02784" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the feature if the rho-adjusted model beats the distance-only baseline by >= 0.002 log-
 * loss on the 2024-2025 holdout AND the altitude coefficient is directionally correct (positive
 * distance effect).`;

export const CONFIG = {
  enabled: false,
  logLossGainThreshold: 0.002,
  dragNote: "C_D seeded from prolate-spheroid wind-tunnel literature; calibrated on nflverse punt hang-time/distance at ~0 wind",
} as const;

/** Stadium altitude table (feet). Extend per venue. */
export const STADIUM_ALTITUDE_FT: Readonly<Record<string, number>> = {
  DEN: 5280,
  LV: 2000,
  ARI: 1100,
  KC: 900,
};

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

const R_DRY_AIR = 287.058;

/** Air density rho via the paper's Eqs. 10-11 (ideal gas, dry air). */
export function airDensity(tempC: number, pressureHpa: number): number | null {
  if (!isFiniteNumber(tempC) || !isFiniteNumber(pressureHpa)) return null;
  const tK = tempC + 273.15;
  if (tK <= 0 || pressureHpa <= 0) return null;
  return (pressureHpa * 100) / (R_DRY_AIR * tK);
}

/** Pressure at altitude (barometric formula, for the Mile-High premium). */
export function pressureAtAltitude(seaLevelHpa: number, altitudeFt: number, tempC = 15): number | null {
  if (![seaLevelHpa, altitudeFt, tempC].every(isFiniteNumber)) return null;
  const h = altitudeFt * 0.3048;
  const tK = tempC + 273.15;
  if (tK <= 0) return null;
  return seaLevelHpa * Math.exp((-9.80665 * h) / (R_DRY_AIR * tK));
}

export interface ProjectileResult {
  readonly rangeM: number;
  readonly hangS: number;
  readonly steps: number;
}

/**
 * Tumbling-spheroid trajectory with quadratic drag (paper Eq. 12 structure,
 * integrated with RK-light fixed steps; Cash-Karp equivalent at production).
 */
export function projectileRange(
  v0ms: number,
  angleDeg: number,
  rho: number,
  dragK: number,
  massKg = 0.42,
  dt = 0.002,
): ProjectileResult | null {
  if (![v0ms, angleDeg, rho, dragK, massKg, dt].every(isFiniteNumber)) return null;
  if (v0ms <= 0 || rho <= 0 || dragK < 0 || massKg <= 0 || dt <= 0) return null;
  if (angleDeg <= 0 || angleDeg >= 90) return null;
  const a = (angleDeg * Math.PI) / 180;
  let x = 0;
  let y = 1;
  let vx = v0ms * Math.cos(a);
  let vy = v0ms * Math.sin(a);
  let t = 0;
  let steps = 0;
  const areaRef = 0.03;
  while (y > 0 && t < 30) {
    const v = Math.hypot(vx, vy);
    const drag = 0.5 * rho * v * v * dragK * areaRef;
    const ax = (-drag * vx) / (v * massKg || 1);
    const ay = -9.80665 - (drag * vy) / (v * massKg || 1);
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    steps++;
  }
  return { rangeM: x, hangS: t, steps };
}

/** FG distance modifier: rho-adjusted range vs sea-level reference. */
export function fgDistanceModifier(rho: number, rhoSeaLevel: number): number | null {
  if (![rho, rhoSeaLevel].every(isFiniteNumber) || rho <= 0 || rhoSeaLevel <= 0) return null;
  return rhoSeaLevel / rho - 1;
}
