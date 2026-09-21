# [0511] Going Deep: Models for Continuous-Time Within-Play Valuation of Game Outcomes in American Football with Tracking Data (arXiv:1906.01760v3)

**Citation:** Ronald Yurko, Francesca Matano, Lee F. Richardson, Nicholas Granered, Taylor Pospisil, Konstantinos Pelechrinis, Samuel L. Ventura (2019). *Going Deep: Models for Continuous-Time Within-Play Valuation of Game Outcomes in American Football with Tracking Data*. arXiv:1906.01760v3. URL: https://arxiv.org/abs/1906.01760v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~9 pages / 73,819 chars).
**Verdict:** ADOPT — the modular continuous-time within-play valuation framework (ball-carrier LSTM + RFCDE conditional density feeding EP/WP) is the foundational architecture GSE's NGS tracking lane should build on; the paper's feature engineering (endzone-adjusted coordinates, ball-carrier-relative geometry, Voronoi features) transfers directly.

## 1. Research question
How can expected points (EP) and win probability (WP) be estimated in continuous time *within* an NFL play using player-tracking data — rather than only at discrete between-play granularity — and can an LSTM ball-carrier model estimating expected yards from the current position outperform linear, tree-based, and feedforward alternatives?

## 2. Dataset / schema
- NFL "Big Data Bowl" tracking data: first six weeks of the 2017 regular season, released December 2018. Two RFID chips per player's shoulder pads + in the ball; sensors triangulate position at 10 Hz (location, speed, direction recorded 10×/second); NFL event annotations (snap, handoff, first contact, pass thrown, etc.).
- 1,075,720 unique frames across 14,167 plays, 22 players + ball per frame.
- Joined to play-by-play via nflscrapR to identify the ball-carrier per frame (roles: passer/runner/receiver/interceptor/returner) and ball-carrier sequence start (handoff/lateral/direct snap) and end (tackle/out of bounds/fumble/TD).
- Modeling dataset: running plays only (designed runs + QB scrambles) → 154,908 frames from 4,502 unique ball-carrier sequences. Ball-carrier sequences are mostly 2–5 seconds long.
- Example: Cordarrelle Patterson's 47-yard TD run (Chargers vs Raiders, 2017 Week 6).
- Access: proprietary NFL data, temporarily public for the competition, since taken down; paper gives no public link.

## 3. Method / model
**Framework (modular decision tree, §3.2):** everything routes through the expected end-of-play yard line, since down/yards-to-go/possession derive from it. Rushes: model E[Y_{t,i}|F(X_{t,i})] (expected yards from current position), add current yard line by linearity of expectation (Eq. 1). Dropbacks: QB decision multinomial {throw away, run/sack, pass} → run/sack routes to ball-carrier model → pass routes to receiver target probabilities P(T_{j,i}=1|F(X_{t,i}), D_i=Pass), replicated 5× per play, softmax-normalized over 5 receivers → global catch probability P(C_i=1|·) (reception or interception) → individual catch probability P(C_{k,i}=1|·), replicated 16× per play (5 receivers + 11 defenders), softmax-normalized to the global catch probability → each catcher routes to the ball-carrier model for expected YAC; incompletion/throw-away end at the original yard line. All sub-model predictions update at every frame. Implemented in this paper: the ball-carrier model only; QB decision/target/catch modules left to future work (Burke 2019 DeepQB, Deshpande & Evans 2019 cited as drop-in replacements).
**Ball-carrier models compared (§4.2):** intercept-only baseline; LASSO (glmnet, 1-SE penalty via CV; direction/y variables absolute-valued — noted as a linear-model limitation); XGBoost (xgboost R package; default 100 trees, max depth 3 selected as best among complexity parameters); feedforward NN (2 layers × 50 hidden units, ReLU, L1 per layer, Adam, keras R, tuned by CV); LSTM (2 layers, 50 units per layer by CV, 20% recurrent dropout per layer; sequences zero-padded to longest).
**Features (§4.1, Tables 2–3):** endzone-adjusted coordinates (x_adj = yards from target endzone; y_adj = yards from midfield, ±left/right; dir_target_endzone ±180°), speed, distance since previous frame; per-player ball-carrier-relative features (Euclidean distance, x_change/y_change vs ball-carrier, defender direction-vs-angle-to-ball-carrier diff); players split into ball-carrier/offenseX_/defenseX_ groups ordered by distance to ball-carrier; Voronoi tessellation features (bc region area, area in front, closest/farthest perimeter points to endzone, all-teammate-shared-edges bubble indicator) from two tessellations (all 22 players; ball-carrier + 11 defenders only, via deldir R package). All features centered/scaled; lagged versions tested, no improvement.
**Validation (§4.3):** leave-one-week-out (LOWO) CV (train weeks 1–5, predict week 6 frames); criteria: overall holdout RMSE + RMSE and residuals by frames-from-sequence-start (checking for temporal bias).
**Extension (§6.1):** replace the point-estimate ball-carrier model with random-forests-for-conditional-density-estimation (RFCDE, Pospisil & Lee 2018) yielding f̂(Y*_{t,i}|F(X_{t,i})), then compute within-play E[g] = ∫ g · f̂ (Eq. 2), noting that plugging the point estimate into nonlinear EP/WP functions yields biased within-play expectations.

## 4. Equations & assumptions
Stated equations:
- Eq. 1: E[Y*_{t,i}|F(X_{t,i})] = E[Y_{t,i}|F(X_{t,i})] + [player's current yard line] (linearity of expectation).
- Eq. 2: E[g(Y*_{t,i}|F(X_{t,i}))] = ∫ g(Y*_{t,i}|F(X_{t,i})) · f̂(Y*_{t,i}|F(X_{t,i})) · dX_{t,i}.
- QB decision: P(D_i|F(X_{t,i})) follows a multinomial distribution over {d_ta=throw away, d_r=run/sack, d_p=pass}. Target and catch probabilities are softmax-normalized (softmax suggested explicitly to handle all-zero edge cases). No LSTM cell equations stated; network sizes/regularization described in prose.
Stated assumptions: (a) end-of-play yard line determines all between-play value inputs (down, yards to go, possession); (b) play type (run vs dropback) known at snap — authors flag RPO plays as a problem case; (c) between-play EP/WP models (Yurko et al. 2019, nflscrapR) are independent of within-play conditional densities because they use only between-play-observable covariates — authors warn this independence assumption breaks if timeouts/fatigue enter the within-play model; (d) one ball-carrier model covers all ball-carrier situations (rushes, scrambles, post-catch, post-interception); (e) zero-padding variable-length sequences is harmless; (f) speed as a model input (for player evaluation, authors recommend imputing average speed so speed advantages are attributed to the player); (g) fumbles not modeled (survival component left to future work; too rare in 6 weeks).

## 5. Features / target
- Inputs: the full feature set of Tables 2–3 (endzone-adjusted x/y/dir per player group by distance rank, speed, frame distance, ball-carrier-relative x_change/y_change/dist_to_ball, defender direction diff, 9 Voronoi features). LSTM additionally consumes the frame sequence.
- Target: Y_{t,i} = yards gained from the ball-carrier's current position (continuous), from which E[Y*_{t,i}] = end-of-play yard line is derived; RFCDE extension targets the full conditional density of the end-of-play yard line. Prediction granularity: every 10 Hz frame of every ball-carrier sequence.

## 6. Validation design
- LOWO CV across the 6 weeks (train on 5 weeks, holdout the 6th); overall RMSE + RMSE/residual profiles by frames from sequence start (temporal-bias check). Baselines: intercept-only; LASSO vs XGBoost vs feedforward NN vs LSTM head-to-head. XGBoost feature importance and LASSO coefficients (trained on full data) used for interpretability, not selection. No test on data outside the 6-week 2017 sample; no confidence intervals on the RMSE comparisons (Figure 7 shows ± values in figure text only); player-evaluation examples (§5.4) explicitly flagged as unstable with limited data (≥20 carries cutoff).

## 7. Numerical results / baselines
- Dataset: 1,075,720 frames / 14,167 plays → 154,908 frames / 4,502 ball-carrier sequences.
- Model comparison: all covariate models beat intercept-only; LSTM has the lowest overall LOWO CV RMSE and the lowest RMSE at every point across the ball-carrier sequence (Figure 7; exact RMSE values are embedded in the figure graphic and not extractable as text — the paper reports the ordering, not the numbers). Figure 8: intercept-only shows clear temporal bias; LSTM has the smallest long-term errors (mean error ± 2 SE).
- Feature importance: XGBoost top-2 = defense1_dist_to_ball (closest defender distance) and bc_s (ball-carrier speed); LASSO top coefficients agree on direction/intuition (faster ball-carrier → more yards; Voronoi closest-point-to-endzone distance negatively related to yards gained).
- Player evaluation: Alex Collins led the sample in yards/carry but was negative in yards-above-expectation at handoff; Le'Veon Bell under-performed expectation at handoff but over-performed one second (10 frames) into the carry — presented as illustrative, not stable.
- RFCDE proof of concept: Figure 14 shows a bimodal end-of-play yard-line density at first contact for the Patterson TD; Figure 1 shows continuous EP/WP curves computed via Eq. 2 — no numeric integration results reported.
- Hyperparameters selected: XGBoost 100 trees/depth 3 (CV best); feedforward 2×50 ReLU + L1, Adam; LSTM 2 layers × 50 units, 20% recurrent dropout.

## 8. Code / data availability
None stated in paper (no code link; tracking data was temporarily public via NFL Big Data Bowl, since removed). nflscrapR referenced as the play-by-play source; deldir (R) for Voronoi.

## 9. Leakage & limitations
- Data scarcity: only 6 weeks of 2017 tracking data; no validation outside that window; the player-evaluation claims are explicitly caveated as unstable.
- The RMSE comparison's exact numbers live only in a figure; no CIs, no significance test that LSTM's win over XGBoost is real. Sequence-level CV (LOWO by week) is decent, but plays from the same teams appear across folds.
- Only rushing plays implemented; the entire dropback side of the framework (QB decision, target, catch models) is unbuilt — the "framework" is mostly architecture, not evidence.
- Target leakage by construction is avoided (future yards only), but the end-of-play yard line of a completed run is partially determined by the ball-carrier's own speed, which is also an input — attribution problems the authors flag themselves.
- Fumbles ignored; special teams ignored; RPO play-type ambiguity ignored. The independence assumption between between-play EP/WP and within-play density (Eq. 2) is fragile to feature overlap.
- External validity: 2017-era tracking (10 Hz RFID) vs modern NGS; league rule/scheme evolution since 2017. The feature pipeline (nflscrapR join, event annotations) depends on annotation quality.
- No odds/market application; no calibration of the implied EP/WP.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Directly adjacent to already-covered work: nflWAR (1802.00998, Yurko et al. 2019 — the between-play EP/WP foundation this paper plugs into; already read in depth), STRAIN (2305.10262), iWinRNFL in-game WP (1704.00197), and GSE's NGS 27-family taxonomy + NGS-replacement spec. None of these implement within-play continuous-time valuation — GSE's EP/WP stack is between-play only. This paper is an EXTENSION (the natural within-play complement to nflWAR) and the missing architectural blueprint for the NGS tracking lane. Note: 1906.01760v3 itself is NOT in the map's 64-ID dedup list — only its companion paper 1802.00998 is.

## 11. GSE implementation spec
- Data: NGS tracking (10 Hz, 22 players + ball) — GSE needs access; Big Data Bowl public samples suffice for a prototype. Join to nflverse play-by-play for ball-carrier identification and event annotations.
- Feature engineering: reimplement Tables 2–3 exactly — endzone-adjusted coordinates, ball-carrier-relative geometry by distance-ranked groups, Voronoi tessellations (all-players + ball-carrier+defenders variants) via a Python Delaunay/Voronoi library; center/scale.
- Model: LSTM (2 layers × 50, 20% recurrent dropout) as the paper's winner; add a modern Transformer/GNN comparator. Train per-frame E[yards from current position]; zero-pad sequences.
- RFCDE extension: random-forest conditional density of end-of-play yard line → integrate against GSE's EP/WP (nflverse-era equivalents of the nflscrapR models) via Eq. 2 for continuous-time within-play EP/WP curves per frame.
- Remaining modules: implement QB decision (multinomial), target probability (5× replication + softmax), global/individual catch (16× replication + softmax) per §3.4–3.7, or drop in modern equivalents (current CPOE-style completion models).
- Serving: per-frame inference in the tracking pipeline; outputs: live expected end-of-play yard line, within-play EP/WP deltas, yards-above-expectation attribution.
- Estimated effort: ~2–3 weeks for the ball-carrier LSTM + Voronoi pipeline on a Big Data Bowl sample; ~2–3 months for the full framework with all dropback modules and RFCDE integration on multi-season data.

## 12. Reproducible test
Dataset: any public NFL tracking sample with ≥1 season (Big Data Bowl releases; exclude preseason). Exact metric: LOWO-CV-style season-fold RMSE of predicted yards-from-current-position at the frame level, plus RMSE-by-frames-from-start profile (temporal-bias check). Baselines: intercept-only; XGBoost (100 trees, depth 3); the LSTM as specified. Time window: all rushing plays in the sample; primary comparison on the held-out season/fold.

## 13. Acceptance / rejection gate
ADOPT the ball-carrier LSTM into the GSE tracking pipeline if, on a held-out season of tracking data, it beats XGBoost by ≥5% relative frame-level RMSE AND shows no systematic temporal bias (|mean error| within ±2 SE of zero across the sequence profile); REJECT (fall back to XGBoost + RFCDE only) if the LSTM's margin is <5% or if the temporal-bias profile fails — the complexity must earn its keep since XGBoost is cheaper to serve.

## 14. Improvement experiment
Go beyond the paper in the direction it explicitly leaves open: build the dropback side of the framework with modern components — a QB-decision multinomial head and target/catch heads sharing the LSTM encoder, trained jointly with the ball-carrier head (multi-task), and add the fumble survival component the paper skips (per-frame fumble hazard via a competing-risks head). Hypothesis: joint training with a shared encoder plus explicit fumble risk will beat the paper's single-task ball-carrier model on full-play expected-EP RMSE, because turnovers are the highest-leverage within-play events and the paper's framework has no way to price them.
