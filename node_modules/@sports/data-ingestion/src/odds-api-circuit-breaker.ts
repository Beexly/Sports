/**
 * Odds API payment circuit breaker (HTTP 402).
 *
 * When The Odds API returns 402 Payment Required (exhausted credits / unpaid),
 * further calls in this process fail fast for `openDurationMs` so cron/refresh
 * does not burn retries, logs, or wall time against a dead key.
 *
 * Integrity:
 *   - Open circuit → no upstream call, no invented quotes.
 *   - Does not change MAX_CANDIDATE_ODDS_AGE_MS or LIVE_BOARD.
 *   - State is process-local (serverless warm instances). Cold starts reset;
 *     a single 402 re-opens quickly. Optional env ODDS_API_CIRCUIT_FORCE_OPEN=1
 *     for founder hard-stop without code change.
 */

export type OddsCircuitState = "closed" | "open" | "half_open";

export interface OddsCircuitBreakerConfig {
  /** Consecutive payment failures required to open. Default 1 (402 is decisive). */
  readonly failureThreshold: number;
  /** How long to stay open before a single probe (half-open). Default 6h. */
  readonly openDurationMs: number;
  /** Clock for tests. */
  readonly now?: () => number;
}

/**
 * WHY a call was refused — stated, not left to be inferred from a status code.
 *
 * These are different facts about the world and must not be conflated:
 *   "payment_circuit_open" — upstream really did return 402/401; the key is
 *                            unpaid or unauthorized.
 *   "probe_in_flight"      — purely LOCAL concurrency. One half-open probe is
 *                            already out; upstream has said nothing at all.
 *   "operator_forced_open" — a human set ODDS_API_CIRCUIT_FORCE_OPEN.
 *
 * Previously every refusal was thrown as an OddsApiError with status 402, and
 * `odds-provider-adapter.ts` classifies 401/402/403 as `paymentOrAuth`. So a
 * concurrency refusal — and an operator's own kill switch — were both reported
 * as "provider payment failure", telling an operator their card had failed when
 * nothing of the sort had happened. In a product whose thesis is that it never
 * overclaims, a confident wrong diagnosis is the failure mode, not a cosmetic
 * one.
 */
export type CircuitRefusalCause =
  | "payment_circuit_open"
  | "probe_in_flight"
  | "operator_forced_open";

export interface CircuitAcquireResult {
  readonly allowed: boolean;
  readonly state: OddsCircuitState;
  readonly reason?: string;
  /** Present exactly when `allowed` is false. See CircuitRefusalCause. */
  readonly cause?: CircuitRefusalCause;
  /**
   * True when THIS caller took the exclusive half-open probe slot, and is
   * therefore the only one entitled to release it. Callers must not release a
   * slot they did not acquire.
   */
  readonly acquiredProbe?: boolean;
  readonly opensAt?: number;
  readonly remainingOpenMs?: number;
}

export interface CircuitSnapshot {
  readonly state: OddsCircuitState;
  readonly consecutiveFailures: number;
  readonly openedAt: number | null;
  readonly lastFailureAt: number | null;
  readonly lastSuccessAt: number | null;
  readonly lastFailureDetail: string | null;
}

const DEFAULT_CONFIG: OddsCircuitBreakerConfig = {
  failureThreshold: 1,
  openDurationMs: 6 * 60 * 60 * 1000, // align with gate freshness budget
};

function envForceOpen(): boolean {
  const v = (process.env["ODDS_API_CIRCUIT_FORCE_OPEN"] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export class OddsPaymentCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly openDurationMs: number;
  private readonly now: () => number;

  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private lastFailureAt: number | null = null;
  private lastSuccessAt: number | null = null;
  private lastFailureDetail: string | null = null;
  private halfOpenProbeInFlight = false;

  constructor(config: Partial<OddsCircuitBreakerConfig> = {}) {
    this.failureThreshold = config.failureThreshold ?? DEFAULT_CONFIG.failureThreshold;
    this.openDurationMs = config.openDurationMs ?? DEFAULT_CONFIG.openDurationMs;
    this.now = config.now ?? (() => Date.now());
  }

  /**
   * Current state after applying the time-based open → half_open transition.
   *
   * NOTE — `half_open` is ABSORBING, by design. `openedAt` only ever moves on a
   * fresh `recordPaymentRequired`, and only `recordSuccess` clears it. So once
   * the open window has elapsed the breaker stays half-open indefinitely, and a
   * probe that ends in a transient error (a 500, a timeout) leaves it there:
   * every subsequent call gets its own probe, one at a time, forever.
   *
   * That degradation is deliberate and in the safe direction — it means
   * "serialized, still trying" rather than either hammering a dead key or
   * refusing a recovered one. Documented because the behavior is not obvious
   * from the state names: a reader reasonably expects half_open to resolve back
   * to open or closed, and here it does so only on a definitive upstream answer.
   */
  getState(): OddsCircuitState {
    if (envForceOpen()) return "open";
    if (this.openedAt === null) return "closed";
    const elapsed = this.now() - this.openedAt;
    if (elapsed >= this.openDurationMs) return "half_open";
    return "open";
  }

  snapshot(): CircuitSnapshot {
    return {
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureDetail: this.lastFailureDetail,
    };
  }

  /**
   * Gate a request. When open, allowed=false (fail closed).
   * When half_open, allows one probe at a time.
   */
  tryAcquire(): CircuitAcquireResult {
    if (envForceOpen()) {
      return {
        allowed: false,
        state: "open",
        cause: "operator_forced_open",
        reason:
          "ODDS_API_CIRCUIT_FORCE_OPEN=1 — refusing Odds API calls (founder hard-stop)",
      };
    }

    const state = this.getState();

    if (state === "closed") {
      return { allowed: true, state, acquiredProbe: false };
    }

    if (state === "open") {
      const opensAt = (this.openedAt ?? this.now()) + this.openDurationMs;
      const remainingOpenMs = Math.max(0, opensAt - this.now());
      return {
        allowed: false,
        state,
        cause: "payment_circuit_open",
        opensAt,
        remainingOpenMs,
        reason: `Odds API payment circuit open after HTTP 402 — retry in ~${Math.ceil(remainingOpenMs / 60000)}m (no invented quotes)`,
      };
    }

    // half_open: single probe
    if (this.halfOpenProbeInFlight) {
      return {
        allowed: false,
        state,
        cause: "probe_in_flight",
        reason:
          "Odds API payment circuit half-open — probe already in flight (local " +
          "concurrency limit; upstream has NOT reported a payment or auth failure)",
      };
    }
    this.halfOpenProbeInFlight = true;
    return { allowed: true, state: "half_open", acquiredProbe: true };
  }

  /** Call after a successful upstream response (2xx). */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.lastSuccessAt = this.now();
    this.halfOpenProbeInFlight = false;
    this.lastFailureDetail = null;
  }

  /**
   * Call when upstream returns 402 (or founder treats 401 as hard auth stop).
   * Opens circuit once consecutive failures reach threshold.
   */
  recordPaymentRequired(detail?: string): void {
    this.consecutiveFailures += 1;
    this.lastFailureAt = this.now();
    this.lastFailureDetail = detail?.slice(0, 500) ?? "HTTP 402 Payment Required";
    this.halfOpenProbeInFlight = false;

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = this.now();
    }
  }

  /**
   * Release a half-open probe slot WITHOUT recording a payment failure.
   *
   * Must be called when a probe ends for any reason other than a clean 2xx or
   * a 402/401 — a transient 500, a timeout, a network error, a JSON parse
   * failure. Without it the circuit wedges PERMANENTLY: `tryAcquire()` sets
   * `halfOpenProbeInFlight`, and only `recordSuccess`/`recordPaymentRequired`
   * cleared it, so a probe that threw on a transient error left the flag set
   * forever. `getState()` stays `half_open` (openedAt never moves once the
   * open window has elapsed), so every later call hit the "probe already in
   * flight" branch and was refused — for the life of the process, even after
   * payment was restored. Verified against the breaker before fixing.
   *
   * Deliberately does NOT count as a payment failure and does NOT re-arm the
   * open window: upstream never said "payment required", so re-opening for
   * another full 6 hours would punish a network blip with a self-inflicted
   * outage. The circuit stays half-open and the next call may probe again.
   *
   * Safe to call unconditionally (e.g. from a `finally`) — a no-op when no
   * probe is in flight.
   */
  releaseProbe(): void {
    this.halfOpenProbeInFlight = false;
  }

  /** Test / admin helper — forces closed. */
  reset(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
    this.lastFailureDetail = null;
    this.halfOpenProbeInFlight = false;
  }

  /** Test helper — force open now. */
  forceOpen(detail = "forced open"): void {
    this.consecutiveFailures = Math.max(this.consecutiveFailures, this.failureThreshold);
    this.openedAt = this.now();
    this.lastFailureAt = this.now();
    this.lastFailureDetail = detail;
    this.halfOpenProbeInFlight = false;
  }
}

/** Process-local singleton for OddsApiClient default wiring. */
let sharedBreaker: OddsPaymentCircuitBreaker | null = null;

export function getOddsPaymentCircuitBreaker(): OddsPaymentCircuitBreaker {
  if (!sharedBreaker) {
    sharedBreaker = new OddsPaymentCircuitBreaker();
  }
  return sharedBreaker;
}

/** Replace singleton (tests). */
export function setOddsPaymentCircuitBreakerForTests(
  breaker: OddsPaymentCircuitBreaker | null,
): void {
  sharedBreaker = breaker;
}
