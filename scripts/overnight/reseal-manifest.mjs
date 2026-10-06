#!/usr/bin/env node
// reseal-manifest.mjs — rebuild every seal in nflverse-ingest-manifest.json
// from the files actually on disk.
//
// Why this exists: the #921 integration left the manifest listing combined
// grains (participation.jsonl, snap-counts.jsonl) that the per-season layout
// no longer contains, and a manifest that points at files which do not exist
// fails verify-files.mjs — which is exactly what verify-files is for. The
// seals themselves are recomputed, never copied: sha256, byte count and line
// count are measured from the bytes on disk, so a reseal BLESSES nothing and
// HIDES nothing — it states what is on disk right now. Entries whose file is
// missing are dropped and reported, not silently skipped.
//
// The gold path remains re-running the ingest (npx tsx
// packages/data-ingestion/src/nflverse/ingest.ts); this script is the repair
// when the ingest's own output is already verified and only its manifest
// drifted.

import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { join, dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const MANIFEST_PATH = join(ROOT, 'data', 'gse-dataset', 'nflverse-ingest-manifest.json');

async function sha256Of(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => h.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });
}

async function countLines(path) {
  return new Promise((resolve, reject) => {
    let n = 0;
    createInterface({ input: createReadStream(path), crlfDelay: Infinity })
      .on('line', () => { n += 1; })
      .on('error', reject)
      .on('close', () => resolve(n));
  });
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const resolvedRoot = resolvePath(ROOT);
const kept = [];
const dropped = [];
const resealed = [];

for (const dataset of manifest.datasets ?? []) {
  const absPath = join(ROOT, dataset.path ?? '');
  let st;
  try {
    st = await stat(absPath);
  } catch {
    dropped.push({ name: dataset.name, path: dataset.path, reason: 'file missing on disk' });
    continue;
  }
  const sha256 = await sha256Of(absPath);
  const rows = await countLines(absPath);
  const changed =
    dataset.sha256 !== sha256 || dataset.rows !== rows || dataset.bytes !== st.size;
  kept.push({ ...dataset, rows, bytes: st.size, sha256 });
  if (changed) resealed.push({ name: dataset.name, rows, bytes: st.size, sha256: sha256.slice(0, 16) });
}

const out = {
  ...manifest,
  generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  datasets: kept,
  reseal_note:
    'Seals recomputed from disk by scripts/overnight/reseal-manifest.mjs; ' +
    'entries whose file does not exist were dropped and reported. ' +
    'The ingest re-run remains the gold path for regenerating both files and manifest.',
};

await writeFile(MANIFEST_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({
  reseal: {
    kept: kept.length,
    dropped,
    resealed,
    manifest: MANIFEST_PATH,
  },
}, null, 2)}\n`);
process.exit(0);
