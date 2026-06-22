/**
 * Calibration activation validator (path-to-70.md §7, step "held-out validation").
 *
 * READ-ONLY. Pulls settled, canonical, learning-eligible (published, non-bootstrap,
 * non-seed, WIN/LOSS) picks from the configured DATABASE_URL and answers the only
 * question that gates CALIBRATION_ADJUSTMENTS_ENABLED:
 *
 *   Does the fitted isotonic map beat the raw confidence OUT-OF-SAMPLE?
 *
 * It reuses the engine's own isotonicCalibration + expectedCalibrationError so the
 * numbers match production exactly, and computes a cross-validated (5-fold)
 * out-of-fold ECE — never in-sample. It changes nothing; it only prints numbers.
 */

import pg from "pg";
import {
  isotonicCalibration,
  expectedCalibrationError,
  type CalibrationSample,
} from "../packages/prediction-engine/src/probability-calibration.js";
import { buildCalibrator } from "../packages/prediction-engine/src/calibration-apply.js";

const DB = process.env["DATABASE_URL"];
if (!DB) {
  console.error("DATABASE_URL not set");
  process.exit(2);
}

// Deterministic shuffle (seeded LCG) so the split is reproducible run-to-run.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const { rows } = await client.query(
    `SELECT confidence, result
       FROM picks
      WHERE result IN ('WIN','LOSS')
        AND "isPublished" = true
        AND "isBootstrap" = false
        AND "modelVersion" <> 'v5.0.0-seed'`
  );
  await client.end();

  const samples: CalibrationSample[] = rows
    .filter((r) => Number.isFinite(Number(r.confidence)))
    .map((r) => ({ p: Math.max(0, Math.min(1, Number(r.confidence) / 100)), y: (r.result === "WIN" ? 1 : 0) as 0 | 1 }));

  const wins = samples.filter((s) => s.y === 1).length;
  const n = samples.length;
  console.log(`learning-eligible settled (WIN/LOSS) picks: ${n}  (W ${wins} / L ${n - wins})`);
  if (n < 100) {
    console.log(`SAMPLE < 100 → STOP. CALIBRATION_ADJUSTMENTS_ENABLED stays false (inert by design).`);
    return;
  }

  // In-sample reference (what buildCalibrator itself reports).
  const inSample = buildCalibrator(samples);
  console.log(`\n--- in-sample (buildCalibrator) ---`);
  console.log(`isActive=${inSample.isActive}  rawEce=${inSample.rawEce.toFixed(4)}  calibratedEce(in-sample)=${inSample.calibratedEce.toFixed(4)}`);
  if (inSample.inactiveReason) console.log(`inactiveReason: ${inSample.inactiveReason}`);

  // 5-fold out-of-fold calibrated predictions (the honest held-out test).
  const shuffled = seededShuffle(samples, 20260621);
  const K = 5;
  const oof: CalibrationSample[] = [];
  const foldEce: number[] = [];
  for (let k = 0; k < K; k++) {
    const test = shuffled.filter((_, i) => i % K === k);
    const train = shuffled.filter((_, i) => i % K !== k);
    const model = isotonicCalibration(train);
    const calTest: CalibrationSample[] = test.map((s) => ({ p: model.predict(s.p), y: s.y }));
    oof.push(...calTest);
    foldEce.push(expectedCalibrationError(calTest));
  }
  const rawEceAll = expectedCalibrationError(samples);
  const calEceOOF = expectedCalibrationError(oof);

  console.log(`\n--- held-out (5-fold out-of-fold) ---`);
  console.log(`rawEce (all):            ${rawEceAll.toFixed(4)}`);
  console.log(`calibratedEce (held-out): ${calEceOOF.toFixed(4)}`);
  console.log(`per-fold held-out ECE:   [${foldEce.map((e) => e.toFixed(4)).join(", ")}]`);
  const beats = calEceOOF <= rawEceAll;
  console.log(`\nVERDICT: calibrated ${beats ? "<=" : ">"} raw out-of-sample → ${beats ? "PASS (calibration helps)" : "FAIL (do NOT activate)"}`);
}

main().catch((e) => {
  console.error("validation error:", e?.message ?? e);
  process.exit(1);
});
