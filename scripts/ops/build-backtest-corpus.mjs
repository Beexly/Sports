#!/usr/bin/env node
/**
 * Build the NFL historical backtest corpus from nflverse `games.csv`.
 *
 * WHY. packages/prediction-engine/src/backtest/README.md names nflverse
 * (CC-BY 4.0) as the legal, free source for NFL closing lines back to 1999,
 * and documents that the corpus is deliberately NOT committed. The short-week
 * road-deficit signal ships hand-written magnitudes with no backtest, and the
 * total-signal spec requires a rule to prove itself before it reaches a live
 * projection. This is the missing step, and it uses only what the repo already
 * trusts.
 *
 * SOURCE, MEASURED NOT ASSUMED. The README points at a `schedules.csv` URL that
 * 404s: nflverse renamed the asset to `games.csv` and moved it under the
 * per-dataset `schedules` release tag. The README's URL is left alone here (it
 * documents provenance, not code) but this script uses the URL that resolves,
 * verified 2026-09-28 by fetching the header and counting rows.
 *
 * nflverse PUBLISHES `home_rest` / `away_rest` directly, so rest days are READ,
 * not derived from kickoff arithmetic. That is strictly better than a local
 * derivation: it is the source's own value, so a disagreement would be
 * upstream's and not a bug hidden in this script.
 *
 * THE ONE THING THAT STILL NEEDS DERIVING is `isDivisionRivalry`, which the
 * asset does not carry but the signal consumes. It comes from nflverse's own
 * `teams.csv` division column, so it is a real membership lookup rather than a
 * name-pattern guess.
 *
 * RESTRAINTS, each because a fabrication is worse than an absent number:
 *   - A row with no score, no spread line, or no total is DROPPED, not
 *     defaulted — a fake line would grade as a real pick.
 *   - Moneyline is taken AS PUBLISHED (American), never converted from a price
 *     the asset does not carry.
 *   - A missing rest value is DROPPED rather than imputed from the week number.
 *   - Everything dropped is COUNTED and printed. Silent loss is a bug.
 *
 * Usage: node scripts/ops/build-backtest-corpus.mjs [seasons...]
 *   e.g. node scripts/ops/build-backtest-corpus.mjs 2015 2016 2017 2018
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUT = resolve(REPO_ROOT, "data", "backtest", "nfl_historical_games.json");
const GAMES_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv";
// nflverse renamed this asset too: the `teams` release ships
// `teams_colors_logos.csv` (404 on `teams.csv`, verified 2026-09-28), and the
// division column is `team_division` keyed by `team_abbr` — the same
// abbreviations `games.csv` uses, so the join needs no name mapping.
const TEAMS_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/teams/teams_colors_logos.csv";
const SOURCE = "nflverse/nflverse-data games.csv, CC-BY 4.0";

const DEFAULT_SEASONS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

/** RFC-4180 parser — same semantics as the repo's own nflverse adapter. */
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => {
      const rec = {};
      for (let j = 0; j < header.length; j += 1) rec[header[j]] = r[j] ?? "";
      return rec;
    });
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "gse-backtest-corpus" } });
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  return res.text();
}

const argvSeasons = process.argv.slice(2).map(Number).filter(Number.isFinite);
const wanted = new Set(argvSeasons.length > 0 ? argvSeasons : DEFAULT_SEASONS);

// Division membership, straight from nflverse rather than name patterns.
const teamsText = await fetchText(TEAMS_URL);
const divisionByTeam = new Map();
for (const t of parseCsv(teamsText)) {
  const team = (t.team_abbr ?? "").trim();
  if (team.length > 0) divisionByTeam.set(team, (t.team_division ?? "").trim());
}

const gamesText = await fetchText(GAMES_URL);
const games = parseCsv(gamesText);

const dropped = { noScore: 0, noLine: 0, noRest: 0, noKickoff: 0, noDivision: 0 };
const rows = [];

for (const g of games) {
  const season = toInt(g.season);
  if (season === null || !wanted.has(season)) continue;
  // REG only: playoff games carry rest semantics the signal never models, and
  // mixing them in would put a different question in the same population.
  if (g.game_type !== "REG") continue;

  const homeScore = toInt(g.home_score);
  const awayScore = toInt(g.away_score);
  if (homeScore === null || awayScore === null) { dropped.noScore += 1; continue; }

  const closingSpreadHome = Number(g.spread_line);
  const closingTotal = Number(g.total_line);
  if (!Number.isFinite(closingSpreadHome) || !Number.isFinite(closingTotal) || closingTotal <= 0) {
    dropped.noLine += 1;
    continue;
  }

  const restDaysHome = toInt(g.home_rest);
  const restDaysAway = toInt(g.away_rest);
  if (restDaysHome === null || restDaysAway === null || restDaysHome <= 0 || restDaysAway <= 0) {
    dropped.noRest += 1;
    continue;
  }

  const mlHome = toInt(g.home_moneyline);
  const mlAway = toInt(g.away_moneyline);
  if (mlHome === null || mlAway === null || mlHome === 0 || mlAway === 0) { dropped.noLine += 1; continue; }

  const kickoff = new Date(`${g.gameday}T${g.gametime ?? "12:00:00"}Z`);
  if (Number.isNaN(kickoff.getTime())) { dropped.noKickoff += 1; continue; }

  const homeDivision = divisionByTeam.get(g.home_team) ?? "";
  const awayDivision = divisionByTeam.get(g.away_team) ?? "";
  if (homeDivision.length === 0 || awayDivision.length === 0) { dropped.noDivision += 1; continue; }

  rows.push({
    season,
    week: toInt(g.week) ?? 0,
    kickoffUtc: kickoff.toISOString(),
    homeTeam: g.home_team,
    awayTeam: g.away_team,
    homeScore,
    awayScore,
    closingSpreadHome,
    closingTotal,
    closingMlHome: mlHome,
    closingMlAway: mlAway,
    sourceUrl: `${GAMES_URL}#${season}`,
    // Derived from nflverse's own division membership, not a name heuristic.
    isDivisionRivalry: homeDivision === awayDivision ? 1 : 0,
    restDaysHome,
    restDaysAway,
    homeTeamName: g.home_team,
    awayTeamName: g.away_team,
  });
}

rows.sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({
    source: SOURCE,
    sourceUrl: GAMES_URL,
    divisionSource: TEAMS_URL,
    seasons: [...wanted].sort((a, b) => a - b),
    generatedFor: "short-week road deficit backtest",
    rows,
  })}\n`,
);

console.log(`[backtest-corpus] wrote ${rows.length} rows -> ${OUT}`);
console.log(`[backtest-corpus] parsed ${games.length} games.csv rows, kept REG games for ${[...wanted].sort((a, b) => a - b).join(",")}`);
console.log(`[backtest-corpus] dropped: ${JSON.stringify(dropped)}`);
console.log(`[backtest-corpus] credit: ${SOURCE}`);
