# [0883] A generative approach to frame-level multi-competitor races (arXiv:2310.01748v2)

**Citation:** Tyrel Stokes, Gurashish Bagga, Kimberly Kroetch, Brendan Kumagai, Liam Welsh (2023). *A generative approach to frame-level multi-competitor races*. arXiv:2310.01748v2 [stat.ME]. URL: https://arxiv.org/abs/2310.01748v2 — Journal of Quantitative Analysis in Sports (JQAS).
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2310.01748v2.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the frame-level generative race model (hierarchical cubic B-splines + jockey/track effects + spatial covariates + CFD-derived drafting feature, full-path simulation) is the paper's portable idea for GSE: adapt the full-trajectory simulation architecture to live in-play NFL/NBA win-probability surfaces; the NYRA horse specifics are not the point, the simulation machinery is.
**Replacement context:** Fresh-search replacement (query: `arXiv horse racing rating model prediction win probability 2025`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Published in JQAS. Authors: Tyrel Stokes, Gurashish Bagga, Kimberly Kroetch, Brendan Kumagai, Liam Welsh. Version v2 dated 2023-10-12. Bayesian generative model of horse races at frame resolution (~4 frames/sec) from NYRA/NYTHA tracking data.

## Research question
Can a generative, frame-level model of multi-competitor races recover the latent dynamics of a race (positions, speeds, drafting, jockey decisions) and support counterfactual experiments (e.g., "what if this horse had drawn lane 2 instead of lane 6")? The paper builds a full probabilistic race simulator rather than a win-probability classifier.

## Dataset / schema
- 2019 NYRA (New York Racing Association) / NYTHA tracking data: frame-level positions at ~4 Hz for every horse in every race.
- Schema: per frame — horse id, race id, (x, y) position, speed, distance-to-leader, lane/post position, jockey, track surface/condition; per race — distance, field size, final order.
- CFD-derived drafting feature: computational-fluid-dynamics simulation of aerodynamic drafting benefit as a function of relative position.
- Access: proprietary tracking (NYRA); not public. CFD features computed by the authors.

## Method
- Hierarchical cubic B-spline model of each horse's trajectory over the race: spline coefficients vary by horse (random effects) with population-level priors.
- Jockey effects and track effects as hierarchical terms.
- Spatial covariates: position on track, distance to rail, drafting exposure from the CFD model.
- Forward simulation: sample from the posterior predictive to simulate entire races frame-by-frame; counterfactuals by intervening on post position / lane assignment.
- Inference: Bayesian (MCMC-class; paper uses posterior sampling of spline coefficients and effects).

## Equations / math / assumptions
- Position/velocity modeled as cubic B-spline expansions in normalized race time; coefficients θ_h for horse h with hierarchical prior θ_h ~ N(μ_θ, Σ_θ).
- Drafting benefit: D(position) from CFD — a deterministic nonlinear function of the horse's position relative to horses ahead (stated as a covariate, exact functional form in the paper's supplement).
- Win probability from simulation: P(win) = fraction of posterior-predictive simulated races in which the horse finishes first.
- Assumptions: spline smoothness captures real dynamics; CFD drafting transfers to real races; jockey decisions are exogenous to the model (no strategic response to counterfactual lane draws); ~4 Hz sampling is sufficient to resolve race dynamics.

## Features / target
- Features: frame-level (x, y), speed, lane, drafting exposure, jockey id, track condition, distance traveled, relative position.
- Target: full finishing order (simulated); derived quantities — expected rank, win probability, place probabilities.

## Validation
- Counterfactual lane experiment: 720 post-position assignments × 100 posterior-predictive simulations each — estimates the causal effect of lane draw on expected rank and win probability.
- Lane 2: expected rank 3.28, win probability 0.21. Lane 6: expected rank 3.88 (worst). The model reproduces the known inside-lane advantage and quantifies it.
- No walk-forward betting or odds comparison; validation is internal consistency + the counterfactual experiment.

## Exact results with baselines
- Lane-draw causal effects: lane 2 expected rank 3.28 / win prob 0.21 vs lane 6 expected rank 3.88 — the paper's headline quantitative result (720 assignments × 100 simulations).
- No odds baseline (Pinnacle/parimutuel) compared; the paper does not claim to beat the market.

## Code / data availability
Not stated as public in the paper; NYRA tracking data are proprietary. No GitHub link given. CFD code not released.

## Leakage
- The spline model is fit on full-race data including the finish; the "predictions" are retrodictive simulations, not pre-race forecasts. Any pre-race win probability derived from it would need the model refit on pre-race information only — the paper does not do this.
- CFD drafting features are computed with knowledge of the full race trajectory.
- Proprietary data means GSE cannot reproduce the exact experiment.

## Limitations
- No comparison to odds; no calibration test; no betting-return test.
- Counterfactual validity rests on the no-strategic-response assumption (jockeys would ride differently from different lanes).
- Proprietary data and unstated code availability block direct reproduction.
- Horse racing is a positional race; the transfer to ball sports requires re-deriving the state space.

## GSE overlap vs existing-research-map
Existing-research-map.md inventories tracking-data work (NextGenStats profile deep-dive, nflverse) but contains no generative full-trajectory simulator paper and no counterfactual-experiment design for sports. The map's gap list includes in-play modeling thinness. This paper is the corpus's first frame-level generative race simulator — novel vs the corpus, complementary to GSE's tracking assets.

## Implementation spec (GSE adaptation)
- **What to build:** a GSE "game simulator" in the paper's image: (a) model team/player trajectories as hierarchical smooth functions over game time from tracking data (NFL NextGenStats / NBA optical); (b) include interaction features analogous to drafting (e.g., pass-rush pressure surfaces, defensive spacing); (c) forward-simulate games from any game state to produce live win-probability surfaces; (d) run counterfactual experiments (e.g., "what if the blitz had come from the other side") for content and model diagnostics.
- **Concrete first build:** in-play NFL win-probability surface from nflverse play-by-play + NGS tracking: fit a generative drive-outcome model conditioned on field position, time, score, and personnel; simulate 10k rest-of-game paths per live game state; publish the WP surface with uncertainty bands.
- **Effort:** 2–3 weeks for the nflverse-level simulator; tracking-level (NGS) version is a quarter-scale project.

## Reproducible test
- Reproduce the paper's lane experiment logic on an open analog: use the open horse-racing dataset (e.g., Hong Kong Jockey Club public data) with post position as the treatment; test whether a simplified spline simulator recovers the inside-post advantage directionally.

## Numeric gate
- ADAPT confirmed if the nflverse-level rest-of-game simulator's win probabilities achieve Brier score ≤ the published nflfastR WP model's Brier on the 2024 season (paired by game), AND the simulator's 80% WP intervals cover realized outcomes at 78–82%. If it cannot match the discriminative baseline, the counterfactual machinery still stands for content/diagnostics use.

## Improvement experiment
- **Odds-aware simulator:** calibrate the simulator's outputs against Pinnacle closing lines (Platt scaling per game-state bucket); test whether miscalibration residuals predict line moves. Success: residual-based signals beat random on CLV over one season.

## Verdict
**ADAPT** — The paper's real contribution for GSE is the architecture (frame-level generative model → full-path posterior simulation → counterfactual experiments), not the horse-racing application. That architecture is directly reusable for live in-play win-probability surfaces and for the counterfactual content GSE publishes ("what if" analysis). Proprietary data and no odds baseline are the honest limits.
