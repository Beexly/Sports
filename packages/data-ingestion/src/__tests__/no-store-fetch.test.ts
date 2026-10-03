import { describe, it, expect, vi, afterEach } from "vitest";
import { noStoreFetch } from "../no-store-fetch.js";
import { OddsApiClient } from "../odds-api-client.js";

/**
 * Regression tests for the 2026-07-10 production incident: Next.js 14's
 * patched fetch cached The Odds API responses in the deployment's Data Cache
 * (frozen quota headers, aging bookmaker timestamps) until the freshness gate
 * rejected every board and the public surface went dark. Every upstream fetch
 * must carry cache:"no-store".
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function okJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-requests-remaining": "100",
      "x-requests-used": "1",
    },
  });
}

describe("noStoreFetch", () => {
  it("injects cache:'no-store' into every request", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJsonResponse([]));

    await noStoreFetch("https://example.test/feed");

    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0]?.[1];
    expect(init?.cache).toBe("no-store");
  });

  it("preserves caller-supplied init options (signal, headers) while forcing no-store", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJsonResponse([]));
    const controller = new AbortController();

    await noStoreFetch("https://example.test/feed", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    const init = spy.mock.calls[0]?.[1];
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBe(controller.signal);
    expect(init?.headers).toEqual({ accept: "application/json" });
  });
});

describe("OddsApiClient cache opt-out (incident regression)", () => {
  it("sends cache:'no-store' on odds fetches so a deployed Next app can never serve cached odds", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJsonResponse([]));

    const client = new OddsApiClient("test-key");
    await client.getOdds("baseball_mlb", ["h2h"]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]?.cache).toBe("no-store");
  });

  it("sends cache:'no-store' on scores fetches so settlement can never read cached finals", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJsonResponse([]));

    const client = new OddsApiClient("test-key");
    await client.getScores("baseball_mlb", 2);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]?.cache).toBe("no-store");
  });
});
