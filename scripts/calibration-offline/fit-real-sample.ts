/**
 * Offline CIR/PAVA calibration fit on a real settled-pick export
 * (ORBIT_UNLOCK §6). R&D only — no live effect, no DB access, no secrets.
 *
 * Input: JSON file with rows [{confidence, y, t, pickType}] where
 *   confidence = 0-100 forecast, y = 1 win / 0 loss (PUSH/VOID excluded
 *   upstream), t = unix seconds of generatedAt (time-ordered holdout).
 * Export it read-only (export:settled-picks, or SQL-over-HTTP from a
 * restricted container: POST https://<endpoint-host>/sql with the
 * Neon-Connection-String header and a SELECT).
 *
 * Usage: npx tsx scripts/calibration-offline/fit-real-sample.ts --in <file.json>
 */
import { readFileSync } from "node:fs";
import {
  centeredIsotonicCalibration,
  isotonicCalibration,
  timeHoldoutSplit,
  expectedCalibrationError,
  reliabilityCurve,
  type TimestampedCalibrationSample,
} from "../../packages/prediction-engine/src/probability-calibration.js";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : null;
}

const inPath = arg("--in");
if (!inPath) {
  console.error("fit-real-sample: --in <file.json> required (rows or {rows:[...]})");
  process.exit(2);
}

type Row = { confidence: number; y: 0 | 1; t: string | number; pickType?: string };
const parsed = JSON.parse(readFileSync(inPath, "utf8")) as unknown;
const rawRows = Array.isArray(parsed)
  ? parsed
  : (parsed as { rows?: unknown }).rows;
if (!Array.isArray(rawRows) || rawRows.length === 0) {
  console.error("fit-real-sample: no rows in input");
  process.exit(2);
}

// Validate every row — malformed confidence/y/t must fail loudly, never
// flow into the fit as NaN and print plausible-looking garbage metrics.
const rows: Row[] = [];
for (const [i, r] of (rawRows as Record<string, unknown>[]).entries()) {
  const confidence = Number(r["confidence"]);
  const y = Number(r["y"]);
  const t = Number(r["t"]);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    console.error(`fit-real-sample: row ${i}: confidence out of [0,100]: ${String(r["confidence"])}`);
    process.exit(2);
  }
  if (y !== 0 && y !== 1) {
    console.error(`fit-real-sample: row ${i}: y must be 0 or 1: ${String(r["y"])}`);
    process.exit(2);
  }
  if (!Number.isFinite(t)) {
    console.error(`fit-real-sample: row ${i}: non-finite t: ${String(r["t"])}`);
    process.exit(2);
  }
  rows.push({
    confidence,
    y: y as 0 | 1,
    t,
    ...(typeof r["pickType"] === "string" ? { pickType: r["pickType"] } : {}),
  });
}

const samples: TimestampedCalibrationSample[] = rows.map((r) => ({
  p: Math.max(0, Math.min(1, r.confidence / 100)),
  y: r.y,
  t: Number(r.t),
}));

function brier(list: readonly { p: number; y: 0 | 1 }[]): number {
  if (list.length === 0) return 0;
  return list.reduce((s, r) => s + (r.p - r.y) ** 2, 0) / list.length;
}

const { train, test } = timeHoldoutSplit(samples, 0.7);
if (train.length === 0 || test.length === 0) {
  // A degenerate split would report held-out metrics of 0 for every model —
  // refuse rather than print numbers no observation backs.
  console.error(
    `fit-real-sample: need a non-empty train AND test split (got train=${train.length}, test=${test.length}; supply more rows)`,
  );
  process.exit(2);
}
const cir = centeredIsotonicCalibration(train);
const pava = isotonicCalibration(train);

const testRaw = test.map((s) => ({ p: s.p, y: s.y }));
const testCir = test.map((s) => ({ p: cir.predict(s.p), y: s.y }));
const testPava = test.map((s) => ({ p: pava.predict(s.p), y: s.y }));

const fmt = (x: number) => x.toFixed(4);
console.log(`n=${samples.length} train=${train.length} test=${test.length}`);
console.log(`base rate (all): ${fmt(samples.reduce((s, r) => s + r.y, 0) / samples.length)}`);
console.log("");
console.log(`HELD-OUT raw:  ECE=${fmt(expectedCalibrationError(testRaw))}  Brier=${fmt(brier(testRaw))}`);
console.log(`HELD-OUT CIR:  ECE=${fmt(expectedCalibrationError(testCir))}  Brier=${fmt(brier(testCir))}`);
console.log(`HELD-OUT PAVA: ECE=${fmt(expectedCalibrationError(testPava))}  Brier=${fmt(brier(testPava))}`);
console.log("");
console.log("Reliability (test, raw) — meanForecast → observedRate (n):");
for (const b of reliabilityCurve(testRaw, 8)) {
  if (b.count > 0) console.log(`  ${fmt(b.meanForecast)} → ${fmt(b.observedRate)}  (${b.count})`);
}

// Same clamped normalization as the overall metrics — never a second path.
const byType = new Map<string, { p: number; y: 0 | 1 }[]>();
for (const [i, r] of rows.entries()) {
  const k = r.pickType ?? "ALL";
  const arr = byType.get(k) ?? [];
  arr.push({ p: samples[i]!.p, y: r.y });
  byType.set(k, arr);
}
console.log("");
console.log("Per-pickType (FULL sample, raw): n, meanForecast, observed, ECE");
for (const [k, arr] of byType) {
  const mf = arr.reduce((s, r) => s + r.p, 0) / arr.length;
  const wr = arr.reduce((s, r) => s + r.y, 0) / arr.length;
  console.log(
    `  ${k}: n=${arr.length} forecast=${fmt(mf)} observed=${fmt(wr)} ECE=${fmt(expectedCalibrationError(arr))}`,
  );
}
