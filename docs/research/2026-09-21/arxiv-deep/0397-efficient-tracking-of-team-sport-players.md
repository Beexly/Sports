# [0397] Efficient tracking of team sport players with few game-specific annotations (arXiv:2204.04049v1)

**Citation:** Adrien Maglo, Astrid Orcesi, Quoc-Cuong Pham (Université Paris-Saclay, CEA List, 2022). *Efficient tracking of team sport players with few game-specific annotations*. arXiv:2204.04049v1. URL: https://arxiv.org/abs/2204.04049v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1928 lines, incl. appendices and references; tail verified).
**Verdict:** ADAPT — an offline, annotation-efficient player-tracking system that learns game-specific identities from ~6 short tracklet annotations per player (incremental Transformer-based ReID), beating ByteTrack by +26 pp IDF1 on rugby sevens and releasing a public moving-camera tracking dataset. Its distinctive value vs 0396 is the *few-shot identity bootstrapping*: the practical answer to "how do we get identified tracks for a team/league with zero labeled data" (college, historical NFL, new sports). Same hard legal constraint as 0389/0396 on NFL broadcast footage.

## 1. Research question
Generic MOT/ReID (trained on surveillance data) fails on team sports: fast non-linear motion, heavy occlusion, same-kit appearance, small player size in TV streams. Prior sport-specific trackers need private datasets and heavy annotation. Can a system track and *identify* players for a full game using only generic pre-trained detection/ReID plus a handful of game-specific annotations collected through a semi-interactive interface — with no sport-specific knowledge? (§1)

## 2. Dataset / schema
New public **rugby sevens tracking dataset** (released at https://kalisteo.cea.fr/index.php/free-resources/): three 40-second extracts (Argentina/France, France/Chile, France/Kenya; 2021 Dubai tournament), 1920×1080 @ 50 fps, single moving camera (pan/tilt/zoom); 58,193 annotated person bounding boxes (both teams, referees, public). Generated tracklets: ~346 per 40 s video (avg length ~1 s), covering ~89% of detections. Full-game eval: 32 regularly sampled frames from France/Kenya (12 French players incl. substitutions; 128 ground-truth boxes). Videos courtesy of World Rugby. (This fills the paper's noted gap: no public moving-viewpoint sports tracking dataset existed.)

## 3. Method / model
- **Tracklet generation (§3.2):** Faster R-CNN ResNet-50 (COCO-trained) detects persons; SORT-style IoU bipartite matching + Kalman filter links boxes; tracklets intersecting with IoU > μ=0.5 are split (treated as ambiguous); tracklets shorter than l_min=10 frames discarded → "non-ambiguous" single-identity tracklets.
- **Incremental tracklet classification (§3.3, Fig. 3):** R_img = Luo et al. bag-of-tricks ResNet-50 ReID (Market1501-pretrained; 256×128 input, d_1=2048) → FC to d_2=128 → Transformer (16 encoder layers, 1 decoder layer, 16 heads; N_q=32 learned DETR-style queries, no positional encoding since tracklets resampled to d_t=10 frames; top N_qc=4 queries backpropagated) → batch norm → tracklet feature F_t; FC → class scores S_t over N_c=1+N_p classes (class 0 = don't-track: opponents/referees/public).
- **Training:** L = L_ID(S_t, Ŝ_t) + α·L_Triplet(D_{t,p}, D_{t,n}) (cross-entropy + soft-margin batch-hard triplet); 120 epochs, AdamW, lr 9×10⁻⁵, wd 10⁻⁴, batch 4. Two regimes: R_img frozen (interactive, ~0.8 s/annotation, 4M params) vs R_img fine-tuned (28 s → 25 min for 32 annotations, 25M params, non-interactive). Recommended workflow: annotate interactively frozen, then retrain unfrozen once satisfied.
- **Association (§3.4):** (a) *iterative*: greedily take max S_t, accept if no frame overlap with identity's existing tracklets; (b) *RNMF*: restricted non-negative matrix factorization on similarity S(u,v) = clip(Ψ_app) + clip(Ψ_loc), with Ψ_app(F_u,F_v) = 1 − d_cos(F_u,F_v)/η_app (Eq. 1, η_app=0.35) and Ψ_loc = (1+η_loc)·IoU(B_ul,B_vf) − η_loc if gap ≤ τ=0.5 s else 0 (Eq. 2, η_loc=0.43).
- **Annotation loop:** user labels a few tracklets per player via the interface (Fig. 4); model retrains; user corrects mistakes or stops.

## 4. Equations & assumptions
- Tracklet feature: T¹_t ∈ ℝ^{d_t×d_1} → FC → T²_t (d_2=128) → Transformer → F_t ∈ ℝ^{d_2}; scores S_t ∈ ℝ^{N_c}.
- Loss: L = L_ID(S_t,Ŝ_t) + α L_Triplet(D_{t,p},D_{t,n}); α=0 with iterative association, α=1 with RNMF.
- Similarity: S(u,v) = clip(Ψ_app(F_u,F_v)) + clip(Ψ_loc(B_ul,B_vf)); clip(x)=max(min(x,1),0); Ψ_app = 1 − d(F_u,F_v)/η_app (Eq. 1); Ψ_loc as Eq. 2 above.
- Split rule: IoU > 0.5 → terminate both tracklets; discard length < 10.
Stated assumptions: closed identity gallery (known, limited player count); tracklets are single-identity after splitting; generic surveillance ReID transfers to sport kits; no sport-specific knowledge used (claimed sport-agnostic).

## 5. Features / target
Features: per-image ReID embeddings aggregated over 10 sampled frames per tracklet via Transformer cross-attention (learns to focus on most distinctive frames). Target: identity label per tracklet (N_p player classes + background class), then full-game identified tracks.

## 6. Validation design
Baselines: ByteTrack, TWBW (online), MOT neural solver (offline, on authors' detections) — manually filtered to French-team tracks for fairness. Metrics: IDF1 (primary — identity correctness), MOTA, ID switches, over 5 seeds with variation intervals. Ablations: R_img frozen vs trained × iterative vs RNMF association; annotation rounds (x-axis = annotations/player). Full-game test: detection recall × team-classification recall × identity-classification recall = total recall, on 32 sampled frames, 5 seeds. Upper bound estimated via ground-truth tracklet association (non-zero ID-switch floor acknowledged).

## 7. Numerical results / baselines
- **Annotation efficiency (Fig. 5, §4.2.2):** metrics saturate above ~3.5 annotations/player; round 1→3 with R_img frozen + iterative: IDF1 and MOTA +11/+9 pp, ID switches ÷5. At 3rd round, frozen+iterative: IDF1 ≈75%, MOTA ≈66% (average over 3 clips).
- **vs generic trackers (Table 1):** Ours IDF1/IDs/MOTA = 76.8/17/64.6 (Arg/Fra), 84.3/21/75.4 (Fra/Chi), 82.2/7/70.1 (Fra/Ken) vs ByteTrack 48.8/26/49.4, 54.9/23/64.4, 60.3/14/64.0 → **IDF1 +26 pp on average**; TWBW and MOT neural solver far worse (IDF1 22–48).
- **Association choice:** RNMF gives +12 pp MOTA (more complete) but −1 pp IDF1 and +25 ID switches vs iterative at 3rd round — iterative preferred for identity purity. Fine-tuning R_img: +3/+2 pp IDF1/MOTA, −3 ID switches, at the cost of interactivity.
- **Full game, 70 annotations (~6/player, Table 2):** total recall (detection × team × identity) best 53.6±1.8% (R_img trained + RNMF); for well-visible players (box area > 25,214 px², the mean): **67.9±2.6%** total recall (detection 90.8±0.9%, team 83.5±3.4%). Failures concentrate on small/occluded players (complex postures, rucks).

## 8. Code / data availability
Dataset public: https://kalisteo.cea.fr/index.php/free-resources/ (tracking ground truth + generated tracklets). No code link stated in the paper. Components are standard open-source (Faster R-CNN, Luo et al. ReID, Transformer); full hyperparameters reported (§4.1). Annotation interface runs on a laptop GPU (Quadro M2000M).

## 9. Leakage & limitations
- Only 3×40 s clips + 32 sampled frames for the full-game test — small evaluation; full-game ground truth deemed too costly, so full-game *tracking* quality (vs detection+classification on samples) is not directly measured.
- Generic-tracker comparison is admittedly imperfect (manual track selection for French players only).
- No sport-specific knowledge is a double-edged claim: the method ignores jersey numbers, team structure, and field geometry that could help (cf. 0396's planned number-OCR improvement).
- Rugby sevens (7-a-side, wide-open field) is easier than 11-a-side American football for occlusions; transfer untested ("future work: basketball").
- Interactive loop needs a human in the loop per game — ~6 annotations/player is cheap but not zero; scaling to a full season of NFL games still requires per-game annotation sessions.
- Adversarial note: 67.9% total recall on well-visible players means roughly 1 in 3 player-instances is missed or misidentified even in the best case — usable for aggregate analytics, not for play-level adjudication.

## 10. GSE overlap
Complements the tracking cluster without duplicating: 0389 = field-registered tracking from monocular video; 0396 = image-plane MOT with sport-specific post-processing; 0394 = trajectory forecasting; 0395 = event-to-tracking imputation. This paper's unique contribution is the **few-shot identity layer** — the practical bootstrapping step the others assume away (they assume identities are given or irrelevant). It also adds the only public moving-camera team-sport tracking dataset in this wave's set. The map's tracking/NGS taxonomy covers methods, not annotation-efficient identity learning — no duplication.

## 11. GSE implementation spec
1. **Reproduce on the public rugby sevens data** (frozen R_img + iterative association) to validate the ~3.5-annotations/player saturation curve and the +26 pp IDF1 margin over ByteTrack.
2. **Port the annotation loop to American football:** target a college or public NFL-analog broadcast sample; replace/augment appearance with jersey-number OCR (the paper's §2.2.2 notes no public jersey-number training set exists — building one is a prerequisite for the number-OCR upgrade planned in 0396's §14).
3. **Scale test:** measure annotation cost per game (minutes of annotator time) and identity quality vs number of annotated tracklets to find the NFL operating point; test whether one game's annotations transfer to the next game (same team, different kits/conditions).
4. **Legal review before any NFL broadcast footage** — same gate as 0389/0396; start with public/college footage.
Estimated effort: 2 weeks for reproduction; the football port + number-OCR dataset is a multi-week project.

## 12. Reproducible test
Download the dataset from https://kalisteo.cea.fr/index.php/free-resources/; reimplement the pipeline per §4.1 hyperparameters; require (a) the annotation-saturation curve (IDF1 plateau at ~3–4 annotations/player), (b) frozen+iterative IDF1 within ~5 pp of the reported ~75% at the 3rd annotation round, and (c) ≥20 pp IDF1 margin over ByteTrack on the three clips. Then the GSE acceptance test: apply to one full American-football broadcast half with ~6 annotations/player and require total recall ≥60% on well-visible players with per-position error breakdown — below that, the method is a research reference, not a labeling pipeline.

## 13. Acceptance / rejection gate
ACCEPT as ADAPT conditional on the §12 reproduction. Standing gates: (1) legal review before NFL footage (same as 0389/0396); (2) never present semi-automatically labeled tracks as ground truth in public content — report the recall bounds. If reproduction fails to show the annotation-efficiency margin (i.e., needs >10 annotations/player to beat ByteTrack), demote to REJECT.

## 14. Improvement experiment
Two upgrades the authors defer: (1) **Active learning for the annotation loop** — replace user-chosen tracklets with model-suggested ones (highest identity entropy / lowest max score), and measure annotations-to-target-IDF1 vs random/user selection; success = reaching 75% IDF1 with ≤2 annotations/player. (2) **Cross-game identity transfer** — fine-tune R_img on game A's annotations and test zero/few-shot on game B (same team, different match): if identity features transfer, per-game annotation cost collapses and the system becomes a season-scale labeling pipeline, which is the actual GSE requirement.
