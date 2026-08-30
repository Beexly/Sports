/**
 * run-clv-report.ts — produce GSE's REAL CLV track record from the database.
 *
 * Run in your environment (needs DATABASE_URL):
 *   npx tsx eval/edge-lab/run-clv-report.ts
 *
 * Reads every SETTLED, NON-BOOTSTRAP pick that has a graded clvValue, joins the
 * season + the proof receipt's modelProb, and prints mean CLV, beat-close rate,
 * and (only if a real modelProb exists) Brier/ECE — per season and overall.
 *
 * It will NOT invent a number. No DB, or zero qualifying picks, prints an honest
 * "insufficient data" result — which, pre-launch, is the truthful answer.
 */
import { db } from "@sports/db";
// dynamic import keeps this script tsconfig-agnostic for the pure .mjs helpers
const { clvReport } = (await import("./clv-report.mjs")) as {
  clvReport: (picks: unknown[], opts?: { minSampleForProven?: number }) => any;
};

async function main() {
  const rows = await db.pick.findMany({
    where: { result: { not: "PENDING" }, isBootstrap: false, clvValue: { not: null } },
    select: {
      clvValue: true,
      clvVerdict: true,
      result: true,
      game: { select: { season: true } },
      proofReceipt: { select: { modelProb: true } },
    },
  });

  const picks = rows.map((r) => ({
    season: r.game?.season ?? undefined,
    result: r.result,
    clvValue: r.clvValue,
    clvVerdict: r.clvVerdict,
    modelProb: r.proofReceipt?.modelProb ?? null,
  }));

  const report = clvReport(picks);

  console.log("\n=== GSE CLV TRACK RECORD (real, from settled non-bootstrap picks) ===\n");
  if (report.overall.n === 0) {
    console.log("No settled, graded, non-bootstrap picks yet. Honest answer: insufficient data.");
    console.log("This is expected pre-launch — the track record builds as live picks settle.\n");
    return;
  }
  for (const s of report.seasons) printBlock(s);
  printBlock(report.overall);
  console.log("\nCalibration (Brier/ECE):");
  if (report.calibration.n > 0) {
    console.log(`  n=${report.calibration.n}  Brier=${report.calibration.brier.toFixed(4)}  ECE=${report.calibration.ece.toFixed(4)}`);
  } else {
    console.log(`  ${report.calibration.note}`);
  }
  console.log("");
}

function printBlock(s: any) {
  console.log(`[${s.season}] n=${s.n}  meanCLV=${s.meanClv >= 0 ? "+" : ""}${s.meanClv.toFixed(4)}  beatClose=${(s.beatCloseRate * 100).toFixed(1)}%  (beat ${s.verdicts.beat} / matched ${s.verdicts.matched} / lost ${s.verdicts.lost})`);
  console.log(`      sample: ${s.sampleAdequacy}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error("\nCould not produce the report (most likely no DATABASE_URL / DB reachable in this environment):");
    console.error(String(err?.message ?? err));
    console.error("\nThis script does not fabricate a number. Run it where the DB is reachable.\n");
    await db.$disconnect().catch(() => {});
    process.exit(2);
  });
