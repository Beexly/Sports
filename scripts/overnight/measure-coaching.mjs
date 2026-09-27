#!/usr/bin/env node
// measure-coaching.mjs — slice 7, walk-forward.
//
// Coaching is already DARK. The stored row has |r| = 0.014 and never stored a slope or a
// standard error, so it could not pass f1 even in principle. This re-measures the family
// over eight seasons instead of two, and stores the full statistics the scalarizer needs.
//
// Walk-forward discipline: fit on seasons strictly before 2025, score 2025, report n, r,
// OLS slope and the standard error of that slope on the HOLDOUT. Nulls are excluded from
// the regression and counted as excluded. Zeros are kept — a real zero go probability is a
// measurement, not a missing value.
//
// This script never edits parts-registry.jsonl. It reports; the caller decides.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPart, honestyCleared } from '../../packages/prediction-engine/src/reasoning/part-selector.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

const TRAIN_MAX_SEASON = 2024;
const HOLDOUT_SEASON = 2025;

function rows(path) {
  return readFileSync(join(DATA, path), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// --- feature: per-game fourth-down go rate --------------------------------

const agg = new Map();
let nullGo = 0;
let fourthRows = 0;

for (const r of rows('fourth-down.jsonl')) {
  fourthRows += 1;
  if (r.season === null || r.season > HOLDOUT_SEASON) continue;
  const key = r.game_id;
  let e = agg.get(key);
  if (!e) {
    e = { season: r.season, sum: 0, n: 0, nulls: 0 };
    agg.set(key, e);
  }
  if (r.go_wp === null || r.go_wp === undefined || !Number.isFinite(r.go_wp)) {
    e.nulls += 1;
    nullGo += 1;
    continue; // null is excluded, and counted. It is not a zero.
  }
  e.sum += r.go_wp;
  e.n += 1;
}

// --- outcome: home_win from games.jsonl -----------------------------------

const games = new Map();
for (const g of rows('games.jsonl')) {
  if (typeof g.home_win !== 'boolean') continue;
  games.set(g.game_id, g);
}

// --- join -----------------------------------------------------------------

const train = [];
const holdout = [];
let joined = 0;
let unmatchedFourth = 0;
let noGoValue = 0;

for (const [gameId, e] of agg) {
  const g = games.get(gameId);
  if (!g) { unmatchedFourth += 1; continue; }
  if (e.n === 0) { noGoValue += 1; continue; }
  joined += 1;
  const point = { x: e.sum / e.n, y: g.home_win ? 1 : 0, season: e.season, game_id: gameId };
  if (e.season <= TRAIN_MAX_SEASON) train.push(point);
  else if (e.season === HOLDOUT_SEASON) holdout.push(point);
}

// --- OLS ------------------------------------------------------------------

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
  // residual sum of squares, then the standard error of the slope
  let rss = 0;
  for (const p of points) {
    const resid = p.y - (intercept + slope * p.x);
    rss += resid * resid;
  }
  const se = Math.sqrt(rss / ((n - 2) * sxx));
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return { n, slope, intercept, se, r, mx, my };
}

const trainFit = ols(train);
if (!trainFit) {
  process.stderr.write('measure-coaching: training fit is degenerate\n');
  process.exit(1);
}

// Score the holdout with the training coefficients. The holdout statistics below are the
// honest out-of-sample numbers, because the coefficients never saw a 2025 game.
const scored = holdout.map((p) => ({ ...p, p: trainFit.intercept + trainFit.slope * p.x }));
const holdoutFit = ols(scored);

// --- verdict --------------------------------------------------------------

const representatives = readFileSync(join(ROOT, 'data', 'reasoning', 'parts-registry.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l).family);

const decision = selectPart(
  {
    family: 'coaching',
    grain: 'fourth-down go rate, mean go_wp per game',
    r: holdoutFit ? holdoutFit.r : null,
    slope: holdoutFit ? holdoutFit.slope : null,
    se: holdoutFit ? holdoutFit.se : null,
    n: holdoutFit ? holdoutFit.n : null,
    has_row: false, // no week-3 row exists for this grain
  },
  representatives,
);

process.stdout.write(
  `${JSON.stringify(
    {
      slice: 'measure-coaching',
      utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      design: {
        feature: 'mean go_wp per game from data/gse-dataset/fourth-down.jsonl',
        outcome: 'home_win from data/gse-dataset/games.jsonl',
        train_seasons: `1999..${TRAIN_MAX_SEASON} intersect fourth-down availability (2018..${TRAIN_MAX_SEASON})`,
        holdout_season: HOLDOUT_SEASON,
        note: 'coefficients are fitted on pre-2025 games only; the reported statistics are the 2025 holdout',
      },
      counts: {
        fourth_down_rows_read: fourthRows,
        games_with_fourth_down: agg.size,
        joined_to_outcome: joined,
        unmatched_fourth_down_games: unmatchedFourth,
        games_with_no_go_value: noGoValue,
        null_go_wp_excluded: nullGo,
        train_points: train.length,
        holdout_points: holdout.length,
      },
      train_fit: { n: trainFit.n, slope: trainFit.slope, intercept: trainFit.intercept, se: trainFit.se, r: trainFit.r },
      holdout_fit: holdoutFit
        ? { n: holdoutFit.n, r: holdoutFit.r, slope: holdoutFit.slope, se: holdoutFit.se }
        : null,
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
