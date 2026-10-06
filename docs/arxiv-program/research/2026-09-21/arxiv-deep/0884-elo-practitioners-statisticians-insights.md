# [0884] New insights into Elo algorithm for practitioners and statisticians (arXiv:2604.03840v1)

**Citation:** Leszek Szczecinski (2026). *New insights into Elo algorithm for practitioners and statisticians*. arXiv:2604.03840v1 [stat.ME]. URL: https://arxiv.org/abs/2604.03840v1
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2604.03840v1.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the paper's core separation (ranking scale vs prediction scale, approximate variance v ≈ sK/2, convergence constant τ = 4s/K, closed-form noise corrections) is immediately actionable for GSE's Elo ratings: fit the prediction scale empirically instead of inheriting the ranking scale, and use the convergence-constant diagnostic to know which teams' ratings are actually trustworthy.
**Replacement context:** Fresh-search replacement (query: `arXiv dynamic Bayesian rating model football soccer team strength state-space 2025`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Author: Leszek Szczecinski. arXiv v1 dated 2026-04-04. Theoretical + applied paper: closed-form analysis of the Elo algorithm's statistical properties with a FIFA application.

## Research question
What are the actual statistical properties of the Elo update as practitioners run it — its variance, its convergence speed, and the relationship between the scale used for ranking and the scale needed for prediction? The paper derives closed-form noise corrections and shows that the conventional single-scale Elo conflates two different jobs.

## Dataset / schema
- FIFA international matches: 5,719 matches from 2018-06-04 through 2024-07-14 (six years).
- Schema: date, home team, away team, score; standard FIFA rating context with home-field advantage variants tested.
- Access: public (FIFA-published results).

## Method
- Stochastic-approximation analysis of the Elo update: treat the rating as a noisy estimator of latent strength and derive its steady-state variance and convergence time in closed form.
- Key move: decouple the **ranking scale** (the points scale on which ratings are published and compared) from the **prediction scale** (the scale mapping rating differences to win probabilities) — fit the latter empirically.
- Noise corrections: closed-form adjustments for the variance injected by the update rule itself.
- Evaluated variants on FIFA data: conventional Elo, no-HFA Elo, HFA Elo, optimal-scaling Elo, and a fully adaptive online variant.

## Equations / math / assumptions
- Approximate steady-state variance of the Elo estimate: **v ≈ sK/2**, where s is the logistic scale and K the K-factor.
- Convergence constant: **τ = 4s/K** (in units of games) — the time constant with which the rating forgets its initialization.
- Prediction: win probability from rating difference uses a separately fitted scale (optimal scaling), not the ranking scale s.
- Assumptions: latent strengths evolve slowly relative to τ; match outcomes are conditionally independent Bernoulli/logistic given strengths; the logistic link is correctly specified up to scale.

## Features / target
- Features: rating difference (home − away), home-field indicator.
- Target: match outcome (win/draw/loss); evaluation metric is log score.

## Validation
- Walk-forward on the 5,719 FIFA matches: ratings updated sequentially, predictions scored by log score.
- Variants compared: conventional (log score 0.998), no-HFA (0.904), HFA (0.894), optimal scaling (0.893), online/fully adaptive (0.891). The ranking-vs-prediction scale separation is what drives the improvement from 0.998 to ~0.89.

## Exact results with baselines
- Log scores (lower better): conventional 0.998; no-HFA 0.904; HFA 0.894; optimal scaling 0.893; online/fully adaptive 0.891.
- Diagnostic finding: by 2024, 80% of teams had less than one convergence constant (τ) of experience — i.e., most published ratings had not converged, a quantitative statement of rating unreliability for low-volume teams.

## Code / data availability
None stated.

## Leakage
- The "optimal scaling" and adaptive variants are tuned on the same walk-forward stream they are evaluated on — the paper's comparison is honest about the sequential protocol but the hyperparameters are selected with knowledge of the full period.
- FIFA scheduling is non-random (confederation structure, friendlies vs qualifiers); strength of schedule is not modeled.

## Limitations
- Single dataset (FIFA men's internationals); the v ≈ sK/2 approximation assumes the logistic link and slow strength drift — breaks under regime changes (coaching changes, roster turnover).
- Draws handled inside the standard Elo machinery, not given the paper's main attention.
- The convergence diagnostic (τ) is derived for the stationary regime; early-season or expansion-team behavior is outside the theory.

## GSE overlap vs existing-research-map
Existing-research-map.md lists Elo in the inventoried metric catalog (nfelo/nfelounits) as "mentioned, not deeply researched" — no Elo-theory paper is in the corpus. GSE runs Elo-family ratings in production, but the map contains no treatment of the ranking-vs-prediction scale distinction or the convergence-constant diagnostic. This paper fills both gaps directly.

## Implementation spec (GSE adaptation)
- **What to build:** (a) split GSE's Elo into ranking scale (published) and prediction scale (fit by logistic regression of outcomes on rating differences, re-fit monthly); (b) compute τ = 4s/K per league/team and surface a "rating maturity" indicator on every published rating — teams with experience < τ get wider published uncertainty; (c) apply the closed-form noise correction v ≈ sK/2 to the rating covariance used in downstream simulations.
- **Where it plugs in:** the ratings service that feeds GSE's probability model; the maturity indicator feeds the pick-confidence tiering.
- **Effort:** 1 week for (a)+(b); (c) folds into the existing Monte Carlo pipeline.

## Reproducible test
- On GSE's 2023–2024 NFL game data: fit conventional Elo vs optimal-scaling Elo walk-forward; compare log scores; compute τ per team and check that low-maturity teams (< τ games) have worse-calibrated probabilities.

## Numeric gate
- ADAPT confirmed if optimal-scaling Elo beats conventional Elo on 2024 NFL walk-forward log score by ≥0.005 with the paper's direction replicated (no-HFA < HFA < optimal scaling ordering preserved). Calibration gate: low-maturity teams' 70% WP intervals must cover at a rate statistically below high-maturity teams' (demonstrating the diagnostic has bite).

## Improvement experiment
- **Adaptive K by maturity:** set K_i ∝ 1/maturity_i (high K for new teams/coaches, decaying to the steady-state K as experience → τ); test whether adaptive-K beats fixed-K on log score over a season with heavy roster turnover. Success: ≥0.003 log-score gain on the turnover-heavy subset.

## Verdict
**ADAPT** — A rare paper that makes Elo *engineering* better rather than just re-deriving it: the ranking/prediction scale split is a one-line change with a measured 0.1 log-score improvement on FIFA data, and the τ diagnostic gives GSE a principled "don't trust this rating yet" flag. Directly portable to NFL Elo.
