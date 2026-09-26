"use strict";
/**
 * HTTP client tests.
 *
 * These run against a scripted fake fetch, so they assert the behaviours that
 * only show up in the field: what happens on the third retry, what a 503 gate
 * body means, and — most importantly — that a cached payload is never presented
 * as a fresh one.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { GseClient } = require("/tmp/gsebuild/api/client.js");
const { Cache, MemoryCacheStorage } = require("/tmp/gsebuild/api/cache.js");

const BASE = "https://www.galaxysportsedge.com";

function jsonResponse(body, status = 200, headers = {}) {
  return {
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  };
}

function textResponse(text, status = 200, headers = {}) {
  return {
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => text,
  };
}

/** A fetch that pops responses in order and records every call. */
function scripted(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (typeof next === "function") return next(url, init);
    if (next instanceof Error) throw next;
    return next;
  };
  return { impl, calls };
}

const identity = (body) => body;

function makeClient(responses, overrides = {}) {
  const { impl, calls } = scripted(responses);
  const cache = new Cache(new MemoryCacheStorage());
  const events = [];
  const client = new GseClient({
    baseUrl: BASE,
    cache,
    fetchImpl: impl,
    maxAttempts: 3,
    onEvent: (e) => events.push(e),
    ...overrides,
  });
  return { client, calls, cache, events };
}

/* ── Success path ──────────────────────────────────────────────────────── */

test("a 200 decodes and is not marked as cached", async () => {
  const { client } = makeClient([jsonResponse({ success: true, value: 7 })]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, true);
  assert.equal(res.fromCache, false);
  assert.equal(res.cacheAgeMs, 0);
  assert.equal(res.data.value, 7);
});

test("query parameters are encoded, and empties are dropped", async () => {
  const { client, calls } = makeClient([jsonResponse({ success: true })]);
  await client.request("/api/picks", {
    decode: identity,
    query: { sport: "NFL", date: "2026-09-15", grade: undefined, empty: "" },
  });
  const url = calls[0].url;
  assert.match(url, /sport=NFL/);
  assert.match(url, /date=2026-09-15/);
  assert.doesNotMatch(url, /grade=/);
  assert.doesNotMatch(url, /empty=/);
});

/* ── Malformed bodies ──────────────────────────────────────────────────── */

test("unparseable JSON is a malformed failure, never a silent pass", async () => {
  const { client } = makeClient([textResponse("<html>gateway</html>")]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "malformed");
});

test("a decoder rejection is surfaced as malformed with the decoder's reason", async () => {
  const { client } = makeClient([jsonResponse({ success: true, wrong: "shape" })]);
  const res = await client.request("/api/thing", {
    decode: () => {
      throw new Error("missing picks array");
    },
  });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "malformed");
  assert.match(res.detail, /missing picks array/);
});

/* ── Gates ─────────────────────────────────────────────────────────────── */

test("a 503 bootstrap gate is read as a gate, NOT as an outage", async () => {
  const { client } = makeClient([
    jsonResponse({ success: false, error: "Public picks are not published yet.", code: "bootstrap" }, 503),
  ]);
  const res = await client.request("/api/picks", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "gated");
  assert.match(res.message, /not published yet/);
});

test("a stale-data gate is a DIFFERENT failure kind from a bootstrap gate", async () => {
  // The server emits distinct bodies so an env regression can be told from a
  // data outage. If these collapsed into one kind, the distinction died here.
  const { client } = makeClient([
    jsonResponse(
      { success: false, error: "Awaiting fresh data.", code: "stale_data" },
      503,
    ),
  ]);
  const res = await client.request("/api/picks", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "stale");
});

test("a gate is never retried", async () => {
  const { client, calls } = makeClient([
    jsonResponse({ success: false, error: "not yet", code: "bootstrap" }, 503),
  ]);
  await client.request("/api/picks", { decode: identity });
  assert.equal(calls.length, 1, "a gate was retried");
});

test("a 200 carrying a gate envelope is not rendered as a payload", async () => {
  const { client } = makeClient([
    jsonResponse({ success: false, error: "Rate limited", code: "rate_limited" }, 200),
  ]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "rate_limited");
});

/* ── 429 and Retry-After ───────────────────────────────────────────────── */

test("a 429 honours Retry-After rather than a hardcoded backoff", async () => {
  let served = 0;
  const { client } = makeClient([
    () => {
      served += 1;
      if (served === 1) {
        return jsonResponse({ error: "Too many requests." }, 429, { "retry-after": "0" });
      }
      return jsonResponse({ success: true, ok: true });
    },
  ]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, true);
  assert.equal(served, 2);
});

test("a 429 that persists is reported with the server's own copy", async () => {
  const { client } = makeClient([
    jsonResponse({ error: "Too many requests. Please wait and try again." }, 429, { "retry-after": "0" }),
  ]);
  const res = await client.request("/api/thing", { decode: identity, });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "rate_limited");
  assert.match(res.message, /Please wait and try again/);
  assert.equal(res.retryAfterSec, 0);
});

/* ── Auth ──────────────────────────────────────────────────────────────── */

test("a 401 is never retried", async () => {
  const { client, calls } = makeClient([jsonResponse({ error: "Sign in." }, 401)]);
  const res = await client.request("/api/watchlist", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "auth");
  assert.equal(calls.length, 1);
});

test("a bearer token is attached when provided", async () => {
  const { client, calls } = makeClient([jsonResponse({ success: true })]);
  await client.request("/api/watchlist", { decode: identity, token: "tok_123" });
  assert.equal(calls[0].init.headers.Authorization, "Bearer tok_123");
});

test("no Authorization header is sent when there is no token", async () => {
  const { client, calls } = makeClient([jsonResponse({ success: true })]);
  await client.request("/api/board/state", { decode: identity });
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

/* ── Retry on 5xx ──────────────────────────────────────────────────────── */

test("a 5xx is retried and a later success wins", async () => {
  let served = 0;
  const { client, calls } = makeClient([
    () => {
      served += 1;
      return served < 2 ? jsonResponse({ error: "boom" }, 500) : jsonResponse({ success: true, n: served });
    },
  ]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, true);
  assert.equal(res.data.n, 2);
  assert.equal(calls.length, 2);
});

test("a persistent 5xx gives up after maxAttempts and reports server error", async () => {
  const { client, calls } = makeClient([jsonResponse({ error: "boom" }, 500)]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "server");
  assert.equal(calls.length, 3, "did not stop at maxAttempts");
});

test("a network exception is retried, then surfaces as a network failure", async () => {
  const { client, calls } = makeClient([new Error("ECONNRESET")]);
  const res = await client.request("/api/thing", { decode: identity });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "network");
  assert.equal(calls.length, 3);
});

/* ── Cache ─────────────────────────────────────────────────────────────── */

test("a fresh cache hit skips the network entirely", async () => {
  const { client, calls } = makeClient([jsonResponse({ success: true, v: 1 })]);
  await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    freshness: "board",
  });
  const second = await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    freshness: "board",
  });
  assert.equal(calls.length, 1, "the second read hit the network");
  assert.equal(second.fromCache, true);
});

test("a FAILED request falls back to cache but marks it cached with a real age", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("board", { rows: 3 }, null);
  // Age the entry by an hour.
  const raw = JSON.parse(await cache["storage"].get("gse.cache.v1:board"));
  raw.storedAt = Date.now() - 60 * 60 * 1000;
  await cache["storage"].set("gse.cache.v1:board", JSON.stringify(raw));

  const { impl } = scripted([new Error("offline")]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });
  const res = await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    budgetMs: 60_000,
  });
  assert.equal(res.ok, true);
  assert.equal(res.fromCache, true, "a cached body was returned as fresh");
  assert.ok(res.cacheAgeMs >= 3_500_000, `cacheAgeMs was ${res.cacheAgeMs}`);
  assert.equal(res.data.rows, 3);
});

test("a GATE with a cache behind it serves the cache — labelled, not silent", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("picks", { rows: [] }, "2026-09-14T00:00:00Z");
  const { impl } = scripted([
    jsonResponse({ success: false, error: "Awaiting fresh data.", code: "stale_data" }, 503),
  ]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });
  const res = await client.request("/api/picks", {
    decode: identity,
    cacheKey: "picks",
    budgetMs: 0,
  });
  assert.equal(res.ok, true);
  assert.equal(res.fromCache, true);
  assert.equal(res.asOf, "2026-09-14T00:00:00Z");
});

test("a failure with NO cache is a failure, not an empty success", async () => {
  const { client } = makeClient([new Error("offline")], { maxAttempts: 1 });
  const res = await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    freshness: "board",
  });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "network");
});

test("a non-GET is never served from cache", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("watch", { ok: true }, null);
  const { impl, calls } = scripted([jsonResponse({ success: true, written: true })]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });
  const res = await client.request("/api/watchlist/follow", {
    method: "POST",
    body: { id: "x" },
    decode: identity,
    cacheKey: "watch",
    budgetMs: 60_000,
  });
  assert.equal(calls.length, 1);
  assert.equal(res.fromCache, false);
  assert.equal(res.data.written, true);
});

test("a cache read requires an explicit budget — no default sneaks in", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("k", { v: 1 }, null);
  const read = await cache.read("k", 60_000);
  assert.equal(read.stale, false);
  const staleRead = await cache.read("k", 0);
  assert.equal(staleRead.stale, true);
});

test("a corrupt cache entry is removed, not re-parsed forever", async () => {
  const storage = new MemoryCacheStorage();
  const cache = new Cache(storage);
  await storage.set("gse.cache.v1:broken", "{not json");
  assert.equal(await cache.read("broken", 60_000), null);
  assert.equal(await storage.get("gse.cache.v1:broken"), null);
});

test("a cache entry with a non-numeric storedAt is rejected", async () => {
  const storage = new MemoryCacheStorage();
  const cache = new Cache(storage);
  await storage.set("gse.cache.v1:weird", JSON.stringify({ value: 1, storedAt: "yesterday" }));
  assert.equal(await cache.read("weird", 60_000), null);
});

test("cache clear removes only this namespace", async () => {
  const storage = new MemoryCacheStorage();
  const cache = new Cache(storage);
  await cache.write("a", 1, null);
  await storage.set("other:a", "keep me");
  await cache.clear();
  assert.equal(await cache.read("a", 60_000), null);
  assert.equal(await storage.get("other:a"), "keep me");
});

/* ── Conditional requests ──────────────────────────────────────────────── */

test("a 200 with an ETag stores it and the NEXT stale read sends If-None-Match", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  const { impl, calls } = scripted([
    jsonResponse({ success: true, v: 1 }, 200, { etag: '"abc123"' }),
    jsonResponse(null, 304, { etag: '"abc123"' }),
  ]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });

  // First read: full body, ETag captured.
  await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    budgetMs: 0, // never fresh, so the second read MUST revalidate
  });
  assert.equal(calls[0].init.headers["If-None-Match"], undefined);

  // Second read: conditional.
  await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    budgetMs: 0,
  });
  assert.equal(calls[1].init.headers["If-None-Match"], '"abc123"');
});

test("a 304 returns the cached body, labelled as cached, with a RESET age", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("board", { rows: 7 }, "2026-09-15T00:00:00Z", '"etag-1"');
  const { impl } = scripted([jsonResponse(null, 304, { etag: '"etag-1"' })]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });

  const res = await client.request("/api/board/state", {
    decode: identity,
    cacheKey: "board",
    budgetMs: 0,
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.rows, 7);
  assert.equal(res.fromCache, true, "a 304 was returned as a fresh network response");
  // The whole point of a conditional request: freshness is PROVEN, so the age
  // resets rather than the body being re-downloaded.
  assert.equal(res.cacheAgeMs, 0);
  assert.equal(res.status, 304);
});

test("a 304 with nothing cached is treated as malformed, not as empty success", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  const { impl } = scripted([jsonResponse(null, 304)]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });
  const res = await client.request("/api/thing", {
    decode: identity,
    cacheKey: "thing",
    budgetMs: 60_000,
  });
  assert.equal(res.ok, false);
  assert.equal(res.kind, "malformed");
});

test("no If-None-Match is sent for a non-GET, even with an ETag cached", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("watch", { ok: true }, null, '"etag-w"');
  const { impl, calls } = scripted([jsonResponse({ success: true })]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });

  await client.request("/api/watchlist/follow", {
    method: "POST",
    body: { id: "x" },
    decode: identity,
    cacheKey: "watch",
    budgetMs: 0,
  });
  assert.equal(calls[0].init.headers["If-None-Match"], undefined);
});

test("no If-None-Match is sent when the server never gave an ETag", async () => {
  const cache = new Cache(new MemoryCacheStorage());
  await cache.write("plain", { v: 1 }, null, null);
  const { impl, calls } = scripted([jsonResponse({ success: true, v: 2 })]);
  const client = new GseClient({ baseUrl: BASE, cache, fetchImpl: impl, maxAttempts: 1 });

  await client.request("/api/thing", { decode: identity, cacheKey: "plain", budgetMs: 0 });
  assert.equal(calls[0].init.headers["If-None-Match"], undefined);
});

/* ── Events ────────────────────────────────────────────────────────────── */

test("outcome events distinguish ok / cached / gated / error", async () => {
  const { client, events } = makeClient([
    jsonResponse({ success: true, v: 1 }),
    jsonResponse({ success: false, error: "no", code: "bootstrap" }, 503),
  ]);
  await client.request("/api/a", { decode: identity });
  await client.request("/api/b", { decode: identity });
  assert.equal(events[0].outcome, "ok");
  assert.equal(events[1].outcome, "gated");
});

/* ── Client identification ─────────────────────────────────────────────── */

test("every request identifies the client, so server logs can separate app traffic", async () => {
  const { client, calls } = makeClient([jsonResponse({ success: true })]);
  await client.request("/api/thing", { decode: identity });
  assert.equal(calls[0].init.headers["X-GSE-Client"], "ios/1.0.0");
});
