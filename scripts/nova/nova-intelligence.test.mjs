import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpportunityCandidate,
  deduplicateEvents,
  diffSnapshots,
  routeEvent,
  scoreOpportunity,
  stableSerialize,
} from "./change-intelligence.mjs";
import {
  fetchBounded,
  pollSource,
  summarizeSourceBody,
  validateRegistry,
} from "./source-doctor.mjs";

const source = Object.freeze({
  id: "vendor-releases",
  organization: "Vendor",
  name: "Vendor releases",
  url: "https://api.example.com/releases",
  kind: "official_repository_releases",
  parser: "github_releases_json",
  authority: "primary",
  cadenceMinutes: 360,
  enabled: false,
  validationState: "candidate",
  allowedHosts: ["api.example.com"],
  eventClasses: ["SECURITY", "BREAKING_CHANGE", "DEPRECATION", "MODEL_RELEASE", "SDK_RELEASE"],
  projectScopes: ["ALL"],
});

function registryWith(sources) {
  return {
    schemaVersion: 1,
    policy: {},
    sources,
  };
}

test("stableSerialize is key-order deterministic", () => {
  assert.equal(stableSerialize({ b: 2, a: { y: 2, x: 1 } }), stableSerialize({ a: { x: 1, y: 2 }, b: 2 }));
});

test("registry validation rejects duplicate ids, insecure URLs, and premature enablement", () => {
  const invalid = validateRegistry(registryWith([
    { ...source, enabled: true },
    { ...source, url: "http://api.example.com/releases" },
  ]));
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes("enabled without validationState=live_validated")));
  assert.ok(invalid.errors.some((error) => error.includes("duplicates")));
  assert.ok(invalid.errors.some((error) => error.includes("HTTPS")));
});

test("registry validation accepts a disabled primary candidate", () => {
  const result = validateRegistry(registryWith([source]));
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("fetchBounded blocks redirects to an unapproved host", async () => {
  const fetchImpl = async () => new Response(null, {
    status: 302,
    headers: { location: "https://evil.example/download" },
  });
  await assert.rejects(
    fetchBounded(source, { fetchImpl }),
    /not allowlisted/,
  );
});

test("fetchBounded blocks an incompatible content type", async () => {
  const fetchImpl = async () => new Response("binary", {
    status: 200,
    headers: { "content-type": "application/octet-stream" },
  });
  await assert.rejects(fetchBounded(source, { fetchImpl }), /Content type/);
});

test("fetchBounded enforces the response byte ceiling", async () => {
  const fetchImpl = async () => new Response("1234567890", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(fetchBounded(source, { fetchImpl, maxBytes: 5 }), /exceeded/);
});

test("pollSource fails closed and records no install or execution", async () => {
  const fetchImpl = async () => {
    throw new Error("network unavailable");
  };
  const result = await pollSource(source, { fetchImpl });
  assert.equal(result.outcome, "FAILED_CLOSED");
  assert.equal(result.installAttempted, false);
  assert.equal(result.executeAttempted, false);
  assert.match(result.error, /network unavailable/);
});

test("GitHub release summaries retain metadata but not release bodies", () => {
  const summary = summarizeSourceBody(source, JSON.stringify([
    {
      id: 10,
      tag_name: "v2.0.0",
      name: "Security and breaking update",
      body: "A very long release body that should not enter the normalized summary.",
      published_at: "2026-07-21T00:00:00Z",
      html_url: "https://example.com/release",
    },
  ]));
  assert.equal(summary.length, 1);
  assert.equal(summary[0].tag, "v2.0.0");
  assert.equal(Object.hasOwn(summary[0], "body"), false);
});

test("diffSnapshots emits one verified event for a new primary release", () => {
  const events = diffSnapshots(
    source,
    { summary: [{ id: "1", tag: "v1", name: "Initial", publishedAt: "2026-07-20T00:00:00Z" }] },
    { summary: [
      { id: "2", tag: "v2", name: "Security breaking update", publishedAt: "2026-07-21T00:00:00Z" },
      { id: "1", tag: "v1", name: "Initial", publishedAt: "2026-07-20T00:00:00Z" },
    ] },
    new Date("2026-07-21T01:00:00Z"),
  );
  const added = events.find((event) => event.kind === "NEW_ITEM" && event.itemId === "2");
  assert.ok(added);
  assert.equal(added.verified, true);
  assert.equal(added.eventClass, "SECURITY");
  assert.equal(added.urgency, 100);
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
  const costly = scoreOpportunity({ ...base, risk: 0.9, maintenanceBurden: 0.9, founderAttentionCost: 0.9, implementationHours: 160 });
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
