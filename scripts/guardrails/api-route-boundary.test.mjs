/**
 * Fixture / mutation suite for the API route boundary guard.
 *
 * Run: node --test scripts/guardrails/api-route-boundary.test.mjs
 *
 * The point of these tests is not "the script runs". It is:
 *   1. every guard MECHANISM used in this repo is actually recognized — remove
 *      one pattern from the guard and the corresponding test fails
 *   2. the ratchet refuses a NEW unguarded route (exit 1), which is the whole
 *      reason the guard exists
 *   3. a guarded route is never a false positive, so the gate does not cry wolf
 *
 * Each test builds a throwaway repo root and runs the guard against it with
 * --root, so nothing depends on the real tree's current state.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "api-route-boundary.mjs");

function makeRoot(routes, { baseline = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), "route-boundary-"));
  for (const [path, body] of Object.entries(routes)) {
    const dir = join(root, "apps", "web", "app", "api", ...path.split("/"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "route.ts"), body);
  }
  if (baseline !== null) {
    const bdir = join(root, "scripts", "guardrails");
    mkdirSync(bdir, { recursive: true });
    writeFileSync(
      join(bdir, "api-route-boundary.baseline.json"),
      JSON.stringify({ unguarded: baseline }, null, 1)
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

const UNGUARDED = 'export async function GET() { return new Response("x"); }';

test.after(() => {
  /* temp roots are left to the OS; they are tiny and this keeps teardown simple */
});

test("an unguarded route is flagged and the gate fails", () => {
  const root = makeRoot({ "probe": UNGUARDED }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 1, "gate must fail on a new unguarded route");
  assert.match(r.stdout, /\/api\/probe/);
});

test("a guarded route passes", () => {
  const body = `import { auth } from "@/lib/auth";
export async function GET() { await auth(); return new Response("x"); }`;
  const root = makeRoot({ probe: body }, { baseline: [] });
  const r = run(root);
  assert.equal(r.code, 0, "guard must not flag an auth() route");
});

// Every mechanism this repo actually uses must be recognized. Delete a pattern
// from the guard and exactly these assertions fail.
const MECHANISMS = {
  "session auth()": 'const s = await auth();',
  getServerSession: 'const s = await getServerSession();',
  requireAdmin: 'requireAdmin(session);',
  requireApiKey: 'requireApiKey(req);',
  entitlement: 'await requireEntitlement(req, "gse");',
  apiKey: 'const k = req.headers.get("x-api-key");',
  cronAuthError: 'const denied = cronAuthError(req); if (denied) return denied;',
  CRON_SECRET: 'if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {}',
  "stripe signature": 'const sig = req.headers.get("stripe-signature"); stripe.webhooks.constructEvent(b, sig, w);',
  "whop signature": 'verifyWhopWebhookSignature(req.headers.get("x-whop-signature"));',
  "telegram secret": 'req.headers.get("X-Telegram-Bot-Api-Secret-Token");',
};

for (const [label, snippet] of Object.entries(MECHANISMS)) {
  test(`recognizes guard mechanism: ${label}`, () => {
    const body = `export async function POST(req) { ${snippet} return new Response("x"); }`;
    const root = makeRoot({ probe: body }, { baseline: [] });
    const r = run(root);
    assert.equal(r.code, 0, `guard failed to recognize ${label}`);
  });
}

test("baseline suppresses an accepted route", () => {
  const root = makeRoot({ probe: UNGUARDED }, { baseline: ["/api/probe"] });
  const r = run(root);
  assert.equal(r.code, 0, "a baselined route must not fail the gate");
});

test("a route beyond the baseline still fails", () => {
  const root = makeRoot(
    { accepted: UNGUARDED, brandnew: UNGUARDED },
    { baseline: ["/api/accepted"] }
  );
  const r = run(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\/api\/brandnew/);
  assert.doesNotMatch(r.stdout, /FAIL - 2/);
});

test("--update writes the current unguarded set", () => {
  const root = makeRoot({ a: UNGUARDED, b: UNGUARDED }, { baseline: [] });
  run(root, ["--update"]);
  const written = JSON.parse(
    readFileSync(join(root, "scripts", "guardrails", "api-route-boundary.baseline.json"), "utf8")
  );
  assert.deepEqual(written.unguarded.sort(), ["/api/a", "/api/b"]);
  assert.equal(written.count, 2);
  // after updating, the gate is clean
  assert.equal(run(root).code, 0);
});

test("dynamic segments are normalised to {param}", () => {
  const root = makeRoot({ "picks/[id]/audit": UNGUARDED }, { baseline: [] });
  run(root, ["--update"]);
  const written = JSON.parse(
    readFileSync(join(root, "scripts", "guardrails", "api-route-boundary.baseline.json"), "utf8")
  );
  assert.deepEqual(written.unguarded, ["/api/picks/{id}/audit"]);
});

test("missing api dir skips rather than fails", () => {
  const root = mkdtempSync(join(tmpdir(), "route-boundary-empty-"));
  const r = run(root);
  assert.equal(r.code, 0, "a root without apps/web/app/api must not fail");
  assert.match(r.stdout, /SKIP/);
});

test("--list prints the baseline", () => {
  const root = makeRoot({ probe: UNGUARDED }, { baseline: ["/api/probe"] });
  const r = run(root, ["--list"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /\/api\/probe/);
});
