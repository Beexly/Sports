#!/usr/bin/env node
// Extract candidate "grains" so the feature catalog is built from evidence instead
// of a wish list. A grain is the unit ONE data row represents: one game, one
// player-week, one play, one market quote.
//
// The failure this replaces: asking a model to "list the grains" produces confident
// tiers nobody can check. Here every row in the output names a file that was actually
// opened, and a row is emitted only when a real key set backs it. The list is
// deliberately short -- a missing grain costs one run of this script, an invented one
// costs a catalog built on air.
//
// Two evidence sources, both required to be real:
//   data  -- the first 2000 lines of each file in data/gse-dataset/ (streamed, so a
//            56 MB participation file never lands in the heap). Keys are UNIONED
//            across those lines, because optional columns only show up in some rows.
//   code  -- packages/prediction-engine/src type/interface names and column-name
//            string literals. A type name alone is too cheap: a code grain is emitted
//            only when the SAME file also contains at least one target column-name
//            string literal, so the two signals corroborate each other.
//
// Output (overwritten wholesale, never appended):
//   data/reasoning/grain-inventory.jsonl
//
// Usage: node scripts/overnight/scan-grains.mjs
//
// Tier is assigned from the key set, never from the filename:
//   play_id present                         -> play
//   market_id present                       -> market
//   a player id + a time index              -> player_week
//   game_id / season / week, no player id   -> game
//   nothing that keys a row                  -> meta
// A file whose real grain the fixed tier list cannot express (a player-season
// contract row, which has no week) is left OUT rather than filed under a tier that
// would be a lie; the report names it so a human can widen the taxonomy.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = [path.resolve(SCRIPT_DIR, '..', '..'), process.cwd()].find((r) =>
  fs.existsSync(path.join(r, 'packages', 'prediction-engine', 'src')),
);
if (!ROOT) {
  console.error('FATAL: could not locate the worktree root (no packages/prediction-engine/src).');
  process.exit(1);
}

const ENGINE_SRC = path.join(ROOT, 'packages', 'prediction-engine', 'src');
const DATASET_DIR = path.join(ROOT, 'data', 'gse-dataset');
const OUT = path.join(ROOT, 'data', 'reasoning', 'grain-inventory.jsonl');

const MAX_LINES = 2000;
const isTs = (f) => f.endsWith('.ts') || f.endsWith('.tsx');

// The target vocabulary. Exact column names, matched as whole string-literal values.
const COLUMNS = new Set([
  'game_id', 'player_id', 'play_id', 'market_id',
  'week', 'season', 'pfr_player_id', 'gsis_id',
  'team', 'date', 'snapshot', 'quarter',
]);

const PLAYER_IDS = ['player_id', 'pfr_player_id', 'gsis_id'];

function tierFor(keys) {
  const k = new Set(keys);
  const hasPlayer = PLAYER_IDS.some((p) => k.has(p));
  if (k.has('play_id')) return 'play';
  if (k.has('market_id')) return 'market';
  if (hasPlayer && (k.has('week') || k.has('season'))) return 'player_week';
  if (k.has('game_id') || k.has('season') || k.has('week')) return 'game';
  return null;
}

async function firstLines(file, n) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  const out = [];
  try {
    for await (const l of rl) {
      if (l.trim()) out.push(l);
      if (out.length >= n) break;
    }
  } finally {
    rl.close();
  }
  return out;
}

// ── data evidence ───────────────────────────────────────────────────────────
const dataGrains = new Map();
const skipped = [];

if (fs.existsSync(DATASET_DIR)) {
  for (const name of fs.readdirSync(DATASET_DIR).sort()) {
    const abs = path.join(DATASET_DIR, name);
    if (!fs.statSync(abs).isFile()) continue;
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');

    let keys = new Set();
    if (name.endsWith('.json')) {
      // Manifests are pretty-printed, so a line-oriented parse would fail; read the
      // whole (small) file and parse it as one document.
      let doc;
      try {
        doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
      } catch {
        continue;
      }
      keys = new Set(Object.keys(doc));
      const tier = tierFor(keys) ?? (keys.size > 0 ? 'meta' : null);
      if (tier === 'meta') {
        dataGrains.set('dataset_manifest', { tier, evidence_file: rel, key_fields: [...keys].sort(), source: 'data' });
      }
      continue;
    }
    if (!name.endsWith('.jsonl')) continue;

    const lines = await firstLines(abs, MAX_LINES);
    for (const l of lines) {
      try {
        for (const k of Object.keys(JSON.parse(l))) keys.add(k);
      } catch {
        /* skip unparseable line */
      }
    }
    const target = [...keys].filter((k) => COLUMNS.has(k)).sort();
    const tier = tierFor(target);
    if (!tier) {
      skipped.push(`${rel} carries [${[...keys].slice(0, 6).join(', ')}] -- no target column keys a row`);
      continue;
    }
    const grainId = { game: 'game', player_week: 'player_week', play: 'play', market: 'market' }[tier];
    // Prefer the canonically-named file (games.jsonl for the game grain), then the
    // file carrying the most target keys, then alphabetical. Deterministic, and it
    // keeps a derived copy (features.jsonl, holdout.jsonl) from outranking the source.
    // The rank is stored on the entry: recomputing it from the current file would
    // score the incumbent with the wrong stem and key count.
    const stem = name.replace(/\.jsonl$/, '');
    const rank = `${stem === grainId || stem.startsWith(grainId) ? 0 : 1}|${String(9999 - target.length).padStart(4, '0')}|${rel}`;
    const prev = dataGrains.get(grainId);
    if (!prev || rank < prev._rank) {
      dataGrains.set(grainId, { tier, evidence_file: rel, key_fields: target, source: 'data', _rank: rank });
    }
  }
}

// ── code evidence ───────────────────────────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      out.push(...walk(full));
    } else if (e.isFile() && isTs(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// CamelCase name -> tier. Ordered: the first pattern that matches a split name wins.
// A `*Snapshot` / `*Registry` type is deliberately NOT a grain -- those are runtime
// state objects, not the unit a stored row represents.
const NAME_TIERS = [
  [/(^|[^a-z])(player|playerweek)(week|season)/i, 'player_week'],
  [/(^|[^a-z])player(week|game|season)/i, 'player_week'],
  [/(^|[^a-z])(play|pbp|playbyplay)/i, 'play'],
  [/(^|[^a-z])(market|odds|line|steam|quote|price|devig)/i, 'market'],
  [/(^|[^a-z])(game|schedule|fixture)/i, 'game'],
];
// A lone string literal is not corroboration: "team" alone turns up as a clustering
// label in a baseball particle filter. Two independent target columns is the floor.
const MIN_CODE_KEYS = 2;
const splitName = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.]/g, ' ');

const codeGrains = new Map();
for (const abs of walk(ENGINE_SRC)) {
  const base = path.basename(abs);
  if (/\.test\.|\.spec\./.test(base)) continue;
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  const src = fs.readFileSync(abs, 'utf8');

  // target column names present as string literals in this file
  const litKeys = new Set();
  for (const m of src.matchAll(/(['"`])([A-Za-z_][A-Za-z0-9_]*)\1/g)) {
    if (COLUMNS.has(m[2])) litKeys.add(m[2]);
  }

  const typeNames = [];
  for (const m of src.matchAll(/\b(?:interface|type)\s+([A-Za-z0-9_$]+)/g)) typeNames.push(m[1]);

  const hits = new Map(); // tier -> evidence name
  for (const name of typeNames) {
    const flat = splitName(name);
    for (const [re, tier] of NAME_TIERS) {
      if (re.test(flat) && !hits.has(tier)) {
        hits.set(tier, name);
        break;
      }
    }
  }
  for (const [tier, name] of hits) {
    if (litKeys.size < MIN_CODE_KEYS) continue; // a type name plus one stray literal is not evidence
    const grainId = tier;
    const prev = codeGrains.get(grainId);
    if (!prev || rel < prev.evidence_file) {
      codeGrains.set(grainId, {
        tier,
        evidence_file: rel,
        key_fields: [...litKeys].sort(),
        source: 'code',
        _type: name,
      });
    }
  }
}

// ── merge: data evidence outranks code evidence for the same grain ──────────
// Only the five contract fields are emitted; internal ranking state stays behind.
const shape = (id, g) => ({
  grain_id: id,
  tier: g.tier,
  evidence_file: g.evidence_file,
  key_fields: g.key_fields,
  source: g.source,
});

const grains = new Map();
for (const [id, g] of dataGrains) grains.set(id, shape(id, g));
const codeOnly = [];
for (const [id, g] of codeGrains) {
  if (grains.has(id)) continue;
  codeOnly.push(id);
  grains.set(id, shape(id, g));
}

const rows = [...grains.values()].sort((a, b) => a.grain_id.localeCompare(b.grain_id));

// every emitted path must be real
for (const r of rows) {
  if (!fs.existsSync(path.join(ROOT, r.evidence_file))) {
    throw new Error(`refusing to emit a non-existent evidence_file: ${r.evidence_file}`);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');

console.log(`root        ${ROOT}`);
console.log(`out         data/reasoning/grain-inventory.jsonl  (${rows.length} rows)`);
for (const r of rows) {
  console.log(`  ${r.grain_id.padEnd(14)} ${r.tier.padEnd(12)} ${r.source.padEnd(5)} ${r.evidence_file}`);
  console.log(`  ${''.padEnd(14)} keys: ${r.key_fields.join(', ') || '(none)'}`);
}
if (skipped.length) {
  console.log('\nleft out (real files, grain not expressible in the fixed tier list):');
  for (const s of skipped) console.log(`  ${s}`);
}
if (codeOnly.length) console.log(`\ngrains with code but no data evidence: ${codeOnly.join(', ')}`);
