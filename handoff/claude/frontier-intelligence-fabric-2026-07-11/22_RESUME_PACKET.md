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
| #85 | claude/hotfix-fabricated-record | main | T-daily-slate real-or-withheld 7-day record (computed via groupBy, null on gate-closed/empty/failure) |
| #86 | claude/hotfix-void-stale-picks | main | M-F9 catch-up heal + 72h VOID sweep + daysFrom 3; settleCompletedGame() extraction (one settlement semantics); Codex round: feed-independent sweep, heal provenance, VOID-is-no-action everywhere |
| #87 | claude/hotfix-picks-outage-state | main | T-picks-outage distinct backend_outage 503 (API + /picks page designed state + prod-probe three-state classifier + runbook) |
| #88 | claude/hotfix-fantasy-upsell-price | main | M-F10 phase-derived fantasy upsell price (server-resolved, required prop, compiler-enforced) |
| #89 | claude/hotfix-outage-sweep | #87 branch | T-outage-sweep: 5 surfaces stop dressing DB outages as healthy states (calibration/daily-slate/promotions/game-room/proof) |
| #90 | claude/fantasy-engine-foundation | main | OWNER MANDATE: @sports/fantasy-engine glass-box foundation — SMASH+Log5 golden-verified 800/800; BURR 30/30 + RVS 311-reliever golden-verified; proper-scoring accuracy engine (all six incumbent-grader seams closed by construction). Codex round (a5133443, 5/5 real, resolved): -Inf skill preserved w/ NaN-safe comparator, NaN inputs → UNRATED tier (never AVOID), epsilon + eventsAvailable validation, zero-league edge → NEUTRAL |

Merge order suggestion: #79 → retarget #83 to main; #76 → #77 → #78 (stack order); #80/#81/#82/#84/#85/#86/#87/#88/#90 independent anytime; #89 stacked on #87. (#84 and #86 both touch settle-sport.ts — whichever lands second takes a small rebase; #86 + #83: thread awayTeamName, one line.)

## Owner blockers (surface once, never nag)

- B1: production migration-ledger reconciliation (runbook: docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md) — ALL prod deploys fail-closed until then; task #4 re-landing parked on it.
- GitHub connector re-auth happened 13:4xZ (was down ~2h; REST fallback used). If it drops again: claude.ai connector settings.
- Branch protection required-checks config (O-5.1 residue), ACTIVE_TRUNK env currency (O-1.x residue).
- First governed memory write (promotes Jarvis memory past DESIGNED), Stripe LIVE price IDs, repo-private decision.

## Ranked next queue

1. T-daily-slate: recentRecord hardcoded {0,0,0} → board renders fabricated "0W/0L" (withhold, never fabricate). **DONE — PR #85.**
2. M-F9: VOID path for cancelled/PPD games + catch-up settle window. **DONE — PR #86.** (Merge-order: if #83 lands first, thread game.awayTeamName into settleCompletedGame's calculatePickResult call — one line, value in scope.)
3. T-picks-outage: /api/picks DB outage dressed as bootstrap gating (states doctrine). **DONE — PR #87** (API + /picks page + prod-probe + runbook; verify-workflow round included).
4. T-outage-sweep: **DONE — PR #89** (stacked on #87; merge #87 first). 5 surfaces fixed, 13 pins.
5. M-F5/F6 (Stripe event ordering; refresh/settle TOCTOU), M-F7 (close staleness bound; take:80 truncation).
5. M-F10 fantasy-upsell hardcoded price **DONE — PR #88**; frontier-module G-findings on their PR branches (G-1 auth defense-in-depth first).
6. O-3.x remainder: concatenation joins, cross-line bans, confusables map.
7. After merges: task #4 CLV decomposition columns, task #6 backtest scheduling (designed), SEO strike page 2, memory-write form, grandpa-simple UX pass.
8. OWNER MANDATE (2026-07-11 ~16:15Z, verbatim intent): everything FantasyPros + FantasyGuru have as FLOOR/BASELINE, then tremendous transformation — autonomous, no stopping. ENGINE FLOOR COMPLETE (PR #90, 66 tests, everything golden-verified vs the reference engine): MLB (SMASH H/P 800/800, Log5+platoon, BURR 30/30, RVS 311) + NFL (QB-Types w/ receipts +5.0 FP/G live, Trench 32/32, WR SMASH, scheme labels 32/32 VERBATIM, defense 3 idx 32/32, rolling deltas 32/32) + honest accuracy engine (6 seams closed). NEXT: data adapters in @sports/data-ingestion behind NEW source-rights registry entries (statsapi.mlb.com, Baseball Savant, nflverse — none registered yet; clearance-engine passage REQUIRED before any automated pull), then founder-gated UI surfaces, then catalog-parity matrix (draft sim, closer grid, SoS, dispersion displays) (QB-Types w/ receipts, Trench, WR SMASH, scheme-PROE, defense, rolling windows) — Python specs + golden CSVs in the confidential intel bank; data adapters in @sports/data-ingestion + source-rights registry entries (statsapi.mlb.com, Baseball Savant, nflverse); founder-gated UI surfaces; then the full incumbent catalog parity matrix (Draft Wizard-class sim, closer grid, SoS, dispersion displays). Original task #13 note follows.
9. Task #13 Fantasy Engine intake + honest calibrated accuracy leaderboard / accuracy-weighted consensus (proper scoring rule — Brier/log-loss, absolute+relative, no dropped week, coverage-adjusted). Full design inputs live in the owner-delivered confidential intel bank (2026-07-11, session files — intentionally NOT in this public repo). Fantasy suite = glass-box product line by design; betting engine stays method-opaque.

## Standing patterns (hard-won today)

- Evidence before claims; unpiped exit codes (`| tail` masks; root `npx vitest run` is NOT the supported invocation — `npm test` is).
- Plant tests: sandbox-cwd in OS temp dir, NEVER the real tree (T-INFRA-1).
- Optional safety parameters are fail-open — make the compiler enforce (M-F13).
- Property/stress suites with seeded PRNG find what example tests cannot; run them on every money-path change.
- Docs-only commits are skip-gated on Vercel (Ignored) — expected, not a failure.
- Every external reviewer finding to date has been real: verify against code, fix at root, pin, resolve.
