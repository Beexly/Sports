# [2204] Population-Scalable Multi-Agent World Modeling (Khora) (arXiv:2608.08600)

**Citation:** Zhao, R., Wu, Y., Zhang, M., Li, J., Li, S., Li, H., Sheng, Y., Tan, T., Zhang, Z., Liang, J., Zhu, J. & Li, Y.-L. (2026). *Population-Scalable Multi-Agent World Modeling*. arXiv:2608.08600. URL: https://arxiv.org/abs/2608.08600
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Multi-agent world models achieve cross-view consistency, but all existing ones assume a fixed agent population at training time — adding agents at inference requires retraining or architectural changes. The paper asks: can a world model support inference-time expansion to arbitrary agent counts without retraining, while keeping cross-view action/world consistency and near-linear compute scaling? The proposed answer is Khora: decouple world-state evolution (population-agnostic shared state) from visual rendering (per-view queries), so consistency lives in the shared state rather than in dense interactions inside the video generator. (Abstract, §1)

## 2. Dataset / schema
Trained and evaluated on synchronized multi-agent trajectories with aligned visual observations, actions, and structured state supervision in open-world game-like environments (Minecraft-style / multiplayer battlefield settings per figures and the related-works framing; exact environment names and trajectory counts are not stated as a named public dataset). Evaluation uses 10,000 held-out cases for the 2-view and 4-view settings (20,000 / 40,000 videos) and 159 cases / 1,272 videos for 8 views. No public dataset release stated; project page https://rhos.ai/research/khora, demo https://ophilus.ai/khora, blog https://ophilus.ai/blog/khora.

## 3. Method / model
Three components (§4), formalized as: state init S_0,{p_0^i}=E(G,O_0) (eq. 1); autoregressive transition S_{t+1},{p_{t+1}^i}=F_θ(S_t,{p_t^i,a_t^i};G) (eq. 2); per-view rendering o_{t+1}^i=R(S_{t+1},{p_{t+1}^i},G) (eq. 3).
1. **STBoard (spatio-temporal board, §4.1):** persistent shared representation = static scene memory (from coarse static prior G, refined from visual trajectories) + dynamic entity table of active agents in shared world coordinates (identity, pose, velocity, orientation, occupancy, task state). Agents are table entries, not fixed view slots — adding an agent = initialize entity state from its first observation + append to table + issue a rendering query.
2. **Action-conditioned world evolution (§4.2):** per-agent deterministic kinematic proposal p̂_{t+1}^i=K(p_t^i,a_t^i) (eq. 4) + learned residual Δ(S_t,G,p̂_{t+1}^i,a_t^i) for collisions/terrain/agent interactions (eq. 5); shared state update S_{t+1}=U(S_t,{p_{t+1}^i,a_t^i};G) (eq. 6).
3. **Geometry-guided view synthesis (§4.3):** entities projected into target camera frame u_{t+1}^{i,j}=Π(p_{t+1}^i,p_{t+1}^j) (eq. 7), rasterized with depth-aware occlusion handling into fixed-shape conditioning map C_{t+1}^i∈R^{H×W×C} encoding occupancy/depth/orientation/identity/state (eq. 8); shared diffusion-transformer neural renderer o_{t+1}^i=R(S_{t+1},C_{t+1}^i,p_{t+1}^i;G) (eq. 9), reused per view. Cost: T≈N_v·C_render + N_a·N_v·C_proj (eq. 10), C_render≫C_proj; projection <8% of latency up to 80 agents.
Baseline: "Khora w/o Cross-Agent State" — same renderer, other agents' entity entries masked.

## 4. Equations & assumptions
- Eqs. 1–3 (init/transition/render formalization), eqs. 4–6 (kinematic proposal + learned residual + state update), eqs. 7–9 (projection, rasterization, rendering), eq. 10 (cost model). See §3 for exact forms.
- Stated assumptions: a coarse static world prior G (point cloud) exists per environment and supplies the global coordinate scaffold; synchronized multi-agent training trajectories with action labels are available; static scene memory is adapted per map (no zero-shot unseen-environment deployment); the renderer is a diffusion transformer used as observation decoder, not the world model itself.

## 5. Features / target
Inputs: coarse static prior G, initial observations O_0={o_0^i}, action streams A_t={a_t^i} per timestep. Targets: next-step agent poses, updated shared state, and per-view observations; evaluation targets are visual-quality metrics and human-rated consistency, plus runtime scaling.

## 6. Validation design
Four evaluation axes (§5): (1) visual quality — PSNR/SSIM/LPIPS (paired vs synchronized GT frames), FID (frames), FVD (clips), one rollout per conditioning sequence, no best-of-K; (2) multi-agent consistency — user study on 5-point scale for cross-view action consistency and cross-view world consistency, multiple raters, mean + 95% CI; (3) scalability — per-component latency, per-view FPS, VRAM, aggregate throughput, 1–80 agents; (4) dynamic population — rollout 2→4→8→4 agents with joins/leaves mid-rollout. Compared against Solaris (Savva et al. 2026, 2-view only) and the no-cross-agent ablation. Time-ordering N/A (generative evaluation).

## 7. Numerical results / baselines
- Visual quality (Table 2): at 2 views, Khora PSNR 26.2425 / SSIM 0.7130 / LPIPS 0.1789 / FID 7.7098 / FVD 36.5529 vs Solaris 20.1465 / 0.5273 / 0.1835 / 4.3726 / 11.4263 (Khora wins paired fidelity; Solaris wins distribution FID/FVD). At 4 views: Khora 25.2825/0.7020/0.1772/7.9821/38.6849 (Solaris unsupported). At 8 views (159 cases): Khora 26.5775/0.7573/0.1477/27.0311/53.6148. Cross-agent state consistently improves over the isolated variant (e.g., FVD 36.55 vs 51.67 at 2 views).
- User study (Table 3): action consistency 3.5700 (Khora) vs 2.0750 (w/o cross-agent); world consistency 4.2133 vs 4.0650; overall 3.8917 vs 3.0700 — cross-agent state is decisive for action consistency.
- Scalability (Fig. 5, §5.3): 1→80 agents, per-step latency 107.16 ms → 116.73 ms; per-view FPS 37.33 → 34.27; aggregate throughput 37.3 → 2741.3 view-fps; peak VRAM/GPU ~constant.
- Dynamic population (§5.4): 2→4→8→2 agent rollout works with no retraining; existing agents' trajectories preserved when agents join/leave.

## 8. Code / data availability
Project page, live demo, and technical blog listed (rhos.ai/research/khora, ophilus.ai/khora, ophilus.ai/blog/khora). No code repository or dataset download stated in the paper.

## 9. Leakage & limitations
- Authors admit (§6): evaluation is "primarily qualitative" — no systematic benchmark of long-horizon drift, which is the failure mode that matters for play simulation; requires a per-environment static prior (no zero-shot new stadium/field); O(N_a·N_v) worst-case projection cost.
- No quantitative state-accuracy metrics (positions/velocities) — only perceptual metrics + human ratings; for GSE, state accuracy (yard lines, speeds) is the product, not pixel fidelity.
- Game-world visuals, not sports; the action space (movement/camera) is simpler than 22 football players with play-structured behavior.
- External validity to NFL: the *architecture* (shared state table + explicit transition + per-query rendering) transfers directly; the video renderer does not need to transfer — GSE would render state, not pixels.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md: wave-5a covered Dreamer/diffusion planners/GameNGen/Genie/graph-network physics (per this task's lane brief) — none of them separates population-agnostic shared state from per-view querying with inference-time agent add/remove. GSE has no multi-agent play simulator; this is a new capability and the cleanest architectural template found so far for the "NFL play counterfactual engine" (what if the blitz came from the other side: remove/add rusher entities, re-roll the shared state, compare outcomes).

## 11. GSE implementation spec
NFL counterfactual play simulator ("Khora-for-plays"): (1) State: STBoard-equivalent = static field context + dynamic entity table of 22 players (position, velocity, orientation, role, team) + ball state; entities stored in field coordinates, not pixels — no neural renderer needed, state IS the product. (2) Transition: per-player kinematic proposal from play design (route trees, blocking assignments) + learned residual transformer for interactions (blocks, tackles, coverage reactions) trained on NGS tracking; ball physics from ledgers 2202–2203. (3) Queries: "render" = project state to any view (All-22, broadcast, per-player POV) as structured tracks, not video. (4) Counterfactuals: edit entity table (move a blitzer, swap coverage), re-roll 5 seconds, read out conversion/sack/turnover rates over K stochastic rollouts. Effort: ~6–8 engineer-weeks for the state-transition model; the rendering half is skipped entirely (structural simplification vs the paper).

## 12. Reproducible test
Dataset: 2023–2024 NFL NGS tracking, passing plays, first 3 seconds post-snap. Metric: counterfactual consistency — take real plays, mask one defender's trajectory, re-simulate with the world model, and measure (a) state reconstruction error (mean player position error at +1s/+2s/+3s vs held-out real), and (b) population robustness: drop/add agents mid-rollout (injury/substitution simulation) and verify the rollout doesn't diverge (position error < 2.0 yards at +2s with 20 or 24 entities vs 22). Baseline: per-player independent trajectory predictor (no shared state). The shared-state model must beat the independent baseline by ≥15% on +2s position error.

## 13. Acceptance / rejection gate
ADOPT the architecture if: (a) +2s mean player position error ≤ 1.5 yards on held-out 2024 plays, AND (b) counterfactual re-rolls with ±1 defender produce outcome-rate shifts (conversion/sack/turnover) that match held-out real-play base rates within 10% relative when the counterfactual equals the real play (sanity calibration), AND (c) adding/removing entities mid-rollout keeps error within 1.2× of the fixed-population error. Reject if shared-state modeling shows no gain over independent per-player prediction — that would falsify the core value proposition.

## 14. Improvement experiment
Go beyond the paper: the paper never quantifies long-horizon drift. Add a *consistency discriminator* factor — a learned energy term on the shared state penalizing physically impossible configurations (two players occupying the same spot, ball teleporting), trained contrastively on real vs perturbed NGS states, applied as a projection step after each transition update. Hypothesis: this cuts +3s drift by 20%+ vs the pure residual transition, because the discriminator encodes global constraints the local residual can't see.
