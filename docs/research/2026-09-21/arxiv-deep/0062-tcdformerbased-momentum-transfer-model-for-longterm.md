# [0062] TCDformer-based Momentum Transfer Model for Long-term Sports Prediction (arXiv:2409.10176v1)

**Citation:** Hui Liu, Jiacheng Gu, Xiyuan Huang, Junjie Shi, Tongtong Feng, Ning He (2024). *TCDformer-based Momentum Transfer Model for Long-term Sports Prediction*. arXiv:2409.10176v1. URL: https://arxiv.org/abs/2409.10176v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 1408 lines).
**Verdict:** REJECT — tennis-only momentum model with garbled equations, a random (non-time-ordered) train/test split, and a "momentum transfer" premise Garrett's own lab already tested and rejected.

## 1. Research question
Can "momentum" — encoded as change points in large-scale unstructured time series via wavelet-based Local Linear Scaling Approximation (LLSA) and transferred as trend/seasonal decomposition through a TCDformer-derived architecture — be used to predict long-horizon multilevel (point→set→game) tennis match outcomes? The paper builds TM² (TCDformer-based Momentum Transfer Model) and tests it against standard ML baselines and two published sports-event models.

## 2. Dataset / schema
- Source: 2023 Wimbledon men's singles tournament, obtained via the **2023 International Mathematical Modeling Competition**, cross-referenced with the official Wimbledon website (paper §IV.A, "Datasets").
- Size: **7,285 rows × 49 columns = 356,965 data points**, reduced by dimensionality reduction to **18 retained features**.
- Retained features (Table III): elapsed_time, p1_sets, p2_sets, p1_games, p2_games, server, point_victor, p1/p2 aces, p1/p2 double faults, p1/p2 break_pt_missed, p1/p2 break_pt_won, p1/p2 distance run, psychological factor. Each recorded separately per player at each point ("key moments of each match").
- Access: not a public URL; the source is the 2023 MCM/ICM competition dataset. Proprietary/unreplicable in practice.

## 3. Method / model
1. **Momentum encoding module (LLSA):** apply MODWT (Maximal Overlap Discrete Wavelet Transform) to the T×D time series X; detect "jumps" (change points) via argmax of |W_{j,t}| with sign-change analysis of wavelet coefficient vectors, boundary estimation (eq. 3–4), iterative k-th-jump detection excluding prior jump regions (eq. 5), reduced-scale detection (eq. 6), and inverse MODWT reconstruction of jump-containing coefficients (signal reconstruction X).
2. **Momentum transfer / prediction module:** player momentum M_y(t) computed from AHP-weighted (analytic hierarchy process) feature weights (Table II pairwise pressure values m_{i,j} between players, e.g., Alcaraz–Zverev 4.78/0.21).
3. Decompose reconstructed series into trend x_t (multi-scale averaging filters with adaptive weights, eq. 10) and seasonal x_s = M_y − x_t.
4. Trend: 3-layer MLP with RevIN normalization before/after (eq. 11). Seasonal: wavelet attention (eq. 12). Final: P(t+1) = x_t(t+1) + x_s(t+1) (eq. 13). Match winner = argmax of total momentum (eq. 14; historical rankings used as tiebreaker on ties).
- Prediction sequence length tuned to 400 (Fig. 4; model trained 10× per length to mitigate outliers). Hyperparameters beyond that: not stated.

## 4. Equations & assumptions
**Note:** PDF extraction of several equations is garbled; the reconstructions below are my best reading and should be treated as UNCERTAIN — see equation uncertainties in the report. Faithful verbatim fragments are quoted where the extraction is clean.

- (1) l_j = arg max_t (‖W_{j,t}‖); with l_{j,min} = min{t | t ∈ sup(W_j)}, l_{j,max} = max{t | t ∈ sup(W_j)} — MODWT change-point location.
- (3) α = max{ l ∈ [1, l−1] | ... ≥ n_α } (boundary left of jump; extraction garbled).
- (4) β = min{ l ∈ [l+1, T] | ... ≥ n_β } (boundary right of jump; extraction garbled).
- (5) l_k = arg max_t (‖W_{J,t}‖ | t ∉ ∪_{1≤i≤k} Ω_i) — k-th jump position excluding prior jump regions.
- (6) l_{j,k} = arg max_t (‖W_{j,t}‖ | t ∈ Ω_{j+1,k}) — reduced-scale jump detection.
- (7) δ_z(t) = d · g_z · log(r_t)/k — weighted value of the z-th metric at time t; d = limiting factor ("growth constraint"), g_z = AHP relative importance, r_t = original metric value, k = gap between same-type data. **Garbled in PDF** — the division form is my reconstruction.
- (8) δ̄_z(t) = d · ḡ_z · log(r_t)/k — opponent-pair influence weight; same garbling caveat.
- (9) M_y(t) = m_{i,j} · Σ_z [δ_z(t)·X_{i,z}(t) − δ̄_z(t)·X_{j,z}(t)] — player y momentum; m_{i,j} = pairwise pressure value (Table II); X reconstructed by LLSA/MODWT. **Reconstruction uncertain** (summation index and bar notation inferred).
- (10) x_t = σ(w(x) ∗ f_2(x)) — trend component; σ = softmax, w(x) = adaptive average-filter weights, f_2(x) = averaging filter.
- (11) x_t = RevIN(MLP(RevIN(x_t))) — 3-layer MLP trend predictor with RevIN.
- (12) Y(q,k,v) = W softmax( W(q)W(k)W(v) ) v = qkᵀ — wavelet attention. **Garbled; uncertain.**
- (13) P(t+1) = x_t(t+1) + x_s(t+1) — total momentum forecast.
- (14) η_{t_{n+1}} = i if P_i(t_{n+1}) > P_j(t_{n+1}); "or" if equal; j if less — winner = higher total momentum; ties broken by historical rankings.
**Assumptions:** momentum change points correspond to external-event-driven fluctuations (not noise); AHP-derived importance weights and the pairwise "pressure" matrix are valid momentum ingredients; historical rankings are an acceptable tiebreaker; momentum is the causal driver of point/set/game outcomes.

## 5. Features / target
- Inputs: the 18 retained point-level tennis features above (Table III), per-player time series of length T.
- Target: continuous momentum trajectory M_y(t) (MSE/MAE evaluated on it) and the match winner via argmax total momentum. Prediction horizon: next time step P(t+1), aggregated to match outcome (point→set→game multilevel).

## 6. Validation design
- **80% random train / 20% random test — NOT time-ordered** (paper: "80% of the data was randomly selected as the training set, while the remaining 20% was used for testing"). Each experiment repeated 100 times, averages reported.
- Baselines: ELO, Decision Tree, Logistic Regression, SVM, Random Forest; plus DMA-Nets (Ji 2021) and Seq2Event (Simpson 2022) for MSE/MAE comparison.
- Metrics: MSE, MAE (primary), Accuracy, Precision, F1-score. No stated time-ordered backtest, no confidence intervals, no out-of-tournament test.

## 7. Numerical results / baselines
- Table IV (Wimbledon 2023, averaged over 100 runs): MAE/MSE/Accuracy/Precision/F1 — ELO 0.4859/0.4859/0.5141/0.2643/0.3491; DT 0.2644/0.2644/0.7395/0.7397/0.7396; LR 0.2126/0.2126/0.7874/0.7824/0.7871; SVM 0.2195/0.2195/0.7805/0.7831/0.7804; RF 0.2249/0.2249/0.7751/0.7752/0.7751; **TM² 0.0389/0.0671/0.9237/0.9231/0.9206**.
- Abstract/conclusion claim: "reducing MSE by 61.64% and MAE by 63.64%" versus existing sports prediction models. **Note:** I could not reproduce 61.64%/63.64% from Table IV's numbers (TM² vs best baseline LR: (0.2126−0.0671)/0.2126 = 68.4% MSE; (0.2126−0.0389)/0.2126 = 81.7% MAE); the paper does not state which comparison yields the claimed percentages. Quote as paper claim only.
- Table V (vs advanced models): MSE — DMA-Nets 16.8732, Seq2Event 1.7476, TM² 0.0671; MAE — DMA-Nets 10.6371, Seq2Event 1.2734, TM² 0.0389. (Scale differs sharply from Table IV; treat as paper-reported only.)
- The paper itself admits DMA-Nets and Seq2Event slightly outperform TM² on some metrics, attributing this to its change-point removal discarding informative points (removed sudden-variation points may carry valuable info, e.g., a sudden loss after a winning streak).

## 8. Code / data availability
None stated. Dataset source: 2023 MCM/ICM competition + official Wimbledon site (no URL given).

## 9. Leakage & limitations
- **Random 80/20 split of point-level data within one tournament = severe leakage risk**: points from the same match appear on both sides of the split; the model effectively sees the future of the same matches it predicts. This alone invalidates the 92% accuracy as a forecasting result.
- Single tournament (2023 Wimbledon, one surface, one sex, ~7k rows) — no external validity to NFL or even to other tennis events.
- Garbled/unstated hyperparameters; unreplicable dataset; no code.
- Admits its own jump-removal destroys informative change points.
- **External validity to NFL: none.** Tennis is a dyadic, non-interactive-scoring sport; the entire premise is "psychological momentum," which Garrett's MOVE-37 lane tested (Koopman/DMD momentum) and **REJECTED (p=0.89)**.

## 10. GSE overlap
- Existing map: state-space/dynamics lane covers Kalman/particle filters, nested AR(1) team strength (1701.05976), GPs, TFTs — Garrett's accepted dynamics toolbox. Momentum-as-change-points is covered-and-rejected: MOVE-37 GLI-0.1/WPA² leverage claim falsified; Koopman/DMD momentum rejected (p=0.89, AR(1) beats DMD). This paper's core premise sits in Garrett's rejected lane.
- Wavelet attention / MODWT time-series machinery is not in Garrett's corpus, but nothing in the paper demonstrates it beats honest time-ordered evaluation — the headline numbers come from a leaky split.
- Batch sibling 0067 (MLFEF, 2402.12149) is also a momentum paper; evaluate independently.

## 11. GSE implementation spec
Not recommended (REJECT). If revisited: the only salvageable component is wavelet-attention seasonal decomposition for long-horizon forecasting of team-level time series — but it would need to be built from scratch with proper time-ordered splits, since the paper's formulation is unreplicable from the PDF.

## 12. Reproducible test
Skipped — REJECT. No valid test is possible on NFL data from this paper: features are tennis point-level, the split protocol is invalid, and the momentum premise is already falsified in Garrett's lab.

## 13. Acceptance / rejection gate
REJECT: (a) non-NFL sport, (b) momentum premise already lab-rejected, (c) non-replicable data + garbled equations, (d) leaky random split invalidates all headline numbers.

## 14. Improvement experiment
If the momentum lane were not already closed: rerun TM²'s exact pipeline with strictly time-ordered splits (train on early tournament rounds, test on later rounds; test on a different slam) and compare against a plain Elo + logistic baseline. Expected outcome per Garrett's lab: the 92% accuracy collapses to near-baseline, confirming the leak.
