# [1074] Binary Classifier Calibration using an Ensemble of Near Isotonic Regression Models (arXiv:1511.05191)

## Citation / full-text source

- arXiv:1511.05191 — full text: https://arxiv.org/pdf/1511.05191
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Mahdi Pakdaman Naeini, Gregory F. Cooper (2015). *Binary Classifier Calibration using an Ensemble of Near Isotonic Regression Models*. arXiv:1511.05191v1. Full-text URL: https://arxiv.org/pdf/1511.05191v1
**Ledger completed:** 2026-09-21. **Read:** full text (cached ar5iv HTML conversion, read cover to cover).
**Verdict:** ADAPT — near-isotonic regression with BIC-weighted model averaging is a directly usable, tuning-free upgrade to GSE's binary calibration stack where plain isotonic regression's monotonicity assumption is brittle (sports scores/features with noisy label mappings).

## 1. Research question
Can the monotonicity assumption of isotonic-regression-based calibration (IsoRegC) be relaxed without losing its strengths? The paper asks: does an ensemble of *near*-isotonic regression models (spanning IsoRegC at one extreme to the overfit saturated fit at the other, combined with BIC-weighted selective Bayesian averaging) calibrate binary classifiers better than IsoRegC and the state-of-the-art Bayesian binning (BBQ) method, while retaining discrimination power?

## 2. Dataset / schema
- **Simulated data:** a 2-D circular-classification dataset used in prior calibration work (Naeini et al.); 1000 train + 1000 test instances; scatter plot with black oval = SVM-with-quadratic-kernel decision boundary. Purpose: deliberately violates IsoRegC's monotonicity assumption (linear SVM scores on circular data).
- **Real data:** 40 datasets from UCI ML Repository and LibSVM (Bache & Lichman 2013; Chang & Lin 2011): spect, adult, breast, pageblocks, pendigits, ad, mamography, satimage, australian, code rna, colon cancer, covtype, letter unbalanced, letter balanced, diabetes, duke, fourclass, german numer, gisette scale, heart, ijcnn1, ionosphere scale, liver disorders, mushrooms, sonar scale, splice, svmguide1, svmguide3, coil 2000, balance, breast cancer, leu, w1a, thyroid sick, scene, uscrime, solar, car 34, car 4, protein homology.
- **Schema:** binary labels; only summary stats reported (Table II): dataset sizes Min 42 / Q1 683 / Median 1861 / Q3 8973 / Max 581012; minority-class percentage Min 0.009 / Q1 0.076 / Median 0.340 / Q3 0.443 / Max 0.500.
- **Protocol:** average over 10 random runs of 10-fold cross-validation; calibration fitted on the train fold.
- All public.

## 3. Method / model
**ENIR (Ensemble of Near Isotonic Regression):**
1. Sort N training pairs (y_i, z_i) by uncalibrated score y_i (scores outside [0,1], e.g. SVM margins, are first squashed through f(x)=1/(1+exp(−x))).
2. Run the modified Pool Adjacent Violators Algorithm (mPAVA, Tibshirani et al. 2011) over the near-isotonic objective (Eq. 3) to obtain the *entire solution path*: T binning models M_1…M_T, one per breakpoint value of λ (λ=0 gives the saturated fit p_i=z_i; large λ recovers standard IsoRegC). The λ=0 overfit model is excluded.
3. For each model M_i compute P(z=1|y, M_i) = the bin's shrunk positive frequency for the bin containing y.
4. Final calibrated probability = BIC-weighted selective Bayesian model average:
   P(z=1|y) = Σ_i [Score(M_i)/Σ_j Score(M_j)] · P(z=1|y,M_i), where Score(M_i) is the Bayesian Information Criterion (Schwarz 1978).

**mPAVA mechanics (Algorithm 1):** start with N singleton bins (p_i=z_i, λ=0). Each bin's optimal estimate is linear in λ between breakpoints (Eq. 7: ∂p̂_Bi/∂λ = (ν_{i−1}−ν_i)/|B_i|, constant since bins only merge, never split — the theorem from Tibshirani et al.). Next merge point λ* = min_i λ_{i,i+1} (Eqs. 8–9); update estimates p̂(λ*) = p̂(λ) + a_i(λ*−λ); merge tied bins; store model; repeat until λ* < λ (standard isotonic solution reached). Total: O(N log N) time, O(N) memory.

## 4. Equations & assumptions
IsoRegC: p̂_iso = argmin_{p∈R^N} ½Σ(p_i−z_i)² s.t. p_1≤…≤p_N (Eq. 1; the [0,1] constraint shown redundant).
Near-isotonic form: p̂_λ = argmin ½Σ(p_i−z_i)² + λΣ_{i=1}^{N−1}(p_i−p_{i+1})ν_i (Eq. 3), ν_i = 1(p_i>p_{i+1}) = indicator of ranking violation; λ>0 trades goodness-of-fit vs monotonicity; λ=+∞ recovers IsoRegC.
mPAVA bin update: |B_i|p̂_Bi(λ) − Σ_{j∈B_i} z_j + λ(ν_i−ν_{i−1}) = 0 (Eq. 5) → p̂_Bi(λ) = (Σ_{j∈B_i}z_j − λν_i + λν_{i−1})/|B_i| (Eq. 6) — a *shrunken* version of bin frequencies penalized by ranking violations.
Evaluation metrics (Eq. 10 block): MCE = max_k|o_k−e_k|; ECE = Σ_k P(k)|o_k−e_k| with K=10 fixed bins; X = (measure_enir − measure_method)/measure_method for percent gain CIs.
**Assumptions:** (a) the base classifier discriminates reasonably (ranking mostly correct — the prior ENIR injects vs BBQ's rank-agnosticism); (b) true mapping from scores to probabilities is approximately monotone; (c) BIC weights approximate posterior model probabilities; (d) train scores are i.i.d. — no time-ordering consideration.

## 5. Features / target
Input: any binary classifier's uncalibrated output scores y_i ∈ [0,1] (post-sigmoid if needed). Target: true binary label z_i ∈ {0,1}. Output: calibrated P(z=1|y). No feature engineering — post-hoc recalibration only.

## 6. Validation design
- Simulation: 1000/1000 train-test split, 10-fold CV averages; base learners SVM linear and quadratic kernels.
- Real: 40 datasets × 3 base classifiers (logistic regression, SVM, naïve Bayes) × 10 runs of 10-fold CV. Baselines: IsoRegC (PAVA) and BBQ. Excluded: Platt (prior work shows dominated), ACP (needs per-prediction CIs, LR-only), ABB (O(N²), intractable beyond a few thousand instances).
- Statistical comparison: Demšar-recommended procedure — Friedman non-parametric test + Holm's step-down correction at 0.05 significance, on average ranks across the 40 datasets.
- Metrics: AUC, ACC (discrimination); RMSE, ECE, MCE with K=10 (calibration).

## 7. Numerical results / baselines
**Simulation (Table I):**
- Linear SVM: SVM→IsoReg→BBQ→ENIR: AUC 0.52/0.65/0.85/0.85; ACC 0.64/0.64/0.78/0.79; RMSE 0.52/0.46/0.39/0.38; ECE 0.28/0.35/0.05/0.05; MCE 0.78/0.60/0.13/0.12.
- Quadratic SVM: AUC all 1.00; ACC all 0.99; RMSE 0.21/0.09/0.10/0.09; ECE 0.14/0.01/0.01/0.00; MCE 0.36/0.04/0.05/0.03.
- Key point: when monotonicity is violated (linear SVM on circular data), IsoRegC is nearly useless (AUC 0.52→0.65, ECE 0.28→0.35 — *worse* calibration), while ENIR matches BBQ (AUC 0.85, ECE 0.05).

**Real data, average ranks across 40 datasets (Tables III–V), lower = better:**
- LR base: AUC ranks IsoReg 1.963/BBQ 2.225/ENIR 1.813; ACC 1.675/2.663*/1.663 (*ENIR statistically superior to BBQ); RMSE 1.925*/2.625*/1.450 (ENIR stat. superior to both); ECE 2.125/1.975/1.900; MCE 2.475*/1.750/1.775 (ENIR stat. superior to IsoRegC).
- SVM base: AUC 1.988/2.025/1.988; ACC 2.000/2.150/1.850; RMSE 1.850/2.475*/1.675 (ENIR superior to BBQ); ECE 2.075/2.025/1.900; MCE 2.550*/1.625/1.825 (ENIR superior to IsoRegC).
- NB base: AUC 2.150/1.925/1.925; ACC 1.963/2.375*/1.663; RMSE 2.200*/2.375*/1.425; ECE 2.475*/2.075*/1.450; MCE 2.563*/1.850/1.588 (ENIR stat. superior to IsoRegC in RMSE, ECE, MCE).
- Net claim: ENIR "commonly performs statistically significantly better than the other methods, and never worse."

**Percent-gain 95% CIs vs base classifier (Table VI, X = (enir−method)/method; negative = improvement for RMSE/ECE/MCE):**
- AUC: LR [−0.008, 0.003], SVM [−0.010, 0.003], NB [−0.010, 0.000] — no meaningful discrimination loss (worst case ≤1% AUC loss).
- RMSE: LR [−0.124, −0.016]; SVM [−0.310, −0.176]; NB [−0.196, −0.100].
- ECE: LR [−0.389, −0.153]; SVM [−0.768, −0.591]; NB [−0.514, −0.274]. NB's 30.5–55.2% ECE reduction is the headline figure.
- MCE: LR [−0.313, −0.064]; SVM [−0.591, −0.340]; NB [−0.552, −0.305].

**Complexity (Table VII):** training — Platt O(NT), Hist/IsoRegC/ACP/BBQ/ENIR O(N log N), ABB O(N²); test per-instance — Platt O(1), Hist/IsoRegC O(log B), ACP O(N), ABB O(N²), BBQ O(M log N), ENIR O(M log B) where M = # models in ensemble, B = bins.

## 8. Code / data availability
None stated (no repo link, no code URL in paper; authors reference the mPAVA implementation of Tibshirani et al. [23] as the underlying routine).

## 9. Leakage
- The λ-path models are all fit on the *same* train fold whose labels also score the BIC weights — BIC as a "Bayesian model weight" on training data is an approximation; label information leaks into ensemble-weight selection (in-sample BIC can favor overfit bins). The GSE implementation must score weights on an inner holdout.
- For GSE use: probabilities arrive as time-ordered market/engine histories, not i.i.d. draws — fitting the calibration map on pooled history without time-ordering lets future regime information bleed into past-era bins. Fit on trailing windows, evaluate on forward holdout (2025).

## Limitations
- 10×10-fold CV averages then Friedman ranks — standard but hides per-dataset variance; absolute ECE values per dataset not reported, only ranks.
- Simulated-data experiment uses the authors' own prior dataset designed to flatter near-isotonicity (confirmation-design risk).
- Class-imbalance extremes (minority share down to 0.009) were included in the 40 datasets but not stratified in the analysis.
- No multiclass treatment (future work only); GSE's spread/total/ML triple and probability vectors over score buckets would need extension.
- Test-time O(M log B) with caching noted but the caching trick itself reduces precision.
- No external validity on sports data; AUC-preserving claim holds only where base classifier already discriminates — ENIR cannot rescue a useless ranker.

## 11. GSE overlap
Map covers: isotonic regression (calibration stack), Platt/temperature scaling, Venn-Abers, Mondrian/cross-conformal, grouping loss (2210.16315), Clopper-Pearson, LRD/ECE-by-slice. **None of these is ENIR.** IsoRegC is in the stack; ENIR strictly generalizes it (λ→∞ member = IsoRegC) and relaxes exactly its known weak point (monotonicity). BBQ/ABB/ACP are not in the corpus. Overlap status: extension of an existing in-repo method, not a duplicate. Pairs naturally with GSE's engine output probabilities (spread/ML/total) and any binary classifiers (e.g., cover/no-cover, TD scorers) that mis-rank near market edges.

## 12. GSE implementation spec
1. Calibration data: GSE engine's historical predicted probabilities + outcomes, per market (spread cover, moneyline, total over) — e.g., 2020–2024 seasons as train, 2025 as holdout (time-ordered, addressing the paper's i.i.d. gap).
2. Implement mPAVA in Python (~80 lines; the merge-never-splits theorem makes it straightforward) or port from R's `neariso`/`genlasso` lineage; sort N scores, walk λ breakpoints, store (λ, bin edges, shrunk bin values).
3. BIC-score each breakpoint model on the *train* fold but select weights with an inner holdout to avoid the in-sample BIC bias; ensemble-average the per-bin probabilities.
4. Apply as post-hoc layer on top of engine raw probs; re-fit weekly on rolling window (e.g., trailing 4 seasons) to handle calibration drift.
5. Benchmark vs current stack: IsoRegC (PAVA), Platt, Venn-Abers, temperature scaling — metrics: ECE (10-bin), MCE, Brier, log-loss, and AUC-retention (ΔAUC ≥ −0.005 required).
6. Estimated effort: 2–3 days for mPAVA + ENIR + evaluation harness; no new data collection (uses existing engine prediction logs).

## 13. Reproducible test
Dataset: GSE engine backtest logs, 2020–2024 NFL, binary outcomes (cover, ML win, over) with engine pre-game probabilities. Baselines: uncalibrated engine probs, IsoRegC (PAVA), temperature scaling. Metric: ECE with 10 equal-width bins + Brier score, evaluated on a time-ordered 2025 holdout; also track ΔAUC. Protocol: fit each calibrator on 2020–2024, score 2025.

## 14. Numeric gate
**15%** — adopt ENIR into the calibration stack only if, on the time-ordered 2025 holdout, ENIR achieves ≥ **15%** lower ECE than the best of {IsoRegC, temperature scaling} averaged across the three markets (spread/ML/total), with no AUC loss vs uncalibrated engine probs. Below 15% the added complexity over plain IsoRegC is not justified; any AUC degradation is a hard fail regardless.

## 15. Improvement experiment
Replace in-sample BIC weights with **out-of-fold log-loss weights**: run K-fold CV over the calibration set, score each λ-breakpoint model's log-loss out-of-fold, and weight models by exp(−CV log-loss) instead of BIC — this removes the in-sample bias concern and ties ensemble weights directly to the calibration objective. Compare ECE/Brier vs BIC-weighted ENIR; if OOF weighting wins, also try stacking the breakpoint models' bin-indicator features with a small logistic meta-learner.

## 16. Verdict

**ADAPT** — near-isotonic regression with BIC-weighted model averaging is a tuning-free, O(N log N) upgrade to GSE's binary calibration stack that strictly generalizes the existing IsoRegC (λ→∞ member) and fixes exactly its weak point: the monotonicity assumption, which is brittle on noisy sports score mappings. The paper's evidence (statistically superior calibration ranks vs IsoRegC and BBQ across 40 datasets, worst-case ≤1% AUC loss) justifies the adaptation; the single decisive check is the 15% ECE-reduction gate on GSE's own 2025 holdout, with BIC weights re-scored on an inner holdout to close the in-sample optimism leak.
