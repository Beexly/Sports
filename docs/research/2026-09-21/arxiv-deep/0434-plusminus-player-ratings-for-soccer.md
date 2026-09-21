# [0434] Plus-Minus Player Ratings for Soccer (arXiv:1706.04943v1)

**Citation:** Kharrat, López Peña, McHale (2017). *Plus-Minus Player Ratings for Soccer*. arXiv:1706.04943v1. URL: https://arxiv.org/abs/1706.04943v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2186 lines).
**Verdict:** ADAPT — the ridge-regularized adjusted plus-minus machinery (segments, time decay, situational dummies) is worth porting to NFL snap-level on/off splits as a complement to nflWAR-style EPA attribution; the soccer xG/xP targets and results are not transferable.

## 1. Research question
Can the plus-minus rating concept from basketball/ice-hockey be adapted to soccer, where scoring is rare and lineup segments are long? The authors build (a) a regularized adjusted plus-minus on goal differential, (b) an expected-goals plus-minus (xGPM) with net xG per segment as target, and (c) an expected-points plus-minus (xPPM) using changes in in-play expected points as the target — then use them to rank European players and leagues.

## 2. Dataset / schema
11 European leagues, 2009/10–2016/17 (varying coverage): 20,868 games total (EPL 3,040; Bundesliga I 2,448; La Liga 3,039; Serie A 3,037; Bundesliga II 612; Championship 2,227; Eredivisie 1,242; Süper Lig 918; Liga NOS 306; Ligue 1 3,039; Russia PL 960). Per game: date, starting lineups, goal timings, substitution/red-card timings and player names. Shot data for xG model: 603,609 shots (61,466 goals, 10.2% conversion) from Opta F24 feed: (x,y) coordinates, shot type (penalty/free-kick/header/open play), Opta "big chance" flag; goalkeeper skills from EA SPORTS FIFA (diving, handling, kicking, positioning, reflexes). Segmentation produced 129,988 segments and N=10,983 players estimated.

## 3. Method / model
Segments = maximal intervals with fixed 22-player lineups (new segment on substitution, red card, new match). Target y_t per segment: goal differential per 90 min (PM), net xG per 90 (xGPM), or Δ expected points home − Δ expected points away (xPPM). Design matrix X (T×N): x_tj = +1 (home team), −1 (away), 0 (off pitch). Ridge regression α̂ = (XᵀX + λ²I)⁻¹Xᵀy (glmnet, multi-response Gaussian with group penalty); ridge preferred over lasso so always-together players (centre-back pairs) split credit equally. Extensions: time-decay weights w_i = exp(ζ(date_i − ratingDate)/3.5) in half-week units; red-card dummies (first/second/third dismissal, canceling on offset); home-advantage intercept; per-league strength coefficients identified via players moving between leagues (adapted = ≥6 games in competition that season or most games there in prior 18 months). Total parameters N+1+3+L.
xG model: four specialist classifiers (penalty/free-kick/header/open play) among logistic regression, random forest, gradient boosting, MLP, tuned by inner CV, scored by Brier; features: x, adjusted y, goal view angle, inverse distance, time, "goal value" (empirical win-prob swing), big-chance flag, keeper skills (shooter ability deliberately excluded to avoid feedback loop).
xP model: in-play win/draw/loss probabilities from a simplified Volf (2009) random point-process with proportional hazards on covariates: goal differential z_GD(t) ∈ {−3≤,…,≥3} and manpower z_MP(t); average (team-strength-free) probabilities; EPL t=0: P(HW)=0.46, P(D)=0.26, P(AW)=0.28 → xP 1.63 home / 1.11 away; xP^H_t = 3·P^HW_t + P^D_t; segment target y_[0,60] = ΔxP^H − ΔxP^A.
Hyperparameters λ, ζ tuned by using 2-year-window average PM ratings of starting XIs in an ordered-probit match-outcome model, minimizing out-of-sample Brier via 10-fold CV × 3 repeats.

## 4. Equations & assumptions
Raw PM example: ((−1/60)+(2/30))×90 = +4.5 per 90. Net PM = on-pitch PM − off-pitch PM.
Ridge: min ‖αx − y‖²₂ + λ‖x‖²₂ → α̂ = (XᵀX + λ²I)⁻¹Xᵀy.
w_i = exp(ζ(date_i − ratingDate)/3.5), half-week units.
xP^H_t = 3 × P^HW_t + 1 × P^D_t; y_[0,60] = ΔxP^H − ΔxP^A = (3P^HW_60 + P^D_60 − 3P^HW_0 − P^D_0) − (3P^AW_60 + P^D_60 − 3P^AW_0 − P^D_0).
Brier: BS = (1/N)Σ_iΣ_{r=1}^3 (p_{ti} − o_{ti})².
Stated assumptions: segment targets are conditionally exchangeable given lineups; ridge shrinkage direction is toward 0 (no positional priors); in-play xP uses average team strengths (no double counting); league adjustments identified only through movers; penalties treated as pure randomness.

## 5. Features / target
Inputs: segment lineup indicators (+ home intercept, 3 dismissal dummies, L league coefficients). Targets: (a) goal differential per 90, (b) net xG per 90, (c) change in expected points (home − away). xG sub-model features: shot location/angle/distance, big-chance flag, keeper skills, goal value, time. Prediction horizon: player ratings are retrospective/descriptive; the ordered-probit validation predicts next match outcomes.

## 6. Validation design
Hyperparameter tuning: 10-fold CV (repeated 3×) on ordered-probit match-outcome model using 2-year-window PM ratings of starting XIs; metric = out-of-sample Brier score vs bet365 de-vigged probabilities as market benchmark. xG classifiers: 10-fold CV with inner-loop hyperparameter tuning, Brier score vs empirical-frequency baselines per shot type. No temporal holdout for the ratings themselves; ratings are fit descriptively on the full sample with time decay.

## 7. Numerical results / baselines
- Tuning: best λ=0.042, ζ=0.002; ordered-probit with PM ratings: Brier 0.292 (sd 0.003) vs bet365 de-vigged 0.295 on the same games — essentially market-level.
- xG baselines (Brier) per shot type: penalty 0.1845–0.185 baseline; models barely beat it (best gradient boosting 0.1844) → "penalties are truly random." Free kick baseline 0.0564; best random forest 0.0555. Header baseline 0.1016; best random forest 0.0893 (goal view angle dominant). Open play baseline 0.0836; best neural net 0.0673 (dominant: inverse distance, view angle, big chance).
- Red-card effects (Table 4): first dismissal −1.25 (PM) / −1.18 (xGPM) / −0.12 (xPPM); second −0.16/−0.15/−0.01; third ≈ 0. Home advantage ≈ 0.006/0.005/0.0004 ("surprisingly very small").
- Player findings: Kanté top of goals-PM and xPPM in 2016–17; Messi top of xGPM; Ballon d'Or alternatives table (e.g., 2016: Kanté 0.915, Bravo 0.896, Suárez 0.890).
- League strength (meanPM): EPL 0.88, Bundesliga 0.75, La Liga 0.64, Serie A 0.64, Russia 0.54, Bundesliga II 0.53, Championship 0.48, Liga NOS 0.39, Ligue 1 0.29, Süper Lig 0.20, Eredivisie 0.11.

## 8. Code / data availability
Methods implemented in R (Matrix, glmnet), xG models in scikit-learn/xgboost/Keras. No code or data link stated in the paper. Proprietary inputs: Opta F24 feed, EA SPORTS keeper ratings.

## 9. Leakage & limitations
Adversarial read: (1) Ratings are descriptive, not predictive — fit on the full sample with only exponential time decay; the ordered-probit "validation" uses the same ratings window construction and is not a true walk-forward player forecast. (2) League-strength estimates rest on a thin mover sample and produce odd orderings (Bundesliga II > Ligue 1; Eredivisie weakest at 0.11) that look like identification artifacts of the mover design. (3) xPPM's near-zero home advantage and red-card effects are baked in by construction (initial xP already accounts for home edge), so the "findings" are partly definitional. (4) Penalty xG ≈ random is a null result dressed as insight. (5) Segments are long (few subs in soccer); ridge handles collinearity but the shrinkage direction (toward zero, equal split for always-together pairs) is a modeling choice that suppresses genuine superstar separation. (6) External validity to NFL: soccer has 90-minute segments with 22 fixed players; NFL has play-level substitution and discrete downs — segment structure does not transfer directly, though snap-level on/off does. (7) Proprietary Opta/EA data — not reproducible from public sources.

## 10. GSE overlap
The map's dedup list includes nflWAR (1802.00998, multinomial-logit EP foundation) — the closest existing player-valuation work — but no regularized adjusted plus-minus work exists in the repo. EPA/WPA on/off splits are computed in gse-lab only as aggregates, not as regression-adjusted player ratings. The xPPM idea (in-play expected-points target) connects to the in-game WP lane (iWinRNFL, 1906.05029) but no one has used WPA as a regression target for player ratings. Status: **extension** — new player-rating machinery (regularized APM on on/off segments) complementary to nflWAR-style EPA attribution.

## 11. GSE implementation spec
1. Data: nflverse pbp 2015–2025. Define "segments" as maximal play sequences with a fixed offensive personnel grouping on the field (track via nflverse participation or infer from personnel groupings); alternatively use per-play on/off with player fixed effects (11 offensive + 11 defensive dummies per play).
2. Target per play: EPA (or WPA) of the play, signed to the offense; fit separate offensive and defensive APM regressions.
3. Model: ridge regression of play EPA on player on/off dummies + game-state controls (down, distance, yardline, score, time — as fixed covariates, since unlike soccer the game state varies play to play), with half-week time decay weights per the paper.
4. Output: per-player regularized APM (EPA/play above average attributable to presence); compare vs nflWAR-style EPA attribution and vs PFF grades for sanity.
5. Use: player-prop adjustments (e.g., WR APM vs cornerback APM matchups), injury-replacement valuation.
Estimated effort: 1 week (nflverse participation data wrangling is the hard part; ridge fit is trivial).

## 12. Reproducible test
Dataset: nflverse pbp 2022–2025. Metric: out-of-sample (2025 season, ratings fit on ≤2024) — (a) correlation of player APM with 2025 EPA/play among players with ≥200 snaps; (b) whether adding team-level APM sums improves game-outcome log-loss over spread-only baseline. Baseline: raw on/off EPA splits (no regularization) and nflWAR-style attribution. Expect regularized APM to be more stable (lower variance, higher year-over-year correlation) than raw on/off.

## 13. Acceptance / rejection gate
ADAPT as a complementary player-valuation input if: (a) year-over-year correlation of player APM ≥ 0.35 (stability — the paper's core claim for ridge), and (b) team APM sums add ≥0.001 log-loss over the spread baseline on 2025 holdout; REJECT the NFL port if APM is dominated by nflWAR-style EPA attribution on both stability and predictive tests (i.e., the regression buys nothing over existing attribution).

## 14. Improvement experiment
Beyond the paper: (1) replace the zero-shrinkage target with positional priors (shrink toward position-group means, not zero) — fixes the paper's over-shrinkage of stars; (2) interaction terms for specific matchups (WR APM vs CB APM pairs, in the spirit of the paper's "which defensive pairing is most effective" future work) to produce matchup-adjusted prop edges; (3) use WPA rather than EPA as the target for a "clutch APM" variant and test whether clutch APM predicts playoff performance beyond EPA APM.
