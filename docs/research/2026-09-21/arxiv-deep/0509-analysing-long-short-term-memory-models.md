# [0509] Analysing Long Short Term Memory Models for Cricket Match Outcome Prediction (arXiv:2011.02122v1)

**Citation:** Rahul Chakwate, Madhan R A (2020). *Analysing Long Short Term Memory Models for Cricket Match Outcome Prediction*. arXiv:2011.02122v1. URL: https://arxiv.org/abs/2011.02122v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5 pages / 33,253 chars).
**Verdict:** ADAPT — the ball-by-ball in-play LSTM framework (especially the all-inputs/all-outputs architecture and score-differential conditioning) transfers to NFL live spread/total probability surfaces, but the cricket-specific feature engineering does not.

## 1. Research question
Can an LSTM trained on ball-by-ball cricket data produce accurate real-time win probabilities for the batting team at every point (every ball) of a One Day International cricket match, rather than only predicting the winner pre-match from match-level statistics — and which input/output architecture best supports per-timestamp prediction?

## 2. Dataset / schema
- Open-source ODIs (One Day Internationals) cricket dataset, ball-by-ball: 1,597 international matches from 1971 onwards, 50 overs (nominally 300 balls) per innings, both innings recorded per match.
- Ball-level attributes: innings number (1st/2nd), over and ball number (over.ball format), batting team name, batsman name, non-striker name, bowler name, runs off bat, extras (wides/no-balls), wicket flag (1 if wicket fell).
- Match-level statistics: team, gender, season, date, series, match number, venue, city, toss winner, toss decision, player of the match, umpire, TV umpire, match referee, winning team, runs scored by winning team.
- Preprocessing: extra runs from no-balls merged into the preceding ball to form constant-length 300-ball sequences; categorical data (team/player names) one-hot encoded after dropping outliers (e.g., teams with a single match); list of 30 teams one-hot encoded.
- Access: dataset unnamed (generic "open source ODIs dataset"); code at https://github.com/ruc98/American_Express_Ignite_2019_Challenge (stated in paper, not verified by this worker).

## 3. Method / model
- Three-block network: (1) Input Transformation (IT) block — per-ball feature vector mapped to a higher-dimensional vector, shared across all balls in the innings; (2) LSTM block — standard recurrent cell, current cell's weights influenced by same-timestamp input features and previous-timestamp output features; (3) Output Transformation (OT) block — LSTM output mapped to a 2-dim vector (win/lose node); softmax gives win probability of the match. Final output compared to win/lose ground truth with Binary Cross Entropy loss aggregated over all balls of the innings; mean loss trains the network.
- Four architecture variants: Model A — all overs input, single output (one prediction at end; separate models needed per ball); Model B — all overs input, multi-output (output node at every timestamp, one model predicts at every ball); Model C — randomly sampled input, single output (training examples = every prefix of every match, i.e., up to 1000×300 records each labeled W/L); Model D — cumulative-sum ball features as input, single output (learns cumulative runs vs target).
- Model B selected as best (converges in 100 epochs, faster than the others).
- Separate pre-match classification using match-level statistics (venue, weather, pitch, etc.) with AdaBoost and LGBM (gradient-boosted decision trees).

## 4. Equations & assumptions
No equations stated in the paper — the softmax output, binary cross-entropy loss, and LSTM cell internals are described only in prose (LSTM gating equations never written out). Stated assumptions: (a) ball-by-ball cricket data is a valid temporal sequence for recurrent modeling; (b) the win/lose label assigned to every ball is the final match winner; (c) IT-block transformation is shared across all balls of an innings; (d) the final 2-dim output + softmax is a calibrated probability of the batting team winning; (e) mean BCE across all balls is the right training objective; (f) pre-match match-level statistics (venue, toss, weather) carry predictive signal about team strength; (g) one-hot encoding of player/team names generalizes across eras (1971–2020 dataset).

## 5. Features / target
- Input features per ball: innings number, over.ball, batting team, batsman name, non-striker name, bowler name, runs off bat, extras, wicket flag (one-hot for names, raw continuous values otherwise).
- Target: binary win/lose of the batting team at each timestamp (ground truth = final match winner). Prediction horizon: every ball of the match (300 outputs per innings).
- Ablation augmentations: (i) LGBM pre-match classification result appended to the first ball's input features; (ii) target score from the first innings appended to every ball's input; (iii) wickets fallen in the first innings appended. Best model uses all three.

## 6. Validation design
- Train/test accuracy reported at selected timestamps J (number of balls bowled: J=300/250/200 in the architecture comparison; J=300/240/180/120/90/60/30/6 for the final model). Accuracy = fraction of matches whose win/lose is predicted correctly at that ball.
- Baselines: the three other LSTM variants (internal comparison); pre-match classifiers AdaBoost vs LGBM; the prior closest work (Jhawar et al. 2017, separate per-over Random Forest models, 75.68% average accuracy across overs).
- Split ratios/dates: not stated in paper. No mention of time-ordered splitting or cross-validation. Metric is raw accuracy only — no log loss, Brier score, AUC, or calibration reported. Train vs test accuracy both reported (test slightly exceeds train at several points, suggesting a small/odd test split).

## 7. Numerical results / baselines
From Table II (test accuracy %, J=300/250/200): Model A 93.7/63.5/57.2; Model B 95.7/75.1/66.4; Model C 79.6/66.7/59.2; Model D 60.8/52.6/52.6. Model B converges in 100 epochs.
From Table III (pre-match classification): AdaBoost — train 61.0%, test 47.2%; LGBM — train 76.3%, test 61.3%.
From Table IV (ablation on Model B, test accuracy %, J=300/250/200): baseline 95.7/75.1/66.4; +pre-match result 96.3/77.6/68.2 (~+2% avg); +target score 98.0/90.1/87.1 (~+13% avg); +wickets fallen 98.4/92.5/88.2 (~+2% further).
From Table V (best model, train/test accuracy %): 300 balls 98.3/98.4; 240 (40 overs) 91.0/92.1; 180 (30 overs) 88.7/88.0; 120 (20 overs) 85.2/87.3; 90 (15 overs) 80.4/85.6; 60 (10 overs) 78.1/82.7; 30 (5 overs) 70.2/72.4; 6 (1 over) 62.3/62.7.
Claimed achievements: 82.7% correct from the 10th over, 87.3% at 20th over, 88.0% at 30 overs, 98.4% at match end. Authors note the model "fails to capture" the trivial end-of-match result that the score deterministically decides the winner, blaming abandoned matches (Duckworth-Lewis decisions), ties, and rain-affected games.

## 8. Code / data availability
Code stated as available at https://github.com/ruc98/American_Express_Ignite_2019_Challenge (not verified by this worker — no network access). Dataset identified only as an "open source ODIs dataset" (no URL). No data link stated.

## 9. Leakage & limitations
- Test/train split methodology entirely unstated: unknown whether matches were split time-ordered or randomly, unknown sample sizes. Test accuracy exceeding train accuracy at multiple checkpoints is a red flag for a tiny or non-representative test set.
- Label construction is essentially deterministic: target score + cumulative runs largely determine the outcome, so late-match "accuracy" measures the model's ability to do arithmetic, not predict — the authors themselves note it should trivially be 100% at J=300. Early-ball accuracy (62–82%) is the only real signal.
- One-hot encoding of ~hundreds of player names across 1971–2020 eras with no temporal handling risks the network memorizing player-identity → win correlations (player-name leakage); modern eras would need unseen players mapped to rare-name bins.
- No calibration, Brier score, or log loss reported — raw accuracy cannot support betting or pricing decisions. No odds/market baseline comparison (does it beat the close?).
- Hyperparameters (LSTM units, learning rate, optimizer, batch size, regularization) unstated; only "converges in 100 epochs" given. Not reproducible from the paper alone (code link helps, if live).
- External validity: cricket's discrete ball-by-ball, fixed-resource (balls/wickets) structure does not map cleanly to NFL play-by-play (clock, field position, down/distance, variable game state). Transferable insight is the architecture pattern (per-timestep output heads), not the features.
- The 1971–2020 ODI dataset spans radically different scoring eras (pre/post T20 influence); no era normalization described.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. GSE covers in-game win probability via iWinRNFL (1704.00197, Drive 58-paper dossiers) — pre/post-snap WP. The existing map's gap list item 7 flags exactly this: "In-play / live NFL spread & total modeling — iWinRNFL covers in-game WP; live spread/total probability surfaces are thin." This paper is therefore an EXTENSION, not a duplicate: same problem family (in-play probability), but per-timestep recurrent architecture with a score-differential conditioning ablation that GSE has not tested. No existing GSE file implements LSTM per-snap live spread/total surfaces. The NFL live spread/total surface is the relevant analog of the paper's ball-by-ball outputs.

## 11. GSE implementation spec
- Data: nflverse play-by-play (2000–2025) as the ball-by-ball analog; per-play features: score differential, time remaining, down/distance/yardline, timeouts, pre-game spread (target-score analog), pre-play WP (from GSE's existing WP model). Target surfaces: live spread P(home cover) and total P(over) at each play.
- Model: replicate the winning pattern — per-timestep output heads trained on full game sequences with shared input embedding + recurrent core. Use LSTM first for parity, then GRU/Transformer for comparison; loss = mean BCE over all plays of game with the final spread/total outcome as label at every timestep.
- Score-differential conditioning is the direct analog of the paper's +13% ablation: append pre-game spread/total (de-vigged) to every play input — expect this to be the dominant feature; ablate it explicitly.
- Training protocol: season-ordered walk-forward (train ≤2019, validate 2020–2022, test 2023–2025), 100 epochs as starting point, tune hidden size/learning rate.
- Serving: per-play inference inside the live-data pipeline; latency target <1s per play.
- Estimated effort: ~3–5 days for LSTM parity build + ablation; ~2 weeks with Transformer comparison and calibration (Brier/log loss, not just accuracy).

## 12. Reproducible test
Dataset: nflverse play-by-play 2000–2025, filtered to regular season + playoffs (exclude preseason). Metric: Brier score (and accuracy for parity with paper) of live spread P(home covers de-vigged closing spread) evaluated at end of each quarter and at 60/120/180 plays elapsed. Baseline to beat: the paper-analog — a per-quarter logistic regression on score differential + time remaining (the "Model A-like" baseline), plus GSE's existing pre-game probability as the "no-update" floor. Time window: walk-forward test on 2023–2025 seasons.

## 13. Acceptance / rejection gate
ADOPT (proceed to productionization) if the all-outputs recurrent model beats the per-quarter logistic baseline by ≥0.01 Brier score AND ≥3 percentage points accuracy at the half-time checkpoint across the 2023–2025 test window; REJECT otherwise (the ablation value of per-timestep outputs is the claim to validate; if score differential + a simple baseline closes the gap, skip the LSTM).

## 14. Improvement experiment
Replace the accuracy objective with a calibrated probabilistic objective: train Model-B-style heads with proper log loss plus a post-hoc temperature-scaling calibration per game-state bucket (quarter × score-differential bin), and add a market-aware variant that conditions on the live odds stream as an input feature — testing whether the odds-implied live probability subsumes the learned recurrent signal (if yes, the edge is in market microstructure, not in sequence modeling; if no, the residual is a genuine modeling edge). This goes beyond the paper, which reports only accuracy and ignores the market entirely.
