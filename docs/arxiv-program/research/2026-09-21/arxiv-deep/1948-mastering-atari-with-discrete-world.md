# [1948] Mastering Atari with Discrete World Models (arXiv:2010.02193)

**Citation:** Danijar Hafner, Timothy Lillicrap, Mohammad Norouzi, Jimmy Ba (Google Research / DeepMind / U Toronto, 2020). *Mastering Atari with Discrete World Models* (DreamerV2). arXiv:2010.02193. URL: https://arxiv.org/abs/2010.02193
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

the categorical-latent RSSM with straight-through gradients and KL balancing (α=0.8) is the architectural upgrade over DreamerV1's Gaussian latents; GSE's game-state latents are multimodal (blowout vs nailbiter regimes), and categoricals capture that where Gaussians blur it. Bridges 1942 (Dreamer) and 1943 (DreamerV3, which kept the categoricals).

## 1. Research question
Can discrete (categorical) latent variables fix the Atari world-model accuracy problem — i.e., does replacing the Gaussian stochastic state of the RSSM (PlaNet/DreamerV1) with a vector of categorical variables trained via straight-through gradients, plus KL balancing between prior and posterior, produce a world model accurate enough for the first human-level Atari performance learned purely inside a separately-trained world model?

## 2. Dataset / schema
Atari benchmark, 55 games, sticky actions, 200M steps; same compute/wall-clock budget as single-GPU baselines (Dopamine IQN/Rainbow). Continuous control: humanoid stand-up/walking from pixels only.

## 3. Method / model
DreamerV2 = DreamerV1 with three changes:
1. Categorical latents: stochastic state z_t is a VECTOR of multiple categorical variables (not a diagonal Gaussian); optimized with straight-through gradients (Bengio et al. 2013): sample = sample + probs − stop_grad(probs) (Algorithm 1). Prior ẑ_t predicts the posterior without the current image; posterior sees the image.
2. KL balancing (Algorithm 2): KL = α·KL(stop_grad(posterior)‖prior) + (1−α)·KL(posterior‖stop_grad(prior)), α=0.8 — "encourages learning an accurate prior over increasing posterior entropy, so that the prior better approximates the aggregate posterior." KL scaled by β=0.1 (Atari) / β=1.0 (continuous control).
3. Behavior learning in imagination: actor-critic trained purely on imagined rollouts in the compact latent space (thousands of parallel predictions per GPU); actor via REINFORCE + straight-through world-model gradients; critic via TD on imagined rewards. World model trained separately from the policy.
Image predictor: diagonal Gaussian likelihood, unit variance; reward predictor categorical/scalar as in V1.

## 4. Equations & assumptions
RSSM with h_t recurrent deterministic; prior p(ẑ_t|h_t), posterior q(z_t|h_t,x_t), both categorical vectors.
Straight-through: sample = onehot_sample + probs − sg(probs).
KL balancing: L_KL = α·KL(sg(q)‖p) + (1−α)·KL(q‖sg(p)), α=0.8, scaled by β.
ELBO (Eq 2): reconstruction + reward log-likelihoods − β·L_KL.
Assumptions (stated): categoricals can represent multimodal futures better than Gaussians; straight-through gradients suffice (no reparameterization); prior accuracy is the binding constraint (hence balancing toward the prior).

## 5. Features / target
Inputs: Atari frames (CNN encoder). Latent: deterministic h_t + categorical z_t vector. Targets: image reconstruction, reward prediction, KL terms. Imagination: actor/critic in latent space.

## 6. Validation design
55-game Atari benchmark vs IQN, Rainbow (same budget), SimPLe; metric: gamer-normalized median score. Humanoid continuous control from pixels. Ablations of categoricals vs Gaussian, KL balancing on/off (referenced).

## 7. Numerical results / baselines
(Paper claims.) First agent with human-level Atari performance (55 games, sticky actions, 200M steps) learned purely inside a separately trained world model; "surpasses the final performance of the top single-GPU agents IQN and Rainbow" at the same budget. Humanoid stand-up/walking solved from pixels only. SimPLe comparison discounted (easier 36-game subset, fewer steps). Individual per-game scores in Table K.1.

## 8. Code / data availability
Not stated in extracted text (official DreamerV2 code was later released by the author; I record only "not stated").

## 9. Leakage & limitations
Online RL — no dataset leakage. Limitations: (i) categoricals need straight-through gradients (biased estimator); (ii) codebook sizing (number of categoricals × classes) is a hyperparameter with no automatic selection; (iii) Atari frames are highly structured/discrete-ish; football game state is noisier and more continuous — the categorical advantage may shrink; (iv) GSE needs the world model for SIMULATION, not the actor-critic — half the paper (imagination behavior learning) doesn't transfer.

## 10. GSE overlap
Direct upgrade of 1942 (DreamerV1, Gaussian latents) and predecessor of 1943 (DreamerV3 kept categoricals + added symlog/twohot). The three ledgers form the RSSM lineage: 1942 → 1956 → 1943. No overlap with existing GSE work. For GSE's purposes, 1956's contribution is specifically the categorical-latent + KL-balancing recipe.

## 11. GSE implementation spec
"GSE-DreamV2": take the 1942 GSE-Dream RSSM and replace Gaussian latents with a vector of categoricals (e.g., 32 categoricals × 32 classes), straight-through gradients, KL balancing α=0.8, β tuned for football data. Rationale: game states are multimodal (a 3rd-and-long can become a conversion, sack, or turnover — discrete regimes, not a Gaussian blob). Train on nflverse 2006–2025 play sequences; keep the 1943 symlog/twohot reward targets.

## 12. Reproducible test
nflverse 2015–2024 protocol (1942 §12). Head-to-head: (A) Gaussian RSSM (1942), (B) categorical RSSM (this paper). Metrics: 2024 one-step log-likelihood, weekly final-score TVD, WP ECE, PLUS multimodality probe: on 3rd-and-long plays, measure whether the predictive distribution over next-play EPA is multimodal (Hartigan dip test on samples) — the specific capability categoricals should add. Success = (B) matches/beats (A) on TVD/ECE AND shows significant multimodality where (A) doesn't.

## 13. Acceptance / rejection gate
ADOPT categorical latents as the GSE-Dream standard if (B) beats (A) on 2024 TVD/ECE OR matches them while demonstrating multimodal predictions on high-leverage plays (dip test p<0.05 on ≥20% of 3rd/4th downs). REJECT if categoricals underperform Gaussians on log-likelihood (straight-through bias hurting) — then keep Gaussians with the 1943 symlog improvements. Either way, keep KL balancing (α=0.8): prior accuracy is what imagination/simulation consumes.

## 14. Improvement experiment
Beyond the paper: regime-labeled categoricals — initialize/regularize a subset of the categorical dimensions to correspond to known game regimes (garbage time, two-minute drill, goal-line) via weak supervision from game situation, leaving the rest free. Expectation: interpretable latents (each regime dimension becomes a readable game-state feature for the content desk) without sacrificing accuracy. Test: regime-dimension purity (mutual information with situation labels) + TVD/ECE parity with free categoricals.
