# [1076] TVCalib: Camera Calibration for Sports Field Registration in Soccer (arXiv:2207.11709) — replacement read for 1610.06833

**Citation:** Jonas Theiner, Ralph Ewerth (2022). *TVCalib: Camera Calibration for Sports Field Registration in Soccer*. arXiv:2207.11709v2. Full-text URL: https://arxiv.org/pdf/2207.11709v2
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML via https://ar5iv.org/html/2207.11709, read cover to cover incl. appendices).
**Verdict:** REJECT — a computer-vision camera-calibration paper (estimating broadcast-camera pose/FoV from field markings); GSE does no broadcast-video processing, builds tracking features from NGS/public data instead, and the paper's only transferable tricks (loss-threshold self-verification, multi-init argmin) are generic optimization hygiene, not GSE capabilities. → replaced by a fresh arXiv search in the referee-bias/home-advantage sub-territory, ledger 1077.

## 1. Research question
Can sports field registration in broadcast soccer video be reframed from homography estimation to direct camera calibration — predicting individual pinhole-camera parameters (position, rotation, focal length) in one gradient-based optimization step from segment correspondences (lines, point clouds), without keypoint correspondences or training data for the calibration part?

## 2. Dataset / schema
- **SN-Calib (SoccerNetV3-Calibration):** 20,028 images from 500 SoccerNet matches; 540p; splits train 14,513 / valid 2,796 / test 2,719 (no stadium overlap); camera-type distribution test: Center 53.5%, Left 8.5%, Right 9.5%, Other 28.5%. Annotations: every visible field segment (lines, circle segments, goal posts) with ≥2 polyline points per segment.
- **WC14 (World Cup 2014):** 209 train/valid + 186 test images at 720p; all main broadcast camera, no large zoom; manually annotated homographies; authors additionally annotated segments on the test split per SN-Calib guidelines.
- DeepLabV3-ResNet101 instance segmentation trained on SN-Calib-train (images resized to 256px height; SGD, momentum 0.9, weight decay 1e-4, lr 0.01, 30 epochs, batch 8, ImageNet1k init).
- Public (SoccerNet). Main results evaluated on SN-Calib-test-center (1,454 images) and WC14-test (186 images).

## 3. Method / model
- **Calibration object:** soccer field as labeled segments — lines s_line={X_0+λX_1|λ∈[0,1]}, point clouds s_pc={X_j}, points s_point=X∈R³; circle split into left/right sub-segments by middle-line heuristic.
- **Camera model:** pinhole P=K·R·[I|−t]; square pixels, zero skew, principal point at image center; rotation R=R_z(roll)R_x(tilt)R_z(pan); intrinsics reduced to FoV (f_x^NDC=1/tan(0.5·FoV)); φ=(FoV,t,pan,tilt,roll); optional radial lens-distortion ψ={k1,k2} (kornia model), differentiable undistort enabling joint optimization.
- **Segment reprojection loss (Eq. 2):** L = (1/|S|) Σ_{c∈S} d_mean(undistort_ψ(x^(c)), π_φ(s^(c))) — mean point↔line / point↔point-cloud distance per segment, each segment equally weighted, computed in NDC for stability. All tensor ops with padding masks for variable pixel counts.
- **Optimization:** AdamW, lr 0.05, weight decay 0.01, 2000 steps, one-cycle schedule (pct_start=0.5); params standardized to zero mean / 95%-CI-scaled std from uniform camera-range priors; multiple initializations (center/left/right) with argmin-loss selection; self-verification: reject samples with loss > τ (τ=0.019 tuned on SN-Calib-valid-center, searched over [0.013,0.025]).
- **HDecomp baseline (Appendix B):** focal length from homography constraints (Hartley–Zisserman Alg. 8.2), R/t from K⁻¹H columns with SVD orthogonalization, LM refinement (cv2.solvePnPRefineLM) rejecting points with >100px reprojection error.
- Code: https://mm4spa.github.io/tvcalib (project page stated in title).

## 4. Equations & assumptions
Point-line distance: d(p,ŝ_line)=|det((π_φ(X_1)−π_φ(X_0));(π_φ(X_0)−p))|/|π_φ(X_1)−π_φ(X_0)| (Eq. 1). Loss: L=argmin_{φ,(ψ)} (1/|S|)Σ_c d_mean(undistort_ψ(x^(c)),π_φ(s^(c))) (Eq. 2). Metrics: AC@t=TP/(TP+FN+FP) for t∈{5,10,20}px (per-segment, all annotated points within t px of reprojected polyline); CR=completeness ratio; CS=(1−e^{−4CR})·Σ_{t}w·AC@t with w=[0.5,0.35,0.15] (Eq. 3); IoU_part/IoU_whole for homography.
**Assumptions:** known field dimensions (calibration object); pinhole model, square pixels, zero skew, centered principal point; camera on main tribune (init distributions: pan U(−45°,45°), tilt U(45°,90°), roll U(−10°,10°), FoV-range via aov U(8.2°,90°), positions per camera type); segment localization assumed accurate (no outlier-regularization term — stated limitation).

## 5. Features / target
Input: broadcast frame → DeepLabV3 instance segmentation → per-segment pixel selections (4 pts/line, 8 pts/point-cloud). Target: camera parameters φ (+ψ). No tabular features; vision pipeline.

## 6. Validation design
No training of the calibration module (optimization-only; 100 images used to approximate camera-type distribution). Baselines: homography decomposition of (a) Chen & Little 2019 retrieval+refinement, (b) Jiang et al. 2020 official model, (c) DLT-from-line-segments; each evaluated on GT and predicted segmentations. Metrics: AC@{5,10,20}, CR, CS, IoU_part. Ablations: GT vs predicted segmentation, τ self-verification, single vs multiple initialization (center-only vs stacked vs argmin), lens-distortion joint learning (Appendix D).

## 7. Numerical results / baselines
**SN-Calib-test-center camera calibration (Table 2, 1,454 images), GT segmentation:** TVCalib(τ): AC@5 68.7 / AC@10 88.0 / AC@20 96.1, CR 92.8, CS 76.9 — best; TVCalib no-τ: 65.3/84.2/92.6, CR 100.0, CS 75.5; HDecomp+[6]: 53.7/77.5/88.4, CR 80.3, CS 65.1; HDecomp+DLT Lines: 48.1/68.5/84.6, CR 79.8, CS 60.2.
**Predicted segmentation:** TVCalib(τ): 57.6/81.7/93.2, CR 93.7, CS 72.6; HDecomp+DLT Lines: 40.6/63.2/80.4, CR 79.6, CS 55.9 — segmentation quality is the bottleneck (GT→Pred drops AC@5 from 68.7 to 57.6).
**WC14-test calibration (Table 3, 186 images), GT seg:** TVCalib: 64.4/86.7/96.0, CR 100.0, CS 86.4; HDecomp+[6]: 52.8/78.8/91.3, CR 90.9, CS 79.0.
**Homography/IoU (Table 4):** TVCalib GT: IoU_part mean 96.1 / med 97.1; Chen & Little 2019 GT: 95.2/97.3; Shi et al. 2022 (grayed, from paper): 96.6/97.8 — SOTA-adjacent on IoU_part.
**Ablations:** 3-init argmin noticeably beats single center init; argmin slightly beats stacked (known camera type); lens distortion joint learning improves AC@5 on WC14 GT (64.4→68.4) but causes trivial local minima (FoV explosion) on low-FoV SN-Calib samples (CR 92.3→78.3).

## 8. Code / data availability
Project page https://mm4spa.github.io/tvcalib (in title); uses official Jiang et al. 2020 implementation; segmentation training details in Appendix C. No direct GitHub link printed in the extracted text.

## 9. Leakage
No GSE data-leakage interface exists: the paper's entire pipeline (segmentation → segment reprojection → camera parameters) operates on broadcast pixels GSE never touches. Evaluation protocol note only: the self-verification threshold τ=0.019 was tuned on SN-Calib-valid-center, a split the authors also use for ablations — mild in-paper tuning overlap, irrelevant to GSE.

## 10. Limitations
- CV-domain: gradient optimization prone to local minima (some GT-annotated samples rejected); only tribune cameras investigated; no outlier regularization in the loss; lens-distortion joint learning unstable on low-FoV samples.
- For GSE: the method's entire value chain serves video analytics (offside detection, virtual stadiums, auto camera control) — GSE consumes NGS/nflverse tracking products, never raw broadcast pixels. Nothing transfers to probability calibration, ratings, markets, or sizing.

## 11. GSE overlap
Map's tracking lane: NGS 27-family taxonomy (2026-09-21), STRAIN pass-rush metric (2305.10262), NGS replacement spec from public data. TVCalib is a *source-side* vision method for producing field registrations — the input GSE already gets from NGS/nflverse as a finished product. No overlap in methods; nothing in the map duplicates it, but equally nothing in GSE's pipeline can consume it. Overlap status: disjoint capability, zero product interface.

## 12. GSE implementation spec
None defensible. Building a broadcast-frame segmentation→calibration pipeline would be a new video-analytics product, far outside the prediction/fantasy scope and Garrett's explicit content lane.

## 13. Reproducible test
Not applicable to GSE data.

## 14. Numeric gate
**68.7** — TVCalib's AC@5 (GT seg, SN-Calib-test-center) vs 53.7 for the best HDecomp baseline; decisive for the paper's own claim, irrelevant to GSE. Rejected at the source: domain-disjoint from every GSE lane.

## 15. Improvement experiment
Not applicable for GSE. (For the CV community: the authors' own listed next steps — temporal consistency, other sports, end-to-end learning — are the natural follow-ups.)

## 16. Verdict

**REJECT** — a computer-vision camera-calibration paper domain-disjoint from every GSE lane: GSE consumes tracking as a finished product (NGS/nflverse), never raw broadcast pixels. Consumed the 1610.06833v1 replacement reserve; the compliant chain completed as 1610 REJECT → 2207 reserve REJECT → 2401 ADAPT (ledger 1077).
