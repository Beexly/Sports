#!/usr/bin/env npx tsx
/**
 * READ-ONLY. Classify settled published picks against the settle-time evidence
 * their settlement event carries (ledger C-120), so a stored result that
 * contradicts the score now on the game row can be attributed as MIS_GRADED or
 * GAME_ROW_OVERWRITTEN (ledger C-115) instead of guessed at. The classes and
 * their meaning are documented in scripts/ops/lib/settlement-evidence-classify.ts.
 *
 * This script has NO write path, by construction: one findMany, then pure
 * classification, then printing. There is no --execute because there is
 * nothing to execute. It is an owner/founder command, never a cron.
 *
 * Rows settled before the graders recorded evidence (2026-09-07 20:20 UTC)
 * classify as NO_EVIDENCE and stay unattributable; the point of running this
 * is the rows settled since.
 *
 * Usage:
 *   npm run ops:classify-settlement-evidence                    # TOTAL, contradicted rows listed
 *   npm run ops:classify-settlement-evidence -- --type SPREAD   # or MONEYLINE, or all
 *   npm run ops:classify-settlement-evidence -- --all-rows      # list CONSISTENT rows too
 *   npm run ops:classify-settlement-evidence -- --json
 *   npm run ops:classify-settlement-evidence -- --pick <id> [--pick <id>]
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx tsx scripts/ops/classify-settlement-evidence.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  classifyAgainstEvidence,
  formatEvidenceRow,
  formatEvidenceTally,
  tallyEvidence,
  type EvidenceClassification,
} from "./lib/settlement-evidence-classify";
import { CLASSIFY_SELECT, classifyWhere, parseClassifyArgs } from "./lib/classify-settlement-evidence-args";
import type { DetectorPickType } from "../../apps/web/lib/ops/settlement-contradiction";

const WORTH_LISTING: ReadonlySet<EvidenceClassification["cls"]> = new Set([
  "MIS_GRADED",
  "GAME_ROW_OVERWRITTEN",
  "UNGRADEABLE",
]);

async function main(): Promise<void> {
  const parsed = parseClassifyArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`classify-settlement-evidence: ${parsed.error}`);
    process.exit(2);
  }
  const args = parsed.args;

  const url = process.env["DATABASE_URL"]?.trim();
  if (!url || url === "stub" || url.startsWith("changeme")) {
    console.error("classify-settlement-evidence: DATABASE_URL missing or stub - abort (no secrets invented)");
    process.exit(2);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await prisma.pick.findMany({
      where: classifyWhere(args),
      select: CLASSIFY_SELECT,
      orderBy: { settledAt: "desc" },
    });

    const classified = rows.map((r) =>
      classifyAgainstEvidence({
        pick: {
          id: r.id,
          pickType: r.pickType as DetectorPickType,
          selection: r.selection,
          line: r.line,
          clvLockLine: r.clvLockLine,
          result: r.result,
        },
        game: {
          sportKey: r.game.sport?.key ?? "",
          homeTeamName: r.game.homeTeamName,
          awayTeamName: r.game.awayTeamName,
          homeScore: r.game.homeScore,
          awayScore: r.game.awayScore,
        },
        eventPayload: r.settlementEvent?.payload ?? null,
      }),
    );
    const tally = tallyEvidence(classified);
    const listed = args.allRows ? classified : classified.filter((c) => WORTH_LISTING.has(c.cls));

    if (args.json) {
      console.log(JSON.stringify({ generatedAt: new Date().toISOString(), type: args.type, tally, rows: listed }, null, 2));
      return;
    }
    for (const line of formatEvidenceTally(tally)) console.log(line);
    console.log("");
    console.log(
      `${listed.length} row(s) listed` +
        (args.allRows ? "" : " (MIS_GRADED, GAME_ROW_OVERWRITTEN and UNGRADEABLE; pass --all-rows for the rest)") +
        ":",
    );
    for (const c of listed) console.log(formatEvidenceRow(c));
    console.log("");
    console.log(
      "Read-only: nothing was written. NO_EVIDENCE rows were settled before the graders recorded evidence and cannot be attributed by this tool.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
