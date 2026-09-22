# [1942] Dream to Control: Learning Behaviors by Latent Imagination (arXiv:1912.01603)

**Citation:** Danijar Hafner, Timothy Lillicrap, Jimmy Ba, Mohammad Norouzi (2019). *Dream to Control: Learning Behaviors by Latent Imagination*. arXiv:1912.01603. URL: https://arxiv.org/abs/1912.01603
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

the latent-dynamics + parallel-imagination machinery is directly reusable as an NFL game simulator; the actor-critic policy part needs replacement with Monte-Carlo pricing, not control.

## 1. Research question
How can an agent solve long-horizon visual control tasks purely by "latent imagination" — i.e., learn behaviors in the compact latent space of a learned world model by backpropagating analytic gradients of learned state values through imagined trajectories, instead of deriving behaviors via derivative-free online planning (PlaNet) or model-free interaction?

## 2. Dataset / schema
No external dataset. DeepMind Control Suite (Tassa et al. 2018): 20 challenging visual control tasks (e.g., cup, acrobot, walker, hopper, quadruped), image observations (pixel inputs), continuous and discrete action variants, sparse and dense reward variants, early termination on some tasks. Agent collects its own experience: 5×10^6 environment steps total across training, 5 random seeds. Public: DMC is open source (github.com/deepmind/dm_control). Time splits: N/A (online RL).

## 3. Method / model
Three classical components (Sutton 1991): (1) learn latent dynamics from replay buffer; (2) learn behavior by imagination; (3) act in environment. World model = three learned distributions:
- Representation model p(s_t | s_{t-1}, a_{t-1}, o_t) (encoder; "p" = generates samples in the real environment)
- Transition model q(s_t | s_{t-1}, a_{t-1}) (prior; "q" = approximations enabling imagination)
- Reward model q(r_t | s_t)
States are continuous vectors with Markovian transitions (mimics a nonlinear Kalman filter / latent state-space model / HMM, conditioned on actions, predicting rewards). The paper's default transition implementation is the recurrent state-space model (RSSM, Hafner et al. 2018): a deterministic recurrent core plus stochastic state, which the paper shows performs accurate 45-step open-loop predictions given only actions (Fig. 5).
Behavior learning: the latent dynamics define a fully-observed MDP in latent space. Imagined trajectories start at true posterior states of replay sequences and roll forward via transition model, reward model, and a policy (action model q_φ(a_τ|s_τ)). Actor-critic in imagination: a value model v_ψ(s_τ) estimates expected imagined returns; value targets are λ-returns V_λ; action model maximizes Σ V_λ via analytic gradients backpropagated through reward/value/dynamics (stochastic backpropagation, Kingma & Welling 2013); value model regresses V_λ targets. Imagination horizon H with value model covering rewards beyond H (removes shortsightedness of fixed-horizon planning).
World-model training objectives compared: (a) reward prediction only, (b) image reconstruction (ELBO), (c) contrastive estimation. Reconstruction used as default.

## 4. Equations & assumptions
Eq (1) — model components:
Representation model: p(s_t | s_{t-1}, a_{t-1}, o_t)
Transition model: q(s_t | s_{t-1}, a_{t-1})
Reward model: q(r_t | s_t)
Objective (imagination MDP): maximize E_q[ Σ_{τ=t}^{∞} γ^{τ−t} r_τ ] w.r.t. policy.
λ-return target (Eq 6): V_λ(s_τ) ≐ (1−λ) Σ_{n=1}^{H−1} λ^{n−1} V_N^n(s_τ) + λ^{H−1} V_N^H(s_τ), where V_N^k bootstraps with the value model after k steps (V_R variant sums only within-horizon rewards, used in ablation).
Action objective: max_φ E_{q_θ,q_φ}[ Σ_{τ=t}^{t+H} V_λ(s_τ) ]
Value objective: min_ψ E_{q_θ,q_φ}[ Σ_{τ=t}^{t+H} ½ ‖ v_ψ(s_τ) − V_λ(s_τ) ‖² ] (gradient stopped around targets).
World-model ELBO terms: J_R^t ≐ ln q(r_t | s_t); J_D^t ≐ −β KL( p(s_t | s_{t-1}, a_{t-1}, o_t) ‖ q(s_t | s_{t-1}, a_{t-1}) ), plus observation reconstruction ln q(o_t | s_t) under the ELBO; expectation under dataset and representation model.
Assumptions (stated): model states are Markovian; imagination MDP is fully observed; reward/value/dynamics/policy all differentiable for analytic gradients; replay sequences give valid posterior start states.

## 5. Features / target
Input: image observations o_t (DMC renderings), actions a_t. Target: (a) reconstructed observations, (b) predicted rewards r_t, (c) transition-predicted latent states, (d) λ-return value targets for actor-critic. Prediction horizon: imagination horizon H (ablation shows robustness to H via the value model); RSSM open-loop prediction validated to 45 steps in Fig. 5.

## 6. Validation design
No train/test split — online RL evaluation protocol: 5 independent seeds, performance curves over environment steps, final performance averaged over the 20 DMC tasks. Baselines: PlaNet (online planning with learned world model; same authors' prior), D4PG (model-free, best published at the time), A3C. Ablations: (i) action model without value model vs with (imagination horizon robustness, Fig. 4); (ii) representation-learning objective: reconstruction vs reward-prediction vs contrastive (Fig. 8). Metric: episode return per task, averaged across tasks.

## 7. Numerical results / baselines
(Paper claims, Fig. 6.) After 5×10^6 environment steps, Dreamer reaches average performance **823** across tasks, vs PlaNet **332** and the top model-free D4PG **786** (D4PG needed 10^8 steps). "Dreamer inherits the data-efficiency of PlaNet while exceeding the asymptotic performance of the best model-free agents."
Compute (paper claims): ~33 hours per 10^6 environment steps on 1× Nvidia V100 + 10 CPU cores, vs 11 hours for online planning with PlaNet and 24 hours for D4PG to reach similar performance. Same hyperparameters across all continuous tasks (and separately across discrete tasks); details in Appendix A.
Ablation (Fig. 8): pixel reconstruction performs best for the majority of tasks; contrastive objective solves about half the tasks; reward prediction alone was not sufficient.
RSSM (Fig. 5): accurate open-loop latent predictions 45 steps ahead given only actions.

## 8. Code / data availability
Code stated: https://danijar.com/dreamer ("The source code for all our experiments and videos of Dreamer are available"). Implementation uses TensorFlow Probability. DMC open source. No pretrained-model links stated.

## 9. Leakage & limitations
N/A leakage in the usual sense (online RL, no static dataset). Limitations: (i) reconstruction objective — best in their tests but forces the latent space to model task-irrelevant pixel detail (the paper itself flags representation learning as the bottleneck); (ii) Gaussian/continuous latents can blur multimodal futures; (iii) results are DMC-only — MuJoCo visual control has smooth, Markovian-ish dynamics unlike football, where regime changes (injuries, halftime adjustments, garbage time) break stationarity; (iv) the actor-critic-imagination machinery is built for control (finding a policy), not for unbiased trajectory sampling — for pricing we need the world model, not the policy; (v) V100-era compute: 33h/10^6 steps is modest, but an NFL-scale latent model over 22 agents is far heavier than DMC single-agent control.

## 10. GSE overlap
GSE's existing research map (docs/research/2026-09-10 → 2026-09-21, gse-lab CSVs, NGS replacement spec, STRAIN paper read) covers EPA/state-space team strength, Kalman filters, particle filters, nested AR(1) team strength (1701.05976, read in depth), and tracking taxonomies — but has NO learned latent game simulator: nothing that rolls forward full games/drives in a learned latent space. Dreamer's RSSM + parallel imagination is a genuinely new capability (extension, not duplicate). Related reads in this lane will include DreamerV3/IRIS/TransDreamer (separate ledgers); this one is the original latent-imagination formulation.

## 11. GSE implementation spec
Build "GSE-Dream": a latent NFL game simulator.
- Data: nflverse play-by-play 2006–2025 (state = down, distance, yardline, score diff, time remaining, timeouts, quarter; ~500k plays), optionally Big Data Bowl tracking for a player-level variant later.
- Encoder p(s_t | s_{t-1}, a_{t-1}, o_t): MLP/GRU over engineered play features → stochastic latent s_t (dim ~128); "action" a_{t-1} = previous play descriptor (play type, EPA, personnel).
- Transition q(s_t | s_{t-1}, a_{t-1}): GRU + stochastic head (RSSM-style); for pricing, condition on pregame team-strength embeddings (offense/defense EPA priors) as global context.
- Decoders: reward/score model q(score_event_t | s_t) (points scored on play), next-play descriptor head; skip pixel reconstruction — decode structured play features instead (down/distance/yardline deltas, play type, EPA).
- Training: ELBO = reconstruction of next-play features + score log-likelihood + β KL(posterior ‖ prior), on historical play sequences.
- Serving: sample N=100k latent trajectories per matchup in parallel (the paper's core advantage: thousands of trajectories in parallel in a compact latent space); aggregate final scores → full-game score distribution → price spread/total/exotic props (e.g., exact margin bands, race-to-N).
- Effort: ~3–4 weeks for a play-level prototype (single GPU), before tracking integration.

## 12. Reproducible test
Dataset: nflverse play-by-play, seasons 2015–2024 (train 2015–2022, validate 2023, test 2024). Baseline to beat: naive historical-score-distribution simulator (bootstrap past games by team) and the GSE engine's current point-distribution model. Metrics: (a) one-step-ahead log-likelihood of (next play type, EPA bucket, score event) on 2024 test plays; (b) full-game: simulated final-score distribution vs empirical 2024 distribution — total variation distance per week; (c) win-probability calibration ECE on 2024 games at kickoff. Success = beats baseline on (a) and (b) with statistical significance (paired bootstrap, p<0.05).

## 13. Acceptance / rejection gate
ADOPT the latent-simulator architecture for GSE pricing if on 2024 held-out games: (i) one-step-ahead log-likelihood improves ≥5% over the bootstrap baseline, AND (ii) simulated final-score distributions match empirical within 5% total-variation distance per week, AND (iii) simulated kickoff win probabilities have ECE ≤ 0.03. REJECT if any of the three fails after reasonable hyperparameter effort (≤2 weeks tuning). The actor-critic/policy-learning half is out of scope — rejected for GSE; only the world model is gated.

## 14. Improvement experiment
Replace Dreamer's continuous Gaussian latents with the discrete categorical latents of DreamerV2 (separate ledger 1943-adjacent) — football game states are naturally multimodal (punt vs field-goal attempt vs go-for-it on 4th down), and categorical latents should capture regime switching (e.g., garbage-time vs competitive script) better than a unimodal Gaussian. Test: discrete-latent variant vs continuous on the 2024 TVD/calibration metrics above.
