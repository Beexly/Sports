#!/usr/bin/env node
// log-slice.mjs — the one thing that must not be forgotten after a compaction.
//
// The loop line is the only durable state the run has. Appending it by hand is exactly the
// step an agent forgets after its context is compressed, so it is a command instead.
//
// Appends one JSON object to data/reasoning/overnight-loop.jsonl and one row to
// docs/reasoning/overnight-audit-<date>.md. Append-only: never rewrites, never truncates.
// Refuses a cycle number that does not advance, which is how a repeated slice gets caught
// before it does damage.

import { appendFileSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OVERNIGHT_ROOT ?? join(HERE, '..', '..');

const VERDICTS = new Set(['PASS', 'DARK', 'STORED', 'NOT_EVALUATED', 'BLOCKED', 'STUCK']);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = 'true';
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));

const cycle = Number(args.cycle);
if (!Number.isInteger(cycle) || cycle < 0) fail('log-slice: --cycle must be a non-negative integer');

const slice = args.slice;
if (!slice) fail('log-slice: --slice is required');

const verdict = args.verdict ?? 'PASS';
if (!VERDICTS.has(verdict)) {
  fail(`log-slice: --verdict must be one of ${[...VERDICTS].join(', ')}`);
}

const next = args.next ?? 'stop';
const measured = args.measured ?? '';
const blocker = args.blocker ?? null;

// --- commit honesty -------------------------------------------------------
// The loop line is provenance. A null commit next to a real SHA is the exact
// lie this product exists to prevent, and it is the one an agent writes by
// accident after a compaction. So: resolve HEAD unless the caller explicitly
// opts out, and refuse a SHA-shaped value that is not in the repo.

function resolveHeadCommit() {
  try {
    const out = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^[0-9a-f]{40}$/i.test(out) ? out.toLowerCase() : null;
  } catch {
    return null;
  }
}

function commitExists(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

const SHA_RE = /^[0-9a-f]{7,40}$/i;
const rawCommit = args.commit;
let commit;

if (rawCommit === undefined || rawCommit === 'auto' || rawCommit === 'HEAD') {
  commit = resolveHeadCommit();
  if (commit === null) {
    // No git here (scratch OVERNIGHT_ROOT) or HEAD unreadable. A bare null is
    // only legal when the caller says why — the same rule as an explicit none.
    const reason = args['commit-reason'] ?? args.commitReason ?? '';
    if (!reason && verdict === 'PASS') {
      fail(
        'log-slice: no git HEAD to stamp on a PASS slice. ' +
          'Pass --commit <sha> or --commit none --commit-reason "<why>".'
      );
    }
    commit = null;
  }
} else if (rawCommit === 'none' || rawCommit === 'null') {
  const reason = args['commit-reason'] ?? args.commitReason ?? '';
  if (!reason) {
    fail(
      'log-slice: --commit none requires --commit-reason "<why there is no commit>". ' +
        'A bare null is how a real SHA gets erased from the record.'
    );
  }
  commit = null;
} else if (SHA_RE.test(rawCommit)) {
  if (!commitExists(rawCommit)) {
    fail(`log-slice: --commit ${rawCommit} is not a commit in ${ROOT}`);
  }
  commit = rawCommit.toLowerCase();
} else {
  fail(
    `log-slice: --commit must be a sha, "auto", or "none" (with --commit-reason). Got ${JSON.stringify(rawCommit)}`
  );
}

const loopPath = join(ROOT, 'data', 'reasoning', 'overnight-loop.jsonl');
mkdirSync(dirname(loopPath), { recursive: true });

// --- read current state ----------------------------------------------------

let lastCycle = -1;
let lastNext = null;
let lastSlice = null;
let repeatedNext = false;

if (existsSync(loopPath)) {
  const raw = readFileSync(loopPath, 'utf8').trim();
  if (raw.length > 0) {
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    for (const line of lines) {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        fail(`log-slice: loop log contains an unparseable line: ${line.slice(0, 120)}`);
      }
      if (typeof parsed.cycle === 'number' && parsed.cycle > lastCycle) {
        lastCycle = parsed.cycle;
        lastNext = parsed.next ?? null;
        lastSlice = parsed.slice ?? null;
      }
    }
    if (lines.length >= 2) {
      const last = JSON.parse(lines[lines.length - 1]);
      const prev = JSON.parse(lines[lines.length - 2]);
      repeatedNext = Boolean(last.next) && last.next === prev.next;
    }
  }
}

if (cycle <= lastCycle) {
  fail(
    `log-slice: cycle ${cycle} does not advance past ${lastCycle}. ` +
      `The loop log is append-only and monotonic. Nothing was written.`
  );
}

// A gap is legal (a lane may take several cycles at once) but a repeat of the same `next`
// is the STUCK signal from the work order, so it is surfaced rather than silently accepted.
if (repeatedNext && slice === lastSlice) {
  process.stderr.write(
    `log-slice: WARNING slice "${slice}" already ran with the same "next" on two consecutive lines. ` +
      `Per the work order this is STUCK: take the following queue item instead.\n`
  );
}

const record = {
  cycle,
  utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  slice,
  verdict,
  measured,
  commit,
  next,
  blocker,
};

// One complete line, appended. A concurrent writer cannot leave a half-written first line
// because nothing here ever truncates.
appendFileSync(loopPath, `${JSON.stringify(record)}\n`, 'utf8');

// --- audit row -------------------------------------------------------------

const auditDate = record.utc.slice(0, 10);
const auditPath = join(ROOT, 'docs', 'reasoning', `overnight-audit-${auditDate}.md`);
mkdirSync(dirname(auditPath), { recursive: true });

if (!existsSync(auditPath)) {
  writeFileSync(
    auditPath,
    `# Overnight audit - ${auditDate}\n\n` +
      `One row per cycle. Every number here traces to a command whose output is in context.\n` +
      `Verdicts: \`PASS\` \`DARK\` \`STORED\` \`NOT_EVALUATED\` \`BLOCKED\` \`STUCK\`\n\n` +
      `| cycle | utc | slice | files touched | command | exit | measured | scalarizer | refused | verdict | commit |\n` +
      `|---:|---|---|---|---|---:|---|---|---|---|\n`,
    'utf8'
  );
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '-';

const auditRow = [
  cell(record.cycle),
  cell(record.utc),
  cell(slice),
  cell(args.files ?? ''),
  cell(args.command ?? ''),
  cell(args.exit ?? ''),
  cell(measured),
  cell(args.scalarizer ?? ''),
  cell(args.refused ?? ''),
  cell(verdict),
  cell(commit),
].join(' | ');

appendFileSync(auditPath, `|${auditRow}|\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify({ ok: true, cycle, slice, verdict, next, loop: loopPath, audit: auditPath }, null, 2)}\n`
);
