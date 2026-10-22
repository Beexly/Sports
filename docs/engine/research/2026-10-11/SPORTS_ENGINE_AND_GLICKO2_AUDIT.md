# Sports Engine and Glicko2 Audit

Source: Sports Engine and Glicko2 Audit.docx

Research Brief and Architecture Specification: GSE Prediction Engine and Glicko-2 Implementation Audit

Glicko-2 Algorithmic Verification and Implementation Audit

Verdict on Implementation

Correct-with-rounding. The rating implementation in docs/research/2026-10-09/rating-atlas/glicko2.py (blob 0e24548f) is mathematically faithful to the published specification in Glickman (2012). The observed 0.01 rating discrepancy (1464.05 versus the published 1464.06) is not an algorithmic defect; it is an artifact of intermediate rounding in the numerical example of Glickman (2012), where g(\phi_j) was truncated to four decimal places, E_j to three decimal places, and the normalized rating update \mu' to four decimal places. Evaluated under IEEE 754 double precision without intermediate rounding, the exact rating update is 1464.050671 (rounding to 1464.05), with rating deviation RD' = 151.516524 (151.52) and volatility \sigma' = 0.059996.

Canonical Reproduction of Glickman (2012)

The canonical test vector evaluates an active entity with baseline rating r = 1500.0, rating deviation RD = 200.0, and volatility \sigma = 0.06 competing within a single rating period against three opponents:

Opponent 1: r_1 = 1400.0, RD_1 = 30.0, outcome s_1 = 1.0 (win)

Opponent 2: r_2 = 1550.0, RD_2 = 100.0, outcome s_2 = 0.0 (loss)

Opponent 3: r_3 = 1700.0, RD_3 = 300.0, outcome s_3 = 0.0 (loss)

The scale constant is 173.7178, the system constant is \tau = 0.5, and the root-finding convergence tolerance is \epsilon = 10^{-6}. Full double precision yields the exact variables compared against the paper values in the table below:

Variable

Re-run Value (Verified Here)

Published Value (Glickman 2012)

Discrepancy Cause

\mu

0.000000

0.000000

Exact match

\phi

1.151292

1.151300

Display rounding in paper

\mu_1

-0.575646

-0.575600

Display rounding in paper

\phi_1

0.172694

0.172700

Display rounding in paper

g(\phi_1)

0.995498

0.995500

Display rounding in paper

E_1

0.639468

0.639000

Truncated to 3 decimals in paper

\mu_2

0.287823

0.287800

Display rounding in paper

\phi_2

0.575646

0.575600

Display rounding in paper

g(\phi_2)

0.953149

0.953100

Display rounding in paper

E_2

0.431842

0.432000

Truncated to 3 decimals in paper

\mu_3

1.151292

1.151300

Display rounding in paper

\phi_3

1.726939

1.726900

Display rounding in paper

g(\phi_3)

0.724235

0.724200

Display rounding in paper

E_3

0.302841

0.303000

Truncated to 3 decimals in paper

v

1.778977

1.778500

Propagated intermediate rounding

\Delta

-0.483933

-0.483400

Propagated intermediate rounding

a

-5.626821

-5.626820

Display rounding in paper

Converged Root A

-5.626955

-5.626960

Display rounding in paper

Updated Volatility \sigma'

0.059996

0.059990

Truncated to 5 decimals in paper

Post-period \phi'

0.872205

0.872200

Display rounding in paper

Post-period \mu'

-0.206948

-0.206888

Truncation in intermediate step

Final Rating r'

1464.050671

1464.060000

Display rounding artifact in paper

Final Deviation RD'

151.516524

151.520000

Display rounding in paper

Substituting the paper's rounded intermediate values (v = 1.7785, \Delta = -0.4834) directly into Step 5 while adopting a normalized rating update truncated to \mu' = -0.206888 produces 1500.0 + (-0.206888) \times 173.7178 = 1464.059996 \approx 1464.06. In contrast, evaluating the step at full floating-point precision yields 1464.05. The 0.01 gap is entirely an artifact of display truncation in the published paper.

Solver Comparison on the Volatility Function

The volatility objective function is defined as:

f(x) = \frac{e^x (\Delta^2 - \phi^2 - v - e^x)}{2(\phi^2 + v + e^x)^2} - \frac{x - a}{\tau^2}

Evaluating standard numerical root solvers on the canonical test vector (\phi = 1.151292, v = 1.778977, \Delta = -0.483933, a = -5.626821, \tau = 0.5) demonstrates the empirical convergence behavior summarized in the table below:

Root Solver

Iterations to \vert B - A \vert < 10^{-6}

Converged Root x

Resulting \sigma' = \exp(x/2)

Failure Mode Analysis on f(x)

Illinois (Glickman Published)

2

-5.626955

0.059996

Stalls on exact zero root without strict threshold checks.

Plain Regula Falsi

2

-5.626955

0.059996

Stalls on asymmetric convex asymptotes when \Delta^2 \gg \phi^2 + v.

Newton-Raphson

2

-5.626955

0.059996

Diverges on flat asymptotic plateaus as x \to -\infty or x \to \infty.

Bisection

19

-5.626955

0.059996

Slow linear convergence; unconditionally stable.

Newton-Raphson can fail on f(x) in parameter regimes where \Delta^2 is large relative to \phi^2 + v. In those regimes, the derivative f'(x) flattens across broad intervals, projecting tangent lines to negative values where f(x) becomes linear with slope -1/\tau^2. While safeguarded Newton-Raphson provides quadratic local convergence once an initial bracket is secured, Illinois false position converges in two to three iterations because the initial bracket endpoint A = a is placed close to the root.

Regarding the bracket search cap k = 200, the parameter search steps a - k\tau when \Delta^2 \le \phi^2 + v until f(a - k\tau) \ge 0. The first term of f(x) is bounded:

\left\vert \frac{e^x (\Delta^2 - (\phi^2 + v + e^x))}{2(\phi^2 + v + e^x)^2} \right\vert < \frac{e^x}{2(\phi^2 + v + e^x)} < 0.5

For \tau = 0.5, the linear second term evaluated at k = 1 is -( (a - \tau) - a ) / \tau^2 = 1/\tau = 2.0. Consequently, f(a - \tau) \ge -0.5 + 2.0 = +1.5 > 0 for all valid real inputs. The search terminates at k = 1, rendering the bracket cap k = 200 unreachable and structurally inert.

When a chord iteration lands on an exact root (f(C) = 0), the strict inequality f(C) f(B) < 0 evaluates to false. The algorithm enters the else branch, setting f_A \leftarrow f_A / 2, leaving A unchanged, and updating B \leftarrow C. In the subsequent iteration, C_{\text{next}} = A + (A - B) f_A / (0 - f_A) = B. If termination requires \vert B - A \vert < \epsilon without evaluating \vert f(C) \vert < \epsilon, the interval width \vert B - A \vert remains stationary while f_A is halved repeatedly, causing an infinite loop unless an iteration cap terminates execution. The production implementation must enforce an explicit check: if abs(f_c) < 1e-12: return math.exp(C / 2.0).

Rating Period Definitions for Sparse Schedules

In the Glicko-2 framework, the rating period is a discrete operational window during which all contests are evaluated in parallel against baseline parameters established at the start of that window. Mark Glickman's published guidance specifies that a rating period should be selected such that competitors participate in an average of 5 to 15 games per window, warning that single-game updates degrade the stability of volatility estimates.

For the National Football League (17-game regular season), the choice of rating period creates distinct structural trade-offs:

Week-as-Period: 18 discrete periods per regular season. Because teams compete at most once per week, the parallel update collapses mathematically into a sequential single-game update. Across 17 consecutive single-game windows, between-period variance inflation \phi^* = \sqrt{\phi^2 + \sigma^2} is applied 17 times.

Month-as-Period: 4 discrete periods per season (4 games per period). This satisfies Glickman's structural criteria by evaluating contests simultaneously, eliminating intra-month ordering bias while reducing between-period variance compounding.

Season-as-Period: 1 discrete period per season. All 17 games are evaluated against opening pre-season ratings, discarding temporal schedule ordering and eliminating intra-season rating responsiveness.

Empirical Period Study (Status: Unrun): The command to execute the period comparison across real NFL slates is: python3 -c "from data.analyze_glicko_period import run_period_study; run_period_study('data/games_all.csv', season=2024)"

When a team experiences an idle period (such as an NFL bye week), the Glicko-2 specification dictates that rating \mu and volatility \sigma remain unchanged, while uncertainty expands via \phi' = \sqrt{\phi^2 + \sigma^2} without solving for updated volatility. For a team with baseline RD = 200.0 and \sigma = 0.06, uncertainty expands across consecutive idle weeks as follows:

1 idle week: RD = 200.2714

4 idle weeks: RD = 201.0835

17 idle weeks: RD = 204.5651

The implementation in ratings2.py fails to execute this step because it only iterates over teams present in the active period's game records, leaving idle teams unadjusted.

Parameter Identifiability of \tau and \sigma

The system constant \tau governs the magnitude of volatility fluctuations over time. In an NFL setting with 32 teams playing 17 games, the marginal likelihood function for \tau across the parameter range \tau \in [0.2, 1.2] is flat. Because teams compete in only 17 binary contests per year, the profile log-likelihood lacks sufficient curvature to isolate an optimal maximum likelihood estimate. The default \tau = 0.5 is an assumed operational prior rather than an identified empirical parameter.

The volatility parameter \sigma measures unexpected variation in performance. Evaluated across a synthetic schedule of a 9–8 team facing league-average opposition (r = 1500.0, RD = 200.0), the single-period update shifts volatility from \sigma_0 = 0.060000 to \sigma' = 0.059992. Evaluated across 100 randomized weekly permutations under week-as-period updates, the final volatility distribution is constrained to \text{mean} = 0.060001, \min = 0.060000, and \max = 0.060003. The posterior volatility remains tightly bound to its prior, demonstrating that \sigma cannot be identified from 17 binary win-loss observations. Volatility functions as an inert structural constant rather than an informative predictive feature in short-season sports.

Numerical Edge Cases, Margins, and Boundary Behaviors

Evaluating Glicko-2 under extreme boundary configurations confirms its numerical properties:

Opponent RD Boundaries: For an opponent with RD \to 0 (\phi = 10^{-8}), the weighting function approaches g(\phi) \to 1.00000000. For an opponent with high uncertainty RD = 350.0 (\phi = 2.014762), the weighting function attenuates the contest to g(\phi) = 0.66906941.

Asymmetric Matchup (E = 0.99): For an overwhelming favorite (E = 0.99), the estimated variance expands to v = 1 / (g^2 \times 0.99 \times 0.01) = 101.0101. The post-period deviation updates to \phi' = 1.145344 (RD' = 198.9667 from 200.0), showing that the algorithm handles near-certain probabilities without arithmetic underflow.

Draw Representation: Glickman (2012) defines outcomes as s_j \in \{0.0, 0.5, 1.0\}. The implementation in FULL_STACK_DELIVERY.md handles ties by assigning 0.5, whereas the packet implementation in glicko2.py does not include special-casing for draws and requires pre-processed float values.

Continuity Across the Bracket Boundary: Evaluating the objective across the boundary \Delta^2 = \phi^2 + v (3.103974) reveals that the solution is continuous, yielding \sigma' = 0.06000000 on both sides of the transition.

Uncertainty Convergence: For an unrated team with RD = 350.0 facing league-average opposition (r = 1500.0, RD = 200.0), single-game weekly updates reduce the deviation below 100.0 in 17 periods (RD = 99.87). However, single-game updates never reach RD < 50.0 because the weekly variance inflation \sqrt{\phi^2 + \sigma^2} balances observation precision at an asymptotic floor of RD \approx 65.49. Reaching RD < 50.0 requires three games per period across 48 consecutive periods.

Regarding margin-of-victory modeling, Glicko-2 is formulated around Bernoulli win-loss outcomes. While heuristic adaptations map point margins to normalized scores s_j \in [0, 1] using logistic transforms (e.g., s_j = (1 + \exp(-\text{margin}/\alpha))^{-1}), no published empirical study demonstrates that ad-hoc margin adaptations outperform an unadjusted Gaussian margin model or production Expected Points Added (EPA) models when evaluated against closing point spreads.

Glicko-2 Architecture Kill List

The following anti-patterns must be excluded from the modeling architecture:

Sequential Updates Labeled as Canonical: Treating weekly single-game processing as equivalent to the period-parallel algorithm accumulates variance prematurely and violates Glickman's structural formulation.

Unbounded Volatility Scaling (\sigma \to 2.0): Iterating sequential single-game updates across long seasons inflates volatility toward arbitrary ceilings, degrading ratings into noisy momentum metrics.

Exact-Match Assertions: Asserting floating-point parity with Glickman's published 1464.06 fails to account for intermediate paper truncation. Tests must assert against 1464.05 \pm 0.02.

Ad-Hoc Point Spread Conversion: Transforming Glicko ratings into point spreads via linear scaling constants (e.g., \text{spread} = (r_A - r_B)/25.0) without accounting for key NFL scoring clusters (3, 7, 6, 10, 14) introduces severe calibration error.

Covariate Over-Parameterization: Bolting rest, travel, and altitude adjustments onto Glicko-2 ratings introduces double-counting, as these factors are already integrated into market prices.

Production Model Displacement: Substituting production EPA models with Glicko-2 is rejected; play-by-play EPA captures drive-level efficiency that binary outcome ratings discard.

Open Mathematical Decisions for Human Operator

Rating Period Definition: Select between a weekly period (collapsing to sequential updates with 17 variance inflation steps) and a multi-week rolling window for regular-season modeling.

Volatility Parameter Assignment: Determine whether to retain \sigma as an inert structural prior (\sigma = 0.06) or freeze it entirely, given its lack of empirical identifiability across 17-game schedules.

Idle-Period Processing Rule: Decide whether to implement Glickman's variance-expansion update (\phi' = \sqrt{\phi^2 + \sigma^2}) for bye weeks, establishing consistency across active and resting teams.

Closing-Line Efficiency and Empirical Literature Audit

Closing-Line Value as a Sufficient Statistic

The hypothesis of closing-line efficiency incorporates three distinct assertions:

Calibration: Closing market probabilities are well-calibrated; events priced at implied probability p occur with empirical frequency p.

Information Maximization: The closing price represents the most accurate available forecast at match commencement, integrating all publicly accessible information.

Cost-Adjusted Sufficiency: No algorithmic model can achieve positive out-of-sample expected return after absorbing transaction costs (the bookmaker overround or exchange commission).

A systematic review of empirical literature reveals that while claims (1) and (2) are supported across liquid betting markets, claim (3) fails when evaluated against soft retail sportsbooks, yet holds against sharp market-makers (Pinnacle, Betfair Exchange). Most academic papers that claim to beat sports betting markets evaluate against opening lines, benchmark against recreational books with delayed price updates, or omit multiple-testing corrections. When holdout sets are evaluated against closing prices under the Deflated Sharpe Ratio (DSR) or White's Reality Check, positive abnormal returns typically attenuate to zero.

Situational Covariates and Market Residuals

A foundational finding of this stack confirms that widely cited situational covariates (rest disparity, travel distance, timezone crossing, and stadium altitude) do not survive against the closing spread. When the market residual is defined under the standard sign convention:

\text{residual} = \text{home\_margin} + \text{listed\_spread}

where listed spread is the bookmaker's home line (\text{favorite} < 0), joint OLS regression across 3,368 NFL games (2006–2018 closes) demonstrates that situational factors are fully priced into the closing line:

Travel distance: \beta = +0.0004 points per mile (t = +2.14, economically negligible)

Timezone shift: \beta = -0.004 points per hour (t = -0.02, statistically indistinguishable from zero)

Altitude differential: \beta = -0.248 points per 1,000 feet (t = -1.40)

Rest differential: \beta = -0.091 points per day (t = -1.02)

Short week away: \beta = +0.544 points (t = +0.51)

Regression Intercept: \beta_0 = -0.464 (t = -1.05), confirming spread unbiasedness

Situational adjustments offer predictive utility only when evaluated against opening lines or stale pricing windows. Once sharp price discovery concludes, situational factors are incorporated into the market consensus.

Count Models and Score Grids versus Pinnacle Closes

In association football, neither bivariate Poisson models nor Dixon-Coles models outperform the Pinnacle closing line on 1X2 or totals markets out of sample. On held-out 2024–25 English Premier League fixtures (n = 380 matches), the empirical evaluation establishes:

Pinnacle Closing devigged log-loss: 0.9664 nats per match

Dixon-Coles coordinate MLE model (4-season panel): 1.0470 nats per match

Dixon-Coles coordinate MLE model (10-season panel): 1.0801 nats per match

30/70 Linear Model-Market Pool: 0.9795 nats per match

The pure statistical model lags Pinnacle's closing accuracy by 8.3\% (+0.0806 nats). While team-conditioned Karlis-Ntzoufras bivariate Poisson models resolve the correlation parameter to \lambda_3 = 0.3035 (correcting the \lambda_3 \to 0.001 artifact of missing team means), this parameter improves intra-match dependency modeling for same-game parlays rather than generating alpha against liquid closing lines.

Conformal Prediction and Calibration Under Distribution Shift

Standard split conformal prediction guarantees marginal coverage 1 - \alpha under the strict assumption of exchangeability. In sports forecasting, temporal non-stationarity breaks this assumption across successive seasons:

Covariate shift emerges from changing offensive efficiency, pace of play, and tactical evolution across seasons.

Maintaining distribution-free coverage under temporal shift requires Adaptive Conformal Inference (ACI), which dynamically adjusts the nominal miscoverage rate: \alpha_{t+1} = \alpha_t + \gamma (\alpha - \text{err}_t) where \gamma > 0 is the adaptation step size and \text{err}_t = \mathbb{I}(y_t \notin \hat{C}_t(x_t)) represents empirical miscoverage.

Isotonic regression via the Pairwise Adjacent Violators (PAV) algorithm risks severe over-fitting in probability tails unless regularized via Platt scaling or temperature scaling. The stack's backtest across 2025 NFL weeks 1–6 demonstrated that raw model probabilities were overconfident (Brier = 0.2868), improving to 0.2464 after applying temperature scaling (T = 7.512).

Favorite-Longshot Bias After Shin Devigging

In high-liquidity markets, favorite-longshot bias is largely an artifact of the bookmaker's margin allocation. When bookmakers protect against informed flow, they price longshots with a disproportionate share of the overround.

Applying Shin's insider-trading model extracts the structural parameter z via numerical bisection:

\pi_i(z) = \frac{\sqrt{z^2 + 4(1-z) \frac{p_i^2}{\sum p}} - z}{2(1-z)}

On balanced markets (-110 / -110), Shin resolves to z = 0.0476, yielding fair probabilities of 0.50 / 0.50. Evaluated across 3,368 NFL closing moneylines (2006–2018), the regression slope of empirical win rate against Shin-devigged fair probabilities across bins with n \ge 200 is 0.943. This slope confirms that longshots remain slightly overpriced relative to fair value, but the extreme deviations observed under multiplicative devigging disappear once the margin is properly attributed.

Literature Review and Paper Mapping

The table below catalogs papers evaluated against holdout discipline, transaction cost accounting, and closing line sufficiency:

Citation

Year

Tested Hypothesis

Holdout Protocol

Operational Verdict

Affected Engine Module

Kaunitz, Shen, Brizzi et al.

2017

Beating online bookmaker consensus pricing.

Real-time live execution; accounts restricted by sportsbooks.

REJECT (Exploits soft bookmaker latency; unviable on closing lines).

divergence.py

Borghesi, R.

2014

Price efficiency and closing line sufficiency in NCAA football spreads.

10-season out-of-sample closing spread residuals.

WIRE (Confirms closing line sufficiency; validates market-as-prior).

engine_math.py

Wheatcroft, E.

2020

Evaluating bivariate Poisson and Dixon-Coles models against Pinnacle odds.

Multi-season held-out soccer log-loss vs closing lines.

WIRE (Marginalizes Poisson grids; confirms necessity of market blend).

data/fit_engines.py

Hubáček, Šourek, Železný

2019

Machine learning ensembles for sports betting market exploitation.

Pre-close vs post-close returns with stated commission.

REJECT (Edges concentrate against opening lines; eliminated by close).

router_prediction.py

Angelini, Candila, De Luca

2022

Real-time paired comparison ratings vs liquid European soccer exchange closes.

Out-of-sample expanding window vs Pinnacle closes.

REJECT (Pure rating models fail to exceed exchange accuracy).

ratings2.py

Gibbs, I., Candès, E.

2021

Adaptive Conformal Inference under online distribution and covariate shift.

Online time series with theoretical finite-sample bounds.

WIRE (Integrates ACI into probability interval generation).

calibration2.py

Snowberg, E., Wolfers, J.

2010

Risk preferences vs misperceptions in favorite-longshot bias.

Parametric devigging across large-scale racing and sports datasets.

WIRE (Formalizes risk-preference vs informed-trader devigging).

engine_math.py

Boshnakov, G. et al.

2017

Bivariate time-series count models for association football scores.

Out-of-sample validation on European soccer leagues.

WIRE (Validates team-specific covariance parameters).

props_deep.py

Barber, R. et al.

2023

Conformal prediction beyond exchangeability via weighted residuals.

Theoretical coverage under non-exchangeable shifts.

WIRE (Replaces i.i.d. split conformal on sequential sports boards).

calibration2.py

ArXiv Program Corpus Delta and Unwired Adaptations

Ledger Distribution and Audit

An audit of the research program repository (docs/arxiv-program/research/2026-09-21/arxiv-deep/) confirms that the directory contains exactly 2,044 indexed ledger files (0001-... through 2044-...). The distribution across all audited ledger files is structured as follows:

Total indexed ledger files opened and verified: 2,044

REJECT verdicts: 1,882 (92.07\%)

ADAPT verdicts: 162 (7.93\%)

ADAPT notes wired into production code: 38

ADAPT notes currently unwired: 124

The overwhelming majority of REJECT verdicts stem from backtesting exclusively against opening or intermediate retail lines, omitting transaction costs, or reporting uncorrected performance metrics that fail multiple-testing corrections.

Priority Unwired Research Ports

The five highest-value unwired research ports identified within the 124 open notes are:

Disagreement-Weighted Opinion Pooling (Wisdom-of-Crowds Ledger, Ref: 0329)

Mathematical Formulation: Replaces static linear weighting (w = 0.30 model, 0.70 market) with a dynamic log-linear pool where bookmaker consensus weights decay as cross-market variance (entropy) expands: \ln p^*_i = \sum_{k} w_k(\mathcal{D}) \ln p_{k,i} - \ln Z, \quad w_k(\mathcal{D}) \propto \exp(-\lambda \cdot \text{Var}(p_k))

Addressed Gap: Replaces hardcoded blending coefficients with uncertainty-aware pooling.

Target File: engine_math.py (stack_with_market).

Drawdown-Constrained Horizon Kelly Sizing (Cherny–Obłój Ledger, Ref: 0668)

Mathematical Formulation: Maximizes expected logarithmic growth subject to a hard drawdown constraint: \max_{\mathbf{f}} \mathbb{E}[\ln(1 + \mathbf{f}^\top \mathbf{X})] \quad \text{s.t.} \quad \mathbb{P}\left(\min_{t \le T} W_t \le \alpha W_0\right) \le \delta Solved via Lagrange multipliers penalizing the portfolio leverage cap.

Addressed Gap: Mitigates empirical full-Kelly drawdowns (72\%–87\%) observed in kelly2.py simulations.

Target File: kelly2.py (simultaneous_kelly).

Adaptive Conformal Inference Under Non-Exchangeable Shift (Ref: 1168)

Mathematical Formulation: Online calibration tracking the empirical miscoverage error \text{err}_t = \mathbb{I}(y_t \notin \hat{C}_t): \hat{\alpha}_{t+1} = \hat{\alpha}_t + \gamma (\alpha - \text{err}_t), \quad \hat{C}_t(x) = [\hat{\mu}_t(x) - q_{1-\hat{\alpha}_t}, \hat{\mu}_t(x) + q_{1-\hat{\alpha}_t}]

Addressed Gap: Restores distribution-free coverage across NFL seasons when rule changes or structural shifts disrupt exchangeability.

Target File: calibration2.py (conformal_interval).

Bayesian Empirical Shrinkage for Drive-Level EPA (Ref: 1750)

Mathematical Formulation: James-Stein hierarchical shrinkage of opponent-adjusted drive EPA toward league priors: \hat{\theta}_i = \bar{\theta} + \left(1 - \frac{(K - 3) \sigma^2}{\sum_{i=1}^K (y_i - \bar{y})^2}\right)_+ (y_i - \bar{y})

Addressed Gap: Replaces un-shrunk box-score metrics with stabilized small-sample play-by-play estimates early in the season.

Target File: data/deep_metrics_nfl.py.

Bivariate Poisson Covariance Calibration for Correlated Total Lines (Ref: 2044)

Mathematical Formulation: Closed-form expectation of joint cover probabilities under Karlis-Ntzoufras shared Poisson intensity \lambda_3 = 0.3035, marginalizing over bivariate score grids: \mathbb{P}(X = x, Y = y) = e^{-(\lambda_1 + \lambda_2 + \lambda_3)} \sum_{k=0}^{\min(x,y)} \frac{\lambda_1^{x-k}}{(x-k)!} \frac{\lambda_2^{y-k}}{(y-k)!} \frac{\lambda_3^k}{k!}

Addressed Gap: Converts theoretical \lambda_3 estimates into production pricing for same-game total and team-total derivative markets.

Target File: props_deep.py (biv_poisson_correct).

Autonomous Research Pipeline Architecture

Pipeline Workflow and Operational Cycle

The autonomous research pipeline is engineered for a solo builder, executing in pure-standard-library Python without external daemons, cloud dependencies, or GPU resources. The architecture operates through seven sequential phases:

Phase 1: Scheduling and Trigger Initialization The execution cycle is initiated on an event-driven basis following completion of a sports slate (e.g., Tuesday morning post-MNF), or on-demand via single-command terminal invocation (python3 data/run_cycle.py).

Phase 2: Ingestion and Idempotent Cache Validation The pipeline connects via standard-library HTTP to verified public release assets, including nflverse play-by-play .csv.gz archives, NextGen Stats releases, and football-data.co.uk historical odds tables. Downloaded content hashes are evaluated against local SHA-256 records; files matching existing hashes are skipped immediately to prevent redundant disk and network I/O.

Phase 3: Database Construction and Schema Synchronization The database module builds and updates tables within data/research.db using standard-library sqlite3. Native schema definitions enforce type casting on ingestion, populating temporal game attributes, rest indicators, stadium environmental factors, and referee assignments without relying on external ORMs.

Phase 4: Pre-Estimation Integrity Assertions Before mathematical models are refit, the pipeline evaluates mandatory structural assertions:

Join Integrity Check: Confirms that historical closing spread merges match exactly n = 3,368 decisive games, aborting if missing records skew the training sample.

Slate Dummy Non-Zero Check: Confirms that time-window binary flags (e.g., Sunday Night Football, Thursday Night Football) contain non-zero positive sums, preventing date-only string formatting bugs.

Distributional Parameter Type Check: Confirms that all reported uncertainty ranges represent genuine posterior draw percentiles (2.5\% to 97.5\%) rather than standard errors divided by \sqrt{n}.

Phase 5: Model Estimation and Parameter Optimization Statistical models execute coordinate MLE parameter estimation for Dixon-Coles time decay, expectation-maximization updates for Karlis-Ntzoufras shared Poisson intensities, and expanding-window Simple Rating System (SRS) calculations.

Phase 6: Probability Calibration and Interval Generation Model-generated probabilities are blended against closing-market priors using temperature scaling, and non-conformity scores are calibrated to generate distribution-free prediction intervals.

Phase 7: Ledger Persistence and Termination Fitted model parameters, out-of-sample log-loss statistics, and calibration metrics are appended to the persistent fits table in research.db, and settled wagers are recorded in clv_ledger.json. Upon ledger verification, the pipeline terminates execution completely.

Execution Safeguards and Human Control Gates

The automated pipeline is restricted from executing production changes without human approval. The environment enforces the following operational boundaries:

Commits are restricted to research branches; merging to main (e1260ae) requires manual pull request review and human sign-off.

The research environment has no outbound network connections to payment gateways (Stripe), banking rails, or automated wager-placement APIs.

The research runner records closing-line residuals, Brier scores, and calibration intervals internally; it is blocked from publishing public betting recommendations or automated picks.

Production modeling parameters—such as baseline home-field advantage (NFL\_EPA\_HFA = 0.025\text{ EPA/play}) and nonlinear wind thresholds (10\text{ mph} inflection)—cannot be modified by the automated estimation loop.

Storage Architecture Analysis

Architecture Verdict: SQLite (data/research.db) + Local .csv.gz Cache.

Alternative storage engines such as PostgreSQL, DuckDB, or Apache Parquet introduce unnecessary operational complexity without delivering measurable performance gains:

A complete season of compressed NFL play-by-play data occupies approximately 19\text{ MB} (48,771 plays). Eleven complete seasons of English Premier League match records occupy less than 8\text{ MB}. Over two decades of historical NFL results and closing lines total under 50\text{ MB} uncompressed.

SQLite is integrated directly into the Python standard library, requires zero background processes, uses no external network ports, and runs seamlessly in memory-constrained environments.

Indexed B-tree queries on SQLite execute in under 5\text{ ms} for typical team- and season-level aggregations. Columnar engines (DuckDB, Parquet) provide advantages at multi-gigabyte scale, but add binary dependency management overhead for a relational dataset that fits entirely within system RAM. SQLite remains the primary storage engine.

Infrastructure Cost Model and Resource Allocation

The research platform operates under a zero-cost infrastructure model, utilizing keyless public data feeds and local standard-library execution. The operational budget is outlined in the table below:

Line Item

Operational Scope

Monthly Spend Ceiling

Condition Permitting Non-Zero Spend

GitHub Actions Minutes

Automated testing and repository integrity checks.

$0.00

Standard free tier (2,000\text{ minutes/month}) is sufficient. No paid minutes permitted.

Cloud Compute (VPS)

Autonomous pipeline execution and ingestion.

$0.00

All computation runs locally on the operator's machine. VPS (5/mo) permitted only if continuous scraping is required.

Object Storage (S3)

Raw .csv.gz and database archive backups.

$0.00

Raw data is stored locally and rebuilt directly from public URLs. Cloud storage permitted only if local storage fails.

Paid Sportsbook Odds API

Multi-book consensus and market movement monitoring.

$0.00

Keyless public feeds (ESPN, Pinnacle guest) are sufficient. Paid API access permitted only if CLV tracking demonstrates edge recovery exceeding subscription costs.

Cloud GPU Compute

Model training and rating estimation.

$0.00

All models run on CPU in pure Python. Standard MCMC runs in <2\text{ seconds} locally. GPU allocation is prohibited.

Total Monthly Spend

Complete research infrastructure stack.

$0.00

Zero new expenditure. Baseline operation is fully self-contained.

Comprehensive Stack Gap Board and Universal Kill List

Stack Gap Board

The table below catalogs open gaps across the research engine, providing verification references, operational resolutions, and resource requirements:

Gap Identifier

Current Status

Evidence & Verification Reference

Next Command / Resolution Paper

Cost

1. ci() Sample Division Bug

OPEN

analyze_nfl.py in v7 delivery divides by \sqrt{n}, understating interval width; branch patches (ci_fix.py) print correct percentiles.

Overwrite data/analyze_nfl.py with interval_fix.py draws logic (2.5\% and 97.5\% percentiles).

0.00

2. Kalman Docstring Mismatch

OPEN

Docstrings in FULL_STACK_DELIVERY.md cite [1.54, 1.59] and [13.34, 13.37]; branch engine_math.py correctly labels them as priors.

Reconcile delivery docstrings to cite posterior draws [1.01, 2.18] and ladder prior 13.45.

0.00

3. Part 5 Sigma Row & Manifest

OPEN

Delivery summary table still cites retired mean intervals; manifest asserts exact Glicko-2 match.

Update Part 5 summary table to report verified draw intervals and append "match to rounding".

0.00

4. EPL Ipswich Unseen Team Key

OPEN

Promoted teams without prior-season parameters trigger dictionary key errors in fit_engines.py.

Apply att.get(team, 0.0) and deff.get(team, 0.0) fallback syntax in data/fit_engines.py.

0.00

5. Weather OLS Data Schema

OPEN

games.jsonl lacks wind speed attributes; OLS requires merging games_all.csv with closing_lines.csv.

Execute data/analyze_nfl.py using games_all.csv wind column join against closing_lines.csv.

0.00

6. Reverse Line Movement Source

KILLED

No keyless feed provides public wagering percentages; paid odds APIs add cost without closing-line alpha.

Deprecate RLM detector; monitor line movement directly using keyless odds feeds in divergence.py.

0.00

7. 10 Hz Player Tracking

KILLED

NFL Big Data Bowl archives require private Kaggle API credentials, violating keyless constraints.

Discontinue raw tracking dependencies; ingest public NextGen Stats summary metrics via nflverse.

0.00

8. Missing 2024 NGS Release

OPEN

NextGen Stats 2024 passing/rushing archives are omitted from the nflverse release tag.

Cache 2022–2023 NGS datasets; poll release repository weekly via data/download_deep.py.

0.00

9. Historical EPA & Contract Joins

OPEN

Historical contract matrices and pre-2025 play-by-play files are downloaded but not joined into research.db.

Run SQL ingestion joining contracts.csv and pbp_2024.csv.gz into nfl_games context tables.

0.00

10. Proprietary Metrics (PFF/DVOA)

KILLED

PFF grades and FTN DVOA are commercial proprietary metrics requiring paid subscriptions.

Reject commercial data buys; rely on open-source play-by-play EPA, CPOE, and success rate metrics.

0.00

11. Team-Conditioned KN \lambda_3 Total Repricing

OPEN

Team-level \lambda_3 = 0.3035 is estimated in sample, but derivative totals edge against close is unmeasured.

Execute reprice_epl_totals.py comparing bivariate Poisson coverage against Pinnacle closes.

0.00

12. Unverified NFL Fatigue Curve

OPEN

Delivery quarter scoring ratios (1.519, 1.446, 0.982) represent single-machine local output.

Run python3 data/deep_metrics_nfl.py to regenerate the quarter scoring distribution.

0.00

13. Missing Market Prior in NFL Backtest

OPEN

Backtest on 2025 weeks 1–6 relies exclusively on SRS ratings without incorporating market closing prices.

Integrate stack_with_market(p_model, p_market, w=0.3) into backtest.py expanding loop.

0.00

Universal Stack Kill List

The following modeling strategies and infrastructure patterns are permanently excluded from development:

Claims of Absolute Forecaster Accuracy: All models are bounded by market noise. The uncalibrated NFL model achieved 55.8\% accuracy with a Brier score of 0.2868, improving to 0.2464 only after temperature scaling (T = 7.512).

Evaluating Edges Against Opening Lines: Backtesting against soft opening prices without assessing closing-line efficiency is rejected as an invalid measure of true predictive edge.

Proprietary Data Subscriptions: Purchasing commercial data (PFF, DVOA) is prohibited; open-source play-by-play metrics provide equivalent or superior predictive signal.

Persistent Background Agent Architecture: Multi-agent background processes and cloud-hosted daemon swarms are rejected in favor of deterministic, on-demand local scripts.

Heuristic Situational Adjustments Against the Close: Adding manual adjustments for travel, rest, or altitude to closing lines is prohibited, as these factors are already priced by the market.

Division of Sample Uncertainty by \sqrt{n}: Expressing posterior parameter ranges via mean standard errors divided by \sqrt{n} is prohibited; models must report genuine posterior draw intervals.

Unregularized High-Order Polynomial Regressions: Fitting high-degree polynomials to weather or situational variables is rejected in favor of robust, pre-specified functional forms.

Strategic Decisions for Human Governance

Closing Market Blending Strategy: Determine whether the engine should evaluate pure fundamental ratings or formally enforce a market-prior linear blend (30\% model, 70\% Pinnacle close) across all sports, recognizing that unblended models underperform closing lines out of sample.

Parameter Interval Reconciliation: Authorize a global codebase update replacing narrow mean confidence intervals ([1.54, 1.59]) with true posterior sample intervals ([1.01, 2.18]) across documentation and verification tables.

Glicko-2 Weekly Schedule Representation: Formally establish whether the NFL rating period should be defined as single-game weekly intervals (collapsing to sequential updates) or multi-game rolling windows, and decide whether volatility \sigma should be frozen as an unidentifiable parameter.

Paid API Gateway Authorization: Approve a strict governance rule prohibiting paid sports betting API subscriptions until the CLV ledger records at least 500 settled wagers demonstrating statistically significant positive closing-line value (t > 2.0).

Model Scope and Market Selection: Establish whether quantitative modeling should focus on derivative and prop markets where bookmakers face structural correlation constraints (e.g., same-game parlays, player props), while treating liquid main lines primarily as informational anchors.