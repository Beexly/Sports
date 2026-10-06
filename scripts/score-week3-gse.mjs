/**
 * Run the real GSE action-score bridge on week 3.
 * Model vote is the walk-forward Elo. Market is the devigged moneyline.
 * Calibration numbers are the measured 2015–2025 contract, not a label typed by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { evalGseActionScore } from "../packages/ingestion-pipeline/src/gse-score-bridge.ts";

const root = resolve(process.cwd());
const calibration = JSON.parse(readFileSync(resolve(root, "data/gse-dataset/current/calibration-weights.json"), "utf8"));
const games = readFileSync(resolve(root, "data/gse-dataset/games.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
const contexts = readFileSync(resolve(root, "data/gse-dataset/current/week3-context.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
const elo = new Map(calibration.game_probability.week3.map((row) => [row.game_id, row.probability]));
const gameById = new Map(games.map((game) => [game.game_id, game]));
const weights = calibration.fantasy.position_weight_from_2025_inverse_mae ?? calibration.position_weight_from_2025_inverse_mae;

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function devig(game) {
  const raw = (ml) => {
    if (typeof ml !== "number" || !Number.isFinite(ml) || ml === 0) return null;
    return ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100);
  };
  const home = raw(game.home_moneyline);
  const away = raw(game.away_moneyline);
  if (home === null || away === null || home + away <= 0) return null;
  const p = home / (home + away);
  return p > 0 && p < 1 ? p : null;
}

const gameProb = calibration.game_probability;
const confidence = Math.min(1, Math.max(0.01, 1 - gameProb.ece_10bin));
const lines = [
  "# Week 3 GSE scores",
  "",
  `Calibration fed to the contract: n=${gameProb.sample_count}, ECE=${gameProb.ece_10bin.toFixed(4)}, Brier=${gameProb.brier_2015_2025.toFixed(4)}, baseline=${gameProb.market_baseline_brier_2015_2025.toFixed(4)}, drift=${gameProb.drift_abs_2025_minus_prior.toFixed(4)}.`,
  "The score is an action-quality number from 0 to 100. It is not a win probability. publishablePick stays false.",
  "",
  "| game | elo | market | score | decision | calibration | edge |",
  "|---|---|---|---|---|---|---|",
];
const rows = [];
for (const context of contexts) {
  const game = gameById.get(context.game_id);
  const market = devig(game);
  const model = elo.get(context.game_id);
  if (market === null || model === undefined) {
    lines.push(`| ${context.away_team} at ${context.home_team} | | | | refused | | |`);
    continue;
  }
  const marketRounded = round4(market);
  const modelRounded = round4(model);
  const result = evalGseActionScore({
    marketProbability: marketRounded,
    modelParliament: {
      maxDisagreement: 0.08,
      votes: [{
        modelId: "elo-hfa48",
        probability: modelRounded,
        confidence,
        evidenceWeight: gameProb.sample_count,
        stale: false,
      }],
    },
    featureContract: {
      maxAgeMinutes: 1440,
      features: [
        { key: "home_pass_epa", value: context.home.passing_epa_per_attempt_prior_weeks ?? 0, quality: context.home.pass_attempts_prior_weeks >= 40 ? 1 : 0.5, ageMinutes: 720, sourcePolicy: { sourceId: "nflverse-stats-team-week", status: "allowed", allowedForModeling: true } },
        { key: "away_pass_epa", value: context.away.passing_epa_per_attempt_prior_weeks ?? 0, quality: context.away.pass_attempts_prior_weeks >= 40 ? 1 : 0.5, ageMinutes: 720, sourcePolicy: { sourceId: "nflverse-stats-team-week", status: "allowed", allowedForModeling: true } },
        { key: "home_out", value: context.home.injuries.out.length, quality: 1, ageMinutes: 720, sourcePolicy: { sourceId: "nflverse-injuries", status: "allowed", allowedForModeling: true } },
        { key: "away_out", value: context.away.injuries.out.length, quality: 1, ageMinutes: 720, sourcePolicy: { sourceId: "nflverse-injuries", status: "allowed", allowedForModeling: true } },
      ],
    },
    calibration: {
      sampleCount: gameProb.sample_count,
      expectedCalibrationError: gameProb.ece_10bin,
      brierScore: gameProb.brier_2015_2025,
      baselineBrierScore: gameProb.market_baseline_brier_2015_2025,
      driftScore: gameProb.drift_abs_2025_minus_prior,
    },
  });
  if (!result.ok) {
    lines.push(`| ${context.away_team} at ${context.home_team} | ${modelRounded.toFixed(3)} | ${marketRounded.toFixed(3)} | | refused | ${result.reason} | |`);
    continue;
  }
  const data = result.data;
  rows.push(data);
  lines.push(`| ${context.away_team} at ${context.home_team} | ${modelRounded.toFixed(3)} | ${marketRounded.toFixed(3)} | ${data.score.toFixed(1)} | ${data.kernelDecision} | ${data.calibrationStatus} | ${(data.probabilityEdge).toFixed(3)} |`);
}
lines.push("");
lines.push(`Position weights from 2025 half-PPR inverse MAE: ${JSON.stringify(weights)}.`);
lines.push(`Scored ${rows.length} games. publishablePick true count: ${rows.filter((row) => row.publishablePick !== false).length}.`);
writeFileSync(resolve(root, "docs/reasoning/week3-gse-scores.md"), lines.join("\n") + "\n");
const statuses = {};
for (const row of rows) statuses[row.calibrationStatus] = (statuses[row.calibrationStatus] ?? 0) + 1;
console.log(JSON.stringify({ scored: rows.length, statuses, sample: rows[0] && { score: rows[0].score, decision: rows[0].kernelDecision, calibration: rows[0].calibrationStatus, edge: rows[0].probabilityEdge, pick: rows[0].publishablePick } }, null, 2));
