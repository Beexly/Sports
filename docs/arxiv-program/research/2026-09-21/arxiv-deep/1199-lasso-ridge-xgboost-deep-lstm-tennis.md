# [1199] Lasso–Ridge-based XGBoost and Deep_LSTM Help Tennis Players Perform better (arXiv:2405.07030v1)

**Citation:** Zhai, W. K., & Wang, Y. H. (2024). *Lasso–Ridge-based XGBoost and Deep_LSTM Help Tennis Players Perform better*. arXiv:2405.07030v1. URL: https://arxiv.org/abs/2405.07030
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, complete).
**Verdict:** REJECT — student-style tennis-momentum paper on a single-match-centered dataset with no code/data, standard XGBoost/LSTM/MAML machinery, and no mechanism transferring to NFL prediction, calibration, or sizing.

## 1. Research question
Can "momentum" (strategic vs psychological) in tennis be quantified and used to predict match outcomes and within-match fluctuations? Three sub-tasks: (1) sliding-window player performance scoring (WINJUD); (2) momentum-augmented XGBoost for winner prediction; (3) "Derivative of Balanced Winning Percentage" (DBWP) fluctuation prediction with a dual-network Deep_LSTM; (4) MAML meta-learning transfer across Wimbledon matches and to table tennis. (Sec. 1.3)

## 2. Dataset / schema
- Primary: 2023 Wimbledon men's final (Alcaraz vs Djokovic, match 1701) point-by-point data; plus a handful of other Wimbledon matches (IDs 1301–1316, 1401–1408, 1501–1504, 1601/1602, 1701) referenced by ID only, no sizes/rows stated. Table 3 evaluates 5 matches (1302, 1304, 1314, 1401, 1701).
- Columns referenced: point_victor, server, elapsed_time, p1/p2_sets, p1/p2_games, running distance, hit counts, ball speed. Provenance of the dataset not stated (appears to be a math-modeling-competition dataset).
- Table-tennis test: authors hand-recorded the 2020 Tokyo Olympics men's singles final (Fan Zhendong vs Ma Long) "frame by frame" — tiny, hand-built, unverifiable.

## 3. Method / model
- **WINJUD:** sliding-window point-victor counts + serve-decay factor β (Algorithm 1); heat-map visualization of performance by time.
- **Strategic momentum:** multiplicative updates ×(1.5^n) at set level, ×(1.2^n) at game level for score differentials (Algorithm 2).
- **Psychological momentum:** streak counters mapped through the Fibonacci sequence, plus ace/double-fault/unforced-error bonuses with "extensively experimented" (unstated) parameters (Algorithm 3).
- **Lasso–Ridge XGBoost:** XGBoost with elastic-net regularization (eqs. 1–6, standard Taylor-expanded objective); grid search over λ (l) and mix ratio r; 80/20 train/test, 80/20 inner validation; 6 features (two momentums, server, distances, hits, ball speed).
- **DBWP:** derivative of linearly-interpolated before/after win-rate windows w.r.t. time (Algorithm 4), used as regression label.
- **Deep_LSTM:** two parallel networks (dense with L2+Huber loss, dropout, SELU, Adam; LSTM branch), summed outputs.
- **MAML:** 28 matches as support set, 3 as query (1601, 1602, 1701); inner 3 epochs MSE, outer Huber; fine-tune 5 epochs (Table 5 hyperparameters).

## 4. Equations & assumptions
- XGBoost objective: Ŷ^(t) = Σ l(y_i, ŷ_i^(t)) + Ω(f_t) (1); squared loss with sample weights (2); elastic-net Ω(f_t) = λ₁r‖w‖₁ + λ(1−r)/2 ‖w‖₂² (3); Taylor expansion L^(t) = Σ[g_i f_t(x_i) + ½h_i f_t²(x_i)] + Ω(f_t) (6). (Standard Chen & Guestrin 2016.)
- Hybrid loss ℓ(y,f(x)) piecewise: ½(y−f)² + ½(y−f)² if |y−f| ≤ δ (garbled in PDF extraction); second branch combines |·|δ − δ²/2 + (y−f)². (Sec. 5.2 — notation inconsistent in the paper.)
- Assumptions: momentum factorizes into strategic × psychological; Fibonacci streak weighting "reasonable"; 1.5/1.2 multiplicative bases and streak bonuses chosen by undisclosed tuning; MAML task distribution valid across heterogeneous matches.

## 5. Features / target
- Inputs: 6 features — strategic momentum, psychological momentum, server indicator, player running distances, hit counts, ball speed.
- Targets: (a) point/game winner (binary); (b) DBWP fluctuation score (regression).

## 6. Validation design
- XGBoost: 80/20 train/test split on pooled match data; 4 ablation settings (no momentum / psychological only / strategic only / both); 5 matches reported (Table 3). No time-ordering, no cross-validation folds stated, no external baseline (e.g., Elo or market odds).
- Deep_LSTM: 10 repetitions averaged; MSE on 3 matches (Table 4); ablation removing momentum vs server features.
- MAML: support/query split as above; MSE compared loosely to Task 3; authors admit "results indicate a comparative performance decline."

## 7. Numerical results / baselines
- Abstract claims "accuracy of 94%"; Table 3 per-match accuracies with both momentums: 1302: 0.780489; 1304: 0.897059; 1314: 0.837838; 1401: 0.844444; 1701: 0.776119 — i.e., 78–90%, none 94%. Psychological-only best in 4 of 5 (e.g., 1302: 0.8536585; 1314: 0.9152354).
- Deep_LSTM MSE: 0.03529891–0.05927794 across 3 matches (Table 4); ablation: removing momentum raises MSE to ~0.055–0.058, removing server to ~0.060.
- MAML: "meta-learning results are close to the previous Deep_LSTM" — no numeric table; table-tennis transfer declined (no numbers given).
- No baselines vs Elo, bookmaker odds, or naive serve-advantage models.

## 8. Code / data availability
None stated. Dataset IDs suggest a competition dataset, not linked.

## 9. Leakage & limitations
- "Accuracy" is never defined precisely (winner prediction vs point prediction ambiguous); abstract's 94% unsupported by any table.
- Single-final-centric dataset; test matches drawn from the same tournament pool as training (no true out-of-distribution test); momentum features computed from the same point outcomes being predicted — target-adjacent features (e.g., win-rate windows around time t used to predict the winner at t).
- Hand-recorded table-tennis data unverifiable; MAML transfer results purely qualitative ("decline" with no numbers).
- Adversarial: tennis momentum has no analog in NFL (no serve alternation, no set/game hierarchy); none of the feature engineering transfers.

## 10. GSE overlap
None — GSE's corpus is NFL team/player efficiency and market microstructure; tennis point-momentum is a different sport and problem class. XGBoost/LSTM/meta-learning are already in the ML research brief; nothing new methodologically.

## 11. GSE implementation spec
None — no NFL-applicable build.

## 12. Reproducible test
N/A — no GSE surface; dataset unavailable.

## 13. Acceptance / rejection gate
Reject — see verdict.

## 14. Improvement experiment
None warranted; if the "momentum derivative as turning-point detector" idea were ever revisited, the NFL analog would be live win-probability derivatives from market odds — a different paper, not this one.
