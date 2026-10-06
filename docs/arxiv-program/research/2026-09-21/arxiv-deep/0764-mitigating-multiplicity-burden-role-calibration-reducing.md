# [0764] Mitigating the Multiplicity Burden: The Role of Calibration in Reducing Predictive Multiplicity of Classifiers (arXiv:2603.11750v2)

**Citation:** Mustafa Cavus (2026). *Mitigating the Multiplicity Burden: The Role of Calibration in Reducing Predictive Multiplicity of Classifiers*. arXiv:2603.11750v2. URL: https://arxiv.org/abs/2603.11750
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2603.11750.txt`; complete paper incl. references, verified end-to-end).
**Verdict:** ADAPT — GSE should adopt the Rashomon-set + obscurity metric as a stability layer: train multiple near-optimal model variants, measure per-pick disagreement (obscurity), and use post-hoc calibration as a consensus-enforcer before publishing picks; needs adapting because GSE does not currently maintain an explicit near-optimal model set.

## 1. Research question
In classification, multiple models can sit within a performance tolerance ε of the best model (the Rashomon set) yet disagree on individual instances — predictive multiplicity. The paper asks: (i) does multiplicity concentrate in low-confidence regions and disproportionately burden minority classes; (ii) does post-hoc calibration (Platt, isotonic, temperature scaling) reduce multiplicity (obscurity) across the Rashomon set without sacrificing performance?

## 2. Dataset / schema
Nine public credit-risk scoring datasets: AER_credit_card_data (1,319 obs, 12 vars, imbalance 3.426), bank_marketing (45,211, 17, 7.548), german_credit (1,000, 21, 2.333), give_me_credit (251,503, 11, 13.961), hmeq (5,960, 13, 4.012), loan_data (1,225, 15, 2.792), poland_year3 (10,503, 65, 20.218), poland_year5 (5,910, 65, 13.414), taiwan_credit (30,000, 24, 3.520). Imbalance ratio = n_majority/n_minority, range 2.3–20.2. Public benchmark data (no URL given in the paper body; standard UCI/Kaggle credit datasets). Binary target (default/no-default).

## 3. Method / model
- Model zoo via h2o AutoML: 20 candidate models per dataset (GBM, random forest, deep neural nets, GLMs and ensembles) over a 60/20/20 train/calibration/test split.
- Rashomon set: {f : AUC(f) ≥ AUC(f_best)×(1−ε)}, ε=0.05 relative tolerance (robustness checked at nearby ε).
- Multiplicity metrics: ambiguity α_ε(x)=1{∃f_i,f_j∈R: f_i(x)≠f_j(x)} (instance-level conflict); discrepancy Δ_ε(R)=max_{f_i,f_j} mean 1{f_i(x)≠f_j(x)} (global worst-case); obscurity γ_ε(x)=(1/(|R|−1))Σ_{f≠f_best} 1{f(x)≠f_best(x)} (mean disagreement vs best model — the primary metric).
- Calibration applied independently to each Rashomon model on the calibration split: Platt scaling, isotonic regression, temperature scaling. Ranking preserved by construction.
- Statistical tests: Wilcoxon rank-sum (class disparities in obscurity/confidence), Pearson χ² (group × ambiguity association), stratified Dunn post-hoc tests with Bonferroni correction (N=133,852) for calibrated-vs-raw obscurity/confidence.

## 4. Equations & assumptions
(1) R(ε)={f∈F: L(f,D) ≤ L(f_best,D)+ε}. (2) α_ε(x)=1{∃f_i,f_j∈R: f_i(x)≠f_j(x)}. (3) Δ_ε(R)=max_{f_i,f_j}(1/|D|)Σ1{f_i(x)≠f_j(x)}. (4) γ_ε(x)=(1/(|R|−1))Σ_{f≠f_best}1{f(x)≠f_best(x)}. (5) p̂_cal(x)=g(p̂(x)). (6) Platt: p̂_cal=1/(1+exp(A·p̂(x)+B)). (7) Isotonic: min Σ_i(y_i−g(p̂(x_i)))² subject to monotone non-decreasing g. (8) Temperature: p̂_cal=σ(z(x)/T), T>0.
Assumptions: AUC within 5% = "equally good" (a contestable tolerance); h2o AutoML's 20-model search yields a representative Rashomon set; calibration on a held-out 20% split is independent of selection; label-level disagreement is the right multiplicity unit (probabilistic disagreement is not measured). The author explicitly frames results as "empirical associations... rather than causal effects."

## 5. Features / target
Features: each dataset's native credit attributes (11–65 variables; e.g., german_credit's 21 attributes). Not enumerated per dataset in the paper. Target: binary credit-risk outcome (default/no-default). Analysis-level target: per-observation obscurity and confidence under raw vs calibrated Rashomon sets.

## 6. Validation design
Cross-dataset replication over 9 datasets (the generalisation argument is breadth, not depth). Within each: fixed 60/20/20 split, Rashomon construction on AUC, per-model post-hoc calibration, then obscurity/confidence computed on the test split for raw and each calibrated variant. Baselines: the raw (uncalibrated) Rashomon set; complementary checks with ambiguity/discrepancy (same directional pattern, not tabulated). Statistical significance via Wilcoxon/Dunn tests. No time-ordered splits; no external holdout beyond the 9 datasets.

## 7. Numerical results / baselines
- Inverse confidence–multiplicity relation: high-confidence regions (>0.90) converge to consensus; low-to-medium confidence regions spike in obscurity; bank_marketing and give_me_credit show "tent-like" formations with 50%–80% model disagreement near the decision threshold.
- Class disparity (Wilcoxon): minority obscurity > majority, W=36,894,926, p<.001; majority confidence > minority, W=89,252,968, p<.001; χ²(1, N=10,503)=1885.8, p<.001 for group×ambiguity association.
- Calibration reduces obscurity (grand means): minority mean obscurity ≈0.14 raw → below 0.10 for Platt and isotonic; majority obscurity "nearly eliminated."
- Dunn tests (Bonferroni, N=133,852), obscurity, Majority: Isotonic vs raw Z=−41.1, Platt Z=−41.3, Temperature Z=−36.6 (all p_adj<.001). Minority: Isotonic Z=−4.19, Platt Z=−5.62 (p<.001), Temperature Z=−2.91 (p_adj=.022).
- Confidence effects: majority all significant (Platt Z=−26.6 most refining); minority: only Platt significant (Z=13.0, p<.001); isotonic (p_adj≈1) and temperature (p_adj≈1) not significant on minority confidence.
- Majority confidence adjusted down to ≈0.90 after Platt/isotonic; minority confidence marginally boosted.
- The author notes calibration-accuracy metric improvements are NOT claimed ("outside the scope of the current reported results").

## 8. Code / data availability
"None stated" for paper code. Methods: h2o AutoML [24] (open source), standard credit datasets (UCI/Kaggle). Tests: Wilcoxon, Dunn, Bonferroni — standard.

## 9. Leakage & limitations
Calibration split is held out from training, so no label leakage into calibration maps. Adversarial notes: (i) no causal claim — calibration is *associated* with lower obscurity, and part of the mechanism is mechanical (calibrated models cluster predictions near the same probability scale, compressing disagreement); (ii) ε=0.05 AUC tolerance is arbitrary and the "diversity" of the Rashomon set is an artefact of h2o AutoML's search space, not of GSE-relevant model variation; (iii) label-level disagreement ignores probability-level disagreement, which is what matters for betting; (iv) minority-class confidence effects are null for isotonic/temperature — the fairness framing overreaches what three nulls support; (v) no time structure — credit data are static, unlike sports; (vi) the paper never reports whether calibrated probabilities are *better calibrated* (ECE etc.), only that they agree more.

## 10. GSE overlap
New capability, not duplicate. The research map covers Platt/temperature/isotonic as calibration fixes (research map §43), but nothing on Rashomon sets, ambiguity/discrepancy/obscurity, or calibration-as-consensus. GSE currently ships single-model picks; there is no obscurity/stability layer. Closest existing concept: the map's "model disagreement" ideas are absent — this is genuinely new for the program.

## 11. GSE implementation spec
- **Rashomon construction**: for the daily pick set, train K near-optimal variants per pick: e.g., 5–8 models = {best config, ± feature subsets, 3 random seeds, XGBoost/LightGBM/logistic variants} all within ε=0.02 log-loss of the champion on the rolling validation window.
- **Obscurity gate**: compute per-pick obscurity on the published label (cover/win/total). Picks with obscurity above a threshold (e.g., >30% of near-optimal variants disagree) are flagged "contested" — either withheld from the public card, down-staked, or published with the disagreement disclosed.
- **Consensus calibration**: apply the chosen post-hoc calibrator (per map: temperature/Platt) to each variant independently on the calibration window, then average probabilities; the paper's evidence says this compresses disagreement without hurting AUC.
- **Monitoring**: track daily mean obscurity as a model-health metric; spikes indicate regime change or feature drift.
- Effort: ~3–4 days to build the multi-variant training harness + obscurity computation + card gating.

## 12. Reproducible test
Dataset: GSE 2024 NFL ATS model — train 8 variants (2 algorithms × 2 feature subsets × 2 seeds) on 2020–2023 seasons, calibrate each on 2024 weeks 1–8 via Platt, evaluate on 2024 weeks 9–18. Compute per-game obscurity and the calibrated-ensemble Brier score vs the single champion. Compare ROI of (a) champion-only card, (b) ensemble-mean card, (c) ensemble card with contested picks (obscurity>0.3) removed.

## 13. Acceptance / rejection gate
ADOPT the Rashomon/obscurity layer if, on 2024 weeks 9–18, the ensemble card (b or c) beats the champion-only card by ≥1.5% ROI (or ≥0.005 Brier improvement) AND contested-pick removal (c) does not reduce total profit (i.e., withheld picks are genuinely negative-EV). Otherwise REJECT — the champion model stands alone.

## 14. Improvement experiment
Probability-level obscurity: replace label disagreement with the standard deviation (or inter-quartile range) of calibrated probabilities across the Rashomon set, and stake proportionally to 1/(1+k·σ) — a Kelly-fraction shrink driven by model disagreement rather than market odds. Test whether disagreement-shrunk stakes outperform fixed-fraction Kelly on the 2024 holdout. This extends the paper from binary disagreement to the continuous quantity bettors actually need.
