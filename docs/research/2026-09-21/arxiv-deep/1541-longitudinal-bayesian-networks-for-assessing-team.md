# [1541] Longitudinal Bayesian networks for assessing team performance in the National Basketball Association (arXiv:2608.09824)

**Citation:** Gabriel Calvo, Francisco Palmí-Perales, Carmen Armero, Virgilio Gómez-Rubio (2026). *Longitudinal Bayesian networks for assessing team performance in the National Basketball Association*. arXiv:2608.09824. URL: https://arxiv.org/abs/2608.09824
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, sections 1–6 + appendices skimmed for equations).
**Verdict:** ADAPT — a fully Bayesian dynamic network with AR(1) dependence between successive games, participation/playing-time submodels, and WAIC-based model comparison is a clean template for GSE's player-game-level longitudinal fantasy-production modeling (targets/carries with autoregressive carryover, inactive/injury participation modeling, home effects, posterior predictive distributions for next-game points).

## 1. Research question
How to jointly model multiple interrelated player-performance variables over a season in a Bayesian graphical framework? The paper proposes longitudinal Bayesian networks (LBNs) — static, dynamic (AR structure between successive games), and hidden-Markov dynamic — and compares them on Philadelphia 76ers 2005–06 data, predicting per-player points per game within a fully Bayesian predictive framework.

## 2. Dataset / schema
Philadelphia 76ers, 2005–06 NBA season: 82 games (38–44, no playoffs), 13 most-frequent players at player-game level, from NBAstuffer (accessed 2022-05-03). Variables per player-game: participation indicator Y^(A) (1/0), minutes played Y^(M), fouls drawn Y^(F), FT/2PT/3PT attempts Y^(T_k) and makes Y^(C_k), k=1,2,3; covariates: home indicator H_j, position indicators (PG/SG/SF/PF/C). Non-participation forces all other nodes to 0. Access: NBAstuffer (third-party scrape); reproduction code at https://github.com/gcalvobayarri/Longitudinal_BNs.

## 3. Method / model
LBN joint: p(y, z, φ, θ) = p(y, z | φ, θ) p(φ | θ) π(θ) (1), with random effects φ. Three variants: (a) static LBN — longitudinal nodes, no temporal dependence; (b) dynamic LBN — AR(1) dependence of minutes played on previous game's minutes (β_M^(+)); (c) hidden-Markov LBN — latent team state following a first-order Markov chain, affecting baskets scored. Submodels: logistic regressions for make-probabilities of 1PT/2PT/3PT (binomial-type given attempts, with player random effects σ_{C_k}); count models for attempts and fouls; participation Bernoulli. Priors: independent, minimally informative — wide N(0,·) on regression coefficients, Uniform(0,1) on binomial/zero-inflation probabilities, Beta on Markov transition probabilities. Inference: NIMBLE 1.3.0 (modular MCMC), 3 chains × 1,000,000 iterations, 500,000 burn-in, thin every 500. Model selection by WAIC (NIMBLE default implementation). Prediction via posterior predictive distribution (16), including "reverse" queries (minutes | points ≤ 10).

## 4. Equations & assumptions
- p(y, z, φ, θ) = p(y, z | φ, θ) p(φ | θ) π(θ) (1).
- Makes: binomial-type with P(make) from logistic regression on home + position + player random effect; e.g. player-effect SDs σ_{C_1} = 0.475, σ_{C_2} = 0.190, σ_{C_3} = 0.302.
- Minutes: AR(1) across games with coefficient β_M^(+) = 0.097 (95% CI 0.076–0.119), player random-effect SD σ_M = 0.688, common mean μ_0^(M) = 2.616.
- Posterior predictive: f(y_* | D) = ∫ f(y_* | θ, φ) π(θ, φ | D) d(θ, φ) (16).
Assumptions: graph structure fixed/known (structure learning declared out of scope); conditional independencies encoded by the DAG hold; minutes AR(1) is the only temporal dependence; minimally informative priors; MCMC converged (1M iterations, thinning 500).

## 5. Features / target
Inputs: home/away, player position, previous-game minutes, participation status. Targets: per-player per-game makes/attempts across shot types, fouls drawn, minutes, and derived total points; plus "reverse" targets (minutes given points). Horizon: next game.

## 6. Validation design
Bayesian model comparison: WAIC over the three LBNs (estimates out-of-sample predictive error from the full posterior). Estimation uncertainty via 95% credible intervals and posterior probabilities Pr(β > 0 | D). Prediction demonstrated as posterior predictive distributions for hypothetical new matches (Iverson vs Korver scenarios), not scored against held-out games. Benchmarks: the three LBN variants against each other (no external baseline like Elo or naive last-game-carryforward).

## 7. Numerical results / baselines
Paper's reported numbers (quoted): WAIC — static 21274.69, dynamic 21194.13, hidden Markov 21274.60 (dynamic preferred). Minutes AR coefficient 0.097 (0.076, 0.119), small but entirely positive. Home effect ≈ 0 for 1PT/3PT (β_H^(C1) = 0.045, P(>0|D) = 0.667), slightly positive for 2PT (0.067, P(>0|D) = 0.884). Participation posteriors: Iverson 0.870, Iguodala 0.988, Webber 0.905, Korver 0.988, Lou Williams 0.369. Predictive: Iverson (>30 min) scores considerably more than Korver; Iverson ≤ 10 points ⇒ high posterior probability he did not play (mixture predictive), a pattern absent for Korver.

## 8. Code / data availability
Code: https://github.com/gcalvobayarri/Longitudinal_BNs. Data: NBAstuffer scrape (no direct link given).

## 9. Leakage & limitations
Adversarial notes: (1) One team, one season (n = 13 players × 82 games) — generalizability untested. (2) WAIC difference between dynamic and hidden-Markov models is modest (~80 on 21k scale); the hidden-state variant adds little. (3) No held-out game prediction scoring — predictive claims rest on posterior predictive distributions, not out-of-sample error. (4) Structure assumed known; no structure learning. (5) MCMC cost is heavy (1M iterations × 3 chains) for a modest dataset; scaling to 32 NFL teams × 53 players needs variational or sequential approximations. (6) Fouls-drawn and attempts submodels show wide credible intervals for several coefficients (weak identification for low-volume players).

## 10. GSE overlap
Existing map: hierarchical/Bayesian player models exist in the corpus, but a dynamic Bayesian network with explicit AR(1) game-to-game dependence, a participation (inactive/injury) submodel, and bidirectional posterior predictive queries (production | snaps; snaps | production) is not inventoried. The participation-submodel idea is directly relevant to NFL inactives/injury uncertainty.

## 11. GSE implementation spec
1. Adapt to NFL player-game data (nflverse 2019–2025): nodes per player-game — active indicator, snap share, targets/carries (attempts), receptions/yards/TDs (makes), with AR(1) on usage across weeks and player random effects; covariates: home, position, opponent strength, spread/total.
2. Fit dynamic LBN in Stan/NIMBLE with the paper's prior scheme; compare static vs AR vs hidden-form variants by WAIC/LOO.
3. Use posterior predictive distributions for weekly fantasy projections with full uncertainty; exploit reverse queries (expected snaps | projected points) for injury-news conditioning ("if he's active, what's the snap distribution?").
4. Effort: ~2–3 weeks; watch MCMC cost — start with variational or a MAP+ Laplace approximation for the 32-team scale.

## 12. Reproducible test
Dataset: nflverse 2019–2024 training, 2025 held-out weeks. Metric: LOO/WAIC comparison of static vs AR(1) vs hidden-state variants; held-out log-likelihood of weekly PPR points; calibration of posterior predictive intervals. Gate: AR variant must beat static on held-out log-likelihood before adoption; predictive intervals must hit nominal coverage within 5 pp.

## 13. Acceptance / rejection gate
ADOPT the dynamic-LBN-with-AR-usage pattern and the participation submodel if the AR variant beats static on 2025 held-out log-likelihood AND predictive intervals calibrate; REJECT the hidden-Markov variant unless it beats the AR variant on LOO (in the paper it did not beat it); REJECT literal replication of the 1M-iteration MCMC — use modern scalable inference.

## 14. Improvement experiment
Beyond the paper: opponent-strength and betting-market covariates (spread/total) as nodes; multivariate nodes for correlated production (targets + yards jointly); structure learning over the DAG (which dependencies actually matter); sequential/online updating week-to-week instead of refitting; and genuine held-out scoring of next-week point predictions vs GSE's current projection system — the evaluation the paper never performs.
