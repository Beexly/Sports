# [0224] Deep Learning for Action Spotting in Association Football Videos (arXiv:2410.01304v1)

**Citation:** Cioppa, A. et al. (2024). *Deep Learning for Action Spotting in Association Football Videos*. arXiv:2410.01304v1. URL: https://arxiv.org/abs/2410.01304
**Ledger completed:** 2026-09-21. **Read:** full text (local file), entire text including methods, metrics, and all leaderboard tables (remainder of file is references only).
**Verdict:** ADAPT — this is a survey chapter, not an experiment; its transferable asset is the temporal action-spotting method catalog and the open-source OSL-ActionSpotting library, which could automate charting labels (snap, handoff, motion, personnel) from NFL All-22 film — a charting-data lane, not a prediction lane.

## 1. Research question
This is a timestamped survey chapter, not a single research question. It traces the history of the action-spotting task in sports video (identifying actions and localizing them with a single timestamp in long, untrimmed video) from the 2018 SoccerNet release through the 2024 challenges, covering datasets, methods, evaluation metrics, and a six-year benchmark retrospective. It asks: what has the community built, which methods work, and how is progress measured.

## 2. Dataset / schema
SoccerNet family (all open, soccer broadcast video), as tabulated:
- SoccerNet Action Spotting v1 (2018): 3 classes (Goal, Card, Substitution), 500 games, 6,637 annotations; 764 hours of footage from Serie A, La Liga, Premier League, Ligue 1, Bundesliga, Champions League (2014–2017); 1-second timestamp precision; pre-extracted ResNet/C3D/I3D features provided.
- SoccerNet Action Spotting v2 (2021): 17 classes (Penalty, Kickoff, Goal, Substitution, Offside, Shot on target, Shot off target, Clearance, Ball out of play, Throw-in, Foul, Indirect free-kick, Direct free-kick, Corner, Yellow card, Red card, Yellow-to-red card), 500+50 games, 110,458 annotations; 1-frame precision; adds replay grounding and camera shot segmentation tasks; distinguishes visible vs unshown actions.
- SoccerNet Ball Action Spotting (2023): 2 classes (Pass, Drive), 7+2 games, 11,041 annotated timestamps.
- SoccerNet Ball Action Spotting (2024): 12 classes (Pass, Drive, Header, High Pass, Out, Cross, Throw In, Shot, Ball Player Block, Player Successful Tackle, Free Kick, Goal), 7+2 games, 11,041 timestamps.
All soccer-only; no NFL data exists in this family. Access: open datasets via the SoccerNet initiative.

## 3. Method / model
Survey of 60+ methods, organized by the backbone → neck → head pipeline (ℳ = ℋ ∘ 𝒩 ∘ ℬ), split into feature-based and end-to-end:
- Feature-based: NetVLAD [13] (ResNet ImageNet features, PCA, NetVLAD pooling over sliding windows, classification head + NMS; baseline); NetVLAD++ [48] (temporally-aware pooling with separate clusters for pre/post-action frames); CALF [40] (context-aware loss weighting frames around ground-truth actions, 2-minute clips, segmentation head + YOLO-like spotting head with direct timestamp regression); Zhou et al. [51] (fine-tuned TPN/GTA/VTN/irCSN/I3D-Slow backbones + 3-layer 4-head transformer neck, 64 hidden dim; 2021 challenge winner); Soares et al. [57] (dense temporal detection anchors + temporal regression; 2022 challenge winner).
- End-to-end: E2E-Spot [58] (trainable ResNet/RegNet-Y/ConvNeXt backbone with TSM/GSM temporal shifts, GRU/MS-TCN/ASFormer neck, dense per-frame prediction head; 2022 runner-up); Baikulov [67] (stacked grayscale frames, EfficientNetV2-B0 2D encoder + 3D conv neck + GeM pooling + linear head; 2023 ball-action winner; transfer learning from v2, 15-frame then 33-frame fine-tuning); T-DEED [69] (2D RegNetY + Gate-Shift-Fuse modules backbone, SGP/SGP-Mixer temporally-discriminant encoder-decoder neck, classification + displacement head; 2024 ball-action winner; multitask training on v2 + ball-action data).
- Open-source library: OSL-ActionSpotting [41] (Benzakour et al., IEEE STAR 2024) — unified dataloaders, methods, and evaluation under one framework.

## 4. Equations & assumptions
Task formalization only:
- Action set per video: 𝒜ⁿ = {a₁ⁿ, ..., a_{Aⁿ}ⁿ}, each action a_kⁿ = (class c ∈ 𝒞, timestamp t ∈ [0, L]).
- Frame discretization: j = ⌊t/T + 1/2⌋ + 1, t̂ = (ĵ − 1) × T.
- Method pipeline: ℳ = ℋ ∘ 𝒩 ∘ ℬ.
- Evaluation: AP^c_δ = (1/11) Σ_{r'=0}^{10} max_{(p,r)∈Φ(r')} p (PASCAL VOC 11-point); mAP@δ = (1/C) Σ_c AP^c_δ; a-mAP = (1/Δ) Σ trapezoid over (δ, mAP@δ) curve. a-mAP_loose: Δ=11, 5s steps, δl=5s, δh=60s. a-mAP_tight: Δ=4, 1s steps, δl=1s, δh=5s. Matching: one-to-one iterative, confidence threshold τ over 200 values in [0,1), same class, |t̂ − t| ≤ 0.5δ.
- Assumptions (implicit in the task): actions are point events (single timestamp), annotation rules follow IFAB Laws of the Game (e.g., goal = ball crossing the line), broadcast footage is the input domain. No predictive-model equations; none invented.

## 5. Features / target
Input: raw broadcast video frames (or pre-extracted ResNet/C3D/I3D features). Target: per video, a set of (class, timestamp, confidence) triplets for each action of interest. Evaluation targets: mAP@δ at fixed tolerances, a-mAP_loose / a-mAP_tight, mAP@1 for ball actions.

## 6. Validation design
No single train/val/test experiment — the chapter reports challenge leaderboards on held-out test/challenge sets (2021–2024 SoccerNet challenges). Splits are by games (e.g., 7 train/val + 2 held-out games for ball action). Metrics: a-mAP variants and mAP@δ as above; rankings by a-mAP_loose (v1), a-mAP_tight (v2), mAP@1 (ball action). Visible vs unshown action breakdowns reported for analysis.

## 7. Numerical results / baselines
Leaderboard numbers exactly as stated:
- v1 (3 classes, test a-mAP_loose): Nakazawa et al. 81.6 (Goal 87.1, Card 63.3, Substitution 94.3); RMSNet 75.1; NetVLAD baseline 49.7; CALF 62.5.
- v2 (17 classes, challenge set): a-mAP_tight main — MEDet 71.31 (visible 76.29, unshown 54.09), mt_player 71.10, ASTRA 70.10, team_ws_action 69.17, Soares et al. 68.33 (test tight main 65.07); a-mAP_loose main — ASTRA 79.21, mt_player 78.79, MEDet 78.56, Soares et al. 78.06. "Several methods surpass the 70% mark in a-mAP_tight" (2023 edition). Unshown-action scores are far lower than visible (e.g., Soares 60.88 vs 73.22 loose).
- Ball Action 2023 (2 classes, mAP@1): Ruslan Baikulov 87.04 test / 86.47 challenge; Wang et al. 86.37 / 83.39; E2E-Spot 69.43 / 62.72.
- Ball Action 2024 (12 classes, mAP@1 challenge): T-DEED 73.39 (a-mAP_tight 77.25); UniBw Munich–VIS 71.35; FS-TAHAKOM 67.09; MobiusLabs 62.53; Baikulov 56.15.
- More than 60 methods published over five years on action spotting alone.

## 8. Code / data availability
Code links as stated in the chapter's table notes: OSL-ActionSpotting (unified library, Benzakour et al. 2024); NetVLAD https://github.com/SoccerNet/sn-spotting/tree/main/Benchmarks/Pooling; CALF https://github.com/SoccerNet/sn-spotting/tree/main/Benchmarks/CALF; NetVLAD++ https://github.com/SoccerNet/sn-spotting/tree/main/Benchmarks/TemporallyAwarePooling; E2E-Spot https://github.com/jhong93/spot; T-DEED https://github.com/arturxe2/T-DEED; Baikulov https://github.com/lRomul/ball-action-spotting; ASTRA https://github.com/arturxe2/ASTRA; Zhou et al. https://github.com/baidu-research/vidpress-sport; RMSNet https://github.com/aimagelab/RMSNet_Soccer. Data: SoccerNet datasets (open). No NFL data.

## 9. Leakage & limitations
- Survey chapter: all results are cited leaderboard numbers, not experiments run by the authors for this paper; no ablations of its own.
- Soccer-only: datasets, annotation rules (IFAB), and tuned methods are all football-specific; ball-action classes (pass/drive/cross) do not exist in NFL.
- Unshown-action performance is poor across methods (loose mAP drops ~15–25 points vs visible), which matters because the most valuable NFL charting targets (coverage shells, pre-snap motion) are often off-ball or off-screen.
- End-to-end methods need large annotated video corpora; NFL has no public equivalent of SoccerNet — building the annotation set is the real cost.
- Action spotting is a perception/annotation tool, not a predictive model; it cannot directly improve game predictions without a downstream use of its labels.

## 10. GSE overlap
No overlap: the corpus has no video-understanding or automated-charting work (NGS tracking taxonomy covers structured tracking data, not broadcast video). GSE's charting inputs (FTN charting, nflverse) are third-party structured data. Automated label extraction from All-22 film is a genuinely new data-sourcing capability, not a duplicate. The thin-lane fit: it would reduce dependence on manual charting providers for features like motion, personnel groupings, and formation tags.

## 11. GSE implementation spec
Pilot as an annotation pipeline, not a model:
1. Define an NFL action set analogous to ball-action spotting: snap, handoff, pass release, catch, tackle, pre-snap motion start — 6–8 classes with single-timestamp rules (mirror the paper's IFAB-style precision rules).
2. Start from the open-source OSL-ActionSpotting library and a pretrained E2E-Spot/T-DEED checkpoint; fine-tune on a hand-annotated sample of All-22 clips (annotate ~20 games' worth of the 6–8 actions).
3. Evaluate with the paper's own metric (mAP@1, a-mAP_tight) on held-out games.
4. If the pilot clears the gate, scale annotation and feed the labels as charting features (motion rate, personnel groupings) into GSE's feature store.
Estimated effort: 1 week for the pilot (annotation is the bottleneck); full scale-up only after the gate.

## 12. Reproducible test
Dataset: hand-annotated All-22 clips from 20 NFL games (2024 season), 6–8 action classes with single-timestamp labels; 14 games train, 3 val, 3 held-out test. Metric: mAP@1 and a-mAP_tight on the held-out games, using OSL-ActionSpotting's evaluation. Baseline to beat: a simple frame-difference + heuristic detector baseline (or the paper's reported ball-action numbers as a reference point — T-DEED 73.39 mAP@1 on 12 soccer classes).

## 13. Acceptance / rejection gate
Adopt (proceed to scale-up) if the fine-tuned spotter reaches mAP@1 ≥ 0.60 on the 3 held-out NFL games for the core classes (snap, handoff, pass release) — a level that makes the labels usable as charting features. Reject/shelve otherwise; in particular reject if performance collapses on off-ball actions (motion, tackle) the way unshown actions collapse in the soccer benchmarks, since those are the labels with the most charting value.

## 14. Improvement experiment
Go beyond the paper by fusing the video spotter with structured tracking data: use NGS-style player coordinates as an auxiliary input stream to the neck (the paper's methods are video-only). Test whether a two-stream (video + tracking) spotter beats the video-only model on off-ball actions — the exact failure mode the survey documents (unshown actions). If it works, GSE gets a charting pipeline that neither pure video nor pure tracking methods can match.
