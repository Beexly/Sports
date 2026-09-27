# [2108] Multimodal Action Quality Assessment (arXiv:2402.09444)

**Citation:** Ling-An Zeng, Wei-Shi Zheng (2024). *Multimodal Action Quality Assessment*. arXiv:2402.09444v3. URL: https://arxiv.org/abs/2402.09444
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2402.09444v3).
**Verdict:** ADAPT
**Rationale:** Progressive Adaptive Multimodal Fusion Network (PAMFN): separate modality-specific branches + a mixed-modality branch with an Adaptive Fusion Module (PolicyNet choosing among ranked FusionNets per video segment). The transferable insight is ADAPTIVE fusion — different modalities matter at different phases of a play (crowd/snap audio pre-snap, tracking at the catch point) — plus the finding that naive weighted fusion can underperform single modalities. Needs adaptation (NFL play-quality regression task, tracking replacing optical flow).

## 1. Research question
Can audio — ignored by all prior action quality assessment (AQA) work — improve fine-grained score regression for sports actions (figure skating, rhythmic gymnastics, where background music correlates with performance), and how should RGB, optical flow, and audio be fused when the optimal fusion policy differs across segments of an action?

## 2. Dataset / schema
- **Rhythmic Gymnastics (RG)**: 1,000 videos, 4 apparatuses (ball, clubs, hoop, ribbon), ~1m35s @ 25 fps each; labels = difficulty, execution, total scores from on-site referees. Split: 200 train / 50 test per apparatus.
- **Fis-V**: 500 figure-skating videos, ~2m50s @ ~25 fps, one skater each (warm-ups/bows pruned); labels = TES (Total Element Score) and PCS (Program Component Score) from referees. Split: 400 train / 100 test.
Both public. Long-video datasets chosen because they contain audio.

## 3. Method / model
**PAMFN** — pyramid with N=3 stages, feature dim d=256:
- Three modality-specific branches (RGB, optical flow, audio): each = N conv stages (1D ResNet-style blocks + pooling) + regression head (FC + dropout + sigmoid). RGB/flow branches pretrained then FROZEN; audio branch fine-tuned (audio alone can't assess quality).
- Mixed-modality branch (same structure, zero-initialized) progressively aggregates via three novel modules:
  1. **Modality-specific Feature Decoder**: cross-attention with query = mixed features, key/value = concatenated modality features, using NEGATIVE attention softmax(−QKᵀ/√d)V to extract the least-similar (i.e., unseen/neglected) information.
  2. **Adaptive Fusion Module**: K FusionNets (K=10 for RG, 6 for Fis-V; unshared weights), each an attention network (2 FC + softmax) producing modality weights α^v, α^f, α^a → cross-modal features f̄^cs = Σ α f_{i−1}; plus a **PolicyNet** outputting decision a_{i,t}=c meaning "enable the top-c ranked FusionNets" (rank = generality; higher-rank used more often). Binary mask M_{i,t} gates disabled FusionNets.
  3. **Cross-modal Feature Decoder**: cross-attention transferring the fused cross-modal features into the mixed branch.
- Features: RGB = Video Swin Transformer (Kinetics-600); flow = I3D (Kinetics-400); audio = Audio Spectrogram Transformer (AudioSet). Segments = 32 non-overlapping frames; 70 (RG) / 130 (Fis-V) consecutive segments per batch; zero-pad if short.
- Training: two phases — modality branches: SGD, momentum 0.9, wd 1e-4, cosine schedule, lr 0.01, batch 32, 250 epochs; fusion: AdamW, cosine decay, lr 5e-4 (RG) / 8e-4 (Fis-V), regression-layer lr ×0.1, 300–500 epochs depending on split. Single RTX 3090Ti. 18.06M params, 33 ms inference.

## 4. Equations & assumptions
- Decoder: Q=W^q f^m, K=W^k f^{ms}, V=W^v f^{ms}, f^{ms}=concat(f^v,f^f,f^a); f̄^{ms}=softmax(−QKᵀ/√d)V (Eq. 2–4). Negative sign deliberate: extracts information most dissimilar from current mixed features.
- FusionNet: f̄^cs_{i,t,k} = α^v f^v_{i−1,t} + α^f f^f_{i−1,t} + α^a f^a_{i−1,t}; f^cs = pool(Ψ_f(f̄^cs)) (Eq. 5–6).
- Metric: Spearman's ρ = Σ(x_i−x̄)(y_i−ȳ)/√[Σ(x_i−x̄)²Σ(y_i−ȳ)²] (Eq. 13); Fisher z-averaged across actions.
- Assumptions: (1) quality is "almost impossible to assess using only audio" (hence frozen RGB/flow, tuned audio); (2) a single invariant fusion policy is suboptimal across action segments; (3) ranked generality of FusionNets (top-c enabling) is a sufficient policy parameterization; (4) referee scores are reliable ground truth.

## 5. Features / target
- Inputs: RGB frames (VST features), optical flow (I3D features), audio spectrograms (AST features), segmented into 32-frame chunks.
- Target: referee scores — RG: difficulty/execution/total per apparatus; Fis-V: TES and PCS. Regression.

## 6. Validation design
Fixed train/test splits per dataset protocol. Metric: Spearman rank correlation, Fisher-z averaged. Baselines: (a) SOTA AQA methods (C3D+SVR, MS-LSTM, ACTION-NET, GDLT — all RGB-only); (b) re-implemented multimodal methods from other tasks (Joint-VA, MSAF, UMT); (c) unimodality ablations (RGB/flow/audio alone); (d) weighted late-fusion baselines (learnable softmax weights, one-stage training); (e) strong-feature variants (UNMT video + MAST audio). Ablations: fusion strategies (one-stage vs two-stage), K, N, modules on/off (§IV-F).

## 7. Numerical results / baselines
Spearman correlations (higher better), quoted exactly:
- Table I: PAMFN RG avg **0.819** (Ball 0.757, Clubs 0.825, Hoop 0.836, Ribbon 0.846) vs GDLT 0.765 (+0.054); Fis-V avg **0.822** (TES 0.754, PCS 0.872) vs GDLT 0.761 (+0.061). Prior RGB-only: ACTION-NET 0.728/0.744, MS-LSTM 0.663/0.744, C3D+SVR 0.483/0.501.
- Table II (multimodal methods): PAMFN 0.819/0.822 vs MSAF 0.781/0.802, Joint-VA 0.746/0.802, UMT 0.714/0.774.
- Table III (strong features UNMT+MAST): PAMFN 0.835/0.832 vs MSAF 0.794/0.821, Joint-VA 0.763/0.812.
- Table IV: audio-only unimodal = 0.317 (RG avg) but **0.575 on Fis-V** — "reveals that the action quality on skating has a strong correlation with the background music"; RGB-only 0.711/0.755; weighted late fusion of all three 0.703/0.798 — WORSE than PAMFN's 0.819/0.822 and sometimes worse than unimodal ("most multimodal methods using Weighted Fusion achieve worse results than unimodality methods on RG").
- Inference: 33 ms (vs GDLT 5 ms, MS-LSTM 342 ms); feature extraction dominates cost.

## 8. Code / data availability
Code: https://github.com/qinghuannn/PAMFN (stated). Datasets public (RG, Fis-V). Feature extractors public (VST, I3D, AST).

## 9. Leakage & limitations
- Small datasets (800/400 train videos) for an 18M-param model — overfitting risk mitigated by frozen branches but the fusion modules train on little data; no cross-dataset generalization test (RG↔Fis-V).
- Referee scores as ground truth embed judge bias (nationality, reputation) — unexamined.
- Audio's value is music-rhythm correlation, a quirk of judged artistic sports; transfer to NFL (crowd noise, snap cadence) is plausible but unproven and likely weaker.
- 33 ms excludes feature extraction (the dominant cost) — end-to-end latency understated.
- External validity: judged artistic sports ≠ NFL; but the FUSION machinery (adaptive per-segment policies) is task-agnostic.

## 10. GSE overlap
Existing-research-map: no AQA / adaptive-fusion read; the 2026-09-18 ML brief lists "multimodal fusion" as a commissioned topic with no results. This is the first ADAPTIVE-fusion paper in the lane — complements 2102 (Perceiver static fusion), 2103 (ImageBind shared space), 2105 (VLMo MoME): PAMFN answers "which modality, when" within a play. NEW capability: per-phase modality weighting (pre-snap audio vs. at-catch tracking) and a cautionary result (naive fusion < single modality) that should gate GSE's own fusion work. No duplication.

## 11. GSE implementation spec
**Goal:** play-execution quality regression + adaptive modality analysis: predict per-play EPA (or PFF-style grade proxy) from (a) broadcast-video features, (b) tracking-derived "flow" features (player velocities — the analog of optical flow), (c) stadium audio (crowd noise level, snap cadence).
- Replace RGB/flow/audio branches with video/tracking-flow/audio branches (same N=3 pyramid); keep the Adaptive Fusion Module with PolicyNet — the learned per-segment fusion weights become an interpretable "which signal mattered when" readout (e.g., audio weight spikes pre-snap on false starts).
- Train modality branches separately (tracking branch on EPA labels first), then freeze video/tracking and tune the fusion — the paper's two-phase recipe.
- Use: (1) a play-quality feature for the engine; (2) content — "the model says crowd noise decided this drive" graphics; (3) a diagnostic: if the PolicyNet consistently zeroes a modality, drop it (cost saving).
- Effort: medium (3–4 weeks; feature plumbing dominates; PAMFN code is public).

## 12. Reproducible test
Dataset: 2022–2024 NFL plays with tracking + broadcast video + audio (or crowd-noise proxy where audio unavailable): train 2022, val 2023, test 2024. Target: play EPA. Metric: Spearman correlation (paper's metric) + RMSE. Baselines: (a) tracking-only branch; (b) naive weighted late fusion of the three modalities (paper's Table IV analog); (c) current GSE play-EPA features. Test: PAMFN-style adaptive fusion vs. all three.

## 13. Acceptance / rejection gate
**ACCEPT:** adaptive fusion beats BOTH the tracking-only model (Spearman +0.03) AND naive weighted fusion (+0.02) on the 2024 test — proving adaptivity adds value beyond just adding modalities. **REJECT:** fails to beat naive fusion (then the paper's machinery isn't worth its complexity on NFL data) or loses to tracking-only (then video/audio add nothing and the lane stops). Pre-registered before running. (The paper's own Table IV warns naive fusion can hurt — the gate respects that.)

## 14. Improvement experiment
Beyond the paper: **event-anchored PolicyNet.** The paper's PolicyNet decides fusion per fixed 32-frame segment. Anchor decisions to football's natural phases instead — pre-snap, post-snap-to-throw, catch-point, tackle — with a separate ranked FusionNet bank per phase and a phase classifier gating them. Why it might beat the paper: football phases have sharply different modality relevance (audio ≈ pre-snap cadence/crowd; tracking ≈ post-snap; video ≈ catch-point contested catches), so phase-conditional fusion should dominate segment-uniform fusion, and the phase×modality weight matrix is directly publishable as GSE analysis content ("what actually decides plays, by phase").
