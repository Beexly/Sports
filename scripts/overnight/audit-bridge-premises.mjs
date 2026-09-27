#!/usr/bin/env node
// audit-bridge-premises.mjs — slice 2, deterministic.
//
// The work order flags data/gse-dataset/bridge-premises.jsonl as unaudited, with a constant
// sample_count of 6955 sitting on 2025 week-1 rows. A constant sample count on holdout rows
// is the smell; this script measures the shape of the file so the conclusion is a number and
// not an impression.
//
// READ-ONLY. This script never writes to data/gse-dataset and never calls aggregateSignals.
// FORBIDDEN: the file must not be piped into the live edge unless selectPart returns LIVE on
// a fit that was not trained on 2025.

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const FILE = join(ROOT, 'data', 'gse-dataset', 'bridge-premises.jsonl');

const signalIds = new Map();
const sampleCounts = new Map();
const methods = new Map();
const gameIds = new Map();
const seasons = new Map();
const years = new Map();

let rows = 0;
let parseErrors = 0;
let probOutside01 = 0;
let nullProbability = 0;
let duplicateGameIdRows = 0;
let probFields = new Set();
let keySet = new Set();
let exampleRow = null;
let gamesWithMultipleRows = 0;

// A probability-bearing field is any key matching /prob|p$/i. The first row fixes the shape;
// later rows are checked against it so a schema drift is visible rather than silent.
const PROB_RE = /prob|p$/i;

for await (const line of createInterface({ input: createReadStream(FILE, { encoding: 'utf8' }), crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    parseErrors += 1;
    continue;
  }
  rows += 1;
  if (exampleRow === null) exampleRow = row;
  for (const k of Object.keys(row)) keySet.add(k);

  const bump = (map, key) => map.set(String(key), (map.get(String(key)) ?? 0) + 1);

  if (row.signal_id !== undefined) bump(signalIds, row.signal_id);
  if (row.sample_count !== undefined) bump(sampleCounts, row.sample_count);
  if (row.method !== undefined) bump(methods, row.method);
  if (row.season !== undefined) bump(seasons, row.season);
  if (row.year !== undefined) bump(years, row.year);

  for (const [k, v] of Object.entries(row)) {
    if (!PROB_RE.test(k)) continue;
    probFields.add(k);
    if (v === null || v === undefined) { nullProbability += 1; continue; }
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 1) probOutside01 += 1;
  }

  if (row.game_id !== undefined) {
    bump(gameIds, row.game_id);
  }
}

for (const count of gameIds.values()) if (count > 1) { gamesWithMultipleRows += 1; duplicateGameIdRows += count - 1; }

const top = (m, n = 15) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, rows: v }));

const distinctSampleCounts = sampleCounts.size;
const constantSampleCount = distinctSampleCounts === 1 ? [...sampleCounts.keys()][0] : null;

const out = {
  slice: 'audit-bridge-premises',
  file: 'data/gse-dataset/bridge-premises.jsonl',
  utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  rows,
  parse_errors: parseErrors,
  distinct_keys: [...keySet].sort(),
  probability_fields: [...probFields].sort(),
  signal_ids: { distinct: signalIds.size, top: top(signalIds, 30) },
  methods: { distinct: methods.size, top: top(methods) },
  sample_count: {
    distinct: distinctSampleCounts,
    constant_value: constantSampleCount,
    distribution: top(sampleCounts, 10),
  },
  seasons: { distinct: seasons.size, top: top(seasons) },
  year_field: { distinct: years.size, top: top(years) },
  distinct_game_ids: gameIds.size,
  games_with_multiple_rows: gamesWithMultipleRows,
  duplicate_game_id_rows: duplicateGameIdRows,
  probabilities_outside_0_1: probOutside01,
  null_probabilities: nullProbability,
  example_row: exampleRow,
};

out.findings = [];

if (constantSampleCount !== null) {
  out.findings.push(
    `sample_count is the single value ${constantSampleCount} on all ${rows} rows. A sample count that does not vary per game is not a per-game sample size; it is one training-set size stamped onto every row.`
  );
}
if (gamesWithMultipleRows > 0) {
  out.findings.push(
    `${duplicateGameIdRows} rows share a game_id with another row across ${gamesWithMultipleRows} games, so game_id is not a unique key in this file.`
  );
}
if (probOutside01 > 0) {
  out.findings.push(`${probOutside01} probability values fall outside [0,1] or are not finite.`);
}

out.disposition = constantSampleCount !== null
  ? 'NOT A PER-GAME SAMPLE. Do not score as a holdout. Do not pipe into aggregateSignals.'
  : 'Shape is not obviously degenerate; the writer still has to be found before any trust.';

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
