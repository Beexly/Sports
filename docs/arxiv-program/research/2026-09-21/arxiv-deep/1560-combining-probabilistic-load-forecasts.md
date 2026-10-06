# [1560] Combining Probabilistic Load Forecasts (arXiv:1803.06730) — replacement for REJECTED [1549]

**Citation:** Wang, Y., Zhang, N., Tan, Y., Hong, T., Kirschen, D. S. and Kang, C. (2018). *Combining Probabilistic Load Forecasts*. arXiv:1803.06730v1 [stat.AP]. URL: https://arxiv.org/abs/1803.06730
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 10 pages, all sections incl. LP derivation, case studies Tables II–III, Figs. 2–7, refs).
**Verdict:** ADAPT — the cleanest quantile-combination method in this lane: per-quantile weights from a pinball-loss linear program with simplex constraints (nonnegative, sum-to-one), which both optimizes and sparsifies (prunes weak models automatically). A 4.39% average pinball-score cut vs. the best individual model on public data. This is the probabilistic-side combiner GSE's quantile/prop outputs need.

## 1. Research question
Forecast combination is best practice for point forecasts but had never been formally adopted for *probabilistic* (quantile) load forecasts. Can a constrained quantile regression averaging (CQRA) method — weights estimated by minimizing pinball loss under nonnegativity + sum-to-one constraints, formulated as a linear program — produce an ensemble that beats the best individual probabilistic forecast and nine benchmark combiners on public data?

## 2. Dataset / schema
- **ISO New England:** hourly zonal load, 8 zones (CT, ME, NH, RI, VT, NEMASS, SEMASS, WCMASS) + system total SYS, 2013-01-01 → 2016-12-31 (4 years). Split: years 1–2 train/validate individual models (T1/T2), year 3 combination weights (T3), year 4 final test (T4). Task: day-ahead probabilistic (quantiles 10%–90%).
- **CER Irish smart-meter:** 10 individual residential consumers, 30-min → hourly profiles, 2009-07-15 → 2010-12-31; same T1–T4 split logic. Task: hour-ahead probabilistic. High-volatility series (quantiles 10/90 don't cover spikes, Fig. 7).
- 13 individual models: 5 QRNN (hidden units 4–8), 4 QRRF (mtry = 1/2,1/3,1/4,1/5; 500 trees), 4 QRGB (trees 70–100 step 10). R: qrnn, quantregForest, gbm; LP via YALMIP/MATLAB.

## 3. Method / model
- **CQRA-T (proposed):** for each quantile q, ŷ_{t,q} = Σ_n ω_{n,q} ŷ_{n,t,q} (Eq. 15 — weighted sum of the q-th quantiles approximates the q-th quantile of the mixture, per [30]); weights from min_ω Σ_t pinball_q(ŷ_{t,q}, y_t) s.t. Σω_n=1, ω_n≥0 (Eq. 14) → LP via auxiliary variables v_{t,q} (Eq. 17; proof that dropping the complementarity constraint preserves optimality).
- **Key properties:** the simplex constraints make CQRA a special case of lasso (Remark 2) → automatic model pruning; quantile crossing handled by naive rearrangement (Chernozhukov et al. 2010) — chosen over joint constrained fitting for cost reasons, with few crossings observed.
- **Benchmarks (9):** Naïve Sorting, Median, Simple Averaging, inverse-loss Weighted Averaging, QRA-E/A/T (unconstrained quantile regression on averaged/all/targeted quantiles), CQRA-E/A (constrained variants on averaged/all quantiles).

## 4. Equations & assumptions
- Pinball loss (Eq. 1); QR parameter estimation (Eq. 2); QRNN (3)–(6) with weight-decay + smooth pinball approximation; QRRF (7)–(8); QRGB (9)–(10).
- Combination (11)/(13); per-quantile LP (14)→(17); overall score L = mean pinball over T4 × Q (Eq. 18); competitors (19)–(30).
- **Assumptions:** weighted-quantile-sum approximates mixture quantiles (Eq. 15); per-quantile independence (no cross-quantile constraints); simplex weights (convex combination); 4-way time split controls overfitting (optimal splitting left to future work).

## 5. Features / target
- **Inputs:** N=13 models' quantile forecasts ŷ_{n,t,q} for q ∈ {10%,…,90%}.
- **Target:** realized load y_t; loss = pinball at each q, averaged.

## 6. Validation design
- Chronological 4-way split (T1 train, T2 validate/tune, T3 fit combination weights, T4 test) — no leakage of test into weight estimation.
- Per-zone (9 profiles) and per-consumer (10 meters) pinball tables; relative-improvement plots vs. best individual (Figs. 3–4); weight/pruning diagnostics (Figs. 5–6).

## 7. Numerical results / baselines
- **ISO-NE (Table II):** CQRA-T lowest pinball loss on **all 9 profiles**; average improvement vs. best individual (BI) **4.39%** (e.g., SYS: 269.953 vs BI 288.563; CT: 77.961 vs 81.478; ME: 17.492 vs 18.146).
- **CER residential (Table III):** CQRA-T best on 9 of 10 consumers (exception #1016: nothing beats BI — honest negative). Unconstrained QRA variants *worse than BI* on all 10 consumers (overfitting from N×Q regressors) — the paper's explanation for why the simplex constraint matters: it restricts to the N most relevant quantiles.
- **Pruning (Fig. 5):** models #12/#13 pruned for all quantiles (SYS); 6–9 of 13 models retained per quantile; weights not smooth across q (sparsity + per-quantile training).
- **Cautionary:** adding simplex constraints to QRA-E (CQRA-E) *strongly worsened* it (e.g., SYS 356.527 vs 276.417) — constraints help only when regressors are the targeted quantiles (CQRA-T), because averaging-first then constraining collapses the feasible interval.

## 8. Code / data availability
No author code link; standard tooling (R qrnn/quantregForest/gbm, YALMIP). Data public (ISO-NE, CER Irish smart meter). Method fully specified — a one-day implementation.

## 9. Leakage & limitations
- **Weight estimation on T3, tested on T4** — clean, but the T1/T2/T3/T4 breakpoints are ad hoc (authors defer optimal splitting to future work); in NFL the analogue (how many seasons for weights) needs its own tuning.
- **Eq. (15) is an approximation**, not an identity — the q-th quantile of a mixture ≠ mixture of q-th quantiles in general; works empirically here but can distort tail quantiles.
- **Per-quantile independent fits** → weights jump across q (Fig. 5); naive rearrangement patches crossing but the combined quantile *curve* can be jagged — for GSE's smooth prop distributions, consider smoothing ω_q across q (cf. [1559]'s horizon smoothing idea).
- **CQRA-E failure mode** is instructive: constraints + wrong regressor choice = disaster (SYS pinball 356 vs 270). The method is not "constraints always help" — it's "constraints on targeted quantiles help."
- Residential spikes uncovered by 10/90 quantiles — tail risk beyond the modeled quantile range is invisible; GSE props with fat tails need wider q grids.
- Only 9 quantiles (10%–90%); no extreme-tail evaluation.

## 10. GSE overlap
Existing-research map: no quantile-combination method exists in the corpus. [1554] combines *densities* (beta-transformed linear pools) — CQRA is the quantile-native alternative, and the two answer different questions (CQRA optimizes pinball per quantile; beta-pooling optimizes log score with calibration). [1557]'s REF is point-forecast only. This fills the probabilistic-combination gap for GSE's quantile outputs (prop distributions, margin quantiles) and complements [1559]'s smoothed BOA (which is MAE/median-oriented). The automatic pruning is a feature no other lane ledger offers.

## 11. GSE implementation spec
- **Data sources:** GSE sub-model quantile forecasts for margin/total (e.g., deciles from each sub-model's predictive distribution), 2020–2025, actuals from nflverse.
- **Build:** per market (spread, total), per quantile q: fit ω_q by pinball-loss LP (scipy.optimize.linprog — the Eq. 17 RLP form; trivially small: T×2 constraints) on rolling T3-style window (e.g., prior season), test on next season. Naive rearrangement across q. Publish combined quantiles + the retained-model set per q (interpretability bonus: which sub-models survive per quantile).
- **Effort:** 1–2 days (linprog + rolling harness).

## 12. Reproducible test
2021–2023 for sub-model quantile generation + weight fitting (T1–T3 analogue), 2024 test: CQRA-T vs. best individual sub-model quantile set, simple averaging, median, and inverse-pinball weighted averaging. Metric: mean pinball loss over q ∈ {10%,…,90%} and over markets; report per-quantile to check the paper's "no clear quantile pattern" finding (Fig. 4). Strictly chronological.

## 13. Acceptance / rejection gate
ADOPT if CQRA-T cuts mean pinball ≥3% vs. the best individual sub-model's quantiles on the 2024 holdout **and** beats simple averaging by ≥1% (the paper's margin over SA was ~3.7% on SYS: 269.953 vs 280.375). REJECT if the LP prunes to a single model (degenerate — just model selection) or if unconstrained QRA-T matches it (then constraints add nothing and the simpler method wins).

## 14. Improvement experiment
**Cross-quantile smoothed CQRA.** The paper's per-quantile independence causes jagged ω_q (Fig. 5) and needs post-hoc rearrangement. Add a fused-lasso/total-variation penalty Σ_q‖ω_q − ω_{q−1}‖₁ to the LP (still an LP) so weights vary smoothly across quantiles, with the penalty tuned on T2. Hypothesis: smoothed weights reduce quantile crossing at the source (less rearrangement needed), improve tail-quantile stability where data is thin, and match or beat independent CQRA-T on pinball — effectively merging this paper's LP with [1559]'s smoothing insight, but across the quantile dimension instead of the horizon dimension.
