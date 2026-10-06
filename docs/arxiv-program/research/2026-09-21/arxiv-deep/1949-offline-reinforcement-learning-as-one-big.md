# [1949] Offline Reinforcement Learning as One Big Sequence Modeling Problem (arXiv:2106.02039)

**Citation:** Michael Janner, Qiyang Li, Sergey Levine (2021). *Offline Reinforcement Learning as One Big Sequence Modeling Problem* (Trajectory Transformer). arXiv:2106.02039. URL: https://arxiv.org/abs/2106.02039
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

the per-dimension discretization + GPT-over-trajectories + beam-search planning recipe is directly portable to discrete play-by-play sequences; the beam-search planner is less useful for pricing than raw sampling, but the discretization scheme and long-horizon prediction results are valuable.

## 1. Research question
Can the entire RL pipeline be replaced by sequence modeling — i.e., does a GPT-style transformer trained by teacher forcing on discretized (state, action, reward) trajectories, decoded with beam search biased by cumulative reward, solve offline RL and long-horizon prediction without actors, critics, dynamics ensembles, or pessimism mechanisms?

## 2. Dataset / schema
Offline D4RL datasets (Fu et al. 2020): locomotion (HalfCheetah/Hopper/Walker2d/Humanoid), AntMaze; plus humanoid trajectories from a single policy for the prediction study. Public benchmarks; no new data collection.

## 3. Method / model
Trajectory Transformer: trajectories treated as unstructured token sequences (s_0, a_0, r_0, s_1, a_1, r_1, …).
- Discretization: continuous dims discretized per-dimension with vocabulary V. Two schemes: (1) Uniform — tokens cover uniformly-spaced intervals of width (max s^i − min s^i)/V (preserves Euclidean distance info; outliers can strand tokens); (2) Quantile — each token accounts for 1/V of empirical data mass (all tokens represented). Autoregressive per-dimension tokenization.
- Model: GPT-style transformer decoder, 4 layers, 4 heads (small vs LLM scale); trained with standard teacher forcing, maximizing Σ log P_θ(token | prefix).
- Planning = decoding: beam search (Algorithm 1) over token sequences, modified to bias beams by cumulative predicted reward; variations yield imitation learning (unbiased sampling), goal-reaching (condition on goal), and offline RL (reward-biased search). Combined with dynamic programming → SOTA planner on sparse-reward long-horizon AntMaze.
- Key property (stated): modeling states and actions jointly biases generation toward in-distribution actions, removing the need for explicit pessimism/conservatism.

## 4. Equations & assumptions
Training: maximize E[ Σ_t log P_θ(x_t | x_{<t}) ] over discretized trajectory tokens (teacher forcing).
Beam search: return argmax_{y ∈ Y_T} log P_θ(y | x) with reward-biased beam expansion (Algorithm 1).
Discretization: uniform bin width (max s^i − min s^i)/V; quantile bins at empirical V-quantiles.
Assumptions (stated): trajectory distribution can be captured by a fixed-vocabulary autoregressive model; beam search with reward bias approximates good planning; joint state-action modeling keeps samples in-distribution.

## 5. Features / target
Inputs: discretized per-dimension tokens of states, actions, rewards. Target: next token (cross-entropy). Horizons: length-100 trajectories in the prediction study; D4RL episode lengths in RL evals.

## 6. Validation design
(1) Long-horizon prediction: length-100 humanoid trajectories, vs PETS feedforward Gaussian ensemble (Chua et al. 2018) — error compounding over horizon (Fig. 3). (2) Offline RL on D4RL locomotion + AntMaze: baselines BRAC, CQL (model-free SOTA), MBOP (model-based trajectory optimization), Decision Transformer, BC. Metrics: normalized returns. (3) Discretization ablation: uniform vs quantile.

## 7. Numerical results / baselines
(Paper claims.) Prediction: Trajectory Transformer has "substantially better error compounding" than the PETS ensemble; generated length-100 trajectories "visually indistinguishable" from real ones while the single-step model produces physically implausible predictions. Offline RL: "performs on par with or better than all prior methods" (BRAC, CQL, MBOP, DT, BC) on locomotion; combined with DP, SOTA on AntMaze sparse-reward long-horizon tasks. Discretization: uniform ≈ quantile except HalfCheetah-Medium-Expert, where quantile achieves "more than twice" the return of uniform (large velocity range strands uniform bins).

## 8. Code / data availability
Stated: code at trajectory-transformer.github.io. D4RL public.

## 9. Leakage & limitations
Offline benchmarks, held-out episodes — no temporal leakage concern for the method. Limitations: (i) per-dimension discretization explodes vocabulary for high-dim states (NFL game state ~20+ dims × V bins — needs care); (ii) beam search is a planner, not a sampler — for pricing we need unbiased samples, not argmax trajectories; (iii) uniform discretization fails on heavy-tailed dims (velocities) — directly relevant: EPA/yardage are heavy-tailed, so quantile (or symlog) discretization is required; (iv) 4-layer transformer is small — NFL game sequences are longer (150+ plays) than D4RL episodes in token count.

## 10. GSE overlap
Sibling to 1944 (IRIS token-LM): same autoregressive-over-tokens philosophy, different tokenization (per-dimension discretization vs VQ tokens) and decoding (beam search vs sampling). No overlap with existing GSE work. The discretization study is the distinctive contribution vs 1944 — GSE's play features are mixed continuous/discrete, and this paper tells us exactly how to tokenize them.

## 11. GSE implementation spec
"GSE-TT": tokenize each play's continuous features (yardline, EPA, win-probability delta, time) with quantile discretization (per the HalfCheetah lesson — uniform bins fail on heavy tails) and categorical features natively; interleave as (state_t, play_descriptor_t, reward_t) tokens. Train a GPT decoder (12+ layers for 150-play games) by teacher forcing on nflverse 2006–2025. For pricing: ancestral sampling (not beam search) → full-game rollouts. Beam search retained only for "most likely game script" analysis content. Combine with the 1944 drive-token hierarchy for long-range structure.

## 12. Reproducible test
nflverse 2015–2024 protocol (1942 §12). Three-way: (A) GSE-TT quantile discretization, (B) GSE-TT uniform discretization, (C) IRIS-style native categorical tokens (1944). Metrics: 2024 one-step log-likelihood, weekly final-score TVD, WP ECE. Success = (A) beats (B) (validating the discretization lesson transfers) and the best of (A)/(C) beats the RSSM baseline from 1942 §12.

## 13. Acceptance / rejection gate
ADOPT per-dimension quantile discretization as GSE's tokenization standard if (A) beats (B) by ≥5% log-likelihood on 2024 held-out plays AND the best token-transformer meets the 1942 gates (TVD ≤5%/week, ECE ≤0.03). REJECT the Trajectory Transformer backbone specifically if it trails the IRIS-style native-token model (1944) on two of three metrics — then keep only its discretization lesson. The beam-search planner is rejected for pricing (we sample; we don't argmax).

## 14. Improvement experiment
Beyond the paper: learned (VQ) discretization of the continuous dims instead of fixed quantile bins — a tiny VQ-VAE over (yardline, EPA, WP-delta) trained jointly with the transformer, so bin boundaries adapt to football's actual distributional quirks (e.g., EPA spikes at turnovers, yardline pile-up at the goal line). Expectation: lower perplexity than fixed quantiles. Test: same 2024 log-likelihood comparison.
