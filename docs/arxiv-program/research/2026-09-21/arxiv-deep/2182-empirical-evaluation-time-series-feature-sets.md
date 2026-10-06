# [2182] An Empirical Evaluation of Time-Series Feature Sets (arXiv:2110.10914v1)

**Citation:** Trent Henderson and Ben D. Fulcher (2021). *An Empirical Evaluation of Time-Series Feature Sets*. arXiv:2110.10914v1. URL: https://arxiv.org/abs/2110.10914
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* the only systematic empirical comparison of the seven major time-series auto-extraction libraries; gives GSE a grounded, evidence-based tooling choice (catch22 vs tsfresh vs TSFEL vs feasts/tsfeatures/Kats/hctsa) for auto-extracting rolling-window features from team EPA sequences, plus a reuseable directed-overlap metric for auditing our own feature libraries for redundancy.

## 1. Research question
Given seven popular time-series feature-extraction libraries — hctsa (7730 features, Matlab), catch22 (22, C), feasts (42, R), tsfeatures (63, R), Kats (40, Python), tsfresh (up to 1558, Python), TSFEL (390, Python) — how do they compare on (i) computation-time scaling with series length, (ii) within-set feature redundancy, and (iii) cross-set behavioral overlap? The practical question: how should a practitioner choose a feature set for a given application?

## 2. Dataset / schema
**Empirical 1000 dataset** (Fulcher et al., ref [16]): over 800 diverse real-world and model-simulated time series, spanning varied dynamics (autocorrelation structure, stationarity, distributional shape, nonlinear processes). For the redundancy/overlap analyses, features from all seven sets were computed on each series to build a feature×series output matrix, and similarity was measured behaviorally (correlation of outputs across the ~800 series), not by code inspection. Timing benchmark used synthetic Gaussian white-noise series (and noisy sinusoids as a check) at T = 100, 250, 500, 750, 1000, 10 repeats each, on a 2019 MacBook Pro (Intel Core i7 2.6 GHz 6-core); hctsa run in parallel on all 6 cores, others in native language.

## 3. Method / model
Three experiments:
1. **Timing:** median + IQR computation time per feature set across series lengths 100–1000.
2. **Within-set redundancy:** PCA on the feature-output matrix per set; report number of PCs needed to capture 90% of variance (also proportion of variance in first few PCs).
3. **Cross-set overlap:** a new *directed* similarity metric S(T|B) treating one set as benchmark B (rows) and another as test T (columns): the mean, over features i in T, of the maximum absolute Spearman correlation between feature i's outputs and any feature j in B's outputs, across the diverse series set. High S(T|B) means T's features are reproducible by B's features (T adds little beyond B); low means T is distinctive. Computed for all 7×7 pairs (hctsa excluded for tsfresh comparison note: 128 tsfresh features had |ρ|^max < 0.2 vs all hctsa features).

Standardized computation via the R package **theft** (Tools for Handling Extraction of Features from Time series), which wraps catch22, feasts, tsfeatures, tsfresh, TSFEL, Kats in one API. Feature-set versions pinned: hctsa v1.06, catch22 v0.1.12, feasts v0.2.1, tsfeatures v1.0.2, tsfresh v0.18.0, TSFEL v0.1.4, Kats initial release.

## 4. Equations & assumptions
Directed overlap metric, Eq. (1) in paper (paraphrased from text): S(T|B) = mean_i max_j |Spearman ρ(f_i^T, f_j^B)|, where f_i^T is the output vector of test feature i across the ~800 series, f_j^B likewise for benchmark feature j. Assumptions: (i) behavioral similarity = correlated outputs across the diverse series set (features with highly correlated outputs are treated as redundant, regardless of different internals); (ii) the ~800 Empirical-1000 series are diverse enough that accidental correlation is rare; (iii) absolute Spearman ρ captures monotonic behavioral equivalence. No equations stated for the PCA/timing portions beyond standard definitions.

## 5. Features / target
Input features: the raw feature sets themselves (22–7730 features per set). "Target" is not a prediction target — the study characterizes the feature sets' behavior: computation time (seconds), within-set redundancy (PC count to 90% variance), and pairwise directed overlap S(T|B).

## 6. Validation design
No train/test prediction task. Validation is empirical benchmarking: timing repeated 10× per length per set (median + IQR); redundancy computed over the full ~800-series output matrix; overlap as the full pairwise S(T|B) heatmap (Fig. 4). Feature computation success rates reported per set per length (e.g., tsfresh 25.2% of features failed at T=100 — all FFT coefficients 51–99 components; Kats 3 Holt–Winters features failed on white noise; hctsa ~0.6–0.9% failed at short lengths).

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper:
- **Timing (1000-sample series):** catch22 < 10 ms; TSFEL 0.03 s; Kats 0.06 s; feasts 0.47 s; tsfresh 2.53 s; tsfeatures 6.18 s; hctsa 16.5 s. Four orders of magnitude spread. Per-feature: catch22 and TSFEL ~10^-4 s (~0.1 ms per feature in abstract; body states ~10^-4 s per feature); tsfeatures ~3 s per feature. TSFEL feature count scales with length: 185 (T=100), 260 (T=250), 285 (T=500), 390 (T>500).
- **Within-set redundancy (PCA):** highest for TSFEL and tsfresh. In TSFEL, 90% of variance across 390 features captured with just **four** principal components. catch22 (designed for low redundancy) showed the least within-set redundancy.
- **Cross-set overlap S(T|B):** hctsa is the most comprehensive benchmark — average best-match |ρ| vs hctsa: catch22 0.96, feasts 0.84, Kats 0.84, tsfeatures 0.88, TSFEL 0.88 — except tsfresh (0.55). tsfresh is the most distinctive test set: S(tsfresh|B) = 0.25–0.5 for all other benchmarks. 128 tsfresh features had max |ρ| < 0.2 vs any hctsa feature; 118 of 128 (92%) were raw FFT coefficients (real/imaginary components and angles). tsfeatures↔feasts overlap S ≈ 0.82 both directions; Kats vs those ≈ 0.72. S(TSFEL|tsfresh) = 0.5 (TSFEL computes absolute FFT magnitudes but not real/imag/angle components).

## 8. Code / data availability
Code to reproduce all analysis (including downloading/processing the Empirical 1000 dataset): https://github.com/hendersontrent/feature-set-comp. All seven feature libraries are open source except hctsa (requires proprietary Matlab). Unified R wrapper: theft package.

## 9. Leakage & limitations
Not a prediction paper, so no lookahead bias, but: (i) timing benchmark on white noise may understate costs on structured series (authors checked noisy sinusoids — quantitatively similar); (ii) behavioral-overlap metric conflates "same behavior on these 800 series" with "same behavior generally" — features could diverge on series types outside the Empirical 1000; (iii) redundancy findings are library-version-pinned (tsfresh v0.18.0, etc.); (iv) hctsa excluded TISEAN features needing C/Fortran compile, so its comprehensiveness is slightly understated in the benchmark; (v) the overlap numbers are computed on univariate uniformly-sampled series — multivariate/irregular series (e.g., play-by-play with irregular spacing) are not covered; (vi) for GSE: no predictive task was evaluated, so "distinctive" ≠ "predictively useful" — tsfresh's FFT-coefficient distinctiveness may add zero signal for NFL outcomes.

## 10. GSE overlap
GSE's existing feature program is **hand-built metrics computed from nflverse** (existing-research map §1: the 2026-09-17 gse-lab drop — 29 CSVs, 15 metric families: team metrics, down splits, drives, EPA distributions, turnover luck, QB aggressiveness, unit matchups, weekly trends; plus the 26-metric catalog). Automated time-series feature extraction from rolling-window sequences (team EPA/game series, drive sequences, market-odds trajectories) is **not covered** — the 2026-09-18 15-area ML research brief commissioned topics but results are "not yet in repo". This paper is new capability, not duplication: it answers which library GSE should reach for. Key actionable guidance: use **catch22** (fast, low-redundancy, 96% behaviorally covered by hctsa) for production pipelines, and **tsfresh** only for offline exploration of its distinctive FFT-style coefficients, with aggressive redundancy pruning (PCA or correlation screening) given its severe within-set redundancy. Note: theft is R-only; GSE would use Python (pycatch22, tsfresh).

## 11. GSE implementation spec
1. Data: nflverse play-by-play 2009–2026 → per-team-per-game sequences: EPA/play, success rate, dropback EPA, rush EPA, pressure rate, turnover margin (17-game seasons; also per-drive sequences for within-game).
2. Feature extraction: **pycatch22** (22 features, ~ms) on rolling 8-game and full-season windows per team-metric series; second pass with **tsfresh** offline (efficient settings, FFT-coefficient groups) on the same windows, then PCA/correlation prune (|ρ| > 0.9 drop) per this paper's redundancy guidance.
3. Selection: stability selection across seasons (see ledger [2188] concept) to keep only features selected in ≥4 of the last 6 seasons.
4. Model: gradient boosting (LightGBM) predicting game outcome (ATS cover / win prob) with auto features + hand-built baseline; also fantasy-points regression for DFS packet.
5. Serving: catch22 features recomputed weekly in the existing gse-lab pipeline; tsfresh batch only in offseason/preseason (2.53 s per 1000-sample series × thousands of windows is fine offline).
6. Effort: ~2–3 engineer-days for the catch22 rolling-window extractor + backtest harness; ~1 day for tsfresh offline pass.

## 12. Reproducible test
Dataset: nflverse pbp 2019–2025 (7 seasons), per-team rolling-8-game windows for EPA/play, success rate, dropback EPA, rush EPA (4 series × 32 teams × 17 weeks). Features: 22 catch22 features per series (computed with pycatch22, NaN-safe for short windows). Target: ATS cover (closing spread from odds API archive). Baseline: hand-built gse-lab metric set (EPA/play, success rate, DVOA proxy) in LightGBM with time-ordered walk-forward (train seasons 2019–2023, validate 2024, test 2025). Metric: log-loss and CLV-weighted accuracy; compare baseline vs baseline+catch22 features. Leakage control: rolling windows strictly lagged (features for week w use games < w only).

## 13. Acceptance / rejection gate
**Adopt the catch22 rolling-window auto-feature block iff** it improves walk-forward log-loss by ≥ 0.003 on the held-out 2025 season vs the hand-built baseline, with no leakage (verified by the lag-audit) and feature-importance stability across ≥4 of 6 seasons. Reject the tsfresh offline block unless its distinctive FFT-coefficient features add ≥ 0.005 log-loss on top of catch22+baseline in the same protocol (this paper's redundancy numbers make tsfresh guilty until proven innocent). Reject the whole lane if neither clears the gate.

## 14. Improvement experiment
Beyond the paper: compute the directed overlap metric S(T|B) (Eq. 1) between GSE's **hand-built metric library** (treated as benchmark B) and the auto-extracted catch22/tsfresh features (test T) on our own diverse panel of team-season sequences. This tells us, quantitatively, which auto features are genuinely new information vs rediscoveries of EPA/success-rate with |ρ| > 0.9 — and lets us keep only the distinctive ones. The paper used it to compare libraries; we'd use it to de-duplicate auto features against our own hand-built library, which directly addresses the redundancy risk before any model training.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2110.10914 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
