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
 * Resilience vs. safety (the #70 outage): Neon's direct endpoint can be
 * unreachable from the build network (P1001 cold-start, network path, stale
 * DIRECT_URL) even when the pooled endpoint the runtime uses is healthy. The
 * old policy warned and PROCEEDED on transient failures — and once shipped a
 * Prisma client referencing columns whose migration was never applied, taking
 * /api/picks down and breaking pick creation. The gate is now FAIL-CLOSED:
 *  - NON-transient error (drift, conflict, bad SQL) → fail the build. Never
 *    ship code against an unmigrated schema.
 *  - TRANSIENT connectivity after all retries → VERIFY, don't trust: run
 *    `prisma migrate status` against the POOLED endpoint (DATABASE_URL as the
 *    direct URL — the runtime provably reaches it).
 *      · status says "Database schema is up to date"  → proceed. The deploy
 *        is schema-safe; the blip only affected the direct endpoint.
 *      · status reports pending/failed migrations, or itself cannot reach the
 *        DB → FAIL THE BUILD. A client ahead of the applied schema is exactly
 *        the outage class this gate exists to prevent.
 *
 * Break-glass (explicit operator override, never silent): setting
 * MIGRATE_GATE_ALLOW_UNVERIFIED=true in the Vercel env lets a build proceed
 * despite an unverified/pending verdict. It exists for the migration-ledger
 * reconciliation window (docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md):
 * the 2026-07-10 fail-closed rollout revealed the production _prisma_migrations
 * ledger had silently diverged from the repo for weeks (schema evolved via
 * db push while the old P1001-proceed policy skipped migrate deploy), so the
 * gate blocks ALL production deploys until the ledger is reconciled. The
 * override is a deliberate, logged, temporary decision — REMOVE the env var
 * immediately after use.
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

/**
 * Classify `prisma migrate status` output. TEXT-primary, not exit-code-primary:
 * older Prisma versions exit 0 even with pending migrations, and an exit-code
 * misread here would reopen the fail-open hole. Anything unrecognizable is
 * "unknown" — the caller must treat that as NOT verified (fail closed).
 * Pure + exported so the classification is unit-tested.
 * @param {string} text combined stdout+stderr of `prisma migrate status`
 * @returns {"up-to-date" | "pending" | "unknown"}
 */
export function classifyMigrateStatus(text) {
  if (!text) return "unknown";
  const haystack = text.toLowerCase();
  // Pending/failed checks FIRST: a combined output that somehow contained both
  // signals must never read as safe.
  if (
    haystack.includes("have not yet been applied") ||
    haystack.includes("failed migration") ||
    haystack.includes("p3005") // schema not empty / baseline missing
  ) {
    return "pending";
  }
  if (haystack.includes("database schema is up to date")) return "up-to-date";
  return "unknown";
}

/** Block synchronously without busy-waiting (build step only). */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * When the DIRECT endpoint is unreachable, ask the POOLED endpoint (the one
 * the runtime provably uses) whether any migrations are pending. Read-only:
 * `migrate status` only inspects _prisma_migrations. DIRECT_URL is overridden
 * to DATABASE_URL for this one check.
 * @returns {"up-to-date" | "pending" | "unknown"}
 */
function checkMigrateStatusViaPooledEndpoint() {
  const pooled = process.env.DATABASE_URL;
  if (!pooled) return "unknown";
  const result = spawnSync(
    "npm",
    ["run", "db:migrate:status", "--workspace=packages/db"],
    {
      encoding: "utf8",
      env: { ...process.env, DIRECT_URL: pooled },
    }
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return classifyMigrateStatus(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
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

    // A NON-transient failure is a real migration error (drift, conflict, bad
    // SQL). That MUST fail the build — never ship code against an unmigrated schema.
    if (!transient) {
      console.error(
        `[migrate-if-configured] migrate failed on attempt ${attempt}/${MAX_MIGRATE_ATTEMPTS} ` +
          `with a NON-transient error — failing the build.`
      );
      return result.status ?? 1;
    }

    // Transient connectivity after all retries: the direct endpoint is
    // unreachable, so we could not apply (or even see) migrations. FAIL-CLOSED
    // policy: proceed ONLY if the pooled endpoint — which the runtime provably
    // reaches — confirms there is nothing pending to apply. Shipping a client
    // ahead of the applied schema took /api/picks down (#70); never again.
    if (attempt >= MAX_MIGRATE_ATTEMPTS) {
      console.warn(
        `[migrate-if-configured] could not reach the DB via the DIRECT endpoint after ` +
          `${MAX_MIGRATE_ATTEMPTS} attempts — verifying schema parity via the POOLED endpoint…`
      );
      const verdict = checkMigrateStatusViaPooledEndpoint();
      if (verdict === "up-to-date") {
        console.warn(
          `[migrate-if-configured] pooled-endpoint check confirms ZERO pending migrations — ` +
            `this deploy is schema-safe; proceeding. ACTION REQUIRED: DIRECT_URL is unreachable ` +
            `from the build network, so the next deploy that carries a migration WILL fail this ` +
            `gate until DIRECT_URL is fixed.`
        );
        return 0;
      }
      if (process.env.MIGRATE_GATE_ALLOW_UNVERIFIED === "true") {
        console.warn(
          `[migrate-if-configured] BREAK-GLASS OVERRIDE ACTIVE (MIGRATE_GATE_ALLOW_UNVERIFIED=true): ` +
            `proceeding WITHOUT verified schema parity (pooled verdict: ${verdict}). This must be a ` +
            `deliberate, temporary operator decision — REMOVE the env var after this deploy and ` +
            `reconcile the ledger (docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md).`
        );
        return 0;
      }
      console.error(
        `[migrate-if-configured] FAIL-CLOSED: direct endpoint unreachable AND the pooled check ` +
          `did not confirm parity (verdict: ${verdict}). Refusing to ship a Prisma client that may ` +
          `reference schema the database does not have — that exact mismatch caused the /api/picks ` +
          `outage. Fix DIRECT_URL + reconcile the migration ledger ` +
          `(docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md), or set ` +
          `MIGRATE_GATE_ALLOW_UNVERIFIED=true as a deliberate temporary override, then redeploy.`
      );
      return 1;
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
