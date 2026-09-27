#!/usr/bin/env node
// measure-narrative.mjs — the next honest slice.
//
// narrative_contract has been DARK for a reason that is now out of date. The stored reason
// was "contracts were absent when this was scored". Contracts are on disk for 2018-2025
// (35,944 rows, sealed at 58f16653c7489e0a), so the family can finally be tested properly.
//
// Walk-forward, and this time the regressor is the frozen pre-2025 model's prediction, not
// the raw feature. That distinction is the bug the last review caught in measure-coaching,
// and it is the whole point of a holdout: the coefficients must be produced without seeing
// 2025, and the reported statistics must describe how that frozen model performed on 2025.
//
// Feature: the snap-weighted contract intensity gap. For each game, per team, the snap-share
// weighted mean APY of that team's players who were under contract that season; the feature
// is home minus away. It is a real incentive exposure, computed from sealed data, with no
// invented field and no market price anywhere in it.
//
// Chain: snaps(pfr_player_id) -> rosters(pfr_id + season) -> contracts(gsis_id), with the
// contract required to actually cover the season. A contract whose signed span does not
// cover the season is not that player's current deal and is not used.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPart, honestyCleared } from '../../packages/prediction-engine/src/reasoning/part-selector.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

const TRAIN_MAX = 2024;
const HOLDOUT = 2025;

function rows(path) {
  const full = join(DATA, path);
  if (!existsSync(full)) return [];
  return readFileSync(full, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// --- contracts active in each season --------------------------------------

// contractSeasons[season] = Map(gsis_id -> apy). A deal covers year_signed .. year_signed+years-1.
const contractSeasons = new Map();
let contractsNoLength = 0;
for (const c of rows('contracts.jsonl')) {
  if (typeof c.gsis_id !== 'string' || c.gsis_id.trim() === '') continue;
  if (!Number.isFinite(c.apy)) continue;
  const signed = c.year_signed;
  if (!Number.isFinite(signed)) continue;
  // years null is never given a guessed length: a deal of unknown length is a single-season
  // fact at most, and is treated as covering its signing year alone.
  const len = Number.isFinite(c.years) && c.years > 0 ? c.years : 1;
  if (!Number.isFinite(c.years) || c.years <= 0) contractsNoLength += 1;
  for (let s = signed; s <= signed + len - 1; s += 1) {
    let m = contractSeasons.get(s);
    if (!m) { m = new Map(); contractSeasons.set(s, m); }
    const prev = m.get(c.gsis_id);
    if (prev === undefined || c.apy > prev) m.set(c.gsis_id, c.apy);
  }
}

// --- roster pfr_id -> gsis_id per season ----------------------------------

const pfrToGsis = new Map(); // season -> Map(pfr_id -> gsis_id)
for (const r of rows('rosters.jsonl')) {
  if (!Number.isFinite(r.season)) continue;
  if (typeof r.pfr_id !== 'string' || r.pfr_id.trim() === '') continue;
  if (typeof r.gsis_id !== 'string' || r.gsis_id.trim() === '') continue;
  let m = pfrToGsis.get(r.season);
  if (!m) { m = new Map(); pfrToGsis.set(r.season, m); }
  if (!m.has(r.pfr_id)) m.set(r.pfr_id, r.gsis_id);
}

// --- snaps -> per game, per team, snap-weighted mean APY -------------------

const acc = new Map(); // game_id -> Map(team -> {snaps, apyWeighted, matched, unmatched})
let snapRows = 0;
let snapsNoRoster = 0;
let snapsNoContract = 0;

for (const s of rows('snap-counts.jsonl')) {
  snapRows += 1;
  const snaps = (s.offense_snaps ?? 0) + (s.defense_snaps ?? 0) + (s.st_snaps ?? 0);
  if (!Number.isFinite(snaps) || snaps <= 0) continue;
  const gm = pfrToGsis.get(s.season);
  const gsis = gm ? gm.get(s.pfr_player_id) : undefined;
  if (gsis === undefined) { snapsNoRoster += 1; continue; }
  const cm = contractSeasons.get(s.season);
  const apy = cm ? cm.get(gsis) : undefined;
  let g = acc.get(s.game_id);
  if (!g) { g = new Map(); acc.set(s.game_id, g); }
  let t = g.get(s.team);
  if (!t) { t = { snaps: 0, weighted: 0, matched: 0, unmatched: 0 }; g.set(s.team, t); }
  t.snaps += snaps;
  if (apy === undefined) { t.unmatched += snaps; continue; }
  t.weighted += apy * snaps;
  t.matched += snaps;
}

// --- outcome ---------------------------------------------------------------

const games = new Map();
for (const g of rows('games.jsonl')) {
  if (typeof g.home_win === 'boolean') games.set(g.game_id, g);
}

// --- join to a per-game feature -------------------------------------------

const train = [];
const holdout = [];
let noBothTeams = 0;
let nullApyTeam = 0;

for (const [gameId, byTeam] of acc) {
  const g = games.get(gameId);
  if (!g) continue;
  if (byTeam.size < 2) { noBothTeams += 1; continue; }
  const per = new Map();
  let anyNull = false;
  for (const [team, t] of byTeam) {
    // A team with snaps but zero contracted players has no intensity. That is a missing
    // measurement, not a zero, so the game is dropped rather than invented.
    if (t.matched === 0) { anyNull = true; break; }
    per.set(team, t.weighted / t.matched);
  }
  if (anyNull) { nullApyTeam += 1; continue; }
  const home = per.get(g.home_team);
  const away = per.get(g.away_team);
  if (home === undefined || away === undefined) { noBothTeams += 1; continue; }
  const point = { x: home - away, y: g.home_win ? 1 : 0, season: g.season, game_id: gameId };
  if (g.season <= TRAIN_MAX) train.push(point);
  else if (g.season === HOLDOUT) holdout.push(point);
}

function ols(points) {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) {
    const dx = p.x - mx, dy = p.y - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let rss = 0;
  for (const p of points) rss += (p.y - (intercept + slope * p.x)) ** 2;
  return { n, slope, intercept, se: Math.sqrt(rss / ((n - 2) * sxx)), r: sxy / Math.sqrt(sxx * syy) };
}

const trainFit = ols(train);
if (!trainFit) {
  process.stderr.write('measure-narrative: training fit is degenerate\n');
  process.exit(1);
}

// The regressor is the FROZEN pre-2025 model's prediction. Passing the raw feature here
// would refit on the holdout and then score it against itself.
const scored = holdout.map((row) => ({ x: trainFit.intercept + trainFit.slope * row.x, y: row.y }));
const holdoutFit = ols(scored);

const representatives = rows.length === 0 ? [] : readFileSync(join(ROOT, 'data', 'reasoning', 'parts-registry.jsonl'), 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).family);

const decision = selectPart(
  {
    family: 'narrative_contract',
    grain: 'snap-weighted mean APY gap between home and away, contracts covering the season',
    r: holdoutFit ? holdoutFit.r : null,
    slope: holdoutFit ? holdoutFit.slope : null,
    se: holdoutFit ? holdoutFit.se : null,
    n: holdoutFit ? holdoutFit.n : null,
    has_row: false,
  },
  representatives,
);

process.stdout.write(
  `${JSON.stringify(
    {
      slice: 'measure-narrative',
      utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      design: {
        feature: 'per game, snap-weighted mean APY of contracted players, home minus away',
        chain: 'snap-counts.pfr_player_id -> rosters.pfr_id+season -> contracts.gsis_id, contract required to cover the season',
        outcome: 'home_win from games.jsonl',
        regressor_on_holdout: 'frozen pre-2025 model prediction (not the raw feature)',
        train: `2018-2024, n=${train.length}`,
        holdout: `2025, n=${holdout.length}`,
      },
      counts: {
        contracts_without_length_treated_as_single_season: contractsNoLength,
        snap_rows: snapRows,
        snaps_no_roster_match: snapsNoRoster,
        games_dropped_missing_a_team: noBothTeams,
        games_dropped_a_team_with_no_contracted_snaps: nullApyTeam,
        train_points: train.length,
        holdout_points: holdout.length,
      },
      train_fit: { n: trainFit.n, r: trainFit.r, slope: trainFit.slope, se: trainFit.se, intercept: trainFit.intercept },
      holdout_fit: holdoutFit ? { n: holdoutFit.n, r: holdoutFit.r, slope: holdoutFit.slope, se: holdoutFit.se } : null,
      honesty_cleared: honestyCleared({
        r: holdoutFit ? holdoutFit.r : null,
        slope: holdoutFit ? holdoutFit.slope : null,
        se: holdoutFit ? holdoutFit.se : null,
        n: holdoutFit ? holdoutFit.n : null,
      }),
      decision,
    },
    null,
    2
  )}\n`
);
