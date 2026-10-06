#!/usr/bin/env node
// measure-narrative.mjs — narrative_contract, walk-forward.
//
// Ported to read the ingest manifest rather than a hardcoded file list, so the same script
// works whether the grains live in one combined file or one file per season. Two lanes built
// different layouts; the manifest is the only thing both agree on.
//
// The regressor on the holdout is the FROZEN pre-2025 model's prediction, never the raw
// feature. Feeding ols() the feature instead refits on the holdout and then scores it against
// itself, which is the bug a review caught in the coaching measurement. Check what the
// fitting function reads, not what was computed.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPart, honestyCleared } from '../../packages/prediction-engine/src/reasoning/part-selector.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

const TRAIN_MAX = 2024;
const HOLDOUT = 2025;

const manifest = JSON.parse(readFileSync(join(DATA, 'nflverse-ingest-manifest.json'), 'utf8'));

/** Every data file the manifest attributes to a dataset name prefix. */
function filesFor(prefix) {
  return manifest.datasets
    .filter((d) => d.name === prefix || d.name.startsWith(`${prefix}-`))
    .map((d) => d.path.replace(/^data\/gse-dataset\//, ''))
    .filter((f) => existsSync(join(DATA, f)));
}

function rowsIn(file) {
  return readFileSync(join(DATA, file), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function rowsFor(prefix) {
  return filesFor(prefix).flatMap(rowsIn);
}

const contracts = rowsFor('contracts');
const snaps = rowsFor('snap-counts');
const rosters = rowsFor('rosters');

// --- contracts active in each season ---------------------------------------

// A deal covers year_signed .. year_signed+years-1. A null or non-positive `years` is never
// given a guessed length; it covers its signing year alone.
const contractSeasons = new Map();
let contractsNoLength = 0;
for (const c of contracts) {
  if (typeof c.gsis_id !== 'string' || c.gsis_id.trim() === '') continue;
  if (!Number.isFinite(c.apy) || !Number.isFinite(c.year_signed)) continue;
  const len = Number.isFinite(c.years) && c.years > 0 ? c.years : 1;
  if (!(Number.isFinite(c.years) && c.years > 0)) contractsNoLength += 1;
  for (let s = c.year_signed; s <= c.year_signed + len - 1; s += 1) {
    let m = contractSeasons.get(s);
    if (!m) { m = new Map(); contractSeasons.set(s, m); }
    const prev = m.get(c.gsis_id);
    if (prev === undefined || c.apy > prev) m.set(c.gsis_id, c.apy);
  }
}

// --- roster pfr_id -> gsis_id per season -----------------------------------

const pfrToGsis = new Map();
for (const r of rosters) {
  if (!Number.isFinite(r.season)) continue;
  if (typeof r.pfr_id !== 'string' || r.pfr_id.trim() === '') continue;
  if (typeof r.gsis_id !== 'string' || r.gsis_id.trim() === '') continue;
  let m = pfrToGsis.get(r.season);
  if (!m) { m = new Map(); pfrToGsis.set(r.season, m); }
  if (!m.has(r.pfr_id)) m.set(r.pfr_id, r.gsis_id);
}

// --- snaps -> snap-weighted mean APY per team per game ---------------------

const acc = new Map();
let snapsNoRoster = 0;
for (const s of snaps) {
  const n = (s.offense_snaps ?? 0) + (s.defense_snaps ?? 0) + (s.st_snaps ?? 0);
  if (!Number.isFinite(n) || n <= 0) continue;
  const rm = pfrToGsis.get(s.season);
  const gsis = rm ? rm.get(s.pfr_player_id) : undefined;
  if (gsis === undefined) { snapsNoRoster += 1; continue; }
  const cm = contractSeasons.get(s.season);
  const apy = cm ? cm.get(gsis) : undefined;
  let g = acc.get(s.game_id);
  if (!g) { g = new Map(); acc.set(s.game_id, g); }
  let t = g.get(s.team);
  if (!t) { t = { snaps: 0, weighted: 0, matched: 0 }; g.set(s.team, t); }
  t.snaps += n;
  if (apy === undefined) continue;
  t.weighted += apy * n;
  t.matched += n;
}

const games = new Map(rowsIn('games.jsonl').map((g) => [g.game_id, g]));

const train = [];
const holdout = [];
let droppedNoTeam = 0;
let droppedNoContract = 0;
for (const [gameId, byTeam] of acc) {
  const g = games.get(gameId);
  if (!g) continue;
  const per = new Map();
  let anyMissing = false;
  for (const [team, t] of byTeam) {
    if (t.matched === 0) { anyMissing = true; break; }
    per.set(team, t.weighted / t.matched);
  }
  if (anyMissing) { droppedNoContract += 1; continue; }
  const home = per.get(g.home_team);
  const away = per.get(g.away_team);
  if (home === undefined || away === undefined) { droppedNoTeam += 1; continue; }
  const point = { x: home - away, y: g.home_win ? 1 : 0, season: g.season };
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
if (!trainFit) { process.stderr.write('measure-narrative: degenerate training fit\n'); process.exit(1); }

// The regressor is the frozen model's prediction. This is the line the review made me write
// differently in measure-coaching.mjs.
const scored = holdout.map((row) => ({ x: trainFit.intercept + trainFit.slope * row.x, y: row.y }));
const holdoutFit = ols(scored);

const registry = rowsIn('../reasoning/parts-registry.jsonl').map((r) => r.family);

const decision = selectPart(
  {
    family: 'narrative_contract',
    grain: 'snap-weighted mean APY gap, contracts covering the season',
    r: holdoutFit ? holdoutFit.r : null,
    slope: holdoutFit ? holdoutFit.slope : null,
    se: holdoutFit ? holdoutFit.se : null,
    n: holdoutFit ? holdoutFit.n : null,
    has_row: false,
  },
  registry,
);

process.stdout.write(
  `${JSON.stringify(
    {
      slice: 'measure-narrative',
      utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      layout: { contracts: filesFor('contracts').length, rosters: filesFor('rosters').length, snaps: filesFor('snap-counts').length },
      counts: {
        contracts_without_length: contractsNoLength,
        snap_rows: snaps.length,
        snaps_no_roster_match: snapsNoRoster,
        games_dropped_a_team_with_no_contracted_snaps: droppedNoContract,
        games_dropped_missing_a_team: droppedNoTeam,
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
