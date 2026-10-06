# [1885] Detecting Concept Drift in the Presence of Sparsity — A Case Study of Automated Change Risk Assessment (arXiv:2207.13287)

**Citation:** Vishwas Choudhary, Binay Gupta, Anirban Chatterjee, Subhadip Paul, Kunal Banerjee, Vijay Agneeswaran (2022). *Detecting Concept Drift in the Presence of Sparsity — A Case Study of Automated Change Risk Assessment*. arXiv:2207.13287v1. URL: https://arxiv.org/abs/2207.13287
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the only paper in the lane that answers "which detector, on messy real data": majority-vote ensembles (ADWIN+HDDM-A+KSWIN for abrupt, HDDM-A+HDDM-W+Page-Hinkley for gradual) plus sparsity-aware imputation guidelines and drift-evaluation metrics (TPD, drift count) that fix known misleading metrics; directly composes with ledgers 1882–1884.

## 1. Research question
Real deployments have missing values (sparsity) *and* concept drift, but the two literatures are studied separately. Which imputation scheme works for which missingness pattern, which of 7 standard drift detectors (PH, DDM, EDDM, HDDM-A, HDDM-W, ADWIN, KSWIN) survives sparsity, and — since no single detector wins across metrics — can a majority-vote ensemble of detectors deliver optimal-or-near-optimal performance on every metric? Validated on synthetic data, public datasets, and a live Walmart change-risk system (~50K samples; production team credited it with a 33% reduction in major incidents and multi-million-dollar savings as of Q2 2021).

## 2. Dataset / schema
Harvard dataverse synthetic abrupt/gradual drift sets; authors' change-risk data (~50K binary-labeled change requests, shuffled to remove pre-existing drift, then drifts injected by label flipping at various points/widths — the standard procedure since real drift onsets are unidentifiable). Missingness injected at 5–60% under MCAR/MAR/MNAR. Feature-level experiments on single-feature synthetic distributions + one multivariate-normal case. No exact schema table in text beyond binary "risky/not risky" labels.

## 3. Method / model
Three-step recipe: (1) pick the distribution-wise best imputer (Table 1: kNN variants dominate — e.g. kNN50 for sparsity <30%, kNN100 above 30% on multivariate normal; best scheme otherwise identical across missingness types/levels); (2) for a real dataset: quantify per-feature sparsity, run a runs-test for randomness on the missingness indicator (0/1) to separate MAR from MNAR (authors argue MCAR is rare in human-entered data), fit distributions via Q-Q plots, then mask complete rows, re-inject the observed missingness pattern, and pick the imputer by RMSE; (3) run a **majority-vote ensemble of drift detectors** — abrupt drifts: ADWIN + HDDM-A + KSWIN; gradual drifts: HDDM-A + HDDM-W + Page-Hinkley. Ensemble declares drift if ≥2 of 3 detectors fire within a tuned window (optimal window = 2000 instances on Harvard dataverse, 1000 on change-risk data). A formal risk analysis of the ensemble's indecision region is given (diversity among base detectors reduces ensemble risk — standard ensemble-diversity argument formalized for CDDs).

## 4. Equations & assumptions
No new closed-form equations; the method is empirical. Stated metric definitions: prequential error e_i = (1/i)Σ_k L(y_k, ŷ_k); accuracy; Average Detection Delay (ADD) = mean instances between true and detected drift; TPR = detected-true/detected (within acceptable detection interval ADI = 4× drift width); **TPD (new)** = detected-true/actual drifts, optimal value 1 (fixes TPR inflation when a detector fires multiple times inside one ADI); **Drift Count (new)** = total actual drifts detected (fixes offsetting misses). Assumptions: MCAR/MAR/MNAR Rubin taxonomy; runs test distinguishes MAR from MNAR given domain knowledge that MCAR is implausible; injected label-flip drifts are representative.

## 5. Features / target
Inputs: tabular feature vectors with missing values (imputed before detection); streaming binary labels. Target: drift alarms. Underlying task: binary classification (change = risky/not risky).

## 6. Validation design
Factorial study: 3 missingness types × sparsity levels 5–60% × 8 imputers (mean/median/mode/zero/kNN/iterative/soft-impute/optimal transport) × 7 detectors × 6 metrics, on Harvard synthetic (abrupt + gradual) and the change-risk data. Ensemble window size tuned empirically per dataset. Detector ranking done per-metric; final test of the ensemble on the change-risk data across all 6 metrics.

## 7. Numerical results / baselines
- Imputation always helped: positive effect on *all* 6 metrics for *all* 7 detectors on both Harvard and change-risk data (change-risk data had lowest imputation RMSE with kNN, k=4 — Figure 2).
- **No single detector is best across all metrics for any missingness/drift type** (Figure 3) — the paper's headline empirical finding.
- Best abrupt-drift trio: ADWIN + HDDM-A + KSWIN; best gradual-drift trio: HDDM-A + HDDM-W + Page-Hinkley. The majority-vote ensemble is top-3 on *every* metric on the change-risk data (Figure 4) — "if not the best, always in the top-3," hence chosen for deployment as a strong baseline "unlikely to miss a concept drift."
- Metrics critique (paper's own): prequential error and accuracy can be *misleading* — a bad detector that fires constantly triggers constant retraining, which paradoxically lowers prequential error; TPR is inflated by multiple detections within one ADI → the new TPD and drift-count metrics.
- Ensemble declaration window: optimal 2000 (Harvard) / 1000 (change-risk) instances.

## 8. Code / data availability
None stated for the study code; Harvard dataverse sets are public; change-risk data is proprietary (Walmart).

## 9. Leakage & limitations
- Drifts are *injected by label flipping* after shuffling — a coarse proxy for real drift; whether the detector rankings transfer to organic regime change (the NFL case) is untested.
- Optimal ensemble window (1000–2000 instances) is dataset-tuned with "details omitted due to page limitation" — in NFL weekly chunks this maps to ~60–125 weeks, i.e., multiple seasons; the tuning procedure itself is not reproducible from the paper.
- Imputation study is single-feature except one multivariate case; NFL features are correlated multivariate (EPA splits, QB metrics) — the kNN-RMSE selection procedure transfers, the specific Table-1 winners may not.
- The ensemble triples are chosen by per-metric ranking on *their* data; no statistical significance tests reported for the ensemble-vs-best-single gap.
- Runs-test-based MAR/MNAR classification leans on domain judgment (MCAR ruled out by fiat) — honest but subjective.
- Deployment claim (33% incident reduction, multi-million savings) is a production-team attribution with acknowledged confounders.

## 10. GSE overlap
Per the existing-research map, no drift-detection work exists in the repo; this is new capability. It is the *composition* paper for this lane: it tells us how to combine 1882 (PUDD), 1883 (CDSeer), 1884 (ECDD) into one production monitor instead of betting on one detector, and its TPD/ADI/drift-count metrics are the right way to evaluate that monitor. Sparsity is a live GSE problem (injury designations, charting gaps, partial Next Gen Stats coverage — the map's FTN charting catalog and coverage tables all have missing-week holes).

## 11. GSE implementation spec
- **Drift-monitor ensemble:** run three detectors in parallel on the weekly resolved-game stream — ECDD (1884) on the error stream, PUDD (1882) on the PU-index stream, Page-Hinkley on the Brier stream — with a majority rule: drift declared if ≥2 of 3 fire within a 3-week window (NFL-scaled analog of the paper's 1000–2000-instance window). Gradual-drift variant: HDDM-A + HDDM-W + PH on the same streams.
- **Sparsity handling:** before any drift statistic is computed, impute sparse weekly features (injury flags, charting-derived metrics) per the paper's recipe: per-feature sparsity audit, runs test on the missingness indicator, Q-Q distribution check, then kNN-vs-baseline RMSE bake-off on masked complete weeks. This is a one-time setup, not weekly.
- **Evaluation of the monitor itself:** score the ensemble with the paper's metrics — TPD (target = 1 per labeled regime episode), drift count, ADD in weeks, ADI = 4× episode width — instead of prequential error, which the paper shows is misleading.
- **Serving:** three O(1)–O(window) detectors in the Tuesday cron; majority vote is trivial. Effort: ~2 days (mostly the one-time imputation bake-off), reuses 1882–1884 components.

## 12. Reproducible test
Dataset: nflverse 2015–2025 with the sparse-feature subset (injury designations, charting coverage fields — keep missingness as-is, impute per the paper's recipe). Protocol: (a) implement the three detectors + majority ensemble exactly as specified; (b) run on 2020–2025 weekly streams; (c) score with TPD, drift count, ADD against the labeled regime-change episodes from 1882. Baselines to beat: each single detector alone — the ensemble must match or beat the best single detector on TPD (target: 1.0, i.e., exactly one alarm per episode) while firing ≤2 false alarms/season; and the imputation recipe must not degrade the detectors' TPD vs complete-case weeks.

## 13. Acceptance / rejection gate
ADOPT the majority-vote ensemble as the production drift policy if on 2020–2025 nflverse: (i) ensemble TPD ∈ [0.8, 1.2] per labeled regime episode (no double-firing, no misses), (ii) ≤2 false alarms/season, (iii) ensemble ADD ≤ best single detector's ADD + 1 week (majority voting must not cost more than a week of delay). REJECT the ensemble (keep the best single detector) if (iii) fails or the ensemble's false-alarm rate exceeds the worst single detector's. The imputation recipe is adopted independently if the RMSE bake-off shows ≥10% RMSE improvement over median imputation on masked weeks.

## 14. Improvement experiment
Weighted majority voting keyed to detector reliability: instead of 1-vote-each, weight each detector's vote by its trailing-season TPD precision (e.g., PH gets more weight in gradual-drift seasons, PUDD in abrupt ones), with weights updated annually. Test whether reliability-weighted voting cuts false alarms by ≥25% vs unweighted majority on the same nflverse protocol — hypothesis: the paper's own finding (no detector dominates everywhere) implies static equal weights are suboptimal once per-season reliability is measurable.
