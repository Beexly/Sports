# Deep-Research Ledger 1231 — arXiv:2604.24723v2 (q-fin.MF, 29 Apr 2026)

**Title:** Efficient Multivariate Kelly Optimization Reveals Sigmoidal Scaling Laws
**Authors:** Ruslan Tepelyan and Daniel Lam (Bloomberg)
**Version read:** v2 (29 Apr 2026). Full read verified on 2026-09-21: main text plus Appendix A in full (Frullani/Laplace derivation, tail subtraction, double-exponential quadrature, Newton-CG, greedy/stepwise bounds). Text source: `2604.24723.pdf` → `pdftotext -layout` (8,622 words).

## 1. Question asked

For N simultaneous independent binary bets, the Kelly objective naively costs O(2^N) to evaluate — can it be computed in O(TN), optimized at scale, and what scaling laws govern the shortfall of fast approximations?

## 2. Dataset / schema

**Synthetic prediction-market data:** prices q ∼ U(0.1, 0.9); 4 disagreement regimes × 3 variance levels; **1,000 instances per combination**. Validation at N = 10; scaling study N = 20…200.

## 3. Method

1. **Frullani identity:** log x = ∫₀^∞ (e^{−t} − e^{−tx})/t dt.
2. **Laplace factorization:** for independent binary bets, the moment-generating structure factorizes: Q(t) = e^{−tw₀}·Π_i[(1−p_i) + p_i·e^{−tc_i}], reducing objective evaluation from O(2^N) to **O(TN)** (T quadrature points).
3. **Numerics:** tail subtraction, double-exponential quadrature, stable gradients and Hessian-vector products, Newton-CG optimizer.
4. **Bounds:** greedy/stepwise lower bounds and default-free-asset upper bounds for the optimum.
5. **Scaling laws:** fit the sigmoid shortfall law y ≈ (1 + Q·e^{−B·Logit(x)})^{−1/v} relating approximation quality to problem parameters.

## 4. Equations / assumptions

- log x = ∫₀^∞ (e^{−t} − e^{−tx})/t dt (Frullani).
- Q(t) = e^{−tw₀} Π_i [(1−p_i) + p_i e^{−tc_i}] (factorized MGF).
- Shortfall law: y ≈ (1 + Qe^{−B·Logit(x)})^{−1/v}.
- **Assumptions:** binary bets are **independent** (the binding limitation); known p_i; prediction-market-style binary payoffs.

## 5. Features / target

Features = per-bet (p_i, price q_i, payoff c_i). Target = the stake vector maximizing expected log portfolio wealth over all 2^N joint outcomes — computed without enumerating them.

## 6. Validation

- **Table 1:** solver discrepancies negligible; relative objective errors at most **3.92×10⁻⁷**.
- **Table 2:** greedy-vs-stepwise differences near numerical precision.
- **Scaling:** N = 20…200 instances solved; sigmoid law fitted.
- **Misspecification study:** mean MSE 4.53×10⁻⁴, median MAE 3.95×10⁻³, 1 − median R² = 1.20×10⁻⁴.
- **Test model overall:** MSE 3.23×10⁻³, median MAE 1.34×10⁻², median R² 9.79×10⁻¹.

## 7. Exact results

- O(TN) evaluation (vs O(2^N)); Newton-CG converges; max relative objective error 3.92×10⁻⁷ (Table 1).
- Sigmoidal shortfall law y ≈ (1+Qe^{−B·Logit(x)})^{−1/v} describes how approximation shortfall scales.
- Misspecification robustness numbers as above; test-model R² 0.979 (median).

## 8. Code / data availability

None stated. Algorithms fully specified (Appendix A gives the quadrature and Newton-CG details); synthetic data-generating process described and reproducible.

## 9. Leakage / limitations

- **Independent bets assumed** — the factorization collapses with correlated outcomes (same-game parlays, correlated props), which is exactly where multivariate Kelly matters most.
- Binary payoffs only; no multi-outcome (multinomial) extension in the paper.
- Synthetic prediction-market data only; no real betting or market data.
- Sigmoid scaling law is descriptive (fitted), not derived — predictive use on new regimes is extrapolation.
- Bloomberg authorship suggests production use, but no production validation is shown.

## 10. GSE overlap

The multi-bet sizing engine GSE needs for full slates:

- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — sequential Kelly benchmark; this paper's O(TN) evaluator makes exact multivariate Kelly tractable as a benchmark oracle.
- 1229/2603.13581 (this wave) is the single-event multinomial case; this paper is the multi-event binary generalization.
- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — multi-bet sizing strategies; the greedy/stepwise bounds give cheap certified approximations.

## 11. Implementation spec (GSE)

**Slate Kelly optimizer.** For each slate of N independent-ish picks (spread/moneyline/total across games):
1. Per pick: model win prob p_i, decimal odds → net payoff c_i, price q_i.
2. Evaluate the Kelly objective via the factorized Frullani/double-exponential quadrature (O(TN)) — no 2^N enumeration.
3. Newton-CG on stakes; fall back to greedy/stepwise lower bound for N > 200 or time-constrained runs.
4. Correlation guard: pre-cluster correlated picks (same game); within a cluster use the conservative bound, across clusters use the factorizer — the paper's independence assumption must not be applied blindly.
5. Scale the resulting stake vector by the fractional overlay (1222/§11).

## 12. Reproducible test

Generate N = 10 binary bets per the paper's spec (q ∼ U(0.1,0.9)); implement the O(TN) evaluator; verify against brute-force 2^N enumeration: relative objective error ≤ 10⁻⁶ (paper achieves 3.92×10⁻⁷).

## 13. Numeric gate

At N = 10 over 100 random instances: max relative error vs brute force ≤ 10⁻⁶; Newton-CG optimum ≥ greedy lower bound on every instance; runtime scaling from N = 20 to N = 200 consistent with O(TN) (linear in N at fixed T).

## 14. Improvement experiment

Run §11 on GSE slates (Neon `picks`, v5.2.7) as the stake allocator vs the current per-pick fractional Kelly: compare realized log-wealth and max drawdown. Then break the independence assumption deliberately — run on same-game correlated slates — and measure how far the factorizer over-bets; use that gap to calibrate the §11 correlation guard.

**Verdict:** ADAPT
