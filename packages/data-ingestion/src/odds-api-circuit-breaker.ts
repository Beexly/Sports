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

export interface CircuitAcquireResult {
  readonly allowed: boolean;
  readonly state: OddsCircuitState;
  readonly reason?: string;
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

  /** Current state after applying time-based open → half_open transition. */
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
        reason:
          "ODDS_API_CIRCUIT_FORCE_OPEN=1 — refusing Odds API calls (founder hard-stop)",
      };
    }

    const state = this.getState();

    if (state === "closed") {
      return { allowed: true, state };
    }

    if (state === "open") {
      const opensAt = (this.openedAt ?? this.now()) + this.openDurationMs;
      const remainingOpenMs = Math.max(0, opensAt - this.now());
      return {
        allowed: false,
        state,
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
        reason:
          "Odds API payment circuit half-open — probe already in flight (no concurrent calls)",
      };
    }
    this.halfOpenProbeInFlight = true;
    return { allowed: true, state: "half_open" };
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
