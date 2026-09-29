/**
 * VENN-DP-STRATIFIED census runner.
 *
 * Reads the read-only JSONL export produced by
 * `scripts/ops/export-venn-stratified-rows.mjs` (Neon `hermes_ro`, SELECT
 * only), scores it with the width census harness, and prints the tables the
 * founder needs to pick a `maxWidthForFire` threshold from OUR rows:
 * Δp deciles, share above 0.20, and the threshold that would veto
 * 5 / 10 / 20 percent of rows — by sport and by book count.
 *
 * Probability field: `independentTrueProb` — the model's own probability for
 * the pick side. It is the field the gate would pin; `rankingP` is a stored
 * sort key whose meaning varies by `rankingSource` (it equals confidence/100
 * on 476 settled published rows, and confidence is a weighted score, not a
 * probability claim); `marketFairProb` is the market, not the model.
 * Rows without a model probability are counted, never scored.
 *
 * Calibration: leave-one-out within sport (see the harness header). Floor:
 * the gate's own MIN_STRATUM_CALIBRATION = 100 (selective-gate.ts), passed
 * explicitly; `--floor` overrides for sensitivity.
 *
 * Run:
 *   npx tsx scripts/ops/measure-venn-stratified.ts --set published
 *   npx tsx scripts/ops/measure-venn-stratified.ts --set all
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  evaluateVennWidths,
  type SettledPickRecord,
  type VennWidthCensusReport,
  type WidthCensusCard,
  type VennWidthDistribution,
} from "../../packages/prediction-engine/src/calibration/venn-width-harness.js";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const inputPath = resolve(arg("--input", "reports/venn-stratified/settled-picks.jsonl"));
const set = arg("--set", "published") as "published" | "all";
const floor = Number(arg("--floor", "100"));

interface ExportedRow {
  readonly rowId: string;
  readonly sport: string | null;
  readonly pickType: string | null;
  readonly bookmakerCount: number | null;
  readonly result: string;
  readonly isPublished: boolean;
  readonly independentTrueProb: number | null;
}

const raw = readFileSync(inputPath, "utf8").trim();
const lines = raw.length === 0 ? [] : raw.split("\n");
const exported: ExportedRow[] = lines.map((l) => JSON.parse(l));

let skippedNonBinary = 0;
let skippedNoSport = 0;
const picks: SettledPickRecord[] = [];
for (const r of exported) {
  if (r.result !== "WIN" && r.result !== "LOSS") {
    skippedNonBinary += 1; // PUSH / VOID — no binary outcome to calibrate on
    continue;
  }
  if (!r.sport) {
    skippedNoSport += 1;
    continue;
  }
  picks.push({
    rowId: r.rowId,
    sport: r.sport,
    bookCount: r.bookmakerCount ?? 0,
    predictedProb: r.independentTrueProb,
    actualOutcome: r.result === "WIN" ? 1 : 0,
    isPublished: r.isPublished,
    market: r.pickType ?? null,
  });
}

const setRows = set === "published" ? picks.filter((p) => p.isPublished) : picks;

const cvap = evaluateVennWidths(setRows, { mode: "cvap", cvapFolds: 5, stratumCalibrationFloor: floor });
const ivap = evaluateVennWidths(setRows, { mode: "ivap", stratumCalibrationFloor: floor });

const f = (x: number, d = 4) => x.toFixed(d);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function distRow(name: string, card: WidthCensusCard, dist: VennWidthDistribution): string {
  return [
    name.padEnd(26),
    String(card.rows).padStart(5),
    String(card.scored).padStart(6),
    String(card.noModelProbability).padStart(8),
    String(card.emptyCalibration).padStart(7),
    f(dist.p10).padStart(8),
    f(dist.p50).padStart(8),
    f(dist.p90).padStart(8),
    f(dist.p95).padStart(8),
    pct(dist.shareAbove020).padStart(9),
    f(dist.thresholdForVeto5Pct).padStart(8),
    f(dist.thresholdForVeto10Pct).padStart(8),
    f(dist.thresholdForVeto20Pct).padStart(8),
  ].join(" | ");
}

const header = [
  "stratum".padEnd(26),
  "rows".padStart(5),
  "scored".padStart(6),
  "noModel".padStart(8),
  "empty".padStart(7),
  "p10".padStart(8),
  "p50".padStart(8),
  "p90".padStart(8),
  "p95".padStart(8),
  "share>.20".padStart(9),
  "veto5".padStart(8),
  "veto10".padStart(8),
  "veto20".padStart(8),
].join(" | ");

function printSection(title: string, report: VennWidthCensusReport, key: "bySport" | "byBookCount" | "bySportMarket" | "bySportBookCount"): void {
  console.log(`\n--- ${title} (${report.mode}, floor=${report.stratumCalibrationFloor}) ---`);
  console.log(header);
  const cards = report[key];
  for (const k of Object.keys(cards)) {
    console.log(distRow(k, cards[k]!, cards[k]!.width));
  }
}

function printCard(label: string, card: WidthCensusCard): void {
  console.log(`\n--- ${label} ---`);
  console.log(header);
  console.log(distRow(card.stratum, card, card.width));
  console.log(
    `    above-floor (n>=${floor}): scoredAboveFloor=${card.scoredAboveFloor}` +
      (card.scoredAboveFloor > 0
        ? ` | p50=${f(card.widthAboveFloor.p50)} p90=${f(card.widthAboveFloor.p90)} veto5=${f(card.widthAboveFloor.thresholdForVeto5Pct)} veto10=${f(card.widthAboveFloor.thresholdForVeto10Pct)} veto20=${f(card.widthAboveFloor.thresholdForVeto20Pct)} share>.20=${pct(card.widthAboveFloor.shareAbove020)}`
        : " | no rows above floor"),
  );
}

console.log(`=== VENN Δp CENSUS — set=${set} floor=${floor} (MIN_STRATUM_CALIBRATION) ===`);
console.log(
  `export rows=${exported.length} | binary WIN/LOSS used=${picks.length} | skipped push/void=${skippedNonBinary} noSport=${skippedNoSport}`,
);
console.log(`set rows=${setRows.length} | probability field=independentTrueProb (rows without it are counted, never scored)`);

printCard("OVERALL (cvap 5-fold)", cvap.overall);
printSection("BY SPORT", cvap, "bySport");
printSection("BY BOOK COUNT", cvap, "byBookCount");
printSection("MLB / ALL SPORTS BY MARKET", cvap, "bySportMarket");
printSection("BY SPORT x BOOK COUNT", cvap, "bySportBookCount");

console.log("\n=== IVAP ROBUSTNESS (overall + by sport) ===");
console.log(header);
console.log(distRow("ALL", ivap.overall, ivap.overall.width));
for (const k of Object.keys(ivap.bySport)) {
  console.log(distRow(k, ivap.bySport[k]!, ivap.bySport[k]!.width));
}

const outPath = resolve(arg("--out", `reports/venn-stratified/census-${set}.json`));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      input: inputPath,
      set,
      floor,
      skipped: { pushVoid: skippedNonBinary, noSport: skippedNoSport },
      probabilityField: "independentTrueProb",
      cvap,
      ivap,
    },
    null,
    2,
  ),
  "utf8",
);
console.log(`\nwrote ${outPath}`);
