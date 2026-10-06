# c01 Deep Research — Syntheses (canonical, merged across all five partitions)

Cross-file systems composed from findings that build ONE buildable feature together. Overlapping syntheses from different analysts are merged; every file ref is preserved. INFERENCE marks the analysts' own compositional reasoning, never paper claims.

---

## S1. The pressure chain (L3 causal stack) — merged from P01-S1 + P05-S2.2 + P02-S2

**What it is:** HB-style composite OL grades (opponent-adjusted, rusher+blocker solved simultaneously, Bayesian-shrunk, time-blended) → expected pressure → per-QB pressure-to-sack trait (YoY-tracked, EB-shrunk toward ~18% baseline) → <2.5s quick-pressure split (coverage sacks vs true rush wins) → first-read/trust-target response (Love 78.6% one-read under pressure vs Purdy distributor archetype) → QB-scramble/sack/throwaway outcome shares → receiver-conditional TD.

**Joins:** all keyed by (qb_id, season-week). Converts the current pipeline's "qb_hit proxy" INT splits into modeled pressure attribution: expected pressure (OL + scheme) → QB sack conversion (trait) → read decision (behavior) → target (trust).

**Gap it fills:** the pipeline has no pressure feature at all today (only a qb_hit proxy for INT splits, which runs 2–3 pts high vs charting). FTN's `is_qb_fault_sack` + `n_blitzers` + `n_pass_rushers` + `qb_location` + `is_qb_out_of_pocket` are the wiring fuel (rights-cleared, no production caller).

**The Monken extension (P02-S2):** the quick-game ladder is the observable on this chain — `pressure_answer_delta` = Δquick_game_rate for a team in the 3 games after facing a top-5 pass-rush vs its baseline — a coach-adaptation feature the sister pipeline's static rates don't capture. Keep the <2.5s split for *attribution* and QB-behavioral description; do NOT model conversion rate as a *predictive skill* (build-plan KILL).

**Files:** sweep-2026-09-21 · our-metric-stack · qb-phase2 · 2026-09-24 full-tables · signal-wiring-catalog · post-inventory-2026-09-21 · coaching-tendencies/profiles/monken.md · 2026-09-18-parallel-build-plan.md · research/2026-09-19-dk-week2/deep/advanced-matchups-deep-dive-2026-09-19.md

---

## S2. The trust-target system — merged from P01-S2 + P05-S2.1

**What it is:** HHI/top-1/top-2 shares (already in pipeline) + first-read share + TPRR + air-yard share → the QB's "trust map" — per-QB → per-receiver `P(target=t | QB, situation)` stored as a versioned profile table. Two conditional layers on top: (a) **WR-absence conditionalization** — recompute every concentration metric with each receiver present vs absent (the Pitts 0.18→0.28 template, generalized to `trust_target_share(qb, receiver | absent_set)`); (b) **regime-state conditionalization** — IC4's incentive states (eliminated/auditioning teams refit usage on post-state games only; rest-window = refuse to price).

**Prop join:** the trust map is exactly the P(target=t) prior for the receiver-conditional TD decomposition P(TD)=Σ_t P(TD|target=t)·P(target=t). The conditional TD factor comes from coverage/separation features (HB cover grades, PFF man-coverage ratings — with the McDuffie dispute caveat) plus red-zone tendency priors.

**Gap it fills:** pipeline has HHI but no first-read, no TPRR (needs route denominators — FTN charting), no absence-conditional, no incentive-state handling.

**Discipline notes:** the Pitts magnitudes are case studies, not parameters — concentration shifts are receiver-role-specific (WR1-out ≠ TE-out) and need multi-case estimation before becoming priors. The Concepcion single-high split (+50% TPRR) is a betting-recommendation post, not research — the method transfers, the instance doesn't.

**Files:** qb-phase2 · advanced-matchups-deep-dive-2026-09-19 · 2026-09-25 full-tables (Pitts) · tacticai-0912 · signal-wiring-catalog (FTN read_thrown/catchable) · CARDS_INCENTIVE_CALENDAR (IC4) · 2026-09-29 full-tables (first-read target share top-25) · 2026-09-24 full-tables

---

## S3. The INT projection system (P01-S3)

**What it is:** TWP rate (~3.0% flagged, 52.3%→INT) as the situational INT signal + 1.867%/dropback baseline as the prior + the pipeline's existing INT splits (quarter/script/hit-clean) re-fit with TWP as the target + INT-luck regression (takeaways over expected mean-revert: DET recovered only 26.3% vs 46.3% league on +6.5 forced fumbles over expected; league INT-over-expected ledger: CLE +7.11, LV +7.74, MIA +6.82, MIN +5.74 unlucky / DAL −5.24, CHI −4.33 lucky).

**Joins:** (qb_id, season-week, situation). FTN `is_interception_worthy` joins to nflverse pbp on (game_id, play_id) at 100% coverage for 2025 (per the metric bible).

**Gap it fills:** pipeline measures raw INT rate; the corpus says raw INT count is the wrong target — TWP is.

**Files:** our-metric-stack · AGENTS-history-main-2026-09-26 · existing pipeline · signal-wiring-catalog (is_interception_worthy) · advanced-matchups (INT-luck ledger)

---

## S4. The run-behavior system (P01-S4)

**What it is:** scramble rate (reactive) vs designed-rush rate (called) — computed separately, EPA'd separately — + heavy-blitz scramble production splits (Allen 5-for-49+TD vs 55.3% blitz template) + QB-sneak conversion + QB-as-ball-carrier speed frequency (Williams 20+ mph archetype) + under-center vs shotgun rushing split (scheme-alignment).

**Joins:** (qb_id, season-week, blitz_flag). Pipeline already separates scramble/designed; the corpus adds the blitz-conditional and EPA-per-type layers.

**Boundary (from competitive-intel):** do NOT build a standalone "QB mobility" family — mobility lives inside rushing EPA. This system is a behavioral decomposition for props/fantasy, not a new team-strength factor.

**Files:** qb-phase2 (scramble ladder) · post-inventory (Allen vs blitz; Williams 20+ mph) · AGENTS-history (Allen +2.4 rush EPA/gm since '99) · 2026-09-29 full-tables (dropback outcomes, QB-sneak 4/4)

---

## S5. Per-QB efficiency → team engine bridge + the form/stability system — merged from P01-S5 + P05-S2.3 + P05-S2.6 + P01-S6

**What it is:** every QB behavioral rate gets a recency model, a stability audit, and a production gate.

- **FORM feature:** BUILD 1's 16-game rolling per-QB EPA/dropback — the single largest measured gain in the corpus (log loss 0.633→0.625, AUC 0.690→0.700 on 3,816 games). The 16-game window is the proven form measure; cross-checked against H=6 half-life, HB-style 83%-prior fading-by-Wk6, DVOA 50/30/20, DAVE 83/98, Marcel 40/30/20/10.
- **Stability audit:** D/S/I (flag D<0.5 or I<0.2 for shrinkage) + split-half + Minerva Seal ≥80 as the production gate + regime-stability check across season phases before any mined tendency enters production.
- **Attribution:** decision quality vs execution quality vs context burden — three separate numbers, never conflated. CPOE is the execution kernel (100-dropback qualifier, graduation bars); Decision IQ is the read-quality number (long-term, NGS-lane, internal-only); QBI drivers are the context number.
- **Uncertainty display rule:** the band-calibration memo is the law — do NOT publish player-specific QB uncertainty bands from the fantasy signal (corr(predicted SD, realized SD) = +0.0636 QB vs +0.63/+0.57 for RB/WR). Profile point estimates are fine; bands = positional prior. Wire the measured z-coverage curve (z=1 → 92.5%) into band display.

**Files:** handoff-indie-builders (BUILD 1, BUILD 5) · AGENTS-history · half-life-and-band-calibration · 0495 · 1184 · 2048 · 1655 · 1540-space-time-von-cramm · GSE_EXPECTED_METRICS · SUNDAY_FRONTIER audit

---

## S6. The engine's measurement stack (P04 syntheses, one system)

**Layer 0 — The metric bible (our-metric-stack).** Everything rests on the filter sieve: REG only, pass/run only, kneels/spikes out (453/82), 4Q WP>0.95/<0.05 garbage out (11.2%), overtime kept, Success = EPA>0, dropback = attempt + scramble. The two baselines (1.867% INT/db, 0.640% fumble-lost/play) are league rates on THIS filtered sample — and they recompute exactly from the lab's CSVs. The most trustworthy layer: deterministic computation on frozen data with exact reproduction.

**Layer 1 — Over-expected grading (GSE_EXPECTED_METRICS).** CPOE/RYOE/xYAC add model-based residuals: fit-on-load logistic/ridge, deterministic, provenance (featureSchemaHash), honesty gates (return null on degenerate input, never guess), pre-registered Pearson graduation bars vs NGS-as-referee (never served). Connective tissue: the "null rather than guess" discipline recurs in the metric bible (unsupported rows NULL with a one-line reason) and the staleness gate.

**Layer 2 — Calibration discipline.** Platt IRLS scaling (held OFF until Murphy RES improves — "Platt is not a PROVEN unlock"), equal-width reliability bins, debiased ECE (max(0, raw−noise) per C-290/C-292), Brier ≤0.22 / ECE ≤0.05 / n≥100 floors, eligibility = 3 consecutive GREEN six-hourly runs. Measurement-complete and honest — it keeps telling the engine it is RED.

**Layer 3 — Production QC (staleness gate).** The 90-minute age bound inside the 12h pre-kickoff window is the first gate that vetoes *publication*, not just grades it. Its own postmortem names the structural gaps: `isPublished` has no provenance column (C-158); personnel/news source (QB changes/injuries) is queued, not built.

**Layer 4 — Validation.** Market-calibration walk-forward (Brier 0.2106, closing line already calibrated, no calibrator beats identity), the 11-slice Wilson-lower-bound falsification screen (zero cleared), Minerva (Seal ≥80 for production entry), D/S/I metric audit. Nearly every brief carries a numeric acceptance gate.

**The honest shape of the system:** Layers 0–1 measure the game well. Layers 2–4 measure the engine well — and consistently report failure (Brier 0.247–0.275 vs 0.22; CLV 23–41% vs 52.4%; AUC 0.4965; inverted confidence). The stack's real product is *calibrated awareness of miscalibration*: it suppresses what it cannot defend (sack props NULLed, QB-specific bands suppressed, PASS picks unpublished). The missing piece is the forward direction — gates veto and measure, but nothing shows a gate *fixing* the model (v5.3.0 book-path rebuild is the attempt in flight).

**Files:** our-metric-stack.md · math/GSE_EXPECTED_METRICS.md · intelligence/LEVERAGE_STATUS.md · signal-staleness-gate.md · ops/CHAOS_CAMPAIGN_2026-09-04.md · ops/HERMES_NIGHT_LOG_2026-09-04.md · ops/calibration/2026-08-19-l9-clv-slices/RESULTS.md

---

## S7. Playcaller fingerprint stack — DUPLICATES sister pipeline; route through it, don't rebuild (P02-S1)

The corpus recipe (qb-phase2-style: first-read/scramble/pressure splits × playcalling rates; motion/PA/RPO/no-huddle team rates; playcaller ratings as coaching priors) is exactly what `code/compute_tendencies.py` + `coach_offense.csv` + per-coach YoY profiles already compute from nflverse. Briefs that would re-derive it: 0007 (next-play embeddings), 2026_09_18_parallel_build_plan (dropback/rush efficiency split + garbage-time filter), gse_expected_metrics (shotgun/noHuddle/down-distance one-hots).

**Joins:** `coach_offense.csv` (coach, season) ↔ `off_tendencies.csv` (team, season) via `coach_tenures.py`. Any new fingerprint work belongs as columns on this join, not a parallel table.

**Files:** qb-phase2.md · 2026-09-18-parallel-build-plan.md · GSE_EXPECTED_METRICS · coaching-tendencies/profiles/

---

## S8. DC tendency profiles + coverage matchup grades (P02-S3 + P02-S6) — EXTENDS sister pipeline

The sister pipeline computes only pressure-outcome proxies (`pressure_proxy` = (sacks+qb_hits)/dropbacks) and explicitly warns a Fangio 4-man-rush team and a Joseph blitz-heavy team can post similar proxies for different reasons. The extension path: Sheppard's 55.3% blitz game as NGS-sourced blitz-rate seed data; briefs 0324 (CDHMM coverage-role inference from NGS tracking), 0415 (frequency/efficiency CB decomposition), 0586 (latent coverage-shell archetypes) as the machinery for real man/zone/shell rates. Join key: (coach, team, season, week) onto `def_tendencies.csv`.

0415 (frequency/efficiency defender split, route-conditioned) + 0324 (CDHMM label-free coverage-role taxonomy) + 0586 (latent DB-alignment archetypes) compose into the GSE coverage-grade family the advanced-matchups brief nominates (zone/gap scheme-vs-defense mismatch table + DC-tendency deltas). NGS-internal-only per the 2026-09-28 doctrine — reasoning fuel, never public.

**Files:** reader-03/0324 brief · reader-04/0415 brief (+ reader-09/0415) · reader-13/0586 brief · sister DATA_GAPS.md · post-inventory-2026-09-21.md

---

## S9. Coordinator-change causal estimation (P02-S4) — EXTENDS; 2026 coach changes are live target data

The 2026 changes (McDaniel/LAC, Stefanski/ATL, Doyle/BAL, PHI OC) as treatment events + the 0771 ℓ₁-TCL method (borrow nuisance models from 2018–2025 source seasons, ℓ₁ bias-correct on post-change target games, DR plug-in for ACE on EPA/play) + the RCD 1965 quarantine (flag scheme-change-confounded indicator pairs as bi-directed so they don't double-count). Feature output: `coach_change_ace_epa` per (team, change-event, weeks-since) — a coaching-prior adjustment to team-strength ratings.

**Load-bearing assumptions:** ℓ₁-TCL's sparse-difference assumption — run the pre-flight support-overlap diagnostic per use case; if dense, report target-only with wide uncertainty (the ledger's own REJECT path). RCD's fragility (likely all-bi-directed graphs, α_I heuristics, near-Gaussian indicators failing Shapiro–Wilk) bounds the quarantine — gate it on the ledger's own criteria (bootstrap Jaccard ≥ 0.5, ≥3/5 hand-labeled known-confounded pairs flagged) before production.

**Files:** reader-08/0771 brief · arxiv-deep/0771-transfer-learning-for-causal-effect-estimation.md · reader-17/1965 brief · arxiv-deep/1965-rcd-latent-confounders-lingam.md · rb-dfnerd-reddit-nflcom.md

---

## S10. Regime-switching coaching states (P02-S5) — EXTENDS (sister pipeline is static rates only)

Brief 0596 (Bayesian HSMM): model how long a team stays in pass-heavy/up-tempo/conservative regimes as a function of score differential, clock, timeouts — directly computable from nflverse play sequences, no NGS needed. Feature: `expected_regime_duration` and `regime_transition_prob` per (coach, season, game-state) — a live-model input and a coaching-tendency profile dimension the static YoY tables lack. Joins to `coach_offense.csv` on (coach, season).

**Files:** reader-13/0596 brief

---

## S11. Pre-snap world-model embeddings, bounded (P02-S7)

0007's NFL port (next-play run/pass over serialized nflverse tokens, embeddings consumed by the calibrated stack) is the representation learner sitting underneath S7–S10. Keep the ledger's gate verbatim: adopt only if ≥0.02 log-loss beat over a (down, distance, yardline, score, time, timeouts) logistic baseline with ECE ≤ 0.03 and an ablation showing history carries the gain — else "expensive theater over a Markov state." Never serve raw probabilities (paper's missing calibration is GSE's mandatory one).

**Files:** reader-01/0007 brief · arxiv-deep/0007-neural-sabermetrics-world-model.md

---

## S12. GSE Tri-Layer Ratings (P03 synthesis 1) — INFERENCE, none of the papers propose this

1449 (LS cardinal LSE with N⁺ standard errors, λ₂ connectivity diagnostic, home-covariate gate) + 0425 (OpenSkill Plackett-Luce as the fast weekly update engine, σ as uncertainty feature) + 0495 (hierarchical Bayesian log5 for unit-vs-unit matchups: QB vs defense, OL vs DL, per-matchup-type learned decay). Each layer answers a question the others can't — LS gives identifiability theory and honest SEs, OpenSkill gives production runtime, log5 gives matchup decomposition. The λ₂ diagnostic gates when early-season ratings are trustworthy; the Thm-4.3 home-covariate check is non-negotiable given the NFL schedule.

**Files:** reader-12/1449 brief · reader-04/0425 brief · reader-cleanup/0495 brief

---

## S13. Full-Distribution Calibration Stack (P03 synthesis 3) — INFERENCE

1074 (ENIR binary calibration, ≥15% ECE reduction gate) + 1642 (SPCI residual-QRF intervals, ≤85% of EnbPI width at ±2pp coverage) + 0675 (Bayesian in-game WP with (τ,ω) regime parameters). Point probs → calibrated probs → conditional intervals → in-game updating: one pipeline from pre-game to whistle.

**Files:** reader-19/1074 brief · reader-28/1642 brief · 0675 brief

---

## S14. The Robust Payout Machine (P03 synthesis 4 + P04 Layer 4) — INFERENCE

Selection → calibration → sizing → filtering, all dollar-denominated: 0435 (pay-out-by-market-class selection doctrine — report correct-pick breakdown by favorite/underdog/pick'em + flat-stake pay-out; select on expected pay-out not accuracy) + 0445 Phase A (market-calibration recipe: fit team strengths to The Odds API consensus via eq.-13 analog, totals market fixes identifiability) + 1214/0626 (distributionally-robust / uncertainty-aware Kelly sizing) + 0445 Phase C (EV-threshold plot as the pick-filter diagnostic; reject profitability claims on <300 games or without the stale-price control) + the market-calibration study's Wilson-lower-bound falsification screen as the standing CI gate (the only acceptance test in the corpus that has ever killed claims at scale — 11/11 slices failed).

**Files:** reader-04/0435 brief · reader-04/0445 brief · reader-23/1214 brief · 0626 brief · ops/CHAOS_CAMPAIGN_2026-09-04.md

---

## S15. The Conditional-Prop Engine (P03 synthesis 5) — INFERENCE

Props get their own pipeline with prop-specific features, not game-model leftovers: 0912 (receiver-conditional decomposition — train target-distribution and conditional models, marginalize at inference) + 0858 (beat-writer text embeddings stacked with engine + market probs; gate on reproducing the ≥7pp text-ablation drop) + 1815 (fractional tackles as the reliable IDP/tackle-prop feature: split-half 0.69 vs 0.59) + 1563 (age-conditioned rest effects via X-learner + honest-RF). Quantile per-market pipeline (BUILD 3: per-market model bakeoff {ridge, elastic-net, HGB, Poisson, RF}, q10–q90 quantiles, 20k sims with Dirichlet touch-shares, over-shade correction) sits in the same lane.

**Files:** reader-17/0912 brief · reader-17/0858 brief · 1815 brief · 1563 brief · handoff-indie-builders-v2-fullspec-2026-09-25.md (BUILD 3)

---

## S16. Disciplined Post/Bet Gate (P03 synthesis 6) — INFERENCE

The operational answer to "how many picks do we post each week": 1154 (exact-coverage abstention — calibrate τ̂_c as the empirical c-quantile of engine edge on a rolling window, post only risk < τ̂_c; adaptive c_w per slate quality) + 0445 EV-threshold diagnostic + 0435 confidence-threshold doctrine. A fixed coverage target with exact calibration, not vibes.

**Files:** reader-21/1154 brief · reader-04/0445 brief · reader-04/0435 brief

---

## S17. Situational/matchup layer + red-zone tendency priors (P05-S2.4 + P05-S2.5)

**Situational features:** defensive tendencies (base/press/blitz %, men in box — league avg 31.4/35.2/31.3/6.95), motion-at-snap pass EPA allowed (PIT −0.85 … CLE +0.66), DC-tendency deltas (PIT 96.2% zone despite aggressive brand; GB blitz spike 48.4% W1 vs 26.3% in 2025; MIN blitz solved in-game 83%→63%), zone/gap scheme mismatches (Bijan 57% zone vs CAR 124.9), coverage-shell splits. Join as team-level priors for matchup adjustment; man/zone EPA splits per QB stay queued (NGS/charting gap — NGS internal-only doctrine; FTN charting has coverage fields).

**Red-zone priors:** goal-line rush-share monopolies (Taylor 100% inside-10/inside-5, Henry 85.7% inside-5, Javonte 100% inside-10), RZ receiving leaders, RZ share (Likely 57.1%, Andrews 25%) — join as red-zone tendency priors for the TD-decomposition head and game-total pricing.

**Files:** research/2026-09-19-dk-week2/deep/advanced-matchups-deep-dive-2026-09-19.md · post-inventory-2026-09-21.md · 2026-09-29 full-tables

---

## S18. Competitive-intel ingestion discipline (P05-C3.6) — verified working posture

`reasoning/competitive-intel-intake-2026-09-26.md` demonstrates the correct posture and it's already practiced: opponent-adjusted EPA residual method adopted (80/40-attempt shrinkage, 55/15/15/10/5 blend), duplicate CPOE/EPA/OL/scheme pastes *rejected*, non-commercial data (Big Data Bowl, SiriusXM audio, NGS summaries >0.15 weight) kept research-only. Every competitive method rebuild (HB grades, StatRankings TPRR/first-read, PFF pressure-to-sack) must follow this rule: rebuild the *method* from cleared data, never paste the *numbers*.

**Files:** reasoning/competitive-intel-intake-2026-09-26.md

---

*18 consolidated syntheses. Merge map: P01-S1 + P05-S2.2 + P02-S2 → S1; P01-S2 + P05-S2.1 → S2; P01-S5 + P05-S2.3 + P05-S2.6 + P01-S6 → S5; P02-S3 + P02-S6 → S8; P05-S2.4 + P05-S2.5 → S17; P03-2 (Minerva) folded into S5 (gates) and buildable-systems; all others carried over singly.*
