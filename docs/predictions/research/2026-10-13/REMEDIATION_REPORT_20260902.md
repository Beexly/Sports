# Claude Code setup remediation — completion report — 2026-09-02

PR: https://github.com/Beexly/Sports/pull/684 (draft, branch claude/audit-code-setup-v6-v9z8cd, 4 commits, 106 files, +2457/−287)
Baseline: v7.0 audit 37/100 at 8e55293. Result: **91/100** (v7 rubric, re-run against the remediated tree).

## Before / after

| # | Dimension | Before | After | Max | Why not full marks |
|---|---|---|---|---|---|
| 1 | Memory & Context | 10 | 18 | 20 | README/CONTRIBUTING still titled "Sports Intelligence OS"; the prompt formula counts all 16 SKILL.md bodies (26.8K) though the always-loaded set is ~12.4K |
| 2 | Rules Hygiene | 0 | 10 | 10 | 4 rules, all with frontmatter + paths, <150 lines, .gitignore fixed |
| 3 | Skills Quality | 1 | 8 | 10 | 16/16 with description, effort, allowed-tools; the rubric's orphan check still finds the 14 canonical files in docs/agent-skills (now synced, not orphaned) |
| 4 | Agents/Commands | 6 | 8 | 10 | Rubric allocates only 8 positive points; 7 agents defined, phantom deduction gone |
| 5 | Security Posture | 12 | 18 | 20 | Sandbox declared but disabled pending a network-allowlist test |
| 6 | MCP Ecosystem | 1 | 9 | 10 | .mcp.json (github, context7, vercel), no DB MCP declared, 49 mcp__ rules; the account-level Neon write connector remains until the operator flips it |
| 7 | Workflow Commands | 0 | 10 | 10 | investigate, qa, canary, land-and-deploy, review-pr (+ commit) |
| 8 | Freshness | 7 | 10 | 10 | Commands revised today; no deprecated model IDs; cache workaround unset |
| | **Total** | **37** | **91** | **100** | Tier: Optimized |

POSITION compliance: ✅ CLAUDE.md, README.md, AGENTS.md, START_HERE.md, CONTRIBUTING.md clean. One vocabulary file (apps/web/lib/positioning-vocab.json, 22 phrases) now drives the runtime L1 rule, the CI trust-gate (which scans those five root docs), the BS-004 trust-claims entries, and the docs copy-scan test. Negative test passed: reintroducing "our AI-assisted picks" fails both trust-gate and lint:brand.

## Blocks executed

| Block | Status | Notes |
|---|---|---|
| 1 POSITION wording | ✅ | CLAUDE.md:5, README.md:5-6, docs/positioning.md:27 widened |
| 2 .gitignore unblock | ✅ | rules/agents/hooks un-ignored, CLAUDE.local.md ignored, duplicate block removed |
| 3 Brand rule 8 | ✅ | References the banned list (CLAUDE.md is now lint-scanned, so no literal phrases) |
| 4 @AGENTS.md import | ✅ | Plus reconciled operating loop, AGENTS.md line-3 fix, FLEET_DISPATCH banner, exit-code fix |
| 5 Tech Stack | ✅ | Vercel + Neon, Vercel Cron, Vitest, free-first data; Repository Structure now covers 23 workspaces |
| 6 settings.json | ✅ | 33 allow / 40 ask / 113 deny, disableBypassPermissionsMode, $CLAUDE_PROJECT_DIR hook, SessionStart install hook, sandbox declared (disabled) |
| 7 Guard script | ✅ (intent, not the sketch) | Wrapper/path/escape unwrapping, per-segment file rules, quote-stripped do-rules, ask decisions, self-protection, fail-closed; selftest 67/7/41 |
| 8 db:migrate passthroughs | ✅ | db:migrate:status, db:migrate:dev at root (status needs a DB to exercise) |
| 9 CI migrations | ⚠️ partial by evidence | Replay check added non-blocking: history is not replayable (no migration creates picks/users); baseline migration is an owner task |
| 10 Rules | ✅ | scraping, prisma, api-gating (real helpers: gateApi, requirePremiumApi, getUserEntitlements), nextjs-caching (jsonNoStore) |
| 11 Skills | ✅ (copies, not symlinks) | scripts/sync-agent-skills.mjs + --check in the guardrail suite; 14 synced + 2 vendored, all with effort/allowed-tools |
| 12 Commands | ✅ | commit, review-pr, qa, canary, investigate, land-and-deploy |
| 13 Stale commands | ✅ | Stripe test-mode hard stop, calibrate 100, GSN→GSE, phantom UI names, preflight runs real gates, allowed-tools on 37 |
| 14 Lint widening | ✅ | rules.ts, trust-gate.mjs (SCAN_FILES), trust-claims.ts, docs-public-copy-scan; integrity page copy reworded |
| 15 guardrails → run-all | ✅ | 27 guards all reported; surfaced and fixed the hidden dependency-audit red (browserslist, fast-uri patch bumps) |
| Operator notice | ✅ | docs/ops/OPERATOR_TASKS.md |

## Validation run

| Check | Result |
|---|---|
| npm run guardrails (run-all, 27 guards) | 27/27 pass |
| npm run lint:brand | 3,683/3,683 |
| guardrail + compliance + trust-claims + docs copy-scan tests | 151/151 |
| tsc --noEmit -p apps/web | clean |
| npm run lint --workspace=apps/web | clean (max-warnings 0) |
| npm ci from patched lockfile | clean |
| node scripts/guardrails/agent-bash-guard.mjs --selftest | 67 denied / 7 ask / 41 allowed |
| node scripts/sync-agent-skills.mjs --check | OK, 14 in sync |
| node --test scripts/vercel-skip-build.test.mjs | pass |
| npm run agent:eval | 52/53 — unchanged pre-existing cron-3h predicate |
| pre-commit / pre-push secret-scan | OK on all 4 commits and the push |
| Local CI simulation (Postgres 16) | migrate deploy fails at first migration → drove the Block 9 decision |

## Files changed (106)

- Root/memory: CLAUDE.md, AGENTS.md, README.md, START_HERE.md, .gitignore, .mcp.json, package.json, package-lock.json
- Policy: .claude/settings.json, scripts/guardrails/agent-bash-guard.mjs, scripts/guardrails/run-all.mjs, scripts/guardrails/trust-gate.mjs, .github/workflows/ci.yml
- Claude Code config: .claude/rules (4), .claude/agents (7), .claude/skills (16), .claude/commands (40: 6 new, 34 revised), scripts/sync-agent-skills.mjs
- Docs: docs/positioning.md, docs/ops/OPERATOR_TASKS.md, docs/agent-skills (README + 14 SKILL.md frontmatter)
- App: apps/web/lib/positioning-vocab.{json,ts}, apps/web/lib/compliance-scanner/rules.ts, apps/web/lib/trust-claims.ts, apps/web/app/integrity/page.tsx, 3 tests

## Remaining risk

- The CI "Migration history replay check" is red-but-allowed on every run until the baseline migration lands (owner task).
- `defaultMode: "default"` and the Edit/Write denies on policy paths change how every future session behaves; an owner edits those files outside an agent from now on.
- The account-level Neon write connector, connector pruning, Actions billing, and push protection are operator-only and still open.
- `sandbox` is disabled; enabling it needs a network allowlist test.
- The two Next 16 dependency waivers expire for review on 2026-11-01.

## Next safest step

Merge PR #684 after review; then work docs/ops/OPERATOR_TASKS.md top to bottom (Neon read-only first, baseline migration second). Re-run the v7 audit after those to claim the remaining 9 points.
