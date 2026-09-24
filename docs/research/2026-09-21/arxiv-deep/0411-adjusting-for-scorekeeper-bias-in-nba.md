# [0411] Adjusting for Scorekeeper Bias in NBA Box Scores (arXiv:1602.08754v2)

**Citation:** Matthew van Bommel and Luke Bornn (2016). *Adjusting for Scorekeeper Bias in NBA Box Scores*. arXiv:1602.08754v2. URL: https://arxiv.org/abs/1602.08754v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1747 lines).
**Verdict:** ADAPT — port the scorekeeper/crew random-effect adjustment machinery to NFL subjective charting stats (tackles, pressures, drops, assisted tackles), where stadium crew and data-provider annotation bias contaminates the inputs to GSE models.

## 1. Research question
Are subjective NBA box-score statistics (assists, blocks) systematically biased by the home team's scorekeeper, and can spatio-temporal tracking context separate genuine generosity/bias effects from the actual quality of the plays being scored?

## 2. Dataset / schema
- ESPN box scores, 2015-16 NBA regular season (team-level assist/block ratios per scorekeeper).
- STATS SportVu optical tracking for 1,227 of the 1,230 regular-season games (all teams have ≥81 of 82 games): X/Y coordinates of all 10 players plus X/Y/Z of the ball at 25 Hz, with event annotations (passes, dribbles, shots), player/team IDs, and clock times.
- Derived: 82,493 potential assists, of which 54,111 (65.59%) were recorded as assists.
- Access: SportVu tracking is proprietary (STATS LLC). The paper notes one full tracking game was released publicly via the EPVDemo GitHub repository.

## 3. Method / model
- Part 1 (team level): model each team's assist ratio (AR) and block ratio (BR) as a function of home/away, team, opponent, and scorekeeper generosity (β_G) and bias (β_B) coefficients; predicted ratios PR_{H_s}, PR_{A_s} per scorekeeper s for home/away.
- Part 2 (pass level, "contextual model"): L2-regularized logistic regression predicting whether a potential assist is recorded as an assist. Covariates: team, opponent, and scorekeeper indicators; passer identity; passer position; possession duration; dribbles; shooter travel distance; pass distance; nearest-defender distance for passer and shooter; passer/shooter court zones plus their interaction.
- Regularization λ selected by 100-fold cross-validation; model evaluated by 10-fold cross-validation.

## 4. Equations & assumptions
- Potential assist (label definition): a completed pass from passer to shooter who scores a field goal within seven seconds of receiving the pass, maintaining possession throughout (no rebounds, turnovers, or additional passes). Inbounds passes excluded for simplicity.
- Team-level model (as extracted): R_i modeled with intercept β0 plus home indicator (H_i β_H), team (T_i β_T), opponent (O_i β_O), and scorekeeper generosity/bias terms (S_i β_G, S'_i β_B); scaled β_G values are differences between league average and away-team predicted ratios; scaled β_B values obtained by subtracting away-team predicted ratios from home-team predicted ratios.
- Contextual model: L2-penalized logistic regression, log-odds of recorded assist = linear function of the covariates in §3.
- Assumptions: (a) scorekeeper effects are additive and constant within a season; (b) the contextual covariates capture all legitimate determinants of assist attribution, so residual scorekeeper effects are bias rather than unmeasured play quality; (c) a single common home effect for all teams.

## 5. Features / target
- Target: binary — was a potential assist recorded as an assist?
- Exact contextual features: team/opponent/scorekeeper indicators, passer, passer position, possession duration, number of dribbles, shooter travel distance, pass distance, nearest-defender distance (passer at release, shooter at catch), passer zone, shooter zone, passer×shooter zone interaction.

## 6. Validation design
- 100-fold CV to select the L2 penalty λ; 10-fold CV to evaluate out-of-sample mean log-likelihood and misclassification rate.
- Compared: full contextual model, model without scorekeeper covariates, model without contextual covariates ("Model 1"), intercept-only model.
- Team-level models evaluated by R² of AR/BR regressions. Splits are cross-validated folds, not chronological.

## 7. Numerical results / baselines
- 10-fold CV (mean log-likelihood / misclassification): full contextual model −0.176 / 0.066; no-scorekeeper model −0.182 / 0.070; no-context Model 1 −0.638 / 0.344; intercept-only −0.644 / 0.344 (paper's numbers — "the previous best practice had little to no improvement over simply using an intercept model").
- Team-level AR/BR regressions: R² = 0.279 and 0.228 respectively.
- Correlation of scorekeeper coefficients between team-level and contextual models: 0.892 for generosity, 0.597 for bias.
- Average potential assist (paper's construct): pass travels 18.21 ft, passer nearest defender 6.67 ft, shooter nearest defender 9.63 ft at catch, 1.87 dribbles, shooter travels 16.00 ft over 2.59 s; model predicts 39.23% recorded-assist probability.
- Position effect: point guards +3.76% vs centers −4.01% on recorded-assist probability — a 7.77% spread the paper flags as possible position bias.
- Scorekeeper bonus distribution means range from −3.44 (Utah Jazz home) to 2.32 (New Orleans Pelicans home); with teams averaging 22.05 assists/game over the 1,227 games, the paper calls the 5.76 assists/game spread "substantial."
- Extremes: Clippers scorekeeper most consistent (home variance 1.09, away 1.21); Houston most accurate by mean absolute distance from zero (1.06 home, 0.997 away); Pelicans most unpredictable (4.03 home, 4.54 away).

## 8. Code / data availability
No code link stated. Data: proprietary STATS SportVu; one full game released via the EPVDemo GitHub repository (URL not in extracted text).

## 9. Leakage & limitations
- The paper itself flags the central confound: the scorekeeper effect is identified only when the team is home, with a single common home effect — so "scorekeeper bias" may actually be a team-specific home effect (e.g., teams attempt different-quality passes at home).
- The position-bias finding (PG +3.76% vs C −4.01%) is equally consistent with unmeasured pass quality as with scorer prejudice; the model cannot distinguish.
- One season only; scorekeeper assignments and tendencies may not be stable across seasons.
- Cross-validation folds are random, not chronological — no test of forward stability.
- SportVu proprietary; the contextual model cannot be replicated on public data.
- External validity to NFL: the annotation-bias mechanism transfers directly (charting crews, stadium stat crews), but the specific covariates do not.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's computed NFL corpus covers EPA/play, success rate, QB aggressiveness, rush/pressure, unit matchups, and special teams, and the map inventories charting-data sources — but nothing in the corpus adjusts subjective charting/stats-crew inputs for annotator bias. The map's methods list (Bradley–Terry, Poisson/Dixon–Coles, state-space, calibration) has no annotator-effect component. This is a **new capability**: crew/stadium/provider random-effect debiasing of tackles, pressures, drops, and assisted tackles before they enter GSE models.

## 11. GSE implementation spec
- Data: nflverse play-by-play 2019–2025 + FTN (or equivalent) charting with stadium/game identifiers; subjective labels: solo/assisted tackles, pressures/hits, drops, broken tackles.
- Feature engineering: replicate the paper's "potential" construct — e.g., potential pressure = pass-rush snap with defender within X yards of QB at throw; potential drop = catchable target per charting.
- Model: hierarchical logistic regression — P(credited | potential) = logit⁻¹(context features + crew/stadium random effects); context features: score, down, distance, field position, player position, defender proximity.
- Training: fit on 2019–2023, validate on 2024–2025; estimate variance components for crew/stadium/provider.
- Serving: produce debiased stat adjustments (e.g., crew-adjusted pressure rate) as upstream features for GSE's EPA and prop models.
- Estimated effort: 2 weeks for a single engineer.

## 12. Reproducible test
- Dataset: charted solo/assisted tackles and pressures, 2022–2024 seasons (train 2022–23, test 2024), with stadium and crew identifiers.
- Metric: out-of-sample log-loss on P(credited | potential tackle/pressure opportunity).
- Baseline to beat: the same logistic model without crew/stadium random effects (the paper's "no-scorekeeper" ablation).

## 13. Acceptance / rejection gate
ADOPT crew/stadium debiasing as a GSE preprocessing layer IF the random-effect model improves held-out log-loss by ≥ 1% over the no-crew baseline AND the crew variance component is significant by likelihood-ratio test (p < 0.05) on the 2024 test season; otherwise REJECT as noise. Gate fixed before running.

## 14. Improvement experiment
Extend the same machinery to referee crews and penalty rates — the paper models scorekeepers, but NFL officiating crews are the higher-leverage annotator: estimate crew random effects on holding/PI call probability conditional on game context. Test whether crew-adjusted penalty expectation improves drive-outcome models; this goes beyond the paper by applying annotator-effect modeling to a domain where the bias directly moves betting markets.
