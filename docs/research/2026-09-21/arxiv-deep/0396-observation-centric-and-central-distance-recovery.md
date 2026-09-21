# [0396] Observation Centric and Central Distance Recovery on Sports Player Tracking (arXiv:2209.13154v1)

**Citation:** Hsiang-Wei Huang, Cheng-Yen Yang, Jenq-Neng Hwang, Pyong-Kun Kim, Kwangju Kim, Kyoungoh Lee (University of Washington / ETRI Korea, 2022). *Observation Centric and Central Distance Recovery on Sports Player Tracking*. arXiv:2209.13154v1 (ECCV 2022 DeeperAction Challenge — SportsMOT workshop). URL: https://arxiv.org/abs/2209.13154v1
**Ledger completed:** 2026-09-21. **Read:** full text (17,695 characters / 108 long lines; complete paper including references).
**Verdict:** ADAPT — a motion-first multi-object tracking pipeline (OC-SORT + central-distance recovery + sport-specific ReID post-processing) that reached 3rd place on the SportsMOT 2022 leaderboard at HOTA 73.968. It is a practical template for extracting player trajectories from broadcast video without field registration — complementing 0389 (ice-hockey homography tracking), which covers *field-registered* tracking from monocular video — and its football-category post-processing (time-gap-scaled location gating + greedy multi-round appearance association) adapts to American-football broadcast tracking. Same hard legal constraint as ledger 0389: no NFL broadcast-footage use without legal review.

## 1. Research question
How to track multiple athletes with similar appearance (same-color jerseys) and non-linear movement (sprints, jumps, direction changes) in broadcast sports video, where Kalman-filter linear-motion assumptions fail and ReID is unreliable? The authors propose an observation-centric motion tracker plus a "central distance recovery" stage and three sport-specific post-processing pipelines (basketball, football/soccer, volleyball). (§1, §3)

## 2. Dataset / schema
SportsMOT (ECCV 2022 DeeperAction Challenge): training set of 45 video clips across basketball, football (soccer), volleyball, collected from Olympic Games, NCAA Championship, and NBA games on YouTube; 720p, 25 FPS, official recordings only; manually cut to average 485 frames with no shot change. Detector and ReID trained on the training set; evaluation on the challenge test set, ranked by HOTA. Note: all source footage is third-party broadcast video (YouTube) — provenance/licensing for reuse is unstated.

## 3. Method / model
- **Observation-centric tracking (§3.1):** OC-SORT as the base tracker. Observation-Centric Online Smoothing rebuilds a virtual trajectory when a lost target is re-associated (prevents Kalman error accumulation under non-linear motion); Observation-Centric Momentum handles sudden direction changes; Observation-Centric Recovery associates an unassociated track's last observation with new detections to suppress spurious new tracklets.
- **Central distance recovery (§3.2):** when IoU-based recovery fails (fast players' boxes don't overlap), re-run recovery using Euclidean distance between detection centers and unassociated tracklets' last observations. Thresholds: basketball 200, football 80, volleyball 80 (chosen on test-set performance).
- **Tracklet-association post-processing (§3.3), sport-specific:**
  - *Basketball:* cap identities at 10 (court player count); first 10 tracklets seeded as main players; appearance features updated by exponential moving average; exiting players enter a candidate queue; re-entering players matched by max cosine similarity.
  - *Football (soccer):* no identity-count cap (low in-camera ratio); three greedy association rounds gated first by disappear/reappear location distance scaled to the time gap (<100 frames → 100; 100–500 → 250; >500 → 400), then by appearance cosine distance thresholds 0.1 / 0.2 / 0.4 across rounds; tracklet embeddings averaged over frames.
  - *Volleyball:* cap 12; distance-only reassociation (threshold 400), no appearance (players stay in view).
  - Final step: linear interpolation over gaps.
- **Implementation (§4.2):** YOLOX-X detector (COCO-pretrained, fine-tuned 80 epochs on SportsMOT train, ~8 h on 4×Tesla V100, ByteTrack training recipe); OC-SORT config: detection confidence 0.1, IoU threshold 0.3, track threshold 0.7, max tracklet age 30 frames; OSNet ReID backbone trained 10 epochs, Adam lr 0.0003.

## 4. Equations & assumptions
No explicit equations in the text (methods described procedurally; OC-SORT, Hungarian assignment, SAGE-style components referenced to [3][4]). Quoted decision rules: basketball candidate matching by argmax cosine similarity of EMA appearance embeddings; football gating d(location_disappear, location_reappear) < {100, 250, 400} by time-gap bin, then cosine distance < {0.1, 0.2, 0.4} per round; volleyball nearest-candidate reassociation if distance < 400. Final trajectories completed by linear interpolation.
Stated assumptions: fixed player counts usable as hard constraints (basketball/volleyball); appearance similarity is meaningful within a team despite similar kits; camera is static within a clip (no shot changes); interpolation is an adequate gap model.

## 5. Features / target
Features: YOLOX-X bounding-box detections (+ OSNet appearance embeddings for ReID stages); no field registration, no pose, no jersey numbers. Target: consistent player identities (tracklets) across each video clip, scored by HOTA/AssA/DetA/MOTA/IDF1/IDS/Frag.

## 6. Validation design
Single benchmark: SportsMOT 2022 challenge test set, leaderboard-ranked by HOTA (which balances detection and association accuracy, unlike MOTA). Ablation over pipeline stages: vanilla OC-SORT → +central distance recovery → +ReID post-processing. No cross-dataset evaluation, no train/test ablations beyond the staged pipeline, no statistical testing. Thresholds (central-distance 200/80/80; football gap bins) were "based on the evaluation performance on the Sportsmot testing set" — i.e., tuned on the test set, so the reported numbers are optimistic.

## 7. Numerical results / baselines
- HOTA: OC-SORT baseline 67.107 → +central distance recovery 71.764 → +ReID post-processing **73.968** (3rd place, 2022 SportsMOT workshop final leaderboard).
- Final operating point: HOTA 73.968, AssA 63.460, DetA 86.316, MOTA 94.832, IDF1 78.271, IDS 2754, Frag 3592.
- (Distinguishing claims from interpretation: the paper attributes the +4.66 HOTA gain to central-distance recovery and +2.20 to post-processing; these are staged ablations on the test set the thresholds were tuned against, so treat the decomposition as indicative, not rigorous.)

## 8. Code / data availability
None stated. No code link, no data link in the text. SportsMOT dataset is a public challenge dataset (DeeperAction/ECCV 2022); YOLOX, OC-SORT, OSNet, ByteTrack training recipes are all open-source and reimplementable. Test-set-tuned thresholds are reported in-text (§4.2), which aids reproduction.

## 9. Leakage & limitations
- **Thresholds tuned on the test set** (§4.2: "based on the evaluation performance on the Sportsmot testing set") — reported HOTA is optimistic; expect a drop on unseen footage.
- "Football" here is **soccer**; the football pipeline's assumptions (large field, low in-camera ratio, no identity cap) need re-derivation for American football (smaller visible player count, frequent shot changes, yard-line graphics occlusions).
- No shot-change handling — broadcast NFL footage cuts constantly; the pipeline as written breaks at every cut.
- Linear interpolation as the gap model ignores player dynamics during occlusions.
- Appearance ReID across same-kit players is inherently weak; the paper leans on it most where it is least reliable (basketball re-entry).
- Data provenance: training/eval on YouTube broadcast rips; licensing for derivative use unstated.
- Adversarial note: HOTA 73.968 with DetA 86.3 vs AssA 63.5 shows association — the hard part for GSE's use — is well behind detection; identity switches (IDS 2754) remain frequent.

## 10. GSE overlap
Complements rather than duplicates. The map covers tracking/NGS taxonomy and paper 0389 (ice-hockey homography tracking) covers *field-registered* tracking from monocular video; this paper is the *image-plane* MOT counterpart — no homography, no camera calibration — which is the right starting point when field registration is unavailable or unreliable. It also complements 0394 (LED trajectory prediction: forecast future positions) and 0395 (Agent Imputer: impute from events) — this one *measures* positions from video. Together the four papers form a coherent video→tracking→imputation→forecast stack. Not a duplicate of anything in the absorbed corpus.

## 11. GSE implementation spec
1. **Reproduce on SportsMOT** with open components (YOLOX-X + OC-SORT + OSNet) to establish a clean baseline with *validation*-tuned thresholds (fixing the paper's test-tuning).
2. **Adapt the football post-processing to American football:** re-derive time-gap/location-gating bins for NFL broadcast (25–30 fps, frequent cuts); add shot-change detection as a hard tracklet-termination signal; consider jersey-number OCR as an appearance complement (the paper's appearance-only ReID is the weakest link for same-kit sports).
3. **Add field registration** (per 0389's homography approach) so image-plane tracklets map to field coordinates — required for any downstream GSE use.
4. **Legal review before any NFL footage use** — same constraint as 0389; test on public-domain/college footage first.
Estimated effort: 2–3 weeks for the SportsMOT reproduction; the NFL-broadcast adaptation (shot handling, number OCR, registration) is a separate multi-week project.

## 12. Reproducible test
Reimplement the pipeline from open components on the public SportsMOT set and require: (a) staged HOTA gains in the same order (OC-SORT < +central-distance < +post-processing) on a held-out validation split with thresholds tuned only on validation; (b) final HOTA within ~3 points of 73.968 on the challenge test set. Then the GSE acceptance test: run on 10+ clips of non-NFL football broadcast footage with shot changes, and require IDF1 ≥ 70 with per-clip identity-switch counts documented — if shot changes collapse association, the broadcast adaptation (§11.2) is mandatory before any GSE use.

## 13. Acceptance / rejection gate
ACCEPT as ADAPT conditional on the §12 reproduction with validation-tuned thresholds. Standing gates: (1) no NFL broadcast footage processed until legal review clears it (same as 0389); (2) do not present image-plane tracklets as field-coordinate tracking until the registration stage (§11.3) is built and validated. If reproduction cannot reach HOTA ~70 on SportsMOT with honest tuning, demote to REJECT (competition overfit).

## 14. Improvement experiment
The paper's weakest point — appearance ReID under same-kit conditions — is exactly where GSE can improve: fuse jersey-number OCR (digit recognition on back-of-jersey crops) with the OSNet embedding in the association cost, and add a team-classification head to restrict the candidate queue to same-team tracklets. Test on the basketball split (highest re-entry rate): success = reducing IDS at fixed HOTA, or equivalently matching the paper's HOTA with the appearance weight ablated. A second experiment: replace linear interpolation with a learned kinematic inpainting (constant-acceleration or LED-style diffusion infill, cf. 0394) and measure Frag/IDS change.
