# CQR Research — Deep-Dive Note

**Source:** `/tmp/drive-deep/cqr-research.md` (converted from Drive doc "CQR Research"; 506,573 chars, 8,154 lines, read in full 2026-09-21)
**Converted:** 2026-09-21 17:43 (per file timestamps); the docx original is `cqr-research.docx` (1,414,914 bytes).
**Author/analyst of the doc:** unclear — the document is a compiled research brief, likely written by a research assistant/AI for Garrett; no author line is given in the file itself.
**Note on dates:** the document cites arXiv papers with September 2026 submission dates (e.g., 2609.xxxxx submitted 12–15 September 2026). Today is 2026-09-21, so those are recent preprints. Papers cited as ICML 2026 / KDD 2026 / COPA 2026 / ICLR 2026 are future-dated acceptances from earlier submissions; taken at face value from the document.

## 0. What this document actually is

The file is NOT a single research paper. It is a compiled survey with three distinct parts:

- **Part A (lines 1–1335):** 100 numbered arXiv abstract fragments (mostly one-sentence/truncated), all conformal prediction / quantile regression / uncertainty quantification, spanning arXiv:1905.xxxxx to arXiv:2609.xxxxx. The first heading is mistyped as `## . arXiv:2609.17091` (no number; it is entry 1). Entry 99 is `arXiv:2406.08281`, entry 100 is `arXiv:2406.04498`.
- **Part B (lines 1337–1735):** A complete separate analysis of an *earlier batch of 60 papers* (2019–2026): Overview, Part 1 "Foundational Papers — Deep Analysis" (7 papers with full mechanics and formulas), Part 2 "All 60 Papers — Detailed Coverage" (entries numbered 8–118 — see §8 on this inconsistency), Part 3 "Comprehensive Synthesis," plus a "What I Could Not See" list and an "Important Caveat on Source Material" noting Part A has far less text per paper than Part B's batch.
- **Part C (lines 1736–3080):** Detailed coverage of all 100 Part-A fragments (entries 1–100), grouped as: Part 1 Foundational/Theoretical, Part 2 Time Series & Sequential, Part 3 Energy/Climate/Environment, Part 4 Astronomy/Physics/Scientific, Part 5 Synthesis & Cross-Cutting Themes, plus "What I Could Not See."
- **Part D (lines ~3080–8154, ~5,070 lines):** A raw arXiv listing/search-result dump (titles, authors, truncated abstracts, submission dates), apparently from conformal/jackknife/prediction-related searches in September 2026. Mostly stat.ML/stat.ME papers tangential to the survey. All entries relevant to conformal prediction or quantile regression are covered in §3.9 below.

---

## 1. Research question and thesis

**Research question:** How do we get prediction *intervals* (not just point predictions) that (a) adapt to local noise/heteroscedasticity, (b) carry finite-sample, distribution-free coverage guarantees, and (c) work for non-exchangeable data (time series, drift, missing data, multivariate outputs) — and what is the state of that literature as of September 2026?

**Thesis of the survey:** Conformalized Quantile Regression (CQR; Romano, Patterson & Candès 2019, arXiv:1905.03222) is the single most influential method in this batch — it merges quantile regression's adaptivity to heteroscedasticity with conformal prediction's finite-sample validity. The 2019–2026 literature is an ecosystem of CQR extensions along four axes:

1. **Conditional coverage:** marginal coverage (averaging over all test points) hides severe miscalibration in regions/subpopulations; exact distribution-free conditional coverage is finite-sample *impossible*, but approximate conditional coverage is achievable via localization, weighting, or density estimation.
2. **Non-exchangeability:** standard CP assumes exchangeable data; time-series extensions (TQA, KOWCPI, LPCI, rolling-origin, DistMatch) repair longitudinal coverage, which degrades over time with naive split CP because the calibration set goes stale.
3. **Missing data / messy inputs:** impute-then-predict+conformalize is *marginally* valid under exchangeability for any missingness distribution and almost any imputation function (Zaffran et al. 2023) — but mask-conditional coverage can fail dramatically.
4. **Structured outputs:** multi-target regression, vector/graph-valued outputs, compositional data, functional outputs — extensions beyond scalar intervals.

---

## 2. Methods/models with equations

All formulas are quoted or paraphrased exactly from the document (Part B, Part 1 — the foundational deep analysis).

### 2.1 CQR — Conformalized Quantile Regression (Romano, Patterson & Candès 2019; arXiv:1905.03222)

Three steps: (1) train two quantile regressors at levels α/2 and 1−α/2 on a proper training set; (2) compute conformity scores on a calibration set

**E_i = max{ q̂_α/2(X_i) − Y_i,  Y_i − q̂_{1−α/2}(X_i) }**

measuring how far the true response falls outside the estimated quantile band; (3) at test time, expand the quantile band by the (1−α)(1+1/n)-th empirical quantile of the calibration scores. Resulting interval:

**C(x) = [ q̂_α/2(x) − Q̂_{1−α}(E),  q̂_{1−α/2}(x) + Q̂_{1−α}(E) ]**

**Guarantee: P(Y ∈ C(X)) ≥ 1−α under exchangeability**, with intervals adapting to local heteroscedasticity (wider where noise is higher, narrower where certain). Stated limitations: requires training a quantile regression model (hard with limited data/complex architectures); assumes exchangeability — unsuitable for time series without modification.

### 2.2 Jackknife+ (Barber, Candès, Ramdas & Tibshirani 2019; arXiv:1905.02928)

Given (X_i, Y_i), i=1…n and test point X_{n+1}, compute leave-one-out predictions μ̂_{−i}(X_{n+1}) for each i. Prediction interval:

**[ α-th quantile of { μ̂_{−i}(X_{n+1}) − |Y_i − μ̂_{−i}(X_i)| },  (1−α)-th quantile of { μ̂_{−i}(X_{n+1}) + |Y_i − μ̂_{−i}(X_i)| } ]**

**Guarantee: at least 1−2α coverage regardless of the distribution of data points, for any algorithm treating training points symmetrically.** The original jackknife can have *zero/vanishing* coverage for certain algorithms; the jackknife+ fix is to use LOO *predictions at the test point*, not just residuals. Connects to cross-conformal prediction (Vovk 2015); extends to K-fold CV. Jackknife and jackknife+ achieve nearly exact coverage and similar lengths whenever the fitting algorithm is stable.

### 2.3 Nested conformal + QOOB (Gupta, Kuchibhotla & Ramdas 2019; arXiv:1910.10562)

Starts with a sequence of nested sets F_t(x) = { y : score(x,y) ≤ t } and calibrates threshold t. The CQR nonconformity score max{q̂_α/2(X_i) − Y_i, Y_i − q̂_{1−α/2}(X_i)} is recovered *exactly* from the nested-set perspective. **QOOB** ("cube") combines quantile regression + cross-conformalization + ensembles + out-of-bag predictions to avoid the statistical inefficiency of train/calibration splitting. Nested conformal is presented as a unifying framework for cross-conformal, jackknife+, and other data-efficient methods.

### 2.4 Reweighting nonconformity scores (Amoukou & Brunel 2023; arXiv:2303.12695)

Uses a Quantile Regression Forest to learn the distribution of nonconformity scores; data-dependent weights for test point x:

**w_i = ρ(x_i, x_{n+1}) / ( (1/n) ∑_j ρ(x_j, x_{n+1}) )**

where ρ is a similarity measure. Weighted empirical quantile of nonconformity scores → interval adapts to local difficulty.

### 2.5 KOWCPI — Kernel-based Optimally Weighted Conformal Time-Series Prediction (Lee, Xu & Xie 2024; arXiv:2405.16828)

Adapts the Reweighted Nadaraya-Watson (RNW) estimator for quantile regression on dependent data; learns optimal data-adaptive kernel weights with temporal proximity weighting (more recent observations get higher weight); conditional coverage theory under strong mixing conditions on nonconformity scores. Achieves narrower intervals without losing coverage on real time-series data.

### 2.6 Missing values (Zaffran, Dieuleveut, Josse & Romano 2023; arXiv:2306.02732)

**Theorem (as stated in doc): if data satisfy exchangeability (A1) and the imputation function satisfies symmetry (A2), then imputed random variables are exchangeable and the standard conformal guarantee holds** — i.e., impute-then-predict+conformalization is *marginally* valid for any missingness distribution (even MNAR) and almost all imputation functions. Caveat: missing values induce heteroskedasticity; coverage can vary dramatically across missingness masks → mask-conditional coverage needs separate methods.

### 2.7 SEMF (Azizi, Boldi & Chavez-Demoulin 2024; arXiv:2405.18176)

E-step: estimate posterior of latent target given observed data and current params; M-step: update params to maximize expected complete-data likelihood. Monte Carlo sampling, VAE-like. Works with any ML model (XGBoost, MLPs); evaluated on 11 tabular datasets; honest limitation: robustness diminishes with missing data.

### 2.8 Other formulas/claims (verbatim from doc)

- **View-structured CP** (arXiv:2609.10307): asks that *with probability at least 1−α, RGB prediction boxes cover at least a 1−β fraction of pixels* in a new view — a two-level guarantee.
- **EOC/BFQR** (Wang et al., NeurIPS 2023, arXiv:2311.02243): Equal Opportunity of Coverage — (1) coverage rates for different groups with similar outcomes are close, (2) population coverage remains at a predetermined level; Binned Fair Quantile Regression calibrates a hold-out set to bound EOC deviation, then CP maintains EOC on the test set while optimizing interval width.
- **Colorful Pinball** (Chen & Li, ICML 2026, arXiv:2512.24139): density-weighted quantile regression — weight calibration points by estimated density — to improve conditional coverage.
- **Skew-adaptive CP** (Marques F. & Graziadei, PMLR 329, 82–100, 2026): adjusts interval asymmetry from estimated residual skewness instead of using symmetric absolute residuals.
- **HQR + WACI** (Sebastián, González-Guillén & Juan, arXiv:2406.14904): Heteroscedastic Quantile Regression + Width-Adaptive Conformal Inference — intervals adapt width to prediction difficulty while preserving coverage.
- **ProbFM** (Chinta, Tran & Katukuri, accepted oral AI Meets Quantitative Finance @ ICAIF 2025; enhanced version oral @ AAAI 2026 TSF workshop, arXiv:2601.10591): transformer TSFM with *uncertainty decomposition* (aleatoric vs epistemic).
- **QUTCC** (Ye et al., arXiv:2507.14760): Quantile Uncertainty Training + Conformal Calibration for imaging inverse problems (hallucination error bars).
- **Extreme CP** (Pasche, Lam & Engelke, arXiv:2505.08578): EVT-based intervals for very high confidence levels (e.g., 99.9%), targeting flooding/financial crises.
- **SPI** — Synthetic-powered Predictive Inference (Bashari et al., arXiv:2505.13432; co-author Yaniv Romano, CQR co-author): incorporates synthetic data from a generative model into calibration when calibration data are scarce.
- **AS-CQR** (EnergyMamba, KDD 2026 AI4S, arXiv:2606.00506, DOI 10.1145/3770855.3818841): Adaptive Sequential CQR with locally adaptive normalization and online calibration, bolted onto a graph-enhanced Mamba (GE-Mamba) spatiotemporal model.

---

## 3. Key numerical results, tables, benchmarks

Exact values only. The document is abstract-fragment-level for the 100-paper batch, so empirical numbers are rare. Where a number is a count (pages/figures/splits), it is exact per the doc; coverage results are as stated.

### 3.1 Exact empirical results (sparse but real)

- **Forward collision warning** (Hu et al., arXiv:2511.19952, NGSIM dataset): hierarchical spatio-temporal attention net — inference **73% faster than Transformer methods**; Average Displacement Error **ADE 0.73 m**, stated as **42.2% better than Social_LSTM**; CQR prediction intervals achieved **91.3% coverage at 90% nominal**.
- **Steel fatigue strength** (Boruah, arXiv:2608.07589): **first CP application to steel fatigue**; compared **seven interval-construction methods** (v2 added Mondrian group-conditional CP and CQR, seven total) across **50 independent data splits**; quartile cut points derived from training-set out-of-fold predictions; distinguishes marginal coverage from within-spectrum coverage. (No numeric outcome quoted in the visible text — see §8.)
- **Smart irrigation** (Scariolo, arXiv:2609.13864): four-parameter water-balance core calibrated on training data only → RF learns only the physical residual → **90%-nominal CP intervals** → interval lower bound converted to irrigation trigger; evaluated on **three years of hourly in-situ measurements**. Code available (see §4). (Numeric performance outcome not visible — see §8.)
- **Self-Organized CP** (Berthier et al., arXiv:2606.29403): **44 pages, 28 figures, 15 tables**; major revision expanded evaluation from **8 to 10 benchmarks**; ablations: training-routed sparse-buffer regime, score and calibrator, partition-transfer, conditional-coverage diagnostics.
- **DistMatch** (Menadjiev et al., ICML 2026, arXiv:2606.00690): **34 pages, 12 figures, 16 tables**.
- **RLCP** (Conrad et al., arXiv:2608.06206): **68 pages, 8 figures, 2 tables**.
- **Gibbs & Candès** (arXiv:2502.20579): **53 pages, 4 figures**.
- **Duchi** (arXiv:2503.00220): **28 pages, 3 figures**.
- **Multi-fidelity QR** (Liu & Zhang, arXiv:2605.10406): **69 pages, 12 figures, 3 tables**.
- **Surface metrology** (Kucharski et al., arXiv:2510.20339): **34 pages, 10 figures, 6 tables, 60-page supplementary appendix**, DOI 10.3390/s25247471.
- **German electricity price forecasting** (Uniejewski & Ziel, arXiv:2501.06180): German **EPEX market data 2015–2023**; Renewable Energy vol. 269, 125844 (2026), DOI 10.1016/j.renene.2026.125844.
- **UQ benchmark in astronomy** (AION-1; Tame-Narvaez et al., arXiv:2606.07771): **seven UQ methods** compared on galaxy-property regression; 7 pages, 1 table, 1 figure; FERMI-CONF-26-0269-CSAID; PAI 2026 @ Stanford.
- **Jumbo-Visma calorie prediction** (van Kuijk et al., arXiv:2304.03778): compares jackknife+, jackknife-minmax, jackknife-minmax-after-bootstrap, CV+, CV-minmax, CQR — a rare explicit CP-method bake-off named in the doc. (Numeric winner not visible — §8.)

### 3.2 Guarantees stated (theory, no empirical numbers)

- CQR: P(Y ∈ C(X)) ≥ 1−α under exchangeability.
- Jackknife+: ≥ 1−2α coverage for any symmetric algorithm, any distribution; original jackknife can have zero coverage.
- Impute-then-predict+CP: marginally valid under A1 (exchangeability) + A2 (symmetric imputation), any missingness incl. MNAR.
- TQA (arXiv:2205.09940): preserves cross-sectional coverage while improving longitudinal coverage; post-hoc wrapper for any TS regression model.
- LPCI (arXiv:2310.02863): observed expected marginal cross-sectional coverage, improves longitudinal coverage over literature benchmarks, high interval-width adaptivity.
- KOWCPI: narrower intervals without losing coverage vs. SOTA on real TS data (no numbers quoted).
- Amann (2025, "Conditional validity and a fast approximation formula of full conformal prediction sets"): with out-of-sample-error conformity score and a stable algorithm, full-conformal ≈ symmetrized Jackknife ≈ K-fold cross-conformal ≈ … (fragment cut off mid-sentence; §8).
- Pournaderi & Xiang (arXiv:2405.18176 — training-conditional coverage bounds for uniformly stable learners): jackknife+ and full-conformal training-conditional bounds via (m,n)-stability (Liang & Barber 2023); "weaker than uniform stability."

### 3.3 Benchmark datasets/methods named (no numbers, for context)

- AION-1 (7 UQ methods), NGSIM (ADE 0.73 m), DrivAerML (automotive aero surrogates), German EPEX 2015–2023, ICON model (PRecover climate), PantheonPlus supernovae (jackknife/bootstrap calibration reference), 11 tabular datasets (SEMF), 10 benchmarks (Self-Organized CP revision), 3 years hourly (irrigation), NGSIM; synthetic designs from Athey & Imbens (2016) (causal-forest inference study in the tail).

### 3.4 Methods appearing in ≥3 places (frequency signals from the survey)

CQR explicitly/implicitly in ≥20 of the 100 papers. Repeated theme clusters: energy/electricity-price forecasting (6+ papers: 2511.05523, 2509.19417, 2507.15079, 2502.04935, 2501.06180, 2602.01912), wind power (2602.13010, 2502.07344), sequential/online CP, federated CP (2502.04935→2306.05131; 2602.23296 FedWQ-CP), LLM factuality (2603.27403 CFC), covariate shift (2502.13030 likelihood-ratio regularization; JA
...[truncated 14281 chars]