#!/usr/bin/env node
// verify-files.mjs — slice 1, deterministic.
//
// This was first written as verify-files.ps1, because the work order's multi-line
// `python -c` heredoc does not survive PowerShell argument passing. It could not be
// committed: .gitignore:195 ignores *.ps1, and AGENTS.md law 2 forbids editing .gitignore.
// A script nobody can commit is a script the next agent does not have, so the hasher is a
// .mjs like the rest of the harness. That also removes the PowerShell 5.1-versus-7 question
// entirely, and there is no shell between this file and the filesystem.
//
// Expected rows/bytes/sha256 come from data/gse-dataset/nflverse-ingest-manifest.json —
// the same seal the ingest writer produced. A frozen hash table here is a landmine: the
// moment season-extension rewrites the JSONL, a hardcoded 2024-2025 digest fails against
// a correct ingest and the next agent "fixes" it by loosening the check. A missing seal
// is STUCK, not a skip.
//
// Exits non-zero if any hash, row count, byte count, or structural assertion fails.
// Emits JSON on stdout so the caller can quote it in the audit row.

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { stat, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const DATA = join(ROOT, 'data', 'gse-dataset');

async function sha256(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => h.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });
}

// Streams line-by-line, because participation.jsonl is tens of MB and must not be read whole.
async function countLines(path) {
  return new Promise((resolve, reject) => {
    let n = 0;
    createInterface({ input: createReadStream(path), crlfDelay: Infinity })
      .on('line', () => { n += 1; })
      .on('error', reject)
      .on('close', () => resolve(n));
  });
}

async function readFirstJsonLine(path) {
  const stream = createReadStream(path, { encoding: 'utf8' });
  for await (const chunk of stream) {
    const line = chunk.split('\n')[0];
    if (line && line.trim().length > 0) return JSON.parse(line);
  }
  throw new Error(`${path} produced no parsable first line`);
}

const failures = [];
const files = [];
const checks = {};

const manifestPath = join(DATA, 'nflverse-ingest-manifest.json');
let manifest = null;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  checks.manifest_present = true;
} catch (e) {
  checks.manifest_present = false;
  failures.push(`nflverse-ingest-manifest.json: ${e.message}`);
}

// --- seal the datasets against the writer's own manifest --------------------

const datasets = Array.isArray(manifest?.datasets) ? manifest.datasets : [];
const expectedSeals = [];
for (const d of datasets) {
  const name = typeof d?.name === 'string' ? d.name : null;
  const path = typeof d?.path === 'string' ? d.path : null;
  if (!name || !path) {
    failures.push(`manifest dataset missing name/path: ${JSON.stringify(d).slice(0, 80)}`);
    continue;
  }
  const file = path.replace(/^.*[\\/]/, '');
  if (typeof d.sha256 !== 'string' || d.sha256.length !== 64) {
    failures.push(`${file}: manifest has no sha256 seal — cannot verify`);
    continue;
  }
  if (typeof d.rows !== 'number' || typeof d.bytes !== 'number') {
    failures.push(`${file}: manifest has no rows/bytes seal — cannot verify`);
    continue;
  }
  expectedSeals.push({ file, name, rows: d.rows, bytes: d.bytes, sha256: d.sha256 });
}

if (expectedSeals.length === 0 && failures.length === 0) {
  failures.push('manifest datasets produced no verifiable seals');
}
checks.seal_source = 'manifest.datasets[].{sha256,rows,bytes}';
checks.seal_count = expectedSeals.length;

for (const e of expectedSeals) {
  const path = join(DATA, e.file);
  let st;
  try {
    st = await stat(path);
  } catch {
    failures.push(`${e.file}: MISSING`);
    files.push({ file: e.file, present: false });
    continue;
  }

  const [actualHash, actualRows] = await Promise.all([sha256(path), countLines(path)]);
  const hashOk = actualHash === e.sha256;
  const bytesOk = st.size === e.bytes;
  const rowsOk = actualRows === e.rows;

  if (!hashOk) failures.push(`${e.file}: sha256 MISMATCH expected=${e.sha256} actual=${actualHash}`);
  if (!bytesOk) failures.push(`${e.file}: bytes MISMATCH expected=${e.bytes} actual=${st.size}`);
  if (!rowsOk) failures.push(`${e.file}: rows MISMATCH expected=${e.rows} actual=${actualRows}`);

  files.push({
    file: e.file,
    present: true,
    sha256: actualHash,
    sha256_ok: hashOk,
    bytes: st.size,
    bytes_ok: bytesOk,
    rows: actualRows,
    rows_ok: rowsOk,
  });
}

// --- structural assertions -------------------------------------------------

checks.publishes_pick = manifest?.publishes_pick ?? null;
checks.publishes_pick_ok = manifest?.publishes_pick === false;
checks.seasons = manifest?.seasons ?? null;
if (manifest && manifest.publishes_pick !== false) {
  failures.push(`manifest publishes_pick is ${JSON.stringify(manifest.publishes_pick)}, must be false`);
}

// A participation row carries players_on_field as an array.
try {
  const row = await readFirstJsonLine(join(DATA, 'participation.jsonl'));
  checks.participation_players_on_field_is_array = Array.isArray(row.players_on_field);
  checks.participation_first_game_id = row.nflverse_game_id ?? null;
  checks.participation_first_play_id = row.play_id ?? null;
  checks.participation_first_player_count = Array.isArray(row.players_on_field) ? row.players_on_field.length : null;
  if (!Array.isArray(row.players_on_field)) failures.push('participation.jsonl: players_on_field is not an array');
} catch (e) {
  failures.push(`participation.jsonl: ${e.message}`);
}

// A snap row must NOT have gsis_id.
try {
  const row = await readFirstJsonLine(join(DATA, 'snap-counts.jsonl'));
  const keys = Object.keys(row);
  checks.snap_keys = keys;
  checks.snap_has_gsis_id = keys.includes('gsis_id');
  if (keys.includes('gsis_id')) failures.push('snap-counts.jsonl: unexpected gsis_id column present');
} catch (e) {
  failures.push(`snap-counts.jsonl: ${e.message}`);
}

// A fourth-down row may carry punt_wp: null. Null is not a zero.
try {
  const row = await readFirstJsonLine(join(DATA, 'fourth-down.jsonl'));
  const keys = Object.keys(row);
  checks.fourth_down_has_punt_wp = keys.includes('punt_wp');
  checks.fourth_down_punt_wp_is_null = row.punt_wp === null;
  if (!keys.includes('punt_wp')) failures.push('fourth-down.jsonl: no punt_wp column');
} catch (e) {
  failures.push(`fourth-down.jsonl: ${e.message}`);
}

const out = {
  slice: 'verify-files',
  root: ROOT,
  utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  files,
  checks,
  failures,
  verdict: failures.length === 0 ? 'PASS' : 'STUCK',
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
process.exit(failures.length === 0 ? 0 : 1);
