#!/usr/bin/env node
/**
 * API payload-rights guardrail.
 *
 * Runs local fixture payloads through a conservative field-level policy:
 * API v1 may expose GSE-derived intelligence, public drivers, and aggregate
 * summaries from known rights-registry sources. It must not expose raw source
 * values, protected weights, provider identifiers, raw vendor payloads, unknown
 * sources, empty source lineage, personal data, or partner-sharing payloads
 * without a future explicit approval path.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const FIXTURE_PATH = resolve(ROOT, "scripts/guardrails/fixtures/api-payload-rights.json");
const REGISTRY_PATH = resolve(ROOT, "apps/web/lib/scraping/source-rights-registry.ts");
const SAFE_FIELD_KINDS = new Set(["derived_metric", "public_driver", "aggregate_summary"]);
const BLOCKED_FIELD_KINDS = new Set(["raw_source_value", "protected_weight", "provider_identifier"]);
const VALID_USES = new Set(["commercial_display", "derived_feature", "public_display", "partner_sharing"]);

function extractSourceIds(registryText) {
  return new Set([...registryText.matchAll(/source_id:\s*"([^"]+)"/g)].map((match) => match[1]));
}

function unique(values) {
  return [...new Set(values)];
}

function evaluateField(field, intendedUse, knownSources) {
  const blockers = [];
  if (!SAFE_FIELD_KINDS.has(field.kind) || BLOCKED_FIELD_KINDS.has(field.kind)) {
    blockers.push("RAW_OR_PROTECTED_FIELD");
  }
  if (!Array.isArray(field.sourceIds) || field.sourceIds.length === 0) {
    blockers.push("MISSING_SOURCE");
  } else {
    const unknownSources = field.sourceIds.filter((sourceId) => !knownSources.has(sourceId));
    if (unknownSources.length > 0) blockers.push("UNKNOWN_SOURCE");
  }
  if (field.rawVendorPayload === true) blockers.push("RAW_VENDOR_PAYLOAD");
  if (field.includesPersonalData === true) blockers.push("PERSONAL_DATA");
  if (intendedUse === "partner_sharing") blockers.push("PARTNER_SHARING_REQUIRES_APPROVAL");
  return {
    blockers: unique(blockers),
    ok: blockers.length === 0,
    path: field.path,
  };
}

function evaluateCase(testCase, knownSources) {
  const blockers = [];
  if (!VALID_USES.has(testCase.intendedUse)) blockers.push("UNKNOWN_USE");
  const fieldResults = (testCase.fields ?? []).map((field) => evaluateField(field, testCase.intendedUse, knownSources));
  fieldResults.forEach((result) => blockers.push(...result.blockers.map((blocker) => `${result.path}:${blocker}`)));
  const blockedFields = fieldResults.filter((result) => !result.ok).map((result) => result.path);
  return {
    blockedFields,
    blockers: unique(blockers),
    ok: blockers.length === 0,
  };
}

function containsAll(actual, expected) {
  return expected.every((value) => actual.includes(value));
}

async function main() {
  const [fixtureText, registryText] = await Promise.all([
    readFile(FIXTURE_PATH, "utf8"),
    readFile(REGISTRY_PATH, "utf8"),
  ]);
  const fixture = JSON.parse(fixtureText);
  const knownSources = extractSourceIds(registryText);
  const failures = [];

  for (const testCase of fixture.cases ?? []) {
    const result = evaluateCase(testCase, knownSources);
    if (result.ok !== testCase.expectedOk) {
      failures.push(`${testCase.id}: expected ${testCase.expectedOk ? "PASS" : "BLOCK"} but got ${result.ok ? "PASS" : "BLOCK"}`);
    }
    if (!containsAll(result.blockedFields, testCase.expectedBlockedFields ?? [])) {
      failures.push(`${testCase.id}: expected blocked fields ${(testCase.expectedBlockedFields ?? []).join(",")}; actual=${result.blockedFields.join(",")}`);
    }
    const actualBlockerCodes = result.blockers.map((blocker) => blocker.split(":").at(-1));
    if (!containsAll(actualBlockerCodes, testCase.expectedBlockers ?? [])) {
      failures.push(`${testCase.id}: expected blockers ${(testCase.expectedBlockers ?? []).join(",")}; actual=${actualBlockerCodes.join(",")}`);
    }
  }

  if (failures.length > 0) {
    console.error(`[api-payload-rights-scan] FAIL - ${failures.length} fixture failure(s):`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(`[api-payload-rights-scan] OK - ${fixture.cases.length} fixture case(s) passed; unsafe API fields fail closed.`);
}

main().catch((error) => {
  console.error("[api-payload-rights-scan] unexpected error:", error);
  process.exit(2);
});
