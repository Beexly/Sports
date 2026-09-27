#!/usr/bin/env node
// Mechanical replacement for the "inspect 63 directories by hand" overnight step.
//
// An LLM reading 63 module directories one at a time burns its context window and
// then starts inventing. This script computes the same facts from the filesystem and
// writes one ledger row per directory, so the agent reviews a 63-line diff instead
// of reading 63 directories.
//
// Outputs (both overwritten wholesale, never appended, so re-runs are idempotent):
//   data/reasoning/module-ledger.jsonl    one row per directory
//   data/reasoning/ingestion-gates.jsonl  exported ACCEPTANCE_GATE constants
//
// Usage: node scripts/overnight/scan-modules.mjs
//
// ── Field rules, spelled out so the output is auditable ────────────────────────
//
// files            NON-RECURSIVE count of .ts/.tsx sitting directly in the
//                  directory. "modules" in the note repeats that number; the
//                  "(N non-test)" part is the subset excluding *.test.*/*.spec.*,
//                  because a directory of pure tests is a different animal from a
//                  directory of shipped code. The `absent` test uses the RECURSIVE
//                  .ts count instead, so a directory whose only TypeScript lives in
//                  a nested folder is not mislabelled empty.
//
// exports_a_number true only if some EXPORTED function/const name matches
//                  /^(get|compute|calc|calculate|fit|score|measure|estimate|
//                  derive|eval)/i, or some exported function's body contains a
//                  `return` of a numeric-looking expression (a numeric literal,
//                  Math.*(...), an arithmetic binary expression, or `.length`).
//                  Only returns inside exported function bodies count, so a private
//                  helper cannot make a directory look like a number producer.
//                  Biased to false: an unclear case emits false.
//
// data_file        first data path this directory actually reads, defined as
//                  readFile/readFileSync/createReadStream called with a string
//                  literal, or a string literal starting "./data/" or "data/".
//                  Every candidate is checked with fs.existsSync before being
//                  emitted; a candidate that does not exist on disk becomes null
//                  rather than a plausible-looking fiction. Null is a real answer.
//
// status            blocked        directory is props-dfs, or holds a file whose
//                                  name contains a blocked-kernel token. Filename
//                                  only -- contents are never opened.
//                  absent         zero .ts/.tsx files (recursive), or no directory
//                  wired          directory name matches a family that parts-
//                                  registry.jsonl currently carries (a family with
//                                  a signed_game_id and a finite weight)
//                  measured_zero  matches a dark-candidates.jsonl family whose
//                                  recorded verdict is a zero
//                  dark           matches a dark-candidates.jsonl family whose
//                                  recorded verdict is DARK
//                  catalogued     code exists but nothing measured it (the default)
//
// Name matching for wired/dark is normalised (lowercase, non-alphanumerics dropped)
// and accepts either an exact match or one name containing the other, with a
// four-character floor so "eval" cannot swallow "evaluation". The matched family is
// named in the note so a reviewer can check the join by hand.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATE_ROOTS = [path.resolve(SCRIPT_DIR, '..', '..'), process.cwd()];

const ROOT = CANDIDATE_ROOTS.find(
  (r) => fs.existsSync(path.join(r, 'packages', 'prediction-engine', 'src')),
);
if (!ROOT) {
  console.error('FATAL: could not locate the worktree root (no packages/prediction-engine/src).');
  process.exit(1);
}

const ENGINE_SRC = path.join(ROOT, 'packages', 'prediction-engine', 'src');
const INGESTION_SRC = path.join(ROOT, 'packages', 'data-ingestion', 'src');
const REASONING_DIR = path.join(ROOT, 'data', 'reasoning');
const LEDGER_OUT = path.join(REASONING_DIR, 'module-ledger.jsonl');
const GATES_OUT = path.join(REASONING_DIR, 'ingestion-gates.jsonl');

const BLOCKED_DIRS = new Set(['props-dfs']);
const BLOCKED_TOKENS = [
  'glmf',
  'fitalpha',
  'ooepc',
  'bucketroi',
  'gausscopulajoint',
  'opponent-adjusted-epa',
  'reasoning-surface',
];

const NUMERIC_NAME = /^(get|compute|calc|calculate|fit|score|measure|estimate|derive|eval)/i;
const NUMERIC_RETURN =
  /return\s+(?!['"`])((?:-?\d)|(?:Math\.[A-Za-z]+\s*\()|(?:[\w$.[\]?()]+\s*[-+*/%]\s*[\w$.[\]?()]+)|(?:[\w$.[\]?()]+\.length\b))/;
const MAX_FILE_BYTES = 400_000;

const isTs = (f) => f.endsWith('.ts') || f.endsWith('.tsx');
const isTest = (f) => /\.test\.|\.spec\./.test(f);

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '__snapshots__') continue;
      out.push(...walk(full));
    } else if (e.isFile() && isTs(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function exportedFunctions(src) {
  const re = /\bexport\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*(?:<[^>]*>)?\s*\(/g;
  const found = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const braceAt = src.indexOf('{', re.lastIndex);
    if (braceAt === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = braceAt; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      found.push({ name, body: src.slice(braceAt, end + 1) });
      re.lastIndex = end;
    }
  }
  return found;
}

function exportedNames(src) {
  const names = [];
  for (const re of [
    /\bexport\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/g,
    /\bexport\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g,
  ]) {
    let m;
    while ((m = re.exec(src)) !== null) names.push(m[1]);
  }
  return names;
}

function firstDataFile(files) {
  const readLit = /\b(?:readFileSync|readFile|createReadStream)\s*\(\s*(['"`])([^'"`]+)\1/g;
  const dataLit = /(['"`])((?:\.\/)?data\/[A-Za-z0-9._\/-]+)\1/g;
  for (const f of files) {
    if (isTest(path.basename(f))) continue;
    let st;
    try {
      st = fs.statSync(f);
    } catch {
      continue;
    }
    if (st.size > MAX_FILE_BYTES) continue;
    let src;
    try {
      src = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const candidates = [];
    let m;
    readLit.lastIndex = 0;
    while ((m = readLit.exec(src)) !== null) candidates.push({ raw: m[2], at: m.index });
    dataLit.lastIndex = 0;
    while ((m = dataLit.exec(src)) !== null) candidates.push({ raw: m[2], at: m.index });
    candidates.sort((a, b) => a.at - b.at);
    for (const c of candidates) {
      for (const base of [ROOT, path.dirname(f)]) {
        const resolved = path.resolve(base, c.raw);
        if (fs.existsSync(resolved)) {
          return path.relative(ROOT, resolved).split(path.sep).join('/');
        }
      }
    }
  }
  return null;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function matchFamily(dirName, families) {
  const d = norm(dirName);
  for (const fam of families) {
    const f = norm(fam);
    if (d === f) return { family: fam, how: 'exact' };
    if (f.length >= 4 && d.length >= 4 && (d.includes(f) || f.includes(d))) {
      return { family: fam, how: 'containment' };
    }
  }
  return null;
}

// ── live registry ────────────────────────────────────────────────────────────
const registry = readJsonl(path.join(REASONING_DIR, 'parts-registry.jsonl'));
const liveFamilies = [
  ...new Set(
    registry
      .filter(
        (r) =>
          typeof r.family === 'string' &&
          r.family.length > 0 &&
          typeof r.signed_game_id === 'string' &&
          r.signed_game_id.length > 0 &&
          typeof r.weight === 'number' &&
          Number.isFinite(r.weight),
      )
      .map((r) => r.family),
  ),
];

const darkRows = readJsonl(path.join(REASONING_DIR, 'dark-candidates.jsonl'));
const zeroFamilies = new Set();
const darkFamilies = new Map();
for (const r of darkRows) {
  if (typeof r.family !== 'string' || r.family.length === 0) continue;
  if (typeof r.reason !== 'string' || r.reason.trim().length === 0) continue;
  const verdict = String(r.state ?? r.verdict ?? '').toUpperCase();
  if (verdict.includes('ZERO')) zeroFamilies.add(r.family);
  else if (verdict.includes('DARK')) {
    if (!darkFamilies.has(r.family)) darkFamilies.set(r.family, verdict);
  }
}

// ── one row per directory ───────────────────────────────────────────────────
const dirNames = fs
  .readdirSync(ENGINE_SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const rows = [];
for (const dirName of dirNames) {
  const abs = path.join(ENGINE_SRC, dirName);
  const direct = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isFile() && isTs(e.name))
    .map((e) => path.join(abs, e.name));
  const recursive = walk(abs);
  const nonTest = direct.filter((f) => !isTest(path.basename(f))).length;

  const blockedFile = recursive.find((f) => {
    const base = path.basename(f).toLowerCase();
    return BLOCKED_TOKENS.some((t) => base.includes(t));
  });

  let status;
  let familyHit = null;
  let statusWord;

  if (BLOCKED_DIRS.has(dirName) || blockedFile) {
    status = 'blocked';
    statusWord = `blocked on ${path.basename(blockedFile ?? dirName)}`;
  } else if (recursive.length === 0) {
    status = 'absent';
    statusWord = 'no .ts files';
  } else {
    const reg = matchFamily(dirName, liveFamilies);
    const zero = matchFamily(dirName, [...zeroFamilies]);
    const dark = matchFamily(dirName, [...darkFamilies.keys()]);
    if (reg) {
      status = 'wired';
      familyHit = reg;
      statusWord = `family '${reg.family}' is LIVE in parts-registry (${reg.how} match)`;
    } else if (zero) {
      status = 'measured_zero';
      familyHit = zero;
      statusWord = `family '${zero.family}' recorded a measured zero`;
    } else if (dark) {
      status = 'dark';
      familyHit = dark;
      statusWord = `family '${dark.family}' recorded ${darkFamilies.get(dark.family)}`;
    } else {
      status = 'catalogued';
      statusWord = 'no registry entry and no recorded verdict';
    }
  }

  let exportsNumber = false;
  let dataFile = null;
  if (status !== 'blocked') {
    for (const f of direct) {
      if (isTest(path.basename(f))) continue;
      let st;
      try {
        st = fs.statSync(f);
      } catch {
        continue;
      }
      if (st.size > MAX_FILE_BYTES) continue;
      let src;
      try {
        src = fs.readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      if (exportedNames(src).some((n) => NUMERIC_NAME.test(n))) {
        exportsNumber = true;
        break;
      }
      if (exportedFunctions(src).some((fn) => NUMERIC_RETURN.test(fn.body))) {
        exportsNumber = true;
        break;
      }
    }
    if (exportsNumber) dataFile = firstDataFile(direct);
  }

  const fileWord = nonTest === direct.length ? `${direct.length} modules` : `${direct.length} modules (${nonTest} non-test)`;
  // Blocked directories are never opened, so their note must not imply the
  // export/read checks actually ran.
  const note =
    status === 'blocked'
      ? `${fileWord}, contents not opened (exports and data reads unchecked), ${statusWord}`
      : status === 'absent'
        ? `${fileWord}, ${statusWord}`
        : `${fileWord}, ${dataFile ? `reads ${dataFile}` : 'reads no data file'}, ${statusWord}`;

  rows.push({
    dir: dirName,
    files: direct.length,
    exports_a_number: exportsNumber,
    data_file: dataFile,
    status,
    note,
  });
}

// ── exported ACCEPTANCE_GATE constants ──────────────────────────────────────
function extractGate(src) {
  const decl = /\bexport\s+const\s+ACCEPTANCE_GATE\s*(?::\s*[^=]+)?=/.exec(src);
  if (!decl) return null;
  const eq = decl.index + decl[0].length - 1;
  if (eq === -1) return null;
  let i = eq + 1;
  while (i < src.length && /\s/.test(src[i])) i++;
  const quote = src[i];
  if (quote !== '`' && quote !== '"' && quote !== "'") return null;
  let out = '';
  for (i = i + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      out += src[i + 1] ?? '';
      i++;
      continue;
    }
    if (c === quote) break;
    out += c;
  }
  return out.replace(/\s+/g, ' ').trim();
}

function extractArxivId(src) {
  const m = src.match(/\bARXIV_ID\s*(?::\s*[^=]+)?=\s*(['"`])([^'"`]+)\1/);
  return m ? m[2] : null;
}

const gateRows = [];
if (fs.existsSync(INGESTION_SRC)) {
  for (const f of walk(INGESTION_SRC).sort()) {
    let src;
    try {
      src = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (!/ACCEPTANCE_GATE/.test(src)) continue;
    const gateText = extractGate(src);
    if (!gateText) continue;
    const base = path.basename(f, '.ts');
    gateRows.push({
      file: path.relative(ROOT, f).split(path.sep).join('/'),
      gate_id: extractArxivId(src) ?? base.split('-').slice(0, 2).join('-'),
      gate_text: gateText,
    });
  }
}

// ── write (overwrite, never append) ─────────────────────────────────────────
fs.mkdirSync(REASONING_DIR, { recursive: true });
const dump = (file, objs) =>
  fs.writeFileSync(file, objs.map((o) => JSON.stringify(o)).join('\n') + (objs.length ? '\n' : ''), 'utf8');

dump(LEDGER_OUT, rows);
dump(GATES_OUT, gateRows);

// ── report ──────────────────────────────────────────────────────────────────
const hist = {};
for (const r of rows) hist[r.status] = (hist[r.status] ?? 0) + 1;
const withNumber = rows.filter((r) => r.exports_a_number).length;
const withData = rows.filter((r) => r.data_file !== null).length;

console.log(`root            ${ROOT}`);
console.log(`directories     ${rows.length}`);
console.log(`ledger          ${path.relative(ROOT, LEDGER_OUT).split(path.sep).join('/')}  (${rows.length} rows)`);
console.log(`ingestion gates ${path.relative(ROOT, GATES_OUT).split(path.sep).join('/')}  (${gateRows.length} rows)`);
console.log(`status          ${Object.entries(hist).sort().map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`exports_a_number true on ${withNumber}/${rows.length}; data_file non-null on ${withData}/${rows.length}`);
console.log(`registry families LIVE   ${liveFamilies.length}: ${liveFamilies.join(', ') || '(none)'}`);
console.log(`dark-candidates families ${darkFamilies.size} DARK (${[...darkFamilies.keys()].join(', ') || 'none'}), ${zeroFamilies.size} zero`);
