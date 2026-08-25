/**
 * Provider-misbehaviour contract for the ingest adapters.
 *
 * A picks product whose upstream degrades SILENTLY is worse than one that goes
 * down loudly, because it keeps selling confidence built on a board nobody
 * knows is wrong. These tests stub the transport with the five ways a provider
 * actually misbehaves — a 500 with an HTML body, a 429, a 200 with `{}`, a 200
 * with a renamed/foreign shape, and a hang — and assert each adapter refuses or
 * surfaces it rather than returning a plausible-looking partial.
 *
 * TRANSPORT DISCIPLINE: every stub here is local and throws on any host it was
 * not explicitly told about. Nothing in this file may reach the network — no
 * credentials exist and no live provider may be called from tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEspnOddsForSport } from "../espn-odds-client.js";
import { fetchRundownEventsForSport } from "../rundown-client.js";
import {
  fetchMlbStandings,
  fetchMlbCompletedGamesForDate,
  MlbStatsApiError,
} from "../mlb-statsapi-client.js";
import { OddsApiClient, OddsApiError } from "../odds-api-client.js";
import { getOddsPaymentCircuitBreaker } from "../odds-api-circuit-breaker.js";

afterEach(() => {
  vi.restoreAllMocks();
  // The payment circuit is process-global; a test that drives it to 402 would
  // otherwise refuse every later call in this file.
  getOddsPaymentCircuitBreaker().reset();
});

/* ------------------------------------------------------------------ *
 * Stub transports
 * ------------------------------------------------------------------ */

/** A 500 carrying an HTML error page — the classic CDN/origin failure. */
function html500(): Response {
  return new Response(
    "<!doctype html><html><head><title>500 Internal Server Error</title></head>" +
      "<body><h1>500 Internal Server Error</h1></body></html>",
    { status: 500, headers: { "content-type": "text/html" } },
  );
}

/** A 200 carrying an HTML error page — the SILENT version of the same thing. */
function html200(): Response {
  return new Response(
    "<!doctype html><html><body><h1>Service temporarily unavailable</h1></body></html>",
    { status: 200, headers: { "content-type": "text/html" } },
  );
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * A transport that NEVER settles until its AbortSignal fires.
 *
 * This is the whole point of the timeout tests: with no signal wired through,
 * the returned promise hangs forever and the test times out — which is exactly
 * what a hung upstream does to a cron job. `aborts` records how many calls were
 * actually cancelled, so a passing test also proves the signal reached fetch.
 */
function hangingFetch(): { impl: typeof fetch; calls: () => number; aborts: () => number } {
  let calls = 0;
  let aborts = 0;
  const impl = ((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      calls += 1;
      const signal = init?.signal;
      if (!signal) return; // pre-fix behaviour: hang forever
      if (signal.aborted) {
        aborts += 1;
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        aborts += 1;
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      });
    })) as unknown as typeof fetch;
  return { impl, calls: () => calls, aborts: () => aborts };
}

/** Routes by URL substring and THROWS on any host it was not told about. */
function router(routes: Array<[string, () => Response]>): typeof fetch {
  return (async (url: string | URL) => {
    const u = String(url);
    for (const [needle, make] of routes) {
      if (u.includes(needle)) return make();
    }
    throw new Error(`test transport: unexpected outbound request to ${u}`);
  }) as unknown as typeof fetch;
}

/* ------------------------------------------------------------------ *
 * Timeouts — a hung upstream must not hold the job open
 * ------------------------------------------------------------------ */

describe("timeouts: a hung provider is bounded, not absorbed", () => {
  // Real timers with a deliberately tiny ceiling: `AbortSignal.timeout` runs on
  // Node's internal timer, which vitest's fake timers do not drive. The ceiling
  // is injected purely so the test is fast — production keeps the 10–12s value.
  const TINY_MS = 25;

  it("ESPN public odds aborts a hung scoreboard instead of hanging the ingest cron", async () => {
    const hang = hangingFetch();

    const res = await fetchEspnOddsForSport("baseball_mlb", {
      fetchImpl: hang.impl,
      interEventMs: 0,
      horizonDays: 0,
      timeoutMs: TINY_MS,
    });

    expect(hang.calls()).toBeGreaterThan(0);
    // Every hung call was actively cancelled — i.e. a signal really reached fetch.
    expect(hang.aborts()).toBe(hang.calls());
    // And it fails CLOSED: no events, and the failure is reported.
    expect(res.events).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  it("Rundown aborts a hung day fetch and reports the day as unread", async () => {
    const hang = hangingFetch();

    const res = await fetchRundownEventsForSport("americanfootball_nfl", "test-key", {
      date: "2026-08-25",
      daySpan: 1,
      fetchImpl: hang.impl,
      timeoutMs: TINY_MS,
    });

    expect(hang.calls()).toBe(1);
    expect(hang.aborts()).toBe(1);
    expect(res.events).toEqual([]);
    expect(res.complete).toBe(false);
    expect(res.failedDays).toContain("2026-08-25");
  });

  it("MLB Stats API aborts a hung standings fetch and throws rather than reporting an empty league", async () => {
    const hang = hangingFetch();

    await expect(
      fetchMlbStandings({ season: 2026, fetchImpl: hang.impl, timeoutMs: TINY_MS }),
    ).rejects.toBeInstanceOf(MlbStatsApiError);
    expect(hang.aborts()).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * Empty vs. absent — "no data" and "provider broke" must not collide
 * ------------------------------------------------------------------ */

describe("MLB Stats API: an outage never reads as an empty league", () => {
  it("throws on a 500 with an HTML body instead of returning []", async () => {
    const fetchImpl = router([["statsapi.mlb.com", html500]]);
    await expect(fetchMlbStandings({ season: 2026, fetchImpl })).rejects.toBeInstanceOf(
      MlbStatsApiError,
    );
  });

  it("throws on a 429 instead of returning []", async () => {
    const fetchImpl = router([
      ["statsapi.mlb.com", () => json({ message: "rate limited" }, 429, { "retry-after": "30" })],
    ]);
    const err = await fetchMlbStandings({ season: 2026, fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(MlbStatsApiError);
    expect((err as MlbStatsApiError).status).toBe(429);
  });

  it("throws on a 200 carrying an HTML body (unparseable), not a silent empty table", async () => {
    const fetchImpl = router([["statsapi.mlb.com", html200]]);
    const err = await fetchMlbStandings({ season: 2026, fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(MlbStatsApiError);
    expect((err as Error).message).toMatch(/non-JSON/i);
  });

  it("still returns [] — without throwing — when the provider genuinely publishes no rows", async () => {
    // The distinction has to cut BOTH ways, or this is just a blanket refusal.
    const fetchImpl = router([["statsapi.mlb.com", () => json({ records: [] })]]);
    await expect(fetchMlbStandings({ season: 2026, fetchImpl })).resolves.toEqual([]);
  });

  it("completed-games reader throws on a 500 rather than reporting zero finals", async () => {
    const fetchImpl = router([["statsapi.mlb.com", html500]]);
    await expect(
      fetchMlbCompletedGamesForDate("2026-08-24", { fetchImpl }),
    ).rejects.toBeInstanceOf(MlbStatsApiError);
  });

  it("completed-games reader still returns [] for a genuinely empty slate", async () => {
    const fetchImpl = router([["statsapi.mlb.com", () => json({ dates: [] })]]);
    await expect(
      fetchMlbCompletedGamesForDate("2026-08-24", { fetchImpl }),
    ).resolves.toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Partial success — a truncated span must announce itself
 * ------------------------------------------------------------------ */

describe("Rundown: a truncated day-span is reported as incomplete", () => {
  /** Synthetic Rundown v1 payload. Prices are invented for the test only. */
  function syntheticDay(eventId: string) {
    return {
      events: [
        {
          event_id: eventId,
          event_date: "2026-09-10T00:00:00Z",
          teams: [
            { name: "North Team", is_home: true },
            { name: "South Team", is_away: true },
          ],
          lines: {
            "3": { moneyline: { moneyline_home: -120, moneyline_away: 100 } },
          },
        },
      ],
    };
  }

  it("flags complete=false and names the unread day when one day 500s", async () => {
    let call = 0;
    const fetchImpl = (async (url: string | URL) => {
      const u = String(url);
      if (!u.includes("therundown.io")) {
        throw new Error(`test transport: unexpected outbound request to ${u}`);
      }
      call += 1;
      // Day 1 serves a slate; day 2 is an origin error.
      return call === 1 ? json(syntheticDay("day-1-event")) : html500();
    }) as unknown as typeof fetch;

    const res = await fetchRundownEventsForSport("americanfootball_nfl", "test-key", {
      date: "2026-09-09",
      daySpan: 2,
      fetchImpl,
    });

    // It DID get usable events — which is exactly why a bare `events.length > 0`
    // check at the call site was not enough to notice the truncation.
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.complete).toBe(false);
    expect(res.failedDays).toEqual(["2026-09-10"]);
    expect(res.error).toMatch(/partial/i);
  });

  it("flags complete=false for the day it was 429'd on AND every day it then skipped", async () => {
    let call = 0;
    const fetchImpl = (async (url: string | URL) => {
      const u = String(url);
      if (!u.includes("therundown.io")) {
        throw new Error(`test transport: unexpected outbound request to ${u}`);
      }
      call += 1;
      return call === 1
        ? json(syntheticDay("day-1-event"))
        : json({ message: "rate limited" }, 429, { "retry-after": "60" });
    }) as unknown as typeof fetch;

    const res = await fetchRundownEventsForSport("americanfootball_nfl", "test-key", {
      date: "2026-09-09",
      daySpan: 4,
      fetchImpl,
    });

    expect(res.complete).toBe(false);
    // The 429 aborts the remaining fan-out, so days 2..4 are all unread.
    expect(res.failedDays).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
    // And it does NOT keep hammering a rate-limited endpoint.
    expect(call).toBe(2);
  });

  it("reports complete=true only when every requested day was actually read", async () => {
    let call = 0;
    const fetchImpl = (async (url: string | URL) => {
      const u = String(url);
      if (!u.includes("therundown.io")) {
        throw new Error(`test transport: unexpected outbound request to ${u}`);
      }
      call += 1;
      return json(syntheticDay(`event-${call}`));
    }) as unknown as typeof fetch;

    const res = await fetchRundownEventsForSport("americanfootball_nfl", "test-key", {
      date: "2026-09-09",
      daySpan: 2,
      fetchImpl,
    });

    expect(res.complete).toBe(true);
    expect(res.failedDays).toEqual([]);
    expect(res.error).toBeUndefined();
    expect(res.events.length).toBe(2);
  });
});

/* ------------------------------------------------------------------ *
 * The Odds API — a 200 that is not the documented array must fail loudly
 * ------------------------------------------------------------------ */

describe("The Odds API: a 2xx that is not the documented array fails closed", () => {
  it("rejects a 200 whose body is a JSON OBJECT rather than an event array", async () => {
    // `fetch` does not throw here and neither did the cast: `events.length`
    // became `undefined`, and because `undefined === 0` is false the caller's
    // "primary empty -> use the free paths" branch never fired.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ message: "temporarily unavailable" }));

    const client = new OddsApiClient("test-key");
    const err = await client.getOdds("baseball_mlb", ["h2h"]).catch((e) => e);

    expect(err).toBeInstanceOf(OddsApiError);
    expect((err as Error).message).toMatch(/non-array/i);
  });

  it("rejects a 200 whose body is `{}`", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}));

    const client = new OddsApiClient("test-key");
    await expect(client.getScores("baseball_mlb", 1)).rejects.toBeInstanceOf(OddsApiError);
  });

  it("wraps a 200 carrying an HTML body as an OddsApiError, not a bare SyntaxError", async () => {
    // Unwrapped this surfaced as `SyntaxError: Unexpected token '<'`, which
    // reads to an operator as a data-shape problem and escapes every
    // `instanceof OddsApiError` classification downstream.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(html200());

    const client = new OddsApiClient("test-key");
    const err = await client.getOdds("baseball_mlb", ["h2h"]).catch((e) => e);

    expect(err).toBeInstanceOf(OddsApiError);
    expect((err as OddsApiError).status).toBe(200);
    expect((err as Error).message).toMatch(/non-JSON/i);
  });

  it("still accepts a genuinely empty array (no games today is not an error)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json([], 200, { "x-requests-remaining": "100", "x-requests-used": "1" }),
    );

    const client = new OddsApiClient("test-key");
    await expect(client.getOdds("baseball_mlb", ["h2h"])).resolves.toMatchObject({ data: [] });
  });
});
