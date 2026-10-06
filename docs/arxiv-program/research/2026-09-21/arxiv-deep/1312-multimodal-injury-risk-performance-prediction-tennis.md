# [1312] Multimodal Injury Risk and Performance Prediction in Tennis Using Weighted Ensemble Learning (arXiv:2608.21530v1)

**Citation:** Weihao Qu, Ling Zheng, Shobharani Polasa, Jay Wang, et al., Monmouth University (2026). *Multimodal Injury Risk and Performance Prediction in Tennis Using Weighted Ensemble Learning*. arXiv:2608.21530v1. URL: https://arxiv.org/abs/2608.21530
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; 5,516 words — abstract, method, results, limitations, references read).
**Verdict:** REJECT — replaced by reserve ledger 1313. A REJECT never counts toward the 750 target.

## 1. Research question
Can the PART (Predictive Athlete Readiness for Tennis) weighted-ensemble framework monitor athlete wellness and estimate near-term injury susceptibility from multimodal data (daily questionnaires, WHOOP wearables, vertical-jump testing, match video)?

## 2. Dataset / schema
- **9 collegiate tennis players** (5 male / 4 female, age 20.3 ± 1.5), 16 weeks / one semester. Same Monmouth cohort as the already-ledgered 0772 paper.
- Inputs: daily 10-question survey, WHOOP sleep/recovery/workout data, vertical-jump testing, match video. Cleaned table claims 85 attributes / 82,804 entries.
- **Injury risk label derived from the daily questionnaire** — self-reported, not independently adjudicated injury incidence.
- Validation: player-grouped 3-fold CV (6 train / 3 test), 100 bootstrap iterations; **only two qualitative case studies** (e.g., April 11 ARS ≈ 60) as prospective illustration.

## 3. Method / model
- PART two-stage design: four specialized sub-models (wellness, injury risk, physical capability, playing style) fused into an Athlete Readiness Score (ARS). ARS weights learned as 0.35 wellness / 0.30 injury risk / 0.35 physical capability; playing-style multipliers 1.0/1.2/1.4/1.6 are **explicitly heuristic**. Physical capability: LSTM on 7-day input windows.

## 4. Equations & assumptions
- ARS = weighted combination of sub-model outputs with learned weights and heuristic style multipliers (see §3). Assumptions: questionnaire-derived labels approximate injury risk; heuristic style multipliers are valid; LSTM R² = 0.993 reflects real signal rather than target leakage.

## 5. Features / target
- Features: survey, WHOOP, jump-test, video features. Targets: daily questionnaire-derived injury-risk label; physical capability score; ARS.

## 6. Validation design
- Player-grouped 3-fold CV with 100 bootstrap iterations (the right design for n=9); AUC, accuracy, F1 for injury classifiers; RMSE/R²/MAE for physical capability; two qualitative cases.

## 7. Numerical results / baselines
- Injury classifiers: XGBoost **AUC 0.64 ± 0.01**, accuracy 0.74 ± 0.01, **injury F1 0.43 ± 0.01**; Decision Tree AUC 0.65 ± 0.01. Upper-body AUC 0.712; lower-body AUC 0.703.
- Physical-capability LSTM: RMSE 0.749, **R² = 0.993**, MAE 0.248 vs MLP RMSE 2.506 / R² = 0.922 — an implausibly high R² that raises leakage/target-construction concerns.
- Authors' own framing: results reflect **monitoring/near-term risk estimation, not validated prospective injury forecasting**; the limited 9-player cohort "restricts" generalizability; findings "should be interpreted within this scope" as "preliminary."

## 8. Code / data availability
- None stated in paper.

## 9. Leakage & limitations (reasons for rejection)
- **Duplicates existing ledger 0772** (`2608.25126v1`, *Multimodal Injury Risk Prediction in Tennis* — already ADAPT): same Monmouth lab, same PART framework, same 9-player cohort, same tennis-injury task; the 1312 paper cites the ICHMS 2025 conference paper (pp. 28–34 — the 0772 source paper) as its reference. A replacement must add *new* GSE value, not a second ledger of the same study. (b) n=9 with **self-reported injury labels**; (c) weak injury discrimination (AUC 0.64–0.65); (d) R²=0.993 physical-capability result with unaddressed leakage concern; (e) heuristic ARS weights/multipliers; (f) only qualitative case validation; (g) authors disclaim prospective forecasting. Nothing here survives the duplicate-of-0772 test.

## 10. GSE overlap
- **Near-duplicate of `0772-multimodal-injury-risk-prediction-in-tennis.md`** (already ADAPT — the PART architecture and honest evaluation discipline). Also related to `0768-early-detection-injuries-mlb-pitchers-video.md`, `1120-predicting-ulnar-collateral-ligament-injury-rookie.md`.

## 11. GSE implementation spec
- None — rejected (and the PART architecture is already captured in ledger 0772).

## 12. Reproducible test
- Not applicable — rejected.

## 13. Acceptance / rejection gate
- **REJECT.** Duplicates an existing ledger (0772); too weak and too preliminary to stand as a separate valuable paper.

## 14. Improvement experiment
- Not applicable — rejected. (The reserve chain continues at 1313.)
