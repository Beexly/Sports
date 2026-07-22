/**
 * NOVA S3 change-intelligence + source-doctor tests (node:test).
 * Extracted from the frozen #146 reference (fbc3cfe) and adapted to the
 * hardened S3 vocabulary: registry schema v2, same-origin redirect policy,
 * and the exact FETCHED / NOT_MODIFIED / HELD / FAILED outcomes.
 * Run: npm run nova:runtime:test
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_VERIFICATION_STATES,
  EVIDENCE_QUALITY_BY_STATE,
  buildOpportunityCandidate,
  corroborateEvent,
  deduplicateEvents,
  diffSnapshots,
  routeEvent,
  scoreOpportunity,
  stableSerialize,
} from "./change-intelligence.mjs";
import { fetchBounded, pollSource, summarizeSourceBody, validateRegistry } from "./source-doctor.mjs";

const source = Object.freeze({
  id: "vendor-releases",
  organization: "Vendor",
  name: "Vendor releases",
  url: "https://api.example.com/releases",
  kind: "official_repository_releases",
  parser: "github_releases_json",
  authority: "primary",
  cadenceMinutes: 360,
  freshnessHorizonMinutes: 1440,
  enabled: false,
  validationState: "candidate",
  allowedHosts: ["api.example.com"],
  eventClasses: ["SECURITY", "BREAKING_CHANGE", "DEPRECATION", "MODEL_RELEASE", "SDK_RELEASE"],
  projectScopes: ["ALL"],
});

export function validPolicy(overrides = {}) {
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

function registryWith(sources, policyOverrides = {}) {
  return {
    schemaVersion: 2,
    policy: validPolicy(policyOverrides),
    sources,
  };
}

test("stableSerialize is key-order deterministic", () => {
  assert.equal(stableSerialize({ b: 2, a: { y: 2, x: 1 } }), stableSerialize({ a: { x: 1, y: 2 }, b: 2 }));
});

test("registry validation rejects duplicate ids, insecure URLs, and premature enablement", () => {
  const invalid = validateRegistry(
    registryWith([
      { ...source, enabled: true },
      { ...source, url: "http://api.example.com/releases" },
    ]),
  );
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes("enabled without validationState=live_validated")));
  assert.ok(invalid.errors.some((error) => error.includes("duplicates")));
  assert.ok(invalid.errors.some((error) => error.includes("HTTPS")));
});

test("registry validation accepts a disabled primary candidate", () => {
  const result = validateRegistry(registryWith([source]));
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("registry schema v1 is rejected — S3 requires the hardened v2 policy", () => {
  const result = validateRegistry({ schemaVersion: 1, policy: validPolicy(), sources: [source] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("schemaVersion must be 2")));
});

test("registry validation demands redirect policy, alert threshold, and freshness horizon", () => {
  const missing = validateRegistry({
    schemaVersion: 2,
    policy: {
      defaultEnabled: false,
      httpsOnly: true,
      maxRedirects: 2,
      defaultTimeoutMs: 10000,
      defaultMaxBytes: 1048576,
      userAgent: "ua",
      secondarySourcesMayVerify: false,
      autoInstallAllowed: false,
      autoExecuteAllowed: false,
    },
    sources: [source],
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.some((error) => error.includes("redirectPolicy")));
  assert.ok(missing.errors.some((error) => error.includes("failureAlertThreshold")));
  assert.ok(missing.errors.some((error) => error.includes("defaultFreshnessHorizonMinutes")));
});

test("registry validation rejects a freshness horizon shorter than the cadence", () => {
  const result = validateRegistry(registryWith([{ ...source, freshnessHorizonMinutes: 120 }]));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes(">= cadenceMinutes")));
});

test("fetchBounded refuses a redirect to an unapproved host", async () => {
  const fetchImpl = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://evil.example/download" },
    });
  await assert.rejects(fetchBounded(source, { fetchImpl }), /redirect_target_not_allowlisted/);
});

test("fetchBounded refuses a cross-origin redirect even to an allowlisted host by default", async () => {
  const wide = { ...source, allowedHosts: ["api.example.com", "cdn.example.com"] };
  const fetchImpl = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://cdn.example.com/releases" },
    });
  await assert.rejects(fetchBounded(wide, { fetchImpl }), /redirect_target_cross_origin/);
});

test("fetchBounded follows a same-origin redirect and records the chain", async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      return new Response(null, { status: 301, headers: { location: "https://api.example.com/releases-v2" } });
    }
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  const fetched = await fetchBounded(source, { fetchImpl });
  assert.equal(fetched.status, 200);
  assert.equal(fetched.finalUrl, "https://api.example.com/releases-v2");
  assert.deepEqual(fetched.redirectChain, [{ url: "https://api.example.com/releases", httpStatus: 301 }]);
});

test("fetchBounded blocks an incompatible content type", async () => {
  const fetchImpl = async () =>
    new Response("binary", {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
  await assert.rejects(fetchBounded(source, { fetchImpl }), /Content type/);
});

test("fetchBounded enforces the response byte ceiling", async () => {
  const fetchImpl = async () =>
    new Response("1234567890", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(fetchBounded(source, { fetchImpl, maxBytes: 5 }), /exceeded/);
});

test("pollSource fails closed on network error and records no install or execution", async () => {
  const fetchImpl = async () => {
    throw new Error("network unavailable");
  };
  const result = await pollSource(source, { fetchImpl });
  assert.equal(result.outcome, "FAILED");
  assert.equal(result.receipt, null);
  assert.equal(result.installAttempted, false);
  assert.equal(result.executeAttempted, false);
  assert.match(result.error, /network unavailable/);
});

test("pollSource classifies a policy refusal as HELD with a hold reason and no receipt", async () => {
  const fetchImpl = async () =>
    new Response("binary", { status: 200, headers: { "content-type": "application/octet-stream" } });
  const result = await pollSource(source, { fetchImpl });
  assert.equal(result.outcome, "HELD");
  assert.equal(result.holdReason, "content_type_not_allowed");
  assert.equal(result.receipt, null);
  assert.equal(result.summary, null);
});

test("pollSource reports the bytes received before a byte-ceiling HELD so budgets can charge them", async () => {
  const fetchImpl = async () =>
    new Response("1234567890", { status: 200, headers: { "content-type": "application/json" } });
  const result = await pollSource(source, { fetchImpl, maxBytes: 5 });
  assert.equal(result.outcome, "HELD");
  assert.equal(result.holdReason, "received_bytes_exceed_ceiling");
  assert.equal(result.receivedBytes, 10, "the streamed bytes are reported even though the result is HELD");
});

test("pollSource yields a schema-valid receipt with effective vs recorded time on success", async () => {
  const payload = JSON.stringify([
    { id: 1, tag_name: "v1", name: "One", published_at: "2026-07-01T00:00:00Z", html_url: "https://api.example.com/r/1" },
    { id: 2, tag_name: "v2", name: "Two", published_at: "2026-07-15T00:00:00Z", html_url: "https://api.example.com/r/2" },
  ]);
  const fetchImpl = async () =>
    new Response(payload, { status: 200, headers: { "content-type": "application/json", etag: '"abc"' } });
  const result = await pollSource(source, { fetchImpl });
  assert.equal(result.outcome, "FETCHED");
  const receipt = result.receipt;
  assert.equal(receipt.sourceId, source.id);
  assert.equal(receipt.url, source.url);
  assert.equal(receipt.httpStatus, 200);
  assert.equal(receipt.contentType, "application/json");
  assert.equal(receipt.contentLength, Buffer.byteLength(payload));
  assert.match(receipt.contentHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(receipt.parserVersion, 2);
  assert.deepEqual(receipt.redirectChain, []);
  assert.equal(receipt.effectiveTime, "2026-07-15T00:00:00.000Z");
  assert.ok(Number.isFinite(Date.parse(receipt.recordedTime)));
  assert.equal(receipt.freshnessHorizonMinutes, 1440);
});

test("pollSource reports NOT_MODIFIED with a receipt for a 304 conditional response", async () => {
  const fetchImpl = async () => new Response(null, { status: 304, headers: {} });
  const result = await pollSource(source, { fetchImpl, conditional: { etag: '"abc"' } });
  assert.equal(result.outcome, "NOT_MODIFIED");
  assert.equal(result.receipt.httpStatus, 304);
  assert.equal(result.receipt.contentHash, null);
  assert.equal(result.receipt.contentLength, 0);
});

test("GitHub release summaries retain metadata but not release bodies", () => {
  const summary = summarizeSourceBody(
    source,
    JSON.stringify([
      {
        id: 10,
        tag_name: "v2.0.0",
        name: "Security and breaking update",
        body: "A very long release body that should not enter the normalized summary.",
        published_at: "2026-07-21T00:00:00Z",
        html_url: "https://example.com/release",
      },
    ]),
  );
  assert.equal(summary.length, 1);
  assert.equal(summary[0].tag, "v2.0.0");
  assert.equal(Object.hasOwn(summary[0], "body"), false);
});

test("a new primary release from ONE fetch is OBSERVED_PRIMARY, never born VERIFIED", () => {
  const events = diffSnapshots(
    source,
    { summary: [{ id: "1", tag: "v1", name: "Initial", publishedAt: "2026-07-20T00:00:00Z" }] },
    {
      summary: [
        { id: "2", tag: "v2", name: "Security breaking update", publishedAt: "2026-07-21T00:00:00Z" },
        { id: "1", tag: "v1", name: "Initial", publishedAt: "2026-07-20T00:00:00Z" },
      ],
    },
    new Date("2026-07-21T01:00:00Z"),
  );
  const added = events.find((event) => event.kind === "NEW_ITEM" && event.itemId === "2");
  assert.ok(added);
  assert.equal(added.verificationState, "OBSERVED_PRIMARY");
  assert.equal(added.verified, false, "a single observation is never VERIFIED");
  assert.equal(added.eventClass, "SECURITY");
  assert.equal(added.urgency, 100);
});

test("VERIFIED is unreachable from a single fetch for every event kind and authority", () => {
  for (const authority of ["primary", "secondary"]) {
    const src = { ...source, authority };
    const events = [
      ...diffSnapshots(src, { summary: [{ id: "1", title: "Old" }] }, { summary: [{ id: "2", title: "New" }] }),
      ...diffSnapshots(
        { ...src, parser: "structured_page_delta" },
        { summary: { title: "Before", headings: [] }, summaryHash: "h1" },
        { summary: { title: "After", headings: [] }, summaryHash: "h2" },
      ),
    ];
    assert.ok(events.length >= 2, `${authority}: fixture emits events`);
    for (const event of events) {
      assert.notEqual(event.verificationState, "VERIFIED", `${authority}/${event.kind}`);
      assert.equal(event.verified, false, `${authority}/${event.kind}`);
      assert.ok(EVENT_VERIFICATION_STATES.includes(event.verificationState), `${authority}/${event.kind}`);
    }
  }
});

test("corroborateEvent promotes OBSERVED_PRIMARY to VERIFIED only with two DISTINCT snapshots", () => {
  const [event] = diffSnapshots(source, { summary: [] }, { summary: [{ id: "1", tag: "v1", name: "One" }] });
  assert.equal(event.verificationState, "OBSERVED_PRIMARY");

  const verified = corroborateEvent(event, { kind: "DISTINCT_SNAPSHOTS", snapshotHashes: ["sha256:a", "sha256:b"] });
  assert.equal(verified.verificationState, "VERIFIED");
  assert.equal(verified.verified, true);
  assert.equal(verified.corroboration.kind, "DISTINCT_SNAPSHOTS");

  // The same snapshot observed twice is ONE observation, not corroboration.
  assert.throws(() => corroborateEvent(event, { kind: "DISTINCT_SNAPSHOTS", snapshotHashes: ["sha256:a", "sha256:a"] }));
  assert.throws(() => corroborateEvent(event, { kind: "DISTINCT_SNAPSHOTS", snapshotHashes: ["sha256:a"] }));
  assert.throws(() => corroborateEvent(event, { kind: "DISTINCT_SNAPSHOTS", snapshotHashes: [] }));
  assert.throws(() => corroborateEvent(event, {}));
  assert.throws(() => corroborateEvent(event, { kind: "TRUST_ME" }));
});

test("corroborateEvent accepts an explicit named validation and refuses anonymous ones", () => {
  const [event] = diffSnapshots(source, { summary: [] }, { summary: [{ id: "1", tag: "v1", name: "One" }] });
  const verified = corroborateEvent(event, {
    kind: "EXPLICIT_VALIDATION",
    validatedBy: "owner:garrett",
    validatedAt: "2026-07-22T00:00:00.000Z",
  });
  assert.equal(verified.verificationState, "VERIFIED");
  assert.throws(() => corroborateEvent(event, { kind: "EXPLICIT_VALIDATION", validatedBy: "", validatedAt: "2026-07-22T00:00:00.000Z" }));
  assert.throws(() => corroborateEvent(event, { kind: "EXPLICIT_VALIDATION", validatedBy: "owner:garrett", validatedAt: "garbage" }));
});

test("secondary observations can never be corroborated to VERIFIED", () => {
  const secondary = { ...source, authority: "secondary" };
  const [event] = diffSnapshots(secondary, { summary: [] }, { summary: [{ id: "1", title: "New model" }] });
  assert.equal(event.verificationState, "OBSERVED");
  assert.throws(
    () => corroborateEvent(event, { kind: "DISTINCT_SNAPSHOTS", snapshotHashes: ["sha256:a", "sha256:b"] }),
    /OBSERVED_PRIMARY/,
  );
});

test("evidence quality: OBSERVED_PRIMARY sits strictly between OBSERVED and VERIFIED and below 1", () => {
  assert.equal(EVIDENCE_QUALITY_BY_STATE.VERIFIED, 1);
  assert.ok(EVIDENCE_QUALITY_BY_STATE.OBSERVED_PRIMARY < 1, "one primary fetch is never full evidence");
  assert.ok(EVIDENCE_QUALITY_BY_STATE.OBSERVED_PRIMARY > EVIDENCE_QUALITY_BY_STATE.OBSERVED);

  const base = {
    projectFits: [{ projectId: "GSE", fitScore: 90 }],
    expectedAnnualNetValue: 10000,
    timeToValueDays: 7,
    implementationHours: 8,
    reversibility: 0.9,
    risk: 0.1,
    maintenanceBurden: 0.1,
    founderAttentionCost: 0.1,
    competitiveHalfLifeDays: 90,
  };
  const eventFor = (verificationState) => ({
    id: "event-q",
    verificationState,
    verified: verificationState === "VERIFIED",
    urgency: 70,
    sourceId: source.id,
    eventClass: "MODEL_RELEASE",
    observedAt: "2026-07-21T00:00:00Z",
    evidenceAuthority: "primary",
  });
  const observed = scoreOpportunity({ ...base, event: eventFor("OBSERVED") });
  const observedPrimary = scoreOpportunity({ ...base, event: eventFor("OBSERVED_PRIMARY") });
  const verified = scoreOpportunity({ ...base, event: eventFor("VERIFIED") });
  assert.equal(observedPrimary.components.evidenceQuality, EVIDENCE_QUALITY_BY_STATE.OBSERVED_PRIMARY);
  assert.ok(observed.score <= observedPrimary.score);
  assert.ok(observedPrimary.score <= verified.score);
});

test("an opportunity candidate from a single primary observation reports OBSERVED_PRIMARY status", () => {
  const [event] = diffSnapshots(source, { summary: [] }, { summary: [{ id: "1", tag: "v1", name: "One" }] });
  const candidate = buildOpportunityCandidate({
    event,
    projectFits: [{ projectId: "GSE", fitScore: 80 }],
    expectedAnnualNetValue: 1000,
    timeToValueDays: 10,
    implementationHours: 2,
  });
  assert.equal(candidate.status, "OBSERVED_PRIMARY");
  assert.equal(candidate.verifiedChange, false);
});

test("unchanged snapshots emit no change events", () => {
  const snapshot = { summary: [{ id: "1", tag: "v1", name: "Initial" }] };
  assert.deepEqual(diffSnapshots(source, snapshot, snapshot), []);
});

test("secondary evidence can discover a change but cannot verify it", () => {
  const secondary = { ...source, authority: "secondary" };
  const events = diffSnapshots(secondary, { summary: [] }, { summary: [{ id: "1", title: "New model" }] });
  assert.equal(events.length, 1);
  assert.equal(events[0].verified, false);
});

test("deduplicateEvents keeps the newest observation for one event id", () => {
  const events = deduplicateEvents([
    { id: "same", observedAt: "2026-07-20T00:00:00Z", urgency: 50 },
    { id: "same", observedAt: "2026-07-21T00:00:00Z", urgency: 70 },
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0].urgency, 70);
});

test("opportunity scoring penalizes risk, maintenance, effort, and founder attention", () => {
  const event = {
    id: "event-1",
    verified: true,
    urgency: 70,
    sourceId: source.id,
    title: "Candidate",
    eventClass: "MODEL_RELEASE",
    observedAt: "2026-07-21T00:00:00Z",
    evidenceAuthority: "primary",
  };
  const base = {
    event,
    projectFits: [{ projectId: "GSE", fitScore: 90 }],
    expectedAnnualNetValue: 10000,
    timeToValueDays: 7,
    implementationHours: 8,
    reversibility: 0.9,
    competitiveHalfLifeDays: 90,
  };
  const safe = scoreOpportunity({ ...base, risk: 0.1, maintenanceBurden: 0.1, founderAttentionCost: 0.1 });
  const costly = scoreOpportunity({
    ...base,
    risk: 0.9,
    maintenanceBurden: 0.9,
    founderAttentionCost: 0.9,
    implementationHours: 160,
  });
  assert.ok(safe.score > costly.score);
});

test("opportunity candidates never count estimates as realized revenue or usable credits", () => {
  const event = {
    id: "event-2",
    verified: true,
    urgency: 72,
    sourceId: source.id,
    title: "Startup credit program",
    eventClass: "CREDIT_PROGRAM",
    observedAt: "2026-07-21T00:00:00Z",
    evidenceAuthority: "primary",
  };
  const candidate = buildOpportunityCandidate({
    event,
    projectFits: [{ projectId: "GSE", fitScore: 80 }],
    expectedAnnualNetValue: 25000,
    timeToValueDays: 30,
    implementationHours: 3,
    reversibility: 1,
    risk: 0.2,
    maintenanceBurden: 0.1,
    founderAttentionCost: 0.2,
    competitiveHalfLifeDays: 365,
  });
  assert.equal(candidate.economics.expectedAnnualNetValue, 25000);
  assert.equal(candidate.economics.realizedRevenue, 0);
  assert.equal(candidate.economics.usableCredits, 0);
  assert.equal(candidate.priority.assumptions.some((item) => item.includes("not revenue")), true);
});

test("critical security changes route immediately without external authority", () => {
  const route = routeEvent({ id: "security", eventClass: "SECURITY", urgency: 100 });
  assert.equal(route.immediate, true);
  assert.equal(route.externalActionsAllowed, false);
  assert.equal(route.ownerApprovalRequired, true);
  assert.ok(route.reviewers.includes("TAL"));
  assert.ok(route.reviewers.includes("GAUGE"));
});
