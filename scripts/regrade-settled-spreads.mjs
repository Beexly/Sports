#!/usr/bin/env node
/**
 * regrade-settled-spreads — audit (and optionally fix) settled SPREAD picks
 * graded before the R-01 settlement boundary fix.
 *
 * THE DEFECT (LAUNCH_READINESS B-01 / GAP_REGISTER R-01): `Pick.line` is
 * persisted from the CHOSEN side's perspective, but `calculatePickResult()`
 * expects the HOME perspective. Feeding the chosen-side line straight in
 * inverted every away SPREAD grade (away favorite -3.5 that lost by 1-2 was
 * graded WIN). The worker now converts via `homePerspectiveLine()` at the
 * boundary (decision D-010); this script re-grades anything settled BEFORE
 * that fix landed.
 *
 * AS OF 2026-06-10 production has never settled a pick (the prod DB is
 * unprovisioned — human gate B-02), so no backfill is owed yet. The script
 * exists so that IF any environment ever settled spreads under the old code,
 * the corruption is one command away from being measured and corrected.
 *
 * SAFETY:
 *   - DRY-RUN BY DEFAULT: reports mismatches, writes nothing.
 *   - `--apply` is required to write, and only updates picks whose recomputed
 *     grade differs (result + mirrored PickSignalSnapshot.settlementResult).
 *   - Only SPREAD picks with result WIN/LOSS/PUSH and a FINAL score are
 *     touched. MONEYLINE/TOTAL grades were never perspective-dependent.
 *   - Settled timestamps are preserved; eligibleForLearning is NOT recomputed
 *     here (calibration eligibility is the engine's job, not a script's).
 *
 * Usage (from repo root):
 *   node scripts/regrade-settled-spreads.mjs            # dry-run report
 *   node scripts/regrade-settled-spreads.mjs --apply    # write corrections
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Resolve the generated client through the db workspace package.
const { PrismaClient } = require("@prisma/client");

const APPLY = process.argv.includes("--apply");

/**
 * Mirrors packages/prediction-engine/src/settlement.ts exactly.
 * homePerspectiveLine: chosen-side -> home-perspective (SPREAD only).
 */
function homePerspectiveLine(selection, chosenSideLine, homeTeam) {
  const pickedHome = selection.includes(homeTeam);
  return pickedHome ? chosenSideLine : -chosenSideLine;
}

/** Mirrors calculatePickResult()'s SPREAD branch (home-perspective line). */
function spreadResult(selection, homeLine, homeTeam, homeScore, awayScore) {
  const pickedHome = selection.includes(homeTeam);
  const homeCoverMargin = homeScore - awayScore + homeLine;
  if (homeCoverMargin === 0) return "PUSH";
  const homeCovered = homeCoverMargin > 0;
  return (pickedHome ? homeCovered : !homeCovered) ? "WIN" : "LOSS";
}

async function main() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
    console.error("[regrade] DATABASE_URL not set — nothing to audit. Exiting 0.");
    process.exit(0);
  }

  const db = new PrismaClient();
  try {
    const settled = await db.pick.findMany({
      where: {
        pickType: "SPREAD",
        result: { in: ["WIN", "LOSS", "PUSH"] },
      },
      include: { game: true },
      orderBy: { settledAt: "asc" },
    });

    console.log(
      `[regrade] ${APPLY ? "APPLY" : "DRY-RUN"} — ${settled.length} settled SPREAD pick(s) found.`
    );

    let mismatches = 0;
    let skipped = 0;
    let fixed = 0;

    for (const pick of settled) {
      const { game } = pick;
      if (game.homeScore == null || game.awayScore == null) {
        skipped++;
        console.warn(`[regrade] SKIP ${pick.id} — game ${game.id} has no final score.`);
        continue;
      }

      const correct = spreadResult(
        pick.selection,
        homePerspectiveLine(pick.selection, pick.line, game.homeTeamName),
        game.homeTeamName,
        game.homeScore,
        game.awayScore
      );

      if (correct === pick.result) continue;

      mismatches++;
      console.log(
        `[regrade] MISMATCH ${pick.id} "${pick.selection}" line=${pick.line} ` +
          `(${game.awayTeamName} @ ${game.homeTeamName} ${game.awayScore}-${game.homeScore}): ` +
          `stored=${pick.result} correct=${correct}`
      );

      if (APPLY) {
        await db.pick.update({
          where: { id: pick.id },
          data: { result: correct },
        });
        await db.pickSignalSnapshot.updateMany({
          where: { pickId: pick.id },
          data: { settlementResult: correct },
        });
        fixed++;
      }
    }

    console.log(
      `[regrade] Done. mismatches=${mismatches} skipped=${skipped}` +
        (APPLY ? ` corrected=${fixed}` : " (dry-run — rerun with --apply to correct)")
    );
    process.exit(mismatches > 0 && !APPLY ? 2 : 0);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("[regrade] Fatal:", err);
  process.exit(1);
});
