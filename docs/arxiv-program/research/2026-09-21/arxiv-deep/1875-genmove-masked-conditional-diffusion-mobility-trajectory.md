# [1875] One Fits All: General Mobility Trajectory Modeling via Masked Conditional Diffusion (GenMove) (arXiv:2501.13347)

**Citation:** Department of Electronic Engineering / BNRist, Tsinghua University (2025). *One Fits All: General Mobility Trajectory Modeling via Masked Conditional Diffusion*. arXiv:2501.13347. Published IEEE. URL: https://arxiv.org/abs/2501.13347
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Masked conditional diffusion unifying trajectory generation, recovery, and prediction in one model — with controllable generation and strong zero-shot transfer to unseen users — gives GSE synthetic play generation (rare-play augmentation), missing-frame recovery, and controllable counterfactuals ("generate a red-zone play with these properties").

## 1. Research question
Trajectory tasks (generation, recovery, prediction) share mobility patterns but differ in formats and conditioning. Can a single masked conditional diffusion model handle all of them — including extended tasks (controllable generation, scarcity-constrained prediction, long-term prediction) — and zero-shot transfer to unseen users?

## 2. Dataset / schema
- **ISP**: 90K+ users, Shanghai, 1 week, cellular base-station trajectories.
- **MME**: 6K+ users, Nanchang, 1 week, region-ID trajectories.
Split by user: 70/10/20 train/val/test. Schema: s_u = {l_1,…,l_n}, locations as lat/lon or region IDs at equal intervals. Privacy: anonymized, stored behind firewall.

## 3. Method / model
**Trajectory embedding:** spatial graph G=(V,E) for geographical continuity → dense representation e_all.
**Mask condition module** — 5 strategies mixed by adjustable ratios: (1) Random (recovery — arbitrary % of observed values); (2) Terminal (prediction — mask future tail); (3) Complete (generation — mask everything); (4) Sequential (continuous masking — mobility continuity pattern); (5) Circadian rhythm (mask 12am–6am — day/night pattern). e_co = e_all ⊙ m (conditional observation); e_ta^0 = e_all ⊙ (1−m) (task target).
**Contextual trajectory embedding:** p_u = LSTM_φ(h_u) from historical trajectories (similar users → similar embeddings). **Conditional Controller:** p_u = f_ξ(r_u), a flow-based model mapping condition features (e.g., radius of gyration) to user embeddings — plugin-style controllable generation.
**Noise predictor:** Transformer on (noisy target e_ta^t, 128-dim sinusoidal diffusion-step embedding t_emb, e_co, mask m, user embedding p_u). Classifier-free guidance: ε̃_θ = (1+ω)ε_θ(e_ta^t,t|e_co,p_u) − ωε_θ(e_ta^t,t|e_co,∅) (∅ = null token).
**Training:** L(θ) = E‖ε − ε_θ(e_ta^t,t|e_co,p_u)‖², 1000 diffusion steps; hyperparams: location embed 128, CNN channels 64, 4 transformer layers, 8 heads, lr 1e-3, batch 16; 8× RTX 2080 Ti. 5 runs averaged.

## 4. Equations & assumptions
- e_co = e_all ⊙ m; e_ta^0 = e_all ⊙ (1−m).
- p_u = LSTM_φ(h_u); p_u = f_ξ(r_u) (controller).
- ε̃_θ = (1+ω)ε_θ(·|e_co,p_u) − ωε_θ(·|e_co,∅); L(θ) = E‖ε − ε_θ(e_ta^t,t|e_co,p_u)‖².
- Assumptions: shared mobility patterns (periodicity, sequentiality, circadian rhythms) across tasks; mask patterns adequately encode task structure; user history embeddings capture transferable preferences; diffusion on trajectory embeddings (not raw coords) preserves spatiotemporal structure.

## 5. Features / target
Inputs: masked trajectory embeddings + mask + user embedding. Target: denoising noise ε at each diffusion step. Evaluation: generation (JSD on Distance, Radius, Duration, Daily-loc, Density, Trip distributions), recovery (Recall, MAP, Distance), prediction (Accuracy@k).

## 6. Validation design
- 6 tasks: unconditional generation, controllable generation (radius of gyration), recovery, next-location prediction, scarcity-constrained prediction, long-term prediction (up to 8 steps / 4 h).
- Baselines: generation (TimeGEO, MoveSim, VOLUNTEER, PateGail, DiffTraj); recovery (Linear, TrImpute, RF, AttnMove, PeriodicMove); prediction (Markov, DeepMove, STAN, DSTPP); general (LSTM, TrajGDM).
- Zero-shot: train on some users, evaluate on unseen users. Mask-ratio analysis (Fig. 14).

## 7. Numerical results / baselines
- Generation: ~13% average improvement over baselines across JSD metrics; generated heatmap "resembles the real trajectory distribution the most" (Fig. 9); controllable generation produces distinctly different ranges under different radius constraints (Fig. 10).
- Recovery: ~6% improvement on Distance (most representative metric).
- Next-location prediction: "only close to the best baseline" — honest admission that generality costs single-task peak performance.
- Long-term prediction (8 steps): significantly outperforms all baselines; gap widens with horizon (Fig. 12).
- Scarcity-constrained prediction: best (baselines need a recovery+prediction pipeline).
- Zero-shot (unseen users): Accuracy@5 +18% (scarcity-constrained), ~+20% (long-term 8-step) vs best baseline (Fig. 13).
- Mask ratio: optimal at 0.8, not 1.0 — multi-task training helps single tasks (Fig. 14).

## 8. Code / data availability
No code link stated in extracted text. Data: proprietary ISP/MME (China carriers) — not public.

## 9. Leakage & limitations
- Proprietary data, no code — unreproducible as presented.
- Honest: single-task prediction only matches (not beats) the best baseline; the generality tax is real.
- Human mobility patterns (circadian, base-station granularity) differ from 10Hz player movement; the sequential/circadian masks need football-native redesign.
- Exact table values figure-rendered; qualitative margins reported.
- Diffusion sampling cost at inference (1000 steps) — no latency analysis.

## 10. GSE overlap
GSE's rarest, most valuable plays (game-winning drives, trick plays, injuries) are data-scarce. GenMove gives three NEW capabilities: (a) synthetic play generation for augmenting tail scenarios; (b) controllable generation — "generate 3rd-and-long blitz-beating plays" as counterfactuals for stress-testing the engine; (c) missing-frame recovery for tracking gaps. The zero-shot-to-unseen-users result maps to unseen players/teams — directly relevant to early-season prediction with new personnel. Distinct from 1862–1874: the only generative (diffusion) method in this lane; complements the discriminative representation learners.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking embedded via field-graph (yard-line graph for geographical continuity, cf. their spatial graph).
2. Train masked conditional diffusion with football-native masks: random (frame recovery), terminal (future prediction), complete (play generation), sequential (continuous masking), plus "situational" masks (mask red-zone segments — the circadian analog).
3. Player/team embedding p_u from historical tracking (LSTM over past games); conditional controller for controllable generation (down/distance, field position, score differential as r_u).
4. Use for: synthetic augmentation of rare plays, tracking-gap recovery, counterfactual play generation for engine stress tests.
5. Effort: ~4 engineer-weeks (diffusion training is the heavy lift; consider DDIM for inference speed).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, user-split analog = team-split (train on 24 teams, zero-shot test on 8 unseen teams). Tests: (a) generated-play distribution similarity (JSD on yards-gained, play-duration, formation-spread distributions) vs real; (b) frame-recovery Distance on masked segments vs linear interpolation; (c) zero-shot: long-horizon (2 s) prediction Accuracy@5 on unseen teams vs best baseline. Run target: <1 week on 2–4 GPUs.

## 13. Acceptance / rejection gate
ADOPT if: (a) generated-play JSD ≤ 0.15 on yards-gained distribution (vs ≥ 0.25 for a Markov baseline), AND (b) zero-shot long-horizon prediction on unseen teams beats the best baseline by ≥ 10% Accuracy@5. REJECT if (a) fails.

## 14. Improvement experiment
Beyond the paper: (1) playbook-conditioned generation — replace the radius-of-gyration controller with a formation/personnel controller (11 personnel, shotgun, motion flags), testing whether the diffusion model learns formation-conditional play distributions well enough to generate plausible unseen formation–play combinations. (2) Adversarial-scenario generation: condition on "defensive look" (blitz indicators) to generate the offensive plays most likely to exploit it — a direct coaching tool. Hypothesis: formation-conditioned GenMove generates plays whose charted concept distribution matches real conditional distributions (JSD ≤ 0.20).
