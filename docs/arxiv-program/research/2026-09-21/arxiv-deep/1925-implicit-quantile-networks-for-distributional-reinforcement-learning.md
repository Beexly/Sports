# [1925] Implicit Quantile Networks for Distributional Reinforcement Learning (arXiv:1806.06923)

**Citation:** Will Dabney, Georg Ostrovski, David Silver, Rémi Munos (2018). *Implicit Quantile Networks for Distributional Reinforcement Learning*. arXiv:1806.06923. URL: https://arxiv.org/abs/1806.06923
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Can distributional RL be made fully general — approximating the *entire quantile function* of the return distribution rather than a fixed discrete support (C51) or fixed quantile locations (QR-DQN)? And does the resulting implicit distribution enable genuinely risk-sensitive policies (beyond mean-maximization) via distortion risk measures? The paper introduces IQN and tests both SOTA Atari performance and risk-sensitive policy behavior.

## 2. Dataset / schema
ALE Atari-57 (same protocol as C51/QR-DQN: 200M frames, 30 random no-op starts; plus human-starts evaluation). Six-game subset (incl. Asterix, Assault, QBert, Space Invaders) for risk-sensitivity experiments. No external dataset; ALE public.

## 3. Method / model
**IQN.** Model the state-action quantile function as a deterministic map from (state, action, τ∼U([0,1])) to quantile value Z_τ(x,a)=F^{−1}_Z(τ); τ samples reparameterize a base distribution into return-distribution samples. Architecture: DQN conv features ⊙ elementwise-multiplied with a τ-embedding (embedding dim n=64; cosine embedding φ_j(τ)=ReLU(Σ_i cos(πiτ)w_{ij}+b_j) chosen after ablations over concatenation/residual variants). Training: sample N=32 τ and N′=32 τ′ per update; pairwise TD-errors δ_{ij}=r+γZ_{τ′_j}(x′,π(x′))−Z_{τ_i}(x,a); minimize quantile Huber loss ρ^κ_τ(δ_{ij})=|τ−1{δ_{ij}<0}|·ℒ_κ(δ_{ij})/κ with κ threshold. Greedy policy normally on the mean (average of K=32 quantile samples), but risk-sensitive policies maximize *distorted* expectations: CVaR(η), Wang distortion, cumulative probability weighting (CPW, from prospect theory).

## 4. Equations & assumptions
- p-Wasserstein: W_p(U,V)=(∫_0^1 |F_U^{−1}(ω)−F_V^{−1}(ω)|^p dω)^{1/p}.
- QR-DQN (background): Z_θ(x,a)=1/N Σ_i δ_{θ_i(x,a)}, quantile targets τ̂_i=(τ_{i−1}+τ_i)/2, τ_i=i/N; Dabney et al. 2018 showed the projected distributional Bellman operator is a contraction in the ∞-Wasserstein metric (closes the C51 theory-practice gap; Rowland et al. 2018 concurrently showed categorical = contraction in Cramér/L2-on-CDF distance).
- Quantile Huber loss: ρ^κ_τ(δ)=|τ−1{δ<0}|·ℒ_κ(δ)/κ, ℒ_κ(δ)=½δ² if |δ|≤κ else κ(|δ|−½κ).
- Risk-sensitive action selection: π_β(x)=argmax_a E_{τ∼β}[Z_τ(x,a)] for distortion β (CVaR, Wang, CPW are special cases; Yaari 1987 duality between utility and distortion approaches cited).
- Assumptions: bounded returns (Huber κ handles scale); τ∼U([0,1]) base; risk-sensitive evaluation keeps the *training* objective mean-based while only the *policy* is distorted.

## 5. Features / target
Input: Atari frame stacks + sampled quantile fractions τ. Target: quantile values of the return distribution at τ (pairwise TD-errors vs Bellman target quantiles). Horizon: discounted infinite-horizon (γ=0.99).

## 6. Validation design
Time-ordered online ALE training. Baselines: DQN, Prioritized DQN, C51, QR-DQN, Rainbow (numbers from their papers; seeds: IQN 5, QR-DQN 3, Rainbow 2). Metrics: human-normalized mean/median over 57 games (best per-game under 30 no-op starts); human-starts median. Risk experiments: 6 games, same training, policy-only distortion (CVaR(0.1), CVaR more/less averse, Wang(0.5/1.5), CPW), evaluated under the standard risk-neutral score. Ablations: τ-embedding form, N/N′ sample counts, cosine vs other embeddings.

## 7. Numerical results / baselines
- Atari-57, 30 no-op starts (Table 1; mean / median / human-gap): DQN 228%/79%/0.334; Prioritized 434%/124%/0.178; C51 701%/178%/0.152; Rainbow 1189%/230%/0.144 (2 seeds); QR-DQN 864%/193%/0.165 (3 seeds); **IQN 1019%/218%/0.141** (5 seeds). "At 100 million frames IQN has reached the same level of performance as QR-DQN at 200 million frames."
- Human-starts: IQN 162% median vs Rainbow 153%.
- Risk-sensitive policies (6 games, Figure 3): risk-averse policies improve over risk-neutral IQN on Asterix and Assault ("very significant advantage"); CVaR(0.1) loses some performance on QBert and Space Invaders; risk-seeking Wang(1.5) "significantly underperforms the risk-neutral policy on three of the six games"; CPW ≈ risk-neutral. Authors: "It remains an open question as to exactly why we see improved performance for risk-averse policies" (hypothesis: risk-aversion ≈ stay-alive heuristic).

## 8. Code / data availability
None stated in the paper (no code URL in text). ALE public.

## 9. Leakage & limitations
- Risk-aversion gains are environment-dependent (helps Asterix/Assault, hurts QBert/Space Invaders) — distortion choice needs validation per domain; no theory for when risk-aversion helps.
- The τ-embedding/cosine form was selected after ablations on the same 6 games — mild selection bias.
- Quantile crossing is not explicitly prevented (monotonicity of learned Z_τ not enforced).
- 200M-frame ALE training is far from GSE's data regime (thousands of weekly slates, not millions of frames) — sample efficiency claims transfer only qualitatively.
- Policy distortion is applied post-hoc; training still maximizes the mean.

## 10. GSE overlap
Extends ledger 1922 (C51): IQN removes the fixed [V_min,V_max] support problem (returns clipped in C51) — important because weekly betting ROI has heavy tails that a fixed support mishandles. Repo has no quantile-function critics and no distortion-risk-measure decision rules; calibration lane (CQR) estimates quantiles of *outcomes*, not of *returns under a policy* — different object. Extension, not duplicate.

## 11. GSE implementation spec
1. Offline dataset as in ledger 1923 (weekly slate states, discrete stake actions, settled unit profit rewards).
2. Critic: IQN head — MLP(state)→features, cosine τ-embedding (dim 64), elementwise product, quantile-value output; train with quantile Huber loss (κ=1) on N=N′=32 sampled τ pairs per minibatch.
3. Decision rule: stake a*=argmax_a E_{τ∼β}[Z_τ(s,a)] with β = CVaR(0.25) distortion for normal weeks; this directly maximizes worst-quartile weekly return — a drawdown-aware Kelly alternative.
4. Add CQL penalty (ledger 1923) on the quantile outputs to keep offline pessimism.
5. Serving: same weekly batch job; outputs per-bet stake + full quantile curve of weekly P&L for the public write-up ("our model prices the 25th percentile of this slate at −3.2u"). Effort: ~3 weeks (builds on the 1923 pipeline).

## 12. Reproducible test
Dataset: GSE logged picks 2021–2024 (train 2021–2023, test 2024). Baselines: C51-critic policy (1922), scalar-CQL policy (1923), fractional-Kelly. Metrics: 2024 ROI, max drawdown, and CVaR_0.25 of weekly returns (the distortion target itself). Diagnostic: quantile calibration of Z_τ on holdout (predicted vs empirical quantiles, ECE ≤ 0.05).

## 13. Acceptance / rejection gate
ADOPT iff the CVaR(0.25)-policy beats the mean-policy (scalar CQL) on 2024 max drawdown by ≥1.0u with ROI no worse than −1pp vs the mean policy, AND quantile calibration ECE ≤ 0.05; if calibration fails, REJECT the critic but keep the distortion-rule idea for the 1922 C51 head.

## 14. Improvement experiment
Train the quantile function with the distortion *inside* the Bellman update (distorted Bellman operator: apply β to the target quantiles before the quantile-regression step) rather than only at policy time. Tests whether risk-aversion learned end-to-end beats post-hoc policy distortion — the paper flags this as open ("risk-sensitive training" showed qualitative but inconsistent effects), and GSE's drawdown constraint makes it the decisive variant.
