# [0822] Discrete-time portfolio optimization under maximum drawdown constraint with partial information and deep learning resolution (arXiv:2010.15779)

**Citation:** Carmine De Franco, Johann Nicolle, Huyên Pham (2020, v2). *Discrete-time portfolio optimization under maximum drawdown constraint with partial information and deep learning resolution*. arXiv:2010.15779. URL: https://arxiv.org/abs/2010.15779
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; 94KB; read §§1–5 in full).
**Verdict:** ADAPT — the paper's core transferable result is that Bayesian learning of uncertain parameters (drift) under a hard drawdown constraint beats non-learning by +2.94% return with far better drawdown control (worst MD −11.74% vs −27.18%); for GSE this is the theoretical backing for *learning the engine's edge online under a drawdown cap* rather than using fixed historical edge estimates. The Hybrid-Now deep-learning solver is overkill for GSE's scale, but the learning-vs-non-learning finding is directly actionable.

## 1. Research question
How to solve discrete-time portfolio selection with (a) unknown asset drift modeled by a Bayesian prior (partial information — drift learned from observed prices), and (b) a hard maximum-drawdown constraint (wealth must stay above fraction q of its running maximum)? The paper derives the dynamic programming equation via change of measure + Bayesian filtering (Kalman in the Gaussian case), solves the 5-dimensional CRRA-Gaussian case with the Hybrid-Now deep neural network algorithm, and quantifies the value of learning vs not learning.

## 2. Dataset / schema
Simulated: d=3 risky assets + riskless (0 return), 1-year horizon, N=24 rebalances (biweekly), Ñ=1000 trajectories. Parameters (Table 2): CRRA utility p=0.8; drawdown parameter q=0.7; drift prior mean b₀=[0.05, 0.025, 0.12] annualized; drift prior covariance diag(0.2², 0.15², 0.1²); noise vol [0.08, 0.04, 0.22]; noise correlation matrix [[1,−0.1,0.2],[−0.1,1,−0.25],[0.2,−0.25,1]]. No real market data — pure simulation study. TensorFlow 2 implementation.

## 3. Method / model
Market: S_{k+1}^i = S_k^i e^{R_{k+1}^i}, R_{k+1} = B + ε_{k+1}; B ~ prior μ₀ (unknown drift), ε i.i.d. centered with covariance Γ, independent of B. Wealth: X_{k+1}^α = X_k^α(1 + α_k'(e^{R_{k+1}} − 1_d)). Drawdown constraint: X_k^α ≥ q·Z_k^α a.s., Z_k^α = max_{ℓ≤k} X_ℓ^α, q ∈ (0,1). Problem: V₀ = sup_{α∈A₀^q} E[U(X_N^α)], U CRRA. Theory: change of measure (Elliott et al. 2008) + Bayesian filtering → dynamic programming equation (infinite-dimensional in general; finite-dimensional in the Gaussian case via Kalman filter; further reduced for CRRA). Numerics: Hybrid-Now algorithm (Bachouch et al. 2018a,b) — deep neural networks approximating the value function/control backward in time. Strategies compared: Learning (updates drift posterior from observed returns) vs Non-Learning (acts on prior mean b₀) vs constrained equally-weighted benchmark.

## 4. Equations & assumptions
S_{k+1}^i = S_k^i exp(R_{k+1}^i) (1); R_{k+1} = B + ε_{k+1} (2); X_{k+1}^α = X_k^α(1+α_k'(e^{R_{k+1}}−1_d)) (3); constraint X_k^α ≥ qZ_k^α; V₀ = sup E[U(X_N^α)] (4). Gaussian case: Kalman filter gives finite-dimensional sufficient statistic (posterior mean/covariance of B).
Assumptions (stated): drift prior with known mean and finite second moment; noise density strictly positive; Inada utility; observation filtration = price history. Learning assumes the Gaussian/Kalman structure is correct — model-misspecification of the prior is not studied (sensitivity analysis varies only the prior covariance scale unc).

## 5. Features / target
State: wealth, running maximum, posterior drift belief (mean + covariance). Target: allocation vector α_k maximizing expected CRRA utility of terminal wealth under the drawdown constraint. Horizon: 1 year, 24 steps.

## 6. Validation design
1000 simulated trajectories per strategy; Learning vs Non-Learning vs constrained EW; sensitivity analysis over prior-uncertainty scale unc; convergence check of Non-Learning → constrained Merton as q→0. No real data, no train/test split in the ML sense (the "test" is fresh simulation draws). Appropriate for a stochastic-control methods paper.

## 7. Numerical results / baselines
Table 3 (Learning vs Non-Learning, x₀=1): total performance 9.34% vs 6.40% (+2.94% value of learning); terminal-wealth σ 11.88% vs 16.67%; avg max drawdown −1.53% vs −6.54%; worst MD −11.74% vs −27.18%. Learning starts nearly flat for the first period (waits one step to update the prior before allocating — "safer approach"), then the Learning/Non-Learning ratio follows the concave "value of information" curve. Table 4 (vs constrained EW): Learning beats EW by +5.49% return, −1.92% terminal σ, +182.08% Sharpe, avg MD +3.17%, worst MD +10.09%, Calmar +647.56%. Non-Learning vs EW: +2.5% return but +2.87% σ — similar Sharpe; both concentrate on Asset 3 (highest drift). §5.3.3: as q→0, Non-Learning allocations and wealth paths converge to the constrained Merton solution (both invest at full capacity in Asset 3). Sensitivity (§5.4): Learning's advantage grows with prior uncertainty unc. These are the paper's simulation claims.

## 8. Code / data availability
No code or data released; Hybrid-Now from Bachouch et al.; TensorFlow 2 per Géron 2019. All parameters in Table 2 — reproducible in principle.

## 9. Leakage & limitations
- Pure simulation: the DGP matches the Learning strategy's assumed model (Gaussian drift + Kalman) — the +2.94% is partly a home-field advantage; no model-misspecification test.
- 3 assets, 1-year horizon, 24 steps — small scale; Hybrid-Now deep learning is heavy machinery for a 5-D problem (a discretized DP might suffice).
- CRRA p=0.8, q=0.7 chosen, not estimated; sensitivity only on prior covariance.
- Drawdown constraint q is on *wealth vs running max* — maps to bankroll management, not to pick selection.
- No transaction costs, no real market frictions.

## 10. GSE overlap
Existing-research map: Bayesian appears 8×; drawdown-constrained optimization appears via ledgers 0818 (CED) and 0820 (RCK) but neither combines *learning under uncertainty* with a *hard drawdown constraint*. The distinct contribution: quantified value of online Bayesian learning (+2.94%, worst-MD halved) under a drawdown cap. Connects to bayesian lane, sizing lane, and the abstention lane (the "flat first period" is abstention-by-uncertainty).

## 11. GSE implementation spec
Adaptation: "learn the edge under a drawdown cap." GSE's engine currently uses fixed historical edge estimates for Kelly sizing. Implement: per-pick-category (spread/ML/total × league) Bayesian posterior over true win probability (Beta-Binomial updating as picks settle — the 1-D analog of the paper's Kalman drift learning); stake = Kelly fraction computed from the posterior mean, shrunk by posterior uncertainty; hard cap: if bankroll drawdown exceeds q (e.g., 30% from peak), stakes scale to the constrained-EW analog (minimum viable stakes) until recovery — mirroring the paper's q=0.7 constraint. The paper's "flat first period" becomes: new categories start at reduced stakes until the posterior tightens. Effort: ~4–5 days (Beta-Binomial layer + drawdown governor + backtest).

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks), settled outcomes, by category. Protocol: walk-forward 2024→2025; Learning staker (Beta-Binomial edge updating + 30% drawdown governor) vs Non-Learning (fixed historical edge + same governor) vs flat stakes. Metric: total ROI, worst drawdown, Calmar. Baseline: current fixed-edge Kelly. Expectation from the paper: Learning wins on both return and drawdown, especially early in a category's history.

## 13. Acceptance / rejection gate
ADAPT if the Learning staker beats the Non-Learning staker on 2025-holdout ROI with worst drawdown no worse (replicating the paper's dual win) — else the Bayesian layer adds complexity without edge and GSE keeps fixed edge estimates with the simple drawdown governor from 0818.

## 14. Improvement experiment
Two extensions: (1) Hierarchical learning: the paper learns each asset's drift independently; GSE categories share information (spread and total edges correlate) — use a hierarchical Beta-Binomial so new categories borrow strength, testing whether cold-start stakes can ramp faster than the paper's "flat first period." (2) Replace the fixed q governor with the RCK-derived λ from ledger 0820: instead of a hard 30% cutoff, continuously modulate stakes via the drawdown-probability bound — unifying 0820's guarantee with 0822's learning into a single adaptive staker.
