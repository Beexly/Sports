import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fitBridge, predictBridge } from "../packages/prediction-engine/src/bridge/bridge-model.ts";
import { traceHoldoutGame } from "../packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts";

const root = resolve(process.cwd());
const WINDOW = 8;

function mean(values) {
  if (values.length === 0) return null;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function trailingMean(source, end, window) {
  return mean(source.slice(Math.max(0, end - window), end));
}

export function buildFeatures(games) {
  const ordered = [...games].sort((a, b) => (a.gameday < b.gameday ? -1 : a.gameday > b.gameday ? 1 : a.game_id < b.game_id ? -1 : 1));
  const appearances = [];
  const byTeam = new Map();
  const indexByTeamGame = new Map();
  const key = (team, gameId) => `${team}\0${gameId}`;
  const add = (ap) => {
    indexByTeamGame.set(key(ap.team, ap.gameId), appearances.length);
    appearances.push(ap);
    const list = byTeam.get(ap.team);
    if (list === undefined) byTeam.set(ap.team, [ap]);
    else list.push(ap);
  };
  for (const game of ordered) {
    if (!game.settled || game.away_score === null || game.home_score === null) continue;
    const margin = game.margin ?? game.home_score - game.away_score;
    add({ team: game.home_team, opponent: game.away_team, gameId: game.game_id, gameday: game.gameday, phase: game.season_phase, scored: game.home_score, allowed: game.away_score, margin });
    add({ team: game.away_team, opponent: game.home_team, gameId: game.game_id, gameday: game.gameday, phase: game.season_phase, scored: game.away_score, allowed: game.home_score, margin: -margin });
  }
  const baselineOf = new Map();
  for (const [team, list] of byTeam) {
    let k = 0;
    for (let i = 0; i < list.length; i++) {
      const ap = list[i];
      while (k < list.length && list[k].gameday < ap.gameday) k++;
      const prior = list.slice(0, k);
      baselineOf.set(indexByTeamGame.get(key(team, ap.gameId)), {
        scored: trailingMean(prior.map((p) => p.scored), k, WINDOW),
        allowed: trailingMean(prior.map((p) => p.allowed), k, WINDOW),
        margin: trailingMean(prior.map((p) => p.margin), k, WINDOW),
        n: prior.length,
      });
    }
  }
  const baselineAt = (team, gameday) => {
    const list = byTeam.get(team);
    if (list === undefined) return undefined;
    let k = 0;
    while (k < list.length && list[k].gameday < gameday) k++;
    const prior = list.slice(0, k);
    return {
      scored: trailingMean(prior.map((p) => p.scored), k, WINDOW),
      allowed: trailingMean(prior.map((p) => p.allowed), k, WINDOW),
      margin: trailingMean(prior.map((p) => p.margin), k, WINDOW),
      n: prior.length,
    };
  };
  const opponentTerm = (team, gameday, field) => {
    const list = byTeam.get(team);
    if (list === undefined) return null;
    const k = list.filter((p) => p.gameday < gameday).length;
    const prior = list.slice(Math.max(0, k - WINDOW), k);
    const terms = [];
    for (const p of prior) {
      const base = baselineOf.get(indexByTeamGame.get(key(p.opponent, p.gameId)));
      if (base && base[field] !== null && base[field] !== undefined) terms.push(base[field]);
    }
    return mean(terms);
  };
  const sub = (value, adj) => (value === null || value === undefined || adj === null ? null : value - adj);
  return ordered.map((game) => {
    const homeIndex = indexByTeamGame.get(key(game.home_team, game.game_id));
    const awayIndex = indexByTeamGame.get(key(game.away_team, game.game_id));
    const homeBase = homeIndex === undefined ? baselineAt(game.home_team, game.gameday) : baselineOf.get(homeIndex);
    const awayBase = awayIndex === undefined ? baselineAt(game.away_team, game.gameday) : baselineOf.get(awayIndex);
    return {
      ...game,
      home_games_prior: homeBase?.n ?? 0,
      away_games_prior: awayBase?.n ?? 0,
      home_pts_scored_avg: homeBase?.scored ?? null,
      home_pts_allowed_avg: homeBase?.allowed ?? null,
      home_margin_avg: homeBase?.margin ?? null,
      away_pts_scored_avg: awayBase?.scored ?? null,
      away_pts_allowed_avg: awayBase?.allowed ?? null,
      away_margin_avg: awayBase?.margin ?? null,
      home_opp_adj_pts_scored: sub(homeBase?.scored ?? null, opponentTerm(game.home_team, game.gameday, "allowed")),
      home_opp_adj_pts_allowed: sub(homeBase?.allowed ?? null, opponentTerm(game.home_team, game.gameday, "scored")),
      away_opp_adj_pts_scored: sub(awayBase?.scored ?? null, opponentTerm(game.away_team, game.gameday, "allowed")),
      away_opp_adj_pts_allowed: sub(awayBase?.allowed ?? null, opponentTerm(game.away_team, game.gameday, "scored")),
    };
  });
}

function readJsonl(path) {
  return readFileSync(resolve(root, path), "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
}

function americanToRaw(ml) {
  if (typeof ml !== "number" || !Number.isFinite(ml) || ml === 0) return null;
  return ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100);
}

export function featuresOf(row) {
  const need = [
    "home_margin_avg", "away_margin_avg", "home_pts_scored_avg", "away_pts_scored_avg",
    "home_pts_allowed_avg", "away_pts_allowed_avg", "home_opp_adj_pts_scored", "away_opp_adj_pts_scored",
    "home_opp_adj_pts_allowed", "away_opp_adj_pts_allowed", "rest_diff",
  ];
  for (const key of need) {
    if (typeof row[key] !== "number" || !Number.isFinite(row[key])) return null;
  }
  if (row.home_games_prior < 1 || row.away_games_prior < 1) return null;
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

const runningWeek3 = process.argv[1]?.includes("week3");
if (runningWeek3) {
const builtFeatures = buildFeatures(games);
const schedule = new Map(games.map((row) => [row.game_id, row]));
const train = [];
for (const row of builtFeatures) {
  if (row.season >= 2026 || row.home_win === null) continue;
  const vector = featuresOf(row);
  if (!vector) continue;
  train.push({ features: vector, homeWin: row.home_win });
}
const fit = fitBridge(train);
if (!fit.ok) {
  console.error(fit.reason, "train", train.length);
  process.exit(1);
}

function brierOf(rows) {
  let n = 0;
  let s = 0;
  for (const row of rows) {
    const vector = featuresOf(row);
    if (!vector || row.home_win === null) continue;
    const predicted = predictBridge(fit.data, vector);
    if (!predicted.ok) continue;
    n += 1;
    s += (predicted.data.probability - (row.home_win ? 1 : 0)) ** 2;
  }
  return { n, brier: n ? s / n : null };
}

const forward = brierOf(builtFeatures.filter((row) => row.season === 2026 && row.settled));
const week3 = builtFeatures.filter((row) => row.season === 2026 && row.week === 3).sort((a, b) => a.gameday.localeCompare(b.gameday) || a.game_id.localeCompare(b.game_id));
const lines = [];
let association = 0;
let withheld = 0;
let insufficient = 0;
for (const row of week3) {
  const game = schedule.get(row.game_id);
  const vector = featuresOf(row);
  const predicted = vector ? predictBridge(fit.data, vector) : { ok: false, reason: "no prior feature" };
  const homeRaw = americanToRaw(game.home_moneyline);
  const awayRaw = americanToRaw(game.away_moneyline);
  const market = homeRaw !== null && awayRaw !== null && homeRaw + awayRaw > 0 ? homeRaw / (homeRaw + awayRaw) : null;
  const premises = [];
  if (predicted.ok) {
    premises.push({ game_id: row.game_id, signal_id: "pregame_context_logit", outcome: "home", probability: predicted.data.probability, sample_count: predicted.data.sampleCount, method: predicted.data.method });
  }
  if (market !== null && market > 0 && market < 1) {
    premises.push({ game_id: row.game_id, signal_id: "devigged_moneyline", outcome: "home", probability: market, sample_count: 1, method: "one quoted pair, vig removed" });
  }
  const trace = traceHoldoutGame({
    game_id: row.game_id,
    season: row.season,
    week: row.week,
    home_team: row.home_team,
    away_team: row.away_team,
    rest_diff: row.rest_diff,
    roof: row.is_dome ? "dome" : "outdoor",
  }, premises);
  if (!trace.ok) throw new Error(trace.reason);
  if (trace.data.conclusion === "ASSOCIATION_ONLY") association += 1;
  else if (trace.data.conclusion === "WITHHELD") withheld += 1;
  else insufficient += 1;
  const modelP = predicted.ok ? predicted.data.probability : null;
  lines.push({
    matchup: `${row.away_team} at ${row.home_team}`,
    gameday: row.gameday,
    settled: row.settled,
    score: row.settled ? `${game.away_score}-${game.home_score}` : "",
    priors: `${row.away_games_prior}/${row.home_games_prior}`,
    model: modelP,
    market,
    gap: modelP !== null && market !== null ? modelP - market : null,
    conclusion: trace.data.conclusion,
    reason: trace.data.withheldReasons.join("; ") || trace.data.reason,
  });
}

const fmt = (value) => (typeof value === "number" ? value.toFixed(3) : "");
const body = [
  "# Week 3 2026",
  "",
  `Fit on ${fit.data.sampleCount} games from seasons before 2026. This season's results were not in the fit.`,
  `Settled 2026 games so far, forward Brier: ${forward.brier?.toFixed(4)} on ${forward.n} games.`,
  `Week 3: ${association} association, ${withheld} withheld, ${insufficient} insufficient.`,
  "Withheld means the pregame model and the devigged moneyline differ by more than 0.08. That is not a side.",
  "",
  "| game | day | settled | score | priors away/home | model | market | gap | trace |",
  "|---|---|---|---|---|---|---|---|---|",
  ...lines.map((row) => `| ${row.matchup} | ${row.gameday} | ${row.settled} | ${row.score} | ${row.priors} | ${fmt(row.model)} | ${fmt(row.market)} | ${fmt(row.gap)} | ${row.conclusion} |`),
  "",
  "## Why",
  "",
  ...lines.map((row) => `- ${row.matchup}: ${row.reason}`),
  "",
];
const out = resolve(root, "docs/reasoning/week3-2026.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body.join("\n"));
console.log(JSON.stringify({ train: fit.data.sampleCount, forward, association, withheld, insufficient, open: lines.filter((row) => !row.settled).map((row) => ({ matchup: row.matchup, model: row.model, market: row.market, gap: row.gap, conclusion: row.conclusion, priors: row.priors })) }, null, 2));
}
