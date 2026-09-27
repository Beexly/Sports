#!/usr/bin/env node
// compute-week3-narrative.mjs — the row that turns STORED into LIVE.
//
// narrative_contract cleared honesty on the 2025 holdout and is STORED because f3 is 1: the
// target game has no week-3 row. This script is the thing that produces it when nflverse
// publishes the game's snap rows, so becoming LIVE is a command and not a project.
//
//   node scripts/overnight/compute-week3-narrative.mjs 2026_03_LAC_BUF
//   node scripts/overnight/compute-week3-narrative.mjs --pair LAC BUF
//
// With no argument it lists every 2026 week-3 game that has snap rows, which is how you
// check whether the target game has been published yet.
//
// It applies coefficients fitted on 2018-2024 and frozen before 2025 was scored. It does not
// refit: a refit would be a different claim from the one the scalarizer already accepted.
//
// Layout-agnostic: the grain file list comes from the ingest manifest, so this runs whether
// the grains are one combined file or one file per season.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPart } from '../../packages/prediction-engine/src/reasoning/part-selector.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');
const TARGET_GAME = '2026_03_LAC_BUF';

// Sealed by scripts/overnight/measure-narrative.mjs. Constants on purpose: if they ever need
// to change, the verdict that accepted them has to be re-earned, not inherited.
export const SEALED = {
  slope: 0.07001801180138646,
  intercept: 0.540177031166675,
  train_n: 1942,
  train_r: 0.23071486948840408,
  train_se: 0.006704335156524047,
  holdout_season: 2025,
  holdout_n: 285,
  holdout_r: 0.24637068951161498,
  holdout_slope: 0.8304928047049019,
  holdout_se: 0.19420308361768532,
};

const manifest = JSON.parse(readFileSync(join(DATA, 'nflverse-ingest-manifest.json'), 'utf8'));
const filesFor = (p) => manifest.datasets
  .filter((d) => d.name === p || d.name.startsWith(`${p}-`))
  .map((d) => d.path.replace(/^data\/gse-dataset\//, ''))
  .filter((f) => existsSync(join(DATA, f)));
const rowsIn = (f) => readFileSync(join(DATA, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const rowsFor = (p) => filesFor(p).flatMap(rowsIn);

const contracts = rowsFor('contracts');
const snaps = rowsFor('snap-counts');
const rosters = rowsFor('rosters');
const games = new Map(rowsIn('games.jsonl').map((g) => [g.game_id, g]));

const contractBySeason = new Map();
for (const c of contracts) {
  if (typeof c.gsis_id !== 'string' || c.gsis_id.trim() === '') continue;
  if (!Number.isFinite(c.apy) || !Number.isFinite(c.year_signed)) continue;
  const len = Number.isFinite(c.years) && c.years > 0 ? c.years : 1;
  for (let s = c.year_signed; s <= c.year_signed + len - 1; s += 1) {
    let m = contractBySeason.get(s);
    if (!m) { m = new Map(); contractBySeason.set(s, m); }
    const prev = m.get(c.gsis_id);
    if (prev === undefined || c.apy > prev) m.set(c.gsis_id, c.apy);
  }
}

const rosterBySeason = new Map();
for (const r of rosters) {
  if (!Number.isFinite(r.season)) continue;
  if (typeof r.pfr_id !== 'string' || r.pfr_id.trim() === '') continue;
  if (typeof r.gsis_id !== 'string' || r.gsis_id.trim() === '') continue;
  let m = rosterBySeason.get(r.season);
  if (!m) { m = new Map(); rosterBySeason.set(r.season, m); }
  if (!m.has(r.pfr_id)) m.set(r.pfr_id, r.gsis_id);
}

function teamMean(season, team, onlyGameId) {
  let weighted = 0, matched = 0, snapsTotal = 0, unmatched = 0;
  const weeks = new Set();
  for (const s of snaps) {
    if (s.season !== season || s.team !== team) continue;
    if (onlyGameId && s.game_id !== onlyGameId) continue;
    const n = (s.offense_snaps ?? 0) + (s.defense_snaps ?? 0) + (s.st_snaps ?? 0);
    if (!Number.isFinite(n) || n <= 0) continue;
    weeks.add(s.week);
    snapsTotal += n;
    const rm = rosterBySeason.get(season);
    const gsis = rm ? rm.get(s.pfr_player_id) : undefined;
    const cm = contractBySeason.get(season);
    const apy = gsis === undefined || cm === undefined ? undefined : cm.get(gsis);
    if (apy === undefined) { unmatched += n; continue; }
    weighted += apy * n;
    matched += n;
  }
  if (matched === 0) return null;
  return { mean: weighted / matched, matched, snapsTotal, unmatched, weeks: [...weeks].sort((a, b) => a - b) };
}

function forGame(gameId) {
  const g = games.get(gameId);
  if (!g) return { game_id: gameId, status: 'NO_SUCH_GAME' };
  const rows = snaps.filter((s) => s.game_id === gameId);
  if (rows.length === 0) {
    return { game_id: gameId, status: 'NO_SNAP_ROWS', detail: 'nflverse has not published snap counts for this game yet', snap_rows: 0 };
  }
  const home = teamMean(g.season, g.home_team, gameId);
  const away = teamMean(g.season, g.away_team, gameId);
  if (!home || !away) {
    return { game_id: gameId, status: 'TEAM_WITHOUT_CONTRACTED_SNAPS', home_team: g.home_team, away_team: g.away_team };
  }
  return {
    game_id: gameId,
    status: 'OK',
    home_team: g.home_team,
    away_team: g.away_team,
    measurement_window: `season ${g.season} weeks ${[...new Set([...home.weeks, ...away.weeks])].sort((a, b) => a - b).join(',')}`,
    is_week_3_row: home.weeks.length === 1 && home.weeks[0] === 3 && away.weeks.length === 1 && away.weeks[0] === 3,
    home_mean_apy: home.mean,
    away_mean_apy: away.mean,
    home_matched_snaps: home.matched,
    away_matched_snaps: away.matched,
    unmatched_snap_rows: home.unmatched + away.unmatched,
    feature_apy_gap: home.mean - away.mean,
  };
}

function forPair(homeAbbr, awayAbbr) {
  const home = teamMean(2026, homeAbbr, null);
  const away = teamMean(2026, awayAbbr, null);
  if (!home || !away) return { status: 'TEAM_WITHOUT_CONTRACTED_SNAPS', home: homeAbbr, away: awayAbbr };
  const weeks = [...new Set([...home.weeks, ...away.weeks])].sort((a, b) => a - b);
  return {
    status: 'OK',
    measurement_window: `2026 weeks ${weeks.join(',')}`,
    is_week_3_row: weeks.length === 1 && weeks[0] === 3,
    home_team: homeAbbr,
    away_team: awayAbbr,
    home_mean_apy: home.mean,
    away_mean_apy: away.mean,
    home_matched_snaps: home.matched,
    away_matched_snaps: away.matched,
    unmatched_snap_rows: home.unmatched + away.unmatched,
    feature_apy_gap: home.mean - away.mean,
  };
}

const registry = rowsIn('../reasoning/parts-registry.jsonl').map((r) => r.family);
const scalarIfRow = selectPart(
  { family: 'narrative_contract', grain: 'snap-weighted mean APY gap', r: SEALED.holdout_r, slope: SEALED.holdout_slope, se: SEALED.holdout_se, n: SEALED.holdout_n, has_row: true },
  registry,
);

function finish(f) {
  if (f.status !== 'OK') return f;
  f.signed = SEALED.slope * f.feature_apy_gap;
  f.signed_source =
    'snap-weighted mean APY gap (home minus away), snaps joined pfr_player_id -> rosters.pfr_id+season -> ' +
    'contracts.gsis_id with the contract required to cover the season; multiplied by the frozen pre-2025 OLS ' +
    `slope ${SEALED.slope} from scripts/overnight/measure-narrative.mjs`;
  f.model_probability = SEALED.intercept + f.signed;
  f.model_probability_in_unit_interval = f.model_probability > 0 && f.model_probability < 1;
  f.scalarizer_if_row_exists = scalarIfRow;
  return f;
}

const argv = process.argv.slice(2);
let gamesOut;
if (argv[0] === '--pair') {
  gamesOut = [finish(forPair(argv[1], argv[2]))];
} else {
  const targets = argv[0]
    ? [argv[0]]
    : [...new Set(snaps.filter((s) => s.season === 2026 && String(s.game_id).includes('_03_')).map((s) => s.game_id))].sort();
  gamesOut = targets.map((t) => finish(forGame(t)));
}

process.stdout.write(
  `${JSON.stringify(
    {
      slice: 'compute-week3-narrative',
      utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      target_game: TARGET_GAME,
      sealed_fit: SEALED,
      note:
        'scalarizer_if_row_exists shows what g would be IF the target game had a week-3 row: f3 = 0 with ' +
        'f1 = 0 and f2 = 0, so g = 0 and the family is LIVE. It is shown, not applied. A registry row is only ' +
        'written for a game that actually has snap rows, and is_week_3_row says whether this is one.',
      games: gamesOut,
    },
    null,
    2
  )}\n`
);
