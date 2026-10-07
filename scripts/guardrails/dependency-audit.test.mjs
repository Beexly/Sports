/**
 * Fixture suite for the dependency-audit guard's fail-closed invariants.
 *
 * Fixtures are literal payloads with hand-assigned verdicts, independent of the
 * implementation, so this cannot become a vacuous self-check. Each MUST-FAIL
 * case below was a real silent pass before 2026-08-25:
 *
 *   - an `npm audit` registry-error payload read as "zero advisories"
 *   - `reviewBy` values that never compare as expired
 *   - a package-name waiver absorbing a worse advisory than it was written for
 *
 * The unreachable-registry payload is captured verbatim from
 *   npm audit --json --registry=http://127.0.0.1:9
 * under npm 10.8.2 / Node 20, which is what CI pins.
 *
 * Run via: node --test scripts/guardrails/dependency-audit.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertUsableAuditReport, validateWaivers, evaluate, isIsoDate } from "./dependency-audit.mjs";

const TODAY = "2026-08-25";

const goodWaiver = {
  package: "next",
  reason: "Fix requires a semver-major jump; tracked as its own migration.",
  reviewBy: "2026-11-01",
  maxSeverity: "high",
};

/** A minimal but structurally valid `npm audit --json` report. */
function reportWith(vulnerabilities) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const v of Object.values(vulnerabilities)) {
    counts[v.severity] = (counts[v.severity] ?? 0) + 1;
    counts.total += 1;
  }
  return { auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: counts } };
}

const vuln = (name, severity, title) => ({
  name,
  severity,
  isDirect: true,
  via: [{ title, severity, url: "https://example.invalid/advisory" }],
  range: "<1.0.0",
  nodes: [`node_modules/${name}`],
  effects: [],
});

// ── 1. Unusable audit reports must throw, never read as "clean" ───────────────

const UNUSABLE_REPORTS = [
  [
    "registry unreachable (verbatim npm 10.8.2 payload)",
    {
      message: "request to https://registry.npmjs.org/-/npm/v1/security/advisories/bulk failed, reason: connect ECONNREFUSED",
      error: { summary: "", detail: "" },
    },
  ],
  ["error object with a summary", { error: { summary: "E401 Unauthorized", detail: "" } }],
  ["empty object", {}],
  ["report with no vulnerabilities key", { auditReportVersion: 2, metadata: { vulnerabilities: { total: 0 } } }],
  ["report with no metadata summary", { auditReportVersion: 2, vulnerabilities: {} }],
  ["metadata.total is not a number", { auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: {} } }],
  ["no auditReportVersion", { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } }],
  ["an array", []],
  ["null", null],
];

for (const [label, payload] of UNUSABLE_REPORTS) {
  test(`REJECTS unusable audit report: ${label}`, () => {
    assert.throws(
      () => assertUsableAuditReport(payload),
      /npm audit/,
      `expected ${label} to be refused, not treated as a clean tree`,
    );
  });
}

test("ACCEPTS a genuine empty-but-successful audit report", () => {
  const clean = reportWith({});
  assert.equal(assertUsableAuditReport(clean), clean);
});

test("ACCEPTS a real report that contains findings", () => {
  const r = reportWith({ next: vuln("next", "high", "Next.js SSRF") });
  assert.equal(assertUsableAuditReport(r), r);
});

// ── 2. Malformed waivers must be rejected, not silently honoured ──────────────

const BAD_REVIEW_BY = [
  ["missing", undefined],
  ["null", null],
  ["nonsense string", "soon"],
  ["unpadded month", "2026-1-05"],
  ["US format", "11/01/2026"],
  ["impossible calendar date", "2026-13-45"],
  ["Feb 30th", "2026-02-30"],
  ["with a time component", "2026-11-01T00:00:00Z"],
  ["a number", 20261101],
];

for (const [label, reviewBy] of BAD_REVIEW_BY) {
  test(`REJECTS waiver with reviewBy ${label}`, () => {
    const problems = validateWaivers([{ ...goodWaiver, reviewBy }], TODAY);
    assert.ok(
      problems.some((p) => /reviewBy/.test(p)),
      `expected a reviewBy complaint for ${label}, got: ${JSON.stringify(problems)}`,
    );
  });
}

test("REJECTS a reviewBy parked absurdly far in the future (fat-fingered year)", () => {
  const problems = validateWaivers([{ ...goodWaiver, reviewBy: "2126-11-01" }], TODAY);
  assert.ok(problems.some((p) => /days out/.test(p)), JSON.stringify(problems));
});

test("REJECTS a waiver with no reason", () => {
  const problems = validateWaivers([{ ...goodWaiver, reason: undefined }], TODAY);
  assert.ok(problems.some((p) => /reason/.test(p)), JSON.stringify(problems));
});

test("REJECTS a waiver with a token reason", () => {
  const problems = validateWaivers([{ ...goodWaiver, reason: "later" }], TODAY);
  assert.ok(problems.some((p) => /reason/.test(p)), JSON.stringify(problems));
});

test("REJECTS a waiver with no maxSeverity", () => {
  const problems = validateWaivers([{ ...goodWaiver, maxSeverity: undefined }], TODAY);
  assert.ok(problems.some((p) => /maxSeverity/.test(p)), JSON.stringify(problems));
});

test("REJECTS a waiver with no package name", () => {
  const problems = validateWaivers([{ ...goodWaiver, package: "" }], TODAY);
  assert.ok(problems.some((p) => /package name/.test(p)), JSON.stringify(problems));
});

test("REJECTS duplicate waivers for the same package (only one would apply)", () => {
  const problems = validateWaivers([goodWaiver, { ...goodWaiver }], TODAY);
  assert.ok(problems.some((p) => /duplicates/.test(p)), JSON.stringify(problems));
});

test("REJECTS a non-object waiver entry", () => {
  assert.ok(validateWaivers(["next"], TODAY).length > 0);
  assert.ok(validateWaivers([null], TODAY).length > 0);
});

test("REJECTS a non-array ACCEPTED", () => {
  assert.ok(validateWaivers({ next: goodWaiver }, TODAY).length > 0);
});

test("ACCEPTS a well-formed waiver list", () => {
  assert.deepEqual(validateWaivers([goodWaiver, { ...goodWaiver, package: "postcss" }], TODAY), []);
});

test("ACCEPTS an empty waiver list", () => {
  assert.deepEqual(validateWaivers([], TODAY), []);
});

test("isIsoDate only accepts real canonical dates", () => {
  assert.equal(isIsoDate("2026-11-01"), true);
  assert.equal(isIsoDate("2026-02-29"), false); // 2026 is not a leap year
  assert.equal(isIsoDate("2024-02-29"), true);
  assert.equal(isIsoDate("2026-1-1"), false);
  assert.equal(isIsoDate(""), false);
});

// ── 3. A waiver must not absorb a worse advisory than it was written for ──────

test("BLOCKS when a waived package escalates above its accepted severity", () => {
  const report = reportWith({ next: vuln("next", "critical", "Next.js RCE") });
  const { blocking, waived, escalated } = evaluate(report, [goodWaiver], TODAY);
  assert.equal(waived.length, 0, "a critical must not land in the waived bucket");
  assert.equal(escalated.length, 1);
  assert.equal(escalated[0].acceptedMax, "high");
  assert.equal(blocking.length, 1, "escalated findings must also block");
});

test("WAIVES at exactly the accepted severity", () => {
  const report = reportWith({ next: vuln("next", "high", "Next.js SSRF") });
  const { blocking, waived, escalated } = evaluate(report, [goodWaiver], TODAY);
  assert.deepEqual(blocking, []);
  assert.deepEqual(escalated, []);
  assert.equal(waived.length, 1);
});

test("BLOCKS an unwaived critical/high advisory", () => {
  const report = reportWith({ "evil-lib": vuln("evil-lib", "high", "evil-lib RCE") });
  const { blocking } = evaluate(report, [], TODAY);
  assert.equal(blocking.length, 1);
  assert.equal(blocking[0].name, "evil-lib");
});

test("IGNORES moderate and below (documented scope of this gate)", () => {
  const report = reportWith({ mild: vuln("mild", "moderate", "mild thing") });
  const { blocking, waived } = evaluate(report, [], TODAY);
  assert.deepEqual(blocking, []);
  assert.deepEqual(waived, []);
});

test("FLAGS a stale waiver whose advisory is gone", () => {
  const { stale } = evaluate(reportWith({}), [goodWaiver], TODAY);
  assert.equal(stale.length, 1);
  assert.equal(stale[0].package, "next");
});

test("FLAGS an expired waiver", () => {
  const report = reportWith({ next: vuln("next", "high", "Next.js SSRF") });
  const { expired } = evaluate(report, [{ ...goodWaiver, reviewBy: "2026-08-24" }], TODAY);
  assert.equal(expired.length, 1);
});

test("does NOT flag a waiver reviewed today as expired (boundary)", () => {
  const report = reportWith({ next: vuln("next", "high", "Next.js SSRF") });
  const { expired } = evaluate(report, [{ ...goodWaiver, reviewBy: TODAY }], TODAY);
  assert.deepEqual(expired, []);
});
