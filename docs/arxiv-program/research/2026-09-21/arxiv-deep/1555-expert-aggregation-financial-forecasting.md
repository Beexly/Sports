# [1555] Expert Aggregation for Financial Forecasting (arXiv:2111.15365)

**Citation:** Remlinger, C., Alasseur, C., Brière, M. and Mikael, J. (2023). *Expert Aggregation for Financial Forecasting*. arXiv:2111.15365v4 [q-fin.ST]. URL: https://arxiv.org/abs/2111.15365
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 15 main pages + appendices, all sections incl. Tables 1–5, Figures 1–5, Algorithm 1, refs).
**Verdict:** ADAPT — Bernstein Online Aggregation (BOA) is the online, regret-bounded combiner GSE needs for a non-stationary ensemble: weights update monthly (weekly for us) from realized expert losses with a fast log(K)/T rate, no distributional assumptions, and the paper proves the concept on 30 years of adversarial data with the key empirical finding that the mixture halves tail risk vs. the best expert.

## 1. Research question
Choosing among forecasting algorithms is fragile because their accuracy is unstable over time (non-stationarity). Can *online* expert aggregation — combining a finite set of models' forecasts each period with weights updated from realized performance, under theoretical regret guarantees — produce a single robust strategy that is almost as good as the best expert in hindsight, without any assumption on the data-generating process or the models? Applied to long-short equity portfolios built from 13 ML stock-return forecasters over 1957–2016.

## 2. Dataset / schema
- **WRDS (CRSP + Compustat), proprietary**: >30,000 US stocks, 1957–2017. 94 firm characteristics per stock-month (size, momentum, etc.; 20 monthly / 13 quarterly / 61 annual), cross-section rank-transformed to [−1,1] each month; missing → cross-sectional median; publication lags respected (monthly +1, quarterly +4, annual +6 months) to avoid forward-looking bias.
- **Protocol (Gu et al. 2020):** models re-fit yearly; expanding training (starts 1957–1974, +1yr each refit), rolling 12-yr validation, 1-yr out-of-sample test within 1987–2016 (30 test years).
- **Portfolio construction:** per model, sort stocks by predicted next-month return; long top decile / short bottom decile; equally weighted (main) and value-weighted (appendix). Two separate aggregations: one for long legs, one for short legs.

## 3. Method / model
- **BOA (Bernstein Online Aggregation, Wintenberger 2017):** online convex combination w_{k,t} over K experts. Update: w_{k,t} ∝ w_{k,t−1} · exp(−ηℓ_{k,t}(1+ηℓ_{k,t})) / exp(−ηℓ_{w,t}(1+ηℓ_{w,t})), where ℓ_{k,t} = ℓ(y_{t+1}, f^k_t) − ℓ(y_{t+1}, f^{w}_t) is the *excess* loss of expert k over the current mixture, and ℓ_{w,t} = Σₖ w_{k,t−1}ℓ_{k,t}. The second-order term ηℓ² penalizes large errors and stabilizes weights; η tuned online; regret converges at fast rate log(K)/T. Target y is the *best possible* long (top-decile) / short (bottom-decile) portfolio return each month — the aggregation is applied to **portfolio weights**, not return forecasts (deliberate: works with black-box strategies, optimizes the decision objective directly).
- **13 experts (Table 1):** OLS+H, OLS3+H, GLM+H (group lasso), ENet+H, PLS, PCR, RF, GBRT+H, NN1–NN5 (+H = Huber loss). All but PLS/PCR are themselves static ensembles (re-trained averages).
- **Comparators:** uniform mixture PtfUNI (1/K); best fixed convex combo on validation; best 1-yr rolling convex combo; oracle (best fixed combo on test, unachievable).
- **Extensions:** (a) **pre-trained BOA** — initialize weights from 1986 validation year instead of uniform; (b) **expert specialization** — if an expert beats the mixture, split it into 2K′ bagged variants (K′=10 each for NN2 and OLS+H, trained on 80% subsamples) and re-aggregate over K+2K′ = 33 experts; (c) expert importance via leave-one-expert-out.

## 4. Equations & assumptions
- Regret: R_T = Σ_{t=0}^{T} ℓ(y_{t+1}, f_{w,t}) − inf_{u∈S} Σ_t ℓ(y_{t+1}, f_{u,t}); BOA guarantees R_T → 0 at rate log(K)/T (in deviation), faster than EWA.
- BOA weight update (Algorithm 1) as above; weights on simplex S = {w ≥ 0: Σw = 1}.
- **Assumptions:** bounded targets/losses; all expert forecasts available each period (no sleeping experts — though the paper cites Devaine et al. 2013 / Gaillard et al. 2014 for the missing-expert extension); convex combination (no shorting experts); η > 0; the "target" portfolio is defined ex-post per month. No assumption on data distribution or expert internals.

## 5. Features / target
- **Features:** the 13 experts' monthly long/short portfolio returns (the aggregation sees only realized strategy returns, not the 94 characteristics).
- **Target:** monthly return of the infeasible best-decile long (resp. worst-decile short) portfolio — the aggregation minimizes squared loss vs. this target.
- **Horizon:** 1 month ahead, rebalanced monthly; test 1987–2016.

## 6. Validation design
- Strictly out-of-sample: experts trained on expanding windows, tested on 30 one-year windows 1987–2016; aggregation weights are causal (updated only on realized past returns).
- Metrics (Appendix B): annualized return, volatility, Sharpe ratio, skewness, kurtosis, max drawdown, max 1-month loss, turnover.
- Baselines: each of 13 experts, PtfUNI, fixed/rolling best-convex mixtures, oracle.
- Sub-sample robustness: top-1000 and bottom-1000 stocks by market cap.

## 7. Numerical results / baselines
- **Best expert NN2:** ann. return 0.50, vol 0.18, **SR 2.74**, max DD 0.17, max monthly loss 0.16, turnover 1.23.
- **PtfBOA:** ann. return 0.49, vol 0.18, **SR 2.77** (best), skew 3.11 (best), **max DD 0.08**, **max loss 0.08** — tail risk roughly *halved* vs. NN2 (0.17/0.16), turnover 1.23 (same).
- **PtfUNI:** SR 2.56, return 0.36. Fixed best-convex on validation: SR 2.28. 1-yr rolling: SR 2.60. Oracle: SR 2.92 (little headroom).
- **Pre-trained BOA:** SR 2.78, vol 0.17, skew 3.15 — small gain from validation prior.
- **Extended (33 experts, specialization):** SR **2.82**, max monthly loss 0.07 — best overall; extended PtfUNI 2.79.
- **Weight dynamics:** NN2 + OLS+H take ~67% of average weight; mixture "follows the leader" within regimes (1992–2000, 2001–2016) but adapted quickly at the 2001 dot-com regime break (OLS+H ~40% pre-2001 on short side → NNs after). 2008 crisis barely moved weights (NNs retained dominance).
- **Sub-samples:** top-1000 caps — PtfBOA SR 0.95 beats all experts (best OLS+H 0.94); bottom-1000 — PtfBOA 2.59, PtfUNI 3.07 (uniform wins on small caps).
- **Expert importance:** dropping OLS+H raises volatility / cuts SR (stability anchor); dropping NN2 cuts return (return engine) — losses not compensable by other experts.
- Value-weighted portfolios: same qualitative conclusions (appendix Table C.12).

## 8. Code / data availability
None stated — no code repository link; data is proprietary WRDS (CRSP/Compustat). Methods reference public R package OPERA (Gaillard et al. 2016) for online aggregation rules.

## 9. Leakage & limitations
- **Adversarial scrutiny:** the "target" (best-decile portfolio) is unknowable ex-ante — fine for training weights, but the reported SRs describe a long-short strategy with 120% monthly turnover on data including micro-caps; transaction costs are *not* modeled, and the bottom-1000 results (where PtfUNI hits 3.07) are the least tradable. Real-world SRs would be lower.
- **Follow-the-leader behavior:** within regimes the mixture concentrates on 1–2 experts (~67% on NN2+OLS+H), so the "diversity benefit" is mostly regime-switching, not true averaging — in a long stable regime BOA ≈ best expert plus drag.
- **2008:** aggregation did not de-risk through the crisis (weights barely moved); the low max DD (0.08) is relative to experts, not absolute protection.
- **Expert models are not online** (re-fit yearly) — only the *mixture* is online; a true online GSE would need the experts themselves to adapt or the pool refreshed.
- No missing-expert handling used (all 13 always available) — the sleeping-experts extension is cited but not tested.
- External validity to sports: monthly stock panels ≠ weekly NFL slates; the 30-year test is a strength for non-stationarity but the feature space and loss (portfolio return) differ from probabilistic sports forecasting. Turnover/cost analogue in betting is vig and stake sizing, not modeled here.

## 10. GSE overlap
Existing-research map: no GSE work uses online regret-bounded expert aggregation — the engine's ensemble weighting is static or heuristically updated (not documented as online). This is a **new capability** and the natural online counterpart to ledgers [1552] (diversity meta-learner, batch) and [1548] (CRPS-weighted mixture, batch): BOA gives GSE a *weekly-updating* combiner with theoretical guarantees. It also answers the "model selection is unstable" problem the map flags for GSE's multi-model engine. Unlike [1549] (pure theory, no application), this is BOA *applied* with 30 years of out-of-sample evidence.

## 11. GSE implementation spec
- **Data sources:** GSE engine sub-model game-level outputs (probabilities/scores) 2020–2025, actuals from nflverse, closing lines from The Odds API.
- **Build:** weekly BOA layer over the K engine sub-models: each Tuesday, compute each expert's realized loss for the past week (squared error on predicted cover probability, or log-loss), update simplex weights via the BOA rule with the second-order correction; publish the weighted consensus as the week's official engine forecast. Keep separate long/short analogues: e.g., separate aggregations for favorites vs. underdogs (mirroring the paper's long/short split), since different models may dominate each side.
- **Cold start:** pre-train weights on the prior season (the paper's §4.4.1 trick) instead of uniform init.
- **Expert specialization:** if one sub-model persistently beats the mixture, add bagged variants of it (re-fit on 80% bootstrap seasons) to the pool — the paper's §4.4.2, cheap diversity.
- **Effort:** ~1 engineer-week (pure Python/numpy; no new data needed beyond engine logs). R OPERA package exists as a reference implementation.

## 12. Reproducible test
2021–2023 NFL as burn-in (weight dynamics), 2024–2025 as test: baseline = static equal-weight consensus and static best-single-model; challenger = weekly BOA consensus. Metrics: Brier score and log-loss on ATS outcomes vs. closing lines, plus max weekly drawdown of a Kelly-staked strategy — the paper's risk result (halved max loss) must be checked in betting terms. Weights must be causal (updated only on settled games).

## 13. Acceptance / rejection gate
ADOPT if on 2024–2025 the BOA consensus beats the static equal-weight baseline by ≥1.5% relative Brier **and** the Kelly-staked max drawdown is ≤ 70% of the best single expert's (the paper's tail-risk signature), with turnover-analogue (week-to-week weight churn) not exceeding 2× the uniform baseline's. REJECT if BOA collapses to follow-the-leader with no risk reduction (weight entropy < 0.5 bits for >80% of weeks and max DD ≥ best expert's) — then the complexity buys nothing over picking NN2's analogue.

## 14. Improvement experiment
**Regime-conditional BOA (aggregation specialization).** The paper shows weights are regime-stable but slow to adapt except at breaks. Run parallel BOA instances conditioned on observable regimes (e.g., weeks 1–4 vs. midseason vs. playoff push; high vs. low total environments), each with its own η, plus a meta-BOA over the regime instances — the "aggregation specialization" the paper proposes but doesn't test. Hypothesis: faster adaptation at regime boundaries (early season when priors are weak, late season when motivation/rest dynamics shift) captures the paper's 2001-break adaptation gain systematically instead of accidentally.
