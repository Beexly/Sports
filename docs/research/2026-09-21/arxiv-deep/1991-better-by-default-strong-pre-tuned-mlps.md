# [1991] Better by Default: Strong Pre-Tuned MLPs and Boosted Trees on Tabular Data (arXiv:2407.04491)

**Citation:** David Holzmüller, Léo Grinsztajn, Ingo Steinwart (2024). *Better by Default: Strong Pre-Tuned MLPs and Boosted Trees on Tabular Data*. arXiv:2407.04491. URL: https://arxiv.org/abs/2407.04491
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADAPT — meta-tuned default hyperparameters (RealMLP-TD + tuned GBDT defaults) plus algorithm selection over defaults beats per-dataset HPO on time-accuracy tradeoff; GSE should adopt tuned defaults as the starting point and only pay for HPO where it provably wins.

## 1. Research question
GBDT dominance on tabular data was recently challenged by heavily-tuned deep learning — but is that a fair comparison? The paper asks whether better *dataset-independent defaults* (a meta-learning problem) close the gap, and whether trying several strong-default models (algorithm selection, à la AutoML) beats dataset-specific HPO on the time-accuracy tradeoff.

## 2. Dataset / schema
Meta-train benchmark: 118 datasets; disjoint meta-test benchmark: 90 datasets (deliberately more extreme in several dimensions to test out-of-distribution generalization); plus the GBDT-friendly benchmark from Grinsztajn et al. (2022). Medium-to-large tabular datasets (1K–500K samples), classification + regression. Preprocessing: drop rows with missing numerics, missing categoricals as separate category.

## 3. Method / model
1. **RealMLP / RealMLP-TD:** improved MLP (one-hot encoding, robust scaling, smooth clipping, and other architectural tweaks from meta-train experiments) with meta-tuned defaults; simplified variant RealMLP-TD-S; RealTabR-D ports some improvements to TabR.
2. **Tuned defaults (TD)** for XGBoost, LightGBM, CatBoost (Tables C.1–C.3): meta-tuned on the 118-dataset meta-train set. Trends: row subsampling in all tuned defaults; 1000 estimators fixed; hist method for XGBoost.
3. **Comparison protocol:** library defaults (D) vs tuned defaults (TD) vs dataset-dependent HPO — evaluated on the disjoint meta-test set (honest meta-generalization).

## 4. Equations & assumptions
No equations stated in extracted text. Assumption: defaults meta-tuned on 118 datasets generalize to new datasets (tested on the disjoint, more-extreme meta-test set); time-accuracy tradeoff is the right comparison axis (not accuracy alone).

## 5. Features / target
Standard tabular features/targets across the 208 datasets. RealMLP preprocessing: one-hot encoding, robust scaling, smooth clipping.

## 6. Validation design
Meta-train (118) → meta-test (90, disjoint + more extreme) + Grinsztajn benchmark. Compare D vs TD vs HPO per model; algorithm selection over default methods vs HPO on time-performance tradeoff. Multiple aggregation strategies in appendix.

## 7. Numerical results / baselines
Qualitative claims extracted (tables rendered as figures in conversion): RealMLP has "favorable time-accuracy tradeoff compared to other neural baselines and is competitive with GBDTs in terms of benchmark scores"; "a combination of RealMLP and GBDTs with improved default parameters can achieve excellent results without hyperparameter tuning"; tuned defaults "cannot match HPO on average" but "outperform the library defaults on the meta-test benchmark"; "algorithm selection over default methods provides a better time-performance tradeoff than HPO." Exact numeric tables not extractable from this read — verify from PDF before citing magnitudes.

## 8. Code / data availability
RealMLP and tuned-default tables (C.1–C.3) in the paper/appendix; benchmark datasets public. Exact code URL not extracted — verify.

## 9. Leakage & limitations
- Adversarial notes: (1) Meta-test is "more extreme" but still OpenML-style tabular — NFL game data (small-n, non-stationary, heavy-tailed) is out-of-distribution relative to BOTH meta sets; the defaults' transfer to sports is unproven. (2) "Cannot match HPO on average" — tuned defaults are a floor, not a ceiling; GSE still needs HPO for the last mile. (3) Numeric tables not verifiable from this read. (4) 1K–500K sample regime; GSE's game-level rows (~5K games) sit at the small end where GBDTs traditionally dominate anyway.

## 10. GSE overlap
Directly actionable and non-duplicative: GSE's engine uses hand-tuned GBDT configs, but there is no record of *meta-tuned* defaults or a RealMLP-style tabular net in the stack. This paper supplies both the defaults and the discipline (disjoint meta-train/meta-test) for deriving GSE's own. Connects to ledger 1985 (TabRepo portfolios are the expensive version of this paper's cheap insight: start from strong defaults).

## 11. GSE implementation spec
- **Immediate (no search cost):** add RealMLP-TD (or TD-S) as a base model in the AutoGluon zoo (ledger 1982) with the paper's tuned defaults; replace library-default LightGBM/XGBoost/CatBoost configs with the paper's TD tables (C.1–C.3) as the new defaults.
- **Derive GSE-TD:** replicate the meta protocol on sports data — meta-train defaults on 2015–2020 seasons, validate on disjoint 2021–2025 (temporally disjoint, the honest sports analog), per market.
- **Policy:** algorithm selection over strong defaults runs FIRST each offseason; HPO (ledgers 1986/1987/1990) only runs where it beats selection by the gate below.
- **Effort:** 2-3 days to wire in defaults; 1 week for the GSE-TD meta derivation.

## 12. Reproducible test
Dataset: nflverse game-level tabular, ATS cover + totals, 2015–2025. Compare on 2021–2025 (meta-test): (a) library defaults, (b) paper TD defaults, (c) GSE-TD (meta-tuned on 2015–2020), (d) full HPO from (b). Metric: log-loss + wall-clock. Algorithm selection over {(b),(c),RealMLP-TD} vs HPO on time-accuracy.

## 13. Acceptance / rejection gate
**ADOPT if:** paper-TD defaults beat library defaults by ≥0.002 log-loss on 2021–2025 without any search, AND algorithm selection over defaults reaches within 0.002 of full HPO at ≤20% of the compute. **REJECT the transfer if:** TD defaults don't beat library defaults on NFL data (meta-overfitting to OpenML-style tasks) — then derive GSE-TD from scratch and re-gate.

## 14. Improvement experiment
Meta-tune defaults CONDITIONED on regime: separate default sets for high-scoring vs low-scoring eras (or pre/post major rule changes), selected by a cheap era classifier. Hypothesis: one global default is a compromise; era-conditional defaults capture the non-stationarity that a single TD set averages away. Test: era-conditional TD vs global TD on the 2021–2025 meta-test; success = ≥0.001 log-loss win.
