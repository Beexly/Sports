# GSE brain ingestion — corrections, 2026-10-05

Founder's corrections pass over the ingestion protocol. What was wrong, and is now corrected.

## Citation errors (three) and one false empty

**Maher 1982 is not JRSS A.** It is Statistica Neerlandica 36(3), 109–118, DOI 10.1111/j.1467-9574.1982.tb00782.x. Independent Poisson attack and defense, then a bivariate Poisson the paper describes as improving draws. Soccer goals.

**Dixon-Coles 1997 is JRSS C 46(2), 265–280**, DOI 10.1111/1467-9876.00065. The JSTOR stable id in the protocol (2984973) is wrong; the article is stable/2986290.

**Karlis and Ntzoufras 2003 is The Statistician / JRSS D 52(3), 381–393**, DOI 10.1111/1467-9884.00366.

**Equalized coverage is not empty.** The prior empty search was a miss. The paper is Romano, Barber, Sabatti, and Candès, arXiv:1908.05428, "With Malice Towards None." Group-conditional finite-sample coverage, a wrapper around any predictor including CQR. Do not mark that query CONFIRMED-EMPTY-FINAL.

## The equations that actually enter the brain

**Soccer scoreline family. Ingested, banned on NFL margins.** Maher's independent Poisson is the baseline. Dixon-Coles multiplies only four cells:

$$P_{DC}(x,y)=\tau(x,y)\,\mathrm{Pois}(x;\lambda)\,\mathrm{Pois}(y;\mu)$$

with $\tau(0,0)=1-\lambda\mu\rho$, $\tau(1,0)=1+\mu\rho$, $\tau(0,1)=1+\lambda\rho$, $\tau(1,1)=1-\rho$, and $\tau=1$ elsewhere. A separate time weight $\exp(-\xi t)$ is not inside $\tau$. Karlis–Ntzoufras is the common-shock construction $Y_h=X_1+X_3$, $Y_a=X_2+X_3$, so covariance equals $\lambda_3$, plus a diagonal inflation for draws. Skellam is the difference of two independent Poissons,

$$P(Z=k)=e^{-(\mu_1+\mu_2)}(\mu_1/\mu_2)^{k/2} I_{|k|}(2\sqrt{\mu_1\mu_2}).$$

All four assume unit scores. NFL points come in 2, 3, 6, 7, 8. Soccer-DC-on-NFL stays a killed family. Skellam-versus-Gaussian on NFL margins remains CONFIRMED-EMPTY on arXiv.

**NFL state, which is the real spine.** Yurko, Ventura, and Horowitz, arXiv:1802.00998, fit a 7-class multinomial logit of the next score in the half, classes $\{+7,+3,+2,0,-2,-3,-7\}$, on down, seconds left, yardline, log yards-to-go, goal-to-go, and under two minutes. Expected points are the probability-weighted sum. EPA is the difference across the play. Win probability is a GAM on expected score differential and has no team-strength term, which the paper leaves as a gap. Fourth down is Romer's 2006 JPE decision tree, not a new expected-points model: go when conversion probability exceeds $(EP_{alt}-EP_{failure})/(EP_{success}-EP_{failure})$. nfl4th is the public implementation. These are feature generators. They are not μ.

**Shrinkage.** Positive-part James–Stein, $p\ge 3$:

$$\hat\theta_i=\nu+\left(1-\frac{(p-2)\sigma^2}{\|Y-\nu\|^2}\right)_{+}(Y_i-\nu).$$

Efron–Morris is the arcsin-transformed baseball ancestor. Use it on noisy player rates. JS-to-league stays dead. The close already shrinks.

**UQ, which is where the 100-paper batch actually pays.** CQR (arXiv:1905.03222) is the default score: calibration residual $E_i=\max\{\hat q_{lo}(X_i)-Y_i,\ Y_i-\hat q_{hi}(X_i)\}$, interval shifted by the calibration quantile, coverage $1-\alpha$ under exchangeability. Jackknife+ (arXiv:1905.02928) uses leave-one-out residuals and leave-one-out predictions at the test point, coverage $1-2\alpha$, and the ordinary jackknife can collapse. ACI (Gibbs and Candès, arXiv:2106.00170) is the online rule $\alpha_{t+1}=\alpha_t+\gamma(\alpha-\mathrm{err}_t)$, long-run coverage without exchangeability. AgACI (Zaffran et al., arXiv:2202.07282) is the paper Round 3 promoted: a grid of $\gamma$ experts aggregated by exponential weights. That is the DtACI / hedge-inside-conformal object the protocol was hunting. Equalized coverage (1908.05428) takes the quantile inside the group. Our groups are not protected classes. They are week bucket, QB-change, roof/wind, book, and evening coast-mismatch.

**The 100-paper read** is mostly truncated abstracts in energy, astronomy, materials, and conflict. The families worth keeping are localized coverage, sample-conditional coverage (Duchi, 2503.00220), training-conditional full conformal (Gibbs and Candès, 2502.20579), multi-target regions, and rolling-origin time series. None of those abstracts contains a walk-forward NFL CRPS. An electricity-price coverage rate does not transfer.

## Twenty-thousand feet

The brain is rich in wrappers and empty in time. Conformal theory is ahead of the warehouse. A perfect interval on a leaked injury report is a false edge, and nflverse injuries are current-state, refreshed daily at 07:00 UTC, not bitemporal. Participation died in-season after the 2023 NGS source change. Portal, NIL, PFF, SP+, and DVOA have no legal as-of timestamp, so they are benchmarks or missingness-flagged covariates, never features in the model that is graded against the close.

The literature holes are real and should stay empty. Thirty-one arXiv searches returned nothing, and the final-pass strings (Skellam on NFL, copula on football, QB-change as a named shift paper, NCAAF Elo calibration, recruiting impact, Monte Carlo CFB tournament, same-game parlay correlation, isotonic on non-monotone sports scores, time-to-expiry calibration) should not be queried again. The route around them is to build the tables.

Outside the game, the corpus does not contain nutrition, cognitive load, or sleep restriction at play grain. Inventing a loading would be the invented number. One published covariate does exist and is not a coefficient to hardcode: Smith, Guilleminault, and Efron, SLEEP 2013, a West Coast versus East Coast evening-game spread split, with no advantage in day games. It enters as a binary feature with a walk-forward kill. Weather has no arXiv NFL paper. Wind and roof are already on the nflverse game row and enter as Mondrian strata, not as a borrowed points-per-mph.

## Implementation order

**Phase 0** is this dossier. No version bump.

**Phase 1** is the point-in-time warehouse. Snapshot injuries, rosters, and the line we will grade, keyed by observed-at. A feature is legal at decision time t only if it was observed at or before t. A test must fail if a post-t row joins. No new prediction in this phase.

**Phase 2** is the harness. Walk-forward by week. Baseline is the Gaussian no-vig close. CRPS bar 7.109, beat by at least 0.01, n at least 150. Secondary metrics are Brier, ranked probability score on margin bins, and Cox calibration slope and intercept on a later window than the fit. CLV is the evaluation target, Shin or odds-ratio de-vig, documented, never a feature. Circa contest rules are a different close and do not mix with Pinnacle.

**Phase 3** puts UQ on the close, not instead of it. CQR score, AgACI over a pre-registered γ grid, equalized coverage inside the strata above. Jackknife+ is an offline audit. Venn-Abers is allowed as an interval and forbidden as an inverted point probability. A stratum that misses coverage fails closed.

**Phase 4** is one candidate mean at a time, against the bar. The incumbent is the close. A shrunk team-strength residual is allowed to try. EPA and WP may be covariates if their publication lag is respected. Dixon-Coles, Hawkes, DAVE, PFF, and untimestamped SP+ are not candidates.

**Phase 5** is props and same-game parlays, and only after the game model is honest. Touchdowns are NB2, not Poisson. A parlay priced as the product of its legs is banned until a joint spread-and-total model exists. That joint model was queried and not found.

**Phase 6** is the outside-game program, and it does not block the others. Coast-mismatch and weather strata can be wired now. Nutrition and cognitive stay OUT-OF-CORPUS until a source states coverage, grain, and refresh.

The edge in this corpus is not another formula. It is an as-of join the papers do not have, wrapped in a conformal interval that is not allowed to pretend the weeks are exchangeable, graded against a close that has not been beaten.

## The cut

Three statuses replace KILL.

**TRANSFER** means the operator maps onto an NFL state and the weight is estimated on our tables, including the possibility that the weight is zero. **STRUCTURE-ONLY** means the equation is stored, the original unit does not fit, and a new cell definition is required before a fit. **STILL-BANNED-ON-μ** means the object may sit in the library and may not replace the close, leak the close, or be inverted into a fake point probability.

μ does not move. The Gaussian-close CRPS bar stays 7.109, beat by at least 0.01, n at least 150, walk-forward. A cross-sport paper supplies the hypothesis. Our as-of rows supply the weight. An empty arXiv search means no paper. It does not mean the structure is unreal.

## What I had killed, remapped

Dixon-Coles τ stays in the library. It inflates 0-0 and 1-1 and deflates 1-0 and 0-1, and that cell definition is soccer. Pasting ρ onto a 23-point NFL margin is still banned. Two pieces train. Exponential decay of team strength, exp(−ξ t), is sport-agnostic and ξ is learned on our weeks. A low-cell dependence term is legal once the cells are ours: scoring-event pairs, or the joint residual of spread and total, which is the same-game-parlay hole. If the likelihood does not beat independence, ρ stays 0 and the row stays in the library as a failed candidate.

Skellam is a legal bake-off, not a ban. The Bessel margin is the right model for hockey and soccer goal difference, and Ryder's hockey toolbox is an auxiliary lecture, not an NFL prior. On NFL rows the legal unit is scoring events, then a learned map from event-difference to points, because points come in 2, 3, 6, 7 and 8. Fitting Skellam directly to the point margin and calling it the mean is the thing that stays banned. Losing the bake-off does not delete the family.

Hawkes was killed as tempo-on-μ. That ban holds. As a residual intensity after EPA, it is a training task. The marked football point-process paper in JRSS C found that association-football event times did not cluster and the Hawkes fit collapsed toward Poisson. That negative result is a label the engine should see. A random-memory Hawkes on corner kicks (arXiv:2601.07980) is the template for excitation that dies, which is the right bias for a drive. If α goes to zero on nflverse after EPA is conditioned out, the dataset killed it.

James–Stein and Efron–Morris train on player rates: EPA, catch rate, kicker, small-sample college, the baseball arcsin ancestor. Shrinking the 32 team means toward the league and calling that the spread is still banned, because the close is already that shrinkage. The operator is not banned. The target is.

Venn-Abers stays as a multiprobability interval. The ban is on inverting the upper end into a point probability and betting it. Mondrian stays. The 0.009 width change stays a failed adoption, logged as a negative label, not a reason to delete group-conditional coverage. Equalized coverage (arXiv:1908.05428) is the wrapper, and our groups are week bucket, QB-change, roof and wind, book, rest, and coast-mismatch. DAVE, W5–W8, and the OSF loop stay out of μ and stay in the log so the engine can see the specification that failed.

## What the other sports actually contribute

**Baseball** run expectancy is the ancestor of expected points. Twenty-four base-out states become Yurko's seven next-score classes. Park factors become a stadium, roof, and altitude multiplier, re-estimated, because runs are not points. Pythagorean expectation is a baseline map from points to wins with the exponent learned here, not loaded as folklore.

**Hockey** gives the unit-score Skellam and the empty-net state change. The pull is the structural cousin of a trailing team's fourth-down aggression and of garbage time. It is a regime flag. A hockey odds ratio is not a points model. Manpower by score by time is the same shape as the nflWAR win-probability GAM, with roster availability as the manpower bit.

**Tennis** is the calibration lecture and the regime lecture. A surface Elo — clay does not carry to grass — is the operator that becomes dome, outdoor-wind, altitude, and turf, with the overall rating as the backoff when n is small. Glicko rating deviation inflates when a player has not played. That is the QB-change uncertainty feature the arXiv search never found, because it was never going to be a paper. It is already in our schedule gaps. Reliability diagrams transfer as diagnostics. A tennis Brier score does not transfer as an NFL accuracy claim.

**NBA rest** is the short-week and Thursday-night cousin. Entine and Small, JQAS 2008, separated rest from home-court. A published second-night point figure is an NBA number and is not pasted onto a Thursday spread. The feature is days rest, travel direction, and the coast-mismatch bin from Smith, Guilleminault, and Efron, SLEEP 2013. The weight is trained on our margins against the close.

**TrueSkill** is the operator for the participation hole: infer player skill from the team result when the on-field list is missing. Train it on seasons where participation exists. Do not impute the post-2023 in-season gap. Bradley-Terry sits under Elo as the ancestor. The copula zoo sits in the library even though "copula football" was empty on arXiv, because empty means no paper, and spread-total dependence is measurable on our closes. Covariate-shift conformal is the operator for portal, FCS against FBS, and realignment, same reason.

**Favorite-longshot bias**, Snowberg and Wolfers in horse racing, trains the de-vig and the odds-band diagnostic. If NFL moneylines do not show it, the weight goes to zero. Kelly is bankroll sizing on an edge that has already cleared the bar. It is not a forecast.

## What is still unsourced

Nutrition, cognitive load, and sleep restriction have no play-level public grain. They are not killed. The slot exists and the weight is missing. Inventing a loading would be the invented number. Weather, rest, roof, surface, and coast are already sourced enough to be tasks.

## How the engine actually trains

Shared operators, private heads. Auxiliary sports may move a shared representation — state value, shrinkage, regime rating, calibration code. They may not write an auxiliary coefficient onto the NFL margin head. That head moves only when it beats the close on NFL rows alone.

The order is the warehouse first, then the library, then the auxiliary heads, then one NFL candidate at a time. As-of joins are the gate: a row observed after decision time does not train. Each operator is a registry row with source, sport, formula, legal unit, illegal unit, and status. Banned-on-μ is not deleted. A candidate that loses stays, with the loss attached. Purging it was the error this pass corrects.

The miss at 20,000 feet was equating protection of the bar with an empty brain. The bar is a promotion gate. The corpus is the syllabus. The engine should be able to see a tennis surface split and grow a roof split. It should not be able to write a Premier League ρ onto an NFL margin and call it a forecast. That is the whole distinction.

---
*Source: founder's chat dossier, 2026-10-05 ~19:30 CDT. Companion files: `gse_brain_ingestion_v1.md`, `gse_transfer_operators_v1.md` (this directory).*
