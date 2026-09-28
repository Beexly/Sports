/**
 * The public/private surface doctrine guard is itself pinned.
 *
 * WHY A GUARD NEEDS A GUARD. This file was written and then MEASURED, and two
 * earlier designs both passed a real leak while reporting green:
 *
 *   1. Exempting whole FILES named in the doctrine inventory. One acknowledged
 *      finding then blinds every future disclosure in that file.
 *   2. Exempting (file, rule-id) pairs. A NEW metric leak added to a file that
 *      already had an acknowledged metric leak was still exempt. Proven by
 *      injecting "weights WOPR and target share at 0.42 in the aggregation
 *      formula" into apps/web/app/board/page.tsx — an inventoried page — and
 *      watching the guard report 0 drift.
 *
 * The shipped design pins acknowledgements by matched TEXT, and these tests hold
 * it to that. A guard that cannot be shown to fail is a guard that gets deleted.
 *
 * Run with `node --test` (matching scripts/guardrails/*.test.mjs convention in
 * this repo), NOT vitest — see package.json test:public-surface-doctrine.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "public-private-surface-doctrine.mjs");
const ROOT = resolve(HERE, "..", "..");

function runGuard(cwd) {
  try {
    const out = execFileSync("node", [GUARD], { cwd, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (error) {
    return {
      code: error.status ?? 1,
      out: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

/** A throwaway repo-shaped tree containing the guard's scan target. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "surface-doctrine-"));
  mkdirSync(join(dir, "apps", "web", "app", "safe"), { recursive: true });
  return dir;
}

function withPage(dir, body) {
  writeFileSync(join(dir, "apps", "web", "app", "safe", "page.tsx"), body);
}

test("passes a clean public surface", () => {
  const dir = sandbox();
  try {
    withPage(dir, "export default function P() {\n  return <div>Projections and rankings only.</div>;\n}\n");
    const res = runGuard(dir);
    assert.equal(res.code, 0, res.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails a new metric disclosure on a public page", () => {
  const dir = sandbox();
  try {
    withPage(dir, "export default function P() {\n  return <div>Our WOPR and target share model.</div>;\n}\n");
    const res = runGuard(dir);
    assert.equal(res.code, 1, "guard must fail on a new metric disclosure");
    assert.match(res.out, /metric-internals-public/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails a new methodology disclosure on a public page", () => {
  const dir = sandbox();
  try {
    withPage(dir, "export default function P() {\n  return <div>Weights are in the aggregation formula.</div>;\n}\n");
    const res = runGuard(dir);
    assert.equal(res.code, 1, "guard must fail on a new methodology disclosure");
    assert.match(res.out, /methodology-on-public-surface/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails a refused-source disclosure — that is competitive intel", () => {
  const dir = sandbox();
  try {
    withPage(dir, "export default function P() {\n  return <div>Here are the sources we refused to use.</div>;\n}\n");
    const res = runGuard(dir);
    assert.equal(res.code, 1, "guard must fail on refused-source disclosure");
    assert.match(res.out, /refused-source-disclosure/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("passes prose that describes the boundary instead of crossing it", () => {
  // Without the safe-context escape the guard fires on its own doctrine and on
  // every honest refusal message in the codebase, and gets deleted.
  const dir = sandbox();
  try {
    withPage(
      dir,
      "export default function P() {\n" +
        "  // WOPR and target share stay internal; we never expose raw metric internals.\n" +
        "  return <div>Projections only.</div>;\n}\n",
    );
    const res = runGuard(dir);
    assert.equal(res.code, 0, res.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("does not flag internal trees (cron/admin/cockpit/ops/v1)", () => {
  // A metric identifier in a server-side mapper or an internal job is not a
  // disclosure. The first version of this guard reported 263 findings, 198 of
  // which were internal files — noise that would have gotten it deleted.
  const dir = sandbox();
  try {
    for (const rel of [
      "app/api/cron/signal-ledger-write/route.ts",
      "app/api/ops/public-surface-truth/route.ts",
      "app/cockpit/calibration/page.tsx",
      "app/api/v1/signals/route.ts",
      "app/admin/statking/page.tsx",
    ]) {
      const full = join(dir, "apps", "web", rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, "export const targetShare = 1; export const wopr = 2;\n");
    }
    const res = runGuard(dir);
    assert.equal(res.code, 0, res.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the real repository is clean under the shipped baseline", () => {
  // The standing baseline acknowledges the doctrine's own inventory, so the tree
  // as committed must not drift.
  const res = runGuard(ROOT);
  assert.equal(res.code, 0, res.out);
  assert.match(res.out, /0 new disclosures/);
});
