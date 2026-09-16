# C1-per-sport-generative: Per-sport generative probability (scores / WP)

## Mission (code this)

Replace global classifier heads with sport-specific generative or logistic WP models. Offline bake-offs first; no gate flips.

## Code focus

- `packages/prediction-engine`
- `gse-ml-service`
- `apps/web offline diagnostics only`

## Done when

Offline CE/RPS/Brier table vs current engine on settled book-priced rows; sport-split noise scales documented.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `1701.05976` — How often does the best team win? A unified approach to understanding  — **[C1][C2][C3][C4][C5]**. This is the most important paper in the set for GSE’s *architecture*. 1. It justifies **independent per-sport models** with different \(\sigma_{\mathrm{ga
- `2408.08331` — Match predictions in soccer: Machine learning vs. Poisson approaches — **[C2][C1] — structurally important.** This is the paper that says “stop swapping learners; the MAE gap is not because you didn’t use XGBoost.” Combined with 1701.05976: fix sport- **NEXTWAVE-YES**
- `2105.09881` — Poisson Modeling and Predicting English Premier League Goal Scoring — **[C1][C2][C4]**. The “start here” MLS/soccer model. Beats a generic ML regressor on sparse count outcomes more often than people expect (see 2408.08331).
- `1704.00197` — iWinRNFL: A Simple, Interpretable & Well-Calibrated In-Game Win Probab — **[C1][C6][C2]**. This is the cleanest “math you can read” in-game WP template for NFL. Do *not* use it as the pre-game published-pick model — it is an in-play state model. Use it  **NEXTWAVE-YES**
- `1906.05029` — A Bayesian Approach to In-Game Win Probability in Soccer — **[C1][C2][C5][C7]** for **MLS**. This is the template for “independent per-sport probability model” in soccer: generative remaining-score model, not a global classifier. Also the 
- `2409.17129` — Bayesian Bivariate Conway-Maxwell-Poisson Regression for Correlated Co — **[C1][C2]** for **MLS and MLB run/goal models**. If GSE’s score head is Poisson and MAE loses, first test *dispersion*, not an NN. Bivariate COM-Poisson is the upgrade path from D
- `1607.00379` — Probabilistic Programming and PyMC3 — **[C1][C8] tooling**. This is the onboarding document for GSE’s per-sport generative models. If the stack is currently a point-estimate sklearn pipeline, adopting PyMC/Stan is the 

## Medium priority (implement from these first)

- `2501.05873` (score 12) Forecasting Soccer Matches through Distributions — Replace GSE's point predictions with shot/event-count distributions per sport, then derive calibrated win probabilities from the distribution rather than a single regression head.
- `1002.0797` (score 11) Soccer: is scoring goals a predictable Poissonian process? — Use this paper's quantified 'limits of predictability' for soccer as an explicit ceiling target for GSE's MLS Brier score, so the team knows how much of the 0.2563→0.22 gap is even theoretically closa
- `2301.04251` (score 11) On classical and Bayesian inference for bivariate Poisson conditionals — Use the bivariate Poisson-conditionals framework to jointly model correlated team scores in the sport-specific ensemble, potentially improving calibration on scoreline markets.
- `2109.00378` (score 11) A truncated mean-parameterised Conway-Maxwell-Poisson model for the an — Apply CMP-based dispersion modeling to GSE's under/over-dispersed sports counting stats (e.g., strikeouts, goals) to get better-calibrated tail probabilities than a plain Poisson baseline.
- `2012.14949` (score 7) Estimating the change in soccer's home advantage during the Covid-19 p — Audit GSE's soccer model for the same linear-vs-Poisson bias identified here; switching to bivariate Poisson regression for goal modeling could be a concrete, low-effort calibration improvement for th

## Full Medium assigned to this category (76)

FULL_TABLE_IN_SOURCE
