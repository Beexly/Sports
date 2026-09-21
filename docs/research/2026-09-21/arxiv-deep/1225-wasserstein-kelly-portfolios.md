# Deep-Research Ledger 1225 — arXiv:2302.13979v1 (q-fin.PM, 27 Feb 2023)

**Title:** Wasserstein-Kelly Portfolios
**Author:** Jonathan Yu-Meng Li
**Version read:** v1 (27 Feb 2023). Full read verified on 2026-09-21: all sections (Wasserstein distributionally-robust Kelly formulation, finite-dimensional convex reformulation, S&P 500 experiments with Figures, conclusion). Text source: `2302.13979.pdf` → `pdftotext -layout` (4,764 words).

## 1. Question asked

Can Kelly portfolio choice be made robust to distributional uncertainty by optimizing expected log-growth against the worst case in a Wasserstein ball around the empirical **log-return** distribution — and does the robust version beat standard Kelly out-of-sample?

## 2. Dataset / schema

Real market data: S&P 500 stocks. **Training: 2019** daily log-returns; **out-of-sample: 2020-01-01 through 2023-02-20** (includes the COVID crash and 2022 bear market). Protocol: **10 randomly selected S&P 500 stocks**, **1,000 repetitions**; robustness radii **δ ∈ {0.1, 0.2, 0.3, 0.4}**.

## 3. Method

1. **Robust Kelly:** max_w min_{P ∈ B_δ(P̂_n)} E_P[log(1 + wᵀR)] where B_δ(P̂_n) is a Wasserstein ball of radius δ around the empirical log-return distribution P̂_n.
2. **Tractability:** the infinite-dimensional DRO problem admits an exact finite-dimensional convex reformulation (dual), so it solves as a convex program — no sampling of the adversary needed.
3. **Why log-returns:** the Wasserstein ball is placed on log-return distributions, matching Kelly's log-utility natively (contrast with return-space robustness, which distorts the Kelly objective).
4. **Evaluation:** train on 2019, roll forward OOS 2020–2023; compare robust Kelly (each δ) vs standard Kelly on annualized return, volatility, Sharpe, max drawdown, log final wealth.

## 4. Equations / assumptions

- Objective: max_w min_{P: W(P,P̂_n) ≤ δ} E_P[log(1 + wᵀR)].
- Convex dual reformulation (exact; equations in §3 of the paper).
- **Assumptions:** log-returns are the sufficient statistic for Kelly growth; Wasserstein geometry captures the relevant distributional shifts; δ chosen exogenously (0.1–0.4 grid, no data-driven selection rule).

## 5. Features / target

Features = empirical log-return distribution (2019 window). Target = the portfolio weight vector maximizing worst-case expected log-growth over the Wasserstein ball.

## 6. Validation

1,000 random 10-stock universes; OOS 2020-01-01–2023-02-20. Claims (graphical — see §9): robust Kelly improves over standard Kelly in annualized return, volatility, Sharpe ratio, max drawdown, and log final value, with larger δ generally more conservative/better-protected in the COVID-crash segment.

## 7. Exact results

**No exact numeric table is given** — all performance claims are presented graphically (figures of OOS paths and metric bars). The paper states directional improvements across all five metrics (return, vol, Sharpe, drawdown, log final value) for the robust portfolios vs standard Kelly. δ values tested: 0.1, 0.2, 0.3, 0.4. This absence of tabulated numbers is a reporting weakness (see §9).

## 8. Code / data availability

None stated. S&P 500 data is public; the convex reformulation is specified in the paper and re-implementable in any convex solver.

## 9. Leakage / limitations

- **Results are primarily graphical with no exact table values** — the "improvements" cannot be independently checked or sized from the paper alone; must be re-run.
- No data-driven δ selection: the 0.1–0.4 grid is ad hoc; no validation procedure for choosing δ in practice (risk of δ-hacking across the 1,000 repetitions).
- 10-stock random universes are small; no test on larger or concentrated portfolios.
- Training window is a single calm year (2019); OOS includes two crises — the setup flatters robustness by construction.
- Log-return Wasserstein ball penalizes all distributional shifts equally, including upside ones Kelly would welcome.
- No transaction costs, no short-sale or leverage constraints discussed.

## 10. GSE overlap

Directly relevant to robust sizing under model uncertainty:

- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — robust/drawdown-constrained Kelly variants; Wasserstein-Kelly is the DRO formalization of that family.
- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — Kelly failure taxonomy; distributional shift (model trained on last season, deployed this season) is a first-class failure mode the Wasserstein ball directly addresses.
- Wave-3: 1228/2508.18868 (estimation risk via options/mixtures), 1226/2504.20877 (risk-sensitive PMs), 1224/2201.03387v2 (learning penalty).

## 11. Implementation spec (GSE)

**Wasserstein-robust Kelly for pick slates.** For each slate:
1. Build the empirical distribution of per-pick log-returns from walk-forward backtests (per-unit PnL → log(1 + f·r)).
2. Solve the robust Kelly convex program with δ calibrated on a validation fold (choose the δ maximizing OOS log-wealth, not in-sample).
3. Use the robust weights as the stake vector, scaled by the existing fractional-Kelly rule.
4. Re-calibrate δ quarterly; monitor whether larger δ is selected in high-regime-change periods (new season, model version change) — the paper predicts it should be.

## 12. Reproducible test

Rebuild the paper's experiment: 10 random S&P 500 stocks, train 2019, OOS 2020-01-01–2023-02-20, δ ∈ {0.1,0.2,0.3,0.4}, 1,000 repetitions; verify the robust portfolios' OOS Sharpe and max drawdown dominate standard Kelly's on average (the paper's graphical claim).

## 13. Numeric gate

Since the paper gives no tables, the gate is self-imposed from the replication: mean OOS Sharpe improvement ≥ +0.1 and mean max-drawdown reduction ≥ 2 percentage points for at least one δ ∈ {0.1,…,0.4} vs standard Kelly, else the "improvement" is treated as unconfirmed.

## 14. Improvement experiment

Run §11 on GSE's pick history (Neon `picks`, v5.2.7): walk-forward robust-Kelly vs standard fractional-Kelly staking; score log-wealth and max drawdown per season, with δ chosen on a rolling validation window. Expectation from the paper: robust Kelly sacrifices a little growth in stable regimes for materially smaller drawdowns across regime changes (season boundaries, model updates) — quantify the exchange rate.

**Verdict:** ADAPT
