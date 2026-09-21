# 0630 A Survey on Video Action Recognition in Sports (arXiv:2206.01038v1) — REPLACEMENT for 0620

**Citation:** Wu, F., Wang, Q., Bian, J., Xiong, H. et al. *A survey on video action recognition in sports: datasets, methods and applications* (arXiv:2206.01038v1). URL: https://arxiv.org/abs/2206.01038
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the survey's dataset inventory (SoccerNet, MultiSports, FineGym, Diving48) and its method taxonomy (2D vs 3D vs transformer vs pose-GCN, with the 3D-beats-2D-at-a-cost conclusion) are the fastest on-ramp for GSE's experimental video lane; use it as a build menu, not a result to cite.
**Replacement note:** this paper replaces ledger 0620 (arXiv:1706.04336v1, REJECT) under the replace-on-reject rule. It was fully read — not abstract-screened.

## 1. Research question
What is the state of video action recognition as applied to sports: which datasets exist across 10+ sports, which method families work, where do team sports vs. individual sports differ, and what are the open challenges and applications?

## 2. Dataset / schema
The survey's dataset table (Section II) inventories sports video datasets, including:
- **SoccerNet** (football, 2018): 500 full matches, event localization + classification; 17,115 highlight annotations usable for detection/recognition/localization.
- **MultiSports** (2021): 4 team sports (aerobic gymnastics, football, basketball, volleyball), 66 action categories, spatio-temporal annotations.
- **FineGym** (gymnastics, 2020): 288 fine-grained categories, classification + localization.
- **Diving48** (diving, 2018): 18k clips, 48 fine-grained dive classes.
- **FSD-10** (figure skating): fine-grained jump/spin classes.
- **Volleyball / Basketball datasets** (Ibrahim et al. [3], 2016): multi-player activity labels (dive, screen, spike, set...).
- General-purpose sets used for pretraining: Sports-1M, Kinetics-400/700, UCF101, HMDB51.
- Availability column per dataset (most public; several team-sport sets are not).

## 3. Method / model
The survey's taxonomy (Section III):
- **2D models:** frame-wise CNNs with temporal fusion — slow fusion, **TSN** (segment sampling + optical-flow streams + late aggregation), **TSM** (temporal shift modules in 2D blocks), CNN-LSTM/LRCN families.
- **3D models:** **C3D** (8× 3×3×3 conv), **I3D** (9 3D inception modules + 4 3D conv), **P3D** (factorized 2D+1D), **SlowFast** (dual slow/fast branches + lateral connections), **TFCNet** (temporal fully-connected over SlowFast), **TPN** (temporal pyramid).
- **Transformers:** TimeSformer, ViSwin/BEVT, VIMPAC (masked pretraining + contrastive).
- **Pose/skeleton:** ST-GCN and graph-convolutional families on joint trajectories.
- Key team-sports insight: actions involve **multiple players + ball trajectory + interactions** — recognition requires tracking all agents and modeling interactions; individual sports need only person detection.

## 4. Equations & assumptions
Survey paper — no novel equations; it summarizes architectures qualitatively. Stated assumptions across the field: actions are decomposable into spatio-temporal patterns learnable from RGB+flow; pretraining on Kinetics/Sports-1M transfers to fine-grained sports classes; multi-player interaction modeling (graphs, relational modules) captures team-sport structure.

## 5. Features / target
- Inputs: RGB frames, optical flow (MBH/HOF/dense trajectories in classical methods; learned flow streams in two-stream nets), pose skeletons.
- Targets: action class labels (coarse → fine-grained, e.g., 48 dive types in Diving48, 288 gym elements in FineGym), plus temporal localization and spatio-temporal detection in the newer sets.

## 6. Validation design
Benchmark tables (Section III, Tables III–IV): top-1 accuracy on the sports datasets and on generic sets (Kinetics-400, UCF101, HMDB51, Sports-1M) for cross-family comparison. The survey's synthesis conclusion: **3D models normally outperform 2D models, but cost more compute**; transformers are competitive with the best 3D CNNs when pretrained at scale.

## 7. Numerical results / baselines
- **C3D: 61.1% on Sports-1M** (competitive at its time).
- **TFCNet: 88.3% on Diving48** — ~11 points above SlowFast on the same set (the survey's standout fine-grained result).
- 2D baselines on generic sets for calibration: CNN-LSTM 88.6% UCF101; LRCN 82.7%; Composite LSTM 75.8% UCF101 / 44.0% HMDB51.
- OlympicSports-style YouTube sets are noted as harder (occlusions, camera motion) than self-recorded sets; smartphone/coach-view datasets are lower quality than broadcast.
- Applications inventoried: coaching/education, referee assistance, **TV highlight generation** (action recognition improves localization accuracy — refs [33–36]).

## 8. Code / data availability
- Toolbox: **https://github.com/PaddlePaddle/PaddleVideo** — supports football, basketball, table tennis, figure skating action recognition (PaddlePaddle framework).
- Datasets: availability per dataset in the survey's table; SoccerNet, Diving48, FineGym public.

## 9. Leakage & limitations
- Survey is 2022-vintage: it predates the video-LLM era (no MLLM coverage — compare ledger 0624/SPRINT for the current frontier) and its "state of the art" tables are stale.
- Accuracy numbers across datasets are not comparable (different sports, granularities, annotation quality); the survey doesn't normalize for this.
- Team-sport datasets with the richest labels (multi-player interactions) are disproportionately the *non-public* ones.
- The PaddlePaddle toolbox is a maintenance risk (framework with a smaller community than PyTorch).
- For GSE: this is a *menu*, not evidence — nothing here is validated on NFL footage, and highlight-generation applications are adjacent to (not the same as) the injury-hazard use case in ledger 0624.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. **No video/computer-vision lane exists** in the GSE corpus. This pairs with ledger 0624 (SPRINT): SPRINT gives the evaluation protocol for hazard understanding; this survey gives the **dataset + architecture menu** for building the video models themselves. Jointly they define the experimental video lane. Duplicates nothing.

## 11. GSE implementation spec
- Data: start from the survey's public sets for pipeline validation (SoccerNet for event localization — football is the closest team-sport analog), then move to licensed NFL All-22/practice footage.
- Build: (1) reproduce a SlowFast or TSM baseline from PaddleVideo (or a PyTorch equivalent — prefer PyTorch for maintenance) on SoccerNet event classification; (2) fine-tune to NFL play-type/event recognition (formation, play result, personnel); (3) add the pose stream (ST-GCN) for the injury-hazard direction per ledger 0624 §14.
- Applications in GSE order: auto-charting (events, formations) first — it has immediate product value for the content operation; injury-hazard detection second (research).
- Effort: ~3–4 weeks for the SoccerNet baseline + NFL fine-tune pilot.

## 12. Reproducible test
Dataset: SoccerNet-v2 (public) event classification. Baseline: the survey's reported SlowFast-class numbers on the same split. Metric: top-1/mAP on event classification. Success: reproduce within 3 points of the published number with a PyTorch implementation — this validates the pipeline before any NFL footage is touched.

## 13. Acceptance / rejection gate
ADOPT the video lane's architecture menu iff the SoccerNet reproduction lands within 3 points of published accuracy AND a pilot fine-tune on ~200 labeled NFL plays achieves top-1 ≥ 0.70 on play-type classification. If the NFL pilot < 0.60, park the lane — the domain gap (broadcast NFL vs. training corpora) is too wide for the current budget. Gate set before running the test.

## 14. Improvement experiment
Train a **single multi-task model** (event classification + temporal localization + pose estimation) on the NFL pilot instead of the survey's single-task baselines. Why it might win: the survey treats recognition, localization, and pose as separate literatures; in football, *where* and *when* something happens (localization) and *how bodies move* (pose) are the same underlying signal as *what* happened — multi-task training shares the spatio-temporal representation and should beat single-task models on small NFL pilots where data efficiency dominates.
