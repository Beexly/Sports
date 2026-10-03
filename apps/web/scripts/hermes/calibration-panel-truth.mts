/**
 * READ-ONLY: print the exact numbers the public /performance calibration panel
 * renders, straight from the production loader (`loadPublicCalibrationReport`).
 *
 * Why: the loader used to cap its sample at the 500 most recently settled picks
 * (`take: 500`), while the confidence-tail monitor read the SAME population with
 * no cap at all (`lib/calibration/confidence-tail.ts`) — two public surfaces, one
 * population definition, two different samples. The cap is removed (0c9508a03);
 * this script keeps printing both readings side by side so the two surfaces stay
 * comparable and the agreement can be re-verified after any loader change.
 *
 * Usage (from apps/web):
 *   DATABASE_URL=... npx tsx scripts/hermes/calibration-panel-truth.mts
 */
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { loadConfidenceTail } from "@/lib/calibration/confidence-tail";
import { db } from "@sports/db";

const pct = (x: number | null | undefined) => (x == null ? "n/a" : `${(x * 100).toFixed(1)}%`);

async function main(): Promise<void> {
  const report = await loadPublicCalibrationReport();
  const d = report.data;

  console.log("=== /performance Calibration Report (real loader) ===");
  console.log(`gated=${report.meta.gated} collecting=${d.isCollecting} updatedAt=${d.updatedAt}`);
  console.log(`"${d.sampleSize} settled picks"  modelVersions=${JSON.stringify(d.modelVersions)}`);
  console.log(
    `headline decided ${d.population.decided}: ${d.population.wins}W-${d.population.losses}L-${d.population.pushes}P-${d.population.voids}V`,
  );
  console.log(`headline rate = ${pct(d.population.decided ? d.population.wins / d.population.decided : null)} (95% CP ${pct(d.headlineClopperPearsonLow)}..${pct(d.headlineClopperPearsonHigh)})`);
  console.log(`brier = ${d.brierScore}`);
  console.log("");
  console.log("bucket    n    decided   observed   expected   delta");
  for (const b of d.buckets) {
    const decided = b.wins + b.losses;
    console.log(
      `${b.label.padEnd(8)} ${String(b.sampleSize).padStart(4)} ${String(decided).padStart(8)}   ${pct(decided ? b.wins / decided : null).padStart(8)}   ${pct(b.expectedWinRate).padStart(8)}   ${(b.delta >= 0 ? "+" : "") + (b.delta * 100).toFixed(1)}`,
    );
  }
  console.log("");
  console.log(`discrimination.trend = ${d.discrimination.trend}  monotonic=${d.discrimination.monotonic}  spread=${d.discrimination.spread}`);
  console.log(`note: ${d.discrimination.note}`);
  console.log("");
  console.log("=== confidence-tail monitor (same population definition, NO cap) ===");
  const tail = await loadConfidenceTail(db as never);
  console.log(`floor ${tail.floor}  n=${tail.n}  wins=${tail.wins}  winRate=${pct(tail.winRate)}  claimed=${pct(tail.claimedRate)}  brier=${tail.brier}`);
  console.log(`verdict ${tail.verdict}`);
  console.log(`hint: ${tail.operatorHint}`);
  for (const m of tail.byMarket) {
    console.log(`  market ${m.market.padEnd(9)} n=${m.n}  winRate=${pct(m.winRate)}  claimed=${pct(m.claimedRate)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e);
    process.exit(1);
  });
