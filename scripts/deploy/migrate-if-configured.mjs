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
import { pathToFileURL } from "node:url";

/**
 * True when `text` looks like a transient DB-connectivity failure worth
 * retrying (Neon cold-start / network blip), NOT a real migration error.
 * Pure + exported so the classification is unit-tested.
 * @param {string} text combined stdout+stderr of the migrate attempt
 * @returns {boolean}
 */
export function isTransientDbError(text) {
  if (!text) return false;
  const TRANSIENT = [
    "P1001", // Prisma: "Can't reach database server"
    "Can't reach database server",
    "database server is running", // P1001 second line: "Please make sure your database server is running"
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "EAI_AGAIN", // DNS resolution blip
    "Connection terminated",
    "connection closed",
    "timed out",
    "Timed out fetching a new connection",
  ];
  const haystack = text.toLowerCase();
  return TRANSIENT.some((sig) => haystack.includes(sig.toLowerCase()));
}

/** Backoff (ms) before retry attempt N (1-indexed). Gives Neon time to wake. */
export function backoffMs(attempt) {
  const schedule = [5000, 10000, 20000];
  return schedule[Math.min(attempt - 1, schedule.length - 1)];
}

export const MAX_MIGRATE_ATTEMPTS = 4;

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
