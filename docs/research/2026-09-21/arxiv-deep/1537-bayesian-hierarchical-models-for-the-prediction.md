# [1537] Bayesian Hierarchical Models for the Prediction of Volleyball Results (arXiv:1911.08791)

**Citation:** Andrea Gabrio (2019). *Bayesian Hierarchical Models for the Prediction of Volleyball Results*. arXiv:1911.08791. URL: https://arxiv.org/abs/1911.08791
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a joint three-module Bayesian hierarchical framework (Poisson scoring intensity + P(5 sets) + P(home win)) with efficiency covariates and scaled inverse-Wishart multilevel correlation is a clean template for NFL joint margin + win-probability + totals modeling with unit-level (offense/defense/special-teams) efficiency covariates.

## 1. Research question
Can a single Bayesian hierarchical framework jointly predict (a) points scored by both teams in a volleyball match, (b) whether the match goes to 5 sets, and (c) the match winner — while also producing season-end team rankings? Demonstrated on the Italian women's Serie A1 2017–18 (132 matches, 12 teams), with two model specifications of different complexity.

## 2. Dataset / schema
Italian women's volleyball federation website, Serie A1 2017–18 regular season: 132 matches, 12 teams. Per team-match: total points scored (y_h, y_a), sets won (s_h, s_a), 5-set indicator d^s, home-win indicator d^m, and in-game statistics in four categories — serve (total, aces, errors; serve efficiency ser^eff = (aces − errors)/total), defense (total digs, perfect, errors; def^eff), attack (total, perfect, errors; att^eff), block (total, perfect, errors/invasions; blo^eff). Scoring: 3 points for a 3–0/3–1 win, 2 points for a 3–2 win, 1 point for a 3–2 loss. Access: public federation website (no code repo stated; JAGS code in Appendix A).

## 3. Method / model
Three jointly modeled modules: (1) y_hi ~ Poisson(θ_hi), y_ai ~ Poisson(θ_ai) with log-linear regressions log θ_hi = μ + λ + att_{h(i)} + def_{a(i)}, log θ_ai = μ + att_{a(i)} + def_{h(i)}, where λ is a constant home effect and team attack/defense effects are linear functions of baseline coefficients plus attack/serve efficiency (offense) and defense/block efficiency (defense) covariates: att_{h(i)} = α_{0h(i)} + α_{1h(i)} att^eff_{hi} + α_{2h(i)} ser^eff_{hi}; def_{a(i)} = β_{0a(i)} + β_{1a(i)} def^eff_{ai} + β_{2a(i)} blo^eff_{ai}. (2) P(5 sets): d^s_i ~ Bernoulli(π^s_i), logit π^s_i = γ_0 + γ_1 y_hi + γ_2 y_ai. (3) P(home win): d^m_i ~ Bernoulli(π^m_i), logit π^m_i = η_0 + η_1 y_hi + η_2 y_ai + η_3 d^s_i. Team coefficients α, β modeled hierarchically as K×3 matrices Normal(M, Σ^{−1}); two specs: basic (independence, ρ = 0) and scaled inverse-Wishart (multilevel correlation between baseline and efficiency-slope coefficients). Fit in JAGS (2 chains × 20,000 iterations, 10,000 burn-in). Posterior predictive replication (1000 draws) for wins, points, rankings.

## 4. Equations & assumptions
- y_hi ~ Poisson(θ_hi), y_ai ~ Poisson(θ_ai) (1), conditionally independent given θ.
- log θ_hi = μ + λ + att_{h(i)} + def_{a(i)}; log θ_ai = μ + att_{a(i)} + def_{h(i)} (2) — Poisson log-normal formulation; attack of one team + defense of opponent.
- att_{h(i)} = α_{0h(i)} + α_{1h(i)} att^eff_{hi} + α_{2h(i)} ser^eff_{hi} (3); def_{a(i)} = β_{0a(i)} + β_{1a(i)} def^eff_{ai} + β_{2a(i)} blo^eff_{ai}; away-side analogues (4).
- d^s_i = I(s_hi + s_ai = 5) ~ Bernoulli(π^s_i) (6); logit π^s_i = γ_0 + γ_1 y_hi + γ_2 y_ai.
- d^m_i = I(s_hi > s_ai) ~ Bernoulli(π^m_i) (7); logit π^m_i = η_0 + η_1 y_hi + η_2 y_ai + η_3 d^s_i.
- Joint: p(y) · p(d^s|y) · p(d^m|y, d^s).
- Multilevel: α ~ Normal(M_α, Σ_α^{−1}), β ~ Normal(M_β, Σ_β^{−1}) (8); scaled IW prior on unscaled covariances + weakly informative priors on scaling factors; basic model sets all ρ = 0.
- Priors: weakly informative Normal(0, ·) on regression parameters, Gamma on precisions (robust to uniform-on-SD alternatives).
Assumptions: conditional independence of point counts; home effect constant across teams/season; efficiency covariates exogenous (they are in-game, post-treatment — see limitations); correlation only within α-block and β-block, not between them.

## 5. Features / target
Inputs: team identities, home/away, in-game efficiencies (attack, serve, defense, block). Targets: (1) points scored by each team (Poisson counts); (2) 5-set indicator (binary); (3) home-win indicator (binary); plus derived season-end rankings from replicated league points. Horizon: match-level; season-end ranking probabilities from posterior predictive simulation.

## 6. Validation design
Posterior predictive validation: 1000 replicated datasets compared to observed on team totals (points scored/conceded, wins, league points) and cumulative-points trajectories; ranking-probability heatmaps vs observed final rankings. Basic vs scaled-IW comparison. Benchmarks: only the two internal specs (no external baseline). No true out-of-sample/forecast evaluation — all 132 matches used in fitting.

## 7. Numerical results / baselines
Paper's reported numbers (quoted): posterior predictive replications closely match observed season totals — e.g., Conegliano observed 1960 scored / 1696 conceded / 17 wins / 50 points vs basic-model replicated 1960 / 1706 / 18 / 50; Novara 1987/1776/17/51 vs 1963/1776/17/51; Scandicci 1865/1556/18/50 vs 1858/1578/18/51. Scaled IW slightly closer than basic for Bergamo, Busto Arsizio, Conegliano, Monza, San Casciano, Scandicci. Rank probabilities vary 1–7% between specs, mostly negligible differences. No Brier/log-loss/accuracy numbers stated.

## 8. Code / data availability
JAGS model code in Appendix A; data from the public Italian federation website (no direct download link or repo stated).

## 9. Leakage & limitations
Adversarial notes: (1) Validation is posterior predictive checking, not out-of-sample forecasting — the efficiency covariates are in-game (post-treatment), so the model cannot generate pre-match predictions at all; it explains, not predicts. (2) No external baseline or scoring rule. (3) The extra complexity of the scaled IW bought almost nothing (1–7% rank-probability shifts). (4) Only match-level stats; set-level modeling flagged as future work. (5) Constant home effect; volleyball-specific scoring (sets→league points) has no NFL analogue but the factorization idea does.

## 10. GSE overlap
Existing map: Baio–Blangiardo-style Poisson log-normal team models inventoried in team_ratings; nothing that jointly models points + margin-bucket + win probability in one Bayesian factorization with unit-efficiency covariates. GSE's engine predicts spread/total/moneyline from separate heads; this paper's contribution is the joint factorization so uncertainty propagates coherently across correlated outputs (e.g., P(cover) and P(over) from one posterior).

## 11. GSE implementation spec
1. Adapt to NFL: Module 1 — home/away points ~ Poisson (or negative binomial) with log θ = μ + λ + off_eff_{h} + def_eff_{a}, where efficiencies are pre-game unit ratings (offensive/defensive EPA per play, success rate) instead of in-game stats. Module 2 — Bernoulli on margin bucket (e.g., |margin| ≤ 3) as function of predicted points. Module 3 — Bernoulli on win as function of predicted points + module-2 indicator. One posterior → coherent P(win), P(cover), P(over).
2. Hierarchical α/β with scaled IW on unit-efficiency slopes; fit in Stan/PyMC with weekly expanding windows.
3. Effort: ~1 week for the three-module core on nflverse 2015–2025.

## 12. Reproducible test
Dataset: nflverse 2020–2025, weekly expanding fits, predict 2025 games. Metric: Brier on moneyline, spread cover, and totals vs (a) independent single-module models and (b) GSE v5.2.7. Gate: joint model must beat the independent-modules Brier on at least 2 of 3 markets to justify the added complexity; also compare spread-cover Brier vs v5.2.7.

## 13. Acceptance / rejection gate
ADOPT the joint three-module factorization if, on 2025 held-out NFL games, the joint model's Brier on moneyline + spread + totals is better than independent-module equivalents on ≥2 markets AND no worse than v5.2.7 on the third; REJECT the scaled-IW multilevel-correlation extension specifically (the paper's own result: negligible gain for real complexity) and REJECT any use of in-game covariates for pre-game prediction (post-treatment leakage).

## 14. Improvement experiment
Beyond the paper: use pre-game efficiency covariates (EPA-based unit ratings) to make it a genuine forecaster; replace Poisson with a bivariate Poisson or negative binomial to capture score correlation/overdispersion; add a time-varying random walk on team attack/defense coefficients (state-space extension) so abilities evolve within season — then test whether the dynamic version beats the static hierarchical model on held-out log-loss.
