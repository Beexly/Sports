# Deep-Research Ledger 1223 — arXiv:2112.14451v1 (q-fin.RM, 29 Dec 2021)

**Title:** Dynamic growth-optimum portfolio choice under risk control
**Authors:** Pengyu Wei, Zuo Quan Xu
**Version read:** v1 (29 Dec 2021). Full read verified on 2026-09-21: abstract, Sections 1–6 (model, quantile formulation, VaR/ES solutions, numerical examples with Figures 2–6, conclusion), Appendix A (convex envelopes, Lemmas A.1–A.4), Appendix B (proofs of Lemma 3.1, Propositions 3.1/3.2/4.1/4.2, Corollary 4.1), references (incl. Thorp 2000 on the Kelly criterion). Text source: `2112.14451.pdf` → `pdftotext -layout` (10,235 words).

## 1. Question asked

How to invest to maximize expected log-return (growth) while controlling tail risk in a continuous-time complete market — and is a mean–risk criterion well-posed when the risk measure is applied to log-returns instead of terminal wealth?

## 2. Dataset / schema

No real dataset. All numerics are closed-form illustrations with **T = 1, r = 0.05, θ = 0.4** (market price of risk), plotted in Figures 2–6. Validation is analytical (explicit solutions) plus these parameter illustrations.

## 3. Method

1. **Market:** continuous-time complete Black-Scholes market with market price of risk θ = (μ−r)/σ; unique pricing kernel ξ, budget constraint E[ξ_T X_T] = x (shown binding in Lemma 3.1).
2. **Objective (2.8):** max_{X_T} λ·E[R] − ρ_Φ(R), where R = log(X_T/x) is the log-return and ρ_Φ is weighted VaR (WVaR). λ ≥ 0 is the growth-vs-risk trade-off (λ = 0 → minimum-risk; λ → ∞ → growth-optimal).
3. **Quantile formulation:** by comonotonicity the optimal terminal wealth is anti-monotone in ξ_T, so it is a quantile function H(s); the problem becomes a concave maximization over quantile functions (3.3)/(3.4) with a Lagrange multiplier η for the budget constraint.
4. **Convex envelope:** the non-convex integrand ϕ(s−;λ) is replaced by its convex envelope δ(s;λ) (Lemmas A.1–A.4 give closed forms for the VaR and ES specializations, with tangency points s⋆(λ), t₀, and t₁(λ)<w(α)<t₂(λ) solving derivative-matching conditions (A.3)). Pointwise optimization yields H⋆(s;λ,η) = (1+λ)/η · δ′(s;λ) (Proof of Proposition 3.1, identity (B.1)).
5. **Specializations:** Proposition 4.1 — VaR (Φ = Dirac measure at α); Proposition 4.2 — ES (Φ with density φ(z) = (1/α)·1_{z≤α}); Corollaries 4.1/4.2 give time-t wealth X_{t,λ} and dynamic policies π_{t,λ} in closed form using N(d₁), N(d₂) terms.

## 4. Equations / assumptions

- Objective: λE[R] − ρ_Φ(R), R = log(X_T/x); budget E[ξ_T X_T] = x.
- Optimal quantile: H⋆(s;λ,η) = (1+λ)η⁻¹δ′(s;λ).
- VaR corollary (Cor. 4.1): X^{VaR}_{t,0} = X^{VaR}e^{−r(T−t)}N(d₂(t,ξ_t,ξ_α)); π^{VaR}_{t,0} = X^{VaR}e^{−r(T−t)}ν(d₂(t,ξ_t,ξ_α))/(σ√(T−t)); the 0<λ<∞ case is a λ/(1+λ)-mixture of growth and min-VaR terms (Eqs. in §4.1).
- **Assumptions:** complete market (unique ξ); log-normal ξ_T for the explicit VaR/ES formulas (Corollary 4.1 proof uses "ln ξ_T is normally distributed"); admissible (square-integrable) strategies; Φ left-continuous at 1, finite on [0,1).
- **Key contrast:** He et al. (2015) put mean-WVaR on *terminal wealth* → vertical efficient frontier (improper modeling); this paper's criterion on *log-returns* yields a proper concave frontier.

## 5. Features / target

Features = market primitives (θ, r, T, risk confidence α, trade-off λ). Target = the optimal terminal-wealth quantile function and its replicating dynamic policy π_t — i.e., the exact position sizing through time that maximizes expected log-growth subject to a VaR/ES cap on log-returns.

## 6. Validation

Analytical proofs (Appendices A–B) plus numerical frontiers:
- **Mean-VaR frontier (Fig. 3):** concave curve from growth-optimal portfolio (highest E[log-return], highest VaR) to min-VaR portfolio (expected log-return −∞, lowest VaR). As α ↑, the frontier shifts left — same expected log-return at lower VaR.
- **Mean-ES frontier (Fig. 6):** concave curve from growth-optimal (highest E[log-return], highest ES) to min-ES (smallest E[log-return], lowest ES). **Unlike min-VaR, min-ES risk is finite, so the mean-ES frontier is a finite curve.** As α ↑, frontier shifts left and the minimum achievable ES decreases in α.
- Terminal payoffs (Figs. 2, 5): mean-VaR payoff is a digital-like cutoff structure (pays X^{VaR} in good states ξ ≤ ξ_α, 0 otherwise; Fig. 1 text). Mean-ES payoff is continuous in the state price density — verbatim: "In contrast to the mean-VaR efficient portfolio, the terminal payoff of the mean-ES efficient portfolio is continuous in the state price density" (Fig. 5 text): good states (ξ ≤ ξ^{ES}) pay a fraction λ/(1+λ) of the growth-optimal portfolio, intermediate states a constant X^{ES}, bad states (ξ > ξ^{ES}) a multiple (α^{-1}+λ)/(1+λ) of the growth-optimal portfolio.

## 7. Exact results

- Growth-optimal portfolio simultaneously has the **highest expected log-return and the highest tail risk** (both VaR and ES versions) — the paper's central growth-vs-risk tension, stated verbatim for both frontiers.
- Min-VaR expected log-return = **−∞** (Fig. 3 text); min-ES is finite (Fig. 6 text).
- Frontier sensitivity: increasing the confidence level α shifts the entire frontier left (risk falls at fixed expected log-return); minimum achievable ES is decreasing in α.
- All frontier claims illustrated at T=1, r=0.05, θ=0.4.

## 8. Code / data availability

None. No code URL, no dataset — a pure theory paper with closed-form solutions and plotted illustrations. The explicit formulas (Prop. 4.1/4.2, Cor. 4.1/4.2) are sufficient to re-implement the frontiers numerically.

## 9. Leakage / limitations

- Complete-market Black-Scholes assumptions; no frictions, no discrete rebalancing, no parameter uncertainty — the opposite of a sportsbook (incomplete, discrete, misestimated edges).
- Log-normal pricing kernel required for the explicit time-t policies; "additional assumptions on ξ_T" needed to extend beyond Black-Scholes (§2).
- VaR is non-coherent and the min-VaR portfolio has −∞ expected log-return — the VaR solution is degenerate at the extreme; only ES gives a finite usable frontier.
- No empirical validation of any kind; the "examples" are single-parameter illustrations.
- WVaR-on-log-returns is well-posed, but the paper does not address estimation error in θ — the dominant risk in any real Kelly application.

## 10. GSE overlap

Core to GSE's sizing lane (Kelly is a top gap in the existing-research map):

- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — Kelly log-wealth reward and walk-forward failure taxonomy; this paper is the continuous-time formal version of "Kelly with a drawdown/tail-risk governor."
- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — fractional and drawdown-constrained Kelly staking; the paper's λ is the principled version of the Kelly fraction, chosen to hit a VaR/ES target rather than a fixed ¼.
- Wave-3 sizing neighbors: 2607.09505 (growth-gap/KL identities), 2508.18868 (Kelly under estimation risk), 1226/2504.20877 (risk-sensitive PM mixtures).

## 11. Implementation spec (GSE)

**Kelly-with-tail-governor (discrete-time adaptation).** For the GSE bankroll each slate:
1. Start from the engine's per-pick edge and win probability → full-Kelly fractions f_full (existing calibration-map quarter-Kelly tests in `apps/web/__tests__/calibration-map-kelly.test.ts`).
2. Simulate the portfolio log-return distribution over the slate under the Kelly-scaled stakes (Monte Carlo over pick outcome model).
3. Compute ES_α of the slate log-return; if ES_α exceeds the bankroll risk budget, scale all fractions by λ/(1+λ)-style shrinkage (paper's interior solution is a convex mixture of growth-optimal and min-risk wealth — implement as scalar shrinkage s ∈ (0,1) on the Kelly vector, solved by bisection on the ES constraint).
4. Re-check weekly; α = 0.95 default; report the implied λ so Garrett sees the growth/risk trade-off explicitly.

## 12. Reproducible test

Implement Proposition 4.2 / Corollary 4.2 (mean-ES) with T=1, r=0.05, θ=0.4, α ∈ {0.9, 0.95, 0.99}; trace the efficient frontier over λ ∈ (0,∞) and verify §13's gate.

## 13. Numeric gate

The replicated mean-ES frontier must be (a) concave, (b) anchored at the growth-optimal endpoint with the maximum expected log-return *and* maximum ES, (c) terminating at a finite min-ES point, and (d) shifting left (weakly lower ES at fixed expected log-return) as α increases from 0.9 → 0.99 — matching Figure 6's four stated properties.

## 14. Improvement experiment

Run the §11 governor on GSE's walk-forward pick history (Neon `picks`, model v5.2.7): compare realized log-wealth and max drawdown of (a) fixed quarter-Kelly vs (b) Kelly-with-ES-governor (α=0.95, ES budget = 15% of bankroll log-return). Hypothesis from the paper: (b) sacrifices a small, measurable amount of expected log-growth for a large reduction in tail risk — quantify the exchange rate (growth given up per unit of ES reduced) and pick the operating α by it.

**Verdict:** ADAPT
