# [0409] Applying Deep Learning to Basketball Trajectories (arXiv:1608.03793v2)

**Citation:** Rajiv C. Shah and Rob Romijnders (2016). *Applying Deep Learning to Basketball Trajectories*. arXiv:1608.03793v2. URL: https://arxiv.org/abs/1608.03793v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 319 lines).
**Verdict:** ADAPT — port the LSTM sequence classifier to NFL tracked-ball trajectories (kicks, punts) where static last-point features miss the trajectory dynamics, using NGS data with chronological splits.

## 1. Research question
Can a recurrent neural network (LSTM) learn the dynamics of a basketball's trajectory from raw SportVu positional data and classify three-point attempts as make or miss better than static, feature-engineered classifiers — without hand-crafting trajectory features? The paper's framing question is whether deep learning can replace feature engineering for sequential sports-tracking data.

## 2. Dataset / schema
- Public SportVu trajectory data scraped from NBA.com at the beginning of the 2015-2016 season. The paper states the public data is incomplete (only verifiable shots with both tracking and play-by-play were kept); over 20,000 three-point attempts from 631 games.
- Made-shot rate in the dataset: 35.7% (paper compares favorably to the 35% 2015-16 regular-season average).
- Schema per timestep: ball X, Y, Z coordinates plus game clock; tracking at 25 Hz. No player positions used — ball trajectory only.
- Access: public via NBA.com SportVu at the time; the paper notes public SportVu data availability was limited and noisy. The 2015-16 season range is stated; no exact date bounds for the 631 games.

## 3. Method / model
- LSTM RNN: 2 stacked layers of LSTM with peephole connections. At each timestep the network outputs (a) make/miss probability via a softmax layer trained with cross-entropy, and (b) parameters of a mixture density network (MDN) with three mixtures of tri-variate Gaussians (paper says the MDN is also trained via cross entropy; no MDN results are reported — the classification head is the evaluated output).
- Input sequence length 12 timesteps (~0.5 second of tracking). Inputs: three positional dimensions plus game clock.
- Hyperparameters: 2 layers, 64 hidden units per layer; Adam optimizer, learning rate 0.005; dropout 0.6; batch size 64.
- Train/test: 80/20 random split (the paper does not state chronological ordering).
- Baselines: (1) logistic regression with Elastic Net (alpha 0.5); (2) gradient boosted trees, 50 trees, default parameters — both explicitly not optimized ("The parameters for the classifiers relied on the default values and were not optimized. The goal was a rough approximation").

## 4. Equations & assumptions
No equations stated in the paper. The paper explicitly forgoes RNN mathematics ("This paper forgoes the mathematics of RNNs in favor of a practical application"). Assumptions stated in prose: (a) a 0.5-second trajectory window ending with the ball 2–8 feet from the basket contains enough information to predict make/miss; (b) make/miss labels from play-by-play are correct; (c) the public SportVu X/Y/Z coordinates are sufficiently accurate.

## 5. Features / target
- Target: binary make/miss of a three-point attempt.
- Baseline features (static, from the last observed point): X, Y, Z of the ball; distance to basket center; differences between the last two points for X, Y, Z and distance-to-center; angle of the ball with respect to the basket.
- RNN features: raw sequences of (X, Y, Z, game clock), 12 timesteps, ~0.5 s.
- Prediction horizon: classification is made with the ball 2–8 feet from the basket (models trained/evaluated separately per distance).

## 6. Validation design
- 80/20 random train/test split. Splits are NOT stated to be time-ordered (random split).
- Metric: AUC of the ROC curve for make/miss classification, reported per distance-to-basket (2–8 feet).
- Baselines compared: Elastic-Net GLM and 50-tree GBM on static features; GBM also on the full engineered feature set. No cross-validation scheme stated for the RNN.

## 7. Numerical results / baselines
- Table 1 (XYZ at 1 foot above basket): GLM AUC 0.53, GBM AUC 0.80.
- Table 2 (full static feature set), GLM / GBM AUC by distance: 2 ft — 0.875 / 0.942; 3 ft — 0.807 / 0.902; 4 ft — 0.721 / 0.848; 5 ft — 0.659 / 0.796; 6 ft — 0.604 / 0.746; 7 ft — 0.583 / 0.742; 8 ft — 0.558 / 0.719.
- Table 3 (RNN on positional sequences) AUC by distance: 2 ft — 0.93; 3 ft — 0.913; 4 ft — 0.906; 5 ft — 0.880; 6 ft — 0.873; 7 ft — 0.841; 8 ft — 0.843.
- Paper's claim: RNN improves over baselines at all distances except 2 feet (where GBM's 0.942 beats RNN's 0.93).
- Sample-efficiency check: at 4 feet, training on half the data reached AUC 0.870 versus 0.906 with the full training set (paper's numbers).
- Paper's conclusion statement: RNN achieves AUC 0.843 at 8 feet using half a second of data, outperforming GLM (0.558) and GBM (0.719) at that distance.

## 8. Code / data availability
The paper states a summary is available at tinyurl.com/traj-rnn and that the dataset and model are on GitHub; the precise GitHub URL is not present in the extracted text. Data provenance: public NBA.com SportVu (2015-16 early season), as described in §2.

## 9. Leakage & limitations
- Random 80/20 split can leak shooter/game/trajectory identity across train and test — no player-level or game-level holdout, so part of the AUC may come from recognizing shooters' release signatures rather than generalizable physics.
- Baselines deliberately unoptimized (default GBM, 50 trees), so the RNN-vs-baseline gap is inflated relative to a tuned baseline.
- Only the ball trajectory is used; shooter quality, defender contest, and shot context are ignored, yet make/miss at a given trajectory slice is partly determined by exactly these.
- Public SportVu data is acknowledged incomplete/noisy; results may not transfer to cleaner tracking.
- At 2 feet the static GBM beats the RNN (0.942 vs 0.93) — near the basket the last-point features already saturate.
- No MDN results reported despite the MDN head being part of the architecture.
- External validity to NFL: direct application is to tracked-ball outcomes (field goals, punts), not to player-trajectory modeling; the dataset (20k shots, ~40 MB) is small by modern standards.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE already maintains a 27-family NGS/tracking taxonomy and an NGS replacement spec (docs/research/2026-09-18-ngs-replacement-spec.md), and has digested the STRAIN tracking paper (arXiv:2305.10262) plus a broad NGS metric inventory. Those cover metric definitions and aggregate tracking statistics. This paper is an **extension/new capability**: sequential trajectory classification with RNNs/MDNs is not in the existing corpus — the map lists no sequence-modeling work on raw NGS tracking frames. Relevant NFL transfer: field-goal and punt trajectory modeling from NGS ball tracking, where a static "last observed point" feature set is the current analog of the paper's baseline.

## 11. GSE implementation spec
- Data: NFL NGS ball-tracking frames (10 Hz) for all field-goal attempts and punts, 2022–2025 seasons; join to nflverse play-by-play for make/miss labels, weather, stadium.
- Feature engineering: per attempt, extract the trajectory from snap/hold to 0.5 s before the kick apex (analog of the paper's 2–8 ft window); sequences of (x, y, z, game clock), length ~12–25 frames; static baseline features from the last observed frame (position, velocity deltas, angle to uprights).
- Model: replicate the paper — 2-layer LSTM (64 units), dropout 0.6, Adam 0.005 — plus a tuned GBM baseline on static features (this paper's gap: optimize the baseline).
- Training: chronological split — train 2022–23, validate 2024, test 2025; class balance ~85% makes, so use class weights.
- Serving: batch inference per kick after the game (post-hoc grading of kick quality / expected-make); later real-time for live win-probability.
- Estimated effort: 1–2 weeks for a single engineer (data join is the long pole).

## 12. Reproducible test
- Dataset: NGS-tracked field-goal attempts, 2022–2024 seasons (train 2022–23, test 2024), make/miss labels from nflverse.
- Metric: AUC on the 2024 holdout season.
- Baselines to beat: (a) tuned GBM on static last-frame features (the paper's under-optimized baseline, fixed); (b) distance-only logistic model.
- Run: identical 0.5-second pre-kick window for both models; report AUC overall and binned by kick distance.

## 13. Acceptance / rejection gate
ADOPT the LSTM trajectory model for GSE kick-quality grading IF it beats the tuned GBM baseline by ≥0.03 AUC on the 2024 holdout season AND beats the distance-only model by ≥0.05 AUC; otherwise REJECT the sequence model and keep the static baseline. Gate is fixed before running.

## 14. Improvement experiment
Condition the trajectory model on kicker identity via a learned kicker embedding concatenated to the LSTM output, and add wind/weather covariates — the paper uses no player or context information. Hypothesis: kicker-specific ball-flight signatures (launch angle consistency) explain residual variance the generic LSTM misses; test whether kicker embeddings raise holdout AUC by ≥0.02 over the unconditioned LSTM without leaking (kicker embeddings fit only on training seasons).
