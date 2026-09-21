# [0215] Action Anticipation from SoccerNet Football Video Broadcasts (arXiv:2504.12021v1)

**Citation:** Mohamad Dalal, Artur Xarles, Anthony Cioppa, Silvio Giancola, Marc Van Droogenbroeck, Bernard Ghanem, Albert Clapés, Sergio Escalera, Thomas B. Moeslund (2025). *Action Anticipation from SoccerNet Football Video Broadcasts*. arXiv:2504.12021v1. URL: https://arxiv.org/abs/2504.12021
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2523 lines; all sections incl. results and ablations).
**Verdict:** REJECT — soccer broadcast-video action anticipation; same reasoning as [0214] (the TEAM/basketball paper, which adapts this paper's FAANTRA). FAANTRA is the stronger of the two video-anticipation references, and if GSE ever opens an NFL-video event-anticipation lane this is the paper to return to — but no current GSE lane needs it.

## 1. Research question
First structured benchmark for **action anticipation in football broadcast video**: predict on-ball actions (pass, drive, shot, header, cross, throw-in, tackle, ball-out, ball-player-block, high pass) that will occur in an unobserved anticipation window of T_a ∈ {5, 10} s, using only a preceding context window T_c, and temporally localize each anticipated action. Proposes the SoccerNet Ball Action Anticipation (SN-BAA) dataset, new mAP@δ anticipation metrics, and the FAANTRA baseline (an adaptation of the FUTR anticipation transformer). Also compares anticipation vs. a spotting "upper bound" (T-DEED with full window access).

## 2. Dataset / schema
SN-BAA, adapted from SoccerNet Ball Action Spotting (SN-BAS): 9 professional football matches, untrimmed; 12,433 actions total (one action every 3.30 s); C = 10 classes (goals and free-kicks excluded — 6 and 2 test observations respectively, too rare for a stable metric). Long-tail: passes and drives dominate; shots, blocks, successful tackles rare. Average 1.5 actions per 5 s anticipation window (max 8). Splits: 4 games train / 1 val / 2 test / 2 hidden (challenge). For test/challenge, videos clipped into 30 s clips via sliding window with stride T_a, enabling T_c ∈ [0, 30] s. Table 1: SN-BAA has "Very High" spontaneity vs cooking/TV/daily-life datasets — football's adversarial nature makes it the hardest anticipation domain. Dataset and code public: https://github.com/MohamadDalal/FAANTRA.

## 3. Method / model
**FAANTRA** (Football Action ANticipation TRAnsformer), adapted from FUTR:
- **Feature extractor:** RegNetY (200MF or 400MF variant), efficient 2D backbone, with Gate-Shift-Fuse (GSF) modules in the latter half for local spatiotemporal modeling; linear projection to d = 512; end-to-end training on fixed-length context clips (current-trend choice, cf. T-DEED for spotting).
- **Transformer encoder:** l_E = 4 layers, **local self-attention** (each token attends to k = 15 neighboring embeddings — ablation shows locality beats global attention), h = 8 heads, FFN + layer norm, learnable positional encodings added at each layer.
- **Transformer decoder:** l_D = 2 vanilla layers; q = 8 learnable queries (16 for T_a = 10), global self-attention then cross-attention into the encoder output → q×d refined queries.
- **Prediction head:** three parallel linear projections per query: actionness (detection) ŷ_d ∈ ℝ^{q×1} with sigmoid; class ŷ_c ∈ ℝ^{q×C} with softmax; absolute temporal position ŷ_t ∈ ℝ^{q×1} with identity.
- **Training:** ℒ_A = λ_D ℒ_D + λ_C ℒ_C + λ_T ℒ_T (detection BCE, classification CE, temporal-position MSE scaled by T_a in exponential space, à la FUTR); queries paired sequentially with ground-truth actions in temporal order, unpaired queries treated as non-actions (detection loss only); auxiliary **action segmentation loss** ℒ_S on the encoder output (frame-wise CE over F_c × (C+1) with label dilation r = 4 frames); ℒ = ℒ_A + λ_S ℒ_S. Joint training with SoccerNet Action Spotting (500 extra games) via duplicated heads. Config: T_c = 5 s at 6.25 fps (F_c = 32), 448×796, 30 epochs, AdamW, batch 4, lr 1e-4, 3 warmup epochs, cosine decay; λ_D = 1, λ_C = 1, λ_T = 10, λ_S = 1; class weights inversely proportional to frequency; aug: horizontal flip, Gaussian blur, color jitter. NVIDIA RTX 6000.
- **Inference:** per-query confidence = ŷ_c × ŷ_d (actionness) at predicted position ŷ_t.

## 4. Equations & assumptions
Equations (no numbered display equations; the loss is stated algebraically):
- Anticipation loss: ℒ_A = λ_D ℒ_D + λ_C ℒ_C + λ_T ℒ_T.
- Multi-task loss: ℒ = ℒ_A + λ_S ℒ_S.
- Position regression: MSE in exponential space with values scaled by T_a.
- Inference confidence: confidence(c) = ŷ_c · ŷ_d at ŷ_t.
**Assumptions:** short-term anticipation (fixed windows, not action sequences); each query maps to at most one future action; sequential pairing (temporal order) is the pairing rule — Hungarian pairing on time (Q-Hung(t)) or class (Q-Hung(a)) tested and rejected by ablation; auxiliary segmentation assumes past-action semantics transfer to future actions (strongly supported: removing AST drops avg mAP from 20.30 to 7.13).

## 5. Features / target
Input: RGB broadcast frames (448×796, 6.25 fps, 32 frames). Targets: for each of q queries — actionness (binary), class (10-way), absolute timestamp in [0, T_a]. Evaluation: mAP@δ for δ ∈ {1,2,3,4,5,∞} s (prediction correct if within δ/2 of GT), averaged across all six; mAP@∞ disregards localization entirely.

## 6. Validation design
Train on SN-BAA train split; val for early stopping; test set evaluation via mAP@δ, ablations averaged over two seeds. Upper bound: T-DEED (SOTA ball action spotting) given the anticipation window as context (full access to the "future"). Ablations: task (window length, §7.1), general components (spatial/temporal resolution, context length, AST, prediction-head variants, §7.2), architecture (l_E, l_D, attention locality k, query count q, §7.3).

## 7. Numerical results / baselines
- **Main results (Table 2, T_a = 5 s):** FAANTRA 400MF trained on SN-BAA only — avg mAP 19.08; 200MF — 20.30. Joint SN-AS + SN-BAA training: 200MF — 23.74; 400MF — 24.08 (δ=1: 9.74; δ=2: 17.47; δ=3: 24.11; δ=4: 28.56; δ=5: 31.13; δ=∞: 33.47). Larger backbone only helps with more data (overfits on SN-BAA alone). T_a = 10 s is worse (400MF joint: 19.90 avg). **Spotting upper bound T-DEED 400MF: avg 63.85** — a huge gap, especially at tight δ, showing localization of the unseen future is the hard part.
- **Per-class (Table 3, best model):** Pass 51.86, Drive 55.50, Header 25.05, Out 24.74, Throw-in 23.30, Cross 21.35, High Pass 11.72, Shot 10.08, Ball Player Block 9.16, Successful Tackle 8.02; all 24.08. Frequent predictable actions work; spontaneous rare ones (shots, blocks, tackles) don't.
- **Ablations (Tables 4–5):** halving spatial resolution → −5 avg points (15.57 vs 20.30); frame rate 6.25–12.5 fps optimal; context beyond 5 s plateaus; **removing auxiliary segmentation → 20.30 → 7.13** (largest single effect); Q-Act (with actionness) beats Q-EOS (16.90), Q-Bckg (16.32), Q-BCE (13.11); sequential pairing beats Hungarian (t: 13.92, a: 16.82); anchors (15.84) no better than query-based (20.30); local attention k=7 (20.27)/k=15 (20.30) beats global (17.70); l_E=4/l_D=2 optimal; q=8 optimal (= max actions in a 5 s window).

## 8. Code / data availability
Dataset and code public at https://github.com/MohamadDalal/FAANTRA. Fully usable — unlike [0214]'s NBA-gated dataset.

## 9. Leakage & limitations
- mAP@δ=1 of 9.74 (best model) is weak absolute performance; the 63.85 spotting upper bound shows how far anticipation is from deployment.
- 9 matches / 12,433 actions is a small, single-league dataset; SN-AS joint training (500 games) needed to unlock the larger backbone.
- Per-class collapse on the events GSE would actually care about analogues of: shots (10.08), blocks (9.16), tackles (8.02) — anticipation works for frequent routine events, fails for rare high-impact ones.
- Soccer broadcast footage; no NFL transfer: NFL actions (route breaks, blocks, tackles) are not the SoccerNet ball-action taxonomy, and GSE has no video lane.
- T-DEED 400MF results for T_a = 10 s missing (GPU memory) — incomplete upper bound.

## 10. GSE overlap
None — no video-based event-anticipation lane exists in the GSE corpus. This paper is the parent method of [0214]'s TEAM (TEAM explicitly adapts FAANTRA: encoder-only since one action per clip, single classification objective, no segmentation auxiliary task — which this paper shows is the single most important component, dropped in TEAM because each clip has one action). The portable insights for a hypothetical NFL-video lane are: (a) auxiliary segmentation of past context is critical (+13 avg mAP points); (b) local attention beats global; (c) keep the actionness head; (d) joint training with a related large dataset unlocks bigger backbones; (e) don't expect to anticipate rare high-impact events — frequent routine events are where the signal is.

## 11. GSE implementation spec
REJECT — no implementation warranted. If GSE ever opens an NFL-video event-anticipation lane (all-22/broadcast footage), the FAANTRA recipe to port: RegNetY-class efficient backbone + GSF, 4-layer local-attention encoder (k≈15), 2-layer decoder with q ≈ max events per window learnable queries, actionness/class/timestamp heads, mandatory auxiliary segmentation loss on the context window, joint training with a larger related dataset, and per-query confidence = class × actionness.

## 12. Reproducible test
Not applicable (REJECT). If the NFL-video lane opens: anticipation of next-play events (run/pass, targeted zone) in all-22 video, mAP@δ style metric, must beat a vanilla-3D-CNN baseline by ≥ 5 avg points and beat a spotting-with-future-access upper bound comparison reported alongside.

## 13. Acceptance / rejection gate
**Reject** for all current GSE lanes: soccer-video anticipation has no NFL transfer path, and even in-domain performance (mAP@δ=1 = 9.74) is far below any deployment bar; rare high-impact events — the only ones that would matter for betting — are the worst-performing classes. Revisit only if GSE opens an NFL-video lane with licensable footage.

## 14. Improvement experiment
From the paper's own ablation gaps: combine the two winners that neither paper tried — keep the auxiliary segmentation task (which TEAM dropped and FAANTRA shows is worth ~13 mAP points) AND add the ball-tracking auxiliary loss proposed in [0214]'s §IX-C2 (force attention onto the ball trajectory, which LayerCAM shows models ignore). In a future NFL-video lane, the analogous experiment: anticipation head + context segmentation auxiliary + ball-carrier tracking auxiliary, tested on whether the rare-event classes (shot/tackle analogues) move first.
