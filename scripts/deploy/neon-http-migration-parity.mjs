#!/usr/bin/env node
/**
 * Read-only schema-parity check over Neon HTTP (TLS 443).
 *
 * Prisma's rust engine P1001s when Vercel cannot open :5432 even if Neon is
 * awake. Neon MCP/HTTP still works. This script lists finished
 * `_prisma_migrations` via @neondatabase/serverless and compares them to
 * packages/db/prisma/migrations. Never prints connection strings.
 *
 * Exit: 0 up-to-date, 2 pending, 1 unknown/error.
 */
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAppliedVsRepo } from "./migrate-if-configured.mjs";

// Root scripts cannot `import "@neondatabase/serverless"` — it lives on
// @sports/db, and Vercel production builds fail with ERR_MODULE_NOT_FOUND
// (dpl_BiFxdsRTCiCAzQ56sjrEcHAg8qyZ). Resolve from packages/db/package.json.
const here = dirname(fileURLToPath(import.meta.url));
const dbPkg = join(here, "..", "..", "packages", "db", "package.json");
const { neon } = createRequire(dbPkg)("@neondatabase/serverless");

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "packages",
  "db",
  "prisma",
  "migrations",
);

let repo = [];
try {
  repo = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
} catch (err) {
  console.error(`[neon-http-parity] cannot read migrations dir: ${err?.message ?? err}`);
  process.exit(1);
}

// Prefer vanilla Neon URLs. DATABASE_URL is often a Prisma pooled string that
// auth-fails on the HTTP driver (dpl_6vVep5kQb4S5bP5XktZrQei4TXdB:
// "password authentication failed for user 'neondb_owner'"). Skip prisma://.
// Never print the URL.
const candidates = [
  ["POSTGRES_URL", process.env.POSTGRES_URL],
  ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
  ["DATABASE_URL", process.env.DATABASE_URL],
].filter(([, v]) => typeof v === "string" && v.length > 0 && !v.startsWith("prisma://"));

if (candidates.length === 0) {
  console.error("[neon-http-parity] no DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL");
  process.exit(1);
}

let applied = [];
let source = candidates[0][0];
let lastErr = "";
for (const [name, url] of candidates) {
  source = name;
  try {
    const sql = neon(url);
    const rows = await sql`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    applied = rows.map((r) => String(r.migration_name ?? "")).filter(Boolean);
    lastErr = "";
    break;
  } catch (err) {
    lastErr = String(err?.message ?? err);
    console.error(`[neon-http-parity] HTTP query failed via ${name}: ${lastErr}`);
  }
}
if (lastErr) {
  process.exit(1);
}

const { verdict, missing } = classifyAppliedVsRepo(applied, repo);
console.log(
  `[neon-http-parity] source=${source} verdict=${verdict} repo=${repo.length} applied=${applied.length}`,
);
if (missing.length) {
  console.error(`[neon-http-parity] missing from db: ${missing.join(",")}`);
}

if (verdict === "up-to-date") process.exit(0);
if (verdict === "pending") process.exit(2);
process.exit(1);
