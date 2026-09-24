# [0821] Kelly's Criterion in Portfolio Optimization: A Decoupled Problem (arXiv:1710.00431)

**Citation:** Zachariah Peterson (2017, v2). *Kelly's Criterion in Portfolio Optimization: A Decoupled Problem*. arXiv:1710.00431. URL: https://arxiv.org/abs/1710.00431
**Ledger completed:** 2026-09-21. **Read:** full text (fetched PDF https://arxiv.org/pdf/1710.00431, 15 pages, read in full via pdftotext; local cache held only the abstract page).
**Verdict:** ADAPT — the decoupled-vs-coupled Kelly distinction is the key transferable idea: the full joint (coupled) multi-bet Kelly problem needs an N-dimensional integral (cost T^N), while the decoupled form needs only N one-dimensional integrals (cost NT); for GSE's weekly slate of simultaneous picks, the decoupled approximation with a shared risk penalty is the tractable path to multi-pick Kelly staking. The paper's own empirics are a weak proof-of-concept (10 stocks, one mis-convergence).

## 1. Research question
Can Kelly's criterion be incorporated into a standard portfolio optimization model that simultaneously minimizes risk? The paper derives "decoupled" and "coupled" Kelly return functions, combines the decoupled return with a Markowitz variance risk term via a risk parameter P ∈ [0,1], and solves the resulting non-convex problem with differential evolution on 10 stocks.

## 2. Dataset / schema
10 stocks from a major exchange (data from Zaheer & Pant 2016), monthly returns; Table 1 gives sample means Avg[R] (0.0995–0.4405), GBM-calibrated drifts μ_i = ln(1+Avg[R]) and volatilities σ_i (0.1991–0.4398), plus first-to-second moment ratios; Table 2 is the 10×10 sample covariance matrix. Returns modeled as lognormal via GBM: X_i = exp((μ_i − σ_i²/2)Δt + σ_i√Δt·y) − 1, Δt = 1 month, y ~ N(0,1).

## 3. Method / model
Derivation: split wealth into N fractions f_i; per-asset Kelly growth ∏(1+f_i X_{i,j}) → exp(nE[ln(1+f_i X_i)]) asymptotically (Eq. 9). Decoupled return function (Eq. 10): R_avg = Σ_{i=1}^N f_i·exp(E[ln(1+f_i X_i)]) − 1. Coupled return (Eq. 11): R_c = exp(E[ln(1+ΣF_i X_i)]) − 1 — requires an N-dimensional integral over the joint distribution p(X), cost T^N vs NT for the decoupled form (each decoupled term needs only the marginal p(X_i)). Decoupled Kelly model (Eq. 17): max_f P·Σf_i(exp(E[ln(1+f_i X_i)])−1) − (1−P)·Σ(f_i⁴M_ii + 2Σ_{j>i}f_i²f_j²M_ij), s.t. Σf_i² = 1, K_min ≤ f_i² ≤ K_max (cardinality bounds); wealth fraction in asset i is f_i². MV benchmark (Eq. 16): max P·ΣF_iE[r_i] − (1−P)·Σ(F_i²M_ii + 2ΣF_iF_jM_ij), ΣF_i=1. Solver: differential evolution (DE/rand/1/bin, C=0.75, scaled F, N(0,0.01) noise, 30-second reset timer; typical runs ~100 s on a 2.4 GHz dual-core). Validation: Monte Carlo with 10⁴ samples per asset comparing return-to-risk ratios of DE portfolios vs objective-function predictions.

## 4. Equations & assumptions
Decoupled: R_avg = Σ f_i exp(E[ln(1+f_i X_i)]) − 1 (Eq. 10). Coupled: R_c = exp(E[ln(1+ΣF_i X_i)]) − 1 (Eq. 11). GBM: X_i(t+Δt) = exp((μ_i−σ_i²/2)Δt + σ_i√Δt·y) − 1 (Eq. 19); μ_i = ln(1+Avg[R]), σ_i = (ln(Var[R]e^{−2μ_i}+1))^{1/2} (Eq. 20). Risk: Var[R] = Σ(f_i⁴M_ii + 2Σ_{j>i}f_i²f_j²M_ij) (Eq. 14).
Assumptions (stated): per-asset returns i.i.d. across periods (path-independent); joint distribution p(X) known (fitted GBM); Kelly asymptotics (n→∞, Samuelson 1971 caveat noted); nonzero probability of total loss required for f_i to be true wealth fractions (else Kelly returns leverage factors >1 — Rotando & Thorpe's F=1.69 example cited).

## 5. Features / target
Features: per-asset drift/volatility/covariance from market data. Target: wealth-fraction vector maximizing risk-parameterized Kelly-minus-variance objective. Horizon: monthly rebalancing, asymptotic growth.

## 6. Validation design
Differential evolution on the 10-stock dataset at P ∈ {0.1, 0.3, 0.5, 0.7, 0.9}; Monte Carlo (10⁴ draws/asset) check of return-to-risk ratios. No train/test split, no out-of-sample period, no transaction costs. Single dataset — proof of concept by the author's own admission.

## 7. Numerical results / baselines
MV model: DE converges to the same portfolio at all P — heavily concentrated on stock X₁₀ (weight ≈ 0.55, the highest drift-to-vol ratio), all others at the 0.05 lower bound (Table 3). Decoupled Kelly (Table 4): matches the MV portfolio at P=0.3 and P=0.5 (X₁₀ ≈ 0.55/0.53); at P=0.1 gives a more diversified, lower-return/lower-risk portfolio (X₅=0.1438, X₁₀=0.4339); converges slowly at P=0.7; mis-converges at P=0.9 (lower return AND higher risk — author flags possible local-maximum trap). Monte Carlo return-to-risk ratios (Figure 3) confirm the objective functions' predictions track the simulated ratios, including the P=0.9 anomaly. DE convergence: ~1,000s of iterations, ~100 s per run; slower for the Kelly model than MV. These are the paper's claims on one 10-stock dataset.

## 8. Code / data availability
No code; references Storn & Price 1997 C code. Data: Zaheer & Pant 2016 (not redistributed here).

## 9. Leakage & limitations
- Single 10-stock dataset, no out-of-sample test — the "similar to MV" finding may be dataset-specific (both models pile onto the highest-Sharpe stock).
- Mis-convergence at P=0.9 with no fix; DE hyperparameters hand-set.
- GBM/lognormal assumption contradicts the paper's own "no distribution" motivation; monthly Δt arbitrary.
- The decoupled form ignores cross-asset dependence in the *return* term (only the risk term has M_ij) — for correlated bets this is a real approximation error the paper doesn't quantify vs the coupled form.
- Kelly fractions can exceed 1 (leverage-factor issue) — cardinality bounds paper over it.
- Asymptotic (n→∞) justification; sports slates are finite.

## 10. GSE overlap
Existing-research map: Kelly 12×; ledgers 0813, 0816, 0819, 0820 all touch Kelly/sizing. This paper's distinct contribution: the decoupled-vs-coupled computational decomposition (NT vs T^N) — none of the other Kelly ledgers address the *computational* problem of joint multi-bet Kelly. Directly relevant to the slate-staking designs in 0819 (MPC) and 0820 (RCK vector extension). Connects to sizing lane.

## 11. GSE implementation spec
Adaptation: "decoupled slate Kelly." For each week's slate of K picks: compute per-pick decoupled Kelly terms f_k·exp(E[ln(1+f_k X_k)])−1 from engine win prob and decimal odds (binary outcomes — closed form, no integral needed), plus a shared risk penalty (1−P)·ΣΣf_k f_j Cov(X_k,X_j) using empirical same-slate outcome covariance; maximize the combined objective over stake fractions with Σf_k ≤ max_exposure, 0 ≤ f_k ≤ cap. This is exactly Eq. 17 with binary X_k — cheaper than the joint (coupled) optimization and richer than independent per-pick Kelly. Compare against the 0819 MPC and 0820 RCK slate variants. Effort: ~3 days (binary closed forms + covariance + optimizer + backtest).

## 12. Reproducible test
Dataset: GSE picks DB grouped by weekly slate, engine probs, closing odds. Protocol: walk-forward 2024→2025; each week solve decoupled Kelly (tune P on 2024) vs (a) independent capped Kelly, (b) 0819 MPC variant if implemented. Metric: log-bankroll growth, max drawdown. Baseline: independent capped Kelly.

## 13. Acceptance / rejection gate
ADAPT if decoupled slate Kelly beats independent capped Kelly on 2025-holdout log-growth with comparable or better drawdown — else the coupling genuinely doesn't matter for GSE slates and per-pick Kelly stands.

## 14. Improvement experiment
Two extensions: (1) Quantify the decoupled approximation error: on small slates (2–4 picks) solve the exact coupled problem (Eq. 11, low-dimensional integral via quadrature) and measure the allocation/growth gap vs decoupled — if the gap is small, decoupled is certified for large slates. (2) Make P adaptive: the paper's fixed risk parameter is the analog of 0820's fixed λ — test a drawdown-state-dependent P (link to 0818's CED trigger) so the slate staker de-risks automatically in drawdown.
