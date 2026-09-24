# [2206] ConsistWorld: Evidence Routing for Consistent Multi-Agent World Models (arXiv:2609.22641)

**Citation:** Xu, Q., Zeng, X., Liao, X., Cheng, W., Yu, G. & Zhang, C. (2026). *ConsistWorld: Evidence Routing for Consistent Multi-Agent World Models*. arXiv:2609.22641. URL: https://arxiv.org/abs/2609.22641
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT

## 1. Research question
Autoregressive video world models are single-observer; extending to multiple independently-controlled agents requires consistency across views and across temporal gaps under causal streaming. The paper asks: from one shared source image of a static scene, can K camera-controlled video streams be generated such that independently controlled observers depict the same scene consistently — including when they visit the same region from different viewpoints or at different times? Consistency is formulated as *evidence routing*: routing evidence from committed multi-agent history and concurrently generated peer views to the tokens being generated. (Abstract, §1)

## 2. Dataset / schema
- **Training stage 1:** MultiCamVideo — 3,400 Unreal Engine scenes synchronously observed from 10 cameras; 81 frames at 240×416 per sequence, 5 autoregressive chunks; multi-agent teacher forcing → self-resampling (Resampling Forcing).
- **Training stage 2:** 1,000 multi-camera scenes rendered with Infinigen assets; 8 synchronized camera streams, 141 frames, 9 autoregressive chunks, trajectories with repeated cross-time/cross-viewpoint observations; K∈{1,2,3,4} agents sampled.
- **Eval:** held-out MultiCamVideo scenes (people removed from conditioning); held-out Infinigen scenes rendered along identical camera trajectories for reference-based metrics; Ditto-1M real-world images for qualitative out-of-domain checks. Eval data released: https://huggingface.co/datasets/CeciliaXu00/multicam_no_person. All synthetic/rendered; no real sports content.

## 3. Method / model
Causal multi-agent generation: rollout factorized p_θ(X_{0:T−1}^{1:K}|I_0,C_{0:T−1}^{1:K}) = ∏_p p_θ(X_p^{1:K}|I_0,X_{<p}^{1:K},C_{≤p}^{1:K}) (eq. 1); all agents' current chunks denoised jointly, then frozen as committed history; agents share the backbone, distinguished only by Plücker camera conditions. Per query (agent v, step p), evidence split into committed base context B_p^v = S ∪ W_p ∪ R_p^v (source tokens ∪ recent committed chunks ∪ retrieved long-term memory, eq. 2) and peer context P_p^v = {noisy chunks of other agents} (eq. 3). Two mechanisms (§3.2):
1. **Pose Conditioned Memory Retrieval:** maintain a shared archive of committed chunks; rank candidates by geometric score s(q,m)=½(O_{m→q}+O_{q→m}) + λ·ReLU(d_qᵀ d_m) (eq. 6), where directed frustum overlap O_{a→b}=(1/|F_a|)Σ_{x∈F_a} 1[z_b(x)>0 ∧ π_b(x)∈Ω_b] (eq. 5) uses canonical-depth frustum probes (no estimated depth needed) plus viewing-direction agreement. Retrieve top-scoring chunk(s) as R_p^v — bounded active context, fixed retrieval budget.
2. **Visibility-Gated Peer Sharing:** per query token i with world ray r_i, compute coverage C_i=max_{f∈F(B_p^v)} ν(r_i,f) (support from committed evidence) and peer score P_i=max_{f∈F(P_p^v)} ν(r_i,f) (visibility from current peers), with directional FoV coverage ν(r_i,f)=1[R_fᵀ r_i]_z>0 · φ_f(π_f(R_f r_i)) (eqs. 7–8, φ_f soft boundary inclusion). Gate G_i=(1−C_i)P_i (eq. 9) — large when history is insufficient but a peer sees the region; final attention a_i = a_i^base + G_i(a_i^full − a_i^base) (eqs. 10–11), blending no-peer and with-peer attention per token.

## 4. Equations & assumptions
- Eqs. 1–4 (rollout factorization, base/peer context split, archive definition), eqs. 5–6 (frustum overlap + retrieval score), eqs. 7–9 (ray coverage, peer score, gate), eqs. 10–11 (gated attention blending). See §3 for exact forms.
- Stated assumptions: static scene; one shared source image initializes all streams; camera poses known (Plücker conditions); bounded retrieval budget and fixed recent window keep context bounded; all agents share parameters.

## 5. Features / target
Inputs: source image I_0, K camera trajectories (controls), committed history archive. Targets: next latent video chunks per agent. Evaluation targets: Region LPIPS (perceptual disagreement between current observation and previously established scene content over valid historical regions), LPIPS-MG (R2M-Bench revisit calibration), GT-LPIPS/PSNR/SSIM on rendered references, VBench IQ/AQ for visual quality.

## 6. Validation design
Three consistency protocols: Self-Revisit (agent re-observes own earlier regions), Synchronous Cross-Agent Sharing (streams diverge then re-overlap), Asynchronous Cross-Agent Handoff (follower agent recovers leader's earlier observations). Ablations: retrieval on/off × gating on/off; full-history baseline (all history in context); rollout-length sweep (16/24/32 chunks, beyond 9-chunk training); unseen agent count K=5 (trained on K∈{1..4}). No external baselines — "directly comparable methods had not released code/checkpoints" (§4.2). Time-ordering N/A (generative).

## 7. Numerical results / baselines
- Consistency (Table 1, Region LPIPS ↓): Self-Revisit 0.1181 (IQ 0.6781, AQ 0.5240); Sync Sharing 0.1179 (IQ 0.7511, AQ 0.5735); Async Handoff 0.0700 (IQ 0.6997, AQ 0.5714).
- Ablation (Table 2): full 0.1176 / LPIPS-MG 0.4767 vs w/o retrieval 0.3374/0.2273 vs w/o gating 0.1983/0.2401 vs neither 0.3818/0.1332 — retrieval is the dominant component; IQ/AQ stable across ablations (full model best: 0.6645/0.5052).
- vs full-history baseline (Table 3): PSNR 18.5583 vs 17.6799, SSIM 0.4526 vs 0.4386, GT-LPIPS 0.4206 vs 0.5203 — selective retrieval beats keeping all history (avoids drift from redundant/conflicting observations).
- Long-horizon (Table 4, 16/24/32 chunks): 0.1046/0.1088/0.1267 vs baseline 0.3820/0.4170/0.4503 — stable well beyond training horizon.
- Agent-count (Table 5, K=2/4/5): 0.1079/0.1221/0.1107 — non-monotonic, generalizes to unseen K=5.

## 8. Code / data availability
Code: https://github.com/CeciliaTheBirb/ConsistWorld; models: https://huggingface.co/CeciliaXu00/ConsistWorld; eval data: https://huggingface.co/datasets/CeciliaXu00/multicam_no_person (links extracted from paper PDF annotations).

## 9. Leakage & limitations
- Static scenes only — no dynamic agents, no interaction physics; NFL plays are the opposite (22 moving agents). The evidence-routing math transfers; the trained model does not.
- No external quantitative baselines (code unavailability claim); consistency metrics are self-referential (Region LPIPS vs own committed history).
- Video-generation framing (240×416, latent chunks) — pixel rendering is not GSE's product; the value is the routing/gating mechanism.
- Assumes known camera poses per stream; NFL broadcast cameras need per-segment calibration (cf. ledger 2202).
- External validity: the "asynchronous cross-agent handoff" protocol is conceptually close to multi-view sports fusion (one camera's earlier observation constraining another's later view), but demonstrated only on synthetic rooms.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no evidence-routing / cross-view-consistency work in the corpus; wave-5a world-model papers (per lane brief) don't address the multi-camera fusion problem. New capability. Connects to ledgers 2202–2203 (ball trajectory from video): the retrieval score (eqs. 5–6) and visibility gate (eq. 9) give a principled way to fuse broadcast + All-22 + end-zone views of the same play — retrieve only the geometrically relevant historical chunks, gate peer-view influence by coverage.

## 11. GSE implementation spec
Multi-view play fusion module: (1) Inputs: per-play video from broadcast, All-22, end-zone angles with calibrated camera poses (field-marking PnP per segment). (2) Replace "video chunks" with *state chunks*: per-chunk player/ball tracks in field coordinates + camera pose. (3) Implement pose-conditioned retrieval (eqs. 5–6) over the committed chunk archive to recover evidence beyond the current temporal window (e.g., pre-snap formation from 30s earlier in the broadcast feed). (4) Implement the visibility gate (eqs. 7–9) to weight which camera's detections update the shared state per field region — broadcast dominates the line of scrimmage, All-22 dominates downfield. (5) Output: a single consistent per-play state timeline feeding the NGS-complement tracking store. Effort: ~3 engineer-weeks for the retrieval+gating logic on top of existing tracking; no video generation involved.

## 12. Reproducible test
Dataset: 2024 NFL plays with both broadcast and All-22 video (subset with NGS tracking as GT). Metric: cross-view state agreement — mean player-position disagreement between views after fusion vs before fusion; plus a "handoff" test: mask the broadcast view for 2 seconds mid-play, reconstruct from All-22 via retrieval, measure position error vs NGS GT. Baseline: naive per-view independent tracking + averaging. The gated fusion must cut cross-view disagreement by ≥30% and keep handoff reconstruction error ≤ 1.0 yard mean.

## 13. Acceptance / rejection gate
ADOPT if on held-out 2024 plays: (a) fused cross-view player-position disagreement ≤ 0.5 yards mean (vs ≥0.8 yards for naive averaging), AND (b) retrieval-based handoff reconstruction error ≤ 1.0 yard, AND (c) ablation shows the visibility gate (not just retrieval) contributes ≥15% of the disagreement reduction — the gating mechanism must earn its keep. Reject if geometric retrieval shows no advantage over recency-based retrieval (newest-N chunks) — that would mean camera geometry adds nothing over temporal proximity.

## 14. Improvement experiment
Go beyond the paper: the paper's scenes are static, so retrieval is purely geometric. For football, add a *semantic* retrieval score — weight chunks by play-context similarity (down/distance/formation hash) in addition to frustum overlap. Hypothesis: when a team re-runs a formation, retrieving the earlier play's tracks (semantic match) improves pre-snap state estimation more than geometric overlap alone — test via formation-repeat plays: semantic+geometric retrieval vs geometric-only on pre-snap player-position error.
