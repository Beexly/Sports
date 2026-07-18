import { test } from "node:test";
import assert from "node:assert/strict";
import { SEVERITY } from "./nightly-sentinel-checks.mjs";
import { overallSeverity, exitCodeFor, shipLabelFor, buildArtifact, renderHumanReport, fileOrUpdateIssue } from "./nightly-sentinel.mjs";

test("overallSeverity: FAIL beats WARN beats PASS regardless of order", () => {
  assert.equal(overallSeverity([{ severity: SEVERITY.PASS }, { severity: SEVERITY.WARN }, { severity: SEVERITY.FAIL }]), SEVERITY.FAIL);
  assert.equal(overallSeverity([{ severity: SEVERITY.PASS }, { severity: SEVERITY.WARN }]), SEVERITY.WARN);
  assert.equal(overallSeverity([{ severity: SEVERITY.PASS }, { severity: SEVERITY.PASS }]), SEVERITY.PASS);
  assert.equal(overallSeverity([]), SEVERITY.PASS);
});

test("exitCodeFor: FAIL=2, WARN=1, PASS=0 (mirrors scripts/smoke-prod.sh's convention)", () => {
  assert.equal(exitCodeFor(SEVERITY.FAIL), 2);
  assert.equal(exitCodeFor(SEVERITY.WARN), 1);
  assert.equal(exitCodeFor(SEVERITY.PASS), 0);
});

test("shipLabelFor: maps severity to the SHIP/WATCH/FAIL vocabulary", () => {
  assert.equal(shipLabelFor(SEVERITY.FAIL), "FAIL");
  assert.equal(shipLabelFor(SEVERITY.WARN), "WATCH");
  assert.equal(shipLabelFor(SEVERITY.PASS), "SHIP");
});

// --- buildArtifact: regression guard for the confirmed redaction gap -------
// (gse-verifier + gse-red-team both independently found the JSON artifact
// bypassed redactSensitive() entirely; this locks the fix in place.)

test("buildArtifact: redacts every result's detail before it reaches the durable JSON artifact", () => {
  const results = [
    { id: "a", severity: SEVERITY.FAIL, category: "assertion", detail: "leaked token ghp_LEAKEDTOKENVALUE1234567890 in response" },
    { id: "b", severity: SEVERITY.PASS, detail: "clean detail with no secrets" },
  ];
  const artifact = buildArtifact({ baseUrl: "https://x", startedAt: "t0", finishedAt: "t1", results, overall: SEVERITY.FAIL });
  assert.ok(artifact.results[0].detail.includes("[REDACTED]"));
  assert.ok(!artifact.results[0].detail.includes("ghp_LEAKEDTOKENVALUE1234567890"));
  assert.equal(artifact.results[1].detail, "clean detail with no secrets");
});

test("buildArtifact: preserves every other field (id, severity, category) unchanged", () => {
  const results = [{ id: "x", severity: SEVERITY.WARN, category: "assertion", detail: "fine" }];
  const artifact = buildArtifact({ baseUrl: "https://x", startedAt: "t0", finishedAt: "t1", results, overall: SEVERITY.WARN });
  assert.equal(artifact.results[0].id, "x");
  assert.equal(artifact.results[0].severity, SEVERITY.WARN);
  assert.equal(artifact.results[0].category, "assertion");
  assert.equal(artifact.baseUrl, "https://x");
  assert.equal(artifact.overall, SEVERITY.WARN);
});

// --- renderHumanReport -------------------------------------------------

test("renderHumanReport: redacts secrets, escapes table-breaking pipes, and tallies severities correctly", () => {
  const results = [
    { id: "a", severity: SEVERITY.FAIL, category: "assertion", detail: "sk_live_ABC123XYZ leaked | with a pipe" },
    { id: "b", severity: SEVERITY.WARN, detail: "fine" },
    { id: "c", severity: SEVERITY.PASS, detail: "fine" },
  ];
  const report = renderHumanReport({ baseUrl: "https://x", startedAt: "t0", finishedAt: "t1", results, overall: SEVERITY.FAIL });
  assert.match(report, /Nightly Sentinel v2 — FAIL/);
  assert.ok(report.includes("[REDACTED]"));
  assert.ok(!report.includes("sk_live_ABC123XYZ"));
  assert.ok(report.includes("\\|"));
  assert.match(report, /1 FAIL, 1 WARN, 1 PASS out of 3 checks/);
});

// --- fileOrUpdateIssue: dependency-injected fetch, no real network ---------

test("fileOrUpdateIssue: skips entirely when overall severity isn't FAIL", async () => {
  const calls = [];
  const fetchImpl = async (...args) => { calls.push(args); throw new Error("should never be called"); };
  const result = await fileOrUpdateIssue({ token: "t", repo: "o/r", humanReport: "x", overall: SEVERITY.WARN, fetchImpl });
  assert.equal(result.action, "none");
  assert.equal(calls.length, 0);
});

test("fileOrUpdateIssue: skips (doesn't throw) when token or repo is missing, even on FAIL", async () => {
  const fetchImpl = async () => { throw new Error("should never be called"); };
  const noToken = await fileOrUpdateIssue({ token: undefined, repo: "o/r", humanReport: "x", overall: SEVERITY.FAIL, fetchImpl });
  assert.equal(noToken.action, "none");
  const noRepo = await fileOrUpdateIssue({ token: "t", repo: undefined, humanReport: "x", overall: SEVERITY.FAIL, fetchImpl });
  assert.equal(noRepo.action, "none");
});

test("fileOrUpdateIssue: comments on an existing open marker-labeled issue instead of creating a duplicate", async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(String(url));
    if (String(url).includes("/issues?")) {
      return new Response(JSON.stringify([{ number: 42 }]), { status: 200 });
    }
    if (String(url).endsWith("/issues/42/comments")) {
      assert.equal(opts.method, "POST");
      return new Response(JSON.stringify({ id: 1 }), { status: 201 });
    }
    throw new Error(`unexpected call: ${url}`);
  };
  const result = await fileOrUpdateIssue({ token: "t", repo: "o/r", humanReport: "some report", overall: SEVERITY.FAIL, fetchImpl });
  assert.deepEqual(result, { action: "commented", issueNumber: 42 });
  assert.equal(calls.length, 2);
});

test("fileOrUpdateIssue: creates a new labeled issue when none is open", async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes("/issues?")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (String(url).endsWith("/repos/o/r/issues")) {
      return new Response(JSON.stringify({ number: 99 }), { status: 201 });
    }
    throw new Error(`unexpected call: ${url}`);
  };
  const result = await fileOrUpdateIssue({ token: "t", repo: "o/r", humanReport: "some report", overall: SEVERITY.FAIL, fetchImpl });
  assert.deepEqual(result, { action: "created", issueNumber: 99 });
});

test("fileOrUpdateIssue: degrades to action:none with a reason instead of throwing when the GitHub API errors", async () => {
  const fetchImpl = async () => new Response("rate limited", { status: 403 });
  const result = await fileOrUpdateIssue({ token: "t", repo: "o/r", humanReport: "x", overall: SEVERITY.FAIL, fetchImpl });
  assert.equal(result.action, "none");
  assert.match(result.reason, /issue search failed: 403/);
});

test("fileOrUpdateIssue: never puts the token itself into the composed issue body", async () => {
  let capturedBody = null;
  const fetchImpl = async (url, opts) => {
    if (String(url).includes("/issues?")) return new Response(JSON.stringify([]), { status: 200 });
    if (opts?.body) capturedBody = opts.body;
    return new Response(JSON.stringify({ number: 1 }), { status: 201 });
  };
  const fakeToken = "TOKEN-CANARY-DO-NOT-LEAK-9f8e7d6c5b4a3210"; // deliberately not shaped like a real credential
  await fileOrUpdateIssue({ token: fakeToken, repo: "o/r", humanReport: "clean report", overall: SEVERITY.FAIL, fetchImpl });
  assert.ok(capturedBody);
  assert.ok(!capturedBody.includes(fakeToken));
});
