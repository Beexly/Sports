# [1986] FastBO: Fast HPO and NAS with Adaptive Fidelity Identification (arXiv:2409.00584)

**Citation:** Jiantong Jiang, Ajmal Mian (2024). *FastBO: Fast HPO and NAS with Adaptive Fidelity Identification*. arXiv:2409.00584. URL: https://arxiv.org/abs/2409.00584
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text). NOTE: the paper states it is an extended abstract of a conference paper, omitting finer details.
**Lane:** nas_automl.
**Verdict:** ADAPT — per-configuration adaptive fidelity (efficient/saturation points on the learning curve) is a cleaner stopping rule than fixed successive-halving rungs, directly usable for GSE's seasonal HPO budget.

## 1. Research question
In multi-fidelity Bayesian optimization for HPO/NAS, which fidelity's observation should feed the surrogate model for each configuration? Fixed-fidelity and fixed-rung (Hyperband/ASHA) schedules waste budget on bad configs and under-train good ones. The paper proposes identifying, per configuration, the fidelity where further resources stop paying off.

## 2. Dataset / schema
HPO/NAS benchmarks: LCBench, NAS-Bench-201, FCNet (tabular HPO + NAS benchmarks). No sports data. Exact task counts not stated in the extended abstract.

## 3. Method / model
FastBO process per configuration λ_i with learning curve C_i(r) over resource/fidelity r:
1. **Warm-up stage:** collect early observations; terminate configs showing consecutive performance deterioration.
2. **Learn the curve:** estimate C_i(r) from the observation set.
3. **Efficient point** e_i = min{ r | C_i(r) − C_i(2r) < δ_1 }: doubling resources past this point yields < δ_1 improvement. Evaluate the config to e_i and use that observation to update the BO surrogate (resource-to-performance sweet spot).
4. **Saturation point** s_i = min{ r | ∀ r′>r, |C_i(r′)−C_i(r)| < δ_2 }: performance plateaus. Post-processing: the incumbent is trained to its saturation point.
5. Generality claim: the adaptive-fidelity identification strategy can extend ANY single-fidelity method to the multi-fidelity setting.

## 4. Equations & assumptions
- e_i = min{ r | C_i(r) − C_i(2r) < δ_1 }; s_i = min{ r | ∀r′>r, |C_i(r′)−C_i(r)| < δ_2 }, δ_1, δ_2 predefined small thresholds.
- Assumption: learning curves are well-behaved enough to estimate e_i, s_i from early observations; efficient-point observations preserve inter-config ranking for the surrogate.

## 5. Features / target
Inputs: hyperparameter configurations / neural architectures. Target: benchmark performance metric (accuracy/loss per benchmark task).

## 6. Validation design
Anytime-performance curves on LCBench, NAS-Bench-201, FCNet. Baselines: random search, standard BO, ASHA, Hyperband, PASHA, A-BOHB, A-CQR, BOHB, DyHPO, Hyper-Tune. Metrics not numerically tabulated in the abstract — claims rest on Figures 2–3 (anytime curves).

## 7. Numerical results / baselines
No exact numbers stated in the extended abstract (figures only). Claims: "FastBO can handle various performance metrics and shows strong anytime performance"; "FastBO gains an advantage earlier than other methods, rapidly converging to the global optimum after the initial phase" on all three benchmarks. Treat as qualitative — the full conference paper would be needed for numbers.

## 8. Code / data availability
None stated in the extended abstract.

## 9. Leakage & limitations
- Adversarial notes: (1) Extended abstract — no numbers, no ablations, no code; the anytime-performance claim is unverifiable from this text. (2) Benchmarks are vision/NAS-centric (NAS-Bench-201) — transfer to tabular sports HPO unproven. (3) Learning-curve estimation from early observations is noisy for GBDT configs where performance jumps discontinuously with tree count; δ_1/δ_2 thresholds need tuning per model family. (4) Early termination on "consecutive deterioration" risks killing slow-starting configs (e.g., regularized models).

## 10. GSE overlap
New mechanism — no per-config adaptive fidelity exists in the corpus. Complements ledger 1984 (auto-sktime's fixed lookback-window rungs): FastBO's e_i/s_i could REPLACE fixed rungs with data-driven stopping per config. Connects to the HPO-for-tree-boosting thread (2602.05786, candidate).

## 11. GSE implementation spec
- **Use case:** GSE's offseason LightGBM/XGBoost/CatBoost HPO. Fidelity r = number of training seasons (or boosting rounds). For each config: warm-up on 2 most recent seasons → estimate learning curve over seasons → compute e_i (seasons beyond which log-loss improves < δ_1) → update surrogate with the e_i observation → train incumbent to s_i.
- **Implementation:** extend existing Optuna/BO loop with a curve-fitting step (isotonic or parametric fit of log-loss vs seasons); thresholds δ_1 = 0.0005 log-loss, δ_2 = 0.0002 (tunable).
- **Effort:** ~3-5 days; no new infra beyond the HPO loop.

## 12. Reproducible test
Dataset: nflverse game-level tabular, ATS cover, seasons 2015–2025. HPO over LightGBM space (50 configs). Compare (a) FastBO-style adaptive fidelity vs (b) fixed successive halving (2→4→8 seasons) vs (c) full-history evaluation: total season-fits consumed and best config's log-loss on held-out 2024–2025.

## 13. Acceptance / rejection gate
**ADOPT if:** adaptive fidelity reaches within 0.001 log-loss of the full-evaluation best config using ≤50% of the season-fits of fixed halving, with no config wrongly early-terminated (check: no top-5 full-evaluation config killed in warm-up). **REJECT if:** compute savings <25%, or ≥1 top-5 config is killed early, or δ thresholds prove untransferable across model families (needs per-family tuning = complexity not worth it).

## 14. Improvement experiment
Make δ_1/δ_2 themselves learned: fit a meta-model predicting the efficient point from config features + dataset meta-features (from the GSE-TabRepo log, ledger 1985) so new configs get a predicted e_i BEFORE any evaluation — zero-shot fidelity. Test whether predicted-e_i fidelity preserves surrogate ranking (Spearman ≥0.9 vs true full-fidelity ranking on a config sample).
