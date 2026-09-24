# 0008 SportMamba Multi-Object Tracking (arXiv:2506.03335v1)

**Citation:** Dheeraj Khanna, Jerrin Bright, Yuhao Chen, John Zelek (2025). *SportMamba: Efficient Multi-Object Tracking for Fast-Moving Sports*. arXiv:2506.03335v1. URL: https://arxiv.org/abs/2506.03335v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, University of Waterloo authors).
**Verdict:** ADAPT — the hybrid motion+appearance association design (HA-EIoU, confidence-adaptive matching, adaptive EMA) is directly reusable for extracting player tracking from public broadcast footage; do not adopt the paper's "superior across all metrics" claim, which its own table contradicts.

## 1. Research question
Can a Mamba (selective state-space) motion predictor, combined with a hybrid spatial–appearance association strategy, improve online multi-object tracking in fast-moving sports — where athletes move abruptly, occlude each other, and look alike in team uniforms — beyond existing tracking-by-detection baselines?

## 2. Dataset / schema
- **SportsMOT:** multi-sport tracking benchmark covering basketball, soccer, and volleyball. Used for primary evaluation.
- **VIP-HTD:** ice hockey tracking dataset. Used for **zero-shot transfer** evaluation (no hockey training).
- Exact video counts, track counts, frame counts, and train/test splits: **Not stated in paper** as recoverable from this reading.
- Access: public benchmarks (SportsMOT, VIP-HTD). Detector training data/setup: **Not stated in paper** as recoverable.

## 3. Method / model
**Online tracking-by-detection pipeline:**
1. A detector outputs per-frame bounding boxes `B_d = {x_t, y_t, w_t, h_t}` with confidence scores.
2. Each tracklet's recent bounding-box history is projected through a **linear token embedding**, then encoded by a **Mamba selective state-space encoder** (the motion model), followed by an **MHSA (multi-head self-attention) block** and an **FFN with GeLU and linear layers**. `M` such Mamba–attention blocks are stacked; an MLP head predicts the next-frame bounding box.
3. **Hybrid association** matches predicted tracklets to new detections:
   - **Height-adaptive extended IoU (HA-EIoU)** for spatial matching — extends the IoU matching region adaptively using box height, which helps when athletes' boxes deform during fast motion.
   - **Appearance (Re-ID) cosine similarity** for visual matching.
   - **Adaptive search buffers** around predicted positions.
   - **High-confidence detections** are associated using spatial + appearance jointly; **low-confidence detections** use stricter spatial-only matching (noisy appearance embeddings are ignored).
   - **Confidence-adaptive EMA** updates each tracklet's appearance embedding, weighting updates by detection confidence.
4. Mamba discretization uses **zero-order hold** (stated in the paper).
- Tracklet history length, embedding dimension, number of heads/layers `M`, confidence thresholds, EMA decay values, detector identity and training setup, optimizer/epochs/hardware, FPS: **Not stated in paper** as recoverable.

## 4. Equations & assumptions
Recovered from the full text (presented faithfully; notation as in the paper):

**State-space (Mamba) recurrence:**
- `h'_k = A h_{k-1} + B x_k`
- `y_k = C h_k`
with zero-order-hold discretization (stated; exact discretized matrices not reproduced in the recoverable text).

**Attention block:**
- `y_ln = LayerNorm(y_k)`
- `x_att = LayerNorm(MHSA(y_ln) + y_ln)`
- `head_i = Softmax(Q^i (K^i)^T / sqrt(d)) V^i`

**Loss (from the paper's poster text; exact paper notation to be re-verified against the PDF):**
- `L_s = λ_l1 L_L1^s + λ_ciou L_ciou^s` (smooth-L1 box loss plus CIoU loss; the exact smooth-L1 formulation and the λ coefficients were not recovered: **Not stated in paper** as recoverable).

**Assumptions (paper's):** bounding-box history alone carries enough motion regularity for a state-space model to beat Kalman-style or transformer predictors in sports; appearance embeddings are reliable for high-confidence detections but noise for low-confidence ones (hence the confidence-split association); height is a usable adaptive scale for the IoU matching region.

## 5. Features / target
- **Inputs:** per-frame detector bounding boxes `{x_t, y_t, w_t, h_t}` + confidence; tracklet box histories; Re-ID appearance embeddings per detection.
- **Target:** (a) predicted next-frame bounding box per tracklet (motion head); (b) tracklet↔detection assignment (association stage). Online: no future frames used.
- **Prediction horizon:** one frame ahead, per frame.

## 6. Validation design
- Trained/evaluated on SportsMOT (basketball/soccer/volleyball); zero-shot transfer to VIP-HTD (ice hockey).
- Baselines compared (exact, from the paper's tables): Deep-EIoU, *DiffMOT, MotionTrack, *OC-SORT on SportsMOT; ByteTrack, DiffMOT, ByteSSM on VIP-HTD.
- Metrics: HOTA, IDF1, AssA, MOTA, DetA.
- Train/test split protocol, ablation table, statistical significance: **Not stated in paper** as recoverable.

## 7. Numerical results / baselines
Quoted exactly from the paper's tables (paper claims; GSE corrections follow):

**SportsMOT:**
- SportMamba: HOTA **77.3**, IDF1 **77.7**, AssA **66.8**, MOTA **96.9**, DetA **89.5**
- Deep-EIoU: 77.2 / 79.8 / 67.7 / 96.3 / 88.2
- *DiffMOT: 76.2 / 76.1 / 65.1 / 97.1 / 89.3
- MotionTrack: 74.0 / 74.0 / 61.7 / 96.6 / 88.8
- *OC-SORT: 73.7 / 74.0 / 61.5 / 96.5 / 88.5

**VIP-HTD (zero-shot):**
- SportMamba: HOTA **65.1**, IDF1 **80.1**, AssA **64.6**, MOTA **76.2**, DetA **65.9**
- ByteTrack: 64.4 / **81.1** / **64.8** / 73.9 / 64.2
- DiffMOT: 64.1 / 79.4 / 63.6 / 76.1 / 65.0
- ByteSSM: 63.4 / 77.7 / 61.8 / **76.2** / 65.4

**GSE correction (important):** the paper's conclusion text claims zero-shot performance "superior across all metrics," but its own table contradicts this — on VIP-HTD, ByteTrack has higher IDF1 (**81.1 > 80.1**) and higher AssA (**64.8 > 64.6**), and MOTA ties ByteSSM at **76.2**. On SportsMOT, Deep-EIoU beats SportMamba on IDF1 (79.8 > 77.7) and AssA (67.7 > 66.8), and *DiffMOT beats it on MOTA (97.1 > 96.9). The honest reading: SportMamba is competitive on HOTA/DetA with the best association quality among recent methods on SportsMOT, but it does not dominate; margins are small and metric-dependent.

**Stated limitation (paper):** severe motion blur causes missed detections and weakened appearance cues, producing broken tracklets.

## 8. Code / data availability
**Not stated in paper** as recoverable from this reading. (No code URL was recovered; do not assume one exists.)

## 9. Leakage & limitations
- **Overclaimed results:** the "superior across all metrics" conclusion is falsified by the paper's own tables (§7). Treat all comparative claims adversarially.
- **Marginal SportsMOT gains:** HOTA 77.3 vs. Deep-EIoU 77.2 is noise; the method's value is the association design, not a leaderboard breakthrough.
- **No NFL/broadcast-footage test:** all evaluation is on basketball/soccer/volleyball/hockey benchmarks. American football broadcast footage (22 players, heavy occlusion at the line, near-identical uniforms, fast pans/zooms) is untested and strictly harder on appearance cues — the paper's own motion-blur failure mode will be worse there.
- **Detector dependence:** tracking-by-detection inherits the detector; detector identity, training data, and failure modes are undocumented in the recoverable text, so the reported numbers are not reproducible from the paper alone.
- **Missing ablations:** no recovered evidence isolating Mamba vs. attention vs. HA-EIoU vs. confidence-adaptive EMA contributions; cannot tell which component carries the (small) gains.
- **No compute/FPS numbers:** "efficient" is asserted via the Mamba architecture choice, not demonstrated with timings in the recoverable text.

## 10. GSE overlap
- Existing-research-map review: GSE's tracking work covers tracking *metrics* (STRAIN and related) computed on data that already exists (NGS/Big Data Bowl-style feeds). No existing research builds a **tracker that extracts player trajectories from raw video** — this ID is not among the 64 deeply covered papers. That is the gap this paper addresses: a path to proprietary-style tracking from public broadcast footage, which is the exact capability class the NGS profile keeps behind its API (per the metric-glossary read, NGS methodology backends are not public).
- This is a **new capability** (video → tracks), not a duplicate. It complements, rather than overlaps, the existing tracking-metrics work: those metrics need tracks as input, and this is a candidate track producer where official feeds are unavailable.

## 11. GSE implementation spec
1. **Scope narrowly:** do not build a general sports tracker. Target one GSE use case first: extracting skill-position player trajectories from public broadcast clips (e.g., All-22-style footage) for plays where official tracking is unavailable.
2. **Detector:** fine-tune an off-the-shelf detector (e.g., a recent YOLO-family model) on football frames with player bounding boxes; jersey-number OCR as a secondary identity cue (football-specific, addresses the uniform-similarity problem the paper notes).
3. **Motion model:** reimplement the Mamba box-history encoder + MLP prediction head per the paper's equations (§4); compare against a Kalman-filter baseline — the paper never does this comparison explicitly, and GSE should not assume Mamba wins on football motion.
4. **Association:** adopt the paper's confidence-split design verbatim (high-confidence: HA-EIoU + Re-ID cosine; low-confidence: strict spatial; confidence-adaptive EMA) — this is the most transferable idea.
5. **Evaluation:** hand-annotate a few hundred plays of broadcast footage with ground-truth boxes; report HOTA/IDF1 vs. a ByteTrack baseline on *football* data before any production use.
6. **Effort:** GSE inference only — no estimate stated as fact; scoping should include annotation cost, which dominates.

## 12. Reproducible test
- **Dataset:** a GSE-annotated set of ~200 NFL broadcast plays (balanced across run/pass, with heavy-occlusion line plays included), ground-truth boxes at 10 Hz-equivalent sampling.
- **Metric:** HOTA and IDF1, the paper's own headline metrics.
- **Baseline to beat:** ByteTrack with the same detector — the paper's VIP-HTD table shows ByteTrack is the strongest simple baseline (it beat SportMamba on IDF1/AssA there).
- **Window:** fixed annotation set; report per-play metric distributions, not just means (occlusion-heavy plays are the stress test).

## 13. Acceptance / rejection gate
- **ADOPT the association design** for GSE's video-tracking lane only if: on the football annotation set, the SportMamba-style pipeline beats ByteTrack by ≥ 3.0 HOTA points with the *same* detector, and the gain concentrates on occlusion-heavy plays (the failure mode that matters).
- **REJECT** if the HOTA delta is < 3.0 points, if gains vanish when jersey-number OCR is added to the baseline (meaning identity, not association, was the binding constraint), or if inference cost exceeds a practical per-play budget for batch processing — the paper gives no FPS numbers, so GSE must measure.

## 14. Improvement experiment
Beyond the paper: **jersey-number-conditioned association.** Replace the generic Re-ID embedding with a two-stream identity: (a) a jersey-number OCR/digit-recognition head producing a number posterior per detection, and (b) team-side classification (jersey color clustering per game). Association cost becomes a weighted sum of HA-EIoU, number-posterior agreement, and team agreement, with the confidence-adaptive EMA extended to the number posterior. Why it might win: the paper's appearance cues are weakest exactly where football is hardest (near-identical uniforms, motion blur at the line) — jersey numbers are the one appearance signal that is *invariant* to blur at moderate resolution and unique per player, directly attacking the paper's stated failure mode rather than tuning the motion model further.
