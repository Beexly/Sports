/**
 * ATB adaptive token-bucket retry for the data-fetch harness
 *
 * Research port: arXiv:2510.04516
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure client-side adaptive token bucket ported from the paper's ATB policy:
 * tokens refill at an adaptive rate; 429s shrink the rate (multiplicative
 * decrease), sustained success grows it back (additive increase), and the
 * bucket caps bursts. Replaces naive fixed-sleep/exponential-backoff in the
 * fetch scripts for Odds API, FreePublicAPIs, TheSportsDB, and the nflverse
 * CDN. Time is injected (nowMs) so the policy is fully deterministic and
 * testable without network access.
 *
 * ACCEPTANCE GATE: ADOPT iff 429s drop >=50% vs the fixed-sleep baseline
 * with completion-time increase <=30% over the 1-week test; reject as
 * unnecessary if 429s are already ~zero.
 */

export interface AtbConfig {
  /** maximum burst tokens */
  capacity: number;
  /** initial refill rate, tokens per second */
  initialRate: number;
  /** multiplicative decrease factor applied on a 429, in (0,1) */
  beta: number;
  /** additive increase applied per successful second, tokens/sec */
  alpha: number;
  /** floor for the adaptive rate */
  minRate: number;
  /** ceiling for the adaptive rate */
  maxRate: number;
}

export interface AtbState {
  tokens: number;
  rate: number;
  lastRefillMs: number;
  throttled429s: number;
  successes: number;
}

export const DEFAULT_ATB_CONFIG: AtbConfig = {
  capacity: 10,
  initialRate: 5,
  beta: 0.5,
  alpha: 0.5,
  minRate: 0.5,
  maxRate: 50,
};

export function initAtb(config: AtbConfig = DEFAULT_ATB_CONFIG, nowMs = 0): AtbState {
  return {
    tokens: config.capacity,
    rate: config.initialRate,
    lastRefillMs: nowMs,
    throttled429s: 0,
    successes: 0,
  };
}

function refill(state: AtbState, config: AtbConfig, nowMs: number): AtbState {
  const elapsedS = Math.max(0, (nowMs - state.lastRefillMs) / 1000);
  return {
    ...state,
    tokens: Math.min(config.capacity, state.tokens + elapsedS * state.rate),
    lastRefillMs: nowMs,
  };
}

export type AtbVerdict = "allow" | "wait";

/** Ask the bucket whether a request may fire now. */
export function atbAllow(
  state: AtbState,
  config: AtbConfig,
  nowMs: number,
): { verdict: AtbVerdict; state: AtbState; waitMs: number } {
  const s = refill(state, config, nowMs);
  if (s.tokens >= 1) {
    return { verdict: "allow", state: { ...s, tokens: s.tokens - 1 }, waitMs: 0 };
  }
  const waitMs = Math.ceil(((1 - s.tokens) / Math.max(s.rate, 1e-9)) * 1000);
  return { verdict: "wait", state: s, waitMs };
}

export type FetchOutcome = "success" | "rate_limited" | "error";

/**
 * Record a fetch outcome: 429s multiplicatively decrease the refill rate,
 * successes additively increase it back toward the ceiling. Hard errors
 * leave the rate untouched.
 */
export function atbObserve(
  state: AtbState,
  config: AtbConfig,
  outcome: FetchOutcome,
): AtbState {
  if (outcome === "rate_limited") {
    return {
      ...state,
      rate: Math.max(config.minRate, state.rate * config.beta),
      throttled429s: state.throttled429s + 1,
    };
  }
  if (outcome === "success") {
    return {
      ...state,
      rate: Math.min(config.maxRate, state.rate + config.alpha),
      successes: state.successes + 1,
    };
  }
  return state;
}

/**
 * Deterministic 1-week-style simulation: drive the policy against a scripted
 * outcome sequence and report 429 count vs a fixed-sleep baseline count.
 */
export function simulateWeek(
  outcomes: FetchOutcome[],
  config: AtbConfig = DEFAULT_ATB_CONFIG,
): { atb429s: number; baseline429s: number; reduction: number } {
  let state = initAtb(config, 0);
  let atb429s = 0;
  let now = 0;
  for (const o of outcomes) {
    const { verdict, state: s2, waitMs } = atbAllow(state, config, now);
    state = s2;
    now += waitMs + 100;
    if (verdict === "wait") continue; // request deferred, provider never sees it
    if (o === "rate_limited") atb429s++;
    state = atbObserve(state, config, o);
  }
  const baseline429s = outcomes.filter((o) => o === "rate_limited").length;
  const reduction = baseline429s === 0 ? 0 : (baseline429s - atb429s) / baseline429s;
  return { atb429s, baseline429s, reduction };
}

export const GSE_ATB_THROTTLER_ENABLED = false;
