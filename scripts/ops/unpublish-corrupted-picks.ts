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
 */
import { PrismaClient } from "@prisma/client";
import {
  CORRUPTED_POPULATIONS,
  narrow,
  reasonFor,
  summarize,
  whereFor,
  type CorruptedPickRow,
  type CorruptedPopulation,
} from "./lib/corrupted-pick-selection";

type Args = {
  readonly populations: readonly CorruptedPopulation[];
  readonly execute: boolean;
  readonly json: boolean;
};

export function parseArgs(argv: readonly string[]): { ok: true; args: Args } | { ok: false; error: string } {
  let populations: CorruptedPopulation[] | null = null;
  let execute = false;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--execute") execute = true;
    else if (a === "--json") json = true;
    else if (a === "--population") {
      const v = argv[i + 1];
      i += 1;
      if (v === undefined) return { ok: false, error: "--population needs a value" };
      if (v === "all") populations = [...CORRUPTED_POPULATIONS];
      else if ((CORRUPTED_POPULATIONS as readonly string[]).includes(v)) {
        populations = [v as CorruptedPopulation];
      } else {
        return {
          ok: false,
          error: `unknown population "${v}" (expected one of ${CORRUPTED_POPULATIONS.join(", ")}, or all)`,
        };
      }
    } else return { ok: false, error: `unexpected argument "${a}"` };
  }
  if (populations === null) return { ok: false, error: "--population is required (no implicit target)" };
  return { ok: true, args: { populations, execute, json } };
}

const parsed = parseArgs(process.argv.slice(2));
if (!parsed.ok) {
  console.error(`unpublish-corrupted-picks: ${parsed.error}`);
  process.exit(2);
}
const args = parsed.args;

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
    where: whereFor(population) as never,
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
        // ONE bounded write. The `isPublished: true` guard makes it idempotent:
        // a second run touches nothing.
        const res = await prisma.pick.updateMany({
          where: { id: { in: rows.map((r) => r.id) }, isPublished: true },
          data: { isPublished: false },
        });
        written = res.count;
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
