/**
 * Proof suite for the model-hash freeze.
 *
 * Run: node --test scripts/edge-lab/freeze-model-hash.test.mjs
 *
 * What each case defends:
 *   1. determinism      — the same bytes must always give the same digest, or
 *                         "--check" can never be trusted.
 *   2. sensitivity      — a one-byte edit to ANY manifest file must move the
 *                         composite, or a model could be swapped silently.
 *   3. order-invariance — the digest depends on content, not on manifest order.
 *   4. missing = hard   — a partial manifest must yield NO digest, never a
 *                         real-looking hash over a model that does not exist.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { computeFreeze, MANIFEST } from "./freeze-model-hash.mjs";

const FIXTURE = ["a/model.ts", "b/eprocess.ts", "c/prereg.md"];

function fixtureRoot(overrides = {}, omit = []) {
  const root = mkdtempSync(join(tmpdir(), "freeze-"));
  for (const rel of FIXTURE) {
    if (omit.includes(rel)) continue;
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, overrides[rel] ?? `content of ${rel}\n`);
  }
  return root;
}

test("deterministic across runs and across two identical trees", () => {
  const a = computeFreeze(fixtureRoot(), FIXTURE);
  const b = computeFreeze(fixtureRoot(), FIXTURE);
  assert.equal(a.missing.length, 0);
  assert.match(a.composite, /^[0-9a-f]{64}$/);
  assert.equal(a.composite, b.composite);
});

test("a one-byte edit to any manifest file moves the composite", () => {
  const base = computeFreeze(fixtureRoot(), FIXTURE).composite;
  for (const rel of FIXTURE) {
    const moved = computeFreeze(
      fixtureRoot({ [rel]: `content of ${rel}!\n` }),
      FIXTURE,
    ).composite;
    assert.notEqual(moved, base, `editing ${rel} did not move the composite`);
  }
});

test("manifest order does not change the composite", () => {
  const root = fixtureRoot();
  const forward = computeFreeze(root, FIXTURE).composite;
  const reversed = computeFreeze(root, [...FIXTURE].reverse()).composite;
  assert.equal(forward, reversed);
});

test("a missing file yields no digest and is reported by path", () => {
  const r = computeFreeze(fixtureRoot({}, ["b/eprocess.ts"]), FIXTURE);
  assert.equal(r.composite, null);
  assert.deepEqual(r.missing, ["b/eprocess.ts"]);
});

test("the real manifest names the model, the e-process, the runner and both protocol docs", () => {
  assert.ok(MANIFEST.includes("packages/prediction-engine/src/research/mve-eprocess.ts"));
  assert.ok(MANIFEST.includes("packages/prediction-engine/src/research/mve-model-js.ts"));
  assert.ok(MANIFEST.includes("scripts/edge-lab/run-mve.ts"));
  assert.ok(MANIFEST.includes("docs/ops/edge/2026-08-20-mve-prereg-v2.md"));
  assert.ok(MANIFEST.includes("docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md"));
});
