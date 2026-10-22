# GSE Deep NFL Methods Corpus — Volume 2 (2026)

**Date:** 2026-10-11
**Scope:** The METHODS corpus — every analytical method, mathematical technique, and research program behind the engine. Companion to Volume 1 (the metric list).
**INTERNAL ONLY.** Not for public surfaces. NGS content stays internal per standing doctrine.

---

## 1. arXiv Methods Corpus

**Source corpus:** `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/` — full-text reads of 750+ arXiv papers, each with a 14-section deep-read ledger (`arxiv-deep/`) carrying a verdict: **ADAPT** (adapt the method to GSE), **ADOPT** (use as-is / build it), **REJECT** (discarded). Index: `arxiv-program/index/corpus-index.jsonl` (1,251 records, all ADAPT/ADOPT), lane map and wiring plan in `SIGNAL-TAXONOMY.md`, `BUILD-QUEUE.md`, `WIRE-IN-PLAN.md`. Garrett's standing doctrine on this corpus: market-efficiency/CLV/devigging work is BASELINE (the mathematical starting point, never the product); the frontier is situational/contextual intelligence.

This section covers the **sports-analytics-relevant subset**: every paper whose domain is sports prediction, betting markets, ratings, tracking, or sports causal inference. Deep-read entries summarize the ledger (method in plain English + what it improves in the engine); the tail lists the rest as indexed one-liners. No content copied at length from ledgers — all summaries.

**Coverage (honest):** 1,511 ledger files on disk; 1,251 indexed records (1,203 ADAPT / 48 ADOPT); ~251 REJECT ledgers; 374 sports-titled index records (357 ADAPT, 17 ADOPT — all 17 ADOPTs deep-read). This section: **38 deep-read**, **340 indexed-only**.

---

### 1.1 Ranking & Rating Systems

**Modelling Competitive Sports: Bradley-Terry–Élő Models for Supervised and On-Line Learning of Paired Competition Outcomes** (arXiv:1701.08055v1) — Verdict: ADAPT
Method: unifies Bradley-Terry and Élő as one model — Élő's update rule is exactly online gradient ascent on the Bradley-Terry log-likelihood. Represents the pairwise win-probability matrix as σ(L) with structured log-odds L, nesting BT, Élő, and logistic regression; proposes a two-stage training recipe (large batch to convergence, then online updates). The fancier "structured logodds" extensions (two-factor, rank-four) failed to beat vanilla Élő on EPL data.
GSE application: adopt the unified framework + two-stage training for the team-rating stack; skip the higher-rank parameterizations that lost to vanilla Élő.

**The ranking lasso and its application to sport tournaments** (arXiv:1301.2954v1) — Verdict: ADOPT
Method: penalized Bradley-Terry with an L1 penalty on all pairwise team-ability differences (a fused lasso without natural order), tuned by AIC/BIC. Forces similar-ability teams into identical-ability groups — outputting data-determined tiers. On NFL 2010–11 it cut cross-validated negative log-likelihood 15–20% vs plain MLE-BT.
GSE application: directly implementable upgrade to the team-rating fits; tier groupings are a free byproduct (tier graphics for edge sheets; within-tier games = pass, cross-tier = edge).

**Score-Driven Rating System for Sports** (arXiv:2604.09143v1) — Verdict: ADOPT
Method: generalizes Élő to arbitrary outcomes using the "score" (gradient of the log-likelihood) as the rating update — the GAS/DCS framework applied to sports. Same core handles win/loss (Elo as special case), margin of victory (Skellam on point differences), win/draw/loss (ordered probit), and full rankings (Plackett-Luce), with proven zero-mean/zero-sum/reversion-to-true-skill fairness. Pure theory paper — no empirical results.
GSE application: generalize the Élő-family ratings to score-driven updates so one rating core handles win/loss, margin, and ATS outcomes; keep home field out of the skill rating (per the paper's fairness argument) and model it as a separate offset.

**Modeling outcomes of soccer matches** (arXiv:1807.01623) — Verdict: ADAPT
Method: Bradley-Terry variants with time-varying coefficients — feature weights drift linearly with matches played (early-season games weight prior-season info differently than late-season games). Also a hierarchical Poisson log-linear score model with AR(1) attack/defense across seasons, plus a walk-forward + meta-analysis validation protocol for comparing models across seasons.
GSE application: port the TVC interaction (week × feature) into the NFL rating stack and steal the walk-forward-with-meta-analysis harness as the standard engine-version comparison protocol.

### 1.2 Market Efficiency, De-biasing & Book Microstructure

**The profit-bias identity in sports betting: bookmaker profit as the public's prediction error** (arXiv:2609.06739v1) — Verdict: ADOPT
Method: an exact accounting identity, not a fitted model. A book's expected profit decomposes into the hold plus two bias terms: line shading (price deviating from fair as a function of public money) and the public's directional prediction error, plus an outcome-covariance term. Key empirical caution: the pooled "public backs losers" effect vanished once stratified by favorite identity — composition effects manufacture phantom bias.
GSE application: adopt as the auditing framework for any public-money/CLV/book-bias analysis; every public-bias statistic must be computed stratified by favorite identity, never pooled.

**Prices, Probabilities, and Parlays: Systematic Bias in Sports Prediction Markets** (arXiv:2607.14430v1) — Verdict: ADAPT
Method: on Kalshi data, calibrates binary moneyline contract prices against realized outcomes conditional on time-to-expiry (near-expiry prices need much steeper correction — Platt slopes up to ~4.5 in NHL), and shows multi-leg parlay prices are inflated ~3% per additional leg vs the product of leg probabilities. Measurement study only — the "computational correction" strategy is never backtested.
GSE application: add time-to-expiry as a conditioning axis for market-implied probabilities; run the parlay-consistency audit (R = parlay price / product of leg prices) on retail SGPs.

**Not feeling the buzz: Correction study of mispricing and inefficiency in online sportsbooks** (arXiv:2306.01740v4) — Verdict: ADOPT
Method: a replication/correction study — the headline WikiBuzz betting profits were driven by ONE bad odds row (39.3% of bankroll at 5.50 when market max was 2.10); removing it flipped ROI from +17% to −7%. Introduces the Wunderlich–Memmert random-betting bootstrap (100k trials) as the mandatory significance screen for strategy P&L.
GSE application: install as QA + evaluation protocol — odds-sanity filters on the market-capture pipeline, report p_bs alongside every strategy ROI, cap Kelly fractions ≤0.25× full Kelly to bound single-row data-error damage.

**The Performance of Betting Lines for Predicting the Outcome of NFL Games** (arXiv:1211.4000) — Verdict: ADAPT
Method: validates a normal-approximation spread→win-probability map Pr(F>U|P=p) = Φ(p/13.588) on 2,560 NFL games (2002–2011); margin-of-victory distribution is Gaussian with σ≈13.6. The claimed home-underdog ATS edge (53.5%) was already decaying in the paper's own data.
GSE application: use the Φ map as the canonical closed-form spread→probability baseline; adopt the line-movement distribution (80% of games move ≤1 point) as the null model for the steam detector; re-test (don't trust) the home-underdog angle.

**Exploiting oddsmaker bias to improve the prediction of NFL outcomes** (arXiv:1710.06551v2) — Verdict: ADAPT
Method: estimates the conditional ATS-outcome distribution per spread value and wagers only on spread values with anomalously low Shannon entropy (where one side covers far more often than the other) — the oddsmaker's "tell." Evidence is thin (54 temporally-honest test games, visually-set threshold) but the hypothesis is legitimate market microstructure.
GSE application: re-test on multi-season closing lines with walk-forward protocol and a cross-validated entropy threshold; adopt as a pick-selection filter only if it beats wager-all by ≥2 ROI points.

**Combining historical data and bookmakers'odds in modelling football scores** (arXiv:1802.08848) — Verdict: ADAPT
Method: a hierarchical Bayesian fusion — invert bookmaker 3-way odds (via Shin de-vigging) through a Skellam distribution to recover odds-implied scoring intensities, then model actual scores as Poisson with rates that are convex combinations of historical parameters and odds-implied parameters, with per-match mixture weights learned from data. The fused model was slightly worse than raw bookmaker probabilities on average correct prediction.
GSE application: the fusion architecture (not the result) is the asset — port to NFL by inverting de-vigged spread/total markets through a margin Skellam to get odds-implied team scoring rates, fused with the historical strength model; reject if the learned mixture weight collapses to pure market.

**The Evolution of Football Betting: A Machine Learning Approach to Match Outcome Forecasting and Bookmaker Odds Estimation** (arXiv:2403.16282v1) — Verdict: ADAPT
Method: a standard industry-history + ML-benchmark paper (RF/SVM/KNN/XGBoost on Premier League 1x2). The usable assets are empirical priors, not methods: chance-creation features (xG, xGA, shot-creating actions) dominate match-outcome prediction, and draws are near-unpredictable (recall 0.06–0.41 across all model families).
GSE application: keep as feature-selection guidance — prioritize EPA/success-rate/explosive-play-rate (the NFL analogs of chance-creation) and don't over-allocate model capacity to tie/OT edge cases.

### 1.3 Calibration & Forecast Evaluation

**Evaluating realtime probabilistic forecasts with application to NBA outcome prediction** (arXiv:2010.00781v1) — Verdict: ADOPT
Method: the definitive in-play forecast-evaluation toolkit — calibration surfaces over game time (adaptive rank-binning to handle late-game clustering near 0/1), pointwise Lai-style Brier skill confidence intervals for model-vs-model comparison, and a functional L² test for aggregate skill across game time. Substantive finding: ESPN's proprietary model ≈ a simple score+strength logit — a caution about in-play model complexity.
GSE application: adopt as the standard evaluation for the live win-probability product — calibration surfaces, skill CIs vs book consensus, and the functional test as the aggregate verdict; needs N≥500 games for power.

**Machine learning for sports betting: should model selection be based on accuracy or calibration?** (arXiv:2303.06021v4) — Verdict: ADOPT
Method: identical betting pipelines differing only in the model-selection criterion — accuracy vs classwise-ECE. Calibration-selected models beat accuracy-selected ones by +34.7% vs −35.2% average ROI, and the accuracy-selected model self-destructed under Kelly (−75.9% ROI at eighth-Kelly) from overconfident value bets. Includes an 80%-nonempty-bins guard to stop ECE degeneracy.
GSE application: direct mandate — run model selection on guarded classwise-ECE, not accuracy, for any probability engine; cap sizing at fractional Kelly ≤1/8.

### 1.4 Sizing, Portfolio & Decision Theory

**Optimal sports betting strategies in practice: an experimental review** (arXiv:2107.08827) — Verdict: ADOPT
Method: ten bankroll strategies compared on real horse-racing and basketball data under probability-estimation uncertainty: full Kelly, fractional Kelly (tuned fraction), Kelly with drawdown constraint (convex program), distributionally-robust Kelly, Sharpe-ratio (Markowitz) variants, and informal heuristics. Plain Kelly ruined 100% of trajectories on the basketball data (model worse than bookmaker); the tuned-fraction and drawdown-constrained variants survived and grew.
GSE application: adopt fractional-Kelly-with-tuned-fraction as the sizing protocol, with the drawdown-constrained variant as the production safety rail and the robust-Kelly box variant for low-confidence slates; survival-first tuning (maximize median growth subject to ≤5% of trajectories drawing down below 90%).
### 1.5 Win Probability & In-Game / Live Models

**Bayesian estimation of in-game home team win probability for Division-I FBS college football** (arXiv:2207.13747) — Verdict: ADAPT
Method: three-stage pipeline — (1) estimate team pace (Pomeroy-style recursion) and compute expected possessions remaining instead of raw clock time; (2) model expected score differential including the *next* drive via XGBoost (since a punt pins the opponent); (3) a dynamic Bayesian win-probability estimator on the (possessions-remaining, expected-score) cells with a beta prior from expert tables, blended with the pregame probability by a weight linear in time and score. Holdout Brier 0.1250 vs random forest 0.1705.
GSE application: port the expected-possessions-remaining concept and the XGBoost current+next-drive expected-points model into the NFL live win-probability feed; blend with the pregame model by linear-in-time-and-score weights.

**Going Deep: Models for Continuous-Time Within-Play Valuation of Game Outcomes in American Football with Tracking Data** (arXiv:1906.01760v3) — Verdict: ADOPT
Method: the modular continuous-time within-play valuation framework. Everything routes through expected end-of-play yard line: an LSTM ball-carrier model predicts expected yards from current position at every frame (beating LASSO, XGBoost, feedforward nets), and the architecture leaves drop-in slots for QB-decision, target, and catch-probability modules; a random-forest conditional density of end-of-play yard line integrates against EP/WP models for continuous-time within-play EP/WP curves. Key feature engineering: endzone-adjusted coordinates, ball-carrier-relative geometry, Voronoi tessellations.
GSE application: adopt as the architectural blueprint for the NGS tracking lane's within-play valuation — the natural continuous-time complement to the between-play EP/WP stack.

**Frame by Frame Completion Probability of an NFL Pass** (arXiv:2109.08051v1) — Verdict: ADAPT
Method: two-stage framework on NGS tracking data — Stage 1 identifies the pass target frame-by-frame via inverse-distance weighting of player-to-ball-trajectory geometry (86.9% accuracy); Stage 2 predicts conditional completion probability with a random forest on 32 features (RF AUC 0.883 vs ~0.79 for logit/LDA/QDA). Frame-by-frame predictions calibrate near-perfectly (Pearson 0.998 vs binned completion rates), strictly better than per-play averages.
GSE application: reimplement as GSE's in-house completion-probability model — live in-play completion odds, a CPOE feature for play-level models, and route-level reception probabilities for props; augment with receiver/CB talent priors.

**NFL Play Prediction** (arXiv:1601.00574) — Verdict: ADAPT
Method: predicts individual NFL play outcomes (success classification, yards regression) from game situation + parsed play descriptions with classical ML (RBF SVM best). The transferable asset is the "progress" target — a down-aware continuous play-outcome measure (fraction of yards-to-go gained) that needs only down/distance, no win-probability model, unlike EPA.
GSE application: adopt progress as a secondary play-level target alongside EPA; test whether a modern gradient-boosted progress model adds incremental value over EPA in drive-outcome prediction.

### 1.6 Score Distributions & Totals Modeling

**Bayesian Conway-Maxwell-Poisson model with spike-and-slab priors for dispersed count data with application to football scores** (arXiv:2607.18009v1) — Verdict: ADOPT
Method: generalizes the Maher Poisson goal model with a Conway-Maxwell-Poisson likelihood whose team-specific dispersion parameters carry a spike-and-slab prior — the spike at ν=1 (equidispersed Poisson regime), a lognormal slab around 1 — so each team's dispersion declares itself from data instead of being assumed. Inference via Metropolis-within-Gibbs with the Exchange algorithm for the doubly-intractable likelihood; evaluated by WAIC and ignorance scores on outcomes, over/unders, and goal differences.
GSE application: port to NFL team points as the count-data model for totals — team-level dispersion in points scored is exactly what separates a good totals model from a market-average one; reject if no NFL team shows dispersion heterogeneity.

**Fine-Tuned Large Event Models for Predicting Player Performance** (arXiv:2402.06815v2) — Verdict: ADAPT
Method: trains a general "Large Event Model" (type/accuracy/data heads predicting the next event) on soccer event data, then fine-tunes per team into team-contextualized simulators used to answer what-if questions ("how would this player perform if transferred to team X"). The transferable idea is the general-model→fine-tune-into-team-context recipe; the soccer validation (standings displacement, hypothetical transfers) is weak.
GSE application: train a general NFL next-play event model on nflverse, fine-tune per team as 32 team-context simulators for scenario exploration — never as predictions — and only adopt if fine-tuned models beat both an Elo simulation baseline and the unfine-tuned general model.

### 1.7 Player Tracking & Computer Vision

**next-gen-scraPy: Extracting NFL Tracking Data from Images** (arXiv:1906.03339) — Verdict: ADOPT
Method: an image-processing pipeline (K-Means++ clustering + DBSCAN denoising) that recovers raw pass locations from the NFL's Next Gen Stats pass charts; builds league-wide and QB/team-defense completion surfaces by field location with a GAM + 2-D KDE, shrinks group surfaces toward the league surface via empirical-Bayes 2-D Naive Bayes, and defines completion percentage above expectation (CPAE) as the spatial-density-weighted integral. Scraped coordinates deviate from Big Data Bowl by 1.7 yards median; CPAE correlates 0.81–0.91 with the NFL's official NGS CPAE and is stable year-to-year (0.41).
GSE application: replicate CPAE as an open-data benchmark and build QB/defense matchup surfaces by pass location — directly feeds prop edges (pass-location-based completion probability by route area).

**Sports-Traj: A Unified Trajectory Generation Model for Multi-Agent Movement in Sports** (arXiv:2405.17680v2) — Verdict: ADOPT
Method: UniTraj, a conditional-VAE that treats every input as an arbitrarily masked trajectory and generates the complete one — one model unifying trajectory prediction, imputation, and spatiotemporal recovery for all 22 players + ball. Combines a spatial Transformer encoder with a bidirectional temporal Mamba encoder and a winner-take-all diversity loss (K=20 trajectories). Beats 9 baselines by 11–28% on minADE20 including on NFL data, with open code/datasets/checkpoints.
GSE application: the generative core of the tracking pipeline — trajectory imputation for occluded/missing frames, 20-plausible-continuation forecasts for separation/YAC/tackle-probability features, and counterfactual play simulation as a generative complement to EPA models.

**Training-Free Long-Term Multi-Object Tracking for Sports Video Analytics** (arXiv:2608.15688v1) — Verdict: ADOPT
Method: McByte++, a training-free tracking-by-detection pipeline (ByteTrack base) adding mask-guided association invoked only in ambiguity/isolation cases, selective online re-identification against a long-term identity memory at tracklet initialization only, and conditional camera-motion compensation. Achieves 87.5 HOTA / 84.5 IDF1 on SoccerNet and 79.9/83.6 on SportsMOT at 8–15 FPS — best online among tracking-by-detection methods.
GSE application: the deployable path to player tracks from broadcast/All-22 video without annotated training data — feeds telestrated content clips and trajectory features where NGS tracking is unavailable.

**SportMamba: Efficient Multi-Object Tracking for Fast-Moving Sports** (arXiv:2506.03335v1) — Verdict: ADAPT
Method: online tracking-by-detection with a Mamba selective state-space motion predictor over box history, height-adaptive extended-IoU + appearance hybrid association, confidence-split matching (high-confidence detections use appearance; low-confidence spatial-only), and confidence-adaptive EMA for appearance embeddings. The paper's "superior across all metrics" claim is contradicted by its own table — treat as a design to test, not a result to trust.
GSE application: reuse the hybrid motion+appearance association design (not the headline claim) for extracting player tracks from public broadcast footage; adopt only if it beats ByteTrack by ≥3 HOTA points with the same detector on football plays.

**Unsupervised Identification of Pass Coverage** (arXiv:1906.11373v3) — Verdict: ADAPT
Method: builds per-cornerback-per-play feature vectors from tracking data (trajectory + spacing relationships between snap and pass) and fits Gaussian mixture models + hierarchical clustering to discover man vs zone behaviors — outputting probabilistic coverage assignments (posterior man-like vs zone-like) rather than forced charting labels. No labeled accuracy is reported (no labels exist).
GSE application: replicate as a weak labeler for man/zone coverage on modern tracking data (the public baseline for what NGS keeps proprietary), then upgrade to a supervised team-structure-aware classifier; use the GMM posteriors as soft targets.

### 1.8 Causal Inference in Sports

**Framing Causal Questions in Sports Analytics: A Tutorial on Estimand Choice Illustrated Through Crossing in Soccer** (arXiv:2505.11841v2) — Verdict: ADOPT
Method: an estimand-first causal protocol — explicitly choose ATE vs ATT vs ATNT *before* estimating, with propensity-score matching, standardized-mean-difference balance diagnostics (<10% gate), and dual standard errors (Abadie–Imbens + bootstrap). The tutorial's contribution is process discipline: identification assumptions (consistency, positivity, no interference, no unmeasured confounding) stated in the sports context before any code runs.
GSE application: adopt as the causal-analysis SOP for every causal question (injury impact, coaching changes, rule changes, scheme shifts); NFL-ize with team-season-clustered SEs and Rosenbaum sensitivity bounds.

**The Effects of Major League Baseball's Ban on Infield Shifts: A Quasi-Experimental Analysis** (arXiv:2411.15075v1) — Verdict: ADOPT
Method: a complete, reproducible quasi-experimental blueprint — difference-in-differences (treated vs control groups, 2023 vs 2022) for league-wide effects, plus synthetic control per treated unit vs a donor pool for player-specific effects, with pre-registered treatment/control construction, a placebo battery (in-unit, in-time, donor-placebo inference), and persistence checks. The paper itself cites the NFL's 2024 kickoff overhaul as a motivating example.
GSE application: install DID + synthetic control as the standard quasi-experimental toolkit — first NFL application is the 2024 kickoff rule change (touchback rate, starting field position), second is causal injury impact via synthetic controls on team-seasons losing a starting QB.

### 1.9 Player Evaluation, Props & DFS

**Opponent-Adjusted Evaluation of NFL Pass Blocking and Pass Rushing Performance** (arXiv:2604.01491v1) — Verdict: ADAPT
Method: ridge-regularized Bradley-Terry paired-comparison models producing opponent-adjusted, interpretable OL/DL ratings from tracking data — a binary win/loss version (2.5-second distance rule) and a severity version (multinomial over loss/win/hit/sack with EPA-anchored severity weights). Honest about small gains: 0.24–1.21% relative log-loss over strong matchup baselines; data source (proprietary Hudl) is unavailable to GSE.
GSE application: genuinely new capability (STRAIN/PBWR lack opponent adjustment) — reimplement the severity-weighted BT on public Big Data Bowl tracking data and feed weekly opponent-adjusted rusher/blocker ratings into dropback-EPA and sack-probability submodels.

**NFL Career Success as Predicted by NFL Scouting Combine** (arXiv:2303.05774) — Verdict: ADAPT
Method: a clean null result with real value — combine drills predict draft matriculation (83% accuracy) but explain only 17% of variance in career snaps (R²=0.17). The actionable finding is the feature-importance discrepancy: the 3-cone drill is the most important drill for getting drafted but the *worst* predictor of actual NFL snaps — scouts systematically overweight it.
GSE application: use as a negative prior — cap combine-feature weights in rookie projections (γ≤0.1, 3-cone excluded for skill positions, broad jump allowed small positive weight); draft-market angle: fade combine-driven draft risers in rookie props.

**PlayeRank: data-driven performance evaluation and player ranking in soccer via a machine learning approach** (arXiv:1802.04987v3) — Verdict: ADAPT
Method: learns event-importance weights by training a linear SVM on team-aggregated player feature vectors against binary match outcomes (team outcome as a proxy for performance quality), then rates each player's per-match performance as the weight·feature dot product, smoothed with EWMA; role detection via k-means on each player's mean event coordinates gives role-based leaderboards. Scouts validated the roles better than mono-dimensional baselines.
GSE application: port to NFL — learn per-event win-contribution weights from team outcomes, rate players weekly with EWMA form ratings, detect roles from snap coordinates; feed role-relative ratings into the prop model as matchup-adjusted quality features.

**Explainable expected goal models for performance analysis in football analytics** (arXiv:2206.07212v2) — Verdict: ADAPT
Method: the modeling (ROSE-oversampled random forest) is explicitly rejected — oversampling worsens probability calibration. The adopted asset is the explanation tool: aggregated ceteris-paribus profiles (AP), a "semi-global explainer" sitting between local profiles and global partial dependence — averaging what-if curves over a group (a team's shots in a match, a player's season).
GSE application: build the AP what-if layer over GSE's existing expected-metric models ("what would this WR's expected yards look like if his aDOT were 2 yards shorter") for prop research and content graphics, with bootstrap CIs and out-of-support shading; never ROSE-sample a GSE probability model.

**Method and Validation for Optimal Lineup Creation for Daily Fantasy Football Using Machine Learning and Linear Programming** (arXiv:2309.15253v2) — Verdict: REJECT (as a production approach)
Method: a neural network projects player fantasy points, then a MILP picks the FPTS-maximizing lineup under DraftKings salary/roster constraints. Lineups finished at the ~31st percentile against real DraftKings users — losing to ~69% of the field. Point-estimate maximization is exactly what real winning-lineup construction supersedes.
GSE application: retain only the MILP skeleton as a sanity-check baseline inside the existing optimizer; the missing piece (distributional projections — mean + variance + within-game correlation — optimizing expected payout, not expected points) is what Garrett's practice already does and the paper never attempts.

**Diversity is Key: Fantasy football dream teams under budget constraints** (arXiv:2211.02417v3) — Verdict: ADAPT
Method: a three-step dominance-pruning algorithm that reduces the combinatorial lineup space (~10^23 possible XIs) to a tractable set while provably preserving optima (verified against integer programming), plus the empirical regularity that 72% of optimal ex-post lineups have diverse salary distributions rather than stars-and-scrubs clumps.
GSE application: lift the dominance-pruning preprocessor into the DFS optimizer for order-of-magnitude MILP speedup on larger pools; test lineup-diversity constraints as a GPP construction heuristic, adopted only if diversity-constrained sets show realized ROI improvement.

### 1.10 Simulation, Season Forecasting & Tournament Evaluation

**Smart Sports Predictions via Hybrid Simulation: NBA Case Study** (arXiv:2304.09918v2) — Verdict: ADOPT
Method: hybrid discrete-event + agent-based season simulation — ratings from single summary statistics (win pct / net rating), outcomes via Bernoulli race or largest-value rules, plus rule-based rational-incentive adjustments (tanking teams weakened, resting playoff-locked teams weakened). Two portable findings: per-predictor optimal historical lookback windows (more data is not always better) and late-season incentive adjustments that measurably improve accuracy.
GSE application: sweep per-predictor trailing windows on nflverse instead of one-size-fits-all recency; add weeks 16–18 incentive modifiers (locked seeds, eliminated teams chasing draft position) to the season simulator — both pre-registered with walk-forward gates.

**Neural Sabermetrics World Model** (arXiv:2602.07030v1) — Verdict: ADAPT
Method: continued-pretrains a Llama 3B on serialized baseball games with next-token prediction to test whether "neural sabermetrics" emerges from next-token learning. The headline swing-decision gains are large but the pitch-type gains are nil (+0.004 accuracy) — the paradigm is the asset, the 3B MLB artifact is not.
GSE application: do not replicate the 3B model; prototype a small structured event-sequence model (tens of millions of params) over discretized nflverse play-by-play, and adopt only if sequence history beats the current-state logistic baseline by ≥0.02 log-loss with ECE ≤0.03 — otherwise it's expensive theater.

**AI World Cup 2026: benchmarking large language models for end-to-end football tournament prediction** (arXiv:2608.03416v1) — Verdict: ADOPT
Method: a prospective tournament-forecasting protocol — ten LLMs made one pre-tournament full-tournament forecast under identical conditions (same snapshot, prompt, JSON schema, additive scoring code), with stage-decomposition audit. Two mandatory design critiques: the knockout component drove essentially all leaderboard separation (r=0.986 — the leaderboard ranked knockout skill, not overall skill), and self-reported confidence was uncorrelated with accuracy (r≈−0.06).
GSE application: adopt the protocol wholesale for NFL season/playoff forecasting evaluation (frozen pre-season snapshot, common schema, additive scoring, audit) — with two mandatory modifications: add a proper scoring rule alongside the points leaderboard, and normalize component variances before ranking.

### 1.11 Predictability Bounds

**Luck is Hard to Beat: The Difficulty of Sports Prediction** (arXiv:1706.02447v1) — Verdict: ADAPT
Method: a skill coefficient φ — the excess variance of season-end standings relative to a schedule-preserving random null (Monte Carlo replays of the actual schedule with outcomes drawn from observed home/tie/away frequencies) — classifying leagues/seasons as skill-dominated vs luck-compatible, over 270,713 matches across 198 leagues. The paper's NBA roster/salary model is dated and in-sample; take the null, leave the model.
GSE application: use φ as a diagnostic for how much of standings variance is irreducible noise — calibrating honest uncertainty ceilings per league/season rather than chasing phantom predictability.

### 1.12 Data Infrastructure

**SportSQL: An Interactive System for Real-Time Sports Reasoning and Visualization** (arXiv:2508.17157v1) — Verdict: ADOPT
Method: a text-to-SQL-over-live-sports-data architecture — LLM sees only the schema (not the data) and emits SQL against MariaDB, with entity resolution for team/player mentions, just-in-time materialized views for expensive temporal queries, and dataframe byte-for-byte verification before any visualization renders. GPT-4o reached 0.75 overall correctness; the bottleneck is compositional queries with joins/aggregations (~50% beyond three primitives).
GSE application: port to the GSE stack as the natural-language research-query layer over Neon Postgres (read-only role, SELECT-only allowlist, statement timeouts) — entity resolution over NFL teams/players, persistent core tables + on-demand per-gameweek views.

---

### Indexed, not deep-read

One line per paper: title (arXiv ID) — verdict | normalized lane — one-line method from the index.

**Influence of a Humidor on the Aerodynamics of Baseballs** (0712.0380) — ADAPT | weather — Two-part: (a) controlled experiment measuring fractional diameter d/d_dry and mass m/m_dry vs RH with linear fits; (b) numerical trajectory…
**A Bayesian Variable Selection Approach to Major League Baseball Hitting Metrics** (0911.4503v1) — ADAPT | win_spread_total — Hierarchical Bayesian mixture ("spike-and-slab", George & McCulloch 1997 style): y_ij ~ Normal(μ + α_i, w_ij·σ²); μ ~ Normal(0, K²=10000), σ² ~…
**Random Walk Picture of Basketball Scoring** (1109.2825v2) — ADAPT | team_ratings — Scoring rate: temporally homogeneous Poisson-like, 0.03291 plays/sec (~94.78 scoring plays/game); inter-score intervals exponential with λ_tail =…
**Scoring Strategies for the Underdog: A general, quantitative method for determining optimal sports strategies** (1111.0693v1) — ADAPT | tracking — Each play type i has point value v_i, usage count N_i, success probability p_i. Total score mean μ = Σ_i v_i N_i p_i and variance
**A network-based dynamical ranking system for competitive sports** (1203.2228v2) — ADAPT | team_ratings — Extends Park & Newman win-lose score (W = A(I−αA)⁻¹, w = Wᵀ1, ℓ from Aᵀ, s = w−ℓ).
**Effects of Social Influence on the Wisdom of Crowds** (1204.3463) — ADAPT | abstention — Agents as Brownian particles with mean-field coupling (eq. 3): dx_i(t)/dt = α_i(⟨x(t)⟩ − x_i(t)) + β_i(x_i(0) − x_i(t)) + Dξ_i(t) — social influence…
**SportSense: Real-Time Detection of NFL Game Events from Twitter** (1205.3212v1) — ADAPT | nlp — Two stages: (1) keyword-based tweet retrieval (claimed 60% recall, <5% irrelevant-tweet false-positive rate); (2) matched-filter event detector…
**First Order Approximations of the Pythagorean Won-Loss Formula for Predicting MLB Teams' Winning Percentages** (1205.4750v1) — ADAPT | win_spread_total — Analytic proof: first-order multivariate Taylor expansion of f(x,y) = x^γ/(x^γ + y^γ) about (R_avg, R_avg), yielding WP ≈ 0.500 + [γ/(4R_avg)](RS −…
**Competing Process Hazard Function Models for Player Ratings in Ice Hockey** (1208.0799v2) — ADAPT | props_dfs — Two competing Cox processes: h(X,t) = h_0(t)·h_1(X) with h_0(t) = 1 (flat). Scoring rates: λ^h = exp(r^h + Σ_p(X_p^h ω_p + X_p^a δ_p)); λ^a =
**Semantic Understanding of Professional Soccer Commentaries** (1210.4854) — ADAPT | nlp — Four stages. (1) PairModel: for each (sentence, event) pair pij, fit a linear SVM (LibLinear, C=100, positive-class weighting) with the single pair…
**Scoring dynamics across professional team sports: tempo, balance and predictability** (1310.4461v2) — ADAPT | experimental — An "ideal competition" null model (level playing field, perfectly skilled teams, imperfect execution) reduced to two independent stochastic…
**Predicting the NFL using Twitter** (1310.6998v1) — ADAPT | markets — Model: logistic regression for three tasks (winner / winner-with-spread / over-under)
**The sensitivity of college football rankings to several modeling choices** (1403.7642) — ADAPT | team_ratings — The model is a multiple-membership GLMM for binary game outcomes: ri ∈ {0,1} is a home-win indicator; latent yi = Xiβ + Ziη + εi…
**Characterizing the spatial structure of defensive skill in professional basketball** (1405.0231v3) — ADAPT | tracking — Defender assignment: hidden Markov model mapping each defender to the offensive player he is guarding each frame. Defender's canonical location…
**Using Twitter to predict football outcomes** (1411.1243v1) — ADAPT | nlp — Bag-of-words from tweets: chi-square and mutual-information ranking of unigrams/bigrams, keeping 1–35 terms per side (separate vocabularies for home…
**Building an NCAA mens basketball predictive model and quantifying its success** (1412.0248v1) — ADAPT | win_spread_total — M₁ (spread model): logistic regression logit(Pr(y_g=1)) = β₀ + β₁·spread_g on all 65,043 games. For tournament games beyond round 1, the spread…
**Who's good this year? Comparing the Information Content of Games in the Four Major US Sports** (1501.07179v1) — ADAPT | tracking — Bradley–Terry paired-comparison model for win probability: logit(π_{i,j}) = β_i − β_j + α (α = home advantage). Margin-of-victory model: μ_{i,j} =…
**Safe Leads and Lead Changes in Competitive Team Sports** (1503.03509v1) — ADAPT | mixed — Model scoring as a biased random walk / diffusion: each scoring event is a step; team strength enters as drift (Péclet number).
**Predicting sports scoring dynamics with restoration and anti-persistence** (1504.05872v1) — ADAPT | mixed — Latent-skill Bradley–Terry extensions, one fitted per season (skills fixed within a season), via MCMC.
**Hockey Player Performance via Regularized Logistic Regression** (1510.02172v2) — ADAPT | props_dfs — Logistic regression on "which team scored goal i" (Equation 1): log[q_i/(1−q_i)] = α + u_i′γ + v_i′φ + x_i′β_0 + (x_i ∘ s_i)′(β_s + p_i
**A Scalable Framework for NBA Player and Team Comparisons Using Player Tracking Data** (1511.04351v2) — ADAPT | tracking — Standardize all 66 statistics; run PCA; retain the first 4 principal components (68% of variance; elbow after PC4). Interpret components via…
**Determining Tournament Payout Structures for Daily Fantasy Sports** (1601.04203v2) — ADAPT | props_dfs — Two-stage method: 1. Ideal payouts via power law: place i receives π_i = E + (P1 − E)/i^α, where E = entry fee (minimum payout),…
**Footballonomics: The Anatomy of American Football — Evidence from 7 Years of NFL Game Data** (1601.04302v6) — ADAPT | experimental — Rational-coaching test: Hypothesis 1 — coaching decisions maximize expected points scored
**Adjusting for Scorekeeper Bias in NBA Box Scores** (1602.08754v2) — ADAPT | tracking — Part 1 (team level): model each team's assist ratio (AR) and block ratio (BR) as a function of home/away, team, opponent, and scorekeeper generosity…
**Analyzing In-Game Movements of Soccer Players at Scale** (1603.05583v1) — ADAPT | tracking — Movement extraction: connect consecutive ball events involving the same player into movement vectors; infer speed as distance over the inter-event…
**Evaluating the Performance of Offensive Linemen in the NFL** (1603.07593v2) — ADAPT | props_dfs — Five-stage pipeline: (1) Stepwise OLS of cap value (avg $/yr, cap-inflation-adjusted) on 15 candidate predictors to learn what the NFL labor market…
**Picking Winners in Daily Fantasy Sports Using Integer Programming** (1604.01455v3) — ADAPT | props_dfs — Core theory: for a set S of k entries, define U(S) = P(∪_{i∈S} E_i) where E_i = "entry i wins". U is nonnegative, monotone, submodular…
**Estimating an NBA player's impact on his team's chances of winning** (1604.03186v1) — ADAPT | team_ratings — Shift-level Bayesian linear regression: y_i / P^i, T^i ~ N(μ + P^i'θ + T^i'τ, σ²), where y_i = change in home-team win probability during shift
**Applying Deep Learning to Basketball Trajectories** (1608.03793v2) — ADAPT | tracking — LSTM RNN: 2 stacked layers of LSTM with peephole connections. At each timestep the network outputs (a) make/miss probability via a softmax layer…
**Predictive modelling of football injuries** (1609.07480v1) — ADAPT | causal_injury — Inv.
**Meta-Analytics: Tools for Understanding the Statistical Properties of Sports Metrics** (1609.09830v1) — ADAPT | experimental — Three meta-metrics, all R²-style variance ratios: (1) Discrimination D_{sm} = 1 − E_{sm}[V_{spm}[X]] / V_{sm}[X] — fraction of between-player…
**Robust Analysis of Second-Leg Home Advantage in UEFA Football Through Better Nonparametric Confidence Intervals for Binary Regression Functions** (1701.07555) — ADAPT | win_spread_total — Nadaraya-Watson kernel regression p̂_h(x) = ΣK((x−Xᵢ)/h)Yᵢ / ΣK((x−Xᵢ)/h) (Gaussian kernel, h₀ = 0.525 by AIC) estimates the conditional…
**Spatial modeling of shot conversion in soccer to single out goalscoring ability** (1702.05662) — ADAPT | bayesian — Latent probit with spatial error process, fully Bayesian, Gibbs-sampled.
**A PageRank Model for Player Performance Assessment in Basketball, Soccer and Hockey** (1704.00583v1) — ADAPT | team_ratings — Directed graph: n player nodes + 1 goal node.
**Comparing probabilistic predictive models applied to football** (1705.04356v1) — ADAPT | win_spread_total — Two multinomial-Dirichlet models predicting second-half matches from current-championship W/D/L counts only.
**Effective Injury Forecasting in Soccer** (1705.08079v2) — ADAPT | causal_injury — Feature engineering: EWMA of workload features with span 6; ACWR with 6-day acute / 27-day chronic windows; monotony over seven days; prior-injury…
**Plus-Minus Player Ratings for Soccer** (1706.04943v1) — ADAPT | props_dfs — Segments = maximal intervals with fixed 22-player lineups (new segment on substitution, red card, new match). Target y_t per segment: goal…
**Multivariate Generalized Linear Mixed Models for Joint Estimation of Sporting Outcomes** (1710.05284v1) — ADAPT | props_dfs — Multivariate GLMM: each team j has (b_j^o offensive, b_j^d defensive, b_j^w win-propensity) ~ N_3(0, G) with unstructured 3×3 covariance…
**Pricing Football Players with Neural Networks (FIFA 2017)** (1711.05865v2) — ADAPT | props_dfs — Feedforward network [41, 2000, 1500, 500, 119]: ReLU hidden layers, softmax output over 119 price classes. Training: learning rate 0.01, decay 0.001,…
**"TenisRank": A new ranking of tennis players based on PageRank** (1711.11122v1) — ADAPT | team_ratings — Directed multigraph: edge loser→winner per match; PageRank (scipy) on the multigraph.
**Hierarchical Bayesian Bradley-Terry for Applications in Major League Baseball** (1712.05879v1) — ADAPT | team_ratings — Full hierarchical model (Eq. 22): σ ~ Γ(2N, 2N/σ̂²) where σ̂² is the estimated variance of λ_i in the previous season; λ/σ ~ N(0, σ²I);
**Heating Up in NBA Free Throw Shooting** (1801.07104) — ADAPT | causal_injury — Y_ijk = B(1, P_ijk); P_ijk = e^{X_ijk}/(1+e^{X_ijk}); X_ij ~ N(μi, Σi); (μi,Σi) ~ Ψ1. - Model 2: Z_ij = X_ij + Δ_h; Δ_h ~ N(0,…
**Modeling goal chances in soccer: a Bayesian inference approach** (1802.08664) — ADAPT | bayesian — Two independent components. (A) Chance counts: each fixture split into 6 × 15-minute blocks; N^j_{t_r,k} (team j's chances in block t_r of fixture k)…
**Model Trees for Identifying Exceptional Players in the NHL Draft** (1802.08765v1) — ADAPT | win_spread_total — Logistic regression model tree (LMT): tree partitions feature space on discrete values or learned continuous thresholds; each leaf fits its own…
**The Advantage of Doubling: A Deep Reinforcement Learning Approach to Studying the Double Team in the NBA** (1803.02940v1) — ADAPT | tracking — 1. MDP framing: state s_t = court configuration at second t; action a_t ∈ 20 discrete actions (stay home, or double leaving open the man
**Increased Prediction Accuracy in the Game of Cricket using Machine Learning** (1804.04226v1) — ADAPT | experimental — Targets as classification: runs in 5 classes (1–24 / 25–49 / 50–74 / 75–99 / ≥100); wickets in 3 classes (0–1 / 2–3 / ≥4)
**NFL Injuries Before and After the 2011 Collective Bargaining Agreement (CBA)** (1805.01271v1) — ADAPT | experimental — Descriptive counts per season + stratified curves (all / conditioning / non-conditioning / unknown), 2007–2016, pre-CBA (2007–2010) vs post-CBA…
**Predicting Football Tables by a Maximally Parsimonious Model** (1805.08937v1) — ADAPT | team_ratings — (1) Theory: for a predicted table permutation P of n teams with MAE = (1/n)Σ/P(i)−i/, derive min (0), max (n/2, attained by the reversed permutation,…
**A Skellam Regression Model for Quantifying Positional Value in Soccer** (1807.07536) — ADAPT | win_spread_total — Skellam regression on the score differential. Let X, Y = home/away goals (each ~Poisson), Z = X−Y.
**Augmenting Adjusted Plus-Minus in Soccer with FIFA Ratings** (1810.08032v1) — ADAPT | tracking — 1. Standard APM as ridge regression (equation 1): β̂ = argmin_β ‖y − Xβ‖²₂ + λ‖β‖²₂ (Sill 2010). 2. Bayesian recast (equation 2): y/β ~
**Risk-Neutral Pricing and Hedging of In-Play Football Bets** (1811.03931v1) — ADAPT | experimental — Score model: two independent time-homogeneous Poisson processes N¹_t, N²_t with physical intensities μ₁, μ₂ (home/away goals)
**1721 FTR-18: collecting rumours on football transfer news** (1812.00778) — ADAPT | nlp — No classifier is trained — this is a dataset-construction paper ("ongoing work").
**Markov Decision Processes with Dynamic Transition Probabilities: An Analysis of Shooting Strategies in Basketball** (1812.05170) — ADAPT | bayesian — Plays = episodes of a finite MDP ⟨S, A, P(·), R(·)⟩ with binary actions {Shoot, Not Shoot}.
**Early Detection of Injuries in MLB Pitchers from Video** (1904.08916v1) — ADAPT | causal_injury — Preprocessing: crop to pitcher bounding box from 1920×1080; convert to greyscale; compute optical flow (appearance-invariant: immune to jersey, team,…
**A Bayesian Marked Spatial Point Processes Model for Basketball Shot Chart** (1908.05745) — ADAPT | bayesian — Marked point process (S, M): locations from NHPP with λ(s_i) = λ_0 exp(X(s_i)^T β) (1), where X = 10 NMF basis "shot types" (basis 1:…
**Stochastic Differential Theory of Cricket: Closed-Form In-Play Win Probability via Brownian and Ornstein–Uhlenbeck Models** (1908.07372) — ADAPT | win_spread_total — Model 1 (Brownian): dX_t = μdt + σdW_t → X(t) = μt + σW_t ≈ N(μt, σ²t). Model 2 (wicket shocks): μ(t) = μ −…
**Evaluating probabilistic forecasts of football matches: The case against the Ranked Probability Score** (1908.08980v1) — ADAPT | calibration — - Brier = Σ_i(p_i − o_i)² (eq. 1); RPS = Σ_{i=1}^{r−1}Σ_{j=1}^i(p_j − o_j)² (eq.
**Football is becoming more predictable; Network analysis of 88 thousands matches in 11 major leagues** (1908.08991v2) — ADAPT | experimental — Training window: for each match, use past N matches; normalize by season length T: n = N/T; all headline results use n = 0.5
**Finding your feet: A Gaussian process model for estimating the abilities of batsmen in Test cricket** (1908.11490v2) — ADAPT | team_ratings — Likelihood: hazard H(x) = P(X=x/X≥x) (eq. 1); not-out scores treated as right-censored, likelihood P(X≥x) (eqs. 2–3). Effective average: H(x) =…
**Bigger data, better questions, and a return to fourth down behavior: an introduction to a special issue on tracking data in the National Football League** (1909.10631v3) — ADAPT | tracking — 1. Confounder demonstration: density plots of precise yards-to-go split by decision (go/punt/FG) within integer buckets (4th-and-1, 4th-and-2); two…
**Template-free Data-to-Text Generation of Finnish Sports News** (1910.01863) — ADAPT | nlp — Two stages: (1) Event selection — CRF sequence labeler over the game's event sequence with per-event features, binary include/exclude labels, class…
**Beating the House: Identifying Inefficiencies in Sports Betting Markets** (1910.08858v2) — ADAPT | markets — Core engine (Eq. 2): non-parametric win probability P(Win / PS) = Historical Win % of Teams with Point Spread = PS — a team at
**Trouble with the Curve: Predicting Future MLB Players Using Scouting Reports** (1910.12622v1) — ADAPT | nlp — Benchmarks: Bag-of-Embeddings, TextCNN, LSTM+Self-Attention, Biattentive Classification Network (BCN), Hierarchical Attention Network (HAN).
**A regularized hidden Markov model for analyzing the "hot shoe" in football** (1911.08138) — ADAPT | bayesian — S_t ∈ {1,2}; P(Y_t = 1 / S_t = s, x_t) = logit^{-1}(α_s + x_t'β); α_s state-varying intercept, β shared. - Penalized log-likelihood: ℓ(α,β,Γ) −…
**SoccerDB: A Large-Scale Database for Comprehensive Video Understanding** (1912.04465) — ADAPT | sports_cv — Strong baselines per task + correlation experiments: (1) object detection — Faster R-CNN vs RetinaNet (ResNeXt-101-FPN, COCO pre-trained,…
**Measuring Spatial Allocative Efficiency in Basketball** (1912.05129v2) — ADAPT | team_ratings — FG% surfaces (Bayesian hierarchical, Cervone et al. 2016 adaptation): logit(π_j(s)) = β'x + Z_j(s) (eq. 1), x = [intercept, player position, shot…
**Multi-stream Data Analytics for Enhanced Performance Prediction in Fantasy Football** (1912.07441v1) — ADAPT | win_spread_total — - Per-position (goalkeeper/defender/midfielder/forward) gradient boosting machines (chosen over SVMs and random forests for robustness on the highly…
**Modelling Basketball Players' Performance and Interactions Between Teammates with a Regime Switching Approach** (1912.10417v1) — ADAPT | props_dfs — Three-step procedure
**Prediction and Evaluation in College Hockey using the Bradley-Terry-Zermelo Model** (2001.04226v2) — ADAPT | team_ratings — Bayesian Bradley-Terry: log-strengths λ_i ∈ (−∞,∞); win probability θ_ij = e^{λ_i}/(e^{λ_i}+e^{λ_j}) = logistic(λ_i − λ_j) (eq. 1.1). Likelihood:…
**Forecasting football matches by predicting match statistics** (2001.09097v1) — ADAPT | win_spread_total — 1. GAP ratings (from Wheatcroft 2020): each team gets 4 ratings per statistic — home attacking (Hᵃᵢ), home defensive (Hᵈᵢ), away attacking (Aᵃᵢ),…
**A copula-based multivariate hidden Markov model for modelling momentum in football** (2002.01193) — ADAPT | bayesian — Hidden states S_t ∈ {1,...,K}; state-dependent joint distribution f(y_t / S_t) = c(F_1(y_{1t}/θ_1), F_2(y_{2t}/θ_2); η) · f_1 · f_2, with F…
**The role of intrinsic dimension in high-resolution player tracking data -- Insights in basketball** (2002.04148v1) — ADAPT | tracking — Hidalgo (Allegra et al. 2019): a Bayesian mixture model of K Pareto distributions that estimates heterogeneous intrinsic dimensions — each…
**Player Chemistry: Striving for a Perfectly Balanced Soccer Team** (2003.01712v1) — ADAPT | props_dfs — JOI (Joint Offensive Impact): an interaction = two consecutive actions by two different players (p→q or q→p); its VAEP value = V(aᵢ^p) + V(aᵢ₊₁^q)…
**Investigating the efficiency of the Asian handicap football betting market with ratings and Bayesian networks** (2003.09384v2) — ADAPT | markets — Modified pi-ratings (3.1): each team carries home and away ratings; updated after each match with learning rate λ (recency) and cross-influence rate…
**Predicting play calls in the National Football League using hidden Markov models** (2003.10791v1) — ADAPT | props_dfs — Per-team 2-state HMM (N=2, Bernoulli state-dependent emissions), fitted individually to each team's training data (no pooling). Transition…
**Renormalizing individual performance metrics for cultural heritage management of sports records** (2004.08428v1) — ADAPT | props_dfs — Prowess: P_i(t) ≡ x_i(t)/y_i(t) (successes per opportunity); league average ⟨P(t)⟩ ≡ Σ_i x_i(t)/Σ_i y_i(t) (eq.
**SEAM Methodology for Context-Rich Player Matchup Evaluations in Baseball** (2005.07742) — ADAPT | props_dfs — SEAM (Synthetic-Estimation-Adjusted Matchup): estimates the batter–pitcher batted-ball location density as a convex combination of three KDEs: direct…
**Space-Time VON CRAMM: Evaluating Decision-Making in Tennis with Variational generatiON of Complete Resolution Arcs via Mixture Modeling** (2005.12853) — ADAPT | bayesian — (1) Generative: infinite Bayesian GMM on the functional encodings — A(ω)/z ~ MVN(μ_z, Σ_z) with stick-breaking Dirichlet process prior (v_i/α ~…
**Cracking the Black Box: Distilling Deep Sports Analytics** (2006.04551v4) — ADAPT | experimental — Black box (Sec. 3.3): deep RL action-value model: input layer → LSTM hidden layer → two fully-connected hidden layers → output layer; each hidden…
**1164 When Social Influence Promotes the Wisdom of Crowds** (2006.12471) — ADAPT | ensembles — - Collective estimate as convex combination of initial estimates: a_n(w̄) = Σ_i w_i a_{i,0}, w ordered decreasing. Simple mean = ω=0 case. -…
**1165 The Ambiguous Role of Social Influence on the Wisdom of Crowds: An Analytic Approach** (2007.15508) — ADAPT | ensembles — Stochastic opinion dynamics (Brownian agents, mean-field coupling): dx_i(t)/dt = α[⟨x(t)⟩ − x_i(t)] + β[x_i(0) − x_i(t)] + Aξ_i(t), where α = social…
**1714 Using social networks to improve group transition prediction in professional sports** (2009.00550) — ADAPT | nlp — For each observed transition, build a training row per candidate destination team with the features above; label = 1 for the actual destination, 0…
**LiveQA: A Question Answering Dataset over Sports Live** (2010.00526v1) — ADAPT | nlp — Dataset-construction paper plus baseline models: random (50.0%), dominant-option (56.4%), gated-attention reader (53.1%). The transferable artifact…
**Analysing Long Short Term Memory Models for Cricket Match Outcome Prediction** (2011.02122v1) — ADAPT | win_spread_total — Three-block network: (1) Input Transformation (IT) block — per-ball feature vector mapped to a higher-dimensional vector, shared across all balls in…
**The causal effect of a timeout at stopping an opposing run in the NBA** (2011.11691) — ADAPT | causal_injury — Run duration: δt = min{argmax_d(/Δ(t)−Δ(t−d)/ : 0<d≤2)}. - Signed run point total: s(t) = Δ(t)−Δ(t−δt) if /·/≥9, else NA; run point total…
**A New Action Recognition Framework for Video Highlights Summarization in Sporting Events** (2012.00253) — ADAPT | sports_cv — Three-level Boolean prediction algorithm, run separately on YOLOv3 and OpenPose backbones
**Combining Machine Learning and Human Experts to Predict Match Outcomes in Football: A Baseline Model** (2012.04380v1) — ADAPT | nlp — Five-stage pipeline (Fig. 1)
**Estimating the change in soccer's home advantage during the Covid-19 pandemic using bivariate Poisson regression** (2012.14949) — ADAPT | bayesian — (Y_Hi, Y_Ai) = BP(λ_1i, λ_2i, λ_3i); λ_1i+λ_3i and λ_2i+λ_3i are home/away goal expectations; λ_3i is the covariance. - log(λ_1i) = μ_ks +…
**A Probabilistic Model for Predicting Shot Success in Football** (2101.02104v1) — ADAPT | win_spread_total — - Shot-success model (parametric rating system): for home team i vs away team j, p(G_h) = 1/(1+e^(−m_h)) with m_h = c + h + ½(a_i…
**Evaluating Soccer Player: from Live Camera to Deep Reinforcement Learning** (2101.05388v1) — ADAPT | markets — Two-part system, code-named "Narya" (Sections 3–4, Figure 2): Tracking model (3 steps): ET (entity tracking): Single Shot MultiBox Detector (SSD, Liu…
**Bayesian GARCH Modeling of Functional Sports Data** (2101.08175v1) — ADAPT | team_ratings — Hierarchical Bayesian additive model: y_ij = g_i(t_ij) + ε_ij, ε_ij ~ N(0, ψ²), with g_i(t) = f_i(t) + μ_is + x_i(t)β. (1) Functional component f_i(t)
**Markov Cricket: Using Forward and Inverse Reinforcement Learning to Model, Predict And Optimize Batting Performance in ODI Cricket** (2103.04349v1) — ADAPT | experimental — Markov Reward Process + Monte Carlo value learning: reward = fraction of total runs scored in the state
**Flexible marked spatio-temporal point processes with applications to event sequences from association football** (2103.04647) — ADAPT | live_ingame — The core trick is a Cox (1975)-style factorization of the marked point process likelihood: L = Π g(ti / Fti−1; ζ) f(mi / ti, Fti−1;…
**SportsCap: Monocular 3D Human Motion Capture and Fine-grained Understanding in Challenging Sports Videos** (2104.11452) — ADAPT | sports_cv — (1) Motion Embedding Module: split each sport into sub-motions (WS-DAN classifier, ~96% avg accuracy on diving/vault/beam/bars); per sub-motion,…
**The Anatomy of Corner 3s in the NBA: What makes them efficient, how are they generated and how can defenses respond?** (2105.12785v1) — ADAPT | tracking — Three analyses. (1) Efficiency decomposition: a logistic regression for shot-make probability using only shooter–basket distance, comparing the…
**SOCCER: An Information-Sparse Discourse State Tracking Collection in the Sports Commentary Domain** (2106.01972) — ADAPT | nlp — Two baselines. (a) GRU classifier: frozen pretrained BERT sentence embeddings of c_t → 1-layer GRU → 2 feed-forward layers; the 10 team-level event…
**UEFA EURO 2020 Forecast via Nested Zero-Inflated Generalized Poisson Regression** (2106.05174v1) — ADAPT | experimental — Nested ZIGP regression for one match between A (higher Elo) and B
**More on verification of probability forecasts for football outcomes: score decompositions, reliability, and discrimination analyses** (2106.14345v2) — ADAPT | calibration — Forecasting model (App. A): Poisson loglinear on scorelines y_{ij,k}^(t) / λ ~ P(λ_{ij(t,k)}), log λ_{ij(t,1)} = η + h + β1∆r_{ij}(t′) + β2…
**Implementing the BBE Agent-Based Model of a Sports-Betting Exchange** (2108.02419v1) — ADAPT | markets — Race dynamics (Eq. 1): d_c(t+δt) = d_c(t) + S_c(t); S_c(t, f⃗_r, d⃗) = R_c(t,d⃗)·P_c(f⃗_r,p⃗_c)·δ(v⃗_c) if Δ_c(t) > θ_c (clear track ahead), else…
**Video Pose Distillation for Few-Shot, Fine-Grained Sports Action Recognition** (2109.01305) — ADAPT | sports_cv — Video Pose Distillation (VPD): a ResNet-34 student F takes RGB crop x_t (128×128) + RAFT optical flow φ_t (5 input channels) around the athlete and
**6MapNet: Representing Soccer Players by a Triplet Network** (2109.04720) — ADAPT | tracking — 1. Per player-phase entity, build two heatmaps on 35×50 grids: a location heatmap (pitch) and a direction heatmap of velocity-vector endpoints with…
**Towards optimized actions in critical situations of soccer games with deep reinforcement learning** (2109.06625v1) — ADAPT | experimental — Markovian possession model: finite-state automaton (Start → Keep → Loss/Shot); episode = possessions until loss or shot; critical situations =…
**The Impact of COVID-19 on Sports Betting Markets** (2109.07581v1) — ADAPT | markets — Implied probability from moneyline odds: p_u = 100/(100+/o_u/) for o_u ≥ 100 (eq.
**Three-Stream 3D/1D CNN for Fine-Grained Action Classification and Segmentation in Table Tennis** (2109.14306) — ADAPT | sports_cv — Three parallel branches: RGB and OF streams through 3D spatio-temporal convolutions (3 layers: 30/60/80 filters of 3×3×3, max-pool 2×2×2, attention…
**A Markov process approach to untangling intention versus execution in tennis** (2110.01527v1) — ADAPT | tracking — State (§4.1.1): s = (σ_A, σ_B, ω): both players' locations + shot type (serve/serve-return/rally), from Player A's perspective at ball-strike moment;…
**SportsSum2.0: Generating High-Quality Sports News from Live Text Commentary** (2110.05750) — ADAPT | nlp — Reranker-enhanced summarizer: (1) context-aware selector — RoBERTa-large binary classifier over target sentence + sliding context window ([CLS] c1…
**Large Scale Diverse Combinatorial Optimization: ESPN Fantasy Football Player Trades** (2111.02859v3) — ADAPT | props_dfs — - Player valuation: three parallel pipelines — (a) SME rules (tiered expert features, boom/bust ratios, positional decay, injury/COVID/IR penalties,…
**Deep Artificial Intelligence for Fantasy Football Language Understanding** (2111.02874v1) — ADAPT | nlp — Pipeline: ingestion → NLP entity/relation extraction → doc2vec embeddings (94 GB) → deep classifiers (reported as 98 layers) for boom, bust, hidden…
**Features selection in NBA outcome prediction through Deep Learning** (2111.09695v1) — ADAPT | markets — Features computed ex ante (pre-game): Four Factors (eFG%, TOV%, ORB%, FT/FGA) for each team, Elo rating, relative victory frequency.
**Knowledge Enhanced Sports Game Summarization** (2111.12535) — ADAPT | nlp — KES: (1) selector — RoBERTa-Large over target sentence + sliding context window (avg token embeddings → sigmoid, cross-entropy); (2) knowledge…
**Bradley-Terry Modeling with Multiple Game Outcomes with Applications to College Hockey** (2112.01267v1) — ADAPT | team_ratings — Three models compared: (a) standard Bradley-Terry (all wins equal); (b) Bradley-Terry–Davidson with ties (overtime games treated as ties); (c) a new…
**Retrodictive Modelling of Modern Rugby Union: Extension of Bradley-Terry to Multiple Outcomes** (2112.11262v1) — ADAPT | markets — Maximum-entropy extension: for teams i, j with strength parameters π and outcome scores a, b: p^{ij}_{a,b} ∝ π_i^a π_j^b — the MaxEnt distribution…
**Forecasting number of corner kicks taken in association football using compound Poisson distribution** (2112.13001v3) — ADAPT | markets — Five Bayesian candidate models fit in Stan (NUTS, 4,000 iterations each): (A) geometric-Poisson regression; (B) geometric-Poisson with shape…
**Tired of Misattribution, Modeling Player Fatigue in the NBA** (2112.14649v1) — ADAPT | calibration — - Workload analysis: Second Spectrum player distance data vs performance. - Case study: Kawhi Leonard load-management games vs played games. -…
**An Analysis of an Alternative Pythagorean Expected Win Percentage Model: Applications Using Major League Baseball Team Quality Simulations** (2112.14846) — ADAPT | win_spread_total — Two contest success functions (CSFs) for expected win percentage: Tullock (ratio) form — the Pythagorean: EWP = rs^α/(rs^α + ra^α), α > 0 =…
**A Statistical Model of Serve Return Impact Patterns in Professional Tennis** (2202.00583v1) — ADAPT | team_ratings — Two-level generative process: (1) θ_k ~ G(·) (style→pattern simplex via ordered stick-breaking); (2) π_i ~ Dirichlet(α_0) (receiver i's distribution…
**Comparison of Combination Methods to Create Calibrated Ensemble Forecasts for Seasonal Influenza in the U.S.** (2202.11834) — ADAPT | ensembles — Six combiners compared: LP (linear pool): f_LP(y) = Σₘ ωₘ fₘ(y), ω ≥ 0, Σω = 1 — Eq. 1.
**Skating-Mixer: Long-Term Sport Audio-Visual Modeling with MLPs** (2203.03990) — ADAPT | multimodal_fusion — Skating-Mixer = MLP-Mixer blocks (token-mixing + channel-mixing MLPs, linear complexity) composed into:
**Predicting Cricket Outcomes using Bayesian Priors (arXiv:2203.10706) — replaces [1539]** (2203.10706) — ADAPT | bayesian — (1) Stratified random sampling: playing XI drawn by strata (CWC: fast bowler, spinner, all-rounder-fast, all-rounder-spinner, batsman, wicket-keeper;…
**Efficient tracking of team sport players with few game-specific annotations** (2204.04049v1) — ADAPT | tracking — Tracklet generation (§3.2): Faster R-CNN ResNet-50 (COCO-trained) detects persons; SORT-style IoU bipartite matching + Kalman filter links boxes;…
**Graph Neural Network based Agent in Google Research Football** (2204.11142v1) — ADAPT | tracking — DQN with experience replay; the Q-network is a GNN instead of a CNN. Two variants
**Bayesian estimation of in-game home team win probability for college basketball** (2204.11777) — ADAPT | bayesian — Five estimators: (1) MLE p̄_{t,ℓ} = n_{t,ℓ}/N_{t,ℓ} (binomial per cell).
**Nested Zero Inflated Generalized Poisson Regression for FIFA World Cup 2022** (2205.04173v3) — ADAPT | team_ratings — Per match (A = stronger by Elo): (1a) ZIGP regression of A's goals on B's Elo + location: log μ_A(Elo_B) = α₀⁽¹⁾+α₁⁽¹⁾Elo_B+α₂⁽¹⁾loc; φ_A =…
**How Much Does Home Field Advantage Matter in Soccer Games? A Causal Inference Approach for English Premier League Analysis** (2205.07193v2) — ADAPT | causal_injury — Hierarchical causal model with paired home/away differencing
**A Survey on Video Action Recognition in Sports (arXiv:2206.01038v1) — REPLACEMENT for 0620** (2206.01038v1) — ADAPT | experimental — The survey's taxonomy (Section III)
**Performance Prediction in Major League Baseball by Long Short-Term Memory Networks** (2206.09654v1) — ADAPT | experimental — Five LSTM architectures (A–E): stacked LSTM layers (32–128 cells, ≤3 layers) → dropout/batch-norm → timestep-wise dimension reduction (model D) → FC…
**Doubly-online changepoint detection for monitoring health status during sports activities** (2206.11578v1) — ADAPT | experimental — Latent changepoint chain S_1:N with S_1 = 1, S_n − S_{n−1} = 1 iff changepoint at activity n; transition p(S_n/S_{n−1}) = λ for a new
**Predicting Ulnar Collateral Ligament Injury in Rookie Major League Baseball Pitchers** (2207.00585v1) — ADAPT | causal_injury — - Split 80/20 "according to year" (exact split years not stated); oversampling applied to the training set; K-best feature selection reduced 47 → 13…
**Bayesian estimation of in-game home team win probability for NBA games** (2207.05114) — ADAPT | bayesian — Likelihood: Binomial(N_cell, p); prior Beta(α(t,ℓ), β(t,ℓ)) from expert poll (experts give win probabilities at anchor (t,ℓ) points; interpolated). -…
**GOAL: Towards Benchmarking Few-Shot Sports Game Summarization** (2207.08635) — ADAPT | nlp — No new model — benchmark paper. Evaluated end-to-end baselines: Longest-k, TextRank, PacSum (extractive); PGN (LSTM abstractive); LED-base-16384…
**GCN-WP: Semi-Supervised Graph Convolutional Networks for Win Prediction in Esports** (2207.13191) — ADAPT | win_spread_total — BuildLeagueGraph (Algorithm 1): for each team, sort games by time; add one node per team-game with its features; add an undirected edge from node gᵢᵗ…
**Using Conformal Win Probability to Predict the Winners of the Cancelled 2020 NCAA Basketball Tournaments** (2208.08598) — ADAPT | calibration — (1) Team strength via linear margin-of-victory model y_uvw = x_uvw′β + ε_uvw with x encoding home-court μ plus θ_u − θ_v strength differentials…
**Group Activity Recognition in Basketball Tracking Data -- Neural Embeddings in Team Sports (NETS)** (2209.00451v1) — ADAPT | team_ratings — NETS (Neural Embeddings for Team Sports): (1) per-object LSTM embeds the L-frame trajectory time series of each of the 11 objects; (2) a 3-dim one-hot
**Prediction of the outcome of a Twenty-20 Cricket Match: A Machine Learning Approach** (2209.06346v2) — ADAPT | experimental — Three approaches: (1) raw/aggregated player stat features (352 → 44 → 22 → 2 features/instance) into AdaBoost, Decision Trees, Naïve Bayes, Random…
**Observation Centric and Central Distance Recovery on Sports Player Tracking** (2209.13154v1) — ADAPT | tracking — Observation-centric tracking (§3.1): OC-SORT as the base tracker. Observation-Centric Online Smoothing rebuilds a virtual trajectory when a lost…
**Betting the system: Using lineups to predict football scores** (2210.06327v3) — ADAPT | experimental — Two independent regression models per match: home goals scored, away goals scored; combined into scoreline
**Going for GOAL: A Resource for Grounded Football Commentaries** (2211.04534v1) — ADAPT | nlp — Four tasks: (1) commentary retrieval (given video, retrieve matching commentary); (2) frame reordering (order shuffled frames); (3) moment retrieval…
**Predicting Football Match Outcomes with eXplainable Machine Learning and the Kelly Index** (2211.15734v1) — ADAPT | markets — Kelly Index K_H = (O_H/avgO_H)·F_99 (bookmaker odds ÷ mean odds × payout rate), per outcome, per bookmaker.
**Converting College Football Point Spread Differentials to Probabilities** (2212.08116v1) — ADAPT | win_spread_total — 1. Fit a zero-mean cumulative normal to the historical margin probabilities (area over (s−0.5, s+0.5) per integer margin s).
**A Bayesian Mixture Model Approach to Expected Possession Values in Rugby League** (2212.10904v1) — ADAPT | team_ratings — A Bayesian Mixture Model with fixed weights and learned centre probabilities. 33 centres placed by expert consultation: 30 in the field of play (x ∈
**What Should Clubs Monitor to Predict Future Value of Football Players** (2212.11041v1) — ADAPT | props_dfs — - Per-position models (8 positions: GK, FB, CD, CDM, MD, AM, WG, FWD; sample sizes 1,227–4,112 per Table 1b). - Lasso regression (λ set 0.004–0.01…
**Sport Task: Fine Grained Action Detection and Classification of Table Tennis Strokes from Videos for MediaEval 2022** (2301.13576) — ADAPT | sports_cv — Task protocol design (the paper's contribution): subtask 1 = global + per-class accuracy on trimmed clips; subtask 2 = COCO-style temporal mAP (20…
**Inferring Player Location in Sports Matches: Multi-Agent Spatial Imputation from Limited Observations** (2302.06569v1) — ADAPT | tracking — Feature engineering (§4.1): agent-specific: prevAgentTime/X/Y (time/location since last on-ball), nextAgentTime/X/Y (time/location until next on-ball…
**Transformer-Based Neural Marked Spatio Temporal Point Process Model for Football Match Events Analysis** (2302.09276v1) — ADAPT | props_dfs — NMSTPP: five stages. (1) Input: trailing seqlen=40 events as a (seqlen, 1+1+1+5) matrix (interevent time, zone, action, 5 continuous features). (2)…
**NBA2Vec: Dense Feature Representations of NBA Players** (2302.13386) — ADAPT | props_dfs — Each of 1,551 players gets an 8-dimensional embedding. - For a play: the 5 offensive players' embeddings are averaged, the 5 defensive players'…
**Predicting Elite NBA Lineups Using Individual Player Order Statistics** (2303.04963v1) — ADAPT | props_dfs — Seven classification tools (a decision tree, random forest, boosting, support vector machine, k-nearest neighbors, logistic regression, and linear…
**Real-time forecasting within soccer matches through a Bayesian lens** (2303.12401v2) — ADAPT | bayesian — - 90 separate Gibbs-sampled models (one per minute index), each conditioning on the game state at that minute. - Covariates: pre-match starting-XI…
**Beating the average: how to generate profit by exploiting the inefficiencies of soccer betting** (2303.16648v1) — ADAPT | experimental — Binomial model for strikes per tip: P(x) = C(y,x) p^x (1−p)^{y−x}, y = 13
**Who You Play Affects How You Play: Predicting Sports Performance Using Graph Attention Networks With Temporal Convolution** (2303.16741v1) — ADAPT | experimental — GATv2-TCN has two components: Graph construction: dynamic player-interaction graphs, one snapshot per game day
**Supervised Learning for Table Tennis Match Prediction** (2303.16776v1) — ADAPT | experimental — Four scikit-learn classifiers on standardized (zero mean, unit std) features: Logistic regression: liblinear solver, L2 penalty, C = 1.0 (best after…
**A Bayesian hidden Markov model for assessing the hot hand phenomenon in basketball shooting performance** (2303.17863v2) — ADAPT | team_ratings — Joint model f(Y,Z,θ,ψ) = f(Y/Z,θ,ψ)·f(Z/θ,ψ)·f(ψ/θ)·π(θ) (Eq. 1–2), factorized per match (conditional i.i.d. across matches). Hidden process: 2-state…
**A doubly self-exciting Poisson model for describing scoring levels in NBA basketball** (2304.01538) — ADAPT | bayesian — INGARCH(1,1): Y_t ~ Po(λ_t), λ_t = d + κ λ_{t−1} + η Y_{t−1}; stationary if κ+η < 1, unconditional mean μ = d/(1−(κ+η)), variance ≥…
**Monocular 3D Human Pose Estimation for Sports Broadcasts using Partial Sports Field Registration** (2304.04437) — ADAPT | sports_cv — Partial field registration: detect visible track lane lines (OpenCV Hough), compute one vanishing point, then construct a dense set of candidate…
**Generation of Threat: Crediting Football Players for Creating Dangerous Actions in an Unbiased Way** (2304.05242) — ADAPT | props_dfs — Build a 12-dimensional Hawkes process per team: 11 dimensions = ball touches by the player in each formation position; 12th dimension = threat events…
**Extending the Dixon and Coles model: an application to women's football data** (2307.02139v1) — ADAPT | tracking — §2.1 Dixon–Coles recap: joint pmf P(X_1=x_1,X_2=x_2) = τ_{λ_1,λ_2}(x_1,x_2)·Poisson(λ_1)·Poisson(λ_2), with τ shifting probability only among…
**G-score: Variance-Aware Fantasy Basketball Valuation** (2307.02188v5) — ADAPT | props_dfs — - Z-score (baseline): z = (μ(q) − μ) / σ, where σ is the cross-player standard deviation. - G-score: adds the player's own period-to-period variance…
**Decentralized Prediction Markets and Sports Books** (2307.08768) — ADAPT | markets — Liquidity-based utility functions u(x, y) over cash x and share vector y; the AMM cost is the minimal payment preserving utility: C(q) = min{Δx :…
**Analyzing Sports Commentary in Order to Automatically Recognize Events and Extract Insights** (2307.10303) — ADAPT | nlp — Preprocessing: punctuation/special-char/whitespace removal, stop-word removal, stemming + lemmatization.
**Beep: Balancing Effectiveness and Efficiency when Finding Multivariate Patterns in Racket Sports** (2307.11780v2) — ADAPT | mixed — MDL (minimum description length) pattern-set optimization, following Ditto's [2] framework with two novel components.
**Sports Betting: an application of neural networks and modern portfolio theory to the English Premier League** (2307.13807v1) — ADAPT | markets — Predictor: funnel-architecture deep neural net (3 hidden layers; variants: elastic net, lasso, ridge, dropout, batch-norm), NAdAM optimizer,…
**Miss It Like Messi: Extracting Value from Off-Target Shots in Soccer** (2308.01523v2) — ADAPT | tracking — Generative model (§3): player-specific hierarchical mixture of truncated bivariate Gaussians over shot end coordinates (y, z) at the goal-line plane,…
**Glocal Explanations of Expected Goal Models in Soccer** (2308.15559v1) — ADAPT | experimental — Glocal explanation defined as e_GL[f(X), M] = e_GL(f, {(x_i, y_i)}_{i=1}^m) for a group M of m < n observations — via explanation aggregation (train…
**Learning Risk Preferences in Markov Decision Processes: an Application to the Fourth Down Decision in the National Football League (arXiv:2309.00756) — replacement for 1567** (2309.00756) — ADAPT | causal_injury — Forward model: one-period MDP for the 4th-down decision; future play after t+1 follows fixed league-average stationary policy π̄ (a Markov reward…
**Evaluating Soccer Match Prediction Models: A Deep Learning Approach and Feature Optimization for Gradient-Boosted Trees** (2309.14807) — ADAPT | win_spread_total — Two families, both trained on three five-year training windows ending before validation rounds chosen to mirror the 2018–19, 2019–20, and 2020–21…
**TacticAI: an AI assistant for football tactics** (2310.10553v2) — ADAPT | props_dfs — Graph representation: 22 nodes, fully connected; GNN message passing (Eq.
**Ratings of European and South American Football Leagues Based on Glicko-2 with Modifications** (2310.11459v1) — ADAPT | team_ratings — Baseline: LightGBM with objective "poisson" predicting each team's goal count; win/draw/loss derived via the Skellam PMF: p(k,μ1,μ2) =…
**Stochastic modelling of football matches** (2312.04338v1) — ADAPT | tracking — Event processes (§3.1): event types J = {home goals, away goals, home red cards, away red cards} each follow a Cox (doubly stochastic Poisson) process
**Performance rating in chess, tennis, and other contexts** (2312.12700v1) — ADAPT | team_ratings — Defines S(w,m,n) = C(n,m)·w^m·(1−w)^(n−m), the binomial probability of scoring exactly m points in n games given per-game win probability w against…
**Sports-QA: A Large-Scale Video Question Answering Benchmark for Complex and Professional Sports** (2401.01505v5) — ADAPT | nlp — - Adaptive Focal Attention (AFA): for a query token q_j, attention is computed as a convex combination over focal lengths f of windowed attention…
**XGBoost Learning of Dynamic Wager Placement for In-Play Betting on an Agent-Based Model of a Sports Betting Exchange** (2401.06086v1) — ADAPT | markets — XGBoost binary classifier (binary:logistic, LogLoss), sklearn API + GridSearchCV (5-fold), tuned: eta, max_depth, subsample, colsample_bytree, gamma,…
**Investigating Fouling Efficiency in Football Using Expected Booking (xB) Model** (2401.08718v1) — ADAPT | props_dfs — Three iterative experiments: (1) six features on 957 fouls, comparing Decision Tree, Logistic Regression, Gradient Boosting, XGBoost on an 80/20…
**Individual and team performance in cricket** (2401.15161v2) — ADAPT | props_dfs — Era normalization: nf = ⟨Team runs⟩_all / ⟨Team runs⟩_year multiplies runs scored/conceded (borrowed from citation normalization, Radicchi et al.
**A comprehensive survey of the home advantage in American football** (2401.16392v3) — ADAPT | calibration — - Outcome model: (Y_{ijkt} \sim N(\mu_{ijkt}, \sigma_k^2)) (score differential ≈ normal, citing Glickman & Stern). - Model 1 (constant HA):…
**The Strain of Success: A Predictive Model for Injury Risk Mitigation and Team Success in Soccer** (2402.04898v1) — ADAPT | props_dfs — Three components: (1) XGBoost classifier predicting per-player injury risk for the upcoming match from workload features. (2) Maher-style Poisson…
**Forecasting Events in Soccer Matches Through Language** (2402.06820) — ADAPT | nlp — Ordinal token encoding of event data into a 140-token vocabulary: numeric values 0–100 occupy encoder positions 0–100; 37 event-type categories…
**SportsMetrics: Blending Text and Numerical Data to Understand Information Fusion in LLMs** (2402.10979v2) — ADAPT | data_infra — Four novel tasks on the same play-by-play substrate: (a) Long-form narrative tracking: LLM receives full game (or quarter-by-quarter for ≤8k-context…
**1715 Knowledge graph assisted automatic sports news writing** (2402.11191) — ADAPT | nlp — Pipeline: (1) live-text event parsing into (quarter, time, team, event, score) tuples; (2) KEE: segment the event stream into passages using…
**Estimating the age-conditioned average treatment effects curves: An application for assessing load-management strategies in the NBA** (2402.12400) — ADAPT | causal_injury — Meta-learner framework (Künzel et al. 2019) under Rubin's potential outcomes.
**SportQA: A Benchmark for Sports Understanding in Large Language Models** (2402.15862) — ADAPT | nlp — Not a model paper — a benchmark + evaluation study.
**An analysis of the NCAA college football playoff team selections using an Elo ratings model** (2403.03862v1) — ADAPT | team_ratings — Classic single-parameter Elo with all teams initialized at 1500. Expected win probability for team A: p_A = 1 / (1 + 10^((R_B − R_A)/400)) (standard
**SportsNGEN: Sustained Generation of Realistic Multi-player Sports Gameplay** (2403.12977v3) — ADAPT | calibration — Autoregressive transformer decoder that jointly predicts all agents (players + ball) each step: Output representation: grid classification — each…
**Offensive Lineup Analysis in Basketball with Clustering Players Based on Shooting Style and Offensive Role** (2403.13821) — ADAPT | props_dfs — Two clustering pipelines, then supervised prediction: - Shooting-style pipeline: 17 tracking-derived shot features per player → PCA to 9 dims →…
**Visualization of Unstructured Sports Data - An Example of Cricket Short Text Commentary** (2404.00030v1) — ADAPT | nlp — Build confrontation matrix N per player from commentary-derived features.
**X-VARS: Introducing Explainability in Football Refereeing with Multi-Modal Large Language Models** (2404.06332v1) — ADAPT | nlp — - Vision: fine-tuned CLIP ViT-L/14; temporal pooling + spatial pooling of frame features, linear projection into Vicuna/Video-ChatGPT token embedding…
**Assumption-Lean Quantile Regression via Efficient Influence Functions** (2404.10495v2) — ADAPT | causal_injury — - Estimand: Ψτ = E[(A−A){Qτ(Y/A,L) − Qτ(Y/A,L)}] / E[(A−A)²], equivalently a residualized representation using A − E(A/L) — a weighted average of…
**Cross-Block Fine-Grained Semantic Cascade for Skeleton-Based Sports Action Recognition** (2404.19383) — ADAPT | sports_cv — Cross-block Fine-grained Semantic Cascade (CFSC), inserted into a GCN backbone (tested on 2S-AGCN, CTR-GCN, HD-GCN; main results on HD-GCN [26])
**SoccerNet-Echoes: A Soccer Game Audio Commentary Dataset** (2405.07354) — ADAPT | nlp — Pipeline: Whisper large-v1/v2/v3 (default params) transcribe all halves with automatic language detection from first 30 s → per-video "best model"…
**Alternative ranking measures to predict international football results** (2405.10247) — ADAPT | bayesian — Two-stage pipeline. Stage 1: fit a hierarchical Bayesian BTD model on historical match results (Win/Draw/Loss via Davidson extension) with Gaussian…
**Expected Points Above Average: A Novel NBA Player Metric Based on Bayesian Hierarchical Modeling** (2405.10453v2) — ADAPT | bayesian — Bayesian hierarchical mixture: shot counts (N_i^1..N_i^K) / w_i ~ Multinomial(N_i, p_{w_i}); makes M_i^k / z_i ~ Binomial(N_i^k, q_{z_i}^k);…
**An analysis of factors impacting team strengths in the Australian Football League using time-variant Bradley-Terry models** (2405.12588v1) — ADAPT | team_ratings — Experiment 1 (standard BT): binomial win counts per team pair; strengths λ_i are log-strength coefficients estimated via the BradleyTerry2 R package;…
**Multi Player Tracking in Ice Hockey with Homographic Projections** (2405.13397v1) — ADAPT | tracking — Pipeline (§III): tracking-by-detection. Faster R-CNN [25] for detections (ground-truth annotations also evaluated). Each frame is a bipartite graph;…
**Expected Possession Value of Control and Duel Actions for Soccer Player's Skills Estimation** (2406.00814v1) — ADAPT | win_spread_total — Three extensions to EPV: (1) decay effect — events immediately before a shot get more weight via discount factor γ=0.95 per effective second; (2)…
**SoccerRAG: Multimodal Soccer Information Retrieval via Natural Queries** (2406.01273) — ADAPT | nlp — Four-component pipeline: (1) Feature extractor — LangChain LLM call returns JSON of schema-defined properties from the query; (2) Feature validator —…
**1723 When reasoning meets information aggregation: a case study with sports narratives** (2406.12084) — ADAPT | nlp — Task: given a narrative quarter, output each team's total points.
**Sports Intelligence: Assessing the Sports Understanding Capabilities of Language Models through Question Answering from Text to Video** (2406.14877) — ADAPT | nlp — Benchmark evaluation harness, not a new model.
**MatchTime: Towards Automatic Soccer Game Commentary Generation** (2406.18530) — ADAPT | nlp — Two-stage alignment: (a) coarse — WhisperX ASR over match audio → LLaMA-3 summarises narration into event descriptions per 10-s clip → LLaMA-3…
**FootBots: Motion Prediction in Soccer** (2406.19852v1) — ADAPT | world_models_simulators — FootBots: encoder-decoder transformer.
**Regularized Adjusted Plus-Minus Models for Evaluating and Scouting Football (Soccer) Players using Possession Sequences** (2407.17832) — ADAPT | props_dfs — Data: each possession (sequence of consecutive on-ball actions ending in the final third, ≥ 3 actions, or set-piece exceptions) is one row; binary…
**1718 Sportify: question answering with embedded visualizations and personified narratives for sports video** (2408.05123) — ADAPT | nlp — Pipeline: (1) question → retrieve relevant video clip; (2) tactic classification on SportsVU coordinates using KNN + FastDTW over action sequences;…
**Bye-Bye, Bye Advantage: Estimating the competitive impact of rest differential in the National Football League** (2408.10867v1) — ADAPT | win_spread_total — Bayesian state-space models (Glickman & Stern 1998/2017; Lopez et al.
**Upselling in Online Fantasy Sports: Dream11 Experiments and Causal Policy** (2409.00629v2) — ADAPT | props_dfs — - Stage 1 (supervised prediction): weighted-F1 comparison of models predicting deposit behavior — heuristic baseline, LightGBM regressor, LightGBM…
**Partial Membership Models for Soft Clustering of Multivariate Football Player Performance Data** (2409.01874) — ADAPT | props_dfs — Partial membership (PM) model (Heller et al. 2008, adapted for counts): each player i has a membership vector πᵢ on the K-simplex (πᵢ ~…
**Causal effect of the infield shift in the MLB** (2409.03940) — ADAPT | causal_injury — ETT (Eq. 1): E[Y^{t=1} − Y^{t=0} / T=1]. - Outcome: ΔRE = RE_final − RE_initial + Δscore (change in run expectancy from the year-specific…
**Moving from Machine Learning to Statistics: Expected Points in American Football** (2409.04889) — ADAPT | win_spread_total — EP(x) = Σ_k pts(k)·P(y=k/x) (eq 1), multinomial over 5 drive outcomes.
**Analyzing and Forecasting Success in the Men's Ice Hockey World (Junior) Championships Using a Dynamic Ranking Model** (2409.05714v2) — ADAPT | team_ratings — Score-driven dynamic ranking model extending Holý & Zouhar (2022): PL distribution with time-varying strengths split into fixed effects (long-term…
**A Bayesian framework for analyzing alleged cheating in sports through hidden codes** (2409.08172v4) — ADAPT | bayesian — Models each alleged cheating episode as a sequence of Bernoulli-like trials. Under the honest hypothesis (H0), events follow base-rate chance; under…
**Dynamic quantification of player value for fantasy basketball** (2409.09884v1) — ADAPT | mixed — H-scoring framework: for each candidate player, (1) estimate optimal strategy parameters j maximizing a format objective V(j); (2) draft the player…
**Predicting soccer matches with complex networks and machine learning** (2409.13098v1) — ADAPT | experimental — Passing networks: player nodes (11 per team; substitutes merged into the replaced player — noted as suppressing substitution effects), directed edges…
**Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data in Sports** (2409.17129v1) — ADAPT | win_spread_total — - CMP with Guikema & Goffelt (2008) mean-parametrization: P(Y=y/μ,ν) = (μ^y/y!)^ν / Z(μ,ν); ν<1 over-dispersed, ν>1 under-dispersed, ν=1 Poisson.…
**RisingBALLER: A Player is a Token, a Match is a Sentence — A Path Towards a Foundational Model for Football Players Data Analytics** (2410.00943v1) — ADAPT | props_dfs — Input per player token = PE (player-ID embedding) + SPE (spatial position embedding) + TE (team affiliation embedding) + TPE (temporal positional…
**Deep Learning for Action Spotting in Association Football Videos** (2410.01304v1) — ADAPT | experimental — Survey of 60+ methods, organized by the backbone → neck → head pipeline (ℳ = ℋ ∘ 𝒩 ∘ ℬ), split into feature-based and end-to-end
**FanCric: Multi-Agentic Framework for Crafting Fantasy 11 Cricket Teams** (2410.01307v1) — ADAPT | props_dfs — Six LLM agents orchestrated via LangGraph (LangChain): Supervisor (routes user query, collects league/tournament/season/match), Researcher (venue,…
**SPORTU: A Comprehensive Sports Understanding Benchmark for Multimodal Large Language Models** (2410.08474v4) — ADAPT | mixed — Benchmark construction: expert-written questions stratified by difficulty and sports-knowledge type (rules, technique, tactics, multi-angle…
**A Systematic Review of Machine Learning in Sports Betting: Techniques, Challenges, and Future Directions** (2410.21484v1) — ADAPT | markets — Method: PRISMA-guided systematic review, data extraction (algorithm, dataset, metrics, findings, limitations), synthesis by sport (§4.1–4.10) +…
**A Simple and Effective Temporal Grounding Pipeline for Basketball Broadcast Footage** (2411.00862v1) — ADAPT | tracking — Stage 1 — semantic ROI detection (§III-B): YOLOv8l fine-tuned 130 epochs (Ultralytics defaults, heavy augmentation, ~8 h on a single T4) to directly…
**GTA-Net: An IoT-Integrated 3D Human Pose Estimation System for Real-Time Adolescent Sports Posture Correction** (2411.06725) — ADAPT | sports_cv — GTA-Net pipeline: (1) Joint-GCN — graph convolution over the joint adjacency graph captures local joint dependencies; (2) Bone-GCN — graph over…
**GTA: Global Tracklet Association for Multi-Object Tracking in Sports** (2411.08216v1) — ADAPT | tracking — Plug-and-play post-processing applied to any online/offline tracker's output: 1. Tracklet Splitter (§3.1): for each tracklet T = {t_0, …, t_n},…
**SoccerGuard: Injury Prediction Framework** (2411.08901v1) — ADAPT | causal_injury — Grid of 90 scenarios: input windows of 3/5/7 sessions × output windows of 1/3/7 (days) × class-proportion treatments × 5 models (logistic regression,…
**Predictive Modeling of Lower-Level English Club Soccer Using Crowd-Sourced Player Valuations** (2411.09085v1) — ADAPT | team_ratings — Time-weighted Colley: W_k = exp((t_k − t_0)/(t_f − t_0)); weighted wins/totals w_i, t_i; (2 + t_i) r_i = 1 + (w_i − l_i)/2 + S
**Optimizing Daily Fantasy Baseball Lineups: A Linear Programming Approach for Enhanced Accuracy** (2411.11012v1) — ADAPT | props_dfs — 1. Projection audit: compare SaberSim projections to actuals over the sample; report error statistics.
**The Causal Effect of the Two-For-One Strategy in the National Basketball Association** (2412.08840) — ADAPT | causal_injury — Potential-outcomes framework; estimands: ATE (Eq. 2), ATT (Eq. 3), ATC (Eq. 4); paper estimates ATC (twice as many treated as controls, so matching…
**Is checking for sequential positivity violations getting you down? Try sPoRT!** (2412.10245v3) — ADAPT | causal_injury — sPoRT procedure: For each treatment rule of interest and each follow-up time, define the subgroup still following the rule
**Buzz to Broadcast: Predicting Sports Viewership Using Social Media Engagement** (2412.10298v1) — ADAPT | nlp — - Features: total Reddit posts/comments/scores in the 72h window, average TextBlob and VADER sentiment, one-hot encoded sport. - Preprocessing:…
**FACTS: Fine-Grained Action Classification for Tactical Sports** (2412.16454v1) — ADAPT | tracking — Architecture: ViT-based transformer pre-trained with Video Masked Autoencoders (VideoMAE; Tong et al. 2022). The encoder learns latent…
**Optimizing Fantasy Sports Team Selection with Deep Reinforcement Learning** (2412.19215v1) — ADAPT | props_dfs — MDP formulation: state O_t = (t, S_t, R_t) — timestep, selected 11, reserve 11; action A_t = (rm_t, ad_t), one player swap between selected and
**Optimizing for Rotisserie Fantasy Basketball** (2501.00933v1) — ADAPT | props_dfs — Derives a closed-form Normal-approximation objective: V = Φ(µD/σD), where D = (team t's fantasy-point total) − (highest opponent total), decomposed…
**Forecasting Soccer Matches through Distributions** (2501.05873v1) — ADAPT | markets — Step 1: compute ELO ratings for all teams (K=32, a=400, initial rating 500)
**An optimal transport based embedding to quantify the distance between playing styles in collective sports** (2501.10299v1) — ADAPT | tracking — Frame as measure: φ maps locations to uniform discrete measure (1/n)Σδ_{x_i} — permutation-invariant by construction (players interchangeable). Frame…
**Temporal Dynamics of Goal Scoring in Soccer** (2501.18606v1) — ADAPT | experimental — Null-model construction, not a fitted ML model: Compute the average goals-per-minute rate Ḡ = (1/N) Σ_i (G_i / T_i), where G_i, T_i, N are goals
**Statistical Enhanced Learning for Modeling and Prediction of Tennis Matches at Grand Slam Tournaments** (2502.01613v2) — ADAPT | win_spread_total — Three model classes, each fit on 21 feature combinations (conventional, enhanced, and mixed sets): Logistic regression (linear). GAM with P-splines…
**OpenSTARLab: Open Approach for Spatio-Temporal Agent Data Analysis in Soccer** (2502.02785v2) — ADAPT | tracking — Event package: implements Seq2Event (transformer encoder + MLP decoder), NMSTPP (neural marked spatio-temporal point process decoder, CE+RMSE loss),…
**Forecasting the Future Development in Quality and Value of Professional Football Players** (2502.07528v3) — ADAPT | props_dfs — Models compared: OLS (backward selection, p<0.0001 quality / p<0.001 value), lasso, linear mixed effects (nationality as random effect; top-20 lasso…
**Instrumented Mouthguards for Head Acceleration Events in NCAA Football** (2502.14710v1) — ADAPT | causal_injury — - Instrumented mouthguards; trigger threshold >8g on any axis; recording/analysis threshold 5g PLA and 400 rad/s² PAA at head center of gravity. -…
**What Influences the Field Goal Attempts of Professional Players in Basketball? A Spatially Varying Joint Model** (2503.02137v1) — ADAPT | win_spread_total — Made and missed shot patterns are modeled as separate Poisson processes with shared spatial structure — the Joint Spatially-Varying LGCP (JSVLGCP):…
**Gate-Shift-Pose: Enhancing Action Recognition in Sports with Skeleton Information** (2503.04470) — ADAPT | sports_cv — Gate-Shift-Pose (GSP) = GSF (2D CNN + gated temporal shift + weighted channel fusion, from TSN/TSM lineage) + pose, two fusion strategies
**PassAI: explainable artificial intelligence algorithm for soccer pass analysis using multimodal information resources** (2503.08945) — ADAPT | multimodal_fusion — - Input 1 — tracking image (224×224×3): positions + velocity vectors of all players and ball at pass moment; ball departure→arrival connected by a…
**Unveiling Hidden Pivotal Players with GoalNet: A GNN-Based Soccer Player Evaluation System** (2503.09737v1) — ADAPT | team_ratings — Three variants: (a) Basic GoalNet: 2 graph-convolution layers H⁽ˡ⁺¹⁾ = σ(AH⁽ˡ⁾W⁽ˡ⁾) (ReLU) over node features; edge features via 2-layer MLP; global…
**Simulating Tracking Data to Advance Sports Analytics Research** (2503.19809v1) — ADAPT | experimental — Collection: GRF headless state → entity-row schema
**1716 AskSport: Web application for sports question-answering** (2503.21067) — ADAPT | nlp — Pipeline: (1) BM25 retrieves the top-10 QASports documents for the user's question; (2) a RoBERTa extractive reader scores answer spans in each…
**Automated Explanation of Machine Learning Models of Footballing Actions in Words** (2504.00767v1) — ADAPT | experimental — Three-stage pipeline (Fig. 1): Interpretable model: logistic regression xG, fit per competition
**Action Valuation in Sports: A Survey** (2504.06163v1) — ADAPT | tracking — No new method (survey)
**Multi-person Physics-based Pose Estimation for Combat Sports** (2504.08175v3) — ADAPT | tracking — Four-stage pipeline: Multi-view tracking: YOLOv8 detections → XMem (memory-based video object segmentation) for per-view persistent identities;…
**GridMind: A Multi-Agent NLP Framework for Unified, Cross-Modal NFL Data Insights** (2504.08747v1) — ADAPT | experimental — Agent graph with message-passing (§3.2): Prompt Augmentation Agent — enriches the user prompt with current stats/player metrics/historical…
**1725 Evaluation of the phi-3-mini SLM for identification of texts related to medicine, health, and sports injuries** (2504.08764) — ADAPT | nlp — Zero-shot numeric scoring with phi-3-mini (no fine-tuning); texts occasionally returned explanations instead of numbers (discarded).
**SoccerNet-v3D: Leveraging Sports Broadcast Replays for 3D Scene Understanding** (2504.10106v1) — ADAPT | tracking — Multi-view system generation: pair broadcast main-camera frame with synchronized replay frames; estimate projection matrices P^c ∈ R^(3×4) via…
**TimeSoccer: An End-to-End Multimodal Large Language Model for Soccer Commentary Generation** (2504.17365) — ADAPT | nlp — Architecture (built on TimeChat): EVA-CLIP ViT-G/14 visual encoder → Image Q-Former with time-aware conditioning ("This frame is sampled at 2s") →…
**Can Geometry Save Central Views for Sports Field Registration?** (2504.20052v1) — ADAPT | tracking — Bottom-up geometric correspondence extractor (combined with the PnLCalib calibration backend to get final calibrations): From off-the-shelf…
**Action Spotting and Precise Event Detection in Sports: Datasets, Methods, and Challenges** (2505.03991v3) — ADAPT | tracking — Survey of two pipeline stages (temporal segmentation + event classification) across three method families: TAPG/TAL: Global-to-Local (TURN…
**SoccerChat: Integrating Multimodal Data for Enhanced Soccer Game Understanding** (2505.16630v1) — ADAPT | tracking — SoccerChat = Qwen2-VL-7B-Instruct (ViT ~675M params + Qwen2 LLM; Naive Dynamic Resolution mapping images to visual tokens; M-RoPE decomposing…
**No Train Yet Gain: Towards Generic Multi-Object Tracking in Sports and Beyond** (2506.01373v1) — ADAPT | tracking — McByte = ByteTrack baseline (Kalman filter + IoU association + Hungarian matching, high/low-confidence detection split) + two additions: Mask cue:…
**DIAMOND: An LLM-Driven Agent for Context-Aware Baseball Highlight Summarization** (2506.02351v1) — ADAPT | win_spread_total — Three stages. (1) Preparation: game-log standardization; sabermetrics from precomputed tables — WE(s)=W_s/N_s, WPA=WE_after−WE_before,…
**Partially Regularized Ordinal Regression to Adjust Teams' Scoring for Strength of Schedule and Complementary Unit Performance in American Football** (2506.03057v1) — ADAPT | win_spread_total — Regularized ordinal regression with partial elastic-net penalty (extension of Wurm et al.
**Time-Varying Home Field Advantage in Football: Learning from a Non-Stationary Causal Process** (2506.11399v1) — ADAPT | calibration — - Model (eq. 1): x_t := f(Pa(x_t), ε_t; θ(τ_t)), τ_t = t/T, parents from instantaneous + L lagged variables; causal structure θ(τ_t) varies smoothly…
**Personnel-adjustment for home run park effects in Major League Baseball** (2506.22350) — ADAPT | causal_injury — Yi ~ Poisson(λi), i = 1…123,886; log λi as above. - Elsewhere measures: q^B = HR/other-park PAs (matchup-specific); Zi^B = Σ_{PA∈i} q^B. - Adjusted…
**Enhancing Sports Strategy with Video Analytics and Data Mining: Assessing the effectiveness of Multimodal LLMs in tennis video analysis** (2507.02904v1) — ADAPT | tracking — Model: VideoLLaMA2 (repository as of 2024-09-13), 7B-Base, CLIP clip-vit-large-patch14-336 visual encoder (frozen), STC connector, LoRA fine-tuning…
**Enhancing Sports Strategy with Video Analytics and Data Mining: Automated Video-Based Analytics Framework for Tennis Doubles** (2507.02906v1) — ADAPT | tracking — Three layers: Annotation tool (React/Vite/DaisyUI/Tailwind frontend, Flask + FFmpeg + PyTorch backend): pages for player annotation (bounding boxes,…
**ConBatch-BAL: Batch Bayesian Active Learning under Budget Constraints** (2507.04929v1) — ADAPT | active_learning — MC-dropout BNN classifier (2 hidden layers) on frozen DINOv2 embeddings; only the classifier is retrained each AL iteration (fine-tuning DINOv2's…
**A Bayesian circular mixed-effects model for explaining variability in directional movement in American football** (2507.06122) — ADAPT | bayesian — Frame-level turn angle φ_ijt (change in bearing between successive [t−1,t] and [t,t+1] intervals) modeled as von Mises(μ_ijt, κ_ijt). Both mean and…
**Player-Team Heterogeneous Interaction Graph Transformer for Soccer Outcome Prediction** (2507.10626v1) — ADAPT | win_spread_total — HIGFormer — three components (§ , Fig. 2): 1.
**SV3.3B: A Sports Video Understanding Model for Action Recognition** (2507.17844v1) — ADAPT | tracking — Phase (a) — DWT-VGG16-LDA keyframe sampling: for each candidate frame, compute the Haar DWT approximation (LL subband) at decomposition level L=2;…
**Leveraging Minute-by-Minute Soccer Match Event Data to Adjust Team's Offensive Production for Game Context** (2508.04008v1) — ADAPT | win_spread_total — Negative Binomial GAM (chosen over Poisson — failed DHARMa overdispersion/zero-inflation tests; over ZIP — BIC favored NegBin's lower complexity and…
**Bayesian weighted discrete-time dynamic models for association football prediction** (2508.05891v1) — ADAPT | markets — Six goal-based likelihoods are each fitted with three evolution (dynamic-prior) variants: the proposed weighted-dynamic, Owen (2011) single constant…
**TOTNet: Occlusion-Aware Temporal Tracking for Robust Ball Detection in Sports Videos** (2508.09650v1) — ADAPT | tracking — Architecture: U-Net backbone that retains the temporal dimension throughout (unlike TrackNet/TrackNetV2/MonoTrack, which stack frames along the…
**TrajSV: A Trajectory-based Model for Sports Video Representations and Applications** (2508.11569v1) — ADAPT | tracking — Preprocessing: (1) ResNet-based camera-shot classification/segmentation (1D CNN, 3 layers, 21-frame kernel, ResNet 512-d PCA features; clips <0.4 s…
**Personalized Contest Recommendation in Fantasy Sports** (2508.14065v1) — ADAPT | props_dfs — WiDIR: a wide component (linear, memorizes feature interactions) plus three deep branches — (a) player tower, (b) contest tower, (c) interaction…
**BasketLiDAR: The First LiDAR-Camera Multimodal Dataset for Professional Basketball MOT** (2508.15299v1) — ADAPT | tracking — LiDAR-only: calibrated multi-LiDAR point-cloud merge → court/height filtering → bird's-eye-view (BEV) projection → YOLOv11 detection on BEV →…
**Dynamic Graph-Based Forecasts of Bookmakers' Odds in Professional Tennis** (2508.15956v1) — ADAPT | markets — Two-stage odds-distillation model
**Hierarchy and ranking in pairwise sports contests** (2508.19848v1) — ADAPT | team_ratings — Three hierarchy measures on yearly directed win graphs: flow hierarchy (FH), global reaching centrality from 2-reach (GRC/2RC), random-walk hierarchy…
**A novel methodological framework for analyzing the momentum effect in tennis singles** (2509.01243v1) — ADAPT | win_spread_total — (1) Existence: 2×k contingency table (streak length W_1…W_7+ × extension/termination), Pearson χ² (k−1 df) or Fisher-Freeman-Halton exact test if…
**Match Chat: Real Time Generative AI and Generative Computing for Tennis** (2509.12592v1) — ADAPT | experimental — Three separable subsystems: Likelihood-to-Win prediction engine (§3.3, Figure 2): Pre-match probability from XGBoost decision-tree models: without…
**BlurBall: Joint Ball and Motion Blur Estimation for Table Tennis Ball Tracking** (2509.18387v3) — ADAPT | tracking — Label innovation: annotate the ball at the midpoint of its motion-blur streak plus the streak's orientation and half-length (endpoints reconstructed…
**Rethinking Player Evaluation in Sports: Goals Above Expectation and Beyond** (2509.20083v2) — ADAPT | props_dfs — Standard "goals above expectation" is GAX_p = Σ_j (Y_j − ĥ(Z_j)) X_jp (observed minus xG). The authors show GAX is the unscaled score statistic for…
**Biomechanical-phase based Temporal Segmentation in Sports Videos: a Demonstration on Javelin-Throw** (2509.24606v1) — ADAPT | tracking — Stage 1 — ASTGCN denoising encoder: 3 Adaptive ST-GCN blocks with Chebyshev filters of order 7 and 64-d features, followed by an MLP projecting to
**Aging Decline in Basketball Career Trend Prediction Based on Machine Learning and LSTM Model** (2509.25858v1) — ADAPT | experimental — Two-stage framework (§III, Figure 1), implemented in Python: Stage 1 — career-trend classification: input is the 7-year career trend (48 features × 7…
**Z-scores-based methods and their application to biological monitoring: An extended analysis of professional soccer players and cyclists athletes** (2510.01810) — ADAPT | causal_injury — Pipeline (Figure 1): (1) normality preprocessing — for each biomarker, try transformations {identity, m-th root m=2..10, log, Lambert W₀, Box-Cox…
**Are penalty shootouts better than a coin toss? Evidence from international club football in Europe** (2510.17641v6) — ADAPT | team_ratings — Two-sided binomial tests (H0: p = 0.5) for: first-mover win rate, home-team win rate (mild/strict definitions), comeback-team win rate (two momentum…
**1722 Moneyball with LLMs: analyzing tabular summarization in sports narratives** (2510.18173) — ADAPT | nlp — Task: narrative → full statistical table (cell-level exact match).
**Assessing win strength in MLB win prediction models** (2511.02815v1) — ADAPT | experimental — Six families on the common dataset: logistic regression (LogR), support vector machines (SVM; RBF kernel, C=1 from grid search over 1–10), gradient…
**1720 SportR: a benchmark for multimodal large language model reasoning in sports** (2511.06499) — ADAPT | nlp — Benchmark construction: expert annotation with a strict macro-to-micro CoT protocol; QA pairs generated from the CoT at increasing depth.
**Expected by Whom? A Skill-Adjusted Expected Goals Model for NHL Shooters and Goaltenders** (2511.07703v2) — ADAPT | props_dfs — Baseline: LightGBM binary classifier trained on context-only shot features, tuned with Optuna. Skill-adjustment: separate shooter-skill and…
**DeepSport: A Multimodal Large Language Model for Comprehensive Sports Video Reasoning via Agentic Reinforcement Learning** (2511.12908) — ADAPT | multimodal_fusion — - Reasoning paradigm: trajectory τ = ((F_1,T_1,A_1),…,(F_n,T_n,A_n)) (Eq
**FOOTPASS: A Multi-Modal Multi-Agent Tactical Context Dataset for Play-by-Play Action Spotting in Soccer Broadcast Videos** (2511.16183v1) — ADAPT | tracking — Three benchmarked methods, all retrained on FOOTPASS: TAAD (Singh et al. 2023): purely visual Track-Aware Action Detector — detect + track actors,…
**A Genetic Algorithm for Optimizing Fantasy Football Trades with Playoff Biasing** (2511.17535v1) — ADAPT | props_dfs — - Season score: S(R) = Σ_{w=w_c..17} L(R,w), where L(R,w) is the optimal weekly lineup score. - Unweighted gains: g_a = S(T'_a) − S(T_a), g_b =…
**The Impacts of Increasingly Complex Matchup Models on Baseball Win Probability** (2511.17733v1) — ADAPT | win_spread_total — Matchup model = outcome distribution (depends on pitcher+batter only) × base-running state-transition distribution (depends on state, outcome,…
**Coherent Multi-Agent Trajectory Forecasting in Team Sports with CausalTraj** (2511.18248v2) — ADAPT | tracking — Causal likelihood factorization: the model predicts per-timestep displacements ΔXt+1 = Xt+1 − Xt and factorizes p(XP+1:T / X1:P) = ∏_{t=P}^{T−1}…
**Large-Scale In-Game Outcome Forecasting for Match, Team and Players in Football using an Axial Transformer Neural Network** (2511.18730v1) — ADAPT | win_spread_total — Three-stage network: (a) embedding layers f_player, f_player-strength, f_team, f_team-strength, f_game, f_game-context map each input tensor to…
**Beyond Expected Goals: A Probabilistic Framework for Shot Occurrences in Soccer** (2512.00203v2) — ADAPT | experimental — Two separate XGBoost models trained on engineered features (§3.3): xS: predicts the probability that a shot will occur in the next second; xG:…
**Kicking for Goal or Touch? An Expected Points Framework for Penalty Decisions in Rugby Union** (2512.00312v2) — ADAPT | tracking — Two EP surfaces, then a difference surface: Lineout EP — multiple linear regression on next-score value: EPlineout = β̂0 + β̂1·meter_line +…
**COACH: Collaborative Agents for Contextual Highlighting — A Multi-Agent Framework for Sports Video Analysis** (2512.01853v2) — ADAPT | tracking — (a) Shared backbone: Flan-T5-XL (LLM) + TC-CLIP-B/16 video encoder + Q-Former vision-language alignment; captioning-task alignment; fully supervised…
**Long-Sequence LSTM Modeling for NBA Game Outcome Prediction Using a Novel Multi-Season Dataset** (2512.08591v1) — ADAPT | win_spread_total — Sequence-to-one LSTM: input (batch, 9840, features) → LSTM(200, return_sequences=True) → LSTM(100, return_sequences=True) → LSTM(50,…
**Fairness, Travel, and Market Potential: An Optimization Framework for NBA Expansion** (2512.16968v1) — ADAPT | calibration — - Scenario grid: {82, 72} games × {2, 4} divisions/conference × 15 city pairings.
**Analyzing Skill Element in Online Fantasy Cricket** (2512.22254v1) — ADAPT | props_dfs — - 15 strategies in 3 families: Variable (randomized each match: Random 1, Random 2, Fav Team, Allrounder Select All, Career Averages, Tournament…
**1717 From evidence-based medicine to knowledge graph: retrieval-augmented generation for sports rehabilitation and a domain benchmark** (2601.00216) — ADAPT | nlp — SR-RAG pipeline: (1) PICO-schema GraphRAG — retrieve from the KG by matching the question's PICO structure; (2) PICO-guided HyDE — generate a…
**A Machine Learning Framework for Off Ball Defensive Role and Performance Evaluation in Football** (2601.00748v1) — ADAPT | tracking — (a) CDHMM: per defender j, N = K+1 latent states (K=10 man-marking states + 1 zonal state; J=K=10)
**A probabilistic match classification model for low-scoring sports** (2601.09673v3) — ADAPT | calibration — - Six match classes from the two teams' (G, L) positions; incentive strength (\kappa) = distance from indifference. - Simulation: 500 scenarios ×…
**Lineup Regularized Adjusted Plus-Minus (L-RAPM): Basketball Lineup Ratings with Informed Priors** (2601.15000v1) — ADAPT | tracking — Two components: (a) Player ratings via Sill (2010) RAPM: ridge regression at the possession level
**The Impact of Formations on Football Matches Using Double Machine Learning** (2602.16830v1) — ADAPT | causal_injury — - Double Machine Learning (Chernozhukov et al. 2018): Y = Dβ + Xγ + ε.
**Real-time Win Probability and Latent Player Ability via STATS X in Team Sports** (2602.19513v1) — ADAPT | win_spread_total — (a) T-score function T(a,b): [0,∞)²→ℝ mapping scores to continuous dominance, with draw benchmark c satisfying T(x,x)=c and sign(T(a,b)−c)=sign(a−b).…
**Predicting Tennis Serve Directions with Machine Learning** (2602.22527v1) — ADAPT | win_spread_total — - Per-player models (one model per player, not pooled): multinomial logistic regression, decision tree, random forest (200 trees, max depth 150),…
**An Augmented Rating System for Test cricket: adapting the Glicko rating system** (2603.02574v3) — ADAPT | calibration — Glicko's system (ratings + RD) adapted in four steps: 1. Recalibrate the logistic scale d (chess default 400) by grid search over loss functions…
**A Model-Based Restricted Shapley Value to Measure the Players' Contribution to Shot Actions in Football** (2603.11016v3) — ADAPT | experimental — (1) xGA model: XGBoost (beat binary-regression cloglog in Cefis & Carpita 2025) predicting P(goal / shot + action features); worth of coalition υ(S)…
**Modeling Matches as Language: A Generative Transformer Approach for Counterfactual Player Valuation in Football** (2603.15212v2) — ADAPT | win_spread_total — - Tokenization: 54-dim match-context vector c (team IDs, 22 player roles, 22 player IDs, 8 match-state tokens) + each event as a 10-token tuple (team…
**NFL step-and-turn: A generative framework for evaluating player movement in American football** (2603.17866v3) — ADAPT | tracking — Step-and-turn representation (from animal movement literature): each frame's movement = step length s_t (Euclidean distance between successive…
**STAMP: A shot-type-aware areal multilevel Poisson model for league-wide comparison of basketball shot charts** (2603.24015v1) — ADAPT | team_ratings — Latent Gaussian Poisson GLMM fitted with Integrated Nested Laplace Approximation (INLA) in R-INLA. Observation model: Y_{isadk} ~ Poisson(μ_{isadk}),…
**Decoding Defensive Coverage Responsibilities in American Football Using Factorized Attention Based Transformer Models** (2603.25901v1) — ADAPT | win_spread_total — Three task-specific classifiers sharing a common factorized-attention transformer backbone. Attention is factorized: temporal attention per agent and…
**Load Management and the Healthy-Worker Survivor Effect in the NBA** (2603.26935v1) — ADAPT | causal_injury — MS-PEM (marginal structural piecewise-exponential model): (1) logistic participation propensity model → stabilized inverse-probability weights (IPW);…
**ViTs for Action Classification in Videos: An Approach to Risky Tackle Detection in American Football Practice Videos** (2604.01318v1) — ADAPT | tracking — Backbone: ViViT-B 16×2 (base: hidden D = 768, 12 layers, 12 heads; 16×16 spatial patches; 2-frame tubelets), Kinetics-400 pretrained, full…
**SUMMIR: A Hallucination-Aware Framework for Ranking Sports Insights from LLMs (arXiv:2604.04947v1) — REPLACEMENT for [1478]** (2604.04947v1) — ADAPT | mixed — Two-tier article validation: Qwen 2.5 32B Instruct first pass (precision 88.5%, recall 89.1% on the 996 labeled articles) → second pass with GPT-4o /…
**The Statistical Profitability of Social Media Sports Betting Influencers: Evidence from the Nigerian Market** (2604.08251v1) — ADAPT | win_spread_total — - Survivorship-bias-free collection: only pre-match tips (posted before kickoff) from complete channel histories; 21 voided bets (odds ≤ 1.00)…
**Driving Engagement in Daily Fantasy Sports with a Scalable and Urgency-Aware Ranking Engine** (2604.13796v1) — ADAPT | props_dfs — Urgency-aware Deep Interest Network (DIN): (1) candidate urgency features including time-to-round-lock and time-since-lineups; (2) temporal…
**Simulation-Based Optimisation of Batting Order and Bowling Plans in T20 Cricket** (2604.13861v2) — ADAPT | tracking — MDP: state s = (r, b, w) — runs remaining, legal balls remaining (120 in T20), wickets in hand
**BasketHAR: A Multimodal Dataset for Human Activity Recognition and Sport Analysis in Basketball Training Scenarios** (2604.17065v1) — ADAPT | tracking — Baseline multimodal alignment: LoRA fine-tuning [9] on ImageBind [7]
**Forecast Sports Outcomes under Efficient Market Hypothesis** (2604.17194v1) — ADAPT | markets — OO-EPC (§4.1, Algorithm 5): assume the amount of independent bets placed on outcome i is linearly related to inverse odds xᵢ⁻¹ (Proposition 3 proves…
**TacticGen: Grounding Adaptable and Scalable Generation of Football Tactics** (2604.18210v1) — ADAPT | world_models_simulators — TacticGen: tactics = sequences of multi-agent movements + interactions conditioned on game context
**Model Quality in Football: Quantifying the Quality of an Expected Threat Model** (2604.21087) — ADAPT | props_dfs — Theory: xT satisfies x = s + T·x (s = goal-given-shot vector, T = transition matrix); value iteration converges geometrically (Proposition 1: error…
**Arbitrage Analysis in Polymarket NBA Markets** (2605.00864) — ADAPT | markets — Two execution paths evaluated at every timestamp: Buy path (long arbitrage): simultaneously buy all outcomes at the ask when Ask_A + Ask_B < 1.00.
**Cross-individual generalizability of machine learning models for ball speed prediction in baseball pitching** (2605.05487v1) — ADAPT | experimental — Baseline selection: candidate architectures: Graph Neural Network–Recurrent Unit (GNN-GRU, from Yang et al. 2025) and Transformer (Vaswani et al.…
**A Market-Calibrated Accelerated Failure Time Model for In-Play Football Forecasting** (2605.16066v1) — ADAPT | calibration — Weibull AFT for goal inter-arrival times (Babootor 2021 framework): TH∼Weibull(γ,λH), TA∼Weibull(γ,λA); log 𝔼[T] = μ + βhome + a + d with sum-to-zero…
**Monte Carlo Pass Search: Using Trajectory Generation for 3D Counterfactual Pass Evaluation in Football** (2606.11120) — ADAPT | causal_injury — MCPS = three components: (1) Value model: Transformer on tracking windows, two binary-cross-entropy heads (home/away), labels = shot-within-10s…
**Counterfactual Optimization of Baseball Pitch Sequences and Estimation of Its Impact on Season-Level Statistics** (2606.17345v1) — ADAPT | causal_injury — Transformer encoder (Vaswani et al. 2017) as the base predictive model, chosen because a prior study (Kneita 2025) found the Transformer best for…
**Training-Free Off-Screen Player Imputation for Broadcast-Based Spatial Football Analytics** (2607.11548v1) — ADAPT | tracking — Ladder of causal imputation policies (all per team; no future observations; CPU real-time)
**WorldCupArena: Fine-Grained Evaluation of Language Models and Deep-Research Agents on Football Forecasting** (2607.18084v2) — ADAPT | nlp — Temporal protocol: predictions locked 24h before kickoff; evidence snapshot hash frozen; a prediction containing post-deadline information is…
**The triumphs and tragedies of fandom: Emotional arcs in NFL tweets** (2607.18461v1) — ADAPT | nlp — - Activity: A(M_i) = Tweets(M_i) / Population(M_i) × 100,000 per metro area. - Core/baseline threshold: cumulative 70% of population; fandom radius =…
**Topological Data Analysis and Graph-Theoretic Approaches for Tennis Match Prediction** (2607.23509v1) — ADAPT | experimental — (1) Lower-star filtration: per match, induced subgraph H = union of r-neighborhood ego graphs around p₁, p₂, with r increased until H ≥ 75 nodes
**LLM-SoccerArena: Benchmarking LLMs on Real-World Predictions in Sports** (2607.24573) — ADAPT | nlp — Prospective benchmark protocol in four steps: (1) event registration of unresolved matches/questions with resolution rules; (2) cron-scheduled…
**Sim2Win: A Team-Agnostic, Event-Based Pre-Match Outcome Prediction and Tactical Profiling System for Football** (2607.26061v1) — ADAPT | win_spread_total — Rolling tactical profile: x̄(t,m) = (1/k)Σ_{i=1}^k x(t,m−i), k = 5, shifted one match back so no stats from the predicted match leak. Matchup vector…
**SPRINT: Sports Hazard MLLM Benchmark** (2608.05560v1) — ADAPT | experimental — Evaluation protocol, three progressive binary dimensions: D1 (hazard detection) — does the model signal current/imminent hazard; D2 (factor coverage)…
**SportsGrounder: Proposal-Aided Interleaved Grounding for Dense Sports Video Reasoning** (2608.07932v2) — ADAPT | tracking — (1) Proposal-aided representation: global ViT branch (Eq. 1: Z_t^vit = Φ_vit(I_t) ∈ ℝ^{N×d_vit}); object branch: OV-DINO with Language-Aware…
**Longitudinal Bayesian networks for assessing team performance in the National Basketball Association** (2608.09824) — ADAPT | bayesian — LBN joint: p(y, z, φ, θ) = p(y, z / φ, θ) p(φ / θ) π(θ) (1), with random effects φ.
**Space-Creating versus Dead Possession: An Off-Ball Possession-Quality Index for Broadcast Football** (2608.09887v1) — ADAPT | tracking — Event layer: possession segmented into maximal consecutive-event sequences s; sequence value value(s) = max(0, xT_max(s) − xT_start(s)) [peak threat…
**Capturing Uncertainty in Human Motion for Representation Learning in Soccer** (2608.11203v1) — ADAPT | selfsupervised_tracking — Graph construction: spatio-temporal graph, joints-as-nodes; edges: (a) semantic skeletal (bones) within frame; (b) directed temporal edges (same…
**Multimodal Injury Risk Prediction in Tennis** (2608.25126v1) — ADAPT | causal_injury — PART architecture (modular, Figure 1)
**How Exceptional Was the Big Three Era? Extremes and Persistence in Men's Professional Tennis** (2608.27362v1) — ADAPT | team_ratings — Bayesian dynamic Bradley-Terry state-space model: vector latent strengths per player (one component per surface), Gaussian random-walk dynamics,…
**When Minute-Resolution Monitoring Meets Session-Level Injury Labels: Landmark-Based Discrimination in Elite Women's Football** (2609.03790v2) — ADAPT | causal_injury — Landmark framework: fixed elapsed-time landmarks at 10, 20, 30, 40, 50, 60 min; at each landmark ℓ, representation X_{a,s,1:ℓ} uses only information…
**A Fairness Audit of the Duckworth-Lewis-Stern Method: Format-Specific and Gender-Differential Bias, with an Interpretable Calibration Layer for Cricket Target Revision** (2609.04754v1) — ADAPT | calibration — Three DLS reconstructions: (D1) original published parameters (Z0ODI=245, Z0T20=145) via bilinear interpolation of the published resource table; (D2)…
**Forecasting the Winner of a Live Tennis Match** (2609.07617v1) — ADAPT | win_spread_total — Markov score recursion (backbone): from point-serve probabilities p1, p2, per-point win prob q = p1 (p1 serves) or 1−p2 (p2 serves) (eq. 3); state s
**Field Converter: Geometry-Initialized Temporal Residual Refinement for World-Grounded Player Pose Estimation from Soccer Broadcasts** (2609.10498v1) — ADAPT | tracking — Three stages (Fig. 3): Geometry-based root initialization (§3.4): select the lowest valid lower-limb keypoint jt = argmax image-row over candidates…
**What is the most competitive sport?** (physics/0512143) — ADAPT | win_spread_total — Mock-league Monte Carlo: teams start equal, are paired at random, play a fixed (sport-specific) number of games; the team with the better record is…
**Football Fever: Goal Distributions and Non-Gaussian Statistics** (physics/0606016v1) — ADAPT | win_spread_total — Four model families fit to per-team goal counts: (1) Poisson; (2) negative binomial (NBD); (3) generalized extreme value (GEV); (4) microscopic…
**A Bayesian Mean-Value Approach with a Self-Consistently Determined Prior Distribution for the Ranking of College Football Teams (physics/0607064)** (physics/0607064) — ADAPT | bayesian — WPF: P(i beats j) = P(r_i − r_j, σ_v), σ_v = 1 (from 1/2+1/2 per-team performance variance). - Intermediate moments: m_i(n) = ∫ r^n Φ_p(r,σ_p)…

---

### Coverage & attribution

- **Ledgers on disk:** 1,511 files in `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/`.
- **Indexed corpus:** 1,251 records in `arxiv-program/index/corpus-index.jsonl` (1,203 ADAPT / 48 ADOPT per `SIGNAL-TAXONOMY.md`); ~251 additional REJECT ledgers exist but carry no index record.
- **Sports-relevant subset:** 374 sports-titled index records (357 ADAPT, 17 ADOPT) plus 4 sports-content ledgers with generic titles (0006, 0007, 0009 in-index; 0010 REJECT, not in index).
- **Deep-read:** 38 (all 17 sports ADOPTs; 20 ADAPTs prioritized on NFL/betting/ranking/live-model relevance; 1 REJECT kept as a cautionary baseline).
- **Indexed-only:** 340 (all ADAPT; one-line entries above drawn from the index's methods field).
- **Attribution:** this section is derived from `arxiv-program/index/corpus-index.jsonl`, `SIGNAL-TAXONOMY.md`, `BUILD-QUEUE.md`, `WIRE-IN-PLAN.md`, and the `arxiv-deep/` ledgers. Ledger files are the source of truth for verdicts, numeric gates, and implementation specs; `BUILD-QUEUE.md` holds the ranked top-20 ADOPT build list with owners and gates.
- **Scope note:** the corpus's generic-methods papers (time-series foundation models, conformal prediction, Bayesian inference machinery) with sports applications are cataloged in other sections of this volume; papers here are those whose domain is sports per se. Garrett doctrine applies: market microstructure and devigging are BASELINE — the engine's product goal is situational intelligence and proprietary outputs (GSE score), never beating the close.

## 2 — NGS 48-Post Raw Inventory, Per-Post

Source: `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md` (pass 1, read 2026-09-21, logged-out X view, @NextGenStats, Sep 20, 2026 → Apr 25, 2026). This is the RAW post-by-post inventory; the catalog's first volume used only the consolidated glossary. Per QC file (`post-inventory-continuation-QC-2026-09-21.md`): pass 1 = 48 posts, pass 2 = 80 posts (Apr 24 → Mar 9, 2026), total 128; pass 3 planned from Mar 8, 2026; Replies tab never systematically covered. INTERNAL ONLY per standing doctrine — no NGS metric names on public surfaces.

For each post: metric/concept, key finding/number, engine relevance (1–2 lines). Promo/link-card posts are listed for completeness with "no metric."

**1. Sep 20, 2026, 11:32 PM — Kenneth Walker III.** Metric: missed tackles forced (MTF), carry chart. Finding: 15 MTF in Week 2 (career high); 14+ MTF three times since 2024 vs. twice for the entire rest of the NFL. Relevance: RB elusiveness is a core rushing-efficiency feature; feeds RB tiering and RYOE/YAC sub-models.

**2. Sep 20 — Chiefs OL PFF grades.** Concept: PFF pass-blocking grades (external data, not NGS). Finding: Chiefs first team in NFL history with LT, LG, and C all at 90+ in the same season. Relevance: OL-quality prior for QB passing efficiency and pressure models — note this is third-party (PFF) data, not a GSE-internal metric.

**3. Sep 20, 2026, 11:15 PM — Patrick Mahomes.** Metric: EPA per dropback, pass chart. Finding: 32/47, 382 yds, 3 TD; 8.1 Y/A; EPA/dropback +0.25. Relevance: EPA/dropback is the engine's primary QB efficiency feature; per-game extremes flag form changes.

**4. Sep 20, 2026, 6:19 PM — Brock Purdy.** Metric: completion % over expected (CPOE), pass chart. Finding: 10/10 on downfield attempts (10+ air yards), +16.7% CPOE — highest by a 49ers QB in a game since 2018 (min. 20 att). Relevance: CPOE isolates QB accuracy from scheme; used in QB tiers and passing-prop baselines.

**5. Sep 20 — NFL Pro promo.** No metric (link card). No engine relevance.

**6. Sep 20, 2026, 4:32 PM — Lukas Van Ness.** Metric: pressure rate, get-off time, pass-rush chart. Finding: career-high 9 pressures; 30.0% pressure rate (highest by a Packers defender since Rashan Gary, W11 2023); get-off 0.70s. Relevance: pass-rush disruption feeds QB pressure/sack projection. ⚠️ QC flag: one extraction said five pressures were under 2.5s, another said five were in the second half — do not use either split until verified.

**7. Sep 20 — Devin Lloyd.** Metric: composite defensive game (tackles, missed tackles, sack, INT). Finding: 9 tackles, 0 missed, sack, 2 INT — 10th player since last season with 6+ tackles, no misses, a sack, and an INT in one game. Relevance: LB two-way profile for IDP/defensive-player tiers; tackling-efficiency component.

**8. Sep 20 — Burrow→Chase deep TD.** Metric: deep touchdowns (20+ air yards), QB–WR duo connections. Finding: their 19th deep-TD connection since 2021, most by any QB–WR duo. Relevance: stack-correlation input for SGP/DFS construction.

**9. Sep 17, 2026, 10:43 PM — Lions blitzed Josh Allen.** Metric: blitz rate. Finding: blitzed on 55.3% of Allen's dropbacks (highest under DC Kelvin Sheppard); Allen: 12/17, 137, 2 TD vs blitz; 5 scrambles/49 yds/TD; 4/4 QB sneaks. Relevance: defensive-tendency feature; QB-vs-blitz splits. ⚠️ QC flag: graphic stat box transcribed as "CPOE 55.3%" vs. post text "blitzed 55.3%" — likely transcription error, do not use until verified.

**10. Sep 17 — Jahmyr Gibbs air yards.** Metric: team air-yard share. Finding: Gibbs accounted for 55.3% of Detroit's team air yards in the first half (all three first-half targets past the LOS). Relevance: target-concentration/usage signal for RB-receiving props.

**11. Sep 14, 2026, 10:28 PM — Walker RYOE.** Metric: rushing yards over expected (RYOE), carry chart. Finding: +101 RYOE vs Broncos, most by a Chiefs RB since 2018; 14 MTF. Relevance: RYOE is the core RB efficiency metric; central to run-game matchup models.

**12. Sep 14 — Walker under-center runs.** Metric: formation-split rushing. Finding: 148 of 173 rushing yards came on under-center runs — no other Chiefs RB has hit 120 under-center rushing yards in a game since 2016. Relevance: formation tendencies feed play-type/run-scheme matchup features.

**13. Sep 14 — Broncos missed tackles.** Metric: team missed tackles, yards after missed tackles. Finding: 28 missed tackles allowing 247 yards after missed tackles — most by any defense in a game since 2018; eight defenders missed multiple tackles. Relevance: defensive tackling quality → opponent RB YAC/RYOE projections.

**14. Sep 14 — Travis Kelce YACOE.** Metric: YAC over expected (YACOE), ball-carrier top speed. Finding: 54 YAC on a 59-yard catch (most YAC since W16 2016); +32 YACOE; top speed 16.88 mph. Relevance: receiver YAC skill feature; speed as explosiveness trait for receiving props.

**15. Sep 14 — Walker top speed.** Metric: ball-carrier top speed. Finding: 21.21 mph on a 60-yard TD run — 3rd-fastest of his career; longest run by a Chiefs RB since Damien Williams (W17 2019). Relevance: big-play capability trait; informs long-TD/explosive-play props.

**16. Sep 14 — Walker first-half MTF.** Metric: in-game missed tackles forced. Finding: 9 MTF through the first half — most by a Chiefs RB in any game since 2021. Relevance: live/in-game elusiveness signal for live models.

**17. Sep 13 (edited) — Jaxson Dart.** Metric: pressure-split passing, CPOE. Finding: 17/19, 200 yds, 2 TD vs four-or-fewer rushers; Cowboys' 10.0% pressure rate their lowest since W15 2021; full-game CPOE +10.9%. Relevance: QB-vs-pass-rush splits for matchup models.

**18. Sep 13, 2026, 8:33 PM — Blake Cashman.** Metric: quick pressures (<2.5s), time to pressure, pass-rush chart. Finding: 7 quick pressures — most by an off-ball LB in a game since 2018; averaged 1.88s to pressure. Relevance: blitz effectiveness; feeds QB time-to-throw/pressure models.

**19. Sep 13 — Vikings blitzed Jordan Love.** Metric: blitz rate, blitz-split outcomes. Finding: blitzed on 78.3% of dropbacks (4th-highest since 2018); after 189 yds/2 TD allowed on first-half blitzes, 4 sacks + INT on second-half blitzes. Relevance: defensive aggression tendencies; QB-vs-blitz splits and adjustment effects.

**20. Sep 13 — Zack Baun coverage.** Metric: receiving yards allowed in coverage. Finding: 6 targets, 3 receptions for −2 yards — one of two defenders since last season with 5+ targets allowing negative receiving yards. Relevance: LB coverage quality for TE/RB receiving matchup projections.

**21. Sep 13 — Justin Jefferson deep TD.** Metric: deep TD (20+ air yards), air distance. Finding: 39-yard TD from Wentz — first deep TD since W16 2024; 57.2 air yards, longest reception of his career by air distance. Relevance: WR deep-threat role marker; informs deep-target props.

**22. Sep 13, 2026, 5:03 PM — Trey Hendrickson.** Metric: on/off pressure splits, matchup pressures, get-off. Finding: Ravens 58.6% pressure rate with him on field vs. 20.0% without; all 8 pressures vs. LT Bernhard Raimann; get-off 0.69s. Relevance: individual pass-rush impact → QB pressure projections; OL-vs-DL matchup features.

**23. Sep 13 — NFL Pro promo.** No metric (link card). No engine relevance.

**24. Sep 13, 2026, 4:53 PM — Jahmyr Gibbs.** Metric: MTF, motion usage, RYOE. Finding: 12 forced missed tackles (career high); career-high 24 carries on plays with motion for 131 yds, 2 TD (6 explosive runs); RYOE +21. Relevance: motion-run game efficiency; scheme-usage feature for run models.

**25. Sep 13 — Caleb Williams top speed.** Metric: ball-carrier top speed (QB). Finding: 20.80 mph on a 29-yard TD run — 2nd-fastest of his career; longest rushing TD by a Bears QB since 2016. Relevance: QB rushing explosiveness for rushing props.

**26. Sep 13 — Zay Flowers YACOE.** Metric: YAC over expected, cumulative YAC. Finding: +33 YACOE on a 54-yard TD; 567 YAC since start of 2025 (5th among WRs). Relevance: WR YAC-skill feature for receiving props.

**27. Sep 13 — Caleb Williams speed record.** Metric: 20+ mph plays by a QB. Finding: 20.35 mph on a 9-yard scramble TD — his sixth 20+ mph play since last season; no other QB has more than two. Relevance: rushing-upside trait for QB rushing projections.

**28. Sep 13 — Kenyon Sadiq top speed.** Metric: ball-carrier top speed (rookie TE). Finding: 20.09 mph on a 3-yard TD run — fastest play by a Jets TE as a ball carrier in the NGS era (since 2016). Relevance: rookie/position athletic benchmarks.

**29. Sep 10 — 49ers motion at snap.** Metric: motion-at-snap rate. Finding: 65.6% of plays — highest in the Kyle Shanahan era (since 2017); Juszczyk in motion at snap on 17 of 33 snaps. Relevance: offensive scheme tendency → defensive matchup prep; motion splits for play-type models.

**30. Sep 10 — Mike Evans go/fade TDs.** Metric: route-type TD splits. Finding: 34 TD receptions on go/fade routes since 2018 — leads NFL, 7 more than next-closest (Davante Adams). Relevance: route-classification features for WR TD props.

**31. Sep 10 — Purdy air yards.** Metric: air yards (completion by air distance). Finding: 39-yard TD to Demarcus Robinson traveled 44 yards relative to LOS — Purdy's longest career completion by air yards. Relevance: downfield passing capability trait.

**32. Sep 9, 2026, 11:00 PM — JSN vs zone.** Metric: coverage-split receiving, receiving yards over expected (RECYOE), route chart. Finding: all 8 receptions (122 yds, TD) came vs zone coverage; RECYOE +46. Relevance: coverage-matchup exploitation → WR-vs-coverage models.

**33. Sep 9, 2026, 11:00 PM — Gonzalez vs JSN.** Metric: coverage-matchup table, man-coverage rate. Finding: Gonzalez held JSN to 0/2 on 10 matchups (70% man); JSN went 8/9 for 122/TD vs all others (11% man). Relevance: CB shadow-matchup modeling for WR props. (Note: graphic header mislabeled "2024 SEASON" — labeling error flagged in source.)

**34. Sep 9 — Drake Maye deep INTs.** Metric: deep-pass interceptions. Finding: 2 INT on deep passes in one night — more than all of last season (1). Relevance: QB risk profile on deep throws.

**35. Sep 9 — JSN WP added.** Metric: YACOE, single-play win-probability added. Finding: +35 YACOE on the 45-yard game-tying TD; +28.5% WP added. Relevance: play-level WP for live models; YAC-skill confirmation.

**36. Sep 9 — Cooper Kupp completion probability.** Metric: completion probability. Finding: 19.8% — 3rd-most improbable reception of his career (39.0 air yards, 1.0-yard target separation). Relevance: catch-difficulty modeling for WR props; target-quality features.

**37. Sep 8 — New 2026 NGS metrics.** Concepts introduced: Run Scheme Classification; Run Blocking Matchups & Metrics; Route Classification 2.0. Relevance: three new feature families — blocker-vs-defender run-game matchup models and route-level WR analysis; watch for nflverse/public mirrors since NGS internals stay private.

**38. Sep 4 — NFL Pro Show promo.** No metric (YouTube link). No engine relevance.

**39. Aug 24 — Jalen Milroe top speed.** Metric: ball-carrier top speed (QB). Finding: 20.43 mph would have ranked 3rd-fastest QB ball-carrier speed of the entire 2025 season (only Caleb Williams' 21.01 and 20.45 were faster). Relevance: QB rushing trait benchmarks.

**40. Jul 8 — hiring post.** No metric. No engine relevance.

**41. Jun 1 — Myles Garrett.** Metric: sacks, chip blocks faced, quick pressures. Finding: NFL single-season sack record 23 (2025) despite league-high 139 chip blocks; 83 sacks and 218 quick pressures over last five seasons (both lead NFL). Relevance: pass-rush dominance + attention drawn → teammate pass-rush opportunity; informs OL game-plan modeling.

**42. Apr 28, 2026, 6:21 PM — Eagles Day 1 value picks.** Metric: NGS Draft Model Overall score (0–100). Finding: all five Eagles first-round picks since 2023 landed on NGS' annual Day 1 value list — Carter 87, Smith 80, Mitchell 90, Campbell 82, Lemon 83. Relevance: draft-model scoring for prospect evaluation and rookie projection priors.

**43. Apr 28, 2026, 5:08 PM — Texans Day 3 draft scores.** Metric: aggregate NGS overall draft score. Finding: Texans' Day 3 picks averaged 75 — highest of any team with 4+ such picks. Relevance: team draft-class quality → roster talent priors.

**44. Apr 27 — NFL IQ projected big boards.** Product feature (NFL IQ), not a metric. Relevance: draft-intel surface only; not a model input.

**45. Apr 25 — most athletic draft classes.** Metric: NGS athleticism score. Finding: Bears, Bills, Raiders, 49ers, Saints each averaged 80+ across their first seven picks. Relevance: rookie athletic priors.

**46. Apr 25 — Bears most athletic class.** Metric: NGS athleticism score. Finding: Bears' class averaged 83 league-wide best; each of their first six picks scored 76+. Relevance: same as #45.

**47. Apr 25 — best all-around draft classes.** Metric: NGS overall draft score. Finding: Jets, Browns, Eagles, Commanders, Cardinals all averaged 76+ over their first seven picks. Relevance: same as #43.

**48. Apr 25 (truncated batch — three posts observed, not fully transcribed).** Metrics: combine athletic markers. Observed fragments: RD5 PK#179 Enrique Cruz (fastest OL top speed 20.69 mph in the 40); Jets targeted high-production college prospects early; RD5 PK#153 Jager Burton (4.94 40 at 6-4, 312). Relevance: OL athleticism benchmarks. Flagged as not fully transcribed in the source — do not quote exact numbers.

### Coverage accounting (honest)

- Raw pass-1 inventory: **48/48 posts** captured (Sep 20, 2026 → Apr 25, 2026), all with verbatim post text except the final Apr-25 batch (3 posts observed, truncated). This section's job — the 48 — is complete.
- Known gaps: pass 3 from **Mar 8, 2026 backward** never ran (per QC file, a follow-up pass was "already running" on 2026-09-21; no output found in the profile directory as of this read). The **Replies tab** was never systematically inventoried; self-replies with methodology are the stated priority for a dedicated pass.
- Legal posture per QC file and `docs/data/NGS_GROUND_TRUTH_MAP.md`: NGS data is proprietary NFL tracking data — these files document metric taxonomy and methodology only; GSE's Expected Metrics read from the CC-BY-4.0 nflverse-data mirror, never from the proprietary origin.


## 3. Engine components (v5.3.0 + rating engines)

### 3.1 Rating engine family (SKILL: gse-rating-engines — research packet, not production)

Source: `~/workspace/skills/gse-rating-engines/SKILL.md`. Note: the skill is explicit that production scoring stays in `packages/prediction-engine` (TypeScript); these are the research/playbook forms in `engine_math.py` / `props_optimizer.py`.

**3.1.1 Bradley-Terry / ridge least-squares strength ratings.** Every team gets a latent strength number; the model converts strength gaps into head-to-head win probabilities (the classic paired-comparison family behind Elo-style systems). Implemented as ridge least squares on market margins (`market_strengths`). *Engine use:* baseline team-strength extraction from market lines; the "strengths" half of Layer 1 market pricing.

**3.1.2 Dixon-Coles.** Poisson-style paired model for low-scoring games with time-decay weighting so recent matches count more — the soccer-standard goal-model family. *Skill status:* taxonomy only, marked "sketch" — not production. *Engine use:* kept as a candidate reference for low-scoring-sport modeling (soccer/NHL-style markets).

**3.1.3 Normal-margin alt ladders.** Cover/win probabilities derived by centering a margin distribution on `mu_margin = −listed_spread` (favorite's number is negative; a fair −3.5 covers at 50%). Check: listed −3.5 ladder gives cover 50%, win 60.3%. *Engine use:* alternate-line pricing (alt spreads), the backbone of ladder construction.

**3.1.4 Shin devig (closed-root).** Strips the book's overround out of market odds to recover fair probabilities, modeling a fraction `z` of informed money. Check: −110/−110 books give `z ≈ 0.048`, fair 0.50/0.50. The skill mandates the closed root in `engine_math.py` — the pasted quadratic form wrongly returns `z = 0` on every overround book. *Engine use:* Layer 1 fair-probability recovery from book prices; never bypasses scoring.

**3.1.5 De-vig oracle (seven methods).** Reference implementation in `packages/prediction-engine/src/devig/oracle.ts` (ported from penaltyblog's implied.py): multiplicative, additive, power, Shin, differential-margin-weighting, odds-ratio, logarithmic. Pure, deterministic, no I/O. *Engine use:* fair-probability vectors are calibration *inputs* to the pick pipeline — they must not skip scoring.

**3.1.6 Kelly staking.** Bet-sizing math (fraction of bankroll ≈ edge/odds). The skill keeps it a "sketch" — 20k simulation paths × 400 iterations blows a 120s bot budget. *Engine use:* stake-sizing theory only; not live.

**3.1.7 Props optimizer (`props_optimizer.py`).** Takes devigged fair probabilities and margin ladders into prop-market evaluation (per-play prop script legs). *Engine use:* the prop lane's pricing head.

**3.1.8 Brier / CRPS scoring rules.** Brier decomposition `BS = REL − RES + UNC` (reliability via bin-mean forecast, not bin midpoint); `crps_gaussian(0,1,0) = 0.2337` check. *Engine use:* how every probability is judged — calibration honesty is the gate.

### 3.2 Calibration & gating layer

**3.2.1 Calibration gates.** `src/calibration/calibration-gates.ts` — Brier, log-loss, AUC, ECE with an *isotonic rejection* option: if isotonic calibration worsens holdout, it is rejected, not applied (source: sjpagano's NFL WP model, Brier .1613, AUC .8459, ECE .0331). *Engine use:* calibration is a gate with a reject path, not a ritual — v5.3.0's "tougher Premium gates."

**3.2.2 Pricing ladder.** `src/ladder/reduce.ts` + `heartbeat.ts` — pricing rungs PROVEN → ESTABLISHED → AUTHORITY on fantasy and betting tracks, advanced as settled-game evidence accumulates (`gameSettled` fanout heartbeat with a ledger). *Engine use:* what the system is allowed to price climbs only on proof.

### 3.3 Scoring & decision layer (GSE Score)

**3.3.1 Model parliament.** `src/gse-score/model-parliament.ts` — aggregates votes from multiple models (probability + confidence each), measures disagreement; status OK/WARN/BLOCK. *Engine use:* the customer-facing GSE Score (0–100) aggregates sub-model votes and blocks when models disagree.

**3.3.2 No-bet strength.** `src/gse-score/no-bet-strength.ts` — CLEAR / WATCH / SOFT_PASS / HARD_PASS from risk factors (missing data, stale data, model disagreement, unvalidated calibration, low evidence, market volatility). *Engine use:* pass discipline — the reasoning doctrine's honest-uncertainty layer.

**3.3.3 Action score / calibration contract.** `src/gse-score/gse-action-score.ts`, `calibration-contract.ts`, `calibration-action-policy.ts`, `feature-contract.ts`. *Engine use:* contracts between features, calibration state, and what actions are permitted.

### 3.4 Matchup & signal models

**3.4.1 Block-Poisson chance-rate layer.** `src/nfl/block-poisson.ts` — games split into eight ~7.5-minute blocks; scoring-chance counts (drives reaching the opp 35) modeled as Poisson with offense/defense strength parameters, home-field, score-differential and turnover state. Fit weekly-expanding; team's chance-creation ability feeds the totals model. *Engine use:* totals-market and matchup input (offense chance-creation vs defense chance-suppression).

**3.4.2 Generalized Poisson TD model.** `src/nfl/generalized-poisson.ts` — trailing Bayesian-blended team ratings → generalized Poisson (under-dispersed) touchdown counts → rare-event scoring (FG Poisson, safety Bernoulli, XP conditional, OT separate) → matchup simulation. Home-field is a *fitted* parameter, never hardcoded. *Engine use:* game-outcome simulation kernel.

**3.4.3 Luck-neutralized EPA.** `src/nfl/luck-neutralized-epa.ts` (from dgrifka/luck-neutralized-epa, MIT) — adjusts EPA for high-variance outcomes (fumble recoveries, tipped INTs, missed FGs) so team strength reflects process quality, not coin-flip luck; `deserveToWin` replays games with neutralized EPA. *Engine use:* truer team-strength signals; the "understand football" layer.

**3.4.4 Expected metrics.** `src/expected-metrics/` — drives, expected completion, expected points, expected rush yards, expected YAC, from linear and logistic fits on nflverse pbp mapping. *Engine use:* play-level expectation features the intel features compose with.

**3.4.5 Per-sport dispersion estimation.** `src/dispersion/estimate-phi.ts` — estimates NB2 φ per sport from settled results (MLB VMR ≈ 2.15 → φ ≈ 3.7; NHL goals ≈ Poisson, no dispersion). Research-only/offline: changing a priced path's constant is MODEL_VERSION-affecting. *Engine use:* tail-thickness of totals by sport.

### 3.5 Live / in-play layer

**3.5.1 In-play WP Markov chain.** `src/inplay/inplay-wp-markov.ts` — discrete-time Markov chain over lead states (−40…+40) with empirical per-second scoring tempo and lead-conditioned scoring balance; team-conditioned variant fits leader-scores probabilities by logistic from Elo/spread priors. O(1) live queries via precomputed powers. *Engine use:* live win-probability baseline; acceptance gate requires beating carried-forward pregame market probability by ≥ 0.005 Brier on 2019–2024 NFL.

**3.5.2 Anti-persistent scoring / safe-lead modules.** `src/inplay/antipersistent-scoring.ts`, `safe-lead.ts` — lead-dependent scoring-balance corrections to the live chain. *Engine use:* live-model refinement.

### 3.6 Forecast combination (ensemble)

**3.6.1 Ensemble family.** `src/ensemble/` — eight arXiv-derived forecast-combination methods: time-varying forecast combination, diversity-weighted combiner, hierarchical stacking, weighted quantile combination, smoothed BOA (Bernstein Online Aggregation), regime-blender FEBAMA, BPS outcome pools (Bayesian Predictive Synthesis), factor-graphical ensemble. *Engine use:* combining model outputs into one forecast — diversity-weighted, regime-aware.

### 3.7 DFS / payout layer

**3.7.1 DFS optimizer machinery.** `src/dfs/` — dominance pruning, cluster salary screen, value tiers, tournament variance, IP portfolio. Greedy has no FLEX and no 2-swap (skill hard rule). *Engine use:* lineup construction for tournaments.

**3.7.2 Payout framework.** `src/dfs/payout-framework.ts` — two-stage: fit power-law ideal to contest pool/entry/first-prize via binary search on α (share ∝ r^(−α)), then a nice-number bucketing heuristic. GSE product IP. *Engine use:* contest payout-structure design.

### 3.8 v5.3.0 calibration rebuild

Source: `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/GOAL.md`. v5.3.0 rebuilds the engine around calibrated confidence and tougher Premium gates: a **tiered beat-desk news vector** (situation/context/emotion reasoning layer), **prop-script alignment** (multi-leg correlation awareness), and a **travel/rest/matchup context matrix**, shipping to production behind the existing kill-switch flag. Garrett's coding agent builds from spec; Motif tests each drop against the engine's own settled history.

### 3.9 Recently fired intel-build items

Source: `hidden_files/intel-build-queue.md`, `hidden_files/intel-build-log.md` (log entries 2026-10-06 → 2026-10-10).

**3.9.1 QB TE-target-rate tendency (Q4, FIRED 2026-10-10 as Jules session `1062652565299687163`, SHADOW).** Per-QB TE target share = TE targets on the QB's dropbacks ÷ QB dropbacks (nflverse pbp), career-all-seasons and rolling 16-game windows, floors 200 career / 80 rolling dropbacks, shrinkage toward league mean, point-in-time disciplined. Source: @FantasyPtsData 2026-10-06 (Huntley 34.2% vs league avg 21.9%). Composes with expected-metrics and redzone-te-leverage. *Engine use:* prop-market TE target-share input.

**3.9.2 RB cohort aging curves (Q6, FIRED 2026-10-10 as Jules session `17368943279504269673`, SHADOW).** RB cohort = players with ≥2 top-36 RB FPTS seasons; per-age PPR mean from nflverse player-season data 1999–2026, shrinkage on small age cells; age-decay multiplier table normalized to cohort peak age (~23), vintage-safe. Source: @DynatyzeFF 2026-10-07 Age atlas (peak ~23, ~38% decline age 28→30, 84 lead backs / 679 seasons). *Engine use:* RB production priors / decline adjustments.

**3.9.3 Queued but not yet fired (as of 2026-10-10):** Q5 drive-failure-rate (re-proposal), Q8–Q12 (incl. Q11 drive-outcome distribution — per-team drive-outcome probabilities vs points-per-drive reconciliation), Q14, Q15, Q17, Q18 (QB-WR/TE pairing yards-per-target efficiency), Q19–Q31, Q32 negative-play % team stability (play-grain, distinct from drive-grain Q5), Q33 QB red-zone carry share. Previously fired: Q1 2H game-script splits, Q2 receiver target-dominance composite, Q3 defensive target-share-by-position allowed.

---

**Coverage count — Section 3:** 24 entries total (8 rating-engine family + 2 calibration/gating + 3 scoring/decision + 5 matchup/signal + 2 in-play + 1 ensemble + 2 DFS/payout + 1 v5.3.0 frame + intel-build items counted as one group entry with sub-items). Rating-engine entries come from `~/workspace/skills/gse-rating-engines/SKILL.md`; module entries from directory listing + module headers in `~/workspace/vendor/Sports/packages/prediction-engine/src/` (headers only, no full implementations read); intel items from `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/intel-build-queue.md` and `intel-build-log.md`. Modules not listed here exist but were not surveyed (conformal, automl, backtest, causal, continual, bayesian, hpo, etc.). The ladder's "fantasy/betting tracks," ensemble acceptance gates, and SHADOW-build statuses are as documented in the source headers — none of these are described here as production facts.

## 4 — Mind Distillation: Sports/Football-Relevant Entries

Source: `~/workspace/eng-mine/distilled/` (64 `.jsonl` files; the brain/mind.jsonl single-writer wall respected — partials only, read-only). Entry schema: `src` (unit id), `ktype` (concept/method/finding/relation/equation), title, body, equations.

Honest scope note: sports content is NOT sparse. Across 85,796 distilled lines, **4,091 distinct src units** match sports keywords (football, NFL, nflverse, Elo, EPA, win probability, betting, etc.) across 62 of 64 files. Caveats: (a) the count includes "— equations" companion duplicates and multi-ktype splits of the same unit (a paper often appears as concept+method+finding+relation+action); (b) many hits are GSE-ops data-source docs (nflverse mirrors, settlement ledgers) rather than theories. The unique substantive theories/equations curated below are what matters for the engine — roughly two dozen, all verified by reading the bodies.

### Rating systems

**1. Elo extended to team battle royale** (`c01_w01.jsonl`, u_00:730; 8 equations). Team rating = sum of member ratings (μ_team = Σμ_j); win probability normalized over pairwise matchups with scale D=400; member contributions weighted by w = μ_j/μ_team. Glicko extension uses raw-sum team σ (not quadrature). GSE application: team ratings built from unit ratings (offense/defense/ST); lineup-change and trade updates that propagate through the member shares.

**2. Elo update with variance: θ̂′ = θ̂ + K(S−E)** (`c01_w01.jsonl`, u_00:2079; 8 equations). Full variance-update recipe: Bradley–Terry win prob p_ij with b=log(10)/400; Laplace single-Newton-step variance Σ′=−H⁻¹(μ′); dynamic evolution (σ²)′=σ²(1−AL_i); (A,B)=(0,0) recovers constant-variance Elo. Includes the **surface-transfer formula** δ_il = ρ_ml(σ_l/σ_m)δ_im. GSE application: uncertainty-aware QB/team rating updates; the surface-transfer template maps directly to NFL context-split ratings (grass/turf, dome/outdoor, home/away) — propagate a result on one split to others proportional to cross-split correlation × SD ratio.

**3. Per-match Elo variance update for NFL** (`c01_w01.jsonl`, u_00:2082; relation). Drop-in refinement for GSE's NFL team/QB rating updates: faster adaptation to rookies/QB changes without variance collapse. GSE application: adopt only if it beats constant-variance Elo with McNemar p<0.05 at ≥+0.3pp on time-ordered 2018–2023 NFL games (the entry states its own acceptance gate).

**4. Stochastic analysis of the Elo rating** (`c01_w03.jsonl`, u_00:4458–4463; 14 equations). Elo framed as SGD: θ_{k+1} = θ_k + β[y_k − σ(x_kᵀθ_k + η)]x_k; mean-skill convergence E[θ_{k,m}] with time constant τ₁; MSD with steady-state d̄_∞; bias–variance split; step-size bound 0 < β < [(1−1/M)/(2v) + h̄²/h̄]⁻¹, rule of thumb β < 2v. GSE application: principled K-factor/step-size selection for the engine's ratings instead of hand-tuned K.

**5. Learning to identify top Elo ratings** (`c01_w03.jsonl`, u_00:4464–4469; 12 equations). Companion analysis on rating identification quality. GSE application: confidence bounds on team-strength estimates feeding the pick filter.

**6. Luck function — β-mixture link** (`c01_w01.jsonl`, u_00:250 / u_00:538; 7 equations). Λ(x,y) = (1−β)/2 + β/(1+e^{y−x}), β=0.8: with probability 1−β the winner is random — capping win probability below 1. Glicko's RD inflation is a special case; Duelyst II production config included. GSE application: the direct fix for heavy-favorite overconfidence in ratings → calibration of extreme moneyline probabilities.

### Matchup models (unit-vs-unit)

**7. Pairwise matchup ratings → WR-vs-CB, QB-vs-pass-rush** (`c01_w01.jsonl`, u_00:98; relation). Pairwise matchup-rating math maps to WR-vs-CB and QB-vs-pass-rush ratings — explicitly flagged as "the distinct mechanism absent from GSE's Elo/Glicko inventory." Neighborhood regularization (λ=0.7) for thinly-observed players. GSE application: OL-vs-DL and WR-vs-CB matchup ratings as features for pressure/sack and coverage-matchup models; the λ=0.7 trick is a shrinkage technique for small NFL samples.

**8. Hierarchical log5 matchup model → NFL unit-vs-unit** (`c01_w01.jsonl`, u_00:2094; relation). QB vs defensive unit (and OL vs DL on run plays) with scheme-matchup offsets (man/zone splits, blitz-rate splits) replacing handedness offsets; recency chains 40/30/20/10 over ~2,000-play windows; run-game matchups may have longer effective memory (continuity) than pass-game matchups. GSE application: unit-matchup overlay layer with scheme offsets.

**9. Frequency-vs-efficiency decomposition → NFL coverage** (`c01_w01.jsonl`, u_00:182; relation). CB/safety grades split into target-avoidance vs target-suppression; the paper's biggest confound is scheme (a defender looks like a frequency-suppressor because his team funnels targets to him) — estimate defender effects within route type with explicit team-scheme random effects. GSE application: coverage-defender features; QB-avoidance as a per-defender behavioral signal (a CB QBs throw at less often).

**10. Opponent-adjusted evaluation of NFL pass rush** (`c01_w03.jsonl`, u_00:4548–4553; 9 equations). Binary win/loss ridge Bradley–Terry: logit P(Y_t=1) = α + r_{i(t)} − b_{j(t)} + δD_t, where Y_t=1 means rusher beats blocker within 2.5s of snap; severity multinomial BT over {loss, win, hit, sack}; EPA-anchored severity weights w(o) = (EPA_no-pressure − EPA_o)/(EPA_no-pressure − EPA_sack). GSE application: pass-rush win-rate model and OL-vs-DL matchup ratings — the missing link between pressure counts and EPA.

### Tracking data / trajectory models

**11. Trajectory forecasting on NFL tracking data (minADE/minFDE)** (`c01_w01.jsonl`, u_00:169 / u_00:324; 2 equations). Diffusion-based forecaster on the "NFL Football Dataset": LED 0.87/1.50 vs MID 1.14/1.92 (23.7%/21.9% improvement), beating all 10 baselines at every horizon; ~19–31× inference speedup over standard diffusion (~46ms at τ=5 denoising steps). GSE application: generative trajectory models for route-tree modeling, receiver-separation and defender-closing-speed modeling — the fast sampler makes live/in-play use plausible.

**12. Generative all-22 trajectory model** (`c01_w01.jsonl`, u_00:325; relation). Trajectory distributions underpin route-tree modeling, receiver-separation/defender-closing-speed modeling, and QB dropback/footwork prediction; play-context conditioning (down/distance/personnel) maps to QB decision-mode allocation; joint multi-agent decoding captures receiver-separation + defender-angle jointly — the primitive for coverage-vs-route interaction modeling. GSE application: coverage-vs-route interaction engine; public-tracking-replacement lane.

**13. QB "Decision IQ" — NFL analogue** (`c01_w01.jsonl`, u_00:985; relation). Marginalize over throw execution/outcome while holding pre-throw configuration fixed — separates QB read/decision quality from arm execution. Expected Play Value EPV_t = E[positive EPA | tracking state X_t] via generative trajectory model. GSE application: QB behavioral profiles split decision quality vs execution quality per game situation.

**14. World-model RSSM on nflverse play-by-play** (`c01_w01.jsonl`, u_00:691; relation). Latent-regime world model for simulating game sequences; multimodal latents as the natural representation for QB decision regimes on high-leverage downs (conversion/sack/turnover as discrete outcomes). GSE application: play-sequence simulation for the reasoning layer.

**15. CDHMM: per-defender latent states (10 man-marking + 1 zonal)** (`c01_w01.jsonl`, u_00:149; 6 equations). Covariate-dependent HMM with covariate-dependent transitions (distance, relative velocity, heading alignment); man→zonal transitions prohibited (coach-imposed). GSE application: coverage classification from tracking data; man/zone defender-state modeling behind the coverage tells work.

**16. TI-HOTA tracking metric** (`c01_w01.jsonl`, u_00:155 / u_00:310; 5 equations). TI-HOTA = (1/19)Σ√(DetA_α × AssA_α) over α∈{0.05…0.95} with location×identity similarity. GSE application: evaluating any player-tracking pipeline (Big Data Bowl / CV lane) before trusting its features.

### Coaching / scheme / causal

**17. Mid-season coordinator/scheme-change causal effect (EPA/play)** (`c01_w01.jsonl`, u_00:337; relation). Estimate the change's effect by borrowing nuisance models from prior seasons; the sparse-difference diagnostic (compare fitted supports across eras) as a pre-flight gate; merged estimators can do WORSE than target-only when mechanisms differ — "never naively merge domains." GSE application: coordinator-change and scheme-change adjustments in team-strength models; the 2024 kickoff-rule-change return-EPA case as the template for rule-change shocks.

### Market / calibration / betting

**18. Market-calibration recipe for the NFL engine** (`c01_w01.jsonl`, u_00:200; relation). Fit team-strength parameters to kickoff consensus (The Odds API) via squared error over moneyline/spread/total-implied probabilities; totals market fixes absolute scoring level (identifiability argument); baseline-subtracted cumulative deviation covariates as the in-play feature pattern; EV-threshold plot as the pick filter. GSE application: market-anchored team strengths — the standing "Layer 1 = the market line" doctrine, operationalized.

**19. Per-player QB EPA/dropback finding** (`c01_w01.jsonl`, u_00:1427; finding). Per-player QB EPA/dropback keyed by player (follows trades) beats team-level QB features: log loss 0.633→0.625, AUC 0.690→0.700; team efficiency stats contribute nothing over Elo; 10-point margin MAE as the practical floor; books shade lines toward overs; post-fix top-tier ROI +4.1% over 3,952 picks. GSE application: player-keyed (not team-keyed) QB features; totals-market awareness in pick filtering.

**20. Competitive balance q: NFL 0.364** (`c01_w01.jsonl`, u_00:528; finding). Measured q (worse-record team wins): NFL 0.364 — the underdog wins over a third of the time, "a hard empirical floor on moneyline favorite pricing"; NBA nearly identical at 0.365; NFL competitiveness rising over time. GSE application: moneyline pricing priors; reality check on heavy-favorite ML edges.

### Multi-sport (engine covers all sports per standing doctrine)

**21. Weibull AFT goal-time model** (`c01_w01.jsonl`, u_00:197 / u_00:364; 4 equations). TH∼Weibull(γ,λH), TA∼Weibull(γ,λA); log E[T] = μ + β_home + a_H + d_A (sum-to-zero); MLE on interval-censored times; half-specific shape params; per-match market calibration via Powell's method over 1X2 + over/under thresholds; strength time-decay ≈1-year half-life. GSE application: soccer 1X2/totals modeling; the time-decay and market-calibration templates port to NFL team strengths.

**22. Future value of football players (market-value regression)** (`c01_w03.jsonl`, u_00:4710–4715; 2 equations). Per-position lasso (L1, λ by CV then raised for sparsity) and random forests on 1,227–4,112 players to predict log market value from per-minute stats, age/height squares, league averages. GSE application: prospect-valuation template for draft-model features.

**23. Forecasting football matches** (`c01_w03.jsonl`, u_00:4740–4745; 2 equations). Soccer match-forecasting distillation. GSE application: soccer lane methods.

### Data infrastructure (largest category — counted but not theorized here)

**24. nflverse / expected-metrics / NGS data-source entries** (dozens of units, e.g. u_00:25, u_00:72, u_00:1283, u_00:1327, u_00:2039, plus the @NextGenStats X-account dossier u_00:1315 and the 25-account NFL-analytics-X dossier u_00:1346). These document play-by-play mirrors, expected-metrics pipelines (CPOE/RYOE/xYAC), the NGS ground-truth map, and data-governance rules. GSE application: already wired into `apps/web/lib/nflverse/expected-metrics.ts` per the ground-truth map — they are infrastructure, not new math.

### Coverage accounting (honest)

- Distilled corpus: 85,796 lines across **64** `.jsonl` files. Sports-keyword matches: **4,091 distinct src units** across 62 files — but this count is inflated by "— equations" companion duplicates, multi-ktype splits per unit (concept+method+finding+relation+action), and GSE-ops infrastructure docs.
- Curated substantive theories/equations with real engine application: **24 entries** above (rating systems 6, matchup models 4, tracking/trajectory 6, coaching/causal 1, market/betting 3, multi-sport 3, data infra as a category).
- Zero is NOT the truth here: despite the general-intelligence-first reframing of the mind build, the c01 files in particular carry dense GSE sports content — much of it distilled from Motif's own workspace docs, which means several "findings" restate internal positions rather than independent evidence. Treat distilled GSE-ops entries as reminders, not citations.
- Not found in this pass: a dedicated Bradley–Terry/Dixon–Coles treatment beyond the Elo-adjacent material; standalone SGP correlation theory; any live in-play win-probability formula entries.


## 5. MOVE-37 / DeepSeek mathematical methods

**Standing split (verified across the lane):** DeepSeek is the *theorist* — protocol engineer with no code-execution environment. Every number DeepSeek produces is a prediction or a protocol, never an observation (stated in round-05 §0). Execution happens in the Motif lab: 2 CPUs, 3GB RAM, numpy/pandas/scipy/scikit-learn, nflverse data, verbatim script execution. Garrett's standing gate: no DeepSeek numeric/discovery claim is published or built on without Motif-lab execution. Sources: `~/workspace/gse-discovery/`.

### 5.1 The discovery protocol machinery (the actual method)

**5.1.1 Residual-target discovery loop (THE method).** Fit a gradient-boosting model pre-snap; take the absolute residual |y − GBM_hat| ("how surprising was this play"); run symbolic regression on the residual. In plain English: strip out everything a dumb ML model can already see, then hunt mathematical formulas in what's left. Pre-registered tournament: six kill criteria (holdout R², bootstrap CI vs human baseline, replication, complexity, shuffled-target null). *Engine relevance:* the reusable discovery protocol — every future metric hunt runs through it. Sources: `REPORT_PHASE4.md`, `deepseek-move37-final-prompt.md`.

**5.1.2 Triple-pass verification doctrine.** Every claim re-derived three independent ways — Pass A direct, Pass B adversarial (different framing), Pass C orthogonal (different starting assumptions). 3/3 = CONFIRMED, 2/3 = PROVISIONAL, 1/3 = REJECTED. *Engine relevance:* anti-self-deception standard for any model claim entering the engine. Source: `deepseek-move37-analysis-round-05.md` §1.

**5.1.3 Claim tiers + honest effort annex.** [OBSERVED] = lab-returned number with source file; [INFERRED] = deductive conclusion, deduction shown; [SPECULATIVE] = everything else, including literature claims not personally verified. DeepSeek also appends an effort-honesty annex. *Engine relevance:* every internal report labels what is data vs. speculation. Source: `deepseek-move37-analysis-round-05.md` §0.

**5.1.4 Shuffled-null / permutation placebo protocol.** Shuffle the target *within games* on the test set; if the formula survives (R² stays above 0.05), it's an artifact, not signal. *Engine relevance:* standard artifact check for all candidate features. Source: `REPORT_PHASE4.md`.

**5.1.5 Game-stratified bootstrap (defect fix).** Round-05 §2 flagged, and the lab verified in code: bootstraps must be stratified by *game*, not by play — play-level resampling understates variance. *Engine relevance:* confidence-interval machinery for calibration and validation reports. Sources: `deepseek-move37-analysis-round-05.md` §2; `deepseek-irl-repair-note.md`.

**5.1.6 Variable-verification standing rule.** Every variable named in a protocol is verified against the data dictionary three ways (docs + column dump + value-range sanity) — after DeepSeek specified strata on `quarter_seconds_remaining` (maxes at 900s, quarter-level) as if it were game-level time; the lab caught it and rebuilt on `game_seconds_remaining` (0–3600). *Engine relevance:* protocol rigor rule for all data work. Source: `deepseek-move37-analysis-round-05.md` §3.

### 5.2 Symbolic regression experiments (executed in the lab)

**5.2.1 Phase 4 residual-EPA target.** Target |epa − GBM_epa_hat| (clipped at 99th percentile). Lab result: best formula `unpredictability ≈ max(2·ln(down) − 0.685, 0.441)`, test R² 0.1335, all six pre-registered criteria passed — but plain OLS on `down` alone gets 0.1489/0.1579 and the full GBM gets 0.2323. *Engine relevance:* valid, replicable, and **trivial** — it rediscovered "later downs are more volatile," not a new metric. Do-not-publish verdict; the *method* is kept, the metric is not. Source: `REPORT_PHASE4.md`.

**5.2.2 Residual WPA target.** Target |wpa − wpa_hat|. Lab result: GBM wpa holdout R² = 0.0136 — wpa is ~99% unpredictable pre-snap, so the residual is noise; down dominated again (0.0656 of 0.0722 total OLS R²). Verdict: **KILLED**. *Engine relevance:* lesson — residual targets need a GBM ceiling well above ~R² 0.01 before search budget is spent. Source: `REPORT_RESIDUAL_WPA.md`.

**5.2.3 WPA² symbolic regression + heavy-tail attractor diagnosis.** Round-02's mathematical diagnosis: MSE fitness on heavy-tailed targets (a handful of plays with squared WPA 100–1000× the median) is dominated by the largest residuals, so the GP latches onto tail noise (gen-0 "R² ≈ 0.63" was impossible as real signal). Fix: robust loss — Huber or log-cosh fitness, whose gradient is bounded so the bulk of the data determines the fit. Lab confirmed the attractor was killed by log-cosh. *Engine relevance:* how to (and when not to) fit models on fat-tailed sports data. Source: `deepseek-move37-analysis-round-02.md`.

**5.2.4 Min-bottleneck ablation — FORM claim dies.** Round-03 Experiment 2 falsified the "form/momentum" formula claim via ablation. *Engine relevance:* ablation as the kill instrument for narrative-driven features. Source: `deepseek-move37-analysis-round-03.md`.

**5.2.5 Time-stratified WPA² + method-reachability finding.** Six late-game SR runs never found the time term in any run; smooth linear models beat every SR expression. Conclusion: the failure is **method-level, not target-level** — GP populations are bad at discovering *conditional* structure (time matters most when score is close and clock is short). SR was declared structurally incapable of this target class. *Engine relevance:* known ceiling of symbolic regression; conditional structure needs different machinery. Source: `deepseek-move37-analysis-round-05.md` §2a.

**5.2.6 Play-type residual gate.** Target pass_indicator − xpass: observed ceiling 0.0527/0.0375, mean residual ≈ −0.043, light-tailed — a bounded target where SR may still be viable, but round-04 flagged that nflfastR's existing xpass model already owns this space (no white space). *Engine relevance:* candidate SR target, deprioritized for overlap with an existing human-designed metric. Source: `deepseek-move37-analysis-round-04.md` §0, `round-05.md` §2c.

**5.2.7 Koopman/DMD momentum — rejected.** Momentum-as-dynamical-system hypothesis: p=0.89, AR(1) wins; Koopman rejection stands across three defect tables. *Engine relevance:* "momentum" is not a modelable dynamical state in this data; skip it. Source: `deepseek-move37-analysis-round-05.md` §2e.

**5.2.8 GLI-0.1 falsified.** The GLI-0.1 metric's claimed R² 0.112/0.079 reproduced at 0.0037 in the lab — overfit to heavy tails. *Engine relevance:* never build on unexecuted claims; the verification gate in action. Source: `PHASE6_EXPANDED_PROGRAM.md` §1.

**5.2.9 Bayesian surprise (KL divergence) — demoted candidate.** KL between pre- and post-snap WP distributions (Baldi & Itti formulation) as the surprise metric — but post-snap WP is ~99% unpredictable pre-snap, so surprise inherits the emptiness; and it's infeasible without a probabilistic WP model. *Engine relevance:* demoted, not dead — needs a WP distribution model first. Source: `REPORT_RESIDUAL_WPA.md`, `deepseek-move37-analysis-round-04.md` §0.

### 5.3 IRL: fourth-down coach utility recovery (the flagship, Priority Zero)

**5.3.1 The IRL (CARA) experiment.** In plain English: inverse reinforcement learning on fourth-down decisions — assume coaches maximize expected utility of a power/risk-aversion utility, then estimate their risk-aversion parameter (γ, α̂/β̂) from observed go/kick/punt decisions via softmax maximum likelihood (win-probability outcomes feed the utility). Lab result: α̂=11.0, β̂=0.1, IRL accuracy 39.04% vs a 79.07% position-rule baseline — verdict **NULL**. *Engine relevance:* quantifying coach risk preferences is the prize, but the first implementation is dead. Sources: `move37_irl_audit_2026-09-13.md`, `PHASE6_EXPANDED_PROGRAM.md`.

**5.3.2 The lab audit findings (defect-tracking).** The Motif-lab audit (`move37_irl_audit_2026-09-13.md`) rendered 11 verdict items: **orientation (fatal)** — 4 of 5 utility branches scored the *opponent's* win probability, and the made-FG branch flipped the score-differential sign (the modeled coach maximized opponent WP); **identification (fatal)** — (α̂,β̂) sat on a grid corner with NLL 0.00009 nats from uniform (the model learned nothing; optimum off-grid); **biases (material)** — no clock runoff modeled, average-down WP applied to fresh-down states, conversion model trained on a selected go-only sample, fixed 40-yard punt with no sensitivity run, FG probability never calibration-checked. Verified sound: counterfactual yardline geometry (incl. both lab sign fixes), no temporal/outcome leakage. Note: fleet memory attributes a "20-defect second-pass audit" to DeepSeek; the on-hand documents record this 11-item lab verdict table plus DeepSeek's 23-row numeric self-audit claim table — treat the "20" figure as fleet shorthand, not as a table located in these files.

**5.3.3 WP-1 repair round — broken utility found by the lab.** Round-05's IRL protocol specified CRRA utility over terminal outcomes (win=1, loss=0), but for γ ≥ 1, U(0) is infinite — most of the pre-registered γ range made the softmax likelihood uncomputable — and Component 4 then evaluated U at WP values, contradicting its own definition. Blocker: the utility must be redefined over WP ∈ [0,1] directly with a bounded, finite-for-all-γ parametric family, and the γ prediction range re-derived. *Engine relevance:* why the IRL protocol cannot be executed as written; Priority Zero stays blocked on this repair. Sources: `deepseek-irl-repair-note.md`, `deepseek-move37-repair-01.md` (the runnable repair script).

**5.3.4 IRL protocol components.** Data spec (2014–2024/2025 fourth downs, pre-snap columns verified three ways, ~18–22k decisions), power-utility recovery estimator, logistic belief models for conversion and FG probability, real-time O(1) decision-prediction head, and an evaluation protocol against the NYT 4th Down Bot-style benchmark. *Engine relevance:* the full executable design, once the utility family is repaired. Source: `deepseek-move37-analysis-round-05.md` §4.

**5.3.5 Sandholtz et al. (2024) overlap.** DeepSeek flagged that Sandholtz et al. already executed the fourth-down IRL experiment (Annals of Applied Statistics) via MDP + inverse optimization: coaches are conservative (optimizing low quantiles) and risk tolerance has increased over time. *Engine relevance:* GSE's version would be a refinement, not a novel discovery — the bar moved. Source: `deepseek-move37-analysis-round-04.md` §0.

### 5.4 Navier-Stokes method translation

**5.4.1 The method brief (Motif → DeepSeek).** The brief (`deepseek-move37-navier-stokes-method-brief.md`) asked DeepSeek to study the September 2026 Navier-Stokes existence-and-smoothness AI breakthrough *as an engineering method*, not a result, and translate it into an executable upgrade of the MOVE-37 discovery loop: (1) reconstruct what "10,000 agents in different configurations" meant architecturally; (2) port the formal-verification kill criterion into a "formal-verification-grade" kill layer for sports claims (beyond pre-registered kill lines, dumb-baseline duels, permutation nulls); (3) find "our Euler problem" — the simplified discovery task to solve first; (4) design a swarm loop to replace 1-theorist + 1-lab, budgeted for 2 CPUs / 3GB RAM / numpy-pandas-scipy-sklearn / nflverse data (no $15M budgets); (5) name the three most likely failure modes of the port, each with a concrete test. Hard constraint: every claim about the breakthrough itself in a claim table with source and tier (CONFIRMED / INFERRED / SPECULATIVE / UNSOURCED). *Engine relevance:* this is the strategic upgrade path for the machine-discovery lane — a swarm-verifier architecture replacing the single-theorist loop. DeepSeek's second-pass response exists (`deepseek-phase6-navier-stokes-translation-02.md`); its contents were not summarized here.

### 5.5 PHASE6 expanded program

**5.5.1 The discovery bar.** A discovery must (a) beat a dumb baseline out-of-sample, (b) survive era-split validation, (c) survive permutation/placebo, (d) be interpretable in one paragraph. Anything failing (a) is dead on arrival, no matter how beautiful the math. *Engine relevance:* the standing acceptance criteria for anything entering the engine. Source: `PHASE6_EXPANDED_PROGRAM.md` §1.

**5.5.2 Data expansion + era splits.** Expand to pbp 1999–2025 (~1.2M plays), betting lines (`spread_line`, `total_line` — the market is the adversary), weather, rosters/depth charts/injuries, officials/crews; mandatory era splits (train ≤2010, validate 2011–2017, test 2018–2025); versioned data snapshots per run. *Engine relevance:* training-scale and anti-regime-artifact requirements. Source: `PHASE6_EXPANDED_PROGRAM.md` §2.

**5.5.3 Theory families (deep bench).** Families get a lab executable, a dumb-baseline duel, and pre-registered kill criteria; (L) = lab-startable, (T) = needs DeepSeek protocol design. T1 is information-theoretic structure (lab-startable). *Engine relevance:* the queued discovery agenda beyond residuals. Source: `PHASE6_EXPANDED_PROGRAM.md` §3.

---

**Coverage count — Section 5:** 20 entries total (6 protocol-machinery + 9 symbolic-regression experiments + 5 IRL findings + 1 Navier-Stokes brief + 3 PHASE6 program items... net 20 after grouping). Sources read: `deepseek-move37-analysis-round-02/03/04/05.md` (skimmed with section focus; round-05 read in depth), `deepseek-move37-final-prompt.md` (structure only), `deepseek-move37-navier-stokes-method-brief.md` (full), `REPORT_PHASE4.md` (full), `REPORT_RESIDUAL_WPA.md` (full), `PHASE6_EXPANDED_PROGRAM.md` (skimmed §§1–3), `move37_irl_audit_2026-09-13.md` (full), `deepseek-irl-repair-note.md` (full), `deepseek-move37-repair-01.md` (headings + claim-table summary). **What is theoretical vs executed:** everything attributed to DeepSeek is theory/protocol (no code execution, per DeepSeek's own tiering). Lab-executed (Motif VM, verbatim, EXIT=0): Phase 4 residual EPA, residual WPA, WPA² strata/regularization SR runs, play-type residual ceiling, the IRL CARA run, and the round-05 defect verifications (bootstrap stratification, calibration arithmetic). The IRL CARA run initially "produced no usable output" (per the standing gate in MEMORY) — the usable-verdict lab audit is what survives. DeepSeek's Navier-Stokes second-pass translation and the repair-01 re-execution outcome were not verified in this pass.

---

## 6. Gaps — what this volume could not reach

1. **arXiv: 340 of 378 sports-relevant papers indexed, not deep-read.** The 38 deep-reads cover all 17 sports ADOPTs and the highest-relevance ADAPTs; the 340 indexed-only entries carry one-line method summaries drawn from the indexer's `methods` field (~5–10% are indexer judgment, not ledger-verified). The remaining ~1,100 non-sports ledgers (markets, abstention, general ML) were not surveyed for this volume.
2. **171 of 750 arXiv slots unfilled.** The audit verified 579 valuable; 171 replacements were still owed as of 2026-09-21 (wave 3 pending).
3. **NGS: pass 3 never ran; Replies tab never inventoried.** Pass 1 (48 posts) is fully covered here; pass 2's 80 posts are cited for continuity only. Two transcription disputes flagged, not used as facts.
4. **Mind distillation: sparse on SGP correlation and live in-play WP.** The entries themselves flag the gaps (pairwise WR-vs-CB / QB-vs-pass-rush matchup ratings "absent from GSE's Elo/Glicko inventory").
5. **MOVE-37: the "20-defect" table is fleet shorthand, not a located document.** On-hand docs show the lab's 11-item IRL verdict table + DeepSeek's 23-row numeric self-audit claim table. DeepSeek's Navier-Stokes second-pass translation was not summarized.
6. **Volume 1 gap carried forward:** `advanced-metrics-data-source-catalog.md` (the X dossier's 26-metric definitions) is still missing from the workspace.

*Volume 2 assembled 2026-10-11 from three parallel compilation passes. Every entry attributes its source file; summaries only, no long verbatim passages.*
