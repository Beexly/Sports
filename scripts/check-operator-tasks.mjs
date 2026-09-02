#!/usr/bin/env node
// scripts/check-operator-tasks.mjs
//
// Owner-facing health check for docs/ops/OPERATOR_TASKS.md.
//
// Parses the checkbox list in that file and reports, per task:
//   - open ([ ]) or done ([x])
//   - for the items that CAN be verified from inside this repo (no external
//     account/console access needed), the current verdict
//   - for everything else, a "manual" note (sometimes with a repo-side proxy
//     signal, since the real check is account/console-level)
//
// This is a report, not a gate: it always exits 0, unless --strict is passed,
// in which case it exits 1 when any repo-verifiable item is unverified.
//
// Usage:
//   node scripts/check-operator-tasks.mjs
//   node scripts/check-operator-tasks.mjs --strict

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const STRICT = process.argv.includes('--strict');

const OPERATOR_TASKS_PATH = path.join(REPO_ROOT, 'docs/ops/OPERATOR_TASKS.md');
const CI_WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/ci.yml');
const CLAUDE_SETTINGS_PATH = path.join(REPO_ROOT, '.claude/settings.json');
const MCP_CONFIG_PATH = path.join(REPO_ROOT, '.mcp.json');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'packages/db/prisma/migrations');

/** Read a text file, returning null if it does not exist. */
function readTextIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

/** Read + JSON.parse a file, returning null on any failure. */
function readJsonIfExists(filePath) {
  const raw = readTextIfExists(filePath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Parse OPERATOR_TASKS.md for checkbox lines of the form:
//    - [ ] **ID** — text
//    - [x] **ID** — text
// ---------------------------------------------------------------------------

function parseCheckboxes(markdown) {
  const lines = markdown.split(/\r?\n/);
  const checkboxRe = /^-\s\[([ xX])\]\s\*\*([A-Za-z0-9_-]+)\*\*\s[—-]\s(.*)$/;
  const items = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = checkboxRe.exec(lines[i]);
    if (!m) continue;
    const [, mark, id, firstLine] = m;
    // A task's explanation often wraps onto indented continuation lines
    // (plain prose, not a new list item, heading, or table row). Fold those
    // into the text so the report doesn't cut a sentence mid-word.
    const textParts = [firstLine.trim()];
    let j = i + 1;
    while (
      j < lines.length &&
      lines[j].trim() !== '' &&
      !checkboxRe.test(lines[j]) &&
      !/^#/.test(lines[j]) &&
      !/^\|/.test(lines[j])
    ) {
      textParts.push(lines[j].trim());
      j += 1;
    }
    items.push({
      id,
      done: mark.toLowerCase() === 'x',
      text: textParts.join(' '),
    });
  }
  return items;
}

/** Truncate at a word boundary for compact display; never mid-word. */
function truncateForDisplay(text, maxLen = 110) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : maxLen)}…`;
}

// ---------------------------------------------------------------------------
// 2. Repo-side checks per task id.
//
// Each check returns:
//   { kind: 'verified', ok: boolean, detail: string }   -- a real repo-only verdict
//   { kind: 'manual', detail: string }                  -- cannot be checked here
// ---------------------------------------------------------------------------

function checkBaselineMigration() {
  let hasBaselineDir = false;
  let migrationDirNote = 'packages/db/prisma/migrations/ not found';
  if (existsSync(MIGRATIONS_DIR)) {
    const entries = readdirSync(MIGRATIONS_DIR).filter((name) => {
      try {
        return statSync(path.join(MIGRATIONS_DIR, name)).isDirectory();
      } catch {
        return false;
      }
    });
    hasBaselineDir = entries.some((name) => name.endsWith('_baseline'));
    migrationDirNote = hasBaselineDir
      ? `found ${entries.find((n) => n.endsWith('_baseline'))}`
      : `no migration directory ends with "_baseline" (${entries.length} migrations present)`;
  }

  const ciText = readTextIfExists(CI_WORKFLOW_PATH);
  let ciBlocking = false;
  let ciNote = '.github/workflows/ci.yml not found';
  if (ciText !== null) {
    const lines = ciText.split(/\r?\n/);
    // Find the step whose `run:` invokes `prisma migrate deploy`, then look
    // backward to the start of that step (the previous `- name:` line) for a
    // `continue-on-error: true` sibling key.
    const deployLineIdx = lines.findIndex((l) => /prisma\s+migrate\s+deploy\b/.test(l) && /run:/.test(l));
    if (deployLineIdx === -1) {
      ciNote = 'no step in ci.yml runs "prisma migrate deploy"';
    } else {
      let stepStart = deployLineIdx;
      while (stepStart > 0 && !/^\s*-\s*name:/.test(lines[stepStart])) {
        stepStart -= 1;
      }
      const stepBlock = lines.slice(stepStart, deployLineIdx + 1).join('\n');
      const hasContinueOnError = /continue-on-error:\s*true/.test(stepBlock);
      ciBlocking = !hasContinueOnError;
      ciNote = hasContinueOnError
        ? 'the "prisma migrate deploy" step still has continue-on-error: true (non-blocking)'
        : 'the "prisma migrate deploy" step is blocking (no continue-on-error: true)';
    }
  }

  const ok = hasBaselineDir && ciBlocking;
  return {
    kind: 'verified',
    ok,
    detail: `${migrationDirNote}; ${ciNote}`,
  };
}

function checkSandboxNet() {
  const settings = readJsonIfExists(CLAUDE_SETTINGS_PATH);
  if (settings === null) {
    return { kind: 'verified', ok: false, detail: '.claude/settings.json not found or not valid JSON' };
  }
  const enabled = settings?.sandbox?.enabled === true;
  const domains = settings?.sandbox?.network?.allowedDomains;
  const hasDomains = Array.isArray(domains) && domains.length > 0;
  const ok = enabled && hasDomains;
  const detail = ok
    ? `sandbox.enabled=true, sandbox.network.allowedDomains has ${domains.length} entries`
    : `sandbox.enabled=${JSON.stringify(settings?.sandbox?.enabled)}, ` +
      `sandbox.network.allowedDomains=${hasDomains ? `${domains.length} entries` : 'missing/empty'}`;
  return { kind: 'verified', ok, detail };
}

function checkConnPruneOrNeonRo() {
  // Connector scope/mode is account-level (claude.ai Settings -> Connectors)
  // and cannot be verified from inside the repo. Report a couple of
  // repo-side proxy signals instead, purely informational.
  const mcpConfig = readJsonIfExists(MCP_CONFIG_PATH);
  let mcpNote;
  if (mcpConfig === null) {
    mcpNote = '.mcp.json not found';
  } else {
    const servers = Object.keys(mcpConfig.mcpServers ?? {});
    const dbLike = servers.filter((name) => /neon|postgres|database|db/i.test(name));
    mcpNote =
      dbLike.length === 0
        ? `.mcp.json declares no database server (servers: ${servers.join(', ') || 'none'}) — OK`
        : `.mcp.json declares a database-looking server: ${dbLike.join(', ')} — check this`;
  }

  const settings = readJsonIfExists(CLAUDE_SETTINGS_PATH);
  let denyNote;
  if (settings === null) {
    denyNote = '.claude/settings.json not found or not valid JSON';
  } else {
    const deny = settings?.permissions?.deny ?? [];
    const deniesDeleteProject = Array.isArray(deny) && deny.includes('mcp__Neon__delete_project');
    denyNote = deniesDeleteProject
      ? '.claude/settings.json denies mcp__Neon__delete_project — OK'
      : '.claude/settings.json does NOT deny mcp__Neon__delete_project';
  }

  return {
    kind: 'manual',
    detail: `manual — see task text (proxy: ${mcpNote}; ${denyNote})`,
  };
}

function checkActionsBilling() {
  const ciText = readTextIfExists(CI_WORKFLOW_PATH);
  if (ciText === null) {
    return { kind: 'manual', detail: 'manual — confirm in GitHub Actions (proxy: .github/workflows/ci.yml not found)' };
  }
  const lines = ciText.split(/\r?\n/);
  const jobsIdx = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  const jobNames = [];
  if (jobsIdx !== -1) {
    for (let i = jobsIdx + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\S/.test(line)) break; // dedented past the jobs: block
      const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
      if (m) jobNames.push(m[1]);
    }
  }
  return {
    kind: 'manual',
    detail:
      `manual — confirm in GitHub Actions (proxy: .github/workflows/ci.yml exists` +
      `${jobNames.length ? `, jobs: ${jobNames.join(', ')}` : ''})`,
  };
}

function checkManualOnly() {
  return { kind: 'manual', detail: 'manual — see task text' };
}

const CHECKERS = {
  'BASELINE-MIG': checkBaselineMigration,
  'SANDBOX-NET': checkSandboxNet,
  'CONN-PRUNE': checkConnPruneOrNeonRo,
  'NEON-RO': checkConnPruneOrNeonRo,
  'ACTIONS-BILLING': checkActionsBilling,
  'PUSH-PROTECT': checkManualOnly,
  'BRANCH-PROTECT': checkManualOnly,
};

// ---------------------------------------------------------------------------
// 3. Run it.
// ---------------------------------------------------------------------------

function main() {
  const markdown = readTextIfExists(OPERATOR_TASKS_PATH);
  if (markdown === null) {
    console.error(`[operator-tasks] ERROR: ${path.relative(REPO_ROOT, OPERATOR_TASKS_PATH)} not found`);
    process.exitCode = STRICT ? 1 : 0;
    return;
  }

  const items = parseCheckboxes(markdown);
  if (items.length === 0) {
    console.log('[operator-tasks] no checkbox items found in docs/ops/OPERATOR_TASKS.md');
    console.log('[operator-tasks] 0 open, 0 done, 0 repo-verified');
    return;
  }

  console.log('[operator-tasks] docs/ops/OPERATOR_TASKS.md status\n');

  let openCount = 0;
  let doneCount = 0;
  let repoVerifiedCount = 0;
  let repoVerifiableUnverified = 0;

  for (const item of items) {
    if (item.done) doneCount += 1;
    else openCount += 1;

    const box = item.done ? '[x]' : '[ ]';
    const checker = CHECKERS[item.id];
    let verdictLine = '';

    if (checker) {
      const result = checker();
      if (result.kind === 'verified') {
        const verdict = result.ok ? 'VERIFIED' : 'UNVERIFIED';
        if (result.ok) repoVerifiedCount += 1;
        else repoVerifiableUnverified += 1;
        verdictLine = `      repo-check: ${verdict} — ${result.detail}`;
      } else {
        verdictLine = `      ${result.detail}`;
      }
    } else {
      verdictLine = '      manual — see task text';
    }

    console.log(`- ${box} ${item.id} — ${truncateForDisplay(item.text)}`);
    console.log(verdictLine);
  }

  console.log('');
  console.log(`[operator-tasks] ${openCount} open, ${doneCount} done, ${repoVerifiedCount} repo-verified`);

  if (STRICT && repoVerifiableUnverified > 0) {
    console.error(
      `[operator-tasks] --strict: ${repoVerifiableUnverified} repo-verifiable item(s) unverified`,
    );
    process.exitCode = 1;
  }
}

main();
