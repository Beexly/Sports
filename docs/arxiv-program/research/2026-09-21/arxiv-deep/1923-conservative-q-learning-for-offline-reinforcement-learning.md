# [1923] Conservative Q-Learning for Offline Reinforcement Learning (arXiv:2006.04779)

**Citation:** Aviral Kumar, Aurick Zhou, George Tucker, Sergey Levine (2020). *Conservative Q-Learning for Offline Reinforcement Learning*. arXiv:2006.04779. URL: https://arxiv.org/abs/2006.04779
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADOPT

## 1. Research question
How can value-based off-policy RL be made to work from a fixed offline dataset without environment interaction? Direct use of off-policy algorithms fails from distributional shift (bootstrapping on out-of-distribution actions) and overfitting, manifesting as erroneously optimistic value estimates. The paper proposes learning a *conservative* (lower-bound) Q-function by regularizing Q-values during training — minimizing Q under an adversarial action distribution while maximizing it on the data distribution — and proves the learned values lower-bound true policy values.

## 2. Dataset / schema
D4RL benchmark (Fu et al. 2020): (a) Gym MuJoCo locomotion (HalfCheetah/Hopper/Walker2d) datasets of types -random/-medium/-expert/-mixed/-medium-expert/-random-expert; (b) Adroit 24-DoF robotic hand with limited human-demonstration data; (c) AntMaze (U/medium/large mazes, compose suboptimal trajectories); (d) Franka Kitchen (9-DoF, sparse 0-1 completion reward per object); (e) offline image-based Atari (dataset released by authors of the 1%/10% DQN-replay study). Schema: (s,a,r,s′) tuples from behavior policies. D4RL is public (github.com/rail-berkeley/d4rl).

## 3. Method / model
**CQL(ℛ) family.** Generic modification of value-based RL (works for Q-learning or actor-critic): min_Q max_μ α·(E_{s∼D,a∼μ(a|s)}[Q(s,a)] − E_{s∼D,a∼π̂_β(a|s)}[Q(s,a)]) + ½·E_{s,a,s′∼D}[(Q − B̂^{π_k}Q̂^k)²] + ℛ(μ). The first term pushes down Q on actions from an adversarial distribution μ while pushing up Q on actions actually seen in the data; the second is the standard Bellman error.
Two instances evaluated:
- **CQL(ℋ)**: ℛ(μ)=−D_KL(μ,ρ) with ρ=Unif(a) ⇒ first term becomes α·E_{s∼D}[log Σ_a exp Q(s,a) − E_{a∼π̂_β}[Q(s,a)]] (Eq 4). Practical, ~20 lines of code on top of SAC/DQN.
- **CQL(ρ)** with ρ=π̂^{k−1} (previous policy): exponential weighted average of Q-values; more stable in high-dimensional action spaces where log-sum-exp estimation has high variance.
Policy improvement: greedy/actor update against the conservative Q. Theory: only the *expected* value under the policy is lower-bounded (not pointwise), avoiding extra under-estimation.

## 4. Equations & assumptions
- CQL(ℛ) objective (Eq 3): min_Q max_μ α(E_{s∼D,a∼μ(a|s)}[Q(s,a)] − E_{s∼D,a∼π̂_β(a|s)}[Q(s,a)]) + ½E_{s,a,s′∼D}[(Q(s,a) − B̂^{π_k}Q̂^k(s,a))²] + ℛ(μ).
- CQL(ℋ) (Eq 4): min_Q αE_{s∼D}[logΣ_a exp(Q(s,a)) − E_{a∼π̂_β(a|s)}[Q(s,a)]] + ½E_{s,a,s′∼D}[(Q − B̂^{π_k}Q̂^k)²].
- Theorem 3.3 (CQL learns lower-bounded Q-values): under mild regularity (slow policy updates), the expected Q under policy π^k lower-bounds the true policy value; with sampling error the bound includes a sampling-error penalty that decays with more data. CQL optimizes the return of the policy in the empirical MDP with a penalty, and performs high-confidence safe policy improvement over the behavior policy.
- Appendix A: additional variant connected to distributionally robust optimization.
- Assumptions: rewards bounded; dataset D fixed with empirical behavior policy π̂_β; tabular/linear results in the appendix assume concentrability-style coverage of the behavior policy; deep-RL instantiation is heuristic but the lower-bound property is verified empirically (predicted V̂^k vs actual discounted return).

## 5. Features / target
Input: environment states (proprioceptive vectors, Adroit hand states, Atari pixels, kitchen states). Target: conservative action-value Q(s,a) for the current policy; policy output = action maximizing (or actor trained against) the conservative Q. Horizon: infinite-horizon discounted.

## 6. Validation design
Benchmark-based (D4RL), not time-ordered (MDP episodes, i.i.d. dataset assumption). Baselines: BEAR, BRAC, SAC, BC (behavioral cloning), REM, QR-DQN (numbers for some baselines from Fu et al. 2020a). Metrics: normalized return (D4RL scale, 4 seeds); Adroit/kitchen success; Atari offline with 1% and 10% of DQN replay data. Also a direct lower-bound verification: compare E_{s∼D}[V̂^k(s)] against the true discounted return of π^k.

## 7. Numerical results / baselines
- Gym D4RL (Table 1, normalized return, 4 seeds): on single-policy datasets (-random/-expert/-medium) CQL roughly matches or exceeds the best prior method by a small margin; on multi-policy/complex datasets (-mixed, -medium-expert, -random-expert) CQL outperforms prior methods "by large margins, sometimes as much as 2-3x."
- Adroit (Table 2): CQL variants are the only methods that improve over BC, "attaining scores that are 2-9x those of the next best offline RL method"; CQL(ρ) with ρ=π̂^{k−1} more stable than CQL(ℋ) on high-dim action tasks.
- AntMaze: prior methods make some progress on U-maze; "only CQL is able to make meaningful progress on the much harder medium and large mazes," and CQL is "the only method that attains non-zero returns" on the harder mazes.
- Franka Kitchen: CQL "outperforms prior methods ... and is the only method that outperforms behavioral cloning, attaining over 40% success rate on all tasks."
- Offline Atari (Table 3, 1% data): CQL "drastically outperforms" REM and QR-DQN, "achieving 36x and 6x times the return of the best prior method on Q*bert and Breakout, respectively"; with 10% data CQL "usually attains better performance."
- Lower-bound check (Table 4 in paper): predicted values V̂^k lie below actual returns, verifying Theorems 3.2/D.1 empirically (exact margins in appendix tables).

## 8. Code / data availability
No direct code URL stated in the paper (datasets: D4RL public; kitchen tasks wiki linked; rlkit linked for baselines). Authors state CQL needs "less than 20 lines of code on top of a number of standard, online RL algorithms."

## 9. Leakage & limitations
- No temporal train/test issue for MDP benchmarks, but for GSE the "dataset" is nonstationary across seasons (market efficiency drifts) — behavior-policy coverage assumptions are weaker.
- CQL is conservative by design: on datasets where the behavior policy is already near-optimal it can underperform less-regularized methods (small margins on -expert datasets hint at this).
- The lower-bound guarantee is on expected value under the learned policy; individual (s,a) values can still be misestimated — tail-risk decisions need the distributional layer (ledger 1922), not CQL alone.
- α (conservatism weight) is a sensitive hyperparameter; paper gives limited guidance beyond ablations.
- log Σ_a exp Q requires sampling in continuous action spaces (variance issue that motivates the CQL(ρ) variant).

## 10. GSE overlap
Direct hit on gap #4 (RL/bandits for pick selection — "no papers read") and complements gap #1 (Kelly, "no paper read"): repo has Kelly mentioned 12× but no offline-RL staking work. GSE's engine produces logged picks with market prices — exactly the offline setting. No existing repo work learns a policy from logged picks; current staking is heuristic fractional-Kelly. CQL is new capability, not duplicate.

## 11. GSE implementation spec
1. Build offline dataset D: each row = (state, action, reward, next_state) where state = slate context (week, bankroll, edges, CLV, market features), action = discrete stake (0 / 0.25u / 0.5u / 1u / 2u) actually placed by the historical rule, reward = settled profit in units, next_state = following week's context.
2. Train CQL(ℋ): small MLP Q-network (state+action → value), α tuned on 2022–2023 via held-out Bellman error + lower-bound diagnostics; discrete action space makes logΣ_a exp Q exact (no sampling variance).
3. Policy: greedy argmax over the conservative Q under a per-week max-exposure cap; abstention allowed (action 0) — this is the learned "don't bet" behavior.
4. Guardrail: only deploy stakes the policy assigns on states within the training distribution (add a simple density/OOD check); fallback to fractional-Kelly outside.
5. Serving: weekly batch job scores the slate; outputs stake per bet + the conservative expected value as the public "confidence" number. Effort: ~2 weeks (data pipeline exists; model is <20 lines over a DQN loop).

## 12. Reproducible test
Dataset: GSE logged picks + closing odds, NFL 2021–2024. Train on 2021–2023, evaluate 2024 weekly: the CQL policy selects stakes (or abstains) on the engine's actual 2024 pick set. Baselines: (a) historical flat/fractional-Kelly staking, (b) plain DQN trained on the same data (expected to overbet OOD). Metrics: ROI in units, max drawdown, % of weeks with positive return, and lower-bound diagnostic E[V̂] ≤ realized return.

## 13. Acceptance / rejection gate
ADOPT iff on 2024 holdout the CQL policy beats the fractional-Kelly baseline by ≥2pp ROI with max drawdown no worse than baseline (within 0.5u) AND the empirical lower-bound diagnostic holds (predicted value ≤ realized return on ≥90% of weeks); if the lower-bound diagnostic fails, REJECT (the safety property is the whole point).

## 14. Improvement experiment
CQL + distributional critic (C51 head, ledger 1922): apply the CQL conservative penalty to each atom of the return distribution instead of to a scalar Q, yielding a conservative *distribution* — then optimize CVaR_0.2 of the conservative distribution for stake selection. This combines provable pessimism (CQL) with explicit tail-risk control (distributional), and tests whether conservatism-in-distribution beats conservatism-in-expectation on max drawdown.
