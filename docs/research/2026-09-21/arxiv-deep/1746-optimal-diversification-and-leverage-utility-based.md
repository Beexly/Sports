# [1746] Optimal Diversification and Leverage in a Utility-Based Portfolio Allocation Approach (arXiv:2503.07498)

## 1. Citation and full-text-read statement
**Citation:** Vladimir Markov (2025). *Optimal Diversification and Leverage in a Utility-Based Portfolio Allocation Approach*. arXiv:2503.07498. URL: https://arxiv.org/abs/2503.07498
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; appendices C–G statements read, proofs/derivations skimmed).
**Verdict:** ADAPT — one sentence: the two-knob framework (exponential-utility diversification × log-utility/GMV leverage, with compound distributions for estimation + non-stationarity uncertainty) is the cleanest theoretical justification for half-Kelly GSE has seen, but it is derived for continuous returns with illustrative numerics only, so the binary-betting appendix must be re-derived for discrete sports outcomes and validated on GSE data.

## 2. Research question
How should a trader jointly choose (a) diversification across securities and (b) leverage (fraction of risk capital per sequential bet) under both statistical estimation error and non-stationary drift in expected returns/covariances — within a utility framework that also explains the practitioner-standard half-Kelly rule?

## 3. Method / model
Two-stage single-period (MPC-style) allocation: (1) cross-sectional diversification weights w* from maximizing exponential (CARA) utility under a compound outcome distribution; (2) absolute leverage f* from maximizing logarithmic utility of wealth (GMV: expected utility minus (λ/2)·variance of utility) applied to final wealth evolving under GBM with the stage-1 parameters. Final weights w*_f = f*·w*. Uncertainty modeled by compound distributions: location/scale parameters of returns themselves given distributions (e.g., Gaussian returns with uncertain covariance → marginalization yields fat-tailed ALD-like forms), which "formally coincides with the posterior predictive distribution," admitting Bayesian machinery. Objectives are convex in w and solved numerically; analytic solutions given for the unconstrained Σ_0=0 case (Appendix C). Appendices: F = GMV for binary betting (deterministic and probabilistic cases); G = Kelly with power utility; E = practical considerations.

## 4. Mathematics / equations / assumptions
- Generalized mean-variance (GMV): w = argmax_w ( E[U(X|D)] − (λ/2)·Var[U(X|D)] ) (46). Taylor approximations: E[U(X)] ≈ U(μ_X) + U''(μ_X)/2·σ_X²; Var[U(X)] ≈ (U'(μ_X))²σ_X² + ½(U''(μ_X))²σ_X⁴ (47).
- Exponential utility: E_ALD[−e^{−a w^T r}] = (−1)·e^{−a μ_0^T w + a²/2·w^T Σ_0 w − ln[1 − a² w^T Σ w/2 + a μ_a^T w]} (75); with uncertain covariance marginalized: additional −(α/2)·ln[1 − a²/α·(w^T Σ w)] term — a logarithmic risk singularity at w^T Σ w = α/a² from fat tails. Certainty-equivalent calibration of risk-aversion a.
- GBM with uncertain drift: dS_t/S_t = μ_t dt + σ dW_t (112); μ_t = μ_0 + σ_μ B_t, μ_0 ~ N(μ_p d, σ_p² d²) (113).
- CRRA utility U_r(x,γ) = (x^{1−γ}−1)/(1−γ), γ>0,γ≠1; ln x if γ=1 (143); closed-form E[U] and Var[U] under lognormal price (144).
- Leverage: with cash rate r_0 and portfolio drift μ_r / vol σ_r, μ = (1−f)r_0 + f μ_r, σ = f σ_r (146). MEU leverage f* = (μ_r − r_0)/(σ_r² γ); γ=1 → Kelly f* = (μ_r − r_0)/σ_r²; γ=0 → unbounded (linear utility); γ>1 → "alternative explanation of fractional Kelly"; GMV argmax_f E[U] − (λ/2)Var[U] solved numerically → "naturally explains the half-Kelly criterion."
- Assumptions: single-period (myopic) optimization re-solved each step (MPC framing); compound-distribution hyperparameters capture statistical noise and non-stationarity; GBM wealth dynamics for the leverage stage; no transaction costs in the core derivation.

## 5. Dataset / schema
None — theory paper with illustrative numerical examples only. No real market or betting data.
## 6. Features and target
Not applicable (theory). Inputs: expected returns μ, covariance Σ (+ uncertainty hyperparameters); outputs: diversification weights w* and leverage scalar f*.

## 7. Validation design
None — analytic derivations plus illustrative numerics; no backtest, no train/test split.

## 8. Exact results and baselines with numbers
No empirical numbers. Analytic results: (i) exponential utility generalizes mean-variance (identical under Gaussian returns) while staying tractable for ALD/fat-tailed returns and uncertain covariances; (ii) the GMV log-utility leverage rule produces half-Kelly-like tempering endogenously via the utility-variance penalty; (iii) binary-betting GMV (Appendix F) and power-utility Kelly (Appendix G) closed forms.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
No real-data validation; continuous-return/GBM machinery does not map 1:1 to discrete binary sports bets (the binary-betting appendix is the bridge but its results are stated, not empirically tested); the compound-distribution hyperparameters (statistical vs non-stationary noise) are free knobs with no calibration procedure on real data; myopic single-period optimization ignores multi-period hedging demands; no transaction costs, no odds-movement; the "natural explanation of half-Kelly" is qualitative (no derived f*=½ in closed form — the GMV leverage is solved numerically).

## 11. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE has no utility-based sizing: Kelly is "mentioned 12×, no paper read," and the sizing lane has no diversification×leverage separation. GSE's engine emits per-pick edges, but nothing currently separates the relative allocation across simultaneous Sunday picks (diversification) from the absolute bankroll fraction (leverage) — this paper's w*_f = f*·w* split is exactly that missing separation. Complements ledger 1744 (KellyBoost, end-to-end conditional Kelly) and 1745 (β-family for mutually exclusive outcomes): this is the utility-theoretic middle layer. The compound-distribution treatment of estimation error also dovetails with ledger 1748 (2312.10331, gambling under unknown probabilities).

## 12. Implementation specification
Build GSE's two-knob sizer: (a) diversification: per-slate weights w* from exponential-utility maximization with a compound outcome model — engine win probs as μ, bootstrap covariance of pick residuals as Σ, inverse-gamma marginalization for covariance uncertainty (per Appendix E's observation that the conditional variance posterior is wide with fat right tail); long-only + max-weight constraints via convex optimizer; (b) leverage: scalar f* from GMV log-utility on the bankroll GBM fitted to the diversified portfolio's drift/vol, λ tuned on walk-forward; (c) final stakes w*_f = f*·w* × bankroll. Start from the binary-betting Appendix F formulation for spread/moneyline/total picks. Effort: ~2 days (convex objective + GBM-leverage grid + walk-forward harness).

## 13. Reproducible test
Dataset: 2023–2025 NFL weekly slates with engine edges and closing odds; y = realized net ROI per unit. Compute w* (exponential utility, compound covariance) and f* (GMV log-utility) on expanding walk-forward, frozen hyperparameters. Baselines: (1) full-Kelly independent stakes; (2) half-Kelly independent stakes; (3) 1744-style KellyBoost portfolio. Metrics: terminal log growth, max drawdown, and the empirical ratio f*/f_Kelly (does GMV actually land near ½?).

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the two-knob sizer if it beats half-Kelly independent staking on terminal log growth with max drawdown ≤ half-Kelly's over 2023–2025, AND the fitted GMV leverage ratio f*/f_Kelly falls in [0.3, 0.7] consistently (validating the "natural half-Kelly" claim on sports data); REJECT otherwise. Improvement experiment: make λ (utility-variance penalty) state-dependent — scale λ up when the engine's recent calibration error (ECE) is high — so leverage auto-tempers when probabilities are unreliable; test whether adaptive-λ beats fixed-λ on drawdown-adjusted growth. This turns the static half-Kelly rule into a calibration-aware dial.

**Verdict:** ADAPT — the diversification×leverage separation with compound uncertainty and the GMV half-Kelly explanation are the right architecture for GSE's sizer, but the binary-outcome mapping and λ calibration need empirical work the paper doesn't do.
