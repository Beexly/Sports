/**
 * Mutation / fixture suite for the AI transport import-boundary guard.
 *
 * Proves — with committed fixtures — exactly what the AST detector catches and
 * what it correctly leaves alone. Run in CI via:
 *   node --test scripts/guardrails/ai-transport-import-boundary.test.mjs
 *
 * The fixtures under fixtures/ai-transport-boundary/ are EXCLUDED from the live
 * repo scan (see isExemptFromLiveScan) precisely so they can exist as offenders
 * here without failing the guard against the real tree.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { analyzeSource, isExemptFromLiveScan } from "./ai-transport-import-boundary.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "fixtures", "ai-transport-boundary");

function read(rel) {
  return readFileSync(join(fixturesRoot, rel), "utf8");
}

// Each violation fixture must produce >=1 finding, and we assert the SPECIFIC
// category so a future regression that flags for the wrong reason is caught.
const VIOLATIONS = {
  "static-import.ts": "raw-transport-import",
  "alias-import.ts": "raw-transport-import",
  "multiline-import.ts": "raw-transport-import",
  "reexport.ts": "raw-transport-reexport",
  "reexport-star-provider.ts": "raw-provider-import",
  "provider-import.ts": "raw-provider-import",
  "dynamic-import.ts": "raw-provider-import-dynamic",
  "commonjs-require.cjs": "raw-provider-import-require",
  "sdk-import.ts": "provider-sdk-import",
  "sdk-aws-import.ts": "provider-sdk-import",
  "endpoint-literal.ts": "raw-endpoint-literal",
};

const ALLOWED = [
  "error-class-import.ts",
  "error-class-multiline.ts",
  "dispatch-import.ts",
  "type-only-import.ts",
  "budget-store-import.ts",
  "comment-mention.ts",
];

test("every violation fixture is caught, with the right category", () => {
  for (const [file, expectedId] of Object.entries(VIOLATIONS)) {
    const rel = `violations/${file}`;
    const findings = analyzeSource(rel, read(rel));
    assert.ok(findings.length > 0, `${file} should be flagged but was not`);
    const ids = findings.map((f) => f.id);
    assert.ok(
      ids.includes(expectedId),
      `${file} should be flagged as ${expectedId}, got: ${ids.join(", ")}`,
    );
  }
});

test("no allowed fixture is caught (no false positives)", () => {
  for (const file of ALLOWED) {
    const rel = `allowed/${file}`;
    const findings = analyzeSource(rel, read(rel));
    assert.equal(
      findings.length,
      0,
      `${file} should be clean but was flagged: ${JSON.stringify(findings)}`,
    );
  }
});

test("fixture directory is present and non-trivial", () => {
  const v = readdirSync(join(fixturesRoot, "violations"));
  const a = readdirSync(join(fixturesRoot, "allowed"));
  assert.ok(v.length >= 10, `expected >=10 violation fixtures, got ${v.length}`);
  assert.ok(a.length >= 5, `expected >=5 allowed fixtures, got ${a.length}`);
});

test("the fixtures are excluded from the live repo scan", () => {
  assert.ok(isExemptFromLiveScan("scripts/guardrails/fixtures/ai-transport-boundary/violations/static-import.ts"));
  // sanity: a normal app file is NOT exempt
  assert.equal(isExemptFromLiveScan("apps/web/lib/some-feature.ts"), false);
});

test("exact adapter allowlist is by-file, not by-directory", () => {
  // An allowlisted adapter file is exempt...
  assert.ok(isExemptFromLiveScan("apps/web/lib/claude-api/messages.ts"));
  // ...but a NEW file dropped into the same directory is NOT (no dir-wide free pass).
  assert.equal(isExemptFromLiveScan("apps/web/lib/claude-api/sneaky-new-file.ts"), false);
});
