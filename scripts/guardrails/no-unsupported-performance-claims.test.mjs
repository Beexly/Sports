/**
 * Fixture suite for the numeric-claim pass's clause-scoped exemption (LQ11).
 *
 * Proves the fix for a real bug: the numeric pass previously applied
 * SAFE_CONTEXT line-wide, and SAFE_CONTEXT includes the evidence vocabulary
 * (settled/sample/window/threshold/model version) — so a fabricated stat
 * phrased the way a tout would phrase it ("68% win rate across 500 settled
 * picks") sailed through by borrowing "settled" from clear across the
 * sentence. NUMERIC_SAFE_CONTEXT (no evidence vocab) + numericSafeContextNear
 * (clause-scoped, ported from commercial-copy-scan.mjs's safeContextNear)
 * close that.
 *
 * Fixtures are literal strings with hand-assigned verdicts — independent of
 * the implementation, so this can't become a vacuous self-check.
 *
 * Run via: node --test scripts/guardrails/no-unsupported-performance-claims.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { scanNumericClaimLine } from "./no-unsupported-performance-claims.mjs";

const FILE = "apps/web/app/fixture/page.tsx";

function hitsFor(line) {
  return scanNumericClaimLine([line], 0, FILE);
}

function pairHitsFor(line1, line2) {
  return scanNumericClaimLine([line1, line2], 0, FILE);
}

const MUST_FAIL = [
  "68% win rate across 500 settled picks",
  "71% hit rate in our launch window",
  "68% win rate this season",
  "60%+ win rate",
  // Clause-boundary case: "not" sits on the far side of the period, so it
  // must NOT excuse the second sentence's claim.
  "This is not hype. 68% win rate, easy money.",
];

const MUST_PASS = [
  "no public win rate is shown before 100 settled picks",
  "95% CP 52.1-68.3%",
  "15% off your first month",
  "Threshold: sample window of 500 settled picks",
];

for (const line of MUST_FAIL) {
  test(`FLAGS: "${line}"`, () => {
    assert.ok(hitsFor(line).length > 0, `expected a hit for: ${line}`);
  });
}

for (const line of MUST_PASS) {
  test(`PASSES: "${line}"`, () => {
    assert.deepEqual(hitsFor(line), [], `expected no hit for: ${line}`);
  });
}

test("clause-scoped exemption is genuinely clause-scoped, not line-wide (distinguishing case)", () => {
  // "not" negates "hype" in the FIRST clause; the claim is in the SECOND
  // clause, past a period. A line-wide (buggy) exemption would pass this.
  const hits = hitsFor("This is not hype. 68% win rate, easy money.");
  assert.ok(hits.length > 0);
});

test("in-clause negation still exempts (regression guard — the fix must not overcorrect to line-wide-never-exempt)", () => {
  const hits = hitsFor("no 68% win rate is shown before evidence exists");
  assert.deepEqual(hits, []);
});

test("cross-line pair path still fires when a stat splits across a line break", () => {
  const hits = pairHitsFor("68%", " win rate across 500 settled picks");
  assert.ok(hits.length > 0, "split-line stat must still be caught");
});

test("evidence vocabulary is NOT retained in NUMERIC_SAFE_CONTEXT (the bug's exact regression guard)", async () => {
  const src = await (await import("node:fs/promises")).readFile(
    new URL("./no-unsupported-performance-claims.mjs", import.meta.url),
    "utf8",
  );
  const match = src.match(/const NUMERIC_SAFE_CONTEXT =\s*\n?\s*\/((?:[^/\\]|\\.)*)\//);
  assert.ok(match, "NUMERIC_SAFE_CONTEXT pattern not found in source");
  const patternSource = match[1];
  for (const evidenceWord of ["settled", "sample", "window", "threshold", "model version"]) {
    assert.ok(
      !new RegExp(`\\b${evidenceWord}\\b`, "i").test(patternSource),
      `NUMERIC_SAFE_CONTEXT must not retain evidence word "${evidenceWord}"`,
    );
  }
});
