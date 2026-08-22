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
 *
 * Resolve the driver from packages/db (where it is declared). A bare ESM
 * import from scripts/deploy/ only walks scripts/ → repo root node_modules
 * and misses the workspace install. That ERR_MODULE_NOT_FOUND failed
 * production deploys of #526 (65ddcc6d) and #527 (07b0aed7).
 */
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { classifyAppliedVsRepo } from "./migrate-if-configured.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** CJS resolve starting at the @sports/db workspace, then walking up. */
export function loadNeonServerless(root = repoRoot) {
  const requireDb = createRequire(join(root, "packages/db/package.json"));
  return requireDb("@neondatabase/serverless");
}

const migrationsDir = join(repoRoot, "packages", "db", "prisma", "migrations");

export async function checkParity() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "";

  if (!url) {
    console.error("[neon-http-parity] no DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL");
    return 1;
  }

  const source = process.env.DATABASE_URL
    ? "DATABASE_URL"
    : process.env.POSTGRES_PRISMA_URL
      ? "POSTGRES_PRISMA_URL"
      : "POSTGRES_URL";

  let repo = [];
  try {
    repo = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch (err) {
    console.error(`[neon-http-parity] cannot read migrations dir: ${err?.message ?? err}`);
    return 1;
  }

  let neon;
  try {
    ({ neon } = loadNeonServerless(repoRoot));
  } catch (err) {
    console.error(
      `[neon-http-parity] cannot resolve @neondatabase/serverless from packages/db: ${err?.message ?? err}`,
    );
    return 1;
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
    return 1;
  }

  const { verdict, missing } = classifyAppliedVsRepo(applied, repo);
  console.log(
    `[neon-http-parity] source=${source} verdict=${verdict} repo=${repo.length} applied=${applied.length}`,
  );
  if (missing.length) {
    console.error(`[neon-http-parity] missing from db: ${missing.join(",")}`);
  }

  if (verdict === "up-to-date") return 0;
  if (verdict === "pending") return 2;
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(await checkParity());
}
