# 0622 DeepHit Time-to-Injury Forecasting (arXiv:2601.19479v1)

**Citation:** Catterall, V., Lynch, S. et al. *Forecasting time-to-injury in elite women's football with DeepHit* (arXiv:2601.19479v1). URL: https://arxiv.org/abs/2601.19479
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — survival-based time-to-injury forecasting with per-player-day SHAP explanations is the right *formulation* for NFL availability risk (rank by imminent risk, not binary flags); the C-index 0.762 comes with a wide LOPO spread (IQR 0.192) and heavy missingness, so port it with the imputation discipline, not the headline number.

## 1. Research question
Can a DeepHit neural survival network forecast *time to injury* (not just binary injury/no-injury) from longitudinal athlete-monitoring data in elite women's football, and can its predictions be made interpretable enough for practitioners to trust?

## 2. Dataset / schema
- **SoccerMon, Team B subset:** 37 players from two elite Norwegian women's first-division teams, 322 recorded days, 2020–2021.
- After preparation: **4,449 player-date observations, 39 features, 43 injuries**.
- Features: subjective wellness (PmSys athlete-monitoring self-reports: stress, mood, sleep, soreness, fatigue, readiness), objective training data (STATSports APEX GNSS: speed, positioning, exertion, heart rate), plus a derived weekly missingness-rate indicator and a proportion-of-missing-responses feature.
- Data collection: 15 of 37 players had ~half their training-day data missing; subjective features more missing than objective ones; only 21 players present from the start of collection; more injuries recorded in season two than season one.
- Access: SoccerMon data openly available at **https://zenodo.org/records/10033832**; **objective injury-report data NOT openly available (legal restrictions)**.

## 3. Method / model
- **DeepHit** with a **multilayer perceptron (MLP) backbone** — deliberately not an RNN backbone, because data limitations (irregular spacing, heavy missingness) made the recurrent variant infeasible (stated).
- **21-day input window, 7-day prediction horizon** — the window design follows Jarmann (2023), previously successful on this dataset.
- Event indicator: 1 = injury, 0 = censoring (no injury observed in the collection period).
- Three imputation strategies compared: median imputation, linear interpolation, and a **bespoke formula** (teammate-relative); the bespoke formula imputed the fewest values but best preserved the data distribution and univariate injury correlations.
- Baselines (grid-search optimized): random forest, XGBoost, logistic regression — trained on current-day data to predict next-day injury, with rolling-average features for the expanded-window experiments (3/5/7/10/14-day horizons tested; horizons beyond one day degraded badly, so not pursued).
- Explainability: SHAP analyses for the best-LOPO player, both season-wide and on specific high-risk days.
- Validation: chronological 80/20 train/test split AND leave-one-player-out (LOPO) validation.

## 4. Equations & assumptions
The paper uses the standard DeepHit formulation (Lee et al. 2018) without reprinting its loss; per the cited method, the network outputs a probability mass function over discrete time bins for the first-hitting-time of injury, trained with a combined log-likelihood + ranking loss. The paper's own stated assumptions: censoring is non-informative; the 21-day window captures the relevant etiological period; missingness handled by imputation does not distort the risk ordering (the authors show the bespoke method preserves univariate injury correlations to defend this).

## 5. Features / target
- Inputs (39): GNSS load metrics, heart-rate summaries, subjective wellness (stress, mood, sleep quality, soreness, fatigue, readiness), derived missingness indicators, prior-injury count, monotony.
- Target: **time to next injury** within a 7-day horizon, as a discrete survival distribution (DeepHit); baselines use binary next-day injury labels.
- Most influential features (global importance): average running speed, soreness, monotony, prior injury count. Surprises: session *time* more important than expected (likely a proxy for session type); ACWR, sprint metrics, and subjective stress contributed little; **subjective missingness emerged as a key predictor** — players withholding responses may anticipate injury or disengage from recovery protocols.

## 6. Validation design
- **Chronological train/test (first 80% / last 20%)** — the honest deployment-mimicking split.
- **Leave-one-player-out (LOPO)** — one C-index per held-out player; the generalization-to-new-players test.
- Baselines: grid-search optimized, evaluated on F1/precision/recall/AUC with a bespoke weighted formula prioritizing F1 and recall.
- Primary DeepHit metric: **concordance index (C-index)** — the standard survival metric, measuring correct pairwise risk ranking.

## 7. Numerical results / baselines
- Baselines (next-day prediction): RF **F1 0.533, AUC 0.779, precision 1.000, recall 0.364**; XGBoost **F1 0.429, AUC 0.876, precision 1.000, recall 0.271**; logistic **F1 0.071, AUC 0.758, precision 0.037, recall 0.833**. (RF: zero false positives, caught 36.4% of injuries.)
- Literature context (Leckey et al. 2024): sports-injury models average AUC 0.69 and F1 0.73 — the RF beats the AUC average but misses the F1 average.
- DeepHit chronological: **C-index 0.660** (linear interpolation) → **0.762** (bespoke imputation).
- LOPO: **IQR of C-index = 0.192**; best player 0.974; correlation of C-index with sessions tracked r = 0.44, with injury count r = −0.08. High within-player load variance and outlier-vs-teammate profiles hurt generalization.
- SHAP case study: the model's risk peaked ahead of a real injury twice; elevated stress + high-intensity running + low mood + low sleep (and fatigue on the peak day) drove the flag; readiness and longer sleep were modestly protective. The flagged period preceded an acute thigh injury.
- Paper's own verdict: C-index 0.762 is "acceptable-to-strong" (Longato et al.: >0.7 acceptable, >0.8 strong) given the dataset's difficulty.

## 8. Code / data availability
- Code: **https://github.com/simulamet-host/soccermon-deephit** (public, no DOI).
- Data: **https://zenodo.org/records/10033832** (SoccerMon; injury labels restricted).

## 9. Leakage & limitations
- The bespoke imputation is "teammate-relative": imputing a player's missing load from teammates' observed loads assumes teammates' sessions proxy the missing player's — plausible in team training, but it borrows information across players in a way that could inflate the C-index if teammates' injury-adjacent patterns leak.
- LOPO IQR of 0.192 is a flashing light: for a large fraction of players the model is near-useless. The 0.762 headline is a chronological-split number on a dataset where season two had more injuries — some of the lift may be distribution shift, not model quality.
- MLP backbone (not RNN) because the data couldn't support recurrence — the temporal modeling is therefore shallow; Dynamic-DeepHit is named as future work.
- Baseline horizons beyond one day "led to significant reductions in performance" and were abandoned — the binary baselines effectively only work next-day, which limits their operational value and flatters DeepHit's 7-day horizon comparison.
- 43 injuries, all from two teams in one league: external validity is unproven, and women's-football load/injury dynamics need not transfer to the NFL.
- The subjective-missingness predictor is a double-edged sword: in deployment, players who learn the system may game their questionnaire responses.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. No survival modeling and no injury forecasting exist in the GSE corpus; the nearest methodological neighbors are the state-space team-strength and Bayesian items in the commissioned (results-not-yet-in) 15-area ML brief. This is a **new capability** — and a formulation upgrade over the binary injury classifiers in ledgers 0619/0621: ranking players by *imminent* risk is the decision variable load management and prop pricing actually need.

## 11. GSE implementation spec
- Data: nflverse play-by-play (snaps, touches, routes), public injury reports (DNP/limited/full), rest/travel/surface features; target = days until next injury-report designation or missed game (censored at season end).
- Build: reimplement DeepHit (Lee et al. 2018) in PyTorch with an MLP backbone over a 21-day feature window; discrete 14-day horizon; combined log-likelihood + ranking loss as in the original paper. Imputation: forward-fill + teammate/position-group-relative fill for practice participation (port of the bespoke formula), with a missingness-indicator feature retained (the paper shows it carries signal).
- Validation: chronological splits + leave-one-team-out (the NFL analog of LOPO — tests generalization to unseen teams).
- Explainability: SHAP per player-week, surfaced as "top 3 risk drivers" in the props dashboard.
- Effort: ~2–3 weeks (DeepHit reimplementation + survival target plumbing on nflverse are the bulk).

## 12. Reproducible test
Dataset: nflverse 2020–2025 + public injury reports; per-player-day panel, 21-day windows, 14-day horizon. Baselines: gradient-boosted binary classifier (next-week injury) and a Cox proportional-hazards model on the same features. Metric: C-index on a chronological 2025 holdout + leave-one-team-out C-index distribution. Beat bar: DeepHit C-index ≥ Cox C-index + 0.03 on the chronological holdout.

## 13. Acceptance / rejection gate
ADOPT iff DeepHit's chronological-holdout C-index ≥ 0.70 (the paper's "acceptable" bar) AND beats the Cox baseline by ≥ 0.03, with leave-one-team-out IQR ≤ 0.15 (tighter than the paper's 0.192 — NFL data is denser). If IQR > 0.20, reject for deployment but keep for research: the paper's own spread shows this formulation can be player-lottery. Gate set before running the test.

## 14. Improvement experiment
Add **time since last injury** as an explicit input and a **recurrent (GRU) backbone** over evenly-spaced weekly aggregates (the paper names both as future work it couldn't do). Why it might win: reinjury risk is the strongest known clinical predictor and the paper's MLP cannot represent "days since last injury" dynamics; a GRU over regular weekly steps handles the temporal structure the MLP flattens — with NFL data density (weekly games, daily practice reports) the missingness problem that blocked the authors is far milder.
