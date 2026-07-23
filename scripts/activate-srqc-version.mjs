#!/usr/bin/env node
/**
 * SRQC certificate-version ACTIVATION — human/admin CLI.
 *
 * ██ ACTIVATION IS A HUMAN DECISION. THIS SCRIPT IS NEVER RUN BY CI OR CRON. ██
 *
 * Promoting an SrqcVersion from "candidate" to "active" is the point at which
 * a new certificate generation becomes the one stamped onto FormalIncident
 * rows. That is a deliberate operator action — there is intentionally NO CI
 * job, cron route, or automated caller wired to this script anywhere in the
 * repo, and none should be added. It is run by hand, by a person, with a
 * DATABASE_URL they chose.
 *
 * Nothing here changes control-plane behavior: the SRQC surface is still
 * DETECTION-ONLY (`admitUnderSRQC` remains always-ADMIT, no ENFORCE path
 * exists). Activation only sets which certificate version an incident record
 * is annotated with.
 *
 * What it does (idempotently):
 *   1. Inserts the version as a "candidate" if it is not already present.
 *   2. Supersedes whatever version is currently "active", then sets the target
 *      version "active" with activatedAt = now(). Re-running with the same
 *      version is a no-op beyond refreshing activatedAt.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... \
 *     node scripts/activate-srqc-version.mjs \
 *       --version 3 \
 *       --ind-inv-hash <hex> \
 *       [--receipt-hash <hex>] \
 *       [--notes "why this generation"]
 *
 * The raw SQL below mirrors apps/web/lib/ai-control-plane/formal-incident.ts's
 * recordSrqcVersionCandidate / activateSrqcVersion exactly. It is inlined here
 * (rather than imported) because those writers live behind the sealed
 * ai-control-plane import boundary — a root admin script must not reach across
 * it. The activation CTE supersedes-then-activates in one round-trip so there
 * is no window in which zero versions are active.
 */

import pg from "pg";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = val;
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const DB = process.env["DATABASE_URL"];
  if (!DB) {
    console.error("[activate-srqc] DATABASE_URL is not set. Aborting.");
    process.exit(2);
  }

  const version = Number(args.version);
  const indInvHash = args["ind-inv-hash"];
  if (!Number.isInteger(version) || version < 0) {
    console.error("[activate-srqc] --version must be a non-negative integer.");
    process.exit(2);
  }
  if (typeof indInvHash !== "string" || indInvHash.length === 0) {
    console.error("[activate-srqc] --ind-inv-hash <hex> is required.");
    process.exit(2);
  }
  const receiptHash =
    typeof args["receipt-hash"] === "string" ? args["receipt-hash"] : null;
  const notes = typeof args.notes === "string" ? args.notes : null;

  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  try {
    // 1. Candidate insert (idempotent on version). Mirrors
    //    recordSrqcVersionCandidate. Notes are carried on the candidate row.
    await client.query(
      `INSERT INTO "srqc_version"
         ("version", "indInvHash", "refinementReceiptHash", "status", "notes")
       VALUES ($1, $2, $3, 'candidate', $4)
       ON CONFLICT ("version") DO NOTHING`,
      [version, indInvHash, receiptHash, notes],
    );

    // 2. Supersede the current active, then activate the target — one CTE,
    //    mirrors activateSrqcVersion.
    await client.query(
      `WITH superseded AS (
         UPDATE "srqc_version"
            SET "status" = 'superseded'
          WHERE "status" = 'active' AND "version" <> $1
         RETURNING "version"
       )
       UPDATE "srqc_version"
          SET "status" = 'active', "activatedAt" = now()
        WHERE "version" = $1`,
      [version],
    );

    const { rows } = await client.query(
      `SELECT "version", "indInvHash", "status", "activatedAt"
         FROM "srqc_version"
        WHERE "status" = 'active'`,
    );
    console.log("[activate-srqc] active certificate version now:");
    console.table(rows);
    if (rows.length !== 1) {
      console.error(
        `[activate-srqc] WARNING: expected exactly one active row, found ${rows.length}.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[activate-srqc] failed:", err);
  process.exit(1);
});
