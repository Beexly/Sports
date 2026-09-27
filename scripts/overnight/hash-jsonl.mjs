#!/usr/bin/env node
// Streaming SHA-256 + line counter for large JSONL grains.
//
// Replaces the multi-line `python -c` one-liner in the overnight prompt, which breaks
// under Windows PowerShell when the multi-line string is passed to python -c.
// Streams in 1 MiB chunks so a 56 MB participation file never lands in the heap.
//
// Usage:
//   node hash-jsonl.mjs                       # hash every file in EXPECTED, verify
//   node hash-jsonl.mjs --file <path>         # hash one file, print sha/bytes/lines
//   node hash-jsonl.mjs --expect <path>       # verify against a JSON {file:{sha,bytes,lines}}
//   node hash-jsonl.mjs --root <dir>          # override data root (default data/gse-dataset)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Expectations come from the ingest manifest, which is the seal the ingest itself wrote.
//
// This used to be a hardcoded copy of the overnight prompt's CURRENT TRUTH table. That table
// described 2024-2025 and the four single-file grain names, so once the corpus widened to
// eight seasons and the layout became one file per season, every entry went stale and the
// verifier reported 0/5 while main's own manifest disagreed with it. A verifier that cannot
// pass on the data it is verifying trains people to ignore it, which is the opposite of what
// AGENTS.md means by "verify sha256 against the manifest".
//
// Reading the manifest also makes this correct forever: a new season or a new split file is
// sealed automatically instead of needing a hand-edited table to be updated in step.
function tableFromManifest(rootDir) {
  const p = path.join(rootDir, 'nflverse-ingest-manifest.json');
  if (!fs.existsSync(p)) return null;
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const out = {};
  for (const d of m.datasets) {
    if (!d.sha256) continue;
    out[path.basename(d.path)] = { bytes: d.bytes, lines: d.rows, sha256: d.sha256 };
  }
  return out;
}

function hashFile(file) {
  const h = crypto.createHash('sha256');
  let bytes = 0;
  let lines = 0;
  let lastByte = -1;
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(1 << 20);
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n <= 0) break;
      h.update(buf.subarray(0, n));
      bytes += n;
      for (let i = 0; i < n; i++) if (buf[i] === 0x0a) lines++;
      lastByte = buf[n - 1];
    }
  } finally {
    fs.closeSync(fd);
  }
  // A file with no trailing newline still has a final partial line.
  if (bytes > 0 && lastByte !== 0x0a) lines++;
  return { sha256: h.digest('hex'), bytes, lines };
}

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};

const root = arg('--root', 'data/gse-dataset');
const one = arg('--file', null);
const expectPath = arg('--expect', null);

if (one) {
  const r = hashFile(one);
  console.log(JSON.stringify({ file: one, ...r }, null, 2));
  process.exit(0);
}

let table = expectPath
  ? JSON.parse(fs.readFileSync(expectPath, 'utf8'))
  : tableFromManifest(root) ?? {};
if (Object.keys(table).length === 0) {
  console.error(`hash-jsonl: no expectations. Manifest missing at ${path.join(root, 'nflverse-ingest-manifest.json')}?`);
  process.exit(1);
}
console.log(`verifying ${Object.keys(table).length} file(s) against ${expectPath ?? 'the ingest manifest'}`);

let failures = 0;
const rows = [];
for (const [name, exp] of Object.entries(table)) {
  const p = path.isAbsolute(name) ? name : path.join(root, name);
  if (!fs.existsSync(p)) {
    rows.push({ file: name, status: 'MISSING' });
    failures++;
    continue;
  }
  const got = hashFile(p);
  const sizeOk = exp.bytes == null || got.bytes === exp.bytes;
  const lineOk = exp.lines == null || got.lines === exp.lines;
  const shaOk = exp.sha256 == null || got.sha256 === exp.sha256;
  const status = sizeOk && lineOk && shaOk ? 'OK' : 'MISMATCH';
  if (status !== 'OK') failures++;
  rows.push({
    file: name, status,
    bytes: got.bytes, expectedBytes: exp.bytes ?? null,
    lines: got.lines, expectedLines: exp.lines ?? null,
    sha256: got.sha256, expectedSha256: exp.sha256 ?? null,
  });
}

for (const r of rows) {
  const sha = r.sha256 === r.expectedSha256 ? r.sha256
    : r.sha256 ? `GOT ${r.sha256}\n          WANT ${r.expectedSha256}` : '-';
  console.log(`${r.status.padEnd(9)} ${r.file.padEnd(22)} bytes=${r.bytes ?? '-'}/${r.expectedBytes ?? '-'} lines=${r.lines ?? '-'}/${r.expectedLines ?? '-'}\n          ${sha}`);
}
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${rows.length - failures}/${rows.length} matched`);
process.exit(failures === 0 ? 0 : 1);
