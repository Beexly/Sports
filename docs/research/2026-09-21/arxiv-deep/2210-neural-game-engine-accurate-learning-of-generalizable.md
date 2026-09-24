# [2210] Neural Game Engine: Accurate Learning of Generalizable Forward Models from Pixels (arXiv:2003.10520)

**Citation:** Bamford, C. & Lucas, S. M. (2020). *Neural Game Engine: Accurate Learning of Generalizable Forward Models from Pixels*. arXiv:2003.10520. URL: https://arxiv.org/abs/2003.10520
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Planning algorithms (MCTS) and model-based RL need fast, copyable forward models, but learned models degrade over long rollouts and tie their architecture to a fixed observation size. Can a neural forward model learn game rules from pixels so accurately that it generalizes to levels of different sizes than trained on, with no accuracy loss? The Neural Game Engine (NGE) builds on the Neural GPU: a convolutional gated recurrent unit iterated n times per frame, so non-local interactions propagate through iteration rather than depth, with parameter count independent of grid size. (Abstract, §I, §III)

## 2. Dataset / schema
10 deterministic General Video Game AI (GVGAI) games (Sokoban, aliens, clusters, etc.). Training data: random level generation + random agent movement (statistical level generation); 1.28M frames per experiment. Evaluation: rollouts against the true GVGAI engine from identical start states/action lists, up to 500 steps, 10 repeats.

## 3. Method / model
Core: modified Neural GPU (§III). State s is a 2D grid (W_s,H_s,C_s) — one vector per tile; 3x3 convolutional kernel banks U,U′,U″ (masked to 4-neighborhood, no diagonals); per frame, a CGRU cell is iterated n times (hyperparameter) to produce next state; decoded to next observation O_{t+1} and reward r_t. Enhancements (§IV): (a) 2D diagonal gating — state split 5 ways, fixed-kernel convolutions copy tile info to neighbors (eq. 2: s_i=u_i⊙s̃_i+(1−u_i)⊙c_t); (b) selective gating variant; (c) PDT (progressive data training) curriculum; (d) separate reward-prediction network decoupled from mechanics; (e) training over multiple states. Key property: changing (W_s,H_s) changes zero parameters → unbounded size generalization.

## 4. Equations & assumptions
- CGRU update with 2D diagonal gating (eq. 2); n-iteration per-frame processing; selective gating variant.
- Assumes: deterministic, fully observable, grid-structured, tile-local dynamics; discrete actions; no stochasticity, no global state changes (both stated as limitations, §VI).

## 5. Features / target
Inputs: encoded observation image O_t + action. Targets: next observation O_{t+1} (per-tile classification) + scalar reward r_t. Metrics: tile F1 (F_t), reward F1 (F_r), MSE (E_mse) over rollout horizons.

## 6. Validation design
Sokoban ablations: 3 gating mechanisms (Fig. 2); vs FeedForward conv net, Recurrent Environment Simulator (autoencoder+LSTM), stochastic state-space model (Fig. 3) — all trained 1.28M frames on fixed 10x10; iteration ablation n=1 vs n=2 ± PDT (Fig. 4); size generalization: 10x10-trained models rolled out on 30x30→100x100 grids, 500 steps × 10 repeats (Table I); 10 GVGAI games full results (Table II). Baselines are other learned forward models, compared on identical data.

## 7. Numerical results / baselines
- Gating (Fig. 2, Table I): selective gating trains fastest, most stable over long horizons.
- vs baselines (Fig. 3): NGE achieves lowest E_mse and highest average F_t of the four methods on Sokoban.
- Iteration ablation (Fig. 4): n=2 reaches very high rollout accuracy vs 5 hand-built GVGAI levels; n=1 plateaus at much lower accuracy — multiple iterations are vital for non-local interactions (e.g., block-against-wall).
- Size generalization (Table I): 10x10-trained model on 30x30/50x50/70x70/100x100: max E_mse 7.5–8.3e-6, F1 = 1.0 everywhere over 500 steps — zero degradation at 100x the cells.
- 10 GVGAI games (Table II): most games learned with F_t = 1.0 and F_r = 1.0 (perfect pixel and reward prediction). Failures: aliens (stochastic enemies, partial observability) min F_t = 0.73; clusters reward completely unlearned (reason unclear).

## 8. Code / data availability
Pre-trained models via OpenAI Gym interface, public: https://github.com/Bam4d/Neural-Game-Engine.

## 9. Leakage & limitations
- Deterministic tile grids only; stochastic elements and global state changes explicitly unsupported (aliens F_t=0.73).
- Single-step prediction: latent events that don't change the observation tile are lost (key-holding example, §VI).
- Data distribution: random levels + random agents under-sample rare local patterns; authors suggest curiosity/planning agents for better coverage.
- Football is continuous, stochastic, and non-grid — the architecture doesn't transfer directly, only the mechanism (iterated local updates, size invariance, decoupled reward head, GPU-parallel learned engine).

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no Neural-GPU / cellular-automata forward models in the corpus. Complements the Transformer world models (ledgers 2204–2208): NGE is the only *local-iterative* forward model — O(1) parameters in entity count, exact size generalization — vs the Transformers' attention-based global mixing. Distinct mechanism, new capability.

## 11. GSE implementation spec
Graph Neural Game Engine for NFL: (1) Represent the play as a player-interaction graph (23 nodes, edges by proximity/assignment); replace the tile grid with graph convolution and the CGRU iteration with n=3 rounds of message passing per 100ms step — non-local interactions (blitz pickup cascades, coverage rotations) propagate through iteration, exactly the paper's n=2 mechanism. (2) Size invariance: parameter count independent of node count — the same model handles 11v11, 7v7 drills, or injury-depleted lineups without retraining. (3) Decoupled reward head predicting play EPA, trained separately from the mechanics (the paper's §III reward separation). (4) Serve as a GPU-parallel learned engine: thousands of copyable play simulators for MCTS over play calls and 4th-down decisions — the paper's §VI application, directly. Effort: ~4–6 engineer-weeks; graph data pipeline from NGS tracking is the main cost.

## 12. Reproducible test
Dataset: 2022–2024 NGS tracking, all plays, 10 Hz. Metric: +0.5s/+1s per-player position error of iterated (n=3) vs single-round (n=1) message passing — the paper's Fig. 4 ablation, ported: n=1 must plateau lower, proving iteration carries non-local effects. Size-generalization test: train on 11v11 only, evaluate on 7v7 drill tracking (if available) or masked 8v8 subsets — error degradation must be <10% (the paper's Table I analog). Baseline: single-round GNN forward model.

## 13. Acceptance / rejection gate
ADOPT if on held-out 2024 plays: (a) n=3 message passing beats n=1 on +1s position error by ≥15% (iteration matters), AND (b) 11v11-trained model evaluated on reduced-roster subsets degrades <10% (size invariance holds), AND (c) 500-step (50 s) rollouts stay within 2.0 yards mean error (long-horizon stability — the paper's 500-step claim). Reject if iteration shows no gain (football interactions are effectively local) or if the decoupled EPA head underperforms a jointly trained head by >10%.

## 14. Improvement experiment
Go beyond the paper: add a *stochastic* branch the authors lacked — a CVAE latent per message-passing round modeling outcome uncertainty (tipped balls, broken tackles), keeping the deterministic mechanics path exact. Hypothesis: hybrid deterministic-mechanics + stochastic-event model beats pure deterministic on +1s error for plays with contact events (tackles, contested catches) by 15%+, while matching it elsewhere — fixing the paper's admitted aliens-class failure in the football domain. Test on a contact-event subset vs clean subset.
