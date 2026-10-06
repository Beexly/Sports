# [0338] ExposureEngine: Oriented Logo Detection and Sponsor Visibility Analytics in Sports Broadcasts (arXiv:2510.04739v1)

**Citation:** Mehdi Houshmand Sarkhoosh, Frøy Øye, Henrik Nestor Sørlie, Nam Hoang Vu, Dag Johansen, Cise Midoglu, Tomas Kupka, and Pål Halvorsen (2025). *ExposureEngine: Oriented Logo Detection and Sponsor Visibility Analytics in Sports Broadcasts*. arXiv:2510.04739v1. URL: https://arxiv.org/abs/2510.04739v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 8 sections + references).
**Verdict:** REJECT — sponsor-visibility measurement for rights holders is not a GSE product lane; the system solves a real problem GSE doesn't have. Retain two reusable fragments: the OBB tightness-ratio formalism and the event-weighted exposure idea.

## 1. Research question
Sponsor visibility in sports broadcasts is quantified manually (slow, subjective, unscalable) or with HBB-based detectors that overestimate logo area when logos appear rotated/skewed. Can an end-to-end system combining oriented bounding box (OBB) logo detection, polygon-based visibility metrics, and a language-driven agentic layer deliver auditable, rotation-aware sponsor analytics — demonstrated on Swedish elite soccer?

## 2. Dataset / schema
New dataset: 1,103 frames sampled at 1 FPS (near-duplicates removed) from 97 professional soccer highlight clips (32 matches, 16 teams, 2024 Swedish men's elite league; events: goals, shots, yellow cards, offsides, substitutions). **670 unique sponsor logo classes** annotated with OBBs in Label Studio (four-corner polygons, YOLO OBB format), with graphical variants split (e.g., Adidas icon vs. wordmark); long-tail class distribution (dominant sponsors >500 instances). 80-10-10 train/val/test split. Claimed first OBB-annotated soccer broadcast logo dataset. Public: https://huggingface.co/datasets/SimulaMet-HOST/ExposureEngine. Demo: https://youtu.be/tRw6OBISuW4.

## 3. Method / model
1. **OBB detector**: YOLOv11 with angle-regression head; six configs trained (v8/v11 × nano 2.7M / small 9.7M / medium 26.4M / large 44.5M parameters); 1280×720 input, batch 32, AdamW lr 0.001, 200 epochs on 3× NVIDIA A100 80GB (SLURM); augmentation: rotation, scaling, contrast.
2. **Loss**: Varifocal Loss replacing the BCE classification term (down-weights easy negatives via αp^γ, up-weights positives by localization quality q), keeping oriented-box IoU regression + distribution focal loss.
3. **Analytics pipeline**: frame-wise OBB detections → temporal/spatial filtering → standardized metric computation (exposure, coverage, detection counts) → dashboard with two synchronized players (all detections vs. selected brand) + brand rankings.
4. **Agentic layer** (LangGraph): Analysis Agent (metrics → insights), Highlight Agent (brand-specific clips above exposure thresholds), Sharing Agent (publishes to social with auth), Coordinator Agent (NL query → structured multi-step plan).

## 4. Equations & assumptions
Stated equations (copied faithfully):
- Soft-target BCE: `BCE(p,q) = −q log p − (1−q) log(1−p)`.
- Varifocal loss: `L_VFL = (αp^γ(1−y) + qy) × BCE(p,q)`, with `(γ,α) = (2.0, 0.75)`; classification term `L^ours_cls = (1/|A|) Σ_{a∈A} Σ_{c=1}^{C} L_VFL(p_{a,c}, y_{a,c}, q_{a,c})`.
- Total: `L = λ_box L_box + λ_cls L_cls + λ_dfl L_dfl` (oriented-box IoU loss + distribution focal loss on distance bins).
- Coverage: `c_{ℓ,i} = min(1, A_{ℓ,i}/A_f)` (clipped OBB polygon area / frame area); visibility `z_{ℓ,i} = 1 if c_{ℓ,i} > 0 else 0`.
- Exposure: `E_ℓ = Δt Σ_{i=1}^{N} z_{ℓ,i}`, `Δt = 1/r`.
- Avg coverage: `C̄^present_ℓ = 100·Σ_i z_{ℓ,i}c_{ℓ,i} / Σ_i z_{ℓ,i}`; `C̄^overall_ℓ = 100·Σ_i z_{ℓ,i}c_{ℓ,i} / N`; max coverage = max_i c_{ℓ,i}; detection count = total OBBs per brand.
- Tightness Ratio: `TR = area(OBB)/area(HBB)` (shoelace formula); Orientation Necessity = |angle vs. horizontal|, binned 0–90° in 5° steps.
Stated assumptions: (i) all visibility metrics derived directly from detections, no manual correction; (ii) coverage capped at 100%/frame against overlapping-detection overestimation; (iii) HBBs for comparison derived as minimum enclosing rectangles of OBBs (no independent HBB detector); (iv) precision-favored operating threshold for deployment.

## 5. Features / target
Inputs: broadcast video frames (MP4, images, HLS). Target: per-frame OBB detections over 670 logo classes + derived video-level exposure metrics per brand. Metrics: mAP@0.5, precision, recall, OBB-IoU distribution, TR vs. orientation, inference FPS.

## 6. Validation design
Six YOLO configs on held-out test split, same protocol; OBB vs. HBB ablation (same YOLOv11-Medium, HBB annotations derived from OBBs); OBB-IoU alignment analysis; TR analysis across orientation bins with 95% CIs; inference benchmark (MacBook M3 CPU vs. G4dn.xlarge GPU, 10-run averages on 30 s clip). No comparison against commercial systems (Relo Metrics, Blinkfire, Hive) — proprietary, undisclosed data.

## 7. Numerical results / baselines
- **Best config**: YOLOv11-Medium: **mAP@0.5 0.859, precision 0.96, recall 0.87**. Others: YOLOv8-Large 0.853/0.96/0.88; YOLOv11-Large 0.847/0.95/0.88; YOLOv8-Medium 0.846/0.96/0.88; YOLOv11-Small 0.817/0.96/0.86; YOLOv11-Nano 0.781/0.95/0.85. Larger capacity didn't improve precision-recall balance.
- **OBB vs. HBB**: 0.859 vs. 0.865 mAP@0.5 (HBB +0.6%), precision 0.96 vs. 0.95, recall 0.87 vs. 0.88 — all within ±1%, no statistically significant detection difference. **The OBB advantage is geometric precision, not detection accuracy.**
- **OBB-IoU**: 96.8% of predictions ≥0.5, 83.8% ≥0.7, 63.4% ≥0.9 — tight position/shape/orientation recovery.
- **TR**: highest near-horizontal, minimum ~0.40 at 55–60° orientation (HBB least efficient there); predicted TR curve tracks ground truth.
- **Inference**: GPU 50.0 ms/frame (19.98 FPS); CPU 148.7 ms (6.72 FPS) — near-real-time on GPU.
- Training dynamics: losses drop sharply in first 20 epochs; mAP@50–95 stabilizes in the high 0.7 range; DFL shows the largest train/val gap (precise boundaries on small/rotated/occluded logos are hardest).

## 8. Code / data availability
Dataset public (HuggingFace link above); analytics dashboard described; no code repo link in the text read. Video demo on YouTube.

## 9. Leakage & limitations
- **Long-tail bottleneck**: 670 classes, rare sponsors have poor recall; VFL helps but representational power for rare classes remains the limit — needs more seasons/leagues, copy-paste augmentation, semi-supervised learning (authors' own diagnosis).
- **No temporal tracking**: frame-wise aggregation is flicker-prone; OBB-aware tracking with polygon-IoU is future work — current exposure metrics inherit transient false positives/misses.
- **Single league/season**: Swedish 2024 only; generalization across leagues, production styles, venues untested.
- **Presence ≠ value**: the authors note exposure during goal celebrations is worth more than routine play, and 9:16 vertical crops change which logos matter — their metrics don't weight this yet.
- **Agent governance**: the paper itself flags that the sharing agent needs deterministic tool graphs, audit logs, and approval gates before external publishing — the automation inherits detector errors.
- **No GSE lane**: GSE measures picks/props/fantasy performance, not sponsor ROI; there is no rights-holder or advertiser customer in any GSE lane (Kit, cards, signage, content).

## 10. GSE overlap
No overlap with any GSE product lane or repo capability — this is a B2B sponsorship-measurement system for rights holders/broadcasters, a customer class GSE doesn't serve. The nearest repo touchpoint is the video/clip lane (0332/0333/0336), but logo detection serves no step of GSE's clip workflow (GSE's compliance concern is league footage rights, not sponsor quantification). Per the existing-research map: no prior logo/sponsor work, and none is needed. **Reject the system; keep the ideas.**

## 11. GSE implementation spec
No implementation recommended. Reusable fragments, if ever needed:
1. **Tightness Ratio** as a generic geometric-precision diagnostic for any rotated-object detection GSE builds (e.g., yard-line or pylon detection): TR = area(OBB)/area(enclosing HBB), stratified by orientation.
2. **Event-weighted exposure**: the authors' future-work idea — weight any per-frame metric by event importance (goal > routine play) and by distribution format (9:16 vertical ROI) — applies to GSE clip analytics if GSE ever measures on-screen graphic/watermark prominence.
3. **Agent approval gates**: the paper's own governance caveat (deterministic tool graphs + audit logs + approval before external publishing) reinforces ledger 0337's governance pattern for any agentic publishing GSE builds.
Effort if ever pursued: not applicable — no build.

## 12. Reproducible test
Not applicable (no build). The rejection criterion is product-lane fit, verified by inspection: GSE's revenue lanes (Kit websites, card sales, signage, sports content) contain no sponsorship-measurement customer or internal use case, confirmed against the repo corpus and existing-research map.

## 13. Acceptance / rejection gate
**Rejected.** Reverse the rejection only if GSE enters a lane requiring quantified on-screen brand measurement (e.g., selling sponsorship analytics to local advertisers for the signage lane, or auditing GSE watermark prominence in distributed clips) — then re-run this ledger's evaluation as an ADAPT with the OBB detector and exposure formalism as the starting point.

## 14. Improvement experiment
Not pursued under REJECT. If the gate above ever flips, the first experiment is the authors' own: add OBB-aware multi-object tracking (polygon-IoU association) and event-weighted exposure (goal/replay/vertical-crop weighting), and test whether track-level exposure metrics reduce the frame-wise flicker bias they diagnose — the paper's stated next step, directly reusable.
