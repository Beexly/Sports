# [1518] Using Conformal Win Probability to Predict the Winners of the Cancelled 2020 NCAA Basketball Tournaments (arXiv:2208.08598)

**Citation:** Chancellor Johnstone, Dan Nettleton (2022, rev. Aug 2026). *Using Conformal Win Probability to Predict the Winners of the Cancelled 2020 NCAA Basketball Tournaments*. arXiv:2208.08598v1. URL: https://arxiv.org/abs/2208.08598
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML; ~7,800 words, all sections incl. equations, tables, references).
**Verdict:** ADAPT — build NFL conformal win probability off margin-of-victory CPDs (win prob = 1 − π(0, 1/2)) and reuse the closed-form Poisson-binomial field probability; do not copy the static full-season team-strength model.

## 1. Research question
How can one produce honest, distribution-free single-game win probabilities (and closed-form tournament-field/tournament-win probabilities) for NCAA basketball, and does conformal predictive distribution (CPD) win probability beat logistic/linear-regression win probabilities on calibration?

## 2. Dataset / schema
Two fully audited new datasets: observed margins of victory for NCAA Division 1 men's and women's basketball, 2014–2015 season through 2020–2021 (7 seasons each). Schema per game: home team, away team, margin of victory (home − away), period/week, neutral-site flag. Used 2019–2020 regular season to fit team strengths; post-season games of all 7 seasons as the evaluation set for win-probability calibration. Public via the paper's GitHub repo (see §8). A secondary case study reconstructs the cancelled 2020 March Madness fields from the point conference tournaments stopped (20 men's / 18 women's automatic bids undecided).

## 3. Method / model
(1) Team strength via linear margin-of-victory model y_uvw = x_uvw′β + ε_uvw with x encoding home-court μ plus θ_u − θ_v strength differentials (Harville-style, Eq. 16/17). (2) Conformal win probability: build a CPD π_w(y_c, τ) over margin of victory using conformity scores R = y − ŷ (signed residual, τ=1/2 mid-p-value smoothing), then win prob for home team u = 1 − π_w(0, 1/2). (3) Closed-form tournament-win probability via Edwards (1991) recursion q_uJ = q_u(J−1)·Σ_s p_us·q_s(J−1) (Eq. 3) — zero Monte Carlo error. (4) Closed-form March-Madness-field probability: P(F_u=1) = P(C_u=1) + P(L_u ≤ t_u) − P(C_u=1, L_u ≤ t_u), where the "upset count" L_u is a Poisson-binomial sum of independent non-identical Bernoullis over the 32 conference tournaments (Eqs. 4–8).

## 4. Equations & assumptions
- Conformal p-value: π(y_c, τ) = (n+1)^{-1} Σ_{i=1}^{n+1} [𝕀{R_i(y_c) < R_{n+1}(y_c)} + τ·𝕀{R_i(y_c) = R_{n+1}(y_c)}] (Eq. 11).
- Coverage guarantee: P(y_{n+1} ∈ C_{1−α,τ}(x_{n+1})) ≥ 1 − α (Eq. 13); requires only exchangeability of D_n ∪ {(x_{n+1}, y_{n+1})}.
- Normal-linear predictive probability: P(y_{n+1} > s) = 1 − F_{t,n−p}((s − ŷ_{n+1})/(σ̂√(1+x′_{n+1}(X′X)^{−}x_{n+1}))) (Eq. 14); assumes GMMNE (mean-zero independent normal errors).
- Logistic: logit(p_i) = x_i′β, p̂_i = e^{x_i′β̂}/(1+e^{x_i′β̂}) (Eq. 15); assumes independent Bernoulli outcomes.
- Calibration definition: E_p̂[|P(ẑ=z | p̂=p) − p|] = 0 (Eq. 21, Guo et al. 2017).
- Log-loss: logL(p̂, z) = z·log(p̂) + (1−z)·log(1−p̂) (Eq. 22).
- Stated assumptions: exchangeability of games within a period (CPD validity); conference-tournament outcomes independent across conferences; higher-ranked at-large bids fill the field before lower-ranked; team strengths fixed after regular season.

## 5. Features / target
Features: team identity pairs (home u, away v), week/period, neutral-site indicator. Derived: estimated team strengths θ̂_u − θ̂_v and home-court μ. Target: margin of victory y_uvw (home − away); event probability target is 𝕀{y > 0} (home win) and, for spread betting, 𝕀{y ≤ −s}.

## 6. Validation design
Fit team strengths on each season's regular-season games; generate win probabilities for every post-season game of that season across all 7 seasons × 2 leagues. Reliability diagrams with bin width 0.025 (Figure 7). Relative log-loss = method log-loss / minimum log-loss across the three methods, broken out by season × league (Figure 8) and pooled by league (Table 7). Baselines: linear regression with normal-error predictive distribution, logistic regression on 𝕀{MOV>0}.

## 7. Numerical results / baselines
- Reliability plots (Figure 7): all three methods comparable at high win probabilities; conformal win probability markedly better calibrated at LOW win probabilities (points sit closest to the diagonal).
- Relative log-loss by season×league (Figure 8): conformal best in all combinations except women's 2015–16 and men's 2020–21; even there, within 1% of the best method.
- Pooled relative log-loss (Table 7): Women — conformal 1.00, linear 1.01, logistic 1.02. Men — conformal 1.00, linear 1.02, logistic 1.03.
- 2020 case study: women's top strengths Baylor 40.68, South Carolina 40.30, Oregon 39.32; men's Kansas 25.26 (rank 1 in all three exemplar + expert brackets' tournament-win columns), Gonzaga 22.79, Duke 22.31. Tournament-win probabilities stable across brackets (e.g., women's Baylor 0.289/0.289/0.289/0.277/0.303/0.221 across 6 brackets; South Carolina 0.278/0.277/0.278/0.267/0.276/0.304).

## 8. Code / data availability
R code + both audited datasets: https://github.com/chancejohnstone/marchmadnessconformal. (Paper states this explicitly.)

## 9. Leakage & limitations
- Team strengths estimated on the full regular season then used for post-season probabilities — no leakage (time-ordered), but strengths are static: no in-tournament updating (authors admit this).
- Exchangeability of games within a season is shaky (injuries, form, schedule structure); the empirical calibration suggests it's "close enough" but the guarantee is only as good as exchangeability.
- At-large selection modeled as deterministic rank-order — ignores the committee's subjectivity; the paper is honest about this.
- Only compares against two weak baselines (plain linear/logistic); no comparison vs. KenPom-style efficiency models or Elo.
- Relevance to NFL: basketball has ~30 games/team/season (rich data); NFL has 17 — exchangeability and the empirical CDF are thinner. CPDs on 17-game residuals are coarse.

## 10. GSE overlap
GSE already runs conformal machinery — cqr.ts (conformalized quantile regression) with a coverage bug caught and fix-specced in the 2026-09-21 Drive deep reads (clamping rank to n−1, falsely certifying 90% coverage at 83.33%). The arXiv existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has a calibration cluster; this paper's CPD-on-MOV construction is a different object from CQR: it yields full predictive CDFs and arbitrary threshold probabilities (win, cover spread) rather than fixed-level intervals. Complementary, not duplicate.

## 11. GSE implementation spec
- Data: nflverse play-by-play → game-level score differentials (home − away), neutral-site flags, week numbers, 2015–2025 seasons.
- Model: fit y_uvw = μ_w + θ_uw − θ_vw + ε on rolling trailing windows (e.g., last 2 seasons + current season to date) via OLS; team-strength vector re-fit weekly (addresses the paper's static-strength weakness).
- CPD engine: for each upcoming game, build π(y_c, 1/2) over a grid of candidate MOV values using signed residuals; moneyline prob = 1 − π(0, 1/2); spread-cover prob at line s = π(−s, 1/2); total prob via analogous construction on game totals.
- Serving: precompute the residual CDF per week; per-game evaluation is a table lookup + interpolation (cheap).
- Closed-form parlay/propagation: reuse Eq. 3 recursion for any fixed-bracket contest (e.g., playoff brackets) instead of Monte Carlo.
- Effort: ~1–2 days for the CPD win-prob module (pure NumPy/TypeScript), plus weekly refit pipeline.

## 12. Reproducible test
Dataset: nflverse games 2019–2024, weekly walk-forward. For each game from week 5 onward, fit strengths on prior games of the current + previous season, emit conformal moneyline prob vs. logistic-regression baseline on the same strength features. Metrics: pooled relative log-loss (paper's Table 7 protocol) + reliability-diagram ECE at 0.05 bins on held-out games. Pass bar: conformal relative log-loss ≤ 1.00 vs. logistic ≥ 1.01.

## 13. Acceptance / rejection gate
ADOPT the CPD win-probability head into the GSE engine if, on 2021–2024 walk-forward, its log-loss is ≥1% better than the logistic baseline AND its low-probability calibration (predicted 0.05–0.35 bucket) has |observed − predicted| ≤ 0.03 in every bucket; otherwise reject and keep logistic.

## 14. Improvement experiment
Go beyond the paper: replace OLS strengths with time-decayed weighted least squares (recency weighting, cf. the paper's fused-lasso future-work note) and conformalize the weighted residuals with locally-weighted conformity scores; test whether log-loss improves further on weeks 12–18 where late-season form shifts matter most. Second: extend π to bivariate (margin, total) for same-game parlay pricing GSE refuses to sell but can use to educate followers on fair parlay odds.
