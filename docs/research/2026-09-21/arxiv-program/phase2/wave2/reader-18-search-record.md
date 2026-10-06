# Reader 18 — sports-CV replacement search record (2026-09-21)

Program: arXiv-750 valuable, phase 2 / wave 2. Assignment file: `~/workspace/arxiv-sweep/phase2-assignments/assign-18.jsonl` (12 records, all duplicates per done-ids.txt check, 1493 IDs).
Ledger prefixes: 1026–1049, reconfirmed unused 2026-09-21 (no files matching `^10(2[6-9]|[3-4][0-9])` in `phase2/wave2/ledgers/`).
Quarantine preserved: `1028-google-research-football-rl-environment.md`, `1029-node-classification-integrated-reject-option.md` untouched.

Focus (eligible only): sports action recognition, sports pose estimation, athlete action classification, human pose sports analytics.
Excluded: player tracking / multi-object tracking as the paper's focus.

## Query 1 (2026-09-21)
**Exact query:** `search_query=all:sports+AND+ti:action+AND+ti:recognition`, max_results=30, sortBy=relevance (arXiv export API).
Surfaced (relevant, in order): 2206.01038 (survey), 2507.17844 (SV3.3B), 2012.00253 (highlights framework), 1709.08421 (Kendo summarization), 2109.01305 (Video Pose Distillation, ICCV'21), 2404.19383 (CFSC skeleton fencing), 2502.21085 (BST badminton transformer), 2503.04470 (Gate-Shift-Pose figure skating), 1512.07502 (2015 CAFFE/UCF — too old/weak, rejected on age), 2403.12385 (badminton fine-grained dataset benchmark).
**Dedup (stripped ID vs done-ids.txt, 1493 IDs):**
- 2206.01038 → DUPLICATE (skip)
- 2507.17844 → DUPLICATE (skip)
- 2502.21085 → DUPLICATE (skip)
- 2012.00253 → fresh ✓
- 2109.01305 → fresh ✓
- 2404.19383 → fresh ✓
- 2503.04470 → fresh ✓
- 2403.12385 → fresh ✓
**Selection rationale:** 5 fresh papers, all sports action recognition with methods (pose distillation, skeleton GCN cascade, RGB+pose fusion, fine-grained dataset) — on-topic for GSE motion analytics. 1512.07502 rejected as obsolete (2015, student report, UCF sports subset).

## Query 2 (2026-09-21)
**Exact query:** `search_query=all:sports+AND+ti:pose+AND+ti:estimation`, max_results=30, sortBy=relevance.
Surfaced (relevant): 2304.04437 (partial field registration 3D HPE, CVsports'23), 2507.20763 (KASportsFormer), 2507.12905 (AthleticsPose dataset), 2405.01112 (VR viewing + tracking + pose), 2104.09907 (table tennis stroke recognition), 2504.08175 (combat sports physics pose), 2411.06725 (GTA-Net IoT posture), 2112.00627 (DeepSportLab), 2003.14109 (camera pose — not human pose, rejected), 2503.18282 (TrackID3x3 — multi-object tracking focus, EXCLUDED per rules).
**Dedup:**
- 2304.04437 → fresh ✓
- 2507.20763 → DUPLICATE (skip)
- 2507.12905 → DUPLICATE (skip)
- 2104.09907 → DUPLICATE (skip)
- 2504.08175 → DUPLICATE (skip)
- 2112.00627 → DUPLICATE (skip)
- 2405.01112 → DUPLICATE (skip)
- 2411.06725 → fresh ✓
**Selection rationale:** 2 fresh papers. 2503.18282 excluded (tracking-focused). 2003.14109 rejected (camera calibration, not human pose analytics).

## Query 3 — athlete action classification (attempted 2026-09-21)
**Exact query:** `search_query=all:athlete+AND+ti:action+AND+ti:classification` — arXiv API fetch failed (tool error, terminal for the turn). RETRY PENDING next turn.

## Fresh candidates banked: 7 / 12
1. 2012.00253 — A New Action Recognition Framework for Video Highlights Summarization in Sporting Events
2. 2109.01305 — Video Pose Distillation for Few-Shot, Fine-Grained Sports Action Recognition
3. 2404.19383 — Cross-Block Fine-Grained Semantic Cascade for Skeleton-Based Sports Action Recognition
4. 2503.04470 — Gate-Shift-Pose: Enhancing Action Recognition in Sports with Skeleton Information
5. 2403.12385 — Benchmarking Badminton Action Recognition with a New Fine-Grained Dataset
6. 2304.04437 — Monocular 3D Human Pose Estimation for Sports Broadcasts using Partial Sports Field Registration
7. 2411.06725 — GTA-Net: An IoT-Integrated 3D Human Pose Estimation System for Real-Time Adolescent Sports Posture Correction

## Still needed: 5 more fresh candidates
Planned queries (next turn): athlete action classification (retry); human pose sports analytics; figure skating / gymnastics action recognition; skeleton-based sports action (older/classic papers); sports video understanding.
Duplicates skipped total: 8 (2206.01038, 2507.17844, 2502.21085, 2507.20763, 2507.12905, 2104.09907, 2504.08175, 2112.00627, 2405.01112 — 9 total).
Rejected non-dedup: 1512.07502 (obsolete), 2003.14109 (camera pose, off-topic), 2503.18282 (tracking focus, excluded).
Excluded: 2609.10615 — generic retail-pricing abstention paper; fully read by mistake (6,045 lines) but INVALID per correction; abandoned, no ledger, no count, not added to done-ids.

## Query 3 — athlete action classification (retried 2026-09-21)
**Note:** prior turn's failure was an endpoint error (`api/query.php` 404s); correct endpoint is `api/query`. Retry succeeded.
**Exact query:** `search_query=all:athlete+AND+ti:action+AND+ti:classification`, max_results=30, sortBy=relevance.
Surfaced (4 hits): 2112.11384 (table tennis fine-grained, DUPLICATE), 2301.13576 (Sport Task table tennis fine-grained detection/classification, fresh ✓), 2109.14306 (Three-Stream 3D/1D CNN table tennis, fresh ✓), 2604.01318 (ViTs risky-tackle NFL, DUPLICATE).
**Selection rationale:** 2 fresh fine-grained action classification papers (both table tennis stroke classifiers — exact GSE-adjacent technique).

## Query 4 — human pose sports analytics (2026-09-21)
**Exact query:** `search_query=all:human+AND+ti:pose+AND+all:sports+AND+ti:estimation`, max_results=30, sortBy=relevance. 30 hits.
**Dedup fresh / relevant:** 2503.07499 (AthletePose3D benchmark dataset for 3D HPE + kinematic validation in athletics, fresh ✓); 1902.04250 (post-data augmentation for extreme/wild pose, fresh, general not sports); 2312.06965 (HAR + NLG + pose, fresh, general); 2310.13039 (survey, fresh, general); 2407.03817 (multi-view survey, fresh, general). Rest: duplicates of Q2 banked pair or general HPE surveys (1603.08212, 1607.08128, 2009.10013, 2308.13872 — general, not sports analytics) or off-topic (clinical 2503.14760, clothes 2212.04820, spine 2504.08110, egocentric 2505.22007).
**Selection rationale:** 1 fresh — 2503.07499 AthletePose3D (sports-specific 3D pose benchmark with kinematic validation; directly GSE-relevant). General-HPE papers skipped as not sports analytics.

## Query 5 — skeleton-based sports action classics (2026-09-21)
**Exact query:** `search_query=all:skeleton+AND+all:sports+AND+ti:action+AND+ti:recognition`, max_results=30, sortBy=relevance. 4 hits.
Surfaced: 2503.04470 (banked), 2404.19383 (banked), 2502.21085 (DUPLICATE), 2311.12300 (infant action recognition — off-topic, rejected).
**Selection rationale:** no new fresh candidates; infant paper off-topic.

## Query 6 — sports video understanding (2026-09-21)
**Exact query:** `search_query=all:sports+AND+ti:video+AND+ti:understanding`, max_results=30, sortBy=relevance. 28 hits.
**Dedup fresh / relevant:** 2104.11452 (SportsCap monocular 3D motion capture + fine-grained understanding in sports, fresh ✓); 1912.04465 (SoccerDB large-scale comprehensive sports video database, fresh ✓); 2004.06704 (FineGym hierarchical fine-grained gymnastics dataset, fresh, general-gymnastics); 2301.06866 (scalable video understanding benchmarks through sports, fresh, generic); 2407.08200 (deep understanding of soccer match videos, fresh, soccer); 2608.19646 (PL-NBA possession-level basketball dataset, fresh); 2607.21267 (BasketEvent, fresh); 2412.01820 (universal soccer video understanding, fresh); 2406.14877 (sports understanding of LMs, fresh, LLM-eval not CV); rest duplicates of Q1/Q2 or generic MLLM benchmarks.
**Selection rationale:** 2 fresh selected — 2104.11452 (SportsCap, 3D motion capture for sports) and 1912.04465 (SoccerDB, canonical large sports video dataset, 2019 classic with lasting value). LLM-eval papers (2406.14877, 2509.11796) skipped as not CV/analytics; basketball datasets deprioritized vs soccer canonical.

## Fresh candidates banked: 12 / 12
1. 2012.00253 — Action Recognition Framework for Video Highlights Summarization in Sporting Events
2. 2109.01305 — Video Pose Distillation for Few-Shot, Fine-Grained Sports Action Recognition (ICCV'21)
3. 2404.19383 — Cross-Block Fine-Grained Semantic Cascade for Skeleton-Based Sports Action Recognition
4. 2503.04470 — Gate-Shift-Pose: Action Recognition in Sports with Skeleton Information
5. 2403.12385 — Benchmarking Badminton Action Recognition with a New Fine-Grained Dataset
6. 2304.04437 — Monocular 3D Human Pose Estimation for Sports Broadcasts using Partial Sports Field Registration
7. 2411.06725 — GTA-Net: IoT-Integrated 3D Human Pose Estimation for Sports Posture Correction
8. 2503.07499 — AthletePose3D: A Benchmark Dataset for 3D Human Pose Estimation and Kinematic Validation in Athletics
9. 2104.11452 — SportsCap: Monocular 3D Human Motion Capture and Fine-Grained Understanding in Challenging Sports
10. 2109.14306 — Three-Stream 3D/1D CNN for Fine-Grained Action Classification and Segmentation in Table Tennis
11. 2301.13576 — Sport Task: Fine-Grained Action Detection and Classification of Table Tennis Strokes from Videos
12. 1912.04465 — SoccerDB: A Large-Scale Database for Comprehensive Video Understanding

Duplicates skipped total this pass: 13 (9 prior + 2112.11384, 2604.01318, 2502.21085 seen again).
Rejected non-dedup total: 1512.07502 (obsolete), 2003.14109 (camera pose), 2503.18282 (tracking focus), 2311.12300 (infant action, off-topic).

## Replacement chain map (reader 18, 12 duplicates → 12 fresh, order-matched)
| # | Duplicate assignment ID | Fresh paper | Ledger |
|---|---|---|---|
| 1 | 2402.16300 | 2012.00253 | 1030 |
| 2 | 2410.10736 | 2109.01305 | 1031 |
| 3 | 2412.03190 | 2404.19383 | 1032 |
| 4 | 2501.08397 | 2503.04470 | 1033 |
| 5 | 2502.06884 | 2403.12385 | 1034 |
| 6 | 2508.07617 | 2304.04437 | 1035 |
| 7 | 2510.19672 | 2411.06725 | 1036 |
| 8 | 2602.04714 | 2503.07499 | 1037 |
| 9 | 2602.17918 | 2104.11452 | 1038 |
| 10 | 2603.08907 | 2109.14306 | 1039 |
| 11 | 2605.02611 | 2301.13576 | 1040 |
| 12 | 2606.29203 | 1912.04465 | 1041 |
