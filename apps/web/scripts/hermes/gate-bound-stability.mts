/**
 * READ-ONLY diagnostic: how stable is the deployed-version eligibility bound?
 *
 * Why this exists
 * ---------------
 * `bootstrapDebiasedEceLowerBound` (lib/calibration/metric-slices.ts) draws
 * SLICE_CI_RESAMPLES=200 seeded resamples and reports the 5th percentile as the
 * deployed-version floor input. The gate fails a version only when that bound is
 * ABOVE the ECE floor, so the bound is the single statistic that decides whether
 * the public performance record opens.
 *
 * On 2026-09-11 the bound crossed the 0.05 floor between two consecutive
 * evaluations on a ONE-ROW sample change (n 270 -> 271): 0.050424 (RED) ->
 * 0.049181 (GREEN), while the same version's point estimate got WORSE
 * (0.060636 -> 0.065644). The margin is 0.000819, i.e. 1.6% of the floor.
 *
 * This script measures whether a 200-resample 5th percentile is precise enough
 * to carry that decision: it recomputes the bound on the SAME rows under
 * alternate seeds and larger resample counts. It writes nothing and reads only.
 *
 * Usage (from apps/web):
 *   DATABASE_URL=... npx tsx scripts/hermes/gate-bound-stability.mts
 *   DATABASE_URL=... npx tsx scripts/hermes/gate-bound-stability.mts --model v5.2.7
 */
import { db } from "@sports/db";
import {
  CANONICAL_LEARNING_PICK_WHERE,
  picksToCalibrationSamples,
} from "@/lib/ops/compute-live-calibration-metrics";
import { loadPublishTimeMarketPResolver } from "@/lib/calibration/publish-time-market-p-loader";
import {
  SLICE_CI_SEED,
  bootstrapDebiasedEceLowerBound,
} from "@/lib/calibration/metric-slices";
import { canonicalSampleOrder } from "@/lib/calibration/canonical-sample-order";
import { debiasedExpectedCalibrationError } from "@/lib/calibration/ece-debiased";
import { expectedCalibrationError } from "@sports/prediction-engine";

const ECE_FLOOR = 0.05; // CalibrationEligibilityFloors.ece — never edited here.

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : null;
}

function pct(draws: number[], q: number): number {
  const s = [...draws].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))]!;
}

async function main(): Promise<void> {
  const wantModel = arg("--model");

  const picks = await db.pick.findMany({
    where: CANONICAL_LEARNING_PICK_WHERE,
    select: {
      id: true,
      gameId: true,
      generatedAt: true,
      selection: true,
      confidence: true,
      pickType: true,
      factorBreakdown: true,
      proofReceipt: { select: { marketFairProb: true } },
      game: {
        select: {
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          sport: { select: { key: true } },
        },
      },
      result: true,
      modelVersion: true,
      settledAt: true,
    },
    orderBy: { settledAt: "desc" },
    take: 2000,
  });

  const rows = picks.map((pick) => ({
    id: pick.id,
    gameId: pick.gameId,
    generatedAt: pick.generatedAt,
    selection: pick.selection,
    homeTeamName: pick.game?.homeTeamName ?? null,
    awayTeamName: pick.game?.awayTeamName ?? null,
    commenceTime: pick.game?.commenceTime ?? null,
    confidence: pick.confidence,
    result: pick.result ?? "",
    modelVersion: pick.modelVersion,
    settledAt: pick.settledAt,
    pickType: pick.pickType,
    factorBreakdown: pick.factorBreakdown,
    proofReceipt: pick.proofReceipt,
    sportKey: pick.game?.sport?.key ?? null,
  }));

  const oddsTable = await loadPublishTimeMarketPResolver(db, rows as never);
  const built = picksToCalibrationSamples(rows as never, {
    resolveMarketP: oddsTable.resolveMarketP,
  });

  const byVersion = new Map<string, typeof built.taggedSamples>();
  for (const s of built.taggedSamples) {
    const key = s.modelVersion ?? "(none)";
    const list = byVersion.get(key);
    if (list) list.push(s);
    else byVersion.set(key, [s]);
  }

  console.log(`canonical samples: ${built.samples.length}  (exclusions ${JSON.stringify(built.exclusions)})`);
  const ranked = [...byVersion.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [key, list] of ranked) console.log(`  slice ${key.padEnd(10)} n=${list.length}`);

  const target = wantModel ?? ranked[0]?.[0] ?? null;
  if (!target) {
    console.log("no slices — nothing to measure");
    return;
  }
  const rowsForTarget = canonicalSampleOrder(byVersion.get(target)!);
  console.log(`\n=== slice ${target}  n=${rowsForTarget.length} ===`);

  const corrected = debiasedExpectedCalibrationError(rowsForTarget);
  const rawEce = expectedCalibrationError(rowsForTarget);
  console.log(`raw ECE                 ${rawEce.toFixed(6)}`);
  console.log(`expected-raw-ECE noise  ${corrected.noise.toFixed(6)}`);
  console.log(`debiased ECE (point)    ${corrected.debiased.toFixed(6)}`);
  console.log(`ECE floor               ${ECE_FLOOR.toFixed(6)}`);
  console.log(
    `  -> raw ${rawEce > ECE_FLOOR ? "FAILS" : "passes"} | debiased point ${corrected.debiased > ECE_FLOOR ? "FAILS" : "passes"} | floor reads the bound below`,
  );

  console.log(`\nproduction bound (seed 0x${SLICE_CI_SEED.toString(16)}, 200 resamples)`);
  const prod = bootstrapDebiasedEceLowerBound(rowsForTarget);
  console.log(`  5th pct = ${prod?.toFixed(6)}  vs floor ${ECE_FLOOR} -> ${(prod ?? 0) > ECE_FLOOR ? "RED" : "GREEN"}  margin ${((ECE_FLOOR - (prod ?? 0)) * 1000).toFixed(4)}e-3`);

  console.log(`\nseed sensitivity at the production resample count (same rows):`);
  const seedBounds: number[] = [];
  for (let k = 0; k < 24; k += 1) {
    const b = bootstrapDebiasedEceLowerBound(rowsForTarget, { seed: (SLICE_CI_SEED + k * 0x9e37) >>> 0 });
    if (b != null) seedBounds.push(b);
  }
  seedBounds.sort((a, b) => a - b);
  const green = seedBounds.filter((b) => b <= ECE_FLOOR).length;
  console.log(`  min ${seedBounds[0]!.toFixed(6)}  median ${pct(seedBounds, 0.5).toFixed(6)}  max ${seedBounds.at(-1)!.toFixed(6)}`);
  console.log(`  spread ${((seedBounds.at(-1)! - seedBounds[0]!) * 1000).toFixed(4)}e-3  (floor margin ${(Math.abs(ECE_FLOOR - prod!) * 1000).toFixed(4)}e-3)`);
  console.log(`  verdicts across ${seedBounds.length} seeds: GREEN ${green} / RED ${seedBounds.length - green}`);

  console.log(`\nresample-count convergence (production seed, same rows):`);
  for (const r of [200, 500, 1000, 2000, 5000, 20000]) {
    const t0 = Date.now();
    const b = bootstrapDebiasedEceLowerBound(rowsForTarget, { resamples: r });
    console.log(
      `  ${String(r).padStart(6)} resamples -> ${b?.toFixed(6)}  ${(b ?? 0) > ECE_FLOOR ? "RED" : "GREEN"}   (${Date.now() - t0}ms)`,
    );
  }

  console.log(
    `\nINTERPRETATION: a bound whose seed-to-seed spread exceeds its distance to the floor cannot decide a publish gate.`,
  );

  // ---- the one-row test: does a single settled pick move the verdict? ----
  console.log(`\none-row sensitivity (leave-one-out on the newest settled rows):`);
  const ordered = rowsForTarget; // canonical order
  const base = bootstrapDebiasedEceLowerBound(ordered)!;
  const baseVerdict = base > ECE_FLOOR ? "RED" : "GREEN";
  console.log(`  full slice n=${ordered.length}  bound ${base.toFixed(6)}  ${baseVerdict}`);
  let flips = 0;
  const sampleIdx = [...Array(ordered.length).keys()];
  const step = Math.max(1, Math.floor(ordered.length / 40));
  for (const i of sampleIdx.filter((_, j) => j % step === 0)) {
    const loo = ordered.filter((_, j) => j !== i);
    const b = bootstrapDebiasedEceLowerBound(loo);
    if (b == null) continue;
    const v = b > ECE_FLOOR ? "RED" : "GREEN";
    if (v !== baseVerdict) {
      flips += 1;
      console.log(`  removing row ${i} -> bound ${b.toFixed(6)}  ${v}   <-- VERDICT FLIP on one row`);
    }
  }
  console.log(`  leave-one-out flips: ${flips} of the sampled removals`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e);
    process.exit(1);
  });
