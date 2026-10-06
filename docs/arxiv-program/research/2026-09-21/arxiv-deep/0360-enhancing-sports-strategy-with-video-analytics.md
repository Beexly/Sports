# [0360] Enhancing Sports Strategy with Video Analytics and Data Mining: Assessing the effectiveness of Multimodal LLMs in tennis video analysis (arXiv:2507.02904)

**Citation:** Teo Wei Jun Charlton (2025). *Enhancing Sports Strategy with Video Analytics and Data Mining: Assessing the effectiveness of Multimodal LLMs in tennis video analysis*. arXiv:2507.02904. URL: https://arxiv.org/abs/2507.02904
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1016 lines).
**Verdict:** ADAPT — the "structured-CV-features-as-text-in-the-prompt" hybrid pattern (edit score 76.0 vs benchmark 82.1) is the portable lesson; raw MLLM video reasoning is too weak to use directly.

## 1. Research question
How effective are Multimodal LLMs (specifically VideoLLaMA2, LoRA fine-tuned) at understanding tennis videos — first at single-event action classification, then at the harder, unsolved task of identifying the full *sequence* of events in a rally — and can traditional CV models (player detection, ball tracking, court detection, pose estimation) or vision-encoder fine-tuning close the gap?

## 2. Dataset / schema
- **FineTennis dataset** (Liu, Jiang et al. 2025, arXiv:2504.08222 = paper 10 of this wave, F³Set): tennis rally videos from Grand Slam tournaments over several years. Each event in a rally is classified by 5 sub-classes: e1 = hitting player (near/far), e2 = stroke side (forehand/backhand), e3 = shot type (serve/return/stroke), e4 = direction (T/body/wide for serves; CC/DL/DM/IO/II for returns/strokes), e5 = outcome (in/last). Total 56 possible event types.
- **Size:** 7,445 training videos, 2,271 test videos. Train: mean 3.68 events/rally (Q1 1, median 3, Q3 5, max 34); Test: mean 3.90 (Q1 2, median 3, Q3 5, max 29).
- **Format:** rally start/end frames + per-event frame numbers given; matches tagged with YouTube links (authors downloaded and split rallies themselves).
- **Access:** FineTennis is the authors' lab dataset (NUS); no public URL stated in this dissertation.

## 3. Method / model
- **Model:** VideoLLaMA2 (repository as of 2024-09-13), 7B-Base, CLIP `clip-vit-large-patch14-336` visual encoder (frozen), STC connector, LoRA fine-tuning (VRAM-constrained shared cluster).
- **Prompting:** fixed prompt "What is happening in the tennis video?"; answer templated as "The {e1} player hit a {e2} {e4} {e3} {e5}." (concatenated per event for sequences). Sub-class counted correct if its label appears in the answer and no competing sub-class label appears; overall correct only if all 5 correct.
- **Variations tested:** epochs {8,10,20,50}; audio added; frame sampling 8→32 frames; frame numbers in answers; oracle event count in prompt; self-predicted event count (event-count model → oracle-count model); all frames instead of sampling; STC-connector-only probe (CLIP encoder + STC + one hidden layer + output, trained from scratch on single-event classification); bounding boxes (player) drawn in video / in prompt / both; + court corners + ball centre coordinates in prompt (every 2 frames; RAM-forced); 17 keypoints (every 20 frames) / 4 keypoints (every 5 frames) + court + ball in prompt; vision encoder unfrozen (1/4 epochs); CLIP fine-tuned alone (1 epoch) then separately reloaded into VideoLLaMA2 and LoRA fine-tuned (6/10 epochs), applied to both tasks.

## 4. Equations & assumptions
- Normalised segmental edit score (Lea et al. 2016), each event treated as one word:
  Edit Score = (1 − (event additions, deletions or replacements needed) / (number of events in longer label)) × 100.
- **Assumptions (unstated but operative):** the fixed prompt template is adequate (other prompts "made little changes"); sub-class correctness via keyword presence is a fair accuracy proxy; the F³EST benchmark (different granularity: 38/111 event types) is a fair comparison target.

## 5. Features / target
- **Inputs:** video frames (8 sampled by default, 32 in variants) ± textual side-information (player bounding-box lists, court-corner coordinates, ball (x,y) coordinates, keypoint lists, frame numbers, event counts).
- **Targets:** single event → 5 sub-class labels (56 classes); rally → ordered event sequence. Auxiliary: event count (single integer).

## 6. Validation design
- **Split:** FineTennis train/test (7,445 / 2,271 videos) — pre-defined split, no cross-validation reported; epoch sweeps used as a crude overfitting check.
- **Metrics:** per-sub-class accuracy and overall accuracy (single event); normalised edit score (sequences); event-count accuracy and mean absolute error of count.
- **Baselines:** the F³EST traditional model (edit scores 88.4 on 38 event types / 82.1 on 111 types — coarser/finer granularity than the 56-type task, noted as imperfect comparison).

## 7. Numerical results / baselines
- **Single-event fine-tuning (8 epochs):** e1 0.96, e2 0.73, e3 0.83, e4 0.72, e5 0.96, **overall 0.41**. 6 epochs → 0.28; 10 epochs → 0.41 (plateau).
- **Rally sequence (edit scores, 10 epochs default):** Default 8 epochs 30.2, 10 epochs 34.4, 20 epochs 33.1, 50 epochs 28.0 (overfit); audio 25.3; **32-frame sampling 39.7** (best pure-video); frame numbers in answer 33.9; **oracle event count in prompt 49.8**; self-predicted count 30.0; all-frames sampling 28.6 (no gain — sampling not the bottleneck). Benchmark (F³EST): 82.1.
- **Event counting:** accuracy 0.36; mean count error 1.31 (true mean 3.90, std 3.46).
- **STC connector alone:** accuracy 0.018 — indistinguishable from random, suggesting the STC connector's spatial-temporal features are near-useless for this task (paper's inference).
- **CV-feature fusion (Table 7):** Default (32 frames) 39.7 → bboxes drawn in video **18.2** (halved; drawn lines break the vision encoder) → **bboxes in prompt 61.3** → bboxes in video+prompt 59.1 → **bboxes + court corners + ball coords in prompt (every 2 frames) 76.0** (approaching the 82.1 benchmark) → 17 keypoints (every 20 frames) + court + ball 50.7 → 4 keypoints (every 5 frames) + court + ball 57.6.
- **Vision encoder (Table 8, single-event accuracy):** default 0.41; unfrozen encoder 1 epoch 0.087, 4 epochs 0.075 (overfit — train loss <0.1 by epoch 1); CLIP alone 1 epoch 0.43; **CLIP fine-tuned separately then reloaded into VideoLLaMA2: 0.55 (10 epochs) / 0.56 (6 epochs)**. Sequence task with separately fine-tuned CLIP: **54.6** (up from 39.7).
- **Qualitative:** model gets rally *structure* right — all rallies start with a serve and end with "last", players alternate near/far — showing strong textual pattern learning but poor video understanding.

## 8. Code / data availability
Code: https://github.com/bigcrushes/videollama2_tennis (re-formatted repo stated in Appendix A). FineTennis dataset access: not stated in this paper (the companion F³Set paper is in this wave). Model weights: not stated.

## 9. Leakage & limitations
- **Train/test rally split from the same tournaments:** possible near-duplicate rallies across splits (same match, adjacent points) — not addressed.
- **Accuracy-by-keyword metric is gameable:** a verbose answer containing the right label plus nothing contradictory counts as correct; this flatters the MLLM.
- **Tiny model + LoRA + shared cluster:** VideoLLaMA2-7B was chosen for VRAM reasons, not suitability; full fine-tuning (which the authors cite as likely better) was never run.
- **Benchmark mismatch:** F³EST evaluated on 38 and 111 event-type granularities vs the MLLM's 56 — the 82.1 comparison is approximate.
- **Oracle leakage in "providing event count":** feeding the true count is explicitly a diagnostic, not a real method (the self-predicted-count pipeline collapsed to 30.0).
- **RAM-bounded frame intervals** (every-2/5/20-frame sampling) mean the best results were achieved under hardware caps, not optimised.
- **External validity to NFL:** none directly — but the *failure pattern* generalises: a frozen generic vision encoder + LoRA is a poor sports-video event detector; the structural-fusion result transfers.

## 10. GSE overlap
Garrett's corpus has an active multimodal-fusion lane: the 2026-09-18 15-area ML brief lists multimodal fusion (area 13) as commissioned, and the text/news-as-features lane (gap list item 12) is thin. Nothing in `docs/research/` covers MLLMs for sports video. This dissertation is a **negative result plus a design pattern** for that lane: (a) raw MLLM video reasoning is weak at event *sequences* (edit scores 30–40 vs 82.1 benchmark); (b) the hybrid — traditional CV detectors produce structured coordinates, the LLM reasons over them as text — gets to 76.0, within 6 points of the benchmark. If GSE ever builds a video-content pipeline (game-film clip labelling, auto-tagging all-22 for the YouTube/TikTok lanes), the architecture to use is this hybrid, not an MLLM watching pixels. **Extension / new capability (multimodal fusion negative result).**

Per the existing-research map (2026-09-21, checked for MLLM/video-understanding coverage): no prior coverage of MLLMs applied to sports video — new ground.

## 11. GSE implementation spec
- **Relevant only if GSE builds film-analysis content tooling.** Do not build an MLLM-first video pipeline. Instead: (1) per-frame detectors: YOLOv8/v11 player detection + TrackNet-style ball tracking + court-keypoint detection (all cheap, well-trodden); (2) convert detections to compact text (per-play: player trajectories, ball positions, formation labels) — mirroring the paper's bbox+ball+court-in-prompt win; (3) use a strong LLM over that structured text for event narration, tactical Q&A, or automated clip description; (4) fine-tune the vision encoder *separately* (not joint-unfreeze) if vision features are needed, per the paper's CLIP result. Estimated effort: 2–3 weeks for a play-description prototype on broadcast footage, gated on the test below.

## 12. Reproducible test
Take 50 NFL plays (broadcast clips, publicly available highlights). Run an off-the-shelf player detector + ball tracker; feed structured per-frame coordinates into an LLM prompt asking for an event sequence description (formation → play type → result), with the true play description from the broadcast caption/commentary as reference; score by exact event-sequence match rate (GSE-adapted edit score). Baseline: the same LLM given only raw frames (or just the caption). Test the paper's central claim: text-structured CV features beat raw video reasoning.

## 13. Acceptance / rejection gate
PURSUE the hybrid CV→text→LLM architecture only if structured-feature prompting beats raw-frame prompting by ≥ 25 percentage points on event-sequence edit score on the 50-play window AND at least matches a cheap heuristic baseline (formation-from-pre-snap-detector lookup). Otherwise REJECT the MLLM film-analysis lane entirely and stay with deterministic CV detectors.

## 14. Improvement experiment
Test the paper's "sweet spot" hypothesis directly: vary the information density of the structured prompt (coordinates every frame vs every 2/4/8 frames vs compacted per-play summary statistics) and plot edit score vs token count — finding the information-density optimum, which the paper identifies as the key open design variable for any CV+LLM hybrid.
