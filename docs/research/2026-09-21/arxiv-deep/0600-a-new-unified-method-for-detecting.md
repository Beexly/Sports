# [0600] A New Unified Method for Detecting Text from Marathon Runners and Sports Players in Video (arXiv:2005.12524v1)

**Citation:** Nag, S., Shivakumara, P., Pal, U., Lu, T., Blumenstein, M. (2020). *A New Unified Method for Detecting Text from Marathon Runners and Sports Players in Video*. arXiv:2005.12524v1. URL: https://arxiv.org/abs/2005.12524v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1273 lines / 35 pages).
**Verdict:** REJECT — bib-number OCR on marathon runners is the wrong domain with no viable transfer path to GSE's numerical/odds NFL engine; the 2020-era hybrid pipeline is obsolete against modern OCR.

## 1. Research question
Can a unified method detect text/bib numbers on the torsos of marathon runners and sports players in video, where text suffers from arbitrary-shaped characters (cloth folding, occlusion, human actions), low contrast against clothing, and poor video quality? The paper's answer: yes, by combining gradient-magnitude/directional-coherence temporal candidate detection, Bayesian skin detection, face→torso geometric estimation, and an adaptive pixel-linking deep-learning text detector — outperforming natural-scene text detectors (RRD, TextSnake, CRAFT, EAST) that degrade on body-worn text.

## 2. Dataset / schema
Six datasets (total 9,115 videos/images), Table 1:
- **Own dataset (sports + marathon video):** 44 video clips (~10 seconds each, 25–30 fps; sports: soccer, tennis, cricket), resolution 150×150 to 1280×720, sourced from YouTube/the Internet/own collection. No ground truth (measures computed manually).
- **MMM [5] (marathon):** 50 videos, 318×479 to 2939×1959.
- **RBNR [4] (marathon bib numbers):** 50 videos, 342×479 to 1260×850.
- **R-ID [28] (person re-identification with bib text):** 8,706 videos, 300×300 to 1200×800.
- **CTW1500 [19] (curved natural-scene text):** 15 images, 620×437 to 1728×2592.
- **MS-COCO Text [20]:** ~250 images, 401×375 to 640×640.
- Still-image datasets were converted to video by duplicating frames (25–30 copies each) to feed the temporal pipeline.
- **Training data for the adaptive deep model:** ICDAR 2015 (fine-tuning base), 8,706 annotated bib-number images from [28] + 500 randomly selected images from [4,5]; 10,206 images total for learning — 7,206 train / 2,000 validation / 1,000 test (test samples from [4,28]).

## 3. Method / model
Three-stage pipeline (Fig. 2):
1. **Candidate region detection (GM + DC fusion):** per-pixel Gradient Magnitude (eq. 1, log-widened, normalized 0–1) and Directional Coherence (eq. 3) from the gradient-covariance matrix (eq. 2). GMdiff/DCdiff via 5×5 sliding-window max−min (eqs. 4–5); fused image Fuse = GMdiff + DCdiff (eq. 6). Frame differences between the first fused frame and successive fused frames; K-means with k=3 on difference images → Max (edges/objects), Min (background), Average (skin/torso-ish) clusters (Fig. 4). Cluster statistics (std of Max/Avg, median of Min; eqs. 7–9) — sudden changes determine the number of temporal frames and key frames automatically.
2. **Bayesian skin detection:** prior P(skin) = MODE(Avg cluster)/(MODE(Avg)+MODE(Max)) (eq. 10); conditional from repeated-pixel counts in 3×3 windows; posterior P(skin|window) (eq. 11) with threshold ≥ 0.50, applied at pixel level (Max+Avg clusters) and component level (morphological grouping of nearest neighbors) across temporal frames. Skin components merged via nearest-neighbor into a seed region.
3. **Face and torso detection:** Viola-Jones face detector [31] (Haar wavelets + AdaBoost — chosen over deep learning for lack of ground truth/samples) on skin seed region, with iterative boundary expand/shrink to maximize the detector confidence score. Torso estimated from head geometry: Height_Torso = 7 × Height_Head (eq. 12), Width_Torso = 2 × Height_Head (eq. 13); multipliers 7 and 2 chosen experimentally (500 random samples; Fig. 11 shows value 7 gives best F-score, dropping as it increases). Four cases handled (face+torso, face-only, torso-only, neither — case (iv) out of scope).
4. **Adaptive pixel-linking deep text detector (torso regions):** VGG16 backbone, fc6/fc7 features; PixelLink [18] instance-segmentation + pixel-linking base. Adaptive loss (eq. 14): L = 2α(t)·L_pixel + (1−α(t))·L_link where α(t) is a function of training epoch (eq. 14's weight schedule), shifting emphasis to link loss as training matures (link errors dominate on posed athletes). Link losses computed separately for positive/negative links (eqs. 15–16).
- **Training protocol:** SGD with momentum = 0.8, weight decay = 6×10⁻⁶, learning rate 0.0001 for the first 20K iterations then 0.001 for the next 40K iterations.

## 4. Equations & assumptions
- GM: GM(i) = log(1 + (Σ_{j∈P_i} S_x²(j) + Σ_{j∈P_i} S_y²(j))/2) (eq. 1, normalized to [0,1]); S_x, S_y = horizontal/vertical gradients over 3×3 window P_i.
- Covariance: E(i) = [Σ S_x², Σ S_x S_y; Σ S_y S_x, Σ S_y²] (eq. 2) → eigenvalues λ₁, λ₂ (anisotropy).
- DC(i) = ((λ₁ − λ₂)/(λ₁ + λ₂))² (eq. 3); DC≈1 for aligned edges, ≈0 for no dominant direction.
- GMdiff(i) = max(GM) − min(GM); DCdiff(i) = max(DC) − min(DC) over 5×5 windows (eqs. 4–5); Fuse(i) = GMdiff(i) + DCdiff(i) (eq. 6).
- Key-frame statistics (eqs. 7–9): SD of Max/Avg clusters, median of Min cluster; Keyframe = min over normalized z-scores round((x_z − x̄_z)/σ_z).
- Bayesian skin: P(skin) = MODE(Avg)/(MODE(Avg)+MODE(Max)) (eq. 10); P(skin|window) = P(window|skin)P(skin)/[P(window|skin)P(skin)+P(window|skin̄)P(skin̄)] (eq. 11); posterior ≥ 0.50 → skin.
- Torso geometry: Height_Torso = 7·Height_Head (eq. 12); Width_Torso = 2·Height_Head (eq. 13).
- Adaptive loss: L = 2α(t)·L_pixel + (1−α(t))·L_link (eq. 14); L_link = L_link_pos/rsum(W_pos_link) + L_link_neg/rsum(W_neg_link) (eq. 16); pixel-link conventions from PixelLink [18].
- F-measure: F = (P·R)/(α·R + (1−α)·P) with α = 0.5 (eq. 17).
Assumptions: video contains humans with text (rarely absent); foreground stays ≥10 frames while background moves; skin intensity standard deviation ≈ 0 across skin patches of different colors (Fig. 5); Max cluster = edges, Min = background, Avg = skin-ish (no proof — heuristic); torso dimensions scale linearly from head size (multipliers fit on 500 samples).

## 5. Features / target
Inputs: video temporal frames (25–30 fps) containing human bodies. Features: gradient magnitude/direction statistics, K-means cluster statistics, Bayesian skin probabilities, Haar-wavelet face features, VGG16 fc6/fc7 CNN features. Target: pixel-level text/bib-number instance masks in torso regions (detection), then recognized strings (recognition experiments).

## 6. Validation design
- Comparative study vs. RRD [6], TextSnake [7], CRAFT [8], EAST [15], Ami et al. [4], Shivakumara et al. [5], Re-ID [28] — all given the proposed method's key frames (or torso regions, the "-Torso" variants) for fairness.
- Recognition validation: Deep TextSpotter [35], SEE [36], plus recognition stages of [4,5]; compared on full images vs. torso-region inputs.
- Metrics: precision, recall, F-measure (α=0.5); torso F-score sweep over the head-height multiplier (500 random samples) to pick 7.
- No time-ordered split concern (static CV task). Ground truth: automatic for RBNR, Re-ID, CTW1500, MS-COCO; manual for own dataset and MMM.

## 7. Numerical results / baselines
- **Key steps on own dataset (Table 2):** key-frame detection P/R/F = 0.86/0.91/0.88; skin detection 0.80/0.78/0.79; face detection 0.86/0.83/0.84.
- **Torso detection (Table 3, P/R/F):** Proposed: RBNR 0.93/0.90/0.92; MMM 0.83/0.76/0.79; CTW1500 0.81/0.75/0.79; MS-COCO 0.72/0.81/0.76; R-ID 0.89/0.85/0.87; own dataset 0.81/0.76/0.78. Beats RBNR [4] and MMM [5] methods on nearly every dataset (MMM [5] takes recall/F on own dataset: 0.77/0.80/0.79 vs proposed 0.81/0.76/0.78 — proposed wins precision).
- **Text/bib-number detection F-measures (Table 4, proposed vs all existing, best on all six):** Proposed F: RBNR 0.75, MMM 0.79, Re-ID 0.90, CTW1500 0.71, MS-COCO 0.37, own dataset 0.82. Closest rivals: R-ID [28]-Full F=0.87 on Re-ID; CRAFT-Full F=0.80 on own data. The "-Torso" variants of EAST/RRD/TextSnake/Re-ID/CRAFT all improve over their "-Full" counterparts (e.g., CRAFT-Torso 0.81 vs CRAFT-Full 0.80 on own data; Re-ID-Torso 0.90 vs Full 0.87 on Re-ID), confirming torso pre-segmentation helps every detector, but none exceed the proposed method.
- **Recognition (Table 5):** torso-region input beats full-image input for every method on every dataset (e.g., SEE-Torso F=0.83 vs SEE-Full 0.80 on own data; Deep TextSpotter-Torso 0.79 vs Full 0.77).
- All methods (including proposed) fail on MS-COCO (F ≤ 0.37) and struggle with occlusion, severe blur, non-uniform character spacing, and tiny fonts (Fig. 26); skin dependence fails when the body is covered (e.g., text on the back).

## 8. Code / data availability
None stated (no code links, no dataset release for the own-dataset videos). References are to public papers/methods (PixelLink [18], Viola-Jones [31], RBNR/MMM/R-ID/CTW1500/COCO-Text). Data: 44 own videos not released.

## 9. Leakage & limitations
- **Wrong domain for GSE:** marathon bib numbers ≠ NFL analytics. The entire method (skin detection, face→torso anthropometry, bib text) is designed for athlete bibs; nothing transfers to play-by-play, ratings, odds, or market work.
- **No video/film pipeline at GSE:** the corpus has zero video-CV infrastructure; standing directive is real footage for video content, not OCR. A jersey-number-reading CV lane would be a from-scratch build (data collection, annotation, GPU training) with no current consumer — NGS tracking already supplies player identities to anyone with tracking data.
- **Obsolescence:** 2020-era hybrid (handcrafted Bayesian skin detector + Viola-Jones + VGG16 PixelLink). Modern end-to-end OCR (PaddleOCR, EasyOCR, TrOCR) and player-detection models (YOLO-based jersey-number readers) make the handcrafted stages redundant; the adaptive pixel-link loss is a minor variation on PixelLink.
- Experimental concerns: no code/data release; manual ground truth for own + MMM datasets; the "K=3 clusters" skin heuristic and multipliers 7/2 are fit-and-forget constants; MS-COCO failure (F=0.37) shows poor generalization beyond humans-with-text; no ablation of the adaptive loss vs. fixed weights.
- NFL external validity: zero — jersey fonts, occlusion patterns, broadcast framing differ entirely from marathon bibs; helmet visors/face coverage break the skin-dependent pipeline anyway.

## 10. GSE overlap
**No overlap — new domain entirely, no existing capability.** The existing-research map shows Garrett's corpus covers tracking/NGS metrics, calibration, ratings, ML brief topics (including "multimodal fusion" as a commissioned topic with results not yet in repo), but nothing on video CV or OCR. The single transferable insight — "segment the torso/jersey region before running OCR" (Table 4's -Torso variants beat -Full for every detector) — is noted but has no current consumer at GSE. This is not a duplicate of anything; it is simply not on the roadmap.

## 11. GSE implementation spec
No implementation recommended (REJECT). If Garrett ever stands up a film-analysis lane (auto-charting from broadcast video — e.g., reading jersey numbers to identify players on All-22 when tracking data is unavailable), the paper's one portable lesson is: run a person/torso segmentation step before OCR rather than OCR-ing full frames. A modern build would skip this paper's pipeline entirely and use an off-the-shelf detector (YOLOv8 person detection → jersey crop → PaddleOCR), which is ~1 day of prototyping vs. the paper's multi-stage custom build. Effort for any real jersey-OCR lane: ~1–2 weeks including annotation, none justified now.

## 12. Reproducible test
Not applicable (REJECT) — no GSE data analog exists. A future jersey-OCR pilot would: dataset = 200 hand-labeled broadcast frames with visible jersey numbers (All-22 or TV angle); metric = number-recognition accuracy; baseline = PaddleOCR on full frames; test = PaddleOCR on torso-cropped frames per the paper's transferable insight; expect ≥10-point accuracy gain on crops. This test is shelved until a film lane exists.

## 13. Acceptance / rejection gate
REJECT as decided: no build, no test, no follow-up. Gate for any future reconsideration: Garrett explicitly commissions a film-analysis/video CV lane AND a jersey-OCR pilot (as in §12) shows torso-crop OCR beating full-frame OCR by ≥10 accuracy points on NFL broadcast frames. Until both hold, this stays out of the corpus roadmap.

## 14. Improvement experiment
If the jersey-OCR lane ever matters: replace the paper's skin-detection stage (its acknowledged failure mode — covered bodies, backs, helmets) with a learned person/torso segmenter (YOLOv8-seg or Mask R-CNN) and the adaptive pixel-link detector with a transformer OCR head (TrOCR) trained on synthetic jersey-number data (font-rendered numbers with NFL-style fonts, motion blur, occlusion augmentation). Compare on labeled NFL broadcast frames: expected result is that torso segmentation still helps (validating the paper's core transferable claim) while every handcrafted stage (skin Bayes, Viola-Jones, head-multipliers) can be dropped with no accuracy loss — which would also serve as an ablation proving the paper's complexity was unnecessary.
