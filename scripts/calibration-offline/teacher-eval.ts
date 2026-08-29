/**
 * Empirical-rate teacher convergence test on a real settled-pick export
 * (docs/ops/edge/2026-08-26-paper-spec-rlvr-empirical-rate.md §3a). R&D
 * only — no live effect, no DB access, no secrets.
 *
 * Fits the hierarchical empirical-rate teacher on the train slice (pickType
 * x market-q band, q missing handled as its own band), then scores raw
 * confidence, PAVA(confidence), CIR(confidence), and market q (where
 * recorded) against the teacher and against outcomes on the held-out test
 * slice. If independent forecasters converge on the teacher's held-out
 * Brier, that is affirmative evidence they carry no information beyond
 * state — the Brier-floor diagnosis becomes a positive statement (resolution
 * must come from new covariates, E2) rather than an open question.
 *
 * Input: JSON file with rows [{confidence, y, t, pickType, q}] where q is the
 * de-vigged market fair probability for the pick's side (nullable — not every
 * pick has a receipt). Export via SQL-over-HTTP from a restricted container,
 * same pattern as fit-real-sample.ts:
 *
 *   SELECT p.confidence,
 *          CASE WHEN p.result='WIN' THEN 1 ELSE 0 END AS y,
 *          extract(epoch FROM p."generatedAt")::bigint AS t,
 *          p."pickType",
 *          r."marketFairProb" AS q
 *   FROM picks p
 *   LEFT JOIN pick_proof_receipts r ON r."pickId" = p.id
 *   WHERE p.result IN ('WIN','LOSS') AND p."settledAt" IS NOT NULL
 *     AND p."isBootstrap" = false AND p.confidence IS NOT NULL
 *   ORDER BY p."generatedAt"
 *
 * Usage: npx tsx scripts/calibration-offline/teacher-eval.ts --in <file.json>
 */
import { readFileSync } from "node:fs";
import {
  centeredIsotonicCalibration,
  isotonicCalibration,
  timeHoldoutSplit,
  type TimestampedCalibrationSample,
} from "../../packages/prediction-engine/src/probability-calibration.js";
import {
  fitEmpiricalRateTeacher,
  binIndexFromEdges,
  teacherGapReport,
  type TeacherSample,
  type ForecasterSample,
} from "../../packages/prediction-engine/src/empirical-rate-teacher.js";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : null;
}

const inPath = arg("--in");
if (!inPath) {
  console.error("teacher-eval: --in <file.json> required (rows or {rows:[...]})");
  process.exit(2);
}

type Row = { confidence: number; y: 0 | 1; t: number; pickType: string; q: number | null };
const parsed = JSON.parse(readFileSync(inPath, "utf8")) as unknown;
const rawRows = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown }).rows;
if (!Array.isArray(rawRows) || rawRows.length === 0) {
  console.error("teacher-eval: no rows in input");
  process.exit(2);
}

// Q_BAND_EDGES: the paper-spec's example bands (0.40, 0.50, 0.55, 0.60, 0.65)
// -> 6 bands, plus one reserved "q missing" band at index 6 (cardinality 7).
const Q_BAND_EDGES = [0.4, 0.5, 0.55, 0.6, 0.65];
const Q_MISSING_BAND = Q_BAND_EDGES.length + 1; // 6
const PICK_TYPES = ["MONEYLINE", "SPREAD", "TOTAL"] as const;
const PICK_TYPE_OTHER = PICK_TYPES.length; // 3 — unknown/unlisted pickType

// CONF_BAND_EDGES: a coarse confidence band, added as a SECOND teacher's
// third dimension. The v1 teacher (pickType x qBand only) does not see
// confidence at all, so raw/PAVA/CIR "beating" it only proves they resolve
// finer than a state space that excludes their own input — not that they
// carry information beyond a state teacher that's at least as rich as what
// they see. The v2 teacher below closes that gap.
const CONF_BAND_EDGES = [0.5, 0.6, 0.65, 0.7, 0.75, 0.8];

function pickTypeIndex(pt: string): number {
  const i = PICK_TYPES.indexOf(pt as (typeof PICK_TYPES)[number]);
  return i >= 0 ? i : PICK_TYPE_OTHER;
}
function qBandIndex(q: number | null): number {
  return q === null ? Q_MISSING_BAND : binIndexFromEdges(q, Q_BAND_EDGES);
}
function confBandIndex(p: number): number {
  return binIndexFromEdges(p, CONF_BAND_EDGES);
}

const rows: Row[] = [];
for (const [i, r] of (rawRows as Record<string, unknown>[]).entries()) {
  const confidence = Number(r["confidence"]);
  const y = Number(r["y"]);
  const t = Number(r["t"]);
  const pickType = r["pickType"];
  const qRaw = r["q"];
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    console.error(`teacher-eval: row ${i}: confidence out of [0,100]: ${String(r["confidence"])}`);
    process.exit(2);
  }
  if (y !== 0 && y !== 1) {
    console.error(`teacher-eval: row ${i}: y must be 0 or 1: ${String(r["y"])}`);
    process.exit(2);
  }
  if (!Number.isFinite(t)) {
    console.error(`teacher-eval: row ${i}: non-finite t: ${String(r["t"])}`);
    process.exit(2);
  }
  if (typeof pickType !== "string" || pickType.length === 0) {
    console.error(`teacher-eval: row ${i}: pickType must be a non-empty string: ${String(pickType)}`);
    process.exit(2);
  }
  let q: number | null = null;
  if (qRaw !== null && qRaw !== undefined) {
    const qNum = Number(qRaw);
    if (!Number.isFinite(qNum) || qNum < 0 || qNum > 1) {
      console.error(`teacher-eval: row ${i}: q out of [0,1]: ${String(qRaw)}`);
      process.exit(2);
    }
    q = qNum;
  }
  rows.push({ confidence, y: y as 0 | 1, t, pickType, q });
}

const samples: (TimestampedCalibrationSample & { pickType: string; q: number | null })[] = rows.map((r) => ({
  p: Math.max(0, Math.min(1, r.confidence / 100)),
  y: r.y,
  t: r.t,
  pickType: r.pickType,
  q: r.q,
}));

const { train, test } = timeHoldoutSplit(samples, 0.7);
if (train.length === 0 || test.length === 0) {
  console.error(`teacher-eval: need a non-empty train AND test split (got train=${train.length}, test=${test.length})`);
  process.exit(2);
}

const cir = centeredIsotonicCalibration(train);
const pava = isotonicCalibration(train);

const qCoverage = samples.filter((s) => s.q !== null).length;

const teacherState = fitEmpiricalRateTeacher(
  train.map(
    (s): TeacherSample => ({ y: s.y, bucket: [pickTypeIndex(s.pickType), qBandIndex(s.q)] }),
  ),
  { dims: [{ name: "pickType", cardinality: PICK_TYPE_OTHER + 1 }, { name: "qBand", cardinality: Q_MISSING_BAND + 1 }], pseudocount: 25 },
);
const teacherStateConf = fitEmpiricalRateTeacher(
  train.map(
    (s): TeacherSample => ({
      y: s.y,
      bucket: [pickTypeIndex(s.pickType), qBandIndex(s.q), confBandIndex(s.p)],
    }),
  ),
  {
    dims: [
      { name: "pickType", cardinality: PICK_TYPE_OTHER + 1 },
      { name: "qBand", cardinality: Q_MISSING_BAND + 1 },
      { name: "confBand", cardinality: CONF_BAND_EDGES.length + 1 },
    ],
    pseudocount: 25,
  },
);

function bucketOfState(s: { pickType: string; q: number | null }): readonly number[] {
  return [pickTypeIndex(s.pickType), qBandIndex(s.q)];
}
function bucketOfStateConf(s: { pickType: string; q: number | null; p: number }): readonly number[] {
  return [pickTypeIndex(s.pickType), qBandIndex(s.q), confBandIndex(s.p)];
}

const fmt = (x: number) => x.toFixed(4);

console.log(`n=${samples.length} train=${train.length} test=${test.length}`);
console.log(`q coverage: ${qCoverage}/${samples.length} rows (${fmt(qCoverage / samples.length)})`);
console.log(
  `teacher(pickType x qBand): globalRate=${fmt(teacherState.globalRate)} bucketCount=${teacherState.bucketCount} (of up to ${(PICK_TYPE_OTHER + 1) * (Q_MISSING_BAND + 1)})`,
);
console.log(
  `teacher(pickType x qBand x confBand): globalRate=${fmt(teacherStateConf.globalRate)} bucketCount=${teacherStateConf.bucketCount} (of up to ${(PICK_TYPE_OTHER + 1) * (Q_MISSING_BAND + 1) * (CONF_BAND_EDGES.length + 1)})`,
);
console.log("");

type Forecaster = { name: string; test: ForecasterSample[]; testConf: ForecasterSample[] };
const forecasters: Forecaster[] = [
  {
    name: "raw confidence",
    test: test.map((s) => ({ bucket: bucketOfState(s), y: s.y, p: s.p })),
    testConf: test.map((s) => ({ bucket: bucketOfStateConf(s), y: s.y, p: s.p })),
  },
  {
    name: "PAVA(confidence)",
    test: test.map((s) => ({ bucket: bucketOfState(s), y: s.y, p: pava.predict(s.p) })),
    testConf: test.map((s) => ({ bucket: bucketOfStateConf(s), y: s.y, p: pava.predict(s.p) })),
  },
  {
    name: "CIR(confidence)",
    test: test.map((s) => ({ bucket: bucketOfState(s), y: s.y, p: cir.predict(s.p) })),
    testConf: test.map((s) => ({ bucket: bucketOfStateConf(s), y: s.y, p: cir.predict(s.p) })),
  },
  {
    name: "market q",
    test: test.filter((s) => s.q !== null).map((s) => ({ bucket: bucketOfState(s), y: s.y, p: s.q! })),
    testConf: test.filter((s) => s.q !== null).map((s) => ({ bucket: bucketOfStateConf(s), y: s.y, p: s.q! })),
  },
];

function printTable(label: string, key: "test" | "testConf", teacher: typeof teacherState) {
  console.log(`${label} — held-out test slice, each forecaster vs the (train-fit) teacher:`);
  console.log("forecaster            n      forecasterBrier  teacherBrier(same rows)  meanAbsGap");
  for (const f of forecasters) {
    const rows = f[key];
    if (rows.length === 0) {
      console.log(`${f.name.padEnd(20)}   (no rows with this forecaster available)`);
      continue;
    }
    const report = teacherGapReport(rows, teacher);
    console.log(
      `${f.name.padEnd(20)}   ${String(report.sampleSize).padStart(4)}   ${fmt(report.forecasterBrier).padStart(8)}          ${fmt(report.teacherBrier).padStart(8)}                ${fmt(report.meanAbsGap)}`,
    );
  }
  console.log("");
}

printTable("CONVERGENCE TEST v1 (state = pickType x qBand, confidence NOT in state)", "test", teacherState);
printTable("CONVERGENCE TEST v2 (state = pickType x qBand x confBand, confidence IS in state)", "testConf", teacherStateConf);

console.log("Reading: v1's teacher does not see confidence at all, so PAVA/CIR beating it only");
console.log("proves they resolve finer than a state space that excludes their own input — not");
console.log("that they carry information beyond a fair comparison. v2's teacher already knows");
console.log("each row's confidence band, so it is the correct apples-to-apples test: if PAVA/CIR");
console.log("still sit meaningfully BELOW v2's teacherBrier, that is real evidence of information");
console.log("beyond simple binning (worth chasing); converging with v2 confirms the Brier floor");
console.log("is the ceiling of {pickType, market band, confidence band}, not a fixable modeling gap.");
