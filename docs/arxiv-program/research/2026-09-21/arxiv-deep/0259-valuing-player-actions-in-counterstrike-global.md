# 0259 Valuing Player Actions in Counter-Strike: Global Offensive (arXiv:2011.01324v2)

**Citation:** Peter Xenopoulos, Harish Doraiswamy, Claudio Silva (2020). *Valuing Player Actions in Counter-Strike: Global Offensive*. arXiv:2011.01324v2. URL: https://arxiv.org/abs/2011.01324v2
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 1,258 lines, including references).
**Verdict:** ADAPT — micro-action-level win probability added on event streams, with graph-based spatial distances and bootstrap uncertainty, is a concrete template for NFL event-level player valuation; the WPA concept itself is not new to GSE.

## 1. Research question

The paper asks how to value esports players in a way that is context-aware, reproducible, and carries uncertainty estimates, in a sport (Counter-Strike: Global Offensive) that has no standard public data model and whose existing metrics (KDR, ADR, KAST%, HLTV Rating) are non-contextual — they treat every kill, death, or damage event as if it occurred in identical game situations. The authors build a CSGO data model, a graph-based distance measure for non-Euclidean 3D maps, and a Win Probability Added (WPA) framework that credits players for how their damage actions change their team's chance of winning a round, then test whether WPA is stable over time and independent of existing metrics.

## 2. Dataset / schema

- **Matches:** 4,682 local area network (LAN) professional matches (tournament-setting play) with public demofiles, downloaded with each match's ADR, KAST, and HLTV Rating 2.0 from HLTV.
- **Scale:** over 70 million in-game events overall. Training set: 55 million game states from matches played 2016-10-23 through 2019-05-31. Test set: 18 million game states from matches 2019-06-01 through 2019-12-22 (time-ordered split).
- **Game state schema:** for each team — map, ticks since round start, total round-start equipment value, players remaining, HP remaining, bomb-planted flag, bomb plant site (A/B), minimum player distance to both bombsites for each side. A game state G(i,t) is observed whenever a footstep, damage, or bomb event occurs; only damage events are credited as "actions" for WPA.
- **Outcome:** round winner coded Y_i = 1 if the CT side wins round i, 0 otherwise.
- **Stability sample:** n = 479 players who played at least 100 rounds each month, June–December 2019.
- **Access:** demofiles are public (HLTV); the authors' parsed dataset is not downloadable as a file, but the parser library is open source (see §8). Replicable in principle, labor-intensive in practice.

## 3. Method / model

1. **Data model:** hierarchical CSGO model — demofile → Round objects (start/end ticks, score, result, event lists) → per-event game states G(i,t). Stored as dictionaries/data frames, JSON-API-compatible.
2. **Graph distance:** directed graph built from CSGO navigation meshes (AI bot pathfinding surfaces). Each node = a traversable surface; directed edges = allowed moves between adjacent surfaces. Player position is mapped to a node; shortest paths computed with A*. This handles obstructions and non-symmetric 3D distances (e.g., jump down one way, walk around the other way). Used to derive spatial features such as minimum player distance to bombsites.
3. **Win probability model:** binary classification P(Y_i = 1 | G(i,t)) with logistic regression (scikit-learn, SAGA solver, no regularization), CatBoost, and XGBoost. Tuned on a 2/3-train / 1/3-validation split with log loss scoring. XGBoost: 100 estimators, hist tree method; grid max_depth ∈ {6, **8**, 10, 12}, min_child_weight ∈ {**1**, 3, 5, 7}. CatBoost: 100 iterations; grid depth ∈ {6, 8, **10**, 12}, l2_leaf_reg ∈ {1, **3**, 5, 7} (bold = selected). Hardware: Ubuntu 16.04, 2× Xeon E5-2695, 256 GB RAM, 3× NVIDIA Titan.
4. **Valuation:** V(a(i,t)) = Ŷ(i,t+1) − Ŷ(i,t), normalized to the acting player's team (beneficial actions positive for both sides); the damaged player receives −V. Player WPA = sum of action values, reported as WPA per round.
5. **Uncertainty:** bootstrap — resample each player's rounds with replacement (100 samples), compute WPA per round per sample, report distribution (mean, SD).

## 4. Equations & assumptions

Paper's equations, quoted faithfully:

- (1) KDR = Kills / Deaths
- (2) ADR = Total Damage / Rounds
- (3) KAST% = (Kills + Assists + Survivals + Trades) / Rounds
- (4) Rating_1.0 = (Rating_K + 0.7 × Rating_S + Rating_MK) / 2.7
- Win probability: P(Y_i = 1 | G(i,t)); Ŷ(i,t) is its estimate.
- (5) V(a(i,t)) = Ŷ(i,t+1) − Ŷ(i,t), with V(a(i,t)) ∈ [−1, 1].
- Graph distance: shortest path over the directed navigation-mesh graph via A*; explicitly non-symmetric.
- Stability comparisons use the Fisher r-to-z transformation for one-sided difference-in-correlation tests.

Assumptions stated or implied: analyzed teams are of similar skill (match level not modeled; pre-match spread/rankings suggested as future work); action values depend only on consecutive game states (Markov); only damage events are creditable actions (bomb plants/defuses, grenades, movement excluded — noted as a limitation); tick-level samples treated as independent despite high autocorrelation (authors argue the time-separated test set validates generalization); the month-to-month design assumes player talent is roughly constant within a month.

## 5. Features / target

**Features (game-state attributes, per team where noted):** map; ticks since round start; total round-start equipment value; players remaining; HP remaining; bomb-planted flag; bomb plant site; minimum player distance to both bombsites per side (graph distance). **Target:** round outcome Y_i (CT win = 1). **Label/prediction:** win probability estimate Ŷ(i,t) per game state; action value is the state-to-state difference. **Horizon:** end of the current round.

## 6. Validation design

Time-ordered split: train on 55M states (2016-10-23–2019-05-31), test on 18M states (2019-06-01–2019-12-22); hyperparameter tuning on a 2/3–1/3 train/validation split with log loss. Metrics: log loss, Brier score, AUC, plus calibration curves (100 equal-width bins, mean predicted vs mean true probability) and performance-by-round-time (log loss/Brier decreasing, AUC/accuracy increasing as the round progresses). Baselines: logistic regression, CatBoost, and a map-average CT win-rate benchmark. Player-metric evaluation (following Franks et al. meta-analytics): stability (month-to-month correlation, n=479), independence (correlation with KDR), discrimination via top-10 rankings and pistol-round WPA.

## 7. Numerical results / baselines

All numbers are the paper's, cited to tables:

- **Table II (test set):** Logistic regression — log loss 0.5539, Brier 0.1912, AUC 0.7743. CatBoost — 0.5443, 0.1875, 0.7851. XGBoost — 0.5353, 0.1842, 0.7913. Map average — 0.6917, 0.2493, 0.5303. XGBoost best on all three metrics and most calibrated (closest to the perfect-calibration line).
- **Table IV (stability, month-to-month / KDR correlation):** KDR 0.38 / 1.00; ADR 0.24 / 0.67; KAST% 0.30 / 0.79; Rating 2.0 0.29 / 0.93; WPA **0.40 / 0.73**.
- **Stability significance (one-sided difference-in-correlation vs WPA):** ADR p = 0.0029, KAST% p = 0.0392, Rating 2.0 p = 0.0268 (all significantly less stable than WPA); KDR p = 0.3594 (not significant).
- **Independence vs KDR:** WPA not significantly more independent than ADR (p = 0.9656) but more independent than KAST% (p = 0.0139) and Rating 2.0 (p = 0.0000).
- **Feature importance (normalized, sum 100):** team equipment value ranked first, then HP remaining for both sides; map ranked fifth despite the map-average baseline performing worst alone.
- **Bootstrap example (100 samples, Jun–Dec 2019):** SD of mean WPA/round — gla1ve 0.0038, device 0.0041, dupreeh 0.0041; device had the highest mean, gla1ve the lowest variance.
- **High-impact play:** ZywOo's headshot on B1NGO in a 1-vs-2 with 13 HP gave a 67% win-probability gain; at the start of the 1-vs-2 (around 100 s into the round) the T side had under a 3% win chance.
- **WPA top-10 (all rounds):** ZywOo 0.044, KSCERATO 0.033, s1mple 0.028, acoR 0.027, woxic 0.025, ropz 0.025, xsepower 0.022, device 0.022, EliGE 0.021, Jame 0.021.

## 8. Code / data availability

Paper states: "https://github.com/pnxenopoulos/csgo" (open-source implementation of the data model). No link given for the trained win-probability model, the parsed 70M-event dataset, or the bootstrap/ranking scripts. HLTV demofiles and per-match stats are public but must be re-scraped/reparsed.

## 9. Leakage & limitations

- **Only damage events credited.** Bomb plants/defuses, grenade throws (flashes, smokes), and positioning/movement get zero value — a large share of real impact is unmeasured. The authors' own suggested fixes (equal splits, context attribution) are hand-wavy.
- **Correlated training samples.** Adjacent ticks are near-duplicates; effective sample size is far below 55M states. The time-ordered test set is the defense, but train/test leakage via players and teams appearing across the boundary is not addressed.
- **No team-strength control.** WPA assumes similarly skilled teams; stomps inflate everyone's WPA. Pre-match spread/ranking features are left to future work.
- **Graph-distance tile size is non-uniform** (navigation-mesh dependent), so distances are not calibrated physical units; geodesic distance suggested but untested.
- **KDR stability parity.** WPA's stability edge over KDR is not statistically significant (p = 0.3594) — the "more stable" claim holds only against ADR/KAST%/Rating 2.0.
- **Esports→NFL transfer:** CSGO rounds are discrete, symmetric-ish episodes with full event logs; NFL plays have richer context (down/distance/field position) that partially obviates the need for this framework, and NFL tracking data is Euclidean, so the graph-distance machinery has no direct NFL use.

## 10. GSE overlap

**Extension, not new capability.** The existing-research map shows nflWAR (Yurko et al. 2018, arXiv 1802.00998) is already deeply covered in GSE's corpus — and this paper literally cites Yurko's nflWAR as its methodological parent ("Yurko et al. [5]... a regression based framework to value players based on how their plays change a team's win probability or expected score"). GSE already computes EPA/play, success rate, drive stats, down splits, and WPA-adjacent metrics in-repo (2026-09-17 gse-lab, 29 CSVs). What this paper adds that GSE does not have: (1) the micro-action WPA design pattern applied at sub-play event granularity with a formal data model; (2) non-symmetric graph distances for obstructed spaces (no NFL use, but the *pattern* of deriving distances from traversal graphs is novel); (3) the Franks et al. stability/discrimination/independence evaluation protocol for player metrics; (4) player-level bootstrap uncertainty over a value metric. The 2026-09-20 sweep already pulled SamHoppen's WPA waterfalls, so win-probability decomposition is live in GSE's benchmark lane.

## 11. GSE implementation spec

1. **Event-level action valuation on nflverse play-by-play:** train an XGBoost win-probability model on 2016–2024 play states (features: down, distance, yardline, score diff, time, timeouts, spread-implied team strength) — GSE already has much of this via the WPA lane; add per-event credit by differencing consecutive-state WP at sub-play resolution where charting data allows (e.g., target/air-yard events from FTN charting).
2. **Metric evaluation protocol:** adopt the paper's stability/independence/discrimination battery for any new GSE player metric — month-to-month (or split-half season) correlation, correlation vs EPA baseline, bootstrap CIs per player, Fisher r-to-z significance tests.
3. **Uncertainty layer:** bootstrap player value estimates (resample games with replacement, 100–500 samples) and publish per-player SD alongside point estimates — directly usable in the weekly DFS packet's "confidence" framing.
4. **Team-strength control** (the paper's admitted gap, which GSE can do better): include pre-game spread-implied win probability as a model feature so player value is not inflated in mismatches.
5. **Effort:** 2–4 days for the metric-evaluation harness on existing nflverse data; 1–2 weeks for the event-level WP model with charting integration.

## 12. Reproducible test

On nflverse play-by-play 2016–2024: train XGBoost WP model on 2016–2022, tune on 2023, test on 2024 (time-ordered). Metric: log loss, Brier, AUC vs a logistic baseline and the nflfastR WP model if accessible. Then compute per-player WPA for 2024 QBs/RBs/WRs and run the paper's battery: split-half (weeks 1–9 vs 10–18) correlation ≥ 0.35 target, correlation with EPA/play, and 100-sample bootstrap SD per player. Success = stability at least matching EPA/play's split-half correlation with strictly lower KDR-equivalent (raw box-score) correlation.

## 13. Acceptance / rejection gate

ADAPT the event-level WPA + bootstrap-uncertainty design if, on the 2024 test window: (a) the XGBoost WP model beats logistic regression on log loss by ≥ 0.01 with a calibrated reliability curve (max bin deviation ≤ 3 pp); and (b) player WPA split-half correlation ≥ 0.35 and its correlation with EPA/play < 0.90 (independence margin). REJECT as a valuation method (keep the evaluation battery only) if the WP model does not beat logistic regression or if WPA adds no independence over EPA/play — in which case the concept duplicates nflWAR already covered in the corpus.

## 14. Improvement experiment

Go beyond the paper's damage-only attribution in a way that maps to football: build a **within-play continuous-time value model** (the paper's cited Yurko et al. 2019 "Going deep" LSTM approach) on NFL tracking data, crediting ball-carrier/receiver micro-actions (cuts, broken tackles) via frame-to-frame expected-points deltas. The paper stops at discrete damage events; a continuous action-value density over tracking frames would credit exactly the "non-damage" contributions (positioning, blocking) the authors admit they cannot handle — and NFL Next Gen Stats tracking makes this feasible where CSGO demofiles made it hard.
