#!/usr/bin/env node
// scan-modules.mjs — slice 8, deterministic.
//
// The work order asks an agent to walk 62 directories and describe each one. Done by hand that
// is the single largest context burn in the queue, and it is exactly where an agent invents a
// plausible number after compaction. So it is a script that reads the tree instead.
//
// HARD CONSTRAINT: this script may only ever emit status `blocked`, `absent`, or `catalogued`.
// It has no path to `wired` or `measured_zero`, because those mean "a number was computed and
// it is in the registry or in the edge sum" and this script computes no number. That is
// FORBIDDEN 11 expressed structurally rather than as a rule to remember.

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');
const SRC = join(ROOT, 'packages', 'prediction-engine', 'src');

// FORBIDDEN 13. Matching a directory or a filename here means blocked; the file is not opened.
const BLOCKED_KERNEL_NAMES = [
  'props-dfs',
  'fitAlpha',
  'ooEpc',
  'bucketRoi',
  'gaussCopulaJoint',
  'opponent-adjusted-epa',
  'reasoning-surface.ts',
];
// GLMF is matched case-insensitively because it appears as GLMF, glmF, and glmf.ts in the tree.
const BLOCKED_REGEXES = [/glmf/i, ...BLOCKED_KERNEL_NAMES.map((n) => new RegExp(n.toLowerCase()))];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function isBlocked(name) {
  const lower = name.toLowerCase();
  return BLOCKED_REGEXES.some((p) => p.test(lower));
}

// A file "exports a number" if it exports something and mentions a numeric return or a
// probability. Deliberately coarse: the point is to distinguish a real module from a stub,
// not to type-check the repo.
const EXPORTS_RE = /^\s*export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\b/m;
const NUMERIC_HINT_RE = /\b(number|probabilit|edge|weight|rating|score|epa|return\s+-?\d|:\s*number\b)/i;

const rows = [];

let dirs;
try {
  dirs = readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
} catch {
  process.stderr.write(`scan-modules: cannot read ${SRC}\n`);
  process.exit(1);
}

for (const dir of dirs) {
  const dirPath = join(SRC, dir);
  const files = walk(dirPath);

  if (isBlocked(dir)) {
    // Do not open blocked kernels to describe them.
    rows.push({
      dir,
      files: files.length,
      exports_a_number: null,
      data_file: null,
      status: 'blocked',
      note: `Blocked kernel (FORBIDDEN 13). ${files.length} file(s) present, not opened.`,
    });
    continue;
  }

  if (files.length === 0) {
    rows.push({
      dir,
      files: 0,
      exports_a_number: false,
      data_file: null,
      status: 'absent',
      note: 'Directory exists but contains no source files.',
    });
    continue;
  }

  const blockedFiles = files.filter((f) => isBlocked(f.split(/[\\/]/).pop() ?? ''));
  if (blockedFiles.length > 0) {
    // Fail-closed: the whole directory reads as blocked so nothing in it is edited by
    // accident. The census of the untouched files is still recorded, so marking the
    // directory does not silently erase what else lives there.
    rows.push({
      dir,
      files: files.length,
      blocked_files: blockedFiles.map((f) => relative(SRC, f)),
      unblocked_files: files.length - blockedFiles.length,
      exports_a_number: null,
      data_file: null,
      status: 'blocked',
      note: `${blockedFiles.length} blocked kernel file(s) not opened; the other ${files.length - blockedFiles.length} file(s) were not described either, because the directory is fail-closed.`,
    });
    continue;
  }

  let exportsANumber = false;
  let dataFile = null;
  for (const f of files) {
    let text = '';
    try {
      text = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (EXPORTS_RE.test(text) && NUMERIC_HINT_RE.test(text)) exportsANumber = true;
    const m = text.match(/["'`](data\/[\w./-]+\.jsonl)["'`]/);
    if (m && !dataFile) dataFile = m[1];
  }

  const loc = files.reduce((n, f) => n + readLines(f), 0);
  rows.push({
    dir,
    files: files.length,
    exports_a_number: exportsANumber,
    data_file: dataFile,
    status: 'catalogued',
    note: `${files.length} source file(s), ${loc} lines. No fit scored tonight, so status cannot advance past catalogued.`,
  });
}

function readLines(f) {
  try {
    const size = statSync(f).size;
    if (size > 512 * 1024) return 0;
    return readFileSync(f, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

const outPath = join(ROOT, 'data', 'reasoning', 'module-ledger.jsonl');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

const byStatus = rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1;
  return acc;
}, {});

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      src: SRC,
      out: outPath,
      directories: rows.length,
      by_status: byStatus,
      note: 'This script cannot emit wired or measured_zero. Those require a computed number.',
    },
    null,
    2
  )}\n`
);
