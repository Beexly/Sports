# [0237] Performance Prediction in Major League Baseball by Long Short-Term Memory Networks (arXiv:2206.09654v1)

**Citation:** Sun, H.-C., Lin, T.-Y., Tsai, Y.-L. *Performance Prediction in Major League Baseball by Long Short-Term Memory Networks*. arXiv:2206.09654v1. URL: https://arxiv.org/abs/2206.09654
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,572 lines, complete including references).
**Verdict:** ADAPT — port the 5-season moving-window sequence architecture and the elite-underestimation bias analysis to GSE's NFL season-long player-total projections (passing/rushing/receiving yards, TDs); the baseball models don't transfer.

## 1. Research question
Can LSTM networks predict MLB players' next-season home run totals from their past 5 seasons of statistics better than traditional ML models and the industry-standard ZiPS projection system?

## 2. Dataset / schema
- 5,401 MLB players, 1961–2019, from Baseball-Reference.com; 21 features per player-year (Table 1): Age, Height, Weight, Season, HR, Hits, Games, BB, SO, Runs, Doubles, Triples, SB, Caught Stealing, RBI, Sac Flies, Sac Hits, IBB, GIDP, HBP, Plate Appearances.
- Players with <50 PA and 0 HR excluded.
- Moving-window design: each datapoint = ({x_t}_{t=j}^{j+4}, y_{j+5}), x ∈ R²¹, y ∈ {0..74}, 1961 ≤ j ≤ 2014.
- 9,828 training points (1961–2017), 184 test (2018), 191 test (2019); when predicting 2019, 2018 points added to training and model retrained (expanding window).
- ZiPS predictions: 449 (2018), 485 (2019) — larger sample than the paper's test set.

## 3. Method / model
- Five LSTM architectures (A–E): stacked LSTM layers (32–128 cells, ≤3 layers) → dropout/batch-norm → timestep-wise dimension reduction (model D) → FC layers (512→64) → single ReLU output neuron. Param counts 64,737–865,793.
- Also tested: GRU (2×64), BiLSTM (2×64 bidir), AT-LSTM (attention between BiLSTM and LSTM).
- Baselines: linear regression, SVM, random forest (200 trees), 3-layer NN (1024-512-128), ZiPS.
- Training: 1000 epochs, lr 10⁻³, MSE loss, Adam optimizer.
- Hyperparameter finding: LSTM cells >128 or >3 layers → overfit; 2 FC layers sufficient.

## 4. Equations & assumptions
- Vanilla RNN: h_t = tanh(W_h·h_{t−1} + W_x·x_t + b).
- LSTM gates (Eqs. 1–6): f_t = σ(W_hf h_{t−1} + W_xf x_t + b_f); i_t = σ(W_hi h_{t−1} + W_xi x_t + b_i); o_t = σ(W_ho h_{t−1} + W_xo x_t + b_o); C̃_t = tanh(W_hc h_{t−1} + W_xc x_t + b_c); C_t = f_t·C_{t−1} + i_t·C̃_t; h_t = o_t·tanh(C_t).
- Metrics: RMSE(θ) = √(Σ(y_i − f_θ(x_i))²/k) (Eq. 7); MAE(θ) = Σ|y_i − f_θ(x_i)|/k (Eq. 8).
Stated assumptions: players' height/weight constant over career (data limitation); 5-year window captures career trajectory; MSE is the right loss for count data; 2018-retraining for 2019 is legitimate (no leakage since strictly past data).

## 5. Features / target
- Features: 21 per-year stats + body info over 5 consecutive seasons.
- Target: next-season home run count (non-negative integer).
- Horizon: one season ahead.

## 6. Validation design
- Train 1961–2017 → test 2018; retrain through 2018 → test 2019 (time-ordered, good).
- Metrics: MAE, RMSE; accuracy rate within difference intervals (exact, ±1, ±3, ±5, ±10); per-class (0–9, 10–19, 20–29, 30–39, 40+) correct counts at ±1, ±3, >10; over/under-estimation counts.
- No cross-validation; no significance tests; ZiPS evaluated on a larger sample (449/485 vs 184/191) — not strictly comparable samples.

## 7. Numerical results / baselines
- 2018 (Table 4): LSTM E best MAE 5.176; LR best RMSE 6.587 (LSTM E 6.908, close); ZiPS MAE 6.704/RMSE 8.27; RF 7.332/9.404; NN worst 13.293/16.537.
- 2019: LSTM C best MAE 6.138/RMSE 8.269; four of five LSTMs beat all baselines; ZiPS 6.737/9.381; LR 6.703/8.931.
- Small-interval accuracy: LSTMs ~10%+ exact, ~20% within ±1 (LSTM B 2019: 30.94% within ±1); ZiPS/LR only competitive at ±3 and above.
- Class analysis: predictions concentrate <30 HR; no method correctly predicts 40+ HR players (Tables 7–8); LSTM conservative on elites (Table 14: e.g., Khris Davis GT 48 → LSTM predictions 21–27).
- Bias asymmetry (Tables 15–16): 2018 — LSTM models underestimate 75–97 vs overestimate 65–86; ZiPS overestimates 343 vs underestimates 92; NN underestimates 179, overestimates 0. Paper's conclusion: SVM/ZiPS give the "maximum power" (upper bound), LSTM/RF give the lower bound for elite players.
- Architecture: fewer cells better (C/E beat A/D); dropout ≈ batch-norm as regularizers; timestep-wise dimension reduction helps; GRU/BiLSTM/AT-LSTM land between ML baselines and LSTMs.

## 8. Code / data availability
No code link stated. Data: Baseball-Reference.com (public). ZiPS via FanGraphs.

## 9. Leakage & limitations
- ZiPS comparison is on different (larger) samples — 449/485 ZiPS predictions vs 184/191 test points; accuracy comparisons are not apples-to-apples.
- Height/weight held constant over careers (admitted).
- No advanced stats (hard-hit rate, BABIP) — admitted.
- 1000 epochs with no early-stopping description — overfitting risk managed only by architecture search.
- No uncertainty quantification; point predictions only.
- 2019 retraining protocol means 2018 and 2019 results come from different models.
- Elite-player failure is structural: no method predicts 40+ HR; the paper's "upper/lower bound" framing is post-hoc.
- Test sets are tiny (184/191 points).

## 10. GSE overlap
Per existing-research-map.md: GSE has extensive player-projection and season-total work (EPA-based projections, regression models), and some deep-learning coverage, but a *5-season moving-window LSTM for season-long player totals* with the *small-interval accuracy* evaluation and the *elite-bias asymmetry* (conservative on elites) analysis is not formalized in the corpus. This is an **extension**: (a) sequence-architecture season-total projections for NFL (passing yards, rushing yards, receiving yards, TDs) as an alternative to GSE's regression baselines; (b) the bias-asymmetry diagnostic as a standard check on all GSE season-long projections (do our models systematically underestimate elite seasons?); (c) accuracy-within-±k evaluation for season totals, which is more decision-relevant for futures/award markets than RMSE alone.

## 11. GSE implementation spec
- Build NFL season-total projection models: input = 5 prior seasons × ~20 features (age, games, attempts/targets, yards, TDs, EPA/play, team context, injuries); architecture = stacked LSTM (≤3 layers, ≤128 cells) → FC → ReLU output; train with MSE/Adam; expanding-window retraining (retrain through year T−1 to predict T).
- Evaluate with the paper's full scorecard: MAE/RMSE + accuracy within ±k + per-tier (elite/starter/replacement) correct counts + over/under-estimation asymmetry.
- Use the bias-asymmetry diagnostic on GSE's existing projections: if GSE's models systematically underestimate elite QB/RB/WR seasons (like the paper's LSTMs), apply an elite-tier calibration or ensemble with an aggressive model (the paper's "SVM/ZiPS upper bound" role) for award/futures markets.
- Effort: 2 engineer-weeks (nflverse seasonal data → LSTM pipeline + evaluation harness).

## 12. Reproducible test
Dataset: nflverse 2000–2024 seasonal player stats. Predict 2023 and 2024 season totals (passing yards, rushing yards, receiving yards) with 5-season LSTM windows vs GSE's current regression baseline. Metrics: MAE/RMSE + accuracy within ±100/±250 yards + elite-tier (top-10) bias check. Baseline: LSTM must beat the regression baseline on MAE and show the paper's small-interval accuracy advantage to justify the complexity.

## 13. Acceptance / rejection gate
Accept the LSTM architecture if it beats GSE's regression baseline on 2023–2024 holdouts by ≥3% MAE on at least two of three yardage categories AND the elite-bias diagnostic reveals a correctable asymmetry (otherwise it's complexity without insight). Reject if the LSTM merely matches regression (the paper's own 2018 result: LR essentially tied the LSTMs) — the paper's headline 2019 win may be sample luck on n=191. Also reject the ReLU-output/MSE setup if predicted totals show the same pathological conservatism on elites without a usable upper-bound ensemble partner.

## 14. Improvement experiment
Beyond the paper: (a) the paper's post-hoc "LSTM = lower bound, ZiPS = upper bound" suggests a deliberate two-model ensemble: train one conservative (MSE) and one aggressive (asymmetric loss penalizing underestimation) LSTM and use the interval for futures pricing — the paper never builds this; (b) add the missing advanced stats (for NFL: EPA/play, air yards, target share trends) that the paper lacked — test whether they fix the elite-prediction failure; (c) replace the paper's fixed 5-year window with an attention-based variable window (their AT-LSTM was under-tuned) so the model can learn how far back matters by position and age — directly addresses their "each stat needs its own model" hypothesis.
