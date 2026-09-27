# [1945] TransDreamer: Reinforcement Learning with Transformer World Models (arXiv:2202.09481)

**Citation:** Chang Chen, Yi-Fu Wu, Jaesik Yoon, Sungjin Ahn (2022). *TransDreamer: Reinforcement Learning with Transformer World Models*. arXiv:2202.09481 (Deep RL Workshop NeurIPS 2021). URL: https://arxiv.org/abs/2202.09481
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

TSSM's direct long-range memory access is exactly what an NFL simulator needs (game script depends on events quarters ago, not just the last play); the myopic-posterior parallelization trick is reusable engineering, but transformer imagination is memory-hungry.

## 1. Research question
How can the Dreamer MBRL framework benefit from transformers — i.e., can a transformer-based stochastic world model (with parallel trainability) outperform Dreamer's RNN-based RSSM on tasks requiring long-term, complex memory interactions, and what are the architectural challenges in making it work?

## 2. Dataset / schema
No external dataset. Custom Hidden Order Discovery tasks (2D Minigrid 8×8, 3D Unity first-person): 4/5/6 colored balls, hidden collection order randomized per episode, +3 reward per correct ball, 100-step episodes, partial observability. Plus a few DMC and Atari tasks (no long-term memory needed) as controls. Online RL, multiple seeds. Code: github.com/weiqinchen7/transdreamer (stated in repo README found via search; paper text references the codebase).

## 3. Method / model
Transformer State-Space Model (TSSM): replaces RSSM's GRU h_t = f_gru(h_{t−1}, z_{t−1}, a_{t−1}) with h_t = f_transformer(z_{1:t−1}, a_{1:t−1}) — direct attention over all past stochastic states and actions at every step, computed in parallel during training, rolled out sequentially at imagination time.
Key trick — myopic representation model: the standard posterior q(z_t | h_t, x_t) would feed the transformer's own output back as input, breaking parallel training (the "purple arrows" in Fig. 1). TransDreamer approximates it with q(z_t | x_t), independent per timestep, so all z_{1:t} are computed simultaneously and one transformer forward pass yields h_{1:t}.
The rest follows Dreamer (Algorithm 1): world-model learning → actor-critic in imagination → environment interaction. Transformer-based policy shares the world model. Training stabilizers: prioritized replay toward nonzero-reward trajectories (α-fraction sampled from rewarding trajectories); subset of K start states for imagination (transformer memory prevents imagining from every replay state as Dreamer does); transformer parameters frozen during agent training (trained only on image/reward/discount prediction) which the authors find avoids the instability Parisotto et al. reported for reward-only transformer policies.

## 4. Equations & assumptions
RSSM baseline: h_t = f_gru(h_{t−1}, z_{t−1}, a_{t−1}).
TSSM: h_t = f_transformer(z_{1:t−1}, a_{1:t−1}); myopic posterior q(z_t | x_t) ≈ q(z_t | h_t, x_t).
Same Dreamer ELBO + λ-return actor-critic objectives as ledger 1942 (paper inherits them; not restated).
Assumptions (stated): the myopic posterior is an acceptable approximation (representation independent of history given the current observation); transformer frozen during policy training still yields a good imagination MDP; direct attention over full history is worth the memory cost.

## 5. Features / target
Inputs: image observations (2D top-down / 3D first-person), discrete actions. Targets: next latent states (KL), image reconstruction, reward (+3 sparse), discount/termination. Imagination rollouts from replay start states (subset K).

## 6. Validation design
Online RL on Hidden Order Discovery (2D: 4/5/6 balls; 3D: 4-ball dense/sparse, 5-ball dense). Baselines: Dreamer (same framework, RSSM backbone). Metrics: mean episode reward (each ball +3), success rate = % trajectories collecting all balls in order ≥ once. World-model quality: per-image MSE of foreground objects in action-conditioned generation (100-step trajectories, varying context), reward-prediction accuracy on nonzero (+3±0.3) steps. Controls: DMC + Atari tasks without memory demands.

## 7. Numerical results / baselines
(Paper claims.) 2D 4-ball: TransDreamer mean episode reward ~7 vs Dreamer ~4 (i.e., >2 balls in order vs ~1). Success rate: TransDreamer 23% vs Dreamer 7%. Outperforms Dreamer in all configurations, 2D and 3D; comparable to Dreamer on memory-free DMC/Atari tasks. World-model quality: TransDreamer achieves lower or comparable foreground MSE, and more accurate nonzero-reward prediction; longer contexts help TransDreamer more, while "Dreamer's reward prediction does not improve much as the context increases" — evidence Dreamer underuses long context.

## 8. Code / data availability
Paper text references code built on the DreamerV2 codebase (public mirror: github.com/weiqinchen7/transdreamer). Minigrid/Minigrid and Unity environments are public.

## 9. Leakage & limitations
No static dataset → no leakage. Limitations: (i) transformer imagination memory cost forces subset-of-states imagination (fewer imagined trajectories than Dreamer — a throughput hit for Monte-Carlo pricing); (ii) myopic posterior q(z_t|x_t) discards history in the encoder — fine for reactive vision, questionable for football where the same score state means different things by game script; (iii) gains demonstrated only on toy memory tasks, not on complex stochastic multi-agent dynamics; (iv) no discrete-latent variant (uses DreamerV2-style categoricals in the codebase but the paper's analysis is RSSM-based).

## 10. GSE overlap
Extends 1942 (Dreamer) along the memory axis; complements 1944 (IRIS, token-LM transformer). No overlap with existing GSE work. The long-context result is the relevant novelty for GSE: an RSSM compresses the first three quarters into a fixed hidden vector, while TSSM attends directly to early-game states — e.g., "this team abandoned the run in Q1" or "the blitz package changed after halftime" remain accessible at Q4 simulation time.

## 11. GSE implementation spec
Fold into GSE-Dream (1942 §11) as a backbone variant: replace the GRU transition with a transformer over past latent states and play descriptors (TSSM), keeping the myopic-posterior trick — posterior per play computed from current play features only (down/distance/result embeddings), no recurrent encoder state, so training parallelizes over the full game sequence. Retain DreamerV3's categorical latents (1943). Condition attention on a persistent matchup embedding. This is the "long-memory" candidate backbone for full-game simulation.

## 12. Reproducible test
Same nflverse 2015–2024 protocol (1942 §12). Three-way backbone comparison: (A) RSSM-GRU, (B) TSSM-transformer, (C) IRIS token-LM (1944). Metrics: 2024 one-step log-likelihood, weekly final-score TVD, kickoff WP ECE, plus a long-context probe: 2nd-half score-distribution accuracy conditioned on 1st-half game script (does the simulator remember Q1–Q2?). Success = best backbone wins significantly on the probe and overall.

## 13. Acceptance / rejection gate
ADOPT TSSM as a GSE backbone candidate if on the 2024 long-context probe it beats the RSSM by ≥10% (log-likelihood of 2nd-half outcomes given 1st-half context) AND stays within 2× of the RSSM's sampling throughput (memory cost is the known risk). REJECT if throughput collapses (>4× slower per 100k-game batch) or the long-context gain is <5% — RSSM/IRIS suffice.

## 14. Improvement experiment
Beyond the paper: sparse/dilated attention over the game history — full attention within the current drive (plays are dense and causal), sparse attention to previous drives' summary tokens (the drive-level tokens from 1944 §14). Expectation: keeps TSSM's long-memory win at near-RSSM throughput. Test: same probe + wall-clock per 100k simulated games.
