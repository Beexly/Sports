/**
 * Mutation / fixture suite for the AI transport import-boundary guard.
 *
 * Proves — with committed fixtures — exactly what the AST detector catches and
 * what it correctly leaves alone. Run in CI via:
 *   node --test scripts/guardrails/ai-transport-import-boundary.test.mjs
 *
 * Two proof layers:
 *   1. FIXTURES: every violation fixture must be flagged under its EXACT rule
 *      id, and every allowed fixture must stay clean. Removing any rule's
 *      detection therefore fails this suite.
 *   2. MUTATION HARNESS: for each new detection rule the guard carries
 *      MUTATION:BEGIN/END markers around the rule's code block. The harness
 *      builds a mutant guard with that block deleted and asserts the rule's
 *      fixture is NO LONGER caught (while an unrelated rule still fires). This
 *      proves each fixture actually depends on its named rule — not on an
 *      incidental overlap with another rule.
 *
 * The fixtures under fixtures/ai-transport-boundary/ are EXCLUDED from the live
 * repo scan (see isExemptFromLiveScan) precisely so they can exist as offenders
 * here without failing the guard against the real tree. Fixtures whose rule
 * depends on RELATIVE specifier resolution are analyzed under a SIMULATED
 * repo-relative path (analyzeSource takes the path as a parameter).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  analyzeSource,
  isExemptFromLiveScan,
  PERMANENT_ADAPTER_ALLOWLIST,
  TRANSITIONAL_ALLOWLIST,
} from "./ai-transport-import-boundary.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "fixtures", "ai-transport-boundary");
const guardPath = join(here, "ai-transport-import-boundary.mjs");

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
  // Gap-closure rules (directive §7.1):
  "namespace-import-transport.ts": "raw-transport-namespace-import",
  "default-import-transport.ts": "raw-transport-default-import",
  "export-star-transport.ts": "raw-transport-export-star",
  "export-star-alias-transport.ts": "raw-transport-export-star",
  "namespace-property-access.ts": "raw-transport-namespace-access",
  "namespace-computed-access.ts": "raw-transport-namespace-access",
  "namespace-destructure-access.ts": "raw-transport-namespace-access",
};

// Violation fixtures whose rule depends on resolving a RELATIVE specifier
// against the importing file's repo path (the direct barrel case): they are
// analyzed as if they lived inside apps/web/lib/claude-api/.
const SIMULATED_PATH_VIOLATIONS = [
  {
    fixture: "barrel-relative-provider-reexport.ts",
    simulatedPath: "apps/web/lib/claude-api/index.ts",
    expectedId: "raw-provider-import",
  },
  {
    fixture: "barrel-relative-export-star.ts",
    simulatedPath: "apps/web/lib/claude-api/index.ts",
    expectedId: "raw-transport-export-star",
  },
  {
    fixture: "barrel-relative-transport-dynamic.ts",
    simulatedPath: "apps/web/lib/claude-api/lazy.ts",
    expectedId: "raw-transport-dynamic",
  },
];

const ALLOWED = [
  "error-class-import.ts",
  "error-class-multiline.ts",
  "dispatch-import.ts",
  "type-only-import.ts",
  "budget-store-import.ts",
  "comment-mention.ts",
  // Near-misses for the gap-closure rules:
  "namespace-dispatch-import.ts",
  "namespace-computed-other-access.ts",
  "error-class-reexport.ts",
  "type-only-namespace-import.ts",
  "default-import-unrelated-messages.ts",
];

// Allowed fixtures that need a simulated repo path (relative specifiers that
// must resolve OUTSIDE the transport/provider modules and stay clean).
const SIMULATED_PATH_ALLOWED = [
  {
    fixture: "sibling-messages-module.ts",
    simulatedPath: "apps/web/lib/notifications/index.ts",
  },
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

test("relative barrel fixtures are caught under their simulated repo path", () => {
  for (const { fixture, simulatedPath, expectedId } of SIMULATED_PATH_VIOLATIONS) {
    const text = read(`violations/${fixture}`);
    const ids = analyzeSource(simulatedPath, text).map((f) => f.id);
    assert.ok(
      ids.includes(expectedId),
      `${fixture} @ ${simulatedPath} should be flagged as ${expectedId}, got: ${ids.join(", ") || "(none)"}`,
    );
    // The same text WITHOUT a claude-api location must not be flagged under
    // that id — proves detection came from path resolution, not a substring.
    const outsideIds = analyzeSource("apps/web/lib/unrelated/index.ts", text).map((f) => f.id);
    assert.ok(
      !outsideIds.includes(expectedId),
      `${fixture} outside claude-api should NOT be ${expectedId}, got: ${outsideIds.join(", ")}`,
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
  for (const { fixture, simulatedPath } of SIMULATED_PATH_ALLOWED) {
    const findings = analyzeSource(simulatedPath, read(`allowed/${fixture}`));
    assert.equal(
      findings.length,
      0,
      `${fixture} @ ${simulatedPath} should be clean but was flagged: ${JSON.stringify(findings)}`,
    );
  }
});

test("fixture inventory is complete: every on-disk fixture is asserted by name", () => {
  const violationFiles = readdirSync(join(fixturesRoot, "violations")).sort();
  const allowedFiles = readdirSync(join(fixturesRoot, "allowed")).sort();
  const coveredViolations = [
    ...Object.keys(VIOLATIONS),
    ...SIMULATED_PATH_VIOLATIONS.map((s) => s.fixture),
  ].sort();
  const coveredAllowed = [...ALLOWED, ...SIMULATED_PATH_ALLOWED.map((s) => s.fixture)].sort();
  assert.deepEqual(
    violationFiles,
    coveredViolations,
    "every violations/ fixture must appear in VIOLATIONS or SIMULATED_PATH_VIOLATIONS (no dead fixtures)",
  );
  assert.deepEqual(
    allowedFiles,
    coveredAllowed,
    "every allowed/ fixture must appear in ALLOWED or SIMULATED_PATH_ALLOWED (no dead fixtures)",
  );
  assert.ok(violationFiles.length >= 18, `expected >=18 violation fixtures, got ${violationFiles.length}`);
  assert.ok(allowedFiles.length >= 10, `expected >=10 allowed fixtures, got ${allowedFiles.length}`);
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

test("allowlist split: permanent vs transitional (directive §7.2, flip NOT applied)", () => {
  // The transitional set contains EXACTLY the two legacy dispatch surfaces.
  assert.deepEqual(
    [...TRANSITIONAL_ALLOWLIST].sort(),
    ["apps/web/lib/claude-api/free-lane.ts", "apps/web/lib/claude-api/provider-dispatch.ts"],
    "TRANSITIONAL_ALLOWLIST must hold exactly provider-dispatch.ts and free-lane.ts until the control-plane migration completes",
  );
  // No file may be both permanent and transitional.
  for (const f of TRANSITIONAL_ALLOWLIST) {
    assert.ok(!PERMANENT_ADAPTER_ALLOWLIST.has(f), `${f} must not also be permanent`);
  }
  // Live behavior identical to the pre-split allowlist: BOTH sets are exempt today.
  for (const f of [...PERMANENT_ADAPTER_ALLOWLIST, ...TRANSITIONAL_ALLOWLIST]) {
    assert.ok(isExemptFromLiveScan(f), `${f} must remain exempt until the documented flip condition is met`);
  }
});

// ---------------------------------------------------------------------------
// Mutation harness: delete each new rule's marker-delimited block from the
// guard source, import the mutant, and prove the rule's fixture stops being
// caught while an unrelated rule still fires.
// ---------------------------------------------------------------------------

const MUTATIONS = [
  {
    key: "transport-namespace-import",
    fixture: "violations/namespace-import-transport.ts",
    expectedId: "raw-transport-namespace-import",
  },
  {
    key: "transport-default-import",
    fixture: "violations/default-import-transport.ts",
    expectedId: "raw-transport-default-import",
  },
  {
    key: "transport-export-star",
    fixture: "violations/export-star-transport.ts",
    expectedId: "raw-transport-export-star",
  },
  {
    key: "relative-specifier-resolution",
    fixture: "violations/barrel-relative-provider-reexport.ts",
    simulatedPath: "apps/web/lib/claude-api/index.ts",
    expectedId: "raw-provider-import",
  },
  {
    key: "transport-namespace-access",
    fixture: "violations/namespace-property-access.ts",
    expectedId: "raw-transport-namespace-access",
  },
];

function buildMutant(guardSource, key) {
  const begin = `// MUTATION:BEGIN ${key}`;
  const end = `// MUTATION:END ${key}`;
  const i = guardSource.indexOf(begin);
  const j = guardSource.indexOf(end);
  assert.ok(i !== -1, `guard is missing marker "${begin}"`);
  assert.ok(j > i, `guard is missing/misordering marker "${end}"`);
  let mutated = guardSource.slice(0, i) + guardSource.slice(j + end.length);
  // Re-anchor createRequire to the REAL guard's location so the mutant (written
  // to a temp dir) still resolves the repo's `typescript` package.
  const anchor = "createRequire(import.meta.url)";
  assert.ok(mutated.includes(anchor), "guard no longer uses createRequire(import.meta.url); update the mutation harness");
  mutated = mutated.replace(anchor, `createRequire(${JSON.stringify(pathToFileURL(guardPath).href)})`);
  return mutated;
}

test("mutation: removing each new rule's detection un-catches its fixture (and only its fixture class)", async () => {
  const guardSource = readFileSync(guardPath, "utf8");
  const mutantDir = mkdtempSync(join(tmpdir(), "ai-transport-boundary-mutants-"));
  try {
    for (const m of MUTATIONS) {
      const text = read(m.fixture);
      const relPath = m.simulatedPath ?? m.fixture;

      // Baseline: the intact guard catches the fixture under the exact id.
      const baselineIds = analyzeSource(relPath, text).map((f) => f.id);
      assert.ok(
        baselineIds.includes(m.expectedId),
        `[${m.key}] baseline should flag ${m.fixture} as ${m.expectedId}, got: ${baselineIds.join(", ") || "(none)"}`,
      );

      // Mutant: rule block removed -> the fixture is no longer caught under it.
      const mutantPath = join(mutantDir, `mutant-${m.key}.mjs`);
      writeFileSync(mutantPath, buildMutant(guardSource, m.key));
      const mutant = await import(pathToFileURL(mutantPath).href);
      const mutantIds = mutant.analyzeSource(relPath, text).map((f) => f.id);
      assert.ok(
        !mutantIds.includes(m.expectedId),
        `[${m.key}] removing the detection block should stop ${m.expectedId} on ${m.fixture}; still got: ${mutantIds.join(", ")}`,
      );

      // Surgical-mutation control: an UNRELATED rule still fires in the mutant,
      // proving the mutation disabled one rule rather than breaking the parser.
      const controlIds = mutant
        .analyzeSource("violations/static-import.ts", read("violations/static-import.ts"))
        .map((f) => f.id);
      assert.ok(
        controlIds.includes("raw-transport-import"),
        `[${m.key}] mutant should still flag static-import.ts as raw-transport-import, got: ${controlIds.join(", ") || "(none)"}`,
      );
    }
  } finally {
    rmSync(mutantDir, { recursive: true, force: true });
  }
});
