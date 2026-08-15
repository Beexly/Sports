import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OddsApiClient, OddsApiError } from "../odds-api-client.js";
import { getOddsPaymentCircuitBreaker } from "../odds-api-circuit-breaker.js";

const client = new OddsApiClient("test-key");

beforeEach(() => {
  // The payment circuit breaker is a PROCESS-LOCAL SINGLETON — deliberately so
  // in production, where a warm serverless instance should remember the key is
  // unpaid rather than re-learning it every invocation. Inside one test file
  // sharing a module registry, that same persistence leaks between cases: the
  // 401 "bad key" test below opens the circuit (the client treats 401 as a hard
  // auth stop alongside 402), and every later test then fails with "circuit
  // open" instead of exercising its own path. Reset per test so each case
  // starts closed and asserts what it actually intends to.
  getOddsPaymentCircuitBreaker().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
  getOddsPaymentCircuitBreaker().reset();
});

describe("OddsApiClient upstream resilience", () => {
  it("passes an abort signal to fetch so a call can never hang forever", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "100", "x-requests-used": "1" },
      })
    );

    await client.getSports();

    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("wraps a request timeout as an OddsApiError(408) instead of leaking a raw AbortError", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      const err = new Error("The operation timed out.");
      err.name = "TimeoutError";
      throw err;
    });

    await expect(client.getSports()).rejects.toBeInstanceOf(OddsApiError);
    await expect(client.getSports()).rejects.toMatchObject({ status: 408 });
    await expect(client.getSports()).rejects.toThrow(/timed out/i);
  });

  it("wraps a network failure as an OddsApiError with a descriptive message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("ECONNREFUSED");
    });

    await expect(client.getSports()).rejects.toBeInstanceOf(OddsApiError);
    await expect(client.getSports()).rejects.toThrow(/request failed/i);
  });

  it("retries 5xx responses with exponential backoff and jitter before succeeding", async () => {
    const delays: number[] = [];
    const retryingClient = new OddsApiClient("test-key", {
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      maxRetries: 2,
      jitterRatio: 0.5,
      random: () => 0.5,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "x-requests-remaining": "98", "x-requests-used": "3" },
        })
      );

    const result = await retryingClient.getSports();

    expect(spy).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([125, 250]);
    expect(result.remainingRequests).toBe(98);
    expect(result.usedRequests).toBe(3);
  });

  it("does NOT retry 429 responses — quota stop prevents over-spending (GSE-SEC-041)", async () => {
    const delays: number[] = [];
    const retryingClient = new OddsApiClient("test-key", {
      baseDelayMs: 100,
      maxRetries: 1,
      jitterRatio: 0,
      random: () => 0,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "2" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "x-requests-remaining": "10", "x-requests-used": "4" },
        })
      );

    await expect(retryingClient.getSports()).rejects.toThrow(/429/);
    // GSE-SEC-041: 429 breaks the retry loop immediately — no retry, no sleep.
    expect(delays).toEqual([]);
  });

  it("does not retry non-retryable 4xx responses", async () => {
    const retryingClient = new OddsApiClient("test-key", {
      sleep: async () => {
        throw new Error("sleep should not be called");
      },
    });
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bad key", { status: 401 }));

    await expect(retryingClient.getSports()).rejects.toMatchObject({ status: 401 });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("OddsApiClient#getOdds region/bookmaker override (Pinnacle EU leg)", () => {
  it("defaults to regions=<ODDS_REGION> with no bookmakers filter when options is omitted", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "100", "x-requests-used": "1" },
      })
    );

    await client.getOdds("americanfootball_nfl", ["h2h", "spreads", "totals"]);

    const calledUrl = new URL(spy.mock.calls[0]?.[0] as string);
    expect(calledUrl.searchParams.get("regions")).toBe("us");
    expect(calledUrl.searchParams.has("bookmakers")).toBe(false);
    expect(calledUrl.searchParams.get("markets")).toBe("h2h,spreads,totals");
  });

  it("sends regions=eu and bookmakers=pinnacle when passed via options", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "100", "x-requests-used": "1" },
      })
    );

    await client.getOdds("americanfootball_nfl", ["h2h", "spreads", "totals"], {
      regions: "eu",
      bookmakers: ["pinnacle"],
    });

    const calledUrl = new URL(spy.mock.calls[0]?.[0] as string);
    expect(calledUrl.searchParams.get("regions")).toBe("eu");
    expect(calledUrl.searchParams.get("bookmakers")).toBe("pinnacle");
  });
});

/**
 * The status a refusal throws is what downstream classifies on:
 * odds-provider-adapter treats 401/402/403 as `paymentOrAuth`. So the status
 * must distinguish "upstream says unpaid" from "we are locally busy" and from
 * "an operator switched us off".
 */
describe("circuit refusals carry an honest status, not a blanket 402", () => {
  it("a payment-driven open still throws 402 — that one IS a payment fact", async () => {
    const breaker = getOddsPaymentCircuitBreaker();
    breaker.recordPaymentRequired("402 from upstream");

    await expect(client.getSports()).rejects.toMatchObject({ status: 402 });
  });

  it("an operator kill switch throws 503, NOT 402 — nothing about payment is known", async () => {
    process.env["ODDS_API_CIRCUIT_FORCE_OPEN"] = "1";
    try {
      await expect(client.getSports()).rejects.toMatchObject({ status: 503 });
      // Must not be misclassified downstream as an auth/payment failure.
      await expect(client.getSports()).rejects.not.toMatchObject({ status: 402 });
    } finally {
      delete process.env["ODDS_API_CIRCUIT_FORCE_OPEN"];
    }
  });

  it("a closed circuit does not consume or release a probe slot", async () => {
    // Regression for the unowned release: an ordinary closed-circuit request
    // used to run releaseProbe() in its finally, which could clear a slot held
    // by a genuine in-flight probe and admit a second one.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "100", "x-requests-used": "1" },
      }),
    );
    const breaker = getOddsPaymentCircuitBreaker();
    const releaseSpy = vi.spyOn(breaker, "releaseProbe");

    await client.getSports();

    expect(releaseSpy).not.toHaveBeenCalled();
  });
});

describe("api.the-odds-api.com auth: apiKey query param (vendor requires it, confirmed live 2026-08-15)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts apiKey in the URL query string on getOdds", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-requests-remaining": "100",
          "x-requests-used": "1",
        },
      }),
    );

    const client = new OddsApiClient("test-secret-key");
    await client.getOdds("baseball_mlb", ["h2h"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
    // The vendor rejects requests without ?apiKey= — a header-only request
    // returns 401 {"error_code":"MISSING_KEY"}, confirmed against the live API.
    expect(calledUrl.searchParams.get("apiKey")).toBe("test-secret-key");
  });

  it("does not put the API key anywhere else (headers, logs) besides the required query param", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-requests-remaining": "100",
          "x-requests-used": "1",
        },
      }),
    );

    const client = new OddsApiClient("my-secret-key");
    await client.getOdds("baseball_mlb", ["h2h"]);

    const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
    expect(calledUrl.searchParams.get("apiKey")).toBe("my-secret-key");
    // Non-secret params still travel alongside it.
    expect(calledUrl.searchParams.get("regions")).not.toBeNull();
  });

  it("puts apiKey in the URL query string on getScores", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-requests-remaining": "100",
          "x-requests-used": "1",
        },
      }),
    );

    const client = new OddsApiClient("test-secret-key");
    await client.getScores("baseball_mlb");

    const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
    expect(calledUrl.searchParams.get("apiKey")).toBe("test-secret-key");
  });
});

describe("GSE-SEC-041: 429 does not trigger retries (outbound quota stop)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes exactly one request on 429 and does not retry", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "rate limit exceeded" }), {
        status: 429,
        headers: {
          "x-requests-remaining": "0",
          "x-requests-used": "100",
          "retry-after": "60",
        },
      }),
    );

    const client = new OddsApiClient("test-key", {
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    await expect(client.getOdds("baseball_mlb", ["h2h"])).rejects.toThrow(
      "429"
    );

    // On 429, we stop immediately — no retries, no extra upstream calls.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
