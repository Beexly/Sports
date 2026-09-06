#!/usr/bin/env npx tsx
/**
 * Read-only listing of the published PENDING picks on games that have NOT
 * started and that the pipeline has not refreshed in STALE_PENDING_PICK_MAX_AGE_DAYS
 * (apps/web/lib/board/stale-pick-policy.ts). The public truth surface counts
 * them (`stalePendingPicks`, 20 on 2026-09-05: v5.0.0 / v5.2.6 rows written in
 * May-June on NFL and NCAAF games kicking off from Week 1); it deliberately does
 * not act on them, because superseding or voiding a published pick is an owner
 * decision. Every settlement lane WILL grade these rows at kickoff on their
 * months-old pinned line and count them toward the canonical sample, so the owner
 * needs the exact rows in front of them before Thursday's kickoff.
 *
 * Modeled on scripts/ops/settlement-progress-snapshot.ts: DATABASE_URL-guarded,
 * SELECT-only. No create/update/delete/upsert/$executeRaw call exists in this
 * file. The selection (where + select + row mapper + table) lives in
 * scripts/ops/lib/stale-pending-picks-selection.ts and is shared with the
 * owner's unpublish tool, scripts/ops/adjudicate-stale-picks.ts, so the two can
 * never drift. The adjudication is documented in docs/ops/OPERATOR_TASKS.md and
 * is never run by an agent or a cron.
 *
 * Usage:
 *   npm run ops:stale-picks
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx tsx scripts/ops/list-stale-pending-picks.ts [--json]
 */
import { PrismaClient } from "@prisma/client";
import {
  findStalePendingPicks,
  printStalePendingPicksTable,
  stalePendingPicksJson,
} from "./lib/stale-pending-picks-selection";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("list-stale-pending-picks: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

const JSON_OUT = process.argv.includes("--json");

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const now = new Date();
  try {
    const out = await findStalePendingPicks(prisma, now);

    if (JSON_OUT) {
      console.log(JSON.stringify(stalePendingPicksJson(out, now), null, 2));
      return;
    }

    printStalePendingPicksTable(out, now);
    console.log("Owner decision per row: leave (grades at kickoff on the stale line), unpublish (isPublished=false), or void with a settlement event. See docs/ops/OPERATOR_TASKS.md STALE-PICKS.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
