# GSE 2026 Prediction Analytics & Vegas Research

**Galaxy Sports Edge — Internal Research Document**
**Date:** 2026-06-22
**Status:** Working draft — research synthesis from public literature; source gaps noted

---

## 1. SPORTSBOOK MECHANICS (What GSE Must Understand, Not Replicate)

### 1.1 How Lines Are Set

**Market-Making Openers:** Before a game is posted, a small team of oddsmakers at a sharp book (historically Pinnacle, Circa, Bookmaker.eu) sets the opening line. These openers are set at lower limits (e.g., $500 max bet) specifically to absorb information from sharp bettors. The first action on any line is the most informative — sharp bettors who disagree with the opening line bet immediately, moving it toward the true market price.

**Model-Based Openers:** Modern books use internal models to generate opening lines. These models incorporate team strength ratings, rest/travel factors, weather, and recent performance trends. The model line is the book's prior; the market corrects it through action.

**Power Ratings:** Every serious book maintains power ratings — numerical measures of team strength. The spread is derived from the difference in power ratings plus home field adjustment (historically ~2.5–3 points in the NFL). These ratings are updated after every game.

**Key insight for GSE:** The opening line is the book's model output. The closing line is the market's efficient consensus. The gap between where a pick was recommended and where the line closed is the most meaningful measure of edge.

### 1.2 Vig / Hold: Why Books Profit Without Perfect Prediction

**The vig (vigorish or juice):** On a standard spread bet, both sides are priced at -110 (bet $110 to win $100). This means the book keeps approximately 4.5% of total action regardless of the outcome — this is the "hold percentage."

**Hold calculation:** On $220 total action (two bettors at -110 each), the book pays out $210 to the winner. The $10 kept is 4.5% of total handle.

**Implication:** A sportsbook does not need to predict outcomes. It needs balanced action. A book that takes equal action on both sides of every game profits automatically from the vig. In practice, action is rarely perfectly balanced, so books do take on risk — but vig provides a significant buffer.

**For GSE:** The vig means a bettor needs to win approximately 52.4% of spread bets at standard juice to break even. This 52.4% threshold is the fundamental benchmark. Any prediction system that wants to claim betting value must demonstrate it wins at more than 52.4% at the recommended line.

### 1.3 Implied Probability from Moneylines and Spreads

**Moneyline to implied probability:**
- American odds of -110: implied probability = 110 / (110 + 100) = 52.38%
- American odds of +130: implied probability = 100 / (100 + 130) = 43.48%
- American odds of -200: implied probability = 200 / (200 + 100) = 66.67%

Note: The sum of implied probabilities for both sides of a bet always exceeds 100% (the overround or vig). To get "true" implied probabilities, normalize by removing the vig.

**Spread to win probability:** A 0-point spread = approximately 50/50. Each additional point on the spread adjusts the implied probability. The relationship is not linear (key numbers like 3 and 7 in NFL are more common margins of victory), which is why key number pricing matters.

**For GSE:** Every prediction should include the implied probability from the closing line. The recommendation's confidence score should reflect whether GSE's model probability exceeds the implied market probability by a meaningful margin.

### 1.4 Why the Closing Line Is the Most Efficient Price

The closing line (the spread or moneyline at game time) incorporates more information than any other price point:
- All sharp action since opening
- Injury news, lineup changes, weather updates
- Public money flow
- Books' own model updates

Academic research consistently finds that the closing line is a better predictor of actual game outcomes than the opening line. The closing line is the "wisdom of the crowd" price — it reflects the aggregate judgment of the sharpest bettors in the world.

**For GSE:** Recommendations issued early in the week that "beat the closing line" (i.e., the recommended side closed as the favorite or the spread moved in favor of the recommended side) are the highest-quality predictions. Closing Line Value (CLV) is the gold standard for measuring prediction quality.

### 1.5 Closing Line Value (CLV): What It Means and How Sharp Bettors Measure Edge

**Definition:** CLV is the value of a bet relative to where the line closed at game time. If GSE recommends the Eagles -3 and the Eagles close at -5, GSE captured 2 points of CLV. If the Eagles close at -1, GSE had negative CLV (-2 points).

**Why CLV matters:** Over a large sample, bettors who consistently beat the closing line are demonstrating genuine edge. Since the closing line is the most efficient price, beating it means the recommendation anticipated market movement — which is the definition of having better information than the market.

**CLV is not the same as winning:** A bet can have positive CLV and still lose (because sports are unpredictable). Over large samples, positive CLV converges toward positive expected value. Short samples are dominated by variance.

**Sharp bettors track CLV obsessively:** Services like Bettor BI and professional syndicates report CLV as their primary performance metric, separate from win/loss record.

**For GSE:** The calibration dashboard should track CLV as a first-class metric alongside win rate and calibration score. A recommendation history with positive average CLV is strong evidence of model quality. Negative CLV (consistently recommending the side that closes as worse) is evidence against model quality.

### 1.6 Line Movement: Sharp Action vs. Public Money Patterns

**Sharp action (steam):** When professional betting syndicates hit a number hard, books move the line quickly and significantly. Sharp money is typically: early in the week (before the public engages), on less-popular markets (where books have less confidence), and in amounts that force book adjustment even against the public's direction.

**Public money:** Casual bettors favor: home teams, favorites, overs, primetime games, well-known players. Public money tends to come later in the week, in smaller amounts, and moves lines at retail books more than at sharp books.

**Reverse Line Movement (RLM):** The line moves opposite to where the majority of tickets are. If 70% of tickets are on the Cowboys but the line moves to favor the Cowboys' opponent, that's RLM — indicating sharp money is on the other side in large amounts.

**For GSE:** Line movement signals are data inputs, not standalone signals. A line that moves sharply is evidence that someone with better information has engaged. This should be one factor in the Signal Courtroom evidence set, not a mechanical bet trigger.

### 1.7 Stale Lines: When Books Haven't Repriced for News

During the week, injury news, weather forecasts, lineup changes, and other information can make the current line stale — no longer reflecting the true market price. Books are fastest to reprice at liquid markets; slower at less-liquid markets (mid-week, early lines).

**For GSE:** Stale lines are where legitimate edge can exist. If a key player is ruled out and the line hasn't moved, the pick that accounts for that absence is potentially better priced than the market. GSE's real-time data ingestion and injury monitoring is specifically designed to identify stale line opportunities before they close.

### 1.8 Prop Pricing: How Player Props Relate to Team Totals and Game Script

**Game script correlation:** Player props are deeply correlated with team totals and game flow expectations. A QB whose team is projected as a heavy underdog is likely to throw more (chasing the game) but may also face more pressure, reducing efficiency. RB volume decreases in passing situations. These correlations are systematic and can be modeled.

**Prop market inefficiency:** Player prop markets are less liquid than game markets. Sharp books often keep prop limits lower and are slower to reprice props for news. This means prop markets can be more inefficient than game markets — higher potential CLV for a sharp predictor.

**For GSE:** Prop recommendations should explicitly model game script. A QB prop pick should note the team total, the implied possession time, and any injury factors that affect pass rate. The factor trail for props must be richer than for game picks.

---

## 2. GSE SIGNAL TYPES FROM MARKET DATA

For each signal, the definition and its specific implication for GSE recommendations.

### 2.1 Opening vs. Closing Line Movement

**Signal:** The spread or total moves significantly between open and close.

**Direction matters:**
- Line moves toward the recommended side = positive confirmation (the market agrees with GSE)
- Line moves against the recommended side = counter-signal (the market disagrees; investigate before issuing)

**GSE implication:** If GSE issues a recommendation at the open and the line moves 2+ points in the recommended direction by game time, that is CLV confirmation. If the line moves against, the recommendation should be flagged for review — the Signal Courtroom should reconsider the counter-evidence.

### 2.2 Public Money % vs. Ticket Count %

**Signal:** Disaggregating the number of bets (tickets) from the total dollar amount wagered (money %) reveals sharp vs. public split.

- High ticket % but low money % on one side = public side (many small bets)
- Low ticket % but high money % on one side = sharp side (fewer but larger bets)

**GSE implication:** This signal should inform confidence calibration. A pick where the public is heavily on one side but money is flowing the other way suggests smart money disagrees with the popular take — which can support or undermine GSE's recommendation.

### 2.3 Sharp Action (Larger Bets Moving Line Against Public)

**Signal:** The line moves in a direction where the majority of tickets are on the other side — confirming sharp, high-dollar action.

**GSE implication:** Sharp action in the same direction as a GSE recommendation is strong confirmatory evidence. Sharp action against a GSE recommendation should trigger Signal Courtroom review and potentially suppress or downgrade the confidence score.

### 2.4 Reverse Line Movement (RLM)

**Signal:** Public is heavily on Team A, but the line moves to make Team A less attractive. This is classic RLM — sharps are on Team B in large amounts.

**GSE implication:** RLM is one of the cleaner "smart money vs. public" signals. When RLM aligns with GSE's model output, confidence increases. When RLM contradicts GSE's model, it must be explicitly noted in the factor trail as counter-evidence.

### 2.5 Steam Moves (Rapid Sharp Movement)

**Signal:** A line moves rapidly (within minutes) at multiple books simultaneously. This indicates a coordinated professional move — a syndicate hitting the number across books at once.

**GSE implication:** Steam moves are the fastest-moving signal. They require real-time data ingestion to catch. A steam move in the direction of a pending recommendation is strong confirmation. A steam move against should trigger immediate review.

### 2.6 CLV Tracking for Prediction Calibration

**Signal:** Across all GSE recommendations, what is the average CLV?

**GSE implication:** CLV is tracked in the calibration dashboard as a primary performance metric. A recommendation history with:
- Average CLV > 0: GSE is consistently anticipating market movement (evidence of edge)
- Average CLV ≈ 0: GSE is predicting the same direction as the market closes (no edge, but not anti-predictive)
- Average CLV < 0: GSE is systematically picking the side that the market moves away from (evidence of model flaw)

### 2.7 Odds Dispersion Across Books

**Signal:** Different books offer materially different lines or odds on the same game. The best available line at any given moment (line shopping) varies across the market.

**GSE implication:** GSE recommendations should note the best available line at the time of recommendation. Dispersion in lines across books indicates either: stale pricing at some books (opportunity), or genuine uncertainty in the market (reduce confidence). Line dispersion should be a factor in the Signal Courtroom evidence set.

---

## 3. PREDICTION CALIBRATION SCIENCE

### 3.1 Brier Score

**Definition:** The Brier score measures the mean squared error of probabilistic predictions. For a binary outcome (win/lose), it is calculated as:

`BS = (1/n) × Σ(predicted_probability - actual_outcome)²`

Where `actual_outcome` is 1 (correct) or 0 (incorrect) and `predicted_probability` is the model's output (e.g., 0.65 for 65% confidence).

**Range:** 0 (perfect) to 1 (worst possible). A random predictor scores approximately 0.25 for binary outcomes. A skilled forecaster should score below 0.25.

**Why it matters:** Brier score rewards calibration AND discrimination simultaneously. A model that says "70% confidence" and is right 70% of the time scores better than a model that says "70% confidence" and is right only 55% of the time, even if the win rate is similar.

**GSE Application:** Brier score should be computed for all GSE predictions, by sport and by confidence tier (high/medium/low). Track trend over time — is the model getting better or worse?

### 3.2 Log Loss (Cross-Entropy Loss)

**Definition:** Log loss penalizes confident predictions more severely when they are wrong:

`LogLoss = -(1/n) × Σ[y×log(p) + (1-y)×log(1-p)]`

**Key property:** Log loss punishes overconfident wrong predictions much more than Brier score. A prediction of 95% confidence that loses contributes much more to log loss than a prediction of 55% confidence that loses.

**GSE Application:** Log loss is the calibration metric most sensitive to overconfidence. GSE should track log loss as a separate metric to catch systematic overconfidence in the model.

### 3.3 Calibration Curves

**Definition:** A calibration curve plots predicted probability (x-axis) against actual frequency of correct outcomes (y-axis). A perfectly calibrated model follows the diagonal (y = x).

**Interpretation:**
- Curve above the diagonal: the model is underconfident (predictions of 60% are actually winning 70%)
- Curve below the diagonal: the model is overconfident (predictions of 60% are actually winning only 50%)

**GSE Application:** The public calibration dashboard should display GSE's calibration curve. This is the single most powerful trust-building tool — it shows, empirically, whether the confidence scores mean what they claim.

### 3.4 Overconfidence Bias in Sports Forecasters

Overconfidence is the most common and consistent bias in sports prediction. Forecasters systematically assign higher probabilities to outcomes than their actual frequency warrants.

**Sources of overconfidence in sports:**
- Narrative reasoning: a compelling story about why a team will win leads to high confidence independent of base rates
- Recency bias: recent performance dominates the probability estimate
- Anchoring on market consensus: borrowing the book's implied probability and adjusting insufficiently
- Status quo bias: not updating sufficiently when new information arrives

**GSE Application:** The Signal Courtroom's mandatory counter-thesis requirement is specifically designed to combat overconfidence. Before any pick is issued at >75% confidence, a counter-argument must be explicitly articulated. No pick should be issued at >90% confidence without a human review step.

### 3.5 Ensemble Models: Why Averaging Beats Single Models

**Definition:** An ensemble aggregates predictions from multiple independent models, either by averaging, weighted averaging, or stacking (training a meta-model on the outputs of base models).

**Why it works:** Individual models each have biases and error patterns. When errors are independent (uncorrelated), averaging them reduces variance without increasing bias. The more diverse the models (different features, different architectures, different training periods), the more effective the ensemble.

**Empirical evidence:** In virtually every prediction competition (Kaggle, FiveThirtyEight's tournament challenge, Metaculus forecasting), ensembles outperform individual models at scale.

**GSE Application:** The prediction engine should aggregate signals from multiple independent models: statistical model, market-based model (CLV/line movement), situational model (rest, travel, weather). The Signal Courtroom can be thought of as a structured ensemble of evidence types, with the final recommendation reflecting weighted evidence synthesis.

### 3.6 Uncertainty Intervals: Why Point Predictions Are Inferior

**The problem with point predictions:** A prediction of "Player X scores 25 points" contains no uncertainty information. The player could score 10 or 40, and both outcomes are consistent with the prediction if variance is high.

**Interval predictions:** "Player X projects 25 ± 8 points (one standard deviation)" communicates the genuine uncertainty. Users can then decide: if I need 30+ to win my contest, how likely is that? (Knowable from the distribution; not knowable from the point estimate.)

**Floor and ceiling:** In fantasy sports, floor (low-end outcome) and ceiling (high-end outcome) are practically more useful than the mean projection. A player with a floor of 8 and ceiling of 35 is different from a player with a floor of 15 and ceiling of 25, even if the means are similar.

**GSE Application:** Every projection should include a range (floor/ceiling or confidence interval). The displayed projection should be the median or mean, but the range must be accessible. The confidence score must reflect the width of the interval — a narrow, high-confidence interval gets a high score; a wide, uncertain interval gets a low score regardless of the mean.

### 3.7 Conformal Prediction: Coverage Guarantees for Uncertainty Sets

**Definition:** Conformal prediction is a framework that produces prediction sets with guaranteed coverage — i.e., a set of possible outcomes that contains the true outcome with at least (1-α)% probability, without any distributional assumptions.

**Why it matters:** Unlike traditional confidence intervals that assume distributional properties (e.g., normality), conformal prediction works under arbitrary distributions. For sports prediction, where player performance distributions are highly non-normal (heavy tails, bimodal outcomes based on game script), conformal prediction is more appropriate.

**GSE Application:** V2 research item. Implementing conformal prediction for player projection intervals would allow GSE to make statistically rigorous coverage guarantees: "This interval contains the actual outcome 80% of the time" — backed by mathematical proof, not just historical backtest.

### 3.8 How Weather Forecasters Do Calibration Better Than Sports Media

Weather forecasting is the best-calibrated public prediction system in existence. Key practices that sports media ignores:

1. **Probabilistic language:** "70% chance of rain" — not "it will rain." Sports media says "I like the Cowboys" — not "the Cowboys have a 62% win probability."
2. **Public calibration records:** The National Weather Service publishes long-term calibration records. When they say "40% chance of rain," it rains approximately 40% of the time. Sports media never publishes this accountability.
3. **Ensemble averaging:** The NWS uses multiple independent models and averages them. Fantasy analysts rarely aggregate their own past predictions systematically.
4. **Uncertainty cones:** Especially for hurricanes, weather forecasters communicate uncertainty visually and explicitly. Sports media almost never shows uncertainty.
5. **Error analysis:** The NWS studies systematic errors in its models and corrects them. Sports media rarely performs systematic autopsy.

**GSE Application:** GSE explicitly adopts the weather forecasting posture. The calibration dashboard is the public accountability record. Probabilistic language is required. The uncertainty cone (floor/ceiling) is displayed. Autopsy is automated via the GM Ledger.

---

## 4. STATISTICAL METHODS FOR SPORTS PREDICTION

### 4.1 Linear Regression (Baseline)

**What it is:** Models the relationship between input features (rushing yards, pass attempts, etc.) and an outcome (fantasy points, game score) as a linear combination of features.

**Sports application:** Fantasy point projections that use a weighted combination of snap count, target share, air yards, and red zone share. Simple and interpretable.

**Limitations:** Cannot capture non-linear interactions (e.g., the effect of an injury depends on team depth). Cannot handle categorical features cleanly. Performance degrades when features are highly correlated.

**GSE use:** Baseline projection model. Any more complex model should be benchmarked against a linear regression baseline. If the complex model doesn't outperform linear regression significantly, it's not worth the complexity.

### 4.2 Gradient Boosting (XGBoost / LightGBM) — Industry Workhorse

**What it is:** An ensemble of decision trees built sequentially, where each tree corrects the errors of the previous one. XGBoost and LightGBM are the dominant implementations.

**Sports application:** The workhorse of DFS lineup optimization, projection models, and injury prediction. Can handle mixed feature types, non-linear interactions, and missing data. Typically outperforms linear models for tabular sports data.

**Key parameters to tune:** Number of trees, tree depth, learning rate, regularization. Requires careful cross-validation to avoid overfitting.

**GSE use:** Primary production prediction model. Used for point projections, win probability, and injury risk scoring. Regularly retrained on new data.

### 4.3 Neural Networks / Deep Learning for Sports

**What it is:** Multi-layer neural architectures that can learn arbitrary function approximations from data.

**Sports application:** Player trajectory modeling (sequence data using LSTM or Transformer), player embedding representations for similarity search, injury pattern recognition from play-by-play data. Best suited to problems with very large datasets and complex non-linear patterns.

**Limitations:** Requires large data volumes to outperform gradient boosting on tabular data. "Black box" — less interpretable than tree-based methods. Computationally expensive to train.

**GSE use:** V2 research. Player similarity search (Manager Genome's "this player is similar to X" feature). Long-horizon trajectory modeling (dynasty player aging curves). Not the primary production model in V1.

### 4.4 Bayesian Hierarchical Models (Team Strength Estimation)

**What it is:** A probabilistic framework that models uncertainty explicitly and allows partial pooling of information across groups (e.g., estimating team strength while sharing information across all teams in the league).

**Sports application:** Team strength estimation (Elo-like but with full posterior distributions), player performance estimation with small samples (a player with 3 games of data can still get a reasonable estimate by borrowing from similar players), and injury probability modeling.

**Key advantage:** Natural uncertainty quantification. The posterior distribution of a team's "true" strength is a full distribution, not a point estimate.

**GSE use:** Team strength ratings that underlie game predictions. Player injury probability models. The Bayesian framework ensures small-sample estimates are appropriately uncertain rather than overconfident.

### 4.5 Elo / Glicko / TrueSkill (Dynamic Rating Systems)

**Elo:** A simple, elegant system where each game updates both teams' ratings based on the margin of victory/defeat relative to the expected outcome. Originally developed for chess.

**Glicko/Glicko-2:** Extends Elo to include a rating deviation (uncertainty) component that increases when a team hasn't played recently. More appropriate for sports with long off-seasons.

**TrueSkill:** Microsoft's extension of Glicko to team sports and multiplayer games. Accounts for individual contributions to team outcomes.

**Sports application:** All three are used for NFL, NBA, and college football power ratings. FiveThirtyEight used Elo extensively for its NFL predictions.

**GSE use:** Real-time team strength ratings updated after every game. Used as one input factor in game predictions. The rating deviation component is used to increase uncertainty during off-season (when teams have changed significantly).

### 4.6 Time-Series Forecasting (Player Usage Trends)

**Methods:** ARIMA, exponential smoothing, Prophet (Facebook), and sequence models (LSTM, Transformer) for temporal data.

**Sports application:** Snap count trends over a season, target share trends as a receiver gets healthier from an injury, usage trend as a backup gets more opportunities. The temporal structure of the season matters — early-season performance is noisier than mid-season performance.

**GSE use:** Usage trend analysis for start/sit recommendations. "This player's snap count has increased in 4 straight weeks" is a time-series signal. Formalized into the projection model as a trend component.

### 4.7 Monte Carlo Simulation (Range of Outcomes)

**What it is:** Simulates thousands or millions of random scenarios by sampling from probability distributions. Each simulation produces one possible outcome; the distribution of outcomes represents the full range of possibilities.

**Sports application:** Simulating a full NFL season 10,000 times to estimate playoff probabilities. Simulating a DFS slate's possible outcomes across a lineup portfolio. Estimating a team's range of wins given schedule and team strength uncertainty.

**GSE use:** Playoff probability estimates. DFS lineup portfolio simulation (see Section 5). "Your team makes the playoffs in 67% of our simulations" is a Monte Carlo output.

### 4.8 Causal Inference / Counterfactual Analysis

**What it is:** Methods (propensity score matching, instrumental variables, difference-in-differences, causal forests) that attempt to estimate the causal effect of an intervention, not just a correlation.

**Sports application:** "How much does this player's absence affect the team's expected points?" — requires a causal estimate, not just a correlation. What is the treatment effect of a new offensive coordinator on a QB's performance? Causal inference avoids the common mistake of confusing correlation with causation.

**GSE use:** Injury impact estimation. "Without Player X, this team's expected score drops by Y points" is a causal claim that should be backed by a causal model, not just "this player's team loses more when he's out" (which is confounded by selection bias).

### 4.9 Anomaly Detection (Injury / Weather / Lineup Shocks)

**Methods:** Isolation forests, z-score threshold alerts, one-class SVM, autoencoders.

**Sports application:** Detecting when a player's current projection deviates significantly from their historical baseline (possibly indicating injury, role change, or matchup anomaly). Detecting when a line moves in a way inconsistent with historical patterns (possible sharp action or information leak).

**GSE use:** Real-time anomaly alerts. "This line moved 3 standard deviations more than usual for this game type, this early in the week" triggers a Signal Courtroom review. Player usage anomaly detection for waiver wire flags.

### 4.10 Markov Decision Process (Sequential Decisions Under Uncertainty)

**What it is:** A framework for decision-making where outcomes depend on the current state and the chosen action, and the environment is stochastic (random). Used to find optimal policies — sequences of decisions that maximize expected cumulative reward.

**Sports application:** Modeling optimal draft strategy as a sequential decision problem where each pick changes the available pool and the team's needs. Optimal FAAB bidding as a resource allocation problem under uncertainty.

**GSE use:** V2 draft assistant. The draft can be formally modeled as a MDP: current state = team composition + remaining draft pool, action = which player to select, reward = expected season outcome improvement. Solving the MDP (approximately, via dynamic programming or reinforcement learning) yields the optimal pick at each draft position.

### 4.11 Survival Analysis (When Will a Player's Role Collapse?)

**What it is:** A statistical framework for modeling time-to-event data. Originally developed for medical studies (when will a patient die or recover?), it is used broadly for any "how long until X happens?" question.

**Sports application:** Modeling time until a wide receiver loses their starting role, time until a running back's production declines significantly with age, time until a backup becomes a starter. Survival analysis correctly handles "censored" data — players whose careers haven't ended yet.

**GSE use:** Dynasty player valuation. The "survival probability" of a player's current role over the next 1, 2, 3 years is a key dynasty trade value input. Also used for aging curve analysis.

---

## 5. DFS-SPECIFIC ANALYTICS

### 5.1 Value-Based Drafting: VORP, VONA, Positional Scarcity

**VORP (Value Over Replacement Player):** Measures a player's value relative to the freely available replacement-level player at their position. A player with a high VORP is worth more than their raw projection suggests because replacement-level at that position is low.

**VONA (Value Over Next Available):** In the context of a draft, VONA measures the value of a player relative to the best player still available at their position if you wait until your next pick.

**Positional scarcity:** Elite players at scarce positions (QB in PPR, TE in some formats) have a premium because missing them leaves you with a worse replacement than missing an elite WR would.

**GSE Application:** The draft assistant should display VORP and VONA for every player at every draft position. The optimizer should surface "this is the last elite TE available — VONA drops off a cliff if you wait."

### 5.2 Ownership vs. Projection: Leverage Score

**Leverage score:** In DFS, the value of a player is their expected fantasy points minus the points the average field lineup is expected to score at that position (based on ownership). A player projected at 25 points with 35% ownership is less leveraged than a player projected at 23 points with 4% ownership.

**Formula (simplified):** Leverage = projection – (ownership × projection_weighted_average_field). High leverage = high projected score relative to field exposure.

**GSE Application:** The DFS optimizer should display leverage scores prominently. A lineup full of high-leverage players is a tournament-style portfolio. A lineup of low-leverage chalk is a cash game construction.

### 5.3 Portfolio Diversification: Game Theory Optimal (GTO) Ownership

**GTO ownership:** In a DFS contest, the theoretically optimal strategy (assuming a rational field) is to build lineups that mirror each player's probability of being in a winning lineup — which is proportional to their projected points, not just their raw projection. This prevents any single player or game stack from making or breaking the entire portfolio.

**Why it matters:** If all your lineups have the same QB, a bad game from that QB wipes out the entire portfolio regardless of the rest of the construction.

**GSE Application:** The DFS portfolio simulator should track total portfolio exposure to each player and flag when the portfolio is over-relying on any single player or game outcome.

### 5.4 Exposure Management

**Definition:** Exposure is the percentage of a DFS portfolio in which a given player appears. Managing exposure means deliberately limiting any player to a maximum percentage of lineups (e.g., max 35% exposure even on a projected chalk play).

**Why duplicating high ownership beats you:** In tournaments, the winning lineup almost always includes some contrarian plays (players with lower ownership who had a big game). If everyone in the field has the 80% ownership chalk, the winning lineup typically does not — it has unique correlation stacks.

**GSE Application:** The optimizer should allow users to set maximum exposure limits. The default portfolio construction should never put any player above a configurable exposure cap.

### 5.5 Stack Correlation: Why QB+WR/TE Works

**The correlation argument:** A QB and his primary receiver are positively correlated — when the QB has a big game (many touchdowns, high volume), the receiver benefits. Stacking them in a DFS lineup concentrates upside on the same game outcomes.

**Why stacks win tournaments:** DFS tournaments are won by outlier outcomes. A game that goes 45–38 is better for a QB+WR+TE stack from that game than for a diversified lineup. Since tournaments require outlier scores, stacking the correlated upside is mathematically optimal.

**Bring-back stacks:** A "bring-back" stack adds a player from the opposing team (often a WR) to capture additional upside in a high-scoring game. The optimal bring-back is the pass-catcher of the team opposing the stacked QB.

**GSE Application:** The DFS optimizer should automatically suggest stack options with correlation scores. "This QB+WR1+TE stack has historically been optimal in favorable game scripts."

### 5.6 Late Swap Optimization: Information Advantage at Lock Time

**Late swap:** Most major DFS contests allow players to be swapped until the start of their individual game (not the main slate lock). Late swap is one of the most valuable DFS skills — players with confirmed injuries, weather changes, or surprise inactives can be replaced.

**Information advantage:** A user who is actively monitoring injury reports at 1:00 PM on Sunday (NFL) and swapping out surprise inactive players while their opponents don't is gaining a systematic edge.

**GSE Application:** The Elite tier includes real-time push alerts specifically for late swap situations. "Player X just ruled out 45 minutes before game time — these are the recommended replacements at each position." This is one of the highest-value Elite tier features.

### 5.7 Monte Carlo Portfolio Simulation

**Definition:** Running thousands of simulated DFS slates using sampled player outcomes (drawn from projection distributions) to estimate each lineup's expected score distribution.

**What it tells you:** Not just "what is the expected score of this lineup" but "what is the probability this lineup scores in the top 10%?" — the relevant threshold for tournament prizes. A lineup with a higher median score is not necessarily better than a lineup with a higher probability of outlier performance.

**GSE Application:** The DFS optimizer should run Monte Carlo simulations across a portfolio of lineups and report: expected score, score standard deviation, probability of finishing in the money, probability of finishing in the top 1%.

### 5.8 Linear Programming / Integer Programming for Lineup Optimization

**Definition:** Lineup optimization is a constrained optimization problem. Given projected values for each player, salary constraints, roster slot constraints, and player eligibility constraints, find the lineup that maximizes expected value (LP) or expected score (integer programming, since lineups are discrete).

**Standard DraftKings NFL lineup:** 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST. Each player has a salary. Total salary must be ≤ $50,000. The optimizer finds the salary-efficient combination that maximizes projected points.

**Extensions:** Add correlation constraints (require QB+WR to be on the same team), exposure constraints (no player in more than 30% of lineups), game theory constraints (no two lineups identical).

**GSE Application:** The core DFS optimizer is an integer programming solver (likely implemented with PuLP or OR-Tools in Python, or a similar library). Correlation and exposure constraints are first-class features.

### 5.9 Mean-Variance Optimization for DFS Portfolios

**Definition:** Borrowed from financial portfolio theory (Markowitz). A mean-variance optimizer finds the portfolio (set of lineups) that achieves a target expected score with the minimum variance, or achieves the maximum expected score for a given variance.

**Cash game vs. tournament:** In cash games, minimize variance (you want a reliable expected score). In tournaments, maximize variance (you want upside, accepting a lower floor). Mean-variance optimization can explicitly model this tradeoff.

**GSE Application:** The portfolio simulator should expose a risk tolerance slider: "cash game" moves toward minimum variance, "tournament aggressive" moves toward maximum upside.

---

## 6. FANTASY-SPECIFIC PREDICTION METHODS

### 6.1 Projection Aggregation (Consensus vs. Single-Model)

**Why aggregate:** The wisdom of crowds applies to expert projections. Averaging multiple expert projections consistently outperforms any single expert over large samples. This is well-established in weather forecasting and political prediction; it applies to fantasy projections.

**Weighted aggregation:** Not all sources are equal. Sources with better historical calibration should receive higher weights. A Bayesian model updates source weights based on past accuracy.

**GSE Application:** GSE aggregates multiple projection sources (subject to data licensing compliance) and generates a consensus projection. The consensus is displayed alongside the single-source range (min/max), showing how much sources disagree.

### 6.2 Floor/Ceiling: Why Range Matters More Than Mean

See Section 3.6. In fantasy football specifically:
- **Cash game target:** Floor. In head-to-head or 50/50 contests, you want players with reliable high floors. Missing projections matters more than upside.
- **Tournament target:** Ceiling. In GPPs, you want players who can have monster games, even if they sometimes disappoint.

**GSE Application:** The display interface should prominently show floor and ceiling alongside the projection, with a visual indicator of the distribution width. The recommendation engine should explicitly specify "this pick is for cash games (high floor)" or "this pick is for tournaments (high ceiling)."

### 6.3 ADP as Market Signal (Wisdom of Crowds)

**ADP (Average Draft Position):** The average position at which a player is drafted across a large sample of real drafts. ADP aggregates the collective judgment of thousands of fantasy managers.

**ADP as efficient market price:** Just as the closing line is the most efficient price for betting, ADP is the "market price" for fantasy players. Players drafted significantly earlier than their projection-based value should be are overvalued; those drafted later are undervalued.

**ADP drift:** ADP changes throughout the preseason as news (training camp reports, injuries, depth chart changes) filters through the fantasy community. Tracking ADP drift reveals consensus shifts.

**GSE Application:** ADP is displayed alongside projections for every player. "Current ADP: 2.04 | GSE model rank: 2.07" indicates reasonable consensus alignment. "Current ADP: 3.01 | GSE model rank: 1.12" indicates a significant value opportunity.

### 6.4 FAAB Auction Theory

**FAAB (Free Agent Acquisition Budget):** A bidding system where teams submit bids for waiver wire players, with a total budget (often $100 or $200) for the season.

**Optimal FAAB strategy:** Like an auction more than a waiver priority system. Bidding theory applies: bid your true value plus a small premium for players you urgently need. Reserve budget for the mid-season injuries that change a team's landscape (a star RB1's injury often makes his handcuff a must-add).

**FAAB as resource management:** Spending $50 in Week 2 on a waiver add means $50 less for the rest of the season. The expected future value of remaining FAAB must always be weighed against current opportunity.

**GSE Application:** FAAB recommendation should include a bid range ("we recommend bidding $12–18 for this player") backed by: player's projected value, expected ownership percentage among competitors, and FAAB budget conservation logic.

### 6.5 Dynasty Valuation: Aging Curves, Rookie Performance Curves

**Aging curves:** Age has systematic, predictable effects on fantasy production. WRs typically peak at 24–27. RBs typically peak earlier (22–25) and decline faster. QBs have longer plateaus. The aging curve should be a first-class component of dynasty valuations.

**Rookie performance curves:** Rookies, especially WRs, typically underperform their talent in Year 1 (adjustment period) and breakout in Year 2–3. Understanding expected production trajectories is essential for dynasty trade decisions.

**Discount rates:** A player projected to produce heavily in 3 years is worth less today than one producing heavily now. Dynasty valuation requires a time discount rate applied to future projected value.

**GSE Application:** Dynasty player cards show the aging curve projection with uncertainty bands. "This WR is 24 years old. Historical aging curves suggest peak production through 2028, with a steepening decline curve beginning at 28."

### 6.6 Keeper Valuation Relative to ADP

**Keeper value:** The value of keeping a player is their current ADP minus the cost of keeping them (the round in which you keep them, sacrificed). If a player has an ADP of Round 3 but can be kept in Round 8, the keeper value is 5 rounds of savings.

**Breakeven ADP:** Keep the player if their current ADP is X rounds earlier than their keeper cost, adjusted for positional scarcity and your roster's specific needs.

**GSE Application:** The keeper analyzer should automatically flag "best keeper candidates" based on ADP vs. keeper cost, sorted by savings. Include uncertainty: "ADP may shift — this analysis is based on current consensus."

### 6.7 Trade Valuation: Win-Now vs. Future Equity

**Win-now vs. future equity tradeoff:** A player in their prime produces value now. A young player with high upside produces more total future value but less near-term value. Trade analysis must account for this.

**Trade calculator mechanics:** Assign projected fantasy points for current season + discounted future seasons. Adjust for contract length (in salary cap leagues), injury risk, and positional need.

**For dynasty leagues:** Future equity is more valuable; for redraft leagues, current season value dominates.

**GSE Application:** The trade analyzer explicitly asks "what is your team's win window?" A team in rebuild mode should value trades differently than a contending team. The analyzer accounts for this context.

---

## 7. NO-PLAY / DISCIPLINE SYSTEM: "NO-PLAY IS A WIN"

### 7.1 The Doctrine

The most disciplined sports prediction systems share a characteristic rarely found in sports media: they are comfortable not making a call. Every pick issued must clear a quality threshold. Below that threshold, the correct output is: "No clear edge identified — no recommendation."

This doctrine serves two purposes:
1. **Calibration integrity:** Including low-confidence "guesses" in the recommendation record dilutes the calibration. A 50% confidence pick is not a prediction — it is a coin flip. Recording it as a prediction pollutes the track record.
2. **User trust:** Users who follow GSE recommendations and find them consistently correct (because only high-confidence picks are issued) develop genuine trust. Users who receive a pick every day regardless of evidence quality will find that trust erodes when the low-confidence picks miss.

### 7.2 When Not Making a Call Is the Right Call

Situations that should default to No-Play:

- **High uncertainty, low model confidence:** The projection model disagrees with itself (high variance across ensemble members). Signal Courtroom counter-evidence is strong and unresolved.
- **Stale data:** Key information (injury status, starting lineup, weather) is pending and not yet reflected in the analysis. Wait until the information resolves.
- **Market efficiency confirmation:** The closing line closely matches the opening line, no sharp action detected, public and sharp money balanced. No edge relative to the market.
- **Small sample size warning:** Less than a meaningful number of historical comparable situations. The base rate is too uncertain to support a recommendation.
- **Conflicting signals:** Multiple high-quality signals point in opposite directions. The Signal Courtroom evidence is genuinely balanced. No edge is identified.

### 7.3 Expected Value of Abstaining

If the model's true win probability on a pick is 52%, the expected value at -110 juice is:

`EV = (0.52 × $100) – (0.48 × $110) = $52 – $52.80 = -$0.80`

This is a negative expected value pick. Abstaining (EV = $0) is strictly better than recommending a -EV pick. The threshold for recommendation must be high enough that the expected EV is clearly positive.

**Uncertainty about the probability estimate compounds this:** If the model thinks there's a 52% win probability but has wide uncertainty around that estimate (could be 45–59%), the expected value calculation becomes even less certain. The appropriate response to high uncertainty about a marginal edge is to not recommend.

### 7.4 Uncertainty Thresholds for Recommendation Suppression

**Confidence score gate:** Any pick below a minimum confidence threshold is suppressed from the recommendation feed. The minimum threshold should be set conservatively and recalibrated quarterly against actual outcomes.

**Uncertainty gate:** If the ensemble model members disagree significantly (high variance), the pick is held for review regardless of the mean confidence score.

**Data freshness gate:** If the underlying data (injury reports, depth chart, line data) is more than a configured threshold old, the pick is held until fresh data is available.

### 7.5 Responsible Gaming Integration

GSE's responsible gaming posture applies specifically to any betting-adjacent recommendations:

- **Kelly criterion education (not automation):** The Kelly criterion provides a theoretically optimal fraction of bankroll to bet given edge and odds. GSE can educate users about Kelly criterion as a concept but must not automate bet sizing recommendations. The user is responsible for their own betting decisions.
- **No "guaranteed wins" language:** All recommendations are probabilistic. Language like "lock," "can't lose," or "guaranteed" is prohibited in all GSE content.
- **Responsible gaming link:** Any page displaying betting odds, line movement, or any content adjacent to sports betting must include a responsible gambling resource (1-800-GAMBLER or equivalent) and a self-exclusion link.
- **Volume control:** No "bet every game" recommendation model. The No-Play doctrine is an explicit rejection of the "always have action" mentality.

---

*Document ends. Source gaps noted throughout. Calibration methodology details (Brier score computation, CLV tracking) should be implemented in `packages/prediction-engine/` per the architecture in CLAUDE.md.*
