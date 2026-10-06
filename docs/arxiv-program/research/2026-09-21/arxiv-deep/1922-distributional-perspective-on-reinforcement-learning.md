# [1922] A Distributional Perspective on Reinforcement Learning (arXiv:1707.06887)

**Citation:** Marc G. Bellemare, Will Dabney, Rémi Munos (2017). *A Distributional Perspective on Reinforcement Learning*. arXiv:1707.06887. URL: https://arxiv.org/abs/1707.06887
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Can RL be improved by modeling the full distribution of the random return (the "value distribution") rather than only its expectation? The paper asks (a) what theoretical behavior the distributional Bellman operators have in policy evaluation vs control, and (b) whether an algorithm that applies Bellman's equation to approximate value distributions beats expectation-only deep RL on Atari. One paragraph: the authors argue that expectation-only RL discards the intrinsic randomness (state aliasing, nonstationary policies, approximation error) that an approximate distribution can capture and exploit, and they design the Categorical DQN (C51) algorithm to test this.

## 2. Dataset / schema
Arcade Learning Environment (ALE; Bellemare et al. 2013), 57 Atari 2600 games. Protocol: 5 training games for hyperparameter selection (e.g., Seaquest, Asterix, Pong, Venture, Private Eye mentioned), 52 testing games. Agent trained with the standard DQN preprocessing (84×84 grayscale frames, 4-frame stacks); evaluation = best evaluation score during training, plus 3-seed averages. No external dataset download; ALE is public (github.com/mgbellemare/Arcade-Learning-Environment).

## 3. Method / model
**Categorical DQN (C51).** Replaces DQN's scalar Q-output with a discrete distribution over N=51 atoms: support z_i = V_min + i·Δz, i=0..N−1, Δz=(V_max−V_min)/(N−1), with V_max=−V_min=10 chosen from preliminary experiments. Network outputs atom probabilities p_i(x,a)=softmax(θ_i(x,a)). Learning: compute the sample Bellman update T̂z_j = r+γz_j for each atom, project each updated atom onto the fixed support by distributing its probability p_j(x′,π(x′)) to the two immediate neighbors (categorical projection Φ), then minimize cross-entropy ℒ_{x,a}(θ) between the projected target distribution ΦT̂Z_θ and the network's distribution. Greedy policy π is w.r.t. E[Z_θ]. Implementation: DQN CNN architecture, same replay/ε-greedy recipe; TensorFlow implementation trains at ~75% of DQN speed for N=51.

## 4. Equations & assumptions
- Distributional Bellman operator (policy evaluation): TZ(x,a) =^D R(x,a) + γ Z(X′,A′), equality in distribution.
- Policy-evaluation distributional Bellman operator is a contraction in a maximal form of the Wasserstein metric (d_p). The same operator is NOT a contraction in total variation, KL divergence, or Kolmogorov distance (proved; Prop/section 3).
- Control (optimality) distributional Bellman operator: contraction in expected value (matches classic result) but NOT a contraction in any metric over distributions — distributional instability in control is exposed theoretically.
- Categorical parametrization: Z_θ(x,a) = z_i w.p. p_i(x,a) := exp(θ_i(x,a))/Σ_j exp(θ_j(x,a)).
- Projected update component i (Eq 7): (ΦT̂Z_θ(x,a))_i = Σ_{j=0}^{N−1} [1 − |[T̂z_j]^{V_max}_{V_min} − z_i|/Δz]_0^1 · p_j(x′,π(x′)), where [·] clips to [V_min,V_max] and [·]_0^1 clips to [0,1].
- Loss: cross-entropy between ΦT̂Z_θ(x,a) and Z_θ(x,a); greedy action selection uses E[Z_θ].
- Assumptions: finite-horizon/distributional Bellman recursions assume bounded rewards and γ<1; categorical projection assumes returns lie in [V_min,V_max] (clipped); algorithm is on the optimality operator, whose distributional dynamics the theory does NOT guarantee to be stable (instability flagged as open).

## 5. Features / target
Input: Atari frame stacks (state). Output: full return distribution per (state, action): 51 probabilities over fixed return atoms. Target: the projected distributional Bellman target (sample-based). Horizon: infinite-horizon discounted (γ=0.99 standard for ALE).

## 6. Validation design
Time-ordered by construction (online ALE training). Splits: 5 training games for model selection; 52 held-out games. Baselines: DQN (ε=0.01), Double DQN, Dueling architecture, Prioritized Replay, Prioritized Dueling, UNREAL — comparing best evaluation score during training. Metrics: human-normalized scores (Nair et al. 2015 baseline), mean and median over 57 games; counts of games beating human baseline and beating DQN. Additional stochastic-execution ALE variant (action rejected w.p. p=0.25). Ablation: number of atoms (incl. 1-parameter Bernoulli variant) over 5M frames on training games.

## 7. Numerical results / baselines
(All quoted from §5, Figures 3/5/6/7; columns = mean %human, median %human, games > human baseline, games > DQN, over 57 games.)
- C51 (ε=0.01): **mean 701%, median 178%, 40 games > human baseline, 50 games > DQN.**
- DQN: 307%, 118%, 33, 43. Double DQN: 307%, 118%, 33, 43 (row labeled "ddqn" in table). Dueling: 373%, 151%, 37, 50. Prioritized: 434%, 124%, 39, 48. Prioritized Dueling: 592%, 172%, 39, 44. UNREAL: 880%, 250%, (counts not reported).
- Within 50M frames, C51 outperformed a fully trained (200M-frame) DQN on **45 of 57 games** (3-seed average comparison; "the full 200 million training frames ... are unnecessary for evaluating RL algorithms within the ALE").
- Atom ablation (5 training games, 5M frames, ε=0.05): more atoms always increase performance; 51-atom version beats DQN in all 5 games; Seaquest reaches state-of-the-art; even the 1-parameter Bernoulli variant beats DQN in 3/5 games and is more robust in Asterix.
- Sparse-reward games (Venture, Private Eye): strong performance — value distributions propagate rarely occurring events better.
- Pong: learned distribution is bimodal, reflecting intrinsic unobservable randomness of reward timing.
- Stochastic-execution variant: "C51 obtains mean and median score improvements" on a scale normalized w.r.t. random and DQN agents (exact percentages garbled in ar5iv conversion; direction favors C51, DQN "mostly robust" with a few degraded games).

## 8. Code / data availability
None stated in the paper (no code URL in text). ALE is public; authors note TensorFlow implementation trains at ~75% of DQN speed.

## 9. Leakage & limitations
- Theory: the distributional *optimality* operator is not a contraction in any distribution metric — the control setting C51 actually uses has no convergence guarantee (paper is explicit; stability is empirical).
- [V_min,V_max]=[−10,10] chosen from preliminary experiments on the 5 training games — mild selection; returns outside the range are clipped, which can bias tail estimates.
- Results use best-evaluation-score (not final) reporting for the main table, which favors lucky seeds (partially mitigated by the 3-seed average comparison).
- ALE stochasticity is largely from state aliasing/nonstationarity, not true environment noise; transfer to noisy real-world logs is plausible but unproven.
- Distribution modeling doubles+ compute vs DQN and adds the 51-atom hyperparameter.

## 10. GSE overlap
Repo coverage: distributional/quantile methods are thin — existing-research-map.md shows calibration stack (CQR, grouping loss, temperature scaling, Clopper-Pearson) and expected-value engines (EPA, DVOA), but no distributional critic / return-distribution modeling for decisions, and Kelly is "mentioned 12×, no paper read." C51 is extension, not duplicate: it gives the critic that outputs P(ROI < −x) and CVaR directly, which the calibration lane currently approximates post-hoc.

## 11. GSE implementation spec
1. Frame weekly slate selection as episodic RL: state = slate features (edge, CLV, market consensus, bankroll, week), action = discrete stake bucket per selected bet (0, 0.25u, 0.5u, 1u, 2u Kelly-fraction), reward = realized profit in units at settlement, γ≈0.99.
2. Train offline: logged GSE picks + odds API market prices (2019–2026 seasons) as the fixed dataset; behavior policy = historical staking rule.
3. Critic: categorical distributional head (N=51 atoms over weekly-ROI support, e.g., V∈[−50u, +50u]) on a small MLP; loss = cross-entropy vs projected Bellman target (Eq 7). Add CQL-style conservative regularizer (see ledger 1923) to suppress OOD stake optimism.
4. Policy: greedy w.r.t. a risk-adjusted statistic of the distribution (e.g., maximize CVaR_0.2 or mean − λ·std), which directly encodes drawdown aversion.
5. Serving: critic scores each candidate bet's stake bucket; policy picks stake maximizing CVaR-adjusted return under a per-week exposure cap. Effort: ~2–3 weeks for offline prototype (PyTorch), evaluation on 2022–2024 backtest.

## 12. Reproducible test
Dataset: GSE logged picks + closing odds, NFL 2022–2024 (3 seasons). Baseline: fractional-Kelly (f=0.25) staking on the same picks. Metric: backtested ROI (units won/units staked) and max drawdown. Protocol: train critic on 2022–2023, select stakes for 2024 slates weekly from the learned policy, settle at closing lines. Runnable with existing odds/pick logs.

## 13. Acceptance / rejection gate
ADOPT for the staking module iff on the 2024 holdout the distributional policy beats fractional-Kelly ROI by ≥2pp AND max drawdown is no worse than the Kelly baseline (within 0.5u); otherwise REJECT the module but keep the distributional critic as a risk-reporting tool iff its predicted P(weekly loss > 5u) is calibrated (ECE ≤ 0.05 on 2024).

## 14. Improvement experiment
Replace the fixed categorical support with learned quantile locations (IQN-style, ledger 1925) and train the critic with a CVaR-penalized Bellman objective (risk-sensitive distributional RL): minimize E[loss] + λ·CVaR_α of the TD error, so tail risk is optimized during training rather than applied post-hoc at decision time. Hypothesis: directly optimizing the tail beats post-hoc CVaR filtering of a mean-trained critic, especially in short NFL seasons where tail events dominate realized drawdown.
