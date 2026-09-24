# [1946] Planning with Diffusion for Flexible Behavior Synthesis (arXiv:2205.09991)

**Citation:** Michael Janner, Yilun Du, Joshua B. Tenenbaum, Sergey Levine (2022). *Planning with Diffusion for Flexible Behavior Synthesis*. arXiv:2205.09991. URL: https://arxiv.org/abs/2205.09991
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

diffusion-over-trajectories is the strongest full-sequence generation primitive in this lane for GSE (jointly coherent whole-game samples + test-time conditioning via inpainting/guidance); needs adaptation from continuous control to discrete play sequences and from planning to pure simulation.

## 1. Research question
What if trajectory optimization is folded into the modeling problem itself — i.e., can a diffusion probabilistic model that plans by iteratively denoising whole trajectories replace the standard "learn dynamics, then optimize with a classical planner" pipeline, gaining long-horizon coherence and test-time flexibility (new goals/constraints without retraining)?

## 2. Dataset / schema
Offline trajectory datasets: (1) Maze2D (D4RL, Fu et al. 2020) — undirected navigation trajectories, sparse reward 1 at goal, hundreds of steps; (2) Block stacking — 10,000 demonstration trajectories from PDDLStream, reward 1 on successful placements; (3) D4RL locomotion (HalfCheetah/Hopper/Walker2d, Medium-Expert etc.). No new data collection; standard offline-RL benchmarks, public.

## 3. Method / model
Diffuser = diffusion model over full trajectories τ = (s_0, a_0, s_1, a_1, …, s_T, a_T), trained with the DDPM simplified objective. Architecture: 1D-temporal-convolution U-Net (repeated temporal-conv residual blocks; image U-Net with 2D spatial convs replaced by 1D temporal convs); fully convolutional so the planning horizon is set by input dimensionality, not architecture — can change dynamically at planning time. Temporal locality: each denoising step only enforces local consistency, but composing many steps yields global coherence; non-autoregressive, non-Markovian (future states inform past denoising, enabling goal-conditioned inference p(s_1 | s_0, s_T)).
Two planning instantiations:
- RL as guided sampling: control-as-inference with optimality variable p(O_t=1) = exp(r(s_t,a_t)); sample p̃_θ(τ) = p(τ | O_{1:T}=1) ∝ p(τ)·p(O_{1:T}=1 | τ). Train a separate return predictor J_φ on noisy trajectories; guide the reverse process by perturbing means μ with ∇J_φ (classifier-guidance analog); execute first action, replan (receding horizon, Algorithm 1).
- Planning as inpainting: clamp start state s_0 and goal state s_T (or any subset of timesteps) during denoising — coherent goal-conditioned plans from undirected data, no retraining.
Speed: warm-start planning — forward-diffuse the previous plan a few steps, then denoise; performance "suffers only minimally even when using one-tenth the number of diffusion steps" (Fig. 7, Walker2d Medium-Expert).

## 4. Equations & assumptions
Diffusion training: L(θ) = E_{i,ε,τ^0}[ ‖ ε − ε_θ(τ^i, i) ‖² ], i ~ U{1..N}, ε ~ N(0,I); reverse covariances Σ^i follow the Nichol & Dhariwal cosine schedule.
Guided sampling: p̃_θ(τ) = p(τ | O_{1:T}=1) ∝ p(τ)·p(O_{1:T}=1 | τ); guide gradients = Σ_t ∇_{s_t,a_t} r(s_t,a_t)|_{μ_t} = ∇J(μ).
Assumptions (stated): trajectory data covers the relevant state space (offline); the return predictor J_φ generalizes to noisy trajectories; local temporal consistency composes into global coherence; inpainting constraints are compatible with the data distribution.

## 5. Features / target
Inputs: noisy trajectories τ^i (states+actions over horizon T). Target: the noise ε (score of the trajectory distribution). Auxiliary: return predictor J_φ(τ) → cumulative reward. Horizon: set by input length (Maze2D: hundreds of steps; locomotion: tens).

## 6. Validation design
Offline evaluation on fixed datasets. Maze2D (U-Maze/Medium/Large, single + multi-goal): baselines = model-free offline RL (CQL, IQL, etc.) and MPPI with ground-truth dynamics. Block stacking (unconditional/conditional/rearrangement): baselines BCQ, CQL. D4RL locomotion: standard offline-RL baselines. Metrics: normalized scores (100 = expert/reference). Multi-task test: same trained Diffuser, only the conditioning goal changed.

## 7. Numerical results / baselines
(Paper claims.) Maze2D: Diffuser scores 113.9±3.1 (U-Maze), 121.5±2.7 (Medium), 123.0±6.4 (Large) — "over 100 in all maze sizes, indicating that it outperforms a reference expert policy"; baselines far below (e.g., large maze: 58.6 best baseline). Multi-goal setting: Diffuser matches its single-task performance with no retraining, while the best model-free baseline (IQL + HER) drops substantially. MPPI with ground-truth dynamics performs poorly — "highlights the difficulty posed by long-horizon planning even when there are no prediction inaccuracies". Block stacking: Diffuser 58.7±2.5 (unconditional), 45.6±3.1 (conditional) vs BCQ 0.0/0.0, CQL 24.4/0.0 (100 = perfect). Locomotion Medium-Expert: e.g., Walker2d 107.5–108.8, Hopper 52.5–105.4 ranges reported across variants. Warm-start: ~10× fewer diffusion steps with minimal performance loss.

## 8. Code / data availability
Not stated in the extracted text (publicly, github.com/jannerm/diffuser exists, but I record only what the paper states: not stated). D4RL datasets public.

## 9. Leakage & limitations
Offline RL on fixed datasets — evaluation is on held-out goals/configurations, not time splits; no lookahead issue for the method itself. Limitations: (i) iterative generation is slow (mitigated by warm-start, still 10s of network evals per sample — expensive for 100k-game Monte Carlo); (ii) continuous-state formulation — NFL plays are discrete/mixed; (iii) guidance needs a differentiable return predictor, which can exploit model errors (adversarial trajectories); (iv) inpainting consistency is not guaranteed — clamped states may be incompatible with learned dynamics; (v) horizon is fixed per sample — a full NFL game has variable length (plays), requiring padding/masking design.

## 10. GSE overlap
New capability — no diffusion trajectory model exists in GSE's repo. Complements the autoregressive/RSSM backbones (1942–1945): Diffuser generates the whole game jointly (global coherence) rather than left-to-right, which should reduce compounding error over 150+ play sequences. The inpainting idea maps to "condition on a known game script" (e.g., simulate the rest of a game given the actual first half — live betting). Related: 1947 (Decision Diffuser) is the direct follow-up — separate ledger.

## 11. GSE implementation spec
"GSE-Diffuser": represent a game as a fixed-length (padded, e.g., 200 slots) sequence of play-state vectors (down, distance, yardline, score diff, time, play-type one-hots, EPA). Train a 1D-temporal-conv U-Net diffusion model on nflverse games 2006–2025 with the DDPM objective; mask padding in the loss. For pricing: unconditional sampling → full-game score distributions. For live pricing: inpaint the played prefix (clamp denoised prefix to observed plays each reverse step), sample completions — a principled live-simulation engine. Optional return-guidance: train J_φ to predict final margin from noisy trajectories and guide toward tail scenarios for exotic-prop pricing (e.g., P(blowout)). Start with 20 diffusion steps + warm-start for throughput.

## 12. Reproducible test
nflverse 2015–2024 protocol (1942 §12): train 2015–2022, val 2023, test 2024. Baselines: (a) IRIS token-LM (1944), (b) RSSM (1942). Metrics: 2024 final-score TVD per week, WP ECE, plus a coherence metric the autoregressive baselines can fail: distribution of within-game lead changes / scoring-run lengths vs empirical (diffusion's joint generation should match higher-order game-shape statistics better). Success = beats (a),(b) on TVD/ECE and on ≥2 of 3 game-shape statistics.

## 13. Acceptance / rejection gate
ADOPT diffusion as a GSE simulation backbone if on 2024 held-out: final-score TVD ≤5% per week AND WP ECE ≤0.03 AND sampling throughput ≥1k games/minute/GPU (warm-started, ≤20 steps) — throughput is the hard constraint for a pricing engine. REJECT if throughput falls below that even at acceptable quality (a beautiful simulator that can't Monte-Carlo in production is useless), or if TVD/ECE miss after ≤2 weeks tuning.

## 14. Improvement experiment
Beyond the paper: hierarchical diffusion — a coarse diffusion model over drive summaries (12–26 tokens/game) whose output conditions (via cross-attention) a fine play-level diffusion model. Expectation: variable game length handled naturally (drives are the variable unit, plays within a drive are bounded ~3–15), better long-range coherence than flat 200-slot padding, and faster sampling (shorter sequences). Test: same gates as §13 plus drive-count distribution match.
