# [0646] Convolutional Attention in Betting Exchange Markets (arXiv:2510.16008)

**Citation:** Rui Gonçalves, Vitor Miguel Ribeiro, Roman Chertovskih, António Pedro Aguiar (2025). *Convolutional Attention in Betting Exchange Markets*. arXiv:2510.16008v1. URL: https://arxiv.org/abs/2510.16008
**Ledger completed:** 2026-09-21. **Read:** full text (canonical PDF https://arxiv.org/pdf/2510.16008, recovered because cached file was an abstract stub).
**Verdict:** ADAPT — short-term price-move forecasting from market-depth multivariate time series transfers to NFL line-move prediction (pre-close odds movement direction from order-flow features), not to outcome prediction. Novel convolutional attention + roll padding are reusable architectural ideas for any GSE time-series model.

## 1. Research question
Can deep-learning models forecast short-term price movements (in ticks) on a betting exchange using market-depth (level 2) data, inside a fully automated trading system with scalping/swing/trailing-stop execution? Contributions: (a) convolutional multi-head attention applied to MTS, (b) a novel "roll padding" method for multivariate time series, (c) an end-to-end feature-engineering → training → production trading framework (JBet2).

## 2. Dataset / schema
- Betfair UK To-Win Horse Racing, pre-live 10-minute window, collected in real time at 2 frames/sec, 2014-09-01 to 2016-08-29: 14,421 races (15–30 races/day, 3–25 runners/race).
- Task: predict the integral of tick variation in the FINAL 2 minutes before race start using ~4.5 minutes of preceding data (512 raw data frames → 128 time steps of 4 frames; no sliding-window overlap; each race = one example).
- 9 engineered indicators: integral of price change (runner, competitor), liquidity variation ask/bid side, volume variation+direction, price variation from sequence start (runner, competitor), Weight of Money (WoM) of runner, WoM of all other runners combined. WoM = Amounts Bid / (Amounts Bid − Amounts Ask) (Eq. 6 — as printed).
- Rule-based market-regime decision tree (favorite? × runners × price × liquidity → 54 categories); only 9 categories had ≥1,200 examples to train from scratch.
- Outlier truncation (Deboeck 1994): truncate 10% of each histogram tail, normalize to [−1,1]. Output discretized into 5 equal-frequency classes (strong down / weak down / neutral / weak up / strong up, ~20% each) → classification.

## 3. Method / model
Architectures compared: LeNet-style 2D CNN (Conv2D(20,K=(16,5)), Conv2D(50,K=(16,5)), Dense(400), Dense(150), Dense(5,softmax)); stacked bidirectional LSTMs (100, 50, 20 units + softmax); ConvLSTM2D; WaveNet2D — each with attention variants:
- Standard soft attention: c_i = Σ_i α_i h_i, α_i = softmax(x_i^l) (Eqs. 8–9), applied before ("attention before") or after ("attention after") the LSTM with permute ops.
- Novel multi-head convolutional attention: split MTS into per-variable time series; 1D conv per path (softmax activation, last layer 1 channel → TimeSteps vector per variable); concatenate → TimeSteps × Variables attention map, multiply by h. Multi-channel stacked convs before the final 1-channel softmax layer capture multi-scale local patterns.
- Novel roll padding (extension of wrap padding): pad the VARIABLES dimension by copying from opposite sides (cylinder, not torus); time-step dimension stays valid. For TimeSteps × Variables MTS inputs this preserves variable correlations without zero-padding distortion. Combine with causal padding on time when needed.
- Trading layer: prediction class → mechanism selection (weak → swing, strong → trailing-stop); target = mean of max tick variation per class, stop-loss = 80% of target (swing) / 60% (trailing-stop). E.g., category #41: strong up → trailing stop, target 6 ticks, stop 4 ticks.

## 4. Equations & assumptions
- Price Average = Σ(Pricen × Amountn)/Σ(Amountn). (Eq. 1)
- Profit Back Bet = Amount Back × (Price Back − 1). (Eq. 2)
- Liability Lay Bet = Amount Lay × (Price Lay − 1). (Eq. 3)
- Close Amount Lay = (Price Open in Back / Price Lay to Close) × Amount Open in Back. (Eq. 4)
- Close Amount Back = (Price Open in Lay / Price Back to Close) × Amount Open in Lay. (Eq. 5)
- WoM = Amounts Bid / (Amounts Bid − Amounts Ask). (Eq. 6 — as printed)
- Conv layer: y^l_{i,j} = φ^l(Σ_{i,j} K · x^l_{i,j}). (Eq. 7)
- Attention: c_i = Σ α_i h_i; α_i = softmax(x_i^l). (Eqs. 8–9)
- Assumptions: pre-live market is a closed-loop system (only internal market data drive prices); no external info needed in the window; simulation assumes worst-case FIFO queue position; unmatched sim bets don't move the market (no spoofing).

## 5. Features / target
- Target: 5-class qualitative price-move classification of the last 2 minutes before race start (integral of tick variation, equal-frequency bins).
- Inputs: 128 time steps × 9 engineered market-depth indicators, built from 512 raw order-book frames.

## 6. Validation design
5 repeated fitting runs per architecture; accuracies reported (min/max/mean/variance) on validation set; confusion matrix with per-class precision/recall; final end-to-end evaluation on a separate 30-day production simulation dataset (JBet2 simulator) measuring greens/reds/nulls, positive vs negative ticks, cumulative PL at £3 and £100 stakes (one category, #41).

## 7. Numerical results / baselines
- Table 7 (5-run accuracies): best = LSTM with Conv1D multi-head attention, mean 30.05%, best run 30.92% (min 29.71); plain LSTM mean 28.40%; CNN mean 23.81% → CNN+roll padding 24.30%; WaveNet 25.89% → WaveNet2D+roll 28.64%. Baseline ≈ 20% (5 classes); best model is ~11 percentage points above baseline.
- Table 8 (best model, validation): accuracy 30.92%; per-class recall: strong down 46.38%, strong up 44.71%, neutral 27.71%, weak down 10.47%, weak up 9.89% (strongly extremes-biased); precision: strong up 36.54%, strong down 23.70%.
- Validation trade-count implication: 173 trades with expected positive PL vs 98 with expected negative PL (+75 net).
- Production simulation (30 days, category #41, Table 9): 134 trades → 54 greens, 36 reds, 44 null; positive ticks 134 vs negative ticks 87 (£3 stake) — profitable in-tick terms. £100 stake: 50 greens/39 reds — ROI lower at larger stake due to market absorption.
- Key claim: "all proposed innovations positively impact the performance metrics" — conv attention and roll padding each improved their base architectures.

## 8. Code / data availability
Framework: JBet2, https://github.com/rjpg/JBet. Data: proprietary Betfair collection (2014–2016), not published; authors note market data must be collected via Betfair API. No public model weights.

## 9. Leakage & limitations
- Horse-racing pre-live micro-structure, not team sports; outcome irrelevant (trading only).
- Strong-class bias: weak-move classes recall ~10% — the model mostly predicts extremes; authors lean into this by mapping weak→swing, strong→trailing-stop, but asymmetric recall means the "weak" trades are poorly predicted.
- Accuracy only 11 pp above a 20% baseline; profitability shown for ONE category over 30 days — generalization across the 9 trained categories unproven.
- Simulation ≠ live: queue-position unknown (worst-case assumption), unmatched bets assumed not to move market, no slippage model, latency not modeled.
- Equal-frequency 5-class target is engineered; real deployment accuracy on final test = 28.26% (Table 10).
- 9-indicator engineering is horse-racing specific (WoM across ladders, competitor runner).

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus covers outcome-prediction models, odds modeling, and Kelly sizing, but has no market-microstructure / order-flow short-term line-move forecasting lane. GSE's engine is an outcome model; a pre-close line-movement forecaster is a distinct timing/layering capability (e.g., predicting steam moves before kickoff). No existing convolutional-attention-on-market-data work in the corpus. Extension, not duplicate.

## 11. GSE implementation spec
- Data: historical line-movement data for NFL games — odds-history from the Odds API (Garrett's existing account) sampled at 1–5 min resolution in the 24–48h before kickoff; per game, build a MTS: spread/total at each snapshot, cross-book dispersion (max−min), book count, minutes-to-kickoff, GSE's own predicted line, steam indicators (fraction of books moving same direction in last N snapshots).
- Target adaptation: 3-class classification of closing-line move direction vs current line (spread moves toward favorite / away / no move ≥1 point threshold), replacing the 5-class tick integral.
- Model: start with the paper's best (stacked bidirectional LSTM + Conv1D multi-head attention) on the 128×K snapshot matrix; roll padding along the feature dimension if using 2D conv variants. Regime gating: the paper's rule-tree idea → separate models for primetime vs non-primetime, high vs low total, favorite vs dog — or a single model with regime indicators as features (simpler).
- Deployment: run at T−24h, T−6h, T−1h; output = probability of adverse line move (moving against GSE's current position). Use cases: (a) early/late bet timing — bet now vs wait; (b) CLV optimization — only lock in when predicted move is favorable or flat; (c) steam-chasing signal (move WITH predicted steam for middle opportunities).
- Effort: medium — model is standard Keras; main cost is odds-history ETL + the simulator for timing-strategy backtests.

## 12. Reproducible test
Dataset: 2022–2024 NFL seasons, book-by-book spread history (Odds API or equivalent), GSE's historical predicted lines. Test 1 (classification): 5-fold season-split CV on 3-class move prediction; baseline = naive no-move (accuracy = fraction of flat closes) and logistic regression on last-snapshot features; gate = LSTM-attention beats both baselines by ≥3 pp accuracy AND calibrated probabilities (reliability curve within ±5 pp). Test 2 (timing strategy): backtest "wait vs bet now" rule using predicted adverse-move probability vs GSE's recorded closing-line value history; gate = strategy improves average CLV by ≥0.5 points vs always-bet-early on the same games.

## 13. Acceptance / rejection gate
ADAPT if the LSTM-attention model on 2024 holdout: (a) beats baselines by ≥3 pp accuracy on 3-class line-move direction, AND (b) the wait/bet timing backtest shows ≥+0.5 points mean CLV improvement. REJECT if it fails either gate — line-move direction may be too close to efficient to exploit. Note: this adapts the architecture and framework to timing/CLV, not to outcome prediction; judge it on CLV, never on ATS hit rate.

## 14. Improvement experiment
Replace the engineered snapshot indicators with a learned order-flow embedding: train an autoencoder on raw book-level line vectors (all books' spreads at each snapshot) before the LSTM-attention stack, testing whether latent order-flow structure beats handcrafted dispersion/steam features. Second: add the multi-runner idea — model correlated games (same-week games sharing injury/weather/news, or same-team lookahead lines) jointly via the paper's cross-runner WoM indicator analogue (other-games' money pressure as features), testing whether market-wide pressure predicts individual line moves.
