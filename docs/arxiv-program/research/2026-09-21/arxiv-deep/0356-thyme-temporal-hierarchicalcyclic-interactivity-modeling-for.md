# [0356] THYME: Temporal Hierarchical-Cyclic Interactivity Modeling for Video Scene Graphs in Aerial Footage (arXiv:2507.09200v1)

**Citation:** Trong-Thuan Nguyen, Pha Nguyen, Jackson Cothren, Alper Yilmaz, Minh-Triet Tran, Khoa Luu (2025). *THYME: Temporal Hierarchical-Cyclic Interactivity Modeling for Video Scene Graphs in Aerial Footage*. arXiv:2507.09200v1. URL: https://arxiv.org/abs/2507.09200
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3060 lines).
**Verdict:** ADAPT — SOTA video scene graph generation with honest ablations and two-benchmark evaluation; the hierarchical + cyclic-attention recipe and the five-type interactivity schema are portable to GSE's real-footage clip tooling (player–player interaction graphs from tracking data), which is the same lane as ledgers 0349/0352's ADAPT decisions.

## 1. Research question
Can hierarchical multi-scale spatial aggregation combined with cyclic temporal attention produce temporally coherent, fine-grained video scene graphs (nodes = tracked objects, edges = typed predicates) that beat frame-level (predicate flickering) and video-level (fleeting-interaction dilution) methods, in both ground-view and aerial video?

## 2. Dataset / schema
- **ASPIRe** [32]: 1.5K videos, 1.6M frames, 833 object classes, 4.5K relation classes, 7 scenes; five interactivity types (appearance, situation, position, interaction, relation); ground-view.
- **AeroEye-v1.0 (introduced here):** built on AeroEye [33]; 2,260 videos, 261,503 frames, drone-captured urban/suburban/rural; 56 object categories, >2M bounding boxes with tracking; every frame annotated: 157 appearance predicates + 128 situation predicates per box; 135 position predicates (~752K annotations), 142 interaction predicates (~318K), 125 relation predicates (~178K); aerial + oblique + ground viewpoints — the only drone dataset with all five interactivity types.
- Predicate vocabularies include dynamic interaction predicates directly relevant to sports (approaching, overtaking, colliding, chasing, catching, dribbling, hitting); paper's qualitative examples use a tennis rally, basketball plays, and a person-3/ball-1 occlusion case.

## 3. Method / model
Four-stage THYME pipeline:
1. **Per-frame feature extraction:** DETR detector → object query embeddings {q_i^{(t)} ∈ R^{d0}} per frame.
2. **Hierarchical feature aggregation:** L_h levels; level-l update F_t^{(l)}(S_i^{(t)}) = σ(Σ_{S_j∈N(S_i)} a_{ij}^{(t)} (W^{(l)} F_t^{(l−1)}(S_j^{(t)}) + b^{(l)})) with attention a_{ij}^{(t)} = softmax over dot-products of level-(l−1) features; neighborhood = all objects in frame t.
3. **Cyclic temporal refinement:** per tracked object S_i, sequence X_{t′}(S_i) = F_{t′}^{(L_h)}(S_i) after temporal pooling; transformer encoder with cyclic attention CA_{t′}(S_i) = Σ_{τ=0}^{T′−1} α_{t′,τ}(S_i) V_{(t′+τ) mod T′}(S_i) — modulo links the clip tail back to its head to preserve long-range context; then LayerNorm + FFN → refined feature F̂(S_i) ∈ R^{d_{Lh}}.
4. **Scene graph construction:** predicate per object pair from gated fusion of DETR decoder self-attention relation representations R_a^k = [Q^k W_S^k; K^k W_O^k] across layers plus final-layer R_z, gating g = σ(R W_G), Ĝ = σ(MLP_rel(Σ_k g_a^k ⊙ R_a^k + g_z ⊙ R_z)).
- **Loss:** focal loss L(F_t^{(l)}) = −α_t(1−p̃_t)^γ log(p̃_t) per hierarchy level; L_total = Σ_{l=1}^{L_h} L(F_t^{(l)}).
- Baselines compared: IMP, MOTIFS, VCTree, GPSNet, STTran, TEMPURA, HIG (their hierarchical predecessor), CYCLO (their cyclic predecessor).

## 4. Equations & assumptions
- Hierarchy attention (eq. 1): a_{ij}^{(t)} = exp(F_t^{(l−1)}(S_i^{(t)})·F_t^{(l−1)}(S_j^{(t)})) / Σ_k exp(F_t^{(l−1)}(S_i^{(t)})·F_t^{(l−1)}(S_k^{(t)})).
- Hierarchy update (eq. 2): F_t^{(l)}(S_i^{(t)}) = σ(Σ_j a_{ij}^{(t)}(W^{(l)}F_t^{(l−1)}(S_j^{(t)}) + b^{(l)}).
- Cyclic attention (eqs. 4–5): CA_{t′}(S_i) = Σ_τ α_{t′,τ}(S_i) V_{(t′+τ) mod T′}(S_i); α_{t′,τ} = softmax over Q_{t′}·K_{(t′+τ) mod T′}/√d_a.
- Scene-graph readout (eq. 6): Ĝ = σ(MLP_rel(Σ_{k=1}^{L_d}(g_a^k ⊙ R_a^k) + g_z ⊙ R_z)).
- **Assumptions:** DETR detections + tracking give stable object identities (tracking errors propagate — authors flag this); modulo cyclic attention is meaningful for non-periodic clips (tail→head wrap is a heuristic, not a true cycle); focal loss with hierarchy-level supervision suffices for long-tail predicate imbalance; 2–3% recall gains are practically significant (no significance tests reported).

## 5. Features / target
- Inputs: video frames {I_t}_{t=1}^T; DETR object embeddings.
- Targets: per object-pair predicate across five interactivity types — appearance (157), situation (128), position (135), interaction (142), relation (125) predicate classes; scene graph G = (V, E) with tracked-object nodes.

## 6. Validation design
- **Datasets:** ASPIRe (ground-view) and AeroEye-v1.0 (aerial) — two viewpoints, same protocol.
- **Metrics:** Recall and mean Recall at top-20/50/100 per interactivity type (standard VidSGG protocol following PVSG/HIG/CYCLO).
- **Ablations:** hierarchy depth (1/4 → full), attention mechanism (standard vs cyclic), temporal window size (1/2 → full).
- **Baselines:** 8 prior methods including both of the authors' own predecessors (HIG, CYCLO) — honest self-comparison.

## 7. Numerical results / baselines
AeroEye-v1.0 (Table VI), THYME vs best prior:
- Position R@20 15.52 / mR@20 1.05 (CYCLO 13.52/0.75; HIG 12.51/0.85); Interaction 13.07/0.16 (CYCLO 12.61/0.14); Relation 16.03/0.95 (CYCLO 14.51/0.83); Appearance 16.52/0.68; Situation 5.53/0.61.
- R@100: Position 42.03/mR 2.15; Interaction 41.53/2.26; Relation 48.03/2.38.
ASPIRe (Table V), THYME:
- Position R@20 18.52/mR@20 1.22 (CYCLO 16.32/0.97); Interaction 19.52/0.32 (CYCLO 15.27/0.20); Relation 21.02/1.12 (CYCLO 18.34/0.90); Appearance 18.23/1.07; Situation 6.57/0.26.
- R@100: Position 50.05/2.53; Interaction 48.04/2.47; Relation 54.05/2.93.
Ablations (AeroEye-v1.0):
- Hierarchy depth: 1/4 → full raises Appearance R@20 14.12→16.52, Position 12.32→15.52, Interaction 10.87→13.07; gains plateau at 3/4 depth.
- Cyclic vs standard attention: Appearance R@20 15.12→16.52; Position 13.42→15.52; Relation 14.03→16.03 (+1.4–2.0 pp R@20 across types).
- Temporal window: 1/2 → full window consistently best, marginal 3/4→full.
- Claimed margins: 2–3% recall/mR over baselines on double-actor attributes; no confidence intervals or significance tests.

## 8. Code / data availability
- AeroEye-v1.0 dataset introduced (2,260 videos, five interactivity annotations). No explicit code repo URL in the extracted text.

## 9. Leakage & limitations
- **No statistical significance reporting:** 2–3% gains over their own prior methods (HIG, CYCLO) lack CIs/tests — could be within run variance; the paper leans on "consistent across types/datasets" instead.
- **Tracking dependence:** object identities come from DETR + tracking; the qualitative failure analysis (HIG losing ball-1 under occlusion) is a tracking failure mode THYME only partially mitigates.
- **Cyclic wrap is a heuristic:** linking clip tail to head assumes quasi-periodic content; for non-repeating plays the wrap injects spurious long-range links (unexamined).
- **Low absolute numbers:** mR@20 under 1.1% on AeroEye-v1.0 shows the task is far from solved; SOTA here means "least bad."
- **No sports-domain evaluation:** despite sports examples in the text, benchmarks are traffic/surveillance/aerial — SportsHHI [46] is cited but not evaluated on.
- **Domain mismatch for GSE:** aerial footage predicates (towing, escorting, crashing) don't transfer; only the architecture and the interactivity schema are portable.

## 10. GSE overlap
Per the existing-research-map: no video scene graph / relational interaction-modeling work exists in Garrett's corpus. Adjacent lanes: NGS tracking (kinematics, no relational predicates), STRAIN (effort), ledger 0349 TOTNet (temporal tracking), 0352 SV3.3B (sports video understanding/keyframes). This is the first *relational* video-understanding method — genuinely new, not duplicative. The five-type interactivity schema (appearance, situation, position, interaction, relation) is a reusable annotation framework for GSE's real-footage clip tooling.

## 11. GSE implementation spec
ADAPT the architecture pattern and schema, NOT the model (no sports data, no code released):
- **(a) NGS interaction-graph builder:** treat each play's 22 tracked players as graph nodes (features from NGS x/y/speed/accel/orientation instead of DETR embeddings). Apply the THYME recipe at the play level: (i) hierarchical aggregation — player-level → unit-level (OL/DL/secondary) → formation-level features via attention (eqs. 1–2 pattern); (ii) cyclic temporal attention over the play's frame sequence (eqs. 4–5) with the tail→head wrap replaced by *play-phase* cyclicity (pre-snap → post-snap phases recur across plays); (iii) predicate head predicting football interaction predicates per player pair: {blocking, shedding-block, in-coverage, separating, tackling, pursuing, screening} — the position/interaction/relation split from the paper maps directly (position = alignment predicates like "pressed/ off-coverage"; interaction = "engaging/disengaging"; relation = "responsible-for" coverage assignments).
- **(b) Annotation schema:** adopt the five interactivity types for GSE's real-footage clip metadata — appearance (jersey/uniform), situation (down/distance/score/time = the "situation" axis), position (alignment), interaction (contact events), relation (assignment/responsibility). This gives the clip tooling a typed relational vocabulary instead of free-text tags.
- **(c) Training signal:** focal loss per hierarchy level (eqs. 7–8) is directly reusable for GSE's long-tail event classes (rare events like pick-plays, coverage busts).
- Do NOT port: the DETR front-end (NGS gives clean tracks), the aerial predicate vocabulary, the tail→head wrap on non-periodic clips.

## 12. Reproducible test
- **Data:** 2–3 games of NGS tracking with charted events (tackles, blocks, coverage matchups from charting data) as predicate labels on player pairs per play.
- **Pipeline:** (1) build per-play player graphs from NGS frames; (2) train hierarchical-attention + cyclic-temporal model to predict interaction predicates per pair vs a frame-independent baseline (per-frame MLP on pair features); (3) metric = R/mR@K on held-out games, mirroring the paper's protocol.
- **Pass gate:** the THYME-style model beats the frame-independent baseline by ≥ 2 pp R@20 on interaction predicates on held-out games, with the gain concentrated in temporally-extended predicates (pursuit, coverage) rather than instantaneous ones (tackle) — i.e., the temporal component earns its keep. **Fail gate:** no gain over per-frame baseline → the hierarchy/temporal machinery is overkill for NGS's clean tracks; keep only the annotation schema (b).
- **Second test:** ablate cyclic attention vs standard attention on the same data; keep whichever wins (the paper's +1.4–2.0 pp claim is the hypothesis under test).

## 13. Acceptance / rejection gate
- **Accept as evidence** that hierarchical + cyclic temporal modeling improves video scene graph recall 2–3% over strong baselines across two benchmarks with coherent ablations — clears the evidence bar for the *architectural pattern*.
- **Gate the GSE port** on the reproducible test above: only build the NGS interaction-graph pipeline if it beats the per-frame baseline on held-out games. The annotation schema (five interactivity types) is adopted regardless — it's a zero-cost framework improvement.

## 14. Improvement experiment
- **(i) Replace the cyclic wrap with play-phase attention:** instead of modulo tail→head, segment each play into phases (pre-snap, post-snap, contact, whistle) and let attention cycle *within* phase types across plays in a game — tests whether true periodicity (repeated play structures) beats the paper's artificial wrap; hypothesis: phase-cyclic attention outperforms naive cyclic on football's highly structured temporal grammar.
- **(ii) Evaluate on sports data (the paper's missing experiment):** run THYME's architecture on SportsHHI [46] (the sports VidSGG dataset the paper cites but never benchmarks) — if the 2–3% margins hold on human–human sports interactions, the architecture claim generalizes beyond traffic/aerial; if they collapse, the gains are domain-specific.
- **(iii) Predicate-budget ablation for GSE:** test whether the five-type schema can be compressed (position+interaction merged) without losing retrieval performance on a clip-search task (find all pick-plays / coverage busts from text queries) — the operational question for the clip tooling is annotation cost per type, and the experiment identifies which types carry the retrieval signal.
