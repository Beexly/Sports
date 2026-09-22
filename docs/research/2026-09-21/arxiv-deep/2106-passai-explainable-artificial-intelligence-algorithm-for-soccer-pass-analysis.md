# [2106] PassAI: explainable artificial intelligence algorithm for soccer pass analysis using multimodal information resources (arXiv:2503.08945)

**Citation:** Ryota Takamido, Jun Ota, Hiroki Nakamoto (2025). *PassAI: explainable artificial intelligence algorithm for soccer pass analysis using multimodal information resources*. arXiv:2503.08945v1. URL: https://arxiv.org/abs/2503.08945
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF; ar5iv HTML returned only the page shell, so the PDF was used).
**Verdict:** ADAPT
**Rationale:** the most directly transferable paper in this lane: tracking-image + seasonal-stats two-stream classifier with two-stage multimodal explainability (which modality mattered, then which features within it). Maps almost 1:1 onto NFL pass-completion modeling; needs adaptation (NFL tracking images, QB stats, NFL outcome labels).

## 1. Research question
Two questions: (1) how to USE different-modality data (tracking + seasonal stats) jointly for sports action analysis, and (2) how to EXPLAIN the rationale of the outcome from multimodal perspectives — i.e., not just classify pass success/failure, but tell the coach whether the tracking context or the passer's attributes drove the decision, and which factors within each.

## 2. Dataset / schema
95 games from the 2023 and 2024 seasons of Japan's J1 professional football league, provided by Data Stadium, Inc. (proprietary — not publicly shared; authors will explain on request). Tracking: player + ball positions at 25 Hz. Event data: action labels (pass), frame, result (success/failure). Player data: names/teams. Seasonal passer stats scraped from the official J1 League site (jleague.jp). Analysis target: 6,349 passes arriving within 30 m of the goal — 3,663 successful, 2,686 failed. Proprietary tracking; the stats side is public-web scrapable.

## 3. Method / model
- **Input 1 — tracking image** (224×224×3): positions + velocity vectors of all players and ball at pass moment; ball departure→arrival connected by a dotted line; offense/defense distinguished by color; open space rendered white ([255,255,255]); field scaled to x,y ∈ [−1,1]. Image-based (not graph-based) representation chosen to explicitly encode open-space information.
- **Input 2 — passer stats vector** (15-d, standardized): seasonal passing indexes (total passes, success rates, long-pass counts, etc.); includes total×success-rate products to stabilize low-count passers; captures "hub" role in passing network.
- **Architecture**: ConvNeXt-Tiny (pretrained, fine-tuned) on the image → 768-d (stem: 4×4 stride-4 patchify; blocks: 7×7 depthwise conv + LayerNorm + 1×1 conv; 2×2 stride-2 downsampling); MLP with one 64-unit hidden layer on the stats → 64-d. Streams concatenated → FC layer → softmax over {success, failure}.
- **Two-stage explanation**: Stage 1 — relative modality contributions via input gradients: C_B = Σ_{i,j,k} |∂y/∂x_{ijk}| (tracking image), C_S = Σ_i |∂y/∂v_i| (stats vector), each standardized to [0,1] across passes (cross-pass comparison only, not cross-modality). Stage 2 — within-modality: Grad-CAM on the last ConvNeXt conv layer (α_k^c = (1/Z)Σ_{i,j} ∂y^c/∂A^k_{ij}; L^c = ReLU(Σ_k α_k^c A^k)) for the image; per-feature gradient magnitudes for the stats vector.
- Training: 8:1:1 train/val/test, 10-fold CV; augmentation = horizontal/vertical flips; pretrained ConvNeXt-Tiny fine-tune; batch 128, max 10 epochs, lr 1e-4, Adam, cross-entropy; best-val-accuracy checkpoint; NVIDIA v2-8 TPU.

## 4. Equations & assumptions
- Stage-1 contributions: C_B = Σ_{i,j,k} ∂y/∂x_{ijk}; C_S = Σ_i ∂y/∂v_i (paper sums signed gradients; magnitudes implied by the 0–1 standardization).
- Grad-CAM: α_k^c = (1/Z) Σ_{i,j} ∂y^c/∂A^k_{ij}; L^c_{Grad-CAM} = ReLU(Σ_k α_k^c A^k).
- Assumptions: (1) a single frozen moment (pass instant + next-action ball position) carries enough context — no temporal sequence; (2) image rendering (colors, white open space, dotted ball path) is an adequate encoding of spatial relations; (3) gradient magnitudes are a faithful proxy for "which modality mattered"; (4) passer seasonal stats are stationary within the season.

## 5. Features / target
- Inputs: 224×224×3 tracking image (positions, velocities, ball path, team colors, open space); 15-d passer seasonal stats vector (Table 1: pass totals, success rates by type, long passes, total×rate products — exact 15 row labels did not extract as text from the PDF table; the discussion names f2 = seasonal pass success rate, f11/f12 = pass performance indexes).
- Target: binary pass success/failure, restricted to passes arriving within 30 m of goal.

## 6. Validation design
10-fold cross-validation, 8:1:1 splits reshuffled per fold; best-val checkpoint tested. Baselines: image-only methods (GoogleNet, ResNet50, EfficientNet-v2, ViT, Pure-ConvNeXt = ConvNeXt without stats stream) and graph-based methods (GCN, CI-GNN — Granger-causality-inspired explainable GNN, with added ball-distance node features). All trained/evaluated with identical procedures. Metrics: accuracy, precision/recall/F1 (Table 2), confusion matrix (Fig. 3), plus qualitative explanation figures (Figs. 4–8). No time-ordered split — folds are random over 2023–2024 games (leakage risk noted below).

## 7. Numerical results / baselines
- PassAI accuracy **77.6%** (best on all reported indexes). Confusion matrix: successful passes 83.0% correct, failed passes 70.8% (class imbalance: 3,663 vs 2,686).
- Multimodal gain: PassAI vs Pure-ConvNeXt (image only) = +2–4% across indexes (paper's §4.1); abstract claims ">5%" over state-of-the-art algorithms.
- Baselines: ViT and ConvNeXt best among image methods; graph-based methods ≈70% on each index; CI-GNN higher F1/recall via better minor-class (failed pass) accuracy.
- Explanations: Stage-1 contributions vary per pass (Fig. 4); example C_B = 1.0 / 0.89 (image-dominant), C_S = 0.84 / 0.82 (stats-dominant) (Fig. 5). Aggregate: seasonal pass success rate (f2) the top stats contributor; f11/f12 (pass performance) also high (Fig. 7c).
- Paper's claims: "first study to process both tracking and stats data using an XAI algorithm and visualize the outcome rationale"; image-based > graph-based for open-space tasks.

## 8. Code / data availability
None stated (no repo link in the paper). Data proprietary (Data Stadium, Inc.); stats scraped from jleague.jp.

## 9. Leakage & limitations
- Random 10-fold CV over 2023–2024 games, NOT time-ordered: same teams/players appear in train and test folds → player/team memorization inflates accuracy; no walk-forward validation.
- Single-frame input discards pre-pass dynamics (route development, pocket movement) — a temporal model could differ substantially.
- Gradient-based "contribution" is a sensitivity measure, not causal; the paper itself shows uninterpretable explanation images (Fig. 8) and calls for coach-evaluated explanation quality.
- Only professional J1 data — generalization across skill levels untested (authors' own limitation).
- 77.6% accuracy on a 57.7%-majority baseline (3,663/6,349) = +19.9 pp — solid but the task is narrow (final-third passes only).

## 10. GSE overlap
Existing-research-map: no pass-level multimodal classifier with explainability in the corpus; STRAIN (2305.10262) is a tracking-only pass-rush metric; NGS taxonomy is feature-level. This is an EXTENSION into new capability: per-play outcome classification fusing tracking context with player seasonal attributes, with explanations GSE can publish ("the model flagged the coverage, not the QB"). Directly complements the 15-area ML brief's multimodal topic. No duplication.

## 11. GSE implementation spec
**Goal:** "PassAI-NFL" — classify NFL pass completion (and separately, explosive-pass ≥15 yards) from (a) NGS tracking frame image at throw moment + ball trajectory to catch point, (b) QB seasonal stats vector (CPOE, EPA/dropback, pressure rate, aDOT, time-to-throw, etc. from the repo's computed metrics).
- Tracking image: render 22 players + ball at throw instant, velocity vectors, LOS, first-down line, route stems to catch point; encode exactly like the paper (team colors, white open space).
- Stats vector: ~20-d from gse-lab/nflverse metrics, standardized per season.
- Model: ConvNeXt-Tiny (or ViT-Tiny) fine-tune + 64-unit MLP → FC → softmax; same two-stage explanation (modality gradients + Grad-CAM + per-feature gradients).
- Training: time-ordered splits (train ≤2022, val 2023, test 2024–2025) — fixing the paper's random-CV leakage; class-balanced loss.
- Serving: per-play inference for the props lane (completion probability per dropback → QB completion% props); explanations feed the content lane (X graphics showing "why the model likes/doesn't like this throw").
- Effort: medium (3–4 weeks; rendering pipeline + training are the work; architecture is off-the-shelf).

## 12. Reproducible test
Dataset: Big Data Bowl 2018–2022 tracking + nflverse pbp/QB stats (time-ordered: train 2018–2020, val 2021, test 2022). Target: pass completion (binary). Metric: accuracy + AUC. Baseline 1: tracking-image-only ConvNeXt (paper's Pure-ConvNeXt analog). Baseline 2: stats-only logistic regression. Test: full PassAI-NFL two-stream vs both baselines; report the 2–4% multimodal gain claim on NFL data.

## 13. Acceptance / rejection gate
**ACCEPT:** two-stream model beats the tracking-only baseline by ≥2 percentage points accuracy AND ≥0.015 AUC on the held-out 2022 test, with the stats stream contributing (mean C_S > 0.2 in stage-1 attributions — i.e., the gain isn't just a bigger image model). **REJECT:** gain <2 pp / <0.015 AUC, or attributions show the stats stream is ignored — then the fusion adds nothing over tracking-only and the lane stops at the cheaper model. Pre-registered before running.

## 14. Improvement experiment
Beyond the paper: **temporal PassAI** — replace the single-frame image with a 5-frame sequence (snap, mid-drop, throw, catch-point, +0.5s) processed by a TimeSformer/VideoSwin stream, keeping the stats MLP and the two-stage explanation (extend Grad-CAM to the temporal attention). Why it might beat the paper: the paper's own failure cases (Fig. 5c–d: contested arrival points, receiver velocity mismatch) are inherently temporal — a single frame cannot show a receiver breaking vs. sitting; temporal context should specifically lift the failed-pass recall (currently 70.8%), the class the paper struggles with. Test: temporal vs. single-frame on failed-pass recall with identical stats stream.
