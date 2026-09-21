# [0212] BRIDGE: Borderless Reconfiguration for Inclusive and Diverse Gameplay Experience via Embodiment Transformation (arXiv:2602.23288v1)

**Citation:** Hayato Saiki, Chunggi Lee, Hikari Takahashi, Tica Lin, Hidetada Kishi, Kaori Tachibana, Yasuhiro Suzuki, Hanspeter Pfister, Kenji Suzuki (2026). *BRIDGE: Borderless Reconfiguration for Inclusive and Diverse Gameplay Experience via Embodiment Transformation*. Proceedings of CHI '26, April 13–17, 2026, Barcelona. arXiv:2602.23288v1. URL: https://arxiv.org/abs/2602.23288
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2884 lines incl. references).
**Verdict:** REJECT — a CHI accessibility/HCI paper on wheelchair-basketball video conversion; it contains no predictive model, dataset, or method GSE can adopt for NFL prediction, calibration, or betting.

## 1. Research question
Can stand-up basketball broadcast footage be reconstructed as 3D wheelchair-basketball simulations — with embodiment-aware orientation mapping (head/trunk/wheelchair-base) — to support tactical learning for parasport athletes who lack video resources? The paper asks whether such cross-embodiment transformation improves perceived naturalness, functional-classification inference, tactical understanding, self-efficacy, and learning motivation among wheelchair basketball players.

## 2. Dataset / schema
No research dataset is produced; the system ingests NBA broadcast video clips from YouTube (10 clips of single tactical plays selected with expert coaches; 8 used: M = 7.85 s, SD = 1.66; 4 simple + 4 complex tactics — flare screens, pick-and-rolls, elevator screens). Evaluation: a formative study (8 national wheelchair-basketball players + 2 coaches, 45-min online interviews, grounded-theory coding, Cohen's κ = 0.89) and two user studies with 20 participants (10 Japanese national-team players: age 31.6 ± 4.01, 12.9 ± 6.08 yrs experience, classification 3.0 ± 1.2; 10 non-elite university/community-club players: age 20.8 ± 2.25, 1.5 ± 0.88 yrs experience; 8 of the 10 non-elite were non-disabled players who regularly train/compete in wheelchair basketball). Videos were generated in Unity and re-recorded. Note: images in the paper include NBA broadcast stills and a Getty Images player photo used for illustration.

## 3. Method / model
Four-stage reconstruction pipeline + embodiment-aware orientation mapping, rendered in Unity:
1. **Player and ball detection/tracking:** MixSort (tracking-by-detection: Kalman + IoU + transformer-like appearance module) for players; YOLOv10 detection + SAM2 multi-frame association for the ball (MixSort deemed unsuitable for the small, fast, occluded ball).
2. **Court keypoint detection, homography, position mapping:** YOLO-based court landmark detection (sidelines, baselines, free-throw lines, three-point arcs) → homography to a canonical court template → project player/ball boxes into normalized court coordinates.
3. **Ball possession and action state detection:** possession when >70% of the ball's bbox overlaps an offensive player's bbox for ≥5 consecutive frames; possession transfer = "pass" (transit interval recorded); ball separated from all players at sequence end = "shot"; actions classified as pass/dribble/shot with assigned animations. Infeasible stand-up actions (jumping, stepping) approximated as feasible wheelchair actions; shot/pass variants abstracted to representative wheelchair actions preserving tactical meaning.
4. **Trajectory smoothing:** Kalman-filter smoothing of residual jitter/occlusion errors.
**Orientation mapping (§4.4):** SMPL mesh via mL-CoMotion framework (reported >70% MOTA on PoseTrack21, ~60mm MPJPE on 3DPW). Hierarchical three-layer model: wheelchair base θ_base = f_motion(traj) aligned with instantaneous displacement (x_t − x_{t−1}, y_t − y_{t−1}); trunk constrained around base with classification-dependent range Δ^max_trunk(p); head constrained relative to trunk with Δ^max_head(p). Classification parameterization: low-point players' max trunk rotation ~10° (from ~20–45° literature range, pragmatically reduced for gameplay stability), high-point ~45°; max head rotation ~80° for high-point (healthy-individual literature), 45° for low-point (formative-study based). α(p), β(p) modulate how closely trunk/head follow raw input. Animations (pushing, passing, shooting) generated from motion-capture data of Japanese national-team members.

## 4. Equations & assumptions
- Hierarchical orientation mapping: θ_base = f_motion(traj); θ_trunk = θ_base + clip(α(p)·(θ_trunk^raw − θ_base), −Δ^max_trunk(p), Δ^max_trunk(p)); θ_head = θ_trunk + clip(β(p)·(θ_head^raw − θ_trunk), −Δ^max_head(p), Δ^max_head(p)).
- θ_base aligned with instantaneous displacement vector (x_t − x_{t−1}, y_t − y_{t−1}).
- No predictive-model equations; the paper is an HCI/systems paper, not a modeling paper.
- **Assumptions:** trunk mobility (with seated height and head mobility) is the primary functional-classification indicator (per formative study + IWBF 1.0–4.5 system, on-court total ≤ 14); reconstructed tactical action in wheelchair form preserves the tactical meaning of stand-up plays; non-disabled regular wheelchair-basketball players are acceptable proxies for disabled athletes in the evaluation (explicitly flagged as a limitation).

## 5. Features / target
Not applicable as a predictive-model paper. The pipeline's intermediate representations: player/ball bounding boxes and IDs (MixSort), court-homography parameters, possession flags, action labels (pass/dribble/shot), smoothed trajectories, SMPL mesh orientations (θ_trunk^raw, θ_head^raw). Evaluation targets: perceived naturalness (7-point Likert + forced choice), classification-point estimation accuracy, tactical-recall accuracy (card-arranging task vs. coach model answers), self-efficacy (Bandura-based 7-point scales), five subjective measures (imagery vividness, ease of imagery, usefulness for tactical learning, usefulness for exploring new tactics, intention to use).

## 6. Validation design
Two within-subject user studies (n=20 each): Study 1 — mapped vs. baseline (direction-only) conditions side by side, randomized order; naturalness forced-choice + 7-point Likert; classification estimation of 5 offensive players into low/mid/high pointers with cue-influence ratings. Study 2 — S condition (stand-up footage) vs. W condition (reconstructed), within-subject, randomized; tactical-recall task (arranging "screen/pass/cut/shoot" cards vs. coach's model answer), replay counts and thinking time recorded; self-efficacy and 5 subjective 7-point scales. Analyses: three-way ANOVA / ART-ANOVA with effect sizes (partial η²) and post-hoc power. Processing-time benchmark: 5 play videos (7.6 ± 1.5 s, 228 ± 44.9 frames) on an i7-13700K / RTX 4090 / 32GB RAM workstation. No baselines beyond the paper's own ablation (mapped vs. unmapped).

## 7. Numerical results / baselines
Study 1 (quoted exactly):
- Naturalness forced choice: mapped = 66, baseline = 3, no difference = 11. Mean Likert: mapped M ≈ 5, baseline M ≈ 3; three-way ANOVA p < .001, partial η² = 0.776, power 1−β = 1.00.
- Classification accuracy: simple plays M = .80 (95% CI [.71, .89]); complex M = .74 (95% CI [.65, .83]); no significant group/complexity effects (partial η² = .03, power .18 — acknowledged low power).
- Cue influence: trunk mobility M = 5.60 (simple) / 5.63 (complex); body dimensions 5.37/5.30; head 4.30/4.17; clue main effect p = .004, partial η² = .26. Trunk selected "most influential" in 62% (simple) and 70.0% (complex) of cases; χ² p = .0015.
Study 2 (quoted exactly):
- Tactical-recall accuracy: complex — S M = .80, W M = .90; simple — S M = 1.00, W M = .70; ART-ANOVA no significant effects (p > .05, partial η² = .06, power .62).
- Thinking time: complex 36.0 s (S) / 36.8 s (W); simple 29.7 s (S) / 28.0 s (W); complexity main effect p = .031, partial η² = .08. Replays: non-elite 3.0 vs. national 2.7 (p = .031, partial η² = .21).
- Self-efficacy: condition main effect p = .00037, partial η² = .28; complexity×condition p = .0083, η² = .17; group×complexity×condition p = .0317, η² = .11. Non-elite: simple W 5.57 vs. S 4.71; complex W 5.00 vs. S 4.00. National: simple W 5.38 vs. S 5.62 (no difference); complex W 6.38 vs. S 4.12 (p < .05, η² = .11).
- Subjective scales (all W > S): imagery vividness p = .007, η² = .17; ease of imagery p < .001, η² = .37; tactical learning p = .013, η² = .15; new-tactic exploration p = .002, η² = .22; intention to use p < .001, η² = .32.
Pipeline performance: total 85.4 ± 22.8 s per video; player tracking 11.5 ± 0.5 fps; 3D pose 13.2 ± 0.8 fps; ball tracking 3.6 ± 0.5 fps; tactical view conversion 669 ± 102 fps. Cited component benchmarks: MixSort SportsMOT 65.7 HOTA / 74.1 IDF1 (basketball 60.8 HOTA / 67.8 IDF1); mL-CoMotion >70% MOTA on PoseTrack21, ~60mm MPJPE on 3DPW (original evaluations, not rerun here).

## 8. Code / data availability
None stated — no repository, no dataset release, no weights. System built in Unity 6000.0.23f1 with motion-capture data from Japanese national-team members (not public).

## 9. Leakage & limitations
- Wrong domain for GSE: an HCI accessibility study for wheelchair basketball; no transfer path to NFL prediction, calibration, or betting models.
- Small samples throughout (formative n=10; user studies n=20) and acknowledged low power for several nonsignificant effects; 8 of 10 "non-elite" participants were non-disabled, so results "should not be interpreted as directly representing the learning experiences... of wheelchair basketball players with disabilities alone" (paper's own caveat).
- No predictive model to evaluate; classification parameters (α(p), β(p), Δ^max values) are pragmatically set, not fitted.
- NBA broadcast stills used in the paper's figures — the pipeline itself operates on footage GSE would never have rights to ingest at scale (and GSE's video doctrine already requires licensed/transformative real footage).
- The one technically interesting subsystem (broadcast-video → tracking → homography → action classification) is standard CV practice (MixSort/YOLO/SAM2/Kalman) with no novel contribution GSE could adopt beyond library choices it already knows.

## 10. GSE overlap
None substantive. The existing-research map covers tracking-data methods (STRAIN 2305.10262, NGS taxonomy, SportMamba multi-object tracking) and video pipelines at a higher level; this paper adds no new tracking methodology (it assembles off-the-shelf components) and no predictive model. GSE's video operation uses real game footage telestrated, not 3D avatar reconstruction — there is no plausible NFL content or engine use for embodiment mapping. **No overlap, no transfer path.**

## 11. GSE implementation spec
None warranted. There is no component of BRIDGE that maps to GSE's engine, calibration, market, or content lanes. If GSE ever builds automated broadcast-football play segmentation, the cited off-the-shelf stack (MixSort-style tracking + court homography + possession heuristics + Kalman smoothing) is a reasonable starting recipe — but that is a generic CV note, not an adoption of this paper.

## 12. Reproducible test
None — there is no model, dataset, or protocol in this paper that GSE can reproduce or test against its data.

## 13. Acceptance / rejection gate
**Rejected outright:** HCI/accessibility paper for wheelchair basketball with no predictive model, no reusable dataset, and no transfer path to NFL prediction, calibration, or betting. The user-study numbers (naturalness, self-efficacy, classification accuracy) describe parasport learning aids, not research results GSE can adopt. No further work.

## 14. Improvement experiment
None for GSE. (For the paper's own lane, the authors' stated next steps — larger homogeneous participant groups, multimodal feedback, interactive coach tooling — are the natural follow-ups; none concern GSE.)
