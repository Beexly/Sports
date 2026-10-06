# c01 Partition 02 — COACHING / SCHEME Deep Brief

**Partition:** 39 briefs genuinely tagged COACHING or SCHEME (`^- COACHING:` / `^- SCHEME:` lines; the raw grep of the header text matched all 359, so this partition uses actual tag usage only).
**Sister pipeline:** `~/workspace/coaching-tendencies/` — computes nflverse play-by-play offensive/defensive team-season tendency fingerprints (2022–2026), coach-attributed rows (`coach_offense.csv`, `coach_tenures.py`), YoY profiles (monken, mccarthy, shanahan, mcvay, fangio, joseph). DATA_GAPS.md honestly documents what nflverse lacks: personnel groupings, motion rate, blitz rate, man/zone coverage, shell usage, time-to-throw (quick-game proxied via air_yards).
**Source root for spot checks:** `~/workspace/vendor/Sports/docs/` (read-only). Brief paths here are under `~/workspace/corpus-intelligence/briefs/c01/`.

---

## 1. Verified claims

| Claim | Source file | Confidence | Verification note |
|---|---|---|---|
| Monken quick-game shift: quick_game_rate 0.476 (2023 BAL) → 0.518 (2025 BAL) → **0.639** (2026 CLE); avg_air_yards **8.33 → 6.12** (−2.21); deep_rate halved 0.120 → 0.060 (league 0.118) | `~/workspace/coaching-tendencies/profiles/monken.md` (data: `coach_offense.csv`, nflverse pbp) | **med** | Numbers match the profile's YoY table exactly. BUT: 2026 CLE n=164 plays (~3 games; SE on 0.639 ≈ ±3.8pp, 95% CI ±7.4pp — still above league 0.508); "presumed playcaller" attribution caveat in profile; **QB confound unmeasured** — 2023–25 BAL was Lamar Jackson, 2026 CLE is Deshaun Watson (see §3). |
| Pressure-to-sack conversion KILLED: "conversion luck explains under half a percent of outcome variance" — do not model conversion rate as skill | `docs/architecture/2026-09-18-parallel-build-plan.md:389` | **med** | Verbatim in the KILLED table. The file asserts the measurement ("Measured") but the variance-decomposition itself is not shown in the file — take the claim as the plan's recorded finding, not as independently auditable from this file. Directly tensions the sweep-2026-09-21 trait claim (see §3). |
| DC Kelvin Sheppard blitzed Josh Allen on **55.3%** of dropbacks in Week 2 — highest rate of his tenure | `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md:47` | **high** | Verbatim NGS post text. Single-game sample vs a scrambling QB — not a season tendency. |
| Shanahan 49ers motion-at-snap **65.6%** vs Rams — highest game of his era (since 2017); Juszczyk motion on 17/33 snaps | `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md:133` | **high** | Verbatim NGS post text. Single-game record. Sister pipeline CANNOT compute motion rate (DATA_GAPS #2) — this is extension-only. |
| Gibbs: 55.3% of Lions' team air yards (first half, Week 2); 24 carries on motion plays for 131 yds, 2 TD, 6 explosive runs (Week 1, career high) | `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md:52,112` | **high** (text) | Verbatim. Note n<30: "55.3% of team air yards" is one half of football; the motion carries are one game. Brief's "24 of 29" gloss: post text says 24 motion carries (131 yds), graphic stat box says 29 carries / 156 yds total — consistent with 24-of-29. |
| Myles Garrett: NFL single-season sack record 23 (2025) despite league-high **139 chip blocks**; 83 sacks / 218 quick pressures over last five seasons (most in NFL) | `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md:183` | **high** | Verbatim NGS commentary on @RapSheet trade report. |
| Trey Hendrickson: all 8 pressures across **21 matchups** vs Colts LT Bernhard Raimann; Ravens 58.6% pressure with him on field vs 20.0% without | `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md:103` | **high** | Verbatim NGS post text. Template for OL-vs-DL matchup attribution. |
| Neural sabermetrics world model: 64% next-pitch / 78% swing accuracy, but **+0.004 marginal gain** over a 2018 baseline — ledger verdict ADAPT the paradigm as a small feature learner, never the 3B model | `docs/arxiv-program/research/2026-09-21/arxiv-deep/0007-neural-sabermetrics-world-model.md:53,60,87-88` | **high** | Brief matches the source ledger exactly, including the paper's own flagged weaknesses (no calibration, tokenization opacity, segmentation). |
| ℓ₁-TCL transfer learning: semi-synthetic acceptance gate **≤0.7× target-only error**; "never naively merge domains" (merged estimator got the answer *worse*) | `docs/arxiv-program/research/2026-09-21/arxiv-deep/0771-transfer-learning-for-causal-effect-estimation.md:56,58` | **high** | Gates and the merge-warning match the source ledger §§12–13 exactly. Code is public (github.com/SongWei-GT/L1-TCL). |
| RCD causal discovery: GSS real data — bi-directed 4 est / 4 correct (precision 1.0); directed 5 est / 4 correct (0.8); paper's own warning that real graphs "likely" end up all-bi-directed and α_I tuning is fragile | `docs/arxiv-program/research/2026-09-21/arxiv-deep/1965-rcd-latent-confounders-lingam.md:38,44` | **high** | Brief matches the source ledger, caveats included. The "≥60% bootstrap quarantine" rule is a **ledger proposal** (not a paper result) — marked INFERENCE in the brief. |
| Latent style allocation (serve→return, tennis): ELPD gains **+2.8%** (1st serve) / **+3.5%** (2nd serve) vs mixed-membership baseline; NFL port gate: replicate 2–4% ELPD + ≥1% completion-prob log-loss improvement on 2024 NGS holdout | `docs/arxiv-program/research/2026-09-21/arxiv-deep/0586-a-statistical-model-of-serve-return.md:30-31,54` | **high** | Numbers match the source ledger §§7,12. Limitation carried: styles are descriptive only until attached to outcomes — the port spec does this via P(completion\|style,coverage). |
| TacticAI: pre-snap 22-node graph (GATv2) + mirror-across-axis augmentation that **doubles goal-line/red-zone samples**; ledger gate ≥5% holdout log-loss over tabular baseline | `docs/arxiv-program/research/2026-09-21/arxiv-deep/0912-tacticai-ai-assistant-football-tactics.md:62,69` | **med** | Matches source ledger §§11,13. The ≥5% gate and mirror claim are the ledger's (faithful to the paper's geometry, per source). |
| CB frequency/efficiency decomposition: adopt iff half-to-half r ≥ 0.35 on 2023–2024 CBs AND out-of-sample EPA/target R² ≥ +0.02 over passer-rating-allowed | `docs/arxiv-program/research/2026-09-21/arxiv-deep/0415-characterizing-the-spatial-structure-of-defensive.md:68` | **med** | Pre-registered gates from the ledger; paper confound (team scheme funneling) acknowledged — NFL port must add team-scheme random effects + route-type conditioning. |
| 2026 playcaller changes (coach-change signal): Mike McDaniel → LAC OC, Kevin Stefanski → ATL HC, Declan Doyle → BAL OC, new PHI OC (expanded Saquon receiver role) | `docs/dfs/research/2026-09-13/raw/rb-dfnerd-reddit-nflcom.md` | **med** | Verified in file (Hampton/Saquon/Henry/Bijan rows). Caveat: researcher-compiled via web search after assigned sources failed; the file itself flags outlet inconsistencies (e.g., Gibbs salary conflict). Treat as a signal nomination, not a verified personnel feed. |

**Not-verified / dropped:** the sweep brief's age-curve peaks (RB 24.53 / WR 25.33 / QB 26.67) appear in `sweep-2026-09-21.md:21` with no method or source in the file — confidence low, do not build on until sourced.

---

## 2. Syntheses

**S1. Playcaller fingerprint stack → DUPLICATES sister pipeline; route through it, don't rebuild.**
The corpus recipe (qb-phase2-style: first-read/scramble/pressure splits × playcalling rates; motion/PA/RPO/no-huddle team rates; playcaller ratings as coaching priors) is exactly what `code/compute_tendencies.py` + `coach_offense.csv` + per-coach YoY profiles already compute from nflverse. Briefs in this partition that would re-derive it: 0007 (next-play embeddings), 2026_09_18_parallel_build_plan (dropback/rush efficiency split + garbage-time filter), gse_expected_metrics (shotgun/noHuddle/down-distance one-hots). **Joins:** `coach_offense.csv` (coach, season) ↔ `off_tendencies.csv` (team, season) via `coach_tenures.py`. Any new fingerprint work belongs as columns on this join, not a parallel table.

**S2. Quick-game adjustment ladder → the Monken case as the template for a general pressure-answer metric.**
Composes: (a) Monken's quick_game_rate +2.21 air-yard compression as the OC-fingerprint observable (sister pipeline); (b) sweep-2026-09-21's **<2.5s quick-pressure split** separating coverage sacks from true rush wins (NGS lane); (c) pressure-to-sack as QB-level attribution (sweep) — NOT as a skill (build-plan KILL, §3). Buildable feature: `pressure_answer_delta` = Δquick_game_rate for a team in the 3 games after facing top-5 pass-rush vs baseline — a coach-adaptation feature the sister pipeline's static rates don't capture. Files: `coaching-tendencies/profiles/monken.md` + `docs/arxiv-program/research/2026-09-21/sweep-2026-09-21.md` + `docs/architecture/2026-09-18-parallel-build-plan.md`.

**S3. DC tendency profiles → EXTENDS sister pipeline (fills DATA_GAPS #3–#5).**
The sister pipeline computes only pressure-outcome proxies (`pressure_proxy` = (sacks+qb_hits)/dropbacks) and explicitly warns a Fangio 4-man-rush team and a Joseph blitz-heavy team can post similar proxies for different reasons. This partition supplies the extension path: Sheppard's 55.3% blitz game as an NGS-sourced blitz-rate observation; briefs 0324 (CDHMM coverage-role inference from NGS tracking), 0415 (frequency/efficiency CB decomposition), 0586 (coverage-shell archetypes) as the machinery for real man/zone/shell rates. Join key: (coach, team, season, week) onto `def_tendencies.csv`. Nothing in the sister pipeline currently does this — pure extension.

**S4. Coordinator-change causal estimation → EXTENDS; the 2026 coach changes are live target data.**
Composes: the rb_dfnerd 2026 changes (McDaniel, Stefanski, Doyle, PHI OC) as treatment events + the 0771 ℓ₁-TCL method (borrow nuisance models from 2018–2025 source seasons, ℓ₁ bias-correct on the post-change target games, DR plug-in for ACE on EPA/play) + the RCD 1965 quarantine (flag scheme-change-confounded indicator pairs as bi-directed so they don't double-count). This is a capability the repo map shows as missing (no cross-domain causal recipe; causal forests 0769 only). Feature output: `coach_change_ace_epa` per (team, change-event, weeks-since) — a coaching-prior adjustment to team-strength ratings.

**S5. Regime-switching coaching states → EXTENDS (sister pipeline is static rates only).**
Brief 0596 (Bayesian HSMM): model how long a team stays in pass-heavy/up-tempo/conservative regimes as a function of score differential, clock, timeouts — directly computable from nflverse play sequences, no NGS needed. Feature: `expected_regime_duration` and `regime_transition_prob` per (coach, season, game-state) — a live-model input and a coaching-tendency profile dimension the static YoY tables lack. Joins to `coach_offense.csv` on (coach, season).

**S6. Coverage matchup-grade foundation → EXTENDS; the L3 chain's missing defensive half.**
0415 (frequency/efficiency defender split, route-conditioned) + 0324 (CDHMM label-free coverage-role taxonomy from NGS) + 0586 (latent DB-alignment archetypes) compose into the GSE coverage-grade family the advanced-matchups brief nominates (zone/gap scheme-vs-defense mismatch table + DC-tendency deltas). NGS-internal-only per the 2026-09-28 doctrine — reasoning fuel, never public. No overlap with sister pipeline (it has no defensive-scheme content beyond pressure proxies).

**S7. Pre-snap world-model embeddings → bounded ADOPT with a hard gate.**
0007's NFL port (next-play run/pass over serialized nflverse tokens, embeddings consumed by the calibrated stack) is the representation learner sitting underneath S1–S6. The ledger's own gate is the right one and should be kept verbatim: adopt only if ≥0.02 log-loss beat over a (down, distance, yardline, score, time, timeouts) logistic baseline with ECE ≤ 0.03 and an ablation showing history carries the gain — else it's "expensive theater over a Markov state." Never serve raw probabilities (paper's missing calibration is GSE's mandatory one).

---

## 3. Challenges

**C1. Pressure-to-sack: the build plan's KILL has the stronger evidence.**
- Side A (KILL): `parallel-build-plan.md:389` — conversion luck explains <0.5% of outcome variance; don't model conversion rate as skill. File marks this "Measured."
- Side B (trait): `sweep-2026-09-21.md:22` — pressure-to-sack rate as a QB-trait input for sack/pressure projections (Young as YoY-movement archetype); the c01 map adds the metric-bible R²<0.005 veto at the level tested.
- **Verdict: Side A wins on the evidence in front of me.** The veto and the KILL are variance-level statements about predictive contribution; the trait claim is an input nomination with no measured gain. INFERENCE — both can be true at different levels: keep the <2.5s split for *attribution* (coverage sacks vs true rush wins) and QB-behavioral description, but do not model conversion rate as a *predictive skill*. Any engine use of per-QB pressure-to-sack must clear a measured variance gate first.

**C2. The Monken case study — the strongest challenge is the QB confound, not the sample size.**
- The numbers are verified (0.639 quick_game_rate, 8.33→6.12 air yards, deep_rate 0.120→0.060 on the profile's YoY table).
- Sample: 2026 CLE n=164 plays. SE(0.639) ≈ sqrt(0.639·0.361/164) ≈ 3.8pp — the 95% CI (≈0.564–0.714) still clears the 2026 league average 0.508. Small sample does not kill the claim.
- **The real threat:** 2023–25 BAL QB was Lamar Jackson; 2026 CLE QB is Deshaun Watson. The profile itself says "the coordinator got a new roster and a new mandate" — but quick-game rate and air yards are co-determined by the QB's release profile and mobility. No decomposition (playcaller vs QB vs scheme) exists in the file. Also "presumed playcaller" (first HC job) means the fingerprint may blend Monken with his OC. Treat the +0.162 as a team-season fingerprint, not a pure playcaller effect, until a QB-fixed comparison (e.g., same QB under different playcallers, or playcaller-fixed across QBs) is computed. Corroboration the profile does carry: the shift began in BAL 2025 (+0.042 within-team), directionally consistent before the team switch.

**C3. NGS single-game extremes are not tendencies (all n<30 or single-game).**
Sheppard 55.3% (one game vs Allen), Shanahan 65.6% (one game), Gibbs 55.3% of team air yards (one half). These are observations, not rates. Any coaching-tendency feature built from them must aggregate multi-game with shrinkage (partial pooling — the 0586 brief's own small-sample doctrine: shrink low-sample players toward the shared simplex rather than fabricating individual styles).

**C4. PattonAnalytics' Y-Aware PCA play-caller tendency rating is unusable as a feature.**
`AGENTS-history-main-2026-09-26.md:3934` records the ranking (Shanahan top … Slowik bottom) but notes: no numeric values on bars, methodology incomplete ("working through a few kinks"), concept critique in-thread. Directional color only — cannot be a numeric coaching prior.

**C5. RCD's own fragility warning bounds S4's quarantine.**
The 1965 ledger §9: RCD "likely produces a causal graph where each pair is connected with a bi-directed arrow" in complex real structures, α_I tuning (0.1^k sweep) is a fragile heuristic, near-Gaussian indicators (EPA/play over large samples) may fail the Shapiro–Wilk gate and yield no directions at all. The quarantine layer is a proposal with adversarial notes, not a proven NFL method — gate it on the ledger's own acceptance criteria (bootstrap Jaccard ≥ 0.5, ≥3/5 hand-labeled known-confounded pairs flagged) before any production use.

**C6. ℓ₁-TCL's sparse-difference assumption is load-bearing.**
The 0771 ledger §9: if source–target mechanisms differ densely, there's no free lunch; the real-data ACE CI covered zero (sign recovery, not significance); NN nuisance tuning needed a custom SMD score. The 2026 coach-change application must run the pre-flight support-overlap diagnostic per use case — if dense, report target-only with wide uncertainty (the ledger's own REJECT path).

**C7. Nothing in this partition contradicts the Monken case study directly** — no brief disputes the 0.639 / 8.33→6.12 numbers. The challenges are compositional (C2's QB confound, C3's sample discipline), not contradictory.

---

## 4. Buildable systems (ranked)

**B1. Coordinator-change causal estimator (ℓ₁-TCL) — highest value, fills a mapped gap.**
- Computation: for each 2026 playcaller change (McDaniel/LAC, Stefanski/ATL, Doyle/BAL, PHI OC): fit propensity + outcome nuisance GLMs on 2018–2025 source seasons → ℓ₁ bias-correct the source–target difference on post-change target games → DR plug-in for ACE on EPA/play; 3-headed TARNet + DR variant per the IHDP winner.
- Inputs: nflverse team-week EPA/play, change indicator, covariates; public code github.com/SongWei-GT/L1-TCL.
- Formula: β̂_t = argmin_b (1/n)Σᵢ[−zᵢxᵢᵀb + G(xᵢᵀb)] + λ_PS‖b − β̂_s‖₁ (paper Eq., ledger §3); then IPW/OR/DR plug-in for ACE.
- Gates: pre-flight support-overlap diagnostic (sparse difference required); semi-synthetic ≤0.7× target-only error; else REJECT and report target-only.
- File refs: brief `reader-08/0771_transfer_learning_for_causal_effect_estimation.brief.md`; source `docs/arxiv-program/research/2026-09-21/arxiv-deep/0771-transfer-learning-for-causal-effect-estimation.md`.

**B2. Blitz-rate / man-zone / shell ingestion (fills DATA_GAPS #2–5) — the defensive half of coaching tendencies.**
- Computation: weekly team blitz_rate = blitz_dropbacks/dropbacks; man_zone_pct; shell (1-high/2-high) share; joined to `coach_offense.csv`-style DC rows on (coach, team, season, week).
- Inputs: NGS tracking-derived blitz indicators or PFF/SIS charting (nflverse cannot supply this — documented gap).
- Formula: blitz_rate_t = Σ blitz_indicator / Σ dropbacks; shrink via partial pooling toward league prior for low-n weeks (0586 doctrine).
- File refs: briefs `reader-03/0324_...brief.md`, `reader-04/0415_...brief.md`, `reader-13/0586_...brief.md`; sister `DATA_GAPS.md`; NGS observations in `post-inventory-2026-09-21.md` as seed data (Sheppard 55.3%).

**B3. Pressure-answer adaptation feature (the Monken template generalized).**
- Computation: for each team-week, Δquick_game_rate = rate in games following a top-5 pass-rush opponent − season baseline; paired with the <2.5s quick-pressure split to separate coverage sacks from true rush wins.
- Inputs: sister pipeline's quick_game_rate (already computed), NGS time-to-pressure splits when available.
- Formula: answer_delta_w = quick_game_rate_w − mean(quick_game_rate_season); interact with opp_pressure_rate.
- Do NOT model conversion rate as skill (C1 / build-plan KILL).
- File refs: `~/workspace/coaching-tendencies/profiles/monken.md`; `docs/arxiv-program/research/2026-09-21/sweep-2026-09-21.md`; `docs/architecture/2026-09-18-parallel-build-plan.md`.

**B4. HSMM regime-duration coaching profiles (0596).**
- Computation: fit hidden semi-Markov model on play sequences; states = pass-heavy/up-tempo/conservative regimes; covariates (score differential, clock, timeouts) drive regime duration; output per (coach, season) expected durations + transition probabilities.
- Inputs: nflverse play-by-play 2015–2025 — no NGS needed.
- Formula: per brief — duration-covariate effects on regime sojourn times (paper's Bayesian HSMM; subsampling-within-MCMC for autocorrelated series).
- File refs: brief `reader-13/0596_a_bayesian_hidden_semimarkov_model_with.brief.md`.

**B5. CB frequency/efficiency coverage grades (0415).**
- Computation: HMM defender–receiver assignment on NGS tracking (zone-responsibility variant); NMF field discretization from target-location intensity; multinomial (frequency) + logistic (efficiency) models; team-scheme random effects + route-type conditioning.
- Inputs: NGS tracking, nflverse targets; CBs ≥300 coverage snaps.
- Gates: half-to-half r ≥ 0.35 per component; +0.02 out-of-sample EPA/target R² over passer-rating-allowed — else REJECT.
- File refs: briefs `reader-04/0415_...brief.md` and `reader-09/0415_...brief.md`; source ledger §13.

**B6. Latent coverage/route style archetypes (0586 port).**
- Computation: Stan latent style allocation (K,M ∈ {2…8} grid, ELPD selection) on NGS catch-point locations / DB pre-snap alignments; covariates = down/distance bucket, formation, man/zone indicator; attach styles to outcomes via P(completion|style,coverage).
- Gates: replicate 2–4% ELPD gain; Δ completion log-loss ≥ 1% on 2024 holdout.
- File refs: brief `reader-13/0586_...brief.md`; source ledger §§11–13.

**B7. RCD quarantine layer for the indicator panel (1965).**
- Computation: run RCD on ~380 team-seasons × ~35 indicators (Shapiro–Wilk pre-screen); bi-directed-in-≥60%-of-bootstraps pairs quarantined: not used as causes in narrative content, at most one enters the prediction stack; feed NOTEARS as masked-W hard constraints.
- Gates: bi-directed bootstrap Jaccard ≥ 0.5; ≥15% directed edges removed with Brier parity on 2024–2025; ≥3/5 hand-labeled known-confounded pairs flagged — else REJECT (C5).
- File refs: brief `reader-17/1965_rcd_latent_confounders_lingam.brief.md`; source ledger §§11–13.

**B8. Next-play world-model embeddings (0007), bounded.**
- Computation: small transformer/state-space model over binned nflverse event tokens; next-play run/pass log-loss + ECE vs logistic baseline; serve only embeddings as features, never raw probabilities.
- Gates: ≥0.02 log-loss beat; ECE ≤ 0.03; history-ablation shows the gain — else REJECT as "expensive theater."
- File refs: brief `reader-01/0007_neural_sabermetrics_world_model.brief.md`; source ledger §§12–13.

**B9. DO NOT REBUILD: playcaller YoY fingerprint tables.**
nflverse situation-conditioned rates + YoY deltas are live in the sister pipeline (`compute_tendencies.py`, `coach_offense.csv`, profiles). Any new fingerprint column goes on that join. Verified read-only; no duplication.

**B10. Kairosis-weighted-median probability aggregator (0793).**
- Computation: weighted-median aggregation over the engine's daily probability stream per game (and prediction-market price histories), gated on positive skill vs uniform-median on Brier/log-loss across historical picks.
- Note: authors flag only one regime break is effectively handled — chained news cycles are a known limitation.
- File refs: brief `reader-08/0793_kairosis_change_point_aggregation.brief.md`.
