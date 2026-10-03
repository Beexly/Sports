/**
 * Live-game Cox/Hawkes-style event model (live probability engine events)
 *
 * Research port: arXiv:2312.04338
 * Normalized lane: tracking | Doctrine: INFRA
 *
 * Event vocabulary and intensity structure for GSE's live probability engine: scoring events {home TD, away TD, home FG, away FG} plus intensity shocks {key-player injury/ejection, weather change}. Pure intensity/log-likelihood math; the mechanism check and NFL transfer test are live-data gates.
 *
 * ACCEPTANCE GATE: ADAPT into the live engine only if (a) the mechanism check reproduces the three headline effects within +/-2 pp AND (b) the NFL transfer test beats the pregame baseline. Live-data gate -> GSE_LIVE_EVENT_MODEL_ENABLED flag (default false).
 */

export type LiveEventKind =
  | "home_td" | "away_td" | "home_fg" | "away_fg"
  | "injury_shock" | "weather_shock";

export interface TimedEvent {
  t: number; // minutes elapsed
  kind: LiveEventKind;
}

export interface IntensityParams {
  base: Record<Extract<LiveEventKind, "home_td" | "away_td" | "home_fg" | "away_fg">, number>;
  /** Hawkes self-excitation per scoring event */
  alpha: number;
  /** decay rate (per minute) */
  beta: number;
  /** multiplicative shock effects */
  injuryMultiplier: number;
  weatherMultiplier: number;
}

export const DEFAULT_INTENSITY: IntensityParams = {
  base: { home_td: 0.035, away_td: 0.035, home_fg: 0.02, away_fg: 0.02 },
  alpha: 0.4,
  beta: 0.25,
  injuryMultiplier: 1.3,
  weatherMultiplier: 1.15,
};

function isScoring(k: LiveEventKind): k is keyof IntensityParams["base"] {
  return k === "home_td" || k === "away_td" || k === "home_fg" || k === "away_fg";
}

/**
 * Intensity lambda_k(t): base rate + Hawkes excitation from past scoring events,
 * scaled by active shocks. Pure function of the event history.
 */
export function intensityAt(kind: Extract<LiveEventKind, "home_td" | "away_td" | "home_fg" | "away_fg">,
  t: number, history: TimedEvent[], p: IntensityParams = DEFAULT_INTENSITY): number {
  let lam = p.base[kind];
  for (const e of history) {
    if (e.t >= t || !isScoring(e.kind)) continue;
    lam += p.alpha * Math.exp(-p.beta * (t - e.t)) * p.base[kind];
  }
  let shock = 1;
  for (const e of history) {
    if (e.t >= t) continue;
    if (e.kind === "injury_shock") shock *= p.injuryMultiplier;
    if (e.kind === "weather_shock") shock *= p.weatherMultiplier;
  }
  return lam * shock;
}

/** Poisson-process log-likelihood of the observed scoring sequence. */
export function logLikelihood(events: TimedEvent[], p: IntensityParams = DEFAULT_INTENSITY, horizon = 60): number {
  const scoringKinds = ["home_td", "away_td", "home_fg", "away_fg"] as const;
  let ll = 0;
  const history: TimedEvent[] = [];
  const sorted = [...events].sort((a, b) => a.t - b.t);
  for (const e of sorted) {
    if (isScoring(e.kind)) ll += Math.log(Math.max(1e-12, intensityAt(e.kind, e.t, history, p)));
    history.push(e);
  }
  // compensator: integrate total intensity over [0, horizon] (trapezoid, 1-min grid)
  let comp = 0;
  for (let t = 0; t < horizon; t++) {
    for (const k of scoringKinds) comp += (intensityAt(k, t, sorted.filter((e) => e.t < t), p) + intensityAt(k, t + 1, sorted.filter((e) => e.t < t + 1), p)) / 2;
  }
  return ll - comp;
}

/** Live-data gate: mechanism check (+/-2pp) + transfer test must clear. */
export const GSE_LIVE_EVENT_MODEL_ENABLED = false;

