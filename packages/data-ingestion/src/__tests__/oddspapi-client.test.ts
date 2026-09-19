import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OddsPapiClient,
  OddsPapiError,
  ODDSPAPI_BASE_URL,
  parseRetryMs,
  parseAmericanPrice,
  dedupeHeartbeatSnapshots,
  deriveClosingSnapshot,
} from "../oddspapi-client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("OddsPapiClient auth", () => {
  it("throws without a key and never invents one", () => {
    expect(() => new OddsPapiClient("")).toThrow(/ODDSPAPI_KEY is required/);
  });

  it("authenticates via the apiKey QUERY param, never a header", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse([]));
    const client = new OddsPapiClient("secret-key-123");
    await client.getSports();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url.startsWith(ODDSPAPI_BASE_URL)).toBe(true);
    expect(new URL(url).searchParams.get("apiKey")).toBe("secret-key-123");
    const headers = new Headers(init.headers);
    expect(headers.get("x-api-key")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
  });

  it("never leaks the key in error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "INVALID_PARAMETER" }), { status: 400 }),
    );
    const client = new OddsPapiClient("super-secret-key");
    const err = await client.getOdds({ fixtureId: "fx1" }).catch((e) => e);
    expect(err).toBeInstanceOf(OddsPapiError);
    expect(String(err.message)).not.toContain("super-secret-key");
  });
});

describe("OddsPapiClient historical-odds guards", () => {
  it("refuses >3 bookmakers client-side before burning quota", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const client = new OddsPapiClient("k");
    await expect(
      client.getHistoricalOdds({
        fixtureId: "fx1",
        bookmakers: ["pinnacle", "bet365", "fanduel", "draftkings"],
      }),
    ).rejects.toThrow(/max 3 bookmakers/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses an empty bookmakers list", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const client = new OddsPapiClient("k");
    await expect(
      client.getHistoricalOdds({ fixtureId: "fx1", bookmakers: [] }),
    ).rejects.toThrow(/bookmakers is required/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns notModified on 304 with an ETag", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 304 }),
    );
    class EtagClient extends OddsPapiClient {
      override etagForFixture(): string {
        return '"etag-1"';
      }
    }
    const client = new EtagClient("k");
    const spy = vi.spyOn(globalThis, "fetch");
    const result = await client.getHistoricalOdds({
      fixtureId: "fx1",
      bookmakers: ["pinnacle"],
    });
    expect(result.notModified).toBe(true);
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("If-None-Match")).toBe('"etag-1"');
  });
});

describe("OddsPapiClient 429 handling", () => {
  it("honors error.retryMs from the 429 body instead of spinning", async () => {
    const sleeps: number[] = [];
    const fetch = vi.spyOn(globalThis, "fetch");
    fetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { retryMs: 60 } }), { status: 429 }),
      )
      .mockResolvedValueOnce(okResponse([]));
    const client = new OddsPapiClient("k", {
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0,
      maxRetries: 2,
    });
    const result = await client.getSports();
    expect(result.data).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
    // 60ms vendor backoff + 300*random(0) cushion
    expect(sleeps[0]).toBe(60);
  });

  it("throws a 429 error carrying retryMs when retries are exhausted", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { retryMs: 250 } }), { status: 429 }),
    );
    const client = new OddsPapiClient("k", {
      sleep: async () => {},
      maxRetries: 0,
    });
    const err = await client.getSports().catch((e) => e);
    expect(err).toBeInstanceOf(OddsPapiError);
    expect(err.status).toBe(429);
    expect(err.retryMs).toBe(250);
  });
});

describe("OddsPapiClient cooldowns", () => {
  it("spaces /odds calls by the 500ms vendor cooldown", async () => {
    const sleeps: number[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      okResponse({}),
    );
    const client = new OddsPapiClient("k", {
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      now: () => 0,
    });
    await client.getOdds({ fixtureId: "fx1" });
    await client.getOdds({ fixtureId: "fx1" });
    expect(sleeps).toEqual([500]);
  });

  it("spaces /historical-odds calls by the 5000ms vendor cooldown", async () => {
    const sleeps: number[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      okResponse({ bookmakers: {} }),
    );
    const client = new OddsPapiClient("k", {
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      now: () => 0,
    });
    await client.getHistoricalOdds({ fixtureId: "fx1", bookmakers: ["pinnacle"] });
    await client.getHistoricalOdds({ fixtureId: "fx1", bookmakers: ["pinnacle"] });
    expect(sleeps).toEqual([5000]);
  });
});

describe("parseRetryMs / parseAmericanPrice", () => {
  it("parses valid retryMs, null on junk", () => {
    expect(parseRetryMs('{"error":{"retryMs":250}}')).toBe(250);
    expect(parseRetryMs('{"error":{}}')).toBeNull();
    expect(parseRetryMs("not json")).toBeNull();
    expect(parseRetryMs('{"error":{"retryMs":-5}}')).toBeNull();
  });

  it("parses American odds strings, null on junk", () => {
    expect(parseAmericanPrice("-110")).toBe(-110);
    expect(parseAmericanPrice("+150")).toBe(150);
    expect(parseAmericanPrice("(-110)")).toBe(-110);
    expect(parseAmericanPrice(null)).toBeNull();
    expect(parseAmericanPrice("abc")).toBeNull();
  });
});

describe("historical snapshot helpers", () => {
  const snap = (id: string, createdAt: string, price: number, active = true) => ({
    id,
    createdAt,
    price,
    limit: null,
    active,
    exchangeMeta: undefined,
  });

  it("dedupes consecutive identical prices (heartbeats, not moves)", () => {
    const rows = [
      snap("1", "2026-09-01T00:00:00Z", 1.9),
      snap("2", "2026-09-01T00:01:00Z", 1.9),
      snap("3", "2026-09-01T00:02:00Z", 1.95),
      snap("4", "2026-09-01T00:03:00Z", 1.95),
    ];
    expect(dedupeHeartbeatSnapshots(rows).map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("derives the close as the last active snapshot before kickoff", () => {
    const rows = [
      snap("1", "2026-09-01T00:00:00Z", 1.9),
      snap("2", "2026-09-01T12:00:00Z", 1.85),
      snap("3", "2026-09-01T20:00:00Z", 1.8), // after kickoff 13:00Z
      snap("4", "2026-09-01T11:00:00Z", 1.87, false), // inactive
    ];
    const close = deriveClosingSnapshot(rows, "2026-09-01T13:00:00Z");
    expect(close?.id).toBe("2");
  });

  it("returns null for an unparseable kickoff", () => {
    expect(deriveClosingSnapshot([snap("1", "2026-09-01T00:00:00Z", 1.9)], "junk")).toBeNull();
  });
});
