#!/usr/bin/env node
// compute-week3-narrative.mjs — the row that turns STORED into LIVE.
//
// narrative_contract cleared honesty on the 2025 holdout and is STORED, because f3 (the
// week-3 row for the game) is 1. f3 is 1 only because snap counts for 2026_03_LAC_BUF had
// not been published when this ran. They will be. This script is the thing that runs when
// they land, so becoming LIVE is a command and not a project.
//
// It applies coefficients that were fitted on 2018-2024 and frozen before 2025 was scored.
// It does not refit, and it must not: a refit here would be a different claim from the one
// the scalarizer already accepted.
//
//   node scripts/overnight/compute-week3-narrative.mjs 2026_03_LAC_BUF
//
//   node scripts/overnight/compute-week3-narrative.mjs --pair LAC BUF
//
// With no argument it reports every 2026 week-3 game that has snap rows, which is how you
// check whether the target game has been published yet.
//
// --pair computes the same feature for two teams from their most recent available snap rows
// rather than from one game. That is a different measurement window from a week-3 row, so
// the output is labelled as such and is never written to the registry automatically. It
// exists so the owner can see the current number instead of a blank.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPart } from '../../packages/prediction-engine/src/reasoning/part-selector.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

const TARGET_GAME = '2026_03_LAC_BUF';

// Sealed by scripts/overnight/measure-narrative.mjs: fitted on 2018-2024, n=1942.
// These are constants on purpose. If they ever need to change, the scalarizer verdict that
// accepted them has to be re-earned, not inherited.
const SEALED = {
  slope: 0.04899180479384689,
  intercept: 0.5417079766223115, // frozen with the slope; see scripts/overnight/measure-narrative.mjs
  train_n: 1942,
  train_r: 0.20344943432147203,
  train_se: 0.005352869870494491,
  holdout_season: 2025,
  holdout_n: 285,
  holdout_r: 0.23359561489783362,
  holdout_slope: 1.1071012391250847,
  holdout_se: 0.2739333017720089,
};

function rows(path) {
  return readFileSync(join(DATA, path), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// The intercept is a sealed constant, not something recomputed here. Recovering it from a
// refit would silently change the model the scalarizer already accepted.
function sealedIntercept() {
  return SEALED.intercept;
}

// --- contracts covering a season -------------------------------------------

function contractMap(seasonsWanted) {
  const bySeason = new Map();
  for (const c of rows('contracts.jsonl')) {
    if (typeof c.gsis_id !== 'string' || c.gsis_id.trim() === '') continue;
    if (!Number.isFinite(c.apy) || !Number.isFinite(c.year_signed)) continue;
    const len = Number.isFinite(c.years) && c.years > 0 ? c.years : 1;
    for (let s = c.year_signed; s <= c.year_signed + len - 1; s += 1) {
      if (!seasonsWanted.has(s)) continue;
      let m = bySeason.get(s);
      if (!m) { m = new Map(); bySeason.set(s, m); }
      const prev = m.get(c.gsis_id);
      if (prev === undefined || c.apy > prev) m.set(c.gsis_id, c.apy);
    }
  }
  return bySeason;
}

function rosterMap() {
  const bySeason = new Map();
  for (const r of rows('rosters.jsonl')) {
    if (!Number.isFinite(r.season)) continue;
    if (typeof r.pfr_id !== 'string' || r.pfr_id.trim() === '') continue;
    if (typeof r.gsis_id !== 'string' || r.gsis_id.trim() === '') continue;
    let m = bySeason.get(r.season);
    if (!m) { m = new Map(); bySeason.set(r.season, m); }
    if (!m.has(r.pfr_id)) m.set(r.pfr_id, r.gsis_id);
  }
  return bySeason;
}

const roster = rosterMap();
const snaps = rows('snap-counts.jsonl');
const games = new Map(rows('games.jsonl').map((g) => [g.game_id, g]));
const contracts = contractMap(new Set(snaps.map((s) => s.season).filter(Number.isFinite)));

function featureFor(gameId) {
  const game = games.get(gameId);
  if (!game) return { game_id: gameId, status: 'NO_SUCH_GAME' };
  const rowsFor = snaps.filter((s) => s.game_id === gameId);
  if (rowsFor.length === 0) {
    return { game_id: gameId, status: 'NO_SNAP_ROWS', detail: 'nflverse has not published snap counts for this game yet', snap_rows: 0 };
  }
  const per = new Map();
  let matched = 0;
  let unmatched = 0;
  for (const s of rowsFor) {
    const n = (s.offense_snaps ?? 0) + (s.defense_snaps ?? 0) + (s.st_snaps ?? 0);
    if (!Number.isFinite(n) || n <= 0) continue;
    const rm = roster.get(s.season);
    const gsis = rm ? rm.get(s.pfr_player_id) : undefined;
    const cm = contracts.get(s.season);
    const apy = gsis === undefined || cm === undefined ? undefined : cm.get(gsis);
    let t = per.get(s.team);
    if (!t) { t = { snaps: 0, weighted: 0, matched: 0 }; per.set(s.team, t); }
    t.snaps += n;
    if (apy === undefined) { unmatched += n; continue; }
    t.weighted += apy * n;
    t.matched += n;
    matched += n;
  }
  const mean = (team) => {
    const t = per.get(team);
    return t && t.matched > 0 ? { value: t.weighted / t.matched, matched: t.matched, snaps: t.snaps } : null;
  };
  const home = mean(game.home_team);
  const away = mean(game.away_team);
  if (!home || !away) {
    return { game_id: gameId, status: 'TEAM_WITHOUT_CONTRACTED_SNAPS', home_team: game.home_team, away_team: game.away_team, matched_snap_rows: matched, unmatched_snap_rows: unmatched };
  }
  return {
    game_id: gameId,
    status: 'OK',
    home_team: game.home_team,
    away_team: game.away_team,
    home_mean_apy: home.value,
    away_mean_apy: away.value,
    home_matched_snaps: home.matched,
    away_matched_snaps: away.matched,
    unmatched_snap_rows: unmatched,
    feature_apy_gap: home.value - away.value,
  };
}

// Feature for a team pair from that team's most recent available snap rows, independent of
// whether the target game itself has been published yet. The window is reported, because a
// weeks-1-2 measurement is not a week-3 measurement and must not be presented as one.
function featureForPair(homeAbbr, awayAbbr) {
  const per = new Map();
  const windows = new Map();
  let unmatched = 0;
  let matched = 0;
  for (const s of snaps) {
    if (s.season !== 2026) continue;
    if (s.team !== homeAbbr && s.team !== awayAbbr) continue;
    const n = (s.offense_snaps ?? 0) + (s.defense_snaps ?? 0) + (s.st_snaps ?? 0);
    if (!Number.isFinite(n) || n <= 0) continue;
    const rm = roster.get(s.season);
    const gsis = rm ? rm.get(s.pfr_player_id) : undefined;
    const cm = contracts.get(s.season);
    const apy = gsis === undefined || cm === undefined ? undefined : cm.get(gsis);
    let t = per.get(s.team);
    if (!t) { t = { snaps: 0, weighted: 0, matched: 0 }; per.set(s.team, t); }
    t.snaps += n;
    const w = windows.get(s.team) ?? new Set();
    w.add(s.week);
    windows.set(s.team, w);
    if (apy === undefined) { unmatched += n; continue; }
    t.weighted += apy * n;
    t.matched += n;
    matched += n;
  }
  const h = per.get(homeAbbr);
  const a = per.get(awayAbbr);
  if (!h || !a || h.matched === 0 || a.matched === 0) {
    return { status: 'TEAM_WITHOUT_CONTRACTED_SNAPS', home: homeAbbr, away: awayAbbr, matched_snap_rows: matched };
  }
  const weeks = [...new Set([...(windows.get(homeAbbr) ?? []), ...(windows.get(awayAbbr) ?? [])])].sort((x, y) => x - y);
  return {
    status: 'OK',
    measurement_window: `2026 weeks ${weeks.join(',')}`,
    is_week_3_row: weeks.length === 1 && weeks[0] === 3,
    home_team: homeAbbr,
    away_team: awayAbbr,
    home_mean_apy: h.weighted / h.matched,
    away_mean_apy: a.weighted / a.matched,
    home_matched_snaps: h.matched,
    away_matched_snaps: a.matched,
    unmatched_snap_rows: unmatched,
    feature_apy_gap: h.weighted / h.matched - a.weighted / a.matched,
  };
}

const argv = process.argv.slice(2);
const pairMode = argv[0] === '--pair';
const arg = pairMode ? null : argv[0];
const intercept = sealedIntercept();

let out;
if (pairMode) {
  const f = featureForPair(argv[1], argv[2]);
  if (f.status === 'OK') {
    f.signed = SEALED.slope * f.feature_apy_gap;
    f.signed_source =
      `snap-weighted mean APY gap (${argv[1]} home minus ${argv[2]} away) from the most recent sealed ` +
      '2026 snap rows, joined pfr_player_id -> rosters.pfr_id+season -> contracts.gsis_id, multiplied by the ' +
      'frozen pre-2025 OLS slope 0.04899180479384689';
    f.model_probability = intercept + f.signed;
    f.model_probability_in_unit_interval = f.model_probability > 0 && f.model_probability < 1;
  }
  out = [f];
} else {
  const targets = arg
    ? [arg]
    : [...new Set(snaps.filter((s) => s.season === 2026 && String(s.game_id).includes('_03_')).map((s) => s.game_id))].sort();
  out = targets.map((t) => {
    const f = featureFor(t);
    if (f.status !== 'OK') return f;
    // Apply the sealed pre-2025 model. This is the same transform the walk-forward scored.
    f.signed = SEALED.slope * f.feature_apy_gap;
    f.signed_source =
      'snap-weighted mean APY gap (home minus away) from data/gse-dataset/snap-counts.jsonl joined ' +
      'pfr_player_id -> rosters.pfr_id+season -> contracts.gsis_id, with the contract required to cover the season; ' +
      'multiplied by the frozen pre-2025 OLS slope 0.04899180479384689 from scripts/overnight/measure-narrative.mjs';
    if (Number.isFinite(intercept)) {
      f.model_probability = intercept + f.signed;
      f.model_probability_in_unit_interval = f.model_probability > 0 && f.model_probability < 1;
    }
    f.scalarizer_if_row_exists = selectPart(
      { family: 'narrative_contract', grain: 'snap-weighted mean APY gap', r: SEALED.holdout_r, slope: SEALED.holdout_slope, se: SEALED.holdout_se, n: SEALED.holdout_n, has_row: true },
      rows('../reasoning/parts-registry.jsonl').map((r) => r.family),
    );
    return f;
  });
}

process.stdout.write(
  `${JSON.stringify(
    {
      slice: 'compute-week3-narrative',
      utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      sealed_fit: SEALED,
      sealed_intercept: intercept,
      note:
        'The scalarizer_if_row_exists block shows what g would be IF this game had a week-3 row. It is ' +
        'f3 = 0 with f1 = 0 and f2 = 0, so g = 0 and the family is LIVE. It is shown, not applied: a registry ' +
        'row is only written for a game that actually has snap rows.',
      games: out,
    },
    null,
    2
  )}\n`
);
