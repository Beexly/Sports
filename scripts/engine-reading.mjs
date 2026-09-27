/**
 * Week-3 engine edge. The edge is the weighted composite of the live
 * signals. It is home-positive. It is not a win probability.
 * OpenRouter is called only when OPENROUTER_API_KEY is set.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { composeEngineReading, ENGINE_FAMILIES, assertPriorsSumToOne } from "../packages/prediction-engine/src/reasoning/engine-weights.ts";
import { readingConclusion, week3CandidateDecisions } from "../packages/prediction-engine/src/reasoning/part-selector.ts";

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
const airwave = new Map(
  readFileSync(resolve(root, "data/gse-dataset/current/airwave-edges.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((row) => [row.game_id, row.airwave_signed]),
);
const situational = new Map(
  readFileSync(resolve(root, "data/gse-dataset/current/week3-situational.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((row) => [row.game_id, row]),
);
const ngs = new Map(
  readFileSync(resolve(root, "data/gse-dataset/current/week3-ngs-st-pace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((row) => [row.game_id, row]),
);
const envCal = JSON.parse(readFileSync(resolve(root, "data/gse-dataset/current/environment-calibration.json"), "utf8"));
const REST_SLOPE = envCal.rest_days_to_margin.used_slope;
const MARGIN_SCALE = 14;
const split = new Map(
  readFileSync(resolve(root, "data/gse-dataset/current/week3-split-efficiency.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((row) => [row.game_id, row]),
);
const driveStart = new Map(
  readFileSync(resolve(root, "data/gse-dataset/current/week3-drive-start.jsonl"), "utf8")
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

const registryRows = readFileSync(resolve(root, "data/reasoning/parts-registry.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const representatives = registryRows.map((row) => row.family);
const rationale = new Map(registryRows.map((row) => [row.family, row.rationale]));

const readings = [];
for (const context of contexts) {
  const game = games.get(context.game_id);
  const homeScheme = context.home.scheme_prior_weeks;
  const awayScheme = context.away.scheme_prior_weeks;
  const schemeBase = diff(
    (homeScheme.motion_rate + homeScheme.play_action_rate + homeScheme.rpo_rate + homeScheme.shotgun_rate) / 4,
    (awayScheme.motion_rate + awayScheme.play_action_rate + awayScheme.rpo_rate + awayScheme.shotgun_rate) / 4,
  );
  const driveRow = driveStart.get(context.game_id);
  const driveHelper = driveRow && typeof driveRow.helper_signed === "number" ? driveRow.helper_signed : null;
  const scheme = (() => {
    if (typeof schemeBase === "number" && typeof driveHelper === "number") {
      return clip(schemeBase + 0.15 * driveHelper);
    }
    return schemeBase;
  })();
  const splitRow = split.get(context.game_id);
  const ngsRow = ngs.get(context.game_id);
  const ngsHelper = ngsRow && typeof ngsRow.ngs_st_signed === "number" ? ngsRow.ngs_st_signed : null;
  const efficiency = (() => {
    const base = splitRow ? splitRow.efficiency_signed : null;
    if (typeof base === "number" && typeof ngsHelper === "number") {
      return clip(base + 0.15 * ngsHelper);
    }
    return typeof base === "number" ? base : null;
  })();
  const availability = clip((context.away.injuries.out.length - context.home.injuries.out.length) / 6);
  const rest = game && typeof game.rest_diff === "number" ? clip((game.rest_diff * REST_SLOPE) / MARGIN_SCALE) : null;
  const strength = elo.has(context.game_id) ? clip((elo.get(context.game_id) - 0.5) * 2) : null;
  const situation = situational.get(context.game_id);
  const refereeName = game && game.referee ? game.referee : null;
  const partDecisions = week3CandidateDecisions(Boolean(refereeName), representatives);
  const officialsDecision = partDecisions.find((decision) => decision.family === "officials");
  const crew = refereeName && envCal.referees[refereeName] ? envCal.referees[refereeName] : null;
  const officialsMeasured = crew && crew.home_margin_used ? clip(crew.home_margin_used / MARGIN_SCALE) : null;
  const officials = officialsDecision && officialsDecision.status === "LIVE" ? officialsMeasured : null;
  function qbDisrupted(side) {
    const qb = side.quarterback || "";
    const lead = (side.qb_snap_leader_prior_weeks || {}).player || "";
    const out = (side.injuries.out || []).some((item) => qb && item.toLowerCase().includes(qb.toLowerCase().split(" (")[0]));
    if (out) return 1;
    if (qb && lead && qb !== lead) return 1;
    return 0;
  }
  const chemistry = clip(qbDisrupted(context.away) - qbDisrupted(context.home));
  const reading = composeEngineReading(context.game_id, {
    on_field_efficiency: efficiency,
    scheme_play_design: scheme,
    availability,
    schedule_and_body: rest,
    historical_strength: strength,
    trench_personnel: situation ? situation.trench_signed : null,
    coaching: situation ? situation.coaching_signed : null,
    airwave: airwave.has(context.game_id) ? airwave.get(context.game_id) : null,
    officials,
    chemistry,
  });
  if (reading.engineEdge.value !== null) {
    const partSum = reading.engineEdge.parts.reduce((sum, part) => sum + part.points, 0);
    if (Math.abs(partSum - reading.engineEdge.value) > 1e-9) {
      throw new Error(`edge parts do not sum for ${context.game_id}`);
    }
    if (Math.abs(reading.engineEdge.value) - reading.coverage > 1e-9) {
      throw new Error(`edge was rescaled above coverage for ${context.game_id}`);
    }
  }
  readings.push({
    game_id: context.game_id,
    away_team: context.away_team,
    home_team: context.home_team,
    gameday: context.gameday,
    referee: game ? game.referee : null,
    part_decisions: partDecisions,
    officials_measured_signed: officialsMeasured,
    roof: game ? game.roof : null,
    surface: game ? game.surface : null,
    rest_diff: game ? game.rest_diff : null,
    ngs_helper_signed: ngsHelper,
    ngs_helper_role: "informs on_field_efficiency by at most 0.15. not the deciding factor. nflverse summary tables only. no raw tracking. no PFF. no SIS.",
    drive_start_helper_signed: driveHelper,
    drive_start_r_2025: 0.186,
    elo: elo.get(context.game_id) ?? null,
    market_devig_is_context_only: true,
    engine_edge: reading.engineEdge.value,
    engine_edge_parts: reading.engineEdge.parts,
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

const buf = readings.find((row) => row.game_id === "2026_03_LAC_BUF");
const partLines = [
  "",
  "LAC at BUF, the edge taken apart. The parts sum to the edge.",
  "",
  "| signal | signed | points in the edge |",
  "|---|---:|---:|",
  ...buf.engine_edge_parts.map((part) => `| ${part.id} | ${part.signed.toFixed(3)} | ${part.points.toFixed(3)} |`),
  "",
];
const dark = ENGINE_FAMILIES.filter((family) => family.role === "dark");
const lines = [
  "# Engine edge, week 3",
  "",
  "The edge is the sum of prior times signal across the whole table. A dark family adds zero and the live families are not scaled up to hide it. The price is context. Brier, Kelly, and Bradley-Terry are meters.",
  "Candidates pass through selectPart in packages/prediction-engine/src/reasoning/part-selector.ts. The eight families already in the sum are live-edge-registry.ts. Officials is dark on the 2025 holdout, including games that have a referee name.",
  "On-field efficiency is a shrunk opponent-adjusted blend: 55% pass EPA residual, 15% rush EPA residual, 15% CPOE, 10% explosive-pass rate, 5% interception luck. The 2025 season is the prior. 2026 weeks 1-2 are the observation.",
  "Airwave is in the edge at a prior of 0.05. It is the questionable and doubtful skill wire, not a second copy of the out list. SiriusXM audio was not captured.",
  `OpenRouter lane: ${readings[0].model_lane}. No model call was made.`,
  "",
  "Priors:",
  "",
  "| family | prior | role |",
  "|---|---:|---|",
  ...ENGINE_FAMILIES.map((family) => `| ${family.id} | ${family.prior.toFixed(2)} | ${family.role} |`),
  "",
  `Dark share by design: ${dark.reduce((sum, family) => sum + family.prior, 0).toFixed(2)}. Those families are named so they are not forgotten. A dark coefficient stays zero. A missing row is not filled with a guess.`,
  "",
  "| game | edge | coverage | dark | rest | roof | referee |",
  "|---|---:|---:|---:|---:|---|---|",
];
for (const row of readings) {
  lines.push(
    `| ${row.away_team} at ${row.home_team} | ${row.tilt === null ? "" : row.tilt.toFixed(3)} | ${row.coverage.toFixed(2)} | ${row.dark_share.toFixed(2)} | ${row.rest_diff ?? ""} | ${row.roof ?? ""} | ${row.referee ?? ""} |`,
  );
}
lines.push("");
lines.push(...partLines);
writeFileSync(resolve(root, "docs/reasoning/week3-engine-readings.md"), lines.join("\n"));

const lac = readings.find((row) => row.game_id === "2026_03_LAC_BUF");
const lacConclusion = readingConclusion(lac.game_id, lac.engine_edge_parts.length, lac.part_decisions, lac.engine_edge);
const ledger = [
  "# Week 3 part ledger",
  "",
  lacConclusion,
  "",
  "The eight registry families are LIVE when this game has a number in the sum. The four candidates are the closed roster in part-selector.ts. STORED means a cleared fit with no row for that game. None of the four candidates cleared. Officials stays DARK when a referee is named, because the 2025 holdout slope is inside one standard error.",
  "",
  "publishes_pick is false. The trace sees the LIVE parts. Its confidence is not a win probability.",
  "",
  "| game_id | family | state | winning_term | reason |",
  "|---|---|---|---|---|",
];
const storedRows = [];
const darkRows = [];
for (const row of readings) {
  const present = new Map(row.engine_edge_parts.map((part) => [part.id, part]));
  for (const family of representatives) {
    const part = present.get(family);
    if (part) {
      ledger.push(`| ${row.game_id} | ${family} | LIVE | none | ${rationale.get(family)} signed ${part.signed} points ${part.points}. |`);
    } else {
      const reason = "representative stays locked. This game has no numeric value, so the contribution is zero. That is not a stored fit";
      ledger.push(`| ${row.game_id} | ${family} | LIVE | none | ${reason} |`);
    }
  }
  for (const decision of row.part_decisions) {
    ledger.push(`| ${row.game_id} | ${decision.family} | ${decision.status} | ${decision.winning_term} | ${decision.why} |`);
    if (decision.status === "STORED") {
      storedRows.push({
        game_id: row.game_id,
        family: decision.family,
        state: decision.status,
        winning_term: decision.winning_term,
        reason: decision.why,
        reactivates_when: decision.reactivates_when,
      });
    }
    if (decision.status === "DARK") {
      darkRows.push({
        game_id: row.game_id,
        family: decision.family,
        state: decision.status,
        winning_term: decision.winning_term,
        failing_objective: decision.winning_term,
        reason: decision.why,
        reactivates_when: decision.reactivates_when,
      });
    }
  }
}
writeFileSync(resolve(root, "docs/reasoning/week3-parts.md"), ledger.join("\n") + "\n");
writeFileSync(
  resolve(root, "data/reasoning/stored-candidates.jsonl"),
  storedRows.map((row) => JSON.stringify(row)).join("\n") + (storedRows.length ? "\n" : ""),
);
writeFileSync(
  resolve(root, "data/reasoning/dark-candidates.jsonl"),
  darkRows.map((row) => JSON.stringify(row)).join("\n") + "\n",
);

const coverage = readings.map((row) => row.coverage);
console.log(JSON.stringify({
  games: readings.length,
  coverage_min: Math.min(...coverage),
  coverage_max: Math.max(...coverage),
  dark: readings[0].dark,
  model_lane: readings[0].model_lane,
  sample: readings.find((row) => row.game_id === "2026_03_LAC_BUF"),
}, null, 2));
