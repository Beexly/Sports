post_04|Team ability is a schedule-adjusted Empirical-Bayes random intercept u_{t,k} ~ N(0, tau_k^2), never an unshrunk sample mean|match|estimateMultilevelTeamEpaAbility lines 72-134 implements multilevel random intercepts with posterior shrinkage
post_04|Posterior shrinkage factor is kappa = (n / sigma^2) / (n / sigma^2 + 1 / tau^2)|match|Line 116: const kappa = (n / sigmaSquared) / (n / sigmaSquared + 1 / tauSquared)
post_04|10-game rolling window plus EWMA with one-third preseason-prior shrink in Weeks 1-4|match|computeRollingAndEwmaEpa lines 156-168: window=10 default, alpha in [0.15,0.25], priorWeight=1/3 for week<=4
post_04|Logistic win model over opponent-adjusted EWMA trenches with dynamic HFA|match|predictGameWinLogisticEwma lines 188-199: offenseEdge+defenseEdge adjusted by pointsPerEpa plus hfaPoints
post_04|HFA decomposition across pre-2019, 2020, and post-2021 attendance regimes|match|evaluateDynamicHomeFieldAdvantage lines 230-258: three regimes with base values 2.6, 0.4, 2.1
post_04|Log-odds pool of FPI, Elo, and de-vigged market|match|blendEspnFpiAnd538EloPredictions lines 279-301: log-odds pooling with normalized weights
post_09|Dynamic window EWMA: span=10 before week 10, span=week after week 10|not-implemented|TS uses fixed window=10 and alpha in [0.15,0.25]; no dynamic span based on week number
post_09|8 features: home/away passing/rushing offense/defense EPA/play|not-implemented|TS has 4 TeamMetric types but predictGameWinLogisticEwma takes single offense/defense EWMA, not 8 split features
post_09|Lag EPA one period back, then exponential moving average|partial|computeRollingAndEwmaEpa implements EWMA but lag logic is caller responsibility; no explicit lag in function
post_09|Logistic Regression model for home team win probability|match|predictGameWinLogisticEwma implements logistic win probability via sigmoid(z) with adjustedMargin
post_09|Model accuracy ~63.5% on 2020 test set|unverifiable|No evaluation/test code in TS; accuracy claim not verifiable from implementation
post_09|Dynamic window slightly better than static 10-game window|unverifiable|No comparison logic in TS; post finding not reflected in code
post_11|League HFA ~2.85 points during 2006-2020|mismatch|TS regime bases: pre-2019=2.6, 2020=0.4, post-2021=2.1; no single 2.85 value
post_11|Team-specific HFA (iHFA) as random slope (0+home|team)|not-implemented|TS has no team-specific random effects; HFA is regime-based with adjustments only
post_11|LHFA fluid and cyclical, shrinking since 2017|partial|TS has regime changes (pre-2019, 2020, post-2021) but no cyclical/time-series model
post_11|2018 had significant iHFA; 2019 and 2020 did not (all teams same HFA: -0.7, 0.4)|mismatch|TS 2020 regime=0.4 matches, but pre-2019=2.6 not -0.7; no 2018-specific value
post_11|Controls for team strength, opponent, QB play, head coach|not-implemented|evaluateDynamicHomeFieldAdvantage takes only regime, timeZonesCrossed, altitude, surface, referee bias
post_11|Future: HFA benefits offense/defense differently, rest time, distance, elevation, divisional opponent|not-implemented|These are post's future research items; not implemented in TS
post_12|Lagging moving average compares team performance against opponent up to that point|match|computeRollingAndEwmaEpa takes historical values array; caller handles lagging
post_12|Weight EPA by number of plays in each game of the window|not-implemented|TS uses simple mean(values.slice(-window)); no play-count weighting
post_12|Dynamic window: 10 to 20 games (up to Super Bowl)|mismatch|TS uses fixed window=10 default; no dynamic expansion to 20 games
post_12|10-game window as prior for new seasons (like FO weighted DVOA)|partial|preseasonPrior parameter serves as prior but not explicit 10-game prior calculation
post_12|Exponential moving average best for offensive EPA (passing)|match|computeRollingAndEwmaEpa implements EWMA with configurable alpha in [0.15,0.25]
post_12|Running moving average best for rushing offense/defense|not-implemented|TS only implements EWMA; no running/simple/weighted average options
post_12|Mixed moving average types for different predictors|not-implemented|TS uses single EWMA approach; no per-metric moving average type selection