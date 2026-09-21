# [0241] Goal scoring in Premier League with Poisson regression (arXiv:2108.05796v1)

**Citation:** Lê, T.T., & Phạm, T.C. (2021). *Goal scoring in Premier League with Poisson regression*. arXiv:2108.05796v1. URL: https://arxiv.org/abs/2108.05796
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 831 lines).
**Verdict:** REJECT — graduate-coursework-quality analysis (explicitly a "Bài tập lớn môn Mô hình hóa Thống kê" / big assignment for a Statistical Modeling course), not research: a textbook Poisson GLM with exhaustive subset search, in-sample AIC selection only, no out-of-sample validation, and post-hoc features (shots on target, corners — known only after the match) that make it non-deployable as a prediction model. Nothing GSE doesn't already have.

## 1. Research question
Do home-team goals in the Premier League follow a Poisson distribution, and is there a relationship between home goals and explanatory variables such as red/yellow cards, corners, shots on target, and team identity (strong vs weak teams)? The paper also aims to demonstrate a complete GLM workflow: distribution checking → variable selection → model diagnostics.

## 2. Dataset / schema
- **Source:** football-data.co.uk (public), all Premier League matches from 2000/2001 to 2020/2021 — "over 7000 matches", 43 teams (e.g., Arsenal and Manchester United with 361 matches each; small clubs like Coventry, Ipswich with 19).
- **Variables:** Date, HomeTeam, FTHG (full-time home goals — the dependent variable, max 9, min 0, mean 1.52), Attendance, Referee, HTAG (away goals in 1st half), HST (home shots on target), HHW (home woodwork hits), HC (home corners), HO (home offsides), HR (home red cards), AR (away red cards).
- **Dropped:** Attendance, HHW, HO (heavy missingness in recent years); Referee (159 levels, too many categories for ~7000 matches). Retained: Date (identifier only), HomeTeam, FTHG, HTAG, HST, HC, HR, AR. log-transform applied to HST and HC (right-skewed).
- **Access:** public, football-data.co.uk/englandm.php.

## 3. Method / model
1. **Distribution check:** chi-square goodness-of-fit test of pooled FTHG vs Poisson(mean 1.52); H₀ (Poisson) REJECTED at 5% (p < 0.05) for the pooled data. Re-tested per-team; teams with too few matches (e.g., Cardiff) or too many goals (e.g., Man City) excluded; remaining teams' goals deemed Poisson-compatible (Fig. 10).
2. **Exhaustive subset GLM search:** all 2⁶−1 = 63 non-empty subsets of the 6 explanatory variables {HTAG, logHST, logHC, HR, AR, HomeTeam}, fit via statsmodels `smf.glm` with `family=sm.families.Poisson()` (log link).
3. **Goodness-of-fit filter:** p = 1 − stats.chi2.cdf(deviance, df_resid) with H₀ = "model does not fit"; models with p < 0.05 discarded → 31 surviving models.
4. **AIC selection:** best model [1]: FTHG ~ HTAG + logHST + logHC + HR + AR + HomeTeam (lowest AIC).
5. **Diagnostics:** Pearson residuals vs fitted, Q-Q plot (mostly normal), standardized residuals vs leverage; 6 observations flagged (3962, 4251, 2857, 5055, 1880, 2322) and removed — coefficients barely changed, confirming no influential outliers.

## 4. Equations & assumptions
- GLM Poisson regression (log link): log(E[FTHG]) = β₀ + β₁·HTAG + β₂·logHST + β₃·logHC + β₄·HR + β₅·AR + Σ_team β_team·1{HomeTeam=team}. (Stated in prose/model formula; no formal equation block in the paper.)
- Goodness-of-fit p-value: 1 − stats.chi2.cdf(row["deviance"], row["df_resid"]) — chi-square approximation of deviance.
- AIC: described in prose as using the number of explanatory variables k and the log-likelihood ("AIC càng nhỏ thì mô hình càng phù hợp" — smaller AIC = better).
**Assumptions (mostly unstated):** goals conditionally Poisson given covariates; independence across matches (no time/season structure; 2000–2021 pooled, ignoring tactical eras); log-transform fixes skew (ad hoc); per-team Poisson compatibility after cherry-picking teams; the chi-square deviance test's asymptotics hold; HomeTeam dummy coefficients are stable team-strength proxies.

## 5. Features / target
Target: FTHG (home goals, full-time). Features in final model: HTAG (away 1st-half goals), logHST (log home shots on target), logHC (log home corners), HR (home red cards), AR (away red cards), HomeTeam (categorical team dummy, reference team unspecified in extract). All features are POST-HOC match statistics — only knowable after the match — so the model cannot predict pre-match; it is descriptive, not predictive. No prediction horizon stated.

## 6. Validation design
No train/test split. No cross-validation. No out-of-sample evaluation of any kind. Selection is purely in-sample: deviance-based chi-square goodness-of-fit filter + AIC ranking on the same >7000-match dataset used for fitting. Diagnostics are residual plots only. The chi-square distribution test is also in-sample on the same data.

## 7. Numerical results / baselines
- **Pooled Poisson test:** p < 0.05 → reject Poisson for pooled FTHG (mean 1.52).
- **Best model [1] (Table 2, row 0):** deviance 5622.496, pearson_chi2 4710.341455, llf −8472.24384, df_resid 5821, AIC 17006.4877, p_chisq 0.968193. Runner-up (drop HTAG): AIC 17007.0172, deviance 5625.025529 — i.e., HTAG adds almost nothing (ΔAIC = 0.53).
- **Coefficients (Table 4):** Intercept −0.2387 (z=−3.881); logHST 0.6947 ± 0.022, z=31.036, p≈0 (strongest driver); logHC −0.2298 ± 0.019, z=−12.265 (NEGATIVE — corners associated with fewer home goals); HR −0.1733 ± 0.048, z=−3.634; AR 0.140 ± 0.031, z=4.451 (opponent red card → more home goals); HTAG 0.0246 ± 0.015, z=1.597, p=0.11 (not significant). HomeTeam dummies (reference team not named): e.g., Chelsea −0.0013, Liverpool −0.0308, Man United −0.0041, Tottenham −0.133, Arsenal-implied; weakest: Wigan −0.5976, Portsmouth −0.5485, Sunderland −0.5156.
- **After outlier removal (Table 6):** coefficients essentially unchanged (logHST 0.6942, logHC −0.2291, HR −0.1764, AR 0.1397).
- **Paper's interpretation:** shots on target and opponent red cards are the two strongest drivers (more shots on target → more goals; opponent red → man advantage); HTAG effect ~0 (near zero); team dummies ordered by team strength.
- **Baselines compared:** none — no comparison to any existing model (not even to intercept-only Poisson or Dixon-Coles).

## 8. Code / data availability
None stated. No code links, no repository. Data source cited: football-data.co.uk (public). Software stack named: Python (numpy, pandas, itertools, stats, statsmodels, matplotlib, seaborn).

## 9. Leakage & limitations
- **Post-hoc features (fatal for prediction):** shots on target and corners are only known after the match is over — they are near-deterministic consequences of goals (multicollinearity is extreme; logHST z=31). The model is descriptive accounting, not forecasting.
- **No validation whatsoever:** in-sample AIC on the training set; 63 models searched → selection bias uncorrected; reported fit is optimistic by construction.
- **Cherry-picked Poisson justification:** the pooled chi-square test REJECTED Poisson; the authors then subset teams until the test passes — a textbook data-snooping step — yet proceed with Poisson GLM on the full data anyway.
- **The negative corner coefficient** (−0.2298, highly significant) is almost certainly a multicollinearity artifact: controlling for shots on target, extra corners = attacks that failed to produce shots. Presented as a finding without any such discussion.
- **HTAG included despite p=0.11** in the final "best" model — the AIC difference vs dropping it is 0.53, i.e., noise.
- **No time structure:** 21 seasons pooled; ignores rule changes, tactical eras, team turnover; HomeTeam dummies estimated on all data including future seasons relative to any would-be prediction point (lookahead).
- **External validity to NFL:** none — soccer goals, post-hoc features, and a student-grade workflow. The one abstract lesson (Poisson goal modeling is standard) is already in GSE's inventory.

## 10. GSE overlap
- **Duplicate and inferior:** the repo already inventories Poisson, Dixon-Coles, Skellam, Harville (existing-research-map §1). Paper 0239 in this same wave does proper bivariate count modeling; Lee (1997) / Dixon-Coles-style team-strength Poisson GLMs with attack/defense parameters are the standard the repo knows. This paper's contribution relative to that baseline is negative (post-hoc features, no attack/defense structure, no holdout).
- The DEDUP guide says papers must add something beyond already-inventoried methods. This adds nothing.

## 11. GSE implementation spec
None — REJECT verdict means no build. If the paper's one non-obvious empirical observation were to be stress-tested (negative partial correlation of corners with goals given shots on target), it would be a 2-hour nflverse check (do failed red-zone trips predict fewer TDs given total red-zone trips?) — but as a modeling artifact hunt, not a product feature. Not recommended as a standalone build.

## 12. Reproducible test
N/A (REJECT). For completeness, the paper's own claim that is testable: fit logHST/logHC Poisson GLM on football-data.co.uk 2000–2021 and verify the negative logHC coefficient — but this only reproduces a coursework artifact.

## 13. Acceptance / rejection gate
REJECT, decided on read: (1) coursework, not research — no novel method, no theorem, no new empirical fact; (2) zero out-of-sample validation, so no claim can be trusted for production; (3) post-hoc features make it non-deployable; (4) domain (soccer goals) and method (plain Poisson GLM) are both already covered in GSE's inventory by strictly stronger sources (Dixon-Coles, Karlis & Ntzoufras, MultCOMP 0239). No gate can salvage it.

## 14. Improvement experiment
If one wanted to extract anything: replace the post-hoc features with PRE-MATCH knowable ones (team attack/defense ratings, rest, referee) and the HomeTeam dummies with a proper Dixon-Coles attack/defense parameterization, then evaluate out-of-sample log-loss on exact scores vs the paper's in-sample GLM — but that experiment is just "do Dixon-Coles properly," which GSE's corpus already describes. No follow-up specific to this paper is warranted.
