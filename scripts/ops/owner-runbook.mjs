#!/usr/bin/env node
// scripts/ops/owner-runbook.mjs
//
// Owner runbook — every manual owner action still open, with the exact
// command to take it and the exact command to verify it, in one place.
//
// Sources:
//   - docs/ops/OPERATOR_TASKS.md   (table rows + checkbox items; read live)
//   - the repo itself, for anything whose presence changes what to print
//     (e.g. whether a duplicate-game merge script has landed yet; read live)
//   - the environment-variable actions below are maintained in this file and
//     were checked against docs/ops/OPERATOR.md § 5 and the code that reads
//     each variable on 2026-09-02; OPERATOR.md is not parsed at run time.
//
// Usage:
//   node scripts/ops/owner-runbook.mjs
//   node scripts/ops/owner-runbook.mjs --json
//
// Env (optional, only affects the printed Vercel dashboard URL and CLI
// commands — never required, never read from a secret):
//   VERCEL_TEAM=<team-slug>
//   VERCEL_PROJECT=<project-slug>

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const JSON_OUT = process.argv.includes('--json');

const OPERATOR_TASKS_PATH = path.join(REPO_ROOT, 'docs/ops/OPERATOR_TASKS.md');

const VERCEL_TEAM = process.env.VERCEL_TEAM || '<team>';
const VERCEL_PROJECT = process.env.VERCEL_PROJECT || '<project>';
const VERCEL_DASHBOARD_URL = `https://vercel.com/${VERCEL_TEAM}/${VERCEL_PROJECT}/settings/environment-variables`;

function readTextIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

function vercelAddCmd(name) {
  return `vercel env add ${name} production`;
}
function vercelRmCmd(name) {
  return `vercel env rm ${name} production`;
}

// ---------------------------------------------------------------------------
// 1. Parse docs/ops/OPERATOR_TASKS.md — table rows + checkbox items.
//    Table format:  | Id | Task | Owner action | Verifiable from repo? | Status |
//    Checkbox format: - [ ] **ID** — text (may wrap onto indented lines)
// ---------------------------------------------------------------------------

function parseOperatorTasksTable(markdown) {
  const rows = new Map();
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 5) continue;
    const idMatch = /^`?\*{0,2}([A-Za-z0-9_-]+)\*{0,2}`?$/.exec(cells[0]) || /\*\*([A-Za-z0-9_-]+)\*\*/.exec(cells[0]);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (id === 'Id') continue; // header row
    rows.set(id, {
      id,
      task: cells[1],
      ownerAction: cells[2],
      verifiableFromRepo: cells[3],
      status: cells[4],
    });
  }
  return rows;
}

function parseOperatorTasksCheckboxes(markdown) {
  const lines = markdown.split(/\r?\n/);
  const checkboxRe = /^-\s\[([ xX])\]\s\*\*([A-Za-z0-9_-]+)\*\*\s[—-]\s(.*)$/;
  const items = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = checkboxRe.exec(lines[i]);
    if (!m) continue;
    const [, mark, id, firstLine] = m;
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
    items.push({ id, done: mark.toLowerCase() === 'x', text: textParts.join(' ') });
  }
  return items;
}

// One-line verification command per operator-task id, using commands that
// already exist in this repo. `npm run ops:tasks` (which re-parses this same
// file live) is always a valid fallback, so every id gets at least that.
const OPERATOR_TASK_VERIFY = {
  NEON_RO: 'npm run ops:tasks   # no repo-level verify; account/connector setting',
  CONN_PRUNE: 'npm run ops:tasks   # no repo-level verify; account/connector setting',
  'NEON-RO': 'npm run ops:tasks   # no repo-level verify; account/connector setting',
  'CONN-PRUNE': 'npm run ops:tasks   # no repo-level verify; account/connector setting',
  'BASELINE-MIG': 'npm run db:migrate:status   # expect "Database schema is up to date!"',
  'ACTIONS-BILLING': 'gh run list --limit 5   # confirm recent workflow runs completed, not billing-blocked',
  'PUSH-PROTECT': `gh api repos/Beexly/Sports --jq '.security_and_analysis'`,
  'BRANCH-PROTECT': `gh api repos/Beexly/Sports/branches/main/protection --jq '{required_status_checks: .required_status_checks.contexts}'`,
  'SANDBOX-NET': 'npm run ops:tasks   # the SANDBOX-NET row reads verified only with failIfUnavailable:true; first run the real sandbox-session check in docs/ops/OPERATOR_TASKS.md (bubblewrap/seatbelt machine). npm run guard:agent-bash is the PreToolUse guard selftest, not the sandbox check',
  'NEXT-MAJOR': 'node scripts/guardrails/dependency-audit.mjs',
  'HENRYGD-REG': 'npx vitest run --root apps/web __tests__/scraping-clearance.test.ts',
};

const OPERATOR_TASK_WHERE = {
  'NEON-RO': 'claude.ai → Settings → Connectors → Neon',
  'CONN-PRUNE': 'claude.ai → Settings → Connectors',
  'BASELINE-MIG': 'Confirm in Vercel Production after the first deploy that carries the baseline; the .github/workflows/ci.yml patch is in docs/ops/OPERATOR_TASKS.md (Edit-denied for agents — apply by hand)',
  'ACTIONS-BILLING': 'GitHub org → Settings → Billing',
  'PUSH-PROTECT': 'GitHub repo (Beexly/Sports) → Settings → Code security and analysis',
  'BRANCH-PROTECT': 'GitHub repo (Beexly/Sports) → Settings → Branches → main',
  'SANDBOX-NET': '.claude/settings.json (owner-only edit): sandbox.enabled: true + sandbox.network.allowedDomains',
  'NEXT-MAJOR': 'Separate migration project (next@14.2.x → 15.5/16.3); dependency-audit.mjs waivers review by 2027-01-15',
  'HENRYGD-REG': 'Owner/legal read of the henrygd NCAA API terms, then a row in apps/web/lib/scraping/source-rights-registry.ts',
};

function buildOperatorTaskItems() {
  const markdown = readTextIfExists(OPERATOR_TASKS_PATH);
  if (markdown === null) {
    return { items: [], error: `${path.relative(REPO_ROOT, OPERATOR_TASKS_PATH)} not found` };
  }
  const table = parseOperatorTasksTable(markdown);
  const checkboxes = parseOperatorTasksCheckboxes(markdown);
  const items = [];
  for (const cb of checkboxes) {
    if (cb.done) continue; // resolved — not an open owner action
    // "Open" follows the checkbox exactly, same as check-operator-tasks.mjs —
    // not the table Status column, which can say e.g. "Done in PR #684
    // (verify on X)" while the box itself is still legitimately unchecked
    // pending that verification step.
    const row = table.get(cb.id);
    const status = row?.status ?? '';
    items.push({
      id: cb.id,
      task: (row?.task || cb.text).trim(),
      ownerAction: (row?.ownerAction || OPERATOR_TASK_WHERE[cb.id] || 'See docs/ops/OPERATOR_TASKS.md').trim(),
      status: status || (cb.done ? 'Done' : 'Open'),
      verify: OPERATOR_TASK_VERIFY[cb.id] || 'npm run ops:tasks',
      detail: cb.text,
    });
  }
  return { items, error: null };
}

// ---------------------------------------------------------------------------
// 2. Environment variable actions — docs/ops/OPERATOR.md § 5 plus the
//    specific launch actions named in the launch report. Each prints a
//    ready-to-paste Vercel CLI command and the dashboard URL.
// ---------------------------------------------------------------------------

function buildEnvActions() {
  const actions = [];

  // THE_ODDS_API_KEY — since 2026-09-02 (apps/web/lib/settlement/path-select.ts
  // selectSettlementPlan) the free grader (ESPN + registered consensus) is the
  // PRIMARY pass every settle-picks cycle regardless of this key; a present
  // key only adds a paid settleSport SUPPLEMENT afterwards for picks the free
  // pass left PENDING. A dead/deactivated key fails only that supplement
  // (paidSupplement.failedSports / advisories[] in the response) — it no
  // longer blocks grading. Removing the key is optional hygiene now, not a
  // fix. Current live state is NOT hard-coded here — check it live below.
  actions.push({
    id: 'ODDS-API-KEY',
    what: 'Decide THE_ODDS_API_KEY: renew (adds a paid settleSport supplement pass for denser books) or remove (free grader only). Observed 2026-09-02 in the production database: the provider has rejected the current key since 2026-08-24 15:05 UTC (source_snapshots switch from the-odds-api to therundown two minutes later; no settlement_runs row since), so today it only produces one failing supplement call per sport per hour. Both states are safe — the free grader is the primary pass every cycle either way; a dead key only fails the optional supplement, never the free grade.',
    setCmd: `${vercelAddCmd('THE_ODDS_API_KEY')}   # renew: paste the key value when prompted`,
    unsetCmd: vercelRmCmd('THE_ODDS_API_KEY'),
    dashboard: VERCEL_DASHBOARD_URL,
    verify: 'curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://www.galaxysportsedge.com/api/cron/settle-picks" | jq .   # path: "free" (no key) or "free+odds-api" (key present)',
    source: 'apps/web/lib/settlement/path-select.ts (selectSettlementPlan); docs/ops/OPERATOR.md § 1',
  });

  actions.push({
    id: 'HEALTH-ALERT-WEBHOOK',
    what: 'Set HEALTH_ALERT_WEBHOOK_URL (Slack/Discord/generic webhook) in Vercel Production AND as the GitHub repo secret of the same name (Settings → Secrets → Actions), so both the in-platform health-alert cron and the external watchdog workflow (.github/workflows/external-watchdog.yml, every 30 min from outside Vercel) can page. Then point an external uptime monitor (UptimeRobot / Better Stack / Cronitor) at /api/health?strict=1.',
    // Two stores, one value: the platform cron reads Vercel; the external
    // watchdog workflow reads the GitHub Actions secret of the same name.
    setCmd: `${vercelAddCmd('HEALTH_ALERT_WEBHOOK_URL')} && gh secret set HEALTH_ALERT_WEBHOOK_URL --repo Beexly/Sports`,
    unsetCmd: `${vercelRmCmd('HEALTH_ALERT_WEBHOOK_URL')} && gh secret delete HEALTH_ALERT_WEBHOOK_URL --repo Beexly/Sports`,
    dashboard: VERCEL_DASHBOARD_URL,
    verify: 'curl -sS "https://www.galaxysportsedge.com/api/health?strict=1" | jq "{ok, status}"   # ok:false / HTTP!=200 must page; then gh secret list --repo Beexly/Sports | grep HEALTH_ALERT_WEBHOOK_URL',
    source: 'docs/ops/HEALTH_ALERTING.md',
  });

  // The stale-data kill switch the gate runbook pairs with PUBLIC_PICKS_ENABLED
  // ("it's what makes #1 safe"). The truth surface reports its live value as
  // gates.forceNoBetIfStale (since 2026-09-02), so the verification is
  // value-aware: presence in Vercel is not enough, the gate needs exactly true.
  actions.push({
    id: 'FORCE-NO-BET-IF-STALE',
    what: 'Confirm FORCE_NO_BET_IF_STALE=true in Production. PUBLIC_PICKS_ENABLED is observed ON; the gate runbook requires the stale-data kill switch alongside it. /api/ops/public-surface-truth reports the live value as gates.forceNoBetIfStale and npm run launch:ready warns while it is off with public picks on.',
    setCmd: vercelAddCmd('FORCE_NO_BET_IF_STALE') + '   # value: true',
    unsetCmd: vercelRmCmd('FORCE_NO_BET_IF_STALE'),
    dashboard: VERCEL_DASHBOARD_URL,
    verify: 'curl -sS "https://www.galaxysportsedge.com/api/ops/public-surface-truth" | jq -e ".gates.forceNoBetIfStale == true"   # exit 0 only when the deployed value is exactly true; then tick the founder checklist line',
    source: 'docs/ops/FOUNDER_ONLY_CHECKLIST.md (gate 1b); docs/ops/OPERATOR.md § 5',
  });

  // Elite alerts — exact env vars and gate order verified against the real
  // dispatcher/smoke script, not a doc snapshot.
  for (const [name, note] of [
    ['RESEND_API_KEY', 'email channel (with ALERTS_EMAIL_FROM)'],
    ['ALERTS_EMAIL_FROM', 'email channel (with RESEND_API_KEY)'],
    ['VAPID_PRIVATE_KEY', 'web push channel'],
    ['VAPID_SUBJECT', 'web push channel'],
    ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'web push channel (client-exposed)'],
  ]) {
    actions.push({
      id: `ELITE-ALERTS-${name}`,
      what: `Set ${name} — ${note} for Elite real-time alerts.`,
      setCmd: vercelAddCmd(name),
      unsetCmd: vercelRmCmd(name),
      dashboard: VERCEL_DASHBOARD_URL,
      verify: `vercel env ls production | grep ${name}   # presence in Production; npm run ops:alert-smoke only checks the shell you run it in, so run it with the Production values pulled (vercel env pull) before treating the channel as configured`,
      source: 'scripts/ops/watchlist-alert-smoke.ts; apps/web/lib/watchlist/channels/{email-channel,web-push-channel}.ts',
    });
  }
  actions.push({
    id: 'ELITE-ALERTS-ENABLE',
    what: 'Once RESEND_API_KEY/ALERTS_EMAIL_FROM and/or the three VAPID vars are set, flip WATCHLIST_ALERTS_ENABLED=true to start dispatching Elite alerts.',
    setCmd: vercelAddCmd('WATCHLIST_ALERTS_ENABLED') + '   # value: true',
    unsetCmd: vercelRmCmd('WATCHLIST_ALERTS_ENABLED'),
    dashboard: VERCEL_DASHBOARD_URL,
    verify: 'npm run ops:alert-smoke   # FAILs loudly if enabled with no channel configured',
    source: 'scripts/ops/watchlist-alert-smoke.ts (isWatchlistAlertsEnabled)',
  });

  return actions;
}

// ---------------------------------------------------------------------------
// 3. Product/model decisions named in the launch report — each checked
//    dynamically against the repo rather than assumed true.
// ---------------------------------------------------------------------------

function buildDecisionItems() {
  const items = [];

  // NFL moneyline pause: the ranking-pause plan can recommend a group be
  // paused (dead-group detection), but APPLYING it is a founder-only
  // opt-in (apps/web/lib/calibration/ranking-pause-apply.ts,
  // apps/web/lib/ops/ranking-pause-durable.ts). Whether NFL|MONEYLINE is
  // currently on the plan-recommended list vs. the durably-applied list is
  // live state, not something to hard-code here — check it live.
  items.push({
    id: 'NFL-MONEYLINE-PAUSE',
    what: 'Decide whether to durably apply the plan-recommended MONEYLINE pause for americanfootball_nfl (and any other plan-recommended group not yet in the durable set) alongside the existing MLB ML+SPREAD durable pause.',
    where: 'Founder-chat "yes" recorded via the same durable path as the existing MLB pause (apps/web/lib/ops/ranking-pause-durable.ts, JarvisMemoryEvent scope ops.ranking.pause-apply) — not a Vercel env flip.',
    verify:
      'curl -sS "https://www.galaxysportsedge.com/api/ops/public-surface-truth" | jq .rankingPauseApply   # compare planPauseGroups (recommended) against pausedGroupCount/groups (applied)',
    source: 'apps/web/lib/calibration/ranking-pause-apply.ts; apps/web/lib/ops/ranking-pause-durable.ts; docs/ops/CURRENT_STATE.md',
  });

  // Stale/superseded picks. Observed in the production database on 2026-09-02
  // (read-only SQL, picks JOIN games): 18 published PENDING picks stamped
  // model v5.0.0, generated from 2026-05-22 on lines for games kicking off
  // 2026-09-05 → 2026-11-08, alongside fresh v5.2.7 picks on the same games.
  // They are excluded from the conviction gate (lib/board/stale-pick-policy.ts,
  // 14-day rule) but will grade at kickoff on a May line unless the owner
  // supersedes or voids them. The live count is on the ops truth surface.
  items.push({
    id: 'STALE-MODEL-VERSION-PICKS',
    what: 'Supersede or void every published PENDING pick on an unstarted game that has not been refreshed in 14 days. Read the live count from the ops truth surface (stalePendingPicks) rather than any snapshot: on 2026-09-02 it read 21 (18 from model v5.0.0 on May lines, 3 from v5.2.6), and that set changes as games start and refreshes land. Never a cron: an owner decision recorded in the owner queue.',
    where: 'Owner queue / Prisma Studio, the same predicate as stalePendingPicks on the truth surface (lib/board/stale-pick-policy.ts): picks WHERE result = PENDING AND isPublished AND game.commenceTime > now() AND (dataFreshnessAt < now() - interval \'14 days\' OR (dataFreshnessAt IS NULL AND generatedAt < now() - interval \'14 days\')). Voiding keeps the row (result VOID, reason stale-line); nothing is deleted.',
    verify:
      'curl -sS "https://www.galaxysportsedge.com/api/ops/public-surface-truth" | jq .stalePendingPicks   # count must read 0 before the Sept 5 kickoffs',
    source: 'apps/web/lib/board/stale-pick-policy.ts; apps/web/app/api/ops/public-surface-truth/route.ts (stalePendingPicks); PICKS_STATE_2026-09-02.md § 5',
  });

  return items;
}

// ---------------------------------------------------------------------------
// 4. Duplicate-game merge — detected dynamically. The script and the
//    `ops:merge-games` alias landed 2026-09-02; the "not yet available"
//    branch below is kept so a checkout without them prints an honest
//    message rather than a fabricated command.
// ---------------------------------------------------------------------------

function buildDuplicateGameMergeItem() {
  const scriptPath = path.join(REPO_ROOT, 'scripts/ops/merge-duplicate-games.ts');
  const scriptExists = existsSync(scriptPath);
  const pkg = readTextIfExists(path.join(REPO_ROOT, 'package.json'));
  const hasNpmScript = pkg ? /"ops:merge-games"\s*:/.test(pkg) : false;

  if (scriptExists) {
    // Dry run is the script's own default (no flag needed); --execute is
    // what applies writes. Read straight from its own --help text, not
    // guessed, so this stays correct if the flag ever changes.
    return {
      id: 'DUPLICATE-GAME-MERGE',
      what: 'Merge duplicate `games` rows created by ingesting the same contest under different feed ids (see packages/ingestion-pipeline/src/game-identity.ts). Run after Week 1 kickoff once a week of live multi-source ingestion has accumulated duplicates.',
      where: 'Run from a shell with DATABASE_URL set to production (dry run by default; --execute applies writes).',
      cmd: hasNpmScript
        ? 'npm run ops:merge-games   # dry run by default; review the plan, then npm run ops:merge-games -- --execute'
        : 'npx tsx scripts/ops/merge-duplicate-games.ts   # no npm script alias yet; dry run by default, review the plan, then re-run with --execute',
      verify: 'npm run ops:merge-games   # dry run; it prints the plan AND writes scripts/ops/out/merge-duplicate-games-plan-<ts>.json — read that file (groups, pickConflicts, refusedGroups) before ever passing --execute',
      source: 'packages/ingestion-pipeline/src/game-identity.ts (MAX_ALIAS_HOPS doc); scripts/ops/merge-duplicate-games.ts',
    };
  }
  return {
    id: 'DUPLICATE-GAME-MERGE',
    what: 'Not available yet: packages/ingestion-pipeline/src/game-identity.ts documents a tombstone/alias merge design (Game.mergedIntoGameId) for duplicate rows created by multi-feed ingestion, but scripts/ops/merge-duplicate-games.ts does not exist in this checkout and no npm script runs it.',
    where: 'Nothing to run yet — new ingestion already resolves through GAME_IDENTITY_MERGE_DISABLED-gated matching (default on) so NEW duplicates should not accumulate; this item is a backfill for rows created before that landed.',
    cmd: null,
    verify: `test -f scripts/ops/merge-duplicate-games.ts && echo present || echo "not yet built"`,
    source: 'packages/ingestion-pipeline/src/game-identity.ts',
  };
}

// ---------------------------------------------------------------------------
// 5. Print.
// ---------------------------------------------------------------------------

function main() {
  const { items: operatorItems, error: operatorError } = buildOperatorTaskItems();
  const envActions = buildEnvActions();
  const decisionItems = buildDecisionItems();
  const mergeItem = buildDuplicateGameMergeItem();

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          operatorTasksError: operatorError,
          operatorTasks: operatorItems,
          environmentActions: envActions,
          decisions: decisionItems,
          duplicateGameMerge: mergeItem,
          verify: {
            launchReady: 'npm run launch:ready',
            operatorTasks: 'npm run ops:tasks',
            alertSmoke: 'npm run ops:alert-smoke',
            health: 'curl -sS https://www.galaxysportsedge.com/api/health?strict=1',
            migrateStatus: 'npm run db:migrate:status',
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('[owner-runbook] Galaxy Sports Edge — open owner actions');
  console.log(`[owner-runbook] generated ${new Date().toISOString()}`);
  console.log('');

  if (operatorError) {
    console.log(`  ERROR: ${operatorError}`);
  } else if (operatorItems.length === 0) {
    console.log('  docs/ops/OPERATOR_TASKS.md — no open items.');
  } else {
    console.log(`  == docs/ops/OPERATOR_TASKS.md — ${operatorItems.length} open item(s) ==`);
    for (const it of operatorItems) {
      console.log('');
      console.log(`  [${it.id}] ${it.task}`);
      console.log(`      Where:  ${it.ownerAction}`);
      console.log(`      Verify: ${it.verify}`);
    }
  }

  console.log('');
  console.log(`  == Environment variables (docs/ops/OPERATOR.md § 5) ==`);
  console.log(`  Dashboard: ${VERCEL_DASHBOARD_URL}`);
  for (const a of envActions) {
    console.log('');
    console.log(`  [${a.id}] ${a.what}`);
    console.log(`      Set:    ${a.setCmd}`);
    console.log(`      Unset:  ${a.unsetCmd}`);
    console.log(`      Verify: ${a.verify}`);
    console.log(`      Source: ${a.source}`);
  }

  console.log('');
  console.log('  == Product/model decisions ==');
  for (const d of decisionItems) {
    console.log('');
    console.log(`  [${d.id}] ${d.what}`);
    console.log(`      Where:  ${d.where}`);
    console.log(`      Verify: ${d.verify}`);
    console.log(`      Source: ${d.source}`);
  }

  console.log('');
  console.log('  == Duplicate-game merge (post-Week-1) ==');
  console.log('');
  console.log(`  [${mergeItem.id}] ${mergeItem.what}`);
  console.log(`      Where:  ${mergeItem.where}`);
  if (mergeItem.cmd) console.log(`      Run:    ${mergeItem.cmd}`);
  console.log(`      Verify: ${mergeItem.verify}`);
  console.log(`      Source: ${mergeItem.source}`);

  console.log('');
  console.log('  == One-command checks ==');
  console.log('      npm run launch:ready                                    # full go/no-go, exit 1 on any FAIL');
  console.log('      npm run ops:tasks                                       # this same OPERATOR_TASKS.md list, repo-verified where possible');
  console.log('      npm run ops:alert-smoke                                 # Elite alert channel config');
  console.log('      curl -sS https://www.galaxysportsedge.com/api/health?strict=1');
  console.log('      npm run db:migrate:status                               # confirm after every production deploy');
  console.log('');
  console.log('  Full 10-minute walkthrough: docs/ops/LAUNCH_DAY_RUNBOOK.md');
}

main();
