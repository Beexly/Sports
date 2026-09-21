# [0675] Bayesian estimation of in-game home team win probability for Division-I FBS college football (arXiv:2207.13747)

**Citation:** Jason T. Maddox, Ryan Sides, Jane L. Harvill (2022). *Bayesian estimation of in-game home team win probability for Division-I FBS college football*. arXiv:2207.13747. URL: https://arxiv.org/abs/2207.13747
**Ledger completed:** 2026-09-21. **Read:** full text (local cache /tmp/arxiv750-cache/fulltext/2207.13747.txt, all sections incl. results tables, application, conclusion, bibliography).
**Verdict:** ADAPT — expected-possessions-remaining plus expected-score as in-game win-probability predictors beats random forest on Brier; adapt for GSE live in-game win probability.

## 1. Research question
Can a Bayesian in-game home-team win-probability model for college football — using expected possessions remaining and expected score differential (modeled from the data) instead of raw time and score — outperform the standard random forest approach of Lock & Nettleton (2014)?

## 2. Dataset / schema
ESPN play-by-play scraped via R/rvest from ESPN's back-end (2004–2021 seasons, excluding 2020 COVID season; early-season games near 2004 partly missing). Point-value model fit on half of 2004–2015 data; win-probability model built on other half; evaluated on every play of every game 2017–2021 (excluding 2020). Access: public via ESPN.

## 3. Method / model
Three-stage pipeline. (1) Pace: recursive algorithm estimating team pace ξ (expected possessions vs average-tempo opponent, Pomeroy-style) — initialized at 0, iterated with δ=0.0001 convergence; 2021 extremes: Oklahoma State 30.11 (fastest), Kansas State 22.42 (slowest). Expected possessions remaining τ = ((3600−t)/3600)·((ξ1+ξ2)/2). (2) Expected score ω: expected lead after current + succeeding possession from XGBoost point-value model (MAE 2.6802 vs 3.0805 linear, 3.0614 linear+inter, 2.9751 RF) — models next drive too because a punt pins the opponent (dependency current drive → next drive). (3) Win probability: dynamic Bayesian estimator on (τ,ω) cells with beta prior imputed from 14 field experts' probability tables; adjusted version blends with pregame TeamRankings probability via weight function D2 (linear in time & score — best holdout Brier 0.1250 vs D1 linear-time 0.1272, D3 quadratic 0.1265).

## 4. Equations & assumptions
- Pace recursion: μm = (1/n)Σξ_{k,m−1}; ψ_{k,m} = Σ_{j∈κ_k}ξ_{j,m−1}; ε_{k,m} = (x_{k,m}−ψ_{k,m})/w_k; ξ_{k,m} = μm + ε_{k,m}; iterate to max|ξ_{k,m}−ξ_{k,m−1}| ≤ 0.0001.
- τ = ((3600−t)/3600)·((ξ1+ξ2)/2).
- Cell win count n_{τ,ω} ~ Binomial(N_{τ,ω}, p_{τ,ω}); beta(1,1) diffuse prior + expert-imputed prior parameters; binning windows around (τ,ω) for sparse cells.
- Final: p*_{t,ℓ,τ,ω,j} with weights D_j fit by minimizing holdout Brier.
- Assumptions: pace stationary within season; expected score sufficient statistic for game state; pregame prob dominates early, Bayesian estimate dominates late/large-lead.

## 5. Features / target
Features: elapsed seconds t, score differential, down/distance/field position (point-value model), team pace estimates, pregame TeamRankings win prob. Target: home-team win indicator Y_i per play.

## 6. Validation design
Point-value: random train/test split of 2004–2015 half (MAE). Blend weights: holdout Brier minimization. Win prob: out-of-sample Brier per play over all 2017–2021 games (excl. 2020) vs Lock & Nettleton (2014) RF. Application: 2021 Big 12 Championship (Baylor vs Oklahoma State) trace.

## 7. Numerical results / baselines
Holdout Brier (2017–2021, per play): Dynamic Bayes 0.1453, Adjusted dynamic Bayes 0.1250, Random forest 0.1705. Blend D2 (linear time & score) best. RF criticized: jumps too fast to 0/1 early. Point-value MAE: XGBoost 2.6802 wins by ≥0.2949 pts over RF. 2021 Big 12 title game: adjusted model starts OSU >50%, flips to Baylor at 21-6 halftime, OSU crosses back over 50% at late goal-line stands before Baylor holds.

## 8. Code / data availability
None published; ESPN back-end scraping described.

## 9. Leakage & limitations
College football only; pace recursion uses full-season possessions (not strictly in-season causal). Expert-imputed beta prior is subjective (14 field experts). Pregame prob from TeamRankings (market-adjacent, not pure model). No log-loss or calibration curves reported — Brier only. Point-value model treats current+succeeding possession but ignores later drives. Field-position model depends on ESPN data quality (authors note possession-label errors they hand-fixed).

## 10. GSE overlap
Existing-research-map has no in-game NFL win-probability treatment (Lock & Nettleton 2014 cited but no ledger found). New lane: live in-game win probability for NFL. The expected-possessions-remaining concept is the novel, portable piece.

## 11. GSE implementation spec
Build GSE live win-probability v1: (1) NFL team pace estimates from nflverse play-by-play (possessions per game, opponent-adjusted, Pomeroy-style recursion); (2) XGBoost expected-points model for current+next drive from down/distance/field position/time; (3) Bayesian estimator on (τ, ω) cells from 2015–2024 play-by-play with beta prior from GSE pregame model; blend pregame prob with linear-in-time-and-score weight fit on 2022–2023 holdout Brier. Effort: ~1 week.

## 12. Reproducible test
Dataset: nflverse play-by-play 2015–2024. Protocol: train pace + point-value + Bayesian tables on 2015–2021, tune blend on 2022, evaluate per-play Brier on 2023–2024 vs GSE pregame-only baseline and vs nflfastR wp. Baseline to beat: nflfastR wp Brier; pass if adjusted dynamic Bayes Brier lower with paired p<0.05.

## 13. Acceptance / rejection gate
Ship live WP v1 if 2023–2024 holdout Brier beats nflfastR wp on ≥60% of games and calibration slope ∈ [0.9, 1.1]; hold as research prototype otherwise.

## 14. Improvement experiment
Replace expert-imputed beta prior with an empirical-Bayes prior estimated from GSE pregame model probabilities binned by (τ,ω); add down/distance/timeout state to the cell definition; test whether per-play log loss improves and whether the model prices live spreads better than the closing line (CLV of implied live probability vs market live odds).
