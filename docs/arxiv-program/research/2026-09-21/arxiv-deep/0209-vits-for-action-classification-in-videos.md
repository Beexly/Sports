# [0209] ViTs for Action Classification in Videos: An Approach to Risky Tackle Detection in American Football Practice Videos (arXiv:2604.01318v1)

**Citation:** Zaidi, S. A. M., Hsu, W., & Dietrich, S. (2026). *ViTs for Action Classification in Videos: An Approach to Risky Tackle Detection in American Football Practice Videos*. arXiv:2604.01318v1. URL: https://arxiv.org/abs/2604.01318v1 (Kansas State University; Albright College; accepted to ICPR 2026; 15 pages, 4 figures)
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf/2604.01318, then-current = v1, 692 lines; spot-verified 2026-09-21 against explicit https://arxiv.org/pdf/2604.01318v1 — abstract, dataset table, Taguchi runs, and Run15 results all confirmed).
**Verdict:** ADAPT — not the dummy-tackle dataset, but the three-part rare-event video-classification recipe (ViViT fine-tuned from Kinetics-400, focal loss with tuned γ/α, Taguchi-L18-guided augmentation applied only post-split) as GSE's template for any rare-but-critical NFL video event classifier (penalty/foul detection, helmet-contact/targeting flags, injury-risk content lane).

## 1. Research question
Can a vision transformer with imbalance-aware training reliably detect rare, safety-critical tackling patterns (head-first "spearing" mechanics) in authentic American football practice videos, where safe tackles predominate ~65/35, labels require expert SATT rubric scoring, and cues are subtle/transient at full speed? The operational goal is a coach-centered triage tool that prioritizes reviews, not an autonomous officiating system.

## 2. Dataset / schema
- 733 single-athlete-dummy tackle clips (expanded from the 178-video Nafi et al. 2022 MLDM dataset), 30 fps, 200–1500 frames each, varied backgrounds/lighting/attire/geared and non-geared players.
- Labels: standardized Assessment for Tackling Technique SATT-3 (Strike Zone) at first point of contact, expert-scored 0–3 (0 = did-not-occur/spearing, 1 = poor, 2 = average, 3 = excellent); mapped to binary: ≤1 = risky, ≥2 = safe.
- Distribution: Safe 474 (64.7%), Risky 259 (35.3%). Each clip temporally localized around a manually marked first point of contact (FPOC).
- No dataset URL stated in the paper.

## 3. Method / model
- Backbone: ViViT-B 16×2 (base: hidden D = 768, 12 layers, 12 heads; 16×16 spatial patches; 2-frame tubelets), Kinetics-400 pretrained, full fine-tuning (encoder + randomly initialized 2-class head).
- Input: 32-frame clip (15 frames before + 16 after manually marked FPOC), 224×224 → (32/2)×(224/16)×(224/16) = 3,136 spatiotemporal tokens + class token.
- Class-imbalance protocol (the paper's main methodological contribution): four augmentation factors (Gaussian noise 2 levels; brightness 3 levels, 50% HSV-V; rotation 3 levels, 45°; flip 3 levels — horizontal/vertical) giving 54 combinations, reduced via Taguchi L18 orthogonal array to 18 configurations + 1 no-augmentation baseline = 19 experimental runs; two supplementary runs (original imbalanced Run0, duplication-only rebalancing). Augmentation applied only after stratified 5-fold split (StratifiedKFold, shuffle, seed 42), only to training folds, targeting the minority risky class to reach ~50:50 (per fold ~171–173 augmented risky clips; training 758–760 clips; validation untouched at 146–147 videos, 34.9–35.6% risky). 5 × 20 = 100 training runs, early stopping on macro-F1, Kinetics-400 init.
- Objective: focal loss L_FL = −α_y(1−p_y)^γ log(p_y), γ = 1.6, α_risky = 0.6 / α_safe = 0.4 — moderate focusing (90%-confident example gets 0.04 weight, 25× reduction; 50%-confident gets 0.33, 3× reduction).

## 4. Equations & assumptions
- (1) Tokenization: z_0 = [x_cls; E p_1; …; E p_N] + E_pos (PDF extraction garbled subscripts; standard ViViT form, flagged as reconstructed notation, not uncertain substance).
- (2)–(3) Transformer layer: z′_ℓ = MSA(LN(z_{ℓ−1})) + z_{ℓ−1}; z_ℓ = FFN(LN(z′_ℓ)) + z′_ℓ, ℓ = 1…12. Readable in extraction.
- (4) Attention(Q,K,V) = softmax(QK⊤/√d_k)V, d_k = 64. Readable.
- (5) Focal loss as quoted in §3 with γ = 1.6, α = (0.6, 0.4). Readable.
- Assumptions: Kinetics-400 spatiotemporal features transfer to tackle mechanics; FPOC manual localization is available at inference (the pipeline is not end-to-end — temporal localization is hand-annotated); the SATT-3→binary mapping captures the safety-relevant signal.

## 5. Features / target
- Inputs: 32-frame RGB clips centered on first point of contact.
- Target: binary risky/safe tackle label.

## 6. Validation design
- Stratified 5-fold cross-validation, mean ± SD, risky recall as primary endpoint, risky F1 secondary; operating thresholds selected per fold to maximize macro-F1; validation folds never augmented (realistic distribution preserved).
- Prior C3D baseline (Nafi et al.) compared on class-normalized confusion matrices because its validation set was only 39 videos (26 safe, 13 risky) vs the new 146/95/51 regime (~3.8× stability improvement per-sample step: 1/13 → 1/51 on recall).

## 7. Numerical results / baselines
- Best config Run15 (photometric perturbations — Gaussian noise + brightness reduction; NO spatial rotations/flips): risky recall 0.67, risky F1 0.59 (66.7% / 59.0% in the conclusion), accuracy 0.67.
- Prior C3D baseline: risky recall 0.583, risky F1 0.56, safe recall 0.769. Gain: +8.4 pp risky recall at −9.9 pp safe recall — a deliberate operating-point tradeoff (false positives triageable by review; false negatives costly).
- Supplementary: original imbalanced run risky recall 0.58; duplication-only 0.54 — systematic augmentation beats naive resampling.
- Several configs hit accuracy 0.70–0.71 but with suppressed risky recall (accuracy/majority trade-off demonstrated).
- Authors' own interpretation: photometric variability helps; aggressive geometric perturbations hurt (spatial body-configuration cues are the safety signal).

## 8. Code / data availability
No code or dataset URL stated in the paper. SATT rubric pages referenced via sites.google.com links (Dietrich, 2025); SATT reliability literature cited (Dietrich et al., 2019; Dietrich, 2020).

## 9. Leakage & limitations
- Augmentation is post-split and validation is unaugmented — the leakage discipline is good (the paper explicitly describes it). Remaining issues: (a) single team/practice context — no multi-team, camera, lighting, or competitive-game generalization (authors admit); (b) FPOC is manually marked, so the system is not end-to-end and cannot run on raw game video as presented; (c) dummy tackles, not live tackles — transfer to game collisions unproven; (d) risky recall 0.67 is modest for a safety tool (1 in 3 dangerous tackles missed); (e) augmentation intensities may be dataset-specific (authors admit); (f) no calibration analysis, no ensembles, no modern video transformers evaluated (Swin/MViTv2 listed as future work).

## 10. GSE overlap
- No existing GSE work on player safety, tackle classification, or video event detection (map grep: no hits). The video-understanding lane (0202 survey) lists action-recognition primaries but nothing safety-oriented. No duplication.
- Note: GSE's video-to-tracks lane (0201) is complementary — 0201 tracks players, this paper classifies short action clips; a combined pipeline (0201 tracks → clip extraction → this recipe's classifier) is the actual GSE deployment shape.

## 11. GSE implementation spec
- Adapt the recipe to NFL rare-event video classification: (a) clip mining from All-22/broadcast around officiating events (roughing-the-passer, horse-collar, targeting/helmet-contact, facemask), (b) ViViT-B 16×2 (or MViTv2) from Kinetics-400, (c) focal loss γ/α grid search, (d) Taguchi-style augmentation DOE applied post-split only, (e) stratified k-fold with untouched validation folds, risky-event recall as primary endpoint.
- Editorial uses: penalty-prediction content ("which QBs draw the most roughing calls"), officiating-crew tendency analysis, player-safety narratives (concussion-risk framing), all grounded in classified video evidence.
- Effort: clip-mining pipeline ~2 weeks; training recipe ~1 week; inference deployment ~1 week. Requires labeled NFL clips — the paper's manual-FPOC bottleneck is the cost center; semi-automated event detection (whistle/scoreboard OCR) can bootstrap candidates.

## 12. Reproducible test
- Dataset: NFL clips mined around called penalties (public broadcast video), SATT-analog rubric = the NFL rulebook definition of the foul, expert-labeled.
- Metric: risky-event recall (primary) and event F1 under stratified 5-fold CV with untouched validation folds.
- Baseline to beat: the paper's 0.67 recall / 0.59 F1 on an analog task — the NFL port must reach recall ≥ 0.65 on the target event class.

## 13. Acceptance / rejection gate
ADAPT the training recipe (not the dataset) if, on an NFL penalty-event pilot (≥300 labeled clips, ≥30% positive class), the ViViT + focal-loss + Taguchi-augmentation protocol achieves event recall ≥ 0.65 with untouched validation folds; reject the recipe for production use if recall falls below 0.55 or if performance collapses when FPOC-equivalent localization is automated rather than manual, since the paper's results depend on hand-marked event centers.

## 14. Improvement experiment
Beyond the paper (which lists these as future work): replace manual FPOC with learned temporal action localization (the paper's own suggestion) and test the full pipeline end-to-end on raw game video; add a second-stage re-ranker that consumes 0201-style track data (player speeds/angles at contact) alongside the ViViT embedding — a multimodal contact-mechanics classifier that the paper's dummy-tackle setup cannot support but GSE's tracking lane can.
