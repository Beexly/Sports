# [1139] Expected Possession Value of Control and Duel Actions for Soccer Player's Skills Estimation (arXiv:2406.00814)

**Citation:** Shelopugin, A. (2024). *Expected Possession Value of Control and Duel Actions for Soccer Player's Skills Estimation*. arXiv:2406.00814. URL: https://arxiv.org/abs/2406.00814
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2406.00814v1 [cs.LG]; appendix Tables 7–10 truncated in extraction — method, equations, and result Tables 1–2 fully read).
**Verdict:** ADAPT

The time-decayed EPV, possession-risk accounting, and modified-Glicko-2 duel-skill ratings are directly portable to an NFL "expected drive value" and contested-play skill framework; the soccer-specific transfer-market prediction task is out of GSE scope.

## 1. Research question
How can a player's skill be estimated for the player-selection problem (scouting/transfers), given soccer's low-scoring nature and the difficulty of predicting how a player adapts to a new club or league? The paper extends expected possession value (EPV) to handle the "selection problem" — predicting next-season performance, including after transfers.

## 2. Dataset / schema
- Data source: proprietary event data (multiple leagues, seasons through 2023/2024; dataset not named, not public). Covers control actions (pass, shot, dribble, carry, set pieces) and symmetrical duels (aerial + ground).
- Feature set for next-season PCR prediction: ~600 features grouped as player-specific (age, height, position), performance (prior PCR, xG, goals, minutes; 3- and 5-season averages), contribution to team success (share of team xG while on field), league style (league-average PCR), team/league strength (modified Glicko-2 club and league ratings; old vs new team/league rating differences; average opponent rating), plus FIFA video-game contract-duration data (Kaggle) for the stay-in-data model.
- Training criterion: players with ≥100 minutes in both current and next season.
- Proprietary event data — not replicable externally.

## 3. Method / model
Three extensions to EPV: (1) **decay effect** — events immediately before a shot get more weight via discount factor γ=0.95 per effective second; (2) **possession risk with decay** — possession value = own future decayed xG sum minus opponent's future decayed xG sum (fixes the counterintuitive −0.75 penalty for a penalty conceded 30s after a pass, decaying it to −0.95^30·0.75 ≈ −0.16); (3) **duel skill** — symmetrical duels get EPV via the first following control action (PV(di) = PV(ei+1) if same possession, −PV(ei+1) otherwise), with modified Glicko-2 ratings for aerial/ground duel skill (defender advantage term a added inside expectation: μ' = μ + φ'²g(φj)(sj − E(μ + a, μj, φj)); context model is LightGBM on duel/pass coordinates, pass type, opponent count, excluding skill features; positions binned into 6 groups to fix the central-defender data-leak).
Six LightGBM models for EPV: open-play control actions, set pieces, aerial average-duel EPV, ground average-duel EPV, and two duel EPV models including player ratings. Custom per-player-weighted log-loss (xG) and MSE (EPV) dividing each shot's loss by the player's appearance count to de-overweight overrepresented players.
Per-event reward ΔEPV = difference of neighboring EPV values (turnover penalized twice: −EPV(ci+1) − EPV(ci); goal scored rewards 1 − EPV(ci) − EPV(ci+1)). Pass Carry Reward: PCR(player) = 60·ΣΔEPV(pass∨carry)/minutes. Next-season PCR predicted from the ~600-feature set; auxiliary model predicts P(stay ≥100 min next season); presence-only transfer bias handled via PCR_adj = PCR·0.8^(Δratings + pl) with Δratings = (rating(league_new) − rating(league_old))/1500.

## 4. Equations & assumptions
- PV(ci) = Π_{j=1}^∞ (1 − (1 − xGj[tj ≥ ti][si = sj])) (1) — note the paper's Π/Σ typesetting is garbled but intent is the standard 1−Π(1−xGj) no-goal-complement formula.
- With decay: PV(ci) = Π_{j=1}^∞ (1 − (1 − γ^(tj−ti)·xGj[tj ≥ ti][si = sj])), γ = 0.95 per effective second (2).
- Possession risk: PV(ci) = [1 − Π_{j∈team}(1 − γ^(tj−ti)xGj[tj≥ti])] − [1 − Π_{j∈opponent}(1 − γ^(tj−ti)xGj[tj≥ti])] (3).
- Duel PV: PV(di) = PV(ei+1) if si = si+1, else −PV(ei+1) (4).
- Reward for control actions ΔEPV(ci) ∈ {EPV(ci+1)−EPV(ci) [keep], −EPV(ci+1)−EPV(ci) [turnover], 1−EPV(ci)−EPV(ci+1) [goal], 0 [end of half], EPV_duel^ind(di+1)−EPV(ci) [leads to duel]} (5); analogous six-branch formula for duels (6).
- Custom log-loss: customlogloss_i = [yi log(pi) + (1−yi) log(1−pi)] / |player_i ∈ D| (7); custom MSE: customMSE_i = (yi − ŷi)²/|player_i ∈ D| (10).
- Glicko-2 update μ' = μ + φ'²g(φj)(sj − E(μ, μj, φj)) (8); defender-advantage variant μ' = μ + φ'²g(φj)(sj − E(μ + a, μj, φj)) (9).
- PCR(player) = 60·Σ ΔEPV(ei | player, ei = pass ∨ carry) / minutes (11); Δratings = (rating(league_new) − rating(league_old))/1500 (12); PCR_adj = PCR·0.8^(Δratings + pl) (13).
Assumptions: effective playing time (ball in play) is the right normalization; γ=0.95 is a stylistic choice (0.9 vertical, 0.99 tiki-taka); defender aerial advantage a exists and is estimable from context-only model; transfer market is at least partially efficient at the top (used for shortlist validation); interceptions excluded from reward computation.

## 5. Features / target
EPV models: spatial characteristics of the action and preceding action; duel models add LightGBM win-probability and Glicko-2 ratings of both players. PCR next-season model: ~600 features (player attributes, historical PCR/xG/minutes and 3/5-yr averages, team-success share, league style, Glicko-2 club/league ratings + transfer deltas + avg opponent rating). Target: next-season Pass Carry Reward (per-60-min ΔEPV from passes/carries), and auxiliary target P(≥100 min next season).

## 6. Validation design
Baseline = naive carry-forward (last season's PCR predicts next season's), evaluated in RMSE/MAE on >100-min and >1000-min samples, split into 5 transfer-status groups (all data; same team/same league; same team/new league; new team/same league; new team/new league). Model predictions compared on the same slices. No time-series CV described beyond season roll-forward; no significance tests. Shortlists additionally validated qualitatively (expert check pending; transfer-market efficiency assumption) and by top-club shortlist tables.

## 7. Numerical results / baselines
Baseline (naive PCR carry-forward), >100 min / >1000 min:
- all data: RMSE 0.053 / 0.042, MAE 0.036 / 0.029
- same team, same league: RMSE 0.050 / 0.039, MAE 0.034 / 0.027
- same team, new league: RMSE 0.051 / 0.042, MAE 0.035 / 0.031
- new team, same league: RMSE 0.055 / 0.044, MAE 0.038 / 0.031
- new team, new league: RMSE 0.061 / 0.051, MAE 0.043 / 0.036
Model results:
- all data: RMSE 0.033 / 0.031, MAE 0.023 / 0.021
- same team, same league: RMSE 0.032 / 0.029, MAE 0.022 / 0.020
- same team, new league: RMSE 0.031 / 0.027, MAE 0.021 / 0.019
- new team, same league: RMSE 0.034 / 0.032, MAE 0.024 / 0.023
- new team, new league: RMSE 0.037 / 0.036, MAE 0.026 / 0.025
So all-data RMSE drops 0.053 → 0.033 (~38% relative), MAE 0.036 → 0.023. Hardest slice (new team/new league) RMSE 0.061 → 0.037.
Duel ratings: van Dijk top aerial (1762, 2,167 duels, 71.9% wins); B. Ostojic top ground (1695, 279 duels, 73.1%). Donnarumma case study: Zlatan aerial win_duel 61.1% vs Leão 35.8% on similar a-priori difficulty (39.2 vs 40.5), epv_ind_duel 0.00135 vs 0.00069.
Note: no confidence intervals or significance tests reported; exact LightGBM hyperparameters not stated.

## 8. Code / data availability
None stated. Event data proprietary; contract data from Kaggle (EA Sports FC 24 dataset); cites Glicko-2 reference site and Gelade's Bradley-Terry duel work.

## 9. Leakage & limitations
- **Transfer status is known at prediction time?** Model uses "actual club/league ratings at the start of the season" including the NEW team — for real scouting use you know the destination, so this is defensible, but it inflates the new-team/new-league results vs a true pre-transfer prediction.
- **100-minute filter** introduces selection: auxiliary stay-in-data model is trained but results not reported in extracted text.
- **Presence-only correction (13)** is ad hoc (0.8^(Δratings+pl)) with no derivation — a fudge factor.
- **No proof EPV-based PCR correlates with true skill** — paper admits this explicitly; validation rests on transfer-market efficiency assumption.
- **γ = 0.95 is arbitrary** (stated as preference parameter, no tuning reported).
- **Soccer-only, proprietary data** — no NFL analogue tested; NFL has no 50/50 "duels" in the same sense, though contested catches and QB pressure win rates are analogues.

## 10. GSE overlap
GSE's corpus covers EPA, xG analogues, Elo/Glicko-type ratings, and calibration extensively, but NOT: (a) time-decayed within-possession value attribution (all actions credited equally or via last-action credit); (b) Glicko-2 with context advantage for 1v1 skill ratings; (c) per-player-appearance-weighted loss functions. Not duplicates — both are extensions. The per-appearance custom loss connects to the DFS/props lanes (fairer ratings for low-volume players = deeper waiver/projection coverage).

## 11. GSE implementation spec
Build an NFL "Expected Drive Value" (EDV) framework:
1. Data: nflverse play-by-play 2018–2025 (already in-house). Define "possession" = drive; control actions = plays; "shots" = scoring plays (TD/FG) with xP (expected points) replacing xG.
2. Fit drive-value models: per-play EDV = 1 − Π(1 − γ^Δt·xP_future) with γ per-second-of-game-clock (tune ~0.90–0.99 on drive length distribution); possession-risk variant subtracting opponent's next-drive decayed xP.
3. Player attribution: per-play ΔEDV credited to the primary actor (passer/receiver split 60/40 as in GSE convention; rusher full), turnovers penalized double as in (5).
4. Duel-skill analog: contested-catch and pass-rush/win rates via modified Glicko-2 (attack = receiver advantage a for contested catches; rush win with down/distance context model). Use nflverse + FTN charting where available.
5. Custom loss: weight each play's loss by 1/(player appearance count) when fitting projection models for low-volume/deep-roster players.
Effort: ~3–4 weeks for the EDV pipeline + contested-play ratings; the Glicko-2 duel module alone ~1 week.

## 12. Reproducible test
Dataset: nflverse 2021–2023, train EDV models on 2021–2022, evaluate player-season EDV-share stability: correlate year-N EDV-based player ratings with year-N+1 actual fantasy points per game, comparing vs a naive EPA-based carry-forward baseline. Metric: out-of-sample R² gain on 2023. Success: EDV-derived ratings beat EPA carry-forward by ≥ 0.05 R² for WR/TE (contested-catch skill) and ≥ 0.03 for QB.

## 13. Acceptance / rejection gate
ADAPT into GSE's player-projection pipeline only if: (a) EDV-based next-season prediction achieves the R² gains in §12 on 2023 AND 2024 holds-out seasons, and (b) the Glicko-2 contested-catch rating shows rank stability (Spearman ≥ 0.45 year-over-year for players with ≥30 contested targets). Otherwise park as research.

## 14. Improvement experiment
Replace the ad hoc γ with a learned per-situation discount: fit γ as a function of field position and down (early-down midfield plays should decay faster since drives routinely die there; red-zone plays decay slower). Hypothesis: a position-dependent decay improves next-season player-rating stability beyond fixed γ=0.95, especially for RBs whose value concentrates in short-yardage/red-zone plays that a uniform decay undervalues.
