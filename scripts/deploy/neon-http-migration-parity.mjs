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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { classifyAppliedVsRepo } from "./migrate-if-configured.mjs";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  "";

if (!url) {
  console.error("[neon-http-parity] no DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL");
  process.exit(1);
}

const source = process.env.DATABASE_URL
  ? "DATABASE_URL"
  : process.env.POSTGRES_PRISMA_URL
    ? "POSTGRES_PRISMA_URL"
    : "POSTGRES_URL";

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

let applied = [];
try {
  const sql = neon(url);
  const rows = await sql`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  applied = rows.map((r) => String(r.migration_name ?? "")).filter(Boolean);
} catch (err) {
  console.error(
    `[neon-http-parity] HTTP query failed via ${source}: ${err?.message ?? err}`,
  );
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
