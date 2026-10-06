# [0300] Temporal Feature Distillation for Label-Efficient Precise Event Spotting (arXiv:2607.10998)

**Citation:** Hao Xu, Xinyu Wei, Sam Wells, Sunil Aryal (2026). *Temporal Feature Distillation for Label-Efficient Precise Event Spotting*. arXiv:2607.10998v1. URL: https://arxiv.org/abs/2607.10998
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,221 lines).
**Verdict:** REJECT — video event-spotting methodology for tennis/figure skating/diving; no credible transfer to GSE's NFL game-outcome/prop engine or current data stack (no video pipeline). Details retained as a design reference if GSE ever labels broadcast video.

## 1. Research question
Precise Event Spotting (PES) — frame-accurate sports event detection (bounce, hit, take-off, landing) — is label-hungry. Can a teacher-student framework with **two new components** cut labeled-data requirements: (i) a Temporal Gated Scale (TGS) module that captures multi-scale temporal dependencies, and (ii) a Temporal Feature Distillation (TFD) strategy that distills knowledge from unlabeled video? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Tennis** [39]: 3,345 clips, 28 matches, 33,791 annotations, six classes (serve, forehand, backhand, volley, bounce, fault). Source split: 19 train/val matches, nine test matches. Input: 224×224 frames at 30 fps; clip length 100.
- **Figure Skating (FS)** [39]: 371 performances from 11 broadcasts, 3,674 events, four classes (jump, spin, footwork, landing); two sub-tasks, FS_Comp and FS_Perf (different train/test splits by competition and performance).
- **FineDiving** [34]: 3,000 clips, 7,010 events, four classes (takeoff, somersault, twist, entry); train/test by performance videos.
- **Label regimes:** 10%, 20%, 40%, 80% of the labeled training set; test labels always 100% used for evaluation.
- **Access:** all public benchmarks; code at https://anonymous.4open.science/r/TFD-8535/ (anonymous 4open repo; not verified live in this task).

## 3. Method / model
- **TGS module (Eqs. 1–7):** plug-in placed after a standard feature extractor (RegNetY, ResNet-18, ViT-Tiny/Small). Input X_in ∈ R^{T×C}; residual MLP projections to F_in ∈ R^{T×C'}; parallel depthwise 1D temporal convolutions at dilations d ∈ {1, 3, 5} (short/mid/long-range); elementwise gated convolution per scale; channels split into thirds — past-context, future-context, and static — with the past/future thirds cyclically shifted along time, static untouched; softmax-weighted fusion across the three scales; MLP projection + residual → X_out.
- **TFD strategy (Eqs. 9–11):** student trained supervised; teacher = EMA of student weights with a **two-stage EMA schedule** (fast decay β₁ = 0.99 while the student is "still learning", base decay β₂ = 0.9995 after convergence — paper's Section 3.4 is contradictory on which decay applies when; the reported numbers use the two values as given); teacher generates soft targets on weakly augmented unlabeled clips; alignment loss = MSE between student and teacher temporal feature maps; total L_TFD = L_sup + λ(t)·L_align with five-epoch supervised warm-up, λ(t) cosine-ramped 0→1 over ten epochs, then λ = 1. Supervised loss = weighted CE over per-frame multi-label classes plus a binary temporal-detection loss (foreground weighting by inverse class frequency and per-frame event density).
- **TMA (Temporal Masked Augmentation):** unlabeled views; random 16×16 patch grid, 9 patches masked, p = 0.5; temporal masks of length 3, up to five segments per clip. TMA alone adds +4.87 mAP on Tennis and +1.73 on FS_Perf at 10% labels.
- **Training:** 50 epochs, batch 4, AdamW, lr = 1e-4, weight decay 1e-4; eight NVIDIA A100 GPUs.

## 4. Equations & assumptions
- TGS: F_in = MLP(X_in); F^{(d)} = GateConv_d(F_in), d ∈ {1,3,5}; split thirds [past, future, static]; F̃_fused = Σ softmax(w)_d F^{(d)}; X_out = X_in + MLP(F̃_fused).
- L_align = ‖F_s − F_t‖² (student vs teacher temporal feature maps); L_TFD = L_sup + λ(t)·L_align.
- Assumption: unlabeled video shares the labeled distribution (same sport); temporal feature continuity holds between adjacent frames except at boundaries.

## 5. Features / target
- **Inputs:** 224×224 video frames at 30 fps, 100-frame clips.
- **Targets:** frame-level event labels with ±1-frame tolerance; classes: tennis (serve, forehand, backhand, volley, bounce, fault), FS (jump, spin, footwork, landing), diving (takeoff, somersault, twist, entry).

## 6. Validation design
- **Metric:** average precision / mean AP at tolerance δ = 1 frame; mean over three random seeds; labeled fractions {10, 20, 40, 80}%.
- **Baselines:** adapted semi-supervised video methods (FixMatch, Mean Teacher, MixMatch, UDA, FreeMatch, SoftMatch, SimMatch, ASTRM) on the same backbones, plus full-supervision baselines and the TGS-only backbone ablations.
- **Feature-sharpness study:** cosine similarity of DINO features at event boundaries ≥0.999 vs TFD 0.003 (Tennis) — showing TFD features are boundary-sharp while DINO is over-smoothed; non-boundary averages 0.936 (TFD) vs 0.997 (DINO).

## 7. Numerical results / baselines
At 10% labels, mAP (Tennis / FS_Comp / FS_Perf / FineDiving): **80.19 / 38.29 / 50.29 / 52.87** — own model best in 14 of 16 dataset×fraction settings. FS_Perf 10%: +4.54 over the strongest listed competitor (ASTRM 45.75). At 80% labels, ours matches or exceeds the 100%-labeled fully-supervised baselines on two of four datasets.
- TGS ablations (10% labels, Tennis mAP): ViT-Tiny 10.96 → +TGS 44.77 (+33.81); ViT-Small 46.32 → +TGS 68.39 (+16.83); +TFD → 80.19. FS_Perf: ViT-Small 28.61 → +TGS 41.37 → +TFD 50.29.
- TMA ablation: Tennis 75.32 → 80.19 (+4.87); FS_Perf 48.56 → 50.29 (+1.73).
- Clip-length sensitivity: Tennis L = 50 → 73.50 (−6.69 vs 80.19 at L = 100); FS_Perf L = 125 → 58.97 (+8.68), L = 200 → 58.78 (+8.49) — temporal modeling pays more on slower events.
- Complexity (ViT-S backbone, 100-frame clip): 23.45M → 28.89M params (+5.44M), 644.30 → 1000.15 GFLOPs (+355.85), 1649 → 867 FPS — still real-time on an A100-class GPU.

## 8. Code / data availability
Code: https://anonymous.4open.science/r/TFD-8535/ (anonymous; migration to public repo stated as planned). Data: Tennis/FS [39], FineDiving [34] — all public benchmarks. Compute: 8×A100; no checkpoint release stated.

## 9. Leakage & limitations
- **My adversarial notes:** (a) The two-stage EMA description in Section 3.4 is self-contradictory (fast vs base decay timing unclear) — exact reproduction of the teacher dynamics is uncertain from the text alone. (b) Label-fraction sampling is random — no statement that match identity is preserved (unlabeled 90% may leak the same matches as the labeled 10%, inflating semi-supervised gains). (c) Only three runs, no variance/CIs; gains like +1.73 on FS_Perf may be within noise. (d) The DINO comparison is a strawman-adjacent: DINO was never trained for boundary sharpness. (e) 1,000 GFLOPs per 100-frame clip is heavy for any production video pipeline. (f) All four datasets are individual/precision sports — no team-sport, no occlusion-heavy broadcast scenarios.

## 10. GSE overlap
No overlap. The existing-research-map's video/ML lanes (2026-09-18 ml-research-brief; 2026-09-21 NGS work) contain no event-spotting or video-indexing capability, and GSE has no video pipeline at all — the engine consumes play-by-play/odds, not frames. The method is also not a model of *game outcomes* in any sport; it localizes *moments* in video. Closest conceptual neighbor: none in the corpus. This is genuinely outside GSE's data universe.

## 11. GSE implementation spec
Not applicable for the current engine — no implementation recommended. If GSE ever builds a broadcast-video indexing lane (e.g., auto-labeling highlight clips for content production), the TGS module is the portable piece: a plug-in after any frame feature extractor, trained with the TFD warm-up→ramp→align schedule, on NFL-specific classes (snap, handoff, throw, catch, tackle, kick). Implementation would require: labeled NFL clip set (≥10% regime still means thousands of annotations), A100-class training compute, and a re-validation of the EMA schedule ambiguity before committing.

## 12. Reproducible test
Not run — rejected for current scope. The test that would resurrect it: run the released TFD-8535 code at 10% labels on one public dataset, reproduce the Tennis 80.19 mAP within ±2 points, then attempt a zero-shot transfer probe on a small NFL clip set (≤100 labeled plays) to see whether boundary-sharpness transfers across sports. Expected outcome: the transfer fails (domain gap too large), confirming the rejection.

## 13. Acceptance / rejection gate
**Reject** for GSE now: video event spotting has no consumer in the current stack. The gate that would change this verdict: GSE commits to a video-indexing product lane AND the authors' code reproduces within ±2 mAP points on the public benchmarks. Neither condition holds today.

## 14. Improvement experiment
The honest improvement path is outside GSE: fix the two-stage EMA ambiguity, preserve match identity in label-fraction sampling, and report CIs over ≥5 seeds. If (counter to this ledger's verdict) GSE ever needed video labels, the first experiment would be replacing random label fractions with match-stratified fractions to measure how much of the semi-supervised gain is within-match leakage — my estimate is a meaningful share, given the DINO smoothness finding implies within-match frames are nearly identical.
