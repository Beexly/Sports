#!/usr/bin/env node
// Structural assertions for the nflverse grains, streamed a line at a time so a
// 53 MB participation file never lands in the heap. Completes overnight slice 1
// after hash-jsonl.mjs has proven the bytes are the bytes.
//
// Usage: node verify-shape.mjs [--root data/gse-dataset]

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

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
{
  const m = JSON.parse(fs.readFileSync(path.join(root, 'nflverse-ingest-manifest.json'), 'utf8'));
  check('manifest.publishes_pick === false', m.publishes_pick === false, `got ${JSON.stringify(m.publishes_pick)}`);
  check('manifest.seasons is [2024,2025]', Array.isArray(m.seasons) && m.seasons.join(',') === '2024,2025', `got ${JSON.stringify(m.seasons)}`);
}

// 2. a participation row carries players_on_field as an array
{
  const r = await firstRow('participation.jsonl');
  const ok = r && Array.isArray(r.players_on_field);
  check('participation.players_on_field is an array', !!ok, ok ? `len=${r.players_on_field.length}, game=${r.nflverse_game_id ?? r.game_id}, play=${r.play_id}` : 'missing/not array');
  // the release column is players_on_play; storing it under a different name is expected
  check('participation row has no players_on_play key', r && !('players_on_play' in r), r && 'players_on_play' in r ? 'present' : 'absent');
}

// 3. a snap row has NO gsis_id
{
  const r = await firstRow('snap-counts.jsonl');
  check('snap-counts has pfr_player_id', r && 'pfr_player_id' in r, r ? String(r.pfr_player_id) : 'no row');
  check('snap-counts has NO gsis_id', r && !('gsis_id' in r), r && 'gsis_id' in r ? 'PRESENT (prompt says it must be absent)' : 'absent as required');
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
