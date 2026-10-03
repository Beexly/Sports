# Claims Report — Partition c04, c05, c06 (FULL READ)

Base: `C:\Users\Garrett\Sports\.worktrees\calib-boundary\docs\engine\research\2026-10-02\corpus-deep\deep\`
Method: all 21 .md files read in full. Every IMPLEMENTED path verified by real file/`ls`/`grep` checks against `C:\Users\Garrett\Sports-wt-intel` (2026-10-02). Read-only on both checkouts; no git commands.

**Headline verification result:** the research docs in this partition significantly *understate* current repo state. Every c04 buildable system (BS-1..BS-5), the entire c05 trust-signals module (Systems 1–5), and the entire c06 extractor/aggregator/sweep stack (B1–B8) exist as code in `Sports-wt-intel\intelligence\{coaching, trust-signals, qb-behavior}` and were verified file-by-file. Claims written as "SPECIFIED-ONLY" or "proposed, not built" are stale relative to the checkout.

Path shorthand: **WTI** = `C:\Users\Garrett\Sports-wt-intel`, **CB** = `C:\Users\Garrett\Sports\.worktrees\calib-boundary`.

---

## c04\verified-claims.md

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| verified-claims.md | Inverse optimization recovers per-coach 4th-down risk preference τ̂ (quantile of next-state value distribution) from 2014–2022 nflfastR decisions | inverse optimization (quantile MDP, Hamming loss Eq. 4.11; joint (τ₁,τ₂) Eq. 5.5) | τ∈[0.2,0.8]; ≥25 decisions per region per WP range (plotting rule); 200 game-level bootstraps, 95% CIs | IMPLEMENTED | WTI\intelligence\coaching\coach_risk.py (Hamming, GO/FGA/PUNT, 0.2/0.8, fallback); WTI\intelligence\coaching\data\tau_hat.csv (verified header + fallback_level col) |
| verified-claims.md | τ̂ performance regression: β₁=0.769*** (0.138), partial R² 0.048, N=622, R²=0.059, adj R² 0.054, F=12.860*** | OLS (Eq. 6.2), verified as verbatim transcription from source note | N=622 coach-season-WP-region cells | NOT-APPLICABLE | external paper finding; informs positioning only (τ̂ = behavior-prediction lever, ~5% of points variance), no standalone build |
| verified-claims.md | Own-half τ̂ uniform across coaches (pool it); opponent-half heterogeneous — Nagy/Gruden/McCarthy/Pederson exceed the Bot at low WP | source §7 verbatim verification | τ̂₁−τ̂₂>0 with 95% CIs excluding 0 until WP≥0.8 | IMPLEMENTED | coach_risk.py + tau_hat.csv fallback chain (fallback=league/league_region for pooled cells) |
| verified-claims.md | Footballonomics baselines: conversion 77.9% overall (89% 4th&1, yardage-adj 73%, constant beyond own 35); FG 85.5%, sharp decline >50 yd; failed opp-territory conversion only ~+7% ensuing-drive score prob vs touchback; E[P] +1.4 pts/drive | nflgame API 2009–2015, 1,870 fourth-down attempts | 1,870 attempts; +1.4 pts/drive (p≪0.01) | NOT-APPLICABLE | external descriptive baselines; consumed at most as priors inside situational_wp.py |
| verified-claims.md | 2-pt vs XP rational baseline: 2-pt 51% (235/460) → 1.02 exp pts vs XP 98.4% (8,425/8,561) → 0.984; 2015 XP move cut XP ~5% (p<10⁻⁶), 2-pt unchanged | PAT audit 2009–2015 | 1.02 vs 0.984 expected pts | IMPLEMENTED | WTI\intelligence\coaching\situational_wp.py contains XP/two_point action set |
| verified-claims.md | Situational WP engine port recipe (0207 ADAPT): blended profiles, James–Stein shrinkage, MC trajectory search, Metropolis annealing, Laplace α=1; NFL state (score, time, down, distance, field position, timeouts) | brief-author ADAPT proposal (cricket-only paper) | MC N=50,000/config (SE ≤0.22%); fast 5,000 (~15 ms); refine 30,000; 8,000 annealing steps T0 0.05→1e-6; α=1 | IMPLEMENTED | WTI\intelligence\coaching\situational_wp.py (n0 shrinkage ×18 refs, prev_drive turnover input, GO/FGA/PUNT/XP/2PT/timeout present) |
| verified-claims.md | 0207 acceptance gate (brief-author's proposal, NOT a paper quote) | document-provenance check (B2) | "≥5% Brier improvement over raw MLE on held-out 2026 drives AND ≥80% agreement with 4th-down-bot on a 200-play audit" | IMPLEMENTED | situational_wp.py (10 Brier refs); WTI\intelligence\coaching\tests\test_coaching.py (0.03/200 gate constants) |
| verified-claims.md | Coaching-tendency tables BUILT+NOT-INVOKED at `~/workspace/coaching-tendencies/` (go4th_rate, two_pt_rate, verified tenures, coach profiles) | repo inventory (Analyst C) | n/a | IMPLEMENTED | WTI\intelligence\coaching\data\off_tendencies.csv, def_tendencies.csv, coach_offense.csv, coach_defense.csv; code\compute_tendencies.py, coach_tenures.py. NOTE: literal `C:\Users\Garrett\workspace\coaching-tendencies\` holds ONLY data\pbp_2022..2026.parquet — no code/csvs/profiles at that path |
| verified-claims.md | DATA_GAPS.md honesty constraints: blitz rate, man/zone, shells, personnel, motion UNAVAILABLE in nflverse | doc citation (coaching-tendencies/DATA_GAPS.md) | n/a | QUEUED-BUILDABLE | DATA_GAPS.md not found in either checkout (find, maxdepth 4). Build: write WTI\intelligence\coaching\DATA_GAPS.md recording the nflverse-unavailable inputs |
| verified-claims.md | "4th-down grader" exists as engine module | single compositional mention in IG-sweep brief; no path | n/a | NOT-APPLICABLE | no verifiable path in either checkout; superseded by coach_audit.py for audit functions |
| verified-claims.md | Signal declarations `nfl_coaching_tendencies` / `nfl_fourth_down_aggressiveness` (CONTINUOUS_VALUE, context-only, zero wiring) | signal-audit doc | n/a | IMPLEMENTED | WTI\docs\reasoning\signal-audit.md — both names present (declaration doc only; wiring still absent) |
| verified-claims.md | τ risk-preference fits NOT-MENTIONED anywhere in c04 (pre-build inventory) | grep sweep of all c04 briefs | zero hits | DUPLICATE | superseded by row 1 — coach_risk.py + tau_hat.csv now exist (c04\working\c-built-inventory.md row 11) |
| verified-claims.md | Timeout NFL analog (1684): propensity GAM/GBM + genetic matching, outcome = integrated centered WP over rest-of-half; NBA estimand not a GSE input | ledger spec (ADAPT) | 2–3 weeks per the file's spec | QUEUED-BUILDABLE | timeout stub refs only in situational_wp.py; full build = replicate 1684 design on nflverse pbp (timeout_team field held) |
| verified-claims.md | 1575 partially closes c04-map gap #5 ("no coach-decision audit dataset") | cross-slice check | n/a | NOT-APPLICABLE | map hygiene; the audit dataset is now built (coach_audit.py) |
| verified-claims.md | Cross-slice rule: fit opponent-half τ̂ per coach-team; league-pool own-half; never serve per-coach own-half τ̂ | corpus per-individual-fitting gate applied | n/a | IMPLEMENTED | coach_risk.py fallback chain + tau_hat.csv fallback_level (own/opp cells fall back to league pools) |

## c04\syntheses.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| syntheses.md | S-1: two-layer system — 0207 prescriptive WP surface + 1575 descriptive τ̂ compose into optimal/predicted/audit products | composition design ([INFERENCE] labeled) | n/a | IMPLEMENTED | coach_risk.py + situational_wp.py + coach_audit.py all present in WTI\intelligence\coaching |
| syntheses.md | S-2: "coaches too conservative" decays over time → refit τ̂ each offseason with T^(2/3) coach-era forgetting window (same class as HFA decline) | time-trend doctrine synthesis | T^(2/3) window | IMPLEMENTED | WTI\intelligence\coaching\refit_tau.py (2/3 constant present; --seasons interface) |
| syntheses.md | S-3: own-half τ̂ = not a per-coach feature (pool); opponent-half = genuine per-coach signal | inference from VC-1 uniformity finding | n/a | DUPLICATE | same claim as c04\verified-claims.md row "own-half uniform" (above) |
| syntheses.md | S-4: tendency tables are the τ̂ fit's input, not replacement; build order tenures → decisions → τ̂ → serve; no overlap with c03 | composition design | n/a | IMPLEMENTED | coach_tenures.py + compute_tendencies.py in WTI\intelligence\coaching (c03-owned tables imported, not rebuilt) |
| syntheses.md | S-5: adopt both gates verbatim as module promotion gates (they compose: gate 1 prescriptive, gate 2 descriptive) | gate adoption | ≥3 pp Hamming (opp half, 2024–2025); ≥5% Brier + ≥80% 200-play audit | IMPLEMENTED | WTI\intelligence\coaching\tests\test_coaching.py encodes 0.03 / 200 gate constants |
| syntheses.md | S-6: one SituationalEngine, pluggable action sets {GO,FGA,PUNT}/{XP,2PT}/{TIMEOUT}; build order 4th-down → 2-pt → timeout | design | n/a | IMPLEMENTED | situational_wp.py contains all three action families (timeout as stub per CH-8) |
| syntheses.md | S-7: previous-drive non-scoring turnover × starting position enters WP state (else post-turnover 4th-down states mispriced) | map #4 (0678) synthesis | +0.6–1.0 pts/drive; +21-yard bump; median start own 41 | IMPLEMENTED | situational_wp.py (prev_drive ×3 refs, turnover ×10 refs) |

## c04\challenges.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| challenges.md | CH-1: serve τ̂ at coach-team-season granularity with ≥25 gate and fallback chain; NEVER bare team-season | adversarial challenge | ≥25 decisions per cell | IMPLEMENTED | tau_hat.csv columns (tau_hat, n, fallback, team, season, region, wp_bin, fallback_level); coach_risk.py |
| challenges.md | CH-2: "2023–2026 τ̂ would be higher" is extrapolation → fit 2020–2025 directly, report measured trend | challenge | n/a | IMPLEMENTED | refit_tau.py; tau_hat.csv fit_stamp ("point fit — not pre-kickoff…") |
| challenges.md | CH-3: τ̂ explains ~5% of 4th-down points variance → position as behavior-prediction layer, not primary outcome feature | challenge (source §9) | partial R² 0.048 | IMPLEMENTED | behavior.py + provider.py in WTI\intelligence\coaching define expected_wp_given_coach |
| challenges.md | CH-4: shrink served τ̂₁−τ̂₂ contrasts toward the Bot-translated region gap (residual Daly-Grafstein bias) | challenge | n/a | IMPLEMENTED | coach_risk.py contains bias adjustment (2 refs) |
| challenges.md | CH-5: 0207 Brier gate is weak alone; the ≥80% bot-agreement half is the binding constraint — promote only on both | challenge | both required | DUPLICATE | same gate as c04\verified-claims.md "acceptance gate" row |
| challenges.md | CH-6: "own-half τ̂ not a real feature" is our decision, not the paper's — revisit on 2020–2025 refit | challenge | n/a | DUPLICATE | same as c04\verified-claims.md own-half row |
| challenges.md | CH-7: λ(n)=n/(n+n₀) with n₀=50 half-weight — documented reconstruction, not the paper's formula | challenge | n₀=50 | IMPLEMENTED | situational_wp.py (n0 ×18 refs) |
| challenges.md | CH-8: timeout module thinnest foundation — stub behind shared interface; full modeling Phase-5+ gated on 1684 replication | challenge | n/a | DUPLICATE | same as c04\verified-claims.md timeout row |
| challenges.md | CH-9: map gap #5 "no coach-decision audit dataset" is slice-myopic — 1575 IS one | contradiction resolution | n/a | DUPLICATE | same as c04\verified-claims.md gap-#5 row |
| challenges.md | CH-10: do not wire to the unverified "4th-down grader"; treat as NOT-MENTIONED | challenge | n/a | DUPLICATE | same as c04\verified-claims.md 4th-down-grader row |

## c04\buildable-systems.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| buildable-systems.md | BS-1 `coach_risk.py`: per-coach-team-season τ̂ estimation with ≥25 inclusion rule, 3-level fallback, bias adjustment | build contract | "team-specific τ̂ rule beats risk-neutral WP-max rule by ≥3 pp Hamming accuracy in the opponent half on 2024–2025 4th downs" | IMPLEMENTED | WTI\intelligence\coaching\coach_risk.py; data\tau_hat.csv + tau_hat.manifest.json |
| buildable-systems.md | BS-2 `situational_wp.py`: shrunk WP surface incl. prev-drive turnover, v1 {GO,FGA,PUNT}, v2 {XP,2PT}, timeout stubbed | build contract | "≥5% Brier improvement over raw MLE on held-out 2026 drives AND ≥80% agreement with 4th-down-bot logic on a 200-play audit" | IMPLEMENTED | WTI\intelligence\coaching\situational_wp.py (all components grep-verified) |
| buildable-systems.md | BS-3 `coach_audit.py`: WP-left-on-table audit per coach-team-season 2022–2026 + weekly report generator | build contract | audit reproduces paper's qualitative ordering on 2021–2022 (replication check) | IMPLEMENTED | WTI\intelligence\coaching\coach_audit.py (wp_left ×2, audit ×13) |
| buildable-systems.md | BS-4 `expected_wp_given_coach(σ, coach)` behavior-conditioned live-WP hook | build contract | unit identity: equals BS-2 output when τ̂ predicts WP-max action | IMPLEMENTED | WTI\intelligence\coaching\behavior.py, provider.py (function present) |
| buildable-systems.md | BS-5 `refit_tau.py --seasons` offseason refit with T^(2/3) window, versioned artifacts | process spec | refit on 2020–2025 completes; measured trend reported | IMPLEMENTED | WTI\intelligence\coaching\refit_tau.py |
| buildable-systems.md | Deferred: full timeout decision modeling | deferral | n/a | DUPLICATE | same as c04\verified-claims.md timeout row |
| buildable-systems.md | Deferred: nfl4th replication (external package as comparator only) | deferral | n/a | NOT-APPLICABLE | external package; never a rebuild target |
| buildable-systems.md | Deferred: blitz/man/zone/shell tendency inputs | deferral | n/a | NOT-APPLICABLE | unavailable in nflverse (paid charting only) |
| buildable-systems.md | Deferred: micro-edge "coach tendency shift after injuries" experiment | ledger "test" decision w/ falsification rule | n/a | QUEUED-RESEARCH | falsification rule exists ("falsify if post-injury tendency not stable") but the injury→tendency dataset does not exist yet |

## c04\working\c-built-inventory.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c-built-inventory.md | Drive-start field-position calibration LIVE (2025 prior + 2026 W1–2 observation, k=12 shrinkage) | shrinkage calibration doc | r vs 2025 home win = +0.186; slope +0.0647; se 0.0208; n=272 | IMPLEMENTED | WTI\docs\reasoning\drive-start-calibration.md (contains LIVE status) |
| c-built-inventory.md | FPM bootstrap WP-uncertainty replication (B=1,000 correlated resamples → lower-CI → Kelly) | ledger spec (ADAPT) | B=1,000 | QUEUED-BUILDABLE | nothing in WTI/CB found for it; build: bootstrap WP-CI engine feeding Kelly lower bound |
| c-built-inventory.md | Pathwise WP calibration monitor (0448): eventual-loser peak WP per game, KS-test vs theoretical CDF by favorite tier | ledger spec (ADAPT) | ~2–3 days effort; KS test vs paper CDF | QUEUED-BUILDABLE | no build evidence in WTI/CB; build: monitor over 2022–2025 in-game WP paths |
| c-built-inventory.md | Complementary-football drive-EP feature family (0678) | 3×10-fold CV selection | selected in ≥80% of replicates (turnover×start 100%); +0.6–1.0 pts/drive; +21 yd; median start own 41 | IMPLEMENTED | consumed as the prev_drive turnover input in WTI\intelligence\coaching\situational_wp.py |
| c-built-inventory.md | Coach-tendency shift after injuries (ledger "test", not run) | ledger row | n/a | DUPLICATE | same claim as c04\buildable-systems.md deferred micro-edge row |
| c-built-inventory.md | Other situational CONTINUOUS signals (2nd-and-ten, two-minute hurry-up, bye-week install, early-down pace) | signal-audit inventory | n/a | NOT-APPLICABLE | context-only declarations; no seam claimed |
| c-built-inventory.md | TESTED-REJECTED in coaching lane: none | inventory sweep | n/a | NOT-APPLICABLE | state-of-slice note |
| c-built-inventory.md | Inventory rows 1–8,10–14,16–18 (tendency tables, go4th/two_pt rates, tenures/profiles, signal declarations, situational engine SPEC, 4th-down grader, 2-pt model, coach-audit gap, τ NOT-MENTIONED, FPM, pathwise gate, injury micro-edge) | inventory table | n/a | DUPLICATE | covered by c04\verified-claims.md rows above (this file is Analyst C's source for VC-4) |

## c04\working\b-situational-verify.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| b-situational-verify.md | B1: 0207 brief supports the NFL port (ADAPT verdict, verbatim engine-actionable text) | brief verification | n/a | DUPLICATE | same as c04\verified-claims.md situational-engine row |
| b-situational-verify.md | B2: the acceptance gate is the brief author's proposal, not a paper quote | provenance check | n/a | DUPLICATE | same as c04\verified-claims.md acceptance-gate row (provenance noted there) |
| b-situational-verify.md | B3: 0247 quantitative findings (77.9%, 89%, 85.5%, +7%, +1.4, formulas, 51%/98.4%) | brief-vs-source verification | n/a | DUPLICATE | same as c04\verified-claims.md Footballonomics + 2-pt rows |
| b-situational-verify.md | B4: "coach tendency shift after injuries" is specified, not built | ledger-structure verification | n/a | DUPLICATE | same as c04\buildable-systems.md deferred micro-edge row |
| b-situational-verify.md | B5: 0207 prescriptive layer + 1575 descriptive layer compose (τ̂ needs 2020–2025 refit first) | composition analysis | n/a | DUPLICATE | same as c04\syntheses.md S-1/S-2 rows |

## c04\working\a-1575-verify.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| a-1575-verify.md | All six 1575 brief claims verified against the deep-read note with near-verbatim fidelity; every number matches (Eq. 4.6/4.11/5.5/6.2, rewards 6.95/3/−2, k=4 SCAM knots, 200 bootstraps, N=622, four coach names, WP≥0.8/WP<0.05, Yam & Lopez ~0.4 wins/yr) | brief-vs-source note check + arXiv abstract cross-check | n/a | NOT-APPLICABLE | provenance verification of a corpus brief; no build seam |
| a-1575-verify.md | Open question: is per-coach-team-SEASON τ̂ estimable with usable CIs under the ≥25 rule (source doesn't say; the spec assumes it) | gap identification | ≥25-decision rule | QUEUED-RESEARCH | partially resolved operationally by tau_hat.csv fallback chain; CI feasibility at coach-season grain still unproven |

## c05\verified-claims.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| verified-claims.md | Beat-desk Layer-3 pipeline (ingest → classify → entity-resolve → polarity×magnitude → freshness decay → source trust weight) — PROPOSED status | source-doc verification (v5.3.0 proposal, NOT implemented as of 2026-10-01) | freshness half-life ~24–48h; injury slower, motivational faster | IMPLEMENTED | WTI\intelligence\trust-signals\classify.py, entities.py, decay.py, tipster.py, pipeline.py (pipeline built since the proposal) |
| verified-claims.md | Trust tiers T1 official → T2 beat → T3 national → T4 Reddit (volume+polarity, never single posts); "trust is earned, not assigned" rolling update | source Layer 3 | tier priors in code: 1.0/0.8/0.6/0.4 (SPEC); EMA α=0.1 | IMPLEMENTED | WTI\intelligence\trust-signals\tipster.py (TIER_PRIORS ×2, record_outcome ×2, "0.5 + accuracy" ×2) |
| verified-claims.md | Unresolved high-magnitude negative items = hold flag blocking Premium publication | source Layer 3 | magnitude ≥0.7, polarity<0, fresher than 24h (code SPEC) | IMPLEMENTED | WTI\intelligence\trust-signals\models.py (HoldFlag), pipeline.py (hold_flag/HoldFlag ×5) |
| verified-claims.md | X intake registry: 6 accounts/7 URLs, priority tiers, dedup on X post ID, item landing `items/<handle>/YYYY-MM-DD.md`, provenance rule (URL or PROVENANCE-GAP) | registry read (6 files) | n/a | IMPLEMENTED | WTI\intelligence\trust-signals\sources.py; store.py (post_id ×13, content_hash ×4, is_duplicate ×2) |
| verified-claims.md | @matt_barlowe football lane UNCONFIRMED (PROVENANCE-GAP) — do NOT treat as intelligence source | provenance-gap verification | n/a | IMPLEMENTED | WTI\intelligence\trust-signals\sources.py (barlowe + PENDING_VERIFICATION ×4) |
| verified-claims.md | Reasoning-depth spec: trust-signal track mandatory at L3+ (UNCHECKED invalidates); verification statuses CORPUS/COMPUTED/SINGLE_SOURCE/INFERENCE on every claim | spec citation §5–6 | n/a | IMPLEMENTED | WTI\intelligence\reasoning\enums.py (CORPUS ×5, COMPUTED ×4, SINGLE_SOURCE ×4, INFERENCE ×4) |
| verified-claims.md | Integration contract §1: `TrustSignalProvider.get_trust_signals(team, week, season) -> list[TrustSignal]`; frozen dataclasses; verification on numeric fields; missing data = None + data_gap | contract doc | n/a | IMPLEMENTED | WTI\intelligence\trust-signals\provider.py (class + get_trust_signals ×2); WTI\intelligence\contracts\integration-contracts.md (3 matches) |
| verified-claims.md | Founder-gated credentials: beat-writer RSS/API, presser transcripts, Reddit API, prop-feed vendor | brief data-sources | n/a | NOT-APPLICABLE | external credential/founder decisions, no repo seam |
| verified-claims.md | "Zero ingestion" of beat signals; game_signals shadows at BLOCKED_MISSING_SOURCE (as of 2026-10-01 audit) | audit note | n/a | NOT-APPLICABLE | historical state superseded by the built module (rows above) |

## c05\syntheses.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| syntheses.md | S1: registry + beat-desk pipeline + consumption contract snap into one system | composition | n/a | IMPLEMENTED | the built WTI\intelligence\trust-signals module as a whole |
| syntheses.md | S2: tipster weight (source-level prior) × verification (claim-level status), multiplied at query time | composition | n/a | IMPLEMENTED | tipster.py + models.py verification field |
| syntheses.md | S3: 6 accounts → trust tiers, with Barlowe excluded/unclassified | mapping | n/a | DUPLICATE | same as c05\verified-claims.md registry + Barlowe rows |
| syntheses.md | S4: news_wire.py as event → typed re-run trigger router (qb_profile, coaching_profile, ol_state, checklist_refresh) | design | n/a | IMPLEMENTED | WTI\intelligence\trust-signals\news_wire.py (triggers_for, materiality HIGH/MEDIUM/LOW) |
| syntheses.md | S5: freshness decay + hold flags give the checklist a time dimension (HoldFlag first-class) | design | n/a | DUPLICATE | same as c05\verified-claims.md hold-flag row |
| syntheses.md | S6: two-key dedup — post_id when present, content_hash otherwise, one store serves both lanes | design | n/a | IMPLEMENTED | store.py (both keys verified) |
| syntheses.md | S7: shared TrustSignal shape with signal_origin TEXT\|VIDEO\|NEWS_WIRE; no second store | coordination decision | n/a | IMPLEMENTED | models.py (SIGNAL_ORIGIN SOCIAL/VIDEO present) |
| syntheses.md | S8: shadow-first default — live=False until deliberate logged promotion | honesty doctrine | n/a | IMPLEMENTED | models.py shadow field (×2) |

## c05\challenges.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| challenges.md | C1: beat-desk is a design doc, not validated research — code must label hand-set params SPEC/INFERENCE | honesty rule | n/a | IMPLEMENTED | verification=INFERENCE labeling in models.py/classify.py |
| challenges.md | C2: freshness half-lives are vibes → configurable per-type defaults, never presented as findings | honesty rule | injury 72h, lineup 48h, scheme 48h, weather 24h, off-field 48h, trust-quote 36h, motivation 12h (code SPEC) | IMPLEMENTED | decay.py HALF_LIVES (×5), 0.5 ** decay form |
| challenges.md | C3: tipster update rule has no corpus formula → EMA accuracy → weight multiplier, documented SPEC | honesty rule | α=0.1; effective = tier_prior × (0.5 + accuracy) | IMPLEMENTED | tipster.py ("0.5 + accuracy" ×2, "0.5 + self") |
| challenges.md | C4: X intake rests on fragile mirror chain → SINGLE_SOURCE cap, provenance-gap logging, fetch seam (no working client) | design response | mirrors 45–273 days old | IMPLEMENTED | fetch.py (seam); store.py provenance enforcement. Live X client itself → QUEUED-BUILDABLE (see below) |
| challenges.md | C5: @matt_barlowe excluded from active intake (PENDING_VERIFICATION) | honesty rule | n/a | DUPLICATE | same as c05\verified-claims.md Barlowe row |
| challenges.md | C6: @the_waldman 403 post content is INFERENCE — never citable as verified | honesty rule | n/a | IMPLEMENTED | provenance_gap field in models.py/store.py; gap items rejected/pinned |
| challenges.md | C7: "fastest wire" unbenchmarked → priority from registry tier, not a speed claim | honesty rule | n/a | IMPLEMENTED | sources.py tier assignment |
| challenges.md | C8: news materiality tiers are SPEC defaults awaiting calibration | design | HIGH (starter QB/HC/out-for-season, major trade) / MEDIUM (depth-chart, activation, coordinator quote) / LOW (narrative, standings) | DUPLICATE | same as c05\syntheses.md S4 row (news_wire.py) |
| challenges.md | C9: entity resolution = deterministic alias table, unresolved → data_gap, never guesses | design | 32 teams + supplied roster | IMPLEMENTED | entities.py |
| challenges.md | C10: classification is heuristic (keyword-rule), every output verification=INFERENCE | honesty rule | 6 classes + TRUST_QUOTE | IMPLEMENTED | classify.py |
| challenges.md | C11: T4 volume gate — single posts never emit signals; min 5 items per team per 24h window | anti-noise rule | min 5 items / team / 24h | IMPLEMENTED | tipster.py (volume-gate SPEC comment, line 30) |
| challenges.md | C12: founder killed shadow period but spec demands it → resolve by defaulting live=False, promotion logged | honesty rule | n/a | DUPLICATE | same as c05\syntheses.md S8 row |
| challenges.md | Production X client (X API key or Garrett's session) — the #1 hard block | hard-block statement | n/a | QUEUED-BUILDABLE | only the fetch seam + MirrorFetcher stub exists; build: X-accessible fetch worker |

## c05\buildable-systems.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| buildable-systems.md | System 1: X-account monitoring pipeline (sources.py, scheduler due_for_check, fetch seam, store.py JSONL + landing writer, provenance rule enforced) | build spec | daily tier 2×/day in season; weekly Sat+Mon; event-driven; monthly verify | IMPLEMENTED | WTI\intelligence\trust-signals\{sources.py, fetch.py, store.py} |
| buildable-systems.md | System 2: beat-desk pipeline (classify, entities, polarity, decay, beat vectors, HoldFlag) | build spec | decay weights per C2 table; hold = mag ≥0.7 ∧ polarity<0 ∧ <24h | IMPLEMENTED | WTI\intelligence\trust-signals\{classify.py, entities.py, decay.py, pipeline.py, models.py} |
| buildable-systems.md | System 3: tipster leaderboard (SourceTrust, record_outcome, T4 volume gate) | build spec | T1 1.0/T2 0.8/T3 0.6/T4 0.4; α=0.1; min 5 items/24h | IMPLEMENTED | tipster.py |
| buildable-systems.md | System 4: news-wire intake + typed profile re-run triggers | build spec | materiality tiers HIGH/MEDIUM/LOW | IMPLEMENTED | news_wire.py |
| buildable-systems.md | System 5: provider adapter (frozen dataclasses, verification, None+data_gap, decay at query time, signal_origin reserved, live flag default False) | build spec | n/a | IMPLEMENTED | provider.py + models.py |
| buildable-systems.md | Non-goals: trained text classifier (needs labeled data) | scope | n/a | QUEUED-RESEARCH | rule-based heuristic ships; trained classifier gated on labeled data |
| buildable-systems.md | Non-goals: working X API client; video extraction (c06); prop alignment; Sports-checkout changes | scope | n/a | NOT-APPLICABLE | explicit scope boundaries |

## c06\verified-claims.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| verified-claims.md | Old-QB RB dump rate: 20.9% vs 18.2% target share (34+ vs <34), z=8.0, p=1.3e-15, n=4,936 team-weeks 2016–2024, concentrated 37+ | Welch-test script review + hand arithmetic cross-checks | z=8.0; p=1.3e-15; n=4,936 | IMPLEMENTED | WTI\scripts\analytics\qb-age-rb-target-share.mjs (also in CB worktree); WTI\packages\prediction-engine\src\trend-discovery.ts. Caveat: use as cohort prior, not individual rule |
| verified-claims.md | Postseason inclusion unconfirmed (n=4,936 exceeds 4,736 regular-season ceiling by ~200) | sample-ceiling arithmetic (INFERENCE) | 4,736 regular-season ceiling | QUEUED-BUILDABLE | re-run qb-age-rb-target-share.mjs with season_type filter before production citation |
| verified-claims.md | Goedert 18.8% TPRR with Brown vs 27.1% off; 40.9% of PHI inside-the-10 targets 2025 | transcription check | 27.1% rests on 2–4 games, SE ≈ ±8–10pp | NOT-APPLICABLE | external stat (USA Today attribution); durable construct (absence-driven concentration), not a parameter |
| verified-claims.md | Keenum career positional split ≈ league average (WR 59.6/TE 20.4/RB 20.0 vs 59.3/20.9/19.7); no layoff checkdown spike | nflverse PBP computation | n=2,270 targets; layoff n=323 | NOT-APPLICABLE | external research doc, out-of-slice (no c06 brief); strongest "person not position" evidence; per-QB trust-profile template |
| verified-claims.md | Target-concentration (HHI) methodology absent in c06 (1 basketball hit only) | grep over 300 briefs | exactly 1 HHI hit (c00/0983) | DUPLICATE | superseded — target HHI is now built in WTI\intelligence\qb-behavior (row below) |
| verified-claims.md | Coverage-conditional tendencies (Ward 84% first-read unpressured; Geno→Wilson 44% vs man/33% blitzed; Lock→JSN 41% blitz; Maye cover-6) are UNVERIFIED host assertions | transcript-intake verification | one hard n=19 blitz attempts; denominators missing | QUEUED-RESEARCH | hypothesis seeds only; untestable in-engine until a charting feed (FTN/Fantasy Points/PFF/Sumer) is wired |
| verified-claims.md | M1–M3 buildable from pbp: target HHI Σ share² + EffN=1/HHI; situational deltas (3rd/RZ/trailing-4Q); absence-driven deltas | formula spec + nflverse field check | ≥150 targeted attempts recommended; HHI≈0.10→EffN≈10, 0.20→5, 0.33→3 (INFERENCE guide) | IMPLEMENTED | WTI\intelligence\qb-behavior\build\build_tables.py + data\trust_weekly.csv (verified header: hhi, hhi_lo, hhi_hi, n_eff, top_share, top2_share) |
| verified-claims.md | M5 coverage-conditional shares NOT pbp-computable (need charting) | field check | n/a | DUPLICATE | same as the coverage-conditional row above |
| verified-claims.md | ViViT-B + focal loss + Taguchi-L18: risky-tackle recall 0.67, F1 0.59 vs C3D 0.583 | source verification | recall 0.67; F1 0.59; 733 clips; γ=1.6 | NOT-APPLICABLE | external paper; film lane; not end-to-end (FPOC hand-marked) |
| verified-claims.md | VideoMAE fencing 90% (CI [0.8812,0.9187]) vs pose 64.8%; −5pp on home video | source verification | 90% vs 64.8%; ~960 clips, splits unstated | NOT-APPLICABLE | external paper; honest caution for viral-clip regime |
| verified-claims.md | Hockey tracking homography+MPN: IDsw 151 vs 1056 (GT regime), IDF1 95.1% vs 71.8%; edge reverses with real detections (453 vs 431) | source verification | IDF1 71.3% vs 62.9% in real-detection regime | NOT-APPLICABLE | external paper; adopt only from real-detection regime |
| verified-claims.md | TOTNet occlusion-aware ball tracking RMSE 37.30→12.31; augmentation-alone hurts (54.26 vs 29.57) | source verification | RMSE 37.30→12.31 | NOT-APPLICABLE | racket-sport regime; not football-portable as evidence |
| verified-claims.md | GSE video-tracking spec: RF-DETR AP50:95 54.7; TransNetV2 shot F1 77.9–96.2; 3.58-yd template bias; QC gates 12.0 yd/s — spec text, NOT measured | spec verification | AP50:95 54.7; F1 77.9–96.2; 3.58 yd; 12.0 yd/s | QUEUED-BUILDABLE | spec exists: WTI\docs\engine\research\2026-09-26\2026-09-26-video-tracking-spec.md; the capability itself is not built |
| verified-claims.md | Sloan 2018: CART 86.5% QB-position, 72.3% on 29 formations, 500+ auto-tagged screenshots | source verification | 86.5% / 72.3% | NOT-APPLICABLE | external; doctrine transfer: tuned simple models on tiny labeled sets |
| verified-claims.md | Structural finding: zero ASR/speaker-ID/transcript-alignment/affect in c06's video corpus; Rodgers–Metcalf was a discovery/triage failure; correct architecture is transcript-first with CV in 3 supporting roles | corpus sweep + transfer assessment | n/a | IMPLEMENTED | transcript-first built: extractors\transcript.py (TranscriptQuoteMiner), extractors\harvest.py (ClipMetadataHarvester — the discovery fix) in WTI\intelligence\trust-signals; ASR/speaker-ID remain v2 (queued-research rows below) |
| verified-claims.md | LEAP: ECE 0.1840→0.0876; Brier 0.4806→0.3157 (−16.5 macro); prior ablation 0.6427 vs 0.6512; mechanism ports, numbers don't | grep line-level verification | wᵢ∈[0.05,1.5]; >4σ outlier rule; τ_post=τ0+ηΣτᵢ | IMPLEMENTED | mechanism: WTI\intelligence\trust-signals\scoring.py (tempered-Bayes aggregator, wᵢ range, LOO). Paper numbers NOT transferred |
| verified-claims.md | 0440 LEAP NFL-port backtest: specified in ledger, NOT yet run — the single most important unrun experiment for the lane | ledger spec read | ADOPT: Brier improvement ≥0.010 AND ECE ≥25% relative; ADAPT-fallback: overconfidence −30% relative with accuracy preserved | QUEUED-BUILDABLE | run: 2024–2025 regular season, frozen pre-kickoff evidence (Grok briefs + injury reports), baseline = engine prob alone, metric Brier+ECE on {cover}, ablate prior |
| verified-claims.md | 0841 Twitter RF 65.6%±4.33%, κ=0.25±0.093 (1,975,614 tweets, ~90 EPL matches); never tested against odds; NFL port spec'd | source verification | port ADOPT gate: combined κ beats stats-only by ≥0.03 with market baseline; REJECT if sentiment adds nothing once lines included | QUEUED-BUILDABLE | 2024 NFL port: 72h pre-game window, time-ordered CV (train W1–12, test 13–18) |
| verified-claims.md | 1119 fandom emotional arcs: winner/loser 6.14/6.09→5.86/5.80→6.12/5.77 — descriptive only | source verification | ρ=0.85 (p<0.001); Pearson 0.33 | NOT-APPLICABLE | zero predictive validation; lexicon sentiment fails on sarcasm |
| verified-claims.md | BoRaEM (0530) per-source reliability EM: real-data gains tiny (+0.20%), optimizes rank not calibrated probabilities, β clip [0,1] | source verification | +0.20% over plain BT | QUEUED-RESEARCH | v2: joint EM replacing fixed TIER_PRIORS in tipster.py |
| verified-claims.md | 0670: market beats structural model (RPS 0.1905 vs 0.1972; ŵ=0.000 boundary; ΔRPS +0.0067 [0.0046,0.0088]; n=2,660) | line-level verification | n=2,660 | NOT-APPLICABLE | external paper result; the portable asset is the ŵ benchmark protocol (next row) |
| verified-claims.md | 0670 ŵ-vs-close protocol as the promotion gate for any news-fused score | doctrine extraction | ŵ>0.05 promotion threshold (code SPEC); stable across two independent 20-week folds, interior minimum | IMPLEMENTED | threshold encoded: WTI\intelligence\trust-signals\scoring.py (ŵ>0.05 promotion); the protocol RUN itself is queued (see 0440 row) |
| verified-claims.md | 1614 spread→win map LD~N(−0.009, 13.588), n=2,560; p=7 → 0.697 vs 0.689 actual; P(\|move\|>1)≈0.20; paper's own 53.5% vs 50.8% self-contradiction real | line-level verification | Φ(p/13.588); adopt gate: 2012–2025 Brier within 0.002; home-dog unless ATS ≥52.38% p<0.05 | NOT-APPLICABLE | external paper + ledger-authored gate |
| verified-claims.md | 1755 partial Kelly: s_t=s_{t−1}+ε(s*_t−s_{t−1}) beats intermittent at both fee levels; vig-as-fee is ledger INFERENCE | verification | ADOPT iff tuned ε<1 beats ε=1 by ≥2% annualized | NOT-APPLICABLE | sizing doctrine (staking lane), not a trust-module build |
| verified-claims.md | 1784 margin-as-gate: top-two margin 10% coverage @ 29.0% vs 13.3% overall; ceiling min(1,p/c); engine mapping is an analogy | verification | ≥2 pts selective hit-rate at posted coverage, walk-forward | NOT-APPLICABLE | paper quantity ≠ engine quantity; gate must not be skipped |
| verified-claims.md | 0450 conformal defect: 19% of m=10 calibration sets <85% conditional coverage — illustrative, not a universal constant | verification | 19% @ m=10 | NOT-APPLICABLE | doctrine: audit conditional coverage for small windows |
| verified-claims.md | Bridge bar: Brier 0.2237 vs spread-bucket 0.2120 on 285 sealed 2025 games — honestly a loss | verification | 0.2237 / 0.2120 | NOT-APPLICABLE | sealed benchmark doc exists (WTI\docs\reasoning\bridge-fit.md); bar for any new model |
| verified-claims.md | 1079: calibration-selected +34.69% vs accuracy-selected −35.17% ROI, eighth-Kelly, NBA; single season | verification | NFL gate: ECE-selection wins on eighth-Kelly ROI over ≥2 NFL seasons | NOT-APPLICABLE | external, one season; scheme-specific figure is 36.93% max |
| verified-claims.md | Net pressure r=+0.24135 walk-forward, n=250; entry bar \|r\|>0.03; mild winner's-curse | verification | \|r\|>0.03 entry bar | NOT-APPLICABLE | single 2025 season; doc exists (WTI\docs\reasoning\situational-edges.md) |
| verified-claims.md | RES verdict: Brier 0.275 = REL 0.026 − RES 0.002 + UNC 0.250; RES=0.002 from ONE file echoed in ~12 ops docs; phenomenon corroborated 3 ways (AUC 0.4965 on 13,646; ≥80 tail 43.7% vs 86.2%; 27-season band inversion); applies to engine-native probs only (market display Brier 0.1444–0.1692, REL 0.0044) | adversarial trace | AUC 0.4965; 43.7% vs 86.2% claimed | NOT-APPLICABLE | scope correction doctrine: "fix discrimination before recalibration"; cite as one measurement family |
| verified-claims.md | Zero fabricated numbers found in the compose chain; all gates are ledger-author decision rules (one reader's engineering authority), weakest = 1169 qualitative | adversarial audit | n/a | NOT-APPLICABLE | verification disclosure, no build seam |
| verified-claims.md | Calibration discipline sequence for new signals (0670 → bridge bar → walk-forward gates → resolution-before-recalibration → ECE bake-off → margin gating → γ=0.5 → conditional coverage → fee-aware sizing → market display) | doctrine extraction | adopt stricter floors: ECE ≤0.04 / N≥500 | QUEUED-BUILDABLE | reconcile the floor contradictions (0.04 vs 0.05; n≥100 vs N≥500) across ops docs — see c06 challenges rows |
| verified-claims.md | Structural gaps: no trust-signal calibration doctrine; no live X feed; no viral-clip discovery; no speaker-ID/policy; entity-graph & signal-ledger are proposals; 180-QB table unlocatable; postseason unconfirmed | gap census | n/a | QUEUED-RESEARCH | gaps enumerated; individual actionable items rowed separately (below/above) |

## c06\syntheses.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| syntheses.md | S1: trust lane is transcript-first speech+NLP; CV only shot segmentation / speaker presence / dedupe; text extractors zero-GPU | six-line convergence argument | n/a | IMPLEMENTED | extractors\transcript.py + harvest.py (metadata, no GPU) in WTI\intelligence\trust-signals; ASR/diarization v2 |
| syntheses.md | S2: LEAP scores it; the market gates it (news calibrates the prior, cannot create resolution); BoRaEM → per-source reliability; 1556 γ=0.5 downstream gated | composition | Brier ≥0.010 + ECE ≥25% (0440 gate); ŵ>0.05 | DUPLICATE | mechanism implemented (scoring.py); gates queued — same as c06\verified-claims.md 0440/0670 rows |
| syntheses.md | S3: target HHI (behavioral) vs expert consensus HHI (social) — same math, different objects; profile-anchored prior is INFERENCE v2 | design | consensus_hhi ≥0.8 + n_clusters≥2 → CLEAR (SPEC) | IMPLEMENTED | scoring.py consensus_hhi (×4 refs); qb-behavior trust_weekly.csv for target side |
| syntheses.md | S4: provenance is load-bearing — registry URL-or-gap rule, append-only ledger, LOO Δⱼ audit, gap weight pinned to 0.05 floor, r19 anti-source-counting, frozen_pre_kickoff | doctrine | wᵢ floor 0.05; CLEAR requires ≥2 story clusters | IMPLEMENTED | scoring.py item_contributions (×2); pipeline fail-loud provenance; clustering.py |
| syntheses.md | S5: d06 numbers are hypotheses; the ✅/❌/⚠️ ritual is the asset — emit raw quote, never just the score | doctrine | n/a | IMPLEMENTED | quote_text field + TranscriptQuoteMiner quote windows |
| syntheses.md | S6: floors inconsistent across corpus — adopt ECE ≤0.04 / N≥500, note discrepancy, never lower floors to greenwash | floor audit | ECE 0.04 vs 0.05; n≥100 vs N≥500 | DUPLICATE | same as c06\verified-claims.md floors-reconciliation row |
| syntheses.md | S7: wire-first build order (ŵ → bridge → walk-forward → resolution → bake-off → margin → γ → coverage → sizing → display) | doctrine | n/a | DUPLICATE | same as c06\verified-claims.md calibration-discipline row |
| syntheses.md | S8: three hard blocks — no live X feed; no charting feed; no speech pipeline/biometric policy | gap ranking | n/a | QUEUED-BUILDABLE | X feed + charting feed rowed separately; speech pipeline → QUEUED-RESEARCH (policy-gated) |
| syntheses.md | Everything else buildable today on stdlib+numpy+pandas+sklearn | stack claim | n/a | IMPLEMENTED | trust-signals module deps match (no torch/GPU in the v1 stack) |

## c06\challenges.md (consolidated)

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| challenges.md | Findings 1–20 verdicts: 12 CONFIRM (qualified), 7 QUALIFY, 1 CHALLENGE (#8 rest-days) | adversarial review | n/a | NOT-APPLICABLE | verdicts with named caveats; individual actionable items rowed below |
| challenges.md | A. ST EPA sign mischaracterization: d23 brief claims r=+0.054 "echoes" the wrong-way −0.0648 — it is the RIGHT way | contradiction hunt | +0.054 vs −0.0648 | QUEUED-BUILDABLE | fix the d23/ngs-st-pace brief: report both signs, drop the echo claim |
| challenges.md | B. Rest-days slope +0.411 (se 0.254) = 1.62σ wired as live engine component while wind (−0.135/0.162) and temp (+0.029/0.039) zeroed as "too noisy" — no principled bar stated | CHALLENGE verdict | 1.62σ (p≈0.10) wired; 0.83σ / 0.74σ zeroed | QUEUED-BUILDABLE | either state ≥1.5σ bar and apply uniformly, or hold rest at 0 pending multi-season confirmation |
| challenges.md | C. Calibration-floor disputes: ECE 0.04 (wiring manifest) vs 0.05 (launch doc); n≥100 (launch) vs N≥500 (checklist, labeled "strawman") | contradiction audit | 0.04 vs 0.05; 100 vs 500 | DUPLICATE | same as c06\verified-claims.md floors row |
| challenges.md | D. "Unanimous RES≈0" is one measurement family repeated in ~12 ops docs — cite as one, not twelve | scope correction | AUC 0.4965 (n=13,646); 43.7% vs 86.2%; 27-season inversion z=−1.19 | DUPLICATE | same as c06\verified-claims.md RES-verdict row |
| challenges.md | E. r04 LEAP map reframe — keep the honest ADAPT gate | correction | Brier ≥0.010, ECE ≥25% relative, 2024–2025 | DUPLICATE | same as c06\verified-claims.md 0440 backtest row |
| challenges.md | F. 0450's 19% is illustrative — the map drops this caveat | correction | n/a | DUPLICATE | same as c06\verified-claims.md 0450 row |
| challenges.md | G. Video-tracking spec YOLO-vs-RF-DETR inconsistency: watch-loop spec says "YOLO detector" while license posture rules Ultralytics YOLO AGPL lab-only, names RF-DETR shippable | spec-vs-license check | n/a | QUEUED-BUILDABLE | reconcile before any build: fix spec text to name RF-DETR only |
| challenges.md | Ledger status: 8 REJECT (respected), 7 WEAK (queued, not dead), 15 UNTESTED — nothing untested killed | doctrine audit | n/a | NOT-APPLICABLE | doctrine-compliance record |
| challenges.md | Corpus hygiene: zero duplicate md5s; 180-QB metrics table unlocatable; postseason unconfirmed | hygiene audit | n/a | DUPLICATE | 180-QB table → QUEUED-RESEARCH (locate before claiming as HHI vehicle); postseason → c06\verified-claims.md re-run row |

## c06\working\buildable-systems.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| working\buildable-systems.md | Sibling c05 module already built and landed (frozen TrustSignal, IntakeStore, deterministic entities, provider, beat vector) | direct code read of sibling | n/a | IMPLEMENTED | verified live at WTI\intelligence\trust-signals\{models,store,entities,provider,pipeline}.py |
| working\buildable-systems.md | TrustSignal schema v1.1.0: 9 new SignalTypes (TRUST_UP…RETRACTION), SignalOrigin.SOCIAL, TrustDirection enum, 18 defaulted fields (speaker_id, quote_text, claim_stance, story_cluster_id, role_weight∈[0.05,1.5], frozen_pre_kickoff, calibration_state, …) | build spec | wᵢ∈[0.05,1.5]; PROVENANCE-GAP pinned 0.05 | IMPLEMENTED | models.py contains SOCIAL, TRUST_UP, calibration_state, speaker_id, trust_direction, schema_version (grep-verified) |
| working\buildable-systems.md | Extractor plugin framework: TrustExtractor ABC, RawSignal, closed-enum fail-loud validation, REGISTRY+register, importlib discovery, pipeline stamps extractor name/version + computes signal_id sha1 | build spec | fail-loud: no URL and no gap → ValueError | IMPLEMENTED | extractors\base.py (class TrustExtractor), extractors\__init__.py (def register), discover.py, pipeline.py |
| working\buildable-systems.md | Six-account X extractors + TranscriptQuoteMiner + ClipMetadataHarvester (Barlowe PARKED/unregistered) | build spec | 50-quote fixture baseline recorded, not gated | IMPLEMENTED | extractors\accounts.py (XDougClawson, XMATTBarlowe, XMysportsupdate, XShauncore, XTheWaldman, XThrowthedamball); extractors\transcript.py (TranscriptQuoteMiner); extractors\harvest.py (ClipMetadataHarvester) |
| working\buildable-systems.md | Story clustering + quote-hash merger idempotent (TF-IDF cosine + Jaccard; keep earliest, union provenance, dedup_of loser) | build spec | Kamara triple-source → 1 cluster; Flowers dispute → 2 clusters + NEWS_CONFLICT | IMPLEMENTED | clustering.py; merge.py (quote_hash ×5) |
| working\buildable-systems.md | Tempered Bayesian trust aggregator + LOO audit + consensus_hhi + role_delta axis | build spec | ΣΔⱼ identity within 1e-9; gap item moves μ_post <0.01; outlier shrink 0.25; η=0.5 SOCIAL | IMPLEMENTED | scoring.py (class TrustScore, consensus_hhi ×4, item_contributions ×2) |
| working\buildable-systems.md | Checklist sweep (T2 verbatim): no signals → DATA-GAP + worst_plausible_assumption; never UNCHECKED at L3+ | build spec | zero signals → DATA-GAP | IMPLEMENTED | checklist.py (sweep_trust_signals, DATA-GAP ×6, worst_plausible_assumption ×4) |
| working\buildable-systems.md | Beat-vector seam: bayesian trust_score replaces heuristic only when n_items≥3; trust_path field records path | build spec | n_items≥3 threshold | IMPLEMENTED | pipeline.py build_beat_vector with trust_scorer param (×4 refs) |
| working\buildable-systems.md | v1 stack: stdlib+numpy+pandas+sklearn only; no network in extractors; no GPU; no face recognition/speaker ID (biometric policy owed); real footage only, 2–4s transformative clips | legal/stack posture | n/a | IMPLEMENTED | extractors are pure functions (no network); harvest.py metadata-only v1 |
| working\buildable-systems.md | v2 flagged, not built: ASR+diarization; transformer stance classifier; acoustic affect; LEAP LLM per-item elicitation (~2× tokens); BoRaEM joint EM; meta-calibration; validation battery; live X feed; profile-anchored prior | deferral | ~2× tokens/item | QUEUED-RESEARCH | all gated on deps, model access, credentials, or the biometric policy decision |
| working\buildable-systems.md | Explicitly NOT v2: expecting LEAP paper-domain gains on NFL {cover}; bulk fan-sentiment per-item elicitation; frame-level affect on press conferences | corpus refusal | n/a | NOT-APPLICABLE | corpus says no (κ=0.25-grade signal; cost error) |
| working\buildable-systems.md | Contract tests + fixture exchange (12 hand-built items; shape test through sibling _dict_to_signal; T2 test) | build spec | merger idempotent; provenance union complete | QUEUED-BUILDABLE | no tests directory exists under WTI\intelligence\trust-signals (find verified); land tests\fixtures\trust_exchange + contract tests |
| working\buildable-systems.md | Definition-of-done 7-item checklist (schema round-trip, discoverable extractors, identity tests, T2 verbatim, shadow/UNCALIBRATED labels, no second store, no guessed entities) | DoD spec | n/a | QUEUED-BUILDABLE | code exists per rows above; the DoD verification battery (tests) is unrun/unlanded |

## c06\working\calibration-chain.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| working\calibration-chain.md | Every headline compose-chain number verified at line level — zero fabricated numbers; e.g. 0670 RPS 0.1905/0.1972 ŵ=0.000 n=2,660; 1614 N(−0.009,13.588) n=2,560; 0440 ECE 0.1840→0.0876; bridge 0.2237/0.2120; 1079 +34.69%/−35.17%; MURPHY 0.275=0.026−0.002+0.250 | exact file:line greps against vendor docs | see c06\verified-claims.md §4 rows | DUPLICATE | all covered by c06\verified-claims.md §4 rows |
| working\calibration-chain.md | Gates: no gate invented by brief layer; all are ledger-author ADOPT/REJECT rules (0611 three-part gate; 1490 ≥0.002 Brier in ≥2 of 3 markets; 0700 ≥1pp ROI + ±3pp coverage; 1784 ≥2pts; 1755 ≥2% annualized; 1614 0.002-Brier / ATS ≥52.38% p<0.05); weakest: 1169 qualitative, 1673 compute-budget, 0.03/0.08 author-set knobs | gate-source audit | as quoted per gate | NOT-APPLICABLE | disclosure — gates are one reader's engineering authority, not peer review |
| working\calibration-chain.md | Internal contradictions catalog: (1) ECE floor 0.04 vs 0.05; (2) sample floor n≥100 vs N≥500 ("strawman"); (3) 1614 abstract 53.5% vs Table-1 50.8%; (4) "nflverse has no closing lines" is false — games.csv 7,276 rows with lines, corr(spread_line,result)=+0.4260; (5) MSFE/RMSFE mislabel in 1556 brief; (6) map inflates wiring-manifest floors; (7) bridge-vs-1614 scope note; (8) LEAP Brier baseline is paper-domain | line-level audit | 7,276 rows; corr +0.4260; identity 0.026−0.002+0.250=0.274≈0.275 | NOT-APPLICABLE | doc-hygiene findings; floors reconcile via c06 floors row; games.csv itself not located in WTI/CB at depth 3 (vendor-doc verification) |
| working\calibration-chain.md | RES≈0 trace: single measured decomposition (MURPHY_COMPONENTS_EXPLORE.md:6-8) echoed in ~12 ops docs; one partial exception (BAKEOFF 0.0023, n=1,132); phenomenon independently corroborated 3 ways; scope = engine-native probs, NOT market-anchored display | adversarial trace | AUC 0.4965; 43.7% vs 86.2%; z=−1.19 | DUPLICATE | same as c06\verified-claims.md RES-verdict row |
| working\calibration-chain.md | Calibration discipline for new signals (10-step sequence, §5) | doctrine extraction | ECE ≤0.04 / N≥500 stricter pair; ŵ stable across two 20-week folds, interior minimum | DUPLICATE | same as c06\verified-claims.md calibration-discipline row |

## c06\working\video-cv-methods.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| working\video-cv-methods.md | Verified CV numbers (0209 recall 0.67/F1 0.59; 0379 90% vs 64.8%, −5pp home; 0389 IDsw 151 vs 1056 GT / 453 vs 431 real; 0349 RMSE 37.30→12.31; d07 spec 54.7/77.9–96.2/3.58yd/12.0 yd/s; Sloan 86.5%/72.3%) | spot verification vs sources | as quoted | DUPLICATE | all covered by c06\verified-claims.md §2 rows |
| working\video-cv-methods.md | Transfer assessment: play-CV contributes at most the rare-event template, the −5pp caution, the labeling-factory pattern, and pipeline discipline; trust extraction is speech+NLP+metadata | per-source scoring | n/a | DUPLICATE | same as c06\verified-claims.md structural-finding row |
| working\video-cv-methods.md | P1–P5 buildable primitives: P1 signal record + conflict resolver; P2 clip ingest + dHash dedupe + entity-keyed metadata sweep; P3 transcript quote-miner; P4 affect proxies; P5 speaker presence (recognition needs-dep + policy) | ranked primitive spec | keep_idx = round(i·src_fps/target_fps); 64-bit dHash | IMPLEMENTED | P1→models.py/merge.py; P2→extractors\harvest.py (metadata half; frame decode v1.5); P3→extractors\transcript.py; P4/P5 → QUEUED-RESEARCH (needs-dep torch + biometric policy) |
| working\video-cv-methods.md | 9 challenges: corpus answers wrong question; 0389 regime-inflated; 0379 thin ice; 0209 manual centers; d07 spec-is-contract; 0359 n=1 lesson; TOTNet regime absent; license traps binding; watch-loop ToS gray zone (risk owned, not hidden) | adversarial pass | n/a | NOT-APPLICABLE | constraints/cautions, not builds; legal posture documented in working\buildable-systems.md v1 |
| working\video-cv-methods.md | Open gaps: entire speech pipeline unmapped in-slice; no viral-clip discovery spec; speaker ID/face recognition no method no policy; affect unevidenced; trust-signal calibration unaddressed; cross-shot identity unmapped; provenance flow into engine unaddressed | gap census | n/a | QUEUED-RESEARCH | discovery half fixed by harvest.py; ASR/diarization/policy/calibration remain open research |

## c06\working\trust-qb-behavior.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| working\trust-qb-behavior.md | Old-QB dump rate verified as reported + script sound (Welch textbook-correct); challenges: starter-by-most-attempts misattribution, no fixed effects, post-hoc 34 cutoff, postseason likely included | script review + arithmetic | z=8.0; p=1.3e-15; n=4,936; MIN_TEAM_TARGETS=12 | DUPLICATE | same as c06\verified-claims.md old-QB + postseason rows |
| working\trust-qb-behavior.md | Goedert split VERIFIED-AS-TRANSCRIBED small-n (27.1% SE ±8–10pp); Barkley YBC collapse 3.55→2.11 verified transcription | transcription checks | 3.55→2.11 YBC; 7.2%→4.6% explosive | DUPLICATE | Goedert same as c06\verified-claims.md row; Barkley = external stat, no build seam (folded here) |
| working\trust-qb-behavior.md | Keenum splits (n=2,270) strongest "person not position" evidence; blanket followed the separation-friendly role; single-game blankets 23–33% | nflverse computation | WR 59.6/TE 20.4/RB 20.0 | DUPLICATE | same as c06\verified-claims.md Keenum row |
| working\trust-qb-behavior.md | HHI confirmed absent in c06; machinery lives in c01/c05; Rodgers HHI 0.141/0.112 are other-slice figures | grep evidence | 1 hit (c00/0983) | DUPLICATE | same as c06\verified-claims.md HHI-absent row (superseded by qb-behavior build) |
| working\trust-qb-behavior.md | Coverage-conditional week-3 numbers UNVERIFIED (no denominators; Maye qualitative; 44%-of-routes vs 33%-of-targets mixes denominators) | transcript-intake audit | n=19 blitz attempts | DUPLICATE | same as c06\verified-claims.md coverage row |
| working\trust-qb-behavior.md | M1–M5 formulas: HHI/EffN; situational deltas; absence deltas with Beta-Binomial shrinkage; first-read NOT in pbp (charting-gated, air_yards<5 proxy is throw-depth not read-number); M5 needs charting feed | formula spec + field check | ≥150 attempts; HHI interpretation guide | IMPLEMENTED | M1–M3 built in WTI\intelligence\qb-behavior (trust_weekly.csv hhi/n_eff/top_share); M4 air-yards proxy computable; M5 → QUEUED-RESEARCH (charting feed) |
| working\trust-qb-behavior.md | Compositional modeling: wire M1–M3 through c05 Masked-Minka Dirichlet-multinomial share likelihood, not independent shares | cross-slice pointer | n/a | QUEUED-RESEARCH | not verified in WTI qb-behavior build tables; design only |
| working\trust-qb-behavior.md | 7 gaps incl. no routes-run in pbp, no coverage fields, Keenum doc unmapped, postseason unconfirm, no attitudinal trust in c06, 180-QB table unlocatable | gap census | n/a | DUPLICATE | covered by c06\verified-claims.md gap + postseason rows and c06\syntheses.md hard-block rows |
| working\trust-qb-behavior.md | Bottom line: keep old-QB as age-conditional prior; demote week-3 numbers to hypotheses; build M1–M3 fresh; name it concentration, not trust | disposition doctrine | n/a | NOT-APPLICABLE | doctrine naming rule; builds rowed above |

## c06\working\news-social-methods.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| working\news-social-methods.md | LEAP full verified numbers incl. controlled comparisons (beats prior-matched 0.6742/0.2510/0.1508 and budget-matched 0.6736/0.2497/0.1471 monoliths; N=5 seeds, σ≈0.010, 48/50 orderings preserved; cost 11,508 vs 5,733 tokens, 10.4s vs 6.2s) | grep spot-check vs ledger | LEAP 0.7284/0.2057/0.0876 | DUPLICATE | mechanism + gate same as c06\verified-claims.md LEAP rows |
| working\news-social-methods.md | 0841 full numbers (combined RF 69.6%±2.4%, κ=0.28±0.065; chi-square likely outside CV; no time split; never vs odds; Liverpool 426,457 vs Fulham 15,530 tweets) | source verification | port gate κ ≥ +0.03 vs stats-only | DUPLICATE | same as c06\verified-claims.md 0841 row |
| working\news-social-methods.md | Transfer: ADAPT the mechanism, not the numbers; per-item elicitation right for 6-account expert intake, wrong for bulk fan sentiment; cluster by story/beat; cost ~2× tokens | transfer assessment | n/a | IMPLEMENTED | accounts.py per-account extractor templates (the per-lane elicitation design) in WTI\intelligence\trust-signals |
| working\news-social-methods.md | Pipeline-stage analysis: ingest (greenfield feed — #1 hard dependency), dedup (post-ID backed, semantic greenfield), entity-tag (schema backed, NER greenfield), stance-classify (LEAP backed, taxonomy greenfield), score (backed, NFL validation greenfield), attach (schema partial, wiring greenfield) | stage audit | n/a | DUPLICATE | built portions verified (store/entities/classify/scoring/pipeline); greenfield remainder rowed as QUEUED items elsewhere |
| working\news-social-methods.md | Provenance chain 5 layers: intake record (immutable) → story cluster ID → elicitation record (gap items pinned wᵢ=0.05) → posterior update log (LOO Δⱼ receipt) → signal-ledger entry (append-only corrections) | design | wᵢ=0.05 floor for PROVENANCE-GAP | IMPLEMENTED | store.py provenance enforcement; scoring.py item_contributions; r16 signal-ledger itself remains a proposal (QUEUED-BUILDABLE below) |
| working\news-social-methods.md | 7 honest challenges: no live feed (single true hard block); sentiment≠trust; prior load-bearing and engine's is weak; beating the close is the only gate; correlation is default; greenfield majority; temporal discipline non-negotiable (frozen_pre_kickoff) | challenge pass | Brier ≤0.22 / ECE ≤0.05 publish floors | DUPLICATE | same as c06\verified-claims.md/syntheses rows (X feed QUEUED-BUILDABLE; frozen_pre_kickoff field built in models.py) |
| working\news-social-methods.md | Entity-graph (28 types, EntityRef, sourceTier 1–6) and signal-ledger (append-only 30+ event types, corrections as new entries) are PROPOSALS — schema does not exist; BLOCK-2 tracked | proposal-status check | n/a | QUEUED-BUILDABLE | no entity-graph/signal-ledger code found in WTI\intelligence (signals\ holds only registry.json); build the ledger schema when DB prerequisites land |

## c06\working\challenges.md

| file | claim | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| working\challenges.md | Findings 1–16 verdicts (old-QB CONFIRM-QUALIFY; coverage QUALIFY-borderline-WEAK; net pressure CONFIRM; NGS QUALIFY + ST-EPA sign defect; QB CV 0.993 CONFIRM; Goedert QUALIFY; Baldwin blend inference; bridge rest-days CHALLENGE; 0670 QUALIFY; 0611 QUALIFY; LEAP QUALIFY; 1556 QUALIFY + traceability note; 1614 CONFIRM; 1784 QUALIFY; 1755 QUALIFY; 1079 QUALIFY) | adversarial review | as quoted in consolidated file | DUPLICATE | covered by c06\challenges.md (consolidated) rows above |
| working\challenges.md | (file condition) this working file is itself truncated in-place — ends mid-report after finding 16 with an embedded "...[truncated 13034 chars]" marker; findings 17–20 + tail sections missing from the file | read observation | n/a | NOT-APPLICABLE | noted for FILES READ; the consolidated c06\challenges.md carries findings 17–20 |

---

# TOTALS (rows per disposition)

- IMPLEMENTED: 76
- IMPLEMENTED-CALIB-BOUNDARY: 0
- QUEUED-BUILDABLE: 17
- QUEUED-RESEARCH: 9
- NOT-APPLICABLE: 38
- DUPLICATE: 46
- CONTRADICTS-DOCTRINE: 0
- **TOTAL ROWS: 186**

(No row claims shadow-forbidden behavior: every live-gating/calibration claim in the partition resolves toward shadow-first, UNCALIBRATED labels, and fail-closed gates. The one historical tension — the founder overriding the 4–8 week shadow period — is documented in c05\challenges.md C12 and resolved conservatively in code with `live=False` default, verified in models.py.)

# FILES READ

- Count: 21/21 files read in full (7 c04, 4 c05, 10 c06).
- Unreadable: none. One defect: `c06\working\challenges.md` is itself truncated in-place (ends after finding 16 with an embedded "...[truncated 13034 chars]" marker at line 63; the missing tail — findings 17–20 verdicts and subsequent sections — is covered by the consolidated `c06\challenges.md`).
- Verification checks run: ~25 `ls`/`find`/`grep` passes against `C:\Users\Garrett\Sports-wt-intel` and the calib-boundary worktree (coaching module, trust-signals module, qb-behavior, reasoning enums, contracts, docs/reasoning, scripts, packages). Key negative results: `~/workspace/gse-intelligence-build/` does not exist anywhere (build code landed at `Sports-wt-intel\intelligence\` instead); `DATA_GAPS.md` absent from both checkouts; no tests directory under trust-signals; `C:\Users\Garrett\workspace\coaching-tendencies\` holds only pbp parquets.

# TOP-5 QUEUED-BUILDABLE (ranked)

1. **Run the 0440 LEAP NFL-port backtest** — 2024–2025 regular season, frozen pre-kickoff evidence (Grok briefs + injury reports), baseline = engine probability alone, metric Brier + ECE on {cover}, ablate the prior. Gate: ADOPT at Brier ≥0.010 AND ECE ≥25% relative; ADAPT-fallback at overconfidence −30% relative. Highest leverage: it is the single gate that promotes the entire built trust-signals stack (scoring.py already implements the mechanism, shipping UNCALIBRATED) from triage to calibrated weight.
2. **Stand up an X-accessible fetch worker** (X API key or Garrett's browser session behind the existing `fetch` seam in `trust-signals\fetch.py`). The #1 hard block: six extractor classes sit ready in `extractors\accounts.py` consuming stored RawItems, but no live feed exists — mirrors are 403ing. No feed, no pipeline.
3. **Wire a charting feed** (FTN / Fantasy Points / PFF / SumerSports) to unlock M5 coverage-conditional trust metrics (Ward/Geno/Lock/Maye claims) and routes-run TPRR (Goedert construct). Currently untestable in-engine; the week-3 numbers stay hypothesis seeds until this lands.
4. **Pathwise WP calibration monitor (0448)** — compute eventual-loser peak WP per game on 2022–2025 in-game WP paths, KS-test against the paper's theoretical CDF by pre-game favorite tier. Spec'd at ~2–3 days; it is the formal gate for GSE's in-game WP model and nothing in the repo implements it.
5. **FPM bootstrap WP-uncertainty replication** — B=1,000 correlated resamples through the win model → probability CI + H₀ test, lower confidence bound into Kelly sizing (0247 spec). Pairs with the staking lane's fee-aware-sizing-last doctrine and is the last unbuilt piece of the c04/WP uncertainty chain.

Runners-up: rest-days σ-bar decision (state ≥1.5σ uniformly or hold at 0); video-tracking spec reconciliation (RF-DETR vs "YOLO"); floors reconciliation (ECE 0.04/0.05, n≥100/N≥500); DATA_GAPS.md; trust-signals contract tests + fixture exchange; ST-EPA sign fix in the d23 brief.
