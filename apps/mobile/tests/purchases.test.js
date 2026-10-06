"use strict";
/**
 * Purchase settlement tests.
 *
 * The first test file in this repo whose failure mode costs real money. The
 * assertion that matters most is "a network failure must NOT finish the
 * transaction" — the bug this module fixes, written as an executable rule.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  settlePurchase,
  reconcile,
  toSubmission,
  iosPurchaseOptions,
  userFacingPurchaseMessage,
} = require("/tmp/gsebuild/lib/purchases.js");

const SUBMISSION = {
  productId: "com.galaxysportsedge.app.pro.monthly",
  purchaseToken: "jws.token.value",
  transactionId: "txn-1",
  appAccountToken: "user-1",
  transactionDate: "2026-09-15T12:00:00.000Z",
  countryCode: "USA",
};

function deps({ submitResult, track }) {
  const finished = [];
  const submissions = [];
  return {
    finished,
    submissions,
    deps: {
      submit: async (s) => {
        submissions.push(s);
        return submitResult;
      },
      finish: async (id) => {
        finished.push(id);
      },
      ...(track ? { onOutcome: track } : {}),
    },
  };
}

const OK = { ok: true, data: {}, asOf: null, fromCache: false, cacheAgeMs: 0, status: 200 };

function failure(kind, message = "failed", detail = "detail") {
  return { ok: false, kind, message, detail, status: null, retryAfterSec: null, retryable: kind === "network" };
}

/* ══════════════════════════════════════════════════════════════════════════
   THE BUG
   ══════════════════════════════════════════════════════════════════════════ */

test("THE FIX: a network failure does NOT finish the transaction", async () => {
  // This is the bug. Finishing here tells StoreKit the app has handled it, so
  // StoreKit never re-delivers it, and a charged customer with no server record
  // has no path back. Leaving it unfinished is what makes recovery possible.
  const { deps: d, finished } = deps({ submitResult: failure("network") });
  const outcome = await settlePurchase(d, SUBMISSION);

  assert.equal(outcome.kind, "pending");
  assert.deepEqual(finished, [], "a network failure finished the transaction — the bug is back");
});

test("a timeout also leaves the transaction unfinished", async () => {
  const { deps: d, finished } = deps({ submitResult: failure("timeout") });
  const outcome = await settlePurchase(d, SUBMISSION);
  assert.equal(outcome.kind, "pending");
  assert.deepEqual(finished, []);
});

test("a 5xx and a rate limit both leave it unfinished", async () => {
  for (const kind of ["server", "rate_limited", "gated", "stale"]) {
    const { deps: d, finished } = deps({ submitResult: failure(kind) });
    const outcome = await settlePurchase(d, SUBMISSION);
    assert.equal(outcome.kind, "pending", `${kind} should be pending`);
    assert.deepEqual(finished, [], `${kind} finished the transaction`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   THE HAPPY PATH
   ══════════════════════════════════════════════════════════════════════════ */

test("a server acknowledgement settles AND finishes", async () => {
  const { deps: d, finished, submissions } = deps({ submitResult: OK });
  const outcome = await settlePurchase(d, SUBMISSION);

  assert.equal(outcome.kind, "settled");
  assert.deepEqual(finished, ["txn-1"]);
  // The submission carries the appAccountToken, so the server can attribute it.
  assert.equal(submissions[0].appAccountToken, "user-1");
  assert.equal(submissions[0].transactionId, "txn-1");
});

/* ══════════════════════════════════════════════════════════════════════════
   DEFINITIVE REJECTION — the one case where finishing IS correct
   ══════════════════════════════════════════════════════════════════════════ */

test("a definitive rejection DOES finish, so StoreKit stops re-delivering it", async () => {
  // A receipt the server will never accept, left unfinished, means StoreKit asks
  // about it on every launch forever.
  for (const kind of ["auth", "malformed", "not_found"]) {
    const { deps: d, finished } = deps({ submitResult: failure(kind) });
    const outcome = await settlePurchase(d, SUBMISSION);
    assert.equal(outcome.kind, "rejected", `${kind} should be rejected`);
    assert.deepEqual(finished, ["txn-1"], `${kind} left an un-acceptable transaction open`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   SIGNED OUT
   ══════════════════════════════════════════════════════════════════════════ */

test("a purchase with no account is left unfinished and unattributed", async () => {
  const { deps: d, finished, submissions } = deps({ submitResult: OK });
  const outcome = await settlePurchase(d, { ...SUBMISSION, appAccountToken: null });

  assert.equal(outcome.kind, "unattributed");
  assert.deepEqual(finished, []);
  // It is not even submitted: there is nothing to attribute it to.
  assert.deepEqual(submissions, []);
});

/* ══════════════════════════════════════════════════════════════════════════
   RECONCILIATION
   ══════════════════════════════════════════════════════════════════════════ */

test("reconcile tallies every outcome and never throws", async () => {
  let n = 0;
  const finished = [];
  const result = await reconcile({
    list: async () => [
      { ...SUBMISSION, transactionId: "a" },
      { ...SUBMISSION, transactionId: "b" },
      { ...SUBMISSION, transactionId: "c" },
      { ...SUBMISSION, transactionId: "d", appAccountToken: null },
    ],
    submit: async () => {
      n += 1;
      if (n === 1) return OK;
      if (n === 2) return failure("network");
      return failure("auth");
    },
    finish: async (id) => {
      finished.push(id);
    },
  });

  assert.equal(result.settled, 1);
  assert.equal(result.pending, 1);
  assert.equal(result.rejected, 1);
  assert.equal(result.unattributed, 1);
  // Only the settled and the rejected were finished; the pending was NOT.
  assert.deepEqual(finished.sort(), ["a", "c"]);
});

test("reconcile survives a list() failure rather than taking the launch down", async () => {
  const result = await reconcile({
    list: async () => {
      throw new Error("StoreKit unavailable");
    },
    submit: async () => OK,
    finish: async () => undefined,
  });
  assert.deepEqual(result, { settled: 0, pending: 0, rejected: 0, unattributed: 0 });
});

/* ══════════════════════════════════════════════════════════════════════════
   CONVERSION
   ══════════════════════════════════════════════════════════════════════════ */

test("toSubmission refuses a purchase with no JWS", () => {
  // A receipt-shaped object with an empty token would be rejected by the server
  // as fraud rather than as a client bug, which sends the investigation the
  // wrong way.
  assert.throws(
    () => toSubmission({ productId: "p", id: "t", transactionDate: 0, purchaseToken: null }),
    /has no purchaseToken/,
  );
  assert.throws(
    () => toSubmission({ productId: "p", id: "t", transactionDate: 0, purchaseToken: "" }),
    /has no purchaseToken/,
  );
});

test("toSubmission carries every field the server needs", () => {
  const submission = toSubmission({
    productId: "prod",
    purchaseToken: "jws",
    id: "txn-9",
    appAccountToken: "user-9",
    transactionDate: 1_757_940_000_000,
    countryCodeIOS: "GBR",
  });
  assert.equal(submission.productId, "prod");
  assert.equal(submission.purchaseToken, "jws");
  assert.equal(submission.transactionId, "txn-9");
  assert.equal(submission.appAccountToken, "user-9");
  assert.equal(submission.countryCode, "GBR");
  assert.equal(submission.transactionDate, new Date(1_757_940_000_000).toISOString());
});

/* ══════════════════════════════════════════════════════════════════════════
   REQUEST OPTIONS
   ══════════════════════════════════════════════════════════════════════════ */

test("iosPurchaseOptions ALWAYS disables auto-finish", () => {
  // The library's own field name is a warning label. There is no circumstance in
  // which this app wants the platform finishing a transaction before the server
  // has recorded it.
  for (const userId of ["user-1", null]) {
    const options = iosPurchaseOptions("sku", userId);
    assert.equal(options.andDangerouslyFinishTransactionAutomatically, false);
    assert.equal(options.sku, "sku");
  }
});

test("iosPurchaseOptions passes the account through, null and all", () => {
  assert.equal(iosPurchaseOptions("sku", "user-1").appAccountToken, "user-1");
  assert.equal(iosPurchaseOptions("sku", null).appAccountToken, null);
});

/* ══════════════════════════════════════════════════════════════════════════
   WHAT THE USER IS TOLD
   ══════════════════════════════════════════════════════════════════════════ */

test("a pending purchase is NOT reported to the user as a failure", () => {
  // The user has been charged. Telling them something went wrong invites a
  // second purchase, which is the worst possible outcome.
  const pending = userFacingPurchaseMessage({ kind: "pending", transactionId: "t", reason: "offline" });
  assert.equal(pending.tone, "waiting");
  assert.match(pending.message, /You do not need to buy it again/);
  assert.doesNotMatch(pending.message, /failed|error|wrong/i);
});

test("an unattributed purchase tells the user how to recover", () => {
  const message = userFacingPurchaseMessage({ kind: "unattributed", transactionId: "t" });
  assert.equal(message.tone, "waiting");
  assert.match(message.message, /Sign in/);
});

test("an accepted purchase reads as success", () => {
  assert.equal(userFacingPurchaseMessage({ kind: "settled", transactionId: "t" }).tone, "ok");
});

test("a rejected purchase reads as a problem without blaming the user", () => {
  const rejected = userFacingPurchaseMessage({ kind: "rejected", transactionId: "t", reason: "bad receipt" });
  assert.equal(rejected.tone, "problem");
  assert.doesNotMatch(rejected.message, /you|invalid|denied/i);
});
