#!/usr/bin/env node
// Structural assertions for the nflverse grains, streamed a line at a time so a
// 53 MB participation file never lands in the heap. Completes overnight slice 1
// after hash-jsonl.mjs has proven the bytes are the bytes.
//
// Usage: node verify-shape.mjs [--root data/gse-dataset]

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { INGEST_SEASONS } from '../../packages/data-ingestion/src/nflverse/rows.ts';

const argv = process.argv.slice(2);
const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : 'data/gse-dataset';

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

async function* lines(file) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const l of rl) if (l.trim()) yield JSON.parse(l);
}

async function firstRow(file) {
  for await (const r of lines(path.join(root, file))) return r;
  return null;
}

// 1. manifest publishes_pick is false
//
// The season assertion is derived from INGEST_SEASONS, not hardcoded. It used to assert the
// literal [2024,2025] and to read a single participation.jsonl, both of which went stale the
// moment the corpus widened to eight seasons and the layout became one file per season. A
// verifier that fails on the data it was written to verify is worse than no verifier: it
// trains you to ignore it.
{
  const m = JSON.parse(fs.readFileSync(path.join(root, 'nflverse-ingest-manifest.json'), 'utf8'));
  check('manifest.publishes_pick === false', m.publishes_pick === false, `got ${JSON.stringify(m.publishes_pick)}`);
  check(
    'manifest.seasons matches INGEST_SEASONS',
    Array.isArray(m.seasons) && m.seasons.join(',') === INGEST_SEASONS.join(','),
    `manifest ${JSON.stringify(m.seasons)} vs INGEST_SEASONS ${JSON.stringify(INGEST_SEASONS)}`,
  );
  check('2025 is the holdout and is present', m.seasons.includes(2025), `seasons ${m.seasons.length}`);
  check('2026 is the application season and is present', m.seasons.includes(2026), `seasons ${m.seasons.length}`);
}

const fileFor = (prefix) => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'nflverse-ingest-manifest.json'), 'utf8'));
  const ds = m.datasets.filter((d) => d.name === prefix || d.name.startsWith(`${prefix}-`));
  return ds.map((d) => path.basename(d.path));
};

// 2. a participation row carries players_on_field as an array
//
// The array is not on the first row of every season. players_on_field is null where the
// release left the cell blank, and blank stays blank, so the assertion scans until it finds
// a real row and reports how many nulls it walked past. Asserting on row 1 passed only while
// the corpus was a single 2024/2025 file whose first row happened to be populated.
{
  const first = fileFor('participation')[0];
  if (!first) {
    check('participation dataset is listed in the manifest', false, 'no participation file found');
  } else {
    let found = null;
    let nulls = 0;
    let scanned = 0;
    for await (const r of lines(path.join(root, first))) {
      scanned += 1;
      if (r.players_on_field === null || r.players_on_field === undefined) { nulls += 1; continue; }
      if (Array.isArray(r.players_on_field)) { found = r; break; }
    }
    check(
      'participation.players_on_field is an array somewhere in the file',
      !!found,
      found
        ? `${first}: len=${found.players_on_field.length}, game=${found.nflverse_game_id ?? found.game_id}, play=${found.play_id} (walked past ${nulls} null row(s) in ${scanned} scanned)`
        : `${first}: no array found in ${scanned} rows`,
    );
    // the release column is players_on_play; storing it under a different name is expected
    check('participation row has no players_on_play key', found && !('players_on_play' in found), found && 'players_on_play' in found ? 'present' : 'absent');
  }
}

// 3. a snap row has NO gsis_id
{
  const first = fileFor('snap-counts')[0];
  if (!first) {
    check('snap-counts dataset is listed in the manifest', false, 'no snap-counts file found');
  } else {
    const r = await firstRow(first);
    check('snap-counts has pfr_player_id', r && 'pfr_player_id' in r, r ? String(r.pfr_player_id) : 'no row');
    check('snap-counts has NO gsis_id', r && !('gsis_id' in r), r && 'gsis_id' in r ? 'PRESENT (prompt says it must be absent)' : 'absent as required');
  }
}

// 4. a fourth-down row can carry punt_wp: null, and play_id is an integer
{
  let sawNullPunt = false;
  let sawPlayIdInt = false;
  let nulls = 0;
  let total = 0;
  for await (const r of lines(path.join(root, 'fourth-down.jsonl'))) {
    total++;
    if (r.punt_wp === null) { nulls++; sawNullPunt = true; }
    if (Number.isInteger(r.play_id)) sawPlayIdInt = true;
    if (sawNullPunt && sawPlayIdInt) break;
  }
  check('fourth-down can hold punt_wp: null', sawNullPunt, `${nulls}/${total} scanned had null punt_wp`);
  check('fourth-down play_id is an integer', sawPlayIdInt);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'}: ${results.length - failed.length}/${results.length} structural assertions`);
process.exit(failed.length === 0 ? 0 : 1);
