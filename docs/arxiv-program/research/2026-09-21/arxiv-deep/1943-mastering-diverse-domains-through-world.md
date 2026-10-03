# [1943] Mastering Diverse Domains through World Models (arXiv:2301.04104)

**Citation:** Danijar Hafner, Jurgis Pasukonis, Jimmy Ba, Timothy Lillicrap (2023/2024). *Mastering Diverse Domains through World Models*. arXiv:2301.04104 (v2 Apr 2024). URL: https://arxiv.org/abs/2301.04104
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, via pdftotext; ar5iv HTML unavailable).
**Verdict:** ADAPT

the robustness toolkit (categorical latents, symlog/twohot for heavy-tailed targets, KL balancing, continue predictor) is the engineering core GSE needs for a trainable latent NFL simulator; the policy/imagination half is not needed for pricing.

## 1. Research question
Can one RL algorithm with a single fixed hyperparameter configuration outperform specialized, domain-tuned expert algorithms across 150+ diverse tasks (Atari, ProcGen, DMLab, Minecraft, visual/proprioceptive control) — i.e., does a set of normalization/balancing/transformation robustness techniques make world-model learning stable enough to remove per-domain tuning?

## 2. Dataset / schema
No external dataset; 8 online-RL benchmark domains, all on a single Nvidia A100 GPU per agent (paper's Table 2): Atari 57 tasks/200M steps; Atari100k 26 tasks/400K steps; ProcGen 16 tasks/50M steps (hard); DMLab 30 tasks/100M steps; Minecraft 1 task/100M steps (MineRL v0.4.4, MC 1.11.2, 64×64×3 first-person + inventory vectors, sparse 12-milestone reward to diamond); Visual Control 20 tasks/1M; Proprioceptive Control 18 tasks/1M; BSuite. Observations: pixels and/or vectors; actions: discrete and continuous; single fixed hyperparameter set everywhere.

## 3. Method / model
DreamerV3 = Dreamer (1912.01603, separate ledger 1942) plus robustness engineering:
- RSSM world model: sequence model h_t = f_φ(h_{t−1}, z_{t−1}, a_{t−1}); encoder z_t ~ q_φ(z_t | h_t, x_t); dynamics predictor ẑ_t ~ p_φ(ẑ_t | h_t); reward predictor r̂_t ~ p_φ(r̂_t | h_t, z_t); continue predictor ĉ_t ~ p_φ(ĉ_t | h_t, z_t) (episode-continuation flag c_t ∈ {0,1}); decoder x̂_t ~ p_φ(x̂_t | h_t, z_t). Encoder/decoder are CNNs (images) or MLPs (vectors); predictors are MLPs.
- **Categorical latents**: z_t sampled from a vector of softmax distributions, straight-through gradients (replaces Dreamer's Gaussian).
- World-model loss (Eq 2): L(φ) = E_qφ[ Σ_t (β_pred L_pred + β_dyn L_dyn + β_rep L_rep) ], β_pred=1, β_dyn=1, β_rep=0.1. L_pred trains decoder + reward predictor (symlog squared loss) and continue predictor (logistic regression). L_dyn = max(1, KL[ sg(q_φ(z_t|h_t,x_t)) ‖ p_φ(z_t|h_t) ]) trains the sequence model; L_rep = max(1, KL[ q_φ ‖ sg(p_φ) ]) trains representations to be predictable; **free bits**: both KL terms clipped below 1 nat ≈ 1.44 bits so the dynamics loss doesn't crush representation content. **KL balancing** via the stop-gradient split lets one fixed β_rep work across visually simple and complex 3D domains.
- **symlog transform** (Eq 9): symlog(x) = sign(x)·ln(|x|+1), inverse symexp(x) = sign(x)·(exp(|x|)−1); compresses large magnitudes, ≈identity near origin. Applied to vector observation encoder inputs and decoder targets.
- **symexp twohot loss** (Eq 11): for stochastic targets (rewards/returns), network outputs softmax over bins B; twohot(y) is a |B|-vector with mass on the two adjacent bins; L = −twohot(y)^T log softmax(f(x,θ)) — categorical cross-entropy regression, scale-invariant.
- Critic parameterized as categorical distribution over symexp twohot returns; reward predictor and critic output layers initialized to zeros to avoid early-training spikes; categorical encoder/dynamics distributions mixed with 1% uniform (impossible to become deterministic → well-behaved KL).
- Actor/critic learn purely from imagined abstract trajectories; actions selected by sampling the actor (no lookahead planning). Model sizes 12M–400M params (Table 3); larger models achieve higher scores with less interaction.

## 4. Equations & assumptions
Eq (1) RSSM components: h_t = f_φ(h_{t−1}, z_{t−1}, a_{t−1}); z_t ~ q_φ(z_t | h_t, x_t); ẑ_t ~ p_φ(ẑ_t | h_t); r̂_t ~ p_φ(r̂_t | h_t, z_t); ĉ_t ~ p_φ(ĉ_t | h_t, z_t); x̂_t ~ p_φ(x̂_t | h_t, z_t).
Eq (2): L(φ) = E_{q_φ}[ Σ_{t=1}^{T} (β_pred L_pred(φ) + β_dyn L_dyn(φ) + β_rep L_rep(φ)) ], β=(1,1,0.1).
Eq (3): L_pred = −ln p_φ(x_t|z_t,h_t) − ln p_φ(r_t|z_t,h_t) − ln p_φ(c_t|z_t,h_t); L_dyn = max(1, KL[ sg(q_φ(z_t|h_t,x_t)) ‖ p_φ(z_t|h_t) ]); L_rep = max(1, KL[ q_φ(z_t|h_t,x_t) ‖ sg(p_φ(z_t|h_t)) ]).
Eq (9): symlog(x) = sign(x)·ln(|x|+1); symexp(x) = sign(x)·(exp(|x|)−1).
Eq (11): L(θ) = −twohot(y)^T log softmax(f(x,θ)).
Assumptions (stated): fixed hyperparameters transfer across domains; imagination from abstract trajectories suffices; stop-gradient split of KL is a valid balancing; 1% uniform mixture keeps KLs bounded without hurting expressivity.

## 5. Features / target
Inputs: pixels (CNN) and/or vectors (MLP, symlog-transformed). Targets: reconstructed inputs, rewards (symlog-squared/twohot), continuation flags c_t (logistic), next categorical latent (KL). Actor-critic targets: λ-returns as twohot categorical distributions. Horizon: imagined trajectories from replay start states; value model covers beyond-horizon returns.

## 6. Validation design
Online RL protocol across 8 domains / 150+ tasks, fixed hyperparameters for DreamerV3. Baselines: tuned per-domain expert algorithms from the literature (MuZero on Atari 200M, Rainbow/IQN, PPG on ProcGen, IRIS on Atari100k, D4PG/DMPO/MPO, DrQ-v2/CURL, plus IMPALA/Rainbow/PPO tuned by the authors on Minecraft) and a high-quality Acme PPO with fixed hyperparameters. Ablations (Fig. 10): remove obs symlog, replace symexp-twohot with Huber, remove KL balancing & free bits — KL objective of the world model is the most important component, followed by return normalization and symexp twohot. Metrics: gamer/human-normalized scores (Atari), episode returns, Minecraft item success rates.

## 7. Numerical results / baselines
(Paper claims.) With one configuration, DreamerV3 outperforms tuned expert algorithms across the 150+ tasks and "substantially outperforms" fixed-config PPO in all domains. Specifics quoted: on Atari 200M it outperforms MuZero while using "only a fraction of the computational resources", and beats Rainbow/IQN; on ProcGen beats tuned PPG and Rainbow; on Atari100k "sets a new state-of-the-art", beating transformer-based IRIS; DMLab new SOTA (baselines given 10× data advantage: compared at 1B vs Dreamer's 100M); visual control SOTA vs DrQ-v2/CURL; proprioceptive control SOTA vs D4PG/DMPO/MPO.
Minecraft: first algorithm to collect diamonds from scratch without human data or curricula; at 100M steps obtains diamonds in 0.4% of episodes; over training, 100% of Dreamer agents obtain ≥1 diamond vs 0% of baseline agents (IMPALA/Rainbow/PPO).
Compute: single A100 per run; e.g., Minecraft 100M steps = 8.9 GPU-days at 200M params; DMLab 100M = 2.9 GPU-days.

## 8. Code / data availability
No explicit code URL found in the extracted text (publicly, github.com/danijar/dreamerv3 exists, but per the "quote faithfully" rule I record only what the paper states: not stated in the extracted sections). Benchmarks are public (Atari, ProcGen, DMLab, MineRL, DMC).

## 9. Leakage & limitations
No static dataset → no lookahead leakage. Adversarial notes: (i) the paper's comparisons give Dreamer advantages in protocol choice (baselines compared at different step budgets in DMLab); (ii) categorical latents + symlog are tuned for control returns — football score/EPA targets have different tail structure (bounded per-play, heavy-tailed per-drive); (iii) Minecraft 0.4% diamond rate shows even the best world model struggles with ultra-sparse long-horizon credit assignment — NFL "script" regimes (comeback, garbage time) may be similarly hard to learn from passive data; (iv) single-config robustness is a control claim; an NFL simulator needs careful state engineering regardless — don't read "fixed hyperparameters" as "no domain work needed".

## 10. GSE overlap
Directly extends ledger 1942 (Dreamer): same latent-imagination family, so the world-model concept overlaps, but the robustness toolkit here is new capability: GSE has no categorical-latent dynamics, no symlog handling of heavy-tailed targets, no KL-balanced VAE training, no continue-predictor for termination. Complements the 1942 implementation spec: the RSSM proposal there becomes trainable at NFL scale only with these stabilizers. No duplication of existing GSE work (no learned simulators exist in the repo).

## 11. GSE implementation spec
Apply to the "GSE-Dream" latent simulator from 1942's §11:
- Categorical latents (e.g., 32 categories × 32 dims) for z_t: captures multimodality of 4th-down decisions, turnover regimes, garbage-time scripts.
- symlog-transform all vector observation inputs (EPA, yardage, score diff) and use symexp-twohot loss for the score/EPA reward predictor: EPA is heavy-tailed (explosive plays), exactly the failure mode symlog fixes.
- KL balancing + free bits (1 nat floor) with β=(1,1,0.1) as the starting config for the VAE training on play sequences.
- Continue predictor c_t for drive/game termination (end of half, turnover on downs, game end) — needed for correct full-game rollouts; train via logistic regression as in the paper.
- Mix categoricals with 1% uniform to avoid KL spikes; zero-init score predictor heads.
- Fixed-hyperparameter discipline: one config across all teams/seasons first, tune only after.

## 12. Reproducible test
Same nflverse 2015–2024 protocol as 1942 §12. Compare two variants of GSE-Dream: (A) Gaussian-latent + MSE reward loss (naive), (B) categorical-latent + symlog/twohot + KL balancing + continue predictor. Metrics: 2024 one-step-ahead log-likelihood (play type/EPA/score event), weekly final-score TVD, kickoff WP ECE. Success = (B) beats (A) on all three and beats the bootstrap baseline from 1942 §12.

## 13. Acceptance / rejection gate
ADOPT the DreamerV3 robustness toolkit into the GSE simulator stack if variant (B) improves one-step-ahead log-likelihood ≥10% over variant (A) on 2024 held-out plays AND reaches the 1942 gates (TVD ≤5% per week, ECE ≤0.03). REJECT if (B) shows no significant gain over (A) after ≤2 weeks of tuning — the stabilizers are only worth their complexity if they move the metrics. As with 1942, the actor-critic half is out of scope.

## 14. Improvement experiment
Beyond the paper: learn a *team-conditional prior* over the categorical latents — p(z_t | h_t, team_offense_emb, team_defense_emb) — so the dynamics predictor bakes in matchup strength instead of relying on the encoder to rediscover it from score context. Expectation: faster convergence and better calibration on mismatched games (e.g., elite offense vs weak defense), where a team-agnostic prior underestimates explosiveness. Test on 2024 games with pregame spread ≥7.
