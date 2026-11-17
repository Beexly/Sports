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

// --- Import/export wiring skip (2026-11-13) ---------------------------------
// Module wiring is not rendered copy: `import { verifiedLedger } from ...`
// must not fire the phrase pass, but a rendered claim still must.
import { scanLine } from "./no-unsupported-performance-claims.mjs";

test("import statement with evidence vocabulary is not a claim", () => {
  const line = 'import { verifiedLedger, formatWlp } from "@/lib/ledger/verified-ledger-view";';
  assert.deepEqual(scanLine([line], 0, FILE), []);
});

test("side-effect import is not a claim", () => {
  assert.deepEqual(scanLine(['import "./verified-polyfill";'], 0, FILE), []);
});

test("re-export wiring is not a claim", () => {
  const line = 'export { verifiedLedger } from "@/lib/ledger/verified-ledger-view";';
  assert.deepEqual(scanLine([line], 0, FILE), []);
});

test("rendered verified claim still fires (skip is not over-broad)", () => {
  const line = '<p>Our verified system wins every week.</p>';
  const hits = scanLine([line], 0, FILE);
  assert.ok(hits.length > 0, "rendered claim must still be flagged");
});

// --- Record + win-percentage rule (2026-11-15) ------------------------------
// Fixtures are the strings that actually shipped, plus the control that must
// keep passing. Verdicts hand-assigned before the implementation was written.
import { scanRecordPercentLine } from "./no-unsupported-performance-claims.mjs";

const RECORD_MUST_FAIL = [
  "Verified Official NFL Record: 47-19-1 (71.2% win rate · +24.92u)",
  "Official Season Ledger of Record: 36-13-1 (73.5%) · +20.14u Verified",
  "73.5% (36-13-1) all-time",
  '"description": "… reporting a 36-13-1 (+20.14u) verified record (73.5%, MAIN + DERIVATIVE + TNF SINGLE-STAKE)"',
];

const RECORD_MUST_PASS = [
  "Superseded snapshot: 47-19-1 (+24.92u) is the audited 2026-11-02 all-in snapshot",
  "79-46-0 +81.47u verified · win rate locked until 200 CLV-backed settled plays (53/200)",
  "a publish-time market price by any honest reading (measured 2026-09-19: 99% of sessions)",
  "16-5-0 +10.45u entering TNF CAR@GB",
];

for (const line of RECORD_MUST_FAIL) {
  test(`RECORD+PERCENT FLAGS: "${line}"`, () => {
    assert.ok(scanRecordPercentLine([line], 0, FILE).length > 0, `expected a hit for: ${line}`);
  });
}

for (const line of RECORD_MUST_PASS) {
  test(`RECORD+PERCENT PASSES: "${line}"`, () => {
    assert.deepEqual(scanRecordPercentLine([line], 0, FILE), [], `expected no hit for: ${line}`);
  });
}

test("unlabelled 36-13-1 is not exempt just because it is a known snapshot number", () => {
  // The number being real history is not the exemption — the label is.
  const hits = scanRecordPercentLine(["Our record stands at 36-13-1 (73.5%)."], 0, FILE);
  assert.ok(hits.length > 0);
});

test("superseded label one line above the claim does not excuse it", () => {
  const hits = scanRecordPercentLine(
    ["<p class=\"kicker\">Superseded snapshot</p>", "<p>47-19-1 (71.2% win rate)</p>"],
    1,
    FILE,
  );
  assert.ok(hits.length > 0, "label must be on the same clause, not a neighbouring element");
});
