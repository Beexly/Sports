import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "./audit-work-inventory.mjs";

/**
 * Tests target `classify` only — the pure comparison logic — with fabricated
 * fixture data, never real Git state, so they stay hermetic and fast. The
 * impure `listRemoteBranches`/`branchMetadata` functions shell out to git and
 * are exercised implicitly by the real reconciliation runs, not unit-tested
 * here (mirrors scripts/vercel-skip-build.test.mjs's own split between pure
 * logic tests and the impure git-reading functions it leaves untested in
 * isolation).
 */

test("reports zero invisible/stale when every live branch has a ledger entry and vice versa", () => {
  const live = ["a", "b"];
  const ledger = { namedEntries: [{ ref: "a" }], longTailEntries: [{ ref: "b" }] };
  const result = classify(live, ledger);
  assert.deepEqual(result.invisible, []);
  assert.deepEqual(result.stale, []);
  assert.equal(result.knownCount, 2);
  assert.equal(result.liveCount, 2);
});

test("flags a live branch with NO ledger entry as invisible work — the core invariant", () => {
  const live = ["a", "b", "new-undocumented-branch"];
  const ledger = { namedEntries: [{ ref: "a" }], longTailEntries: [{ ref: "b" }] };
  const result = classify(live, ledger);
  assert.deepEqual(result.invisible, ["new-undocumented-branch"]);
});

test("a branch in EITHER ledger section (named or long-tail) counts as known — not just named", () => {
  const live = ["long-tail-branch"];
  const ledger = { namedEntries: [], longTailEntries: [{ ref: "long-tail-branch" }] };
  const result = classify(live, ledger);
  assert.deepEqual(result.invisible, []);
});

test("flags a ledger entry whose branch no longer exists live as stale, not invisible", () => {
  const live = ["a"];
  const ledger = { namedEntries: [{ ref: "a" }, { ref: "deleted-branch" }], longTailEntries: [] };
  const result = classify(live, ledger);
  assert.deepEqual(result.invisible, []);
  assert.deepEqual(result.stale, ["deleted-branch"]);
});

test("handles a ledger with missing namedEntries/longTailEntries sections gracefully (no throw)", () => {
  assert.doesNotThrow(() => classify(["x"], {}));
  const result = classify(["x"], {});
  assert.deepEqual(result.invisible, ["x"]);
});

test("de-duplicates a ref appearing in both ledger sections without double-counting", () => {
  const ledger = { namedEntries: [{ ref: "dup" }], longTailEntries: [{ ref: "dup" }] };
  const result = classify(["dup"], ledger);
  assert.equal(result.knownCount, 1);
  assert.deepEqual(result.invisible, []);
});
