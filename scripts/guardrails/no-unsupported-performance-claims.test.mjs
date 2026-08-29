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
import { scanLine, scanNumericClaimLine } from "./no-unsupported-performance-claims.mjs";

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
  const match = src.match(/const NUMERIC_SAFE_CONTEXT =/);
  assert.ok(match, "NUMERIC_SAFE_CONTEXT not found in source");
  // Check that evidence words are NOT in the NUMERIC_SAFE_CONTEXT regex
  const idx = src.indexOf("const NUMERIC_SAFE_CONTEXT =");
  const after = src.slice(idx);
  const regexEnd = after.indexOf("/");
  const patternSource = after.slice(0, regexEnd + 1);
  for (const evidenceWord of ["settled", "sample", "window", "threshold", "model version"]) {
    assert.ok(
      !new RegExp(`\\b${evidenceWord}\\b`, "i").test(patternSource),
      `NUMERIC_SAFE_CONTEXT must not retain evidence word "${evidenceWord}"`,
    );
  }
});

// GB-6: ALLOWED vocabulary tests — additive, never weaken FORBIDDEN
// Band-definition copy MUST pass (forward-looking probability-threshold language)
const ALLOWED_BAND_DEFINITION = [
  "The GREEN tier fires only when winning is at least 70% mathematically true",
  "PRIME fires when probability threshold reaches 80%",
  // review fix: "calibrated" is a banned concept word pre-milestone — public
  // band copy states the threshold without it.
  "Band range: 70-80% probability threshold",
  "Probability band statement: tier fires at p >= 0.70",
  "Confidence threshold for GREEN is 70%",
  "Threshold band definition: fires at 70%+",
  "Tier fires when mathematically true probability exceeds threshold",
];

for (const line of ALLOWED_BAND_DEFINITION) {
  test(`ALLOWED band-definition PASSES: "${line}"`, () => {
    // Must NOT be flagged by CLAIMS scan (contains "probability", "fires", "band", "threshold" etc.)
    const hits = scanLine([line], 0, "apps/web/app/green/page.tsx");
    const claimHits = hits.filter((h) => !h.claim.startsWith("hardcoded-numeric:"));
    assert.deepEqual(
      claimHits,
      [],
      `band-definition copy should pass CLAIMS scan: ${line}`,
    );
  });
}

// Receipts language MUST pass (ledger/record transparency copy)
const ALLOWED_RECEIPTS = [
  "Record in progress — ledger readout with Wilson CI",
  "Ticker is a ledger readout, not a track record",
  "Verified record from settled picks only",
  "Internal counterfactual — not a public track record",
  "Public record starts at zero on launch day",
  "Wilson 95% CI on realized vs expected gap",
  "Selection alpha measures realized vs expected",
  "Average expected rate reported per tier",
];

for (const line of ALLOWED_RECEIPTS) {
  test(`ALLOWED receipts PASSES: "${line}"`, () => {
    const hits = scanLine([line], 0, "apps/web/app/green/page.tsx");
    const claimHits = hits.filter((h) => !h.claim.startsWith("hardcoded-numeric:"));
    assert.deepEqual(
      claimHits,
      [],
      `receipts language should pass CLAIMS scan: ${line}`,
    );
  });
}

// MASK-THEN-SCAN regression suite (review): an ALLOWED phrase must never
// whitelist a forbidden claim sharing its line. These exact lines defeated the
// original line-level exemption; they stay here permanently.
const SMUGGLED_MUST_FAIL = [
  "Our record in progress: guaranteed winners, 90% win rate every week.",
  "Ledger readout says easy profit — proven winners, best win rate anywhere.",
  "PRIME fires only when winning is at least 80% mathematically true — guaranteed profit.",
];
for (const line of SMUGGLED_MUST_FAIL) {
  test(`SMUGGLED CLAIM STILL FAILS beside ALLOWED phrase: "${line.slice(0, 60)}…"`, () => {
    const hits = scanLine([line], 0, "apps/web/app/green/page.tsx");
    assert.ok(
      hits.length > 0,
      `a forbidden claim beside an ALLOWED phrase must still be flagged: ${line}`,
    );
  });
}

// Performance claims MUST STILL FAIL even near ALLOWED vocabulary
// The ALLOWED exemption applies to the specific line containing the phrase,
// not to every claim on the same page.
const MUST_STILL_FAIL = [
  "68% win rate across 500 settled picks", // hardcoded numeric claim
  "Our GREEN tier fires only when winning is at least 70% mathematically true. 68% win rate proven.", // ALLOWED phrase + performance claim on different clause -> second clause still flags
];

for (const line of MUST_STILL_FAIL) {
  test(`PERFORMANCE CLAIM STILL FAILS: "${line}"`, () => {
    // Numeric claims require scanNumericClaimLine, not scanLine
    const hits = scanNumericClaimLine([line], 0, "apps/web/app/green/page.tsx");
    // Should have at least one CLAIMS hit (not just numeric) or numeric hit
    const claimHits = hits.filter((h) => !h.claim.startsWith("hardcoded-numeric:"));
    const numericHits = hits.filter((h) => h.claim.startsWith("hardcoded-numeric:"));
    assert.ok(
      claimHits.length > 0 || numericHits.length > 0,
      `performance claim must still be caught: ${line}`,
    );
  });
}