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

  it("honors Retry-After for 429 responses before retrying", async () => {
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

    await retryingClient.getSports();

    expect(delays).toEqual([2_000]);
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
