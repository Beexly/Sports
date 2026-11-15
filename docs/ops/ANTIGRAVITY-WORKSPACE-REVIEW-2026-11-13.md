# Antigravity Workspace Review — 2026-11-13 (Week 10 launch eve)

Requested by Garrett: "review the antigravity workspaces — tons and tons of
info and plans in those." This is the consolidated review. Full digests:
- scratch/agy-review-A.md — OneDrive GSE workspace documents (31 read, ~940 inventoried)
- scratch/agy-review-B.md — 9 master-plan sessions, every top-level artifact read
- scratch/agy-review-C.md — 5 forensic/wiring sessions, ~40 cross-checks vs launch HEAD
- scratch/agy-longtail.json — November long-tail triage (inline; miner D hit provider quota)

## 1. Census & method

- 1,207 conversations indexed: CLI store 656 (C:/Users/Garrett/.gemini/antigravity-cli),
  IDE store 551 (C:/Users/Garrett/.gemini/antigravity). 454 from November 2026.
- Artifacts live in brain/<conversation-id>/ (top-level deliverables + scratch/);
  raw transcripts in .system_generated/ (huge single-line JSONL, not bulk-read).
- 9 registered workspaces; the GSE-named one is OneDrive/Documents/Galaxy Sports Edge.
- Method: 3 parallel mining subagents (A/B/C) + inline long-tail triage (D).
  Read-only; secret-pattern scan on workspace text files: 0 matches.
- Long tail: 432 sessions >= 30 steps in Nov/late-Oct; top 45 triaged. The Nov 8
  untitled cluster (470-701 steps each) is the red-team/wiring fleet's work sessions
  (covered via C's named sessions). Notable artifact-bearing sessions:
  ae345a79 Omni-Cognitive World Model v6.0 (REASONING-ENGINE-DELIVERY-2026-10-21.md),
  86670791 Causal Inference Engine Plan Review (EXHAUSTIVE_LIVE_ENGINE_PROOF_REPORT.md),
  2bdfb4e9 Superpowers Brainstorming (implementation_plan.md + walkthrough.md),
  5197728e Session Librarian Setup (TNF IG slides + dad-top10 confidence PNG),
  d000bbd4 Week 7 Sunday master execution report + board PNGs,
  d11e0360 causal_reasoning_engine_execution_plan.md,
  5bee4571 NFL Week 6 Forensic Review.

## 2. The OneDrive workspace is a June/July docs management folder — 4 months stale

It is NOT the shipping repo (that is C:/Users/Garrett/Sports). No Week 10,
settlement, or quarantine material exists there. Durable doctrines worth keeping:
- Four-tier guard on win-rate claims: no published win rate without >= 200
  CLV-backed settled bets (the /record + /calibration doctrine WP-5 is building).
- Founder gate: checkout disabled until >= 1 official play clears Stage 5.
- OFF-by-default for anything unvalidated; honest 503 over fake data.
- Weather edge: gse-weather-edge-INTEGRATION_SPEC.md (wind/precip totals effect)
  never wired — parked, not launch-blocking.
- Open obligations from July: AWS Activate credits application, OTS anchoring
  pilot, proof-surface deploy verification — all human/ops actions, parked.
- Contradictions flagged for live verification (A's list): proof surface deploy
  state, AWS credit status, stale pricing copy. None block tonight.

## 3. Master-plan status (B) — what should exist by now vs reality

SHIPPED/VERIFIED: Week 10 storefront roll (catalog asOf Nov 12), TNF prep cadence
+ injury overlay, record hygiene (phantom 47-16 purged), per-market calibration
heads, X-sweep productionization, marketing conversion engine, Hermes voice suite,
Week 9 packet + JAX@BAL 360 dossiers, ~7/12 sovereign-blueprint workers.

STILL OPEN (evidence-backed, ranked by launch relevance):
1. Week 10 FULL-BOARD sim output — does not exist yet. Tonight's WP-8 critical path.
2. Prop Sniper Gate ABSENT from active prop paths — the exact Week 8 failure
   (7-8, -1.64u on backup micro-lines). Thresholds from the plan:
   route_share >= 0.45 / snap >= 0.40, snap-leak veto, WR/TE line >= 18.5 /
   RB >= 24.5, prior scaling by share^1.35. MUST wire before any Week 10 prop.
3. DFS MILP fixes incomplete: proj_fpts floor still 3.0 (promised 8.5, DST 5.5),
   snap-share candidate gate absent, ownership penalty/chalk-veto/stack rules
   missing from the portfolio runner, Showdown floor 48000 vs promised 48500.
4. Ticket-exposure caps: max 1 Anchor + 1 SGP per leg, ban ML+(-1.5) double-staking
   on |spread| <= 2.5, no sub-20.5-yd props in parlays.
5. Stream 15C/15D/15E (mind-feed integrity) explicitly NOT DONE — park formally,
   do not claim closure; run consumer validator on feeds in use.
6. 20-hour-shift empirical proofs MISSING despite "verified" walkthrough — do not
   cite them in public copy.
7. CLV backfill + contest-standings ingestion runners missing — Week 10 settlement
   needs them for CLV + realized ownership.
8. Grant submissions + Texas DBA: HELD for Garrett (human actions, not blockers).

## 4. Forensic risks (C) — ranked, with tonight's disposition

1. RECORD SPLIT-BRAIN: catalog 36-13-1/+20.14u vs engine-live-bridge 47-19-1/+24.92u.
   -> WP-5 steered: verify-ledger.ts recomputes from Neon; both surfaces render one truth.
2. PAYWALL LEAK: engine-live-bridge freeTeaserPlay (Mark Andrews OVER 2.5 rec,
   88/100) shipped FREE on stale JAX@BAL TNF. Open since Nov 8 (P0-2).
   -> WP-5 steered: remove/replace; no free high-confidence picks.
3. STAGE-3 JEV SNAP-EXECUTION GATE NEVER EXECUTED (PENDING_WINDOWS_HERMES_HW3...
   string inherited since Nov 10; live_windows_jevkit_executed_on_linux_vm=False).
   -> WP-8 must ACTUALLY run it, not inherit the string. Hard-doctrine snap-by-snap
   JEV simulation is the gate; no simulation, no publication.
4. Red-team P0 follow-ups: KICKING/IDP/TD_SCORERS calibration heads missing +
   negative-skill gate; pcvr_rows not persisted. -> WP-6 follow-up lane (post-launch).
5. Dad-Top20 IR fix (Doubs/Tracy hard-bans + DK Status read) exists only as an
   UNTRACKED file in the main repo. -> Port or disable the dad-CSV flow before DFS export.
6. Wiring workstreams A-F largely absent on launch branch; NO automated post-deploy
   verifier. -> WP-8 deploy step must run live HTTP 200 + content assertions manually
   (the directive's list) since no spec exists.
7. BENCHMARK INTEGRITY: 95.93 composite WITHDRAWN, 86.62 edited artifact. Do not
   cite any composite score without committed raw item records.
8. SELF-REPORTED VERIFICATION CULTURE: all 8 red-team receipts self-PASS; charge
   suite = 10 stdlib checks. -> Independently re-run SG1..SG10
   (tests/test_week9_forensic_autopsy_fixes.py) before arming WP-8.
9. Deploy/runtime regression history (182MB Lambdas, 45-min timeouts) — watch the
   Vercel build; tracing excludes untested.
10. CFB structurally unsellable (missing college JEV spine/injury Sinkhorn/router
   Stage C/D) — keep CFB OFF the store; Friday NCAAF sim is research-only.

## 5. The slate verification incident (caught tonight, resolved)

A stale context-compaction summary carried a FABRICATED Week 10 slate
(ATL@IND "Berlin", NO@CAR, BUF@HOU, TEN@NYJ, JAX@LV, CHI@MIN, CLE@PIT,
ARI@SEA, DEN@KC, TB@SF, DAL@PHI). It propagated into a draft morning packet.
Re-verification against BOTH authoritative sources:
- ESPN scoreboard (week.number=10, season 2026): TNF WSH@NYG FINAL + NE@DET,
  KC@ATL, HOU@CLE, MIN@GB, MIA@IND, CAR@NO, JAX@TEN, BUF@NYJ, SEA@LV, LAR@ARI,
  SF@DAL, PIT@CIN (SNF), LAC@BAL (MNF).
- Neon public.games (sportId cmpg6t7v900031heri45v3d8s): identical 14 rows.
The DB and catalog were RIGHT; the summary prose was wrong. T-00 reads Neon
live, so its PASS was always against the correct games. Morning packet corrected.
Lesson re-confirmed: never trust compaction prose for facts — re-run the query.
REAL catalog gaps found in the process (WP-5 steered): missing LAR@ARI + PIT@CIN,
SF@DAL mislabeled as SNF (PIT@CIN is the SNF). No Berlin game this week.

## 6. Stale routing & governance notes

- Master Path Forward v2.9 ADR-0005 routes cron to stealth/crouton-alpha — STALE
  (model 404; omniroute removed 2026-11-11). Current routing: openrouter
  deepseek-v4.1-flash primary; delegation qwen4-max-preview (quota-limited).
- ADR-0003 record lineage (38-13-1 base / 47-19-1 with props era) is historical;
  tonight's drain moves the record again — recompute, never hardcode.
- ADR-0002 stands: UNVALIDATED corpus hits capped at max_prob_delta=0.0; only
  VALIDATED kernels (BH-FDR q<=0.10, walk-forward OOS) shift log-odds.
- AGENTS.md still 3.1MB in the main repo (context-diet undone) — parked.

## 7. Disposition summary

ACTED TONIGHT: slate re-verification + packet fix; WP-5 steered (catalog gaps,
paywall leak, ledger split-brain); guardrail reconciliation (trust-gate,
dossier-guard, api-route-boundary, shell-defensive, ai-council); WP-6 OOF fit
landed (T-09 PASS); gates T-00..T-03 live PASS.
QUEUED FOR WP-8: prop Sniper Gate wiring, MILP floors, ticket-exposure caps,
actual JEV snap-execution (not the PENDING string), SG1..SG10 independent re-run,
dad-CSV IR fix port-or-disable, manual post-deploy assertions.
PARKED (human/post-launch): grants + DBA, AWS Activate, OTS pilot, weather edge,
mind-feed 15C/D/E remainder, calibration heads for KICKING/IDP/TD, AGENTS.md diet.