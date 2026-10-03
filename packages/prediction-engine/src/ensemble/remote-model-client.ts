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
  | "network_error"
  | "blocked_url"
  /** A redirect target pointed at a private/loopback/metadata host (SSRF bypass). */
  | "blocked_redirect";

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

/**
 * Cloud instance-metadata endpoints. These are the classic SSRF escalation
 * target: they answer unauthenticated HTTP from inside the VPC and hand back
 * IAM credentials. No legitimate model sidecar is ever hosted here, so denying
 * them costs nothing and closes the highest-severity outcome of a
 * caller-supplied URL.
 */
const BLOCKED_METADATA_HOSTS: ReadonlySet<string> = new Set([
  "169.254.169.254", // AWS / Azure / GCP / DigitalOcean IMDS
  "fd00:ec2::254", // AWS IMDS over IPv6
  "metadata.google.internal",
  "metadata.goog",
]);

/** A CIDR block used for private-range / loopback SSRF matching. */
interface CidrBlock {
  readonly kind: "ipv4";
  /** Unsigned low/high integer bounds (inclusive). */
  readonly lo: number;
  readonly hi: number;
  readonly label: string;
}

/**
 * Parse an IPv4 dotted-quad into an unsigned 32-bit integer, or null if not a
 * clean 4-octet form. Used only for literal-IP host matching (not DNS).
 */
function parseIpv4(host: string): number | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v < 0 || v > 255) return null;
    n = (n << 8) >>> 0;
    n = (n + v) >>> 0;
  }
  return n;
}

/**
 * RFC1918 / loopback / link-local IP ranges that are unreachable on the public
 * internet and are the standard SSRF escape hatch (an attacker who can pick
 * the URL points this process at an internal service). We match CIDR ranges,
 * not exact strings, so `10.0.0.1`, `10.1.2.3`, etc. are all refused.
 *
 * The intended deployment target IS an internal hostname
 * (`http://gse-ml-service:8000`), which resolves at the OS level and is NOT
 * an IP literal — so hostname-based endpoints are unaffected; only a URL that
 * embeds a literal private IP is rejected.
 */
const BLOCKED_IPV4_RANGES: readonly CidrBlock[] = [
  { kind: "ipv4", lo: parseIpv4("0.0.0.0")!, hi: parseIpv4("0.255.255.255")!, label: "0.0.0.0/8 (this-network)" },
  { kind: "ipv4", lo: parseIpv4("10.0.0.0")!, hi: parseIpv4("10.255.255.255")!, label: "10.0.0.0/8 (RFC1918)" },
  { kind: "ipv4", lo: parseIpv4("100.64.0.0")!, hi: parseIpv4("100.127.255.255")!, label: "100.64.0.0/10 (RFC6598 CGNAT)" },
  { kind: "ipv4", lo: parseIpv4("127.0.0.0")!, hi: parseIpv4("127.255.255.255")!, label: "127.0.0.0/8 (loopback)" },
  { kind: "ipv4", lo: parseIpv4("169.254.0.0")!, hi: parseIpv4("169.254.255.255")!, label: "169.254.0.0/16 (link-local)" },
  { kind: "ipv4", lo: parseIpv4("172.16.0.0")!, hi: parseIpv4("172.31.255.255")!, label: "172.16.0.0/12 (RFC1918)" },
  { kind: "ipv4", lo: parseIpv4("192.0.0.0")!, hi: parseIpv4("192.0.0.255")!, label: "192.0.0.0/24 (RFC5737)" },
  { kind: "ipv4", lo: parseIpv4("192.0.2.0")!, hi: parseIpv4("192.0.2.255")!, label: "192.0.2.0/24 (RFC5737)" },
  { kind: "ipv4", lo: parseIpv4("192.168.0.0")!, hi: parseIpv4("192.168.255.255")!, label: "192.168.0.0/16 (RFC1918)" },
  { kind: "ipv4", lo: parseIpv4("198.18.0.0")!, hi: parseIpv4("198.19.255.255")!, label: "198.18.0.0/15 (RFC2544)" },
  { kind: "ipv4", lo: parseIpv4("198.51.100.0")!, hi: parseIpv4("198.51.100.255")!, label: "198.51.100.0/24 (RFC5737)" },
  { kind: "ipv4", lo: parseIpv4("203.0.113.0")!, hi: parseIpv4("203.0.113.255")!, label: "203.0.113.0/24 (RFC5737)" },
];

/** IPv6 loopback / ULA / link-local prefixes that must never be fetched. */
const BLOCKED_IPV6_PREFIXES: readonly { readonly prefix: string; readonly label: string }[] = [
  { prefix: "::1", label: "IPv6 loopback (::1)" },
  { prefix: "::", label: "IPv6 unspecified (::)" },
  { prefix: "fc00::", label: "IPv6 ULA (fc00::/7)" },
  { prefix: "fd00::", label: "IPv6 ULA (fc00::/7)" },
  { prefix: "fe80::", label: "IPv6 link-local (fe80::/10)" },
];

/** True if `host` is an IPv6 literal (unbracketed) or IPv4 in a blocked range. */
function isPrivateIpLiteral(host: string): boolean {
  if (host.includes(":")) {
    return BLOCKED_IPV6_PREFIXES.some(({ prefix }) => host.startsWith(prefix));
  }
  const n = parseIpv4(host);
  if (n === null) return false; // not an IPv4 literal (it's a hostname) — let DNS resolve
  return BLOCKED_IPV4_RANGES.some((r) => n >= r.lo && n <= r.hi);
}

/**
 * Refuse an endpoint URL BEFORE any request is made.
 *
 * WHY THIS EXISTS. This module fetches a caller-supplied URL, which is a
 * server-side request forgery (SSRF) primitive: whatever can influence
 * `endpoint.url` can make this process issue requests from inside the
 * deployment's network. Endpoints are meant to be operator config, not user
 * input — but "meant to be" is not an enforcement mechanism, and this module
 * is the single choke point every call path funnels through, so the check
 * belongs here rather than in each caller.
 *
 * SCOPE, stated honestly: this denies non-HTTP schemes (file:, data:, gopher:
 * and friends), cloud metadata hosts, and literal private/loopback IP
 * addresses (RFC1918, 127/8 loopback, 169.254/16 link-local, RFC6598 CGNAT,
 * IPv6 ULA/link-local/unspecified/loopback). It does NOT block a hostname that
 * merely RESOLVES to a private IP (that requires a DNS-resolution step this
 * fetch layer does not perform, and would block the intended internal sidecar
 * by name). A caller that accepts untrusted URLs needs its own allowlist plus
 * redirect/DNS-poisoning protection in addition to this choke point.
 *
 * This is "defense in depth at the choke point," not a complete SSRF defence —
 * but it closes the literal-IP bypass cheaply and safely.
 */
export function validateEndpointUrl(url: string): { readonly ok: true } | {
  readonly ok: false;
  readonly detail: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, detail: `not a valid absolute URL: ${safeStringify(url)}` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      detail: `unsupported scheme ${JSON.stringify(parsed.protocol)} — only http/https are allowed`,
    };
  }
  // URL.hostname keeps IPv6 literals bracketed; strip so prefix/IPv4 checks
  // see a clean bare address.
  const host = parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (BLOCKED_METADATA_HOSTS.has(host)) {
    return { ok: false, detail: `cloud metadata host is never a model endpoint: ${host}` };
  }
  if (isPrivateIpLiteral(host)) {
    const range = BLOCKED_IPV4_RANGES.find((r) => {
      const n = parseIpv4(host);
      return n !== null && n >= r.lo && n <= r.hi;
    });
    const detailHost = range ? `${host} (${range.label})` : host;
    return { ok: false, detail: `private/loopback IP literal is not a valid model endpoint: ${detailHost}` };
  }
  return { ok: true };
}

/**
 * True if `location` (an absolute URL or a path) points at a host that must
 * never be followed as a redirect target — used to close the
 * redirect-to-internal-IP SSRF bypass. Relative paths (e.g. "/predict") are
 * safe by definition (same origin as the original request) and return false.
 *
 * This reuses the SAME host-set logic as {@link validateEndpointUrl}, so the
 * private/loopback/metadata hosts blocked on the initial URL are also blocked
 * as redirect destinations.
 */
export function locationIsInternalTargetLocation(location: string): boolean {
  // A bare path with no scheme/host is same-origin — safe to follow.
  if (!/^([a-z][a-z0-9+.-]*:)?\/\//i.test(location)) return false;
  let parsed: URL;
  try {
    parsed = new URL(location);
  } catch {
    // Unparseable Location header — reject defensively rather than guess.
    return true;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
  const host = parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (BLOCKED_METADATA_HOSTS.has(host)) return true;
  if (isPrivateIpLiteral(host)) return true;
  return false;
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
  // SSRF choke point: refuse the URL before a request exists. Every call path
  // (getRemoteProbabilities, guardedFetchModelPrediction) funnels through here.
  const urlCheck = validateEndpointUrl(endpoint.url);
  if (!urlCheck.ok) {
    return { name: endpoint.name, reason: "blocked_url", detail: urlCheck.detail };
  }

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
        // Do NOT auto-follow redirects. A redirect can point us at a private /
        // metadata host (redirect-to-internal-IP SSRF bypass), so each hop is
        // validated by hand via `locationIsInternalTargetLocation` below.
        redirect: "manual",
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

  // Manual-redirect handling: a 3xx here is a redirect the server asked us to
  // follow. Validate its Location header before doing anything with it — a
  // redirect to an internal IP/metadata host is an SSRF bypass attempt.
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      return {
        name: endpoint.name,
        reason: "http_error",
        detail: `HTTP ${response.status} redirect had no Location header`,
      };
    }
    if (locationIsInternalTargetLocation(location)) {
      return {
        name: endpoint.name,
        reason: "blocked_redirect",
        detail: `redirect target is a private/loopback/metadata host: ${safeStringify(location).slice(0, 120)}`,
      };
    }
    // A safe-looking absolute redirect target: refuse to silently auto-follow
    // it (that would re-open the bypass in a different layer). Let the caller
    // decide; report it as an HTTP error rather than risk a follow.
    return {
      name: endpoint.name,
      reason: "http_error",
      detail: `HTTP ${response.status} redirect to ${safeStringify(location).slice(0, 120)} — redirects are not auto-followed`,
    };
  }

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
