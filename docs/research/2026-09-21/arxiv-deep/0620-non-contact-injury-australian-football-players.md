# 0620 Predicting Non-Contact Injuries in Australian Football (arXiv:1706.04336v1)

**Citation:** Carey, D. L. et al. *Prediction of non-contact injuries in Australian football using machine learning* (arXiv:1706.04336v1). URL: https://arxiv.org/abs/1706.04336
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** REJECT — the paper's honest finding is a *negative result*: multivariate ML could not reliably predict non-contact injuries in this data (nearly all mean AUCs below 0.65, lag models near chance), the hamstring-only signal rests on 13 test injuries, and its feature engineering is subsumed by the stronger Rossi soccer paper (ledger 0619). Per the replace-on-reject rule, this paper is replaced by arXiv:2206.01038v1, fully read and ledgered as 0630.

## 1. Research question
Can machine learning models (regularized logistic regression, GEE, random forest, SVM) predict non-contact (NC), non-contact time-loss (NCTL), and hamstring injuries in elite Australian footballers from GPS, accelerometer, and RPE training-load data?

## 2. Dataset / schema
- **75 unique athletes, 133 player-seasons** from an AFL club.
- Train: 2014–2015 seasons; held-out test: 2016 season.
- Train/test records: **9,203 / 4,664**.
- Injury counts train/test: NC **321/67**, NCTL **156/42**, hamstring **36/13**.
- Inputs: GPS/accelerometer load metrics, session-RPE; rolling and EWMA windows of **3/6/21 days**; ACWR, monotony, strain.
- Access: proprietary club data; not publicly available.

## 3. Method / model
- Models: regularized logistic regression, generalized estimating equations (GEE), random forest, SVM.
- Preprocessing/experiments: PCA, undersampling, and SMOTE class-imbalance handling explored; lag models (predicting injuries further out) tested; decision thresholds reported in the paper's Table 3.

## 4. Equations & assumptions
Standard model forms as cited (logistic, GEE, RF, SVM); no novel equations stated. Assumptions: training-load features capture injury-relevant physiological state; SMOTE-generated injury examples are representative; a 2016 holdout from the same club is a fair generalization test.

## 5. Features / target
- Inputs: GPS/accelerometer/RPE load summaries with 3/6/21-day rolling and EWMA windows, ACWR, monotony, strain.
- Targets: non-contact injury, non-contact time-loss injury, hamstring injury (binary per player-session/week record).
- Prediction horizon: short-term (same/next period) plus lagged variants.

## 6. Validation design
- Train on 2014–2015, test on held-out 2016 — a proper time-ordered holdout.
- Baselines compared across model classes and imbalance treatments; AUC as the headline metric; lag models as a secondary protocol.

## 7. Numerical results / baselines
- **Hamstring logistic regression: mean AUC 0.72, best reported AUC 0.76.**
- **All other multivariate models: mean AUC below 0.65.**
- Lag models: AUC **0.50–0.57** (essentially chance).
- PCA gave minor gains; **SMOTE gave no major gains**.
- The paper's Table 3 decision thresholds expose extreme base-rate limitations: with 13 test hamstring injuries, operating thresholds are knife-edge.

## 8. Code / data availability
None stated. Proprietary club data.

## 9. Leakage & limitations (and why this is a REJECT)
- The headline "best" result (hamstring AUC 0.76) rests on **13 test injuries** — a handful of events; the confidence band around that AUC is enormous.
- Everything except hamstring-specific logistic regression fails: NC and NCTL injuries are unpredictable from these features (AUC < 0.65), and any lagged prediction is chance-level.
- The paper's own conclusion is negative — this is a *failed prediction* paper, not a method to adopt.
- AFL-specific load constructs (AFL GPS volumes, RPE culture) transfer poorly to the NFL's contact-driven injury mechanisms.
- Duplicative: its feature engineering (EWMA windows, ACWR, monotony) is the same family as the Rossi soccer paper (ledger 0619), which reports strictly stronger results (recall 0.80, precision 0.50, forward-simulation validation) on the same workload→injury problem. GSE loses nothing by discarding this paper.
- The one GSE-salvageable lesson is negative: **do not build NFL injury models on single-club samples with dozens of events** — which is exactly the Rossi paper's regime too, and it is already captured in ledger 0619's acceptance gate.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. No injury-forecasting capability exists in the GSE corpus; the relevant overlap is methodological (workload indices like rest/bye exist as game-context features). The negative finding is subsumed by ledger 0619, which covers the same workload-feature family with stronger results. Nothing unique is lost by rejection.

## 11. GSE implementation spec
Not applicable — REJECT. No build recommended.

## 12. Reproducible test
Not applicable — REJECT. (Had it been adapted, the test would have been the NFL injury-report replication in ledger 0619's section 12, which this paper's negative result predicts would fail on small samples.)

## 13. Acceptance / rejection gate
REJECTED: no multivariate model beats 0.65 mean AUC except a hamstring-only logistic on 13 test events; the paper's own conclusion is negative; the feature family is covered better by ledger 0619. Nothing in it clears a numeric adoption bar.

## 14. Improvement experiment
Not applicable — REJECT. The replacement paper (ledger 0630, sports video action-recognition survey) opens the experimental video lane instead, which is where this slot's value is recovered.
