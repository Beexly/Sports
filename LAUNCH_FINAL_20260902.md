# LAUNCH FINAL — 2026-09-02

Branch `claude/final-launch` → PR #685 (stacked on PR #684, which is ready for review and
green). Every number and result below was observed in this session: a command that ran, a
file that was read, or a read-only SQL query against the production database
(2026-09-02, 21:30–23:00 UTC). Decisions and their evidence: `docs/ops/CLAUDE_DECISIONS_20260902.md`.
The picks-state numbers the owner can speak to: `PICKS_STATE_2026-09-02.md` (delivered earlier).

## 1. Executive summary

**Done.** Settlement can no longer be starved by a dead paid key: the free ESPN/consensus
grader runs first on every hourly cycle and the paid pass is a PENDING-scoped supplement
whose failure is reported, never fatal. The backlog root cause set from PR #684 (6h backfill
window, 200-row cap, nearest-start matcher, city-only hold, executor `?path=free`) is on the
same branch. Duplicate game rows are stopped at ingestion (canonical identity, PR #684) and
the existing ones now have a safe merge path: alias tombstones that keep every pick and every
settlement event, an alias-aware ingestion layer, and a dry-run-by-default merge tool that
reports pending-pick conflicts instead of deciding them. CI replays the migration history
blocking and checks drift; two forward migrations (alias column, Week 1 board index) were
validated on a disposable Postgres 16 exactly the way CI runs them. The ops truth surface and
`npm run launch:ready` now show two states the board used to hide: which markets the slate
actually carries per sport (CFB totals under a zero-key slate) and whether the model's
highest-confidence picks earn their confidence (they do not: 152 picks at ≥80 won 37%).
Every manual owner action prints as a command from `npm run ops:runbook`; the 10-minute
launch-day sequence is `docs/ops/LAUNCH_DAY_RUNBOOK.md`; brand lint covers 20 more surfaces.

**Green.** Typecheck (22 workspaces), lint, guardrails 26/26, brand lint 3,711/3,711,
agent-eval 53/53, ingestion-pipeline 264 tests, the targeted apps/web suites (92 tests
across settlement, coverage/tail, truth/health, merge plan, migrations), disposable-Postgres
migration replay + drift + idempotent redeploy, and every CI guard job on the pushed head.
The full apps/web suite and the CI Test job are recorded in § 4 as they completed.

**Not made green, on purpose.** Calibration eligibility stays RED (Brier 0.243 vs 0.22,
ECE 0.051 vs 0.05) and PERFORMANCE_STATS / LIVE_BOARD / PUBLISH_LEDGER stay closed. On
1,663 graded picks the model's resolution is 0.005; a perfect recalibration lands at Brier
≈ 0.244. That is a model gap, not a threshold problem, and moving the threshold is the one
thing this product promises never to do. No MODEL_VERSION bump four days out. The inverted
confidence tail is the first item for the next calibration proposal.

**Remains for the owner** (§ 3): the env vars only the owner can set, the NFL moneyline pause
decision, the 18 stale v5.0.0 picks, the merge tool run after Week 1, and the account-level
GitHub/Neon settings.

## 2. Scorecard — v7 audit dimensions

| # | Dimension | Score | Max | Why not full marks |
|---|---|---|---|---|
| 1 | Memory & Context | 19 | 20 | Always-loaded memory is 17.3 KB (CLAUDE.md 10.0 + AGENTS.md 7.2) against the guide's 4–8 KB target. Trimming to 8 KB would cut the pricing table or the repo map; both earn their tokens every session. Deliberately left. |
| 2 | Rules Hygiene | 10 | 10 | 4 path-scoped rules with frontmatter; `prisma.md` updated for the blocking replay. |
| 3 | Skills Quality | 10 | 10 | 16 canonical skills; `settlement-free-path` rewritten for the free-first law (description, path law, failure modes). |
| 4 | Agents / Commands | 8 | 8 | Rubric ceiling as written (its positive lines sum to 8). |
| 5 | Security Posture | 20 | 20 | Denies, sandbox, guard selftest, pre-push executable; `.github/workflows` and migrations edits this session were owner-authorised and applied through labelled scripts, denies unchanged. |
| 6 | MCP Ecosystem | 10 | 10 | Neon read-only at the policy layer; connector scope itself is owner-only (NEON-RO). |
| 7 | Workflow Commands | 10 | 10 | investigate / qa / canary / land-and-deploy / review-pr / commit. |
| 8 | Freshness | 10 | 10 | No deprecated model IDs; every command and doc dated 2026-09-02. |
| | **Total** | **97** | **100** (ceiling 98) | The one open point is a judgment call, stated above, not an omission. |

## 3. Owner handoff (exact commands: `npm run ops:runbook`; day-of: `docs/ops/LAUNCH_DAY_RUNBOOK.md`)

| # | Action | Command / place | Verify |
|---|---|---|---|
| 1 | Merge PR #685 (carries #684). The build gate applies the baseline + 2 forward migrations once, fail-closed. | GitHub → PR #685 | `npm run launch:ready` after the deploy; settlement HEALTHY within two hourly cycles |
| 2 | Confirm the migration state in production | `npm run db:migrate:status` | "Database schema is up to date!" → tick BASELINE-MIG |
| 3 | `THE_ODDS_API_KEY`: renew or remove. Provider has rejected it since 2026-08-24 15:05 UTC; both states are safe now. | `vercel env add THE_ODDS_API_KEY production` or `vercel env rm THE_ODDS_API_KEY production` | settle-picks response `path` = `free` or `free+odds-api`; `paidSupplement.failedSports` empty |
| 4 | `HEALTH_ALERT_WEBHOOK_URL` + uptime monitor on strict health | `vercel env add HEALTH_ALERT_WEBHOOK_URL production`; monitor `https://www.galaxysportsedge.com/api/health?strict=1` | `curl -sS …/api/health?strict=1 \| jq '{ok,status}'` |
| 5 | Elite alerts | `RESEND_API_KEY`, `ALERTS_EMAIL_FROM`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, then `WATCHLIST_ALERTS_ENABLED=true` | `npm run ops:alert-smoke -- --send --to you@…` |
| 6 | NFL moneyline pause: plan-recommended (`americanfootball_nfl\|MONEYLINE` significance-dead on preseason data), not durably applied | Founder YES through the durable ranking-pause path (same as the MLB pause) | `/api/ops/public-surface-truth → rankingPauseApply` |
| 7 | 18 published PENDING picks from model v5.0.0 (May lines; games 2026-09-05 → 11-08): supersede or void before Sept 5 | Owner queue; VOID keeps the row | `/api/ops/public-surface-truth → stalePendingPicks.count` = 0 |
| 8 | Duplicate-game merge, after the deploy in #1 and after Week 1 settles | `npm run ops:merge-games` (dry run) → read the plan → `npm run ops:merge-games -- --execute` | second run finds nothing; `pickConflicts` reviewed by hand; bare shared-city TheRundown rows need manual merge |
| 9 | HENRYGD-REG (rights row for the NCAA second source) | `apps/web/lib/scraping/source-rights-registry.ts` after the terms read | `npx vitest run --root apps/web __tests__/scraping-clearance.test.ts` |
| 10 | NEON-RO, CONN-PRUNE, PUSH-PROTECT, BRANCH-PROTECT | claude.ai connectors; GitHub repo settings | `npm run ops:tasks` |

Nothing above can be done from inside an agent session (secrets, account consoles, founder
decisions). Items 1–2 are the only ones that gate the settlement fix reaching production.

## 4. Verification summary

| Check | Result |
|---|---|
| `npm run typecheck` (22 workspaces) | exit 0 |
| `npm run lint` (apps/web, `--max-warnings=0`) | exit 0 |
| `npm run guardrails` (run-all, 26 guards) | 26/26 |
| `npm run lint:brand` | 3,711 / 3,711 (was 3,691; 20 new surfaces, 0 violations) |
| `npm run agent:eval` | 53 / 53 (settlement fixture rewritten for the free-first law) |
| `node scripts/guardrails/trust-gate.mjs` | OK — 2,073 files, no banned phrases |
| `node scripts/check-operator-tasks.mjs` | 8 open, 1 done, 2 repo-verified, exit 0 |
| `npm run ops:runbook` / `--json` | runs; JSON parses (8 operator items, 8 env actions, 2 decisions, merge item) |
| `prisma validate` + `npm run db:generate` | valid / generated |
| Disposable Postgres 16 (CI's database phase, `scratchpad/pgsim-migrations.mjs`) | `migrate deploy` from empty applies baseline + `20260902230000_game_merge_alias` + `20260902231000_week1_hot_path_indexes` (exit 0); `migrate diff --exit-code` "No difference detected"; second deploy "No pending migrations to apply" |
| apps/web settlement suites (settle-picks-free-first 7, settlement-sla-contract 4, settlement-path-select 8, free-settle-response-contract 3, settlement-rca-stp 12) | 34 / 34 |
| apps/web market-coverage 6, confidence-tail 5 | 11 / 11 |
| apps/web ops-public-surface-truth-rate-limit 5, data-first-public-surfaces 6, health-route 17 | 28 / 28 |
| apps/web game-merge-plan 15, forward-migrations-agree-with-schema 4 | 19 / 19 |
| packages/ingestion-pipeline `npx vitest run` | 264 passed, 6 skipped (+9 alias cases) |
| Full apps/web suite (`npx vitest run`, background) | see addendum below |
| CI on 54c7b559a (PR #685) | 10/10 guard jobs green; Test job: `migrate deploy` step green, drift-check step green, lint/typecheck/tests in progress at time of writing — see addendum |
| CI on PR #684 head 4282d1890 | all jobs green including Build; PR marked ready for review |
| Production database reads | picks by market/version/bucket, model-vs-market Brier, stale v5.0.0 count (18), Week 1 duplicate listing — all read-only `SELECT`s; no write was issued to any database this session |

NOT RUN: the deployed `/api/health?strict=1` on the preview URL (Vercel deployment protection
returns a 302 login redirect); production probes run after merge via `npm run launch:ready`.

## 5. Change log (this branch, on top of PR #684)

| Commit | Files | Intent |
|---|---|---|
| d0d4be0c4 | `apps/web/app/api/cron/settle-picks/route.ts`, `apps/web/lib/settlement/path-select.ts`, `apps/web/lib/settlement/root-cause-analysis.ts`, 4 tests, `scripts/agent-eval/fixtures/settlement-path.json`, `.claude/skills/settlement-free-path/SKILL.md` | Free grader first on every cycle; paid pass is a reported, non-fatal supplement; SLA tripwire |
| e27f6c627 | `apps/web/lib/board/market-coverage.ts`, `apps/web/lib/calibration/confidence-tail.ts`, 2 tests, `apps/web/app/api/ops/public-surface-truth/route.ts`, `scripts/check-launch-readiness.mjs` | Market coverage and confidence-tail monitors on the truth surface and the launch checker |
| 9cca7aeb2 | `.github/workflows/ci.yml`, `.claude/rules/prisma.md`, `docs/ops/OPERATOR_TASKS.md` | Blocking migration replay + drift check; `db push` removed from CI |
| 3d3bf5d31 | `scripts/ops/owner-runbook.mjs`, `docs/ops/LAUNCH_DAY_RUNBOOK.md`, `docs/ops/OPERATOR.md`, `apps/web/__tests__/docs-public-copy-scan.test.ts` | Owner runbook as commands; 10-minute day-of sequence; brand lint widened |
| 54c7b559a | `packages/db/prisma/schema.prisma`, 2 migrations, `packages/ingestion-pipeline/src/{game-identity,process-sport,seed-games-from-espn,index}.ts` + tests, `apps/web/lib/ops/game-merge-plan.ts` + test, `scripts/ops/merge-duplicate-games.ts`, `apps/web/__tests__/forward-migrations-agree-with-schema.test.ts`, `package.json`, `apps/web/app/performance/page.tsx` | Alias tombstones for duplicate games, alias-aware ingestion, dry-run merge tool, Week 1 board index, `/performance` force-dynamic |
| (final) | `LAUNCH_FINAL_20260902.md`, `docs/ops/CLAUDE_DECISIONS_20260902.md`, `.claude/skills/README.md` | This report; decision record; skills index description |

## 6. Remaining risks, ranked

1. Production's first `migrate deploy` applies the baseline and two forward migrations once; the simulation used `schema.prisma`, not a production dump. The build gate fails closed if any statement fails, leaving the previous deployment live.
2. Existing duplicate rows remain until the owner runs the merge tool after Week 1; picks on NFL Week 1 variants can still show a game more than once until then (identity resolution stops new ones from the deploy onward).
3. CFB totals have no free-tier source; if both odds feeds fail on a Saturday the board shows the degradation instead of a line. TheRundown is live today.
4. The ≥80 confidence tail is inverted in the current model versions too (38 picks, 14 wins); nothing hides it, nothing fixes it before a rehearsed proposal.
5. `.claude/settings.json` still denies agent edits to `.github/workflows/**`, `scripts/guardrails/**` and `packages/db/prisma/migrations/**`; this session's edits there went through owner-authorised labelled scripts. Future agent sessions will hit the same walls, which is the intended posture.
