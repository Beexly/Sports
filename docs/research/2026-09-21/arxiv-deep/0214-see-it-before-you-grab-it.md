# [0214] See It Before You Grab It: Deep Learning-based Rebound Anticipation in Basketball (arXiv:2512.15386v1)

**Citation:** Arnau Barrera-Roy, Albert Clapés (2026). *See It Before You Grab It: Deep Learning-based Rebound Anticipation in Basketball*. arXiv:2512.15386v1. URL: https://arxiv.org/abs/2512.15386
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3736 lines; all sections including results).
**Verdict:** REJECT — basketball broadcast-video rebound anticipation has no transfer path to any current GSE lane; the TEAM architecture (X3D + transformer encoder + CLS token) is a generic video-anticipation recipe that could serve a future NFL-video event-anticipation lane, but GSE operates on tabular data and has no video lane; see also paper [0215] (FAANTRA/SoccerNet, the method TEAM adapts) as the broader reference.

## 1. Research question
Can a deep model anticipate rebounds (OREB vs DREB) in basketball broadcast videos *before* they occur? Two setups: **offline** anticipation — video trimmed exactly τ_a seconds before the action, binary OREB/DREB classification; **online** anticipation — untrimmed sliding clips, predict whether OREB/DREB/no-rebound occurs in a fixed anticipation window, without knowing the action timestamp. Auxiliary tasks: action classification (full-video OREB vs DREB) and action spotting (temporal localization of the rebound frame). Plus AI-vs-human-expert comparison and LayerCAM interpretability (§§I–III).

## 2. Dataset / schema
Self-curated **NBA Rebounds** dataset, scraped from NBA Stats [49]: 100,000 video clips, 1280×720, 60 fps, 5–15 s durations, spanning 10 seasons, 30 NBA teams, 800+ distinct players (~300 hours). Each video contains exactly one rebound, labeled OREB or DREB. 2,000 randomly selected videos (balanced classes) manually annotated with frame-level rebound timestamps (first frame ball contacts the hand of the player gaining possession; 84 mislabeled videos removed → 1,916 valid samples, still called "2K"). Dataset not publicly released — NBA permission requested, not granted. Code released in the paper's repository. Splits: D^train_2K = 1,500, D^val_2K = 250, D^test_2K = 250; classification pre-training on a disjoint D_25K (23K/1K/1K); pseudo-label pool D_U = D_100K \ D_25K \ D_2K (~73K samples). No public benchmark comparison possible (§IV).

## 3. Method / model
- **Baseline** = vanilla X3D_m 3D CNN (3.79M params, Kinetics-400 init), final layer adapted to task (1 output + sigmoid for binary; 3 + softmax for online). For spotting, the last X3D block is removed to preserve temporal resolution → T×192 frame-wise features, then temporal smoothing (moving average, window 7), probability threshold 0.7, NMS with 2.5 s window.
- **TEAM** (Transformer-Encoder Anticipation Model, online anticipation only): X3D_m backbone (last block removed → T×D features, T=40 at clip 2 s, D=192) → learnable positional embeddings + learnable CLS token (zeros init) → 2 transformer-encoder layers (MHSA, 8 heads, FFN inner dim 512, dropout 0.1, GELU) → CLS representation → MLP head → per-class probabilities. Encoder-only because each clip contains a single action (no decoder/learnable queries needed). Adaptation of FAANTRA [10] for SoccerNet: single classification objective (no auxiliary segmentation — one action per clip), no time-to-event regression (too few annotated samples), no decoder.
- **Pre-training protocol:** X3D_m pre-trained on rebound classification (D_25K, complete videos), then fine-tuned on anticipation with few unfrozen params (offline: last 100K params; online: last 500K params, ~13%). D_25K ∩ D_2K = ∅ to avoid leakage (classification sees action frames; anticipation must not).
- **Online anticipation losses:** weighted multi-class CE (Eq. 3) with class weights [0.49, 0.49, 0.02] (DREB, OREB, background); spotting frame-wise CE (Eq. 4) with weights [0.49999, 0.49999, 0.00002]. Optimizer AdamW, weight decay 5×10⁻⁵, cosine annealing. 455×256 frames, stride 3, clip 2 s, AW 1 s, overlap 0.5 for the online baseline config. Augmentations: color jitter, horizontal flip, Gaussian blur, random resized crop (scale 0.9–1.0), affine ±10°/±5%, all p=0.5, video-wise consistent.

## 4. Equations & assumptions
Equations quoted faithfully:
- (1) Online setup: c_i = {t_k, t_{k+1}, …, t_{k+T_C−1}} ⊂ V; AW_i = {t_{k+T_C}, …, t_{k+T_C+Δ−1}}.
- (2) ℒ_BCE = −(1/N) Σ_i (y_i log ŷ_i + (1−y_i) log(1−ŷ_i)).
- (3) ℒ = −Σ_{v=1}^V Σ_{c=1}^C w_c · y_{v,c} log ŷ_{v,c}, w = [0.49, 0.49, 0.02] (OREB, DREB, background).
- (4) Frame-wise spotting CE: ℒ = −(1/Σ_v F_v) Σ_v Σ_f Σ_c w_c · y_{v,f,c} log ŷ_{v,f,c}, w = [0.49999, 0.49999, 0.00002].
- (5) CAM_norm[t,h,w] = (CAM[t,h,w] − min CAM) / (max CAM − min CAM + ε), ε=10⁻⁸.
- Effective frame rate: fps_down = fps_orig / stride.
**Assumptions:** one action per clip (offline binary, online + background class); ball-contacts-hand = rebound timestamp; 60 fps broadcast footage; human annotator consistency substitutes for inter-annotator agreement; pseudo-labels filtered to single detection, confidence ≥ 0.99, class-balanced (final 16K pseudo samples: 8K OREB + 8K DREB). The author notes the spotting model is "relatively rudimentary" and pseudo-label quality is a limitation.

## 5. Features / target
Input: RGB broadcast video frames (455×256, stride 3/5) → X3D spatiotemporal features. Task targets: offline — y ∈ {OREB, DREB} from trimmed context; online — y ∈ {OREB, DREB, no-rebound} per sliding clip; classification — {OREB, DREB} full video; spotting — frame t̂_A within δ of t_A plus class. No engineered tabular features; raw pixels only (contrast with Felsen et al. [8], where a random forest on hand-crafted overhead tracking features beat CNNs — cited in §II-C1).

## 6. Validation design
All evaluation on the manually annotated D_2K splits (1,500/250/250). Offline anticipation: accuracy on the 250-sample test split at τ_a ∈ {0.5, 1.0, 1.5, 2.0} s (TEAM results in appendix; main text reports baseline only since the transformer encoder did not significantly improve offline). Online: macro-averaged F1 over 3 classes on validation (test values vary with config). Spotting: mAP@δ, δ ∈ {1,2,3} s, averaged. Baselines: vanilla X3D_m (offline + online), Kinetics-400 vs classification pre-training, 2D ConvNeXt_Tiny backbone, LSTM temporal module, and a 5-person basketball-expert panel (5,000+ hours experience each, majority-vote, one viewing, 5 s to decide) at τ_a ∈ {0.5, 1.5} s. Note the 250-sample test/val sets → high metric variability (author's own caveat; cross-validation not used).

## 7. Numerical results / baselines
- **Classification:** test accuracy 0.881 (val peak 0.88 at epoch 10; train 0.91, mild overfit, early stopping). Per class (Table II): DREB precision 0.89 / recall 0.87 / F1 0.88; OREB 0.87 / 0.89 / 0.88; support 500/500.
- **Spotting (post-processing ablation, val, Table III):** no post-processing — DREB 0.30 / OREB 0.21 / avg 0.26; threshold+NMS — 0.54 / 0.35 / 0.44; +temporal smoothing — 0.58 / 0.34 / 0.46. mAP rises ~0.1 per additional second of δ; DREB consistently > OREB (tipped balls, occlusions, more players in OREB).
- **Offline anticipation (baseline X3D):** test accuracy declines as τ_a increases (Fig. 11; exact values only plotted, qualitative trend stated).
- **Pseudo-labeling (Fig. 14, τ_a = 1.0 s):** adding 1.5K or 16K pseudo-labeled samples gives NO consistent gain (irregular pattern across 0.1M/1M trainable-param setups; "may simply result from chance") — a clean negative result, attributed to imprecise pseudo-timestamps shifting the effective anticipation window.
- **AI vs humans (Table IV):** τ_a = 0.5 s — AI acc 0.60 (P 0.62 / R 0.52 / F1 0.57), humans 0.71 (P 0.83 / R 0.56 / F1 0.67). τ_a = 1.5 s — AI 0.59 (0.60/0.53/0.56), humans 0.59 (0.65/0.38/0.48). AI's F1 exceeds humans at 1.5 s (0.56 vs 0.48) because humans default to the DREB prior when cues are scarce.
- **Online anticipation (TEAM, val, Table V):** best config avg macro-F1 0.287 (OREB 0.290, DREB 0.284); TEAM beats vanilla X3D baseline (0.202) at all clip lengths, peaking at 2 s clips; longer AW improves scores (task gets easier / imbalance eases); ablations — stride 3 optimal (0.287) vs stride 6 (0.234); classification pre-training (0.287) > Kinetics-400 (0.271); X3D_m (0.287) ≈ ConvNeXt_Tiny (0.285) at 7.5× fewer params (3.79M vs 28.5M); transformer temporal (0.287) ≫ X3D (0.202) ≫ LSTM (0.169).
- **Interpretability:** LayerCAM shows max activations in the last 2–3 frames regardless of τ_a; model focuses on players (shooter, inside-3pt players), NOT on the ball — humans rely on ball trajectory/bounce when visible, explaining the τ_a = 0.5 s gap. Proposed fix: auxiliary ball-tracking loss (§IX-C2).

## 8. Code / data availability
Code in the paper's repository (URL present in the PDF, not resolvable from the text extract); scraper supports up to 8 NBA action types (OREB, DREB, 2-pt, 3-pt, assist, turnover, steal, block). **Dataset not public: NBA permission requested but not granted** — GSE cannot use it even if it wanted to.

## 9. Leakage & limitations
- Dataset and code gated on NBA permission that "has not yet been granted" — the single biggest practical blocker.
- Single annotator (the author), no inter-annotator agreement; subjective calls (occlusions, blocked shots) handled by convention only.
- 250-sample val/test sets → high variability; no cross-validation.
- Basketball-specific (broadcast footage, rim physics, box-out cues); the anticipated event (rebound possession) has no NFL analogue in GSE's current data (no ball-contact-possession event in tabular NFL data).
- Online macro-F1 ≈ 0.29 is a weak absolute signal; offline accuracy ≈ 0.6 at 0.5 s — the task is feasible but far from deployment-grade.
- Spotting baseline is self-described as "rudimentary," undermining the pseudo-labeling experiment (authors are honest about this).

## 10. GSE overlap
Nothing in the current GSE corpus covers video-based action anticipation in any sport (existing-research map has no video-anticipation lane; GSE's video material is broadcast/analysis content, not a prediction input). The nearest repo material is paper [0215] in this same wave — FAANTRA/action anticipation from SoccerNet — the method TEAM adapts. Basketball rebound prediction per se does not overlap with NFL modeling; the generic architecture (3D CNN backbone + transformer encoder + CLS token, pre-train on classification then fine-tune on anticipation with frozen params) is the only portable piece, and it is already better documented in FAANTRA.

## 11. GSE implementation spec
REJECT — no implementation warranted. If GSE ever builds an NFL-video event-anticipation lane (e.g., anticipating turnover/TD from all-22 video), the recipe to port would be: (1) X3D or similar 3D-CNN backbone pre-trained on event classification, (2) transformer-encoder temporal module with CLS token (2 layers, 8 heads, FFN 512, dropout 0.1), (3) weighted CE with heavy down-weighting of the background class, (4) classification-init pre-training beats generic Kinetics init (0.287 vs 0.271), (5) add the ball-tracking auxiliary loss the authors propose — their LayerCAM analysis shows the model ignores the ball and loses to humans exactly where ball trajectory matters. Dataset would need rebuilding from NFL footage (no permission path like the NBA's).

## 12. Reproducible test
Not applicable (REJECT). If the NFL-video lane is ever opened, the acceptance test would be: online macro-F1 over {event, no-event} windows on held-out NFL broadcasts beating the vanilla-X3D baseline by ≥ 0.05 absolute, with a human-expert comparison panel as the qualitative bar, following this paper's protocol.

## 13. Acceptance / rejection gate
**Reject** for all current GSE lanes: basketball rebound anticipation from broadcast video has no NFL transfer path, the dataset is permission-gated (unusable), and online macro-F1 ≈ 0.29 / offline accuracy ≈ 0.6 are below any deployment threshold. Revisit only if (a) GSE opens an NFL-video event-anticipation lane and (b) broadcast/all-22 footage is licensable.

## 14. Improvement experiment
The paper's own proposed fix is the one to keep: an **auxiliary ball-tracking loss** (predict ball bounding boxes per frame) to force the model's attention onto the ball trajectory — LayerCAM shows the model ignores the ball and humans beat it exactly at τ_a = 0.5 s where bounce trajectory is visible. In a future NFL-video lane, the analogous experiment would be an auxiliary "ball-carrier/pressure-cue" tracking head alongside event anticipation.
