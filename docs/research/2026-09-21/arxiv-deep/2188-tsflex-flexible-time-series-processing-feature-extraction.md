# [2188] tsflex: Flexible Time Series Processing & Feature Extraction (arXiv:2111.12429v2)

**Citation:** Jonas Van Der Donckt, Jeroen Van Der Donckt, Emiel Deprost, and Sofie Van Hoecke (2021, IDLab, Ghent University – imec). *tsflex: Flexible Time Series Processing & Feature Extraction*. SoftwareX. arXiv:2111.12429v2. URL: https://arxiv.org/abs/2111.12429
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADOPT

*Rationale:* tsflex is a production-ready, MIT-licensed Python toolkit that solves exactly GSE's auto-feature-extraction plumbing problem: sequence-index-based strided windows (handles irregular sampling, bye weeks, uneven odds timestamps), multivariate series, multiple window/stride configs in one pass, and wrappers around tsfresh/TSFEL/scipy/sklearn feature functions — at ~3× the speed and ~2.5× less memory than the nearest competitor. It becomes the extraction backbone for the rolling-window feature program.

## 1. Research question
Existing Python time-series feature-extraction packages (seglearn, tsfresh, TSFEL, Kats) assume regularly-sampled, aligned, gap-free data and define windows/strides in sample counts; none support multiple strided-window configurations, categorical dtypes, or chunked/streaming series, and all carry large runtime/memory overhead. Can a toolkit built on pandas with sequence-index-typed window/stride arguments deliver both the missing flexibility and superior performance?

## 2. Dataset / schema
Software paper — no ML dataset. Benchmark: synthetically generated DataFrame, 5 channels, 1 hour span, float32, sampled at 1000 Hz, no gaps (to satisfy competitors' assumptions); identical features extracted with 30 s window / 10 s stride; 20 fresh-process runs per toolkit config; profiled with VizTracer on Intel Xeon E5-2650 v2, Ubuntu 18.04. Production use case cited: mBrain study real-time sensor pipelines (gaps, irregular rates, large chunks).

## 3. Method / model
**Architecture** (two submodules):
- `tsflex.processing`: `SeriesPipeline` of sequential `SeriesProcessor` steps (function + series_names + kwargs); one-to-one/one-to-many/many-to-one/many-to-many functions supported; wraps scipy.signal, statsmodels.tsa, etc.
- `tsflex.features`: `FeatureCollection` registry of `FeatureDescriptor`s, each = (series_name(s), feature function, **window, stride**). `FuncWrapper` configures output names, kwargs, and input dtype (numpy array vs pandas Series). Features computed on strided rolling windows, optionally in parallel (multiprocessing), with chunking of long series, serialization, and detailed execution logging.
**Key design decisions:** (i) window/stride typed as the sequence index (e.g. `window="5min", stride="30s"` on time-indexed data, or integer counts) — no fixed-sampling assumption, gaps allowed; (ii) pandas-native → numeric, categorical, boolean, time-based, string dtypes; (iii) multivariate + asynchronous series; (iv) multiple window/stride configs in one collection; (v) `make_robust` wrapper for NaN-safe feature functions; (vi) integrates feature functions from NumPy, SciPy, seglearn, tsfresh, TSFEL, sklearn.

## 4. Equations & assumptions
No equations stated (software paper). Assumptions: (i) pandas DatetimeIndex/numeric index faithfully represents sampling; (ii) it is the *feature function's* responsibility to handle gaps/irregularity correctly (tsflex provides the `make_robust` wrapper); (iii) view-based (zero-copy) NumPy operations underlie the memory efficiency.

## 5. Features / target
Not an ML paper — no features/target. The toolkit *produces* features from raw series via user-registered functions.

## 6. Validation design
Benchmark: identical feature sets across tsflex / TSFEL / seglearn / tsfresh on the synthetic 5-channel data; 20 independent runs; mean ± std of peak memory (MB) and runtime (s), sequential and multiprocessing. Benchmark code open-sourced for reproduction.

## 7. Numerical results / baselines
Table 3 (mean ± std over 20 runs):
- **Peak memory (MB), sequential:** tsflex 1.3 ± 0.1; TSFEL 3.5 ± 0.3; seglearn 435.3 ± 1.5; tsfresh 3540 ± 13.9. **Multiprocessing:** tsflex 1.5 ± 0.1; TSFEL 3.7 ± 0.1; tsfresh 4044 ± 14.4 (seglearn n/a).
- **Runtime (s), sequential:** tsflex 4.3 ± 0.1; TSFEL 16.4 ± 0.8; seglearn 9.2 ± 0.1; tsfresh 169.8 ± 1.6. **Multiprocessing:** tsflex 0.7 ± 0.0; TSFEL 2.1 ± 0.0; tsfresh 98.5 ± 1.2.
- Paper's claims: ~3× faster than closest competitor (TSFEL) in both modes; ~2.5× less peak memory than TSFEL; view-based ops (tsflex, TSFEL) vs tsfresh's expensive reformat-to-long expansion (visible as a memory slope in the profile). tsfresh multiprocessing barely helps (169.8 → 98.5 s) due to overhead.

## 8. Code / data availability
Code: https://github.com/predict-idlab/tsflex (MIT license; paper version 0.2.3). Docs: https://predict-idlab.github.io/tsflex. Install: `pip install tsflex`. Benchmark code open-sourced (repo linked in paper footnote).

## 9. Leakage & limitations
Adversarial read: (i) software paper — no predictive validation; performance claims are engineering benchmarks on synthetic regular data (the authors' own flexibility advantages are *not* benchmarked against competitors, since competitors can't run on irregular data at all); (ii) benchmark features were "the same features" but tsfresh's 169.8 s includes its format-expansion overhead — partly a benchmarking choice, not pure compute; (iii) flexibility puts correctness burden on the user: gap/irregular handling is the feature function's job, so a naive function on bye-week-gapped NFL data silently computes garbage unless wrapped with `make_robust`; (iv) pandas-based — at nflverse scale this is fine, but it's not a distributed framework; (v) version drift: paper is v0.2.3 (2021); current tsflex API should be re-verified before adoption.

## 10. GSE overlap
GSE's feature engineering today is hand-rolled scripts in the 2026-09-17 gse-lab drop (29 CSVs built from nflverse) — no unified extraction framework, no multi-window/stride registry, no irregular-sampling handling. tsflex slots in as the **standardized extraction layer** underneath ledgers 2182 (catch22 rolling windows), 2183 (windowed tsfresh for anomaly detection), and 2187 (windowed CNN features): one `FeatureCollection` can register catch22/tsfresh/custom functions across 4-game, 8-game, and season windows with game-date-indexed strides in a single pass, replacing bespoke loops. The bye-week gap problem (each team misses one week — irregular sampling) is exactly what tsflex's index-based windows handle natively. New infrastructure capability, zero duplication.

## 11. GSE implementation spec
1. `pip install tsflex` (pin version; verify API vs 0.2.3 paper).
2. Build `gse_features/collection.py`: one `FeatureCollection` registering — (a) catch22 via `pycatch22` wrapped per series (window=8 games, stride=1 game, on DatetimeIndex of game dates); (b) custom gse-lab metric functions (EPA/play, success rate, etc.) on 4/8/17-game windows; (c) tsfresh "Efficient" subset offline on season windows.
3. Processing pipeline: `SeriesPipeline` for cleaning (dedupe, bye-week gap marking, odds-timestamp alignment) before extraction.
4. Integrate into the existing gse-lab build scripts: replace ad-hoc rolling loops with the collection; serialize the fitted collection (tsflex supports serialization) for reproducibility.
5. Multiprocessing for the weekly rebuild (paper: 0.7 s vs 4.3 s class of speedups at scale).
6. Effort: ~2 engineer-days (collection definition + swap into gse-lab scripts + regression test that outputs match the hand-rolled CSVs exactly).

## 12. Reproducible test
Dataset: nflverse pbp 2023–2025. Task: reimplement three existing gse-lab rolling features (8-game EPA/play, 4-game success rate, season pressure rate) as a tsflex `FeatureCollection` on game-date-indexed series with bye-week gaps present. Success criteria: (a) numerical equality with the current hand-rolled CSVs to 1e-9 (correctness); (b) wall-clock time for the full 32-team rebuild ≤ 50% of the current script's time (performance); (c) a deliberately introduced 2-week gap in one team's series produces NaN (not silently wrong values) for windows crossing the gap — verifying the `make_robust` behavior.

## 13. Acceptance / rejection gate
**Adopt tsflex as the extraction backbone iff** the reproducibility test passes all three criteria (exact numerical match, ≥2× speedup on the rebuild, correct gap handling) AND the pinned version's API supports everything the collection needs (multi-window registration, serialization, multiprocessing) without workarounds. Reject if numerical mismatches appear (index-alignment bugs), if the current tsflex version dropped/changed the paper's APIs, or if the gap-handling test shows silent wrong values even with `make_robust`. This is infrastructure: the gate is correctness + performance, not predictive lift.

## 14. Improvement experiment
Beyond the paper: exploit tsflex's **multiple window-stride configs in one pass** to build a "scale-space" feature tensor per team-game — the same function (e.g., EPA/play mean, catch22's DN_HistogramMode) computed at 4-, 8-, 17-game windows simultaneously — then learn per-scale attention weights in the meta-learner (which window matters for which matchup type). The paper benchmarks single-config extraction; GSE's edge would be multi-scale features with learned scale weighting, turning tsflex's registry into a scale-space microscope over team form.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2111.12429 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
