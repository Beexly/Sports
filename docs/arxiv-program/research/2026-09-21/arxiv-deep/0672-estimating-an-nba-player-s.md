# [0672] Estimating an NBA player's impact on his team's chances of winning (arXiv:1604.03186)

**Citation:** Sameer K. Deshpande, Shane T. Jensen (2016). *Estimating an NBA player's impact on his team's chances of winning*. arXiv:1604.03186. URL: https://arxiv.org/abs/1604.03186
**Ledger completed:** 2026-09-21. **Read:** full text (local cache /tmp/arxiv750-cache/fulltext/1604.03186.txt, all sections 1–7 plus residual-diagnostics appendices: log-odds/inverse-logit transforms, normal-quantile plots, three heteroscedasticity re-weighting schemes y(4)–y(6) — none found compelling).
**Verdict:** ADAPT — win-probability-scale adjusted plus-minus with leverage profiles and the Sharpe-like Impact Score transfers directly to NFL player valuation (WPA-based adjusted ratings per snap/play); adopt the methodology, not the NBA numbers.

## 1. Research question
How much does each NBA player help his team's chances of winning, after controlling for teammates and opponents — replacing context-blind metrics (PER, raw plus-minus) with a win-probability framework that down-weights garbage time and up-weights high-leverage play?

## 2. Dataset / schema
ESPN play-by-play, 8,365 of 9,840 scheduled regular-season games (85%), seasons 2006–07 through 2013–14. Missing 15% mostly early-window games; authors state no systematic exclusion. Win probability surface estimated from 2006–07 to 2012–13; analysis on n=35,799 shifts in 2013–14 (a shift = period between substitutions; ~31 shifts/game; 29,453 unique ten-player combinations). 488 players, 30 teams. Access: scraped ESPN data (proprietary-ish; replicable for NFL with nflverse play-by-play).

## 3. Method / model
Shift-level Bayesian linear regression: y_i | P^i, T^i ~ N(μ + P^i'θ + T^i'τ, σ²), where y_i = change in home-team win probability during shift i, P^i is a signed player indicator (+1 home, −1 away), T^i a signed team indicator, θ the 488 player partial effects, τ the 30 team effects, μ league-average home-court advantage. Independent Laplace priors on θ, τ (conditional on σ²) — the Bayesian lasso — with Gamma(r,δ) hyper-prior on λ² and non-informative priors on σ², r, δ; fitted by the Park & Casella (2008) Gibbs sampler (monomvn R package). Win probability p_{T,L} estimated by a middle ground between raw empirical and Stern (1994) probit: binomial counts in a [T−3,T+3]×[L−2,L+2] window with a Beta prior contributing 350 pseudo-games (10 per unit cell; ℓ<−20 all losses, ℓ>20 all wins, else 5/5), posterior mean p̂_{T,L}. Novel outputs: leverage profiles (summary of shift contexts per player) with Mahalanobis-distance similarity for fair comparisons; Impact Ranking (team-internal rank by posterior frequency); Impact Score = posterior mean / posterior SD of a player's partial effect (finance Sharpe ratio analogue); five-man lineup effects by summing posterior samples.

## 4. Equations & assumptions
- E[y_i|h_i,a_i] = μ_i + θ_{h_i1}+...+θ_{h_i5} − θ_{a_i1}−...−θ_{a_i5} (Eq. 1).
- y_i|P^i,T^i ~ N(μ + P^i'θ + T^i'τ, σ²) (Eq. 2).
- p(θ,τ|σ²) ∝ (λ/σ)^488 exp(−λ/(2σ)·Σ|θ_j|) × (λ/σ)^30 exp(−λ/(2σ)·Σ|τ_k|) — Laplace priors; MAP = lasso.
- p̂_{T,L} = (n_{T,L}+α_{T,L})/(N_{T,L}+α_{T,L}+β_{T,L}), α+β=350 pseudo-games.
- Impact Score = E[θ_j|data] / SD[θ_j|data].
- Assumptions: y_i independent across shifts (empirical lag-1 autocorrelation −0.1, acknowledged as "not technically correct" but palatable); conditional Gaussian with constant variance (29,453 unique lineups make direct checking impossible); shift duration deliberately excluded (a 20% WP swing in 15s = same impact as in 30s); player effect measured relative to team average; estimates are retrospective/context-dependent, NOT latent talent, unsuitable for forecasting.

## 5. Features / target
Features: signed player-on-court indicators (488), signed team indicators (30). Target: shift-level change in home-team win probability (bounded in [−1,1]). Prediction horizon: none — retrospective accounting, explicitly not forecasting.

## 6. Validation design
No train/test split — full Bayesian fit on 2013–14; uncertainty via 1,000 posterior samples. Comparisons against PER and RPM (external metrics), year-to-year stability (2012–13 vs 2013–14, n=389 overlapping players) with a 500,000-permutation null test, multi-season windows (2008–09 to 2010–11 vs 2011–12 to 2013–14), and posterior-predictive lineup matchup densities. Metrics: correlations, credible intervals, Impact Scores.

## 7. Numerical results / baselines
Top 2013–14 Impact Scores: Dirk Nowitzki 2.329, Patrick Patterson 1.939, Iman Shumpert 1.823, Chris Bosh 1.802, Manu Ginobili 1.779; LeBron James 1.324 (14th), Kevin Durant 1.410. Impact Score correlation with RPM: 0.655; with PER: 0.226. Example: Shumpert (mean 0.0063, SD 0.0034) outranks Bosh (mean 0.0069, SD 0.0039) on Impact Score — uncertainty penalised. Year-to-year correlation 0.242, significant vs permutation null (500k samples); multi-season correlation 0.45; LeBron multi-season Impact Score 5.400 (2008–11), 3.085 (2011–14). Rank credible intervals very wide: LeBron rank [3,317], Durant [2,300], Nowitzki [1,158] — posterior means alone cannot rank. Top lineup: Curry–Thompson–Iguodala–Lee–Bogut Impact Score 2.98 (780.25 min); vs second lineup Paul–Reddick–Barnes–Griffin–Jordan (2.88, 88.57 min): posterior predictive change in WP positive only ~45% of the time for the #1 lineup at home. Garbage-time check: DeAndre Liggins PER 129.47 (84 seconds at 96.7% WP) → Impact Score ≈ 0. All matchup posterior predictive densities supported within [−0.4, 0.4].

## 8. Code / data availability
None stated (uses monomvn R package by others). Data: ESPN play-by-play scraped by authors.

## 9. Leakage & limitations
Explicitly retrospective — authors warn estimates "do not attempt to measure a player's latent ability" and are "unsuitable for forecasting", the exact property GSE needs most; year-to-year correlation 0.242 vs PER's 0.75 confirms it. Shift-independence assumption violated (lag-1 −0.1). Shift duration excluded by design choice, debatable. 15% of games missing. WP surface not guaranteed monotonic. Laplace prior chosen partly for sampler availability, not optimality (elastic net preferred in principle). Single season 2013–14; NBA only — transfer to NFL (11-man units, no clean shifts) requires re-derivation. Gaussian predictive draws can in principle exit [−1,1] (empirically they don't). Residual-diagnostics appendix: log-odds and inverse-logit transforms of y were tried (not compelling vs Gaussian); Q-Q plots non-linear (decidedly less Gaussian for y(2)); three variance re-weightings (y(4) re-scale to SD 1, y(5) to 0.03, y(6) to 0.12) produced even less well-behaved residuals — original model retained.

## 10. GSE overlap
Existing-research-map covers WPA²/GLI leverage work (falsified in the discovery lane), EPA, and player ratings; no win-probability-scale adjusted plus-minus ledger found. This is a new method for the ratings/player-evaluation lane: regularised WP-added regression with uncertainty-aware ranking. Complements 0667 (blocker-rusher BT) rather than duplicating — different granularity (game-context accounting vs interaction outcomes). The explicit "retrospective, not predictive" warning is directly relevant to how GSE should frame any similar metric.

## 11. GSE implementation spec
NFL adaptation: define "shifts" as drives (or EPA-segmented possessions) from nflverse 2015–2025; y_i = change in win probability over the drive (use nflfastR WP); regress onto signed player-group indicators — full 22-man infeasible, so use positional-unit indicators (QB, OL unit, skill group, DL, LB, secondary per team) with Laplace priors, plus team effects. Fit with Bayesian lasso (or frequentist elastic net for speed). Outputs: unit-level Impact Scores (mean/SD), leverage profiles per unit (average starting WP, average |ΔWP|, drive count) with Mahalanobis similarity for fair unit comparisons, and lineup-vs-lineup posterior predictive matchup densities for game-planning content. Effort: ~1 week for drive-level prototype.

## 12. Reproducible test
Dataset: nflverse 2018–2024, drives as shifts, nflfastR WP. Metric: posterior SD of unit effects and year-to-year correlation of unit Impact Scores (2018–2021 vs 2022–2024). Baseline to beat: year-to-year correlation must exceed the paper's 0.242 to justify a predictive use; if below, publish as retrospective accounting only.

## 13. Acceptance / rejection gate
Adopt unit Impact Scores for GSE content/ratings if year-to-year correlation ≥ 0.30 on the 2018–2024 test AND 95% credible intervals exclude zero for at least 20% of starting units; otherwise report as descriptive only, never as a predictive rating.

## 14. Improvement experiment
Replace the paper's shift-independence assumption with a hierarchical AR(1) on drive residuals within games, and replace Laplace with a horseshoe prior (better separation of stars from replacement-level in sparse-signal regimes); test whether the horseshoe shrinks the wide rank intervals ([3,317] for LeBron) enough to make single-season rankings decision-usable.
