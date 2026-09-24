# [0788] Evaluating State of the Art, Forecasting Ensembles- and Meta-learning Strategies for Model Fusion (arXiv:2203.03279v3)

**Citation:** Pieter Cawood, Terence van Zyl (2022). *Evaluating State of the Art, Forecasting Ensembles- and Meta-learning Strategies for Model Fusion*. arXiv:2203.03279v3. URL: https://arxiv.org/abs/2203.03279v3
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, /tmp/arxiv750-cache/fulltext/2203.03279.txt — complete paper: abstract, sections 1–4, all tables 1–4, figures, references; read all ~562 wrapped lines).
**Verdict:** ADAPT — the M4-scale comparison gives GSE a ranked menu of fusion methods: gradient-boosted feature-weighted averaging (FFORMA) beats model selection and simple averaging, and NN-stacking wins when base learners perform similarly; adapt by porting FFORMA-style weight learning to GSE's model-probability outputs rather than time-series features.

## 1. Research question
Which late model-fusion (ensembling) strategy best integrates a strong hybrid model (ES-RNN, the M4 winner) with traditional statistical base learners (Auto-ARIMA, Comb, Damped Holt, Theta)? Methods compared: simple arithmetic averaging (AVG), FFORMA (XGBoost feature-weighted averaging), FFORMS-R (random-forest model selection), FFORMS-G (gradient-boosted model selection), NN-STACK (MLP stacking regression over base forecasts + series statistics), FFORMA-N (MLP softmax model weighting). Benchmark: N-BEATS (SOTA deep model, excluded from ensembles).

## 2. Dataset / schema
- M4 forecasting competition dataset: 100,000 univariate time series across six frequencies — Yearly 23,000, Quarterly 24,000, Monthly 48,000, Weekly 359, Daily 4,227, Hourly 414. Domains: micro, industry, macro, finance, demographic, other. Horizons: 6 (yearly), 8 (quarterly), 18 (monthly), 13 (weekly), 14 (daily), 48 (hourly). Public: https://github.com/Mcompetitions/M4-methods.
- Base-learner forecasts reused from original M4 submissions (not re-estimated by authors).
- No sports/NFL data; univariate economic/demographic series.

## 3. Method / model
- Late model fusion: base learners trained independently, then fused. FFORMA: XGBoost meta-learner predicts model weights from 43 tsfeatures meta-features, softmax over base learners, weighted-average loss objective with custom gradient G_nm = w_nm(L_nm − L̄_n) and Hessian H_nm ≈ w_nm(L_nm(1−w_nm) − G_nm); hyperparameters via Bayesian optimization (300 runs, GP), early stopping patience 10.
- NN-STACK: MLP regression over (base forecasts + Spearman-selected meta-features), ReLU, Adam, MAE loss; deep (11 layers) for Hourly/Weekly, shallow (3×10) elsewhere.
- FFORMA-N: MLP with softmax output trained to one-hot best-model labels, categorical cross-entropy.
- Validation: 10-fold CV repeated 5 times (50 validation sets), seeds 1–5; hyperparameters tuned on first fold of first run only.
- Metrics: sMAPE, MASE, OWA = ½(MASE/MASE_Naive2 + sMAPE/sMAPE_Naive2); median OWA emphasized (Eğrioğlu–Fildes critique of mean OWA skewness); Schulze rank aggregation.

## 4. Equations & assumptions
- sMAPE (Eq. 1), MASE (Eq. 2), OWA (Eq. 3) as stated in paper.
- AVG: ŷ_t = (1/n) Σ_m y_{m_t} (Eq. 11).
- FFORMA weights: w_m(f_n) = exp(p_m(f_n))/Σ_m exp(p_m(f_n)) (Eq. 12); weighted loss L̄_n = Σ_m w_m(f_n) L_nm (Eq. 13); gradient (Eq. 14), Hessian (Eq. 15).
- ES-RNN preprocessing (Eqs. 4–6): level/seasonality decomposition with smoothing params α,β,γ; forecast reconstruction (Eqs. 7–9): ŷ = exp(RNN(x)) × l_t × seasonality terms; pinball loss (Eq. 10) with τ∈[0.45,0.49] plus level-variability penalty (×50–100).
- Assumes reuse of original M4 base forecasts; meta-features computed via tsfeatures (43 features; seasonal-only set to zero for nonseasonal series); hyperparameter search spaces chosen from "preliminary results and rules-of-thumb."

## 5. Features / target
- Meta-features: 43 tsfeatures statistics per series (trend, seasonality strength, autocorrelation, spectral entropy, etc.); domain one-hot only for ES-RNN input, not FFORMA. NN-STACK/FFORMA-N: Spearman-selected subset of features correlated with model-performance change.
- Target: future series values at horizon h; loss evaluated on OWA.

## 6. Validation design
- 10-fold CV × 5 repeats over the 100k series, scores averaged across all 50 validation sets. Metrics computed on held-out series. Baselines: four statistical base learners, ES-RNN alone, simple AVG, N-BEATS (results reproduced from Oreshkin et al. 2019).
- Time-ordering: standard M4 train/test split (fixed test window at series end); cross-validation folds split series, not time — fine for comparing fusion methods but not a true walk-forward.

## 7. Numerical results / baselines
- Average OWA (Table 3): FFORMA — H 0.415, D 0.983, W 0.725, M 0.800, Y 0.732, Q 0.816; vs AVG — 0.847/0.985/0.860/0.863/0.804/0.856. N-BEATS — M 0.819, Y 0.758, Q 0.800. FFORMA beats ES-RNN base learner on all six subsets.
- Median OWA + Schulze ranks (Table 4): FFORMA rank 1 (median OWAs H 0.318, W 0.529, M 0.602, Y 0.491, Q 0.580); ES-RNN rank 5; AVG rank 7; Theta rank 11.
- Hourly: FFORMA 0.415 vs AVG 0.847 (more than 2× better); NN-STACK failed badly on Hourly (1.427) — small sample (414 series) + long horizon (48).
- Daily: the only subset where ES-RNN did NOT beat other base learners (distributions nearly identical); NN-STACK was the best ensemble (median 0.646, avg 0.927) — "stacking the only successful ensemble when all base learner performances are similar."
- Median improvements of FFORMA over ES-RNN: Hourly 0.059, Weekly 0.017, Monthly 0.037, Yearly 0.056, Quarterly 0.030.
- Key conclusions: gradient-boosted ensembles > neural-network ensembles generally; weighted averaging (FFORMA, FFORMA-N) > selection (FFORMS-R/G) > stacking (NN-STACK) except in the similar-performers regime.

## 8. Code / data availability
Code: https://github.com/Pieter-Cawood/FFORMA-ESRNN. Data: M4 dataset + base forecasts at https://github.com/Mcompetitions/M4-methods. Stated in paper.

## 9. Leakage & limitations
- Hyperparameters tuned on fold 1 of run 1 and applied to all 50 validation sets — single-fold tuning, potential overfit to that fold's series; no nested CV.
- Base forecasts reused from M4 submissions: authors did not control or audit them; any leakage in those submissions propagates.
- N-BEATS numbers reproduced from another paper, not rerun — comparison is second-hand.
- Mean-OWA critique: paper acknowledges Egrioglu–Fildes that average OWA is skewed; conclusions hold on medians, but some headline claims mix the two.
- ES-RNN input windows/division hyperparameters were "defined after experimentation" — undocumented tuning.
- Daily-subset NN-STACK win is a single small-subset result (4,227 series); the paper's "stacking works when performers are similar" rule rests on that plus reasoning, not replication.
- Univariate series only — no direct test of the fusion methods on multivariate/panel sports data.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: the 2026-09-18 15-area ML brief commissions "ensembling" (results not yet in repo); Garrett's CEPT is his own ensemble theory. Nothing in the map records a FFORMA-style meta-learned weight blender or a stacking-vs-averaging comparison in the GSE codebase — this is new capability, not duplicate. Adjacent: the FEBAMA ledger (0787, same program) covers Bayesian feature-weighted averaging; this paper adds the empirical ranking that gradient boosting > neural meta-learners and that plain stacking wins only when base learners are near-tied — practical selection guidance.

## 11. GSE implementation spec
- Implement three fusion candidates over GSE's constituent model probabilities per game/market:
  (a) FFORMA-style: LightGBM meta-learner trained on game "meta-features" (spread bucket, total, market disagreement, recent ATS form volatility, days rest, weather flags) → softmax weights over models; custom objective minimizing weighted log-loss (mirror Eqs. 13–15 with log-loss as L_nm).
  (b) NN-STACK analogue: small MLP regressing outcome on (model probs + meta-features).
  (c) Plain AVG baseline.
- Training: per-season historical picks (2022–2024), 5-fold season-stratified CV; weights learned on weeks 1–9, applied weeks 10–18 (walk-forward).
- Selection rule (from the paper): default to (a); switch to (b) when base-learner recent-accuracy CVs are within 5% of each other (the "similar performers" regime).
- Effort: ~2 weeks; LightGBM is cheap; the meta-feature pipeline is the bulk of work.

## 12. Reproducible test
Dataset: GSE engine picks 2022–2024 NFL, spread/moneyline/total, per-model probabilities + outcomes. Meta-features computed from pre-game data only. Baselines: SA of model probs; current GSE blend (if any — else SA). Candidates: FFORMA-style LightGBM weights and NN-stack. Metric: mean log-loss (primary) + Brier (secondary), walk-forward by season (train ≤2023, test 2024). DM-style test vs best baseline.

## 13. Acceptance / rejection gate
ADAPT accepted if FFORMA-style blender beats SA by ≥2% relative log-loss on the 2024 walk-forward AND beats the NN-stack in ≥2 of 3 markets; if base learners are near-tied (CV within 5%) and NN-stack wins instead, accept the regime-switching rule as the adapted artifact. Reject if neither beats SA by ≥1.5% — then the data regime doesn't support meta-learned weights.

## 14. Improvement experiment
Replace the paper's generic time-series meta-features with a sports-native, market-relative feature set, and add a second-stage "market shrinkage" blender: learn weights w_market and w_ffoma via a single ridge meta-regression on (market-implied prob, FFORMA blend) against outcomes, testing whether a market-aware second level beats the pure FFORMA blend on CLV-anchored log-loss (log-loss vs closing-line probability). This is the two-level fusion the paper never tests: feature-weighted model averaging inside, market-implied shrinkage outside.
