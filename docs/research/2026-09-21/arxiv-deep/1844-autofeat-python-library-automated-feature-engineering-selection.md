# [1844] The autofeat Python Library for Automated Feature Engineering and Selection (arXiv:1901.07329)

**Citation:** Franziska Horn, Robert Pack, Michael Rieger (2020). *The autofeat Python Library for Automated Feature Engineering and Selection*. arXiv:1901.07329v4. Published in JMLR. URL: https://arxiv.org/abs/1901.07329
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, v4, lines 0–715, all sections incl. §§2.1–2.2, Tables 1–4, conclusion; lines 576–715 are references [18]–[39], no new substantive content — verified 2026-09-22).
**Verdict:** ADAPT

Rationale: its noise-filtered L1 selection pipeline and unit-legality checks (Pint + Buckingham π) are directly reusable as GSE's false-discovery control for thousands of auto-generated sports features, but the library targets linear models on small scientific datasets and needs adaptation to GSE's GBM pipeline and time-ordered data.

## 1. Research question
How can a linear model — interpretable, fast, trainable on tiny datasets, explainable to non-statisticians — reach competitive accuracy? Answer: automatically generate tens of thousands of nonlinear features from the raw inputs (inspired by the SISSO algorithm), then carefully select a small robust subset, so the final model is linear in *engineered* features. The paper ships this as the `autofeat` Python library (AutoFeatRegressor / AutoFeatClassifier / FeatureSelector, scikit-learn API). Empirically, 2 engineering steps beat ridge regression on 4 of 5 datasets while staying interpretable; 3 steps overfit catastrophically when features ≫ samples (diabetes test R² = −12.4).

## 2. Dataset / schema
Five regression datasets (Table 1): diabetes (442×10, disease progression), boston (506×13, housing values), concrete (1030×8, compressive strength), airfoil (1503×5, wind-tunnel sound pressure), wine quality (6497×12, red & white). Sources: scikit-learn package + UCI ML Repository. Standard train/test folds; details in the GitHub Jupyter notebook. No time dimension.

## 3. Method / model
**Feature engineering (§2.1):** alternating multi-step process. Step A — apply user-selectable nonlinear transforms to each feature: log(x), √x, 1/x, x², x³, |x|, exp(x), 2^x, sin(x), cos(x). Step B — combine pairs of (transformed) features with operators +, −, ·. Repeat. Growth: with 3 raw features, step 1 → ~20 new features, step 2 → ~750, step 3 → 4000+. Computed symbolically with **SymPy**, which auto-simplifies expressions and drops redundant features. **Physical units:** if inputs carry units, only dimensionally "legal" features are kept (Pint library); dimensionless π-groups are additionally constructed via the **Buckingham π-theorem**. Categorical inputs are one-hot encoded before engineering. Data may be subsampled before generation to bound RAM. "In practice, performing only two or three feature engineering steps is usually sufficient."
**Feature selection (§2.2):** (1) drop engineered features highly correlated with original or simpler features; (2) **noise filtering** — train an L1-regularized linear model (LassoLARS for regression, L1 logistic regression for classification) on all features *plus* synthetic noise features (shuffled copies or N(0,1) draws); keep only real features whose |coefficient| exceeds the *largest* noise coefficient; (3) **chunked selection** — because L1 fails when features ≫ samples and features are intercorrelated: first get a promising set from L1 on all features (largest |coefs|), split remaining features into chunks, fit a model per chunk (each chunk + promising set, each < n/2 features), combine survivors, refit; (4) **stability** — repeat the whole selection on data subsamples, keep features selected in the most runs, drop highly correlated ones (keep the most-frequently-selected); final refit. Result: typically a few dozen features retained from several thousand. Final model: linear (ridge-flavored) on selected features; coefficients (optionally normalized by feature std) are the interpretability story.

## 4. Equations & assumptions
No equations stated (algorithmic paper). Named mathematics: Buckingham π-theorem (1914) for dimensionless feature construction; L1-regularized linear models (LassoLARS — Efron et al. 2004; L1 logistic regression — Cox 1958) for sparse selection; SymPy symbolic simplification for redundancy elimination. Assumptions (stated): linear relations rarely hold in raw features, so nonlinear expansion + linear model is the right trade; noise features' coefficient magnitudes upper-bound the null distribution of uninformative-feature coefficients; features are "independent enough" for L1 to work after chunking; subsample-selected features generalize.

## 5. Features / target
Input: raw numerical (+ one-hot categorical) features of each dataset. Engineered: transforms and pairwise products/ratios/differences thereof (Table 4: most-selected are ratios like x₁/x₂, 1/(x₁x₂), products x₁·x₂², exp(x₁)/x₂, log(x₁)/x₂, |x₁−log(x₂)|). Target: dataset regression target (disease progression, housing value, etc.). No horizon (static).

## 6. Validation design
Train/test folds per dataset (R² reported on both). Baselines: ridge regression (RR), SVR, random forest (RF), and autofeat with 1/2/3 engineering steps (AFR1–3). Hyperparameters of competing models in the GitHub notebook (not in paper). No cross-validation scheme stated in paper; no significance tests; no error bars. Comparison is descriptive (best-per-column bolding in Table 2).

## 7. Numerical results / baselines
Table 2 (R², train / test):
- diabetes: RR 0.541/0.383, RF 0.598/0.354, AFR1 0.553/0.400, AFR2 0.591/0.353, AFR3 0.638/**−12.4** (catastrophic overfit: 32,161 features from 442 samples)
- boston: RR 0.736/0.748, RF 0.983/0.870, AFR1 0.825/0.810, AFR2 0.893/0.791, AFR3 0.932/0.048 (54,631 features, 506 samples)
- concrete: RR 0.625/0.564, RF 0.985/0.892, AFR2 0.913/**0.868** (best non-RF test)
- airfoil: RR 0.517/0.508, RF 0.991/0.934, AFR2 0.863/**0.842**
- wine quality: RR 0.293/0.310, RF 0.931/0.558, AFR2 0.397/**0.384**
Table 3 (engineered/selected): AFR1 selects 2–11 features; AFR2 selects 8–80 from 530–10,528 engineered; AFR3 selects 16–44 from 2,355–55,648 engineered. Paper's summary: AFR beats ridge on most datasets, does not reach RF; 2 steps is the sweet spot; 3 steps overfits when n small.

## 8. Code / data availability
Library: https://github.com/cod3licious/autofeat (pip-installable, Python 3, scikit-learn API). Datasets: scikit-learn + UCI (public). Experiment notebooks in the repo.

## 9. Leakage & limitations
Adversarial read: (a) No time-awareness anywhere — selection and engineering are pooled; on temporal data this leaks. (b) AFR3's −12.4 test R² is a flashing warning: the selection pipeline does NOT control false discovery when features ≫ samples; the noise filter + chunking + stability voting still let thousands of spurious features through on diabetes/boston. Any GSE use must cap the engineered pool relative to n. (c) Validation is weak: single train/test split, no CV, no significance tests, no error bars; several "wins" over ridge are within noise (diabetes AFR1 0.400 vs RR 0.383). (d) Baselines' hyperparameters live in a notebook, not the paper — RF/SVR may be undertuned, flattering AFR. (e) Operators are only +, −, · (no division operator in the combine step; ratios arise via the 1/x transform) — less expressive than OpenFE/DIFER. (f) Categorical handling is one-hot-then-engineer, which explodes dimensionality and creates nonsense interactions. (g) Unit legality via Pint is a nice idea but unused in the reported experiments (no units given).

## 10. GSE overlap
Extension with a unique angle. Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, nothing in-repo does automated selection from a generated pool, and GSE's public-facing doctrine ("Every pick public. Every result posted." / analysts who show their work) makes the *interpretability* story unusually valuable: a linear model on auto-engineered features yields attributable coefficients — "this pick moved because pressure-adjusted efficiency index rose" — which is publishable reasoning, unlike GBM feature importances. The paper's noise-filter (keep |coef| > max noise |coef|) is the cheapest credible false-discovery control among the three anchor methods, and the Pint/Buckingham unit-legality idea maps to a sports dimensional check (never add a rate to a count, never subtract a probability from EPA). Not a competitor to featuretools/tsfresh (paper's own framing); complements OpenFE (1842) and DIFER (1843) as the *selection + interpretability* layer.

## 11. GSE implementation spec
Build "GSE-AutoFeat-Select" as the selection/discovery-report layer: (1) Take the union of hand-built + OpenFE-survivor + DIFER-survivor numerical features (time-safe only). (2) Add autofeat-style symbolic expansion (SymPy) limited to 2 steps with a typed operator set (+,−,·,÷,log,√,square) and a sports unit system (rate/count/probability/EPA tags; drop dimensionally illegal combos — the Pint idea, hand-rolled). (3) Selection: L1 logistic (for cover probability) with noise features (shuffled copies), keep |coef| > max noise |coef|; chunked refits (chunks < n/2); stability over 5 season-subsamples; correlation pruning. (4) Output two artifacts: (a) the selected feature list with standardized coefficients for the *public write-up* ("why the model likes this side"), (b) the features as inputs to the production GBM. Effort: ~2 days (library exists; work is the sports unit-type system + time-safe wrapping).

## 12. Reproducible test
Same harness as ledgers 1842/1843 (nflverse team-game rows 2020–2024; train 2020–2022, val 2023, test 2024 frozen; target = home-team spread cover). Test A (selection quality): does the noise-filter + stability pipeline select ≤40 features with test log-loss within 0.002 of the full-pool GBM (i.e., selection loses nothing)? Test B (interpretability): does the linear model on selected features beat the hand-built linear baseline's log-loss? Metric: log-loss on 2024; 5 seeds.

## 13. Acceptance / rejection gate
ADOPT the autofeat selection layer iff (a) the selected ≤40-feature set matches the full candidate pool's 2024 test log-loss within 0.002 (selection is lossless), AND (b) the linear model on selected features beats the hand-built linear baseline by ≥ 0.003 log-loss, AND (c) no selected feature fails the unit-legality/time-safety audit. REJECT if the pipeline overfits like AFR3 (train–test log-loss gap > 0.01 in the wrong direction), if >50% of selected features are uninterpretable ratios, or if selection is lossy (>0.002 degradation). Gate fixed before the run.

## 14. Improvement experiment
Beyond the paper: replace the paper's single noise-coefficient threshold with a *knockoff-style* FDR-controlled selection — generate model-X knockoffs of the engineered features (or simply shuffled copies *within* time blocks to preserve season structure), and select by the knockoff+ statistic with target FDR = 10%. This gives a principled false-discovery guarantee the paper's max-noise-coefficient heuristic lacks, and the within-block shuffling respects the temporal structure the paper ignores. Hypothesis: knockoff filtering retains the interpretability win while cutting the AFR3-style overfit regime, because spurious high-order ratios won't beat their knockoffs consistently across season blocks.

---
*Lane: auto_feature_eng. Ledger 1844 of block 1842–1861.*
