# [1924] Decision Transformer: Reinforcement Learning via Sequence Modeling (arXiv:2106.01345)

**Citation:** Lili Chen, Kevin Lu, Aravind Rajeswaran, Kimin Lee, Aditya Grover, Michael Laskin, Pieter Abbeel, Aravind Srinivas, Igor Mordatch (2021). *Decision Transformer: Reinforcement Learning via Sequence Modeling*. arXiv:2106.01345. URL: https://arxiv.org/abs/2106.01345
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Can RL be reduced to conditional sequence modeling, avoiding value functions and policy gradients entirely? The paper casts RL as autoregressively modeling trajectories of (return-to-go, state, action) with a causally masked Transformer (GPT), so that at test time one conditions on a *desired return* plus history and the model generates the actions that achieve it. It asks whether this simple recipe matches or beats SOTA model-free offline RL on Atari, D4RL locomotion, and long-horizon credit-assignment tasks.

## 2. Dataset / schema
(a) Atari: 1% DQN-replay dataset (Agarwal et al. 2020) on 4 games (Breakout, Qbert, Pong, Seaquest); (b) D4RL continuous control: HalfCheetah/Hopper/Walker (medium, medium-replay, medium-expert) + sparse-reward 2D Reacher; (c) Key-to-Door gridworld (Mesnard et al. 2020 variant): 1K and 10K random-walk trajectories, binary reward only if key picked up in phase 1 and door reached in phase 3. Schema: trajectories τ of (R̂_t, s_t, a_t) with R̂_t = returns-to-go. All datasets public (D4RL; DQN replay).

## 3. Method / model
**Decision Transformer.** Trajectory representation τ=(R̂_1,s_1,a_1,…,R̂_T,s_T,a_T) with R̂_t=Σ_{t′=t}^T r_{t′}. Last K timesteps → 3K tokens (one per modality: return-to-go, state, action); modality-specific linear embeddings + layer norm (conv encoder for visual states); learned per-timestep embedding added to each token (one timestep = three tokens). GPT with causal self-attention predicts action tokens autoregressively. Training: sample minibatches of length K from offline data; prediction head at state token s_t predicts a_t with cross-entropy (discrete) or MSE (continuous) loss, averaged over timesteps; states/returns-to-go prediction heads ablated (no gain). Inference: seed with target return (e.g., max dataset return, or 1/0 for success/failure) and start state; execute generated action, decrement target return by achieved reward, repeat. Context lengths: K=30 (K=50 for Pong); full episode for Key-to-Door.

## 4. Equations & assumptions
- Returns-to-go: R̂_t = Σ_{t′=t}^{T} r_{t′}.
- Trajectory: τ = (R̂_1, s_1, a_1, R̂_2, s_2, a_2, …, R̂_T, s_T, a_T) (Eq 2).
- Training loss: average over timesteps of CE/MSE between predicted â_t and dataset a_t given history (R̂_{≤t}, s_{≤t}, a_{<t}).
- Inference update: R̂_{t+1} ← R̂_t − r_t after each executed action.
- %BC diagnostic: behavior cloning on top X% of timesteps by episode return, X∈{10,25,40,100} — used to test whether DT is "just" cloning high-return subsets.
- Assumptions: offline trajectories with reward signal; target return at test time must be chosen (paper uses dataset-max or per-task values); no explicit handling of stochastic dynamics — conditioning assumes the return is achievable from the state.

## 5. Features / target
Input: sequence of (return-to-go, state, action) tokens; state = Atari frames / proprioceptive vectors / grid observations. Target: next action a_t (discrete: Qbert/Breakout/Pong/Seaquest actions; continuous: torques). Horizon: episode length (K=30 context window; full-episode for Key-to-Door).

## 6. Validation design
Benchmark-based (not time-ordered; offline datasets fixed). Baselines: CQL, REM, QR-DQN (numbers from their papers), BC with identical architecture minus return conditioning, %BC sweep, MLP K=1 ablation, random. Metrics: gamer-normalized Atari scores (mean±var, 3 seeds); D4RL normalized scores (3 seeds); Key-to-Door success rate. Return-conditioning fidelity: correlation between prompted target return and achieved return (Figure 4). Context-length ablation (Table 5: K=1 vs K=30 on Breakout).

## 7. Numerical results / baselines
- Atari 1% DQN-replay (Table 1, 4 games): DT "competitive with CQL in 3 out of 4 games and outperforms or matches REM, QR-DQN, and BC on all 4 games."
- D4RL (Table 2): "Decision Transformer (DT) outperforms conventional RL algorithms on almost all tasks" (medium/medium-replay/medium-expert locomotion + Reacher; Reacher baseline CQL only).
- Key-to-Door (Table 6): 1K random trajectories — DT 71.8% vs CQL 13.1%, BC 1.4%, %BC 69.9%, random 3.1%. 10K trajectories — DT 94.6% vs CQL 13.3%, BC 1.6%, %BC 95.1%, random 3.1%. "TD learning (CQL) cannot effectively propagate Q-values over the long horizons involved and gets poor performance."
- %BC comparison (Table 3): DT competitive with the best %BC percentile on D4RL, showing it is not merely cloning the best subset — it generalizes across the return spectrum.
- Return conditioning (Figure 4): "On every task, the desired target returns and the true observed returns are highly correlated"; on Pong/HalfCheetah/Walker "almost perfectly match"; on Seaquest DT extrapolates beyond the dataset's max episode return when prompted higher.
- Context ablation (Table 5): K=1 "significantly worse" than K=30 on Atari (e.g., Breakout 267.5±97.5 for full DT), supporting that history helps identify the behavior policy.

## 8. Code / data availability
Code: https://sites.google.com/berkeley.edu/decision-transformer (project page; repo linked there). Datasets public (D4RL, DQN replay).

## 9. Leakage & limitations
- Conditioning on an unachievable target return in stochastic settings can produce incoherent actions (paper's extrapolation is on near-deterministic Atari; weekly betting returns are highly stochastic).
- No uncertainty quantification on the generated actions — a wrong target just yields wrong stakes confidently.
- DT avoids TD bootstrapping, so it also avoids TD's stitching ability in theory; its Key-to-Door success relies on hindsight return information present in random data.
- Context K=30 with 3 tokens/step is cheap for games but a full NFL season (18 weeks × slate) needs the episode-as-context treatment or hierarchical design.
- Best-evaluation reporting on Atari (mean±var over 3 seeds reported, mitigating).

## 10. GSE overlap
Repo has no sequence-modeling-for-decisions work (gap #4 RL/bandits for pick selection; transformer work is limited to temporal fusion transformers as a brief topic). DT is new capability: it turns the logged pick history into a conditional generator rather than a value estimator, sidestepping the bootstrapping instability that CQL/C51 manage with regularizers.

## 11. GSE implementation spec
1. Build trajectory dataset: one "episode" = one NFL season of weekly slates; per week t: R̂_t = remaining season profit target in units, s_t = slate features (edges, CLV, bankroll, week number, exposure used), a_t = vector of stake buckets placed that week (discrete: 0/0.25/0.5/1/2u per bet, padded to max slate size).
2. Train GPT (small: 4–6 layers, K = full 18-week season context or K=8 sliding window) with CE loss on stake tokens, conditioned on R̂_1 = season profit target (e.g., +30u).
3. Inference each Tuesday: prompt with target = remaining season target (e.g., +30u − profit so far), recent weeks' (R̂,s,a) history; model emits this week's stake vector; decrement accounting automatic via realized results.
4. Safety: clip any stake above the per-bet cap; override to 0 if model emits stakes on bets with edge below the engine's minimum threshold.
5. Effort: ~3 weeks (data formatting is the bulk; model is a standard minGPT training loop).

## 12. Reproducible test
Dataset: GSE logged picks 2019–2024 formed into 6 season-episodes (train 2019–2023, test 2024). Baselines: (a) fractional-Kelly staking, (b) CQL staking (ledger 1923), (c) %BC (clone only historically profitable weeks). Metric: 2024 realized ROI and max drawdown with target R̂_1 = +30u. Also plot prompted-target vs achieved-return correlation (paper's Figure-4 diagnostic) on 2019–2023 holdout weeks.

## 13. Acceptance / rejection gate
ADOPT iff on the 2024 season the DT policy beats fractional-Kelly ROI by ≥2pp with max drawdown no worse than baseline AND the prompted-target/achieved-return correlation on holdout is ≥0.5 (the conditioning mechanism must demonstrably work); otherwise REJECT in favor of the CQL approach.

## 14. Improvement experiment
Condition on a *distributional* target instead of a scalar: feed the model quantile targets (e.g., "achieve ≥+20u with P(drawdown>10u) ≤ 0.1") as additional conditioning tokens and train with a quantile-weighted loss. Tests whether return-conditioning can be extended to risk-conditioning — the missing piece that would make DT directly optimize GSE's drawdown constraint rather than hoping a profit target implies one.
