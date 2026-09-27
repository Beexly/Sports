#!/usr/bin/env node
// verify-files.mjs â€” slice 1, deterministic.
//
// This was first written as verify-files.ps1, because the work order's multi-line
// `python -c` heredoc does not survive PowerShell argument passing. It could not be
// committed: .gitignore:195 ignores *.ps1, and AGENTS.md law 2 forbids editing .gitignore.
// A script nobody can commit is a script the next agent does not have, so the hasher is a
// .mjs like the rest of the harness. That also removes the PowerShell 5.1-versus-7 question
// entirely, and there is no shell between this file and the filesystem.
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

// Expected values are read from the ingest manifest, which is the seal the ingest
// itself wrote. This is deliberately NOT a hardcoded table: a hand-typed table would be a
// transcription of the same run, so a mistake in it would look like a corrupt file. Reading
// the manifest keeps the check meaningful â€” the hashes on disk are recomputed and compared
// against what the ingest recorded, and rows must equal kept for every dataset.
const MANIFEST = join(DATA, 'nflverse-ingest-manifest.json');
let EXPECTED = [];
try {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  EXPECTED = manifest.datasets.map((d) => ({
    file: d.path.replace(/^data\/gse-dataset\//, ''),
    rows: d.rows,
    bytes: d.bytes,
    sha256: d.sha256,
  }));
} catch (e) {
  process.stderr.write(`verify-files: cannot read manifest ${MANIFEST}: ${e.message}\n`);
  process.exit(1);
}

async function sha256(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => h.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });
}

// Streams line-by-line, because participation.jsonl is 53 MB and must not be read whole.
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

for (const e of EXPECTED) {
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

const checks = {};

const manifestPath = join(DATA, 'nflverse-ingest-manifest.json');
try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  checks.manifest_present = true;
  checks.publishes_pick = manifest.publishes_pick;
  checks.publishes_pick_ok = manifest.publishes_pick === false;
  checks.seasons = manifest.seasons;
  if (manifest.publishes_pick !== false) {
    failures.push(`manifest publishes_pick is ${JSON.stringify(manifest.publishes_pick)}, must be false`);
  }
} catch (e) {
  checks.manifest_present = false;
  failures.push(`nflverse-ingest-manifest.json: ${e.message}`);
}

// A participation row carries players_on_field as an array.
try {
  const row = await readFirstJsonLine(join(DATA, 'participation-2024.jsonl'));
  checks.participation_players_on_field_is_array = Array.isArray(row.players_on_field);
  checks.participation_first_game_id = row.nflverse_game_id ?? null;
  checks.participation_first_play_id = row.play_id ?? null;
  checks.participation_first_player_count = Array.isArray(row.players_on_field) ? row.players_on_field.length : null;
  if (!Array.isArray(row.players_on_field)) failures.push('participation-*.jsonl: players_on_field is not an array');
} catch (e) {
  failures.push(`participation-*.jsonl: ${e.message}`);
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
