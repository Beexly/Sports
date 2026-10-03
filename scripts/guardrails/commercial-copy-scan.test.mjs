/**
 * Fixture suite for the commercial-copy guard's tout-usage sweep (LQ12).
 *
 * Fixtures are literal strings with hand-assigned verdicts — independent of
 * the implementation, so this can't become a vacuous self-check. Covers the
 * two must-FAIL/must-PASS pairs the card specifies plus the same clause-
 * boundary and split-line regressions LQ11 guards against, ported to this
 * guard's own scanToutLine.
 *
 * Run via: node --test scripts/guardrails/commercial-copy-scan.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { scanToutLine, safeContextNear } from "./commercial-copy-scan.mjs";

const FILE = "apps/web/components/fixture/component.tsx";

function toutHitsFor(line) {
  return scanToutLine([line], 0, FILE);
}

const MUST_FAIL = [
  "Tonight's lock — hammer this before the window closes",
  "Guaranteed winner inside.",
];

const MUST_PASS = [
  "the Merkle root committed at lock",
  "Your founding rate is guaranteed for life",
  "this is not a lock",
];

for (const line of MUST_FAIL) {
  test(`FLAGS (tout): "${line}"`, () => {
    assert.ok(toutHitsFor(line).length > 0, `expected a tout hit for: ${line}`);
  });
}

for (const line of MUST_PASS) {
  test(`PASSES (tout): "${line}"`, () => {
    assert.deepEqual(toutHitsFor(line), [], `expected no tout hit for: ${line}`);
  });
}

test("clause-scoped exemption is genuinely clause-scoped, not line-wide (distinguishing case)", () => {
  // "not" negates "hype" in the FIRST clause; "guaranteed winner" is in the
  // SECOND clause, past a period. A line-wide (buggy) exemption would pass this.
  const hits = toutHitsFor("This is not hype. Guaranteed winner, easy money.");
  assert.ok(hits.length > 0);
});

test("in-clause negation still exempts (regression guard)", () => {
  const hits = toutHitsFor("this is not a stone-cold lock, just a strong signal");
  assert.deepEqual(hits, []);
});

test("safeContextNear is exported and usable directly on a raw subject", () => {
  const safe = "this is not a lock, easy signal";
  assert.equal(safeContextNear(safe, safe.indexOf("lock"), "lock".length), true);
  const unsafe = "guaranteed winner every time";
  assert.equal(safeContextNear(unsafe, unsafe.indexOf("winner"), "winner".length), false);
});
