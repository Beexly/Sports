/**
 * Unit tests for the deterministic convergence-inventory parser pieces
 * (scripts/nova/build-convergence-inventory.mjs).
 *
 * Run: node --test scripts/nova/convergence-inventory.test.mjs
 *
 * Includes mutation-style tests: removing a collision rule from the rule set
 * must make a seeded collision go undetected, proving each rule is
 * load-bearing (a rule that can be deleted without a test failing is not a
 * guardrail).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLLISION_RULES,
  detectCollisions,
  domainForPath,
  extractExportedSymbols,
  loadTypescript,
  matchesPrefix,
  parseMigrationSql,
  parsePrismaSchema,
  stableStringify,
} from "./build-convergence-inventory.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ts = loadTypescript(REPO_ROOT);

const MANIFEST = {
  domains: {
    NOVA: {
      pathPrefixes: ["apps/web/lib/opportunity-engine/", "scripts/nova/"],
      symbolPrefixes: ["Credit", "Nova"],
    },
    CONTROL_PLANE: {
      pathPrefixes: ["packages/ai-control-plane/"],
      symbolPrefixes: ["Ai"],
    },
    SETTLEMENT: {
      pathPrefixes: ["packages/settlement/"],
      symbolPrefixes: ["Settlement"],
    },
  },
  forbiddenPrefixes: [
    { prefix: "Ai", canonicalOwner: "CONTROL_PLANE" },
    { prefix: "Credit", canonicalOwner: "NOVA" },
    { prefix: "Settlement", canonicalOwner: "SETTLEMENT" },
  ],
};

const EMPTY_PRISMA = { base: { models: [], enums: [] }, head: { models: [], enums: [] } };

// ---------------------------------------------------------------------------
// stableStringify
// ---------------------------------------------------------------------------

test("stableStringify is key-order independent", () => {
  const a = stableStringify({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } });
  const b = stableStringify({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 });
  assert.equal(a, b);
  assert.ok(a.endsWith("\n"));
});

// ---------------------------------------------------------------------------
// Prisma schema parsing
// ---------------------------------------------------------------------------

test("parsePrismaSchema extracts models, enums, indexes, field counts", () => {
  const schema = [
    "datasource db { provider = \"postgresql\" }",
    "",
    "model CreditGrant {",
    "  id        String   @id",
    "  state     CreditGrantState",
    "  // comment line",
    "  @@index([state])",
    "  @@unique([id, state])",
    "}",
    "",
    "enum CreditGrantState {",
    "  PENDING",
    "  CONFIRMED",
    "}",
  ].join("\n");
  const parsed = parsePrismaSchema(schema, "packages/db/prisma/schema.prisma");
  assert.equal(parsed.models.length, 1);
  assert.equal(parsed.models[0].name, "CreditGrant");
  assert.equal(parsed.models[0].fieldCount, 2);
  assert.deepEqual(parsed.models[0].indexes, ["@@index([state])", "@@unique([id, state])"]);
  assert.equal(parsed.enums.length, 1);
  assert.equal(parsed.enums[0].name, "CreditGrantState");
  assert.equal(parsed.enums[0].valueCount, 2);
  assert.match(parsed.models[0].blockHash, /^[0-9a-f]{64}$/);
});

test("parsePrismaSchema fails closed on an unclosed block", () => {
  const schema = "model Broken {\n  id String @id\n";
  assert.throws(
    () => parsePrismaSchema(schema, "schema.prisma"),
    /unparsable prisma schema .*Broken/,
  );
});

// ---------------------------------------------------------------------------
// Migration SQL parsing
// ---------------------------------------------------------------------------

test("parseMigrationSql extracts created and altered objects deterministically", () => {
  const sql = [
    'CREATE TABLE "CreditGrant" (id TEXT PRIMARY KEY);',
    'CREATE UNIQUE INDEX "CreditGrant_id_key" ON "CreditGrant"(id);',
    "CREATE TYPE \"CreditGrantState\" AS ENUM ('PENDING');",
    'ALTER TABLE "CreditGrant" ADD COLUMN state "CreditGrantState";',
  ].join("\n");
  const stmts = parseMigrationSql(sql);
  assert.deepEqual(stmts, [
    { op: "ALTER TABLE", object: "CreditGrant" },
    { op: "CREATE TABLE", object: "CreditGrant" },
    { op: "CREATE TYPE", object: "CreditGrantState" },
    { op: "CREATE INDEX", object: "CreditGrant_id_key" },
  ]);
});

// ---------------------------------------------------------------------------
// TypeScript exported-symbol extraction (repo's own compiler API)
// ---------------------------------------------------------------------------

test("extractExportedSymbols captures every export form", () => {
  const src = [
    "export const CreditLimit = 5;",
    "export const { a: destructA, b: destructB } = obj;",
    "export function creditFn(): void {}",
    "export class CreditLedger {}",
    "export interface CreditGrant { id: string }",
    "export type CreditState = 'A' | 'B';",
    "export enum CreditKind { X }",
    "export default class DefaultThing {}",
    "export { renamed as CreditAlias } from './other';",
    "export * from './star';",
  ].join("\n");
  const symbols = extractExportedSymbols(ts, "apps/web/lib/x.ts", src);
  const names = symbols.map((s) => `${s.name}:${s.kind}`);
  assert.deepEqual(names, [
    "* from ./star:star-reexport",
    "CreditAlias:reexport",
    "CreditGrant:interface",
    "CreditKind:enum",
    "CreditLedger:class",
    "CreditLimit:const",
    "CreditState:type",
    "creditFn:function",
    "default:class",
    "destructA:const",
    "destructB:const",
  ]);
});

test("extractExportedSymbols parses TSX", () => {
  const src = "export const Panel = () => <div>ok</div>;\n";
  const symbols = extractExportedSymbols(ts, "apps/web/app/page.tsx", src);
  assert.deepEqual(symbols, [{ name: "Panel", kind: "const" }]);
});

test("extractExportedSymbols fails closed on unparsable source", () => {
  assert.throws(
    () => extractExportedSymbols(ts, "bad.ts", "export const = {{{"),
    /parse error in bad\.ts/,
  );
});

// ---------------------------------------------------------------------------
// Prefix matching and path ownership
// ---------------------------------------------------------------------------

test("matchesPrefix requires a PascalCase word boundary", () => {
  assert.equal(matchesPrefix("AiInvocation", "Ai"), true);
  assert.equal(matchesPrefix("Ai", "Ai"), true);
  assert.equal(matchesPrefix("Ai_Thing", "Ai"), true);
  assert.equal(matchesPrefix("Airline", "Ai"), false);
  assert.equal(matchesPrefix("CreditGrant", "Credit"), true);
  assert.equal(matchesPrefix("Creditor", "Credit"), false);
  assert.equal(matchesPrefix("Settlement", "Ai"), false);
});

test("domainForPath maps path prefixes to owning domain", () => {
  assert.equal(domainForPath(MANIFEST, "apps/web/lib/opportunity-engine/credit.ts"), "NOVA");
  assert.equal(domainForPath(MANIFEST, "packages/ai-control-plane/src/invocation.ts"), "CONTROL_PLANE");
  assert.equal(domainForPath(MANIFEST, "apps/web/lib/unrelated/thing.ts"), null);
});

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

function seededForbiddenPrefixInput() {
  return {
    manifest: MANIFEST,
    prisma: EMPTY_PRISMA,
    tsExports: [
      {
        // AiInvocation declared in a NOVA-owned path — cross-domain collision.
        path: "apps/web/lib/opportunity-engine/rogue.ts",
        symbols: [{ name: "AiInvocation", kind: "interface" }],
      },
      {
        // CreditGrant declared inside its canonical owner — NOT a collision.
        path: "apps/web/lib/opportunity-engine/credit.ts",
        symbols: [{ name: "CreditGrant", kind: "interface" }],
      },
    ],
  };
}

test("forbidden-prefix rule flags cross-domain declarations only", () => {
  const collisions = detectCollisions(seededForbiddenPrefixInput());
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].rule, "forbidden-prefix-outside-owner");
  assert.equal(collisions[0].symbol, "AiInvocation");
  assert.equal(collisions[0].canonicalOwner, "CONTROL_PLANE");
  assert.equal(collisions[0].declaredInDomain, "NOVA");
});

test("duplicate-guarded-export rule flags the same guarded name in two files", () => {
  const input = {
    manifest: MANIFEST,
    prisma: EMPTY_PRISMA,
    tsExports: [
      {
        path: "apps/web/lib/opportunity-engine/a.ts",
        symbols: [{ name: "CreditGrant", kind: "interface" }],
      },
      {
        path: "apps/web/lib/opportunity-engine/b.ts",
        symbols: [{ name: "CreditGrant", kind: "type" }],
      },
    ],
  };
  const collisions = detectCollisions(input);
  const dupes = collisions.filter((c) => c.rule === "duplicate-guarded-export");
  assert.equal(dupes.length, 1);
  assert.deepEqual(dupes[0].paths, [
    "apps/web/lib/opportunity-engine/a.ts",
    "apps/web/lib/opportunity-engine/b.ts",
  ]);
});

test("prisma-name-redeclared rule flags the same name across two schema paths", () => {
  const input = {
    manifest: MANIFEST,
    tsExports: [],
    prisma: {
      base: { models: [{ name: "CreditGrant", schemaPath: "packages/db/prisma/schema.prisma" }], enums: [] },
      head: {
        models: [
          { name: "CreditGrant", schemaPath: "packages/db/prisma/schema.prisma" },
          { name: "CreditGrant", schemaPath: "packages/other/prisma/schema.prisma" },
        ],
        enums: [],
      },
    },
  };
  const collisions = detectCollisions(input);
  const hits = collisions.filter((c) => c.rule === "prisma-name-redeclared");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].symbol, "CreditGrant");
});

test("prisma-name-redeclared does not flag normal single-path evolution", () => {
  const input = {
    manifest: MANIFEST,
    tsExports: [],
    prisma: {
      base: { models: [{ name: "CreditGrant", schemaPath: "packages/db/prisma/schema.prisma" }], enums: [] },
      head: { models: [{ name: "CreditGrant", schemaPath: "packages/db/prisma/schema.prisma" }], enums: [] },
    },
  };
  const collisions = detectCollisions(input);
  assert.equal(collisions.filter((c) => c.rule === "prisma-name-redeclared").length, 0);
});

// ---------------------------------------------------------------------------
// Mutation-style tests: every rule must be load-bearing
// ---------------------------------------------------------------------------

test("MUTATION: removing forbidden-prefix rule makes the seeded collision undetectable", () => {
  const input = seededForbiddenPrefixInput();
  // Full rule set catches it…
  assert.equal(
    detectCollisions(input).filter((c) => c.rule === "forbidden-prefix-outside-owner").length,
    1,
  );
  // …and a mutated rule set (rule deleted) misses it. If this second assert
  // ever fails, another rule silently overlaps and the taxonomy is wrong.
  const mutated = COLLISION_RULES.filter((r) => r.id !== "forbidden-prefix-outside-owner");
  assert.equal(detectCollisions(input, mutated).length, 0);
});

test("MUTATION: removing duplicate-guarded-export rule misses duplicate exports", () => {
  const input = {
    manifest: MANIFEST,
    prisma: EMPTY_PRISMA,
    tsExports: [
      { path: "packages/settlement/a.ts", symbols: [{ name: "SettlementEvidence", kind: "interface" }] },
      { path: "packages/settlement/b.ts", symbols: [{ name: "SettlementEvidence", kind: "type" }] },
    ],
  };
  assert.equal(
    detectCollisions(input).filter((c) => c.rule === "duplicate-guarded-export").length,
    1,
  );
  const mutated = COLLISION_RULES.filter((r) => r.id !== "duplicate-guarded-export");
  assert.equal(detectCollisions(input, mutated).length, 0);
});

test("MUTATION: removing prisma-name-redeclared rule misses schema redeclaration", () => {
  const input = {
    manifest: MANIFEST,
    tsExports: [],
    prisma: {
      base: { models: [], enums: [] },
      head: {
        models: [
          { name: "SettlementEvidence", schemaPath: "a/schema.prisma" },
          { name: "SettlementEvidence", schemaPath: "b/schema.prisma" },
        ],
        enums: [],
      },
    },
  };
  assert.equal(
    detectCollisions(input).filter((c) => c.rule === "prisma-name-redeclared").length,
    1,
  );
  const mutated = COLLISION_RULES.filter((r) => r.id !== "prisma-name-redeclared");
  assert.equal(detectCollisions(input, mutated).length, 0);
});
