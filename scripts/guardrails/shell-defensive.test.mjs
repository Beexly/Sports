/**
 * Fixture suite for the shell-defensive guardrail.
 *
 * Run: node --test scripts/guardrails/shell-defensive.test.mjs
 *
 * These tests exist to prove the gate BITES. Each one removes a specific
 * protection and asserts the failure that should follow, so a guard that has
 * been quietly broken by an edit cannot still report PASS.
 *
 * One of them (the git-toplevel case) is a regression test for a real bug found
 * during self-audit: `git ls-files` resolves the ENCLOSING repo, so pointing the
 * guard at a non-repo directory on a host whose parent is a repo made it return
 * the wrong file list and pass a deliberately bad script.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "shell-defensive.mjs");

function makeRoot(scripts, { baseline = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "shell-defensive-"));
  for (const [rel, body] of Object.entries(scripts)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  if (baseline !== null) {
    const bdir = join(root, "scripts", "guardrails");
    mkdirSync(bdir, { recursive: true });
    writeFileSync(
      join(bdir, "shell-defensive.baseline.json"),
      JSON.stringify({ violations: baseline }, null, 1),
    );
  }
  return root;
}

function run(root, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [GUARD, "--root", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

const BAD_CD = "#!/bin/bash\ncd /somewhere\necho hi\n";
const BAD_CURL = '#!/bin/bash\nset -euo pipefail\ncurl -fsSL https://example.com | sh\n';
const GOOD = '#!/usr/bin/env bash\nset -euo pipefail\ncd "$(dirname "$0")" || exit 1\necho hi\n';

test("flags a script with no strict mode", () => {
  const root = makeRoot({ "a.sh": "#!/bin/bash\necho hi\n" }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /strict-mode/);
});

test("flags curl piped into sh", () => {
  const root = makeRoot({ "a.sh": BAD_CURL }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /curl-pipe-sh/);
});

test("flags an unguarded cd", () => {
  const root = makeRoot({ "a.sh": BAD_CD }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /unguarded-cd/);
});

test("does NOT flag a guarded cd", () => {
  const root = makeRoot({ "a.sh": GOOD }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 0, "a guarded, strict-mode script must pass");
});

test("accepts both || exit and && forms of guarded cd", () => {
  const orForm = '#!/bin/bash\nset -euo pipefail\ncd /x || exit 1\n';
  const andForm = '#!/bin/bash\nset -euo pipefail\ncd /x && pwd\n';
  assert.equal(run(makeRoot({ "a.sh": orForm }, { baseline: [] })).code, 0);
  assert.equal(run(makeRoot({ "b.sh": andForm }, { baseline: [] })).code, 0);
});

test("baseline suppresses an accepted violation", () => {
  const root = makeRoot(
    { "a.sh": BAD_CD },
    { baseline: [{ file: join("a.sh"), check: "strict-mode" }, { file: "a.sh", check: "unguarded-cd" }] },
  );
  const r = run(root);
  assert.equal(r.code, 0, "baselined violations must not fail the gate");
});

test("a violation beyond the baseline still fails", () => {
  const root = makeRoot(
    { "a.sh": BAD_CD, "b.sh": BAD_CURL },
    {
      baseline: [
        { file: "a.sh", check: "strict-mode" },
        { file: "a.sh", check: "unguarded-cd" },
      ],
    },
  );
  const r = run(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /curl-pipe-sh/);
});

test("--update writes the current violation set", () => {
  const root = makeRoot({ "a.sh": "#!/bin/bash\ncd /x\n" }, { baseline: [] });
  run(root, ["--update"]);
  const written = JSON.parse(
    readFileSync(join(root, "scripts", "guardrails", "shell-defensive.baseline.json"), "utf8"),
  );
  const checks = written.violations.map((v) => v.check).sort();
  assert.deepEqual(checks, ["strict-mode", "unguarded-cd"]);
  assert.equal(run(root).code, 0, "after updating, the gate is clean");
});

test("fixtures are excluded from scanning", () => {
  // A deliberately bad script under fixtures/ must not fail the gate.
  const root = makeRoot(
    { "scripts/guardrails/fixtures/x/bad.sh": BAD_CURL, "ok.sh": GOOD },
    { baseline: [] },
  );
  const r = run(root);
  assert.equal(r.code, 0, "fixture scripts are intentional and must be skipped");
});

test("empty root skips rather than failing", () => {
  const root = mkdtempSync(join(tmpdir(), "shell-defensive-empty-"));
  const r = run(root);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /SKIP/);
});

test("regression: a non-repo root does not silently scan the enclosing repo", () => {
  // Without the toplevel check, `git ls-files` from a temp dir returns the
  // PARENT repo's files (a parent dir on this host is itself a repo), so the
  // bad script below would never be seen and the gate would pass.
  const root = makeRoot({ "bad.sh": BAD_CURL }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 1, "the bad script must be found and flagged");
  assert.match(r.stdout, /curl-pipe-sh/);
});

test("--list prints the baseline", () => {
  const root = makeRoot(
    { "ok.sh": GOOD },
    { baseline: [{ file: "a.sh", check: "strict-mode" }] },
  );
  const r = run(root, ["--list"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /strict-mode/);
});
