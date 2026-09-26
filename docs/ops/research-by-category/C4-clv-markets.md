# C4-clv-markets: CLV & market benchmarks

## Mission (code this)

Lock-time vs close CLV protocol; beat the line, not internal consistency alone.

## Code focus

- `line-archive`
- `money observability`
- `performance CLV diagnostics`

## Done when

CLV↔Brier diagnostic when archive exists; lock≠open doctrine in docs; no ROI claims in public copy.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `1710.02824` — Beating the bookies with their own numbers — and how the online sports — **[C4][C6]**. CLV protocol paper. GSE’s public standard is *closing-line value*, not “we found +EV at open.” Also: pick lifecycle should timestamp the line at **lock** and compare  **NEXTWAVE-YES**
- `2008.01485` — Wisdom of crowds: much ado about nothing — **[C2][C4]**. Do **not** ensemble GSE with scraped public-consensus picks and expect MAE to fall. The market close is the crowd that matters. Adding Twitter/Reddit consensus as a f
- `1701.05976` — How often does the best team win? A unified approach to understanding  — **[C1][C2][C3][C4][C5]**. This is the most important paper in the set for GSE’s *architecture*. 1. It justifies **independent per-sport models** with different \(\sigma_{\mathrm{ga

## Medium priority (implement from these first)

- `2105.08310` (score 13) BBE: Simulating the Microstructural Dynamics of an In-Play Betting Exc — Run GSE's calibration pipeline against BBE-simulated markets to pre-validate whether a proposed per-sport model or ensemble change would pass the three-consecutive-green-window gate before touching re
- `2108.02419` (score 13) Implementing the BBE Agent-Based Model of a Sports-Betting Exchange — Run GSE's prediction engine against synthetic BBE market data to stress-test calibration and CLV performance in scenarios (e.g., new sports) where real settled-pick history is still too thin.
- `2008.04216` (score 12) Using Experts' Opinions in Machine Learning Tasks — Formally incorporate The Odds API's market-implied probabilities as an explicit ensemble member (not just a benchmark for CLV), directly targeting the calibration gate via odds-anchored blending.
- `1211.6496` (score 13) TwitterPaul: Extracting and Aggregating Twitter Predictions — Build a 'crowd wisdom' auxiliary signal from social media predictions as one member of GSE's multiplicative-weight ensemble (CEPT), weighted dynamically based on historical forecaster accuracy.

## Full Medium assigned to this category (39)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `1209.4724` | 13 | Randomness in Competitions | Use the tournament-vs-league fairness/efficiency tradeoff model to explain to users why playoff-bracket picks are inherently noisier than regular-season picks,  |
| `2002.01328` | 13 | TRAP: A Predictive Framework for Trail Running Assessment of | Adapt the checkpoint prediction-interval technique as a template for live in-game 'time-to-event' markets (e.g., time to next score) with honest uncertainty ban |
| `2203.09128` | 13 | Time Dependency, Data Flow, and Competitive Advantage | Quantify GSE's own per-sport data-decay rates to decide how aggressively to weight recent vs. historical data in each sport's probability model, potentially exp |
| `2304.09918` | 13 | Smart Sports Predictions via Hybrid Simulation: NBA Case Stu | Run GSE's own ablation on training-window length per sport to find an analogous optimal history length, potentially closing part of the MAE gap versus the naive |
| `2401.06336` | 11 | TRACE: A Time-Relational Approximate Cubing Engine for Fast  | Use TRACE-style approximate cubing to power a real-time internal dashboard tracking Brier score and ECE trends per sport/time-window, directly supporting the '3 |
| `1803.02940` | 10 | The Advantage of Doubling: Deep RL for the Double Team in th | Apply the same policy-value validation methodology (checking that learned values predict points-per-possession) as a template for validating GSE's own pick conf |
| `2011.00432` | 10 | Gamblers Learn from Experience | Use the Bayesian-updating behavioral model to design GSE's user-facing calibration disclosures, framing pick performance feedback in the same terms bettors intu |
| `2212.10904` | 10 | A Bayesian Mixture Model Approach to Expected Possession Val | Reuse this Bayesian mixture-and-interpolation pattern as the template for GSE's per-sport probability models in niche or newly added sports/markets with limited |
| `2302.11172` | 10 | Impact of a Batter in ODI Cricket Implementing Regression Mo | Mine scraped play-by-play/commentary text for situational context variables (pressure, crowd, weather) as new engineered features for the core forecasting model |
| `2306.01740` | 10 | Not feeling the buzz: Correction study of mispricing and ine | Adopt this paper's 'single outlier bet' audit as a pre-launch checklist item -- stress-test GSE's backtest for a few dominating outlier picks before trusting ag |
| `2508.17157` | 10 | SPORTSQL: An Interactive System for Real-Time Sports Reasoni | Build a 'talk to your picks' internal tool for Jarvis/Hermes agents using this NL-to-SQL approach so non-technical staff can query calibration metrics (Brier/EC |
| `1710.06551` | 9 | Exploiting oddsmaker bias to improve the prediction of NFL o | Build a dedicated 'oddsmaker bias' sub-model that runs alongside GSE's primary prediction engine specifically to generate CLV-beating signal, decoupled from the |
| `1906.03939` | 9 | Time to Die: Death Prediction in Dota 2 using Deep Learning | Adapt the rare-event prediction architecture for live 'next scoring play' or 'upset alert' micro-predictions, a differentiated live-odds feature built on GSE's  |
| `2011.01698` | 9 | A new robust class of skew elliptical distributions | Fit skew-elliptical distributions to per-sport scoring margins instead of assuming symmetric normal errors, potentially closing part of the calibration gap by b |
| `2508.19542` | 9 | CVBench: Benchmarking Cross-Video Synergies for Complex Mult | Use CVBench's methodology as a template for internally benchmarking GSE's own agents (Jarvis/Hermes/Fable) on cross-source reasoning tasks like reconciling conf |
| `1106.4300` | 8 | Human as Real-Time Sensors of Social and Physical Events: A  | Use Twitter-based event detection as a redundant, near-real-time cross-check against GSE's official live-odds feed, flagging discrepancies that might indicate f |
| `2010.12508` | 8 | Beating the market with a bad predictive model | Add a decorrelation-objective term to the model training loss specifically for markets where GSE beats naive MAE the least, potentially yielding positive CLV ev |
| `2105.01446` | 8 | Home advantage and crowd attendance: Evidence from rugby dur | Add a dynamic 'crowd/attendance effect' feature (updated in real time from attendance/venue data) to GSE's models, particularly useful during anomalous conditio |
| `2210.06327` | 8 | Betting the system: Using lineups to predict football scores | Replicate this paper's lineup-level feature-importance analysis (goalkeeper over attacker stats) to check whether GSE's own model under-weights defensive featur |
| `2603.22596` | 8 | ParlayMarket: Automated Market Making for Parlay-style Joint | Adapt the pairwise belief-state mechanism to jointly calibrate correlated same-game props instead of scoring each pick independently. |
| `2006.05908` | 7 | Embed2Detect: Temporally Clustered Embedded Words for Event  | Deploy Embed2Detect-style event detection on team beat-writer/Twitter feeds as an early-warning trigger to auto-flag picks needing re-grading or confidence down |
| `2104.04601` | 7 | The Effect of Sport in Online Dating: Evidence from Causal M | The only transferable thread is the causal-ML methodology itself (double ML for treatment-effect estimation), potentially reusable for isolating true causal dri |
| `2306.14462` | 7 | Multi-task Item-attribute Graph Pre-training for Strict Cold | Apply the same attribute-graph pre-training trick to seed priors for a new sport/market's probability model before any picks have settled. |
| `2405.19125` | 7 | Early Detection of Critical Urban Events using Mobile Phone  | Adapt the real-time multivariate anomaly framework to monitor GSE's BullMQ data-ingestion streams for sudden odds/line anomalies indicating feed corruption or a |
| `2406.12762` | 7 | Unsupervised explainable activity prediction in competitive  | Apply online unsupervised clustering to propagate GSE's limited settled-pick grades across similar ungraded situations, effectively expanding the calibration tr |
| `2408.02250` | 7 | Hierarchical Clustering using Reversible Binary Cellular Aut | Use as an alternative clustering backend for automatically grouping similar prop-bet markets or player archetypes when building per-sport sub-models, as a light |
| `2409.01493` | 7 | Shrouded Sin Taxes | Factor tax-shrouding effects into GSE's closing-line-value benchmark methodology, since jurisdictions with shrouded betting taxes may show systematically distor |
| `cond-mat/0010050` | 7 | Large Stock Market Price Drawdowns Are Outliers | Apply the outlier-drawdown detection methodology to live odds/line-movement data to auto-flag anomalous market moves (e.g. sharp money, breaking news) as a dist |
| `1609.04106` | 6 | The Inverse Gamma Distribution and Benford's Law | Add a Benford's-Law leading-digit check as a lightweight automated anomaly detector on incoming odds/line-movement data to flag potential match-fixing or data-c |
| `1912.08394` | 6 | Feature engineering workflow for activity recognition from s | Apply the FRESH automated-feature-extraction workflow to live odds and play-by-play time series to mine new candidate signals for the failing prediction model w |
| `2209.00202` | 6 | The Quest for Omnioculars: Embedded Visualization for Augmen | Build a live embeddable widget showing real-time closing-line-value and calibration context per pick, styled after Omnioculars' context-triggered visualization  |
| `2209.09861` | 6 | ESTA: An Esports Trajectory and Action Dataset | Model GSE's own ingestion pipeline on awpy's log-parsing discipline to produce clean trajectory-like event features from odds/play-by-play feeds, improving MAE  |
| `2212.08116` | 6 | Converting College Football Point Spread Differentials to Pr | Directly adapt this spread-to-probability reweighting technique as a sanity-check calibrator baseline for GSE's own model outputs against market-implied probabi |
| `2301.10052` | 6 | Event Detection in Football using Graph Convolutional Networ | Adapt the graph-based event-detection formulation to detect 'market-moving events' from streaming odds/line-movement graphs rather than player positions. |
| `2302.00911` | 6 | Conditional expectation with regularization for missing data | Use DIMV's confidence-region output as a signal for bootstrap mode -- treat imputed features with wide confidence regions as evidence of sparse data, automatica |
| `2403.16282` | 6 | The Evolution of Football Betting- A Machine Learning Approa | Use the paper's feature-importance analysis as a checklist to audit which predictive features GSE may be missing in its currently underperforming prediction mod |
| `2412.21181` | 6 | Causal Hangover Effects | Mine similar 'off-court' causal signals (travel, back-to-backs, rivalry games) using the same spread-based causal identification trick to generate new predictiv |
| `2505.06828` | 6 | An Improved Algorithm for a Bipartite Traveling Tournament i | No strong direct application, but the scheduling-optimization angle could inform a future B2B feature offering optimized fantasy-league or betting-market schedu |
| `2604.17194` | 6 | Forecast Sports Outcomes under Efficient Market Hypothesis:  | Replace or augment GSE's current odds-to-probability conversion with OO-EPC/FL-GLM to get a more accurate, bias-corrected baseline for measuring closing-line va |
