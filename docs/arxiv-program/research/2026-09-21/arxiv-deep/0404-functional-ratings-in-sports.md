# [0404] Functional Ratings in Sports (arXiv:1908.00939v1)

**Citation:** Bradley Lowery, Abigail Slater, Kaison Thies (2019). *Functional Ratings in Sports*. arXiv:1908.00939v1. URL: https://arxiv.org/abs/1908.00939v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,646 lines).
**Verdict:** REJECT — least-squares margin-of-victory team ratings are already thoroughly covered in Garrett's corpus (Massey, Sagarin, Colley, Harville), the functional (time-varying) twist adds no demonstrated predictive value, the paper runs no predictive validation against any baseline, and its NFL applicability is nil (discrete scoring, 17-game seasons, no continuous score functions).

## 1. Research question
Can the classic least-squares sports rating (Stefani 1977; Harville 1980; Massey 1997) be extended from a scalar final-margin rating to a *functional* rating β_i(t) — team i's schedule-adjusted average point differential as a function of game time t — using every scoring event in every game rather than just final scores? Secondary questions: which home-court specification fits (none / constant / team-specific), and what do the rating curves reveal about team styles (e.g., strong first-half vs. second-half teams)?

## 2. Dataset / schema
- **2018–19 NCAA Division I men's college basketball season** (including postseason): **353 teams, 5,603 games**. Per game: date, home/away teams, final score, neutral-site flag, plus a full **scoring summary** (every score change with game-clock time), interpolated to per-second score functions s_i(t).
- Sourcing: Sports-Reference.com (majority), ESPN.com, individual school websites; cross-validated against Kenneth Massey's complete game list (MasseyRatings.com). One game (Jackson State at Alabama A&M, 2019-01-05) had no public scoring summary — only 4 box-score points used. Documented errors: final-entry mismatches patched by appending the missing score; same-timestamp scoring bursts left uncorrected (e.g., North Alabama–Samford 2018-11-06, where ~5 points of "advantage" are smeared over a 212-second interval).
- Access: assembled from public sites (not released as a dataset by the authors); no URL given for the compiled data.

## 3. Method / model
Pointwise least squares on score *functions*:
1. Basic model: β_i(t) − β_j(t) = d(t), where d(t) = s_i(t) − s_j(t) is the point differential at time t; compactly **Xβ(t) = d(t)** with an m×n design matrix (x_ki = +1 home team i, −1 away team i, 0 otherwise).
2. Three variants: Model 1 (no home advantage); Model 2 (constant home function α(t), design matrix gains one column); Model 3 (team-specific α_i(t), design matrix m×2n). Neutral-site games get no α term.
3. Overtime: **overtime data removed** — OT games end in a tie at the regulation score (authors note alternatives and call for further study).
4. Rank deficiency handled by the constraint **Σ_i β_i(t) = 0 ∀t** (alternatives discussed: worst-team-zero, average-score shift — all pure shifts, no ranking impact).
5. Solution: minimize the L² residual norm ‖r(t)‖ = ∫₀ᵀ Σ_i r_i(t)² dt via **pointwise minimization** — ordinary least squares solved independently at each second on the raw discretized data ("no loss of information prior to minimizing"); smoothing applied afterward for interpretation only (order-4 B-spline, knots every minute, chosen by trial and error).
6. Model selection: per-second **ANOVA F-tests** (Harville & Smith style) comparing SSE of nested models → a p-value function over game time.
7. Scalar ranking: (∫₀ᵀ w(t)β_i(t)dt)/(∫₀ᵀ w(t)dt), with w(t)=1 (average rating) reported; end-of-game-only ranking β_i(T) compared.

## 4. Equations & assumptions
- Model equation (1): β_i(t) − β_j(t) = d(t), t ∈ [0, T].
- Home variants (2): d(t) = β_i(t) − β_j(t) + α(t) (home) or β_i(t) − β_j(t) (neutral); (3): β_i(t) − β_j(t) + α_i(t) = d(t).
- Identifiability constraint (4): Σ_{i=1}^{n} β_i(t) = 0, ∀t.
- L² objective: ‖r(t)‖ = ∫₀ᵀ (Xβ(t) − d(t))ᵀ(Xβ(t) − d(t)) dt.
- Scalar rating (5): (∫₀ᵀ w(t)β_i(t)dt)/(∫₀ᵀ w(t)dt).
- Decomposition from the normal equations XᵀXβ(t) = Xᵀd(t) (equations 6–8): **β_i(t) = d̄_i(t) + sos_i(t)**, where d̄_i(t) = (1/m_i) Σ_{k∈G_i} x_ki d_k(t) (average point differential) and sos_i(t) = (1/m_i)Σ_{j∈T_i} β_j(t) − (h_i/m_i)α(t) + (a_i/m_i)α(t) (strength of schedule = mean opponent rating, discounted for home games, inflated for road games).
- Stated assumptions: (i) all games equal length T (overtime discarded); (ii) enough games that all teams are connected (null space of X exactly dimension 1); (iii) score interpolation between scoring events is exact (ignores the same-timestamp smearing error they document); (iv) the ANOVA p-value functions are interpreted pointwise with no multiple-testing correction across the ~2400 seconds.

## 5. Features / target
Input features: none in the ML sense — the design matrix encodes only team identities and home/away/neutral status per game; the "features" are the per-second score-differential functions d_k(t) for all 5,603 games. Target: the functional ratings β_i(t) (and α(t)) themselves — a descriptive fit, not a prediction task. Derived outputs: scalar ratings via (5), strength-of-schedule functions, predicted neutral-site game-flow curves (β_i(t) − β_j(t)).

## 6. Validation design
No predictive validation whatsoever — no train/test split, no backtest, no baseline comparison (not vs. Massey, Sagarin, KenPom, or even the scalar least-squares rating). Validation is purely inferential: nested-model ANOVA p-value functions over game time (Model 1 vs 2; Model 2 vs 3), an 80% confidence band for α(t), and face-validity checks of the smoothed curves (Duke flat-dominant, Illinois flat after halftime, Stanford second-half surge). The scalar rankings are presented without any test of whether they predict future games better than alternatives.

## 7. Numerical results / baselines
Paper's claims (descriptive; no baselines):
- Model selection: Model 1 vs 2 p-values **consistently < 0.1** except the first minute → reject H₀, constant home advantage needed. Model 2 vs 3 p-values **consistently > 0.1** except the first 20 seconds → fail to reject, constant (not team-specific) home advantage appropriate. **Model 2 adopted.**
- Home-court effect: end-of-game advantage ≈ **3 points** (80% CI, Figure 3) — "significant for two closely rated teams, but not so drastic that home-court advantage would determine the outcome for two unevenly matched teams."
- Scalar ratings (w=1) — top: Gonzaga **14.98** (#1), Duke **13.31** (#2), Virginia **12.99** (#3), North Carolina **12.77** (#4), Michigan **12.45** (#5), Michigan State **11.87** (#6); bottom: Chicago State **−12.89** (#353). Top 10 identical under end-of-game-only ranking but reordered; middling teams move most: Central Florida 8.16 (#22 → #40 end-of-game), Illinois 5.58 (#52 → #72), Stanford 1.78 (#132 → #92, +40), Northern Colorado −0.24 (#167 → #191).
- Strength of schedule (scalar): Kansas **6.10** (#1), Michigan State **6.00**, Purdue **5.91**, Oklahoma **5.87**, Duke **5.80**; bottom Morgan State **−5.01** (#353). Top-10 SOS all from Big 12/Big Ten/ACC.
- Interpretation examples: Illinois's flat second-half rating = declining point differential offset by rising SOS; Northern Colorado (19–11 record, positive differential) rates only #167 because of weak schedule (−2.71 SOS, #316).
- Prediction caveat (authors' own): predicted game-flow curves (e.g., Duke vs. Virginia, Figure 8) are averages over many hypothetical games and "probably not the most accurate representation of an actual game" — they cannot reproduce realistic scoring runs.

## 8. Code / data availability
None stated. No repository, no compiled dataset release. Methods cite Ramsay & Silverman (2005) FDA textbook; data scraped from Sports-Reference/ESPN/school sites without a sharing link.

## 9. Leakage & limitations
- **No predictive validation at all** — the paper never tests whether functional ratings predict anything. The entire contribution is descriptive curve-fitting; for GSE's purposes (ratings that price games) this is disqualifying without a backtest.
- **Overtime handling is crude**: deleting OT data and calling it a tie distorts close-game ratings — precisely the games most informative about team strength.
- **Documented measurement error**: same-timestamp scoring bursts smear point advantages over long intervals (their own North Alabama example); one game has only 4 data points.
- **ANOVA without multiple-testing correction**: ~2,400 pointwise F-tests interpreted at face value; the "first minute / first 20 seconds" exceptions are hand-waved.
- **Smoothing chosen by "trial and error"** — no cross-validated bandwidth/knot selection.
- **External validity to NFL**: essentially none. The method needs continuous within-game score functions and hundreds of teams with ~30 games each; the NFL has 32 teams × 17 games and discrete scoring — the scalar least-squares rating (Massey) already covers this setting, and the functional twist buys nothing when score functions are step functions with ~8–10 scoring events per game. The authors' own suggested extension ("football or soccer") is speculative and untested.
- **Undergraduate scope**: the paper reads as a class project (University of Sioux Falls fellowship) — competent execution of a known method, no methodological novelty beyond "make the rating a function of time."

## 10. GSE overlap
Duplicate of covered ground, with a twist that adds no value. Per the existing-research map, least-squares/score-differential team ratings are deeply inventoried: **Massey, Sagarin, Colley, Harville (1980), Stefani (1977/1980)** — the exact lineage this paper extends — plus Elo, Bradley-Terry, SP+, FEI, and market-implied tiers. GSE's state-space team-strength work (Lopez/Baumer 1701.05976, dynamic Elo, Kalman filters) already handles *time-varying* strength properly. The functional-rating twist (strength as a function of *within-game* time) answers a question GSE doesn't ask: GSE prices full games and needs ratings that predict final margins, which the paper never validates. The one potentially reusable piece — the β = average-differential + SOS decomposition (equations 6–8) — is standard least-squares algebra already implicit in every Massey-style implementation. File as duplicate; do not build.

## 11. GSE implementation spec
No build recommended (REJECT verdict). If a future analyst wants the single salvageable idea — within-game strength curves — the honest implementation would be: fit the paper's Model 2 on NFL data using nflverse play-by-play-derived per-minute score differentials (2015–2024), solve pointwise least squares with the Σβ_i(t)=0 constraint, smooth with penalized B-splines (GCV-selected, not trial-and-error), and backtest whether β_i(T) predicts next-week margins better than scalar Massey. Estimated effort: ~1 week. Expected outcome per §9: no gain — do not prioritize; this spec exists only to make the rejection falsifiable.

## 12. Reproducible test
The falsifiability check for the rejection: implement Model 2 on 2023 NFL regular-season data (per-minute score differentials from nflverse), compute scalar ratings (w=1) and end-of-game ratings β_i(T), and backtest against weeks 14–18 point spreads: metric = mean squared error of (predicted margin − actual margin) vs. the benchmark of nflverse's built-in Elo/Massey-style ratings over the same window. If the functional approach cannot beat the scalar benchmark, the rejection stands. This test is runnable but explicitly deprioritized — it exists to keep the REJECT verdict honest, not as a work item.

## 13. Acceptance / rejection gate
**Reject** unless the reproducible test shows the functional scalar rating beats the scalar least-squares benchmark by ≥0.3 points of RMSE on 2023 weeks 14–18 *and* the within-game curves add a documented use case (e.g., live-betting in-game margin forecasts — a lane GSE has flagged as thin). **Adopt nothing** on the paper's own evidence, since it contains zero predictive validation. Default state: rejected; the paper stays in the corpus only as a least-squares-rating reference.

## 14. Improvement experiment
If the rejection were ever revisited, the experiment that could redeem the idea: replace the paper's descriptive pointwise fit with a **functional concurrent regression with a win-probability link** — model P(home win | score-differential curve up to time t) as a function of the *shape* of β_i(s), s ≤ t, and test whether curve shape (e.g., "second-half team" slope) predicts comeback probability beyond the current margin. This converts the paper's descriptive curves into a genuine in-play forecasting feature. Test: out-of-sample log-loss on 2024 in-play win probability vs. a current-margin-only baseline. Even here, expectation is null — but it is the only version of this paper that could matter for GSE's thin in-play lane.
