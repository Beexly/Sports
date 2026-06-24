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
 *
 * Resilience: Neon's serverless compute auto-suspends when idle, so a
 * production build can hit it cold and `prisma migrate deploy` fails with
 * P1001 ("Can't reach database server") — ERRORing the ENTIRE deploy even when
 * there are no pending migrations to apply. (This is what broke the deploy of
 * #49.) We retry TRANSIENT connectivity failures with backoff so a cold DB
 * self-heals (Neon wakes within a few seconds); a real migration error
 * (conflict, drift, bad SQL) is NOT transient and fails fast on the first try.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const {
  isTransientDbError,
  backoffMs,
  MAX_MIGRATE_ATTEMPTS,
} = require("./migrate-if-configured-core.cjs");

export { isTransientDbError, backoffMs, MAX_MIGRATE_ATTEMPTS };

/** Block synchronously without busy-waiting (build step only). */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runMigrateWithRetry() {
  for (let attempt = 1; ; attempt += 1) {
    const result = spawnSync("npm", ["run", "db:migrate", "--workspace=packages/db"], {
      encoding: "utf8",
    });
    // Preserve build-log visibility (we captured instead of inheriting).
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if ((result.status ?? 1) === 0) return 0;

    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const transient = isTransientDbError(combined);
    if (!transient || attempt >= MAX_MIGRATE_ATTEMPTS) {
      console.error(
        `[migrate-if-configured] migrate failed on attempt ${attempt}/${MAX_MIGRATE_ATTEMPTS} ` +
          `(transient=${transient}) — giving up.`
      );
      return result.status ?? 1;
    }
    const waitMs = backoffMs(attempt);
    console.warn(
      `[migrate-if-configured] transient DB-connectivity error on attempt ${attempt}/${MAX_MIGRATE_ATTEMPTS}; ` +
        `retrying in ${waitMs}ms (Neon may be waking from suspend)…`
    );
    sleepSync(waitMs);
  }
}

function main() {
  const env = process.env.VERCEL_ENV ?? "";
  const hasDbConfig =
    Boolean(process.env.DATABASE_URL) && Boolean(process.env.DIRECT_URL);

  const skip = (reason) => {
    console.log(`[migrate-if-configured] SKIP prisma migrate deploy — ${reason}`);
    process.exit(0);
  };

  if (env && env !== "production") {
    skip(`VERCEL_ENV=${env}; previews never run migrations`);
  }
  if (!env && !hasDbConfig) skip("local build without DATABASE_URL/DIRECT_URL");

  console.log(
    `[migrate-if-configured] RUN prisma migrate deploy (VERCEL_ENV=${env || "unset"})`
  );
  process.exit(runMigrateWithRetry());
}

// Only execute when run directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
