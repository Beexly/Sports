# [1928] Distributional Reinforcement Learning with Regularized Wasserstein Loss (arXiv:2202.00769)

**Citation:** Ke Sun, Yingnan Zhao, Wulong Liu, Bei Jiang, Linglong Kong (2022). *Distributional Reinforcement Learning with Regularized Wasserstein Loss*. arXiv:2202.00769. URL: https://arxiv.org/abs/2202.00769
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Quantile-regression distributional RL (QR-DQN/IQN) cannot tractably approximate multi-dimensional Wasserstein distances, and MMD-based methods (MMD-DQN) are kernel-sensitive; can an entropically regularized Wasserstein loss (Sinkhorn divergence) give a distributional RL algorithm with contraction guarantees, stable training, and multi-dimensional reward support? The paper proposes SinkhornDRL and evaluates it on 55 Atari games plus a multi-dimensional-reward setting.

## 2. Dataset / schema
(a) 55 Atari 2600 games, 40M training frames, 3 seeds, same QR-DQN/MMD-DQN architecture (no capacity increase), human-normalized scores (HNS); (b) multi-dimensional reward setting: 6 Atari games with primitive scalar rewards decomposed into reward vectors per reward structure (Appendix M). Baselines: C51, QR-DQN, MMD-DQN. ALE public.

## 3. Method / model
**SinkhornDRL.** Represent the return distribution by samples (no pre-specified quantiles/atoms — avoids quantile-crossing issues) and minimize the Sinkhorn divergence (entropically regularized Wasserstein distance, computed via matrix-scaling/Sinkhorn iterations) between the current and Bellman-target return distributions. Sinkhorn divergence interpolates between Wasserstein distance and MMD as the entropic regularization ε varies. Hyperparameters: ε (regularization strength), L (Sinkhorn iterations), N (sample count); sensitivity analyzed on Breakout and Seaquest (Figure 3). The entropic term yields a "smoother" transport plan (maximum-entropy principle), less sensitive to noise/small perturbations, giving faster and more stable deep-RL convergence.

## 4. Equations & assumptions
- Sinkhorn divergence: entropically regularized optimal-transport divergence S_ε(μ,ν) interpolating Wasserstein (ε→0) and MMD-like behavior (ε→∞); computed with Sinkhorn matrix-scaling iterations.
- Proposition 1/2: sum-invariance and scale-sensitive properties of the divergence in the RL setting.
- Theorem 1: the Sinkhorn distributional Bellman operator is contractive under the full Sinkhorn divergence, with contraction factor Δ̄_ε(γ,α) (noted: Δ̄_ε(γ,α) > γ^α, i.e., slower contraction than MMD-DQN — explains slower early training).
- Assumptions: bounded rewards; finite-sample approximation of distributions; ε, L, N tuned per domain.

## 5. Features / target
Input: Atari frame stacks. Target: sample-based return distribution (scalar setting) or joint multi-dimensional return distribution (reward-vector setting); loss = Sinkhorn divergence to the Bellman target distribution. Horizon: discounted infinite-horizon.

## 6. Validation design
Time-ordered ALE training (40M frames, 3 seeds). Metrics: mean, median, and IQM (interquartile mean, 5%–95%) of human-normalized scores across 55 games — IQM chosen as robust to extreme per-game scores. Per-game learning curves (Appendix I, Figure 6), raw score table (Appendix J, Table 3), summary table (Appendix H, Table 2). Multi-dim: 6 games vs MMD-DQN. Sensitivity: ε, L, N ablations. Compute cost assessment.

## 7. Numerical results / baselines
- 55 Atari games (Figure 1, Table 2/3): "SinkhornDRL achieves state-of-the-art performance in terms of mean, median, and IQM (5%) of HNS across most training phases" vs C51, QR-DQN, MMD-DQN; "achieves the highest numbers of best and second-best performance of all games among all baseline algorithms" (Table 3, 3 seeds).
- Caveat: "slower convergence during the early training phase, as indicated by the Mean of HNS," explained by the weaker contraction factor (Theorem 1).
- Multi-dimensional rewards (Figure 4): "SinkhornDRL outperforms MMD-DQN in most cases for multi-dimensional reward functions" — "significantly outperforms MMD-DQN by leveraging its ability to capture richer data geometry."
- Compute: "+20% average computational cost compared with MMD-DQN"; more than C51/QR-DQN.
- Limitations (authors): extra hyperparameters to tune; "remains elusive for a deeper connection between the theoretical properties of divergences and the practical performance ... given a specific environment."

## 8. Code / data availability
Code: https://github.com/datake/SinkhornDistRL. ALE public.

## 9. Leakage & limitations
- 40M-frame (not 200M) training budget — comparisons to full-budget baselines need care, though all baselines were run at the same budget here.
- Slower early convergence is intrinsic (contraction factor); in GSE's small-data regime this could mean it never catches up — needs the head-to-head test.
- Sample-based distribution representation + Sinkhorn iterations add compute (+20% vs MMD-DQN) and two sensitive hyperparameters (ε, L).
- Multi-dim experiments are only 6 games vs one baseline (MMD-DQN).

## 10. GSE overlap
Unique in this lane: the only method handling vector-valued returns. GSE's staking decision is inherently multi-objective — weekly profit, max drawdown, and CLV are jointly determined by the stake vector, and optimizing the scalar-profit distribution alone can select stakes with bad drawdown tails. No repo work models joint outcome distributions (calibration lane is univariate). New capability, not duplicate.

## 11. GSE implementation spec
1. Define a 3-dimensional reward vector per week: r_t = (settled profit in units, −max intra-week drawdown in units, mean CLV in cents) — all computed from logged picks + odds.
2. Train SinkhornDRL critic on the offline weekly dataset (same state/action space as ledger 1923): network outputs N=32 samples of the 3-dim return vector per stake action; loss = Sinkhorn divergence (ε, L tuned on 2021–2022) to the vector Bellman target.
3. Policy: scalarize at decision time with a user-set risk price, e.g., maximize E[profit] − 2·E[drawdown] + 0.5·E[CLV] under the learned joint distribution — the risk price becomes a tunable dial on the public write-up ("this week's stakes price drawdown at 2:1").
4. Add the CQL penalty on the scalarized value for offline pessimism.
5. Effort: ~3 weeks (needs the Sinkhorn loss implementation; code repo available as reference).

## 12. Reproducible test
Dataset: GSE logged picks + odds 2021–2024 (train 2021–2023, test 2024). Baselines: scalar QR-DQN critic (1926), scalar CQL (1923). Metrics: 2024 ROI, max drawdown, mean CLV — the three objectives jointly; plus a Pareto check (does the joint policy dominate scalar policies on at least two of three metrics?).

## 13. Acceptance / rejection gate
ADOPT iff on 2024 the joint policy Pareto-dominates the best scalar policy on ≥2 of {ROI, max drawdown, CLV} with the third no worse than −5% relative; otherwise REJECT (the extra compute and tuning are not justified for a scalar-equivalent result).

## 14. Improvement experiment
Learn the risk-price (scalarization weights) itself as a contextual bandit over the season: treat λ=(λ_dd, λ_clv) as a meta-action chosen weekly from bankroll state, trained to maximize end-of-season Sharpe-like objective. Tests whether a fixed risk price is leaving money on the table vs adaptive risk pricing through the season (e.g., more drawdown-averse after a losing streak).
