"use strict";
/**
 * Offline queue tests.
 *
 * The load-bearing assertions are the three properties from the module header:
 * the intent survives termination, a re-drain does not double-apply, and the
 * server wins every disagreement.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OfflineQueue,
  MemoryQueueStorage,
  QUEUEABLE_KINDS,
  classifyWriteResult,
} = require("/tmp/gsebuild/lib/offline-queue.js");

let seq = 0;
/**
 * A MUTABLE clock.
 *
 * A frozen clock makes the backoff work correctly and a naive test fail: a
 * second drain at the same instant is legitimately not due. Tests that need a
 * retry therefore advance the clock, which is what the real world does between
 * launches, and the assertion becomes "retried after backoff" rather than
 * "retried immediately" (which would be the bug).
 */
function makeQueue(seed = [], options = {}) {
  const storage = new MemoryQueueStorage(seed);
  const clock = { t: 1_000_000 };
  const queue = new OfflineQueue(storage, {
    idFactory: () => `id${(seq += 1)}`,
    now: () => clock.t,
    baseBackoffMs: 1000,
    ...options,
  });
  const advance = (ms) => {
    clock.t += ms;
  };
  return { queue, storage, advance };
}

const FOLLOW = "watchlist.follow";

/* ══════════════════════════════════════════════════════════════════════════
   THE ALLOWLIST
   ══════════════════════════════════════════════════════════════════════════ */

test("every queueable kind states WHY it is a fact about the user", () => {
  // The record shape makes the argument unavoidable. A contributor adding
  // "picks.publish" has to write a sentence here and will find they cannot.
  for (const [kind, meta] of Object.entries(QUEUEABLE_KINDS)) {
    assert.ok(meta.whyUserFact.length > 40, `${kind} has no real justification`);
  }
  assert.deepEqual(Object.keys(QUEUEABLE_KINDS).sort(), ["watchlist.follow", "watchlist.unfollow"]);
});

test("enqueueing a MODEL fact is refused", async () => {
  // The rule that matters: a queued model fact can put a row on screen the
  // engine declined to publish, which is adverse-edge-suppression defeated by a
  // network blip.
  const { queue } = makeQueue();
  for (const forbidden of ["picks.publish", "confidence.set", "settlement.write", "watchlist.follow-ish"]) {
    await assert.rejects(() => queue.enqueue(forbidden, {}), /is not queueable/);
  }
});

test("an allowlisted write is accepted and persisted", async () => {
  const { queue, storage } = makeQueue();
  const entry = await queue.enqueue(FOLLOW, { entityType: "pick", entityId: "p1" });
  assert.equal(entry.kind, FOLLOW);
  assert.equal(entry.attempts, 0);
  assert.equal(entry.parked, null);
  // Persisted immediately, before any request could leave.
  assert.equal((await storage.read()).length, 1);
});

/* ══════════════════════════════════════════════════════════════════════════
   IDEMPOTENCY
   ══════════════════════════════════════════════════════════════════════════ */

test("the idempotency key is generated ONCE and survives every retry", async () => {
  const { queue, storage, advance } = makeQueue();
  const entry = await queue.enqueue(FOLLOW, { entityId: "p1" });
  const originalKey = entry.idempotencyKey;

  await queue.drain(async () => ({ kind: "retry", reason: "offline" }));
  advance(60_000); // the next launch
  await queue.drain(async () => ({ kind: "retry", reason: "offline" }));

  const [stored] = await storage.read();
  assert.equal(stored.idempotencyKey, originalKey, "the key changed between attempts");
  assert.equal(stored.attempts, 2);
});

test("the drain passes the SAME entry object to the sender each time", async () => {
  const { queue } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const seen = [];
  await queue.drain(async (entry) => {
    seen.push(entry.idempotencyKey);
    return { kind: "retry", reason: "offline" };
  });
  assert.equal(seen.length, 1);
  assert.ok(seen[0].startsWith("watchlist.follow:"));
});

/* ══════════════════════════════════════════════════════════════════════════
   DRAIN
   ══════════════════════════════════════════════════════════════════════════ */

test("a successful drain removes the entry", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const report = await queue.drain(async () => ({ kind: "applied" }));
  assert.equal(report.applied, 1);
  assert.equal((await storage.read()).length, 0);
});

test("already_applied counts as SATISFIED, not as a failure", async () => {
  // The server may have applied the write and lost the response. Retrying a
  // follow the server already recorded is how a queue creates duplicates.
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const report = await queue.drain(async () => ({ kind: "already_applied" }));
  assert.equal(report.alreadyApplied, 1);
  assert.equal(report.retried, 0);
  assert.equal((await storage.read()).length, 0);
});

test("a transient failure keeps the entry with its reason attached", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const report = await queue.drain(async () => ({ kind: "retry", reason: "no connection" }));
  assert.equal(report.retried, 1);
  const [stored] = await storage.read();
  assert.equal(stored.lastError, "no connection");
  assert.equal(stored.parked, null);
});

test("a permanent rejection PARKS the write rather than dropping it", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "gone" });
  const report = await queue.drain(async () => ({ kind: "rejected", reason: "pick not found" }));
  assert.equal(report.parked, 1);
  const [stored] = await storage.read();
  assert.ok(stored.parked, "a rejected write vanished silently");
  assert.match(stored.parked.reason, /pick not found/);
});

test("a parked write is excluded from pending but still recoverable", async () => {
  const { queue } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "gone" });
  await queue.drain(async () => ({ kind: "rejected", reason: "404" }));
  assert.equal((await queue.pending()).length, 0);
  assert.equal((await queue.parked()).length, 1);
});

test("a throw from the sender is treated as transient, not as a rejection", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const report = await queue.drain(async () => {
    throw new Error("socket closed");
  });
  assert.equal(report.retried, 1);
  const [stored] = await storage.read();
  assert.equal(stored.parked, null);
  assert.match(stored.lastError, /socket closed/);
});

test("the drain STOPS at the first transient failure and does not reorder", async () => {
  // Applying write 3 while write 2 is unresolved can invert an ordered pair.
  const { queue } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "a" });
  await queue.enqueue("watchlist.unfollow", { entityId: "a" });
  await queue.enqueue(FOLLOW, { entityId: "b" });

  const attempted = [];
  await queue.drain(async (entry) => {
    attempted.push(entry.payload.entityId);
    return { kind: "retry", reason: "offline" };
  });

  assert.deepEqual(attempted, ["a"], "the drain continued past an unresolved write");
  assert.equal((await queue.pending()).length, 3, "entries were lost when the drain stopped");
});

test("exhausting maxAttempts parks the write with the attempt count", async () => {
  const { queue, storage, advance } = makeQueue([], { maxAttempts: 2 });
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  await queue.drain(async () => ({ kind: "retry", reason: "offline" }));
  advance(60_000);
  await queue.drain(async () => ({ kind: "retry", reason: "offline" }));
  const [stored] = await storage.read();
  assert.ok(stored.parked);
  assert.match(stored.parked.reason, /Gave up after 2 attempts/);
});

test("backoff prevents an immediate retry, and it is measured from the LAST attempt", async () => {
  let now = 1_000_000;
  const { queue } = makeQueue([], { now: () => now, baseBackoffMs: 1000 });
  await queue.enqueue(FOLLOW, { entityId: "p1" });

  let sends = 0;
  const send = async () => {
    sends += 1;
    return { kind: "retry", reason: "offline" };
  };

  await queue.drain(send);
  assert.equal(sends, 1);
  // Immediately again: not due.
  await queue.drain(send);
  assert.equal(sends, 1, "backoff was ignored");
  // Past the window: due.
  now += 2000;
  await queue.drain(send);
  assert.equal(sends, 2);
});

test("a concurrent drain is skipped rather than double-applying", async () => {
  const { queue } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });

  let sends = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const send = async () => {
    sends += 1;
    await gate;
    return { kind: "applied" };
  };

  const first = queue.drain(send);
  const second = await queue.drain(send);
  assert.equal(second.skipped, true, "a second drain ran concurrently");
  release();
  await first;
  assert.equal(sends, 1, "the write was applied twice");
});

/* ══════════════════════════════════════════════════════════════════════════
   RECONCILIATION — the server wins
   ══════════════════════════════════════════════════════════════════════════ */

test("a queued follow the server ALREADY has is satisfied, not retried", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const result = await queue.reconcile(["p1"]);
  assert.equal(result.satisfied, 1);
  assert.equal((await storage.read()).length, 0);
});

test("a queued follow the server does NOT have stays queued", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  const result = await queue.reconcile([]);
  assert.equal(result.satisfied, 0);
  assert.equal((await storage.read()).length, 1);
});

test("a queued UNFOLLOW the server disagrees with stays queued", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue("watchlist.unfollow", { entityId: "p1" });
  // Server still shows it followed, so the unfollow is still owed.
  const result = await queue.reconcile(["p1"]);
  assert.equal(result.satisfied, 0);
  assert.equal((await storage.read()).length, 1);
});

test("reconciliation never touches a parked entry", async () => {
  const { queue, storage } = makeQueue();
  await queue.enqueue(FOLLOW, { entityId: "p1" });
  await queue.drain(async () => ({ kind: "rejected", reason: "404" }));
  await queue.reconcile(["p1"]);
  const entries = await storage.read();
  assert.equal(entries.length, 1);
  assert.ok(entries[0].parked, "reconciliation cleared a parked write without the user seeing it");
});

/* ══════════════════════════════════════════════════════════════════════════
   RESULT CLASSIFICATION
   ══════════════════════════════════════════════════════════════════════════ */

function failure(kind, message = "msg", retryAfterSec = null) {
  return { ok: false, kind, message, detail: "d", status: null, retryAfterSec, retryable: false };
}
const OK = { ok: true, data: {}, asOf: null, fromCache: false, cacheAgeMs: 0, status: 200 };

test("transient API failures map to retry", () => {
  for (const kind of ["network", "timeout", "server", "rate_limited", "gated", "stale", "malformed"]) {
    assert.equal(classifyWriteResult(failure(kind)).kind, "retry", `${kind} should retry`);
  }
});

test("a not_found maps to a permanent rejection", () => {
  // A follow for a deleted pick can never succeed, and retrying it forever is a
  // queue that never drains.
  assert.equal(classifyWriteResult(failure("not_found")).kind, "rejected");
});

test("auth maps to retry, because the user CAN fix it by signing in", () => {
  // Not `rejected`: the write is still valid, the credential is not. Parking it
  // would lose a legitimate user action.
  assert.equal(classifyWriteResult(failure("auth")).kind, "retry");
});

test("rate_limited carries its Retry-After through", () => {
  const outcome = classifyWriteResult(failure("rate_limited", "slow down", 42));
  assert.equal(outcome.retryAfterSec, 42);
});

test("a success maps to applied", () => {
  assert.equal(classifyWriteResult(OK).kind, "applied");
});
