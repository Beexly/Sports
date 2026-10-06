# [0371] Can Geometry Save Central Views for Sports Field Registration? (arXiv:2504.20052v1)

**Citation:** Floriane Magera, Thomas Hoyoux, Martin Castin, Olivier Barnich, Anthony Cioppa, Marc Van Droogenbroeck (2025). *Can Geometry Save Central Views for Sports Field Registration?* arXiv:2504.20052v1. URL: https://arxiv.org/abs/2504.20052
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1324 lines).
**Verdict:** ADAPT — the pole-polar ellipse↔circle construction is a clean exact-geometry trick for deriving point/line correspondences from circle detections, directly applicable to NFL field geometry (50-yard-line markers, logo circles) for broadcast-frame calibration, but the failure case (only a partial circle, no center detection) is the realistic NFL case, so port only Cases 1–2 with NFL field markings.

## 1. Research question
Can single-frame sports field registration be rescued for "central views" (zoomed-in shots showing only the center circle and halfway line) — where existing methods fail because circle correspondences can't easily enter the linear DLT equations — by deriving exact point and line correspondences from circle detections via projective geometry (pole-polar relationships), including when only a partial arc of the circle is visible?

## 2. Dataset / schema
- **SoccerNet test subsets (sn-calibration, sn-gamestate):** 8,565 images where the central circle is visible and fewer than 3 lines are visible — used for the in-domain detector comparison and the quantitative Table 1 evaluation (public benchmark).
- **OOD set (new, 300 images):** central views of empty smaller stadiums with lower viewpoints, no ground truth — used to demonstrate PnLCalib's learned virtual keypoints failing out-of-domain.
- **Synthetic experiment:** 100 randomly sampled plausible main-camera poses (position, orientation, focal length); pinhole parameters converted to ground-truth homographies H mapping synthetic image to the top-view field template (playfield at Z=0); 8 points sampled along inner/outer ellipses of the center circle (8 cm marking thickness), projected to 1080p, corrupted with zero-mean Gaussian noise σ ∈ [0, 25] px, ellipses fitted with Fitzgibbon's method.

## 3. Method / model
Bottom-up geometric correspondence extractor (combined with the PnLCalib calibration backend to get final calibrations):
- From off-the-shelf detectors: ellipse E = H^{−T} C H^{−1} (projection of world circle C) + imaged circle center c = H o (or recovered via concentric-circle eigen-analysis when the center is not detected).
- **Case 1 (circle + line correspondence):** vanishing line l_vanishing = E c (Eq. 4); vanishing point of parallels to detected line l_1: v = l_1 × l_vanishing (Eq. 5); parallel through center l_2 = v × c (Eq. 6) intersects ellipse in a, b (2 point correspondences); polar l_3 = E v (Eq. 7) passes through c and intersects ellipse in d, e (2 more points; their tangents are parallel to l_1).
- **Case 2 (circle + point correspondence):** line through point and center l_1 = x × c (Eq. 8); pole v = E l_1 (Eq. 9); l_2 = v × c (Eq. 10) gives d, e; l_2 ⊥ l_1. (Paper notes Case 2 collapses to Case 1 for soccer central views since the only available points lie on the middle line — not investigated further.)
- **Case 3 (unknown center):** concentric circles C_1, C_2 (the ~10 cm marking thickness gives two circles); c is an eigenvector of E_2^{−1} E_1 (Huang et al. 2015); l_vanishing = E_1 c = λ E_2 c; then Case 1/2 as above. Left-right/up-down ambiguity resolved with camera-position priors.
- Total: 8 point correspondences (plus 8 tangent lines) from a single circle + one line. The correspondences also serve as a geometrically consistent way to *annotate* keypoints along circles (solving the chicken-and-egg problem that virtual keypoints can only be annotated where homography is already solvable).

## 4. Equations & assumptions
- Circle as conic: x^T C x = 0. (Eq. 1)
- C = [[1, 0, −o_x], [0, 1, −o_y], [−o_x, −o_y, o_x² + o_y² − r²]]. (Eq. 2)
- Pole of center: C o = (0, 0, −r²)^T = −r² l_inf — the polar of the circle's center is the line at infinity of the plane; pole-polar relations are preserved under projective transformations, so the imaged center's polar is the imaged vanishing line. (Eq. 3)
- l_vanishing = E c. (Eq. 4)
- Case 1: v = l_1 × l_vanishing (Eq. 5); l_2 = v × c (Eq. 6); l_3 = E v (Eq. 7).
- Case 2: l_1 = x × c (Eq. 8); v = E l_1 (Eq. 9); l_2 = v × c (Eq. 10).
- Case 3: c is an eigenvector of E_2^{−1} E_1; l_vanishing = E_1 c = λ E_2 c.
- MRE = (1/N) Σ_i ‖H x_i − Ĥ x_i‖_2 over visible 3D field points.
- Stated assumptions: sports field markings have constant thickness (~10 cm, modeled as concentric circles); detectors can segment circular markings and detect the circle center (Case 1/2); ellipse-center ≠ imaged-circle-center (the great-axis approximation used by Roboflow/FootyVision is flagged as wrong — Fig. 3); planar playfield (homography model); camera-position priors resolve orientation ambiguity.

## 5. Features / target
Input: detected ellipse + (detected) imaged circle center + one line or point correspondence from existing detectors (TVCalib segmentation, PnLCalib keypoints). Target: 8 point correspondences (+8 tangent lines) fed into DLT homography estimation or a PnP solver for full camera parameters.

## 6. Validation design
- §4.1: learned-keypoint failure test — PnLCalib's 8 circle keypoints on SoccerNet (8,565 images, bounded error) vs 300-image OOD set (unbounded errors); error measured as pixel distance of center from line through opposed point pairs.
- §4.3 quantitative: on SoccerNet central views, PnLCalib vs PnLCalib* (geometric keypoints substituted); metrics JaC_5 (Jaccard at 5 px), MRE (px), CR (completeness rate).
- §4.4 synthetic: 100 random cameras, noise σ 0–25 px on ellipse points and separately on the center, MRE vs ground-truth homography.
- §4.4 real: TVCalib segmentation + Canny + ray-casting + RANSAC to detect inner/outer ellipses; qualitative center recovery (Fig. 10 — judged "too noisy to be used").

## 7. Numerical results / baselines
- Table 1 (SoccerNet central views, full-HD): TVCalib — JaC_5 10.2%, MRE 28.8 px, CR 100%; PnLCalib — JaC_5 22.4%, MRE 12.8 px, CR 79.5%; PnLCalib* (geometric keypoints) — JaC_5 22.4%, MRE 12.9 px, CR 79.5%. Paper's claim: "as expected, no significant change" in-domain — the geometric method neither helps nor hurts where learned detectors work.
- §4.1 OOD: the learned detector shows a "significant number of unbounded errors" on the 300 OOD images vs bounded distribution on SoccerNet (Fig. 5); by construction the geometric method yields center-collinear point pairs.
- Synthetic (Fig. 8): MRE "linearly follows" ellipse-point noise (σ up to 25 px); reprojection error "rises rapidly" with center-position noise → precise center estimation is the binding constraint.
- Real concentric-ellipse detection (Fig. 10): retrieved centers "too noisy to be used in real-world scenarios" — the paper concedes Case 3 (unknown center) fails on real data; views with only a partial ellipse arc remain unsolved.
- My read: this is a geometry paper with honest negative results — the valuable contribution is Case 1/2 for annotation + OOD calibration, not Case 3.

## 8. Code / data availability
None stated (no repository, no dataset links in the text). References to PnLCalib, TVCalib, SoccerNet are public external artifacts.

## 9. Leakage & limitations
- In-domain quantitative test is circular: it replaces learned keypoints that were *validated correct* on SoccerNet, so a null result was baked in — the method's real claim (OOD) is evaluated only qualitatively.
- Case 3 (unknown center), the hardest and most advertised case, fails on real data by the authors' own admission (Fig. 10); partial-arc-only views "require further investigation."
- Assumes circular markings exist in-frame — NFL has no circle at midfield (shield logo is not a circle; 50-yard numerals are not circles); the pole-polar machinery would need re-derivation for the 50-yard line + hash marks geometry.
- Detector dependence: the method inherits the generalization limits of the ellipse/line detectors it front-loads; poor ellipse fitting is cited as the failure cause in Fig. 6.
- No runtime numbers; the real-world concentric pipeline (segmentation → Canny → ray casting → RANSAC → eigen-analysis) is multi-stage and brittle.
- External validity to NFL: high in concept (broadcast calibration is a GSE content need) but the specific construction is soccer-circle geometry; NFL calibration needs hash marks, yard lines, and goal lines — lines, not circles.

## 10. GSE overlap
New capability — no duplicate. The research map has no camera-calibration / field-registration lane (no SoccerNet, no homography, no broadcast-calibration work anywhere in the corpus). This would be GSE's first broadcast-video geometry paper. It connects to a latent content need: any future GSE video lane (All-22 overlays, telestrated graphics per the 2026-09-10 dial) needs frame-to-field registration, but today that lane doesn't exist — so this is a banked idea, not overlap.

## 11. GSE implementation spec
Bank the Case 1/2 construction as the calibration primitive for a future video-graphics lane: (1) fit ellipse/circle geometry to the NFL 50-yard-line shield or goal-line pylon geometry is not applicable — instead derive NFL analogues: parallel yard lines give vanishing points directly (v = l_1 × l_2 for parallel lines), hash marks give repeated known spacing; (2) implement the pole-polar derivation only if a circular marking is usable (e.g., the on-field painted conference logos in end zones have circular elements); (3) feed correspondences into OpenCV's findHomography / solvePnP; (4) target: register broadcast frames to the field template for overlaying engine-derived win-probability or EPA visualizations. Estimated effort: 2–4 weeks prototype on NFL broadcast stills with manual ellipse/line annotation, mostly re-deriving the geometry for yard-line primitives.

## 12. Reproducible test
On 50 NFL broadcast stills showing the 50-yard line + hash marks with known camera-visible field geometry: manually annotate line correspondences, compute homography with and without the paper's pole-polar-derived correspondences from the nearest usable circular marking (e.g., painted logos); metric: reprojection error (MRE, Eq. in §4) of yard-line template points into the frame. Baseline: homography from manually annotated line correspondences alone.

## 13. Acceptance / rejection gate
ADOPT the pole-polar correspondence trick only if, on the 50-still NFL set, the derived correspondences reduce MRE by ≥20% vs the line-only baseline, or enable calibration on ≥10 stills where the line-only baseline has <4 correspondences (the "central view" failure mode); otherwise REJECT for NFL and keep it as soccer-only geometry.

## 14. Improvement experiment
NFL has no center circle, so re-derive the correspondence extractor for the *parallel yard-line* primitive: two parallel lines fix a vanishing point; combined with hash-mark ticks at known 1-yard spacing along a known world line, construct the pole-polar analog (conjugate point pairs on the yard-line pencil) to generate virtual correspondences without any circle. Test whether this yard-line-only construction matches the circle-based MRE on the synthetic-camera protocol (100 random cameras, 0–25 px noise).
