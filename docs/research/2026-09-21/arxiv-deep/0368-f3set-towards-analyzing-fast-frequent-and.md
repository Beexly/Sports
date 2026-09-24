# [0368] F³Set: Towards Analyzing Fast, Frequent, and Fine-grained Events from Videos (arXiv:2504.08222)

**Citation:** Liu, Z., Jiang, K., Ma, M., Hou, Z., Lin, Y., Dong, J. S. (2025). *F³Set: Towards Analyzing Fast, Frequent, and Fine-grained Events from Videos*. arXiv:2504.08222v2 (April 2025). URL: https://arxiv.org/abs/2504.08222
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4860 lines, including all appendices A–K).
**Verdict:** ADAPT — the multi-label event decomposition + contextual sequence-refinement (CTX) architecture and the general F³ annotation toolchain are directly portable to building a frame-precise NFL play-phase event dataset (snap → dropback → release → catch) with a fine-grained, composable taxonomy; adopt F³ED's design pattern (not its tennis weights) as the baseline for any GSE fine-grained event-spotting work.

## 1. Research question
How can **fast, frequent, fine-grained (F³)** events — events lasting 1–2 frames, occurring densely in sequence, with ~1,000 combinatorially-distinct types — be detected with **±1-frame temporal tolerance** from video? The paper introduces the F³ event-detection task, the F³Set benchmark (tennis primary; badminton/table-tennis/tennis-doubles schemas), a general annotation toolchain, and a baseline model F³ED.

## 2. Dataset / schema
- **F³Set (tennis, primary):** 114 broadcast matches, **11,584 rallies, 42,846 shots**. Each event = 8 sub-classes / 29 elements / **1,108 event types** (G_high). Sub-classes: sc1 hit by which player (near/far); sc2 court location (deuce/ad/middle); sc3 side of body (forehand/backhand); sc4 shot type (serve/return/stroke); sc5 shot direction (T/B/W/CC/DL/DM/II/IO); sc6 technique (ground stroke/slice/volley/lob/drop/smash); sc7 approach (apr/n-apr); sc8 outcome (in-bound/winner/forced error/unforced error). Three granularity levels: G_low = {sc1,sc3,sc4,sc8} (11 elements, 38 types); G_mid = {sc1..sc6} (24 elements, 365 types); G_high = all 8 (29 elements, 1,108 types).
- **Additional schemas:** badminton (10 matches, 112 rallies, 1,692 shots; 6 sub-classes, 26 elements, 1,008 types), table tennis (5 matches, 42 rallies, 361 shots; 7 sub-classes, 23 elements, 1,296 types incl. spin), tennis doubles (8 matches, 78 rallies, 645 shots; 26 elements, 744 types, incl. serve formation). Full schemas at https://github.com/F3Set/F3Set/blob/main/data/.
- **Annotation pipeline (general toolchain):** scene detection (PySceneDetect) → Siamese-network clip selection → frame-level expert annotation. 8 annotators, ~1,450 clips and ~30 hours per annotator.
- **Diversity:** all three court surfaces, day/night/indoor/outdoor, varied camera angles.
- **Ethics (Appendix E):** built from public YouTube broadcasts, URLs only (no redistribution), professional public figures, academic-research-only disclaimer, bias review commitments.
- **Access:** code + data at https://github.com/F3Set/F3Set (videos via YouTube links only, no local copies).

## 3. Method / model
**F³ED** (Fast-Frequent-Fine-grained Event Detection network), end-to-end, single GPU:
1. **Video Encoder (VE):** RegNet-Y 200MF backbone with Temporal Shift Modules (TSM, shifting ¼ of channels) + bidirectional GRU → frame-wise features F_emb ∈ R^(N×d').
2. **Event Localizer (LCL):** FC + Sigmoid dense binary classification per frame: (p̂_1…p̂_N) = Sigmoid(LCL(F_emb)); BCE loss L_LCL vs GT binary labels.
3. **Multi-label Event Classifier (MLC):** FC + Sigmoid on event features f_i from F_emb → predicted event vector Ê_i = [ê_{i,1}…ê_{i,K}] (K = number of elements); BCE loss L_MLC, computed only on frames containing events. Multi-label (elements) instead of multi-class (1,108 types) — e.g. near_ad_bh_stroke_DL_slice_apr_in vs near_ad_bh_stroke_DL_drop_apr_in differ only in technique element.
4. **Contextual module (CTX):** bidirectional GRU over the predicted event sequence (Ê_1…Ê_M) → refined sequence (𝔼_1…𝔼_M); BCE loss L_CTX. Corrects invalid sequences (e.g. a "winner" followed by another shot; a right-hander's deuce-court forehand as "II").
- Composite loss L = L_LCL + L_MLC + L_CTX. Inference: MLC localizes from LCL outputs; CTX refines the event sequence.
- **Training:** 96-frame clips, stride 2, batch 4, 224×224 crops; foreground loss weight ×5 (events < 3% of frames); AdamW lr 0.001 (0.0001 for SlowFast/VTN), cosine annealing + 3 linear warm-ups, 50 epochs, ~10 min/epoch on RTX 4090.
- **Baselines (adapted, end-to-end):** encoders TSN / SlowFast / I3D / VTN / TSM × heads MS-TCN / ASFormer (TAS), G-TAD / ActionFormer (TAL), E2E-Spot (TASpot), with frame-wise dense multi-class classification.

## 4. Equations & assumptions
- L_LCL = (1/N) Σ_{i=1}^{N} [p_i·log(p̂_i) + (1−p_i)·log(1−p̂_i)].
- Ê_i = Sigmoid(MLC(f_i)) = [ê_{i,1},…,ê_{i,K}], ê_{i,j} ∈ [0,1].
- L_MLC = (1/M) Σ_{i=1}^{M} [(1/K) Σ_{j=1}^{K} e_{i,j}·log(ê_{i,j}) + (1−e_{i,j})·log(1−ê_{i,j})].
- (𝔼_1,…,𝔼_M) = CTX(Ê_1,…,Ê_M); L_CTX = same BCE form with refined 𝕖_{i,j}.
- L = L_LCL + L_MLC + L_CTX.
- **Assumptions:** event taxonomy is decomposable into independent elements (multi-label factorization valid); sequence context (BiGRU) captures sport logic (shot grammar); foreground-background weight ×5 is a fixed heuristic; stride-2 dense sampling is sufficient.

## 5. Features / target
- **Inputs:** RGB video clips X ∈ R^(H×W×3×N) (96 frames, 224×224).
- **Targets:** sequence of (event, timestamp) pairs (E_i, t_i), each event expressed as a K-element binary vector [e_{i,1}…e_{i,K}].
- **Metrics:** Edit score (Levenshtein-based sequence similarity), mean F1 with ±1-frame temporal tolerance — F1_evt (across event types) and F1_elm (across elements, more balanced under long-tail).

## 6. Validation design
Benchmark all baseline encoder×head combos plus F³ED on F³Set at all three granularities; ablation studies (feature extractor, stride, GRU removal, clip length, multi-label, CTX); generalizability tests on five "semi-F³" datasets (ShuttleSet, FineDiving, FineGym, SoccerNetV2, CCTV-Pipe) reporting F1_evt and Edit; skeleton-based variants (ST-GCN++, PoseConv3D); resolution ablations; LCL-quality impact analysis (Table 15).

## 7. Numerical results / baselines
- **F³ED (TSM backbone) is best at all granularities (Table 3):** G_high: F1_evt **40.3**, F1_elm **75.2**, Edit **74.0**; G_mid: **48.0/76.5/82.4**; G_low: **68.4/80.0/87.2**. Best baselines: TSM+E2E-Spot 31.4/71.4/68.7 (high), SlowFast+ActionFormer 28.7/70.0/67.6. Performance falls with granularity — the task stays hard at 1,108 types.
- **Key ablations (Table 4, G_high F1_evt):** default TSM+E2E-Spot 31.4 → multi-label 37.9 → +CTX(Transformer) 39.0 → **+CTX(BiGRU) 40.3** (BiGRU slightly better on <20-event sequences). Dense sampling critical: stride 4 → 25.9, stride 8 → 14.0. Removing the GRU → 27.6 (long-term reasoning essential for direction/outcome). Clip-wise I3D → 22.7, VTN → 14.8 (clip-wise/coarse features fail); skeleton ST-GCN++ → 25.4, PoseConv3D → 20.1 (efficient but blind to direction/outcome).
- **Semi-F³ (Table 5, F³ED vs best baseline, F1_evt/Edit):** ShuttleSet 70.7/77.1, FineDiving 77.6/95.1, FineGym 70.9/70.7, SoccerNetV2 48.1/76.6, CCTV-Pipe 37.0/39.5 — F³ED wins everywhere; CCTV-Pipe is weak (ambiguous single-frame annotations, multi-defect frames) but still beats the domain paper [42]. LCL quality correlates with downstream quality (Table 15: F1_lcl 86.7 F³Set → 97.9 ShuttleSet) but a perfect LCL isn't required.
- **Efficiency (Table 13):** TSM+F³ED = 5.6M params, **10.6 ms/frame** (RTX 4090); ST-GCN++ 2.3M / 4.0 ms; PoseConv3D 6.8M / 6.4 ms. Resolution 336 → 43.2, 448 → 44.4 F1_evt (diminishing returns; 224 default).
- **GPT-4 preliminary (Appendix A):** GPT-4-vision-preview read sport/scoreboard/tournament from 12-frame rally strips but failed fine-grained shot-type/direction sequencing (multiple errors per frame) — authors excluded it; evidence against VLM shortcuts for this task.

## 8. Code / data availability
Code + data: https://github.com/F3Set/F3Set (video URLs only). Annotation toolchain included. Training takes ~8.3 hours (50 epochs × 10 min) on a single RTX 4090.

## 9. Leakage & limitations
- **Single broadcast domain:** tennis rallies with clean scoreboards; error-sequence examples (Appendix I) show baselines producing logically invalid sequences — CTX patches symptoms, not root visual causes.
- Performance at G_high (F1_evt 40.3) is far from solved; long-tail event types dominate the misses (F1_elm 75.2 vs F1_evt 40.3 shows type-level, not element-level, failure).
- Skeleton variants' weakness is structural (no shot-direction signal) — the F³ factorization assumes visual elements are *observable*; for NFL, some elements (e.g. coverage call) aren't.
- CCTV-Pipe results show the method degrades under ambiguous/dense annotations — NFL pile-up phases would stress LCL similarly.
- No online/streaming variant; clips are 96-frame windows with stride 2 — continuous-game deployment needs the audio-trigger-style segmentation idea from ledger 0361.

## 10. GSE overlap
The existing-research map (2026-09-21) has **no F³-style fine-grained event detection coverage**: the action-spotting/PES survey (0364) covers coarse event spotting with wide tolerance windows, but nothing in the corpus decomposes NFL plays into frame-precise, composable event vocabularies. This is an **extension of the event-detection lane**: the 0364 survey supplies the coarse tier (kickoff, touchdown), F³ED supplies the fine tier *within* plays (snap→dropback→release→catch→tackle at ±1-frame tolerance) with a multi-label factorization that avoids a combinatorial class explosion — directly addressing the "1,000-class" problem any fine-grained NFL taxonomy would hit.

## 11. GSE implementation spec
1. Design an NFL F³ taxonomy by factorizing plays into elements: personnel (offense/defense count), formation family, motion, snap type, dropback depth, throw target zone, catch result, tackle type — mirroring the sub-class/element structure (G_low→G_high granularity levels let models train coarse first).
2. Reuse the annotation toolchain pattern: scene detection on broadcast video → Siamese/clip selection of play segments → expert frame-level annotation (±1 frame), with the 0361 audio-trigger idea for automatic play-start segmentation.
3. Model: F³ED architecture verbatim (TSM or a modern backbone + LCL/MLC/CTX heads) trained end-to-end on NFL clips; start at G_low granularity (38-type equivalent) before scaling.
4. Effort: 2 weeks taxonomy + pilot annotation (50 plays); 1 week F³ED replication; scale-up is the annotation bottleneck, exactly as the paper documents.

## 12. Reproducible test
Annotate 50 NFL pass plays at frame level with a 6-element pilot taxonomy (dropback depth, throw side, target zone, catch/no-catch, tackle type, outcome); train F³ED vs a multi-class baseline on 40/10 split; acceptance metric: F³ED's F1_evt at ±1-frame tolerance must beat the multi-class baseline by ≥ 5 pp (the paper's multi-label gain was +6.5 pp at G_high: 37.9 vs 31.4) with zero logically-invalid sequences in CTX outputs on the 10 test plays.

## 13. Acceptance / rejection gate
PURSUE if the pilot reproduces the paper's two structural findings on NFL data: (a) multi-label factorization beats multi-class by ≥ 5 pp F1_evt, and (b) CTX eliminates the invalid-sequence errors the baseline produces (Appendix I pattern); REJECT the architecture for GSE if F³ED fails to beat a plain E2E-Spot-style baseline on NFL clips or if annotation cost per play exceeds 30 minutes at pilot scale (the paper's ~30 hours/annotator for 1,450 clips implies ~1.2 min/clip — NFL plays are longer; a >25× cost multiple kills the ROI).

## 14. Improvement experiment
Replace the BiGRU CTX with a constrained decoding step: a learned NFL play-grammar (down/distance → legal next events) as hard constraints on the event sequence, instead of a learned sequence refiner. This would turn the Appendix I invalid-sequence problem into a guarantee (e.g. a "touchdown" event can only follow a catch/run event) and is testable by measuring zero invalid sequences on the pilot test set vs CTX's empirical reduction.
