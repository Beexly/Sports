# 1040 — Sport Task: Fine Grained Action Detection and Classification of Table Tennis Strokes from Videos for MediaEval 2022 (2301.13576)

## Citation / full-text source
Pierre-Etienne Martin, Jordan Calandre, Boris Mansencal, Jenny Benois-Pineau, Renaud Péteri, Laurent Mascarilla, Julien Morlier, "Sport Task: Fine Grained Action Detection and Classification of Table Tennis Strokes from Videos for MediaEval 2022", MediaEval 2022 workshop, arXiv:2301.13576v1 [cs.AI], 31 Jan 2023. Baseline: https://github.com/ccp-eva/SportTaskME22. Full text: export.arxiv.org/pdf/2301.13576 (6 pages, PDF parsed in full).

## Research question
This is a benchmark-task definition paper, not a method paper: how should the community evaluate fine-grained sports action models? It specifies two subtasks on TTStroke-21 table-tennis video — (1) stroke classification from trimmed clips, (2) stroke detection (temporal segmentation) from untrimmed video — with exact datasets, splits, submission formats, and metrics.

## Dataset / schema
Classification: 1,155 trimmed videos (>210K frames), 807 train / 230 val / 118 test; 20 stroke classes (8 services, 6 offensive, 6 defensive; Forehand/Backhand super-classes) + non-stroke. Detection: 28 untrimmed videos, 100 minutes, >718K frames at 120 FPS, 16/6/6 train/val/test (videos disjoint across sets; players may repeat). 1920×1080, 46.1 GB total. Faces blurred (SSD+ResNet detector + tracking). Annotations by professional players on a crowdsourced platform. Terms: usage agreement with the University of Delft; data destruction required by 2023-01-30 (the license window has expired — fresh access terms would be needed).

## Method
Task protocol design (the paper's contribution): subtask 1 = global + per-class accuracy on trimmed clips; subtask 2 = COCO-style temporal mAP (20 IoU thresholds 0.5–0.95, step 0.05; detection = True when temporal IoU ≥ threshold) for ranking + frame-wise temporal IoU as secondary. Up to 5 runs per subtask via XML submission; fully automatic; working-notes paper required; pre-trained models on prior years' TTStroke-21 forbidden.

## Equations / assumptions
mAP: temporal analogue of COCO — AP averaged over IoU thresholds {0.50, 0.55, …, 0.95}. Frame-wise IoU = overlap of predicted vs GT stroke frames across all videos. Assumptions: stroke temporal boundaries are well-defined enough for IoU-based detection scoring; trimmed classification clips contain exactly one stroke or none.

## Features / target
Features: video. Targets: (1) one of 21 classes per trimmed clip; (2) temporal boundaries (frame indices) of all strokes in untrimmed video.

## Validation
2021 edition results as reference: classification — best 74.2% global accuracy (SWIN-Transformer), ResNet-50 68.8%, baseline 20.4%; detection — no submission beat the baseline mAP; best frame-wise IoU 0.247 (YOLOv5) vs baseline 0.144.

## Exact results / baselines
2021 reference numbers: classification best 74.2% (Qian et al., SWIN, long-tail-aware), ResNet-50 68.8%, baseline 20.4%. Detection: baseline mAP unbeaten; YOLOv5 IoU 0.247 vs 0.144 baseline. 2022 dataset enriched so all strokes represented in every split; same TTStroke-21 split as Martin et al. [1,2] for cross-paper comparison.

## Code / data
Baseline code public: https://github.com/ccp-eva/SportTaskME22. Dataset under a restricted usage agreement (MediaEval 2022 Research Collections, University of Delft); faces blurred; destruction clause dated 2023-01-30.

## Leakage
2021: pre-trained models on prior years' TTStroke-21 explicitly forbidden for the 2022 edition. Trimmed clips drawn from the same untrimmed videos at non-overlapping moments (a mild within-video correlation to note). Detection sets use disjoint videos.

## Limitations
- Benchmark paper, not a method paper — zero novel architecture to adopt.
- Single-sport (table tennis), fixed camera, single player; 2021 detection results show the task is far from solved (mAP baseline unbeaten, IoU 0.247).
- License terms are expired/restrictive; the dataset is not freely reusable today.
- Class imbalance and long-tail effects dominate (2021's best method explicitly targeted long-tail bias).

## GSE overlap
The benchmark design itself is what GSE adapts: the two-subtask split (trimmed classification with known boundaries vs untrimmed detection+classification) and the COCO-style temporal mAP + frame-wise IoU metric pair are exactly the evaluation protocol GSE needs for its own fine-grained play/event benchmarks (e.g., route-type classification from trimmed clips vs play segmentation from full broadcast). The 2021 lesson — long-tail-aware training (SWIN 74.2% vs baseline 20.4%) decides fine-grained sports classification — transfers directly to NFL play-type distributions.

## Implementation (GSE adaptation)
GSE-ActionBench: define an internal benchmark with the same two subtasks for an NFL event (e.g., pass-play type from trimmed clips; drive segmentation from full game video), scored with global+per-class accuracy and COCO-style temporal mAP (0.5–0.95) + frame-wise IoU. Adopt the "forbid pre-training on prior benchmark years" rule to keep yearly comparisons honest, and require working-notes-style method documentation per model version.

## Reproducible test
Re-run the public baseline (github.com/ccp-eva/SportTaskME22) on the 2022 classification split and reproduce ≈20% (2021 baseline figure) to validate the evaluation harness before extending it to NFL data.

## Numeric gate
GSE's internal action benchmark is only useful if it reproduces the paper's metric behavior: a trivial baseline must score near chance on classification (validating task difficulty) and a strong model must show the long-tail gap (per-class accuracy spread ≥ 30 points between head and tail classes), mirroring the 2021 74.2-vs-20.4 dynamic.

## Improvement experiment
Add a third subtask the paper lacks: boundary-precision scoring (mean absolute boundary error in frames) for the detection task, since GSE's downstream products (clip extraction, highlight boundaries) care about exact cut points, not just IoU-thresholded mAP.

## Verdict
ADAPT
