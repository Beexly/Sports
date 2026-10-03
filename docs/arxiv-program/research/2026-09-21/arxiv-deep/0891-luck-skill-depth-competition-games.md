# [0891] Luck, skill, and depth of competition in games and social hierarchies (arXiv:2312.04711v1)

**Citation:** Maximilian Jerdee, M. E. J. Newman (2023). *Luck, skill, and depth of competition in games and social hierarchies*. arXiv:2312.04711v1 [physics.soc-ph]. URL: https://arxiv.org/abs/2312.04711v1 — University of Michigan.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2312.04711v1.pdf, read in full (1,074 lines through the final references).
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the luck+depth BT generalization (upset floor α, competition depth β; depth estimates: Scrabble 0.68, NBA 1.01, chess 1.17, tennis 1.44, soccer 1.73, video games 1.77) beats standard BT on held-out log-likelihood across all 15 datasets, and the two parameters are directly interpretable diagnostics for GSE: α as the market's irreducible upset rate, β as how deep the league's talent distribution runs (with the paper's own warning that α and β confound in shallow competitions).
**Replacement context:** Fresh-search replacement (corrected fielded arXiv API search, 2026-09-21: Bradley–Terry + betting) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Maximilian Jerdee, M. E. J. Newman (U. Michigan Physics / Center for the Study of Complex Systems). arXiv v1 dated 2023-12-08. Bayesian BT generalization with 15-dataset empirical study; code at github.com/maxjerdee/pairwise-ranking.

## Research question
Can the Bradley–Terry model be fixed in the two ways it most visibly fails — (a) its zero upset floor (real underdogs win more often than logistic BT allows) and (b) its one-parameter conflation of "how much luck" with "how deep the competition is"?

## Dataset / schema
- 15 datasets: sports/games — Scrabble (n=587, m=23,477), NBA basketball (n=240, m=10,002), chess (n=917, m=7,007), tennis (n=1,272, m=29,397), soccer (n=1,976, m=7,208), video games (n=125, m=1,951); plus human/animal social hierarchies.
- Schema: competitor pair, outcome, (dataset-specific timestamps).
- Sports ties removed (~10–30% of matches in affected datasets); team sports treat each team-season as a distinct competitor.
- Access: public (cross-tables.com, Kaggle NBA/chess/football, Jeff Sackmann tennis, etossed Melee).

## Method
- **Luck+depth BT**: f_{αβ}(s) = α/2 + (1−α)/(1+exp(−βs)), where s is the score difference.
  - α ∈ [0,1]: irreducible upset/luck probability (the "coin-flip floor").
  - β > 0: depth of competition (steepness of the skill curve; interpretable as the number of ~73%-win skill levels spanning a typical pair).
- Score prior: Gaussian, variance 1/2. α: uniform prior. β: positive half-Cauchy prior, scale w=4.
- Posterior sampling: Hamiltonian Monte Carlo in Stan.
- Model comparison: 20%-holdout cross-validation, ≥50 repetitions per model per dataset; competitors — full luck+depth, depth-only, minimum-violations/luck-only, BT MLE, logistic-prior BT, SpringRank.

## Equations / math / assumptions
- f_{αβ}(s) = α/2 + (1−α)/(1+exp(−βs)).
- Priors: s_i ~ N(0, 1/2); α ~ Uniform(0,1); β ~ HalfCauchy⁺(0, 4).
- HMC sampling in Stan; posterior-predictive probabilities for held-out contests.
- Assumptions: luck is symmetric and irreducible (α/2 each way); depth is a single global scalar per dataset; scores are static within the dataset window; removed ties are ignorable.

## Features / target
- Features: competitor identities (score difference s).
- Target: pairwise outcome probability.

## Validation
- 20%-holdout CV, ≥50 reps: full luck+depth model best or tied-best by held-out log-likelihood on **every** dataset (within reported uncertainty); also best/equal-best under posterior-predictive probability; accuracy differences smaller.
- Depth estimates (posterior means): Scrabble β=0.68, basketball β=1.01, chess β=1.17, tennis β=1.44, soccer β=1.73, video games β=1.77 — a quantitative ordering of "how deep" each competition is.

## Exact results with baselines
- Full model ≥ all competitors (BT MLE, logistic-prior BT, depth-only, luck-only/minimum-violations, SpringRank) on held-out log-likelihood across all 15 datasets.
- Depth ladder: 0.68 (Scrabble) < 1.01 (NBA) < 1.17 (chess) < 1.44 (tennis) < 1.73 (soccer) < 1.77 (video games).
- Baselines beaten include SpringRank with β_S tuned per scoring metric (paper's § on SpringRank comparison).

## Code / data availability
Code: https://github.com/maxjerdee/pairwise-ranking. Data: public sources listed per dataset.

## Leakage
- Random (non-chronological) holdouts — future contests can inform past strength estimates; the CV measures interpolation, not forecasting.
- Ties removed (10–30% in some datasets) changes the outcome distribution the model is fit to.
- Team-season-as-competitor breaks the static-score assumption across seasons.

## Limitations
- α and β are confounded in shallow competitions (paper's own identifiability warning) — the two parameters the model adds are hardest to separate exactly where they'd be most informative.
- Sparse datasets show prior sensitivity (half-Cauchy scale matters).
- No sportsbook odds, calibration analysis, CLV, or betting-return test anywhere in the paper.
- HMC in Stan is expensive at GSE scale; the paper's datasets are small-to-medium.

## GSE overlap vs existing-research-map
Existing-research-map.md has no luck/depth-decomposed BT; upset modeling appears only via turnover-luck metrics in gse-lab, not as a rating-model parameter. The corpus has no α/β-style parameterization. Novel vs the corpus; the natural companion to 0890 (multi-outcome BT) and 0884 (Elo theory).

## Implementation spec (GSE adaptation)
- **What to build:** a GSE luck+depth rating layer: (a) fit α, β per league (and per season) on GSE's game data — α becomes the league's irreducible upset rate, β its depth; (b) use α as a miscalibration diagnostic: compare model-implied underdog win rates vs market-implied; persistent gaps in α̂ between model and market flag mispriced underdogs; (c) use β to set the rating scale's steepness per league instead of a global constant; (d) port to a fast MAP/laplace approximation for production (Stan HMC is the prototype, not the serving path).
- **Effort:** 1–2 weeks for the per-league α/β fit + diagnostic dashboard.

## Reproducible test
- Clone github.com/maxjerdee/pairwise-ranking; reproduce the NBA/soccer depth estimates; then fit α/β on GSE's 2023–2024 NFL data and test whether luck+depth beats plain BT on 2025 walk-forward log-likelihood.

## Numeric gate
- ADAPT confirmed if luck+depth BT beats plain BT on 2025 NFL walk-forward log-likelihood by ≥0.003/game with the α̂ estimate stable across halves of the season (confounding check: |α̂_H1 − α̂_H2| < 0.05). If α/β confound (unstable α̂), fall back to the depth-only variant.

## Improvement experiment
- **Time-varying depth:** let β(t) drift within a season (early-season parity vs late-season stratification); test whether dynamic β beats static β on rolling log-likelihood. Success: wins on ≥60% of rolling 4-week windows — a "league stratification index" for content and modeling.

## Verdict
**ADAPT** — α and β are the two numbers GSE's rating system is currently missing: an explicit upset floor and a measured depth of competition. The paper beats BT everywhere it tests, ships code, and states its own identifiability warning honestly. The missing odds test is GSE's reproducible test to run.
