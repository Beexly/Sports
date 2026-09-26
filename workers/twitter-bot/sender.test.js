"use strict";
/**
 * Sender and client tests.
 *
 * These are written against the failure modes that make bots embarrassing, not
 * against the happy path. Each test names the failure it exists to prevent.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { XClient, XApiError, parseRateLimit } = require("./x-client.js");
const { TwitterSender, MemoryLedger, Outcome, isMuted, validateThread } = require("./sender.js");

const CREDS = {
  consumerKey: "ck",
  consumerSecret: "cs",
  token: "tk",
  tokenSecret: "ts",
};

function jsonResponse(body, status = 200, headers = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => map.get(String(name).toLowerCase()) ?? null },
    text: async () => JSON.stringify(body),
  };
}

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

function makeSender(responses, { muted = false } = {}) {
  const { impl, calls } = scripted(responses);
  const events = [];
  const client = new XClient({ credentials: CREDS, fetchImpl: impl, onAttempt: (e) => events.push({ src: "client", ...e }) });
  const ledger = new MemoryLedger();
  const sender = new TwitterSender({
    client,
    ledger,
    muted: () => muted,
    onEvent: (e) => events.push({ src: "sender", ...e }),
  });
  return { sender, ledger, calls, events };
}

/* ══════════════════════════════════════════════════════════════════════════
   MUTE_BOT — checked at SEND time
   ══════════════════════════════════════════════════════════════════════════ */

test("isMuted requires the literal value 'true'", () => {
  assert.equal(isMuted({ MUTE_BOT: "true" }), true);
  assert.equal(isMuted({ MUTE_BOT: "TRUE" }), true);
  assert.equal(isMuted({ MUTE_BOT: " true " }), true);
  // Anything else must NOT mute-by-accident AND must not un-mute a typo the
  // operator believed was a mute. Only the exact value mutes; the default state
  // is running, which is why the operator-facing note is in the README.
  assert.equal(isMuted({ MUTE_BOT: "yes" }), false);
  assert.equal(isMuted({ MUTE_BOT: "1" }), false);
  assert.equal(isMuted({}), false);
});

test("a muted sender makes NO network call", async () => {
  const { sender, calls } = makeSender([jsonResponse({ data: { id: "1" } })], { muted: true });
  const result = await sender.send({ text: "hello", idempotencyKey: "k1" });
  assert.equal(result.outcome, Outcome.MUTED);
  assert.equal(calls.length, 0, "a muted sender still hit the API");
});

test("the mute is checked at send time, so flipping it mid-run stops the next post", async () => {
  let muted = false;
  const { impl, calls } = scripted([jsonResponse({ data: { id: "1" } })]);
  const client = new XClient({ credentials: CREDS, fetchImpl: impl });
  const sender = new TwitterSender({ client, ledger: new MemoryLedger(), muted: () => muted });

  await sender.send({ text: "first", idempotencyKey: "a" });
  muted = true;
  const second = await sender.send({ text: "second", idempotencyKey: "b" });

  assert.equal(calls.length, 1, "the mute did not take effect mid-run");
  assert.equal(second.outcome, Outcome.MUTED);
});

/* ══════════════════════════════════════════════════════════════════════════
   IDEMPOTENCY — recorded BEFORE the send
   ══════════════════════════════════════════════════════════════════════════ */

test("the idempotency key is recorded BEFORE the request leaves", async () => {
  // The failure this prevents: the request succeeds, the response is lost, the
  // job retries, and the account posts twice. Recording afterwards cannot
  // distinguish that from a failure.
  let ledgerHadKeyAtCallTime = null;
  const ledger = new MemoryLedger();
  const impl = async () => {
    ledgerHadKeyAtCallTime = await ledger.has("k1");
    return jsonResponse({ data: { id: "1" } });
  };
  const client = new XClient({ credentials: CREDS, fetchImpl: impl });
  const sender = new TwitterSender({ client, ledger });

  await sender.send({ text: "hello", idempotencyKey: "k1" });
  assert.equal(ledgerHadKeyAtCallTime, true, "the key was recorded after the send, not before");
});

test("a second send with the same key does not post again", async () => {
  const { sender, calls } = makeSender([jsonResponse({ data: { id: "1" } })]);
  await sender.send({ text: "hello", idempotencyKey: "k1" });
  const again = await sender.send({ text: "hello", idempotencyKey: "k1" });
  assert.equal(calls.length, 1);
  assert.equal(again.outcome, Outcome.ALREADY_SENT);
});

test("a send with no idempotency key is refused outright", async () => {
  const { sender, calls } = makeSender([jsonResponse({ data: { id: "1" } })]);
  await assert.rejects(() => sender.send({ text: "hello" }), /idempotencyKey is required/);
  assert.equal(calls.length, 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   OUTCOMES
   ══════════════════════════════════════════════════════════════════════════ */

test("a successful post reports SENT with the tweet id", async () => {
  const { sender } = makeSender([jsonResponse({ data: { id: "123" } })]);
  const result = await sender.send({ text: "hello", idempotencyKey: "k" });
  assert.equal(result.outcome, Outcome.SENT);
  assert.equal(result.tweetId, "123");
});

test("a network failure reports UNKNOWN, not FAILED — it may have landed", async () => {
  // This is the single most important outcome in the file. Reporting FAILED
  // invites a retry that duplicates a post that already exists.
  const { sender } = makeSender([new Error("ECONNRESET")]);
  const result = await sender.send({ text: "hello", idempotencyKey: "k" });
  assert.equal(result.outcome, Outcome.UNKNOWN);
});

test("a 2xx with no tweet id reports UNKNOWN, not SENT", async () => {
  const { sender } = makeSender([jsonResponse({ data: {} }, 200)]);
  const result = await sender.send({ text: "hello", idempotencyKey: "k" });
  assert.equal(result.outcome, Outcome.UNKNOWN);
});

test("a 429 reports RATE_LIMITED with the server's Retry-After", async () => {
  const { sender } = makeSender([
    jsonResponse({ errors: [{ detail: "Too many requests" }] }, 429, {
      "retry-after": "42",
      "x-rate-limit-remaining": "0",
    }),
  ]);
  const result = await sender.send({ text: "hello", idempotencyKey: "k" });
  assert.equal(result.outcome, Outcome.RATE_LIMITED);
  assert.equal(result.retryAfterSec, 42);
});

test("a 403 authentication failure reports FAILED and is not treated as retryable", async () => {
  const { sender } = makeSender([jsonResponse({ errors: [{ detail: "Forbidden" }] }, 403)]);
  const result = await sender.send({ text: "hello", idempotencyKey: "k" });
  assert.equal(result.outcome, Outcome.FAILED);
});

/* ══════════════════════════════════════════════════════════════════════════
   THREADS
   ══════════════════════════════════════════════════════════════════════════ */

test("a thread with an over-long post is refused BEFORE anything is sent", () => {
  // Discovering post 6 of 6 is too long after five are public is unrecoverable.
  const problems = validateThread(["ok", "x".repeat(281)]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /post 2 is 281 characters/);
});

test("an invalid thread makes no network call at all", async () => {
  const { sender, calls } = makeSender([jsonResponse({ data: { id: "1" } })]);
  const result = await sender.sendThread({
    posts: ["fine", "x".repeat(300)],
    idempotencyKey: "t1",
  });
  assert.equal(result.outcome, Outcome.INVALID);
  assert.deepEqual(result.problems.length, 1);
  assert.equal(calls.length, 0);
});

test("a thread chains replies and returns every id in order", async () => {
  const { sender, calls } = makeSender([
    jsonResponse({ data: { id: "1" } }),
    jsonResponse({ data: { id: "2" } }),
    jsonResponse({ data: { id: "3" } }),
  ]);
  const result = await sender.sendThread({ posts: ["one", "two", "three"], idempotencyKey: "t" });
  assert.equal(result.outcome, Outcome.SENT);
  assert.deepEqual(result.tweetIds, ["1", "2", "3"]);

  // Post 1 has no reply target; posts 2 and 3 reply to the previous id.
  const bodies = calls.map((c) => JSON.parse(c.init.body));
  assert.equal(bodies[0].reply, undefined);
  assert.equal(bodies[1].reply.in_reply_to_tweet_id, "1");
  assert.equal(bodies[2].reply.in_reply_to_tweet_id, "2");
});

test("a PARTIAL thread reports which posts landed, so nobody re-posts the whole thing", async () => {
  let n = 0;
  const impl = async () => {
    n += 1;
    if (n === 3) return jsonResponse({ errors: [{ detail: "nope" }] }, 403);
    return jsonResponse({ data: { id: String(n) } });
  };
  const client = new XClient({ credentials: CREDS, fetchImpl: impl });
  const sender = new TwitterSender({ client, ledger: new MemoryLedger() });

  const result = await sender.sendThread({ posts: ["a", "b", "c", "d"], idempotencyKey: "t" });
  assert.equal(result.outcome, Outcome.PARTIAL);
  assert.deepEqual(result.tweetIds, ["1", "2"]);
  assert.equal(result.failedAt, 2);
});

test("a thread that fails on the FIRST post is not reported as partial", async () => {
  const { sender } = makeSender([jsonResponse({ errors: [{ detail: "no" }] }, 403)]);
  const result = await sender.sendThread({ posts: ["a", "b"], idempotencyKey: "t" });
  assert.equal(result.outcome, Outcome.FAILED);
  assert.deepEqual(result.tweetIds, []);
});

test("a re-run of a thread does not duplicate it", async () => {
  const { sender, calls } = makeSender([jsonResponse({ data: { id: "1" } })]);
  await sender.sendThread({ posts: ["a"], idempotencyKey: "t" });
  const again = await sender.sendThread({ posts: ["a"], idempotencyKey: "t" });
  assert.equal(calls.length, 1);
  assert.equal(again.outcome, Outcome.ALREADY_SENT);
});

/* ══════════════════════════════════════════════════════════════════════════
   CLIENT
   ══════════════════════════════════════════════════════════════════════════ */

test("an over-long post is refused locally, with the length in the message", async () => {
  const { impl, calls } = scripted([jsonResponse({ data: { id: "1" } })]);
  const client = new XClient({ credentials: CREDS, fetchImpl: impl });
  await assert.rejects(() => client.postTweet({ text: "x".repeat(281) }), /281 characters exceeds the 280 limit/);
  assert.equal(calls.length, 0);
});

test("a client with an incomplete credential set refuses to construct", () => {
  assert.throws(
    () => new XClient({ credentials: { ...CREDS, tokenSecret: "" } }),
    /all four OAuth 1.0a parts are required/,
  );
});

test("rate-limit reset is read as SECONDS and converted to ms", () => {
  // Treating the seconds value as ms yields a reset time in 1970 and an
  // immediate retry loop against a rate-limited account.
  const headers = { get: (n) => ({ "x-rate-limit-remaining": "5", "x-rate-limit-reset": "1800000000" })[n] ?? null };
  const parsed = parseRateLimit(headers);
  assert.equal(parsed.remaining, 5);
  assert.equal(parsed.resetAt, 1_800_000_000_000);
});

test("the attempt log records every call with an outcome", async () => {
  const { sender, events } = makeSender([jsonResponse({ data: { id: "9" } })]);
  await sender.send({ text: "hi", idempotencyKey: "k" });
  const clientEvent = events.find((e) => e.src === "client");
  assert.equal(clientEvent.outcome, "ok");
  assert.equal(clientEvent.tweetId, "9");
  assert.ok(typeof clientEvent.ms === "number");
});

/* ══════════════════════════════════════════════════════════════════════════
   ACCOUNT HYGIENE — a capability that does not exist cannot be called
   ══════════════════════════════════════════════════════════════════════════ */

test("the client exposes NO follow, like or retweet capability", () => {
  // The voice spec says the bot follows, likes and retweets zero accounts. The
  // cheapest way to keep that promise is for the methods not to exist.
  const surface = Object.getOwnPropertyNames(XClient.prototype);
  for (const forbidden of ["follow", "like", "retweet", "unfollow", "unlike", "quoteTweet", "delete"]) {
    assert.ok(
      !surface.includes(forbidden),
      `XClient exposes ${forbidden}(), which the account hygiene rule forbids`,
    );
  }
});

test("the ONLY mutating capability is posting", () => {
  const surface = Object.getOwnPropertyNames(XClient.prototype).filter(
    (n) => !n.startsWith("#") && n !== "constructor",
  );
  assert.deepEqual(surface, ["postTweet"]);
});
