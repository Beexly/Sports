#!/usr/bin/env npx tsx
/**
 * REPORT-ONLY dry run for ledger C-197 (line integrity). C-273.
 *
 * For every settled, published SPREAD/TOTAL pick whose stored grading line is
 * off the half-point grid, look up the publish-time book line using the same
 * resolver order the calibration loader uses (C-253 / C-110: real bookmakers
 * only, each one's latest row at or before generatedAt) and print, per pick:
 * the stored line, the book line or NONE, the result on record, the result
 * that book line would have produced via the engine's own calculatePickResult
 * and selectGradingLine, and whether the two differ. Aggregated by sport and
 * market.
 *
 * IT WRITES NOTHING. There is no write mode and no flag that creates one: any
 * of --execute / --write / --apply / --fix / --regrade exits 2 without
 * touching the database. No create/update/delete/upsert/$executeRaw call
 * exists in this file. Modeled on scripts/ops/list-stale-pending-picks.ts.
 *
 * IT REPORTS NO CORRECTED HIT RATE, here or in any document. The difference
 * counts say how many recorded results a book-line grade would change; a win
 * percentage off an unapproved grading policy is the exact claim C-197 exists
 * to prevent.
 *
 * Usage:
 *   npm run ops:regrade-lines
 *   npm run ops:regrade-lines -- --json --limit 500
 */
import { PrismaClient } from "@prisma/client";
import { calculatePickResult } from "@sports/prediction-engine";
import {
  buildRegradeReport,
  gradingLineOf,
  isOffHalfPointGrid,
  refusedWriteFlag,
  regradeOne,
  type RegradeOddsRow,
  type RegradePickRow,
  type RegradeVerdict,
} from "./lib/regrade-line-selection";

const argv = process.argv.slice(2);

const refused = refusedWriteFlag(argv);
if (refused) {
  console.error(
    `regrade-against-book-lines: ${refused} is not a flag this tool has. It is report-only: ` +
      "re-grading a settled pick rewrites a published result and needs a grading policy " +
      "nobody has approved. See docs/ops/LINE_INTEGRITY_DECISION_2026-09-08.md.",
  );
  process.exit(2);
}

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error(
    "regrade-against-book-lines: DATABASE_URL missing or stub - abort (no secrets invented)",
  );
  process.exit(2);
}

const JSON_OUT = argv.includes("--json");
const limitIdx = argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Math.max(1, Number(argv[limitIdx + 1] ?? "1000")) : 1000;

const PICK_MARKET_TO_ODDS_MARKET: Record<string, "SPREADS" | "TOTALS"> = {
  SPREAD: "SPREADS",
  TOTAL: "TOTALS",
};

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const picks = await prisma.pick.findMany({
      where: {
        isPublished: true,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        pickType: { in: ["SPREAD", "TOTAL"] },
      },
      orderBy: [{ generatedAt: "asc" }],
      take: LIMIT,
      select: {
        id: true,
        gameId: true,
        pickType: true,
        selection: true,
        line: true,
        clvLockLine: true,
        result: true,
        generatedAt: true,
        game: {
          select: {
            homeTeamName: true,
            awayTeamName: true,
            homeScore: true,
            awayScore: true,
            sport: { select: { key: true } },
          },
        },
      },
    });

    const candidates: RegradePickRow[] = picks
      .map((p) => ({
        id: p.id,
        gameId: p.gameId,
        pickType: String(p.pickType),
        selection: p.selection,
        line: p.line,
        clvLockLine: p.clvLockLine,
        result: String(p.result),
        generatedAt: p.generatedAt,
        sportKey: p.game.sport?.key ?? "",
        homeTeamName: p.game.homeTeamName,
        awayTeamName: p.game.awayTeamName,
        homeScore: p.game.homeScore,
        awayScore: p.game.awayScore,
      }))
      .filter((p) => isOffHalfPointGrid(gradingLineOf(p)));

    const rows: Array<{ pick: RegradePickRow; verdict: RegradeVerdict }> = [];
    const detail: Array<Record<string, unknown>> = [];
    for (const pick of candidates) {
      const oddsRows: RegradeOddsRow[] = (
        await prisma.odds.findMany({
          where: {
            gameId: pick.gameId,
            market: PICK_MARKET_TO_ODDS_MARKET[pick.pickType] ?? "SPREADS",
            fetchedAt: { lte: pick.generatedAt },
          },
          select: { bookmaker: true, fetchedAt: true, spread: true, total: true },
        })
      ).map((o) => ({
        bookmaker: o.bookmaker,
        fetchedAt: o.fetchedAt,
        line: pick.pickType === "SPREAD" ? o.spread : o.total,
      }));
      const verdict = regradeOne(pick, oddsRows, calculatePickResult as never);
      rows.push({ pick, verdict });
      detail.push({
        pickId: pick.id,
        sportKey: pick.sportKey,
        pickType: pick.pickType,
        selection: pick.selection,
        storedLine: gradingLineOf(pick),
        bookLine: verdict.status === "compared" ? verdict.bookLine : null,
        bookCount: verdict.status === "compared" ? verdict.bookCount : 0,
        storedResult: pick.result,
        bookResult: verdict.status === "compared" ? verdict.bookResult : null,
        differs: verdict.status === "compared" ? verdict.differs : null,
        status: verdict.status,
      });
    }

    const report = buildRegradeReport(rows);
    if (JSON_OUT) {
      console.log(JSON.stringify({ report, detail, scanned: picks.length, limit: LIMIT }, null, 2));
      return;
    }

    console.log(`Scanned ${picks.length} settled published SPREAD/TOTAL picks (limit ${LIMIT}).`);
    console.log(`Off the half-point grid: ${report.examined}.`);
    console.log(
      `  book line found: ${report.compared}   NONE: ${report.noBookLine}   no final: ${report.noFinal}`,
    );
    console.log(
      `  recorded results a book-line grade would CHANGE: ${report.differs} of ${report.compared} compared.`,
    );
    console.log("");
    console.log("sport                        market   examined  compared  NONE  differs");
    for (const b of report.buckets) {
      console.log(
        `${b.sportKey.padEnd(28)} ${b.pickType.padEnd(8)} ${String(b.examined).padStart(8)} ` +
          `${String(b.compared).padStart(9)} ${String(b.noBookLine).padStart(5)} ` +
          `${String(b.differs).padStart(8)}`,
      );
    }
    console.log("");
    console.log("This tool wrote nothing, and reports no corrected hit rate by design.");
    console.log("First 25 rows:");
    for (const d of detail.slice(0, 25)) {
      console.log(
        `  ${String(d["pickId"]).padEnd(26)} ${String(d["pickType"]).padEnd(7)} ` +
          `stored ${String(d["storedLine"]).padStart(10)}  book ${String(d["bookLine"] ?? "NONE").padStart(8)}  ` +
          `${String(d["storedResult"]).padEnd(5)} -> ${String(d["bookResult"] ?? "-").padEnd(5)} ` +
          `${d["differs"] === true ? "DIFFERS" : ""}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`regrade-against-book-lines: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
