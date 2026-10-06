/**
 * Score exactly one gate: 1910-08858 empirical P(home win | spread bucket).
 * The table is fit on seasons before 2025. The sealed 2025 holdout is the
 * only scored set. The gate file is not modified. ECE is that file's eceProbs.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { eceProbs, brierScore } = await import(
  resolve(root, "packages/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.ts")
);

function rows(path) {
  return readFileSync(resolve(root, path), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function bucket(spread) {
  if (typeof spread !== "number" || !Number.isFinite(spread)) return null;
  const half = Math.round(spread * 2) / 2;
  if (Math.abs(spread - half) > 1e-6) return null;
  return half.toFixed(1);
}

const train = rows("data/gse-dataset/games.jsonl").filter((row) => row.season < 2025 && row.settled === true);
const holdout = rows("data/gse-dataset/holdout.jsonl");
const counts = new Map();
for (const row of train) {
  const key = bucket(row.spread_line);
  if (key === null || typeof row.home_win !== "boolean") continue;
  const cell = counts.get(key) ?? { n: 0, wins: 0 };
  cell.n += 1;
  cell.wins += row.home_win ? 1 : 0;
  counts.set(key, cell);
}

const ps = [];
const ys = [];
let unscored = 0;
for (const row of holdout) {
  const key = bucket(row.spread_line);
  const cell = key === null ? undefined : counts.get(key);
  if (!cell || cell.n < 1 || typeof row.home_win !== "boolean") {
    unscored += 1;
    continue;
  }
  ps.push(cell.wins / cell.n);
  ys.push(row.home_win ? 1 : 0);
}

const ece = eceProbs(ps, ys, 10);
const brier = brierScore(ps, ys);
const passThreshold = 0.02;
const pass = false;
const failReasons = [
  "the written gate wants a locked 2022-2025 holdout; only the sealed 2025 partition was scored, and earlier seasons were left in train",
  ece > passThreshold ? `2025 ECE ${ece} is above 0.02` : `2025 ECE ${ece} is within 0.02, which still does not pass the 2022-2025 gate`,
];
const signMatches = holdout.filter((row) => (row.home_moneyline < 0) === (row.spread_line > 0)).length;

const body = `# Gate 1910-08858, sealed 2025 only

One gate. The module file was not edited. No second gate was scored.

| Field | Value |
|---|---|
| Gate id | 1910-08858 |
| File | packages/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.ts |
| Metric | ECE of empirical P(home win \\| half-point spread), 10 equal-width bins, the module's own \`eceProbs\` |
| Spec window | 2022-2025 locked holdout, ECE <= 0.02 |
| Scored window | sealed 2025 only (285 games). 2022-2024 were not moved into the holdout. |
| Train | seasons strictly before 2025, settled rows in games.jsonl (${train.length} rows, ${counts.size} buckets) |
| Scored games | ${ps.length} |
| Unscored games | ${unscored} |
| ECE | ${ece} |
| Brier | ${brier} |
| Pass threshold | 0.02 on the 2022-2025 window |
| Pass | FAIL |

Spread sign in this dataset: a negative home moneyline matches a positive \`spread_line\` on ${signMatches} of ${holdout.length} holdout rows. The table uses the stored \`spread_line\` as the bucket. It was not flipped into the engine's negative-means-home-favored convention.

FAIL reasons: ${failReasons.join("; ")}

This is not a pick. The +EV half of the same gate was not scored. It needs achievable second-best lines, which are not on the row.
`;

const out = resolve(root, "docs/reasoning/gate-1910-08858-2025.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body);
console.log(JSON.stringify({ ece, brier, scored: ps.length, unscored, pass, buckets: counts.size }, null, 2));
