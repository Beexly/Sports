# [0375] Towards long-term player tracking with graph hierarchies and domain-specific features (arXiv:2502.21242v1)

**Citation:** Maria Koshkina, James H. Elder (2025). *Towards long-term player tracking with graph hierarchies and domain-specific features*. arXiv:2502.21242v1. URL: https://arxiv.org/abs/2502.21242
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1313 lines).
**Verdict:** ADAPT — the jersey-number + team-ID + field-coordinate edge features are the right ingredients for any future NFL video-tracking lane (jersey numbers are uniquely identifying in football), but port only the feature set, not the SUSHI hierarchy — GSE has no video tracking data today.

## 1. Research question
Can long-term player tracking — reconnecting tracklets after extended occlusions or absences from view — be improved by extending the hierarchical graph tracker SUSHI with sports-domain features (jersey numbers, team IDs, field coordinates from registration), evaluated on SoccerNet and a new stationary-camera hockey dataset?

## 2. Dataset / schema
- **Hockey (new, 20 clips from 9 games):** stationary camera, 5930×1080 @ 30 fps, whole rink in view; 14 train / 6 test clips (same game kept in one partition); average clip 1,311 frames (longest 1,530); standard MOT annotations PLUS estimated bboxes for occluded players; jersey numbers (when visible) and team IDs annotated. Available at https://github.com/mkoshkina/sports-SUSHI (dataset + code, stated in abstract).
- **SoccerNet tracking:** 57 train / 49 test clips, avg 750 frames @ 25 fps, 1920×1080 broadcast soccer.
- Protective gear in hockey hides appearance features; jersey numbers often motion-blurred — the hard case motivating the domain features.

## 3. Method / model
**SportsSUSHI** = SUSHI (Cetintas et al. 2023) + sports features. SUSHI: offline tracking-by-detection; hierarchy of graphs where level-0 nodes are detections, edges = potential associations; GNN (neural message passing) does binary edge classification; solved edges → tracklets become next level's nodes; same GNN weights shared across levels, level-specific MLP edge encoders; linear program converts edge predictions to trajectories; K=10 edge pruning; sliding window + stitching for long videos. Training: level-by-level (500 iters each before unfreezing next), then joint 250 epochs, Adam.
Feature extraction (the paper's contribution):
- **Jersey numbers:** Koshkina et al. pipeline — legibility classifier, pose-based torso crop, PARSeq scene-text-recognition; confidence vector per digit position → 100-dim number encoding (c(d_i d_j) = c_1(d_i)·c_2(d_j)); EOL in first position = illegible.
- **Team ID:** one-hot {A, B, referee}; referee classifier + contrastively trained player embedding; per-clip clustering of first N player images to learn team appearances.
- **Field coordinates:** frame→field homography from Gutiérrez-Pérez & Agudo 2021 (CNN keypoint/line detector + RANSAC); detection bbox midpoint projected to meters; linear interpolation over failed frames.
- **Re-ID:** FastReID ResNet50-IBN, fine-tuned per dataset.
- **Edge features:** cosine similarity for re-ID/jersey/team; |distance in meters| for field coords; tracklet nodes use mean appearance and last→first position gap.

## 4. Equations & assumptions
No novel equations (builds on SUSHI/MPNTrack machinery). Key formulas stated:
- Jersey confidence: c(d_i d_j) = c_1(d_i)·c_2(d_j); c(d_i) = c_1(d_i)·c_2(EOL).
- Edge features: cosine similarity (re-ID, jersey, team ID), absolute meter-distance (field coordinates).
- Stated assumptions: offline processing acceptable (not real-time); K=10 nearest-neighbor edge pruning doesn't cut true associations; level-sharing of GNN weights is valid across temporal scales; per-clip team clustering generalizes within the clip; field registration failures are interpolable; bbox midpoint ≈ player field position.

## 5. Features / target
Input: detected player bboxes per frame. Target: long-term identity tracks (reconnected tracklets). Hierarchy depth maps to temporal span: 7 layers → 256 frames, 9 → 512, 10 → 1024.

## 6. Validation design
- SoccerNet test partition: ablation (Table 2) of feature sets and hierarchy depth, GT detections; SOTA comparison (Table 4) with GT detections and YOLOX detections. Metrics: HOTA, AssA (association), DetA.
- Hockey test partition: vs Tracktor++, CenterTrack, FairMOT, ByteTrack (all fine-tuned on hockey; YOLOX detections).
- Re-ID decay analysis (Table 3): identity-match accuracy at frame gaps 1/50/100/300 for Market1501-pretrained vs fine-tuned FastReID, soccer vs hockey.

## 7. Numerical results / baselines
- Re-ID decay (Table 3, fine-tuned model): soccer 99.1 (1 frame) → 79.1 (50) → 72.2 (100) → 62.2 (300); hockey 99.63 → 38.2 → 26.8 → 26.6. Paper's claim: appearance alone collapses over long gaps, especially in hockey — the motivation for jersey numbers.
- SoccerNet ablation, GT detections (Table 2, HOTA/AssA/DetA): SUSHI baseline 85.79/75.55/97.42; +field position 89.22/84.25/94.82; +jersey (9 layers) 89.78/85.35/94.80; +jersey (10 layers) 90.92/87.51/94.80. So field coords add +3.4 HOTA/+8.7 AssA; jersey numbers add +1.7 HOTA/+3.3 AssA (paper: "significant improvement" from field coords, "further boost" from jerseys).
- SoccerNet vs SOTA (Table 4): GT detections — SportsSUSHI 90.92/87.51/94.80 vs Maglo et al. 96.57/93.60/99.65, Mansourian 90.77/82.53/99.83 (competitive, not SOTA); YOLOX detections — SportsSUSHI 71.36/69.99/72.87 vs Maglo 73.29/73.42/73.26, ByteTrack 60.56/52.45/70.10. (Note: Maglo requires per-game retraining at inference; SportsSUSHI does not — the paper's real advantage.)
- Hockey (Table 5): SportsSUSHI 71.24/72.82/70.47 vs ByteTrack 67.51/64.63/71.36, FairMOT 61.56, CenterTrack 59.70, Tracktor++ 44.33 — best on HOTA/AssA.
- Failure cases (§5.5): jersey numbers often invisible/blurry; referees (identical uniforms) not re-identifiable; most errors = failed re-identification after long absence.

## 8. Code / data availability
Stated: dataset and code at https://github.com/mkoshkina/sports-SUSHI. Uses external code/weights from Koshkina et al. (jersey/team), Gutiérrez-Pérez & Agudo (registration), FastReID, YOLOX.

## 9. Leakage & limitations
- Team-ID clustering is per-clip ("first N player images" of the test clip) — uses test-clip statistics at inference; mild transductive leakage, though realistic for broadcast.
- Field-registration interpolation over failed frames smooths over exactly the hard cases (zoomed/blurred views).
- Hockey annotations include *estimated* bboxes for occluded players — annotator-inferred ground truth inflates trackability.
- Not SOTA on SoccerNet (Maglo +5.6 HOTA with GT dets) — the "no per-game retraining" advantage is real but unquantified in compute terms.
- 10-layer hierarchy reaches 1024 frames vs 750-frame SoccerNet clips — the depth that "wins" slightly exceeds the data's needs.
- Failure modes (§5.5) are honest: jersey-number illegibility and referee uniformity are unfixable within this feature set.
- External validity to NFL: moderate. NFL jersey numbers are large, high-contrast, and uniquely identifying (better than hockey); but broadcast cameras zoom/pan constantly (field registration mandatory, and it fails exactly on zoomed views per paper 0371); 22 players + officials + sidelines is a harder association problem than hockey/soccer.

## 10. GSE overlap
New capability — no video-tracking lane exists in the research map. Closest relatives: the NGS taxonomy (map §1) is tracking *data* not video tracking; paper 0374 (TrackID3x3, same wave) shares the ReID/jersey-number ideas; paper 0371 (this wave) covers field registration, which SportsSUSHI depends on for broadcast footage. The jersey-number-as-identity insight maps directly onto NFL (numbers are the primary disambiguator). Cite alongside 0371/0374 as a trio if a video lane ever starts.

## 11. GSE implementation spec
Do not build now. If a video-tracking lane starts (All-22 or broadcast): (1) replicate the feature extractor only — jersey-number OCR (PARSeq or newer STR), team-ID clustering, frame→field homography (needs NFL yard-line geometry, cf. 0371); (2) use ByteTrack/BoT-SORT for short tracks, then a SUSHI-style or simpler Hungarian reconnection using jersey-number cosine + team-ID + field-distance edge features; (3) skip the full GNN hierarchy initially — the paper's own ablation shows most gains come from the features (field coords +3.4 HOTA, jersey +1.7) not the architecture. Estimated effort: 4–8 weeks for the feature set + simple reconnection on NFL film; the full SportsSUSHI port is not justified without video data.

## 12. Reproducible test
Clone https://github.com/mkoshkina/sports-SUSHI; run on the released hockey test clips; verify HOTA within ±2 pp of 71.24 and AssA within ±2 pp of 72.82. If the repo is unavailable, replicate Table 3's Re-ID decay experiment on SoccerNet with FastReID (soccer fine-tuned): expect ~62% at 300-frame gaps vs ~26% hockey — the paper's core motivation, checkable without their code.

## 13. Acceptance / rejection gate
ADOPT the jersey-number + team-ID + field-coordinate feature set for any GSE video-tracking prototype only if a pilot on 10 NFL broadcast plays shows jersey-number OCR legibility ≥60% of player-frames and the combined edge features reduce ID switches vs ByteTrack alone by ≥25%; otherwise REJECT the port — NFL broadcast zoom/pan may make the registration leg (cf. 0371's failures) the binding constraint.

## 14. Improvement experiment
The paper leaves motion modeling as future work. Add it cheaply: a constant-velocity Kalman predictor on field coordinates, used to gate edge creation (only connect tracklets whose predicted positions overlap within a radius) and as an additional edge feature. Test on the hockey set whether this cuts the long-absence association failures (§5.5) — motion is the one cue that survives jersey illegibility, and NFL players' field positions are the most reliable signal available.
