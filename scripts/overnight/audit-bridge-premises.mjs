#!/usr/bin/env node
// Overnight slice 2: audit data/gse-dataset/bridge-premises.jsonl before anyone
// trusts a probability in it. Read-only. Deletes nothing. Feeds nothing into
// aggregateSignals.

import fs from 'node:fs';
import path from 'node:path';

const root = 'data/gse-dataset';
const rows = fs.readFileSync(path.join(root, 'bridge-premises.jsonl'), 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

const bySignal = {};
const bySample = {};
const byMethod = {};
let outside = 0;
const seen = new Set();
let dupGame = 0;
for (const r of rows) {
  bySignal[r.signal_id] = (bySignal[r.signal_id] ?? 0) + 1;
  bySample[r.sample_count] = (bySample[r.sample_count] ?? 0) + 1;
  byMethod[r.method] = (byMethod[r.method] ?? 0) + 1;
  if (!(typeof r.probability === 'number' && r.probability > 0 && r.probability < 1)) outside++;
  if (seen.has(r.game_id)) dupGame++;
  seen.add(r.game_id);
}

const seasonsIn = (file, field = 'season') => {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return null;
  const dist = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const v = JSON.parse(line)[field];
    dist[v] = (dist[v] ?? 0) + 1;
  }
  return dist;
};

const gameIds = (file) => {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return null;
  const s = new Set();
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (line.trim()) s.add(JSON.parse(line).game_id);
  }
  return s;
};

const report = {
  rows: rows.length,
  distinct_game_ids: seen.size,
  duplicate_game_id_rows: dupGame,
  signal_ids: bySignal,
  methods: byMethod,
  sample_count_distribution: bySample,
  distinct_sample_counts: Object.keys(bySample).length,
  probability_outside_open_unit_interval: outside,
  probability_min: Math.min(...rows.map((r) => r.probability)),
  probability_max: Math.max(...rows.map((r) => r.probability)),
  features_seasons: seasonsIn('features.jsonl'),
  holdout_seasons: seasonsIn('holdout.jsonl'),
};

const holdoutIds = gameIds('holdout.jsonl');
const premIds = new Set(rows.map((r) => r.game_id));
report.premise_games_all_in_holdout = holdoutIds ? [...premIds].every((g) => holdoutIds.has(g)) : null;
report.premise_games_not_in_holdout = holdoutIds ? [...premIds].filter((g) => !holdoutIds.has(g)).slice(0, 10) : null;

const seasons = report.features_seasons ? Object.keys(report.features_seasons).map(Number).sort() : [];
report.training_seasons_used = seasons.filter((s) => s < 2025);
report.any_premise_row_is_2025 = rows.some((r) => r.game_id.startsWith('2025_'));

console.log(JSON.stringify(report, null, 2));
fs.mkdirSync('docs/reasoning', { recursive: true });
fs.writeFileSync('docs/reasoning/bridge-premises-audit-2026-09-27.json', JSON.stringify(report, null, 2) + '\n');
