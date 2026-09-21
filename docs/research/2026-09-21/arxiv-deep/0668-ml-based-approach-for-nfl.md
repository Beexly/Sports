# [0668] ML-Based Approach for NFL Defensive Pass Interference Prediction Using GPS Tracking Data (arXiv:2206.13222v1)

**Citation:** Arian Skoki, Jonatan Lerga, Ivan Štajduhar (2022). *ML-Based Approach for NFL Defensive Pass Interference Prediction Using GPS Tracking Data*. arXiv:2206.13222v1. URL: https://arxiv.org/abs/2206.13222v1
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2206.13222.txt`; all 5 sections + references in full).
**Verdict:** REJECT — the paper's own finding is a clean negative result (best F1 0.164, precision ~0.08 at recall 0.884; tracking data alone lacks the information to classify DPI), and GSE has no video-analysis pipeline to use it even as a first-stage filter; no actionable GSE application survives the full read. (Replacement: arXiv:1805.05456v1, pool reserve.)

## 1. Research question
Can defensive pass interference (DPI) calls in the NFL be predicted from GPS tracking data alone (Next Gen Stats 2018 season), using time-series sequence models (LSTM, GRU, attention network, multivariate LSTM-FCN), as a first-stage automatic filter for later video-sequence analysis?

## 2. Dataset / schema
- Source: NFL Big Data Bowl 2021 on Kaggle (2018 regular-season NGS tracking for all passing plays); competition/academic non-commercial use.
- Scope: 17,703 passing-play actions; only **259 DPI events (1.46%)**. After a max attacker–defender distance filter (90% of DPI plays below 5.56 distance units), the analysis set is 9,529 non-DPI + 231 DPI plays (2.32% positive).
- Processing: per play, keep only frames from the "pass_forward" event to the end-of-play event; pick the attacker and defender closest to the ball at end-of-play; normalize play direction (all attacks → right); features per row: acceleration, speed, orientation, direction for attacker/defender/ball + pairwise Euclidean distances + binary static events (pass_arrived, pass_outcome_caught, tackle, first_contact, pass_outcome_incomplete, out_of_bounds).
- Splits: 56% train / 14% validation / 30% test (train: 5,336 non-DPI / 130 DPI; val: 1,334/32; test: 2,859/69).

## 3. Method / model
- Sequence models for highly imbalanced time-series binary classification: LSTM, GRU, attention network (ANN, on top of LSTM), multivariate LSTM-FCN; Keras/TensorFlow 2.0; single hidden layer with 8, 64, or 128 cells (more layers tested, no improvement).
- Imbalance handling: class weights w_class = n_inst / (n_classes × n_inst_class) → 0.51 for non-DPI, 20.52 for DPI. Undersampling and SMOTE-style augmentation considered and rejected (undersampling failed outside training; generating time-series artifacts deemed infeasible).
- Model selection: each of 12 configurations trained 5×; best validation-picked; target was best precision at recall ≥ 0.80 (recall prioritized so misses are minimized).

## 4. Equations & assumptions
- Class weight formula (Eq. 1): w_class = n_inst / (n_classes × n_inst_class).
- No model equations stated beyond standard LSTM/GRU/attention architectures (referenced to the literature, not restated).
- Key assumptions (stated): the attacker/defender closest to the ball at end-of-play are the relevant pair for DPI; 90th-percentile distance threshold (5.56) generalizes; high recall with manual video review of positives is the acceptable operating point.

## 5. Features / target
- Target: binary DPI flag per passing play (1.46% base rate).
- Features: attacker, defender, and ball kinematics (speed, acceleration, orientation, direction) + pairwise Euclidean distances + six binary static event indicators. Position x/y replaced by relative distances.

## 6. Validation design
- 30% held-out test set; metrics: precision, recall, F1, AUC (accuracy deliberately not used). Each configuration trained 5×, best validation result reported. No cross-season validation; single 2018 season only.

## 7. Numerical results / baselines
- Test set (Table II): best recall 0.884 (LSTM-128, ANN-64, GRU-128); best overall model LSTM-64: recall 0.855, precision 0.091, F1 0.164, AUC 0.821. LSTM-128: recall 0.884, precision 0.0748, F1 0.138, AUC 0.807. GRU-8 collapsed (AUC 0.487, precision 0.023).
- Validation vs test (Table III) are close (e.g., LSTM-64: val recall 0.844 / test 0.855), so the models generalize — the problem is that the ceiling is low.
- Authors' conclusion: no configuration achieves F1 "significantly above 0.15"; tracking data alone "does not contain enough information in order to classify this complex event correctly"; future work should use video.

## 8. Code / data availability
Code: https://github.com/askoki/nfl_dpi_prediction (stated). Data: Kaggle Big Data Bowl 2021 (public, academic/non-commercial).

## 9. Leakage & limitations
- The closest-to-ball pair heuristic could miss DPI committed away from the catch point; end-of-play frame selection is post-hoc relative to a live-call scenario.
- Only 259 positive events from one season — tiny; no test across seasons/crews.
- No baseline comparison beyond the models themselves (no simple heuristic like "flag every contested catch" baseline).
- Precision ~0.08 means ~12 false alarms per true DPI — unusable for any automated betting or officiating application, and as a "filter" it would pass ~11% of all pass plays to video review, which the authors admit is the only viable use.
- External validity to NFL officiating: DPI is a judgment call; the kinematics-to-call mapping is inherently underdetermined without video.

## 10. GSE overlap
- Existing-research map: NGS taxonomy fully inventoried (tracking lane); referee-crew effects on totals are practiced in-repo (2026-09-19-dk-week2 referee crews work) but no academic papers; STRAIN read. Nothing in the repo attempts automated penalty-call classification from tracking, and this paper shows why that lane is a dead end.
- The closest GSE surface is referee-crew priors for totals, which this paper does not inform (it predicts the call from kinematics, not crew tendencies).

## 11. GSE implementation spec
None — the negative result rules out implementation. The paper's "filter for video analysis" use requires a video-classification pipeline GSE does not have and has not scoped.

## 12. Reproducible test
Not applicable (REJECT). If GSE ever built referee-call models, the reproducible negative control would be: replicate the LSTM-64 on the 2018 BDB data and confirm F1 ≤ 0.20 before abandoning a tracking-only approach.

## 13. Acceptance / rejection gate
REJECT. Gate failed: the paper's own best result (F1 0.164, precision ~0.08 at recall 0.884) is far below any usable operating threshold for GSE's prediction products (which require calibrated probabilities, not 12:1 false-positive filters), and the authors' conclusion is that tracking data alone cannot solve the task. A paper whose demonstrated outcome is "this does not work and needs a different data modality" has no GSE value to adapt — the method (LSTM on kinematic pair sequences) has no other GSE target with a proven signal, and GSE has no video pipeline to attach the filter to.

## 14. Improvement experiment
If a referee-signal lane were ever opened, the honest experiment would skip tracking entirely: model crew-level DPI/incompletion flag rates as a hierarchical Bayesian crew effect (crew as random effect, adjusting for matchup pass volume and depth-of-target), using nflverse penalty data 2015–2025 — testing whether crew DPI propensity predicts next-game DPI counts better than a league-average baseline. That experiment is outside this paper's scope and is not proposed as a follow-up to it.
