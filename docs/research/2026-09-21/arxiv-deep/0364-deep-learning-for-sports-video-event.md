# [0364] Action Spotting and Precise Event Detection in Sports: Datasets, Methods, and Challenges (arXiv:2505.03991)

**Citation:** Xu, H., Baniya, A. A., Wells, S., Bouadjenek, M. R., Dazeley, R., Aryal, S. (2025). *Action Spotting and Precise Event Detection in Sports: Datasets, Methods, and Challenges*. arXiv:2505.03991. URL: https://arxiv.org/abs/2505.03991
**Ledger completed:** 2026-09-21. **Read:** full text (text extract, 1563 lines).
**Verdict:** ADAPT — the TAL/AS/PES taxonomy, the tolerance-window formalism, the SoccerNet method leaderboard (Table II), and the dataset catalog (Table III) are directly usable as the design reference for GSE's video event-detection and frame-accurate highlight-cutting work; the paper is a survey, so there is no model to lift, only the benchmark tables, evaluation equations, and the three open challenges (cross-sport generalization, low-supervision, better multimodal fusion) to adopt as an engineering roadmap.

## 1. Research question
What are the distinct formulations of video event detection in sports — Temporal Action Localization (TAL), Action Spotting (AS), Precise Event Spotting (PES) — how do datasets and evaluation metrics map onto each, what do state-of-the-art methods achieve, and what open challenges block generalized, efficient, robust event detection across sports?

## 2. Dataset / schema
The survey catalogs 16 datasets (Table III), selected anchors:
- **SoccerNet** (2018): 500 videos / 764 h, spotting annotations, 3 classes (goals, cards, substitutions).
- **SoccerNet-v2** (2021): 500 videos / 764 h, spotting, 17 event classes.
- **SoccerNet Ball Action Spotting** (2023): 7 videos, spotting, 12 ball-action classes (11,041 timestamps; pass/drive at launch).
- **Tennis** (E2E-Spot, 2022): 3,345 clips, spotting, 6 ball-contact/bounce classes split near/far court.
- **OpenTTGames** (2020): 12 videos at 120 FPS, 4,271 frame-precise events (bounces, net hits).
- **P²A** (2024): 2,721 videos / 272 h, interval annotations, 14 fine-grained / 8 high-level table-tennis stroke classes, pro-validated.
- **NCAA** (2016): 257 basketball videos, 14 action categories. **Badminton Olympic** (2018): 27 videos, 12 classes. **FineGym** (2020): 5,374 videos, 32 spotting classes. **MCFS** (2021): 11,656 figure-skating segments / 17.3 h, 130 actions. **FineDiving** (2022): 300 videos, 52 fine-grained action types.
Interval-annotated datasets can be adapted to AS/PES by treating interval start/end frames as discrete events (§III-D).

## 3. Method / model
Survey of two pipeline stages (temporal segmentation + event classification) across three method families:
- **TAPG/TAL:** Global-to-Local (TURN sliding-window/clip-pyramid + NMS; CTAP complementary actionness+sliding-window with a Temporal Convolutional Adjustment and Ranking Network) vs Local-to-Global (TAG watershed grouping; BSN per-frame start/end/actionness pairing — AR@50 on THUMOS14 21.86%→37.46%; BMN boundary-matching 2D confidence map; BSN++ completeness modeling + global-local confidence fusion; TCANet local-global temporal encoder + dual frame/segment boundary regressor; BCNet background-constraint with action-background interaction and background-score loss).
- **AS/PES (Table II, SoccerNet benchmark):** Giancola temporal pooling (2018, 31.37 loose); NetVLAD++ temporally-aware pooling; RMS-Net regression+masking; Zhou transfer learning (Transformer head, 47.05 tight / 74.77 loose test, 49.56/74.84 challenge); E2E-Spot (RegNet-Y + Gate Shift Modules + 1-layer bi-GRU per-frame probabilities; 66.73 tight / 73.62 loose challenge, tested on tennis/diving/gymnastics/skating ✓); STE 1D-conv-only encoder; SpotFormer (VideoMAE + Swin Transformer extractors, 60.90 tight test); Soares dense detection anchors (65.07 tight test / 68.33 challenge); ASTRA (Transformer encoder-decoder + visual/audio learnable queries, 70.10 tight / 79.21 loose challenge); T-DEED (Scalable-Granularity Perception layers preserving fine-grained temporal resolution ✓ cross-sport); Tran UGL (RegNet-Y+GSM global + GLIP vision-language local entities for ball/card detection — first VL model in PES — 62.49/73.98 test, 69.38/76.15 challenge ✓); COMEDIAN (MoCo + Soft Contrastive distillation pretraining, 73.10 tight test / 68.38 challenge — SOTA at publication).
- **Data-efficiency result:** Giancola et al. active-learning pipeline reaches SOTA-comparable AS with **only one-third of the labeled dataset** [59] (§III-B).
- **Audio fusion:** Vanderplaetsen et al. found late fusion (just before the FC layer) beat other visual+audio strategies [33].

## 4. Equations / algorithms
- **TAL mAP** (§III-C1): Precision = TP/(TP+FP), Recall = TP/Total GT (1); T-IoU = |Ip ∩ Ig|/|Ip ∪ Ig| (2); AP = Σk(Rk − Rk−1)Pk (3); mAP = (1/C)Σc APc (4).
- **AR@AN** (5): matched ground-truth instances / total, at fixed proposal counts (AR@50/100/200).
- **AUC** (6): ∫₀ᴺ AR(n) dn over the AR–AN curve.
- **AS/PES AP** (§III-C4): detection = TP if predicted timestamp falls within the tolerance window of an unmatched ground truth (one match per GT, non-reusable); Precision_n = TPs up to n / predictions up to n (7); AP = (1/Total GT) Σᵢ Precisionᵢ (8) — early high-confidence TPs contribute most.
- **Tolerance windows (Table I):** TAL ~1–5 s; AS 5–60 (frames per Table I; text says seconds); PES 0–2 frames (table) / 1–5 frames (~33–200 ms at 25–30 FPS, per Hong et al. in text) — note the paper's own table and text disagree on units; the substantive point is the orders-of-magnitude precision ladder.

## 5. Key results
- **Leaderboard (Table II, SoccerNet):** COMEDIAN 73.10 tight (test) / 68.38 (challenge) — SOTA; Soares dense anchors 65.07/68.33; ASTRA 70.10 tight / 79.21 loose (challenge); E2E-Spot 66.73/73.62 (challenge); Zhou 49.56/74.84 (challenge). **Only E2E-Spot, T-DEED, and Tran/UGL are marked ✓ for cross-sport testing** — every other method was validated on soccer only.
- **General-purpose finding:** domain-adapted features (Zhou's soccer-fine-tuned backbones + Transformer head) gave the largest single jump at the time, underscoring that sport-specific feature adaptation matters more than head architecture.
- **PES motivation:** in tennis/table tennis/figure skating, 1–2 frame errors can miss ball contacts or bounce locations — Table Tennis Australia consultation cited as domain confirmation (§II-C).
- **Three open challenges** (§IV): (1) cross-sport generalization — specialized models rely on sport-specific camera angles/event definitions; (2) unsupervised/low-supervision — only KD/active learning explored, fully unsupervised/self-supervised methods "largely unexplored"; (3) multimodal fusion stuck at concatenation/late fusion — future is attention-based cross-modal transformers, modality-specific encoders with temporal alignment, ASR+commentary as weak supervision.

## 6. Strengths
Explicitly defines and separates TAL/AS/PES for the first time in survey form, with the tolerance-window ladder made quantitative. Comprehensive method coverage (TURN→BCNet for proposals; 17 methods in Table II with a unified SoccerNet benchmark), a dataset table spanning 7 sports, full evaluation-equation derivations, and actionable open challenges (CLIP-based cross-sport transfer, self-supervised pretraining, attention-based fusion) rather than vague futurism. The Giancola active-learning 1/3-data result and the late-fusion audio finding are directly engineering-relevant.

## 7. Limitations / threats to validity
A survey: no new experiments, no ablations, no error bars — Table II numbers are lifted from the original papers with different training splits/eras, so cross-row comparisons are approximate. The paper's own Table I vs text disagree on AS tolerance units (frames vs seconds), suggesting loose editing. Claims "the first" AS-specific SSL+KD framework (COMEDIAN) and "first" VL model in PES (UGL) rest on the authors' literature search. Cross-sport generalizability is asserted as important but the evidence base is only 3 of 17 methods. Fully-unsupervised methods are declared "largely unexplored" without a systematic negative-result survey.

## 8. Implementation spec (how GSE would apply it)
1. **Adopt the TAL/AS/PES taxonomy as the annotation spec:** interval labels for TAL-style analytics (play phases), single timestamps for AS-style event indexes (goals, turnovers), frame-level (±1–2 frame) labels for PES-style highlight cutting — matching GSE's 2–4 s telestrated clip requirement needs PES-grade precision on cut points. 2. **Start from the leaderboard:** prototype with E2E-Spot (RegNet-Y + GSM + bi-GRU, cross-sport validated, efficient) or T-DEED (fine-grained temporal resolution), not the heavier SpotFormer multi-extractor stack; add the UGL idea (GLIP local-entity prompts for ball/referee) for fine-grained NFL entities (ball, pylon, first-down marker). 3. **Late-fuse audio** (crowd/whistle/commentary cues) per Vanderplaetsen's finding. 4. **Cut annotation cost** with the Giancola active-learning loop (1/3 data for SOTA-comparable) before paying for full labeling. 5. **Evaluate with the paper's equations:** AS/PES AP (7–8) at multiple tolerance windows, reported per event class, to separate coarse indexing accuracy from frame-accurate cutting accuracy.

## 9. Experiments / tests to run
- Benchmark E2E-Spot vs T-DEED vs a COMEDIAN-style pretrained transformer on NFL broadcast clips at three tolerance windows (2 frames, 1 s, 5 s) to separate coarse from frame-accurate performance. - Reproduce the active-learning 1/3-data result on NFL events: does uncertainty-ranked sampling hold for football's denser event structure? - Test late-fusion audio (whistle/crowd spikes) on kickoff/score events vs visual-only. - Cross-sport transfer test: train AS on soccer (SoccerNet-v2), probe on NFL — quantify the generalization tax the authors warn about, with CLIP-based pretraining as the mitigation arm. - Validate the AS tolerance-unit ambiguity: fix windows in frames, not seconds, for the NFL frame-rate pipeline.

## 10. Relation to existing research
The existing-research map (2026-09-21) has **no coverage** of action spotting, precise event spotting, SoccerNet benchmarks, or this survey — new territory. It builds on the Wave 4 stack: **0359** (tennis annotation tool/taxonomy) supplies the labeling-factory pattern this paper's datasets and active-learning result would populate; **0362** (McByte tracking) supplies the object-tracking layer that AS/PES event detection would index downstream; **0363** (SoccerChat) shares the SoccerNet-v2/dense-captioning data lineage and the multimodal-fusion theme (§IV-C echoes 0363's audio-handling gap). It also anticipates the 15-area ML brief's commissioned "multimodal fusion" topic.

## 11. Improvement path
Extend the benchmark table with per-class AP and latency/FPS so engineering trade-offs are visible; reconcile the tolerance-window units (frames vs seconds) explicitly; add NFL/American-football datasets to the catalog (currently zero American-football coverage — a gap GSE could fill and publish); test the "first" claims (COMEDIAN, UGL) against newer baselines; and run the cross-sport transfer experiments the authors call for (soccer→NFL) instead of leaving them as future work.

## 12. Verdict reasoning
**ADAPT.** There is no model to lift — it's a survey — but what it delivers is exactly what GSE's video pipeline needs before spending on annotation or training: a formal task taxonomy with tolerance windows, the equations to evaluate against, a 17-method leaderboard to pick prototypes from, a 16-dataset catalog, and the data-efficiency result (1/3 labels via active learning) that de-risks the labeling budget. The three open challenges map 1:1 onto GSE engineering decisions (which tolerance tier per use case, how to fuse audio, whether to chase cross-sport models). REJECT is wrong because the taxonomy + leaderboard + equations are immediately actionable; MONITOR is wrong because the guidance is needed now, not later.

## 13. Risks / open questions
- Table II numbers are cross-paper comparisons with different eras/splits — treat as directional, not gospel. - Zero American-football datasets in the catalog; soccer-trained spotting models may fail on NFL's denser, more occluded event structure. - The AS tolerance-window unit inconsistency (frames vs seconds) must be resolved before adopting the metric. - Active-learning 1/3-data result demonstrated on soccer only; NFL event density may need more labels. - Heavy multi-extractor methods (SpotFormer) are impractical for real-time; the survey under-emphasizes latency.

## 14. Metadata
- **Datasets used:** Survey of 16 datasets across soccer, tennis, table tennis, basketball, badminton, figure skating, diving, gymnastics (Table III); methods benchmarked on SoccerNet/SoccerNet-v2 action spotting.
- **Code/data availability:** No new code or data; references existing public datasets and method repos (COMEDIAN, E2E-Spot, ASTRA, T-DEED, UGL, SoccerNet).
- **Reproducibility:** High for the taxonomy and evaluation equations; Table II is a literature compilation, not a reproduction.
- **Compute:** Method-dependent; STE is the cited efficiency play (1D convolutions only), E2E-Spot is single-layer bi-GRU, SpotFormer is the heavy multi-extractor option.
- **GSE relevance:** Video event-detection design reference: annotation spec (TAL/AS/PES tiers), prototype selection (E2E-Spot/T-DEED/UGL), frame-accurate highlight cutting, audio late-fusion, active-learning labeling budget.
