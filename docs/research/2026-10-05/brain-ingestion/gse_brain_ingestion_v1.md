# GSE Brain Ingestion v1 — Round 5 close + implementation plan

Status: knowledge ingest. Not a model bump.
MODEL_VERSION stays v5.2.7.
μ stays the market close until a mill beats Gaussian-close CRPS 7.109 by ≥ 0.01, n ≥ 150, walk-forward.
One invented number is sabotage. OBSERVATION / INFERENCE / SPECULATION are labeled.

This file is the brain dump the founder asked for: every named equation, every empty search, every killed family, and the order in which they may be coded. It does not move μ.

---

## 0. What “ingest everything” means

Two layers, and they are not the same.

1. Knowledge layer (this file). Every method, metric, formula, signal, and confirmed-empty query is written down. Nothing is dropped because it is inconvenient.
2. Promotion layer (the engine). A formula enters μ, UQ, props, or copy only after its kill test. Ingesting a paper is not adopting it.

Withholding a formula from the brain would be the failure. Promoting a soccer τ, a Hawkes tempo, or an inverted Venn-Abers interval onto NFL μ would be the other failure. Both are forbidden.

---

## 1. Locked invariants (do not edit)

- μ = market close. Gaussian close CRPS bar = 7.109. Beat by ≥ 0.01, n ≥ 150, walk-forward, before any candidate replaces close.
- Do not bump MODEL_VERSION from this ingest.
- Do not average 36.61 and 45.42.
- Do not put DAVE on μ.
- Do not port soccer Dixon-Coles τ onto NFL margins.
- Do not rescue: W5–W8, Hawkes-tempo, OSF-loop, JS-to-league, Mondrian-k at Δ0.009, inverted Venn-Abers confidence.
- CLV is an evaluation target. It is never a feature. Using the close before the close is leakage.
- Copy never claims 100% and never claims AI certainty on a 1.5-run (or any) line.

---

## 2. Round 3 verdicts that the brain must keep

Re-adjudication (PDF-opened). JEV’s IRRELEVANT panel was wrong; R1 stands, with R3 resolution.

| Paper | R1 | JEV | R3 | Brain status |
| --- | --- | --- | --- | --- |
| 1707.03307 qgam | KEEP | IRRELEVANT | MEASURE | Additive quantile regression. UQ score candidate. Kill before adoption. |
| 2202.07282 Zaffran AgACI | — | IRRELEVANT | KEEP | This is the DtACI / expert-aggregation paper. UQ, not μ. |
| 2502.05676 generalized Venn-Abers | KEEP | IRRELEVANT | KEEP | Calibration wrapper. Do not invert confidence. |
| 2305.19901 rescaled jackknife+ | KEEP | IRRELEVANT | KEEP | Efficiency cousin of jackknife+. Exchangeability dies on an NFL week. |
| 2310.01262 non-exchangeable risk control | KEEP | IRRELEVANT | KEEP | The right family for week-to-week shift. |
| 2608.29789 conformal vs Wasserstein DRO | MEASURE | KILL-COUSIN | MEASURE | Measure only. Do not rescue DRO onto μ. |

Tier 1 additions the brain keeps as methods, not as μ:

- 2407.14495 CTI — conformal thresholded intervals. Was missing; now found.
- 2208.08401 — Gibbs & Candès, arbitrary distribution shift, online.
- 2202.07282 — Zaffran AgACI (the DtACI paper).
- 2608.27310 — CP as inversion of a permutation test. Theoretical anchor only.
- 2604.01502 — conformal risk control under non-monotone losses. Directly addresses the isotonic-uninvert warning.
- 1511.05191 ENIR, 1304.2331 PAV — calibration-limit papers. Isotonic / pool-adjacent-violators.

Tier 2 additions, transferable, not NFL licenses:

- 2307.02139 Sarmanov Dixon-Coles extension. Soccer. Do not port.
- 2103.07272 Mar-Co dependence. Bivariate alternative. Soccer.
- 1908.08980 RPS vs Brier vs ignorance. Scoring rule. Keep as a metric.
- 2106.14345 football forecast verification (reliability / discrimination). Soccer verification practice.
- 2205.04173 nested zero-inflated generalized Poisson + Monte Carlo. Soccer.
- 1806.01930 Elo-covariate Poisson + Monte Carlo World Cup. Soccer.
- 2607.01722 adaptive Glicko-2. Rating dynamics. Measure.
- 1704.00197 iWinRNFL. NFL win-prob, 7 seasons of PBP. Measure against market close.
- 2108.11551 Fay-Herriot robust; 1910.13570 ECAP Tweedie EB; 2604.13861 James-Stein (cricket). Empirical-Bayes family. Shrinkage for rates, not a substitute for the close.

Tier 3 yield from arXiv was one paper: 2604.27865 KellyBench. The rest of Tier 3 is non-arXiv and is carded in §8.

---

## 3. Score-model equations (Tier 2)

These are ingested. None of them is μ.

### 3.1 Maher 1982 — independent Poisson baseline

Protocol said JRSS A. That is wrong. Maher, M. J. (1982), Modelling Association Football Scores, *Statistica Neerlandica* 36(3), 109–118. DOI 10.1111/j.1467-9574.1982.tb00782.x. Action = cite journal. The paper is a hierarchy: independent Poisson attack/defense, then a bivariate Poisson whose score correlation is described as about 0.2 and which improves draws. That 0.2 is the paper’s football result, not an NFL parameter.

Independent Poisson, home team i, away team j:

\[
X \sim \mathrm{Poisson}(\lambda_{ij}), \quad Y \sim \mathrm{Poisson}(\mu_{ij}), \quad X \perp Y
\]

\[
\lambda_{ij} = \exp(\alpha_i + \beta_j + \gamma), \quad \mu_{ij} = \exp(\alpha_j + \beta_i)
\]

α attack, β defense (sign convention: larger β concedes more), γ home advantage. Sum-to-zero on attack and defense for identifiability.

Assumption that dies on NFL: goals are rare counts. NFL points are 2/3/6/7/8 mixtures, not Poisson counts. Kill line: do not fit Maher to NFL point totals.

### 3.2 Dixon-Coles 1997 — τ on four cells only

Dixon, M. J. & Coles, S. G. (1997). JRSS Series C (Applied Statistics) 46(2), 265–280. DOI 10.1111/1467-9876.00065. JSTOR stable/2986290. The protocol URL stable/2984973 is the wrong stable id. Action = cite journal.

\[
P_{DC}(x,y) = \tau(x,y;\lambda,\mu,\rho)\, \mathrm{Pois}(x;\lambda)\, \mathrm{Pois}(y;\mu)
\]

\[
\begin{aligned}
\tau(0,0) &= 1 - \lambda\mu\rho \\
\tau(1,0) &= 1 + \mu\rho \\
\tau(0,1) &= 1 + \lambda\rho \\
\tau(1,1) &= 1 - \rho \\
\tau(x,y) &= 1 \text{ otherwise}
\end{aligned}
\]

Sign convention in the literature is not uniform. Under the convention ρ < 0, 0-0 and 1-1 are inflated and 1-0 / 0-1 are deflated. The four cell adjustments cancel, so the joint stays normalized and the margins stay Poisson. A separate time-decay weight (often called ξ) is chosen by predictive score; it is not inside τ.

Kill line: soccer-DC-on-NFL stays dead. τ corrects four low goal cells. NFL margins are not those cells.

### 3.3 Karlis–Ntzoufras 2003 — bivariate Poisson

Karlis, D. & Ntzoufras, I. (2003). JRSS Series D (The Statistician) 52(3), 381–393. DOI 10.1111/1467-9884.00366.

Common-shock construction:

\[
X_1, X_2, X_3 \text{ independent Poisson}(\lambda_1), (\lambda_2), (\lambda_3)
\]

\[
Y_h = X_1 + X_3, \quad Y_a = X_2 + X_3
\]

\[
\mathbb{E}[Y_h] = \lambda_1+\lambda_3, \quad \mathbb{E}[Y_a] = \lambda_2+\lambda_3, \quad \mathrm{Cov}(Y_h,Y_a) = \lambda_3
\]

Diagonal inflation is the extension that targets draws and allows overdispersed margins. Covariance must lie in \([0, \min(\mathbb{E} Y_h, \mathbb{E} Y_a)]\).

Kill line: same as Dixon-Coles. Soccer/water-polo counts. Not an NFL margin model.

### 3.4 Skellam margin

Difference of two independent Poissons. For integer k:

\[
P(Z = k) = e^{-(\lambda_1+\lambda_2)} \left(\frac{\lambda_1}{\lambda_2}\right)^{k/2} I_{|k|}(2\sqrt{\lambda_1\lambda_2})
\]

I_k is the modified Bessel function of the first kind. Mean λ1 − λ2. Variance λ1 + λ2.

Status: CONFIRMED-EMPTY on arXiv for “Skellam vs Gaussian NFL margin.” The formula is ingested as a candidate margin family. It does not replace the Gaussian close until the CRPS gate.

### 3.5 Favorite–longshot bias

OBSERVATION (literature, not a GSE fit): longshots have historically earned worse average returns per dollar than favorites in some markets (horse racing: Snowberg & Wolfers 2010, risk preference vs probability misperception). It is a pricing diagnostic, not a point forecast.

Use: when de-vigging, Shin’s method is the favorite-longshot-aware no-vig. Equal-margin de-vig is biased if the bias is present. Do not assume the NFL spread market has the horse-racing bias. Measure or mark unknown.

### 3.6 Empirical Bayes / shrinkage

James–Stein, p ≥ 3, equal variance σ², target ν (often the grand mean). Positive-part truncates the factor at 0:

\[
\hat\theta_i = \nu + \left(1 - \frac{(p-2)\sigma^2}{\|Y-\nu\|^2}\right)_{+} (Y_i - \nu)
\]

Efron–Morris baseball used an arcsin transform \(\sqrt{n}\arcsin(2\hat p-1)\) so variance is approximately 1, then k−3. The published 18-hitter example is a baseball result. It is not a GSE coefficient and must not be pasted onto a spread.

Fay–Herriot is the small-area version: direct estimate shrunk toward a regression synthetic estimate, weight = sampling variance / (sampling variance + model variance).

Tweedie formula is the empirical-Bayes posterior mean under a known marginal. Ingest as the shrinkage identity. Do not put a Tweedie number on μ.

Kill line already locked: JS-to-league stays dead. Shrinkage is for noisy player/team rates (props, early-season NCAAF), not for replacing the close.

### 3.7 Ratings

Elo update (standard, not a GSE fit):

\[
R_i' = R_i + K \left(S_i - \frac{1}{1+10^{(R_j-R_i)/400}}\right)
\]

Glicko-2 adds rating deviation and volatility. TrueSkill is a Gaussian factor graph. Adaptive Glicko-2 is arXiv:2607.01722 (MEASURE).

State-space / Kalman team strength: arXiv query “team strength state space NFL” and “Bayesian hierarchical NFL team rating” were in the Round 5 new-query list. If those searches were not opened in this pass, they remain OPEN-NOT-RUN, not CONFIRMED-EMPTY. Do not mark them empty.

---

## 4. NFL quant anchors (Tier 2, public)

### 4.1 Expected points and EPA

Yurko, Ventura, Horowitz, nflWAR, arXiv:1802.00998 (JQAS 2019). Pipeline:

1. Multinomial logistic regression for the next score in the half, 7 classes {+7, +3, +2, 0, −2, −3, −7}, baseline No Score:

\[
\log \frac{P(Y=y \mid X)}{P(Y=0 \mid X)} = X\beta_y, \quad EP(X) = \sum_y y\, P(Y=y \mid X)
\]

Covariates in that fit: down, seconds left in half, yardline, log(yards to go), goal-to-go, under-2-min. Fit on 2009–2016 non-PAT plays (304,896). That sample size is the paper’s, not a GSE recount.
2. EPA = EP after − EP before. WPA uses WP in place of EP.
3. WP is a GAM on expected score differential, seconds, half, timeouts. No team-strength term. That is a known gap in the paper.
4. Multilevel model isolates offensive skill-player WAR (air yards / YAC / rush residuals, converted by points-per-win). Uncertainty by a football-specific resample. Public PBP via nflscrapR, now nflverse. nflfastR canonical PBP from 1999.

nflfastR `calculate_expected_points` requires: season, home_team, posteam, roof, half_seconds_remaining, yardline_100, down, ydstogo, posteam_timeouts_remaining, defteam_timeouts_remaining. Outputs ep and next-score probabilities (no score, opp/own FG, safety, TD).

EPA is a play value. It is not a game-margin forecast and it is not μ.

### 4.2 Fourth down

arXiv “NFL fourth down decision” was not returned as a paper in R1–R4. Romer (2006, JPE, “Do Firms Maximize? Evidence from Professional Football”) is the decision-theory ancestor. It is a decision tree on an existing EP model, not a new EP model.

\[
EP_{go} = p_{conv} \cdot EP_{success} + (1-p_{conv}) \cdot EP_{failure}
\]

\[
p^{*} = \frac{EP_{alt} - EP_{failure}}{EP_{success} - EP_{failure}}
\]

Go when the estimated conversion probability exceeds p*. nfl4th is the public implementation on nflverse EP. Ingest as a feature generator (pressure on fourth down, go/kick disagreement with the coach). Not a license to move μ.

### 4.3 iWinRNFL

arXiv:1704.00197. NFL win probability from 7 seasons of PBP. MEASURE against the market. A model that matches historical WP is not a model that beats the close.

### 4.4 Success rate (SP+ definition, not a GSE fit)

Bill Connelly SP+, distinct from ESPN FPI. Success: ≥ 50% of yards-to-go on 1st, ≥ 70% on 2nd, 100% on 3rd/4th. Five factors: efficiency, explosiveness, field position, finishing drives, turnovers. Early-season SP+ is mostly the preseason prior. No public play file. Benchmark only.

DVOA is opponent-adjusted efficiency (Football Outsiders). Methods page was not stably readable on this pass (503). Benchmark definition only. Not a live table.

---

## 5. Conformal / UQ equations (Tier 1)

These change UQ. They do not change μ.

### 5.1 Split conformal

Score s(x,y) = |y − μ̂(x)| on a calibration split. Quantile

\[
\hat q = \text{the }\lceil (1-\alpha)(n_{\mathrm{cal}}+1)\rceil / n_{\mathrm{cal}}\text{ empirical quantile of calibration scores.}
\]

Interval [μ̂(x) − q̂, μ̂(x) + q̂]. Marginal coverage ≥ 1−α under exchangeability. Constant width. Dies as a default because NFL residuals are heteroscedastic (blowouts vs pick’ems, weather, QB change).

### 5.2 CQR — default UQ score

Romano, Patterson, Candès, arXiv:1905.03222.

Fit lower and upper quantile regressions on the training split. Calibration score

\[
E_i = \max\left\{\hat q_{\alpha_{lo}}(X_i) - Y_i,\ Y_i - \hat q_{\alpha_{hi}}(X_i)\right\}
\]

Interval

\[
C(x) = \left[\hat q_{\alpha_{lo}}(x) - Q_{1-\alpha}(E),\ \hat q_{\alpha_{hi}}(x) + Q_{1-\alpha}(E)\right]
\]

with Q the inflated empirical quantile (1−α)(1 + 1/|I₂|). Coverage ≥ 1−α under exchangeability, any algorithm. This is the heteroscedastic default.

### 5.3 Jackknife+ and CV+

Barber, Candès, Ramdas, Tibshirani, arXiv:1905.02928. AoS 2021.

\[
R_i^{LOO} = |Y_i - \hat\mu_{-i}(X_i)|
\]

\[
C^{+}(x) = \left[ q^{-}_{\alpha}\{\hat\mu_{-i}(x) - R_i^{LOO}\},\ q^{+}_{\alpha}\{\hat\mu_{-i}(x) + R_i^{LOO}\} \right]
\]

Coverage ≥ 1 − 2α under exchangeability and a symmetric algorithm. Ordinary jackknife can have coverage collapse to 0. CV+ replaces LOO with K-fold; worst-case coverage at least 1 − 2α − √(2/n). Rescaled jackknife+ is 2305.19901 (KEEP).

NFL kill: weeks are not exchangeable. Use as a batch diagnostic, not as the live week interval.

### 5.4 Mondrian conformal

Vovk. Stratify the calibration scores by a discrete attribute (week bucket W1–4, QB-change, book, weather bin) and take the quantile inside the stratum. Coverage is group-conditional if the stratum is fixed before seeing Y. Mondrian-k at Δ0.009 stays dead: a 0.009 width change is not a result.

### 5.5 Equalized coverage — NOT EMPTY

Romano, Barber, Sabatti, Candès, arXiv:1908.05428. HDSR 2020, DOI 10.1162/99608f92.03f00592.

Prior CONFIRMED-EMPTY on the phrase “equalized coverage” was a search miss. Do not mark CONFIRMED-EMPTY-FINAL.

Requirement, for every group a:

\[
\mathbb{P}\{ Y_{n+1} \in C(X_{n+1}, A_{n+1}) \mid A_{n+1} = a \} \geq 1-\alpha
\]

Construction: CQR-style scores, quantile taken inside the group’s calibration slice. Upper bound 1 − α + 1/(|I₂(a)|+1) if scores are a.s. distinct.

GSE groups are not protected attributes. They are operational strata: W1–4, QB-change, outdoor/indoor, book. Small strata will be wide. Fail closed (no bet) when the stratum calibration count is below a pre-registered floor. Do not invent the floor in this file.

### 5.6 ACI, DtACI, AgACI

Gibbs & Candès, arXiv:2106.00170. Online miscoverage level

\[
\alpha_{t+1} = \alpha_t + \gamma \left(\alpha - \mathrm{err}_t\right), \quad \mathrm{err}_t = \mathbf{1}\{Y_t \notin C_t\}
\]

Long-run coverage without exchangeability. γ is the learning rate. Too large and the interval chatters; too small and it lags a QB change.

DtACI (arXiv:2208.08401) and AgACI (Zaffran et al., arXiv:2202.07282, ICML 2022, PMLR 162:25834–25866) aggregate a grid of γ experts with exponential weights, so γ is not hand-set. This is the hedge-inside-conformal paper the protocol asked for. KEEP for UQ under week-to-week shift. Not a license to move μ.

### 5.7 Non-exchangeable conformal

Barber, Candès, Ramdas, Tibshirani, non-exchangeable conformal (the weighted / fixed-weight family). 2310.01262 is the risk-control cousin R3 kept. Weights down-weight old weeks. Coverage is a weighted guarantee, not a free lunch: if the weight on the recent week is tiny, the interval is wide.

### 5.8 Covariate shift

Tibshirani, Foygel Barber, Candès, Ramdas. Likelihood-ratio weighted conformal. Requires w(x) = p_test(x) / p_train(x). 2502.13030 regularizes that ratio in high dimension. QB-change as a named NFL covariate-shift paper: CONFIRMED-EMPTY on arXiv. The method is ingested; the NFL paper does not exist.

### 5.9 Venn-Abers

Petej / Vovk. Two isotonic regressions (assuming Y=0 and Y=1) produce a multiprobability interval. 2502.05676 generalized Venn-Abers is KEEP. Inverted confidence stays dead: do not treat the upper Venn probability as a point probability and bet it.

### 5.10 Calibration limits

- PAV (1304.2331) and ENIR (1511.05191): isotonic calibration. Isotonic assumes the score is monotone in the probability. Non-monotone scores make PAV the wrong tool.
- 2604.01502: conformal risk control under non-monotone losses. This is the paper that addresses the isotonic-uninvert warning.
- Query “isotonic regression non-monotone sports”: if still zero after this pass, CONFIRMED-EMPTY-FINAL. The method papers exist; the sports application does not.
- Calibration slope / intercept (Cox 1958; standard logistic recalibration): on a validation set,

\[
\mathrm{logit}\, \mathbb{P}(Y=1) = a + b \cdot \mathrm{logit}\, \hat p
\]

a = 0 and b = 1 is calibrated. b < 1 is overconfident. This is a diagnostic, not a second model. Do not refit b on the same weeks you report.

### 5.11 What the 100-paper batch actually adds

The pasted analysis (2609.17091 through 2406.04498) is mostly truncated abstracts. Ingest the families, not 100 energy and astronomy applications as NFL signals.

Families worth a card:

- Localized / conditional coverage: RLCP 2608.06206; Colorful Pinball 2512.24139; localized multi-quantile 2411.19523. Exact conditional coverage is impossible distribution-free in finite samples (Lei, Vovk, Barber). Approximate only.
- Sample-conditional coverage: Duchi 2503.00220. Split conformal is close to 1−α given the calibration set, with high probability.
- Training-conditional full conformal: Gibbs & Candès 2502.20579. Computationally heavy. Not a weekly default.
- Multivariate / multi-target: scaling-score 2609.17091; multi-target hyperrectangles 2406.04498; neural OT 2509.25444. Relevant only if GSE emits a vector (margin and total jointly).
- Time-series conformal cousins: rolling-origin 2605.08422; online monotonicity 2605.12668. Competitors to ACI, not replacements until a kill test.
- Non-monotone / skew: skew-adaptive 2605.16145. Candidate score, not a result.
- Applications (electricity, wind, VaR, conflict fatalities, power systems): method transfer only. No NFL number in those abstracts may be copied.

SPECULATION: none of the 100-paper abstracts contains a walk-forward NFL CRPS. Do not treat a coverage rate from electricity prices as an NFL coverage rate.

---

## 6. Scoring rules and market diagnostics

CRPS for a continuous predictive CDF F and observation y:

\[
\mathrm{CRPS}(F, y) = \int_{-\infty}^{\infty} \left(F(z) - \mathbf{1}\{y \le z\}\right)^2 dz
\]

Gaussian close bar used by GSE: 7.109. A candidate must beat it by ≥ 0.01 on n ≥ 150 walk-forward games. That number is the locked bar, not a new estimate from this ingest.

Brier score, binary event:

\[
\mathrm{BS} = \frac{1}{n}\sum_i (p_i - y_i)^2
\]

Ranked probability score (RPS), ordinal outcomes (1908.08980): proper scoring rule for ordered categories. Use for win/draw/loss or discrete margin bins. Do not compare RPS to CRPS as if they were the same unit.

Log loss / ignorance score: the verification paper 2106.14345 separates reliability and discrimination. Both are required. A sharp wrong model fails reliability. A flat model fails discrimination.

CLV, evaluation only:

\[
\mathrm{CLV} = \frac{\text{odds taken}}{\text{no-vig closing odds}} - 1
\]

No-vig methods, in order of honesty: Shin (favorite-longshot aware), odds-ratio, logarithmic, equal-margin (biased if longshot bias is present). Denominator must be MATCHED_CLOSE (same book, same market, same timestamp convention). arXiv has no paper defining that denominator (CONFIRMED-EMPTY). Circa contest rules are a separate semantic and must not be mixed with Pinnacle CLV.

Kelly (knowledge only, not an execution order): f* = p − q/b for even-style, or the general edge/odds form. 2604.27865 KellyBench is the only arXiv Tier 3 hit. Kelly is not turned on by this ingest.

---

## 7. Props, parlays, SGP

- Player props: Poisson is dead for touchdowns (zero-inflated, low count, dependence on game script). NB2 is the named candidate family. No arXiv NFL prop paper (CONFIRMED-EMPTY). Do not invent a dispersion.
- Same-game parlay correlation: arXiv query empty. CONFIRMED-EMPTY-FINAL if this pass also returned zero. Product of legs overprices the parlay if legs are positively correlated. 2607.14430 Kalshi parlays overpriced vs product of legs is the must-open reference; if it 404s, write NOT FOUND, do not invent the result.
- Copula (Frank, Gumbel) on football scorelines: CONFIRMED-EMPTY on the prior arXiv queries. Do not fit a copula to NFL margins because a soccer paper used one.
- Time-to-expiry calibration: CONFIRMED-EMPTY on the sports phrasing. ACI already covers the online case. Do not add a second unnamed decay.

---

## 8. Tier 3 data-source cards

alignment_gse_tables = true only where grain matches play / game / roster as-of.

### 8.1 nflverse / nflfastR / nflreadr / nfl-data-py

- source_type: github
- coverage: NFL PBP from 1999 (nflfastR canonical). NGS participation pre-2023. FTN participation 2023+ postseason-only.
- granularity: play, drive, game, player-week, roster row, injury report.
- update_frequency: pbp nightly post-gameday plus intraday points; schedules about every 5 minutes in season; rosters and injuries daily 07:00 UTC; snaps at 0/6/12/18 UTC; NGS player-week 03:00–05:00 ET. Participation 2023+ does not update in-season.
- known_gaps: participation source died mid-2023; in-season participation missing; no All-22; injury file is current, not bitemporal.
- alignment: true for EPA / WP / roster. False for an as-of injury warehouse until we snapshot it ourselves.
- citation: https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html

### 8.2 cfbfastR / collegefootballdata.com

- source_type: github + docs
- coverage: classic PBP 2014+ FBS; ESPN PBP ~2004+; NCAA PBP 2013+ including FCS; recruiting / ratings ~2002+. Some new passing/rushing endpoints start 2025 only.
- granularity: play (up to ~469 columns including EPA/WPA), game, recruiting class, weekly ratings.
- update_frequency: nightly rebuild; live via CFBD API key.
- known_gaps: API key; 2025-only endpoints empty before 2025; FCS thinner; no official NIL; betting lines are not a CLV archive.
- alignment: true for NCAAF PBP. False for portal / NIL.
- citation: https://github.com/sportsdataverse/cfbfastR

### 8.3 pybaseball / Baseball Savant

- source_type: github + docs
- coverage: Statcast pitch-level from 2008; launch angle / speed from 2015. Savant 30k-row cap forces chunking past 5 days.
- granularity: pitch.
- update_frequency: query-time, not a warehouse.
- known_gaps: pre-2008 empty; feature birth years differ; no as-of.
- alignment: true for an MLB pitch table. Out of NFL scope. Ops pattern transfers.
- citation: https://github.com/jldbc/pybaseball/blob/master/docs/statcast.md

### 8.4 Football Outsiders DVOA / FEI

- source_type: other
- coverage: historical NFL DVOA. FEI was the CFB cousin. Public site degraded after acquisition. Methods page returned 503 on this pass.
- granularity: team-week opponent-adjusted efficiency. Drive/play components in paid archives.
- update_frequency: weekly when published. Not an API.
- known_gaps: no stable public feed.
- alignment: false as a table. True as a benchmark definition only.

### 8.5 ESPN SP+ (Connelly) — not FPI

- source_type: press
- coverage: FBS, 138 teams, weekly. 2026 rankings were live as of 4 Oct 2026.
- granularity: team-week rating. No play file.
- known_gaps: weights not fully published. Early season is mostly the preseason prior. Do not conflate with FPI.
- alignment: false as a table. True as a rating benchmark.
- citation: https://www.espn.com/college-football/story/_/id/49868647/2026-college-football-sp+-rankings-all-138-fbs-teams

### 8.6 PFF grades

- source_type: other
- coverage: NFL/CFB player-play grades, proprietary charting.
- granularity: player-play to player-game to season.
- update_frequency: weekly public ranks; full file paid.
- known_gaps: not reproducible.
- alignment: false. Benchmark only. Never μ.

### 8.7 247Sports / On3 transfer portal

- source_type: press
- coverage: portal windows, status, destination, star rating.
- granularity: player-transaction.
- known_gaps: paywalled history, no stable API, status lags, no as-of. arXiv on portal effects is CONFIRMED-EMPTY.
- alignment: false until a point-in-time scrape exists.

### 8.8 On3 NIL

- source_type: press
- As of 2026-07-01, On3 NIL is deal-based contract value (college / collective compensation), not a marketing-NIL algorithm. Green check = confirmed contract; else insider estimate.
- known_gaps: not a projection of true NIL; selection bias; no panel.
- alignment: false. Covariate candidate only.
- citation: https://www.on3.com/nil/news/about-on3-nil-valuation-per-post-value/

### 8.9 Opendorse

- source_type: press
- Aggregate NIL market reports. Not player-game.
- alignment: false.

### 8.10 Pinnacle / Circa / DK / BetMGM / Action / Covers / BettingPros / Kaggle / Stathead

- Pinnacle articles: CLV methodology exists. Pinnacle NFL coverage in the US is limited. MATCHED_CLOSE denominator is not an arXiv object.
- Circa pro-football contest rules: a different CLV semantic. Do not mix with Pinnacle.
- DraftKings, BetMGM, Action Network, Covers, BettingPros public pages: current boards or marketing. No stated history grain or refresh. IRRELEVANT as sources until a dated archive is found.
- Kaggle NFL/CFB odds: IRRELEVANT unless a dataset states years, grain, and that lines are pre-game not backfilled.
- Stathead: query UI over Sports-Reference. Season-level. Not play as-of.
- NBA Stats API (swar/nba_api) and MLB-StatsAPI: out of NFL scope. Cite as ops patterns only.

### 8.11 Sports-Reference CFB / CBB, NFL Next Gen Stats, teamrankings

Already landed in Round 4 as the first 12 non-arXiv cards (cfbfastR, collegefootballdata.com, pybaseball, Baseball Savant CSV docs, nflfastR, nflverse-data, nflreadr, sports-reference CFB, sports-reference CBB, NFL Next Gen Stats, teamrankings, Circa Sports). This pass does not re-card them except where §8 adds grain. Next Gen Stats is tracking (speed, separation), not a forecast. teamrankings is a public rating board, not an as-of warehouse.

---

## 9. CONFIRMED-EMPTY (do not re-query these arXiv strings)

From Round 3 (31 empty) plus the protocol’s final-pass list. A second empty on the same string is CONFIRMED-EMPTY-FINAL.

Do not re-query:

- Skellam+NFL, Skellam+Gaussian+NFL margin
- copula+football, Frank copula+football, copula parlay correlated legs
- QB-change+NFL, QB-change covariate shift NFL
- NCAAF+Elo+calibration
- recruiting+impact+CFB, transfer portal effects, NIL college football effects
- Monte Carlo+CFB+tournament
- cfbfastR, collegefootballdata.com, pybaseball/Statcast, nflverse/nflfastR as arXiv queries (the repos exist; the papers do not)
- FCS vs FBS, 247/On3, SP+/FEI as arXiv queries
- data leakage in sports prediction, look-ahead bias in football, walk-forward validation for betting, sports data warehouse (as arXiv queries)
- reliability diagram in sports
- DtACI by the literal name (the paper is 2202.07282 under AgACI — do not re-query the empty string)
- Tukey / Quenouille jackknife as arXiv queries
- Maher 1982, Karlis-Ntzoufras as arXiv queries (journal-only)
- Hawkes process in football/soccer
- Pinnacle closing line value by name, CLV denominator
- player prop modeling NFL, injury roster NFL prediction, weather NFL football prediction
- conference realignment football
- Efron-Morris empirical Bayes baseball, hierarchical Bayes shrinkage sports (as those exact strings)
- hedge exponential weights conformal (the paper is AgACI / DtACI, already kept)
- favorite-longshot as an NFL paper (the bias literature is horse racing)
- same game parlay correlation
- time to expiry calibration sports
- isotonic regression non-monotone sports

Exception, corrected this pass: “equalized coverage” is NOT empty. Paper is 1908.05428. The empty verdict was a miss.

OPEN-NOT-RUN (Round 5 listed these; this pass did not open the result pages, so they are not empty and not kept):

- “expected points NFL” as an arXiv phrase (the Yurko paper was found by nflWAR, not by this phrase)
- “NFL fourth down decision”
- “team strength state space NFL”
- “Bayesian hierarchical NFL team rating”
- “calibration slope intercept probabilistic forecast”
- “coverage under group fairness”, “group-balanced conformal” (equalized coverage itself is found; these phrasings were not opened)

---

## 10. Killed families (stay dead)

| Family | Why it stays dead |
| --- | --- |
| Hawkes-tempo | No football Hawkes paper. Self-exciting point process is not an NFL drive model until one exists and beats the close. |
| soccer-DC-on-NFL | τ corrects four goal cells. NFL points are not Poisson goals. |
| JS-to-league | James-Stein on 32 team means is not a market. k is small, variance is not equal, the close already shrinks. |
| Mondrian-k Δ0.009 | A width change of 0.009 is not a result. |
| inverted Venn-Abers | Upper multiprobability is not a point probability. |
| OSF-loop | Not rescued by this ingest. |
| W5–W8 rescue | Not rescued. |
| DAVE on μ | 2,826 hits, almost none empirical-Bayes sports. Not a mean. |
| Poisson TD props | Zero-inflated, script-dependent. NB2 is the candidate, untested. |
| Product-of-legs parlay price | Overprices positive correlation. 2607.14430 is the reference if it resolves. |

---

## 11. Outside the game (cognitive, nutrition, sleep, weather, roster shock)

The founder asked for inside-game and outside-game factors, including cognitive and nutrition. Honest status:

- Weather: CONFIRMED-EMPTY as an arXiv NFL prediction paper. nflverse has roof / surface / weather fields on the game row. Usable as a Mondrian stratum (outdoor wind above a pre-registered threshold). Not a causal effect size. Do not invent a points-per-mph coefficient.
- Roster / injury: nflverse injuries and rosters exist, daily, not bitemporal. QB-change as covariate shift is CONFIRMED-EMPTY on arXiv. The signal is operational: flag the start if the starter differs from the closer’s assumed QB. Fail closed if the injury report timestamp is after the line we are grading.
- Transfer portal / NIL / realignment: press data, no as-of, no arXiv effect paper. Covariates only after a point-in-time scrape. Not μ.
- Circadian / coast: one published covariate, not a coefficient to hardcode. Smith, Guilleminault, Efron, SLEEP 36(12):1999–2007, 2013 (PMC3825451). Forty years of West Coast vs East Coast NFL. They report an evening-game spread advantage for WC over EC and no advantage in day games, and they argue it is not the travel schedule. USE as a binary feature (evening × coast mismatch) with a walk-forward kill against the close. Do not paste their evening split into the engine.
- Travel, altitude, surface, official crew: nflverse has surface and roof. Crew and timezone are joinable from public schedules if the join is as-of. No effect size is ingested.
- Sleep, nutrition, cognitive load: no source in this stack has coverage, grain, and refresh. OUT-OF-CORPUS. A future card needs: who is measured, at what hour, whether it is public before kickoff, and a pre-registered kill. Inventing a loading is sabotage.

Ingesting an unsourced factor as a coefficient would be the invented number the protocol forbids.

---

## 12. Twenty-thousand-foot view

What the stack actually is:

- A deep conformal library (CQR, jackknife+, ACI/AgACI, equalized coverage, non-exchangeable weights, Venn-Abers) with exchangeability assumptions that an NFL week violates. The live UQ path is ACI/AgACI plus Mondrian strata, with CQR as the score. Jackknife+ is a batch check.
- A soccer score-model library (Maher, Dixon-Coles, Karlis-Ntzoufras, Skellam) that must not be ported.
- One real NFL quant spine: nflverse PBP → EP → EPA → WP → nflWAR. That spine is descriptive. It is not a market-beating margin model.
- A market bar that is already set: Gaussian close, CRPS 7.109. Almost nothing in the 100-paper batch speaks to that bar.
- A Tier 3 layer that is finally non-empty, and whose binding constraint is as-of, not another rating.

What is missing, in order of damage:

1. Point-in-time warehouse. Injuries, depth charts, and lines are current-state. Without bitemporal snapshots, every backtest leaks.
2. MATCHED_CLOSE definition, written down: book, market, timestamp, de-vig method. arXiv will not supply it.
3. A walk-forward harness that can reject a candidate. The papers do not include one for GSE.
4. NCAAF distribution shift (portal, FCS/FBS, realignment) as data, not as papers. The papers are empty.
5. Joint spread-and-total model. Queried, not found. Needed before any SGP price.
6. Fourth-down and state-space rating papers were listed and not opened. They are open loops, not gaps we can call empty.
7. Outside-game human factors have no grain. Researching them is a separate program.

What not to do next:

- Do not add another conformal wrapper before the as-of tables exist. A perfect interval on leaked labels is a false edge.
- Do not fit Dixon-Coles to NFL.
- Do not treat SP+, DVOA, or PFF as features in the same model that is graded against the close, unless the rating’s publication timestamp is before the close. Most public pages do not give that timestamp.

---

## 13. Implementation plan

Phases are sequential. A phase does not start until the previous phase’s kill test is written down.

### Phase 0 — Brain registry (this file)

Done when this document and `gse_method_index.json` are in the repo under `reports/jev/` or `docs/brain/`. No engine code. No MODEL_VERSION bump.

Acceptance: every KEEP/MEASURE paper from R3 has a row; every CONFIRMED-EMPTY string has a row; equalized coverage is marked FOUND not empty.

### Phase 1 — Point-in-time tables (the actual edge)

Build, do not model.

- Snapshot nflverse injuries, rosters, depth charts daily, keyed by (player_id, observed_at). Never overwrite.
- Snapshot the line we will grade, keyed by (game_id, book, market, observed_at), with de-vig method stored beside the price.
- Join rule: a feature is legal at decision time t only if observed_at ≤ t. Tests must fail if a row from after t joins.
- NCAAF: cfbfastR PBP from 2014, recruiting from the CFBD weekly file, portal as a separate UNSOURCED table until scraped as-of.

Acceptance: a leakage test that moves kickoff forward and shows injury/line rows disappearing. No new prediction in this phase.

### Phase 2 — Evaluation harness

- Target: game margin and total, walk-forward by week.
- Baseline: Gaussian at the no-vig close. CRPS. Bar 7.109, Δ ≥ 0.01, n ≥ 150.
- Secondary: Brier on win, RPS on margin bins, calibration slope/intercept on a later window than the fit.
- CLV report uses MATCHED_CLOSE and a named de-vig. CLV is not a feature.
- Fail closed if the stratum has too few calibration points. Floor is pre-registered in the harness, not chosen after seeing the week.

Acceptance: the harness reproduces the close baseline on a frozen week list. It does not declare a winner.

### Phase 3 — UQ wrapper, still on the close

- Score: CQR around the close (or around a residual from the close).
- Online level: AgACI (2202.07282) with a pre-registered γ grid.
- Strata: W1–4, QB-change flag, roof/wind bin. Equalized coverage (1908.05428) inside those strata.
- Jackknife+ as an offline audit, not the live interval.
- Venn-Abers allowed as an interval. Inverted point confidence forbidden in code review.

Acceptance: empirical coverage by stratum on the walk-forward window, width reported beside coverage. A stratum that misses coverage fails closed. No claim that this beats CRPS.

### Phase 4 — Candidate means, one at a time

Each candidate is a branch. None merges until Phase 2 says so.

- Candidate A: Gaussian close, unchanged. The incumbent.
- Candidate B: Skellam or Gaussian on a shrunk team strength, early-season only, James-Stein / Fay-Herriot on noisy rates. Must beat 7.109 by ≥ 0.01.
- Candidate C: EP/WP features from nflverse as covariates of the residual, with publication lag respected. iWinRNFL (1704.00197) is the literature cousin, not the implementation.
- Explicitly not candidates: Dixon-Coles τ, Hawkes, DAVE, PFF grade, SP+ without a timestamp, NIL valuation.

### Phase 5 — Props and SGP, after the game model is honest

- Props: NB2, not Poisson, on EPA-aware opportunities. Kill if it does not beat a market prop close on CRPS or log loss.
- SGP: no price until a joint model of spread and total exists. Product of legs is a banned price. Correlation is estimated from Phase 1 rows only.

### Phase 6 — Outside-game research program (separate)

Do not block Phases 1–4.

- Weather: use existing nflverse fields as strata. A points-per-mph model requires its own pre-registration.
- Portal/NIL: scrape as-of or do not use.
- Sleep, nutrition, cognitive: no ingest until a public, pre-kickoff, player-level source exists.

---

## 14. What the engine is allowed to say after this ingest

Allowed:

- “μ is the close. CRPS bar is 7.109. Nothing in this ingest beat it.”
- “UQ path is CQR + AgACI + equalized coverage on pre-registered strata.”
- “Dixon-Coles τ is ingested and banned on NFL.”
- “Equalized coverage is 1908.05428. The empty search was a miss.”
- “Injury and portal effects have no as-of table yet.”

Not allowed:

- Any new edge, coverage rate, or coefficient that is not in a cited paper or a Phase 1 snapshot.
- “We modeled nutrition.”
- “Soccer τ transfers.”
- “PFF is a feature.”

---

## 15. Sources for the formulas in this file

- Dixon-Coles τ: JRSS C 46(2) 265–280, DOI 10.1111/1467-9876.00065. Secondary restatement used for the cell formula.
- Karlis-Ntzoufras: JRSS D 52(3) 381–393, DOI 10.1111/1467-9884.00366.
- Maher 1982: journal-only. Citation conflict recorded in §3.1.
- CQR: https://arxiv.org/abs/1905.03222
- jackknife+: https://arxiv.org/abs/1905.02928
- ACI: https://arxiv.org/abs/2106.00170
- AgACI: https://arxiv.org/abs/2202.07282
- Equalized coverage: https://arxiv.org/abs/1908.05428
- nflWAR: https://arxiv.org/abs/1802.00998
- Skellam PMF: standard form (Skellam 1946; Irwin 1937 special case).
- James-Stein / Efron-Morris: the k−3 shrinkage factor; baseball arcsin transform is Efron & Morris 1975/1977.
- nflverse schedule: https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html
- cfbfastR: https://github.com/sportsdataverse/cfbfastR
- On3 NIL definition (2026-07-01 deal-based): https://www.on3.com/nil/news/about-on3-nil-valuation-per-post-value/
