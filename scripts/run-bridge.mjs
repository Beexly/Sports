/**
 * Fit the pregame logistic bridge on seasons before 2025 and score the
 * sealed 2025 holdout. Outcomes from 2025 are not used in the fit.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { fitBridge, predictBridge } = await import(
  resolve(root, "packages/prediction-engine/src/bridge/bridge-model.ts")
);

function rows(path) {
  return readFileSync(resolve(root, path), "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
}

function featuresOf(row) {
  const need = [
    "home_margin_avg", "away_margin_avg", "home_pts_scored_avg", "away_pts_scored_avg",
    "home_pts_allowed_avg", "away_pts_allowed_avg", "home_opp_adj_pts_scored", "away_opp_adj_pts_scored",
    "home_opp_adj_pts_allowed", "away_opp_adj_pts_allowed", "rest_diff",
  ];
  for (const key of need) {
    if (typeof row[key] !== "number" || !Number.isFinite(row[key])) return null;
  }
  if (typeof row.home_games_prior !== "number" || row.home_games_prior < 1) return null;
  if (typeof row.away_games_prior !== "number" || row.away_games_prior < 1) return null;
  return {
    margin_diff: row.home_margin_avg - row.away_margin_avg,
    scored_diff: row.home_pts_scored_avg - row.away_pts_scored_avg,
    allowed_diff: row.away_pts_allowed_avg - row.home_pts_allowed_avg,
    opp_scored_diff: row.home_opp_adj_pts_scored - row.away_opp_adj_pts_scored,
    opp_allowed_diff: row.away_opp_adj_pts_allowed - row.home_opp_adj_pts_allowed,
    rest_diff: row.rest_diff,
    dome: row.is_dome ? 1 : 0,
    neutral: row.neutral_site ? 1 : 0,
  };
}

const features = rows("data/gse-dataset/features.jsonl");
const holdoutIds = new Set(rows("data/gse-dataset/holdout.jsonl").map((row) => row.game_id));
const train = [];
const refusals = {};
function bump(reason) { refusals[reason] = (refusals[reason] ?? 0) + 1; }

for (const row of features) {
  if (row.season >= 2025) continue;
  const vector = featuresOf(row);
  if (!vector) { bump("train missing a prior feature"); continue; }
  if (typeof row.home_win !== "boolean") { bump("train missing home_win"); continue; }
  train.push({ features: vector, homeWin: row.home_win });
}

const fit = fitBridge(train);
if (!fit.ok) {
  console.log(JSON.stringify({ fit: fit.reason, train: train.length, refusals }, null, 2));
  process.exit(1);
}

const emitted = [];
let holdoutRefused = 0;
for (const row of features) {
  if (!holdoutIds.has(row.game_id)) continue;
  const vector = featuresOf(row);
  if (!vector) { holdoutRefused += 1; bump("holdout missing a prior feature"); continue; }
  const predicted = predictBridge(fit.data, vector);
  if (!predicted.ok) { holdoutRefused += 1; bump(predicted.reason); continue; }
  emitted.push({
    game_id: row.game_id,
    signal_id: "pregame_context_logit",
    outcome: predicted.data.outcome,
    probability: predicted.data.probability,
    sample_count: predicted.data.sampleCount,
    method: predicted.data.method,
    home_sign: predicted.data.homeSign,
  });
}

let brier = 0;
for (const row of emitted) {
  const source = features.find((item) => item.game_id === row.game_id);
  const y = source.home_win ? 1 : 0;
  brier += (row.probability - y) ** 2;
  if (!(row.probability > 0 && row.probability < 1)) throw new Error("probability escaped (0, 1)");
  if (!Number.isInteger(row.sample_count) || row.sample_count < 1) throw new Error("sample count is not a positive integer");
  for (const sign of Object.values(row.home_sign)) {
    if (sign !== -1 && sign !== 0 && sign !== 1) throw new Error("homeSign escaped");
  }
}
brier /= emitted.length;

const out = resolve(root, "data/gse-dataset/bridge-premises.jsonl");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, emitted.map((row) => JSON.stringify(row)).join("\n") + "\n");
const report = {
  trainRows: fit.data.sampleCount,
  emitted: emitted.length,
  holdoutRefused,
  refusals,
  brier,
  homeSign: fit.data.homeSign,
  coefficients: fit.data.coefficients,
};
writeFileSync(resolve(root, "docs/reasoning/bridge-fit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
