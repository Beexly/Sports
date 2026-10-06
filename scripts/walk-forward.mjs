/**
 * Every season from 2015 through 2025 is a holdout.
 * Ratings and the logistic fit see only games before that season.
 * 1999-2001 is burn-in. 2002-2014 chooses the home-field constant.
 * 2026 is reported, not used to choose anything.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildFeatures, featuresOf } from "./week3-2026.mjs";
import { fitBridge, predictBridge } from "../packages/prediction-engine/src/bridge/bridge-model.ts";
import { eloWinProb, movMultiplier } from "../packages/data-ingestion/src/1906-02746v3-team-ratings.ts";

const root = resolve(process.cwd());
const BASE_K = 20;

function readJsonl(path) {
  return readFileSync(resolve(root, path), "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
}

function americanToRaw(ml) {
  if (typeof ml !== "number" || !Number.isFinite(ml) || ml === 0) return null;
  return ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100);
}

function devig(game) {
  const home = americanToRaw(game.home_moneyline);
  const away = americanToRaw(game.away_moneyline);
  if (home === null || away === null || home + away <= 0) return null;
  const p = home / (home + away);
  return p > 0 && p < 1 ? p : null;
}

function walkElo(games, hfa, useMov) {
  const elo = new Map();
  const rows = [];
  for (const game of games) {
    const home = elo.get(game.home_team) ?? 1500;
    const away = elo.get(game.away_team) ?? 1500;
    const probability = eloWinProb(home + hfa, away);
    const played = game.settled && typeof game.home_score === "number" && typeof game.away_score === "number";
    if (probability !== null && probability > 0 && probability < 1) {
      rows.push({
        game_id: game.game_id,
        season: game.season,
        week: game.week,
        settled: played,
        homeWin: played ? (game.margin === 0 ? null : game.home_score > game.away_score) : null,
        probability,
        market: devig(game),
        home: game.home_team,
        away: game.away_team,
        gameday: game.gameday,
      });
    }
    if (!played || game.margin === 0) continue;
    const expected = probability;
    if (expected === null) continue;
    const margin = Math.abs(game.home_score - game.away_score);
    const multiplier = useMov ? movMultiplier(margin, home + hfa - away) : 1;
    if (multiplier === null || !(multiplier > 0)) continue;
    const score = game.home_score > game.away_score ? 1 : 0;
    const delta = BASE_K * multiplier * (score - expected);
    elo.set(game.home_team, home + delta);
    elo.set(game.away_team, away - delta);
  }
  return rows;
}

function brier(rows, key) {
  let n = 0;
  let s = 0;
  for (const row of rows) {
    const p = row[key];
    if (row.homeWin === null || typeof p !== "number") continue;
    n += 1;
    s += (p - (row.homeWin ? 1 : 0)) ** 2;
  }
  return { n, brier: n ? s / n : null };
}

const games = readJsonl("data/gse-dataset/games.jsonl").sort((a, b) => (a.gameday < b.gameday ? -1 : a.gameday > b.gameday ? 1 : a.game_id < b.game_id ? -1 : 1));
const grid = [];
for (const hfa of [0, 30, 48, 65, 80]) {
  for (const useMov of [false, true]) {
    const scored = walkElo(games, hfa, useMov).filter((row) => row.season >= 2002 && row.season <= 2014 && row.settled && row.homeWin !== null);
    const score = brier(scored, "probability");
    grid.push({ hfa, useMov, ...score });
  }
}
grid.sort((a, b) => a.brier - b.brier);
const chosen = grid[0];
const eloRows = walkElo(games, chosen.hfa, chosen.useMov);
const eloById = new Map(eloRows.map((row) => [row.game_id, row]));

const features = buildFeatures(games);
const logitBySeason = new Map();
for (let season = 2015; season <= 2026; season++) {
  const train = [];
  for (const row of features) {
    if (row.season >= season || row.home_win === null) continue;
    const vector = featuresOf(row);
    if (!vector) continue;
    train.push({ features: vector, homeWin: row.home_win });
  }
  const fit = fitBridge(train);
  let usable = 0;
  for (const row of features) if (row.season === season && featuresOf(row)) usable += 1;
  if (usable === 0 || !fit.ok) console.error("logit", season, fit.ok ? "ok" : fit.reason, "train", train.length, "usable", usable);
  const preds = new Map();
  if (fit.ok) {
    for (const row of features) {
      if (row.season !== season) continue;
      const vector = featuresOf(row);
      if (!vector) continue;
      const predicted = predictBridge(fit.data, vector);
      if (predicted.ok) preds.set(row.game_id, { probability: predicted.data.probability, sampleCount: predicted.data.sampleCount });
    }
  }
  logitBySeason.set(season, { ok: fit.ok, reason: fit.ok ? "" : fit.reason, sampleCount: fit.ok ? fit.data.sampleCount : train.length, preds });
  if (!fit.ok) console.error("logit", season, fit.reason, "train", train.length);
}

function seasonBlock(season) {
  const elo = eloRows.filter((row) => row.season === season && row.settled && row.homeWin !== null);
  const logit = logitBySeason.get(season);
  const joined = [];
  for (const row of elo) {
    const model = logit?.preds.get(row.game_id);
    joined.push({ ...row, logit: model?.probability ?? null });
  }
  const allThree = joined.filter((row) => row.logit !== null && row.market !== null);
  return {
    season,
    elo: brier(joined, "probability"),
    logit: brier(joined.filter((row) => row.logit !== null).map((row) => ({ homeWin: row.homeWin, probability: row.logit })), "probability"),
    market: brier(joined.filter((row) => row.market !== null), "market"),
    sameGames: {
      n: allThree.length,
      elo: brier(allThree, "probability").brier,
      logit: brier(allThree.map((row) => ({ homeWin: row.homeWin, probability: row.logit })), "probability").brier,
      market: brier(allThree, "market").brier,
    },
  };
}

const seasons = [];
for (let season = 2015; season <= 2026; season++) seasons.push(seasonBlock(season));

const week3 = games.filter((game) => game.season === 2026 && game.week === 3);
const week3Lines = week3.map((game) => {
  const elo = eloById.get(game.game_id);
  const logit = logitBySeason.get(2026)?.preds.get(game.game_id);
  return {
    matchup: `${game.away_team} at ${game.home_team}`,
    gameday: game.gameday,
    settled: game.settled,
    elo: elo?.probability ?? null,
    logit: logit?.probability ?? null,
    market: devig(game),
  };
});

const fmt = (value) => (typeof value === "number" ? value.toFixed(4) : "");
const fmt3 = (value) => (typeof value === "number" ? value.toFixed(3) : "");
const lines = [
  "# Historical walk-forward",
  "",
  "Each season below was scored only by a model fit on earlier seasons. 2026 did not choose the home-field constant and did not enter the 2015-2025 fits.",
  "",
  `Home field chosen on 2002-2014: ${chosen.hfa} Elo points, margin-of-victory multiplier ${chosen.useMov}. Selection Brier ${chosen.brier.toFixed(4)} on ${chosen.n} games. Base K is 20, from the existing rating module. The other nine settings are listed so the choice is visible.`,
  "",
  "| hfa | margin multiplier | games | brier |",
  "|---|---|---|---|",
  ...grid.map((row) => `| ${row.hfa} | ${row.useMov} | ${row.n} | ${row.brier.toFixed(4)} |`),
  "",
  "The three columns in the same-game block are the same games, so they can be compared. A lower Brier is a sharper probability. This is the engine's own record. It is not a pick.",
  "",
  "| season | games with all three | elo | pregame logit | devigged price |",
  "|---|---|---|---|---|",
  ...seasons.map((row) => `| ${row.season} | ${row.sameGames.n} | ${fmt(row.sameGames.elo)} | ${fmt(row.sameGames.logit)} | ${fmt(row.sameGames.market)} |`),
  "",
  "Elo on every settled game that season, even when the price or the logit is missing:",
  "",
  "| season | elo games | elo brier | logit games | logit brier |",
  "|---|---|---|---|---|",
  ...seasons.map((row) => `| ${row.season} | ${row.elo.n} | ${fmt(row.elo.brier)} | ${row.logit.n} | ${fmt(row.logit.brier)} |`),
  "",
  "## Week 3 with both historical models",
  "",
  `Logit sample for 2026: ${logitBySeason.get(2026)?.sampleCount ?? 0} earlier games.`,
  "",
  "| game | day | elo | logit | market |",
  "|---|---|---|---|---|",
  ...week3Lines.map((row) => `| ${row.matchup} | ${row.gameday} | ${fmt3(row.elo)} | ${fmt3(row.logit)} | ${fmt3(row.market)} |`),
  "",
];
const out = resolve(root, "docs/reasoning/historical-walk-forward.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n"));
const recent = seasons.filter((row) => row.season >= 2015 && row.season <= 2025);
const mean = (key) => {
  let n = 0;
  let s = 0;
  for (const row of recent) {
    const value = row.sameGames[key];
    if (typeof value !== "number") continue;
    n += row.sameGames.n;
    s += value * row.sameGames.n;
  }
  return n ? s / n : null;
};
console.log(JSON.stringify({ chosen, meanElo: mean("elo"), meanLogit: mean("logit"), meanMarket: mean("market"), seasons: seasons.map((row) => row.sameGames.n && { season: row.season, ...row.sameGames }) }, null, 2));
