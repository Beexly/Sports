post_02|Post ranks WRs by targeted air yards within team/year to identify WR1|mismatch|Code takes wr1Targets/teamPassAttempts as pre-computed inputs; no air-yards ranking logic
post_02|Post creates binary WR1 indicator (index==1) and groups by defense to get mean EPA allowed|mismatch|Code computes observedTargetShare=wr1Targets/teamPassAttempts then applies empirical-Bayes shrinkage; no binary indicator or raw mean EPA per defense
post_02|Post compares EPA allowed to WR1 vs all other WRs|mismatch|Code computes suppressionIndex=leagueEpa-shrunkEpa and funnelMultiplier for WR2/3/TE redistribution; no direct WR1-vs-others comparison
post_02|Post suggests extending to account for receiver quality faced|not-implemented|Code uses league-wide variance parameters; no opponent-quality adjustment
post_02|Post suggests stability analysis to see if measures are more stable than regular defense|not-implemented|Code returns single-game suppressionIndex/funnelMultiplier; no cross-season stability calculation
post_02|Post uses total yards for historical analysis (pre-1999 targeted air yards unavailable)|not-implemented|Code requires all inputs as arguments; no historical fallback logic

post_10|Coverage penalties (DPI) repeat at r≈0.08 (highly unstable)|match|Code defaults coverageReliability=0.08 per post provenance note
post_10|Pre-snap/procedural penalties (False Start, Delay of Game) repeat at r≈0.35|match|Code defaults proceduralReliability=0.35 per post provenance note
post_10|Offenses control penalty rates more than defenses|match|Code assigns higher reliability (0.35) to procedural (offense) vs coverage (defense, 0.08)
post_10|Penalty EPA methodology: penalty_epa = no-penalty EPA - observed EPA|not-implemented|Code only shrinks observed rates toward league means; no penalty_epa/no_penalty_epa calculation
post_10|Using only stable penalties with observed EPA and penalty-free EPA for others improves prediction|not-implemented|Code returns shrunkCoverageEpa/shrunkProceduralRate; no predictive model or dynamic window
post_10|Quarter-season (4-game) correlation windows used for stability measurement|not-implemented|Code uses fixed reliability constants; no rolling-window correlation logic

post_16|xgboost model with 8 features (down, ydstogo, yardline_100, score_differential, qtr, half_seconds_remaining, off_to, def_to)|mismatch|Code uses logistic regression with 6 coefficients (intercept, down, distance, yardline100, scoreDifferential, halfSecondsRemaining); missing qtr, timeouts
post_16|Multilevel Stan model with team random effects (gamma_t) for team tendencies|not-implemented|Code has no team effects; coefficients are fixed inputs, not fit per team
post_16|Model achieves 69% accuracy and 0.76 AUC on test data|unverifiable|Code does not evaluate or report accuracy/AUC; only computes xPass from supplied coefficients
post_16|logit(p) = alpha + gamma_t + beta_1*p_hat + beta*X_i formulation|mismatch|Code uses simple linear predictor z = intercept + sum(coef*feature); no team random effect or p_hat term
post_16|Team effect SD sigma_mu ≈ 0.18 (log-odds scale)|not-implemented|Code has no team-level parameters or variance components
post_16|Predicted pass probabilities used as input to second-stage model|not-implemented|Code computes xPass directly from raw features; no two-stage modeling

post_18|Uses actual minutes between defensive drives from nflfastR snap timestamps|mismatch|Code uses restDaysDifferential (days between games), not within-game drive rest minutes
post_18|Controls for field position via expected points at yardline + half seconds remaining|partial|Code controls via intrinsicEpaPerDrive (team-level) and restSlope*restDaysDifferential; no yardline or half-seconds parameters
post_18|Finds weakly positive relationship between rest time and points over expected (near zero)|match|Code implements regression framework where restSlope can be near zero; post's finding aligns with configurable slope
post_18|Removes 11 games with clock errors/delays from 2015-2019 data|not-implemented|Code is a stateless function; no data cleaning or game exclusion logic
post_18|~30,000 drives analyzed across 5 seasons|unverifiable|Code operates on single drive inputs; no sample size or season scope in function
post_18|Concludes field position is primary driver, rest time secondary|match|Code's intrinsicEpaPerDrive captures team/field-position baseline; rest effect is additive slope term