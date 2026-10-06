# LANE 01 — NFL Prediction Notebooks (Kaggle Destroy Mission)

**Date:** 2026-10-06 · **Lane:** NFL win probability, spread/total modeling, player props, NFL feature engineering
**Evaluator:** z-ai/glm-5.3-flash via OpenRouter (all verdicts below are GLM-produced or GLM-adversarially-reviewed)
**Field agent:** subagent hunt (12 notebooks found, metadata + GitHub mirrors)

## How this was verified (read first)

- Kaggle renders notebook **code** only for logged-in users. Anonymous fetches return metadata only (title, author, description, runtime, inputs). No account was created, no downloads made.
- 7 of 12 notebooks had GitHub mirrors or author write-ups — method detail extracted from those.
- The top 5 notebooks got a second-pass **adversarial review by GLM** (challenge: confirm or overturn each ADAPT). The adversarial pass overturned 3 of 5 — the pattern it caught: the first pass "adapted on concept name rather than on whether the information source survives the production downgrade."
- Notebooks 6–12 carry first-pass verdicts only (no adversarial review) — flagged as such.

---

## RANKED EVALUATIONS

### 1. Swarm Score: Quantifying Rallying to the Football — ADOPT (conditional)
- **Author:** Kevin Baer · **URL:** https://www.kaggle.com/kevinbaer/swarm-score-quantifying-rallying-to-the-football · Mirror: https://github.com/kevbaer/SwarmScoreBDB2024 · BDB 2024
- **METHOD:** Each frame, every defender gets a bivariate-normal spatial-influence PDF (position + velocity → reachable region); ball carrier gets its own influence model. Swarm Score = how many defenders' influence regions "swarm" the carrier. Aggregated to team/player scores.
- **MATH:** Defender influence ~ N₂(μ = f(position, velocity, direction), Σ); count defenders exceeding a swarm threshold vs. the carrier's reachable set. Validated by regressing future YAC allowed on Swarm Score vs. prior YAC allowed — Swarm wins (more stable, more predictive).
- **DATA:** BDB 2024 tracking (2022 season, 10Hz).
- **GSE APPLICATION:** Template for *stable* defensive features — current EPA-based team-strength features are noisy early-season; a tracking-derived defensive-swarm quality is a second, independent defensive signal. The validation method itself (regress future metric on candidate vs. naive prior) is the test every GSE candidate feature should pass. Module: `gse/features/defense_swarm.py` → rolling defensive-swarm rating as a feature column alongside EPA/play.
- **ADVERSARIAL NOTE (GLM):** Downgraded from ADAPT to conditional ADOPT. The future-YAC regression is honest in target but likely contaminated in predictor era (scheme/coverage-genre shifts inflate the swarm-vs-prior gap as both move with the modern box-heavy meta). A per-frame 22-player spatial PDF is computable only with tracking data on a lag — deployable as a weekly-refreshed pipeline, not an inline feature. **Requirement before weighting:** era-stratified validation.
- **LEAKAGE:** No (descriptive per-play; forward-looking predictive test).
- **TRANSFER:** NFL run/screen defense; the bivariate-influence + stability-vs-prior validation method transfers anywhere tracking exists.

### 2. The Components of a Tackle: A Physics-Driven Study — ADAPT (confirmed)
- **Authors:** Steven Patton, Joseph Armstrong, Bruno Mioto · **URL:** https://www.kaggle.com/code/stevenpatton97/the-components-of-a-tackle-a-physics-driven-study · BDB 2024
- **METHOD:** (a) XGBoost predicts per-tackle-opportunity tackle probability from physics parameters → "Tackles Over Predicted" player metric; (b) ball-carrier avoidance via field-control + dynamic time-window + optimal-path deviation; (c) Random Forest predicts expected yards → "Yards Over Expected" residuals.
- **MATH:** P(tackle | frame state) = XGBoost(relative position, velocity vectors, angle of approach, nearest-defender geometry). Player skill = Σ(actual − predicted) over opportunities.
- **DATA:** BDB 2024 tracking; 2,014 views, 37 output files.
- **GSE APPLICATION:** The **X-over-expected residual pattern** is the most transferable idea in the lane: build an expectation model for any player stat, use the residual as the skill signal for props. Directly applicable to rushing/receiving yards, tackles props. Module: `gse/features/expected_yards.py` → `yards_over_expected(player, game)`; feed residuals into the prop projection module; calibrate residual half-life per position.
- **ADVERSARIAL NOTE (GLM):** CONFIRMED. The residual framing survives because the two models error in different directions — a shared confounder would show up as residual correlation across models. **Execution requirement:** run the residual-signal sanity check (year-over-year residual persistence vs. cross-model residual correlation).
- **LEAKAGE:** No, provided the expectation model trains only on pre-game-known situational features (rebuild must use walk-forward; train/test split unverified from metadata).
- **TRANSFER:** Any sport with player props.

### 3. Tackling the NFL Spread with Data Science — REJECT (pending audit)
- **Author:** Grant Dugas · **URL:** https://www.kaggle.com/code/gdugas/tackling-the-nfl-spread-with-data-science · 3,900+ views, Apache 2.0
- **METHOD:** Linear regression directly on **score differential** (not win/loss), with feature selection, on spreadspoke historical scores + betting lines.
- **MATH:** margin̂ = β₀ + Σ βᵢxᵢ (OLS on point differential) → P(win) = Φ(margin̂ / σ), σ ≈ 13–14 pts — the classic Stern (1991) margin-to-probability mapping.
- **DATA:** Spreadspoke scores/lines, 1978+, thousands of games.
- **GSE APPLICATION:** The margin→Φ architecture is the Layer-1 blueprint — but we build it ourselves (see adversarial note).
- **ADVERSARIAL NOTE (GLM):** DOWNGRADED from ADAPT to REJECT. "Leakage status unknown" is disqualifying, not a caveat: OLS on score differential is the single most leak-prone setup in football analytics, and the Φ conversion is trivially re-derivable in an afternoon — nothing here worth adopting on faith. **Minimum for reconsideration:** full code audit for point-in-time feature construction + strict temporal holdout (train ≤ year N, test year N+2) beating the closing line. Until then, cite as prior art only.
- **LEAKAGE:** UNKNOWN — could not read code; season-aggregate features are the prime suspect.
- **TRANSFER:** Margin→Φ mapping is a general technique; coefficients never transfer.

### 4. PPPI — Pre-snap Pressure Prediction Index — REJECT (stated form)
- **Author:** Jack Vogelgesang · **URL:** https://www.kaggle.com/code/jackvogelgesang/nfl-data-bowl-2025-pppi-metric-track · Mirror: https://github.com/Jvogie/NFL_Big_Data_Bowl_2025 · BDB 2025
- **METHOD:** P(QB pressure | pre-snap frame) from defensive alignment, player movement/acceleration, OL formation, game situation. XGBoost vs CatBoost.
- **MATH:** Binary classifier on pre-snap tracking features → per-play pressure probability → team/player pressure-rate indices. Pre-snap-only = true leading indicator, no post-snap leakage by construction.
- **DATA:** BDB 2025 tracking (2022, weeks 1–9).
- **GSE APPLICATION:** None in stated form (see adversarial note).
- **ADVERSARIAL NOTE (GLM):** DOWNGRADED from ADAPT to REJECT. Fatal: if the signal lives in pre-snap *tracking* (alignment geometry, early movement) and nflverse PBP carries only formation/personnel tags, the production downgrade is a *different model with unknown signal* — Vogelgesang's validation says nothing about the proxy version. At most, an nflverse-only pressure proxy is a separate candidate requiring independent validation from scratch; the burden of proof is on that build, not inherited.
- **LEAKAGE:** No (pre-snap by design) — but irrelevant given the verdict.
- **TRANSFER:** The "predict the disruptive event from pre-play alignment" pattern remains a valid research direction where tracking is available.

### 5. Modeling Rush Direction in the NFL — REJECT
- **Author:** Danielle Sass · **URL:** https://www.kaggle.com/code/daniellesass/modeling-rush-direction-in-the-nfl · Mirror: https://github.com/dsass1/nfl_bowl_2025 · BDB 2025
- **METHOD:** Boosted-tree classifier predicting rush direction (left/middle/right) from spatial tracking + situational features; builds on published 75–80% run/pass classification work.
- **MATH:** Multinomial GBM on pre-snap spatial features (formation widths, box counts, motion) + down/distance.
- **DATA:** BDB 2025 tracking.
- **ADVERSARIAL NOTE (GLM):** OVERTURNED from ADAPT to REJECT. The first pass "downgraded" the verdict while conceding the signal source gets deleted: rush-direction prediction works *because* formation geometry and motion telegraph blocking schemes — remove tracking and you're predicting from down/distance + formation labels, which the market prices perfectly. "The first pass confused 'the notebook is interesting' with 'the production artifact is predictive.' Wishful thinking confirmed."
- **KEPT FROM FIRST PASS:** The temporal-split validation discipline (train weeks 1–7, test 8–9) is correct for tendency models and transfers everywhere. The Eric Maurer LSTM notebook (#7) independently confirms: LSTM(64) 67.5% beat deeper variants; late box-loading deltas (+2 defenders → higher pass rate) are a genuinely novel pre-snap signal family.

### 6. Reading the Field: Predicting Post-Snap Outcomes with LLMs — ADAPT *(first-pass only)*
- **Author:** Michael Montemurri · GitHub: https://github.com/michaelmontemurri/bigdata25 · BDB 2025
- **METHOD:** xYards model — expected yards for pass plays from context features; QB assessment via Yards Gained Over Expected (YGoE) with quadratic adjustment for incompletion volume; counterfactual play-call analysis.
- **MATH:** E[yards | context] → YGoE = actual − expected per QB; quadratic normalization because incompletions disproportionately penalize high-volume passers. **Garbage-time filter: plays with either team >95% WP removed from training** — the only notebook found that explicitly documents this.
- **GSE APPLICATION:** Props-lane input (YGoE as cleaner QB skill metric than yards/attempt). Adopt `exclude_garbage_time(wp_threshold=0.95)` as a **standing data-hygiene rule for ALL GSE training sets**. Module: `gse/features/qb_skill.py`.
- **LEAKAGE:** No — and the garbage-time documentation is itself a hygiene win.
- **TRANSFER:** YGoE residual + garbage-time filter transfers to every sport's prop modeling.

### 7. NFL Play Type Prediction with LSTM — ADAPT (features + discipline only) *(first-pass only)*
- **Author:** Eric Maurer · **URL:** https://www.kaggle.com/code/ericmau/nfl-play-type-prediction-lstm · Mirror: https://github.com/emaurer71/predicting-nfl-play-type-using-sequential-modeling · BDB 2025
- **METHOD:** LSTM over play sequences (~118 plays/game); novel **box-count time series** (defenders in box at T-20/-10/-5/-2s + deltas, capturing late defensive loading).
- **MATH:** LSTM(64) 67.5% test accuracy beat deeper variants (regularization > capacity). Temporal split train weeks 1–7 / test 8–9. Finding: late box loading (+2 defenders) → higher pass rate (audibles out of runs).
- **GSE APPLICATION:** Take the box-delta feature family (approximate from nflverse PBP defenders-in-box) and the temporal validation discipline. Skip the LSTM — test whether a GBM on the same features matches it cheaper. Note: uses in-play WP/EP as features — fine for play-level modeling, **never lift into Layer 1**.
- **LEAKAGE:** No — clean temporal split, pre-snap features.

### 8. Overlap: Pre-Snap Motion vs Coverage — ADAPT (framework only) *(first-pass only)*
- **Author:** Derek Grifka · **URL:** https://www.kaggle.com/code/derekgrifka/overlap-how-can-pre-snap-motion-exploit-it · Mirror: https://github.com/dgrifka/nfl_motion_coverage_overlap · BDB 2025
- **METHOD:** NN predicts player-movement probability fields; Monte Carlo + heatmaps; **Bayesian comparison of man vs zone coverage responses to motion**.
- **GSE APPLICATION:** Coverage-scheme tendency features for the props lane: team-level `man_rate`, `motion_response_index` as WR-matchup difficulty multipliers. Module: `gse/features/coverage.py`. Take the Bayesian coverage-comparison framework and tendency tables; the NN heatmaps are analysis tooling, not production features.
- **LEAKAGE:** No (pre-snap framing).

### 9. Between the Lines: How Do We Measure Pressure? — ADAPT (as baseline) *(first-pass only)*
- **Author:** Hassaan Inayatali · **URL:** https://www.kaggle.com/code/hassaaninayatali/between-the-lines-how-do-we-measure-pressure · BDB 2023
- **METHOD:** Earlier-generation frame-level defender-vs-QB pressure quantification; foundational for the 2025 pressure entries.
- **GSE APPLICATION:** Historical baseline only — any rebuilt pressure index must correlate sensibly with this entry's published team rankings before shipping.
- **LEAKAGE:** No.

### 10–12. REJECTED (first-pass)
- **NFL 2025 Predicted Winner** (alangnt) — REJECT. 90.2% title probability for one team is catastrophically miscalibrated headline-chasing (true favorite odds ~15–20%); no temporal validation, no calibration, hand-tuned composites. The anti-pattern the engine must never reproduce. Mind-changer: walk-forward validation + reliability curves + log-loss vs market.
- **NFL Punt Analytics** (jpmiller, 31.4k views) — REJECT for the prediction engine. High views = competition popularity, not predictive value; punting is a tiny slice of game variance. Mind-changer: evidence that punt-unit metrics move totals lines.
- **Maximum Defender Depth vs EPA** (Nicole Tucker, BDB 2021, R) — REJECT as standalone (EDA, no model, no validation). Safety-depth-as-scheme-descriptor is a reasonable candidate feature for the coverage module (#8). Mind-changer: walk-forward test showing it predicts defensive EPA out-of-sample.

### Short rejected list (one-line)
- **Open Field Tackling Insights** (abowen) — coaching-descriptive EDA, no predictive model.
- **NFL Analysis: heatmaps/possession** (emiz6413) — pure visualization, no modeling.
- **NFL SMALL DATA / MANTIC** (coltonwilliamz) — framework doc, no validated results.
- **Block Shed Score** (brandonlester) — single-metric demo, no predictive validation.
- **Modeling Player Biomechanics** (haljordan, BDB 2021) — no game-prediction path.
- **NFL Match Outcome Simulation** (madferit94, GitHub not Kaggle) — clustering + Monte Carlo, no rigorous validation; out of lane.
- **nfl-prediction** (okeoluwanifemi) — tracking movement prediction, no game/line prediction.
- **nfl2024databowlsubmission** (neilgulati) — descriptive clustering, superseded by #1/#2's residual-validation approach.

### Key reference (not a Kaggle notebook — flagging for the research corpus)
- **Baldwin et al., "Moving from Machine Learning to Statistics: the case of Expected Points in American football"** (arXiv 2409.04889) — weighted XGBoost for expected points accounting for **drive dependency structure** (plays within a drive are dependent; weighting/subsampling by drive improves log-loss/RMSE). **GSE application:** any play-level model (EP, WP, success probability) should weight or cluster by drive/game — implement `sample_weight = 1/n_plays_in_drive` in the training builder. ADAPT the weighting discipline; it's the difference between honest and inflated validation numbers.

---

## SITUATIONAL/EMOTIONAL LAYER (Layer 2) — GLM-evaluated

*Directive: football is not black and white — the human layer moves games. Every candidate evaluated by GLM for METHOD / MATH / GSE APPLICATION (exact Layer-2 feature) / VERDICT. Layer-2 admission rule enforced throughout: only the residual not captured by the market line earns a slot; every feature must clear ATS breakeven (52.4%) out-of-sample.*

### A. Quantified situational systems (Makinen/VSiN style) — ADAPT
- **METHOD:** Hand-crafted rules ("won last 3, first win an upset, now favored by 3+") codified as deterministic queries over historical game data; verify historical ATS record + out-of-sample retention. The value is the *precisely enumerable spot*.
- **MATH:** For system S: p̂ = covers/n with binomial CI p̂ ± 1.96√(p̂(1−p̂)/n); edge test p̂ > 0.523 (breakeven at −110); stability check: p̂ > 0.53 in ≥70% of season windows, pooled lower CI clears breakeven.
- **GSE APPLICATION:** Binary flags `spot_letdown`, `spot_lookahead`, `spot_revenge`, `spot_rest_edge`, `spot_momentum_3win_upset_follow` + signed `spot_flag_diff`. Inputs: results DB, next-week schedule, rest days — all PIT-computable Thursday, frozen at slate lock. Combination: shrunk logit nudges (|δ| ≤ 0.10, Layer-1 logit as offset); flags failing out-of-sample get zeroed but retained for regime monitoring. **Validation prerequisite:** rebuild each published system on pre-2018 train / 2019+ test — the 74-42 ATS example has n=42, CI ≈ ±15 pts: suggestive, not confirmed. Multiple-comparisons warning: mining thousands of rules guarantees 3-SD hits; require out-of-sample confirmation.
- **VERDICT: ADAPT.** Rebuild spot detectors from raw data; keep only survivors as shrunk nudges.

### B. Revenge factor — ADOPT (as null-prior / fade feature)
- **METHOD:** Negative result as feature: divisional revenge games hit 43-49-4 ATS (~46.8%) — no edge, year-to-year sign flips. The finding is the fragility of narrative spots.
- **MATH:** H₀ (revenge covers at p=0.5) cannot be rejected; slightly below breakeven is consistent with revenge games being *overbet by the market*.
- **GSE APPLICATION:** `revenge_narrative_flag` with coefficient constrained ≤ 0.03 logit units — a documented-zero prior plus a tiny contrarian fade when the revenge side is publicly hyped. Also serves as confounder control so revenge games aren't misattributed to letdown/rest effects.
- **VERDICT: ADOPT.** A documented-zero feature is cheap insurance against the model silently leaking revenge logic.

### C. Midseason coach-firing bounce — ADAPT
- **METHOD:** 38 firings since 2003; first-game-under-interim spot measured ATS/SU vs closing lines, segmented by interim profile. ~3 wins above implied; defensive-minded interims 53.6% ATS vs 45.3% offensive; prior-HC-experience interims 55% ATS first game. Documented decay as opponents get film — explicit time-to-live.
- **MATH:** Δ(k) = Δ₀ · e^(−λk), k = games since firing; empirical-Bayes shrinkage on Δ₀ (n=38); hierarchical shrinkage on profile segments.
- **GSE APPLICATION:** `interim_bounce` ∈ [0,1]: 1.0 = first game, experienced interim; 0.7 = defensive-minded interim; 0.3 = offensive/no-experience; ×0.5 per subsequent game; 0 after 3 games. Event-driven from timestamped coaching transactions (PIT-clean). Combination: Layer-1 logit + β·`interim_bounce`, β ≈ 0.05–0.12 logit units (1–2.5 win-prob points), strong L2 shrinkage; confidence-gated (full β only in the historically strongest cell).
- **VERDICT: ADAPT.** Real, spread-based, pregame-computable, built-in decay — ideal Layer-2 material. Rebuild pooling all firings through the current season to grow n.

### D. Pre-game Twitter sentiment (Dressler, BERT) — ADAPT
- **METHOD:** Scrape pre-kickoff tweets, BERT sentiment → team-level aggregated features; sentiment enrichment beat raw/cleaned text across every model family (RF, XGB, CatBoost, NN). Best: NN, multiclass ROC AUC 0.642. Author's "early-warning tool, not high-stakes" framing is correct.
- **MATH:** Per-tweet sᵢ ∈ [−1,+1]; team feature S_t = Σwᵢsᵢ/Σwᵢ over [t−24h, t), wᵢ = credibility/bot-filter weight. AUC 0.642 is real but weak (3-class chance ≈ 0.35–0.40) and unproven vs a market line.
- **GSE APPLICATION:** `L2_tweet_sent_24h`, `L2_tweet_sent_z` (vs team's own 30-day μ/σ), `L2_tweet_vol_z`, `L2_sent_gap = z_home − z_away`. Hourly refresh, **hard freeze at T−1h**. Combination: probability nudge via residual regression — regress (actual − L1 margin) on sentiment features; `margin' = clip(L1_margin + β·sent_gap, ±1.5 pts)`; fires only when volume gate passes. Backtest: ATS rate, flat-stake ROI, CLV.
- **VERDICT: ADAPT.** PIT-feasible; kill condition: must show orthogonal value vs the closing line in walk-forward ATS backtest.

### E. Regional angst / CentralSport (Schumaker et al.) — ADAPT (selectively)
- **METHOD:** Harvest team tweets → per-team sentiment time series → normalize surges vs each club's own baseline → stock-chart technical indicators → map sentiment gap to margin outcomes. Only candidate with a margin-native outcome variable.
- **MATH:** Surge z = (S_t − μ_team)/σ_team; gap G = z_home − z_away; bucketed result (|G| large → 0.90 goal diff vs 0.42) implies Δmargin ≈ β·G. **The dollar figures are not evidence** — $1,887.88/$3,011.20 lack stake base, ROI%, significance tests; "best return" implies post-hoc cherry-picking.
- **GSE APPLICATION:** `L2_sent_surge_z_h/a`, `L2_sent_gap`, optional `L2_sent_ema_cross`. Daily baseline, hourly refresh, frozen at close. Additive points: `margin' = clip(L1_margin + β·G, ±1.5 pts)`, β from residual regression, fire-gate on volume + |G|. Regime note: the NFL work predates modern X — chatter is now national/betting-driven, not local-fan angst; normalization must handle that shift.
- **VERDICT: ADAPT selectively.** Take: (1) own-baseline surge z-score, (2) sentiment gap as margin signal, (3) technical indicators on sentiment series. Reject the published wagering results.

### F. nfl-sentiment-analyzer (GitHub) — REJECT (as feature)
- **METHOD:** MLOps architecture (streaming X/ESPN ingestion, NLP scoring, Hopsworks, W&B, HF deployment, dashboard + API) — plumbing, not a prediction method.
- **MATH:** PIT join semantics F(g,t) = value as of latest event_ts ≤ t — the leakage guarantee Layer 2 needs. Caution: its "per-game sentiment predictions" are implicitly in-game; using them pre-kickoff is leakage by construction.
- **GSE APPLICATION:** Infrastructure only — rebuild D/E's pipeline on this pattern (feeds → BERT → feature group keyed (team, game, event_ts) → offline PIT joins + T−1h online freeze). Never consume its per-game predictions.
- **VERDICT: REJECT** as a candidate feature (design docs, unverified, zero validated signal). Salvage the architecture blueprint. Mind-changer: shipped code + published PIT backtest vs spread with nonzero ATS edge.

### G. 2020 no-fan natural experiment (arXiv 2104.11595) — ADAPT
- **METHOD:** COVID empty stadiums as causal isolation of crowd presence from travel/familiarity components of HFA.
- **MATH:** π_fans ∈ [56.81%, 59.16%] (1970–2019, 99% CI) vs π_nofan = 46.53% — crowd-attributable HFA ≈ 10–12 win-prob points; ~2.0–2.5 of the ~2.5–3.0 pt historical HFA evaporates without a crowd.
- **GSE APPLICATION:** `crowd_edge_pts` = (expected_hfa_pts − floor) × attendance_ratio; **additive points to the Layer-1 margin prior** (subtract crowd edge from home expectation). Gate only when attendance_ratio ≈ 0. Backtest ATS 2021–2024 to calibrate the floor.
- **VERDICT: ADAPT.** Cleanest causal ID available for HFA; one-season N≈250 sample needs 2021+ validation. Never hardcode "home = −2.5."

### H. Stadium loudness — REJECT
- **METHOD:** Correlate loudness rankings with home/road splits (top-10 loudest: 69.3% home vs 51.5% road; SEA/KC 73.6% vs 52.1%).
- **MATH:** The 17.8-pt gap is selection-biased cross-section — loudness is contemporaneous with team quality; gaps collapse controlling for strength, which Layer 1 already does.
- **VERDICT: REJECT** as a standalone feature. Not PIT-clean (rankings compiled with hindsight), fully absorbable by Layer 1. Mind-changer: a PIT-clean loudness proxy (prior-season measured decibels only) showing ATS residuals after controlling for team strength + line.

### I. Short-week / rest-day edges — ADAPT
- **METHOD:** Deterministic schedule facts (Thursday-after-Sunday, Monday hangover, post-bye). Test the **residual** rest edge after the line prices the obvious part.
- **MATH:** Regress covering_margin vs spread on ΔRest with team-strength + season fixed effects; signal = coefficient significant with |edge| ≥ 1 pt after market adjustment. Fully PIT-clean (known at schedule release).
- **GSE APPLICATION:** `rest_edge_pts` ≈ 0.3–0.8 pts (Thursday), ~0.5 pt (post-bye opponent); **small additive points** to Layer-1 margin + **line-movement gate** (suppress when the line already moved past threshold — prevents double-counting priced-in spots). Cap at ~1 pt. Bin spots (Thursday / 6-day / post-Monday / post-bye) rather than independent rules; test conditional edges (old rosters, WC→East travel).
- **VERDICT: ADAPT.** Strongest structural fit (deterministic, PIT-clean) but naive spots are largely priced; require out-of-sample ATS ≥ 52.4% on surviving bins.

### Layer-2 admission gate (applies to all Twitter-based features D/E)
1. **Orthogonality test:** incremental R² / t-stat of sentiment on margin *residuals after controlling for the closing line*. If it restates the line, it's worthless.
2. **Classifier floor:** ≥70% accuracy on a labeled NFL tweet sample (noise propagates multiplicatively).
3. **Bot/brigade scrubbing:** dedupe, credibility weighting, coordinated-activity filters.
4. **Economics:** X API access is a material line item — budget check before engineering.

---

## NFL-LANE WIRING PRIORITY QUEUE

1. **Margin→Φ Layer-1 core** (own build; #3 as prior art only) — ridge on point margin, walk-forward, σ calibrated per season. *GLM: leakage-unknown notebooks never enter Layer 1.*
2. **X-over-expected residual skill features** (#2, confirmed) — `yards_over_expected` / `tackles_over_predicted` for the props lane, with the residual-sanity check.
3. **Garbage-time filter as global hygiene** (#6) — `exclude_garbage_time(wp>0.95)` in the training-data builder before anything else trains.
4. **Drive-weighted training** (Baldwin et al.) — `sample_weight = 1/n_plays_in_drive` for all play-level models.
5. **Situational spot flags** (A) — rebuild letdown/lookahead/rest detectors; shrunk logit nudges; out-of-sample ATS validation.
6. **Rest edges** (I) — `rest_edge_pts` + line-movement gate.
7. **Coach-firing bounce** (C) — `interim_bounce` decayed nudge, event-driven.
8. **Sentiment gap/surge** (E→D) — own-baseline z-scores first, BERT pipeline second; must pass the 4-test admission gate.
9. **Swarm-score defensive feature** (#1, conditional) — weekly pipeline; era-stratified validation before weighting.
10. **Crowd-scaled HFA** (G) — continuous attendance parameter; calibrate on 2021+ ATS residuals.
11. **Revenge null-prior** (B) — cheap; encode the zero.
12. **Coverage tendency tables** (#8) — `man_rate`, `motion_response_index` for WR-matchup multipliers.

---

## TOKEN SPEND (z-ai/glm-5.3-flash via OpenRouter, paid — no :free variant exists)

| Call | Prompt + Completion | Cost |
|---|---|---|
| Smoke tests | ~71 + 1520 | ~$0.00075 |
| Situational batch 1 (A/B/C) — first attempt (truncated) | 566 + 4000 | $0.001998 |
| Situational batch 2 (D/E/F) — first attempt (truncated) | 586 + 4000 | $0.001996 |
| Situational batch 2 — rerun (complete) | 586 + 7076 | $0.003519 |
| Situational batch 1 — rerun (complete) | 566 + 2053 | $0.001032 |
| Situational batch 3 (G/H/I) | 564 + 1701 | $0.000858 |
| Adversarial review (top 5 notebooks) | 738 + 759 | $0.000539 |
| **Total** | | **≈ $0.0107** |

Egress note: `bin/openrouter-api` (urllib) fails on this VM — connection dropped on every call. `~/workspace/kaggle-destroyer/bin/glm-call.py` (sibling lane's, forces egress proxy) works cleanly. All production GLM calls should use the proxy-forcing path.

---

## REVIEW PASS (adversarial, wave 2)

*Reviewer: fresh agent, did not write wave 1. Date: 2026-10-06. Read the report end-to-end, ran fresh web searches, checked the lane against lanes 02/03/09 for cross-lane consistency. No external API spend.*

### A. New candidates wave 1 missed (5)

**R1. sujaynadkarni/nfl-prediction — the honest-grading discipline — ADAPT**
- **URL:** https://github.com/sujaynadkarni/nfl-prediction (GitHub, actively maintained as of Oct 2026)
- **METHOD:** Full-season NFL predictor (free public data) that **grades itself against the Las Vegas closing spread every week, in public**. Published test-season numbers (2024–25, 570 games): model 64.9% winners called / Brier 0.2142 / margin error 9.98 pts; Elo alone 66.1% / 0.2179 / 10.14; Vegas closing 68.2% / 0.2077 / 9.69.
- **Why it matters:** Two things. First, the discipline is the mechanism to adopt: a permanent, automated "vs closing line, Brier + margin error" harness is the only honest gatekeeper for every GSE Layer-1 change — more valuable than any single model. Second, the cautionary result: **a plain Elo beat this author's own tuned model** on winners called and nearly matched on Brier. Wave 1 never mentions the embarrassment scenario where added complexity loses to Elo; this repo is the standing unit test against feature-bloat.
- **VERDICT: ADAPT** the grading harness (weekly auto-run vs closing spread, Brier/log-loss/CLV, published internally); ADAPT the humility finding as a design rule — no feature enters Layer 1 unless it beats the Elo baseline on the same backtest.

**R2. nfl4th (nflverse) + Bai "Go For It" — coach-aggressiveness behavior layer — ADOPT**
- **URLs:** https://github.com/nflverse/nfl4th (R package; `add_4th_probs` emits `go_boost` = gain/loss in WP percentage points of going for it vs kick/punt) · https://github.com/AndrewBai-Marketing/go-for-it (fully Bayesian 4th-down/two-point framework, UChicago; hierarchical Bayes, real-time knowability via expanding-window estimation)
- **METHOD:** nfl4th computes the model-optimal 4th-down decision per play from game state. Bai's framework finds: optimal GO rate 46.6% vs actual 14.8%; 4th-and-1 optimal GO 70.8% vs actual ~25%; coaches "match" the model only ~52.5% of the time; going when the model says GO gains +0.0059 WPA, not going costs −0.0108 WPA.
- **Why it matters:** Wave 1's human layer has coach-firing (C) and spot flags but **no persistent coach-behavior feature** — and here is one that is deterministic, PIT-clean (decision + game state known pre-next-game), stable year-to-year, and already market-tested: `coach_aggression = actual_go_rate − nfl4th_optimal_go_rate` per team-season, plus `coach_WPA_lost_on_4th` (sum of −go_boost where the coach punted/kicked against the model). Aggressive-coach teams systematically convert more late-game 4th downs; conservative coaches bleed WP. This is the coaching analogue of lane 15's "persistent coach behavior" finding and should have been lane 01's #1 Layer-2 coaching candidate.
- **Cross-sport transfer:** the mechanism (optimal-policy deviation as a persistent team trait) transfers to NHL goalie-pull timing, NBA foul-to-extend decisions, soccer late-game chase behavior. Coefficients never transfer.
- **VERDICT: ADOPT** `coach_aggression` + `coach_WPA_lost` as Layer-2 features, additive in logit space with shrinkage; kill condition: no ATS/CLV residual after controlling for the closing line over 3+ seasons.

**R3. Forecast-wind / rain totals edge — ADAPT (with strict PIT discipline)**
- **URLs:** https://www.sharpfootballanalysis.com/betting/nfl-weather-betting/ (wind-band passing stats; rain games under 57.4% over a 343-game sample since 2020; −15% passing yards in rain) · https://www.sportsbettingdime.com/news/nfl/weather-forecasts-wild-card-games-game-total-odds-movement/ (totals moved ~2 pts on 15–22 mph wind forecasts)
- **METHOD:** Wind bands degrade passing efficiency non-linearly (completion% and deep-ball accuracy fall hardest above ~15–20 mph; kicking success collapses beyond 40 yards); rain suppresses passing yards ~15% and pushes games under. Books adjust totals for *extreme* forecasts (~1.5–2 pts) but the 10–15 mph band is inconsistently priced.
- **Why it matters:** Wave 1's wiring queue has **no weather input at all** — for a lane that models totals, that is a hole. Lane 09 already flagged the key leakage rule (forecast-as-of-T−X, never observed weather); lane 01 should inherit it. The weak claim to reject: a secondary site's "10–15 mph unders ROI" story (AI-generated outlet, no sample/stake/significance reported) — take the mechanism and Sharp's banded stats, reject the ROI headline.
- **VERDICT: ADAPT** `wind_band` + `rain_probability` from forecast-as-of-freeze into the totals model; validation gate: residual edge vs closing *total* (not raw under hit-rate), since books already move totals ~2 pts on extreme forecasts.

**R4. QB-injury / snap-weighted roster availability — ADAPT**
- **METHOD:** Injury reports are PIT-clean public inputs (designations published days before kickoff). The feature family: `roster_strength_with_absences` — team strength recomputed with missing starters replaced by backup priors, weighted by the absent player's prior-season snap share (lane 09's snap-weighted injury protocol, which wave 1's lane 01 never imports), with a separate steeper curve for QB absence (backup-QB downgrade is the largest single personnel effect in the sport).
- **Why it matters:** Missing from lane 01 entirely — no injury candidate in 12 notebooks or 9 situational candidates. A prediction engine that models spreads without modeling who is *playing* is building Layer 1 on a false completeness assumption. The market prices QB news fast (lane 20's market machinery), so the surviving edge is in (a) non-QB snap-weighted degradation the line underprices, and (b) the hours between injury news and line adjustment.
- **VERDICT: ADAPT** with the lane-09 snap-weighting protocol; admission gate: residual ATS/CLV vs closing line on games with designation changes after the opening line.

**R5. Referee-crew penalty tendencies — ADAPT**
- **METHOD:** Officiating crews are announced before kickoff (PIT-clean). Crews differ persistently in flags/game, offensive-holding rate, defensive-PI rate, and home/road flag asymmetry. Penalty volume moves both drive extension (spreads) and game pace/clock stoppages (totals).
- **Why it matters:** Wave 1 has no officiating candidate. This is the rare structural feature that is fully deterministic, pregame-known, and orthogonal to team strength — exactly the profile wave 1 claims to want for Layer 2. It belongs at least in the totals model.
- **VERDICT: ADAPT** `crew_flags_per_game_z`, `crew_home_bias_z`, `crew_DPI_rate_z`; kill condition: no residual on totals/spreads after controlling for the closing number over ≥3 seasons; crew-composition changes (retirements, crew mixing) require re-baselining.

*(Also noted, folded into R1's discipline rather than counted separately: cdinh92/nfl-predictive-engine's `.shift(1)` leakage protocol and lawrence18365/blitzcast's Elo→XGBoost→Platt→walk-forward-vs-Vegas pipeline are clean production reference architectures for the Layer-1 rebuild. URLs: https://github.com/cdinh92/nfl-predictive-engine and https://github.com/lawrence18365/blitzcast.)*

### B. Verdict changes advocated

**B1. C (midseason coach-firing bounce): ADAPT → ADAPT-narrow, with a mandatory regression-to-mean control.**
This is my strongest disagreement with the report (see D). Keeping the ADAPT only if: the rebuild compares post-firing ATS against the same team's *pre-firing ATS deviation from expectation*. Teams that fire coaches were systematically underperforming the spread before the firing — reversion to the mean after a trough looks exactly like a "bounce" without any causal treatment. The profile segments ("defensive-minded interims 53.6% ATS vs 45.3% offensive," "prior-HC-experience 55% first game") are coin flips on cells of n≈10–20; publishing them as multiplicative tiers (1.0/0.7/0.3) manufactures precision that n=38 cannot support. The exponential decay Δ(k) = Δ₀·e^(−λk) is decoration — you cannot estimate λ on 38 events. Honest version: one binary `interim_first_2_games` flag, β shrunk hard, and the regression-to-mean control as the kill condition.

**B2. #1 Swarm Score: conditional ADOPT → ADAPT with a data-acquisition gate.**
The conditional ADOPT is generous. The deployment path requires *weekly tracking data*, which GSE does not have: NGS tracking is not publicly available at scale (samples and BDB releases only), and nflverse carries no tracking feed. "Weekly-refreshed pipeline" is therefore not an engineering task — it is a **licensing/money decision for Garrett**. Downgrade to ADAPT until the data-acquisition question is answered; keep the validation method (regress future metric on candidate vs naive prior) as the adopted discipline — that part genuinely transfers everywhere.

**B3. B (revenge fade): keep the null-prior ADOPT, drop the "fade" framing.**
43-49-4 ATS (~46.8%) is not statistically distinguishable from 50% — year-to-year sign flips confirm it. A "tiny contrarian fade" on a null is overfitting to noise; the honest feature is `revenge_narrative_flag` with coefficient pinned at exactly 0 (confounder control + audit trail), not ≤0.03 "fade units." The report half-knows this ("documented-zero prior") but then un-zeroes it.

**B4. D/E (sentiment): reconcile with lane 02's REJECT — adopt a unified cross-lane sentiment doctrine.**
Lane 02 evaluated the same candidate class (pre-game tweet sentiment) and REJECTED it: unattributed from the line, unbuildable point-in-time, contradicted by the player-level null. Lane 01 ADAPTs it with a 4-test admission gate. Both can't be right as stated. The resolution: lane 01's gate #1 (orthogonality vs the closing line) is the correct shared standard — port it into lane 02's doctrine rather than keeping a cross-lane contradiction. If sentiment survives the residual-vs-close test in walk-forward, it enters; if not (my prior: it won't — the line already aggregates public chatter), both lanes record the REJECT with the same gate named. Flagging this because the fleet must not ship two lanes with opposite doctrines on the same feature class.

### C. Wiring-queue re-ranking

Wave 1's queue is sound but mis-orders the honesty infrastructure and omits the new finds. Proposed order:

1. **Margin→Φ Layer-1 core** (unchanged) — own build, ridge on margin, walk-forward, σ per season.
2. **Honest-grading harness** (NEW, promoted — from R1): automated weekly run grading every model change vs closing spread: winners-called, Brier, log-loss, margin error, CLV. Nothing below this line ships without clearing it. Wave 1 had walk-forward *inside* item 1; the harness deserves to be its own queue item because it is the gatekeeper for everything else.
3. **Elo-baseline guardrail** (NEW, from R1's cautionary result): a plain Elo must be beaten on the same backtest before any feature enters Layer 1. The sujaynadkarni finding — Elo beating a tuned model — is the anti-bloat unit test.
4. **Garbage-time filter as global hygiene** (was #3 — promoted; it is a data-builder change, not a model, and blocks everything downstream).
5. **Drive-weighted training** (was #4 — promoted into the hygiene block).
6. **Coach-aggressiveness features** (NEW, from R2): `coach_aggression`, `coach_WPA_lost` — persistent, PIT-clean, market-relevant. Outranks spot flags because it is structural, not episodic.
7. **X-over-expected residual skill features** (was #2 — demoted one slot only to make room for the honesty block; the mechanism remains the lane's best transferable idea).
8. **Situational spot flags** (was #5 — unchanged in substance; add the regression-to-mean control from B1 before any flag ships).
9. **Forecast-weather for totals** (NEW, from R3) — with the forecast-as-of-freeze discipline.
10. **Rest edges** (was #6) + **line-movement gate** (unchanged).
11. **Roster availability / QB downgrade** (NEW, from R4).
12. **Crew tendencies for totals** (NEW, from R5).
13. **Sentiment gap/surge** (was #8 — demoted pending the unified doctrine in B4; pipeline second, z-scores first, unchanged in method).
14. **Swarm-score defensive feature** (was #9 — demoted per B2; gated on tracking-data acquisition).
15. **Crowd-scaled HFA** (was #10 — unchanged).
16. **Revenge null-prior** (was #11 — per B3, coefficient pinned at 0, kept as confounder control).
17. **Coverage tendency tables** (was #12 — unchanged).

### D. Dangerously wrong or overstated in the original

**D1. The coach-firing bounce math (C) is the report's weakest section.** n=38 firings cannot support profile-segmented tiers, cannot estimate an exponential decay λ, and — most importantly — the analysis never controls for the alternative explanation that explains the entire effect: **teams that fire midseason coaches were underperforming expectations before the firing, so post-firing reversion to the mean is the null, not the bounce.** "≈3 wins above implied" is measured against the closing line *after* the market has already shaded the number for the firing news; without comparing to the team's pre-firing ATS trajectory, the finding is selection bias wearing a decay function. B1's gate is non-negotiable.

**D2. Wave 1 omits the timezone-travel reversal — the market *did* adapt, and the report's framework needs the counterexample.** The famous West-Coast-to-East 1pm-ET angle: since 2013, West Coast teams are 58-40-4 ATS (59.2%) in that spot — the edge *reversed* as books adjusted and teams changed travel routines (Action Network/Covers, Bet Labs data). Lane 01's rest/travel section (I) never mentions it, and lanes 02/03 treat timezone effects as live signal. The fleet doctrine should be: **any travel/fatigue feature must be validated on post-2015 data with the market-adaptation hypothesis explicitly tested** — effects the public knows about get priced. This is the single most important transfer-audit correction for the whole 20-lane program.

**D3. Small-sample ATS percentages are quoted as findings in two places.** The Layer-2 admission rule (52.4% breakeven) is correct as a *test threshold* but the report applies its spirit to samples that can't clear any significance bar: the interim profile cells (n≈10–20) and the revenge 43-49-4 (n=96, but the *fade* inference drawn from 46.8% is still noise). Standing rule for the fleet: no ATS% is reported without n and a binomial CI in the same sentence.

**D4. What wave 1 got right and should not be touched:** the adversarial review of the top-5 notebooks was the lane's best work — the "information source survives the production downgrade" test (PPPI, rush-direction) is exactly the right razor and should become fleet doctrine; the GLM-overturned-3-of-5 discipline is the model for wave 2 itself. The garbage-time filter (#6), drive-weighting (Baldwin), and margin→Φ Layer-1 architecture are all correctly placed and correctly reasoned. The Layer-2 admission gate's four tests for Twitter features are the right gate — they just need to be the *shared* gate (B4).

---

**Review summary for the parent:** 5 new candidates found (R1–R5), 4 verdict changes advocated (B1–B4), wiring queue re-ranked (17 items). Single strongest disagreement: **the midseason coach-firing bounce (C) is accepted on evidence that cannot distinguish a bounce from regression to the mean — n=38, unestimated decay math, and coin-flip profile segments — and must be rebuilt with a pre-firing ATS trajectory control before it earns any weight.** Secondary: wave 1 missed the documented reversal of the West-Coast-travel angle (58-40-4 ATS since 2013), which the whole fleet's travel/fatigue doctrine needs as its market-adaptation counterexample.
