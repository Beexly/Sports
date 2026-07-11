# 22 — Resume Packet (refreshed 2026-07-11 ~14:05 UTC)

Any session resumes from here without re-deriving context.

## Live PR train (ALL merges owner-gated; all green, all Codex threads resolved)

| PR | Branch | Base | What |
|---|---|---|---|
| #76 | claude/nfl-pbp-expected-metrics-xb069r | main | Frontier A+B: truth reconciliation + R&D Radar (6 Codex findings fixed) |
| #77 | claude/frontier-agent-foundry-2026-07-11 | #76 branch | Frontier C+D: Agent Foundry + AI Setup Assurance (3 Codex findings fixed; repo-root runtime honesty) |
| #78 | claude/frontier-model-router-shadow-2026-07-11 | #77 branch | Frontier E: Model Portfolio Router, shadow-only |
| #79 | claude/hotfix-clv-settlement-billing-integrity | main | CLV prob-space averaging (M-F1), audit paywall leak (T-2), Stripe resurrection (M-F3), settlement fail-loud (M-F8) + this docs pack |
| #80 | claude/hotfix-slate-freeze-frontrun | main | M-F2 slate-freeze front-run (mint-hour-keyed deferral, matrix pinned) |
| #81 | claude/guardrail-hardening | main | O-5.1 CI topology, O-2.1 full-surface copy sweep, O-4.x secret-scan holes, O-1.x skip-gate + O-3.x-core Unicode evasion + T-INFRA-1 sandbox plant tests |
| #82 | claude/hotfix-prod-db-fail-closed | main | O-1.7 stub-Prisma fail-closed (Vercel prod + PRODUCTION_RUNTIME worker images) + non-vacuous health; db suite wired into CI |
| #83 | claude/stress-property-suite | #79 branch | 18-family seeded property/stress suite + M-F13 mandatory-awayTeam side derivation |
| #84 | claude/hotfix-clv-regrade-orphans | main | M-F4 orphaned-CLV heal (two-population settle pass, grade-once) |

Merge order suggestion: #79 → retarget #83 to main; #76 → #77 → #78 (stack order); #80/#81/#82/#84 independent anytime.

## Owner blockers (surface once, never nag)

- B1: production migration-ledger reconciliation (runbook: docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md) — ALL prod deploys fail-closed until then; task #4 re-landing parked on it.
- GitHub connector re-auth happened 13:4xZ (was down ~2h; REST fallback used). If it drops again: claude.ai connector settings.
- Branch protection required-checks config (O-5.1 residue), ACTIVE_TRUNK env currency (O-1.x residue).
- First governed memory write (promotes Jarvis memory past DESIGNED), Stripe LIVE price IDs, repo-private decision.

## Ranked next queue

1. T-daily-slate: recentRecord hardcoded {0,0,0} → board renders fabricated "0W/0L" (withhold, never fabricate). **DONE — PR #85.**
2. M-F9: VOID path for cancelled/PPD games + catch-up settle window.
3. T-picks-outage: /api/picks DB outage dressed as bootstrap gating (states doctrine).
4. M-F5/F6 (Stripe event ordering; refresh/settle TOCTOU), M-F7 (close staleness bound; take:80 truncation).
5. M-F10 fantasy-upsell hardcoded price; frontier-module G-findings on their PR branches (G-1 auth defense-in-depth first).
6. O-3.x remainder: concatenation joins, cross-line bans, confusables map.
7. After merges: task #4 CLV decomposition columns, task #6 backtest scheduling (designed), SEO strike page 2, memory-write form, grandpa-simple UX pass.
8. Task #13 Fantasy Engine intake + honest calibrated accuracy leaderboard / accuracy-weighted consensus (proper scoring rule — Brier/log-loss, absolute+relative, no dropped week, coverage-adjusted). Full design inputs live in the owner-delivered confidential intel bank (2026-07-11, session files — intentionally NOT in this public repo). Fantasy suite = glass-box product line by design; betting engine stays method-opaque.

## Standing patterns (hard-won today)

- Evidence before claims; unpiped exit codes (`| tail` masks; root `npx vitest run` is NOT the supported invocation — `npm test` is).
- Plant tests: sandbox-cwd in OS temp dir, NEVER the real tree (T-INFRA-1).
- Optional safety parameters are fail-open — make the compiler enforce (M-F13).
- Property/stress suites with seeded PRNG find what example tests cannot; run them on every money-path change.
- Docs-only commits are skip-gated on Vercel (Ignored) — expected, not a failure.
- Every external reviewer finding to date has been real: verify against code, fix at root, pin, resolve.
