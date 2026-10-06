# [1926] Distributional Reinforcement Learning with Quantile Regression (arXiv:1710.10044)

**Citation:** Will Dabney, Mark Rowland, Marc G. Bellemare, Rémi Munos (2018). *Distributional Reinforcement Learning with Quantile Regression*. arXiv:1710.10044. URL: https://arxiv.org/abs/1710.10044
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
C51's categorical projection minimizes the Cramér distance, not the Wasserstein metric in which the distributional Bellman operator is a contraction — and Theorem 1 shows the Wasserstein metric cannot in general be minimized by SGD on samples. The paper asks: is there a practical algorithm that closes this theory-practice gap, i.e., minimizes a Wasserstein distance to the distributional Bellman target with stochastic gradients? Answer: quantile regression at fixed quantile midpoints.

## 2. Dataset / schema
ALE Atari-57, 200M frames, best-agent protocol (evaluate 500K frames every 1M training frames, ε=0.001, up to 30 random no-ops). Baselines: C51, DQN, Double DQN, Prioritized Replay, Dueling. ALE public.

## 3. Method / model
**QR-DQN.** Approximate the return distribution by a uniform mixture of N Diracs: Z_θ(x,a)=1/N Σ_{i=1}^N δ_{θ_i(x,a)}, where each location θ_i is trained to estimate a fixed quantile τ̂_i=(τ_{i−1}+τ_i)/2, τ_i=i/N. Loss: quantile Huber loss ρ^κ_τ(δ)=|τ−1{δ<0}|·ℒ_κ(δ)/κ on pairwise TD-errors δ_{ij}=r+γθ_j(x′,π(x′))−θ_i(x,a), with κ the Huber threshold. Experiments use N=200 quantiles. The quantile locations adapt automatically to minimize the 1-Wasserstein distance between the Bellman-updated and current return distributions — no [V_min,V_max] support needed, unlike C51.

## 4. Equations & assumptions
- Theorem 1: for an empirical distribution Ŷ_m from Bernoulli samples, argmin_μ E[W_p(Ŷ_m,B_μ)] ≠ argmin_μ W_p(B,B_μ) in general — the Wasserstein metric cannot be minimized via sample gradients (motivates quantile regression instead).
- Quantile projection Π_{W1}: projects a distribution onto N fixed quantile midpoints.
- Proposition 2: the combined operator Π_{W1}T^π is a γ-contraction in d̄_∞ (maximal ∞-Wasserstein metric): d̄_∞(Π_{W1}T^πZ_1, Π_{W1}T^πZ_2) ≤ γ d̄_∞(Z_1,Z_2) for countable state/action MDPs.
- Loss: Σ_{i,j} ρ^κ_{τ̂_i}(r + γθ_j(x′,a*) − θ_i(x,a)), κ Huber threshold.
- Assumptions: countable state/action spaces for the contraction proof; deep-RL instantiation inherits the usual approximation caveats; quantile crossing not explicitly prevented.

## 5. Features / target
Input: Atari frame stacks. Target: N=200 quantile values of the state-action return distribution (pairwise quantile-regression TD-errors). Horizon: discounted infinite-horizon.

## 6. Validation design
Time-ordered ALE training. Best-agent protocol (best evaluation score over training, 200M frames) + online performance protocol (no early stopping; score distribution at 10th–50th percentiles across games; training curves averaged over 3 seeds). Baselines: C51, DQN, Double DQN, Prioritized, Dueling.

## 7. Numerical results / baselines
- Table 1 (best-agent, 57 games; mean / median / games>human / games>DQN): **QR-DQN 915% / 211% / 41 / 54** vs C51 701%/178%/40/50 — "qr-dqn outperforms all previous agents in mean and median human-normalized score."
- Online protocol (Figure 4): QR-DQN "gives similar improvements to sample complexity as prioritized replay, while also improving final performance."
- Sobering note: "Even at 200 million frames, there are 10% of games where all algorithms reach less than 10% of human" — advances remain limited on a hard subset.
- Authors note QR-DQN likely suffers Double-DQN-style overestimation bias (shared loss/Bellman-operator structure) — combining with Double DQN is suggested future work.

## 8. Code / data availability
None stated in the paper. ALE public.

## 9. Leakage & limitations
- Fixed quantile *fractions* (midpoints) with learned locations: better than C51's fixed support, but still a finite approximation; IQN (ledger 1925) generalizes it.
- Best-agent (peak) reporting inflates vs final-policy performance; online-protocol results partially mitigate.
- Overestimation bias unaddressed (flagged by authors).
- No risk-sensitive policy experiments (that's IQN's contribution); the paper only notes the richer policy class as future work.
- 200M-frame regime; transfer to GSE's small-data regime is qualitative.

## 10. GSE overlap
Sits between ledgers 1922 (C51) and 1925 (IQN) in the same family: the simplest distributional critic without a fixed return support. No repo overlap (no quantile critics anywhere in the corpus). For GSE's small-data offline setting, QR-DQN's N fixed quantiles with the Huber loss is the most implementation-friendly of the three distributional heads.

## 11. GSE implementation spec
1. Same offline weekly-slate dataset as ledgers 1923/1925 (discrete stake actions 0/0.25/0.5/1/2u, settled unit-profit rewards).
2. Critic: MLP(state) → N=50 quantile locations per stake action; train with quantile Huber loss (κ=1) on pairwise TD-errors; add the CQL log-sum-exp penalty (ledger 1923) on the quantile means for offline pessimism.
3. Policy: greedy on the mean of quantiles, with a CVaR_0.25 variant for drawdown-aware weeks (bridge to ledger 1925's distortion idea without the τ-embedding complexity).
4. Serving: weekly batch; outputs stake + inter-quantile range as the uncertainty bar for write-ups. Effort: ~1.5 weeks — simplest of the distributional heads.

## 12. Reproducible test
Dataset: GSE logged picks 2021–2024 (train 2021–2023, test 2024). Baselines: scalar-CQL (1923), C51-head (1922), IQN-head (1925), fractional-Kelly. Metrics: 2024 ROI, max drawdown, quantile calibration ECE on holdout, and training stability (variance of weekly ROI across 3 seeds — the paper's online-protocol lesson).

## 13. Acceptance / rejection gate
ADOPT as the default distributional head iff on 2024 it matches the best of the C51/IQN heads on ROI (within 1pp) with the lowest seed-variance of the three AND quantile ECE ≤ 0.05; otherwise keep whichever head wins and drop QR-DQN.

## 14. Improvement experiment
Combine QR-DQN with Double-DQN-style de-biasing (the authors' own suggested next step): use the online network for action selection and the target network's quantiles for evaluation in the TD target. In the offline betting setting, overestimation of rarely-tried stake sizes is the dominant failure mode, so test whether double-quantile targets reduce OOD stake optimism beyond what the CQL penalty alone achieves.
