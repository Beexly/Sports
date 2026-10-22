# JEV arXiv dossiers - KEEP/MEASURE

[OBSERVATION] All papers below exist on arXiv (IDs from API). [INFERENCE] Contribution/assumption lines are abstract-level judgments (full-text PDFs NOT opened this pass; PDF links in index). [SPECULATION] marked where present. Panel verdicts from jev-classify-panel (39-model fusion, non-reasoning judge).

Guardrail note: per-batch classification runs were ALL flagged (unsupported 0.57-0.91) because verdict lists contain years/IDs - the strict unsupported-number question cannot pass a bibliography by construction. The dossier PROSE below was guarded separately (see audit log, dossier entries).

## 0706.3188 - A tutorial on conformal prediction (2007)
- authors: Glenn Shafer; Vladimir Vovk
- bucket: KEEP (reference) | panel verdict: not-in-batch | already_in_gse: no
- contribution: Conformal prediction tutorial (Vovk et al) - the onboarding doc for any conformal work at GSE. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: n/a
- what it changes at GSE: ops: onboarding/theory reference.
- kill line: n/a
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/0706.3188

## 0708.1503 - Defensive forecasting for optimal prediction with expert advice (2007)
- authors: Vladimir Vovk
- bucket: KEEP (aggregation) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Defensive forecasting with expert advice (Vovk) - produce calibrated probabilities from ANY expert by defending against it; maps to pool-of-books / pool-of-models mu. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Expert-quality drift on an 18-step season is hard to track; bounds need many rounds.
- what it changes at GSE: mu: alternative to fixed Elo/market blend - exploratory only, walk-forward tested.
- kill line: Kill if defensive forecast equals market close (no residual signal).
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/0708.1503

## 0803.0614 - Fitness, chance, and myths: an objective view on soccer results (2008)
- authors: Andreas Heuer; Oliver Rubner
- bucket: MEASURE (sport-model) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Fitness, chance, and myths in soccer results - goal-process assumptions audited. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if double-counts ranking quality.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/0803.0614

## 1002.0797 - Soccer: is scoring goals a predictable Poissonian process? (2010)
- authors: Andreas Heuer; Christian Mueller; Oliver Rubner
- bucket: MEASURE (sport-model) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Is scoring goals a Poissonian process? - direct evidence on the Poisson assumption GSE killed for TD props. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if tests lack power at match-level n.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1002.0797

## 1208.0806 - Cross-conformal predictors (2012)
- authors: Vladimir Vovk
- bucket: KEEP (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Original cross-conformal predictors (Vovk); baseline the 2503.01495 efficiency claim must beat. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Same as above.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/1208.0806

## 1211.0025 - Venn-Abers predictors (2012)
- authors: Vladimir Vovk; Ivan Petej
- bucket: KEEP (calibration) | panel verdict: KEEP | already_in_gse: no
- contribution: Venn-Abers predictors - distribution-free calibrated probabilities. NOTE: does NOT touch the banned inverted-confidence fix; it is honest calibration, not confidence reinterpretation. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if Venn-Abers interval width unusable for pick display.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1211.0025

## 1211.4000 - The Performance of Betting Lines for Predicting the Outcome of NFL Games (2012)
- authors: Greg Szalkowski; Michael L. Nelson
- bucket: MEASURE (market-microstructure) | panel verdict: KEEP | already_in_gse: no
- contribution: NFL betting lines 2002-2011 performance - the closing-line baseline GSE mu must tie to. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if line-performance era effects invalidate 2026 extrapolation.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1211.4000

## 1303.6182 - Variance estimation for Brier Score decomposition (2013)
- authors: Stefan Siegert
- bucket: MEASURE (calibration) | panel verdict: KEEP | already_in_gse: no
- contribution: Variance estimation for Brier decomposition - GSE reports Brier floors; error bars are missing. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if delta-method variance misfits correlated picks (games per slate).
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1303.6182

## 1403.7642 - The Sensitivity of College Football Rankings to Several Modeling Choices (2014)
- authors: Andrew T. Karl
- bucket: MEASURE (sport-model) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Sensitivity of college football rankings to modeling choices - NCAAF model-choice fragility evidence. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if ranking-specific, not predictive.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1403.7642

## 1601.04302 - Footballonomics: The Anatomy of American Football; Evidence from 7 years of NFL game data (2016)
- authors: Konstantinos Pelechrinis; Evangelos Papalexakis
- bucket: MEASURE (sport-model) | panel verdict: MEASURE | already_in_gse: no
- contribution: Footballonomics: anatomy of American football from 7 years of NFL data - descriptive baselines. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if purely descriptive.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1601.04302

## 1604.03614 - The Market for English Premier League (EPL) Odds (2016)
- authors: Guanhao Feng; Nicholas G. Polson; Jianeng Xu
- bucket: MEASURE (market-microstructure) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: EPL odds market structure - bookmaker margin mechanics. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if soccer-only margin structure not portable to NFL books.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1604.03614

## 1710.01786 - Kelly Betting Can Be Too Conservative (2017)
- authors: Chung-Han Hsieh; B. Ross Barmish; John A. Gubner
- bucket: MEASURE (staking-ops) | panel verdict: KEEP | already_in_gse: no
- contribution: Kelly can be too conservative - shrinkage direction of staking. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Correlated slates break iid Kelly assumptions; correlation per slate is weakly estimable.
- what it changes at GSE: ops: staking/bet-sizing suggestions only; never published as picks; MODEL_VERSION untouched.
- kill line: Kill if wrong for GSE fee structure.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1710.01786

## 1710.02824 - Beating the bookies with their own numbers - and how the online sports betting market is rigged (2017)
- authors: Lisandro Kaunitz; Shenjun Zhong; Javier Kreiner
- bucket: KEEP (market-microstructure) | panel verdict: MEASURE | already_in_gse: no
- contribution: Beating the bookies with their own numbers - odds-only arbitrage-style signal; direct mu-competition evidence that odds alone carry exploitable structure. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if their returns die out-of-sample post-publication.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1710.02824

## 1710.05284 - Multivariate Generalized Linear Mixed Models for Joint Estimation of Sporting Outcomes (2017)
- authors: Jennifer E. Broatch; Andrew T. Karl
- bucket: MEASURE (sport-model) | panel verdict: MEASURE | already_in_gse: no
- contribution: Multivariate GLMM joint estimation of outcomes - joint spread/total/ML structure. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if joint fit unstable on 32-team weekly panels.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1710.05284

## 1807.07536 - A Skellam Regression Model for Quantifying Positional Value in Soccer (2018)
- authors: Konstantinos Pelechrinis; Wayne Winston
- bucket: MEASURE (sport-model) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Skellam regression for positional value (soccer) - Skellam margin framework (NFL margin use stays banned-port until re-derived on NFL data). [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill line: NOT a license to port soccer tau; NFL re-derivation only.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1807.07536

## 1810.03383 - Illusion of persistence in NBA 1995-2018 regular season data (2018)
- authors: Aleksejus Kononovicius
- bucket: MEASURE (sport-model) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Illusion of persistence in NBA 1995-2018 - streak/persistence is largely luck; supports GSE luck-regression doctrine. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if NBA-specific persistence does not transfer to NFL.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/1810.03383

## 1902.06579 - Conformal calibrators (2019)
- authors: Vladimir Vovk; Ivan Petej; Paolo Toccaceli; Alex Gammerman
- bucket: KEEP (UQ-conformal) | panel verdict: KEEP | already_in_gse: no
- contribution: Conformal calibrators: post-hoc score calibration layer - slots above Mondrian binning, not instead of it. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if it degrades bin-level (Mondrian) coverage in backtest.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/1902.06579

## 1904.06019 - Conformal Prediction Under Covariate Shift (2019)
- authors: Ryan J. Tibshirani; Rina Foygel Barber; Emmanuel J. Candes; Aaditya Ramdas
- bucket: KEEP (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: Conformal prediction under covariate shift (Tibshirani et al) - likelihood ratios weight the QB-change / rest strata. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if density-ratio estimation unstable at weekly n.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/1904.06019

## 1905.02928 - Predictive inference with the jackknife+ (2019)
- authors: Rina Foygel Barber; Emmanuel J. Candes; Aaditya Ramdas; Ryan J. Tibshirani
- bucket: KEEP (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Held-out-fold ensemble validity; drops the single-split variance problem for n~150 walk-forward windows. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if coverage on NFL W1-18 walk-forward misses 90-95% band at n>=150.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/1905.02928

## 1905.03222 - Conformalized Quantile Regression (2019)
- authors: Yaniv Romano; Evan Patterson; Emmanuel J. Candès
- bucket: MEASURE (UQ-conformal) | panel verdict: KEEP | already_in_gse: no
- contribution: CQR (Romano Patterson Candès) - the quantile-based conformal; pairs with qgam tails. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if CQR < Gaussian-close CRPS improvement 0.01 bar.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/1905.03222

## 2003.02743 - A Generalization of the Classical Kelly Betting Formula to the Case of Temporal Correlation (2020)
- authors: Joseph D. O'Brien; Kevin Burke; Mark E. Burke; B. Ross Barmish
- bucket: MEASURE (staking-ops) | panel verdict: KILL-COUSIN | already_in_gse: no
- contribution: Kelly generalization under temporal correlation - correlated parlays/slates break iid Kelly. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Correlated slates break iid Kelly assumptions; correlation per slate is weakly estimable.
- what it changes at GSE: ops: staking/bet-sizing suggestions only; never published as picks; MODEL_VERSION untouched.
- kill line: Kill if correlation estimates unstable per slate.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2003.02743

## 2003.09384 - Investigating the efficiency of the Asian handicap football betting market with ratings and Bayesian networks (2020)
- authors: Anthony Constantinou
- bucket: MEASURE (market-microstructure) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Asian handicap efficiency with ratings and Bayesian ML - handicap efficiency vs model ratings. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if AH-specific findings do not map to NFL spread.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2003.09384

## 2103.00627 - Multi Split Conformal Prediction (2021)
- authors: Aldo Solari; Vera Djordjilović
- bucket: MEASURE (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Multi split conformal - variance reduction via multiple splits, directly relevant at n~150. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if compute/latency not worth coverage delta.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2103.00627

## 2105.08747 - Conformal Prediction using Conditional Histograms (2021)
- authors: Matteo Sesia; Yaniv Romano
- bucket: MEASURE (UQ-conformal) | panel verdict: KEEP | already_in_gse: no
- contribution: Conditional histograms as nonconformity - matches per-bin margin distributions. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if histogram binning underperforms Mondrian q-hats on 2025 settled rows.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2105.08747

## 2106.00170 - Adaptive Conformal Inference Under Distribution Shift (2021)
- authors: Isaac Gibbs; Emmanuel Candès
- bucket: KEEP (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: Gibbs & Candes ACI - online alpha-update under shift; the season IS the shift. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if alpha oscillates on weekly season cadence (only 18 steps).
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2106.00170

## 2107.07511 - A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification (2021)
- authors: Anastasios N. Angelopoulos; Stephen Bates
- bucket: KEEP (reference) | panel verdict: not-in-batch | already_in_gse: no
- contribution: Gentle introduction to conformal prediction and distribution-free UQ - staff onboarding. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: n/a
- what it changes at GSE: ops: onboarding/theory reference.
- kill line: n/a
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2107.07511

## 2107.08827 - Optimal sports betting strategies in practice: an experimental review (2021)
- authors: Matej Uhrín; Gustav Šourek; Ondřej Hubáček; Filip Železný
- bucket: MEASURE (staking-ops) | panel verdict: KEEP | already_in_gse: no
- contribution: Optimal sports betting strategies: an experimental review - benchmark review; use as map, not method. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Correlated slates break iid Kelly assumptions; correlation per slate is weakly estimable.
- what it changes at GSE: ops: staking/bet-sizing suggestions only; never published as picks; MODEL_VERSION untouched.
- kill line: Kill if nothing beyond known Kelly/flat discussion.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2107.08827

## 2109.07581 - The Impact of COVID-19 on Sports Betting Markets (2021)
- authors: Khizar Qureshi; Tauhid Zaman
- bucket: MEASURE (market-microstructure) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: COVID-19 impact on sports betting markets - neutral-site, no-crowd regime. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill line: NOT a 2026 NFL license; measure only as regime-shift case study.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2109.07581

## 2109.08051 - Frame by frame completion probability of an NFL pass (2021)
- authors: Gustavo Pompeu da Silva; Rafael de Andrade Moral
- bucket: MEASURE (sport-model) | panel verdict: KEEP | already_in_gse: no
- contribution: Frame-by-frame NFL pass completion probability - props/WR-market groundwork from tracking. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if tracking data license unclear for production.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2109.08051

## 2109.12464 - Mathematical properties and finite-population correction for the Wilson score interval (2021)
- authors: Ben O'Neill
- bucket: MEASURE (calibration) | panel verdict: KEEP | already_in_gse: unknown
- contribution: Wilson interval finite-population correction - GSE bins are small samples from a finite slate. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if FPC immaterial at bin n.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2109.12464

## 2202.08756 - Ensemble Conformalized Quantile Regression for Probabilistic Time Series Forecasting (2022)
- authors: Vilde Jensen; Filippo Maria Bianchi; Stian Norman Anfinsen
- bucket: MEASURE (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Ensemble CQR for probabilistic time series - weekly EPA/odds panels fit this shape. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if ensemble split hurts small-n NFL windows.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2202.08756

## 2202.13415 - Conformal prediction beyond exchangeability (2022)
- authors: Rina Foygel Barber; Emmanuel J. Candes; Aaditya Ramdas; Ryan J. Tibshirani
- bucket: KEEP (UQ-online) | panel verdict: KEEP | already_in_gse: no
- contribution: Beyond exchangeability (Barber et al) - weighted quantiles for non-exchangeable weeks; NFL weeks are ordered, not iid. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if weighting scheme cannot encode weekly decay sensibly.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2202.13415

## 2203.15885 - Split Conformal Prediction and Non-Exchangeable Data (2022)
- authors: Roberto I. Oliveira; Paulo Orenstein; Thiago Ramos; João Vitor Romano
- bucket: KEEP (UQ-online) | panel verdict: KEEP | already_in_gse: no
- contribution: Split conformal + non-exchangeable data - practical companion to 2202.13415. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if coverage drop vs exchangeable baseline > width gain.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2203.15885

## 2207.02808 - Improved conformalized quantile regression (2022)
- authors: Martim Sousa; Ana Maria Tomé; José Moreira
- bucket: MEASURE (UQ-conformal) | panel verdict: KEEP | already_in_gse: no
- contribution: Improved CQR: variance-explaining features in the score - candidates: books count, rest, weather. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if no width reduction at equal coverage on settled picks.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2207.02808

## 2207.07282 - (title in index) (?)
- authors: 
- bucket: MEASURE (UQ-online) | panel verdict: not-in-batch | already_in_gse: no
- contribution: Adaptive conformal for time series - early candidate for weekly refresh. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if redundant with ACI 2106.00170 on season cadence.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2207.07282

## 2208.02814 - Conformal Risk Control (2022)
- authors: Anastasios N. Angelopoulos; Stephen Bates; Adam Fisch; Lihua Lei
- bucket: KEEP (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Conformal risk control - controls a monotone loss, e.g. expected CLV shortfall, not just coverage. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if risk notion cannot be stated as monotone in the set size.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2208.02814

## 2208.03708 - Optimal Tracking in Prediction with Expert Advice (2022)
- authors: Hakan Gokcesu; Suleyman S. Kozat
- bucket: MEASURE (aggregation) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Optimal tracking in prediction with expert advice. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Expert-quality drift on an 18-step season is hard to track; bounds need many rounds.
- what it changes at GSE: mu: alternative to fixed Elo/market blend - exploratory only, walk-forward tested.
- kill line: Kill if gains only at many-step horizons.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2208.03708

## 2208.08401 - Conformal Inference for Online Prediction with Arbitrary Distribution Shifts (2022)
- authors: Isaac Gibbs; Emmanuel Candès
- bucket: MEASURE (UQ-online) | panel verdict: KEEP | already_in_gse: no
- contribution: Conformal online with arbitrary distribution shifts - strongest shift assumptions. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if too conservative (width) on real slates.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2208.08401

## 2209.06826 - Modifying Squint for Prediction with Expert Advice in a Changing Environment (2022)
- authors: Thom Neuteboom; Tim van Erven
- bucket: MEASURE (aggregation) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Squint in changing environments - tracking experts through shift. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Expert-quality drift on an 18-step season is hard to track; bounds need many rounds.
- what it changes at GSE: mu: alternative to fixed Elo/market blend - exploratory only, walk-forward tested.
- kill line: Kill if tracking lags on weekly data.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2209.06826

## 2212.03463 - Sequential Predictive Conformal Inference for Time Series (2022)
- authors: Chen Xu; Yao Xie
- bucket: KEEP (UQ-online) | panel verdict: KEEP | already_in_gse: no
- contribution: SPCI: sequential predictive conformal for time series - uses residual autocorrelation; scores are autocorrelated across weeks. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if SPCI coverage worse than Mondrian static bins on 2025 replay.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2212.03463

## 2212.08116 - Converting College Football Point Spread Differentials to Probabilities (2022)
- authors: Ryan Sides; Jane L. Harvill
- bucket: MEASURE (sport-model) | panel verdict: MEASURE | already_in_gse: no
- contribution: Converting CFB point-spread differentials to probabilities - NCAAF conformal/convert mapping hole. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if mapping assumes normality without check.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2212.08116

## 2303.03167 - Computation of Reliability Statistics for Success-Failure Experiments (2023)
- authors: Sanjay M. Joshi
- bucket: MEASURE (calibration) | panel verdict: KEEP | already_in_gse: unknown
- contribution: Reliability statistics for success-failure experiments - exact small-n bin reliability. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if no improvement over Wilson at bin n.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2303.03167

## 2303.16648 - Beating the average: how to generate profit by exploiting the inefficiencies of soccer betting (2023)
- authors: Ralph Stömmer
- bucket: MEASURE (market-microstructure) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Exploiting soccer betting inefficiencies (beating the average). [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if edge is selection-effect artifact (cf 2306.01740).
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2303.16648

## 2306.01740 - Not feeling the buzz: Correction study of mispricing and inefficiency in online sportsbooks (2023)
- authors: Lawrence Clegg; John Cartlidge
- bucket: MEASURE (market-microstructure) | panel verdict: MEASURE | already_in_gse: no
- contribution: Correction study: mispricing/inefficiency in online sportsbooks - directly about fake profits from selection effects. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if their correction does not transfer to GSE CLV denominators.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2306.01740

## 2306.02732 - Conformal Prediction with Missing Values (2023)
- authors: Margaux Zaffran; Aymeric Dieuleveut; Julie Josse; Yaniv Romano
- bucket: KEEP (UQ-conformal) | panel verdict: KEEP | already_in_gse: no
- contribution: Conformal prediction with missing values - weather/books/QB-status gaps are routine in GSE features. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if imputation-free validity costs too much width vs fail-closed dropping.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2306.02732

## 2307.13807 - Sports Betting: an application of neural networks and modern portfolio theory to the English Premier League (2023)
- authors: Vélez Jiménez; Román Alberto; Lecuanda Ontiveros; José Manuel
- bucket: MEASURE (market-microstructure) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Neural nets + modern portfolio theory for EPL betting. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if portfolio layer is generic Markowitz without edge.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2307.13807

## 2307.16895 - Conformal PID Control for Time Series Prediction (2023)
- authors: Anastasios N. Angelopoulos; Emmanuel J. Candes; Ryan J. Tibshirani
- bucket: MEASURE (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: Conformal PID control - control-theoretic alpha updates; alternative to ACI. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if PID gains need tuning GSE cannot validate at n=18 weeks.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2307.16895

## 2309.08313 - Conditional validity of heteroskedastic conformal regression (2023)
- authors: Nicolas Dewolf; Bernard De Baets; Willem Waegeman
- bucket: KEEP (UQ-conformal) | panel verdict: KEEP | already_in_gse: no
- contribution: Heteroskedastic conditional validity - spread bins are heteroskedastic by construction. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if width blowup on underdog bins exceeds coverage gain.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2309.08313

## 2401.11974 - Cross-Validation Conformal Risk Control (2024)
- authors: Kfir M. Cohen; Sangwoo Park; Osvaldo Simeone; Shlomo Shamai
- bucket: MEASURE (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: CV version of conformal risk control - more data-efficient risk control. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Same kill as 2208.02814.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2401.11974

## 2403.03862 - An analysis of the NCAA college football playoff team selections using an Elo ratings model (2024)
- authors: Benjamin Lucas
- bucket: MEASURE (sport-model) | panel verdict: MEASURE | already_in_gse: no
- contribution: NCAA playoff selection via Elo - NCAAF Elo calibration reference. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if selection-focused not calibration.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2403.03862

## 2407.07700 - Split Conformal Prediction under Data Contamination (2024)
- authors: Jase Clarkson; Wenkai Xu; Mihai Cucuringu; Yvik Swan
- bucket: MEASURE (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Split conformal under data contamination - grading errors / mispriced stale lines are contamination. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if robustness costs >2pp width on clean subsets.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2407.07700

## 2408.01626 - Weighted Brier Score -- an Overall Summary Measure for Risk Prediction Models with Clinical Utility Consideration (2024)
- authors: Kehao Zhu; Yingye Zheng; Kwun Chuen Gary Chan
- bucket: MEASURE (calibration) | panel verdict: MEASURE | already_in_gse: no
- contribution: Weighted Brier score - category-weighted overall summary; matches per-bin reporting. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if weighting choice is arbitrary for GSE bins.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2408.01626

## 2409.14792 - Adaptive Conformal Inference for Multi-Step Ahead Time-Series Forecasting Online (2024)
- authors: Johan Hallberg Szabadváry
- bucket: MEASURE (UQ-online) | panel verdict: not-in-batch | already_in_gse: no
- contribution: Multi-step ahead online ACI - multi-step = multi-week futures. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if futures horizon too long for coverage check.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2409.14792

## 2410.09180 - Convergence and stationary distribution of Elo rating systems (2024)
- authors: Roberto Cortez; Hagop Tossounian
- bucket: MEASURE (sport-model) | panel verdict: MEASURE | already_in_gse: no
- contribution: Convergence and stationary distribution of Elo ratings - GSE engine core is Elo; convergence properties matter weekly. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if theory needs game counts GSE lacks.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2410.09180

## 2411.11824 - Theoretical Foundations of Conformal Prediction (2024)
- authors: Anastasios N. Angelopoulos; Rina Foygel Barber; Stephen Bates
- bucket: KEEP (reference) | panel verdict: not-in-batch | already_in_gse: no
- contribution: Theoretical foundations of conformal prediction - the theory compendium. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: n/a
- what it changes at GSE: ops: onboarding/theory reference.
- kill line: n/a
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2411.11824

## 2412.19318 - Adaptive Conformal Inference by Betting (2024)
- authors: Aleksandr Podkopaev; Darren Xu; Kuang-Chih Lee
- bucket: MEASURE (UQ-online) | panel verdict: KEEP | already_in_gse: no
- contribution: Adaptive conformal inference by betting - e-process alpha updates; matches anytime-valid taste. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if betting interpretation adds nothing operationally.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2412.19318

## 2502.17744 - Conformal Prediction Under Generalized Covariate Shift with Posterior Drift (2025)
- authors: Baozhen Wang; Xingye Qiao
- bucket: MEASURE (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: Generalized covariate shift with posterior drift - roster/QB changes shift p(y|x) itself. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if posterior-drift estimator needs labels GSE does not have weekly.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2502.17744

## 2502.20579 - Characterizing the Training-Conditional Coverage of Full Conformal Inference in High Dimensions (2025)
- authors: Isaac Gibbs; Emmanuel J. Candès
- bucket: MEASURE (UQ-conformal) | panel verdict: not-in-batch | already_in_gse: no
- contribution: Training-conditional coverage of full conformal in high dimensions - bounding the per-window claim. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if bounds too loose to be useful at GSE dims.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2502.20579

## 2503.01495 - Improving the statistical efficiency of cross-conformal prediction (2025)
- authors: Matteo Gasparin; Aaditya Ramdas
- bucket: KEEP (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Improves cross-conformal statistical efficiency - the reason GSE passed on cross-conformal in 2024 may no longer hold. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if efficiency gain vanishes at n=150-300 window sizes.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2503.01495

## 2505.21275 - Do Betting Markets Sense a Goal Coming? Evidence from the German Bundesliga (2025)
- authors: David Winkelmann; Christian Deutscher
- bucket: MEASURE (market-microstructure) | panel verdict: KILL-COUSIN | already_in_gse: no
- contribution: Do betting markets sense a goal coming? - in-play microstructure; out-of-play for pre-kick GSE. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if in-play only.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2505.21275

## 2507.10425 - Non-exchangeable Conformal Prediction with Optimal Transport: Tackling Distribution Shifts with Unlabeled Data (2025)
- authors: Alvaro H. C. Correia; Christos Louizos
- bucket: MEASURE (UQ-online) | panel verdict: KILL-COUSIN | already_in_gse: no
- contribution: Non-exchangeable conformal via optimal transport - OT-weights for drifted weeks. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if OT cost dominates gains; also WATCH: Wasserstein here is a tool inside conformal, not a killed signal family (labeled JUDGMENT).
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2507.10425

## 2508.05272 - Conditional validity and a fast approximation formula of full conformal prediction sets (2025)
- authors: Nicolai Amann
- bucket: MEASURE (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Fast approximation + conditional validity of full conformal - makes full conformal tractable. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if approximation error breaks distribution-free claim.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2508.05272

## 2510.15824 - Adaptive Conformal Inference through the Lens of Blackwell Approachability (2025)
- authors: Guillaume Principato; Gilles Stoltz
- bucket: MEASURE (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: ACI via Blackwell approachability - theory-grounded online guarantee. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if no practical difference vs ACI.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2510.15824

## 2602.09982 - Kelly Betting as Bayesian Model Evaluation: A Framework for Time-Updating Probabilistic Forecasts (2026)
- authors: Michael Beuoy
- bucket: MEASURE (staking-ops) | panel verdict: KEEP | already_in_gse: no
- contribution: Kelly betting as Bayesian model evaluation - time-updating probabilistic forecasts; staking as scoring. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Correlated slates break iid Kelly assumptions; correlation per slate is weakly estimable.
- what it changes at GSE: ops: staking/bet-sizing suggestions only; never published as picks; MODEL_VERSION untouched.
- kill line: Kill if framework duplicates Brier-based calibration gates.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2602.09982

## 2604.01491 - Opponent-Adjusted Evaluation of NFL Pass Blocking and Pass Rushing Performance (2026)
- authors: Jonathan Pipping-Gamón; Maximilian Gebauer; Victoria Lee; Kenny Watts
- bucket: MEASURE (sport-model) | panel verdict: KEEP | already_in_gse: no
- contribution: Opponent-adjusted NFL pass blocking / pass rush evaluation - the pressure-matchup lane, independently derived. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if opponent adjustment is schedule-strength only (no lineup context).
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2604.01491

## 2604.13253 - Bias-Corrected Adaptive Conformal Inference for Multi-Horizon Time Series Forecasting (2026)
- authors: Ankit Lade; Sai Krishna J.; Indar Kumar
- bucket: MEASURE (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: Bias-corrected ACI multi-horizon - multi-horizon = multi-market (spread/total/ML) bands. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if correction immaterial at GSE horizon counts.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2604.13253

## 2605.06541 - Hedging Memory Horizons for Non-Stationary Prediction via Online Aggregation (2026)
- authors: Yutong Wang; Yannig Goude; Qiwei Yao
- bucket: MEASURE (aggregation) | panel verdict: IRRELEVANT | already_in_gse: no
- contribution: Hedging memory horizons for non-stationary prediction - handles regime change in expert quality. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Expert-quality drift on an 18-step season is hard to track; bounds need many rounds.
- what it changes at GSE: mu: alternative to fixed Elo/market blend - exploratory only, walk-forward tested.
- kill line: Kill if horizon mix needs more history than 18 weeks.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2605.06541

## 2605.06646 - Inductive Venn-Abers and related regressors (2026)
- authors: Ivan Petej; Vladimir Vovk
- bucket: MEASURE (calibration) | panel verdict: MEASURE | already_in_gse: no
- contribution: Inductive Venn-Abers regressors - regression-shaped VA; matches trueProb calibration head. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if regression-VA worse than isotonic on settled rows.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2605.06646

## 2606.31600 - On Optimal Data Splitting for Split Conformal Prediction (2026)
- authors: Sayan Das; Bahram Yaghooti; Todd A. Kuffner; Soumendra N. Lahiri
- bucket: MEASURE (UQ-conformal) | panel verdict: MEASURE | already_in_gse: no
- contribution: Optimal train/calibration split ratio for split conformal - GSE uses arbitrary splits today. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.
- what it changes at GSE: UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change.
- kill line: Kill if optimum at n=150 is far from current split and gains are <1pp coverage.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2606.31600

## 2607.00164 - Verifiable Rewards for Calibrated Probabilistic Forecasting (2026)
- authors: Sadanand Singh; Allam Reddy; Manan Chopra
- bucket: MEASURE (calibration) | panel verdict: KEEP | already_in_gse: no
- contribution: Verifiable rewards for calibrated probabilistic forecasting - verification rewards for forecasters. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if reward design duplicates Brier floors.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2607.00164

## 2607.14430 - Prices, Probabilities, and Parlays: Systematic Bias in Sports Prediction Markets (2026)
- authors: Niusha Moshrefi
- bucket: KEEP (market-microstructure) | panel verdict: MEASURE | already_in_gse: no
- contribution: Systematic bias in sports prediction markets (Kalshi parlays overpriced vs product of legs) - prop/parlay pricing hole GSE props lane can price against. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if bias < vig after fees.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2607.14430

## 2608.11505 - Does a Structural Model Add Anything to the Closing Price? Calibrated forecasting, incremental information, and match leverage in the Italian Serie A (2026)
- authors: Yannik Pitcan
- bucket: MEASURE (market-microstructure) | panel verdict: KEEP | already_in_gse: no
- contribution: Does a structural model add anything to the closing price? - THE GSE mu question, asked in a journal. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).
- what it changes at GSE: mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE).
- kill line: Kill if answer is 'no' on their data; would confirm mu=market-close doctrine.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2608.11505

## 2609.07251 - Adaptive Conformal Inference Under Delayed Feedback: Coverage Guarantees and a Delay-to-Memory Diagnostic (2026)
- authors: Lama El Halabi; Adam Brandt
- bucket: MEASURE (UQ-online) | panel verdict: MEASURE | already_in_gse: no
- contribution: ACI under delayed feedback - settlement lag IS delayed feedback (picks settle hours-days later). [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.
- what it changes at GSE: UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward.
- kill line: Kill if delay model mismatches GSE settlement latencies.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: yes - see KILL-COUSIN rows
- pdf: https://arxiv.org/pdf/2609.07251

## 2609.10865 - The Elliptically Optimal Confidence Interval: A Bivariate Extension of Wilson's Score Method (2026)
- authors: Nawaf Mohammed
- bucket: MEASURE (calibration) | panel verdict: KEEP | already_in_gse: no
- contribution: Bivariate extension of Wilson score method - two-sided (cover+total) joint intervals. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.
- what it changes at GSE: UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder).
- kill line: Kill if joint CI overkill for current bins.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/2609.10865

## physics/0607064 - A Bayesian Mean-Value Approach with a Self-Consistently Determined Prior Distribution for the Ranking of College Football Teams (2006)
- authors: James R. Ashburn; Paul M. Colvert
- bucket: MEASURE (sport-model) | panel verdict: MEASURE | already_in_gse: no
- contribution: Bayesian mean-value ranking for college football - empirical-Bayes prior shape for NCAAF. [INFERENCE from abstract]
- assumption that breaks on an NFL schedule: Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.
- what it changes at GSE: props/mu: feature or validation candidates only after NFL re-derivation.
- kill line: Kill if prior not transferable to current era.
- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.
- cousin killed at GSE: no direct cousin
- pdf: https://arxiv.org/pdf/physics/0607064

