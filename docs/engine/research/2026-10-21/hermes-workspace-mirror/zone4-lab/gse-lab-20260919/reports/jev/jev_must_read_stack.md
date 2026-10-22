# JEV must-read stack - 25 papers, ordered

Order: (1-3) mu-defining, (4-9) UQ GSE can wire next, (10-14) online/shift, (15-18) props/margins, (19-22) calibration/display, (23-25) doctrine-support. Each: the GSE sentence it changes.

1. **1905.02928** Predictive inference with the jackknife+ (2019)
   - Gives walk-forward-valid UQ at n~150 without a single fixed split - the coverage claim GSE makes publicly becomes defensible.
2. **2503.01495** Improving the statistical efficiency of cross-conformal prediction (2025)
   - If cross-conformal is now efficient enough, GSE can use all settled rows per window instead of burning 20% on one calibration split.
3. **1904.06019** Conformal Prediction Under Covariate Shift (2019)
   - The exact tool for Mondrian bins under QB-change/rest shift - reweight calibration rows by likelihood ratio per bin.
4. **2202.13415** Conformal prediction beyond exchangeability (2022)
   - The license to stop pretending weekly picks are exchangeable - weighted-quantile conformal for ordered weeks.
5. **2212.03463** Sequential Predictive Conformal Inference for Time Series (2022)
   - Exploits residual autocorrelation - GSE scores ARE autocorrelated week to week; could tighten bands today.
6. **2106.00170** Adaptive Conformal Inference Under Distribution Shift (2021)
   - Online alpha-updates for an 18-step season; the weekly refresh story for Mondrian bins.
7. **2208.02814** Conformal Risk Control (2022)
   - Reframes 'coverage' as 'controlled expected loss' - matches how GSE should bound CLV shortfall.
8. **2306.02732** Conformal Prediction with Missing Values (2023)
   - Weather/books/QB data is missing weekly; validity under missingness beats fail-closed dropping.
9. **1707.03307** Fast calibrated additive quantile regression (2017)
   - Calibrated additive quantile regression = the props tail machine (NB2-compatible, smooth in week).
10. **1905.03222** Conformalized Quantile Regression (2019)
   - CQR is the reference quantile-conformal any GSE implementation must be benchmarked against.
11. **1211.0025** Venn-Abers predictors (2012)
   - Venn-Abers gives honest probability INTERVALS for trueProb display - distinct from the banned inverted-confidence move.
12. **1710.02824** Beating the bookies with their own numbers - and how the online sports betting market is rigged (2017)
   - Proof that odds-alone signals carried exploitable structure - the strongest published rival to mu=market-close.
13. **2608.11505** Does a Structural Model Add Anything to the Closing Price? Calibrated forecasting, incremental information, and match leverage in the Italian Serie A (2026)
   - Asks GSE's exact mu question in a journal: does structure add anything past the close? Read before touching mu.
14. **1211.4000** The Performance of Betting Lines for Predicting the Outcome of NFL Games (2012)
   - The NFL closing-line baseline dataset and era effects GSE's mu comparisons must respect.
15. **2306.01740** Not feeling the buzz: Correction study of mispricing and inefficiency in online sportsbooks (2023)
   - How one selection effect fakes betting profits - the audit GSE's own CLV/track-record claims need.
16. **2607.14430** Prices, Probabilities, and Parlays: Systematic Bias in Sports Prediction Markets (2026)
   - Quantified parlay overpricing vs product-of-legs - the props-lane pricing edge, if it survives fees.
17. **2609.07251** Adaptive Conformal Inference Under Delayed Feedback: Coverage Guarantees and a Delay-to-Memory Diagnostic (2026)
   - Settlement delay IS delayed feedback; ACI under delay is the honest weekly-refresh model.
18. **1002.0797** Soccer: is scoring goals a predictable Poissonian process? (2010)
   - Direct test of the Poisson goal process - the evidence behind 'Poisson dead for TDs' style kills.
19. **1807.07536** A Skellam Regression Model for Quantifying Positional Value in Soccer (2018)
   - Skellam margin framework done right - template for an NFL re-derivation (port banned, re-derivation allowed).
20. **2604.01491** Opponent-Adjusted Evaluation of NFL Pass Blocking and Pass Rushing Performance (2026)
   - Opponent-adjusted pass-blocking/rushing - independent derivation of GSE's pressure-matchup lane.
21. **2003.02743** A Generalization of the Classical Kelly Betting Formula to the Case of Temporal Correlation (2020)
   - Kelly under correlation - slate correlation is real; staking math must not assume iid legs.
22. **2203.15885** Split Conformal Prediction and Non-Exchangeable Data (2022)
   - Practical split-conformal for non-exchangeable data - companion implementation to 2202.13415.
23. **2410.09180** Convergence and stationary distribution of Elo rating systems (2024)
   - GSE's engine core is Elo; convergence/stationarity properties bound what weekly updates can claim.
24. **1810.03383** Illusion of persistence in NBA 1995-2018 regular season data (2018)
   - Streak/persistence is mostly luck in NBA - supports the GSE luck-layer doctrine with public data.
25. **0706.3188** A tutorial on conformal prediction (2007)
   - The canonical conformal tutorial - the onboarding document for every UQ change at GSE.
