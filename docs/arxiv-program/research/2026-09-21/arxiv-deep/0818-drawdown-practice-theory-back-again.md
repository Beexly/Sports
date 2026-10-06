# [0818] Drawdown: From Practice to Theory and Back Again (arXiv:1404.7493)

**Citation:** Lisa R. Goldberg, Ola Mahmoud (2015, v5; forthcoming in *Mathematics and Financial Economics*). *Drawdown: From Practice to Theory and Back Again*. arXiv:1404.7493. URL: https://arxiv.org/abs/1404.7493
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; 70KB; read §§1–6, appendices skimmed).
**Verdict:** ADAPT — Conditional Expected Drawdown (CED) is a coherent, convex, positive-homogeneous tail risk measure with an Euler attribution formula; it adapts directly to GSE bankroll risk management (measure and attribute the engine's own drawdown risk across bet types/leagues), though the paper's numbers are equity illustrations and there is no predictive content.

## 1. Research question
Can drawdown risk be formalized into a mathematically sound (coherent/convex) and practically useful risk measure? The authors define Conditional Expected Drawdown (CED) — the tail mean of the maximum-drawdown distribution, analogous to Expected Shortfall for returns — prove its key properties (convexity, positive homogeneity, Euler attribution), and demonstrate it empirically on US equity/bond portfolios.

## 2. Dataset / schema
Daily data, 1 Jan 1982–31 Dec 2013: US Equity index and US Government Bond index (details in Appendix A); S&P 500 daily 1950–2013 for the max-drawdown distribution illustration (Figure 2.1). Fixed-mix portfolios 50/50, 60/40, 70/30. Empirical CED estimated from overlapping return paths of length n (6 months, 1 year, 5 years): for a T-length series, T−n overlapping paths → max drawdown per path → CED_α = average of the largest (1−α)% drawdowns.

## 3. Method / model
Model cumulative returns over horizon T as stochastic process X; drawdown process D_t = M_t − X_t with M_t = sup_{u≤t} X_u; maximum drawdown random variable μ(X) = sup path drawdown. Definitions: drawdown threshold DT_α(μ(X)) = inf{m : P(μ(X) > m) ≤ 1−α} (the VaR analog); CED_α(X) = TM_α(μ(X)), the tail mean of the max-drawdown distribution (the ES analog). Attribution: portfolio P = Σw_i F_i; marginal contribution MRC_i^{CED_α}(P) = E[(F_{i,t*} − F_{i,s*}) | μ(P) > DT_α(P)] where (s*,t*) locate the portfolio's max drawdown; risk contribution RC_i = w_i · MRC_i; fractional risk contribution FRC_i = RC_i / CED. Empirical: 6-month rolling 90% CED and FRC decomposition of a 60/40 equity/bond portfolio, 1982–2013, compared against VIX.

## 4. Equations & assumptions
D_t^{(X)} = M_t^{(X)} − X_t; μ(X) = sup D^{(X)}. DT_α(μ(X)) = inf{m : P(μ(X) > m) ≤ 1−α}. CED_α(X) = TM_α(μ(X)).
Prop 3.3 (convexity): CED_α(λX + (1−λ)Y) ≤ λCED_α(X) + (1−λ)CED_α(Y). Prop 3.5 (positive homogeneity): CED_α(λX) = λCED_α(X), λ > 0. Prop 4.2 (Euler/MRC): MRC_i^{CED_α}(P) = E[(F_{i,t*} − F_{i,s*}) | μ(P) > DT_α(P)]. RC_i^{CED}(P) = w_i CED(X_i) Corr_i^{CED}.
Assumptions (stated): continuous distributions of μ(X), μ(Y) (for convexity proof); strictly positive portfolio max drawdown (for attribution); return paths modeled as a stochastic process in R^∞. Empirical assumes overlapping-path drawdowns approximate the true max-drawdown distribution.

## 5. Features / target
Risk-factor returns F_i (asset classes/sectors/factors). Target: portfolio-level drawdown risk CED_α and per-factor contributions. Horizon: 6-month / 1-year / 5-year paths; 1982–2013.

## 6. Validation design
Theoretical proofs (§§3–4) + empirical illustration (§5, appendices). No predictive validation, no backtest of a strategy, no train/test split — this is a risk-measurement paper, not a forecasting paper. Sensitivity of max-drawdown distributions to track-record length, mean, volatility, and data frequency shown via Monte Carlo (Burghardt et al. 2003, cited).

## 7. Numerical results / baselines
Table 5.1 (1982–2013, daily): vol — US Equity 18.35%, US Bonds 5.43%, 60/40 11.12%; ES_0.9 — 2.19% / 0.49% / 1.35%; CED_0.9 (6M paths) — 47% / 29% / 33% (50/50: 31%, 70/30: 36%); CED rises with path length (5Y: 57%/35%/38%). Empirical max-drawdown distribution of S&P 500 6-month paths (1950–2013) is asymmetric vs Gaussian simulation (Figure 2.1). Time-varying result: 6-month rolling FRC shows equity's drawdown-risk contribution spiking in crises (2008), co-moving with VIX (Appendix B, Figure B.1/B.2). These are descriptive risk statistics, not performance claims — no baselines, no alphas.

## 8. Code / data availability
No code. Data: commercial index data (Appendix A), S&P 500 (public-ish). Method is fully implementable from the formulas.

## 9. Leakage & limitations
- Not a predictive paper: CED measures risk of a return process; it says nothing about future returns. Any GSE use is risk management, not edge.
- Overlapping paths induce dependence in the empirical drawdown distribution (acknowledged implicitly by the T−n construction); no correction.
- Convexity/attribution proofs need continuity and strictly positive drawdown — degenerate in flat/pure-profit paths.
- Max drawdown is path-length sensitive (their own Monte Carlo citation) — CED numbers are horizon-relative, not absolute.
- 60/40 illustration is buy-and-hold index data; nothing about active strategies or betting bankrolls.

## 10. GSE overlap
Existing-research map: drawdown appears via WP 0807.1667 (Kelly drawdown) and ledger 0817 (MDD as feature). This paper's distinct contribution vs the map: CED as a *coherent risk measure* + Euler attribution of drawdown risk to components. No duplication. Connects to sizing lane (bankroll risk) and the abstention lane (drawdown-triggered stake reduction).

## 11. GSE implementation spec
Adaptation: bankroll drawdown-risk attribution. Treat the engine's cumulative pick P&L (per-unit stakes) as the return process X; compute CED_0.9 over rolling 6-month paths of daily settled P&L; attribute via Prop 4.2 to bet categories (spread / moneyline / total; NFL / NCAAF; model version) — MRC_i tells which category drives worst-case bankroll drawdowns. Use: (a) risk budgeting — cap exposure to the highest drawdown-contributing category; (b) drawdown trigger — when realized drawdown exceeds DT_0.9, cut stakes to a fraction until recovery (formalizes the "rainy season" intuition from ledger 0816). Effort: ~2 days (P&L path construction + CED/MRC computation + dashboard).

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks) settled P&L time series. Protocol: compute 90% CED on 6-month rolling P&L paths; attribute MRC by bet type and league; backtest a drawdown rule (stakes × 0.5 when drawdown > DT_0.9, restore on new equity high) vs flat stakes on 2024→2025 walk-forward. Metric: max drawdown, Calmar ratio, total ROI. Baseline: flat-stakes engine.

## 13. Acceptance / rejection gate
ADAPT if the CED attribution identifies a concentrated drawdown source (e.g., one bet type contributing >50% of CED) that survives a category-ablation check, OR the drawdown-trigger rule improves Calmar ratio on the holdout without sacrificing >10% of ROI — else bankroll risk stays with simple Kelly caps and this remains reference material.

## 14. Improvement experiment
Two extensions: (1) Conditional CED: condition the drawdown distribution on market regime (high vs low VIX-like sports volatility proxy, e.g., average closing-line movement) — the paper's own finding that bond/equity correlation breaks in 2008 suggests drawdown risk is regime-dependent; test whether regime-conditioned DT_α gives earlier drawdown warnings. (2) Apply CED not to P&L but to the engine's *calibration error* process — measure the tail risk of the model's probability estimates themselves, attributing miscalibration-drawdowns to features; this turns a risk measure into a model-diagnostic tool.
