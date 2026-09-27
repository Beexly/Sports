# 0619 Effective Injury Forecasting in Soccer (arXiv:1705.08079v2)

**Citation:** Rossi, A., Pappalardo, L., Cintia, P. et al. (2018). *Effective injury forecasting in soccer*. arXiv:1705.08079v2 (published PLOS ONE). URL: https://arxiv.org/abs/1705.08079
**Ledger completed:** 2026-09-21. **Read:** full text (PLOS ONE open access, https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0201264).
**Verdict:** ADAPT — a complete, battle-tested workload→injury forecasting template (EWMA/ACWR/monotony feature engineering, ADASYN on training folds, 10,000-repetition evaluation) that GSE can port to NFL practice-load and availability modeling, with precision limits stated honestly.

## 1. Research question
Can non-contact injuries in professional soccer be forecast from GPS-derived training workload data — and can the forecast be precise enough to be operationally useful, given that standard workload indices (ACWR, monotony, strain) have weak predictive value on their own?

## 2. Dataset / schema
- **Proprietary club data:** 26 professional male players, 23 weeks in 2014, 931 individual training sessions.
- The paper's constructed example table: **952 examples, 55 features, 23 non-contact injuries** (match injuries excluded; only training-session data).
- Key columns: 12 GPS workload features (total distance, high-speed running, accelerations, etc.), personal features (age, BMI, role), injury history features, derived workload indices.
- Access: proprietary; **transformed data available by request** to the authors. Not publicly downloadable.

## 3. Method / model
- Feature engineering: EWMA of workload features with **span 6**; ACWR with 6-day acute / 27-day chronic windows; monotony over seven days; prior-injury EWMA.
- Models: decision tree (with feature selection) as the headline model; random forest as the strong baseline. ADASYN synthetic oversampling applied **only on training folds**.
- Protocol: 30% of data for train/feature-selection/hyperparameter tuning, 70% as test split into **two stratified folds**; the whole pipeline **repeated 10,000 times**; plus a forward weekly simulation that rolls the model forward week by week to mimic real deployment.

## 4. Equations & assumptions
The paper does not print closed-form equations for the models (tree-based methods); the workload indices used are standard:
- EWMA (span 6) of each workload feature.
- ACWR = (6-day acute workload) / (27-day chronic workload).
- Monotony = weekly mean / weekly standard deviation over seven days.
- Assumptions: GPS workload proxies internal physiological load; non-contact injuries are at least partly workload-driven; ADASYN-generated injury examples lie on the true injury manifold; the 30/70 split is representative across 10,000 repetitions.

## 5. Features / target
- Inputs: 12 GPS workload features (with EWMA variants), personal features (age, BMI, role), injury-history features, ACWR, monotony, strain — 55 features total in the constructed table.
- Target: binary — non-contact injury occurring in the upcoming period (training-session-level example construction).
- Final selected features (decision tree): **prior-injury EWMA (importance 0.71), high-speed-running EWMA (0.23), total-distance monotony (0.06)** — only three features survived selection.

## 6. Validation design
- 30% train / feature-selection / hyperparameter subset; 70% test in two stratified folds; ADASYN oversampling confined to training folds; 10,000 repetitions of the full protocol.
- Baselines: the classic workload indices themselves as predictors (ACWR, MSWR), plus random forest.
- A forward weekly simulation: train on data up to week w, predict week w+1, roll forward — the deployment-mimicking test.
- Splits are time-aware in the forward simulation; the main 30/70 protocol is stratified rather than strictly chronological.

## 7. Numerical results / baselines
- Decision tree: injury **recall 0.80 ± 0.07, precision 0.50 ± 0.11**.
- Random forest: recall 0.87 ± 0.05, precision 0.41 ± 0.08.
- Baseline indices as predictors: **maximum precision ~6%; ACWR/MSWR below 4%** — i.e., the standard workload ratios are nearly useless as injury predictors in this data.
- Forward weekly simulation: **9 of 14 injuries detected, F1 0.60, precision 0.56**; performance **stabilized after 14 weeks** of the rolling protocol.
- Quote exactly as the paper's message: workload indices alone fail; a tree on EWMA/monotony features recovers most injuries at ~50% precision.

## 8. Code / data availability
No code URL stated. Data: proprietary club data; transformed data available by request to the authors. Nothing publicly downloadable.

## 9. Leakage & limitations
- n = 26 players, 23 injuries: a tiny event count. 10,000 repetitions of the protocol measure stability, not external validity — the model may be memorizing one club's 2014 season.
- ADASYN fabricates injury examples; with only 23 real injuries, the decision boundary is substantially shaped by synthetic points. Precision of 0.50 means half of all flagged sessions are false alarms — in a coaching context, that level of alarm fatigue gets the system ignored.
- Match injuries excluded: the model never sees the highest-intensity events (games), which biases the workload picture.
- EWMA span 6 and the 6/27-day ACWR windows are asserted, not tuned; the three surviving features include "prior-injury EWMA" with 0.71 importance, which is close to predicting injury from injury history — a legitimate signal, but partly tautological.
- External validity to the NFL: soccer training load (continuous running, GPS-tracked) maps poorly to football's collision-driven injury mechanisms; workload features would need to be rebuilt around practice intensity, contact exposure, and prior-injury history rather than running volume.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. The map's master metrics list includes **wind/weather and rest/bye** as game-context features, but **no injury-forecasting capability exists anywhere in the corpus** — no player-availability model, no workload-based injury risk, nothing in the 15-area ML brief results. This is a **new capability** with a direct props/DFS application: availability projections move prop lines and ownership. It extends nothing currently built; it would sit alongside the luck layer as a new "availability layer."

## 11. GSE implementation spec
- Data: NFL practice reports (DNP/limited/full), snap counts, prior-injury history from public injury reports; GPS-style workloads are not public for NFL, so proxy workload = snap counts, touches, days since last game, rest days, travel distance, surface type, age, BMI, position.
- Build: replicate the feature-engineering layer exactly — EWMA (span tuned 4–10) of snap/touch load, ACWR-style acute/chronic ratios on practice participation, monotony of weekly load, prior-injury EWMA — then a gradient-boosted tree (the paper's RF/DT lineage) predicting binary injury/designation in the next 1–2 weeks.
- ADASYN or SMOTE confined to training folds; evaluation by forward weekly simulation over 2022–2025 seasons, stratified by position group (skill positions vs. linemen have different mechanisms).
- Serving: weekly injury-risk scores per player, consumed by the props pipeline as an availability adjustment.
- Effort: ~1–2 weeks (feature pipeline on nflverse + injury-report scraping is the bulk of the work).

## 12. Reproducible test
Dataset: public NFL injury reports 2022–2025 joined to nflverse play-by-play snap counts. Baseline: a naive "prior injury in last 4 weeks predicts next injury" rule and an ACWR-analog rule. Metric: precision/recall at the operating threshold, plus F1 in a forward weekly simulation (train on seasons up to year Y, predict week-by-week in year Y+1), exactly mirroring the paper's deployment test. Windows: train 2022–2024, test 2025 season rolling.

## 13. Acceptance / rejection gate
ADOPT iff the model achieves precision ≥ 0.35 with recall ≥ 0.50 in the forward weekly simulation on the 2025 test season — the paper's 0.50/0.80 operating point, discounted for the loss of GPS fidelity. If precision < 0.25 at recall ≥ 0.50, reject: the false-alarm rate would poison the props pipeline. Gate set before running the test.

## 14. Improvement experiment
Replace the binary injury target with a **time-to-injury survival target** (DeepHit-style, see ledger 0622) and train the same EWMA/monotony features against it. Why it might win: the binary target wastes information about *when* in the window the injury struck; a survival head can rank players by imminent risk, which is the actual decision variable for load-management and prop pricing — and the paper's own forward simulation shows risk evolves week to week.
