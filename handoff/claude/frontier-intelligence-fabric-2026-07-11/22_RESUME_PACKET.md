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
| #90 | claude/fantasy-engine-foundation | main | OWNER MANDATE: @sports/fantasy-engine glass-box foundation — SMASH+Log5 golden-verified 800/800; BURR 30/30 + RVS 311-reliever golden-verified; proper-scoring accuracy engine (all six incumbent-grader seams closed by construction). Codex round (a5133443, 5/5 real, resolved): -Inf skill preserved w/ NaN-safe comparator, NaN inputs → UNRATED tier (never AVOID), epsilon + eventsAvailable validation, zero-league edge → NEUTRAL + MLB DATA PLANE (486058aa): registry entries mlb-statsapi + baseball-savant (approved_public_logged_off, derived-analytics ONLY — MLBAM notice = non-commercial/non-bulk raw, so storage+display REFUSED, compute-and-discard; C.B.C. v. MLBAM cite in entry), fantasy-mlb-gate mints SourceClearanceProof, adapters (Savant custom-leaderboard CSV → SMASH populations + PA-weighted team Statcast; statsapi paginated pitcher seasons → RVS pool + BURR team categories, thirds-notation IP, stint consolidation no-double-count), 28 new tests, prediction-engine registry mirror synced |
| #91 | claude/hotfix-stripe-event-ordering | main | M-F5: subscription created/updated re-retrieve current Stripe state (stale events can't regress tier); Codex round (2/2 real, fixed 3a0cdd31, resolved): superseded-sub guard (sub_OLD noise can't revoke sub_NEW), CANCELED sync converges on delete handler's terminal state (tier FREE, canceledAt preserved) |
| #92 | claude/hotfix-settle-refresh-races | main | M-F6: refresh rewrite atomic (updateMany where result:PENDING; P2002 winner adoption) — settle race can't corrupt a graded pick. M-F7: MAX_CLOSE_AGE_MS 6h close bound (never invent a close) + take 80→240 batch cap. Codex round (2/2 real, fixed 856b3177, resolved): wrotePickPayload gates the immutable sidecar mints — frozen/side-flip/race-loss/P2002-adoption paths mint NO snapshot/receipt (non-writer payload can never become provenance; closes the pre-existing frozen+flip holes too). NOTE: touches settle-sport.ts like #84/#86 — last to land takes small rebase |
| #93 | claude/hotfix-cockpit-page-auth | main | G-1: requireCockpitAdmin() in all 32 cockpit pages + tree-walk scan enforcement + helper unit pins; layout-only auth no longer load-bearing. #90 fantasy page adopted the helper proactively; #77 pages take it on rebase |

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
8. OWNER MANDATE (2026-07-11 ~16:15Z, verbatim intent): everything FantasyPros + FantasyGuru have as FLOOR/BASELINE, then tremendous transformation — autonomous, no stopping. ENGINE FLOOR COMPLETE (PR #90, 66 tests, everything golden-verified vs the reference engine): MLB (SMASH H/P 800/800, Log5+platoon, BURR 30/30, RVS 311) + NFL (QB-Types w/ receipts +5.0 FP/G live, Trench 32/32, WR SMASH, scheme labels 32/32 VERBATIM, defense 3 idx 32/32, rolling deltas 32/32) + honest accuracy engine (6 seams closed). MLB DATA PLANE SHIPPED 486058aa (registry entries mlb-statsapi/baseball-savant + clearance gate + adapters; nflverse was already registered). NFL MAPPERS SHIPPED 512d5a84 (nflverse-fantasy-source.ts: all 7 NFL engine inputs, fail-closed header assertions replace live schema checks the sandbox proxy blocks — drift throws, never misparses; CI-fix 614c66f5 was TS2493 vi.fn tuple indexing, lesson: never judge npm --workspaces runs by tail, grep the error trailer). DATA PLANE COMPLETE (MLB + NFL). FIRST FOUNDER SURFACE SHIPPED c19e3309: /cockpit/fantasy-engine — LIVE MLB boards (SMASH H/P, BURR, RVS closer grid) computed on demand through gates→proofs→adapters→engine, raw discarded, attribution rendered, blocked/unavailable honesty states, 20h derived-only memo, ADMIN-gated, 6 e2e transport-injected pins. NEXT: (a) NFL boards surface (needs nflverse SEASON asset-name verification from an unproxied env — fail-closed parsers ready), (b) catalog-parity matrix (draft sim, SoS, dispersion displays), (c) honest accuracy leaderboard wiring, (d) customer-facing fantasy boards (FANTASY tier) once owner approves the surface (QB-Types w/ receipts, Trench, WR SMASH, scheme-PROE, defense, rolling windows) — Python specs + golden CSVs in the confidential intel bank; data adapters in @sports/data-ingestion + source-rights registry entries (statsapi.mlb.com, Baseball Savant, nflverse); founder-gated UI surfaces; then the full incumbent catalog parity matrix (Draft Wizard-class sim, closer grid, SoS, dispersion displays). Original task #13 note follows.
9. Task #13 Fantasy Engine intake + honest calibrated accuracy leaderboard / accuracy-weighted consensus (proper scoring rule — Brier/log-loss, absolute+relative, no dropped week, coverage-adjusted). Full design inputs live in the owner-delivered confidential intel bank (2026-07-11, session files — intentionally NOT in this public repo). Fantasy suite = glass-box product line by design; betting engine stays method-opaque.

## Standing patterns (hard-won today)

- Evidence before claims; unpiped exit codes (`| tail` masks; root `npx vitest run` is NOT the supported invocation — `npm test` is).
- Plant tests: sandbox-cwd in OS temp dir, NEVER the real tree (T-INFRA-1).
- Optional safety parameters are fail-open — make the compiler enforce (M-F13).
- Property/stress suites with seeded PRNG find what example tests cannot; run them on every money-path change.
- Docs-only commits are skip-gated on Vercel (Ignored) — expected, not a failure.
- Every external reviewer finding to date has been real: verify against code, fix at root, pin, resolve.
