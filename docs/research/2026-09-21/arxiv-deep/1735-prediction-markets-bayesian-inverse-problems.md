# [1735] Prediction Markets as Bayesian Inverse Problems: Uncertainty Quantification, Identifiability, and Information Gain from Price–Volume Histories under Latent Types (arXiv:2601.18815)

**Citation:** Juan P. Madrigal-Cianci, Camilo Monsalve Maya, Lachlan Breakey (2026). *Prediction Markets as Bayesian Inverse Problems: Uncertainty Quantification, Identifiability, and Information Gain from Price–Volume Histories under Latent Types*. arXiv:2601.18815. URL: https://arxiv.org/abs/2601.18815
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 20,152 words).
**Verdict:** ADAPT — the inverse-problem framing (KL-projection gap δ_T identifiability, realized information gain as posterior-vs-prior KL, stability bounds on posterior odds) gives GSE a principled "is this odds-move history actually informative?" diagnostic with a quantified informed-weight threshold (ω₁ ≈ 0.15); adapt the IG metric to weight CLV signals and the identifiability check to flag steam moves driven by noise/manipulation rather than information.

## 1. Research question
What can be reliably inferred about a binary event outcome Y ∈ {0,1} from only an observed price path (market-implied probabilities p_t) and traded volumes v_t — when the mapping from outcome to price history is mediated by unobserved, heterogeneous, possibly strategic trader types? The paper formulates prediction markets as Bayesian inverse problems: it asks for (i) posterior uncertainty quantification for Y, (ii) identifiability/well-posedness criteria (when is inference even possible?), and (iii) information-theoretic metrics of how informative a market history is.

## 2. Dataset / schema
No real data. **Synthetic experiments only:** simulated price–volume histories under the paper's latent-type mixture model; horizons T ∈ {10, 25, 50, 100, 200, 500}; 1,000 replications per setting for posterior-concentration curves; informed-weight sweep for the identifiability threshold; Gaussian perturbations σ ∈ {0.01, 0.02, 0.05, 0.1, 0.2} for stability; T=600 histories for information-gain dynamics. The paper's §5 claims "synthetic and real market data" but the extracted experiments are all synthetic.

## 3. Method / model
- Observation model in log-odds space: log-odds increments Δx_t | (v_t, y) follow a latent mixture over trader types k with volume-dependent mixing weights ρ_k(v; ω, γ).
- Trader-type taxonomy (Definition 3.1): informed (drift μ₁(2y−1) toward truth, magnitude growing in volume at rate λ₁, scale shrinking in volume), uninformed/noise, and adversarial/manipulative (outcome-independent or opposing drift) types.
- Orientation constraint μ₁, μ₃ ≥ 0 as part of model spec (eliminates the (y,μ₁) ↦ (1−y,−μ₁) non-identifiability symmetry).
- Bayesian posterior P(Y=1 | h) via marginal likelihoods integrating out nuisance parameters Θ; computed by Monte Carlo + stochastic optimization (variational/bridge-sampling corrections discussed).
- Identifiability via KL-projection gap; posterior consistency (Theorem 4.3); finite-sample error bounds decaying exponentially in the gap (Proposition 4.2); stability of posterior odds under perturbations (Theorem 4.4).
- Metrics: realized information gain IG(H_t) = KL(posterior || prior); expected IG = mutual information.

## 4. Equations & assumptions
- KL-projection gap: K_T(y*→y) = inf_θ (1/T) D_KL(P_{y*,θ*}^{(T)} || P_{y,θ}^{(T)}); outcome identifiable iff δ_T(y*,θ*) > 0 (Definition 4.2); two-sided separation if the reverse projection is also bounded away from zero.
- Non-identifiability (Proposition 4.1): type-composition confounding (all active types outcome-independent), outcome–nuisance symmetry, adversarial mimicry.
- Posterior consistency (Theorem 4.3): posterior concentrates on the true outcome exponentially fast in T·δ_T under regularity.
- Finite-sample bound (Proposition 4.2): posterior error probability ≤ exp(−T·δ̂_T)-style decay in the estimated gap.
- Stability (Theorem 4.4): |log BF_T(h) − log BF_T(h′)| bounded linearly in perturbation magnitude on a high-probability truncation event E_R = {max_t |Δx_t| ≤ R}.
- Volume treated as a realized design sequence ("measurement intensity"); conditional independence of increments given (v_t, y, θ) — Assumption 3.1 abstracts away serial dependence (volatility clustering, order-flow persistence, regime switching).
- Fixed number of types K; orientation constraint μ₁, μ₃ ≥ 0.

## 5. Features / target
Features: price path p_{0:T} (as log-odds increments Δx_{1:T}), volume sequence v_{1:T}. Target: posterior P(Y=1 | H_T) on the binary outcome; secondary targets: realized IG, identifiability gap δ̂_T, stability bound. Horizon: finite T (10–600 steps in experiments).

## 6. Validation design
Synthetic-only: (i) posterior-concentration decay vs T (median log(1−π_T) over 1,000 reps, 10–90% bands, dashed slope −δ̂_T); (ii) identifiability sweep over informed weight ω₁ (accuracy = fraction assigning higher posterior to truth at T=100); (iii) stability under Gaussian perturbations vs the Theorem 4.4 bound; (iv) IG(H_t) dynamics to T=600 vs the log 2 ceiling. No real-market validation, no baseline classifier comparison.

## 7. Numerical results / baselines
- Posterior concentration: median log(1−π_T) decays linearly with slope −δ̂_T; estimated gap δ̂_T ≈ 1.5×10⁻² nats/period (weak per-step signal under low-to-moderate volumes).
- Identifiability threshold: accuracy deteriorates markedly as informed weight ω₁ falls below ≈ 0.15 — the type-composition-confounding regime.
- Stability: |Δ log BF| scales linearly in perturbation σ (bound conservative, as expected).
- Information gain: IG(H_t) rises fast early then plateaus; saturates at the log 2 ≈ 0.693 nats ceiling for a symmetric prior.
- No real-data numbers; no comparison to baseline predictors.

## 8. Code / data availability
None stated — no public code or data artifact identified.

## 9. Leakage & limitations
- Synthetic-only: the observation model is both the theory and the data-generating process — circularity risk; no real-market validation despite the §5 claim.
- Assumption 3.1 (conditional independence) rules out volatility clustering, order-flow persistence, and regime switching — "prominent in real markets" per the authors' own discussion.
- Volume as exogenous design sequence ignores endogeneity (volume is itself driven by information arrival and strategic participation).
- Fixed K types; real markets have richer heterogeneity (order-book state, signed flow, open interest, identities are all excluded by design).
- The ω₁ ≈ 0.15 threshold is model-conditional; real informed shares are unknown and time-varying.
- Computational: marginal-likelihood integration is expensive; the paper discusses approximations but gives no wall-clock numbers.

## 10. GSE overlap
Existing map: market microstructure lane (CLV, steam, beat-the-close); calibration lane (CQR, grouping loss). GSE has no formal "is this line move informative?" test — it treats all CLV equally. This paper's IG metric and identifiability gap are new capabilities: a per-game/per-move informativeness score. Complements (does not duplicate) the structural volatility model of ledger 1731 (which forecasts move *scale*; this paper scores move *information content*).

## 11. GSE implementation spec
- **IG-weighted CLV:** for each NFL game, fit a reduced log-odds mixture (informed + noise types) on The Odds API intraday price/volume-proxy path; compute realized IG(H_t) = KL(posterior || prior) at kickoff. Weight each game's CLV signal in GSE's edge aggregation by its IG — high-IG games (informed-driven moves) get full weight; low-IG games (noise/manipulation) get down-weighted.
- **Identifiability flag:** estimate the informed weight ω̂₁ per game; if ω̂₁ < 0.15, flag the game's line history as non-identifiable — do not update GSE's fair price from its moves.
- Effort: ~2 weeks (mixture fit on line history + IG computation + integration into the edge aggregator).

## 12. Reproducible test
Dataset: The Odds API NFL intraday snapshots 2024 season (consensus + move counts as volume proxy). Metric: does IG-weighting improve the CLV→outcome relationship? Baseline: unweighted CLV predicting game outcomes (log-loss). Test: IG-weighted CLV log-loss vs unweighted on 2025 holdout. Pass if IG-weighting improves log-loss by ≥2% (paired test, p < 0.05).

## 13. Acceptance / rejection gate
ADAPT is confirmed if IG-weighted CLV beats unweighted CLV on 2025 NFL holdout by ≥2% log-loss with the ω̂₁ < 0.15 flag firing on 5–30% of games (informative but not vacuous). REJECT the IG weighting if the gain is <1% or the flag never/always fires — then the synthetic-calibrated thresholds do not transfer to bookmaker odds data.

## 14. Improvement experiment
Relax Assumption 3.1: add an AR(1) term to the log-odds increments to capture order-flow persistence (steam-move autocorrelation, documented in GSE's steam tracking), and re-derive the gap with the effective sample size T_eff = T/(1+ρ)/(1−ρ). Test whether persistence-adjusted IG better predicts which steam moves continue vs reverse — hypothesis: raw IG overstates informativeness of autocorrelated moves, and the adjusted version cuts false steam-following by ≥15%.

**Verdict:** ADAPT — the inverse-problem diagnostics (KL-projection identifiability gap, realized information gain, stability bounds) give GSE a principled informativeness score for odds-move histories; adapt the IG metric to weight CLV signals and flag non-identifiable steam.
