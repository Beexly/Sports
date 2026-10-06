#!/usr/bin/env node
// scan-features.mjs — slice 9, deterministic.
//
// The work order warns that the document's 81+71+42+32+14 = 240 family labels are "a wish"
// and that padding the catalog to print 240 is a fail. The reliable way to honour that is to
// make the catalog a function of what is actually on disk: one row per grain whose header was
// genuinely read, and no row at all for anything not seen.
//
// HARD CONSTRAINT: as with scan-modules.mjs, this script can only emit `catalogued`. A grain
// becomes `wired` or `measured_zero` only when an agent fits it and records n, r, slope, se.

import { openSync, readSync, closeSync, writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

// Read just the first line of a JSONL file and parse it. Never loads the file.
function readHeader(file) {
  const path = join(DATA, file);
  if (!existsSync(path)) return null;
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const first = buf.subarray(0, n).toString('utf8').split('\n')[0];
    return { path, row: JSON.parse(first), keys: Object.keys(JSON.parse(first)) };
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

function countLines(file) {
  const path = join(DATA, file);
  if (!existsSync(path)) return null;
  const buf = Buffer.alloc(1 << 20);
  const fd = openSync(path, 'r');
  let lines = 0;
  let carry = '';
  try {
    for (;;) {
      const n = readSync(fd, buf, 0, buf.length, null);
      if (n <= 0) break;
      const text = carry + buf.subarray(0, n).toString('utf8');
      const parts = text.split('\n');
      carry = parts.pop() ?? '';
      lines += parts.length;
    }
  } finally {
    closeSync(fd);
  }
  if (carry.length > 0) lines += 1;
  return lines;
}

// Grain definitions are keyed off headers actually observed on disk, not off the document's
// 240-label wish list. `direction` is one of the 16; `signal_family` is one of the 8 in
// packages/types/src/signal-registry.ts. `none` is the correct answer when it is not clear.
const GRAIN_SPECS = [
  {
    file: 'contracts.jsonl',
    grain_id: 'player_contract',
    tier: 'player_week',
    direction: 'narrative_contract',
    signal_family: 'NARRATIVE',
    require: ['gsis_id', 'year_signed'],
    note: 'OverTheCap contract facts packaged by nflverse. Attribute the source in anything derived.',
  },
  {
    file: 'rosters.jsonl',
    grain_id: 'player_roster',
    tier: 'player_week',
    direction: 'none',
    signal_family: 'none',
    require: ['gsis_id', 'pfr_id'],
    note: 'Roster rows keyed by season + gsis_id. Join key for contracts and snaps.',
  },
  {
    file: 'snap-counts.jsonl',
    grain_id: 'player_game_snap',
    tier: 'player_week',
    direction: 'on_field_efficiency',
    signal_family: 'EFFICIENCY',
    require: ['pfr_player_id', 'game_id'],
    note: 'Snap counts carry pfr_player_id and game_id, never gsis_id. Do not invent a gsis_id.',
  },
  {
    file: 'participation.jsonl',
    grain_id: 'play_participation',
    tier: 'play',
    direction: 'none',
    signal_family: 'none',
    require: ['players_on_field'],
    note: 'players_on_field is parsed from the players_on_play release column. 2023+ is FTN via nflverse, CC-BY-SA 4.0.',
  },
  {
    file: 'fourth-down.jsonl',
    grain_id: 'play_fourth_down',
    tier: 'play',
    direction: 'coaching',
    signal_family: 'SITUATIONAL',
    require: ['play_id', 'game_id'],
    note: 'Precomputed nfl4th RDS columns. The R model was not ported. Null punt_wp stays null.',
  },
];

const rows = [];
const skipped = [];

for (const spec of GRAIN_SPECS) {
  const header = readHeader(spec.file);
  if (!header) {
    skipped.push({ file: spec.file, reason: 'file missing or first line unparseable' });
    continue;
  }
  // A grain enters the catalog only if its required keys were genuinely seen in the header.
  const missing = spec.require.filter((k) => !header.keys.includes(k));
  if (missing.length > 0) {
    skipped.push({ file: spec.file, reason: `required key(s) absent from header: ${missing.join(', ')}` });
    continue;
  }
  rows.push({
    grain_id: spec.grain_id,
    tier: spec.tier,
    direction: spec.direction,
    signal_family: spec.signal_family,
    source_file: `data/gse-dataset/${spec.file}`,
    status: 'catalogued',
    sample_count: countLines(spec.file),
    observed_keys: header.keys,
    note: spec.note,
  });
}

// The manifest is a meta-tier grain. Its sample count stays null; null is not zero.
const manifestPath = join(DATA, 'nflverse-ingest-manifest.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  rows.push({
    grain_id: 'nflverse_ingest_manifest',
    tier: 'meta',
    direction: 'none',
    signal_family: 'none',
    source_file: 'data/gse-dataset/nflverse-ingest-manifest.json',
    status: 'catalogued',
    sample_count: null,
    observed_keys: Object.keys(manifest),
    note: `Seasons on disk: ${JSON.stringify(manifest.seasons ?? null)}. publishes_pick=${manifest.publishes_pick}. Sample count stays null; null is not zero.`,
  });
}

const outPath = join(ROOT, 'data', 'reasoning', 'feature-catalog.jsonl');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      out: outPath,
      rows: rows.length,
      skipped,
      note: 'Row count is derived from headers actually read. It is well under 240 by design; 240 was a wish, not a target.',
    },
    null,
    2
  )}\n`
);
