/**
 * Unit tests for the multi-head convergence-inventory analyzers
 * (scripts/nova/multihead-inventory.mjs).
 *
 * Run: node --test scripts/nova/multihead-inventory.test.mjs
 *
 * Fixture-based, plus one mutation-style test per cross-head collision rule:
 * removing a rule from the rule set must make its seeded collision go
 * undetected, proving each rule is load-bearing.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MULTIHEAD_COLLISION_RULES,
  analyzeHeadFreshness,
  buildMultiHeadInventory,
  buildOwnershipMatrix,
  deriveMultiHeadArtifacts,
  detectMultiHeadCollisions,
  extractEnvVarNames,
  extractRoutes,
  migrationTimestampForPath,
  routeForFilePath,
} from "./multihead-inventory.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST_PATH = resolve(REPO_ROOT, "scripts/nova/convergence-owners.json");

const MANIFEST = {
  forbiddenPrefixes: [
    { prefix: "Ai", canonicalOwner: "CONTROL_PLANE" },
    { prefix: "Credit", canonicalOwner: "NOVA" },
  ],
};

/** Minimal empty head; override the fields the fixture cares about. */
function head(label, overrides = {}) {
  return {
    label,
    headSha: `${label}-sha`,
    guardedSymbols: [],
    prismaNew: [],
    newMigrations: [],
    routes: [],
    newEnvVars: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Route extraction
// ---------------------------------------------------------------------------

test("routeForFilePath derives api and page routes, strips groups and slots", () => {
  assert.deepEqual(routeForFilePath("apps/web/app/api/nova/credits/route.ts"), {
    routePath: "/api/nova/credits",
    kind: "api",
  });
  assert.deepEqual(routeForFilePath("apps/web/app/cockpit/page.tsx"), {
    routePath: "/cockpit",
    kind: "page",
  });
  assert.deepEqual(routeForFilePath("apps/web/app/(marketing)/pricing/page.tsx"), {
    routePath: "/pricing",
    kind: "page",
  });
  assert.deepEqual(routeForFilePath("apps/web/app/@modal/login/page.tsx"), {
    routePath: "/login",
    kind: "page",
  });
  assert.deepEqual(routeForFilePath("apps/web/app/page.tsx"), { routePath: "/", kind: "page" });
  assert.equal(routeForFilePath("apps/web/app/api/nova/credits/handler.ts"), null);
  assert.equal(routeForFilePath("apps/web/lib/approuter/route.ts"), null);
});

test("extractRoutes skips deleted files and sorts deterministically", () => {
  const routes = extractRoutes([
    { path: "apps/web/app/b/page.tsx", status: "M" },
    { path: "apps/web/app/a/route.ts", status: "A" },
    { path: "apps/web/app/gone/route.ts", status: "D" },
    { path: "apps/web/lib/x.ts", status: "A" },
  ]);
  assert.deepEqual(routes, [
    { routePath: "/a", kind: "api", path: "apps/web/app/a/route.ts" },
    { routePath: "/b", kind: "page", path: "apps/web/app/b/page.tsx" },
  ]);
});

// ---------------------------------------------------------------------------
// Env-var extraction
// ---------------------------------------------------------------------------

test("extractEnvVarNames handles dot and bracket reads, dedupes, sorts", () => {
  const src = [
    "const a = process.env.DATABASE_URL;",
    "const b = process.env['STRIPE_KEY'];",
    'const c = process.env["DATABASE_URL"];',
    "const d = process.env.NOVA_BUDGET_CENTS ?? '0';",
    "const notEnv = myprocess.env.NOPE;",
  ].join("\n");
  assert.deepEqual(extractEnvVarNames(src), [
    "DATABASE_URL",
    "NOVA_BUDGET_CENTS",
    "STRIPE_KEY",
  ]);
});

test("extractEnvVarNames ignores dynamic access", () => {
  assert.deepEqual(extractEnvVarNames("const x = process.env[key];"), []);
});

// ---------------------------------------------------------------------------
// Migration timestamp extraction
// ---------------------------------------------------------------------------

test("migrationTimestampForPath parses timestamped migration dirs only", () => {
  assert.deepEqual(
    migrationTimestampForPath(
      "packages/db/prisma/migrations/20260722010101_add_credit_grant/migration.sql",
    ),
    { dir: "20260722010101_add_credit_grant", timestamp: "20260722010101" },
  );
  assert.equal(
    migrationTimestampForPath("packages/db/prisma/migrations/migration_lock.toml"),
    null,
  );
  assert.equal(migrationTimestampForPath("packages/db/prisma/schema.prisma"), null);
});

// ---------------------------------------------------------------------------
// Cross-head collision rules — positives, negatives
// ---------------------------------------------------------------------------

test("cross-head-guarded-symbol flags the same guarded symbol on two heads only", () => {
  const heads = [
    head("h1", { guardedSymbols: [{ name: "AiInvocation", kind: "interface", path: "a.ts" }] }),
    head("h2", { guardedSymbols: [{ name: "AiInvocation", kind: "type", path: "b.ts" }] }),
    head("h3", { guardedSymbols: [{ name: "CreditGrant", kind: "interface", path: "c.ts" }] }),
  ];
  const hits = detectMultiHeadCollisions({ heads, manifest: MANIFEST }).filter(
    (c) => c.rule === "cross-head-guarded-symbol",
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].symbol, "AiInvocation");
  assert.deepEqual(
    hits[0].heads.map((h) => h.label),
    ["h1", "h2"],
  );
});

test("cross-head-prisma-redeclared flags new-name collisions, not base-changed ones", () => {
  const heads = [
    head("h1", {
      prismaNew: [
        { name: "CreditGrant", type: "model", blockHash: "x1", existedAtBase: false },
        { name: "User", type: "model", blockHash: "u1", existedAtBase: true },
      ],
    }),
    head("h2", {
      prismaNew: [
        { name: "CreditGrant", type: "model", blockHash: "x2", existedAtBase: false },
        { name: "User", type: "model", blockHash: "u2", existedAtBase: true },
      ],
    }),
  ];
  const hits = detectMultiHeadCollisions({ heads, manifest: MANIFEST }).filter(
    (c) => c.rule === "cross-head-prisma-redeclared",
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].symbol, "CreditGrant");
});

test("cross-head-prisma-divergent-definition flags differing blockHashes, not identical ones", () => {
  const divergent = [
    head("h1", { prismaNew: [{ name: "User", type: "model", blockHash: "u1", existedAtBase: true }] }),
    head("h2", { prismaNew: [{ name: "User", type: "model", blockHash: "u2", existedAtBase: true }] }),
  ];
  const identical = [
    head("h1", { prismaNew: [{ name: "User", type: "model", blockHash: "same", existedAtBase: true }] }),
    head("h2", { prismaNew: [{ name: "User", type: "model", blockHash: "same", existedAtBase: true }] }),
  ];
  assert.equal(
    detectMultiHeadCollisions({ heads: divergent, manifest: MANIFEST }).filter(
      (c) => c.rule === "cross-head-prisma-divergent-definition",
    ).length,
    1,
  );
  assert.equal(
    detectMultiHeadCollisions({ heads: identical, manifest: MANIFEST }).filter(
      (c) => c.rule === "cross-head-prisma-divergent-definition",
    ).length,
    0,
  );
});

test("cross-head-migration-timestamp-duplicate flags same timestamp, spares identical migrations", () => {
  const dupe = [
    head("h1", {
      newMigrations: [{ path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" }],
    }),
    head("h2", {
      newMigrations: [{ path: "m/100_b/migration.sql", dir: "100_b", timestamp: "100", headBlobSha: "b2" }],
    }),
  ];
  const identical = [
    head("h1", {
      newMigrations: [{ path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" }],
    }),
    head("h2", {
      newMigrations: [{ path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" }],
    }),
  ];
  assert.equal(
    detectMultiHeadCollisions({ heads: dupe, manifest: MANIFEST }).filter(
      (c) => c.rule === "cross-head-migration-timestamp-duplicate",
    ).length,
    1,
  );
  assert.equal(
    detectMultiHeadCollisions({ heads: identical, manifest: MANIFEST }).filter(
      (c) => c.rule === "cross-head-migration-timestamp-duplicate",
    ).length,
    0,
  );
});

test("cross-head-migration-order-interleaved flags strict interleaving, spares disjoint ranges", () => {
  const interleaved = [
    head("h1", {
      newMigrations: [
        { path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" },
        { path: "m/300_c/migration.sql", dir: "300_c", timestamp: "300", headBlobSha: "b3" },
      ],
    }),
    head("h2", {
      newMigrations: [{ path: "m/200_b/migration.sql", dir: "200_b", timestamp: "200", headBlobSha: "b2" }],
    }),
  ];
  const disjoint = [
    head("h1", {
      newMigrations: [{ path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" }],
    }),
    head("h2", {
      newMigrations: [{ path: "m/200_b/migration.sql", dir: "200_b", timestamp: "200", headBlobSha: "b2" }],
    }),
  ];
  assert.equal(
    detectMultiHeadCollisions({ heads: interleaved, manifest: MANIFEST }).filter(
      (c) => c.rule === "cross-head-migration-order-interleaved",
    ).length,
    1,
  );
  assert.equal(
    detectMultiHeadCollisions({ heads: disjoint, manifest: MANIFEST }).filter(
      (c) => c.rule === "cross-head-migration-order-interleaved",
    ).length,
    0,
  );
});

test("cross-head-route-collision flags same route on two heads, distinguishes api vs page", () => {
  const heads = [
    head("h1", { routes: [{ routePath: "/api/checkout", kind: "api", path: "apps/web/app/api/checkout/route.ts" }] }),
    head("h2", { routes: [{ routePath: "/api/checkout", kind: "api", path: "apps/web/app/api/checkout/route.ts" }] }),
    head("h3", { routes: [{ routePath: "/api/checkout", kind: "page", path: "apps/web/app/api/checkout/page.tsx" }] }),
  ];
  const hits = detectMultiHeadCollisions({ heads, manifest: MANIFEST }).filter(
    (c) => c.rule === "cross-head-route-collision",
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].symbol, "api /api/checkout");
  assert.deepEqual(hits[0].heads.map((h) => h.label), ["h1", "h2"]);
});

test("cross-head-env-var-collision flags same new env var on two heads only", () => {
  const heads = [
    head("h1", { newEnvVars: [{ name: "NOVA_BUDGET_CENTS", paths: ["a.ts"] }] }),
    head("h2", { newEnvVars: [{ name: "NOVA_BUDGET_CENTS", paths: ["b.ts"] }] }),
    head("h3", { newEnvVars: [{ name: "OTHER_VAR", paths: ["c.ts"] }] }),
  ];
  const hits = detectMultiHeadCollisions({ heads, manifest: MANIFEST }).filter(
    (c) => c.rule === "cross-head-env-var-collision",
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].symbol, "NOVA_BUDGET_CENTS");
});

// ---------------------------------------------------------------------------
// Mutation-style tests: every cross-head rule must be load-bearing
// ---------------------------------------------------------------------------

const MUTATION_FIXTURES = {
  "cross-head-guarded-symbol": [
    head("h1", { guardedSymbols: [{ name: "AiThing", kind: "class", path: "a.ts" }] }),
    head("h2", { guardedSymbols: [{ name: "AiThing", kind: "class", path: "b.ts" }] }),
  ],
  "cross-head-prisma-redeclared": [
    head("h1", { prismaNew: [{ name: "CreditGrant", type: "model", blockHash: "same", existedAtBase: false }] }),
    head("h2", { prismaNew: [{ name: "CreditGrant", type: "model", blockHash: "same", existedAtBase: false }] }),
  ],
  "cross-head-prisma-divergent-definition": [
    head("h1", { prismaNew: [{ name: "User", type: "model", blockHash: "u1", existedAtBase: true }] }),
    head("h2", { prismaNew: [{ name: "User", type: "model", blockHash: "u2", existedAtBase: true }] }),
  ],
  "cross-head-migration-timestamp-duplicate": [
    head("h1", { newMigrations: [{ path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" }] }),
    head("h2", { newMigrations: [{ path: "m/100_b/migration.sql", dir: "100_b", timestamp: "100", headBlobSha: "b2" }] }),
  ],
  "cross-head-migration-order-interleaved": [
    head("h1", {
      newMigrations: [
        { path: "m/100_a/migration.sql", dir: "100_a", timestamp: "100", headBlobSha: "b1" },
        { path: "m/300_c/migration.sql", dir: "300_c", timestamp: "300", headBlobSha: "b3" },
      ],
    }),
    head("h2", { newMigrations: [{ path: "m/200_b/migration.sql", dir: "200_b", timestamp: "200", headBlobSha: "b2" }] }),
  ],
  "cross-head-route-collision": [
    head("h1", { routes: [{ routePath: "/x", kind: "page", path: "apps/web/app/x/page.tsx" }] }),
    head("h2", { routes: [{ routePath: "/x", kind: "page", path: "apps/web/app/x/page.tsx" }] }),
  ],
  "cross-head-env-var-collision": [
    head("h1", { newEnvVars: [{ name: "NEW_VAR", paths: ["a.ts"] }] }),
    head("h2", { newEnvVars: [{ name: "NEW_VAR", paths: ["b.ts"] }] }),
  ],
};

for (const rule of MULTIHEAD_COLLISION_RULES) {
  test(`MUTATION: removing ${rule.id} makes its seeded collision undetectable`, () => {
    const heads = MUTATION_FIXTURES[rule.id];
    assert.ok(heads, `no mutation fixture for rule ${rule.id}`);
    const input = { heads, manifest: MANIFEST };
    // Full rule set catches it…
    assert.equal(
      detectMultiHeadCollisions(input).filter((c) => c.rule === rule.id).length,
      1,
      `full rule set must detect seeded ${rule.id} collision`,
    );
    // …and the mutated set (rule deleted) misses it entirely: no other rule
    // silently overlaps this fixture.
    const mutated = MULTIHEAD_COLLISION_RULES.filter((r) => r.id !== rule.id);
    assert.equal(
      detectMultiHeadCollisions(input, mutated).filter((c) => c.rule === rule.id).length,
      0,
    );
    assert.equal(detectMultiHeadCollisions(input, mutated).length, 0);
  });
}

test("every cross-head rule has a mutation fixture (taxonomy is closed)", () => {
  assert.deepEqual(
    Object.keys(MUTATION_FIXTURES).sort(),
    MULTIHEAD_COLLISION_RULES.map((r) => r.id).sort(),
  );
});

// ---------------------------------------------------------------------------
// Ownership matrix
// ---------------------------------------------------------------------------

test("buildOwnershipMatrix maps names to declaring heads across all axes", () => {
  const heads = [
    head("h1", {
      guardedSymbols: [{ name: "AiThing", kind: "class", path: "a.ts" }],
      routes: [{ routePath: "/x", kind: "api", path: "apps/web/app/x/route.ts" }],
      newEnvVars: [{ name: "NEW_VAR", paths: ["a.ts"] }],
      prismaNew: [{ name: "CreditGrant", type: "model", blockHash: "x", existedAtBase: false }],
    }),
    head("h2", { guardedSymbols: [{ name: "AiThing", kind: "type", path: "b.ts" }] }),
  ];
  const matrix = buildOwnershipMatrix(heads, MANIFEST);
  assert.deepEqual(matrix.guardedSymbols, { AiThing: ["h1", "h2"] });
  assert.deepEqual(matrix.forbiddenPrefixes, { Ai: ["h1", "h2"] });
  assert.deepEqual(matrix.prismaNames, { CreditGrant: ["h1"] });
  assert.deepEqual(matrix.routes, { "api /x": ["h1"] });
  assert.deepEqual(matrix.newEnvVars, { NEW_VAR: ["h1"] });
});

// ---------------------------------------------------------------------------
// Stale-head detection
// ---------------------------------------------------------------------------

test("analyzeHeadFreshness classifies matching, stale and unmapped heads against real git", () => {
  // Use real repo history: HEAD~1 is an ancestor of HEAD, so a head pinned at
  // HEAD~1 with HEAD expected is STALE_BEHIND_EXPECTED.
  const headSha = execFileSync("git", ["-C", REPO_ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const prevSha = execFileSync("git", ["-C", REPO_ROOT, "rev-parse", "HEAD~1"], { encoding: "utf8" }).trim();
  const result = analyzeHeadFreshness({
    repoPath: REPO_ROOT,
    heads: [
      { label: "origin/fresh-branch", headSha },
      { label: "origin/stale-branch", headSha: prevSha },
      { label: "origin/unmapped-branch", headSha },
      { label: "origin/bad-expected", headSha },
    ],
    refsMap: {
      "fresh-branch": headSha,
      "stale-branch": headSha,
      "bad-expected": "0000000000000000000000000000000000000000",
    },
  });
  const byLabel = Object.fromEntries(result.map((r) => [r.label, r.status]));
  assert.equal(byLabel["origin/fresh-branch"], "MATCHES_EXPECTED");
  assert.equal(byLabel["origin/stale-branch"], "STALE_BEHIND_EXPECTED");
  assert.equal(byLabel["origin/unmapped-branch"], "NO_EXPECTED_REF");
  assert.equal(byLabel["origin/bad-expected"], "EXPECTED_UNRESOLVABLE");
});

// ---------------------------------------------------------------------------
// Determinism smoke: multi-head build against the real repo is reproducible
// ---------------------------------------------------------------------------

test("buildMultiHeadInventory is deterministic for identical inputs (real repo, HEAD vs HEAD~1)", () => {
  const args = {
    repoPath: REPO_ROOT,
    baseRef: "HEAD~1",
    heads: [{ label: "self", ref: "HEAD" }],
    manifestPath: MANIFEST_PATH,
  };
  const a = deriveMultiHeadArtifacts(buildMultiHeadInventory(args));
  const b = deriveMultiHeadArtifacts(buildMultiHeadInventory(args));
  assert.equal(a.inventoryJson, b.inventoryJson);
  assert.equal(a.inventoryMd, b.inventoryMd);
  const parsed = JSON.parse(a.inventoryJson);
  assert.equal(parsed.mode, "multi-head");
  assert.equal(parsed.heads.length, 1);
  assert.equal(parsed.heads[0].label, "self");
});
