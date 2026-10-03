# [1988] Is One Epoch All You Need For Multi-Fidelity Hyperparameter Optimization? (arXiv:2307.15422)

**Citation:** Romain Egelé, Isabelle Guyon, Yixuan Sun, Prasanna Balaprakash (2023). *Is One Epoch All You Need For Multi-Fidelity Hyperparameter Optimization?* arXiv:2307.15422. URL: https://arxiv.org/abs/2307.15422
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADAPT — the 1-epoch screen + top-K full-train tournament is a brutally simple HPO baseline that exposes whether GSE's expensive multi-fidelity schedules are actually buying anything; adopt as the mandatory baseline every fancier scheduler must beat.

## 1. Research question
Do sophisticated multi-fidelity HPO methods (SHA, Hyperband, LCE, BOHB-style) actually beat a trivial baseline: train every candidate for ONE epoch, keep the top-K, train only those to full fidelity? The paper benchmarks this "1-Epoch" baseline against representative MF-HPO methods on classical HPO benchmarks.

## 2. Dataset / schema
Four HPO benchmarks (similar results on all; paper details the Naval Propulsion problem from HPOBench — a tabular regression task — in the main text): HPOBench, LCBench, YAHPO-Gym, JAHS-Bench-201 (incl. CIFAR-10, Colorectal Histology, Fashion-MNIST slices). Full results in extended PDF (github.com/deephyper/scalable-bo/blob/main/esann-23/One_Epoch_Is_Often_All_You_Need_Extended.pdf).

## 3. Method / model
Baseline: random search over HP configs; evaluate each at minimum fidelity (1 epoch); select top-K=3; train only those to maximum fidelity (100 epochs). Compared against max-fidelity-only search, SHA, Hyperband, LCE (learning-curve extrapolation), all combined with random search. Outer loop: 200 configs → max-fidelity policy costs 200×100 = 20,000 epochs; 1-Epoch costs 200×1 + 3×100 = 500 epochs.

## 4. Equations & assumptions
No equations stated. Assumption: early-epoch ranking is informative of final ranking — validated empirically via learning-curve visualizations (1,000 sampled curves colored by final rank; rank-evolution heatmaps).

## 5. Features / target
Inputs: hyperparameter configurations (MLP/ResNet-style spaces per benchmark). Target: test RMSE / accuracy at max fidelity.

## 6. Validation design
Test error vs training epochs consumed (not wall-clock, to abstract implementation differences). Mean ± standard error curves. 200 outer-loop iterations.

## 7. Numerical results / baselines
- Final test RMSE of 1-Epoch ≈ 100-Epochs policy (curves converge to the same point), but 1-Epoch uses 40× fewer training epochs (500 vs 20,000).
- SHA uses ~10× fewer epochs than 100-Epochs but still 4× MORE than 1-Epoch; Hyperband slightly more than SHA; SHA/HB/LCE "do not differ significantly from each other" in final RMSE — all similar, all costlier than the trivial baseline.
- Mechanism: learning curves show a few dominant curves; good (blue) vs bad (red) models separable in the first epoch; ranking of GOOD models stabilizes after ~5 epochs while bad models stay noisy — hence top-K tournament selection handles the noise.
- Only one prior study (PASHA, Bohdal et al. 2023) included a similar baseline, with similar findings.

## 8. Code / data availability
Extended results PDF at the GitHub link above. Benchmarks: HPOBench, LCBench, YAHPO-Gym, JAHS-Bench-201 (all public).

## 9. Leakage & limitations
- Adversarial notes: (1) Benchmarks are dominated by neural-network training where "1 epoch" is meaningful; GSE's workhorse is GBDTs — the analog (few trees / few seasons) needs separate validation, and tree models' early iterations are noisier rankers. (2) Test error plotted vs epochs, not wall-clock — epoch counts hide per-config cost variance. (3) The "dominant learning curves" phenomenon may be benchmark-specific (similar architectures); GSE's heterogeneous model zoo (GBM + neural + Elo-like) may not share it. (4) Top-K=3 at full fidelity is itself a gamble — if the true best config ranks 4th at 1 epoch due to noise, it's lost; the paper's noise analysis justifies K=3 on THEIR benchmarks only.

## 10. GSE overlap
New as a *baseline discipline* — GSE's HPO currently has no mandated simple baseline; any successive-halving/ASHA adoption should first prove it beats 1-epoch+top-K. Connects to ledgers 1986 (FastBO) and 1987 (CQR+MF): both propose fancier schedules that must clear this bar. The Naval Propulsion result (tabular regression) is the closest to GSE's tabular regime.

## 11. GSE implementation spec
- **Immediate:** add the 1-epoch-equivalent baseline to GSE's HPO harness: for neural models, 1 epoch screen + top-3 full train; for GBDTs, the analog is N=50 trees (or 2-season fidelity) screen + top-3 full train. Log epochs/season-fits consumed vs final log-loss.
- **Policy:** no multi-fidelity scheduler (FastBO, halving, ASHA) is adopted unless it beats this baseline on both final log-loss AND total compute in the reproducible test below.
- **Effort:** ~1 day (it's a baseline, not a system).

## 12. Reproducible test
Dataset: nflverse game-level tabular, ATS cover, 2015–2025. Config space: 100 random MLP configs (tabular net) + 100 LightGBM configs. For MLPs: fidelity = epochs (1 vs full); for GBDTs: fidelity = trees (50 vs full). Compare final test log-loss (2024–2025) and total fits of: (a) 1-epoch/50-tree screen + top-3, (b) SHA, (c) full-fidelity random search. Also plot rank-stability: Spearman correlation between min-fidelity rank and full-fidelity rank.

## 13. Acceptance / rejection gate
**ADOPT the baseline as mandatory if:** on GSE's tabular task, the min-fidelity screen's top-3 contains a config within 0.002 log-loss of the full-search best while using ≤10% of the fits (replicating the paper's order-of-magnitude saving). **REJECT the paper's transfer claim if:** min-fidelity rank correlation with full-fidelity rank is <0.5 for GBDT configs (screen is noise), or the top-3 misses the full-search best by >0.005 log-loss — in which case the fancy schedulers keep their jobs and this stays a diagnostic.

## 14. Improvement experiment
Test a *two-stage* screen: 1-epoch rank for speed PLUS learning-curve slope (improvement from epoch 1→3) as a second feature, selecting top-K by a weighted score. Hypothesis: slope separates slow-starting good configs (which pure 1-epoch ranking kills — cf. FastBO's warm-up termination risk) from truly bad ones. Measure: does slope-augmented screening recover any top-5 full-fidelity config that pure 1-epoch screening drops, without increasing total compute?
