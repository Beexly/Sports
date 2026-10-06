# [1200] Analysis of Kelly-optimal portfolios (arXiv:0712.2771v3)

**Citation:** Laureti, P., Medo, M., & Zhang, Y.-C. (2009). *Analysis of Kelly-optimal portfolios*. arXiv:0712.2771v3 [q-fin.PM]. URL: https://arxiv.org/abs/0712.2771
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 15 pages incl. appendices A–B, complete).
**Verdict:** ADAPT — the "condensation" analysis gives GSE a principled rule for *which* simultaneous picks belong in a Kelly portfolio (iteratively drop assets with non-positive constrained fractions; eq. 13) and an effective-portfolio-size metric (inverse participation ratio, eq. 15); the lognormal-return formulas must be replaced with binary-outcome Kelly math before any use on sports bets.

## 1. Research question
What does the Kelly-optimal portfolio look like for lognormally-distributed asset returns? Specifically: (1) approximate analytical optimal fractions; (2) does the Kelly portfolio lie on Markowitz's Efficient Frontier; (3) under what conditions does the optimal portfolio "condensate" onto a few assets (under-diversification) because Kelly forbids shorting and borrowing? (Sec. 1)

## 2. Dataset / schema
No empirical data — analytical + numerical. Numerical checks: direct maximization of E[ln W₁] (Fig. 2, D = 0.25 and 1.0), 10,000-repetition Monte Carlo for the condensation size (Fig. 5), numerical simulation of P(m₁−m₂ > D) = 0.5 (Fig. 6), numerical Lagrangian optimization for the Logarithmic Efficient Frontier (Fig. 7).

## 3. Method / model
- Multiplicative model: p_i(t) = p_i(t−1)·e^{η_i(t)}, η_i ~ N(m_i, D_i), independent (eq. 1); returns R_i = e^{η_i}−1 lognormal with mean μ_i = exp(m_i+D_i/2)−1, variance σ_i² = (exp(D_i)−1)exp(2m_i+D_i).
- Kelly: maximize v = E[ln W₁], W₁ = 1 + Σq_iR_i (eq. 2); first-order conditions E[R_i/(1+Σq_jR_j)] = 0 (eq. 6).
- Small-D Taylor approximation (Appendix A, eqs. 19–21): E[g(η)] ≈ g(m) + D·g″(m)/2, applied to g(η) = (e^η−1)/[1+q(e^η−1)].
- Constrained (no short/borrow): Lagrange L = v + γ(Σq_i − 1) → eq. 8; iterative elimination of assets with q̂_i ≤ 0.
- Correlated prices: Appendix B generalization via covariance matrix S, E[g(η)] ≈ g(m) + ½Tr(SV).

## 4. Equations & assumptions
- One risky asset: **q̂ = 1/2 + m/D** (eq. 7); invest nothing if m < −D/2 (m_<), everything if m > D/2 (m_>). First-order correction m(4m²−D²)/4D². Relative error vs numerics: ≤3% at D=0.01; ~50% at D=0.25.
- Constrained N assets: **q̂_i = 1/2 + (m_i + γ)/D_i**, γ from Σq̂_j = 1 (eq. 9); drop any asset with q̂_i ≤ 0 and re-solve.
- **Kelly-on-EF theorem:** for μ_i, σ_i → 0, the constrained Kelly portfolio satisfies the constrained Efficient Frontier (eqs. 10–11): μ_K = (C̃₀C̃₂−C̃₁²+C̃₁)/C̃₀, σ²_K = (C̃₀C̃₂−C̃₁²+1)/C̃₀ with C̃_k = Σ(m_j+D_j/2)^k/D_j.
- Two-asset condensation: invest fully in asset 1 when **m′₁ = m₂ + (D₁+D₂)/2** (eq. 12); both assets held only for m″₁ < m₁ < m′₁ (Fig. 4 phase diagram).
- Many assets, equal volatility D: include M assets where M is the largest with **m_M + (1/M)Σᵢ₌₁ᴹ m_i > D/M** (eq. 13).
- Uniform m ∈ [a,b]: typical size M_T = √(2ND/(b−a)) (eq. 14, third branch); **inverse participation ratio R = 1/Σq_i² ≈ 4M_T/3** (eq. 15).
- Power-law tail f(m) = Cm^{−α−1}: condensation to single asset when m̃₁−m̃₂ > D with medians m̃₁ = m_min(Nr/ln2)^{1/α}, m̃₂ = m_min(Nr/1.68)^{1/α} (Sec. 2.4.2, Fig. 6).
- Logarithmic EF: minimize E[(lnW₁)²]−E[lnW₁]² s.t. E[lnW₁]=v_P, Σq_i=1 (eqs. 16–18); numerically ≈ classic EF (Fig. 7).
- Assumptions: investor knows true (m_i, D_i); lognormal returns; infinite divisibility; no dividends/costs/taxes; zero risk-free rate; no shorting/borrowing (forced by log-wealth being undefined on bankruptcy).

## 5. Features / target
N/A (analytical finance). Inputs: per-asset drift m_i, variance D_i. Target: optimal investment fractions q̂_i, portfolio size M, condensation thresholds.

## 6. Validation design
No train/test — approximation accuracy validated against brute-force numerical maximization of E[ln W₁] (Fig. 2: Eq. 7 accurate even at D=1) and Monte Carlo for M_T (Fig. 5, 10,000 reps, analytical vs numerical agreement). Baselines: classic Markowitz EF/CML (Figs. 1, 3, 7); alternative formula q̂′ = μ/(μ²+σ²) from [13] shown to err ~50% at D=0.25.

## 7. Numerical results / baselines
- Eq. 7 matches numerical optimum across 2m/D ∈ [−1,1] for D = 0.25 and 1.0 (Fig. 2).
- Uniform-m case (N=1000, D=0.01, x=−0.05): M_T follows Eq. 14; R ≈ 4M_T/3 matches numerics (Fig. 5). Relative portfolio size M_T/N ∼ 1/√N → condensation in large N limit.
- Power-law case (N=1000, r=0.1, m_min=0.1): α₁(D) curve, analytical vs simulation agreement (Fig. 6).
- LEF ≈ classic EF: "the difference between the traditional M-V approach and the modification proposed here is very small and does not justify the additional complexity" (Sec. 4).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Assumes known (m_i, D_i) — estimation error (the dominant real-world issue) explicitly deferred to references [20, 23, 24].
- Lognormal-returns setting ≠ sports betting: binary outcomes with fixed decimal odds have different Kelly math; Eq. 7 does NOT apply to binary bets directly (the q̂=1/2+m/D form comes from the continuous-return expansion).
- Small-(m,D) approximations degrade for large edges (50% error at D=0.25 for the competing formula; Eq. 7 "well approximated even for D=1" per Fig. 2).
- No transaction costs, no correlation in the main results (Appendix B only sketches the extension).

## 10. GSE overlap
Complements, not duplicates: ledger 0813 gave exact Kelly fractions for M simultaneous *binary* games (Eqs. 10–11 there); ledger 0171 covers practical Kelly variants on real betting data. Neither gives an explicit *inclusion/exclusion rule* for which simultaneous picks enter the portfolio — this paper's eq. 13 (iterative worst-asset elimination) and the IPR concentration metric (eq. 15) are new to the corpus. The Kelly-on-EF proof is finance context, low GSE relevance.

## 11. GSE implementation spec
1. **Pick-inclusion rule (the adapt):** for each day's candidate pick set (model prob p_i, decimal odds o_i), compute binary-outcome Kelly fractions with the Σq≤1 constraint; iteratively drop the pick with the most-negative constrained fraction and re-solve (GSE analog of eq. 13's elimination loop) until all included picks have q̂_i > 0. This replaces ad-hoc "top-N picks" cutoffs with a Kelly-consistent selection.
2. **Concentration monitor:** report inverse participation ratio R = 1/Σq_i² on the posted card — flags days when the portfolio condensates to 1–2 picks (R ≈ 1), in which case apply the fractional-Kelly haircut from 0171's protocol.
3. Data: GSE engine probabilities + odds API lines; compute in the existing picks pipeline (picks table). Effort: small — a post-processing module on the sizing step.

## 12. Reproducible test
Dataset: GSE engine's 2024–2025 NFL picks (picks table, SPREAD/MONEYLINE/TOTAL) with closing odds. Metric: realized log-wealth growth vs baseline = current ad-hoc top-N posting rule, same fractional-Kelly fraction. Backtest window: full 2024 + 2025 seasons. The condensation rule must not reduce growth and must reduce max drawdown.

## 13. Acceptance / rejection gate
ADOPT the inclusion rule if, on the 2024–2025 backtest, the eq.-13-style elimination portfolio achieves ≥ the baseline's final log-wealth with max drawdown no worse; REJECT if it underperforms or if fewer than 5% of days actually change the included set (no practical effect).

## 14. Improvement experiment
Extend the Appendix B correlated-returns sketch to *correlated binary bets* (same-game / correlated legs): replace the diagonal-D assumption with an outcome-correlation matrix estimated from the engine's joint simulations, and test whether the correlation-aware elimination rule further concentrates or diversifies the card vs the independent-bet version.
