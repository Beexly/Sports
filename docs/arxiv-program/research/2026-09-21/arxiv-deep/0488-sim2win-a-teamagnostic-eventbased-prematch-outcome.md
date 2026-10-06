# [0488] Sim2Win: A Team-Agnostic, Event-Based Pre-Match Outcome Prediction and Tactical Profiling System for Football (arXiv:2607.26061v1)

**Citation:** Mouad Zemzoumi, Amine Abouaomar (2026). *Sim2Win: A Team-Agnostic, Event-Based Pre-Match Outcome Prediction and Tactical Profiling System for Football*. arXiv:2607.26061v1. URL: https://arxiv.org/abs/2607.26061v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 50,450 chars).
**Verdict:** ADAPT — soccer, but the rolling behavioral-profile + efficiency-ratio + volatility-feature recipe and the LOCO generalization protocol port to NFL spread/total modeling; drop the team-agnostic framing and the unvalidated playstyle clustering.

## 1. Research question
Can pre-match soccer outcomes be predicted from *how* teams play rather than *who* they are? Sim2Win builds rolling 5-match tactical profiles from StatsBomb event data (no team names, Elo, or rankings), engineers four interpretable tactical ratios, clusters playstyles via K-Means, and trains 13 classifiers on home/away matchup vectors — evaluated under Leave-One-Competition-Out (LOCO) to test generalization to entirely unseen competitions.

## 2. Dataset / schema
- **StatsBomb open event data** (public, github.com/statsbomb/open-data, via statsbombpy): 11 competitions (Bundesliga, Premier League, Ligue 1, La Liga, MLS, FIFA World Cup, UEFA Euro, Copa America, AFCON, Women's World Cup, FA Women's Super League) → **1,411 team-match rows, 178 teams, ~706 matches** after cleaning (incomplete rows, duplicates, thin-history teams removed; xG > 5.0 capped/removed; matches with ≥3 red cards excluded; volume metrics Winsorized at 1st/99th percentiles).
- Schema per team-match: rolling features below + home/away indicator + rest days R(t,m) = date(m) − date(m−1). Target: y ∈ {away win, draw, home win}.
- Code: "Sim2win Github Repository" (link named in paper; StatsBomb data + statsbombpy public).

## 3. Method / model
- **Rolling tactical profile:** **x̄(t,m) = (1/k)Σ_{i=1}^k x(t,m−i), k = 5**, shifted one match back so no stats from the predicted match leak. Matchup vector **x_m = [x_{h,m}, x_{a,m}]**.
- **Four engineered ratios:** Pressing Efficiency PE = ball recoveries/(pressures+ε); Shot Quality SQ = xG/(shots+ε); Directness D = passes/(possession events+ε); Chaos C = fouls + 3·yellows + 5·reds.
- **Volatility/momentum:** xG volatility σ_xG (5-match std), xG momentum M_xG = xḠ_last3 − xḠ_last5; plus contextual (home/away, rest days).
- **Playstyle clustering:** K-Means on 13 rolling features (StandardScaler, no PCA for interpretability); elbow/silhouette suggest K=5 but authors use K=8 for granularity — explicitly acknowledged as unvalidated/exploratory (no expert annotation): {High-Pressing Possession, Low-Block Counter, Mid-Block Transition, Direct Long Ball, Tiki-Taka, Wing-Play Overload, High-Intensity Gegenpress, Park the Bus}.
- **Models:** 13 classifiers (LogReg, SVM, KNN, Random Forest, Extra Trees, Bagging, AdaBoost, GBM, XGBoost, LightGBM, CatBoost, ANN, TabPFN); RandomizedSearchCV 5-fold CV on negative log loss **L = −(1/N)Σ_i Σ_{c∈{H,D,A}} y_{i,c} log(p̂_{i,c})**.
- **Validation:** stratified 80/20 holdout; 10-fold CV with 95% CIs (top 3); McNemar's exact test; LOCO (one full competition held out per fold, 7 folds); 8-configuration ablation; draw-specific experiments (class weights, threshold tuning).

## 4. Equations & assumptions
- Profile: **x̄(t,m) = (1/5)Σ_{i=1}^{5} x(t,m−i)**; volatility **σ_xG = √(Σ(xG_i − xḠ)²/5)**; momentum **M = xḠ_3 − xḠ_5**; rest **R = date(m) − date(m−1)**; ratios as above.
- Objective: 3-class log loss over {H, D, A}; SHAP-based feature importance for interpretation.
- **Assumptions:** last-5-match behavior predicts next match; team-agnostic behavioral signal transfers across competitions; draw is a predictable class (falsified in practice); 1-match shift suffices to prevent leakage (true for the features used).

## 5. Features / target
- **Inputs:** 13 rolling tactical features + 4 engineered ratios + volatility/momentum + contextual (home/away, rest); matchup = concatenated home/away vectors; K-Means cluster id.
- **Target:** ternary match outcome (home win / draw / away win). Pre-match horizon only.

## 6. Validation design
In-distribution: stratified 80/20 holdout + 10-fold CV with 95% CIs + McNemar's exact test. Generalization: LOCO over 7 competitions (train on 6, test on 1). Baselines: ELO, Pi-Rating, GAP rating systems (warmed up chronologically on training matches, then tested on held-out competitions — the authors explicitly flag this as asymmetric: it measures robustness under distribution shift, not head-to-head deployment performance). Ablation: 8 configurations on 5-fold CV accuracy + ROC-AUC.

## 7. Numerical results / baselines
- **Table 1 (in-distribution 80/20 holdout):** CatBoost 60.90% acc / 0.9289 log loss / 0.7268 AUC / 0.5817 F1 (selected for deployment); XGBoost 56.39% / 0.9271 / 0.7406 (best AUC); Extra Trees 59.40% / 0.9340 / 0.7325 / 0.6112 precision; LogReg 55.64% / **0.9207** (lowest log loss — best calibrated but linear); TabPFN 41.35% / 1.0887 / 0.6307 (worst — paired matchup structure breaks its pretraining assumptions).
- **Table 2 (10-fold CV):** CatBoost 55.50±2.45% acc [53.66, 57.35], AUC 0.695±0.044; XGBoost 52.49±4.58%, AUC 0.697±0.045; Extra Trees 54.91±3.93%, AUC 0.707±0.041. CIs overlap substantially. McNemar: CatBoost vs LogReg p=0.0009 (significant); vs XGBoost p=0.1221, vs Extra Trees p=0.4807 (not significant).
- **Table 3 (ablation, Δacc):** rolling window 5 is the key choice — window 3: −4.11%, window 7: −3.93%; without xG volatility: −1.66%; without contextual: −1.21%; without cluster: −0.91% (but AUC rises 0.683→0.690 — no discriminative gain); without engineered ratios: −0.15% (AUC 0.683→0.691). Raw unshifted per-match features: +7.10% acc — **pure leakage**, reported only as diagnostic upper bound.
- **Table 4 (LOCO):** mean CatBoost acc 55.4%, mean AUC 0.704 (Cat) / 0.701 (XGB); best on La Liga (65.1% acc, 0.796 AUC) and Women's WC (67.5%, 0.762); weakest on AFCON (45.0%, 0.562) and UEFA Euro (46.2%, 0.615).
- **Table 5 (LOCO vs ratings, mean AUC):** Sim2Win 0.704 vs ELO 0.567 vs Pi-Rating 0.551 vs GAP 0.548 — 21/21 AUC wins, 19/21 accuracy wins, with the authors' asymmetry caveat.
- **Draw failure:** Draw F1 = 0.238 on holdout; zero draws predicted in ≥1 LOCO fold; best mitigation (XGBoost + class weights) reaches Draw F1 0.400 at the cost of acc 57.89% — a structural trade-off, no configuration exceeds 0.40.
- SHAP: top features = possession events, shot quality, pass volume, pressing efficiency, xG volatility; balanced home/away importance.

## 8. Code / data availability
Implementation: "Sim2win Github Repository" (named in paper). Data: StatsBomb open data + statsbombpy — public and replicable.

## 9. Leakage & limitations
- **Stated + adversarial:** n = 1,411 team-match rows is small for a 3-class high-dimensional problem; several ablation deltas (<1%) sit inside CV noise — only the rolling-window effect (>3.9%) is robust. The K=8 clustering is unvalidated (overrides the K≈5 mathematical optimum; no expert annotation, no seed-stability analysis) — an interpretation layer, not a predictor (ablation proves it). Home-advantage confound: the top feature is home possession events and the model systematically over-predicts home wins; neutral-ground competitions (WC, AFCON, Copa) are exactly where it weakens — tactical signal vs. structural home advantage is not disentangled. The rating-baseline comparison is structurally asymmetric (acknowledged). Draw prediction is a structural failure. Dataset is Bundesliga-heavy → Euro-club bias. No injuries, rotation, weather, referee, or coach-change features.
- **External validity to NFL:** the team-agnostic premise is unnecessary for the NFL (32 teams, full historical continuity — identity-based ratings work fine), and soccer's draw class has no NFL analog. But the *engineering recipe* transfers cleanly: shifted rolling profiles, efficiency ratios, volatility/momentum features, paired matchup vectors, and LOCO-style season-holdout evaluation.

## 10. GSE overlap
Checked against `existing-research-map.md`: Garrett's corpus has extensive efficiency metrics (EPA/play, success rate, CPOE, pressure rate — computed in gse-lab from nflverse) and rating systems (Elo, Glicko, TrueSkill mentioned; benbbaldwin tiers), but **no rolling-window behavioral-profile construction with explicit shift**, **no volatility/momentum features over rolling efficiency**, and **no leave-one-season-out generalization protocol** as a standing evaluation. The 5-match rolling window maps to a 4–5 game rolling form window in NFL; xG volatility maps to EPA/play volatility. This is an **extension**: a feature-engineering + evaluation-protocol recipe, not a duplicate. (Note: Hermes's opp-adj-EPA work and the ML-brief's "state-space team strength" lane are adjacent but neither uses this exact construction.)

## 11. GSE implementation spec
Port the recipe to NFL spread/total modeling (not the team-agnostic claim):
1. **Data:** nflverse play-by-play 2020–2025; build per-team rolling 4-game profiles (shifted one game back) of efficiency features: EPA/play (off/def, dropback/rush splits), success rate, pressure rate, explosive-play rate, turnover luck, pace.
2. **Engineered ratios (NFL analogs of PE/SQ/D/C):** pressure-to-sack conversion, EPA per dropback vs. per rush, red-zone TD rate, "chaos" = penalties + turnovers forced/committed (weighted).
3. **Volatility/momentum:** rolling std of EPA/play (consistency), last-2-games minus last-4-games momentum on key metrics.
4. **Matchup vector:** concatenate home/away profiles + differentials + rest/travel/weather context → CatBoost/LightGBM for ATS win prob and total (regression for total).
5. **Evaluation:** leave-one-season-out CV (the LOCO analog) as the standing generalization check, alongside the chronological split; ablate window length (3/4/5/6 games) and feature groups exactly as the paper does.
6. **Effort:** ~3–4 days (nflverse loaders + gse-lab metric code already exist); 1 day for the ablation/LOCO harness. Skip the K-Means playstyle layer entirely.

## 12. Reproducible test
Dataset: nflverse 2021–2025 regular seasons. Task: ATS classification (cover vs. not) with closing spread. Features: 4-game shifted rolling profiles + ratios + volatility/momentum + matchup differentials. Metric: log loss + ROI at flat -110 staking on the test season. Baselines: (a) Elo-only logistic (nfelo-style); (b) raw season-average features without rolling/volatility. Protocol: leave-one-season-out over 2022–2025 (train on remaining seasons).

## 13. Acceptance / rejection gate
**Adopt the recipe if** the rolling-profile + volatility feature set beats the Elo-only baseline by ≥0.015 log loss on mean LO-season-out log loss over 2022–2025 AND shows positive flat-stake ROI on at least 3 of 4 test seasons; **reject otherwise** (keep current feature set; the paper's in-distribution gains may be soccer-specific).

## 14. Improvement experiment
Go beyond the paper: the authors never combine behavioral profiles with identity-based ratings (listed as future work #6). The GSE experiment is a hybrid — stack the Sim2Win-style rolling behavioral features WITH team-strength priors (Elo/Glicko, market-implied ratings) in one GBM, and test on LO-season-out whether the combination beats either alone. Hypothesis: behavioral features capture short-term form/tactical shifts while ratings anchor long-term strength — the hybrid should dominate, directly testing the paper's open question on NFL data.
