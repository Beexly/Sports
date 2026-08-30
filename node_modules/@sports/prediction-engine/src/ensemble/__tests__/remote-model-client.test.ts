import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCircuitBreaker,
  DEFAULT_TIMEOUT_MS,
  fetchModelPrediction,
  getRemoteProbabilities,
  guardedFetchModelPrediction,
  isRemoteModelFailure,
  locationIsInternalTargetLocation,
  validateEndpointUrl,
  type GameContext,
  type ModelEndpoint,
  type RemoteModelFailure,
  type RemoteModelPrediction,
} from "../remote-model-client.js";

const CTX: GameContext = { gameId: "g1", homeTeam: "HOME", awayTeam: "AWAY" };

function endpoint(overrides: Partial<ModelEndpoint> = {}): ModelEndpoint {
  return { name: "sidecar-a", url: "https://sidecar.example/predict", enabled: true, ...overrides };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A fetch mock that never settles — used to exercise the timeout path. */
function hangingFetch(): typeof fetch {
  return vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
}

describe("fetchModelPrediction", () => {
  it("returns a RemoteModelPrediction for a valid response", async () => {
    const mockFetch = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ probability: 0.63 }));
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(false);
    expect(result).toEqual({ name: "sidecar-a", probability: 0.63 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    if (call === undefined) throw new Error("expected fetch to have been called");
    const [url, init] = call;
    if (init === undefined) throw new Error("expected an init object");
    expect(url).toBe("https://sidecar.example/predict");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(CTX);
  });

  it("returns http_error on a non-2xx status without throwing", async () => {
    const mockFetch = vi.fn(async () => new Response("server error", { status: 500, statusText: "Internal Server Error" }));
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(true);
    const failure = result as RemoteModelFailure;
    expect(failure.reason).toBe("http_error");
    expect(failure.name).toBe("sidecar-a");
    expect(failure.detail).toContain("500");
  });

  it("returns malformed_response for a body that is not valid JSON", async () => {
    const mockFetch = vi.fn(
      async () => new Response("not json {{{", { status: 200, headers: { "content-type": "application/json" } }),
    );
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(true);
    expect((result as RemoteModelFailure).reason).toBe("malformed_response");
  });

  it("returns malformed_response when probability is missing", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ notProbability: 0.5 }));
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(true);
    expect((result as RemoteModelFailure).reason).toBe("malformed_response");
  });

  it("returns malformed_response when probability has the wrong type", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ probability: "0.5" }));
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(true);
    expect((result as RemoteModelFailure).reason).toBe("malformed_response");
  });

  // The single most important adversarial case: a remote model returning a
  // bad number must never contaminate anything downstream.
  it.each([1.4, -0.2, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "returns malformed_response for out-of-range probability %p",
    async (badProbability) => {
      const mockFetch = vi.fn(async () => jsonResponse({ probability: badProbability }));
      const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("malformed_response");
    },
  );

  it("accepts boundary probabilities 0 and 1", async () => {
    for (const p of [0, 1]) {
      const mockFetch = vi.fn(async () => jsonResponse({ probability: p }));
      const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
      expect(isRemoteModelFailure(result)).toBe(false);
      expect((result as RemoteModelPrediction).probability).toBe(p);
    }
  });

  it("returns network_error (not an uncaught rejection) when fetch rejects", async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error("DNS lookup failed");
    });
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(true);
    const failure = result as RemoteModelFailure;
    expect(failure.reason).toBe("network_error");
    expect(failure.detail).toContain("DNS lookup failed");
  });

  it("returns network_error when fetch throws synchronously", async () => {
    const mockFetch = vi.fn(() => {
      throw new Error("synchronous boom");
    });
    const result = await fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(result)).toBe(true);
    expect((result as RemoteModelFailure).reason).toBe("network_error");
  });

  describe("timeouts", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves a timeout failure at approximately the configured timeout, not real latency, for a fetch that never resolves", async () => {
      const mockFetch = hangingFetch();
      const promise = fetchModelPrediction(endpoint({ timeoutMs: 500 }), CTX, {
        fetch: mockFetch,
      });

      // Not yet at the timeout: nothing should have settled.
      let settled = false;
      void promise.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(499);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      const result = await promise;
      expect(isRemoteModelFailure(result)).toBe(true);
      const failure = result as RemoteModelFailure;
      expect(failure.reason).toBe("timeout");
      expect(failure.detail).toContain("500");
    });

    it("uses DEFAULT_TIMEOUT_MS when the endpoint does not specify timeoutMs", async () => {
      const mockFetch = hangingFetch();
      const promise = fetchModelPrediction(endpoint(), CTX, { fetch: mockFetch });
      await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
      const result = await promise;
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("timeout");
    });

    it("treats a fetch that resolves AFTER the timeout as a timeout, not a late success", async () => {
      // The mock ignores the abort signal entirely and resolves slowly —
      // the module must not depend on the mock honoring AbortController.
      const mockFetch = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(() => resolve(jsonResponse({ probability: 0.9 })), 5000);
          }),
      ) as unknown as typeof fetch;

      const promise = fetchModelPrediction(endpoint({ timeoutMs: 200 }), CTX, { fetch: mockFetch });
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("timeout");
    });

    it("aborts the underlying request signal on timeout", async () => {
      let capturedSignal: AbortSignal | undefined;
      const mockFetch = vi.fn((_url: string, init?: RequestInit) => {
        capturedSignal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      }) as unknown as typeof fetch;

      const promise = fetchModelPrediction(endpoint({ timeoutMs: 100 }), CTX, { fetch: mockFetch });
      await vi.advanceTimersByTimeAsync(100);
      await promise;
      expect(capturedSignal?.aborted).toBe(true);
    });
  });
});

describe("getRemoteProbabilities", () => {
  it("partitions succeeded and failed across mixed endpoints", async () => {
    const endpoints: ModelEndpoint[] = [
      endpoint({ name: "good", url: "https://good.example" }),
      endpoint({ name: "bad", url: "https://bad.example" }),
    ];
    const mockFetch = vi.fn(async (url: string) => {
      if (url === "https://good.example") return jsonResponse({ probability: 0.7 });
      return new Response("nope", { status: 503 });
    });

    const result = await getRemoteProbabilities(endpoints, CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(result.succeeded).toEqual([{ name: "good", probability: 0.7 }]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.name).toBe("bad");
    expect(result.failed[0]?.reason).toBe("http_error");
  });

  it("never fetches disabled endpoints, and does not report them as failures", async () => {
    const endpoints: ModelEndpoint[] = [
      endpoint({ name: "on", url: "https://on.example", enabled: true }),
      endpoint({ name: "off", url: "https://off.example", enabled: false }),
    ];
    const mockFetch = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ probability: 0.5 }));

    const result = await getRemoteProbabilities(endpoints, CTX, { fetch: mockFetch as unknown as typeof fetch });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrls = mockFetch.mock.calls.map((call) => call[0]);
    expect(calledUrls).toEqual(["https://on.example"]);
    expect(result.succeeded).toEqual([{ name: "on", probability: 0.5 }]);
    expect(result.failed).toEqual([]);
  });

  it("resolves (does not reject) with an empty succeeded array when every endpoint fails", async () => {
    const endpoints: ModelEndpoint[] = [
      endpoint({ name: "a", url: "https://a.example" }),
      endpoint({ name: "b", url: "https://b.example" }),
    ];
    const mockFetch = vi.fn(async () => new Response("down", { status: 500 }));

    await expect(
      getRemoteProbabilities(endpoints, CTX, { fetch: mockFetch as unknown as typeof fetch }),
    ).resolves.toEqual({
      succeeded: [],
      failed: [
        { name: "a", reason: "http_error", detail: expect.stringContaining("500") },
        { name: "b", reason: "http_error", detail: expect.stringContaining("500") },
      ],
    });
  });

  it("resolves with empty succeeded/failed when no endpoints are enabled", async () => {
    const endpoints: ModelEndpoint[] = [endpoint({ enabled: false })];
    const mockFetch = vi.fn();
    const result = await getRemoteProbabilities(endpoints, CTX, { fetch: mockFetch as unknown as typeof fetch });
    expect(result).toEqual({ succeeded: [], failed: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("circuit breaker", () => {
  it("starts closed for an unseen endpoint", () => {
    const breaker = createCircuitBreaker();
    expect(breaker.getState("fresh", 0)).toBe("closed");
    expect(breaker.tryAcquire("fresh", 0)).toEqual({ allowed: true, state: "closed" });
  });

  it("opens after N consecutive failures and short-circuits without calling fetch", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 10_000 });
    const name = "flaky";

    for (let i = 0; i < 3; i += 1) {
      const acq = breaker.tryAcquire(name, 0);
      expect(acq.allowed).toBe(true);
      breaker.recordOutcome(name, "failure", 0);
    }

    expect(breaker.getState(name, 0)).toBe("open");
    const refused = breaker.tryAcquire(name, 1);
    expect(refused).toEqual({ allowed: false, state: "open" });
  });

  it("does not open before the threshold is reached", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 10_000 });
    const name = "almost";
    breaker.recordOutcome(name, "failure", 0);
    breaker.recordOutcome(name, "failure", 0);
    expect(breaker.getState(name, 0)).toBe("closed");
    expect(breaker.tryAcquire(name, 0).allowed).toBe(true);
  });

  it("a success resets the consecutive-failure counter", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 10_000 });
    const name = "recovering";
    breaker.recordOutcome(name, "failure", 0);
    breaker.recordOutcome(name, "failure", 0);
    breaker.recordOutcome(name, "success", 0);
    breaker.recordOutcome(name, "failure", 0);
    breaker.recordOutcome(name, "failure", 0);
    // Only 2 consecutive failures since the reset — still closed.
    expect(breaker.getState(name, 0)).toBe("closed");
    expect(breaker.snapshot(name, 0).consecutiveFailures).toBe(2);
  });

  it("transitions open -> half-open only after resetAfterMs, allowing exactly one trial call", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 1000 });
    const name = "cooling-down";

    breaker.recordOutcome(name, "failure", 0);
    expect(breaker.getState(name, 0)).toBe("open");
    expect(breaker.getState(name, 999)).toBe("open");
    expect(breaker.tryAcquire(name, 999).allowed).toBe(false);

    // Exactly at resetAfterMs: half-open, one trial allowed.
    expect(breaker.getState(name, 1000)).toBe("half-open");
    const first = breaker.tryAcquire(name, 1000);
    expect(first).toEqual({ allowed: true, state: "half-open" });

    // A second concurrent caller must be refused while the trial is in flight.
    const second = breaker.tryAcquire(name, 1000);
    expect(second).toEqual({ allowed: false, state: "half-open" });
  });

  it("a successful half-open trial closes the circuit", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 1000 });
    const name = "recovers";

    breaker.recordOutcome(name, "failure", 0);
    expect(breaker.tryAcquire(name, 1000).allowed).toBe(true);
    breaker.recordOutcome(name, "success", 1000);

    expect(breaker.getState(name, 1000)).toBe("closed");
    expect(breaker.snapshot(name, 1000)).toEqual({
      state: "closed",
      consecutiveFailures: 0,
      openedAtMs: null,
    });
    // Fully usable again, not stuck mid-trial.
    expect(breaker.tryAcquire(name, 1000)).toEqual({ allowed: true, state: "closed" });
  });

  it("a failed half-open trial re-opens the circuit and restarts the reset window", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 1000 });
    const name = "relapses";

    breaker.recordOutcome(name, "failure", 0);
    expect(breaker.tryAcquire(name, 1000).allowed).toBe(true); // consumes the half-open trial
    breaker.recordOutcome(name, "failure", 1000);

    // Immediately re-opened, not closed.
    expect(breaker.getState(name, 1000)).toBe("open");
    expect(breaker.tryAcquire(name, 1000).allowed).toBe(false);

    // Window restarted from t=1000, not from the original open at t=0.
    expect(breaker.getState(name, 1999)).toBe("open");
    expect(breaker.getState(name, 2000)).toBe("half-open");
  });

  it("tracks state independently per endpoint name", () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 1000 });
    breaker.recordOutcome("a", "failure", 0);
    expect(breaker.getState("a", 0)).toBe("open");
    expect(breaker.getState("b", 0)).toBe("closed");
  });
});

describe("guardedFetchModelPrediction", () => {
  it("calls fetch and records success when the circuit is closed", async () => {
    const breaker = createCircuitBreaker({ failureThreshold: 2, resetAfterMs: 1000 });
    const mockFetch = vi.fn(async () => jsonResponse({ probability: 0.55 }));

    const result = await guardedFetchModelPrediction(breaker, endpoint(), CTX, {
      nowMs: 0,
      fetch: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual({ name: "sidecar-a", probability: 0.55 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(breaker.getState("sidecar-a", 0)).toBe("closed");
  });

  it("opens the circuit after enough guarded failures, then short-circuits without calling fetch", async () => {
    const breaker = createCircuitBreaker({ failureThreshold: 2, resetAfterMs: 5000 });
    const mockFetch = vi.fn(async () => new Response("down", { status: 500 }));
    const ep = endpoint({ name: "unreliable" });

    const r1 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 0, fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(r1)).toBe(true);
    const r2 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 1, fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(r2)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(breaker.getState("unreliable", 1)).toBe("open");

    // Third call: circuit is open, fetch must NOT be invoked again.
    const r3 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 2, fetch: mockFetch as unknown as typeof fetch });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(isRemoteModelFailure(r3)).toBe(true);
    expect((r3 as RemoteModelFailure).reason).toBe("network_error");
  });

  it("runs the full open -> half-open -> closed state machine through the guarded call", async () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 1000 });
    const ep = endpoint({ name: "flappy" });
    let shouldFail = true;
    const mockFetch = vi.fn(async () =>
      shouldFail ? new Response("down", { status: 500 }) : jsonResponse({ probability: 0.5 }),
    );

    // Failure opens the circuit.
    const r1 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 0, fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(r1)).toBe(true);
    expect(breaker.getState("flappy", 0)).toBe("open");

    // Still within the reset window: short-circuited, fetch not called again.
    const r2 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 500, fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(r2)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After resetAfterMs: half-open trial permitted; make it succeed.
    shouldFail = false;
    const r3 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 1000, fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(r3)).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(breaker.getState("flappy", 1000)).toBe("closed");

    // Fully recovered: subsequent calls proceed normally.
    const r4 = await guardedFetchModelPrediction(breaker, ep, CTX, { nowMs: 1001, fetch: mockFetch as unknown as typeof fetch });
    expect(isRemoteModelFailure(r4)).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("keeps circuit state independent per endpoint name across guarded calls", async () => {
    const breaker = createCircuitBreaker({ failureThreshold: 1, resetAfterMs: 1000 });
    const failingFetch = vi.fn(async () => new Response("down", { status: 500 }));
    const okFetch = vi.fn(async () => jsonResponse({ probability: 0.5 }));

    await guardedFetchModelPrediction(breaker, endpoint({ name: "x" }), CTX, {
      nowMs: 0,
      fetch: failingFetch as unknown as typeof fetch,
    });
    expect(breaker.getState("x", 0)).toBe("open");

    const okResult = await guardedFetchModelPrediction(breaker, endpoint({ name: "y" }), CTX, {
      nowMs: 0,
      fetch: okFetch as unknown as typeof fetch,
    });
    expect(isRemoteModelFailure(okResult)).toBe(false);
    expect(breaker.getState("y", 0)).toBe("closed");
  });
});

/**
 * SSRF hardening. This module fetches a caller-supplied URL, which is a
 * server-side request forgery primitive. The guard runs BEFORE any request
 * exists, so the load-bearing assertion in each case is not just "it returned
 * a failure" but "fetch was never called at all".
 */
describe("endpoint URL validation (SSRF guard)", () => {
  it("refuses non-http(s) schemes without issuing a request", async () => {
    for (const url of [
      "file:///etc/passwd",
      "data:text/plain,probability",
      "gopher://internal:70/_probe",
      "ftp://internal/x",
    ]) {
      const spy = vi.fn();
      const result = await fetchModelPrediction(endpoint({ url }), CTX, {
        fetch: spy as unknown as typeof fetch,
      });
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("blocked_url");
      // The point of the guard: no request was ever attempted.
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it("refuses cloud metadata hosts — the classic SSRF credential-theft target", async () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      "http://[fd00:ec2::254]/latest/meta-data/",
      "http://metadata.google.internal/computeMetadata/v1/",
      "https://METADATA.GOOGLE.INTERNAL/computeMetadata/v1/", // case-insensitive
    ]) {
      const spy = vi.fn();
      const result = await fetchModelPrediction(endpoint({ url }), CTX, {
        fetch: spy as unknown as typeof fetch,
      });
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("blocked_url");
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it("refuses a malformed / relative URL", async () => {
    const spy = vi.fn();
    const result = await fetchModelPrediction(endpoint({ url: "/predict/tda" }), CTX, {
      fetch: spy as unknown as typeof fetch,
    });
    expect((result as RemoteModelFailure).reason).toBe("blocked_url");
    expect(spy).not.toHaveBeenCalled();
  });

  it("STILL ALLOWS the intended internal sidecar host (guard must not break the use case)", async () => {
    const okFetch = vi.fn(async () => jsonResponse({ probability: 0.61 }));
    const result = await fetchModelPrediction(
      endpoint({ url: "http://gse-ml-service:8000/predict/etkf" }),
      CTX,
      { fetch: okFetch as unknown as typeof fetch },
    );
    expect(isRemoteModelFailure(result)).toBe(false);
    expect((result as RemoteModelPrediction).probability).toBe(0.61);
    expect(okFetch).toHaveBeenCalledTimes(1);
  });

  it("blocks through every call path, not just the direct one", async () => {
    const spy = vi.fn();
    const blocked = endpoint({ name: "evil", url: "file:///etc/shadow" });

    const fanned = await getRemoteProbabilities([blocked], CTX, {
      fetch: spy as unknown as typeof fetch,
    });
    expect(fanned.succeeded).toHaveLength(0);
    expect(fanned.failed[0]?.reason).toBe("blocked_url");

    const breaker = createCircuitBreaker();
    const guarded = await guardedFetchModelPrediction(breaker, blocked, CTX, {
      nowMs: 0,
      fetch: spy as unknown as typeof fetch,
    });
    expect((guarded as RemoteModelFailure).reason).toBe("blocked_url");

    expect(spy).not.toHaveBeenCalled();
  });

  it("validateEndpointUrl is directly testable and reports why", () => {
    expect(validateEndpointUrl("https://sidecar.example/predict").ok).toBe(true);
    expect(validateEndpointUrl("http://gse-ml-service:8000/x").ok).toBe(true);

    const scheme = validateEndpointUrl("file:///etc/passwd");
    expect(scheme.ok).toBe(false);
    expect(scheme.ok === false && scheme.detail).toMatch(/scheme/i);

    const meta = validateEndpointUrl("http://169.254.169.254/");
    expect(meta.ok).toBe(false);
    expect(meta.ok === false && meta.detail).toMatch(/metadata/i);
  });

  // --- P5-11 additions: RFC1918 private / loopback IP literal blocking ---
  it("refuses RFC1918 / loopback / metadata IP literals without issuing a request", async () => {
    for (const url of [
      "http://127.0.0.1:8000/predict",
      "http://127.0.0.1/predict",
      "http://10.0.0.1/predict",
      "http://10.255.255.255/predict",
      "http://172.16.0.2/predict",
      "http://172.31.255.254/predict",
      "http://192.168.1.1/predict",
      "http://192.168.0.0/predict",
      "http://0.0.0.0/predict",
      "http://[::1]/predict",
      "http://[fc00::1]/predict",
      "http://[fe80::1]/predict",
    ]) {
      const spy = vi.fn();
      const result = await fetchModelPrediction(endpoint({ url }), CTX, {
        fetch: spy as unknown as typeof fetch,
      });
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("blocked_url");
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it("validateEndpointUrl rejects private IP literals directly", () => {
    expect(validateEndpointUrl("http://127.0.0.1/x").ok).toBe(false);
    expect(validateEndpointUrl("http://10.0.0.1/x").ok).toBe(false);
    expect(validateEndpointUrl("http://192.168.0.0/x").ok).toBe(false);
    expect(validateEndpointUrl("http://[::1]/x").ok).toBe(false);
    const v6 = validateEndpointUrl("http://[::1]/x");
    expect(v6.ok).toBe(false);
    expect(v6.ok === false ? v6.detail : "").toMatch(/private\/loopback/i);
  });

  it("blocks a redirect to an internal IP (redirect-to-internal-IP SSRF bypass)", async () => {
    for (const location of [
      "http://127.0.0.1/admin",
      "http://10.0.0.1/secrets",
      "http://169.254.169.254/latest/meta-data/",
      "http://192.168.1.1/predict",
    ]) {
      const spy = vi.fn(async () =>
        new Response(null, { status: 302, headers: { location } }),
      );
      const result = await fetchModelPrediction(
        endpoint({ url: "https://sidecar.example/predict" }),
        CTX,
        { fetch: spy as unknown as typeof fetch },
      );
      expect(isRemoteModelFailure(result)).toBe(true);
      expect((result as RemoteModelFailure).reason).toBe("blocked_redirect");
      expect((result as RemoteModelFailure).detail).toMatch(/private|metadata/i);
    }
  });

  it("does not follow a redirect to a safe absolute URL (no silent follow)", async () => {
    const spy = vi.fn(async () =>
      new Response(null, { status: 302, headers: { location: "https://elsewhere.example/x" } }),
    );
    const result = await fetchModelPrediction(
      endpoint({ url: "https://sidecar.example/predict" }),
      CTX,
      { fetch: spy as unknown as typeof fetch },
    );
    expect(isRemoteModelFailure(result)).toBe(true);
    expect((result as RemoteModelFailure).reason).toBe("http_error");
    expect((result as RemoteModelFailure).detail).toMatch(/redirect/i);
  });

  it("locationIsInternalTargetLocation classifies hosts correctly", () => {
    // Same-origin relative paths are safe.
    expect(locationIsInternalTargetLocation("/predict/v2")).toBe(false);
    expect(locationIsInternalTargetLocation("relative/path")).toBe(false);
    // Private / metadata absolute targets are internal.
    expect(locationIsInternalTargetLocation("http://127.0.0.1/x")).toBe(true);
    expect(locationIsInternalTargetLocation("http://10.0.0.1/x")).toBe(true);
    expect(locationIsInternalTargetLocation("http://169.254.169.254/x")).toBe(true);
    expect(locationIsInternalTargetLocation("http://192.168.1.1/x")).toBe(true);
    expect(locationIsInternalTargetLocation("http://[::1]/x")).toBe(true);
    // Public hosts are not internal.
    expect(locationIsInternalTargetLocation("https://sidecar.example/x")).toBe(false);
    // Non-http(s) schemes in a Location are treated as internal (reject).
    expect(locationIsInternalTargetLocation("file:///etc/passwd")).toBe(true);
  });
});
