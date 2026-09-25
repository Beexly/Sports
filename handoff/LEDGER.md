# Hermes Continuous Run — Ledger
branch: main (was claude/fable-5-ultracode-plan-ptru4e, 1094+288 commits behind)   2026-09-23 20:10 consolidation: cherry-picked P3-1 template as ed2886392, merged origin/main as 7bd539429; active ledger + local DOC_DRIFT preserved

baseline: typecheck=0  lint=0  guards=22/25 (api-v1-boundary expected FAIL; ai-council + dependency-audit FAIL via spawn npm ENOENT env quirk)

||| id | task | status | at | evidence / commit |
|||---|---|---|---|---|
||| P0-1 | ops truth capture | DONE | 01:05 | handoff/OPS_TRUTH.md — founderNextSteps captured verbatim, 5 checks failed, RESULT: FAIL |
||| P0-2 | understand founderNextSteps authority | DONE | 01:05 | Documented in OPS_TRUTH.md — all 5 items are OPERATOR ACTION, outside agent authority |
||| P1-1 | board-stale-kill-switch | DONE | 20:15 | board-no-bet-detail.test.ts:34-36 precedent; 7 tests green; typecheck=0 lint=0 | dc73122a
||| P1-2 | daily-slate-stale-kill-switch | DONE | 20:20 | board-no-bet-detail.test.ts:34-36 precedent; 5 tests green; typecheck=0 lint=0 | 9950d1f6
||| P1-3 | picks-stale-kill-switch | DONE | 20:27 | board-no-bet-detail.test.ts:34-36 precedent; 5 tests green; typecheck=0 lint=0 | 24977207
||| P1-4 | canonical-sample-posture | DONE | 00:31 | Fixed stale /founder YES/ assertion; PR #375 (commit 8670e51b) deliberately replaced with "eligibility GREEN + publish policy" wording. Test green at 20:01 |
||| P1-5 | espn-odds-client | DONE | 20:33 | Fixed time-window filter drift; 3 tests green; typecheck=0 lint=0 | 1a555bff
||| P1-6 | cockpit-picks-glance | DONE | 20:36 | PR 881c305d deliberately changed orderBy isFeatured→generatedAt; 6 tests green; typecheck=0 lint=0 | 8f21d719
||| P1-7 | cockpit-jarvis-trend-api | DONE | 20:39 | Fixed stale /Cache-Control[^\"]*no-store/ regex (never matched quoted source); 7 tests green; typecheck=0 lint=0 | 3ae28452
||| P1-8 | glass-ledger-page | DONE | 20:41 | PR 84c1f838 deliberately changed "being built"→"sealed" headline; 11 tests green; typecheck=0 lint=0 | bd9bd9b1
||| P1-9 | calibration-cockpit | DONE | 20:43 | Already green — 29 tests pass (no fix needed); typecheck=0 lint=0 | n/a
||| P1-10 | honest-degraded-states | DONE | 20:46 | 4ae1e900 deliberately renamed "Board paused"→"Quiet board", "restraint not an outage"; 12 tests green; typecheck=0 lint=0 | d118c750
||| P1-11 | cqr | DONE | 20:49 | Calibration data had wider intervals than actuals → negative qhat; shifted bounds so nonconformity scores are positive; 3 tests green; typecheck=0 lint=0 | 6fb56cd4
||| P1-12 | picks-daily-limit-meta | DONE | 20:53 | PR 881c305d changed take limit 6→24; 11 tests green; typecheck=0 lint=0 | 60063d48
||| P1-13 | public-copy-integrity | DONE | 21:20 | Negation-context lookbehind on FORBIDDEN (d1cf792c honesty copy); 3 tests (incl 2 proof assertions); tsc=0 lint=0 | 9c8f700b
||| P1-14 | nflverse-readiness | DONE | 21:24 | resolveFootballStatsSeason returns completedFloor (2025) without REG probe, not labelledCurrent (2026); 11 tests green; typecheck=0 lint=0 | 073a7dfa
||| P1-15 | isotonic-pava | BLOCKED | 21:42 | REAL DEFECT (per RESUME known-blocked): `pava([0.9,0.1,0.2,0.8],[1,1,1,1])` returns non-monotonic out[?]=0.2 < 0.5. Test `returns nondecreasing block means` (isotonic-pava.test.ts:6-9) is correct (PAVA contract); algorithm produces non-monotonic block means. Forbidden to patch algorithm or test. Owner/algorithm decision. |
||| P1-16 | player-stats-backfill-plan | DONE | 21:47 | Class B drift: test asserted pre-P1-14 'September→backfill 2026' rollover; P1-14 (073a7dfa) made resolveFootballStatsSeason return completed REG floor (2025) w/o probe, so planner anchors on 2025 in September. Repaired TEST to pin deliberate contract; 4/4 green; product code untouched | b2820b8f+1
|||| P1b-1 | ADR proposing persisted settlement-hold state | DONE | 21:49 | committed 64fc57d1 (per RESUME STEP 1: CLAIMED was a stale cut-off mark; commit is evidence) |
|||| P1b-2 | Correct preflight PUBLIC_PICKS assertion | DONE | 21:53 | committed e05ad459 (stale CLAIMED recovered) |
|||| P1b-3 | Cockpit needs-adjudication view | DONE | 22:02 | committed ef24ac04 + 4a45f452 (removed unused JSX import so lint=0 DoD holds) |
|||| P1c-1 | ADR 007 — user compliance state | DONE | 22:05 | committed 1896dc63 (stale CLAIMED recovered) |
|||| P1c-2 | Integration-point map | DONE | 22:10 | read-only report → handoff/COMPLIANCE_HOOKS.md (no code; greps auth()/signIn/checkout/middleware) |
|||| P1c-3 | Disclosure-consistency audit | DONE | 22:15 | read-only -> handoff/COMPLIANCE_COPY.md (ran check-claims scoped; core pages consistent; F1 fantasy/props lacks adjacent gambling-risk note) |
|||| P1d-1 | Rate-limit coverage sweep (batch 1) | DONE | 22:33 | 5 GSE v1 unauth POST routes + 15-test suite; 2318d86f; typecheck=0 lint=0 |
|||| P1d-1b | Rate-limit coverage sweep (batch 2) | DONE | 22:46 | 2 IP-keyed + 3 user-keyed routes + 16-test suite; d3e012ac; typecheck=0 lint=0 |
|||| P1d-1c | Rate-limit coverage sweep (batch 3) | DONE | 23:58 | committed as 27e9c912 (was wip) — 5 routes gain consumeRateLimit 429+Retry-After, tsc=0 lint=0; bot-outbox-preview + cockpit-journal + push-subscribe tests green (133ms) |
||| P1d-2 | B2B limiter durability | DONE | 20:35 | GSE-SEC-015 upstream: 189f5f9e6 durable Postgres limiter + fail-closed 503, ba3eeaecd key fingerprinting, 97305c9f2 tier scope; verified on synced main: tsc 0 TS errors, lint exit 0, vitest __tests__/b2b-rate-limit.test.ts 6/6 green |
||| P1d-3 | Runtime error capture (ADR 008 + interim) | DONE | 21:46 | 5/5 vitest green; lint/tsc green | fea4ceaef
||| P2-1 | ROUTE_AUTH_INVENTORY.md | DONE | 20:28 | handoff/ROUTE_AUTH_INVENTORY.md — 177 tracked route.ts rows; 0 missing/extra/duplicate/bad rows; counts verified; read-only report, no commit |
|| P2-2 | DOC_DRIFT.md | DONE | 21:48 | 901 docs scanned; 4251 refs; 300 missing | - |
||| P2-3 | TEST_GAP_MAP.md | DONE | 21:50 | 48 source files scanned; 138 mentions (index.ts); 2 zero-test files; top gap extraction-modes.ts 166 lines | -
|||| P2-4 | INVENTORY.md (.agents + .claude/commands) | BLOCKED | 2026-09-23 11:20 | handoff/INVENTORY.md created with verified counts (8 skills, 34 commands, 1,089,781 bytes, 21 zero-reference items); `test -f handoff/INVENTORY.md` OK, but `git status --short` is non-empty due pre-existing handoff/ changes: M handoff/LEDGER.md and untracked DOC_DRIFT.md, JOURNAL.md, ROUTE_AUTH_INVENTORY.md, TEST_GAP_MAP.md, INVENTORY.md | - |
|| P3-1 | ADR change-proposal template | DONE | 15:25 | Created docs/adr/pre-implementation-change-proposal-template.md; 7 sections; both guardrail scans exit 0; eeb91c177 |
|||| P3-2 | pin promptfoo to 0.122.0 | DONE | 2026-09-24 22:56 | package.json eval script pinned; typecheck=0, lint=0, promptfoo tests 13/13, perf/commercial/secret guards all exit 0 | a4710d865 |
|||| P3-3 | normalizeEntityName + tests | DONE | 2026-09-24 23:01 | NFKD accent folding, punctuation/whitespace normalization, guarded generational-suffix removal; 13/13 tests, typecheck=0, lint=0, no any | 82dd324ba |
|| P3-4 | entity-graph repository + tests | DONE | 2026-09-25 03:33 | H8 typed entity/edge access layer; injected structural DB, provenance guards, normalized upserts, capped one-hop neighbors; 23/23 entity-graph tests, typecheck=0, lint=0, guardrails=26/26, no any | e25729265 |
||| P3-5 | wire response cache into free lane | DONE | 2026-09-25 08:22 | generateContentMessages wraps the whole dispatch (free lane, secondary, paid callClaude) in a cache-through of the existing response-cache module; opt-in is env LLM_RESPONSE_CACHE_ENABLED=true AND a caller-supplied cacheStore AND a surface, so an absent store is byte-identical to the un-cached path; model comes from pickModelForSurface so the key matches what the router would send; store read/write failure falls through to the live call. New __tests__/free-lane-response-cache.test.ts 6/6 plus response-cache.test.ts 18/18 = 24/24; typecheck=0, eslint=0 --max-warnings=0. RED-CHECK: reverting free-lane.ts fails exactly the one positive test (cache serves the second call); the 5 negative controls pass either way BY CONSTRUCTION (no wiring means everything is uncached), so the load-bearing evidence is the 18-test module suite, which independently covers the surface allowlist, temperature gate, key stability and store-failure fallback | 3359e7f51 |
|| P4-1 | check-claims.md | DONE | 2026-09-25 08:32 | Executed both command-file guards: guard:performance-claims exit 0 (476 files), guard:commercial-copy exit 0 (470 files) — zero instances to list. Report + honest gaps in handoff/CLAIMS_AUDIT.md. Recorded what the guard is NOT: its lexicon is 14 strings, so a non-superlative claim ("our reads beat the books") is structurally invisible; neither guard reads the database, so "backed by graded-pick data" is NOT DETERMINED here; scan roots exclude packages/ and docs/. Supplementary superlative probe over components + app/ (excluding api/) returned 2 hits, 0 findings — both are the restraint line "the sharpest pick is no pick" in world/no-bet-gate.tsx, which is the opposite of a tout and passed on merits | - |
|| P4-2 | states.md | DONE | 2026-09-25 08:47 | Read-only states audit, report-only (command says "Report first" — no fixes made). Report: handoff/STATES_AUDIT.md, 232 lines, RESULT FINDINGS. 41 card/family units: HANDLED 16 / PARTIAL 14 / BARE 11. Worst offenders, all verified by me against the real files: dashboard/page.tsx:205 renders bare "—" for win rate; founder-picks/page.tsx:54 `record.winRatePct === null ? "—"`; performance/page.tsx:508 STAT_PLACEHOLDER; fable/proof-dashboard.tsx:105-117 REL/RES/UNC; board/page.tsx:313 edgeIndex; result-card.tsx:85 "n/a". Root cause is one shared constant — lib/format/stat.ts:16 `STAT_PLACEHOLDER = "—"`. The app already has gold-standard components to copy (WithheldStat, ClvGatedState, pick-card LockedValue/MissingValue, GuardRefusal, PerformanceBootstrapState, SourceError) so this is a consistency problem, not a missing-capability one. NOT DETERMINED, stated in the report: live paint/DB null-ness, full component inventory (breadth sample), board entitlement-null vs missing-null, every KpiCard call site beyond engine-view | - |
|| P4-3 | contrast.md | TODO | — | — |
|| P4-4 | responsive.md | TODO | — | — |
|| P4-5 | ui-audit.md | TODO | — | — |
|| P4-6 | audit-stripe.md | TODO | — | — |
|| P4-7 | audit-auth.md | TODO | — | — |
|| P4-8 | safety-check.md | TODO | — | — |
|| P4-9 | audit-picks.md | TODO | — | — |
|| P4-10 | visual-qa.md | TODO | — | — |
|| P4-11 | perf.md | TODO | — | — |
|| P4-12 | audit-odds.md | TODO | — | — |
