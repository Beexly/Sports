# [0549] Score-Driven Rating System for Sports (arXiv:2604.09143v1)

**Citation:** Vladimír Holý, Michal Černý (2026). *Score-Driven Rating System for Sports*. arXiv:2604.09143v1. URL: https://arxiv.org/abs/2604.09143v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5669 lines).
**Verdict:** ADOPT — generalize GSE's Elo-family team ratings to score-driven updates so the same rating core handles win/loss, margin, and multi-outcome results with theoretically fair (zero-mean, zero-sum, reversion-to-true-skill) dynamics.

## 1. Research question
How to generalize the classical Elo rating system to arbitrary game outcomes (point differences, win/draw/loss, full rankings) using the score — the gradient of the log-likelihood — as the rating update mechanism. The paper derives the mathematical foundations of a score-driven rating system and proves its fairness properties (zero expected update, zero sum over players, reversion to unobserved true skill), with Elo shown to be the special case when a logistic link is used.

## 2. Dataset / schema
No empirical dataset. This is a pure theory paper: definitions, derivations, and proofs (Propositions 1–5), plus illustrative simulated rating paths (Figures 1 and 6) whose numerical parameters are not reported. Not stated in paper.

## 3. Method / model
General score-driven rating system: each of n players holds rating r_t^(i); after a game with outcome y_t (any random-variable-valued outcome with density/mass function f(y_t | r_t)), ratings update as r_{t+1}^(i) = r_t^(i) + K ∇_i(r_t; y_t), where ∇_i is the score (gradient of the log-likelihood w.r.t. that player's rating) and K > 0 is the K-factor. This is the GAS/DCS framework of Creal et al. 2013 / Harvey 2013 applied to sports rating. The authors work through four instantiations: (a) the classical Elo system (win/loss, logistic link — shown in Prop. 1 to be exactly score-driven iff the link is logistic); (b) margin of victory via Skellam distribution on point differences (Poisson scoring rates λ_A = exp(α(r_A − r_B)), λ_B = exp(−α(r_A − r_B))); (c) win/draw/loss via ordered probit (and alternatively via the Skellam model with thresholds, plus discussion of a no-extra-parameter draw model); (d) complete rankings of m players via the Plackett–Luce distribution. Crucially, the paper argues against mean-reverting dynamics for ratings (unfair by construction — long-run level is pre-determined) and against including explanatory covariates like home advantage in the rating itself (undermines fairness); random-walk dynamics on the rating are the recommended choice.

## 4. Equations & assumptions
Core update (eq. 6–7):
- r_{t+1}^(i) = r_t^(i) + K ∇_i(r_t; y_t), for i = 1,…,n.
- ∇_i(r_t; y_t) = ∂ ln f(y_t | r_t) / ∂ r_t^(i) (the score).
- Classical Elo update (eq. 2): r_{t+1}^(A) = r_t^(A) + 16(y_t^(A) − 1/(1 + 10^{−(r_t^(A)−r_t^(B))/400})); r_1^(1) = … = r_1^(n) = 1200 (eq. 3).
- Λ-Elo general form (eq. 12–13) with pmf f(y_t | r_t^(A), r_t^(B)) = 1/(1 + exp(α(−1)^{y_t^(A)} (r_t^(A) − r_t^(B)))), α > 0 (eq. 9).
- Proposition 1: the Λ-Elo system coincides with the score-driven system (6) iff Λ(ξ) = 1/(1 + e^{−ξ}) is the logistic function. (Elo's original normal-CDF link is a score-driven system only approximately, not exactly.)
- Example 2 (margin of victory, Skellam): ∇_A(r_t^(A), r_t^(B); y_t) = α(y_t^(A) − y_t^(B) − 2 sinh(α(r_t^(A) − r_t^(B)))); ∇_B = −∇_A (eq. 23).
- Example 3 (win/draw/loss, ordered probit): score formulas derived for the three outcomes (eqs. around 24–28); an alternative draw-free-parameter model uses the Skellam with symmetric thresholds.
- Example 4 (full ranking, Plackett–Luce): ∇_i = α(1 − Σ_{p=1}^{y_t^(i)} exp(α r_t^(i)) / Σ_{q=p}^{m_t} exp(α r_t^(q-th))) for i in the match set M_t, and ∇_j = 0 for j ∉ M_t (eq. 30). Score lies in (α − α r, α) for ranked players.
- Proposition 2 (zero expected score): E[∇_i(r_t; y_t) | r_t] = 0 for all i, under: f differentiable, support independent of r_t, differentiation/integration interchangeable.
- Proposition 3 (zero sum): Σ_{i=1}^n ∇_i(r_t; y_t) = 0 for every outcome, under: f expressible as a function of rating differences only. ⇒ no rating inflation/deflation; mean rating stays at the initial value.
- Proposition 4 (decreasing in own rating): ∂² ln f / ∂(r_t^(i))² < 0 under strict log-concavity ⇒ score decreases as the player's own rating rises (winner's gain shrinks with their rating; the Elo "expected upset" behavior formalized).
- Proposition 5 (reversion dynamics): if the true latent skills s_t differ from ratings, E[∇_i(r_t; y_t) | s_t] > 0 when s_t^(i) > r_t^(i) and < 0 when s_t^(i) < r_t^(i) ⇒ ratings are mean-reverting toward true skill even when skill ≠ rating. Proved from Props. 2 and 4.
- Stated assumptions: (i) outcome y_t given by a random variable with a density/pmf parameterized by ratings; (ii) f differentiable with support independent of ratings; (iii) f a function of rating differences only (for zero-sum); (iv) strict log-concavity (for monotonicity/reversion); (v) pair (A, B) playing at time t treated as given (no selection model — selection bias from scheduling is outside scope).

## 5. Features / target
Not applicable — this is a rating framework, not a feature-based predictive model. Input: sequence of game outcomes y_t in whatever form the chosen outcome distribution supports (binary win/loss, integer points, ordinal W/D/L, full ranking). Target: the ratings r_t^(i) themselves, intended to track latent true skill s_t^(i). The K-factor K and the scaling parameter α are the only hyperparameters.

## 6. Validation design
Not stated in paper — no empirical validation, no train/test splits, no backtests, no baselines. The "validation" is purely theoretical (proofs of Props. 1–5). Figures 1 and 6 show simulated rating trajectories (parameters not reported) to illustrate behavior.

## 7. Numerical results / baselines
No numerical results. The paper states no performance numbers, no fitted parameters, no comparisons on real data. (Simulation figures are illustrative only, with no reported values.)

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Be adversarial: (a) No empirical validation of any kind — the fairness properties are proven under assumptions, but there is no evidence the Skellam/ordered-probit instantiations predict or rate well on real sports data. (b) The zero-sum property requires the outcome distribution to be a function of rating differences only — adding a home-advantage term (common in NFL) breaks fairness unless handled carefully; the authors acknowledge explanatory variables undermine rating fairness. (c) Treating the pairing (A,B) as given ignores selection/scheduling — in the NFL the schedule is fixed and unbalanced, so raw score-driven ratings conflate schedule with strength (opponent adjustment must be designed in). (d) Proposition 5's reversion requires the distribution evaluated at true skills to satisfy the same regularity conditions and the strict assumption that outcomes are "determined by" the rating vector — a strong assumption the authors themselves flag. (e) K-factor selection is unaddressed (Elo's 16 is "by convention") — in practice K is the critical tuning knob, and over-aggressive K induces oscillation (Prop. 4 bounds monotonicity, not stability in K). (f) External validity to NFL: the Skellam point-difference model assumes independent Poisson scoring — NFL scoring has overdispersion, garbage time, and correlated possessions; the Dixon-Coles paper lineage already in the repo documents this. No data-snooping risk since nothing is estimated, but also nothing is demonstrated.

## 10. GSE overlap
Extension, not duplicate. The existing-research-map master list already covers Elo, Glicko (mentioned), TrueSkill (mentioned), Bradley-Terry, Plackett-Luce, Dixon-Coles, Skellam, and Poisson as named methods, and Massey/Sagarin/Colley as rating systems — but no repo work implements a unified score-driven (GAS/DCS) rating updater, and none of the 64 already-read arXiv IDs covers this paper (2604.09143 is not in the dedup list). GSE's computed gse-lab metrics (2026-09-17) are efficiency stats, not latent-skill ratings; a principled score-driven team-rating layer (e.g., margin-aware Skellam Elo for power rankings / SOS / sim priors) is a new capability.

## 11. GSE implementation spec
1. Data: nflverse play-by-play 1999–2026 (game-level scores for ratings; weekly series). 2. Build `rating/score_driven.py`: generic updater implementing eq. (6)–(7) with pluggable outcome distributions — win/loss logistic (recovers Elo), Skellam margin (eq. 23), and ordered-probit ATS outcome (win/push/loss vs spread). 3. NFL-specific design: handle home field by running ratings on neutral-site skill plus a separate HFA offset (per authors' warning, keep HFA out of the skill rating to preserve zero-sum fairness), or model within the difference framework with HFA as a fixed shift absorbed before updates. 4. K and α estimation: grid-search K on 1999–2020, log-likelihood of game outcomes (Brier/log-loss) as objective; α for Skellam from mean total. 5. Serving: ratings updated after each game, stored as a team-strength prior feeding the pick engine's Monte Carlo sim and the spread/total models; recompute nightly. 6. Effort: ~1–2 engineer-days for the core + HFA design decision; validation harness reuse from existing gse-lab scripts.

## 12. Reproducible test
Dataset: nflverse games 2016–2025 (regular season). Metric: mean log-loss on next-game win probability implied by rating differences (logistic map from rating diff → win prob for the Skellam-Elo; same map for plain Elo). Baseline: standard Elo (eq. 2, K=16, 400-divisor). Time window: rolling refit — ratings trained on 2016–2020, evaluated out-of-sample on 2021–2025 seasons sequentially. Runnable: one Python script, no charting data needed.

## 13. Acceptance / rejection gate
ADOPT (score-driven Skellam-margin rating replaces plain Elo in the GSE stack) if mean out-of-sample log-loss on 2021–2025 is ≥ 0.005 lower than standard Elo AND the rating series passes a stability check (no single-team single-week rating swing > 3× the median weekly swing). REJECT otherwise — keep plain Elo and revisit only if a mean-reversion or dynamic-K extension is tested.

## 14. Improvement experiment
Dynamic K via the score itself: scale the K-factor by the Fisher-information normalization 1/I(r_t) (the GAS "scaled score" step from Creal et al. 2013), so updates are information-weighted — blowouts with high expected variance get smaller effective updates, and rating volatility adapts to each team's game count. Test whether the scaled-score Skellam-Elo beats the constant-K version on the §12 log-loss gate; if yes, this becomes the GSE rating core.
