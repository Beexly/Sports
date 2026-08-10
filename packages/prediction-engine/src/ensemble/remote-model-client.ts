/**
 * Remote model ensemble client — forward-compatible plumbing for calling out
 * to external model-prediction services (e.g. a future Python sidecar) from
 * the TypeScript prediction engine.
 *
 * NO real remote service exists yet. This module's entire value is being
 * correct, safe, and fully tested (via a mocked `fetch`) so it is ready to
 * point at a real endpoint the moment one exists. It deliberately does NOT
 * hard-code any endpoint list — every call takes `ModelEndpoint`s as a
 * parameter, so there is no dead/misleading config sitting in the repo. The
 * caller (whoever eventually wires up a real sidecar) owns the endpoint
 * list.
 *
 * Safety contract
 * ----------------
 * `fetchModelPrediction` NEVER throws. Every failure mode — HTTP error,
 * timeout, malformed JSON, an out-of-range/non-finite probability, a network
 * error — is returned as a typed `RemoteModelFailure`, never as an exception
 * and never as a silently-passed-through bad value. A remote model that
 * returns garbage must never corrupt the ensemble; a `probability` outside
 * `[0, 1]` (including `NaN`/`Infinity`) is rejected as `malformed_response`
 * just like a missing field would be.
 *
 * `getRemoteProbabilities` fans a call out to every ENABLED endpoint
 * concurrently and never rejects, even if every endpoint fails. Disabled
 * endpoints are skipped entirely — not attempted, not reported as failures.
 *
 * Per-endpoint timeout is enforced via `AbortController`, using
 * `endpoint.timeoutMs ?? DEFAULT_TIMEOUT_MS` (2000ms). The timeout is raced
 * against the fetch explicitly (not left to depend on the mock/real fetch
 * honoring the abort signal), so a fetch that never settles — or settles
 * later than the timeout — still produces a `timeout` failure at
 * approximately the configured duration.
 *
 * Determinism
 * -----------
 * No `Date.now()` / `Math.random()` anywhere in this module (house rule).
 * The circuit breaker takes time explicitly: `nowMs` is threaded through
 * every call rather than read from the wall clock, so it stays fully
 * deterministic and testable with a fake/seeded clock.
 *
 * Circuit breaker state machine (tracked per endpoint `name`)
 * -------------------------------------------------------------
 *
 *   closed --[N consecutive failures]--> open
 *   open --[resetAfterMs elapsed since it opened]--> half-open
 *   half-open --[trial call succeeds]--> closed
 *   half-open --[trial call fails]--> open (resetAfterMs window restarts)
 *
 *   - closed:    calls proceed normally. A failure increments a per-endpoint
 *                consecutive-failure counter; a success resets it to 0. Once
 *                the counter reaches `failureThreshold` the circuit opens.
 *   - open:      calls are short-circuited to a failure WITHOUT invoking
 *                `fetch` at all — this is the point of the breaker: stop
 *                hammering a dead endpoint — until `resetAfterMs` has
 *                elapsed since the circuit opened.
 *   - half-open: exactly one trial call is let through (a "half-open trial
 *                in flight" flag blocks concurrent callers from sneaking a
 *                second live trial into the same window). A successful
 *                trial closes the circuit and clears the failure counter; a
 *                failed trial re-opens the circuit immediately and restarts
 *                the `resetAfterMs` window from the failure's `nowMs` — it
 *                does NOT need to re-accumulate `failureThreshold` failures
 *                first.
 *
 * `guardedFetchModelPrediction` is the circuit-breaker-aware entry point:
 * it checks breaker state before attempting a call and records the outcome
 * afterward. `fetchModelPrediction` itself is breaker-agnostic and can be
 * used directly by callers that want to manage their own retry policy.
 */

/** A single remote model endpoint, supplied by the caller — never hard-coded here. */
export interface ModelEndpoint {
  readonly name: string;
  readonly url: string;
  readonly enabled: boolean;
  /** Per-endpoint override for the request timeout. Defaults to {@link DEFAULT_TIMEOUT_MS}. */
  readonly timeoutMs?: number;
}

/**
 * Minimal, intentionally loose/extensible context passed to a remote model.
 * This module does not know what any given remote model needs, so beyond a
 * few generically useful fields it is caller-defined.
 */
export interface GameContext {
  readonly gameId: string;
  readonly sport?: string;
  readonly homeTeam?: string;
  readonly awayTeam?: string;
  readonly [key: string]: unknown;
}

export interface RemoteModelPrediction {
  readonly name: string;
  readonly probability: number;
}

export type RemoteModelFailureReason =
  | "timeout"
  | "http_error"
  | "malformed_response"
  | "network_error";

export interface RemoteModelFailure {
  readonly name: string;
  readonly reason: RemoteModelFailureReason;
  readonly detail: string;
}

export type RemoteModelOutcome = RemoteModelPrediction | RemoteModelFailure;

/** Default per-call timeout when an endpoint does not specify its own. */
export const DEFAULT_TIMEOUT_MS = 2000;

export interface FetchModelPredictionDeps {
  readonly fetch?: typeof fetch;
}

export function isRemoteModelFailure(outcome: RemoteModelOutcome): outcome is RemoteModelFailure {
  return "reason" in outcome;
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err) ?? String(err);
  } catch {
    return "unknown error";
  }
}

function safeStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return (json ?? String(value)).slice(0, 300);
  } catch {
    return "<unserializable response body>";
  }
}

/**
 * Extracts and validates the `probability` field from a decoded JSON body.
 * Returns `null` (never throws) for anything that is not a finite number in
 * `[0, 1]` — including `NaN`, `Infinity`/`-Infinity`, out-of-range values,
 * wrong types, or a missing field.
 */
function extractProbability(body: unknown): number | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>)["probability"];
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

type FetchOutcome =
  | { readonly kind: "response"; readonly response: Response }
  | { readonly kind: "error"; readonly error: unknown }
  | { readonly kind: "timeout" };

/**
 * Calls a single remote model endpoint and returns either a validated
 * prediction or a typed failure. NEVER throws — every failure path (timeout,
 * HTTP error, malformed/missing JSON, out-of-range probability, network
 * error) is returned as a {@link RemoteModelFailure}.
 *
 * The timeout is enforced by racing the fetch against an explicit timer
 * (in addition to aborting via `AbortController`), so this resolves at
 * approximately `endpoint.timeoutMs ?? DEFAULT_TIMEOUT_MS` even if the
 * underlying `fetch` implementation does not honor the abort signal (e.g. a
 * mock that never resolves, or resolves later than the timeout).
 */
export async function fetchModelPrediction(
  endpoint: ModelEndpoint,
  ctx: GameContext,
  deps: FetchModelPredictionDeps = {},
): Promise<RemoteModelOutcome> {
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = endpoint.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<FetchOutcome>((resolve) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      resolve({ kind: "timeout" });
    }, timeoutMs);
  });

  // Wrapped in Promise.resolve().then(...) so a fetch implementation that
  // throws SYNCHRONOUSLY (rather than returning a rejected promise) is still
  // captured here instead of escaping as an uncaught exception.
  const fetchPromise: Promise<FetchOutcome> = Promise.resolve()
    .then(() =>
      doFetch(endpoint.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ctx),
        signal: controller.signal,
      }),
    )
    .then(
      (response) => ({ kind: "response", response }) as const,
      (error: unknown) => ({ kind: "error", error }) as const,
    );

  const outcome = await Promise.race([fetchPromise, timeoutPromise]);
  if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);

  if (outcome.kind === "timeout") {
    return { name: endpoint.name, reason: "timeout", detail: `no response within ${timeoutMs}ms` };
  }
  if (outcome.kind === "error") {
    return { name: endpoint.name, reason: "network_error", detail: describeError(outcome.error) };
  }

  const { response } = outcome;
  if (!response.ok) {
    return {
      name: endpoint.name,
      reason: "http_error",
      detail: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return {
      name: endpoint.name,
      reason: "malformed_response",
      detail: `response body was not valid JSON: ${describeError(err)}`,
    };
  }

  const probability = extractProbability(body);
  if (probability === null) {
    return {
      name: endpoint.name,
      reason: "malformed_response",
      detail: `missing or out-of-range "probability" field: ${safeStringify(body)}`,
    };
  }

  return { name: endpoint.name, probability };
}

export interface RemoteProbabilitiesResult {
  readonly succeeded: readonly RemoteModelPrediction[];
  readonly failed: readonly RemoteModelFailure[];
}

/**
 * Calls every ENABLED endpoint concurrently (disabled endpoints are skipped
 * entirely — not attempted, not reported as a failure) and partitions the
 * results. NEVER rejects, even if every endpoint fails.
 */
export async function getRemoteProbabilities(
  endpoints: readonly ModelEndpoint[],
  ctx: GameContext,
  deps: FetchModelPredictionDeps = {},
): Promise<RemoteProbabilitiesResult> {
  const enabledEndpoints = endpoints.filter((endpoint) => endpoint.enabled);

  // Bundle the endpoint with its outcome so we never need to re-index back
  // into `enabledEndpoints` by position (safe under noUncheckedIndexedAccess,
  // and correct even if two endpoints share a name). Each mapper catches
  // internally so `Promise.allSettled` entries are always "fulfilled" —
  // `fetchModelPrediction` is documented never to throw, but this keeps the
  // guarantee true even against a future regression there.
  const settled = await Promise.allSettled(
    enabledEndpoints.map(async (endpoint) => {
      try {
        return { endpoint, outcome: await fetchModelPrediction(endpoint, ctx, deps) };
      } catch (err) {
        const failure: RemoteModelFailure = {
          name: endpoint.name,
          reason: "network_error",
          detail: describeError(err),
        };
        return { endpoint, outcome: failure };
      }
    }),
  );

  const succeeded: RemoteModelPrediction[] = [];
  const failed: RemoteModelFailure[] = [];

  for (const entry of settled) {
    if (entry.status !== "fulfilled") continue; // unreachable — mapper above never rejects
    const { outcome } = entry.value;
    if (isRemoteModelFailure(outcome)) {
      failed.push(outcome);
    } else {
      succeeded.push(outcome);
    }
  }

  return { succeeded, failed };
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Consecutive failures (from `closed`) required to open the circuit. Default 3. */
  readonly failureThreshold?: number;
  /** How long an open circuit stays open before allowing a half-open trial. Default 30_000ms. */
  readonly resetAfterMs?: number;
}

export interface CircuitAcquireResult {
  readonly allowed: boolean;
  readonly state: CircuitState;
}

export interface CircuitBreakerSnapshot {
  readonly state: CircuitState;
  readonly consecutiveFailures: number;
  readonly openedAtMs: number | null;
}

export interface CircuitBreaker {
  /**
   * Resolves the time-based `open -> half-open` transition as of `nowMs` and
   * returns the endpoint's current state. Read-only — does not mutate
   * anything or consume a half-open trial slot. An endpoint never seen
   * before starts `closed`.
   */
  getState(name: string, nowMs: number): CircuitState;

  /**
   * Attempts to reserve a call slot for `name` as of `nowMs`.
   *  - `closed`:    always allowed.
   *  - `open`:      `allowed: false` — the caller must NOT call `fetch`.
   *  - `half-open`: allowed exactly once per open window; a concurrent
   *                 caller while a trial is already in flight is refused.
   * Does not mutate failure counters — only {@link CircuitBreaker.recordOutcome} does that.
   */
  tryAcquire(name: string, nowMs: number): CircuitAcquireResult;

  /**
   * Records the outcome of a call that `tryAcquire` allowed through, and
   * clears the half-open-trial-in-flight flag (if set) regardless of
   * outcome. See the module header for the full state machine.
   */
  recordOutcome(name: string, outcome: "success" | "failure", nowMs: number): void;

  /** Introspection helper for tests/observability. */
  snapshot(name: string, nowMs: number): CircuitBreakerSnapshot;
}

interface EndpointCircuitState {
  consecutiveFailures: number;
  /** `null` while closed; set to the `nowMs` the circuit opened, cleared on success. */
  openedAtMs: number | null;
  halfOpenTrialInFlight: boolean;
}

const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RESET_AFTER_MS = 30_000;

function resolveState(
  entry: EndpointCircuitState,
  nowMs: number,
  resetAfterMs: number,
): CircuitState {
  if (entry.openedAtMs === null) return "closed";
  const elapsed = nowMs - entry.openedAtMs;
  return elapsed >= resetAfterMs ? "half-open" : "open";
}

/** Creates a per-endpoint-name circuit breaker. See the module header for the state machine. */
export function createCircuitBreaker(options: CircuitBreakerOptions = {}): CircuitBreaker {
  const failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const resetAfterMs = options.resetAfterMs ?? DEFAULT_RESET_AFTER_MS;
  const states = new Map<string, EndpointCircuitState>();

  function getOrCreate(name: string): EndpointCircuitState {
    const existing = states.get(name);
    if (existing !== undefined) return existing;
    const created: EndpointCircuitState = {
      consecutiveFailures: 0,
      openedAtMs: null,
      halfOpenTrialInFlight: false,
    };
    states.set(name, created);
    return created;
  }

  return {
    getState(name, nowMs) {
      return resolveState(getOrCreate(name), nowMs, resetAfterMs);
    },

    tryAcquire(name, nowMs) {
      const entry = getOrCreate(name);
      const state = resolveState(entry, nowMs, resetAfterMs);

      if (state === "closed") {
        return { allowed: true, state };
      }
      if (state === "open") {
        return { allowed: false, state };
      }
      // half-open: exactly one concurrent trial.
      if (entry.halfOpenTrialInFlight) {
        return { allowed: false, state };
      }
      entry.halfOpenTrialInFlight = true;
      return { allowed: true, state };
    },

    recordOutcome(name, outcome, nowMs) {
      const entry = getOrCreate(name);
      const priorState = resolveState(entry, nowMs, resetAfterMs);
      entry.halfOpenTrialInFlight = false;

      if (outcome === "success") {
        entry.consecutiveFailures = 0;
        entry.openedAtMs = null;
        return;
      }

      entry.consecutiveFailures += 1;

      if (priorState === "half-open") {
        // A failed trial never returns to closed — re-open immediately and
        // restart the reset window from this failure, without waiting to
        // re-accumulate failureThreshold consecutive failures.
        entry.openedAtMs = nowMs;
        return;
      }

      // priorState is "closed" here: an "open" circuit never lets a call
      // through (tryAcquire refuses it), so recordOutcome is never invoked
      // while genuinely open.
      if (entry.consecutiveFailures >= failureThreshold) {
        entry.openedAtMs = nowMs;
      }
    },

    snapshot(name, nowMs) {
      const entry = getOrCreate(name);
      return {
        state: resolveState(entry, nowMs, resetAfterMs),
        consecutiveFailures: entry.consecutiveFailures,
        openedAtMs: entry.openedAtMs,
      };
    },
  };
}

export interface GuardedFetchModelPredictionDeps {
  /**
   * Current time, threaded explicitly (house rule: no `Date.now()` inside
   * this module). Required — callers own the clock.
   */
  readonly nowMs: number;
  readonly fetch?: typeof fetch;
}

/**
 * Circuit-breaker-aware wrapper around {@link fetchModelPrediction}.
 *
 * Checks `breaker` state before attempting the call — an OPEN circuit
 * short-circuits to a `network_error` failure WITHOUT calling `fetch` at
 * all — and records the outcome afterward to advance the breaker's state.
 * Like `fetchModelPrediction`, this never throws.
 */
export async function guardedFetchModelPrediction(
  breaker: CircuitBreaker,
  endpoint: ModelEndpoint,
  ctx: GameContext,
  deps: GuardedFetchModelPredictionDeps,
): Promise<RemoteModelOutcome> {
  const { nowMs } = deps;
  const acquisition = breaker.tryAcquire(endpoint.name, nowMs);

  if (!acquisition.allowed) {
    return {
      name: endpoint.name,
      reason: "network_error",
      detail: `circuit breaker is "${acquisition.state}" for "${endpoint.name}" — short-circuited without calling fetch`,
    };
  }

  try {
    const outcome = await fetchModelPrediction(endpoint, ctx, { fetch: deps.fetch });
    breaker.recordOutcome(endpoint.name, isRemoteModelFailure(outcome) ? "failure" : "success", nowMs);
    return outcome;
  } catch (err) {
    // Defense in depth: fetchModelPrediction is documented never to throw,
    // but if it ever regressed, a stray exception here must not leave the
    // half-open trial slot wedged open forever.
    breaker.recordOutcome(endpoint.name, "failure", nowMs);
    return { name: endpoint.name, reason: "network_error", detail: describeError(err) };
  }
}
