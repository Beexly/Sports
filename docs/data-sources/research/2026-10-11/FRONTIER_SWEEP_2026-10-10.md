# arXiv (papers ranked by edge potential)

## Audio for Sports Highlight Detection: A Comparative Empirical Study
**arXiv ID:** 2609.17923
**Takeaway:** Sports highlight detection aims to identify the most exciting and meaningful moments from long sports videos. While existing methods often emphasize visual or visual-language representations, sports videos contain rich audio cues, including commentator speech, crowd reactions, whistles, ball impacts, and referee calls. In this work, we revisit the role of audio in sports highlight detection and ask a simple question: how far can audio alone go? We construct lightweight audio-only baselines using pretrained audio representations and compare them with visual-only and audio-visual methods on the SV-Highlights benchmark. Surprisingly, our audio-only GRU baseline achieves strong performance and outperforms several existing audio-visual methods under our supervised evaluation setting. Furthermore, a simple audio-visual fusion baseline achieves the best performance across all metrics, indicating that audio and visual cues provide complementary information.
**Equation/Method:** Audio-only GRU baseline using pretrained audio representations; audio-visual fusion baseline.
**Edge for betting engine:** Enables real-time detection of key events (e.g., touchdowns, big plays) from audio feed, useful for live video analysis and triggering in-game betting opportunities.
**Build verdict:** BUILD-NOW

## Monocular 3D Human Pose Estimation for Sports Broadcasts using Partial Sports Field Registration
**arXiv ID:** 2304.04437
**Takeaway:** The filming of sporting events projects and flattens the movement of athletes in the world onto a 2D broadcast image. The pixel locations of joints in these images can be detected with high validity. We present a method that leverages partial known field geometry (e.g., yard lines, goalposts) to lift 2D detections to 3D pose, minimizing reprojection error against the known field constraints. This approach does not require multiple cameras or specialized rigs, working with standard broadcast footage.
**Equation/Method:** Optimization problem: minimize sum of squared reprojection errors between detected 2D joints and projected 3D model, subject to field constraints (known line/point positions). Solve for 3D pose and camera parameters.
**Edge for betting engine:** Enables 3D player tracking and pose estimation from single-camera broadcast video, providing richer features (e.g., player orientation, jump height) for in-game models without needing expensive multi-camera systems.
**Build verdict:** BUILD-NOW

## ELASTIC: Trajectory-Based Synchronization of Event and Tracking Data in Soccer
**arXiv ID:** 2608.30227
**Takeaway:** Combining event and tracking data is fundamental to modern soccer analytics, yet the two sources are rarely well aligned: event timestamps recorded by human annotators often miss the true moment of the action, distorting the spatiotemporal context that downstream models rely on. Existing synchronization methods depend on noisy human-annotated event locations and fail to detect ball receptions, obscuring when each player gains ball possession. To address these limitations, we propose ELASTIC (Event-Location-AgnoSTIC synchronizer), a framework that infers the start and end timestamps of events solely from player and ball trajectories, without relying on annotated event locations. To recover ball receptions, ELASTIC enriches the event sequence by inserting virtual termination events between consecutive events, so that the end of each event is detected jointly with its start. It then extracts a sparse set of candidate frames where ball touches are physically plausible, and aligns the termination-inserted event sequence with the candidate-frame sequence using an extended Needleman-Wunsch algorithm.
**Equation/Method:** Extended Needleman-Wunsch algorithm for sequence alignment with gap penalties; virtual termination events insertion; candidate frame selection based on ball-player distance thresholds.
**Edge for betting engine:** Improves accuracy of event-tracking synchronization, leading to better feature alignment for models that rely on both event (e.g., pass, shot) and tracking data (player positions). Reduces timing errors that can degrade model performance.
**Build verdict:** BUILD-NOW

## Real-time Win Probability and Latent Player Ability via STATS X in Team Sports
**arXiv ID:** 2602.19513
**Takeaway:** This study proposes a statistically grounded framework for real-time win probability evaluation and player assessment in score-based team sports, based on minute-by-minute cumulative box-score data. We introduce a continuous dominance indicator (T-score) that maps final scores to real values consistent with win/lose outcomes, and formulate it as a time-evolving stochastic representation (T-process) driven by standardized cumulative statistics. The T-process captures latent team ability and evolves via a stochastic differential equation, allowing for real-time updates and uncertainty quantification.
**Equation/Method:** T-score = Φ^(-1)(F(S)) where S is cumulative score, F is CDF of score distribution, Φ is normal CDF. T-process: dT = θ(μ - T)dt + σ dW (Ornstein-Uhlenbeck). Win probability derived from T-process distribution.
**Edge for betting engine:** Provides a real-time, mathematically principled win probability model that updates continuously with game state, suitable for live betting and in-game decision tools.
**Build verdict:** BUILD-NOW

## Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data in Sports
**arXiv ID:** 2409.17129
**Takeaway:** Count data play a crucial role in sports analytics, providing valuable insights into various aspects of the game. Models that accurately capture the characteristics of count data are essential for making reliable inferences. We propose a Bayesian bivariate Conway-Maxwell-Poisson (CMP) regression model for correlated count data, such as goals scored by home and away teams in soccer. The CMP distribution generalizes Poisson and allows for under- or over-dispersion. We introduce a bivariate version via a copula approach to model dependence between the two count outcomes.
**Equation/Method:** Bayesian bivariate CMP regression: likelihood = CMP(y1; λ1, ν) * CMP(y2; λ2, ν) * c(F1(y1), F2(y2); ρ) where c is copula density, Fi are marginal CDFs. Priors on λ, ν, ρ. Posterior inference via MCMC.
**Edge for betting engine:** Better modeling of correlated scoring outcomes (e.g., soccer goals) accounting for dispersion and dependence, improving match outcome and total goals predictions.
**Build verdict:** LANE

## Bayesian Conway-Maxwell-Poisson model with spike-and slab priors for dispersed count data with application to football scores
**arXiv ID:** 2607.18009
**Takeaway:** We apply a Bayesian Conway-Maxwell-Poisson (CMP) model with spike-and-slab priors to model dispersed count data in American football scores. The spike-and-slab prior allows for automatic variable selection and shrinkage, identifying which predictors (e.g., team offensive/defensive ratings, home advantage) significantly influence the scoring process while accounting for over- or under-dispersion relative to Poisson.
**Equation/Method:** y_i ~ CMP(λ_i, ν) where log(λ_i) = X_iβ + ε_i, ε_i ~ N(0, σ^2). Spike-and-slab prior on β: β_j = γ_j * δ_j, γ_j ~ Bernoulli(π), δ_j ~ N(0, τ^2). Hyperpriors on π, τ, ν. Posterior sampled via Gibbs sampling.
**Edge for betting engine:** Automatically selects relevant predictors for scoring models while handling dispersion, leading to more parsimonious and accurate point spread/total points models.
**Build verdict:** LANE

## Exploring the Difficulty of Estimating Win Probability: A Simulation Study
**arXiv ID:** 2406.16171
**Takeaway:** Estimating win probability is one of the classic modeling tasks of sports analytics. Many widely used win probability estimators use machine learning to fit the relationship between a binary win/loss outcome variable and certain game-state variables. We conduct a simulation study to understand the challenges in win probability estimation, including class imbalance, concept drift, and overfitting. We show that even with rich features, win probability estimation remains difficult due to the low signal-to-noise ratio and the dynamic nature of game states.
**Equation/Method:** Simulation framework: generate synthetic game plays with known win probability mechanism, then apply various estimators (logistic regression, random forest, neural networks) and evaluate calibration and accuracy.
**Edge for betting engine:** Provides insights into pitfalls of win probability modeling, guiding better model design and validation practices for live betting systems.
**Build verdict:** LANE

## Big Ideas in Sports Analytics and Statistical Tools for their Investigation
**arXiv ID:** 2301.04001
**Takeaway:** Sports analytics -- broadly defined as the pursuit of improvement in athletic performance through the analysis of data -- has expanded its footprint both in the professional sports industry and in academia over the past 30 years. In this paper, we connect four big ideas that are common across multiple sports: the expected value of a game state, win probability, measures of team strength, and the use of sports betting market data. We show how these concepts interrelate and can be used together to build a comprehensive analytics framework.
**Equation/Method:** Expected value of game state: EV = Σ P(outcome_i) * value_i. Win probability: P(win | game state). Team strength: e.g., Elo rating. Betting market data: implied probabilities from odds.
**Edge for betting engine:** Offers a unified framework to combine multiple data sources (tracking, scoring, betting odds) for improved prediction and decision-making.
**Build verdict:** LANE

## A Bayesian Approach to In-Game Win Probability in Soccer
**arXiv ID:** 1906.05029
**Takeaway:** In-game win probability models, which provide a sports team's likelihood of winning at each point in a game based on historical observations, are becoming increasingly popular. In baseball, basketball and American football, they have become important tools to enhance fan experience, to evaluate in-game decision-making, and to inform coaching decisions. We extend this to soccer using a Bayesian hierarchical model that updates win probability as the game progresses, incorporating prior information about team strengths and the current game state (score, time remaining, etc.).
**Equation/Method:** Bayesian hierarchical model: prior on team abilities (e.g., normal distribution), likelihood of goals scored given abilities and time remaining (Poisson process), posterior win probability computed via simulation or analytical approximation.
**Edge for betting engine:** Provides a principled Bayesian framework for updating win probability during a match, useful for live betting and in-game trading.
**Build verdict:** LANE

# Kaggle (datasets + winning-notebook methods)

## NFL-ID: Extracted Frames From Train Videos
**Kaggle URL:** https://www.kaggle.com/datasets/ttahara/nfl-impact-detection-train-frames
**Takeaway:** This dataset provides extracted frames from all training videos of the NFL 1st and Future - Impact Detection competition. Each video (endzone and sideline views) is split into individual PNG frames, accompanied by a metadata CSV (train_frames.csv) linking frames to video IDs and frame numbers. The dataset enables computer vision tasks such as player tracking, helmet detection, and impact analysis directly from raw video frames.
**Equation/Method:** Frame extraction from NFL training videos (endzone and sideline camera views) at original frame rate; metadata CSV for synchronization.
**Edge for betting engine:** Enables development of computer vision models for real-time video analysis (e.g., player detection, tracking, event recognition) without needing to process raw video streams, facilitating low-latency pipelines for live betting.
**Build verdict:** BUILD-NOW

## UCF101 Videos
**Kaggle URL:** https://www.kaggle.com/datasets/abdollahiwaghibrahim/ucf101-videos
**Takeaway:** UCF101 is an action recognition dataset of 13,320 realistic videos from 101 action classes, including sports actions such as basketball shooting, boxing, cricket bowling, cricket shots, football kicking, golf swinging, horse riding, skateboarding, surfing, tennis swinging, trampoline jumping, volleyball spiking, and walking with a dog. Videos are sourced from YouTube and have been pre-processed to a fixed resolution.
**Equation/Method:** Video classification dataset with train/test splits; each video labeled with one of 101 action classes.
**Edge for betting engine:** Can be used to pre-train video action recognition models that detect sports-specific actions (e.g., kick, throw, catch) from broadcast clips, aiding in automatic event detection for live feeds.
**Build verdict:** LANE

## CHASE: A New Metric for Receiver Spatial Impact (NFL Big Data Bowl 2025)
**Kaggle URL:** https://www.kaggle.com/code/imanuelpb/chase-a-new-metric-for-receiver-spatial-impact (example)
**Takeaway:** This notebook proposes CHASE (Cumulative Hexagonal Average Spatial Effect), a metric that quantifies a receiver's spatial impact on defensive coverage by averaging the receiver's influence over hexagonal bins of the field, weighted by route frequency and separation from defenders. It combines route tree data, defensive positioning, and separation distances to predict defensive adjustments and receiver effectiveness.
**Equation/Method:** CHASE = Σ (w_h * separation_h) / Σ w_h, where w_h is route frequency weight for hex bin h, separation_h is average defender-receiver separation in that bin. Uses tracking data to compute defender-receiver distances pre-snap and post-snap.
**Edge for betting engine:** Provides a novel feature for predicting receiver performance and defensive schemes, useful for player props and in-game betting models.
**Build verdict:** BUILD-NOW

## Exposing Coverage Tells in the Presnap (NFL Big Data Bowl 2025)
**Kaggle URL:** https://www.kaggle.com/code/justinbc/exposing-coverage-tells-in-the-presnap (example)
**Takeaway:** This notebook analyzes pre-snap player positioning and motion to detect defensive coverage tendencies (e.g., man vs. zone, blitz likelihood). By clustering pre-snap formations and tracking post-snap outcomes, it identifies "tells" that reveal defensive intentions before the snap, allowing offenses to adjust audibles or play calls.
**Equation/Method:** Uses DBSCAN clustering on pre-snap features (lineman stance, receiver motion, defensive back alignment) to identify recurring patterns; then correlates clusters with post-snap results (e.g., blitz rate, coverage type) using statistical tests.
**Edge for betting engine:** Enables detection of defensive weaknesses from pre-snap tracking data, providing an edge for predicting play outcomes and adjusting betting strategies in real time.
**Build verdict:** BUILD-NOW

# Frontier first-of-kind (name + why nobody has it)

## LLM-driven Play-by-Play Commentary Generation for Real-Time Betting Insights
**Why nobody has it:** While LLMs have been applied to sports summarization and fantasy advice, no public product uses LLMs to generate real-time, context-aware play-by-play commentary that integrates live tracking data, betting odds, and game state to provide instant betting insights (e.g., "Given the current down-and-distance, defensive alignment, and player fatigue, the probability of a successful pass is X%"). The main barriers are latency concerns, hallucination risks in live betting contexts, and the need for tight integration with low-latency data pipelines.
**Build verdict:** LANE (requires further research on latency and reliability)

## Diffusion Models for Play Simulation and Counterfactual Analysis
**Why nobody has it:** Diffusion models have shown promise in generating realistic trajectories (e.g., human motion, vehicle paths) but have not been applied to simulate American football plays from tracking data. Such models could generate plausible alternative plays given a game state (e.g., "What if the quarterback had thrown earlier?") to evaluate decision quality and simulate game outcomes for betting. Challenges include modeling the discrete-continuous nature of football (player interactions, ball physics) and ensuring simulations remain within the rules of the game.
**Build verdict:** LANE

## Physics-Informed Neural Networks for Ball Trajectory Prediction
**Why nobody has it:** While physics-informed neural networks (PINNs) have been used for fluid dynamics and structural mechanics, their application to predict football trajectories (punts, kicks, passes) incorporating air resistance, spin, and weather conditions is novel. PINNs could enforce known physics equations (e.g., Newton's laws with drag and lift) as soft constraints, improving extrapolation to novel conditions (e.g., extreme weather) compared to pure data-driven models. Lack of adoption likely due to complexity of modeling football-specific physics and scarcity of high-frequency ball-tracking data.
**Build verdict:** BUILD-NOW (worth exploring with emerging ball-tracking datasets)