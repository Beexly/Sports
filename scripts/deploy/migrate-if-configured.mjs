#!/usr/bin/env node
/**
 * Vercel build-time migration gate.
 *
 * Why: `prisma migrate deploy` hard-requires DATABASE_URL + DIRECT_URL. The
 * Preview environment does not (and should not) carry production DB
 * credentials, so an unconditional migrate step turned every preview build
 * into an ERROR (P1012: Environment variable not found: DIRECT_URL) — which
 * silently stranded all branch work after 2026-06-10.
 *
 * Policy:
 *  - VERCEL_ENV=production  → run `prisma migrate deploy`; missing env still
 *    fails loudly (a production deploy must never skip schema migration).
 *  - VERCEL_ENV=preview/dev → never migrate; previews must not mutate the
 *    production database. Build proceeds against the runtime env it has.
 *  - No VERCEL_ENV (local)  → migrate only when both DB URLs are present.
 */
import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "";
const hasDbConfig = Boolean(process.env.DATABASE_URL) && Boolean(process.env.DIRECT_URL);

const skip = (reason) => {
  console.log(`[migrate-if-configured] SKIP prisma migrate deploy — ${reason}`);
  process.exit(0);
};

if (env && env !== "production") skip(`VERCEL_ENV=${env}; previews never run migrations`);
if (!env && !hasDbConfig) skip("local build without DATABASE_URL/DIRECT_URL");

console.log(`[migrate-if-configured] RUN prisma migrate deploy (VERCEL_ENV=${env || "unset"})`);
const result = spawnSync("npm", ["run", "db:migrate", "--workspace=packages/db"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
