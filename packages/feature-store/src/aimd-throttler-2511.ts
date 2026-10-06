/**
 * Rule-based AIMD adaptive throttler (DRL rejected per the gate)
 *
 * Research port: arXiv:2511.03279
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure rule-based adaptive throttler for the data-fetch harness: state is the
 * per-API throttle interval, actions are interval adjustments driven by the
 * observed 429 rate and queue depth. Additive increase while clean,
 * multiplicative decrease on 429 pressure — the classical AIMD controller the
 * paper's gate keeps. The neural-RL component is rejected unconditionally per
 * the gate and is not implemented here. Time is injected for determinism.
 *
 * ACCEPTANCE GATE: ADOPT the rule-based adaptive throttler iff 429 errors
 * drop >=50% vs the fixed-interval baseline AND median full-pull completion
 * time does not increase >20% on the 1-week test window; reject the
 * neural-RL component unconditionally.
 */

export interface AimdConfig {
  /** starting interval between requests, ms */
  initialIntervalMs: number;
  /** additive increase per clean window, ms */
  additiveMs: number;
  /** multiplicative decrease factor on pressure, in (0,1) */
  beta: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  /** 429-rate above which pressure is declared */
  pressureThreshold: number;
  /** queue depth above which pressure is declared */
  queueThreshold: number;
}

export interface AimdState {
  intervalMs: number;
  windowRequests: number;
  window429s: number;
  queueDepth: number;
}

export const DEFAULT_AIMD_CONFIG: AimdConfig = {
  initialIntervalMs: 1000,
  additiveMs: 50,
  beta: 0.7,
  minIntervalMs: 100,
  maxIntervalMs: 30_000,
  pressureThreshold: 0.05,
  queueThreshold: 50,
};

export function initAimd(config: AimdConfig = DEFAULT_AIMD_CONFIG): AimdState {
  return { intervalMs: config.initialIntervalMs, windowRequests: 0, window429s: 0, queueDepth: 0 };
}

export type WindowOutcome = "success" | "rate_limited";

/** Record one request outcome inside the current window. */
export function aimdObserve(state: AimdState, outcome: WindowOutcome, queueDepth: number): AimdState {
  return {
    ...state,
    windowRequests: state.windowRequests + 1,
    window429s: state.window429s + (outcome === "rate_limited" ? 1 : 0),
    queueDepth,
  };
}

/**
 * End-of-window control step: multiplicative decrease under 429/queue
 * pressure, additive increase when clean.
 */
export function aimdStep(state: AimdState, config: AimdConfig = DEFAULT_AIMD_CONFIG): AimdState {
  const rate429 = state.windowRequests === 0 ? 0 : state.window429s / state.windowRequests;
  const pressured = rate429 > config.pressureThreshold || state.queueDepth > config.queueThreshold;
  const intervalMs = pressured
    ? Math.min(config.maxIntervalMs, Math.max(config.minIntervalMs, state.intervalMs / config.beta))
    : Math.max(config.minIntervalMs, Math.min(config.maxIntervalMs, state.intervalMs - config.additiveMs));
  return { intervalMs, windowRequests: 0, window429s: 0, queueDepth: state.queueDepth };
}

/** Current wait before the next request may fire. */
export function aimdWaitMs(state: AimdState): number {
  return Math.max(0, state.intervalMs);
}

export interface AimdSimResult {
  finalIntervalMs: number;
  windows: number;
}

/** Drive the controller over scripted per-window (429-rate, queue) inputs. */
export function simulateAimd(
  windows: Array<{ rate429: number; queue: number; requests: number }>,
  config: AimdConfig = DEFAULT_AIMD_CONFIG,
): AimdSimResult {
  let state = initAimd(config);
  for (const w of windows) {
    const n429 = Math.round(w.requests * Math.min(1, Math.max(0, w.rate429)));
    for (let i = 0; i < w.requests; i++) {
      state = aimdObserve(state, i < n429 ? "rate_limited" : "success", w.queue);
    }
    state = aimdStep(state, config);
  }
  return { finalIntervalMs: state.intervalMs, windows: windows.length };
}

export const GSE_AIMD_THROTTLER_ENABLED = false;
