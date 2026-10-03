#!/usr/bin/env node
/**
 * LSRQC KERNEL v1 — proposal ACCEPT → certificate activation, human/admin CLI.
 *
 * ██ ACCEPTANCE IS A HUMAN DECISION. THIS SCRIPT IS NEVER RUN BY CI OR CRON. ██
 *
 * Accepting an ind_inv_proposal promotes a new SrqcVersion to "active" — the
 * one certificate generation stamped onto subsequent FormalIncident / admit
 * logs. That is a deliberate operator action; there is intentionally NO CI job,
 * cron route, or automated caller wired to this script anywhere in the repo,
 * and none should be added. It is run by hand, by a person, with a DATABASE_URL
 * they chose.
 *
 * Nothing here changes control-plane behavior: the SRQC surface stays
 * DETECTION-ONLY (admitUnderSRQC remains always-ADMIT in SHADOW; no ENFORCE
 * path is reachable from production).
 *
 * What it does (mirrors apps/web/lib/ai-control-plane/accept-proposal.ts's
 * acceptProposalAndActivate exactly — inlined, because that writer lives behind
 * the sealed ai-control-plane import boundary and a root admin script must not
 * reach across it):
 *   1. Load the proposal (proposedPredicateText + skillKind).
 *   2. indInvHash = sha256(proposedPredicateText | (prior-ind-inv-hash ?? "")).
 *   3. Insert newVersion as a "candidate" (idempotent on version).
 *   4. Supersede the current active, then activate newVersion (one CTE).
 *   5. Mark the proposal accepted with acceptedSrqcVersion = newVersion.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... \
 *     node scripts/accept-srqc-proposal.mjs \
 *       --proposal-id <id> \
 *       --version 2 \
 *       [--prior-ind-inv-hash <hex>] \
 *       [--receipt-hash <hex>]
 *
 * Manual dry-run (read-only — inspect open proposals, write nothing):
 *   DATABASE_URL=postgresql://... node scripts/accept-srqc-proposal.mjs --dry-run
 */

import { createHash } from "node:crypto";
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
    console.error("[accept-srqc] DATABASE_URL is not set. Aborting.");
    process.exit(2);
  }

  const client = new pg.Client({ connectionString: DB });
  await client.connect();
  try {
    if (args["dry-run"]) {
      const { rows } = await client.query(
        `SELECT "id", "proposedPredicateText", "skillKind", "status", "activeVersionAtMint"
           FROM "ind_inv_proposal"
          WHERE "status" = 'open'
          ORDER BY "createdAt" ASC`,
      );
      console.log("[accept-srqc] open proposals (no writes performed):");
      console.table(rows);
      return;
    }

    const proposalId = args["proposal-id"];
    const version = Number(args.version);
    if (typeof proposalId !== "string" || proposalId.length === 0) {
      console.error("[accept-srqc] --proposal-id <id> is required.");
      process.exit(2);
    }
    if (!Number.isInteger(version) || version < 0) {
      console.error("[accept-srqc] --version must be a non-negative integer.");
      process.exit(2);
    }
    const priorIndInvHash =
      typeof args["prior-ind-inv-hash"] === "string"
        ? args["prior-ind-inv-hash"]
        : "";
    const receiptHash =
      typeof args["receipt-hash"] === "string" ? args["receipt-hash"] : null;

    const rows = (
      await client.query(
        `SELECT "proposedPredicateText", "skillKind"
           FROM "ind_inv_proposal" WHERE "id" = $1`,
        [proposalId],
      )
    ).rows;
    const proposal = rows[0];
    if (!proposal) {
      console.error(`[accept-srqc] no ind_inv_proposal with id ${proposalId}`);
      process.exit(2);
    }

    const indInvHash = createHash("sha256")
      .update(proposal.proposedPredicateText)
      .update("|")
      .update(priorIndInvHash)
      .digest("hex");
    const notes = `from proposal ${proposalId} skillKind=${proposal.skillKind}`;

    // 1. Candidate insert (idempotent on version).
    await client.query(
      `INSERT INTO "srqc_version"
         ("version", "indInvHash", "refinementReceiptHash", "status", "notes")
       VALUES ($1, $2, $3, 'candidate', $4)
       ON CONFLICT ("version") DO NOTHING`,
      [version, indInvHash, receiptHash, notes],
    );

    // 2. Supersede the current active, then activate the target — one CTE.
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

    // 3. Mark the proposal accepted.
    await client.query(
      `UPDATE "ind_inv_proposal"
          SET "status" = 'accepted', "acceptedSrqcVersion" = $2
        WHERE "id" = $1`,
      [proposalId, version],
    );

    const active = (
      await client.query(
        `SELECT "version", "indInvHash", "status", "activatedAt"
           FROM "srqc_version" WHERE "status" = 'active'`,
      )
    ).rows;
    console.log("[accept-srqc] active certificate version now:");
    console.table(active);
    if (active.length !== 1) {
      console.error(
        `[accept-srqc] WARNING: expected exactly one active row, found ${active.length}.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[accept-srqc] failed:", err);
  process.exit(1);
});
