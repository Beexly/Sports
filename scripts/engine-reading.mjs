/**
 * Week-3 engine readings. The tilt is a home-positive mix of the families
 * that have a number. It is not a win probability and it is not a pick.
 * OpenRouter is called only when OPENROUTER_API_KEY is set.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { composeEngineReading, ENGINE_FAMILIES, assertPriorsSumToOne } from "../packages/prediction-engine/src/reasoning/engine-weights.ts";

const root = resolve(process.cwd());
assertPriorsSumToOne();

const contexts = readFileSync(resolve(root, "data/gse-dataset/current/week3-context.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const games = new Map(
  readFileSync(resolve(root, "data/gse-dataset/games.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((game) => [game.game_id, game]),
);
const calibration = JSON.parse(readFileSync(resolve(root, "data/gse-dataset/current/calibration-weights.json"), "utf8"));
const elo = new Map(calibration.game_probability.week3.map((row) => [row.game_id, row.probability]));
const split = new Map(
  readFileSync(resolve(root, "data/gse-dataset/current/week3-split-efficiency.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((row) => [row.game_id, row]),
);

function clip(value) {
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

function diff(home, away) {
  if (typeof home !== "number" || typeof away !== "number") return null;
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return clip(home - away);
}

const readings = [];
for (const context of contexts) {
  const game = games.get(context.game_id);
  const homeScheme = context.home.scheme_prior_weeks;
  const awayScheme = context.away.scheme_prior_weeks;
  const scheme = diff(
    (homeScheme.motion_rate + homeScheme.play_action_rate + homeScheme.rpo_rate + homeScheme.shotgun_rate) / 4,
    (awayScheme.motion_rate + awayScheme.play_action_rate + awayScheme.rpo_rate + awayScheme.shotgun_rate) / 4,
  );
  const splitRow = split.get(context.game_id);
  const efficiency = splitRow ? splitRow.efficiency_signed : null;
  const availability = clip((context.away.injuries.out.length - context.home.injuries.out.length) / 6);
  const rest = game && typeof game.rest_diff === "number" ? clip(game.rest_diff / 7) : null;
  const strength = elo.has(context.game_id) ? clip((elo.get(context.game_id) - 0.5) * 2) : null;
  const reading = composeEngineReading(context.game_id, {
    on_field_efficiency: efficiency,
    scheme_play_design: scheme,
    availability,
    schedule_and_body: rest,
    historical_strength: strength,
  });
  if (reading.publishesPick !== false || reading.tiltIsProbability !== false) {
    throw new Error("engine reading leaked a pick or a probability");
  }
  readings.push({
    game_id: context.game_id,
    away_team: context.away_team,
    home_team: context.home_team,
    gameday: context.gameday,
    referee: game ? game.referee : null,
    roof: game ? game.roof : null,
    surface: game ? game.surface : null,
    rest_diff: game ? game.rest_diff : null,
    elo: elo.get(context.game_id) ?? null,
    market_devig_is_context_only: true,
    tilt: reading.tilt,
    tilt_is_probability: false,
    publishes_pick: false,
    coverage: reading.coverage,
    dark_share: reading.darkShare,
    withheld_share: reading.withheldShare,
    meter_share: reading.meterShare,
    used: reading.used,
    dark: reading.dark,
    calibration_status: "WATCH",
    model_lane: process.env.OPENROUTER_API_KEY ? "openrouter_key_present" : "openrouter_unconfigured",
  });
}

const outJson = resolve(root, "data/gse-dataset/current/week3-engine-readings.jsonl");
writeFileSync(outJson, readings.map((row) => JSON.stringify(row)).join("\n") + "\n");

const dark = ENGINE_FAMILIES.filter((family) => family.role === "dark");
const lines = [
  "# Engine readings, week 3",
  "",
  "The tilt is home-positive and unitless. It is not a win probability. Nothing here is a pick.",
  "On-field efficiency is no longer raw passing EPA. It is a shrunk opponent-adjusted blend: 55% pass EPA residual, 15% rush EPA residual, 15% CPOE, 10% explosive-pass rate, 5% interception luck. The 2025 season is the prior. 2026 weeks 1-2 are the observation. Passing is weighted above rushing because rushing efficiency does not carry the same way.",
  "Brier, Kelly, Bradley-Terry, and the closing price do not enter the tilt. The price is withheld on purpose. The meters stay a governor. Calibration on the Elo is still WATCH.",
  `OpenRouter lane: ${readings[0].model_lane}. No model call was made.`,
  "",
  "Priors:",
  "",
  "| family | prior | role |",
  "|---|---:|---|",
  ...ENGINE_FAMILIES.map((family) => `| ${family.id} | ${family.prior.toFixed(2)} | ${family.role} |`),
  "",
  `Dark share by design: ${dark.reduce((sum, family) => sum + family.prior, 0).toFixed(2)}. Those families are named so they are not forgotten. They contribute nothing until a row exists.`,
  "",
  "| game | tilt | coverage | dark | rest | roof | referee |",
  "|---|---:|---:|---:|---:|---|---|",
];
for (const row of readings) {
  lines.push(
    `| ${row.away_team} at ${row.home_team} | ${row.tilt === null ? "" : row.tilt.toFixed(3)} | ${row.coverage.toFixed(2)} | ${row.dark_share.toFixed(2)} | ${row.rest_diff ?? ""} | ${row.roof ?? ""} | ${row.referee ?? ""} |`,
  );
}
lines.push("");
writeFileSync(resolve(root, "docs/reasoning/week3-engine-readings.md"), lines.join("\n"));

const coverage = readings.map((row) => row.coverage);
console.log(JSON.stringify({
  games: readings.length,
  coverage_min: Math.min(...coverage),
  coverage_max: Math.max(...coverage),
  dark: readings[0].dark,
  model_lane: readings[0].model_lane,
  sample: readings.find((row) => row.game_id === "2026_03_LAC_BUF"),
}, null, 2));
