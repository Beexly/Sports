#!/usr/bin/env node
/**
 * OpenAPI security guardrail.
 *
 * API v1 remains a shadow contract. This scanner checks the local OpenAPI
 * generator and endpoint contract source for required auth/scope/security
 * metadata and blocks obvious live-route promotion markers.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const FIXTURE_PATH = resolve(ROOT, "scripts/guardrails/fixtures/openapi-security.json");
const SCOPES_PATH = resolve(ROOT, "apps/web/lib/api/v1/scopes.ts");

async function readRepoFile(relativePath) {
  return readFile(resolve(ROOT, relativePath), "utf8");
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function collectFragmentFailures(fixture, fileTexts) {
  const failures = [];
  for (const [file, fragments] of Object.entries(fixture.requiredFragments ?? {})) {
    const text = fileTexts.get(file);
    if (text === undefined) {
      failures.push(`${file}: file missing`);
      continue;
    }
    for (const fragment of fragments) {
      if (!text.includes(fragment)) failures.push(`${file}: missing required fragment '${fragment}'`);
    }
  }
  for (const [file, fragments] of Object.entries(fixture.forbiddenFragments ?? {})) {
    const text = fileTexts.get(file);
    if (text === undefined) continue;
    for (const fragment of fragments) {
      if (text.includes(fragment)) failures.push(`${file}: forbidden fragment '${fragment}'`);
    }
  }
  return failures;
}

async function collectEndpointContractFailures() {
  const text = await readFile(SCOPES_PATH, "utf8");
  const endpointCount = countMatches(text, /id:\s*"[^"]+"/g);
  const requiredScopesCount = countMatches(text, /requiredScopes:\s*\[[^\]]+\]/g);
  const shadowStatusCount = countMatches(text, /status:\s*"shadow_only"/g);
  const emptyScopesCount = countMatches(text, /requiredScopes:\s*\[\s*\]/g);
  const failures = [];

  if (endpointCount === 0) failures.push("apps/web/lib/api/v1/scopes.ts: no endpoint contracts found");
  if (requiredScopesCount !== endpointCount) {
    failures.push(`apps/web/lib/api/v1/scopes.ts: endpoint count ${endpointCount} does not match requiredScopes count ${requiredScopesCount}`);
  }
  if (shadowStatusCount !== endpointCount) {
    failures.push(`apps/web/lib/api/v1/scopes.ts: endpoint count ${endpointCount} does not match shadow_only count ${shadowStatusCount}`);
  }
  if (emptyScopesCount > 0) failures.push("apps/web/lib/api/v1/scopes.ts: at least one endpoint has empty requiredScopes");

  return failures;
}

async function main() {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  const files = unique([
    ...Object.keys(fixture.requiredFragments ?? {}),
    ...Object.keys(fixture.forbiddenFragments ?? {}),
  ]);
  const fileTexts = new Map();
  for (const file of files) {
    fileTexts.set(file, await readRepoFile(file));
  }

  const failures = [
    ...collectFragmentFailures(fixture, fileTexts),
    ...(await collectEndpointContractFailures()),
  ];

  if (failures.length > 0) {
    console.error(`[openapi-security-scan] FAIL - ${failures.length} security contract failure(s):`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(`[openapi-security-scan] OK - ${files.length} contract file(s) passed shadow OpenAPI security checks.`);
}

function unique(values) {
  return [...new Set(values)];
}

main().catch((error) => {
  console.error("[openapi-security-scan] unexpected error:", error);
  process.exit(2);
});
