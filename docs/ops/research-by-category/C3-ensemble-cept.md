# C3-ensemble-cept: Ensemble / CEPT (heterogeneous experts)

## Mission (code this)

Combine incompatible experts with learned/BMA weights — not naive product. Odds as ensemble member optional.

## Code focus

- `prediction-engine ensemble`
- `CEPT docs`
- `offline weight estimation`

## Done when

Offline BMA/weight schedule proposal; common target defined; no live weight changes without tests.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `2206.13246` — Prediction of Football Player Value using Bayesian Ensemble Approach — **[C8]** B2B valuation widget only. Not C1/C2. **NEXTWAVE-YES**
- `2001.00878` — Predicting competitions by combining conditional logistic regression a — **[C3]**. A documented way to put an expert-rating model *in the ensemble* without letting it dominate: conditional logit likelihood is already a multiplicative contribution — CEPT
- `2608.21530` — Multimodal Injury Risk and Performance Prediction in Tennis Using Weig — **[C3][C5]**. Pattern: **learned ensemble weights by modality**, with injury as a *confidence downgrade* not a point-estimate hack. Maps to bootstrap-mode when a starter is questio
- `2203.07029` (see High dossiers)

## Medium priority (implement from these first)

- `2008.04216` (score 12) Using Experts' Opinions in Machine Learning Tasks — Formally incorporate The Odds API's market-implied probabilities as an explicit ensemble member (not just a benchmark for CLV), directly targeting the calibration gate via odds-anchored blending.
- `2203.07029` (score 13) SuperCone: Unified User Segmentation over Heterogeneous Experts via Co — Use SuperCone's heterogeneous-expert attention mechanism as the technical blueprint for the CEPT multiplicative-weight ensemble, letting GSE combine structurally different models per sport without for
- `2103.13736` (score 13) Deep Similarity Learning for Sports Team Ranking — Benchmark triplet-loss Siamese ranking against GSE's current prediction engine on held-out picks, potentially adopting it as one arm of the multiplicative-weight ensemble if it improves MAE.

## Full Medium assigned to this category (75)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `1211.5290` | 13 | EMMIX-uskew: An R Package for Fitting Mixtures of Multivaria | Fit skew-t mixtures per sport to model residual error distributions, using divergence from a well-fit mixture as an automated trigger for flagging when a sport  |
| `1211.6496` | 13 | TwitterPaul: Extracting and Aggregating Twitter Predictions | Build a 'crowd wisdom' auxiliary signal from social media predictions as one member of GSE's multiplicative-weight ensemble (CEPT), weighted dynamically based o |
| `2010.09211` | 13 | Unsupervised Domain Adaptation for Spatio-Temporal Action Lo | Borrow the domain-adaptation module design as a conceptual template for adapting a global calibrator to a new sport with little data, rather than fully retraini |
| `2105.08310` | 13 | BBE: Simulating the Microstructural Dynamics of an In-Play B | Run GSE's calibration pipeline against BBE-simulated markets to pre-validate whether a proposed per-sport model or ensemble change would pass the three-consecut |
| `2211.12217` | 13 | Where Will Players Move Next? Dynamic Graphs and Hierarchica | Adapt DyMF's interaction-style-extractor concept to model matchup-specific dynamics (e.g., pitcher-batter or QB-defense) as a feature layer in GSE's core predic |
| `2303.17863` | 13 | Can the hot hand phenomenon be modelled? A Bayesian hidden M | Add a hidden hot/cold-state layer to GSE's player-level features so the ensemble can dynamically adjust confidence based on inferred streakiness. |
| `2509.22111` | 13 | Modeling Psychological Profiles in Volleyball via Mixed-Type | Apply latent MMHC structure learning to discover interpretable relationships among GSE's own heterogeneous features (injury reports, momentum, market odds), fee |
| `2601.03099` | 13 | Time-Aware Synthetic Control | Use TASC to build counterfactual 'what if this change hadn't happened' baselines that feed as calibrated features into GSE's ensemble, rather than only forecast |
| `physics/0608007` | 13 | Parity and Predictability of Competitions | Use league-specific parity-upset relationships as a data-driven prior for each sport's per-sport probability model, giving the ensemble a principled starting Br |
| `1909.12938` | 12 | Time Series Modeling for Dream Team in Fantasy Premier Leagu | Repurpose the ARIMA+RNN ensemble and LP-optimizer combo as the engine behind Galaxy Dynasty/AUGUR's roster-building mechanics, reusing GSE's own forecasting sta |
| `2305.07740` | 12 | Double-Iterative Gaussian Process Regression for Modeling Er | Use a GPR 'residual corrector' layer atop the core model's outputs, trained on the worst-miscalibrated picks, as a lightweight patch ahead of a full ensemble re |
| `2507.18404` | 12 | Convergence Rate of Efficient MCMC with Ancillarity-Sufficie | Use ASIS-accelerated MCMC to make Bayesian hierarchical per-sport probability models (individually calibrated per sport, as the founder suspects is needed) comp |
| `1107.5474` | 11 | Selecting Attributes for Sport Forecasting using Formal Conc | Use FCA-derived implication rules as an auxiliary, fully interpretable confidence-adjustment layer that explains in plain language why bootstrap mode capped a g |
| `1511.04351` | 11 | A Scalable Framework for NBA Player and Team Comparisons Usi | Use the Statistical Diversity Index concept to power a B2B embeddable widget letting clients explore 'similar player/team' comparisons as a lightweight product  |
| `2201.01168` | 11 | Application of the Pythagorean Expected Wins Percentage and  | Test the serial contest-success-function form as a drop-in replacement or ensemble input for GSE's baseline win-probability calculations, potentially closing pa |
| `2308.11142` | 11 | Graph Encoding and Neural Network Approaches for Volleyball  | Apply the same contact-by-contact graph-encoding idea to GSE's Intelligence Graph, representing sequential game events (drives, possessions, at-bats) as graphs  |
| `2404.13300` | 11 | Capturing Momentum: Tennis Match Analysis Using Machine Lear | Build an HMM-based 'momentum state' layer feeding into live win-probability updates, giving GSE a defensible, transparent mathematical basis (not 'AI hype') for |
| `2409.02872` | 11 | Momentum Dynamics in Competitive Sports: A Multi-Model Analy | Add a TOPSIS-derived momentum score as a live, updating feature into GSE's ensemble to capture within-game performance swings that static pre-game features miss |
| `2509.21421` | 11 | The Impact of the UEFA Women's EURO on Hotel Overnight Stays | Apply Synthetic DiD to estimate causal effects of roster changes, coaching changes, or rule changes on team performance, feeding validated causal effect sizes i |
| `2603.26935` | 11 | The Load Management Paradox: Correcting the Healthy-Worker S | Apply this marginal-structural-model approach to correct selection bias in GSE's own injury/availability features, preventing the model from learning the same ' |
| `1810.03383` | 10 | Illusion of persistence in NBA 1995-2018 regular season data | Build a standing internal null-model benchmark (per this paper's method) that any new candidate feature (e.g., CEPT-derived signals) must beat before being trus |
| `1907.01615` | 10 | E-Sports Talent Scouting Based on Multimodal Twitch Stream D | Use the hierarchical Bayesian pooling scheme to combine GSE's disparate signal sources (scraped stats, odds movement, CEPT e-process outputs) into one coherent  |
| `1910.03400` | 10 | Inequalities, chance and success in sport competitions: simu | Use the luck-decomposition method to communicate to stakeholders why a model can be well-calibrated yet still 'lose' individual bets — reframing variance as exp |
| `2002.04148` | 10 | The role of intrinsic dimension in high-resolution player tr | Use intrinsic-dimension spikes as a real-time 'chaos index' that automatically triggers bootstrap-mode confidence capping when a game enters an unusually unpred |
| `2003.04787` | 10 | Pursuing Sources of Heterogeneity in Modeling Clustered Popu | Apply this heterogeneity-pursuit regression to formally test and justify which model components should be sport-specific versus shared globally, giving an empir |
| `2211.02104` | 10 | Pre-analysis protocol for an observational study on the effe | Adapt the ordered-hypothesis-testing-across-a-hierarchy design to structure GSE's own multiple calibration-window testing (global model vs. sport-specific sub-m |
| `2306.10560` | 10 | Shannon Entropy and Herfindahl-Hirschman Index as Team's Per | Use HHI/entropy of a market's odds distribution as a real-time market-efficiency proxy akin to closing-line value, especially in thin/illiquid sports. |
| `2307.05825` | 10 | Bayesian taut splines for estimating the number of modes | Use this multimodality-detection technique to check whether GSE's settled-pick outcome distributions are unexpectedly multimodal (e.g., due to distinct game-sta |
| `2311.16564` | 10 | Multi-agent statistical discriminative sub-trajectory mining | Mine discriminative sub-trajectories as automated feature generators feeding the per-sport ensemble GSE needs to fix its failing calibration gate, rather than r |
| `2404.01909` | 10 | A Temporal Graph Model to Study the Dynamics of Collective B | Feed live in-game entropy trajectories into the pick engine to dynamically flag momentum shifts, tightening in-play confidence bands beyond static box-score fea |
| `2410.21484` | 10 | A Systematic Review of Machine Learning in Sports Betting: T | Mine its 'future directions' section (adaptive multimodal risk-management models) as a roadmap input for GSE's next-gen ensemble and portfolio-style confidence  |
| `2507.01340` | 10 | Physics-informed Ground Reaction Dynamics from Human Motion  | Borrow the 'physics-as-constraint' pattern to build a domain-knowledge-informed regularizer for GSE's prediction models (e.g., enforcing win-probability monoton |
| `2507.02904` | 10 | Enhancing Sports Strategy with Video Analytics and Data Mini | The hybrid 'MLLM + traditional model ensemble' pattern for closing MLLM gaps parallels how GSE could combine CEPT-based e-process signals with conventional ML i |
| `2508.17611` | 10 | Evaluating Movement Initiation Timing in Ultimate Frisbee vi | Apply the temporal-counterfactual framework to backtest GSE's pick-timing: quantify how much closing-line value is lost/gained by publishing a pick earlier or l |
| `2111.04085` | 9 | Modelling and Optimisation of Resource Usage in an IoT Enabl | No direct fit; at most a conceptual analogy for 'utilization forecasting' methodology transferable to bettor-engagement/usage forecasting on the GSE platform. |
| `2212.06301` | 9 | Egocentric Video Task Translation | Borrow the shared-translator-across-task-specific-backbones pattern to let GSE's per-sport models share a common calibration-translation layer instead of one gl |
| `2311.17077` | 9 | Game-Theoretic Analysis of Adversarial Decision Making in a  | Could inspire modeling team-vs-team strategic resource allocation (e.g., bullpen usage, rotation management) as a Kuramoto-Lotka-Volterra adversarial system, fe |
| `2407.01797` | 9 | Empirical Determination of Baseball Eras: Multivariate Chang | Run multivariate changepoint detection on GSE's own historical training corpora per sport to automatically segment 'eras' and avoid training the ensemble on sta |
| `2509.11362` | 9 | PersonaX: Multimodal Datasets with LLM-Inferred Behavior Tra | Mine AthlePersona-style LLM-inferred athlete traits (composure, leadership) as auxiliary features in the ensemble, testing whether personality signals improve c |
| `2509.25858` | 9 | Aging Decline in Basketball Career Trend Prediction Based on | Feed LSTM-predicted age-adjusted performance trajectories as a forward-looking feature into GSE's ensemble, helping correct for aging-curve effects the current  |
| `1105.0755` | 8 | Using Logistic Regression to Analyze the Balance of a Game:  | Apply this balance-testing methodology to audit Galaxy Dynasty's game mechanics for unintended statistical advantages before wide release, avoiding a 'pay-to-wi |
| `2006.04551` | 8 | Cracking the Black Box: Distilling Deep Sports Analytics | Distill any future black-box ensemble (including CEPT-based components) into a public-facing linear model tree, letting GSE publish transparent 'why this pick'  |
| `2012.04380` | 8 | Combining Machine Learning and Human Experts to Predict Matc | Feed GSE's own auto-generated pre-game content (or scraped beat-writer previews) back into the model as a text-derived feature, closing the loop between content |
| `2303.16741` | 8 | Who You Play Affects How You Play: Predicting Sports Perform | Use the player-interaction attention weights as an interpretable 'who influences whom' explanation layer, feeding GSE's 'math you can read' pick rationales. |
| `2309.05682` | 8 | A compendium of data sources for data science, machine learn | Mine the compendium's cross-domain sources (e.g., news sentiment, social media) for auxiliary signals to feed into GSE's per-sport ensemble as exogenous feature |
| `2403.08835` | 8 | Stacking-based deep neural network for player scouting in fo | Apply the stacking architecture pattern to GSE's core prediction ensemble as an alternative to (or component of) the founder's CEPT multiplicative-weight ensemb |
| `2405.02412` | 8 | Deep Learning and Transfer Learning Architectures for Englis | Repurpose the compact CNN architecture (few features, strong Spearman correlation) as a lightweight ensemble member for player-prop or fantasy-adjacent GSE mark |
| `2503.22757` | 8 | Strategies for decentralised UAV-based collisions monitoring | No credible direct application; at most, the decentralized-multi-agent-coordination-for-event-capture concept is a loose structural analogy to how GSE's own dis |
| `2506.01466` | 8 | Towards Scalable Video Anomaly Retrieval: A Synthetic Video- | The synthetic-data-for-rare-events strategy could be adapted (in non-video form) to generate synthetic rare game scenarios (e.g., unusual blowouts, overtime pat |
| `2511.04491` | 8 | RUST-BENCH: Benchmarking LLM Reasoning on Unstructured Text  | Use RUST-BENCH-style stress tests to validate whether GSE's internal agents can be trusted to query/reason over its own heterogeneous Prisma/Postgres tables bef |
| `2602.00676` | 8 | OpenGuanDan: A Large-Scale Imperfect Information Game Benchm | Use OpenGuanDan's evaluation methodology (pairwise agent competition, human-AI matchups) as a template for benchmarking GSE's own multi-agent research tools (Ja |
| `2606.17615` | 8 | SkillMoV: Mixture-of-View Routing with Prototype-Conditioned | Borrow the mixture-of-experts routing pattern to let GSE's ensemble automatically weight per-sport sub-models rather than hand-tuning a single global calibrator |
| `1209.5477` | 7 | Optimal Weighting of Multi-View Data with Low Dimensional Hi | Apply the multi-view weighting method to fuse GSE's disparate data sources (Odds API, scraped box scores, social sentiment) into a single denoised feature per p |
| `1712.01199` | 7 | tHoops: A Multi-Aspect Analytical Framework for Spatio-Tempo | Apply tensor decomposition across sport/team/time to auto-discover interpretable 'style archetypes' that could feed both the Intelligence Graph and explainable  |
| `2104.00853` | 7 | Streaming Social Event Detection and Evolution Discovery in  | Adapt the heterogeneous-graph event-detection architecture as a technical blueprint for GSE's planned Intelligence Graph, streaming new sports events into typed |
| `2307.11780` | 7 | Beep: Balancing Effectiveness and Efficiency when Finding Mu | Use Beep-style LSH-accelerated pattern mining to automatically surface recurring multivariate tactical patterns across GSE's ingested event data, feeding candid |
| `2402.12149` | 7 | MLFEF: Machine Learning Fusion Model with Empirical Formula  | Apply the CUMSUM/Run-test statistical framework to validate whether GSE's own live 'momentum' signals are genuinely non-random before trusting them in confidenc |
| `2502.02817` | 7 | A Decade of Action Quality Assessment: Largest Systematic Su | Use the survey's taxonomy of quality-scoring metrics as a design reference if GSE ever builds a 'player form quality' score feeding into its ensemble models. |
| `2508.12695` | 7 | Neural Rendering for Sensor Adaptation in 3D Object Detectio | Only a very indirect analogy: the general idea of synthetically adapting data to a new 'sensor' configuration parallels adapting a model trained on one sport's  |
| `2511.00553` | 7 | Breaking Down the Scoring: Interrater Reliability and Nation | Apply the same ICC/bias-detection methodology to audit whether GSE's human-curated inputs (manual line adjustments, expert overrides) show systematic bias befor |
| `1512.08773` | 6 | Hot Hands, Streaks and Coin-flips: Numerical Nonsense in the | Use this paper's examples as internal training material for GSE's content-generation system, teaching it to avoid manufacturing false 'hot streak' narratives in |
| `1610.03121` | 6 | Measuring and Modelling Crowd Flows - Fusing Stationary and  | Apply the multi-source data-fusion methodology (combining sparse 'stationary' checkpoints with continuous 'floating' traces) as a design pattern for reconciling |
| `1808.03027` | 6 | Sentimental Content Analysis and Knowledge Extraction from N | Use the cross-country sentiment comparison technique to monitor regional media narrative differences around teams/events, feeding a novel sentiment-based contex |
| `1812.08755` | 6 | A Bayesian Additive Model for Understanding Public Transport | Adapt the additive-effects disaggregation technique to separate overlapping influences on betting-market movement (e.g., weather, injury news, public betting) w |
| `1909.07945` | 6 | ProtoGAN: Towards Few Shot Learning for Action Recognition | Explore synthetic scenario generation (GAN-style) to augment sparse early-season MLS/new-market data, giving the calibrator more synthetic 'settled picks' to st |
| `2111.02874` | 6 | Deep Artificial Intelligence for Fantasy Football Language U | Mine scraped news/injury-report text with similar entity detectors as a bootstrap-mode confidence input, downgrading confidence when news-derived uncertainty si |
| `2211.01201` | 6 | Human alignment of neural network representations | Use this paper's linear-transformation-alignment technique to fine-tune any general-purpose embedding GSE's agents (Jarvis/Hermes/Fable) use so sports-domain co |
| `2307.16000` | 6 | Automated Hit-frame Detection for Badminton Match Analysis | The multi-stage 'raw feed to structured event' pipeline pattern could inspire how GSE's data-ingestion team structures a video-to-structured-event extractor if  |
| `2402.06594` | 6 | They were robbed! Scoring by the middlemost to attenuate bia | Apply the middlemost-aggregation concept to GSE's own multi-model ensemble voting (combine per-sport sub-models via 'majority round wins' rather than simple ave |
| `2405.07030` | 6 | Lasso Ridge based XGBoost and DeepLSTM Help Tennis Players P | Adopt the sliding-window momentum-scoring technique as a feature engineering primitive that feeds GSE's ensemble, improving in-play pick confidence during live  |
| `2408.09178` | 6 | MambaTrack: A Simple Baseline for Multiple Object Tracking w | Conceptually mirror this 'replace the naive linear model with a learned state-space model' pattern when redesigning GSE's core forecasting model to beat its nai |
| `2410.22288` | 6 | Motion Graph Unleashed: A Novel Approach to Video Prediction | Borrow the graph-node relational representation concept (not the vision application) as a lightweight architectural pattern for encoding relational sports-entit |
| `2506.05763` | 6 | Where Is The Ball: 3D Ball Trajectory Estimation From 2D Mon | The core lesson — train entirely on well-designed synthetic data and generalize to reality — supports using synthetic backtests to stress-test GSE's ensemble un |
| `2506.11786` | 6 | SSPINNpose: A Self-Supervised PINN for Inertial Pose and Dyn | Explore a 'self-supervised via domain constraints' approach for GSE's calibration model, using known probabilistic consistency constraints (e.g., probabilities  |
| `2606.28570` | 6 | Digitizing Coaching Intelligence: An Agentic Framework for H | Adopt the LLM-as-judge self-correction loop pattern for GSE's own agents to cross-check calibration/ensemble outputs against ground-truth settled picks before p |
