#!/usr/bin/env node
/**
 * AWS compatibility index guardrail.
 *
 * The exact docs/aws and infra/aws-shadow paths are aliases for existing local
 * FABLE/AWS evidence. They must stay local-only: no credentials, no live AWS
 * commands, no deploy/DNS instructions, and no paid-resource activation.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const FIXTURE_PATH = resolve(ROOT, "scripts/guardrails/fixtures/aws-compatibility-index.json");

async function readText(relativePath) {
  return readFile(resolve(ROOT, relativePath), "utf8");
}

function getBoundary(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if ("gse_shadow_boundary" in value) return value.gse_shadow_boundary;
    return value;
  }
  return null;
}

function hasFalseFlag(value, flag) {
  const boundary = getBoundary(value);
  return boundary !== null && boundary[flag] === false;
}

function collectPathFailures(paths, label) {
  return paths
    .filter((path) => !existsSync(resolve(ROOT, path)))
    .map((path) => `${label} missing: ${path}`);
}

async function collectFragmentFailures(fixture) {
  const failures = [];
  for (const [path, fragments] of Object.entries(fixture.required_fragments ?? {})) {
    const text = await readText(path);
    for (const fragment of fragments) {
      if (!text.includes(fragment)) failures.push(`${path}: missing required fragment '${fragment}'`);
    }
  }
  for (const path of fixture.required_paths ?? []) {
    const text = await readText(path);
    const normalized = text.toLowerCase();
    for (const fragment of fixture.forbidden_fragments ?? []) {
      if (normalized.includes(fragment.toLowerCase())) failures.push(`${path}: forbidden AWS activation fragment '${fragment}'`);
    }
  }
  return failures;
}

async function collectJsonFixtureFailures(paths) {
  const failures = [];
  for (const path of paths) {
    const parsed = JSON.parse(await readText(path));
    for (const flag of ["live_aws_action", "deploy_allowed", "credentials_required", "paid_resource_required"]) {
      if (!hasFalseFlag(parsed, flag)) failures.push(`${path}: ${flag} must be false`);
    }
  }
  return failures;
}

async function main() {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  const failures = [
    ...collectPathFailures(fixture.required_paths ?? [], "compatibility path"),
    ...collectPathFailures(fixture.canonical_paths ?? [], "canonical path"),
    ...(await collectFragmentFailures(fixture)),
    ...(await collectJsonFixtureFailures(fixture.json_fixture_paths ?? [])),
  ];

  if (failures.length > 0) {
    console.error(`[aws-compatibility-index-scan] FAIL - ${failures.length} compatibility issue(s):`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    `[aws-compatibility-index-scan] OK - ${(fixture.required_paths ?? []).length} compatibility path(s) and ${(fixture.json_fixture_paths ?? []).length} local fixture(s) passed.`
  );
}

main().catch((error) => {
  console.error("[aws-compatibility-index-scan] unexpected error:", error);
  process.exit(2);
});
