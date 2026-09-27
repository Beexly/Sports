# [1120] Predicting Ulnar Collateral Ligament Injury in Rookie Major League Baseball Pitchers (arXiv:2207.00585v1)

**Citation:** Sean A. Rendar, Fenglong Ma (2022). *Predicting Ulnar Collateral Ligament Injury in Rookie Major League Baseball Pitchers*. arXiv:2207.00585v1. URL: https://arxiv.org/abs/2207.00585
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; the entire two-page podium abstract read).
**Verdict:** ADAPT — a compact, honest tabular injury-prediction protocol (47 Stathead features → K-best 13 → MLP AUC 0.674) worth porting to GSE's NFL player-availability modeling, with the paper's missing details treated as gaps to fill rather than results to trust.

## 1. Research question
Can rookie-season statistics predict which rookie MLB pitchers will later suffer an ulnar collateral ligament (UCL / Tommy John) injury?

## 2. Dataset / schema
- **8,503 rookie MLB pitchers** debuting after 1974; **47 features** from **Stathead**.
- Labels: public Tommy John surgery repository, joined to pitchers **by player name**.
- Class balance: **826 positive / 7,677 negative** (~1:10 imbalance).
- Access: Stathead is a paid proprietary source; the TJ repository is public but unnamed in the extracted text; no joined dataset released.

## 3. Method / model
- Split **80/20 "according to year"** (exact split years not stated); **oversampling applied to the training set**; **K-best feature selection reduced 47 → 13** (the 13 features are not listed).
- Models: KNN, Naive Bayes, XGBoost, Random Forest, Decision Tree, MLP (hyperparameters not stated).

## 4. Equations & assumptions
- **No equations stated.** Assumptions: (a) name-join between Stathead and the TJ repository is reliable; (b) rookie-season stats carry UCL signal; (c) oversampling the training set does not distort the test distribution (test handling of imbalance not stated).

## 5. Features / target
- Features: 47 Stathead features (exact list **not stated**); K-best selects 13 (not listed). Target: binary — underwent Tommy John surgery (yes/no). Horizon: career-after-rookie-season (exact window not stated).

## 6. Validation design
- Single 80/20 split by year; oversampling on train only (presumed); metric **ROC-AUC**. No cross-validation, no confidence intervals, no calibration reported. Baselines: the six models compared against each other only.

## 7. Numerical results / baselines
- ROC-AUC: KNN **0.5702**; Naive Bayes **0.5463**; XGBoost **0.6068**; Random Forest **0.6143**; Decision Tree **0.6329**; **MLP 0.6740** (best).
- Paper's claim: rookie-season features carry modest but real UCL signal; nonlinear models (MLP) beat tree ensembles here.

## 8. Code / data availability
- None stated in paper (no code link, no dataset link, no feature list).

## 9. Leakage & limitations
- **No feature list, no split years, no hyperparameters, no uncertainty intervals, no calibration** — a two-page podium abstract, so thinness is expected, but nothing here is independently reproducible. (b) **Name-join label noise**: TJ repository joined by player name — mismatches directly corrupt labels. (c) AUC 0.674 is modest; at 1:10 imbalance the precision at any usable recall is likely poor (not reported). (d) "Split according to year" without years — can't verify temporal cleanliness. (e) No comparison against a trivial baseline (e.g., innings-pitched workload alone).

## 10. GSE overlap
- Related: `0768-early-detection-injuries-mlb-pitchers-video.md` (arXiv:1904.08916 — same population, **video** modality; this paper is tabular — complementary, not duplicate); `0317-scalable-injuryrisk-screening-in-baseball-pitching.md` (baseball pitching injury — related). The map flags **"causal injury impact" as thin**. This paper is predictive, not causal — an **extension** of the injury-prediction cluster into tabular rookie-season features.

## 11. GSE implementation spec
- **Port to NFL:** rookie injury-risk (hamstring/ACL) from college workload + combine + rookie preseason features — the direct football analogue of "rookie-season stats → career injury".
- **Data:** nflverse (combine, college stats where available), NFL injury reports (labels), practice participation.
- **Protocol fixes:** publish the feature list; year-based splits with stated cutoffs; report PR-AUC + calibration alongside ROC-AUC; compare against workload-only baseline.
- **Model:** start with the paper's winner (MLP) plus XGBoost; add a survival (time-to-injury) formulation.
- **Effort:** ~2 engineer-weeks.

## 12. Reproducible test
- Dataset: 2015–2024 NFL rookies; features from college/combine/preseason; label = season-ending soft-tissue injury in first 3 seasons. Metric: ROC-AUC and PR-AUC on 2022–2024 forward test. Baselines: (a) workload-only logistic regression, (b) the paper's MLP recipe.

## 13. Acceptance / rejection gate
- **Adopt** if the NFL port achieves ROC-AUC ≥ 0.65 with 95% CIs excluding 0.5 on the forward test AND beats the workload-only baseline; **reject** otherwise. (The paper's 0.674 is the benchmark to meet-or-beat with honest uncertainty.)

## 14. Improvement experiment
- Replace binary classification with a **survival model** (time-to-first-injury, e.g., Cox or DeepHit-style): the paper throws away *when* the injury happened, but workload→injury is inherently temporal. Test whether survival modeling on the same 47-feature recipe improves ranking (C-index) over the binary MLP — it should, because censoring is currently treated as "healthy".
