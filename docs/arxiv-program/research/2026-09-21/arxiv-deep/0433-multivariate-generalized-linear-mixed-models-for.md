# [0433] Multivariate Generalized Linear Mixed Models for Joint Estimation of Sporting Outcomes (arXiv:1710.05284v1)

**Citation:** Broatch, Karl (2017). *Multivariate Generalized Linear Mixed Models for Joint Estimation of Sporting Outcomes*. arXiv:1710.05284v1. URL: https://arxiv.org/abs/1710.05284v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2070 lines).
**Verdict:** ADAPT — joint modeling of win-propensity with unit-level latent ratings via correlated team random effects is worth porting to NFL team strength; adapt by fitting on NFL/nflverse with modern Laplace/VI and by testing whether joint efficiency+outcome modeling beats today's GSE team-strength construction.

## 1. Research question
Does jointly modeling binary win/loss outcomes together with game-level responses (yards per play, sacks, fumbles, scores) via correlated team-level random effects improve cross-validated prediction of both responses, versus modeling each response alone? And can the joint model test whether offense/defense latent ratings correlate with win propensity at the team level (hierarchical inference, not just game-level prediction)?

## 2. Dataset / schema
- NCAA football 2005–2013 (9 seasons; sections 4 tables report 2005–2013, fitted independently per season). Data from cfbstats.com, maintained at github.com/10-01/NCAA-Football-Analytics. Game-level responses: yards per play, sacks, fumbles, scores + binary home-win indicator.
- 19 NCAA men's basketball tournaments (1996–2014) for the tournament-prediction experiment: team scores + discretized home-win indicators.
Schema: home/away team ids, home/away responses (scores, YPP, sacks, fumbles), binary home win, neutral-site indicator. Bowl games excluded (football); inter-division games ignored in the 2012 demo.

## 3. Method / model
Multivariate GLMM: each team j has (b_j^o offensive, b_j^d defensive, b_j^w win-propensity) ~ N_3(0, G*) with unstructured 3×3 covariance (block-diagonal G over p teams). Game-level sub-model: bivariate normal (bivariate scores with intra-game correlation R*) or Poisson with log link (optionally + game-level random effect a_i ~ N(0, σ²_g) for intra-game correlation), fixed effects β = (mean home, mean away, mean neutral). Binary sub-model: probit on home-win indicator, Φ⁻¹(π_i) = W_i α + S_i b, design S picks b^w_l − b^w_a. Joint likelihood L(β,G,R) = ∫ f(y|b) f(r|b) f(b) db — conditional independence given the correlated random effects. Fit via EM with first-order and fully exponential Laplace approximations (Tierney et al. 1989; Karl et al. 2014), implemented in the R package mvglmmRank (CRAN). Multiple-membership design (Browne et al. 2001). A singular Hessian flags empirical underidentification (score+win models are nearly collinear) — predictions still used. Evaluation: 10-fold CV per season; log-loss (eq. 5) for win probs, sign test at α=0.05 on median log-loss differences and absolute residuals.

## 4. Equations & assumptions
Heuristic ratings: E[y_ih] = f_1(b^0_h − b^d_a); E[y_ia] = f_1(b^o_a − b^d_h); P(r_i=1) = f_2(b^w_h − b^w_a).
b_j = (b^o_j, b^d_j, b^w_j)′ ~ N_3(0, G*); G = block-diag(G*,…,G*).
Normal: y_i|b ~ N_2(X_i β + Z_i b, R*); Poisson: y_{i*}|b ~ Poisson(μ_{i*}), log μ_{i*} = X_{i*} β + Z_{i*} b (+ optional game effect a_i).
Binary probit: r_i|b ~ Bin(1, π_i), Φ⁻¹(π_i) = W_i α + S_i b; f(r|b) = Π_i [Φ{(−1)^{1−r_i}[W_i α + S_i b]}].
Joint: L(β,G,R) = ∫⋯∫ f(y|b) f(r|b) f(b) db.
Log-loss_i = −y_i log(ŷ_i) − (1−y_i) log(1−ŷ_i).
Stated assumptions: conditional independence of responses given team random effects; random effects multivariate normal (regularizes undefeated/winless teams); matches independent given effects; multiple-membership structure; fixed effects limited to home/away/neutral means; neutral-site arbitrary home/away designation.

## 5. Features / target
Inputs: team identities (home/away/neutral) only — no player, weather, or situational covariates. Targets: (a) binary home-win probability; (b) game-level responses (yards per play, sacks, fumbles, scores) for home and away teams. Tournament experiment: bracket probabilities for every possible pairing.

## 6. Validation design
10-fold cross-validation within each of 9 college football seasons (models refit per season); log-loss on holdout win probabilities, absolute residuals for game-level responses; sign tests (α=0.05) on median differences. Basketball: 19 tournaments 1996–2014, compare NB vs B by yearly log-loss difference (t-test on yearly differences). No explicit time-ordering within CV folds (fold-based, not walk-forward) — folds are game-level, so some in-season leakage across folds is possible (team effects estimated with in-season data, which is standard for ratings but not strictly out-of-sample temporally). Multiple comparisons across 8–9 seasons not corrected (acknowledged).

## 7. Numerical results / baselines
- YPP + win (NB vs N/B, Table 1): NB beats B on win log-loss in ALL years 2005–2013 (significant, marked NB*); NB beats N on YPP absolute residuals in all but 2006 (significant in 2007, 2010, 2013; "NB*" rows). Home teams record more YPP (p<0.0001 all years); intra-game opponent YPP correlation 0.05–0.15 (weak).
- Sacks + win (Table 2): PB0 beats B on win log-loss significantly in every year 2005–2013; PB0 beats P0 on sack residuals in every year (significant in 2010, 2012). Game-level random effect (PB1) hurts — no intra-game sack correlation. Home-team sack frequency higher (significant 2007, 2008, 2009, 2011).
- Fumbles + win (Table 3): no significant win-log-loss improvement in any season; P0 beats P1 most years (no intra-game fumble correlation); home-field effect on fumbles never significant. Deliberately chosen as the "irrelevant response" control — p-values look uniform as expected.
- Scores + win (Table 4): PB1 beats B on win log-loss significantly in all years (despite near-singular Hessian); ordering: score-model > YPP-model > sack-model on win log-loss improvement. P1 (with game effect) beats P0 on score residuals every year (significant in 4) — real intra-game score correlation.
- 2005 random-effect correlations (Table 5): YPP model: corr(off,win)=0.85, corr(def,win)=0.82, corr(off,def)=0.50. Sacks: corr("off"→defensive sack propensity, win)=0.89, corr(def,win)=0.61, corr(off,def)=0.42. Fumbles: corr(off,win)=−0.31, corr(def,win)=−0.79, corr(off,def)=−0.10 (near-noise, consistent with null result). Scores: corr(off,win)=0.94, corr(def,win)=0.90, corr(off,def)=0.71 (CFB; NBA −0.3 noted).
- Intra-game YPP correlation (R*): 0.17 (2005), 0.04 (2006), 0.13 (2007).
- NCAA tournament: joint NB beats binary-only B in 17 of 19 tournaments (1996–2014); t-test on yearly log-loss differences p=0.0002.
- Fully exponential Laplace corrections improved 17 of 18 basketball binary models; binary-only win-propensity variance estimates: 0.43 (1st-order), 0.63 (partial), 0.65 (full) Laplace — joint modeling inflates the variance component like a better approximation does.
- Worked demo: 2012 Alabama–Notre Dame national championship, NB model predicted Notre Dame 4.81 / Alabama 5.68 (yards per play? — demo uses YPP) with 22.2% Notre Dame win prob; binary-only model predicted 62.5% Notre Dame win (wrong; Alabama won).

## 8. Code / data availability
Code: R package mvglmmRank on CRAN (full fitting/prediction API demonstrated in Appendix A). Data: CFB 2005–2013 at github.com/10-01/NCAA-Football-Analytics. NCAA tournament scores not linked.

## 9. Leakage & limitations
Adversarial read: (1) 10-fold CV is game-level, not temporal — team effects are estimated using data from later in the same season, so "out-of-sample" is weaker than a true walk-forward; real forecasting performance would be worse. (2) Multiple-comparison problem acknowledged but uncorrected across 9 seasons × 4 response pairs. (3) Score+win joint model has near-singular Hessian (win ≈ discretized score difference) — parameter estimates unstable; the win-propensity/offense/defense correlations are identified mainly by regularization, yet the paper leans on their interpretation. (4) Small college-football seasons (~12 games/team) mean the variance-component estimates rest on thin data; NFL (17 games) is only marginally better. (5) No covariates beyond home/away/neutral — no schedule-strength modeling beyond what random effects imply (Harville-style, but not compared to richer models). (6) Probit link + EM + Laplace is computationally heavy; the R package may not scale to NFL-scale with more responses without reimplementation. (7) Fumbles result is a clean null — good negative control, but it also shows the method adds nothing when the response is irrelevant (obvious but worth stating: joint modeling only helps when the auxiliary response actually correlates with winning). (8) External validity: CFB 2005–2013 and CBB tournaments; NFL has fewer teams, more parity, salary cap — correlations like off/def 0.71 may not hold.

## 10. GSE overlap
The repo's ML brief lists "hierarchical pooling" and "state-space team strength" as commissioned topics; gse-lab computes unit metrics but no joint hierarchical team-strength model exists. Rating-system inventory (Elo/Glicko/TrueSkill/Bradley-Terry/nfelo/Dixon-Coles/Skellam) covers outcome-only models, not joint outcome+efficiency models with correlated random effects. The 58-paper dossiers include Lopez/Baumer state-space (1701.05976) but not this correlated-random-effects joint GLMM. Status: **extension** — new statistical machinery (joint multivariate GLMM with correlated offense/defense/win-propensity effects) for team strength, adjacent to existing hierarchical-pooling/state-space topics but not duplicating any.

## 11. GSE implementation spec
1. Data: nflverse pbp 2015–2025; game-level responses: EPA/play (normal), success rate, pressure rate, turnover margin (Poisson/binomial), win/loss indicator.
2. Model: per-season joint model — offense/defense random effects for EPA/play + win-propensity, unstructured 3×3 G; add a second response (e.g., pressure rate) with its own off/def effects (5×5 G). Reimplement with modern tools (brms/Stan or TMB for speed, not the aging CRAN package).
3. Fit protocol: expanding-window per season (week ≥ 4), ratings updated weekly; home/away/neutral fixed effects.
4. Serving: weekly ratings feed into the engine's team-strength module; win-propensity effects as an alternative spread/total input; correlation estimates (off–win, def–win) reported in the benchmark lane.
5. Validation: compare vs current GSE team-strength on 2024–2025 walk-forward (see §12).
Estimated effort: 1–2 weeks (Stan/TMB implementation + weekly refit harness + benchmark comparison).

## 12. Reproducible test
Dataset: nflverse 2020–2025 regular season; game-level response = offensive EPA/play (normal), binary = win/loss. Metric: log-loss on holdout win probabilities + Brier; baseline = binary-only probit/GLMM (same structure, G off-diagonals = 0) AND GSE's current team-strength win probabilities. Window: expanding walk-forward, evaluate weeks 5–18 of 2024 and 2025. Success: joint model beats both baselines on log-loss (sign test on game-level log-loss differences, α=0.05, mirroring the paper).

## 13. Acceptance / rejection gate
ADOPT the joint team-strength model if on 2024–2025 walk-forward it beats the binary-only baseline by ≥0.002 log-loss (paired, significant at 0.05) and beats GSE's current team-strength input by ≥0.001; ADAPT (keep as an auxiliary ensemble input rather than replacing the module) if it beats the binary baseline but not GSE's current input; REJECT if it fails to beat the binary-only baseline (auxiliary responses add nothing beyond outcomes in NFL).

## 14. Improvement experiment
Beyond the paper: (1) replace per-season refits with a dynamic state-space extension — random-walk team effects over weeks (Kalman/particle) inside the joint model, merging this paper with the map's state-space lane (1701.05976); (2) use the posterior correlation matrix to decompose *why* a team wins (e.g., 2025 Chiefs: is corr(def, win) > corr(off, win)?) as a matchup-narrative feature for the content lane; (3) add a third response — special-teams EPA — to test whether ST latent effects correlate with win propensity (map says ST EPA is computed but its predictive role is untested).
