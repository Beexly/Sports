# C1-per-sport-generative: Per-sport generative probability (scores / WP)

## Mission (code this)

Replace global classifier heads with sport-specific generative or logistic WP models. Offline bake-offs first; no gate flips.

## Code focus

- `packages/prediction-engine`
- `gse-ml-service`
- `apps/web offline diagnostics only`

## Done when

Offline CE/RPS/Brier table vs current engine on settled book-priced rows; sport-split noise scales documented.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `1701.05976` — How often does the best team win? A unified approach to understanding  — **[C1][C2][C3][C4][C5]**. This is the most important paper in the set for GSE’s *architecture*. 1. It justifies **independent per-sport models** with different \(\sigma_{\mathrm{ga
- `2408.08331` — Match predictions in soccer: Machine learning vs. Poisson approaches — **[C2][C1] — structurally important.** This is the paper that says “stop swapping learners; the MAE gap is not because you didn’t use XGBoost.” Combined with 1701.05976: fix sport- **NEXTWAVE-YES**
- `2105.09881` — Poisson Modeling and Predicting English Premier League Goal Scoring — **[C1][C2][C4]**. The “start here” MLS/soccer model. Beats a generic ML regressor on sparse count outcomes more often than people expect (see 2408.08331).
- `1704.00197` — iWinRNFL: A Simple, Interpretable & Well-Calibrated In-Game Win Probab — **[C1][C6][C2]**. This is the cleanest “math you can read” in-game WP template for NFL. Do *not* use it as the pre-game published-pick model — it is an in-play state model. Use it  **NEXTWAVE-YES**
- `1906.05029` — A Bayesian Approach to In-Game Win Probability in Soccer — **[C1][C2][C5][C7]** for **MLS**. This is the template for “independent per-sport probability model” in soccer: generative remaining-score model, not a global classifier. Also the 
- `2409.17129` — Bayesian Bivariate Conway-Maxwell-Poisson Regression for Correlated Co — **[C1][C2]** for **MLS and MLB run/goal models**. If GSE’s score head is Poisson and MAE loses, first test *dispersion*, not an NN. Bivariate COM-Poisson is the upgrade path from D
- `1607.00379` — Probabilistic Programming and PyMC3 — **[C1][C8] tooling**. This is the onboarding document for GSE’s per-sport generative models. If the stack is currently a point-estimate sklearn pipeline, adopting PyMC/Stan is the 

## Medium priority (implement from these first)

- `2501.05873` (score 12) Forecasting Soccer Matches through Distributions — Replace GSE's point predictions with shot/event-count distributions per sport, then derive calibrated win probabilities from the distribution rather than a single regression head.
- `1002.0797` (score 11) Soccer: is scoring goals a predictable Poissonian process? — Use this paper's quantified 'limits of predictability' for soccer as an explicit ceiling target for GSE's MLS Brier score, so the team knows how much of the 0.2563→0.22 gap is even theoretically closa
- `2301.04251` (score 11) On classical and Bayesian inference for bivariate Poisson conditionals — Use the bivariate Poisson-conditionals framework to jointly model correlated team scores in the sport-specific ensemble, potentially improving calibration on scoreline markets.
- `2109.00378` (score 11) A truncated mean-parameterised Conway-Maxwell-Poisson model for the an — Apply CMP-based dispersion modeling to GSE's under- or over-dispersed sports counting stats (e.g., strikeouts, goals) to get better-calibrated tail probabilities than a plain Poisson baseline.
- `2012.14949` (score 7) Estimating the change in soccer's home advantage during the Covid-19 p — Audit GSE's soccer model for the same linear-vs-Poisson bias identified here; switching to bivariate Poisson regression for goal modeling could be a concrete, low-effort calibration improvement for th

## Full Medium assigned to this category (76)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `2010.10202` | 13 | SoccerMap: A Deep Learning Architecture for Visually-Interpr | Adapt the full-surface probability estimation approach beyond passing to model a live 'win probability field' across all remaining game states, useful for in-ga |
| `2109.13743` | 13 | Dynamic Ranking with the BTL Model: A Nearest Neighbor based | Use dynamic Rank Centrality as a candidate lightweight per-sport model in the multiplicative-weight ensemble alongside CEPT, giving a spectral-method alternativ |
| `1111.2919` | 12 | Universal scaling in sports ranking | Fit the sigmoidal rank-difference function per sport as a transparent, math-you-can-read baseline component of the ensemble, directly supporting GSE's brand pos |
| `1706.02447` | 12 | Luck is Hard to Beat: The Difficulty of Sports Prediction | Use this paper's luck/skill decomposition framework to set sport-specific, honest 'ceiling' expectations for GSE's MAE targets, reframing the backtest-vs-naive- |
| `2501.05873` | 12 | Forecasting Soccer Matches through Distributions | Replace GSE's point predictions with shot/event-count distributions per sport, then derive calibrated win probabilities from the distribution rather than a sing |
| `1002.0797` | 11 | Soccer: is scoring goals a predictable Poissonian process? | Use this paper's quantified 'limits of predictability' for soccer as an explicit ceiling target for GSE's MLS Brier score, so the team knows how much of the 0.2 |
| `2005.12661` | 11 | DAG-Net: Double Attentive Graph Neural Network for Trajector | Use goal-aware graph attention to forecast likely game-state trajectories (not just player movement) as a structured feature input for live-pick reprici |
| `2109.00378` | 11 | A truncated mean-parameterised Conway-Maxwell-Poisson model  | Apply CMP-based dispersion modeling to GSE's under- or over-dispersed sports counting stats (e.g., strikeouts, goals) to get better-calibrated tail probabilities th |
| `2205.07193` | 11 | How Much Does Home Field Advantage Matter in Soccer Games? A | Use this hierarchical causal design as a template to causally isolate other confounded sports factors (rest days, travel, weather) before feeding them into GSE' |
| `2206.07212` | 11 | Explainable expected goal models for performance analysis in | Build a GSE 'expected outcome value' model analogous to xG for non-soccer sports, paired with the same explainable-profile technique to generate transparent pic |
| `2301.04251` | 11 | On classical and Bayesian inference for bivariate Poisson co | Use the bivariate Poisson-conditionals framework to jointly model correlated team scores in the sport-specific ensemble, potentially improving calibration on sc |
| `2303.14655` | 11 | GOAL: A Challenging Knowledge-grounded Video Captioning Benc | Feed GSE's future Intelligence Graph as the knowledge source for a knowledge-grounded commentary generator that narrates why a pick was made, in real time. |
| `2509.20083` | 11 | Rethinking player evaluation in sports: Goals above expectat | Apply the double-ML residualization technique to GSE's own pick-quality metrics, converting flexible-but-biased ML outputs into statistically valid, properly ca |
| `2509.22522` | 11 | JointDiff: Bridging Continuous and Discrete in Multi-Agent T | Use JointDiff-style controllable generation to synthesize realistic what-would-happen-if play scenarios for data augmentation where GSE has too few settled pick |
| `1705.00885` | 10 | Quantifying the relation between performance and success in  | Adopt this paper's 'simulate an entire season from features, excluding realized outcomes' methodology as an additional backtest layer to stress-test GSE's model |
| `2004.06857` | 10 | A parsimonious family of multivariate Poisson-lognormal dist | Replace or augment GSE's scoring model with a parsimonious Poisson-lognormal variant to explicitly capture score overdispersion and cross-statistic correlation, |
| `2108.11149` | 10 | A Unified Taxonomy and Multimodal Dataset for Events in Inva | Apply the taxonomy-validation methodology (inter-annotator agreement studies) to audit ambiguity in GSE's own 'pick outcome' grading rules before they contamina |
| `2212.00021` | 10 | Location analysis of players in UEFA EURO 2020 and 2022 usin | Adapt this score-scaled event-probability framework to create a novel 'defensive value' pick category, differentiating GSE's soccer coverage from win-probabilit |
| `2308.01523` | 10 | Miss It Like Messi: Extracting Value from Off-Target Shots i | Use the same generative trajectory-mixture approach to other 'near-miss' sparse events across GSE's covered sports (e.g., near-interceptions in NFL, near-miss |
| `2403.12977` | 10 | SportsNGEN: Sustained Generation of Realistic Multi-player S | Use a similar generative rally/game simulator to produce synthetic 'what-if' match outcomes for backtesting GSE's calibration under sparse-data (bootstrap mode) |
| `2404.06626` | 10 | Why is soccer so popular: Understanding underdog achievement | Use the cross-sport randomness-factor decomposition to set sport-specific, variance-adjusted calibration targets (rather than one fixed Brier/ECE bar for all sp |
| `2406.00814` | 10 | Expected Possession Value of Control and Duel Actions for So | Adapt the decay-weighted event-timing and opponent-strength-adjusted duel modeling techniques into GSE's core engine to better account for recency and matchup c |
| `2406.16171` | 10 | Exploring the Difficulty of Estimating Win Probability: A Si | Run GSE's own version of this simulation study (synthetic games with known true probabilities) to quantify how much of GSE's calibration failure is intrinsic es |
| `2503.08945` | 10 | PassAI: explainable AI algorithm for soccer pass analysis us | Adapt PassAI's cross-modality contribution-decomposition technique as a template for explaining GSE's own pick probabilities in plain terms ('X% driven by team  |
| `2505.11841` | 10 | Framing Causal Questions in Sports Analytics: A Tutorial on  | Use this tutorial's estimand-choice framework as a checklist when GSE's engineers apply CEPT's e-process/causal methods to specific in-game actions, avoiding th |
| `2511.13326` | 10 | TacEleven: generative tactic discovery for football open pla | Repurpose the generator-critic pattern so one internal GSE agent proposes candidate calibration/ensemble configurations while another critiques them against the |
| `2605.10717` | 10 | Heteroscedastic Diffusion for Multi-Agent Trajectory Modelin | Adapt the RankNN-style error-probability ranking to score which of GSE's ensemble scenario forecasts to trust most, feeding directly into the bootstrap-mode con |
| `1206.6904` | 9 | A network theory analysis of football strategies | Feed passing-network centrality scores into GSE's per-sport soccer model as engineered features (e.g. 'network fragility if key playmaker removed') to improve M |
| `1511.06262` | 9 | Seasonal Linear Predictivity in National Football Championsh | Use seasonal linear predictivity as a diagnostic per-sport: sports/leagues where linear trend already predicts well may need less complex per-sport models, focu |
| `1512.05652` | 9 | Optimal Strategy in Basketball | Encode the risk/reward tradeoff framework as an underdog-detection feature: teams facing unfavorable win probability should show measurably higher-variance play |
| `1805.05009` | 9 | Deep Decision Trees for Discriminative Dictionary Learning w | Use the learned interaction dictionary as a feature layer feeding the Intelligence Graph, turning discovered team-strategy patterns into typed knowledge primiti |
| `1907.01221` | 9 | Visual analytics for team-based invasion sports with signifi | Adapt the continuous-state Markov reward process to generate a 'live pick value' surface, letting GSE visually show why a pick's confidence shifts as game state |
| `2004.07209` | 9 | Using Player's Body-Orientation to Model Pass Feasibility in | Use the general pattern (deriving a new geometric feature from cheap video/pose data to refine existing probability models) as a case study for identifying anal |
| `2503.19809` | 9 | Simulating Tracking Data to Advance Sports Analytics Researc | Use a similar RL-environment-driven synthetic data generator to stress-test GSE's ensemble/calibration models against synthetic edge-case game scenarios not wel |
| `2505.24783` | 9 | Paired comparison models with strength-dependent ties and or | Swap in this strength-dependent tie/order-effect model as an alternative or component of GSE's ensemble for draw-prone sports, potentially reducing calibration  |
| `2506.11399` | 9 | Time-Varying Home Field Advantage in Football: Learning from | Evaluate whether DYNAMO-style non-stationary causal discovery on GSE's own settled-pick data uncovers hidden time-varying biases (e.g., changing referee/venue e |
| `2508.09238` | 9 | ELASTIC: Event-Tracking Data Synchronization in Soccer Witho | Adapt ELASTIC's location-agnostic synchronization logic to reconcile timestamp drift between scraped play-by-play feeds and live odds-feed timestamps, reducing  |
| `2510.00480` | 9 | Expandable Decision-Making States for Multi-Agent Deep Rein | Incorporate EDMS-style relational features (marking pressure, passing lanes) into GSE's soccer model as interpretable inputs, satisfying math-you-can-read while |
| `2602.19513` | 9 | Real-time Win Probability and Latent Player Ability via STAT | Adapt the T-process's sequential win-probability updating as the backbone for GSE's live confidence recalibration between pick proposal and lock, not just prega |
| `2604.11786` | 9 | GenTac: Generative Modeling and Forecasting of Soccer Tactic | Adapt GenTac-style counterfactual rollouts (altering offensive/defensive guidance) to generate scenario-based confidence intervals around GSE's picks rather than  |
| `2604.23392` | 9 | SoccerRef-Agents: Multi-Agent System for Automated Soccer Re | Adapt the rule-grounded multi-agent RAG design to build an explainability agent that justifies GSE pick grading/settlement decisions by citing the specific rule |
| `1103.1530` | 8 | A Discrete Evolutionary Model for Chess Players' Ratings | Use the evolutionary rating model to predict how quickly a newly modeled sport's rating distribution should stabilize, setting data-driven timelines for exiting |
| `1807.07536` | 8 | A Skellam Regression Model for Quantifying Positional Value in Soccer | Use eLPAR-style positional decomposition to generate 'why this pick' explainer content for GSE's automated media generation, tying picks to specific tactical fa |
| `2004.04147` | 8 | Slicing and dicing soccer: automatic detection of complex ev | Use Interval Temporal Logic-style declarative event composition as the formal specification language underlying GSE's Intelligence Graph, letting typed knowledg |
| `2004.06172` | 8 | Event detection in coarsely annotated sports videos via para | Adapt the multi-receptive-field architecture to detect 'signal events' (line-moving news, injury reports) in noisy, imprecisely-timestamped scraped text/social |
| `2101.05388` | 8 | Evaluating Soccer Player: from Live Camera to Deep Reinforce | Adapt the simulation-trained RL valuation approach (no real labeled outcomes needed) to bootstrap better win-probability models for newly-added sports/leagues w |
| `2102.07545` | 8 | Data-driven Analysis for Understanding Team Sports Behaviors | Use the survey's counterfactual-simulation techniques to generate 'what-if' game outcome distributions as a transparent way to communicate pick confidence witho |
| `2103.09627` | 8 | Evaluation of soccer team defense based on prediction models | Apply the 'predict frequent proxy events instead of rare outcomes' principle to build auxiliary sub-models (e.g., predicting turnovers/possession) that feed int |
| `2106.00173` | 8 | Enhancing Trajectory Prediction using Sparse Outputs: Applic | Apply the sparse-output-plus-interpolation trick as a concrete architecture change to help GSE's prediction engine finally beat its naive baseline, rather than  |
| `2303.13323` | 8 | Deep Generative Multi-Agent Imitation Model as a Computation | Use the trained imitation model to simulate 'what an average team would have done here' as a novel explainability baseline for pick confidence. |
| `2311.04599` | 8 | Explainable artificial intelligence model for identifying Ma | Apply the same SHAP-explained GBDT approach to power a public-facing 'why this pick' breakdown naming top contributing statistical factors per prediction. |
| `2404.04213` | 8 | Modelling handball outcomes using univariate and bivariate a | Audit each of GSE's sport-specific scoring models against dispersion diagnostics like this paper's, swapping in Skellam/zero-inflated alternatives wherever the  |
| `2411.12509` | 8 | During and after COVID-19: What happened to the home advanta | Build a dynamic, utilization-sensitive home-advantage adjustment (rather than a static home/away flag) into GSE's per-sport probability models, informed by this |
| `2502.02785` | 8 | OpenSTARLab: Open Approach for Spatio-Temporal Agent Data An | Adopt OpenSTARLab's standardized event/tracking data schema as the backbone for GSE's MLS data-ingestion pipeline, reducing custom ETL work and enabling direct  |
| `2508.04008` | 8 | Leveraging Minute-by-Minute Soccer Match Event Data to Adjus | Apply the 'common denominator' context-adjustment to normalize GSE's own training features (e.g., garbage-time stats) before backtesting, potentially closing th |
| `2601.11492` | 8 | BoxMind: Closed-loop AI strategy optimization for elite boxi | Study BoxMind's probability-gradient-to-recommendation translation layer as a blueprint for turning GSE's calibrated pick probabilities into concrete bettor-fac |
| `2603.17866` | 8 | NFL step-and-turn: A generative framework for evaluating pla | Use posterior-predictive alternative-path simulations to synthesize extra training scenarios that widen GSE's sparse-data NFL samples for bootstrap-mode confide |
| `1109.2825` | 7 | Random Walk Picture of Basketball Scoring | Use the random-walk scoring model as a real-time in-game win-probability calculator, cross-checked against GSE's ensemble output as an independent 'physics-base |
| `2004.10299` | 7 | Group Activity Detection from Trajectory and Video Data in S | Use trajectory-based self-attention event detection as a data-quality cross-check, flagging when scraped box-score events disagree with detected on-field activi |
| `2012.14949` | 7 | Estimating the change in soccer's home advantage during the  | Audit GSE's soccer model for the same linear-vs-Poisson bias identified here; switching to bivariate Poisson regression for goal modeling could be a concrete, l |
| `2406.01273` | 7 | SoccerRAG: Multimodal Soccer Information Retrieval via Natur | Extend the RAG-over-multimodal-sports-data architecture into GSE's Intelligence Graph as the natural-language query layer, letting internal agents (Jarvis/Hermes/Fable) |
| `2409.13098` | 7 | Predicting soccer matches with complex networks and machine  | Build passing/possession network features from scraped play-by-play data as new engineered inputs to GSE's underperforming core model, potentially the 'genuinely better' |
| `2512.00203` | 7 | Beyond Expected Goals: A Probabilistic Framework for Shot Oc | Apply the model-the-selection-process-not-just-the-outcome fix wherever GSE's picks are conditioned on an event that itself needs modeling (e.g., whether a game |
| `2512.00312` | 7 | Kicking for Goal or Touch? An Expected Points Framework for  | Build analogous decision-boundary maps for GSE's own in-game betting recommendations (e.g., when live win probability justifies a hedge) using the same EP-surfa |
| `2609.11224` | 7 | AI Soccer Analyst: Stage-Aware and Verifiable Human-AI Colla | Adopt the stage-aware, evidence-grounded reporting pattern as the operating model for GSE's autonomous research agents so every model change or calibration fix  |
| `1908.00698` | 6 | Soccer Team Vectors | Use team-similarity vectors to power a 'find comparable historical matchups' explainer feature, adding narrative color to picks that stays within the determinis |
| `2011.01324` | 6 | Valuing Player Actions in Counter-Strike: Global Offensive | Extend the framework to esports/Galaxy Dynasty's persistent web game, giving in-game player actions real value scores that feed both the prediction engine and g |
| `2110.11107` | 6 | Extraction of Positional Player Data from Broadcast Soccer V | Adopt the module-interdependency evaluation methodology to audit how errors in GSE's own scraping→cleaning→modeling stages compound into calibration fai |
| `2410.07401` | 6 | Enhancing Soccer Camera Calibration Through Keypoint Exploit | If GSE ever scrapes broadcast video for supplemental stats, this pipeline's geometric-constraint approach could turn raw footage into structured spatial event d |
| `2410.17785` | 6 | TranSPORTmer: A Holistic Approach to Trajectory Understandin | Adopt the 'single model, multiple guided tasks via masking' design to unify GSE's win-probability forecasting and missing-data imputation into one architecture  |
| `2503.23935` | 6 | Nonparametric function-on-scalar regression using deep neura | Apply this deep function-on-scalar regression to model entire in-game probability trajectories (not just final win probability) as a function of pre-game scalar |
| `2509.09314` | 6 | Measuring Implicit Spatial Coordination in Teams: Effects on | Adapt the 'adaptive spatial proximity' metric as a new feature class for team-sport props (e.g., NFL/soccer positioning coherence) that could feed the predictio |
| `2605.31529` | 6 | SVI-Bench: A Dynamic Microworld for Strategic Video Intellig | Use SVI-Bench-style tasks as an internal evaluation suite to stress-test GSE's own research agents' ability to autonomously gather and integrate cross-game evid |
| `2607.05845` | 6 | A Behavioral Principle Underlying Attacker-Defender Interact | Encode the relative-speed-minimization principle as a derived tactical feature (defensive pressure quality) feeding GSE's soccer/MLS win-probability models, add |
| `2608.12926` | 6 | H-VAEP and H-xT: Valuing Offensive On-the-Ball Actions in Ha | Use the domain-adaptation methodology (sport-native zoning, leakage-controlled feature selection) as a blueprint for building GSE's own per-sport models for nic |
| `cond-mat/0409609` | 6 | Complex network study of Brazilian soccer players | Track evolving assortativity/clustering metrics of GSE's own player-team graph over time as a meta-signal for league |
