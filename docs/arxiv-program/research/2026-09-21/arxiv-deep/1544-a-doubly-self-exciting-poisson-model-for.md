# [1544] A doubly self-exciting Poisson model for describing scoring levels in NBA basketball (arXiv:2304.01538)

**Citation:** Álvaro Briz-Redón (2023). *A doubly self-exciting Poisson model for describing scoring levels in NBA basketball*. arXiv:2304.01538. URL: https://arxiv.org/abs/2304.01538
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a doubly self-exciting INGARCH(1,1) Poisson model with a hierarchical game→minute structure (game-level posterior mean as the minute-level offset), WAIC-tested against a non-self-exciting baseline, and Wasserstein-barycenter divide-and-conquer MCMC is a portable template for NFL scoring/production dynamics: weekly fantasy volume (game level) feeding within-game drive-level scoring rates, with self-excitation parameters that quantify "hot hand" in volume rather than efficiency.

## 1. Research question
Do basketball scoring levels (field goals made) exhibit self-exciting (contagious) dynamics at the game (within-season) and minute (within-game) scales? The paper builds a doubly self-exciting INGARCH(1,1) Poisson model, estimates it Bayesianly with a divide-and-conquer Wasserstein-barycenter scheme, tests it by WAIC against baselines, and clusters players by their self-excitation posteriors — on 8 NBA teams and 8 top scorers from 2018–19.

## 2. Dataset / schema
All made/missed field goals, 2018–19 NBA regular season (datavizardry.com compilation; constructible from the NBA API): player, team, quarter, minute → collapsed to minute-of-game 1–48; overtime discarded; only makes modeled. 8 teams (2018–19 conference semifinalists: BOS, DEN, GSW, HOU, MIL, PHI, POR, TOR; N_g = 82 each, 3,936 minutes) and 8 top scorers with 76–82 games (Beal, Lillard, Mitchell, Harden, KAT, Kemba Walker, Durant, Paul George). Access: dataset + R code promised at https://github.com/albrizre/NBA_DSE.

## 3. Method / model
INGARCH(1,1): Y_t ~ Po(λ_t), λ_t = d + κ λ_{t−1} + η Y_{t−1}; stationary if κ+η < 1, unconditional mean μ = d/(1−(κ+η)), variance ≥ mean (overdispersion when η ≠ 0). Game level: λ_g = exp(α_S + α_Home I_{Home}) + κ_S λ_{g−1} I_{g>1} + η_S Y_{g−1} I_{g>1} (2). Minute level: λ_{gm} = exp(α_G + Σ quarter-half effects α_{QH} + λ̂_g/48) + κ_G λ_{gm−1} I_{m>1} + η_G Y_{gm−1} I_{m>1} (4) — "doubly" self-exciting at both scales, with the game-level posterior mean λ̂_g/48 as an offset. Estimation: Bayesian — N(0,1000) priors on intercepts/fixed effects, U(0,1) on (η, κ) (enforcing stationarity); NIMBLE MCMC. Divide-and-conquer: game level fit first; minute level split into 4 season periods (games 1–21, 22–42, 43–62, 63–82, never splitting a game), subset posteriors merged by Wasserstein barycenter (Cuturi & Doucet 2014; Ou et al. 2021). Comparison: WAIC vs baseline without self-excitation. Secondary: hierarchical clustering of players on Wasserstein distances between η_S, κ_S posteriors.

## 4. Equations & assumptions
- Y_t ~ Po(λ_t); λ_t = d + κ λ_{t−1} + η Y_{t−1}.
- μ = d/(1−(κ+η)); Var(Y_t) = μ(1−(κ+η)²+η²)/(1−(κ+η)²) ≥ μ.
- Game: λ_g = exp(α_S + α_Home I) + κ_S λ_{g−1} I_{g>1} + η_S Y_{g−1} I_{g>1} (2).
- Minute: λ_{gm} = exp(α_G + Σ_{Q,H} α_{QH} I + λ̂_g/48) + κ_G λ_{gm−1} I_{m>1} + η_G Y_{gm−1} I_{m>1} (4).
- Barycentric posterior: p̄(θ|data) = WB(p(θ|G_1), …, p(θ|G_K)).
Assumptions: Poisson (no extra zeros); U(0,1) priors enforce κ+η < 1 stationarity; game-level posterior mean plugged in as a fixed offset (uncertainty not propagated); partitions independent across periods; overtime excluded.

## 5. Features / target
Inputs: home/away, quarter-half indicators, previous game's expected/observed makes, previous minute's expected/observed makes, game-level scoring level. Target: field goals made per game and per minute. Horizon: next game / next minute.

## 6. Validation design
WAIC comparison of doubly self-exciting (DSE) vs baseline (home effect only at game level; quarter-half effects only at minute level) for each of 16 teams/players, minute level split into 4 season periods. No out-of-sample forecasting (author notes the model was "only applied for explanatory purposes"; forecasting flagged as future work). Benchmarks: baseline variants per unit. Clustering validation is descriptive (dendrograms + Wasserstein distance heatmaps).

## 7. Numerical results / baselines
Paper's reported numbers (quoted), Table 2. Game level: DSE improves WAIC only for 3 players — Harden 391.25→388.63, KAT 394.67→382.11, Paul George 377.04→376.63; no team improves (e.g., Celtics 499.56→504.30). Minute level: DSE improves WAIC for many teams/players/periods (e.g., KAT: 893.64→885.82, 1019.17→1018.14, 1031.85→1031.55 in the first three periods). Clustering: KAT's κ_S posterior far from all other players; Harden and Paul George most similar on η_S (the two highest η_S values). Takeaway: self-excitation in scoring volume is a within-game phenomenon for most units, not a game-to-game one — except for a few high-usage players.

## 8. Code / data availability
Promised at https://github.com/albrizre/NBA_DSE (dataset + R/NIMBLE code).

## 9. Leakage & limitations
Adversarial notes: (1) Explanatory only — no out-of-sample forecast evaluation, by the author's own admission. (2) WAIC gains at the minute level are small in absolute terms (typically < 3 points on ~1000-scale WAIC). (3) Game-level posterior mean plugged into the minute model as a fixed offset — uncertainty not propagated; not a fully joint fit. (4) Minute-of-game aggregation is arbitrary (modifiable temporal unit problem, acknowledged). (5) Poisson ignores zero-inflation (scoreless minutes for players are common). (6) Overtime discarded; only makes modeled (attempts ignored, so efficiency vs volume confounded).

## 10. GSE overlap
Existing map: Poisson/INGARCH-style scoring models and hot-hand analyses exist in the corpus in other lanes, but the doubly self-exciting game→minute hierarchy with the posterior-mean offset and Wasserstein-barycenter divide-and-conquer, plus WAIC evidence that self-excitation lives within games rather than across them, is not inventoried. Directly relevant to GSE's in-game and weekly projection work.

## 11. GSE implementation spec
1. Adapt to NFL: game level — weekly player fantasy points (or team points) with INGARCH(1,1) + spread/total/home covariates; drive level — points per drive within a game with the weekly posterior mean as offset; self-excitation parameters (κ, η) per player/team quantify "hot" volume dynamics.
2. Use the paper's honest empirical result as a prior hypothesis: expect within-game self-excitation, don't expect week-to-week carryover beyond the AR structure already in GSE's models.
3. Fit in Stan/NIMBLE; for scale use the Wasserstein-barycenter partition scheme across season segments.
4. Cluster players by (η, κ) posteriors for matchup typing (which players run hot within games — relevant to live betting and DFS late-swap decisions).
5. Effort: ~2 weeks on nflverse 2019–2025 play-by-play + weekly data.

## 12. Reproducible test
Dataset: nflverse 2019–2024 fit, 2025 held-out. Metric: WAIC/LOO of DSE vs non-self-exciting baseline at both levels; held-out log-likelihood of weekly fantasy points and drive-level points. Gate: adopt the minute/drive-level self-exciting component only if it beats baseline on held-out log-likelihood; require the same asymmetry the paper found (within-game gains without game-level gains) to hold before claiming a "hot hand" mechanism.

## 13. Acceptance / rejection gate
ADOPT the doubly self-exciting hierarchy and the Wasserstein-barycenter divide-and-conquer if drive-level DSE beats baseline on 2025 held-out log-likelihood; REJECT game-level self-excitation unless WAIC/LOO supports it (the paper's own evidence says it usually doesn't); REJECT the plug-in offset as a final implementation — propagate uncertainty jointly or via multiple imputation in the production version.

## 14. Improvement experiment
Beyond the paper: joint (not two-stage) Bayesian fit propagating game-level uncertainty; zero-inflated Poisson for scoreless drives/minutes; attempt-volume vs efficiency decomposition (the paper models makes only); multivariate extension across teammates ("team chemistry" contagion, suggested by the author); and the forecasting evaluation the paper never runs — genuine out-of-sample prediction of next-drive and next-week scoring vs GSE's current models.
