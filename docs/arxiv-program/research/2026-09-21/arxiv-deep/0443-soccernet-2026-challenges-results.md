# [0443] SoccerNet 2026 Challenges Results (arXiv:2607.07320v1)

**Citation:** Anthony Cioppa, Silvio Giancola, Håkan Ardö, Mohamad Dalal, Jan Held, et al. (2026). *SoccerNet 2026 Challenges Results*. arXiv:2607.07320v1. URL: https://arxiv.org/abs/2607.07320v1
**Ledger completed:** 2026-09-21. **Read:** full text (§§1–7, references [1]–[117], supplementary material §8 team reports; 2,931 text lines).
**Verdict:** REJECT — a computer-vision challenge-results report on soccer broadcast video (anticipation, action spotting, novel view synthesis, athlete localization, VQA); no transferable method, metric, or dataset for GSE's quantitative NFL pick engine.

## 1. Research question
The paper is the sixth annual SoccerNet challenge-results report: it documents the five 2026 tasks and their evaluation protocols, presents the leaderboards on held-out challenge data, and summarizes the winning submissions to identify the design choices that distinguished them — i.e., a snapshot of the state of the art in soccer video understanding, not a novel method.

## 2. Dataset / schema
- SN-BAA (ball action anticipation): clips from English Football League matches; 7 matches public dev, 2 matches private for final evaluation; 10 ball-action classes; 30s observation → 5s prediction window.
- FOOTPASS (player-centric ball action spotting): 8 action classes (Drive, Pass, Cross, Shot, Header, Throw-in, Tackle, Block), each annotated at a single temporal point; includes replay segments and close-up shots; requires team affiliation + jersey number per action.
- NVS dataset: synthetic Blender scenes from real soccer broadcast footage (~420 rendered images/scene at 4K downsampled, ground-truth camera params in COLMAP format, initial point cloud); training camera poses given but no ground-truth eval images (anti-overfitting design).
- Spiideo SoccerNet Synloc: single static-camera 4K images covering half a pitch + calibration; localize each athlete via pelvis projection onto the ground plane in real-world pitch coordinates.
- VQA: SoccerBench/SoccerWiki + SoccerReplay-1988 + MatchTime + SoccerNet-v2/v3 + Captions + XFoul + game-state reconstruction; 14 categories across text/image/video; 500-question challenge split, 4 options (O1–O4).
- Participation: 427 teams, 1,129 entries across 5 tasks, 28 reviewed technical reports (leaderboards include only teams with reviewed reports — not a complete ordering).

## 3. Method / model
No proposed method of its own. Winning submissions summarized: (BAA) FAANTRA-WS: RegNetY-GSF + FUTR-style transformer with 8 action queries, two-phase warm start (30 epochs ImageNet-pretrained → 30 epochs from phase-one checkpoint), 448p frames, 64-frame clips, class-weighted losses, ℓ1 offset regression, actionness supervision, reduced EOS weight; inference = asymmetric logit ensemble of RegNetY-008 + RegNetY-006 checkpoints, class-wise temporal shifts, 1e-3 confidence threshold with empty-clip rescue. (PCBAS) PAVE: per-player attention + agreement-based voting ensemble over four TAAD–DST variants (temporal transformer over ROI-aligned X3D player features; per-player attention over 26 role slots), weighted event fusion, tackle-specific recall exception. (NVS) DENSER: depth-guided ensemble with staged EFA-GS reconstruction — camera-height-based loss weighting (up to 5× for ground-level views, addressing the 59%-eval vs <2%-train distribution mismatch), scale-and-shift-invariant depth supervision from Depth-Anything-V2, three-model pixel-average ensemble from a shared 90k-iteration checkpoint. (Synloc) Boundary-aware adaptive tiling + RTMPose-X adapted to a two-keypoint (pelvis + ground projection) estimator with geometrically coupled heads, deterministic ray-casting to pitch coordinates. (VQA) task-routed VLM elicitation: Gemini-3.1-Pro reasoning engine routing questions into knowledge grounding / visual prompting / reasoning decomposition / temporal understanding, with structured match metadata, numbered-player-box visual prompts, multi-round prompting, adaptive frame sampling.

## 4. Equations & assumptions
Essentially no mathematical model is proposed. The stated quantitative definitions are evaluation metrics, not model equations: BAA mAP_avg = average of mAP@δ over δ∈{1,2,3,4,5,∞} (finite tolerances = recognition+localization, ∞ = recognition only); PCBAS macro-F1@0.15 (predictions with confidence < τ=0.15 discarded; true positive if within ±12 frames and class+team+jersey all match); NVS ranked by PSNR (SSIM/LPIPS reported); Synloc mAP-LocSim with LocSim = e^{ln 0.05 · d²/τ²}, τ=1m, plus frame accuracy (LocSim<0.5 ⇔ 0.48m, zero FP/FN); VQA accuracy = #Correct/500 × 100% (eq. 1). Assumptions: none beyond standard supervised-evaluation protocol assumptions; rankings conditional on technical-report submission.

## 5. Features / target
Features are soccer broadcast pixels (+ camera calibrations, game-state metadata, commentary text) — nothing applicable to GSE's tabular engine. Targets per task: future action class+timestamp (BAA), action+player+team+jersey+timestamp (PCBAS), novel-view images (NVS), pitch coordinates (Synloc), multiple-choice answers (VQA).

## 6. Validation design
Challenge protocol: public development data + private challenge splits with private annotations; rankings on held-out challenge sets; technical reports required for leaderboard inclusion. No train/val/test design of a proposed method — this is an evaluation of submitted systems.

## 7. Numerical results / baselines
- BAA (Table 1): winner FAANTRA-WS mAP_avg 24.08 (mAP@1=9.02 … mAP@∞=31.78) vs baseline 16.76 (+7.32 pts); runner-up "alter" 21.36; 9 teams, 68 entries.
- PCBAS (Table 2): winner PAVE macro-F1@0.15 58.94 vs TAAD–DST baseline 46.41 (+12.5 pts); Tackle (rarest class) consistently lowest across all submissions; 6 teams, 124 submissions.
- NVS (Table 3): winner DENSER PSNR 29.89 / SSIM 0.791 / LPIPS 0.388 vs 3DGS baseline 26.74 / 0.751 / 0.410 (+3.15 dB) and Triangle Splatting baseline 26.43 (LPIPS 0.359 — best on LPIPS); 65 teams, 95 submissions.
- Synloc (Table 4): winner SELabSoccer mAP-LocSim 97.67, frame accuracy 81.91 vs baseline 77.30 / 33.74 (+20.4 pts); 88 teams, 171 submissions. Supplementary: 3rd place SSS-3 94.70 (+17.4 over baseline); SSS-4 two-stage YOLO26x 94.05% at τ=1m, 98.90% at τ=5m; SSS-5 89.15%; SSS-6 (baseline + fine-tune/TTA/WBF) 66.92 — post-hoc analysis attributes the gap to leading methods to false-positive over-prediction on high-volume cameras, not localization error.
- VQA (Table 5): winner "vitomeme" 98.0% accuracy on 500 questions (their report describes a task-routed Gemini-3.1-Pro system reaching 97.6% on the test split); Sarthi-GameChanger 96.0, fkasNeverwinhh 95.0, random 25.0; 76 submissions, 8 technical reports. Supplementary: VQA-3 (MSUE) 0.95, VQA-4 90.2% (4th), VQA-10 (DREAM) 87%.
- BAA supplementary (beyond Table 1): BAA-3 (FAANTRA-TS, 224p→720p two-stage) 21.14 vs baseline 16.76; BAA-4 (hierarchical GRU + slot queries) 17.91% single-model. NVS supplementary: NVS-2 (GaussianPro initialization, 200K→1.5–2.9M points) 28.94 PSNR (+2.20 dB over the 26.74 baseline); NVS-3 (5×3DGS + Triangle Splatting ensemble, SAM 3 masks) no headline number. PCBAS supplementary: PCBAS-7 0.548 test / 0.446 challenge set (TAAD–DST extensions, 213:1 pass-to-tackle imbalance handled with square-root frequency weighting).
- Recurring themes (§7): higher input resolution, larger/ensembled models, careful calibration, explicit domain structure (camera geometry, tactical features).

## 8. Code / data availability
SoccerNet datasets are released under open research licenses (soccernet.org); per-task public baselines and development kits; challenge submissions' code per individual technical reports (supplementary material). No single code URL in the paper itself.

## 9. Leakage & limitations
- Leaderboards are incomplete: only teams with reviewed technical reports appear; some entries omitted — not a complete ordering.
- All tasks are soccer broadcast video; zero NFL content, zero quantitative-modeling relevance.
- The paper proposes no method, so there is nothing to validate, reproduce, or transfer mechanically; results are leaderboard snapshots, not scientific claims.
- Challenge splits are private, so the reported numbers cannot be independently re-verified from this paper.
- Two reporting discrepancies, flagged rather than reconciled: (a) NVS winner's LPIPS is 0.388 in Table 3 but 0.366 in the DENSER supplementary report prose; (b) VQA winner accuracy is 98.0% on the leaderboard but the VQA-1 report describes 97.6% on the test split. Neither affects the verdict (no transfer path), but they confirm the reports' numbers are self-reported and lightly copy-edited.
- VQA accuracy near 98% suggests the benchmark may be saturating or answerable from web-grounded retrieval rather than video reasoning (several top systems used Gemini/Claude with retrieval scaffolding).
- External validity to NFL pick modeling: none. The only conceivable connection is sports video understanding for GSE's video content lanes, but GSE's video operation is about real-footage telestrated recaps (standing video rule), not action-spotting benchmarks.

## 10. GSE overlap
Per existing-research-map.md: Garrett's corpus has no computer-vision or video-understanding lane — the ML brief's 15 areas include "multimodal fusion" as a commissioned topic with results pending, but nothing about broadcast video analysis. The NGS/tracking lane uses tracking *data*, not video models. The content operation uses real game footage with telestration under fair-use rules, which this paper doesn't address. No overlap and no useful extension: the tasks (pointing at ball actions, novel-view rendering, jersey-number recognition) solve none of GSE's open problems (calibration, pick selection, bet sizing, market microstructure). Dedup check: unrelated to any of the 64 dedup IDs. Verdict class: wrong domain, no transfer path.

## 11. GSE implementation spec
None warranted. If GSE ever built an automated clip-spotting pipeline for its video content lane (e.g., finding big plays in full-game film), the PCBAS/BAA approaches (temporal action localization from broadcast video, FOOTPASS-style datasets) would be the starting literature — but Garrett's video operation is currently human-edited recaps and the corpus rule says traffic first, so this is parked. No build plan.

## 12. Reproducible test
Not applicable: there is no proposed method to test, and no NFL-transferable target. A relevance check was performed instead: scanning all five tasks' methods for anything applicable to tabular NFL modeling — none found.

## 13. Acceptance / rejection gate
REJECT: no method, metric, or dataset in this paper transfers to GSE's quantitative engine; the soccer-video-understanding domain has no documented role in Garrett's research corpus or product lanes (no video-understanding build is active or planned in the map).

## 14. Improvement experiment
If GSE ever needs broadcast-video understanding (automated highlight extraction for the video lane), the natural follow-up is: reproduce the PCBAS winner's per-player attention approach on NFL broadcast film (All-22 + broadcast) for play-type spotting, benchmarked against manual clip timestamps — but this is a speculative future direction, not a recommendation, given the current traffic-first operating rule.
