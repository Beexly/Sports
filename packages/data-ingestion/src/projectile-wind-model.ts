/**
 * Projectile motion in a medium with quadratic drag at constant horizontal wind
 *
 * arXiv:2206.02397 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Implement the closed-form wind-drag formulas (paper's eq. 10) in weather/wind_adjust.py: per
 * kick, inputs = launch speed/angle (charting archetypes), football drag k = 1/V_term^2 (calibrate
 * V_term ~28-30 m/s), stadium wind vector decomposed along kick direction; compute wind-perturbed
 * vs no-wind range -> expected-distance delta in yards as a feature in the FG-make logistic and
 * punt-distance models; runs in microseconds for live recomputation — then upgrade to a two-layer
 * wind model (free-stream above bowl + per-stadium in-bowl shielding factor fit from punt
 * residuals), turning each stadium into a proprietary wind-transfer-function asset.
 *
 * ACCEPTANCE GATE: ADOPT iff the wind-adjusted model reduces RMSE by >= 1.5 yards vs the punter-mean baseline on
 * the windy-game holdout AND the fitted V_term lands in a physically sane range (20-40 m/s).
 *
 * Ingest role: feature builder (projectile motion with quadratic drag at constant horizontal wind).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.02397" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT iff the wind-adjusted model reduces RMSE by >= 1.5 yards vs the punter-mean baseline on
 * the windy-game holdout AND the fitted V_term lands in a physically sane range (20-40 m/s).`;

export const CONFIG = {
  enabled: false,
  model: "quadratic drag + constant horizontal wind",
  calibrate: "punt hang-time/distance at ~0 wind",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface WindShot {
  readonly v0ms: number;
  readonly angleDeg: number;
  readonly windMs: number;
  readonly rho: number;
  readonly dragK: number;
}

/** Trajectory with quadratic drag relative to the moving air mass. */
export function trajectoryWind(
  shot: WindShot,
  massKg = 0.42,
  dt = 0.002,
): { rangeM: number; hangS: number; apexM: number } | null {
  const { v0ms, angleDeg, windMs, rho, dragK } = shot;
  if (![v0ms, angleDeg, windMs, rho, dragK, massKg, dt].every(isFiniteNumber)) return null;
  if (v0ms <= 0 || angleDeg <= 0 || angleDeg >= 90 || rho <= 0 || dragK < 0 || massKg <= 0 || dt <= 0) return null;
  const a = (angleDeg * Math.PI) / 180;
  let x = 0;
  let y = 1;
  let apex = 1;
  let vx = v0ms * Math.cos(a);
  let vy = v0ms * Math.sin(a);
  let t = 0;
  const areaRef = 0.03;
  while (y > 0 && t < 30) {
    const vrx = vx - windMs;
    const vr = Math.hypot(vrx, vy);
    const drag = 0.5 * rho * vr * vr * dragK * areaRef;
    const ax = vr > 0 ? (-drag * vrx) / (vr * massKg) : 0;
    const ay = -9.80665 + (vr > 0 ? (-drag * vy) / (vr * massKg) : 0);
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    if (y > apex) apex = y;
    t += dt;
  }
  return { rangeM: x, hangS: t, apexM: apex };
}

/** Wind delta: range with wind minus range at zero wind. */
export function windRangeDelta(shot: WindShot): number | null {
  const withWind = trajectoryWind(shot);
  const calm = trajectoryWind({ ...shot, windMs: 0 });
  if (!withWind || !calm) return null;
  return withWind.rangeM - calm.rangeM;
}

/** Tailwind helps, headwind hurts (directional gate). */
export function windEffectSign(windMs: number): "tailwind" | "headwind" | "calm" | null {
  if (!isFiniteNumber(windMs)) return null;
  if (Math.abs(windMs) < 0.5) return "calm";
  return windMs > 0 ? "tailwind" : "headwind";
}
