/**
 * NOVA S3 source-runtime exhaustive tests (node:test).
 *
 * Covers, per the S3 split-unit contract:
 * - the exact outcome state machine (FETCHED / NOT_MODIFIED / HELD /
 *   FAILED) including the exhaustive no-receipt-is-never-promoted matrix;
 * - source-receipt schema validation field by field;
 * - freshness horizon and effective-vs-recorded time;
 * - redirect (same-origin default), content-type, and max-size policy;
 * - run lease records;
 * - run record terminal states and FAILED_CLOSED recovery of non-terminal
 *   records (model-switch / crash recovery);
 * - checkpoint salvage and double-count prevention at every crash point;
 * - consecutive-failure alert records;
 * - append-only run receipts and the convergence-inventory capability
 *   reference (npm script names only).
 *
 * Run: npm run nova:runtime:test
 */

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { sha256 } from "./change-intelligence.mjs";
import { acquireRunLease, runNovaCycle, writeOnceJson } from "./run-cycle.mjs";
import {
  ALERT_SCHEMA_VERSION,
  CHECKPOINT_SCHEMA_VERSION,
  CONVERGENCE_INVENTORY_CAPABILITY,
  HISTORICAL_SOURCE_VALIDATION_DOCTRINE,
  PROMOTABLE_OUTCOMES,
  RECEIPT_SCHEMA_VERSION,
  SOURCE_FETCH_OUTCOMES,
  buildSourceFailureAlert,
  canPromoteSourceResult,
  checkSizePolicy,
  classifySourceResult,
  completeRunRecord,
  createCheckpointRecord,
  createLease,
  createRunRecord,
  effectiveLagMinutes,
  evaluateRedirectHop,
  failCloseRunRecord,
  heartbeatLease,
  isContentTypeAllowed,
  isRunTerminal,
  leaseStatus,
  nextConsecutiveFailureCount,
  planResume,
  receiptFreshness,
  salvageCheckpoints,
  shouldEmitFailureAlert,
  validateCheckpointRecord,
  validateSourceReceipt,
} from "./source-runtime-core.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeReceipt(overrides = {}) {
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    sourceId: "vendor-releases",
    url: "https://api.example.com/releases",
    fetchedAt: "2026-07-22T10:00:00.000Z",
    httpStatus: 200,
    contentType: "application/json",
    contentLength: 512,
    contentHash: `sha256:${"a".repeat(64)}`,
    parserVersion: 2,
    redirectChain: [],
    effectiveTime: "2026-07-21T09:00:00.000Z",
    recordedTime: "2026-07-22T10:00:01.000Z",
    freshnessHorizonMinutes: 1440,
    ...overrides,
  };
}

function make304Receipt(overrides = {}) {
  return makeReceipt({ httpStatus: 304, contentHash: null, contentLength: 0, ...overrides });
}

// ---------------------------------------------------------------------------
// Receipt schema validation
// ---------------------------------------------------------------------------

test("a complete receipt passes schema validation", () => {
  const result = validateSourceReceipt(makeReceipt());
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("a 304 receipt with null contentHash passes schema validation", () => {
  assert.equal(validateSourceReceipt(make304Receipt()).valid, true);
});

test("every required receipt field is enforced individually", () => {
  const requiredFields = [
    "schemaVersion",
    "sourceId",
    "url",
    "fetchedAt",
    "httpStatus",
    "contentType",
    "contentLength",
    "contentHash",
    "parserVersion",
    "redirectChain",
    "recordedTime",
    "freshnessHorizonMinutes",
  ];
  for (const field of requiredFields) {
    const receipt = makeReceipt();
    delete receipt[field];
    const result = validateSourceReceipt(receipt);
    assert.equal(result.valid, false, `${field} missing must invalidate the receipt`);
  }
});

test("receipt field types are enforced", () => {
  const bad = [
    { url: "http://api.example.com/releases" },
    { url: "" },
    { fetchedAt: "not-a-time" },
    { httpStatus: 99 },
    { httpStatus: 600 },
    { httpStatus: 200.5 },
    { contentType: "" },
    { contentLength: -1 },
    { contentLength: 1.5 },
    { contentHash: "md5:abc" },
    { contentHash: "sha256:short" },
    { contentHash: null }, // null only allowed for 304
    { parserVersion: 0 },
    { redirectChain: "nope" },
    { redirectChain: [{ url: "http://x.example", httpStatus: 301 }] },
    { redirectChain: [{ url: "https://x.example", httpStatus: 200 }] },
    { redirectChain: [null] },
    { effectiveTime: "garbage" },
    { recordedTime: "garbage" },
    { freshnessHorizonMinutes: 0 },
    { freshnessHorizonMinutes: 90.5 },
    { schemaVersion: 99 },
  ];
  for (const overrides of bad) {
    const result = validateSourceReceipt(makeReceipt(overrides));
    assert.equal(result.valid, false, `${JSON.stringify(overrides)} must invalidate the receipt`);
    assert.ok(result.errors.length > 0);
  }
});

test("effectiveTime is optional (null) but recordedTime is not", () => {
  assert.equal(validateSourceReceipt(makeReceipt({ effectiveTime: null })).valid, true);
  const receipt = makeReceipt();
  delete receipt.effectiveTime;
  assert.equal(validateSourceReceipt(receipt).valid, true);
  assert.equal(validateSourceReceipt(makeReceipt({ recordedTime: undefined })).valid, false);
});

test("non-object receipts fail closed", () => {
  for (const value of [null, undefined, "receipt", 7, []]) {
    assert.equal(validateSourceReceipt(value).valid, false);
  }
});

// ---------------------------------------------------------------------------
// Freshness horizon, effective vs recorded time
// ---------------------------------------------------------------------------

test("receipt freshness respects the freshness horizon", () => {
  const receipt = makeReceipt({ recordedTime: "2026-07-22T10:00:00.000Z", freshnessHorizonMinutes: 60 });
  assert.equal(receiptFreshness(receipt, new Date("2026-07-22T10:59:00.000Z")), "FRESH");
  assert.equal(receiptFreshness(receipt, new Date("2026-07-22T11:00:00.000Z")), "FRESH");
  assert.equal(receiptFreshness(receipt, new Date("2026-07-22T11:00:01.000Z")), "STALE");
});

test("an invalid receipt is never fresh", () => {
  assert.equal(receiptFreshness(makeReceipt({ url: "http://x" }), new Date()), "INVALID");
  assert.equal(receiptFreshness(null, new Date()), "INVALID");
});

test("effective lag separates source-declared time from recorded time", () => {
  const receipt = makeReceipt({
    effectiveTime: "2026-07-22T09:00:00.000Z",
    recordedTime: "2026-07-22T10:30:00.000Z",
  });
  assert.equal(effectiveLagMinutes(receipt), 90);
  assert.equal(effectiveLagMinutes(makeReceipt({ effectiveTime: null })), null);
  assert.equal(effectiveLagMinutes(null), null);
});

// ---------------------------------------------------------------------------
// Outcome state machine — exhaustive fail-closed matrix
// ---------------------------------------------------------------------------

test("the outcome vocabulary is exactly FETCHED / NOT_MODIFIED / HELD / FAILED", () => {
  assert.deepEqual([...SOURCE_FETCH_OUTCOMES], ["FETCHED", "NOT_MODIFIED", "HELD", "FAILED"]);
  assert.deepEqual([...PROMOTABLE_OUTCOMES], ["FETCHED", "NOT_MODIFIED"]);
});

test("EXHAUSTIVE: no receipt means HELD or FAILED and is never promoted", () => {
  const receiptVariants = {
    valid2xx: makeReceipt(),
    valid304: make304Receipt(),
    invalid: makeReceipt({ url: "http://insecure.example" }),
    missing: undefined,
    null: null,
    notAnObject: "receipt",
  };
  const claims = ["FETCHED", "NOT_MODIFIED", "HELD", "FAILED", "UNCHANGED", "SUCCESS", "", undefined, null, 42];

  for (const claim of claims) {
    for (const [variantName, receipt] of Object.entries(receiptVariants)) {
      const result = { outcome: claim, receipt, holdReason: claim === "HELD" ? "policy_hold" : null, error: "boom" };
      const classification = classifySourceResult(result);
      const label = `claim=${String(claim)} receipt=${variantName}`;

      // The classified outcome is always inside the closed vocabulary.
      assert.ok(SOURCE_FETCH_OUTCOMES.includes(classification.outcome), `${label}: outcome in vocabulary`);

      const promotableExpected =
        (claim === "FETCHED" && variantName === "valid2xx") ||
        (claim === "NOT_MODIFIED" && variantName === "valid304");
      assert.equal(classification.promotable, promotableExpected, `${label}: promotable`);
      assert.equal(canPromoteSourceResult(result), promotableExpected, `${label}: canPromote`);

      if (!promotableExpected) {
        assert.ok(["HELD", "FAILED"].includes(classification.outcome), `${label}: non-promotable is HELD or FAILED`);
      }
    }
  }
});

test("a FETCHED claim with a valid 304 receipt is demoted to FAILED (status mismatch)", () => {
  const classification = classifySourceResult({ outcome: "FETCHED", receipt: make304Receipt() });
  assert.equal(classification.outcome, "FAILED");
  assert.equal(classification.reason, "fetched_claim_without_2xx");
});

test("a NOT_MODIFIED claim with a valid 2xx receipt is demoted to FAILED (status mismatch)", () => {
  const classification = classifySourceResult({ outcome: "NOT_MODIFIED", receipt: makeReceipt() });
  assert.equal(classification.outcome, "FAILED");
  assert.equal(classification.reason, "not_modified_claim_without_304");
});

test("HELD requires a hold reason; a bare HELD claim is demoted to FAILED", () => {
  assert.equal(classifySourceResult({ outcome: "HELD", holdReason: "content_type_not_allowed" }).outcome, "HELD");
  assert.equal(classifySourceResult({ outcome: "HELD" }).outcome, "FAILED");
  assert.equal(classifySourceResult({ outcome: "HELD", holdReason: "  " }).outcome, "FAILED");
});

test("claimed success with an invalid receipt reports the receipt errors", () => {
  const classification = classifySourceResult({ outcome: "FETCHED", receipt: makeReceipt({ contentHash: "nope" }) });
  assert.equal(classification.outcome, "FAILED");
  assert.equal(classification.reason, "claimed_success_without_valid_receipt");
  assert.ok(classification.receiptErrors.some((error) => error.includes("contentHash")));
});

test("non-object worker results are FAILED", () => {
  for (const value of [null, undefined, "x", 9, []]) {
    const classification = classifySourceResult(value);
    assert.equal(classification.outcome, "FAILED");
    assert.equal(classification.promotable, false);
  }
});

// ---------------------------------------------------------------------------
// Redirect / content-type / size policy
// ---------------------------------------------------------------------------

test("redirects are same-origin only by default", () => {
  const base = { fromUrl: "https://api.example.com/a", allowedHosts: ["api.example.com", "cdn.example.com"] };
  assert.equal(evaluateRedirectHop({ ...base, toUrl: "https://api.example.com/b" }).allowed, true);
  const cross = evaluateRedirectHop({ ...base, toUrl: "https://cdn.example.com/b" });
  assert.equal(cross.allowed, false);
  assert.equal(cross.reason, "redirect_target_cross_origin");
});

test("allowlisted_hosts redirect mode still requires the allowlist", () => {
  const base = {
    fromUrl: "https://api.example.com/a",
    redirectPolicy: "allowlisted_hosts",
    allowedHosts: ["api.example.com", "cdn.example.com"],
  };
  assert.equal(evaluateRedirectHop({ ...base, toUrl: "https://cdn.example.com/b" }).allowed, true);
  const outside = evaluateRedirectHop({ ...base, toUrl: "https://evil.example/b" });
  assert.equal(outside.allowed, false);
  assert.equal(outside.reason, "redirect_target_not_allowlisted");
});

test("redirect targets must be https, credential-free, parseable, and under a known policy", () => {
  const base = { fromUrl: "https://api.example.com/a", allowedHosts: ["api.example.com"] };
  assert.equal(evaluateRedirectHop({ ...base, toUrl: "http://api.example.com/b" }).reason, "redirect_target_not_https");
  assert.equal(
    evaluateRedirectHop({ ...base, toUrl: "https://user:pw@api.example.com/b" }).reason,
    "redirect_target_has_credentials",
  );
  assert.equal(evaluateRedirectHop({ ...base, toUrl: "::::" }).reason, "redirect_target_unparseable");
  assert.equal(
    evaluateRedirectHop({ ...base, toUrl: "https://api.example.com/b", redirectPolicy: "follow_all" }).reason,
    "unknown_redirect_policy",
  );
});

test("content-type allowlist is per parser and unknown parsers are refused", () => {
  assert.equal(isContentTypeAllowed("application/json; charset=utf-8", "github_releases_json"), true);
  assert.equal(isContentTypeAllowed("text/html", "github_releases_json"), false);
  assert.equal(isContentTypeAllowed("text/html", "structured_page_delta"), true);
  assert.equal(isContentTypeAllowed("application/json", "unknown_parser"), false);
});

test("max-size policy refuses declared and received overruns and fails closed without a ceiling", () => {
  assert.equal(checkSizePolicy({ declaredLength: 10, maxBytes: 5 }).reason, "declared_length_exceeds_ceiling");
  assert.equal(checkSizePolicy({ receivedBytes: 6, maxBytes: 5 }).reason, "received_bytes_exceed_ceiling");
  assert.equal(checkSizePolicy({ declaredLength: 5, receivedBytes: 5, maxBytes: 5 }).allowed, true);
  assert.equal(checkSizePolicy({ receivedBytes: 1 }).reason, "max_bytes_policy_missing");
});

// ---------------------------------------------------------------------------
// Lease records
// ---------------------------------------------------------------------------

test("lease lifecycle: active, heartbeat extension, expiry, invalid", () => {
  const t0 = new Date("2026-07-22T10:00:00.000Z");
  const lease = createLease({ runId: "run-1", owner: "pid:1", now: t0, ttlMs: 60_000 });
  assert.equal(leaseStatus(lease, new Date("2026-07-22T10:00:59.000Z")), "ACTIVE");
  assert.equal(leaseStatus(lease, new Date("2026-07-22T10:01:01.000Z")), "EXPIRED");

  const extended = heartbeatLease(lease, { now: new Date("2026-07-22T10:00:30.000Z"), ttlMs: 60_000 });
  assert.equal(leaseStatus(extended, new Date("2026-07-22T10:01:20.000Z")), "ACTIVE");

  assert.throws(() => heartbeatLease(lease, { now: new Date("2026-07-22T11:00:00.000Z"), ttlMs: 60_000 }));
  assert.equal(leaseStatus(null, t0), "INVALID");
  assert.equal(leaseStatus({ runId: "x" }, t0), "INVALID");
});

// ---------------------------------------------------------------------------
// Run record state machine
// ---------------------------------------------------------------------------

test("run records progress RUNNING -> COMPLETED exactly once", () => {
  const run = createRunRecord({ runId: "run-1", startedAt: "2026-07-22T10:00:00.000Z", selectedSourceIds: ["a"] });
  assert.equal(run.state, "RUNNING");
  assert.equal(isRunTerminal(run), false);
  assert.equal(run.externalActionsAllowed, false);
  assert.equal(run.billableModelCalls, 0);

  const done = completeRunRecord(run, { completedAt: "2026-07-22T10:05:00.000Z", sourceResults: [] });
  assert.equal(done.state, "COMPLETED");
  assert.equal(isRunTerminal(done), true);
  assert.throws(() => completeRunRecord(done, { completedAt: "2026-07-22T10:06:00.000Z", sourceResults: [] }));
});

test("a non-terminal run record can only be FAILED_CLOSED, never resumed as success", () => {
  const run = createRunRecord({ runId: "run-2", startedAt: "2026-07-22T10:00:00.000Z", selectedSourceIds: [] });
  const closed = failCloseRunRecord(run, {
    reason: "NON_TERMINAL_RUN_RECORD_RECOVERED_AT_STARTUP",
    recoveredAt: "2026-07-22T11:00:00.000Z",
    recoveredBy: "run-3",
    salvagedCheckpointCount: 2,
  });
  assert.equal(closed.state, "FAILED_CLOSED");
  assert.equal(closed.failureReason, "NON_TERMINAL_RUN_RECORD_RECOVERED_AT_STARTUP");
  assert.equal(closed.recovery.salvagedCheckpointCount, 2);
  // Terminal records cannot be fail-closed again or completed.
  assert.throws(() => failCloseRunRecord(closed, { reason: "again", recoveredAt: "2026-07-22T12:00:00.000Z" }));
  assert.throws(() => completeRunRecord(closed, { completedAt: "2026-07-22T12:00:00.000Z", sourceResults: [] }));
  // A reason is mandatory.
  assert.throws(() => failCloseRunRecord(createRunRecord({ runId: "r", startedAt: "2026-07-22T10:00:00.000Z" }), {
    reason: "",
    recoveredAt: "2026-07-22T11:00:00.000Z",
  }));
});

// ---------------------------------------------------------------------------
// Checkpoints and salvage
// ---------------------------------------------------------------------------

function makeCheckpoint(overrides = {}) {
  return createCheckpointRecord({
    runId: "run-1",
    sequence: 1,
    sourceId: "a",
    classification: { outcome: "FETCHED", promotable: true },
    result: { outcome: "FETCHED", receipt: makeReceipt(), error: null },
    sourceStateAfter: { lastRunAt: "2026-07-22T10:00:00.000Z", consecutiveFailures: 0 },
    events: [{ id: "event-1", title: "One" }],
    recordedAt: "2026-07-22T10:00:00.000Z",
    ...overrides,
  });
}

test("checkpoint records validate and reject malformed shapes", () => {
  const checkpoint = makeCheckpoint();
  assert.equal(checkpoint.schemaVersion, CHECKPOINT_SCHEMA_VERSION);
  assert.equal(validateCheckpointRecord(checkpoint).valid, true);
  assert.equal(validateCheckpointRecord({ ...checkpoint, sequence: 0 }).valid, false);
  assert.equal(validateCheckpointRecord({ ...checkpoint, outcome: "MAYBE" }).valid, false);
  assert.equal(validateCheckpointRecord({ ...checkpoint, events: null }).valid, false);
  assert.equal(validateCheckpointRecord(null).valid, false);
  assert.throws(() => createCheckpointRecord({ runId: "r", sequence: 1, sourceId: "a", classification: { outcome: "NOPE" }, recordedAt: "2026-07-22T10:00:00.000Z" }));
});

test("salvage keeps one checkpoint per source, unique events, and ignores foreign or invalid checkpoints", () => {
  const cp1 = makeCheckpoint({ sequence: 1, sourceId: "a", events: [{ id: "e1" }] });
  const cp2 = makeCheckpoint({ sequence: 2, sourceId: "b", events: [{ id: "e2" }, { id: "e1" }] });
  const cp2b = makeCheckpoint({ sequence: 3, sourceId: "b", events: [{ id: "e3" }] });
  const foreign = makeCheckpoint({ runId: "run-9", sequence: 4, sourceId: "c" });
  const invalid = { junk: true };

  const salvage = salvageCheckpoints("run-1", [cp2b, cp1, cp2, foreign, invalid]);
  assert.deepEqual(salvage.salvagedSourceIds, ["a", "b"]);
  assert.equal(salvage.checkpoints.length, 2);
  assert.equal(salvage.checkpoints[1].sequence, 3, "highest sequence wins per source");
  assert.deepEqual(salvage.events.map((event) => event.id).sort(), ["e1", "e3"]);
  assert.equal(salvage.invalidCheckpointCount, 2);
});

test("planResume skips salvaged sources and preserves original order", () => {
  assert.deepEqual(planResume({ plannedSourceIds: ["a", "b", "c"], salvagedSourceIds: ["b"] }), ["a", "c"]);
  assert.deepEqual(planResume({ plannedSourceIds: ["a"], salvagedSourceIds: [] }), ["a"]);
  assert.deepEqual(planResume({ plannedSourceIds: [], salvagedSourceIds: ["a"] }), []);
});

// ---------------------------------------------------------------------------
// Consecutive-failure alerts
// ---------------------------------------------------------------------------

test("consecutive failures count HELD and FAILED, reset on promotable outcomes", () => {
  assert.equal(nextConsecutiveFailureCount(0, "FAILED"), 1);
  assert.equal(nextConsecutiveFailureCount(1, "HELD"), 2);
  assert.equal(nextConsecutiveFailureCount(2, "FETCHED"), 0);
  assert.equal(nextConsecutiveFailureCount(2, "NOT_MODIFIED"), 0);
  assert.equal(nextConsecutiveFailureCount(2, "GARBAGE"), 3, "unknown outcomes count as failures");
  assert.equal(nextConsecutiveFailureCount(undefined, "FAILED"), 1);
});

test("alerts fire at the threshold and at exact doublings only", () => {
  const threshold = 3;
  const expectations = new Map([
    [1, false],
    [2, false],
    [3, true],
    [4, false],
    [5, false],
    [6, true],
    [7, false],
    [11, false],
    [12, true],
    [13, false],
    [24, true],
  ]);
  for (const [count, expected] of expectations) {
    assert.equal(shouldEmitFailureAlert(count, threshold), expected, `count=${count}`);
  }
  assert.equal(shouldEmitFailureAlert(3, 0), false, "invalid threshold never alerts");
});

test("alert records are structured, carry no delivery wiring, and refuse promotable outcomes", () => {
  const alert = buildSourceFailureAlert({
    sourceId: "vendor-releases",
    sourceName: "Vendor releases",
    organization: "Vendor",
    consecutiveFailures: 3,
    threshold: 3,
    firstFailureAt: "2026-07-20T00:00:00.000Z",
    lastFailureAt: "2026-07-22T00:00:00.000Z",
    lastOutcome: "FAILED",
    lastError: "HTTP 503",
    runId: "run-1",
    recordedAt: "2026-07-22T00:00:00.000Z",
  });
  assert.equal(alert.schemaVersion, ALERT_SCHEMA_VERSION);
  assert.equal(alert.kind, "SOURCE_CONSECUTIVE_FAILURE_ALERT");
  assert.equal(alert.delivery, "RECORD_ONLY_NO_NOTIFICATION_WIRED");
  assert.equal(alert.ownerActionRequired, true);
  assert.throws(() =>
    buildSourceFailureAlert({
      sourceId: "x",
      consecutiveFailures: 3,
      threshold: 3,
      lastOutcome: "FETCHED",
      runId: "run-1",
      recordedAt: "2026-07-22T00:00:00.000Z",
    }),
  );
});

// ---------------------------------------------------------------------------
// Doctrine constants
// ---------------------------------------------------------------------------

test("historical NOVA source-validation receipts remain FAILED_CLOSED", () => {
  assert.equal(HISTORICAL_SOURCE_VALIDATION_DOCTRINE.result, "FAILED_CLOSED");
  assert.equal(HISTORICAL_SOURCE_VALIDATION_DOCTRINE.retroactivePromotion, "FORBIDDEN");
});

test("the convergence-inventory capability is consumed by npm script name only, never rebuilt", () => {
  assert.equal(CONVERGENCE_INVENTORY_CAPABILITY.buildNpmScript, "nova:inventory");
  assert.equal(CONVERGENCE_INVENTORY_CAPABILITY.verifyNpmScript, "nova:inventory:verify");
  assert.equal(CONVERGENCE_INVENTORY_CAPABILITY.owningUnit, "nova/convergence-inventory-tooling");
  assert.equal(CONVERGENCE_INVENTORY_CAPABILITY.integration, "NPM_SCRIPT_NAME_ONLY");
  assert.equal(CONVERGENCE_INVENTORY_CAPABILITY.rebuiltInS3, false);
});

// ---------------------------------------------------------------------------
// Cycle integration: temp runtime dirs, fake workers, crash points
// ---------------------------------------------------------------------------

function makePolicy(overrides = {}) {
  return {
    defaultEnabled: false,
    httpsOnly: true,
    redirectPolicy: "same_origin",
    maxRedirects: 2,
    defaultTimeoutMs: 10000,
    defaultMaxBytes: 1048576,
    userAgent: "GSE-NOVA/0.2 read-only opportunity intelligence",
    failureAlertThreshold: 3,
    defaultFreshnessHorizonMinutes: 4320,
    secondarySourcesMayVerify: false,
    autoInstallAllowed: false,
    autoExecuteAllowed: false,
    ...overrides,
  };
}

function makeSource(id, overrides = {}) {
  return {
    id,
    organization: "Vendor",
    name: `Source ${id}`,
    url: `https://api.example.com/${id}`,
    kind: "official_repository_releases",
    parser: "github_releases_json",
    authority: "primary",
    cadenceMinutes: 60,
    freshnessHorizonMinutes: 1440,
    enabled: false,
    validationState: "candidate",
    allowedHosts: ["api.example.com"],
    eventClasses: ["SDK_RELEASE", "SECURITY"],
    projectScopes: ["ALL"],
    ...overrides,
  };
}

async function makeRuntime(sources, policyOverrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), "nova-s3-"));
  const registryPath = join(dir, "registry.json");
  await writeFile(
    registryPath,
    JSON.stringify({ schemaVersion: 2, policy: makePolicy(policyOverrides), sources }, null, 2),
    "utf8",
  );
  const runtimeDir = join(dir, "runtime");
  return { dir, registryPath, runtimeDir };
}

function cycleArgs({ registryPath, runtimeDir }, overrides = {}) {
  return {
    registryPath,
    runtimeDir,
    maxSources: 12,
    requestBudget: 12,
    byteBudget: 12 * 1024 * 1024,
    sourceTimeoutMs: 25_000,
    cycleTimeoutMs: 5 * 60_000,
    lockStaleMs: 30 * 60_000,
    enabledOnly: false,
    dryRun: false,
    sourceIds: [],
    ...overrides,
  };
}

function releasesSummary(tags) {
  return tags.map((tag, index) => ({
    id: String(index + 1),
    tag,
    name: `Release ${tag}`,
    publishedAt: `2026-07-${String(10 + index).padStart(2, "0")}T00:00:00Z`,
    prerelease: false,
    draft: false,
    url: `https://api.example.com/r/${tag}`,
  }));
}

function fetchedWorkerResult(source, tags, at) {
  const summary = releasesSummary(tags);
  return {
    sourceId: source.id,
    parser: source.parser,
    parserVersion: 2,
    startedAt: at,
    completedAt: at,
    outcome: "FETCHED",
    holdReason: null,
    receipt: makeReceipt({
      sourceId: source.id,
      url: source.url,
      fetchedAt: at,
      recordedTime: at,
      contentHash: `sha256:${sha256(summary)}`,
      contentLength: JSON.stringify(summary).length,
      freshnessHorizonMinutes: source.freshnessHorizonMinutes,
    }),
    http: { status: 200, finalUrl: source.url, redirectChain: [], contentType: "application/json", etag: null, lastModified: null, bytes: 1, sha256: "x" },
    summary,
    error: null,
    externalActions: "READ_ONLY_GET",
    installAttempted: false,
    executeAttempted: false,
  };
}

function failedWorkerResult(source, at) {
  return {
    sourceId: source.id,
    parser: source.parser,
    parserVersion: 2,
    startedAt: at,
    completedAt: at,
    outcome: "FAILED",
    holdReason: null,
    receipt: null,
    http: null,
    summary: null,
    error: "HTTP 503",
    installAttempted: false,
    executeAttempted: false,
  };
}

function steppingClock(startIso, stepMs = 1000) {
  let t = Date.parse(startIso);
  return () => new Date((t += stepMs));
}

async function readJsonFile(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readJsonl(path) {
  const raw = await readFile(path, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

test("a full cycle writes an append-only COMPLETED receipt, checkpoints, brief, and state", async (t) => {
  const sources = [makeSource("alpha"), makeSource("beta")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  const clock = steppingClock("2026-07-22T10:00:00.000Z");
  const worker = async (payload) => fetchedWorkerResult(payload.source, ["v1"], "2026-07-22T10:00:00.500Z");
  const { runReceipt, brief } = await runNovaCycle(cycleArgs(runtime), { clock, runWorkerImpl: worker });

  assert.equal(runReceipt.state, "COMPLETED");
  assert.equal(runReceipt.sourceResults.length, 2);
  assert.ok(runReceipt.sourceResults.every((result) => result.outcome === "FETCHED" && result.promotable));
  assert.ok(runReceipt.sourceResults.every((result) => validateSourceReceipt(result.receipt).valid));
  assert.equal(runReceipt.externalActionsAllowed, false);
  assert.equal(runReceipt.installAttempted, false);
  assert.equal(runReceipt.executeDiscoveredCodeAttempted, false);
  assert.equal(runReceipt.billableModelCalls, 0);
  assert.deepEqual(runReceipt.convergenceInventoryCapability, CONVERGENCE_INVENTORY_CAPABILITY);

  // Artifacts on disk.
  const runOnDisk = await readJsonFile(resolve(runtime.runtimeDir, "runs", `${runReceipt.runId}.json`));
  assert.equal(runOnDisk.state, "COMPLETED");
  const checkpointNames = await readdir(resolve(runtime.runtimeDir, "checkpoints", runReceipt.runId));
  assert.deepEqual(checkpointNames.sort(), ["001-alpha.json", "002-beta.json"]);
  const state = await readJsonFile(resolve(runtime.runtimeDir, "state.json"));
  assert.equal(state.sources.alpha.observationState, "BASELINE_PROBING");
  assert.equal(state.sources.alpha.lastOutcome, "FETCHED");
  assert.equal(brief.sourceHealth.fetched, 2);
  // The active-run slot is cleared after terminal write.
  await assert.rejects(stat(resolve(runtime.runtimeDir, "active-run.json")));
});

test("a claimed success without a receipt is FAILED in the run receipt and promotes nothing", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  const worker = async (payload) => {
    const result = fetchedWorkerResult(payload.source, ["v1"], "2026-07-22T10:00:00.500Z");
    result.receipt = null; // fabricated success: no receipt
    return result;
  };
  const { runReceipt } = await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-22T10:00:00.000Z"),
    runWorkerImpl: worker,
  });
  assert.equal(runReceipt.sourceResults[0].outcome, "FAILED");
  assert.equal(runReceipt.sourceResults[0].promotable, false);
  assert.equal(runReceipt.sourceResults[0].reason, "claimed_success_without_valid_receipt");
  const state = await readJsonFile(resolve(runtime.runtimeDir, "state.json"));
  assert.equal(state.sources.alpha.acceptedSnapshot, null);
  assert.equal(state.sources.alpha.consecutiveFailures, 1);
});

test("HELD results pause an established source without erasing its accepted snapshot", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-22T10:00:00.000Z"),
    runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, ["v1"], "2026-07-22T10:00:00.500Z"),
  });

  const { runReceipt } = await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-23T10:00:00.000Z"),
    runWorkerImpl: async (payload) => ({
      sourceId: payload.source.id,
      outcome: "HELD",
      holdReason: "content_type_not_allowed",
      receipt: null,
      error: "Content type application/octet-stream is not allowed for github_releases_json.",
    }),
  });
  assert.equal(runReceipt.sourceResults[0].outcome, "HELD");
  const state = await readJsonFile(resolve(runtime.runtimeDir, "state.json"));
  assert.equal(state.sources.alpha.observationState, "PAUSED_FAILED_CLOSED");
  assert.notEqual(state.sources.alpha.acceptedSnapshot, null, "accepted snapshot is preserved");
  assert.equal(state.sources.alpha.consecutiveFailures, 1);
});

test("N consecutive failures append a structured alert record and back off the source", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  const days = ["2026-07-22", "2026-07-23", "2026-07-24"];
  for (const day of days) {
    await runNovaCycle(cycleArgs(runtime), {
      clock: steppingClock(`${day}T10:00:00.000Z`),
      runWorkerImpl: async (payload) => failedWorkerResult(payload.source, `${day}T10:00:00.500Z`),
    });
  }

  const state = await readJsonFile(resolve(runtime.runtimeDir, "state.json"));
  assert.equal(state.sources.alpha.consecutiveFailures, 3);

  // No alert before the threshold...
  await assert.rejects(stat(resolve(runtime.runtimeDir, "alerts", `${days[0]}.jsonl`)));
  await assert.rejects(stat(resolve(runtime.runtimeDir, "alerts", `${days[1]}.jsonl`)));
  // ...exactly one structured record at the threshold.
  const alerts = await readJsonl(resolve(runtime.runtimeDir, "alerts", `${days[2]}.jsonl`));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, "SOURCE_CONSECUTIVE_FAILURE_ALERT");
  assert.equal(alerts[0].sourceId, "alpha");
  assert.equal(alerts[0].consecutiveFailures, 3);
  assert.equal(alerts[0].delivery, "RECORD_ONLY_NO_NOTIFICATION_WIRED");
  assert.ok(alerts[0].id, "alert records carry a deterministic id for replay dedupe");
});

/** Seed two baseline cycles so the third cycle emits change events. */
async function seedBaseline(runtime, sources, tags) {
  await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-20T10:00:00.000Z"),
    runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, tags, "2026-07-20T10:00:00.500Z"),
  });
  await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-21T10:00:00.000Z"),
    runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, tags, "2026-07-21T10:00:00.500Z"),
  });
}

test("a run interrupted after a checkpoint is FAILED_CLOSED on next start and salvaged without double-counting", async (t) => {
  const sources = [makeSource("alpha"), makeSource("beta")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  await seedBaseline(runtime, sources, ["v1"]);

  // Cycle 3: alpha succeeds with a NEW release (events emitted), then the
  // process dies immediately after alpha's checkpoint is written — before
  // the event append and the state commit (worst crash point).
  const crashError = new Error("simulated model-switch death");
  await assert.rejects(
    runNovaCycle(cycleArgs(runtime), {
      clock: steppingClock("2026-07-22T10:00:00.000Z"),
      runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, ["v1", "v2"], "2026-07-22T10:00:00.500Z"),
      onCheckpointWritten: (sourceId) => {
        if (sourceId === "alpha") throw crashError;
      },
    }),
    /simulated model-switch death/,
  );

  // The dead run left a non-terminal active record and one checkpoint.
  const activeRun = await readJsonFile(resolve(runtime.runtimeDir, "active-run.json"));
  assert.equal(activeRun.state, "RUNNING");
  const interruptedRunId = activeRun.runId;
  const checkpointNames = await readdir(resolve(runtime.runtimeDir, "checkpoints", interruptedRunId));
  assert.equal(checkpointNames.length, 1);

  // Next start: recovery fail-closes the dead run, salvages alpha, and the
  // successor run polls ONLY beta (alpha's salvaged state is not due).
  const { runReceipt } = await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-22T10:30:00.000Z"),
    runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, ["v1", "v2"], "2026-07-22T10:30:00.500Z"),
  });

  const recovered = await readJsonFile(resolve(runtime.runtimeDir, "runs", `${interruptedRunId}.json`));
  assert.equal(recovered.state, "FAILED_CLOSED");
  assert.equal(recovered.failureReason, "NON_TERMINAL_RUN_RECORD_RECOVERED_AT_STARTUP");
  assert.equal(recovered.recovery.salvagedCheckpointCount, 1);
  assert.equal(recovered.recovery.recoveredBy, runReceipt.runId);

  assert.equal(runReceipt.salvage.recoveredRunId, interruptedRunId);
  assert.deepEqual(runReceipt.salvage.salvagedSourceIds, ["alpha"]);
  assert.equal(runReceipt.salvagedFromRunId, interruptedRunId);
  assert.deepEqual(
    runReceipt.sourceResults.map((result) => result.sourceId),
    ["beta"],
    "salvaged source is never re-polled by the successor run",
  );

  // Double-count guard: every event id appears exactly once across the log.
  const events = await readJsonl(resolve(runtime.runtimeDir, "events", "2026-07-22.jsonl"));
  const ids = events.map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate event ids");
  const alphaEvents = events.filter((event) => event.sourceId === "alpha");
  assert.ok(alphaEvents.length >= 1, "alpha's salvaged events were recovered into the log");

  // Alpha's per-source state reflects the salvaged checkpoint.
  const state = await readJsonFile(resolve(runtime.runtimeDir, "state.json"));
  assert.equal(state.sources.alpha.lastOutcome, "FETCHED");
  assert.equal(state.sources.alpha.acceptedSnapshot.summaryHash, sha256(releasesSummary(["v1", "v2"])));
});

test("a crash after the event append does not duplicate events on recovery", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  await seedBaseline(runtime, sources, ["v1"]);

  await assert.rejects(
    runNovaCycle(cycleArgs(runtime), {
      clock: steppingClock("2026-07-22T10:00:00.000Z"),
      runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, ["v1", "v2"], "2026-07-22T10:00:00.500Z"),
      onEventsAppended: () => {
        throw new Error("simulated crash after event append");
      },
    }),
    /after event append/,
  );

  const eventsBefore = await readJsonl(resolve(runtime.runtimeDir, "events", "2026-07-22.jsonl"));
  assert.ok(eventsBefore.length >= 1, "events were appended before the crash");

  await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-22T10:30:00.000Z"),
    runWorkerImpl: async () => {
      throw new Error("successor run must not need to poll anything");
    },
  });

  const eventsAfter = await readJsonl(resolve(runtime.runtimeDir, "events", "2026-07-22.jsonl"));
  const ids = eventsAfter.map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length, "presence-checked replay never duplicates an event id");
  assert.equal(eventsAfter.length, eventsBefore.length, "recovery appended nothing that was already durable");
});

test("recovery with zero checkpoints still fail-closes the dead run", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  await assert.rejects(
    runNovaCycle(cycleArgs(runtime), {
      clock: steppingClock("2026-07-22T10:00:00.000Z"),
      runWorkerImpl: async () => {
        throw new Error("worker exploded before any checkpoint");
      },
    }),
  );
  const activeRun = await readJsonFile(resolve(runtime.runtimeDir, "active-run.json"));
  const { runReceipt } = await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-22T11:00:00.000Z"),
    runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, ["v1"], "2026-07-22T11:00:00.500Z"),
  });
  const recovered = await readJsonFile(resolve(runtime.runtimeDir, "runs", `${activeRun.runId}.json`));
  assert.equal(recovered.state, "FAILED_CLOSED");
  assert.equal(recovered.recovery.salvagedCheckpointCount, 0);
  assert.equal(runReceipt.salvage.salvagedCheckpointCount, 0);
  // The dead run's source WAS re-polled: it had no checkpoint, so nothing
  // was counted and a fresh poll is the first count, not a double count.
  assert.deepEqual(runReceipt.sourceResults.map((result) => result.sourceId), ["alpha"]);
});

test("dry-run selects due sources without writing anything", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  const result = await runNovaCycle(cycleArgs(runtime, { dryRun: true }), {
    clock: steppingClock("2026-07-22T10:00:00.000Z"),
    runWorkerImpl: async () => {
      throw new Error("dry-run must not poll");
    },
  });
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.selectedSourceIds, ["alpha"]);
  assert.equal(result.pendingRecoveryRunId, null);
  assert.equal(result.externalActionsAllowed, false);
  await assert.rejects(stat(resolve(runtime.runtimeDir, "state.json")), "dry-run writes no state");
});

test("terminal run receipts are write-once (append-only runs directory)", async (t) => {
  const sources = [makeSource("alpha")];
  const runtime = await makeRuntime(sources);
  t.after(() => rm(runtime.dir, { recursive: true, force: true }));

  const { runReceipt } = await runNovaCycle(cycleArgs(runtime), {
    clock: steppingClock("2026-07-22T10:00:00.000Z"),
    runWorkerImpl: async (payload) => fetchedWorkerResult(payload.source, ["v1"], "2026-07-22T10:00:00.500Z"),
  });
  const path = resolve(runtime.runtimeDir, "runs", `${runReceipt.runId}.json`);
  const before = await readFile(path, "utf8");
  // A conflicting later write of the same terminal receipt is refused.
  const wrote = await writeOnceJson(path, { state: "TAMPERED" });
  assert.equal(wrote, false, "an existing terminal receipt is never overwritten");
  const after = await readFile(path, "utf8");
  assert.equal(after, before);
});

test("the run lease blocks concurrent cycles and yields only when expired or provably stale", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "nova-s3-lease-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const clock = () => new Date("2026-07-22T10:00:00.000Z");
  const release = await acquireRunLease({
    runtimeDir: dir,
    runId: "run-1",
    lockStaleMs: 30 * 60_000,
    cycleTimeoutMs: 60_000,
    clock,
  });
  // Second acquisition while active: blocked.
  await assert.rejects(
    acquireRunLease({ runtimeDir: dir, runId: "run-2", lockStaleMs: 30 * 60_000, cycleTimeoutMs: 60_000, clock }),
    /lease is active/,
  );
  await release();

  // Expired lease: taken over.
  const expired = createLease({ runId: "run-3", owner: "pid:9", now: new Date("2026-07-22T08:00:00.000Z"), ttlMs: 1000 });
  await writeFile(join(dir, "run-lease.json"), JSON.stringify(expired), "utf8");
  const release2 = await acquireRunLease({
    runtimeDir: dir,
    runId: "run-4",
    lockStaleMs: 30 * 60_000,
    cycleTimeoutMs: 60_000,
    clock,
  });
  await release2();

  // Corrupt lease: blocked until provably stale by mtime, then taken over.
  await writeFile(join(dir, "run-lease.json"), "{not json", "utf8");
  const freshTime = new Date("2026-07-22T09:59:00.000Z"); // 1 minute old per the fixed clock
  await utimes(join(dir, "run-lease.json"), freshTime, freshTime);
  await assert.rejects(
    acquireRunLease({ runtimeDir: dir, runId: "run-5", lockStaleMs: 30 * 60_000, cycleTimeoutMs: 60_000, clock }),
    /unreadable and not yet stale/,
  );
  const staleTime = new Date("2026-07-22T09:00:00.000Z");
  await utimes(join(dir, "run-lease.json"), staleTime, staleTime);
  const release3 = await acquireRunLease({
    runtimeDir: dir,
    runId: "run-6",
    lockStaleMs: 30 * 60_000,
    cycleTimeoutMs: 60_000,
    clock,
  });
  await release3();
});
