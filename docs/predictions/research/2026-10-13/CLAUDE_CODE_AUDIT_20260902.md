# Claude Code Setup Audit — v7.0 (THE SWARM) — 2026-09-02

Repo: beexly/sports @ 8e55293 (== origin/main, working tree clean). Mode: DELTA against the v6.0 baseline (50/100, same commit, ~1 h earlier). **No commits landed between the two audits, so every score movement below is rubric-driven, not code-driven.**

Method: 10 inventory threads run in parallel inline (the v7 bash blocks) → 10 adversarial verifiers (one per dimension; evidence / substitute / fix lenses; ≤12 tool calls each) → 1 completeness critic. 11 agents, 112 tool calls, 0.88M tokens, 29 min wall-clock (18:09–18:38 UTC; 4-CPU box caps concurrency at 2).

Verification outcome: 0 of 67 baseline findings refuted, 67 still open. 14 new gaps surfaced (listed under NEW-*). Critic corrected 5 evidence details (docs/positioning.md line numbers, a guard-dir count, MC-3 wording, migration count 54→53, and a note on how the baseline file sums).

## Executive Summary

| | |
|---|---|
| Total Score | **37 / 100** (v6.0: 50; Δ −13, 100% rubric-driven) |
| Maturity Tier | **Growing** (lower half) |
| Stack | Next.js 14.2 App Router + TS 5.9 + Prisma 5.22 + Neon + NextAuth v5 + Stripe + Vercel |
| Agents | 10 inventory threads + 10 verifiers + 1 critic |
| Always-loaded context | ~8.2K tokens refined (~12K by the prompt formula) |

### Quick wins (<15 min)
1. **POSITION wording + brand rule** — CLAUDE.md:5 and README.md:5-6 "AI-assisted prediction ranking" → "deterministic factor-model prediction ranking"; add Non-Negotiable rule 8 quoting the brand line with pointers to docs/positioning.md:11 and apps/web/lib/compliance-scanner/rules.ts:41. Also widen docs/positioning.md:27's "What Not To Say" list, which itself omits "AI-assisted".
2. **Port .grok/config.toml into .claude/settings.json** — the committed Grok policy already has the Edit-glob denies (prisma/**, .github/**, scripts/guardrails/**, env files), wildcard prisma Bash denies, npm db-wrapper asks, and an 18-entry read-only allow list that Claude's settings lack. One owner-approved edit closes SEC-02, SEC-03, SEC-05, CRIT-B, CRIT-C and adds mcp__Neon rules.
3. **.gitignore + selftest** — add `!.claude/rules/`, `!.claude/agents/`, `!.claude/hooks/` after .gitignore:190 (delete the duplicate block at :83-85); append `node scripts/guardrails/agent-bash-guard.mjs --selftest` to the `guardrails` npm script so the hook is CI-tested.

### Critical gaps
1. **POSITION (CRITICAL)** — "AI-assisted prediction ranking" in the first sentence of always-loaded memory and the public README. No CI scanner reaches root docs; no existing regex would match it if one did.
2. **Security** — guard bypassed by every wrapper probe (`bash -c`, `sh -c`, `eval`, `/usr/bin/sudo`, `\sudo`, `command`, `env`, `timeout`); `npm run db:push` and self-modification of the guard/settings pass; Neon MCP write tools (run_sql, delete_*, reset_from_parent) have zero rules; no allow list; bypassPermissions not disabled while a tracked skill offers it.
3. **Memory drift** — Tech Stack names two libraries never installed (BullMQ, Supertest) and Docker Compose instead of Vercel+Neon; six phantom subagents; Repository Structure maps 4 of 18 packages; AGENTS.md laws not imported and its loop contradicts CLAUDE.md's.

## Dimension Scorecard (v7 rubric, with v6 delta)

| # | Dimension | v7 | Max | v6 | Δ | Status | Key finding |
|---|---|---|---|---|---|---|---|
| 1 | Memory & Context | 10 | 20 | 11 | −1 | ⚠️ | Full 20 for budget; −4 positioning violation at line 5, −2 brand line absent, −1 AGENTS.md not imported + contradictory loop, −2 stack section wrong, −1 phantom table + archived links |
| 2 | Rules Hygiene | 0 | 10 | 5 | −5 | ❌ | No rules dir; .gitignore:187 would discard one; v7 removes v6's substitute credit for the 26 guard scripts |
| 3 | Skills Quality | 1 | 10 | 6 | −5 | ❌ | 2 skills: description 2/2, effort 0/2, allowed-tools 0/2; −2 for 14 orphaned SKILL.md in docs/agent-skills |
| 4 | Agents/Commands | 6 | 10 | 5 | +1 | ⚠️ | 34/34 frontmatter+description, 5/5 argument-hint; −2 phantom subagents; rubric caps a perfect repo at 8 |
| 5 | Security Posture | 12 | 20 | 10 | +2 | ⚠️ | env deny 3/4 (enumerated, no glob), pem 2/3 (no credentials pattern), PreToolUse 4/4, sandbox 0/3, no secrets 3/3, wrappers 0/3 (all probes ALLOW) |
| 6 | MCP Ecosystem | 1 | 10 | 3 | −2 | ❌ | Nothing declared in any repo/CLI scope (1/3 for account-level connectors); no docs MCP; Neon write mode; no mcp__ rules |
| 7 | Workflow Commands | 0 | 10 | 4 | −4 | ❌ | All five canonical filenames absent; v6 credited debug/repro/preflight equivalents, v7 is mechanical |
| 8 | Freshness | 7 | 10 | 6 | +1 | ⚠️ | No deprecated IDs 3/3, git 90d 2/2, commands 30d 0/3 (last 2026-06-17), disableSkillShellExecution unset 2/2 |
| — | POSITION | unscored | — | — | — | ❌ CRITICAL | CLAUDE.md:5, README.md:5-6 |
| — | Stack-specific | unscored | — | — | — | ⚠️ | Prisma/caching/Vercel discipline exists as code and runbooks, none in Claude-loaded config; CI applies schema via db push, migrations never run before the Vercel build |
| | **TOTAL** | **37** | **100** | **50** | **−13** | | |

Rubric-effect breakdown (critic): Rules −5 and Workflow −4 (substitute/equivalent credit removed), Skills −5 (effort/allowed-tools now weighted 5 plus the −2 orphan penalty), MCP −2 (account-level connectors no longer count), Memory −1 (AGENTS.md deduction applied); Agents +1, Security +2, Freshness +1 from literal application of mechanical lines. Note on the baseline file: baseline.jsonl holds the pre-critic v6 scores (sum 59.5 incl. stack); the v6 report applied the critic's adjustments (MC 13→11, Rules 6→5, Security 10.5→10) and treated POSITION/stack as unscored, giving the reported 50.

## Detailed Findings

All 67 baseline findings re-verified as still open on HEAD 8e55293; full baseline text is in CLAUDE_CODE_AUDIT_2026-09-02.md. Below: the confirmed top items per dimension in the v7 format, then the NEW gaps this pass surfaced.

### 1. Memory & Context — 10/20

**ID**: MC-1 · **Gap**: CLAUDE.md:5 "AI-assisted prediction ranking" · **Root Cause**: bootstrap commit 18acbd99 (2026-04-07) predates docs/positioning.md; the L1-AI-POWERED regex matches powered/driven/enabled only, so no lint ever flagged it · **Impact**: the first substantive sentence every session reads frames the pick engine as AI · **Fix**: replace with "deterministic factor-model prediction ranking" at CLAUDE.md:5 and README.md:5-6 · **Effort**: Low · **Evidence**: verbatim on disk; `git log -S'AI-assisted' -- CLAUDE.md` → 18acbd99 only; docs/positioning.md:7 "built on deterministic scoring", :11 brand line.

**ID**: MC-2 · **Gap**: brand line, docs/positioning.md and the compliance scanner are unreferenced in CLAUDE.md and .claude/ · **Root Cause**: positioning authored after CLAUDE.md, never back-ported · **Impact**: agents have no always-loaded "what not to say" · **Fix**: Non-Negotiable rule 8 · **Effort**: Low · **Evidence**: `grep -rniE 'not AI|math you can read' CLAUDE.md AGENTS.md .claude/` → 0 hits.

**ID**: MC-3 · **Gap**: AGENTS.md's nine laws are not @imported and its ledger loop contradicts CLAUDE.md:200 · **Root Cause** (critic reword): AGENTS.md was written for the Grok/Codex/Copilot fleet, which reads it natively (.grok/config.toml:1-3); Claude Code needs the import · **Impact**: Claude Code sessions run under a different operating contract than the other agents · **Fix**: `@AGENTS.md` in CLAUDE.md, one reconciled loop · **Effort**: Low · **Evidence**: `grep -n '^@' CLAUDE.md` exit 1; hooks = [PreToolUse] only.

**ID**: MC-6 · **Gap**: Tech Stack section wrong on four counts · **Root Cause**: section written at bootstrap, never revised across 2,162 commits · **Impact**: an agent following it would import two libraries that are not installed · **Fix**: rewrite CLAUDE.md:9-17 (Vercel + Neon; Vercel Cron; Vitest + Testing Library; multi-source free data) · **Effort**: Low · **Evidence**: bullmq/supertest in 0 package.json and 0 lockfile entries; docker-compose has no app service; apps/web/lib/data-sources/ has espn-public.ts, cfb-free.ts, multi-source-scores.ts.

MC-4 (phantom subagent table), MC-5 (four links to docs/ops/archive/root-museum/), MC-7 (four product names), MC-8 (AGENTS.md:18 vs :93 exit-code contradiction; START_HERE.md Windows path and expired "flip in August" note) all confirmed, Low effort.

**ID**: NEW-E · **Gap**: Repository Structure maps 4 of 18 workspace packages and none of apps/web/lib's 162 subdirs; six packages have zero importers and are neither listed nor marked dormant · **Impact**: wrong mental model of the monorepo · **Fix**: regenerate the block from `npm query .workspace` and mark dormant packages · **Effort**: Medium · **Evidence**: CLAUDE.md:20-33 vs `ls -d packages/*`.

**ID**: NEW-F · **Gap**: ~119 of CLAUDE.md's 212 lines (56%) are path-specific doctrine (Legal Scraping Posture :148-195 alone is 48 lines scoped to apps/web/lib/scraping/**) loaded for every session · **Fix**: move to .claude/rules/scraping.md with `paths:` after the .gitignore fix · **Effort**: Medium · **Evidence**: `grep -n '^## ' CLAUDE.md`.

**ID**: NEW-L · **Gap**: CLAUDE.local.md is not gitignored and no always-loaded text says per-developer overrides go there; commands are flat with generic names (debug, lint, perf) that can shadow user-level commands · **Fix**: add `CLAUDE.local.md` to .gitignore; two-line override note; optionally namespace audit/* · **Effort**: Low · **Evidence**: .gitignore:186-187; `find .claude/commands -mindepth 2 | wc -l` → 0.

### 2. Rules Hygiene — 0/10

**ID**: CRIT-A · **Gap**: .gitignore:187 `.claude/*` ignores rules/, agents/, hooks/ · **Root Cause**: allowlist written for the three dirs that existed · **Impact**: every "create .claude/rules" remediation in this report is un-committable as written · **Fix**: add `!.claude/rules/`, `!.claude/agents/`, `!.claude/hooks/`; delete the duplicate block :83-85 · **Effort**: Low · **Evidence**: `git check-ignore -v .claude/rules/x.md` → .gitignore:187.

**ID**: R2-1 · **Gap**: scripts/guardrails/run-all.mjs is dead; the `guardrails` npm script and ci.yml:334-352 run a 22-step `&&` chain that omits em-dash-scan, dependency-audit and the guard selftest · **Fix**: point the script at run-all.mjs · **Effort**: Low · **Evidence**: package.json:78; `grep -rn run-all package.json .github/workflows` → none.

**ID**: R2-2 · **Gap**: no Prisma rule; CLAUDE.md:143-144 advertises `npm run db:push` while AGENTS.md law 7 forbids it · **Fix**: Prisma section in CLAUDE.md (see stack) · **Effort**: Low.

R2-3 (API gating helper unnamed), R2-4 (agent-skills doctrine has no path attachment), R2-5 ("no any" ESLint in 1 of 23 workspaces), R2-6 (BullMQ) confirmed.

### 3. Skills Quality — 1/10

**ID**: S3-1 · **Gap**: 14 docs/agent-skills/*/SKILL.md (valid name/description frontmatter) invisible to the loader · **Root Cause**: written as "process capital" docs before .claude/skills existed; never linked · **Impact**: the only auto-loaded skills are two vendored delegation tools · **Fix**: symlink or build-copy into .claude/skills; keep docs/agent-skills canonical · **Effort**: Medium · **Evidence**: `find docs/agent-skills -name SKILL.md | wc -l` → 14; `ls -la .claude/skills` shows no symlinks.

**ID**: S3-2 · **Gap**: `npm run agent:eval` exits 1 (52/53; cron-3h predicate) and is not in CI · **Effort**: Low.
**ID**: S3-4 · **Gap**: neither SKILL.md has effort/allowed-tools/disable-model-invocation (verifier confirmed `effort` is a real optional key in 2.1.258) · **Fix**: add `disable-model-invocation: true` and `allowed-tools` · **Effort**: Low.
**ID**: SEC-12 · **Gap**: claude-delegate relay.mjs:70,304,590 offers `--dangerously-skip-permissions`; grok-delegate offers `--full-access` · **Fix**: repo-specific "never use bypass profiles here" note · **Effort**: Low.

### 4. Agents/Commands — 6/10

**ID**: AC-2 · **Gap**: audit-stripe.md:4-5 and safety-check.md:5 assert "Stripe is test-mode only" as a hard stop; prod has run live keys since 2026-07-09 · **Root Cause**: commands authored 2026-06-17 pre-launch, never revised · **Impact**: /safety-check returns a false at-risk verdict or steers an agent toward reverting Stripe to test mode · **Fix**: "live keys only in prod env; no live secrets in tracked files or client bundle; webhook signature verified" · **Effort**: Low · **Evidence**: docs/ops/STRIPE_GO_LIVE_CHECKLIST.md:1,29,78.

**ID**: AC-1 · **Gap**: six advertised subagents, zero definitions · **Fix**: define under .claude/agents (after CRIT-A) or delete CLAUDE.md:44-53 · **Effort**: Medium.
**ID**: AC-3 · **Gap**: 24 read-only commands with no `allowed-tools` · **Effort**: Medium.
**ID**: AC-4 · **Gap**: commands paraphrase guard scripts and never invoke them · **Fix**: `!npm run guard:secrets` style injection · **Effort**: Low.
**ID**: AC-5 · **Gap**: calibrate.md:5 "150 target" vs MIN_SETTLED_PICKS_FOR_LEARNING = 100 · **Effort**: Low.
AC-6 (GSN in 4 files), AC-7 (audit.md = union of six audit-*), AC-8 (polish/lint skip verify block), AC-9 (non-existent UI element names) confirmed.

**ID**: NEW-G · **Gap**: /preflight asks for "env var parity between local and prod", which the repo's own guard makes unexecutable (any display of a real env file is denied) and which names no tool · **Fix**: point preflight at scripts/check-deploy-readiness.mjs / `npm run deploy:ready` · **Effort**: Low · **Evidence**: .claude/commands/preflight.md:4-5.

### 5. Security Posture — 12/20

**ID**: SEC-01 · **Gap**: guard bypassed by wrappers · **Root Cause**: CMD anchor at agent-bash-guard.mjs:30 matches bare names at command position only · **Impact**: any deny rule can be trivially wrapped · **Fix**: accept path/backslash/wrapper prefixes; recurse into `-c` strings; treat `source` as a read · **Effort**: Medium · **Evidence** (re-probed live in hook mode): `sudo ls` DENY, but `bash -c "sudo ls"`, `sh -c 'sudo ls'`, `eval sudo ls`, `/usr/bin/sudo ls`, `\sudo ls`, `command sudo ls`, `env sudo ls`, `timeout 5 sudo ls` all ALLOW exit 0.

**ID**: SEC-02 · **Gap**: `npm run db:push`, `npm run db:migrate`, `npm run db:push -- --force-reset` all ALLOW · **Root Cause**: DB_CLIENTS at guard line 60 is psql|mysql|mongo|sqlite3|prisma|npx prisma; ask list has only the `npx prisma` forms · **Fix**: add `Bash(npm run db:push*)`, `Bash(npm run db:migrate*)`, `Bash(npm run db:seed*)` to ask; add wrapper forms to the guard · **Effort**: Low.

**ID**: SEC-03 · **Gap**: `sed -i` on the guard and `echo '{}' > .claude/settings.json` both ALLOW; zero Edit/Write rules · **Fix**: deny Edit/Write on .claude/settings.json, scripts/guardrails/**, .github/workflows/** (already in .grok/config.toml) · **Effort**: Low.

**ID**: SEC-04 · **Gap**: hook path relative → MODULE_NOT_FOUND off-root → fail-open; malformed JSON → allow · **Fix**: `$CLAUDE_PROJECT_DIR`; deny on parse failure · **Effort**: Low.
**ID**: SEC-05 · **Gap**: env Read denies enumerated (root, apps/web, packages/db only) · **Fix**: the `Read(**/.env*)` glob form already in .grok/config.toml · **Effort**: Low.
**ID**: SEC-06 · **Gap**: selftest never runs in CI · **Effort**: Low.
**ID**: SEC-07 · **Gap**: guard over-triggers on prose (blocked this audit's report heredoc and three read-only greps) · **Effort**: Medium.
**ID**: SEC-09 · **Gap**: no WebFetch rules; `npx --yes`, `curl | node`, `bash <(curl)` pass · **Effort**: Low.
**ID**: SEC-10 · **Gap**: git hooks not installed in this checkout (no node_modules → `prepare` never ran); CI backstop reportedly idle on Actions minutes · **Effort**: Low + operator.
**ID**: SEC-11 · **Gap**: Neon MCP write mode, destructive tools, zero mcp__ rules · **Fix**: operator sets connector read-only; repo denies `mcp__Neon__delete_*`, `reset_from_parent`, `restore_snapshot`, asks on `run_sql*`, `prepare_database_migration` · **Effort**: Low.
**ID**: CRIT-B · **Gap**: .grok/config.toml is a stronger committed policy never mirrored · **Fix**: port it; add a sync guard · **Effort**: Low.
**ID**: CRIT-C · **Gap**: `permissions.allow` absent, `defaultMode` unset → every read-only Bash prompts, or sessions escalate to acceptEdits/bypass where the ask list prompts nobody · **Fix**: allow list from .grok/config.toml (git status/diff/log, npm run typecheck/lint/test, node scripts/guardrails/*) · **Effort**: Low.
**ID**: CRIT-D · **Gap**: only PreToolUse/Bash registered; no PostToolUse, Stop, SessionStart · **Effort**: Low.

**ID**: NEW-A · **Gap**: `permissions.disableBypassPermissionsMode` not set, so nothing at project level refuses bypassPermissions sessions, while a tracked skill (claude-delegate) offers `--dangerously-skip-permissions` · **Fix**: `"disableBypassPermissionsMode": "disable"` under permissions · **Effort**: Low · **Evidence**: `jq '.permissions|keys' .claude/settings.json` → ["ask","deny"].

**ID**: NEW-B · **Gap**: home-directory secret denies are written as cwd-relative globs (`Read(**/id_rsa)`, `Read(**/.bash_history)`) and do not cover $HOME · **Fix**: add `Read(~/.ssh/**)`, `Read(~/.aws/**)`, `Read(~/.netrc)`, `Read(~/.bash_history)`, `Read(~/.zsh_history)` · **Effort**: Low · **Evidence**: `jq -r '.permissions.deny[]'` shows no `~/` or `//` prefixes; /root/.ssh exists in this session.

### 6. MCP Ecosystem — 1/10

**ID**: MCP-1 · **Gap**: write-capable MCP tools (Neon write, GitHub push/merge/delete_file, Vercel pause_project) have zero ask/deny rules · **Effort**: Low.
**ID**: MCP-2 · **Gap**: 8 of 11 connectors unrelated (Gmail send/trash, Drive share/trash, finance, Figma, Notion, QuickNode, Isometric, Profound); docs/ops/EFFICIENCY_AUDIT_2026-08-13.md already ranked pruning #1 · **Fix**: operator prunes to github, Neon (read-only), Vercel · **Effort**: operator.
**ID**: MCP-3/4/5 · no contributor doc, no .mcp.json (never in history), runbook references unconfigured Stripe/AgentMail MCPs · **Effort**: Low.

**ID**: NEW-I · **Gap**: docs/audit/agentic-owasp-controls.md:172-185 (LLM07) classifies MCP tool providers as a future exposure while 11 connectors with destructive tools are live · **Fix**: inventory the real connector set as present exposure with mitigations · **Effort**: Low.
**ID**: NEW-M · **Gap**: a first-party read-only MCP server over the settled ledger is specified (docs/ops/2026-08-22-SONNET-PLAN.md:252-257, task L2) but never built · **Effort**: High.

### 7. Workflow Commands — 0/10

**ID**: WF-1 · **Gap**: no /commit although AGENTS.md:10-40, 88-96 prescribes one-task-one-commit, stage by name, `[hermes-<id>]` tag, ledger row in the same commit, verify block, and scripts/ops/check-agent-ledger.mjs enforces it in CI · **Effort**: Medium.
**ID**: WF-2 · **Gap**: preflight.md never runs `npm run deploy:ready`, `guardrails`, `evals:contracts`, `test:fast`, `prisma migrate status` · **Effort**: Low.
**ID**: WF-3 · **Gap**: no /review-pr; checklist only in the claude-delegate skill references · **Effort**: Low.
WF-4 (/canary), WF-5 (/release-notes), WF-6 (/qa), WF-7 (debug.md ignores /api/ops/public-surface-truth) confirmed Low.

**ID**: NEW-H · **Gap**: direct ancestors of the missing commands (code-review ≈ /review-pr, quality-gate ≈ /qa, push-safe/checkpoint ≈ /commit) already exist on the PR #145 source branch, dispositioned RETAIN_ON_BRANCH pending a telemetry gate (#150) · **Fix**: close #150 as abandoned or cherry-pick the three files; cheapest path to Workflow points · **Effort**: Low · **Evidence**: docs/ai/phase0/PR145_COMPLETE_DISPOSITION_2026-07-21.json:163-172.

### 8. Freshness — 7/10

**ID**: F8-1 · **Gap**: AGENTS.md:15-16,25 point at docs/ops/AGENT_LEDGER.md (frozen 2026-08-22) and BUILD-QUEUE-*.md; 16 LQ-tagged commits since are tracked in unreferenced docs/data/FLEET_DISPATCH.md · **Fix**: dated banner; correct AGENTS.md:3 to "auto-loaded by Grok/Codex; Claude Code via @import" · **Effort**: Low.
**ID**: F8-2 · **Gap**: BullMQ/Supertest never declared · **Effort**: Low.
**ID**: F8-4 (upgraded to medium) · **Gap**: all 34 commands from one commit 12ffe531 (2026-06-17), unrevised across 1,556 commits, content verifiably stale (safety-check.md:5) · **Fix**: scripts/guardrails/claude-config-links.mjs resolving backticked paths and `npm run` tokens · **Effort**: Medium.
F8-3, F8-5, F8-6 confirmed Low.

## POSITION Compliance Check

❌ **Not compliant. CRITICAL.**

| File:line | Exact text | Class |
|---|---|---|
| CLAUDE.md:5 | "A production-grade sports picks platform with real data ingestion, **AI-assisted prediction ranking**, subscription paywalls, content generation, and automated job scheduling." | (a) violation |
| README.md:5-6 | "Sports picks platform with real data ingestion, **AI-assisted prediction** / **ranking**…" | (a) violation, public |
| AGENTS.md, START_HERE.md, CONTRIBUTING.md, .claude/**, docs/agent-skills/** | clean | — |
| CLAUDE.md:14 | "AI Layer: Claude API (content generation only — not source of truth)" | (b) legitimate |

Standard applied: docs/positioning.md:7 ("built on deterministic scoring") and :11 (brand line). Enforcement that exists: apps/web/lib/compliance-scanner/rules.ts:41-54 (L1-AI-POWERED, L1-MULTIMODAL-INTELLIGENCE; block severity; CI-tested) and scripts/guardrails/trust-gate.mjs:77-82 BS-004 "AI picks" (two CI jobs). Coverage gaps: trust-gate SCAN_DIRS (:94-98) = apps/web/app, components, lib, packages; docs-public-copy-scan.test.ts:39-45 DOCS excludes README/CLAUDE/AGENTS/START_HERE; no regex matches "AI-assisted".

**NEW-C (high)**: docs/positioning.md:27's "What Not To Say" list reads exactly "AI-powered, AI-driven, or powered by AI" — the source-of-truth doc omits AI-assisted, AI-based, machine learning, artificial intelligence, so a literal reading would pass the violation. Fix: extend line 27.
**NEW-D (medium)**: three divergent ban lists (rules.ts:44, trust-gate.mjs:82, analyst-standard.ts) with no shared source. Fix: one exported positioning-vocab list consumed by all three.
**POS-03/04/05** confirmed: add root docs to the DOCS array; widen the regex; add BS-004 to trust-claims.ts.

## Stack-Specific Recommendations

**Prisma** — 53 migrations (baseline's 54 corrected) + migration_lock.toml. CLAUDE.md:142-144 lists db:push/db:migrate with no discipline text (STACK-01, medium). ci.yml:86 applies schema via `npm run db:push`; `migrate deploy` is commented out in neon_workflow.yml:57-64, so the migration ledger is first exercised in the Vercel production build. **NEW-J**: root package.json has no `db:migrate:status` / `db:migrate:dev` passthroughs, so the migration-status check /preflight asks for cannot run as documented. Fix: Prisma section in CLAUDE.md; add the two root passthroughs; CI step `prisma migrate deploy` + `migrate diff` before db push; ask-gate npm wrappers.

**Next.js caching** — STACK-02 downgraded to medium: 275 files already export `force-dynamic`, 43 use `no-store`, and the helper apps/web/lib/api/no-store.ts exists; the pick/odds surfaces are covered in code. The gap is documentation: CLAUDE.md has zero caching guidance for rule 5. Fix: five-line "Rendering & caching" section naming the helper and the rule for pick/odds/entitlement routes.

**Vercel deployment** — vercel.json: `ignoreCommand` → scripts/vercel-skip-build.mjs, buildCommand runs scripts/deploy/migrate-if-configured.mjs, 21 cron entries; none of it is in CLAUDE.md (STACK-05). No SessionStart hook (STACK-03): in this very session node_modules is absent, `prepare` never ran, core.hooksPath is unset, so the .githooks secret-scan gates AGENTS.md law 6 relies on are off for every web session. Fix: SessionStart hook `[ -d node_modules ] || npm install` (runs prepare + postinstall prisma generate); document the deploy gates; make preflight.md run `npm run deploy:ready`.

**Paywall** — STACK-04 confirmed: name `getUserEntitlements` / `getViewerEntitlements` (apps/web/lib/entitlements.ts) and `requireEntitlement` (apps/web/lib/api-entitlement.ts) under rule 3.

## Auto-fix Menu

| # | Fix | Files | Effort | Dependencies |
|---|---|---|---|---|
| 1 | POSITION wording fix (+ widen docs/positioning.md:27) | CLAUDE.md, README.md, docs/positioning.md | 5 min | None |
| 2 | settings.json hardening: port .grok/config.toml deny+allow; npm db-wrapper asks; Edit/Write denies; env glob; `~/` secret paths; mcp__Neon/GitHub/Vercel rules; `$CLAUDE_PROJECT_DIR` hook path; disableBypassPermissionsMode | .claude/settings.json | 15 min | AGENTS.md law 2 |
| 3 | .gitignore unblock rules/agents/hooks + CLAUDE.local.md; selftest into `guardrails` script | .gitignore, package.json | 2 min | AGENTS.md law 2 (guardrails script) |
| 4 | Brand rule #8 addition | CLAUDE.md | 5 min | None |
| 5 | Stripe "test-mode" text fix | audit-stripe.md, safety-check.md | 5 min | AGENTS.md law 2 |
| 6 | Calibrate 150→100 | calibrate.md | 2 min | AGENTS.md law 2 |
| 7 | AGENTS.md import + FLEET_DISPATCH banner + Tech Stack/links correction | CLAUDE.md, AGENTS.md | 5 min | None |
| 8 | New commands: commit, review-pr, qa, canary (cherry-pick PR #145 ancestors where they fit) | .claude/commands/ | 45 min | AGENTS.md law 2 |

Also surfaced this pass, not in the menu: SessionStart hook (STACK-03, 2 min, law 2), POSITION lint widening (POS-03/04, NEW-D, 15 min), root db:migrate passthroughs (NEW-J, 2 min), CI migrate deploy step (10 min). Operator-only: Neon connector to read-only, prune connectors, restore Actions billing.

## Verification record

- Verifier probes re-run: guard bypass (8 wrapper forms ALLOW), npm db wrappers ALLOW, guard/settings self-modification ALLOW, selftest OK 30/18.
- `effort:` confirmed as a real optional SKILL.md key in Claude Code 2.1.258 (Skills verifier).
- Evidence corrections applied: docs/positioning.md brand line is :11 (not :9), "What Not To Say" heading :25 / bullet :27 (not :26), "deterministic scoring" :7 (not :6); scripts/guardrails has 31 entries (not 30); migrations 53 (not 54); MC-3 reworded (AGENTS.md:3 is true for Grok/Codex, false only for Claude Code).
