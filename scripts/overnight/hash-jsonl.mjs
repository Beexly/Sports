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

// Verbatim from the overnight prompt's CURRENT TRUTH table. The measurement wins on
// disagreement: both numbers get written down, the file is never rewritten to match.
const EXPECTED = {
  'contracts.jsonl':    { bytes: 1793445,  lines: 11550, sha256: 'badc5992543c91f46f855a0696c868767110dfd424b915286327967f8c98df06' },
  'rosters.jsonl':      { bytes: 20872178, lines: 99740, sha256: '26d575409700c4273abb4c8c7c1e788b0fe3d832276cc73a9acde593e96afaf2' },
  'snap-counts.jsonl':  { bytes: 12270533, lines: 53228, sha256: 'ac52ddceba431699640975c274835b3303cdff3e94707b4628df72f0f51fe39c' },
  'participation.jsonl':{ bytes: 55997774, lines: 91103, sha256: '8762b5b4806ede2bdf861578c149551c1b4fe9f4a8f9658b8dbe819add2b712b' },
  'fourth-down.jsonl':  { bytes: 1172393,  lines: 8465,  sha256: 'ef451ac5e7863a66aeca5de46c37caaaa6958f24f3ba6589a86243cb49284da7' },
};

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

let table = EXPECTED;
if (expectPath) table = JSON.parse(fs.readFileSync(expectPath, 'utf8'));

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
