# C2-features-rankings: Strength features & rankings (not learner swaps)

## Mission (code this)

Fix MAE by baking better strength/ranking inputs before swapping XGBoost/NN. Dynamic BTL / Elo / opponent-adjust.

## Code focus

- `feature-store`
- `prediction-engine ratings`
- `board ranking inputs`

## Done when

Feature bake-off table: Elo/BTL/pi-rating vs current; MAE delta; no production swap without founder OK.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `2405.10247` — Alternative ranking measures to predict international football results — **[C2][C1]**. Before replacing the model class, replace the *strength feature*. GSE’s MAE loss may be a bad rating input, not a bad learner. **NEXTWAVE-YES**
- `2408.08331` — Match predictions in soccer: Machine learning vs. Poisson approaches — **[C2][C1] — structurally important.** This is the paper that says “stop swapping learners; the MAE gap is not because you didn’t use XGBoost.” Combined with 1701.05976: fix sport- **NEXTWAVE-YES**
- `2501.02505` — Estimation of partial rankings from sparse, noisy comparisons — **[C5]** primary replacement for bootstrap mode, plus **[C1]**. Early-season / thin-league: output a partial order and cap published confidence at the posterior separation. If two  **NEXTWAVE-YES**
- `2406.19563` — Bayesian Rank-Clustering — **[C5][C1]**. Publish “these three teams are in the same tier” instead of fake 51/49 precision. That is a brand-honest move (“math you can read”) and a calibration move (don’t emit **NEXTWAVE-YES**
- `2207.14124` — Graph Neural Networks to Predict Sports Outcomes — **[C2][C7]** only after graph data exists (passing networks, lineup matchups). For current scraped box-score + odds, a GNN is premature and will lose to Lopez/Poisson. **NEXTWAVE-YES**

## Medium priority (implement from these first)

- `2109.13743` (score 13) Dynamic Ranking with the BTL Model: A Nearest Neighbor based Rank Cent — Use dynamic Rank Centrality as a candidate lightweight per-sport model in the multiplicative-weight ensemble alongside CEPT, giving a spectral-method alternative with formal error guarantees.
- `1203.2228` (score 13) A network-based dynamical ranking system for competitive sports — Integrate the dynamic network ranking as one 'expert' in the CEPT multiplicative-weight ensemble, giving the e-process ensemble a forecasting method with documented predictive edge over static Elo-sty
- `2012.06366` (score 13) Limits of PageRank-based ranking methods in sports data — Use their synthetic-results calibration framework as a sandbox to diagnose exactly which randomness sources (home advantage, intrinsic variance) are breaking GSE's model versus the naive baseline.
- `physics/0608007` (score 13) Parity and Predictability of Competitions — Use league-specific parity-upset relationships as a data-driven prior for each sport's per-sport probability model, giving the ensemble a principled starting Brier-score expectation before fitting.
- `2507.22472` (score 11) Inference in a generalized Bradley-Terry model for paired comparisons  — Use this covariate-augmented Bradley-Terry framework as one leg of the per-sport ensemble the founder suspects is needed to fix calibration, explicitly encoding home-field advantage and other structur

## Full Medium assigned to this category (88)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `1203.2228` | 13 | A network-based dynamical ranking system for competitive spo | Integrate the dynamic network ranking as one 'expert' in the CEPT multiplicative-weight ensemble, giving the e-process ensemble a forecasting method with docume |
| `1605.03471` | 13 | Nonparametric hierarchical Bayesian quantiles | Apply hierarchical quantile pooling to 'bootstrap mode' — instead of blanket confidence caps under sparse data, borrow quantile strength from related leagues/se |
| `2012.06366` | 13 | Limits of PageRank-based ranking methods in sports data | Use their synthetic-results calibration framework as a sandbox to diagnose exactly which randomness sources (home advantage, intrinsic variance) are breaking GS |
| `2103.13736` | 13 | Deep Similarity Learning for Sports Team Ranking | Benchmark triplet-loss Siamese ranking against GSE's current prediction engine on held-out picks, potentially adopting it as one arm of the multiplicative-weigh |
| `2108.02419` | 13 | Implementing the BBE Agent-Based Model of a Sports-Betting E | Run GSE's prediction engine against synthetic BBE market data to stress-test calibration and CLV performance in scenarios (e.g., new sports) where real settled- |
| `2111.03599` | 13 | Statistical Properties of Rankings in Sports and Games | Use 'rank entropy'/'system closure' metrics as automated drift-detection signals that flag when a sport's rating system needs recalibration before Brier/ECE win |
| `2202.00583` | 13 | A Statistical Model of Serve Return Impact Patterns in Profe | Adapt the latent-style-allocation mixture approach to model heterogeneous 'player archetypes' as sub-populations within GSE's per-sport ensemble, rather than as |
| `2203.07029` | 13 | SuperCone: Unified User Segmentation over Heterogeneous Expe | Use SuperCone's heterogeneous-expert attention mechanism as the technical blueprint for the CEPT multiplicative-weight ensemble, letting GSE combine structurall |
| `2205.10746` | 13 | Athlete rating in multi-competitor games with scored outcome | Use the monotone-transform Bayesian dynamic model as a candidate ensemble member specifically for sports where GSE's global calibrator's normality assumption is |
| `2312.04711` | 13 | Luck, skill, and depth of competition in games and social hi | Use the paper's per-sport luck/depth estimates as priors to calibrate GSE's Brier/ECE targets per sport — high-luck sports should get wider uncertainty bands, n |
| `2603.21163` | 13 | Simultaneous Estimation of Ballpark Effects and Team Defense | Build a park-and-defense-adjusted feature layer into GSE's MLB model so forecasts stop losing to the naive baseline on park-sensitive stats. |
| `1910.03203` | 12 | Random forest model identifies serve strength as a key predi | Use the finding that combined model probabilities 'recreate' market odds as a diagnostic: if GSE's ensemble can't match this convergence, that's a red flag the  |
| `2002.09770` | 12 | Allotaxonometry and rank-turbulence divergence: A universal  | Use rank-turbulence divergence to visually communicate how GSE's per-sport model rankings shift after a calibration fix, giving stakeholders an intuitive before |
| `2008.04216` | 12 | Using Experts' Opinions in Machine Learning Tasks | Formally incorporate The Odds API's market-implied probabilities as an explicit ensemble member (not just a benchmark for CLV), directly targeting the calibrati |
| `2111.08140` | 12 | Bayesian inference of the climbing grade scale | Adapt whole-history-rating MCMC as a candidate per-sport skill model feeding the ensemble, potentially closing the calibration gap alongside the CEPT e-process  |
| `2307.13700` | 12 | CAMP: A Context-Aware Cricket Players Performance Metric | Generalize CAMP's context-weighting approach (opponent strength, situational pressure) as a template feature-engineering pattern applied across GSE's other cove |
| `2408.01603` | 12 | FIVB ranking: Misstep in the right direction | Run the same kind of rigorous parameter audit (home-field advantage inclusion, match-weighting sanity checks) on GSE's own per-sport rating components as a ligh |
| `2411.02343` | 12 | Boulder2Vec: Modeling Climber Performances in Professional B | Use PMF-style latent vectors to represent team 'style' dimensions (pace, matchup tendencies) rather than a single power rating, feeding a richer, better-calibra |
| `2503.02137` | 12 | What Influences Field Goal Attempts? Basketball Shot Charts  | Adapt the spatially-varying-coefficient idea to model per-sport, per-market 'conditions' (venue, opponent, rest) as continuous covariate surfaces feeding GSE's  |
| `1606.04153` | 11 | Universal temporal features of rankings in competitive sport | Use rank-diversity as a diagnostic: if a sport's rank turnover deviates from the universal curve, flag it as needing its own per-sport probability model rather  |
| `2308.10231` | 11 | Static and Dynamic BART for Rank-Order Data | Replace or augment GSE's global calibrator with an ARROBART-style dynamic Bayesian tree model per sport, directly using its closed-form posterior/smoothing mach |
| `2309.09103` | 11 | Optimal Estimation under a Semiparametric Density Ratio Mode | Apply a density-ratio-model approach to pool historical data across related sports/leagues (e.g., minor leagues borrowing from majors) so smaller-sample sports  |
| `2507.22472` | 11 | Inference in a generalized Bradley-Terry model for paired co | Use this covariate-augmented Bradley-Terry framework as one leg of the per-sport ensemble the founder suspects is needed to fix calibration, explicitly encoding |
| `2508.19848` | 11 | Hierarchy and ranking in fencing and tennis | Add a 'cycle density' network feature (how often circular win-loss situations occur in a sport's recent graph) as an uncertainty signal that could feed bootstra |
| `2510.06789` | 11 | Model-free Rank Aggregation in the Presence of Rater Heterog | Use this model-free rank aggregator as a non-parametric cross-check on GSE's parametric probability models, flagging cases where parametric assumptions driving  |
| `2601.15000` | 11 | Lineup Regularized Adjusted Plus-Minus (L-RAPM): Basketball  | Port the informed-prior regularization technique into GSE's bootstrap-mode confidence capping so sparse-data picks shrink toward player-level priors instead of  |
| `1201.0317` | 10 | Adjusted Plus-Minus for NHL Players using Ridge Regression w | Apply ridge-regularized adjusted plus-minus modeling to all GSE sports as a per-player 'true contribution' feature, using shot/event-volume proxies to stabilize |
| `1903.07746` | 10 | Pairwise Comparisons with Flexible Time-Dynamics | Replace or complement GSE's static team-rating components with this GP-based time-varying skill model, using its native Bayesian posteriors as the uncertainty s |
| `1908.00939` | 10 | Functional Ratings in Sports | Publish the functional-rating curve itself as a transparent, explainable visualization in B2B widgets, letting clients see exactly how a team's rating evolved — |
| `2104.14012` | 10 | Simplified Kalman filter for online rating: one-fits-all app | Use this unifying Kalman-filter formulation as the backbone for building genuinely independent per-sport probability models with proper uncertainty tracking, di |
| `2206.13580` | 10 | Ranking with multiple types of pairwise comparisons | Use this as the mathematical backbone for the 'better ensemble' the founder wants — auto-learning how much to trust each data source (odds vs scraped stats vs C |
| `2307.16642` | 10 | A Spectral Approach for the Dynamic Bradley-Terry Model | Replace or supplement GSE's static per-sport ranking components with Kernel Rank Centrality to get real-time updated rankings plus rigorous uncertainty bounds u |
| `2501.16565` | 10 | Efficient inference of rankings from multi-body comparisons | Use the faster Plackett-Luce solver to build real-time, computationally cheap multi-entity ranking updates (e.g., golf/racing fields) that plug directly into GS |
| `2512.04407` | 10 | Learning Heterogeneous Ordinal Graphical Models via Bayesian | Use MFM clustering to automatically discover latent team/player-style subgroups within GSE's data, then fit separate calibrated probability sub-models per clust |
| `2603.10916` | 10 | NCAA Bracket Prediction Using Machine Learning and Combinato | Use cognitive-diversity scoring to pick which of GSE's internal sub-models or external odds sources are truly complementary before folding them into the ensembl |
| `1111.0693` | 9 | Scoring Strategies for the Underdog: A general, quantitative | Use the underdog risk-tradeoff framework to build a 'strategic variance' feature — flagging situations where trailing teams are expected to take high-variance a |
| `1906.04066` | 9 | Stretching the Effectiveness of MLE from Accuracy to Bias fo | Apply the stretching correction to GSE's team-rating estimators as a quick, mathematically justified patch to reduce systematic bias contributing to the current |
| `1907.03043` | 9 | Gaussian Processes for Analyzing Positioned Trajectories in  | Use grey-box Gaussian process modeling to combine known sports rules/physics (e.g., scoring constraints) with a residual GP layer, directly targeting the report |
| `1909.10285` | 9 | Robust Inference for Skewed data in Health Sciences | Apply the robust divergence estimator to detect and downweight anomalous settled-pick outcomes (e.g., data errors) before they corrupt the 3-consecutive-green c |
| `1910.00131` | 9 | Fast and Fair Simultaneous Confidence Bands for Functional P | Replace ad-hoc bootstrap-mode confidence capping with these analytic simultaneous bands to get statistically 'fair' (balanced false-positive) uncertainty interv |
| `1910.01863` | 9 | Template-free Data-to-Text Generation of Finnish Sports News | Fine-tune a similar data-to-text system specifically on GSE's own deterministic-math brand voice so auto-generated recaps stay compliant with the 'no AI-powered |
| `2004.06630` | 9 | Implementing multiple imputation for missing data in longitu | Use hot-deck imputation to fill gaps in sparse historical per-sport data for newly-added leagues, providing more complete training data than dropping incomplete |
| `2006.11909` | 9 | Two-Sample Testing on Ranked Preference Data and the Role of | Use their two-sample testing framework as the formal statistical test underlying GSE's '3 consecutive green calibration windows' launch gate, replacing ad hoc t |
| `2010.11187` | 9 | G-Elo: Generalization of the Elo algorithm by modelling the  | Use G-Elo ratings as one arm of GSE's ensemble, explicitly as the 'transparent, math you can read' rating baseline that also improves calibration via its princi |
| `2203.08489` | 9 | Bayesian Analysis of Formula One Race Results: Disentangling | Adapt the hierarchical decomposition to separate 'team system' effects from 'individual player' effects in GSE's models, giving more interpretable, brand-approp |
| `2208.00174` | 9 | Bump hunting through density curvature features | Use curvature-based bump hunting on residual/error distributions across sports to pinpoint which score ranges or sport-specific segments are driving the 0.2563 |
| `2212.10935` | 9 | Commentary Generation from Data Records of Multiplayer Strat | Fine-tune a similar data-to-text model on GSE's own structured pick/game data to auto-generate branded, 'math you can read' commentary for social content at sca |
| `2308.08644` | 9 | Generalized Bradley-Terry Models for Score Estimation from P | Adopt the GBT family's Lipschitz-resilience guarantee to bound how much any single new game result can swing a team's rating, giving GSE a formally provable sta |
| `2311.01993` | 9 | Active Exploration in Iterative Gaussian Process Regression  | Apply active-exploration logic to GSE's data-ingestion prioritization: dynamically flag which sparse-data sports/matchups need targeted additional scraping to r |
| `2407.20085` | 9 | Local Level Dynamic Random Partition Models for Changepoint  | Deploy this dynamic partition changepoint model on team/player performance time series to automatically detect 'form change' regimes (injury, coaching change) that should trigger a model re |
| `2408.10878` | 9 | Trajectory Imputation in Multi-Agent Sports with Derivative- | Adapt the derivative-accumulating self-ensemble idea (predict several related quantities, then ensemble) as a general missing-data imputation strategy for gaps |
| `2602.00133` | 9 | PredictionMarketBench: A SWE-bench-Style Framework for Backt | Adopt this deterministic-replay backtesting design for GSE's own pick-grading pipeline, strengthening its case when it needs to prove three consecutive green |
| `2602.02979` | 9 | CPMobius: Iterative Coach-Player Reasoning for Data-Free Rei | Deploy a Coach-Player loop between two GSE internal agents to autonomously generate and solve increasingly hard calibration/ensemble-design problems without nee |
| `2602.13152` | 9 | Detecting Parameter Instabilities in Functional Concurrent L | Adapt the CUSUM functional break test to flag mid-season 'regime changes' in a team's performance curve (injury, coaching change) that should trigger a model re |
| `2605.24445` | 9 | Matrix concentration inequalities for time-inhomogeneous Mar | Use these concentration bounds to derive theoretically-justified confidence intervals on team/player Elo ratings for bootstrap mode, replacing ad hoc confidence |
| `1704.04833` | 8 | Boosting with Structural Sparsity: A Differential Inclusion  | Apply Split LBI to sparsely regularize GSE's ensemble weights across many candidate sub-models, automatically pruning weak per-sport models while retaining path |
| `1710.06056` | 8 | Asymptotically Optimal Sequential Design for Rank Aggregatio | Use this sequential design theory to prioritize which upcoming sparse-data matchups the ingestion pipeline should scrape more deeply first, maximizing calibrati |
| `1809.02735` | 8 | Operations Guided Neural Networks for High Fidelity Data-To- | Use operation-guided generation so any auto-written pick explanation is provably grounded in the exact computed numbers (e.g., actual Brier/CLV values), making  |
| `2003.12198` | 8 | Sorting Big Data by Revealed Preference with Application to | Blend revealed-preference equilibrium rankings with GSE's existing Elo/CEPT-based ratings as an additional ensemble member, since it requires less data and coul |
| `2004.08428` | 8 | Renormalizing individual performance metrics for cultural he | Apply era-renormalization to historical training data before model fitting, preventing rule-change or era-drift artifacts from corrupting GSE's per-sport probab |
| `2104.05816` | 8 | On the Linear Ordering Problem and the Rankability of Data | Compute a 'rankability score' for each sport's historical results before modeling, flagging sports (or seasons) where outcomes are inherently noisy and thus nee |
| `2110.04321` | 8 | Computing an Optimal Pitching Strategy in a Baseball At-Bat | Use the zero-sum game-solving framework to model pitcher-vs-batter matchups as a genuinely better forecasting method, directly targeting the report |
| `2212.12015` | 8 | Stochastic analysis of the Elo rating algorithm in round-rob | Use the paper's step-size convergence guidance to formally tune an Elo-style component within GSE's multiplicative-weight ensemble tied to the founder's CEPT fr |
| `2310.13719` | 8 | Analysis of ELO Rating Scheme in MOBA Games | Evaluate the proposed effort-based rating variant as an alternative or complement to standard Elo in GSE's per-sport models, particularly for sports where simpl |
| `2402.07004` | 8 | Min-Max transformation for the measurement of sports perform | Use the normalized PIR as a standardized cross-era comparability feature so GSE's ensemble can weight historical player performance consistently despite rule/er |
| `2607.06495` | 8 | Pitwall: Faithful Natural-Language Race-Strategy Briefings f | Directly adopt Pitwall's claim-level verification architecture — decomposing generated pick explanations into typed factual claims checked against live probabil |
| `2607.23509` | 8 | Topological Data Analysis and Graph-Theoretic Approaches for | Use TDA-derived topological features as an independent 'sub-model' in the ensemble specifically for lower-data sports/matchups where box-score features are spar |
| `1709.09002` | 7 | A physical model for efficient ranking in networks | Use SpringRank's significance test to automatically detect which sports/leagues currently have genuinely learnable hierarchy versus near-random competitiveness, |
| `1906.02746` | 7 | Ranking and synchronization from pairwise measurements via S | Use the SVD ranking method as a lightweight, explainable cross-check against GSE's primary rating model, flagging discrepancies as a data-quality/calibration di |
| `1907.05082` | 7 | How should we score athletes and candidates: geometric scori | Use the geometric-scoring-rule framework to design GSE's own pick-confidence or leaderboard scoring system for the Galaxy Dynasty/AUGUR game layer with provably |
| `1909.04817` | 7 | Home Sweet Home: Quantifying Home Court Advantages For NCAA  | Use the scorekeeper/referee-bias findings to build a data-quality filter that flags box-score inputs likely inflated by crowd-driven bias before they feed the p |
| `2009.00550` | 7 | Using Social Networks to Improve Group Transition Prediction | Add a social-network-derived 'team cohesion' feature (player connectivity/tenure overlap) to GSE's per-sport models as a novel predictor beyond standard box-sco |
| `2207.01455` | 7 | Dynamic Ranking and Translation Synchronization | Use the smoothness-penalized dynamic ranking estimator as an alternative to ad-hoc Elo updates, giving GSE finite-sample error bounds on how fast team strength  |
| `2401.06086` | 7 | XGBoost Learning of Dynamic Wager Placement for In-Play Bett | Build an internal agent-based simulated betting exchange to synthetically stress-test GSE's calibration and confidence adjustments before they ever touch real l |
| `2406.04062` | 7 | Online Learning in Betting Markets: Profit versus Prediction | Use the online-pricing regret-bound framework to design GSE's own live-updating confidence scores as bets/data arrive, explicitly separating a 'pure prediction' |
| `2406.11584` | 7 | Modeling cyclicality and intransitivity in paired comparison | Add a cyclic-structure diagnostic to the calibration pipeline to detect which sports/matchups have significant intransitivity, then route those to a matchup-spe |
| `2606.21814` | 7 | Ranking Football Teams via the Higher-Order Decomposition of | Evaluate Hodge-decomposition-based composite ratings as an alternative or complementary signal to GSE's current per-sport model, especially for leagues showing  |
| `1511.08522` | 6 | TennisVid2Text: Fine-grained Descriptions for Domain Specifi | Adapt the domain-specific commentary generation approach to auto-narrate GSE picks ('why the model favors X') in natural sports-commentary style, reinforcing th |
| `1708.09666` | 6 | Generating Video Descriptions with Topic Guidance | Adapt the topic-guided decoder architecture to keep GSE's automated social copy consistently in its 'math you can read' register by treating banned-phrase avoidanc |
| `2203.07364` | 6 | A Supervised Learning Approach to Rankability | Use a rankability score as an automated gate: sports/leagues below a rankability threshold get routed into bootstrap mode's confidence cap rather than full mode |
| `2309.03808` | 6 | Improved theoretical guarantee for rank aggregation via spec | Swap in the spectral ranker for parts of GSE's team-strength estimation pipeline where pairwise game outcomes are noisy, potentially improving accuracy with few |
| `2504.19612` | 6 | Relative Advantage: Quantifying Performance in Noisy Competi | Systematically re-engineer GSE's feature set to use relativized (vs. absolute) team/player metrics per the paper's SNR framework, and A/B test whether this alon |
| `2505.02754` | 6 | Debiased inference in error-in-variable problems with non-Ga | Apply this debiasing correction to noisy scraped input features (e.g., imprecise play-by-play-derived stats) before they enter the prediction model, potentially |
| `2506.21944` | 6 | Ranking dynamics in movies and music | Apply the compositional-churn indices to GSE's own team/player power rankings to detect when the ranking system is unstable or overly sensitive to recent news, |
| `2507.08108` | 6 | Mallows Model with Learned Distance Metrics: Sampling and Ma | Fit a per-sport Mallows distance metric to characterize how upset-prone each league is, then use the learned dispersion parameter as an input feature to bootstr |
| `2605.12799` | 6 | Synthesizing the Expert: A Validated Multimodal Dataset for  | Adopt this rule-validated multi-agent synthetic-data pipeline to generate and audit synthetic settled-pick scenarios for stress-testing GSE's calibration models |
| `2608.09200` | 6 | NBAStreaming: A Large-Scale Benchmark for Fine-Grained Bask | License or replicate this causal commentary-generation approach to auto-produce live, fact-checked play-by-play social posts tied to GSE's in-flight picks as ga |
| `2608.23859` | 6 | Ranking by Points and Ordinal Models | Use the sufficiency framework to formally justify (or redesign) GSE's sport-specific rating/ranking components so they're provably consistent with the underlyin |
