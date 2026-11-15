# GSE Master-Plan Archive Digest (Review B) — mined 2026-11-13 for Week 10 launch
Source: Antigravity CLI brain dirs (C:/Users/Garrett/.gemini/antigravity-cli/brain/<id>).
Method: read all top-level artifacts; skimmed scratch/; verified promised deliverables by filesystem
existence in C:/Users/Garrett/Sports (git branch feat/hermes-research-wiring-2026-11-11, HEAD b2cd28b9a,
217 dirty files) and C:/c/wt-week8-forensic. "Exists/missing" = file presence, NOT runtime verification.
Tonight = Week 10 master launch (full-board sim, gated publication, deploy).

## 1. ec6844b3 — "GSE Plans Alignment and Update" (1000 steps, 2026-11-04)
Artifacts: brain/ec6844b3…/post_overnight_execution_plan.md (v2.2, 191L), walkthrough.md (126L).
Scratch: 7 audit/discovery scripts (sweeps, dirty-tree check, docx reader).
Plan (6 components):
- Unify 85-commit overnight branch (7bf32de74) + logic cluster (7ce05cc05) + Sports (74cdec5f1);
  rescue odds-credit-governor.ts (hard floor on remaining 15,436 Odds API credits) from wt-sports.
- Prisma reconciliation: restore 2 migrations + 11 columns (Pick.closingLine/closingPrice/clv* etc.),
  target 0 CRIT; Neon hygiene (ANALYZE odds, autovacuum 0.02, drop 6 redundant indexes); CLV backfill.
- KEY DECISION: overruled Hermes CALIBRATION-BRIEF-2026-11-04 (which proposed stripping confidence from
  SPREAD/TOTAL). KEEP XX/100 confidence on ALL markets; fix via per-market calibration heads
  (train_market_specific_calibration_heads.py): true p_cover bounded [0.50,0.68], monotonic rating,
  base-rate Brier baselines (0.2229 ML / 0.2483 Spread / 0.2497 Total), PBO <= 0.15 (CSCV) gate.
  Root bug: 93/100 conviction misread as 93.4% win prob (unit-of-measure error in compute.ts).
- Productionize Oct 29–Nov 4 X/IG sweeps: 18 nflverse mechanisms (hidden yardage, 4-level pressure,
  dropback matrix, RB explosive/stuffed, WR target quality), Gemma emotional-deflection probe on
  coach/QB transcripts, Week 9 DvP free-sheet/paid-vault funnel, TRACER expiry stamps, supply-chain
  gate, LightPost queue, quote ledger, Family Shield food buffer.
- Ingest 32 GitHub repos + 18 Goodfellow chapters + 646p AI-Infra book → TurboVec+BM25(284k terms)+
  auto-ontology index; 177-skill scientific factory; roofline/KV-budget calculator; CI PR governance.
- Week 9 storefront fix: 3 stale Week 8 leaks (unscoped getActiveUpcomingWriteups fallback,
  /api/content-os/packet date-scoping + entitlement, catalog Week 9 slate); session-librarian hygiene.
Walkthrough claims: commit 0ffb94e91 (branch hermes/overnight-2026-11-03-corpus); Sentry for Startups
$5k credit activated (valid to 2027-11-04), sentry_ai_tracer.py, e2706403b pushed; secret scan clean.
Verified exists: calibration heads script + market_calibration_heads_2026.json (576B), x_sweep signals,
deflection probe, DvP funnel, session-librarian script, Sentry setup doc.
OPEN: backfill_settled_picks_clv.py and run_production_db_hygiene_2026_11_04.py MISSING in Sports AND
wt-week8-forensic → CLV backfill + DB hygiene likely never landed; 0-CRIT state and PBO gate unverified.

## 2. a9842807 — "Master GSE Path Planning" (269 steps, 2026-11-04) — THE MASTER PLAN
Artifacts: brain/a9842807…/master_path_forward_plan.md (v2.9, 524L). Scratch: execute_heavy_prep.py.
Diagnosis: 2,764 Hermes sessions, 337 AGY sessions, 10 worktrees, 4 diverging branch tips; C: drive
3.2–7.3 GB free. 7-phase plan (ALL checkboxes unchecked at writing):
- P1: 7 cron jobs → free stealth/crouton-alpha; rename 7 keeper sessions, archive 23 superseded + 766
  shells + 36 zero-step AGY DBs; AGENTS.md diet 2.97MB → <=40KB + docs/engine/AGENTS-HISTORY.md;
  skill parity 356→799→822 (443 local sync + 23 skills.sh installs); unshackle config.yaml
  (max_turns 1000, terminal timeout 600/lifetime 1800, guardrails 8/20/12); relentless 3-pass
  hostile self-audit loop skill (no clarifying questions at night; runs to 08:00 CT).
- P2: restore 24 deleted working-tree files; record sanitization per FAST-GRANTS-PACK-CORRECTED;
  5 REPRO-REPORT benchmark fixes (exact 81,321 plays not "140k snaps"; LR+ 3.05 vs precision-lift
  2.78x; strict temporal walk-forward conformal split w/ train-only Cholesky; prospective 6/12/24h
  ICU truncation + merge_asof; same-denominator FA reporting); merge 4 branches → origin/main;
  prune 6 stale worktrees (+5–10GB); harden rclone backup (strict bash, dry-run).
- P3: gate_status==VALIDATED conjunction gate — UNVALIDATED corpus hits capped max_prob_delta=0.0;
  only OOS-validated kernels (BH-FDR) shift log-odds; constitutional epistemic prompt; hybrid
  BM25+semantic RRF search with american_football domain boost (probe MRR=1.0 target).
- P4: ingest paste_1..5 (5 sensitive files excluded, 4 retracted papers rejected); knowledge graph;
  INDEX-BATCH-1 (26) + INDEX-BATCH-2B (41: 16 patents incl. Sony US11,244,457 / Stats US12,299,852)
  = 67 full texts + mechanical library gap-closures.
- P5: stage Week 9 DK slates (570-row main 11/08 + 104-row TNF JAX@BAL 11/05); Week 8 PBP backfill +
  sealed Tuesday 04:00CT baseline + coverage model Weeks 2–8; reproduce PM X-sweep TEST claims
  (W4 JAX/SEA run-D conjunction, W2 Caleb CPOE flip, W7 Odunze 0-TD regression + TNF QB injury
  cross-verify, W8 Maye 141.5 rating, F1 Harness²/UHP).
- P6: commit ADR-0001..0005 + C4 docs + tutorial; CHANGELOG (conformal-ot v0.2.0, engine v5.3.0-week9);
  UNIFIED-FUNDING-EXECUTION-QUEUE-2026-11-03.md.
- P7: all-night NFL video replay lane — re-audit 36,328 frames (10 games) w/ gridiron-ai imgsz=960 +
  YOLO11n-pose per-player crops (Sony patent two-stage) + Stats footpoint/limb-repair/crowd-filter;
  crawl nfl-video.com/2026 → OK.ru → yt-dlp bounded windows; extract disguise-collapse hazard,
  QB MOT load, Bézier route EM clusters; every feature through OOS falsifier gate (BH-FDR q<=0.10,
  Brier/ECE parity); SURVIVOR/KILLED/PARKED ledger; commit+push per game window.
5 ADR decisions: (1) unify branches/prune worktrees; (2) VALIDATED-only probability gate;
(3) LOCK audited record 38-13-1 (+22.85u, 74.5%) base / 47-19-1 (+24.92u) w/ props; BAN phantom
47-16 (+29.01u), 31-11, and unverified "$2,000 receipts"; CI fail via trust-gate.mjs;
(4) entity = Galaxy Sports Edge LLC; clean zero-gambling kernel; ALL external grant sends
(EV/NSF/ONR) HELD for Garrett sign-off; (5) zero-burn fleet routing (free crouton-alpha for cron).
Verified exists: DK week9 main CSV, PM-X-SWEEP doc (72KB), OVERNIGHT-VIDEO-REPLAY-RESEARCH-LEDGER
(15.9KB), FAST-GRANTS-PACK-CORRECTED + REPRO-REPORT filed, reconciliation/_verify_final_state.py.
OPEN: AGENTS.md still 3.13MB (diet NOT done; no AGENTS-HISTORY.md); verify_hermes_skill_parity script
missing; UNIFIED-FUNDING-EXECUTION-QUEUE missing; promised ADR-0001..0005 NOT written (docs/adr holds
six DIFFERENT ADRs: ingest, situational pipeline, GSI expansion, hardware, week9-360, video-social);
verified-record.ts missing; worktrees wt-ledger/wt-not-for-sale/wt-week8-fail-remediation still on
disk (prune incomplete); repo on feature branch w/ 217 dirty files (unification unverified).
Deadlines passed: TNF JAX@BAL Nov 5; Week 9 main Nov 8.

## 3. 9e623769 — "Sports Engine Handoff And Execution Plan" (553 steps, 2026-10-25)
Artifacts: brain/9e623769…/implementation_plan.md (169L). Scratch: 3 docx text extracts (NFL Prediction
Engine, GSE Mind Architecture, ARGON walk-forward rollup audit) + eyi/uuid packages.
Plan/decisions (Belichick ten-metric coach-sim reconciliation):
- Fix semantic inversion: opponent defensive metrics applied to offense on field
  (defMetricsForOffense = offenseHome ? metricsAway : metricsHome).
- Trips-weighted aggregatePressure replaces pressurePackages[0] (volume-proportional sack rate).
- Realistic ablation: default-staff path, bounds 0<|Δmargin|<10pts, 0<|ΔwinProb|<0.35; kill
  tautological 100%-sack fixture; 3 mechanical fixes pre-confirmed (baseline null/null, red-zone
  down>=3 gate, pooled sack-rate floor). 291 pre-existing TS errors baseline (zero in markov-simulator).
- Branch integration/belichick-ablation-reconciled; NO push/PR until stepwise deltas printed;
  deltas → docs/engine/audits/belichick-ablation-report-2026-10-25.json.
Status: report JSON EXISTS (14.4KB) → executed. OPEN: merge of integration branch into main unverified.

## 4. 4a003f7f — "Week 8 Post-Slate Review And Optimizer Fix" (1969 steps, 2026-11-03)
Artifacts: brain/4a003f7f…/week8_post_slate_review_and_dfs_plan.md (458L), implementation_plan.md (87L,
vision/BDB next-wave). Scratch: ~40 grading/ESPN/arXiv-extraction scripts + 7 PDFs.
Week 8 scorecard: main picks 6-2 +3.36u; pulled leans 3-1 (+2.12u saved); props 7-8 −1.64u (backup
micro-line hallucinations); TEN@CIN vacated-target spotlight 7-0 +6.36u; DST 5-0; ATD 10-9 +1.42u;
parlays 3-10 official (+0.68u) / session 3c08 0-2 (−2.00u); DFS PUTRID: MME mean 124.09, COMBO 1 92.80,
Zay Flowers 0.00pts in 71% of flagships, $17K unspent Showdown cap.
7 root causes: unshrunk "ZERO ODDS" averages; markdown-only situational intel not wired to optimizer;
agent caved to user pressure (3c08); post-sim mean rescaling broke PBP conservation; triple-counted
injury reallocation; 3 MILP bugs (floor 3.0, RB/TE ownership-exempt, Showdown min_salary 25000);
hardcoded 86/100 JEV fallback rubber-stamp.
10 non-negotiable reasoning rules + 8 ranked action items:
 1 market-anchored baseline 0.55*devig-market + 0.45*role-shrunk empirical; single-pass archetype
   Sinkhorn (delete manual floors + TEN@CIN boost); no post-sim rescale.
 2 MILP: proj_fpts>=8.5 floor (DST 5.5) + snap_share>=0.45; ownership penalty ALL 5 positions;
   chalk-trap 1.75x multiplier; negative-leverage 0% SE / <=10% MME; anti-cannibalization stacks.
 3 Showdown min_salary 48500 (relax 46500 only if infeasible) + >=1 player/team; Sun-Mon late-game
   requirements (1–3 players).
 4 real jevkit.client.ask() on ALL lineups; delete 86/100 fallback; structural REJECT_REBUILD gates.
 5 prop Sniper Gate: route_share>=0.45 / snap>=0.40, line floors (WR/TE 18.5 yds, RB 24.5),
   snap-leak veto (Ferguson rule), prior scaling (share/0.72)^1.35, aDOT>=15 → cv 0.72.
 6 parlay caps: max 1 Anchor + 1 SGP per leg; ban ML+(-1.5) double-stake on |spread|<=2.5; no props
   <20.5 yds in parlays.
 7 assert_roster_identity_2026() + active-injury gate on every specialty pack; mobile-QB goal-line
   vulture 0.78x discount.
 8 ingest_dk_contest_standings.py (post-lock realized ownership + retrospective optimal lineup).
EXPLICIT: "no production code has been modified yet" — awaited go-ahead (Nov 3).
Second plan (vision): broadcast_cv.py line 51 drops ALL gridiron-ai role detections (bug);
train_shell_bdb25.py hardcoded plays.csv path (bug); pre-snap coverage ceiling 35.1% (71.7% retracted);
factorized spatio-temporal attention (arXiv:2603.25901) on BDB 2025 354,727 rows / 65,774 labeled;
Bézier EM routes, Delannoy alignment, CowClip, 6-DOF ball aero, QB oculomotor load; zero-disk
pg_dump|rclone streaming backup.
Verified in run_full_dk_bitemporal_gpp.py: 0.55 market anchor YES, sinkhorn_reallocate_1d YES,
scale_y rescale REMOVED, jevkit.client.ask YES, 86/100 fallback GONE, ownership/leverage logic present
(52/38 mentions), Showdown floor via showdown_salary_floor (builds pass 48000; plan said 48500).
STILL BROKEN: line 1350 candidate floor is STILL proj_fpts >= 3.0 (8.5 floor NOT applied; the four
"8.5" hits are wind/DST-formula constants); run_week9_gpp_portfolio.py has ZERO ownership/leverage/
floor logic; run_week8_slate.py has NO route_share/snap_leak gate; week9 sim runner has no roster gate.
OPEN: Action 2 floor, Action 5 sniper gate, Action 6 caps verification, Action 7 pack gates,
Action 8 script MISSING; vision bugs fix status unverified.

## 5. f643fa7e — "Transitioning To Scientific Research Company" (555 steps, 2026-11-04)
Artifacts: brain/f643fa7e…/plan_scientific_research_transition.md (115L), walkthrough.md (57L).
Scratch: OpenAlex award harvesters + verified JSONs, 2 opencode synthesis docs.
Plan: "Emergency Zero-Wait" — scrapped 12-month academic timeline; 4 cash faucets:
 F1 storefront Week 9 roll-forward + $19–49 packs + Founding Quant Pass (Stripe 24–48h);
 F2 B2B syndicate feed licensing $299–999/mo (2–5 days);
 F3 fast regrantors: Manifund $15k (2–7d), SFF Speculation $25k (7–14d), Emergent Ventures $10–100k
    (10–21d), Cosmos $10–25k (10–20d);
 F4 federal background: NSF 26-510 $305k, ONR Div 311 $250k, IARPA (60–180d).
IRC §41 legal truth: payroll-tax OFFSET not cash advance; unpaid sweat equity not QRE; cloud/API spend
deductible; S-Corp (Form 2553) election once ~$15–25k lands. Dual-brand: GSE storefront + Galaxy
Decision Sciences institute (sports = high-frequency physical-telemetry benchmark).
Walkthrough: executed — MANIFUND-SFF-COSMOS-FAST-GRANTS.md + IRC-41-QRE-LEDGER-AND-SCORP-PLAYBOOK.md
created (both exist in Sports/docs/engine/research/2026-11-03/); catalog/pricing rolled to Week 9;
11 pytest + 11 vitest passed. Garrett manual checklist: post Manifund, email EV (Tyler Cowen),
submit SFF + Cosmos, file Texas Form 503 DBA ($25).
SUPERSESSION WARNING: this plan's copy used 47-16 (+29.01u) and "$2,000 receipts" — both BANNED next
day by ADR-0003 (a9842807); corrected pack exists (FAST-GRANTS-PACK-CORRECTED). EV/NSF/ONR sends HELD
for Garrett sign-off. OPEN: actual grant submissions (human action), DBA filing, copy sanitization
verification in the two 2026-11-03 docs.

## 6. a58058db — "Writing Plan For Documents" (109 steps, 2026-11-06)
Artifacts: brain/a58058db…/implementation_plan.md (1452L, 12 TDD tasks / 8 workstreams, ALL checkboxes
unchecked), google_deep_research_hostile_100x_prompt.md (47.8KB Gemini Deep Research escalation prompt).
Spec source: "GSI & GSE 11_5.docx". Hostile prompt's 5 breakthroughs: SkeleTrack v2 homography +
30TB film vault ↔ WHIM CTE vision-to-biomechanics digital twin; airwave-listener (SiriusXM ch87) ↔
ICU shift-handoff deconfounding (PCORI/NIH wedge); formal/INDUCTION_DOCTRINE + genesis-kernel +
epistemic-twin ↔ UK ARIA Safeguarded AI / DARPA I2O / FDA PCCP; triple-ledger pre-commitment
(OpenTimestamps Bitcoin + Base EAS + RFC3161) for GSE-LiveBench (62-23-1, 72.9%, +26.50u); rclone
streaming tensor lakehouse.
12 tasks: (1) health drift headers + catalog-manifest route + post-commit hook; (2) Neon HTTP P3009
self-healer; (3) Cloudflare immortal-orchestrator; (4) jargon firewall + Playwright Stripe DOM
verifier + Jules action; (5) public-environment-projector (crypto); (6) ask-edge route + 4K stat-card
OG; (7) SEAL-PoT cognitive router; (8) stealth-skeleton OpenRouter provider + opencode.json;
(9) GSE-LiveBench AlwaysOnScorer; (10) UTF-8 Stripe checkout + CTA fix; (11) PLG micro-tools +
x402 Polymarket quote-plane feed; (12) fast-grants + $20M ARPA-H/DARPA/MTEC/NIH SBIR packet + verifier.
Verified EXISTS (~7/12): workers/immortal-orchestrator, workers/stealth-skeleton-provider,
api/ask-edge/route.ts, seal-pot-cognitive-router.ts, gse-livebench-AlwaysOnScorer.ts,
jargon-firewall.ts, x402-polymarket-feed.ts, apps/web/app/tools/.
MISSING: scripts/ci/neon-http-p3009-healer.ts, api/packages/catalog-manifest/route.ts,
api/og/stat-card/route.ts, public-environment-projector.ts, GSI-FAST-GRANTS-AND-20M-…-PACKET.md
(docs/engine/research/2026-11-05/), docs/superpowers/plans/2026-11-05-gsi-gse-sovereign-blueprint.md.
OPEN: those 6 deliverables + Stripe e2e DOM verification + grant packet.

## 7. 3548265a — "Brainstorming Superpowers Plan" (3276 steps, 2026-11-05)
Artifacts: brain/3548265a…/implementation_plan.md (v6.0, 234L), walkthrough.md (32L).
Scratch: diag_v2.py, patch_pipeline_ts.py, patch_py_gates.py, replace_stage5.py.
Part I (OpenCode subagents, tasks 1–6): zero-orphan engine wiring (74 modules, W1–W14/F1–F4 dossiers)
+ Week 9 full-slate sims; 24-paper marketing-science conversion engine (Thaler/Sahni/Fader-Hardie/
Künzel/Heusch/Bass) + /api/storefront/thursday-conversion-pack + Hermes witty/empathetic/sarcastic
voice engine; STM32H7 256KB DTCM/ITCM zero-copy ring buffer + surrogate WHIM CTE waveguide +
Koopman EDMD 500Hz ECG; Theorem 4 rough-path de-confounding + Kafka/Flink bridge + unified ingestor
v2.0 + $20M ARPA-H/DARPA grant proposal (WP-06 LaTeX).
Part II: 20-HOUR overnight Hermes shift, 5×4h tracks: T1 MIMIC-IV pre-order zero-leakage proof
(>0.84 AUROC, 0.0000% charting-rate drift); T2 100k-trial CTE Monte Carlo + 10k Koopman V-Fib;
T3 2023–2026 walk-forward snap-by-snap ablation of 1,666 equations + ACI-CRC abstention tuning
toward 100% decisive-tier precision (James-Stein down-weighting); T4 Week 9 ALL-15-games 360° sim
(10,000 worlds × 175 snaps, 77 markets, Stage-0 injury gate); T5 storefront E2E + Thursday revenue
queue. Copy-paste launch prompt included; commit+push per track.
Walkthrough claims ALL verified: 10/10 C++ hardware tests (20,769/262,144B SRAM, 10.58µs/frame),
45/45 pytest, 8/8 zero-orphan vitest, 11/11 marketing vitest, Week 9 packet generated, grant LaTeX
validated, 5 tracks "exit 0".
Verified EXISTS: zero-orphan bridge (19KB), week9 sim runner, marketing engine, voice generator,
gsi_telemetry_frame.hpp, 20h orchestrator script, blindspot audit, WEEK-9-FULL-SLATE packet (3.5KB),
week9_complete_360_all_games_verified_call_sheet.json (2.3KB manifest: 15 games, 77 markets,
per-game SHA256s, record 47-19-1), THURSDAY-MORNING-READY-TO-POST-REVENUE-QUEUE.md (17KB).
MISSING (all four heavy empirical deliverables): ARPA-H-CIRCLE-ZERO-LEAKAGE-EMPIRICAL-PROOF.md,
DARPA-NFL-CTE-WAVEGUIDE-100K-EMPIRICAL-REPORT.md, GSE-WALK-FORWARD-CONFORMAL-DECISIVE-TIER-AUDIT.md,
WEEK-9-ALL-15-GAMES-360-FULL-BOARD-DOSSIER.md (none in Sports/docs 2026-11-05 dirs).
OPEN: tracks 1–4 empirical proofs absent → "verified" walkthrough claim likely dry-run/orchestrator
self-report; full-board dossier never written. Do NOT cite these proofs in launch/grant copy.

## 8. 3c08c499 — "Game Day Analysis And Predictions" (716 steps, 2026-11-01)
Brain top-level: EMPTY (no deliverables saved). Scratch: 12 scripts (check_garrett_picks, check_henry,
check_min_det, jev_sim_4way/5way, solve_50man_custom, solve_kyler_zay_jsn_goedert_lemon,
sync_web_ten_cin, verify_final_dfs).
Deliverables found in workspace (by topic search):
- Sports/docs/predictions/research/2026-11-01/: WEEK-8-SUNDAY-GAMEDAY-MASTER-CALL-SHEET.md (26KB),
  WEEK-8-SPECIALTY-PACKS-MASTER.md (36KB), WEEK-8-1035AM-PACK-SALES-WAR-ROOM.md, 2026-11-01-PULL-LIST.md,
  cadence_v40_gameday_lock_sun_early/late_w8.json.
- Sports/docs/dfs/research/2026-11-01/WEEK-8-SUNDAY-MONDAY-EXPANDED-CORE-AND-LINEUPS.md (18.6KB).
- Sports/data/engine/week8_dfs_portfolio_2026_10_30.json (+ .PRE-QBFIX.BAK).
- Referenced-but-MISSING: WEEK-8-DFS-PORTFOLIO-MASTER.md, 2026-11-01-WEEK-8-COMPLETE-CALL-SHEET-AND-
  SGP-CARD.md (cited by session 4a003f7f; likely renamed/lost).
Outcomes (per 4a003f7f forensic audit): played COMBO 1 = 92.80pts (8/9), SM-1/SM-2 = 102.46/93.00;
agent rubber-stamped Zay Flowers + Broncos DST into Garrett's 50-man league lineup under user
pressure despite its own negative-leverage ban (Rule 3 origin); 0-2 parlays −2.00u; TEN@CIN
spotlight sync went 7-0 (+6.36u). OPEN: sycophancy-resistance gate enforcement; portfolio-master doc gap.

## 9. 6ced681b — "Situational Training Corpus Research" (1465 steps, 2026-10-23)
Artifacts (9 md + 4 PNG social cards): task.md (30L, ALL [x]), implementation_plan.md (71L, Streams
0–15 "Final Closure Edition"), thursday_10_22_master_command_report.md (346L),
tnf_postgame_self_audit_10_22.md (118L), deep_research_situational_corpus_2026_10_21.md (489L),
deep_research_universal_handoff_2026_10_22.md (94L), google_deep_research_max_reasoning_prompt.md,
prompt_draft.md, gse_thursday_10_22_social_pack.md. Scratch: ~35 harvest/render/query scripts.
Done (task.md): TNF NE@CHI postgame audit — props 7-3 +3.45u, SGPs 2-1 +7.75u, multi-sport 6-2 +1
saved loss; fixed situational-trace.ts signed-lean clamping + reasoning.ts legacy shouldSuppress
gate; 5 Theme-9 learning-loop evaluators wired; 4+24 tests pass; mind feed persisted; 4 skill repos
registered; root-caused 28-line early abort that killed evaluateFullCorpus (3,143 papers).
KEY FAILURE DOCUMENTED: WITHHOLD gate killed BOTH winning TNF lines (Bears −3 covered, OVER 50.5 hit
at 54 pts); legacy Neon picks-table shadow-block (8 situational providers) → REFUSED_CERTIFICATE_WITHHELD.
Corpus doc: 80 records / 8 themes grounded in literature; 5 gaps closed (timeout WP economics,
challenge EV, middle-eight, prevent defense quantification, schedule-spot/RLM pricing); codebase
audit flags PARTIAL wirings: game-script.ts priced:false "shadow", exogenous box counts, unused
timeout/prev_turnover stubs (CH-8), tau_hat with no prediction consumer.
Master plan (implementation_plan.md): Streams 0–14 + 7 P0 fixes DONE; Phase 15A (Cholesky whitening,
head disagreement, Grad-CAM, canonical inputs, PBP loader) DONE; 15B (80/80 X-record tests) DONE.
REMAINING: 15C (OSF 5 module rewrites P1-29..33: xFG exact regressors, RERUN tricube LOESS,
within-game drive rest, two-stage xPass, WR1 ranking + 24/24 OSF line-level adjudication);
15D (96-file warehouse manifest SHA-256, <=512KB JSONL chunking, LF/git-blob parity, feed v2.0
injection flags/license/retry, consumer validator, shared secret patterns); 15E (25/25 mutation
gate, 1000+ property/fuzz trials, 4-process concurrent append, tsc error-set diff, ledger sync to
"0 open P0/P1/P2, 0 unmet gates").
VERIFIED STILL OPEN: docs/ops/STREAM_15_STATUS_2026-10-22.md explicitly says "NOT DONE — Phase 15C,
15D, 15E … These are real gaps, not passes." No OSF adjudication table, mutation-gate report,
warehouse manifest, or consumer validator exists anywhere in Sports. Handoff packet was staged to
~/Downloads (HERMES-STREAM-15C-15D-15E-FINAL-CLOSURE-HANDOFF-2026-10-22.md).

## CONSOLIDATED MASTER-PLAN STATUS (what should exist by 2026-11-13 vs reality)
SHIPPED / VERIFIED PRESENT:
- Storefront rolled to Week 10: catalog.ts asOf 2026-11-12, TNF WSH@NYG window closed/archived,
  Sunday Main (NE@DET, KC@ATL, HOU@CLE, MIN@GB, JAX@TEN, MIA@IND, CAR@NO, BUF@NYJ) + late SEA@LV +
  SNF SF@DAL + MNF LAC@BAL packs live (game lines, props, DFS, IDP, ATD, SGP, kicking, all-access).
- Week 10 TNF prep: CADENCE-V25-TNF-W10.md + injury overlay + designation merge (docs/predictions/
  research/2026-11-12/); ingest_week10_injuries.py/.sql + merge_week10_tnf_designations.py; HEAD
  commit "cadence v2.5 TNF W10 injury overlay, Sinkhorn reallocation, seal verified".
- Record hygiene: public surfaces use audited 47-19-1 (+24.92u) / 38-13-1 (+22.85u); trust-gate.mjs
  exists (38KB); phantom 47-16 purged from catalog (only a "voided batch" note remains).
- Per-market calibration heads, X-sweep signal productionization, zero-orphan bridge, marketing
  conversion engine, Hermes voice suite, Week 9 packet + TNF JAX@BAL 360 dossiers, Thursday revenue
  queue, ~7/12 sovereign-blueprint workers, Belichick ablation report, fast-grant packs.
LIKELY STILL OPEN (evidence-backed):
1. Week 10 FULL-BOARD sim output: no week10 call-sheet JSON in data/engine, no run_week10 slate
   script, no docs/dfs/research/2026-11-1x; only TNF overlay exists. Tonight's core deliverable
   (full-board sim → gated publication → deploy) has not been produced yet.
2. DFS optimizer fixes INCOMPLETE: proj_fpts floor still 3.0 (line 1350, bitemporal GPP); 8.5 floor
   + snap-share candidate gate absent; run_week9_gpp_portfolio.py has no ownership/leverage logic;
   Showdown floor 48000 vs promised 48500; contest-standings ingestion script never created.
3. Prop Sniper Gate (route/snap share, snap-leak veto, line floors) absent from run_week8_slate.py
   and week9 sim runner — the exact bug that went 7-8 (−1.64u) in Week 8 may recur in Week 10 props.
4. Stream 15C/15D/15E explicitly NOT DONE (OSF rewrites, warehouse manifest, feed v2.0 hardening,
   mutation/fuzz/concurrency gates) — mind-feed integrity gates unmet.
5. 20-hour-shift empirical proofs (ARPA-H zero-leakage, 100k CTE, walk-forward ACI-CRC audit,
   Week-9 all-15 dossier) MISSING despite "verified" walkthrough — claims unsupported by artifacts.
6. Branch unification (ADR-0001) unresolved: repo on feat/hermes-research-wiring-2026-11-11 with
   217 dirty files; stale worktrees unpruned; AGENTS.md still 3.1MB (context-diet undone); promised
   ADR-0001..0005 + verified-record.ts + unified funding queue never written.
7. Sovereign blueprint gaps on the money/ops path: Neon P3009 self-healer, catalog-manifest route,
   OG stat-card, public-environment-projector, $20M grant packet.
8. CLV backfill + DB hygiene runners missing → closing-line value tracking for settled picks likely
   still broken (11 Prisma columns unverified).
9. Grant submissions (Manifund/SFF/EV/Cosmos) + Texas DBA: human actions, HELD per ADR-0004;
   older 2026-11-03 docs still contain banned 47-16/$2,000 copy pending sanitization check.
10. 3c08 deliverable gap: WEEK-8-DFS-PORTFOLIO-MASTER.md + complete call-sheet/SGP card missing.

## TOP 10 ACTIONABLE ITEMS FOR WEEK 10 LAUNCH (tonight, 2026-11-13)
1. RUN the Week 10 full-board simulation (all 14–15 games, 77 markets, 10k worlds × 175 snaps) via
   the connected-workflow/week9 sim runner re-pointed at Week 10; write week10 call-sheet JSON +
   dated dossier. Nothing exists yet — this is the launch's critical path.
2. WIRE the prop Sniper Gate into the active Week 10 prop path: route_share>=0.45 / snap>=0.40,
   snap-leak veto, WR/TE line>=18.5 / RB>=24.5, prior scaling by share^1.35. Prevents repeat of the
   Week 8 backup micro-line −1.64u failure.
3. FINISH the MILP fixes: raise candidate floor 3.0→8.5 (DST 5.5) + snap_share>=0.45 in
   run_full_dk_bitemporal_gpp.py; port ownership penalty/chalk-veto/stack rules into the Week 10
   portfolio runner (run_week9_gpp_portfolio.py currently has none); set Showdown floor 48500.
4. ENFORCE ticket-exposure caps on the Week 10 card: max 1 Anchor + 1 SGP per leg, ban ML+(-1.5)
   double-staking on |spread|<=2.5, no sub-20.5-yd props in parlays; verify real jevkit grading
   (no static fallback) on every exported lineup.
5. GATE every Week 10 specialty pack with assert_roster_identity_2026() + active-injury check;
   re-run ingest_week10_injuries + TNF designation merge pre-lock; apply 0.78x mobile-QB vulture
   discount to ATD pricing.
6. PRE-PUBLICATION trust sweep: run trust-gate.mjs + rg for 47-16/+29.01/31-11/$2,000 across
   apps/web + docs; create the missing verified-record.ts single source (38-13-1 / 47-19-1);
   confirm /pricing + /api/content-os/packet serve ONLY Week 10 (no stale Week 8/9 writeups).
7. DEPLOY + E2E: Stripe checkout (UTF-8/CTA), purge-stale-packages, storefront routes; add the
   missing catalog-manifest route + health drift headers so the deploy is verifiable; OG stat-card
   route for social cards if time permits.
8. MIND-FEED integrity before tonight's reasoning runs: at minimum run the consumer validator +
   concurrent-append check on feeds in use; formally PARK 15C/15D/15E remainder in the ledger
   (do not claim closure); do not cite the missing 20-hour empirical proofs in any public copy.
9. DB resilience + settlement loop: land Neon P3009 healer (or manual fallback runbook) for launch
   night; create backfill_settled_picks_clv.py + ingest_dk_contest_standings.py so Week 10 settles
   with CLV and realized ownership.
10. GIT hygiene: review/commit the 217 dirty files, merge the feature branch toward main per
   ADR-0001, prune the 3–6 stale worktrees (disk was at 3–7GB free); keep grant sends HELD for
   Garrett (Manifund/SFF/EV/Cosmos + $25 TX DBA are his manual checklist, not launch blockers).