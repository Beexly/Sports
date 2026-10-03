# 0621 SoccerGuard: Injury Prediction Framework (arXiv:2411.08901v1)

**Citation:** SoccerGuard authors. *SoccerGuard: an injury prediction framework* (arXiv:2411.08901v1). URL: https://arxiv.org/abs/2411.08901
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the 90-scenario input/output-window sweep is the usable artifact (5-session input lifts F1 ~41%, 7-day output horizon lifts F1 ~336%); the raw classifier performance (TPR 0.014) is a warning label, not a model to copy. Treat adversarially.

## 1. Research question
How do input window length, output (forecast) horizon, class-imbalance handling, and model choice affect soccer injury prediction on the SoccerMon dataset — and which combination, if any, is practically usable?

## 2. Dataset / schema
- SoccerMon-derived: **4,448 data points, 37 players, February 2020 – November 2021, 114 attributes, only 43 injury points** (~1% event rate).
- Attributes: GPS/training load, wellness questionnaires, session features (the SoccerMon schema; see ledger 0622 for the data's public availability).
- Access: derived from the public SoccerMon release; the paper's exact scenario construction is described but no per-scenario data dump is linked.

## 3. Method / model
- Grid of **90 scenarios**: input windows of **3/5/7 sessions** × output windows of **1/3/7 (days)** × class-proportion treatments × **5 models** (logistic regression, random forest, XGBoost, SVC, LSTM).
- **45 Monte Carlo cross-validation rounds** per scenario; **no hyperparameter tuning** (defaults throughout — stated).
- Class imbalance handled by synthetic oversampling (SMOTE-family) variants within the scenario grid.

## 4. Equations & assumptions
No novel equations; standard classifiers with default hyperparameters. Assumptions: synthetic oversamples represent real injury precursors; Monte Carlo CV rounds are comparable across scenarios; a 1–7 day output horizon is the decision-relevant window for practitioners.

## 5. Features / target
- Inputs: 114 SoccerMon attributes aggregated over the input window (3/5/7 sessions).
- Target: binary injury occurrence within the output window (1/3/7 days).
- The scenario grid is the actual object of study — features are held fixed while windows, imbalance handling, and models vary.

## 6. Validation design
- 45 Monte Carlo CV rounds per scenario; precision, recall/TPR, F1, AUC reported per scenario.
- Baselines: the five models against each other across the scenario grid (no external benchmark).
- Splits are Monte Carlo random splits — **not time-ordered** (a weakness; see §9).

## 7. Numerical results / baselines
- Example scenario I-58 (random forest): **precision 0.623, TPR 0.014, F1 0.027, AUC 0.618** — high precision, near-zero recall: it almost never fires.
- Window effects (paper's headline findings): **5-session input improves F1 by 40.91% vs. 3-session input**; **7-day output horizon improves F1 by 336.36% vs. 1-day output**.
- Authors' recommendation: **logistic regression first, then LSTM** — but note this is asserted over models whose absolute TPRs are tiny (see §9).

## 8. Code / data availability
No code URL stated in the paper. Data derives from SoccerMon (public; see ledger 0622 for the Zenodo link). The paper's scenario-construction code is not linked.

## 9. Leakage & limitations
- **43 injuries** is a microscopic event count; 90 scenarios × 45 MC rounds on 43 events is a multiple-comparison minefield — the "best scenario" is substantially selected by noise.
- Monte Carlo (random) splits on longitudinal data leak the future into training: a player's later sessions can train a model tested on his earlier ones. For injury forecasting this is a first-order flaw; the paper never runs a chronological split (contrast ledgers 0619 and 0622, which do).
- The headline example (RF precision 0.623) has **TPR 0.014**: it catches 1.4% of injuries. A model that almost never predicts injury will show high precision on 43 events by luck alone.
- Synthetic oversampling on 43 events manufactures most of the "injury" class the models learn from.
- No hyperparameter tuning means the model ranking (LR > LSTM > others) may reflect default-settings luck rather than true suitability.
- External validity to NFL: none demonstrated; soccer session data again.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. No injury-prediction capability exists in the GSE corpus; the map's rest/bye and workload-adjacent game-context features are the nearest neighbors. The 90-scenario *methodology* (window-sweep discipline) is a **new capability** for GSE's experimental practice: it is a protocol to adopt, not a model. Overlaps with ledgers 0619 and 0622 only in that all three attack injury forecasting — this one contributes the window-sweep protocol, not results.

## 11. GSE implementation spec
- Adopt the scenario-grid protocol for the NFL injury model (ledger 0619 §11): sweep input windows (1/2/3/4 weeks of practice-load features) × output horizons (1/2/3 weeks) × imbalance treatments on the nflverse + injury-report dataset.
- Fix the paper's flaws in the port: **chronological splits only** (no Monte Carlo random splits), tune hyperparameters per cell, and report TPR alongside precision so degenerate never-fire models are visible.
- Serving: the chosen (input, horizon) cell becomes the production injury-risk feature for the props pipeline.
- Effort: ~1 week, mostly reusing the ledger-0619 feature pipeline.

## 12. Reproducible test
Same NFL dataset as ledger 0619 §12 (injury reports 2022–2025 + nflverse snaps). Run the window grid: input {7, 14, 21, 28 days} × horizon {7, 14, 21 days}, logistic regression and gradient boosting, chronological train (2022–2024) / rolling test (2025). Metric: F1 and TPR at a fixed precision floor of 0.30. Success = reproducing the paper's directional finding (longer input and longer horizon improve F1) with TPR ≥ 0.30 in the best cell.

## 13. Acceptance / rejection gate
ADOPT the window-sweep protocol iff the best grid cell on the 2025 rolling test achieves TPR ≥ 0.30 at precision ≥ 0.30 with chronological splits. If no cell clears that bar, the paper's window effects do not survive honest validation — reject the protocol's conclusions while keeping the grid as an exploratory tool. Gate set before running the test.

## 14. Improvement experiment
Replace the fixed rectangular input window with a **decay-weighted window** (exponential decay over the past 28 days, decay rate tuned per position group) and re-run the grid. Why it might win: the paper's hard 3/5/7-session cutoffs discard older information discontinuously; a decay weight keeps long-horizon context while emphasizing recency, and it nests the paper's windows as a special case (decay → 0 beyond the cutoff) so it can only tie, never lose, on flexibility.
