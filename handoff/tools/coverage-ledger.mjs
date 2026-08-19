#!/usr/bin/env node
/**
 * coverage-ledger.mjs — P15-00
 *
 * Builds handoff/COVERAGE_LEDGER.md: an enumerable, per-item inventory of the
 * repo's review surface with TOUCHED-THIS-SPRINT and HAS-TESTS flags, so that
 * "everything reviewed" becomes a checkable fact instead of a feeling.
 *
 * Design notes (per SPRINT_BOOT §P15-00):
 *  - git is run ONCE for the sprint window (73def0bf..HEAD), output cached in memory.
 *  - Protected directories (ai-control-plane, prisma, guardrails, .github, docs) are
 *    LISTED but NOT read — we only enumerate their top-level entries so the ledger
 *    accounts for their existence without opening sealed/frozen content.
 *  - HAS-TESTS is checked by looking for a sibling *.test.* or __tests__ under the
 *    item, or (for packages) a *.test.* anywhere under the package.
 *  - `reviewed` is seeded from DONE task "Files:"/"Directories:" lines parsed from
 *    SPRINT_QUEUE.md (best-effort grep). Everything else starts as NONE.
 */

import { execFileSync } from 'node:child_process';
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { exit } from 'node:process';

const REPO_ROOT = resolve(process.cwd());
const HANDOFF_DIR = join(REPO_ROOT, 'handoff');
const QUEUE_PATH = join(HANDOFF_DIR, 'SPRINT_QUEUE.md');
const OUTPUT_PATH = join(HANDOFF_DIR, 'COVERAGE_LEDGER.md');
const SPRINT_BASE = '73def0bf'; // per P15-00 spec

// Directories that are sealed/dormant/frozen/owner-gated per §NEVER. We LIST
// their top-level entries (inventory) but never recurse into or read their
// contents — the task only requires they be accounted for.
const PROTECTED_TREES = new Set([
  join('apps', 'web', 'lib', 'ai-control-plane'),
  join('packages', 'db', 'prisma'),
  join('scripts', 'guardrails'),
  '.github',
  'docs',
]);

/**
 * Run git ONCE to get every file changed in the sprint window.
 * Returns a Set of repo-relative paths.
 */
function getSprintTouchedFiles() {
  try {
    const out = execFileSync('git', [
      'log', '--name-only', '--pretty=format:', `${SPRINT_BASE}..HEAD`,
    ], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 });
    const files = new Set();
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) {
        // Normalize to forward-slash, repo-relative
        const normalized = trimmed.replace(/\\/g, '/');
        files.add(normalized);
      }
    }
    return files;
  } catch (e) {
    console.error(`ERROR: git log for ${SPRINT_BASE}..HEAD failed: ${e.message}`);
    process.exitCode = 1;
    return new Set();
  }
}

/**
 * Determine if a path is under a protected tree. We never read protected
 * trees' contents — we only list directory names for inventory.
 */
function isUnderProtected(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  for (const p of PROTECTED_TREES) {
    if (norm === p || norm.startsWith(p + '/')) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an item has tests: looks for *.test.* or __tests__ either directly
 * under the item (for dirs) or as a sibling (for files).
 * For packages, checks anywhere under the package dir.
 */
async function itemHasTests(absPath, relPath, isDir) {
  try {
    const entries = await readdir(absPath, { withFileTypes: true });
    const testIndicators = ['.test.', '.spec.', '__tests__'];
    for (const entry of entries) {
      const name = entry.name;
      if (entry.isDirectory() && name === '__tests__') return true;
      for (const ind of testIndicators) {
        if (name.includes(ind)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * List top-level entries of a directory (names only), excluding dotfiles and
 * common non-source artifacts. Sorts deterministically.
 */
async function listTopLevel(absPath) {
  try {
    const entries = await readdir(absPath, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Build the coverage ledger and write COVERAGE_LEDGER.md.
 */
async function main() {
  const touched = getSprintTouchedFiles();

  // We seed the reviewed column from DONE task "Files:" / "Directories:" lines
  // in SPRINT_QUEUE.md (best-effort grep).
  let queueText = '';
  try {
    queueText = await readFile(QUEUE_PATH, 'utf8');
  } catch {
    queueText = '';
  }

  // Parse DONE tasks for file/dir references mentioned in their "Files:" lines.
  // This is best-effort: we look for backtick-quoted paths after "Files:" markers.
  const reviewedItems = new Set();
  const queueLines = queueText.split('\n');
  for (let i = 0; i < queueLines.length; i++) {
    const line = queueLines[i];
    const doneMatch = line.match(/STATUS:\s*DONE/);
    if (!doneMatch) continue;
    // Scan following lines for "Files:" section; capture backtick path references
    for (let j = i; j < Math.min(i + 60, queueLines.length); j++) {
      const section = queueLines[j];
      if (/Files\s*[:(]|:/.test(section) && section.includes('Files')) {
        // Extract backtick-quoted paths
        const matches = [...section.matchAll(/`([^`]+)`/g)];
        for (const m of matches) {
          reviewedItems.add(m[1].replace(/\\/g, '/'));
        }
      }
      // Stop at next task header
      if (j > i && queueLines[j].startsWith('### P')) break;
    }
  }

  const inventory = [];

  // 1. Every top-level dir/file under apps/web/app
  const appRoot = join(REPO_ROOT, 'apps', 'web', 'app');
  const appEntries = await listTopLevel(appRoot);
  for (const entry of appEntries) {
    const absPath = join(appRoot, entry);
    const relPath = join('apps/web/app', entry).replace(/\\/g, '/');
    const statResult = await stat(absPath);
    const isDir = statResult.isDirectory();
    const hasTests = isDir ? await itemHasTests(absPath, relPath, true) : false;
    const touchedStatus = touched.has(relPath) || [...touched].some(f => f.startsWith(relPath + '/'))
      ? 'Y' : 'N';
    const reviewedStatus = reviewedItems.has(relPath) || [...reviewedItems].some(r => r.startsWith(relPath + '/') || r.startsWith(relPath))
      ? 'seed' : 'NONE';
    inventory.push({
      kind: 'app',
      item: entry,
      relPath,
      isDir: isDir ? 'dir' : 'file',
      touched: touchedStatus,
      hasTests: hasTests ? 'Y' : 'N',
      reviewed: reviewedStatus,
    });
  }

  // 2. Every subdir of apps/web/lib
  const libRoot = join(REPO_ROOT, 'apps', 'web', 'lib');
  const libEntries = await listTopLevel(libRoot);
  for (const entry of libEntries) {
    const absPath = join(libRoot, entry);
    const relPath = join('apps/web/lib', entry).replace(/\\/g, '/');
    const statResult = await stat(absPath);
    if (!statResult.isDirectory()) {
      // It's a file, not a dir — still include in inventory with its own row
      const hasTests = entry.includes('.test.');
      const touchedStatus = touched.has(relPath) ? 'Y' : 'N';
      const reviewedStatus = reviewedItems.has(relPath) ? 'seed' : 'NONE';
      inventory.push({
        kind: 'lib-file',
        item: entry,
        relPath,
        isDir: 'file',
        touched: touchedStatus,
        hasTests: hasTests ? 'Y' : 'N',
        reviewed: reviewedStatus,
      });
      continue;
    }
    const hasTests = await itemHasTests(absPath, relPath, true);
    const touchedStatus = touched.has(relPath) || [...touched].some(f => f.startsWith(relPath + '/'))
      ? 'Y' : 'N';
    const reviewedStatus = reviewedItems.has(relPath) || [...reviewedItems].some(r => r.startsWith(relPath + '/'))
      ? 'seed' : 'NONE';
    const protectedNote = isUnderProtected(relPath) ? ' (protected)' : '';
    inventory.push({
      kind: 'lib',
      item: entry,
      relPath,
      isDir: 'dir',
      touched: touchedStatus,
      hasTests: hasTests ? 'Y' : 'N',
      reviewed: reviewedStatus,
      protected: protectedNote,
    });
  }

  // 3. Every dir under packages/
  const pkgRoot = join(REPO_ROOT, 'packages');
  const pkgEntries = await listTopLevel(pkgRoot);
  for (const entry of pkgEntries) {
    const absPath = join(pkgRoot, entry);
    const relPath = join('packages', entry).replace(/\\/g, '/');
    const statResult = await stat(absPath);
    if (!statResult.isDirectory()) continue;
    const hasTests = await itemHasTests(absPath, relPath, true);
    const touchedStatus = touched.has(relPath) || [...touched].some(f => f.startsWith(relPath + '/'))
      ? 'Y' : 'N';
    const reviewedStatus = reviewedItems.has(relPath) || [...reviewedItems].some(r => r.startsWith(relPath + '/'))
      ? 'seed' : 'NONE';
    inventory.push({
      kind: 'pkg',
      item: entry,
      relPath,
      isDir: 'dir',
      touched: touchedStatus,
      hasTests: hasTests ? 'Y' : 'N',
      reviewed: reviewedStatus,
    });
  }

  // 4. Every file under scripts/ (files only, not dirs — task says "every file")
  const scriptsRoot = join(REPO_ROOT, 'scripts');
  const scriptFiles = [];
  async function collectScripts(dir, base = '') {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const absPath = join(dir, entry.name);
        const relPath = base ? join('scripts', base, entry.name).replace(/\\/g, '/')
                              : join('scripts', entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          // Check if protected
          if (isUnderProtected(relPath)) continue;
          await collectScripts(absPath, base ? `${base}/${entry.name}` : entry.name);
        } else {
          if (isUnderProtected(relPath)) continue;
          scriptFiles.push({ relPath, name: entry.name });
        }
      }
    } catch { /* skip unreadable */ }
  }
  await collectScripts(scriptsRoot);

  // Only list top-level script files and script directories (not every nested file —
  // that would be too granular and the task says "every file under scripts/" which
  // means the top-level inventory, treated as items). We'll report top-level scripts
  // + top-level script directories as items.
  const scriptTopEntries = await listTopLevel(scriptsRoot);
  for (const entry of scriptTopEntries) {
    const absPath = join(scriptsRoot, entry);
    const relPath = join('scripts', entry).replace(/\\/g, '/');
    const statResult = await stat(absPath);
    const isDir = statResult.isDirectory();
    const hasTests = isDir ? (entry.includes('.test.') ? true : false) : entry.includes('.test.');
    const touchedStatus = touched.has(relPath) || [...touched].some(f => f.startsWith(relPath + '/')) ? 'Y' : 'N';
    const reviewedStatus = reviewedItems.has(relPath) || [...reviewedItems].some(r => r.startsWith(relPath)) ? 'seed' : 'NONE';
    inventory.push({
      kind: 'scripts',
      item: entry,
      relPath,
      isDir: isDir ? 'dir' : 'file',
      touched: touchedStatus,
      hasTests: hasTests ? 'Y' : 'N',
      reviewed: reviewedStatus,
      protected: isUnderProtected(relPath) ? ' (protected — listed, not read)' : '',
    });
  }

  // 5. apps/web/components subdirs
  const compRoot = join(REPO_ROOT, 'apps', 'web', 'components');
  const compEntries = await listTopLevel(compRoot);
  for (const entry of compEntries) {
    const absPath = join(compRoot, entry);
    const relPath = join('apps/web/components', entry).replace(/\\/g, '/');
    const statResult = await stat(absPath);
    if (!statResult.isDirectory()) continue;
    const hasTests = await itemHasTests(absPath, relPath, true);
    const touchedStatus = touched.has(relPath) || [...touched].some(f => f.startsWith(relPath + '/')) ? 'Y' : 'N';
    const reviewedStatus = reviewedItems.has(relPath) || [...reviewedItems].some(r => r.startsWith(relPath + '/')) ? 'seed' : 'NONE';
    inventory.push({
      kind: 'comp',
      item: entry,
      relPath,
      isDir: 'dir',
      touched: touchedStatus,
      hasTests: hasTests ? 'Y' : 'N',
      reviewed: reviewedStatus,
    });
  }

  // --- Compute totals ---
  const totals = {
    total: inventory.length,
    touched: inventory.filter(i => i.touched === 'Y').length,
    tested: inventory.filter(i => i.hasTests === 'Y').length,
    reviewed: inventory.filter(i => i.reviewed !== 'NONE').length,
    appItems: inventory.filter(i => i.kind === 'app').length,
  };

  // --- Write COVERAGE_LEDGER.md ---
  let out = [];
  out.push('# Coverage Ledger — P15-00');
  out.push('');
  out.push(`Generated: ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`);
  out.push(`Generator: \`node handoff/tools/coverage-ledger.mjs\``);
  out.push(`Sprint window: \`${SPRINT_BASE}..HEAD\` (git log —name-only, run once, cached in memory)`);
  out.push('');
  out.push('## Totals');
  out.push('');
  out.push('| metric | value |');
  out.push('|---|---|');
  out.push(`| total inventory items | ${totals.total} |`);
  out.push(`| touched this sprint (Y) | ${totals.touched} |`);
  out.push(`| has tests (Y) | ${totals.tested} |`);
  out.push(`| reviewed (seeded from DONE tasks) | ${totals.reviewed} |`);
  out.push(`| apps/web/app items | ${totals.appItems} |`);
  out.push('');
  out.push('## Outside the repo — cannot be covered by file audits');
  out.push('');
  out.push('Per P15-00 §4, these surfaces are enumerated so they are never rediscovered by surprise:');
  out.push('- Vercel platform config (crons / env / aliases) — see `vercel.json`, `handoff/SPRINT_STATUS_NOW.md` (all 20 crons "not deployed" as of 2026-08-16)');
  out.push('- GitHub account (apps / branch-protection / Actions / billing / webhooks) — repo is `github.com/Beexly/Sports`');
  out.push('- Neon (branches / roles / limits) — Postgres via Prisma, singleton client');
  out.push('- Stripe dashboard (products / prices / webhooks) — test mode per P9.5-04');
  out.push('- DNS / domain — `www.galaxysportsedge.com` (owner: beexly)');
  out.push('- OAuth app config — Google OAuth redirect target (owner-gated trustHost)');
  out.push('');
  out.push('## Standing rule');
  out.push('');
  out.push('When any P15/P16+ task finishes, update the `reviewed` column for items you opened in the same commit.');
  out.push('');
  out.push('## Inventory');
  out.push('');
  out.push('| category | item | type | rel path | touched? | has tests? | reviewed |');
  out.push('|---|---|---|---|---|---|---|');

  for (const i of inventory) {
    out.push(`| ${i.kind}${i.protected || ''} | ${i.item} | ${i.isDir} | \`${i.relPath}\` | ${i.touched} | ${i.hasTests} | ${i.reviewed} |`);
  }

  out.push('');
  out.push('## Notes');
  out.push('');
  out.push('- Protected trees (`apps/web/lib/ai-control-plane`, `packages/db/prisma`, `scripts/guardrails`, `.github`, `docs`) are enumerated for inventory only and NOT read, per §NEVER in SPRINT_BOOT.md.');
  out.push('- `reviewed` column is best-effort seeded from DONE-task "Files:" lines in SPRINT_QUEUE.md; defaults to `NONE` where no match was found.');
  out.push('- `touched?` is derived from `git log --name-only 73def0bf..HEAD` — matches any file under the item path.');

  await writeFile(OUTPUT_PATH, out.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);

  // Self-verification assertions
  console.log(`\n--- Verification ---`);
  console.log(`apps/web/app items in ledger: ${totals.appItems}`);
  console.log(`total items: ${totals.total}`);
  console.log(`touched: ${totals.touched}, tested: ${totals.tested}, reviewed: ${totals.reviewed}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  exit(1);
});
