#!/usr/bin/env npx tsx
/**
 * Owner's one-command adjudication of the stale published PENDING picks: the
 * rows scripts/ops/list-stale-pending-picks.ts lists (published, PENDING, on a
 * game that has not started, not refreshed in STALE_PENDING_PICK_MAX_AGE_DAYS).
 * Both scripts share scripts/ops/lib/stale-pending-picks-selection.ts, so the
 * set this tool acts on is exactly the set the listing shows.
 *
 * Decision recorded 2026-09-05 (founder delegated): UNPUBLISH every selected
 * row. Not void (the settlement outbox owns the PickSettlementEvent contract,
 * so a VOID has to be written through that lane), not leave (every settlement
 * lane would grade the rows at kickoff on a months-old pinned line).
 *
 * Default is DRY RUN: prints the rows it would unpublish and writes nothing.
 * With --execute it runs ONE prisma.pick.updateMany that sets isPublished=false
 * on those ids (and only on rows still isPublished=true / result PENDING), then
 * re-runs the selection and prints how many remain (expect 0). No row is ever
 * removed; no other column is touched. This is an owner command, never a cron.
 *
 * Usage:
 *   npm run ops:stale-picks:unpublish                       # dry run (default)
 *   npm run ops:stale-picks:unpublish -- --execute          # apply
 *   npm run ops:stale-picks:unpublish -- --json             # machine-readable
 *   npm run ops:stale-picks:unpublish -- --pick <id> [--pick <id>] --execute
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx tsx scripts/ops/adjudicate-stale-picks.ts [--execute] [--json] [--pick <id>]...
 */
import { PrismaClient } from "@prisma/client";
import { actionRejection, parseAdjudicateArgs, planAdjudication } from "./lib/adjudicate-stale-picks-args";
import {
  findStalePendingPicks,
  printStalePendingPicksTable,
  stalePendingPicksJson,
} from "./lib/stale-pending-picks-selection";

const parsed = parseAdjudicateArgs(process.argv.slice(2));
if (!parsed.ok) {
  console.error(`adjudicate-stale-picks: ${parsed.error}`);
  process.exit(2);
}
const args = parsed.args;

const rejection = actionRejection(args.action);
if (rejection) {
  console.error(rejection);
  process.exit(2);
}

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("adjudicate-stale-picks: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const now = new Date();
  try {
    const picks = await findStalePendingPicks(prisma, now, args.pickIds);
    const plan = planAdjudication(args, picks.map((p) => p.pickId));

    let written = 0;
    let remaining: number | null = null;

    if (!args.execute) {
      // DRY RUN: no write of any kind reaches the database on this path.
    } else if (plan.ids.length === 0) {
      remaining = 0;
    } else {
      const result = await prisma.pick.updateMany({
        where: { id: { in: plan.ids }, isPublished: true, result: "PENDING" },
        data: { isPublished: false },
      });
      written = result.count;
      remaining = (await findStalePendingPicks(prisma, now, args.pickIds)).length;
    }

    if (args.json) {
      console.log(
        JSON.stringify(
          { ...stalePendingPicksJson(picks, now), dryRun: !args.execute, written, remaining },
          null,
          2,
        ),
      );
      return;
    }

    console.log(plan.headline);
    printStalePendingPicksTable(picks, now);
    if (args.execute) {
      console.log(`written: ${written} pick(s) set isPublished=false`);
      console.log(`remaining after re-running the selection: ${remaining} (expect 0)`);
      console.log("Record the count in docs/ops/OPERATOR_TASKS.md STALE-PICKS and verify stalePendingPicks on /api/ops/public-surface-truth.");
    } else {
      console.log("Nothing written. Re-run with --execute to set isPublished=false on exactly these rows. See docs/ops/OPERATOR_TASKS.md STALE-PICKS.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
