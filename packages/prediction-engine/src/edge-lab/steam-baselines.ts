/**
 * Live-legal steam baselines. Not Hawkes, not RTS.
 *
 * Named dumb baseline: absolute implied-probability velocity |Δp|/Δt.
 * Forward Kalman (constant-velocity) then 1-D curvature of the FILTERED
 * path is the geometric alternative. The backward RTS pass is implemented
 * only as a leakage probe: it uses t+1…T to "smooth" time t, which is
 * illegal for live execution.
 *
 * Opus holds STEAM-CURVATURE (B-spline + RTS). This module is the
 * comparison object that curvature has to beat, and the live-legal twin
 * that does not look ahead.
 *
 * Kill (pre-registered, synthetic): if forward-curvature's next-move-sign
 * accuracy is not greater than abs-delta's on clustered steam paths, keep
 * the dummy. Thin live archives do not get a third intensity model.
 *
 * SHADOW. priced false.
 */

export type SteamTick = {
  readonly time: number;
  readonly impliedProb: number;
};

export type SteamBaselineName = "abs-delta" | "forward-curvature";

export function absDeltaVelocity(ticks: readonly SteamTick[]): number[] {
  if (ticks.length === 0) return [];
  const out = [0];
  for (let i = 1; i < ticks.length; i += 1) {
    const dt = ticks[i]!.time - ticks[i - 1]!.time;
    if (!(dt > 0) || !Number.isFinite(dt)) {
      out.push(0);
      continue;
    }
    out.push(Math.abs(ticks[i]!.impliedProb - ticks[i - 1]!.impliedProb) / dt);
  }
  return out;
}

export type KalmanState = {
  readonly p: number;
  readonly v: number;
};

/**
 * Forward constant-velocity Kalman on a 1-D implied-prob series.
 * State [p, v], F=[[1,dt],[0,1]], H=[1,0]. No future observations.
 */
export function forwardKalmanFilter(
  ticks: readonly SteamTick[],
  processVar = 1e-4,
  measureVar = 4e-4,
): KalmanState[] {
  if (ticks.length === 0) return [];
  const states: KalmanState[] = [{ p: ticks[0]!.impliedProb, v: 0 }];
  let p = ticks[0]!.impliedProb;
  let v = 0;
  let p00 = measureVar;
  let p01 = 0;
  let p11 = processVar;
  for (let i = 1; i < ticks.length; i += 1) {
    const dt = Math.max(ticks[i]!.time - ticks[i - 1]!.time, 1e-9);
    const q = processVar;
    const pPred = p + v * dt;
    const vPred = v;
    const a00 = p00 + dt * (p01 + p01 + dt * p11) + q;
    const a01 = p01 + dt * p11;
    const a11 = p11 + q;
    const s = a00 + measureVar;
    const k0 = a00 / s;
    const k1 = a01 / s;
    const y = ticks[i]!.impliedProb - pPred;
    p = pPred + k0 * y;
    v = vPred + k1 * y;
    p00 = (1 - k0) * a00;
    p01 = (1 - k0) * a01;
    p11 = a11 - k1 * a01;
    states.push({ p, v });
  }
  return states;
}

/** 1-D curvature κ = |a| / (1+v²)^{3/2}. Deceleration is a·v < 0, never ||a||<0. */
export function curvature1d(velocity: number, acceleration: number): number {
  const denom = Math.pow(1 + velocity * velocity, 1.5);
  return denom > 0 ? Math.abs(acceleration) / denom : 0;
}

export function forwardCurvature(ticks: readonly SteamTick[]): number[] {
  const filt = forwardKalmanFilter(ticks);
  if (filt.length === 0) return [];
  const out = [0];
  for (let i = 1; i < filt.length; i += 1) {
    const dt = Math.max(ticks[i]!.time - ticks[i - 1]!.time, 1e-9);
    const a = (filt[i]!.v - filt[i - 1]!.v) / dt;
    out.push(curvature1d(filt[i]!.v, a));
  }
  return out;
}

/**
 * Rauch–Tung–Striebel smoother. LOOKAHEAD. The backward pass uses
 * observations after t. Exported only so a test can prove that property.
 * Do not call this on a live odds path.
 */
export function rtsSmootherLookahead(
  ticks: readonly SteamTick[],
  processVar = 1e-4,
  measureVar = 4e-4,
): KalmanState[] {
  const n = ticks.length;
  if (n === 0) return [];
  const fwd = forwardKalmanFilter(ticks, processVar, measureVar);
  const sm: KalmanState[] = fwd.map((s) => ({ ...s }));
  for (let i = n - 2; i >= 0; i -= 1) {
    const dt = Math.max(ticks[i + 1]!.time - ticks[i]!.time, 1e-9);
    const pPred = fwd[i]!.p + fwd[i]!.v * dt;
    const c = dt === 0 ? 0 : 0.5;
    sm[i] = {
      p: fwd[i]!.p + c * (sm[i + 1]!.p - pPred),
      v: fwd[i]!.v + c * (sm[i + 1]!.v - fwd[i]!.v),
    };
  }
  return sm;
}

/**
 * Leakage probe. Perturb every observation AFTER index t. A live-legal
 * filter at t is unchanged. RTS at t moves — that is the lookahead.
 */
export function lookaheadDeltaAt(
  ticks: readonly SteamTick[],
  tIndex: number,
  futureBump = 0.2,
): { readonly forward: number; readonly rts: number } {
  if (tIndex < 0 || tIndex >= ticks.length - 1) {
    throw new RangeError("lookaheadDeltaAt: tIndex must have a future");
  }
  const bumped = ticks.map((tick, i) =>
    i > tIndex ? { ...tick, impliedProb: tick.impliedProb + futureBump } : tick,
  );
  const f0 = forwardKalmanFilter(ticks);
  const f1 = forwardKalmanFilter(bumped);
  const r0 = rtsSmootherLookahead(ticks);
  const r1 = rtsSmootherLookahead(bumped);
  return {
    forward: Math.abs(f1[tIndex]!.p - f0[tIndex]!.p),
    rts: Math.abs(r1[tIndex]!.p - r0[tIndex]!.p),
  };
}

export type NextSignScore = {
  readonly method: SteamBaselineName;
  readonly n: number;
  readonly accuracy: number;
  readonly priced: false;
};

function nextSignAccuracy(signal: readonly number[], ticks: readonly SteamTick[]): number {
  let hits = 0;
  let n = 0;
  for (let i = 1; i < ticks.length - 1; i += 1) {
    const future = ticks[i + 1]!.impliedProb - ticks[i]!.impliedProb;
    if (future === 0) continue;
    const pred = signal[i]!;
    // signal magnitude with sign of last move
    const last = ticks[i]!.impliedProb - ticks[i - 1]!.impliedProb;
    const signed = pred * Math.sign(last || 1);
    if (signed === 0) continue;
    n += 1;
    if (Math.sign(signed) === Math.sign(future)) hits += 1;
  }
  return n === 0 ? 0.5 : hits / n;
}

export function scoreSteamBaselines(ticks: readonly SteamTick[]): readonly NextSignScore[] {
  const abs = absDeltaVelocity(ticks);
  const curv = forwardCurvature(ticks);
  return [
    { method: "abs-delta", n: ticks.length, accuracy: nextSignAccuracy(abs, ticks), priced: false },
    {
      method: "forward-curvature",
      n: ticks.length,
      accuracy: nextSignAccuracy(curv, ticks),
      priced: false,
    },
  ];
}

/** Clustered steam path: a sharp run-up then a stall. */
export function syntheticSteamPath(n = 40, seed = 7): SteamTick[] {
  let rng = seed >>> 0;
  const u = (): number => {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const ticks: SteamTick[] = [];
  let p = 0.5;
  for (let i = 0; i < n; i += 1) {
    const steam = i >= 12 && i < 18 ? 0.012 : 0;
    p = Math.min(0.95, Math.max(0.05, p + steam + (u() - 0.5) * 0.004));
    ticks.push({ time: i, impliedProb: p });
  }
  return ticks;
}

/**
 * Signed acceleration·velocity. Negative = decelerating. Never ||a|| < 0
 * (that test is geometrically empty).
 */
export function signedDeceleration(ticks: readonly SteamTick[]): number[] {
  const filt = forwardKalmanFilter(ticks);
  if (filt.length === 0) return [];
  const out = [0];
  for (let i = 1; i < filt.length; i += 1) {
    const dt = Math.max(ticks[i]!.time - ticks[i - 1]!.time, 1e-9);
    const a = (filt[i]!.v - filt[i - 1]!.v) / dt;
    out.push(a * filt[i]!.v);
  }
  return out;
}

export type SteamKillVerdict = "keep-dummy" | "curvature-survives" | "underpowered";

export type SteamKillResult = {
  readonly verdict: SteamKillVerdict;
  readonly absDeltaAccuracy: number;
  readonly forwardCurvatureAccuracy: number;
  readonly n: number;
  readonly priced: false;
  readonly status: "shadow";
  /**
   * Hawkes (hawkes-steam.ts) is a mark-free intensity model on event
   * arrivals. This object is the geometric/velocity twin. They are not
   * substitutes. STEAM-CURVATURE (B-spline+RTS) is held by opus and is
   * lookahead; this kill does not claim it.
   */
  readonly hawkesIsDifferentObject: true;
};

/**
 * Pre-registered synthetic kill: curvature must beat the named abs-delta
 * dummy on the given path. Thin live archives do not get a third intensity
 * model from this function.
 */
export function evaluateSteamKill(ticks: readonly SteamTick[]): SteamKillResult {
  const scores = scoreSteamBaselines(ticks);
  const abs = scores.find((s) => s.method === "abs-delta")!;
  const curv = scores.find((s) => s.method === "forward-curvature")!;
  let verdict: SteamKillVerdict;
  if (ticks.length < 20) verdict = "underpowered";
  else if (curv.accuracy > abs.accuracy) verdict = "curvature-survives";
  else verdict = "keep-dummy";
  return {
    verdict,
    absDeltaAccuracy: abs.accuracy,
    forwardCurvatureAccuracy: curv.accuracy,
    n: ticks.length,
    priced: false,
    status: "shadow",
    hawkesIsDifferentObject: true,
  };
}
