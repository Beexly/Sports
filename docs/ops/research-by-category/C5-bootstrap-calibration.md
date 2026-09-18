# C5-bootstrap-calibration: Bootstrap mode, partial ranks, calibration gates

## Mission (code this)

No fake precision under sparsity; conformal/partial-rank caps; humility CI rule; Balance-score / LRD diagnostics.

## Code focus

- `confidence display`
- `board ties`
- `calibration dashboards`
- `bootstrap advisory`

## Done when

Do not lock when 95% CI crosses 0.5 or market p (advisory); tie clusters on board; launch thresholds untouched.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `2208.08598` — Using Conformal Win Probability to Predict the Winners of the Cancelle — **[C1][C5][C4]**. Strongest off-the-shelf replacement for ad-hoc bootstrap caps: wrap *whatever* margin model GSE uses in a CPD and publish \(\pi\), not a point probability. Confor **NEXTWAVE-YES**
- `2501.02505` — Estimation of partial rankings from sparse, noisy comparisons — **[C5]** primary replacement for bootstrap mode, plus **[C1]**. Early-season / thin-league: output a partial order and cap published confidence at the posterior separation. If two  **NEXTWAVE-YES**
- `2406.19563` — Bayesian Rank-Clustering — **[C5][C1]**. Publish “these three teams are in the same tier” instead of fake 51/49 precision. That is a brand-honest move (“math you can read”) and a calibration move (don’t emit **NEXTWAVE-YES**
- `2311.03490` — Analytics, have some humility: a statistical view of fourth-down decis — **[C1][C5][C8]** brand paper. If GSE publishes 57% as if it were 70%, this is why ECE fails. Operational rule: **do not lock a pick whose 95% interval crosses 0.5** (or crosses the **NEXTWAVE-YES**
- `2207.13770` — Calibrate: Interactive Analysis of Probabilistic Model Output — **[C1][C8]**. This is the calibration-*dashboard* for the launch gate, not a model. Replace static 10-bin ECE plots with: LRD + sport/league/week subgroup brush + instance-level mi

## Medium priority (implement from these first)

- `0705.3257` (score 13) Evaluating Throwing Ability in Baseball — Directly port this hierarchical-shrinkage Bayesian approach as the statistical basis for GSE's 'bootstrap mode,' replacing an ad hoc confidence cap with a principled, published methodology.
- `2312.04711` (score 13) Luck, skill, and depth of competition in games and social hierarchies — Use the paper's per-sport luck/depth estimates as priors to calibrate GSE's Brier/ECE targets per sport — high-luck sports should get wider uncertainty bands, not tighter ones.
- `1605.03471` (score 13) Nonparametric hierarchical Bayesian quantiles — Apply hierarchical quantile pooling to 'bootstrap mode' — instead of blanket confidence caps under sparse data, borrow quantile strength from related leagues/seasons to right-size uncertainty per buck
- `2309.06248` (score 11) Rethinking Evaluation Metric for Probability Estimation Models Using E — Adopt the Balance score alongside Brier/ECE as an additional, less binning-biased calibration-gate criterion, potentially giving a more honest read on whether GSE's model has actually reached 3 consec
- `1706.02447` (score 12) Luck is Hard to Beat: The Difficulty of Sports Prediction — Use this paper's luck/skill decomposition framework to set sport-specific, honest 'ceiling' expectations for GSE's MAE targets, reframing the backtest-vs-naive-baseline problem as partly a fundamental

## Full Medium assigned to this category (65)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `0705.3257` | 13 | Evaluating Throwing Ability in Baseball | Directly port this hierarchical-shrinkage Bayesian approach as the statistical basis for GSE's 'bootstrap mode,' replacing an ad hoc confidence cap with a princ |
| `1602.08754` | 13 | Adjusting for Scorekeeper Bias in NBA Box Scores | Build an automated 'source bias' detector across GSE's multi-source scraped data (comparing the same event as reported by different providers) to flag and corre |
| `2012.10006` | 13 | Relationship between brain injury criteria and brain strain  | Use their cross-domain generalization-error methodology as a template for quantifying how much GSE's calibration degrades when a model trained on NFL data is ap |
| `2306.09983` | 13 | Evaluating Superhuman Models with Consistency Checks | Build automated consistency-check unit tests into the prediction-engine CI (e.g., symmetric matchups get symmetric probabilities) as an early-warning signal for |
| `2403.20214` | 13 | Hypergraph adjusted plus-minus | Use hypergraph APM as a structured feature layer inside the Intelligence Graph, letting lineup-combination value propagate into pick confidence scores automatic |
| `2606.27957` | 13 | From Streaks to Synergies: A Multi-Scale Analysis of Perform | Mine the paper's network-science 'synergy' metrics as new interaction-based features (beyond individual player stats) to help close GSE's basketback forecasting |
| `2306.05285` | 12 | Unsupervised Statistical Feature-Guided Diffusion Model for  | Generate synthetic per-sport outcome time series (conditioned on target Brier/ECE statistics) to pressure-test the calibration gate pipeline before enough real  |
| `2311.06268` | 12 | The Paradox of Talent: how Chance affects Success in Tennis  | Use the talent-weighting parameter as a sport-specific 'predictability ceiling' diagnostic, helping GSE set realistic Brier-score/ECE targets and communicate ho |
| `2409.10176` | 12 | TCDformer-based Momentum Transfer Model for Long-term Sports | Adopt the trend/seasonal decomposition framing to separate 'team-level long-run ability drift' from 'game-to-game noise' in GSE's forecasting engine, potentiall |
| `2006.03348` | 11 | Same-Score Streaks: A Case Study in Probability Modeling | Use their same-score-streak validation methodology as an additional out-of-sample calibration sanity check — if GSE's fitted scoring distribution can't reproduc |
| `2309.06248` | 11 | Rethinking Evaluation Metric for Probability Estimation Mode | Adopt the Balance score alongside Brier/ECE as an additional, less binning-biased calibration-gate criterion, potentially giving a more honest read on whether G |
| `2401.15161` | 11 | Individual and team performance in cricket | Use the streak-significance test as a diagnostic tool to check whether GSE's settled-picks data shows genuine momentum effects the model should capture versus n |
| `2411.02954` | 11 | IMUDiffusion: A Diffusion Model for Multivariate Time Series | Adapt diffusion-based time-series synthesis to generate plausible synthetic game/event sequences for thin-data sports/leagues, expanding calibration-window samp |
| `2411.15075` | 11 | The Effects of Major League Baseball's Ban on Infield Shifts | Apply synthetic-control methods to detect and quantify the impact of any rule or roster changes mid-season on GSE's model inputs, auto-flagging when a feature's |
| `2608.01882` | 11 | Gap distributions between successive personal bests in crick | Adapt the bootstrap-shuffle test as a diagnostic tool to check whether GSE's own historical pick/performance data shows genuine skill signal versus record-stati |
| `1912.05129` | 10 | Measuring Spatial Allocative Efficiency in Basketball | Repurpose the allocative-efficiency framework as a content-generation hook: auto-flag 'inefficient shot allocation' storylines for the automated media/content p |
| `2011.02122` | 10 | Analysing Long Short Term Memory Models for Cricket Match Ou | Use an LSTM win-probability head as a real-time recalibration signal, dynamically adjusting 'bootstrap mode' confidence caps as more in-game data accrues. |
| `2109.08051` | 10 | Frame by frame completion probability of an NFL pass | Adapt the two-stage conditional random-forest design as a live in-play recalibration signal, feeding real-time completion-probability shifts into GSE's confiden |
| `2206.12716` | 10 | Missing data patterns in runners' careers: do they matter? | Fold 'missingness as signal' into bootstrap mode so sparse-data confidence caps become data-driven per missingness-pattern rather than a flat heuristic cap. |
| `2211.15622` | 10 | ROC Analysis for Paired Comparison Data | Add this paired-comparison ROC/AUC metric as a discrimination-focused companion diagnostic alongside Brier score and ECE in GSE's calibration dashboard. |
| `2303.06021` | 10 | Machine learning for sports betting: should model selection  | Cite this paper directly in GSE's internal case for delaying launch until calibration gates pass, and replicate its calibration-based model-selection protocol a |
| `2405.02715` | 10 | Grouping predictors via network-wide metrics | Use the network-grouping method to prune GSE's large multi-source feature set per sport into interpretable predictor groups, directly supporting the 'math you c |
| `2409.04889` | 10 | Moving from Machine Learning to Statistics: the case of Expe | Apply the catalytic-prior technique directly to GSE's core prediction model as a regularization method that could shrink the MAE gap against the naive baseline  |
| `2602.15673` | 10 | Leicester's Tale: Another Perspective on the EPL 2015/16 Thr | Use season-long xG-style simulation to pressure-test GSE's calibration gate against historically extreme outcomes rather than only average-case settled picks. |
| `1705.04353` | 9 | On the records | Use the 'burstiness' metric from this paper to flag when a team/player's recent performance surge is statistically consistent with a genuine step-change versus  |
| `1901.04695` | 9 | Statistical models for short and long term forecasts of snow | Apply the zero-inflated regression approach to low-scoring sports outcomes (e.g., MLS shutouts, MLB scoreless innings) where standard distributions currently co |
| `2101.08175` | 9 | Bayesian GARCH Modeling of Functional Sports Data | Adopt the GARCH-style heteroskedastic-error component as the mechanism behind bootstrap-mode's confidence caps, formally tying uncertainty width to detected vol |
| `2210.02383` | 9 | Filling the Gaps: A Multiple Imputation Approach to Estimati | Apply the dropout-aware imputation method to fill gaps in scraped Pro-Football-Reference histories before feeding them into the prediction engine, reducing boot |
| `math/0509698` | 9 | A Derivation of the Pythagorean Won-Loss Formula in Baseball | Use the Weibull-based derivation to build confidence intervals around Pythagorean-formula predictions per team, feeding uncertainty estimates into bootstrap-mod |
| `1102.5549` | 8 | Instant Replay: Investigating statistical Analysis in Sports | Use the neuro-dynamic-programming (approximate dynamic programming) angle as inspiration for modeling sequential in-game decisions (e.g. optimal live-bet timing |
| `1608.03793` | 8 | Applying Deep Learning to Basketball Trajectories | Apply the 'let the sequence model learn dynamics directly from raw data' philosophy to GSE's core forecasting model, replacing some hand-engineered features wit |
| `1802.00998` | 8 | nflWAR: A Reproducible Method for Offensive Player Evaluatio | Fork nflscrapR's public play-by-play pipeline as a second, independent NFL data source to cross-validate GSE's own scraped feeds and catch pipeline drift or mis |
| `1807.09236` | 8 | Improving pairwise comparison models using Empirical Bayes s | Replace GSE's hard bootstrap-mode cap with a per-sport Empirical Bayes shrinkage layer that smoothly degrades confidence as sample size shrinks, rather than a b |
| `1810.12850` | 8 | Computational Intelligence in Sports: A Systematic Literatur | Feed this review's identified 'research opportunities' list directly to GSE's internal research agents (Jarvis/Hermes/Fable) as seed prompts for systematically  |
| `1910.12337` | 8 | Expected Hypothetical Completion Probability | Adapt the imputation-and-average approach to generate 'what if the pick had been different' explainer content for the brand's transparent, math-you-can-read pos |
| `2010.15891` | 8 | Multi-agent Trajectory Prediction with Fuzzy Query Attention | Use the fuzzy-attention interaction model to generate an 'interaction risk' feature capturing how entangled two teams' player movements are, feeding into bootst |
| `2508.09810` | 8 | Feature Impact Analysis on Top Long-Jump Performances with Q | Use quantile random forests to model tail outcomes (blowouts/upsets) rather than mean outcomes, since GSE's baseline-beating problem may stem from mean-focused  |
| `2510.18193` | 8 | FST.ai 2.0: An Explainable AI Ecosystem for Fair, Fast, and  | Study the credal-set epistemic uncertainty approach as an alternative to GSE's bootstrap-mode confidence capping, giving bounded probability intervals instead o |
| `2512.19740` | 8 | Asia Cup 2025: A Structured T20 Match-Level Dataset and Expl | Use this open dataset as an external validation/calibration benchmark to sanity-check GSE's own cricket data-ingestion accuracy before productionizing a new spo |
| `1108.0779` | 7 | Basketball scoring in NBA games: an example of complexity | Encode identified tipping-point thresholds as explicit regime-switch features in GSE's live model, letting probability updates react non-linearly near known pha |
| `1906.01760` | 7 | Going Deep: Models for Continuous-Time Within-Play Valuation | Use the conditional density estimation output (not just point predictions) as the native uncertainty source for GSE's confidence scores, replacing the blunt boo |
| `1906.11373` | 7 | Unsupervised Methods for Identifying Pass Coverage Among Def | Use GMM soft cluster assignments as probabilistic (not hard) tactical features feeding the prediction engine, giving a built-in uncertainty signal consistent wi |
| `1907.05326` | 7 | The acute:chronic workload ratio: challenges and prospects f | Apply this critique's lessons to sanity-check GSE's own calibration-gate metrics (Brier/ECE thresholds) for similar discretization and small-sample bias risks b |
| `1910.08670` | 7 | Context-Driven Data Mining through Bias Removal and Data Inc | Adopt C-DSL as an internal checklist/gate the Jarvis/Hermes/Fable agents run automatically before any new scraped data source is admitted into the prediction pi |
| `2206.11578` | 7 | Doubly-online changepoint detection for monitoring health st | Wire this doubly-online changepoint detector into the data-ingestion job queue to auto-flag when a team's scoring distribution shifts, triggering a model re-cal |
| `2404.00213` | 7 | Injecting New Knowledge into Large Language Models via Super | Apply fact-based SFT scaling to keep GSE's internal research agents current on roster changes/injuries without full retraining, feeding cleaner context into the |
| `2412.08303` | 7 | Spatial similarity index for scouting in football | Extend the spatial similarity index into a 'comparable pick' feature for GSE users — surfacing historically similar game situations/lineups to contextualize a g |
| `2501.05168` | 7 | KabaddiPy: A package to enable access to Professional Kabadd | Use this as a template for rapidly bootstrapping GSE's data pipeline into new emerging leagues (e.g., international kabaddi, MLS expansion) with minimal enginee |
| `2603.26575` | 7 | The Climber's Grip -- Personalized Deep Learning Models for  | Borrow the personalized random-effects architecture as a template for per-athlete (not just per-sport) confidence adjustments within bootstrap mode. |
| `2006.14930` | 6 | A metabolomic measure of energy metabolism moderates how an  | Not a strong fit for GSE's current roadmap — at most, distant inspiration for a future 'injury-risk-adjusted' player-availability feature grounded in biomarker  |
| `2112.14846` | 6 | An Analysis of an Alternative Pythagorean Expected Win Perce | Adopt the simulation-based, AIC-driven model-comparison methodology as GSE's standard protocol for validating candidate win-probability functional forms before  |
| `2210.09295` | 6 | Virtual-Reality based Vestibular Ocular Motor Screening for  | A distant future feature: automated concussion-risk flags feeding into a player-availability signal for the Intelligence Graph. |
| `2304.04220` | 6 | Towards Active Learning for Action Spotting in Association F | Apply uncertainty sampling to prioritize which settled picks/edge cases most need human review before being trusted for the calibration gate, cutting QA effort. |
| `2305.14612` | 6 | Assessment of Anterior Cruciate Ligament Injury Risk Based o | Injury-risk scores like this could become a future input feature (player injury probability) enriching GSE's data pipeline for availability-sensitive prediction |
| `2308.01028` | 6 | Maximizing Success Rate of Payment Routing using Non-station | Apply non-stationary bandits to dynamically allocate GSE's data-ingestion or job-queue (BullMQ) resources across competing data sources/sports based on recently |
| `2309.07361` | 6 | Judging a video by its bitstream cover | Could inspire a lightweight pre-filter to auto-tag scraped video assets by sport category before routing them into GSE's content pipeline, without expensive dec |
| `2402.09459` | 6 | Custom IMU-Based Wearable System for Robust 2.4 GHz Wireless | Not a strong fit for GSE's current roadmap; at most informs future partnership discussions if GSE ever ingests wearable telemetry as a novel data source. |
| `2403.12385` | 6 | Benchmarking Badminton Action Recognition with a New Fine-Gr | Could inform a future action-tagging pipeline if GSE ever expands into granular in-play event detection for content generation. |
| `2404.09807` | 6 | A Universal Protocol to Benchmark Camera Calibration for Spo | The paper's core lesson — that a benchmark's chosen metric can systematically bias which methods look good — is a useful cautionary parallel for GSE to scrutini |
| `2406.16987` | 6 | AI for Equitable Tennis Training: Leveraging AI for Accurate | No strong application; at most a distant example of low-cost wearable-sensor classification relevant only to a hypothetical future consumer coaching product. |
| `2407.11972` | 6 | An efficient machine learning approach for extracting eSport | Adopt the consensus nested cross-validation procedure as GSE's standard feature-selection/model-validation protocol to reduce overfitting risk before it reaches |
| `2410.11375` | 6 | Statistical Analysis of the Impact of FIA Regulations on Saf | Build an automated 'regulation change detector' into GSE's data pipeline that flags rule changes (e.g., new DRS zones, roster rules) and triggers targeted recal |
| `2604.13861` | 6 | Simulation-Based Optimisation of Batting Order and Bowling P | Adopt James-Stein shrinkage explicitly as the mechanism behind bootstrap mode, blending sparse-sample team/player estimates toward league averages in a principl |
| `2607.16597` | 6 | FST.ai 2.5: Explainable and Uncertainty-Aware AI for Olympic | Study FST.ai's governance/transparency model as a template for how GSE could publicly document its calibration methodology to satisfy the trust/compliance toolk |
| `2609.04754` | 6 | A Fairness Audit of the Duckworth-Lewis-Stern Method: Format | Mirror DLS-Cal's lightweight state-conditioned calibration-layer design as a concrete, auditable fix for GSE's failing Brier/ECE gate — a small correction netwo |
