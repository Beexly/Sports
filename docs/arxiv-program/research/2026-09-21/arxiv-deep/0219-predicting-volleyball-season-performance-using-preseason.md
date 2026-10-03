# [0219] Predicting Volleyball Season Performance Using Pre-Season Wearable Data and Machine Learning (arXiv:2503.08100v1)

**Citation:** Melik Ozolcer, Tongze Zhang, Sang Won Bae (2025). *Predicting Volleyball Season Performance Using Pre-Season Wearable Data and Machine Learning*. arXiv:2503.08100v1. URL: https://arxiv.org/abs/2503.08100
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1548 lines).
**Verdict:** REJECT — wrong domain with no realistic transfer path: N=14 (3 positives), volleyball-specific target, and GSE has no access to player-level wearable data, so the method cannot be ported to NFL prediction.

## 1. Research question
Can season-long volleyball performance (good vs. poor, binarized from average hit percentage) be predicted for individual collegiate players using only passively collected pre-season Fitbit wearable data plus ecological momentary assessment (EMA) surveys, with predictions available early enough that targeted interventions could change outcomes? The authors also ask which season phase (fall practice, winter break, January camp) and which feature categories carry the most signal, and how subjective psycho-physiological states relate to objective performance.

## 2. Dataset / schema
- **Cohort:** 17 male collegiate volleyball players (Stevens Institute of Technology, ages 18–22, mean 20.5), IRB #2022-050; recruited in two waves (10 in Oct 2022, 7 in Jan 2023). **3 excluded** (1 insufficient games, 1 libero with no hit score, 1 inadequate data) → **N=14** in modeling, minimum 8 depending on phase.
- **Wearable data:** Fitbit Charge 5, 26 weeks total; modeling uses 12 weeks of pre-season data (Phases 1+2+3). 1-minute granularity for steps, distance, calories; heart rate ~8.5/min; daily HRV, RHR, sleep stages, breathing rate, VO2 max, SpO2. After a 70% daily compliance cutoff (≥8,768 HR readings/day): 544 days total, 6–79 days/player, 38.86 days mean. 6,263 missing values of 39,168 cells (16%).
- **EMA surveys:** daily morning (10AM) + evening (9PM) ratings 1–7 on injury risk, readiness, recovery, soreness, tiredness, mood, stress, sleep quality, perceived performance, productivity. 390 survey-days total across Phases 1–3 (27.86 days/player, range 1–75).
- **Ground truth:** official NCAA box scores from the team website; season-average hit percentage = (Kills − Errors)/Attempts. Binarized at 0.2 by head-coach threshold: >0.2 "good" (11 players), <0.2 "poor" (3 players). Note: the team won the national championship.
- **Access:** proprietary, single-team, single-season data — not public, not replicable by GSE.

## 3. Method / model
Three-step daily feature extraction: (1) statistical aggregations to daily granularity; (2) domain features — sedentary metrics (levels 0–33/34–67/68+ steps, bouts, breaks), sleep-stage DFA, HR statistics/skewness/kurtosis/DFA/second-order stats (inertia, local homogeneity, correlation, energy)/entropy, day-over-day RHR and HRV changes, SpO2 stats + DFA + Hurst exponent; (3) Hurst exponent estimated from slope of log-log DFA plot across window sizes. Feature selection per phase combination: drop features with pairwise Pearson |r| > 0.7, then univariate F-test for between-class mean differences (keep p < 0.05). Preprocessing: mean imputation, min-max normalization to [0,1] with normalization parameters fit on training data only, SMOTE on training data. Five classifiers compared (XGBoost, LightGBM, random forest, linear SVM, Gaussian NB) with equal Optuna hyperparameter tuning. XGBoost selected (F1 0.5819 vs RFC 0.5681, paired t-test p=0.027), then 7 phase combinations evaluated with XGBoost. Leave-one-subject-out (LOSO) CV, bootstrapped with 10 iterations, metrics averaged (SD in parentheses).

## 4. Equations & assumptions
- Hit percentage: `Hit % = (Kills − Errors) / Attempts`. (Kills = successful attacks earning a point; Errors = attacks conceding a point; Attempts = total attack attempts.)
- Binarization threshold: hit score > 0.2 → "good" (class 0); < 0.2 → "poor" (class 1), per head-coach criterion.
- Assumptions (author-stated or implicit): (a) coach's 0.2 threshold is a valid good/poor separator; (b) pre-season passive physiology proxies season attacking performance; (c) LOSO folds are independent across athletes (no team-level confounds); (d) mean imputation and SMOTE synthetic samples preserve the minority-class distribution; (e) Hurst exponent estimated from DFA log-log slope is stable on 10–60 min windows; (f) players wore devices honestly during training.

## 5. Features / target
- **Input features (72 total, grouped):** movement (step/distance/calorie aggregations, sedentary time/bouts/breaks), sleep (stage durations, DFA of sleep-stage series, sleep efficiency), cardiovascular (HR stats, skewness, kurtosis, DFA, entropy, second-order stats, RHR, daily HRV, day-over-day RHR/HRV change), respiratory (breathing rate, VO2 max, SpO2 stats/skewness/kurtosis/DFA/Hurst exponent), plus high-level features (Hurst exponents). 13 survived the F-test for Phase 2+3, led by HRV (F=86.279), breathing rate (F=60.780), total sedentary time (F=46.942), HRV change (F=46.905).
- **Target:** binary season performance: good (hit% > 0.2) vs poor (hit% ≤ 0.2), labeled from Phase 4 in-season data. Prediction horizon: full season ahead, from pre-season data.

## 6. Validation design
- **Split:** leave-one-subject-out cross-validation (train on N−1 athletes, test on 1), bootstrapped with 10 iterations. Time ordering respected in the sense that features (Phases 1–3) precede labels (Phase 4) — a genuinely prospective design within the season.
- **Backtesting protocol:** no cross-season backtest (single season only); 7 phase combinations compared to test phase sensitivity.
- **Baselines compared:** the five classifiers against each other on Phase 1+2+3 data; phases compared using XGBoost.
- **Metrics:** accuracy, F1, precision, recall, AUROC, AUPRC; t-test for classifier F1 differences; Spearman ρ correlations for EMA/game-stat analyses with p-values.

## 7. Numerical results / baselines
- **Classifier comparison (Phase 1+2+3), LOSO:** XGB — accuracy 0.7925 (0.004), F1 0.5819 (0.011), precision 0.6949 (0.008), recall 0.5007 (0.015), AUROC 0.6807 (0.013), AUPRC 0.6030 (0.013); RFC — F1 0.5681 (0.014); LGB — F1 0.5605 (0.022); SVM — F1 0.4123 (0.020); GNB — F1 0.3324 (0.000). XGB > RFC significant at p=0.027.
- **Phase comparison (XGBoost):** Phase 2+3 (55 days): accuracy 0.8645, F1 **0.7549**, precision 0.7857, recall 0.7264, AUROC 0.8236, AUPRC 0.7776 — best. Phase 1+2+3 (81 days): F1 0.5948. Phase 1: F1 0.5714; Phase 2: 0.5988; Phase 3 (9 days): F1 0.2273; Phase 1+2: 0.5643; Phase 1+3: 0.6436.
- **Top features (F-test, Phase 2+3, all p < 0.05):** HRV F=86.279, poor 87.000 (29.455) vs good 49.326 (19.131); breathing rate F=60.780; total sedentary time F=46.942; HRV change F=46.905; HR skewness F=19.374; sleep efficiency F=15.211 (poor 92.471 (4.509) vs good 82.624 (20.682)); VO2 max F=11.610; sedentary break total F=10.908; sedentary break std F=10.447; HR min F=7.173; sedentary bout std F=5.375; SpO2 skewness F=4.398; SpO2 Hurst exponent F=4.169.
- **EMA ↔ season hit average (Phase 1+2+3):** perceived stress ρ=−0.228 (p<0.001); perceived injury risk ρ=+0.116 (p=0.022); perceived productivity ρ=+0.140 (p=0.006). Perceived performance ↔ same-day hit% in Phase 4: ρ=+0.346 (p=0.002), linear slope 0.11.
- **In-season (Phase 4) feature correlations:** SpO2 std ρ=−0.430 (p=0.006); SpO2-DFA-60 ρ=−0.424 (p=0.006); RHR change ρ=+0.387 (p=0.014); total sedentary time ρ=+0.376 (p=0.014).
- **Position trends:** middle hitters improved β=+0.0040/day (p=0.003); outside hitters flat (interaction β=−0.0040, p=0.013); setters declined (−0.0015/day). (My interpretation: these are the paper's OLS trend claims, not independently verified.)

## 8. Code / data availability
None stated — no repository link, no dataset release mentioned. Proprietary single-team data.

## 9. Leakage & limitations
- **Severe class imbalance:** only 3 of 14 athletes in the "poor" class; SMOTE synthesizes minority samples from n=3, so the F1=0.75 headline rests on synthetic data and ~2–3 real minority subjects in LOSO. Extremely fragile.
- **Single team, single season, national champions:** team-level confounds (coaching, schedule, championship-season motivation) cannot be separated from physiology; zero external validity beyond this roster.
- **Adversarial note on F-test feature selection:** the F-test and SMOTE appear to be applied per phase combination; if any selection step touched held-out subjects or normalization/statistics leaked across the train/test boundary before LOSO splitting, metrics inflate — the text states normalization sampling is "strictly from the training data," which is correct practice, but feature selection timing relative to LOSO folds is not stated explicitly. This is a material ambiguity.
- **Feature-physiology signs are counterintuitive** (poor performers have higher HRV, higher sleep efficiency, slightly higher VO2 max) — the authors attribute this to under-training, but it equally reads as the target being confounded by position/role (e.g., setters/hitters differ structurally; the libero was excluded for exactly this reason).
- **EMA correlations computed on available cases** with tiny per-phase samples; p<0.05 uncorrected across many items/phases = likely multiple-testing noise.
- **Position specificity:** position was not used as a feature but OLS shows it drives trends; a position-confounded classifier is nearly certain at N=14.
- **External validity to NFL:** none direct. GSE has no access to player wearables, and the NFL target (game outcomes, props) is not a season-long individual-fitness prediction. The portable part is generic ML plumbing, already covered.

## 10. GSE overlap
- **New capability check:** the existing-research-map shows no wearable/preseason-readiness work in Garrett's corpus — but also no data source that would support it. The ML brief's gap list mentions causal injury impact as thin, not passive-sensor performance prediction.
- **Duplicate vs extension vs new:** the pipeline pattern (LOSO CV, pairwise-correlation pruning + F-test selection, SMOTE, Optuna tuning, bootstrapped CV) is generic best practice with no overlap advantage; the domain content (volleyball hit%, Fitbit physiology) is **not portable** — GSE's data sources (nflverse play-by-play, FTN charting, odds APIs, NGS tracking) contain nothing analogous to continuous player physiology.
- **Verdict on overlap:** functionally no overlap and no transfer path — classified as REJECT, not a gap to fill.

## 11. GSE implementation spec
No implementation is warranted (verdict REJECT). If the verdict ever changed, the port would require: (1) a data source that does not exist publicly — continuous athlete physiology (only obtainable via team partnerships or wearable-opt-in fan datasets); (2) an NFL target analogous to season hit% (e.g., season PFF grade or EPA above replacement); (3) N≥100 athletes across multiple seasons before any claim is credible. Effort is therefore not estimated beyond "blocked on data access."

## 12. Reproducible test
Not applicable — the dataset is proprietary and unshared (Section 8), so no independent reproduction is possible. A notional test would require a multi-season, multi-team wearable + performance dataset that GSE does not possess and cannot purchase.

## 13. Acceptance / rejection gate
REJECT — no gate needed. (For the record: the gate that would be required for any future adoption is F1 ≥ 0.70 under LOSO on an independent season with N ≥ 30 athletes and ≥8 in the minority class, with feature selection nested inside CV folds and position included as a covariate.)

## 14. Improvement experiment
The one credible follow-up is a multi-team, multi-season replication (N ≥ 100) with position as a covariate and feature selection strictly nested inside LOSO folds, replacing SMOTE with class-weighted loss — this would test whether the F1=0.75 survives real sample size or collapses, which is the paper's only load-bearing claim.
