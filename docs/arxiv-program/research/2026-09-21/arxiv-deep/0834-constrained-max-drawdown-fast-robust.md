# 0834 Constrained Max Drawdown: a Fast and Robust Portfolio Optimization Approach (arXiv:2401.02601v1)

**Citation:** Albert Dorador (2024). *Constrained Max Drawdown: a Fast and Robust Portfolio Optimization Approach*. arXiv:2401.02601v1. URL: https://arxiv.org/abs/2401.02601v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — a maximin daily-return LP/MILP portfolio formulation that beat Markowitz-family models on 3-month OOS return AND drawdown (9.4% vs 5.7%, −3.3% vs −6.1% max DD) while solving 200× faster; GSE's first fully-read Kelly-adjacent sizing paper and the natural objective for the bet-sizing layer of the engine.

## 1. Research question

Can portfolio allocation be framed to maximize the worst-case daily return (maximin) instead of the mean-variance trade-off, and does adding cardinality/weight constraints via a mixed-integer LP preserve out-of-sample performance while keeping solve times trivial? The paper pits the unconstrained "Max Drawdown" (MD) LP against Markowitz variants and a constrained MD MILP on S&P 500 stocks.

## 2. Dataset / schema

- **Universe:** ~400 S&P 500 stocks from Yahoo Finance (tickers not enumerated in the paper).
- **Features:** daily returns per stock.
- **Train:** 2020-02-01 to 2020-05-01 (COVID crash window). **Test:** 2020-05-02 to 2020-08-01 (three months OOS).
- **Schema:** per-asset daily return series; portfolio weight vector with weight bounds.
- **Access:** Yahoo Finance is public and replicable; exact ticker list not stated.

## 3. Method / model

- **Max Drawdown (MD) LP:** maximize the minimum daily portfolio return (maximin) subject to budget constraint, implemented as a linear program.
- **Constrained MD MILP:** adds binary selection variables — a selected asset must receive at least 5% allocation, and any individual asset weight is capped at 50%. This is a mixed-integer linear program.
- **Baselines:** classic Markowitz (min variance for a return target), "reverse Markowitz" (max return for a variance budget), simultaneous mean/variance optimization.
- The maximin objective is non-smooth but LP-representable; no covariance matrix estimation is required at any point — this is the robustness claim.

## 4. Equations & assumptions

- Objective (stated conceptually, paraphrased here without inventing notation): maximize t subject to portfolio daily return ≥ t for each day in the training window, weights summing to 1; constrained version adds integer variables enforcing w_i ≥ 0.05·z_i and w_i ≤ 0.50·z_i with z_i binary.
- Assumptions: daily returns over a 3-month window are an adequate proxy for the risk profile; no transaction costs, no liquidity constraints, long-only positions; the worst historical day is the operative risk measure (no distributional assumption — this is a feature, not a gap).
- Note: the paper is light on formal notation; the above is the paper's described formulation, not a verbatim equation.

## 5. Features / target

- **Inputs:** historical daily return matrix (assets × days).
- **Target:** the portfolio weight vector; implicitly the OOS 3-month return with drawdown control. There is no separate labeled "target" — it is a pure optimization, not a supervised model.

## 6. Validation design

- Single train/test split (train 2020-02-01–2020-05-01, test 2020-05-02–2020-08-01); splits are time-ordered.
- Baselines: Markowitz, reverse Markowitz, simultaneous mean/variance.
- Metrics: 3-month portfolio return, daily return standard deviation, maximum drawdown, solve time.
- Robustness check: perturb the covariance matrix by 2.8% on average and measure how much allocations move across models.

## 7. Numerical results / baselines

3-month OOS results, quoted exactly:

| Model | 3-mo return | Daily SD | Max DD |
|---|---|---|---|
| Markowitz | 5.7% | 1.7% | −6.1% |
| Reverse Markowitz | 5.3% | 1.7% | −7.2% |
| Simultaneous mean/variance | 5.2% | 2.1% | −8.6% |
| MD (LP) | 9.4% | 2.3% | −3.3% |
| Constrained MD (MILP) | 8.5% | 2.0% | −3.3% |

- Solve time: constrained MILP 0.0001 s vs 0.02 s for the QPs — claimed 200× faster.
- Sensitivity: a 2.8% average covariance perturbation changed allocations 38.1%–47.1% in the other models vs only 3.7% in constrained MD.
- MD portfolios hold fewer, larger positions (maximin naturally concentrates).

## 8. Code / data availability

None stated.

## 9. Leakage & limitations

- Single train/test split over one specific COVID-era window — the paper itself calls results preliminary.
- No transaction costs, no turnover analysis; concentration from the maximin objective could be dangerous in illiquid or correlated bet portfolios.
- No covariance matrix means no diversification signal beyond the worst-day constraint — in regimes where the worst day is idiosyncratic, the allocation can chase noise.
- External validity to sports: daily stock returns are not bet returns; the mapping from "assets" to "bets" needs the covariance of bet outcomes, which is exactly the hard part.

## 10. GSE overlap

Per `~/workspace/arxiv-sweep/existing-research-map.md`: Kelly is mentioned 12 times in the repo (Wang Transform via oracle3, fourth-down WP literature) but had zero papers fully read before this assignment — this paper begins filling that gap. Existing sizing-adjacent work: prediction-market ecosystem triage (Polymarket/Kalshi tooling), profit-bias identity ledger 0001. No existing maximin-drawdown sizing work in the repo; this is a new capability, complementary to Kelly.

## 11. GSE implementation spec

- Build a GSE "bet portfolio" constructor: inputs are the engine's edge estimates and a covariance matrix of bet outcomes (bootstrap from historical pick residuals, or block-diagonal by game).
- Implement the constrained MD MILP (pulp or OR-Tools): maximize worst historical session/day return; constraints ≥5% per selected bet, ≤50% per bet, bankroll budget.
- Compare against fractional-Kelly and equal-weight baselines on 2024–2025 engine picks.
- Effort: 1–2 days for the optimizer + backtest harness.

## 12. Reproducible test

Dataset: GSE engine picks 2024 season, spread/moneyline/total only (the `picks` table in Garrett's Neon DB). Metric: OOS season ROI and max bankroll drawdown, walk-forward (retrain sizing monthly, size next month's picks). Baselines: flat stakes, fractional Kelly (0.25). Pass if constrained-MD sizing beats flat stakes on max drawdown with no ROI loss.

## 13. Acceptance / rejection gate

ADOPT into the sizing layer if, on the 2024 walk-forward, max bankroll drawdown is ≥20% lower than flat staking at equal or better ROI; REJECT if drawdown is not reduced or ROI drops >1 pp.

## 14. Improvement experiment

Replace the fixed 5%/50% bounds with drawdown-adaptive bounds: run the MILP on rolling 30-day windows and let the minimum-allocation bound tighten when recent realized drawdown is high. Hypothesis: adaptive bounds capture the robustness benefit without the single-window overfit.
