# [0579] A Bayesian Mixture Model Approach to Expected Possession Values in Rugby League (arXiv:2212.10904v1)

**Citation:** Sawczuk, T., Palczewska, A., Jones, B., & Palczewski, J. (2022). *A Bayesian Mixture Model Approach to Expected Possession Values in Rugby League*. arXiv:2212.10904v1. URL: https://arxiv.org/abs/2212.10904v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1994 lines).
**Verdict:** ADAPT — port the fixed-weight Bayesian mixture-model machinery (33 expert centres, Dirichlet-Multinomial posterior, bilinear/linear interpolation weights) to a smooth NFL expected-possession-value surface over field coordinates, replacing the rugby outcome categories with NFL drive outcomes; keep the league-posterior-as-team-prior hierarchy.

## 1. Research question
Can a Bayesian Mixture Model (BMM) improve on previous zonal Markov Reward Process (MRP) approaches to Expected Possession Value (EPV) in a low-data-availability sport (rugby league)? Specifically: (a) produce a *smooth* pitch surface instead of coarse zones, and (b) estimate *individual* possession-outcome probabilities (converted/unconverted try, penalty goal, drop goal, no score) rather than a single aggregated value. Secondary aim: use the model to visualise team attacking/defensive differences and to build actual-vs-expected player ratings.

## 2. Dataset / schema
Event-level Opta (Stats Perform) match-play data for all 138 matches of the 2021 Super League season: 557,050 raw match events filtered to **99,966 actions** (attacking-team actions in 8 preprocessing categories; consecutive duplicate location codings removed). Schema per observation: attacking team, defending team, player ID, x,y pitch coordinates, possession number, possession outcome (5 categories: converted try, unconverted try, penalty goal, drop goal, no try). Only 91 of 99,966 actions occurred in the try area. Team-level subsets: 12 attacking subsets (median 8105 actions/team, IQR 7596–8937) and 12 defending subsets (median 8077, IQR 7878–8700). Data access: proprietary Opta data (ethics approved); not publicly available. Possession definition: begins on gaining possession, ends on handover, error/foul, points scored, or goal-kick attempt.

## 3. Method / model
A Bayesian Mixture Model with **fixed weights** and **learned centre probabilities**. 33 centres placed by expert consultation: 30 in the field of play (x ∈ {0,20,35,50,70}, y ∈ {−10,20,35,65,90,100}) and 3 in the try area (x ∈ {0,35,70}, no y). Each centre holds a 5-dimensional probability vector over possession outcomes with a Dirichlet prior. For any (x,y) location, outcome probabilities are a weighted average over centres: P(s;x,y) = Σ_k z_k(x,y) P_k(s). Weights computed by **bilinear interpolation** among the 4 surrounding centres (field of play) or **linear interpolation** between the 2 nearest centres (try area); all other centres get weight 0. Posteriors estimated by MCMC (PyMC3 v3.11.4). Two-level hierarchy: league model first (human-defined priors, Appendix A), then 24 team attacking/defending models whose Dirichlet α priors come from MLE of the league-model posterior (Appendix B). Team AE player ratings: (actual return − expected return) / (team median possessions per fixture), expected return from league-model EPV at action locations.

## 4. Equations & assumptions
- Location probability: P(s;x,y) = Σ_k z_k(x,y) P_k(s), where z_k(x,y) is the fixed weight of location (x,y) on centre k and P_k(s) is the outcome-s probability at centre k.
- Prior: P_k ~ Dirichlet(α), independent between centres.
- Likelihood: P(D|α) = ∏_i Σ_k z_k(x_i,y_i) P_k(s_i|α_k), with P_k(s|α_k) = ∫ π_s p_Dirichlet(p|α_k) dπ over the 5-simplex.
- Bilinear weights for surrounding rectangle (x1,y1),(x1,y2),(x2,y1),(x2,y2): z_11=(x2−x)(y2−y)/((x2−x1)(y2−y1)); z_12=(x2−x)(y−y1)/((x2−x1)(y2−y1)); z_21=(x−x1)(y2−y)/((x2−x1)(y2−y1)); z_22=(x−x1)(y−y1)/((x2−x1)(y2−y1)).
- Try-area linear weights: z_1=(x2−x)/(x2−x1); z_2=(x−x_0)/(x2−x_1). (Equation 7 as printed uses x_0, apparently a typo for x_1; I report it as printed in the paper.)
- EPV: EPV(x,y) = Σ_{s∈S} P(s;x,y)·Points(s), Points = converted try 6, unconverted try 4, penalty goal 2, drop goal 1, no score 0.
- Posterior-mean EPV: EPV^μ(x,y) = Σ_s P^μ(s;x,y)·Points(s); posterior-SD propagation: P^σ(s;x,y) = √(Σ_k z_k(x,y) P_k^σ(s)²); EPV^σ(x,y) = √(Σ_s P^σ(s;x,y)²·Points(s)).
- Player AE rating: (Actual return − Expected return) / (Player team median number of possessions per fixture).
- Assumptions stated: exactly one possession outcome per possession; weights fixed (not estimated); independence between field-of-play and try-area centres; prior independence between centres; observations treated as conditionally independent (auto-correlation within possession sequences not modeled — acknowledged as a limitation); latent team-level averaging assumed to represent "average team".

## 5. Features / target
Input features: x,y pitch coordinates of each action (features are implicitly the interpolation weights z_k(x,y)). Target: five-class categorical possession outcome (converted try / unconverted try / penalty goal / drop goal / no try), used both for per-outcome probability surfaces and the derived EPV scalar. No action-type, game-state, or defensive-context features; location only.

## 6. Validation design
No train/test split and no predictive backtest reported — the paper is a model-construction/methods proof of concept with descriptive results. Validation is face-validity based: (a) visual inspection of smooth pitch surfaces vs prior MRP results; (b) AE player ratings checked against known awards (Man of Steel and Young Player of the Year both appear in the top 20); (c) standard-deviation surfaces reported to communicate parameter uncertainty (wide areas / corners show higher SD, matching lower data density in KDE plots). Appendices A and B give the full prior tables for league and team models.

## 7. Numerical results / baselines
- Dataset: 99,966 actions; 1001 tries (768 converted, 233 unconverted), 175 penalty-goal attempts (158 successful), 83 drop-goal attempts (37 successful) in the 2021 season.
- Highest field-of-play EPV at centre (50,100): EPV^μ = 1.73. Try-area centres: EPV^μ ∈ {3.52, 3.72, 3.16} — much larger, excluded from plots for clarity.
- Top AE player ratings (points per match above expected): Player 276 (Full Back) 8.21; player 19 (Winger) 6.67; player 6335 (Stand-off) 6.35; player 1004 (Scrum Half) 6.10; player 433 (Full Back) 4.96 (Table 3.3).
- Team-level results are qualitative (Figures 4–7, visual): Team A above league average on left side of pitch (converted try, drop goal), stronger penalty-goal probability right side; Team B below average attacking across pitch except unconverted tries. Defensive: Team A concedes above average until their 20m but defends try-line corners well; Team B excellent defensively except penalty goals.
- No predictive-accuracy metrics, baselines, or statistical significance tests reported. These are the paper's descriptive claims; my interpretation: numbers are in-sample descriptive estimates, not out-of-sample validated.

## 8. Code / data availability
Code: bespoke Python 3.7 scripts + PyMC3 v3.11.4; not stated as publicly released (no link given). Data: proprietary Opta data. Model prior tables (Appendices A–B) are published in the paper. Effectively: no public code or data.

## 9. Leakage & limitations
- No leakage issue of the classic lookahead kind (descriptive model), but: team-level models use MLE-of-league-posterior as priors — a mild empirical-Bayes double-use of data, acknowledged as a design choice rather than formal hierarchy.
- **No out-of-sample validation whatsoever** — every number (including AE ratings and team difference plots) is in-sample. The smooth surfaces could over-smooth or under-smooth; MCMC posterior SD surfaces partially compensate but are not a substitute for holdout testing.
- Ignores within-possession auto-correlation (actions in the same possession treated independently) — acknowledged by the authors; inflates effective sample size and understates uncertainty.
- Context-free: location-only valuation (5 defenders vs 0 defenders in front gives identical value) — acknowledged.
- Try area supported by only 91 actions across 3 centres — the high EPV values (3.16–3.72) are prior-dominated.
- AE ratings penalise playmakers: players with many actions in no-score possessions (e.g., scrum halves) rate poorly — acknowledged.
- The likelihood's marginalisation over P_k(s|α_k) per observation and the fixed-weight scheme are mathematically consistent but the MCMC posterior of P_k is never fully specified (chain count, iterations, R-hat all unstated).
- NFL transfer: rugby league possession structure (6-tackle sets, try-area behavior) differs from NFL drives (4-down series, kicks, punts); the outcome taxonomy must be redesigned. Data volume: the NFL has far more data, weakening the "low data" justification — but the interpolation approach is a legitimate alternative to XGBoost EP surfaces in sparse regions (goal-line, 2-point plays, kickoff returns).

## 10. GSE overlap
New capability, not a duplicate. Garrett's existing research (per existing-research-map.md §1–§4): EP as 7-event probability vector (Yurko 1802.00998 foundation), Brill et al. 2409.04889 EP critique (drive-level dependence, selection bias), 4th-down WP models (nfl4th), and STRAIN tracking EPV — but **no smooth spatial EPV surface method**: GSE's EPA/EP machinery is game-state (yardline, down, distance, clock) via nflverse/nflfastR models, not a continuous (x,y) pitch surface, and uses no Bayesian mixture machinery, no Dirichlet-multinomial outcome probabilities, no AE-style player ratings built from EPV. The 2026-09-18 ML research brief covers hierarchical pooling and state-space team strength but not spatial Bayesian mixture EPV. Verdict: **extension** — complementary spatial layer on top of GSE's drive-state EP stack.

## 11. GSE implementation spec
1. Data: nflverse play-by-play 2009–2025 (yard line → convert to (x,y) field coordinates; sideline-to-sideline y approximated from formation/charting where available, else collapse to x-only with width-averaged centres like the try-area treatment). Outcomes per drive: TD (7/6), FG (3), safety (2), punt, turnover, downs, end of half — 6–7 classes.
2. Centres: place ~40 expert centres on the field (e.g., x ∈ {own 10, own 25, own 40, mid, opp 40, opp 25, opp 10, goal line} × y ∈ {left hash, middle, right hash} + goal-line/red-zone centres); red-zone/end-zone treated as separate region with linear weights (mirrors paper's try-area handling).
3. Weights: bilinear interpolation in x-y; precompute once.
4. Model: Dirichlet(α) priors per centre, α set from historical NFL scoring rates by field region (data-driven, not human priors); MCMC via PyMC or closed-form Dirichlet-multinomial posterior means (weights fixed → per-centre posterior is conjugate Dirichlet-multinomial; MCMC optional — full conjugacy actually makes this cheap to implement in numpy).
5. Hierarchy: league model → team offense/defense models using league-posterior-derived α (or a proper hierarchical Dirichlet).
6. Outputs: smooth EPV(x,y) surface; per-outcome probability surfaces (e.g., FG probability by field region for kicker evaluation); AE player ratings for returners/RBs/WRs by (actual − expected drive points)/drives.
7. Serving: precompute surface on a 1-yard grid → lookup table API; update priors each offseason.
8. Effort: ~2–3 weeks for one engineer (data pipeline + model + validation), plus a validation sprint (see §12).

## 12. Reproducible test
Dataset: nflverse play-by-play, 2016–2024 seasons, regular season only. Build the league-level BMM EPV surface on seasons 2016–2022 (in-sample fit, conjugate posterior), then evaluate **out-of-sample** on 2023–2024 drives: for each drive start (yardline, approximated width), predict drive points via surface lookup. Metric: mean squared error of predicted vs actual drive points, plus calibration of per-outcome probabilities (e.g., predicted FG probability vs observed FG rate by field region, reliability curve). Baseline: nflfastR's EP model (ep) predictions on the same drives. Time window: 2023–2024 seasons held out; train on 2016–2022.

## 13. Acceptance / rejection gate
ADOPT the surface as a GSE feature if, on the 2023–2024 holdout: (a) drive-points MSE ≤ nflfastR EP MSE (within 2%), AND (b) at least one per-outcome probability surface (e.g., FG probability in 30–55 yard field-goal range) is better calibrated than the EP-implied outcome probabilities — measured by ≥5% lower Brier score on that outcome class. REJECT as a standalone predictor if it underperforms nflfastR EP by >5% MSE; keep only as a visualisation tool if surfaces are qualitatively useful but numerically no better.

## 14. Improvement experiment
Beyond the paper: make the weights **learned, not fixed** — replace bilinear interpolation with a small neural network (or Gaussian-process kernel over (x,y)) that outputs centre weights, trained end-to-end against drive outcomes; and add game-state covariates (down, distance, time, score differential) as inputs to the weight network, converting the pure spatial surface into a joint spatial+state EPV model. Test whether learned adaptive weights beat fixed bilinear weights on the §12 holdout — the paper's fixed weights are its most arbitrary choice, and the NFL's data volume supports learning them.
