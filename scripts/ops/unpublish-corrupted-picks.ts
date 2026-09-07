#!/usr/bin/env npx tsx
/**
 * Unpublish the CORRUPTED-GRADE pick populations (C-114, C-118, C-125).
 *
 * Sibling of adjudicate-stale-picks.ts and deliberately the same shape: dry run
 * by default, one bounded `updateMany`, no deletes, no `result` rewritten, no
 * game row touched. See lib/corrupted-pick-selection.ts for why UNPUBLISH and
 * not VOID or revert-to-PENDING.
 *
 * Usage:
 *   npx tsx scripts/ops/unpublish-corrupted-picks.ts --population settled-before-kickoff
 *   npx tsx scripts/ops/unpublish-corrupted-picks.ts --population mlb-off-runline --execute
 *   npx tsx scripts/ops/unpublish-corrupted-picks.ts --population all --json
 *
 * Always run the dry run first and read its output. The row count it prints is
 * the number the ledger evidence must record after --execute.
 *
 * ------------------------------------------------------------------------
 * DO NOT RUN --execute ON settled-before-kickoff YET (2026-09-07, C-114).
 *
 * Four rows of that population were spot-checked against ESPN ground truth and
 * THREE OF THE FOUR stored results are CORRECT against the true final. The game
 * rows carry wrong scores - ESPN 401816835 truly finished 10-1 where our row
 * says 4-6, 401816838 truly 8-10 where ours says 10-7, 401816830 truly 10-3
 * where ours says 5-6 - but the picks themselves mostly landed right.
 *
 * Unpublishing therefore removes roughly three correct rows for every wrong one.
 * There is a real argument the other way (a pick graded 15h before kickoff
 * observed nothing, so a coincidence with the truth is a coin flip that landed
 * and must not count as skill), and that argument is about CALIBRATION, not
 * about the public record. The instrument that satisfies both is RE-GRADING
 * against ESPN truth, not deletion.
 *
 * Re-grading writes `result`, which the settlement outbox owns, so it is a
 * founder decision. Until that decision is made this population stays queued and
 * the tool stays unrun. The other two populations are unaffected by this note.
 * ------------------------------------------------------------------------
 */
import { PrismaClient } from "@prisma/client";
import {
  CORRUPTED_POPULATIONS,
  MLB_RUN_LINES,
  RUN_LINE_EPSILON,
  narrow,
  parseUnpublishArgs,
  reasonFor,
  summarize,
  whereFor,
  type CorruptedPickRow,
  type CorruptedPopulation,
  type UnpublishArgs,
} from "./lib/corrupted-pick-selection";

const parsed = parseUnpublishArgs(process.argv.slice(2));
if (!parsed.ok) {
  console.error(`unpublish-corrupted-picks: ${parsed.error}`);
  process.exit(2);
}
const args: UnpublishArgs = parsed.args;

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("unpublish-corrupted-picks: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

async function load(
  prisma: PrismaClient,
  population: CorruptedPopulation,
): Promise<CorruptedPickRow[]> {
  const rows = await prisma.pick.findMany({
    where: whereFor(population),
    select: {
      id: true,
      gameId: true,
      pickType: true,
      selection: true,
      line: true,
      result: true,
      settledAt: true,
      modelVersion: true,
      game: { select: { commenceTime: true, sport: { select: { key: true } } } },
    },
  });
  const mapped: CorruptedPickRow[] = rows.map((r) => ({
    id: r.id,
    gameId: r.gameId,
    pickType: String(r.pickType),
    selection: r.selection,
    line: r.line,
    result: String(r.result),
    settledAt: r.settledAt,
    commenceTime: r.game.commenceTime,
    sportKey: r.game.sport.key,
    modelVersion: r.modelVersion,
  }));
  return narrow(population, mapped);
}

/**
 * Set isPublished=false on exactly the rows that STILL match the population, at
 * write time, evaluated by the database.
 *
 * WHY EVERY POPULATION RE-VALIDATES, not just the time-sensitive one. An earlier
 * revision of this file re-checked the C-114 predicate database-side and left the
 * other two guarded only by id and isPublished, on the stated reasoning that they
 * "key on immutable facts - the sport and the pick's own line". THAT REASONING WAS
 * WRONG, and two reviewers caught it independently (CodeRabbit and Devin Review,
 * #719): packages/ingestion-pipeline/src/process-sport.ts refreshes `line` on
 * every ingestion cycle for picks that already exist, with `result` and
 * `settledAt` deliberately excluded from that update but `line` deliberately
 * included. So an off-ladder run line CAN become a valid one between the moment
 * this tool selects a row and the moment it writes, and the tool would then
 * withdraw a pick that is no longer corrupt.
 *
 * The lesson is not "add a check to the MLB branch". It is that a remediation
 * tool must never write on a classification it made in the past, so the whole
 * class is closed: the predicate is re-evaluated inside the write for all three
 * populations, and the reported count is what the database actually changed. A
 * row that stopped matching is simply not counted, rather than silently withdrawn.
 */
async function unpublish(
  prisma: PrismaClient,
  population: CorruptedPopulation,
  ids: readonly string[],
): Promise<number> {
  // `ids` is a JS string[] and Pick.id is postgres `text`. Prisma binds the array
  // as a single parameter, so ANY() needs the element type spelled out or postgres
  // cannot resolve it (CodeRabbit, #719).
  const idList = [...ids];
  switch (population) {
    case "settled-before-kickoff":
      // Cannot be expressed in Prisma's filter language (two columns compared),
      // and the ingestion pipeline actively corrects commenceTime, so a schedule
      // correction landing between load and write must not be overwritten.
      return prisma.$executeRaw`
        UPDATE picks p
        SET "isPublished" = false
        FROM games g
        WHERE g.id = p."gameId"
          AND p.id = ANY(${idList}::text[])
          AND p."isPublished" = true
          AND p."settledAt" IS NOT NULL
          AND p."settledAt" < g."commenceTime"
          AND p.result <> 'VOID'`;
    case "soccer-two-way-ml":
      return prisma.$executeRaw`
        UPDATE picks p
        SET "isPublished" = false
        FROM games g
        JOIN sports s ON s.id = g."sportId"
        WHERE g.id = p."gameId"
          AND p.id = ANY(${idList}::text[])
          AND p."isPublished" = true
          AND p."pickType" = 'MONEYLINE'
          AND s.key LIKE 'soccer%'`;
    case "mlb-off-runline":
      // The ladder comes from MLB_RUN_LINES rather than being spelled out here,
      // so the SQL and the in-memory selector cannot drift apart.
      return prisma.$executeRaw`
        UPDATE picks p
        SET "isPublished" = false
        FROM games g
        JOIN sports s ON s.id = g."sportId"
        WHERE g.id = p."gameId"
          AND p.id = ANY(${idList}::text[])
          AND p."isPublished" = true
          AND p."pickType" = 'SPREAD'
          AND s.key = 'baseball_mlb'
          AND p.line IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM unnest(${[...MLB_RUN_LINES]}::double precision[]) AS valid
            WHERE abs(abs(p.line) - valid) < ${RUN_LINE_EPSILON}
          )`;
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const report: Record<string, unknown>[] = [];
  try {
    for (const population of args.populations) {
      const rows = await load(prisma, population);
      const summary = summarize(population, rows);

      let written: number | null = null;
      let remaining: number | null = null;

      if (args.execute && rows.length > 0) {
        written = await unpublish(prisma, population, rows.map((r) => r.id));
        remaining = (await load(prisma, population)).length;
      } else if (args.execute) {
        written = 0;
        remaining = 0;
      }

      report.push({ ...summary, written, remaining, dryRun: !args.execute });

      if (!args.json) {
        console.log(`\n=== ${population} ===`);
        console.log(`selected: ${rows.length}${args.execute ? ` | unpublished: ${written} | remaining: ${remaining}` : " (DRY RUN, nothing written)"}`);
        for (const r of rows.slice(0, 10)) {
          console.log(`  ${r.id}  ${r.sportKey} ${r.pickType} ${r.result}  ${reasonFor(population, r)}`);
        }
        if (rows.length > 10) console.log(`  ... and ${rows.length - 10} more`);
      }
    }

    if (args.json) console.log(JSON.stringify({ populations: report }, null, 2));
    else if (!args.execute) {
      console.log("\nNothing written. Re-run with --execute to set isPublished=false on exactly these rows.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
