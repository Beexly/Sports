# Hermes Continuous Run — Ledger
branch: claude/fable-5-ultracode-plan-ptru4e   start commit: a6432233   started: 01:05 UTC

baseline: typecheck=0  lint=0  guards=24/26 (api-v1-boundary expected FAIL; ai-transport-import-boundary FAIL new; ai-council + dependency-audit PASS in CI, FAIL locally via spawn npm ENOENT env quirk)

| id | task | status | at | evidence / commit |
|---|---|---|---|---|
| P0-1 | ops truth capture | DONE | 01:05 | handoff/OPS_TRUTH.md — founderNextSteps captured verbatim, 5 checks failed, RESULT: FAIL |
| P0-2 | understand founderNextSteps authority | DONE | 01:05 | Documented in OPS_TRUTH.md — all 5 items are OPERATOR ACTION, outside agent authority |
| P1-1 | board-stale-kill-switch | DONE | 20:15 | board-no-bet-detail.test.ts:34-36 precedent; 7 tests green; typecheck=0 lint=0 | dc73122a |
| P1-2 | daily-slate-stale-kill-switch | DONE | 20:20 | board-no-bet-detail.test.ts:34-36 precedent; 5 tests green; typecheck=0 lint=0 | 9950d1f6 |
| P1-3 | picks-stale-kill-switch | DONE | 20:27 | board-no-bet-detail.test.ts:34-36 precedent; 5 tests green; typecheck=0 lint=0 | 24977207 |
| P1-4 | canonical-sample-posture | DONE | 00:31 | Fixed stale /founder YES/ assertion; PR #375 (commit 8670e51b) deliberately replaced with "eligibility GREEN + publish policy" wording. Test green at 20:01 |
| P1-5 | espn-odds-client | DONE | 20:33 | Fixed time-window filter drift; 3 tests green; typecheck=0 lint=0 | 1a555bff |
| P1-6 | cockpit-picks-glance | DONE | 20:36 | PR 881c305d deliberately changed orderBy isFeatured→generatedAt; 6 tests green; typecheck=0 lint=0 | 8f21d719 |
| P1-7 | cockpit-jarvis-trend-api | DONE | 20:39 | Fixed stale /Cache-Control[^"]*no-store/ regex (never matched quoted source); 7 tests green; typecheck=0 lint=0 | 3ae28452 |
| P1-8 | glass-ledger-page | DONE | 20:41 | PR 84c1f838 deliberately changed "being built"→"sealed" headline; 11 tests green; typecheck=0 lint=0 | bd9bd9b1 |
| P1-9 | calibration-cockpit | DONE | 20:43 | Already green — 29 tests pass (no fix needed); typecheck=0 lint=0 | n/a |
| P1-10 | honest-degraded-states | DONE | 20:46 | 4ae1e900 deliberately renamed "Board paused"→"Quiet board", "restraint not an outage"; 12 tests green; typecheck=0 lint=0 | d118c750 |
| P1-11 | cqr | DONE | 20:49 | Calibration data had wider intervals than actuals → negative qhat; shifted bounds so nonconformity scores are positive; 3 tests green; typecheck=0 lint=0 | 6fb56cd4 |
| P1-12 | picks-daily-limit-meta | DONE | 20:53 | PR 881c305d changed take limit 6→24; 11 tests green; typecheck=0 lint=0 | 60063d48 |
| P1-13 | public-copy-integrity | DONE | 21:20 | Negation-context lookbehind on FORBIDDEN (d1cf792c honesty copy); 3 tests (incl 2 proof assertions); tsc=0 lint=0 | 9c8f700b |
| P1-14 | nflverse-readiness | DONE | 21:24 | resolveFootballStatsSeason returns completedFloor (2025) without REG probe, not labelledCurrent (2026); 11 tests green; typecheck=0 lint=0 | 073a7dfa |
| P1-15 | isotonic-pava | DONE | 18:27 | Unblocked by H-A: ba61b061 already fixed pooling; 11/11 tests green including [0.4,0.4,0.4,0.8] |
| P1-16 | player-stats-backfill-plan | DONE | 21:47 | Class B drift: test asserted pre-P1-14 'September→backfill 2026' rollover; P1-14 (073a7dfa) made resolveFootballStatsSeason return completed REG floor (2025) w/o probe, so planner anchors on 2025 in September. Repaired TEST to pin deliberate contract; 4/4 green; product code untouched | b2820b8f+1 |
| P1b-1 | ADR proposing persisted settlement-hold state | DONE | 21:49 | committed 64fc57d1 (per RESUME STEP 1: CLAIMED was a stale cut-off mark; commit is evidence) |
| P1b-2 | Correct preflight PUBLIC_PICKS assertion | DONE | 21:53 | committed e05ad459 (stale CLAIMED recovered) |
| P1b-3 | Cockpit needs-adjudication view | DONE | 22:02 | committed ef24ac04 + 4a45f452 (removed unused JSX import so lint=0 DoD holds) |
| P1c-1 | ADR 007 — user compliance state | DONE | 22:05 | committed 1896dc63 (stale CLAIMED recovered) |
| P1c-2 | Integration-point map | DONE | 22:10 | read-only report → handoff/COMPLIANCE_HOOKS.md (no code; greps auth()/signIn/checkout/middleware) |
| P1c-3 | Disclosure-consistency audit | DONE | 22:15 | read-only -> handoff/COMPLIANCE_COPY.md (ran check-claims scoped; core pages consistent; F1 fantasy/props lacks adjacent gambling-risk note) |
| P1d-1 | Rate-limit coverage sweep (batch 1) | DONE | 22:33 | 5 GSE v1 unauth POST routes + 15-test suite; 2318d86f; typecheck=0 lint=0 |
| P1d-1b | Rate-limit coverage sweep (batch 2) | DONE | 22:46 | 2 IP-keyed + 3 user-keyed routes + 16-test suite; d3e012ac; typecheck=0 lint=0 |
| P1d-1c | Rate-limit coverage sweep (batch 3) | DONE | 23:58 | committed as 27e9c912 (was wip) — 5 routes gain consumeRateLimit 429+Retry-After, tsc=0 lint=0; bot-outbox-preview + cockpit-journal + push-subscribe tests green (133ms) |
| P1d-2 | B2B limiter durability | CLAIMED | 00:01 | recovering per CONTINUOUS.md §P1d-2 |
| P1d-3 | Runtime error capture (ADR 008 + interim) | TODO | — | — |
| P2-1 | ROUTE_AUTH_INVENTORY.md | TODO | — | — |
| P2-2 | DOC_DRIFT.md | TODO | — | — |
| P2-3 | TEST_GAP_MAP.md | TODO | — | — |
| P2-4 | INVENTORY.md (.agents + .claude/commands) | TODO | — | — |
| P3-1 | ADR change-proposal template | TODO | — | — |
| P3-2 | pin promptfoo to 0.122.0 | TODO | — | — |
| P3-3 | normalizeEntityName + tests | TODO | — | — |
| P3-4 | entity-graph repository + tests | TODO | — | — |
| P3-5 | wire response cache into free lane | TODO | — | — |
| P4-1 | check-claims.md | TODO | — | — |
| P4-2 | states.md | TODO | — | — |
| P4-3 | contrast.md | TODO | — | — |
| P4-4 | responsive.md | TODO | — | — |
| P4-5 | ui-audit.md | TODO | — | — |
| P4-6 | audit-stripe.md | TODO | — | — |
| P4-7 | audit-auth.md | TODO | — | — |
| P4-8 | safety-check.md | TODO | — | — |
| P4-9 | audit-picks.md | TODO | — | — |
| P4-10 | visual-qa.md | TODO | — | — |
| P4-11 | perf.md | TODO | — | — |
| P4-12 | audit-odds.md | TODO | — | — |
| H-1 | CLV + pick-universe data census (read-only) | BLOCKED | 2026-08-18 22:45 | Database unreachable: Can't reach database server at `localhost:5433` (DATABASE_URL/DIRECT_URL not set). Maps to v4 H-E. |
| H-2 | modelProb provenance (v3) | SUPERSEDED | 18:27 | Dropped by handoff v4 |
| H-3 | fix isotonic PAV (v3) | SUPERSEDED | 18:27 | Became v4 H-A |
| H-4 | Bernoulli e-process (v3) | SUPERSEDED | 18:27 | Became v4 H-C |
| H-5 | wire markClosingSnapshots (v3) | SUPERSEDED | 18:27 | Became v4 H-D |
| H-A | fix isotonic PAV + lock tests | DONE | 18:27 | Algorithm already fixed in ba61b061; added equal/weighted/200-random/weighted-mass tests; 11/11 green; tsc=0 lint=0 |
| H-B | cron-matrix-from-vercel.mjs generator | DONE | 18:30 | 20 crons from apps/web/vercel.json; DRIFT none vs root copy; 3/3 node:test; --check exit 0 |
| H-C | Bernoulli e-process toolkit (unwired) | DONE | 18:33 | eStep + mixtureEProcess; 5/5 tests; H0 Ville holds; median picks to supM>=100 at 55% vs 50% = 752 (lambda=0.2, 398/400 hits) |
| H-D | wire markClosingSnapshots behind flag | DONE | 18:37 | markClosingSnapshotsIfEnabled no-op unless LINE_ARCHIVE_ENABLED=true; settle-sport swallows archive errors; 54/54 settle+archive tests; tsc=0 lint=0 |
| H-E | CLV + pick-universe census (read-only) | BLOCKED | 2026-08-18 22:45 | Same as H-1: Can't reach database server at `localhost:5433` |
| H-F | DOC_DRIFT.md | TODO | — | — |
