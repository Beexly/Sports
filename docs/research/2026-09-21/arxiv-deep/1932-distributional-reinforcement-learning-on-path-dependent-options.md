# [1932] Distributional Reinforcement Learning on Path-dependent Options (arXiv:2507.12657)

**Citation:** Ahmet Umur Özsoy (2025). *Distributional Reinforcement Learning on Path-dependent Options*. arXiv:2507.12657. URL: https://arxiv.org/abs/2507.12657
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Can path-dependent derivative pricing (e.g., Asian options, payoff = function of the running average) be reframed as distributional RL — learning the full conditional payoff distribution via recursive quantile updates instead of just the expected value via Monte Carlo/PDE? The paper develops the framework, proves contraction/stability, and proposes RBF-based quantile function approximation (claimed first use in DistRL option pricing).

## 2. Dataset / schema
No empirical dataset: the paper is theoretical/methodological. The running example is arithmetic Asian call options (state = spot price + running average; payoff = max(average − strike, 0)). Initialization references a Monte Carlo mean-payoff estimate. No quoted numerical experiments, tables, or benchmarks — the "experiments" are propositions and convergence arguments.

## 3. Method / model
**DistRL for path-dependent payoffs.** Reframe recursive pricing as a distributional fixed-point problem on probability measures: the option price process is an evolving law of a random variable (Fokker-Planck view in continuous time). Approximate conditional quantile functions with Radial Basis Function (RBF) feature expansions over the state space; update quantile parameters by stochastic gradients of the quantile (pinball) loss, which "admits an unbiased stochastic gradient estimator." RBF smoothness enables gradient-based calibration of model parameters (implied vol surface, jump parameters) by matching market-implied quantiles or distributional moments — "without relying on expectation-based loss." Fat-tailed jumps "shift the learned quantile estimates without requiring a re-specification of the parametric state transition."

## 4. Equations & assumptions
- Distributional Bellman recursion for path-dependent payoffs; Asian payoff with running average as augmented Markovian state.
- Contraction: distributional Bellman operator is a γ-contraction in Wasserstein metric — "errors in the learned distribution at one time step do not amplify through recursion," giving robustness to estimation noise/discretization/misspecification.
- Quantile SGD: unbiased stochastic gradients of the pinball loss; quantile parameters converge to fixed points of the Bellman operator on the cumulative average under "standard regularity assumptions on the state space, function class, and sampling procedure."
- Caveat (authors): "minimizing the Wasserstein distance alone may not suffice to evaluate the practical adequacy of the learned value distributions for option pricing, as it does not directly reflect financially critical aspects such as tail behavior or extreme quantile accuracy."
- Assumptions: Markovian augmented state (spot + running average); regularity of state space/function class/sampling; valid RBF coverage of the state space.

## 5. Features / target
Input: (spot price, running average) state. Target: conditional quantile functions of terminal payoff. Horizon: option maturity (finite-horizon, path-dependent).

## 6. Validation design
Theory only: contraction proofs, unbiased-gradient propositions, convergence of quantile parameters. No train/test splits, no baselines, no reported metrics. (Weakest empirical section in this lane — stated plainly.)

## 7. Numerical results / baselines
None quoted — no numerical experiments, tables, or benchmark comparisons in the paper. All claims are theoretical (contraction, convergence, unbiasedness). This limits the paper's standalone weight; its value is the framework + two transferable tricks (below).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- No empirical validation at all — the convergence and robustness claims are untested on real data.
- RBF approximators scale poorly to high-dimensional state spaces (curse of dimensionality in basis placement); the paper's state is 2-D.
- The Wasserstein-adequacy caveat (tail behavior not captured by the metric) applies directly to GSE's drawdown use case.
- Single-author 2025 paper; not peer-reviewed as far as stated.

## 10. GSE overlap
The path-dependence analogy is real: season P&L is a running sum (like the Asian average), and weekly stakes are the control. No repo work frames the season as a path-dependent payoff or learns its full distribution (calibration lane is per-event, not path-level). The RBF-quantile idea is a lightweight alternative to the deep quantile heads in ledgers 1925/1926 for low-dimensional state summaries. New capability; thin overlap.

## 11. GSE implementation spec
1. Define season episode: state = (current bankroll, running season profit, weeks remaining); terminal "payoff" = season profit.
2. Learn conditional quantile functions of season profit with RBF features over the 3-D state (place ~200 RBF centers by k-means over 2015–2024 historical trajectories); quantile SGD updates from logged seasons.
3. Use the learned distribution each week for risk reporting: P(season profit < 0 | current state), CVaR of season profit — the season-level analog of the weekly critic.
4. Steal the calibration trick: calibrate the RBF quantile functions by matching market-implied quantiles — e.g., fit so the model's implied season-profit quantiles are consistent with the efficient-market prior (de-vigged season win-total markets) — gradient-based, no expectation loss.
5. Effort: ~1.5 weeks (small model; the work is the RBF plumbing + calibration objective).

## 12. Reproducible test
Dataset: GSE logged picks + odds 2015–2024 formed into season trajectories (train 2015–2022, test 2023–2024). Baselines: (a) Monte Carlo season simulation from the weekly quantile critic (1926), (b) empirical historical season distribution. Metrics: quantile calibration (ECE) of predicted season-profit quantiles on 2023–2024; CVaR_0.1 accuracy (predicted vs realized tail mean).

## 13. Acceptance / rejection gate
ADOPT iff on 2023–2024 the RBF-quantile model's season-profit quantile ECE ≤ 0.05 AND it beats the Monte Carlo baseline on CVaR_0.1 absolute error by ≥10% relative; otherwise REJECT (theory without empirical edge doesn't ship).

## 14. Improvement experiment
Replace fixed RBF centers with adaptive centers learned by gradient descent on the quantile loss (differentiable basis placement), and compare against the deep IQN head (1925) on the same season-distribution task. Tests whether the paper's "first RBF application" claim has practical merit or whether deep quantile functions dominate even in low dimensions.
