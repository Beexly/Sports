# [0763] Distributional Regression with Tabular Foundation Models: Evaluating Probabilistic Predictions via Proper Scoring Rules (arXiv:2603.08206v5)

**Citation:** Jonas Landsgesell, Pascal Knoll, Tizian Wenzel (2026). *Distributional Regression with Tabular Foundation Models: Evaluating Probabilistic Predictions via Proper Scoring Rules*. arXiv:2603.08206v5. URL: https://arxiv.org/abs/2603.08206
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2603.08206.txt`; complete paper incl. appendix, verified end-to-end).
**Verdict:** ADAPT — the loss-function alignment doctrine (train with the scoring rule you will be judged on; β-energy/CRPS/CRLS/IS95 as the metric family) ports directly to GSE's tabular model training and calibration evaluation; adapt to binary/interval targets (win prob → log loss/CLV; score margins → CRPS; season totals → IS95).

## 1. Research question
TabPFN/TabICL produce full predictive distributions, but tabular benchmarks (TabArena, TALENT) evaluate only point metrics (RMSE, R²). The paper asks: (i) how do realTabPFNv2.5 vs TabICLv2 compare when judged by proper scoring rules (CRPS, CRLS, Interval Score); (ii) do different proper scoring rules induce different model rankings and different finite-sample inductive biases during training, despite all being minimized by the true distribution in population; (iii) can fine-tuning realTabPFNv2.5 with scoring rules unseen in pretraining (CRLS, β=1.8 energy) improve the corresponding metrics?

## 2. Dataset / schema
- **20 OpenML regression datasets** per the abstract (appendix §9.5 lists 23: house_prices 42165, Bike_Sharing_Demand 42713, elevators 216, physiochemical_protein 44963, california_housing 43939, black_friday 41540, nyc-taxi-green-dec-2016 42729, abalone 183, Ailerons 296, house_16H 821, wine_quality 287, cpu_small 227, delta_ailerons 803, puma32H 308, kin8nm 189, 2018-Airplane-Flights 43849, california 44090, diamonds 42225, solar_flare 44966, credit 44089, aloi 42396, Mercedes_Benz_Greener_Manufacturing 42570, house_sales 42092 — the paper says 20 in the abstract but enumerates 23 in the appendix; treat "20" as approximate).
- Each subsampled to ≤3000 instances; 5-fold cross-validation with paired metrics on identical held-out splits.
- Synthetic toy datasets (§9.4): X~Uniform(−4,4), y=f(X)+ε, ε = N(0,0.2²) with probability 0.75 else heavy outliers N(−7,1.5²) or N(7,1.5²); f from {dampened oscillation, polynomial, rectified trend, piecewise sawtooth}.

## 3. Method / model
- Models: realTabPFNv2.5 (PFN, adaptive-grid discretized distributional output, pretrained with default loss) vs TabICLv2 (quantile-estimating PFN, trained with CRPS since Feb 2026). Comparison models fine-tuned from the realTabPFNv2.5 checkpoint with custom losses.
- Fine-tuning (TabPFN code, §9.5): learning_rate 1e-5, weight_decay 0.1, 600 epochs, early_stopping_patience 20, n_finetune_ctx_plus_query_samples 20,000, split ratio 0.4, built-in loss weights (crps/crls/ce/mse/mae) all 0.0 with custom implementation weight 1.0, average_before_softmax True, n_estimators 1/8/8.
- Fine-tuning objectives reported: CRLS (also as early-stopping metric) and β=1.8 energy score (early stopping on MAE — the authors note changing the early-stopping metric "showed strongly varying performance").
- Six metrics: MAE, RMSE, R², CRPS, CRLS, IS95 (α=0.05). Positive = improvement over baseline; W/L/T counts datasets beating baseline by >ε=0.001.
- Analytic section: β-energy family on Dirac-delta toy models A–E (bias, outlier, scale, shift, zero) over x∈[−3,3], g(x)=sin(x); ranking reversals under β=0.2/1.073/2.0.
- XGBoost alignment demos (§9.4): custom Bregman power-divergence objectives (p=−0.5: Breg-0.5 0.203±0.214 beats TabICL 0.558±0.371 and TabPFN 0.478±0.292 on 20 synthetic sets, though MSE is worse: 12.54 vs 9.49/9.57); weighted-CRPS XGBoost beats TabICL 14.1% (left tail) / 17.7% (right tail), 15/20 wins; on real OpenML sets, Bregman-XGBoost relative gaps of 81.2% (Brazilian_houses) and 84.5% (House_prices_nominal).

## 4. Equations & assumptions
(1) f*=argmin_f E[(Y−f(X))²], solution E[Y|X]. (2) Properness: E_{y~Q}[S(Q,y)] ≤ E_{y~Q}[S(P,y)]. (3) Empirical score Ê_n[S(F̂,y)]=(1/n)Σ S(F̂,y_i). (4) CRPS(F,y)=∫(F(z)−1{y≤z})²dz. (5) Consistency for functionals. (6) Discretized CRPS ≈ Σ_i(F(x_i)−1{x_i≥y})²Δx_i. (7)/(10)/(14) β-energy: S_β(F,y)=E_F‖X−y‖^β − ½E_F‖X−X′‖^β, β∈(0,2); β=1→CRPS; β=2→MSE-equivalent. (8) CRLS(F,y)=−∫log|F(x)+1{y≤x}−1|dx. (9) Interval score S_α(F,y)=(u−l)+(2/α)(l−y)1{y<l}+(2/α)(y−u)1{y>u}. (11) Variogram score S_{VS,p}=Σ_{j,k} w_{jk}(|y_j−y_k|^p − E_F|X_j−X_k|^p)². (15)–(18) analytic proof: point-mass forecast under β-energy reduces to |m̂−y|^β; β=1→median minimiser (via ∂Ê[|m̂−y|]/∂m̂=Pr(y<m̂)−Pr(y>m̂)=0), β=2→mean minimiser. (19) wCRPS with weight w(x). (20)–(23) power-Bregman family, Itakura–Saito (p=−1), Poisson/KL (p=0), D_p(y,μ)=(y^{p+2}/((p+1)(p+2))) − yμ^{p+1}/(p+1) + μ^{p+2}/(p+2). (24)–(26) tail-weighted wCRPS, w=(1−u)² left / u² right.
Assumptions: propriety of each rule w.r.t. the predictive class; finite-sample gradient structure governs inductive bias; discretization grid of TabPFN output is fine enough that (6) approximates (4); 5-fold CV estimates are representative.

## 5. Features / target
Input features: the OpenML datasets' native tabular features (house price attributes, bike-sharing temporal features, protein assay descriptors, etc. — not enumerated per dataset). Target: real-valued regression target per dataset. The modelled object is the full predictive distribution (discretized PMF / quantile set); point functionals (mean/median/quantiles) are derived secondarily.

## 6. Validation design
5-fold CV on each subsampled dataset, paired comparisons on identical held-out splits (baseline vs fine-tuned vs TabICLv2). Six metrics; improvements relative to baseline with W/L/T tallies at ε=0.001. Early stopping metric = training objective (a confound the authors acknowledge). Toy studies (ranking reversal, XGBoost alignment) use 20 synthetic datasets with known DGP. No time-ordered splits — i.i.d. tabular assumption; distribution shift across datasets is the "out-of-distribution" dimension. Note: the authors are candid that TabICLv2 comparison is not a clean ablation (architecture + pretraining data differ).

## 7. Numerical results / baselines
Table 3 aggregated improvements vs realTabPFNv2.5 baseline (mean±std, median, W/L/T):
- β(1.8)-Energy FT: MAE +4.28%±10.06% (median +1.46%, 61/21/8); RMSE +2.16%±4.39% (61/24/5); R² +1.47pp±3.73pp (52/19/19); CRPS +2.76%±6.38% (61/23/6); IS95 +2.24%±13.86% (55/33/2).
- CRLS FT: MAE +0.65%±10.13% (54/41/5); RMSE +1.67%±4.60% (73/25/2); R² +0.94pp±2.40pp (64/20/16); CRLS +2.27%±7.00% (median +1.47%, 79/18/3); IS95 +3.87%±13.15% (75/22/3).
- TabICLv2: MAE +1.41% (56/48/1); RMSE +1.85% (65/34/6); R² +3.22pp±17.03pp (56/27/22); CRPS +2.01% (59/45/1); CRLS +6.01%±10.95% (median +3.49%, 84/19/2); IS95 +5.14%±14.18% (70/35/0).
"No model best in all metrics indicating complex trade-offs."
- Toy ranking (Table 2): Model B (outlier) ranks 1 at β=0.2 but 4 at β=2.0; Model A (bias) ranks 2 at β=0.2, 1 at β=1.073 and 2.0. Merkle et al. cited: Spearman correlation between Brier- and log-score forecaster rankings only 0.15.
- Fine-tuning on 20 datasets "yields consistent improvements on the corresponding metrics" for CRLS and β=1.8 energy.

## 8. Code / data availability
Fine-tuning code adapted from the TabPFN GitHub (authors' PR PriorLabs/TabPFN#689 introduced the CRPS loss, Dec 2025). OpenML datasets via standard OpenML IDs. A "scoringBench" benchmark is "being prepared in a separate paper" — not yet released. Hyperparameters in §9.5 (quoted above). No direct repo URL given for the paper's own experiments ("None stated" beyond the TabPFN adaptation reference).

## 9. Leakage & limitations
No target leakage (standard i.i.d. CV). Adversarial notes: (i) dataset count inconsistency (abstract "20" vs 23 listed in §9.5); (ii) early-stopping metric = training objective, which the authors admit changes checkpoint selection substantially — a partial confound in the fine-tuning gains; (iii) TabICLv2 comparison is explicitly not a clean ablation; (iv) high std on improvements (e.g. IS95 ±13.86%) — gains are dataset-dependent, some datasets lose badly; (v) log score gradient unbounded as f̂(y)→0 → numerical instability, a reason they prefer CRPS-family; (vi) §7: all scoring rules fail to elicit tail-region properties where data are absent (epistemic uncertainty) — directly relevant to rare sports outcomes; (vii) open question: which rule for pretraining, and task-token conditioning may not generalise over the infinite family of proper rules.

## 10. GSE overlap
Extension, not duplicate. Research map calibration stack (CQR, grouping loss, temperature scaling, Platt/isotonic, Venn-Abers, LRD, ECE-by-slice) covers post-hoc calibration but does NOT cover training-loss alignment to decision-relevant scoring rules. The map's "ML brief" 15-area program mentions conformal uncertainty and market-relative learning, but no paper on scoring-rule-induced inductive bias. What's new: (a) formal justification for training GSE's tabular models (XGBoost/LightGBM tabular features → probabilities) with the score that matches the downstream decision (CLV for line-beating, interval score for totals); (b) wCRPS with tail weighting as a principled way to penalise errors in specific outcome regions (e.g., tails of margin distributions); (c) the CRLS for tail-sensitive density estimation.

## 11. GSE implementation spec
- **Training losses**: For GSE's tabular win-probability models, keep binary log loss (proper, matches probability calibration), but for margin/total models switch MSE → CRPS-family (β-energy with β≈1.8 for mean-focused, β≈1 for median-robust) or wCRPS with right-tail weight when the downstream use is over-props (errors in the high tail cost more). Implement wCRPS weight w(u)=u² on discretized margin distributions as in (24)–(26).
- **Evaluation protocol**: add CRPS, CRLS, IS95 to the model scoreboard alongside log loss/ECE for all distribution-output models (margin models, season-total projections). Rank models per metric; require the selected model to dominate on the metric matching its use case (interval quality for totals).
- **Fine-tuning analogue**: GSE's existing XGBoost tabular learners get custom objectives aligned to evaluation: for CLV-style objectives, asymmetric Bregman/quantile losses rather than symmetric MSE on the spread.
- Effort: ~1–2 days to add CRPS/CRLS/IS95 metrics to the evaluation harness; ~2 days to prototype a wCRPS-XGBoost objective for margin models.

## 12. Reproducible test
Dataset: GSE margin models on 2022–2024 NFL regular-season games (nflverse), target = actual margin, features = existing tabular set. Baselines: current MSE-trained LightGBM vs CRPS-fine-tuned distributional variant (same features/folds). Metrics: CRPS, IS95, and downstream MAE of the implied cover probability. Window: train 2022–2023, test 2024.

## 13. Acceptance / rejection gate
ADOPT scoring-rule-aligned training if the CRPS-trained margin model beats the MSE baseline on held-out 2024 NFL by ≥5% relative CRPS improvement AND ≥3% IS95 improvement, with no more than a 2% MAE degradation on the implied point prediction. Otherwise REJECT — the MSE default stays.

## 14. Improvement experiment
Tail-weighted CRPS for prop-tail pricing: train the margin distribution model with left/right asymmetric wCRPS weights and test whether the resulting tail probabilities price player-prop and alternate-line markets better than the symmetric-CRPS model, measured by CLV on 2024 alternate spreads/totals. The paper shows the weights change the forecast; the open question is whether tail-calibrated distributions convert to money at the edges of the market.
