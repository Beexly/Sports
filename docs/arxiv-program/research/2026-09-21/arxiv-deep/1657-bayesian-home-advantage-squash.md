# 1657 A Bayesian analysis of home advantage in professional squash (arXiv:2506.09287)

**Citation:** Philip Greengard, Samer Takriti. *A Bayesian analysis of home advantage in professional squash*. arXiv:2506.09287 (2025). URL: https://arxiv.org/abs/2506.09287
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; abstract, methods, results, discussion, and Stan appendix read in full). Not an abstract-only read.
**Verdict:** ADAPT — the hierarchical ability + home-intercept model with rank-based shrinkage priors is a clean template for GSE's venue/crowd home-field estimation, but the continuous-outcome approximation and ranking-proxy ability model must be replaced by proper discrete-outcome likelihoods and direct ability parameters.

## 1. Research question

How large is the home-country advantage in professional squash, and does it vary by host country (Egypt, England, USA)? Estimated via a Bayesian hierarchical model on PSA World Tour matches 2018–2024, using margin of victory in games as the outcome.

## 2. Method/model

Bayesian hierarchical linear model fit by MCMC in Stan. Outcome y = margin of victory in games (values −3..−1, 1..3; no ties). y ~ Normal(a_rank[p1] − a_rank[p2] + h·b, σ_y), where abilities a_j depend only on world-ranking slot j (not the player), b ∈ {−1,0,1} encodes home advantage, h is the home effect. Hierarchical prior on abilities: a_j ~ Normal(β(j−1) + γ√(j−1), σ_a) — linear + square-root rank trend capturing diminishing ability gaps at worse ranks. Second model adds country-specific home intercepts (Egypt, England, USA) on top of a global h. Best-of-3 match outcomes multiplied by 1.5 to put them on the best-of-5 scale.

## 3. Mathematics/equations/assumptions

- Model (1): y ~ Normal(a_rank1 − a_rank2 + h·b, σ_y); h ~ Normal(0, 0.5); σ_y, σ_a ~ Normal⁺(0,2); β, γ ~ Normal(0,1); top-ranked ability fixed at 0 (identification — abilities defined up to additive constant).
- Model (2): y ~ Normal(a_rank1 − a_rank2 + h_global·b + h_country·b_country, σ_y); h_country ~ Normal(0, 0.2); β, γ ~ Normal(0,2).
- Assumptions: margin of victory is informative beyond win/loss; abilities depend only on ranking slot (strong — ignores suspensions, injuries, e.g. Mostafa Asal under-ranked); continuous symmetric error on a discrete asymmetric outcome (no zero possible); crowd support only matters via home-country indicator; COVID-era empty-crowd matches not removed.

## 4. Dataset/schema

- squashinfo.com data; PSA World Tour matches December 2018 – March 2024 (methods text says November 2018 – February 2024).
- Bronze/Silver/Gold/Platinum events + World Championships + World Tour Finals; retirements/walkovers excluded.
- Only matches between top-30-ranked players. Sample counts by venue (Table 1): e.g., Egypt 348 women / 329 men total matches (181/177 with home advantage); USA 419/426 (118/1 with HA); England 128/252 (36/43); other 113/333 (16/22).
- Separate models for men's and women's matches.

## 5. Features and target

- Features: world rankings of both players, home-advantage indicator b ∈ {−1,0,1}, host country.
- Target: margin of victory in games (−3..−1, 1..3).

## 6. Validation design

- No held-out validation; inference is posterior estimation on the full sample with posterior predictive checks (Figures 3–4: 68% predictive intervals vs actual margins at El Gouna and British Open).
- MCMC in Stan; standard errors reported from posteriors.

## 7. Exact results and baselines with numbers

- Global home advantage: +0.40 games (men), +0.30 games (women); SE ≈ 0.10 both.
- For evenly matched players: home win probability ≈ 58% men, 56% women — derived as Φ(μ/σ) with σ_w = 1.8, σ_m = 1.9: Φ(0.3/1.8) = 0.56, Φ(0.4/1.9) = 0.58.
- Country model: Egypt men 0.45 (SE ~0.10); Egypt women ~0.35; USA women ~0.35 (similar to Egypt); England smaller with large SEs; USA men excluded (n=1 home match).
- Context: mean ability gap between adjacent top-20 ranks ≈ 0.15 games — home advantage (0.3–0.4) is worth ~2–3 ranking slots.
- Model artifact: estimated #4 man stronger than #3 (attributed to Mostafa Asal's suspensions depressing his ranking).

## 8. Code/data availability

Stan model code in Appendix A of the paper. Data from squashinfo.com (provided to authors; public site). No GitHub repo.

## 9. Leakage and limitations

- Non-generative: continuous Normal likelihood on discrete outcomes excluding 0 — predictive probabilities need ad-hoc rounding.
- Ability = f(rank slot) is a crude proxy; under-ranked players (suspensions) bias both ability and home estimates; if a country's players are systematically underrated and mostly play at home, home effect is inflated.
- COVID empty-crowd matches retained — attenuates the crowd mechanism the paper claims to measure.
- Country effects imprecise outside Egypt; no investigation of causal mechanisms (refereeing, conditions, psychology).

## 10. GSE overlap

GSE's rating stack (Elo/Glicko/TrueSkill, Dixon–Coles) already models home advantage, but typically as a single global constant. This paper's hierarchical country/venue-specific home intercepts with shrinkage priors extend that to venue- and team-specific home effects — new territory for GSE. Frame as hierarchical home-field modeling on top of GSE's existing ratings.

## 11. Implementation specification

- Build `gse.ratings.HierarchicalHomeField`: Bayesian hierarchical model (Stan or numpyro) with team-ability parameters (direct, not rank proxies), a global home intercept, and team/venue-specific home deviations with Normal(0, τ) shrinkage; discrete-outcome likelihood (ordered logit on margin buckets or Poisson score model) replacing the paper's Normal approximation.
- Fit on NFL 2000–2024: estimate per-team home effects (altitude Denver, dome/cold-weather splits, international games) and test crowd-attendance interactions (COVID 2020 season as natural experiment).

## 12. Reproducible test

- nflverse 2000–2024: ordered-logit margin model with team abilities + global home + team-specific home deviations, Normal(0,τ) hyperprior; compare vs GSE's current constant-home-field model on 2022–2024 holdout.
- Metrics: log-loss on ternary outcomes (home win/away win vs spread cover), calibration of home-win probabilities.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** hierarchical home model beats constant-home baseline by ≥ 0.004 log-loss on 2022–2024 holdout AND ≥3 teams show |home deviation| > 2× posterior SD (i.e., real heterogeneity exists). Otherwise REJECT (keep constant home field).
- **Improvement experiment:** (i) add attendance/capacity-utilization interaction — expect the 2020 empty-stadium season to validate the crowd channel; (ii) dome/outdoor/altitude group-level priors — expect +0.002 log-loss; (iii) time-varying home effects (5-year rolling) — test whether home advantage is decaying league-wide.

**Verdict:** ADAPT — the hierarchical home-advantage machinery ports cleanly to GSE's venue-specific home-field modeling, but the Normal-on-discrete-margins likelihood must be replaced with a proper discrete-outcome model and abilities must be estimated directly, not proxied by rank.
