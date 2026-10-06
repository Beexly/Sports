# Deep-Research Ledger 1222 — arXiv:2109.10814v1 (q-fin.PM, 7 Sep 2021)

**Title:** Fractional Growth Portfolio Investment
**Author:** A.E. Brockwell
**Version read:** v1 (7 Sep 2021). Full read verified on 2026-09-21: all sections (GBM model, univariate/multivariate Kelly, fractional Kelly, empirical study on VFIAX/VUSUX 2001–2021 with Tables 1–2, conclusion). Text source: `2109.10814.pdf` → `pdftotext -layout` (6,193 words).

## 1. Question asked

Under geometric Brownian motion, what are the growth-optimal (Kelly) and fractional-Kelly portfolio rules, and how do full vs fractional Kelly compare empirically on two decades of US equity/bond fund data?

## 2. Dataset / schema

Real market data: Vanguard funds **VFIAX** (S&P 500 index) and **VUSUX** (long-term Treasury), **2001–2021**. Daily/monthly returns used to estimate drift μ, volatility σ, correlation; portfolios rebalanced per the Kelly rules and tracked for growth, volatility, drawdown, and terminal wealth.

## 3. Method

1. **GBM setup:** dS/S = μdt + σdW; risk-free rate r.
2. **Kelly derivation:** maximize expected log-growth → optimal risky fraction k⋆ = (μ−r)/σ² (univariate); multivariate k⋆ = Σ⁻¹(μ−r).
3. **Fractional Kelly:** k_α = αΣ⁻¹(μ−r), α ∈ (0,1) — scales down the growth-optimal bet.
4. **Closed forms:** expected log-growth L(k_α) = r + (α − α²/2)S² where S² = (μ−r)ᵀΣ⁻¹(μ−r) (squared Sharpe); variance of log-growth V(k_α) = α²S².
5. **Empirical:** plug estimated (μ, Σ) into k⋆ and k_α; simulate buy-and-hold-rebalanced portfolios 2001–2021; report growth rate, annualized SD, max drawdown, final wealth (Table 2).

## 4. Equations / assumptions

- k⋆ = (μ−r)/σ²; multivariate k⋆ = Σ⁻¹(μ−r); fractional k_α = αΣ⁻¹(μ−r).
- L(k_α) = r + (α − α²/2)S²; V(k_α) = α²S².
- **Assumptions:** GBM with constant known μ, σ, r; continuous rebalancing; no transaction costs/taxes; unlimited leverage permitted mathematically (fractional rule is the practical guardrail).

## 5. Features / target

Features = estimated drift vector and covariance (μ, Σ). Target = the portfolio weight vector maximizing expected log-wealth growth (or its α-scaled version).

## 6. Validation

Table 2 (2001–2021, VFIAX/VUSUX):
- **Fractional Kelly:** growth 0.089, annualized SD 0.176, max drawdown 41.9%, final wealth $576,464.
- **Full Kelly:** growth 0.172, annualized SD 0.594, max drawdown 89.8%, final wealth $3,002,829.
The paper's point: full Kelly wins on terminal wealth in-sample but with ruin-adjacent drawdowns (89.8%); fractional Kelly trades roughly half the growth for ~1/3 the volatility and ~1/2 the drawdown — the classic growth-vs-security frontier in one table.

## 7. Exact results

- L(k_α) = r + (α−α²/2)S²: growth is quadratic-concave in α, maximized at α = 1; V(k_α) = α²S²: risk falls quadratically as α ↓.
- Table 2 numbers as above (growth 0.089 vs 0.172; SD 0.176 vs 0.594; drawdown 41.9% vs 89.8%; final $576,464 vs $3,002,829).
- Implication stated: α = 1 maximizes expected log-growth but the variance/drawdown cost is extreme; fractional α is the implementable version.

## 8. Code / data availability

None stated. Fund data is public (Vanguard); formulas are closed-form and trivially re-implementable.

## 9. Leakage / limitations

- μ, Σ treated as known constants — no estimation error, the dominant real-world Kelly risk (contrast with 1228/2508.18868 in this wave).
- GBM assumption; no jumps, no stochastic vol, no regime change — 2001–2021 includes 2008 and 2020, which the model cannot generate.
- In-sample: parameters estimated on the same 2001–2021 window the portfolios are evaluated on.
- Continuous rebalancing, no costs — overstates achievable growth.
- Two-asset illustration only; multivariate formula given but not empirically stress-tested.

## 10. GSE overlap

Foundational for GSE's sizing lane (Kelly is a top gap in the existing-research map):

- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — fractional Kelly is one of the 10 staking strategies compared; this paper supplies the closed-form growth/risk trade-off behind it.
- `apps/web/__tests__/calibration-map-kelly.test.ts` — the existing quarter-Kelly tests; L(k_α)/V(k_α) gives the analytic justification for which α to pick: choose α to hit a target V (variance budget), not a round number.
- Wave-3: 1223/2112.14451 (risk-controlled growth — the continuous-time generalization), 1232/2607.09505 (growth-gap identities), 1228/2508.18868 (estimation risk).

## 11. Implementation spec (GSE)

**Variance-budgeted fractional Kelly.** For each slate:
1. Convert engine edges to per-pick Kelly fractions f_full (existing pipeline).
2. Estimate the slate portfolio's log-growth variance V(1) under f_full via the pick outcome model (or bootstrap of backtest residuals).
3. Solve α = √(V_target / V(1)) from V(k_α) = α²S²-analogue, with V_target set from the bankroll drawdown budget (e.g., max acceptable annualized SD).
4. Stake α·f_full. Report α alongside picks so the sizing is auditable, not a magic "quarter."

## 12. Reproducible test

Replicate Table 2: download VFIAX/VUSUX daily returns 2001–2021, estimate μ/Σ, form k⋆ and k_{0.5} (or the paper's α), rebalance monthly; verify growth/SD/drawdown/final-wealth within 5% of the reported values.

## 13. Numeric gate

Replicated fractional-Kelly portfolio must satisfy: annualized SD ∈ [0.16, 0.19], max drawdown ∈ [38%, 46%], final wealth within 10% of $576,464 — i.e., reproduce the paper's risk profile, not just its return.

## 14. Improvement experiment

Run §11 on GSE's walk-forward picks (Neon `picks`, v5.2.7): compare fixed α = 0.25 vs variance-budgeted α_t (recomputed per slate). Score realized log-growth per unit of realized variance (the empirical S²). Expectation: variance-budgeted α adapts to slate risk (e.g., shrinks on correlated same-game slates), achieving a better realized growth/risk ratio than the fixed fraction.

**Verdict:** ADAPT
