# [0379] FACTS: Fine-Grained Action Classification for Tactical Sports (arXiv:2412.16454)

**Citation:** Christopher Lai, Jason Mo, Haotian Xia, Yuan-fang Wang (2024). *FACTS: Fine-Grained Action Classification for Tactical Sports*. arXiv:2412.16454. URL: https://arxiv.org/abs/2412.16454
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 954 lines).
**Verdict:** ADAPT — fine-tuned VideoMAE on raw video (no pose estimation) reaches 90% on fine-grained fencing actions vs 64.8% for a pose-based baseline; the transfer to GSE is automated action labeling from NFL video (route/pass-rush move classification) where NGS labels are absent or incomplete, but it needs NFL-specific labeled clips and is a build-out, not a drop-in.

## 1. Research question
Can a transformer operating directly on raw video — without pose estimation, skeleton extraction, segmentation, or body-worn sensors — classify fine-grained, high-speed, close-combat actions (fencing attacks/ripostes/counter-attacks/remises; boxing punch types) better than traditional pose-dependent pipelines? The paper answers yes, via FACTS, a VideoMAE-fine-tuned Vision Transformer, and releases a new public dataset of 8 fencing action classes to fill the gap in fine-grained sports action resources.

## 2. Dataset / schema
Two datasets, both pre-clipped video clips with single-action labels:

- **FACTS fencing dataset (new, public):** sourced from "Quarte Riposte" official competition footage; 16 action classes scraped, 13,459 clips annotated by majority vote of fencing-community members; after excluding conflicting/sparse annotations and dropping under-sampled classes, the final set is 6,400 clips across 8 labels: Attack Left/Right (AL/AR), Riposte Left/Right (RL/RR), Counter-attack Left/Right (CAL/CAR), Remise Left/Right (ReL/ReR). Horizontal-flip augmentation doubled the set (from the original 13,495 clips to the final 6,400 — the paper's wording here is internally inconsistent, but the delivered class counts are per Table I: ~168–217 frames per clip, mean ~186). Access: https://anonymous.4open.science/r/FACTS-B1C5.
- **Boxing dataset (repackaged public):** the 2021 Olympic Boxing Punch Classification Video Dataset (Kaggle, Stefanski et al.), recorded at a 2021 boxing league (Szczyrk, Poland) with four GoPro Full-HD cameras at 50 fps, annotated frame-by-frame by licensed boxing referees with punch-type labels and coordinates. The paper re-cuts it into 8,000 clips across 8 labels: Left/Right Hand Head Punch, Left/Right Hand Missed Punch, Left/Right Hand Block Punch, Left/Right Hand Body Punch. All boxing clips are exactly 15 frames. Access: the Kaggle page (public).

Both datasets are stratified into train/val/test with balanced class distributions (exact split ratios not stated in the paper).

## 3. Method / model
Architecture: ViT-based transformer pre-trained with Video Masked Autoencoders (VideoMAE; Tong et al. 2022). The encoder learns latent representations from masked video frames; the decoder reconstructs pixel values of the masked patches; this pre-training teaches spatiotemporal structure without labels. The paper uses the `MCG-NJU/videomae-base` checkpoint pre-trained on Kinetics-400 (12 transformer layers, 12 attention heads, hidden size 768, feedforward size 3072), fine-tuned on each sport dataset.

Preprocessing: (a) uniform temporal subsampling to 16 frames per clip; (b) spatial: fencing videos padded top/bottom then resized to 640×640 (horizontal sport); boxing videos uniformly padded and resized; (c) pixel standardization to zero mean, unit variance across channels (μ, σ of pixel values); (d) fine-tuning normalization uses ImageNet mean/std, resized to 224×224 model input; (e) horizontal-flip augmentation (fencing).

Training: batch size 4, learning rate 5×10⁻⁵, gradient accumulation 2 (effective batch 8), warm-up ratio 0.1, 10 epochs, checkpoint evaluated every 500 steps with best selected; run on two NVIDIA GTX 1080 Ti (~20 GB combined VRAM).

Baseline for comparison: a pose-estimation-based classifier (Pageaud + GalDude33 pipeline: pose estimation as a natural filter + classification), implemented by the authors on the same fencing data.

## 4. Equations & assumptions
The paper states three equations (all preprocessing):

(1) Uniform temporal subsampling: `X_sub = {x_i | i = k × T/N}, k = 0,1,…,N−1`, where T = total frame count, X_sub = subsampled frame set.

(2) Symmetric padding: `padding = ((H_target − H_orig)/2, (W_target − W_orig)/2)`.

(3) Pixel standardization: `X_std = (X − μ)/σ`, μ, σ = mean and standard deviation of pixel values.

Assumptions (stated or implicit): (a) single-action clips — each input clip contains exactly one fine-grained action, temporally bounded; the model does temporal classification, not detection/localization; (b) stratified balanced classes in train/val/test; (c) 16 subsampled frames suffice to capture the action's discriminative dynamics; (d) horizontal flipping preserves action semantics (for fencing it flips left/right labels symmetrically — the authors assert label integrity is preserved); (e) ImageNet normalization statistics transfer to sport video.

## 5. Features / target
Input features: raw RGB video pixels — 16 temporally subsampled frames at 224×224×3 (fine-tuning input), no handcrafted features, no pose/skeleton/optical-flow inputs. Target: single-label 8-way classification per clip (fencing: AL/AR/RL/RR/CAL/CAR/ReL/ReR; boxing: LHHP/RHHP/LHMP/RHMP/LHBlP/RHBlP/LHBP/RHBP). Label definition: human consensus (fencing: majority vote of community annotators; boxing: licensed referees). Prediction horizon: N/A (offline per-clip classification, not forecasting).

## 6. Validation design
Stratified train/validation/test splits with balanced class distributions (split ratios not stated — a gap; no dates, since the data are scraped clips, not a time series). Evaluation: accuracy, per-class precision/recall/F1, confusion matrices, 95% binomial confidence intervals on test accuracy, eval loss. Baseline compared: the authors' implementation of the pose-estimation pipeline of Pageaud and GalDude33 (64.8% on fencing). No cross-dataset or cross-tournament generalization test is reported; the discussion mentions an informal "real-world" test on home videos (accuracy −5 percentage points) and varied samples, without a table.

## 7. Numerical results / baselines
Quoted exactly from the paper (§V-A):

- **Fencing:** evaluation accuracy 90%, eval loss 0.3895; 95% CI [0.8812, 0.9187]; weighted precision/recall/F1 = 0.90/0.90/0.90 (Table II). Per-class F1: AR 0.84, AL 0.84, RR 0.87, RL 0.90, CAR 0.89, CAL 0.90, ReR 0.97, ReL 0.98. Confusion (Table III, test set): diagonal-dominant; main confusions between Counter-Attack and similar offensive actions (e.g., CAR confused with RR 8× and AR 2×; CAL confused with RL 7×).
- **Boxing:** evaluation accuracy 83.25%, eval loss 0.8145; 95% CI [0.8125, 0.8542]; weighted precision 0.84 / recall 0.83 / F1 0.83 (Table IV). Per-class F1: LHHP 0.62 (weakest), RHHP 0.65, LHMP 0.76, RHMP 0.84, LHBlP 0.91, LHBP 0.98, RHBP 0.98, RHBlP 0.96. Confusion (Table V): LHHP misclassified as RHHP 23×; RHHP misclassified as LHHP 33×.
- **Baseline (Table VI, fencing):** pose-estimation model 64.8% vs FACTS/transformer-with-VideoMAE 90.0%.
- **Robustness note (discussion, no table):** accuracy drops ~5 percentage points on home (non-competition) videos.

Interpretation (mine, not the paper's): per-class test counts (~120 per class from the confusion matrices) are modest; the 90% figure rests on roughly 960 fencing test clips.

## 8. Code / data availability
Dataset: fencing dataset released publicly at https://anonymous.4open.science/r/FACTS-B1C5 (anonymous 4open link — may not persist post-publication). Boxing source: Kaggle Olympic Boxing Punch Classification Video Dataset (linked). Model code: not stated — no GitHub link in the paper ("None stated"). Weights: only the public `MCG-NJU/videomae-base` Kinetics-400 checkpoint is named (HF hub). Reproducibility rests on the documented hyperparameters (§IV-C).

## 9. Leakage & limitations
- **No temporal ordering needed but split protocol is underspecified:** split ratios are not given; if clips from the same bout/camera appear in both train and test, near-duplicate frames could inflate accuracy — the paper does not address clip-level or bout-level de-duplication (adversarial note; not stated as done).
- **Label consensus filtering is selection bias:** conflicting annotations were "systematically excluded," i.e., the hardest, most ambiguous actions are dropped, which likely inflates accuracy on the curated set versus deployment footage.
- **Domain shift acknowledged:** −5 pp accuracy on home videos; model is sensitive to video quality, occlusion, lighting — exactly the conditions of the NFL broadcast film GSE would use.
- **Classification, not detection:** the model assumes pre-clipped single actions; real deployment needs a temporal-segmentation/localization stage the paper does not provide.
- **Head-punch confusion (LHHP vs RHHP)** shows the model still struggles with left/right symmetry in fast action — relevant for NFL direction-of-play classification.
- **No equations for the model itself** (only preprocessing), and no ablation of the VideoMAE pre-training vs. random-init on these datasets (the comparison is only against a different pipeline family).
- **External validity to NFL:** fencing/boxing are two-person, close-combat, single-view sports; NFL has 22 players, occlusions, long fields, and broadcast camera motion — far from this paper's domain. The transfer is the *method* (raw-video transformer beats pose pipelines for fine-grained actions), not the model.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant existing coverage: the 2026-09-21 **NGS profile deep-dive** inventoried a 27-family tracking taxonomy and notes NGS 2026 additions include **Route Classification 2.0** and Run Scheme Classification — i.e., GSE's primary action-label source is NGS chip tracking, not video. The map also shows a **2026-09-18 NGS replacement spec** (building equivalents from public data) and ML-brief topics on **multimodal fusion**. No existing repo work does video-based action classification of NFL film. Status: **new capability** (automated video action labeling), partially overlapping the NGS taxonomy — it extends rather than duplicates: it would supply labels where NGS is absent (college film, All-22-only plays, historical footage, pass-rush move types, blocking-scheme tags) instead of replacing NGS chips.

## 11. GSE implementation spec
- **Data:** All-22 / broadcast video clips from the GSE video pipeline (or YouTube-sourced NFL film for prototyping); labels from NGS Route Classification 2.0 (routes), FTN charting (pass-rush moves, blocking schemes), or hand-labeling for novel tags. Start with one 8–12 class task: WR route classification per route stem clip.
- **Model:** fine-tune `MCG-NJU/videomae-base` (Kinetics-400) exactly per the paper: 16 uniformly subsampled frames, 224×224, lr 5e-5, effective batch 8, warm-up 0.1, 10 epochs, eval every 500 steps. GTX-1080-Ti-class hardware sufficed in the paper — a single modern GPU handles it.
- **Pipeline stages:** (1) temporal segmentation to produce single-action clips (the paper assumes these; build a play-boundary splitter first, e.g., from broadcast whistle detection or nflverse play timestamps); (2) the classifier; (3) clip-level labels joined to nflverse play_id.
- **Serving:** offline batch labeling of the season's film; no real-time requirement. Effort: ~2–3 engineer-weeks for the prototype on route classification (data curation dominates), +1 week for a detection/segmentation front end.
- **Consume:** labels feed the engine as features (e.g., route-type-specific receiver efficiency, pass-rush-move success rates) and the content operation (auto-tagged clips).

## 12. Reproducible test
Dataset: 2024 NFL regular-season All-22 (or broadcast) video; clip each WR route to a single-action window using NGS Route Classification 2.0 labels as ground truth, balanced to ≥200 clips/class across ≥8 route classes (slant, go, out, in/dig, curl, comeback, post, corner). Split: weeks 1–12 train, weeks 13–15 validation, weeks 16–18 test (time-ordered, no same-game overlap across splits). Metric: test accuracy with 95% CI; baseline: a pose-estimation + classifier pipeline (off-the-shelf pose estimator + gradient boosting on joint trajectories) replicating the paper's comparison. Runnable: all inputs (nflverse + NGS labels + video) exist in-house.

## 13. Acceptance / rejection gate
**Adopt the video-classification lane if** the VideoMAE model beats the pose-based baseline by ≥10 percentage points of test accuracy on the week 16–18 window AND per-class F1 ≥ 0.70 on all 8 classes; **reject the lane if** it fails either condition, or if labeling/production cost exceeds one engineer-week per season without the accuracy bar being met. The comparison must be run on the time-ordered split above — no clip-from-same-game leakage into test.

## 14. Improvement experiment
Beyond the paper: **audio-visual fusion for NFL events.** The paper's future-work note (hybrid pose+transformer) and the related-work citation of the Allez Go model (TCN + audio reached 90% on fencing by detecting blade-contact sounds) suggest a direct upgrade — add a synchronized audio stream (broadcast crowd/whistle/pad-crack audio) as a second modality to the VideoMAE encoder for detecting contact events (tackles, blocks, catches) that are visually occluded. For GSE: train a two-tower VideoMAE + audio-MAE classifier on tackle-type/block-shed labels; hypothesis is audio disambiguates occluded contact frames where pure video confuses classes (mirroring the paper's LHHP/RHHP confusion).
