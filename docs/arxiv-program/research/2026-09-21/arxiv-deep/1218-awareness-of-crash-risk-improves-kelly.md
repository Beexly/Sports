# [1218] Awareness of crash risk improves Kelly strategies in simulated financial time series (arXiv:2004.09368)

**Citation:** Jan-Christian Gerlach, Jerome Kreuser, Didier Sornette (2020). *Awareness of crash risk improves Kelly strategies in simulated financial time series*. arXiv:2004.09368. URL: https://arxiv.org/abs/2004.09368
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — adapt the crash-aware (regime-aware) Kelly allocation as GSE's stake-sizing regime switch: estimate a "mispricing/bubble" state from market-vs-model disagreement and cut leverage when the market is most overextended, keeping the paper's constrained-leverage and estimation-error robustness findings as guardrails.

## 1. Research question
The paper asks whether a Kelly strategy that is aware of crash risk — modeled via the Efficient Crashes Model (ECM), where price mean-reverts toward a "normal price" with Poissonian corrective jumps proportional to mispricing — outperforms classical Kelly (which assumes pure geometric Brownian motion) on synthetic bubble-prone time series, and how robust the advantage is to parameter estimation error.

## 2. Dataset / schema
Synthetic only — deliberately, so that model error is zero and estimation error can be studied in isolation. Base parameters Φ: r_N = r_D = ln(1.07)/252, σ = 0.17/√252, ρ = 0.01, K̄ = 0.3, σ_κ = 0.2 (calibrated to be "of the order" of S&P 500 1971–2019: ~7% annual growth, 17% annual volatility; jump every ~100 trading days on average; jumps correct ~1/3 of mispricing). Series length T = 1250 (5 years daily); Monte Carlo with m = 10,000 paths per configuration; window sweeps T = 250..10,000. The authors note real-data success was shown in Kreuser & Sornette (2018) and refer readers there.

## 3. Method / model
Simulate price paths from the ECM: p_{t+1} = p_t·exp(a_t + σ·ε_t), with normal price N_t = p0·exp(r_N·t), inverted mispricing q_t = N_t/p_t, rational-expectations drift r̄_t = r_D − [ρ̄·K̄·ln q_t]/(1−ρ̄). The ECO Kelly strategy chooses the risky fraction λ_t each step maximizing conditional expected log wealth: W_{t+1} = (λ_t·e^{ā_t+σ·ε_t} + (1−λ_t)·e^{r_f})·W_t, with r_f = 0. Compare six strategies: ECO bounded (λ ∈ [−1,2]) and unbounded, classical Kelly bounded/unbounded, buy-and-hold, 60/40 fixed fraction. Then sensitivity analysis over each parameter and estimation-error analysis (multiplicative Gaussian error ϕ_e = (1+ε_i)·ϕ_true, σ_e swept 10⁻³..10²).

## 4. Equations & assumptions
- N_t = p0·exp(r_N·t); q_t = N_t/p_t
- p_{t+1} = p_t·exp(r_D − [ρ·K̄·ln(q_t)]/(1−ρ) + σ·ε_t) (no-jump branch); jump branch adds κ_t·ln(q_t), κ_t ~ N(K̄, σ_κ²)
- W_t = W_{t−1}·(λ_t·e^{r_t} + (1−λ_t)·e^{r_f})
- Log-outperformance O_i[T] = ln(W_T/P_T)_i
- Trading-cost bound C = CAGR·Δt_r/250
Assumptions: known/estimated ECM parameters, Poissonian (unpredictable) jump timing, symmetric bubbles/crashes (authors flag this as unrealistic — real data has far more positive bubbles), zero trading costs in the main comparison, daily rebalancing.

## 5. Features / target
Inputs: price history (to estimate mispricing q_t and ECM parameters). Target: risky-asset fraction λ_t each period.

## 6. Validation design
Monte Carlo on synthetic data with known truth — the cleanest possible design for isolating estimation error, but with zero real-data validation in this paper. Metrics: probability of outperformance, average odds, mean outperformance, probability of default (bankruptcy), fraction of uptime, Sharpe, CALMAR, downside-risk Sharpe, CAGR. Compared against B&H, 60/40, classical Kelly.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- ECO beats buy-and-hold ~62% of the time over 2 years and ~65% over 10 years (λ-constrained).
- Fraction of uptime ~70–80% for ECO portfolios.
- ECO beats all other methods on average CAGR (2-year and 10-year) and shows improved Sharpe over classical Kelly.
- Above ~4000-day windows, classical Kelly clearly underperforms the price series (leverage + jumps = failure).
- Estimation error: stable positive performance up to σ_e of order 10⁻¹..10⁰ (10%–100% error); most sensitive to r_D; correctly estimating the *sign* of the drift matters more than its magnitude (up to 100% magnitude error still fine if sign is right).
- Trading fees: daily rebalancing makes the fee bound per trade very low (~10bp typical fees would eat gains); rebalancing every 10 days gives ~40bp per period, workable.
- Sensitivity: default probability flattens ~20–25% at high σ; unconstrained leverage is the main bankruptcy driver.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No real data in this paper — all outperformance is vs. synthetic truth, so the "beats classical Kelly" claim has no market validity here (deferred to the 2018 paper). Symmetric crash/rally jumps are unrealistic. Jump timing is unpredictable by construction, so the strategy only sizes the *magnitude* risk, never times exits. Estimation on real data requires identifying the unobserved "normal price" — the hardest part, not solved here. Daily rebalancing cost analysis shows the strategy is fee-sensitive.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing had zero deep reads and "estimation error" is an identified gap. GSE's `apps/web/lib/staking/kelly-investigation.ts` sizes with no regime awareness and no estimation-error analysis. The sports analog of "crash risk" is regime risk: model mispricing that corrects violently (e.g., injury news, weather, sharp steam moves against GSE's position). This paper supplies the regime-aware sizing template and the estimation-error robustness methodology GSE lacks: a new capability.

## 11. GSE implementation spec
1. Define GSE's "mispricing" analog: disagreement between GSE's calibrated probability and the market-implied probability (edge), plus a steam/volatility flag. When |edge| is large *and* market volatility is elevated (bubble-like overextension), scale down the Kelly fraction — the ECO "decrease leverage during bubbles" rule. Effort: M.
2. Adopt the paper's robustness protocol: for every sizing parameter, run the multiplicative-error sweep (σ_e 10⁻³..10²) on backtest data and require stable positive performance up to 10–100% error before shipping a parameter. Effort: M.
3. Hard constraint λ ∈ [0,1] (no leverage/short) for all product sizing — the paper shows unconstrained leverage is the bankruptcy driver. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks with timestamped lines and market volatility proxies. Metric: realized log growth, max drawdown, and fraction-of-uptime of (a) current sizing vs. (b) regime-aware sizing that cuts stakes when edge-vs-market disagreement exceeds a threshold during high-volatility regimes. Baseline: (a). Window fixed in advance.

## 13. Acceptance / rejection gate
ADOPT regime-aware sizing if it reduces realized max drawdown by ≥ 15% vs. baseline with realized log growth ≥ 0.95× baseline on the held-out window. REJECT otherwise.

## 14. Improvement experiment
Beyond the paper: replace the paper's unpredictable-Poisson jumps with a *predictable* component — train a classifier on pre-game features (injury reports, weather, steam) to forecast "correction events" against GSE positions, and make λ_t a function of predicted correction probability, not just mispricing magnitude. Hypothesis: predictable regime timing beats magnitude-only sizing.
